import { ReadingSession, SessionStatistics } from '../../../domain/entities/reading-session';
import { ReadingSessionRepository } from '../../../domain/interfaces/reading-session-repository';

export interface GetUserSessionsInput {
  userId: string;
  bookId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface GetUserSessionsOutput {
  sessions: ReadingSession[];
  activeSession: ReadingSession | null;
  statistics: SessionStatistics;
  todayMinutes: number;
  weekMinutes: number;
}

/**
 * Use case for retrieving user's reading sessions and statistics
 */
export class GetUserSessionsUseCase {
  constructor(private sessionRepository: ReadingSessionRepository) {}

  async execute(input: GetUserSessionsInput): Promise<GetUserSessionsOutput> {
    // Get sessions based on filters
    const sessions = await this.sessionRepository.findByUserId(input.userId, {
      bookId: input.bookId,
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit,
    });

    // Get active session (if any)
    const activeSession = await this.sessionRepository.findActiveByUserId(input.userId);

    // Get statistics
    const statistics = await this.sessionRepository.getStatistics(
      input.userId,
      input.startDate,
      input.endDate
    );

    // Get today's and week's totals
    const todayMinutes = await this.sessionRepository.getTodayTotalMinutes(input.userId);
    const weekMinutes = await this.sessionRepository.getWeekTotalMinutes(input.userId);

    return {
      sessions,
      activeSession,
      statistics,
      todayMinutes,
      weekMinutes,
    };
  }
}