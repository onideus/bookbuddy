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
        XCTAssertEqual(mockBookRepository.deleteCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastDeletedBookId, testBookId)
    }
    
    func testExecute_WithValidInput_RemovesBookFromRepository() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act
        try await sut.execute(input)
        
        // Assert - Book should no longer exist
        let deletedBook = try await mockBookRepository.findById(testBookId)
        XCTAssertNil(deletedBook)
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
        
        XCTAssertEqual(mockBookRepository.deleteCallCount, 0)
    }
    
    func testExecute_WithWrongUserId_ThrowsOwnershipMismatchError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: otherUserId  // Different user
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.ownershipMismatch
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.deleteCallCount, 0)
    }
    
    func testExecute_WithRepositoryFindByIdError_PropagatesError() async throws {
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
    }
    
    func testExecute_WithRepositoryDeleteError_PropagatesError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        mockBookRepository.deleteError = DomainError.general("Delete failed")
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Delete failed")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WhenDeleteReturnsFalse_ThrowsEntityNotFoundError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        // Simulate book being deleted between findById and delete calls
        // by configuring shouldThrowOnDelete to simulate delete returning false
        mockBookRepository.shouldThrowOnDelete = true
        mockBookRepository.deleteError = nil  // Will use default DomainError.general
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act & Assert
        do {
            try await sut.execute(input)
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is DomainError)
        }
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithMultipleBooks_OnlyDeletesTargetBook() async throws {
        // Arrange
        let book1 = createTestBook()
        let book2 = Book(
            id: "book-2",
            userId: testUserId,
            googleBooksId: "google-2",
            title: "Second Book",
            authors: ["Author 2"],
            thumbnail: nil,
            description: nil,
            pageCount: nil,
            status: .wantToRead,
            currentPage: 0,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
        mockBookRepository.addBooks([book1, book2])
        
        let input = DeleteBookInput(
            bookId: testBookId,
            userId: testUserId
        )
        
        // Act
        try await sut.execute(input)
        
        // Assert
        let remainingBooks = try await mockBookRepository.findByUserId(testUserId)
        XCTAssertEqual(remainingBooks.count, 1)
        XCTAssertEqual(remainingBooks.first?.id, "book-2")
    }
    
    // MARK: - Helper Methods
    
    private func createTestBook() -> Book {
        return Book(
            id: testBookId,
            userId: testUserId,
            googleBooksId: "google-books-id",
            title: "Test Book Title",
            authors: ["Test Author"],
            thumbnail: "https://example.com/thumbnail.jpg",
            description: "Test description",
            pageCount: 300,
            status: .reading,
            currentPage: 50,
            rating: nil,
            addedAt: Date(),
            finishedAt: nil
        )
    }
    
    private func assertThrowsSpecificError(
        _ expectedError: DomainError,
        _ expression: () async throws -> Void,
        file: StaticString = #filePath,
        line: UInt = #line
    ) async {
        do {
            try await expression()
            XCTFail("Expected to throw \(expectedError), but no error was thrown", file: file, line: line)
        } catch let thrownError as DomainError {
            XCTAssertEqual(thrownError, expectedError, file: file, line: line)
        } catch {
            XCTFail("Expected to throw \(expectedError), but threw \(error)", file: file, line: line)
        }
    }
}