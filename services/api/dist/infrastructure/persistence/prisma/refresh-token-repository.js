"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaRefreshTokenRepository = void 0;
class PrismaRefreshTokenRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
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
    async findByToken(token) {
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
    async revoke(token) {
        await this.prisma.refreshToken.update({
            where: { token },
            data: { revokedAt: new Date() },
        });
    }
    async revokeAllForUser(userId) {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
    }
    async deleteExpired() {
        await this.prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
}
exports.PrismaRefreshTokenRepository = PrismaRefreshTokenRepository;
