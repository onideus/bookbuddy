"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGoalRoutes = registerGoalRoutes;
const container_1 = require("../../../../lib/di/container");
const get_user_goals_1 = require("../../../../application/use-cases/goals/get-user-goals");
const create_goal_1 = require("../../../../application/use-cases/goals/create-goal");
const update_goal_1 = require("../../../../application/use-cases/goals/update-goal");
const delete_goal_1 = require("../../../../application/use-cases/goals/delete-goal");
const error_handler_1 = require("../utils/error-handler");
const auth_1 = require("../middleware/auth");
function registerGoalRoutes(app) {
    // GET /goals - List user's goals
    app.get('/goals', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new get_user_goals_1.GetUserGoalsUseCase(goalRepository);
        const goals = await useCase.execute({ userId });
        reply.send({ goals });
    }));
    // POST /goals - Create a goal
    app.post('/goals', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { title, description, targetBooks, startDate, endDate } = request.body;
        const goalRepository = container_1.Container.getGoalRepository();
        const useCase = new create_goal_1.CreateGoalUseCase(goalRepository);
        const goal = await useCase.execute({
            userId,
            title,
            description,
            targetBooks,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        reply.code(201).send({ goal });
    }));
    // PATCH /goals/:id - Update a goal
    app.patch('/goals/:id', {
        preHandler: auth_1.authenticate,
    }, (0, error_handler_1.wrapHandler)(async (request, reply) => {
        const userId = request.user.userId;
        const { id } = request.params;
        const updates = { ...request.body };
        // Convert date strings to Date objects if present
        if (updates.startDate) {
            updates.startDate = new Date(updates.startDate);
        }
        if (updates.endDate) {
            updates.endDate = new Date(updates.endDate);
        }
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
