import { PrismaClient } from '@prisma/client';
import { ReadingSession, SessionStatistics } from '../../../domain/entities/reading-session';
import { ReadingSessionRepository } from '../../../domain/interfaces/reading-session-repository';

/**
 * Prisma implementation of ReadingSessionRepository
 */
export class PrismaReadingSessionRepository implements ReadingSessionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    session: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ReadingSession> {
    const result = await this.prisma.readingSession.create({
      data: {
        userId: session.userId,
        bookId: session.bookId,
        startTime: session.startTime,
        endTime: session.endTime,
        durationMinutes: session.durationMinutes,
        pagesRead: session.pagesRead,
        notes: session.notes,
      },
    });

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<ReadingSession | null> {
    const result = await this.prisma.readingSession.findUnique({
      where: { id },
    });

    return result ? this.mapToEntity(result) : null;
  }

  async findActiveByUserId(userId: string): Promise<ReadingSession | null> {
    const result = await this.prisma.readingSession.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    });

    return result ? this.mapToEntity(result) : null;
  }

  async findByUserId(
    userId: string,
    options?: {
      bookId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ReadingSession[]> {
    const where: Record<string, unknown> = { userId };

    if (options?.bookId) {
      where.bookId = options.bookId;
    }

    if (options?.startDate || options?.endDate) {
      where.startTime = {};
      if (options.startDate) {
        (where.startTime as Record<string, unknown>).gte = options.startDate;
      }
      if (options.endDate) {
        (where.startTime as Record<string, unknown>).lte = options.endDate;
      }
    }

    const results = await this.prisma.readingSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: options?.limit,
    });

    return results.map((r) => this.mapToEntity(r));
  }

  async update(
    id: string,
    updates: Partial<Pick<ReadingSession, 'endTime' | 'durationMinutes' | 'pagesRead' | 'notes'>>
  ): Promise<ReadingSession | null> {
    const result = await this.prisma.readingSession.update({
      where: { id },
      data: updates,
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.readingSession.delete({
      where: { id },
    });
    return true;
  }

  async getStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SessionStatistics> {
    const where: Record<string, unknown> = {
      userId,
      endTime: { not: null }, // Only completed sessions
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.startTime as Record<string, unknown>).lte = endDate;
      }
    }

    const sessions = await this.prisma.readingSession.findMany({
      where,
      select: {
        durationMinutes: true,
        pagesRead: true,
        startTime: true,
      },
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalPages = sessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const longestSession = Math.max(...sessions.map((s) => s.durationMinutes || 0), 0);
    const averageSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;

    // Calculate this week's stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter((s) => s.startTime >= weekStart);
    const sessionsThisWeek = weekSessions.length;
    const minutesThisWeek = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    return {
      totalSessions,
      totalMinutes,
      totalPages,
      averageSessionLength,
      longestSession,
      sessionsThisWeek,
      minutesThisWeek,
    };
  }

  async getTodayTotalMinutes(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.readingSession.aggregate({
      where: {
        userId,
        startTime: {
          gte: today,
          lt: tomorrow,
        },
        endTime: { not: null },
      },
      _sum: {
        durationMinutes: true,
      },
    });

    return result._sum.durationMinutes || 0;
  }

  async getWeekTotalMinutes(userId: string): Promise<number> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const result = await this.prisma.readingSession.aggregate({
      where: {
        userId,
        startTime: { gte: weekStart },
        endTime: { not: null },
      },
      _sum: {
        durationMinutes: true,
      },
    });

    return result._sum.durationMinutes || 0;
  }

  private mapToEntity(record: {
    id: string;
    userId: string;
    bookId: string | null;
    startTime: Date;
    endTime: Date | null;
    durationMinutes: number | null;
    pagesRead: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReadingSession {
    return {
      id: record.id,
      userId: record.userId,
      bookId: record.bookId ?? undefined,
      startTime: record.startTime,
      endTime: record.endTime ?? undefined,
      durationMinutes: record.durationMinutes ?? undefined,
      pagesRead: record.pagesRead ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}