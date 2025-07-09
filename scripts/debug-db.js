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

console.log('=== Database Debug Information ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DATABASE_TOKEN:', process.env.DATABASE_TOKEN ? '[SET]' : '[NOT SET]');

// Extract file path from DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

let dbFilePath;
if (DATABASE_URL.startsWith('file:')) {
  dbFilePath = DATABASE_URL.replace('file:', '');
} else {
  dbFilePath = DATABASE_URL;
}

console.log('Database file path:', dbFilePath);
console.log('Database file exists:', existsSync(dbFilePath));

if (existsSync(dbFilePath)) {
  try {
    console.log('\n=== Database Tables ===');
    const tables = execSync(`sqlite3 "${dbFilePath}" ".tables"`, { encoding: 'utf8' });
    console.log(tables.trim());
    
    console.log('\n=== User Table Info ===');
    const userInfo = execSync(`sqlite3 "${dbFilePath}" ".schema user"`, { encoding: 'utf8' });
    console.log(userInfo.trim());
    
    console.log('\n=== Migration Status ===');
    const migrations = execSync(`sqlite3 "${dbFilePath}" "SELECT * FROM __drizzle_migrations;"`, { encoding: 'utf8' });
    console.log(migrations.trim() || 'No migrations found');
    
  } catch (error) {
    console.error('Error querying database:', error.message);
  }
} else {
  console.log('❌ Database file does not exist');
  console.log('Directory contents:');
  try {
    const dirContents = execSync(`ls -la "${dirname(dbFilePath)}"`, { encoding: 'utf8' });
    console.log(dirContents);
  } catch (error) {
    console.error('Error listing directory:', error.message);
  }
}

console.log('\n=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('Current working directory:', process.cwd());
console.log('Root directory:', rootDir);
