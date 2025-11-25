import { describe, it, expect } from 'vitest';
import { ReadingStreak } from '../reading-streak';
import { ReadingActivity } from '../../entities/reading-activity';

function createActivity(daysAgo: number, today: Date = new Date()): ReadingActivity {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  date.setUTCHours(0, 0, 0, 0);

  return {
    id: `activity-${daysAgo}`,
    userId: 'user-1',
    activityDate: date,
    pagesRead: 10,
    minutesRead: 30,
    createdAt: new Date(),
  };
}

describe('ReadingStreak', () => {
  const today = new Date('2025-01-15T12:00:00Z');

  describe('getCurrentStreak', () => {
    it('should return 0 for no activities', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.getCurrentStreak()).toBe(0);
    });

    it('should return 1 for activity today only', () => {
      const activities = [createActivity(0, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(1);
    });

    it('should return 1 for activity yesterday only (streak still active)', () => {
      const activities = [createActivity(1, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(1);
    });

    it('should return 0 for activity 2 days ago (streak broken)', () => {
      const activities = [createActivity(2, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(0);
    });

    it('should count consecutive days correctly', () => {
      const activities = [
        createActivity(0, today),
        createActivity(1, today),
        createActivity(2, today),
        createActivity(3, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(4);
    });

    it('should stop counting at gap in streak', () => {
      const activities = [
        createActivity(0, today),
        createActivity(1, today),
        // Gap at day 2
        createActivity(3, today),
        createActivity(4, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(2);
    });

    it('should handle duplicate activities on same day', () => {
      const activities = [
        createActivity(0, today),
        createActivity(0, today), // Duplicate
        createActivity(1, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getCurrentStreak()).toBe(2);
    });
  });

  describe('getLongestStreak', () => {
    it('should return 0 for no activities', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.getLongestStreak()).toBe(0);
    });

    it('should return 1 for single activity', () => {
      const activities = [createActivity(10, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getLongestStreak()).toBe(1);
    });

    it('should find longest streak even if not current', () => {
      const activities = [
        createActivity(0, today), // Current: 1 day
        // Gap
        createActivity(5, today), // Past streak: 3 days
        createActivity(6, today),
        createActivity(7, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getLongestStreak()).toBe(3);
    });

    it('should return current streak if its the longest', () => {
      const activities = [
        createActivity(0, today),
        createActivity(1, today),
        createActivity(2, today),
        createActivity(3, today),
        createActivity(4, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getLongestStreak()).toBe(5);
    });
  });

  describe('getTotalDaysRead', () => {
    it('should return 0 for no activities', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.getTotalDaysRead()).toBe(0);
    });

    it('should count unique days only', () => {
      const activities = [
        createActivity(0, today),
        createActivity(0, today), // Duplicate
        createActivity(1, today),
        createActivity(5, today),
      ];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getTotalDaysRead()).toBe(3);
    });
  });

  describe('isActiveToday', () => {
    it('should return false for no activities', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.isActiveToday()).toBe(false);
    });

    it('should return true if activity exists today', () => {
      const activities = [createActivity(0, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.isActiveToday()).toBe(true);
    });

    it('should return false if most recent activity was yesterday', () => {
      const activities = [createActivity(1, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.isActiveToday()).toBe(false);
    });
  });

  describe('isStreakAtRisk', () => {
    it('should return false for no activities', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.isStreakAtRisk()).toBe(false);
    });

    it('should return false if active today', () => {
      const activities = [createActivity(0, today), createActivity(1, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.isStreakAtRisk()).toBe(false);
    });

    it('should return true if last activity was yesterday', () => {
      const activities = [createActivity(1, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.isStreakAtRisk()).toBe(true);
    });

    it('should return false if streak already broken', () => {
      const activities = [createActivity(3, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.isStreakAtRisk()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive stats', () => {
      const activities = [
        createActivity(0, today),
        createActivity(1, today),
        createActivity(2, today),
      ];
      const streak = new ReadingStreak(activities, today);
      const stats = streak.getStats();

      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
      expect(stats.totalDaysRead).toBe(3);
      expect(stats.isActiveToday).toBe(true);
      expect(stats.lastActivityDate).toEqual(createActivity(0, today).activityDate);
    });
  });

  describe('getMotivationalMessage', () => {
    it('should encourage starting a streak for no activity', () => {
      const streak = new ReadingStreak([], today);
      expect(streak.getMotivationalMessage()).toContain('Start');
    });

    it('should warn about streak at risk', () => {
      const activities = [createActivity(1, today), createActivity(2, today)];
      const streak = new ReadingStreak(activities, today);
      expect(streak.getMotivationalMessage()).toContain("Don't break");
    });

    it('should celebrate long streaks', () => {
      const activities = Array.from({ length: 30 }, (_, i) => createActivity(i, today));
      const streak = new ReadingStreak(activities, today);
      expect(streak.getMotivationalMessage()).toContain('champion');
    });

    it('should encourage week-long streaks', () => {
      const activities = Array.from({ length: 10 }, (_, i) => createActivity(i, today));
      const streak = new ReadingStreak(activities, today);
      expect(streak.getMotivationalMessage()).toContain('momentum');
    });
  });

  describe('toJSON', () => {
    it('should include all relevant data', () => {
      const activities = [createActivity(0, today)];
      const streak = new ReadingStreak(activities, today);
      const json = streak.toJSON();

      expect(json).toHaveProperty('currentStreak');
      expect(json).toHaveProperty('longestStreak');
      expect(json).toHaveProperty('totalDaysRead');
      expect(json).toHaveProperty('isActiveToday');
      expect(json).toHaveProperty('lastActivityDate');
      expect(json).toHaveProperty('isAtRisk');
      expect(json).toHaveProperty('message');
    });
  });
});
