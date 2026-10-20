---
name: slash-animation-generator
description: Generate, extract, format, calibrate, and implement 12-frame weapon slash attack animations and melee strike effects by taking the canonical template in Assets/effects/Slash Attack/ as the primary source of truth, locking leading edges to the weapon tip, and following the 5-phase combat kinematic standard.
---

# ⚔️ 12-Frame Slash Animation Generator (`slash-animation-generator`)

Whenever the user asks to **generate, create, extract, format, calibrate, or implement an animation for a weapon attack, melee strike, blade slash, or sword cleave**, the agent **MUST ALWAYS LOOK FOR THE CANONICAL TEMPLATE IN `Assets/effects/Slash Attack/` FIRST** before searching anywhere else or generating new assets from scratch!

---

## 1. Mandatory Rule: Look for the Template First

When requested to produce or implement any attack animation:
1. **Primary Template Directory**: `Assets/effects/Slash Attack/`
   - Master Strip: `Assets/effects/Slash Attack/slash-b.png` ($3072 \times 256\text{px}$)
   - Individual Frames: `Assets/effects/Slash Attack/slash-1.png` through `slash-12.png`
   - Config Specification: `Assets/effects/Slash Attack/slash_template_config.json`
   - Universal Aliases: `attack-1.png` to `attack-12.png`, `attack-b.png`
2. **Template Priority**:
   - Unless the user explicitly supplies an external GIF/video file or specifically requests a custom projectile/bullet, the agent **MUST ALWAYS adopt, clone, or adapt this canonical 12-frame slash template**.
   - If a custom GIF or animation is provided by the user, the agent **MUST calibrate the newly extracted frames against the geometric dimensions, anchor points, and 5-phase timing established by this template**.

---

## 2. Geometric & Kinematic Standards

### 2.1 The Weapon-Tip Spawning Mandate (Anti-Body Halo Rule)
- **STRICT PROHIBITION of Spawning on Fighter Body Center**: NEVER translate or anchor a slash effect directly at `(fighter.x, fighter.y)`. Doing so centers the inner concave radius around the fighter's neck and face, creating an unwanted halo that clips through the character's head and chin.
- **Mandatory Blade-Tip Spawning**: All weapon slash effects MUST spawn directly at the **blade tip kissaki** (`tipPos = get[Weapon]TipWorldPos(fighter)`):
  - In `spawn[Name]SlashEffect(fighter, step)`: Store `tipPos.x` and `tipPos.y` as the effect's spawn point.
  - In `draw[Name]SlashArc(ctx, fighter)`: Translate to the weapon rotation pivot `(pivotWorldX, pivotWorldY)` and align the crescent leading edge kissaki directly with the weapon's reach.

### 2.2 Template Coordinate & Anchor Calibration
In the canonical $256 \times 256\text{px}$ frame space:

| Parameter | Value | Engine Meaning |
|---|---|---|
| **Pivot Anchor `(anchorX, anchorY)`** | `(95, 135)` | Center of curvature of the crescent arc. Translates 1:1 to the sword rotation pivot in world space (`gripX, gripY`). |
| **Kissaki Tip (Frames 4–5)** | `(119, 232)` | Leading edge point at impact lock. Located at radius $100\text{px}$ from anchor at local angle $+1.33\text{ rad}$ ($+76.1^\circ$). |
| **Inner Concave Boundary** | `58.4 px` | Minimum inner radius. When scaled to weapon reach, guarantees $>20\text{px}$ clearance from fighter body ($r = 25$). |
| **Outer Convex Boundary** | `130.2 px` | Maximum outer envelope of the slash arc. |
| **Scale Formula** | `scale = bladeReach / 100` | Proportionally maps the 100px sprite reach to any weapon's reach (`swordStartX + bladeLen`). |

---

## 3. The 5-Phase Blade-Leading Kinematic Lifecycle

The sword blade **MUST ALWAYS LEAD** the attack. The slash effect **TRAILS BEHIND** the cutting edge. The effect must NEVER precede or jump ahead of the sword:

```text
Phase 1: Coil / Lift   (6-8f)  ──> Slash effect is 100% HIDDEN during anticipation
Phase 2: Poised Hold   (2-4f)  ──> Slash effect remains 100% HIDDEN at tension apex
Phase 3: Whip Strike   (5-8f)  ──> Sword blade accelerates; frames 1-3 expand behind cutting edge
Phase 4: IMPACT LOCK   (5-7f)  ──> Sword locks into impact plane; frames 4-5 hold peak crescent
Phase 5: Recovery Settle(9-12f) ──> Blade settles to guard; frames 6-12 dissolve tail-to-tip
```

### Frame-by-Frame Phase Mapping:
- **Phase 1 & 2 (`kin.phase <= 2`)**: `continue;` (Hidden).
- **Phase 3 (`kin.phase === 3`)**:
  - `strikeP < 0.25`: Hidden while sword begins accelerating from behind shoulder.
  - `strikeP >= 0.25 && strikeP < 0.50`: Frame 0 (`slash-1.png` / `attack-1.png`) expands behind cutting tip.
  - `strikeP >= 0.50 && strikeP < 0.75`: Frame 1 (`slash-2.png` / `attack-2.png`) sweeps mid-arc.
  - `strikeP >= 0.75 && strikeP <= 1.00`: Frame 2 (`slash-3.png` / `attack-3.png`) sweeps into full extension.
