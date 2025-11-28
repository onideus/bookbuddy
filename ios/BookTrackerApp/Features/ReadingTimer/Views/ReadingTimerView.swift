import InfrastructureIOS
import SwiftUI

struct ReadingTimerView: View {
    @StateObject private var viewModel: ReadingTimerViewModel

    init(sessionRepository: SessionRepository) {
        _viewModel = StateObject(wrappedValue: ReadingTimerViewModel(sessionRepository: sessionRepository))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Timer Display
                    timerSection

                    // Quick Stats
                    statsSection

                    // Recent Sessions
                    recentSessionsSection
                }
                .padding()
            }
            .navigationTitle("Reading Timer")
            .task {
                await viewModel.loadInitialData()
            }
            .refreshable {
                await viewModel.loadInitialData()
            }
            .alert("Error", isPresented: .init(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .sheet(isPresented: $viewModel.showEndSessionSheet) {
                endSessionSheet
            }
        }
    }

    // MARK: - Timer Section

    private var timerSection: some View {
        VStack(spacing: 20) {
            // Circular Timer Display
            ZStack {
                Circle()
                    .stroke(lineWidth: 12)
                    .opacity(0.3)
                    .foregroundColor(.blue)

                Circle()
                    .trim(from: 0, to: timerProgress)
                    .stroke(style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .foregroundColor(.blue)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: timerProgress)

                VStack(spacing: 8) {
                    Text(viewModel.formattedElapsedTime)
                        .font(.system(size: 48, weight: .bold, design: .monospaced))

                    if viewModel.hasActiveSession {
                        Text("Session in Progress")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Ready to Read")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(width: 280, height: 280)

            // Timer Controls
            HStack(spacing: 20) {
                if viewModel.hasActiveSession {
                    // End Session Button
                    Button {
                        viewModel.showEndSheet()
                    } label: {
                        Label("End Session", systemImage: "stop.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }

                    // Cancel Button
                    Button {
                        Task {
                            await viewModel.cancelSession()
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.red)
                    }
                } else {
                    // Start Session Button
                    Button {
                        Task {
                            await viewModel.startSession()
                        }
                    } label: {
                        Label("Start Reading", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .disabled(viewModel.isLoading)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
    }

    // MARK: - Stats Section

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Reading Statistics")
                .font(.headline)

            HStack(spacing: 16) {
                StatCard(
                    title: "Today",
                    value: viewModel.formattedTodayTime,
                    icon: "sun.max.fill",
                    color: .orange
                )

                StatCard(
                    title: "This Week",
                    value: viewModel.formattedWeekTime,
                    icon: "calendar",
                    color: .blue
                )

                StatCard(
                    title: "Total",
                    value: viewModel.formattedTotalTime,
                    icon: "clock.fill",
                    color: .purple
                )
            }

            HStack(spacing: 16) {
                StatCard(
                    title: "Sessions",
                    value: "\(viewModel.totalSessions)",
                    icon: "book.fill",
                    color: .green
                )

                if let stats = viewModel.statistics {
                    StatCard(
                        title: "Avg Session",
                        value: stats.formattedAverageSession,
                        icon: "chart.bar.fill",
                        color: .teal
                    )

                    StatCard(
                        title: "Total Pages",
                        value: "\(stats.statistics.totalPages)",
                        icon: "doc.text.fill",
                        color: .indigo
                    )
                }
            }
        }
    }

    // MARK: - Recent Sessions Section

    private var recentSessionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Sessions")
                .font(.headline)

            if viewModel.recentSessions.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "clock.badge.questionmark")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("No Sessions Yet")
                        .font(.headline)
                    Text("Start your first reading session to track your progress.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 150)
                .padding()
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.recentSessions) { session in
                        SessionRowView(session: session) {
                            Task {
                                await viewModel.deleteSession(session)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - End Session Sheet

    private var endSessionSheet: some View {
        NavigationStack {
            Form {
                Section("Session Summary") {
                    HStack {
                        Text("Duration")
                        Spacer()
                        Text(viewModel.formattedElapsedTime)
                            .foregroundColor(.secondary)
                    }
                }

                Section("Pages Read (Optional)") {
                    TextField("Number of pages", text: $viewModel.pagesReadInput)
                        .keyboardType(.numberPad)
                }

                Section("Notes (Optional)") {
                    TextEditor(text: $viewModel.sessionNotesInput)
                        .frame(minHeight: 100)
                }
            }
            .navigationTitle("End Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.dismissEndSheet()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.endSession()
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Helpers

    private var timerProgress: CGFloat {
        // Show progress as a fraction of an hour
        let minutes = CGFloat(viewModel.elapsedSeconds) / 60.0
        return min(minutes / 60.0, 1.0)
    }
}

// MARK: - Stat Card

private struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.title3)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Session Row View

private struct SessionRowView: View {
    let session: ReadingSessionResponse
    let onDelete: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.formattedDuration)
                    .font(.headline)

                Text(formattedDate)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let pages = session.pagesRead {
                    Text("\(pages) pages")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }

            Spacer()

            if session.isActive {
                Text("In Progress")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.2))
                    .foregroundColor(.green)
                    .cornerRadius(8)
            } else {
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: session.startTime)
    }
}

// Preview disabled - requires proper DI setup
// #Preview {
//     ReadingTimerView(sessionRepository: SessionRepository(networkClient: NetworkClient(baseURL: URL(string: "http://localhost:3001/api")!, keychainManager: KeychainManager.shared)))
// }
