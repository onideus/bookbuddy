-- Rollback Migration 003: Book Search Tables
-- Feature: 002-book-api-search
-- Purpose: Rollback all changes from migration 003

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_payload_hash ON book_metadata_sources;
DROP TRIGGER IF EXISTS trigger_update_book_normalized_fields ON books;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_payload_hash();
DROP FUNCTION IF EXISTS update_book_normalized_fields();

-- Drop new tables (CASCADE will remove foreign keys)
DROP TABLE IF EXISTS book_search_cache CASCADE;
DROP TABLE IF EXISTS reading_entry_overrides CASCADE;
DROP TABLE IF EXISTS book_metadata_sources CASCADE;
DROP TABLE IF EXISTS book_editions CASCADE;

-- Remove added columns from books table
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

-- Note: We don't drop the pg_trgm extension as it might be used by other features

COMMIT;
