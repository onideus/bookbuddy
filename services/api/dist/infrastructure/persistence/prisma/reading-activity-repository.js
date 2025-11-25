"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaReadingActivityRepository = void 0;
const client_1 = require("./client");
const logging_1 = require("../../logging");
const log = (0, logging_1.createLogger)('ReadingActivityRepository');
class PrismaReadingActivityRepository {
    async recordActivity(activity) {
        log.debug('Recording reading activity', {
            userId: activity.userId,
            date: activity.activityDate.toISOString(),
        });
        // Normalize date to midnight UTC
        const normalizedDate = new Date(activity.activityDate);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        const result = await client_1.prisma.readingActivity.upsert({
            where: {
                userId_activityDate: {
                    userId: activity.userId,
                    activityDate: normalizedDate,
                },
            },
            update: {
                pagesRead: { increment: activity.pagesRead },
                minutesRead: { increment: activity.minutesRead },
                bookId: activity.bookId,
            },
            create: {
                userId: activity.userId,
                bookId: activity.bookId,
                activityDate: normalizedDate,
                pagesRead: activity.pagesRead,
                minutesRead: activity.minutesRead,
            },
        });
        log.info('Reading activity recorded', { activityId: result.id });
        return this.mapToReadingActivity(result);
    }
    async findByUserId(userId) {
        log.debug('Finding all reading activities for user', { userId });
        const activities = await client_1.prisma.readingActivity.findMany({
            where: { userId },
            orderBy: { activityDate: 'desc' },
        });
        return activities.map(this.mapToReadingActivity);
    }
    async findByUserIdAndDateRange(userId, startDate, endDate) {
        log.debug('Finding reading activities in date range', {
            userId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        const activities = await client_1.prisma.readingActivity.findMany({
            where: {
                userId,
                activityDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { activityDate: 'desc' },
        });
        return activities.map(this.mapToReadingActivity);
    }
    async findByUserIdAndDate(userId, date) {
        const normalizedDate = new Date(date);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        const activity = await client_1.prisma.readingActivity.findUnique({
            where: {
                userId_activityDate: {
                    userId,
                    activityDate: normalizedDate,
                },
            },
        });
        if (!activity)
            return null;
        return this.mapToReadingActivity(activity);
    }
    async delete(id) {
        try {
            log.debug('Deleting reading activity', { activityId: id });
            await client_1.prisma.readingActivity.delete({
                where: { id },
            });
            log.info('Reading activity deleted', { activityId: id });
            return true;
        }
        catch (error) {
            log.error('Failed to delete reading activity', {
                activityId: id,
                error: error.message,
            });
            return false;
        }
    }
    mapToReadingActivity(prismaActivity) {
        return {
            id: prismaActivity.id,
            userId: prismaActivity.userId,
            bookId: prismaActivity.bookId ?? undefined,
            activityDate: prismaActivity.activityDate,
            pagesRead: prismaActivity.pagesRead,
            minutesRead: prismaActivity.minutesRead,
            createdAt: prismaActivity.createdAt,
        };
    }
}
exports.PrismaReadingActivityRepository = PrismaReadingActivityRepository;
