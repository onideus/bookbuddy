"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalService = void 0;
const goal_progress_1 = require("../value-objects/goal-progress");
const domain_errors_1 = require("../errors/domain-errors");
class GoalService {
    constructor(goalRepository, bookRepository) {
        this.goalRepository = goalRepository;
        this.bookRepository = bookRepository;
    }
    async syncGoalProgress(goalId, userId) {
        const goal = await this.goalRepository.findById(goalId);
        if (!goal) {
            throw new domain_errors_1.NotFoundError('Goal', goalId);
        }
        if (goal.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this goal');
        }
        // Count books read within goal timeframe
        const books = await this.bookRepository.findByUserId(userId);
        const booksReadInPeriod = books.filter(book => {
            if (book.status !== 'read' || !book.finishedAt)
                return false;
            const finishedDate = new Date(book.finishedAt);
            return finishedDate >= goal.startDate && finishedDate <= goal.endDate;
        });
        const currentBooks = booksReadInPeriod.length;
        const progress = new goal_progress_1.GoalProgress({ ...goal, currentBooks });
        const updates = {
            currentBooks,
        };
        // Auto-complete if target reached
        if (progress.shouldAutoComplete()) {
            updates.completed = true;
        }
        const updated = await this.goalRepository.update(goalId, updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Goal', goalId);
        }
        return updated;
    }
    async getGoalWithProgress(goalId, userId) {
        const goal = await this.goalRepository.findById(goalId);
        if (!goal) {
            throw new domain_errors_1.NotFoundError('Goal', goalId);
        }
        if (goal.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this goal');
        }
        const progress = new goal_progress_1.GoalProgress(goal);
        return {
            goal,
            progress: progress.toJSON(),
        };
    }
    async getAllGoalsWithProgress(userId) {
        const goals = await this.goalRepository.findByUserId(userId);
        return goals.map(goal => {
            const progress = new goal_progress_1.GoalProgress(goal);
            return {
                goal,
                progress: progress.toJSON(),
            };
        });
    }
    async updateGoalProgress(goalId, userId, currentBooks) {
        const goal = await this.goalRepository.findById(goalId);
        if (!goal) {
            throw new domain_errors_1.NotFoundError('Goal', goalId);
        }
        if (goal.userId !== userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this goal');
        }
        const progress = new goal_progress_1.GoalProgress({ ...goal, currentBooks });
        const updates = {
            currentBooks,
        };
        // Auto-complete if target reached
        if (progress.shouldAutoComplete()) {
            updates.completed = true;
        }
        const updated = await this.goalRepository.update(goalId, updates);
        if (!updated) {
            throw new domain_errors_1.NotFoundError('Goal', goalId);
        }
        return updated;
    }
    async getGoalStatistics(userId) {
        const goals = await this.goalRepository.findByUserId(userId);
        const stats = {
            total: goals.length,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            overdue: 0,
            totalBooksTarget: 0,
            totalBooksRead: 0,
        };
        for (const goal of goals) {
            const progress = new goal_progress_1.GoalProgress(goal);
            const status = progress.getStatus();
            stats.totalBooksTarget += goal.targetBooks;
            stats.totalBooksRead += goal.currentBooks;
            switch (status) {
                case 'completed':
                    stats.completed++;
                    break;
                case 'in-progress':
                    stats.inProgress++;
                    break;
                case 'not-started':
                    stats.notStarted++;
                    break;
                case 'overdue':
                    stats.overdue++;
                    break;
            }
        }
        return stats;
    }
}
exports.GoalService = GoalService;
