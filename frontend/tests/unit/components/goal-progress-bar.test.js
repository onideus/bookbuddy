/**
 * Unit test for GoalProgressBar component (T039, T040)
 * Tests progress display, accessibility, and bonus indicator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('GoalProgressBar Component', () => {
  let container;

  beforeEach(() => {
    // Create a container for the component
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  describe('Basic Rendering (T039)', () => {
    it('should render with 0% progress when no books completed', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 0,
        targetCount: 10,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      expect(progressElement).toBeTruthy();
      expect(progressElement.getAttribute('aria-valuenow')).toBe('0');
      expect(progressElement.getAttribute('aria-valuemax')).toBe('10');
      expect(progressElement.getAttribute('data-progress')).toBe('0');

      const progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('0%');
    });

    it('should render with correct progress percentage', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 7,
        targetCount: 10,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      expect(progressElement.getAttribute('aria-valuenow')).toBe('7');
      expect(progressElement.getAttribute('data-progress')).toBe('70');

      const progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('70%');

      const progressCount = container.querySelector('.progress-count');
      expect(progressCount.textContent).toBe('7/10');
    });

    it('should cap progress at 100% for display', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 12,
        targetCount: 10,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      expect(progressElement.getAttribute('data-progress')).toBe('100');

      const progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('100%');

      // Count should still show actual numbers
      const progressCount = container.querySelector('.progress-count');
      expect(progressCount.textContent).toBe('12/10');
    });

    it('should have proper ARIA attributes for accessibility', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 5,
        targetCount: 10,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      expect(progressElement.getAttribute('role')).toBe('progressbar');
      expect(progressElement.getAttribute('aria-valuenow')).toBe('5');
      expect(progressElement.getAttribute('aria-valuemin')).toBe('0');
      expect(progressElement.getAttribute('aria-valuemax')).toBe('10');

      const ariaLabel = progressElement.getAttribute('aria-label');
      expect(ariaLabel).toContain('Reading goal progress');
      expect(ariaLabel).toContain('5 of 10 books completed');
      expect(ariaLabel).toContain('50 percent');
    });

    it('should support different size variants', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBarSmall = new GoalProgressBar(container, {
        progressCount: 3,
        targetCount: 10,
        size: 'small',
      });

      expect(container.querySelector('.goal-progress-bar.size-small')).toBeTruthy();
      container.innerHTML = '';

      const progressBarLarge = new GoalProgressBar(container, {
        progressCount: 3,
        targetCount: 10,
        size: 'large',
      });

      expect(container.querySelector('.goal-progress-bar.size-large')).toBeTruthy();
    });
  });

  describe('Bonus Indicator (T040)', () => {
    it('should show bonus indicator when progress exceeds target', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 12,
        targetCount: 10,
        bonusCount: 2,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      expect(progressElement.classList.contains('has-bonus')).toBe(true);

      const bonusIndicator = container.querySelector('.progress-bonus-indicator');
      expect(bonusIndicator).toBeTruthy();

      const bonusText = container.querySelector('.bonus-text');
      expect(bonusText.textContent).toBe('+2 bonus books!');
    });

    it('should show singular "book" for 1 bonus book', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 11,
        targetCount: 10,
        bonusCount: 1,
      });

      const bonusText = container.querySelector('.bonus-text');
      expect(bonusText.textContent).toBe('+1 bonus book!');
    });

    it('should not show bonus indicator when progress has not exceeded target', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 8,
        targetCount: 10,
        bonusCount: 0,
      });

      const bonusIndicator = container.querySelector('.progress-bonus-indicator');
      expect(bonusIndicator).toBeFalsy();
    });

    it('should include bonus info in ARIA label', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 13,
        targetCount: 10,
        bonusCount: 3,
      });

      const progressElement = container.querySelector('.goal-progress-bar');
      const ariaLabel = progressElement.getAttribute('aria-label');
      expect(ariaLabel).toContain('Bonus: 3 additional books completed beyond target');
    });

    it('should hide bonus indicator when showBonusIndicator is false', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 12,
        targetCount: 10,
        bonusCount: 2,
        showBonusIndicator: false,
      });

      const bonusIndicator = container.querySelector('.progress-bonus-indicator');
      expect(bonusIndicator).toBeFalsy();
    });
  });

  describe('Update Functionality', () => {
    it('should update progress when update() is called', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 5,
        targetCount: 10,
      });

      let progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('50%');

      // Update progress
      progressBar.update({ progressCount: 8 });

      progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('80%');

      const progressCount = container.querySelector('.progress-count');
      expect(progressCount.textContent).toBe('8/10');
    });

    it('should update target count when update() is called', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 5,
        targetCount: 10,
      });

      let progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('50%');

      // Update target
      progressBar.update({ targetCount: 20 });

      progressLabel = container.querySelector('.progress-percentage');
      expect(progressLabel.textContent).toBe('25%');

      const progressCount = container.querySelector('.progress-count');
      expect(progressCount.textContent).toBe('5/20');
    });
  });

  describe('Label Visibility', () => {
    it('should hide label when showLabel is false', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 5,
        targetCount: 10,
        showLabel: false,
      });

      const label = container.querySelector('.progress-bar-label');
      expect(label).toBeFalsy();
    });

    it('should show label by default', async () => {
      const { GoalProgressBar } = await import('../../../src/scripts/components/goal-progress-bar.js');

      const progressBar = new GoalProgressBar(container, {
        progressCount: 5,
        targetCount: 10,
      });

      const label = container.querySelector('.progress-bar-label');
      expect(label).toBeTruthy();
    });
  });
});
