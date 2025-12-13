import Foundation
import InfrastructureIOS

@MainActor
class ImportGoodreadsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var isLoading = false
    @Published var selectedFileName: String?
    @Published var importResult: ImportGoodreadsResponse?
    @Published var errorMessage: String?

    // MARK: - Dependencies

    private let networkClient: NetworkClientProtocol

    // MARK: - Initialization

    init(networkClient: NetworkClientProtocol) {
        self.networkClient = networkClient
    }

    // MARK: - Public Methods

    func importCSV(csvContent: String, fileName: String) async {
        guard !csvContent.isEmpty else {
            errorMessage = "CSV file is empty"
            return
        }

        // Validate file size (max 10MB)
        let maxSize = 10 * 1024 * 1024 // 10MB in bytes
        if csvContent.utf8.count > maxSize {
            errorMessage = "File is too large. Maximum size is 10MB."
            return
        }

        isLoading = true
        errorMessage = nil
        importResult = nil
        selectedFileName = fileName

        do {
            let endpoint = try APIEndpoint.importGoodreads(csvContent: csvContent)
            let response: ImportGoodreadsResponse = try await networkClient.request(endpoint)

            importResult = response

            if !response.success {
                errorMessage = response.message
            }
        } catch let error as APIError {
            switch error {
            case .unauthorized:
                errorMessage = "Session expired. Please log in again."
            case .httpError(_, let message):
                errorMessage = message ?? "Import failed"
            case .serverError:
                errorMessage = "Server error. Please try again later."
            case .networkError:
                errorMessage = "Network error. Please check your connection."
            default:
                errorMessage = "Import failed: \(error.localizedDescription)"
            }
        } catch {
            errorMessage = "Import failed: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func reset() {
        selectedFileName = nil
        importResult = nil
        errorMessage = nil
        isLoading = false
    }

    // MARK: - Computed Properties

    var hasResult: Bool {
        importResult != nil
    }

    var hasErrors: Bool {
        if let errors = importResult?.errors, !errors.isEmpty {
            return true
        }
        return false
    }

    var successMessage: String? {
        guard let result = importResult, result.success else { return nil }
        return "Successfully imported \(result.imported) books. \(result.skipped) books were skipped."
    }
}
