import Application
import Combine
import CoreDomain
import Foundation

@MainActor
class SearchBooksViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var searchQuery = ""
    @Published var searchResults: [BookSearchResult] = []
    @Published var isSearching = false
    @Published var errorMessage: String?
    @Published var hasSearched = false

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

    // MARK: - Public Methods

    func searchBooks() async {
        let query = searchQuery.trimmingCharacters(in: .whitespaces)

        guard !query.isEmpty else {
            searchResults = []
            hasSearched = false
            return
        }

        isSearching = true
        errorMessage = nil

        do {
            let input = SearchBooksInput(query: query)
            let results = try await searchBooksUseCase.execute(input)
            searchResults = results
            hasSearched = true
        } catch {
            errorMessage = "Search failed: \(error.localizedDescription)"
            searchResults = []
            hasSearched = true
        }

        isSearching = false
    }

    func addBook(_ searchResult: BookSearchResult, status: BookStatus) async throws {
        let input = AddBookInput(
            userId: currentUserId,
            googleBooksId: searchResult.id,
            title: searchResult.volumeInfo.title,
            authors: searchResult.volumeInfo.authors ?? ["Unknown"],
            thumbnail: searchResult.volumeInfo.imageLinks?.thumbnail,
            description: searchResult.volumeInfo.description,
            pageCount: searchResult.volumeInfo.pageCount,
            status: status
        )

        _ = try await addBookUseCase.execute(input)
    }

    func clearSearch() {
        searchQuery = ""
        searchResults = []
        hasSearched = false
        errorMessage = nil
    }

    // MARK: - Private Methods

    private func setupSearchDebounce() {
        $searchQuery
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                Task {
                    await self?.searchBooks()
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Computed Properties

    var hasResults: Bool {
        !searchResults.isEmpty
    }

    var showEmptyState: Bool {
        hasSearched && !hasResults && !isSearching
    }
}
