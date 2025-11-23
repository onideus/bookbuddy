import Foundation

// MARK: - Module Exports

// Re-export commonly used types for convenience
@_exported import CoreDomain
@_exported import Application

// Note: Types defined in this module (NetworkClient, APIError, APIEndpoint,
// KeychainManager, AuthenticationService, ExternalBookSearchService, 
// BookRepository, GoalRepository, UserRepository) are already directly 
// accessible and don't need typealiases

// MARK: - Configuration

/// Configuration for the Infrastructure layer
public struct InfrastructureConfiguration {
    public let baseURL: URL
    public let enableLogging: Bool

    public init(baseURL: URL, enableLogging: Bool = false) {
        self.baseURL = baseURL
        self.enableLogging = enableLogging
    }

    /// Development configuration (localhost)
    public static var development: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "http://localhost:4000")!,
            enableLogging: true
        )
    }

    /// Production configuration
    /// TODO: Replace with actual production URL
    public static var production: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "https://api.bookbuddy.app")!,
            enableLogging: false
        )
    }
}

// MARK: - Factory

/// Factory for creating infrastructure components
@available(iOS 15.0, macOS 12.0, *)
public struct InfrastructureFactory {
    private let configuration: InfrastructureConfiguration
    private let networkClient: NetworkClientProtocol
    private let keychainManager: KeychainManager

    public init(configuration: InfrastructureConfiguration) {
        self.configuration = configuration
        self.keychainManager = .shared
        self.networkClient = NetworkClient(
            baseURL: configuration.baseURL,
            keychainManager: keychainManager
        )
    }

    // MARK: - Services

    public func makeAuthenticationService() -> AuthenticationService {
        return AuthenticationService(
            networkClient: networkClient,
            keychainManager: keychainManager
        )
    }

    public func makeExternalBookSearchService() -> ExternalBookSearchService {
        return ExternalBookSearchService(networkClient: networkClient)
    }

    // MARK: - Repositories

    public func makeBookRepository() -> BookRepositoryProtocol {
        return BookRepository(networkClient: networkClient)
    }

    public func makeGoalRepository() -> GoalRepositoryProtocol {
        return GoalRepository(networkClient: networkClient)
    }

    public func makeUserRepository() -> UserRepositoryProtocol {
        let authService = makeAuthenticationService()
        return UserRepository(authService: authService)
    }

    // MARK: - Network

    public func makeNetworkClient() -> NetworkClientProtocol {
        return networkClient
    }
}
