import CoreDomain
import Foundation
import SwiftUI

/// ViewModel for the Dashboard tab
@MainActor
final class DashboardViewModel: ObservableObject {
    // MARK: - Published State
    @Published var streak: ReadingStreak = .empty
    @Published var currentlyReadingBooks: [Book] = []
    @Published var activeGoals: [Goal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Dependencies
    private let streakRepository: StreakRepositoryProtocol
    private let bookRepository: BookRepositoryProtocol
    private let goalRepository: GoalRepositoryProtocol

    // MARK: - Computed Properties

    var totalBooks: Int {
        currentlyReadingBooks.count
    }

    var hasCurrentlyReading: Bool {
        !currentlyReadingBooks.isEmpty
    }

    var hasActiveGoals: Bool {
        !activeGoals.isEmpty
    }

    // MARK: - Initialization
    init(
        streakRepository: StreakRepositoryProtocol,
        bookRepository: BookRepositoryProtocol,
        goalRepository: GoalRepositoryProtocol
    ) {
        self.streakRepository = streakRepository
        self.bookRepository = bookRepository
        self.goalRepository = goalRepository
    }

    // MARK: - Public Methods

    /// Load all dashboard data
    func loadDashboard() async {
        isLoading = true
        errorMessage = nil

        // Load all data concurrently
        async let streakTask = loadStreak()
        async let booksTask = loadCurrentlyReading()
        async let goalsTask = loadActiveGoals()

        await streakTask
        await booksTask
        await goalsTask

        isLoading = false
    }

    /// Refresh all dashboard data
    func refresh() async {
        await loadDashboard()
    }

    // MARK: - Private Methods

    private func loadStreak() async {
        do {
            streak = try await streakRepository.getStreak()
        } catch {
            print("Failed to load streak: \(error)")
            streak = .empty
        }
    }

    private func loadCurrentlyReading() async {
        do {
            let allBooks = try await bookRepository.findByUserId("")
            currentlyReadingBooks = allBooks.filter { $0.status == .reading }
        } catch {
            print("Failed to load books: \(error)")
            currentlyReadingBooks = []
        }
    }

    private func loadActiveGoals() async {
        do {
            let allGoals = try await goalRepository.findByUserId("")
            let now = Date()
            activeGoals = allGoals.filter { !$0.completed && $0.endDate > now }
        } catch {
            print("Failed to load goals: \(error)")
            activeGoals = []
        }
    }
}
