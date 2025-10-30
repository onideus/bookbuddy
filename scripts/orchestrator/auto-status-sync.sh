#!/usr/bin/env bash
# Auto Status Sync - Automatically update tasks.md from git commits
# Run this after each commit or as a git hook

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_ROLE_FILE="$PROJECT_ROOT/.claude/agent-role.local"

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

get_agent_role() {
    if [[ -f "$AGENT_ROLE_FILE" ]]; then
        cat "$AGENT_ROLE_FILE"
    else
        echo "unknown-agent"
    fi
}

# Extract spec ID from current branch or event store
get_spec_id() {
    local current_branch
    current_branch="$(git branch --show-current)"

    # Try pattern matching first
    if [[ "$current_branch" =~ feature/([^/]+) ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    # If that fails, try querying event store
    local event_db="$PROJECT_ROOT/.orchestrator/events.db"
    if [[ -f "$event_db" ]]; then
        # Query event store for feature matching this branch
        local spec_id
        spec_id=$(sqlite3 "$event_db" "
            SELECT f.spec_id
            FROM features f
            JOIN agents a ON f.id = a.feature_id
            WHERE a.branch_name = '$current_branch'
            AND f.status = 'in-progress'
            LIMIT 1;
        " 2>/dev/null)

        if [[ -n "$spec_id" ]]; then
            echo "$spec_id"
            return 0
        fi
    fi

    # No spec ID found
    echo ""
    return 1
}

# Update tasks.md with latest commit info
update_tasks_md() {
    local spec_id="$1"
    local agent_role="$2"
    local commit_hash="$3"
    local commit_message="$4"

    # Find tasks.md - check multiple possible locations
    local tasks_file=""
    if [[ -f "$PROJECT_ROOT/.specify/tasks.md" ]]; then
        tasks_file="$PROJECT_ROOT/.specify/tasks.md"
    elif [[ -f "$PROJECT_ROOT/specs/$spec_id/tasks.md" ]]; then
        tasks_file="$PROJECT_ROOT/specs/$spec_id/tasks.md"
    else
        log_warning "tasks.md not found"
        return 1
    fi

    log_info "Updating: $tasks_file"

    # Format status line
    local status_line="- $agent_role → $commit_hash — $commit_message"

    # Determine which section to update based on agent role
    local section_marker=""
    case "$agent_role" in
        implementor-a|Implementor-A)
            section_marker="### Implementor-A"
            ;;
        implementor-b|Implementor-B)
            section_marker="### Implementor-B"
            ;;
        implementor-c|Implementor-C)
            section_marker="### Implementor-C"
            ;;
        overseer)
            section_marker="### Overseer"
            ;;
        *)
            log_warning "Unknown agent role: $agent_role"
            section_marker="### Status Updates"
            ;;
    esac

    # Check if section exists
    if ! grep -q "$section_marker" "$tasks_file"; then
        log_warning "Section not found: $section_marker"
        log_info "Manual update needed:"
        echo "$status_line"
        return 1
    fi

    # Create backup
    cp "$tasks_file" "${tasks_file}.backup"

    # Use awk to insert status after the section marker
    awk -v section="$section_marker" -v status="$status_line" '
        $0 ~ section {
            print
            # Skip any existing placeholder line
            getline
            if ($0 !~ /^\*Append/) {
                print
            }
            # Insert new status
            print status
            next
        }
        { print }
    ' "${tasks_file}.backup" > "$tasks_file"

    rm "${tasks_file}.backup"

    log_success "Status updated in tasks.md"
    return 0
}

# Update state files
update_state_file() {
    local agent_role="$1"
    local commit_hash="$2"
    local commit_message="$3"

    # Determine state file
    local state_file=""
    if [[ "$agent_role" == "overseer" ]]; then
        state_file="$PROJECT_ROOT/state/overseer.md"
    elif [[ "$agent_role" =~ implementor-([a-c]) ]]; then
        local area="${BASH_REMATCH[1]}"
        case "$area" in
            a) state_file="$PROJECT_ROOT/state/impl-data.md" ;;
            b) state_file="$PROJECT_ROOT/state/impl-api.md" ;;
            c) state_file="$PROJECT_ROOT/state/impl-ui.md" ;;
        esac
    fi

    if [[ -z "$state_file" ]] || [[ ! -f "$state_file" ]]; then
        return 0
    fi

    # Append update to status section
    {
        echo ""
        echo "**Update $(date +'%Y-%m-%d %H:%M')**: $commit_hash"
        echo "- $commit_message"
    } >> "$state_file"

    log_success "State file updated: $state_file"
}

# Main function
main() {
    cd "$PROJECT_ROOT"

    # Get current branch and agent info
    local spec_id
    spec_id="$(get_spec_id)"

    if [[ -z "$spec_id" ]]; then
        log_warning "Not on a feature branch, skipping status sync"
        exit 0
    fi

    local agent_role
    agent_role="$(get_agent_role)"

    # Get latest commit info
    local commit_hash
    commit_hash="$(git rev-parse --short HEAD)"

    local commit_message
    commit_message="$(git log -1 --pretty=%s)"

    log_info "Syncing status for: $agent_role"
    log_info "Commit: $commit_hash - $commit_message"

    # Update tasks.md
    if update_tasks_md "$spec_id" "$agent_role" "$commit_hash" "$commit_message"; then
        log_success "tasks.md updated"
    fi

    # Update state file
    update_state_file "$agent_role" "$commit_hash" "$commit_message"

    log_success "Status sync complete!"
}

main "$@"
