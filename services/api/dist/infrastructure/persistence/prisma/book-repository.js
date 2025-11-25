"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaBookRepository = void 0;
const client_1 = require("./client");
const logging_1 = require("../../logging");
const log = (0, logging_1.createLogger)('BookRepository');
const DEFAULT_PAGE_SIZE = 20;
class PrismaBookRepository {
    async create(book) {
        const created = await client_1.prisma.book.create({
            data: {
                id: book.id,
                userId: book.userId,
                googleBooksId: book.googleBooksId,
                title: book.title,
                authors: book.authors,
                thumbnail: book.thumbnail,
                description: book.description,
                pageCount: book.pageCount,
                status: book.status,
                currentPage: book.currentPage ?? 0,
                rating: book.rating,
                addedAt: book.addedAt,
                finishedAt: book.finishedAt,
                genres: book.genres ?? [],
            },
        });
        return this.mapToBook(created);
    }
    async findByUserId(userId) {
        const books = await client_1.prisma.book.findMany({
            where: { userId },
            orderBy: { addedAt: 'desc' },
        });
        return books.map(this.mapToBook);
    }
    async findByUserIdPaginated(userId, options) {
        const limit = options.limit ?? DEFAULT_PAGE_SIZE;
        // Get total count
        const totalCount = await client_1.prisma.book.count({ where: { userId } });
        let books;
        if (options.cursor) {
            books = await client_1.prisma.book.findMany({
                where: { userId },
                orderBy: { addedAt: 'desc' },
                take: limit + 1,
                cursor: { id: options.cursor },
                skip: 1,
            });
        }
        else {
            books = await client_1.prisma.book.findMany({
                where: { userId },
                orderBy: { addedAt: 'desc' },
                take: limit + 1,
            });
        }
        const hasMore = books.length > limit;
        const resultBooks = hasMore ? books.slice(0, limit) : books;
        const nextCursor = hasMore ? resultBooks[resultBooks.length - 1]?.id ?? null : null;
        return {
            books: resultBooks.map(this.mapToBook),
            nextCursor,
            hasMore,
            totalCount,
        };
    }
    async countByUserId(userId) {
        return client_1.prisma.book.count({ where: { userId } });
    }
    async findById(id) {
        const book = await client_1.prisma.book.findUnique({
            where: { id },
        });
        if (!book)
            return undefined;
        return this.mapToBook(book);
    }
    async update(id, updates) {
        try {
            log.debug('Updating book', { bookId: id, fields: Object.keys(updates) });
            const updated = await client_1.prisma.book.update({
                where: { id },
                data: {
                    ...(updates.status !== undefined && { status: updates.status }),
                    ...(updates.currentPage !== undefined && { currentPage: updates.currentPage }),
                    ...(updates.rating !== undefined && { rating: updates.rating }),
                    ...(updates.finishedAt !== undefined && { finishedAt: updates.finishedAt }),
                    ...(updates.title !== undefined && { title: updates.title }),
                    ...(updates.authors !== undefined && { authors: updates.authors }),
                    ...(updates.thumbnail !== undefined && { thumbnail: updates.thumbnail }),
                    ...(updates.description !== undefined && { description: updates.description }),
                    ...(updates.pageCount !== undefined && { pageCount: updates.pageCount }),
                    ...(updates.genres !== undefined && { genres: updates.genres }),
                },
            });
            log.info('Book updated successfully', { bookId: updated.id });
            return this.mapToBook(updated);
        }
        catch (error) {
            log.error('Failed to update book', { bookId: id, error: error.message });
            return null;
        }
    }
    async delete(id) {
        try {
            await client_1.prisma.book.delete({
                where: { id },
            });
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    async findByStatus(userId, status) {
        const books = await client_1.prisma.book.findMany({
            where: {
                userId,
                status,
            },
            orderBy: { addedAt: 'desc' },
        });
        return books.map(this.mapToBook);
    }
    async findByGenre(userId, genre) {
        const books = await client_1.prisma.book.findMany({
            where: {
                userId,
                genres: { has: genre },
            },
            orderBy: { addedAt: 'desc' },
        });
        return books.map(this.mapToBook);
    }
    async getUniqueGenres(userId) {
        const books = await client_1.prisma.book.findMany({
            where: { userId },
            select: { genres: true },
        });
        const allGenres = books.flatMap((book) => book.genres);
        const uniqueGenres = [...new Set(allGenres)].sort();
        return uniqueGenres;
    }
    mapToBook(prismaBook) {
        return {
            id: prismaBook.id,
            userId: prismaBook.userId,
            googleBooksId: prismaBook.googleBooksId,
            title: prismaBook.title,
            authors: prismaBook.authors,
            thumbnail: prismaBook.thumbnail ?? undefined,
            description: prismaBook.description ?? undefined,
            pageCount: prismaBook.pageCount ?? undefined,
            status: prismaBook.status,
            currentPage: prismaBook.currentPage ?? undefined,
            rating: prismaBook.rating ?? undefined,
            addedAt: prismaBook.addedAt,
            finishedAt: prismaBook.finishedAt ?? undefined,
            genres: prismaBook.genres ?? [],
        };
    }
}
exports.PrismaBookRepository = PrismaBookRepository;
