//
//  DomainError.swift
//  CoreDomain
//
//  Domain-specific error types
//

import Foundation

/// Base error type for all domain errors
public enum DomainError: Error, Equatable, LocalizedError {
    /// Entity not found
    case notFound(String)

    /// Unauthorized access
    case unauthorized(String)

    /// Validation failure
    case validation(String)

    /// Duplicate entry
    case duplicate(String)

    /// General domain error
    case general(String)

    /// Error description for logging
    public var errorDescription: String? {
        switch self {
        case .notFound(let message):
            return "Not Found: \(message)"
        case .unauthorized(let message):
            return "Unauthorized: \(message)"
        case .validation(let message):
            return "Validation Error: \(message)"
        case .duplicate(let message):
            return "Duplicate: \(message)"
        case .general(let message):
            return "Error: \(message)"
        }
    }

    /// User-friendly error message
    public var localizedDescription: String {
        switch self {
        case .notFound(let message):
            return message
        case .unauthorized(let message):
            return message
        case .validation(let message):
            return message
        case .duplicate(let message):
            return message
        case .general(let message):
            return message
        }
    }

    /// Error code for categorization
    public var code: String {
        switch self {
        case .notFound:
            return "NOT_FOUND"
        case .unauthorized:
            return "UNAUTHORIZED"
        case .validation:
            return "VALIDATION_ERROR"
        case .duplicate:
            return "DUPLICATE"
        case .general:
            return "GENERAL_ERROR"
        }
    }
}

// MARK: - Convenience Initializers

public extension DomainError {
    /// Creates a not found error for a specific entity
    /// - Parameters:
    ///   - entityName: Name of the entity
    ///   - id: Entity identifier
    /// - Returns: NotFound error
    static func entityNotFound(_ entityName: String, id: String) -> DomainError {
        return .notFound("\(entityName) with ID '\(id)' not found")
    }

    /// Creates a validation error for a specific field
    /// - Parameters:
    ///   - fieldName: Name of the field
    ///   - reason: Validation failure reason
    /// - Returns: Validation error
    static func invalidField(_ fieldName: String, reason: String) -> DomainError {
        return .validation("\(fieldName): \(reason)")
    }

    /// Creates a duplicate entry error
    /// - Parameters:
    ///   - entityName: Name of the entity
    ///   - field: Field with duplicate value
    /// - Returns: Duplicate error
    static func duplicateEntry(_ entityName: String, field: String) -> DomainError {
        return .duplicate("\(entityName) with this \(field) already exists")
    }
}

// MARK: - Error Helpers

public extension DomainError {
    /// Checks if error is a not found error
    var isNotFound: Bool {
        if case .notFound = self {
            return true
        }
        return false
    }

    /// Checks if error is an unauthorized error
    var isUnauthorized: Bool {
        if case .unauthorized = self {
            return true
        }
        return false
    }

    /// Checks if error is a validation error
    var isValidation: Bool {
        if case .validation = self {
            return true
        }
        return false
    }

    /// Checks if error is a duplicate error
    var isDuplicate: Bool {
        if case .duplicate = self {
            return true
        }
        return false
    }
}
