#!/usr/bin/env bash
# Install conflict detector as cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "Installing Conflict Detector Cron Job"
echo "=========================================="
echo ""

CRON_SCRIPT="$PROJECT_ROOT/scripts/orchestrator/run-conflict-detector-cron.sh"

echo "This will add a cron job that runs every 30 minutes to check for conflicts."
echo ""
echo "Cron entry to be added:"
echo "*/30 * * * * $CRON_SCRIPT"
echo ""

# Check if cron access is available
if ! crontab -l >/dev/null 2>&1; then
    echo "⚠️  Cron access is restricted on this system."
    echo ""
    echo "To enable cron on macOS:"
    echo "1. Open System Settings (System Preferences)"
    echo "2. Go to Privacy & Security > Full Disk Access"
    echo "3. Add 'cron' or '/usr/sbin/cron' to the allowed list"
    echo "4. Restart Terminal"
    echo ""
    echo "Then run this script again."
    echo ""
    echo "═══════════════════════════════════════════"
    echo "ALTERNATIVE: Manual crontab entry"
    echo "═══════════════════════════════════════════"
    echo ""
    echo "Run: crontab -e"
    echo "Add this line:"
    echo ""
    echo "*/30 * * * * $CRON_SCRIPT"
    echo ""
    exit 1
fi

# Backup existing crontab
echo "Backing up existing crontab..."
crontab -l > "$PROJECT_ROOT/.orchestrator/crontab.backup" 2>/dev/null || true

# Check if already installed
if crontab -l 2>/dev/null | grep -q "run-conflict-detector-cron.sh"; then
    echo "✓ Conflict detector cron job already installed"
    echo ""
    echo "Current crontab entries:"
    crontab -l | grep -A1 "Conflict Detector"
    exit 0
fi

# Add to crontab
echo "Adding cron job..."
(
    crontab -l 2>/dev/null || true
    echo ""
    echo "# Claude Multi-Agent Conflict Detector - runs every 30 minutes"
    echo "*/30 * * * * $CRON_SCRIPT"
) | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Cron job installed successfully!"
    echo ""
    echo "Current crontab:"
    crontab -l | grep -A1 "Conflict Detector"
    echo ""
    echo "Logs will be written to:"
    echo "  $PROJECT_ROOT/.orchestrator/logs/conflict-detector.log"
    echo ""
    echo "To view recent checks:"
    echo "  tail -f $PROJECT_ROOT/.orchestrator/logs/conflict-detector.log"
    echo ""
    echo "To remove the cron job:"
    echo "  crontab -e"
    echo "  # Delete the conflict detector lines"
else
    echo "✗ Failed to install cron job"
    exit 1
fi
