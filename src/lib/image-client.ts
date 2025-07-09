// Image size configurations (shared between client and server)
export const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200, quality: 80 },
  small: { width: 400, height: 400, quality: 85 },
  medium: { width: 800, height: 600, quality: 90 },
  large: { width: 1200, height: 900, quality: 92 },
  xlarge: { width: 1600, height: 1200, quality: 95 },
  splash: { width: 2000, height: 2000, quality: 95 },
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Get image URLs for a specific image ID (client-side only)
 */
export function getImageUrls(imageId: string): Record<ImageSize, string> {
  const urls: Record<ImageSize, string> = {} as Record<ImageSize, string>;
  
  // Generate size URLs
  for (const sizeName of Object.keys(IMAGE_SIZES)) {
    const sizeKey = sizeName as ImageSize;
    urls[sizeKey] = `/photos/${imageId}/${sizeName}.webp`;
  }
  
  return urls;
}

/**
 * Get responsive srcset for an image (client-side only)
 */
export function getResponsiveSrcSet(imageId: string): string {
  const urls = getImageUrls(imageId);
  return [
    `${urls.small} 400w`,
    `${urls.medium} 800w`,
    `${urls.large} 1200w`,
    `${urls.xlarge} 1600w`,
    `${urls.splash} 2000w`,
  ].join(', ');
}
