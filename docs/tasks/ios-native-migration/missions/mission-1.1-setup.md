# Mission 1.1: Project Setup & Foundation

## Mission Status
🎯 **In Progress**

## Mission Objective
Set up the iOS development environment, create the Xcode project with Clean Architecture Swift packages, configure CI/CD pipeline, and establish development workflows.

## Prerequisites

### Required Software
- macOS Ventura (13.0) or later
- Xcode 15.0 or later
- Swift 5.9 or later
- Git
- Homebrew (for additional tools)

### Recommended Tools
```bash
# Install required tools
brew install swiftlint
brew install swiftformat
brew install fastlane
brew install xcbeautify  # For better build output
```

### Backend Running
Ensure the Next.js backend is running:
```bash
cd /path/to/bookbuddy-mk3
docker-compose up -d  # PostgreSQL
npm run dev           # Next.js server on :3000
```

## Tasks

### 1. Create Xcode Project ✅

**Directory Structure:**
```
bookbuddy-mk3/
├── ios/                          # New iOS app directory
│   ├── BookTrackerApp/           # Main Xcode project
│   │   ├── BookTrackerApp.xcodeproj
│   │   ├── BookTrackerApp/       # App target
│   │   │   ├── BookTrackerApp.swift
│   │   │   ├── ContentView.swift
│   │   │   ├── Info.plist
│   │   │   └── Assets.xcassets/
│   │   └── BookTrackerAppTests/
│   │
│   ├── Packages/                 # Swift Packages
│   │   ├── CoreDomain/
│   │   ├── Application/
│   │   └── InfrastructureIOS/
│   │
│   ├── Fastlane/                # CI/CD configuration
│   ├── .swiftlint.yml
│   └── .swiftformat
│
├── docs/                        # Existing docs
├── prisma/                      # Existing backend
└── ... (existing web app files)
```

**Create Project Steps:**

1. **Open Xcode** → Create new project → iOS → App
   - Product Name: `BookTrackerApp`
   - Team: Your development team
   - Organization Identifier: `com.yourcompany`
   - Interface: SwiftUI
   - Language: Swift
   - Storage: None (we'll use custom solution)
   - Include Tests: Yes
   - Location: `bookbuddy-mk3/ios/`

2. **Configure Project Settings:**
   - Minimum iOS Version: 16.0
   - Supported Orientations: Portrait, Landscape
   - Appearance: Light & Dark

### 2. Create Swift Package: CoreDomain ✅

```bash
cd ios/Packages
mkdir -p CoreDomain
cd CoreDomain
swift package init --type library --name CoreDomain
```

**Edit `Package.swift`:**
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CoreDomain",
    platforms: [
        .iOS(.v16)
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
```

**Create Initial Structure:**
```bash
mkdir -p Sources/CoreDomain/{Entities,ValueObjects,Services,Protocols,Errors}
mkdir -p Tests/CoreDomainTests
```

### 3. Create Swift Package: Application ✅

```bash
cd ios/Packages
mkdir -p Application
cd Application
swift package init --type library --name Application
```

**Edit `Package.swift`:**
```swift
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
        ),
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
        ),
    ]
)
```

**Create Initial Structure:**
```bash
mkdir -p Sources/Application/{Protocols,UseCases,DTOs}
mkdir -p Sources/Application/UseCases/{Books,Goals,Auth}
mkdir -p Tests/ApplicationTests
```

### 4. Create Swift Package: InfrastructureIOS ✅

```bash
cd ios/Packages
mkdir -p InfrastructureIOS
cd InfrastructureIOS
swift package init --type library --name InfrastructureIOS
```

**Edit `Package.swift`:**
```swift
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
        ),
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
        ),
    ]
)
```

**Create Initial Structure:**
```bash
mkdir -p Sources/InfrastructureIOS/{Network,Persistence,Security,Repositories}
mkdir -p Tests/InfrastructureIOSTests
```

### 5. Add Packages to Xcode Project ✅

1. Open `BookTrackerApp.xcodeproj` in Xcode
2. File → Add Package Dependencies
3. Add local packages:
   - `Packages/CoreDomain`
   - `Packages/Application`
   - `Packages/InfrastructureIOS`
4. Link to app target: `BookTrackerApp`

### 6. Configure SwiftLint ✅

**Create `ios/.swiftlint.yml`:**
```yaml
# SwiftLint Configuration
disabled_rules:
  - trailing_whitespace
  - line_length

opt_in_rules:
  - empty_count
  - closure_spacing
  - explicit_init
  - first_where
  - modifier_order
  - redundant_nil_coalescing

excluded:
  - Pods
  - .build
  - DerivedData

identifier_name:
  min_length: 1
  max_length: 60
  excluded:
    - id
    - url
    - db

type_name:
  min_length: 3
  max_length: 50

function_body_length:
  warning: 50
  error: 100

file_length:
  warning: 500
  error: 1000

type_body_length:
  warning: 300
  error: 500

cyclomatic_complexity:
  warning: 10
  error: 20
