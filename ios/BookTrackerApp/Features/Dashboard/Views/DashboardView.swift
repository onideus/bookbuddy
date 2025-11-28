import CoreDomain
import SwiftUI

/// Main Dashboard view showing streak, currently reading, and goals overview
struct DashboardView: View {
    @StateObject var viewModel: DashboardViewModel
    @EnvironmentObject var container: AppContainer
    @Binding var selectedTab: Int
    @State private var showingLogActivity = false
    @State private var showingCreateGoal = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Streak Card
                StreakCard(
                    streak: viewModel.streak,
                    onLogActivity: { showingLogActivity = true }
                )
                .padding(.horizontal)

                // Log Activity Prompt (shown when no activity today)
                if !viewModel.streak.isActiveToday {
                    LogActivityPrompt(onLogActivity: { showingLogActivity = true })
                        .padding(.horizontal)
                }

                // Currently Reading Section
                if viewModel.hasCurrentlyReading {
                    CurrentlyReadingSection(
                        books: viewModel.currentlyReadingBooks,
                        onUpdate: { book, updates in
                            Task {
                                await viewModel.updateBook(book, updates: updates)
                            }
                        },
                        onDelete: { book in
                            Task {
                                await viewModel.deleteBook(book)
                            }
                        }
                    )
                }

                // Active Goals Section
                if viewModel.hasActiveGoals {
                    ActiveGoalsSection(goals: viewModel.activeGoals)
                }

                // Quick Actions
                QuickActionsSection(
                    onAddBook: { selectedTab = 3 }, // Navigate to Search tab
                    onNewGoal: { showingCreateGoal = true },
                    onViewStats: { /* Stats feature coming soon */ }
                )
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Dashboard")
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadDashboard()
        }
        .sheet(isPresented: $showingLogActivity) {
            LogActivityView(
                viewModel: container.makeStreakViewModel(),
                onActivityLogged: {
                    Task {
                        await viewModel.refresh()
                    }
                }
            )
        }
        .sheet(isPresented: $showingCreateGoal) {
            CreateGoalView(viewModel: container.makeGoalsViewModel())
                .onDisappear {
                    Task {
                        await viewModel.refresh()
                    }
                }
        }
    }
}

// MARK: - Currently Reading Section

struct CurrentlyReadingSection: View {
    let books: [Book]
    let onUpdate: (Book, BookUpdate) -> Void
    let onDelete: (Book) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Currently Reading")
                    .font(.headline)
                Spacer()
                Text("\(books.count) \(books.count == 1 ? "book" : "books")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        NavigationLink {
                            BookDetailView(
                                book: book,
                                onUpdate: onUpdate,
                                onDelete: onDelete
                            )
                        } label: {
                            CurrentlyReadingCard(book: book)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Compact card showing a currently reading book
struct CurrentlyReadingCard: View {
    let book: Book

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Thumbnail
            if let thumbnail = book.thumbnail, let url = URL(string: thumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    bookPlaceholder
                }
                .frame(width: 100, height: 140)
                .cornerRadius(8)
            } else {
                bookPlaceholder
                    .frame(width: 100, height: 140)
                    .cornerRadius(8)
            }

            // Book info
            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .frame(width: 100, alignment: .leading)

                if let pageCount = book.pageCount, let currentPage = book.currentPage {
                    ProgressView(value: Double(currentPage), total: Double(pageCount))
                        .tint(.blue)
                    Text("\(Int(book.readingProgress * 100))%")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(8)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private var bookPlaceholder: some View {
        ZStack {
            Color.gray.opacity(0.2)
            Image(systemName: "book.fill")
                .font(.title)
                .foregroundColor(.gray.opacity(0.5))
        }
    }
}

// MARK: - Active Goals Section

struct ActiveGoalsSection: View {
    let goals: [Goal]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Active Goals")
                    .font(.headline)
                Spacer()
                Text("\(goals.count) \(goals.count == 1 ? "goal" : "goals")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)

            VStack(spacing: 8) {
                ForEach(goals) { goal in
                    GoalProgressCard(goal: goal)
                }
            }
            .padding(.horizontal)
        }
    }
}

/// Compact goal progress card
struct GoalProgressCard: View {
    let goal: Goal

