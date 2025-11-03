"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingStatus = void 0;
const domain_errors_1 = require("../errors/domain-errors");
class ReadingStatus {
    constructor(book) {
        this.book = book;
    }
    canTransitionTo(newStatus) {
        const validTransitions = {
            'want-to-read': ['reading', 'read'],
            'reading': ['want-to-read', 'read'],
            'read': ['reading', 'want-to-read'],
        };
        return validTransitions[this.book.status].includes(newStatus);
    }
    transitionTo(newStatus) {
        if (!this.canTransitionTo(newStatus)) {
            throw new domain_errors_1.ValidationError(`Cannot transition from ${this.book.status} to ${newStatus}`);
        }
        const updates = { status: newStatus };
        // Auto-set finishedAt when transitioning to 'read'
        if (newStatus === 'read' && !this.book.finishedAt) {
            updates.finishedAt = new Date();
            // Set current page to total pages if available
            if (this.book.pageCount) {
                updates.currentPage = this.book.pageCount;
            }
        }
        // Clear finishedAt when transitioning away from 'read'
        if (this.book.status === 'read' && newStatus !== 'read') {
            updates.finishedAt = undefined;
            updates.rating = undefined; // Clear rating when moving away from 'read'
        }
        // Reset current page when transitioning to 'want-to-read'
        if (newStatus === 'want-to-read') {
            updates.currentPage = 0;
        }
        return updates;
    }
    getReadingProgress() {
        if (!this.book.pageCount || this.book.pageCount === 0)
            return 0;
        if (!this.book.currentPage)
            return 0;
        const progress = (this.book.currentPage / this.book.pageCount) * 100;
        return Math.min(100, Math.round(progress));
    }
    canBeRated() {
        return this.book.status === 'read';
    }
    validateRating(rating) {
        if (!this.canBeRated()) {
            throw new domain_errors_1.ValidationError('Only finished books can be rated');
        }
        if (rating < 1 || rating > 5) {
            throw new domain_errors_1.ValidationError('Rating must be between 1 and 5');
        }
    }
    validatePageProgress(currentPage) {
        if (currentPage < 0) {
            throw new domain_errors_1.ValidationError('Current page cannot be negative');
        }
        if (this.book.pageCount && currentPage > this.book.pageCount) {
            throw new domain_errors_1.ValidationError(`Current page (${currentPage}) cannot exceed total pages (${this.book.pageCount})`);
        }
    }
    shouldAutoMarkAsRead() {
        return (this.book.status === 'reading' &&
            this.book.pageCount !== undefined &&
            this.book.currentPage !== undefined &&
            this.book.currentPage >= this.book.pageCount);
    }
}
exports.ReadingStatus = ReadingStatus;
