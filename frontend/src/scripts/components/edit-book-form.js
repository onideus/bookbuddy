/**
 * EditBookForm component
 * Form for editing book metadata (title, author, edition, ISBN)
 */

export class EditBookForm {
  constructor(options) {
    this.container = options.container;
    this.entry = options.entry;
    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
  }

  /**
   * Render the form
   */
  render() {
    const { title, author, edition, isbn } = this.entry.book;

    this.container.innerHTML = `
      <div class="form-overlay">
        <h2 class="form-title">Edit Book</h2>

        <form id="edit-book-form" novalidate>
          <div class="form-group">
            <label for="edit-book-title" class="form-label">
              Title <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="edit-book-title"
              name="title"
              class="form-input"
              required
              maxlength="500"
              value="${this.escapeHtml(title)}"
              aria-required="true"
              aria-describedby="edit-title-error"
            />
            <div id="edit-title-error" class="form-error" role="alert"></div>
          </div>

          <div class="form-group">
            <label for="edit-book-author" class="form-label">
              Author <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="edit-book-author"
              name="author"
              class="form-input"
              required
              maxlength="200"
              value="${this.escapeHtml(author)}"
              aria-required="true"
              aria-describedby="edit-author-error"
            />
            <div id="edit-author-error" class="form-error" role="alert"></div>
          </div>

          <div class="form-group">
            <label for="edit-book-edition" class="form-label">Edition</label>
            <input
              type="text"
              id="edit-book-edition"
              name="edition"
              class="form-input"
              maxlength="100"
              value="${this.escapeHtml(edition || '')}"
            />
          </div>

          <div class="form-group">
            <label for="edit-book-isbn" class="form-label">ISBN</label>
            <input
              type="text"
              id="edit-book-isbn"
              name="isbn"
              class="form-input"
              maxlength="17"
              pattern="[0-9-]{10,17}"
              value="${this.escapeHtml(isbn || '')}"
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <button type="button" id="edit-cancel-btn" class="btn btn-secondary">Cancel</button>
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
    const form = this.container.querySelector('#edit-book-form');
    const cancelBtn = this.container.querySelector('#edit-cancel-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.validate()) {
        const formData = new FormData(form);
        const bookUpdates = {
          title: formData.get('title'),
          author: formData.get('author'),
          edition: formData.get('edition') || undefined,
          isbn: formData.get('isbn') || undefined,
        };

        try {
          await this.onSubmit(bookUpdates);
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
    const form = this.container.querySelector('#edit-book-form');
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
    const errorElement = document.getElementById(`edit-${input.name}-error`);
    const value = input.value.trim();

    // Clear previous error
    if (errorElement) {
      errorElement.textContent = '';
    }
    input.removeAttribute('aria-invalid');

    if (input.required && !value) {
      if (errorElement) {
        errorElement.textContent = `${input.name.charAt(0).toUpperCase() + input.name.slice(1)} is required`;
      }
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    if (input.maxLength && value.length > input.maxLength) {
      if (errorElement) {
        errorElement.textContent = `${input.name.charAt(0).toUpperCase() + input.name.slice(1)} must be ${input.maxLength} characters or less`;
      }
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
    alert(message);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear the form
   */
  clear() {
    const form = this.container.querySelector('#edit-book-form');
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

export default EditBookForm;
