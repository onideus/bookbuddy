import CoreDomain
import SwiftUI

struct BookSearchResultCard: View {
    let searchResult: BookSearchResult
    let onAdd: (BookSearchResult, BookStatus) -> Void

    @State private var showingStatusPicker = false
    @State private var selectedStatus: BookStatus = .wantToRead

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Book thumbnail
            if let thumbnail = searchResult.volumeInfo.imageLinks?.thumbnail,
               let url = URL(string: thumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    PlaceholderBookCover()
                }
                .frame(width: 60, height: 84)
                .cornerRadius(6)
            } else {
                PlaceholderBookCover()
                    .frame(width: 60, height: 84)
                    .cornerRadius(6)
            }

            // Book info
            VStack(alignment: .leading, spacing: 6) {
                Text(searchResult.volumeInfo.title)
                    .font(.headline)
                    .lineLimit(2)

                if let authors = searchResult.volumeInfo.authors {
                    Text(authors.joined(separator: ", "))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                if let pageCount = searchResult.volumeInfo.pageCount {
                    Text("\(pageCount) pages")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let description = searchResult.volumeInfo.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .padding(.top, 2)
                }
            }

            Spacer()

            // Add button
            Button(
                action: { showingStatusPicker = true },
                label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
            )
            .buttonStyle(.plain)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        .confirmationDialog(
            "Add to Library",
            isPresented: $showingStatusPicker,
            titleVisibility: .visible
        ) {
            Button("Want to Read") {
                onAdd(searchResult, .wantToRead)
            }
            Button("Reading") {
                onAdd(searchResult, .reading)
            }
            Button("Read") {
                onAdd(searchResult, .read)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("How would you like to add \"\(searchResult.volumeInfo.title)\"?")
        }
    }
}

// MARK: - Preview

#Preview {
    let sampleResult = BookSearchResult(
        id: "abc123",
        volumeInfo: VolumeInfo(
            title: "The Pragmatic Programmer",
            authors: ["Andrew Hunt", "David Thomas"],
            description: "A great book about programming best practices and becoming a better developer.",
            imageLinks: nil,
            pageCount: 352
        )
    )

    VStack {
        BookSearchResultCard(
            searchResult: sampleResult,
            onAdd: { _, _ in }
        )
        .padding()
    }
}
