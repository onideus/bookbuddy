//
//  UserTests.swift
//  CoreDomainTests
//
//  Regression tests for User entity verifying TypeScript defaults
//

import XCTest
@testable import CoreDomain

final class UserTests: XCTestCase {
    
    // MARK: - Test Data
    
    private let testEmail = "john.doe@example.com"
    private let testPassword = "hashedPassword123"
    private let testName = "John Doe"
    
    // MARK: - User.create() Regression Tests
    
    func testUserCreateDefaultValues() {
        // Test User.create() matches TypeScript defaults exactly
        let user = try! User.create(
            email: testEmail,
            password: testPassword,
            name: testName
        )
        
        // Verify ID is generated (UUID format)
        XCTAssertFalse(user.id.isEmpty, "User ID should be generated")
        XCTAssertTrue(UUID(uuidString: user.id) != nil, "User ID should be valid UUID")
        
        // Verify required fields
        XCTAssertEqual(user.email, testEmail.lowercased(), "Email should be lowercased")
        XCTAssertEqual(user.password, testPassword)
        XCTAssertEqual(user.name, testName)
        
        // Verify createdAt is set to current time (within reasonable range)
        let now = Date()
        let timeDifference = abs(user.createdAt.timeIntervalSince(now))
        XCTAssertLessThan(timeDifference, 1.0, "createdAt should be set to current time")
    }
    
    func testUserCreateEmailNormalization() {
        // Test email normalization behavior matches TypeScript
        let mixedCaseEmail = "John.DOE@EXAMPLE.COM"
        let user = try! User.create(
            email: mixedCaseEmail,
            password: testPassword,
            name: testName
        )
        
        XCTAssertEqual(user.email, "john.doe@example.com", "Email should be normalized to lowercase")
    }
    
    func testUserCreateNameTrimming() {
        // Test name trimming behavior matches TypeScript
        let user = try! User.create(
            email: testEmail,
            password: testPassword,
            name: "  \t John Doe \n  "
        )
        
        XCTAssertEqual(user.name, "John Doe", "Name should be trimmed")
    }
    
    // MARK: - Validation Tests
    
    func testUserCreateEmailValidation() {
        // Test email validation errors match TypeScript behavior
        
        let invalidEmails = [
            "",                    // Empty
            "invalid",            // No @ symbol
            "invalid@",           // No domain
            "@invalid.com",       // No local part
            "invalid@com",        // No TLD
            "invalid.email",      // No @ symbol
            "user@domain.",       // TLD missing
            "user name@domain.com" // Space in local part
        ]
        
        for invalidEmail in invalidEmails {
            XCTAssertThrowsError(try User.create(
                email: invalidEmail,
                password: testPassword,
                name: testName
            ), "Should throw error for invalid email: \(invalidEmail)") { error in
                XCTAssertTrue(error is DomainError)
                if case .validation(let message) = error as! DomainError {
                    XCTAssertEqual(message, "Invalid email format")
                }
            }
        }
    }
    
    func testUserCreateValidEmails() {
        // Test valid email formats
        let validEmails = [
            "user@domain.com",
            "user.name@domain.com",
            "user+tag@domain.com",
            "user123@domain123.com",
            "user@subdomain.domain.com",
            "a@b.co",
            "test@domain-name.com",
            "user_name@domain.com"
        ]
        
        for validEmail in validEmails {
            XCTAssertNoThrow(try User.create(
                email: validEmail,
                password: testPassword,
                name: testName
            ), "Should not throw error for valid email: \(validEmail)")
        }
    }
    
    func testUserCreateNameValidation() {
        // Test name validation errors
        
        // Empty name
        XCTAssertThrowsError(try User.create(
            email: testEmail,
            password: testPassword,
            name: ""
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Name cannot be empty")
            }
        }
        
        // Whitespace-only name
        XCTAssertThrowsError(try User.create(
            email: testEmail,
            password: testPassword,
            name: "   \t\n   "
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Name cannot be empty")
            }
        }
    }
    
    // MARK: - Static Validation Method Tests
    
