"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
exports.createRequestContainer = createRequestContainer;
const user_repository_1 = require("../../infrastructure/persistence/prisma/user-repository");
const book_repository_1 = require("../../infrastructure/persistence/prisma/book-repository");
const goal_repository_1 = require("../../infrastructure/persistence/prisma/goal-repository");
const refresh_token_repository_1 = require("../../infrastructure/persistence/prisma/refresh-token-repository");
const bcrypt_password_hasher_1 = require("../../infrastructure/security/bcrypt-password-hasher");
const google_books_client_1 = require("../../infrastructure/external/google-books-client");
const client_1 = require("../../infrastructure/persistence/prisma/client");
const book_service_1 = require("../../domain/services/book-service");
const goal_service_1 = require("../../domain/services/goal-service");
class Container {
    static getUserRepository() {
        if (!this.userRepository) {
            this.userRepository = new user_repository_1.PrismaUserRepository();
        }
        return this.userRepository;
    }
    static getBookRepository() {
        if (!this.bookRepository) {
            this.bookRepository = new book_repository_1.PrismaBookRepository();
        }
        return this.bookRepository;
    }
    static getGoalRepository() {
        if (!this.goalRepository) {
            this.goalRepository = new goal_repository_1.PrismaGoalRepository();
        }
        return this.goalRepository;
    }
    static getPasswordHasher() {
        if (!this.passwordHasher) {
            this.passwordHasher = new bcrypt_password_hasher_1.BcryptPasswordHasher();
        }
        return this.passwordHasher;
    }
    static getExternalBookSearch() {
        if (!this.externalBookSearch) {
            this.externalBookSearch = new google_books_client_1.GoogleBooksClient();
        }
        return this.externalBookSearch;
    }
    static getBookService() {
        if (!this.bookService) {
            this.bookService = new book_service_1.BookService(this.getBookRepository());
        }
        return this.bookService;
    }
    static getGoalService() {
        if (!this.goalService) {
            this.goalService = new goal_service_1.GoalService(this.getGoalRepository(), this.getBookRepository());
        }
        return this.goalService;
    }
    static getRefreshTokenRepository() {
        if (!this.refreshTokenRepository) {
            this.refreshTokenRepository = new refresh_token_repository_1.PrismaRefreshTokenRepository(client_1.prisma);
        }
        return this.refreshTokenRepository;
    }
}
exports.Container = Container;
// Helper function for creating request-scoped container
function createRequestContainer() {
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
