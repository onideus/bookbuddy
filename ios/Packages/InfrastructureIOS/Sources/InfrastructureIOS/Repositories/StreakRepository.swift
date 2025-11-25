import CoreDomain
import Foundation

/// Implementation of StreakRepositoryProtocol using REST API
public final class StreakRepository: StreakRepositoryProtocol {
    private let networkClient: NetworkClientProtocol

    public init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - StreakRepositoryProtocol

    public func getStreak() async throws -> ReadingStreak {
        let endpoint = APIEndpoint.getStreak()
        let response: GetStreakResponse = try await networkClient.request(endpoint)
        return response.toDomain()
    }

    public func recordActivity(_ input: RecordActivityInput) async throws -> ReadingActivity {
        let request = RecordActivityRequest(input: input)
        let endpoint = try APIEndpoint.recordActivity(request)
        let response: RecordActivityResponse = try await networkClient.request(endpoint)
        return response.activity.toDomain()
    }

    public func getActivityHistory(startDate: Date?, endDate: Date?) async throws -> [ReadingActivity] {
        let endpoint = APIEndpoint.getActivityHistory(startDate: startDate, endDate: endDate)
        let response: GetActivityHistoryResponse = try await networkClient.request(endpoint)
        return response.activities.map { $0.toDomain() }
    }
}
