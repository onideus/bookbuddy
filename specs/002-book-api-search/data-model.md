# Data Model: Book Information Search

**Feature**: 001-book-api-search
**Date**: 2025-10-29
**Status**: Design Complete

This document defines the data model for the book search feature, including entity definitions, relationships, validation rules, and state transitions.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     Book        │◄──────┐
│  (canonical)    │       │
└────────┬────────┘       │
         │                │
         │ 1              │
         │                │
         │                │
         │ N              │
         │                │
┌────────▼────────┐       │
│  BookEdition    │       │
│  (ISBN-level)   │       │
└────────┬────────┘       │
         │                │
         │ 1              │
         │                │
         │                │
         │ N              │ 1
         │                │
┌────────▼──────────────┐ │
│ BookMetadataSource    │ │
│   (provenance)        │ │
└───────────────────────┘ │
                          │
┌─────────────────┐       │
│ ReadingEntry    │───────┘
│  (existing)     │
└────────┬────────┘
         │
         │ 1
         │
         │
         │ N
         │
┌────────▼──────────────┐
│ReadingEntryOverride   │
│  (per-user fields)    │
└───────────────────────┘

┌───────────────────────┐
│  BookSearchCache      │
│  (query results)      │
└───────────────────────┘
(Independent - no relations)
```

---

## Entities

### 1. Book (Extended)

**Purpose**: Canonical work-level metadata shared across all users. Immutable after creation to prevent data leakage.

**Table**: `books` (extends existing table)

**Schema**:
```sql
-- Extend existing books table with migration 003
ALTER TABLE books
  ADD COLUMN normalized_title VARCHAR(500),
  ADD COLUMN primary_author VARCHAR(200),
  ADD COLUMN subtitle VARCHAR(500),
  ADD COLUMN language VARCHAR(10), -- ISO 639-1 code
  ADD COLUMN publisher VARCHAR(200),
  ADD COLUMN publication_date DATE,
  ADD COLUMN page_count INTEGER,
  ADD COLUMN description TEXT,
  ADD COLUMN categories TEXT[], -- Array of genre/category strings
  ADD COLUMN fingerprint VARCHAR(64); -- For fuzzy deduplication

-- Add indexes for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX book_normalized_title_trgm_idx ON books
  USING gin (normalized_title gin_trgm_ops);
CREATE INDEX book_primary_author_trgm_idx ON books
  USING gin (primary_author gin_trgm_ops);
CREATE INDEX book_fingerprint_idx ON books(fingerprint);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Existing field |
| title | VARCHAR(500) | NOT NULL | Existing field - original title as provided |
| author | VARCHAR(200) | NOT NULL | Existing field - original author as provided |
| edition | VARCHAR(100) | NULL | Existing field - moved to BookEdition |
| isbn | VARCHAR(17) | NULL | Existing field - moved to BookEdition |
| cover_image_url | TEXT | NULL | Existing field - moved to BookEdition |
| **normalized_title** | VARCHAR(500) | NULL | **NEW** - Lowercase, no punctuation for fuzzy matching |
| **primary_author** | VARCHAR(200) | NULL | **NEW** - First/primary author for fuzzy matching |
| **subtitle** | VARCHAR(500) | NULL | **NEW** - Book subtitle if present |
| **language** | VARCHAR(10) | NULL | **NEW** - ISO 639-1 language code (e.g., 'en', 'es') |
| **publisher** | VARCHAR(200) | NULL | **NEW** - Publishing house |
| **publication_date** | DATE | NULL | **NEW** - Original publication date |
| **page_count** | INTEGER | NULL, CHECK (page_count > 0) | **NEW** - Number of pages |
| **description** | TEXT | NULL | **NEW** - Book description/synopsis |
| **categories** | TEXT[] | NULL | **NEW** - Array of categories/genres |
| **fingerprint** | VARCHAR(64) | NULL, INDEX | **NEW** - SHA-256 of normalized_title + primary_author for dedup |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Existing field |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Existing field |

**Validation Rules**:
- `title`: Length 1-500 characters
- `normalized_title`: Computed on insert/update via trigger
- `primary_author`: Extracted from first author in `author` field
- `page_count`: Must be positive integer if provided
- `language`: Must be valid ISO 639-1 code if provided
- `fingerprint`: Computed on insert/update: `SHA256(normalized_title + '||' + primary_author + '||' + YEAR(publication_date))`

