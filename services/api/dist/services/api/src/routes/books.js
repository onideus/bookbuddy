"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookRoutes = registerBookRoutes;
const container_1 = require("../../../../lib/di/container");
const get_user_books_1 = require("../../../../application/use-cases/books/get-user-books");
const add_book_1 = require("../../../../application/use-cases/books/add-book");
const update_book_1 = require("../../../../application/use-cases/books/update-book");
const delete_book_1 = require("../../../../application/use-cases/books/delete-book");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
function registerBookRoutes(app) {
    // GET /books - List user's books
    app.get('/books', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const bookRepository = container_1.Container.getBookRepository();
        const useCase = new get_user_books_1.GetUserBooksUseCase(bookRepository);
        const books = await useCase.execute({ userId });
        reply.send({ books });
    }));
    // POST /books - Add a book
    app.post('/books', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { googleBooksId, title, authors, thumbnail, description, pageCount, status } = request.body;
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
        const useCase = new update_book_1.UpdateBookUseCase(bookRepository);
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
