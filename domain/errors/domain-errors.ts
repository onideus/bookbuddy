export class DomainError extends Error {
  readonly code: string;

  constructor(message: string, code: string = 'GENERAL_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error thrown when a user attempts to access/modify a resource they don't own.
 * Maps to iOS DomainError.ownershipMismatch
 */
export class OwnershipMismatchError extends DomainError {
  constructor(message: string = 'You can only modify items that belong to your account.') {
    super(message, 'OWNERSHIP_MISMATCH');
    this.name = 'OwnershipMismatchError';
    Object.setPrototypeOf(this, OwnershipMismatchError.prototype);
  }
}

/**
 * Error thrown when an operation conflicts with existing data.
 * Maps to iOS DomainError.conflict
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class DuplicateError extends DomainError {
  constructor(entity: string, field: string) {
    super(`${entity} with this ${field} already exists`, 'DUPLICATE');
    this.name = 'DuplicateError';
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}

/**
 * Error thrown when an infrastructure/system error occurs.
 * Wraps the underlying error for debugging purposes.
 * Maps to iOS DomainError.infrastructure(Error)
 */
export class InfrastructureError extends DomainError {
  readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message, 'INFRASTRUCTURE_ERROR');
    this.name = 'InfrastructureError';
    this.cause = cause;
    Object.setPrototypeOf(this, InfrastructureError.prototype);
  }
}
