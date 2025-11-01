import { IUserRepository } from '../../../domain/interfaces/user-repository';
import { User } from '../../../domain/entities/user';
import { memoryDatabase } from './database';

export class MemoryUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    memoryDatabase.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return Array.from(memoryDatabase.users.values()).find(
      u => u.email === email
    );
  }

  async findById(id: string): Promise<User | undefined> {
    return memoryDatabase.users.get(id);
  }
}
