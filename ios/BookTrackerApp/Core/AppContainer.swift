import InfrastructureIOS
import SwiftUI

/// Main app container managing dependencies and app state
@MainActor
final class AppContainer: ObservableObject {
    // MARK: - Configuration
    private let configuration: InfrastructureConfiguration
    private let factory: InfrastructureFactory

    // MARK: - Services
    let authService: AuthenticationService

    // MARK: - Repositories
    let bookRepository: BookRepositoryProtocol
    let goalRepository: GoalRepositoryProtocol
    let searchService: ExternalBookSearchService

    // MARK: - App State
    @Published var isAuthenticated: Bool = false
    @Published var currentUserId: String?

    init(configuration: InfrastructureConfiguration = .development) {
        self.configuration = configuration
        self.factory = InfrastructureFactory(configuration: configuration)

        // Initialize services
        self.authService = factory.makeAuthenticationService()
        self.bookRepository = factory.makeBookRepository()
        self.goalRepository = factory.makeGoalRepository()
        self.searchService = factory.makeExternalBookSearchService()

        // Clear keychain in DEBUG builds to always show login screen
        #if DEBUG
        try? KeychainManager.shared.deleteTokens()
        print("DEBUG: Cleared keychain tokens on app launch")
        // Force unauthenticated state in DEBUG to always show login screen
        self.isAuthenticated = false
        self.currentUserId = nil
        #else
        // Check authentication status
        self.isAuthenticated = authService.isAuthenticated()
        #endif
    }

    // MARK: - Factory Methods

    func makeAuthViewModel() -> AuthViewModel {
        return AuthViewModel(authService: authService) { [weak self] userId in
            self?.setCurrentUser(userId: userId)
        }
    }

    func makeBooksViewModel() -> BooksListViewModel {
        return BooksListViewModel(bookRepository: bookRepository, currentUserId: getCurrentUserId())
    }

    func makeGoalsViewModel() -> GoalsViewModel {
        return GoalsViewModel(goalRepository: goalRepository, currentUserId: getCurrentUserId())
    }

    func makeSearchViewModel() -> SearchViewModel {
        return SearchViewModel(
            searchService: searchService,
            bookRepository: bookRepository,
            currentUserId: getCurrentUserId()
        )
    }

    func makeSearchBooksUseCase() -> SearchBooksUseCase {
        return SearchBooksUseCase(externalBookSearch: searchService)
    }

    func makeAddBookUseCase() -> AddBookUseCase {
        return AddBookUseCase(bookRepository: bookRepository)
    }

    func getCurrentUserId() -> String {
        guard let userId = currentUserId else {
            // This should not happen in normal flow, but provide fallback
            print("WARNING: getCurrentUserId() called but no user is authenticated")
            return ""
        }
        return userId
    }

    // MARK: - Authentication State Management

    /// Set the current authenticated user
    func setCurrentUser(userId: String?) {
        self.currentUserId = userId
        self.isAuthenticated = userId != nil
        print("DEBUG: User authentication state updated - userId: \(userId ?? "nil"), isAuthenticated: \(isAuthenticated)")
    }

    /// Update authentication state (for logout or token expiration)
    func updateAuthenticationState() {
        let authenticated = authService.isAuthenticated()
        if !authenticated {
            // Clear user ID if not authenticated
            self.currentUserId = nil
        }
        self.isAuthenticated = authenticated
    }

    // MARK: - Preview Support

    static func mock() -> AppContainer {
        return AppContainer(configuration: .development)
    }
}
