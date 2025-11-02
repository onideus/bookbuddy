import CoreDomain
import Foundation

/// Input for searching books
public struct SearchBooksInput {
    public let query: String

    public init(query: String) {
        self.query = query
    }
}

/// Use case for searching external book database
public final class SearchBooksUseCase: UseCase {
    public typealias Input = SearchBooksInput
    public typealias Output = [BookSearchResult]

    private let externalBookSearch: ExternalBookSearchProtocol

    public init(externalBookSearch: ExternalBookSearchProtocol) {
        self.externalBookSearch = externalBookSearch
    }

    public func execute(_ input: Input) async throws -> [BookSearchResult] {
        // Return empty array if query is empty
        guard !input.query.trimmingCharacters(in: .whitespaces).isEmpty else {
            return []
        }

        // Search external API
        return try await externalBookSearch.search(input.query)
    }
}
