#!/usr/bin/env node

import { createClient } from '@libsql/client';
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

// Get database credentials from environment
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_TOKEN = process.env.DATABASE_TOKEN;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Database URL:', DATABASE_URL);

// Create LibSQL client
const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_TOKEN,
});

// Read migration file
const migrationFile = join(rootDir, 'drizzle', '0000_huge_forge.sql');
if (!existsSync(migrationFile)) {
  console.error('Migration file not found:', migrationFile);
  process.exit(1);
}

console.log('Reading migration file:', migrationFile);
const migrationContent = readFileSync(migrationFile, 'utf8');

// Split SQL statements by statement breakpoints and semicolons
const statements = migrationContent
  .split('---> statement-breakpoint')
  .join('\n') // Join back together
  .split(';') // Split by semicolons
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
  .map(stmt => stmt.endsWith(';') ? stmt : stmt + ';'); // Ensure each statement ends with semicolon

console.log(`Found ${statements.length} statements to execute`);

async function runMigration() {
  try {
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await client.execute(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Check if it's a "table already exists" error, which we can ignore
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigration();
