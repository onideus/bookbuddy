# Conflict Detector Cron Job Setup

## ✅ What's Ready

The conflict detector is configured and tested:
- ✅ Script works correctly
- ✅ Cron wrapper created with logging
- ✅ Handles your branch naming (`zachmartin/overseer` + `zachmartin/implementor-*`)
- ✅ Logs to `.orchestrator/logs/conflict-detector.log`

**Test run**: All branches clear, no conflicts detected

---

## 🔧 Installation Options

### Option 1: Automated Install (Recommended)

Run the install script:
```bash
./scripts/orchestrator/install-cron.sh
```

This will:
- Check cron access
- Backup your existing crontab
- Add the conflict detector entry
- Verify installation

**If you get "Operation not permitted"**, see Option 2 below.

---

### Option 2: Manual Installation (macOS Restrictions)

If cron access is restricted on macOS:

**Step 1: Enable Cron Access**
1. Open **System Settings** (System Preferences on older macOS)
2. Go to **Privacy & Security** > **Full Disk Access**
3. Click the lock icon to make changes
4. Click **+** and add `/usr/sbin/cron`
5. Restart Terminal

**Step 2: Add Crontab Entry**
```bash
crontab -e
```

Add this line:
```cron
# Claude Multi-Agent Conflict Detector - runs every 30 minutes
*/30 * * * * /Users/zachmartin/.claude-squad/worktrees/overseer_1873610797206198/scripts/orchestrator/run-conflict-detector-cron.sh
```

Save and exit (`:wq` in vim, or `Ctrl+X` then `Y` in nano).

**Step 3: Verify**
```bash
crontab -l | grep conflict-detector
```

---

### Option 3: Alternative Schedulers (No System Changes)

If you prefer not to use cron, use one of these alternatives:

**A. launchd (macOS Native)**

Create: `~/Library/LaunchAgents/com.claude.conflict-detector.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.conflict-detector</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/zachmartin/.claude-squad/worktrees/overseer_1873610797206198/scripts/orchestrator/run-conflict-detector-cron.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>1800</integer> <!-- 30 minutes in seconds -->
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.claude.conflict-detector.plist
```

**B. VS Code Tasks (If you use VS Code)**

Add to `.vscode/tasks.json`:
```json
{
  "label": "Check Conflicts",
  "type": "shell",
  "command": "./scripts/orchestrator/conflict-detector.sh",
  "problemMatcher": [],
  "runOptions": {
    "runOn": "folderOpen"
  }
}
```

**C. Git Hook (On Every Fetch)**

Add to `.git/hooks/post-fetch`:
```bash
#!/bin/bash
./scripts/orchestrator/conflict-detector.sh
```

Make executable:
```bash
chmod +x .git/hooks/post-fetch
```

**D. Manual (No Automation)**

Just run it manually when you remember:
```bash
./scripts/orchestrator/conflict-detector.sh
```

---

## 📊 Monitoring

### View Logs
```bash
# Follow live
tail -f .orchestrator/logs/conflict-detector.log

# Last 50 lines
tail -50 .orchestrator/logs/conflict-detector.log

# Search for conflicts
grep -i "conflict" .orchestrator/logs/conflict-detector.log
```

### Check Cron Status
```bash
# List all cron jobs
crontab -l

# Check if running
ps aux | grep conflict-detector

# Test manually
./scripts/orchestrator/run-conflict-detector-cron.sh
```

### Remove Cron Job
```bash
crontab -e
# Delete the conflict detector lines
```

---

## 🎯 What It Does

**Every 30 minutes**, the conflict detector:
1. Fetches latest changes from all branches
2. Scans overseer branch (`zachmartin/overseer`)
3. Checks each implementor branch for conflicts
4. Calculates divergence (commits ahead/behind)
5. Uses `git merge-tree` to predict conflicts
6. Writes warnings to `state/impl-*.md` if conflicts found
7. Logs results to `.orchestrator/logs/conflict-detector.log`

**Exit codes**:
- `0` = No conflicts
- `1` = Conflicts detected

---

## 🔍 Example Output

**No conflicts**:
```
[17:39:10] Starting conflict detection scan...
[17:39:11] Scanning feature: zachmartin/overseer
[17:39:11] ✓ All branches clear! No conflicts detected.
```

**With conflicts**:
```
[17:45:23] Starting conflict detection scan...
[17:45:24] Scanning feature: zachmartin/overseer
[17:45:25] Checking: zachmartin/implementor-a
[17:45:25]   Behind by 3 commit(s), ahead by 2 commit(s)
[17:45:26]   ⚠ CONFLICTS DETECTED!
[17:45:26]     - Conflict in: src/models/user.js
[17:45:26]     - Conflict in: src/services/auth.js
[17:45:26] Found 1 branch(es) with potential conflicts
```

**State file warning** (written to `state/impl-data.md`):
```markdown
## ⚠ REBASE CONFLICT WARNING

**Detected at**: Thu Oct 30 17:45:26 EDT 2025
**Status**: Behind overseer by 3 commits

**Conflicting files**:
- src/models/user.js
- src/services/auth.js

**Action needed**: Coordinate with overseer before rebasing
```

---

## 🚀 Next Steps

After installing:

1. **Wait 30 minutes** for first run (or test manually)
2. **Check logs**: `tail .orchestrator/logs/conflict-detector.log`
3. **Monitor state files**: Watch for warnings in `state/impl-*.md`
4. **Coordinate**: If conflicts detected, resolve before rebasing

---

## ⚙️ Configuration

Edit the cron schedule if needed:
```cron
*/30 * * * *  # Every 30 minutes (current)
*/15 * * * *  # Every 15 minutes (more frequent)
0 * * * *     # Every hour (less frequent)
0 9-17 * * *  # Every hour, 9am-5pm only
```

---

## 🐛 Troubleshooting

**Cron not running?**
```bash
# Check cron service
ps aux | grep cron

# Check system log
tail -f /var/log/system.log | grep cron

# Test script directly
./scripts/orchestrator/run-conflict-detector-cron.sh
```

**Permission errors?**
```bash
chmod +x scripts/orchestrator/*.sh
```

**Not finding branches?**
```bash
# Check git fetch works
git fetch --all

# Verify branches exist
git branch -r | grep zachmartin
```

---

## 📚 Related Documentation

- Complete tool docs: `scripts/orchestrator/README.md`
- Multi-agent guide: `CLAUDE.md`
- Implementation summary: `ORCHESTRATION_IMPLEMENTATION_SUMMARY.md`
