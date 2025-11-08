import SwiftUI

/// Root view that handles navigation based on authentication state
struct RootView: View {
    @EnvironmentObject var container: AppContainer
    @StateObject private var authViewModel: AuthViewModel

    init() {
        // Note: We'll get the actual container from the environment,
        // but we need a placeholder for @StateObject initialization
        // This will be properly initialized when the view appears
        let tempContainer = AppContainer()
        _authViewModel = StateObject(wrappedValue: tempContainer.makeAuthViewModel())
    }

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(container)
            } else {
                LoginView(viewModel: authViewModel)
            }
        }
        .onAppear {
            // Update authentication state when view appears
            container.updateAuthenticationState()
        }
        .onChange(of: authViewModel.isAuthenticated) { newValue in
            container.isAuthenticated = newValue
        }
    }
}

#Preview("Authenticated") {
    let container = AppContainer()
    return RootView()
        .environmentObject(container)
}

#Preview("Not Authenticated") {
    let container = AppContainer()
    return RootView()
        .environmentObject(container)
}
