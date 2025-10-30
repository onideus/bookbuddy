#!/usr/bin/env bash
# Wrapper for conflict-detector to run via cron
# Logs output to file for debugging

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/.orchestrator/logs"
LOG_FILE="$LOG_DIR/conflict-detector.log"

# Create log directory
mkdir -p "$LOG_DIR"

# Rotate log if it gets too large (> 10MB)
if [[ -f "$LOG_FILE" ]] && [[ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt 10485760 ]]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
fi

# Run conflict detector and log output
{
    echo "=========================================="
    echo "Conflict Detector Run: $(date)"
    echo "=========================================="
    cd "$PROJECT_ROOT"
    "$SCRIPT_DIR/conflict-detector.sh" 2>&1
    exit_code=$?
    echo "Exit code: $exit_code"
    echo ""
} >> "$LOG_FILE" 2>&1

exit $exit_code
