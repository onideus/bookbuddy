# Task: Migrate Web Application to Native iOS

## Task Status

Current: Brainstormed

## Problem Statement

Migrate the existing Next.js web-based book tracking application to a native iOS application to provide a superior mobile experience with offline capabilities, native iOS features (widgets, notifications, Apple ecosystem integration), and improved performance.

## Codex (GPT-5) Architectural Recommendation

### Technology Choice: **SwiftUI** ✅

**Rationale:**
- Best alignment with Clean Architecture via modular Swift packages
- Native iOS-first UX and performance
- Direct access to Apple ecosystem (Keychain, Push Notifications, Widgets, App Clips)
- Combine/Observation for unidirectional data flow
- Future-proof with Apple's evolution

**Alternatives Considered:**
- ❌ React Native: TypeScript reuse but sacrifices native UX, bridge overhead, complicates Clean Architecture
- ❌ Flutter: Strong UI consistency but requires Dart rewrite, less direct Apple API access
- ❌ Capacitor: Quick but essentially web shell, weakest offline/performance story
- ❌ Kotlin Multiplatform: Best for cross-platform domain sharing, but overkill for iOS-only target

## Expected Outcome

A production-ready native iOS application where:

1. **Architecture Preserved**
   - Clean Architecture maintained with Swift modules
   - Domain layer ported to Swift structs/enums
   - Use cases translated to Swift protocols
   - Repository pattern preserved for infrastructure

2. **Feature Parity**
   - All web features available natively
   - Enhanced with iOS-specific capabilities
   - Offline-first functionality
   - Real-time sync with backend

3. **Backend Strategy**
   - Keep Next.js as API server
   - Add mobile-optimized endpoints (GraphQL or tRPC)
   - Delta-sync for offline support
   - Real-time updates via WebSockets/SSE

4. **Data & Authentication**
   - Secure JWT storage in iOS Keychain
   - Local SQLite database with GRDB
   - Optimistic UI with sync queue
   - Conflict resolution strategy

## Task Type

Mobile (iOS) + Backend (API Enhancement)

## Technical Context

### Architecture Decision

**Recommended Stack:**
- **Frontend**: SwiftUI + Swift Concurrency (async/await)
- **Architecture**: Clean Architecture with Swift packages
- **State Management**: MVVM or The Composable Architecture (TCA)
- **Networking**: URLSession with async sequences
- **Local Database**: SQLite via GRDB
- **Backend**: Next.js with mobile-optimized API layer

### Module Structure

```
BookTrackerIOS/
├── CoreDomain/              # Swift Package - Pure domain logic
│   ├── Entities/
│   │   ├── Book.swift
│   │   ├── User.swift
│   │   └── Goal.swift
│   ├── ValueObjects/
│   │   ├── ReadingStatus.swift
│   │   └── GoalProgress.swift
│   └── Services/
│       ├── BookService.swift
│       └── GoalService.swift
│
├── Application/             # Swift Package - Use cases
│   ├── Protocols/
│   │   └── UseCase.swift
│   ├── Books/
│   │   ├── AddBookUseCase.swift
│   │   ├── UpdateBookUseCase.swift
│   │   └── GetUserBooksUseCase.swift
│   └── Goals/
│       ├── CreateGoalUseCase.swift
│       └── SyncGoalProgressUseCase.swift
│
├── InfrastructureIOS/       # Platform-specific implementations
│   ├── Repositories/
│   │   ├── APIBookRepository.swift
│   │   ├── LocalBookRepository.swift
│   │   └── SyncCoordinator.swift
│   ├── Network/
│   │   ├── APIClient.swift
│   │   ├── AuthInterceptor.swift
│   │   └── Endpoints.swift
│   ├── Persistence/
│   │   ├── Database.swift (GRDB)
│   │   └── Migrations/
│   └── Security/
│       └── KeychainManager.swift
│
└── BookTrackerApp/          # SwiftUI App
    ├── Features/
    │   ├── Books/
    │   ├── Goals/
    │   └── Dashboard/
    ├── ViewModels/
    ├── Views/
    └── Navigation/
```

### Backend Enhancements

**New Next.js API Endpoints:**
```typescript
// Mobile-optimized endpoints
/api/mobile/sync          // Delta sync endpoint
/api/mobile/batch         // Batch operations
/api/mobile/conflicts     // Conflict resolution

// GraphQL/tRPC Gateway (choose one)
/api/graphql             // GraphQL for flexible queries
/api/trpc                // tRPC for type-safe mobile API

// Real-time
/api/ws                  // WebSocket for live updates
/api/sse                 // Server-Sent Events alternative
```

### Data Synchronization Strategy

