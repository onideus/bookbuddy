"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookRoutes = registerBookRoutes;
const container_1 = require("../../../../lib/di/container");
const get_user_books_1 = require("../../../../application/use-cases/books/get-user-books");
function registerBookRoutes(app) {
    app.get('/books', async (request, reply) => {
        const headerUserId = request.headers['x-user-id'];
        const queryUserId = request.query.userId;
        const userId = typeof headerUserId === 'string' && headerUserId.trim()
            ? headerUserId
            : queryUserId;
        if (!userId) {
            reply.code(401).send({ error: 'Missing user context' });
            return;
        }
        try {
            const bookRepository = container_1.Container.getBookRepository();
            const useCase = new get_user_books_1.GetUserBooksUseCase(bookRepository);
            const books = await useCase.execute({ userId });
            reply.send({ books });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to fetch books');
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
