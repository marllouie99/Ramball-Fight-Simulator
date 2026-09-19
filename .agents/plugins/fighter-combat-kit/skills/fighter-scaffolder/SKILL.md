---
name: fighter-scaffolder
description: Scaffold and implement a new fighter character adhering to all repository coding rules, upright minimalist skin standards, and WebGL rendering.
---

# Fighter Scaffolder Skill

Use this skill when introducing a new fighter character to ensure complete compliance with repository standards and prevent regressions.

## Step-by-Step Implementation Guide

### 1. Fighter Class Template (`update()` loop)
At the top of `update(opponent, ownerIndex, arena)`:
```javascript
const isFrozen = this._handleTimeStop();
if (isFrozen || this.isTargetOfAmbush) {
  this.interruptAttacks();
  return;
}
```

At the end of `update()`:
```javascript
// Delegate to base class centralized physics
super.update(opponent, ownerIndex, arena);
```

### 2. Upright Minimalist Skin Standard (Front POV)
- **Local Space Transform**: Rotate by `gunAngle` (or 0 during winner reveal), and flip Y when facing left:
  ```javascript
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ```
- **Facial Feature Prohibition**: NEVER draw eyes, pupils, mouth, or nose. Represent character identity through hair silhouette, headwear/eyewear, scars/markings, and clothing/collars.

### 3. Frontal Arc AOE Standards
- **Martial Arts / Brawlers**: 90° arc, ~65px reach.
- **Melee Weapon Users**: 120° - 160° arc, reach scaled to weapon length.
- Target query MUST check both `state.fighters` and `state.illusions`.

### 4. Performance & Rendering
- Avoid `ctx.shadowBlur` / `ctx.shadowColor` anywhere in rendering loops.
- Heavy persistent VFX (trails, spheres, full-screen dims) must use the PixiJS WebGL Hybrid Container Pattern.
- HUD skill bars must use unified character `themeColor`.
