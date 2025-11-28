import { ReadingSession } from '../../../domain/entities/reading-session';
import { ReadingSessionRepository } from '../../../domain/interfaces/reading-session-repository';
import { IReadingActivityRepository } from '../../../domain/interfaces/reading-activity-repository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../domain/errors/domain-errors';

export interface EndSessionInput {
  sessionId: string;
  userId: string;
  pagesRead?: number;
  notes?: string;
}

/**
 * Use case for ending a reading session
 *
 * Business rules:
 * - Session must exist and belong to the user
 * - Session must not already be ended
 * - Duration is calculated from start time to now
 * - Optionally record pages read and notes
 * - Aggregate session minutes into daily ReadingActivity
 */
export class EndSessionUseCase {
  constructor(
    private sessionRepository: ReadingSessionRepository,
    private activityRepository: IReadingActivityRepository
  ) {}

  async execute(input: EndSessionInput): Promise<ReadingSession> {
    // Find the session
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('ReadingSession', input.sessionId);
    }

    // Verify ownership
    if (session.userId !== input.userId) {
      throw new ForbiddenError('You do not have permission to end this session');
    }

    // Check if already ended
    if (session.endTime) {
      throw new ValidationError('This session has already ended');
    }

    // Calculate duration
    const endTime = new Date();
    const durationMs = endTime.getTime() - session.startTime.getTime();
    const durationMinutes = Math.round(durationMs / 1000 / 60);

    // Update the session
    const updatedSession = await this.sessionRepository.update(input.sessionId, {
      endTime,
      durationMinutes,
      pagesRead: input.pagesRead,
      notes: input.notes,
    });

    if (!updatedSession) {
      throw new NotFoundError('ReadingSession', input.sessionId);
    }

    // Update daily reading activity (aggregate for streak tracking)
    await this.updateDailyActivity(input.userId, durationMinutes, input.pagesRead, session.bookId);

    return updatedSession;
  }

  /**
   * Updates the daily reading activity aggregate
   * This is used for streak tracking
   */
  private async updateDailyActivity(
    userId: string,
    minutesRead: number,
    pagesRead?: number,
    bookId?: string
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find existing activity for today
    const existingActivity = await this.activityRepository.findByUserIdAndDate(userId, today);

    if (existingActivity) {
      // Record activity will upsert, so we add to existing values
      await this.activityRepository.recordActivity({
        userId,
        bookId: existingActivity.bookId ?? bookId,
        activityDate: today,
        minutesRead: existingActivity.minutesRead + minutesRead,
        pagesRead: existingActivity.pagesRead + (pagesRead || 0),
      });
    } else {
      // Create new activity
      await this.activityRepository.recordActivity({
        userId,
        bookId,
        activityDate: today,
        minutesRead,
        pagesRead: pagesRead || 0,
      });
    }
  }
}