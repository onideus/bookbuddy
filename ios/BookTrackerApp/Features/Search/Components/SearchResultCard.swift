import CoreDomain
import SwiftUI

struct SearchResultCard: View {
    let book: BookSearchResult
    let onAdd: (BookStatus) -> Void

    @State private var showingAddOptions = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Book cover
            if let thumbnail = book.volumeInfo.imageLinks?.thumbnail,
               let url = URL(string: thumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    placeholderCover
                }
                .frame(width: 60, height: 90)
                .cornerRadius(8)
            } else {
                placeholderCover
            }

            // Book info
            VStack(alignment: .leading, spacing: 4) {
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
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.2))

            Image(systemName: "book.fill")
                .font(.title3)
                .foregroundColor(.gray)
        }
        .frame(width: 60, height: 90)
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
            onAdd: { _ in }
        )
    }
    .padding()
}
