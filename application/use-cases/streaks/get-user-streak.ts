import { IReadingActivityRepository } from '../../../domain/interfaces/reading-activity-repository';
import { ReadingStreak, StreakStats } from '../../../domain/value-objects/reading-streak';
import { ValidationError } from '../../../domain/errors/domain-errors';

export interface GetUserStreakInput {
  userId: string;
}

export interface GetUserStreakOutput extends StreakStats {
  isAtRisk: boolean;
  message: string;
}

export class GetUserStreakUseCase {
  constructor(private readingActivityRepository: IReadingActivityRepository) {}

  async execute(input: GetUserStreakInput): Promise<GetUserStreakOutput> {
    if (!input.userId) {
      throw new ValidationError('User ID is required');
    }

    // Fetch all reading activities for the user
    // For better performance with large datasets, could limit to last N days
    const activities = await this.readingActivityRepository.findByUserId(input.userId);

    const streak = new ReadingStreak(activities);
    return streak.toJSON();
  }
}
