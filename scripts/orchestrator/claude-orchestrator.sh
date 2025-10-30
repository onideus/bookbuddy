#!/usr/bin/env bash
# Claude Multi-Agent Orchestrator CLI
# Automates branch creation, status tracking, and coordination workflows

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_ROLE_FILE="$PROJECT_ROOT/.claude/agent-role.local"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

get_agent_role() {
    if [[ -f "$AGENT_ROLE_FILE" ]]; then
        cat "$AGENT_ROLE_FILE"
    else
        echo "single-agent"
    fi
}

# Command: init-feature
# Creates overseer branch and implementor branches for a new feature
cmd_init_feature() {
    local spec_id="$1"

    if [[ -z "$spec_id" ]]; then
        log_error "Usage: claude-orchestrator init-feature <spec-id>"
        log_info "Example: claude-orchestrator init-feature 003-reading-goals"
        exit 1
    fi

    log_info "Initializing feature: $spec_id"

    # Ensure we're on main and up to date
    git fetch origin
    git checkout main
    git pull origin main

    # Create overseer branch
    local overseer_branch="feature/${spec_id}/overseer"
    log_info "Creating overseer branch: $overseer_branch"
    git checkout -b "$overseer_branch"

    # Create state directory
    mkdir -p "$PROJECT_ROOT/state"

    # Create overseer state file
    cat > "$PROJECT_ROOT/state/overseer.md" << EOF
# Overseer State: Feature $spec_id

**Feature**: $spec_id
**Overseer Branch**: $overseer_branch
**Created**: $(date +%Y-%m-%d)

## Branch Status

| Branch | Owner | Status | Last Update | Tests |
|--------|-------|--------|-------------|-------|
| impl-data | Implementor-A | 🔵 pending | - | - |
| impl-api | Implementor-B | 🔵 pending | - | - |
| impl-ui | Implementor-C | 🔵 pending | - | - |

## Known Blockers

- None

## Integration Test Results

Not run yet

## Task Assignments

See \`specs/$spec_id/tasks.md\` for detailed task breakdown.

### Implementor-A (Data Layer)
- Database migrations and models
- Data access layer

### Implementor-B (API Layer)
- Service layer and API routes
- Business logic

### Implementor-C (UI Layer)
- Frontend components and pages
- User interface

## Status Updates

*Implementors: Append updates here*

---
EOF

    # Commit state file
    git add state/overseer.md
    git commit -m "[$spec_id] Initialize overseer branch with state tracking"

    # Push overseer branch
    git push -u origin "$overseer_branch"

    log_success "Overseer branch created: $overseer_branch"

    # Create implementor branches
    for area in data api ui; do
        local impl_branch="feature/${spec_id}/impl-${area}"
        log_info "Creating implementor branch: $impl_branch"

        git checkout -b "$impl_branch"

        # Create implementor state file
        cat > "$PROJECT_ROOT/state/impl-${area}.md" << EOF
# Implementor State: impl-$area

## Current Work

*Track your current task here*

## Debugging Notes

- *Add debugging breadcrumbs as you work*

## Local Test Commands

\`\`\`bash
# Add commonly used test commands
npm test -- <specific test file>
\`\`\`

## Dependencies

- *Note any blockers or dependencies on other implementors*
EOF

        git add "state/impl-${area}.md"
        git commit -m "[$spec_id] Initialize impl-$area branch"
        git push -u origin "$impl_branch"

        log_success "Implementor branch created: $impl_branch"

        # Return to overseer branch for next iteration
        git checkout "$overseer_branch"
    done

    log_success "Feature $spec_id initialized successfully!"
    log_info "Next steps:"
    log_info "  1. Run /speckit.tasks to generate task breakdown"
    log_info "  2. Assign tasks to implementors in .specify/tasks.md"
    log_info "  3. Notify implementors to begin work"
}

# Command: sync-status
# Synchronizes status from git log to tasks.md
cmd_sync_status() {
    log_info "Syncing status from git log..."

    local current_branch
    current_branch="$(git branch --show-current)"

    # Extract spec ID from branch name
    local spec_id
    if [[ "$current_branch" =~ feature/([^/]+) ]]; then
        spec_id="${BASH_REMATCH[1]}"
    else
        log_error "Not on a feature branch. Cannot sync status."
        exit 1
    fi

    # Get latest commit info
    local commit_hash
    commit_hash="$(git rev-parse --short HEAD)"

    local commit_message
    commit_message="$(git log -1 --pretty=%B | head -n1)"

    local agent_role
    agent_role="$(get_agent_role)"

    # Format status update
    local status_line="- $agent_role → $commit_hash — $commit_message"

    log_info "Status update: $status_line"

    # Check if tasks.md exists
    if [[ -f "$PROJECT_ROOT/.specify/tasks.md" ]]; then
        # Append to Status Updates section
        if grep -q "### Status Updates" "$PROJECT_ROOT/.specify/tasks.md"; then
            # Add after the appropriate implementor section
            log_success "Status synced to .specify/tasks.md"
            log_info "Add this line to tasks.md:"
            echo "$status_line"
        else
            log_warning "Status Updates section not found in tasks.md"
            log_info "Add this line manually: $status_line"
        fi
    else
        log_warning "tasks.md not found at .specify/tasks.md"
        log_info "Status line to add: $status_line"
    fi
}

# Command: check-conflicts
# Dry-run rebase to detect conflicts before they happen
cmd_check_conflicts() {
    log_info "Checking for potential conflicts..."

    local current_branch
    current_branch="$(git branch --show-current)"

    # Extract spec ID and determine overseer branch
    local spec_id overseer_branch
    if [[ "$current_branch" =~ feature/([^/]+)/impl- ]]; then
        spec_id="${BASH_REMATCH[1]}"
        overseer_branch="feature/${spec_id}/overseer"
    else
        log_error "Not on an implementor branch. Cannot check conflicts."
        exit 1
    fi

    log_info "Current branch: $current_branch"
    log_info "Overseer branch: $overseer_branch"

    # Fetch latest
    git fetch origin

    # Check if branches have diverged
    local commits_behind
    commits_behind="$(git rev-list --count HEAD..origin/$overseer_branch 2>/dev/null || echo "0")"

    if [[ "$commits_behind" -eq 0 ]]; then
        log_success "✓ Up to date with overseer branch. No conflicts expected."
        return 0
    fi

    log_warning "Behind overseer branch by $commits_behind commit(s)"

    # Stash any uncommitted changes
    local stashed=false
    if ! git diff-index --quiet HEAD --; then
        log_info "Stashing uncommitted changes..."
        git stash push -m "orchestrator: temp stash for conflict check"
        stashed=true
    fi

    # Try dry-run merge
    log_info "Running conflict detection (dry-run)..."

    if git merge-tree "$(git merge-base HEAD origin/$overseer_branch)" HEAD "origin/$overseer_branch" | grep -q "^changed in both"; then
        log_error "⚠ CONFLICTS DETECTED!"
        log_info "Conflicting files:"
        git merge-tree "$(git merge-base HEAD origin/$overseer_branch)" HEAD "origin/$overseer_branch" | grep "^changed in both" | sed 's/changed in both://g'

        log_info "Recommendation: Coordinate with overseer before rebasing"

        # Restore stashed changes
        if [[ "$stashed" == true ]]; then
            git stash pop
        fi

        return 1
    else
        log_success "✓ No conflicts detected. Safe to rebase."

        # Restore stashed changes
        if [[ "$stashed" == true ]]; then
            git stash pop
        fi

        return 0
    fi
}

# Command: run-tests
# Run test suite based on agent role
cmd_run_tests() {
    log_info "Running tests..."

    local agent_role
    agent_role="$(get_agent_role)"

    cd "$PROJECT_ROOT"

    case "$agent_role" in
        overseer)
            log_info "Running full test suite (overseer)..."
            npm test
            log_success "Integration tests passed"
            ;;
        implementor-*)
            log_info "Running unit tests (implementor)..."
            npm test -- --run
            log_success "Unit tests passed"
            ;;
        *)
            log_info "Running default test suite..."
            npm test
            ;;
    esac
}

# Command: open-pr
# Open a PR from implementor branch to overseer branch
cmd_open_pr() {
    local current_branch
    current_branch="$(git branch --show-current)"

    # Extract spec ID and determine overseer branch
    local spec_id overseer_branch area
    if [[ "$current_branch" =~ feature/([^/]+)/impl-(.+) ]]; then
        spec_id="${BASH_REMATCH[1]}"
        area="${BASH_REMATCH[2]}"
        overseer_branch="feature/${spec_id}/overseer"
    else
        log_error "Not on an implementor branch. Cannot open PR."
        exit 1
    fi

    log_info "Opening PR from $current_branch to $overseer_branch..."

    local agent_role
    agent_role="$(get_agent_role)"

    # Get latest commit message for PR title
    local commit_message
    commit_message="$(git log -1 --pretty=%B | head -n1)"

    # Create PR using gh CLI
    gh pr create \
        --base "$overseer_branch" \
        --head "$current_branch" \
        --title "[$spec_id] $commit_message" \
        --body "## Summary

Implements: $area layer changes

## Testing
\`\`\`bash
npm test
\`\`\`

## Dependencies
- Check tasks.md for dependencies

Agent: $agent_role" \
        --draft

    log_success "Draft PR created!"
    log_info "Mark as ready for review when all tests pass"
}

# Main command dispatcher
main() {
    local command="${1:-}"

    if [[ -z "$command" ]]; then
        cat << EOF
Claude Multi-Agent Orchestrator CLI

Usage: claude-orchestrator <command> [arguments]

Commands:
  init-feature <spec-id>    Initialize feature branches for multi-agent development
  sync-status              Sync status from git log to tasks.md
  check-conflicts          Check for rebase conflicts before they happen
  run-tests               Run appropriate test suite for current agent role
  open-pr                 Open a PR from implementor to overseer branch

Examples:
  claude-orchestrator init-feature 003-reading-goals
  claude-orchestrator sync-status
  claude-orchestrator check-conflicts
  claude-orchestrator run-tests
  claude-orchestrator open-pr

Current agent role: $(get_agent_role)
EOF
        exit 0
    fi

    shift

    case "$command" in
        init-feature)
            cmd_init_feature "$@"
            ;;
        sync-status)
            cmd_sync_status "$@"
            ;;
        check-conflicts)
            cmd_check_conflicts "$@"
            ;;
        run-tests)
            cmd_run_tests "$@"
            ;;
        open-pr)
            cmd_open_pr "$@"
            ;;
        *)
            log_error "Unknown command: $command"
            log_info "Run 'claude-orchestrator' without arguments for usage"
            exit 1
            ;;
    esac
}

main "$@"
