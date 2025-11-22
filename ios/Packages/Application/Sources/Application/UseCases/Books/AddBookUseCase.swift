import CoreDomain
import Foundation

/// Input for adding a book
public struct AddBookInput: Sendable, Equatable {
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

/// Use case for adding a book to user's personal library
///
/// This use case handles the business logic for creating a new book entry
/// in the user's collection with comprehensive duplicate detection.
///
/// **Business Rules:**
/// - Prevents duplicate books based on Google Books ID within the same user's library
/// - Automatically assigns a unique identifier and creation timestamp
/// - Validates that all required fields (userId, googleBooksId, title, authors) are provided
/// - Sets the initial reading status as specified in the input
/// - Ensures data integrity through domain entity validation
///
/// **Validation:**
/// - Book creation validates through `Book.create()` factory method
/// - Duplicate detection queries existing user books by Google Books ID
/// - All validation errors are propagated as domain errors
///
/// - Parameter input: `AddBookInput` containing all book information and user context
/// - Returns: The newly created `Book` entity with assigned ID and metadata
/// - Throws: `DomainError.duplicate` if book already exists, or validation errors from Book.create()
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
