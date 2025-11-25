"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaBookRepository = void 0;
const client_1 = require("./client");
const logging_1 = require("../../logging");
const log = (0, logging_1.createLogger)('BookRepository');
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
        };
    }
}
exports.PrismaBookRepository = PrismaBookRepository;