    var body: some View {
        HStack(spacing: 12) {
            // Progress circle
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(progressColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(progress * 100))%")
                    .font(.caption2)
                    .fontWeight(.bold)
            }
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(goal.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text("\(goal.currentBooks)/\(goal.targetBooks) books")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Days remaining
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(daysRemaining)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(daysRemaining <= 7 ? .orange : .primary)
                Text("days left")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private var progress: Double {
        guard goal.targetBooks > 0 else { return 0 }
        return min(Double(goal.currentBooks) / Double(goal.targetBooks), 1.0)
    }

    private var progressColor: Color {
        if progress >= 1.0 {
            .green
        } else if progress >= 0.5 {
            .blue
        } else {
            .orange
        }
    }

    private var daysRemaining: Int {
        let remaining = Calendar.current.dateComponents([.day], from: Date(), to: goal.endDate).day ?? 0
        return max(remaining, 0)
    }
}

// MARK: - Log Activity Prompt

/// A prominent in-line card prompting the user to log reading activity
struct LogActivityPrompt: View {
    let onLogActivity: () -> Void

    var body: some View {
        Button(action: onLogActivity) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color.orange.opacity(0.2))
                        .frame(width: 50, height: 50)
                    Image(systemName: "flame")
                        .font(.title2)
                        .foregroundColor(.orange)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Keep your streak alive!")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    Text("Log today's reading activity")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Quick Actions Section

struct QuickActionsSection: View {
    let onAddBook: () -> Void
    let onNewGoal: () -> Void
    let onViewStats: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)

            HStack(spacing: 12) {
                QuickActionButton(
                    icon: "magnifyingglass",
                    title: "Add Book",
                    color: .blue,
                    action: onAddBook
                )

                QuickActionButton(
                    icon: "target",
                    title: "New Goal",
                    color: .green,
                    action: onNewGoal
                )

                QuickActionButton(
                    icon: "chart.bar.fill",
                    title: "Stats",
                    color: .purple,
                    action: onViewStats
                )
            }
        }
    }
}

struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

struct DashboardViewPreview: View {
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            DashboardView(
                viewModel: DashboardViewModel(
                    streakRepository: PreviewStreakRepository(),
                    bookRepository: PreviewBookRepository(),
                    goalRepository: PreviewGoalRepository()
                ),
                selectedTab: $selectedTab
            )
        }
        .environmentObject(AppContainer())
    }
}

#Preview {
    DashboardViewPreview()
}

// MARK: - Preview Repositories

private class PreviewStreakRepository: StreakRepositoryProtocol {
    func getStreak() async throws -> ReadingStreak {
        ReadingStreak(
            currentStreak: 5,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date(),
            isActiveToday: true,
            isAtRisk: false,
            message: "Nice! 5 days in a row. You're building a habit!"
        )
    }

    func recordActivity(_ activity: RecordActivityInput) async throws -> ReadingActivity {
        ReadingActivity(
            id: UUID().uuidString,
            userId: "test",
            activityDate: Date(),
            pagesRead: activity.pagesRead,
            minutesRead: activity.minutesRead,
            createdAt: Date()
        )
    }

    func getActivityHistory(startDate _: Date?, endDate _: Date?) async throws -> [ReadingActivity] {
        []
    }
}

private class PreviewBookRepository: BookRepositoryProtocol {
    func findById(_: String) async throws -> Book? { nil }
    func findByUserId(_: String) async throws -> [Book] {
        [
            Book(
                id: "1",
                userId: "user1",
                googleBooksId: "abc123",
                title: "The Pragmatic Programmer",
                authors: ["Andrew Hunt"],
                pageCount: 352,
                status: .reading,
                currentPage: 150,
                addedAt: Date()
            )
        ]
    }

    func findByUserId(_ userId: String, offset _: Int, limit _: Int?) async throws -> [Book] {
        try await findByUserId(userId)
    }

    func create(_ book: Book) async throws -> Book { book }
    func update(_: String, updates _: BookUpdate) async throws -> Book? { nil }
    func delete(_: String) async throws -> Bool { true }
    func findByStatus(_: String, status _: BookStatus) async throws -> [Book] { [] }
    func exists(userId _: String, googleBooksId _: String) async throws -> Bool { false }
}

private class PreviewGoalRepository: GoalRepositoryProtocol {
    func findById(_: String) async throws -> Goal? { nil }
    func findByUserId(_: String) async throws -> [Goal] {
        [
            Goal(
                id: "1",
                userId: "user1",
                title: "Read 12 books in 2025",
                targetBooks: 12,
                currentBooks: 5,
                startDate: Date(),
                endDate: Calendar.current.date(byAdding: .month, value: 6, to: Date())!,
                completed: false
            )
        ]
    }

    func findByUserId(_ userId: String, offset _: Int, limit _: Int?) async throws -> [Goal] {
        try await findByUserId(userId)
    }

    func findActiveByUserId(_ userId: String) async throws -> [Goal] {
        try await findByUserId(userId).filter { !$0.completed }
    }

    func exists(userId _: String, goalId _: String) async throws -> Bool { true }
    func create(_ goal: Goal) async throws -> Goal { goal }
    func update(_: String, updates _: GoalUpdate) async throws -> Goal? { nil }
    func delete(_: String) async throws -> Bool { true }
}
