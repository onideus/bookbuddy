import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';

export interface GetUserGoalsInput {
  userId: string;
}

export class GetUserGoalsUseCase {
  constructor(private goalRepository: IGoalRepository) {}

  async execute(input: GetUserGoalsInput): Promise<Goal[]> {
    return this.goalRepository.findByUserId(input.userId);
  }
}
