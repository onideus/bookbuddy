//
//  ExternalBookSearchProtocol.swift
//  CoreDomain
//
//  Protocol for external book search operations (e.g., Google Books API)
//

import Foundation

/// Represents a book search result from an external API
public struct BookSearchResult: Codable, Equatable, Hashable {
    /// External API book ID
    public let id: String

    /// Volume information
    public let volumeInfo: VolumeInfo

    public init(id: String, volumeInfo: VolumeInfo) {
        self.id = id
        self.volumeInfo = volumeInfo
    }
}

/// Book volume information from external API
public struct VolumeInfo: Codable, Equatable, Hashable {
    /// Book title
    public let title: String

    /// List of authors
    public let authors: [String]?

    /// Book description
    public let description: String?

    /// Image links
    public let imageLinks: ImageLinks?

    /// Page count
    public let pageCount: Int?

    public init(
        title: String,
        authors: [String]? = nil,
        description: String? = nil,
        imageLinks: ImageLinks? = nil,
        pageCount: Int? = nil
    ) {
        self.title = title
        self.authors = authors
        self.description = description
        self.imageLinks = imageLinks
        self.pageCount = pageCount
    }
}

/// Image links for book covers
public struct ImageLinks: Codable, Equatable, Hashable {
    /// Thumbnail URL
    public let thumbnail: String?

    public init(thumbnail: String? = nil) {
        self.thumbnail = thumbnail
    }
}

/// Protocol for searching external book databases
public protocol ExternalBookSearchProtocol {
    /// Searches for books by query string
    /// - Parameter query: Search query (title, author, ISBN, etc.)
    /// - Returns: Array of book search results
    /// - Throws: Error if search fails
    func search(_ query: String) async throws -> [BookSearchResult]

    /// Gets detailed information for a specific book
    /// - Parameter id: External book ID
    /// - Returns: Book search result with full details
    /// - Throws: Error if operation fails
    func getById(_ id: String) async throws -> BookSearchResult?
}
