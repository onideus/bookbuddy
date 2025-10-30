#!/usr/bin/env bash
# Install git hooks for auto-status-sync

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "Installing Auto-Status-Sync Git Hooks"
echo "=========================================="
echo ""

# Find the main git directory (handle worktrees)
GIT_DIR="$(git rev-parse --git-common-dir)"

if [[ -z "$GIT_DIR" ]]; then
    echo "✗ Not a git repository"
    exit 1
fi

HOOKS_DIR="$GIT_DIR/hooks"

echo "Git hooks directory: $HOOKS_DIR"
echo ""

# Backup existing hooks
backup_hook() {
    local hook_name="$1"
    local hook_path="$HOOKS_DIR/$hook_name"

    if [[ -f "$hook_path" ]] && ! grep -q "auto-status-sync" "$hook_path" 2>/dev/null; then
        echo "  Backing up existing $hook_name..."
        cp "$hook_path" "$hook_path.backup-$(date +%Y%m%d-%H%M%S)"
    fi
}

# Create post-commit hook
install_post_commit() {
    local hook_path="$HOOKS_DIR/post-commit"

    echo "Installing post-commit hook..."

    backup_hook "post-commit"

    # Create or append to post-commit
    if [[ ! -f "$hook_path" ]]; then
        cat > "$hook_path" << 'EOF'
#!/usr/bin/env bash
# Git post-commit hook - Auto-status-sync

# Find project root (traverse up to find scripts/orchestrator)
find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/scripts/orchestrator/auto-status-sync.sh" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

PROJECT_ROOT="$(find_project_root)"

if [[ -z "$PROJECT_ROOT" ]]; then
    # Not in a multi-agent project, skip
    exit 0
fi

# Check if we're on a feature branch
BRANCH="$(git branch --show-current)"

if [[ "$BRANCH" =~ ^(feature/|zachmartin/) ]]; then
    # Run auto-status-sync
    if [[ -x "$PROJECT_ROOT/scripts/orchestrator/auto-status-sync.sh" ]]; then
        "$PROJECT_ROOT/scripts/orchestrator/auto-status-sync.sh" 2>&1 | tee -a "$PROJECT_ROOT/.orchestrator/logs/git-hooks.log"
    fi
fi

exit 0
EOF
        chmod +x "$hook_path"
        echo "  ✓ Created post-commit hook"
    else
        # Append if not already present
        if grep -q "auto-status-sync" "$hook_path"; then
            echo "  ✓ post-commit hook already configured"
        else
            cat >> "$hook_path" << 'EOF'

# Auto-status-sync for multi-agent coordination
find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/scripts/orchestrator/auto-status-sync.sh" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

PROJECT_ROOT="$(find_project_root)"
BRANCH="$(git branch --show-current)"

if [[ -n "$PROJECT_ROOT" ]] && [[ "$BRANCH" =~ ^(feature/|zachmartin/) ]]; then
    if [[ -x "$PROJECT_ROOT/scripts/orchestrator/auto-status-sync.sh" ]]; then
        "$PROJECT_ROOT/scripts/orchestrator/auto-status-sync.sh" 2>&1 | tee -a "$PROJECT_ROOT/.orchestrator/logs/git-hooks.log"
    fi
fi
EOF
            echo "  ✓ Updated post-commit hook"
        fi
    fi
}

# Create post-merge hook (for when pulling changes)
install_post_merge() {
    local hook_path="$HOOKS_DIR/post-merge"

    echo "Installing post-merge hook..."

    backup_hook "post-merge"

    if [[ ! -f "$hook_path" ]]; then
        cat > "$hook_path" << 'EOF'
#!/usr/bin/env bash
# Git post-merge hook - Log merge events

find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/scripts/orchestrator/event-store.sh" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

PROJECT_ROOT="$(find_project_root)"
BRANCH="$(git branch --show-current)"

if [[ -n "$PROJECT_ROOT" ]] && [[ "$BRANCH" =~ ^(feature/|zachmartin/) ]]; then
    # Log merge event to event store
    echo "[$(date)] Merge completed on $BRANCH" >> "$PROJECT_ROOT/.orchestrator/logs/git-hooks.log"
fi

exit 0
EOF
        chmod +x "$hook_path"
        echo "  ✓ Created post-merge hook"
    else
        if ! grep -q "post-merge hook" "$hook_path"; then
            backup_hook "post-merge"
        fi
        echo "  ℹ post-merge hook already exists (not modified)"
    fi
}

# Install hooks
install_post_commit
echo ""
install_post_merge

echo ""
echo "=========================================="
echo "✓ Git Hooks Installed Successfully"
echo "=========================================="
echo ""
echo "Hooks installed in: $HOOKS_DIR"
echo ""
echo "What happens now:"
echo "  • After each commit → auto-status-sync runs"
echo "  • Status updates written to tasks.md"
echo "  • State files updated with commit info"
echo "  • Logs written to .orchestrator/logs/git-hooks.log"
echo ""
echo "To test:"
echo "  1. Make a commit on a feature branch"
echo "  2. Check: cat .orchestrator/logs/git-hooks.log"
echo "  3. Verify: Status appears in tasks.md"
echo ""
echo "To disable:"
echo "  chmod -x $HOOKS_DIR/post-commit"
echo ""
echo "To remove:"
echo "  rm $HOOKS_DIR/post-commit"
echo "  # (Backups saved with .backup-* extension)"
echo ""
