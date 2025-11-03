"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
class UpdateBookUseCase {
    constructor(bookRepository) {
        this.bookRepository = bookRepository;
    }
    async execute(input) {
        const book = await this.bookRepository.findById(input.bookId);
        if (!book) {
            throw new domain_errors_1.NotFoundError('Book', input.bookId);
        }
        if (book.userId !== input.userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this book');
        }
        const updated = await this.bookRepository.update(input.bookId, input.updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Book', input.bookId);
        }
        return updated;
    }
}
exports.UpdateBookUseCase = UpdateBookUseCase;
