#!/usr/bin/env bash
# Event Store Management - Initialize and interact with SQLite event store

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/.orchestrator/events.db"
SCHEMA_PATH="$SCRIPT_DIR/event-store-schema.sql"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Initialize database
cmd_init() {
    log_info "Initializing event store database..."

    mkdir -p "$(dirname "$DB_PATH")"

    if [[ -f "$DB_PATH" ]]; then
        log_warning "Database already exists at: $DB_PATH"
        read -p "Reinitialize? This will DELETE all data (y/N): " confirm
        if [[ "$confirm" != "y" ]]; then
            log_info "Aborted"
            exit 0
        fi
        rm "$DB_PATH"
    fi

    sqlite3 "$DB_PATH" < "$SCHEMA_PATH"

    log_success "Event store initialized: $DB_PATH"
}

# Add a new feature
cmd_add_feature() {
    local spec_id="$1"
    local name="$2"
    local overseer_branch="${3:-feature/${spec_id}/overseer}"

    sqlite3 "$DB_PATH" <<EOF
INSERT INTO features (spec_id, name, overseer_branch)
VALUES ('$spec_id', '$name', '$overseer_branch');
EOF

    local feature_id
    feature_id=$(sqlite3 "$DB_PATH" "SELECT id FROM features WHERE spec_id='$spec_id';")

    # Add default agents
    for role in overseer implementor-a implementor-b implementor-c; do
        local branch="${overseer_branch}"
        if [[ "$role" != "overseer" ]]; then
            local area="${role##*-}"
            case "$area" in
                a) branch="feature/${spec_id}/impl-data" ;;
                b) branch="feature/${spec_id}/impl-api" ;;
                c) branch="feature/${spec_id}/impl-ui" ;;
            esac
        fi

        sqlite3 "$DB_PATH" <<EOF
INSERT INTO agents (role, feature_id, branch_name)
VALUES ('$role', $feature_id, '$branch');
EOF
    done

    log_success "Feature added: $spec_id"
}

# Log a task event
cmd_log_event() {
    local spec_id="$1"
    local agent_role="$2"
    local event_type="$3"
    local message="$4"
    local task_id="${5:-}"
    local commit_hash="${6:-}"

    local feature_id
    feature_id=$(sqlite3 "$DB_PATH" "SELECT id FROM features WHERE spec_id='$spec_id';" || echo "")

    if [[ -z "$feature_id" ]]; then
        log_warning "Feature not found: $spec_id"
        exit 1
    fi

    local agent_id
    agent_id=$(sqlite3 "$DB_PATH" "SELECT id FROM agents WHERE feature_id=$feature_id AND role='$agent_role';" || echo "")

    if [[ -z "$agent_id" ]]; then
        log_warning "Agent not found: $agent_role"
        exit 1
    fi

    sqlite3 "$DB_PATH" <<EOF
INSERT INTO task_events (feature_id, agent_id, event_type, task_id, commit_hash, message)
VALUES ($feature_id, $agent_id, '$event_type', '$task_id', '$commit_hash', '$message');
EOF

    log_success "Event logged: $event_type"
}

# Query recent events
cmd_recent_events() {
    local limit="${1:-20}"

    log_info "Recent events (last $limit):"
    echo ""

    sqlite3 -header -column "$DB_PATH" <<EOF
SELECT
    spec_id,
    role,
    event_type,
    task_id,
    substr(commit_hash, 1, 7) AS commit_sha,
    message,
    datetime(created_at, 'localtime') AS time
FROM v_recent_events
LIMIT $limit;
EOF
}

# Query feature status
cmd_feature_status() {
    local spec_id="${1:-}"

    if [[ -z "$spec_id" ]]; then
        log_info "All features:"
        echo ""
        sqlite3 -header -column "$DB_PATH" "SELECT * FROM v_feature_status ORDER BY feature_status, spec_id;"
    else
        log_info "Feature: $spec_id"
        echo ""
        sqlite3 -header -column "$DB_PATH" "SELECT * FROM v_feature_status WHERE spec_id='$spec_id';"
    fi
}

