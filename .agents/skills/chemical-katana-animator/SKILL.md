---
name: chemical-katana-animator
description: Design, extract, and map Graal Chemical Katana 2-hit attack animations, 5-phase cleave kinematics (Horizontal Cross Cleave & Upward Rising Scoop), impact latch physics, and layered slap audio into 60 FPS combat fighters.
---

# ⚔️ Chemical Katana Attack Animation & Combat Kinematics Skill (`chemical-katana-animator`)

Use this skill whenever implementing, referencing, animating, or tuning GraalOnline-style katana and sword combat combos, specifically the **Chemical Katana 2-Hit Cleave System** (`era_chester-events23-chemicalkatana-attack.gani` and `era_chester-events23-chemicalkatana-attack2.gani`) adapted into 60 FPS physics engines.

---

## 1. Overview & Kinematic Philosophy

The **Chemical Katana** combat pattern represents the gold-standard 2-hit melee combo architecture in this repository. It transforms GraalOnline tick-based sprite animations into a fluid, heavy, visceral 60 FPS combat experience adhering strictly to **Rule 30 (5-Phase Melee Combat & Impact Lock Standard)** and **Rule 15 (Crescent Slash & Dynamic Eraser Wipe)**.

### The Problem It Solves
Naive sword swings transition directly from the forward swing into recovery on the exact frame the stroke finishes, producing a floaty "rubber-band" snap where the blade seems to bounce off thin air.

### The Chemical Katana Solution
1. **Asymmetrical 2-Hit Combo Rhythm**:
   - **Hit 1**: High Horizontal Cross Cleave (sweeping left shoulder to right flank).
   - **Hit 2**: Low Upward Rising Cleave / Scoop (scooping low right diagonally up to high left with vertical loft).
2. **The Impact Lock / Latch Phase**:
   - The blade stops dead at the impact cleave plane for **5–7 frames**.
   - Forward momentum is clamped to zero (`this.vx = 0; this.vy = 0`).
   - Micro-tremor vibration (`±2.2px`) simulates mechanical resistance against target collision.
3. **Layered Fleshy Slap Audio**:
   - Layering `attack_fleshhit` (1.0 vol) + `sukuna_slice` (0.90 vol) creates a heavy concussive slap impact rather than a generic metallic whoosh.

---

## 2. The 2-Hit Combo Specifications & Kinematic Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HIT 1: Horizontal Cross Cleave (attack.gani)                                    │
│ Start: -swingTotal * 0.50 (~-117°)  ──>  Strike: +swingTotal * 0.50 (~+117°)    │
│ Lift (7f) ──> Hold (2f) ──> Whip Strike (5f) ──> IMPACT LOCK (6f) ──> Rec (10f)  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ HIT 2: Upward Rising Cleave / Scoop (attack2.gani)                              │
│ Start: +swingTotal * 0.55 (~+140°)  ──>  Strike: -swingTotal * 0.55 (~-140°)    │
│ Scoop (6f) ──> Hold (2f) ──> Whip Strike (5f) ──> IMPACT LOCK (7f) ──> Rec (12f)│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Phase Parameters (60 FPS Engine Timing)

> [!IMPORTANT]
> **Anti-Snappy Minimum Frame Duration & Multi-Sequence Continuity Standard**:
> - NEVER lower strike frames to snappy micro-durations (e.g. 2–4 frames). Chemical Katana represents the absolute high-speed limit for rapid basic combos (5–6 frame strike). For heavy cleaves, special skills, or colossal anime weapons (e.g. Guts, Escanor, Calamity Cleave), Phase 3 strike MUST use **8–12 frames** with generous windup (**20–30 frames**) and impact lock (**12–18 frames**).
> - **Zero Mid-Combo Angle Reset on Sequence Attacks**: Whenever creating a multi-sequence attack animation (Sequence 1 $\rightarrow$ Sequence 2), **NEVER reset the weapon angle back to neutral stance between sequences**. Set `seq1RecoveryFrames: 0` so Sequence 1 holds its follow-through lock angle and Sequence 2 coils directly from that exact ending angle. Only the final sequence in the chain recovers back to neutral stance.

