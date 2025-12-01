//
//  MockGoalRepository.swift
//  ApplicationTests
//
//  Mock implementation of GoalRepositoryProtocol for testing
//

import Foundation
@testable import CoreDomain

final class MockGoalRepository: GoalRepositoryProtocol, @unchecked Sendable {
    
    // MARK: - Mock Data
    
    private var goals: [String: Goal] = [:]
    private var goalsByUserId: [String: [Goal]] = [:]
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnCreate = false
    var shouldThrowOnUpdate = false
    var shouldThrowOnDelete = false
    var shouldReturnNilOnFindById = false
    var shouldReturnNilOnUpdate = false
    
    var createError: Error?
    var updateError: Error?
    var deleteError: Error?
    var findByIdError: Error?
    var findByUserIdError: Error?
    var existsError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var createCallCount = 0
    private(set) var updateCallCount = 0
    private(set) var deleteCallCount = 0
    private(set) var findByIdCallCount = 0
    private(set) var findByUserIdCallCount = 0
    private(set) var findActiveByUserIdCallCount = 0
    private(set) var existsCallCount = 0
    
    private(set) var lastCreatedGoal: Goal?
    private(set) var lastUpdatedGoalId: String?
    private(set) var lastUpdatedGoalUpdates: GoalUpdate?
    private(set) var lastDeletedGoalId: String?
    private(set) var lastQueriedId: String?
    private(set) var lastQueriedUserId: String?
    
    // MARK: - Setup Methods
    
    func reset() {
        goals.removeAll()
        goalsByUserId.removeAll()
        
        shouldThrowOnCreate = false
        shouldThrowOnUpdate = false
        shouldThrowOnDelete = false
        shouldReturnNilOnFindById = false
        shouldReturnNilOnUpdate = false
        
        createError = nil
        updateError = nil
        deleteError = nil
        findByIdError = nil
        findByUserIdError = nil
        existsError = nil
        
        createCallCount = 0
        updateCallCount = 0
        deleteCallCount = 0
        findByIdCallCount = 0
        findByUserIdCallCount = 0
        findActiveByUserIdCallCount = 0
        existsCallCount = 0
        
        lastCreatedGoal = nil
        lastUpdatedGoalId = nil
        lastUpdatedGoalUpdates = nil
        lastDeletedGoalId = nil
        lastQueriedId = nil
        lastQueriedUserId = nil
    }
    
    func addGoal(_ goal: Goal) {
        goals[goal.id] = goal
        if goalsByUserId[goal.userId] == nil {
            goalsByUserId[goal.userId] = []
        }
        goalsByUserId[goal.userId]?.append(goal)
    }
    
    func addGoals(_ goalsToAdd: [Goal]) {
        for goal in goalsToAdd {
            addGoal(goal)
        }
    }
    
    // MARK: - GoalRepositoryProtocol Implementation
    
    func findById(_ id: String) async throws -> Goal? {
        findByIdCallCount += 1
        lastQueriedId = id
        
        if let error = findByIdError {
            throw error
        }
        
        if shouldReturnNilOnFindById {
            return nil
        }
        
        return goals[id]
    }
    
    func findByUserId(_ userId: String) async throws -> [Goal] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        return goalsByUserId[userId] ?? []
    }
    
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Goal] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        let allGoals = goalsByUserId[userId] ?? []
        let actualLimit = limit ?? allGoals.count
        let endIndex = min(offset + actualLimit, allGoals.count)
        
        if offset >= allGoals.count {
            return []
        }
        
        return Array(allGoals[offset..<endIndex])
    }
    
    func findActiveByUserId(_ userId: String) async throws -> [Goal] {
        findActiveByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        let userGoals = goalsByUserId[userId] ?? []
        let now = Date()
        return userGoals.filter { !$0.completed && $0.endDate > now }
    }
    
    func create(_ goal: Goal) async throws -> Goal {
        createCallCount += 1
        lastCreatedGoal = goal
        
        if shouldThrowOnCreate {
            if let error = createError {
                throw error
            }
            throw DomainError.duplicate("Goal already exists")
        }
        
        addGoal(goal)
        return goal
    }
    
    func update(_ id: String, updates: GoalUpdate) async throws -> Goal? {
        updateCallCount += 1
        lastUpdatedGoalId = id
        lastUpdatedGoalUpdates = updates
        
        if let error = updateError {
            throw error
        }
        
        if shouldThrowOnUpdate {
            throw DomainError.general("Update failed")
        }
        
        if shouldReturnNilOnUpdate {
            return nil
        }
        
        guard let existingGoal = goals[id] else {
            return nil
        }
        
        let updatedGoal = Goal(
            id: existingGoal.id,
            userId: existingGoal.userId,
            title: updates.title ?? existingGoal.title,
            description: updates.description ?? existingGoal.description,
            targetBooks: updates.targetBooks ?? existingGoal.targetBooks,
            currentBooks: updates.currentBooks ?? existingGoal.currentBooks,
            startDate: existingGoal.startDate,
            endDate: updates.endDate ?? existingGoal.endDate,
            completed: updates.completed ?? existingGoal.completed
        )
        
        goals[id] = updatedGoal
        
        // Update in userId dictionary
        if var userGoals = goalsByUserId[existingGoal.userId],
           let index = userGoals.firstIndex(where: { $0.id == id }) {
            userGoals[index] = updatedGoal
            goalsByUserId[existingGoal.userId] = userGoals
        }
        
        return updatedGoal
    }
    
    func delete(_ id: String) async throws -> Bool {
        deleteCallCount += 1
        lastDeletedGoalId = id
        
        if let error = deleteError {
            throw error
        }
        
        if shouldThrowOnDelete {
            throw DomainError.general("Delete failed")
        }
        
        guard let goal = goals[id] else {
            return false
        }
        
        goals.removeValue(forKey: id)
        goalsByUserId[goal.userId]?.removeAll { $0.id == id }
        
        return true
    }
    
    func exists(userId: String, goalId: String) async throws -> Bool {
        existsCallCount += 1
        
        if let error = existsError {
            throw error
        }
        
        let userGoals = goalsByUserId[userId] ?? []
        return userGoals.contains { $0.id == goalId }
    }
}
