// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Application",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Application",
            targets: ["Application"]
        )
    ],
    dependencies: [
        .package(path: "../CoreDomain")
    ],
    targets: [
        .target(
            name: "Application",
            dependencies: ["CoreDomain"]
        ),
        .testTarget(
            name: "ApplicationTests",
            dependencies: ["Application"]
        )
    ]
)
