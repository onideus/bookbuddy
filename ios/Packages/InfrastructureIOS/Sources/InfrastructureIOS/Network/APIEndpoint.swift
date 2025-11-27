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

public extension APIEndpoint {
    static func register(email: String, password: String, name: String) throws -> APIEndpoint {
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

    static func login(email: String, password: String) throws -> APIEndpoint {
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

    static func refreshToken(refreshToken: String) throws -> APIEndpoint {
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

    static func logout(refreshToken: String) throws -> APIEndpoint {
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

public extension APIEndpoint {
    static func getBooks() -> APIEndpoint {
        APIEndpoint(
            path: "/books",
            method: .get,
            requiresAuth: true
        )
    }

    static func addBook(_ request: Encodable) throws -> APIEndpoint {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return APIEndpoint(
            path: "/books",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    static func updateBook(id: String, _ request: Encodable) throws -> APIEndpoint {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return APIEndpoint(
            path: "/books/\(id)",
            method: .patch,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    static func deleteBook(id: String) -> APIEndpoint {
        APIEndpoint(
            path: "/books/\(id)",
            method: .delete,
            requiresAuth: true
        )
    }
}

// MARK: - Goal Endpoints

public extension APIEndpoint {
    static func getGoals() -> APIEndpoint {
        APIEndpoint(
            path: "/goals",
            method: .get,
            requiresAuth: true
        )
    }

    static func createGoal(_ request: Encodable) throws -> APIEndpoint {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return APIEndpoint(
            path: "/goals",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    static func updateGoal(id: String, _ request: Encodable) throws -> APIEndpoint {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return APIEndpoint(
            path: "/goals/\(id)",
            method: .patch,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    static func deleteGoal(id: String) -> APIEndpoint {
        APIEndpoint(
            path: "/goals/\(id)",
            method: .delete,
            requiresAuth: true
        )
    }
}

// MARK: - Search Endpoints

public extension APIEndpoint {
    static func searchBooks(query: String) -> APIEndpoint {
        let queryItem = URLQueryItem(name: "q", value: query)

        return APIEndpoint(
            path: "/search",
            method: .get,
            queryItems: [queryItem],
            // Google Books proxy is behind auth to keep the API key protected
            requiresAuth: true
        )
    }
}

// MARK: - Streak Endpoints

public extension APIEndpoint {
    /// Get user's current streak stats
    static func getStreak() -> APIEndpoint {
        APIEndpoint(
            path: "/streaks",
            method: .get,
            requiresAuth: true
        )
    }

    /// Record a reading activity
    static func recordActivity(_ request: Encodable) throws -> APIEndpoint {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return APIEndpoint(
            path: "/streaks/activity",
            method: .post,
            body: body,
            headers: ["Content-Type": "application/json"],
            requiresAuth: true
        )
    }

    /// Get activity history with optional date range
    static func getActivityHistory(startDate: Date?, endDate: Date?) -> APIEndpoint {
        var queryItems: [URLQueryItem] = []

        let formatter = ISO8601DateFormatter()
        if let startDate {
            queryItems.append(URLQueryItem(name: "startDate", value: formatter.string(from: startDate)))
        }
        if let endDate {
            queryItems.append(URLQueryItem(name: "endDate", value: formatter.string(from: endDate)))
        }

        return APIEndpoint(
            path: "/streaks/history",
            method: .get,
            queryItems: queryItems.isEmpty ? nil : queryItems,
            requiresAuth: true
        )
    }
}

// MARK: - Export Endpoints

public extension APIEndpoint {
    /// Export books data
    static func exportBooks(format: String) -> APIEndpoint {
        let queryItem = URLQueryItem(name: "format", value: format)

        return APIEndpoint(
            path: "/export/books",
            method: .get,
            queryItems: [queryItem],
            requiresAuth: true
        )
    }

    /// Export goals data
    static func exportGoals(format: String) -> APIEndpoint {
        let queryItem = URLQueryItem(name: "format", value: format)

        return APIEndpoint(
            path: "/export/goals",
            method: .get,
            queryItems: [queryItem],
            requiresAuth: true
        )
    }

    /// Export all user data
    static func exportAll() -> APIEndpoint {
        APIEndpoint(
            path: "/export/all",
            method: .get,
            requiresAuth: true
        )
    }
}
