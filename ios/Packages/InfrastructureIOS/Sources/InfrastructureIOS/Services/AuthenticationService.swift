import CoreDomain
import Foundation

/// Service for managing authentication operations
public final class AuthenticationService {
    private let networkClient: NetworkClientProtocol
    private let keychainManager: KeychainManager

    public init(
        networkClient: NetworkClientProtocol,
        keychainManager: KeychainManager = .shared
    ) {
        self.networkClient = networkClient
        self.keychainManager = keychainManager
    }

    // MARK: - Public API

    /// Register a new user
    public func register(email: String, password: String, name: String) async throws -> User {
        let endpoint = try APIEndpoint.register(email: email, password: password, name: name)
        let response: RegisterResponse = try await networkClient.request(endpoint)

        // Save tokens
        try keychainManager.saveAccessToken(response.accessToken)
        try keychainManager.saveRefreshToken(response.refreshToken)

        return response.user.toDomain()
    }

    /// Login with email and password
    public func login(email: String, password: String) async throws -> User {
        let endpoint = try APIEndpoint.login(email: email, password: password)
        let response: LoginResponse = try await networkClient.request(endpoint)

        // Save tokens
        try keychainManager.saveAccessToken(response.accessToken)
        try keychainManager.saveRefreshToken(response.refreshToken)

        return response.user.toDomain()
    }

    /// Refresh the access token using the refresh token
    public func refreshToken() async throws {
        guard let refreshToken = try keychainManager.getRefreshToken() else {
            throw APIError.unauthorized
        }

        let endpoint = try APIEndpoint.refreshToken(refreshToken: refreshToken)
        let response: RefreshTokenResponse = try await networkClient.request(endpoint)

        // Save new tokens
        try keychainManager.saveAccessToken(response.accessToken)
        try keychainManager.saveRefreshToken(response.refreshToken)
    }

    /// Logout the current user
    public func logout() async throws {
        guard let refreshToken = try keychainManager.getRefreshToken() else {
            // Already logged out, just clear tokens
            try keychainManager.deleteTokens()
            return
        }

        do {
            let endpoint = try APIEndpoint.logout(refreshToken: refreshToken)
            let _: LogoutResponse = try await networkClient.request(endpoint)
        } catch {
            // Even if logout fails on server, clear local tokens
            print("Logout request failed: \(error.localizedDescription)")
        }

        // Clear stored tokens
        try keychainManager.deleteTokens()
    }

    /// Check if user is currently authenticated
    public func isAuthenticated() -> Bool {
        do {
            return try keychainManager.getAccessToken() != nil
        } catch {
            return false
        }
    }

    /// Get the current access token
    public func getAccessToken() throws -> String? {
        return try keychainManager.getAccessToken()
    }
}
