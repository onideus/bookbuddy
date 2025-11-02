import { faker } from '@faker-js/faker';
import type { User } from '@/domain/entities/user';
import type { Book } from '@/domain/entities/book';
import type { Goal } from '@/domain/entities/goal';

export const userFactory = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  passwordHash: faker.string.alphanumeric(60),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const bookFactory = (overrides?: Partial<Book>): Book => {
  const status = overrides?.status || faker.helpers.arrayElement(['TO_READ', 'READING', 'READ']);
  const pageCount = overrides?.pageCount || faker.number.int({ min: 100, max: 800 });
  const currentPage = overrides?.currentPage ?? (
    status === 'TO_READ' ? 0 :
    status === 'READ' ? pageCount :
    faker.number.int({ min: 1, max: pageCount - 1 })
  );

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    googleBooksId: `google_${faker.string.alphanumeric(12)}`,
    title: faker.lorem.sentence({ min: 1, max: 5 }),
    authors: [faker.person.fullName(), ...faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.3 }) || []].filter(Boolean),
    description: faker.lorem.paragraph(),
    pageCount,
    currentPage,
    status,
    coverImage: faker.image.url(),
    startDate: status !== 'TO_READ' ? faker.date.past() : null,
    finishDate: status === 'READ' ? faker.date.recent() : null,
    notes: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.3 }) || null,
    rating: status === 'READ' ? faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 }), { probability: 0.7 }) : null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

export const goalFactory = (overrides?: Partial<Goal>): Goal => {
  const type = overrides?.type || faker.helpers.arrayElement(['BOOKS_PER_YEAR', 'BOOKS_PER_MONTH', 'PAGES_PER_DAY']);
  const targetValue = overrides?.targetValue || (
    type === 'BOOKS_PER_YEAR' ? faker.number.int({ min: 12, max: 52 }) :
    type === 'BOOKS_PER_MONTH' ? faker.number.int({ min: 1, max: 10 }) :
    faker.number.int({ min: 10, max: 100 })
  );
  const currentValue = overrides?.currentValue ?? faker.number.int({ min: 0, max: targetValue });

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    type,
    targetValue,
    currentValue,
    startDate: faker.date.past(),
    endDate: faker.date.future(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Batch factories for creating multiple items
export const createUsers = (count: number, overrides?: Partial<User>): User[] =>
  Array.from({ length: count }, () => userFactory(overrides));

export const createBooks = (count: number, overrides?: Partial<Book>): Book[] =>
  Array.from({ length: count }, () => bookFactory(overrides));

export const createGoals = (count: number, overrides?: Partial<Goal>): Goal[] =>
  Array.from({ length: count }, () => goalFactory(overrides));

// Scenario factories for common test scenarios
export const createUserWithBooks = (bookCount: number = 3) => {
  const user = userFactory();
  const books = createBooks(bookCount, { userId: user.id });
  return { user, books };
};

export const createUserWithGoals = (goalCount: number = 2) => {
  const user = userFactory();
  const goals = createGoals(goalCount, { userId: user.id });
  return { user, goals };
};

export const createCompleteUserScenario = () => {
  const user = userFactory();
  const books = [
    bookFactory({ userId: user.id, status: 'READ' }),
    bookFactory({ userId: user.id, status: 'READING', currentPage: 150, pageCount: 300 }),
    bookFactory({ userId: user.id, status: 'TO_READ' }),
  ];
  const goals = [
    goalFactory({
      userId: user.id,
      type: 'BOOKS_PER_YEAR',
      targetValue: 24,
      currentValue: 8,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
    }),
    goalFactory({
      userId: user.id,
      type: 'PAGES_PER_DAY',
      targetValue: 30,
      currentValue: 25,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    }),
  ];
  return { user, books, goals };
};