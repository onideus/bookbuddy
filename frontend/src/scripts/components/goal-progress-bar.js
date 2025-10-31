/**
 * GoalProgressBar Component (T030)
 * Visual progress indicator for reading goals with accessibility support (T031)
 */

/**
 * GoalProgressBar - Progress bar component for reading goals
 * Features:
 * - Visual progress percentage (0-100%)
 * - Bonus indicator when progress exceeds 100%
 * - WCAG 2.1 AA accessibility compliant
 * - Screen reader friendly with ARIA attributes
 * - Responsive design with design tokens
 */
export class GoalProgressBar {
  /**
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @param {number} options.progressCount - Current books completed
   * @param {number} options.targetCount - Target number of books
   * @param {number} [options.bonusCount] - Books completed beyond target (default: 0)
   * @param {string} [options.size] - Size variant ('small', 'medium', 'large')
   * @param {boolean} [options.showLabel] - Show percentage label (default: true)
   * @param {boolean} [options.showBonusIndicator] - Show bonus indicator (default: true)
   */
  constructor(container, options = {}) {
    this.container = container;
    this.progressCount = options.progressCount || 0;
    this.targetCount = options.targetCount || 1;
    this.bonusCount = options.bonusCount || 0;
    this.size = options.size || 'medium';
    this.showLabel = options.showLabel !== false;
    this.showBonusIndicator = options.showBonusIndicator !== false;

    this.render();
  }

  /**
   * Calculate progress percentage (capped at 100 for display)
   * @returns {number} Progress percentage (0-100)
   */
  getProgressPercentage() {
    if (this.targetCount === 0) return 0;
    const percentage = Math.floor((this.progressCount / this.targetCount) * 100);
    return Math.min(percentage, 100);
  }

  /**
   * Check if goal has bonus books
   * @returns {boolean} True if there are bonus books
   */
  hasBonus() {
    return this.bonusCount > 0 && this.progressCount > this.targetCount;
  }

  /**
   * Get accessible label for screen readers
   * @returns {string} Accessible progress description
   */
  getAriaLabel() {
    const percentage = this.getProgressPercentage();
    const baseLabel = `Reading goal progress: ${this.progressCount} of ${this.targetCount} books completed, ${percentage} percent`;

    if (this.hasBonus()) {
      return `${baseLabel}. Bonus: ${this.bonusCount} additional ${this.bonusCount === 1 ? 'book' : 'books'} completed beyond target.`;
    }

    return baseLabel;
  }

  /**
   * Render the progress bar
   */
  render() {
    const percentage = this.getProgressPercentage();
    const hasBonus = this.hasBonus();
    const progressId = 'progress-' + Math.random().toString(36).substr(2, 9);

    this.container.innerHTML = `
      <div class="goal-progress-bar size-${this.size} ${hasBonus ? 'has-bonus' : ''}"
           role="progressbar"
           aria-valuenow="${this.progressCount}"
           aria-valuemin="0"
           aria-valuemax="${this.targetCount}"
           aria-label="${this.getAriaLabel()}"
           data-progress="${percentage}">
        <div class="progress-bar-container">
          <div class="progress-bar-track">
            <div class="progress-bar-fill"
                 style="width: ${percentage}%"
                 data-percentage="${percentage}">
            </div>
          </div>
          ${this.showLabel ? `
            <div class="progress-bar-label" aria-hidden="true">
              <span class="progress-count">${this.progressCount}/${this.targetCount}</span>
              <span class="progress-percentage">${percentage}%</span>
            </div>
          ` : ''}
        </div>
        ${hasBonus && this.showBonusIndicator ? `
          <div class="progress-bonus-indicator" aria-hidden="true">
            <span class="bonus-icon">🎉</span>
            <span class="bonus-text">+${this.bonusCount} bonus ${this.bonusCount === 1 ? 'book' : 'books'}!</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Update progress values and re-render
   * @param {Object} updates - Updated values
   * @param {number} [updates.progressCount] - New progress count
   * @param {number} [updates.targetCount] - New target count
   * @param {number} [updates.bonusCount] - New bonus count
   */
  update(updates = {}) {
    if (updates.progressCount !== undefined) {
      this.progressCount = updates.progressCount;
    }
    if (updates.targetCount !== undefined) {
      this.targetCount = updates.targetCount;
    }
    if (updates.bonusCount !== undefined) {
      this.bonusCount = updates.bonusCount;
    }

    this.render();
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

export default GoalProgressBar;
