import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton for serverless environments.
 * 
 * In serverless, each function invocation might create a new Prisma instance.
 * This pattern ensures we reuse the client in development (hot reload) and
 * create fresh connections in production (cold starts are handled by connection pooling).
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}