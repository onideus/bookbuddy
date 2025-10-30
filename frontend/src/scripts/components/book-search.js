/**
 * BookSearch component (T032-T034)
 * Integrated search interface for finding books via external APIs
 */

import { searchBooksDebounced, createFromSearch } from '../api/book-search-api.js';

export class BookSearch {
  constructor(options) {
    this.container = options.container;
    this.onSelect = options.onSelect || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.currentQuery = '';
    this.results = [];
    this.loading = false;
  }

  /**
   * Render the search interface
   */
  render() {
    this.container.innerHTML = `
      <div class="book-search">
        <div class="search-header">
          <h2>Search for a Book</h2>
          <button type="button" class="btn-close" aria-label="Close search">×</button>
        </div>

        <div class="search-input-wrapper">
          <input
            type="search"
            id="book-search-input"
            class="search-input"
            placeholder="Search by title, author, or ISBN..."
            aria-label="Book search"
          />
          <div class="search-loading hidden" role="status" aria-live="polite">
            Searching...
          </div>
        </div>

        <div id="search-results" class="search-results" role="region" aria-live="polite">
          <p class="search-hint">Enter at least 2 characters to search</p>
        </div>

        <div class="search-footer">
          <button type="button" class="btn-secondary" id="btn-manual-entry">
            Add Manually Instead
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const searchInput = this.container.querySelector('#book-search-input');
    const closeBtn = this.container.querySelector('.btn-close');
    const manualBtn = this.container.querySelector('#btn-manual-entry');

    // Search input with debounce
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim();

      if (query.length < 2) {
        this.showHint('Enter at least 2 characters to search');
        return;
      }

      this.currentQuery = query;
      this.setLoading(true);

      try {
        const response = await searchBooksDebounced(query);
        this.results = response.data.results || [];
        this.renderResults(this.results, response.data.fromCache);
      } catch (error) {
        this.showError('Search failed. Please try again.');
        console.error('Search error:', error);
      } finally {
        this.setLoading(false);
      }
    });

    // Close button
    closeBtn.addEventListener('click', () => {
      this.onCancel();
    });

    // Manual entry button
    manualBtn.addEventListener('click', () => {
      this.onCancel();
    });
  }

  /**
   * Render search results
   */
  renderResults(results, fromCache = false) {
    const resultsContainer = this.container.querySelector('#search-results');

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <p>No books found for "${this.currentQuery}"</p>
          <p class="text-muted">Try adjusting your search or add the book manually</p>
        </div>
      `;
      return;
    }

    const cacheLabel = fromCache ? '<span class="cache-badge">Cached</span>' : '';

    resultsContainer.innerHTML = `
      <div class="results-header">
        <p>${results.length} results found ${cacheLabel}</p>
      </div>
      <div class="results-list">
        ${results.map((book, index) => this.renderBookCard(book, index)).join('')}
      </div>
    `;

    // Attach click handlers to result cards
    results.forEach((book, index) => {
      const card = resultsContainer.querySelector(`#book-result-${index}`);
      card.addEventListener('click', () => this.selectBook(book));
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectBook(book);
        }
      });
    });
  }

  /**
   * Render individual book card
   */
  renderBookCard(book, index) {
    const coverImg = book.coverImageUrl
      ? `<img src="${book.coverImageUrl}" alt="Cover of ${book.title}" class="book-cover">`
      : `<div class="book-cover-placeholder">No cover</div>`;

    const subtitle = book.subtitle ? `<p class="book-subtitle">${book.subtitle}</p>` : '';
    const publisher = book.publisher ? `<span class="book-publisher">${book.publisher}</span>` : '';
    const year = book.publishedDate ? `<span class="book-year">${book.publishedDate.substring(0, 4)}</span>` : '';
    const isbn = book.isbn13 || book.isbn10 || '';

    return `
      <div
        id="book-result-${index}"
        class="book-card"
        role="button"
        tabindex="0"
        aria-label="Select ${book.title} by ${book.author}"
      >
        <div class="book-cover-container">
          ${coverImg}
        </div>
        <div class="book-info">
          <h3 class="book-title">${book.title}</h3>
          ${subtitle}
          <p class="book-author">${book.author}</p>
          <div class="book-meta">
            ${publisher}
            ${year}
            ${isbn ? `<span class="book-isbn">ISBN: ${isbn}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle book selection
   */
  async selectBook(book) {
    this.onSelect(book);
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.loading = loading;
    const loadingEl = this.container.querySelector('.search-loading');
    if (loadingEl) {
      loadingEl.classList.toggle('hidden', !loading);
    }
  }

  /**
   * Show hint message
   */
  showHint(message) {
    const resultsContainer = this.container.querySelector('#search-results');
    resultsContainer.innerHTML = `<p class="search-hint">${message}</p>`;
  }

  /**
   * Show error message
   */
  showError(message) {
    const resultsContainer = this.container.querySelector('#search-results');
    resultsContainer.innerHTML = `<p class="search-error" role="alert">${message}</p>`;
  }

  /**
   * Clean up
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

export default BookSearch;
