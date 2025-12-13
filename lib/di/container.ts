import { IUserRepository } from '../../domain/interfaces/user-repository';
import { IBookRepository } from '../../domain/interfaces/book-repository';
import { IGoalRepository } from '../../domain/interfaces/goal-repository';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher';
import { IExternalBookSearch } from '../../domain/interfaces/external-book-search';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository';
import { IReadingActivityRepository } from '../../domain/interfaces/reading-activity-repository';
import { CSVParser } from '../../domain/interfaces/csv-parser';
import { GoodreadsImporter } from '../../domain/interfaces/goodreads-importer';

import { ImportGoodreadsUseCase } from '../../application/use-cases/books/import-goodreads';

import { PrismaUserRepository } from '../../infrastructure/persistence/prisma/user-repository';
import { PrismaBookRepository } from '../../infrastructure/persistence/prisma/book-repository';
import { PrismaGoalRepository } from '../../infrastructure/persistence/prisma/goal-repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/persistence/prisma/refresh-token-repository';
import { PrismaReadingActivityRepository } from '../../infrastructure/persistence/prisma/reading-activity-repository';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import { GoogleBooksClient } from '../../infrastructure/external/google-books-client';
import { CSVParserImpl } from '../../infrastructure/external/csv-parser-impl';
import { GoodreadsImporterImpl } from '../../infrastructure/external/goodreads-importer-impl';
import { prisma } from '../../infrastructure/persistence/prisma/client';

import { BookService } from '../../domain/services/book-service';
import { GoalService } from '../../domain/services/goal-service';
import { GoodreadsMapper } from '../../domain/services/goodreads-mapper';

export class Container {
  private static userRepository: IUserRepository;
  private static bookRepository: IBookRepository;
  private static goalRepository: IGoalRepository;
  private static refreshTokenRepository: IRefreshTokenRepository;
  private static readingActivityRepository: IReadingActivityRepository;
  private static passwordHasher: IPasswordHasher;
  private static externalBookSearch: IExternalBookSearch;
  private static bookService: BookService;
  private static goalService: GoalService;
  private static csvParser: CSVParser;
  private static goodreadsMapper: GoodreadsMapper;
  private static goodreadsImporter: GoodreadsImporter;
  private static importGoodreadsUseCase: ImportGoodreadsUseCase;

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

  static getReadingActivityRepository(): IReadingActivityRepository {
    if (!this.readingActivityRepository) {
      this.readingActivityRepository = new PrismaReadingActivityRepository();
    }
    return this.readingActivityRepository;
  }

  static getCSVParser(): CSVParser {
    if (!this.csvParser) {
      this.csvParser = new CSVParserImpl();
    }
    return this.csvParser;
  }

  static getGoodreadsMapper(): GoodreadsMapper {
    if (!this.goodreadsMapper) {
      this.goodreadsMapper = new GoodreadsMapper();
    }
    return this.goodreadsMapper;
  }

  static getGoodreadsImporter(): GoodreadsImporter {
    if (!this.goodreadsImporter) {
      this.goodreadsImporter = new GoodreadsImporterImpl(
        this.getCSVParser(),
        this.getBookRepository(),
        this.getGoodreadsMapper()
      );
    }
    return this.goodreadsImporter;
  }

  static getImportGoodreadsUseCase(): ImportGoodreadsUseCase {
    if (!this.importGoodreadsUseCase) {
      this.importGoodreadsUseCase = new ImportGoodreadsUseCase(
        this.getGoodreadsImporter()
      );
    }
    return this.importGoodreadsUseCase;
  }
}

// Helper function for creating request-scoped container
export function createRequestContainer() {
  return {
    userRepository: Container.getUserRepository(),
    bookRepository: Container.getBookRepository(),
    goalRepository: Container.getGoalRepository(),
    refreshTokenRepository: Container.getRefreshTokenRepository(),
    readingActivityRepository: Container.getReadingActivityRepository(),
    passwordHasher: Container.getPasswordHasher(),
    externalBookSearch: Container.getExternalBookSearch(),
    bookService: Container.getBookService(),
    goalService: Container.getGoalService(),
    csvParser: Container.getCSVParser(),
    goodreadsMapper: Container.getGoodreadsMapper(),
    goodreadsImporter: Container.getGoodreadsImporter(),
    importGoodreadsUseCase: Container.getImportGoodreadsUseCase(),
  };
}
