#!/usr/bin/env bash
# Install conflict detector using launchd (macOS native scheduler)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "Installing Conflict Detector (launchd)"
echo "=========================================="
echo ""

PLIST_FILE="$HOME/Library/LaunchAgents/com.claude.conflict-detector.plist"
SCRIPT_PATH="$PROJECT_ROOT/scripts/orchestrator/run-conflict-detector-cron.sh"

# Check if already installed
if [[ -f "$PLIST_FILE" ]]; then
    echo "⚠️  Conflict detector already installed"
    echo ""
    echo "Current status:"
    launchctl list | grep "com.claude.conflict-detector" || echo "Not loaded"
    echo ""
    read -p "Reinstall? (y/N): " confirm
    if [[ "$confirm" != "y" ]]; then
        echo "Aborted"
        exit 0
    fi
    echo "Unloading existing service..."
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Create plist file
echo "Creating launchd plist..."
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.conflict-detector</string>

    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_PATH</string>
    </array>

    <key>StartInterval</key>
    <integer>1800</integer>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$PROJECT_ROOT/.orchestrator/logs/launchd-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$PROJECT_ROOT/.orchestrator/logs/launchd-stderr.log</string>

    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
</dict>
</plist>
EOF

echo "✓ Plist file created: $PLIST_FILE"

# Load the service
echo ""
echo "Loading service..."
launchctl load "$PLIST_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Service loaded successfully!"
    echo ""
    echo "Status:"
    launchctl list | grep "com.claude.conflict-detector"
    echo ""
    echo "Details:"
    echo "  - Runs every: 30 minutes"
    echo "  - First run: Within 30 minutes"
    echo "  - Logs: $PROJECT_ROOT/.orchestrator/logs/"
    echo ""
    echo "Commands:"
    echo "  Check status:  launchctl list | grep conflict-detector"
    echo "  View logs:     tail -f $PROJECT_ROOT/.orchestrator/logs/conflict-detector.log"
    echo "  Stop service:  launchctl unload $PLIST_FILE"
    echo "  Start service: launchctl load $PLIST_FILE"
    echo "  Remove:        rm $PLIST_FILE && launchctl remove com.claude.conflict-detector"
    echo ""
    echo "🎉 Conflict detector is now running!"
else
    echo "✗ Failed to load service"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check plist syntax: plutil -lint $PLIST_FILE"
    echo "  2. Check script exists: ls -la $SCRIPT_PATH"
    echo "  3. Check script permissions: chmod +x $SCRIPT_PATH"
    exit 1
fi
