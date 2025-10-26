# Data Model – Reading Journey Tracker

**Feature**: Reading Journey Tracker
**Branch**: 001-track-reading
**Date**: 2025-10-25
**Database**: PostgreSQL 15+

## Overview

The feature introduces normalized relational tables within PostgreSQL to support shared book metadata, per-reader reading state, progress notes, status transition history, and ratings. All timestamps recorded in UTC with timezone (timestamptz).

This model directly implements the Key Entities defined in [spec.md](./spec.md#key-entities).

## Entities

### books

Represents a distinct title with metadata shared across readers.

**Columns**:
- **id** (UUID, PRIMARY KEY, default gen_random_uuid())
- **title** (VARCHAR(500), NOT NULL) - Book title
- **author** (VARCHAR(200), NOT NULL) - Primary author name
- **edition** (VARCHAR(100), NULLABLE) - Edition identifier (e.g., "2nd Edition", "Revised")
- **isbn** (VARCHAR(17), NULLABLE) - ISBN-10 or ISBN-13, normalized (digits + hyphens)
- **cover_image_url** (TEXT, NULLABLE) - URL to cover image
- **created_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- **updated_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints**:
- **UNIQUE** (title, author, COALESCE(edition, '')) - Prevents duplicate books (spec FR-006)
- **CHECK** (LENGTH(title) >= 1 AND LENGTH(title) <= 500)
- **CHECK** (LENGTH(author) >= 1 AND LENGTH(author) <= 200)
- **CHECK** (edition IS NULL OR (LENGTH(edition) >= 1 AND LENGTH(edition) <= 100))
- **CHECK** (isbn IS NULL OR isbn ~ '^[0-9-]{10,17}$') - ISBN format validation (spec entity definition)

### reader_profiles

Captures user-level preferences for the reading tracker.

**Columns**:
- **id** (UUID, PRIMARY KEY) - Matches authenticated user ID from auth system
- **default_sort** (VARCHAR(20), NULLABLE) - Default sort preference (e.g., "title_asc", "author_asc", "updated_desc")
- **notification_preferences** (JSONB, NULLABLE) - Notification settings
- **accessibility_settings** (JSONB, NULLABLE) - Accessibility preferences (e.g., {"highContrast": true, "largeText": false})
- **created_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- **updated_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints**:
- **CHECK** (default_sort IS NULL OR default_sort IN ('title_asc', 'author_asc', 'updated_desc', 'rating_desc'))

### reading_entries

Tracks a reader's relationship to a book, including status, rating, and reflection.

**Columns**:
- **id** (UUID, PRIMARY KEY, default gen_random_uuid())
- **reader_id** (UUID, NOT NULL, FOREIGN KEY REFERENCES reader_profiles(id) ON DELETE CASCADE)
- **book_id** (UUID, NOT NULL, FOREIGN KEY REFERENCES books(id) ON DELETE RESTRICT)
- **status** (VARCHAR(10), NOT NULL) - Enum: 'TO_READ', 'READING', 'FINISHED'
- **rating** (SMALLINT, NULLABLE) - 1-5 scale, only valid for FINISHED status
- **reflection_note** (TEXT, NULLABLE) - Personal notes/review
- **created_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- **updated_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints**:
- **UNIQUE** (reader_id, book_id) - One entry per reader per book (spec FR-006)
- **CHECK** (status IN ('TO_READ', 'READING', 'FINISHED'))
- **CHECK** (rating IS NULL OR (rating >= 1 AND rating <= 5))
- **CHECK** (reflection_note IS NULL OR LENGTH(reflection_note) <= 2000)
- **CHECK** (rating IS NULL OR status = 'FINISHED') - Ratings only for finished books (spec entity definition)

**Indexes**:
- **INDEX** idx_reading_entries_reader_status ON reading_entries(reader_id, status) - For filtered lists
- **INDEX** idx_reading_entries_updated ON reading_entries(updated_at DESC) - For recent activity

### progress_updates

Captures in-progress reading notes for books marked as READING.

**Columns**:
- **id** (UUID, PRIMARY KEY, default gen_random_uuid())
- **reading_entry_id** (UUID, NOT NULL, FOREIGN KEY REFERENCES reading_entries(id) ON DELETE CASCADE)
- **note** (TEXT, NOT NULL) - Progress note content
- **page_or_chapter** (VARCHAR(50), NULLABLE) - Optional location marker (e.g., "Chapter 5", "Page 142")
- **created_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints**:
- **CHECK** (LENGTH(note) >= 1 AND LENGTH(note) <= 1000)
- **CHECK** (page_or_chapter IS NULL OR LENGTH(page_or_chapter) <= 50)

**Indexes**:
- **INDEX** idx_progress_updates_entry ON progress_updates(reading_entry_id, created_at DESC) - For chronological display (spec FR-004)

### status_transitions

Tracks changes between statuses for audit trail and analytics.

**Columns**:
- **id** (UUID, PRIMARY KEY, default gen_random_uuid())
- **reading_entry_id** (UUID, NOT NULL, FOREIGN KEY REFERENCES reading_entries(id) ON DELETE CASCADE)
- **from_status** (VARCHAR(10), NULLABLE) - NULL for initial creation
- **to_status** (VARCHAR(10), NOT NULL) - Enum: 'TO_READ', 'READING', 'FINISHED'
- **transitioned_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints**:
- **CHECK** (from_status IS NULL OR from_status IN ('TO_READ', 'READING', 'FINISHED'))
- **CHECK** (to_status IN ('TO_READ', 'READING', 'FINISHED'))

**Indexes**:
- **INDEX** idx_status_transitions_entry ON status_transitions(reading_entry_id, transitioned_at DESC) - For transition history (spec FR-003)

### sessions

Session storage for authentication (used by @fastify/session).

**Columns**:
- **sid** (VARCHAR(255), PRIMARY KEY) - Session ID
- **sess** (JSONB, NOT NULL) - Session data containing { readerId, role, createdAt, expiresAt }
- **expire** (TIMESTAMPTZ, NOT NULL) - Session expiration time

**Indexes**:
- **INDEX** idx_sessions_expire ON sessions(expire) - For TTL cleanup

## Relationships

```text
reader_profiles (1) ──< (N) reading_entries
books (1) ──< (N) reading_entries
reading_entries (1) ──< (N) progress_updates
reading_entries (1) ──< (N) status_transitions
```

- **reader_profiles → reading_entries**: One reader has many reading entries (CASCADE DELETE)
- **books → reading_entries**: One book appears in many reading entries (RESTRICT DELETE - don't delete books with active readers)
- **reading_entries → progress_updates**: One reading entry has many progress notes (CASCADE DELETE)
- **reading_entries → status_transitions**: One reading entry has many status transitions (CASCADE DELETE)

## State Transitions

Defined by spec FR-003: "System MUST permit readers to transition a book between statuses and record the transition date and previous status."

| Current Status | Allowed Next Status | Implementation Notes |
|----------------|---------------------|----------------------|
| `TO_READ` | `READING`, `FINISHED` | Insert row into status_transitions, update reading_entries.status, update reading_entries.updated_at |
| `READING` | `TO_READ`, `FINISHED` | Same as above; transitioning to FINISHED triggers rating/reflection prompt in UI |
| `FINISHED` | `READING`, `TO_READ` | Re-reading scenario (spec edge case). Preserve existing rating unless user explicitly clears it |

**Business Logic**:
1. Every status change triggers INSERT into `status_transitions` table with `from_status`, `to_status`, `transitioned_at`
2. `reading_entries.status` is updated to new status
3. `reading_entries.updated_at` is updated to NOW()
4. Analytics events emitted (FR-016) for measuring SC-003 (80% of finished books include rating)

**Special Cases**:
- Initial book addition: `from_status = NULL`, `to_status = 'TO_READ'` (or user's choice)
- Re-reading: Transitioning from `FINISHED` back to `READING` keeps existing `progress_updates` but may prompt user to clear rating
- Concurrent edits: Last-write-wins (FR-010) - client includes `updated_at` timestamp, server rejects if stale

## Derived Data / Queries

### Top Rated Books (User Story 3, spec line 52)

```sql
-- Query for "Top Rated" filter (ratings ≥4)
SELECT b.*, re.rating, re.reflection_note
FROM books b
JOIN reading_entries re ON re.book_id = b.id
WHERE re.reader_id = $1
  AND re.status = 'FINISHED'
  AND re.rating >= 4
ORDER BY re.rating DESC, re.updated_at DESC
LIMIT 100 OFFSET $2;
```

### Reader Activity Feed (for timeline/analytics)

```sql
-- Combine recent progress updates and status transitions
SELECT
  'progress' AS event_type,
  pu.created_at AS event_time,
  b.title,
  b.author,
  pu.note AS content,
  pu.page_or_chapter
FROM progress_updates pu
JOIN reading_entries re ON re.id = pu.reading_entry_id
JOIN books b ON b.id = re.book_id
WHERE re.reader_id = $1

UNION ALL

SELECT
  'status_change' AS event_type,
  st.transitioned_at AS event_time,
  b.title,
  b.author,
  st.to_status AS content,
  NULL AS page_or_chapter
FROM status_transitions st
JOIN reading_entries re ON re.id = st.reading_entry_id
JOIN books b ON b.id = re.book_id
WHERE re.reader_id = $1

ORDER BY event_time DESC
LIMIT 50;
```

## Migration Strategy

Migrations implemented as plain SQL files in `backend/migrations/` (see [research.md](./research.md#storage--data-access)).

**Migration sequence**:
1. `001_create_tables.sql` - Create all tables with constraints
2. `002_create_indexes.sql` - Add performance indexes
3. `003_create_sessions_table.sql` - Session storage for auth
4. Future: `00X_add_feature.sql` - Incremental schema changes

**Rollback strategy**: Each migration includes corresponding `DOWN` migration for schema rollback during development.
