//
//  DeleteBookUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for DeleteBookUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class DeleteBookUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: DeleteBookUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockBookRepository: MockBookRepository!
    
    // MARK: - Test Data
    
    private let testUserId = "test-user-id"
    private let testBookId = "test-book-id"
    private let otherUserId = "other-user-id"
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockBookRepository = MockBookRepository()
        
        sut = DeleteBookUseCase(
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
    
    func testExecute_WithValidInput_DeletesBookSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act
        try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockBookRepository.findByIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.deleteCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastDeletedBookId, testBookId)
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithNonExistentBook_ThrowsEntityNotFoundError() async throws {
        // Arrange
        let input = DeleteBookInput(
            bookId: "non-existent-id",
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.entityNotFound("Book", id: "non-existent-id")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.findByIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.deleteCallCount, 0)
    }
    
    func testExecute_WithUnauthorizedUser_ThrowsUnauthorizedError() async throws {
        // Arrange
        let existingBook = createTestBook() // Belongs to testUserId
        mockBookRepository.addBook(existingBook)
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: otherUserId // Different user trying to delete
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.unauthorized("You don't have permission to delete this book")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.findByIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.deleteCallCount, 0)
    }
    
    func testExecute_WithRepositoryDeleteReturnsFalse_ThrowsEntityNotFoundError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        mockBookRepository.shouldReturnFalseOnDelete = true
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.entityNotFound("Book", id: testBookId)
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.deleteCallCount, 1)
    }
    
    func testExecute_WithRepositoryFindError_PropagatesError() async throws {
        // Arrange
        mockBookRepository.findByIdError = DomainError.general("Database connection failed")
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Database connection failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.findByIdCallCount, 1)
        XCTAssertEqual(mockBookRepository.deleteCallCount, 0)
    }
    
    func testExecute_WithRepositoryDeleteError_PropagatesError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        mockBookRepository.shouldThrowOnDelete = true
        mockBookRepository.deleteError = DomainError.general("Delete operation failed")
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Delete operation failed")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.deleteCallCount, 1)
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithSpecialCharactersInIds_HandlesCorrectly() async throws {
        // Arrange
        let specialBookId = "book-123-!@#$%^&*()"
        let specialUserId = "user-456-+=[]{}|"
        
        let specialBook = Book(
            id: specialBookId,
            userId: specialUserId,
            googleBooksId: "google-123",
            title: "Special Book",
            authors: ["Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 100,
            status: .wantToRead,
            currentPage: 0,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
        mockBookRepository.addBook(specialBook)
        
        let input = DeleteBookInput(
            bookId: specialBookId,
            userId: specialUserId
        )
        
        // Act - Should not throw
        try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockBookRepository.lastDeletedBookId, specialBookId)
    }
    
    func testExecute_WithVeryLongIds_HandlesCorrectly() async throws {
        // Arrange
        let longBookId = String(repeating: "a", count: 1000)
        let longUserId = String(repeating: "b", count: 1000)
        
        let longIdBook = Book(
            id: longBookId,
            userId: longUserId,
            googleBooksId: "google-long",
            title: "Long ID Book",
            authors: ["Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 200,
            status: .reading,
            currentPage: 50,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
        mockBookRepository.addBook(longIdBook)
        
        let input = DeleteBookInput(
            bookId: longBookId,
            userId: longUserId
        )
        
        // Act - Should not throw
        try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockBookRepository.lastDeletedBookId, longBookId)
    }
    
    // MARK: - Authorization Edge Cases
    
    func testExecute_WithEmptyUserIdInBook_StillValidatesOwnership() async throws {
        // Arrange
        let bookWithEmptyUserId = Book(
            id: testBookId,
            userId: "", // Empty user ID
            googleBooksId: "google-books-id",
            title: "Test Book",
            authors: ["Test Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 300,
            status: .wantToRead,
            currentPage: 0,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
        mockBookRepository.addBook(bookWithEmptyUserId)
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.unauthorized("You don't have permission to delete this book")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Helper Methods
    
    private func createTestBook() -> Book {
        return Book(
            id: testBookId,
            userId: testUserId,
            googleBooksId: "google-books-id",
            title: "Test Book",
            authors: ["Test Author"],
            thumbnail: "https://example.com/thumb.jpg",
            description: "Test description",
            pageCount: 300,
            status: .wantToRead,
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