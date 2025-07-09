import type { APIRoute } from "astro";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db/index.js";
import { gallery } from "@/lib/db/schema.js";

export const GET: APIRoute = async ({ url, locals }) => {
  // API key validation is handled by middleware
  const searchParams = new URL(url).searchParams;
  const featured = searchParams.get("featured") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    let query = db.select({
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
    }).from(gallery);

    // For API routes, show all public galleries
    const conditions = [eq(gallery.isPublic, true)];
    
    if (featured) {
      conditions.push(eq(gallery.isFeatured, true));
    }

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
      }
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
      }
    );
  }
};
