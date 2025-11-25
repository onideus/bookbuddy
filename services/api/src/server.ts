import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../../../lib/config';
import { requestLoggerPlugin } from './middleware/request-logger';
import { registerErrorHandler } from './middleware/error-handler';
import { registerAuthRoutes } from './routes/auth';
import { registerBookRoutes } from './routes/books';
import { registerGoalRoutes } from './routes/goals';
import { registerSearchRoutes } from './routes/search';
import { registerStreakRoutes } from './routes/streaks';
import { registerExportRoutes } from './routes/export';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.logging.level,
    },
  });

  // Request/Response logging
  await app.register(requestLoggerPlugin);

  // Standardized error handling
  registerErrorHandler(app);

  // Global rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.global.max,
    timeWindow: config.rateLimit.global.timeWindow,
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

  registerAuthRoutes(app);
  registerBookRoutes(app);
  registerGoalRoutes(app);
  registerSearchRoutes(app);
  registerStreakRoutes(app);
  registerExportRoutes(app);

  return app;
}

async function start() {
  const app = await buildServer();
  const port = config.server.port;
  const host = config.server.host;

  try {
    await app.listen({ port, host });
    app.log.info(`API server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error, 'Failed to start API server');
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
