import Foundation

// MARK: - Module Exports

@_exported import Application

// Re-export commonly used types for convenience
@_exported import CoreDomain

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

    /// Development configuration (localhost with Vercel dev server)
    public static var development: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "http://127.0.0.1:3000/api")!,
            enableLogging: true
        )
    }

    /// Production configuration (Vercel deployment)
    public static var production: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "https://bookbuddy-mk3.vercel.app/api")!,
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
        keychainManager = .shared
        networkClient = NetworkClient(
            baseURL: configuration.baseURL,
            keychainManager: keychainManager
        )
    }

    // MARK: - Services

    public func makeAuthenticationService() -> AuthenticationService {
        AuthenticationService(
            networkClient: networkClient,
            keychainManager: keychainManager
        )
    }

    public func makeExternalBookSearchService() -> ExternalBookSearchService {
        ExternalBookSearchService(networkClient: networkClient)
    }

    // MARK: - Repositories

    public func makeBookRepository() -> BookRepositoryProtocol {
        BookRepository(networkClient: networkClient)
    }

    public func makeGoalRepository() -> GoalRepositoryProtocol {
        GoalRepository(networkClient: networkClient)
    }

    public func makeUserRepository() -> UserRepositoryProtocol {
        let authService = makeAuthenticationService()
        return UserRepository(authService: authService)
    }

    public func makeStreakRepository() -> StreakRepositoryProtocol {
        StreakRepository(networkClient: networkClient)
    }

    // MARK: - Network

    public func makeNetworkClient() -> NetworkClientProtocol {
        networkClient
    }
}
