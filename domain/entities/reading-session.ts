/**
 * ReadingSession Entity
 *
 * Represents an individual reading session with start and end times.
 * Sessions can be in-progress (no endTime) or completed.
 * Multiple sessions aggregate into daily ReadingActivity records.
 */
export interface ReadingSession {
  id: string;
  userId: string;
  bookId?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number; // Calculated field, can be null for in-progress sessions
  pagesRead?: number; // Optional: pages read during this session
  notes?: string; // Optional: notes about the reading session
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for starting a new reading session
 */
export interface StartSessionInput {
  userId: string;
  bookId?: string;
}

/**
 * Input for ending a reading session
 */
export interface EndSessionInput {
  sessionId: string;
  userId: string;
  pagesRead?: number;
  notes?: string;
}

/**
 * Input for getting user sessions
 */
export interface GetSessionsInput {
  userId: string;
  bookId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Session statistics for a given period
 */
export interface SessionStatistics {
  totalSessions: number;
  totalMinutes: number;
  totalPages: number;
  averageSessionLength: number;
  longestSession: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
}