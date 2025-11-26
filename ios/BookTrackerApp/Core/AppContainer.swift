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

    @Published var isAuthenticated = false
    @Published var currentUserId: String?

    init(configuration: InfrastructureConfiguration = .production) {
        self.configuration = configuration
        factory = InfrastructureFactory(configuration: configuration)

        // Initialize services
        authService = factory.makeAuthenticationService()
        bookRepository = factory.makeBookRepository()
        goalRepository = factory.makeGoalRepository()
        streakRepository = factory.makeStreakRepository()
        searchService = factory.makeExternalBookSearchService()

        // Check authentication status on app launch
        isAuthenticated = authService.isAuthenticated()

        // If authenticated, we should retrieve the user ID from stored token
        // For now, we'll set it when login/register succeeds via callback

        #if DEBUG
        print("DEBUG: App launched - isAuthenticated: \(isAuthenticated)")
        #endif
    }

    // MARK: - Factory Methods

    func makeAuthViewModel() -> AuthViewModel {
        AuthViewModel(authService: authService) { [weak self] userId in
            self?.setCurrentUser(userId: userId)
        }
    }

    func makeBooksViewModel() -> BooksListViewModel {
        BooksListViewModel(bookRepository: bookRepository, currentUserId: getCurrentUserId())
    }

    func makeGoalsViewModel() -> GoalsViewModel {
        GoalsViewModel(goalRepository: goalRepository, currentUserId: getCurrentUserId())
    }

    func makeSearchViewModel() -> SearchViewModel {
        SearchViewModel(
            searchService: searchService,
            bookRepository: bookRepository,
            currentUserId: getCurrentUserId()
        )
    }

    func makeSearchBooksUseCase() -> SearchBooksUseCase {
        SearchBooksUseCase(externalBookSearch: searchService)
    }

    func makeAddBookUseCase() -> AddBookUseCase {
        AddBookUseCase(bookRepository: bookRepository)
    }

    func makeStreakViewModel() -> StreakViewModel {
        StreakViewModel(streakRepository: streakRepository)
    }

    func makeDashboardViewModel() -> DashboardViewModel {
        DashboardViewModel(
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
        currentUserId = userId
        isAuthenticated = userId != nil
        print(
            "DEBUG: User authentication state updated - userId: \(userId ?? "nil"), isAuthenticated: \(isAuthenticated)"
        )
    }

    /// Update authentication state (for logout or token expiration)
    func updateAuthenticationState() {
        let authenticated = authService.isAuthenticated()
        if !authenticated {
            // Clear user ID if not authenticated
            currentUserId = nil
        }
        isAuthenticated = authenticated
    }

    // MARK: - Preview Support

    static func mock() -> AppContainer {
        AppContainer(configuration: .development)
    }
}
