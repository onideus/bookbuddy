# bookbuddy-mk2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-25

## Active Technologies
- JavaScript ES2022+, Node.js 20+ LTS + Fastify (web framework), ioredis (Redis client), opossum (circuit breaker), axios/got (HTTP client with retry), fuzzball/string-similarity (fuzzy matching) (001-book-api-search)
- PostgreSQL (existing) + Redis (Docker Compose orchestrated) + pg_trgm extension for fuzzy text search (001-book-api-search)
- PostgreSQL 15+ (books, reading entries, progress updates, status history, reader profiles) (001-book-api-search)

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
- 002-book-api-search: Added JavaScript ES2022+, Node.js 20+ LTS + Fastify (web framework), ioredis (Redis client), opossum (circuit breaker), axios/got (HTTP client with retry), fuzzball/string-similarity (fuzzy matching)
- 001-book-api-search: Added JavaScript (ES2022+) for frontend and backend, Node.js 20+ LTS for server runtime
- 001-book-api-search: Added JavaScript ES2022+, Node.js 20+ LTS + Fastify (web framework), ioredis (Redis client), opossum (circuit breaker), axios/got (HTTP client with retry), fuzzball/string-similarity (fuzzy matching)


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
<!-- MANUAL ADDITIONS END -->
