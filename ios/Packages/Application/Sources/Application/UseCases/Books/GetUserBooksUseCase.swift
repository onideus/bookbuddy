//
//  GetUserBooksUseCase.swift
//  Application
//
//  Use case for retrieving all books for a user
//

import Foundation
import CoreDomain

/// Input for getting user's books
public struct GetUserBooksInput {
    public let userId: String

    public init(userId: String) {
        self.userId = userId
    }
}

/// Use case for retrieving user's books
public final class GetUserBooksUseCase: UseCase {
    public typealias Input = GetUserBooksInput
    public typealias Output = [Book]

    private let bookRepository: BookRepositoryProtocol

    public init(bookRepository: BookRepositoryProtocol) {
        self.bookRepository = bookRepository
    }

    public func execute(_ input: Input) async throws -> [Book] {
        return try await bookRepository.findByUserId(input.userId)
    }
}
