import { IReadingActivityRepository } from '../../../domain/interfaces/reading-activity-repository';
import { ReadingActivity } from '../../../domain/entities/reading-activity';
import { prisma } from './client';
import type { ReadingActivity as PrismaReadingActivity } from '@prisma/client';
import { createLogger } from '../../logging';

const log = createLogger('ReadingActivityRepository');

export class PrismaReadingActivityRepository implements IReadingActivityRepository {
  async recordActivity(
    activity: Omit<ReadingActivity, 'id' | 'createdAt'>
  ): Promise<ReadingActivity> {
    log.debug('Recording reading activity', {
      userId: activity.userId,
      date: activity.activityDate.toISOString(),
    });

    // Normalize date to midnight UTC
    const normalizedDate = new Date(activity.activityDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const result = await prisma.readingActivity.upsert({
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

  async findByUserId(userId: string): Promise<ReadingActivity[]> {
    log.debug('Finding all reading activities for user', { userId });

    const activities = await prisma.readingActivity.findMany({
      where: { userId },
      orderBy: { activityDate: 'desc' },
    });

    return activities.map(this.mapToReadingActivity);
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReadingActivity[]> {
    log.debug('Finding reading activities in date range', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const activities = await prisma.readingActivity.findMany({
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

  async findByUserIdAndDate(userId: string, date: Date): Promise<ReadingActivity | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const activity = await prisma.readingActivity.findUnique({
      where: {
        userId_activityDate: {
          userId,
          activityDate: normalizedDate,
        },
      },
    });

    if (!activity) return null;
    return this.mapToReadingActivity(activity);
  }

  async delete(id: string): Promise<boolean> {
    try {
      log.debug('Deleting reading activity', { activityId: id });
      await prisma.readingActivity.delete({
        where: { id },
      });
      log.info('Reading activity deleted', { activityId: id });
      return true;
    } catch (error) {
      log.error('Failed to delete reading activity', {
        activityId: id,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private mapToReadingActivity(prismaActivity: PrismaReadingActivity): ReadingActivity {
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
