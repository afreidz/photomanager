#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

// Load environment variables from .env file if it exists
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"|"$/g, ''); // Remove quotes
      process.env[key] = value;
    }
  });
}

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Database URL:', DATABASE_URL);

// Extract file path from DATABASE_URL (handle both file:// and direct paths)
let dbFilePath;
if (DATABASE_URL.startsWith('file:')) {
  dbFilePath = DATABASE_URL.replace('file:', '');
} else {
  dbFilePath = DATABASE_URL;
}

console.log('Database file path:', dbFilePath);

// Ensure database directory exists
const dbDir = dirname(dbFilePath);
if (!existsSync(dbDir)) {
  console.log('Creating database directory:', dbDir);
  mkdirSync(dbDir, { recursive: true });
}

// Create database file if it doesn't exist
if (!existsSync(dbFilePath)) {
  console.log('Creating database file:', dbFilePath);
  execSync(`touch "${dbFilePath}"`);
}

try {
  // Run drizzle generate
  console.log('Running drizzle generate...');
  execSync('npx drizzle-kit generate', { stdio: 'inherit' });
  
  // Run drizzle migrate
  console.log('Running drizzle migrate...');
  execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
  
  console.log('Database migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