- **Phase 4 (`kin.phase === 4`, Impact Lock)**:
  - `lockP < 0.50`: Frame 3 (`slash-4.png` / `attack-4.png`) holds full peak crescent locked at weapon tip.
  - `lockP >= 0.50`: Frame 4 (`slash-5.png` / `attack-5.png`) holds impact latch with micro-tremor.
- **Phase 5 (`kin.phase === 5`, Recovery Settle)**:
  - Frames 5 to 11 (`slash-6.png` to `slash-12.png`): Dissolve from tail to tip into fading energy embers while blade dislodges.
- **Decoupled Fallback**:
  - If fighter dashes (Shunpo/flash-step) or interrupts into another skill, decoupled effects in world space play remaining dissolution frames (`12 - effect.timer`) at the world coordinates where the weapon tip struck without snapping to the moving body (Rule 25).

---

## 4. Canonical Rendering Pipeline Template

### 4.1 Forward Kinematics Helper (`*Skin.js`)
```javascript
export function get[Weapon]TipWorldPos(fighter) {
  if (!fighter) return { x: 0, y: 0 };
  const r = fighter.r || 25;
  let angle = (fighter.swordSlashAngle !== undefined)
    ? fighter.swordSlashAngle
    : ((fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.cos(angle) < 0;

  const kin = get[Name]SwingKinematics(fighter);
  const swordStartX = r * 0.68;
  const bladeLen = 94; // or weaponConfig.bladeLen
  const innerX = swordStartX + bladeLen;
  const innerY = 0;
  const theta = kin.swingAngle;

  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const gripOffsetY = r * 0.52;
  const localX = innerX * cosT - innerY * sinT + (kin.thrustDistance + kin.bodyShiftX);
  let localY = innerX * sinT + innerY * cosT + gripOffsetY;
  if (facingLeft) localY = -localY;

  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  return {
    x: fighter.x + (localX * cosA - localY * sinA),
    y: fighter.y + (localX * sinA + localY * cosA)
  };
}
```

### 4.2 Spawner & Renderer (`*WeaponGraphics.js`)
```javascript
export function spawn[Name]SlashEffect(fighter, step = 1) {
  if (!fighter) return;
  if (!fighter.activeSlashEffects) fighter.activeSlashEffects = [];

  const slashAngle = fighter.swordSlashAngle ?? fighter.gunAngle ?? fighter.angle ?? 0;
  const facingLeft = Math.cos(slashAngle) < 0;
  const tipPos = get[Weapon]TipWorldPos(fighter);

  const r = fighter.r || 25;
  const kin = get[Name]SwingKinematics(fighter);
  const gripOffsetY = r * 0.52;
  const pivotX = kin.thrustDistance + kin.bodyShiftX;
  let pivotY = facingLeft ? -gripOffsetY : gripOffsetY;

  const cosA = Math.cos(slashAngle), sinA = Math.sin(slashAngle);
  const pivotWorldX = fighter.x + (pivotX * cosA - pivotY * sinA);
  const pivotWorldY = fighter.y + (pivotX * sinA + pivotY * cosA);

  const bladeReach = (r * 0.68) + 94; // Total reach to tip

  fighter.activeSlashEffects.push({
    x: tipPos.x,
    y: tipPos.y,
    pivotWorldX,
    pivotWorldY,
    bladeReach,
    angle: slashAngle,
    facingLeft,
    isReverseSweep: (step === 2),
    step,
    timer: 12,
    maxTimer: 12,
    fighter
  });
}

export function draw[Name]SlashArc(ctx, fighter) {
  const effects = fighter.activeSlashEffects;
  if (!effects || effects.length === 0) return;
  const frames = _getSlashAttackFrames(); // Preloaded from Assets/effects/Slash Attack/
  if (!frames || frames.length === 0) return;

  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];
    if (!effect || effect.timer <= 0) continue;

    // Determine frameIndex using the 5-phase timing above
    ...

    ctx.save();
    ctx.translate(drawPivotX, drawPivotY);
    ctx.rotate(drawAngle);
    ctx.imageSmoothingEnabled = false;

    if (drawFacingLeft) ctx.scale(1, -1);
    if (effect.isReverseSweep) ctx.scale(1, -1);

    // Dynamic color tint via standard filters
    // ctx.filter = 'hue-rotate(185deg) saturate(1.2)'; // Cyan
    // ctx.filter = 'hue-rotate(45deg) saturate(1.4)';  // Gold

    const scale = (bladeReach / 100) * (effect.step === 3 ? 1.15 : 1.0);
    const drawW = 256 * scale, drawH = 256 * scale;
    const anchorX = 95 * scale, anchorY = 135 * scale;

    ctx.drawImage(frames[frameIndex], -anchorX, -anchorY, drawW, drawH);
    ctx.restore();
  }
}
```

---

## 5. Verification Checklist

Before completing any weapon slash implementation:
- [ ] Template referenced first from `Assets/effects/Slash Attack/`.
- [ ] Slash effect spawns at the weapon tip (`get[Weapon]TipWorldPos()`).
- [ ] Zero halo clipping over fighter body circle or head ($>20\text{px}$ clearance).
- [ ] Sword blade leads during Phase 3; effect trails behind cutting edge.
- [ ] Full peak crescent latched at impact lock during Phase 4.
- [ ] Decoupled effects decay in world space across 12 ticks (Rule 25).
- [ ] Codebase verification passes cleanly (`npm run verify`).
