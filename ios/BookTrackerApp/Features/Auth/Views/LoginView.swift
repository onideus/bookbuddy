import SwiftUI
import InfrastructureIOS

struct LoginView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var showingRegister = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "book.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)

                    Text("BookBuddy")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Track your reading journey")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                .padding(.bottom, 20)

                // Form
                VStack(spacing: 16) {
                    TextField("Email", text: $viewModel.email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $viewModel.password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)

                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: {
                        Task {
                            await viewModel.login()
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                        } else {
                            Text("Log In")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(viewModel.isLoading)

                    // Developer Login Button
                    #if DEBUG
                    Button(action: {
                        Task {
                            await viewModel.loginAsTestUser()
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                        } else {
                            HStack {
                                Image(systemName: "hammer.fill")
                                Text("Developer Login")
                            }
                            .fontWeight(.medium)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .foregroundColor(.primary)
                    .cornerRadius(10)
                    .disabled(viewModel.isLoading)
                    #endif
                }
                .padding(.horizontal, 32)

                // Register link
                Button(action: {
                    showingRegister = true
                }) {
                    Text("Don't have an account? ")
                        .foregroundColor(.primary) +
                    Text("Sign Up")
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
                .padding(.top, 8)

                Spacer()
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingRegister) {
                RegisterView(viewModel: viewModel)
            }
        }
    }
}

#Preview {
    LoginView(viewModel: AuthViewModel(
        authService: InfrastructureFactory(
            configuration: InfrastructureConfiguration.development
        ).makeAuthenticationService()
    ))
}
