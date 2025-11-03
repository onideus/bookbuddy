import { IUserRepository } from '../../domain/interfaces/user-repository';
import { IBookRepository } from '../../domain/interfaces/book-repository';
import { IGoalRepository } from '../../domain/interfaces/goal-repository';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher';
import { IExternalBookSearch } from '../../domain/interfaces/external-book-search';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository';

import { PrismaUserRepository } from '../../infrastructure/persistence/prisma/user-repository';
import { PrismaBookRepository } from '../../infrastructure/persistence/prisma/book-repository';
import { PrismaGoalRepository } from '../../infrastructure/persistence/prisma/goal-repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/persistence/prisma/refresh-token-repository';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import { GoogleBooksClient } from '../../infrastructure/external/google-books-client';
import { prisma } from '../../infrastructure/persistence/prisma/client';

import { BookService } from '../../domain/services/book-service';
import { GoalService } from '../../domain/services/goal-service';

export class Container {
  private static userRepository: IUserRepository;
  private static bookRepository: IBookRepository;
  private static goalRepository: IGoalRepository;
  private static refreshTokenRepository: IRefreshTokenRepository;
  private static passwordHasher: IPasswordHasher;
  private static externalBookSearch: IExternalBookSearch;
  private static bookService: BookService;
  private static goalService: GoalService;

  static getUserRepository(): IUserRepository {
    if (!this.userRepository) {
      this.userRepository = new PrismaUserRepository();
    }
    return this.userRepository;
  }

  static getBookRepository(): IBookRepository {
    if (!this.bookRepository) {
      this.bookRepository = new PrismaBookRepository();
    }
    return this.bookRepository;
  }

  static getGoalRepository(): IGoalRepository {
    if (!this.goalRepository) {
      this.goalRepository = new PrismaGoalRepository();
    }
    return this.goalRepository;
  }

  static getPasswordHasher(): IPasswordHasher {
    if (!this.passwordHasher) {
      this.passwordHasher = new BcryptPasswordHasher();
    }
    return this.passwordHasher;
  }

  static getExternalBookSearch(): IExternalBookSearch {
    if (!this.externalBookSearch) {
      this.externalBookSearch = new GoogleBooksClient();
    }
    return this.externalBookSearch;
  }

  static getBookService(): BookService {
    if (!this.bookService) {
      this.bookService = new BookService(this.getBookRepository());
    }
    return this.bookService;
  }

  static getGoalService(): GoalService {
    if (!this.goalService) {
      this.goalService = new GoalService(
        this.getGoalRepository(),
        this.getBookRepository()
      );
    }
    return this.goalService;
  }

  static getRefreshTokenRepository(): IRefreshTokenRepository {
    if (!this.refreshTokenRepository) {
      this.refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
    }
    return this.refreshTokenRepository;
  }
}

// Helper function for creating request-scoped container
export function createRequestContainer() {
  return {
    userRepository: Container.getUserRepository(),
    bookRepository: Container.getBookRepository(),
    goalRepository: Container.getGoalRepository(),
    refreshTokenRepository: Container.getRefreshTokenRepository(),
    passwordHasher: Container.getPasswordHasher(),
    externalBookSearch: Container.getExternalBookSearch(),
    bookService: Container.getBookService(),
    goalService: Container.getGoalService(),
  };
}
