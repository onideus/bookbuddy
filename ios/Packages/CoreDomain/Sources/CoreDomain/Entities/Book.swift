//
//  Book.swift
//  CoreDomain
//
//  Domain entity representing a book in the user's library
//

import Foundation

/// Represents a book in the user's reading library
public struct Book: Identifiable, Codable, Equatable, Hashable {
    /// Unique identifier for the book
    public let id: String

    /// User ID who owns this book
    public let userId: String

    /// Google Books API identifier
    public let googleBooksId: String

    /// Book title
    public let title: String

    /// List of authors
    public let authors: [String]

    /// URL to book cover thumbnail
    public let thumbnail: String?

    /// Book description/synopsis
    public let description: String?

    /// Total number of pages
    public let pageCount: Int?

    /// Current reading status
    public let status: BookStatus

    /// Current page number (for tracking progress)
    public let currentPage: Int?

    /// User's rating (1-5 stars)
    public let rating: Int?

    /// Date when book was added to library
    public let addedAt: Date

    /// Date when book was finished reading
    public let finishedAt: Date?

    /// Initializes a new Book entity
    /// - Parameters:
    ///   - id: Unique identifier (UUID)
    ///   - userId: Owner's user ID
    ///   - googleBooksId: Google Books API ID
    ///   - title: Book title
    ///   - authors: List of authors
    ///   - thumbnail: Cover image URL
    ///   - description: Book description
    ///   - pageCount: Total pages
    ///   - status: Reading status
    ///   - currentPage: Current page number
    ///   - rating: User rating (1-5)
    ///   - addedAt: Date added
    ///   - finishedAt: Date finished
    public init(
        id: String,
        userId: String,
        googleBooksId: String,
        title: String,
        authors: [String],
        thumbnail: String? = nil,
        description: String? = nil,
        pageCount: Int? = nil,
        status: BookStatus,
        currentPage: Int? = nil,
        rating: Int? = nil,
        addedAt: Date,
        finishedAt: Date? = nil
    ) {
        self.id = id
        self.userId = userId
        self.googleBooksId = googleBooksId
        self.title = title
        self.authors = authors
        self.thumbnail = thumbnail
        self.description = description
        self.pageCount = pageCount
        self.status = status
        self.currentPage = currentPage
        self.rating = rating
        self.addedAt = addedAt
        self.finishedAt = finishedAt
    }
}

// MARK: - Domain Logic Extensions

public extension Book {
    /// Calculates reading progress as a percentage (0.0 - 1.0)
    var readingProgress: Double {
        guard let pageCount = pageCount, pageCount > 0,
              let currentPage = currentPage, currentPage > 0 else {
            return 0.0
        }
        return min(Double(currentPage) / Double(pageCount), 1.0)
    }

    /// Returns reading progress as a percentage string (e.g., "45%")
    var readingProgressPercentage: String {
        let percentage = Int(readingProgress * 100)
        return "\(percentage)%"
    }

    /// Checks if book can be rated (only books marked as "read")
    var canBeRated: Bool {
        return status == .read
    }

    /// Checks if book should be auto-marked as read
    var shouldAutoMarkAsRead: Bool {
        guard let pageCount = pageCount, pageCount > 0,
              let currentPage = currentPage else {
            return false
        }
        return currentPage >= pageCount && status == .reading
    }

    /// Validates rating value
    /// - Parameter rating: Rating to validate
    /// - Returns: True if rating is valid (1-5)
    static func isValidRating(_ rating: Int) -> Bool {
        return (1...5).contains(rating)
    }

    /// Validates page progress
    /// - Parameters:
    ///   - currentPage: Current page number
    ///   - pageCount: Total page count
    /// - Returns: True if page progress is valid
    static func isValidPageProgress(currentPage: Int, pageCount: Int?) -> Bool {
        guard let pageCount = pageCount else {
            return true // No page count means we can't validate
        }
        return currentPage >= 0 && currentPage <= pageCount
    }

