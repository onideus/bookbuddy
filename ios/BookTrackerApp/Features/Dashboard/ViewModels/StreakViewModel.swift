import CoreDomain
import Foundation
import SwiftUI

/// ViewModel for managing streak state and activity logging
@MainActor
final class StreakViewModel: ObservableObject {
    // MARK: - Published State

    @Published var streak: ReadingStreak = .empty
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showingLogActivity = false
    @Published var activityLogged = false

    // MARK: - Dependencies

    private let streakRepository: StreakRepositoryProtocol

    // MARK: - Initialization

    init(streakRepository: StreakRepositoryProtocol) {
        self.streakRepository = streakRepository
    }

    // MARK: - Public Methods

    /// Load the current streak data
    func loadStreak() async {
        isLoading = true
        errorMessage = nil

        do {
            streak = try await streakRepository.getStreak()
        } catch {
            errorMessage = "Failed to load streak: \(error.localizedDescription)"
            streak = .empty
        }

        isLoading = false
    }

    /// Record a reading activity
    func recordActivity(pagesRead: Int, minutesRead: Int, bookId: String? = nil) async {
        isLoading = true
        errorMessage = nil
        activityLogged = false

        do {
            let input = RecordActivityInput(
                pagesRead: pagesRead,
                minutesRead: minutesRead,
                bookId: bookId
            )
            _ = try await streakRepository.recordActivity(input)
            // Reload streak to get updated stats
            streak = try await streakRepository.getStreak()
            activityLogged = true
        } catch {
            errorMessage = "Failed to record activity: \(error.localizedDescription)"
        }

        isLoading = false
    }

    /// Refresh streak data
    func refresh() async {
        await loadStreak()
    }
}
