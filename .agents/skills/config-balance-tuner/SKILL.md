---
name: config-balance-tuner
description: >-
  Use when tuning fighter stats, skill timing, damage, ranges, cooldowns, radii,
  status durations, AI thresholds, plant behavior, or balance configuration.
---

# Config and Balance Tuner

Use this skill when a gameplay request includes words such as damage, radius, range, duration, cooldown, speed, immunity, threshold, cost, or spawn offset.

## Phase 1: Find the Source of Truth

1. Locate the relevant character config under `js/configs/characters/`.
2. Check whether a balance manager or shared config overrides the value at runtime.
3. Find the getter or fallback pattern used by the owning entity.
4. Check related boss or tactical configs only when the same mechanic is shared.

## Phase 2: Tune Safely

- Add a named config value when a number is intended to be tunable.
- Preserve current defaults unless the request explicitly changes them.
- Use `??` when zero is a valid value; avoid `||` for valid zero settings.
- Keep units obvious in names and comments: `Frames`, `Radius`, `Damage`, `Offset`, or `Multiplier`.
- Check interactions with hitbox radius, arena bounds, fixed anchors, and cooldown decrement logic.
- Do not edit generated patch-note or unrelated metadata files unless requested.

## Phase 3: Test the Contract

Add or update a focused assertion proving the configured value is actually consumed by runtime code. Include boundary cases when relevant, such as zero offset, disabled skill, maximum radius, or expired duration.

Run:

```text
npm run test:interactions
npm test
npm run verify
```

Review the final diff for unrelated changes and check that config comments still describe the actual behavior.
