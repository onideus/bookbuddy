"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaGoalRepository = void 0;
const client_1 = require("./client");
const logging_1 = require("../../logging");
const log = (0, logging_1.createLogger)('GoalRepository');
const DEFAULT_PAGE_SIZE = 20;
class PrismaGoalRepository {
    async create(goal) {
        log.debug('Creating goal', { goalId: goal.id, userId: goal.userId, title: goal.title });
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
        log.info('Goal created successfully', { goalId: created.id });
        return this.mapToGoal(created);
    }
    async findByUserId(userId) {
        log.debug('Finding goals for user', { userId });
        const goals = await client_1.prisma.goal.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
        });
        log.debug('Found goals', { userId, count: goals.length });
        return goals.map(this.mapToGoal);
    }
    async findByUserIdPaginated(userId, options) {
        const limit = options.limit ?? DEFAULT_PAGE_SIZE;
        const totalCount = await client_1.prisma.goal.count({ where: { userId } });
        let goals;
        if (options.cursor) {
            goals = await client_1.prisma.goal.findMany({
                where: { userId },
                orderBy: { startDate: 'desc' },
                take: limit + 1,
                cursor: { id: options.cursor },
                skip: 1,
            });
        }
        else {
            goals = await client_1.prisma.goal.findMany({
                where: { userId },
                orderBy: { startDate: 'desc' },
                take: limit + 1,
            });
        }
        const hasMore = goals.length > limit;
        const resultGoals = hasMore ? goals.slice(0, limit) : goals;
        const nextCursor = hasMore ? resultGoals[resultGoals.length - 1]?.id ?? null : null;
        return {
            goals: resultGoals.map(this.mapToGoal),
            nextCursor,
            hasMore,
            totalCount,
        };
    }
    async countByUserId(userId) {
        return client_1.prisma.goal.count({ where: { userId } });
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
            log.debug('Updating goal', { goalId: id, fields: Object.keys(updates) });
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
            log.info('Goal updated successfully', { goalId: updated.id });
            return this.mapToGoal(updated);
        }
        catch (error) {
            log.error('Failed to update goal', { goalId: id, error: error.message });
            return null;
        }
    }
    async delete(id) {
        try {
            log.debug('Deleting goal', { goalId: id });
            await client_1.prisma.goal.delete({
                where: { id },
            });
            log.info('Goal deleted successfully', { goalId: id });
            return true;
        }
        catch (error) {
            log.error('Failed to delete goal', { goalId: id, error: error.message });
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
