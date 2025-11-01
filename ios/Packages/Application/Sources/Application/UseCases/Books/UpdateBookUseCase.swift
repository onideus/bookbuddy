//
//  UpdateBookUseCase.swift
//  Application
//
//  Use case for updating an existing book
//

import Foundation
import CoreDomain

/// Input for updating a book
public struct UpdateBookInput {
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

/// Use case for updating a book
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
            throw DomainError.unauthorized("You don't have permission to update this book")
        }

        // Update the book
        guard let updatedBook = try await bookRepository.update(input.bookId, updates: input.updates) else {
            throw DomainError.entityNotFound("Book", id: input.bookId)
        }

        return updatedBook
    }
}
