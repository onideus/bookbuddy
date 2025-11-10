import SwiftUI

/// Main tab navigation for the authenticated app
struct MainTabView: View {
    @EnvironmentObject var container: AppContainer

    var body: some View {
        TabView {
            BooksListView(
                viewModel: container.makeBooksViewModel(),
                searchBooksUseCase: container.makeSearchBooksUseCase(),
                addBookUseCase: container.makeAddBookUseCase(),
                currentUserId: container.getCurrentUserId()
            )
            .tabItem {
                Label("Books", systemImage: "book.fill")
            }

            GoalsListView(viewModel: container.makeGoalsViewModel())
                .tabItem {
                    Label("Goals", systemImage: "target")
                }

            SearchView(viewModel: container.makeSearchViewModel())
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
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

    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    Button(role: .destructive, action: {
                        Task {
                            let authViewModel = container.makeAuthViewModel()
                            await authViewModel.logout()
                            container.updateAuthenticationState()
                        }
                    }) {
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
        }
    }
}

#Preview {
    let container = AppContainer()
    return MainTabView()
        .environmentObject(container)
}
