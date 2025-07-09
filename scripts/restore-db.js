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

const backupPath = dbFilePath + '.backup';

console.log('=== Database Restore ===');
console.log('Database file path:', dbFilePath);
console.log('Backup file path:', backupPath);

if (existsSync(backupPath)) {
  console.log('Restoring database from backup...');
  execSync(`cp "${backupPath}" "${dbFilePath}"`);
  console.log('✓ Database restored successfully');
  
  // Verify user count
  const userCount = execSync(`sqlite3 "${dbFilePath}" "SELECT COUNT(*) FROM user;"`, { encoding: 'utf8' }).trim();
  console.log('User count after restore:', userCount);
  
  // Clean up backup
  execSync(`rm "${backupPath}"`);
  console.log('✓ Backup file removed');
} else {
  console.log('❌ No backup file found at:', backupPath);
  process.exit(1);
}
