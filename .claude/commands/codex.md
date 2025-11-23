# Codex

## Description
Send any prompt directly to the Codex CLI (`codex exec`) from inside Claude Code. Use this when you want Codex to answer a question, draft code, or run an automation without leaving the workspace.

## Usage
```
/codex <prompt>
```
Everything after `/codex` becomes the prompt forwarded to Codex. Multi-line prompts are supported.

## Behavior
- Invokes the **Codex CLI Skill** (`.claude/skills/codex-cli.md`).
- Claude captures your prompt, runs `codex exec` from the repo root, and relays Codex's response back in the chat.
- If the Codex CLI is unavailable or errors, Claude surfaces the stderr output and suggested fixes.

## Examples
```
/codex Summarize the testing strategy used in this repo.

/codex Provide a TypeScript function that validates ISBN-13 numbers.

/codex <<'PROMPT'
Review the following diff and explain potential bugs:
@@ code diff here @@
PROMPT
```

## Notes
- Keep prompts focused when possible—Codex performs best with clear instructions.
- Mention any repo paths or files Codex should inspect (e.g., `Look at services/books/service.ts`).
- Claude will attribute the response to Codex so the origin of the answer is always clear.
