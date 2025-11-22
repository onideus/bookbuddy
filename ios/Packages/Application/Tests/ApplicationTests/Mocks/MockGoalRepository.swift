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
    private var userGoals: [String: [Goal]] = [:]
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnCreate = false
    var shouldThrowOnUpdate = false
    var shouldThrowOnDelete = false
    var shouldReturnNilOnUpdate = false
    var shouldReturnFalseOnDelete = false
    
    var createError: Error?
    var updateError: Error?
    var deleteError: Error?
    var findByIdError: Error?
    var findByUserIdError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var createCallCount = 0
    private(set) var updateCallCount = 0
    private(set) var deleteCallCount = 0
    private(set) var findByIdCallCount = 0
    private(set) var findByUserIdCallCount = 0
    
    private(set) var lastCreatedGoal: Goal?
    private(set) var lastUpdatedGoalId: String?
    private(set) var lastUpdatedGoalUpdates: [String: Any]?
    private(set) var lastDeletedGoalId: String?
    private(set) var lastQueriedUserId: String?
    private(set) var lastQueriedGoalId: String?
    
    // MARK: - Setup Methods
    
    func reset() {
        goals.removeAll()
        userGoals.removeAll()
        
        shouldThrowOnCreate = false
        shouldThrowOnUpdate = false
        shouldThrowOnDelete = false
        shouldReturnNilOnUpdate = false
        shouldReturnFalseOnDelete = false
        
        createError = nil
        updateError = nil
        deleteError = nil
        findByIdError = nil
        findByUserIdError = nil
        
        createCallCount = 0
        updateCallCount = 0
        deleteCallCount = 0
        findByIdCallCount = 0
        findByUserIdCallCount = 0
        
        lastCreatedGoal = nil
        lastUpdatedGoalId = nil
        lastUpdatedGoalUpdates = nil
        lastDeletedGoalId = nil
        lastQueriedUserId = nil
        lastQueriedGoalId = nil
    }
    
    func addGoal(_ goal: Goal) {
        goals[goal.id] = goal
        if userGoals[goal.userId] == nil {
            userGoals[goal.userId] = []
        }
        userGoals[goal.userId]?.append(goal)
    }
    
    func addGoals(_ goalsToAdd: [Goal]) {
        for goal in goalsToAdd {
            addGoal(goal)
        }
    }
    
    // MARK: - GoalRepositoryProtocol Implementation
    
    func create(_ goal: Goal) async throws -> Goal {
        createCallCount += 1
        lastCreatedGoal = goal
        
        if shouldThrowOnCreate {
            if let error = createError {
                throw error
            }
            throw DomainError.duplicate("Goal with this title already exists")
        }
        
        addGoal(goal)
        return goal
    }
    
    func findByUserId(_ userId: String) async throws -> [Goal] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        return userGoals[userId] ?? []
    }
    
    func findById(_ id: String) async throws -> Goal? {
        findByIdCallCount += 1
        lastQueriedGoalId = id
        
        if let error = findByIdError {
            throw error
        }
        
        return goals[id]
    }
    
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Goal] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        let allGoals = userGoals[userId] ?? []
        let startIndex = min(offset, allGoals.count)
        let endIndex = limit.map { min(startIndex + $0, allGoals.count) } ?? allGoals.count
        
        return Array(allGoals[startIndex..<endIndex])
    }
    
    func findActiveByUserId(_ userId: String) async throws -> [Goal] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        return userGoals[userId]?.filter { !$0.completed } ?? []
    }
    
    func exists(userId: String, goalId: String) async throws -> Bool {
        let userGoalsArray = userGoals[userId] ?? []
        return userGoalsArray.contains { $0.id == goalId }
    }
    
    func update(_ id: String, updates: GoalUpdate) async throws -> Goal? {
        updateCallCount += 1
        lastUpdatedGoalId = id
        
        // Convert updates to dictionary for tracking
        var updatesDict: [String: Any] = [:]
        if let title = updates.title { updatesDict["title"] = title }
        if let description = updates.description { updatesDict["description"] = description }
        if let targetBooks = updates.targetBooks { updatesDict["targetBooks"] = targetBooks }
        if let currentBooks = updates.currentBooks { updatesDict["currentBooks"] = currentBooks }
        if let endDate = updates.endDate { updatesDict["endDate"] = endDate }
        if let completed = updates.completed { updatesDict["completed"] = completed }
        lastUpdatedGoalUpdates = updatesDict
        
        if shouldThrowOnUpdate {
            if let error = updateError {
                throw error
            }
            throw DomainError.notFound("Goal not found")
        }
        
        if shouldReturnNilOnUpdate {
            return nil
        }
        
        guard var goal = goals[id] else {
            return nil
        }
        
        // Apply updates
        goal = Goal(
            id: goal.id,
            userId: goal.userId,
            title: updates.title ?? goal.title,
            description: updates.description ?? goal.description,
            targetBooks: updates.targetBooks ?? goal.targetBooks,
            currentBooks: updates.currentBooks ?? goal.currentBooks,
            startDate: goal.startDate,
            endDate: updates.endDate ?? goal.endDate,
            completed: updates.completed ?? goal.completed
        )
        
        // Update storage
        goals[id] = goal
        if let userGoalsArray = userGoals[goal.userId] {
            userGoals[goal.userId] = userGoalsArray.map { $0.id == id ? goal : $0 }
        }
        
        return goal
    }
    
    func delete(_ id: String) async throws -> Bool {
        deleteCallCount += 1
        lastDeletedGoalId = id
        
        if shouldThrowOnDelete {
            if let error = deleteError {
                throw error
            }
            throw DomainError.notFound("Goal not found")
        }
        
        if shouldReturnFalseOnDelete {
            return false
        }
        
        guard let goal = goals[id] else {
            return false
        }
        
        goals.removeValue(forKey: id)
        if let userGoalsArray = userGoals[goal.userId] {
            userGoals[goal.userId] = userGoalsArray.filter { $0.id != id }
        }
        
        return true
    }
}
