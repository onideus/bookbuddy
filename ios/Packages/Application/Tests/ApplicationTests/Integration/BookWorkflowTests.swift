//
//  BookWorkflowTests.swift
//  ApplicationTests
//
//  Integration tests for complete book management workflows
//  Tests the entire user journey from adding books to completion
//

import XCTest
@testable import Application
@testable import CoreDomain

final class BookWorkflowTests: XCTestCase {

    // MARK: - System Under Test

    private var addBookUseCase: AddBookUseCase!
    private var updateBookUseCase: UpdateBookUseCase!
    private var deleteBookUseCase: DeleteBookUseCase!
    private var getUserBooksUseCase: GetUserBooksUseCase!
    private var searchBooksUseCase: SearchBooksUseCase!

    // MARK: - Mock Dependencies

    private var mockBookRepository: MockBookRepository!
    private var mockExternalBookSearch: MockExternalBookSearch!

    // MARK: - Test Data

    private let testUserId = "integration-user-id"
    private let testGoogleBooksId = "integration-google-books-id"

    // MARK: - Setup & Teardown

    override func setUpWithError() throws {
        try super.setUpWithError()

        mockBookRepository = MockBookRepository()
        mockExternalBookSearch = MockExternalBookSearch()

        // Initialize use cases with shared dependencies
        addBookUseCase = AddBookUseCase(bookRepository: mockBookRepository)
        updateBookUseCase = UpdateBookUseCase(bookRepository: mockBookRepository)
        deleteBookUseCase = DeleteBookUseCase(bookRepository: mockBookRepository)
        getUserBooksUseCase = GetUserBooksUseCase(bookRepository: mockBookRepository)
        searchBooksUseCase = SearchBooksUseCase(externalBookSearch: mockExternalBookSearch)

        // Reset all mocks
        mockBookRepository.reset()
        mockExternalBookSearch.reset()
    }

    override func tearDownWithError() throws {
        addBookUseCase = nil
        updateBookUseCase = nil
        deleteBookUseCase = nil
        getUserBooksUseCase = nil
        searchBooksUseCase = nil
        mockBookRepository = nil
        mockExternalBookSearch = nil

        try super.tearDownWithError()
    }

    // MARK: - Complete Book Management Workflow Tests

    func testCompleteBookManagementWorkflow_FromAddToCompletion_WorksCorrectly() async throws {
        // MARK: 1. Add Book to Library

        let addInput = AddBookInput(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: "The Swift Programming Language",
            authors: ["Apple Inc."],
            thumbnail: "https://example.com/swift-book.jpg",
            description: "Learn Swift programming",
            pageCount: 500,
            status: .wantToRead
        )

        let addedBook = try await addBookUseCase.execute(addInput)

        // Verify initial state
        XCTAssertEqual(addedBook.title, "The Swift Programming Language")
        XCTAssertEqual(addedBook.status, .wantToRead)
        // currentPage is nil for .wantToRead status (set to 0 only when reading starts)
        XCTAssertNil(addedBook.currentPage)
        XCTAssertNil(addedBook.rating)
        XCTAssertNil(addedBook.finishedAt)

        // MARK: 2. Start Reading (Update Status)

        let startReadingUpdate = BookUpdate(
            status: .reading,
            currentPage: 0,
            rating: nil,
            finishedAt: nil
        )

        let startReadingInput = UpdateBookInput(
            bookId: addedBook.id,
            userId: testUserId,
            updates: startReadingUpdate
        )

        let startedBook = try await updateBookUseCase.execute(startReadingInput)

        // Verify reading started
        XCTAssertEqual(startedBook.status, .reading)
        XCTAssertEqual(startedBook.currentPage, 0)

        // MARK: 3. Update Progress Multiple Times

        // Progress update 1: 25% through
        let progress1Update = BookUpdate(currentPage: 125)
        let progress1Input = UpdateBookInput(
            bookId: addedBook.id,
            userId: testUserId,
            updates: progress1Update
        )

        let progress1Book = try await updateBookUseCase.execute(progress1Input)
        XCTAssertEqual(progress1Book.currentPage, 125)
        XCTAssertEqual(progress1Book.status, .reading)

        // Progress update 2: 50% through
        let progress2Update = BookUpdate(currentPage: 250)
        let progress2Input = UpdateBookInput(
            bookId: addedBook.id,
            userId: testUserId,
            updates: progress2Update
        )

        let progress2Book = try await updateBookUseCase.execute(progress2Input)
        XCTAssertEqual(progress2Book.currentPage, 250)

        // MARK: 4. Complete Reading with Rating

        let completionDate = Date()
        let completionUpdate = BookUpdate(
            status: .read,
            currentPage: 500,
            rating: 5,
            finishedAt: completionDate
        )

        let completionInput = UpdateBookInput(
            bookId: addedBook.id,
            userId: testUserId,
            updates: completionUpdate
        )

        let completedBook = try await updateBookUseCase.execute(completionInput)

        // Verify completion
        XCTAssertEqual(completedBook.status, .read)
        XCTAssertEqual(completedBook.currentPage, 500)
        XCTAssertEqual(completedBook.rating, 5)
        XCTAssertEqual(completedBook.finishedAt, completionDate)

        // MARK: 5. Verify in User's Collection

        let getUserBooksInput = GetUserBooksInput(userId: testUserId)
        let userBooks = try await getUserBooksUseCase.execute(getUserBooksInput)

        // Verify book appears in user's collection
        XCTAssertEqual(userBooks.count, 1)
        XCTAssertEqual(userBooks[0].id, addedBook.id)
        XCTAssertEqual(userBooks[0].status, .read)
        XCTAssertEqual(userBooks[0].rating, 5)

        // Verify all operations were recorded
        XCTAssertEqual(mockBookRepository.createCallCount, 1)
        XCTAssertGreaterThan(mockBookRepository.updateCallCount, 0)
    }

    func testSearchAndAddWorkflow_DiscoveringBooks_WorksCorrectly() async throws {
        // MARK: 1. Search for Books

        mockExternalBookSearch.addMockResults([
            MockSearchResult(
                id: "search-book-1",
                title: "iOS Development Guide",
                authors: ["iOS Expert"],
                thumbnail: "https://example.com/ios.jpg",
                description: "Complete iOS development guide",
                pageCount: 400
            )
        ])

        let searchInput = SearchBooksInput(query: "iOS Swift development")
        let searchResults = try await searchBooksUseCase.execute(searchInput)

        // Verify search results
        XCTAssertEqual(searchResults.count, 1)
        XCTAssertEqual(searchResults[0].volumeInfo.title, "iOS Development Guide")

        // MARK: 2. Add Discovered Book to Library

        let selectedBook = searchResults[0]
        let addInput = AddBookInput(
            userId: testUserId,
            googleBooksId: selectedBook.id,
            title: selectedBook.volumeInfo.title,
            authors: selectedBook.volumeInfo.authors ?? [],
            thumbnail: selectedBook.volumeInfo.imageLinks?.thumbnail,
            description: selectedBook.volumeInfo.description,
            pageCount: selectedBook.volumeInfo.pageCount,
            status: .wantToRead
        )

        let addedBook = try await addBookUseCase.execute(addInput)

        // Verify book was added correctly
        XCTAssertEqual(addedBook.title, "iOS Development Guide")
        XCTAssertEqual(addedBook.authors, ["iOS Expert"])
        XCTAssertEqual(addedBook.googleBooksId, "search-book-1")

        // Verify interaction counts
        XCTAssertEqual(mockExternalBookSearch.searchCallCount, 1)
        XCTAssertEqual(mockBookRepository.createCallCount, 1)
    }
}