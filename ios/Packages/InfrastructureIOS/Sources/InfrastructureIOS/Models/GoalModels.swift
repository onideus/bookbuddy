import CoreDomain
import Foundation

// MARK: - Request Models

public struct CreateGoalRequest: Encodable {
    public let title: String
    public let description: String?
    public let targetBooks: Int
    public let startDate: Date
    public let endDate: Date

    public init(
        title: String,
        description: String?,
        targetBooks: Int,
        startDate: Date,
        endDate: Date
    ) {
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.startDate = startDate
        self.endDate = endDate
    }
}

public struct UpdateGoalRequest: Encodable {
    public let title: String?
    public let description: String?
    public let targetBooks: Int?
    public let startDate: Date?
    public let endDate: Date?

    public init(
        title: String? = nil,
        description: String? = nil,
        targetBooks: Int? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil
    ) {
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.startDate = startDate
        self.endDate = endDate
    }
}

// MARK: - Response Models

public struct GetGoalsResponse: Decodable {
    public let goals: [GoalDTO]

    public init(goals: [GoalDTO]) {
        self.goals = goals
    }
}

public struct CreateGoalResponse: Decodable {
    public let goal: GoalDTO

    public init(goal: GoalDTO) {
        self.goal = goal
    }
}

public struct UpdateGoalResponse: Decodable {
    public let goal: GoalDTO

    public init(goal: GoalDTO) {
        self.goal = goal
    }
}

public struct DeleteGoalResponse: Decodable {
    public let message: String

    public init(message: String) {
        self.message = message
    }
}

// MARK: - DTO Models

public struct GoalDTO: Codable {
    public let id: String
    public let userId: String
    public let title: String
    public let description: String?
    public let targetBooks: Int
    public let startDate: Date
    public let endDate: Date
    public let currentBooks: Int
    public let completed: Bool

    public init(
        id: String,
        userId: String,
        title: String,
        description: String?,
        targetBooks: Int,
        startDate: Date,
        endDate: Date,
        currentBooks: Int,
        completed: Bool
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.startDate = startDate
        self.endDate = endDate
        self.currentBooks = currentBooks
        self.completed = completed
    }
}

// MARK: - Domain Conversion
extension GoalDTO {
    public func toDomain() -> Goal {
        return Goal(
            id: id,
            userId: userId,
            title: title,
            description: description,
            targetBooks: targetBooks,
            currentBooks: currentBooks,
            startDate: startDate,
            endDate: endDate,
            completed: completed
        )
    }
}

extension Goal {
    public func toDTO() -> GoalDTO {
        return GoalDTO(
            id: id,
            userId: userId,
            title: title,
            description: description,
            targetBooks: targetBooks,
            startDate: startDate,
            endDate: endDate,
            currentBooks: currentBooks,
            completed: completed
        )
    }
}
