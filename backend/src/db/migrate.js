/**
 * Database migration runner using postgres-migrations
 * Supports both up and down migrations
 */

import { migrate } from 'postgres-migrations';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/bookbuddy_dev';

// Create database connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Migration directory
const migrationsDirectory = join(__dirname, '../../migrations');

async function runMigrations() {
  const command = process.argv[2] || 'up';

  try {
    console.log(`Running migrations: ${command}`);
    console.log(`Database: ${DATABASE_URL.replace(/:\/\/.*@/, '://***@')}`);
    console.log(`Migrations directory: ${migrationsDirectory}`);

    if (command === 'up') {
      await migrate({ client: pool }, migrationsDirectory);
      console.log('✅ Migrations completed successfully');
    } else if (command === 'down') {
      console.warn('⚠️  Migration rollback not fully supported by postgres-migrations');
      console.warn('   Manual rollback required - see migration files for DOWN sections');
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Usage: node migrate.js [up|down]');
      process.exit(1);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
