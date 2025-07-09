import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';

// Calculate total size of a directory recursively
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = await stat(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += await calculateDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    console.warn(`Cannot read directory ${dirPath}:`, error);
    return 0;
  }
  
  return totalSize;
}

// Format bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const storage = {
  // Get storage usage for photos directory
  getUsage: defineAction({
    input: z.object({}),
    handler: async () => {
      const photosDir = join(process.cwd(), 'public', 'photos');
      
      // Calculate total size of photos directory
      const totalBytes = await calculateDirectorySize(photosDir);
      
      // Storage limit (5GB in bytes)
      const limitBytes = 5 * 1024 * 1024 * 1024; // 5GB
      
      // Calculate usage percentage
      const usagePercentage = Math.min((totalBytes / limitBytes) * 100, 100);
      
      return {
        usedBytes: totalBytes,
        limitBytes: limitBytes,
        usedFormatted: formatBytes(totalBytes),
        limitFormatted: formatBytes(limitBytes),
        usagePercentage: Math.round(usagePercentage * 100) / 100, // Round to 2 decimal places
        usageDisplay: `${formatBytes(totalBytes)} / ${formatBytes(limitBytes)}`,
      };
    },
  }),
};
