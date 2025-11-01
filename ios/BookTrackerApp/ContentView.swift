//
//  ContentView.swift
//  BookTracker
//
//  Created by BookTracker Team
//

import SwiftUI
import CoreDomain
import Application
import Combine

struct ContentView: View {
    @StateObject private var viewModel: BooksListViewModel

    init() {
        let repository = PreviewBookRepository()
        _viewModel = StateObject(wrappedValue: BooksListViewModel(
            getUserBooksUseCase: GetUserBooksUseCase(bookRepository: repository),
            updateBookUseCase: UpdateBookUseCase(bookRepository: repository),
            deleteBookUseCase: DeleteBookUseCase(bookRepository: repository),
            currentUserId: "preview-user"
        ))
    }

    var body: some View {
        NavigationStack {
            BooksListView(viewModel: viewModel)
        }
    }
}

// MARK: - Preview Repository

/// Temporary repository for preview/development
@MainActor
class PreviewBookRepository: BookRepositoryProtocol {
    var books: [Book]

    init() {
        // Initialize with sample books
        self.books = PreviewBookRepository.createSampleBooks()
    }

    func create(_ book: Book) async throws -> Book {
        books.append(book)
        return book
    }

    func findByUserId(_ userId: String) async throws -> [Book] {
        return books.filter { $0.userId == userId }
    }

    func findById(_ id: String) async throws -> Book? {
        return books.first { $0.id == id }
    }

    func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book] {
        return books.filter { $0.userId == userId && $0.status == status }
    }

    func update(_ id: String, updates: BookUpdate) async throws -> Book? {
        guard let index = books.firstIndex(where: { $0.id == id }) else {
            return nil
        }

        let oldBook = books[index]

        // Create new book with updates applied
        let updatedBook = Book(
            id: oldBook.id,
            userId: oldBook.userId,
            googleBooksId: oldBook.googleBooksId,
            title: oldBook.title,
            authors: oldBook.authors,
            thumbnail: oldBook.thumbnail,
            description: oldBook.description,
            pageCount: oldBook.pageCount,
            status: updates.status ?? oldBook.status,
            currentPage: updates.currentPage ?? oldBook.currentPage,
            rating: updates.rating ?? oldBook.rating,
            addedAt: oldBook.addedAt,
            finishedAt: updates.finishedAt ?? oldBook.finishedAt
        )

        books[index] = updatedBook
        return updatedBook
    }

    func delete(_ id: String) async throws -> Bool {
        guard let index = books.firstIndex(where: { $0.id == id }) else {
            return false
        }
        books.remove(at: index)
        return true
    }

    static func createSampleBooks() -> [Book] {
        [
            Book(
                id: "1",
                userId: "preview-user",
                googleBooksId: "abc123",
                title: "The Pragmatic Programmer",
                authors: ["Andrew Hunt", "David Thomas"],
                thumbnail: "https://books.google.com/books/content?id=5wBQEp6ruIAC&printsec=frontcover&img=1&zoom=1",
                description: "Your Journey To Mastery",
                pageCount: 352,
                status: .reading,
                currentPage: 150,
                rating: nil,
                addedAt: Date(),
                finishedAt: nil
            ),
            Book(
                id: "2",
                userId: "preview-user",
                googleBooksId: "def456",
                title: "Clean Code",
                authors: ["Robert C. Martin"],
                thumbnail: "https://books.google.com/books/content?id=hjEFCAAAQBAJ&printsec=frontcover&img=1&zoom=1",
                description: "A Handbook of Agile Software Craftsmanship",
                pageCount: 464,
                status: .read,
                currentPage: 464,
                rating: 5,
                addedAt: Date().addingTimeInterval(-86400 * 7),
                finishedAt: Date().addingTimeInterval(-86400 * 2)
            ),
            Book(
                id: "3",
                userId: "preview-user",
                googleBooksId: "ghi789",
                title: "Design Patterns",
                authors: ["Erich Gamma", "Richard Helm", "Ralph Johnson", "John Vlissides"],
                thumbnail: nil,
                description: "Elements of Reusable Object-Oriented Software",
                pageCount: 416,
                status: .wantToRead,
                currentPage: nil,
                rating: nil,
                addedAt: Date().addingTimeInterval(-86400 * 14),
                finishedAt: nil
            )
        ]
    }
}

// MARK: - Books List View

struct BooksListView: View {
    @ObservedObject var viewModel: BooksListViewModel
    @State private var showingAddBook = false

