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
            "Not Found: \(message)"
        case .unauthorized(let message):
            "Unauthorized: \(message)"
        case .validation(let message):
            "Validation Error: \(message)"
        case .duplicate(let message):
            "Duplicate: \(message)"
        case .general(let message):
            "Error: \(message)"
        }
    }

    /// User-friendly error message
    public var localizedDescription: String {
        switch self {
        case .notFound(let message):
            message
        case .unauthorized(let message):
            message
        case .validation(let message):
            message
        case .duplicate(let message):
            message
        case .general(let message):
            message
        }
    }

    /// Error code for categorization
    public var code: String {
        switch self {
        case .notFound:
            "NOT_FOUND"
        case .unauthorized:
            "UNAUTHORIZED"
        case .validation:
            "VALIDATION_ERROR"
        case .duplicate:
            "DUPLICATE"
        case .general:
            "GENERAL_ERROR"
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
        .notFound("\(entityName) with ID '\(id)' not found")
    }

    /// Creates a validation error for a specific field
    /// - Parameters:
    ///   - fieldName: Name of the field
    ///   - reason: Validation failure reason
    /// - Returns: Validation error
    static func invalidField(_ fieldName: String, reason: String) -> DomainError {
        .validation("\(fieldName): \(reason)")
    }

    /// Creates a duplicate entry error
    /// - Parameters:
    ///   - entityName: Name of the entity
    ///   - field: Field with duplicate value
    /// - Returns: Duplicate error
    static func duplicateEntry(_ entityName: String, field: String) -> DomainError {
        .duplicate("\(entityName) with this \(field) already exists")
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
