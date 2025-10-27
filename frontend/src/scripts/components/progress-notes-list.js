/**
 * ProgressNotesList Component (T085)
 * Renders progress notes timeline with accessibility support
 */

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    const unit = diffInMinutes === 1 ? 'minute' : 'minutes';
    return diffInMinutes + ' ' + unit + ' ago';
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const unit = diffInHours === 1 ? 'hour' : 'hours';
    return diffInHours + ' ' + unit + ' ago';
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const unit = diffInDays === 1 ? 'day' : 'days';
    return diffInDays + ' ' + unit + ' ago';
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    const unit = diffInWeeks === 1 ? 'week' : 'weeks';
    return diffInWeeks + ' ' + unit + ' ago';
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    const unit = diffInMonths === 1 ? 'month' : 'months';
    return diffInMonths + ' ' + unit + ' ago';
  }

  const diffInYears = Math.floor(diffInDays / 365);
  const unit = diffInYears === 1 ? 'year' : 'years';
  return diffInYears + ' ' + unit + ' ago';
}

function createNoteItem(note) {
  const noteItem = document.createElement('div');
  noteItem.className = 'note-item';
  noteItem.setAttribute('data-testid', 'progress-note-item');
  noteItem.setAttribute('role', 'listitem');
  noteItem.setAttribute('data-note-id', note.noteId);

  const noteHeader = document.createElement('div');
  noteHeader.className = 'note-header';

  const noteTimestamp = document.createElement('time');
  noteTimestamp.className = 'note-timestamp';
  noteTimestamp.setAttribute('data-testid', 'progress-note-timestamp');
  noteTimestamp.setAttribute('datetime', note.recordedAt);
  noteTimestamp.textContent = formatRelativeTime(note.recordedAt);
  noteTimestamp.setAttribute('title', new Date(note.recordedAt).toLocaleString());

  noteHeader.appendChild(noteTimestamp);

  if (note.progressMarker) {
    const noteMarker = document.createElement('span');
    noteMarker.className = 'note-marker';
    noteMarker.setAttribute('data-testid', 'progress-note-marker');
    noteMarker.textContent = note.progressMarker;
    noteHeader.appendChild(noteMarker);
  }

  const noteContent = document.createElement('p');
  noteContent.className = 'note-content';
  noteContent.textContent = note.content;

  noteItem.appendChild(noteHeader);
  noteItem.appendChild(noteContent);

  return noteItem;
}

export class ProgressNotesList {
  constructor(container) {
    this.container = container;
    this.notes = [];
    this.emptyStateElement = document.getElementById('empty-progress-state');
    this.loadingStateElement = document.getElementById('notes-loading-state');
  }

  render(notes) {
    this.notes = notes || [];
    this.container.innerHTML = '';

    if (this.notes.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();
    this.notes.forEach((note) => {
      const noteElement = createNoteItem(note);
      this.container.appendChild(noteElement);
    });

    const count = this.notes.length;
    const unit = count === 1 ? 'note' : 'notes';
    this.announceUpdate(count + ' progress ' + unit + ' loaded');
  }

  addNote(note) {
    this.hideEmptyState();
    this.notes.unshift(note);

    const noteElement = createNoteItem(note);
    this.container.prepend(noteElement);

    this.announceUpdate('New progress note added');

    noteElement.classList.add('note-item-new');
    setTimeout(() => {
      noteElement.classList.remove('note-item-new');
    }, 300);
  }

  showLoading() {
    if (this.loadingStateElement) {
      this.loadingStateElement.hidden = false;
    }
    this.container.setAttribute('aria-busy', 'true');
  }

  hideLoading() {
    if (this.loadingStateElement) {
      this.loadingStateElement.hidden = true;
    }
    this.container.setAttribute('aria-busy', 'false');
  }

  showEmptyState() {
    if (this.emptyStateElement) {
      this.emptyStateElement.hidden = false;
    }
  }

  hideEmptyState() {
    if (this.emptyStateElement) {
      this.emptyStateElement.hidden = true;
    }
  }

  clear() {
    this.notes = [];
    this.container.innerHTML = '';
    this.showEmptyState();
  }

  announceUpdate(message) {
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  startTimestampUpdates() {
    this.timestampUpdateInterval = setInterval(() => {
      const timestamps = this.container.querySelectorAll('.note-timestamp');
      timestamps.forEach((timestamp) => {
        const datetime = timestamp.getAttribute('datetime');
        if (datetime) {
          timestamp.textContent = formatRelativeTime(datetime);
        }
      });
    }, 60000);
  }

  stopTimestampUpdates() {
    if (this.timestampUpdateInterval) {
      clearInterval(this.timestampUpdateInterval);
      this.timestampUpdateInterval = null;
    }
  }

  getNotes() {
    return this.notes;
  }

  destroy() {
    this.stopTimestampUpdates();
    this.clear();
  }
}

export default ProgressNotesList;
