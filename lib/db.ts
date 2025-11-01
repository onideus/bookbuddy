// Simple in-memory database for demo purposes
// In production, you'd use a real database like PostgreSQL, MongoDB, etc.

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

export interface Book {
  id: string;
  userId: string;
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: 'want-to-read' | 'reading' | 'read';
  currentPage?: number;
  rating?: number;
  addedAt: Date;
  finishedAt?: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetBooks: number;
  currentBooks: number;
  startDate: Date;
  endDate: Date;
  completed: boolean;
}

// In-memory storage
const users: Map<string, User> = new Map();
const books: Map<string, Book> = new Map();
const goals: Map<string, Goal> = new Map();

// User operations
export const db = {
  users: {
    create: async (user: User) => {
      users.set(user.id, user);
      return user;
    },
    findByEmail: async (email: string) => {
      return Array.from(users.values()).find(u => u.email === email);
    },
    findById: async (id: string) => {
      return users.get(id);
    },
  },
  books: {
    create: async (book: Book) => {
      books.set(book.id, book);
      return book;
    },
    findByUserId: async (userId: string) => {
      return Array.from(books.values()).filter(b => b.userId === userId);
    },
    findById: async (id: string) => {
      return books.get(id);
    },
    update: async (id: string, updates: Partial<Book>) => {
      const book = books.get(id);
      if (!book) return null;
      const updated = { ...book, ...updates };
      books.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      return books.delete(id);
    },
  },
  goals: {
    create: async (goal: Goal) => {
      goals.set(goal.id, goal);
      return goal;
    },
    findByUserId: async (userId: string) => {
      return Array.from(goals.values()).filter(g => g.userId === userId);
    },
    findById: async (id: string) => {
      return goals.get(id);
    },
    update: async (id: string, updates: Partial<Goal>) => {
      const goal = goals.get(id);
      if (!goal) return null;
      const updated = { ...goal, ...updates };
      goals.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      return goals.delete(id);
    },
  },
};
