import { IUserRepository } from '../../../domain/interfaces/user-repository';
import { IPasswordHasher } from '../../../domain/interfaces/password-hasher';
import { User } from '../../../domain/entities/user';
import { DuplicateError, ValidationError } from '../../../domain/errors/domain-errors';
import { randomUUID } from 'crypto';

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
}

export class RegisterUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    // Validation
    if (!input.email || !input.password || !input.name) {
      throw new ValidationError('Email, password, and name are required');
    }

    if (input.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Check for existing user
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new DuplicateError('User', 'email');
    }

    // Hash password
    const hashedPassword = await this.passwordHasher.hash(input.password);

    const user: User = {
      id: randomUUID(),
      email: input.email,
      password: hashedPassword,
      name: input.name,
      createdAt: new Date(),
    };

    return this.userRepository.create(user);
  }
}
