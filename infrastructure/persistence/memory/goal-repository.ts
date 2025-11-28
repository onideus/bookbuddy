import { IGoalRepository, GoalPaginationOptions, PaginatedGoals } from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';
import { memoryDatabase } from './database';

export class MemoryGoalRepository implements IGoalRepository {
  async create(goal: Goal): Promise<Goal> {
    memoryDatabase.goals.set(goal.id, goal);
    return goal;
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    return Array.from(memoryDatabase.goals.values()).filter(
      g => g.userId === userId
    );
  }

  async findByUserIdPaginated(userId: string, options: GoalPaginationOptions): Promise<PaginatedGoals> {
    const allGoals = await this.findByUserId(userId);
    const limit = options.limit ?? 20;
    
    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = allGoals.findIndex(g => g.id === options.cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }
    
    const paginatedGoals = allGoals.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedGoals.length > limit;
    const resultGoals = hasMore ? paginatedGoals.slice(0, limit) : paginatedGoals;
    
    return {
      goals: resultGoals,
      nextCursor: hasMore ? resultGoals[resultGoals.length - 1]?.id ?? null : null,
      hasMore,
      totalCount: allGoals.length,
    };
  }

  async findById(id: string): Promise<Goal | undefined> {
    return memoryDatabase.goals.get(id);
  }

  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const goal = memoryDatabase.goals.get(id);
    if (!goal) return null;

    const updated = { ...goal, ...updates };
    memoryDatabase.goals.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return memoryDatabase.goals.delete(id);
  }

  async countByUserId(userId: string): Promise<number> {
    const userGoals = await this.findByUserId(userId);
    return userGoals.length;
  }
}
