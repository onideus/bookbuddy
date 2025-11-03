"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaUserRepository = void 0;
const client_1 = require("./client");
class PrismaUserRepository {
    async create(user) {
        const created = await client_1.prisma.user.create({
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
    async findByEmail(email) {
        const user = await client_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user)
            return undefined;
        return {
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            createdAt: user.createdAt,
        };
    }
    async findById(id) {
        const user = await client_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user)
            return undefined;
        return {
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            createdAt: user.createdAt,
        };
    }
}
exports.PrismaUserRepository = PrismaUserRepository;
