import type { APIRoute } from "astro";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/index.js";
import { gallery, galleryPhoto, photo } from "@/lib/db/schema.js";

export const GET: APIRoute = async ({ url, locals: _ }) => {
  const searchParams = new URL(url).searchParams;
  const featured = searchParams.get("featured") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Subquery to find the minimum sortOrder for each gallery
    const minSortOrderSubquery = sql`(
      SELECT MIN(${galleryPhoto.sortOrder}) 
      FROM ${galleryPhoto} 
      WHERE ${galleryPhoto.galleryId} = ${gallery.id}
    )`;

    let query = db
      .select({
        id: gallery.id,
        name: gallery.name,
        description: gallery.description,
        slug: gallery.slug,
        isPublic: gallery.isPublic,
        isFeatured: gallery.isFeatured,
        coverImageUrl: gallery.coverImageUrl,
        photoCount: gallery.photoCount,
        createdAt: gallery.createdAt,
        updatedAt: gallery.updatedAt,
        firstPhoto: {
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
        },
      })
      .from(gallery)
      .leftJoin(
        galleryPhoto,
        and(
          eq(galleryPhoto.galleryId, gallery.id),
          eq(galleryPhoto.sortOrder, minSortOrderSubquery),
        ),
      )
      .leftJoin(photo, eq(photo.id, galleryPhoto.photoId));

    // For API routes, show all public galleries
    const conditions = [eq(gallery.isPublic, true)];
    conditions.push(eq(gallery.isFeatured, featured));

    query = query.where(and(...conditions)) as any;

    const galleries = await query
      .orderBy(desc(gallery.updatedAt))
      .limit(limit)
      .offset(offset);

    return new Response(
      JSON.stringify({
        galleries,
        meta: {
          total: galleries.length,
          limit,
          offset,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching galleries:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch galleries" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
