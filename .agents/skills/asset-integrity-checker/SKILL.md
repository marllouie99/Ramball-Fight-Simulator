---
name: asset-integrity-checker
description: >-
  Use when adding or changing sprites, sprite sheets, animation frames, audio,
  VFX assets, fighter skins, weapon graphics, or asset paths in this project.
---

# Asset Integrity Checker

Use this skill whenever a change references `Assets/`, sprite rectangles, lazy image loaders, audio configuration, or custom visual effects.

## Phase 1: Validate Sources

1. Confirm every referenced path exists with the repository's exact casing and spacing.
2. Check whether the project expects forward-slash relative paths rooted at the workspace.
3. Reuse existing loaders and config keys instead of creating parallel asset registries.
4. Confirm fallback rendering or fallback audio remains valid when an asset is unavailable.

## Phase 2: Validate Sprite Sheets

For each changed sprite sheet:

- Verify frame rectangles have positive `sx`, `sy`, `sw`, and `sh` values.
- Verify adjacent frames do not overlap when the project test expects non-overlap.
- Preserve aspect ratio and anchor conventions used by neighboring renderers.
- Check idle and animated states separately.
- Keep Canvas `save()` and `restore()` balanced.

## Phase 3: Validate Audio and VFX

- Confirm sound keys exist in the correct audio config and skill registry.
- Confirm volume values use the local normalization pattern.
- Confirm death, interruption, reset, and round-end paths stop or clear effects.
- Avoid per-frame image, gradient, audio, or Pixi object allocation when a pool or lazy loader exists.

## Verification

Run the nearest focused interaction or renderer test, then:

```text
npm run verify
npm test
```

Report missing assets separately from code failures. Do not silently replace a missing project asset with an unrelated asset.
