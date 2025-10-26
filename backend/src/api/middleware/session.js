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

  await fastify.register(fastifySession, {
    secret: SESSION_SECRET,
    cookie: {
      secure: NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      sameSite: 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: new PgSession({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: false, // We create via migrations
    }),
    saveUninitialized: false,
    rolling: true, // Sliding expiration
  });
}

export default configureSession;
