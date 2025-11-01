/**
 * DEPRECATED: This file is maintained for backward compatibility only.
 * New code should use the repository pattern from /domain and /infrastructure.
 *
 * This file now re-exports types from the domain layer and provides
 * a compatibility wrapper around the new architecture.
 */

// Re-export types from domain layer
export type { User } from '../domain/entities/user';
export type { Book } from '../domain/entities/book';
export type { Goal } from '../domain/entities/goal';

import { memoryDatabase } from '../infrastructure/persistence/memory/database';
import type { User } from '../domain/entities/user';
import type { Book } from '../domain/entities/book';
import type { Goal } from '../domain/entities/goal';

// Compatibility wrapper for legacy code
// This uses the new memory database but maintains the old API
export const db = {
  users: {
    create: async (user: User) => {
      memoryDatabase.users.set(user.id, user);
      return user;
    },
    findByEmail: async (email: string) => {
      return Array.from(memoryDatabase.users.values()).find(u => u.email === email);
    },
    findById: async (id: string) => {
      return memoryDatabase.users.get(id);
    },
  },
  books: {
    create: async (book: Book) => {
      memoryDatabase.books.set(book.id, book);
      return book;
    },
    findByUserId: async (userId: string) => {
      return Array.from(memoryDatabase.books.values()).filter(b => b.userId === userId);
    },
    findById: async (id: string) => {
      return memoryDatabase.books.get(id);
    },
    update: async (id: string, updates: Partial<Book>) => {
      const book = memoryDatabase.books.get(id);
      if (!book) return null;
      const updated = { ...book, ...updates };
      memoryDatabase.books.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      return memoryDatabase.books.delete(id);
    },
  },
  goals: {
    create: async (goal: Goal) => {
      memoryDatabase.goals.set(goal.id, goal);
      return goal;
    },
    findByUserId: async (userId: string) => {
      return Array.from(memoryDatabase.goals.values()).filter(g => g.userId === userId);
    },
    findById: async (id: string) => {
      return memoryDatabase.goals.get(id);
    },
    update: async (id: string, updates: Partial<Goal>) => {
      const goal = memoryDatabase.goals.get(id);
      if (!goal) return null;
      const updated = { ...goal, ...updates };
      memoryDatabase.goals.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      return memoryDatabase.goals.delete(id);
    },
  },
};
