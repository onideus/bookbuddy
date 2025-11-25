import { ReadingActivity } from '../entities/reading-activity';

export interface IReadingActivityRepository {
  /**
   * Record or update reading activity for a specific date
   * If activity exists for that date, it will be updated (upsert)
   */
  recordActivity(activity: Omit<ReadingActivity, 'id' | 'createdAt'>): Promise<ReadingActivity>;

  /**
   * Get all reading activities for a user
   */
  findByUserId(userId: string): Promise<ReadingActivity[]>;

  /**
   * Get reading activities for a user within a date range
   */
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReadingActivity[]>;

  /**
   * Get reading activity for a specific date
   */
  findByUserIdAndDate(userId: string, date: Date): Promise<ReadingActivity | null>;

  /**
   * Delete a reading activity
   */
  delete(id: string): Promise<boolean>;
}
