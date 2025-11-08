import SwiftUI

struct CreateGoalView: View {
    @ObservedObject var viewModel: GoalsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var targetBooks = 10
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .month, value: 1, to: Date()) ?? Date()

    var body: some View {
        NavigationView {
            Form {
                Section("Goal Details") {
                    TextField("Title", text: $title)
                        .textInputAutocapitalization(.words)

                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Target") {
                    Stepper(value: $targetBooks, in: 1...100) {
                        HStack {
                            Text("Books to read")
                            Spacer()
                            Text("\(targetBooks)")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Section("Duration") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: [.date])

                    DatePicker("End Date", selection: $endDate, in: startDate..., displayedComponents: [.date])
                }

                Section {
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(.secondary)

                        Text("\(durationInDays) days")
                            .font(.subheadline)

                        Spacer()

                        if targetBooks > 0 {
                            Text("\(booksPerWeek) books/week")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Summary")
                } footer: {
                    Text("You'll need to read about \(booksPerWeek) book\(booksPerWeek == 1.0 ? "" : "s") per week to reach your goal.")
                }
            }
            .navigationTitle("New Reading Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await createGoal()
                        }
                    }
                    .disabled(!isValid || viewModel.isLoading)
                }
            }
        }
    }

    // MARK: - Actions

    private func createGoal() async {
        await viewModel.createGoal(
            title: title,
            description: description.isEmpty ? nil : description,
            targetBooks: targetBooks,
            startDate: startDate,
            endDate: endDate
        )

        if viewModel.errorMessage == nil {
            dismiss()
        }
    }

    // MARK: - Computed Properties

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        targetBooks > 0 &&
        endDate > startDate
    }

    private var durationInDays: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: startDate, to: endDate)
        return max(1, components.day ?? 1)
    }

    private var booksPerWeek: Double {
        let weeks = Double(durationInDays) / 7.0
        guard weeks > 0 else { return 0 }
        return Double(targetBooks) / weeks
    }
}

// MARK: - Preview

#Preview {
    CreateGoalView(
        viewModel: GoalsViewModel(
            goalRepository: InfrastructureIOS.InfrastructureFactory(
                configuration: .development
            ).makeGoalRepository()
        )
    )
}
