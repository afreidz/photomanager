import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth.js";
import { validateApiKey } from "./lib/api-middleware.js";
import { isUserInvited, isUserAdmin } from "./lib/invitation-validator.js";

const publicRoutes = ["/login", "/register", "/logout", "/api/auth"];
const publicApiRoutes = ["/api/auth", "/api/public"];
const adminRoutes = ["/users", "/settings"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return next();
  }

  // CORS setup for API routes
  if (pathname.startsWith("/api/")) {
    const allowedOrigins = [
      "https://lvfphotography.com",
      "https://manage.lvfphotography.com",
      "https://lvf-photo.up.railway.app"
    ];
    const origin = context.request.headers.get("Origin");
    const isLocalhostOrigin = origin && (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin.startsWith("https://localhost") ||
      origin.startsWith("https://127.0.0.1")
    );
    const isAllowedOrigin = (origin && allowedOrigins.includes(origin)) || isLocalhostOrigin;

    // Handle preflight OPTIONS request
    if (context.request.method === "OPTIONS") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      };
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Allow public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      // Add CORS headers to response
      const response = await next();
      response.headers.set("Access-Control-Allow-Origin", isAllowedOrigin ? origin : "");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return response;
    }

    // Validate API key for protected API routes
    const validation = await validateApiKey(context);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: validation.error || 'Unauthorized',
          message: 'Valid API key required' 
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="API"',
            'Access-Control-Allow-Origin': isAllowedOrigin ? origin : "",
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    }

    // API key is valid, allow access
    const response = await next();
    response.headers.set("Access-Control-Allow-Origin", isAllowedOrigin ? origin : "");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }
  
  // Check session authentication for web routes
  const sessionData = await auth.api.getSession({
    headers: context.request.headers,
  });
  
  if (!sessionData) {
    // Redirect to login if not authenticated
    return context.redirect("/login");
  }
  
  // Check if user is properly invited to the system
  const userInvited = await isUserInvited(sessionData.user.id);
  if (!userInvited) {
    // User has a valid session but was not invited - sign them out and redirect
    // This handles cases where users sign up via OAuth without an invitation
    try {
      await auth.api.signOut({
        headers: context.request.headers,
      });
    } catch (error) {
      console.error('Error signing out user:', error);
      // Continue with redirect even if signOut fails
    }
    return context.redirect("/login?error=not_invited");
  }
  
  // Check if user is trying to access admin routes
  // if (adminRoutes.some(route => pathname.startsWith(route))) {
  //   const userIsAdmin = await isUserAdmin(sessionData.user.id);
  //   if (!userIsAdmin) {
  //     // Non-admin user trying to access admin route - redirect to dashboard
  //     return context.redirect("/dashboard");
  //   }
  // }
  
  // Add user to locals for use in pages
  context.locals.user = sessionData.user;
  context.locals.session = sessionData.session;
  
  return next();
});
