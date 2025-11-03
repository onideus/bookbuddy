"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserGoalsUseCase = void 0;
class GetUserGoalsUseCase {
    constructor(goalRepository) {
        this.goalRepository = goalRepository;
    }
    async execute(input) {
        return this.goalRepository.findByUserId(input.userId);
    }
}
exports.GetUserGoalsUseCase = GetUserGoalsUseCase;
