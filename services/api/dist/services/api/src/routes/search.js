"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearchRoutes = registerSearchRoutes;
const container_1 = require("../../../../lib/di/container");
const search_books_1 = require("../../../../application/use-cases/search/search-books");
const error_handler_1 = require("../utils/error-handler");
// JSON Schema for GET /search
const searchBooksSchema = {
    querystring: {
        type: 'object',
        required: ['q'],
        properties: {
            q: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                books: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['id', 'volumeInfo'],
                        properties: {
                            id: { type: 'string' },
                            volumeInfo: {
                                type: 'object',
                                required: ['title'],
                                properties: {
                                    title: { type: 'string' },
                                    authors: { type: 'array', items: { type: 'string' } },
                                    description: { type: 'string' },
                                    imageLinks: {
                                        type: 'object',
                                        properties: {
                                            thumbnail: { type: 'string' },
                                        },
                                    },
                                    pageCount: { type: 'number' },
                                    publishedDate: { type: 'string' },
                                    publisher: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
function registerSearchRoutes(app) {
    // GET /search - Search for books via Google Books API
    app.get('/search', { schema: searchBooksSchema }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { q: query } = request.query;
        const externalBookSearch = container_1.Container.getExternalBookSearch();
        const useCase = new search_books_1.SearchBooksUseCase(externalBookSearch);
        // Schema validation ensures query is defined
        const books = await useCase.execute({ query: query });
        reply.send({ books });
    }));
}
