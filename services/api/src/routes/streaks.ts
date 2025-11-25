import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { RecordReadingActivityUseCase } from '../../../../application/use-cases/streaks/record-reading-activity';
import { GetUserStreakUseCase } from '../../../../application/use-cases/streaks/get-user-streak';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

interface RecordActivityRequest {
  bookId?: string;
  pagesRead?: number;
  minutesRead?: number;
  date?: string;
}

interface HistoryQuerystring {
  startDate?: string;
  endDate?: string;
}

// JSON Schema for GET /streaks
const getStreakSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        totalDaysRead: { type: 'number' },
        lastReadDate: { type: 'string', format: 'date-time' },
      },
    },
  },
};

// JSON Schema for POST /streaks/activity
const recordActivitySchema = {
  body: {
    type: 'object',
    properties: {
      bookId: { type: 'string', format: 'uuid' },
      pagesRead: { type: 'number', minimum: 1 },
      minutesRead: { type: 'number', minimum: 1 },
      date: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        bookId: { type: 'string' },
        pagesRead: { type: 'number' },
        minutesRead: { type: 'number' },
        date: { type: 'string', format: 'date-time' },
      },
    },
  },
};

// JSON Schema for GET /streaks/history
const getHistorySchema = {
  querystring: {
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },
};

export function registerStreakRoutes(app: FastifyInstance) {
  // GET /streaks - Get current user's streak stats
  app.get(
    '/streaks',
    {
      schema: getStreakSchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const readingActivityRepository = Container.getReadingActivityRepository();
      const useCase = new GetUserStreakUseCase(readingActivityRepository);

      const streakStats = await useCase.execute({ userId });

      reply.send(streakStats);
    })
  );

  // POST /streaks/activity - Record reading activity
  app.post<{ Body: RecordActivityRequest }>(
    '/streaks/activity',
    {
      schema: recordActivitySchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const body = request.body as RecordActivityRequest;
      const { bookId, pagesRead, minutesRead, date } = body;

      const readingActivityRepository = Container.getReadingActivityRepository();
      const useCase = new RecordReadingActivityUseCase(readingActivityRepository);

      const activity = await useCase.execute({
        userId,
        bookId,
        pagesRead,
        minutesRead,
        date: date ? new Date(date) : undefined,
      });

      reply.code(201).send(activity);
    })
  );

  // GET /streaks/history - Get reading activity history
  app.get<{ Querystring: HistoryQuerystring }>(
    '/streaks/history',
    {
      schema: getHistorySchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const query = request.query as HistoryQuerystring;
      const { startDate, endDate } = query;

      const readingActivityRepository = Container.getReadingActivityRepository();

      let activities;
      if (startDate && endDate) {
        activities = await readingActivityRepository.findByUserIdAndDateRange(
          userId,
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        activities = await readingActivityRepository.findByUserId(userId);
      }

      reply.send({ activities });
    })
  );
}
