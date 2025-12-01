import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';
import { NotFoundError, OwnershipMismatchError } from '../../../domain/errors/domain-errors';

export interface UpdateGoalInput {
  goalId: string;
  userId: string;
  updates: Partial<Goal>;
}

export class UpdateGoalUseCase {
  constructor(private goalRepository: IGoalRepository) {}

  async execute(input: UpdateGoalInput): Promise<Goal> {
    const goal = await this.goalRepository.findById(input.goalId);

    if (!goal) {
      throw new NotFoundError('Goal', input.goalId);
    }

    if (goal.userId !== input.userId) {
      throw new OwnershipMismatchError();
    }

    const updated = await this.goalRepository.update(input.goalId, input.updates);

    if (!updated) {
      throw new NotFoundError('Goal', input.goalId);
    }

    return updated;
  }
}
