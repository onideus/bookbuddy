/**
 * AddProgressNoteForm Component (T086)
 * Handles progress note form submission with validation and optimistic UI
 */

import { addProgressNote } from '../api/progress-notes-api.js';

export class AddProgressNoteForm {
  constructor(formElement, onNoteAdded) {
    this.form = formElement;
    this.onNoteAdded = onNoteAdded;

    this.noteTextarea = this.form.querySelector('#progress-note-textarea');
    this.pageChapterInput = this.form.querySelector('#page-chapter-input');
    this.submitButton = this.form.querySelector('#add-progress-note-button');
    this.errorMessageElement = this.form.querySelector('#form-error-message');
    this.charCountElement = this.form.querySelector('#current-char-count');

    this.entryId = null;
    this.isSubmitting = false;

    this.init();
  }

  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.noteTextarea.addEventListener('input', this.updateCharCount.bind(this));
    this.noteTextarea.addEventListener('input', this.clearError.bind(this));
    this.pageChapterInput.addEventListener('input', this.clearError.bind(this));
  }

  setEntryId(entryId) {
    this.entryId = entryId;
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.isSubmitting) {
      return;
    }

    const noteContent = this.noteTextarea.value.trim();
    const progressMarker = this.pageChapterInput.value.trim() || null;

    if (!this.validate(noteContent, progressMarker)) {
      return;
    }

    if (!this.entryId) {
      this.showError('Entry ID is missing. Please refresh the page.');
      return;
    }

    this.isSubmitting = true;
    this.setLoadingState(true);
    this.clearError();

    try {
      const noteData = {
        content: noteContent,
        progressMarker: progressMarker
      };

      const result = await addProgressNote(this.entryId, noteData);

      if (this.onNoteAdded) {
        this.onNoteAdded(result);
      }

      this.clearForm();
      this.showSuccess('Progress note added successfully!');

      this.noteTextarea.focus();

    } catch (error) {
      console.error('Failed to add progress note:', error);

      let errorMessage = 'Failed to add progress note. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.status === 404) {
        errorMessage = 'Reading entry not found.';
      } else if (error.status === 400) {
        errorMessage = error.message || 'Invalid note data. Please check your input.';
      } else if (error.status === 429) {
        errorMessage = 'Too many notes added. Please wait a moment and try again.';
      }

      this.showError(errorMessage);

    } finally {
      this.isSubmitting = false;
      this.setLoadingState(false);
    }
  }

  validate(noteContent, progressMarker) {
    if (!noteContent || noteContent.length === 0) {
      this.showError('Note content is required.');
      this.noteTextarea.focus();
      return false;
    }

    if (noteContent.length > 1000) {
      this.showError('Note must not exceed 1000 characters.');
      this.noteTextarea.focus();
      return false;
    }

    if (progressMarker && progressMarker.length > 50) {
      this.showError('Page or chapter marker must not exceed 50 characters.');
      this.pageChapterInput.focus();
      return false;
    }

    return true;
  }

  updateCharCount() {
    const currentLength = this.noteTextarea.value.length;
    this.charCountElement.textContent = currentLength;

    if (currentLength > 1000) {
      this.charCountElement.parentElement.classList.add('char-count-exceeded');
    } else {
      this.charCountElement.parentElement.classList.remove('char-count-exceeded');
    }
  }

  clearForm() {
    this.noteTextarea.value = '';
    this.pageChapterInput.value = '';
    this.updateCharCount();
    this.clearError();
  }

  setLoadingState(isLoading) {
    const btnText = this.submitButton.querySelector('.btn-text');
    const btnLoading = this.submitButton.querySelector('.btn-loading');

    if (isLoading) {
      this.submitButton.disabled = true;
      btnText.hidden = true;
      btnLoading.hidden = false;
      this.noteTextarea.disabled = true;
      this.pageChapterInput.disabled = true;
    } else {
      this.submitButton.disabled = false;
      btnText.hidden = false;
      btnLoading.hidden = true;
      this.noteTextarea.disabled = false;
      this.pageChapterInput.disabled = false;
    }
  }

  showError(message) {
    this.errorMessageElement.textContent = message;
    this.errorMessageElement.hidden = false;
    this.errorMessageElement.setAttribute('role', 'alert');

    this.form.classList.add('form-error');
  }

  clearError() {
    this.errorMessageElement.textContent = '';
    this.errorMessageElement.hidden = true;
    this.form.classList.remove('form-error');
  }

  showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.setAttribute('role', 'status');
    successElement.setAttribute('aria-live', 'polite');
    successElement.textContent = message;

    this.form.insertBefore(successElement, this.errorMessageElement);

    setTimeout(() => {
      successElement.remove();
    }, 3000);
  }

  enable() {
    this.noteTextarea.disabled = false;
    this.pageChapterInput.disabled = false;
    this.submitButton.disabled = false;
  }

  disable() {
    this.noteTextarea.disabled = true;
    this.pageChapterInput.disabled = true;
    this.submitButton.disabled = true;
  }

  destroy() {
    this.form.removeEventListener('submit', this.handleSubmit.bind(this));
    this.noteTextarea.removeEventListener('input', this.updateCharCount.bind(this));
    this.noteTextarea.removeEventListener('input', this.clearError.bind(this));
    this.pageChapterInput.removeEventListener('input', this.clearError.bind(this));
  }
}

export default AddProgressNoteForm;
