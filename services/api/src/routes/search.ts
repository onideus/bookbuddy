import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { SearchBooksUseCase } from '../../../../application/use-cases/search/search-books';
import { wrapHandler } from '../utils/error-handler';
import { ValidationError } from '../../../../domain/errors/domain-errors';

interface SearchQuerystring {
  q?: string;
}

export function registerSearchRoutes(app: FastifyInstance) {
  // GET /search - Search for books via Google Books API
  app.get<{
    Querystring: SearchQuerystring;
  }>(
    '/search',
    wrapHandler(async (request, reply) => {
      const { q: query } = request.query as SearchQuerystring;

      if (!query || query.trim().length === 0) {
        throw new ValidationError('Query parameter "q" is required');
      }

      const externalBookSearch = Container.getExternalBookSearch();
      const useCase = new SearchBooksUseCase(externalBookSearch);
      const books = await useCase.execute({ query });

      reply.send({ books });
    })
  );
}
