import Foundation

/// Repository for managing reading sessions
public final class SessionRepository: @unchecked Sendable {
    private let networkClient: NetworkClientProtocol

    public init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - Session Management

    /// Get all sessions for the current user
    public func getSessions(
        bookId: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        limit: Int? = nil
    ) async throws -> SessionsListResponse {
        let endpoint = APIEndpoint.getSessions(
            bookId: bookId,
            startDate: startDate,
            endDate: endDate,
            limit: limit
        )
        return try await networkClient.request(endpoint)
    }

    /// Get the currently active session
    public func getActiveSession() async throws -> ReadingSessionResponse? {
        let endpoint = APIEndpoint.getActiveSession()
        let response: ActiveSessionResponse = try await networkClient.request(endpoint)
        return response.activeSession
    }

    /// Get session statistics
    public func getStatistics(
        startDate: Date? = nil,
        endDate: Date? = nil
    ) async throws -> SessionStatisticsResponse {
        let endpoint = APIEndpoint.getSessionStatistics(
            startDate: startDate,
            endDate: endDate
        )
        return try await networkClient.request(endpoint)
    }

    /// Start a new reading session
    public func startSession(bookId: String? = nil, notes: String? = nil) async throws -> ReadingSessionResponse {
        let request = StartSessionRequest(bookId: bookId, notes: notes)
        let endpoint = try APIEndpoint.startSession(request)
        let response: SessionActionResponse = try await networkClient.request(endpoint)
        return response.session
    }

    /// End the current active session
    public func endSession(
        sessionId: String,
        pagesRead: Int? = nil,
        notes: String? = nil
    ) async throws -> ReadingSessionResponse {
        let request = EndSessionWithFlagRequest(end: true, pagesRead: pagesRead, notes: notes)
        let endpoint = try APIEndpoint.endSession(id: sessionId, request)
        let response: SessionActionResponse = try await networkClient.request(endpoint)
        return response.session
    }

    /// Update a session (without ending it)
    public func updateSession(
        sessionId: String,
        pagesRead: Int? = nil,
        notes: String? = nil
    ) async throws -> ReadingSessionResponse {
        let request = UpdateSessionRequest(pagesRead: pagesRead, notes: notes)
        let endpoint = try APIEndpoint.updateSession(id: sessionId, request)
        let response: SessionActionResponse = try await networkClient.request(endpoint)
        return response.session
    }

    /// Delete a session
    public func deleteSession(sessionId: String) async throws {
        let endpoint = APIEndpoint.deleteSession(id: sessionId)
        let _: DeleteSessionResponse = try await networkClient.request(endpoint)
    }
}

/// Response for delete session
private struct DeleteSessionResponse: Codable {
    let message: String
}
