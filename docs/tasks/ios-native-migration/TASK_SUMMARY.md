# iOS Native Migration - Task Summary

## Overview

**Goal:** Migrate the Next.js web-based book tracking application to a native iOS app using SwiftUI.

**Status:** Brainstormed ✅ (Architecture defined with Codex GPT-5)

**Timeline:** 16 weeks (4 months)

**Complexity:** High

## Codex (GPT-5) Decision: SwiftUI + Native Stack

After comprehensive analysis of alternatives (React Native, Flutter, Capacitor, Kotlin Multiplatform), **SwiftUI is the recommended choice** because:

✅ Best alignment with Clean Architecture via modular Swift packages
✅ Native iOS-first UX and performance
✅ Direct access to Apple ecosystem (Keychain, Widgets, Notifications)
✅ Future-proof with Apple's evolution
✅ Combine/Observation for unidirectional data flow

## Architecture Strategy

### Clean Architecture in Swift

```
CoreDomain (Swift Package)
  ├── Pure business logic
  ├── Entities as structs
  └── Protocol-based repositories

Application (Swift Package)
  ├── UseCase protocols
  ├── Business workflows
  └── Platform-agnostic

InfrastructureIOS
  ├── API Repository
  ├── Local Repository (GRDB)
  ├── Sync Coordinator
  └── Keychain Manager

BookTrackerApp (SwiftUI)
  ├── MVVM ViewModels
  ├── SwiftUI Views
  └── Navigation
```

### Backend Strategy

**Keep Next.js as API Server** ✅
- Add mobile-optimized endpoints (GraphQL or tRPC gateway)
- Delta-sync for offline support
- Real-time via WebSockets/SSE
- Conflict resolution metadata

## Three-Phase Roadmap

### Phase 1: Foundation (Weeks 1-4)
1. Setup Xcode project + Swift packages
2. Port domain layer (TypeScript → Swift)
3. Translate use cases
4. Build mobile API endpoints
5. Implement JWT authentication with Keychain

### Phase 2: Core Features (Weeks 5-10)
1. Build repository layer with offline queue
2. Setup SQLite database with GRDB
3. Implement sync engine
4. Create SwiftUI screens for books
5. Build goals feature with sync

### Phase 3: Polish & Launch (Weeks 11-16)
1. Dashboard with statistics
2. Widgets (home screen + lock screen)
3. Push notifications
4. Comprehensive testing
5. App Store submission

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **UI Framework** | SwiftUI | Native iOS UX, performance, ecosystem access |
| **Architecture** | Clean Architecture | Maintains current pattern, testable, portable |
| **State Management** | MVVM or TCA | SwiftUI-native, unidirectional data flow |
| **Networking** | URLSession + async/await | Native, no dependencies |
| **Local Database** | SQLite via GRDB | Predictable migrations, Clean Architecture fit |
| **Backend** | Keep Next.js | Avoid duplication, extend with mobile endpoints |
| **API Layer** | GraphQL or tRPC | Flexible queries, type-safe, avoid over-fetching |
| **Sync Strategy** | Delta sync + optimistic UI | Offline-first, conflict resolution |
| **Auth Storage** | iOS Keychain | Secure, native, proper token management |

## Business Logic Preservation

### Migration Strategy
1. **Extract domain spec** - Create language-agnostic contracts (JSON Schema)
2. **Port with tests** - Translate business rules to Swift with shared test cases
3. **Maintain parity** - Keep TypeScript version for web, ensure consistency
4. **Contract tests** - Validate both implementations against common fixtures

### Example: Book Entity

**TypeScript (Current):**
```typescript
export interface Book {
  id: string;
  userId: string;
  title: string;
  status: 'want-to-read' | 'reading' | 'read';
  currentPage?: number;
  finishedAt?: Date;
}
```

**Swift (Target):**
```swift
public struct Book: Identifiable, Codable {
    public let id: String
    public let userId: String
    public let title: String
    public let status: ReadingStatus
    public let currentPage: Int?
    public let finishedAt: Date?
}

public enum ReadingStatus: String, Codable {
    case wantToRead = "want-to-read"
    case reading = "reading"
    case read = "read"
}
```

## Offline-First Architecture

### Sync Pattern
1. **Write Operations:**
   - Save to local SQLite immediately (optimistic UI)
   - Queue for background sync
   - Retry with exponential backoff

2. **Sync Process:**
   - Client sends `lastSyncedAt` timestamp
   - Server returns delta changes + conflict metadata
   - Client applies merge strategy
   - Update local cache

3. **Conflict Resolution:**
   - **currentPage**: Take max value (CRDT-like)
   - **notes/description**: Last-writer-wins or manual review
   - **Server metadata**: version, updatedAt, updatedBy

### Background Tasks
```swift
import BackgroundTasks

func scheduleBackgroundSync() {
    let request = BGAppRefreshTaskRequest(identifier: "com.booktracker.sync")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 min
    try? BGTaskScheduler.shared.submit(request)
}
```

## Risk Mitigation

### High Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Domain logic translation errors | Bugs in business rules | Comprehensive contract tests, shared test fixtures |
| Sync conflict complexity | Data corruption | Start simple (last-writer-wins), iterate to CRDT |
| Offline data integrity | User data loss | Extensive offline testing, sync queue persistence |

### Medium Risk Items
- **SwiftUI learning curve** → Start simple, leverage community, pair programming
- **App Store review** → Follow guidelines, prepare for rejection, iterate quickly
- **Performance with large datasets** → Pagination, lazy loading, database indexes

## Success Metrics

- ✅ Native iOS app on App Store
- ✅ Feature parity with web version
- ✅ <2s cold start time
- ✅ <100ms UI response time
- ✅ Handles 1000+ books smoothly
- ✅ Offline mode working
- ✅ 4.5+ star App Store rating

## Next Steps

1. **Architecture Decision Record** - Document SwiftUI choice with stakeholder buy-in
2. **Swift Proof of Concept** - Port core domain models, validate approach
3. **Backend API Design** - Define mobile endpoints, sync protocol
4. **Project Setup** - Xcode project, Swift packages, CI/CD pipeline
5. **Begin Phase 1** - Start Mission 1.1 (Setup)

## Resources

- **Full Task Details:** `progress-tracker.md`
- **Codex Consultation:** GPT-5 architectural analysis
- **SwiftUI Docs:** https://developer.apple.com/documentation/swiftui
- **GRDB:** https://github.com/groue/GRDB.swift
- **TCA:** https://github.com/pointfreeco/swift-composable-architecture

---

**Created:** 2025-11-01
**Last Updated:** 2025-11-01
**Codex Consultation:** Completed
**Ready for:** Stakeholder review and approval
