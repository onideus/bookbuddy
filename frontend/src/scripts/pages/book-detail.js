/**
 * Book Detail Page Initialization (T087)
 * Loads book data, progress notes, and wires up components
 */

import { ProgressNotesList } from '../components/progress-notes-list.js';
import { AddProgressNoteForm } from '../components/add-progress-note-form.js';
import { getProgressNotes } from '../api/progress-notes-api.js';
import { getEntries } from '../api/reading-entries-api.js';

class BookDetailPage {
  constructor() {
    this.entryId = null;
    this.bookData = null;
    this.progressNotesList = null;
    this.addProgressNoteForm = null;
  }

  async init() {
    this.entryId = this.getEntryIdFromURL();

    if (!this.entryId) {
      this.showError('No reading entry specified. Please navigate from the dashboard.');
      return;
    }

    await this.loadBookData();
    this.initializeComponents();
    await this.loadProgressNotes();
  }

  getEntryIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('entryId');
  }

  async loadBookData() {
    try {
      const readerId = this.getCurrentReaderId();
      const response = await getEntries(readerId);
      const entries = response.entries || response;

      this.bookData = entries.find(entry => entry.id === this.entryId);

      if (!this.bookData) {
        this.showError('Book not found.');
        return;
      }

      if (!this.bookData.book) {
        this.showError('Book data is incomplete.');
        return;
      }

      this.displayBookInfo(this.bookData.book, this.bookData.status);

    } catch (error) {
      console.error('Failed to load book data:', error);
      this.showError('Failed to load book information. Please try again.');
    }
  }

  getCurrentReaderId() {
    const readerId = sessionStorage.getItem('readerId');

    if (!readerId) {
      const mockReaderId = '00000000-0000-0000-0000-000000000001';
      sessionStorage.setItem('readerId', mockReaderId);
      return mockReaderId;
    }

    return readerId;
  }

  displayBookInfo(book, status) {
    const titleElement = document.querySelector('[data-testid="book-title"]');
    const authorElement = document.querySelector('[data-testid="book-author"]');
    const editionElement = document.querySelector('[data-testid="book-edition"]');
    const statusElement = document.querySelector('[data-testid="book-status"]');

    if (titleElement) {
      titleElement.textContent = book.title || 'Unknown Title';
    }

    if (authorElement) {
      authorElement.textContent = 'by ' + (book.author || 'Unknown Author');
    }

    if (editionElement && book.edition) {
      editionElement.textContent = book.edition;
    } else if (editionElement) {
      editionElement.style.display = 'none';
    }

    if (statusElement) {
      statusElement.textContent = status || 'READING';
      statusElement.className = 'book-status-badge status-' + (status || 'READING').toLowerCase();
    }

    document.title = (book.title || 'Book Detail') + ' - BookBuddy';
  }

  initializeComponents() {
    const notesListContainer = document.getElementById('progress-notes-list');
    if (notesListContainer) {
      this.progressNotesList = new ProgressNotesList(notesListContainer);
      this.progressNotesList.startTimestampUpdates();
    }

    const formElement = document.getElementById('add-progress-note-form');
    if (formElement) {
      this.addProgressNoteForm = new AddProgressNoteForm(
        formElement,
        this.handleNoteAdded.bind(this)
      );
      this.addProgressNoteForm.setEntryId(this.entryId);
    }
  }

  async loadProgressNotes() {
    if (!this.progressNotesList) {
      return;
    }

    try {
      this.progressNotesList.showLoading();

      const notes = await getProgressNotes(this.entryId);

      this.progressNotesList.render(notes);

    } catch (error) {
      console.error('Failed to load progress notes:', error);
      this.showError('Failed to load progress notes. Please refresh the page.');
    } finally {
      this.progressNotesList.hideLoading();
    }
  }

  handleNoteAdded(note) {
    if (this.progressNotesList) {
      this.progressNotesList.addNote(note);
    }
  }

  showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'page-error';
    errorContainer.setAttribute('role', 'alert');
    errorContainer.innerHTML = '<h2>Error</h2><p>' + message + '</p>';
    errorContainer.innerHTML += '<a href="/src/pages/dashboard.html" class="btn btn-primary">Back to Dashboard</a>';

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = '';
      mainContent.appendChild(errorContainer);
    }
  }

  destroy() {
    if (this.progressNotesList) {
      this.progressNotesList.destroy();
    }

    if (this.addProgressNoteForm) {
      this.addProgressNoteForm.destroy();
    }
  }
}

const page = new BookDetailPage();
page.init().catch(error => {
  console.error('Failed to initialize book detail page:', error);
});

window.addEventListener('beforeunload', () => {
  if (page) {
    page.destroy();
  }
});

export default BookDetailPage;
