import CoreDomain
import InfrastructureIOS
import SwiftUI

struct SearchView: View {
    @ObservedObject var viewModel: SearchViewModel
    @State private var showingSuccessToast = false
    @State private var successMessage = ""

    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.searchQuery.isEmpty {
                    emptyState
                } else if viewModel.isSearching {
                    loadingState
                } else if viewModel.hasResults {
                    searchResults
                } else if !viewModel.searchQuery.isEmpty {
                    noResultsState
                }

                // Success toast
                if showingSuccessToast {
                    VStack {
                        Spacer()

                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)

                            Text(successMessage)
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(radius: 4)
                        .padding()
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .navigationTitle("Search Books")
            .searchable(
                text: $viewModel.searchQuery,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search by title, author, or ISBN"
            )
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
    }

    // MARK: - Content Views

    private var searchResults: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.searchResults, id: \.id) { book in
                    SearchResultCard(book: book) { status in
                        Task {
                            await addBook(book, status: status)
                        }
                    }
                }
            }
            .padding()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("Discover Books")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Search for books by title, author, or ISBN")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            Text("Searching...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var noResultsState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Books Found")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Try a different search term")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
    }

    // MARK: - Actions

    private func addBook(_ book: BookSearchResult, status: BookStatus) async {
        let success = await viewModel.addBookToLibrary(book, status: status)

        if success {
            successMessage = "Added to \(status.displayName)"
            withAnimation {
                showingSuccessToast = true
            }

            // Hide toast after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation {
                    showingSuccessToast = false
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    SearchView(
        viewModel: SearchViewModel(
            searchService: InfrastructureIOS.InfrastructureFactory(
                configuration: .development
            ).makeExternalBookSearchService(),
            bookRepository: InfrastructureIOS.InfrastructureFactory(
                configuration: .development
            ).makeBookRepository()
        )
    )
}