**Immutability**: After creation, Book records should NOT be directly updated by users. Use ReadingEntryOverride for per-user modifications.

**Business Rules**:
- Books are created either from API provider data or manual user entry
- One Book can have multiple BookEditions (different formats, ISBNs)
- Books are NOT deleted - they remain as canonical references
- Duplicate prevention: Check fingerprint + fuzzy matching before creating new Book

---

### 2. BookEdition (NEW)

**Purpose**: Edition-specific data (ISBN, format, cover image) for a canonical Book. One book can have multiple editions.

**Table**: `book_editions` (new)

**Schema**:
```sql
CREATE TABLE book_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  isbn_10 VARCHAR(10) NULL,
  isbn_13 VARCHAR(13) NULL,
  edition VARCHAR(100) NULL,
  format VARCHAR(50) NULL, -- 'hardcover', 'paperback', 'ebook', 'audiobook'
  cover_image_url TEXT NULL,
  provider_id VARCHAR(100) NULL, -- External API identifier (e.g., Google Books ID)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_isbn_13 UNIQUE (isbn_13),
  CONSTRAINT unique_isbn_10 UNIQUE (isbn_10),
  CONSTRAINT check_isbn_10_format CHECK (
    isbn_10 IS NULL OR isbn_10 ~ '^[0-9]{9}[0-9X]$'
  ),
  CONSTRAINT check_isbn_13_format CHECK (
    isbn_13 IS NULL OR isbn_13 ~ '^97[89][0-9]{10}$'
  ),
  CONSTRAINT check_has_isbn CHECK (
    isbn_10 IS NOT NULL OR isbn_13 IS NOT NULL OR provider_id IS NOT NULL
  )
);

CREATE INDEX book_editions_book_id_idx ON book_editions(book_id);
CREATE INDEX book_editions_isbn_13_idx ON book_editions(isbn_13);
CREATE INDEX book_editions_isbn_10_idx ON book_editions(isbn_10);
CREATE INDEX book_editions_provider_id_idx ON book_editions(provider_id);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| book_id | UUID | FK books(id), NOT NULL | Parent book |
| isbn_10 | VARCHAR(10) | UNIQUE, PATTERN | ISBN-10 format |
| isbn_13 | VARCHAR(13) | UNIQUE, PATTERN | ISBN-13 format (preferred) |
| edition | VARCHAR(100) | NULL | Edition string (e.g., "1st Edition", "Revised") |
| format | VARCHAR(50) | NULL, ENUM | Book format |
| cover_image_url | TEXT | NULL | URL to cover image |
| provider_id | VARCHAR(100) | INDEX | Provider-specific ID for lookups |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Validation Rules**:
- ISBN-10: 10 digits, last character can be 'X' (e.g., "0306406152")
- ISBN-13: 13 digits, must start with 978 or 979 (e.g., "9780306406157")
- At least one of: isbn_10, isbn_13, or provider_id must be present
- format: Must be one of: 'hardcover', 'paperback', 'ebook', 'audiobook', 'audio CD', or NULL

**Business Rules**:
- Prevent duplicate ISBNs (UNIQUE constraints)
- When user selects search result, create BookEdition if ISBN doesn't exist
- If ISBN exists, link to existing Book (duplicate detected)
- Prefer ISBN-13 over ISBN-10 for all comparisons

---

### 3. BookMetadataSource (NEW)

**Purpose**: Provenance tracking for external API data. Enables accuracy auditing (SC-007), data refresh, and GDPR compliance.

**Table**: `book_metadata_sources` (new)

**Schema**:
```sql
CREATE TABLE book_metadata_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_edition_id UUID NOT NULL REFERENCES book_editions(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google_books', 'open_library'
  provider_request_id VARCHAR(200) NULL, -- For debugging with provider support
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etag VARCHAR(100) NULL, -- HTTP ETag for cache invalidation
  payload_hash VARCHAR(64) NULL, -- SHA-256 of raw_payload for change detection
  raw_payload JSONB NOT NULL, -- Full API response for forensics
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_provider CHECK (
    provider IN ('google_books', 'open_library', 'manual')
  )
);