| Phase | Hit 1: Cross Cleave | Hit 2: Rising Cleave | Weapon Motion & Mechanics |
|---|---|---|---|
| **Phase 1: Coil / Lift** | **7 frames** (~0.12s) | **6 frames** (~0.10s) | Smooth backward anticipation coil (`Math.sin(p * π/2)`). Body dampens velocity (`vx *= 0.88, vy *= 0.88`). Anticipation SFX: `skill_dash1` (0.40 vol). |
| **Phase 2: Poised Hold** | **2 frames** (~0.03s) | **2 frames** (~0.03s) | Blade pauses at apex of coil. High potential tension. Auto-aim angle locked. |
| **Phase 3: Hypersonic Whip Strike** | **5 frames** (~0.08s) | **5 frames** (~0.08s) | Explosive acceleration into cleave plane (`Math.pow(sp, 2.4)`). Forward lunge step (`lungeSpeed * Math.sin(strikeP * π)`). Audio: `attack_swordswing` (0.95 vol). **Hit delivered at `strikeP >= 0.50`**. |
| **Phase 4: IMPACT LOCK / LATCH** | **6 frames** (~0.10s) | **7 frames** (~0.12s) | **Weapon locked firmly in cleave plane**. **Forward velocity clamped to zero** (`this.vx = 0; this.vy = 0`). Jitter tremor (`±2.2px`). Screen shake: 6px (Hit 1) / 8px (Hit 2). Target hit-pause: 3 frames. |
| **Phase 5: Recovery Settle** | **10 frames** (~0.17s) | **12 frames** (~0.20s) | Blade dislodges and returns to ready stance with spring settle (`Math.pow(1 - rp, 1.8)`). Slash ribbon erases tail-to-tip (`Math.pow(rp, 1.4)`). |
| **Total Attack Duration** | **30 frames** (0.50s) | **32 frames** (~0.53s) | Fast, responsive esports-grade combat pacing. |

---

## 3. Combo Angle Calculation (`_getSwordSwingAngle`)

The sword blade orientation is computed dynamically each frame based on the active combo step and elapsed frame lifecycle:

```javascript
_getSwordSwingAngle() {
  if (!this.swipeActive || this.swordSwingTimer <= 0) {
    return this.gunAngle || 0;
  }

  const totalF = this.swordSwingMax || 30;
  const elapsed = Math.max(0, totalF - this.swordSwingTimer);
  const liftF = this.swordSwingLiftFrames || 7;
  const holdF = this.swordSwingHoldFrames || 2;
  const strikeF = this.swordSwingStrikeFrames || 5;
  const pinF = this.swordSwingImpactLockFrames || 6;
  const recF = this.swordSwingRecFrames || 10;

  const strikeStart = liftF + holdF;
  const strikeEnd = strikeStart + strikeF;
  const pinEnd = strikeEnd + pinF;

  const baseAngle = this.swordSlashAngle || this.swipeAngle || this.gunAngle || 0;
  const isHit2 = (this.swordComboStep === 2);
  const swingTotal = Math.PI * (isHit2 ? 1.40 : 1.30);

  if (isHit2) {
    // Hit 2: Upward Rising Cleave (Chemical Katana Attack 2)
    // Swings from low right (+swingTotal * 0.55) diagonally up to high left (-swingTotal * 0.55)
    const startAngle = baseAngle + swingTotal * 0.55;
    const endAngle = baseAngle - swingTotal * 0.55;

    if (elapsed < liftF) {
      const p = elapsed / Math.max(1, liftF);
      return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
    } else if (elapsed < strikeStart) {
      return startAngle;
    } else if (elapsed < strikeEnd) {
      const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
      const ease = Math.pow(sp, 2.4);
      return startAngle + (endAngle - startAngle) * ease;
    } else if (elapsed < pinEnd) {
      return endAngle; // IMPACT LOCK: 100% held at apex
    } else {
      const rp = (elapsed - pinEnd) / Math.max(1, recF);
      const ease = Math.pow(1 - rp, 1.8);
      return baseAngle + (endAngle - baseAngle) * ease;
    }
  } else {
    // Hit 1: Horizontal Cross Cleave (Chemical Katana Attack 1)
    // Swings from left shoulder (-swingTotal * 0.5) forward across to right (+swingTotal * 0.5)
    const startAngle = baseAngle - swingTotal * 0.5;
    const endAngle = baseAngle + swingTotal * 0.5;

    if (elapsed < liftF) {
      const p = elapsed / Math.max(1, liftF);
      return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
    } else if (elapsed < strikeStart) {
      return startAngle;
    } else if (elapsed < strikeEnd) {
      const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
      const ease = Math.pow(sp, 2.4);
      return startAngle + (endAngle - startAngle) * ease;
    } else if (elapsed < pinEnd) {
      return endAngle; // IMPACT LOCK: 100% held in cleave plane
    } else {
      const rp = (elapsed - pinEnd) / Math.max(1, recF);
      const ease = Math.pow(1 - rp, 1.8);
      return baseAngle + (endAngle - baseAngle) * ease;
    }
  }
}
```

