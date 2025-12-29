import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  breakpoints: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_TOKEN,
  },
} satisfies Config;
