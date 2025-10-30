#!/usr/bin/env bash
# Conflict Detector - Scheduled job to detect rebase conflicts before they happen
# Run this script periodically (e.g., every 30 minutes) to warn implementors of potential conflicts

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
}

# Check conflicts for a specific implementor branch
check_branch_conflicts() {
    local impl_branch="$1"
    local overseer_branch="$2"

    log_info "Checking: $impl_branch"

    # Fetch latest
    git fetch origin "$impl_branch" "$overseer_branch" 2>/dev/null || return 0

    # Check if branches exist
    if ! git rev-parse "origin/$impl_branch" >/dev/null 2>&1; then
        log_warning "  Branch not found, skipping"
        return 0
    fi

    if ! git rev-parse "origin/$overseer_branch" >/dev/null 2>&1; then
        log_warning "  Overseer branch not found, skipping"
        return 0
    fi

    # Calculate divergence
    local commits_ahead commits_behind
    commits_ahead="$(git rev-list --count "origin/$overseer_branch..origin/$impl_branch" 2>/dev/null || echo "0")"
    commits_behind="$(git rev-list --count "origin/$impl_branch..origin/$overseer_branch" 2>/dev/null || echo "0")"

    if [[ "$commits_behind" -eq 0 ]]; then
        log_success "  Up to date with overseer"
        return 0
    fi

    log_warning "  Behind by $commits_behind commit(s), ahead by $commits_ahead commit(s)"

    # Check for actual conflicts using merge-tree
    local merge_base
    merge_base="$(git merge-base "origin/$impl_branch" "origin/$overseer_branch" 2>/dev/null || echo "")"

    if [[ -z "$merge_base" ]]; then
        log_warning "  Cannot determine merge base"
        return 0
    fi

    # Run merge-tree to detect conflicts
    local conflicts
    conflicts="$(git merge-tree "$merge_base" "origin/$impl_branch" "origin/$overseer_branch" 2>/dev/null | grep "^changed in both" || true)"

    if [[ -n "$conflicts" ]]; then
        log_error "  ⚠ CONFLICTS DETECTED!"
        echo "$conflicts" | while IFS= read -r line; do
            local file="${line#changed in both:}"
            log_error "    - Conflict in: $file"
        done

        # Write warning to state file
        local area
        if [[ "$impl_branch" =~ /impl-(.+)$ ]]; then
            area="${BASH_REMATCH[1]}"
        elif [[ "$impl_branch" =~ /implementor-(.+)$ ]]; then
            # Map implementor-{a,b,c} to {data,api,ui}
            case "${BASH_REMATCH[1]}" in
                a) area="data" ;;
                b) area="api" ;;
                c) area="ui" ;;
                *) area="${BASH_REMATCH[1]}" ;;
            esac
        fi

        if [[ -n "$area" ]] && [[ -f "$PROJECT_ROOT/state/impl-${area}.md" ]]; then
            {
                echo ""
                echo "## ⚠ REBASE CONFLICT WARNING"
                echo ""
                echo "**Detected at**: $(date)"
                echo "**Status**: Behind overseer by $commits_behind commits"
                echo ""
                echo "**Conflicting files**:"
                echo "$conflicts" | sed 's/changed in both:/- /g'
                echo ""
                echo "**Action needed**: Coordinate with overseer before rebasing"
                echo ""
            } >> "$PROJECT_ROOT/state/impl-${area}.md"
        fi

        return 1
    else
        log_success "  No conflicts detected, safe to rebase"
        return 0
    fi
}

# Main function
main() {
    cd "$PROJECT_ROOT"

    log_info "Starting conflict detection scan..."

    # Find all active feature branches
    git fetch --all --quiet

    # Get list of overseer branches (both standard and alternative naming)
    local overseer_branches
    overseer_branches="$(git branch -r | grep -E 'origin/.*/overseer$' | sed 's|origin/||g' || true)"

    if [[ -z "$overseer_branches" ]]; then
        log_warning "No overseer branches found"
        exit 0
    fi

    local total_conflicts=0

    while IFS= read -r overseer_branch; do
        overseer_branch="${overseer_branch## }"  # trim whitespace

        log_info "Scanning feature: $overseer_branch"

        # Extract prefix (either "feature/<spec-id>" or "<prefix>")
        local prefix
        if [[ "$overseer_branch" =~ ^(.+)/overseer$ ]]; then
            prefix="${BASH_REMATCH[1]}"
        else
            continue
        fi

        # Check implementor branches - try both naming patterns
        local impl_branches=()

        # Pattern 1: feature/<spec-id>/impl-{data,api,ui}
        if [[ "$prefix" =~ ^feature/ ]]; then
            for area in data api ui; do
                impl_branches+=("feature/${prefix#feature/}/impl-${area}")
            done
        fi

        # Pattern 2: <prefix>/implementor-{a,b,c}
        for letter in a b c; do
            impl_branches+=("${prefix}/implementor-${letter}")
        done

        # Check each implementor branch (only if it exists remotely)
        for impl_branch in "${impl_branches[@]}"; do
            if git rev-parse "origin/$impl_branch" >/dev/null 2>&1; then
                if check_branch_conflicts "$impl_branch" "$overseer_branch"; then
                    : # No conflicts
                else
                    ((total_conflicts++))
                fi
            fi
        done

        echo ""
    done <<< "$overseer_branches"

    if [[ "$total_conflicts" -gt 0 ]]; then
        log_error "Found $total_conflicts branch(es) with potential conflicts"
        log_info "Check state/impl-*.md files for details"
        exit 1
    else
        log_success "All branches clear! No conflicts detected."
        exit 0
    fi
}

main "$@"
