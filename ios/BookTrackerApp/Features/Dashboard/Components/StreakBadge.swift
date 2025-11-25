import CoreDomain
import SwiftUI

/// A badge displaying the current reading streak with a flame icon
struct StreakBadge: View {
    let streak: ReadingStreak
    var compact: Bool = false

    var body: some View {
        HStack(spacing: compact ? 4 : 8) {
            Image(systemName: streak.iconName)
                .font(compact ? .subheadline : .title2)
                .foregroundColor(streakColor)

            if !compact {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(streak.currentStreak)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(streakColor)

                    Text(streak.currentStreak == 1 ? "day" : "days")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                Text("\(streak.currentStreak)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(streakColor)
            }
        }
        .padding(compact ? 6 : 12)
        .background(streakBackgroundColor)
        .cornerRadius(compact ? 8 : 12)
    }

    private var streakColor: Color {
        switch streak.streakStatus {
        case .active:
            return .orange
        case .atRisk:
            return .yellow
        case .noStreak, .broken:
            return .gray
        }
    }

    private var streakBackgroundColor: Color {
        switch streak.streakStatus {
        case .active:
            return .orange.opacity(0.15)
        case .atRisk:
            return .yellow.opacity(0.15)
        case .noStreak, .broken:
            return .gray.opacity(0.1)
        }
    }
}

/// A larger card showing streak details
struct StreakCard: View {
    let streak: ReadingStreak
    var onLogActivity: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with streak count
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: streak.iconName)
                            .font(.title)
                            .foregroundColor(streakColor)

                        Text("\(streak.currentStreak)")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(streakColor)
                    }

                    Text("Day Streak")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Log activity button
                if let onLogActivity {
                    Button(action: onLogActivity) {
                        VStack(spacing: 4) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                            Text("Log")
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                    }
                }
            }

            // Motivational message
            Text(streak.message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)

            // Stats row
            HStack(spacing: 20) {
                StatItem(value: streak.longestStreak, label: "Longest")
                StatItem(value: streak.totalDaysRead, label: "Total Days")

                if streak.isAtRisk {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.yellow)
                        Text("At Risk!")
                            .font(.caption)
                            .foregroundColor(.yellow)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    private var streakColor: Color {
        switch streak.streakStatus {
        case .active:
            return .orange
        case .atRisk:
            return .yellow
        case .noStreak, .broken:
            return .gray
        }
    }
}

/// A small stat item for displaying streak statistics
private struct StatItem: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.headline)
                .foregroundColor(.primary)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Previews

#Preview("Streak Badge") {
    VStack(spacing: 20) {
        StreakBadge(streak: ReadingStreak(
            currentStreak: 5,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date(),
            isActiveToday: true,
            isAtRisk: false,
            message: "Great job!"
        ))

        StreakBadge(streak: ReadingStreak(
            currentStreak: 3,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date().addingTimeInterval(-86400),
            isActiveToday: false,
            isAtRisk: true,
            message: "Don't break your streak!"
        ))

        StreakBadge(streak: .empty)

        StreakBadge(streak: ReadingStreak(
            currentStreak: 5,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date(),
            isActiveToday: true,
            isAtRisk: false,
            message: "Great job!"
        ), compact: true)
    }
    .padding()
}

#Preview("Streak Card") {
    VStack(spacing: 20) {
        StreakCard(streak: ReadingStreak(
            currentStreak: 5,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date(),
            isActiveToday: true,
            isAtRisk: false,
            message: "Nice! 5 days in a row. You're building a habit!"
        ), onLogActivity: {})

        StreakCard(streak: ReadingStreak(
            currentStreak: 3,
            longestStreak: 12,
            totalDaysRead: 45,
            lastActivityDate: Date().addingTimeInterval(-86400),
            isActiveToday: false,
            isAtRisk: true,
            message: "Don't let your streak slip! Read today to keep it going."
        ), onLogActivity: {})
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
