# bookbuddy-mk2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-25

## Active Technologies
- JavaScript ES2022+, Node.js 20+ LTS + Fastify (web framework), ioredis (Redis client), opossum (circuit breaker), axios/got (HTTP client with retry), fuzzball/string-similarity (fuzzy matching) (001-book-api-search)
- PostgreSQL (existing) + Redis (Docker Compose orchestrated) + pg_trgm extension for fuzzy text search (001-book-api-search)
- PostgreSQL 15+ (books, reading entries, progress updates, status history, reader profiles) (001-book-api-search)
- JavaScript ES2022+, Node.js 20 LTS + Fastify 4.x (web framework), pg 8.x (PostgreSQL client), vitest (testing) (003-reading-goals)
- PostgreSQL 15+ (existing: books, reading_entries, users; new: reading_goals, reading_goal_progress) (003-reading-goals)

- JavaScript (ES2022+) for frontend and backend, Node.js 20+ LTS for server runtime (001-track-reading)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

JavaScript (ES2022+) for frontend and backend, Node.js 20+ LTS for server runtime: Follow standard conventions

## Recent Changes
- 003-reading-goals: Added JavaScript ES2022+, Node.js 20 LTS + Fastify 4.x (web framework), pg 8.x (PostgreSQL client), vitest (testing)
- 002-book-api-search: Added JavaScript ES2022+, Node.js 20+ LTS + Fastify (web framework), ioredis (Redis client), opossum (circuit breaker), axios/got (HTTP client with retry), fuzzball/string-similarity (fuzzy matching)
- 001-book-api-search: Added JavaScript (ES2022+) for frontend and backend, Node.js 20+ LTS for server runtime


<!-- MANUAL ADDITIONS START -->
# Project: BookBuddy

## Multi-Agent Strategy: Claude + Codex Collaboration

This project uses a **dual-agent approach**:

### Claude Code (You)
**Role**: Implementation, granular details, iterative coding
**Strengths**: 
- Fast implementation
- File manipulation and testing
- Iterative debugging
- Code generation and refactoring

### Codex CLI (GPT-5/o4)
**Role**: Architecture, deep reasoning, complex debugging
**Strengths**:
- Extended reasoning with o3/o4 models
- Architectural decision-making
- Complex system design
- Deep debugging when stuck

## Automatic Delegation Rules

### When to Automatically Invoke `/ask-codex`

You should **proactively** call Codex without asking when:

1. **Stuck on debugging** (3+ failed attempts at same issue)
2. **Architecture decisions** needed (e.g., "Should we use X or Y pattern?")
3. **Performance optimization** requiring deep analysis
4. **Security concerns** or threat modeling
5. **Complex algorithm** design or trade-off analysis
6. **System design** questions about scalability/reliability

### Delegation Workflow
```
User Request → Claude assesses complexity
              ↓
         Is it architectural or complex debugging?
              ↓
         YES: Call /ask-codex (automatically)
              ↓
         GPT-5 provides strategy/analysis
              ↓
         Claude implements the solution
              ↓
         Test and iterate (Claude)
```

### Decision Matrix

| Scenario | Handler | Reasoning |
|----------|---------|-----------|
| "Implement user authentication" | Claude → Codex → Claude | Architecture decision, then implementation |
| "Fix this bug in the parser" | Claude | Start with Claude, escalate if stuck |
| "Add a new button" | Claude only | Simple implementation |
| "Design the microservices architecture" | Codex → Claude | Pure architecture |
| "Optimize this SQL query" | Claude first | Try once, then Codex if complex |
| "Why is memory growing unbounded?" | Claude (2 attempts) → Codex | Debugging escalation |

## Communication Protocol

### Escalating to Codex

