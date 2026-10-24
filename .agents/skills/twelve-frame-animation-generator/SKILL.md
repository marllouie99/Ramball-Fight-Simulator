---
name: twelve-frame-animation-generator
description: Generate, extract, format, and integrate 12-frame visual animations and sprite sequences (explosions, slashes, impacts, energy bursts) into the combat engine by taking reference on the Reze explosion directory structure (Assets/model/reze/explosion/) and copying its file naming, frame calibration, and rendering pipeline standards.
---

# 💥 12-Frame Visual Animation & Sprite Sequence Generator (`twelve-frame-animation-generator`)

Use this skill whenever the user asks to generate, extract, format, animate, or integrate a **12-frame visual animation** (explosions, bursts, slashes, shockwaves, or spell impacts). The agent **MUST ALWAYS take direct reference from the canonical Reze explosion file location (`Assets/model/reze/explosion/`) and strictly copy its folder structure, file naming format, bounding box calibration, and 60 FPS combat rendering pipeline**.

---

## 1. Canonical Reference Architecture (The Reze Model)

All 12-frame visual sequences in this repository follow the exact architecture established by **Reze's Bomb Devil explosion asset pipeline**:

```text
Assets/model/<characterId>/<effectName>/
├── <effectName>-1.png     # Frame 1: Ignition spark / origin point
├── <effectName>-2.png     # Frame 2: Vertical/directional elongation
├── <effectName>-3.png     # Frame 3: Early bubble expansion
├── <effectName>-4.png     # Frame 4: Fireball dome / core development
├── <effectName>-5.png     # Frame 5: Peak volume / breakout shockwave
├── <effectName>-6.png     # Frame 6: White-hot dual spheres / Mach wave
├── <effectName>-7.png     # Frame 7: Supersonic perimeter compression ring
├── <effectName>-8.png     # Frame 8: Crater puff / perimeter expansion
├── <effectName>-9.png     # Frame 9: Cooling smoke cloud clusters
├── <effectName>-10.png    # Frame 10: Dispersing smoke puffs & embers
├── <effectName>-11.png    # Frame 11: Dissolving ring fragments
├── <effectName>-12.png    # Frame 12: Final residue embers / dissipation
└── <effectName>-b.png     # Master horizontal strip (12 cells: 3072×256px)
```

### The Reference Source of Truth
- **Explosion & Detonation Baseline**: `Assets/model/reze/explosion/`
  - Frames: `explosion-1.png` through `explosion-12.png`
  - Master Strip: `explosion-b.png` ($3072 \times 256\text{px}$)
  - Config Reference: `js/configs/characters/rezeConfig.js` (`assets.explosion`)
  - Weapon Graphics Renderer: `js/graphics/weapons/rezeWeaponGraphics.js` (`_getRezeExplosionFrames`, `_drawRezeAnimatedExplosionSprite`)
  - Fighter Entity Dispatch: `js/entities/fighters/RezeFighter.js` (`activePalmBlasts`, `activeNukeBlasts`)
- **Weapon Slash Attack Baseline (MANDATORY FOR MELEE/SWORDS)**: `Assets/effects/Slash Attack/`
  - Whenever generating or implementing an animation for any melee attack or sword slash, the agent **MUST ALWAYS look for `Assets/effects/Slash Attack/` FIRST**!
  - See dedicated skill [`slash-animation-generator`](../slash-animation-generator/SKILL.md).
  - Frames: `slash-1.png` through `slash-12.png`, master strip `slash-b.png` ($3072 \times 256\text{px}$).
  - Must spawn at the weapon tip (`get[Weapon]TipWorldPos()`), anchored at `(95, 135)`, and trail strictly behind the cutting blade.

---

## 2. Asset Standards & Formatting Specifications

When generating, extracting, or formatting a new 12-frame visual animation:

