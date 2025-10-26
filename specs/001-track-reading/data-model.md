# Data Model – Reading Journey Tracker

## Overview

The feature introduces normalized relational tables within PostgreSQL to support shared book metadata, per-reader reading state, progress notes, and ratings. All timestamps recorded in UTC.

## Entities

### Book
- **book_id** (UUID, PK)
- **title** (text, required, 1–255 chars)
- **author** (text, required, 1–255 chars)
- **edition_label** (text, optional, 1–120 chars)
- **isbn** (varchar(17), optional, unique when present, normalized digits)
- **cover_image_url** (text, optional)
- **created_at** (timestamptz, default now)
- **updated_at** (timestamptz)

**Validation rules**
- Uniqueness enforced on `(lower(title), lower(author), coalesce(lower(edition_label), ''))`.
- ISBN must satisfy ISBN-10 or ISBN-13 checksum if provided.

### ReaderProfile
- **reader_id** (UUID, PK, references existing user table)
- **default_sort** (enum: `recent`, `title`, `rating`; default `recent`)
- **accessibility_preferences** (jsonb, optional) – persisted from existing settings.
- **created_at**, **updated_at**

### ReadingEntry
- **entry_id** (UUID, PK)
- **reader_id** (UUID, FK → ReaderProfile.reader_id, on delete cascade)
- **book_id** (UUID, FK → Book.book_id)
- **status** (enum: `to_read`, `reading`, `finished`)
- **status_started_at** (timestamptz, default now)
- **status_history** (jsonb array of `{from_status, to_status, changed_at}`)
- **current_page** (integer, optional, ≥0)
- **target_completion_date** (date, optional)
- **notes_preview** (text, optional – latest progress excerpt)
- **rating_value** (smallint, optional, 1–5)
- **rating_note** (text, optional, 0–2000 chars)
- **rating_recorded_at** (timestamptz, optional)
- **created_at**, **updated_at**

**Validation rules**
- Unique constraint on `(reader_id, book_id)` guarantees single active entry per reader/book.
- `rating_value` and `rating_note` permitted only when `status = finished`.
- `status_history` appended whenever `status` changes.

### ProgressNote
- **note_id** (UUID, PK)
- **entry_id** (UUID, FK → ReadingEntry.entry_id, on delete cascade)
- **recorded_at** (timestamptz, default now)
- **content** (text, required, 1–2000 chars)
- **progress_marker** (text, optional – e.g., "Chapter 5", "Page 120")
- **created_at**, **updated_at**

**Validation rules**
- `content` sanitized to prevent markup injection.
- Ordering by `recorded_at DESC` for display.

## Relationships
- `ReaderProfile` 1—* `ReadingEntry`
- `Book` 1—* `ReadingEntry`
- `ReadingEntry` 1—* `ProgressNote`

## State Transitions

| Current Status | Allowed Next Status | Side Effects |
|----------------|--------------------|--------------|
| `to_read` | `reading`, `finished` | Append history, reset progress markers |
| `reading` | `to_read`, `finished` | Append history; `finished` triggers rating prompt |
| `finished` | `reading` | Append history, clear `rating_value` only if user confirms |

- Transition timestamps captured in `status_history`.
- Reverting from `finished` to `reading` retains notes but clears `rating_recorded_at`.

## Derived Views
- **TopRatedBooks** materialized view to support “Top Rated” filters (book_id, avg_rating, ratings_count).
- **ReaderActivityFeed** view combining latest progress notes and status changes for timeline UI.
