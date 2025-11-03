"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteGoalUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
class DeleteGoalUseCase {
    constructor(goalRepository) {
        this.goalRepository = goalRepository;
    }
    async execute(input) {
        const goal = await this.goalRepository.findById(input.goalId);
        if (!goal) {
            throw new domain_errors_1.NotFoundError('Goal', input.goalId);
        }
        if (goal.userId !== input.userId) {
            throw new domain_errors_1.UnauthorizedError('You do not own this goal');
        }
        await this.goalRepository.delete(input.goalId);
    }
}
exports.DeleteGoalUseCase = DeleteGoalUseCase;
