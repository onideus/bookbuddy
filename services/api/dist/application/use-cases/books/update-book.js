"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
class UpdateBookUseCase {
    constructor(bookRepository, goalRepository) {
        this.bookRepository = bookRepository;
        this.goalRepository = goalRepository;
    }
    async execute(input) {
        const book = await this.bookRepository.findById(input.bookId);
        if (!book) {
            throw new domain_errors_1.NotFoundError('Book', input.bookId);
        }
        if (book.userId !== input.userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this book');
        }
        // Check if status is changing to 'read' from a different status
        const isBecomingRead = input.updates.status === 'read' && book.status !== 'read';
        const updated = await this.bookRepository.update(input.bookId, input.updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Book', input.bookId);
        }
        // Update goals when a book is marked as read
        if (isBecomingRead && this.goalRepository) {
            await this.updateGoalsProgress(input.userId);
        }
        return updated;
    }
    async updateGoalsProgress(userId) {
        if (!this.goalRepository)
            return;
        // Get all goals for the user
        const goals = await this.goalRepository.findByUserId(userId);
        // Count books with status 'read'
        const readBooks = await this.bookRepository.findByStatus(userId, 'read');
        const readBooksCount = readBooks.length;
        // Update each goal with the current count
        for (const goal of goals) {
            await this.goalRepository.update(goal.id, {
                currentBooks: readBooksCount,
                completed: readBooksCount >= goal.targetBooks,
            });
        }
    }
}
exports.UpdateBookUseCase = UpdateBookUseCase;
