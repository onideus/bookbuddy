import InfrastructureIOS
import SwiftUI
import UniformTypeIdentifiers

struct ImportGoodreadsView: View {
    @StateObject var viewModel: ImportGoodreadsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingFilePicker = false

    let onImportCompleted: () -> Void

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Icon
                    Image(systemName: "square.and.arrow.down.on.square")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                        .padding(.top, 20)

                    // Title and Instructions
                    VStack(spacing: 12) {
                        Text("Import from Goodreads")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Import your reading list from Goodreads")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    // Instructions Card
                    VStack(alignment: .leading, spacing: 16) {
                        Label("How to export from Goodreads", systemImage: "info.circle")
                            .font(.headline)
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 12) {
                            InstructionStep(number: 1, text: "Go to goodreads.com/review/import")
                            InstructionStep(number: 2, text: "Click \"Export Library\"")
                            InstructionStep(number: 3, text: "Download the CSV file")
                            InstructionStep(number: 4, text: "Select it below to import")
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // File Selection
                    if let fileName = viewModel.selectedFileName {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .foregroundColor(.blue)
                            Text(fileName)
                                .font(.subheadline)
                                .lineLimit(1)
                            Spacer()
                            Button(action: {
                                viewModel.reset()
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        .padding(.horizontal)
                    }

                    // Action Buttons
                    VStack(spacing: 12) {
                        Button(action: {
                            showingFilePicker = true
                        }) {
                            Label(
                                viewModel.selectedFileName == nil ? "Select CSV File" : "Change File",
                                systemImage: "doc.badge.plus"
                            )
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)

                        if viewModel.selectedFileName != nil, !viewModel.isLoading {
                            Button(action: {
                                Task {
                                    // This will be called from the file picker
                                }
                            }) {
                                Label("Import Books", systemImage: "arrow.down.circle.fill")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.green)
                                    .cornerRadius(12)
                            }
                            .padding(.horizontal)
                            .disabled(viewModel.isLoading)
                        }
                    }

                    // Loading Indicator
                    if viewModel.isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Importing your books...")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                    }

                    // Results
                    if let result = viewModel.importResult {
                        ResultView(result: result)
                            .padding(.horizontal)
                    }

                    // Error Message
                    if let error = viewModel.errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.red)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(10)
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                if viewModel.hasResult {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            onImportCompleted()
                            dismiss()
                        }
                    }
                }
            }
            .sheet(isPresented: $showingFilePicker) {
                DocumentPicker { url in
                    handleFileSelection(url: url)
                }
            }
        }
    }

    private func handleFileSelection(url: URL) {
        do {
            guard url.startAccessingSecurityScopedResource() else {
                viewModel.errorMessage = "Cannot access file"
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            let csvContent = try String(contentsOf: url, encoding: .utf8)
            let fileName = url.lastPathComponent

            Task {
                await viewModel.importCSV(csvContent: csvContent, fileName: fileName)
            }
        } catch {
            viewModel.errorMessage = "Failed to read file: \(error.localizedDescription)"
        }
    }
}

// MARK: - Instruction Step

struct InstructionStep: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.headline)
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Color.blue)
                .clipShape(Circle())

            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)

            Spacer()
        }
    }
}

// MARK: - Result View

struct ResultView: View {
    let result: ImportGoodreadsResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Success Header
            if result.success {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.title2)
                    Text("Import Successful!")
                        .font(.headline)
                        .foregroundColor(.green)
                }
            }

            // Statistics
            VStack(spacing: 12) {
                StatRow(label: "Imported", value: "\(result.imported)", color: .green)
                StatRow(label: "Skipped", value: "\(result.skipped)", color: .orange)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)

            // Message
            Text(result.message)
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Errors (if any)
            if let errors = result.errors, !errors.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Issues Found", systemImage: "exclamationmark.triangle")
                        .font(.headline)
                        .foregroundColor(.orange)

                    ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(Array(errors.prefix(10).enumerated()), id: \.offset) { _, error in
                                ErrorRow(error: error)
                            }

                            if errors.count > 10 {
                                Text("... and \(errors.count - 10) more")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .padding(.top, 4)
                            }
                        }
                    }
                    .frame(maxHeight: 200)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Stat Row

struct StatRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.headline)
                .foregroundColor(color)
        }
    }
}

// MARK: - Error Row

struct ErrorRow: View {
    let error: ImportError

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Row \(error.row)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
            Text(error.reason)
                .font(.caption)
                .foregroundColor(.primary)
        }
        .padding(8)
        .background(Color(.systemGray6))
        .cornerRadius(6)
    }
}

// MARK: - Document Picker

struct DocumentPicker: UIViewControllerRepresentable {
    let onFileSelected: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.commaSeparatedText])
        picker.allowsMultipleSelection = false
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_: UIDocumentPickerViewController, context _: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onFileSelected: onFileSelected)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onFileSelected: (URL) -> Void

        init(onFileSelected: @escaping (URL) -> Void) {
            self.onFileSelected = onFileSelected
        }

        func documentPicker(_: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            onFileSelected(url)
        }
    }
}

// MARK: - Preview

#Preview {
    ImportGoodreadsView(
        viewModel: ImportGoodreadsViewModel(
            networkClient: NetworkClient.development()
        ),
        onImportCompleted: {}
    )
}
