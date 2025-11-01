import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { Goal } from '../../../domain/entities/goal';
import { ValidationError } from '../../../domain/errors/domain-errors';
import { randomUUID } from 'crypto';

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  targetBooks: number;
  startDate: Date;
  endDate: Date;
}

export class CreateGoalUseCase {
  constructor(private goalRepository: IGoalRepository) {}

  async execute(input: CreateGoalInput): Promise<Goal> {
    // Validation
    if (input.targetBooks <= 0) {
      throw new ValidationError('Target books must be greater than 0');
    }

    if (input.endDate <= input.startDate) {
      throw new ValidationError('End date must be after start date');
    }

    const goal: Goal = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      description: input.description,
      targetBooks: input.targetBooks,
      currentBooks: 0,
      startDate: input.startDate,
      endDate: input.endDate,
      completed: false,
    };

    return this.goalRepository.create(goal);
  }
}
