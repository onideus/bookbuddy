-- Migration 003: Book Search Tables
-- Feature: 002-book-api-search
-- Purpose: Add support for external book API search, edition tracking, and user-specific overrides

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extend books table with new search-related fields
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

-- Indexes for fuzzy search using trigram similarity
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

CREATE INDEX IF NOT EXISTS book_editions_book_id_idx ON book_editions(book_id);
CREATE INDEX IF NOT EXISTS book_editions_isbn_13_idx ON book_editions(isbn_13);
CREATE INDEX IF NOT EXISTS book_editions_isbn_10_idx ON book_editions(isbn_10);
CREATE INDEX IF NOT EXISTS book_editions_provider_id_idx ON book_editions(provider_id);

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

CREATE INDEX IF NOT EXISTS book_metadata_sources_edition_idx ON book_metadata_sources(book_edition_id);
CREATE INDEX IF NOT EXISTS book_metadata_sources_provider_idx ON book_metadata_sources(provider);
CREATE INDEX IF NOT EXISTS book_metadata_sources_fetched_at_idx ON book_metadata_sources(fetched_at);

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

CREATE INDEX IF NOT EXISTS reading_entry_overrides_reading_entry_idx ON reading_entry_overrides(reading_entry_id);

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

CREATE INDEX IF NOT EXISTS book_search_cache_expiry_idx ON book_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS book_search_cache_key_idx ON book_search_cache(search_key, provider);

-- Create trigger function for auto-computing normalized fields and fingerprint
CREATE OR REPLACE FUNCTION update_book_normalized_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize title for fuzzy search (lowercase, remove punctuation)
  NEW.normalized_title := LOWER(REGEXP_REPLACE(NEW.title, '[^\w\s]', '', 'g'));

  -- Extract primary author (first author before comma or semicolon)
  NEW.primary_author := SPLIT_PART(NEW.author, ',', 1);
  NEW.primary_author := SPLIT_PART(NEW.primary_author, ';', 1);
  NEW.primary_author := TRIM(NEW.primary_author);

  -- Compute fingerprint for duplicate detection
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

-- Create trigger for books table
DROP TRIGGER IF EXISTS trigger_update_book_normalized_fields ON books;
CREATE TRIGGER trigger_update_book_normalized_fields
  BEFORE INSERT OR UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_book_normalized_fields();

-- Create trigger function for auto-computing payload hash
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

-- Create trigger for book_metadata_sources table
DROP TRIGGER IF EXISTS trigger_update_payload_hash ON book_metadata_sources;
CREATE TRIGGER trigger_update_payload_hash
  BEFORE INSERT OR UPDATE ON book_metadata_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_payload_hash();

COMMIT;
