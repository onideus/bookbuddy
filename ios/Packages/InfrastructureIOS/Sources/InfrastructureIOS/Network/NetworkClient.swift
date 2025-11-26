import Foundation

/// Protocol for network client to enable testing
public protocol NetworkClientProtocol: Sendable {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
    func request(_ endpoint: APIEndpoint) async throws
    func requestRaw(_ endpoint: APIEndpoint) async throws -> Data
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
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        // Configure JSON encoder for ISO8601 dates
        encoder = JSONEncoder()
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

    /// Make a request and return raw data (for exports, etc.)
    @available(iOS 15.0, macOS 12.0, *)
    public func requestRaw(_ endpoint: APIEndpoint) async throws -> Data {
        let urlRequest = try buildURLRequest(for: endpoint)

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try validateResponse(httpResponse, data: data)
        return data
    }

    // MARK: - Private Helpers

    private func buildURLRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: true) else {
            throw APIError.invalidURL
        }

        // Append the endpoint path to the base URL's path
        // This allows baseURL to include a path prefix like "/api"
        let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
        components.path = basePath + endpoint.path

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
        case 200 ... 299:
            // Success
            return

        case 401:
            throw APIError.unauthorized

        case 404:
            throw APIError.notFound

        case 400 ... 499:
            // Try to decode error message
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.httpError(
                    statusCode: response.statusCode,
                    message: errorResponse.message ?? errorResponse.error
                )
            }
            throw APIError.httpError(statusCode: response.statusCode, message: nil)

        case 500 ... 599:
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
public extension NetworkClient {
    /// Create a NetworkClient with the production configuration (Vercel)
    ///
    /// **Important:** After deploying to Vercel, replace `your-app-name` with your actual
    /// Vercel deployment URL. The URL should NOT include `/api` suffix because
    /// Vercel rewrites are configured to handle the routing.
    ///
    /// Example: `https://bookbuddy.vercel.app` or `https://your-custom-domain.com`
    static func production() -> NetworkClient {
        // TODO: Replace with your actual Vercel deployment URL after first deploy
        // Run `vercel` to deploy and get your URL
        let baseURL = URL(string: "https://bookbuddy-mk3.vercel.app/api")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Create a NetworkClient for development/testing with Vercel dev server
    ///
    /// Use this when running `vercel dev` locally (default port 3000).
    /// The Vercel dev server simulates the serverless environment.
    static func development() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:3000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Create a NetworkClient for local Fastify development (legacy)
    ///
    /// Use this when running the old Fastify server with `npm run dev:api`.
    /// This is kept for backwards compatibility during the migration period.
    static func legacyDevelopment() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Create a NetworkClient with a custom base URL
    ///
    /// Use this for testing against specific environments or custom deployments.
    static func custom(baseURL: String) -> NetworkClient {
        guard let url = URL(string: baseURL) else {
            fatalError("Invalid base URL: \(baseURL)")
        }
        return NetworkClient(baseURL: url)
    }
}
