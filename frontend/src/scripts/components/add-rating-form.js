/**
 * AddRatingForm Component (T109)
 * Form for rating finished books with reflection note
 */

import { RatingStars } from './rating-stars.js';
import { setRating } from '../api/ratings-api.js';

/**
 * AddRatingForm - Form component for adding/updating book ratings
 * Features:
 * - Interactive star rating (1-5)
 * - Reflection note textarea (max 2000 chars)
 * - Character counter
 * - Validation
 * - Optimistic UI updates (FR-013)
 * - Loading states
 * - Error handling
 */
export class AddRatingForm {
  /**
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @param {string} options.entryId - Reading entry ID
   * @param {number} [options.currentRating] - Current rating if updating
   * @param {string} [options.currentReflection] - Current reflection if updating
   * @param {Function} [options.onSuccess] - Success callback
   * @param {Function} [options.onCancel] - Cancel callback
   */
  constructor(container, options = {}) {
    this.container = container;
    this.entryId = options.entryId;
    this.currentRating = options.currentRating || 0;
    this.currentReflection = options.currentReflection || '';
    this.onSuccess = options.onSuccess || null;
    this.onCancel = options.onCancel || null;

    this.rating = this.currentRating;
    this.isSubmitting = false;

    this.render();
    this.initializeComponents();
    this.attachEventListeners();
  }

  render() {
    const isUpdate = this.currentRating > 0;

    this.container.innerHTML = `
      <div class="add-rating-form" data-testid="add-rating-form">
        <h3 class="form-heading">${isUpdate ? 'Update' : 'Add'} Rating & Reflection</h3>

        <form id="rating-form" class="rating-form" novalidate>
          <!-- Star Rating -->
          <div class="form-group">
            <label class="form-label">
              Rating <span class="required-indicator" aria-label="required">*</span>
            </label>
            <div id="rating-stars-container" class="rating-stars-container"></div>
            <div class="form-help-text">Select a rating from 1 to 5 stars</div>
          </div>

          <!-- Reflection Note -->
          <div class="form-group">
            <label for="reflection-textarea" class="form-label">
              Reflection Note <span class="optional-indicator">(optional)</span>
            </label>
            <textarea
              id="reflection-textarea"
              data-testid="reflection-textarea"
              class="form-textarea"
              rows="6"
              maxlength="2000"
              placeholder="Share your thoughts about this book..."
              aria-describedby="reflection-help reflection-char-count"
            >${this.currentReflection}</textarea>
            <div class="form-help-text" id="reflection-help">
              Maximum 2000 characters
            </div>
            <div class="char-count" id="reflection-char-count" aria-live="polite">
              <span id="current-char-count">${this.currentReflection.length}</span> / 2000 characters
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="submit"
              id="submit-rating-button"
              data-testid="submit-rating-button"
              class="btn btn-primary"
              ${this.rating === 0 ? 'disabled' : ''}
            >
              <span class="btn-text">${isUpdate ? 'Update' : 'Save'} Rating</span>
              <span class="btn-loading" hidden aria-hidden="true">
                <span class="loading-spinner"></span>
                Saving...
              </span>
            </button>

            ${this.onCancel ? `
              <button
                type="button"
                id="cancel-rating-button"
                data-testid="cancel-rating-button"
                class="btn btn-secondary"
              >
                Cancel
              </button>
            ` : ''}
          </div>

          <!-- Error Message -->
          <div
            id="rating-form-error"
            data-testid="rating-form-error"
            class="error-message"
            role="alert"
            aria-live="assertive"
            hidden
          ></div>
        </form>
      </div>
    `;

    this.form = this.container.querySelector('#rating-form');
    this.reflectionTextarea = this.container.querySelector('#reflection-textarea');
    this.charCountSpan = this.container.querySelector('#current-char-count');
    this.submitButton = this.container.querySelector('#submit-rating-button');
    this.cancelButton = this.container.querySelector('#cancel-rating-button');
    this.errorContainer = this.container.querySelector('#rating-form-error');
  }

