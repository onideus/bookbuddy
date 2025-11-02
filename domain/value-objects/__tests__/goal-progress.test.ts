import { describe, it, expect, beforeEach } from 'vitest';
import { GoalProgress } from '../goal-progress';
import { Goal } from '../../entities/goal';

describe('GoalProgress', () => {
  let baseGoal: Goal;
  let goalProgress: GoalProgress;

  beforeEach(() => {
    const now = new Date('2024-06-15');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    baseGoal = {
      id: 'goal-1',
      userId: 'user-1',
      title: 'Read 24 books this year',
      description: 'Challenge myself to read more',
      targetBooks: 24,
      currentBooks: 10,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      completed: false,
    };

    goalProgress = new GoalProgress(baseGoal);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getProgressPercentage', () => {
    it('should calculate progress percentage correctly', () => {
      expect(goalProgress.getProgressPercentage()).toBe(42); // 10/24 * 100 = 41.66... -> 42
    });

    it('should return 0 when target is 0', () => {
      const zeroGoal = { ...baseGoal, targetBooks: 0 };
      const progress = new GoalProgress(zeroGoal);
      expect(progress.getProgressPercentage()).toBe(0);
    });

    it('should cap percentage at 100', () => {
      const exceededGoal = { ...baseGoal, currentBooks: 30, targetBooks: 24 };
      const progress = new GoalProgress(exceededGoal);
      expect(progress.getProgressPercentage()).toBe(100);
    });

    it('should round to nearest integer', () => {
      const goal = { ...baseGoal, currentBooks: 1, targetBooks: 3 };
      const progress = new GoalProgress(goal);
      expect(progress.getProgressPercentage()).toBe(33); // 1/3 * 100 = 33.33... -> 33
    });
  });

  describe('isCompleted', () => {
    it('should return true when current equals target', () => {
      const goal = { ...baseGoal, currentBooks: 24, targetBooks: 24 };
      const progress = new GoalProgress(goal);
      expect(progress.isCompleted()).toBe(true);
    });

    it('should return true when current exceeds target', () => {
      const goal = { ...baseGoal, currentBooks: 25, targetBooks: 24 };
      const progress = new GoalProgress(goal);
      expect(progress.isCompleted()).toBe(true);
    });

    it('should return false when current is less than target', () => {
      expect(goalProgress.isCompleted()).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return false when before end date', () => {
      expect(goalProgress.isOverdue()).toBe(false);
    });

    it('should return true when after end date and not completed', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      expect(goalProgress.isOverdue()).toBe(true);
    });

    it('should return false when after end date but completed', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      const completedGoal = { ...baseGoal, completed: true };
      const progress = new GoalProgress(completedGoal);
      expect(progress.isOverdue()).toBe(false);
    });

    it('should handle dates around goal end date', () => {
      // Test clearly before the end date
      vi.setSystemTime(new Date('2024-12-15T12:00:00'));
      let progress = new GoalProgress(baseGoal);
      expect(progress.isOverdue()).toBe(false);

      // Test clearly after the end date
      vi.setSystemTime(new Date('2025-01-15T12:00:00'));
      progress = new GoalProgress(baseGoal);
      expect(progress.isOverdue()).toBe(true);
    });
  });

  describe('getDaysRemaining', () => {
    it('should calculate positive days when before end date', () => {
      // From June 15 to Dec 31 = ~199 days
      expect(goalProgress.getDaysRemaining()).toBe(199);
    });

    it('should return negative days when after end date', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      expect(goalProgress.getDaysRemaining()).toBe(-15);
    });

    it('should return 0 or 1 on the end date', () => {
      vi.setSystemTime(new Date('2024-12-31T12:00:00'));
      const days = goalProgress.getDaysRemaining();
      // Could be 0 or 1 depending on how Math.ceil handles the calculation
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(1);
    });

    it('should round up partial days', () => {
      vi.setSystemTime(new Date('2024-12-30T18:00:00')); // Half day before end
      expect(goalProgress.getDaysRemaining()).toBe(1);
    });
  });

  describe('getBooksRemaining', () => {
    it('should calculate remaining books correctly', () => {
      expect(goalProgress.getBooksRemaining()).toBe(14); // 24 - 10
    });

    it('should return 0 when goal is exceeded', () => {
      const goal = { ...baseGoal, currentBooks: 30, targetBooks: 24 };
      const progress = new GoalProgress(goal);
      expect(progress.getBooksRemaining()).toBe(0);
    });

    it('should return 0 when goal is completed', () => {
      const goal = { ...baseGoal, currentBooks: 24, targetBooks: 24 };
      const progress = new GoalProgress(goal);
      expect(progress.getBooksRemaining()).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return "completed" when goal is marked as completed', () => {
      const goal = { ...baseGoal, completed: true };
      const progress = new GoalProgress(goal);
      expect(progress.getStatus()).toBe('completed');
    });

    it('should return "overdue" when past end date and not completed', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      expect(goalProgress.getStatus()).toBe('overdue');
    });

    it('should return "not-started" when current books is 0', () => {
      const goal = { ...baseGoal, currentBooks: 0 };
      const progress = new GoalProgress(goal);
      expect(progress.getStatus()).toBe('not-started');
    });

    it('should return "in-progress" when actively working on goal', () => {
      expect(goalProgress.getStatus()).toBe('in-progress');
    });

    it('should prioritize completed status over overdue', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      const goal = { ...baseGoal, completed: true };
      const progress = new GoalProgress(goal);
      expect(progress.getStatus()).toBe('completed');
    });
  });

  describe('shouldAutoComplete', () => {
    it('should return true when target reached but not marked complete', () => {
      const goal = { ...baseGoal, currentBooks: 24, targetBooks: 24, completed: false };
      const progress = new GoalProgress(goal);
      expect(progress.shouldAutoComplete()).toBe(true);
    });

    it('should return false when already marked complete', () => {
      const goal = { ...baseGoal, currentBooks: 24, targetBooks: 24, completed: true };
      const progress = new GoalProgress(goal);
      expect(progress.shouldAutoComplete()).toBe(false);
    });

    it('should return false when target not reached', () => {
      expect(goalProgress.shouldAutoComplete()).toBe(false);
    });

    it('should return true when exceeded target but not marked complete', () => {
      const goal = { ...baseGoal, currentBooks: 30, targetBooks: 24, completed: false };
      const progress = new GoalProgress(goal);
      expect(progress.shouldAutoComplete()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return all calculated values', () => {
      const json = goalProgress.toJSON();

      expect(json).toEqual({
        percentage: 42,
        isCompleted: false,
        isOverdue: false,
        daysRemaining: 199,
        booksRemaining: 14,
        status: 'in-progress',
      });
    });

    it('should handle completed goal', () => {
      const goal = { ...baseGoal, currentBooks: 24, targetBooks: 24, completed: true };
      const progress = new GoalProgress(goal);
      const json = progress.toJSON();

      expect(json.percentage).toBe(100);
      expect(json.isCompleted).toBe(true);
      expect(json.status).toBe('completed');
      expect(json.booksRemaining).toBe(0);
    });

    it('should handle overdue goal', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      const json = goalProgress.toJSON();

      expect(json.isOverdue).toBe(true);
      expect(json.status).toBe('overdue');
      expect(json.daysRemaining).toBe(-15);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle goals with same start and end date', () => {
      const goal = {
        ...baseGoal,
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-15'),
      };
      const progress = new GoalProgress(goal);
      expect(progress.getDaysRemaining()).toBe(0);
    });

    it('should handle negative current books gracefully', () => {
      const goal = { ...baseGoal, currentBooks: -5 };
      const progress = new GoalProgress(goal);
      // Progress will be negative percentage, rounded
      expect(progress.getProgressPercentage()).toBeLessThanOrEqual(0);
      // Books remaining: 24 - (-5) = 29
      expect(progress.getBooksRemaining()).toBe(29);
    });

    it('should handle very large numbers', () => {
      const goal = { ...baseGoal, currentBooks: 1000000, targetBooks: 2000000 };
      const progress = new GoalProgress(goal);
      expect(progress.getProgressPercentage()).toBe(50);
      expect(progress.getBooksRemaining()).toBe(1000000);
    });
  });
});