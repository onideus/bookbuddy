'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Container } from '@/lib/di/container';
import { GetUserGoalsUseCase } from '@/application/use-cases/goals/get-user-goals';
import { CreateGoalUseCase } from '@/application/use-cases/goals/create-goal';
import { UpdateGoalUseCase } from '@/application/use-cases/goals/update-goal';
import { DeleteGoalUseCase } from '@/application/use-cases/goals/delete-goal';
import { Goal } from '@/domain/entities/goal';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '@/domain/errors/domain-errors';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getGoalsAction(): Promise<ActionResult<Goal[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new GetUserGoalsUseCase(goalRepository);
    const goals = await useCase.execute({ userId: session.user.id });

    return { success: true, data: goals };
  } catch (error) {
    console.error('Error fetching goals:', error);
    return { success: false, error: 'Failed to fetch goals' };
  }
}

export async function createGoalAction(goalData: {
  title: string;
  description?: string;
  targetBooks: number;
  startDate: Date;
  endDate: Date;
}): Promise<ActionResult<Goal>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new CreateGoalUseCase(goalRepository);

    const goal = await useCase.execute({
      userId: session.user.id,
      ...goalData,
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return { success: true, data: goal };
  } catch (error) {
    console.error('Error creating goal:', error);

    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to create goal' };
  }
}

export async function updateGoalAction(
  goalId: string,
  updates: Partial<Goal>
): Promise<ActionResult<Goal>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new UpdateGoalUseCase(goalRepository);

    const goal = await useCase.execute({
      goalId,
      userId: session.user.id,
      updates,
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return { success: true, data: goal };
  } catch (error) {
    console.error('Error updating goal:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Goal not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this goal' };
    }

    return { success: false, error: 'Failed to update goal' };
  }
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new DeleteGoalUseCase(goalRepository);

    await useCase.execute({
      goalId,
      userId: session.user.id,
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting goal:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Goal not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this goal' };
    }

    return { success: false, error: 'Failed to delete goal' };
  }
}

export async function syncGoalProgressAction(
  goalId: string
): Promise<ActionResult<Goal>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalService = Container.getGoalService();
    const goal = await goalService.syncGoalProgress(goalId, session.user.id);

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return { success: true, data: goal };
  } catch (error) {
    console.error('Error syncing goal progress:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Goal not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this goal' };
    }

    return { success: false, error: 'Failed to sync goal progress' };
  }
}

export async function getGoalsWithProgressAction(): Promise<ActionResult<Array<{
  goal: Goal;
  progress: {
    percentage: number;
    isCompleted: boolean;
    isOverdue: boolean;
    daysRemaining: number;
    booksRemaining: number;
    status: string;
  };
}>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalService = Container.getGoalService();
    const goalsWithProgress = await goalService.getAllGoalsWithProgress(
      session.user.id
    );

    return { success: true, data: goalsWithProgress };
  } catch (error) {
    console.error('Error fetching goals with progress:', error);
    return { success: false, error: 'Failed to fetch goals' };
  }
}

export async function getGoalStatisticsAction(): Promise<ActionResult<{
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  totalBooksTarget: number;
  totalBooksRead: number;
}>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const goalService = Container.getGoalService();
    const stats = await goalService.getGoalStatistics(session.user.id);

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching goal statistics:', error);
    return { success: false, error: 'Failed to fetch goal statistics' };
  }
}
