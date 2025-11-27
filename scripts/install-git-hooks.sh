#!/bin/bash

# Git Hooks Installation Script for BookBuddy
# This script installs the pre-commit hook from the scripts directory

set -e

echo "📦 Installing Git hooks for BookBuddy..."

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel)

# Check if we're in a git repository
if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
HOOKS_DIR="$REPO_ROOT/.git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
    echo "Creating hooks directory: $HOOKS_DIR"
    mkdir -p "$HOOKS_DIR"
fi

# Copy pre-commit hook
SOURCE_HOOK="$REPO_ROOT/scripts/pre-commit"
TARGET_HOOK="$HOOKS_DIR/pre-commit"

if [ ! -f "$SOURCE_HOOK" ]; then
    echo "❌ Error: Source hook not found at $SOURCE_HOOK"
    exit 1
fi

echo "Installing pre-commit hook..."
cp "$SOURCE_HOOK" "$TARGET_HOOK"
chmod +x "$TARGET_HOOK"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will run SwiftLint and SwiftFormat on staged Swift files."
echo ""
echo "Required dependencies:"
echo "  - swiftformat (install with: brew install swiftformat)"
echo "  - swiftlint (install with: brew install swiftlint)"
echo ""
echo "To check if dependencies are installed, run:"
echo "  which swiftformat && which swiftlint"
echo ""
echo "🎉 Setup complete! Your commits will now be automatically checked."

exit 0