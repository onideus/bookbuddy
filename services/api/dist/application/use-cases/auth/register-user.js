"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
const password_requirements_1 = require("../../../domain/value-objects/password-requirements");
const crypto_1 = require("crypto");
class RegisterUserUseCase {
    constructor(userRepository, passwordHasher) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }
    async execute(input) {
        // Basic field validation
        if (!input.email || !input.password || !input.name) {
            throw new domain_errors_1.ValidationError('Email, password, and name are required');
        }
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
            throw new domain_errors_1.ValidationError('Invalid email format');
        }
        // Password strength validation
        const passwordValidation = password_requirements_1.PasswordRequirements.validate(input.password);
        if (!passwordValidation.isValid) {
            throw new domain_errors_1.ValidationError(passwordValidation.errors.join('. '));
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
