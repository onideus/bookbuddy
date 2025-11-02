import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Setup MSW server for API mocking
export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Global test utilities
export const createMockUser = (overrides?: Partial<any>) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockBook = (overrides?: Partial<any>) => ({
  id: 'book-123',
  userId: 'user-123',
  googleBooksId: 'google-123',
  title: 'Test Book',
  authors: ['Test Author'],
  description: 'Test description',
  pageCount: 300,
  currentPage: 0,
  status: 'TO_READ',
  coverImage: 'https://example.com/cover.jpg',
  startDate: null,
  finishDate: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockGoal = (overrides?: Partial<any>) => ({
  id: 'goal-123',
  userId: 'user-123',
  type: 'BOOKS_PER_YEAR',
  targetValue: 12,
  currentValue: 3,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});