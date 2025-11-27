# BookTracker - Code Review & Recommendations

> Generated: 2025-11-25
> Branch: feature/ios-features

This document captures code review findings, improvement opportunities, and feature ideas for the BookTracker application.

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Low Priority Issues](#low-priority-issues)
5. [Feature Ideas](#feature-ideas)
6. [Recommended Priority Order](#recommended-priority-order)

---

## Critical Issues

### 1. Debug Logging in Production Code

**Files Affected:**
- `infrastructure/persistence/prisma/goal-repository.ts:8-78`
- `infrastructure/persistence/prisma/book-repository.ts:50-66`

**Problem:**
```typescript
console.log('[GoalRepository] Creating goal:', JSON.stringify(goal, null, 2));
console.log('[BookRepository] Updating book:', id, 'with updates:', ...);
```

Debug logs expose potentially sensitive user data and should never be in production code.

**Solution:**
- Remove all `console.log` statements from repository implementations
- Implement a proper logging framework with configurable log levels (debug/info/warn/error)
- Use structured logging for better observability

**Status:** ✅ Complete

---

## High Priority Issues

### 2. Weak Password Policy

**File:** `application/use-cases/auth/register-user.ts:25`

**Current Implementation:**
```typescript
if (input.password.length < 6) {
  throw new ValidationError('Password must be at least 6 characters');
}
```

**Problem:**
Modern security standards recommend stronger password requirements. A 6-character minimum is insufficient protection against brute-force attacks.

**Recommendation:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Consider checking against common password lists (e.g., "password123")

**Status:** ✅ Complete - Implemented in `domain/value-objects/password-requirements.ts`

---

### 3. Missing Rate Limiting on Authentication

**File:** `services/api/src/routes/auth.ts`

**Problem:**
No rate limiting on authentication endpoints exposes the API to:
- Brute-force password attacks
- Credential stuffing attacks
- Denial of service

**Solution:**
- Add `@fastify/rate-limit` plugin
- Configure stricter limits on `/auth/login` (e.g., 5 attempts per minute)
- Consider account lockout after repeated failures

**Status:** ✅ Complete - Global 100/min, Auth endpoints 5/min

---

### 4. Goal Progress Date Calculation Edge Case

**File:** `domain/value-objects/goal-progress.ts:25-28`

**Current Implementation:**
```typescript
getDaysRemaining(): number {
  const now = new Date();
  const timeRemaining = this.goal.endDate.getTime() - now.getTime();
  return Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
}
```

**Problem:**
Returns negative numbers for overdue goals. The `isOverdue()` method exists separately, creating potential for inconsistent UX when displaying "days remaining."

**Solution:**
Return 0 for overdue goals or explicitly handle negative values in the UI layer.

**Status:** ✅ Complete - `getDaysRemaining()` now returns 0 for overdue goals

---

## Medium Priority Issues

### 5. Missing Input Validation Schemas

**Files:** All route handlers in `services/api/src/routes/`

**Problem:**
Routes perform manual validation instead of using Fastify's built-in JSON schema validation:
```typescript
if (!email || !password) {
  throw new ValidationError('Email and password are required');
}
```

**Solution:**
Use Fastify's schema validation for:
- Type checking
- Required field validation
- Format validation (email, UUID, etc.)
- Automatic OpenAPI documentation generation

**Status:** ✅ Complete - All routes have JSON schema validation

---

### 6. Missing Input Sanitization

**Problem:**
API routes trust incoming data without sanitization. While Prisma parameterizes queries (preventing SQL injection), XSS vulnerabilities could exist if data is rendered without escaping.

**Solution:**
- Sanitize string inputs (trim whitespace, escape HTML entities)
- Validate data types and formats at the API boundary

**Status:** ✅ Complete - Added `lib/utils/sanitize.ts` with HTML entity escaping

---

### 7. Hardcoded Configuration

**Problem:**
Some configuration values may be hardcoded rather than environment-driven, reducing deployment flexibility.

**Areas to Check:**
- iOS app API base URL
- Token expiration times
- API rate limits

**Solution:**
Use environment variables for all configuration with sensible defaults.

**Status:** ✅ Complete - Added `lib/config.ts` with centralized configuration

---

### 8. Database Index Optimization

**Problem:**
Query performance may degrade with larger datasets if indexes are missing.

**Columns to Index:**
- `books.userId` - filtered on every book query
- `goals.userId` - filtered on every goal query
- `refreshTokens.token` - looked up on every refresh
- `refreshTokens.userId` - for token cleanup

**Solution:**
Review Prisma schema and add `@@index` annotations where needed.

**Status:** ⏳ Pending

---

### 9. No Request/Response Logging

**Problem:**
No visibility into API request patterns, response times, or error rates.

**Solution:**
Implement structured request logging with:
- Request ID for tracing
- Response time metrics
- Error categorization
- Log sampling for high-traffic endpoints

**Status:** ✅ Complete - Added `services/api/src/middleware/request-logger.ts`

---

### 10. Missing API Pagination

**Problem:**
`GET /books` and `GET /goals` return all records without pagination, which won't scale.

**Solution:**
Implement cursor-based pagination:
```typescript
GET /books?cursor=abc123&limit=20
```

---

## Low Priority Issues

### 11. README Documentation Outdated

**File:** `README.md`

**Problem:**
The README references Next.js, but the backend is now Fastify. This could confuse new developers.

**Solution:**
Update README to reflect current architecture:
- Fastify REST API backend
- iOS SwiftUI app
- PostgreSQL with Prisma

**Status:** ✅ Complete - README updated with Fastify/iOS architecture

---

### 12. Test Coverage Gaps

**Problem:**
While domain layer has good test coverage, application layer use cases may lack integration tests verifying the full flow.

**Areas Needing Tests:**
- API route integration tests
- Authentication flow end-to-end tests
- Error handling edge cases

**Status:** ⏳ Pending

---

### 13. Inconsistent Error Messages

**Problem:**
Some error messages are technical while others are user-friendly. Inconsistent error handling experience.

**Solution:**
Standardize error response format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly message",
    "details": { "field": "email", "issue": "invalid format" }
  }
}
```

**Status:** ✅ Complete - Added `services/api/src/middleware/error-handler.ts`

---

## Feature Ideas

### Reading Experience Features

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Reading Sessions** | Track time spent reading with start/stop timer | Medium | High |
| **Reading Streaks** | Gamification - track consecutive days of reading | Small | High |
| **Book Notes/Highlights** | Add notes and highlights while reading | Medium | Medium |
| **Reading Insights Dashboard** | Charts showing reading pace, genres, monthly stats | Medium | Medium |
| **Annual Reading Wrap** | Year-end summary like Spotify Wrapped | Large | Low |

### Discovery Features

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Book Recommendations** | Based on reading history and ratings | Large | Medium |
| **Reading Lists** | User-created collections (e.g., "Beach Reads") | Medium | Medium |
| **Book Genres/Tags** | Categorize books for filtering | Small | High |
| **Similar Books** | "If you liked X, try Y" suggestions | Medium | Low |

### Social Features

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Book Reviews** | Write public reviews for finished books | Medium | Medium |
| **Reading Challenges** | Community challenges (e.g., "Read 5 non-fiction") | Large | Low |
| **Share Progress** | Social sharing of milestones | Small | Medium |
| **Friend Activity** | See what friends are reading | Large | Low |

### UX Improvements

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Barcode Scanner** | Scan ISBN to add books quickly | Medium | High |
| **Offline Mode** | Full offline support with sync | Large | Medium |
| **Push Notifications** | Reminders to read, goal deadlines | Medium | Medium |
| **Widget Support** | iOS home screen widget showing current book | Medium | Medium |
| **Dark Mode Polish** | Ensure consistent dark mode across all screens | Small | Low |

### Technical Features

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Export Data** | Export reading history to CSV/JSON | Small | High |
| **Import from Goodreads** | Import existing library | Medium | High |
| **API Pagination** | Add cursor-based pagination for large libraries | Small | High |
| **Proper Logging** | Structured logging with levels | Small | Critical |
| **Health Check Improvements** | Database connectivity, dependency health | Small | Medium |

---

## Recommended Priority Order

### Immediate (Critical Fixes)
1. ✅ Remove debug console.logs from repositories
2. ✅ Implement proper logging framework
3. ✅ Add rate limiting to auth endpoints
4. ✅ Strengthen password validation

### Short-term (Quick Wins)
5. Add reading streaks (gamification drives engagement)
6. Add book genres/tags
7. Export data feature
8. API pagination

### Medium-term (Core Value)
9. Reading sessions with time tracking
10. Reading insights dashboard
11. Book notes/highlights
12. Push notifications
13. Barcode scanner

### Long-term (Differentiation)
14. Book recommendations
15. Goodreads import
16. Social features (friends, reviews)
17. Annual reading wrap

---

## Progress Tracking

| Issue | Status | Date | Notes |
|-------|--------|------|-------|
| Debug logging removal | ✅ Complete | 2025-11-25 | Replaced with structured logging |
| Logging framework | ✅ Complete | 2025-11-25 | Added `infrastructure/logging/` with configurable levels |
| Rate limiting | ✅ Complete | 2025-11-25 | Global 100/min + Auth 5/min |
| Password validation | ✅ Complete | 2025-11-25 | 8 chars, upper/lower/number, common password check |
| Reading streaks | ✅ Complete | 2025-11-25 | New ReadingActivity model, streak calculations, API endpoints |
| Book genres/tags | ✅ Complete | 2025-11-25 | Added genres field to books, filter by genre |
| Export data | ✅ Complete | 2025-11-25 | JSON/CSV export for books, goals, and full data |
| API pagination | ✅ Complete | 2025-11-25 | Cursor-based pagination for books and goals |
| Goal date edge case | ✅ Complete | 2025-11-25 | `getDaysRemaining()` returns 0 for overdue goals |
| Input validation schemas | ✅ Complete | 2025-11-25 | JSON schema validation on all routes |
| Input sanitization | ✅ Complete | 2025-11-25 | XSS prevention via HTML entity escaping |
| Hardcoded configuration | ✅ Complete | 2025-11-25 | Centralized config in `lib/config.ts` |
| Request/response logging | ✅ Complete | 2025-11-25 | Request ID tracing, response time metrics |
| README documentation | ✅ Complete | 2025-11-25 | Updated for Fastify/iOS architecture |
| Error message standardization | ✅ Complete | 2025-11-25 | Standardized error handler middleware |

---

*This document should be updated as issues are resolved and new recommendations are identified.*
