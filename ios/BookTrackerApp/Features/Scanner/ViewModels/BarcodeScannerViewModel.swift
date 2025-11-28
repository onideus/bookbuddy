import AVFoundation
import Combine
import SwiftUI
import UIKit

/// ViewModel for barcode scanning functionality
@MainActor
final class BarcodeScannerViewModel: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isScanning = false
    @Published var detectedISBN: String?
    @Published var errorMessage: String?
    @Published var cameraPermissionStatus: AVAuthorizationStatus = .notDetermined
    @Published var torchEnabled = false
    @Published var showPermissionAlert = false
    @Published var scanLineOffset: CGFloat = -50

    // MARK: - Public Properties

    let captureSession = AVCaptureSession()

    // MARK: - Computed Properties

    var isFlashlightOn: Bool { torchEnabled }

    // MARK: - Private Properties

    private var videoPreviewLayer: AVCaptureVideoPreviewLayer?
    private let metadataOutput = AVCaptureMetadataOutput()
    private let sessionQueue = DispatchQueue(label: "barcode.capture.session")
    private var onISBNDetected: ((String) -> Void)?

    // MARK: - Initialization

    init(onISBNDetected: ((String) -> Void)? = nil) {
        self.onISBNDetected = onISBNDetected
        super.init()
        checkCameraPermission()
    }

    // MARK: - Camera Permission

    func checkCameraPermission() {
        cameraPermissionStatus = AVCaptureDevice.authorizationStatus(for: .video)

        switch cameraPermissionStatus {
        case .notDetermined:
            requestCameraPermission()
        case .authorized:
            setupCaptureSession()
        case .denied, .restricted:
            showPermissionAlert = true
            errorMessage = "Camera access is required to scan barcodes"
        @unknown default:
            errorMessage = "Unknown camera permission status"
        }
    }

    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            Task { @MainActor in
                self?.cameraPermissionStatus = granted ? .authorized : .denied
                if granted {
                    self?.setupCaptureSession()
                } else {
                    self?.showPermissionAlert = true
                    self?.errorMessage = "Camera access is required to scan barcodes"
                }
            }
        }
    }

    // MARK: - Capture Session Setup

    private func setupCaptureSession() {
        sessionQueue.async { [weak self] in
            guard let self else { return }

            captureSession.beginConfiguration()

            // Add video input
            guard let videoDevice = AVCaptureDevice.default(for: .video) else {
                Task { @MainActor in
                    self.errorMessage = "No camera available"
                }
                return
            }

            do {
                let videoInput = try AVCaptureDeviceInput(device: videoDevice)
                if captureSession.canAddInput(videoInput) {
                    captureSession.addInput(videoInput)
                }
            } catch {
                Task { @MainActor in
                    self.errorMessage = "Failed to setup camera: \(error.localizedDescription)"
                }
                return
            }

            // Add metadata output for barcode detection
            if captureSession.canAddOutput(metadataOutput) {
                captureSession.addOutput(metadataOutput)
                metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
                metadataOutput.metadataObjectTypes = [.ean13, .ean8]
            }

            captureSession.commitConfiguration()
        }
    }

    // MARK: - Scanning Control

    func startScanning() {
        guard cameraPermissionStatus == .authorized else {
            checkCameraPermission()
            return
        }

        sessionQueue.async { [weak self] in
            guard let self, !self.captureSession.isRunning else { return }
            captureSession.startRunning()
            Task { @MainActor in
                self.isScanning = true
                self.detectedISBN = nil
                self.errorMessage = nil
                // Start scan line animation
                self.scanLineOffset = 50
            }
        }
    }

    func stopScanning() {
        sessionQueue.async { [weak self] in
            guard let self, captureSession.isRunning else { return }
            captureSession.stopRunning()
            Task { @MainActor in
                self.isScanning = false
            }
        }
    }

    func toggleFlashlight() {
        toggleTorch()
    }

    func toggleTorch() {
        guard let device = AVCaptureDevice.default(for: .video),
              device.hasTorch
        else {
            return
        }

        sessionQueue.async { [weak self] in
            do {
                try device.lockForConfiguration()
                let newMode: AVCaptureDevice.TorchMode = device.torchMode == .on ? .off : .on
                device.torchMode = newMode
                device.unlockForConfiguration()

                Task { @MainActor in
                    self?.torchEnabled = newMode == .on
                }
            } catch {
                Task { @MainActor in
                    self?.errorMessage = "Failed to toggle flashlight"
                }
            }
        }
    }

    // MARK: - Preview Layer

    func getPreviewLayer() -> AVCaptureVideoPreviewLayer {
        let layer = AVCaptureVideoPreviewLayer(session: captureSession)
        layer.videoGravity = .resizeAspectFill
        return layer
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate

extension BarcodeScannerViewModel: AVCaptureMetadataOutputObjectsDelegate {
    nonisolated func metadataOutput(
        _: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from _: AVCaptureConnection
    ) {
        guard let metadataObject = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let stringValue = metadataObject.stringValue
        else {
            return
        }

        // Validate it's a book ISBN
        guard Self.validateISBN(stringValue) else { return }

        let isbn = Self.convertISBNToISBN13(stringValue)

        // Provide haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)

        Task { @MainActor in
            self.detectedISBN = isbn
            self.stopScanning()
            self.onISBNDetected?(isbn)
        }
    }

    // Static versions for use in nonisolated delegate method
    private nonisolated static func validateISBN(_ code: String) -> Bool {
        let cleanCode = code.replacingOccurrences(of: "-", with: "")

        if cleanCode.count == 13 {
            return cleanCode.hasPrefix("978") || cleanCode.hasPrefix("979")
        } else if cleanCode.count == 10 {
            return true
        }

        return false
    }

    private nonisolated static func convertISBNToISBN13(_ code: String) -> String {
        let cleanCode = code.replacingOccurrences(of: "-", with: "")

        if cleanCode.count == 13 {
            return cleanCode
        }

        guard cleanCode.count == 10 else { return cleanCode }

        let isbn10WithoutCheck = String(cleanCode.prefix(9))
        let isbn13Base = "978" + isbn10WithoutCheck

        var sum = 0
        for (index, char) in isbn13Base.enumerated() {
            if let digit = Int(String(char)) {
                sum += digit * (index.isMultiple(of: 2) ? 1 : 3)
            }
        }
        let checkDigit = (10 - (sum % 10)) % 10

        return isbn13Base + String(checkDigit)
    }
}
