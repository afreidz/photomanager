import type { APIRoute } from 'astro';
import { db } from '@/lib/db/index.js';
import { photo, galleryPhoto, gallery } from '@/lib/db/schema.js';
import { eq, and, or, like, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;
    const query = searchParams.get('q') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build search conditions
    let conditions = [
      // Only include photos that are in public galleries
      eq(gallery.isPublic, true)
    ];

    if (query) {
      conditions.push(
        or(
          like(photo.title, `%${query}%`),
          like(photo.description, `%${query}%`)
        )!
      );
    }

    if (tags.length > 0) {
      // Search for any of the provided tags
      const tagConditions = tags.map(tag => like(photo.tags, `%"${tag}"%`));
      conditions.push(or(...tagConditions)!);
    }

    // Search photos in public galleries
    const photos = await db.select({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      tags: photo.tags,
      imageId: photo.imageId,
      originalFilename: photo.originalFilename,
      assetFootprint: photo.assetFootprint,
      createdAt: photo.createdAt,
      galleryName: gallery.name,
      gallerySlug: gallery.slug,
    })
      .from(photo)
      .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
      .innerJoin(gallery, eq(galleryPhoto.galleryId, gallery.id))
      .where(and(...conditions))
      .orderBy(desc(photo.createdAt))
      .limit(limit)
      .offset(offset);

    // Parse tags from JSON string and format response
    const formattedPhotos = photos.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      tags: p.tags ? JSON.parse(p.tags) : [],
      imageId: p.imageId,
      originalFilename: p.originalFilename,
      assetFootprint: p.assetFootprint,
      createdAt: p.createdAt,
      gallery: {
        name: p.galleryName,
        slug: p.gallerySlug,
      }
    }));

    return new Response(JSON.stringify({
      photos: formattedPhotos,
      pagination: {
        limit,
        offset,
        total: formattedPhotos.length, // This is approximate - for exact count we'd need a separate query
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Error searching photos:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to search photos' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
