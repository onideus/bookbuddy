/**
 * Centralized Configuration Module
 *
 * All configuration values for the BookTracker application.
 * Uses environment variables with sensible defaults for development.
 *
 * @module lib/config
 */

export interface Config {
  // Server Configuration
  server: {
    port: number;
    host: string;
  };

  // JWT Configuration
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };

  // Rate Limiting Configuration
  rateLimit: {
    global: {
      max: number;
      timeWindow: string;
    };
    auth: {
      max: number;
      timeWindow: string;
    };
  };

  // Database Configuration
  database: {
    url: string;
  };

  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'human';
  };

  // External Services
  external: {
    googleBooksApiKey?: string;
  };

  // Environment
  env: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
}

/**
 * Parse and validate configuration from environment variables
 */
function loadConfig(): Config {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Validate required environment variables in production
  if (nodeEnv === 'production') {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(', ')}`
      );
    }
  }

  return {
    server: {
      port: parseInt(process.env.PORT || '4000', 10),
      host: process.env.HOST || '0.0.0.0',
    },

    jwt: {
      secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
      accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    },

    rateLimit: {
      global: {
        max: parseInt(process.env.GLOBAL_RATE_LIMIT || '100', 10),
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      },
      auth: {
        max: parseInt(process.env.AUTH_RATE_LIMIT || '5', 10),
        timeWindow: process.env.AUTH_RATE_LIMIT_WINDOW || '1 minute',
      },
    },

    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://booktracker:booktracker_dev_password@localhost:5432/booktracker?schema=public',
    },

    logging: {
      level: (process.env.LOG_LEVEL?.toLowerCase() as Config['logging']['level']) ||
        (nodeEnv === 'production' ? 'info' : 'debug'),
      format: (process.env.LOG_FORMAT as 'json' | 'human') || 'human',
    },

    external: {
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
    },

    env: {
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',
    },
  };
}

/**
 * Singleton configuration instance
 */
export const config = loadConfig();

/**
 * Helper to get JWT secret (throws in production if not set)
 */
export function getJWTSecret(): string {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  if (config.env.isProduction && config.jwt.secret === 'development-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
  return config.jwt.secret;
}

/**
 * Helper to validate configuration on startup
 */
export function validateConfig(): void {
  // Validate port
  if (isNaN(config.server.port) || config.server.port < 1 || config.server.port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  // Validate rate limits
  if (config.rateLimit.global.max < 1) {
    throw new Error(`Invalid GLOBAL_RATE_LIMIT: ${process.env.GLOBAL_RATE_LIMIT}`);
  }
  if (config.rateLimit.auth.max < 1) {
    throw new Error(`Invalid AUTH_RATE_LIMIT: ${process.env.AUTH_RATE_LIMIT}`);
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}`);
  }

  // Warn about development secrets in production
  if (config.env.isProduction) {
    if (config.jwt.secret === 'development-secret-change-in-production') {
      throw new Error('SECURITY: JWT_SECRET must be changed in production');
    }
  }
}