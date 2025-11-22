import CoreDomain
import Foundation

/// Input for creating a goal
public struct CreateGoalInput: Sendable, Equatable {
    public let userId: String
    public let title: String
    public let description: String?
    public let targetBooks: Int
    public let startDate: Date
    public let endDate: Date

    public init(
        userId: String,
        title: String,
        description: String? = nil,
        targetBooks: Int,
        startDate: Date,
        endDate: Date
    ) {
        self.userId = userId
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.startDate = startDate
        self.endDate = endDate
    }
}

/// Use case for creating a new reading goal for a user
///
/// This use case handles the business logic for establishing reading goals
/// that help users track their reading progress over specific time periods.
///
/// **Business Rules:**
/// - Each goal must have a positive target number of books (validated at domain level)
/// - End date must be after start date (validated in Goal.create)
/// - Each goal gets a unique identifier and creation timestamp
/// - Goals are associated with specific users and cannot be shared
/// - Title must be descriptive and non-empty
/// - Users can have multiple active goals simultaneously
/// - Initial progress starts at 0 books read
///
/// **Validation:**
/// - Goal creation validates through `Goal.create()` factory method
/// - Date range validation ensures logical time periods
/// - Target book count must be positive integer
/// - User ID and title cannot be empty
/// - All validation errors are propagated as domain errors
///
/// **Data Integrity:**
/// - Goals are isolated per user (no cross-user access)
/// - Atomic creation through repository operations
/// - Consistent initial state (0 progress, not completed)
///
/// - Parameter input: `CreateGoalInput` containing all required goal information
/// - Returns: The newly created `Goal` entity with assigned ID and initial state
/// - Throws: Validation errors from Goal.create() or repository errors
public final class CreateGoalUseCase: UseCase {
    public typealias Input = CreateGoalInput
    public typealias Output = Goal

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws -> Goal {
        // Create the goal entity (validation happens in Goal.create)
        let goal = try Goal.create(
            userId: input.userId,
            title: input.title,
            description: input.description,
            targetBooks: input.targetBooks,
            startDate: input.startDate,
            endDate: input.endDate
        )

        // Save to repository
        return try await goalRepository.create(goal)
    }
}
