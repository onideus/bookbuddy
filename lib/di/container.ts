import { IUserRepository } from '../../domain/interfaces/user-repository';
import { IBookRepository } from '../../domain/interfaces/book-repository';
import { IGoalRepository } from '../../domain/interfaces/goal-repository';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher';
import { IExternalBookSearch } from '../../domain/interfaces/external-book-search';

import { MemoryUserRepository } from '../../infrastructure/persistence/memory/user-repository';
import { MemoryBookRepository } from '../../infrastructure/persistence/memory/book-repository';
import { MemoryGoalRepository } from '../../infrastructure/persistence/memory/goal-repository';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import { GoogleBooksClient } from '../../infrastructure/external/google-books-client';

export class Container {
  private static userRepository: IUserRepository;
  private static bookRepository: IBookRepository;
  private static goalRepository: IGoalRepository;
  private static passwordHasher: IPasswordHasher;
  private static externalBookSearch: IExternalBookSearch;

  static getUserRepository(): IUserRepository {
    if (!this.userRepository) {
      this.userRepository = new MemoryUserRepository();
    }
    return this.userRepository;
  }

  static getBookRepository(): IBookRepository {
    if (!this.bookRepository) {
      this.bookRepository = new MemoryBookRepository();
    }
    return this.bookRepository;
  }

  static getGoalRepository(): IGoalRepository {
    if (!this.goalRepository) {
      this.goalRepository = new MemoryGoalRepository();
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
}

// Helper function for creating request-scoped container
export function createRequestContainer() {
  return {
    userRepository: Container.getUserRepository(),
    bookRepository: Container.getBookRepository(),
    goalRepository: Container.getGoalRepository(),
    passwordHasher: Container.getPasswordHasher(),
    externalBookSearch: Container.getExternalBookSearch(),
  };
}
