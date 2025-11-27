import CoreDomain
import Foundation

/// Input for searching books
public struct SearchBooksInput: Sendable, Equatable {
    public let query: String

    public init(query: String) {
        self.query = query
    }
}

/// Use case for searching books in external book catalogs and databases
///
/// This use case provides access to external book search services to help users
/// discover and find books to add to their personal library.
///
/// **Business Rules:**
/// - Searches external catalogs, not the user's personal collection
/// - Query can include book titles, author names, ISBN numbers, or general keywords
/// - Returns books that are available for adding to the user's collection
/// - Empty or whitespace-only queries return empty results
/// - Results are provided by external services and may vary in completeness
/// - No user authentication required for search operations
///
/// **Data Sources:**
/// - Integrates with external book search APIs (e.g., Google Books)
/// - Returns standardized BookSearchResult entities
/// - Results include book metadata, covers, and identifiers
/// - Search quality depends on external service capabilities
///
/// **Performance:**
/// - Single external API call per search
/// - Results are not cached (delegated to infrastructure layer)
/// - Query validation prevents unnecessary API calls
/// - Timeout and error handling managed by external search service
///
/// - Parameter input: `SearchBooksInput` containing the search query string
/// - Returns: Array of `BookSearchResult` entities matching the search criteria from external sources
/// - Throws: External service errors or network-related issues
public final class SearchBooksUseCase: UseCase {
    public typealias Input = SearchBooksInput
    public typealias Output = [BookSearchResult]

    private let externalBookSearch: ExternalBookSearchProtocol

    public init(externalBookSearch: ExternalBookSearchProtocol) {
        self.externalBookSearch = externalBookSearch
    }

    public func execute(_ input: Input) async throws -> [BookSearchResult] {
        // Return empty array if query is empty or whitespace-only
        guard !input.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return []
        }

        // Search external API
        return try await externalBookSearch.search(input.query)
    }
}
