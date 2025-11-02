import { vi } from 'vitest';
import type { IBookRepository } from '@/domain/interfaces/book-repository';
import type { IGoalRepository } from '@/domain/interfaces/goal-repository';
import type { Book } from '@/domain/entities/book';
import type { Goal } from '@/domain/entities/goal';

export const createMockBookRepository = (): IBookRepository => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByStatus: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

export const createMockGoalRepository = (): IGoalRepository => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

// Helper to setup book repository with default responses
export const setupBookRepositoryMocks = (
  repo: IBookRepository,
  books: Book[] = []
) => {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const userBooksMap = new Map<string, Book[]>();

  books.forEach(book => {
    if (!userBooksMap.has(book.userId)) {
      userBooksMap.set(book.userId, []);
    }
    userBooksMap.get(book.userId)!.push(book);
  });

  vi.mocked(repo.findById).mockImplementation(async (id: string) =>
    bookMap.get(id)
  );

  vi.mocked(repo.findByUserId).mockImplementation(async (userId: string) =>
    userBooksMap.get(userId) || []
  );

  vi.mocked(repo.findByStatus).mockImplementation(async (userId: string, status: string) => {
    const userBooks = userBooksMap.get(userId) || [];
    return userBooks.filter(b => b.status === status);
  });

  vi.mocked(repo.create).mockImplementation(async (book: Book) => {
    const newBook = { ...book };
    bookMap.set(newBook.id, newBook);
    if (!userBooksMap.has(book.userId)) {
      userBooksMap.set(book.userId, []);
    }
    userBooksMap.get(book.userId)!.push(newBook);
    return newBook;
  });

  vi.mocked(repo.update).mockImplementation(async (id: string, updates: Partial<Book>) => {
    const book = bookMap.get(id);
    if (!book) return null;
    const updated = { ...book, ...updates };
    bookMap.set(id, updated);
    // Update in userBooksMap as well
    const userBooks = userBooksMap.get(book.userId);
    if (userBooks) {
      const index = userBooks.findIndex(b => b.id === id);
      if (index > -1) {
        userBooks[index] = updated;
      }
    }
    return updated;
  });

  vi.mocked(repo.delete).mockImplementation(async (id: string) => {
    const book = bookMap.get(id);
    if (!book) return false;
    bookMap.delete(id);
    const userBooks = userBooksMap.get(book.userId);
    if (userBooks) {
      const index = userBooks.findIndex(b => b.id === id);
      if (index > -1) userBooks.splice(index, 1);
    }
    return true;
  });
};

export const setupGoalRepositoryMocks = (
  repo: IGoalRepository,
  goals: Goal[] = []
) => {
  const goalMap = new Map(goals.map(g => [g.id, g]));
  const userGoalsMap = new Map<string, Goal[]>();

  goals.forEach(goal => {
    if (!userGoalsMap.has(goal.userId)) {
      userGoalsMap.set(goal.userId, []);
    }
    userGoalsMap.get(goal.userId)!.push(goal);
  });

  vi.mocked(repo.findById).mockImplementation(async (id: string) =>
    goalMap.get(id)
  );

  vi.mocked(repo.findByUserId).mockImplementation(async (userId: string) =>
    userGoalsMap.get(userId) || []
  );

  vi.mocked(repo.create).mockImplementation(async (goal: Goal) => {
    const newGoal = { ...goal };
    goalMap.set(newGoal.id, newGoal);
    if (!userGoalsMap.has(goal.userId)) {
      userGoalsMap.set(goal.userId, []);
    }
    userGoalsMap.get(goal.userId)!.push(newGoal);
    return newGoal;
  });

  vi.mocked(repo.update).mockImplementation(async (id: string, updates: Partial<Goal>) => {
    const goal = goalMap.get(id);
    if (!goal) return null;
    const updated = { ...goal, ...updates };
    goalMap.set(id, updated);
    // Update in userGoalsMap as well
    const userGoals = userGoalsMap.get(goal.userId);
    if (userGoals) {
      const index = userGoals.findIndex(g => g.id === id);
      if (index > -1) {
        userGoals[index] = updated;
      }
    }
    return updated;
  });

  vi.mocked(repo.delete).mockImplementation(async (id: string) => {
    const goal = goalMap.get(id);
    if (!goal) return false;
    goalMap.delete(id);
    const userGoals = userGoalsMap.get(goal.userId);
    if (userGoals) {
      const index = userGoals.findIndex(g => g.id === id);
      if (index > -1) userGoals.splice(index, 1);
    }
    return true;
  });
};