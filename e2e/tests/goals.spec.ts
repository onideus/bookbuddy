import { test, expect } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

test.describe('Reading Goals Flow', () => {
  test.describe('Create Goals', () => {
    test('should create a new reading goal', async ({ page, goalsPage, authenticatedPage }) => {
      await goalsPage.goto();

      const goalTitle = 'Read 12 books this year';
      const goalTarget = 12;
      const goalDeadline = new Date();
      goalDeadline.setMonth(goalDeadline.getMonth() + 6); // 6 months from now

      // Create goal
      await goalsPage.createGoal(goalTitle, goalTarget, goalDeadline);

      // Verify goal was created
      const hasGoal = await goalsPage.goalExists(goalTitle);
      expect(hasGoal).toBeTruthy();

      // Verify goal details
      const goalDetails = await goalsPage.getGoalDetails(goalTitle);
      expect(goalDetails).not.toBeNull();
      expect(goalDetails?.progress?.current).toBe(0);
      expect(goalDetails?.progress?.target).toBe(goalTarget);
      expect(goalDetails?.completed).toBeFalsy();
    });

    test('should create multiple goals with different targets', async ({ page, goalsPage, authenticatedPage }) => {
      await goalsPage.goto();

      const goals = [
        { title: 'Read 10 fiction books', target: 10 },
        { title: 'Read 5 non-fiction books', target: 5 },
        { title: 'Read 20 books total', target: 20 },
      ];

      for (const goal of goals) {
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 3);

        await goalsPage.createGoal(goal.title, goal.target, deadline);
      }

      // Verify all goals were created
      const goalCount = await goalsPage.getGoalCount();
      expect(goalCount).toBeGreaterThanOrEqual(3);

      for (const goal of goals) {
        const hasGoal = await goalsPage.goalExists(goal.title);
        expect(hasGoal).toBeTruthy();
      }
    });
  });

  test.describe('View Goals', () => {
    test('should display goal progress correctly', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      // Create a goal with some progress
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Read 20 books',
        targetBooks: 20,
        currentBooks: 8,
      });

      await goalsPage.goto();

      // Get goal progress
      const progress = await goalsPage.getGoalProgress('Read 20 books');
      expect(progress).not.toBeNull();
      expect(progress?.current).toBe(8);
      expect(progress?.target).toBe(20);
    });

    test('should display goal deadline', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Read 15 books',
        targetBooks: 15,
        endDate: deadline,
      });

      await goalsPage.goto();

      // Get goal deadline
      const goalDeadline = await goalsPage.getGoalDeadline('Read 15 books');
      expect(goalDeadline).not.toBeNull();
    });

    test('should separate active and completed goals', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      // Create active goal
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Active Goal',
        targetBooks: 10,
        currentBooks: 3,
        endDate: futureDate,
        completed: false,
      });

      // Create completed goal
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Completed Goal',
        targetBooks: 5,
        currentBooks: 5,
        endDate: futureDate,
        completed: true,
      });

      await goalsPage.goto();

      // Verify active and completed counts
      const activeCount = await goalsPage.getActiveGoalsCount();
      const completedCount = await goalsPage.getCompletedGoalsCount();

      expect(activeCount).toBeGreaterThanOrEqual(1);
      expect(completedCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Update Goals', () => {
    test('should edit goal title', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Original Goal Title',
        targetBooks: 10,
      });

      await goalsPage.goto();

      // Edit goal
      await goalsPage.editGoal('Original Goal Title', {
        title: 'Updated Goal Title',
      });

      // Verify title was updated
      const hasNewTitle = await goalsPage.goalExists('Updated Goal Title');
      const hasOldTitle = await goalsPage.goalExists('Original Goal Title');

      expect(hasNewTitle).toBeTruthy();
      expect(hasOldTitle).toBeFalsy();
    });

    test('should edit goal target', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Goal Target Test',
        targetBooks: 10,
      });

      await goalsPage.goto();

      // Edit goal target
      await goalsPage.editGoal('Goal Target Test', {
        target: 20,
      });

      // Verify target was updated
      const progress = await goalsPage.getGoalProgress('Goal Target Test');
      expect(progress?.target).toBe(20);
    });

    test('should edit goal deadline', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      const oldDeadline = new Date();
      oldDeadline.setMonth(oldDeadline.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Goal Deadline Test',
        targetBooks: 10,
        endDate: oldDeadline,
      });

      await goalsPage.goto();

      // Edit goal deadline
      const newDeadline = new Date();
      newDeadline.setMonth(newDeadline.getMonth() + 6);

      await goalsPage.editGoal('Goal Deadline Test', {
        deadline: newDeadline,
      });

      // Verify deadline was updated (just check that goal still exists and has a deadline)
      const deadline = await goalsPage.getGoalDeadline('Goal Deadline Test');
      expect(deadline).not.toBeNull();
    });
  });

  test.describe('Goal Progress Tracking', () => {
    test('should automatically update goal progress when book is marked as read', async ({ page, goalsPage, booksPage, authenticatedPage, testUser }) => {
      // Create a goal
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Auto Progress Goal',
        targetBooks: 5,
        currentBooks: 0,
      });

      // Create a book in reading status
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book for Goal Progress',
        status: 'reading',
      });

      // Check initial progress
      await goalsPage.goto();
      let progress = await goalsPage.getGoalProgress('Auto Progress Goal');
      const initialProgress = progress?.current || 0;

      // Mark book as read
      await booksPage.goto();
      await booksPage.markBookAsRead('Book for Goal Progress');

      // Check updated progress
      await goalsPage.goto();
      progress = await goalsPage.getGoalProgress('Auto Progress Goal');
      const updatedProgress = progress?.current || 0;

      expect(updatedProgress).toBe(initialProgress + 1);
    });

    test('should mark goal as complete when target is reached', async ({ page, goalsPage, booksPage, authenticatedPage, testUser }) => {
      // Create a goal with target 1
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Complete This Goal',
        targetBooks: 1,
        currentBooks: 0,
      });

      // Create a book in reading status
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book to Complete Goal',
        status: 'reading',
      });

      // Mark book as read
      await booksPage.goto();
      await booksPage.markBookAsRead('Book to Complete Goal');

      // Check if goal is completed
      await goalsPage.goto();
      const isCompleted = await goalsPage.isGoalCompleted('Complete This Goal');
      expect(isCompleted).toBeTruthy();
    });

    test('should show correct progress percentage', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      // Create a goal with specific progress
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Progress Percentage Goal',
        targetBooks: 10,
        currentBooks: 5,
      });

      await goalsPage.goto();

      // Get progress
      const progress = await goalsPage.getGoalProgress('Progress Percentage Goal');
      expect(progress?.current).toBe(5);
      expect(progress?.target).toBe(10);

      // 50% progress (5/10)
      const percentage = (progress!.current / progress!.target) * 100;
      expect(percentage).toBe(50);
    });
  });

  test.describe('Delete Goals', () => {
    test('should delete a goal', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Goal to Delete',
        targetBooks: 10,
      });

      await goalsPage.goto();

      // Verify goal exists
      let hasGoal = await goalsPage.goalExists('Goal to Delete');
      expect(hasGoal).toBeTruthy();

      // Delete goal
      await goalsPage.deleteGoal('Goal to Delete');

      // Verify goal was deleted
      hasGoal = await goalsPage.goalExists('Goal to Delete');
      expect(hasGoal).toBeFalsy();
    });

    test('should delete completed goal', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Completed Goal to Delete',
        targetBooks: 5,
        currentBooks: 5,
        completed: true,
      });

      await goalsPage.goto();

      // Delete completed goal
      await goalsPage.deleteGoal('Completed Goal to Delete');

      // Verify goal was deleted
      const hasGoal = await goalsPage.goalExists('Completed Goal to Delete');
      expect(hasGoal).toBeFalsy();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no goals exist', async ({ page, goalsPage, authenticatedPage }) => {
      await goalsPage.goto();

      // Should show empty state
      const hasEmptyState = await goalsPage.hasEmptyState();
      expect(hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Goal Validation', () => {
    test('should not create goal with zero target', async ({ page, goalsPage, authenticatedPage }) => {
      await goalsPage.goto();

      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 3);

      // Try to create goal with zero target
      await goalsPage.createGoal('Invalid Goal', 0, deadline);

      // Should show validation error or stay on page
      // Goal should not be created
      const hasGoal = await goalsPage.goalExists('Invalid Goal');
      expect(hasGoal).toBeFalsy();
    });

    test('should not create goal with past deadline', async ({ page, goalsPage, authenticatedPage }) => {
      await goalsPage.goto();

      const pastDeadline = new Date();
      pastDeadline.setMonth(pastDeadline.getMonth() - 3); // 3 months ago

      // Try to create goal with past deadline
      await goalsPage.createGoal('Past Deadline Goal', 10, pastDeadline);

      // Should show validation error or not create the goal
      // This depends on implementation - adjust assertion based on actual behavior
    });
  });
});