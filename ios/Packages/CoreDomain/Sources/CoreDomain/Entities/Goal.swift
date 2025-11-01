//
//  Goal.swift
//  CoreDomain
//
//  Domain entity representing a reading goal
//

import Foundation

/// Represents a reading goal for tracking progress
public struct Goal: Identifiable, Codable, Equatable, Hashable {
    /// Unique identifier for the goal
    public let id: String

    /// User ID who owns this goal
    public let userId: String

    /// Goal title
    public let title: String

    /// Optional description
    public let description: String?

    /// Target number of books to read
    public let targetBooks: Int

    /// Current number of books read toward this goal
    public let currentBooks: Int

    /// Goal start date
    public let startDate: Date

    /// Goal end date
    public let endDate: Date

    /// Whether the goal has been completed
    public let completed: Bool

    /// Initializes a new Goal entity
    /// - Parameters:
    ///   - id: Unique identifier (UUID)
    ///   - userId: Owner's user ID
    ///   - title: Goal title
    ///   - description: Optional description
    ///   - targetBooks: Target number of books
    ///   - currentBooks: Current progress
    ///   - startDate: Start date
    ///   - endDate: End date
    ///   - completed: Completion status
    public init(
        id: String,
        userId: String,
        title: String,
        description: String? = nil,
        targetBooks: Int,
        currentBooks: Int,
        startDate: Date,
        endDate: Date,
        completed: Bool
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.currentBooks = currentBooks
        self.startDate = startDate
        self.endDate = endDate
        self.completed = completed
    }
}

// MARK: - Domain Logic Extensions

public extension Goal {
    /// Creates a new goal with validated inputs
    /// - Parameters:
    ///   - userId: Owner's user ID
    ///   - title: Goal title
    ///   - description: Optional description
    ///   - targetBooks: Target number of books
    ///   - startDate: Start date
    ///   - endDate: End date
    /// - Throws: DomainError if inputs are invalid
    /// - Returns: New Goal instance
    static func create(
        userId: String,
        title: String,
        description: String? = nil,
        targetBooks: Int,
        startDate: Date,
        endDate: Date
    ) throws -> Goal {
        guard !userId.isEmpty else {
            throw DomainError.validation("User ID cannot be empty")
        }

        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw DomainError.validation("Title cannot be empty")
        }

        guard targetBooks > 0 else {
            throw DomainError.validation("Target books must be greater than 0")
        }

        guard endDate > startDate else {
            throw DomainError.validation("End date must be after start date")
        }

        return Goal(
            id: UUID().uuidString,
            userId: userId,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description,
            targetBooks: targetBooks,
            currentBooks: 0,
            startDate: startDate,
            endDate: endDate,
            completed: false
        )
    }

    /// Creates a copy with updated progress
    /// - Parameter newCurrentBooks: New current books count
    /// - Returns: Updated goal instance
    func withCurrentBooks(_ newCurrentBooks: Int) -> Goal {
        let shouldComplete = newCurrentBooks >= targetBooks
        return Goal(
            id: id,
            userId: userId,
            title: title,
            description: description,
            targetBooks: targetBooks,
            currentBooks: newCurrentBooks,
            startDate: startDate,
            endDate: endDate,
            completed: shouldComplete
        )
    }

    /// Creates a copy marked as completed
    /// - Returns: Updated goal instance
    func markAsCompleted() -> Goal {
        Goal(
            id: id,
            userId: userId,
            title: title,
            description: description,
            targetBooks: targetBooks,
            currentBooks: currentBooks,
            startDate: startDate,
            endDate: endDate,
            completed: true
        )
    }
}

// MARK: - Computed Properties

public extension Goal {
    /// Progress percentage (0.0 - 1.0)
    var progressPercentage: Double {
        guard targetBooks > 0 else { return 0.0 }
        return min(Double(currentBooks) / Double(targetBooks), 1.0)
    }

    /// Progress percentage as integer (0-100)
    var progressPercentageInt: Int {
        Int(progressPercentage * 100)
    }

    /// Number of books remaining to reach goal
    var booksRemaining: Int {
        max(0, targetBooks - currentBooks)
    }

    /// Number of days remaining until end date
    var daysRemaining: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: endDate)
        return components.day ?? 0
    }

    /// Whether the goal is overdue
    var isOverdue: Bool {
        !completed && Date() > endDate
    }

    /// Whether the goal has started
    var hasStarted: Bool {
        Date() >= startDate
    }

    /// Whether the goal is currently active
    var isActive: Bool {
        hasStarted && !isOverdue && !completed
    }

    /// Duration of the goal in days
    var durationInDays: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: startDate, to: endDate)
        return components.day ?? 0
    }

    /// Goal status
    var status: GoalStatus {
        if completed {
            return .completed
        } else if isOverdue {
            return .overdue
        } else if !hasStarted {
            return .notStarted
        } else {
            return .inProgress
        }
    }
}

/// Represents the status of a goal
public enum GoalStatus: String, Codable, Equatable, Hashable {
    case notStarted = "not-started"
    case inProgress = "in-progress"
    case completed = "completed"
    case overdue = "overdue"

    public var displayName: String {
        switch self {
        case .notStarted:
            return "Not Started"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .overdue:
            return "Overdue"
        }
    }

    public var iconName: String {
        switch self {
        case .notStarted:
            return "clock"
        case .inProgress:
            return "flame.fill"
        case .completed:
            return "checkmark.circle.fill"
        case .overdue:
            return "exclamationmark.triangle.fill"
        }
    }

    public var colorName: String {
        switch self {
        case .notStarted:
            return "gray"
        case .inProgress:
            return "blue"
        case .completed:
            return "green"
        case .overdue:
            return "red"
        }
    }
}
