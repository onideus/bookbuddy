# State Directory

This directory contains coordination state files for multi-agent development.

## Files

### `overseer.md` (created by Overseer)
- Tracks status of all implementor branches
- Records integration test results
- Lists known blockers
- Updated by Overseer after each PR review/merge

### `impl-<area>.md` (created by Implementors)
- Personal debugging notes
- Local test commands
- Fixture data references
- **Deleted before final merge to reduce noise**

## Usage

### Overseer
```bash
# Create state file when starting feature
cat > state/overseer.md << EOF
# Overseer State: Feature <spec-id>

## Branch Status
| Branch | Owner | Status | Last Update | Tests |
|--------|-------|--------|-------------|-------|
| impl-data | Implementor-A | 🔵 pending | - | - |
| impl-api | Implementor-B | 🔵 pending | - | - |
| impl-ui | Implementor-C | 🔵 pending | - | - |

## Known Blockers
- None

## Integration Test Results
Not run yet
EOF
```

### Implementors
```bash
# Create personal state file
ROLE=$(cat .claude/agent-role.local)
AREA="<data|api|ui>"

cat > state/impl-${AREA}.md << EOF
# Implementor State: ${ROLE}

## Current Work
<Task ID and description>

## Debugging Notes
- <Useful context>

## Local Test Commands
\`\`\`bash
npm test -- <test file>
\`\`\`

## Dependencies
- Blocked by: <task IDs or none>
- Blocking: <task IDs or none>
EOF
```

## Status Indicators

- 🔵 **Pending**: Not started
- 🟡 **In Progress**: Actively working
- 🟢 **Complete**: Merged to overseer
- 🔴 **Blocked**: Cannot proceed
- ⏳ **Review**: PR open, awaiting review

## Git Tracking

- `overseer.md`: **Committed and pushed** to overseer branch
- `impl-*.md`: **Local only**, deleted before PR merge (add to .gitignore)

## Cleanup

### After Feature Merge to Main
```bash
# Archive overseer state
git checkout main
mkdir -p .specify/completed/<spec-id>/
mv state/overseer.md .specify/completed/<spec-id>/

# Delete implementor state files (if any remain)
rm -f state/impl-*.md
```

## Templates

See `.specify/templates/` for full state file templates.
