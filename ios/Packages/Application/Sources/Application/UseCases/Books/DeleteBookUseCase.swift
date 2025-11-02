import CoreDomain
import Foundation

/// Input for deleting a book
public struct DeleteBookInput {
    public let bookId: String
    public let userId: String

    public init(bookId: String, userId: String) {
        self.bookId = bookId
        self.userId = userId
    }
}

/// Use case for deleting a book
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
            throw DomainError.unauthorized("You don't have permission to delete this book")
        }

        // Delete the book
        let deleted = try await bookRepository.delete(input.bookId)

        if !deleted {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }
    }
}
