# Multi-Agent Coordination Runbooks

This document provides detailed operational procedures for each agent role in the multi-agent development system.

**Roles:**
- **Overseer**: Coordinates work, reviews PRs, manages integration
- **Implementor-A**: Typically handles data layer (database, migrations, models)
- **Implementor-B**: Typically handles API layer (endpoints, business logic)
- **Implementor-C**: Typically handles UI layer (components, pages, frontend)

---

## Role Assignment

### Detecting Your Role

Each agent instance should check its role on startup:

```bash
# Check for local role configuration
if [ -f .claude/agent-role.local ]; then
  export AGENT_ROLE=$(cat .claude/agent-role.local)
  echo "Agent role: $AGENT_ROLE"
else
  echo "No role assigned. Running in single-agent mode."
fi
```

### Setting Your Role (User Action)

Create `.claude/agent-role.local` (gitignored):

```bash
# For overseer
echo "overseer" > .claude/agent-role.local

# For implementors
echo "implementor-a" > .claude/agent-role.local
echo "implementor-b" > .claude/agent-role.local
echo "implementor-c" > .claude/agent-role.local
```

---

## Overseer Runbook

### Responsibilities
- Coordinate overall feature development
- Decompose specs into parallelizable work items
- Create and manage integration branch
- Review and merge implementor PRs
- Run integration tests
- Final merge to main
- Resolve conflicts and blockers

### Phase 1: Feature Initiation

**Checklist:**
- [ ] Review spec in `.specify/spec.md`
- [ ] Run `/speckit.plan` to generate plan.md
- [ ] Run `/speckit.tasks` to generate tasks.md
- [ ] Decompose tasks into 3 parallel work streams
- [ ] Assign work items to implementors
- [ ] Create overseer branch
- [ ] Scaffold integration tests
- [ ] Notify implementors to begin

**Commands:**
```bash
# 1. Ensure you're on main and up-to-date
git checkout main
git pull origin main

# 2. Create overseer integration branch
SPEC_ID=$(grep -m1 "^# Feature:" .specify/spec.md | sed 's/.*: //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
git checkout -b feature/${SPEC_ID}/overseer

# 3. Create state tracking file
mkdir -p state
cat > state/overseer.md << EOF
# Overseer State: Feature ${SPEC_ID}

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

# 4. Update tasks.md with agent assignments
# Edit .specify/tasks.md to add agent assignments (see template)

# 5. Commit and push overseer branch
git add .
git commit -m "[${SPEC_ID}] Initialize overseer branch with task assignments"
git push -u origin feature/${SPEC_ID}/overseer

# 6. Notify implementors (in team chat/task management)
echo "Overseer branch ready: feature/${SPEC_ID}/overseer"
echo "Implementors can now create their branches."
```

### Phase 2: Coordination and Review

**Daily Checklist:**
- [ ] Review implementor status updates in tasks.md
- [ ] Check for `@Overseer` mentions
- [ ] Review open PRs from implementors
- [ ] Run integration tests on PR branches
- [ ] Provide feedback or approve
- [ ] Merge approved PRs
- [ ] Update state/overseer.md
- [ ] Resolve any blockers

**PR Review Commands:**
```bash
# Fetch all branches
git fetch origin

# Review implementor PR locally
git checkout feature/${SPEC_ID}/impl-data
npm test  # Run tests

# If tests pass, merge to overseer
git checkout feature/${SPEC_ID}/overseer
git merge --squash feature/${SPEC_ID}/impl-data
git commit -m "[${SPEC_ID}] Merge impl-data: <brief description>"
git push origin feature/${SPEC_ID}/overseer

# Update state/overseer.md with merge
# Update .specify/tasks.md to mark work item complete
```

**Integration Testing:**
```bash
# On overseer branch, run full test suite
git checkout feature/${SPEC_ID}/overseer
npm run test:integration
npm run test:e2e

# Update state/overseer.md with results
```

### Phase 3: Final Integration

**Checklist:**
- [ ] All implementor work items completed
- [ ] All PRs merged to overseer branch
- [ ] Full test suite passing
- [ ] Code review complete
- [ ] Update changelog
- [ ] Create completion tag
- [ ] Merge to main
- [ ] Archive spec
- [ ] Clean up branches

