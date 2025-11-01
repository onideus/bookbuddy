import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
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
}