**Offline-First Pattern:**
1. Write operations go to local SQLite immediately (optimistic UI)
2. Queue sync operations with background task
3. Delta sync: send `lastSyncedAt` timestamp to get changes
4. Server responds with changes + conflict metadata
5. Apply merge strategy (CRDT-like or last-writer-wins per field)
6. Update local cache and UI

**Conflict Resolution:**
```swift
struct SyncMetadata {
    let version: Int
    let updatedAt: Date
    let updatedBy: String
}

enum MergeStrategy {
    case lastWriterWins
    case maxValue        // For currentPage
    case serverAuthority
    case manualReview
}
```

## Missions

**Phase 1: Foundation** (Weeks 1-4)
- [x] Mission 1.1: Setup - Create Xcode project, Swift packages structure, CI/CD
- [ ] Mission 1.2: Domain Layer - Port TypeScript entities/value objects to Swift
- [ ] Mission 1.3: Application Layer - Translate use cases to Swift protocols
- [ ] Mission 1.4: Backend API - Create mobile-optimized REST endpoints
- [ ] Mission 1.5: Authentication - Implement JWT flow with Keychain storage

**Phase 2: Core Features** (Weeks 5-10)
- [ ] Mission 2.1: Repository Layer - Build API client with offline queue
- [ ] Mission 2.2: Local Database - Setup GRDB with migrations
- [ ] Mission 2.3: Sync Engine - Implement delta sync coordinator
- [ ] Mission 2.4: Books Feature - Build SwiftUI screens for book management
- [ ] Mission 2.5: Goals Feature - Implement goal tracking with sync

**Phase 3: Polish & Launch** (Weeks 11-16)
- [ ] Mission 3.1: Dashboard - Create statistics and overview screens
- [ ] Mission 3.2: Widgets - Add home screen and lock screen widgets
- [ ] Mission 3.3: Notifications - Implement reading reminders
- [ ] Mission 3.4: Testing - Comprehensive unit, integration, and UI tests
- [ ] Mission 3.5: App Store - Prepare metadata, screenshots, submit for review

## Code Guidance

### Swift Domain Example

```swift
// CoreDomain/Entities/Book.swift
public struct Book: Identifiable, Codable, Equatable {
    public let id: String
    public let userId: String
    public let googleBooksId: String
    public let title: String
    public let authors: [String]
    public let thumbnail: String?
    public let description: String?
    public let pageCount: Int?
    public let status: ReadingStatus
    public let currentPage: Int?
    public let rating: Int?
    public let addedAt: Date
    public let finishedAt: Date?

    public init(/* parameters */) { /* ... */ }
}

// CoreDomain/ValueObjects/ReadingStatus.swift
public enum ReadingStatus: String, Codable {
    case wantToRead = "want-to-read"
    case reading = "reading"
    case read = "read"
}
```

### Use Case Pattern

```swift
// Application/Protocols/UseCase.swift
public protocol UseCase {
    associatedtype Input
    associatedtype Output

    func execute(_ input: Input) async throws -> Output
}

// Application/Books/AddBookUseCase.swift
public final class AddBookUseCase: UseCase {
    private let repository: BookRepositoryProtocol

    public struct Input {
        let userId: String
        let googleBooksId: String
        let status: ReadingStatus
        // ... other fields
    }

    public func execute(_ input: Input) async throws -> Book {
        // Validation
        // Business logic
        return try await repository.create(book)
    }
}
```

### Repository Protocol

```swift
// CoreDomain/Protocols/BookRepositoryProtocol.swift
public protocol BookRepositoryProtocol {
    func create(_ book: Book) async throws -> Book
    func findByUserId(_ userId: String) async throws -> [Book]
    func findById(_ id: String) async throws -> Book?
    func update(_ id: String, updates: BookUpdate) async throws -> Book?
    func delete(_ id: String) async throws -> Bool
}

// InfrastructureIOS/Repositories/APIBookRepository.swift
public final class APIBookRepository: BookRepositoryProtocol {
    private let apiClient: APIClient
    private let localRepository: LocalBookRepository
    private let syncQueue: SyncQueue

    public func create(_ book: Book) async throws -> Book {
        // Save locally first (optimistic)
        try await localRepository.create(book)

        // Queue for sync
        try await syncQueue.enqueue(.create(book))

        // Trigger immediate sync if online
        try await sync()

        return book
    }
}
```

### SwiftUI View Example

