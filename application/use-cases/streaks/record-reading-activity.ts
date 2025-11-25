import { IReadingActivityRepository } from '../../../domain/interfaces/reading-activity-repository';
import { ReadingActivity } from '../../../domain/entities/reading-activity';
import { ValidationError } from '../../../domain/errors/domain-errors';

export interface RecordReadingActivityInput {
  userId: string;
  bookId?: string;
  pagesRead?: number;
  minutesRead?: number;
  date?: Date; // Defaults to today if not provided
}

export class RecordReadingActivityUseCase {
  constructor(private readingActivityRepository: IReadingActivityRepository) {}

  async execute(input: RecordReadingActivityInput): Promise<ReadingActivity> {
    if (!input.userId) {
      throw new ValidationError('User ID is required');
    }

    const pagesRead = input.pagesRead ?? 0;
    const minutesRead = input.minutesRead ?? 0;

    if (pagesRead < 0 || minutesRead < 0) {
      throw new ValidationError('Pages read and minutes read must be non-negative');
    }

    if (pagesRead === 0 && minutesRead === 0) {
      throw new ValidationError('At least pages read or minutes read must be provided');
    }

    const activityDate = input.date ?? new Date();

    return this.readingActivityRepository.recordActivity({
      userId: input.userId,
      bookId: input.bookId,
      activityDate,
      pagesRead,
      minutesRead,
    });
  }
}
