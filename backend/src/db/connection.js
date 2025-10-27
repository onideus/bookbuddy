/**
 * Database connection module using node-postgres
 * Provides connection pooling and query utilities
 */

import pg from 'pg';
import { config } from '../lib/config.js';
const { Pool } = pg;

// Get database URL from config (which loads .env file)
const DATABASE_URL = config.databaseUrl;

// Create connection pool with optimized settings
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum 20 connections (per plan.md)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

/**
 * Execute a SQL query with optional parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (>1s)
    if (duration > 1000) {
      console.warn('Slow query detected:', {
        duration,
        text: text.substring(0, 100),
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      error: error.message,
      query: text.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done
 * @returns {Promise<Object>} Database client
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Execute a function within a database transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise<any>} Result from callback
 */
export async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gracefully close the database pool
 * Call this on application shutdown
 */
export async function closePool() {
  await pool.end();
}

// Export the pool for direct access if needed
export { pool };
export default { query, getClient, transaction, closePool, pool };
