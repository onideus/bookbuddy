//
//  MockPasswordHasher.swift
//  ApplicationTests
//
//  Mock implementation of PasswordHasherProtocol for testing
//

import Foundation
@testable import CoreDomain

final class MockPasswordHasher: PasswordHasherProtocol, @unchecked Sendable {
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnHash = false
    var shouldThrowOnVerify = false
    var shouldReturnFalseOnVerify = false
    
    var hashError: Error?
    var verifyError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var hashCallCount = 0
    private(set) var verifyCallCount = 0
    
    private(set) var lastHashedPassword: String?
    private(set) var lastVerifyPassword: String?
    private(set) var lastVerifyHash: String?
    
    // MARK: - Mock Data
    
    private var hashedPasswords: [String: String] = [:]
    
    // MARK: - Setup Methods
    
    func reset() {
        shouldThrowOnHash = false
        shouldThrowOnVerify = false
        shouldReturnFalseOnVerify = false
        
        hashError = nil
        verifyError = nil
        
        hashCallCount = 0
        verifyCallCount = 0
        
        lastHashedPassword = nil
        lastVerifyPassword = nil
        lastVerifyHash = nil
        
        hashedPasswords.removeAll()
    }
    
    func setPrehashedPassword(_ password: String, hash: String) {
        hashedPasswords[password] = hash
    }
    
    // MARK: - PasswordHasherProtocol Implementation
    
    func hash(_ password: String) async throws -> String {
        hashCallCount += 1
        lastHashedPassword = password
        
        if shouldThrowOnHash {
            if let error = hashError {
                throw error
            }
            throw DomainError.general("Failed to hash password")
        }
        
        // Return a deterministic "hash" for testing
        let hash = "hashed_" + password
        hashedPasswords[password] = hash
        return hash
    }
    
    func compare(_ password: String, hash: String) async throws -> Bool {
        verifyCallCount += 1
        lastVerifyPassword = password
        lastVerifyHash = hash
        
        if shouldThrowOnVerify {
            if let error = verifyError {
                throw error
            }
            throw DomainError.general("Failed to verify password")
        }
        
        if shouldReturnFalseOnVerify {
            return false
        }
        
        // Check if the hash matches our expected format
        if hash.hasPrefix("hashed_") {
            let expectedPassword = String(hash.dropFirst(7)) // Remove "hashed_" prefix
            return expectedPassword == password
        }
        
        // Check against pre-set hashed passwords
        return hashedPasswords[password] == hash
    }
}