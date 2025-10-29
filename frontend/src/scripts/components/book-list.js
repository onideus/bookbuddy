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
    this.onEdit = options.onEdit || (() => {});
    this.onDelete = options.onDelete || (() => {});
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
    const { id, book, status, rating, reflectionNote } = entry;
    const { title, author, edition } = book;

    return `
      <article
        class="book-card"
        data-testid="book-card"
        data-entry-id="${id}"
        data-status="${status}"
        tabindex="0"
        role="listitem"
        aria-label="${title} by ${author}${rating ? `, rated ${rating} out of 5 stars` : ''}"
      >
        <h3 class="book-title">${this.escapeHtml(title)}</h3>
        <p class="book-author">by ${this.escapeHtml(author)}</p>
        ${edition ? `<p class="book-edition">${this.escapeHtml(edition)}</p>` : ''}

        ${this.renderRating(rating, reflectionNote)}

        <div class="book-actions">
          ${this.renderStatusButtons(entry)}
          <button
            type="button"
            class="btn btn-small btn-secondary"
            data-action="edit"
            data-entry-id="${id}"
            aria-label="Edit book details"
            title="Edit book details"
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            class="btn btn-small btn-danger"
            data-action="delete"
            data-entry-id="${id}"
            aria-label="Delete book"
            title="Delete book"
          >
            🗑️ Delete
          </button>
        </div>
      </article>
    `;
  }

  /**
   * Render rating display (T110)
   * @param {number|null} rating - Rating (1-5)
   * @param {string|null} reflectionNote - Reflection note
   * @returns {string} HTML string
   */
  renderRating(rating, reflectionNote) {
    if (!rating) {
      return '';
    }

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? '★' : '☆');
    }

    return `
      <div class="book-rating" data-testid="book-rating">
        <div class="rating-stars-display" role="img" aria-label="${rating} out of 5 stars">
          ${stars.join('')}
        </div>
        ${reflectionNote ? `
          <button
            type="button"
            class="reflection-preview"
            data-action="show-reflection"
            aria-label="View reflection note"
            title="${this.escapeHtml(reflectionNote.substring(0, 100))}${reflectionNote.length > 100 ? '...' : ''}"
          >
            💭
          </button>
        ` : ''}
      </div>
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

    // Edit buttons
    const editButtons = this.container.querySelectorAll('[data-action="edit"]');

    editButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = button.getAttribute('data-entry-id');
        const entry = this.books.find((b) => b.id === entryId);

        this.onEdit(entry);
      });
    });

    // Delete buttons
    const deleteButtons = this.container.querySelectorAll('[data-action="delete"]');

    deleteButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entryId = button.getAttribute('data-entry-id');
        const entry = this.books.find((b) => b.id === entryId);

        // Confirm deletion
        const confirmDelete = confirm(
          `Are you sure you want to delete "${entry.book.title}"? This will remove all progress notes and ratings.`
        );

        if (confirmDelete) {
          await this.onDelete(entryId);
        }
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
