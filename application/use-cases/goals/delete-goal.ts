import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';

export interface DeleteGoalInput {
  goalId: string;
  userId: string;
}

export class DeleteGoalUseCase {
  constructor(private goalRepository: IGoalRepository) {}

  async execute(input: DeleteGoalInput): Promise<void> {
    const goal = await this.goalRepository.findById(input.goalId);

    if (!goal) {
      throw new NotFoundError('Goal', input.goalId);
    }

    if (goal.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this goal');
    }

    await this.goalRepository.delete(input.goalId);
  }
}
