import Charts
import InfrastructureIOS
import SwiftUI

struct ReadingInsightsView: View {
    @StateObject private var viewModel: ReadingInsightsViewModel

    init(
        sessionRepository: SessionRepository,
        bookRepository: BookRepositoryProtocol,
        streakRepository: StreakRepositoryProtocol
    ) {
        _viewModel = StateObject(wrappedValue: ReadingInsightsViewModel(
            sessionRepository: sessionRepository,
            bookRepository: bookRepository,
            streakRepository: streakRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Time Period Picker
                    timePeriodPicker

                    if viewModel.isLoading {
                        ProgressView("Loading insights...")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 48)
                    } else {
                        // Overview Stats
                        overviewSection

                        // Reading Time Chart
                        readingTimeChart

                        // Streak Section
                        streakSection

                        // Books by Status
                        booksStatusSection

                        // Top Genres
                        if !viewModel.readingByGenre.isEmpty {
                            genresSection
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Insights")
            .task {
                await viewModel.loadInsights()
            }
            .refreshable {
                await viewModel.loadInsights()
            }
            .alert("Error", isPresented: .init(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }

    // MARK: - Time Period Picker

    private var timePeriodPicker: some View {
        Picker("Time Period", selection: Binding(
            get: { viewModel.selectedPeriod },
            set: { period in
                Task {
                    await viewModel.updatePeriod(period)
                }
            }
        )) {
            ForEach(InsightsTimePeriod.allCases) { period in
                Text(period.rawValue).tag(period)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Overview Section

    private var overviewSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Overview")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                StatBox(
                    title: "Total Time",
                    value: viewModel.formattedTotalTime,
                    icon: "clock.fill",
                    color: .blue
                )

                StatBox(
                    title: "Sessions",
                    value: "\(viewModel.totalSessions)",
                    icon: "play.circle.fill",
                    color: .green
                )

                StatBox(
                    title: "Avg Session",
                    value: viewModel.formattedAverageSession,
                    icon: "chart.bar.fill",
                    color: .orange
                )

                StatBox(
                    title: "Pages Read",
                    value: "\(viewModel.totalPagesRead)",
                    icon: "doc.text.fill",
                    color: .purple
                )
            }
        }
    }

    // MARK: - Reading Time Chart

    private var readingTimeChart: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Reading Time")
                .font(.headline)

            if viewModel.dailyReadingData.isEmpty {
                emptyChartPlaceholder
            } else {
                Chart(viewModel.dailyReadingData) { data in
                    BarMark(
                        x: .value("Day", data.dayName),
                        y: .value("Minutes", data.minutes)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .blue.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .cornerRadius(4)
                }
                .frame(height: 200)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        if let minutes = value.as(Int.self) {
                            AxisValueLabel {
                                Text("\(minutes)m")
                                    .font(.caption)
                            }
                        }
                        AxisGridLine()
                    }
                }
                .chartXAxis {
                    AxisMarks { _ in
                        AxisValueLabel()
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    private var emptyChartPlaceholder: some View {
        VStack(spacing: 12) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text("No reading data yet")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Text("Start a reading session to see your progress")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(height: 200)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Streak Section

    private var streakSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Reading Streak")
                .font(.headline)

            HStack(spacing: 20) {
                InsightStreakCard(
                    title: "Current Streak",
                    value: viewModel.currentStreak,
                    icon: "flame.fill",
                    color: .orange
                )

                InsightStreakCard(
                    title: "Longest Streak",
                    value: viewModel.longestStreak,
                    icon: "trophy.fill",
                    color: .yellow
                )
            }
        }
    }

    // MARK: - Books Status Section

    private var booksStatusSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Library")
                .font(.headline)

            VStack(spacing: 12) {
                HStack {
                    Text("Total Books")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(viewModel.totalBooks)")
                        .fontWeight(.semibold)
                }

                if viewModel.totalBooks > 0 {
                    // Status breakdown with bars
                    BookStatusBar(
                        label: "Read",
                        count: viewModel.booksRead,
                        total: viewModel.totalBooks,
                        color: .green
                    )

                    BookStatusBar(
                        label: "Reading",
                        count: viewModel.booksReading,
                        total: viewModel.totalBooks,
                        color: .blue
                    )

                    BookStatusBar(
                        label: "Want to Read",
                        count: viewModel.booksWantToRead,
                        total: viewModel.totalBooks,
                        color: .orange
                    )
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }

    // MARK: - Genres Section

    private var genresSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Top Genres")
                .font(.headline)

            if viewModel.readingByGenre.isEmpty {
                Text("No genres tracked yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                // Use BarMark instead of SectorMark for iOS 16 compatibility
                Chart(viewModel.readingByGenre) { genre in
                    BarMark(
                        x: .value("Count", genre.count),
                        y: .value("Genre", genre.genre)
                    )
                    .foregroundStyle(by: .value("Genre", genre.genre))
                    .cornerRadius(4)
                }
                .frame(height: CGFloat(viewModel.readingByGenre.count * 40))
                .chartLegend(.hidden)

                // Genre list
                VStack(spacing: 8) {
                    ForEach(viewModel.readingByGenre) { genre in
                        HStack {
                            Text(genre.genre)
                            Spacer()
                            Text("\(genre.count) books")
                                .foregroundColor(.secondary)
                        }
                        .font(.subheadline)
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

// MARK: - Supporting Views

private struct StatBox: View {
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
                .font(.title2)
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

private struct InsightStreakCard: View {
    let title: String
    let value: Int
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(color)

            Text("\(value)")
                .font(.system(size: 36, weight: .bold))

            Text(value == 1 ? "day" : "days")
                .font(.caption)
                .foregroundColor(.secondary)

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

private struct BookStatusBar: View {
    let label: String
    let count: Int
    let total: Int
    let color: Color

    var percentage: Double {
        guard total > 0 else { return 0 }
        return Double(count) / Double(total)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.subheadline)
                Spacer()
                Text("\(count)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geometry.size.width * percentage, height: 8)
                }
            }
            .frame(height: 8)
        }
    }
}

// Preview disabled - requires proper DI setup
// #Preview {
//     ReadingInsightsView(
//         sessionRepository: ...,
//         bookRepository: ...,
//         streakRepository: ...
//     )
// }
