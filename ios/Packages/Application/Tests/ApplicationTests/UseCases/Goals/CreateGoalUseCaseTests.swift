//
//  CreateGoalUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for CreateGoalUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class CreateGoalUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: CreateGoalUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockGoalRepository: MockGoalRepository!
    
    // MARK: - Test Data
    
    private let testUserId = "test-user-id"
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockGoalRepository = MockGoalRepository()
        
        sut = CreateGoalUseCase(
            goalRepository: mockGoalRepository
        )
        
        // Reset all mocks
        mockGoalRepository.reset()
    }
    
    override func tearDownWithError() throws {
        sut = nil
        mockGoalRepository = nil
        
        try super.tearDownWithError()
    }
    
    // MARK: - Success Path Tests
    
    func testExecute_WithValidInput_CreatesGoalSuccessfully() async throws {
        // Arrange
        let input = createValidInput()
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.userId, testUserId)
        XCTAssertEqual(result.title, "Read 12 Books This Year")
        XCTAssertEqual(result.description, "My annual reading goal")
        XCTAssertEqual(result.targetBooks, 12)
        XCTAssertFalse(result.completed)
        XCTAssertEqual(result.currentBooks, 0)
        XCTAssertEqual(mockGoalRepository.createCallCount, 1)
        XCTAssertNotNil(mockGoalRepository.lastCreatedGoal)
    }
    
    func testExecute_WithoutDescription_CreatesGoalSuccessfully() async throws {
        // Arrange
        let input = CreateGoalInput(
            userId: testUserId,
            title: "Summer Reading Challenge",
            description: nil,
            targetBooks: 5,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .month, value: 3, to: Date())!
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.title, "Summer Reading Challenge")
        XCTAssertNil(result.description)
        XCTAssertEqual(result.targetBooks, 5)
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithEmptyTitle_ThrowsValidationError() async throws {
        // Arrange
        let input = CreateGoalInput(
            userId: testUserId,
            title: "",
            description: "Test description",
            targetBooks: 10,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: Date())!
        )
        
        // Act & Assert
        do {
            _ = try await sut.execute(input)
            XCTFail("Expected to throw validation error for empty title")
        } catch {
            // Goal.create() should handle validation
            XCTAssertTrue(error is DomainError)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 0)
    }
    
    func testExecute_WithEmptyUserId_ThrowsValidationError() async throws {
        // Arrange
        let input = CreateGoalInput(
            userId: "",
            title: "Valid Title",
            description: "Test description",
            targetBooks: 10,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: Date())!
        )
        
        // Act & Assert
        do {
            _ = try await sut.execute(input)
            XCTFail("Expected to throw validation error for empty user ID")
        } catch {
            // Goal.create() should handle validation
            XCTAssertTrue(error is DomainError)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 0)
    }
    
    func testExecute_WithZeroTargetBooks_ThrowsValidationError() async throws {
        // Arrange
        let input = CreateGoalInput(
            userId: testUserId,
            title: "Invalid Goal",
            description: "Test description",
            targetBooks: 0,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: Date())!
        )
        
        // Act & Assert
        do {
            _ = try await sut.execute(input)
            XCTFail("Expected to throw validation error for zero target books")
        } catch {
            // Goal.create() should handle validation
            XCTAssertTrue(error is DomainError)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 0)
    }
    
    func testExecute_WithNegativeTargetBooks_ThrowsValidationError() async throws {
        // Arrange
        let input = CreateGoalInput(
            userId: testUserId,
            title: "Invalid Goal",
            description: "Test description",
            targetBooks: -5,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: Date())!
        )
        
        // Act & Assert
        do {
            _ = try await sut.execute(input)
            XCTFail("Expected to throw validation error for negative target books")
        } catch {
            // Goal.create() should handle validation
            XCTAssertTrue(error is DomainError)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 0)
    }
    
    func testExecute_WithEndDateBeforeStartDate_ThrowsValidationError() async throws {
        // Arrange
        let startDate = Date()
        let endDate = Calendar.current.date(byAdding: .day, value: -1, to: startDate)!
        
        let input = CreateGoalInput(
            userId: testUserId,
            title: "Invalid Date Range",
            description: "Test description",
            targetBooks: 10,
            startDate: startDate,
            endDate: endDate
        )
        
        // Act & Assert
        do {
            _ = try await sut.execute(input)
            XCTFail("Expected to throw validation error for invalid date range")
        } catch {
            // Goal.create() should handle validation
            XCTAssertTrue(error is DomainError)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 0)
    }
    
    func testExecute_WithRepositoryCreateError_PropagatesError() async throws {
        // Arrange
        let input = createValidInput()
        mockGoalRepository.shouldThrowOnCreate = true
        mockGoalRepository.createError = DomainError.general("Database connection failed")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Database connection failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockGoalRepository.createCallCount, 1)
    }
    
    func testExecute_WithRepositoryDuplicateError_PropagatesError() async throws {
        // Arrange
        let input = createValidInput()
        mockGoalRepository.shouldThrowOnCreate = true
        mockGoalRepository.createError = DomainError.duplicate("Goal with this title already exists")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.duplicate("Goal with this title already exists")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Helper Methods
    
    private func createValidInput() -> CreateGoalInput {
        return CreateGoalInput(
            userId: testUserId,
            title: "Read 12 Books This Year",
            description: "My annual reading goal",
            targetBooks: 12,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: Date())!
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