import CoreDomain
import Foundation

/// Input for deleting a goal
public struct DeleteGoalInput: Sendable, Equatable {
    public let goalId: String
    public let userId: String

    public init(goalId: String, userId: String) {
        self.goalId = goalId
        self.userId = userId
    }
}

/// Use case for permanently removing a reading goal from the user's collection
///
/// This use case handles the business logic for deleting goal entries
/// with proper authorization and data integrity checks.
///
/// **Business Rules:**
/// - Only the goal's owner can delete the goal (verified by userId)
/// - Goal must exist before it can be deleted
/// - Deletion is permanent and cannot be undone
/// - Operation is atomic - either succeeds completely or fails with error
/// - Goal progress and history are permanently lost upon deletion
/// - No cascading deletions - related data should be handled separately
///
/// **Authorization:**
/// - Validates that the requesting user owns the goal being deleted
/// - Throws unauthorized error if user doesn't own the goal
/// - Ensures users cannot delete goals belonging to other users
///
/// **Data Safety:**
/// - Verifies goal existence before attempting deletion
/// - Uses repository's atomic delete operations
/// - Returns success confirmation to prevent silent failures
/// - Maintains data consistency through proper error handling
///
/// **Impact:**
/// - Removes goal from user's tracking system permanently
/// - Does not affect book collection or reading progress outside of goal context
/// - May impact overall user statistics and progress tracking
///
/// - Parameter input: `DeleteGoalInput` containing goal ID and user ID for authorization
/// - Returns: Void upon successful deletion
/// - Throws: `DomainError.entityNotFound` if goal doesn't exist, `DomainError.unauthorized` if user doesn't own goal
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
