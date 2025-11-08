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

    // MARK: - Dependencies

    private let searchBooksUseCase: SearchBooksUseCase
    private let addBookUseCase: AddBookUseCase
    private let currentUserId: String

    // MARK: - Cancellables

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init(
        searchBooksUseCase: SearchBooksUseCase,
        addBookUseCase: AddBookUseCase,
        currentUserId: String
    ) {
        self.searchBooksUseCase = searchBooksUseCase
        self.addBookUseCase = addBookUseCase
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
            currentUserId: currentUserId
        )
    }

    // MARK: - Public Methods

    func search() async {
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else {
            searchResults = []
            return
        }

        isSearching = true
        errorMessage = nil

        do {
            let input = SearchBooksInput(query: searchQuery)
            let results = try await searchBooksUseCase.execute(input)
            searchResults = results
        } catch {
            errorMessage = "Search failed: \(error.localizedDescription)"
            searchResults = []
        }

        isSearching = false
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
            return true
        } catch {
            errorMessage = "Failed to add book: \(error.localizedDescription)"
            return false
        }
    }

    func clearSearch() {
        searchQuery = ""
        searchResults = []
        errorMessage = nil
    }

    // MARK: - Private Methods

    private func setupSearchDebounce() {
        $searchQuery
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
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
