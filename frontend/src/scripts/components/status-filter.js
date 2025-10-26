/**
 * StatusFilter component (T061)
 * Dropdown filter with keyboard accessibility and ARIA announcements
 */

export class StatusFilter {
  constructor(options) {
    this.selectElement = options.selectElement;
    this.announcerElement = options.announcerElement;
    this.onChange = options.onChange || (() => {});
  }

  /**
   * Initialize the filter
   */
  init() {
    this.selectElement.addEventListener('change', (e) => {
      const selectedStatus = e.target.value;
      this.onChange(selectedStatus);
      this.announce(selectedStatus);
    });
  }

  /**
   * Announce filter change to screen readers
   * @param {string} status - Selected status
   */
  announce(status) {
    if (!this.announcerElement) {
      return;
    }

    let message;
    if (!status) {
      message = 'Showing all books';
    } else {
      const statusLabel = this.selectElement.querySelector(`option[value="${status}"]`).textContent;
      message = `Showing ${statusLabel} books`;
    }

    this.announcerElement.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      this.announcerElement.textContent = '';
    }, 1000);
  }

  /**
   * Get current filter value
   * @returns {string} Current status filter
   */
  getValue() {
    return this.selectElement.value;
  }

  /**
   * Set filter value
   * @param {string} status - Status to set
   */
  setValue(status) {
    this.selectElement.value = status;
    this.announce(status);
  }
}

export default StatusFilter;
