import { IUserRepository } from '../../../domain/interfaces/user-repository';
import { IPasswordHasher } from '../../../domain/interfaces/password-hasher';
import { User } from '../../../domain/entities/user';
import { DuplicateError, ValidationError } from '../../../domain/errors/domain-errors';
import { PasswordRequirements } from '../../../domain/value-objects/password-requirements';
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
    // Basic field validation
    if (!input.email || !input.password || !input.name) {
      throw new ValidationError('Email, password, and name are required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Password strength validation
    const passwordValidation = PasswordRequirements.validate(input.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join('. '));
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
