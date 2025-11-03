"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserBooksUseCase = void 0;
class GetUserBooksUseCase {
    constructor(bookRepository) {
        this.bookRepository = bookRepository;
    }
    async execute(input) {
        return this.bookRepository.findByUserId(input.userId);
    }
}
exports.GetUserBooksUseCase = GetUserBooksUseCase;