  initializeComponents() {
    // Initialize RatingStars component
    const starsContainer = this.container.querySelector('#rating-stars-container');
    this.ratingStars = new RatingStars(starsContainer, {
      rating: this.currentRating,
      readonly: false,
      size: 'large',
      onChange: (rating) => {
        this.rating = rating;
        this.updateSubmitButton();
      },
    });
  }

  attachEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Character counter
    this.reflectionTextarea.addEventListener('input', () => {
      this.updateCharCount();
    });

    // Cancel button
    if (this.cancelButton) {
      this.cancelButton.addEventListener('click', () => {
        if (this.onCancel) {
          this.onCancel();
        }
      });
    }
  }

  updateCharCount() {
    const length = this.reflectionTextarea.value.length;
    this.charCountSpan.textContent = length;

    // Visual feedback when approaching limit
    const charCountEl = this.container.querySelector('#reflection-char-count');
    if (length > 1900) {
      charCountEl.classList.add('warning');
    } else {
      charCountEl.classList.remove('warning');
    }
  }

  updateSubmitButton() {
    if (this.rating === 0) {
      this.submitButton.disabled = true;
    } else {
      this.submitButton.disabled = false;
    }
  }

  async handleSubmit() {
    if (this.isSubmitting) {
      return;
    }

    // Validate
    if (this.rating === 0) {
      this.showError('Please select a rating');
      return;
    }

    const reflectionNote = this.reflectionTextarea.value.trim();

    if (reflectionNote.length > 2000) {
      this.showError('Reflection note must not exceed 2000 characters');
      return;
    }

    this.hideError();
    this.setLoadingState(true);

    try {
      const result = await setRating(this.entryId, {
        rating: this.rating,
        reflectionNote: reflectionNote || undefined,
      });

      this.setLoadingState(false);

      if (this.onSuccess) {
        this.onSuccess(result.readingEntry);
      }

      this.showSuccess();
    } catch (error) {
      console.error('Failed to save rating:', error);
      this.setLoadingState(false);
      this.showError(error.message || 'Failed to save rating. Please try again.');
    }
  }

  setLoadingState(loading) {
    this.isSubmitting = loading;

    const btnText = this.submitButton.querySelector('.btn-text');
    const btnLoading = this.submitButton.querySelector('.btn-loading');

    if (loading) {
      this.submitButton.disabled = true;
      btnText.hidden = true;
      btnLoading.hidden = false;
      this.reflectionTextarea.disabled = true;
      this.ratingStars.setReadonly(true);

      if (this.cancelButton) {
        this.cancelButton.disabled = true;
      }
    } else {
      this.submitButton.disabled = this.rating === 0;
      btnText.hidden = false;
      btnLoading.hidden = true;
      this.reflectionTextarea.disabled = false;
      this.ratingStars.setReadonly(false);

      if (this.cancelButton) {
        this.cancelButton.disabled = false;
      }
    }
  }

  showError(message) {
    this.errorContainer.textContent = message;
    this.errorContainer.hidden = false;
  }

  hideError() {
    this.errorContainer.hidden = true;
  }

  showSuccess() {
    // Create success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.setAttribute('role', 'status');
    successMessage.setAttribute('aria-live', 'polite');
    successMessage.textContent = 'Rating saved successfully!';

    this.form.insertBefore(successMessage, this.errorContainer);

    // Remove after 3 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 3000);
  }

  setEntryId(entryId) {
    this.entryId = entryId;
  }

  reset() {
    this.rating = 0;
    this.ratingStars.setRating(0);
    this.reflectionTextarea.value = '';
    this.updateCharCount();
    this.updateSubmitButton();
    this.hideError();
  }

  destroy() {
    if (this.ratingStars) {
      this.ratingStars.destroy();
    }
    this.container.innerHTML = '';
  }
}

export default AddRatingForm;
