"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.DomainError = void 0;
class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DomainError';
        Object.setPrototypeOf(this, DomainError.prototype);
    }
}
exports.DomainError = DomainError;
class NotFoundError extends DomainError {
    constructor(entity, id) {
        super(`${entity} with id ${id} not found`);
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends DomainError {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends DomainError {
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends DomainError {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class DuplicateError extends DomainError {
    constructor(entity, field) {
        super(`${entity} with this ${field} already exists`);
        this.name = 'DuplicateError';
        Object.setPrototypeOf(this, DuplicateError.prototype);
    }
}
exports.DuplicateError = DuplicateError;