### 2.1 File Naming & Directory Rules
1. **Directory**: Always store the frames in `Assets/model/<characterId>/<effectName>/`.
2. **Individual Frames**: Number them 1-indexed from `1` to `12` with hyphenation:
   - `<effectName>-1.png`, `<effectName>-2.png`, ..., `<effectName>-12.png`.
   - Never use zero-padding (e.g. use `explosion-1.png`, NOT `explosion-01.png`).
3. **Horizontal Strip**: Always save a composite 12-cell horizontal strip `<effectName>-b.png` (or `<effectName>-sheet.png`) at width $12 \times \text{cellWidth}$ by $\text{cellHeight}$ (e.g., $3072 \times 256\text{px}$) for atlas preview and WebGL compatibility.

### 2.2 Image Dimensions & Alpha Standards
- **Uniform Square Resolution**: Each individual frame cell MUST be a square power-of-two or clean grid (canonical baseline: $256 \times 256\text{px}$).
- **100% Alpha Cleanliness & Zero-Cropping Standard (Rule 31)**:
  - Background MUST be 100% transparent RGBA (`png`). Zero dither artifacts, zero window frame borders, and zero background halos.
  - **MANDATORY ANTI-RECTANGULAR CLIPPING RULE**: Visual elements MUST NEVER touch the frame boundary (`y = 0`, `y = height - 1`, `x = 0`). Maintain at least 15–30px of pure transparent padding so effects never render with ugly, razor-sharp rectangular box edges.
  - For directional travel beams, only the forward-extending edge may meet the travel border; non-travel borders must remain 100% transparent.
- **Pixel Art Fidelity**: Maintain nearest-neighbor pixel aesthetics (`ctx.imageSmoothingEnabled = false;`). Never apply blur filters to pixel art frames.

### 2.3 Centering & Anchor Calibration
- **Detonation Origin**: Detonation or strike epicenter MUST be anchored at the center of the frame (canonical: $(128, 128)$ for $256 \times 256\text{px}$, or calibrated $(cx, cy)$).
- **Anti-Wobble Check**: Across frames 1 to 12, the physical centroid of expanding shapes must remain stable to prevent unwanted jitter or off-center drift.

### 2.4 The 12-Phase Kinematic Progression

| Frame | Detonation Phase | Visual Features | Opacity & Easing |
|---|---|---|---|
| **1** | Point Ignition | Bright ignition spark, tiny diamond glint ($32\times 46\text{px}$) | Solid 100% |
| **2** | Directional Stretch | Vertical supersonic elongation, high aspect ratio | Solid 100% |
| **3** | Bubble Expansion | Rapid radial fireball expansion, jagged rim edges | Solid 100% |
| **4** | Plasma Dome | Dense fireball cloud, white-hot core ($182\times 196\text{px}$) | Solid 100% |
| **5** | Peak Fireball | Maximum volumetric explosion body ($214\times 210\text{px}$) | Solid 100% |
| **6** | Dual White Spheres | Core splits into intense secondary white-hot combustion nodes | Solid 100% |
| **7** | Shockwave Ring | Supersonic compression band breaks out around perimeter | Solid 100% |
| **8** | Crater Puff | Center begins cooling, outer smoke puffs expand | Solid 100% |
| **9** | Cooling Clusters | Fiery orange transitions to charcoal/smoke clumps | Solid 100% |
| **10** | Dissolving Smoke | Smoke clouds break apart, gaps appear ($p > 0.82$) | Linear fade-out start |
| **11** | Ring Residue | Broken perimeter ring crumbs, cooling embers | $50\%$ fade-out |
| **12** | Final Embers | Tiny dispersing spark points, complete dissolution | Dissolves to 0% |

---

## 3. Character Config Registration Standard

Register the 12-frame asset in `js/configs/characters/<name>Config.js` under the `assets` dictionary:

```javascript
export const [name]Config = {
  assets: {
    hair: 'Assets/model/<characterId>/<Name>-hair.png',
    skin: 'Assets/model/<characterId>/<NAME>-MODEL-SKIN.png',
    weapon: 'Assets/model/<characterId>/<NAME>-WEAPON.png',
    // 12-Frame Animation Master Strip Reference
    explosion: 'Assets/model/<characterId>/<effectName>/<effectName>-b.png',
  },
  ...
};
```

