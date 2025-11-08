import CoreDomain
import Foundation

/// Implementation of BookRepositoryProtocol using REST API
public final class BookRepository: BookRepositoryProtocol {
    private let networkClient: NetworkClientProtocol

    public init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - BookRepositoryProtocol

    public func findById(_ id: String) async throws -> Book? {
        // API doesn't have a single book endpoint, so get all and filter
        let books = try await findAll()
        return books.first { $0.id == id }
    }

    public func findByUserId(_ userId: String) async throws -> [Book] {
        return try await findAll()
    }

    public func findAll() async throws -> [Book] {
        let endpoint = APIEndpoint.getBooks()
        let response: GetBooksResponse = try await networkClient.request(endpoint)

        return try response.books.map { try $0.toDomain() }
    }

    public func save(_ book: Book) async throws -> Book {
        // Determine if this is a new book or an update
        // Since the domain Book doesn't have a clear "new" indicator,
        // we'll attempt to find it first
        if let existing = try? await findById(book.id) {
            // Update existing book
            let request = UpdateBookRequest(
                status: book.status,
                currentPage: book.currentPage
            )
            let endpoint = try APIEndpoint.updateBook(id: book.id, request)
            let response: UpdateBookResponse = try await networkClient.request(endpoint)
            return try response.book.toDomain()
        } else {
            // Create new book
            let request = AddBookRequest(
                googleBooksId: book.googleBooksId,
                title: book.title,
                authors: book.authors,
                thumbnail: book.thumbnail,
                description: book.description,
                pageCount: book.pageCount,
                status: book.status
            )
            let endpoint = try APIEndpoint.addBook(request)
            let response: AddBookResponse = try await networkClient.request(endpoint)
            return try response.book.toDomain()
        }
    }

    public func update(_ book: Book) async throws -> Book {
        let request = UpdateBookRequest(
            status: book.status,
            currentPage: book.currentPage
        )
        let endpoint = try APIEndpoint.updateBook(id: book.id, request)
        let response: UpdateBookResponse = try await networkClient.request(endpoint)
        return try response.book.toDomain()
    }

    public func delete(_ id: String) async throws {
        let endpoint = APIEndpoint.deleteBook(id: id)
        try await networkClient.request(endpoint)
    }

    public func findByStatus(_ status: BookStatus, userId: String) async throws -> [Book] {
        let allBooks = try await findByUserId(userId)
        return allBooks.filter { $0.status == status }
    }
}