    /// Creates a new book with validated inputs
    /// - Parameters:
    ///   - userId: Owner's user ID
    ///   - googleBooksId: Google Books ID
    ///   - title: Book title
    ///   - authors: List of authors
    ///   - thumbnail: Cover image URL
    ///   - description: Book description
    ///   - pageCount: Total pages
    ///   - status: Initial reading status
    /// - Throws: DomainError if inputs are invalid
    /// - Returns: New Book instance
    static func create(
        userId: String,
        googleBooksId: String,
        title: String,
        authors: [String],
        thumbnail: String? = nil,
        description: String? = nil,
        pageCount: Int? = nil,
        status: BookStatus = .wantToRead
    ) throws -> Book {
        guard !userId.isEmpty else {
            throw DomainError.validation("User ID cannot be empty")
        }

        guard !googleBooksId.isEmpty else {
            throw DomainError.validation("Google Books ID cannot be empty")
        }

        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw DomainError.validation("Title cannot be empty")
        }

        guard !authors.isEmpty else {
            throw DomainError.validation("Book must have at least one author")
        }

        if let pageCount = pageCount, pageCount < 0 {
            throw DomainError.validation("Page count cannot be negative")
        }

        return Book(
            id: UUID().uuidString,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title.trimmingCharacters(in: .whitespaces),
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: status,
            currentPage: status == .wantToRead ? nil : 0,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
    }

    /// Creates a copy with updated status
    /// - Parameter newStatus: New reading status
    /// - Returns: Updated book instance
    func withStatus(_ newStatus: BookStatus) -> Book {
        var finishedAt = self.finishedAt
        var rating = self.rating
        var currentPage = self.currentPage

        // Auto-set finishedAt when marking as read
        if newStatus == .read && self.status != .read {
            finishedAt = Date()
        }

        // Clear finishedAt and rating when leaving read status
        if newStatus != .read && self.status == .read {
            finishedAt = nil
            rating = nil
        }

        // Reset currentPage when moving to want-to-read
        if newStatus == .wantToRead {
            currentPage = nil
        }

        return Book(
            id: id,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title,
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: newStatus,
            currentPage: currentPage,
            rating: rating,
            addedAt: addedAt,
            finishedAt: finishedAt
        )
    }

    /// Creates a copy with updated rating
    /// - Parameter newRating: New rating value
    /// - Throws: DomainError if rating is invalid or book isn't read
    /// - Returns: Updated book instance
    func withRating(_ newRating: Int) throws -> Book {
        guard canBeRated else {
            throw DomainError.validation("Only books marked as 'read' can be rated")
        }

        guard Book.isValidRating(newRating) else {
            throw DomainError.validation("Rating must be between 1 and 5")
        }

        return Book(
            id: id,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title,
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: status,
            currentPage: currentPage,
            rating: newRating,
            addedAt: addedAt,
            finishedAt: finishedAt
        )
    }

    /// Creates a copy with updated page progress
    /// - Parameter newPage: New current page number
    /// - Throws: DomainError if page progress is invalid
    /// - Returns: Updated book instance
    func withCurrentPage(_ newPage: Int) throws -> Book {
        guard Book.isValidPageProgress(currentPage: newPage, pageCount: pageCount) else {
            throw DomainError.validation("Current page cannot exceed total page count")
        }

        guard newPage >= 0 else {
            throw DomainError.validation("Current page cannot be negative")
        }

        return Book(
            id: id,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title,
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: status,
            currentPage: newPage,
            rating: rating,
            addedAt: addedAt,
            finishedAt: finishedAt
        )
    }
}

// MARK: - Computed Properties

public extension Book {
    /// Returns a formatted string of authors
    var authorsString: String {
        authors.joined(separator: ", ")
    }

    /// Returns the first author or "Unknown"
    var primaryAuthor: String {
        authors.first ?? "Unknown"
    }

    /// Checks if the book has been read
    var isRead: Bool {
        status == .read
    }

    /// Checks if the book is currently being read
    var isReading: Bool {
        status == .reading
    }

    /// Checks if the book is on the want-to-read list
    var isWantToRead: Bool {
        status == .wantToRead
    }
}
