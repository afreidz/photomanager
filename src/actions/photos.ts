import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { processImageUpload, deleteImageFiles } from '@/lib/image-processing';
import { db } from "@/lib/db/index.js";
import { photo, galleryPhoto } from "@/lib/db/schema.js";
import { sql, eq, and, desc, or, like } from "drizzle-orm";
import type { NewPhoto } from "@/lib/db/schema";

export const photos = {
  // Upload and process photo
  upload: defineAction({
    accept: "form",
    input: z.object({
      file: z.instanceof(File),
      title: z.string().min(1, "Photo title is required").max(100),
      description: z.string().optional(),
      galleryId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to upload photos",
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(input.file.type)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        });
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (input.file.size > maxSize) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "File size too large. Maximum size is 10MB.",
        });
      }

      try {
        // Process the image and generate different sizes
        const processedImage = await processImageUpload(input.file, user.id);

        // Create photo record in the database
        const newPhoto: Omit<NewPhoto, "id"> = {
          title: input.title,
          description: input.description || null,
          tags: JSON.stringify(input.tags || []),
          imageId: processedImage.id,
          originalFilename: processedImage.originalFilename,
          assetFootprint: processedImage.assetFootprint,
          userId: user.id,
        };

        const [createdPhoto] = await db.insert(photo).values(newPhoto).returning();

        // Associate with gallery if galleryId is provided
        if (input.galleryId) {
          await db.insert(galleryPhoto).values({
            photoId: createdPhoto.id,
            galleryId: input.galleryId,
          });
        }

        return { photo: createdPhoto };
      } catch (error) {
        console.error('Error processing and uploading photo:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload photo",
        });
      }
    },
  }),

  // Update photo details
  update: defineAction({
    accept: "json",
    input: z.object({
      id: z.string(),
      title: z.string().min(1, "Photo title is required").max(100),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update photos",
        });
      }
      // Check if photo exists
      const existingPhoto = await db.select().from(photo)
        .where(eq(photo.id, input.id))
        .limit(1);
      if (existingPhoto.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Photo not found",
        });
      }

      try {
        const [updatedPhoto] = await db.update(photo)
          .set({
            title: input.title,
            description: input.description || null,
            tags: JSON.stringify(input.tags || []),
            updatedAt: new Date(),
          })
          .where(eq(photo.id, input.id))
          .returning();

        return { photo: updatedPhoto };
      } catch (error) {
        console.error('Error updating photo:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update photo",
        });
      }
    },
  }),

  // Delete photo
  delete: defineAction({
    accept: "json",
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete photos",
        });
      }
      // Check if photo exists
      const existingPhoto = await db.select().from(photo)
        .where(eq(photo.id, input.id))
        .limit(1);
      if (existingPhoto.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Photo not found",
        });
      }

      try {
        // Delete image files from filesystem
        await deleteImageFiles(existingPhoto[0].imageId);

        // Delete from database (this will also cascade delete galleryPhoto entries)
        await db.delete(photo).where(eq(photo.id, input.id));

        return { success: true };
      } catch (error) {
        console.error('Error deleting photo:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete photo",
        });
      }
    },
  }),

  // List photos with pagination and search
  list: defineAction({
    accept: "json",
    input: z.object({
      search: z.string().optional(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      galleryId: z.string().optional(),
    }),
    handler: async (input, context) => {
      try {
        let query = db.select().from(photo);
        let conditions: any[] = [];

        if (input.search) {
          conditions.push(
            or(
              like(photo.title, `%${input.search}%`),
              like(photo.description, `%${input.search}%`),
              like(photo.tags, `%${input.search}%`)
            )!
          );
        }

        if (input.galleryId) {
          // Join with galleryPhoto for gallery filtering
          query = db.select({
            id: photo.id,
            title: photo.title,
            description: photo.description,
            tags: photo.tags,
            imageId: photo.imageId,
            originalFilename: photo.originalFilename,
            assetFootprint: photo.assetFootprint,
            userId: photo.userId,
            createdAt: photo.createdAt,
            updatedAt: photo.updatedAt,
          })
            .from(photo)
            .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId)) as any;
          conditions.push(eq(galleryPhoto.galleryId, input.galleryId));
        }

        const photos = conditions.length > 0
          ? await query.where(and(...conditions)).orderBy(desc(photo.createdAt)).limit(input.limit).offset(input.offset)
          : await query.orderBy(desc(photo.createdAt)).limit(input.limit).offset(input.offset);

        return { photos };
      } catch (error) {
        console.error('Error listing photos:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch photos",
        });
      }
    },
  }),

  // Add photo to gallery
  addToGallery: defineAction({
    accept: "json",
    input: z.object({
      photoId: z.string(),
      galleryId: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage galleries",
        });
      }

      try {
        // Get the highest sort order for this gallery
        const maxSortOrder = await db.select({ max: sql<number>`MAX(${galleryPhoto.sortOrder})` })
          .from(galleryPhoto)
          .where(eq(galleryPhoto.galleryId, input.galleryId));
        
        const nextSortOrder = (maxSortOrder[0]?.max || 0) + 1;

        const [relation] = await db.insert(galleryPhoto).values({
          photoId: input.photoId,
          galleryId: input.galleryId,
          sortOrder: nextSortOrder,
        }).returning();

        return { relation };
      } catch (error) {
        console.error('Error adding photo to gallery:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add photo to gallery",
        });
      }
    },
  }),

  // Remove photo from gallery
  removeFromGallery: defineAction({
    accept: "json",
    input: z.object({
      photoId: z.string(),
      galleryId: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage galleries",
        });
      }

      try {
        await db.delete(galleryPhoto)
          .where(and(
            eq(galleryPhoto.photoId, input.photoId),
            eq(galleryPhoto.galleryId, input.galleryId)
          ));

        return { success: true };
      } catch (error) {
        console.error('Error removing photo from gallery:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove photo from gallery",
        });
      }
    },
  }),

  // Reorder photos in gallery
  reorderInGallery: defineAction({
    accept: "json",
    input: z.object({
      galleryId: z.string(),
      photoOrders: z.array(z.object({
        photoId: z.string(),
        sortOrder: z.number(),
      })),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage galleries",
        });
      }

      try {
        // Update sort orders for all photos in the gallery
        for (const { photoId, sortOrder } of input.photoOrders) {
          await db.update(galleryPhoto)
            .set({ sortOrder })
            .where(and(
              eq(galleryPhoto.photoId, photoId),
              eq(galleryPhoto.galleryId, input.galleryId)
            ));
        }

        return { success: true };
      } catch (error) {
        console.error('Error reordering photos:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reorder photos",
        });
      }
    },
  }),

  // Get photo by ID
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
          message: "You must be logged in to view photos",
        });
      }

      try {
        const [photoData] = await db.select()
          .from(photo)
          .where(eq(photo.id, input.id))
          .limit(1);

        if (!photoData) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Photo not found",
          });
        }

        return { photo: photoData };
      } catch (error) {
        console.error('Error fetching photo:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch photo",
        });
      }
    },
  }),

  // Get photos for a specific gallery
  getByGallery: defineAction({
    accept: "json",
    input: z.object({
      galleryId: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view photos",
        });
      }

      try {
      const photos = await db.select({
        id: photo.id,
        title: photo.title,
        description: photo.description,
        tags: photo.tags,
        imageId: photo.imageId,
        originalFilename: photo.originalFilename,
        assetFootprint: photo.assetFootprint,
        userId: photo.userId,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
        sortOrder: galleryPhoto.sortOrder,
      })
          .from(photo)
          .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
          .where(and(
            eq(galleryPhoto.galleryId, input.galleryId),
            eq(photo.userId, user.id)
          ))
          .orderBy(galleryPhoto.sortOrder);

        return { photos };
      } catch (error) {
        console.error('Error fetching gallery photos:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch gallery photos",
        });
      }
    },
  }),

  // Bulk delete photos
  bulkDelete: defineAction({
    accept: "json",
    input: z.object({
      photoIds: z.array(z.string()).min(1, "At least one photo must be selected"),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete photos",
        });
      }
      // Find all photos by ID
      const existingPhotos = await db.select()
        .from(photo)
        .where(sql`${photo.id} IN (${sql.join(input.photoIds.map(id => sql`${id}`), sql`, `)})`);
      if (existingPhotos.length !== input.photoIds.length) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Some photos not found",
        });
      }

      const deletedPhotos: string[] = [];
      const failedPhotos: { id: string; error: string }[] = [];

      // Delete from filesystem and database
      for (const photoData of existingPhotos) {
        try {
          // Delete image files from filesystem
          await deleteImageFiles(photoData.imageId);
          
          // Delete from database (this will also cascade delete galleryPhoto entries)
          await db.delete(photo).where(eq(photo.id, photoData.id));
          
          deletedPhotos.push(photoData.id);
        } catch (error) {
          console.error(`Error deleting photo ${photoData.id}:`, error);
          failedPhotos.push({
            id: photoData.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        deleted: deletedPhotos,
        failed: failedPhotos,
        total: input.photoIds.length
      };
    },
  }),

  // Bulk add photos to gallery
  bulkAddToGallery: defineAction({
    accept: "json",
    input: z.object({
      photoIds: z.array(z.string()).min(1, "At least one photo must be selected"),
      galleryId: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage galleries",
        });
      }
      // Find all photos by ID
      const existingPhotos = await db.select()
        .from(photo)
        .where(sql`${photo.id} IN (${sql.join(input.photoIds.map(id => sql`${id}`), sql`, `)})`);
      if (existingPhotos.length !== input.photoIds.length) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Some photos not found",
        });
      }

      // Get existing gallery photos to avoid duplicates
      const existingGalleryPhotos = await db.select()
        .from(galleryPhoto)
        .where(and(
          eq(galleryPhoto.galleryId, input.galleryId),
          sql`${galleryPhoto.photoId} IN (${sql.join(input.photoIds.map(id => sql`${id}`), sql`, `)})`
        ));

      const existingPhotoIds = new Set(existingGalleryPhotos.map(gp => gp.photoId));
      const photosToAdd = input.photoIds.filter(id => !existingPhotoIds.has(id));

      if (photosToAdd.length === 0) {
        return {
          added: 0,
          skipped: input.photoIds.length,
          message: "All selected photos are already in this gallery"
        };
      }

      // Get the highest sort order for this gallery
      const maxSortOrderResult = await db.select({ max: sql<number>`MAX(${galleryPhoto.sortOrder})` })
        .from(galleryPhoto)
        .where(eq(galleryPhoto.galleryId, input.galleryId));
      
      let nextSortOrder = (maxSortOrderResult[0]?.max || 0) + 1;

      // Add photos to gallery
      const galleryPhotoEntries = photosToAdd.map(photoId => ({
        photoId,
        galleryId: input.galleryId,
        sortOrder: nextSortOrder++,
      }));

      await db.insert(galleryPhoto).values(galleryPhotoEntries);

      return {
        added: photosToAdd.length,
        skipped: input.photoIds.length - photosToAdd.length,
        total: input.photoIds.length
      };
    },
  }),

  // Bulk remove photos from gallery
  bulkRemoveFromGallery: defineAction({
    accept: "json",
    input: z.object({
      photoIds: z.array(z.string()).min(1, "At least one photo must be selected"),
      galleryId: z.string(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage galleries",
        });
      }

      try {
        // Remove photos from gallery
        await db.delete(galleryPhoto)
          .where(and(
            eq(galleryPhoto.galleryId, input.galleryId),
            sql`${galleryPhoto.photoId} IN (${sql.join(input.photoIds.map(id => sql`${id}`), sql`, `)})`
          ));

        return {
          removed: input.photoIds.length,
          success: true
        };
      } catch (error) {
        console.error('Error removing photos from gallery:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove photos from gallery",
        });
      }
    },
  }),

  // Get total photo count
  getCount: defineAction({
    accept: "json",
    handler: async (_, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view photo count",
        });
      }

      try {
        const result = await db.select({ count: sql<number>`COUNT(*)` })
          .from(photo);

        return { count: result[0]?.count || 0 };
      } catch (error) {
        console.error('Error getting photo count:', error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get photo count",
        });
      }
    },
  }),
};

