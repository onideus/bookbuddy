import CoreDomain
import Foundation

/// Implementation of ExternalBookSearchProtocol using the API's Google Books proxy
public final class ExternalBookSearchService: ExternalBookSearchProtocol {
    private let networkClient: NetworkClientProtocol

    public init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - ExternalBookSearchProtocol

    public func search(_ query: String) async throws -> [BookSearchResult] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            return []
        }

        let endpoint = APIEndpoint.searchBooks(query: query)
        let response: SearchBooksResponse = try await networkClient.request(endpoint)

        return response.books.map { $0.toDomain() }
    }

    public func getById(_: String) async throws -> BookSearchResult? {
        // The API doesn't have a specific endpoint for getting a book by ID
        // We could search by ID, but that's not implemented in the current API
        // This would typically require a specific Google Books API call
        throw DomainError.general("Get book by ID not supported in current API")
    }
}
