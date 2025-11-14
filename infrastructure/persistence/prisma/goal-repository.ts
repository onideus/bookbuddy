import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';
import { prisma } from './client';
import type { Goal as PrismaGoal } from '@prisma/client';

export class PrismaGoalRepository implements IGoalRepository {
  async create(goal: Goal): Promise<Goal> {
    console.log('[GoalRepository] Creating goal:', JSON.stringify(goal, null, 2));
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

    console.log('[GoalRepository] Successfully created goal:', created.id);
    return this.mapToGoal(created);
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    console.log('[GoalRepository] Finding goals for user:', userId);
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    console.log('[GoalRepository] Found', goals.length, 'goals for user:', userId);
    return goals.map(this.mapToGoal);
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
      console.log('[GoalRepository] Updating goal:', id, 'with updates:', JSON.stringify(updates, null, 2));
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

      console.log('[GoalRepository] Successfully updated goal:', updated.id);
      return this.mapToGoal(updated);
    } catch (error) {
      console.error('[GoalRepository] Error updating goal:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      console.log('[GoalRepository] Deleting goal:', id);
      await prisma.goal.delete({
        where: { id },
      });
      console.log('[GoalRepository] Successfully deleted goal:', id);
      return true;
    } catch (error) {
      console.error('[GoalRepository] Error deleting goal:', error);
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
