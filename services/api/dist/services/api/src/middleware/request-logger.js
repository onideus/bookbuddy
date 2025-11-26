"use strict";
/**
 * Request/Response Logging Middleware for Fastify
 *
 * Provides structured logging for all API requests with:
 * - Unique request IDs for tracing
 * - Request details (method, path, query params)
 * - Response details (status code, response time)
 * - Error categorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerPlugin = void 0;
const crypto_1 = require("crypto");
const logging_1 = require("../../../../infrastructure/logging");
/**
 * Request Logger Plugin
 *
 * Logs all incoming requests and their responses with structured data.
 * Adds X-Request-Id header to all responses for tracing.
 */
const requestLoggerPlugin = async (fastify) => {
    // Hook: onRequest - Log request start and initialize tracking
    fastify.addHook('onRequest', async (request) => {
        // Generate unique request ID or use existing one from header
        request.requestId =
            request.headers['x-request-id'] || (0, crypto_1.randomUUID)();
        request.startTime = Date.now();
        const logContext = {
            requestId: request.requestId,
            method: request.method,
            path: request.url,
        };
        // Only include query params if they exist and are not empty
        if (request.query && Object.keys(request.query).length > 0) {
            logContext.query = request.query;
        }
        // Include user agent if present
        const userAgent = request.headers['user-agent'];
        if (userAgent) {
            logContext.userAgent = userAgent;
        }
        // Include client IP
        logContext.ip = request.ip;
        logging_1.logger.debug('Request started', logContext);
    });
    // Hook: onResponse - Log request completion
    fastify.addHook('onResponse', async (request, reply) => {
        const responseTime = Date.now() - request.startTime;
        // Add request ID to response headers for client-side tracing
        reply.header('X-Request-Id', request.requestId);
        const logContext = {
            requestId: request.requestId,
            method: request.method,
            path: request.url,
            statusCode: reply.statusCode,
            responseTimeMs: responseTime,
        };
        // Include user ID if authenticated
        const user = request.user;
        if (user?.userId) {
            logContext.userId = user.userId;
        }
        // Log level based on status code
        if (reply.statusCode >= 500) {
            logging_1.logger.error('Request completed with server error', logContext);
        }
        else if (reply.statusCode >= 400) {
            logging_1.logger.warn('Request completed with client error', logContext);
        }
        else {
            logging_1.logger.info('Request completed', logContext);
        }
    });
    // Hook: onError - Log errors that occur during request processing
    fastify.addHook('onError', async (request, reply, error) => {
        const logContext = {
            requestId: request.requestId,
            method: request.method,
            path: request.url,
            statusCode: reply.statusCode || 500,
            error: error.name || 'Error',
            errorMessage: error.message,
        };
        // Include user ID if authenticated
        const user = request.user;
        if (user?.userId) {
            logContext.userId = user.userId;
        }
        // Include stack trace in development
        if (process.env.NODE_ENV !== 'production' && error.stack) {
            logContext.stack = error.stack;
        }
        logging_1.logger.error('Request error', logContext);
    });
    // Hook: onSend - Add request ID to response headers (backup)
    fastify.addHook('onSend', async (request, reply, payload) => {
        // Ensure request ID is always in response headers
        if (!reply.getHeader('X-Request-Id')) {
            reply.header('X-Request-Id', request.requestId);
        }
        return payload;
    });
};
exports.requestLoggerPlugin = requestLoggerPlugin;
exports.default = exports.requestLoggerPlugin;
