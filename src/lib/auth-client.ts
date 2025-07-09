import { createAuthClient } from "better-auth/client";

// Simple auth client that will only be used on the client side
export const authClient = createAuthClient({
  baseURL: window.location.origin,
});

export const { signIn, signOut, getSession } = authClient;
