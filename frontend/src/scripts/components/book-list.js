/**
 * BookList component (T059)
 * Renders book cards with keyboard navigation and ARIA live regions
 */

export class BookList {
  constructor(options) {
    this.container = options.container;
    this.books = options.books || [];
    this.status = options.status;
    this.onBookClick = options.onBookClick || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
  }

  /**
   * Render the book list
   */
  render() {
    if (this.books.length === 0) {
      this.container.innerHTML = `
        <div class="book-list-empty">
          No books in this section yet.
        </div>
      `;
      return;
    }

    const booksHtml = this.books
      .map((entry) => this.renderBookCard(entry))
      .join('');

    this.container.innerHTML = `
      <div class="book-list" role="list">
        ${booksHtml}
      </div>
      <div aria-live="polite" class="sr-only"></div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render a single book card
   * @param {Object} entry - Reading entry
   * @returns {string} HTML string
   */
  renderBookCard(entry) {
    const { id, book, status } = entry;
    const { title, author, edition } = book;

    return `
      <article
        class="book-card"
        data-testid="book-card"
        data-entry-id="${id}"
        data-status="${status}"
        tabindex="0"
        role="listitem"
        aria-label="${title} by ${author}"
      >
        <h3 class="book-title">${this.escapeHtml(title)}</h3>
        <p class="book-author">by ${this.escapeHtml(author)}</p>
        ${edition ? `<p class="book-edition">${this.escapeHtml(edition)}</p>` : ''}

        <div class="book-actions">
          ${this.renderStatusButtons(entry)}
        </div>
      </article>
    `;
  }

  /**
   * Render status change buttons
   * @param {Object} entry - Reading entry
   * @returns {string} HTML string
   */
  renderStatusButtons(entry) {
    const { id, status } = entry;
    const buttons = [];

    if (status !== 'TO_READ') {
      buttons.push(`
        <button
          type="button"
          class="btn btn-small btn-secondary"
          data-action="status-change"
          data-entry-id="${id}"
          data-new-status="TO_READ"
          aria-label="Move to To Read"
        >
          To Read
        </button>
      `);
    }

    if (status !== 'READING') {
      buttons.push(`
        <button
          type="button"
          class="btn btn-small btn-secondary"
          data-action="status-change"
          data-entry-id="${id}"
          data-new-status="READING"
          aria-label="Move to Reading"
        >
          Reading
        </button>
      `);
    }

    if (status !== 'FINISHED') {
      buttons.push(`
        <button
          type="button"
          class="btn btn-small btn-secondary"
          data-action="status-change"
          data-entry-id="${id}"
          data-new-status="FINISHED"
          aria-label="Move to Finished"
        >
          Finished
        </button>
      `);
    }

    return buttons.join('');
  }

  /**
   * Attach event listeners to book cards
   */
  attachEventListeners() {
    const cards = this.container.querySelectorAll('.book-card');

    cards.forEach((card) => {
      // Click handler
      card.addEventListener('click', (e) => {
        if (!e.target.hasAttribute('data-action')) {
          const entryId = card.getAttribute('data-entry-id');
          const entry = this.books.find((b) => b.id === entryId);
          this.onBookClick(entry);
        }
      });

      // Keyboard handler
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const entryId = card.getAttribute('data-entry-id');
          const entry = this.books.find((b) => b.id === entryId);
          this.onBookClick(entry);
        }
      });
    });

    // Status change buttons
    const statusButtons = this.container.querySelectorAll('[data-action="status-change"]');

    statusButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entryId = button.getAttribute('data-entry-id');
        const newStatus = button.getAttribute('data-new-status');

        await this.onStatusChange(entryId, newStatus);
      });
    });
  }

  /**
   * Update the book list with new data
   * @param {Array} books - Updated books
   */
  update(books) {
    this.books = books;
    this.render();

    // Announce update to screen readers
    const liveRegion = this.container.querySelector('[aria-live]');
    if (liveRegion) {
      liveRegion.textContent = `Book list updated. Showing ${books.length} book${books.length !== 1 ? 's' : ''}.`;
    }
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
}

export default BookList;
