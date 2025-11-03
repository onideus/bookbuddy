"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateError = exports.ValidationError = exports.UnauthorizedError = exports.NotFoundError = exports.DomainError = void 0;
class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DomainError';
    }
}
exports.DomainError = DomainError;
class NotFoundError extends DomainError {
    constructor(entity, id) {
        super(`${entity} with id ${id} not found`);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends DomainError {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ValidationError extends DomainError {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class DuplicateError extends DomainError {
    constructor(entity, field) {
        super(`${entity} with this ${field} already exists`);
        this.name = 'DuplicateError';
    }
}
exports.DuplicateError = DuplicateError;
