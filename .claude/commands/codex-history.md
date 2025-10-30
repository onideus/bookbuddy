---
description: Review past Codex consultations to learn from architectural decisions
---

# Codex Consultation History

Review past consultations with Codex CLI:
```bash
# Show recent Codex interactions
grep -r "codex -a" ~/.claude/history/ | tail -20

# Or check logs
cat ~/.codex/logs/latest.log
```

This helps track:
- When Codex was consulted
- What questions were asked
- What recommendations were implemented
