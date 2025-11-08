import Foundation

/// HTTP methods for API requests
public enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case put = "PUT"
    case delete = "DELETE"
}

/// Represents an API endpoint with all necessary information to make a request
public struct APIEndpoint {
    let path: String
    let method: HTTPMethod
    let queryItems: [URLQueryItem]?
    let body: Data?
    let headers: [String: String]
    let requiresAuth: Bool

    public init(
        path: String,
        method: HTTPMethod,
        queryItems: [URLQueryItem]? = nil,
        body: Data? = nil,
        headers: [String: String] = [:],
        requiresAuth: Bool = false
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = body
        self.headers = headers
        self.requiresAuth = requiresAuth
    }
}

// MARK: - Authentication Endpoints
extension APIEndpoint {
    public static func register(email: String, password: String, name: String) throws -> APIEndpoint {
        let request = ["email": email, "password": password, "name": name]
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/auth/register",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: false
        )
    }

    public static func login(email: String, password: String) throws -> APIEndpoint {
        let request = ["email": email, "password": password]
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/auth/login",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: false
        )
    }

    public static func refreshToken(refreshToken: String) throws -> APIEndpoint {
        let request = ["refreshToken": refreshToken]
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/auth/refresh",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: false
        )
    }

    public static func logout(refreshToken: String) throws -> APIEndpoint {
        let request = ["refreshToken": refreshToken]
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/auth/logout",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: false
        )
    }
}

// MARK: - Book Endpoints
extension APIEndpoint {
    public static func getBooks() -> APIEndpoint {
        return APIEndpoint(
            path: "/books",
            method: .get,
            requiresAuth: true
        )
    }

    public static func addBook(_ request: Encodable) throws -> APIEndpoint {
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/books",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    public static func updateBook(id: String, _ request: Encodable) throws -> APIEndpoint {
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/books/\(id)",
            method: .patch,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    public static func deleteBook(id: String) -> APIEndpoint {
        return APIEndpoint(
            path: "/books/\(id)",
            method: .delete,
            requiresAuth: true
        )
    }
}

// MARK: - Goal Endpoints
extension APIEndpoint {
    public static func getGoals() -> APIEndpoint {
        return APIEndpoint(
            path: "/goals",
            method: .get,
            requiresAuth: true
        )
    }

    public static func createGoal(_ request: Encodable) throws -> APIEndpoint {
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/goals",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    public static func updateGoal(id: String, _ request: Encodable) throws -> APIEndpoint {
        let body = try JSONEncoder().encode(request)

        return APIEndpoint(
            path: "/goals/\(id)",
            method: .patch,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    public static func deleteGoal(id: String) -> APIEndpoint {
        return APIEndpoint(
            path: "/goals/\(id)",
            method: .delete,
            requiresAuth: true
        )
    }
}

// MARK: - Search Endpoints
extension APIEndpoint {
    public static func searchBooks(query: String) -> APIEndpoint {
        let queryItem = URLQueryItem(name: "q", value: query)

        return APIEndpoint(
            path: "/search",
            method: .get,
            queryItems: [queryItem],
            requiresAuth: false
        )
    }
}
