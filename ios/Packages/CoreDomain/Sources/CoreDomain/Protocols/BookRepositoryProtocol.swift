import Foundation

/// Protocol for book repository operations
public protocol BookRepositoryProtocol {
    /// Creates a new book
    /// - Parameter book: Book entity to create
    /// - Returns: Created book
    /// - Throws: DomainError if creation fails
    func create(_ book: Book) async throws -> Book

    /// Finds all books for a user
    /// - Parameter userId: User ID
    /// - Returns: Array of books
    /// - Throws: DomainError if operation fails
    func findByUserId(_ userId: String) async throws -> [Book]
    
    /// Finds books for a user with pagination
    /// - Parameters:
    ///   - userId: User ID
    ///   - offset: Number of records to skip
    ///   - limit: Maximum number of records to return (nil for all records)
    /// - Returns: Array of books
    /// - Throws: DomainError if operation fails
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Book]

    /// Finds a book by ID
    /// - Parameter id: Book ID
    /// - Returns: Book if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func findById(_ id: String) async throws -> Book?

    /// Updates an existing book
    /// - Parameters:
    ///   - id: Book ID to update
    ///   - updates: Partial book updates
    /// - Returns: Updated book if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func update(_ id: String, updates: BookUpdate) async throws -> Book?

    /// Deletes a book
    /// - Parameter id: Book ID to delete
    /// - Returns: True if deleted, false if not found
    /// - Throws: DomainError if operation fails
    func delete(_ id: String) async throws -> Bool

    /// Finds books by status for a user
    /// - Parameters:
    ///   - userId: User ID
    ///   - status: Reading status
    /// - Returns: Array of books with the specified status
    /// - Throws: DomainError if operation fails
    func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book]
    
    /// Checks if a book exists for a user
    /// - Parameters:
    ///   - userId: User ID
    ///   - googleBooksId: Google Books ID to check
    /// - Returns: True if book exists, false otherwise
    /// - Throws: DomainError if operation fails
    func exists(userId: String, googleBooksId: String) async throws -> Bool
}

/// Struct representing partial book updates
public struct BookUpdate: Equatable, Sendable {
    public let status: BookStatus?
    public let currentPage: Int?
    public let rating: Int?
    public let finishedAt: Date?

    public init(
        status: BookStatus? = nil,
        currentPage: Int? = nil,
        rating: Int? = nil,
        finishedAt: Date? = nil
    ) {
        self.status = status
        self.currentPage = currentPage
        self.rating = rating
        self.finishedAt = finishedAt
    }
}
