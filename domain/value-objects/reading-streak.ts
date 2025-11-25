import { ReadingActivity } from '../entities/reading-activity';

/**
 * Reading Streak Value Object
 *
 * Calculates and represents a user's reading streak based on their activity history.
 * A streak is maintained when a user has reading activity on consecutive days.
 */

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  lastActivityDate: Date | null;
  isActiveToday: boolean;
}

export class ReadingStreak {
  private activities: ReadingActivity[];
  private today: Date;

  constructor(activities: ReadingActivity[], today: Date = new Date()) {
    // Sort activities by date descending (most recent first)
    this.activities = [...activities].sort(
      (a, b) => b.activityDate.getTime() - a.activityDate.getTime()
    );
    this.today = this.normalizeDate(today);
  }

  /**
   * Normalize a date to midnight UTC for consistent comparison
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Check if two dates are consecutive days
   */
  private areConsecutiveDays(date1: Date, date2: Date): boolean {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);
    const diffMs = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays === 1;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);
    return d1.getTime() === d2.getTime();
  }

  /**
   * Calculate the current streak (consecutive days ending today or yesterday)
   */
  getCurrentStreak(): number {
    if (this.activities.length === 0) return 0;

    const mostRecentActivity = this.activities[0];
    const mostRecentDate = this.normalizeDate(mostRecentActivity.activityDate);

    // Check if the streak is still active (activity today or yesterday)
    const isToday = this.isSameDay(mostRecentDate, this.today);
    const yesterday = new Date(this.today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = this.isSameDay(mostRecentDate, yesterday);

    if (!isToday && !isYesterday) {
      return 0; // Streak is broken
    }

    let streak = 1;
    let previousDate = mostRecentDate;

    for (let i = 1; i < this.activities.length; i++) {
      const currentDate = this.normalizeDate(this.activities[i].activityDate);

      // Skip duplicate days
      if (this.isSameDay(currentDate, previousDate)) {
        continue;
      }

      if (this.areConsecutiveDays(previousDate, currentDate)) {
        streak++;
        previousDate = currentDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate the longest streak ever achieved
   */
  getLongestStreak(): number {
    if (this.activities.length === 0) return 0;

    // Get unique dates, sorted ascending
    const uniqueDates = Array.from(
      new Set(this.activities.map((a) => this.normalizeDate(a.activityDate).getTime()))
    )
      .sort((a, b) => a - b)
      .map((t) => new Date(t));

    if (uniqueDates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      if (this.areConsecutiveDays(uniqueDates[i - 1], uniqueDates[i])) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }

  /**
   * Get the total number of unique days with reading activity
   */
  getTotalDaysRead(): number {
    const uniqueDates = new Set(
      this.activities.map((a) => this.normalizeDate(a.activityDate).getTime())
    );
    return uniqueDates.size;
  }

  /**
   * Check if user has logged activity today
   */
  isActiveToday(): boolean {
    if (this.activities.length === 0) return false;
    return this.isSameDay(this.activities[0].activityDate, this.today);
  }

  /**
   * Get the most recent activity date
   */
  getLastActivityDate(): Date | null {
    if (this.activities.length === 0) return null;
    return this.normalizeDate(this.activities[0].activityDate);
  }

  /**
   * Get comprehensive streak statistics
   */
  getStats(): StreakStats {
    return {
      currentStreak: this.getCurrentStreak(),
      longestStreak: this.getLongestStreak(),
      totalDaysRead: this.getTotalDaysRead(),
      lastActivityDate: this.getLastActivityDate(),
      isActiveToday: this.isActiveToday(),
    };
  }

  /**
   * Check if the streak is at risk (not active today but was yesterday)
   */
  isStreakAtRisk(): boolean {
    if (this.activities.length === 0) return false;

    const mostRecentDate = this.normalizeDate(this.activities[0].activityDate);
    const yesterday = new Date(this.today);
    yesterday.setDate(yesterday.getDate() - 1);

    return this.isSameDay(mostRecentDate, yesterday);
  }

  /**
   * Get motivational message based on streak status
   */
  getMotivationalMessage(): string {
    const currentStreak = this.getCurrentStreak();
    const isActive = this.isActiveToday();
    const atRisk = this.isStreakAtRisk();

    if (currentStreak === 0) {
      return 'Start your reading streak today!';
    }

    if (atRisk && !isActive) {
      return `Don't break your ${currentStreak}-day streak! Read today to keep it going.`;
    }

    if (currentStreak >= 30) {
      return `Amazing! ${currentStreak} days and counting. You're a reading champion!`;
    }

    if (currentStreak >= 7) {
      return `Great job! ${currentStreak}-day streak. Keep the momentum going!`;
    }

    if (currentStreak >= 3) {
      return `Nice! ${currentStreak} days in a row. You're building a habit!`;
    }

    return `${currentStreak}-day streak. Every day counts!`;
  }

  toJSON(): StreakStats & { isAtRisk: boolean; message: string } {
    return {
      ...this.getStats(),
      isAtRisk: this.isStreakAtRisk(),
      message: this.getMotivationalMessage(),
    };
  }
}
