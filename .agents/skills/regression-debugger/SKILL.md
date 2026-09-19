---
name: regression-debugger
description: >-
  Structured diagnostic playbook for investigating and fixing regressions,
  broken fighters, visual glitches, and runtime errors with zero collateral damage.
---

# Regression Debugger Skill

Use this skill when something **breaks** — a fighter stops moving, a visual effect glitches, a domain expansion crashes, audio cuts out unexpectedly, or `npm run verify` / `npm test` fails.

---

## Phase 1: Reproduce & Isolate

### Step 1.1 — Identify the Symptom
- What exactly is broken? (crash, visual glitch, behavior bug, performance drop)
- When did it start? (after which edit, which commit)
- Is it consistent or intermittent?

### Step 1.2 — Reproduce in Isolation
- Run `npm run verify` to get the exact error output.
- If it's a fighter-specific bug, run `npm test` and check which fighter test fails.
- If it's a visual bug, launch the game with `npm run preview` and navigate to the scenario that triggers it.

### Step 1.3 — Narrow the Scope
- Use `git diff` or review recent edits to identify what changed.
- If the bug appeared after editing file X, focus investigation on file X and its direct dependents.
- Check if the bug reproduces with the file reverted (mental revert — don't actually revert yet).

---

## Phase 2: Trace the Root Cause

### Step 2.1 — Follow the Call Stack
- Start from the symptom (e.g., "fighter doesn't move").
- Trace backward through the execution path:
  1. `update()` → Is it being called? Check early return guards (`_handleTimeStop`, `isTargetOfAmbush`).
  2. Movement → Is `applyMovementPhysics()` being called? Check `vx`/`vy` values.
  3. AI → Is the AI decision tree reaching the movement branch?

### Step 2.2 — Check Common Root Causes
Reference these known pitfalls from `AGENTS.md`:

| Symptom | Likely Root Cause | Rule |
| :--- | :--- | :--- |
| Fighter frozen during own ability | `applyTimeStop(this)` on self | Rule 5 |
| Fighter teleports but faces wrong way | Missing `this.aim(target)` after position set | Rule 3 |
| Melee only hits one target | Missing frontal arc AOE implementation | Rule 7/8 |
| FPS drops during combat | `shadowBlur` in render loop, or `new PIXI.Text` per frame | Rule 11/12 |
| Domain freezes wrong fighters | Generic `isEnemyDomainActive` check instead of explicit paralyze domain check | Rule 17 |
| Fighter ignores Infinity | Missing Infinity guard in fighter's attack path | Rule 9 |
| Position desyncs in domain | Off-screen canvas not synced to `state.canvas` dimensions | Rule 10 |
| Movement ignores slow/knockback | Manual `this.x += this.vx` instead of `applyMovementPhysics()` | Rule 1.1 |

### Step 2.3 — Verify the Hypothesis
- Add a temporary `console.log` at the suspected root cause location.
- Run the scenario and confirm the hypothesis with log output.
- Remove the `console.log` after confirming.

---

## Phase 3: Apply Minimal Fix

### Step 3.1 — Smallest Possible Change
- Fix ONLY the root cause. Do not refactor surrounding code in the same edit.
- If the fix requires more than 20 lines of changes, reconsider — you may be addressing a symptom, not the cause.

### Step 3.2 — Verify the Fix Doesn't Break Other Things
```bash
npm run verify   # Must pass clean
npm test         # Must pass all fighter tests
```

### Step 3.3 — Test Adjacent Scenarios
- If you fixed fighter A, also verify that fighter A's interactions with fighters B, C, D still work (especially if they share mechanics like domains, projectiles, or CC effects).

---

## Phase 4: Prevent Recurrence

### Step 4.1 — Add a Test Case
- Open `scripts/testAllFighters.mjs`.
- Add a specific test that would have caught this regression:
  ```javascript
  // Test: [Fighter] should not freeze during [ability]
  assert(fighter.timeStopTimer === 0, 'Fighter should not self-freeze during flurry');
  ```

### Step 4.2 — Update Knowledge
- If this bug revealed a new pattern or gotcha, store it in the MCP Memory graph:
  ```
  Entity: "Bug: [description]"
  Observations: ["Root cause: ...", "Fix: ...", "Prevention: ..."]
  ```

### Step 4.3 — Check for Similar Patterns
- Grep the codebase for the same anti-pattern in other files:
  ```bash
  grep -rn "applyTimeStop(this)" js/entities/fighters/
  ```
- Fix any other instances of the same bug pattern proactively.

---

## Quick Reference: Diagnostic Commands

| Command | Purpose |
| :--- | :--- |
| `npm run verify` | Full codebase verification (imports, exports, syntax) |
| `npm test` | All fighter integration tests |
| `npm run test:tag` | Tag matching system tests |
| `npm run preview` | Launch local web server for visual testing |
| `grep -rn "PATTERN" js/` | Search for code patterns across the codebase |

---

## Anti-Patterns to Avoid During Debugging

1. **Don't shotgun fix** — Never change 5 things at once hoping one fixes it. Change one thing, verify, repeat.
2. **Don't leave debug code** — Remove ALL `console.log`, `debugger`, and temporary variables.
3. **Don't fix symptoms** — If a fighter flickers, don't add `visibility` checks. Find why the render state is inconsistent.
4. **Don't skip verification** — Even if the fix "obviously works", run `npm run verify` and `npm test`.
5. **Don't create scratch files** — Debug in-place using browser dev tools or temporary logs that you immediately remove.
