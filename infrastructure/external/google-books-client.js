"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleBooksClient = void 0;
class GoogleBooksClient {
    constructor() {
        this.apiUrl = 'https://www.googleapis.com/books/v1/volumes';
    }
    async search(query) {
        try {
            const response = await fetch(`${this.apiUrl}?q=${encodeURIComponent(query)}&maxResults=20`);
            if (!response.ok) {
                throw new Error('Failed to search books');
            }
            const data = await response.json();
            return data.items || [];
        }
        catch (error) {
            console.error('Google Books API error:', error);
            return [];
        }
    }
}
exports.GoogleBooksClient = GoogleBooksClient;
