import type { APIRoute } from "astro";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/index.js";
import { gallery } from "@/lib/db/schema.js";

export const GET: APIRoute = async ({ params, url, locals }) => {
  const { slug } = params;
  // API key validation is handled by middleware

  if (!slug) {
    return new Response(
      JSON.stringify({ error: "Gallery slug is required" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // For API routes, show public galleries
    const conditions = [eq(gallery.slug, slug), eq(gallery.isPublic, true)];

    const [galleryData] = await db.select({
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
    })
    .from(gallery)
    .where(and(...conditions))
    .limit(1);

    if (!galleryData) {
      return new Response(
        JSON.stringify({ error: "Gallery not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ gallery: galleryData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch gallery" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
