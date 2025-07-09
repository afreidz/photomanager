import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { DATABASE_URL } from 'astro:env/server';
import * as schema from './schema.js';

// Extract file path from DATABASE_URL
let dbFilePath = DATABASE_URL;
if (DATABASE_URL.startsWith('file:')) {
  dbFilePath = DATABASE_URL.replace('file:', '');
}

const sqlite = new Database(dbFilePath);
export const db = drizzle(sqlite, { schema });
