//
//  MockExternalBookSearch.swift
//  ApplicationTests
//
//  Mock implementation of ExternalBookSearchProtocol for testing
//

import Foundation
@testable import CoreDomain

struct MockSearchResult: Sendable {
    let id: String
    let title: String
    let authors: [String]
    let thumbnail: String?
    let description: String?
    let pageCount: Int?
}

final class MockExternalBookSearch: ExternalBookSearchProtocol, @unchecked Sendable {
    
    // MARK: - Mock Behavior Configuration
    
    var shouldThrowOnSearch = false
    var shouldReturnEmptyResults = false
    
    var searchError: Error?
    var mockResults: [MockSearchResult] = []
    
    // MARK: - Call Tracking
    
    private(set) var searchCallCount = 0
    private(set) var lastSearchQuery: String?
    
    // MARK: - Setup Methods
    
    func reset() {
        shouldThrowOnSearch = false
        shouldReturnEmptyResults = false
        
        searchError = nil
        mockResults.removeAll()
        
        searchCallCount = 0
        lastSearchQuery = nil
    }
    
    func addMockResult(_ result: MockSearchResult) {
        mockResults.append(result)
    }
    
    func addMockResults(_ results: [MockSearchResult]) {
        mockResults.append(contentsOf: results)
    }
    
    // MARK: - ExternalBookSearchProtocol Implementation
    
    func search(_ query: String) async throws -> [BookSearchResult] {
        searchCallCount += 1
        lastSearchQuery = query
        
        if shouldThrowOnSearch {
            if let error = searchError {
                throw error
            }
            throw DomainError.general("External search service unavailable")
        }
        
        if shouldReturnEmptyResults {
            return []
        }
        
        // Convert mock results to BookSearchResult
        return mockResults.map { mockResult in
            BookSearchResult(
                id: mockResult.id,
                volumeInfo: VolumeInfo(
                    title: mockResult.title,
                    authors: mockResult.authors,
                    description: mockResult.description,
                    imageLinks: mockResult.thumbnail.map { ImageLinks(thumbnail: $0) },
                    pageCount: mockResult.pageCount
                )
            )
        }
    }
    
    func getById(_ id: String) async throws -> BookSearchResult? {
        searchCallCount += 1
        
        if shouldThrowOnSearch {
            if let error = searchError {
                throw error
            }
            throw DomainError.general("External search service unavailable")
        }
        
        // Find result by ID
        guard let mockResult = mockResults.first(where: { $0.id == id }) else {
            return nil
        }
        
        return BookSearchResult(
            id: mockResult.id,
            volumeInfo: VolumeInfo(
                title: mockResult.title,
                authors: mockResult.authors,
                description: mockResult.description,
                imageLinks: mockResult.thumbnail.map { ImageLinks(thumbnail: $0) },
                pageCount: mockResult.pageCount
            )
        )
    }
}