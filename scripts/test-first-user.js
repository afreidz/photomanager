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

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

let dbFilePath;
if (DATABASE_URL.startsWith('file:')) {
  dbFilePath = DATABASE_URL.replace('file:', '');
} else {
  dbFilePath = DATABASE_URL;
}

console.log('=== First User Test ===');
console.log('Database file path:', dbFilePath);

// Create backup of current database
const backupPath = dbFilePath + '.backup';
if (existsSync(dbFilePath)) {
  execSync(`cp "${dbFilePath}" "${backupPath}"`);
  console.log('✓ Database backed up to:', backupPath);
}

// Clear users table to simulate first user scenario
console.log('Clearing users table...');
execSync(`sqlite3 "${dbFilePath}" "DELETE FROM user;"`);

// Check user count
const userCount = execSync(`sqlite3 "${dbFilePath}" "SELECT COUNT(*) FROM user;"`, { encoding: 'utf8' }).trim();
console.log('User count after clearing:', userCount);

if (userCount === '0') {
  console.log('✓ First user scenario is now active');
  console.log('✓ Login page should now redirect to register');
  console.log('✓ Register page should show "Create Admin Account" title');
} else {
  console.log('❌ Failed to clear users table');
}

console.log('\n=== How to restore ===');
console.log('To restore the original database:');
console.log(`cp "${backupPath}" "${dbFilePath}"`);
console.log('rm', backupPath);
