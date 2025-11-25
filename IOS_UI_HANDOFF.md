# iOS UI Assessment & Implementation Handoff

> **Purpose**: This document provides context for evaluating and updating the iOS UI to support new backend features and improve user experience.
> **Date**: 2025-11-25
> **Branch**: feature/ios-features

---

## Table of Contents

1. [Session Summary](#session-summary)
2. [Backend Features Implemented](#backend-features-implemented)
3. [Current iOS UI State](#current-ios-ui-state)
4. [Features Missing iOS UI](#features-missing-ios-ui)
5. [Recommended iOS UI Changes](#recommended-ios-ui-changes)
6. [Implementation Priority](#implementation-priority)
7. [Technical Notes](#technical-notes)

---

## Session Summary

This session focused on code review, security improvements, and implementing "quick win" features. The backend API now has several new features that need iOS UI support.

### Completed Backend Work

1. **Security Improvements**
   - Replaced debug console.logs with structured logging (`infrastructure/logging/`)
   - Added rate limiting (global 100/min, auth 5/min)
   - Strengthened password validation (8+ chars, upper/lower/number, common password check)

2. **New Features Implemented**
   - Reading Streaks (gamification)
   - Book Genres/Tags
   - Data Export (JSON/CSV)
   - API Pagination (cursor-based)

3. **Documentation**
   - Created `RECOMMENDATIONS.md` with full code review findings and feature roadmap

---

## Backend Features Implemented

### 1. Reading Streaks API

**Endpoints:**
```
GET  /streaks              - Get streak stats (current, longest, total days, motivational message)
POST /streaks/activity     - Record reading activity {pagesRead, minutesRead, bookId?, date?}
GET  /streaks/history      - Get activity history (optional date range filter)
```

**Response Example (GET /streaks):**
```json
{
  "currentStreak": 5,
  "longestStreak": 12,
  "totalDaysRead": 45,
  "lastActivityDate": "2025-11-25T00:00:00.000Z",
  "isActiveToday": true,
  "isAtRisk": false,
  "message": "Nice! 5 days in a row. You're building a habit!"
}
```

**Database Model:** `ReadingActivity` (id, userId, bookId?, activityDate, pagesRead, minutesRead)

---

### 2. Book Genres/Tags

**Changes:**
- Books now have a `genres: string[]` field
- Filter books by genre: `GET /books?genre=Fiction`
- Get all user's genres: `GET /books/genres`

**API Changes:**
- `POST /books` accepts optional `genres` array
- `PATCH /books/:id` can update `genres`

---

### 3. Data Export

**Endpoints:**
```
GET /export/books?format=json|csv   - Export books
GET /export/goals?format=json|csv   - Export goals
GET /export/all                     - Export all data (JSON only)
```

---

### 4. API Pagination

**Changes to existing endpoints:**
```
GET /books?cursor=<id>&limit=<n>   - Paginated books
GET /goals?cursor=<id>&limit=<n>   - Paginated goals
```

**Response now includes:**
```json
{
  "books": [...],
  "pagination": {
    "nextCursor": "abc123",
    "hasMore": true,
    "totalCount": 150
  }
}
```

---

## Current iOS UI State

### Tab Structure (MainTabView.swift)
```
Tab 1: Books (BooksListView)
Tab 2: Goals (GoalsListView)
Tab 3: Search (SearchView)
Tab 4: Settings (SettingsView - just logout + version)
```

### Books Tab Features
- ✅ Book list with search bar
- ✅ Filter chips (All, Want to Read, Reading, Read)
- ✅ Book cards with status, progress, rating
- ✅ Add book via search
- ✅ Update/delete books
- ✅ Empty state
- ✅ Pull to refresh
- ❌ No genre filtering
- ❌ No pagination (loads all books)

### Goals Tab Features
- ✅ Goals list
- ✅ Create goal form
- ✅ Goal progress cards
- ❌ No pagination

### Search Tab Features
- ✅ Google Books search
- ✅ Add books from search results

### Settings Tab
- ✅ Logout button
- ✅ Version number
- ❌ No export data option
- ❌ No account info

### What's Completely Missing
- ❌ **Reading Streaks UI** - No display anywhere
- ❌ **Dashboard/Home screen** - No overview of stats
- ❌ **Genre management** - Can't add/filter by genre
- ❌ **Export functionality** - No way to export data
- ❌ **Activity logging** - No way to record reading sessions

---

## Features Missing iOS UI

### Priority 1: Reading Streaks (High Impact, New Feature)

**What's needed:**
1. **Streak Display Component** - Shows current streak with flame icon
2. **Activity Recording** - Button/flow to log reading activity
3. **Streak Stats View** - Full stats (current, longest, total days)
4. **Streak History** - Calendar or list view of past activity

**Suggested Placement:**
- Streak badge in Books tab header or new Dashboard tab
- "Log Reading" floating action button or in book detail view

### Priority 2: Dashboard Tab (Improves UX)

**What's needed:**
A new home/dashboard tab showing:
- Current reading streak prominently
- Books currently reading
- Active goals progress
- Quick stats (total books, pages read, etc.)
- Quick actions (log reading, add book)

**Would replace or supplement:** Could be Tab 1, moving Books to Tab 2

### Priority 3: Genre Management

**What's needed:**
1. **Genre chips on BookCard** - Display assigned genres
2. **Genre filter** - Add to filter chips or separate dropdown
3. **Edit genres** - In book detail or edit view
4. **Genre picker** - Reusable component for selecting genres

### Priority 4: Export Data

**What's needed:**
- Export option in Settings tab
- Format picker (JSON/CSV)
- Share sheet for exporting

### Priority 5: Pagination Support

**What's needed:**
- Infinite scroll or "Load More" in BooksListView
- Same for GoalsListView
- Loading indicator for pagination

---

## Recommended iOS UI Changes

### Option A: Add Dashboard Tab (Recommended)

```
Tab 1: Dashboard (NEW) - Streak, currently reading, goals summary
Tab 2: Books - Existing + genres
Tab 3: Goals - Existing
Tab 4: Search - Existing
Tab 5: Settings - Existing + export
```

### Option B: Enhance Existing Tabs

```
Tab 1: Books - Add streak banner at top, add genres
Tab 2: Goals - No changes
Tab 3: Search - No changes
Tab 4: Settings - Add export, account info
```

### New Swift Files Needed

```
ios/BookTrackerApp/
├── Features/
│   ├── Dashboard/                    # NEW
│   │   ├── Views/
│   │   │   └── DashboardView.swift
│   │   ├── ViewModels/
│   │   │   └── DashboardViewModel.swift
│   │   └── Components/
│   │       ├── StreakCard.swift
│   │       ├── CurrentlyReadingSection.swift
│   │       └── QuickStatsView.swift
│   ├── Streaks/                      # NEW
│   │   ├── Views/
│   │   │   ├── StreakDetailView.swift
│   │   │   └── LogActivityView.swift
│   │   ├── ViewModels/
│   │   │   └── StreakViewModel.swift
│   │   └── Components/
│   │       ├── StreakBadge.swift
│   │       └── ActivityHistoryList.swift
│   └── Books/
│       └── Components/
│           └── GenreChips.swift      # NEW
```

### New Swift Package Files Needed

```
ios/Packages/
├── CoreDomain/Sources/CoreDomain/
│   └── Entities/
│       └── ReadingActivity.swift     # NEW
├── Application/Sources/Application/
│   └── UseCases/
│       └── Streaks/                  # NEW
│           ├── GetUserStreakUseCase.swift
│           └── RecordActivityUseCase.swift
└── InfrastructureIOS/Sources/InfrastructureIOS/
    ├── Models/
    │   └── StreakModels.swift        # NEW (API DTOs)
    └── Repositories/
        └── StreakRepository.swift    # NEW
```

---

## Implementation Priority

### Phase 1: Core Streak Feature
1. Create `ReadingActivity` entity in CoreDomain
2. Create streak use cases in Application layer
3. Create `StreakRepository` with API client
4. Create `StreakViewModel`
5. Create `StreakBadge` component
6. Add streak display to BooksListView header

### Phase 2: Activity Logging
1. Create `LogActivityView` (simple form: pages, minutes)
2. Add "Log Reading" button (floating or in nav bar)
3. Integrate with book progress updates (auto-log when updating currentPage)

### Phase 3: Dashboard (Optional but Recommended)
1. Create `DashboardView` with sections
2. Create `DashboardViewModel`
3. Add as new tab
4. Move relevant data from other views

### Phase 4: Genre Support
1. Add `genres` to Book model in CoreDomain
2. Update BookRepository to handle genres
3. Create `GenreChips` component
4. Add genre filter to BooksListView
5. Add genre editing to BookDetailView

### Phase 5: Polish
1. Add pagination to book/goal lists
2. Add export to Settings
3. Improve empty states
4. Add animations for streak updates

---

## Technical Notes

### API Base URL
Check `ios/Packages/InfrastructureIOS/` for API client configuration. Base URL may need to be environment-configurable.

### Authentication
JWT tokens are stored in Keychain. All new endpoints require `Authorization: Bearer <token>` header.

### Database Migration Required
Before testing streaks, run: `npm run db:migrate` to create the `reading_activities` table.

### Testing the Backend
```bash
# Start backend
npm run dev

# Test streak endpoints (need valid JWT)
curl http://localhost:4000/streaks -H "Authorization: Bearer $TOKEN"
```

### Key Files to Reference
- `services/api/src/routes/streaks.ts` - Streak API endpoints
- `domain/value-objects/reading-streak.ts` - Streak calculation logic
- `domain/entities/reading-activity.ts` - Activity entity
- `RECOMMENDATIONS.md` - Full feature roadmap

---

## Questions to Consider

1. **Dashboard vs Enhanced Books Tab** - Which approach for showing streaks?
2. **Activity Logging UX** - Floating button, nav bar action, or book detail integration?
3. **Genre UX** - Predefined list vs free-form tags?
4. **Offline Support** - Should streaks work offline?

---

*This handoff document should be used to evaluate the iOS UI and plan implementation of the new features.*
