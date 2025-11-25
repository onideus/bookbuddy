"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGoalRoutes = registerGoalRoutes;
const container_1 = require("../../../../lib/di/container");
const create_goal_1 = require("../../../../application/use-cases/goals/create-goal");
const update_goal_1 = require("../../../../application/use-cases/goals/update-goal");
const delete_goal_1 = require("../../../../application/use-cases/goals/delete-goal");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
const sanitize_1 = require("../../../../lib/utils/sanitize");
// JSON Schema for GET /goals
const getGoalsSchema = {
    querystring: {
        type: 'object',
        properties: {
            cursor: { type: 'string', format: 'uuid' },
            limit: { type: 'string', pattern: '^[0-9]+$' },
        },
    },
};
// JSON Schema for POST /goals
const createGoalSchema = {
    body: {
        type: 'object',
        required: ['title', 'targetBooks', 'startDate', 'endDate'],
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            targetBooks: { type: 'number', minimum: 1 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                goal: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        targetBooks: { type: 'number' },
                        currentBooks: { type: 'number' },
                    },
                },
            },
        },
    },
};
// JSON Schema for PATCH /goals/:id
const updateGoalSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            targetBooks: { type: 'number', minimum: 1 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                goal: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        targetBooks: { type: 'number' },
                    },
                },
            },
        },
    },
};
// JSON Schema for DELETE /goals/:id
const deleteGoalSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    },
};
function registerGoalRoutes(app) {
    // GET /goals - List user's goals with pagination
    app.get('/goals', {
        schema: getGoalsSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const query = request.query;
        const { cursor, limit: limitStr } = query;
        const goalRepository = container_1.Container.getGoalRepository();
        const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;
        const result = await goalRepository.findByUserIdPaginated(userId, { cursor, limit });
        reply.send({
            goals: result.goals,
            pagination: {
                nextCursor: result.nextCursor,
                hasMore: result.hasMore,
                totalCount: result.totalCount,
            },
        });
    }));
    // POST /goals - Create a goal
    app.post('/goals', {
        schema: createGoalSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { title, description, targetBooks, startDate, endDate } = request.body;
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new create_goal_1.CreateGoalUseCase(goalRepository);
        const goal = await useCase.execute({
            userId,
            title: (0, sanitize_1.sanitizeString)(title),
            description: description ? (0, sanitize_1.sanitizeString)(description) : description,
            targetBooks,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        reply.code(201).send({ goal });
    }));
    // PATCH /goals/:id - Update a goal
    app.patch('/goals/:id', {
        schema: updateGoalSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const body = request.body;
        // Convert date strings to Date objects if present and build properly typed updates
        const updates = {
            ...(body.title !== undefined && { title: (0, sanitize_1.sanitizeString)(body.title) }),
            ...(body.description !== undefined && { description: (0, sanitize_1.sanitizeString)(body.description) }),
            ...(body.targetBooks !== undefined && { targetBooks: body.targetBooks }),
            ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
            ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        };
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new update_goal_1.UpdateGoalUseCase(goalRepository);
        const goal = await useCase.execute({
            goalId: id,
            userId,
            updates,
        });
        reply.send({ goal });
    }));
    // DELETE /goals/:id - Delete a goal
    app.delete('/goals/:id', {
        schema: deleteGoalSchema,
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new delete_goal_1.DeleteGoalUseCase(goalRepository);
        await useCase.execute({
            goalId: id,
            userId,
        });
        reply.send({ message: 'Goal deleted successfully' });
    }));
}
