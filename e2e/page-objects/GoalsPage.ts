import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class GoalsPage extends BasePage {
  // Selectors
  private selectors = {
    pageTitle: 'h1',
    createGoalButton: 'button:has-text("Create Goal"), button:has-text("New Goal")',
    goalCard: '[data-testid="goal-card"]',
    goalTitle: '[data-testid="goal-title"]',
    goalTarget: '[data-testid="goal-target"]',
    goalProgress: '[data-testid="goal-progress"]',
    goalDeadline: '[data-testid="goal-deadline"]',
    progressBar: '[role="progressbar"]',
    editButton: '[data-testid="edit-goal"]',
    deleteButton: '[data-testid="delete-goal"]',
    completeButton: '[data-testid="complete-goal"]',
    modal: '[role="dialog"]',
    modalTitle: '[data-testid="modal-title"]',
    goalTitleInput: 'input[name="title"]',
    goalTargetInput: 'input[name="target"], input[name="targetBooks"]',
    goalDeadlineInput: 'input[name="deadline"], input[name="endDate"], input[type="date"]',
    modalSaveButton: 'button:has-text("Save"), button:has-text("Create")',
    modalCancelButton: 'button:has-text("Cancel")',
    confirmDeleteButton: 'button:has-text("Yes, delete"), button:has-text("Confirm")',
    cancelDeleteButton: 'button:has-text("Cancel"), button:has-text("No")',
    emptyState: '[data-testid="empty-state"]',
    successMessage: '[data-testid="success-message"]',
    errorMessage: '[data-testid="error-message"]',
    activeGoalsSection: '[data-testid="active-goals"]',
    completedGoalsSection: '[data-testid="completed-goals"]',
    goalGrid: '.grid',
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/goals';
  }

  /**
   * Create a new goal
   */
  async createGoal(title: string, target: number, deadline: Date | string) {
    // Click create button
    await this.clickElement(this.selectors.createGoalButton);

    // Wait for modal
    await this.waitForElement(this.selectors.modal);

    // Fill in goal details
    await this.fillField(this.selectors.goalTitleInput, title);
    await this.fillField(this.selectors.goalTargetInput, target.toString());

    // Format date if necessary
    const dateString = typeof deadline === 'string'
      ? deadline
      : deadline.toISOString().split('T')[0];

    await this.fillField(this.selectors.goalDeadlineInput, dateString);

    // Save goal
    await this.clickElement(this.selectors.modalSaveButton);

    // Wait for modal to close
    await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all goal titles
   */
  async getAllGoalTitles(): Promise<string[]> {
    const titles: string[] = [];
    const goalCards = this.page.locator('.bg-white h3, .dark\\:bg-gray-800 h3');
    const count = await goalCards.count();

    for (let i = 0; i < count; i++) {
      const title = await goalCards.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Get goal count
   */
  async getGoalCount(): Promise<number> {
    const goalCards = this.page.locator('.bg-white.rounded-lg, .dark\\:bg-gray-800.rounded-lg');
    return await goalCards.count();
  }

  /**
   * Get active goals count
   */
  async getActiveGoalsCount(): Promise<number> {
    const activeSection = this.page.locator('h2:has-text("Active Goals")');
    const sectionExists = await activeSection.count();

    if (sectionExists > 0) {
      const parent = activeSection.locator('..').first();
      const goalCards = parent.locator('.bg-white.rounded-lg, .dark\\:bg-gray-800.rounded-lg');
      return await goalCards.count();
    }

    // If no sections, all non-completed goals are active
    return await this.getGoalCount();
  }

  /**
   * Get completed goals count
   */
  async getCompletedGoalsCount(): Promise<number> {
    const completedSection = this.page.locator('h2:has-text("Completed Goals")');
    const sectionExists = await completedSection.count();

    if (sectionExists > 0) {
      const parent = completedSection.locator('..').first();
      const goalCards = parent.locator('.bg-white.rounded-lg, .dark\\:bg-gray-800.rounded-lg');
      return await goalCards.count();
    }

    return 0;
  }

  /**
   * Edit a goal
   */
  async editGoal(goalTitle: string, updates: {
    title?: string;
    target?: number;
    deadline?: Date | string;
  }) {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const editButton = goalCard.locator('button:has-text("Edit")');

    await editButton.click();

    // Wait for modal
    await this.waitForElement(this.selectors.modal);

    // Update fields
    if (updates.title) {
      const titleInput = this.page.locator(this.selectors.goalTitleInput);
      await titleInput.clear();
      await titleInput.fill(updates.title);
    }

    if (updates.target) {
      const targetInput = this.page.locator(this.selectors.goalTargetInput);
      await targetInput.clear();
      await targetInput.fill(updates.target.toString());
    }

    if (updates.deadline) {
      const dateString = typeof updates.deadline === 'string'
        ? updates.deadline
        : updates.deadline.toISOString().split('T')[0];

      const deadlineInput = this.page.locator(this.selectors.goalDeadlineInput);
      await deadlineInput.clear();
      await deadlineInput.fill(dateString);
    }

    // Save changes
    await this.clickElement(this.selectors.modalSaveButton);

    // Wait for modal to close
    await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalTitle: string) {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const deleteButton = goalCard.locator('button:has-text("Delete")');

    await deleteButton.click();

    // Confirm deletion
    const confirmButton = this.page.locator(this.selectors.confirmDeleteButton);
    await confirmButton.click();

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get goal progress
   */
  async getGoalProgress(goalTitle: string): Promise<{ current: number; target: number } | null> {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const progressBar = goalCard.locator(this.selectors.progressBar);

    const exists = await progressBar.count();
    if (exists > 0) {
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');

      if (ariaValueNow && ariaValueMax) {
        return {
          current: parseInt(ariaValueNow),
          target: parseInt(ariaValueMax),
        };
      }
    }

    // Try to get from text
    const progressText = goalCard.locator('text=/\\d+\\s*\\/\\s*\\d+/');
    const textExists = await progressText.count();

    if (textExists > 0) {
      const text = await progressText.textContent();
      if (text) {
        const match = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          return {
            current: parseInt(match[1]),
            target: parseInt(match[2]),
          };
        }
      }
    }

    return null;
  }

  /**
   * Get goal deadline
   */
  async getGoalDeadline(goalTitle: string): Promise<string | null> {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const deadlineText = goalCard.locator('text=/Due:|Deadline:/');

    const exists = await deadlineText.count();
    if (exists > 0) {
      const text = await deadlineText.textContent();
      return text?.replace(/Due:|Deadline:/, '').trim() || null;
    }

    return null;
  }

  /**
   * Check if goal is completed
   */
  async isGoalCompleted(goalTitle: string): Promise<boolean> {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);

    // Check for completed badge
    const completedBadge = goalCard.locator('text="Completed", text="Complete"');
    const badgeExists = await completedBadge.count();

    if (badgeExists > 0) {
      return true;
    }

    // Check if in completed section
    const completedSection = this.page.locator('h2:has-text("Completed Goals")');
    const sectionExists = await completedSection.count();

    if (sectionExists > 0) {
      const parent = completedSection.locator('..').first();
      const goalInSection = parent.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
      const inSectionCount = await goalInSection.count();
      return inSectionCount > 0;
    }

    return false;
  }

  /**
   * Mark goal as complete
   */
  async markGoalAsComplete(goalTitle: string) {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const completeButton = goalCard.locator('button:has-text("Mark Complete"), button:has-text("Complete")');

    const buttonExists = await completeButton.count();
    if (buttonExists > 0) {
      await completeButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
    const emptyStateText = await this.page.locator('text="No goals yet", text="No goals found"').count();
    return emptyStateText > 0;
  }

  /**
   * Check if goal exists
   */
  async goalExists(goalTitle: string): Promise<boolean> {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const count = await goalCard.count();
    return count > 0;
  }

  /**
   * Get goal details
   */
  async getGoalDetails(goalTitle: string): Promise<{
    title: string;
    progress: { current: number; target: number } | null;
    deadline: string | null;
    completed: boolean;
  } | null> {
    if (!(await this.goalExists(goalTitle))) {
      return null;
    }

    return {
      title: goalTitle,
      progress: await this.getGoalProgress(goalTitle),
      deadline: await this.getGoalDeadline(goalTitle),
      completed: await this.isGoalCompleted(goalTitle),
    };
  }
}