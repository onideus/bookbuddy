"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExportRoutes = registerExportRoutes;
const container_1 = require("../../../../lib/di/container");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
const domain_errors_1 = require("../../../../domain/errors/domain-errors");
function booksToCSV(books) {
    const headers = [
        'id',
        'title',
        'authors',
        'status',
        'currentPage',
        'pageCount',
        'rating',
        'genres',
        'addedAt',
        'finishedAt',
    ];
    const rows = books.map((book) => [
        book.id,
        `"${book.title.replace(/"/g, '""')}"`,
        `"${book.authors.join(', ').replace(/"/g, '""')}"`,
        book.status,
        book.currentPage ?? '',
        book.pageCount ?? '',
        book.rating ?? '',
        `"${book.genres.join(', ').replace(/"/g, '""')}"`,
        book.addedAt.toISOString(),
        book.finishedAt?.toISOString() ?? '',
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
function goalsToCSV(goals) {
    const headers = [
        'id',
        'title',
        'description',
        'targetBooks',
        'currentBooks',
        'startDate',
        'endDate',
        'completed',
    ];
    const rows = goals.map((goal) => [
        goal.id,
        `"${goal.title.replace(/"/g, '""')}"`,
        `"${(goal.description ?? '').replace(/"/g, '""')}"`,
        goal.targetBooks,
        goal.currentBooks,
        goal.startDate.toISOString(),
        goal.endDate.toISOString(),
        goal.completed,
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
function registerExportRoutes(app) {
    // GET /export/books - Export user's books
    app.get('/export/books', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const format = (request.query.format ?? 'json');
        if (format !== 'json' && format !== 'csv') {
            throw new domain_errors_1.ValidationError('Format must be "json" or "csv"');
        }
        const bookRepository = container_1.Container.getBookRepository();
        const books = await bookRepository.findByUserId(userId);
        if (format === 'csv') {
            const csv = booksToCSV(books);
            reply
                .header('Content-Type', 'text/csv')
                .header('Content-Disposition', 'attachment; filename="books.csv"')
                .send(csv);
        }
        else {
            reply
                .header('Content-Type', 'application/json')
                .header('Content-Disposition', 'attachment; filename="books.json"')
                .send({
                exportedAt: new Date().toISOString(),
                count: books.length,
                books,
            });
        }
    }));
    // GET /export/goals - Export user's goals
    app.get('/export/goals', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const format = (request.query.format ?? 'json');
        if (format !== 'json' && format !== 'csv') {
            throw new domain_errors_1.ValidationError('Format must be "json" or "csv"');
        }
        const goalRepository = container_1.Container.getGoalRepository();
        const goals = await goalRepository.findByUserId(userId);
        if (format === 'csv') {
            const csv = goalsToCSV(goals);
            reply
                .header('Content-Type', 'text/csv')
                .header('Content-Disposition', 'attachment; filename="goals.csv"')
                .send(csv);
        }
        else {
            reply
                .header('Content-Type', 'application/json')
                .header('Content-Disposition', 'attachment; filename="goals.json"')
                .send({
                exportedAt: new Date().toISOString(),
                count: goals.length,
                goals,
            });
        }
    }));
    // GET /export/all - Export all user data
    app.get('/export/all', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const format = (request.query.format ?? 'json');
        if (format !== 'json') {
            throw new domain_errors_1.ValidationError('Full export only supports JSON format');
        }
        const bookRepository = container_1.Container.getBookRepository();
        const goalRepository = container_1.Container.getGoalRepository();
        const readingActivityRepository = container_1.Container.getReadingActivityRepository();
        const [books, goals, activities] = await Promise.all([
            bookRepository.findByUserId(userId),
            goalRepository.findByUserId(userId),
            readingActivityRepository.findByUserId(userId),
        ]);
        reply
            .header('Content-Type', 'application/json')
            .header('Content-Disposition', 'attachment; filename="booktracker-export.json"')
            .send({
            exportedAt: new Date().toISOString(),
            books: {
                count: books.length,
                data: books,
            },
            goals: {
                count: goals.length,
                data: goals,
            },
            readingActivities: {
                count: activities.length,
                data: activities,
            },
        });
    }));
}
