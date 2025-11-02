import Foundation

/// Protocol for password hashing and verification
public protocol PasswordHasherProtocol {
    /// Hashes a plaintext password
    /// - Parameter password: Plaintext password
    /// - Returns: Hashed password string
    /// - Throws: Error if hashing fails
    func hash(_ password: String) async throws -> String

    /// Compares a plaintext password with a hash
    /// - Parameters:
    ///   - password: Plaintext password
    ///   - hash: Hashed password to compare against
    /// - Returns: True if password matches hash
    /// - Throws: Error if comparison fails
    func compare(_ password: String, hash: String) async throws -> Bool
}
