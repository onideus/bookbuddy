import Foundation

/// Value object that manages goal progress calculations
public struct GoalProgress: Codable, Equatable, Hashable {
    private let goal: Goal

    /// Initializes with a goal entity
    /// - Parameter goal: The goal to calculate progress for
    public init(goal: Goal) {
        self.goal = goal
    }

    // MARK: - Progress Metrics

    /// Gets the progress percentage (0.0 - 100.0)
    /// - Returns: Progress percentage
    public func getProgressPercentage() -> Double {
        goal.progressPercentage * 100
    }

    /// Gets the progress percentage as an integer (0-100)
    /// - Returns: Progress percentage as integer
    public func getProgressPercentageInt() -> Int {
        goal.progressPercentageInt
    }

    /// Checks if the goal is completed
    /// - Returns: True if goal is completed
    public func isCompleted() -> Bool {
        goal.completed
    }

    /// Checks if the goal is overdue
    /// - Returns: True if goal is past end date and not completed
    public func isOverdue() -> Bool {
        goal.isOverdue
    }

    /// Gets the number of days remaining
    /// - Returns: Days remaining (negative if overdue)
    public func getDaysRemaining() -> Int {
        goal.daysRemaining
    }

    /// Gets the number of books remaining to reach the goal
    /// - Returns: Books remaining
    public func getBooksRemaining() -> Int {
        goal.booksRemaining
    }

    // MARK: - Status Tracking

    /// Gets the current status of the goal
    /// - Returns: Goal status enum
    public func getStatus() -> GoalStatus {
        goal.status
    }

    /// Checks if the goal should be auto-completed
    /// - Returns: True if current books >= target books
    public func shouldAutoComplete() -> Bool {
        goal.currentBooks >= goal.targetBooks
    }

    // MARK: - Time-based Metrics

    /// Gets the total duration of the goal in days
    /// - Returns: Duration in days
    public func getDurationInDays() -> Int {
        goal.durationInDays
    }

    /// Gets the number of days elapsed since start
    /// - Returns: Days elapsed
    public func getDaysElapsed() -> Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: goal.startDate, to: Date())
        return max(0, components.day ?? 0)
    }

    /// Gets time remaining as a formatted string
    /// - Returns: Formatted time string (e.g., "5 days left", "Overdue by 2 days")
    public func getTimeRemainingFormatted() -> String {
        let days = getDaysRemaining()

        if days < 0 {
            let overdueDays = abs(days)
            return overdueDays == 1 ? "Overdue by 1 day" : "Overdue by \(overdueDays) days"
        } else if days == 0 {
            return "Ends today"
        } else if days == 1 {
            return "1 day left"
        } else {
            return "\(days) days left"
        }
    }

    // MARK: - Progress Rate Calculations

    /// Calculates the average books per day needed to complete the goal
    /// - Returns: Books per day (can be fractional)
    public func getBooksPerDayNeeded() -> Double {
        let daysRemaining = Double(max(1, getDaysRemaining()))
        let booksRemaining = Double(getBooksRemaining())
        return booksRemaining / daysRemaining
    }

    /// Calculates the current pace (books per day)
    /// - Returns: Current reading pace
    public func getCurrentPace() -> Double {
        let daysElapsed = Double(max(1, getDaysElapsed()))
        return Double(goal.currentBooks) / daysElapsed
    }

    /// Checks if the current pace is on track
    /// - Returns: True if on track or ahead of schedule
    public func isOnTrack() -> Bool {
        guard !isCompleted(), !isOverdue() else {
            return isCompleted()
        }

        let currentPace = getCurrentPace()
        let neededPace = getBooksPerDayNeeded()
        return currentPace >= neededPace
    }

    // MARK: - Serialization

    /// Converts to a JSON-compatible dictionary
    /// - Returns: Dictionary representation
    public func toJSON() -> [String: Any] {
        [
            "goalId": goal.id,
            "progressPercentage": getProgressPercentage(),
            "currentBooks": goal.currentBooks,
            "targetBooks": goal.targetBooks,
            "booksRemaining": getBooksRemaining(),
            "daysRemaining": getDaysRemaining(),
            "daysElapsed": getDaysElapsed(),
            "status": getStatus().rawValue,
            "completed": isCompleted(),
            "overdue": isOverdue(),
            "onTrack": isOnTrack(),
            "timeRemainingFormatted": getTimeRemainingFormatted(),
        ]
    }
}

// MARK: - Codable Implementation

public extension GoalProgress {
    internal enum CodingKeys: String, CodingKey {
        case goal
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        goal = try container.decode(Goal.self, forKey: .goal)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(goal, forKey: .goal)
    }
}

// MARK: - Convenience Accessors

public extension GoalProgress {
    /// The underlying goal entity
    var underlyingGoal: Goal {
        goal
    }

    /// Goal title
    var title: String {
        goal.title
    }

    /// Goal description
    var description: String? {
        goal.description
    }

    /// Current books count
    var currentBooks: Int {
        goal.currentBooks
    }

    /// Target books count
    var targetBooks: Int {
        goal.targetBooks
    }

    /// Start date
    var startDate: Date {
        goal.startDate
    }

    /// End date
    var endDate: Date {
        goal.endDate
    }
}
