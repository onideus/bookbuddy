import Application
import Combine
import CoreDomain
import Foundation

@MainActor
final class SearchViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var searchQuery = ""
    @Published var searchResults: [BookSearchResult] = []
    @Published var isSearching = false
    @Published var errorMessage: String?
    @Published var selectedBook: BookSearchResult?
    @Published var booksInLibrary: Set<String> = [] // Set of googleBooksIds

    // MARK: - Dependencies

    private let searchBooksUseCase: SearchBooksUseCase
    private let addBookUseCase: AddBookUseCase
    private let bookRepository: BookRepositoryProtocol
    private let currentUserId: String

    // MARK: - Cancellables

    private var cancellables = Set<AnyCancellable>()
    private var searchTask: Task<Void, Never>?

    // MARK: - Initialization

    init(
        searchBooksUseCase: SearchBooksUseCase,
        addBookUseCase: AddBookUseCase,
        bookRepository: BookRepositoryProtocol,
        currentUserId: String
    ) {
        self.searchBooksUseCase = searchBooksUseCase
        self.addBookUseCase = addBookUseCase
        self.bookRepository = bookRepository
        self.currentUserId = currentUserId

        setupSearchDebounce()
    }

    /// Convenience initializer
    convenience init(
        searchService: ExternalBookSearchProtocol,
        bookRepository: BookRepositoryProtocol,
        currentUserId: String = "temp-user-id"
    ) {
        let searchBooksUseCase = SearchBooksUseCase(externalBookSearch: searchService)
        let addBookUseCase = AddBookUseCase(bookRepository: bookRepository)

        self.init(
            searchBooksUseCase: searchBooksUseCase,
            addBookUseCase: addBookUseCase,
            bookRepository: bookRepository,
            currentUserId: currentUserId
        )
    }

    // MARK: - Public Methods

    func search() async {
        // Cancel any existing search task
        searchTask?.cancel()

        let query = searchQuery.trimmingCharacters(in: .whitespaces)

        guard !query.isEmpty else {
            searchResults = []
            isSearching = false
            errorMessage = nil
            return
        }

        // Create new search task
        searchTask = Task { @MainActor in
            isSearching = true
            errorMessage = nil

            do {
                // Check for cancellation before making request
                try Task.checkCancellation()

                // Fetch search results and user's library concurrently
                let input = SearchBooksInput(query: query)
                async let resultsTask = searchBooksUseCase.execute(input)
                async let libraryTask = fetchUserLibraryIds()

                let (results, libraryIds) = try await (resultsTask, libraryTask)

                // Check for cancellation before updating UI
                try Task.checkCancellation()

                searchResults = results
                booksInLibrary = libraryIds
                isSearching = false
            } catch is CancellationError {
                // Task was cancelled, don't update UI or show error
                // Just clean up the loading state
                isSearching = false
            } catch {
                // Only show error if task wasn't cancelled
                if !Task.isCancelled {
                    errorMessage = "Search failed: \(error.localizedDescription)"
                    searchResults = []
                }
                isSearching = false
            }
        }

        await searchTask?.value
    }

    /// Check if a book is already in the user's library
    func isInLibrary(_ googleBooksId: String) -> Bool {
        booksInLibrary.contains(googleBooksId)
    }

    /// Fetch all googleBooksIds from user's library
    private func fetchUserLibraryIds() async throws -> Set<String> {
        let books = try await bookRepository.findByUserId(currentUserId)
        return Set(books.compactMap(\.googleBooksId))
    }

    func addBookToLibrary(_ searchResult: BookSearchResult, status: BookStatus) async -> Bool {
        errorMessage = nil

        do {
            let input = AddBookInput(
                userId: currentUserId,
                googleBooksId: searchResult.id,
                title: searchResult.volumeInfo.title,
                authors: searchResult.volumeInfo.authors ?? [],
                thumbnail: searchResult.volumeInfo.imageLinks?.thumbnail,
                description: searchResult.volumeInfo.description,
                pageCount: searchResult.volumeInfo.pageCount,
                status: status
            )

            _ = try await addBookUseCase.execute(input)
            // Mark this book as now in library
            booksInLibrary.insert(searchResult.id)
            return true
        } catch {
            errorMessage = "Failed to add book: \(error.localizedDescription)"
            return false
        }
    }

    func clearSearch() {
        searchTask?.cancel()
        searchQuery = ""
        searchResults = []
        errorMessage = nil
        isSearching = false
    }

    // MARK: - Private Methods

    private func setupSearchDebounce() {
        $searchQuery
            .debounce(for: .milliseconds(800), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] _ in
                Task {
                    await self?.search()
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Computed Properties

    var hasResults: Bool {
        !searchResults.isEmpty
    }
}
