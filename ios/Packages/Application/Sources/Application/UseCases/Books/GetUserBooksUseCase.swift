import CoreDomain
import Foundation

/// Input for getting user's books
public struct GetUserBooksInput: Sendable, Equatable {
    public let userId: String

    public init(userId: String) {
        self.userId = userId
    }
}

/// Use case for retrieving all books in a user's personal library
///
/// This use case handles the business logic for fetching the complete
/// collection of books that a specific user has added to their reading library.
///
/// **Business Rules:**
/// - Returns all books associated with the specified user ID
/// - Books are returned regardless of their reading status (want to read, reading, completed)
/// - Empty array is returned if the user has no books in their library
/// - Only books belonging to the specified user are included
/// - Results are ordered according to repository's default sorting
///
/// **Data Access:**
/// - Performs read-only operations on the book repository
/// - No authorization required beyond user ID validation
/// - Efficient single-query retrieval of all user books
/// - Results include all book metadata and current status
///
/// **Performance:**
/// - Single repository call for optimal performance
/// - No additional processing or filtering required
/// - Suitable for displaying user's complete book collection
///
/// - Parameter input: `GetUserBooksInput` containing the user ID for book retrieval
/// - Returns: Array of `Book` entities belonging to the user (empty if none exist)
/// - Throws: Repository errors if books cannot be retrieved
public final class GetUserBooksUseCase: UseCase {
    public typealias Input = GetUserBooksInput
    public typealias Output = [Book]

    private let bookRepository: BookRepositoryProtocol

    public init(bookRepository: BookRepositoryProtocol) {
        self.bookRepository = bookRepository
    }

    public func execute(_ input: Input) async throws -> [Book] {
        try await bookRepository.findByUserId(input.userId)
    }
}
