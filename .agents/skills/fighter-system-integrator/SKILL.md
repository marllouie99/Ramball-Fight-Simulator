---
name: fighter-system-integrator
description: >-
  Use when changing interactions between fighters, plants, minions, projectiles,
  status effects, domains, teams, summons, or shared combat helpers in this project.
---

# Fighter System Integrator

Use this skill for cross-entity behavior such as "make Purple pull plants", "make Mahoraga adapt to Torchwood", or "prevent friendly fire".

## Phase 1: Find the Owner

1. Start at the requested behavior and locate the code that directly mutates state.
2. Follow one hop to shared contracts such as `Fighter.takeDamage()`, status managers, projectile behaviors, physics helpers, or `state.fighters`.
3. Identify the nearest existing pattern for the same interaction before adding a new flag or helper.

## Phase 2: Preserve Contracts

- Pass the real attacker as the second argument to `takeDamage()`.
- Preserve team checks through `isTeammate()` or the existing team helper.
- Respect `hp`, `dead`, `isPlant`, `isPlantMinion`, `owner`, and `isDeployable` filters.
- Keep per-frame mutations compatible with `update()` methods and fixed anchors such as `_fixedX` and `_fixedY`.
- Reset new state in both the constructor and round `reset()` path.
- Prefer config values through `CONFIG` and existing getter helpers over magic numbers.

## Phase 3: Implement Narrowly

1. Change the owning abstraction, not every caller.
2. Reuse existing status, damage, pull, collision, and VFX APIs.
3. Add explicit source flags when behavior must distinguish Torchwood, Purple, a domain, or another named mechanic.
4. Avoid broad changes to shared immunity helpers unless the requested interaction is intentionally source-specific.

## Phase 4: Verify

Add a focused test covering:

- The requested interaction occurs.
- Allies, plants, dead entities, and out-of-range entities remain correctly filtered.
- The effect does not refresh or duplicate every frame.
- Round reset removes the new state.

Run:

```text
npm run test:interactions
npm test
npm run verify
```

Stop and inspect the nearest caller if a focused test fails before widening the change.
