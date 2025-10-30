/**
 * Book Search API Routes (T026, T027, T028)
 * Endpoints for searching books and creating books from search results
 */

import { getBookSearchService } from '../../services/book-search/index.js';
import { Book } from '../../models/book.js';
import { BookEdition } from '../../models/book-edition.js';
import { BookMetadataSource } from '../../models/book-metadata-source.js';
import { ReadingEntry } from '../../models/reading-entry.js';
import { extractBookData, extractEditionData } from '../../services/book-search/normalizer.js';

/**
 * Register book search routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function bookSearchRoutes(fastify) {
  const bookSearchService = getBookSearchService();

  /**
   * GET /api/books/search
   * Search for books by title, author, or ISBN
   */
  fastify.get('/api/books/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2, maxLength: 500 },
          type: { type: 'string', enum: ['general', 'title', 'author', 'isbn'] },
          limit: { type: 'integer', minimum: 1, maximum: 40 },
          offset: { type: 'integer', minimum: 0 },
          provider: { type: 'string', enum: ['google_books', 'open_library'] },
        },
      },
    },
    handler: async (request, reply) => {
      const { q: query, type = 'general', limit = 20, offset = 0, provider = 'google_books' } = request.query;

      try {
        const startTime = Date.now();
        const results = await bookSearchService.search(query, {
          type,
          limit,
          offset,
          provider,
        });

        const responseTime = Date.now() - startTime;

        reply.send({
          success: true,
          data: {
            results: results.results,
            totalCount: results.totalCount,
            limit,
            offset,
            query,
            provider: results.provider,
            fromCache: results.fromCache,
            stale: results.stale || false,
          },
          meta: {
            responseTime,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        request.log.error({ err: error }, 'Book search failed');

        const statusCode = error.message.includes('Query must be')
          ? 400
          : error.message.includes('RATE_LIMIT')
          ? 429
          : 500;

        reply.status(statusCode).send({
          success: false,
          error: {
            message: error.message,
            code: statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'SEARCH_FAILED',
          },
        });
      }
    },
  });

  /**
   * POST /api/books/from-search
   * Create a book, edition, and reading entry from a search result
   */
  fastify.post('/api/books/from-search', {
    schema: {
      body: {
        type: 'object',
        required: ['searchResult', 'status'],
        properties: {
          searchResult: {
            type: 'object',
            required: ['providerId', 'provider', 'title', 'author'],
          },
          status: { type: 'string', enum: ['TO_READ', 'READING', 'FINISHED'] },
          overrides: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const { searchResult, status, overrides = {} } = request.body;
      const readerId = request.session?.readerId || 'default-reader'; // TODO: Get from auth

      try {
        // Extract and merge with overrides
        let bookData = extractBookData(searchResult);
        bookData = { ...bookData, ...overrides };

        // Check for duplicate by ISBN first
        let existingBook = null;
        let existingEdition = null;

        if (searchResult.isbn13 || searchResult.isbn10) {
          const isbn = searchResult.isbn13 || searchResult.isbn10;
          existingEdition = await BookEdition.findByISBN(isbn);

          if (existingEdition) {
            existingBook = await Book.findById(existingEdition.bookId);
          }
        }

        // Create or use existing book
        let book;
        if (existingBook) {
          book = existingBook;
          request.log.info({ bookId: book.id }, 'Using existing book (ISBN match)');
        } else {
          // Create new book
          book = await Book.create(bookData);
          request.log.info({ bookId: book.id }, 'Created new book');
        }

        // Create edition if doesn't exist
        let edition;
        if (existingEdition) {
          edition = existingEdition;
        } else {
          const editionData = extractEditionData(searchResult, book.id);
          edition = await BookEdition.create(editionData);
          request.log.info({ editionId: edition.id }, 'Created new edition');
        }

        // Create metadata source record
        await BookMetadataSource.create({
          bookEditionId: edition.id,
          provider: searchResult.provider,
          rawPayload: searchResult.raw || searchResult,
        });

        // Create reading entry
        const readingEntry = await ReadingEntry.create({
          bookId: book.id,
          readerId,
          status,
        });

        request.log.info(
          { readingEntryId: readingEntry.id, bookId: book.id },
          'Created reading entry from search result'
        );

        reply.status(201).send({
          success: true,
          data: {
            book,
            edition,
            readingEntry,
          },
        });
      } catch (error) {
        request.log.error({ err: error }, 'Failed to create book from search');

        reply.status(500).send({
          success: false,
          error: {
            message: error.message,
            code: 'CREATE_FAILED',
          },
        });
      }
    },
  });
}

export default bookSearchRoutes;
