"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const config_1 = require("../../../lib/config");
const request_logger_1 = require("./middleware/request-logger");
const error_handler_1 = require("./middleware/error-handler");
const auth_1 = require("./routes/auth");
const books_1 = require("./routes/books");
const goals_1 = require("./routes/goals");
const search_1 = require("./routes/search");
const streaks_1 = require("./routes/streaks");
const export_1 = require("./routes/export");
async function buildServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: config_1.config.logging.level,
        },
    });
    // Request/Response logging
    await app.register(request_logger_1.requestLoggerPlugin);
    // Standardized error handling
    (0, error_handler_1.registerErrorHandler)(app);
    // Global rate limiting
    await app.register(rate_limit_1.default, {
        max: config_1.config.rateLimit.global.max,
        timeWindow: config_1.config.rateLimit.global.timeWindow,
        errorResponseBuilder: () => ({
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
            },
        }),
    });
    app.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
    }));
    (0, auth_1.registerAuthRoutes)(app);
    (0, books_1.registerBookRoutes)(app);
    (0, goals_1.registerGoalRoutes)(app);
    (0, search_1.registerSearchRoutes)(app);
    (0, streaks_1.registerStreakRoutes)(app);
    (0, export_1.registerExportRoutes)(app);
    return app;
}
async function start() {
    const app = await buildServer();
    const port = config_1.config.server.port;
    const host = config_1.config.server.host;
    try {
        await app.listen({ port, host });
        app.log.info(`API server listening on http://${host}:${port}`);
    }
    catch (error) {
        app.log.error(error, 'Failed to start API server');
        process.exit(1);
    }
}
if (require.main === module) {
    start();
}
