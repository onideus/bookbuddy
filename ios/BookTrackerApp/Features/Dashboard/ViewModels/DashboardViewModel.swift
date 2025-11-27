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

    /// Update a book
    func updateBook(_ book: Book, updates: BookUpdate) async {
        do {
            _ = try await bookRepository.update(book.id, updates: updates)
            await loadCurrentlyReading()
        } catch {
            print("Failed to update book: \(error)")
            errorMessage = "Failed to update book"
        }
    }

    /// Delete a book
    func deleteBook(_ book: Book) async {
        do {
            _ = try await bookRepository.delete(book.id)
            await loadCurrentlyReading()
        } catch {
            print("Failed to delete book: \(error)")
            errorMessage = "Failed to delete book"
        }
    }

    // MARK: - Private Methods

    private func loadStreak() async {
        do {
            streak = try await streakRepository.getStreak()
        } catch {
            // Preserve existing streak data on failure, only clear if we have no data
            print("Failed to load streak: \(error)")
            if streak.currentStreak == 0, streak.totalDaysRead == 0 {
                // Only set to empty if we never had data
                streak = .empty
            }
            // Otherwise keep existing data and show error
            errorMessage = "Failed to refresh streak"
        }
    }

    private func loadCurrentlyReading() async {
        do {
            let allBooks = try await bookRepository.findByUserId("")
            currentlyReadingBooks = allBooks.filter { $0.status == .reading }
        } catch {
            // Preserve existing books data on failure
            print("Failed to load books: \(error)")
            // Don't clear currentlyReadingBooks - keep showing stale data
            if currentlyReadingBooks.isEmpty {
                // Only show error if user has no cached data
                errorMessage = "Failed to load books"
            }
        }
    }

    private func loadActiveGoals() async {
        do {
            let allGoals = try await goalRepository.findByUserId("")
            let now = Date()
            activeGoals = allGoals.filter { !$0.completed && $0.endDate > now }
        } catch {
            // Preserve existing goals data on failure
            print("Failed to load goals: \(error)")
            // Don't clear activeGoals - keep showing stale data
            if activeGoals.isEmpty {
                // Only show error if user has no cached data
                errorMessage = "Failed to load goals"
            }
        }
    }
}
