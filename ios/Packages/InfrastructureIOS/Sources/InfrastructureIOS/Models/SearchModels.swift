import CoreDomain
import Foundation

// MARK: - Response Models

public struct SearchBooksResponse: Decodable {
    public let books: [ExternalBookDTO]

    public init(books: [ExternalBookDTO]) {
        self.books = books
    }
}

// MARK: - DTO Models

public struct ExternalBookDTO: Codable {
    public let googleBooksId: String
    public let title: String
    public let authors: [String]
    public let thumbnail: String?
    public let description: String?
    public let pageCount: Int?
    public let publishedDate: String?
    public let publisher: String?

    public init(
        googleBooksId: String,
        title: String,
        authors: [String],
        thumbnail: String?,
        description: String?,
        pageCount: Int?,
        publishedDate: String?,
        publisher: String?
    ) {
        self.googleBooksId = googleBooksId
        self.title = title
        self.authors = authors
        self.thumbnail = thumbnail
        self.description = description
        self.pageCount = pageCount
        self.publishedDate = publishedDate
        self.publisher = publisher
    }
}

// MARK: - Domain Conversion
extension ExternalBookDTO {
    public func toDomain() -> BookSearchResult {
        return BookSearchResult(
            id: googleBooksId,
            volumeInfo: VolumeInfo(
                title: title,
                authors: authors,
                description: description,
                imageLinks: thumbnail != nil ? ImageLinks(thumbnail: thumbnail) : nil,
                pageCount: pageCount
            )
        )
    }
}
