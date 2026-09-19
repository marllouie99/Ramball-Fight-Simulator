# Global Development Standards

These rules apply to ALL agent conversations on this project. They ensure consistency, cleanliness, and reliability across every session.

## Pre-Work Checklist (Start of Every Conversation)
1. **Read `AGENTS.md`** — Always read [`.agents/AGENTS.md`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md) at the start of any new conversation to internalize all 20+ coding rules.
2. **Check Knowledge Items** — Before researching architecture or patterns, check KIs and the MCP Memory graph for existing context snapshots.
3. **Read relevant skills** — If the task involves fighters, VFX, audio, or combat, read the corresponding skill's `SKILL.md` before writing code.

## During Work
4. **Batch-verify periodically** — After making multiple code edits, run `npm run verify` to catch regressions early. Don't wait until the very end.
5. **Never leave scratch files** — Any temporary files created in `scratch/`, `scripts/`, or root for debugging/testing MUST be deleted after use. Only permanent test harnesses (`testAllFighters.mjs`, `testTagMatch.mjs`, `verifyCodebase.js`) are allowed in `scripts/`.
6. **Follow anti-spaghetti rules** — Every function must stay under 60 lines. Extract helpers early. No deeply nested logic. See [anti-spaghetti.md](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/rules/anti-spaghetti.md).
7. **Use the MCP Memory graph** — After discovering important patterns, bugs, or architecture insights, store them in the `memory` MCP server so future conversations don't have to re-research.

## Post-Work Checklist (Before Concluding Any Task)
8. **Run `npm run verify`** — MANDATORY. Never conclude a task without a clean verification pass.
9. **Run `npm test`** — If fighter behavior was changed, run the full fighter test suite.
10. **Clean up artifacts** — Delete any scratch scripts, temp data files, or debugging artifacts created during the session.
11. **Update Memory Graph** — If you learned something important about the codebase architecture, store it as an entity/observation in the `memory` MCP server.
