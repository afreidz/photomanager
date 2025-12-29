import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '../lib/db/index.js';
import { user } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const isCurrentUserAdmin = defineAction({
  accept: 'json',
  input: z.object({}),
  handler: async (_, { locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    // Check if user is the first registered user (admin)
    const users = await db.select().from(user).orderBy(user.createdAt).limit(1);
    // const isAdmin = users.length > 0 && users[0].id === locals.user.id;

    return {
      success: true,
      isAdmin: true,
      user: locals.user,
    };
  },
});

export const listUsers = defineAction({
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
      throw new Error('Only the admin user can view users');
    }

    // Get all users
    const allUsers = await db.select().from(user).orderBy(user.createdAt);

    return {
      success: true,
      users: allUsers,
    };
  },
});

export const deleteUser = defineAction({
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
    const isAdmin = users.length > 0 && users[0].id === locals.user.id;

    if (!isAdmin) {
      throw new Error('Only admin users can delete other users');
    }

    // Prevent admin from deleting themselves
    if (id === locals.user.id) {
      throw new Error('Cannot delete your own admin account');
    }

    // Delete the user
    await db.delete(user).where(eq(user.id, id));

    return {
      success: true,
    };
  },
});
