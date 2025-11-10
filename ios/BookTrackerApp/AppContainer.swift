import SwiftUI
import InfrastructureIOS

/// Main dependency container for the app
/// Manages the lifecycle of services and repositories
@MainActor
final class AppContainer: ObservableObject {
    // MARK: - Configuration
    
    private let infrastructureFactory: InfrastructureFactory
    
    // MARK: - Services
    
    lazy var authenticationService: AuthenticationService = {
        infrastructureFactory.makeAuthenticationService()
    }()
    
    lazy var externalBookSearchService: ExternalBookSearchService = {
        infrastructureFactory.makeExternalBookSearchService()
    }()
    
    // MARK: - Repositories
    
    lazy var bookRepository: BookRepositoryProtocol = {
        infrastructureFactory.makeBookRepository()
    }()
    
    lazy var goalRepository: GoalRepositoryProtocol = {
        infrastructureFactory.makeGoalRepository()
    }()
    
    lazy var userRepository: UserRepositoryProtocol = {
        infrastructureFactory.makeUserRepository()
    }()
    
    // MARK: - Initialization
    
    init(configuration: InfrastructureConfiguration = .development) {
        self.infrastructureFactory = InfrastructureFactory(configuration: configuration)
    }
    
    // MARK: - Authentication State
    
    /// Check if user is currently authenticated
    var isAuthenticated: Bool {
        authenticationService.isAuthenticated()
    }
    
    // MARK: - View Model Factories
    
    /// Creates an authentication view model
    func makeAuthViewModel() -> AuthViewModel {
        AuthViewModel(authService: authenticationService)
    }
    
    // MARK: - Convenience
    
    /// Creates a container for production use
    static func production() -> AppContainer {
        AppContainer(configuration: .production)
    }
    
    /// Creates a container for testing
    static func mock() -> AppContainer {
        AppContainer(configuration: .development)
    }
}
