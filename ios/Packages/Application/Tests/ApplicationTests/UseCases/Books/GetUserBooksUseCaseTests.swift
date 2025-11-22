//
//  GetUserBooksUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for GetUserBooksUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class GetUserBooksUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: GetUserBooksUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockBookRepository: MockBookRepository!
    
    // MARK: - Test Data
    
    private let testUserId = "test-user-id"
    private let otherUserId = "other-user-id"
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockBookRepository = MockBookRepository()
        
        sut = GetUserBooksUseCase(
            bookRepository: mockBookRepository
        )
        
        // Reset all mocks
        mockBookRepository.reset()
    }
    
    override func tearDownWithError() throws {
        sut = nil
        mockBookRepository = nil
        
        try super.tearDownWithError()
    }
    
    // MARK: - Success Path Tests
    
    func testExecute_WithValidUserId_ReturnsUserBooks() async throws {
        // Arrange
        let userBooks = createTestBooks(count: 3, userId: testUserId)
        mockBookRepository.addBooks(userBooks)
        
        // Add books for another user to ensure filtering
        let otherUserBooks = createTestBooks(count: 2, userId: otherUserId)
        mockBookRepository.addBooks(otherUserBooks)
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 3)
        XCTAssertTrue(result.allSatisfy { $0.userId == testUserId })
        XCTAssertEqual(mockBookRepository.findByUserIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastQueriedUserId, testUserId)
    }
    
    func testExecute_WithUserHavingNoBooks_ReturnsEmptyArray() async throws {
        // Arrange - no books added for testUserId
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockBookRepository.findByUserIdCallCount, 1)
    }
    
    func testExecute_WithMultipleBookStatuses_ReturnsAllBooks() async throws {
        // Arrange
        let books = [
            createTestBook(userId: testUserId, status: .wantToRead),
            createTestBook(userId: testUserId, status: .reading),
            createTestBook(userId: testUserId, status: .read)
        ]
        mockBookRepository.addBooks(books)
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 3)
        XCTAssertTrue(result.contains { $0.status == .wantToRead })
        XCTAssertTrue(result.contains { $0.status == .reading })
        XCTAssertTrue(result.contains { $0.status == .read })
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithRepositoryError_PropagatesError() async throws {
        // Arrange
        mockBookRepository.findByUserIdError = DomainError.general("Database connection failed")
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Database connection failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.findByUserIdCallCount, 1)
    }
    
    func testExecute_WithUnauthorizedError_PropagatesError() async throws {
        // Arrange
        mockBookRepository.findByUserIdError = DomainError.unauthorized("User not authorized")
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.unauthorized("User not authorized")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithNetworkError_PropagatesError() async throws {
        // Arrange
        mockBookRepository.findByUserIdError = DomainError.general("Network timeout")
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Network timeout")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithEmptyUserId_CallsRepository() async throws {
        // Arrange - Use case doesn't validate empty user ID, delegates to repository
        let input = GetUserBooksInput(userId: "")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockBookRepository.findByUserIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastQueriedUserId, "")
    }
    
    func testExecute_WithSpecialCharactersInUserId_HandlesCorrectly() async throws {
        // Arrange
        let specialUserId = "user-123-!@#$%^&*()"
        let books = createTestBooks(count: 2, userId: specialUserId)
        mockBookRepository.addBooks(books)
        
        let input = GetUserBooksInput(userId: specialUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 2)
        XCTAssertTrue(result.allSatisfy { $0.userId == specialUserId })
    }
    
    func testExecute_WithVeryLongUserId_HandlesCorrectly() async throws {
        // Arrange
        let longUserId = String(repeating: "a", count: 1000)
        let books = createTestBooks(count: 1, userId: longUserId)
        mockBookRepository.addBooks(books)
        
        let input = GetUserBooksInput(userId: longUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].userId, longUserId)
    }
    
    func testExecute_WithLargeNumberOfBooks_ReturnsAllBooks() async throws {
        // Arrange
        let manyBooks = createTestBooks(count: 100, userId: testUserId)
        mockBookRepository.addBooks(manyBooks)
        
        let input = GetUserBooksInput(userId: testUserId)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 100)
        XCTAssertTrue(result.allSatisfy { $0.userId == testUserId })
    }
    
    // MARK: - Helper Methods
    
    private func createTestBooks(count: Int, userId: String) -> [Book] {
        return (0..<count).map { index in
            createTestBook(userId: userId, suffix: "\(index)")
        }
    }
    
    private func createTestBook(
        userId: String,
        suffix: String = "",
        status: BookStatus = .wantToRead
    ) -> Book {
        return Book(
            id: "book-id\(suffix)",
            userId: userId,
            googleBooksId: "google-books-id\(suffix)",
            title: "Test Book\(suffix)",
            authors: ["Test Author\(suffix)"],
            thumbnail: "https://example.com/thumb\(suffix).jpg",
            description: "Test description\(suffix)",
            pageCount: 300 + Int(suffix) ?? 0,
            status: status,
            currentPage: 0,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
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