CREATE INDEX book_metadata_sources_edition_idx ON book_metadata_sources(book_edition_id);
CREATE INDEX book_metadata_sources_provider_idx ON book_metadata_sources(provider);
CREATE INDEX book_metadata_sources_fetched_at_idx ON book_metadata_sources(fetched_at);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| book_edition_id | UUID | FK book_editions(id), NOT NULL | Source book edition |
| provider | VARCHAR(50) | NOT NULL, CHECK | Provider name |
| provider_request_id | VARCHAR(200) | NULL | Provider's request ID for support |
| fetched_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When data was fetched |
| etag | VARCHAR(100) | NULL | HTTP ETag for If-None-Match |
| payload_hash | VARCHAR(64) | NULL | SHA-256 of raw_payload |
| raw_payload | JSONB | NOT NULL | Complete API response |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |

**Validation Rules**:
- provider: Must be 'google_books', 'open_library', or 'manual'
- raw_payload: Must be valid JSON
- payload_hash: Computed on insert as SHA-256(raw_payload)

**Business Rules**:
- Create on every API fetch (even if data unchanged)
- Retention: 90 days (per FR-016), then auto-delete
- Used for SC-007 accuracy auditing (compare raw_payload to displayed data)
- Used for refresh operations (fetch new data and compare ETags)

**Data Retention**:
```sql
-- Automated cleanup job (daily cron)
DELETE FROM book_metadata_sources
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

### 4. ReadingEntryOverride (NEW)

**Purpose**: Per-user field modifications to book metadata. Preserves canonical data integrity while allowing personalization.

**Table**: `reading_entry_overrides` (new)

**Schema**:
```sql
CREATE TABLE reading_entry_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL, -- 'title', 'author', 'page_count', etc.
  override_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_override_per_field UNIQUE (reading_entry_id, field_name),
  CONSTRAINT check_field_name CHECK (
    field_name IN (
      'title', 'author', 'subtitle', 'page_count', 'publisher',
      'publication_date', 'description', 'language', 'edition'
    )
  )
);

CREATE INDEX reading_entry_overrides_reading_entry_idx ON reading_entry_overrides(reading_entry_id);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| reading_entry_id | UUID | FK reading_entries(id), NOT NULL | User's reading entry |
| field_name | VARCHAR(50) | NOT NULL, CHECK | Field being overridden |
| override_value | TEXT | NOT NULL | User's custom value |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Override creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification |

**Validation Rules**:
- field_name: Must be one of allowed fields (see CHECK constraint)
- override_value: Must be valid for field type (validated in application layer)
- One override per field per reading entry

**Business Rules**:
- Created when user edits auto-populated field before saving
- Also created when user manually edits book after creation
- UI hydration: Display override_value if present, else canonical book value
- Does NOT modify canonical Book record
- Tied to reading_entry lifecycle (deleted when reading entry deleted)

**UI Hydration Logic**:
```javascript
function getDisplayedBookData(readingEntry, book) {
  const overrides = readingEntry.overrides || [];
  const displayData = { ...book };

  for (const override of overrides) {
    displayData[override.field_name] = override.override_value;
  }

  return displayData;
}
```

---

### 5. BookSearchCache (NEW)

**Purpose**: PostgreSQL Layer 2 cache for search results. Complements Redis L1 cache with longer retention.

**Table**: `book_search_cache` (new)

