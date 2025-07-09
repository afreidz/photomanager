import sharp from 'sharp';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { createId } from '@paralleldrive/cuid2';
import { IMAGE_SIZES, type ImageSize } from './image-client.js';

export interface ProcessedImage {
  id: string;
  originalFilename: string;
  assetFootprint: number;
  sizes: Record<ImageSize, string>;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Process an uploaded image file and generate multiple sizes
 */
export async function processImageUpload(
  file: File,
  userId: string
): Promise<ProcessedImage> {
  // Generate unique ID for this image
  const imageId = createId();
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  
  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Get original image metadata
  const sharpImage = sharp(buffer);
  const metadata = await sharpImage.metadata();
  
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error('Invalid image file');
  }
  
  // Create directory for processed images
  const photosDir = join(process.cwd(), 'public', 'photos', imageId);
  
  await mkdir(photosDir, { recursive: true });
  
  // Process and save different sizes (no original file saved)
  const sizes: Record<ImageSize, string> = {} as Record<ImageSize, string>;
  
  for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
    const sizeKey = sizeName as ImageSize;
    const outputFilename = `${sizeName}.webp`;
    const outputPath = join(photosDir, outputFilename);
    
    await sharpImage
      .clone()
      .resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: config.quality })
      .toFile(outputPath);
    
    sizes[sizeKey] = `/photos/${imageId}/${outputFilename}`;
  }
  
  // Calculate total asset footprint
  const assetFootprint = await calculateAssetFootprint(imageId);
  
  return {
    id: imageId,
    originalFilename: file.name,
    assetFootprint,
    sizes,
  };
}

/**
 * Calculate total file size of all processed images for a given imageId
 */
export async function calculateAssetFootprint(imageId: string): Promise<number> {
  try {
    const { stat, readdir } = await import('fs/promises');
    const photosDir = join(process.cwd(), 'public', 'photos', imageId);
    
    let totalSize = 0;
    
    try {
      const files = await readdir(photosDir);
      
      for (const file of files) {
        const filePath = join(photosDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;
      }
    } catch (err) {
      // Directory doesn't exist or is empty
      return 0;
    }
    
    return totalSize;
  } catch (err) {
    console.error('Error calculating asset footprint:', err);
    return 0;
  }
}

/**
 * Generate a custom size for an existing image
 */
export async function generateCustomSize(
  imageId: string,
  sizeName: string,
  sizeConfig: { width: number; height: number; quality: number }
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const photosDir = join(process.cwd(), 'public', 'photos', imageId);
    const { readdir } = await import('fs/promises');
    
    // Find the largest existing image to use as source
    const files = await readdir(photosDir);
    
    // Look for the largest size (splash, xlarge, large, etc.)
    const sizeOrder = ['splash', 'xlarge', 'large', 'medium', 'small', 'thumbnail'];
    let sourceFile: string | null = null;
    
    for (const size of sizeOrder) {
      const filename = `${size}.webp`;
      if (files.includes(filename)) {
        sourceFile = join(photosDir, filename);
        break;
      }
    }
    
    if (!sourceFile) {
      return { success: false, error: 'No source image found' };
    }
    
    // Generate the custom size
    const outputFilename = `${sizeName}.webp`;
    const outputPath = join(photosDir, outputFilename);
    
    await sharp(sourceFile)
      .resize(sizeConfig.width, sizeConfig.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: sizeConfig.quality })
      .toFile(outputPath);
    
    return {
      success: true,
      filePath: `/photos/${imageId}/${outputFilename}`
    };
  } catch (error) {
    console.error(`Error generating custom size ${sizeName} for image ${imageId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process existing images to generate a new custom size
 */
export async function processExistingImagesForCustomSize(
  imageIds: string[],
  sizeName: string,
  sizeConfig: { width: number; height: number; quality: number }
): Promise<{ processed: number; failed: number; errors: string[] }> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const imageId of imageIds) {
    try {
      const result = await generateCustomSize(imageId, sizeName, sizeConfig);
      if (result.success) {
        processed++;
      } else {
        failed++;
        errors.push(`Failed to process ${imageId}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error processing ${imageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { processed, failed, errors };
}

/**
 * Delete a custom size image from a single image directory
 */
export async function deleteCustomSizeImage(
  imageId: string,
  sizeName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { unlink } = await import('fs/promises');
    const photosDir = join(process.cwd(), 'public', 'photos', imageId);
    const imageFile = join(photosDir, `${sizeName}.webp`);
    
    await unlink(imageFile);
    
    return { success: true };
  } catch (error) {
    // If file doesn't exist, consider it successful
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return { success: true };
    }
    
    console.error(`Error deleting custom size ${sizeName} for image ${imageId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete custom size images from multiple image directories
 */
export async function deleteCustomSizeImages(
  imageIds: string[],
  sizeName: string
): Promise<{ deleted: number; failed: number; errors: string[] }> {
  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const imageId of imageIds) {
    try {
      const result = await deleteCustomSizeImage(imageId, sizeName);
      if (result.success) {
        deleted++;
      } else {
        failed++;
        errors.push(`Failed to delete ${sizeName} from ${imageId}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error deleting ${sizeName} from ${imageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { deleted, failed, errors };
}

/**
 * Delete all files associated with an image
 */
export async function deleteImageFiles(imageId: string): Promise<void> {
  try {
    const { rm } = await import('fs/promises');
    
    // Delete processed images directory
    try {
      const photosDir = join(process.cwd(), 'public', 'photos', imageId);
      await rm(photosDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Could not delete photos directory:', imageId, err);
    }
  } catch (err) {
    console.error('Error deleting image files:', err);
  }
}

