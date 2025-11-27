import CoreDomain
import SwiftUI

/// View for logging reading activity
struct LogActivityView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject var viewModel: StreakViewModel

    @State private var pagesRead = ""
    @State private var minutesRead = ""

    var onActivityLogged: (() -> Void)?

    var body: some View {
        NavigationView {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("How much did you read?")
                            .font(.headline)
                        Text("Log your reading progress to maintain your streak")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 8)
                }

                Section("Reading Progress") {
                    HStack {
                        Image(systemName: "book.pages")
                            .foregroundColor(.blue)
                        TextField("Pages read", text: $pagesRead)
                            .keyboardType(.numberPad)
                        Text("pages")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.green)
                        TextField("Minutes spent", text: $minutesRead)
                            .keyboardType(.numberPad)
                        Text("minutes")
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button(action: logActivity) {
                        if viewModel.isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                Spacer()
                            }
                        } else {
                            HStack {
                                Spacer()
                                Label("Log Activity", systemImage: "checkmark.circle.fill")
                                    .font(.headline)
                                Spacer()
                            }
                        }
                    }
                    .disabled(!isFormValid || viewModel.isLoading)
                } footer: {
                    Text("Enter at least pages read or minutes spent reading.")
                        .font(.caption)
                }
            }
            .navigationTitle("Log Reading")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                }
            }
            .onChange(of: viewModel.activityLogged) { logged in
                if logged {
                    onActivityLogged?()
                    dismiss()
                }
            }
        }
    }

    // MARK: - Computed Properties

    private var isFormValid: Bool {
        let pages = Int(pagesRead) ?? 0
        let minutes = Int(minutesRead) ?? 0
        return pages > 0 || minutes > 0
    }

    // MARK: - Actions

    private func logActivity() {
        let pages = Int(pagesRead) ?? 0
        let minutes = Int(minutesRead) ?? 0

        Task {
            await viewModel.recordActivity(pagesRead: pages, minutesRead: minutes)
        }
    }
}

// MARK: - Quick Log Button

/// A floating action button for quickly logging activity
struct QuickLogButton: View {
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                Text("Log Reading")
                    .font(.headline)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color.blue)
            .cornerRadius(25)
            .shadow(color: Color.blue.opacity(0.3), radius: 8, x: 0, y: 4)
        }
    }
}

// MARK: - Preview

#Preview {
    LogActivityView(
        viewModel: StreakViewModel(streakRepository: MockStreakRepository())
    )
}

// MARK: - Mock Repository for Preview

private class MockStreakRepository: StreakRepositoryProtocol {
    func getStreak() async throws -> ReadingStreak {
        .empty
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