    var body: some View {
        ZStack {
            if viewModel.isLoading && !viewModel.hasBooks {
                ProgressView("Loading books...")
            } else if !viewModel.hasBooks {
                EmptyBooksView(onAddBook: { showingAddBook = true })
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        SearchBar(text: $viewModel.searchText)
                            .padding(.horizontal)

                        FilterChipsView(
                            selectedFilter: $viewModel.selectedFilter,
                            counts: viewModel.bookCounts
                        )
                        .padding(.horizontal)

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
                                        }
                                    )
                                    .contextMenu {
                                        Button(role: .destructive) {
                                            Task {
                                                await viewModel.deleteBook(book)
                                            }
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        } else {
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
                Button(action: { showingAddBook = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddBook) {
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

// MARK: - Books List ViewModel

@MainActor
class BooksListViewModel: ObservableObject {
    @Published var books: [Book] = []
    @Published var filteredBooks: [Book] = []
    @Published var selectedFilter: BookStatusFilter = .all
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchText = ""

    private let getUserBooksUseCase: GetUserBooksUseCase
    private let updateBookUseCase: UpdateBookUseCase
    private let deleteBookUseCase: DeleteBookUseCase
    private let currentUserId: String

    private var cancellables = Set<AnyCancellable>()

    init(
        getUserBooksUseCase: GetUserBooksUseCase,
        updateBookUseCase: UpdateBookUseCase,
        deleteBookUseCase: DeleteBookUseCase,
        currentUserId: String
    ) {
        self.getUserBooksUseCase = getUserBooksUseCase
        self.updateBookUseCase = updateBookUseCase
        self.deleteBookUseCase = deleteBookUseCase
        self.currentUserId = currentUserId

        setupFilterObserver()
        setupSearchObserver()
    }

    func loadBooks() async {
        isLoading = true
        errorMessage = nil

        do {
            let input = GetUserBooksInput(userId: currentUserId)
            let fetchedBooks = try await getUserBooksUseCase.execute(input)
            books = fetchedBooks
            applyFilters()
        } catch {
            errorMessage = "Failed to load books: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func updateBook(_ book: Book, updates: BookUpdate) async {
        do {
            let input = UpdateBookInput(
                bookId: book.id,
                userId: currentUserId,
                updates: updates
            )

            let updatedBook = try await updateBookUseCase.execute(input)

            if let index = books.firstIndex(where: { $0.id == book.id }) {
                books[index] = updatedBook
                applyFilters()
            }
        } catch {
            errorMessage = "Failed to update book: \(error.localizedDescription)"
        }
    }

    func deleteBook(_ book: Book) async {
        do {
            let input = DeleteBookInput(
                bookId: book.id,
                userId: currentUserId
            )

            try await deleteBookUseCase.execute(input)

            books.removeAll { $0.id == book.id }
            applyFilters()
        } catch {
            errorMessage = "Failed to delete book: \(error.localizedDescription)"
        }
    }

    func refresh() async {
        await loadBooks()
    }

    private func setupFilterObserver() {
        $selectedFilter
            .sink { [weak self] _ in
                self?.applyFilters()
            }
            .store(in: &cancellables)
    }

    private func setupSearchObserver() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.applyFilters()
            }
            .store(in: &cancellables)
    }

    private func applyFilters() {
        var result = books

        switch selectedFilter {
        case .all:
            break
        case .status(let status):
            result = result.filter { $0.status == status }
        }

        if !searchText.isEmpty {
            result = result.filter { book in
                book.title.localizedCaseInsensitiveContains(searchText) ||
                book.authors.contains(where: { $0.localizedCaseInsensitiveContains(searchText) })
            }
        }

        result.sort { $0.addedAt > $1.addedAt }

        filteredBooks = result
    }

    var bookCounts: [BookStatusFilter: Int] {
        [
            .all: books.count,
            .status(.wantToRead): books.filter { $0.status == .wantToRead }.count,
            .status(.reading): books.filter { $0.status == .reading }.count,
            .status(.read): books.filter { $0.status == .read }.count
        ]
    }

    var hasBooks: Bool {
        !books.isEmpty
    }

    var hasFilteredBooks: Bool {
        !filteredBooks.isEmpty
    }
}

enum BookStatusFilter: Hashable, Identifiable {
    case all
    case status(BookStatus)

    var id: String {
        switch self {
        case .all:
            return "all"
        case .status(let status):
            return status.rawValue
        }
    }

    var displayName: String {
        switch self {
        case .all:
            return "All"
        case .status(let status):
            return status.displayName
        }
    }

    static var allCases: [BookStatusFilter] {
        [.all] + BookStatus.allCases.map { .status($0) }
    }
}

// MARK: - Book Card

struct BookCard: View {
    let book: Book
    let onUpdate: (Book, BookUpdate) -> Void

    @State private var showingPageUpdate = false
    @State private var currentPageInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Book thumbnail
            if let thumbnail = book.thumbnail, let url = URL(string: thumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(3/4, contentMode: .fill)
                } placeholder: {
                    PlaceholderBookCover()
                }
                .frame(maxWidth: .infinity)
                .aspectRatio(3/4, contentMode: .fit)
                .clipped()
                .cornerRadius(8)
            } else {
                PlaceholderBookCover()
                    .frame(maxWidth: .infinity)
                    .aspectRatio(3/4, contentMode: .fit)
                    .cornerRadius(8)
            }

            // Book info section
            VStack(alignment: .leading, spacing: 8) {
                // Title
                Text(book.title)
                    .font(.headline)
                    .lineLimit(2)
                    .frame(minHeight: 40, alignment: .top)

                // Author
                Text(book.authors.joined(separator: ", "))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .truncationMode(.tail)
                    .frame(minHeight: 36, alignment: .top)

                // Status picker
                Menu {
                    Button("Want to Read") {
                        updateStatus(.wantToRead)
                    }
                    Button("Reading") {
                        updateStatus(.reading)
                    }
                    Button("Read") {
                        updateStatus(.read)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(book.status.displayName)
                            .font(.callout)
                            .fontWeight(.medium)
                        Image(systemName: "chevron.down")
                            .font(.caption2)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(statusColor.opacity(0.12))
                    .foregroundColor(statusColor)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)

                // Variable content area (fixed height for consistent card sizes)
                VStack(alignment: .leading, spacing: 6) {
                    // Reading progress (for books being read)
                    if book.status == .reading, let pageCount = book.pageCount {
                        HStack {
                            Text("\(book.currentPage ?? 0) / \(pageCount) (\(Int(readingProgress * 100))%)")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Spacer()

                            Button("Update") {
                                currentPageInput = String(book.currentPage ?? 0)
                                showingPageUpdate = true
                            }
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.accentColor)
                        }

                        ProgressView(value: readingProgress, total: 1.0)
                            .tint(.accentColor)
                    }
                    // Rating (for completed books)
                    else if book.status == .read {
                        HStack(spacing: 6) {
                            ForEach(1...5, id: \.self) { star in
                                Button(action: { updateRating(star) }) {
                                    Image(systemName: star <= (book.rating ?? 0) ? "star.fill" : "star")
                                        .foregroundColor(star <= (book.rating ?? 0) ? .yellow : .gray.opacity(0.4))
                                        .font(.footnote)
                                }
                                .buttonStyle(.plain)
                            }
                            Spacer()
                        }
                    }
                }
                .frame(minHeight: 44, alignment: .top)
            }
            .padding(16)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.12), radius: 12, x: 0, y: 4)
        .alert("Update Page", isPresented: $showingPageUpdate) {
            TextField("Current Page", text: $currentPageInput)
                .keyboardType(.numberPad)
            Button("Cancel", role: .cancel) {}
            Button("Update") {
                updateCurrentPage()
            }
        } message: {
            if let pageCount = book.pageCount {
                Text("Enter your current page (out of \(pageCount))")
            }
        }
    }

    private var readingProgress: Double {
        guard let pageCount = book.pageCount, pageCount > 0,
              let currentPage = book.currentPage else {
            return 0.0
        }
        return Double(currentPage) / Double(pageCount)
    }

    private var statusColor: Color {
        switch book.status {
        case .wantToRead:
            return Color.orange
        case .reading:
            return Color.blue
        case .read:
            return Color.green
        }
    }

    private func updateStatus(_ status: BookStatus) {
        // Auto-set finishedAt when marking as read
        let updates: BookUpdate
        if status == .read && book.status != .read {
            updates = BookUpdate(status: status, finishedAt: Date())
        } else {
            updates = BookUpdate(status: status)
        }

        onUpdate(book, updates)
    }

    private func updateRating(_ rating: Int) {
        let updates = BookUpdate(rating: rating)
        onUpdate(book, updates)
    }

    private func updateCurrentPage() {
        guard let page = Int(currentPageInput),
              page >= 0,
              let pageCount = book.pageCount,
              page <= pageCount else {
            return
        }

        // Auto-complete if reached last page
        let updates: BookUpdate
        if page == pageCount && book.status != .read {
            updates = BookUpdate(
                status: .read,
                currentPage: page,
                finishedAt: Date()
            )
        } else {
            updates = BookUpdate(currentPage: page)
        }

        onUpdate(book, updates)
    }
}

struct PlaceholderBookCover: View {
    var body: some View {
        ZStack {
            Color.gray.opacity(0.2)
            Image(systemName: "book.fill")
                .font(.largeTitle)
                .foregroundColor(.gray.opacity(0.5))
        }
    }
}

// MARK: - Supporting Views

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Search books...", text: $text)
                .textFieldStyle(.plain)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

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

#Preview {
    ContentView()
}
