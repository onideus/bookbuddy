# BookTracker iOS

Native iOS application for BookTracker built with SwiftUI and Clean Architecture.

## Quick Start

### Prerequisites

1. **macOS**: Ventura (13.0) or later
2. **Xcode**: 15.2 or later
3. **Swift**: 5.9+
4. **Ruby**: 3.2+ (for Fastlane)
5. **Homebrew**: For installing dependencies

### Installation

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install SwiftLint and SwiftFormat
brew install swiftlint swiftformat

# Install Ruby dependencies
cd ios
bundle install

# Install Swift package dependencies
swift package resolve
```

### Running the App

#### Option 1: Xcode (Recommended for development)

1. Open the project in Xcode:
   ```bash
   cd ios
   open BookTrackerIOS.xcodeproj  # Once created
   ```

2. Select a simulator or device target from the scheme selector

3. Press `Cmd + R` to build and run

#### Option 2: Command Line

```bash
cd ios

# Build the app
xcodebuild -scheme BookTrackerIOS -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Or use Fastlane
bundle exec fastlane build_dev
```

## Project Structure

```
ios/
├── Packages/                    # Swift Package Modules
│   ├── CoreDomain/             # Pure business logic
│   │   ├── Sources/
│   │   │   └── CoreDomain/
│   │   │       ├── Entities/   # Book, User, Goal models
│   │   │       ├── ValueObjects/  # ReadingStatus, etc.
│   │   │       ├── Services/   # Domain services
│   │   │       ├── Protocols/  # Repository interfaces
│   │   │       └── Errors/     # Domain errors
│   │   └── Tests/
│   │
│   ├── Application/            # Use cases
│   │   ├── Sources/
│   │   │   └── Application/
│   │   │       ├── Protocols/  # UseCase protocol
│   │   │       ├── UseCases/
│   │   │       │   ├── Books/  # Book-related use cases
│   │   │       │   ├── Goals/  # Goal-related use cases
│   │   │       │   └── Auth/   # Auth use cases
│   │   │       └── DTOs/       # Data transfer objects
│   │   └── Tests/
│   │
│   └── InfrastructureIOS/      # iOS-specific implementations
│       ├── Sources/
│       │   └── InfrastructureIOS/
│       │       ├── Network/    # API client, endpoints
│       │       ├── Persistence/  # GRDB, migrations
│       │       ├── Security/   # Keychain manager
│       │       └── Repositories/  # Concrete implementations
│       └── Tests/
│
├── BookTrackerApp/             # SwiftUI Application (to be created)
│   ├── Features/
│   ├── ViewModels/
│   ├── Views/
│   └── Navigation/
│
├── fastlane/                   # CI/CD automation
│   ├── Fastfile               # Fastlane lanes
│   └── Appfile                # App configuration
│
├── .swiftlint.yml             # Linting rules
├── .swiftformat               # Formatting rules
└── Gemfile                    # Ruby dependencies
```

## Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

### Layer Responsibilities

1. **CoreDomain** (Innermost layer)
   - Pure Swift domain logic
   - No dependencies on frameworks or external packages
   - Contains entities, value objects, domain services
   - Defines repository protocols (interfaces)

2. **Application**
   - Contains use cases (business rules)
   - Orchestrates data flow between layers
   - Depends only on CoreDomain
   - Platform-agnostic

3. **InfrastructureIOS**
   - iOS-specific implementations
   - Network layer (URLSession)
   - Database (GRDB/SQLite)
   - Security (Keychain)
   - Concrete repository implementations

4. **BookTrackerApp** (Outermost layer)
   - SwiftUI views and view models
   - Navigation and routing
   - Dependency injection
   - UI-specific logic

### Dependency Rule

Dependencies point **inward**:
- App → Infrastructure → Application → CoreDomain
- CoreDomain has **zero** external dependencies

## Development

### Building Individual Packages

```bash
# Build a specific package
cd ios/Packages/CoreDomain
swift build

# Run tests for a package
swift test

# Or use Fastlane
cd ios
bundle exec fastlane test_package package:CoreDomain
```

### Code Quality

```bash
# Run SwiftLint
bundle exec fastlane lint

# Check formatting
bundle exec fastlane format_check

# Auto-format code
bundle exec fastlane format

# Run all CI checks
bundle exec fastlane ci
```

### Testing

```bash
# Run all tests
bundle exec fastlane test

# Run tests for specific package
bundle exec fastlane test_package package:CoreDomain

