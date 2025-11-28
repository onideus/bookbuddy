# BookTracker - Outstanding Features Analysis

> **Generated**: 2025-11-27  
> **Purpose**: Comprehensive analysis of remaining features from previous reviews and implementation lists  
> **Status**: Active Development

---

## Executive Summary

This document identifies **all outstanding features** across four key areas:
1. **Backend Improvements** - Database optimizations and technical enhancements
2. **iOS-Backend Feature Parity** - Backend APIs implemented but missing iOS UI
3. **Technical Debt** - Architecture improvements from Codex reviews
4. **New User Features** - Recommendations from RECOMMENDATIONS.md

**Key Findings:**
- ✅ **Backend**: Most critical features implemented (streaks, genres, export, pagination)
- ⚠️ **iOS**: Significant UI gaps - backend features exist but no iOS implementation
- 🔧 **Technical Debt**: 4 high-priority Swift architecture improvements pending
- 🚀 **User Features**: 15+ feature ideas documented but not implemented

---

## Table of Contents

1. [Backend Outstanding Items](#1-backend-outstanding-items)
2. [iOS-Backend Feature Parity Gaps](#2-ios-backend-feature-parity-gaps)
3. [Technical Debt & Architecture Improvements](#3-technical-debt--architecture-improvements)
4. [New User Features (RECOMMENDATIONS.md)](#4-new-user-features-recommendationsmd)
5. [iOS UI Implementation Plan](#5-ios-ui-implementation-plan)
6. [Recommended Execution Priority](#6-recommended-execution-priority)

---

## 1. Backend Outstanding Items

### 1.1 From RECOMMENDATIONS.md - Pending Items

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| Database Index Optimization | Medium | ⏳ Pending | Add indexes for `books.userId`, `goals.userId`, `refreshTokens.token` |
| API Pagination Edge Cases | Medium | ⏳ Pending | Test empty results, last page, cursor validation |
| Test Coverage Gaps | Low | ⏳ Pending | API route integration tests, auth flow E2E tests |

### 1.2 From claude_recommendations.md - High Priority Issues

| Issue | Recommendation | Status | File Location |
|-------|----------------|--------|---------------|
| Reading Auto-Completion Bug | Fix `BookService.updateReadingProgress()` to evaluate pending page | ⏳ Pending | `domain/services/book-service.ts:27-33` |
| Goal Completion Sync Bug | Set `updates.completed = progress.isCompleted()` in both sync methods | ⏳ Pending | `domain/services/goal-service.ts:36-44, 102-108` |

**Impact**: These are **data integrity bugs** that affect core business logic.

### 1.3 Migration to Persistent Storage

**Current State**: Using Prisma with PostgreSQL (✅ Complete)

**Outstanding**: Memory repository cleanup
- Remove or deprecate `infrastructure/persistence/memory/` if no longer used
- Ensure DI container uses Prisma repositories by default

---

## 2. iOS-Backend Feature Parity Gaps

### 2.1 Critical Gap: Reading Streaks

**Backend Status**: ✅ **FULLY IMPLEMENTED**
- API Endpoints: `GET /streaks`, `POST /streaks/activity`, `GET /streaks/history`
- Database: `ReadingActivity` model with migrations
- Domain: `ReadingStreak` value object with streak calculations
- Use Cases: `GetUserStreakUseCase`, `RecordReadingActivityUseCase`

**iOS Status**: ❌ **PARTIALLY IMPLEMENTED**
- ✅ Entities: `ReadingActivity.swift` exists
- ✅ Models: `StreakModels.swift` exists  
- ✅ Components: `StreakBadge.swift` created
- ✅ ViewModels: `StreakViewModel.swift` exists
- ✅ Views: `DashboardView.swift`, `LogActivityView.swift` exist
- ❌ **Missing**: Repository integration (no `StreakRepository.swift` in `InfrastructureIOS`)
- ❌ **Missing**: Use cases not wired to API
- ❌ **Missing**: Dashboard tab not added to `MainTabView`
- ❌ **Missing**: Activity logging not functional

**Files to Create/Update**:
```
ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/
  └── Repositories/StreakRepository.swift           # NEW - API integration

ios/Packages/Application/Sources/Application/
  └── UseCases/Streaks/                             # NEW
      ├── GetUserStreakUseCase.swift
      └── RecordActivityUseCase.swift

ios/BookTrackerApp/Core/
  └── MainTabView.swift                             # UPDATE - Add Dashboard tab
```

---

### 2.2 Critical Gap: Book Genres/Tags

**Backend Status**: ✅ **FULLY IMPLEMENTED**
- Database: `books.genres` field (array)
- API: `GET /books/genres`, filter by genre, CRUD with genres
- Use Cases: Integrated into `AddBookUseCase`, `UpdateBookUseCase`

**iOS Status**: ⚠️ **PARTIALLY IMPLEMENTED**
- ✅ Domain: `Book` entity has `genres: [String]` field
- ✅ Components: `GenreChips.swift` exists
- ❌ **Missing**: Genre UI not integrated into BookCard
- ❌ **Missing**: Genre filter not in BooksListView
- ❌ **Missing**: Genre editing not in AddBookView/BookDetailView
- ❌ **Missing**: Genre picker component

**Files to Update**:
```
ios/BookTrackerApp/Features/Books/
  ├── Components/BookCard.swift                     # UPDATE - Display genres
  ├── Views/BooksListView.swift                     # UPDATE - Add genre filter
  ├── Views/AddBookView.swift                       # UPDATE - Genre selection
  └── Views/BookDetailView.swift                    # UPDATE - Genre editing
```

---

### 2.3 Critical Gap: Data Export

**Backend Status**: ✅ **FULLY IMPLEMENTED**
- API: `GET /export/books?format=json|csv`
- API: `GET /export/goals?format=json|csv`
- API: `GET /export/all` (JSON only)

**iOS Status**: ❌ **NOT IMPLEMENTED**
- No Settings screen export option
- No share sheet integration
- No format picker

**Files to Create**:
```
ios/BookTrackerApp/Features/Settings/              # NEW
  ├── Views/SettingsView.swift                     # UPDATE - Add export option
  └── Views/ExportDataView.swift                   # NEW - Export flow
```

---

### 2.4 Medium Priority: API Pagination

**Backend Status**: ✅ **FULLY IMPLEMENTED**
- Cursor-based pagination on `/books` and `/goals`
- Returns `nextCursor`, `hasMore`, `totalCount`

**iOS Status**: ⚠️ **PARTIAL (needs enhancement)**
- Books/Goals list views exist
- ❌ **Missing**: Infinite scroll implementation
- ❌ **Missing**: "Load More" button
- ❌ **Missing**: Pagination state management in ViewModels

**Files to Update**:
```
ios/BookTrackerApp/Features/
  ├── Books/ViewModels/BooksListViewModel.swift    # UPDATE - Add pagination
  └── Goals/ViewModels/GoalsViewModel.swift        # UPDATE - Add pagination
```

---

## 3. Technical Debt & Architecture Improvements

### 3.1 From AB Method Tasks (Codex Recommendations)

These are **high-quality architecture improvements** identified by GPT-5 (Codex) review:

#### Task 1: Swift Concurrency & Type Safety
**Status**: ⏳ Brainstormed  
**Location**: `docs/tasks/swift-concurrency-type-safety/`

**Scope**:
- Add `Sendable` conformance to all Input structs and domain entities
- Add `Equatable` conformance to Input structs for testability
- Add comprehensive documentation comments to all use cases

**Impact**: Thread safety, better developer experience, improved code discoverability

**Files Affected**: All use cases, all Input structs in `Application` package

---

#### Task 2: Repository Performance Optimizations
**Status**: ⏳ Brainstormed  
**Location**: `docs/tasks/repository-performance-optimizations/`

**Scope**:
- Add `exists()` methods to BookRepositoryProtocol and GoalRepositoryProtocol
- Optimize duplicate checking in AddBookUseCase (use `first(where:)` or `exists()`)
- Add pagination support to repository protocols

**Impact**: Better performance for large datasets, reduced memory usage

**Files Affected**:
```
ios/Packages/CoreDomain/Sources/CoreDomain/Protocols/
  ├── BookRepositoryProtocol.swift                 # UPDATE
  └── GoalRepositoryProtocol.swift                 # UPDATE

ios/Packages/Application/Sources/Application/UseCases/Books/
  └── AddBookUseCase.swift                         # UPDATE
```

---

#### Task 3: Domain Error Refinement
**Status**: ⏳ Brainstormed  
**Location**: `docs/tasks/domain-error-architecture-improvements/`

**Scope**:
- Refine DomainError with granular cases (ownershipMismatch, conflict, infrastructure)
- Extract shared ownership validation into domain service
- Document nil/undefined/null semantic mapping (TypeScript ↔ Swift)

**Impact**: Better error handling, reduced code duplication, TypeScript/Swift parity

**Files Affected**:
```
ios/Packages/CoreDomain/Sources/CoreDomain/
  └── Errors/DomainError.swift                     # UPDATE
```

---

#### Task 4: Comprehensive Testing Suite
**Status**: ⏳ Brainstormed  
**Location**: `docs/tasks/typescript-swift-testing-suite/`

**Scope**:
- Regression tests for domain entity creation (Book, Goal, User) - verify TypeScript defaults
- Unit tests for all use case error paths (100% coverage goal)
- Integration tests for critical workflows (add/update book, create/update goal, register user)

**Impact**: Confidence in business logic fidelity, catch regressions early

**Files to Create**:
```
ios/Packages/CoreDomain/Tests/CoreDomainTests/Entities/
  ├── BookTests.swift                              # NEW
  ├── GoalTests.swift                              # NEW
  └── UserTests.swift                              # NEW

ios/Packages/Application/Tests/ApplicationTests/
  ├── Mocks/
  │   ├── MockBookRepository.swift                 # NEW
  │   ├── MockGoalRepository.swift                 # NEW
  │   ├── MockUserRepository.swift                 # NEW
  │   └── MockPasswordHasher.swift                 # NEW
  ├── Integration/
  │   ├── BookWorkflowTests.swift                  # NEW
  │   └── GoalWorkflowTests.swift                  # NEW
  └── UseCases/... (all use case tests)            # NEW
```

---

### 3.2 Backend Critical Bugs (From claude_recommendations.md)

#### Bug 1: Reading Auto-Completion Never Fires
**Severity**: 🔴 High  
**File**: `domain/services/book-service.ts:27-33`

**Problem**:
```typescript
// Current broken logic
const updates: Record<string, unknown> = { currentPage };
const readingStatus = new ReadingStatus(book);  // Uses OLD page
if (readingStatus.shouldAutoMarkAsRead()) { ... }  // Never true!
```

**Fix**:
```typescript
// Create updated book with new page first
const updatedBook = { ...book, currentPage };
const readingStatus = new ReadingStatus(updatedBook);
if (readingStatus.shouldAutoMarkAsRead()) {
  Object.assign(updates, readingStatus.transitionTo('read'));
}
```

---

#### Bug 2: Goal Completion Flag Never Resets
**Severity**: 🔴 High  
**File**: `domain/services/goal-service.ts:36-44, 102-108`

**Problem**:
```typescript
// Only sets completed to true, never back to false
if (progress.shouldAutoComplete()) {
  updates.completed = true;
}
// Missing: what if progress drops below threshold?
```

**Fix**:
```typescript
// Always sync completed flag with actual progress
updates.completed = progress.isCompleted();
```

---

## 4. New User Features (RECOMMENDATIONS.md)

### 4.1 High Priority Features (Quick Wins - Already Started)

| Feature | Backend | iOS | Priority | Complexity |
|---------|---------|-----|----------|------------|
| Reading Streaks | ✅ Complete | ⚠️ Partial | **High** | Small |
| Book Genres/Tags | ✅ Complete | ⚠️ Partial | **High** | Small |
| Export Data | ✅ Complete | ❌ Missing | **High** | Small |
| API Pagination | ✅ Complete | ⚠️ Partial | **High** | Small |

---

### 4.2 Medium-Term Features (Core Value)

| Feature | Description | Backend | iOS | Priority | Complexity |
|---------|-------------|---------|-----|----------|------------|
| **Reading Sessions** | Track time spent reading with start/stop timer | ❌ | ❌ | High | Medium |
| **Reading Insights Dashboard** | Charts showing reading pace, genres, monthly stats | ❌ | ❌ | High | Medium |
| **Book Notes/Highlights** | Add notes and highlights while reading | ❌ | ❌ | Medium | Medium |
| **Push Notifications** | Reminders to read, goal deadlines | ❌ | ❌ | Medium | Medium |
| **Barcode Scanner** | Scan ISBN to add books quickly | ❌ | ❌ | High | Medium |

**Details: Reading Sessions**
- Start/stop timer in iOS app
- Track minutes per session
- Aggregate daily/weekly/monthly totals
- Show in dashboard and insights

**Backend Requirements**:
```
New table: reading_sessions
- id, userId, bookId, startTime, endTime, minutesRead
- Can reuse ReadingActivity model (already has minutesRead)
- API: POST /sessions/start, POST /sessions/stop
```

**iOS Requirements**:
```
New files:
- Features/ReadingSessions/Views/SessionTimerView.swift
- Features/ReadingSessions/ViewModels/SessionViewModel.swift
```

---

### 4.3 Long-Term Features (Differentiation)

| Feature | Description | Priority | Complexity | Notes |
|---------|-------------|----------|------------|-------|
| **Book Recommendations** | ML-based recommendations from reading history | Medium | Large | Requires recommendation engine |
| **Goodreads Import** | Import existing library from Goodreads | High | Medium | Popular request |
| **Social Features** | Friends, reviews, challenges | Low | Large | Future phase |
| **Annual Reading Wrap** | Year-end summary (Spotify Wrapped style) | Low | Large | Fun but low priority |
| **Widget Support** | iOS home/lock screen widgets | Medium | Medium | Native iOS feature |
| **Offline Mode** | Full offline with sync | Medium | Large | Complex sync logic |

---

## 5. iOS UI Implementation Plan

### 5.1 iOS UI Missing Components (from UI_UX_IMPLEMENTATION_PLAN.md)

This is a comprehensive plan created by GPT-5 (Codex) for iOS UI. Let's map **what's done vs. what's missing**:

#### Phase 1: Foundation (IMMEDIATE FIXES)
| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| FIX-001: Restore SwiftUI files in Xcode | ✅ Complete | P1 | Files exist and build |
| FIX-002: Reintroduce auth gate at app root | ⚠️ Partial | P1 | RootView exists, needs testing |
| FIX-003: Wire AuthViewModel to repositories | ⚠️ Partial | P1 | AppContainer exists, needs verification |
| FIX-004: Resolve unauthorized API errors | ⚠️ Partial | P1 | NetworkClient exists, needs testing |
| FIX-005: Minimal smoke test target | ❌ Missing | P1 | No UITests yet |

---

#### Phase 2: Core Features
| Task | Status | Priority | Files |
|------|--------|----------|-------|
| UI-AUTH-001: LoginView UI/UX | ✅ Exists | P2 | `LoginView.swift` |
| UI-AUTH-002: RegisterView UI/UX | ✅ Exists | P2 | `RegisterView.swift` |
| UI-CORE-001: MainTabView structure | ✅ Exists | P2 | `MainTabView.swift` |
| UI-BOOKS-001: Books list & filtering | ✅ Exists | P2 | `BooksListView.swift` |
| UI-BOOKS-002: Book detail & progress | ✅ Exists | P2 | `BookDetailView.swift` |
| UI-BOOKS-003: AddBookView flow | ✅ Exists | P2 | `AddBookView.swift` |
| UI-SEARCH-001: SearchView with Google Books | ✅ Exists | P2 | `SearchView.swift` |
| UI-GOALS-001: Goals list dashboard | ✅ Exists | P2 | `GoalsListView.swift` |
| UI-GOALS-002: CreateGoalView workflow | ✅ Exists | P2 | `CreateGoalView.swift` |
| UI-DASH-001: Dashboard summary | ⚠️ Partial | P2 | DashboardView exists but not integrated |

---

#### Phase 3: UX Patterns (POLISH)
| Task | Status | Priority | Impact |
|------|--------|----------|--------|
| UX-NAV-001: Navigation flows | ⚠️ Needs review | P3 | NavigationStack usage |
| UX-EMPTY-001: Empty states | ❌ Missing | P3 | All screens need empty states |
| UX-LOAD-001: Loading indicators | ❌ Missing | P3 | Consistent skeleton screens |
| UX-ERROR-001: Error handling | ❌ Missing | P3 | Error banner component |
| UX-FORM-001: Form validation | ❌ Missing | P3 | Reusable validators |
| UX-REFRESH-001: Pull-to-refresh | ⚠️ Partial | P3 | Exists but needs testing |
| UX-OFFLINE-001: Offline support | ❌ Missing | P3 | Reachability service |

---

#### Phase 4: Final Polish
| Task | Status | Priority |
|------|--------|----------|
| POLISH-ANI-001: Micro-animations | ❌ Missing | P4 |
| POLISH-HAPTIC-001: Haptic feedback | ❌ Missing | P4 |
| POLISH-ACCESS-001: Accessibility audit | ❌ Missing | P4 |
| POLISH-DARK-001: Dark mode theming | ❌ Missing | P4 |
| POLISH-ONBOARD-001: Onboarding screens | ❌ Missing | P4 |

---

### 5.2 iOS Feature Files - Current Status

**✅ Views Created** (but may need integration):
```
Auth: LoginView, RegisterView
Books: BooksListView, BookDetailView, AddBookView, BookCard, GenreChips
Goals: GoalsListView, CreateGoalView, GoalCard
Search: SearchView, SearchResultCard
Dashboard: DashboardView, LogActivityView, StreakBadge
```

**⚠️ ViewModels Created** (but may need API wiring):
```
Auth: AuthViewModel
Books: BooksListViewModel, SearchBooksViewModel
Goals: GoalsViewModel
Dashboard: DashboardViewModel, StreakViewModel
Search: SearchViewModel
```

**❌ Missing Infrastructure**:
```
ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Repositories/
  └── StreakRepository.swift                       # MISSING - Blocks streaks feature
```

**❌ Missing Use Cases**:
```
ios/Packages/Application/Sources/Application/UseCases/Streaks/
  ├── GetUserStreakUseCase.swift                   # MISSING
  └── RecordActivityUseCase.swift                  # MISSING
```

---

## 6. Recommended Execution Priority

### 6.1 CRITICAL (Fix Before Anything Else)

**🔴 Priority 1: Fix Backend Bugs**
1. **Reading Auto-Completion Bug** (`domain/services/book-service.ts`)
   - **Impact**: Users can't auto-complete books by reaching last page
   - **Effort**: 1-2 hours
   - **Blocker**: Core reading flow broken

2. **Goal Completion Sync Bug** (`domain/services/goal-service.ts`)
   - **Impact**: Goal completion flag never resets (data integrity)
   - **Effort**: 1 hour
   - **Blocker**: Goal stats permanently wrong

**Recommended**: Fix both bugs in a single session, add regression tests

---

### 6.2 HIGH PRIORITY (Make App Fully Functional)

**🟠 Priority 2: Complete iOS-Backend Feature Parity**

*Phase A: Reading Streaks (Backend ✅, iOS ⚠️)*
1. Create `StreakRepository.swift` in InfrastructureIOS
2. Create streak use cases in Application layer
3. Wire `StreakViewModel` to real data (currently may be mocked)
4. Add Dashboard tab to `MainTabView`
5. Test full streak flow (display → log activity → update)

**Effort**: 1-2 days  
**Value**: High - Gamification drives engagement

---

*Phase B: Book Genres (Backend ✅, iOS ⚠️)*
1. Integrate `GenreChips` into `BookCard`
2. Add genre filter to `BooksListView`
3. Add genre picker to `AddBookView` and `BookDetailView`
4. Fetch genres from API (`GET /books/genres`)

**Effort**: 1 day  
**Value**: High - Improves book organization

---

*Phase C: Data Export (Backend ✅, iOS ❌)*
1. Add Settings tab to `MainTabView`
2. Create `SettingsView` with export option
3. Create `ExportDataView` with format picker
4. Integrate share sheet for JSON/CSV export

**Effort**: 0.5-1 day  
**Value**: Medium - User data ownership

---

*Phase D: Pagination (Backend ✅, iOS ⚠️)*
1. Add infinite scroll to `BooksListViewModel`
2. Add infinite scroll to `GoalsViewModel`
3. Add loading indicators for "Load More"
4. Handle edge cases (empty, last page)

**Effort**: 1 day  
**Value**: Medium - Scalability for large libraries

---

### 6.3 MEDIUM PRIORITY (Technical Quality)

**🟡 Priority 3: Swift Architecture Improvements** (from AB Method tasks)

1. **Task 1: Swift Concurrency & Type Safety**
   - Add `Sendable` conformance to all Input structs
   - Add `Equatable` for testability
   - Add documentation comments
   - **Effort**: 2-3 days
   - **Value**: Foundation for future features

2. **Task 2: Repository Performance Optimizations**
   - Add `exists()` methods to protocols
   - Optimize duplicate checks
   - **Effort**: 1-2 days
   - **Value**: Better performance at scale

3. **Task 3: Domain Error Refinement**
   - Granular error cases
   - Shared ownership validation
   - **Effort**: 1-2 days
   - **Value**: Better error UX

4. **Task 4: Comprehensive Testing Suite**
   - Regression tests for entities
   - Use case error path tests
   - Integration tests
   - **Effort**: 3-5 days
   - **Value**: Confidence in changes

**Recommended**: Tackle in order (1 → 2 → 3 → 4) over 1-2 sprints

---

### 6.4 FUTURE ENHANCEMENTS (Post-MVP)

**🟢 Priority 4: New User Features**

*Quick Wins (1-2 weeks each)*:
- Reading Sessions with timer
- Push Notifications
- Barcode Scanner (ISBN lookup)
- iOS Widgets

*Medium-Term (2-4 weeks each)*:
- Reading Insights Dashboard (charts, stats)
- Book Notes/Highlights
- Goodreads Import

*Long-Term (1-3 months each)*:
- Book Recommendations (ML)
- Social Features (friends, reviews)
- Offline Mode with sync
- Annual Reading Wrap

---

## Summary & Next Steps

### What We Have
✅ **Backend**: Solid foundation with core features (auth, books, goals, streaks, genres, export)  
✅ **iOS**: Clean Architecture implemented, most UI screens created  
✅ **Documentation**: Comprehensive guides and task tracking

### What's Missing
❌ **Backend Bugs**: 2 critical data integrity bugs  
❌ **iOS Integration**: Backend APIs exist but iOS UI not fully wired  
❌ **Technical Debt**: 4 architecture improvement tasks pending  
❌ **User Features**: 15+ feature ideas not yet implemented

### Recommended Sprint Plan

**Sprint 1 (Week 1): Critical Fixes**
- Fix backend bugs (reading auto-completion, goal sync)
- Add regression tests
- Verify iOS auth flow works end-to-end

**Sprint 2 (Week 2-3): Feature Parity**
- Complete Reading Streaks iOS integration
- Add Book Genres to iOS UI
- Implement Data Export in Settings

**Sprint 3 (Week 4-5): Technical Debt**
- Swift Concurrency & Type Safety improvements
- Repository Performance Optimizations
- Testing Suite (start)

**Sprint 4+ (Week 6+): New Features**
- Reading Sessions
- Barcode Scanner
- Push Notifications
- etc.

---

## Appendix: File Reference

### Backend Files Needing Updates
```
domain/services/book-service.ts                    # FIX: Auto-completion bug
domain/services/goal-service.ts                    # FIX: Completion sync bug
prisma/schema.prisma                               # ADD: Database indexes
```

### iOS Files Needing Creation
```
ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Repositories/
  └── StreakRepository.swift                       # NEW

ios/Packages/Application/Sources/Application/UseCases/Streaks/
  ├── GetUserStreakUseCase.swift                   # NEW
  └── RecordActivityUseCase.swift                  # NEW

ios/BookTrackerApp/Features/Settings/
  ├── Views/SettingsView.swift                     # NEW
  └── Views/ExportDataView.swift                   # NEW
```

### iOS Files Needing Updates
```
ios/BookTrackerApp/Core/MainTabView.swift          # ADD: Dashboard tab
ios/BookTrackerApp/Features/Books/Components/BookCard.swift          # ADD: Genre chips
ios/BookTrackerApp/Features/Books/Views/BooksListView.swift         # ADD: Genre filter
ios/BookTrackerApp/Features/Books/Views/AddBookView.swift           # ADD: Genre picker
ios/BookTrackerApp/Features/Books/ViewModels/BooksListViewModel.swift   # ADD: Pagination
ios/BookTrackerApp/Features/Goals/ViewModels/GoalsViewModel.swift       # ADD: Pagination
```

---

*End of Analysis*