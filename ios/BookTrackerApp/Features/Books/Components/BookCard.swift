import CoreDomain
import SwiftUI

struct BookCard: View {
    let book: Book
    let onUpdate: (Book, BookUpdate) -> Void
    let onDelete: (Book) -> Void

    @State private var showingPageUpdate = false
    @State private var showingDeleteConfirmation = false
    @State private var currentPageInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                // Book thumbnail
                if let thumbnail = book.thumbnail, let url = URL(string: thumbnail) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        PlaceholderBookCover()
                    }
                    .frame(width: 80, height: 112)
                    .cornerRadius(8)
                } else {
                    PlaceholderBookCover()
                        .frame(width: 80, height: 112)
                        .cornerRadius(8)
                }

                // Book info
                VStack(alignment: .leading, spacing: 6) {
                    Text(book.title)
                        .font(.headline)
                        .lineLimit(2)

                    Text(book.authors.joined(separator: ", "))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    // Status picker
                    Menu {
                        Button("Want to Read") {
                            updateStatus(.wantToRead)
                        }
                        Button("Reading") {
                            updateStatus(.reading)
                        }
                        Button("Read") {
                            updateStatus(.read)
                        }
                    } label: {
                        HStack {
                            Text(book.status.displayName)
                                .font(.caption)
                            Image(systemName: "chevron.down")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(6)
                    }
                }

                Spacer()

                // Delete button
                Button(
                    action: { showingDeleteConfirmation = true },
                    label: {
                        Image(systemName: "trash")
                            .foregroundColor(.gray)
                    }
                )
                .buttonStyle(.plain)
            }

            // Reading progress (for books being read)
            if book.status == .reading, let pageCount = book.pageCount {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(book.currentPage ?? 0) / \(pageCount) pages")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Spacer()

                        Button("Update") {
                            currentPageInput = String(book.currentPage ?? 0)
                            showingPageUpdate = true
                        }
                        .font(.caption)
                        .foregroundColor(.blue)
                    }

                    ProgressView(value: readingProgress, total: 1.0)
                        .tint(.blue)
                }
            }

            // Rating (for completed books)
            if book.status == .read {
                HStack(spacing: 4) {
                    ForEach(1 ... 5, id: \.self) { star in
                        Button(
                            action: { updateRating(star) },
                            label: {
                                Image(systemName: star <= (book.rating ?? 0) ? "star.fill" : "star")
                                    .foregroundColor(star <= (book.rating ?? 0) ? .yellow : .gray)
                                    .font(.caption)
                            }
                        )
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .alert("Update Page", isPresented: $showingPageUpdate) {
            TextField("Current Page", text: $currentPageInput)
                .keyboardType(.numberPad)
            Button("Cancel", role: .cancel) {}
            Button("Update") {
                updateCurrentPage()
            }
        } message: {
            if let pageCount = book.pageCount {
                Text("Enter your current page (out of \(pageCount))")
            }
        }
        .confirmationDialog(
            "Delete Book",
            isPresented: $showingDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                onDelete(book)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete \"\(book.title)\"?")
        }
    }

    // MARK: - Computed Properties

    private var readingProgress: Double {
        guard let pageCount = book.pageCount, pageCount > 0,
              let currentPage = book.currentPage else {
            return 0.0
        }
        return Double(currentPage) / Double(pageCount)
    }

    // MARK: - Actions

    private func updateStatus(_ status: BookStatus) {
        var updates = BookUpdate()
        updates.status = status

        // Auto-set finishedAt when marking as read
        if status == .read, book.status != .read {
            updates.finishedAt = Date()
        }

        onUpdate(book, updates)
    }

    private func updateRating(_ rating: Int) {
        var updates = BookUpdate()
        updates.rating = rating
        onUpdate(book, updates)
    }

    private func updateCurrentPage() {
        guard let page = Int(currentPageInput),
              page >= 0,
              let pageCount = book.pageCount,
              page <= pageCount else {
            return
        }

        var updates = BookUpdate()
        updates.currentPage = page

        // Auto-complete if reached last page
        if page == pageCount, book.status != .read {
            updates.status = .read
            updates.finishedAt = Date()
        }

        onUpdate(book, updates)
    }
}

// MARK: - Placeholder View

struct PlaceholderBookCover: View {
    var body: some View {
        ZStack {
            Color.gray.opacity(0.2)
            Image(systemName: "book.fill")
                .font(.largeTitle)
                .foregroundColor(.gray.opacity(0.5))
        }
    }
}

// MARK: - Preview

#Preview {
    let sampleBook = Book(
        id: "1",
        userId: "user1",
        googleBooksId: "abc123",
        title: "The Pragmatic Programmer",
        authors: ["Andrew Hunt", "David Thomas"],
        thumbnail: nil,
        description: "A great book about programming",
        pageCount: 352,
        status: .reading,
        currentPage: 150,
        rating: nil,
        addedAt: Date(),
        finishedAt: nil
    )

    VStack {
        BookCard(
            book: sampleBook,
            onUpdate: { _, _ in },
            onDelete: { _ in }
        )
        .padding()
    }
}
