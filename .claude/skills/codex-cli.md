---
skill: codex-cli
description: Query Codex via the local CLI (`codex exec`) to fetch answers or run Codex-powered automations directly from Claude Code.
triggers:
  - User invokes the /codex slash command
  - User asks to "ask Codex", "run Codex", or otherwise delegate a prompt to Codex
  - Need to compare Claude vs Codex answers or leverage Codex-only capabilities
  - Any time executing `codex exec "prompt"` would accelerate the task
---

# Codex CLI Skill

Use this skill whenever you need Codex to handle a prompt or action from inside Claude Code. It shells out to the Codex CLI so Claude can run `codex exec "..."` the same way the user would from a terminal.

## Workflow

1. **Capture the prompt**
   - Take everything after `/codex` (or an explicit user request) as the prompt to forward to Codex.
   - If the request spans multiple paragraphs/code blocks, keep the exact formatting so Codex receives the full context.

2. **Choose an invocation style**
   - **Simple/one-line prompt:** `codex exec "<prompt>"`
   - **Multi-line prompt:** prefer a heredoc to preserve newlines and quotes.

     ```bash
     codex exec "$(cat <<'PROMPT'
     <multi-line instructions, code, etc.>
     PROMPT
     )"
     ```

3. **Run the command**
   - Working directory: `/Users/zachmartin/projects/active/bookbuddy-mk3` unless the user specifies a different path.
   - Command: `codex exec ...`
   - Stream/record stdout & stderr. If Codex returns structured data, keep the formatting intact in the final response.

4. **Report results back to the user**
   - Quote or summarize Codex's answer depending on length.
   - Highlight any actionable steps or follow-ups Codex suggests.

5. **Error handling**
   - If `codex` is not installed or exits non-zero, capture the exact error message and share it with the user along with next steps (e.g., install instructions, retry guidance).

## Tips

- Validate the prompt content (e.g., file paths) before forwarding so Codex receives accurate context.
- Mention in your response that the answer originated from Codex to keep attribution clear.
- Keep prompts concise when possible—Codex performs best with focused, directive instructions.
- For iterative conversations, include relevant prior Codex output so it has continuity.

## Troubleshooting

- **`codex: command not found`**: Inform the user Codex CLI is missing and they need to install/configure it before the skill can run.
- **Authentication errors**: Surface Codex's exact message; the user may need to log in (`codex login`) or refresh credentials.
- **Long-running prompts**: Let the user know Codex is still processing if execution takes more than ~30 seconds, then follow up with the final output.

This skill enables seamless hand-offs between Claude Code and Codex so you can leverage both assistants without leaving the terminal.
