//
//  MockUserRepository.swift
//  ApplicationTests
//
//  Mock implementation of UserRepositoryProtocol for testing
//

import Foundation
@testable import CoreDomain

final class MockUserRepository: UserRepositoryProtocol, @unchecked Sendable {
    
    // MARK: - Mock Data
    
    private var users: [String: User] = [:]
    private var usersByEmail: [String: User] = [:]
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnCreate = false
    var shouldReturnNilOnFindById = false
    var shouldReturnNilOnFindByEmail = false
    
    var createError: Error?
    var findByEmailError: Error?
    var findByIdError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var createCallCount = 0
    private(set) var findByEmailCallCount = 0
    private(set) var findByIdCallCount = 0
    
    private(set) var lastCreatedUser: User?
    private(set) var lastQueriedEmail: String?
    private(set) var lastQueriedId: String?
    
    // MARK: - Setup Methods
    
    func reset() {
        users.removeAll()
        usersByEmail.removeAll()
        
        shouldThrowOnCreate = false
        shouldReturnNilOnFindById = false
        shouldReturnNilOnFindByEmail = false
        
        createError = nil
        findByEmailError = nil
        findByIdError = nil
        
        createCallCount = 0
        findByEmailCallCount = 0
        findByIdCallCount = 0
        
        lastCreatedUser = nil
        lastQueriedEmail = nil
        lastQueriedId = nil
    }
    
    func addUser(_ user: User) {
        users[user.id] = user
        usersByEmail[user.email] = user
    }
    
    func addUsers(_ usersToAdd: [User]) {
        for user in usersToAdd {
            addUser(user)
        }
    }
    
    // MARK: - UserRepositoryProtocol Implementation
    
    func create(_ user: User) async throws -> User {
        createCallCount += 1
        lastCreatedUser = user
        
        if shouldThrowOnCreate {
            if let error = createError {
                throw error
            }
            throw DomainError.duplicate("User with this email already exists")
        }
        
        // Check for duplicate email
        if usersByEmail[user.email] != nil {
            throw DomainError.duplicate("User with this email already exists")
        }
        
        addUser(user)
        return user
    }
    
    func findByEmail(_ email: String) async throws -> User? {
        findByEmailCallCount += 1
        lastQueriedEmail = email
        
        if let error = findByEmailError {
            throw error
        }
        
        if shouldReturnNilOnFindByEmail {
            return nil
        }
        
        return usersByEmail[email.lowercased()]
    }
    
    func findById(_ id: String) async throws -> User? {
        findByIdCallCount += 1
        lastQueriedId = id

        if let error = findByIdError {
            throw error
        }

        if shouldReturnNilOnFindById {
            return nil
        }

        return users[id]
    }

    func update(_ id: String, updates: UserUpdate) async throws -> User? {
        guard let existingUser = users[id] else {
            return nil
        }

        let updatedUser = User(
            id: existingUser.id,
            email: updates.email ?? existingUser.email,
            password: updates.password ?? existingUser.password,
            name: updates.name ?? existingUser.name,
            createdAt: existingUser.createdAt
        )

        // Update both dictionaries
        users[id] = updatedUser
        usersByEmail.removeValue(forKey: existingUser.email)
        usersByEmail[updatedUser.email] = updatedUser

        return updatedUser
    }

    func delete(_ id: String) async throws -> Bool {
        guard let user = users[id] else {
            return false
        }

        users.removeValue(forKey: id)
        usersByEmail.removeValue(forKey: user.email)
        return true
    }
}