import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError } from '../../../../domain/errors/domain-errors';

type ExportFormat = 'json' | 'csv';

interface ExportQuerystring {
  format?: ExportFormat;
}

// JSON Schema for GET /export/books
const exportBooksSchema = {
  querystring: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['json', 'csv'] },
    },
  },
};

// JSON Schema for GET /export/goals
const exportGoalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['json', 'csv'] },
    },
  },
};

// JSON Schema for GET /export/all
const exportAllSchema = {
  querystring: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['json'] },
    },
  },
};

function booksToCSV(
  books: Array<{
    id: string;
    title: string;
    authors: string[];
    status: string;
    currentPage?: number;
    pageCount?: number;
    rating?: number;
    genres: string[];
    addedAt: Date;
    finishedAt?: Date;
  }>
): string {
  const headers = [
    'id',
    'title',
    'authors',
    'status',
    'currentPage',
    'pageCount',
    'rating',
    'genres',
    'addedAt',
    'finishedAt',
  ];

  const rows = books.map((book) => [
    book.id,
    `"${book.title.replace(/"/g, '""')}"`,
    `"${book.authors.join(', ').replace(/"/g, '""')}"`,
    book.status,
    book.currentPage ?? '',
    book.pageCount ?? '',
    book.rating ?? '',
    `"${book.genres.join(', ').replace(/"/g, '""')}"`,
    book.addedAt.toISOString(),
    book.finishedAt?.toISOString() ?? '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function goalsToCSV(
  goals: Array<{
    id: string;
    title: string;
    description?: string;
    targetBooks: number;
    currentBooks: number;
    startDate: Date;
    endDate: Date;
    completed: boolean;
  }>
): string {
  const headers = [
    'id',
    'title',
    'description',
    'targetBooks',
    'currentBooks',
    'startDate',
    'endDate',
    'completed',
  ];

  const rows = goals.map((goal) => [
    goal.id,
    `"${goal.title.replace(/"/g, '""')}"`,
    `"${(goal.description ?? '').replace(/"/g, '""')}"`,
    goal.targetBooks,
    goal.currentBooks,
    goal.startDate.toISOString(),
    goal.endDate.toISOString(),
    goal.completed,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function registerExportRoutes(app: FastifyInstance) {
  // GET /export/books - Export user's books
  app.get<{ Querystring: ExportQuerystring }>(
    '/export/books',
    {
      schema: exportBooksSchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const format = ((request.query as ExportQuerystring).format ?? 'json') as ExportFormat;

      const bookRepository = Container.getBookRepository();
      const books = await bookRepository.findByUserId(userId);

      if (format === 'csv') {
        const csv = booksToCSV(books);
        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', 'attachment; filename="books.csv"')
          .send(csv);
      } else {
        reply
          .header('Content-Type', 'application/json')
          .header('Content-Disposition', 'attachment; filename="books.json"')
          .send({
            exportedAt: new Date().toISOString(),
            count: books.length,
            books,
          });
      }
    })
  );

  // GET /export/goals - Export user's goals
  app.get<{ Querystring: ExportQuerystring }>(
    '/export/goals',
    {
      schema: exportGoalsSchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const format = ((request.query as ExportQuerystring).format ?? 'json') as ExportFormat;

      const goalRepository = Container.getGoalRepository();
      const goals = await goalRepository.findByUserId(userId);

      if (format === 'csv') {
        const csv = goalsToCSV(goals);
        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', 'attachment; filename="goals.csv"')
          .send(csv);
      } else {
        reply
          .header('Content-Type', 'application/json')
          .header('Content-Disposition', 'attachment; filename="goals.json"')
          .send({
            exportedAt: new Date().toISOString(),
            count: goals.length,
            goals,
          });
      }
    })
  );

  // GET /export/all - Export all user data
  app.get<{ Querystring: ExportQuerystring }>(
    '/export/all',
    {
      schema: exportAllSchema,
      preHandler: authenticate
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const format = ((request.query as ExportQuerystring).format ?? 'json') as ExportFormat;

      const bookRepository = Container.getBookRepository();
      const goalRepository = Container.getGoalRepository();
      const readingActivityRepository = Container.getReadingActivityRepository();

      const [books, goals, activities] = await Promise.all([
        bookRepository.findByUserId(userId),
        goalRepository.findByUserId(userId),
        readingActivityRepository.findByUserId(userId),
      ]);

      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="booktracker-export.json"')
        .send({
          exportedAt: new Date().toISOString(),
          books: {
            count: books.length,
            data: books,
          },
          goals: {
            count: goals.length,
            data: goals,
          },
          readingActivities: {
            count: activities.length,
            data: activities,
          },
        });
    })
  );
}
