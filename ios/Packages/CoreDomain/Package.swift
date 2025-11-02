// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CoreDomain",
    platforms: [
        .iOS(.v16),
    ],
    products: [
        .library(
            name: "CoreDomain",
            targets: ["CoreDomain"]
        ),
    ],
    targets: [
        .target(
            name: "CoreDomain",
            dependencies: []
        ),
        .testTarget(
            name: "CoreDomainTests",
            dependencies: ["CoreDomain"]
        ),
    ]
)
