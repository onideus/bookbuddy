import CoreDomain
import InfrastructureIOS
import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var isLoading = false
    @Published var isDevLoginLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false
    @Published var currentUser: User?

    /// Returns true if any login operation is in progress
    var isAnyLoginLoading: Bool {
        isLoading || isDevLoginLoading
    }

    private let authService: AuthenticationService
    private var onAuthenticationChanged: ((String?) -> Void)?

    init(authService: AuthenticationService, onAuthenticationChanged: ((String?) -> Void)? = nil) {
        self.authService = authService
        self.onAuthenticationChanged = onAuthenticationChanged
        checkAuthenticationStatus()
    }

    // MARK: - Public Methods

    func login() async {
        guard validate(email: email, password: password) else { return }

        isLoading = true
        errorMessage = nil

        do {
            let user = try await authService.login(email: email, password: password)
            currentUser = user
            isAuthenticated = true
            onAuthenticationChanged?(user.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func register() async {
        guard validate(email: email, password: password, name: name) else { return }

        isLoading = true
        errorMessage = nil

        do {
            let user = try await authService.register(email: email, password: password, name: name)
            currentUser = user
            isAuthenticated = true
            onAuthenticationChanged?(user.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func logout() async {
        isLoading = true
        errorMessage = nil

        do {
            try await authService.logout()
            currentUser = nil
            isAuthenticated = false
            onAuthenticationChanged?(nil)
            clearForm()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Developer Methods

    #if DEBUG
    func loginAsTestUser() async {
        guard validate(email: "dev@booktracker.com", password: "P@s$w0rD!") else { return }

        isDevLoginLoading = true
        errorMessage = nil

        do {
            let user = try await authService.login(email: "dev@booktracker.com", password: "P@s$w0rD!")
            currentUser = user
            isAuthenticated = true
            onAuthenticationChanged?(user.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isDevLoginLoading = false
    }
    #endif

    // MARK: - Private Methods

    private func checkAuthenticationStatus() {
        isAuthenticated = authService.isAuthenticated()
    }

    private func validate(email: String, password: String, name: String? = nil) -> Bool {
        // Clear previous error
        errorMessage = nil

        // Validate email
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "Email is required"
            return false
        }

        guard email.contains("@"), email.contains(".") else {
            errorMessage = "Invalid email format"
            return false
        }

        // Validate password
        guard !password.isEmpty else {
            errorMessage = "Password is required"
            return false
        }

        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            return false
        }

        // Validate name if registering
        if let name {
            guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
                errorMessage = "Name is required"
                return false
            }
        }

        return true
    }

    private func clearForm() {
        email = ""
        password = ""
        name = ""
    }
}
