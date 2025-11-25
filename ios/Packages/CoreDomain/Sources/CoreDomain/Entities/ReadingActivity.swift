import Foundation

/// Represents a reading activity/session logged by the user
public struct ReadingActivity: Identifiable, Codable, Equatable, Hashable, Sendable {
    /// Unique identifier for the activity
    public let id: String

    /// User ID who logged this activity
    public let userId: String

    /// Optional book ID this activity is associated with
    public let bookId: String?

    /// Date of the reading activity
    public let activityDate: Date

    /// Number of pages read during this session
    public let pagesRead: Int

    /// Number of minutes spent reading
    public let minutesRead: Int

    /// When this activity was recorded
    public let createdAt: Date

    /// Initializes a new ReadingActivity entity
    public init(
        id: String,
        userId: String,
        bookId: String? = nil,
        activityDate: Date,
        pagesRead: Int,
        minutesRead: Int,
        createdAt: Date
    ) {
        self.id = id
        self.userId = userId
        self.bookId = bookId
        self.activityDate = activityDate
        self.pagesRead = pagesRead
        self.minutesRead = minutesRead
        self.createdAt = createdAt
    }
}

// MARK: - Domain Logic

public extension ReadingActivity {
    /// Creates a new reading activity with validation
    static func create(
        userId: String,
        bookId: String? = nil,
        activityDate: Date = Date(),
        pagesRead: Int,
        minutesRead: Int
    ) throws -> ReadingActivity {
        guard !userId.isEmpty else {
            throw DomainError.validation("User ID cannot be empty")
        }

        guard pagesRead >= 0 else {
            throw DomainError.validation("Pages read cannot be negative")
        }

        guard minutesRead >= 0 else {
            throw DomainError.validation("Minutes read cannot be negative")
        }

        guard pagesRead > 0 || minutesRead > 0 else {
            throw DomainError.validation("Must record at least some pages or minutes")
        }

        return ReadingActivity(
            id: UUID().uuidString,
            userId: userId,
            bookId: bookId,
            activityDate: activityDate,
            pagesRead: pagesRead,
            minutesRead: minutesRead,
            createdAt: Date()
        )
    }
}
