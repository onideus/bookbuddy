import Combine
import CoreDomain
import Foundation
import InfrastructureIOS

// MARK: - Chart Data Models

struct DailyReadingData: Identifiable {
    let id = UUID()
    let date: Date
    let minutes: Int
    let pages: Int

    var dayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    var shortDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d"
        return formatter.string(from: date)
    }
}

struct MonthlyReadingData: Identifiable {
    let id = UUID()
    let month: Date
    let totalMinutes: Int
    let totalPages: Int
    let booksCompleted: Int

    var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter.string(from: month)
    }
}

struct ReadingByGenre: Identifiable {
    let id = UUID()
    let genre: String
    let count: Int
    let percentage: Double
}

struct ReadingByStatus: Identifiable {
    let id = UUID()
    let status: String
    let count: Int
    let percentage: Double
}

// MARK: - Time Period Filter

enum InsightsTimePeriod: String, CaseIterable, Identifiable {
    case week = "Week"
    case month = "Month"
    case year = "Year"
    case allTime = "All Time"

    var id: String { rawValue }

    var dateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let now = Date()
        let end = calendar.startOfDay(for: now).addingTimeInterval(86400) // End of today

        switch self {
        case .week:
            let start = calendar.date(byAdding: .day, value: -7, to: now)!
            return (calendar.startOfDay(for: start), end)
        case .month:
            let start = calendar.date(byAdding: .month, value: -1, to: now)!
            return (calendar.startOfDay(for: start), end)
        case .year:
            let start = calendar.date(byAdding: .year, value: -1, to: now)!
            return (calendar.startOfDay(for: start), end)
        case .allTime:
            let start = calendar.date(byAdding: .year, value: -10, to: now)!
            return (calendar.startOfDay(for: start), end)
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ReadingInsightsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var selectedPeriod: InsightsTimePeriod = .week
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Session Statistics
    @Published var totalReadingMinutes = 0
    @Published var totalSessions = 0
    @Published var averageSessionLength = 0
    @Published var longestSession = 0
    @Published var totalPagesRead = 0

    // Daily/Weekly Data for Charts
    @Published var dailyReadingData: [DailyReadingData] = []
    @Published var monthlyReadingData: [MonthlyReadingData] = []

    // Book Statistics
    @Published var totalBooks = 0
    @Published var booksRead = 0
    @Published var booksReading = 0
    @Published var booksWantToRead = 0
    @Published var readingByGenre: [ReadingByGenre] = []
    @Published var readingByStatus: [ReadingByStatus] = []

    // Streak Info
    @Published var currentStreak = 0
    @Published var longestStreak = 0

    // MARK: - Dependencies

    private let sessionRepository: SessionRepository
    private let bookRepository: BookRepositoryProtocol
    private let streakRepository: StreakRepositoryProtocol

    // MARK: - Initialization

    init(
        sessionRepository: SessionRepository,
        bookRepository: BookRepositoryProtocol,
        streakRepository: StreakRepositoryProtocol
    ) {
        self.sessionRepository = sessionRepository
        self.bookRepository = bookRepository
        self.streakRepository = streakRepository
    }

    // MARK: - Public Methods

    func loadInsights() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load all data in parallel
            async let sessionsTask: () = loadSessionStatistics()
            async let booksTask: () = loadBookStatistics()
            async let streakTask: () = loadStreakData()
            async let dailyTask: () = loadDailyReadingData()

            _ = try await (sessionsTask, booksTask, streakTask, dailyTask)
        } catch {
            errorMessage = "Failed to load insights: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func updatePeriod(_ period: InsightsTimePeriod) async {
        selectedPeriod = period
        await loadInsights()
    }

    // MARK: - Private Methods

    private func loadSessionStatistics() async throws {
        let range = selectedPeriod.dateRange
        let stats = try await sessionRepository.getStatistics(
            startDate: range.start,
            endDate: range.end
        )

        totalReadingMinutes = stats.statistics.totalMinutes
        totalSessions = stats.statistics.totalSessions
        averageSessionLength = Int(stats.statistics.averageSessionLength)
        longestSession = stats.statistics.longestSession
        totalPagesRead = stats.statistics.totalPages
    }

    private func loadBookStatistics() async throws {
        // Use findByUserId with empty string since auth token provides user context
        let books = try await bookRepository.findByUserId("")

        totalBooks = books.count
        booksRead = books.filter { $0.status == .read }.count
        booksReading = books.filter { $0.status == .reading }.count
        booksWantToRead = books.filter { $0.status == .wantToRead }.count

        // Calculate reading by status
        let total = Double(totalBooks)
        if total > 0 {
            readingByStatus = [
                ReadingByStatus(status: "Read", count: booksRead, percentage: Double(booksRead) / total),
                ReadingByStatus(
                    status: "Reading",
                    count: booksReading,
                    percentage: Double(booksReading) / total
                ),
                ReadingByStatus(
                    status: "Want to Read",
                    count: booksWantToRead,
                    percentage: Double(booksWantToRead) / total
                )
            ]
        }

        // Calculate reading by genre
        var genreCounts: [String: Int] = [:]
        for book in books {
            for genre in book.genres {
                genreCounts[genre, default: 0] += 1
            }
        }

        let totalGenreCount = Double(genreCounts.values.reduce(0, +))
        readingByGenre = genreCounts.map { genre, count in
            ReadingByGenre(
                genre: genre,
                count: count,
                percentage: totalGenreCount > 0 ? Double(count) / totalGenreCount : 0
            )
        }
        .sorted { $0.count > $1.count }
        .prefix(5)
        .map { $0 }
    }

    private func loadStreakData() async throws {
        let streakInfo = try await streakRepository.getStreak()

        currentStreak = streakInfo.currentStreak
        longestStreak = streakInfo.longestStreak
    }

    private func loadDailyReadingData() async throws {
        let range = selectedPeriod.dateRange
        let sessions = try await sessionRepository.getSessions(
            startDate: range.start,
            endDate: range.end,
            limit: 100
        )

        // Group sessions by day
        let calendar = Calendar.current
        var dailyData: [Date: (minutes: Int, pages: Int)] = [:]

        // Initialize all days in range with zero values
        var currentDate = range.start
        while currentDate < range.end {
            let dayStart = calendar.startOfDay(for: currentDate)
            dailyData[dayStart] = (minutes: 0, pages: 0)
            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate)!
        }

        // Aggregate session data by day
        for session in sessions.sessions {
            let dayStart = calendar.startOfDay(for: session.startTime)
            let existing = dailyData[dayStart] ?? (minutes: 0, pages: 0)
            dailyData[dayStart] = (
                minutes: existing.minutes + (session.durationMinutes ?? 0),
                pages: existing.pages + (session.pagesRead ?? 0)
            )
        }

        // Convert to array and sort by date
        dailyReadingData = dailyData.map { date, data in
            DailyReadingData(date: date, minutes: data.minutes, pages: data.pages)
        }
        .sorted { $0.date < $1.date }

        // Keep only last 7-14 days depending on period
        let maxDays = selectedPeriod == .week ? 7 : 14
        if dailyReadingData.count > maxDays {
            dailyReadingData = Array(dailyReadingData.suffix(maxDays))
        }
    }

    // MARK: - Computed Properties

    var formattedTotalTime: String {
        let hours = totalReadingMinutes / 60
        let minutes = totalReadingMinutes % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var formattedAverageSession: String {
        let hours = averageSessionLength / 60
        let minutes = averageSessionLength % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var maxDailyMinutes: Int {
        dailyReadingData.map(\.minutes).max() ?? 0
    }
}