**Schema**:
```sql
CREATE TABLE book_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_key VARCHAR(200) NOT NULL, -- Hash of normalized query params
  provider VARCHAR(50) NOT NULL,
  result_count INTEGER NOT NULL,
  results JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_search_key UNIQUE (search_key, provider),
  CONSTRAINT check_provider CHECK (
    provider IN ('google_books', 'open_library')
  )
);

CREATE INDEX book_search_cache_expiry_idx ON book_search_cache(expires_at);
CREATE INDEX book_search_cache_key_idx ON book_search_cache(search_key, provider);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| search_key | VARCHAR(200) | NOT NULL, UNIQUE (with provider) | SHA-256 of query params |
| provider | VARCHAR(50) | NOT NULL, CHECK | Provider used for search |
| result_count | INTEGER | NOT NULL | Number of results |
| results | JSONB | NOT NULL | Array of search result objects |
| expires_at | TIMESTAMPTZ | NOT NULL | Cache expiration |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Cache entry creation |

**Validation Rules**:
- search_key: SHA-256 hash of `{query, type, filters}` (normalized)
- provider: Must be 'google_books' or 'open_library'
- expires_at: created_at + 30 days (per approved TTL)
- results: Must be valid JSON array

**Business Rules**:
- TTL: 30 days (long retention for low-traffic scenario)
- Cleanup: Daily cron job deletes expired entries
- Key generation: `SHA256(JSON.stringify(sortedQueryParams))`
- Used as fallback when Redis (L1) unavailable

**Key Generation Example**:
```javascript
function generateSearchKey(query, type, filters = {}) {
  const normalized = {
    query: query.toLowerCase().trim(),
    type,
    filters: sortObject(filters)
  };
  const json = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(json).digest('hex');
}
```

**Cleanup Job**:
```sql
-- Daily cron (e.g., 3 AM)
DELETE FROM book_search_cache
WHERE expires_at < NOW();
```

---

## Relationships

### Book → BookEdition (1:N)
- One Book can have multiple editions (hardcover, paperback, different ISBNs)
- CASCADE DELETE: If Book deleted, all editions deleted
- Foreign Key: `book_editions.book_id → books.id`

### BookEdition → BookMetadataSource (1:N)
- One edition can have multiple metadata snapshots over time
- CASCADE DELETE: If edition deleted, all metadata sources deleted
- Foreign Key: `book_metadata_sources.book_edition_id → book_editions.id`

### ReadingEntry → ReadingEntryOverride (1:N)
- One reading entry can have multiple field overrides
- CASCADE DELETE: If reading entry deleted, all overrides deleted
- Foreign Key: `reading_entry_overrides.reading_entry_id → reading_entries.id`

### BookSearchCache (Independent)
- No foreign key relationships
- Self-contained query cache
- Cleaned up based on expiration time

---

## State Transitions

### Book Creation Flow

```
API Search Result Selected
  ↓
Check Duplicate (ISBN → Fuzzy)
  ↓
Duplicate Found?
  ├─ YES → Link to Existing Book
  │         Create BookEdition (if new ISBN)
  │         Create BookMetadataSource
  │         Create ReadingEntry
  │
  └─ NO  → Create New Book
            Create BookEdition
            Create BookMetadataSource
            Create ReadingEntry
```

### User Override Flow

```
User Edits Field in UI
  ↓
Check if ReadingEntryOverride Exists
  ├─ YES → Update override_value
  │         Update updated_at
  │
  └─ NO  → Create ReadingEntryOverride
            Set field_name, override_value
```

### Cache Lifecycle

```
Search Request
  ↓
Check Redis (L1)
  ↓ MISS
Check PostgreSQL (L2)
  ↓ MISS
Fetch from Provider API
  ↓
Store in PostgreSQL (30d TTL)
  ↓
Store in Redis (12h TTL)
  ↓
Return Results

Expiration:
  Redis: Auto-expire after 12h
  PostgreSQL: Daily cron deletes WHERE expires_at < NOW()
```

---

## Indexes & Performance

### Critical Indexes

**Duplicate Detection**:
- `book_editions(isbn_13)` - UNIQUE, B-tree
- `book_editions(isbn_10)` - UNIQUE, B-tree
- `books(fingerprint)` - B-tree
- `books(normalized_title)` - GIN trigram
- `books(primary_author)` - GIN trigram

**Search & Lookup**:
- `book_search_cache(search_key, provider)` - UNIQUE B-tree
- `book_search_cache(expires_at)` - B-tree (for cleanup)
- `book_editions(provider_id)` - B-tree

**Relationships**:
- `book_editions(book_id)` - B-tree
- `book_metadata_sources(book_edition_id)` - B-tree
- `reading_entry_overrides(reading_entry_id)` - B-tree

### Query Performance Targets

| Operation | Target | Index Used |
|-----------|--------|------------|
| ISBN lookup | <1ms | book_editions(isbn_13) |
| Fuzzy title match | <50ms | books(normalized_title) trigram |
| Cache lookup | <5ms | book_search_cache(search_key, provider) |
| Override hydration | <10ms | reading_entry_overrides(reading_entry_id) |

---

## Migration Strategy

### Migration 003: Book Search Tables

```sql
-- File: backend/migrations/003_book_search_tables.sql

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extend books table
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS normalized_title VARCHAR(500),
  ADD COLUMN IF NOT EXISTS primary_author VARCHAR(200),
  ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500),
  ADD COLUMN IF NOT EXISTS language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS publisher VARCHAR(200),
  ADD COLUMN IF NOT EXISTS publication_date DATE,
  ADD COLUMN IF NOT EXISTS page_count INTEGER CHECK (page_count > 0),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[],
  ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);

