import Application
import Combine
import CoreDomain
import Foundation

@MainActor
class BooksListViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var books: [Book] = []
    @Published var filteredBooks: [Book] = []
    @Published var selectedFilter: BookStatusFilter = .all
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var searchText = ""
    @Published var hasMorePages = true

    // MARK: - Dependencies

    private let getUserBooksUseCase: GetUserBooksUseCase
    private let updateBookUseCase: UpdateBookUseCase
    private let deleteBookUseCase: DeleteBookUseCase
    private let currentUserId: String // NOTE: Will be retrieved from auth service when implemented

    // MARK: - Pagination

    private let pageSize = 20
    private var currentOffset = 0

    // MARK: - Cancellables

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

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

    /// Convenience initializer that creates use cases from a repository
    convenience init(bookRepository: BookRepositoryProtocol, currentUserId: String = "temp-user-id") {
        let getUserBooksUseCase = GetUserBooksUseCase(bookRepository: bookRepository)
        let updateBookUseCase = UpdateBookUseCase(bookRepository: bookRepository)
        let deleteBookUseCase = DeleteBookUseCase(bookRepository: bookRepository)

        self.init(
            getUserBooksUseCase: getUserBooksUseCase,
            updateBookUseCase: updateBookUseCase,
            deleteBookUseCase: deleteBookUseCase,
            currentUserId: currentUserId
        )
    }

    // MARK: - Public Methods

    func loadBooks() async {
        isLoading = true
        errorMessage = nil
        currentOffset = 0
        hasMorePages = true

        do {
            let input = GetUserBooksInput(userId: currentUserId, offset: 0, limit: pageSize)
            let fetchedBooks = try await getUserBooksUseCase.execute(input)
            books = fetchedBooks
            currentOffset = fetchedBooks.count
            hasMorePages = fetchedBooks.count == pageSize
            applyFilters()
        } catch {
            errorMessage = "Failed to load books: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func loadMoreBooks() async {
        guard !isLoadingMore, hasMorePages else { return }

        isLoadingMore = true

        do {
            let input = GetUserBooksInput(userId: currentUserId, offset: currentOffset, limit: pageSize)
            let fetchedBooks = try await getUserBooksUseCase.execute(input)

            if fetchedBooks.isEmpty {
                hasMorePages = false
            } else {
                books.append(contentsOf: fetchedBooks)
                currentOffset += fetchedBooks.count
                hasMorePages = fetchedBooks.count == pageSize
                applyFilters()
            }
        } catch {
            errorMessage = "Failed to load more books: \(error.localizedDescription)"
        }

        isLoadingMore = false
    }

    /// Called when user scrolls near the end of the list
    func loadMoreIfNeeded(currentItem: Book?) {
        guard let currentItem else { return }

        // Load more when we're within the last 5 items
        let thresholdIndex = books.index(books.endIndex, offsetBy: -5, limitedBy: books.startIndex) ?? books.startIndex
        if let currentIndex = books.firstIndex(where: { $0.id == currentItem.id }),
           currentIndex >= thresholdIndex {
            Task {
                await loadMoreBooks()
            }
        }
    }

    func updateBook(_ book: Book, updates: BookUpdate) async {
        do {
            let input = UpdateBookInput(
                bookId: book.id,
                userId: currentUserId,
                updates: updates
            )

            let updatedBook = try await updateBookUseCase.execute(input)

            // Update local state optimistically
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

            // Remove from local state
            books.removeAll { $0.id == book.id }
            applyFilters()
        } catch {
            errorMessage = "Failed to delete book: \(error.localizedDescription)"
        }
    }

    func refresh() async {
        await loadBooks()
    }

    // MARK: - Private Methods

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

        // Apply status filter
        switch selectedFilter {
        case .all:
            break
        case .status(let status):
            result = result.filter { $0.status == status }
        }

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter { book in
                book.title.localizedCaseInsensitiveContains(searchText) ||
                    book.authors.contains(where: { $0.localizedCaseInsensitiveContains(searchText) })
            }
        }

        // Sort by added date (newest first)
        result.sort { $0.addedAt > $1.addedAt }

        filteredBooks = result
    }

    // MARK: - Computed Properties

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

// MARK: - Book Status Filter

enum BookStatusFilter: Hashable, Identifiable {
    case all
    case status(BookStatus)

    var id: String {
        switch self {
        case .all:
            "all"
        case .status(let status):
            status.rawValue
        }
    }

    var displayName: String {
        switch self {
        case .all:
            "All"
        case .status(let status):
            status.displayName
        }
    }

    static var allCases: [BookStatusFilter] {
        [.all] + BookStatus.allCases.map { .status($0) }
    }
}
