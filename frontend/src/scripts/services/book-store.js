/**
 * BookStore - State management for reading entries (T058)
 * Extends EventTarget to emit events on state changes
 */

export class BookStore extends EventTarget {
  constructor() {
    super();
    this.entries = [];
    this.filter = ''; // Status filter
    this.loading = false;
  }

  /**
   * Set all entries
   * @param {Array} entries - Reading entries
   */
  setEntries(entries) {
    this.entries = entries;
    this.dispatch('entries-updated', { entries: this.getFilteredEntries() });
  }

  /**
   * Add a new entry
   * @param {Object} entry - Reading entry
   */
  addEntry(entry) {
    this.entries.push(entry);
    this.dispatch('entry-added', { entry });
    this.dispatch('entries-updated', { entries: this.getFilteredEntries() });
  }

  /**
   * Update an existing entry
   * @param {string} entryId - Entry ID
   * @param {Object} updates - Updated fields
   */
  updateEntry(entryId, updates) {
    const index = this.entries.findIndex((e) => e.id === entryId);

    if (index !== -1) {
      this.entries[index] = { ...this.entries[index], ...updates };
      this.dispatch('entry-updated', { entry: this.entries[index] });
      this.dispatch('entries-updated', { entries: this.getFilteredEntries() });
    }
  }

  /**
   * Remove an entry
   * @param {string} entryId - Entry ID
   */
  removeEntry(entryId) {
    const index = this.entries.findIndex((e) => e.id === entryId);

    if (index !== -1) {
      const removed = this.entries.splice(index, 1)[0];
      this.dispatch('entry-removed', { entry: removed });
      this.dispatch('entries-updated', { entries: this.getFilteredEntries() });
    }
  }

  /**
   * Set status filter
   * @param {string} status - Status to filter by (or empty string for all)
   */
  setFilter(status) {
    this.filter = status;
    this.dispatch('filter-changed', { filter: status });
    this.dispatch('entries-updated', { entries: this.getFilteredEntries() });
  }

  /**
   * Get filtered entries
   * @returns {Array} Filtered entries
   */
  getFilteredEntries() {
    if (!this.filter) {
      return this.entries;
    }

    return this.entries.filter((entry) => entry.status === this.filter);
  }

  /**
   * Get entries by status
   * @param {string} status - Status
   * @returns {Array} Entries with that status
   */
  getEntriesByStatus(status) {
    return this.entries.filter((entry) => entry.status === status);
  }

  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading(isLoading) {
    this.loading = isLoading;
    this.dispatch('loading-changed', { loading: isLoading });
  }

  /**
   * Dispatch custom event
   * @param {string} eventName - Event name
   * @param {Object} detail - Event detail
   */
  dispatch(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    this.dispatchEvent(event);
  }

  /**
   * Subscribe to store events
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    this.addEventListener(eventName, (event) => callback(event.detail));
  }

  /**
   * Unsubscribe from store events
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  off(eventName, callback) {
    this.removeEventListener(eventName, callback);
  }
}

export default BookStore;
