import Application
import CoreDomain
import SwiftUI

struct AddBookView: View {
    @StateObject var viewModel: SearchBooksViewModel
    @Environment(\.dismiss) var dismiss

    @State private var showingSuccessMessage = false
    @State private var addedBookTitle = ""

    var onBookAdded: () -> Void

    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 0) {
                    // Search bar
                    SearchBar(text: $viewModel.searchQuery)
                        .padding()

                    // Content
                    if viewModel.isSearching {
                        ProgressView("Searching...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if viewModel.showEmptyState {
                        EmptySearchResultsView()
                    } else if viewModel.hasResults {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(viewModel.searchResults, id: \.id) { result in
                                    BookSearchResultCard(
                                        searchResult: result,
                                        onAdd: { result, status in
                                            Task {
                                                await addBook(result, status: status)
                                            }
                                        }
                                    )
                                }
                            }
                            .padding()
                        }
                    } else {
                        InitialSearchView()
                    }
                }

                // Success overlay
                if showingSuccessMessage {
                    SuccessOverlay(bookTitle: addedBookTitle)
                        .transition(.opacity.combined(with: .scale))
                }
            }
            .navigationTitle("Add Book")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                }
            }
        }
    }

    // MARK: - Actions

    private func addBook(_ searchResult: BookSearchResult, status: BookStatus) async {
        do {
            try await viewModel.addBook(searchResult, status: status)
            addedBookTitle = searchResult.volumeInfo.title

            // Show success message
            withAnimation {
                showingSuccessMessage = true
            }

            // Hide success message and dismiss after delay
            try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
            onBookAdded()
            dismiss()
        } catch let error as DomainError {
            switch error {
            case .duplicate(let message):
                viewModel.errorMessage = message
            default:
                viewModel.errorMessage = "Failed to add book: \(error.localizedDescription)"
            }
        } catch {
            viewModel.errorMessage = "Failed to add book: \(error.localizedDescription)"
        }
    }
}

// MARK: - Initial Search View

struct InitialSearchView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text("Search for Books")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Enter a title, author, or ISBN to find books to add to your library")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Empty Search Results

struct EmptySearchResultsView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "book.closed")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text("No Books Found")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Try a different search term or check your spelling")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Success Overlay

struct SuccessOverlay: View {
    let bookTitle: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)

            Text("Book Added!")
                .font(.title2)
                .fontWeight(.semibold)

            Text(bookTitle)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .padding(.horizontal, 40)
        }
        .padding(40)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.2), radius: 20, x: 0, y: 10)
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.4))
    }
}

// MARK: - Preview

#Preview {
    let mockSearch = MockExternalBookSearch()
    let mockRepository = MockBookRepository()

    AddBookView(
        viewModel: SearchBooksViewModel(
            searchBooksUseCase: SearchBooksUseCase(externalBookSearch: mockSearch),
            addBookUseCase: AddBookUseCase(bookRepository: mockRepository),
            currentUserId: "user1"
        ),
        onBookAdded: {}
    )
}

// MARK: - Mock implementations (for preview)

@MainActor
private class MockExternalBookSearch: ExternalBookSearchProtocol {
    func search(_: String) async throws -> [BookSearchResult] {
        []
    }

    func getById(_: String) async throws -> BookSearchResult? {
        nil
    }
}

@MainActor
private class MockBookRepository: BookRepositoryProtocol {
    func create(_ book: Book) async throws -> Book {
        book
    }

    func findByUserId(_: String) async throws -> [Book] {
        []
    }

    func findById(_: String) async throws -> Book? {
        nil
    }

    func findByStatus(_: String, status _: BookStatus) async throws -> [Book] {
        []
    }

    func update(_: String, updates _: BookUpdate) async throws -> Book? {
        nil
    }

    func delete(_: String) async throws -> Bool {
        true
    }

    func exists(_: String) async throws -> Bool {
        false
    }
}