---

## 4. Weapon Graphics Module Implementation

In `js/graphics/weapons/<name>WeaponGraphics.js`, implement the canonical image cache, preloader, and nearest-neighbor sprite renderer:

### 4.1 Frame Preloading Boilerplate
```javascript
const [NAME]_[EFFECT]_FRAME_COUNT = 12;
const [NAME]_[EFFECT]_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/<characterId>/<effectName>/<effectName>-${i + 1}.png`
);

let _[name][Effect]Frames = [];
let _[name][Effect]FramesLoading = false;

export function _get[Name][Effect]Frames() {
  if (
    _[name][Effect]Frames.length === [NAME]_[EFFECT]_FRAME_COUNT &&
    _[name][Effect]Frames.every(img => img && img.complete && img.naturalWidth > 0)
  ) {
    return _[name][Effect]Frames;
  }
  if (!_[name][Effect]FramesLoading && typeof Image !== 'undefined') {
    _[name][Effect]FramesLoading = true;
    _[name][Effect]Frames = [];
    [NAME]_[EFFECT]_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _[name][Effect]Frames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load [Name] frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _[name][Effect]Frames[idx] = img;
    });
  }
  return _[name][Effect]Frames;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _get[Name][Effect]Frames();
}
```

### 4.2 Sprite Renderer Function
```javascript
/**
 * Draws the 12-frame retro pixel art animation sprite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} maxR Effect radius in arena pixels
 * @param {number} p Progress 0.0 to 1.0 (elapsed / maxTimer)
 * @param {number} alpha Base opacity
 * @returns {boolean} True if frame was successfully rendered
 */
function _draw[Name]Animated[Effect]Sprite(ctx, maxR, p, alpha) {
  const frames = _get[Name][Effect]Frames();
  const frameIndex = Math.min(11, Math.max(0, Math.floor(p * 12)));
  const frameImg = frames[frameIndex];

  if (!frameImg || !frameImg.complete || frameImg.naturalWidth <= 0) {
    return false;
  }

  const prevSmoothing = ctx.imageSmoothingEnabled;
  const prevAlpha = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;

  // Natural fade-out on late dissipating frames (frames 1-9 solid, 10-12 dissolve)
  const fadeAlpha = p > 0.82 ? Math.max(0, (1.0 - p) / 0.18) : 1.0;
  ctx.globalAlpha = prevAlpha * fadeAlpha;

  // Frame is 256x256px with detonation center calibrated at (126, 118)
  const scale = (maxR * 1.10) / 105.0;
  const drawW = 256 * scale;
  const drawH = 256 * scale;
  const anchorX = 126 * scale;
  const anchorY = 118 * scale;

  ctx.drawImage(frameImg, -anchorX, -anchorY, drawW, drawH);

  // Restore context state cleanly (Rule 2.4 Stack Integrity)
  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.globalAlpha = prevAlpha;
  return true;
}
```

### 4.3 Combat Detonation Dispatcher
Integrate the sprite renderer into the primary visual effect drawer (e.g. `draw[Name]Explosion(ctx, blast)`):

```javascript
export function draw[Name]Explosion(ctx, blast) {
  if (!blast || blast.timer <= 0) return;

  const p = Math.max(0, Math.min(1.0, 1.0 - (blast.timer / blast.maxTimer)));
  const maxR = blast.radius || 75;
  const curR = maxR * Math.pow(p, 0.48);
  const alpha = 1.0 - Math.pow(p, 1.35);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.translate(blast.x, blast.y);

  // 1. Concentric Mach Shockwave Rings (Water-Ripple Progression, Rule 26)
  _drawCrispShockwaveRings(ctx, maxR, p, alpha);

  // 2. Discrete Standalone Spark Embers (Alpha Isolated)
  _drawCrispSparks(ctx, curR, p, alpha);

  // 3. 12-Frame Authentic Retro Pixel Art Explosion Animation ON TOP
  _draw[Name]Animated[Effect]Sprite(ctx, maxR, p, alpha);

  ctx.restore();
}
```

---

## 5. Fighter Entity Integration Pipeline

In `js/entities/fighters/<Name>Fighter.js`:

### 5.1 Triggering the 12-Frame Animation
Push active explosion objects to a dedicated array (`this.activeExplosions` or `this.activePalmBlasts`) with a duration of **14 to 18 frames** (~1.2 to 1.5 ticks per animation frame at 60 FPS):

```javascript
this.activeExplosions.push({
  x: blastX,
  y: blastY,
  radius: aoeRadius,
  timer: isFinisher ? 18 : 14,
  maxTimer: isFinisher ? 18 : 14,
  isFinisher: isFinisher
});
```

### 5.2 Mandatory Top-of-Update Non-Freezing Decay (Rule 25)
Always decrement active visual explosion timers at the **very top of `update()` before freeze/stasis guards**:

```javascript
update(opponent, ownerIndex, arena) {
  // 0. Rule 25: Decay active visual effects BEFORE freeze check
  this._updateVisualExplosions?.();

  // 1. Freeze / Time-stop guard
  const isFrozen = this._handleTimeStop();
  if (isFrozen || this.isTargetOfAmbush) {
    this.interruptAttacks();
    return;
  }
  ...
}

