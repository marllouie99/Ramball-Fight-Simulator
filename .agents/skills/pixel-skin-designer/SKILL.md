---
name: pixel-skin-designer
description: Design and code faceless, upright minimalist anime fighter skins, hair silhouettes, and weapon renderers adhering to repository art standards.
---

# Upright Minimalist Pixel Art Skin Playbook

Use this skill when designing or coding character skins, hair silhouettes, headwear, uniforms, and weapon renderers.

## Phase 1: Coordinate Frame & Upright POV Standards (Rule 19)
1. **Front Profile Upright POV**:
   - The fighter body model MUST always face the camera/player upright:
     - **`-Y` (Top)**: Hair crown, bangs, horns/crest, head accessories.
     - **`Y ~ 0` (Center)**: Eyewear (blindfolds, goggles, masks, stitches, scars).
     - **`+Y` (Bottom)**: Collar, neck opening, jacket/uniform, belt.
     - **`-X` / `+X` (Left / Right)**: Symmetrical ears, side hair locks, arms.
2. **Strict Facial Feature Prohibition**:
   - **NEVER** draw eyes, pupils, sclera, irises, eyelashes, mouths, lips, or nose bridges on fighter skins.
   - Convey identity exclusively through hair silhouettes, headwear/eyewear, iconic scars/stitches, and tailored clothing.

## Phase 2: Vertical Proportion Bands (Radius `r`)
- **`-r * 1.15` to `-r * 0.35`**: Outer hair volume and crown spikes (must extend slightly beyond body circle to break silhouette).
- **`-r * 0.35` to `0`**: Face area (forehead bangs, blindfolds, goggles, face stitches).
- **`0` to `+r * 0.40`**: Neck opening, collar, tie, and lapels.
- **`+r * 0.40` to `+r * 0.90`**: Torso, jacket body, belt, uniform hem.

## Phase 3: Local Transform & Hand Layering
1. **Transform Setup**:
   ```javascript
   ctx.save();
   ctx.translate(fighter.x, fighter.y);
   const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
   ctx.rotate(angle);
   if (Math.abs(angle) > Math.PI / 2) {
     ctx.scale(1, -1); // Keep hair on top and body on bottom when facing left
   }
   ```
2. **Layering Order**:
   - **Layer 1 (Behind Body)**: Back hand at `(r * 1.05, 0)` in idle stance.
   - **Layer 2 (Middle)**: Body circle, clothing, hair, and headwear.
   - **Layer 3 (Front)**: Front hand at guard center `(0, 0)` in idle stance.
   - **Layer 4 (Top-Most)**: Active held weapon and attack effects.

## Phase 4: Mandatory Offscreen Canvas Caching Pattern (Rule 3.5)
- **STRICT PROHIBITION**: NEVER call per-pixel `ctx.fillRect(px, py, P, P)` loops directly in the game loop while the canvas is rotated (`ctx.rotate(angle)`). Rotated sub-pixel rectangles create ugly "crisscross white grid lines / screen-door artifacts" and cause severe frame drops.
- **The Canonical Architecture (Gojo / Yuji / Sukuna Standard)**:
  ```javascript
  let _cachedCanvas = null;
  let _cachedR = 0;

  function _renderPixelBodyToCanvas(destCtx, r) {
    destCtx.imageSmoothingEnabled = false;
    const P = 2.0;
    const steps = Math.ceil((r + P) / P);
    const cx = destCtx.canvas.width / 2;
    const cy = destCtx.canvas.height / 2;

    destCtx.save();
    destCtx.translate(cx, cy);

    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const rx = gx * P;
        const ry = gy * P;
        if (Math.hypot(rx, ry) > r) continue;

        const px = rx - P / 2;
        const py = ry - P / 2;

        // 4-neighbor attached border test for solid dark manga ink outline
        const isBorder = (
          Math.hypot((gx + 1) * P, gy * P) > r ||
          Math.hypot((gx - 1) * P, gy * P) > r ||
          Math.hypot(gx * P, (gy + 1) * P) > r ||
          Math.hypot(gx * P, (gy - 1) * P) > r
        );

        if (isBorder) {
          destCtx.fillStyle = '#0E0F14';
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Apply clean solid stepped color zones (NO modulo dither noise)
        // ...
        destCtx.fillStyle = '#262039';
        destCtx.fillRect(px, py, P, P);
      }
    }
    destCtx.restore();
  }

  export function drawCharacterPixelBody(ctx, r) {
    if (typeof document === 'undefined') return;

    if (!_cachedCanvas || _cachedR !== r) {
      _cachedR = r;
      const P = 2.0;
      const steps = Math.ceil((r + P) / P);
      const size = (steps * 2 + 1) * P;

      _cachedCanvas = document.createElement('canvas');
      _cachedCanvas.width = size;
      _cachedCanvas.height = size;
      const offCtx = _cachedCanvas.getContext('2d');
      _renderPixelBodyToCanvas(offCtx, r);
    }

    if (_cachedCanvas) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(_cachedCanvas, -_cachedCanvas.width / 2, -_cachedCanvas.height / 2);
      ctx.restore();
    }
  }
  ```
