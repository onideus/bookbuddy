import Foundation

// MARK: - Request Models

public struct ImportGoodreadsRequest: Encodable {
    public let csvContent: String

    public init(csvContent: String) {
        self.csvContent = csvContent
    }
}

// MARK: - Response Models

public struct ImportGoodreadsResponse: Decodable {
    public let success: Bool
    public let imported: Int
    public let skipped: Int
    public let message: String
    public let errors: [ImportError]?

    public init(
        success: Bool,
        imported: Int,
        skipped: Int,
        message: String,
        errors: [ImportError]? = nil
    ) {
        self.success = success
        self.imported = imported
        self.skipped = skipped
        self.message = message
        self.errors = errors
    }
}

public struct ImportError: Decodable {
    public let row: Int
    public let reason: String
    public let book: [String: AnyCodable]?

    public init(row: Int, reason: String, book: [String: AnyCodable]? = nil) {
        self.row = row
        self.reason = reason
        self.book = book
    }
}

// MARK: - AnyCodable Helper

/// A type-erased Codable value for handling dynamic JSON data
public struct AnyCodable: Codable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            value = Any?.none as Any
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map(\.value)
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "AnyCodable value cannot be decoded"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case is Void:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            let context = EncodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "AnyCodable value cannot be encoded"
            )
            throw EncodingError.invalidValue(value, context)
        }
    }
}
