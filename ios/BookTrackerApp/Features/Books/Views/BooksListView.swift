import Application
import CoreDomain
import SwiftUI

struct BooksListView: View {
    @StateObject var viewModel: BooksListViewModel
    @State private var showingAddBook = false
    @State private var showingImport = false

    // Dependencies for AddBookView
    let searchBooksUseCase: SearchBooksUseCase
    let addBookUseCase: AddBookUseCase
    let currentUserId: String
    let networkClient: NetworkClientProtocol

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

                        // Books list
                        if viewModel.hasFilteredBooks {
                            LazyVStack(spacing: 12) {
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
                                    .onAppear {
                                        viewModel.loadMoreIfNeeded(currentItem: book)
                                    }
                                }

                                // Loading more indicator
                                if viewModel.isLoadingMore {
                                    HStack {
                                        Spacer()
                                        ProgressView()
                                            .padding()
                                        Spacer()
                                    }
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
            ToolbarItem(placement: .navigationBarLeading) {
                Button(
                    action: { showingImport = true },
                    label: {
                        Label("Import", systemImage: "square.and.arrow.down")
                    }
                )
            }

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
            AddBookView(
                viewModel: SearchBooksViewModel(
                    searchBooksUseCase: searchBooksUseCase,
                    addBookUseCase: addBookUseCase,
                    currentUserId: currentUserId
                ),
                onBookAdded: {
                    Task {
                        await viewModel.refresh()
                    }
                }
            )
        }
        .sheet(isPresented: $showingImport) {
            ImportGoodreadsView(
                viewModel: ImportGoodreadsViewModel(networkClient: networkClient),
                onImportCompleted: {
                    Task {
                        await viewModel.refresh()
                    }
                }
            )
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
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                action()
            }
        } label: {
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
            .animation(.easeInOut(duration: 0.2), value: isSelected)
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
    let externalBookSearch = MockExternalBookSearch()
    NavigationView {
        BooksListView(
            viewModel: BooksListViewModel(
                getUserBooksUseCase: GetUserBooksUseCase(bookRepository: repository),
                updateBookUseCase: UpdateBookUseCase(bookRepository: repository),
                deleteBookUseCase: DeleteBookUseCase(bookRepository: repository),
                currentUserId: "user1"
            ),
            searchBooksUseCase: SearchBooksUseCase(externalBookSearch: externalBookSearch),
            addBookUseCase: AddBookUseCase(bookRepository: repository),
            currentUserId: "user1"
        )
    }
}

// MARK: - Mock implementations (for preview)

@MainActor
private class MockBookRepository: BookRepositoryProtocol {
    func create(_ book: Book) async throws -> Book {
        book
    }

    func findByUserId(_: String) async throws -> [Book] {
        []
    }

    // Pagination overload
    func findByUserId(_: String, offset _: Int, limit _: Int?) async throws -> [Book] {
        []
    }

    func findById(_: String) async throws -> Book? {
        nil
    }

    func findByStatus(_: String, status _: BookStatus) async throws -> [Book] {
        []
    }

    // Performance optimization method
    func exists(userId _: String, googleBooksId _: String) async throws -> Bool {
        false
    }

    func update(_: String, updates _: BookUpdate) async throws -> Book? {
        nil
    }

    func delete(_: String) async throws -> Bool {
        true
    }
}

@MainActor
private class MockExternalBookSearch: ExternalBookSearchProtocol {
    func search(_: String) async throws -> [BookSearchResult] {
        []
    }

    func getById(_: String) async throws -> BookSearchResult? {
        nil
    }
}
