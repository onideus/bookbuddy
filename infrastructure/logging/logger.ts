/**
 * Logging infrastructure for BookTracker
 *
 * A lightweight, structured logging framework with configurable log levels.
 * Designed for clean architecture - no external dependencies required.
 *
 * Usage:
 *   import { logger } from '../infrastructure/logging/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to save book', { bookId: '456', error: err.message });
 */

import { config } from '../../lib/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(defaultContext: LogContext): ILogger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevelFromEnv(): LogLevel {
  return config.logging.level;
}

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry;
  const levelUpper = level.toUpperCase().padEnd(5);

  if (config.logging.format === 'json') {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  let output = `${timestamp} [${levelUpper}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  return output;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class Logger implements ILogger {
  private minLevel: LogLevel;
  private defaultContext: LogContext;

  constructor(minLevel?: LogLevel, defaultContext: LogContext = {}) {
    this.minLevel = minLevel ?? getLogLevelFromEnv();
    this.defaultContext = defaultContext;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level, this.minLevel)) return;

    const mergedContext = { ...this.defaultContext, ...context };
    const sanitizedContext = sanitizeContext(mergedContext);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(sanitizedContext &&
        Object.keys(sanitizedContext).length > 0 && { context: sanitizedContext }),
    };

    const formatted = formatLogEntry(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with default context that will be included in all log entries
   * Useful for adding request IDs, user IDs, or module names to all logs
   */
  child(defaultContext: LogContext): ILogger {
    return new Logger(this.minLevel, { ...this.defaultContext, ...defaultContext });
  }
}

// Singleton logger instance
export const logger = new Logger();

// Factory function for creating module-specific loggers
export function createLogger(moduleName: string): ILogger {
  return logger.child({ module: moduleName });
}
