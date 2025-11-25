"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserStreakUseCase = void 0;
const reading_streak_1 = require("../../../domain/value-objects/reading-streak");
const domain_errors_1 = require("../../../domain/errors/domain-errors");
class GetUserStreakUseCase {
    constructor(readingActivityRepository) {
        this.readingActivityRepository = readingActivityRepository;
    }
    async execute(input) {
        if (!input.userId) {
            throw new domain_errors_1.ValidationError('User ID is required');
        }
        // Fetch all reading activities for the user
        // For better performance with large datasets, could limit to last N days
        const activities = await this.readingActivityRepository.findByUserId(input.userId);
        const streak = new reading_streak_1.ReadingStreak(activities);
        return streak.toJSON();
    }
}
exports.GetUserStreakUseCase = GetUserStreakUseCase;
