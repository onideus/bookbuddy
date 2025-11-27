import { Goal } from '../entities/goal';

export interface GoalPaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface PaginatedGoals {
  goals: Goal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface IGoalRepository {
  create(goal: Goal): Promise<Goal>;
  findByUserId(userId: string): Promise<Goal[]>;
  findByUserIdPaginated(userId: string, options: GoalPaginationOptions): Promise<PaginatedGoals>;
  findById(id: string): Promise<Goal | undefined>;
  update(id: string, updates: Partial<Goal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
  countByUserId(userId: string): Promise<number>;
}
