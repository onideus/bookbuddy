import { IUserRepository } from '../../../domain/interfaces/user-repository';
import { User } from '../../../domain/entities/user';
import { prisma } from './client';

export class PrismaUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const created = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        createdAt: user.createdAt,
      },
    });

    return {
      id: created.id,
      email: created.email,
      password: created.password,
      name: created.name,
      createdAt: created.createdAt,
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
