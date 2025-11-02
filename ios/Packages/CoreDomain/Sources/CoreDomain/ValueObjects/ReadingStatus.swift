import Foundation

/// Value object that manages reading status logic and validation
public struct ReadingStatus {
    private let book: Book

    /// Initializes with a book entity
    /// - Parameter book: The book to manage status for
    public init(book: Book) {
        self.book = book
    }

    // MARK: - State Transitions

    /// Checks if the book can transition to a new status
    /// - Parameter newStatus: The proposed new status
    /// - Returns: True if transition is allowed
    public func canTransitionTo(_: BookStatus) -> Bool {
        // All transitions are allowed in this domain
        true
    }

    /// Creates an updated book with the new status
    /// - Parameter newStatus: The new reading status
    /// - Returns: Updated book instance
    public func transitionTo(_ newStatus: BookStatus) -> Book {
        book.withStatus(newStatus)
    }

    // MARK: - Progress Tracking

    /// Calculates reading progress as a percentage (0-100)
    /// - Returns: Progress percentage
    public func getReadingProgress() -> Double {
        book.readingProgress * 100
    }

    /// Gets formatted progress string
    /// - Returns: Progress as percentage string (e.g., "45%")
    public func getReadingProgressFormatted() -> String {
        book.readingProgressPercentage
    }

    // MARK: - Rating Validation

    /// Checks if the book can be rated
    /// - Returns: True if book status is "read"
    public func canBeRated() -> Bool {
        book.canBeRated
    }

    /// Validates a rating value
    /// - Parameter rating: Rating to validate (1-5)
    /// - Throws: DomainError if rating is invalid
    public func validateRating(_ rating: Int) throws {
        guard canBeRated() else {
            throw DomainError.validation("Only books marked as 'read' can be rated")
        }

        guard Book.isValidRating(rating) else {
            throw DomainError.validation("Rating must be between 1 and 5")
        }
    }

    /// Validates page progress
    /// - Parameter currentPage: Page number to validate
    /// - Throws: DomainError if page progress is invalid
    public func validatePageProgress(_ currentPage: Int) throws {
        guard currentPage >= 0 else {
            throw DomainError.validation("Current page cannot be negative")
        }

        guard Book.isValidPageProgress(currentPage: currentPage, pageCount: book.pageCount) else {
            throw DomainError.validation("Current page cannot exceed total page count")
        }
    }

    // MARK: - Auto-completion Logic

    /// Checks if book should be auto-marked as read
    /// - Returns: True if current page >= total pages and status is "reading"
    public func shouldAutoMarkAsRead() -> Bool {
        book.shouldAutoMarkAsRead
    }

    // MARK: - Status-specific Behaviors

    /// Gets the appropriate behavior when transitioning to a status
    /// - Parameter newStatus: The target status
    /// - Returns: Dictionary of field updates
    public func getTransitionUpdates(to newStatus: BookStatus) -> [String: Any?] {
        var updates: [String: Any?] = ["status": newStatus]

        switch newStatus {
        case .read:
            // Auto-set finishedAt if not already set
            if book.finishedAt == nil {
                updates["finishedAt"] = Date()
            }

        case .wantToRead:
            // Reset progress
            updates["currentPage"] = nil
            // Clear finishedAt and rating when moving out of read
            if book.status == .read {
                updates["finishedAt"] = nil
                updates["rating"] = nil
            }

        case .reading:
            // Clear finishedAt and rating when moving out of read
            if book.status == .read {
                updates["finishedAt"] = nil
                updates["rating"] = nil
            }
            // Initialize currentPage if needed
            if book.currentPage == nil {
                updates["currentPage"] = 0
            }
        }

        return updates
    }
}

// MARK: - Static Helper Methods

public extension ReadingStatus {
    /// Validates a status transition
    /// - Parameters:
    ///   - from: Current status
    ///   - to: Proposed new status
    /// - Returns: True if transition is valid
    static func isValidTransition(from _: BookStatus, to _: BookStatus) -> Bool {
        // All transitions are allowed
        true
    }

    /// Gets all possible status transitions from a given status
    /// - Parameter currentStatus: Current reading status
    /// - Returns: Array of possible target statuses
    static func possibleTransitions(from currentStatus: BookStatus) -> [BookStatus] {
        BookStatus.allCases.filter { $0 != currentStatus }
    }
}
