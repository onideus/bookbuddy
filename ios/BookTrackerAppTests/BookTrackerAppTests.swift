import SwiftUI
import XCTest
@testable import BookTrackerApp

final class BookTrackerAppTests: XCTestCase {
    // MARK: - Smoke Tests

    @MainActor func testAppContainerInitialization() throws {
        // Test that AppContainer can be initialized without crashing
        let container = AppContainer()
        XCTAssertNotNil(container)
        XCTAssertNotNil(container.authService)
        XCTAssertNotNil(container.bookRepository)
        XCTAssertNotNil(container.goalRepository)
        XCTAssertNotNil(container.searchService)
    }

    @MainActor func testAuthenticationFlowComponents() throws {
        // Test that authentication components can be created
        let container = AppContainer()

        // Test AuthViewModel creation
        let authViewModel = container.makeAuthViewModel()
        XCTAssertNotNil(authViewModel)
        XCTAssertFalse(authViewModel.isLoading)
        XCTAssertNil(authViewModel.errorMessage)

        // Test initial authentication state
        // Should be false since we're not logged in
        XCTAssertFalse(container.isAuthenticated)
        XCTAssertNil(container.currentUserId)
    }

    @MainActor func testViewModelCreation() throws {
        // Test that all view models can be created without crashing
        let container = AppContainer()

        // Set a mock user ID for view models that require it
        container.setCurrentUser(userId: "test-user-id")

        // Test view model creation
        let booksViewModel = container.makeBooksViewModel()
        XCTAssertNotNil(booksViewModel)

        let goalsViewModel = container.makeGoalsViewModel()
        XCTAssertNotNil(goalsViewModel)

        let searchViewModel = container.makeSearchViewModel()
        XCTAssertNotNil(searchViewModel)
    }

    @MainActor func testUseCaseCreation() throws {
        // Test that use cases can be created
        let container = AppContainer()

        let searchBooksUseCase = container.makeSearchBooksUseCase()
        XCTAssertNotNil(searchBooksUseCase)

        let addBookUseCase = container.makeAddBookUseCase()
        XCTAssertNotNil(addBookUseCase)
    }

    @MainActor func testAuthenticationStateManagement() throws {
        // Test authentication state updates
        let container = AppContainer()

        // Initially not authenticated
        XCTAssertFalse(container.isAuthenticated)
        XCTAssertNil(container.currentUserId)

        // Set authenticated user
        container.setCurrentUser(userId: "test-user-123")
        XCTAssertTrue(container.isAuthenticated)
        XCTAssertEqual(container.currentUserId, "test-user-123")

        // Clear authentication
        container.setCurrentUser(userId: nil)
        XCTAssertFalse(container.isAuthenticated)
        XCTAssertNil(container.currentUserId)
    }
}
