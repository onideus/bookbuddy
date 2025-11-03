"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchBooksUseCase = void 0;
class SearchBooksUseCase {
    constructor(externalBookSearch) {
        this.externalBookSearch = externalBookSearch;
    }
    async execute(input) {
        if (!input.query || input.query.trim().length === 0) {
            return [];
        }
        return this.externalBookSearch.search(input.query);
    }
}
exports.SearchBooksUseCase = SearchBooksUseCase;
