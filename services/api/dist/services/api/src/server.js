"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const auth_1 = require("./routes/auth");
const books_1 = require("./routes/books");
const goals_1 = require("./routes/goals");
const search_1 = require("./routes/search");
function buildServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
        },
    });
    app.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
    }));
    (0, auth_1.registerAuthRoutes)(app);
    (0, books_1.registerBookRoutes)(app);
    (0, goals_1.registerGoalRoutes)(app);
    (0, search_1.registerSearchRoutes)(app);
    return app;
}
async function start() {
    const app = buildServer();
    const port = Number(process.env.PORT ?? 4000);
    try {
        await app.listen({ port, host: '0.0.0.0' });
        app.log.info(`API server listening on http://localhost:${port}`);
    }
    catch (error) {
        app.log.error(error, 'Failed to start API server');
        process.exit(1);
    }
}
if (require.main === module) {
    start();
}
