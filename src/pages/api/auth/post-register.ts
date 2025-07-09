import type { APIRoute } from "astro";
import { markInvitationAsUsed } from "../../../lib/invitation-validator.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { token, userId } = await request.json();
    
    if (!token || !userId) {
      return new Response(JSON.stringify({ error: "Missing token or userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const success = await markInvitationAsUsed(token, userId);
    
    if (success) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Failed to mark invitation as used" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in post-register API:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
