import { User } from '../../../domain/entities/user';
import { Book } from '../../../domain/entities/book';
import { Goal } from '../../../domain/entities/goal';

// In-memory storage (migrated from lib/db.ts)
export const memoryDatabase = {
  users: new Map<string, User>(),
  books: new Map<string, Book>(),
  goals: new Map<string, Goal>(),
};
