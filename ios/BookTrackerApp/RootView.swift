import Application
import SwiftUI

/// Root view of the application
/// Handles top-level navigation and state management
struct RootView: View {
    @EnvironmentObject private var container: AppContainer
    
    var body: some View {
        NavigationStack {
            BooksListView(viewModel: makeBooksListViewModel())
        }
    }
    
    // MARK: - View Model Factories
    
    private func makeBooksListViewModel() -> BooksListViewModel {
        BooksListViewModel(
            getUserBooksUseCase: GetUserBooksUseCase(bookRepository: container.bookRepository),
            updateBookUseCase: UpdateBookUseCase(bookRepository: container.bookRepository),
            deleteBookUseCase: DeleteBookUseCase(bookRepository: container.bookRepository),
            currentUserId: "preview-user" // TODO: Get actual user ID from authentication
        )
    }
}

#Preview {
    RootView()
        .environmentObject(AppContainer.mock())
}
