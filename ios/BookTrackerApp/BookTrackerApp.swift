import SwiftUI

@main
struct BookTrackerApp: App {
    @StateObject private var container = AppContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(container)
        }
    }
}
