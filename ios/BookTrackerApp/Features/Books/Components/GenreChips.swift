import SwiftUI

/// A horizontal scrollable list of genre chips
struct GenreChips: View {
    let genres: [String]
    var onTap: ((String) -> Void)?

    var body: some View {
        if !genres.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(genres, id: \.self) { genre in
                        GenreChip(genre: genre, onTap: onTap)
                    }
                }
            }
        }
    }
}

/// A single genre chip
struct GenreChip: View {
    let genre: String
    var isSelected = false
    var onTap: ((String) -> Void)?

    var body: some View {
        Button {
            onTap?(genre)
        } label: {
            Text(genre)
                .font(.caption2)
                .fontWeight(.medium)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(isSelected ? Color.purple : Color.purple.opacity(0.1))
                .foregroundColor(isSelected ? .white : .purple)
                .cornerRadius(12)
        }
        .buttonStyle(.plain)
        .disabled(onTap == nil)
    }
}

/// A view for selecting genres from a list
struct GenreSelector: View {
    @Binding var selectedGenres: [String]
    let availableGenres: [String]
    @State private var newGenre = ""
    @State private var showingAddGenre = false

    private let commonGenres = [
        "Fiction", "Non-Fiction", "Mystery", "Science Fiction",
        "Fantasy", "Romance", "Thriller", "Biography",
        "Self-Help", "History", "Science", "Technology",
        "Business", "Philosophy", "Psychology", "Poetry"
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Genres")
                .font(.headline)

            // Selected genres
            if !selectedGenres.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(selectedGenres, id: \.self) { genre in
                        SelectedGenreChip(genre: genre) {
                            selectedGenres.removeAll { $0 == genre }
                        }
                    }
                }
            }

            // Available genres to add
            let genresToShow = allAvailableGenres.filter { !selectedGenres.contains($0) }
            if !genresToShow.isEmpty {
                Text("Add genres:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                FlowLayout(spacing: 8) {
                    ForEach(genresToShow, id: \.self) { genre in
                        Button {
                            selectedGenres.append(genre)
                        } label: {
                            Text(genre)
                                .font(.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.gray.opacity(0.1))
                                .foregroundColor(.primary)
                                .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Add custom genre
            HStack {
                TextField("Add custom genre", text: $newGenre)
                    .textFieldStyle(.roundedBorder)

                Button("Add") {
                    let trimmed = newGenre.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !trimmed.isEmpty, !selectedGenres.contains(trimmed) {
                        selectedGenres.append(trimmed)
                        newGenre = ""
                    }
                }
                .disabled(newGenre.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    private var allAvailableGenres: [String] {
        Array(Set(commonGenres + availableGenres)).sorted()
    }
}

/// A selected genre chip with remove button
private struct SelectedGenreChip: View {
    let genre: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(genre)
                .font(.caption)
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption2)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.purple.opacity(0.15))
        .foregroundColor(.purple)
        .cornerRadius(12)
    }
}

/// A flow layout that wraps items to the next line
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal _: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(
                at: CGPoint(
                    x: bounds.minX + result.positions[index].x,
                    y: bounds.minY + result.positions[index].y
                ),
                proposal: .unspecified
            )
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > maxWidth, x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }
            size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        GenreChips(genres: ["Fiction", "Mystery", "Thriller"])

        GenreSelector(
            selectedGenres: .constant(["Fiction", "Mystery"]),
            availableGenres: ["Sci-Fi", "Fantasy"]
        )
    }
    .padding()
}
