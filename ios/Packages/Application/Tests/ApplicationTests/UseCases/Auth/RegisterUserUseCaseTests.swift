//
//  RegisterUserUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for RegisterUserUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class RegisterUserUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: RegisterUserUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockUserRepository: MockUserRepository!
    private var mockPasswordHasher: MockPasswordHasher!
    
    // MARK: - Test Data
    
    private let validEmail = "test@example.com"
    private let validPassword = "validPassword123"
    private let validName = "Test User"
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockUserRepository = MockUserRepository()
        mockPasswordHasher = MockPasswordHasher()
        
        sut = RegisterUserUseCase(
            userRepository: mockUserRepository,
            passwordHasher: mockPasswordHasher
        )
        
        // Reset all mocks
        mockUserRepository.reset()
        mockPasswordHasher.reset()
    }
    
    override func tearDownWithError() throws {
        sut = nil
        mockUserRepository = nil
        mockPasswordHasher = nil
        
        try super.tearDownWithError()
    }
    
    // MARK: - Success Path Tests
    
    func testExecute_WithValidInput_CreatesUserSuccessfully() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: validName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.email, validEmail.lowercased())
        XCTAssertEqual(result.name, validName)
        XCTAssertTrue(result.password.hasPrefix("hashed_"))
        XCTAssertEqual(mockUserRepository.createCallCount, 1)
        XCTAssertEqual(mockUserRepository.findByEmailCallCount, 1)
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 1)
        XCTAssertEqual(mockPasswordHasher.lastHashedPassword, validPassword)
    }
    
    func testExecute_WithUppercaseEmail_NormalizesEmailToLowercase() async throws {
        // Arrange
        let uppercaseEmail = "TEST@EXAMPLE.COM"
        let input = RegisterUserInput(
            email: uppercaseEmail,
            password: validPassword,
            name: validName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.email, uppercaseEmail.lowercased())
        XCTAssertEqual(mockUserRepository.lastQueriedEmail, uppercaseEmail.lowercased())
    }
    
    func testExecute_WithMixedCaseEmail_NormalizesEmailToLowercase() async throws {
        // Arrange
        let mixedCaseEmail = "Test.User@ExAmPlE.cOm"
        let input = RegisterUserInput(
            email: mixedCaseEmail,
            password: validPassword,
            name: validName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.email, mixedCaseEmail.lowercased())
    }
    
    // MARK: - Validation Error Path Tests
    
    func testExecute_WithEmptyEmail_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: "",
            password: validPassword,
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.validation("Email is required")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockUserRepository.findByEmailCallCount, 0)
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 0)
        XCTAssertEqual(mockUserRepository.createCallCount, 0)
    }
    
    func testExecute_WithWhitespaceOnlyEmail_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: "   \t\n   ",
            password: validPassword,
            name: validName
        )
        
        // Act & Assert
        // Note: The whitespace-only email is trimmed and becomes empty, so it throws "Email is required"
        await assertThrowsSpecificError(
            DomainError.validation("Email is required")
        ) {
            try await self.sut.execute(input)
        }
    }

    func testExecute_WithEmptyPassword_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: "",
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.validation("Password is required")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 0)
    }
    
    func testExecute_WithShortPassword_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: "12345", // 5 characters, less than required 6
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.validation("Password must be at least 6 characters")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithExactly6CharacterPassword_Succeeds() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: "123456", // Exactly 6 characters
            name: validName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertNotNil(result)
        XCTAssertEqual(mockPasswordHasher.lastHashedPassword, "123456")
    }
    
    func testExecute_WithEmptyName_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: ""
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.validation("Name is required")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithWhitespaceOnlyName_ThrowsValidationError() async throws {
        // Arrange
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: "   \t\n   "
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.validation("Name is required")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Duplicate Email Error Path Tests
    
    func testExecute_WithExistingEmail_ThrowsDuplicateEntryError() async throws {
        // Arrange
        let existingUser = createTestUser()
        mockUserRepository.addUser(existingUser)
        
        let input = RegisterUserInput(
            email: validEmail, // Same email as existing user
            password: validPassword,
            name: "Different Name"
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.duplicateEntry("User", field: "email")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockUserRepository.findByEmailCallCount, 1)
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 0) // Should not hash if email exists
        XCTAssertEqual(mockUserRepository.createCallCount, 0)
    }
    
    func testExecute_WithExistingEmailDifferentCase_ThrowsDuplicateEntryError() async throws {
        // Arrange
        let existingUser = createTestUser()
        mockUserRepository.addUser(existingUser)
        
        let input = RegisterUserInput(
            email: validEmail.uppercased(), // Same email but different case
            password: validPassword,
            name: "Different Name"
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.duplicateEntry("User", field: "email")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Repository Error Path Tests
    
    func testExecute_WithRepositoryFindByEmailError_PropagatesError() async throws {
        // Arrange
        mockUserRepository.findByEmailError = DomainError.general("Database connection failed")
        
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Database connection failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 0) // Should not proceed to hashing
    }
    
    func testExecute_WithPasswordHashingError_PropagatesError() async throws {
        // Arrange
        mockPasswordHasher.shouldThrowOnHash = true
        mockPasswordHasher.hashError = DomainError.general("Password hashing failed")
        
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Password hashing failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockPasswordHasher.hashCallCount, 1)
        XCTAssertEqual(mockUserRepository.createCallCount, 0) // Should not proceed to creation
    }
    
    func testExecute_WithRepositoryCreateError_PropagatesError() async throws {
        // Arrange
        mockUserRepository.shouldThrowOnCreate = true
        mockUserRepository.createError = DomainError.general("User creation failed")
        
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: validName
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("User creation failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockUserRepository.createCallCount, 1)
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithSpecialCharactersInName_CreatesUserSuccessfully() async throws {
        // Arrange
        let specialName = "José María O'Connor-Smith 🚀"
        let input = RegisterUserInput(
            email: validEmail,
            password: validPassword,
            name: specialName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.name, specialName)
    }
    
    func testExecute_WithVeryLongValidInputs_CreatesUserSuccessfully() async throws {
        // Arrange
        let longEmail = "very.long.email.address.that.is.still.valid@example.com"
        let longPassword = String(repeating: "a", count: 100)
        let longName = String(repeating: "Name ", count: 50)
        
        let input = RegisterUserInput(
            email: longEmail,
            password: longPassword,
            name: longName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.email, longEmail)
        // Name is trimmed by User.create()
        XCTAssertEqual(result.name, longName.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    func testExecute_WithEmailContainingPlusSign_CreatesUserSuccessfully() async throws {
        // Arrange
        let emailWithPlus = "test+tag@example.com"
        let input = RegisterUserInput(
            email: emailWithPlus,
            password: validPassword,
            name: validName
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.email, emailWithPlus)
    }
    
    // MARK: - Helper Methods
    
    private func createTestUser() -> User {
        return User(
            id: "test-id",
            email: validEmail.lowercased(),
            password: "hashed_password",
            name: "Existing User",
            createdAt: Date()
        )
    }
    
    private func assertThrowsSpecificError<T>(
        _ expectedError: DomainError,
        _ expression: () async throws -> T,
        file: StaticString = #filePath,
        line: UInt = #line
    ) async {
        do {
            _ = try await expression()
            XCTFail("Expected to throw \(expectedError), but no error was thrown", file: file, line: line)
        } catch let thrownError as DomainError {
            XCTAssertEqual(thrownError, expectedError, file: file, line: line)
        } catch {
            XCTFail("Expected to throw \(expectedError), but threw \(error)", file: file, line: line)
        }
    }
}