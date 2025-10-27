/**
 * Unit tests for ProgressNotesList component (T075)
 * Tests rendering, state management, and accessibility features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressNotesList } from '../../../src/scripts/components/progress-notes-list.js';

describe('ProgressNotesList Component', () => {
  let container;
  let emptyStateElement;
  let loadingStateElement;
  let component;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="progress-notes-list" role="list" aria-live="polite"></div>
      <div id="empty-progress-state" hidden>No progress notes yet</div>
      <div id="notes-loading-state" hidden>Loading...</div>
    `;

    container = document.getElementById('progress-notes-list');
    emptyStateElement = document.getElementById('empty-progress-state');
    loadingStateElement = document.getElementById('notes-loading-state');

    component = new ProgressNotesList(container);
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('render', () => {
    it('should render empty state when no notes provided', () => {
      component.render([]);

      expect(container.innerHTML).toBe('');
      expect(emptyStateElement.hidden).toBe(false);
    });

    it('should render a single note', () => {
      const notes = [
        {
          noteId: 'note-1',
          content: 'Test note content',
          progressMarker: 'Chapter 1',
          recordedAt: new Date().toISOString()
        }
      ];

      component.render(notes);

      expect(container.children.length).toBe(1);
      expect(container.textContent).toContain('Test note content');
      expect(container.textContent).toContain('Chapter 1');
      expect(emptyStateElement.hidden).toBe(true);
    });

    it('should render multiple notes in order', () => {
      const notes = [
        {
          noteId: 'note-1',
          content: 'First note',
          recordedAt: new Date().toISOString()
        },
        {
          noteId: 'note-2',
          content: 'Second note',
          recordedAt: new Date().toISOString()
        },
        {
          noteId: 'note-3',
          content: 'Third note',
          recordedAt: new Date().toISOString()
        }
      ];

      component.render(notes);

      expect(container.children.length).toBe(3);
      
      const noteContents = Array.from(container.querySelectorAll('.note-content'))
        .map(el => el.textContent);
      
      expect(noteContents).toEqual(['First note', 'Second note', 'Third note']);
    });

    it('should render notes without progress markers', () => {
      const notes = [
        {
          noteId: 'note-1',
          content: 'Note without marker',
          progressMarker: null,
          recordedAt: new Date().toISOString()
        }
      ];

      component.render(notes);

      const markers = container.querySelectorAll('.note-marker');
      expect(markers.length).toBe(0);
    });

    it('should set proper ARIA attributes on note items', () => {
      const notes = [
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: new Date().toISOString()
        }
      ];

      component.render(notes);

      const noteItem = container.querySelector('[data-testid="progress-note-item"]');
      expect(noteItem.getAttribute('role')).toBe('listitem');
      expect(noteItem.getAttribute('data-note-id')).toBe('note-1');
    });
  });

  describe('addNote', () => {
    it('should add a note to the beginning of the list', () => {
      component.render([
        {
          noteId: 'note-1',
          content: 'Existing note',
          recordedAt: new Date().toISOString()
        }
      ]);

      const newNote = {
        noteId: 'note-2',
        content: 'New note',
        recordedAt: new Date().toISOString()
      };

      component.addNote(newNote);

      expect(container.children.length).toBe(2);
      
      const firstNote = container.querySelector('.note-content');
      expect(firstNote.textContent).toBe('New note');
    });

    it('should hide empty state when adding first note', () => {
      component.render([]);
      
      expect(emptyStateElement.hidden).toBe(false);

      component.addNote({
        noteId: 'note-1',
        content: 'First note',
        recordedAt: new Date().toISOString()
      });

      expect(emptyStateElement.hidden).toBe(true);
    });

    it('should add animation class to new note', () => {
      component.addNote({
        noteId: 'note-1',
        content: 'Animated note',
        recordedAt: new Date().toISOString()
      });

      const noteItem = container.querySelector('[data-testid="progress-note-item"]');
      expect(noteItem.classList.contains('note-item-new')).toBe(true);
    });
  });

  describe('loading states', () => {
    it('should show loading state', () => {
      component.showLoading();

      expect(loadingStateElement.hidden).toBe(false);
      expect(container.getAttribute('aria-busy')).toBe('true');
    });

    it('should hide loading state', () => {
      component.showLoading();
      component.hideLoading();

      expect(loadingStateElement.hidden).toBe(true);
      expect(container.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('empty state', () => {
    it('should show empty state', () => {
      component.showEmptyState();
      expect(emptyStateElement.hidden).toBe(false);
    });

    it('should hide empty state', () => {
      component.showEmptyState();
      component.hideEmptyState();
      expect(emptyStateElement.hidden).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all notes', () => {
      component.render([
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: new Date().toISOString()
        }
      ]);

      component.clear();

      expect(container.innerHTML).toBe('');
      expect(component.getNotes()).toEqual([]);
      expect(emptyStateElement.hidden).toBe(false);
    });
  });

  describe('timestamp formatting', () => {
    it('should display relative time', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      component.render([
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: twoHoursAgo.toISOString()
        }
      ]);

      const timestamp = container.querySelector('.note-timestamp');
      expect(timestamp.textContent).toMatch(/\d+ hours? ago/);
    });

    it('should set datetime attribute', () => {
      const now = new Date().toISOString();

      component.render([
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: now
        }
      ]);

      const timestamp = container.querySelector('.note-timestamp');
      expect(timestamp.getAttribute('datetime')).toBe(now);
    });

    it('should set title attribute with full date', () => {
      const now = new Date().toISOString();

      component.render([
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: now
        }
      ]);

      const timestamp = container.querySelector('.note-timestamp');
      expect(timestamp.hasAttribute('title')).toBe(true);
    });
  });

  describe('timestamp updates', () => {
    it('should start timestamp updates', () => {
      vi.useFakeTimers();

      component.startTimestampUpdates();
      expect(component.timestampUpdateInterval).toBeDefined();

      vi.useRealTimers();
    });

    it('should stop timestamp updates', () => {
      vi.useFakeTimers();

      component.startTimestampUpdates();
      component.stopTimestampUpdates();
      
      expect(component.timestampUpdateInterval).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('getNotes', () => {
    it('should return current notes', () => {
      const notes = [
        {
          noteId: 'note-1',
          content: 'Test',
          recordedAt: new Date().toISOString()
        }
      ];

      component.render(notes);

      expect(component.getNotes()).toEqual(notes);
    });
  });

  describe('accessibility', () => {
    it('should announce updates to screen readers', () => {
      const spy = vi.spyOn(document.body, 'appendChild');

      component.announceUpdate('Test message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
