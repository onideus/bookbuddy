import Foundation

/// Represents a user's reading streak statistics
public struct ReadingStreak: Codable, Equatable, Sendable {
    /// Current consecutive days streak
    public let currentStreak: Int

    /// Longest streak ever achieved
    public let longestStreak: Int

    /// Total number of days read
    public let totalDaysRead: Int

    /// Date of last reading activity
    public let lastActivityDate: Date?

    /// Whether user has read today
    public let isActiveToday: Bool

    /// Whether streak is at risk (no activity today, but had activity yesterday)
    public let isAtRisk: Bool

    /// Motivational message based on streak status
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

// MARK: - Computed Properties

public extension ReadingStreak {
    /// Returns the streak status for UI display
    var streakStatus: StreakStatus {
        if currentStreak == 0 {
            return .noStreak
        } else if isActiveToday {
            return .active
        } else if isAtRisk {
            return .atRisk
        } else {
            return .broken
        }
    }

    /// Returns an appropriate icon name for the streak status
    var iconName: String {
        switch streakStatus {
        case .active:
            return "flame.fill"
        case .atRisk:
            return "flame"
        case .noStreak, .broken:
            return "flame"
        }
    }

    /// Returns the color name for streak display
    var colorName: String {
        switch streakStatus {
        case .active:
            return "orange"
        case .atRisk:
            return "yellow"
        case .noStreak, .broken:
            return "gray"
        }
    }

    /// Creates a default/empty streak for new users
    static var empty: ReadingStreak {
        ReadingStreak(
            currentStreak: 0,
            longestStreak: 0,
            totalDaysRead: 0,
            lastActivityDate: nil,
            isActiveToday: false,
            isAtRisk: false,
            message: "Start your reading journey today!"
        )
    }
}

/// Represents the current status of a reading streak
public enum StreakStatus: Sendable {
    /// User has logged activity today
    case active
    /// User hasn't logged today but did yesterday (streak at risk)
    case atRisk
    /// User has no active streak
    case noStreak
    /// User had a streak but it's now broken
    case broken
}
