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
// 0. Process active visual effects lifecycles (Rule 25: Never get stuck on freeze)
this._updateVisualExplosions?.();
this._updateVisualEffects?.();

// 1. Mandatory freeze & time-stop guard
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

### 2. Upright Minimalist Skin Standard (Front POV) & Offscreen Caching (Rule 19 & 3.5)
- **Offscreen Canvas Caching (Gojo / Yuji / Sukuna Pattern)**: When rendering procedural pixel art bodies, ALWAYS rasterize once to an offscreen canvas (`_cachedFighterCanvas`) and blit via `ctx.drawImage`. NEVER call per-pixel `ctx.fillRect` loops inside the rotated game loop.
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

### 5. Mandatory In-Game Overlay HP & Status Drawing (Rule 21)
- If overriding `draw(ctx, opponent)`: ALWAYS call `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` at the end of the `draw()` pipeline.
- ALWAYS implement `drawBody(ctx) { draw[Name]Skin(ctx, this); }` so standard renderers, previews, and engine hooks work properly.

### 6. Mandatory Hair & Head Asset Model Import (Rule 22)
- ALWAYS import and load the character's dedicated hair asset (`Assets/model/<characterId>/<Name>-hair.png`) via module-level eager caching (`_get[Name]HairImage()`).
- Implement `_draw[Name]Hair(ctx, r, facingLeft)` supporting `state.skinCustomizations?.[characterId]` with `ctx.imageSmoothingEnabled = false;` and calibrated crown offsets (`-1.15r` to `-1.30r`).
- Register `assets.hair` inside `js/configs/characters/<name>Config.js`.

### 7. Mandatory Basic Projectile Suppression (Rule 23)
- Unless the character is explicitly a vanilla generic gun/bullet shooter, ALL fighter classes MUST override `shoot(ownerIndex)` with a blank method or custom melee/skill trigger:
  ```javascript
  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Character uses dedicated combat skills, weapons, or melee combos
  }
  ```
- This prevents the base `Fighter.update()` loop from spawning unwanted generic circular bullet projectiles during basic attack loops.

### 8. Mandatory Universal Character Body Model & Scale Standard (Rule 24 — Toji Reference Standard)
- **Primary Reference Standard (`tojiSkin.js`)**: ALWAYS use Toji's body model (`js/graphics/fighters/tojiSkin.js`) as the primary blueprint and gold standard for all new fighter body models.
- **Universal Baseline Body Radius**: All standard humanoid fighters MUST declare `r: 25, radius: 25` in `js/configs/characters/<name>Config.js` and in the fighter constructor.
- **1:1 Offscreen Canvas Buffer Architecture (Toji Standard)**:
  ```javascript
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;
  ```
- **Universal Vertical Proportions (Toji Baseline)**:
  - `ry < r * 0.28` to `0.32`: Face & head clean skin tone dome (upper 28–32% of radius, zero baked hair).
  - `r * 0.28 <= ry < r * 0.64` to `0.68`: Collar & upper torso / shirt / vest (full circle width).
  - `r * 0.64 <= ry < r * 0.78`: Waistband / belt band & buckle / knot frame.
  - `ry >= r * 0.78`: Lower trousers / hakama / skirt with fly seam & pleat creases ($Y \ge 24$).
- **Outer 4-Neighbor Ink Outline Shell**:
  - Always use Toji's 4-neighbor boundary test filled with `#0E0F14`.
- **Hair Scale & Crown Volume**:
  - `targetHairWidth = r * 2.80 - r * 3.10` and `targetHairHeight = r * 2.10 - r * 2.30`.
  - Crown apex anchor `drawY = -r * 1.30` to `-r * 1.45`.

### 9. Mandatory Non-Freezing Active Visual Effects & Particle Decay Standard (Rule 25)
- **Decay Before Freeze Guard**: Always update and decay transient visual effect arrays (explosions, slashes, particle bursts, shockwave rings) at the top of `update()` before `_handleTimeStop()`.
- **Interrupt / Death Cleanup**: Clear effect arrays or decouple them to world space on `interruptAttacks(forceCancelAll = true)` or defeat so visual effects never freeze or stay stuck on screen when character movement is stopped.
