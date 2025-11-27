import CoreDomain
import Foundation

// MARK: - Request Models

public struct AddBookRequest: Encodable {
    public let googleBooksId: String
    public let title: String
    public let authors: [String]?
    public let thumbnail: String?
    public let description: String?
    public let pageCount: Int?
    public let status: String

    public init(
        googleBooksId: String,
        title: String,
        authors: [String]?,
        thumbnail: String?,
        description: String?,
        pageCount: Int?,
        status: BookStatus
    ) {
        self.googleBooksId = googleBooksId
        self.title = title
        self.authors = authors
        self.thumbnail = thumbnail
        self.description = description
        self.pageCount = pageCount
        self.status = status.rawValue
    }
}

public struct UpdateBookRequest: Encodable {
    public let status: String?
    public let currentPage: Int?
    public let rating: Int?
    public let finishedAt: Date?
    public let genres: [String]?

    public init(
        status: BookStatus? = nil,
        currentPage: Int? = nil,
        rating: Int? = nil,
        finishedAt: Date? = nil,
        genres: [String]? = nil
    ) {
        self.status = status?.rawValue
        self.currentPage = currentPage
        self.rating = rating
        self.finishedAt = finishedAt
        self.genres = genres
    }
}

// MARK: - Response Models

public struct GetBooksResponse: Decodable {
    public let books: [BookDTO]

    public init(books: [BookDTO]) {
        self.books = books
    }
}

public struct AddBookResponse: Decodable {
    public let book: BookDTO

    public init(book: BookDTO) {
        self.book = book
    }
}

public struct UpdateBookResponse: Decodable {
    public let book: BookDTO

    public init(book: BookDTO) {
        self.book = book
    }
}

public struct DeleteBookResponse: Decodable {
    public let message: String

    public init(message: String) {
        self.message = message
    }
}

// MARK: - DTO Models

public struct BookDTO: Codable {
    public let id: String
    public let userId: String
    public let googleBooksId: String
    public let title: String
    public let authors: [String]
    public let thumbnail: String?
    public let description: String?
    public let pageCount: Int?
    public let status: String
    public let currentPage: Int?
    public let rating: Int?
    public let finishedAt: Date?
    public let addedAt: Date
    public let genres: [String]?

    public init(
        id: String,
        userId: String,
        googleBooksId: String,
        title: String,
        authors: [String],
        thumbnail: String?,
        description: String?,
        pageCount: Int?,
        status: String,
        currentPage: Int?,
        rating: Int?,
        finishedAt: Date?,
        addedAt: Date,
        genres: [String]? = nil
    ) {
        self.id = id
        self.userId = userId
        self.googleBooksId = googleBooksId
        self.title = title
        self.authors = authors
        self.thumbnail = thumbnail
        self.description = description
        self.pageCount = pageCount
        self.status = status
        self.currentPage = currentPage
        self.rating = rating
        self.finishedAt = finishedAt
        self.addedAt = addedAt
        self.genres = genres
    }
}

// MARK: - Domain Conversion

public extension BookDTO {
    func toDomain() throws -> Book {
        guard let bookStatus = BookStatus(rawValue: status) else {
            throw DomainError.validation("Invalid book status: \(status)")
        }

        return Book(
            id: id,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title,
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: bookStatus,
            currentPage: currentPage,
            rating: rating,
            addedAt: addedAt,
            finishedAt: finishedAt,
            genres: genres ?? []
        )
    }
}

public extension Book {
    func toDTO() -> BookDTO {
        BookDTO(
            id: id,
            userId: userId,
            googleBooksId: googleBooksId,
            title: title,
            authors: authors,
            thumbnail: thumbnail,
            description: description,
            pageCount: pageCount,
            status: status.rawValue,
            currentPage: currentPage,
            rating: rating,
            finishedAt: finishedAt,
            addedAt: addedAt,
            genres: genres
        )
    }
}
