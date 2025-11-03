"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBookUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
const crypto_1 = require("crypto");
class AddBookUseCase {
    constructor(bookRepository) {
        this.bookRepository = bookRepository;
    }
    async execute(input) {
        // Check for duplicates
        const userBooks = await this.bookRepository.findByUserId(input.userId);
        const duplicate = userBooks.find(book => book.googleBooksId === input.googleBooksId);
        if (duplicate) {
            throw new domain_errors_1.DuplicateError('Book', 'googleBooksId');
        }
        const book = {
            id: (0, crypto_1.randomUUID)(),
            userId: input.userId,
            googleBooksId: input.googleBooksId,
            title: input.title,
            authors: input.authors,
            thumbnail: input.thumbnail,
            description: input.description,
            pageCount: input.pageCount,
            status: input.status,
            addedAt: new Date(),
        };
        return this.bookRepository.create(book);
    }
}
exports.AddBookUseCase = AddBookUseCase;
