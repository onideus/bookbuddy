import CoreDomain
import Foundation

/// Input for updating a goal
public struct UpdateGoalInput: Sendable, Equatable {
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

/// Use case for modifying an existing reading goal
///
/// This use case handles the business logic for updating goal properties
/// with proper authorization and ownership validation.
///
/// **Business Rules:**
/// - Only the goal's owner can update the goal (verified by userId)
/// - Goal must exist before it can be updated
/// - Updates are applied through the repository's update mechanism
/// - Supports partial updates through the GoalUpdate structure
/// - Goal progress and completion status are preserved during updates
/// - Target modifications don't reset existing progress
///
/// **Authorization:**
/// - Validates that the requesting user owns the goal being updated
/// - Throws unauthorized error if user doesn't own the goal
/// - Ensures data isolation between different users
///
/// **Data Integrity:**
/// - Verifies goal existence before attempting updates
/// - Uses repository's atomic update operations
/// - Maintains referential integrity through proper error handling
/// - Preserves goal history and creation metadata
///
/// **Update Types:**
/// - Title, description, target books, and date range can be modified
/// - Progress tracking and completion status remain unchanged
/// - Updates validate business rules (positive targets, valid dates)
///
/// - Parameter input: `UpdateGoalInput` containing goal ID, user ID, and update data
/// - Returns: The updated `Goal` entity with modified properties
/// - Throws: `DomainError.entityNotFound` if goal doesn't exist, `DomainError.unauthorized` if user doesn't own goal
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
