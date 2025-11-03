"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookService = void 0;
const reading_status_1 = require("../value-objects/reading-status");
const domain_errors_1 = require("../errors/domain-errors");
class BookService {
    constructor(bookRepository) {
        this.bookRepository = bookRepository;
    }
    async updateReadingProgress(bookId, userId, currentPage) {
        const book = await this.bookRepository.findById(bookId);
        if (!book) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        if (book.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this book');
        }
        const readingStatus = new reading_status_1.ReadingStatus(book);
        readingStatus.validatePageProgress(currentPage);
        const updates = { currentPage };
        // Auto-mark as read if completed
        if (readingStatus.shouldAutoMarkAsRead()) {
            const statusUpdates = readingStatus.transitionTo('read');
            Object.assign(updates, statusUpdates);
        }
        const updated = await this.bookRepository.update(bookId, updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        return updated;
    }
    async updateStatus(bookId, userId, newStatus) {
        const book = await this.bookRepository.findById(bookId);
        if (!book) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        if (book.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this book');
        }
        const readingStatus = new reading_status_1.ReadingStatus(book);
        const updates = readingStatus.transitionTo(newStatus);
        const updated = await this.bookRepository.update(bookId, updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        return updated;
    }
    async rateBook(bookId, userId, rating) {
        const book = await this.bookRepository.findById(bookId);
        if (!book) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        if (book.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this book');
        }
        const readingStatus = new reading_status_1.ReadingStatus(book);
        readingStatus.validateRating(rating);
        const updated = await this.bookRepository.update(bookId, { rating });
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Book', bookId);
        }
        return updated;
    }
    async getReadingStatistics(userId) {
        const books = await this.bookRepository.findByUserId(userId);
        const stats = {
            total: books.length,
            wantToRead: 0,
            reading: 0,
            read: 0,
            totalPagesRead: 0,
            averageRating: 0,
            currentlyReading: [],
        };
        let ratedBooksCount = 0;
        let totalRating = 0;
        for (const book of books) {
            switch (book.status) {
                case 'want-to-read':
                    stats.wantToRead++;
                    break;
                case 'reading':
                    stats.reading++;
                    stats.currentlyReading.push(book);
                    break;
                case 'read':
                    stats.read++;
                    if (book.pageCount) {
                        stats.totalPagesRead += book.pageCount;
                    }
                    if (book.rating) {
                        totalRating += book.rating;
                        ratedBooksCount++;
                    }
                    break;
            }
        }
        if (ratedBooksCount > 0) {
            stats.averageRating = Math.round((totalRating / ratedBooksCount) * 10) / 10;
        }
        return stats;
    }
}
exports.BookService = BookService;
