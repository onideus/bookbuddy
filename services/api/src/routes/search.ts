import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { SearchBooksUseCase } from '../../../../application/use-cases/search/search-books';
import { wrapHandler } from '../utils/error-handler';
import { ValidationError } from '../../../../domain/errors/domain-errors';

interface SearchQuerystring {
  q?: string;
}

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
            properties: {
              googleBooksId: { type: 'string' },
              title: { type: 'string' },
              authors: { type: 'array', items: { type: 'string' } },
              thumbnail: { type: 'string' },
              description: { type: 'string' },
              pageCount: { type: 'number' },
            },
          },
        },
      },
    },
  },
};

export function registerSearchRoutes(app: FastifyInstance) {
  // GET /search - Search for books via Google Books API
  app.get<{
    Querystring: SearchQuerystring;
  }>(
    '/search',
    { schema: searchBooksSchema },
    wrapHandler(async (request, reply) => {
      const { q: query } = request.query as SearchQuerystring;

      const externalBookSearch = Container.getExternalBookSearch();
      const useCase = new SearchBooksUseCase(externalBookSearch);
      // Schema validation ensures query is defined
      const books = await useCase.execute({ query: query! });

      reply.send({ books });
    })
  );
}
