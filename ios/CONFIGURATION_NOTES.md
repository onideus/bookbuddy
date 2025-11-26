# iOS Configuration Recommendations

## Current State (Updated for Vercel Serverless)

The backend has been migrated from Fastify to **Vercel Serverless Functions**. The iOS app now supports multiple deployment configurations.

### NetworkClient Configuration

**File:** `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Network/NetworkClient.swift`

**Available Factory Methods:**

```swift
@available(iOS 15.0, macOS 12.0, *)
public extension NetworkClient {
    /// Production (Vercel deployment)
    static func production() -> NetworkClient {
        let baseURL = URL(string: "https://your-app-name.vercel.app")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Development with Vercel dev server (port 3000)
    static func development() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:3000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Legacy Fastify development (port 4000)
    static func legacyDevelopment() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:4000")!
        return NetworkClient(baseURL: baseURL)
    }

    /// Custom base URL
    static func custom(baseURL: String) -> NetworkClient
}
```

### URL Routing Notes

**Important:** The Vercel deployment uses URL rewrites configured in `vercel.json`:
- iOS app uses routes like `/books`, `/auth/login`, etc.
- Vercel automatically rewrites these to `/api/books`, `/api/auth/login`, etc.
- **No changes needed to iOS APIEndpoint paths!**

### InfrastructureConfiguration (Legacy)

**File:** `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/InfrastructureIOS.swift`

This configuration struct still exists but the NetworkClient factory methods are now preferred.

## Deployment Setup

### Step 1: Deploy to Vercel

```bash
# From project root
cd /path/to/bookbuddy-mk3

# Login to Vercel
vercel login

# Deploy (first time will prompt for project setup)
vercel

# Note the deployment URL (e.g., bookbuddy-abc123.vercel.app)
```

### Step 2: Update Production URL in iOS

Edit `NetworkClient.swift` and update the production URL:

```swift
static func production() -> NetworkClient {
    let baseURL = URL(string: "https://bookbuddy-abc123.vercel.app")!
    return NetworkClient(baseURL: baseURL)
}
```

### Step 3: Test Configuration

**Development (Vercel dev server):**
```swift
let client = NetworkClient.development()  // Uses http://127.0.0.1:3000
```

**Production (Vercel deployment):**
```swift
let client = NetworkClient.production()   // Uses your Vercel URL
```

**Legacy (old Fastify server):**
```swift
let client = NetworkClient.legacyDevelopment()  // Uses http://127.0.0.1:4000
```

## Development Workflow

### Running Locally with Vercel Dev

1. Start the Vercel dev server:
   ```bash
   vercel dev
   ```

2. In iOS, use `NetworkClient.development()` which connects to port 3000

3. The dev server simulates the serverless environment locally

### Running with Legacy Fastify Server

If you need to use the old Fastify server during migration:

1. Start Fastify:
   ```bash
   npm run dev:api
   ```

2. In iOS, use `NetworkClient.legacyDevelopment()` which connects to port 4000

## Environment-Based Configuration (Future Improvement)

For more flexible configuration, consider using xcconfig files:

### Debug.xcconfig
```
API_BASE_URL = http:/$()/127.0.0.1:3000
```

### Release.xcconfig
```
API_BASE_URL = https:/$()/your-app.vercel.app
```

Then read from Info.plist in the app:
```swift
static var fromEnvironment: NetworkClient {
    guard let urlString = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
          let url = URL(string: urlString) else {
        fatalError("APIBaseURL not configured")
    }
    return NetworkClient(baseURL: url)
}
```

## Vercel URL Rewrites

The `vercel.json` configuration includes rewrites that allow the iOS app to continue using its existing API paths:

| iOS App Calls | Vercel Rewrites To |
|--------------|-------------------|
| `/auth/login` | `/api/auth/login` |
| `/books` | `/api/books` |
| `/books/:id` | `/api/books/:id` |
| `/goals` | `/api/goals` |
| `/streaks` | `/api/streaks` |
| `/search` | `/api/search` |
| `/export/books` | `/api/export/books` |

**This means NO changes are needed to the iOS `APIEndpoint` enum!**

## Troubleshooting

### Connection Refused (Port 3000)
- Make sure `vercel dev` is running
- Check that no other process is using port 3000

### Connection Refused (Port 4000)
- You're using `legacyDevelopment()` but Fastify isn't running
- Either start Fastify with `npm run dev:api` or switch to `development()` with `vercel dev`

### 401 Unauthorized
- Check that your access token is valid
- Tokens expire after 15 minutes by default
- Use refresh token to get a new access token

### CORS Errors
- Should not happen with Vercel (handles CORS automatically)
- If testing in browser, check CORS configuration

## Notes

- The production URL will be assigned after first Vercel deployment
- Vercel provides free SSL certificates automatically
- The free tier (Hobby) supports 100GB bandwidth and 100K function invocations/month