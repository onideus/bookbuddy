import Foundation

/// Errors that can occur during API interactions
public enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case decodingError(Error)
    case encodingError(Error)
    case httpError(statusCode: Int, message: String?)
    case networkError(Error)
    case unauthorized
    case notFound
    case serverError
    case unknown

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .httpError(let statusCode, let message):
            if let message = message {
                return "HTTP \(statusCode): \(message)"
            }
            return "HTTP error \(statusCode)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .notFound:
            return "Resource not found"
        case .serverError:
            return "Server error occurred"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

/// Error response format from the API
struct ErrorResponse: Decodable {
    let error: String
    let message: String?
    let statusCode: Int?
}
