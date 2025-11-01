//
//  User.swift
//  CoreDomain
//
//  Domain entity representing a user in the BookTracker system
//

import Foundation

/// Represents a user in the BookTracker application
public struct User: Identifiable, Codable, Equatable, Hashable {
    /// Unique identifier for the user
    public let id: String

    /// User's email address (unique)
    public let email: String

    /// Hashed password (bcrypt)
    public let password: String

    /// User's display name
    public let name: String

    /// Account creation timestamp
    public let createdAt: Date

    /// Initializes a new User entity
    /// - Parameters:
    ///   - id: Unique identifier (UUID)
    ///   - email: User's email address
    ///   - password: Hashed password
    ///   - name: User's display name
    ///   - createdAt: Account creation timestamp
    public init(
        id: String,
        email: String,
        password: String,
        name: String,
        createdAt: Date
    ) {
        self.id = id
        self.email = email
        self.password = password
        self.name = name
        self.createdAt = createdAt
    }
}

// MARK: - Domain Logic Extensions

public extension User {
    /// Validates email format
    /// - Parameter email: Email address to validate
    /// - Returns: True if email format is valid
    static func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$"#
        let emailPredicate = NSPredicate(format: "SELF MATCHES[c] %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    /// Validates password strength
    /// - Parameter password: Password to validate
    /// - Returns: True if password meets minimum requirements
    static func isValidPassword(_ password: String) -> Bool {
        // Minimum 8 characters
        return password.count >= 8
    }

    /// Creates a new user with validated inputs
    /// - Parameters:
    ///   - email: User's email
    ///   - password: Hashed password
    ///   - name: User's display name
    /// - Throws: ValidationError if inputs are invalid
    /// - Returns: New User instance
    static func create(
        email: String,
        password: String,
        name: String
    ) throws -> User {
        guard isValidEmail(email) else {
            throw DomainError.validation("Invalid email format")
        }

        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw DomainError.validation("Name cannot be empty")
        }

        return User(
            id: UUID().uuidString,
            email: email.lowercased(),
            password: password,
            name: name.trimmingCharacters(in: .whitespaces),
            createdAt: Date()
        )
    }
}

// MARK: - Codable Implementation

extension User {
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case password
        case name
        case createdAt
    }
}
