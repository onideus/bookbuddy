import Application
import Combine
import CoreDomain
import Foundation

@MainActor
final class GoalsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var goals: [Goal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showingCreateGoal = false

    // MARK: - Dependencies

    private let getUserGoalsUseCase: GetUserGoalsUseCase
    private let createGoalUseCase: CreateGoalUseCase
    private let updateGoalUseCase: UpdateGoalUseCase
    private let deleteGoalUseCase: DeleteGoalUseCase
    private let currentUserId: String

    // MARK: - Initialization

    init(
        getUserGoalsUseCase: GetUserGoalsUseCase,
        createGoalUseCase: CreateGoalUseCase,
        updateGoalUseCase: UpdateGoalUseCase,
        deleteGoalUseCase: DeleteGoalUseCase,
        currentUserId: String
    ) {
        self.getUserGoalsUseCase = getUserGoalsUseCase
        self.createGoalUseCase = createGoalUseCase
        self.updateGoalUseCase = updateGoalUseCase
        self.deleteGoalUseCase = deleteGoalUseCase
        self.currentUserId = currentUserId
    }

    /// Convenience initializer that creates use cases from a repository
    convenience init(goalRepository: GoalRepositoryProtocol, currentUserId: String = "temp-user-id") {
        let getUserGoalsUseCase = GetUserGoalsUseCase(goalRepository: goalRepository)
        let createGoalUseCase = CreateGoalUseCase(goalRepository: goalRepository)
        let updateGoalUseCase = UpdateGoalUseCase(goalRepository: goalRepository)
        let deleteGoalUseCase = DeleteGoalUseCase(goalRepository: goalRepository)

        self.init(
            getUserGoalsUseCase: getUserGoalsUseCase,
            createGoalUseCase: createGoalUseCase,
            updateGoalUseCase: updateGoalUseCase,
            deleteGoalUseCase: deleteGoalUseCase,
            currentUserId: currentUserId
        )
    }

    // MARK: - Public Methods

    func loadGoals() async {
        isLoading = true
        errorMessage = nil

        do {
            let input = GetUserGoalsInput(userId: currentUserId)
            let fetchedGoals = try await getUserGoalsUseCase.execute(input)
            goals = fetchedGoals.sorted { goal1, goal2 in
                // Sort: active first, then by end date
                if goal1.isActive && !goal2.isActive {
                    return true
                } else if !goal1.isActive && goal2.isActive {
                    return false
                } else {
                    return goal1.endDate < goal2.endDate
                }
            }
        } catch {
            errorMessage = "Failed to load goals: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func createGoal(
        title: String,
        description: String?,
        targetBooks: Int,
        startDate: Date,
        endDate: Date
    ) async {
        isLoading = true
        errorMessage = nil

        do {
            let input = CreateGoalInput(
                userId: currentUserId,
                title: title,
                description: description,
                targetBooks: targetBooks,
                startDate: startDate,
                endDate: endDate
            )

            let newGoal = try await createGoalUseCase.execute(input)
            goals.append(newGoal)
            showingCreateGoal = false

            // Reload to ensure proper sorting
            await loadGoals()
        } catch {
            errorMessage = "Failed to create goal: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func updateGoal(_ goal: Goal, updates: GoalUpdate) async {
        do {
            let input = UpdateGoalInput(
                goalId: goal.id,
                userId: currentUserId,
                updates: updates
            )

            let updatedGoal = try await updateGoalUseCase.execute(input)

            // Update local state
            if let index = goals.firstIndex(where: { $0.id == goal.id }) {
                goals[index] = updatedGoal
            }
        } catch {
            errorMessage = "Failed to update goal: \(error.localizedDescription)"
        }
    }

    func deleteGoal(_ goal: Goal) async {
        do {
            let input = DeleteGoalInput(
                goalId: goal.id,
                userId: currentUserId
            )

            try await deleteGoalUseCase.execute(input)

            // Remove from local state
            goals.removeAll { $0.id == goal.id }
        } catch {
            errorMessage = "Failed to delete goal: \(error.localizedDescription)"
        }
    }

    func refresh() async {
        await loadGoals()
    }

    // MARK: - Computed Properties

    var activeGoals: [Goal] {
        goals.filter { $0.isActive }
    }

    var completedGoals: [Goal] {
        goals.filter { $0.completed }
    }

    var overdueGoals: [Goal] {
        goals.filter { $0.isOverdue }
    }

    var hasGoals: Bool {
        !goals.isEmpty
    }
}
