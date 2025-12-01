import CoreDomain
import Foundation

/// Input for deleting a book
public struct DeleteBookInput: Sendable, Equatable {
    public let bookId: String
    public let userId: String

    public init(bookId: String, userId: String) {
        self.bookId = bookId
        self.userId = userId
    }
}

/// Use case for permanently removing a book from the user's library
///
/// This use case handles the business logic for deleting book entries
/// with proper authorization and data integrity checks.
///
/// **Business Rules:**
/// - Only the book's owner can delete the book (verified by userId)
/// - Book must exist before it can be deleted
/// - Deletion is permanent and cannot be undone
/// - Operation is atomic - either succeeds completely or fails with error
/// - No cascading deletions - related data should be handled separately
///
/// **Authorization:**
/// - Validates that the requesting user owns the book being deleted
/// - Throws unauthorized error if user doesn't own the book
/// - Ensures users cannot delete books belonging to other users
///
/// **Data Safety:**
/// - Verifies book existence before attempting deletion
/// - Uses repository's atomic delete operations
/// - Returns success confirmation to prevent silent failures
/// - Maintains data consistency through proper error handling
///
/// - Parameter input: `DeleteBookInput` containing book ID and user ID for authorization
/// - Returns: Void upon successful deletion
/// - Throws: `DomainError.entityNotFound` if book doesn't exist, `DomainError.unauthorized` if user doesn't own book
public final class DeleteBookUseCase: VoidOutputUseCase {
    public typealias Input = DeleteBookInput

    private let bookRepository: BookRepositoryProtocol

    public init(bookRepository: BookRepositoryProtocol) {
        self.bookRepository = bookRepository
    }

    public func execute(_ input: Input) async throws {
        // Verify book exists
        guard let book = try await bookRepository.findById(input.bookId) else {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }

        // Verify user owns the book
        guard book.userId == input.userId else {
            throw DomainError.ownershipMismatch
        }

        // Delete the book
        let deleted = try await bookRepository.delete(input.bookId)

        if !deleted {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }
    }
}
