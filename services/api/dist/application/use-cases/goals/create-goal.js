"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGoalUseCase = void 0;
const domain_errors_1 = require("../../../domain/errors/domain-errors");
const crypto_1 = require("crypto");
class CreateGoalUseCase {
    constructor(goalRepository) {
        this.goalRepository = goalRepository;
    }
    async execute(input) {
        // Validation
        if (input.targetBooks <= 0) {
            throw new domain_errors_1.ValidationError('Target books must be greater than 0');
        }
        if (input.endDate <= input.startDate) {
            throw new domain_errors_1.ValidationError('End date must be after start date');
        }
        const goal = {
            id: (0, crypto_1.randomUUID)(),
            userId: input.userId,
            title: input.title,
            description: input.description,
            targetBooks: input.targetBooks,
            currentBooks: 0,
            startDate: input.startDate,
            endDate: input.endDate,
            completed: false,
        };
        return this.goalRepository.create(goal);
    }
}
exports.CreateGoalUseCase = CreateGoalUseCase;
