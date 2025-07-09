import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../lib/db/index.js';
import { invitation, user } from '../lib/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export const createInvitation = defineAction({
  accept: 'json',
  input: z.object({
    email: z.string().email().optional(),
    expiresInDays: z.number().min(1).max(30).default(7),
  }),
  handler: async ({ email, expiresInDays }, { locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    // Check if user is the first registered user (admin)
    const users = await db.select().from(user).orderBy(user.createdAt).limit(1);
    if (!users.length || users[0].id !== locals.user.id) {
      throw new Error('Only the admin user can create invitations');
    }

    // Generate secure token
    const token = createId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const [newInvitation] = await db.insert(invitation).values({
      token,
      email: email || null,
      expiresAt,
      createdByUserId: locals.user.id,
    }).returning();

    return {
      success: true,
      invitation: newInvitation,
      inviteUrl: `/register?token=${token}`,
    };
  },
});

export const validateInvitation = defineAction({
  accept: 'json',
  input: z.object({
    token: z.string(),
  }),
  handler: async ({ token }) => {
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
      throw new Error('Invalid or expired invitation');
    }

    return {
      success: true,
      invitation: invitations[0],
    };
  },
});

export const useInvitation = defineAction({
  accept: 'json',
  input: z.object({
    token: z.string(),
    userId: z.string(),
  }),
  handler: async ({ token, userId }) => {
    // Find and validate invitation
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
      throw new Error('Invalid or expired invitation');
    }

    // Mark invitation as used
    await db
      .update(invitation)
      .set({
        isUsed: true,
        usedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(invitation.id, invitations[0].id));

    return {
      success: true,
      invitation: invitations[0],
    };
  },
});

export const listInvitations = defineAction({
  accept: 'json',
  input: z.object({}),
  handler: async (_, { locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    // Check if user is the first registered user (admin)
    const users = await db.select().from(user).orderBy(user.createdAt).limit(1);
    if (!users.length || users[0].id !== locals.user.id) {
      throw new Error('Only the admin user can view invitations');
    }

    // Get all invitations - admin can see all invitations
    const invitations = await db
      .select()
      .from(invitation)
      .orderBy(invitation.createdAt);

    return {
      success: true,
      invitations,
    };
  },
});

export const deleteInvitation = defineAction({
  accept: 'json',
  input: z.object({
    id: z.string(),
  }),
  handler: async ({ id }, { locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    // Check if user is the first registered user (admin)
    const users = await db.select().from(user).orderBy(user.createdAt).limit(1);
    if (!users.length || users[0].id !== locals.user.id) {
      throw new Error('Only the admin user can delete invitations');
    }

    // Delete invitation - admin can delete any invitation
    await db
      .delete(invitation)
      .where(eq(invitation.id, id));

    return {
      success: true,
    };
  },
});

export const checkRegistrationPermission = defineAction({
  accept: 'json',
  input: z.object({
    token: z.string().optional(),
  }),
  handler: async ({ token }) => {
    // Check if this is the first user
    const users = await db.select().from(user).limit(1);
    const isFirstUser = users.length === 0;

    if (isFirstUser) {
      return {
        success: true,
        allowed: true,
        reason: 'First user registration',
      };
    }

    // For subsequent users, require invitation
    if (!token) {
      return {
        success: true,
        allowed: false,
        reason: 'Registration requires a valid invitation token',
      };
    }

    // Validate invitation token
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
        success: true,
        allowed: false,
        reason: 'Invalid or expired invitation token',
      };
    }

    return {
      success: true,
      allowed: true,
      invitation: invitations[0],
    };
  },
});
