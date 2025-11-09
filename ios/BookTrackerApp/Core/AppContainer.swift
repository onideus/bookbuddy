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

    init(configuration: InfrastructureConfiguration = .development) {
        self.configuration = configuration
        self.factory = InfrastructureFactory(configuration: configuration)

        // Initialize services
        self.authService = factory.makeAuthenticationService()
        self.bookRepository = factory.makeBookRepository()
        self.goalRepository = factory.makeGoalRepository()
        self.searchService = factory.makeExternalBookSearchService()

        // Check authentication status
        self.isAuthenticated = authService.isAuthenticated()
    }

    // MARK: - Factory Methods

    func makeAuthViewModel() -> AuthViewModel {
        return AuthViewModel(authService: authService)
    }

    func makeBooksViewModel() -> BooksListViewModel {
        return BooksListViewModel(bookRepository: bookRepository)
    }

    func makeGoalsViewModel() -> GoalsViewModel {
        return GoalsViewModel(goalRepository: goalRepository)
    }

    func makeSearchViewModel() -> SearchViewModel {
        return SearchViewModel(
            searchService: searchService,
            bookRepository: bookRepository
        )
    }

    // Update authentication state
    func updateAuthenticationState() {
        isAuthenticated = authService.isAuthenticated()
    }

    // MARK: - Preview Support

    static func mock() -> AppContainer {
        return AppContainer(configuration: .development)
    }
}
