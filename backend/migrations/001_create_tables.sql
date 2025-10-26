-- Migration: 001_create_tables
-- Description: Create core tables for Reading Journey Tracker
-- Date: 2025-10-26

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Books table: Shared book metadata across all readers
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  author VARCHAR(200) NOT NULL,
  edition VARCHAR(100),
  isbn VARCHAR(17),
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT books_title_length CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 500),
  CONSTRAINT books_author_length CHECK (LENGTH(author) >= 1 AND LENGTH(author) <= 200),
  CONSTRAINT books_edition_length CHECK (edition IS NULL OR (LENGTH(edition) >= 1 AND LENGTH(edition) <= 100)),
  CONSTRAINT books_isbn_format CHECK (isbn IS NULL OR isbn ~ '^[0-9-]{10,17}$')
);

-- Unique index for book identity (handles NULL edition)
CREATE UNIQUE INDEX books_unique_book_idx ON books (title, author, COALESCE(edition, ''));

-- Reader profiles: User preferences and settings
CREATE TABLE IF NOT EXISTS reader_profiles (
  id UUID PRIMARY KEY,
  default_sort VARCHAR(20),
  notification_preferences JSONB,
  accessibility_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT reader_profiles_valid_sort CHECK (
    default_sort IS NULL OR
    default_sort IN ('title_asc', 'author_asc', 'updated_desc', 'rating_desc')
  )
);

-- Reading entries: Reader's relationship to a book
CREATE TABLE IF NOT EXISTS reading_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES reader_profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  status VARCHAR(10) NOT NULL,
  rating SMALLINT,
  reflection_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT reading_entries_unique_reader_book UNIQUE (reader_id, book_id),
  CONSTRAINT reading_entries_valid_status CHECK (status IN ('TO_READ', 'READING', 'FINISHED')),
  CONSTRAINT reading_entries_valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT reading_entries_reflection_length CHECK (reflection_note IS NULL OR LENGTH(reflection_note) <= 2000),
  CONSTRAINT reading_entries_rating_only_finished CHECK (rating IS NULL OR status = 'FINISHED')
);

-- Progress updates: Notes for books in READING status
CREATE TABLE IF NOT EXISTS progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  page_or_chapter VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT progress_updates_note_length CHECK (LENGTH(note) >= 1 AND LENGTH(note) <= 1000),
  CONSTRAINT progress_updates_marker_length CHECK (page_or_chapter IS NULL OR LENGTH(page_or_chapter) <= 50)
);

-- Status transitions: Audit trail for status changes
CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  from_status VARCHAR(10),
  to_status VARCHAR(10) NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT status_transitions_valid_from CHECK (
    from_status IS NULL OR
    from_status IN ('TO_READ', 'READING', 'FINISHED')
  ),
  CONSTRAINT status_transitions_valid_to CHECK (to_status IN ('TO_READ', 'READING', 'FINISHED'))
);

-- Sessions table: For @fastify/session with PostgreSQL store
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_profiles_updated_at
  BEFORE UPDATE ON reader_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_entries_updated_at
  BEFORE UPDATE ON reading_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE books IS 'Shared book metadata across all readers';
COMMENT ON TABLE reader_profiles IS 'User preferences and accessibility settings';
COMMENT ON TABLE reading_entries IS 'Per-reader book status, ratings, and reflections';
COMMENT ON TABLE progress_updates IS 'Reading progress notes for books in READING status';
COMMENT ON TABLE status_transitions IS 'Audit trail for status changes';
COMMENT ON TABLE sessions IS 'Session storage for authentication';
