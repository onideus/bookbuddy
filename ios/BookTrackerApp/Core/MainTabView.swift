import InfrastructureIOS
import SwiftUI

/// Main tab navigation for the authenticated app
struct MainTabView: View {
    @EnvironmentObject var container: AppContainer
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                DashboardView(
                    viewModel: container.makeDashboardViewModel(),
                    selectedTab: $selectedTab
                )
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(0)

            NavigationStack {
                BooksListView(
                    viewModel: container.makeBooksViewModel(),
                    searchBooksUseCase: container.makeSearchBooksUseCase(),
                    addBookUseCase: container.makeAddBookUseCase(),
                    currentUserId: container.getCurrentUserId()
                )
            }
            .tabItem {
                Label("Books", systemImage: "book.fill")
            }
            .tag(1)

            NavigationStack {
                GoalsListView(viewModel: container.makeGoalsViewModel())
            }
            .tabItem {
                Label("Goals", systemImage: "target")
            }
            .tag(2)

            NavigationStack {
                SearchView(viewModel: container.makeSearchViewModel())
            }
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(3)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(4)
        }
    }
}

/// Placeholder view for unimplemented features
struct PlaceholderView: View {
    let title: String
    let icon: String

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 60))
                    .foregroundColor(.secondary)

                Text("\(title) Coming Soon")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("This feature is under development")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .navigationTitle(title)
        }
    }
}

/// Settings view with logout functionality
struct SettingsView: View {
    @EnvironmentObject var container: AppContainer
    @State private var showingExportSheet = false
    @State private var exportData: ExportData?
    @State private var isExporting = false
    @State private var exportError: String?

    var body: some View {
        NavigationView {
            List {
                Section("Data") {
                    Button {
                        showingExportSheet = true
                    } label: {
                        Label("Export My Data", systemImage: "square.and.arrow.up")
                    }
                }

                Section("Account") {
                    Button(role: .destructive) {
                        Task {
                            let authViewModel = container.makeAuthViewModel()
                            await authViewModel.logout()
                            container.updateAuthenticationState()
                        }
                    } label: {
                        Label("Log Out", systemImage: "arrow.right.square")
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog("Export Data", isPresented: $showingExportSheet) {
                Button("Export Books (JSON)") {
                    exportBooks(format: "json")
                }
                Button("Export Books (CSV)") {
                    exportBooks(format: "csv")
                }
                Button("Export Goals (JSON)") {
                    exportGoals(format: "json")
                }
                Button("Export Goals (CSV)") {
                    exportGoals(format: "csv")
                }
                Button("Export All Data") {
                    exportAllData()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Choose what data to export")
            }
            .sheet(item: $exportData) { data in
                ShareSheet(items: [data.url])
            }
            .alert("Export Error", isPresented: .constant(exportError != nil)) {
                Button("OK") {
                    exportError = nil
                }
            } message: {
                if let error = exportError {
                    Text(error)
                }
            }
            .overlay {
                if isExporting {
                    ProgressView("Exporting...")
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(8)
                        .shadow(radius: 4)
                }
            }
        }
    }

    private func exportBooks(format: String) {
        Task {
            isExporting = true
            do {
                let data = try await fetchExportData(endpoint: "/export/books?format=\(format)")
                let filename = "books_export.\(format)"
                exportData = try saveAndShare(data: data, filename: filename)
            } catch {
                exportError = "Failed to export books: \(error.localizedDescription)"
            }
            isExporting = false
        }
    }

    private func exportGoals(format: String) {
        Task {
            isExporting = true
            do {
                let data = try await fetchExportData(endpoint: "/export/goals?format=\(format)")
                let filename = "goals_export.\(format)"
                exportData = try saveAndShare(data: data, filename: filename)
            } catch {
                exportError = "Failed to export goals: \(error.localizedDescription)"
            }
            isExporting = false
        }
    }

    private func exportAllData() {
        Task {
            isExporting = true
            do {
                let data = try await fetchExportData(endpoint: "/export/all")
                let filename = "booktracker_export.json"
                exportData = try saveAndShare(data: data, filename: filename)
            } catch {
                exportError = "Failed to export data: \(error.localizedDescription)"
            }
            isExporting = false
        }
    }

    private func fetchExportData(endpoint: String) async throws -> Data {
        // Use the network client from container
        let networkClient = container.factory.makeNetworkClient()
        let endpoint = APIEndpoint(
            path: endpoint.components(separatedBy: "?").first ?? endpoint,
            method: .get,
            queryItems: parseQueryItems(from: endpoint),
            requiresAuth: true
        )
        return try await networkClient.requestRaw(endpoint)
    }

    private func parseQueryItems(from path: String) -> [URLQueryItem]? {
        guard let queryString = path.components(separatedBy: "?").last,
              queryString != path else { return nil }
        return queryString.components(separatedBy: "&").compactMap { item in
            let parts = item.components(separatedBy: "=")
            guard parts.count == 2 else { return nil }
            return URLQueryItem(name: parts[0], value: parts[1])
        }
    }

    private func saveAndShare(data: Data, filename: String) throws -> ExportData {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(filename)
        try data.write(to: fileURL)
        return ExportData(url: fileURL)
    }
}

/// Data wrapper for export sharing
struct ExportData: Identifiable {
    let id = UUID()
    let url: URL
}

/// Share sheet for exporting data
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context _: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_: UIActivityViewController, context _: Context) {}
}

#Preview {
    let container = AppContainer()
    return MainTabView()
        .environmentObject(container)
}
