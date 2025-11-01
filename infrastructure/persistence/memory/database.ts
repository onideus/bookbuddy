import { User } from '../../../domain/entities/user';
import { Book } from '../../../domain/entities/book';
import { Goal } from '../../../domain/entities/goal';
import bcrypt from 'bcryptjs';

// In-memory storage (migrated from lib/db.ts)
export const memoryDatabase = {
  users: new Map<string, User>(),
  books: new Map<string, Book>(),
  goals: new Map<string, Goal>(),
};

// Initialize dev user in development mode
if (process.env.NODE_ENV === 'development') {
  const devUserId = 'dev-user-id';
  const devUser: User = {
    id: devUserId,
    email: 'dev@booktracker.com',
    password: bcrypt.hashSync('dev123', 10),
    name: 'Dev User',
    createdAt: new Date(),
  };

  memoryDatabase.users.set(devUserId, devUser);
  console.log('✅ Development user initialized (dev@booktracker.com / dev123)');
}
