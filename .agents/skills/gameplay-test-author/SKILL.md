---
name: gameplay-test-author
description: >-
  Use when implementing or validating a gameplay mechanic, fighter interaction,
  plant behavior, projectile effect, status effect, AI rule, or regression fix.
---

# Gameplay Test Author

Use this skill to create the smallest regression test that proves a gameplay request without requiring a browser session.

## Phase 1: Select the Harness

- Use `scripts/testInteractions.mjs` for cross-fighter, projectile, plant, status, collision, and domain behavior.
- Use `scripts/testAllFighters.mjs` for fighter-wide runtime, reset, rendering, and shared lifecycle behavior.
- Use `scripts/testTagMatch.mjs` for relay and tag-mode rules.
- Prefer an existing nearby test block over creating a new test file.

## Phase 2: Build a Discriminating Case

Every new test should include:

1. A minimal actor and target setup.
2. A before-state assertion when useful.
3. One direct call to the controlling method or one simulation step.
4. An assertion on the requested state change.
5. At least one negative assertion for a nearby invalid case.
6. Cleanup of `state.fighters`, projectiles, illusions, and timers changed by the test.

Test boundaries that commonly regress:

- Same-team and owner filtering.
- Dead or zero-HP entities.
- Fixed-position plants and deployables.
- Status refreshes that happen every frame.
- Round reset and constructor defaults.
- Canvas `save()`/`restore()` balance.

## Phase 3: Run Focused First

Run the narrowest relevant command immediately after editing:

```text
npm run test:interactions
```

Then run the broader command required by the blast radius:

```text
npm test
npm run verify
```

Use direct assertions with clear messages. Do not weaken an assertion merely to make the suite pass; update it only when the behavior contract intentionally changed.

## Completion Criteria

A gameplay change is complete only when the focused test passes, the relevant broader suite passes, and no new diagnostics remain in touched files.
