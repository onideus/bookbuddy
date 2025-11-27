import {
  IGoalRepository,
  GoalPaginationOptions,
  PaginatedGoals,
} from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';
import { prisma } from './client';
import type { Goal as PrismaGoal } from '@prisma/client';
import { createLogger } from '../../logging';

const log = createLogger('GoalRepository');
const DEFAULT_PAGE_SIZE = 20;

export class PrismaGoalRepository implements IGoalRepository {
  async create(goal: Goal): Promise<Goal> {
    log.debug('Creating goal', { goalId: goal.id, userId: goal.userId, title: goal.title });
    const created = await prisma.goal.create({
      data: {
        id: goal.id,
        userId: goal.userId,
        title: goal.title,
        description: goal.description,
        targetBooks: goal.targetBooks,
        currentBooks: goal.currentBooks,
        startDate: goal.startDate,
        endDate: goal.endDate,
        completed: goal.completed,
      },
    });

    log.info('Goal created successfully', { goalId: created.id });
    return this.mapToGoal(created);
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    log.debug('Finding goals for user', { userId });
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    log.debug('Found goals', { userId, count: goals.length });
    return goals.map(this.mapToGoal);
  }

  async findByUserIdPaginated(
    userId: string,
    options: GoalPaginationOptions
  ): Promise<PaginatedGoals> {
    const limit = options.limit ?? DEFAULT_PAGE_SIZE;

    const totalCount = await prisma.goal.count({ where: { userId } });

    let goals;
    if (options.cursor) {
      goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: limit + 1,
        cursor: { id: options.cursor },
        skip: 1,
      });
    } else {
      goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: limit + 1,
      });
    }

    const hasMore = goals.length > limit;
    const resultGoals = hasMore ? goals.slice(0, limit) : goals;
    const nextCursor = hasMore ? resultGoals[resultGoals.length - 1]?.id ?? null : null;

    return {
      goals: resultGoals.map(this.mapToGoal),
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  async countByUserId(userId: string): Promise<number> {
    return prisma.goal.count({ where: { userId } });
  }

  async findById(id: string): Promise<Goal | undefined> {
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) return undefined;

    return this.mapToGoal(goal);
  }

  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      log.debug('Updating goal', { goalId: id, fields: Object.keys(updates) });
      const updated = await prisma.goal.update({
        where: { id },
        data: {
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.targetBooks !== undefined && { targetBooks: updates.targetBooks }),
          ...(updates.currentBooks !== undefined && { currentBooks: updates.currentBooks }),
          ...(updates.startDate !== undefined && { startDate: updates.startDate }),
          ...(updates.endDate !== undefined && { endDate: updates.endDate }),
          ...(updates.completed !== undefined && { completed: updates.completed }),
        },
      });

      log.info('Goal updated successfully', { goalId: updated.id });
      return this.mapToGoal(updated);
    } catch (error) {
      log.error('Failed to update goal', { goalId: id, error: (error as Error).message });
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      log.debug('Deleting goal', { goalId: id });
      await prisma.goal.delete({
        where: { id },
      });
      log.info('Goal deleted successfully', { goalId: id });
      return true;
    } catch (error) {
      log.error('Failed to delete goal', { goalId: id, error: (error as Error).message });
      return false;
    }
  }

  private mapToGoal(prismaGoal: PrismaGoal): Goal {
    return {
      id: prismaGoal.id,
      userId: prismaGoal.userId,
      title: prismaGoal.title,
      description: prismaGoal.description ?? undefined,
      targetBooks: prismaGoal.targetBooks,
      currentBooks: prismaGoal.currentBooks,
      startDate: prismaGoal.startDate,
      endDate: prismaGoal.endDate,
      completed: prismaGoal.completed,
    };
  }
}
