"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaGoalRepository = void 0;
const client_1 = require("./client");
class PrismaGoalRepository {
    async create(goal) {
        const created = await client_1.prisma.goal.create({
            data: {
                id: goal.id,
                userId: goal.userId,
                title: goal.title,
                description: goal.description,
                targetBooks: goal.targetBooks,
                currentBooks: goal.currentBooks,
                startDate: goal.startDate,
                endDate: goal.endDate,
                completed: goal.completed,
            },
        });
        return this.mapToGoal(created);
    }
    async findByUserId(userId) {
        const goals = await client_1.prisma.goal.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
        });
        return goals.map(this.mapToGoal);
    }
    async findById(id) {
        const goal = await client_1.prisma.goal.findUnique({
            where: { id },
        });
        if (!goal)
            return undefined;
        return this.mapToGoal(goal);
    }
    async update(id, updates) {
        try {
            const updated = await client_1.prisma.goal.update({
                where: { id },
                data: {
                    ...(updates.title !== undefined && { title: updates.title }),
                    ...(updates.description !== undefined && { description: updates.description }),
                    ...(updates.targetBooks !== undefined && { targetBooks: updates.targetBooks }),
                    ...(updates.currentBooks !== undefined && { currentBooks: updates.currentBooks }),
                    ...(updates.startDate !== undefined && { startDate: updates.startDate }),
                    ...(updates.endDate !== undefined && { endDate: updates.endDate }),
                    ...(updates.completed !== undefined && { completed: updates.completed }),
                },
            });
            return this.mapToGoal(updated);
        }
        catch (error) {
            return null;
        }
    }
    async delete(id) {
        try {
            await client_1.prisma.goal.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    mapToGoal(prismaGoal) {
        return {
            id: prismaGoal.id,
            userId: prismaGoal.userId,
            title: prismaGoal.title,
            description: prismaGoal.description ?? undefined,
            targetBooks: prismaGoal.targetBooks,
            currentBooks: prismaGoal.currentBooks,
            startDate: prismaGoal.startDate,
            endDate: prismaGoal.endDate,
            completed: prismaGoal.completed,
        };
    }
}
exports.PrismaGoalRepository = PrismaGoalRepository;