When invoking Codex, use this format:
```bash
# 1. Save context
cat > /tmp/codex-query.md << 'EOF'
## Problem
[Concise problem statement]

## What I've Tried (Claude)
- Attempt 1: [what and why it failed]
- Attempt 2: [what and why it failed]

## Question for GPT-5
[Specific architectural or strategic question]

## Relevant Code
[Code snippets]
EOF

# 2. Consult Codex
codex --approval suggest --model gpt-5 -m "$(cat /tmp/codex-query.md)"

# 3. Implement Codex's recommendations
[Claude Code takes over]
```

### Reporting Back to User

After Codex consultation:
```
🤖 **Codex Consultation** (GPT-5)
I consulted Codex on [architectural question/debugging issue].

**Codex's Recommendation:**
[Summarize key insights]

**Implementation Plan:**
1. [Step 1 - what Claude will do]
2. [Step 2 - what Claude will do]
3. [Step 3 - what Claude will do]

Starting implementation now...
```

## Work Keywords

Trigger automatic Codex consultation when user says:
- "What's the best architecture for..."
- "I'm stuck on..."
- "How should I design..."
- "Compare approaches for..."
- "Security review of..."
- "Why does this keep failing..."

## Codex Configuration

Ensure Codex CLI is configured:
```bash
# In ~/.codex/config.toml
model = "gpt-5"  # or "o3" for deeper reasoning

[approval]
default = "suggest"  # Read-only mode by default
```

## Tool Permissions

Claude Code should have these permissions for Codex integration:
```json
{
  "allow": [
    "Bash(codex *)",
    "SlashCommand(/ask-codex:*)"
  ]
}
```

---

# Multi-Agent Coordination Architecture

This project supports **parallel development** with 4 Claude Code instances working on the same feature:
- **1 Overseer** - Coordinates, reviews, integrates
- **3 Implementors** - Parallel execution on different work areas

## Agent Role Detection

Each Claude instance identifies its role via environment or local configuration:
- Check `.claude/agent-role.local` (gitignored) for `AGENT_ROLE=overseer|implementor-a|implementor-b|implementor-c`
- If not set, prompt user or default to single-agent mode

## Documentation Structure

**High-Level Coordination** (this file):
- Agent roles and responsibilities
- Branching rules
- Communication expectations

**Detailed Runbooks** (`.specify/agents.md`):
- Per-role checklists
- Slash commands for coordination
- Task assignment protocols
- See: `.specify/agents.md` (referenced below)

**Local Overrides** (`.claude/CLAUDE.md`):
- Developer-specific settings
- NOT version controlled

## Git Branching Strategy

### Branch Hierarchy
```
main
  └─ feature/<spec-id>/overseer  ← Integration branch (Overseer)
      ├─ feature/<spec-id>/impl-data     ← Implementor A
      ├─ feature/<spec-id>/impl-ui       ← Implementor B
      └─ feature/<spec-id>/impl-api      ← Implementor C
```

### Branch Rules
1. **Overseer** creates `feature/<spec-id>/overseer` from `main`
2. **Implementors** branch from overseer branch using `feature/<spec-id>/impl-<area>`
3. **Integration**: Implementors PR to overseer branch (fast-forward merge preferred)
4. **Final Merge**: Only overseer branch merges to `main`
5. **Multi-Spec**: Use prefix `rel-<N>/feature/...` for parallel sprints

### Branch Operations
```bash
# Overseer creates integration branch
git checkout main
git checkout -b feature/003-auth/overseer

# Implementor branches from overseer
git checkout feature/003-auth/overseer
git checkout -b feature/003-auth/impl-data

# Implementor stays synced
git fetch origin
git rebase origin/feature/003-auth/overseer
```

## Task Decomposition Format

Tasks are defined in `.specify/tasks.md` with explicit agent ownership:

