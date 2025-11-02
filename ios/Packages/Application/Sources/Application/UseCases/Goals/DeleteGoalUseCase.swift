import CoreDomain
import Foundation

/// Input for deleting a goal
public struct DeleteGoalInput {
    public let goalId: String
    public let userId: String

    public init(goalId: String, userId: String) {
        self.goalId = goalId
        self.userId = userId
    }
}

/// Use case for deleting a goal
public final class DeleteGoalUseCase: VoidOutputUseCase {
    public typealias Input = DeleteGoalInput

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws {
        // Verify goal exists
        guard let goal = try await goalRepository.findById(input.goalId) else {
            throw DomainError.entityNotFound("Goal", id: input.goalId)
        }

        // Verify user owns the goal
        guard goal.userId == input.userId else {
            throw DomainError.unauthorized("You don't have permission to delete this goal")
        }

        // Delete the goal
        let deleted = try await goalRepository.delete(input.goalId)

        if !deleted {
            throw DomainError.entityNotFound("Goal", id: input.goalId)
        }
    }
}
