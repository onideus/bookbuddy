// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "InfrastructureIOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "InfrastructureIOS",
            targets: ["InfrastructureIOS"]
        )
    ],
    dependencies: [
        .package(path: "../CoreDomain"),
        .package(path: "../Application"),
        .package(url: "https://github.com/groue/GRDB.swift.git", from: "6.0.0")
    ],
    targets: [
        .target(
            name: "InfrastructureIOS",
            dependencies: [
                "CoreDomain",
                "Application",
                .product(name: "GRDB", package: "GRDB.swift")
            ]
        ),
        .testTarget(
            name: "InfrastructureIOSTests",
            dependencies: ["InfrastructureIOS"]
        )
    ]
)