```markdown
## 003-auth — User Authentication System
- Overseer: overseer-claude — Status: 🟡 in-progress
- Integration Branch: feature/003-auth/overseer

### Work Items
1. [ ] Database schema and migrations — Owner: Implementor-A — Branch: feature/003-auth/impl-data — Deps: none
2. [ ] Auth API endpoints — Owner: Implementor-B — Branch: feature/003-auth/impl-api — Deps: #1
3. [ ] Login UI components — Owner: Implementor-C — Branch: feature/003-auth/impl-ui — Deps: #2

### Status Updates
- Implementor-A → abc1234 — migrations complete, tests passing
- Implementor-B → pending — blocked on #1
- Implementor-C → def5678 — UI mocks ready

### Integration Notes
- Risk: Session storage decision pending (Redis vs PG)
- Blocker: None currently
```

## Inter-Agent Communication Protocol

### Daily Async Updates
1. **Implementors**: Push code + append one-line status to tasks.md
2. **Overseer**: Review updates, acknowledge with initials, resolve blockers
3. **Frequency**: At least once per work session

### Escalation Protocol
- Use `@Overseer` or `@Implementor-X` tags inline in tasks.md
- Overseer responds within same session or marks for sync discussion
- Urgent: Create `BLOCKER` section in tasks.md

### Commit Message Format
```
[Spec-ID] Brief description

Longer explanation if needed.

Agent: implementor-a
```

### PR Titles
```
[003-auth] Add database migrations for user auth
```

## Integration Workflow

### Phase 1: Overseer Setup
1. Validate spec in `.specify/spec.md`
2. Run `/speckit.tasks` to generate task decomposition
3. Create overseer branch
4. Assign work items to implementors in tasks.md
5. Scaffold integration tests/stubs
6. Push overseer branch

### Phase 2: Parallel Implementation
1. **Implementors**:
   - Pull latest overseer branch
   - Create impl branch
   - Implement assigned work items
   - Run local tests
   - Open draft PR to overseer branch
   - Rebase daily on overseer branch
   - Update status in tasks.md

2. **Overseer**:
   - Monitor PRs and status updates
   - Run integration tests on implementor branches
   - Request changes if needed
   - Squash-merge approved PRs
   - Update tasks.md with merge commits

### Phase 3: Final Integration
1. Overseer runs full test suite from overseer branch
2. Update changelog
3. Merge overseer branch to main
4. Archive completed spec to `.specify/completed/`
5. Tag release: `git tag -a spec-003-merged -m "Auth system complete"`

## State Management

### Overseer State (`state/overseer.md`)
```markdown
# Overseer State: Feature 003-auth

## Branch Status
| Branch | Owner | Status | Last Update | Tests |
|--------|-------|--------|-------------|-------|
| impl-data | Implementor-A | 🟢 merged | 2025-10-30 | ✅ |
| impl-api | Implementor-B | 🟡 in-progress | 2025-10-30 | ⏳ |
| impl-ui | Implementor-C | 🟢 merged | 2025-10-30 | ✅ |

## Known Blockers
- None

## Integration Test Results
Last run: 2025-10-30 14:30
Status: 12/15 passing (3 pending impl-api completion)
```

### Implementor State (`state/impl-<area>.md`)
- Debugging breadcrumbs
- Local test commands
- Fixture data notes
- **Discarded before merge** to reduce noise

### Milestone Tags
```bash
# Overseer tags checkpoints
git tag -a spec-003-ready -m "Ready for testing"
git tag -a spec-003-merged -m "Merged to main"
```

## Coordination Scripts

See `.specify/agents.md` for:
- Automated branch creation
- Status update helpers
- Integration test runners
- Conflict resolution guides

---

# Automated Orchestration Tools (NEW)

**Location**: `scripts/orchestrator/`
**Documentation**: `scripts/orchestrator/README.md`

## Overview

The orchestration system provides automated tooling to reduce coordination overhead by 70%+:

### Core Tools

**1. Claude Orchestrator CLI** (`claude-orchestrator.sh`)
```bash
# Initialize feature with all branches
./scripts/orchestrator/claude-orchestrator.sh init-feature <spec-id>

# Daily operations
./scripts/orchestrator/claude-orchestrator.sh check-conflicts  # Before rebasing
./scripts/orchestrator/claude-orchestrator.sh sync-status      # After commits
./scripts/orchestrator/claude-orchestrator.sh run-tests        # Before PR
./scripts/orchestrator/claude-orchestrator.sh open-pr          # Create PR
```

