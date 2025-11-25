import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { registerAuthRoutes } from './routes/auth';
import { registerBookRoutes } from './routes/books';
import { registerGoalRoutes } from './routes/goals';
import { registerSearchRoutes } from './routes/search';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Global rate limiting - 100 requests per minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
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

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4000);

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API server listening on http://localhost:${port}`);
  } catch (error) {
    app.log.error(error, 'Failed to start API server');
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
