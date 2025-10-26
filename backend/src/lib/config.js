/**
 * Environment configuration loader
 * Loads and validates environment variables with sensible defaults
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file if it exists
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
  // Dynamic import of dotenv for ES modules
  const dotenv = await import('dotenv');
  dotenv.config({ path: envPath });
}

// Configuration object with defaults
export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/bookbuddy_dev',

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'development-secret-change-in-production',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Rate Limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

/**
 * Validate required configuration
 * @throws {Error} If required config is missing in production
 */
export function validateConfig() {
  if (config.isProduction) {
    const required = ['sessionSecret', 'databaseUrl'];
    const missing = required.filter((key) => !config[key] || config[key].includes('development'));

    if (missing.length > 0) {
      throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
    }

    if (config.sessionSecret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters in production');
    }
  }
}

export default config;
