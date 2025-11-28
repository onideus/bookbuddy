import CoreDomain
import SwiftUI

struct BookDetailView: View {
    let book: Book
    let onUpdate: (Book, BookUpdate) -> Void
    let onDelete: (Book) -> Void

    @Environment(\.dismiss) var dismiss

    @State private var showingPageUpdate = false
    @State private var showingDeleteConfirmation = false
    @State private var currentPageInput = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header with cover and basic info
                HStack(alignment: .top, spacing: 16) {
                    // Book cover
                    if let thumbnail = book.thumbnail, let url = URL(string: thumbnail) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            PlaceholderBookCover()
                        }
                        .frame(width: 120, height: 168)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                    } else {
                        PlaceholderBookCover()
                            .frame(width: 120, height: 168)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                    }

                    // Basic info
                    VStack(alignment: .leading, spacing: 8) {
                        Text(book.title)
                            .font(.title2)
                            .fontWeight(.bold)
                            .lineLimit(3)

                        Text(book.authors.joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        if let pageCount = book.pageCount {
                            Text("\(pageCount) pages")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        // Genres
                        if !book.genres.isEmpty {
                            GenreChips(genres: Array(book.genres.prefix(3)))
                        }

                        Spacer()
                    }
                }
                .padding(.bottom, 8)

                // Full Genres Section (if more than 3)
                if !book.genres.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Genres")
                            .font(.headline)

                        FlowLayout(spacing: 8) {
                            ForEach(book.genres, id: \.self) { genre in
                                GenreChip(genre: genre)
                            }
                        }
                    }
                }

                Divider()

                // Status Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Reading Status")
                        .font(.headline)

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
                                .foregroundColor(.primary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                    }
                }

                // Reading Progress (for books being read)
                if book.status == .reading {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Reading Progress")
                                .font(.headline)

                            Spacer()

                            Button("Update") {
                                currentPageInput = String(book.currentPage ?? 0)
                                showingPageUpdate = true
                            }
                            .font(.subheadline)
                            .foregroundColor(.blue)
                        }

                        if let pageCount = book.pageCount {
                            HStack {
                                Text("\(book.currentPage ?? 0) / \(pageCount) pages")
                                    .font(.body)

                                Spacer()

                                Text(book.readingProgressPercentage)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }

                            ProgressView(value: readingProgress, total: 1.0)
                                .tint(.blue)
                                .frame(height: 8)
                        } else {
                            Text("Page count not available")
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Rating (for completed books)
                if book.status == .read {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Your Rating")
                            .font(.headline)

                        HStack(spacing: 12) {
                            ForEach(1 ... 5, id: \.self) { star in
                                Button(
                                    action: { updateRating(star) },
                                    label: {
                                        Image(systemName: star <= (book.rating ?? 0) ? "star.fill" : "star")
                                            .foregroundColor(star <= (book.rating ?? 0) ? .yellow : .gray)
                                            .font(.title2)
                                    }
                                )
                                .buttonStyle(.plain)
                            }

                            if let rating = book.rating {
                                Text("\(rating) / 5")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .padding(.leading, 8)
                            }
                        }
                    }

                    if let finishedAt = book.finishedAt {
                        Text("Finished on \(finishedAt.formatted(date: .long, time: .omitted))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Description
                if let description = book.description {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Description")
                            .font(.headline)

                        Text(description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                }

                // Metadata
                Divider()

                VStack(alignment: .leading, spacing: 8) {
                    Text("Details")
                        .font(.headline)

                    HStack {
                        Text("Added")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(book.addedAt.formatted(date: .long, time: .omitted))
                    }
                    .font(.body)
                }

                Spacer()

                // Delete button
                Button(
                    action: { showingDeleteConfirmation = true },
                    label: {
                        Label("Delete Book", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.red)
                            .cornerRadius(10)
                    }
                )
            }
            .padding()
        }
        .navigationTitle("Book Details")
        .navigationBarTitleDisplayMode(.inline)
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
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete \"\(book.title)\"? This action cannot be undone.")
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
        // Auto-set finishedAt when marking as read
        let finishedAt = (status == .read && book.status != .read) ? Date() : nil

        let updates = BookUpdate(
            status: status,
            finishedAt: finishedAt
        )

        onUpdate(book, updates)
    }

    private func updateRating(_ rating: Int) {
        let updates = BookUpdate(rating: rating)
        onUpdate(book, updates)
    }

    private func updateCurrentPage() {
        guard let page = Int(currentPageInput),
              page >= 0,
              let pageCount = book.pageCount,
              page <= pageCount else {
            return
        }

        // Auto-complete if reached last page
        let shouldComplete = page == pageCount && book.status != .read
        let updates = BookUpdate(
            status: shouldComplete ? .read : nil,
            currentPage: page,
            finishedAt: shouldComplete ? Date() : nil
        )

        onUpdate(book, updates)
    }
}

// MARK: - Preview

#Preview {
    let sampleBook = Book(
        id: "1",
        userId: "user1",
        googleBooksId: "abc123",
        title: "The Pragmatic Programmer: Your Journey to Mastery",
        authors: ["Andrew Hunt", "David Thomas"],
        thumbnail: nil,
        description: "The Pragmatic Programmer is one of those rare tech books you'll read, re-read, and read again over the years. Whether you're new to the field or an experienced practitioner, you'll come away with fresh insights each and every time.",
        pageCount: 352,
        status: .reading,
        currentPage: 150,
        rating: nil,
        addedAt: Date(),
        finishedAt: nil
    )

    NavigationView {
        BookDetailView(
            book: sampleBook,
            onUpdate: { _, _ in },
            onDelete: { _ in }
        )
    }
}
