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
