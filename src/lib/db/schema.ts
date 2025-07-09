import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Better-auth compatible schema
export const user = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  token: text('token').notNull().unique(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invitation = sqliteTable('invitation', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  token: text('token').notNull().unique(),
  email: text('email'), // Optional: can be null for open invitations
  isUsed: integer('isUsed', { mode: 'boolean' }).notNull().default(false),
  usedByUserId: text('usedByUserId').references(() => user.id, { onDelete: 'set null' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdByUserId: text('createdByUserId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const gallery = sqliteTable('gallery', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
  isFeatured: integer('isFeatured', { mode: 'boolean' }).notNull().default(false),
  coverImageUrl: text('coverImageUrl'),
  photoCount: integer('photoCount').notNull().default(0),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Constraint: featured galleries must be public
  featuredMustBePublic: check('featured_must_be_public', sql`${table.isFeatured} = 0 OR ${table.isPublic} = 1`),
}));

export const photo = sqliteTable('photo', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  tags: text('tags'), // JSON string array of tags
  imageId: text('imageId').notNull().unique(), // Unique identifier for file system storage
  originalFilename: text('originalFilename').notNull(),
  assetFootprint: integer('assetFootprint').notNull(), // Total size of all processed images in bytes
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Junction table for many-to-many relationship between galleries and photos
export const galleryPhoto = sqliteTable('galleryPhoto', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  galleryId: text('galleryId').notNull().references(() => gallery.id, { onDelete: 'cascade' }),
  photoId: text('photoId').notNull().references(() => photo.id, { onDelete: 'cascade' }),
  sortOrder: integer('sortOrder').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Settings table for application-wide settings
export const setting = sqliteTable('setting', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  type: text('type').notNull(), // 'string', 'number', 'boolean', 'json'
  description: text('description'),
  category: text('category').notNull().default('general'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// API keys table for API access management
export const apiKey = sqliteTable('apiKey', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(), // User-friendly name for the API key
  key: text('key').notNull().unique(), // The actual API key
  keyHash: text('keyHash').notNull(), // Hashed version of the API key for security
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
  lastUsedAt: integer('lastUsedAt', { mode: 'timestamp' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }), // Optional expiration
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
export type Gallery = typeof gallery.$inferSelect;
export type NewGallery = typeof gallery.$inferInsert;
export type Photo = typeof photo.$inferSelect;
export type NewPhoto = typeof photo.$inferInsert;
export type GalleryPhoto = typeof galleryPhoto.$inferSelect;
export type NewGalleryPhoto = typeof galleryPhoto.$inferInsert;
export type Setting = typeof setting.$inferSelect;
export type NewSetting = typeof setting.$inferInsert;
export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
