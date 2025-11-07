import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { RegisterUserUseCase } from '../../../../application/use-cases/auth/register-user';
import { wrapHandler } from '../utils/error-handler';
import {
  generateAccessToken,
  generateRefreshToken,
  calculateRefreshTokenExpiry,
} from '../utils/jwt';
import {
  UnauthorizedError,
  ValidationError,
} from '../../../../domain/errors/domain-errors';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
} from '../../../../types/contracts';

export function registerAuthRoutes(app: FastifyInstance) {
  // POST /auth/register - Register a new user
  app.post<{
    Body: RegisterRequest;
  }>(
    '/auth/register',
    wrapHandler(async (request, reply) => {
      const { email, password, name } = request.body as RegisterRequest;

      const userRepository = Container.getUserRepository();
      const passwordHasher = Container.getPasswordHasher();
      const useCase = new RegisterUserUseCase(userRepository, passwordHasher);

      const user = await useCase.execute({
        email,
        password,
        name,
      });

      // Generate tokens for immediate login
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshTokenString = generateRefreshToken();
      const refreshTokenRepository = Container.getRefreshTokenRepository();

      await refreshTokenRepository.create({
        userId: user.id,
        token: refreshTokenString,
        expiresAt: calculateRefreshTokenExpiry(),
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
    })
  );

  // POST /auth/login - Login and receive JWT tokens
  app.post<{
    Body: LoginRequest;
  }>(
    '/auth/login',
    wrapHandler(async (request, reply) => {
      const { email, password } = request.body as LoginRequest;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const userRepository = Container.getUserRepository();
      const passwordHasher = Container.getPasswordHasher();

      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const isValid = await passwordHasher.compare(password, user.password);
      if (!isValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshTokenString = generateRefreshToken();
      const refreshTokenRepository = Container.getRefreshTokenRepository();

      await refreshTokenRepository.create({
        userId: user.id,
        token: refreshTokenString,
        expiresAt: calculateRefreshTokenExpiry(),
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
    })
  );

  // POST /auth/refresh - Refresh access token
  app.post<{
    Body: RefreshTokenRequest;
  }>(
    '/auth/refresh',
    wrapHandler(async (request, reply) => {
      const { refreshToken } = request.body as RefreshTokenRequest;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const refreshTokenRepository = Container.getRefreshTokenRepository();
      const tokenData = await refreshTokenRepository.findByToken(refreshToken);

      if (!tokenData) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (tokenData.revokedAt) {
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      if (tokenData.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token has expired');
      }

      // Get user data
      const userRepository = Container.getUserRepository();
      const user = await userRepository.findById(tokenData.userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Revoke old refresh token
      await refreshTokenRepository.revoke(refreshToken);

      // Generate new tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const newRefreshTokenString = generateRefreshToken();

      await refreshTokenRepository.create({
        userId: user.id,
        token: newRefreshTokenString,
        expiresAt: calculateRefreshTokenExpiry(),
      });

      reply.send({
        accessToken,
        refreshToken: newRefreshTokenString,
      });
    })
  );

  // POST /auth/logout - Revoke refresh token
  app.post<{
    Body: LogoutRequest;
  }>(
    '/auth/logout',
    wrapHandler(async (request, reply) => {
      const { refreshToken } = request.body as LogoutRequest;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const refreshTokenRepository = Container.getRefreshTokenRepository();
      const tokenData = await refreshTokenRepository.findByToken(refreshToken);

      if (tokenData && !tokenData.revokedAt) {
        await refreshTokenRepository.revoke(refreshToken);
      }

      reply.send({
        message: 'Logged out successfully',
      });
    })
  );
}
