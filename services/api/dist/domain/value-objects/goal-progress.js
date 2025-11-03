"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalProgress = void 0;
class GoalProgress {
    constructor(goal) {
        this.goal = goal;
    }
    getProgressPercentage() {
        if (this.goal.targetBooks === 0)
            return 0;
        const percentage = (this.goal.currentBooks / this.goal.targetBooks) * 100;
        return Math.min(100, Math.round(percentage));
    }
    isCompleted() {
        return this.goal.currentBooks >= this.goal.targetBooks;
    }
    isOverdue() {
        const now = new Date();
        return now > this.goal.endDate && !this.goal.completed;
    }
    getDaysRemaining() {
        const now = new Date();
        const timeRemaining = this.goal.endDate.getTime() - now.getTime();
        return Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    }
    getBooksRemaining() {
        return Math.max(0, this.goal.targetBooks - this.goal.currentBooks);
    }
    getStatus() {
        if (this.goal.completed)
            return 'completed';
        if (this.isOverdue())
            return 'overdue';
        if (this.goal.currentBooks === 0)
            return 'not-started';
        return 'in-progress';
    }
    shouldAutoComplete() {
        return !this.goal.completed && this.isCompleted();
    }
    toJSON() {
        return {
            percentage: this.getProgressPercentage(),
            isCompleted: this.isCompleted(),
            isOverdue: this.isOverdue(),
            daysRemaining: this.getDaysRemaining(),
            booksRemaining: this.getBooksRemaining(),
            status: this.getStatus(),
        };
    }
}
exports.GoalProgress = GoalProgress;
