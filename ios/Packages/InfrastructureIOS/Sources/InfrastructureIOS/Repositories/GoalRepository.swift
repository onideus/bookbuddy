import CoreDomain
import Foundation

/// Implementation of GoalRepositoryProtocol using REST API
public final class GoalRepository: GoalRepositoryProtocol {
    private let networkClient: NetworkClientProtocol

    public init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - GoalRepositoryProtocol

    public func findById(_ id: String) async throws -> Goal? {
        // API doesn't have a single goal endpoint, so get all and filter
        let goals = try await findAll()
        return goals.first { $0.id == id }
    }

    public func findByUserId(_ userId: String) async throws -> [Goal] {
        return try await findAll()
    }

    public func findAll() async throws -> [Goal] {
        let endpoint = APIEndpoint.getGoals()
        let response: GetGoalsResponse = try await networkClient.request(endpoint)

        return response.goals.map { $0.toDomain() }
    }

    public func save(_ goal: Goal) async throws -> Goal {
        // Determine if this is a new goal or an update
        if let existing = try? await findById(goal.id) {
            // Update existing goal
            let request = UpdateGoalRequest(
                title: goal.title,
                description: goal.description,
                targetBooks: goal.targetBooks,
                startDate: goal.startDate,
                endDate: goal.endDate
            )
            let endpoint = try APIEndpoint.updateGoal(id: goal.id, request)
            let response: UpdateGoalResponse = try await networkClient.request(endpoint)
            return response.goal.toDomain()
        } else {
            // Create new goal
            let request = CreateGoalRequest(
                title: goal.title,
                description: goal.description,
                targetBooks: goal.targetBooks,
                startDate: goal.startDate,
                endDate: goal.endDate
            )
            let endpoint = try APIEndpoint.createGoal(request)
            let response: CreateGoalResponse = try await networkClient.request(endpoint)
            return response.goal.toDomain()
        }
    }

    public func update(_ goal: Goal) async throws -> Goal {
        let request = UpdateGoalRequest(
            title: goal.title,
            description: goal.description,
            targetBooks: goal.targetBooks,
            startDate: goal.startDate,
            endDate: goal.endDate
        )
        let endpoint = try APIEndpoint.updateGoal(id: goal.id, request)
        let response: UpdateGoalResponse = try await networkClient.request(endpoint)
        return response.goal.toDomain()
    }

    public func delete(_ id: String) async throws {
        let endpoint = APIEndpoint.deleteGoal(id: id)
        try await networkClient.request(endpoint)
    }

    public func findActiveGoals(userId: String) async throws -> [Goal] {
        let allGoals = try await findByUserId(userId)
        return allGoals.filter { !$0.isComplete && $0.endDate >= Date() }
    }
}
