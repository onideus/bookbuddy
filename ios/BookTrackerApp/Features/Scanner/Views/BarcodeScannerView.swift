import AVFoundation
import SwiftUI
import UIKit

struct BarcodeScannerView: View {
    @StateObject private var viewModel: BarcodeScannerViewModel
    @Environment(\.dismiss) private var dismiss

    init(onISBNDetected: @escaping (String) -> Void) {
        _viewModel = StateObject(wrappedValue: BarcodeScannerViewModel(onISBNDetected: onISBNDetected))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Camera Preview
                CameraPreviewView(session: viewModel.captureSession)
                    .ignoresSafeArea()

                // Overlay
                scannerOverlay

                // Status indicator
                VStack {
                    Spacer()
                    statusCard
                }
            }
            .navigationTitle("Scan ISBN")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.stopScanning()
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button {
                        viewModel.toggleFlashlight()
                    } label: {
                        Image(systemName: viewModel.isFlashlightOn ? "flashlight.on.fill" : "flashlight.off.fill")
                    }
                }
            }
            .onAppear {
                viewModel.startScanning()
            }
            .onDisappear {
                viewModel.stopScanning()
            }
            .alert("Camera Access Required", isPresented: $viewModel.showPermissionAlert) {
                Button("Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {
                    dismiss()
                }
            } message: {
                Text("Please allow camera access in Settings to scan book barcodes.")
            }
            .onChange(of: viewModel.detectedISBN) { isbn in
                if isbn != nil {
                    dismiss()
                }
            }
        }
    }

    // MARK: - Scanner Overlay

    private var scannerOverlay: some View {
        GeometryReader { geometry in
            let scannerWidth = min(geometry.size.width * 0.8, 300.0)
            let scannerHeight = scannerWidth * 0.4

            ZStack {
                // Dark overlay with cutout
                Rectangle()
                    .fill(Color.black.opacity(0.5))
                    .mask(
                        ZStack {
                            Rectangle()
                            RoundedRectangle(cornerRadius: 12)
                                .frame(width: scannerWidth, height: scannerHeight)
                                .blendMode(.destinationOut)
                        }
                        .compositingGroup()
                    )

                // Scanner frame
                RoundedRectangle(cornerRadius: 12)
                    .stroke(viewModel.isScanning ? Color.green : Color.white, lineWidth: 3)
                    .frame(width: scannerWidth, height: scannerHeight)

                // Corner accents
                scannerCorners(width: scannerWidth, height: scannerHeight)

                // Scanning line animation
                if viewModel.isScanning {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.green)
                        .frame(width: scannerWidth - 20, height: 2)
                        .offset(y: viewModel.scanLineOffset)
                        .animation(
                            Animation.easeInOut(duration: 1.5)
                                .repeatForever(autoreverses: true),
                            value: viewModel.scanLineOffset
                        )
                }
            }
        }
    }

    private func scannerCorners(width: CGFloat, height: CGFloat) -> some View {
        ZStack {
            topLeftCorner(width: width, height: height)
            topRightCorner(width: width, height: height)
            bottomLeftCorner(width: width, height: height)
            bottomRightCorner(width: width, height: height)
        }
    }

    private func topLeftCorner(width: CGFloat, height: CGFloat) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Rectangle().fill(Color.green).frame(width: 20, height: 4)
                Spacer()
            }
            Rectangle().fill(Color.green).frame(width: 4, height: 16)
            Spacer()
        }
        .frame(width: width, height: height)
    }

    private func topRightCorner(width: CGFloat, height: CGFloat) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Spacer()
                Rectangle().fill(Color.green).frame(width: 20, height: 4)
            }
            HStack {
                Spacer()
                Rectangle().fill(Color.green).frame(width: 4, height: 16)
            }
            Spacer()
        }
        .frame(width: width, height: height)
    }

    private func bottomLeftCorner(width: CGFloat, height: CGFloat) -> some View {
        VStack(spacing: 0) {
            Spacer()
            HStack {
                Rectangle().fill(Color.green).frame(width: 4, height: 16)
                Spacer()
            }
            HStack(spacing: 0) {
                Rectangle().fill(Color.green).frame(width: 20, height: 4)
                Spacer()
            }
        }
        .frame(width: width, height: height)
    }

    private func bottomRightCorner(width: CGFloat, height: CGFloat) -> some View {
        VStack(spacing: 0) {
            Spacer()
            HStack {
                Spacer()
                Rectangle().fill(Color.green).frame(width: 4, height: 16)
            }
            HStack(spacing: 0) {
                Spacer()
                Rectangle().fill(Color.green).frame(width: 20, height: 4)
            }
        }
        .frame(width: width, height: height)
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 8) {
            if viewModel.isScanning {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(.white)
                    Text("Point camera at barcode")
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
            } else if let isbn = viewModel.detectedISBN {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("ISBN: \(isbn)")
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
            } else {
                Text("Initializing camera...")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
        }
        .padding()
        .background(Color.black.opacity(0.7))
        .cornerRadius(12)
        .padding(.bottom, 48)
    }
}

// MARK: - Camera Preview

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context _: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.session = session
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context _: Context) {
        uiView.session = session
    }
}

class CameraPreviewUIView: UIView {
    var session: AVCaptureSession? {
        didSet {
            guard let session else { return }
            previewLayer.session = session
        }
    }

    private lazy var previewLayer: AVCaptureVideoPreviewLayer = {
        let layer = AVCaptureVideoPreviewLayer()
        layer.videoGravity = .resizeAspectFill
        return layer
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.addSublayer(previewLayer)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer.frame = bounds
    }
}

// Preview disabled - requires camera access
// #Preview {
//     BarcodeScannerView { isbn in
//         print("Detected ISBN: \(isbn)")
//     }
// }
