-- Multi-Agent Event Store Schema
-- SQLite database for tracking coordination events

-- Feature tracking
CREATE TABLE IF NOT EXISTS features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    overseer_branch TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in-progress', -- in-progress, completed, archived
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Agent assignments
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL, -- overseer, implementor-a, implementor-b, implementor-c
    feature_id INTEGER NOT NULL,
    branch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, blocked, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feature_id) REFERENCES features(id)
);

-- Task events (append-only event log)
CREATE TABLE IF NOT EXISTS task_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- task_started, task_completed, task_blocked, status_update
    task_id TEXT, -- e.g., T001, T002
    commit_hash TEXT,
    message TEXT NOT NULL,
    metadata TEXT, -- JSON blob for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feature_id) REFERENCES features(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- PR tracking
CREATE TABLE IF NOT EXISTS pull_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    pr_number INTEGER,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, open, approved, merged, closed
    base_branch TEXT NOT NULL,
    head_branch TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    merged_at DATETIME,
    FOREIGN KEY (feature_id) REFERENCES features(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Conflict warnings
CREATE TABLE IF NOT EXISTS conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    conflicting_files TEXT NOT NULL, -- JSON array of file paths
    severity TEXT NOT NULL DEFAULT 'warning', -- warning, critical
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (feature_id) REFERENCES features(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Test results
CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    agent_id INTEGER,
    test_type TEXT NOT NULL, -- unit, integration, e2e
    commit_hash TEXT NOT NULL,
    status TEXT NOT NULL, -- passed, failed, skipped
    tests_total INTEGER,
    tests_passed INTEGER,
    tests_failed INTEGER,
    duration_ms INTEGER,
    logs_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feature_id) REFERENCES features(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Blockers
CREATE TABLE IF NOT EXISTS blockers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    blocker_type TEXT NOT NULL, -- dependency, conflict, external, technical
    description TEXT NOT NULL,
    blocking_agent_id INTEGER, -- which agent is blocked by this
    status TEXT NOT NULL DEFAULT 'active', -- active, resolved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolution_notes TEXT,
    FOREIGN KEY (feature_id) REFERENCES features(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (blocking_agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_events_feature ON task_events(feature_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_agent ON task_events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status ON pull_requests(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON blockers(status);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role, feature_id);

-- Views for easy querying

-- Active features with agent status
CREATE VIEW IF NOT EXISTS v_feature_status AS
SELECT
    f.spec_id,
    f.name,
    f.status AS feature_status,
    a.role,
    a.branch_name,
    a.status AS agent_status,
    COUNT(DISTINCT pr.id) AS prs_count,
    COUNT(DISTINCT CASE WHEN pr.status = 'merged' THEN pr.id END) AS prs_merged,
    COUNT(DISTINCT CASE WHEN c.resolved = FALSE THEN c.id END) AS active_conflicts,
    COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) AS active_blockers
FROM features f
LEFT JOIN agents a ON f.id = a.feature_id
LEFT JOIN pull_requests pr ON a.id = pr.agent_id
LEFT JOIN conflicts c ON a.id = c.agent_id
LEFT JOIN blockers b ON a.id = b.agent_id
GROUP BY f.id, a.id;

-- Recent task events
CREATE VIEW IF NOT EXISTS v_recent_events AS
SELECT
    f.spec_id,
    a.role,
    te.event_type,
    te.task_id,
    te.commit_hash,
    te.message,
    te.created_at
FROM task_events te
JOIN features f ON te.feature_id = f.id
JOIN agents a ON te.agent_id = a.id
ORDER BY te.created_at DESC
LIMIT 100;

-- Test results summary
CREATE VIEW IF NOT EXISTS v_test_summary AS
SELECT
    f.spec_id,
    tr.test_type,
    tr.status,
    tr.commit_hash,
    tr.tests_total,
    tr.tests_passed,
    tr.tests_failed,
    tr.created_at
FROM test_results tr
JOIN features f ON tr.feature_id = f.id
ORDER BY tr.created_at DESC;
