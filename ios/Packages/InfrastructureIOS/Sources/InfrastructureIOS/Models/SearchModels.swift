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

/// Nested structure matching Google Books API response
public struct ExternalBookDTO: Codable {
    public let id: String
    public let volumeInfo: VolumeInfoDTO

    public init(id: String, volumeInfo: VolumeInfoDTO) {
        self.id = id
        self.volumeInfo = volumeInfo
    }
}

public struct VolumeInfoDTO: Codable {
    public let title: String
    public let authors: [String]?
    public let description: String?
    public let imageLinks: ImageLinksDTO?
    public let pageCount: Int?
    public let publishedDate: String?
    public let publisher: String?

    public init(
        title: String,
        authors: [String]?,
        description: String?,
        imageLinks: ImageLinksDTO?,
        pageCount: Int?,
        publishedDate: String?,
        publisher: String?
    ) {
        self.title = title
        self.authors = authors
        self.description = description
        self.imageLinks = imageLinks
        self.pageCount = pageCount
        self.publishedDate = publishedDate
        self.publisher = publisher
    }
}

public struct ImageLinksDTO: Codable {
    public let thumbnail: String?

    public init(thumbnail: String?) {
        self.thumbnail = thumbnail
    }
}

// MARK: - Domain Conversion
extension ExternalBookDTO {
    public func toDomain() -> BookSearchResult {
        // Convert HTTP thumbnail URLs to HTTPS for iOS App Transport Security
        let secureThumbna = volumeInfo.imageLinks?.thumbnail?.replacingOccurrences(of: "http://", with: "https://")

        return BookSearchResult(
            id: id,
            volumeInfo: VolumeInfo(
                title: volumeInfo.title,
                authors: volumeInfo.authors ?? [],
                description: volumeInfo.description,
                imageLinks: secureThumbna != nil
                    ? ImageLinks(thumbnail: secureThumbna)
                    : nil,
                pageCount: volumeInfo.pageCount
            )
        )
    }
}
