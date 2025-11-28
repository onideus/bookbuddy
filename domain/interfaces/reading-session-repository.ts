import {
  ReadingSession,
  SessionStatistics,
} from '../entities/reading-session';

/**
 * Repository interface for Reading Sessions
 *
 * Handles persistence operations for reading sessions.
 */
export interface ReadingSessionRepository {
  /**
   * Create a new reading session
   */
  create(session: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReadingSession>;

  /**
   * Find a session by ID
   */
  findById(id: string): Promise<ReadingSession | null>;

  /**
   * Find the active (in-progress) session for a user
   * A user can only have one active session at a time
   */
  findActiveByUserId(userId: string): Promise<ReadingSession | null>;

  /**
   * Find all sessions for a user
   */
  findByUserId(userId: string, options?: {
    bookId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ReadingSession[]>;

  /**
   * Update a session (typically to end it)
   */
  update(id: string, updates: Partial<Pick<ReadingSession, 'endTime' | 'durationMinutes' | 'pagesRead' | 'notes'>>): Promise<ReadingSession | null>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get statistics for a user's reading sessions
   */
  getStatistics(userId: string, startDate?: Date, endDate?: Date): Promise<SessionStatistics>;

  /**
   * Get today's total reading time for a user
   */
  getTodayTotalMinutes(userId: string): Promise<number>;

  /**
   * Get this week's total reading time for a user
   */
  getWeekTotalMinutes(userId: string): Promise<number>;
}

// Alias for consistency with other interfaces
export type IReadingSessionRepository = ReadingSessionRepository;