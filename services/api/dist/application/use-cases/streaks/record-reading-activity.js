"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordReadingActivityUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
class RecordReadingActivityUseCase {
    constructor(readingActivityRepository) {
        this.readingActivityRepository = readingActivityRepository;
    }
    async execute(input) {
        if (!input.userId) {
            throw new domain_errors_1.ValidationError('User ID is required');
        }
        const pagesRead = input.pagesRead ?? 0;
        const minutesRead = input.minutesRead ?? 0;
        if (pagesRead < 0 || minutesRead < 0) {
            throw new domain_errors_1.ValidationError('Pages read and minutes read must be non-negative');
        }
        if (pagesRead === 0 && minutesRead === 0) {
            throw new domain_errors_1.ValidationError('At least pages read or minutes read must be provided');
        }
        const activityDate = input.date ?? new Date();
        return this.readingActivityRepository.recordActivity({
            userId: input.userId,
            bookId: input.bookId,
            activityDate,
            pagesRead,
            minutesRead,
        });
    }
}
exports.RecordReadingActivityUseCase = RecordReadingActivityUseCase;
