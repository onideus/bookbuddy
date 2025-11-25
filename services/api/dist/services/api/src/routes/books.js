"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookRoutes = registerBookRoutes;
const container_1 = require("../../../../lib/di/container");
const add_book_1 = require("../../../../application/use-cases/books/add-book");
const update_book_1 = require("../../../../application/use-cases/books/update-book");
const delete_book_1 = require("../../../../application/use-cases/books/delete-book");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
const sanitize_1 = require("../../../../lib/utils/sanitize");
// JSON Schema for GET /books
const getBooksSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: ['to-read', 'reading', 'completed'] },
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
            status: { type: 'string', enum: ['to-read', 'reading', 'completed'] },
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
            status: { type: 'string', enum: ['to-read', 'reading', 'completed'] },
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
function registerBookRoutes(app) {
    // GET /books - List user's books (optionally filter by status or genre)
    // Supports cursor-based pagination with ?cursor=<id>&limit=<number>
    app.get('/books', {
        schema: getBooksSchema,
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
        schema: addBookSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { googleBooksId, title, authors, thumbnail, description, pageCount, status, genres } = request.body;
        const bookRepository = container_1.Container.getBookRepository();
        const useCase = new add_book_1.AddBookUseCase(bookRepository);
        const book = await useCase.execute({
            userId,
            googleBooksId,
            title: (0, sanitize_1.sanitizeString)(title),
            authors: authors ? authors.map(a => (0, sanitize_1.sanitizeString)(a)) : [],
            thumbnail: thumbnail ? (0, sanitize_1.sanitizeString)(thumbnail) : thumbnail,
            description: description ? (0, sanitize_1.sanitizeString)(description) : description,
            pageCount,
            status,
            genres: genres ? genres.map(g => (0, sanitize_1.sanitizeString)(g)) : genres,
        });
        reply.code(201).send({ book });
    }));
    // PATCH /books/:id - Update a book
    app.patch('/books/:id', {
        schema: updateBookSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const updates = request.body;
        // Sanitize string fields in updates
        const sanitizedUpdates = {
            ...updates,
            ...(updates.genres !== undefined && { genres: updates.genres.map(g => (0, sanitize_1.sanitizeString)(g)) }),
        };
        const bookRepository = container_1.Container.getBookRepository();
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new update_book_1.UpdateBookUseCase(bookRepository, goalRepository);
        const book = await useCase.execute({
            bookId: id,
            userId,
            updates: sanitizedUpdates,
        });
        reply.send({ book });
    }));
    // DELETE /books/:id - Delete a book
    app.delete('/books/:id', {
        schema: deleteBookSchema,
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
