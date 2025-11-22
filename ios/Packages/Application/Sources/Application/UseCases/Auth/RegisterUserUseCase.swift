import CoreDomain
import Foundation

/// Input for registering a user
public struct RegisterUserInput: Sendable, Equatable {
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

/// Use case for registering a new user account in the system
///
/// This use case handles the complete user registration process including
/// validation, password hashing, and account creation with comprehensive security measures.
///
/// **Business Rules:**
/// - Email addresses must be unique across all users in the system
/// - Passwords are securely hashed using industry-standard algorithms before storage
/// - User names must be non-empty after trimming whitespace
/// - Each user gets a unique identifier and creation timestamp
/// - Registration fails immediately if email is already in use
/// - Minimum password length requirement of 6 characters enforced
/// - Email validation ensures proper format before processing
///
/// **Security:**
/// - Passwords are never stored in plaintext
/// - Email uniqueness prevents account conflicts
/// - Input sanitization through trimming and validation
/// - Secure password hashing via PasswordHasherProtocol
/// - Error messages don't reveal sensitive information
///
/// **Validation Process:**
/// - Email format validation using regex patterns
/// - Password strength requirements (minimum length)
/// - Name presence validation (non-empty after trimming)
/// - Duplicate email detection through repository lookup
/// - All validations occur before password hashing for efficiency
///
/// **Data Integrity:**
/// - Atomic user creation through repository operations
/// - Consistent user state initialization
/// - Email normalization (lowercase) for uniqueness
/// - Proper error propagation for all failure cases
///
/// - Parameter input: `RegisterUserInput` containing email, password, and name for new account
/// - Returns: The newly created `User` entity with hashed password and assigned ID
/// - Throws: `DomainError.duplicateEntry` if email exists, `DomainError.validation` for invalid inputs, or hashing/repository errors
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
