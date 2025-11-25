"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStreakRoutes = registerStreakRoutes;
const container_1 = require("../../../../lib/di/container");
const record_reading_activity_1 = require("../../../../application/use-cases/streaks/record-reading-activity");
const get_user_streak_1 = require("../../../../application/use-cases/streaks/get-user-streak");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
function registerStreakRoutes(app) {
    // GET /streaks - Get current user's streak stats
    app.get('/streaks', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const readingActivityRepository = container_1.Container.getReadingActivityRepository();
        const useCase = new get_user_streak_1.GetUserStreakUseCase(readingActivityRepository);
        const streakStats = await useCase.execute({ userId });
        reply.send(streakStats);
    }));
    // POST /streaks/activity - Record reading activity
    app.post('/streaks/activity', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const body = request.body;
        const { bookId, pagesRead, minutesRead, date } = body;
        const readingActivityRepository = container_1.Container.getReadingActivityRepository();
        const useCase = new record_reading_activity_1.RecordReadingActivityUseCase(readingActivityRepository);
        const activity = await useCase.execute({
            userId,
            bookId,
            pagesRead,
            minutesRead,
            date: date ? new Date(date) : undefined,
        });
        reply.code(201).send(activity);
    }));
    // GET /streaks/history - Get reading activity history
    app.get('/streaks/history', { preHandler: auth_1.authenticate }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const query = request.query;
        const { startDate, endDate } = query;
        const readingActivityRepository = container_1.Container.getReadingActivityRepository();
        let activities;
        if (startDate && endDate) {
            activities = await readingActivityRepository.findByUserIdAndDateRange(userId, new Date(startDate), new Date(endDate));
        }
        else {
            activities = await readingActivityRepository.findByUserId(userId);
        }
        reply.send({ activities });
    }));
}
