import InfrastructureIOS
import SwiftUI

/// Main app container managing dependencies and app state
@MainActor
final class AppContainer: ObservableObject {
    // MARK: - Configuration
    private let configuration: InfrastructureConfiguration
    let factory: InfrastructureFactory

    // MARK: - Services
    let authService: AuthenticationService

    // MARK: - Repositories
    let bookRepository: BookRepositoryProtocol
    let goalRepository: GoalRepositoryProtocol
    let streakRepository: StreakRepositoryProtocol
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
        self.streakRepository = factory.makeStreakRepository()
        self.searchService = factory.makeExternalBookSearchService()

        // Check authentication status on app launch
        self.isAuthenticated = authService.isAuthenticated()
        
        // If authenticated, we should retrieve the user ID from stored token
        // For now, we'll set it when login/register succeeds via callback
        
        #if DEBUG
        print("DEBUG: App launched - isAuthenticated: \(isAuthenticated)")
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

    func makeStreakViewModel() -> StreakViewModel {
        return StreakViewModel(streakRepository: streakRepository)
    }

    func makeDashboardViewModel() -> DashboardViewModel {
        return DashboardViewModel(
            streakRepository: streakRepository,
            bookRepository: bookRepository,
            goalRepository: goalRepository
        )
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
