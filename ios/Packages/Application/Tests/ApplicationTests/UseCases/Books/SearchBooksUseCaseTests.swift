//
//  SearchBooksUseCaseTests.swift
//  ApplicationTests
//
//  Comprehensive tests for SearchBooksUseCase with 100% error path coverage
//

import XCTest
@testable import Application
@testable import CoreDomain

final class SearchBooksUseCaseTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var sut: SearchBooksUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockExternalBookSearch: MockExternalBookSearch!
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockExternalBookSearch = MockExternalBookSearch()
        
        sut = SearchBooksUseCase(
            externalBookSearch: mockExternalBookSearch
        )
        
        mockExternalBookSearch.reset()
    }
    
    override func tearDownWithError() throws {
        sut = nil
        mockExternalBookSearch = nil
        
        try super.tearDownWithError()
    }
    
    // MARK: - Success Path Tests
    
    func testExecute_WithValidQuery_ReturnsSearchResults() async throws {
        // Arrange
        let mockResults = [
            MockSearchResult(
                id: "google-1",
                title: "Swift Programming",
                authors: ["John Doe"],
                thumbnail: "https://example.com/thumb1.jpg",
                description: "A book about Swift",
                pageCount: 300
            ),
            MockSearchResult(
                id: "google-2",
                title: "iOS Development",
                authors: ["Jane Smith"],
                thumbnail: "https://example.com/thumb2.jpg",
                description: "A book about iOS",
                pageCount: 450
            )
        ]
        mockExternalBookSearch.addMockResults(mockResults)
        
        let input = SearchBooksInput(query: "Swift")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(results.count, 2)
        XCTAssertEqual(results[0].id, "google-1")
        XCTAssertEqual(results[0].volumeInfo.title, "Swift Programming")
        XCTAssertEqual(results[1].id, "google-2")
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, "Swift")
    }
    
    func testExecute_WithValidQuery_IncludesAllBookDetails() async throws {
        // Arrange
        let mockResult = MockSearchResult(
            id: "google-123",
            title: "Complete Swift Guide",
            authors: ["Author One", "Author Two"],
            thumbnail: "https://example.com/cover.jpg",
            description: "Comprehensive Swift programming guide",
            pageCount: 500
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: "Complete Swift")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(results.count, 1)
        let result = results[0]
        XCTAssertEqual(result.id, "google-123")
        XCTAssertEqual(result.volumeInfo.title, "Complete Swift Guide")
        XCTAssertEqual(result.volumeInfo.authors, ["Author One", "Author Two"])
        XCTAssertEqual(result.volumeInfo.description, "Comprehensive Swift programming guide")
        XCTAssertEqual(result.volumeInfo.pageCount, 500)
        XCTAssertNotNil(result.volumeInfo.imageLinks)
        XCTAssertEqual(result.volumeInfo.imageLinks?.thumbnail, "https://example.com/cover.jpg")
    }
    
    // MARK: - Empty Query Tests
    
    func testExecute_WithEmptyQuery_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(results.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0, "Should not call external search for empty query")
    }
    
    func testExecute_WithWhitespaceOnlyQuery_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "   ")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(results.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0, "Should not call external search for whitespace-only query")
    }
    
    func testExecute_WithTabAndNewlineQuery_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "\t\n  ")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(results.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0)
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithExternalSearchError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.general("External search service unavailable")
        
        let input = SearchBooksInput(query: "Swift")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("External search service unavailable")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithNetworkError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.general("Network connection lost")
        
        let input = SearchBooksInput(query: "Programming")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Network connection lost")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithDefaultSearchError_ThrowsGenericError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        // Don't set a specific error - will use default
        
        let input = SearchBooksInput(query: "Test")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("External search service unavailable")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithNoResults_ReturnsEmptyArray() async throws {
        // Arrange
        mockExternalBookSearch.shouldReturnEmptyResults = true
        
        let input = SearchBooksInput(query: "xyznonexistentbook123")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(results.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
    }
    
    func testExecute_WithResultsWithMissingOptionalFields_HandlesGracefully() async throws {
        // Arrange
        let mockResult = MockSearchResult(
            id: "google-minimal",
            title: "Minimal Book",
            authors: ["Unknown"],
            thumbnail: nil,  // No thumbnail
            description: nil,  // No description
            pageCount: nil  // No page count
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: "Minimal")
        
        // Act
        let results = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(results.count, 1)
        let result = results[0]
        XCTAssertEqual(result.id, "google-minimal")
        XCTAssertEqual(result.volumeInfo.title, "Minimal Book")
        XCTAssertNil(result.volumeInfo.description)
        XCTAssertNil(result.volumeInfo.pageCount)
        XCTAssertNil(result.volumeInfo.imageLinks)
    }
    
    func testExecute_WithSpecialCharactersInQuery_SearchesCorrectly() async throws {
        // Arrange
        let specialQuery = "C++ Programming & Design"
        let input = SearchBooksInput(query: specialQuery)
        
        // Act
        _ = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, specialQuery)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
    }
    
    func testExecute_WithISBNQuery_SearchesCorrectly() async throws {
        // Arrange
        let isbnQuery = "978-0-596-51774-8"
        let input = SearchBooksInput(query: isbnQuery)
        
        // Act
        _ = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, isbnQuery)
    }
    
    func testExecute_WithLongQuery_SearchesCorrectly() async throws {
        // Arrange
        let longQuery = String(repeating: "book ", count: 50)
        let input = SearchBooksInput(query: longQuery)
        
        // Act
        _ = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, longQuery)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
    }
    
    // MARK: - Helper Methods
    
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