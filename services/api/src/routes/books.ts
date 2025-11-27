import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { AddBookUseCase } from '../../../../application/use-cases/books/add-book';
import { UpdateBookUseCase } from '../../../../application/use-cases/books/update-book';
import { DeleteBookUseCase } from '../../../../application/use-cases/books/delete-book';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { AddBookRequest, UpdateBookRequest } from '../../../../types/contracts';
import { sanitizeString } from '../../../../lib/utils/sanitize';

interface BookQuerystring {
  status?: string;
  genre?: string;
  cursor?: string;
  limit?: string;
}

// JSON Schema for GET /books
const getBooksSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['want-to-read', 'reading', 'read'] },
      genre: { type: 'string', minLength: 1 },
      cursor: { type: 'string', format: 'uuid' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
};

// JSON Schema for POST /books
const addBookSchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      googleBooksId: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      authors: { type: 'array', items: { type: 'string' } },
      thumbnail: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      pageCount: { type: 'number', minimum: 1 },
      status: { type: 'string', enum: ['want-to-read', 'reading', 'read'] },
      genres: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        book: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            authors: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
          },
        },
      },
    },
  },
};

// JSON Schema for PATCH /books/:id
const updateBookSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['want-to-read', 'reading', 'read'] },
      currentPage: { type: 'number', minimum: 0 },
      rating: { type: 'number', minimum: 1, maximum: 5 },
      notes: { type: 'string' },
      genres: { type: 'array', items: { type: 'string' } },
      startedAt: { type: 'string', format: 'date-time' },
      finishedAt: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        book: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
  },
};

// JSON Schema for DELETE /books/:id
const deleteBookSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
};

export function registerBookRoutes(app: FastifyInstance) {
  // GET /books - List user's books (optionally filter by status or genre)
  // Supports cursor-based pagination with ?cursor=<id>&limit=<number>
  app.get<{ Querystring: BookQuerystring }>(
    '/books',
    {
      schema: getBooksSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const query = request.query as BookQuerystring;
      const { status, genre, cursor, limit: limitStr } = query;

      const bookRepository = Container.getBookRepository();
      const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;

      // If filtering by status or genre, return all (no pagination for filters yet)
      if (status) {
        const books = await bookRepository.findByStatus(userId, status);
        reply.send({ books });
        return;
      }

      if (genre) {
        const books = await bookRepository.findByGenre(userId, genre);
        reply.send({ books });
        return;
      }

      // Use paginated query
      const result = await bookRepository.findByUserIdPaginated(userId, { cursor, limit });

      reply.send({
        books: result.books,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        },
      });
    })
  );

  // GET /books/genres - Get all unique genres for user's books
  app.get(
    '/books/genres',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const bookRepository = Container.getBookRepository();
      const genres = await bookRepository.getUniqueGenres(userId);

      reply.send({ genres });
    })
  );

  // POST /books - Add a book
  app.post<{
    Body: AddBookRequest;
  }>(
    '/books',
    {
      schema: addBookSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { googleBooksId, title, authors, thumbnail, description, pageCount, status, genres } =
        request.body as AddBookRequest;

      const bookRepository = Container.getBookRepository();
      const useCase = new AddBookUseCase(bookRepository);

      const book = await useCase.execute({
        userId,
        googleBooksId,
        title: sanitizeString(title),
        authors: authors ? authors.map(a => sanitizeString(a)) : [],
        thumbnail: thumbnail ? sanitizeString(thumbnail) : thumbnail,
        description: description ? sanitizeString(description) : description,
        pageCount,
        status,
        genres: genres ? genres.map(g => sanitizeString(g)) : genres,
      });

      reply.code(201).send({ book });
    })
  );

  // PATCH /books/:id - Update a book
  app.patch<{
    Params: { id: string };
    Body: UpdateBookRequest;
  }>(
    '/books/:id',
    {
      schema: updateBookSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };
      const updates = request.body as UpdateBookRequest;

      // Sanitize string fields in updates
      const sanitizedUpdates: UpdateBookRequest = {
        ...updates,
        ...(updates.genres !== undefined && { genres: updates.genres.map(g => sanitizeString(g)) }),
      };

      const bookRepository = Container.getBookRepository();
      const goalRepository = Container.getGoalRepository();
      const useCase = new UpdateBookUseCase(bookRepository, goalRepository);

      const book = await useCase.execute({
        bookId: id,
        userId,
        updates: sanitizedUpdates,
      });

      reply.send({ book });
    })
  );

  // DELETE /books/:id - Delete a book
  app.delete<{
    Params: { id: string };
  }>(
    '/books/:id',
    {
      schema: deleteBookSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };

      const bookRepository = Container.getBookRepository();
      const useCase = new DeleteBookUseCase(bookRepository);

      await useCase.execute({
        bookId: id,
        userId,
      });

      reply.send({ message: 'Book deleted successfully' });
    })
  );
}
