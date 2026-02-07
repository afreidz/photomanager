import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '@/lib/db/index.js';
import { apiKey } from '@/lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { createHash, randomBytes } from 'crypto';

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'pk_';
  const randomPart = randomBytes(32).toString('hex');
  return `${prefix}${randomPart}`;
}

// Hash an API key for storage
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export const apiKeys = {
  // Get all API keys for a user
  getAll: defineAction({
    input: z.object({
      userId: z.string(),
    }),
    handler: async ({ userId }) => {
      const keys = await db.select({
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Include the key for display (only on creation)
        isActive: apiKey.isActive,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      })
      .from(apiKey)
      .orderBy(apiKey.createdAt);

      // Don't return the actual key in the list - only key name/id
      return keys.map(key => ({
        ...key,
        key: `${key.key.substring(0, 12)}...` // Show only first 12 chars for identification
      }));
    },
  }),

  // Create a new API key
  create: defineAction({
    input: z.object({
      name: z.string().min(1, 'Name is required'),
      userId: z.string(),
      expiresAt: z.string().optional(), // ISO date string for expiration
    }),
    handler: async ({ name, userId, expiresAt }) => {
      const key = generateApiKey();
      const keyHash = hashApiKey(key);

      const [newApiKey] = await db.insert(apiKey).values({
        id: createId(),
        name,
        key,
        keyHash,
        userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return {
        ...newApiKey,
        key, // Return the full key only on creation
      };
    },
  }),

  // Update an API key (mainly for toggling active status)
  update: defineAction({
    input: z.object({
      id: z.string(),
      userId: z.string(),
      isActive: z.boolean().optional(),
      name: z.string().optional(),
    }),
    handler: async ({ id, userId, isActive, name }) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      if (name !== undefined) {
        updateData.name = name;
      }

      const [updatedKey] = await db.update(apiKey)
        .set(updateData)
        .where(eq(apiKey.id, id))
        .returning();

      if (!updatedKey) {
        throw new Error('API key not found');
      }

      return {
        ...updatedKey,
        key: `${updatedKey.key.substring(0, 12)}...` // Don't return full key on update
      };
    },
  }),

  // Delete an API key
  delete: defineAction({
    input: z.object({
      id: z.string(),
      userId: z.string(),
    }),
    handler: async ({ id, userId }) => {
      const [deletedKey] = await db.delete(apiKey)
        .where(eq(apiKey.id, id))
        .returning();

      if (!deletedKey) {
        throw new Error('API key not found');
      }

      return { success: true };
    },
  }),

  // Validate an API key (for API route protection)
  validate: defineAction({
    input: z.object({
      key: z.string(),
    }),
    handler: async ({ key }) => {
      const keyHash = hashApiKey(key);
      
      const [foundKey] = await db.select()
        .from(apiKey)
        .where(and(
          eq(apiKey.keyHash, keyHash),
          eq(apiKey.isActive, true)
        ))
        .limit(1);

      if (!foundKey) {
        return { valid: false, userId: null };
      }

      // Check if key is expired
      if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
        return { valid: false, userId: null };
      }

      // Update last used timestamp
      await db.update(apiKey)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKey.id, foundKey.id));

      return { valid: true, userId: foundKey.userId };
    },
  }),
};