_updateVisualExplosions() {
  if (!this.activeExplosions || this.activeExplosions.length === 0) return;
  for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
    const e = this.activeExplosions[i];
    if (!e || typeof e.timer !== 'number') {
      this.activeExplosions.splice(i, 1);
      continue;
    }
    e.timer--;
    if (e.timer <= 0) this.activeExplosions.splice(i, 1);
  }
}
```

### 5.3 Drawing on the Top Layer
In `draw(ctx)`:
```javascript
draw(ctx) {
  // ... Base fighter body and weapon layers ...

  // Active 12-Frame Visual Animations on top layer
  for (let e of this.activeExplosions) {
    draw[Name]Explosion(ctx, e);
  }

  this.drawHealth(ctx);
  this.drawFreezeTimer(ctx);
}
```

---

## 6. Execution Checklist for the Agent

Whenever the user asks to generate or integrate a 12-frame animation:

- [ ] **Step 1: Inspect Reference**: Check `Assets/model/reze/explosion/` and `rezeWeaponGraphics.js` for exact format standards.
- [ ] **Step 2: Destination Folder**: Create `Assets/model/<characterId>/<effectName>/`.
- [ ] **Step 3: Extract/Format 12 Frames**:
  - Export `[effectName]-1.png` through `[effectName]-12.png` at uniform $256 \times 256\text{px}$.
  - Ensure 100% clean RGBA transparent background (zero halos/black boxes).
  - Verify anchor calibration ($(128, 128)$ center).
  - Generate composite horizontal strip `[effectName]-b.png` ($3072 \times 256\text{px}$).
- [ ] **Step 4: Cleanup Temp Files (Rule 0.1)**: Immediately delete any video extraction folders or temp probes (`temp_frames/`, etc.).
- [ ] **Step 5: Register Config**: Add path in `js/configs/characters/<name>Config.js` under `assets.<effectName>`.
- [ ] **Step 6: Renderer Module**:
  - Implement `_get[Effect]Frames()` eager preloader.
  - Implement `_draw[Effect]AnimatedSprite(ctx, maxR, p, alpha)` with nearest-neighbor scaling.
  - Preserve Canvas 2D transform stack depth (`1 save / 1 restore`).
  - Restore `ctx.globalAlpha` so subsequent draw calls are not attenuated.
- [ ] **Step 7: Entity Combat Hooks**:
  - Trigger effect in entity combat routines with `timer: 14` to `18`.
  - Ensure top-of-update decay loop (Rule 25 non-freezing standard).
- [ ] **Step 8: Mandatory Verification (Rule 0.2)**:
  - Run `npm run verify` to confirm 100% test pass with zero canvas stack or asset regressions.
