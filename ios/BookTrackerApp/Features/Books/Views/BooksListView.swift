import Application
import CoreDomain
import SwiftUI

struct BooksListView: View {
    @StateObject var viewModel: BooksListViewModel
    @State private var showingAddBook = false

    var body: some View {
        ZStack {
            if viewModel.isLoading, !viewModel.hasBooks {
                // Loading state for initial load
                ProgressView("Loading books...")
            } else if !viewModel.hasBooks {
                // Empty state
                EmptyBooksView(onAddBook: { showingAddBook = true })
            } else {
                // Books list
                ScrollView {
                    VStack(spacing: 16) {
                        // Search bar
                        SearchBar(text: $viewModel.searchText)
                            .padding(.horizontal)

                        // Filter chips
                        FilterChipsView(
                            selectedFilter: $viewModel.selectedFilter,
                            counts: viewModel.bookCounts
                        )
                        .padding(.horizontal)

                        // Books grid
                        if viewModel.hasFilteredBooks {
                            LazyVGrid(
                                columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ],
                                spacing: 16
                            ) {
                                ForEach(viewModel.filteredBooks) { book in
                                    BookCard(
                                        book: book,
                                        onUpdate: { book, updates in
                                            Task {
                                                await viewModel.updateBook(book, updates: updates)
                                            }
                                        },
                                        onDelete: { book in
                                            Task {
                                                await viewModel.deleteBook(book)
                                            }
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal)
                        } else {
                            // No results for filter/search
                            NoResultsView(
                                filter: viewModel.selectedFilter,
                                searchText: viewModel.searchText
                            )
                            .padding()
                        }
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await viewModel.refresh()
                }
            }
        }
        .navigationTitle("My Books")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(
                    action: { showingAddBook = true },
                    label: {
                        Image(systemName: "plus")
                    }
                )
            }
        }
        .sheet(isPresented: $showingAddBook) {
            // NOTE: Add book sheet will be implemented in future update
            Text("Add Book - Coming Soon")
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
        .task {
            await viewModel.loadBooks()
        }
    }
}

// MARK: - Search Bar

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Search books...", text: $text)
                .textFieldStyle(.plain)

            if !text.isEmpty {
                Button(
                    action: { text = "" },
                    label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                )
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

// MARK: - Filter Chips

struct FilterChipsView: View {
    @Binding var selectedFilter: BookStatusFilter
    let counts: [BookStatusFilter: Int]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(BookStatusFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.displayName,
                        count: counts[filter] ?? 0,
                        isSelected: selectedFilter == filter,
                        action: { selectedFilter = filter }
                    )
                }
            }
        }
    }
}

struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("(\(count))")
                    .font(.caption)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Empty State

struct EmptyBooksView: View {
    let onAddBook: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "books.vertical")
                .font(.system(size: 80))
                .foregroundColor(.gray.opacity(0.5))

            Text("No Books Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Start building your library by adding your first book!")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button(action: onAddBook) {
                Label("Add Your First Book", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(25)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - No Results

struct NoResultsView: View {
    let filter: BookStatusFilter
    let searchText: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            if !searchText.isEmpty {
                Text("No books found for \"\(searchText)\"")
                    .font(.headline)
                Text("Try a different search term")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                Text("No books in \"\(filter.displayName)\"")
                    .font(.headline)
                Text("Books you add with this status will appear here")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxHeight: .infinity)
    }
}

// MARK: - Preview

#Preview {
    let repository = MockBookRepository()
    return NavigationView {
        BooksListView(
            viewModel: BooksListViewModel(
                getUserBooksUseCase: GetUserBooksUseCase(bookRepository: repository),
                updateBookUseCase: UpdateBookUseCase(bookRepository: repository),
                deleteBookUseCase: DeleteBookUseCase(bookRepository: repository),
                currentUserId: "user1"
            )
        )
    }
}

// MARK: - Mock implementations (for preview)

@MainActor
class MockBookRepository: BookRepositoryProtocol {
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
}
