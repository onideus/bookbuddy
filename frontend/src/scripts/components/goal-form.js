/**
 * GoalForm Component (T033, T034, T075)
 * Form for creating and editing reading goals with validation
 * Supports both create mode and edit mode
 */

export class GoalForm {
  /**
   * @param {Object} options - Component options
   * @param {HTMLElement} options.container - Container element
   * @param {Function} options.onSubmit - Submit callback (receives goal data)
   * @param {Function} [options.onCancel] - Cancel callback
   * @param {Object} [options.goal] - Existing goal data for edit mode
   * @param {string} [options.mode] - 'create' or 'edit' (default: 'create')
   */
  constructor(options) {
    this.container = options.container;
    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.goal = options.goal || null;
    this.mode = options.mode || (this.goal ? 'edit' : 'create');
    this.isSubmitting = false;
  }

  /**
   * Render the form
   */
  render() {
    const isEdit = this.mode === 'edit';
    const title = isEdit ? 'Edit Reading Goal' : 'Create Reading Goal';
    const submitLabel = isEdit ? 'Update Goal' : 'Create Goal';

    this.container.innerHTML = `
      <div class="form-overlay">
        <h2 class="form-title">${title}</h2>

        <form id="goal-form" novalidate>
          <div class="form-group">
            <label for="goal-name" class="form-label">
              Goal Name <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="goal-name"
              name="name"
              class="form-input"
              required
              maxlength="255"
              value="${this.goal?.name || ''}"
              placeholder="e.g., Summer Reading Challenge"
              aria-required="true"
              aria-describedby="name-error name-help"
            />
            <div id="name-help" class="form-help">
              Give your goal a descriptive name
            </div>
            <div id="name-error" class="form-error" role="alert"></div>
          </div>

          <div class="form-group">
            <label for="goal-target" class="form-label">
              Target Books <span aria-label="required">*</span>
            </label>
            <input
              type="number"
              id="goal-target"
              name="targetCount"
              class="form-input"
              required
              min="1"
              max="9999"
              value="${this.goal?.targetCount || ''}"
              placeholder="e.g., 10"
              aria-required="true"
              aria-describedby="target-error target-help"
            />
            <div id="target-help" class="form-help">
              How many books do you want to read? (1-9999)
            </div>
            <div id="target-error" class="form-error" role="alert"></div>
          </div>

          ${!isEdit ? `
          <div class="form-group">
            <label for="goal-days" class="form-label">
              Timeframe (Days) <span aria-label="required">*</span>
            </label>
            <input
              type="number"
              id="goal-days"
              name="daysFromNow"
              class="form-input"
              required
              min="1"
              max="3650"
              placeholder="e.g., 30"
              aria-required="true"
              aria-describedby="days-error days-help"
            />
            <div id="days-help" class="form-help">
              How many days from today? (1-3650, max 10 years)
            </div>
            <div id="days-error" class="form-error" role="alert"></div>
          </div>
          ` : `
          <div class="form-group">
            <label for="goal-extend" class="form-label">
              Extend Deadline (Days)
            </label>
            <input
              type="number"
              id="goal-extend"
              name="daysToAdd"
              class="form-input"
              min="1"
              max="365"
              placeholder="e.g., 7"
              aria-describedby="extend-help"
            />
            <div id="extend-help" class="form-help">
              Add days to extend the current deadline (optional, 1-365)
            </div>
            <div id="extend-error" class="form-error" role="alert"></div>
          </div>
          `}

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" ${this.isSubmitting ? 'disabled' : ''}>
              ${this.isSubmitting ? 'Saving...' : submitLabel}
            </button>
            <button type="button" id="cancel-btn" class="btn btn-secondary" ${this.isSubmitting ? 'disabled' : ''}>
              Cancel
            </button>
          </div>

          <div id="form-general-error" class="form-error" role="alert" style="margin-top: 1rem;"></div>
        </form>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = this.container.querySelector('#goal-form');
    const cancelBtn = this.container.querySelector('#cancel-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.isSubmitting) {
        return;
      }

      if (this.validate()) {
        this.isSubmitting = true;
        this.updateSubmitButton();

        const formData = new FormData(form);
        const goalData = {
          name: formData.get('name').trim(),
          targetCount: parseInt(formData.get('targetCount'), 10),
        };

        if (this.mode === 'create') {
          goalData.daysFromNow = parseInt(formData.get('daysFromNow'), 10);
        } else {
          // Edit mode - only include fields that were changed
          const daysToAdd = formData.get('daysToAdd');
          if (daysToAdd && daysToAdd.trim()) {
            goalData.daysToAdd = parseInt(daysToAdd, 10);
          }
        }

        try {
          await this.onSubmit(goalData);
          form.reset();
          this.clearErrors();
        } catch (error) {
          this.showGeneralError(error.message || 'Failed to save goal. Please try again.');
        } finally {
          this.isSubmitting = false;
          this.updateSubmitButton();
        }
      }
    });

    cancelBtn.addEventListener('click', () => {
      this.onCancel();
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });

      // Clear error on input
      input.addEventListener('input', () => {
        const errorElement = document.getElementById(`${input.name}-error`);
        if (errorElement && errorElement.textContent) {
          errorElement.textContent = '';
          input.removeAttribute('aria-invalid');
        }
      });
    });
  }

  /**
   * Validate the entire form (T034)
   * @returns {boolean} Is valid
   */
  validate() {
    const form = this.container.querySelector('#goal-form');
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Validate a single field (T034)
   * @param {HTMLElement} input - Input element
   * @returns {boolean} Is valid
   */
  validateField(input) {
    const errorElement = document.getElementById(`${input.name}-error`);
    if (!errorElement) return true;

    const value = input.value.trim();

    // Clear previous error
    errorElement.textContent = '';
    input.removeAttribute('aria-invalid');

    // Required field validation
    if (input.required && !value) {
      const fieldName = input.name === 'name' ? 'Goal name' :
                       input.name === 'targetCount' ? 'Target books' :
                       input.name === 'daysFromNow' ? 'Timeframe' : input.name;
      errorElement.textContent = `${fieldName} is required`;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    // Text field validation
    if (input.type === 'text') {
      if (input.maxLength && value.length > input.maxLength) {
        errorElement.textContent = `Must be ${input.maxLength} characters or less`;
        input.setAttribute('aria-invalid', 'true');
        return false;
      }
    }

    // Number field validation
    if (input.type === 'number' && value) {
      const numValue = parseInt(value, 10);

      if (isNaN(numValue)) {
        errorElement.textContent = 'Must be a valid number';
        input.setAttribute('aria-invalid', 'true');
        return false;
      }

      const min = parseInt(input.min, 10);
      const max = parseInt(input.max, 10);

      if (!isNaN(min) && numValue < min) {
        errorElement.textContent = `Must be at least ${min}`;
        input.setAttribute('aria-invalid', 'true');
        return false;
      }

      if (!isNaN(max) && numValue > max) {
        errorElement.textContent = `Must be ${max} or less`;
        input.setAttribute('aria-invalid', 'true');
        return false;
      }

      if (numValue < 1) {
        errorElement.textContent = 'Must be a positive number';
        input.setAttribute('aria-invalid', 'true');
        return false;
      }
    }

    return true;
  }

  /**
   * Show general form error (non-field-specific)
   * @param {string} message - Error message
   */
  showGeneralError(message) {
    const errorElement = document.getElementById('form-general-error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /**
   * Clear all error messages
   */
  clearErrors() {
    const errors = this.container.querySelectorAll('.form-error');
    errors.forEach((error) => {
      error.textContent = '';
    });

    const inputs = this.container.querySelectorAll('input');
    inputs.forEach((input) => {
      input.removeAttribute('aria-invalid');
    });
  }

  /**
   * Update submit button state
   */
  updateSubmitButton() {
    const submitBtn = this.container.querySelector('button[type="submit"]');
    const cancelBtn = this.container.querySelector('#cancel-btn');

    if (submitBtn) {
      submitBtn.disabled = this.isSubmitting;
      submitBtn.textContent = this.isSubmitting ? 'Saving...' :
                             (this.mode === 'edit' ? 'Update Goal' : 'Create Goal');
    }

    if (cancelBtn) {
      cancelBtn.disabled = this.isSubmitting;
    }
  }

  /**
   * Clear the form
   */
  clear() {
    const form = this.container.querySelector('#goal-form');
    if (form) {
      form.reset();
      this.clearErrors();
    }
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

export default GoalForm;