-- Indexes for fuzzy search
CREATE INDEX IF NOT EXISTS book_normalized_title_trgm_idx
  ON books USING gin (normalized_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS book_primary_author_trgm_idx
  ON books USING gin (primary_author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS book_fingerprint_idx ON books(fingerprint);

-- Create book_editions table
CREATE TABLE IF NOT EXISTS book_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  isbn_10 VARCHAR(10) NULL,
  isbn_13 VARCHAR(13) NULL,
  edition VARCHAR(100) NULL,
  format VARCHAR(50) NULL,
  cover_image_url TEXT NULL,
  provider_id VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_isbn_13 UNIQUE (isbn_13),
  CONSTRAINT unique_isbn_10 UNIQUE (isbn_10),
  CONSTRAINT check_isbn_10_format CHECK (
    isbn_10 IS NULL OR isbn_10 ~ '^[0-9]{9}[0-9X]$'
  ),
  CONSTRAINT check_isbn_13_format CHECK (
    isbn_13 IS NULL OR isbn_13 ~ '^97[89][0-9]{10}$'
  ),
  CONSTRAINT check_has_isbn CHECK (
    isbn_10 IS NOT NULL OR isbn_13 IS NOT NULL OR provider_id IS NOT NULL
  )
);

CREATE INDEX book_editions_book_id_idx ON book_editions(book_id);
CREATE INDEX book_editions_isbn_13_idx ON book_editions(isbn_13);
CREATE INDEX book_editions_isbn_10_idx ON book_editions(isbn_10);
CREATE INDEX book_editions_provider_id_idx ON book_editions(provider_id);

-- Create book_metadata_sources table
CREATE TABLE IF NOT EXISTS book_metadata_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_edition_id UUID NOT NULL REFERENCES book_editions(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_request_id VARCHAR(200) NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etag VARCHAR(100) NULL,
  payload_hash VARCHAR(64) NULL,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_provider CHECK (
    provider IN ('google_books', 'open_library', 'manual')
  )
);

CREATE INDEX book_metadata_sources_edition_idx ON book_metadata_sources(book_edition_id);
CREATE INDEX book_metadata_sources_provider_idx ON book_metadata_sources(provider);
CREATE INDEX book_metadata_sources_fetched_at_idx ON book_metadata_sources(fetched_at);

-- Create reading_entry_overrides table
CREATE TABLE IF NOT EXISTS reading_entry_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  override_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_override_per_field UNIQUE (reading_entry_id, field_name),
  CONSTRAINT check_field_name CHECK (
    field_name IN (
      'title', 'author', 'subtitle', 'page_count', 'publisher',
      'publication_date', 'description', 'language', 'edition'
    )
  )
);

CREATE INDEX reading_entry_overrides_reading_entry_idx ON reading_entry_overrides(reading_entry_id);

-- Create book_search_cache table
CREATE TABLE IF NOT EXISTS book_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_key VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  result_count INTEGER NOT NULL,
  results JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_search_key UNIQUE (search_key, provider),
  CONSTRAINT check_provider CHECK (
    provider IN ('google_books', 'open_library')
  )
);

CREATE INDEX book_search_cache_expiry_idx ON book_search_cache(expires_at);
CREATE INDEX book_search_cache_key_idx ON book_search_cache(search_key, provider);

COMMIT;
```

### Rollback Strategy

```sql
-- File: backend/migrations/003_book_search_tables_rollback.sql

BEGIN;

-- Drop new tables (CASCADE will remove FKs)
DROP TABLE IF EXISTS book_search_cache CASCADE;
DROP TABLE IF EXISTS reading_entry_overrides CASCADE;
DROP TABLE IF EXISTS book_metadata_sources CASCADE;
DROP TABLE IF EXISTS book_editions CASCADE;

-- Remove added columns from books
ALTER TABLE books
  DROP COLUMN IF EXISTS normalized_title,
  DROP COLUMN IF EXISTS primary_author,
  DROP COLUMN IF EXISTS subtitle,
  DROP COLUMN IF EXISTS language,
  DROP COLUMN IF EXISTS publisher,
  DROP COLUMN IF EXISTS publication_date,
  DROP COLUMN IF EXISTS page_count,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS categories,
  DROP COLUMN IF EXISTS fingerprint;