---

## 4. Visual Slash Ribbon Architecture (Canvas 2D Annular Sector)

The Chemical Katana slash visual is drawn as an **Annular Sector Ribbon with Bulging Perimeter** and a **Dynamic Eraser Wipe**:

```javascript
drawSlashRibbon(ctx) {
  if (!this.swipeActive || this.swordSwingTimer <= 0) return;

  const totalF = this.swordSwingMax || 30;
  const elapsed = Math.max(0, totalF - this.swordSwingTimer);
  const liftF = this.swordSwingLiftFrames || 7;
  const holdF = this.swordSwingHoldFrames || 2;
  const strikeF = this.swordSwingStrikeFrames || 5;
  const pinF = this.swordSwingImpactLockFrames || 6;
  const recF = this.swordSwingRecFrames || 10;

  const strikeStart = liftF + holdF;
  const strikeEnd = strikeStart + strikeF;
  const pinEnd = strikeEnd + pinF;

  // Slash ribbon only renders from strike phase onwards (Phases 3, 4, 5)
  if (elapsed < strikeStart) return;

  const isHit2 = (this.swordComboStep === 2);
  const swingTotal = Math.PI * (isHit2 ? 1.40 : 1.30);
  const baseAngle = this.swordSlashAngle || this.swipeAngle || this.gunAngle || 0;

  // Reach calibration matching blade geometry:
  // Hilt begins at this.r + 14, blade tip kissaki reaches this.r + 84
  const innerR = this.r + 14;
  const outerR = this.r + 88;
  const arcRadius = this.r + 76;

  const localStart = isHit2 ? (swingTotal * 0.55) : (-swingTotal * 0.5);
  const localEnd = isHit2 ? (-swingTotal * 0.55) : (swingTotal * 0.5);

  // Synchronize leading arc edge 1:1 with sword blade position
  const currentSwordAngle = this._getSwordSwingAngle();
  const swordLocalAngle = currentSwordAngle - baseAngle;

  let currentStartAngle = localStart;
  let currentEndAngle = localEnd;
  let recP = 0;

  if (elapsed < strikeEnd) {
    // Phase 3: Whip Strike expansion — leading tip is 100% locked to the sword blade kissaki!
    currentStartAngle = localStart;
    currentEndAngle = swordLocalAngle;
    recP = 0;
  } else if (elapsed < pinEnd) {
    // Phase 4: Impact Lock (100% full hold, Rule 30)
    currentStartAngle = localStart;
    currentEndAngle = localEnd;
    recP = 0;
  } else {
    // Phase 5: Dynamic Tail-to-Tip Eraser Wipe (Rule 15 & 30)
    const rp = (elapsed - pinEnd) / Math.max(1, recF);
    recP = Math.pow(rp, 1.4);
    currentStartAngle = localStart + (localEnd - localStart) * recP;
    currentEndAngle = localEnd;
  }

  const angularSpan = Math.abs(currentEndAngle - currentStartAngle);

  if (angularSpan > 0.04) {
    const fade = Math.max(0, 1.0 - recP * 0.85);
    const glowAlpha = fade;

    const tx = (this.swipeActive && this.swordTremorX) ? this.swordTremorX : 0;
    const ty = (this.swipeActive && this.swordTremorY) ? this.swordTremorY : 0;

    ctx.save();
    ctx.translate(this.x + tx, this.y + ty);
    ctx.rotate(baseAngle);

    // 1. Radiant Annular Sector Ribbon
    const segCount = 28;
    const stepAngle = (currentEndAngle - currentStartAngle) / segCount;

    ctx.beginPath();
    // Outer arc with sinusoidal mid-point bulge
    for (let s = 0; s <= segCount; s++) {
      const a = currentStartAngle + s * stepAngle;
      const t = s / segCount;
      const bulge = Math.sin(t * Math.PI) * 4;
      const px = Math.cos(a) * (outerR + bulge);
      const py = Math.sin(a) * (outerR + bulge);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    // Inner arc back
    for (let s = segCount; s >= 0; s--) {
      const a = currentStartAngle + s * stepAngle;
      const px = Math.cos(a) * innerR;
      const py = Math.sin(a) * innerR;
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = isHit2
      ? `rgba(255, 140, 20, ${0.40 * glowAlpha})`
      : `rgba(255, 195, 30, ${0.36 * glowAlpha})`;
    ctx.fill();

    // 2. Razor Core Glow Rim
    ctx.beginPath();
    for (let s = 0; s <= segCount; s++) {
      const a = currentStartAngle + s * stepAngle;
      const px = Math.cos(a) * (arcRadius + 2);
      const py = Math.sin(a) * (arcRadius + 2);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(255, 255, 230, ${0.85 * glowAlpha})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.restore();
  }
}
```

