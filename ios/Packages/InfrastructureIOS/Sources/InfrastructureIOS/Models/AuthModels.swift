import Foundation
import CoreDomain

// MARK: - Request Models

public struct RegisterRequest: Encodable {
    public let email: String
    public let password: String
    public let name: String

    public init(email: String, password: String, name: String) {
        self.email = email
        self.password = password
        self.name = name
    }
}

public struct LoginRequest: Encodable {
    public let email: String
    public let password: String

    public init(email: String, password: String) {
        self.email = email
        self.password = password
    }
}

public struct RefreshTokenRequest: Encodable {
    public let refreshToken: String

    public init(refreshToken: String) {
        self.refreshToken = refreshToken
    }
}

public struct LogoutRequest: Encodable {
    public let refreshToken: String

    public init(refreshToken: String) {
        self.refreshToken = refreshToken
    }
}

// MARK: - Response Models

public struct RegisterResponse: Decodable {
    public let accessToken: String
    public let refreshToken: String
    public let user: UserDTO

    public init(accessToken: String, refreshToken: String, user: UserDTO) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.user = user
    }
}

public struct LoginResponse: Decodable {
    public let accessToken: String
    public let refreshToken: String
    public let user: UserDTO

    public init(accessToken: String, refreshToken: String, user: UserDTO) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.user = user
    }
}

public struct RefreshTokenResponse: Decodable {
    public let accessToken: String
    public let refreshToken: String

    public init(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}

public struct LogoutResponse: Decodable {
    public let message: String

    public init(message: String) {
        self.message = message
    }
}

// MARK: - DTO Models

public struct UserDTO: Codable {
    public let id: String
    public let email: String
    public let name: String

    public init(id: String, email: String, name: String) {
        self.id = id
        self.email = email
        self.name = name
    }
}

// MARK: - Domain Conversion
extension UserDTO {
    public func toDomain() -> User {
        return User(
            id: id,
            email: email,
            name: name,
            password: "" // Password is not included in responses for security
        )
    }
}
