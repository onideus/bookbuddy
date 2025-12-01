import CoreDomain
import Foundation

/// Input for updating a book
public struct UpdateBookInput: Sendable, Equatable {
    public let bookId: String
    public let userId: String
    public let updates: BookUpdate

    public init(
        bookId: String,
        userId: String,
        updates: BookUpdate
    ) {
        self.bookId = bookId
        self.userId = userId
        self.updates = updates
    }
}

/// Use case for updating an existing book in the user's library
///
/// This use case handles the business logic for modifying book properties
/// with proper authorization and ownership validation.
///
/// **Business Rules:**
/// - Only the book's owner can update the book (verified by userId)
/// - Book must exist before it can be updated
/// - Updates are applied through the repository's update mechanism
/// - All changes are validated at the repository level
/// - Supports partial updates through the BookUpdate structure
///
/// **Authorization:**
/// - Validates that the requesting user owns the book being updated
/// - Throws unauthorized error if user doesn't own the book
/// - Ensures data isolation between different users
///
/// **Data Integrity:**
/// - Verifies book existence before attempting updates
/// - Uses repository's atomic update operations
/// - Maintains referential integrity through proper error handling
///
/// - Parameter input: `UpdateBookInput` containing book ID, user ID, and update data
/// - Returns: The updated `Book` entity with modified properties
/// - Throws: `DomainError.entityNotFound` if book doesn't exist, `DomainError.unauthorized` if user doesn't own book
public final class UpdateBookUseCase: UseCase {
    public typealias Input = UpdateBookInput
    public typealias Output = Book

    private let bookRepository: BookRepositoryProtocol

    public init(bookRepository: BookRepositoryProtocol) {
        self.bookRepository = bookRepository
    }

    public func execute(_ input: Input) async throws -> Book {
        // Verify book exists
        guard let book = try await bookRepository.findById(input.bookId) else {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }

        // Verify user owns the book
        guard book.userId == input.userId else {
            throw DomainError.ownershipMismatch
        }

        // Update the book
        guard let updatedBook = try await bookRepository.update(input.bookId, updates: input.updates) else {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }

        return updatedBook
    }
}