**Commands:**
```bash
# 1. Final checks on overseer branch
git checkout feature/${SPEC_ID}/overseer
npm run lint
npm test
npm run test:e2e

# 2. Update changelog
# Edit CHANGELOG.md or similar

# 3. Create ready tag
git tag -a spec-${SPEC_ID}-ready -m "Feature ${SPEC_ID} ready for main merge"
git push origin spec-${SPEC_ID}-ready

# 4. Merge to main
git checkout main
git pull origin main
git merge feature/${SPEC_ID}/overseer
git push origin main

# 5. Create merged tag
git tag -a spec-${SPEC_ID}-merged -m "Feature ${SPEC_ID} merged to main"
git push origin spec-${SPEC_ID}-merged

# 6. Archive completed spec
mkdir -p .specify/completed
mv .specify/spec.md .specify/completed/${SPEC_ID}-spec.md
mv .specify/plan.md .specify/completed/${SPEC_ID}-plan.md
mv .specify/tasks.md .specify/completed/${SPEC_ID}-tasks.md

# 7. Clean up branches (after team confirmation)
git branch -d feature/${SPEC_ID}/overseer
git push origin --delete feature/${SPEC_ID}/overseer
# Implementor branches cleaned by implementors
```

---

## Implementor Runbook

### Responsibilities
- Implement assigned work items
- Maintain branch sync with overseer
- Run local tests
- Update status in tasks.md
- Create PRs to overseer branch
- Respond to review feedback

### Phase 1: Setup

**Checklist:**
- [ ] Receive notification from overseer
- [ ] Pull overseer branch
- [ ] Create implementor branch
- [ ] Review assigned work items
- [ ] Ask questions if unclear

**Commands:**
```bash
# 1. Fetch overseer branch
git fetch origin

# 2. Checkout overseer branch
SPEC_ID="<from overseer notification>"
git checkout feature/${SPEC_ID}/overseer

# 3. Create implementor branch (check your role!)
ROLE=$(cat .claude/agent-role.local)
AREA="<data|api|ui>"  # Based on your assignment
git checkout -b feature/${SPEC_ID}/impl-${AREA}

# 4. Create state file for debugging notes
mkdir -p state
cat > state/impl-${AREA}.md << EOF
# Implementor State: ${ROLE}

## Current Work
<Description of current task>

## Debugging Notes
- <Any useful context for debugging>

## Local Test Commands
\`\`\`bash
npm test -- <specific test file>
\`\`\`
EOF

# 5. Push branch
git push -u origin feature/${SPEC_ID}/impl-${AREA}
```

### Phase 2: Implementation

**Daily Checklist:**
- [ ] Rebase on overseer branch (morning)
- [ ] Implement assigned work items
- [ ] Write/update tests
- [ ] Run local tests
- [ ] Commit with proper format
- [ ] Update status in tasks.md
- [ ] Push changes
- [ ] Check for feedback from overseer

**Development Commands:**
```bash
# Morning sync
git fetch origin
git rebase origin/feature/${SPEC_ID}/overseer

# After implementing
npm test  # Run relevant tests
npm run lint

# Commit with proper format
git add .
git commit -m "[${SPEC_ID}] <Brief description>

<Longer explanation if needed>

Agent: $(cat .claude/agent-role.local)"

# Update status in tasks.md
# Edit .specify/tasks.md to append status update

# Push changes
git push origin feature/${SPEC_ID}/impl-${AREA}
```

**Status Update Format in tasks.md:**
```markdown
### Status Updates
- Implementor-A → abc1234 — migrations complete, tests passing
```

### Phase 3: PR and Review

**Checklist:**
- [ ] Work item complete
- [ ] All tests passing
- [ ] No lint errors
- [ ] Status updated in tasks.md
- [ ] Create PR to overseer branch
- [ ] Respond to review feedback
- [ ] Make requested changes
- [ ] Notify overseer when ready for re-review

**PR Commands:**
```bash
# Create PR using GitHub CLI
gh pr create \
  --base feature/${SPEC_ID}/overseer \
  --head feature/${SPEC_ID}/impl-${AREA} \
  --title "[${SPEC_ID}] <Work item description>" \
  --body "## Summary

- Implements: <work item>
- Tests: <test coverage>
- Dependencies: <any dependencies on other work>

## Testing
\`\`\`bash
npm test -- <relevant tests>
\`\`\`

Agent: $(cat .claude/agent-role.local)"

# Or use GitHub web interface
echo "Create PR at: https://github.com/<org>/<repo>/compare/feature/${SPEC_ID}/overseer...feature/${SPEC_ID}/impl-${AREA}"
```

