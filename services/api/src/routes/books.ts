import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { GetUserBooksUseCase } from '../../../../application/use-cases/books/get-user-books';
import { AddBookUseCase } from '../../../../application/use-cases/books/add-book';
import { UpdateBookUseCase } from '../../../../application/use-cases/books/update-book';
import { DeleteBookUseCase } from '../../../../application/use-cases/books/delete-book';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { AddBookRequest, UpdateBookRequest } from '../../../../types/contracts';

interface BookQuerystring {
  status?: string;
  genre?: string;
  cursor?: string;
  limit?: string;
}

export function registerBookRoutes(app: FastifyInstance) {
  // GET /books - List user's books (optionally filter by status or genre)
  // Supports cursor-based pagination with ?cursor=<id>&limit=<number>
  app.get<{ Querystring: BookQuerystring }>(
    '/books',
    {
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
        title,
        authors: authors || [],
        thumbnail,
        description,
        pageCount,
        status,
        genres,
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
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };
      const updates = request.body as UpdateBookRequest;

      const bookRepository = Container.getBookRepository();
      const goalRepository = Container.getGoalRepository();
      const useCase = new UpdateBookUseCase(bookRepository, goalRepository);

      const book = await useCase.execute({
        bookId: id,
        userId,
        updates,
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