-- Drop indexes
DROP INDEX IF EXISTS book_normalized_title_trgm_idx;
DROP INDEX IF EXISTS book_primary_author_trgm_idx;
DROP INDEX IF EXISTS book_fingerprint_idx;

COMMIT;
```

---

## Model Classes

### JavaScript Model Interfaces

```javascript
// backend/src/models/book-edition.js
class BookEdition {
  static async create({ bookId, isbn10, isbn13, edition, format, coverImageUrl, providerId }) {
    // Create new edition
  }

  static async findByISBN(isbn) {
    // Find edition by ISBN-10 or ISBN-13
  }

  static async findByProviderId(provider, providerId) {
    // Find edition by provider-specific ID
  }
}

// backend/src/models/book-metadata-source.js
class BookMetadataSource {
  static async create({ bookEditionId, provider, rawPayload, etag, providerRequestId }) {
    // Store API provenance
  }

  static async findByEdition(bookEditionId) {
    // Get all metadata sources for edition
  }
}

// backend/src/models/reading-entry-override.js
class ReadingEntryOverride {
  static async create({ readingEntryId, fieldName, overrideValue }) {
    // Create or update override
  }

  static async findByReadingEntry(readingEntryId) {
    // Get all overrides for entry
  }

  static async hydrateBookData(readingEntry, book) {
    // Merge overrides with canonical book data
  }
}

// backend/src/models/book-search-cache.js
class BookSearchCache {
  static async get(searchKey, provider) {
    // Get cached results if not expired
  }

  static async set(searchKey, provider, results, ttlSeconds) {
    // Store search results with expiration
  }

  static async cleanExpired() {
    // Remove expired cache entries
  }
}
```

---

## Data Integrity Constraints

### Triggers

**Auto-compute normalized_title and fingerprint**:
```sql
CREATE OR REPLACE FUNCTION update_book_normalized_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize title for fuzzy search
  NEW.normalized_title := LOWER(REGEXP_REPLACE(NEW.title, '[^\w\s]', '', 'g'));

  -- Extract primary author (first author before comma or semicolon)
  NEW.primary_author := SPLIT_PART(NEW.author, ',', 1);
  NEW.primary_author := SPLIT_PART(NEW.primary_author, ';', 1);
  NEW.primary_author := TRIM(NEW.primary_author);

  -- Compute fingerprint
  NEW.fingerprint := ENCODE(
    DIGEST(
      CONCAT(
        COALESCE(NEW.normalized_title, ''),
        '||',
        COALESCE(NEW.primary_author, ''),
        '||',
        COALESCE(EXTRACT(YEAR FROM NEW.publication_date)::TEXT, '')
      ),
      'sha256'
    ),
    'hex'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_normalized_fields
  BEFORE INSERT OR UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_book_normalized_fields();
```

**Auto-compute payload_hash**:
```sql
CREATE OR REPLACE FUNCTION update_payload_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.payload_hash := ENCODE(
    DIGEST(NEW.raw_payload::TEXT, 'sha256'),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payload_hash
  BEFORE INSERT OR UPDATE ON book_metadata_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_payload_hash();
```

---

## Testing Fixtures

### Example Data

```javascript
// Test fixture: Book with multiple editions
const testBook = {
  title: '1984',
  author: 'George Orwell',
  normalized_title: '1984',
  primary_author: 'George Orwell',
  language: 'en',
  publisher: 'Secker & Warburg',
  publication_date: '1949-06-08',
  page_count: 328,
  description: 'A dystopian social science fiction novel...',
  categories: ['Fiction', 'Dystopian', 'Political Fiction']
};

const testEditions = [
  {
    book_id: testBook.id,
    isbn_13: '9780451524935',
    format: 'paperback',
    edition: 'Signet Classic Edition'
  },
  {
    book_id: testBook.id,
    isbn_13: '9780141036144',
    format: 'hardcover',
    edition: 'Penguin Modern Classics'
  }
];
```

---

**Data Model Status**: ✅ **COMPLETE**
**Next**: Generate API contracts (contracts/book-search-api.yaml)
**Date**: 2025-10-29
