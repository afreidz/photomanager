import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth.js";
import { validateApiKey } from "./lib/api-middleware.js";

const publicRoutes = ["/login", "/register", "/api/auth"];
const publicApiRoutes = ["/api/auth", "/api/public"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return next();
  }
  
  // Handle API routes with API key authentication
  if (pathname.startsWith("/api/")) {
    // Allow public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return next();
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
          },
        }
      );
    }
    
    // API key is valid, allow access
    return next();
  }
  
  // Check session authentication for web routes
  const sessionData = await auth.api.getSession({
    headers: context.request.headers,
  });
  
  if (!sessionData) {
    // Redirect to login if not authenticated
    return context.redirect("/login");
  }
  
  // Add user to locals for use in pages
  context.locals.user = sessionData.user;
  context.locals.session = sessionData.session;
  
  return next();
});
