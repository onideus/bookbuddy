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
        let goals = try await findByUserId("")
        return goals.first { $0.id == id }
    }

    public func findByUserId(_ userId: String) async throws -> [Goal] {
        let endpoint = APIEndpoint.getGoals()
        let response: GetGoalsResponse = try await networkClient.request(endpoint)
        return response.goals.map { $0.toDomain() }
    }
    
    public func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Goal] {
        // For now, get all goals and apply pagination in memory
        // TODO: Update API to support pagination query parameters
        let allGoals = try await findByUserId(userId)
        let startIndex = min(offset, allGoals.count)
        let endIndex = limit.map { min(startIndex + $0, allGoals.count) } ?? allGoals.count
        return Array(allGoals[startIndex..<endIndex])
    }

    public func create(_ goal: Goal) async throws -> Goal {
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

    public func update(_ id: String, updates: GoalUpdate) async throws -> Goal? {
        // Build request from updates
        let request = UpdateGoalRequest(
            title: updates.title,
            description: updates.description,
            targetBooks: updates.targetBooks,
            startDate: nil,
            endDate: updates.endDate
        )
        let endpoint = try APIEndpoint.updateGoal(id: id, request)
        let response: UpdateGoalResponse = try await networkClient.request(endpoint)
        return response.goal.toDomain()
    }

    public func delete(_ id: String) async throws -> Bool {
        let endpoint = APIEndpoint.deleteGoal(id: id)
        let _: DeleteGoalResponse = try await networkClient.request(endpoint)
        return true
    }

    public func findActiveByUserId(_ userId: String) async throws -> [Goal] {
        let allGoals = try await findByUserId(userId)
        return allGoals.filter { !$0.completed && $0.endDate >= Date() }
    }
    
    public func exists(userId: String, goalId: String) async throws -> Bool {
        let userGoals = try await findByUserId(userId)
        return userGoals.contains { $0.id == goalId }
    }
}
