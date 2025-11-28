import Foundation

// MARK: - Reading Session DTOs

/// Response model for a reading session from the API
public struct ReadingSessionResponse: Codable, Identifiable, Sendable {
    public let id: String
    public let userId: String
    public let bookId: String?
    public let startTime: Date
    public let endTime: Date?
    public let durationMinutes: Int?
    public let pagesRead: Int?
    public let notes: String?
    public let createdAt: Date
    public let updatedAt: Date

    public init(
        id: String,
        userId: String,
        bookId: String?,
        startTime: Date,
        endTime: Date?,
        durationMinutes: Int?,
        pagesRead: Int?,
        notes: String?,
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.userId = userId
        self.bookId = bookId
        self.startTime = startTime
        self.endTime = endTime
        self.durationMinutes = durationMinutes
        self.pagesRead = pagesRead
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Whether this session is currently active (no end time)
    public var isActive: Bool {
        endTime == nil
    }

    /// Duration in a human-readable format
    public var formattedDuration: String {
        guard let minutes = durationMinutes else { return "In progress..." }
        let hours = minutes / 60
        let mins = minutes % 60
        if hours > 0 {
            return "\(hours)h \(mins)m"
        }
        return "\(mins)m"
    }
}

/// Request model to start a new reading session
public struct StartSessionRequest: Codable, Sendable {
    public let bookId: String?
    public let notes: String?

    public init(bookId: String? = nil, notes: String? = nil) {
        self.bookId = bookId
        self.notes = notes
    }
}

/// Request model to end a reading session (legacy - not used)
public struct EndSessionRequest: Codable, Sendable {
    public let pagesRead: Int?
    public let notes: String?

    public init(pagesRead: Int? = nil, notes: String? = nil) {
        self.pagesRead = pagesRead
        self.notes = notes
    }
}

/// Request model to end a reading session with the end flag
public struct EndSessionWithFlagRequest: Codable, Sendable {
    public let end: Bool
    public let pagesRead: Int?
    public let notes: String?

    public init(end: Bool = true, pagesRead: Int? = nil, notes: String? = nil) {
        self.end = end
        self.pagesRead = pagesRead
        self.notes = notes
    }
}

/// Request model to update a reading session
public struct UpdateSessionRequest: Codable, Sendable {
    public let pagesRead: Int?
    public let notes: String?

    public init(pagesRead: Int? = nil, notes: String? = nil) {
        self.pagesRead = pagesRead
        self.notes = notes
    }
}

/// Inner statistics object from the API
public struct SessionStatisticsData: Codable, Sendable {
    public let totalSessions: Int
    public let totalMinutes: Int
    public let totalPages: Int
    public let averageSessionLength: Double
    public let longestSession: Int
    public let sessionsThisWeek: Int
    public let minutesThisWeek: Int

    public init(
        totalSessions: Int,
        totalMinutes: Int,
        totalPages: Int,
        averageSessionLength: Double,
        longestSession: Int,
        sessionsThisWeek: Int,
        minutesThisWeek: Int
    ) {
        self.totalSessions = totalSessions
        self.totalMinutes = totalMinutes
        self.totalPages = totalPages
        self.averageSessionLength = averageSessionLength
        self.longestSession = longestSession
        self.sessionsThisWeek = sessionsThisWeek
        self.minutesThisWeek = minutesThisWeek
    }
}

/// Session statistics response from the API (wraps statistics + todayMinutes + weekMinutes)
public struct SessionStatisticsResponse: Codable, Sendable {
    public let statistics: SessionStatisticsData
    public let todayMinutes: Int
    public let weekMinutes: Int

    public init(
        statistics: SessionStatisticsData,
        todayMinutes: Int,
        weekMinutes: Int
    ) {
        self.statistics = statistics
        self.todayMinutes = todayMinutes
        self.weekMinutes = weekMinutes
    }

    /// Total reading time formatted
    public var formattedTotalTime: String {
        formatMinutes(statistics.totalMinutes)
    }

    /// Today's reading time formatted
    public var formattedTodayTime: String {
        formatMinutes(todayMinutes)
    }

    /// This week's reading time formatted
    public var formattedWeekTime: String {
        formatMinutes(weekMinutes)
    }

    /// Average session length formatted
    public var formattedAverageSession: String {
        formatMinutes(Int(statistics.averageSessionLength))
    }

    /// Total sessions count
    public var totalSessions: Int {
        statistics.totalSessions
    }

    private func formatMinutes(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60
        if hours > 0 {
            return "\(hours)h \(mins)m"
        }
        return "\(mins)m"
    }
}

/// Response for listing sessions with active session info
public struct SessionsListResponse: Codable, Sendable {
    public let sessions: [ReadingSessionResponse]
    public let activeSession: ReadingSessionResponse?
    public let todayMinutes: Int
    public let weekMinutes: Int
    public let statistics: SessionStatisticsData?

    public init(
        sessions: [ReadingSessionResponse],
        activeSession: ReadingSessionResponse?,
        todayMinutes: Int,
        weekMinutes: Int,
        statistics: SessionStatisticsData? = nil
    ) {
        self.sessions = sessions
        self.activeSession = activeSession
        self.todayMinutes = todayMinutes
        self.weekMinutes = weekMinutes
        self.statistics = statistics
    }
}

/// Response for active session endpoint
public struct ActiveSessionResponse: Codable, Sendable {
    public let activeSession: ReadingSessionResponse?
    public let isActive: Bool
    public let currentDurationMinutes: Int?

    public init(
        activeSession: ReadingSessionResponse?,
        isActive: Bool,
        currentDurationMinutes: Int? = nil
    ) {
        self.activeSession = activeSession
        self.isActive = isActive
        self.currentDurationMinutes = currentDurationMinutes
    }
}

/// Response for start/update session (wraps session in object)
public struct SessionActionResponse: Codable, Sendable {
    public let session: ReadingSessionResponse

    public init(session: ReadingSessionResponse) {
        self.session = session
    }
}
