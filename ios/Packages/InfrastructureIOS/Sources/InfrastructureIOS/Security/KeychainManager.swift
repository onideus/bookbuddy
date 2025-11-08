import Foundation
import Security

/// Manager for securely storing and retrieving sensitive data from the Keychain
public final class KeychainManager {
    public static let shared = KeychainManager()

    private let service: String

    private init(service: String = "com.bookbuddy.app") {
        self.service = service
    }

    // MARK: - Public API

    /// Save a string value to the Keychain
    public func save(_ value: String, for key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.invalidData
        }

        try save(data, for: key)
    }

    /// Save data to the Keychain
    public func save(_ data: Data, for key: String) throws {
        // Delete any existing item
        try? delete(key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    /// Retrieve a string value from the Keychain
    public func getString(for key: String) throws -> String? {
        guard let data = try getData(for: key) else {
            return nil
        }

        guard let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.invalidData
        }

        return string
    }

    /// Retrieve data from the Keychain
    public func getData(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw KeychainError.retrievalFailed(status)
        }

        guard let data = result as? Data else {
            throw KeychainError.invalidData
        }

        return data
    }

    /// Delete a value from the Keychain
    public func delete(_ key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        // It's okay if the item doesn't exist
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deletionFailed(status)
        }
    }

    /// Delete all values from the Keychain for this service
    public func deleteAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]

        let status = SecItemDelete(query as CFDictionary)

        // It's okay if no items exist
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deletionFailed(status)
        }
    }
}

// MARK: - Token Storage Convenience Methods
extension KeychainManager {
    private enum Keys {
        static let accessToken = "accessToken"
        static let refreshToken = "refreshToken"
    }

    public func saveAccessToken(_ token: String) throws {
        try save(token, for: Keys.accessToken)
    }

    public func getAccessToken() throws -> String? {
        try getString(for: Keys.accessToken)
    }

    public func saveRefreshToken(_ token: String) throws {
        try save(token, for: Keys.refreshToken)
    }

    public func getRefreshToken() throws -> String? {
        try getString(for: Keys.refreshToken)
    }

    public func deleteTokens() throws {
        try delete(Keys.accessToken)
        try delete(Keys.refreshToken)
    }
}

// MARK: - Keychain Errors
public enum KeychainError: LocalizedError {
    case invalidData
    case saveFailed(OSStatus)
    case retrievalFailed(OSStatus)
    case deletionFailed(OSStatus)

    public var errorDescription: String? {
        switch self {
        case .invalidData:
            return "Invalid data format"
        case .saveFailed(let status):
            return "Failed to save to Keychain (status: \(status))"
        case .retrievalFailed(let status):
            return "Failed to retrieve from Keychain (status: \(status))"
        case .deletionFailed(let status):
            return "Failed to delete from Keychain (status: \(status))"
        }
    }
}
