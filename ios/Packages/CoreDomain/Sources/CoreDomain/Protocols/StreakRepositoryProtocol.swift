import Foundation

/// Protocol for accessing streak data
public protocol StreakRepositoryProtocol: Sendable {
    /// Fetches the current user's streak statistics
    func getStreak() async throws -> ReadingStreak

    /// Records a new reading activity
    func recordActivity(_ activity: RecordActivityInput) async throws -> ReadingActivity

    /// Fetches activity history for the user
    func getActivityHistory(startDate: Date?, endDate: Date?) async throws -> [ReadingActivity]
}

/// Input for recording a new reading activity
public struct RecordActivityInput: Sendable {
    public let pagesRead: Int
    public let minutesRead: Int
    public let bookId: String?
    public let date: Date?

    public init(
        pagesRead: Int,
        minutesRead: Int,
        bookId: String? = nil,
        date: Date? = nil
    ) {
        self.pagesRead = pagesRead
        self.minutesRead = minutesRead
        self.bookId = bookId
        self.date = date
    }
}
