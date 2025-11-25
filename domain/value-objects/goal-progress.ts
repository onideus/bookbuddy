import { Goal } from '../entities/goal';

export class GoalProgress {
  private goal: Goal;

  constructor(goal: Goal) {
    this.goal = goal;
  }

  getProgressPercentage(): number {
    if (this.goal.targetBooks === 0) return 0;
    const percentage = (this.goal.currentBooks / this.goal.targetBooks) * 100;
    return Math.min(100, Math.round(percentage));
  }

  isCompleted(): boolean {
    return this.goal.currentBooks >= this.goal.targetBooks;
  }

  isOverdue(): boolean {
    const now = new Date();
    return now > this.goal.endDate && !this.goal.completed;
  }

  getDaysRemaining(): number {
    const now = new Date();
    const timeRemaining = this.goal.endDate.getTime() - now.getTime();
    const days = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    // Return 0 for overdue goals instead of negative numbers
    return Math.max(0, days);
  }

  getBooksRemaining(): number {
    return Math.max(0, this.goal.targetBooks - this.goal.currentBooks);
  }

  getStatus(): 'not-started' | 'in-progress' | 'completed' | 'overdue' {
    if (this.goal.completed) return 'completed';
    if (this.isOverdue()) return 'overdue';
    if (this.goal.currentBooks === 0) return 'not-started';
    return 'in-progress';
  }

  shouldAutoComplete(): boolean {
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