**Responding to Review Feedback:**
```bash
# Make requested changes
# <implement feedback>

# Commit changes
git add .
git commit -m "[${SPEC_ID}] Address review feedback: <brief>"
git push origin feature/${SPEC_ID}/impl-${AREA}

# Update tasks.md
# Append: "Implementor-X → <commit> — addressed review feedback"

# Notify overseer
# Tag @Overseer in tasks.md or PR comment
```

---

## Communication Protocols

### Status Update Template

In `.specify/tasks.md`, append under your work item:

```markdown
### Status Updates
- Implementor-A → <commit-hash> — <one-line status>
```

**Examples:**
- `Implementor-A → abc1234 — migrations complete, all tests passing`
- `Implementor-B → def5678 — API endpoints done, waiting on #1 for integration tests`
- `Implementor-C → ghi9012 — UI components ready, cypress tests passing`

### Escalation Tags

**For Implementors:**
```markdown
### Integration Notes
- @Overseer: Need clarification on session storage approach (Redis vs PG)
- @Implementor-B: Can you expose the getUserById endpoint? Needed for UI
```

**For Overseer:**
```markdown
### Integration Notes
- @Implementor-A: Please add index on users.email for performance
- @All: Design decision needed on error handling strategy. See /ask-codex consultation below.
```

### Blocker Protocol

**If Blocked:**
1. Add `BLOCKER` section to tasks.md:
```markdown
### BLOCKER
- **Implementor-B** blocked on Implementor-A completing database migrations
- **Status**: Waiting
- **Workaround**: Working on UI mocks in the meantime
```

2. Tag appropriate agent with `@mention`
3. Overseer responds within same session or schedules sync

---

## Slash Commands for Coordination

### Overseer Commands

```bash
# Initialize feature coordination
/speckit.plan          # Generate plan from spec
/speckit.tasks         # Generate task breakdown

# Ask architectural questions
/ask-codex Should we use Redis or PostgreSQL for session storage?

# Review coordination status
cat .specify/tasks.md
cat state/overseer.md
```

### Implementor Commands

```bash
# Check your assigned tasks
grep "$(cat .claude/agent-role.local)" .specify/tasks.md -A5

# Update status quickly
echo "- $(cat .claude/agent-role.local) → $(git rev-parse --short HEAD) — <status>" >> .specify/tasks.md

# Ask for help
/ask-codex How should I handle circular dependencies in this module?
```

---

## Conflict Resolution

### Merge Conflicts with Overseer Branch

**Implementor Procedure:**
```bash
# 1. Fetch latest overseer
git fetch origin

# 2. Rebase on overseer (may have conflicts)
git rebase origin/feature/${SPEC_ID}/overseer

# 3. Resolve conflicts manually
# <edit conflicted files>

# 4. Continue rebase
git add .
git rebase --continue

# 5. Force push (you own this branch)
git push --force-with-lease origin feature/${SPEC_ID}/impl-${AREA}

# 6. Notify overseer if conflicts were complex
# Add note in tasks.md or PR
```

### Work Overlap Between Implementors

**If two implementors need to modify the same file:**

1. **Overseer** identifies overlap during task decomposition
2. **Overseer** designates one implementor as primary owner
3. **Other implementor** coordinates with primary via tasks.md:
   ```markdown
   - @Implementor-A: I need to add auth middleware to routes.js. Can you commit your routing changes first?
   ```
4. **Primary owner** completes their section and merges to overseer
5. **Other implementor** rebases and continues

---

## Automated Scripts

### Create Overseer Branch
```bash
# .specify/scripts/create-overseer-branch.sh
#!/bin/bash
SPEC_ID=$1
git checkout main
git pull origin main
git checkout -b feature/${SPEC_ID}/overseer
mkdir -p state
cat > state/overseer.md << EOF
# Overseer State: Feature ${SPEC_ID}
...
EOF
git add state/
git commit -m "[${SPEC_ID}] Initialize overseer branch"
git push -u origin feature/${SPEC_ID}/overseer
echo "Overseer branch created: feature/${SPEC_ID}/overseer"
```

