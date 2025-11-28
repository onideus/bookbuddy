import Combine
import CoreDomain
import Foundation
import InfrastructureIOS

@MainActor
class ReadingTimerViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var isTimerRunning = false
    @Published var elapsedSeconds = 0
    @Published var activeSession: ReadingSessionResponse?
    @Published var selectedBook: Book?
    @Published var statistics: SessionStatisticsResponse?
    @Published var recentSessions: [ReadingSessionResponse] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showEndSessionSheet = false
    @Published var pagesReadInput = ""
    @Published var sessionNotesInput = ""

    // MARK: - Dependencies

    private let sessionRepository: SessionRepository
    private var timerCancellable: AnyCancellable?

    // MARK: - Initialization

    init(sessionRepository: SessionRepository) {
        self.sessionRepository = sessionRepository
    }

    // MARK: - Public Methods

    func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Check for active session
            if let active = try await sessionRepository.getActiveSession() {
                activeSession = active
                isTimerRunning = true
                elapsedSeconds = calculateElapsedSeconds(from: active.startTime)
                startTimerUpdates()
            }

            // Load statistics
            statistics = try await sessionRepository.getStatistics()

            // Load recent sessions
            let sessionsResponse = try await sessionRepository.getSessions(limit: 10)
            recentSessions = sessionsResponse.sessions
        } catch {
            errorMessage = "Failed to load data: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func startSession() async {
        guard activeSession == nil else {
            errorMessage = "A session is already in progress"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let session = try await sessionRepository.startSession(
                bookId: selectedBook?.id,
                notes: nil
            )
            activeSession = session
            isTimerRunning = true
            elapsedSeconds = 0
            startTimerUpdates()
        } catch {
            errorMessage = "Failed to start session: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func endSession() async {
        guard let session = activeSession else {
            errorMessage = "No active session to end"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let pagesRead = Int(pagesReadInput)
            let notes = sessionNotesInput.isEmpty ? nil : sessionNotesInput

            let endedSession = try await sessionRepository.endSession(
                sessionId: session.id,
                pagesRead: pagesRead,
                notes: notes
            )

            // Reset state
            activeSession = nil
            isTimerRunning = false
            elapsedSeconds = 0
            stopTimerUpdates()
            showEndSessionSheet = false
            pagesReadInput = ""
            sessionNotesInput = ""

            // Refresh data
            statistics = try await sessionRepository.getStatistics()
            let sessionsResponse = try await sessionRepository.getSessions(limit: 10)
            recentSessions = sessionsResponse.sessions

            // Insert ended session at top if not in list
            if !recentSessions.contains(where: { $0.id == endedSession.id }) {
                recentSessions.insert(endedSession, at: 0)
            }
        } catch {
            errorMessage = "Failed to end session: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func cancelSession() async {
        guard let session = activeSession else { return }

        isLoading = true

        do {
            try await sessionRepository.deleteSession(sessionId: session.id)
            activeSession = nil
            isTimerRunning = false
            elapsedSeconds = 0
            stopTimerUpdates()
        } catch {
            errorMessage = "Failed to cancel session: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func deleteSession(_ session: ReadingSessionResponse) async {
        isLoading = true

        do {
            try await sessionRepository.deleteSession(sessionId: session.id)
            recentSessions.removeAll { $0.id == session.id }
            statistics = try await sessionRepository.getStatistics()
        } catch {
            errorMessage = "Failed to delete session: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func selectBook(_ book: Book?) {
        selectedBook = book
    }

    func showEndSheet() {
        showEndSessionSheet = true
    }

    func dismissEndSheet() {
        showEndSessionSheet = false
        pagesReadInput = ""
        sessionNotesInput = ""
    }

    // MARK: - Computed Properties

    var formattedElapsedTime: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var formattedTodayTime: String {
        guard let stats = statistics else { return "0m" }
        return stats.formattedTodayTime
    }

    var formattedWeekTime: String {
        guard let stats = statistics else { return "0m" }
        return stats.formattedWeekTime
    }

    var formattedTotalTime: String {
        guard let stats = statistics else { return "0m" }
        return stats.formattedTotalTime
    }

    var totalSessions: Int {
        statistics?.totalSessions ?? 0
    }

    var hasActiveSession: Bool {
        activeSession != nil
    }

    // MARK: - Private Methods

    private func startTimerUpdates() {
        timerCancellable = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.elapsedSeconds += 1
            }
    }

    private func stopTimerUpdates() {
        timerCancellable?.cancel()
        timerCancellable = nil
    }

    private func calculateElapsedSeconds(from startTime: Date) -> Int {
        let elapsed = Date().timeIntervalSince(startTime)
        return max(0, Int(elapsed))
    }
}
