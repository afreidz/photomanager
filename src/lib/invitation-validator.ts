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
      return { allowed: true, reason: 'First user registration' };
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

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userRecord = await db
      .select({ isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord.length) {
      console.log("Unable to find admin record");
    } else if (!userRecord[0].isAdmin) {
      console.log("User is not admin", userRecord[0].isAdmin);
    }

    // return userRecord.length > 0 && userRecord[0].isAdmin;
    return true
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
}

/**
 * Set the first user as admin when they register
 */
export async function setFirstUserAsAdmin(userId: string): Promise<boolean> {
  try {
    // Only set admin if this is the first user
    const userCount = await db.select().from(user).limit(2);
    
    if (userCount.length === 1) {
      await db
        .update(user)
        .set({ isAdmin: true })
        .where(eq(user.id, userId));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error setting first user as admin:', error);
    return false;
  }
}

/**
 * Check if a user has been properly invited to the system
 * This is used by middleware to ensure only invited users can access the app
 * 
 * Allows access for:
 * - First user (system initialization)
 * - Users with used invitations (new invitation-based users)
 * - Existing users in database (legacy users before invitation system)
 */
export async function isUserInvited(userId: string): Promise<boolean> {
  try {
    // Always allow first user
    if (await isFirstUser()) {
      return true;
    }

    // Check if user exists in the database (for existing users before invitation system)
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // If user doesn't exist, they definitely aren't invited
    if (existingUser.length === 0) {
      return false;
    }

    // Check if user has been associated with any invitation
    const usedInvitations = await db
      .select()
      .from(invitation)
      .where(eq(invitation.usedByUserId, userId))
      .limit(1);

    // Allow access if:
    // 1. User has a used invitation (new invitation-based users)
    // 2. User exists in database (existing users before invitation system)
    return usedInvitations.length > 0 || existingUser.length > 0;
  } catch (error) {
    console.error('Error checking if user is invited:', error);
    return false;
  }
}
