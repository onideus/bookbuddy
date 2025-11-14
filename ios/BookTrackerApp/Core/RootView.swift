import SwiftUI

/// Root view that handles navigation based on authentication state
struct RootView: View {
    @EnvironmentObject var container: AppContainer
    @State private var showingRegister = false

    var body: some View {
        Group {
            if container.isAuthenticated {
                MainTabView()
            } else {
                if showingRegister {
                    RegisterView(
                        viewModel: container.makeAuthViewModel(),
                        onShowLogin: { showingRegister = false }
                    )
                } else {
                    LoginView(
                        viewModel: container.makeAuthViewModel(),
                        onShowRegister: { showingRegister = true }
                    )
                }
            }
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
