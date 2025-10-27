/**
 * Dashboard page initialization (T062)
 * Wires up components, BookStore, event listeners, loads initial data
 */

import { BookStore } from '../services/book-store.js';
import { BookList } from '../components/book-list.js';
import { AddBookForm } from '../components/add-book-form.js';
import { StatusFilter } from '../components/status-filter.js';
import * as readingEntriesApi from '../api/reading-entries-api.js';

// Initialize store
const bookStore = new BookStore();

// Mock reader ID for development (in production, this would come from auth)
const READER_ID = '00000000-0000-0000-0000-000000000001';

// Component instances
let toReadList, readingList, finishedList;
let addBookForm;
let statusFilter;

/**
 * Initialize the dashboard
 */
async function initDashboard() {
  // Show loading
  showLoading(true);

  // Initialize components
  initComponents();

  // Load initial data
  await loadBooks();

  // Hide loading
  showLoading(false);
}

/**
 * Initialize all components
 */
function initComponents() {
  // Initialize book lists
  toReadList = new BookList({
    container: document.getElementById('to-read-list'),
    status: 'TO_READ',
    books: [],
    onBookClick: handleBookClick,
    onStatusChange: handleStatusChange,
  });

  readingList = new BookList({
    container: document.getElementById('reading-list'),
    status: 'READING',
    books: [],
    onBookClick: handleBookClick,
    onStatusChange: handleStatusChange,
  });

  finishedList = new BookList({
    container: document.getElementById('finished-list'),
    status: 'FINISHED',
    books: [],
    onBookClick: handleBookClick,
    onStatusChange: handleStatusChange,
  });

  // Initialize add book form
  const formContainer = document.getElementById('add-book-form-container');
  addBookForm = new AddBookForm({
    container: formContainer,
    onSubmit: handleAddBook,
    onCancel: () => {
      formContainer.style.display = 'none';
    },
  });

  // Add book button
  const addBookBtn = document.getElementById('add-book-btn');
  addBookBtn.addEventListener('click', () => {
    formContainer.style.display = 'block';
    addBookForm.render();
    // Focus first input
    setTimeout(() => {
      document.getElementById('book-title')?.focus();
    }, 100);
  });

  // Initialize status filter
  statusFilter = new StatusFilter({
    selectElement: document.getElementById('status-filter'),
    announcerElement: document.getElementById('status-announcer'),
    onChange: (status) => {
      bookStore.setFilter(status);
    },
  });
  statusFilter.init();

  // Subscribe to store events
  bookStore.on('entries-updated', ({ entries }) => {
    updateLists();
  });
}

/**
 * Load books from API
 */
async function loadBooks() {
  try {
    const result = await readingEntriesApi.getEntries(READER_ID);
    bookStore.setEntries(result.entries);
    updateLists();
  } catch (error) {
    console.error('Failed to load books:', error);
    showError('Failed to load your books. Please try again.');
  }
}

/**
 * Handle adding a new book
 * @param {Object} bookData - Book data from form
 */
async function handleAddBook(bookData) {
  try {
    // Optimistic UI update (FR-013)
    const tempEntry = {
      id: 'temp-' + Date.now(),
      book: {
        title: bookData.title,
        author: bookData.author,
        edition: bookData.edition,
      },
      status: bookData.status,
      _pending: true,
    };

    bookStore.addEntry(tempEntry);
    updateLists();

    // Hide form
    document.getElementById('add-book-form-container').style.display = 'none';

    // Make API call
    const newEntry = await readingEntriesApi.addBook(READER_ID, bookData);

    // Replace temp entry with real one
    bookStore.removeEntry(tempEntry.id);
    bookStore.addEntry(newEntry);
    updateLists();
  } catch (error) {
    console.error('Failed to add book:', error);
    showError(error.message || 'Failed to add book. Please try again.');

    // Remove temp entry on error
    const tempEntry = bookStore.entries.find((e) => e._pending);
    if (tempEntry) {
      bookStore.removeEntry(tempEntry.id);
      updateLists();
    }
  }
}

/**
 * Handle book click - navigate to detail page
 * @param {Object} entry - Reading entry
 */
function handleBookClick(entry) {
  if (!entry || !entry.id) {
    return;
  }

  // Navigate to book detail page with entry ID
  window.location.href = `/src/pages/book-detail.html?entryId=${entry.id}`;
}

/**
 * Handle status change for a book
 * @param {string} entryId - Entry ID
 * @param {string} newStatus - New status
 */
async function handleStatusChange(entryId, newStatus) {
  const entry = bookStore.entries.find((e) => e.id === entryId);

  if (!entry) {
    return;
  }

  const oldStatus = entry.status;

  try {
    // Optimistic UI update
    bookStore.updateEntry(entryId, { status: newStatus });
    updateLists();

    // Make API call
    await readingEntriesApi.updateStatus(entryId, newStatus, entry.updatedAt);

    // Reload to get updated timestamp
    await loadBooks();
  } catch (error) {
    console.error('Failed to update status:', error);

    // Revert on error
    bookStore.updateEntry(entryId, { status: oldStatus });
    updateLists();

    showError(error.message || 'Failed to update book status. Please try again.');
  }
}

/**
 * Update all book lists
 */
function updateLists() {
  const toReadBooks = bookStore.getEntriesByStatus('TO_READ');
  const readingBooks = bookStore.getEntriesByStatus('READING');
  const finishedBooks = bookStore.getEntriesByStatus('FINISHED');

  toReadList.update(toReadBooks);
  readingList.update(readingBooks);
  finishedList.update(finishedBooks);
}

/**
 * Show/hide loading indicator
 * @param {boolean} show - Show loading
 */
function showLoading(show) {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = show ? 'block' : 'none';
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  // Simple alert for now - could be enhanced with a toast notification
  alert(message);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
