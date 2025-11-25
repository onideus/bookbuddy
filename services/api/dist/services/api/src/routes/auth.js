"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const container_1 = require("../../../../lib/di/container");
const config_1 = require("../../../../lib/config");
const register_user_1 = require("../../../../application/use-cases/auth/register-user");
const error_handler_1 = require("../utils/error-handler");
const jwt_1 = require("../utils/jwt");
const domain_errors_1 = require("../../../../domain/errors/domain-errors");
const sanitize_1 = require("../../../../lib/utils/sanitize");
// Stricter rate limit config for auth endpoints to prevent brute-force attacks
const authRateLimitConfig = {
    max: config_1.config.rateLimit.auth.max,
    timeWindow: config_1.config.rateLimit.auth.timeWindow,
    errorResponseBuilder: () => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please wait before trying again.',
    }),
};
// JSON Schema for registration
const registerSchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
            email: { type: 'string', format: 'email', minLength: 1 },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1 },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                    },
                },
            },
        },
    },
};
// JSON Schema for login
const loginSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email', minLength: 1 },
            password: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                    },
                },
            },
        },
    },
};
// JSON Schema for refresh token
const refreshTokenSchema = {
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
            },
        },
    },
};
// JSON Schema for logout
const logoutSchema = {
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    },
};
function registerAuthRoutes(app) {
    // POST /auth/register - Register a new user
    app.post('/auth/register', {
        schema: registerSchema,
        config: { rateLimit: authRateLimitConfig }
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { email, password, name } = request.body;
        const userRepository = container_1.Container.getUserRepository();
        const passwordHasher = container_1.Container.getPasswordHasher();
        const useCase = new register_user_1.RegisterUserUseCase(userRepository, passwordHasher);
        const user = await useCase.execute({
            email: (0, sanitize_1.sanitizeEmail)(email),
            password,
            name: (0, sanitize_1.sanitizeString)(name),
        });
        // Generate tokens for immediate login
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
        });
        const refreshTokenString = (0, jwt_1.generateRefreshToken)();
        const refreshTokenRepository = container_1.Container.getRefreshTokenRepository();
        await refreshTokenRepository.create({
            userId: user.id,
            token: refreshTokenString,
            expiresAt: (0, jwt_1.calculateRefreshTokenExpiry)(),
        });
        reply.code(201).send({
            accessToken,
            refreshToken: refreshTokenString,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }));
    // POST /auth/login - Login and receive JWT tokens
    app.post('/auth/login', {
        schema: loginSchema,
        config: { rateLimit: authRateLimitConfig }
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { email, password } = request.body;
        const userRepository = container_1.Container.getUserRepository();
        const passwordHasher = container_1.Container.getPasswordHasher();
        const user = await userRepository.findByEmail((0, sanitize_1.sanitizeEmail)(email));
        if (!user) {
            throw new domain_errors_1.UnauthorizedError('Invalid credentials');
        }
        const isValid = await passwordHasher.compare(password, user.password);
        if (!isValid) {
            throw new domain_errors_1.UnauthorizedError('Invalid credentials');
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
        });
        const refreshTokenString = (0, jwt_1.generateRefreshToken)();
        const refreshTokenRepository = container_1.Container.getRefreshTokenRepository();
        await refreshTokenRepository.create({
            userId: user.id,
            token: refreshTokenString,
            expiresAt: (0, jwt_1.calculateRefreshTokenExpiry)(),
        });
        reply.send({
            accessToken,
            refreshToken: refreshTokenString,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }));
    // POST /auth/refresh - Refresh access token
    app.post('/auth/refresh', { schema: refreshTokenSchema }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { refreshToken } = request.body;
        const refreshTokenRepository = container_1.Container.getRefreshTokenRepository();
        const tokenData = await refreshTokenRepository.findByToken(refreshToken);
        if (!tokenData) {
            throw new domain_errors_1.UnauthorizedError('Invalid refresh token');
        }
        if (tokenData.revokedAt) {
            throw new domain_errors_1.UnauthorizedError('Refresh token has been revoked');
        }
        if (tokenData.expiresAt < new Date()) {
            throw new domain_errors_1.UnauthorizedError('Refresh token has expired');
        }
        // Get user data
        const userRepository = container_1.Container.getUserRepository();
        const user = await userRepository.findById(tokenData.userId);
        if (!user) {
            throw new domain_errors_1.UnauthorizedError('User not found');
        }
        // Revoke old refresh token
        await refreshTokenRepository.revoke(refreshToken);
        // Generate new tokens
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
        });
        const newRefreshTokenString = (0, jwt_1.generateRefreshToken)();
        await refreshTokenRepository.create({
            userId: user.id,
            token: newRefreshTokenString,
            expiresAt: (0, jwt_1.calculateRefreshTokenExpiry)(),
        });
        reply.send({
            accessToken,
            refreshToken: newRefreshTokenString,
        });
    }));
    // POST /auth/logout - Revoke refresh token
    app.post('/auth/logout', { schema: logoutSchema }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { refreshToken } = request.body;
        const refreshTokenRepository = container_1.Container.getRefreshTokenRepository();
        const tokenData = await refreshTokenRepository.findByToken(refreshToken);
        if (tokenData && !tokenData.revokedAt) {
            await refreshTokenRepository.revoke(refreshToken);
        }
        reply.send({
            message: 'Logged out successfully',
        });
    }));
}
