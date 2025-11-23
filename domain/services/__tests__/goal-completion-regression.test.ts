import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoalService } from '../goal-service';
import { IGoalRepository } from '@/domain/interfaces/goal-repository';
import { IBookRepository } from '@/domain/interfaces/book-repository';
import { Goal } from '@/domain/entities/goal';
import {
  createMockGoalRepository,
  createMockBookRepository,
  setupGoalRepositoryMocks,
  setupBookRepositoryMocks,
} from '@/tests/mocks/repositories';

describe('GoalService - Completion Synchronization Bug', () => {
  let goalService: GoalService;
  let mockGoalRepository: IGoalRepository;
  let mockBookRepository: IBookRepository;
  const userId = 'user-123';

  beforeEach(() => {
    mockGoalRepository = createMockGoalRepository();
    mockBookRepository = createMockBookRepository();
    goalService = new GoalService(mockGoalRepository, mockBookRepository);
  });

  describe('Bidirectional completion toggle', () => {
    it('should un-complete goal when progress drops below target', async () => {
      // A completed goal with exactly the target books
      const completedGoal: Goal = {
        id: 'goal-1',
        userId,
        title: 'Read 20 books',
        targetBooks: 20,
        currentBooks: 20,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: true, // Currently completed
      };

      setupGoalRepositoryMocks(mockGoalRepository, [completedGoal]);

      // User manually decreases progress to 15 (below target)
      const result = await goalService.updateGoalProgress(completedGoal.id, userId, 15);

      // Should un-complete the goal
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        completedGoal.id,
        expect.objectContaining({
          currentBooks: 15,
          completed: false, // ← Should be set to false!
        })
      );
      expect(result.completed).toBe(false);
    });

    it('should un-complete goal when syncing finds fewer books', async () => {
      const completedGoal: Goal = {
        id: 'goal-1',
        userId,
        title: 'Read 10 books',
        targetBooks: 10,
        currentBooks: 10,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: true,
      };

      setupGoalRepositoryMocks(mockGoalRepository, [completedGoal]);
      
      // Only 7 books finished in the period (user may have deleted some)
      const books = Array.from({ length: 7 }, (_, i) => ({
        id: `book-${i}`,
        userId,
        googleBooksId: `google-${i}`,
        title: `Book ${i}`,
        authors: ['Author'],
        status: 'read' as const,
        pageCount: 300,
        currentPage: 300,
        addedAt: new Date('2024-01-01'),
        finishedAt: new Date('2024-06-01'),
      }));

      setupBookRepositoryMocks(mockBookRepository, books);

      const result = await goalService.syncGoalProgress(completedGoal.id, userId);

      // Should un-complete the goal
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        completedGoal.id,
        expect.objectContaining({
          currentBooks: 7,
          completed: false, // ← Should be set to false!
        })
      );
      expect(result.completed).toBe(false);
    });

    it('should keep goal completed when progress stays at or above target', async () => {
      const completedGoal: Goal = {
        id: 'goal-1',
        userId,
        title: 'Read 20 books',
        targetBooks: 20,
        currentBooks: 25,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: true,
      };

      setupGoalRepositoryMocks(mockGoalRepository, [completedGoal]);

      // Update to 22 (still above target)
      const result = await goalService.updateGoalProgress(completedGoal.id, userId, 22);

      // Should stay completed
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        completedGoal.id,
        expect.objectContaining({
          currentBooks: 22,
        })
      );
      // Should NOT send completed: false
      expect(result.completed).toBe(true);
    });

    it('should complete goal when progress reaches target from below', async () => {
      const incompleteGoal: Goal = {
        id: 'goal-1',
        userId,
        title: 'Read 20 books',
        targetBooks: 20,
        currentBooks: 18,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        completed: false,
      };

      setupGoalRepositoryMocks(mockGoalRepository, [incompleteGoal]);

      // Update to 20 (reaching target)
      const result = await goalService.updateGoalProgress(incompleteGoal.id, userId, 20);

      // Should auto-complete
      expect(mockGoalRepository.update).toHaveBeenCalledWith(
        incompleteGoal.id,
        expect.objectContaining({
          currentBooks: 20,
          completed: true, // ← Should be set to true!
        })
      );
      expect(result.completed).toBe(true);
    });
  });
});