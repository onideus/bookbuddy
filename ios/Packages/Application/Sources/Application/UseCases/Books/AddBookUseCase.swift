import CoreDomain
import Foundation

/// Input for adding a book
public struct AddBookInput {
    public let userId: String
    public let googleBooksId: String
    public let title: String
    public let authors: [String]
    public let thumbnail: String?
    public let description: String?
    public let pageCount: Int?
    public let status: BookStatus

    public init(
        userId: String,
        googleBooksId: String,
        title: String,
        authors: [String],
        thumbnail: String? = nil,
        description: String? = nil,
        pageCount: Int? = nil,
        status: BookStatus
    ) {
        self.userId = userId
        self.googleBooksId = googleBooksId
        self.title = title
        self.authors = authors
        self.thumbnail = thumbnail
        self.description = description
        self.pageCount = pageCount
        self.status = status
    }
}

/// Use case for adding a book to user's library
public final class AddBookUseCase: UseCase {
    public typealias Input = AddBookInput
    public typealias Output = Book

    private let bookRepository: BookRepositoryProtocol

    public init(bookRepository: BookRepositoryProtocol) {
        self.bookRepository = bookRepository
    }

    public func execute(_ input: Input) async throws -> Book {
        // Check for duplicate books
        let existingBooks = try await bookRepository.findByUserId(input.userId)
        let hasDuplicate = existingBooks.contains { $0.googleBooksId == input.googleBooksId }

        if hasDuplicate {
            throw DomainError.duplicate("You already have this book in your library")
        }

        // Create the book entity
        let book = try Book.create(
            userId: input.userId,
            googleBooksId: input.googleBooksId,
            title: input.title,
            authors: input.authors,
            thumbnail: input.thumbnail,
            description: input.description,
            pageCount: input.pageCount,
            status: input.status
        )

        // Save to repository
        return try await bookRepository.create(book)
    }
}