```swift
// BookTrackerApp/Features/Books/BookListView.swift
struct BookListView: View {
    @StateObject private var viewModel: BookListViewModel

    var body: some View {
        List(viewModel.books) { book in
            BookRow(book: book)
                .onTapGesture {
                    viewModel.selectBook(book)
                }
        }
        .navigationTitle("My Books")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add Book") {
                    viewModel.showAddBook()
                }
            }
        }
        .task {
            await viewModel.loadBooks()
        }
        .refreshable {
            await viewModel.refresh()
        }
    }
}
```

## Testing Strategy

### Swift Testing
```swift
// Tests/DomainTests/BookServiceTests.swift
@Test func bookServiceCalculatesProgress() async throws {
    // Given
    let book = Book(pageCount: 300, currentPage: 150, /* ... */)

    // When
    let progress = book.readingProgress

    // Then
    #expect(progress == 0.5)
}

// Tests/ApplicationTests/AddBookUseCaseTests.swift
@Test func addBookUseCaseValidatesInput() async throws {
    // Given
    let mockRepo = MockBookRepository()
    let useCase = AddBookUseCase(repository: mockRepo)

    // When & Then
    await #expect(throws: ValidationError.self) {
        try await useCase.execute(invalidInput)
    }
}
```

### Contract Tests
```typescript
// Ensure Swift and TypeScript domain logic stay in sync
describe('Domain Contracts', () => {
  it('Book entity has consistent validation', () => {
    // Test against shared JSON fixtures
  });
});
```

## Migration Checklist

**Pre-Development:**
- [ ] Architecture Decision Record (ADR) created
- [ ] Stakeholder sign-off on SwiftUI approach
- [ ] Development environment setup (Xcode 15+, Swift 5.9+)
- [ ] CI/CD pipeline configured (GitHub Actions + Fastlane)

**Development:**
- [ ] Swift packages created with proper module boundaries
- [ ] Domain layer ported and tested
- [ ] Use cases translated and validated
- [ ] Backend API endpoints created
- [ ] Authentication flow working
- [ ] Local database with migrations
- [ ] Sync engine implemented
- [ ] All screens built in SwiftUI
- [ ] Offline mode working
- [ ] Widgets and notifications implemented

**Quality Assurance:**
- [ ] Unit test coverage >80%
- [ ] Integration tests for sync
- [ ] UI tests for critical paths
- [ ] Performance testing (startup, sync, memory)
- [ ] Offline scenario testing
- [ ] Conflict resolution validation
- [ ] Security audit (Keychain, network, data)

**Release:**
- [ ] App Store Connect setup
- [ ] TestFlight beta testing
- [ ] App Store Review Guidelines compliance
- [ ] Privacy policy updated
- [ ] Marketing materials prepared
- [ ] Phased rollout plan

## Technical References

**SwiftUI & iOS:**
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)
- [GRDB.swift](https://github.com/groue/GRDB.swift)
- [The Composable Architecture](https://github.com/pointfreeco/swift-composable-architecture)

**Backend Integration:**
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [GraphQL with Apollo iOS](https://www.apollographql.com/docs/ios/)
- [WebSocket in Next.js](https://nextjs.org/docs/pages/building-your-application/routing/api-routes#websockets)

**Best Practices:**
- [iOS Clean Architecture](https://clean-swift.com)
- [Swift Style Guide](https://google.github.io/swift/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Risk Assessment

**High Risk:**
- Domain logic translation from TypeScript to Swift (mitigation: comprehensive contract tests)
- Sync conflict resolution complexity (mitigation: start with simple last-writer-wins, iterate)
- Offline-first data integrity (mitigation: extensive offline scenario testing)

**Medium Risk:**
- SwiftUI learning curve (mitigation: start with simple screens, leverage community resources)
- App Store review process (mitigation: follow guidelines closely, prepare for rejection)
- Performance with large datasets (mitigation: pagination, lazy loading, database indexes)

**Low Risk:**
- Authentication migration (standard JWT pattern, well-documented)
- Backend API creation (extend existing architecture)
- CI/CD setup (mature tooling with Fastlane)

## Success Criteria

- [ ] Native iOS app running on iOS 16+
- [ ] All web features available natively
- [ ] Offline mode working with sync
- [ ] <2s cold start time
- [ ] <100ms UI response time
- [ ] Successfully syncs 1000+ books
- [ ] App Store approved and published
- [ ] 4.5+ star rating in first 100 reviews
- [ ] Clean Architecture principles maintained

## Notes

- **Created:** 2025-11-01
- **Codex Consultation:** GPT-5 recommendation for SwiftUI + native stack
- **Status Flow:** Brainstormed → Validated → In dev → Testing → Completed
- **Estimated Timeline:** 16 weeks (4 months)
- **Complexity:** High (new platform, new language, sync complexity)
- **Strategic Value:** Enables offline usage, Apple ecosystem features, superior mobile UX
