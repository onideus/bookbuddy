import Foundation
import CoreDomain

/// Implementation of UserRepositoryProtocol using REST API
/// Note: User operations are primarily handled through AuthenticationService
/// This repository provides a consistent interface for user data operations
public final class UserRepository: UserRepositoryProtocol {
    private let authService: AuthenticationService

    public init(authService: AuthenticationService) {
        self.authService = authService
    }

    // MARK: - UserRepositoryProtocol

    public func create(_ user: User) async throws -> User {
        // User creation is handled through registration
        return try await authService.register(
            email: user.email,
            password: user.password,
            name: user.name
        )
    }

    public func findByEmail(_ email: String) async throws -> User? {
        // The API doesn't provide a user lookup endpoint
        // This would require authentication and returning current user
        throw DomainError.general("User lookup by email not supported in current API")
    }

    public func findById(_ id: String) async throws -> User? {
        // The API doesn't provide a user lookup endpoint
        // This would require authentication and returning current user
        throw DomainError.general("User lookup by ID not supported in current API")
    }

    public func update(_ id: String, updates: UserUpdate) async throws -> User? {
        // The API doesn't currently support user updates
        // This would be implemented when the backend adds user profile endpoints
        throw DomainError.general("User updates not supported in current API")
    }

    public func delete(_ id: String) async throws -> Bool {
        // The API doesn't currently support user deletion
        // This would be implemented when the backend adds user management endpoints
        throw DomainError.general("User deletion not supported in current API")
    }
}
