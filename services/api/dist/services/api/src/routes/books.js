"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookRoutes = registerBookRoutes;
const container_1 = require("../../../../lib/di/container");
const add_book_1 = require("../../../../application/use-cases/books/add-book");
const update_book_1 = require("../../../../application/use-cases/books/update-book");
const delete_book_1 = require("../../../../application/use-cases/books/delete-book");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
function registerBookRoutes(app) {
    // GET /books - List user's books (optionally filter by status or genre)
    // Supports cursor-based pagination with ?cursor=<id>&limit=<number>
    app.get('/books', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const query = request.query;
        const { status, genre, cursor, limit: limitStr } = query;
        const bookRepository = container_1.Container.getBookRepository();
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
    }));
    // GET /books/genres - Get all unique genres for user's books
    app.get('/books/genres', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const bookRepository = container_1.Container.getBookRepository();
        const genres = await bookRepository.getUniqueGenres(userId);
        reply.send({ genres });
    }));
    // POST /books - Add a book
    app.post('/books', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { googleBooksId, title, authors, thumbnail, description, pageCount, status, genres } = request.body;
        const bookRepository = container_1.Container.getBookRepository();
        const useCase = new add_book_1.AddBookUseCase(bookRepository);
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
    }));
    // PATCH /books/:id - Update a book
    app.patch('/books/:id', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const updates = request.body;
        const bookRepository = container_1.Container.getBookRepository();
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new update_book_1.UpdateBookUseCase(bookRepository, goalRepository);
        const book = await useCase.execute({
            bookId: id,
            userId,
            updates,
        });
        reply.send({ book });
    }));
    // DELETE /books/:id - Delete a book
    app.delete('/books/:id', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const bookRepository = container_1.Container.getBookRepository();
        const useCase = new delete_book_1.DeleteBookUseCase(bookRepository);
        await useCase.execute({
            bookId: id,
            userId,
        });
        reply.send({ message: 'Book deleted successfully' });
    }));
}