# Log a conflict
cmd_log_conflict() {
    local spec_id="$1"
    local agent_role="$2"
    local files="$3"
    local severity="${4:-warning}"

    local feature_id
    feature_id=$(sqlite3 "$DB_PATH" "SELECT id FROM features WHERE spec_id='$spec_id';")

    local agent_id
    agent_id=$(sqlite3 "$DB_PATH" "SELECT id FROM agents WHERE feature_id=$feature_id AND role='$agent_role';")

    sqlite3 "$DB_PATH" <<EOF
INSERT INTO conflicts (feature_id, agent_id, conflicting_files, severity)
VALUES ($feature_id, $agent_id, '$files', '$severity');
EOF

    log_warning "Conflict logged for $agent_role"
}

# Resolve a conflict
cmd_resolve_conflict() {
    local conflict_id="$1"
    local notes="${2:-Manually resolved}"

    sqlite3 "$DB_PATH" <<EOF
UPDATE conflicts
SET resolved = TRUE,
    resolved_at = CURRENT_TIMESTAMP,
    resolution_notes = '$notes'
WHERE id = $conflict_id;
EOF

    log_success "Conflict $conflict_id resolved"
}

# Export to markdown (for legacy compatibility)
cmd_export_markdown() {
    local spec_id="$1"
    local output_file="${2:-state/overseer.md}"

    log_info "Exporting feature $spec_id to $output_file..."

    # Generate markdown from database
    {
        echo "# Overseer State: Feature $spec_id"
        echo ""
        echo "**Generated from event store**: $(date)"
        echo ""

        echo "## Branch Status"
        echo ""
        sqlite3 -header -markdown "$DB_PATH" "SELECT * FROM v_feature_status WHERE spec_id='$spec_id';"

        echo ""
        echo "## Recent Events"
        echo ""
        sqlite3 -markdown "$DB_PATH" "SELECT role, event_type, message, created_at FROM v_recent_events WHERE spec_id='$spec_id' LIMIT 10;"

        echo ""
        echo "## Active Conflicts"
        echo ""
        local conflicts
        conflicts=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM conflicts c JOIN features f ON c.feature_id=f.id WHERE f.spec_id='$spec_id' AND c.resolved=FALSE;")

        if [[ "$conflicts" -gt 0 ]]; then
            sqlite3 -markdown "$DB_PATH" <<EOF
SELECT a.role, c.conflicting_files, c.detected_at
FROM conflicts c
JOIN features f ON c.feature_id = f.id
JOIN agents a ON c.agent_id = a.id
WHERE f.spec_id='$spec_id' AND c.resolved=FALSE;
EOF
        else
            echo "None"
        fi
    } > "$output_file"

    log_success "Markdown exported: $output_file"
}

# Main command dispatcher
main() {
    local command="${1:-}"

    if [[ ! -f "$DB_PATH" ]] && [[ "$command" != "init" ]]; then
        log_warning "Event store not initialized. Run: $0 init"
        exit 1
    fi

    case "$command" in
        init)
            cmd_init
            ;;
        add-feature)
            shift
            cmd_add_feature "$@"
            ;;
        log-event)
            shift
            cmd_log_event "$@"
            ;;
        recent)
            shift
            cmd_recent_events "$@"
            ;;
        status)
            shift
            cmd_feature_status "$@"
            ;;
        log-conflict)
            shift
            cmd_log_conflict "$@"
            ;;
        resolve-conflict)
            shift
            cmd_resolve_conflict "$@"
            ;;
        export)
            shift
            cmd_export_markdown "$@"
            ;;
        *)
            cat <<EOF
Event Store Management

Usage: $0 <command> [arguments]

Commands:
  init                                    Initialize event store database
  add-feature <spec-id> <name>           Add a new feature
  log-event <spec-id> <role> <type> <msg> [task-id] [commit]
                                          Log a task event
  recent [limit]                         Show recent events
  status [spec-id]                       Show feature status
  log-conflict <spec-id> <role> <files>  Log a conflict
  resolve-conflict <id> [notes]          Resolve a conflict
  export <spec-id> [output-file]         Export to markdown

Examples:
  $0 init
  $0 add-feature 003-reading-goals "Reading Goals Tracker"
  $0 log-event 003-reading-goals implementor-a task_completed "Migrations done" T001 abc1234
  $0 recent 10
  $0 status 003-reading-goals
  $0 export 003-reading-goals state/overseer.md
EOF
            exit 1
            ;;
    esac
}

main "$@"
