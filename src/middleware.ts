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
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    const userIsAdmin = await isUserAdmin(sessionData.user.id);
    if (!userIsAdmin) {
      // Non-admin user trying to access admin route - redirect to dashboard
      return context.redirect("/dashboard");
    }
  }
  
  // Add user to locals for use in pages
  context.locals.user = sessionData.user;
  context.locals.session = sessionData.session;
  
  return next();
});
