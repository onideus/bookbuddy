"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
const crypto_1 = require("crypto");
class RegisterUserUseCase {
    constructor(userRepository, passwordHasher) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }
    async execute(input) {
        // Validation
        if (!input.email || !input.password || !input.name) {
            throw new domain_errors_1.ValidationError('Email, password, and name are required');
        }
        if (input.password.length < 6) {
            throw new domain_errors_1.ValidationError('Password must be at least 6 characters');
        }
        // Check for existing user
        const existingUser = await this.userRepository.findByEmail(input.email);
        if (existingUser) {
            throw new domain_errors_1.DuplicateError('User', 'email');
        }
        // Hash password
        const hashedPassword = await this.passwordHasher.hash(input.password);
        const user = {
            id: (0, crypto_1.randomUUID)(),
            email: input.email,
            password: hashedPassword,
            name: input.name,
            createdAt: new Date(),
        };
        return this.userRepository.create(user);
    }
}
exports.RegisterUserUseCase = RegisterUserUseCase;
