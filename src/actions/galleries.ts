import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/index.js";
import { gallery, photo, galleryPhoto } from "@/lib/db/schema.js";

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const galleries = {
  // Create a new gallery
  create: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(1, "Gallery name is required").max(100),
      description: z.string().optional(),
      isPublic: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create galleries"
        });
      }

      // Validate that featured galleries must be public
      if (input.isFeatured && !input.isPublic) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Featured galleries must be public"
        });
      }

      const slug = generateSlug(input.name);
      
      // Check if slug already exists
      const existingGallery = await db.select().from(gallery).where(eq(gallery.slug, slug)).limit(1);
      if (existingGallery.length > 0) {
        throw new ActionError({
          code: "CONFLICT",
          message: "A gallery with this name already exists"
        });
      }

      try {
        const [newGallery] = await db.insert(gallery).values({
          name: input.name,
          description: input.description || null,
          slug,
          isPublic: input.isPublic,
          isFeatured: input.isFeatured,
          userId: user.id,
          updatedAt: new Date(),
        }).returning();

        return { gallery: newGallery };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create gallery"
        });
      }
    },
  }),

  // Update an existing gallery
  update: defineAction({
    accept: "form",
    input: z.object({
      id: z.string(),
      name: z.string().min(1, "Gallery name is required").max(100),
      description: z.string().optional(),
      isPublic: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update galleries"
        });
      }

      // Validate that featured galleries must be public
      if (input.isFeatured && !input.isPublic) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Featured galleries must be public"
        });
      }

      // Check if gallery exists and belongs to user
      const existingGallery = await db.select().from(gallery)
        .where(and(eq(gallery.id, input.id), eq(gallery.userId, user.id)))
        .limit(1);

      if (existingGallery.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Gallery not found or you don't have permission to edit it"
        });
      }

      const slug = generateSlug(input.name);

      // Check if slug already exists (excluding current gallery)
      const existingSlug = await db.select().from(gallery)
        .where(and(eq(gallery.slug, slug), eq(gallery.id, input.id)))
        .limit(1);

      if (existingSlug.length === 0) {
        const duplicateSlug = await db.select().from(gallery)
          .where(eq(gallery.slug, slug))
          .limit(1);
        
        if (duplicateSlug.length > 0) {
          throw new ActionError({
            code: "CONFLICT",
            message: "A gallery with this name already exists"
          });
        }
      }

      try {
        const [updatedGallery] = await db.update(gallery)
          .set({
            name: input.name,
            description: input.description || null,
            slug,
            isPublic: input.isPublic,
            isFeatured: input.isFeatured,
            updatedAt: new Date(),
          })
          .where(eq(gallery.id, input.id))
          .returning();

        return { gallery: updatedGallery };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update gallery"
        });
      }
    },
  }),

  // Delete a gallery
  delete: defineAction({
    accept: "form",
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete galleries"
        });
      }

      // Check if gallery exists and belongs to user
      const existingGallery = await db.select().from(gallery)
        .where(and(eq(gallery.id, input.id), eq(gallery.userId, user.id)))
        .limit(1);

      if (existingGallery.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Gallery not found or you don't have permission to delete it"
        });
      }

      try {
        await db.delete(gallery).where(eq(gallery.id, input.id));
        return { success: true };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete gallery"
        });
      }
    },
  }),

  // Get featured galleries
  getFeatured: defineAction({
    accept: "json",
    input: z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view galleries"
        });
      }

      try {
        // First get featured galleries
        const galleries = await db.select()
          .from(gallery)
          .where(and(eq(gallery.userId, user.id), eq(gallery.isFeatured, true)))
          .orderBy(desc(gallery.updatedAt))
          .limit(input.limit)
          .offset(input.offset);

        // Then get cover images and accurate photo counts for each gallery
        const galleriesWithCovers = await Promise.all(
          galleries.map(async (gal) => {
            // Get cover photo (first photo in gallery)
            const [coverPhoto] = await db.select({
              imageId: photo.imageId,
            })
              .from(photo)
              .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
              .where(eq(galleryPhoto.galleryId, gal.id))
              .orderBy(galleryPhoto.sortOrder)
              .limit(1);
            
            // Get accurate photo count for this gallery
            const [photoCountResult] = await db.select({ count: sql`COUNT(*)` })
              .from(galleryPhoto)
              .where(eq(galleryPhoto.galleryId, gal.id));
            
            return {
              ...gal,
              photoCount: Number(photoCountResult.count),
              coverImage: coverPhoto || null
            };
          })
        );

        return { galleries: galleriesWithCovers };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch featured galleries"
        });
      }
    },
  }),

  // Get private galleries
  getPrivate: defineAction({
    accept: "json",
    input: z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view galleries"
        });
      }

      try {
        // First get private galleries
        const galleries = await db.select()
          .from(gallery)
          .where(and(eq(gallery.userId, user.id), eq(gallery.isPublic, false)))
          .orderBy(desc(gallery.updatedAt))
          .limit(input.limit)
          .offset(input.offset);

        // Then get cover images and accurate photo counts for each gallery
        const galleriesWithCovers = await Promise.all(
          galleries.map(async (gal) => {
            // Get cover photo (first photo in gallery)
            const [coverPhoto] = await db.select({
              imageId: photo.imageId,
            })
              .from(photo)
              .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
              .where(eq(galleryPhoto.galleryId, gal.id))
              .orderBy(galleryPhoto.sortOrder)
              .limit(1);
            
            // Get accurate photo count for this gallery
            const [photoCountResult] = await db.select({ count: sql`COUNT(*)` })
              .from(galleryPhoto)
              .where(eq(galleryPhoto.galleryId, gal.id));
            
            return {
              ...gal,
              photoCount: Number(photoCountResult.count),
              coverImage: coverPhoto || null
            };
          })
        );

        return { galleries: galleriesWithCovers };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch private galleries"
        });
      }
    },
  }),

  // Get all galleries for a user
  getAll: defineAction({
    accept: "json",
    input: z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view galleries"
        });
      }

      try {
        // First get galleries
        const galleries = await db.select()
          .from(gallery)
          .where(eq(gallery.userId, user.id))
          .orderBy(desc(gallery.updatedAt))
          .limit(input.limit)
          .offset(input.offset);

        // Then get cover images and accurate photo counts for each gallery
        const galleriesWithCovers = await Promise.all(
          galleries.map(async (gal) => {
            // Get cover photo (first photo in gallery)
            const [coverPhoto] = await db.select({
              imageId: photo.imageId,
            })
              .from(photo)
              .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
              .where(eq(galleryPhoto.galleryId, gal.id))
              .orderBy(galleryPhoto.sortOrder)
              .limit(1);
            
            // Get accurate photo count for this gallery
            const [photoCountResult] = await db.select({ count: sql`COUNT(*)` })
              .from(galleryPhoto)
              .where(eq(galleryPhoto.galleryId, gal.id));
            
            return {
              ...gal,
              photoCount: Number(photoCountResult.count),
              coverImage: coverPhoto || null
            };
          })
        );

        return { galleries: galleriesWithCovers };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch galleries"
        });
      }
    },
  }),

  // Get gallery counts for navigation
  getCounts: defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view gallery counts"
        });
      }

      try {
        // Ensure mutually exclusive and accurate counts
        // Total: All galleries for the user
        const [totalResult] = await db.select({ count: sql`COUNT(*)` })
          .from(gallery)
          .where(eq(gallery.userId, user.id));

        // Featured: Only public galleries that are marked as featured
        // (Featured galleries MUST be public based on our validation)
        const [featuredResult] = await db.select({ count: sql`COUNT(*)` })
          .from(gallery)
          .where(and(
            eq(gallery.userId, user.id), 
            eq(gallery.isFeatured, true),
            eq(gallery.isPublic, true)
          ));

        // Private: Only galleries that are NOT public
        // (Private galleries are never featured)
        const [privateResult] = await db.select({ count: sql`COUNT(*)` })
          .from(gallery)
          .where(and(
            eq(gallery.userId, user.id), 
            eq(gallery.isPublic, false)
          ));

        const counts = {
          total: Number(totalResult.count),
          featured: Number(featuredResult.count),
          private: Number(privateResult.count),
        };

        return counts;
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch gallery counts"
        });
      }
    },
  }),

  // Get gallery by ID
  getById: defineAction({
    accept: "json",
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view galleries"
        });
      }

      try {
        const [galleryData] = await db.select()
          .from(gallery)
          .where(and(eq(gallery.id, input.id), eq(gallery.userId, user.id)))
          .limit(1);

        if (!galleryData) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Gallery not found or you don't have permission to view it"
          });
        }

        return { gallery: galleryData };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch gallery"
        });
      }
    },
  }),
};
