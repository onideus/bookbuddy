import Foundation

/// Protocol for network client to enable testing
public protocol NetworkClientProtocol {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
    func request(_ endpoint: APIEndpoint) async throws
}

/// Network client for making HTTP requests
@available(iOS 15.0, macOS 12.0, *)
public final class NetworkClient: NetworkClientProtocol {
    private let baseURL: URL
    private let session: URLSession
    private let keychainManager: KeychainManager
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        keychainManager: KeychainManager = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        self.keychainManager = keychainManager

        // Configure JSON decoder to handle ISO8601 dates
        self.decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        // Configure JSON encoder for ISO8601 dates
        self.encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Public API

    /// Make a request and decode the response
    @available(iOS 15.0, macOS 12.0, *)
    public func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        let urlRequest = try buildURLRequest(for: endpoint)

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try validateResponse(httpResponse, data: data)

        do {
            let decoded = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// Make a request without expecting a decoded response (for DELETE, etc.)
    @available(iOS 15.0, macOS 12.0, *)
    public func request(_ endpoint: APIEndpoint) async throws {
        let urlRequest = try buildURLRequest(for: endpoint)

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try validateResponse(httpResponse, data: data)
    }

    // MARK: - Private Helpers

    private func buildURLRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: true) else {
            throw APIError.invalidURL
        }

        components.path = endpoint.path

        if let queryItems = endpoint.queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.httpBody = endpoint.body

        // Set default headers
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add custom headers
        for (key, value) in endpoint.headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        // Add authorization header if required
        if endpoint.requiresAuth {
            guard let accessToken = try keychainManager.getAccessToken() else {
                throw APIError.unauthorized
            }
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            // Success
            return

        case 401:
            throw APIError.unauthorized

        case 404:
            throw APIError.notFound

        case 400...499:
            // Try to decode error message
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.httpError(
                    statusCode: response.statusCode,
                    message: errorResponse.message ?? errorResponse.error
                )
            }
            throw APIError.httpError(statusCode: response.statusCode, message: nil)

        case 500...599:
            // Server error
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.httpError(
                    statusCode: response.statusCode,
                    message: errorResponse.message ?? errorResponse.error
                )
            }
            throw APIError.serverError

        default:
            throw APIError.unknown
        }
    }
}

// MARK: - Configuration
@available(iOS 15.0, macOS 12.0, *)
extension NetworkClient {
    /// Create a NetworkClient with the default production configuration
    public static func production() -> NetworkClient {
        // TODO: Replace with actual production URL
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Create a NetworkClient for development/testing
    public static func development() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }
}
