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
    private var booksByUserId: [String: [Book]] = [:]
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnCreate = false
    var shouldThrowOnUpdate = false
    var shouldThrowOnDelete = false
    var shouldReturnNilOnFindById = false
    var shouldReturnNilOnUpdate = false
    
    var createError: Error?
    var updateError: Error?
    var deleteError: Error?
    var findByIdError: Error?
    var findByUserIdError: Error?
    var existsError: Error?
    
    // MARK: - Call Tracking
    
    private(set) var createCallCount = 0
    private(set) var updateCallCount = 0
    private(set) var deleteCallCount = 0
    private(set) var findByIdCallCount = 0
    private(set) var findByUserIdCallCount = 0
    private(set) var existsCallCount = 0
    
    private(set) var lastCreatedBook: Book?
    private(set) var lastUpdatedBookId: String?
    private(set) var lastUpdatedBookUpdates: BookUpdate?
    private(set) var lastDeletedBookId: String?
    private(set) var lastQueriedId: String?
    private(set) var lastQueriedUserId: String?
    
    // MARK: - Setup Methods
    
    func reset() {
        books.removeAll()
        booksByUserId.removeAll()
        
        shouldThrowOnCreate = false
        shouldThrowOnUpdate = false
        shouldThrowOnDelete = false
        shouldReturnNilOnFindById = false
        shouldReturnNilOnUpdate = false
        
        createError = nil
        updateError = nil
        deleteError = nil
        findByIdError = nil
        findByUserIdError = nil
        existsError = nil
        
        createCallCount = 0
        updateCallCount = 0
        deleteCallCount = 0
        findByIdCallCount = 0
        findByUserIdCallCount = 0
        existsCallCount = 0
        
        lastCreatedBook = nil
        lastUpdatedBookId = nil
        lastUpdatedBookUpdates = nil
        lastDeletedBookId = nil
        lastQueriedId = nil
        lastQueriedUserId = nil
    }
    
    func addBook(_ book: Book) {
        books[book.id] = book
        if booksByUserId[book.userId] == nil {
            booksByUserId[book.userId] = []
        }
        booksByUserId[book.userId]?.append(book)
    }
    
    func addBooks(_ booksToAdd: [Book]) {
        for book in booksToAdd {
            addBook(book)
        }
    }
    
    // MARK: - BookRepositoryProtocol Implementation
    
    func findById(_ id: String) async throws -> Book? {
        findByIdCallCount += 1
        lastQueriedId = id
        
        if let error = findByIdError {
            throw error
        }
        
        if shouldReturnNilOnFindById {
            return nil
        }
        
        return books[id]
    }
    
    func findByUserId(_ userId: String) async throws -> [Book] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        return booksByUserId[userId] ?? []
    }
    
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Book] {
        findByUserIdCallCount += 1
        lastQueriedUserId = userId
        
        if let error = findByUserIdError {
            throw error
        }
        
        let allBooks = booksByUserId[userId] ?? []
        let actualLimit = limit ?? allBooks.count
        let endIndex = min(offset + actualLimit, allBooks.count)
        
        if offset >= allBooks.count {
            return []
        }
        
        return Array(allBooks[offset..<endIndex])
    }
    
    func create(_ book: Book) async throws -> Book {
        createCallCount += 1
        lastCreatedBook = book
        
        if shouldThrowOnCreate {
            if let error = createError {
                throw error
            }
            throw DomainError.duplicate("Book already exists")
        }
        
        addBook(book)
        return book
    }
    
    func update(_ id: String, updates: BookUpdate) async throws -> Book? {
        updateCallCount += 1
        lastUpdatedBookId = id
        lastUpdatedBookUpdates = updates
        
        if let error = updateError {
            throw error
        }
        
        if shouldThrowOnUpdate {
            throw DomainError.general("Update failed")
        }
        
        if shouldReturnNilOnUpdate {
            return nil
        }
        
        guard let existingBook = books[id] else {
            return nil
        }
        
        let updatedBook = Book(
            id: existingBook.id,
            userId: existingBook.userId,
            googleBooksId: existingBook.googleBooksId,
            title: existingBook.title,
            authors: existingBook.authors,
            thumbnail: existingBook.thumbnail,
            description: existingBook.description,
            pageCount: existingBook.pageCount,
            status: updates.status ?? existingBook.status,
            currentPage: updates.currentPage ?? existingBook.currentPage,
            rating: updates.rating ?? existingBook.rating,
            addedAt: existingBook.addedAt,
            finishedAt: updates.finishedAt ?? existingBook.finishedAt
        )
        
        books[id] = updatedBook
        
        // Update in userId dictionary
        if var userBooks = booksByUserId[existingBook.userId],
           let index = userBooks.firstIndex(where: { $0.id == id }) {
            userBooks[index] = updatedBook
            booksByUserId[existingBook.userId] = userBooks
        }
        
        return updatedBook
    }
    
    func delete(_ id: String) async throws -> Bool {
        deleteCallCount += 1
        lastDeletedBookId = id
        
        if let error = deleteError {
            throw error
        }
        
        if shouldThrowOnDelete {
            throw DomainError.general("Delete failed")
        }
        
        guard let book = books[id] else {
            return false
        }
        
        books.removeValue(forKey: id)
        booksByUserId[book.userId]?.removeAll { $0.id == id }
        
        return true
    }
    
    func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book] {
        let userBooks = booksByUserId[userId] ?? []
        return userBooks.filter { $0.status == status }
    }
    
    func exists(userId: String, googleBooksId: String) async throws -> Bool {
        existsCallCount += 1
        
        if let error = existsError {
            throw error
        }
        
        let userBooks = booksByUserId[userId] ?? []
        return userBooks.contains { $0.googleBooksId == googleBooksId }
    }
}
