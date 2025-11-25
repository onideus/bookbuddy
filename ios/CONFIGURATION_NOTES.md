# iOS Configuration Recommendations

## Current State

The iOS infrastructure currently has hardcoded API base URLs in two locations:

### 1. InfrastructureConfiguration (InfrastructureIOS.swift)

**File:** `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/InfrastructureIOS.swift`

**Current Implementation:**
```swift
public struct InfrastructureConfiguration {
    public let baseURL: URL
    public let enableLogging: Bool

    /// Development configuration (localhost)
    public static var development: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "http://localhost:4000")!,
            enableLogging: true
        )
    }

    /// Production configuration
    public static var production: InfrastructureConfiguration {
        InfrastructureConfiguration(
            baseURL: URL(string: "https://api.bookbuddy.app")!,
            enableLogging: false
        )
    }
}
```

### 2. NetworkClient Extension (NetworkClient.swift)

**File:** `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Network/NetworkClient.swift`

**Current Implementation:**
```swift
@available(iOS 15.0, macOS 12.0, *)
public extension NetworkClient {
    /// Create a NetworkClient with the default production configuration
    static func production() -> NetworkClient {
        // Note: Replace with actual production URL when deploying
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Create a NetworkClient for development/testing
    static func development() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }
}
```

## Recommendations

### Option 1: Environment-Based Configuration (Recommended)

Use Xcode build configurations and `Info.plist` to externalize the API base URL:

**1. Add to Info.plist:**
```xml
<key>APIBaseURL</key>
<string>$(API_BASE_URL)</string>
```

**2. Set in Build Settings:**
- Debug: `API_BASE_URL = http://localhost:4000`
- Staging: `API_BASE_URL = https://staging-api.bookbuddy.app`
- Release: `API_BASE_URL = https://api.bookbuddy.app`

**3. Update InfrastructureConfiguration:**
```swift
public struct InfrastructureConfiguration {
    public let baseURL: URL
    public let enableLogging: Bool

    public static var fromEnvironment: InfrastructureConfiguration {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
              let url = URL(string: urlString) else {
            fatalError("APIBaseURL not configured in Info.plist")
        }
        
        #if DEBUG
        let enableLogging = true
        #else
        let enableLogging = false
        #endif
        
        return InfrastructureConfiguration(
            baseURL: url,
            enableLogging: enableLogging
        )
    }
}
```

### Option 2: UserDefaults Override (For Testing)

Allow developers to override the API URL for testing purposes:

```swift
public static var fromEnvironment: InfrastructureConfiguration {
    // Check for developer override first
    if let overrideURL = UserDefaults.standard.string(forKey: "dev_api_base_url"),
       let url = URL(string: overrideURL) {
        return InfrastructureConfiguration(
            baseURL: url,
            enableLogging: true
        )
    }
    
    // Fall back to Info.plist configuration
    guard let urlString = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
          let url = URL(string: urlString) else {
        fatalError("APIBaseURL not configured")
    }
    
    return InfrastructureConfiguration(
        baseURL: url,
        enableLogging: ProcessInfo.processInfo.environment["DEBUG"] != nil
    )
}
```

### Option 3: xcconfig Files (Most Flexible)

Create configuration files for each environment:

**Debug.xcconfig:**
```
API_BASE_URL = http:/$()/localhost:4000
```

**Staging.xcconfig:**
```
API_BASE_URL = https:/$()/staging-api.bookbuddy.app
```

**Release.xcconfig:**
```
API_BASE_URL = https:/$()/api.bookbuddy.app
```

## Action Items

1. **Immediate:** Remove duplicate configuration in `NetworkClient.swift` (lines 172-183)
   - The factory methods duplicate the functionality in `InfrastructureConfiguration`
   - Use `InfrastructureConfiguration.development` and `.production` instead

2. **Short-term:** Implement environment-based configuration using Option 1
   - Add `APIBaseURL` to Info.plist
   - Update build settings for Debug/Release schemes
   - Modify `InfrastructureConfiguration` to read from Info.plist

3. **Long-term:** Consider Option 3 for multiple deployment environments
   - Useful when you have Dev, Staging, and Production backends
   - Easier to manage across teams

## Notes

- The production URL `https://api.bookbuddy.app` is a placeholder and should be updated when the production server is deployed
- The iOS app currently uses `localhost:4000` which matches the backend API's default port
- Consider using `127.0.0.1` vs `localhost` depending on network configuration needs