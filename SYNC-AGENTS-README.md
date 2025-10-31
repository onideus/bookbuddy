# Agent Environment Sync Script

## Purpose

This script synchronizes environmental files from the root project directory to all agent worktrees and sets up the appropriate agent role for each workspace.

## Usage

```bash
./sync-agents.sh
```

## What It Does

1. **Detects Root Project**: Automatically finds the main project directory from git worktree list
2. **Copies Environmental Files**: Syncs the following files (if they exist):
   - `.env`
   - `.env.local`
   - `.env.development`
   - `.env.production`
   - `.env.test`
   - `config.local.json`
3. **Sets Agent Roles**: Creates `.claude/agent-role.local` in each worktree based on directory name:
   - `overseer_*` → `overseer`
   - `implementor-one_*` → `implementor-a`
   - `implementor-two_*` → `implementor-b`
   - `implementor-three_*` → `implementor-c`

## Directory Structure

```
/Users/zachmartin/projects/active/bookbuddy-mk2  ← Root project (source)
/Users/zachmartin/.claude-squad/worktrees/        ← Worktrees (targets)
├── overseer_*/
├── implementor-one_*/
├── implementor-two_*/
└── implementor-three_*/
```

## When to Run

- After creating new worktrees
- When environmental variables change in the root project
- After pulling updates that affect configuration
- When setting up a new development machine

## Customization

To add more files to sync, edit the `ENV_FILES` array in the script:

```bash
ENV_FILES=(
  ".env"
  ".env.local"
  "your-custom-file"
)
```

## Notes

- The script skips files that don't exist (no errors)
- Creates `.claude/` directory if it doesn't exist
- Overwrites existing `.claude/agent-role.local` files
- Safe to run multiple times (idempotent)

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Environment Sync Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Root Project: /Users/zachmartin/projects/active/bookbuddy-mk2
Worktrees Dir: /Users/zachmartin/.claude-squad/worktrees

Processing worktrees...

┌─ implementor-one_1873423c069ed760
  ✓ Copied .env
  ✓ Copied .env.local
  ✓ Set agent role: implementor-a
└─ Complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All agents synced successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
