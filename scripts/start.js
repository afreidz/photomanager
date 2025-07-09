#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
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

console.log('Starting PhotoManager application...');

try {
  // Run migration first
  console.log('Running database migration...');
  execSync('node scripts/migrate.js', { stdio: 'inherit' });
  
  // Start the application
  console.log('Starting server...');
  execSync('node dist/server/entry.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start application:', error.message);
  process.exit(1);
}