    func testEmailValidationStaticMethod() {
        // Test User.isValidEmail() method matches TypeScript behavior
        
        // Valid emails
        XCTAssertTrue(User.isValidEmail("user@domain.com"))
        XCTAssertTrue(User.isValidEmail("user.name@domain.com"))
        XCTAssertTrue(User.isValidEmail("user+tag@domain.com"))
        XCTAssertTrue(User.isValidEmail("user123@domain.com"))
        XCTAssertTrue(User.isValidEmail("user@subdomain.domain.com"))
        
        // Invalid emails
        XCTAssertFalse(User.isValidEmail(""))
        XCTAssertFalse(User.isValidEmail("invalid"))
        XCTAssertFalse(User.isValidEmail("invalid@"))
        XCTAssertFalse(User.isValidEmail("@invalid.com"))
        XCTAssertFalse(User.isValidEmail("invalid@.com"))
        XCTAssertFalse(User.isValidEmail("invalid@com"))
    }
    
    func testPasswordValidationStaticMethod() {
        // Test User.isValidPassword() method matches TypeScript behavior
        
        // Valid passwords (8+ characters)
        XCTAssertTrue(User.isValidPassword("password123"))
        XCTAssertTrue(User.isValidPassword("12345678"))
        XCTAssertTrue(User.isValidPassword("a".repeated(8)))
        XCTAssertTrue(User.isValidPassword("Complex!Password123"))
        
        // Invalid passwords (< 8 characters)
        XCTAssertFalse(User.isValidPassword(""))
        XCTAssertFalse(User.isValidPassword("1234567"))
        XCTAssertFalse(User.isValidPassword("short"))
        XCTAssertFalse(User.isValidPassword("a".repeated(7)))
    }
    
    // MARK: - Equatable and Hashable Tests
    
    func testUserEquatable() {
        // Test User equality comparison
        let user1 = try! User.create(
            email: testEmail,
            password: testPassword,
            name: testName
        )
        
        let user2 = User(
            id: user1.id,
            email: user1.email,
            password: user1.password,
            name: user1.name,
            createdAt: user1.createdAt
        )
        
        let user3 = try! User.create(
            email: "different@email.com",
            password: testPassword,
            name: testName
        )
        
        XCTAssertEqual(user1, user2, "Users with same properties should be equal")
        XCTAssertNotEqual(user1, user3, "Users with different properties should not be equal")
    }
    
    func testUserHashable() {
        // Test User hash consistency
        let user1 = try! User.create(
            email: testEmail,
            password: testPassword,
            name: testName
        )
        
        let user2 = User(
            id: user1.id,
            email: user1.email,
            password: user1.password,
            name: user1.name,
            createdAt: user1.createdAt
        )
        
        XCTAssertEqual(user1.hashValue, user2.hashValue, "Equal users should have same hash")
        
        // Test in Set
        let userSet: Set<User> = [user1, user2]
        XCTAssertEqual(userSet.count, 1, "Set should contain only one user (duplicates removed)")
    }
    
    // MARK: - Codable Tests
    
    func testUserCodable() {
        // Test User encoding/decoding
        let user = try! User.create(
            email: testEmail,
            password: testPassword,
            name: testName
        )
        
        // Encode
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encodedData = try! encoder.encode(user)
        
        // Decode
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decodedUser = try! decoder.decode(User.self, from: encodedData)
        
        // Compare individual fields (dates may have precision differences)
        XCTAssertEqual(user.id, decodedUser.id)
        XCTAssertEqual(user.email, decodedUser.email)
        XCTAssertEqual(user.password, decodedUser.password)
        XCTAssertEqual(user.name, decodedUser.name)
        XCTAssertEqual(user.createdAt.timeIntervalSince1970, decodedUser.createdAt.timeIntervalSince1970, accuracy: 1.0)
    }
    
    // MARK: - Sendable Conformance Tests
    
    func testUserSendable() {
        // Test that User can be safely passed between concurrent contexts
        let user = try! User.create(
            email: testEmail,
            password: testPassword,
            name: testName
        )
        
        let expectation = XCTestExpectation(description: "User should be sendable")
        
        Task {
            // User should be safely accessible in async context
            XCTAssertEqual(user.email, testEmail.lowercased())
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
}

// MARK: - Helper Extensions

private extension String {
    func repeated(_ count: Int) -> String {
        String(repeating: self, count: count)
    }
}