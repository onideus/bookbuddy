/**
 * GoalCard Component (T035, T058, T073, T074)
 * Display a single reading goal with progress bar and actions
 * Supports status badges and edit/delete actions (US3)
 */

import { GoalProgressBar } from './goal-progress-bar.js';

export class GoalCard {
  /**
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @param {Object} options.goal - Goal data
   * @param {Function} [options.onEdit] - Edit callback (only shown for active goals)
   * @param {Function} [options.onDelete] - Delete callback (shown for all goals)
   * @param {Function} [options.onClick] - Click callback for card
   * @param {boolean} [options.showActions] - Show edit/delete buttons (default: true)
   */
  constructor(container, options = {}) {
    this.container = container;
    this.goal = options.goal;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.onClick = options.onClick || null;
    this.showActions = options.showActions !== false;
    this.progressBar = null;

    this.render();
  }

  /**
   * Get status badge color class
   * @returns {string} CSS class for status
   */
  getStatusClass() {
    const statusMap = {
      active: 'status-active',
      completed: 'status-completed',
      expired: 'status-expired',
    };
    return statusMap[this.goal.status] || 'status-active';
  }

  /**
   * Get status label
   * @returns {string} Human-readable status
   */
  getStatusLabel() {
    const labelMap = {
      active: 'Active',
      completed: 'Completed',
      expired: 'Expired',
    };
    return labelMap[this.goal.status] || 'Active';
  }

  /**
   * Format date for display
   * @param {string} isoDate - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Calculate days remaining
   * @returns {string} Days remaining text
   */
  getDaysRemaining() {
    const deadline = new Date(this.goal.deadlineAtUtc);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (this.goal.status === 'completed') {
      return `Completed ${this.goal.completedAt ? this.formatDate(this.goal.completedAt) : ''}`;
    }

    if (this.goal.status === 'expired') {
      return 'Expired';
    }

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return '1 day remaining';
    } else {
      return `${diffDays} days remaining`;
    }
  }

  /**
   * Check if goal can be edited (US3 - T073)
   * @returns {boolean} True if goal is editable
   */
  isEditable() {
    return this.goal.status === 'active';
  }

  /**
   * Render the goal card
   */
  render() {
    const statusClass = this.getStatusClass();
    const statusLabel = this.getStatusLabel();
    const daysRemaining = this.getDaysRemaining();
    const deadlineText = this.formatDate(this.goal.deadlineAtUtc);

    this.container.innerHTML = `
      <div class="goal-card ${statusClass}"
           data-goal-id="${this.goal.id}"
           ${this.onClick ? 'role="button" tabindex="0"' : ''}>
        <div class="goal-card-header">
          <h3 class="goal-card-title">${this.escapeHtml(this.goal.name)}</h3>
          <span class="goal-status-badge ${statusClass}" role="status">
            ${statusLabel}
          </span>
        </div>

        <div class="goal-card-progress">
          <div id="progress-${this.goal.id}"></div>
        </div>

        <div class="goal-card-meta">
          <div class="goal-meta-item">
            <span class="goal-meta-label">Deadline:</span>
            <span class="goal-meta-value">${deadlineText}</span>
          </div>
          <div class="goal-meta-item">
            <span class="goal-meta-label">Status:</span>
            <span class="goal-meta-value ${this.goal.status === 'active' && daysRemaining.includes('remaining') ? 'text-primary' : ''}">${daysRemaining}</span>
          </div>
        </div>

        ${this.showActions ? `
          <div class="goal-card-actions">
            ${this.isEditable() && this.onEdit ? `
              <button class="btn btn-small btn-secondary goal-edit-btn"
                      aria-label="Edit ${this.escapeHtml(this.goal.name)}">
                Edit
              </button>
            ` : ''}
            ${this.onDelete ? `
              <button class="btn btn-small btn-accent goal-delete-btn"
                      aria-label="Delete ${this.escapeHtml(this.goal.name)}">
                Delete
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    // Render progress bar
    const progressContainer = this.container.querySelector(`#progress-${this.goal.id}`);
    this.progressBar = new GoalProgressBar(progressContainer, {
      progressCount: this.goal.progressCount,
      targetCount: this.goal.targetCount,
      bonusCount: this.goal.bonusCount || 0,
      size: 'medium',
      showLabel: true,
      showBonusIndicator: true,
    });

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const card = this.container.querySelector('.goal-card');
    const editBtn = this.container.querySelector('.goal-edit-btn');
    const deleteBtn = this.container.querySelector('.goal-delete-btn');

    // Card click (if onClick provided)
    if (this.onClick) {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking action buttons
        if (e.target.closest('.goal-card-actions')) {
          return;
        }
        this.onClick(this.goal);
      });

      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onClick(this.goal);
        }
      });
    }

    // Edit button (US3 - T073)
    if (editBtn && this.onEdit) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onEdit(this.goal);
      });
    }

    // Delete button (US3 - T074)
    if (deleteBtn && this.onDelete) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        // Confirmation modal (US3 - T074)
        const confirmed = confirm(
          `Are you sure you want to delete "${this.goal.name}"?\n\n` +
          `This will permanently delete the goal and all progress tracking. This action cannot be undone.`
        );

        if (confirmed) {
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';

          try {
            await this.onDelete(this.goal);
          } catch (error) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
            alert(`Failed to delete goal: ${error.message}`);
          }
        }
      });
    }
  }

  /**
   * Update goal data and re-render
   * @param {Object} goal - Updated goal data
   */
  update(goal) {
    this.goal = goal;
    this.render();
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.progressBar) {
      this.progressBar.destroy();
    }
    this.container.innerHTML = '';
  }
}

export default GoalCard;
