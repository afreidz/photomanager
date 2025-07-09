import type { APIContext } from 'astro';
import { db } from '@/lib/db/index.js';
import { apiKey } from '@/lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

// Hash an API key for lookup
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Validates an API key from the request headers
 */
export async function validateApiKey(context: APIContext): Promise<ApiKeyValidationResult> {
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader) {
    return { valid: false, userId: null, error: 'Missing Authorization header' };
  }

  // Support both "Bearer <key>" and "ApiKey <key>" formats
  const [scheme, key] = authHeader.split(' ');
  
  if (!key || (scheme !== 'Bearer' && scheme !== 'ApiKey')) {
    return { valid: false, userId: null, error: 'Invalid Authorization header format' };
  }

  try {
    const keyHash = hashApiKey(key);
    
    const [foundKey] = await db.select()
      .from(apiKey)
      .where(and(
        eq(apiKey.keyHash, keyHash),
        eq(apiKey.isActive, true)
      ))
      .limit(1);

    if (!foundKey) {
      return { valid: false, userId: null, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
      return { valid: false, userId: null, error: 'API key expired' };
    }

    // Update last used timestamp
    await db.update(apiKey)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKey.id, foundKey.id));

    return { valid: true, userId: foundKey.userId };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, userId: null, error: 'Internal server error' };
  }
}

/**
 * Middleware function to protect API routes with API key validation
 */
export function withApiKeyProtection(handler: (context: APIContext, userId: string) => Promise<Response> | Response) {
  return async (context: APIContext): Promise<Response> => {
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

    try {
      return await handler(context, validation.userId!);
    } catch (error) {
      console.error('API route error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}
