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

    public init(status: BookStatus? = nil, currentPage: Int? = nil) {
        self.status = status?.rawValue
        self.currentPage = currentPage
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
    public let createdAt: Date
    public let updatedAt: Date

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
        createdAt: Date,
        updatedAt: Date
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
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Domain Conversion
extension BookDTO {
    public func toDomain() throws -> Book {
        guard let bookStatus = BookStatus(rawValue: status) else {
            throw DomainError.validationError("Invalid book status: \(status)")
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
            finishedAt: finishedAt
        )
    }
}

extension Book {
    public func toDTO() -> BookDTO {
        return BookDTO(
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
            createdAt: Date(), // These aren't tracked in domain model
            updatedAt: Date()
        )
    }
}