### Create Implementor Branch
```bash
# .specify/scripts/create-implementor-branch.sh
#!/bin/bash
SPEC_ID=$1
AREA=$2  # data|api|ui
git fetch origin
git checkout feature/${SPEC_ID}/overseer
git checkout -b feature/${SPEC_ID}/impl-${AREA}
mkdir -p state
cat > state/impl-${AREA}.md << EOF
# Implementor State: impl-${AREA}
...
EOF
git add state/
git commit -m "[${SPEC_ID}] Initialize impl-${AREA} branch"
git push -u origin feature/${SPEC_ID}/impl-${AREA}
echo "Implementor branch created: feature/${SPEC_ID}/impl-${AREA}"
```

### Daily Sync
```bash
# .specify/scripts/daily-sync.sh
#!/bin/bash
SPEC_ID=$1
CURRENT_BRANCH=$(git branch --show-current)

if [[ $CURRENT_BRANCH == *"/impl-"* ]]; then
  echo "Syncing implementor branch with overseer..."
  git fetch origin
  git rebase origin/feature/${SPEC_ID}/overseer
  echo "Sync complete!"
elif [[ $CURRENT_BRANCH == *"/overseer" ]]; then
  echo "Overseer branch detected. Pulling latest..."
  git pull origin feature/${SPEC_ID}/overseer
  echo "Pull complete!"
else
  echo "Not on a multi-agent branch. No sync needed."
fi
```

---

## Troubleshooting

### Agent Role Not Detected

**Symptom:** Agent doesn't know its role

**Solution:**
```bash
# Create role file
echo "overseer" > .claude/agent-role.local  # or implementor-a, etc.

# Verify
cat .claude/agent-role.local
```

### Implementor Can't Find Overseer Branch

**Symptom:** Git says overseer branch doesn't exist

**Solution:**
```bash
# Fetch all branches
git fetch origin

# List feature branches
git branch -r | grep feature/

# If still not found, check with overseer that branch was pushed
```

### Merge Conflicts During Rebase

**Symptom:** Git reports conflicts during rebase

**Solution:**
```bash
# Check which files have conflicts
git status

# Manually resolve conflicts in each file
# Look for <<<<<<, ======, >>>>>> markers

# After resolving
git add .
git rebase --continue

# If too complex, abort and ask overseer
git rebase --abort
# Then add @Overseer tag in tasks.md
```

### Tests Passing Locally But Failing in CI

**Symptom:** Local tests pass but PR shows test failures

**Solution:**
```bash
# Ensure you're testing against latest overseer
git fetch origin
git rebase origin/feature/${SPEC_ID}/overseer

# Run full test suite
npm run test:all

# Check for environment-specific issues
# Review CI logs for differences

# Notify overseer if unclear
# Add @Overseer note in tasks.md with CI log excerpt
```

---

## Weekly Housekeeping

### Overseer Weekly Tasks
- [ ] Archive completed specs to `.specify/completed/`
- [ ] Prune merged branches (after team confirmation)
- [ ] Reset state files for new cycle
- [ ] Review and update this runbook if patterns change
- [ ] Collect metrics: PRs merged, blockers encountered, resolution time

### Implementor Weekly Tasks
- [ ] Clean up personal state files before branch merge
- [ ] Review any carry-over tasks for next spec
- [ ] Share learnings or common issues with team

---

## Metrics and Improvement

Track these metrics to improve coordination:

**Overseer Tracks:**
- Time from spec to main merge
- Number of blockers encountered
- PR review turnaround time
- Integration test failure rate

**All Agents:**
- Communication response time
- Rebase frequency and conflict rate
- Task estimation accuracy

**Review Monthly:**
- Which coordination patterns work well?
- Where do delays occur?
- How can we parallelize better?
- What documentation needs updating?

---

## Quick Reference

### Branch Naming
- Overseer: `feature/<spec-id>/overseer`
- Implementor: `feature/<spec-id>/impl-<area>`

### Commit Format
```
[<spec-id>] Brief description

Longer explanation

Agent: <role>
```

### Status Update
```markdown
- <Role> → <commit-hash> — <status>
```

### Escalation
```markdown
@Overseer <question>
@Implementor-X <question>
```

### Key Files
- `CLAUDE.md` - High-level coordination rules
- `.specify/agents.md` - This runbook
- `.specify/tasks.md` - Task assignments and status
- `state/overseer.md` - Integration state
- `state/impl-<area>.md` - Implementation notes
- `.claude/agent-role.local` - Your role (gitignored)
