//
//  BookStatus.swift
//  CoreDomain
//
//  Value object representing the reading status of a book
//

import Foundation

/// Represents the current reading status of a book
public enum BookStatus: String, Codable, CaseIterable, Equatable, Hashable {
    /// User wants to read this book in the future
    case wantToRead = "want-to-read"

    /// User is currently reading this book
    case reading = "reading"

    /// User has finished reading this book
    case read = "read"

    /// Display name for the status
    public var displayName: String {
        switch self {
        case .wantToRead:
            return "Want to Read"
        case .reading:
            return "Reading"
        case .read:
            return "Read"
        }
    }

    /// Icon name (SF Symbol) for the status
    public var iconName: String {
        switch self {
        case .wantToRead:
            return "bookmark"
        case .reading:
            return "book"
        case .read:
            return "checkmark.circle.fill"
        }
    }

    /// Color associated with the status (for UI purposes)
    public var colorName: String {
        switch self {
        case .wantToRead:
            return "blue"
        case .reading:
            return "orange"
        case .read:
            return "green"
        }
    }
}
