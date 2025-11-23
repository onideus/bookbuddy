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
        let books = try await findByUserId("")
        return books.first { $0.id == id }
    }

    public func findByUserId(_ userId: String) async throws -> [Book] {
        let endpoint = APIEndpoint.getBooks()
        let response: GetBooksResponse = try await networkClient.request(endpoint)
        return try response.books.map { try $0.toDomain() }
    }
    
    public func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Book] {
        // For now, get all books and apply pagination in memory
        // TODO: Update API to support pagination query parameters
        let allBooks = try await findByUserId(userId)
        let startIndex = min(offset, allBooks.count)
        let endIndex = limit.map { min(startIndex + $0, allBooks.count) } ?? allBooks.count
        return Array(allBooks[startIndex..<endIndex])
    }

    public func create(_ book: Book) async throws -> Book {
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

    public func update(_ id: String, updates: BookUpdate) async throws -> Book? {
        let request = UpdateBookRequest(
            status: updates.status,
            currentPage: updates.currentPage,
            rating: updates.rating,
            finishedAt: updates.finishedAt
        )
        let endpoint = try APIEndpoint.updateBook(id: id, request)
        let response: UpdateBookResponse = try await networkClient.request(endpoint)
        return try response.book.toDomain()
    }

    public func delete(_ id: String) async throws -> Bool {
        let endpoint = APIEndpoint.deleteBook(id: id)
        let _: DeleteBookResponse = try await networkClient.request(endpoint)
        return true
    }

    public func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book] {
        let allBooks = try await findByUserId(userId)
        return allBooks.filter { $0.status == status }
    }
    
    public func exists(userId: String, googleBooksId: String) async throws -> Bool {
        let userBooks = try await findByUserId(userId)
        return userBooks.contains { $0.googleBooksId == googleBooksId }
    }
}
