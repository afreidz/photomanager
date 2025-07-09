# Google OAuth Setup Instructions

## 🎯 Your Photography CMS is now ready for Google OAuth!

### ✅ What's Complete:
- ✅ Astro v5.10.2 with SSR
- ✅ Drizzle ORM with SQLite database
- ✅ Better-auth client-side integration
- ✅ Proper hydration handling for client-side auth
- ✅ Authentication middleware
- ✅ Login, Register, Dashboard, and Logout pages
- ✅ Database schema compatible with better-auth

### 🔧 Complete the Setup:

#### 1. Set up Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** (or **Google Identity API**)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**

#### 2. Configure OAuth Credentials:
- **Application type**: Web application
- **Name**: Photography CMS
- **Authorized JavaScript origins**: 
  - `http://localhost:4321`
- **Authorized redirect URIs**: 
  - `http://localhost:4321/api/auth/callback/google`

#### 3. Update your `.env` file:
Replace the placeholder values in `.env` with your actual Google OAuth credentials:

```bash
# Replace these with your actual Google OAuth credentials
GOOGLE_CLIENT_ID="your-actual-google-client-id"
GOOGLE_CLIENT_SECRET="your-actual-google-client-secret"
```

#### 4. Test Authentication:
1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:4321/`
3. You'll be redirected to `/login`
4. Click "Sign in with Google"
5. Complete OAuth flow
6. You'll be redirected to `/dashboard`

### 🔒 Single User Registration:
The system is currently configured to allow multiple users for testing. Once you've confirmed the OAuth flow works, you can re-enable the single-user restriction by uncommenting the hooks section in `src/lib/auth.ts`.

### 🎉 You're Ready!
Once you add the Google OAuth credentials, your Photography CMS will have:
- Secure Google OAuth authentication
- Protected dashboard
- Single-user restriction (when enabled)
- Full TypeScript support
- Modern Astro + Drizzle architecture
