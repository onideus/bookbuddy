import CoreDomain
import SwiftUI

struct SearchResultCard: View {
    let book: BookSearchResult
    let isInLibrary: Bool
    let onAdd: (BookStatus) -> Void

    @State private var showingAddOptions = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                // Book thumbnail - matching BookCard dimensions
                if let thumbnail = book.volumeInfo.imageLinks?.thumbnail,
                   let url = URL(string: thumbnail) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        placeholderCover
                    }
                    .frame(width: 80, height: 112)
                    .cornerRadius(8)
                } else {
                    placeholderCover
                        .frame(width: 80, height: 112)
                        .cornerRadius(8)
                }

                // Book info - matching BookCard layout
                VStack(alignment: .leading, spacing: 6) {
                    Text(book.volumeInfo.title)
                        .font(.headline)
                        .lineLimit(2)

                    if let authors = book.volumeInfo.authors, !authors.isEmpty {
                        Text(authors.joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let pageCount = book.volumeInfo.pageCount {
                        Text("\(pageCount) pages")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Show "In Library" badge or "Add to Library" button
                    if isInLibrary {
                        Label("In Library", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.green)
                    } else {
                        Button {
                            showingAddOptions = true
                        } label: {
                            Label("Add to Library", systemImage: "plus.circle.fill")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }

                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .confirmationDialog("Add to Library", isPresented: $showingAddOptions) {
            Button("Want to Read") {
                onAdd(.wantToRead)
            }

            Button("Currently Reading") {
                onAdd(.reading)
            }

            Button("Finished") {
                onAdd(.read)
            }

            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Choose a shelf for this book")
        }
    }

    // MARK: - Subviews

    private var placeholderCover: some View {
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
    VStack(spacing: 16) {
        SearchResultCard(
            book: BookSearchResult(
                id: "1",
                volumeInfo: VolumeInfo(
                    title: "The Great Gatsby",
                    authors: ["F. Scott Fitzgerald"],
                    description: "A classic novel about the American Dream",
                    imageLinks: ImageLinks(thumbnail: nil),
                    pageCount: 180
                )
            ),
            isInLibrary: false,
            onAdd: { _ in }
        )

        SearchResultCard(
            book: BookSearchResult(
                id: "2",
                volumeInfo: VolumeInfo(
                    title: "To Kill a Mockingbird",
                    authors: ["Harper Lee"],
                    description: nil,
                    imageLinks: nil,
                    pageCount: 324
                )
            ),
            isInLibrary: true,
            onAdd: { _ in }
        )
    }
    .padding()
}
