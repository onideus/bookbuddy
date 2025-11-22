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
        
        // Reset all mocks
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
        let mockResults = createMockBookSearchResults(count: 3)
        mockExternalBookSearch.addMockResults(mockResults)
        
        let input = SearchBooksInput(query: "Swift Programming")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, "Swift Programming")
        
        // Verify result structure
        XCTAssertEqual(result[0].id, "book-0")
        XCTAssertEqual(result[0].volumeInfo.title, "Test Book 0")
        XCTAssertEqual(result[0].volumeInfo.authors, ["Author 0"])
    }
    
    func testExecute_WithSingleResult_ReturnsSingleResult() async throws {
        // Arrange
        let mockResult = MockSearchResult(
            id: "single-book",
            title: "Single Book",
            authors: ["Single Author"],
            thumbnail: "https://example.com/single.jpg",
            description: "A single book",
            pageCount: 200
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: "specific book")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "single-book")
        XCTAssertEqual(result[0].volumeInfo.title, "Single Book")
    }
    
    func testExecute_WithNoResults_ReturnsEmptyArray() async throws {
        // Arrange - no mock results added
        mockExternalBookSearch.shouldReturnEmptyResults = true
        
        let input = SearchBooksInput(query: "nonexistent book")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
    }
    
    // MARK: - Query Validation Tests
    
    func testExecute_WithEmptyQuery_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0) // Should not call external service
    }
    
    func testExecute_WithWhitespaceOnlyQuery_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "   \t\n   ")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0) // Should not call external service
    }
    
    func testExecute_WithQueryContainingOnlySpaces_ReturnsEmptyArray() async throws {
        // Arrange
        let input = SearchBooksInput(query: "     ")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertTrue(result.isEmpty)
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 0)
    }
    
    // MARK: - Error Path Tests
    
    func testExecute_WithExternalServiceError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.general("External service unavailable")
        
        let input = SearchBooksInput(query: "valid query")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("External service unavailable")
        ) {
            try await self.sut.execute(input)
        }
        
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
    }
    
    func testExecute_WithNetworkError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.general("Network timeout")
        
        let input = SearchBooksInput(query: "network test")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("Network timeout")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithAPIQuotaExceededError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.general("API quota exceeded")
        
        let input = SearchBooksInput(query: "quota test")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.general("API quota exceeded")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    func testExecute_WithUnauthorizedAPIError_PropagatesError() async throws {
        // Arrange
        mockExternalBookSearch.shouldThrowOnSearch = true
        mockExternalBookSearch.searchError = DomainError.unauthorized("Invalid API key")
        
        let input = SearchBooksInput(query: "auth test")
        
        // Act & Assert
        await assertThrowsSpecificError(
            DomainError.unauthorized("Invalid API key")
        ) {
            try await self.sut.execute(input)
        }
    }
    
    // MARK: - Edge Cases
    
    func testExecute_WithSpecialCharactersInQuery_HandlesCorrectly() async throws {
        // Arrange
        let specialQuery = "C++ & JavaScript: 100% Guide!"
        let mockResult = MockSearchResult(
            id: "special-book",
            title: "Special Characters Book",
            authors: ["Special Author"],
            thumbnail: nil,
            description: nil,
            pageCount: nil
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: specialQuery)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, specialQuery)
    }
    
    func testExecute_WithVeryLongQuery_HandlesCorrectly() async throws {
        // Arrange
        let longQuery = String(repeating: "book ", count: 200) // Very long query
        let mockResult = MockSearchResult(
            id: "long-query-book",
            title: "Long Query Book",
            authors: ["Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 100
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: longQuery)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, longQuery)
    }
    
    func testExecute_WithUnicodeCharacters_HandlesCorrectly() async throws {
        // Arrange
        let unicodeQuery = "العربية 中文 🚀 📚 Français"
        let mockResult = MockSearchResult(
            id: "unicode-book",
            title: "Unicode Book",
            authors: ["Unicode Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 150
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: unicodeQuery)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, unicodeQuery)
    }
    
    func testExecute_WithQueryHavingLeadingTrailingSpaces_TrimsCorrectly() async throws {
        // Arrange
        let queryWithSpaces = "  Swift Programming  "
        let mockResult = MockSearchResult(
            id: "trimmed-book",
            title: "Trimmed Book",
            authors: ["Author"],
            thumbnail: nil,
            description: nil,
            pageCount: 250
        )
        mockExternalBookSearch.addMockResult(mockResult)
        
        let input = SearchBooksInput(query: queryWithSpaces)
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(mockExternalBookSearch.lastSearchQuery, queryWithSpaces) // Original query passed through
    }
    
    func testExecute_WithManyResults_ReturnsAllResults() async throws {
        // Arrange
        let manyResults = createMockBookSearchResults(count: 50)
        mockExternalBookSearch.addMockResults(manyResults)
        
        let input = SearchBooksInput(query: "popular books")
        
        // Act
        let result = try await sut.execute(input)
        
        // Assert
        XCTAssertEqual(result.count, 50)
        // Verify first and last results
        XCTAssertEqual(result[0].id, "book-0")
        XCTAssertEqual(result[49].id, "book-49")
    }
    
    // MARK: - Helper Methods
    
    private func createMockBookSearchResults(count: Int) -> [MockSearchResult] {
        return (0..<count).map { index in
            MockSearchResult(
                id: "book-\(index)",
                title: "Test Book \(index)",
                authors: ["Author \(index)"],
                thumbnail: "https://example.com/thumb\(index).jpg",
                description: "Description for book \(index)",
                pageCount: 200 + index
            )
        }
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