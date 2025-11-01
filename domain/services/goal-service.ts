import { IGoalRepository } from '../interfaces/goal-repository';
import { IBookRepository } from '../interfaces/book-repository';
import { Goal } from '../entities/goal';
import { GoalProgress } from '../value-objects/goal-progress';
import { NotFoundError, UnauthorizedError } from '../errors/domain-errors';

export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private bookRepository: IBookRepository
  ) {}

  async syncGoalProgress(goalId: string, userId: string): Promise<Goal> {
    const goal = await this.goalRepository.findById(goalId);

    if (!goal) {
      throw new NotFoundError('Goal', goalId);
    }

    if (goal.userId !== userId) {
      throw new UnauthorizedError('You do not own this goal');
    }

    // Count books read within goal timeframe
    const books = await this.bookRepository.findByUserId(userId);
    const booksReadInPeriod = books.filter(book => {
      if (book.status !== 'read' || !book.finishedAt) return false;

      const finishedDate = new Date(book.finishedAt);
      return finishedDate >= goal.startDate && finishedDate <= goal.endDate;
    });

    const currentBooks = booksReadInPeriod.length;
    const progress = new GoalProgress({ ...goal, currentBooks });

    const updates: Partial<Goal> = {
      currentBooks,
    };

    // Auto-complete if target reached
    if (progress.shouldAutoComplete()) {
      updates.completed = true;
    }

    const updated = await this.goalRepository.update(goalId, updates);

    if (!updated) {
      throw new NotFoundError('Goal', goalId);
    }

    return updated;
  }

  async getGoalWithProgress(goalId: string, userId: string) {
    const goal = await this.goalRepository.findById(goalId);

    if (!goal) {
      throw new NotFoundError('Goal', goalId);
    }

    if (goal.userId !== userId) {
      throw new UnauthorizedError('You do not own this goal');
    }

    const progress = new GoalProgress(goal);

    return {
      goal,
      progress: progress.toJSON(),
    };
  }

  async getAllGoalsWithProgress(userId: string) {
    const goals = await this.goalRepository.findByUserId(userId);

    return goals.map(goal => {
      const progress = new GoalProgress(goal);
      return {
        goal,
        progress: progress.toJSON(),
      };
    });
  }

  async updateGoalProgress(
    goalId: string,
    userId: string,
    currentBooks: number
  ): Promise<Goal> {
    const goal = await this.goalRepository.findById(goalId);

    if (!goal) {
      throw new NotFoundError('Goal', goalId);
    }

    if (goal.userId !== userId) {
      throw new UnauthorizedError('You do not own this goal');
    }

    const progress = new GoalProgress({ ...goal, currentBooks });

    const updates: Partial<Goal> = {
      currentBooks,
    };

    // Auto-complete if target reached
    if (progress.shouldAutoComplete()) {
      updates.completed = true;
    }

    const updated = await this.goalRepository.update(goalId, updates);

    if (!updated) {
      throw new NotFoundError('Goal', goalId);
    }

    return updated;
  }

  async getGoalStatistics(userId: string) {
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
      const progress = new GoalProgress(goal);
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
