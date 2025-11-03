import 'dotenv/config';
import Fastify from 'fastify';
import { registerAuthRoutes } from './routes/auth';
import { registerBookRoutes } from './routes/books';
import { registerGoalRoutes } from './routes/goals';
import { registerSearchRoutes } from './routes/search';

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
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
  const app = buildServer();
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
