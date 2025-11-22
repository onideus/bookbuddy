//
//  BookTests.swift
//  CoreDomainTests
//
//  Regression tests for Book entity verifying TypeScript defaults
//

import XCTest
@testable import CoreDomain

final class BookTests: XCTestCase {
    
    // MARK: - Test Data
    
    private let testUserId = "user-123"
    private let testGoogleBooksId = "google-abc123"
    private let testTitle = "The Swift Programming Language"
    private let testAuthors = ["Apple Inc.", "Chris Lattner"]
    
    // MARK: - Book.create() Regression Tests
    
    func testBookCreateDefaultValues() {
        // Test Book.create() matches TypeScript defaults exactly
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors
        )
        
        // Verify ID is generated (UUID format)
        XCTAssertFalse(book.id.isEmpty, "Book ID should be generated")
        XCTAssertTrue(UUID(uuidString: book.id) != nil, "Book ID should be valid UUID")
        
        // Verify required fields
        XCTAssertEqual(book.userId, testUserId)
        XCTAssertEqual(book.googleBooksId, testGoogleBooksId)
        XCTAssertEqual(book.title, testTitle)
        XCTAssertEqual(book.authors, testAuthors)
        
        // Verify default values match TypeScript implementation
        XCTAssertEqual(book.status, .wantToRead, "Default status should be wantToRead")
        XCTAssertNil(book.thumbnail, "Default thumbnail should be nil")
        XCTAssertNil(book.description, "Default description should be nil") 
        XCTAssertNil(book.pageCount, "Default pageCount should be nil")
        XCTAssertNil(book.currentPage, "Default currentPage should be nil for wantToRead status")
        XCTAssertNil(book.rating, "Default rating should be nil")
        XCTAssertNil(book.finishedAt, "Default finishedAt should be nil")
        
        // Verify addedAt is set to current time (within reasonable range)
        let now = Date()
        let timeDifference = abs(book.addedAt.timeIntervalSince(now))
        XCTAssertLessThan(timeDifference, 1.0, "addedAt should be set to current time")
    }
    
    func testBookCreateWithWantToReadStatus() {
        // Explicit test for wantToRead status (TypeScript default)
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            status: .wantToRead
        )
        
        XCTAssertEqual(book.status, .wantToRead)
        XCTAssertNil(book.currentPage, "currentPage should be nil for wantToRead")
        XCTAssertNil(book.finishedAt, "finishedAt should be nil for wantToRead")
        XCTAssertNil(book.rating, "rating should be nil for wantToRead")
    }
    
    func testBookCreateWithReadingStatus() {
        // Test reading status has currentPage set to 0 (TypeScript behavior)
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            status: .reading
        )
        
        XCTAssertEqual(book.status, .reading)
        XCTAssertEqual(book.currentPage, 0, "currentPage should be 0 for reading status")
        XCTAssertNil(book.finishedAt, "finishedAt should be nil for reading")
        XCTAssertNil(book.rating, "rating should be nil for reading")
    }
    
    func testBookCreateWithReadStatus() {
        // Test read status behavior
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            status: .read
        )
        
        XCTAssertEqual(book.status, .read)
        XCTAssertEqual(book.currentPage, 0, "currentPage should be 0 for read status")
        XCTAssertNil(book.finishedAt, "finishedAt should be nil initially (set during status transition)")
        XCTAssertNil(book.rating, "rating should be nil initially")
    }
    
    func testBookCreateWithOptionalFields() {
        // Test creating book with optional fields
        let testThumbnail = "https://example.com/cover.jpg"
        let testDescription = "A comprehensive guide to Swift programming"
        let testPageCount = 500
        
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            thumbnail: testThumbnail,
            description: testDescription,
            pageCount: testPageCount,
            status: .reading
        )
        
        XCTAssertEqual(book.thumbnail, testThumbnail)
        XCTAssertEqual(book.description, testDescription)
        XCTAssertEqual(book.pageCount, testPageCount)
        XCTAssertEqual(book.currentPage, 0, "currentPage should still be 0 for reading")
    }
    
    // MARK: - Validation Tests
    
    func testBookCreateValidation() {
        // Test validation errors match TypeScript behavior
        
        // Empty userId
        XCTAssertThrowsError(try Book.create(
            userId: "",
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "User ID cannot be empty")
            }
        }
        
        // Empty Google Books ID
        XCTAssertThrowsError(try Book.create(
            userId: testUserId,
            googleBooksId: "",
            title: testTitle,
            authors: testAuthors
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Google Books ID cannot be empty")
            }
        }
        
        // Empty title
        XCTAssertThrowsError(try Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: "",
            authors: testAuthors
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Title cannot be empty")
            }
        }
        
        // Empty authors array
        XCTAssertThrowsError(try Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: []
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Book must have at least one author")
            }
        }
        
        // Negative page count
        XCTAssertThrowsError(try Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            pageCount: -1
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Page count cannot be negative")
            }
        }
    }
    
    func testBookCreateTrimsWhitespace() {
        // Test title trimming behavior matches TypeScript
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: "  \t Swift Programming \n  ",
            authors: testAuthors
        )
        
        XCTAssertEqual(book.title, "Swift Programming", "Title should be trimmed")
    }
    
    // MARK: - Status Transition Regression Tests
    
    func testBookStatusTransitions() {
        // Test status transitions match TypeScript behavior
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            status: .wantToRead
        )
        
        // Transition to reading
        let readingBook = book.withStatus(.reading)
        XCTAssertEqual(readingBook.status, .reading)
        XCTAssertEqual(readingBook.currentPage, 0, "currentPage should be set to 0 when transitioning to reading")
        XCTAssertNil(readingBook.finishedAt)
        XCTAssertNil(readingBook.rating)
        
        // Transition to read
        let readBook = readingBook.withStatus(.read)
        XCTAssertEqual(readBook.status, .read)
        XCTAssertNotNil(readBook.finishedAt, "finishedAt should be set when marking as read")
        XCTAssertNil(readBook.rating, "rating should still be nil")
        
        // Transition back to reading (should clear finishedAt and rating)
        let reReadingBook = readBook.withStatus(.reading)
        XCTAssertEqual(reReadingBook.status, .reading)
        XCTAssertNil(reReadingBook.finishedAt, "finishedAt should be cleared")
        XCTAssertNil(reReadingBook.rating, "rating should be cleared")
    }
    
    func testBookRatingValidation() {
        // Test rating behavior matches TypeScript
        let book = try! Book.create(
            userId: testUserId,
            googleBooksId: testGoogleBooksId,
            title: testTitle,
            authors: testAuthors,
            status: .read
        ).withStatus(.read) // Ensure finishedAt is set
        
        // Valid rating
        let ratedBook = try! book.withRating(5)
        XCTAssertEqual(ratedBook.rating, 5)
        
        // Invalid ratings
        XCTAssertThrowsError(try book.withRating(0))
        XCTAssertThrowsError(try book.withRating(6))
        
        // Cannot rate non-read book
        let readingBook = book.withStatus(.reading)
        XCTAssertThrowsError(try readingBook.withRating(5))
    }
}