# Generate code coverage
xcodebuild test -scheme BookTrackerIOS -enableCodeCoverage YES
```

## Debugging

### Xcode Debugger

1. Set breakpoints by clicking the gutter in the editor
2. Run app with debugger attached (`Cmd + R`)
3. Use LLDB commands in the console:
   ```
   po variable         # Print object
   p variable          # Print value
   expr variable = x   # Modify value
   ```

### Logging

```swift
import os.log

let logger = Logger(subsystem: "com.booktracker.ios", category: "Books")
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error: \(error.localizedDescription)")
```

### Network Debugging

Use Charles Proxy or Proxyman to inspect network traffic:
1. Install Charles/Proxyman
2. Configure iOS Simulator to use proxy
3. Install SSL certificate for HTTPS inspection

## CI/CD

### GitHub Actions

The project includes a comprehensive CI workflow (`.github/workflows/ios-ci.yml`):

- **Lint**: SwiftLint and SwiftFormat checks
- **Test Packages**: Unit tests for each package
- **Build App**: Development build
- **Test App**: Integration and UI tests
- **Code Coverage**: Uploaded to Codecov

Workflow triggers:
- Push to `main`, `develop`, or `feature/ios-*` branches
- Pull requests to `main` or `develop`

### Fastlane Lanes

```bash
# Development
bundle exec fastlane lint           # Run linting
bundle exec fastlane test           # Run tests
bundle exec fastlane build_dev      # Build for development

# Release
bundle exec fastlane beta           # Upload to TestFlight
bundle exec fastlane release        # Deploy to App Store
```

## Troubleshooting

### Common Issues

**1. "No such module" errors**
```bash
# Clean and rebuild
swift package clean
swift package resolve
swift build
```

**2. SwiftLint/SwiftFormat not found**
```bash
brew install swiftlint swiftformat
```

**3. Ruby/Bundler issues**
```bash
# Install/update Ruby with rbenv
brew install rbenv
rbenv install 3.2.0
rbenv global 3.2.0

# Reinstall gems
bundle install
```

**4. Xcode simulator issues**
```bash
# Reset simulator
xcrun simctl erase all

# Restart CoreSimulator service
sudo killall -9 com.apple.CoreSimulator.CoreSimulatorService
```

**5. Package dependency resolution failures**
```bash
# Clear SPM cache
rm -rf ~/Library/Caches/org.swift.swiftpm
rm -rf ~/Library/Developer/Xcode/DerivedData

# Re-resolve
swift package resolve
```

### Build Performance

**Speed up builds:**
1. Use Swift Package Manager caching
2. Enable Xcode's new build system
3. Close unnecessary Xcode tabs/windows
4. Use `.xcode.env` to set build settings

**Monitor build times:**
```bash
xcodebuild -showBuildSettings -scheme BookTrackerIOS | grep COMPILER
```

## Backend Integration

### API Configuration

The app connects to the Next.js backend API. Configure the base URL:

```swift
// InfrastructureIOS/Network/APIClient.swift
struct APIConfiguration {
    static var baseURL: URL {
        #if DEBUG
        return URL(string: "http://localhost:3000/api")!
        #else
        return URL(string: "https://your-production-api.com/api")!
        #endif
    }
}
```

### Authentication

JWT tokens are stored securely in iOS Keychain:

```swift
// Retrieve token
let token = try KeychainManager.shared.get(key: "auth_token")

// Store token
try KeychainManager.shared.set(token, forKey: "auth_token")

// Delete token
try KeychainManager.shared.delete(key: "auth_token")
```

## Contributing

### Before committing:

1. Run formatting: `bundle exec fastlane format`
2. Run linting: `bundle exec fastlane lint`
3. Run tests: `bundle exec fastlane test`
4. Ensure CI passes: `bundle exec fastlane ci`

### Code Style

- Follow Swift API Design Guidelines
- Use meaningful variable names
- Keep functions small and focused
- Write unit tests for business logic
- Document complex logic with comments

## Resources

### Official Documentation
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Swift Language Guide](https://docs.swift.org/swift-book/)
- [GRDB Documentation](https://github.com/groue/GRDB.swift)

### Architecture
- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [iOS Clean Architecture Guide](https://clean-swift.com)

### Tools
- [Fastlane Documentation](https://docs.fastlane.tools)
- [SwiftLint Rules](https://realm.github.io/SwiftLint/rule-directory.html)
- [SwiftFormat Options](https://github.com/nicklockwood/SwiftFormat#options)

## Support

For issues or questions:
1. Check this README and mission documentation in `docs/tasks/ios-native-migration/`
2. Review Xcode console logs
3. Check GitHub Issues
4. Consult the team

## License

[Your License Here]
