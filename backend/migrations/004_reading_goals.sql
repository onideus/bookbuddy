-- Migration 004: Reading Goals Tables
-- Feature: 003-reading-goals
-- Purpose: Add support for user-created reading goals with automatic progress tracking

BEGIN;

-- Main reading goals table
CREATE TABLE reading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reader_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0 AND target_count <= 9999),
  progress_count INTEGER NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  bonus_count INTEGER NOT NULL DEFAULT 0 CHECK (bonus_count >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
  deadline_at_utc TIMESTAMPTZ NOT NULL,
  deadline_timezone VARCHAR(50) NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rule constraints
  CONSTRAINT chk_progress_consistency CHECK (progress_count <= target_count + bonus_count),
  CONSTRAINT chk_bonus_calculation CHECK (bonus_count = GREATEST(0, progress_count - target_count)),
  CONSTRAINT chk_completed_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Junction table for book-goal associations (audit trail)
CREATE TABLE reading_goal_progress (
  goal_id UUID NOT NULL REFERENCES reading_goals(id) ON DELETE CASCADE,
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_from_state VARCHAR(20),
  PRIMARY KEY (goal_id, reading_entry_id)
);

-- Performance indexes for reading_goals
CREATE INDEX idx_reading_goals_user_status ON reading_goals(user_id, status);
CREATE INDEX idx_reading_goals_user_deadline ON reading_goals(user_id, deadline_at_utc);
CREATE INDEX idx_reading_goals_active_deadline ON reading_goals(status, deadline_at_utc) WHERE status = 'active';

-- Performance indexes for reading_goal_progress
CREATE INDEX idx_reading_goal_progress_entry ON reading_goal_progress(reading_entry_id);
CREATE INDEX idx_reading_goal_progress_goal ON reading_goal_progress(goal_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_goal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reading_goals_updated_at
  BEFORE UPDATE ON reading_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_goal_timestamp();

COMMIT;