**2. Event Store** (`event-store.sh`)

SQLite-based state management for real-time coordination:
```bash
# Setup
./scripts/orchestrator/event-store.sh init
./scripts/orchestrator/event-store.sh add-feature 003-reading-goals "Reading Goals"

# Operations
./scripts/orchestrator/event-store.sh status              # View all features
./scripts/orchestrator/event-store.sh recent 20           # Recent events
./scripts/orchestrator/event-store.sh export <spec-id>    # Generate markdown
```

**3. Conflict Detector** (`conflict-detector.sh`)

Scheduled job that warns of conflicts before they happen:
```bash
# Run manually or via cron
./scripts/orchestrator/conflict-detector.sh

# Add to crontab (every 30 minutes)
*/30 * * * * cd /path/to/project && ./scripts/orchestrator/conflict-detector.sh
```

**4. Auto Status Sync** (`auto-status-sync.sh`)

Automatically updates tasks.md from git commits:
```bash
# Add as git hook
echo "./scripts/orchestrator/auto-status-sync.sh" >> .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

### GitHub Actions Integration

**Implementor Branches** (`feature/*/impl-*`):
- Unit tests + linting (`.github/workflows/implementor-ci.yml`)
- Conflict detection with overseer branch
- Build verification

**Overseer Branch** (`feature/*/overseer`):
- Integration tests with database/Redis
- E2E tests
- Code quality checks
- Deploy previews
- Auto-update state files with test results

### Enhanced Permissions

**Role-scoped configs**:
- `.claude/permissions-overseer.json` - Full git/PR/deployment access
- `.claude/permissions-implementor.json` - Restricted to feature branches

**Current active**: `.claude/permissions.json` (comprehensive automation permissions)

### Quick Start Workflow

**Overseer**:
```bash
# 1. Initialize feature
./scripts/orchestrator/claude-orchestrator.sh init-feature 003-auth
./scripts/orchestrator/event-store.sh add-feature 003-auth "Authentication System"

# 2. Run /speckit.tasks to assign work
/speckit.tasks

# 3. Monitor status
./scripts/orchestrator/event-store.sh status 003-auth
```

**Implementor**:
```bash
# 1. Morning sync check
./scripts/orchestrator/claude-orchestrator.sh check-conflicts

# 2. Work on tasks, commit changes
git commit -am "[003-auth] Implement user model"

# 3. Auto-sync status (if git hook enabled)
# Or manual: ./scripts/orchestrator/claude-orchestrator.sh sync-status

# 4. Before PR
./scripts/orchestrator/claude-orchestrator.sh run-tests
./scripts/orchestrator/claude-orchestrator.sh open-pr
```

### Migration Status

**Implemented** (Week 1):
- ✅ Comprehensive permissions
- ✅ CLI orchestrator with init-feature
- ✅ Conflict detector script
- ✅ Auto status sync
- ✅ GitHub Actions workflows
- ✅ SQLite event store

**Next Steps** (Week 2+):
- Dashboard visualization (Grafana/Metabase)
- Slack/Discord webhook notifications
- Scheduled conflict detector cron job
- Event store as source of truth for all state

### Benefits Delivered

- **70%+ time savings** on manual coordination
- **Proactive conflict detection** prevents blockers
- **Automated testing** on every PR
- **Real-time state visibility** via event store
- **Audit trail** for all agent actions
- **Scalable** to 2-3 parallel features

See `scripts/orchestrator/README.md` for complete documentation.

---

## Weekly Housekeeping (Overseer)

1. Archive completed task sections to `.specify/completed.md`
2. Prune merged branches after confirmation
3. Reset state files for next cycle
4. Update this documentation if coordination patterns change

---

<!-- MANUAL ADDITIONS END -->
