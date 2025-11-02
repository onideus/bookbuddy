import Application
import Combine
import CoreDomain
import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel: BooksListViewModel

    init() {
        let repository = PreviewBookRepository()
        _viewModel = StateObject(wrappedValue: BooksListViewModel(
            getUserBooksUseCase: GetUserBooksUseCase(bookRepository: repository),
            updateBookUseCase: UpdateBookUseCase(bookRepository: repository),
            deleteBookUseCase: DeleteBookUseCase(bookRepository: repository),
            currentUserId: "preview-user"
        ))
    }

    var body: some View {
        NavigationStack {
            BooksListView(viewModel: viewModel)
        }
    }
}

// MARK: - Preview Repository

/// Temporary repository for preview/development
@MainActor
class PreviewBookRepository: BookRepositoryProtocol {
    var books: [Book]

    init() {
        // Initialize with sample books
        books = PreviewBookRepository.createSampleBooks()
    }

    func create(_ book: Book) async throws -> Book {
        books.append(book)
        return book
    }

    func findByUserId(_ userId: String) async throws -> [Book] {
        books.filter { $0.userId == userId }
    }

    func findById(_ id: String) async throws -> Book? {
        books.first { $0.id == id }
    }

    func findByStatus(_ userId: String, status: BookStatus) async throws -> [Book] {
        books.filter { $0.userId == userId && $0.status == status }
    }

    func update(_ id: String, updates: BookUpdate) async throws -> Book? {
        guard let index = books.firstIndex(where: { $0.id == id }) else {
            return nil
        }

        let oldBook = books[index]

        // Create new book with updates applied
        let updatedBook = Book(
            id: oldBook.id,
            userId: oldBook.userId,
            googleBooksId: oldBook.googleBooksId,
            title: oldBook.title,
            authors: oldBook.authors,
            thumbnail: oldBook.thumbnail,
            description: oldBook.description,
            pageCount: oldBook.pageCount,
            status: updates.status ?? oldBook.status,
            currentPage: updates.currentPage ?? oldBook.currentPage,
            rating: updates.rating ?? oldBook.rating,
            addedAt: oldBook.addedAt,
            finishedAt: updates.finishedAt ?? oldBook.finishedAt
        )

        books[index] = updatedBook
        return updatedBook
    }

    func delete(_ id: String) async throws -> Bool {
        guard let index = books.firstIndex(where: { $0.id == id }) else {
            return false
        }
        books.remove(at: index)
        return true
    }

    static func createSampleBooks() -> [Book] {
        [
            Book(
                id: "1",
                userId: "preview-user",
                googleBooksId: "abc123",
                title: "The Pragmatic Programmer",
                authors: ["Andrew Hunt", "David Thomas"],
                thumbnail: "https://books.google.com/books/content?id=5wBQEp6ruIAC&printsec=frontcover&img=1&zoom=1",
                description: "Your Journey To Mastery",
                pageCount: 352,
                status: .reading,
                currentPage: 150,
                rating: nil,
                addedAt: Date(),
                finishedAt: nil
            ),
            Book(
                id: "2",
                userId: "preview-user",
                googleBooksId: "def456",
                title: "Clean Code",
                authors: ["Robert C. Martin"],
                thumbnail: "https://books.google.com/books/content?id=hjEFCAAAQBAJ&printsec=frontcover&img=1&zoom=1",
                description: "A Handbook of Agile Software Craftsmanship",
                pageCount: 464,
                status: .read,
                currentPage: 464,
                rating: 5,
                addedAt: Date().addingTimeInterval(-86400 * 7),
                finishedAt: Date().addingTimeInterval(-86400 * 2)
            ),
            Book(
                id: "3",
                userId: "preview-user",
                googleBooksId: "ghi789",
                title: "Design Patterns",
                authors: ["Erich Gamma", "Richard Helm", "Ralph Johnson", "John Vlissides"],
                thumbnail: nil,
                description: "Elements of Reusable Object-Oriented Software",
                pageCount: 416,
                status: .wantToRead,
                currentPage: nil,
                rating: nil,
                addedAt: Date().addingTimeInterval(-86400 * 14),
                finishedAt: nil
            ),
        ]
    }
}
