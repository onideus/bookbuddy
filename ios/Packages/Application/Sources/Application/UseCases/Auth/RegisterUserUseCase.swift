import CoreDomain
import Foundation

/// Input for registering a user
public struct RegisterUserInput {
    public let email: String
    public let password: String
    public let name: String

    public init(
        email: String,
        password: String,
        name: String
    ) {
        self.email = email
        self.password = password
        self.name = name
    }
}

/// Use case for user registration
public final class RegisterUserUseCase: UseCase {
    public typealias Input = RegisterUserInput
    public typealias Output = User

    private let userRepository: UserRepositoryProtocol
    private let passwordHasher: PasswordHasherProtocol

    public init(
        userRepository: UserRepositoryProtocol,
        passwordHasher: PasswordHasherProtocol
    ) {
        self.userRepository = userRepository
        self.passwordHasher = passwordHasher
    }

    public func execute(_ input: Input) async throws -> User {
        // Validate inputs
        guard !input.email.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw DomainError.validation("Email is required")
        }

        guard !input.password.isEmpty else {
            throw DomainError.validation("Password is required")
        }

        guard input.password.count >= 6 else {
            throw DomainError.validation("Password must be at least 6 characters")
        }

        guard !input.name.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw DomainError.validation("Name is required")
        }

        // Check if user already exists
        if try await userRepository.findByEmail(input.email.lowercased()) != nil {
            throw DomainError.duplicateEntry("User", field: "email")
        }

        // Hash the password
        let hashedPassword = try await passwordHasher.hash(input.password)

        // Create user entity
        let user = try User.create(
            email: input.email,
            password: hashedPassword,
            name: input.name
        )

        // Save to repository
        return try await userRepository.create(user)
    }
}
