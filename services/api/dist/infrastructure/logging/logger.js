"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
function getLogLevelFromEnv() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
        return envLevel;
    }
    // Default to 'info' in production, 'debug' in development
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}
function shouldLog(level, minLevel) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}
function formatLogEntry(entry) {
    const { timestamp, level, message, context } = entry;
    const levelUpper = level.toUpperCase().padEnd(5);
    if (process.env.LOG_FORMAT === 'json') {
        return JSON.stringify(entry);
    }
    // Human-readable format for development
    let output = `${timestamp} [${levelUpper}] ${message}`;
    if (context && Object.keys(context).length > 0) {
        output += ` ${JSON.stringify(context)}`;
    }
    return output;
}
function sanitizeContext(context) {
    if (!context)
        return undefined;
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = {};
    for (const [key, value] of Object.entries(context)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeContext(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
class Logger {
    constructor(minLevel, defaultContext = {}) {
        this.minLevel = minLevel ?? getLogLevelFromEnv();
        this.defaultContext = defaultContext;
    }
    log(level, message, context) {
        if (!shouldLog(level, this.minLevel))
            return;
        const mergedContext = { ...this.defaultContext, ...context };
        const sanitizedContext = sanitizeContext(mergedContext);
        const entry = {
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
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
    /**
     * Create a child logger with default context that will be included in all log entries
     * Useful for adding request IDs, user IDs, or module names to all logs
     */
    child(defaultContext) {
        return new Logger(this.minLevel, { ...this.defaultContext, ...defaultContext });
    }
}
// Singleton logger instance
exports.logger = new Logger();
// Factory function for creating module-specific loggers
function createLogger(moduleName) {
    return exports.logger.child({ module: moduleName });
}