---

## 5. Left/Right Spawn Symmetry Standard (Facing Left Inversion)

Whenever rendering the fighter holding the Chemical Katana or during combo swings:
- **Rule 19 & Rule 35**: If `Math.abs(angle) > Math.PI / 2`, the local coordinate system MUST apply `ctx.scale(1, -1)`:
  ```javascript
  ctx.save();
  ctx.translate(this.x + tx, this.y + ty);
  const facingLeft = Math.abs(swordAngle) > Math.PI / 2;
  ctx.rotate(swordAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  // Weapon and hand draw passes
  drawSword(ctx, ...);
  drawHand(ctx, ...);
  ctx.restore();
  ```
- This guarantees:
  1. The blade points upright in neutral guard stance regardless of which side the fighter spawns.
  2. The sword hand remains 1:1 locked over the grip across all 360° aiming directions.
  3. Zero duplicate hands or floating fists on screen.

---

## 6. Verification Checklist

When using this skill to implement or calibrate melee combo attack animations:
- [ ] Hit 1 uses Horizontal Cross Cleave (`-0.50` to `+0.50` total arc sweep).
- [ ] Hit 2 uses Upward Rising Cleave (`+0.55` to `-0.55` total arc sweep with upward loft).
- [ ] Forward velocity clamps strictly to zero (`this.vx = 0; this.vy = 0;`) during Phase 4 Impact Lock.
- [ ] Weapon trembles with micro-jitter (`±2.2px`) during Phase 4.
- [ ] Slash ribbon stays 100% unfurled and latched on the plane during Phase 4; eraser wipe begins only in Phase 5.
- [ ] Hit audio layers concussive `attack_fleshhit` (1.0) with sharp slicing `sukuna_slice` (0.90) and screen shake.
- [ ] Spawn facing left (`Math.abs(gunAngle) > Math.PI / 2`) mirrors vertically (`ctx.scale(1, -1)`) so blade and hands stay upright.
- [ ] All Canvas 2D contexts match `ctx.save()` with `ctx.restore()` (0-depth stack integrity).
- [ ] `npm run verify` passes with 0 syntax errors and 100% test pass rate.
