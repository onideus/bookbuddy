---
skill: ios-ui-review
description: Review and capture screenshots of the iOS app UI in the simulator. Use this when you need to see the current state of the app interface, verify UI changes, debug visual issues, or iterate on UI implementations.
triggers:
  - User asks to see/show/review the current UI or app interface
  - User reports visual/layout issues
  - After making UI-related code changes that need verification
  - When implementing or debugging UI features
  - User asks "what does it look like" or similar
---

# iOS UI Review Skill

This skill handles the complete workflow for reviewing the iOS app's user interface by building, launching, and capturing screenshots from the iOS simulator.

## Workflow

### 1. Determine Current State
First, check if simulator is booted and if app needs rebuilding:

```bash
# Check if simulator is booted
xcrun simctl list devices booted | grep -i iphone

# Check if we need to rebuild (if code changed)
# Build is needed after any Swift file modifications
```

### 2. Build the App (if needed)

```bash
cd ios
xcodebuild -project BookTrackerIOS.xcodeproj \
  -scheme BookTrackerIOS \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  build 2>&1 | grep -E "(BUILD SUCCEEDED|BUILD FAILED|error:)"
```

**Important**: Check for build success before proceeding.

### 3. Boot Simulator (if not running)

```bash
open -a Simulator
sleep 3
xcrun simctl boot "iPhone 17 Pro" 2>&1 || echo "Already booted"
sleep 2
```

### 4. Get Bundle Identifier

The bundle ID is needed to launch the app. For this project:

```bash
# Check the actual bundle ID from built app
plutil -p /Users/zachmartin/Library/Developer/Xcode/DerivedData/BookTrackerIOS-*/Build/Products/Debug-iphonesimulator/BookTrackerApp.app/Info.plist | grep CFBundleIdentifier
```

**Known bundle ID**: `com.booktracker.ios`

### 5. Install and Launch App

```bash
cd ios

# Install app
xcrun simctl install booted \
  /Users/zachmartin/Library/Developer/Xcode/DerivedData/BookTrackerIOS-*/Build/Products/Debug-iphonesimulator/BookTrackerApp.app

# Launch app (use correct bundle ID)
xcrun simctl launch booted com.booktracker.ios

# Wait for app to fully load
sleep 3
```

### 6. Capture Screenshot

```bash
# Take screenshot with descriptive name
xcrun simctl io booted screenshot /tmp/ios_ui_$(date +%s).png

# Or use a specific name based on context
xcrun simctl io booted screenshot /tmp/login_screen.png
```

### 7. Review Screenshot

Use the Read tool to view the captured screenshot and analyze the UI.

## Common Issues and Solutions

### Issue: "No devices are booted"
**Solution**: Run `open -a Simulator && sleep 3 && xcrun simctl boot "iPhone 17 Pro"`

### Issue: "Failed to launch" with error code 4
**Solution**: Wrong bundle identifier. Check with plutil command above.

### Issue: App shows old version
**Solution**: Rebuild the app - code changes require a new build.

### Issue: Screenshot shows home screen not app
**Solution**: App didn't launch. Check bundle ID and try launching again.

## Screenshot Naming Convention

Use descriptive names that indicate what you're capturing:
- `/tmp/login_screen.png` - Login screen view
- `/tmp/main_books_view.png` - Main books list
- `/tmp/error_state.png` - Error state being debugged
- `/tmp/after_ui_fix.png` - After making UI changes

## Project-Specific Details

- **Working Directory**: `/Users/zachmartin/projects/active/bookbuddy-mk3/ios`
- **Xcode Project**: `BookTrackerIOS.xcodeproj`
- **Scheme**: `BookTrackerIOS`
- **Bundle ID**: `com.booktracker.ios`
- **Preferred Simulator**: iPhone 17 Pro
- **DerivedData Path**: `/Users/zachmartin/Library/Developer/Xcode/DerivedData/BookTrackerIOS-*/`

## Example: Complete UI Review Workflow

```bash
cd /Users/zachmartin/projects/active/bookbuddy-mk3/ios

# 1. Build
xcodebuild -project BookTrackerIOS.xcodeproj -scheme BookTrackerIOS \
  -sdk iphonesimulator build 2>&1 | tail -20

# 2. Ensure simulator is running
open -a Simulator
sleep 3

# 3. Install
xcrun simctl install booted \
  /Users/zachmartin/Library/Developer/Xcode/DerivedData/BookTrackerIOS-*/Build/Products/Debug-iphonesimulator/BookTrackerApp.app

# 4. Launch
xcrun simctl launch booted com.booktracker.ios

# 5. Wait and capture
sleep 3
xcrun simctl io booted screenshot /tmp/current_ui.png

# 6. Review with Read tool
```

## When to Use This Skill

✅ **Use when:**
- User asks to see the UI
- Verifying UI changes after code modifications
- Debugging visual/layout issues
- User reports "it looks wrong" or similar
- Implementing new UI features
- User asks "what does the screen show"

❌ **Don't use when:**
- Only discussing code without needing to see results
- Build errors prevent compilation
- Question is about backend/API (not UI)
