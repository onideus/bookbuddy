/**
 * Pino logger setup with correlation ID support (FR-015, FR-017)
 * Structured logging for observability (Constitution Principle V)
 */

import pino from 'pino';

// Get log level from environment (default: info)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create logger with appropriate configuration for environment
const logger = pino({
  level: LOG_LEVEL,
  // Pretty print in development, JSON in production
  transport: NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Base fields included in all logs
  base: {
    env: NODE_ENV,
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'secret'],
    remove: true,
  },
});

/**
 * Create a child logger with correlation ID
 * @param {string} correlationId - Correlation ID for request tracing
 * @param {Object} bindings - Additional context to bind to logger
 * @returns {Object} Pino logger instance
 */
export function createRequestLogger(correlationId, bindings = {}) {
  return logger.child({
    correlationId,
    ...bindings,
  });
}

/**
 * Log analytics event (FR-016)
 * @param {Object} event - Event data
 */
export function logAnalyticsEvent(event) {
  logger.info({
    type: 'analytics',
    ...event,
  }, 'Analytics event');
}

// Export default logger instance
export default logger;
