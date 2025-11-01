import { Goal } from '../entities/goal';

export interface IGoalRepository {
  create(goal: Goal): Promise<Goal>;
  findByUserId(userId: string): Promise<Goal[]>;
  findById(id: string): Promise<Goal | undefined>;
  update(id: string, updates: Partial<Goal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
}
