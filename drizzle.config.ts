import type { Config } from 'drizzle-kit';
import { DATABASE_URL, DATABASE_TOKEN } from 'astro:env/server';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: DATABASE_URL,
    token: DATABASE_TOKEN,
  },
} satisfies Config;
