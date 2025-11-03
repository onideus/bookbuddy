import { PrismaClient } from '@prisma/client';
import {
  IRefreshTokenRepository,
  RefreshTokenData,
} from '../../../domain/interfaces/refresh-token-repository';

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: Omit<RefreshTokenData, 'id' | 'createdAt' | 'revokedAt'>
  ): Promise<RefreshTokenData> {
    const token = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: token.id,
      userId: token.userId,
      token: token.token,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      revokedAt: token.revokedAt,
    };
  }

  async findByToken(token: string): Promise<RefreshTokenData | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return null;
    }

    return {
      id: refreshToken.id,
      userId: refreshToken.userId,
      token: refreshToken.token,
      expiresAt: refreshToken.expiresAt,
      createdAt: refreshToken.createdAt,
      revokedAt: refreshToken.revokedAt,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
