#!/bin/bash
# BookBuddy iOS Build Script

cd "$(dirname "$0")"

echo "Building BookBuddy iOS app..."
xcodebuild -project BookTrackerIOS.xcodeproj \
  -scheme BookTrackerIOS \
  -sdk iphonesimulator \
  build 2>&1 | tail -20

echo ""
echo "Build script completed. Check output above for BUILD SUCCEEDED or BUILD FAILED."
