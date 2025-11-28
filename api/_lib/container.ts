import { prisma } from './prisma';

// Import repository implementations
import { PrismaUserRepository } from '../../infrastructure/persistence/prisma/user-repository';
import { PrismaBookRepository } from '../../infrastructure/persistence/prisma/book-repository';
import { PrismaGoalRepository } from '../../infrastructure/persistence/prisma/goal-repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/persistence/prisma/refresh-token-repository';
import { PrismaReadingActivityRepository } from '../../infrastructure/persistence/prisma/reading-activity-repository';
import { PrismaReadingSessionRepository } from '../../infrastructure/persistence/prisma/reading-session-repository';

// Import other infrastructure
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import { GoogleBooksClient } from '../../infrastructure/external/google-books-client';

// Import interfaces for typing
import type { IUserRepository } from '../../domain/interfaces/user-repository';
import type { IBookRepository } from '../../domain/interfaces/book-repository';
import type { IGoalRepository } from '../../domain/interfaces/goal-repository';
import type { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository';
import type { IReadingActivityRepository } from '../../domain/interfaces/reading-activity-repository';
import type { IReadingSessionRepository } from '../../domain/interfaces/reading-session-repository';
import type { IPasswordHasher } from '../../domain/interfaces/password-hasher';
import type { IExternalBookSearch } from '../../domain/interfaces/external-book-search';

/**
 * Dependency Injection Container for Serverless Functions
 * 
 * In serverless, each function invocation is potentially a fresh environment.
 * This container creates fresh instances for each request, which is the 
 * recommended pattern for serverless.
 * 
 * The Prisma client is the exception - it's a singleton to avoid connection issues.
 */

export interface Container {
  userRepository: IUserRepository;
  bookRepository: IBookRepository;
  goalRepository: IGoalRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  readingActivityRepository: IReadingActivityRepository;
  readingSessionRepository: IReadingSessionRepository;
  passwordHasher: IPasswordHasher;
  externalBookSearch: IExternalBookSearch;
}

/**
 * Create a new container with fresh repository instances.
 * Call this at the start of each serverless function invocation.
 */
export function getContainer(): Container {
  return {
    userRepository: new PrismaUserRepository(),
    bookRepository: new PrismaBookRepository(),
    goalRepository: new PrismaGoalRepository(),
    refreshTokenRepository: new PrismaRefreshTokenRepository(prisma),
    readingActivityRepository: new PrismaReadingActivityRepository(),
    readingSessionRepository: new PrismaReadingSessionRepository(prisma),
    passwordHasher: new BcryptPasswordHasher(),
    externalBookSearch: new GoogleBooksClient(),
  };
}

/**
 * Export individual getters for convenience when you only need one dependency
 */
export function getUserRepository(): IUserRepository {
  return new PrismaUserRepository();
}

export function getBookRepository(): IBookRepository {
  return new PrismaBookRepository();
}

export function getGoalRepository(): IGoalRepository {
  return new PrismaGoalRepository();
}

export function getRefreshTokenRepository(): IRefreshTokenRepository {
  return new PrismaRefreshTokenRepository(prisma);
}

export function getReadingActivityRepository(): IReadingActivityRepository {
  return new PrismaReadingActivityRepository();
}

export function getPasswordHasher(): IPasswordHasher {
  return new BcryptPasswordHasher();
}

export function getExternalBookSearch(): IExternalBookSearch {
  return new GoogleBooksClient();
}

export function getReadingSessionRepository(): IReadingSessionRepository {
  return new PrismaReadingSessionRepository(prisma);
}