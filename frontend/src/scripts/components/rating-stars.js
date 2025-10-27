/**
 * RatingStars Component (T108)
 * Interactive 1-5 star rating UI with keyboard accessibility
 */

/**
 * RatingStars - Interactive star rating component
 * Features:
 * - 1-5 star selection
 * - Keyboard accessible with arrow keys
 * - ARIA labels for screen readers
 * - Hover and focus states
 * - Read-only display mode
 */
export class RatingStars {
  /**
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @param {number} [options.rating] - Initial rating (0-5)
   * @param {boolean} [options.readonly] - Read-only mode (default: false)
   * @param {Function} [options.onChange] - Callback when rating changes
   * @param {string} [options.size] - Size variant ('small', 'medium', 'large')
   */
  constructor(container, options = {}) {
    this.container = container;
    this.rating = options.rating || 0;
    this.readonly = options.readonly || false;
    this.onChange = options.onChange || null;
    this.size = options.size || 'medium';
    this.hoveredRating = 0;

    this.render();
    this.attachEventListeners();
  }

  render() {
    const ratingId = 'rating-' + Math.random().toString(36).substr(2, 9);

    this.container.innerHTML = `
      <div class="rating-stars ${this.readonly ? 'readonly' : 'interactive'} size-${this.size}"
           role="${this.readonly ? 'img' : 'radiogroup'}"
           aria-label="${this.readonly ? `Rating: ${this.rating} out of 5 stars` : 'Select a rating from 1 to 5 stars'}"
           ${!this.readonly ? `tabindex="0"` : ''}
           data-rating="${this.rating}">
        ${this.renderStars()}
      </div>
    `;

    this.starsContainer = this.container.querySelector('.rating-stars');
  }

  renderStars() {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = i <= (this.hoveredRating || this.rating);
      const starIcon = filled ? '★' : '☆';

      if (this.readonly) {
        stars.push(`
          <span class="star ${filled ? 'filled' : 'empty'}"
                aria-hidden="true">
            ${starIcon}
          </span>
        `);
      } else {
        stars.push(`
          <button type="button"
                  class="star ${filled ? 'filled' : 'empty'}"
                  data-rating="${i}"
                  aria-label="${i} star${i !== 1 ? 's' : ''}"
                  tabindex="-1">
            ${starIcon}
          </button>
        `);
      }
    }

    return stars.join('');
  }

  attachEventListeners() {
    if (this.readonly) {
      return;
    }

    const stars = this.container.querySelectorAll('.star');

    // Click events
    stars.forEach((star) => {
      star.addEventListener('click', (e) => {
        const newRating = parseInt(e.target.dataset.rating, 10);
        this.setRating(newRating);
      });

      // Hover events
      star.addEventListener('mouseenter', (e) => {
        this.hoveredRating = parseInt(e.target.dataset.rating, 10);
        this.updateStars();
      });
    });

    // Reset hover on mouse leave
    this.starsContainer.addEventListener('mouseleave', () => {
      this.hoveredRating = 0;
      this.updateStars();
    });

    // Keyboard navigation
    this.starsContainer.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }

  handleKeyDown(e) {
    const currentRating = this.rating || 1;
    let newRating = currentRating;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newRating = Math.min(5, currentRating + 1);
        break;

      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newRating = Math.max(1, currentRating - 1);
        break;

      case 'Home':
        e.preventDefault();
        newRating = 1;
        break;

      case 'End':
        e.preventDefault();
        newRating = 5;
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        newRating = parseInt(e.key, 10);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        // Select current rating if any
        if (this.rating > 0) {
          this.announceRating(this.rating);
        }
        return;

      default:
        return;
    }

    this.setRating(newRating);
  }

  setRating(newRating) {
    if (newRating < 1 || newRating > 5) {
      return;
    }

    const oldRating = this.rating;
    this.rating = newRating;
    this.hoveredRating = 0;

    this.updateStars();
    this.starsContainer.dataset.rating = newRating;
    this.announceRating(newRating);

    if (this.onChange && oldRating !== newRating) {
      this.onChange(newRating);
    }
  }

  updateStars() {
    const stars = this.container.querySelectorAll('.star');
    const displayRating = this.hoveredRating || this.rating;

    stars.forEach((star, index) => {
      const starRating = index + 1;
      const filled = starRating <= displayRating;

      if (filled) {
        star.classList.add('filled');
        star.classList.remove('empty');
        star.textContent = '★';
      } else {
        star.classList.remove('filled');
        star.classList.add('empty');
        star.textContent = '☆';
      }
    });
  }

  announceRating(rating) {
    // Update ARIA label for screen readers
    this.starsContainer.setAttribute(
      'aria-label',
      `${rating} star${rating !== 1 ? 's' : ''} selected`
    );

    // Create live region announcement
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `Rating: ${rating} out of 5 stars`;

    this.container.appendChild(announcement);

    // Remove announcement after it's been read
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }

  getRating() {
    return this.rating;
  }

  setReadonly(readonly) {
    this.readonly = readonly;
    this.render();
    this.attachEventListeners();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

export default RatingStars;
