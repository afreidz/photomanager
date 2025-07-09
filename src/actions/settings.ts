import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { db } from "@/lib/db/index.js";
import { setting, photo } from "@/lib/db/schema.js";
import { eq, and, count } from "drizzle-orm";
import { IMAGE_SIZES } from "@/lib/image-client.js";
import { processExistingImagesForCustomSize, deleteCustomSizeImages } from "@/lib/image-processing.js";

// Define the image size configuration schema
const imageSizeSchema = z.object({
  width: z.number().min(1).max(4000),
  height: z.number().min(1).max(4000),
  quality: z.number().min(1).max(100),
});

export const settings = {
  // Get all settings for the current user
  getAll: defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access settings",
        });
      }

      try {
        const userSettings = await db.select().from(setting)
          .where(eq(setting.userId, user.id));

        return { settings: userSettings };
      } catch (error) {
        console.error("Error fetching settings:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch settings",
        });
      }
    },
  }),

  // Get image sizes (current sizes + custom sizes)
  getImageSizes: defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access settings",
        });
      }

      try {
        // Get custom image sizes from settings
        const customSizes = await db.select().from(setting)
          .where(and(
            eq(setting.userId, user.id),
            eq(setting.category, "image_sizes")
          ));

        // Convert custom sizes to the expected format
        const customSizesFormatted = customSizes.reduce((acc, setting) => {
          try {
            const config = JSON.parse(setting.value);
            acc[setting.key] = {
              width: config.width,
              height: config.height,
              quality: config.quality,
              isCustom: true
            };
          } catch (e) {
            console.error(`Error parsing custom size ${setting.key}:`, e);
          }
          return acc;
        }, {} as Record<string, any>);

        // Merge with default sizes
        const allSizes = {
          ...Object.keys(IMAGE_SIZES).reduce((acc, key) => {
            acc[key] = {
              ...IMAGE_SIZES[key as keyof typeof IMAGE_SIZES],
              isCustom: false
            };
            return acc;
          }, {} as Record<string, any>),
          ...customSizesFormatted
        };

        return { sizes: allSizes };
      } catch (error) {
        console.error("Error fetching image sizes:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch image sizes",
        });
      }
    },
  }),

  // Add a new custom image size
  addImageSize: defineAction({
    accept: "json",
    input: z.object({
      name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, "Size name must contain only letters, numbers, hyphens, and underscores"),
      width: z.number().min(1).max(4000),
      height: z.number().min(1).max(4000),
      quality: z.number().min(1).max(100),
      processExisting: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage settings",
        });
      }

      try {
        // Check if size name already exists (both in default sizes and custom sizes)
        if (IMAGE_SIZES[input.name as keyof typeof IMAGE_SIZES]) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Size name already exists in default sizes",
          });
        }

        const existingCustomSize = await db.select().from(setting)
          .where(and(
            eq(setting.userId, user.id),
            eq(setting.category, "image_sizes"),
            eq(setting.key, input.name)
          ));

        if (existingCustomSize.length > 0) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Size name already exists in custom sizes",
          });
        }

        const sizeConfig = {
          width: input.width,
          height: input.height,
          quality: input.quality,
        };

        // Validate the size configuration
        imageSizeSchema.parse(sizeConfig);

        // Save the new image size setting
        await db.insert(setting).values({
          userId: user.id,
          key: input.name,
          value: JSON.stringify(sizeConfig),
          type: "json",
          category: "image_sizes",
          description: `Custom image size: ${input.width}x${input.height} @ ${input.quality}% quality`,
        });

        // Get user's photos for processing
        const userPhotos = await db.select({ imageId: photo.imageId }).from(photo)
          .where(eq(photo.userId, user.id));

        const result: {
          success: boolean;
          sizeName: string;
          config: { width: number; height: number; quality: number };
          photoCount: number;
          processingResult?: {
            processed: number;
            failed: number;
            errors: string[];
          };
          processingError?: string;
        } = {
          success: true,
          sizeName: input.name,
          config: sizeConfig,
          photoCount: userPhotos.length,
        };

        // If processExisting is true, process all existing photos
        if (input.processExisting && userPhotos.length > 0) {
          try {
            const imageIds = userPhotos.map(p => p.imageId);
            const processingResult = await processExistingImagesForCustomSize(
              imageIds,
              input.name,
              sizeConfig
            );
            
            result.processingResult = {
              processed: processingResult.processed,
              failed: processingResult.failed,
              errors: processingResult.errors
            };
          } catch (error) {
            console.error('Error processing existing images:', error);
            result.processingError = 'Failed to process some existing images';
          }
        }

        return result;
      } catch (error) {
        console.error("Error adding image size:", error);
        if (error instanceof ActionError) {
          throw error;
        }
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add image size",
        });
      }
    },
  }),

  // Get photo count for processing estimation
  getPhotoCount: defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this information",
        });
      }

      try {
        const photoCount = await db.select({ count: count() }).from(photo)
          .where(eq(photo.userId, user.id));

        return { count: photoCount[0]?.count || 0 };
      } catch (error) {
        console.error("Error fetching photo count:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch photo count",
        });
      }
    },
  }),

  // Delete a custom image size
  deleteImageSize: defineAction({
    accept: "json",
    input: z.object({
      sizeName: z.string().min(1),
      deleteExistingImages: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to manage settings",
        });
      }

      try {
        // Check if trying to delete a default size
        if (IMAGE_SIZES[input.sizeName as keyof typeof IMAGE_SIZES]) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Cannot delete default image sizes",
          });
        }

        // Check if the custom size exists
        const existingSize = await db.select().from(setting)
          .where(and(
            eq(setting.userId, user.id),
            eq(setting.category, "image_sizes"),
            eq(setting.key, input.sizeName)
          ));

        if (existingSize.length === 0) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Custom size not found",
          });
        }

        // Get user's photos for deletion estimation
        const userPhotos = await db.select({ imageId: photo.imageId }).from(photo)
          .where(eq(photo.userId, user.id));

        const result: {
          success: boolean;
          sizeName: string;
          photoCount: number;
          deletionResult?: {
            deleted: number;
            failed: number;
            errors: string[];
          };
        } = {
          success: true,
          sizeName: input.sizeName,
          photoCount: userPhotos.length,
        };

        // Delete the setting from database
        await db.delete(setting)
          .where(and(
            eq(setting.userId, user.id),
            eq(setting.category, "image_sizes"),
            eq(setting.key, input.sizeName)
          ));

        // If deleteExistingImages is true, delete the image files
        if (input.deleteExistingImages && userPhotos.length > 0) {
          const imageIds = userPhotos.map(p => p.imageId);
          const deletionResult = await deleteCustomSizeImages(imageIds, input.sizeName);
          
          result.deletionResult = {
            deleted: deletionResult.deleted,
            failed: deletionResult.failed,
            errors: deletionResult.errors
          };
        }

        return result;
      } catch (error) {
        console.error("Error deleting image size:", error);
        if (error instanceof ActionError) {
          throw error;
        }
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image size",
        });
      }
    },
  }),
};
