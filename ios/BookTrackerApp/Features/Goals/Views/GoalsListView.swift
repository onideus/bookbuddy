import CoreDomain
import InfrastructureIOS
import SwiftUI

struct GoalsListView: View {
    @ObservedObject var viewModel: GoalsViewModel
    @State private var selectedSegment = 0

    private let segments = ["Active", "All", "Completed"]

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.goals.isEmpty {
                ProgressView("Loading goals...")
            } else if viewModel.hasGoals {
                goalsContent
            } else {
                emptyState
            }
        }
        .navigationTitle("Reading Goals")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    viewModel.showingCreateGoal = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $viewModel.showingCreateGoal) {
            CreateGoalView(viewModel: viewModel)
        }
        .task {
            await viewModel.loadGoals()
        }
        .refreshable {
            await viewModel.refresh()
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
    }

    // MARK: - Content Views

    private var goalsContent: some View {
        VStack(spacing: 0) {
            // Segment picker
            Picker("Filter", selection: $selectedSegment) {
                ForEach(0..<segments.count, id: \.self) { index in
                    Text(segments[index])
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Goals list
            List {
                ForEach(filteredGoals) { goal in
                    GoalCard(goal: goal)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                Task {
                                    await viewModel.deleteGoal(goal)
                                }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "target")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Reading Goals")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Set a goal to track your reading progress")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button {
                viewModel.showingCreateGoal = true
            } label: {
                Label("Create Goal", systemImage: "plus.circle.fill")
                    .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .padding(.top)
        }
        .padding()
    }

    // MARK: - Computed Properties

    private var filteredGoals: [Goal] {
        switch selectedSegment {
        case 0: // Active
            return viewModel.activeGoals
        case 1: // All
            return viewModel.goals
        case 2: // Completed
            return viewModel.completedGoals
        default:
            return viewModel.goals
        }
    }
}

// MARK: - Preview

#Preview {
    let viewModel = GoalsViewModel(
        goalRepository: InfrastructureIOS.InfrastructureFactory(
            configuration: .development
        ).makeGoalRepository()
    )

    return GoalsListView(viewModel: viewModel)
}
