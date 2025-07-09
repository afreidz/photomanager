import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:4321", // This should match your BETTER_AUTH_URL
});

export const { signIn, signOut, getSession } = authClient;
