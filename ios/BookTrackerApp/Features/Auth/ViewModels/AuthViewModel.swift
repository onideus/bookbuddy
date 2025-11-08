import SwiftUI
import InfrastructureIOS
import CoreDomain

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false

    private let authService: AuthenticationService

    init(authService: AuthenticationService) {
        self.authService = authService
        checkAuthenticationStatus()
    }

    // MARK: - Public Methods

    func login() async {
        guard validate(email: email, password: password) else { return }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await authService.login(email: email, password: password)
            isAuthenticated = true
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
            _ = try await authService.register(email: email, password: password, name: name)
            isAuthenticated = true
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
            isAuthenticated = false
            clearForm()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

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

        guard email.contains("@") && email.contains(".") else {
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
        if let name = name {
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
