import CoreDomain
import SwiftUI

struct GoalCard: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.title)
                        .font(.headline)
                        .lineLimit(2)

                    if let description = goal.description {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                statusBadge
            }

            // Progress
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("\(goal.currentBooks) / \(goal.targetBooks) books")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Spacer()

                    Text("\(goal.progressPercentageInt)%")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                ProgressView(value: goal.progressPercentage)
                    .tint(progressColor)
            }

            // Date information
            HStack {
                Label {
                    Text(dateRangeText)
                } icon: {
                    Image(systemName: "calendar")
                }
                .font(.caption)
                .foregroundColor(.secondary)

                Spacer()

                if !goal.completed, goal.hasStarted {
                    Label {
                        Text(remainingDaysText)
                    } icon: {
                        Image(systemName: goal.isOverdue ? "exclamationmark.circle" : "clock")
                    }
                    .font(.caption)
                    .foregroundColor(goal.isOverdue ? .red : .secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    // MARK: - Subviews

    private var statusBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: goal.status.iconName)
                .font(.caption2)

            Text(goal.status.displayName)
                .font(.caption2)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusBackgroundColor)
        .foregroundColor(statusForegroundColor)
        .cornerRadius(8)
    }

    // MARK: - Computed Properties

    private var progressColor: Color {
        if goal.completed {
            .green
        } else if goal.isOverdue {
            .red
        } else if goal.progressPercentage > 0.7 {
            .orange
        } else {
            .blue
        }
    }

    private var statusBackgroundColor: Color {
        switch goal.status {
        case .completed:
            .green.opacity(0.2)
        case .inProgress:
            .blue.opacity(0.2)
        case .overdue:
            .red.opacity(0.2)
        case .notStarted:
            .gray.opacity(0.2)
        }
    }

    private var statusForegroundColor: Color {
        switch goal.status {
        case .completed:
            .green
        case .inProgress:
            .blue
        case .overdue:
            .red
        case .notStarted:
            .gray
        }
    }

    private var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none

        let start = formatter.string(from: goal.startDate)
        let end = formatter.string(from: goal.endDate)

        return "\(start) - \(end)"
    }

    private var remainingDaysText: String {
        if goal.isOverdue {
            // daysRemaining is negative when overdue, so negate to get positive days overdue
            let daysOverdue = -goal.daysRemaining
            return "\(daysOverdue) day\(daysOverdue == 1 ? "" : "s") overdue"
        } else {
            // daysRemaining is positive when active
            let daysLeft = goal.daysRemaining
            return "\(daysLeft) day\(daysLeft == 1 ? "" : "s") left"
        }
    }
}

// MARK: - Preview

#Preview("Active Goal") {
    GoalCard(
        goal: Goal(
            id: "1",
            userId: "user1",
            title: "Read 12 books this year",
            description: "Challenge myself to read more fiction",
            targetBooks: 12,
            currentBooks: 5,
            startDate: Date().addingTimeInterval(-30 * 24 * 60 * 60),
            endDate: Date().addingTimeInterval(60 * 24 * 60 * 60),
            completed: false
        )
    )
    .padding()
}

#Preview("Completed Goal") {
    GoalCard(
        goal: Goal(
            id: "2",
            userId: "user1",
            title: "Summer Reading Challenge",
            description: nil,
            targetBooks: 5,
            currentBooks: 5,
            startDate: Date().addingTimeInterval(-90 * 24 * 60 * 60),
            endDate: Date().addingTimeInterval(-10 * 24 * 60 * 60),
            completed: true
        )
    )
    .padding()
}

#Preview("Overdue Goal") {
    GoalCard(
        goal: Goal(
            id: "3",
            userId: "user1",
            title: "Monthly Reading Sprint",
            description: "Quick reading goal",
            targetBooks: 3,
            currentBooks: 1,
            startDate: Date().addingTimeInterval(-45 * 24 * 60 * 60),
            endDate: Date().addingTimeInterval(-5 * 24 * 60 * 60),
            completed: false
        )
    )
    .padding()
}
