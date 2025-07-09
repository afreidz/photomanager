import type { APIRoute } from 'astro';
import { db } from '@/lib/db/index.js';
import { photo, galleryPhoto, gallery } from '@/lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ params, url: _ }) => {
  try {
    const galleryId = params.galleryId;
    if (!galleryId) {
      return new Response(JSON.stringify({ error: 'Gallery ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if gallery exists and is public
    const [galleryData] = await db.select()
      .from(gallery)
      .where(and(eq(gallery.id, galleryId), eq(gallery.isPublic, true)))
      .limit(1);

    if (!galleryData) {
      return new Response(JSON.stringify({ error: 'Gallery not found or not public' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get photos for this gallery
    const photos = await db.select({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      tags: photo.tags,
      imageId: photo.imageId,
      originalFilename: photo.originalFilename,
      assetFootprint: photo.assetFootprint,
      createdAt: photo.createdAt,
      sortOrder: galleryPhoto.sortOrder,
    })
      .from(photo)
      .innerJoin(galleryPhoto, eq(photo.id, galleryPhoto.photoId))
      .where(eq(galleryPhoto.galleryId, galleryId))
      .orderBy(galleryPhoto.sortOrder);

    // Parse tags from JSON string
    const formattedPhotos = photos.map(p => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : []
    }));

    return new Response(JSON.stringify({
      gallery: {
        id: galleryData.id,
        name: galleryData.name,
        description: galleryData.description,
        slug: galleryData.slug,
      },
      photos: formattedPhotos
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
    console.error('Error fetching gallery photos:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch gallery photos' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
