-- Migration: 002_create_indexes
-- Description: Create performance indexes for Reading Journey Tracker
-- Date: 2025-10-26

-- Indexes for reading_entries table (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_reading_entries_reader_status
  ON reading_entries(reader_id, status);

CREATE INDEX IF NOT EXISTS idx_reading_entries_updated
  ON reading_entries(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_entries_reader_rating
  ON reading_entries(reader_id, rating DESC)
  WHERE rating IS NOT NULL;

-- Indexes for progress_updates table
CREATE INDEX IF NOT EXISTS idx_progress_updates_entry
  ON progress_updates(reading_entry_id, created_at DESC);

-- Indexes for status_transitions table
CREATE INDEX IF NOT EXISTS idx_status_transitions_entry
  ON status_transitions(reading_entry_id, transitioned_at DESC);

-- Indexes for sessions table (TTL cleanup)
CREATE INDEX IF NOT EXISTS idx_sessions_expire
  ON sessions(expire);

-- Indexes for books table (search and lookup)
CREATE INDEX IF NOT EXISTS idx_books_title
  ON books(title);

CREATE INDEX IF NOT EXISTS idx_books_author
  ON books(author);

-- Comments for documentation
COMMENT ON INDEX idx_reading_entries_reader_status IS 'Optimize filtered lists by reader and status';
COMMENT ON INDEX idx_reading_entries_updated IS 'Optimize recent activity queries';
COMMENT ON INDEX idx_reading_entries_reader_rating IS 'Optimize Top Rated filter queries';
COMMENT ON INDEX idx_progress_updates_entry IS 'Optimize chronological progress note display';
COMMENT ON INDEX idx_status_transitions_entry IS 'Optimize status history queries';
COMMENT ON INDEX idx_sessions_expire IS 'Optimize session cleanup queries';
COMMENT ON INDEX idx_books_title IS 'Optimize book search by title';
COMMENT ON INDEX idx_books_author IS 'Optimize book search by author';
