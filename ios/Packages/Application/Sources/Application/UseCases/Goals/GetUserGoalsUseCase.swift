import CoreDomain
import Foundation

/// Input for getting user's goals
public struct GetUserGoalsInput: Sendable, Equatable {
    public let userId: String

    public init(userId: String) {
        self.userId = userId
    }
}

/// Use case for retrieving all reading goals belonging to a specific user
///
/// This use case handles the business logic for fetching the complete
/// collection of reading goals that a user has created to track their progress.
///
/// **Business Rules:**
/// - Returns all goals associated with the specified user ID
/// - Goals are returned regardless of their completion status or deadlines
/// - Empty array is returned if the user has no goals
/// - Only goals belonging to the specified user are included
/// - Results include both active and completed/expired goals
/// - Goals are ordered according to repository's default sorting (typically creation date)
///
/// **Data Access:**
/// - Performs read-only operations on the goal repository
/// - No authorization required beyond user ID validation
/// - Efficient single-query retrieval of all user goals
/// - Results include complete goal metadata and current progress
///
/// **Use Cases:**
/// - Displaying user's goal dashboard and progress overview
/// - Tracking reading achievements and milestones
/// - Historical view of completed and abandoned goals
/// - Goal management and editing interfaces
///
/// **Performance:**
/// - Single repository call for optimal performance
/// - No additional processing or filtering required
/// - Suitable for displaying comprehensive goal collections
///
/// - Parameter input: `GetUserGoalsInput` containing the user ID for goal retrieval
/// - Returns: Array of `Goal` entities belonging to the user (empty if none exist)
/// - Throws: Repository errors if goals cannot be retrieved
public final class GetUserGoalsUseCase: UseCase {
    public typealias Input = GetUserGoalsInput
    public typealias Output = [Goal]

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws -> [Goal] {
        try await goalRepository.findByUserId(input.userId)
    }
}