```

### 7. Configure SwiftFormat ✅

**Create `ios/.swiftformat`:**
```
--swiftversion 5.9
--indent 4
--indentcase false
--trimwhitespace always
--linebreaks lf
--commas inline
--wraparguments before-first
--wrapparameters before-first
--wrapcollections before-first
--maxwidth 120
--exclude Pods,.build,DerivedData
```

### 8. Setup Fastlane ✅

```bash
cd ios
fastlane init
```

**Edit `ios/fastlane/Fastfile`:**
```ruby
default_platform(:ios)

platform :ios do
  desc "Run tests"
  lane :test do
    scan(
      workspace: "BookTrackerApp/BookTrackerApp.xcworkspace",
      scheme: "BookTrackerApp",
      devices: ["iPhone 15 Pro"]
    )
  end

  desc "Build for testing"
  lane :build do
    gym(
      workspace: "BookTrackerApp/BookTrackerApp.xcworkspace",
      scheme: "BookTrackerApp",
      configuration: "Debug",
      skip_package_ipa: true
    )
  end

  desc "Run SwiftLint"
  lane :lint do
    swiftlint(
      mode: :lint,
      executable: "swiftlint",
      config_file: ".swiftlint.yml",
      raise_if_swiftlint_error: true
    )
  end

  desc "Format code with SwiftFormat"
  lane :format do
    sh("swiftformat", "..", "--config", "../.swiftformat")
  end

  desc "Deploy to TestFlight"
  lane :beta do
    increment_build_number
    build_app(
      workspace: "BookTrackerApp/BookTrackerApp.xcworkspace",
      scheme: "BookTrackerApp"
    )
    upload_to_testflight
  end
end
```

### 9. Setup GitHub Actions CI ✅

**Create `.github/workflows/ios-ci.yml`:**
```yaml
name: iOS CI

on:
  push:
    branches: [ main, develop, feature/ios-* ]
    paths:
      - 'ios/**'
      - '.github/workflows/ios-ci.yml'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'ios/**'

