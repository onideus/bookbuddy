import CoreDomain
import Foundation

/// Input for updating a goal
public struct UpdateGoalInput {
    public let goalId: String
    public let userId: String
    public let updates: GoalUpdate

    public init(
        goalId: String,
        userId: String,
        updates: GoalUpdate
    ) {
        self.goalId = goalId
        self.userId = userId
        self.updates = updates
    }
}

/// Use case for updating a goal
public final class UpdateGoalUseCase: UseCase {
    public typealias Input = UpdateGoalInput
    public typealias Output = Goal

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws -> Goal {
        // Verify goal exists
        guard let goal = try await goalRepository.findById(input.goalId) else {
            throw DomainError.entityNotFound("Goal", id: input.goalId)
        }

        // Verify user owns the goal
        guard goal.userId == input.userId else {
            throw DomainError.unauthorized("You don't have permission to update this goal")
        }

        // Update the goal
        guard let updatedGoal = try await goalRepository.update(input.goalId, updates: input.updates) else {
            throw DomainError.entityNotFound("Goal", id: input.goalId)
        }

        return updatedGoal
    }
}
