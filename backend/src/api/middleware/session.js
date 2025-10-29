/**
 * Session middleware configuration using @fastify/session
 * PostgreSQL-backed sessions for FR-009 (auth) and FR-010 (multi-device)
 */

import fastifySession from '@fastify/session';
import connectPg from 'connect-pg-simple';
import { pool } from '../../db/connection.js';

const PgSession = connectPg(fastifySession);

/**
 * Configure session middleware
 * @param {Object} fastify - Fastify instance
 */
export async function configureSession(fastify) {
  const SESSION_SECRET = process.env.SESSION_SECRET || 'development-secret-change-in-production';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  const sessionConfig = {
    secret: SESSION_SECRET,
    cookie: {
      secure: NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      sameSite: 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    saveUninitialized: false,
    rolling: true, // Sliding expiration
  };

  // Use memory store for tests to avoid async timing issues
  if (NODE_ENV !== 'test') {
    sessionConfig.store = new PgSession({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: false, // We create via migrations
    });
  }

  await fastify.register(fastifySession, sessionConfig);
}

export default configureSession;
