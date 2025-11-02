import Foundation

/// Protocol for user repository operations
public protocol UserRepositoryProtocol {
    /// Creates a new user
    /// - Parameter user: User entity to create
    /// - Returns: Created user
    /// - Throws: DomainError if creation fails
    func create(_ user: User) async throws -> User

    /// Finds a user by email address
    /// - Parameter email: Email address to search for
    /// - Returns: User if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func findByEmail(_ email: String) async throws -> User?

    /// Finds a user by ID
    /// - Parameter id: User ID to search for
    /// - Returns: User if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func findById(_ id: String) async throws -> User?

    /// Updates an existing user
    /// - Parameters:
    ///   - id: User ID to update
    ///   - updates: Partial user updates
    /// - Returns: Updated user if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func update(_ id: String, updates: UserUpdate) async throws -> User?

    /// Deletes a user
    /// - Parameter id: User ID to delete
    /// - Returns: True if deleted, false if not found
    /// - Throws: DomainError if operation fails
    func delete(_ id: String) async throws -> Bool
}

/// Struct representing partial user updates
public struct UserUpdate: Equatable {
    public let email: String?
    public let password: String?
    public let name: String?

    public init(
        email: String? = nil,
        password: String? = nil,
        name: String? = nil
    ) {
        self.email = email
        self.password = password
        self.name = name
    }
}
