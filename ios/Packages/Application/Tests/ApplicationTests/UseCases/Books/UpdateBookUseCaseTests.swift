//
//  UpdateBookUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for UpdateBookUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class UpdateBookUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: UpdateBookUseCase!
    
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
        
        sut = UpdateBookUseCase(
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
    
    func testExecute_WithStatusUpdate_UpdatesStatusSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.status, .read)
        XCTAssertEqual(mockBookRepository.updateCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastUpdatedBookId, testBookId)
    }
    
    func testExecute_WithCurrentPageUpdate_UpdatesPageSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(currentPage: 150)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.currentPage, 150)
    }
    
    func testExecute_WithRatingUpdate_UpdatesRatingSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(rating: 5)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.rating, 5)
    }
    
    func testExecute_WithMultipleUpdates_UpdatesAllFieldsSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(
            status: .read,
            currentPage: 300,
            rating: 4,
            finishedAt: Date()
        )
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.status, .read)
        XCTAssertEqual(result.currentPage, 300)
        XCTAssertEqual(result.rating, 4)
        XCTAssertNotNil(result.finishedAt)
    }
    
    func testExecute_WithGenresUpdate_UpdatesGenresSuccessfully() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(genres: ["Fiction", "Thriller"])
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockBookRepository.updateCallCount, 1)
        XCTAssertEqual(mockBookRepository.lastUpdatedBookUpdates?.genres, ["Fiction", "Thriller"])
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithNonExistentBook_ThrowsEntityNotFoundError() async throws {
        // Arrange
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: "non-existent-id",
            userId: testUserId,
            updates: updates
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.entityNotFound("Book", id: "non-existent-id")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.updateCallCount, 0)
    }
    
    func testExecute_WithWrongUserId_ThrowsOwnershipMismatchError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: otherUserId,  // Different user
            updates: updates
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.ownershipMismatch
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockBookRepository.updateCallCount, 0)
    }
    
    func testExecute_WithRepositoryFindByIdError_PropagatesError() async throws {
        // Arrange
        mockBookRepository.findByIdError = DomainError.general("Database connection failed")
        
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Database connection failed")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithRepositoryUpdateError_PropagatesError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        mockBookRepository.updateError = DomainError.general("Update failed")
        
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Update failed")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithUpdateReturningNil_ThrowsEntityNotFoundError() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        mockBookRepository.shouldReturnNilOnUpdate = true
        
        let updates = BookUpdate(status: .read)
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.entityNotFound("Book", id: testBookId)
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithEmptyUpdates_ReturnsUnchangedBook() async throws {
        // Arrange
        let existingBook = createTestBook()
        mockBookRepository.addBook(existingBook)
        
        let updates = BookUpdate()  // No changes
        let input = UpdateBookInput(
            bookId: testBookId,
            userId: testUserId,
            updates: updates
        )
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.title, existingBook.title)
        XCTAssertEqual(result.status, existingBook.status)
        XCTAssertEqual(result.currentPage, existingBook.currentPage)
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