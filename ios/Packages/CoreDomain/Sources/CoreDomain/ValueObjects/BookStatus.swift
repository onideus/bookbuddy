import Foundation

/// Represents the current reading status of a book
public enum BookStatus: String, Codable, CaseIterable, Equatable, Hashable, Sendable {
    /// User wants to read this book in the future
    case wantToRead = "want-to-read"

    /// User is currently reading this book
    case reading

    /// User has finished reading this book
    case read

    /// Display name for the status
    public var displayName: String {
        switch self {
        case .wantToRead:
            "Want to Read"
        case .reading:
            "Reading"
        case .read:
            "Read"
        }
    }

    /// Icon name (SF Symbol) for the status
    public var iconName: String {
        switch self {
        case .wantToRead:
            "bookmark"
        case .reading:
            "book"
        case .read:
            "checkmark.circle.fill"
        }
    }

    /// Color associated with the status (for UI purposes)
    public var colorName: String {
        switch self {
        case .wantToRead:
            "blue"
        case .reading:
            "orange"
        case .read:
            "green"
        }
    }
}
