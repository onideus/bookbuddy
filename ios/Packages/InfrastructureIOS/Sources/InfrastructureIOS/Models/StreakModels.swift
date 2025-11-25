import CoreDomain
import Foundation

// MARK: - Request Models

public struct RecordActivityRequest: Encodable {
    public let pagesRead: Int
    public let minutesRead: Int
    public let bookId: String?
    public let date: String?

    public init(input: RecordActivityInput) {
        pagesRead = input.pagesRead
        minutesRead = input.minutesRead
        bookId = input.bookId
        if let date = input.date {
            let formatter = ISO8601DateFormatter()
            self.date = formatter.string(from: date)
        } else {
            date = nil
        }
    }
}

// MARK: - Response Models

public struct GetStreakResponse: Decodable {
    public let currentStreak: Int
    public let longestStreak: Int
    public let totalDaysRead: Int
    public let lastActivityDate: Date?
    public let isActiveToday: Bool
    public let isAtRisk: Bool
    public let message: String

    public init(
        currentStreak: Int,
        longestStreak: Int,
        totalDaysRead: Int,
        lastActivityDate: Date?,
        isActiveToday: Bool,
        isAtRisk: Bool,
        message: String
    ) {
        self.currentStreak = currentStreak
        self.longestStreak = longestStreak
        self.totalDaysRead = totalDaysRead
        self.lastActivityDate = lastActivityDate
        self.isActiveToday = isActiveToday
        self.isAtRisk = isAtRisk
        self.message = message
    }
}

public struct RecordActivityResponse: Decodable {
    public let activity: ReadingActivityDTO

    public init(activity: ReadingActivityDTO) {
        self.activity = activity
    }
}

public struct GetActivityHistoryResponse: Decodable {
    public let activities: [ReadingActivityDTO]

    public init(activities: [ReadingActivityDTO]) {
        self.activities = activities
    }
}

// MARK: - DTO Models

public struct ReadingActivityDTO: Codable {
    public let id: String
    public let userId: String
    public let bookId: String?
    public let activityDate: Date
    public let pagesRead: Int
    public let minutesRead: Int
    public let createdAt: Date

    public init(
        id: String,
        userId: String,
        bookId: String?,
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

// MARK: - Domain Conversion

public extension GetStreakResponse {
    func toDomain() -> ReadingStreak {
        ReadingStreak(
            currentStreak: currentStreak,
            longestStreak: longestStreak,
            totalDaysRead: totalDaysRead,
            lastActivityDate: lastActivityDate,
            isActiveToday: isActiveToday,
            isAtRisk: isAtRisk,
            message: message
        )
    }
}

public extension ReadingActivityDTO {
    func toDomain() -> ReadingActivity {
        ReadingActivity(
            id: id,
            userId: userId,
            bookId: bookId,
            activityDate: activityDate,
            pagesRead: pagesRead,
            minutesRead: minutesRead,
            createdAt: createdAt
        )
    }
}

public extension ReadingActivity {
    func toDTO() -> ReadingActivityDTO {
        ReadingActivityDTO(
            id: id,
            userId: userId,
            bookId: bookId,
            activityDate: activityDate,
            pagesRead: pagesRead,
            minutesRead: minutesRead,
            createdAt: createdAt
        )
    }
}
