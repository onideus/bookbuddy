import Foundation

/// Base error type for all domain errors
public enum DomainError: Error, LocalizedError {
    /// Entity not found
    case notFound(String)

    /// Unauthorized access (authentication issues)
    case unauthorized(String)

    /// User doesn't own the resource they're trying to access
    case ownershipMismatch

    /// Operation conflicts with existing data (e.g., concurrent modification)
    case conflict(String)

    /// Validation failure
    case validation(String)

    /// Duplicate entry
    case duplicate(String)

    /// Infrastructure/system error with wrapped underlying error
    case infrastructure(Error)

    /// General domain error
    case general(String)

    /// Error description for logging
    public var errorDescription: String? {
        switch self {
        case .notFound(let message):
            "Not Found: \(message)"
        case .unauthorized(let message):
            "Unauthorized: \(message)"
        case .ownershipMismatch:
            "You don't have permission to access or modify this resource."
        case .conflict(let message):
            "Conflict: \(message)"
        case .validation(let message):
            "Validation Error: \(message)"
        case .duplicate(let message):
            "Duplicate: \(message)"
        case .infrastructure(let error):
            "System Error: \(error.localizedDescription)"
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
        case .ownershipMismatch:
            "You can only modify items that belong to your account."
        case .conflict(let message):
            message
        case .validation(let message):
            message
        case .duplicate(let message):
            message
        case .infrastructure(let error):
            "A system error occurred. Please try again later. (\(error.localizedDescription))"
        case .general(let message):
            message
        }
    }

    /// Failure reason for LocalizedError compliance
    public var failureReason: String? {
        switch self {
        case .notFound:
            "The requested resource could not be found."
        case .unauthorized:
            "You are not authenticated or your session has expired."
        case .ownershipMismatch:
            "The resource belongs to another user."
        case .conflict:
            "The operation conflicts with the current state of the resource."
        case .validation:
            "The provided data failed validation."
        case .duplicate:
            "A resource with the same identifier already exists."
        case .infrastructure:
            "An underlying system error occurred."
        case .general:
            "An unexpected error occurred."
        }
    }

    /// Recovery suggestion for LocalizedError compliance
    public var recoverySuggestion: String? {
        switch self {
        case .notFound:
            "Verify the resource exists and try again."
        case .unauthorized:
            "Please log in again to continue."
        case .ownershipMismatch:
            "Ensure you're accessing your own resources."
        case .conflict:
            "Refresh the data and try again."
        case .validation:
            "Check your input and correct any errors."
        case .duplicate:
            "Use a different identifier or update the existing resource."
        case .infrastructure:
            "Wait a moment and try again. If the problem persists, contact support."
        case .general:
            "Try again or contact support if the problem persists."
        }
    }

    /// Error code for categorization
    public var code: String {
        switch self {
        case .notFound:
            "NOT_FOUND"
        case .unauthorized:
            "UNAUTHORIZED"
        case .ownershipMismatch:
            "OWNERSHIP_MISMATCH"
        case .conflict:
            "CONFLICT"
        case .validation:
            "VALIDATION_ERROR"
        case .duplicate:
            "DUPLICATE"
        case .infrastructure:
            "INFRASTRUCTURE_ERROR"
        case .general:
            "GENERAL_ERROR"
        }
    }
}

// MARK: - Equatable Conformance

extension DomainError: Equatable {
    public static func == (lhs: DomainError, rhs: DomainError) -> Bool {
        switch (lhs, rhs) {
        case (.notFound(let lhsMsg), .notFound(let rhsMsg)):
            lhsMsg == rhsMsg
        case (.unauthorized(let lhsMsg), .unauthorized(let rhsMsg)):
            lhsMsg == rhsMsg
        case (.ownershipMismatch, .ownershipMismatch):
            true
        case (.conflict(let lhsMsg), .conflict(let rhsMsg)):
            lhsMsg == rhsMsg
        case (.validation(let lhsMsg), .validation(let rhsMsg)):
            lhsMsg == rhsMsg
        case (.duplicate(let lhsMsg), .duplicate(let rhsMsg)):
            lhsMsg == rhsMsg
        case (.infrastructure(let lhsErr), .infrastructure(let rhsErr)):
            lhsErr.localizedDescription == rhsErr.localizedDescription
        case (.general(let lhsMsg), .general(let rhsMsg)):
            lhsMsg == rhsMsg
        default:
            false
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

    /// Checks if error is an ownership mismatch error
    var isOwnershipMismatch: Bool {
        if case .ownershipMismatch = self {
            return true
        }
        return false
    }

    /// Checks if error is a conflict error
    var isConflict: Bool {
        if case .conflict = self {
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

    /// Checks if error is an infrastructure error
    var isInfrastructure: Bool {
        if case .infrastructure = self {
            return true
        }
        return false
    }

    /// Gets the underlying error if this is an infrastructure error
    var underlyingError: Error? {
        if case .infrastructure(let error) = self {
            return error
        }
        return nil
    }
}
