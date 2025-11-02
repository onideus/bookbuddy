import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export interface TestUser {
  email: string;
  password: string;
  name: string;
  id?: string;
}

export class DatabaseHelper {
  /**
   * Create a test user in the database
   */
  static async createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
    const userData: TestUser = {
      email: overrides?.email || faker.internet.email(),
      password: overrides?.password || 'Test123!@#',
      name: overrides?.name || faker.person.fullName(),
    };

    const hashedPassword = await bcryptjs.hash(userData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
      },
    });

    return {
      ...userData,
      id: user.id,
    };
  }

  /**
   * Clean up test user and related data
   */
  static async cleanupTestUser(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Delete all related data first
      await prisma.book.deleteMany({
        where: { userId: user.id },
      });

      await prisma.goal.deleteMany({
        where: { userId: user.id },
      });

      // Finally delete the user
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  }

  /**
   * Clean up multiple test users
   */
  static async cleanupTestUsers(emails: string[]): Promise<void> {
    for (const email of emails) {
      await this.cleanupTestUser(email);
    }
  }

  /**
   * Create a test book for a user
   */
  static async createTestBook(userId: string, bookData?: any) {
    return await prisma.book.create({
      data: {
        userId,
        title: bookData?.title || faker.lorem.words(3),
        authors: bookData?.authors || [faker.person.fullName()],
        googleBooksId: bookData?.googleBooksId || faker.string.uuid(),
        status: bookData?.status || 'want-to-read',
        currentPage: bookData?.currentPage || 0,
        pageCount: bookData?.pageCount || faker.number.int({ min: 100, max: 500 }),
        thumbnail: bookData?.thumbnail || faker.image.url(),
        description: bookData?.description || faker.lorem.paragraph(),
        publishedDate: bookData?.publishedDate || faker.date.past().toISOString(),
        categories: bookData?.categories || [faker.lorem.word()],
        rating: bookData?.rating || null,
      },
    });
  }

  /**
   * Create a test goal for a user
   */
  static async createTestGoal(userId: string, goalData?: any) {
    return await prisma.goal.create({
      data: {
        userId,
        title: goalData?.title || `Read ${faker.number.int({ min: 10, max: 50 })} books`,
        targetBooks: goalData?.targetBooks || faker.number.int({ min: 10, max: 50 }),
        currentBooks: goalData?.currentBooks || 0,
        startDate: goalData?.startDate || new Date(),
        endDate: goalData?.endDate || faker.date.future(),
        completed: goalData?.completed || false,
      },
    });
  }

  /**
   * Reset database to clean state (use with caution!)
   */
  static async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test' && !process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Database reset is only allowed in test environment!');
    }

    // Delete all data in order of dependencies
    await prisma.book.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.user.deleteMany({});
  }
}

export default DatabaseHelper;