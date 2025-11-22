//
//  MockBookRepository.swift
//  ApplicationTests
//
//  Mock implementation of BookRepositoryProtocol for testing
//

import Foundation
@testable import CoreDomain

final class MockBookRepository: BookRepositoryProtocol, @unchecked Sendable {
    
    // MARK: - Mock Data
    
    private var books: [String: Book] = [:]
    private var userBooks: [String: [Book]] = [:]
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnCreate = false
    var shouldThrowOnUpdate = false
    var shouldThrowOnDelete = false
    var shouldReturnNilOnUpdate = false
    var shouldReturnFalseOnDelete = false
    
    var createError: Error?
    var updateError: Error?
    var deleteError: Error?
    var findByIdError: Error?
    var findByUserIdError: Error?
    var findByStatusError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var createCallCount = 0
    private(set) var updateCallCount = 0
    private(set) var deleteCallCount = 0
    private(set) var findByIdCallCount = 0
    private(set) var findByUserIdCallCount = 0
    private(set) var findByStatusCallCount = 0
    
    private(set) var lastCreatedBook: Book?
    private(set) var lastUpdatedBookId: String?
    private(set) var lastUpdatedBookUpdates: [String: Any]?
    private(set) var lastDeletedBookId: String?
    private(set) var lastQueriedUserId: String?
    private(set) var lastQueriedBookId: String?
    private(set) var lastQueriedStatus: BookStatus?
    
    // MARK: - Setup Methods
    
    func reset() {
        books.removeAll()
        userBooks.removeAll()
        
        shouldThrowOnCreate = false
        shouldThrowOnUpdate = false
        shouldThrowOnDelete = false
        shouldReturnNilOnUpdate = false
        shouldReturnFalseOnDelete = false
        
        createError = nil
        updateError = nil
        deleteError = nil
        findByIdError = nil
        findByUserIdError = nil
        findByStatusError = nil
        
        createCallCount = 0
        updateCallCount = 0
        deleteCallCount = 0
        findByIdCallCount = 0
        findByUserIdCallCount = 0
        findByStatusCallCount = 0
        
        lastCreatedBook = nil
        lastUpdatedBookId = nil
        lastUpdatedBookUpdates = nil
        lastDeletedBookId = nil
        lastQueriedUserId = nil
        lastQueriedBookId = nil
        lastQueriedStatus = nil
    }
    
    func addBook(_ book: Book) {
        books[book.id] = book
        if userBooks[book.userId] == nil {
            userBooks[book.userId] = []
        }
        userBooks[book.userId]?.append(book)
    }
    
    func addBooks(_ booksToAdd: [Book]) {
        for book in booksToAdd {
            addBook(book)
        }
    }
    
    // MARK: - BookRepositoryProtocol Implementation
    
    func create(_ book: Book) async throws -> Book {
        createCallCount += 1
        lastCreatedBook = book
        
        if shouldThrowOnCreate {
            if let error = createError {
                throw error
            }
            throw DomainError.duplicate("Book with this Google Books ID already exists")
        }
        
        addBook(book)
        return book
    }
    
    func findByUserId(_ userId: String) async throws -> [Book] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        return userBooks[userId] ?? []
    }
    
    func findById(_ id: String) async throws -> Book? {
        findByIdCallCount += 1
        lastQueriedBookId = id
        
        if let error = findByIdError {
            throw error
        }
        
        return books[id]
    }
    
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Book] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        let allBooks = userBooks[userId] ?? []
        let startIndex = min(offset, allBooks.count)
        let endIndex = limit.map { min(startIndex + $0, allBooks.count) } ?? allBooks.count
        
        return Array(allBooks[startIndex..<endIndex])
    }
    
    func exists(userId: String, googleBooksId: String) async throws -> Bool {
        let userBooksArray = userBooks[userId] ?? []
        return userBooksArray.contains { $0.googleBooksId == googleBooksId }
    }
    
    func update(_ id: String, updates: BookUpdate) async throws -> Book? {
        updateCallCount += 1
        lastUpdatedBookId = id
        
        // Convert updates to dictionary for tracking
        var updatesDict: [String: Any] = [:]
        if let status = updates.status { updatesDict["status"] = status }
        if let currentPage = updates.currentPage { updatesDict["currentPage"] = currentPage }
        if let rating = updates.rating { updatesDict["rating"] = rating }
        if let finishedAt = updates.finishedAt { updatesDict["finishedAt"] = finishedAt }
        lastUpdatedBookUpdates = updatesDict
        
        if shouldThrowOnUpdate {
            if let error = updateError {
                throw error
            }
            throw DomainError.notFound("Book not found")
        }
        
        if shouldReturnNilOnUpdate {
            return nil
        }
        
        guard var book = books[id] else {
            return nil
        }
        
        // Apply updates
        book = Book(
            id: book.id,
            userId: book.userId,
            googleBooksId: book.googleBooksId,
            title: book.title,
            authors: book.authors,
            thumbnail: book.thumbnail,
            description: book.description,
            pageCount: book.pageCount,
            status: updates.status ?? book.status,
            currentPage: updates.currentPage ?? book.currentPage,
            rating: updates.rating ?? book.rating,
            addedAt: book.addedAt,
            finishedAt: updates.finishedAt ?? book.finishedAt
        )
        
        // Update storage
        books[id] = book
        if let userBooksArray = userBooks[book.userId] {
            userBooks[book.userId] = userBooksArray.map { $0.id == id ? book : $0 }
        }
        
        return book
    }
    
    func delete(_ id: String) async throws -> Bool {
        deleteCallCount += 1
        lastDeletedBookId = id
        
        if shouldThrowOnDelete {
            if let error = deleteError {
                throw error
            }
            throw DomainError.notFound("Book not found")
        }
        
        if shouldReturnFalseOnDelete {
            return false
        }
        
        guard let book = books[id] else {
            return false
        }
        
        books.removeValue(forKey: id)
        if let userBooksArray = userBooks[book.userId] {
            userBooks[book.userId] = userBooksArray.filter { $0.id != id }
        }
        
        return true
    }
    
    func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book] {
        findByStatusCallCount += 1
        lastQueriedUserId = userId
        lastQueriedStatus = status
        
        if let error = findByStatusError {
            throw error
        }
        
        return userBooks[userId]?.filter { $0.status == status } ?? []
    }
}
