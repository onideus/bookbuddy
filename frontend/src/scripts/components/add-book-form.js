/**
 * AddBookForm component (T060)
 * Form for adding books with validation and optimistic UI updates
 */

import { ReadingStatus } from '../../../../shared/constants.js';

export class AddBookForm {
  constructor(options) {
    this.container = options.container;
    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
  }

  /**
   * Render the form
   */
  render() {
    this.container.innerHTML = `
      <div class="form-overlay">
        <h2 class="form-title">Add a Book</h2>

        <form id="add-book-form" novalidate>
          <div class="form-group">
            <label for="book-title" class="form-label">
              Title <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="book-title"
              name="title"
              class="form-input"
              required
              maxlength="500"
              aria-required="true"
              aria-describedby="title-error"
            />
            <div id="title-error" class="form-error" role="alert"></div>
          </div>

          <div class="form-group">
            <label for="book-author" class="form-label">
              Author <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="book-author"
              name="author"
              class="form-input"
              required
              maxlength="200"
              aria-required="true"
              aria-describedby="author-error"
            />
            <div id="author-error" class="form-error" role="alert"></div>
          </div>

          <div class="form-group">
            <label for="book-edition" class="form-label">Edition</label>
            <input
              type="text"
              id="book-edition"
              name="edition"
              class="form-input"
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label for="book-isbn" class="form-label">ISBN</label>
            <input
              type="text"
              id="book-isbn"
              name="isbn"
              class="form-input"
              maxlength="17"
              pattern="[0-9-]{10,17}"
            />
          </div>

          <div class="form-group">
            <label for="book-status" class="form-label">
              Status <span aria-label="required">*</span>
            </label>
            <select
              id="book-status"
              name="status"
              class="form-select"
              required
              aria-required="true"
            >
              <option value="${ReadingStatus.TO_READ}">To Read</option>
              <option value="${ReadingStatus.READING}">Reading</option>
              <option value="${ReadingStatus.FINISHED}">Finished</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Add Book</button>
            <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = this.container.querySelector('#add-book-form');
    const cancelBtn = this.container.querySelector('#cancel-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.validate()) {
        const formData = new FormData(form);
        const bookData = {
          title: formData.get('title'),
          author: formData.get('author'),
          edition: formData.get('edition') || undefined,
          isbn: formData.get('isbn') || undefined,
          status: formData.get('status'),
        };

        try {
          await this.onSubmit(bookData);
          form.reset();
        } catch (error) {
          this.showError(error.message);
        }
      }
    });

    cancelBtn.addEventListener('click', () => {
      this.onCancel();
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach((input) => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
    });
  }

  /**
   * Validate the entire form
   * @returns {boolean} Is valid
   */
  validate() {
    const form = this.container.querySelector('#add-book-form');
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
   * Validate a single field
   * @param {HTMLElement} input - Input element
   * @returns {boolean} Is valid
   */
  validateField(input) {
    const errorElement = document.getElementById(`${input.name}-error`);
    const value = input.value.trim();

    // Clear previous error
    errorElement.textContent = '';
    input.removeAttribute('aria-invalid');

    if (input.required && !value) {
      errorElement.textContent = `${input.name.charAt(0).toUpperCase() + input.name.slice(1)} is required`;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    if (input.maxLength && value.length > input.maxLength) {
      errorElement.textContent = `${input.name.charAt(0).toUpperCase() + input.name.slice(1)} must be ${input.maxLength} characters or less`;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    return true;
  }

  /**
   * Show general form error
   * @param {string} message - Error message
   */
  showError(message) {
    // You could add a general error div for non-field-specific errors
    alert(message); // Simple approach for now
  }

  /**
   * Clear the form
   */
  clear() {
    const form = this.container.querySelector('#add-book-form');
    if (form) {
      form.reset();
      // Clear all error messages
      const errors = this.container.querySelectorAll('.form-error');
      errors.forEach((error) => {
        error.textContent = '';
      });
    }
  }
}

export default AddBookForm;