jobs:
  build-and-test:
    name: Build and Test
    runs-on: macos-14  # Xcode 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.0'

      - name: Cache SPM dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            ios/.build
          key: ${{ runner.os }}-spm-${{ hashFiles('ios/**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Install dependencies
        run: |
          brew install swiftlint swiftformat

      - name: SwiftLint
        run: |
          cd ios
          swiftlint lint --strict

      - name: SwiftFormat Check
        run: |
          cd ios
          swiftformat --lint .

      - name: Build Swift Packages
        run: |
          cd ios/Packages/CoreDomain
          swift build
          cd ../Application
          swift build
          cd ../InfrastructureIOS
          swift build

      - name: Run Package Tests
        run: |
          cd ios/Packages/CoreDomain
          swift test
          cd ../Application
          swift test
          cd ../InfrastructureIOS
          swift test

      - name: Build iOS App
        run: |
          cd ios
          xcodebuild \
            -workspace BookTrackerApp/BookTrackerApp.xcworkspace \
            -scheme BookTrackerApp \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            build-for-testing

      - name: Run iOS App Tests
        run: |
          cd ios
          xcodebuild \
            -workspace BookTrackerApp/BookTrackerApp.xcworkspace \
            -scheme BookTrackerApp \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            test-without-building

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            ios/build/reports
            ios/build/logs
```

### 10. Create Development Documentation ✅

**Create `ios/README.md`:**
```markdown
# BookTracker iOS App

Native iOS application for book tracking built with SwiftUI and Clean Architecture.

## Quick Start

### Prerequisites
- macOS Ventura (13.0+)
- Xcode 15.0+
- Swift 5.9+
- Backend running (see main README.md)

### First Time Setup

1. **Install dependencies:**
   ```bash
   brew install swiftlint swiftformat fastlane
   ```

2. **Start the backend:**
   ```bash
   # From project root
   docker-compose up -d  # PostgreSQL
   npm run dev           # Next.js API on :3000
   ```

3. **Open Xcode project:**
   ```bash
   cd ios
   open BookTrackerApp/BookTrackerApp.xcworkspace
   ```

4. **Build and run:**
   - Select `BookTrackerApp` scheme
   - Choose simulator: iPhone 15 Pro
   - Press `Cmd + R` to run

### Development Workflow

#### Running the App

**From Xcode:**
1. Open `BookTrackerApp.xcworkspace`
2. Select scheme: `BookTrackerApp`
3. Choose device/simulator
4. Press `Cmd + R` or click ▶️ Play button

**From Command Line:**
```bash
cd ios
xcodebuild \
  -workspace BookTrackerApp/BookTrackerApp.xcworkspace \
  -scheme BookTrackerApp \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build
```

**Using Fastlane:**
```bash
cd ios
fastlane build  # Build only
fastlane test   # Build and run tests
```

#### Running Tests

**All tests:**
```bash
# From Xcode: Cmd + U

# From command line:
cd ios
fastlane test
```

**Package tests only:**
```bash
cd ios/Packages/CoreDomain
swift test

cd ../Application
swift test

cd ../InfrastructureIOS
swift test
```

#### Code Quality

**Lint:**
```bash
cd ios
swiftlint lint
# Or via Fastlane:
fastlane lint
```

**Format:**
```bash
cd ios
swiftformat .
# Or via Fastlane:
fastlane format
```

**Fix all issues:**
```bash
cd ios
swiftlint --fix
swiftformat .
```

### Project Structure

```
ios/
├── BookTrackerApp/              # Main Xcode project
│   ├── BookTrackerApp/          # App target
│   │   ├── App/                 # App lifecycle
│   │   ├── Features/            # Feature modules
│   │   ├── Navigation/          # Navigation logic
│   │   └── Resources/           # Assets, strings
│   └── BookTrackerAppTests/     # UI and integration tests
│
├── Packages/                    # Swift Package Manager
│   ├── CoreDomain/              # Business entities & logic
│   ├── Application/             # Use cases
│   └── InfrastructureIOS/       # iOS-specific implementations
│
├── fastlane/                    # CI/CD automation
└── .swiftlint.yml              # Linting rules
```

### Architecture

```
┌─────────────────────────────────────┐
│     SwiftUI Views                   │
├─────────────────────────────────────┤
│     ViewModels (MVVM)               │
├─────────────────────────────────────┤
│     Use Cases (Application)         │
├─────────────────────────────────────┤
│     Domain Services & Entities      │
├─────────────────────────────────────┤
│     Infrastructure (API, DB, Auth)  │
└─────────────────────────────────────┘
```

### Environment Configuration

**API Endpoint:**
Edit `InfrastructureIOS/Sources/Network/APIConfig.swift`:
```swift
enum APIConfig {
    static let baseURL = "http://localhost:3000"  // Dev
    // static let baseURL = "https://api.booktracker.com"  // Prod
}
```

**Database Location:**
- Simulator: `~/Library/Developer/CoreSimulator/Devices/[UUID]/data/Containers/Data/Application/[UUID]/Documents/`
- Device: Sandboxed app container

### Debugging

**View Database:**
```bash
# Find simulator DB
xcrun simctl get_app_container booted com.yourcompany.BookTrackerApp data

# Open with DB Browser
open -a "DB Browser for SQLite" [path-to-db]
```

**Network Debugging:**
Enable Charles Proxy or use Xcode's Network Debugger:
- Product → Scheme → Edit Scheme → Run → Arguments
- Add: `-com.apple.CFNetwork.diagnostics 3`

**Console Logs:**
```swift
// In code:
print("Debug: \(value)")
os_log("Network request: %@", log: .default, type: .debug, endpoint)
```

### Common Tasks

**Clean build:**
```bash
# Xcode: Cmd + Shift + K, then Cmd + B

# Command line:
cd ios
xcodebuild clean
```

**Reset simulator:**
```bash
xcrun simctl erase all
```

**Update dependencies:**
```bash
cd ios
# SPM will auto-update on build
# Or force resolve:
xcodebuild -resolvePackageDependencies
```

### Troubleshooting

**"No such module" errors:**
1. Clean build folder: `Cmd + Shift + K`
2. Reset package caches: File → Packages → Reset Package Caches
3. Rebuild: `Cmd + B`

**Simulator not appearing:**
```bash
# Restart CoreSimulator
killall -9 com.apple.CoreSimulator.CoreSimulatorService
```

**Code signing issues:**
1. Open Xcode project
2. Select target → Signing & Capabilities
3. Change Team to your Apple ID
4. Automatic signing should resolve

### Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)
- [GRDB Documentation](https://github.com/groue/GRDB.swift)
- [Clean Architecture](https://clean-swift.com)

### Getting Help

- Check existing issues in GitHub
- Review documentation in `docs/tasks/ios-native-migration/`
- Ask in team Slack channel
```

## Deliverables

- [x] Xcode project created
- [x] Three Swift packages (CoreDomain, Application, InfrastructureIOS)
- [x] SwiftLint configuration
- [x] SwiftFormat configuration
- [x] Fastlane setup
- [x] GitHub Actions CI pipeline
- [x] Comprehensive README with quick start guide

## Verification

**Build all packages:**
```bash
cd ios/Packages/CoreDomain && swift build && \
cd ../Application && swift build && \
cd ../InfrastructureIOS && swift build
```

**Expected:** All packages build successfully

**Open Xcode:**
```bash
cd ios
open BookTrackerApp/BookTrackerApp.xcworkspace
```

**Expected:** Project opens, all packages linked, no errors

**Run linting:**
```bash
cd ios
swiftlint lint
```

**Expected:** No critical errors (warnings acceptable in setup phase)

## Success Criteria

- ✅ Xcode project builds without errors
- ✅ All three Swift packages compile
- ✅ CI pipeline runs successfully
- ✅ SwiftLint and SwiftFormat configured
- ✅ README with clear quick start instructions
- ✅ Can run app in simulator
- ✅ Tests can be executed

## Next Steps

After completing this mission:
1. Proceed to Mission 1.2: Domain Layer Implementation
2. Begin porting TypeScript entities to Swift
3. Establish shared test fixtures

## Notes

- Keep backend running during iOS development for API testing
- Use `iPhone 15 Pro` simulator as baseline
- Configure API base URL in `APIConfig.swift`
- Database will be created automatically on first app launch
