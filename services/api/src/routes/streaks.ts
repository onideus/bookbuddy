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

export function registerStreakRoutes(app: FastifyInstance) {
  // GET /streaks - Get current user's streak stats
  app.get(
    '/streaks',
    { preHandler: authenticate },
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
    { preHandler: authenticate },
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
    { preHandler: authenticate },
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
