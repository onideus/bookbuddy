import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoalService } from '../goal-service';
import { IGoalRepository } from '@/domain/interfaces/goal-repository';
import { IBookRepository } from '@/domain/interfaces/book-repository';
import { Goal } from '@/domain/entities/goal';
import { Book } from '@/domain/entities/book';
import { NotFoundError, UnauthorizedError } from '@/domain/errors/domain-errors';
import {
  createMockGoalRepository,
  createMockBookRepository,
  setupGoalRepositoryMocks,
  setupBookRepositoryMocks,
} from '@/tests/mocks/repositories';

describe('GoalService', () => {
  let goalService: GoalService;
  let mockGoalRepository: IGoalRepository;
  let mockBookRepository: IBookRepository;
  let testGoals: Goal[];
  let testBooks: Book[];
  const userId = 'user-123';
  const otherUserId = 'user-456';

  beforeEach(() => {
    mockGoalRepository = createMockGoalRepository();
    mockBookRepository = createMockBookRepository();
    goalService = new GoalService(mockGoalRepository, mockBookRepository);

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    testGoals = [
      {
        id: 'goal-1',
        userId,
        title: 'Read 24 books in 2024',
        description: 'Annual reading challenge',
        targetBooks: 24,
        currentBooks: 10,
        startDate,
        endDate,
        completed: false,
      },
      {
        id: 'goal-2',
        userId,
        title: 'Completed Goal',
        description: 'Already completed',
        targetBooks: 12,
        currentBooks: 12,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        completed: true,
      },
    ];

    testBooks = [
      {
        id: 'book-1',
        userId,
        googleBooksId: 'google-1',
        title: 'Book 1',
        authors: ['Author 1'],
        status: 'read',
        pageCount: 300,
        currentPage: 300,
        addedAt: new Date('2024-02-01'),
        finishedAt: new Date('2024-03-01'), // Within goal period
      },
      {
        id: 'book-2',
        userId,
        googleBooksId: 'google-2',
        title: 'Book 2',
        authors: ['Author 2'],
        status: 'read',
        pageCount: 250,
        currentPage: 250,
        addedAt: new Date('2024-03-01'),
        finishedAt: new Date('2024-04-01'), // Within goal period
      },
      {
        id: 'book-3',
        userId,
        googleBooksId: 'google-3',
        title: 'Book 3',
        authors: ['Author 3'],
        status: 'read',
        pageCount: 200,
        currentPage: 200,
        addedAt: new Date('2023-11-01'),
        finishedAt: new Date('2023-12-15'), // Outside goal period
      },
      {
        id: 'book-4',
        userId,
        googleBooksId: 'google-4',
        title: 'Book 4',
        authors: ['Author 4'],
        status: 'reading',
        pageCount: 350,
        currentPage: 150,
        addedAt: new Date('2024-05-01'),
      },
    ];

    setupGoalRepositoryMocks(mockGoalRepository, testGoals);
    setupBookRepositoryMocks(mockBookRepository, testBooks);
  });

  describe('syncGoalProgress', () => {
    it('should sync progress with books completed in goal period', async () => {
      const goal = testGoals[0];
      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(testBooks);

      const result = await goalService.syncGoalProgress(goal.id, userId);

      // Should count 2 books finished within the period (book-1 and book-2)
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: 2,
        })
      );
      expect(result.currentBooks).toBe(2);
    });

    it('should auto-complete goal when target reached', async () => {
      const goal = testGoals[0];
      const completedBooks: Book[] = Array.from({ length: 24 }, (_, i) => ({
        id: `book-${i}`,
        userId,
        googleBooksId: `google-${i}`,
        title: `Book ${i}`,
        authors: ['Author'],
        status: 'read',
        pageCount: 300,
        currentPage: 300,
        addedAt: new Date('2024-01-01'),
        finishedAt: new Date(`2024-${String(i % 12 + 1).padStart(2, '0')}-15`),
      }));

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(completedBooks);

      const result = await goalService.syncGoalProgress(goal.id, userId);

      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: 24,
          completed: true,
        })
      );
      expect(result.completed).toBe(true);
    });

    it('should not count books outside goal period', async () => {
      const goal = testGoals[0];

      const result = await goalService.syncGoalProgress(goal.id, userId);

      // book-3 is outside the period, so should only count book-1 and book-2
      expect(result.currentBooks).toBe(2);
    });

    it('should not count books that are not finished', async () => {
      const goal = testGoals[0];

      const result = await goalService.syncGoalProgress(goal.id, userId);

      // book-4 is still reading, should not be counted
      expect(result.currentBooks).not.toBeGreaterThan(2);
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      vi.mocked(mockGoalRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        goalService.syncGoalProgress('non-existent', userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for unauthorized user', async () => {
      const goal = testGoals[0];

      await expect(
        goalService.syncGoalProgress(goal.id, otherUserId)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should handle goals with no books completed', async () => {
      const goal = testGoals[0];
      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce([
        testBooks[3], // Only reading book
      ]);

      const result = await goalService.syncGoalProgress(goal.id, userId);

      expect(result.currentBooks).toBe(0);
      expect(result.completed).toBe(false);
    });
  });

  describe('getGoalWithProgress', () => {
    it('should return goal with progress data', async () => {
      const goal = testGoals[0];

      const result = await goalService.getGoalWithProgress(goal.id, userId);

      expect(result.goal).toEqual(goal);
      expect(result.progress).toHaveProperty('percentage');
      expect(result.progress).toHaveProperty('isCompleted');
      expect(result.progress).toHaveProperty('isOverdue');
      expect(result.progress).toHaveProperty('daysRemaining');
      expect(result.progress).toHaveProperty('booksRemaining');
      expect(result.progress).toHaveProperty('status');
    });

    it('should calculate correct progress percentage', async () => {
      const goal = testGoals[0]; // 10 out of 24 books

      const result = await goalService.getGoalWithProgress(goal.id, userId);

      expect(result.progress.percentage).toBe(42); // 10/24 * 100 = 41.66... -> 42
      expect(result.progress.booksRemaining).toBe(14);
      expect(result.progress.isCompleted).toBe(false);
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      vi.mocked(mockGoalRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        goalService.getGoalWithProgress('non-existent', userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for unauthorized user', async () => {
      const goal = testGoals[0];

      await expect(
        goalService.getGoalWithProgress(goal.id, otherUserId)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getAllGoalsWithProgress', () => {
    it('should return all goals with progress', async () => {
      const result = await goalService.getAllGoalsWithProgress(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('goal');
      expect(result[0]).toHaveProperty('progress');
      expect(result[1]).toHaveProperty('goal');
      expect(result[1]).toHaveProperty('progress');
    });

    it('should calculate progress for each goal correctly', async () => {
      const result = await goalService.getAllGoalsWithProgress(userId);

      // First goal: 10/24 = 42%
      expect(result[0].progress.percentage).toBe(42);
      expect(result[0].progress.isCompleted).toBe(false);

      // Second goal: 12/12 = 100%
      expect(result[1].progress.percentage).toBe(100);
      expect(result[1].progress.isCompleted).toBe(true);
    });

    it('should return empty array for user with no goals', async () => {
      vi.mocked(mockGoalRepository.findByUserId).mockResolvedValueOnce([]);

      const result = await goalService.getAllGoalsWithProgress(userId);

      expect(result).toEqual([]);
    });
  });

  describe('updateGoalProgress', () => {
    it('should update currentBooks successfully', async () => {
      const goal = testGoals[0];
      const newProgress = 15;

      const result = await goalService.updateGoalProgress(goal.id, userId, newProgress);

      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: newProgress,
        })
      );
      expect(result.currentBooks).toBe(newProgress);
    });

    it('should auto-complete when reaching target', async () => {
      const goal = testGoals[0];
      const targetProgress = 24;

      const result = await goalService.updateGoalProgress(goal.id, userId, targetProgress);

      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: targetProgress,
          completed: true,
        })
      );
      expect(result.completed).toBe(true);
    });

    it('should auto-complete when exceeding target', async () => {
      const goal = testGoals[0];
      const exceedingProgress = 30;

      const result = await goalService.updateGoalProgress(goal.id, userId, exceedingProgress);

      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: exceedingProgress,
          completed: true,
        })
      );
      expect(result.completed).toBe(true);
    });

    it('should not auto-complete if already completed', async () => {
      const goal = testGoals[1]; // Already completed
      const newProgress = 15;

      await goalService.updateGoalProgress(goal.id, userId, newProgress);

      // Should not set completed again
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({
          currentBooks: newProgress,
        })
      );
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      vi.mocked(mockGoalRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        goalService.updateGoalProgress('non-existent', userId, 10)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for unauthorized user', async () => {
      const goal = testGoals[0];

      await expect(
        goalService.updateGoalProgress(goal.id, otherUserId, 10)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getGoalStatistics', () => {
    it('should calculate statistics correctly', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));

      const stats = await goalService.getGoalStatistics(userId);

      expect(stats).toEqual({
        total: 2,
        completed: 1,
        inProgress: 1,
        notStarted: 0,
        overdue: 0,
        totalBooksTarget: 36, // 24 + 12
        totalBooksRead: 22, // 10 + 12
      });

      vi.useRealTimers();
    });

    it('should handle user with no goals', async () => {
      vi.mocked(mockGoalRepository.findByUserId).mockResolvedValueOnce([]);

      const stats = await goalService.getGoalStatistics(userId);

      expect(stats).toEqual({
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        overdue: 0,
        totalBooksTarget: 0,
        totalBooksRead: 0,
      });
    });

    it('should count overdue goals correctly', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15')); // After goal end date

      const overdueGoal: Goal = {
        id: 'overdue-goal',
        userId,
        title: 'Overdue',
        targetBooks: 12,
        currentBooks: 5,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: false,
      };

      vi.mocked(mockGoalRepository.findByUserId).mockResolvedValueOnce([overdueGoal]);

      const stats = await goalService.getGoalStatistics(userId);

      expect(stats.overdue).toBe(1);
      expect(stats.completed).toBe(0);

      vi.useRealTimers();
    });

    it('should count not-started goals correctly', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));

      const notStartedGoal: Goal = {
        id: 'not-started',
        userId,
        title: 'Not Started',
        targetBooks: 12,
        currentBooks: 0,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: false,
      };

      vi.mocked(mockGoalRepository.findByUserId).mockResolvedValueOnce([notStartedGoal]);

      const stats = await goalService.getGoalStatistics(userId);

      expect(stats.notStarted).toBe(1);

      vi.useRealTimers();
    });

    it('should handle mixed goal statuses', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));

      const mixedGoals: Goal[] = [
        {
          id: 'completed',
          userId,
          title: 'Completed',
          targetBooks: 10,
          currentBooks: 10,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          completed: true,
        },
        {
          id: 'in-progress',
          userId,
          title: 'In Progress',
          targetBooks: 20,
          currentBooks: 10,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          completed: false,
        },
        {
          id: 'not-started',
          userId,
          title: 'Not Started',
          targetBooks: 15,
          currentBooks: 0,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          completed: false,
        },
        {
          id: 'overdue',
          userId,
          title: 'Overdue',
          targetBooks: 12,
          currentBooks: 5,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          completed: false,
        },
      ];

      vi.mocked(mockGoalRepository.findByUserId).mockResolvedValueOnce(mixedGoals);

      const stats = await goalService.getGoalStatistics(userId);

      expect(stats).toEqual({
        total: 4,
        completed: 1,
        inProgress: 1,
        notStarted: 1,
        overdue: 1,
        totalBooksTarget: 57, // 10 + 20 + 15 + 12
        totalBooksRead: 25, // 10 + 10 + 0 + 5
      });

      vi.useRealTimers();
    });
  });
});