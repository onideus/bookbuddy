"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearchRoutes = registerSearchRoutes;
const container_1 = require("../../../../lib/di/container");
const search_books_1 = require("../../../../application/use-cases/search/search-books");
const error_handler_1 = require("../utils/error-handler");
const domain_errors_1 = require("../../../../domain/errors/domain-errors");
function registerSearchRoutes(app) {
    // GET /search - Search for books via Google Books API
    app.get('/search', (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const { q: query } = request.query;
        if (!query || query.trim().length === 0) {
            throw new domain_errors_1.ValidationError('Query parameter "q" is required');
        }
        const externalBookSearch = container_1.Container.getExternalBookSearch();
        const useCase = new search_books_1.SearchBooksUseCase(externalBookSearch);
        const books = await useCase.execute({ query });
        reply.send({ books });
    }));
}
