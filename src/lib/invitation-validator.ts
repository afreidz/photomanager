import { db } from './db/index.js';
import { invitation, user } from './db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export interface InvitationValidationResult {
  isValid: boolean;
  invitation?: typeof invitation.$inferSelect;
  error?: string;
}

export async function validateInvitationToken(token: string): Promise<InvitationValidationResult> {
  try {
    // Find invitation by token
    const invitations = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.token, token),
          eq(invitation.isUsed, false),
          gt(invitation.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitations.length) {
      return {
        isValid: false,
        error: 'Invalid or expired invitation token'
      };
    }

    return {
      isValid: true,
      invitation: invitations[0]
    };
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return {
      isValid: false,
      error: 'Failed to validate invitation'
    };
  }
}

export async function markInvitationAsUsed(token: string, userId: string): Promise<boolean> {
  try {
    // Find the invitation
    const result = await validateInvitationToken(token);
    if (!result.isValid || !result.invitation) {
      return false;
    }

    // Mark as used
    await db
      .update(invitation)
      .set({
        isUsed: true,
        usedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(invitation.id, result.invitation.id));

    return true;
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    return false;
  }
}

export async function isFirstUser(): Promise<boolean> {
  try {
    const users = await db.select().from(user).limit(1);
    return users.length === 0;
  } catch (error) {
    console.error('Error checking first user:', error);
    return false;
  }
}

export async function shouldAllowRegistration(invitationToken?: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Always allow first user
    if (await isFirstUser()) {
      return { allowed: true };
    }

    // For subsequent users, require invitation
    if (!invitationToken) {
      return { 
        allowed: false, 
        reason: 'Registration requires a valid invitation token' 
      };
    }

    const validation = await validateInvitationToken(invitationToken);
    if (!validation.isValid) {
      return { 
        allowed: false, 
        reason: validation.error || 'Invalid invitation token' 
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking registration permission:', error);
    return { 
      allowed: false, 
      reason: 'Error validating registration permission' 
    };
  }
}
