---
name: melee-attack-animator
description: Design, animate, and balance 5-phase satisfying melee attack combos, impact lock / latch physics, and fleshy slap audio layering for weapon fighters.
---

# ⚔️ Melee Attack Animator & Impact Lock Pacing Skill

Use this skill whenever designing, scaffolding, animating, or tuning melee weapons, swords, axes, hammers, daggers, or martial-arts basic attacks for any fighter (e.g., Maki Zen'in, Escanor, Toji, Ichigo, Nanami, Musashi, PEKKA, Knight).

---

## 1. The Core Philosophy: Eliminating "Rubber-Band Snappiness"

### The Fatal Flaw of Naive Attack Animations
In basic 2-phase (windup → swing) or naive 3-phase (windup → swing → immediate recovery) attack animations, the weapon begins reversing/recovering on the **exact frame** the stroke completes. 
- **The Result**: The attack feels weightless, snappy, and floaty—like a rubber band snapping back or bouncing off thin air. There is no physical follow-through, no sense of steel cleaving flesh, and zero impact resistance.

### The Solution: The 5-Phase Melee Lifecycle with Impact Lock
For an attack to feel heavy, visceral, and genuinely satisfying (the iconic anime **"slap/impact"** feel), the weapon **MUST have an explicit IMPACT LOCK (or IMPACT LATCH) phase** before recovery begins. 
The blade literally locks into the impact plane (embedded in the ground, struck into target flesh, or locked at cleave apex), stops all momentum, vibrates with mechanical resistance, and holds the visual slash mesh before dislodging.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Phase 1: Lift   │ ──> │ Phase 2: Hold   │ ──> │ Phase 3: Strike │
│ (Anticipation)  │     │ (Poised Tension)│     │ (Hypersonic)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────────────┐      │
│ Phase 5: Settle │ <── │ Phase 4: IMPACT LOCK    │ <────┘
│ (Recovery Pull) │     │ (Plane Latch & Embed)   │
└─────────────────┘     └─────────────────────────┘
```

---

## 2. The 5-Phase Animation Lifecycle

| Phase | Name | Target Duration | Weapon Motion | Body Physics / Velocity | Visuals & Audio |
|---|---|---|---|---|---|
| **Phase 1** | **Lift / Coil** | `6–8 frames` (~0.10–0.13s) | Smooth backward anticipation lift (`-1.55 rad` overhead lift or low crouch scoop) via `Math.sin(wp * π/2)`. | Arms and center of gravity pull back into tension. | Anticipation dash/flutter swoosh (`skill_dash1`, vol 0.40). |
| **Phase 2** | **Poised Hold** | `2–4 frames` (~0.03–0.06s) | Weapon pauses at peak anticipation load (Escanor poised hold). | Stationary, high spring potential energy. | Pure silence or wind draw. |
| **Phase 3** | **Hypersonic Whip Strike** | `5–8 frames` (~0.08–0.13s) | Explosive acceleration into the cleave plane with exponential power curve (`Math.pow(sp, 2.2)` to `2.6`). | Lunging forward momentum impulse (`lungeSpeed * Math.sin(strikeP * π)`). | Whip swoosh (`attack_swordswing` / `skill_spinslash`). Trigger damage & impact at `strikeP >= 0.50`. |
| **Phase 4** | **THE IMPACT LOCK / LATCH** *(The Key!)* | `5–7 frames` (~0.08–0.12s) | **Firmly locked/latched in impact plane** (embedded in floor, struck in flesh, or locked at apex, e.g. `weaponRot = 1.10`, `weaponLunge = 24px`, `weaponOffY = 14px`). | **Forward velocity clamped to zero** (`this.vx = 0; this.vy = 0;`), simulating hard collision. | **Slap audio** (`attack_fleshhit` + `sukuna_slice`), screen shake, micro-tremor jitter (`±2.2px`), slash ribbon held on plane, compression ring & sparks. |
| **Phase 5** | **Extraction & Recovery Settle** | `9–12 frames` (~0.15–0.20s) | Weapon dislodges from impact plane and returns to guard stance with spring-damped settle (`(1 - rp)^1.8` + harmonic rebound). | Off-hand returns to canonical flank `(±0.82r, +0.38r)`. Body absorbs backward recoil kickback (`vx -= cos(angle) * recoilKick`). | Dynamic eraser wipe dissolves the slash ribbon from tail to tip (Rule 15). |

---

## 2.1 Mandatory Arm Animation & Physical Force Linkages Standard (Anti-Detached Hands)

### The Problem: Detached Hands & Pivot-Only "Propeller" Swings
When a weapon rotates strictly around a single static pivot `(0, 0)` with hands floating as disconnected circles, the attack feels completely weightless—like a helicopter propeller spinning with no muscle or bodily leverage.

### The Standard: 4 Pillars of Melee Arm Physics Force
Whenever rendering, scaffolding, or animating melee weapon attacks:

1. **Dynamic Arm Linkage Rendering (Shoulders to Grip)**:
   - **STRICT PROHIBITION of Disconnected Floating Hands**: Arms MUST NOT be omitted or left as detached circles floating near the body edge.
   - Renderers MUST draw dynamic arm segments (upper arm, elbow flex, forearm strokes/polygons matching character skin tone, sleeves, or armor plating) bridging directly from the shoulders/torso flanks `(x: ±r * 0.65, y: r * 0.22)` to the hands gripping the weapon.
   - For armored or sleeve-wearing characters, draw distinct limb polygons or thick rounded strokes (`lineWidth = handRadius * 1.6`) underneath the hands.

2. **Bodily Kinetic Force Transfer (Translational Lunge & Vertical Dip)**:
   - Melee attacks MUST translate dynamically through space via `_getSwordSwingOffsets()` (or `weaponLunge` / `weaponOffY`), NEVER rotate about a static axis:
     - **Phase 1 (Coil / Lift)**: Arms and weapon pull backward into tension (`lunge = -coilBack`, `offY = -liftY`).
     - **Phase 3 (Hypersonic Whip Strike)**: Upper body muscles thrust forward, driving the hands and weapon into the cleave plane with exponential power ease (`lunge = -coilBack + (maxLunge + coilBack) * Math.pow(sp, 2.5)`, `offY = -liftY + (cleaveDip + liftY) * Math.pow(sp, 2.5)`).
     - **Phase 4 (Impact Lock)**: Hands and arms remain locked at full extension (`lunge = maxLunge`, `offY = cleaveDip`), sustaining target collision force.

3. **Push-Pull Muscular Lever Mechanics (Dual Hands)**:
   - For 2-handed weapons (greatswords, katanas, polearms, axes):
     - **Main Hand (crossguard / upper hilt)**: Acts as the forward driving fulcrum lever.
     - **Off-Hand (pommel / lower grip)**: Pulls backward or guides counter-torque, visibly levering the blade through the cutting plane.
   - Synchronize slash ribbon origins to follow the dynamic hand translation `(x + lunge, y + offY)` so the arc erupts from the physical cleave locus.

4. **Kinetic Recoil Kickback & Elastic Muscle Settle**:
   - In **Phase 5 (Recovery Settle)**, arresting the inertia of swinging heavy steel requires physical muscle recoil:
     - Apply a physical backward velocity recoil impulse on the fighter entity:
       ```javascript
       this.vx -= Math.cos(this.swordSlashAngle) * recoilKick;
       this.vy -= Math.sin(this.swordSlashAngle) * recoilKick;
       ```
     - Apply damped harmonic spring oscillation to the weapon and arms:
       ```javascript
       const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
       weaponRot = (lockAngle * settleEase) - (recoilAngle * springWave);
       weaponLunge = (maxLunge * settleEase) - (recoilDist * springWave);
       ```
     - Screen shake on whiff and impact (`triggerGlobalScreenShake(2.5, 4)`).

---

## 3. Configuration Schema Standard (`js/configs/characters/<name>Config.js`)

Always declare explicit phase frame timings and impact properties in the character configuration using the canonical `hit*ImpactLockFrames` (or shorthand `hit*LockFrames`):

```javascript
// ──────────────────────────────────────────
// Basic Attack: Melee Combo Pacing Config
// ──────────────────────────────────────────
enableMeleeCombo: true,
swordRange: 75,
swordBladeRadius: 18,
swordCooldown: 36,
comboResetFrames: 90,
swordTremorIntensity: 2.2, // Amplitude (px) during hit-pause / impact lock

// ── Hit 1: Overhead Chop (Downward Cleave & Floor Impact Lock) ──
hit1LiftFrames: 8,         // Anticipation coil lift
hit1HoldFrames: 3,         // Poised hold at apex
hit1StrikeFrames: 5,       // Hypersonic downward stroke
hit1ImpactLockFrames: 6,   // CANONICAL IMPACT LOCK: Frames weapon locks firmly into floor
hit1LockFrames: 6,         // Shorthand alias
hit1PinFrames: 6,          // Backwards-compatible alias
hit1RecoveryFrames: 10,    // Extraction & stance settle
hit1HitPauseFrames: 3,     // Contact freeze-frame
hit1LungeSpeed: 7.0,       // Forward lunging step velocity
hit1ArcAngle: (140 * Math.PI) / 180,
hit1Damage: 28,
hit1Knockback: 6.5,
hit1ImpactShake: 4.0,

// ── Hit 2: Rising Cleave / Uppercut (Apex Impact Lock) ──
hit2LiftFrames: 8,
hit2HoldFrames: 3,
hit2StrikeFrames: 6,
hit2ImpactLockFrames: 5,   // CANONICAL IMPACT LOCK: Frames locked at peak rising cleave apex
hit2LockFrames: 5,         // Shorthand alias
hit2PinFrames: 5,          // Backwards-compatible alias
hit2RecoveryFrames: 10,
hit2HitPauseFrames: 3,
hit2LungeSpeed: 7.5,
hit2VerticalLift: 4.5,
hit2ArcAngle: (150 * Math.PI) / 180,
hit2Damage: 34,
hit2Knockback: 8.5,
hit2ImpactShake: 4.5,

// ── Hit 3: Whirlwind Sunder Finisher (Sunder Impact Lock) ──
hit3LiftFrames: 7,
hit3HoldFrames: 3,
hit3StrikeFrames: 8,
hit3ImpactLockFrames: 7,   // CANONICAL IMPACT LOCK: Frames locked near floor at 360°
hit3LockFrames: 7,         // Shorthand alias
hit3PinFrames: 7,          // Backwards-compatible alias
hit3RecoveryFrames: 12,
hit3HitPauseFrames: 4,
hit3LungeSpeed: 9.0,
hit3ArcAngle: Math.PI * 2,
hit3Damage: 52,
hit3Knockback: 16.0,
hit3ImpactShake: 7.0,
```

---

## 4. Entity Update Loop Implementation (`*Fighter.js`)

In the fighter entity class, derive phase boundaries and clamp velocity during Phase 4:

```javascript
_updateSwordSwing(opponent, arena) {
  if (this.swordSwingTimer <= 0) return;

  const totalF = this.swordSwingMax || 32;
  const elapsed = totalF - this.swordSwingTimer;
  const liftF = this.swordSwingLiftFrames || 8;
  const holdF = this.swordSwingHoldFrames || 3;
  const strikeF = this.swordSwingStrikeFrames || 5;
  const lockF = this.swordSwingImpactLockFrames || this.swordSwingPinFrames || 6;
  const recF = this.swordSwingRecFrames || 10;

  const strikeStart = liftF + holdF;
  const strikeEnd = liftF + holdF + strikeF;
  const lockEnd = liftF + holdF + strikeF + lockF;

  if (elapsed < strikeStart) {
    // Phase 1 & 2: Anticipation Lift & Poised Hold (Track target aim)
    if (opponent && !opponent.isDead) {
      this.swordSlashAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  } else if (elapsed < strikeEnd) {
    // Phase 3: Hypersonic Whip Strike
    const strikeElapsed = elapsed - strikeStart;
    const strikeP = strikeElapsed / Math.max(1, strikeF);

    // Forward lunging step momentum
    const lungeSpeed = this.swordSwingLunge || 7.0;
    const lungeDecay = Math.sin(strikeP * Math.PI);
    this.vx = Math.cos(this.swordSlashAngle) * lungeSpeed * lungeDecay;
    this.vy = Math.sin(this.swordSlashAngle) * lungeSpeed * lungeDecay;

    // Trigger impact at ~50% of the whip stroke
    if (!this.swordHitDelivered && strikeP >= 0.50) {
      this._deliverSwordImpact(opponent);
    }
  } else if (elapsed < lockEnd) {
    // Phase 4: THE IMPACT LOCK / LATCH (Weapon latched firmly into impact plane!)
    if (!this.swordHitDelivered) {
      this._deliverSwordImpact(opponent);
    }
    // Hard collision: Stop all movement while weapon is locked at impact
    this.vx = 0;
    this.vy = 0;
  } else {
    // Phase 5: Recovery extraction & stance settle
    this.vx *= 0.75;
    this.vy *= 0.75;
  }

  this.swordSwingTimer--;
}
```

---

## 5. The Layered Fleshy "Slap" Audio Palette

Never rely on a single metallic swoosh. True anime combat impact relies on **multi-layer acoustic stacking**:

```javascript
_deliverSwordImpact(target) {
  if (this.swordHitDelivered) return;
  this.swordHitDelivered = true;

  // 1. The Fleshy Slap Layer (Crucial!)
  audioSystem.playSFX('attack_fleshhit', 1.0);

  // 2. The Razor Cutting Layer
  audioSystem.playSFX('sukuna_slice', 0.90);

  // 3. Concussive Boom (On Combo Finishers / Hit 3)
  if (this.swordComboStep === 3) {
    audioSystem.playSFX('attack_heavypunch1', 0.95);
  }

  // Set blade micro-tremor for visual resistance
  this.swordHitTremorTimer = (this.swordSwingHitPause || 3) + 1;
  triggerGlobalScreenShake(this.swordSwingShake || 4.0, 10);
}
```

---

## 6. Weapon Renderer & Slash Ribbon Mesh (`*WeaponGraphics.js`)

### Impact Lock Weapon Locking & Tremor
```javascript
const coilP = liftF / totalF;
const holdP = (liftF + holdF) / totalF;
const strikeP = (liftF + holdF + strikeF) / totalF;
const lockP = (liftF + holdF + strikeF + lockF) / totalF;

if (progress < coilP) {
  // Phase 1: Anticipation lift
  const wp = progress / coilP;
  weaponRot = -1.55 * Math.sin(wp * Math.PI * 0.5);
  weaponLunge = -10.0 * wp;
  weaponOffY = -8.0 * wp;
} else if (progress < holdP) {
  // Phase 2: Poised hold
  weaponRot = -1.55;
  weaponLunge = -10.0;
  weaponOffY = -8.0;
} else if (progress < strikeP) {
  // Phase 3: Whip strike
  const sp = (progress - holdP) / (strikeP - holdP);
  const whipEase = Math.pow(sp, 2.6);
  weaponRot = -1.55 + 2.65 * whipEase;
  weaponLunge = -10.0 + 34.0 * whipEase;
  weaponOffY = -8.0 + 22.0 * whipEase;
} else if (progress < lockP) {
  // Phase 4: THE IMPACT LOCK (Blade stays firmly locked at impact angle)
  const pp = (progress - strikeP) / (lockP - strikeP);
  const lockTremor = (1.0 - pp) * 1.5;
  weaponRot = 1.10; // Locked in impact contact angle
  weaponLunge = 24.0;
  weaponOffY = 14.0 + (Math.random() - 0.5) * lockTremor;
  weaponOffX += (Math.random() - 0.5) * lockTremor;
} else {
  // Phase 5: Recovery extraction
  const rp = (progress - lockP) / (1.0 - lockP);
  const settleEase = Math.pow(1.0 - rp, 1.8);
  const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
  weaponRot = (1.10 * settleEase) - (0.28 * springWave);
  weaponLunge = (24.0 * settleEase) - (6.0 * springWave);
  weaponOffY = (14.0 * settleEase) - (4.0 * springWave);
}
```

### 6.2 Direct 1:1 Leading-Edge Blade Anchor & Geometric Enveloping Standard
In `drawComboSlashVFX`, ensure the ribbon mesh **holds across Phase 4**, only erases in Phase 5, and **strictly locks its leading edge directly to the blade angle**:

```javascript
// 1. Direct Angle Lock: NEVER compute currentEnd with an independent easing curve!
// Bind currentEndAngle directly to the real-time sword angle relative to baseAngle:
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
  // Phase 4: Impact Lock hold across entire cleave plane
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

// 2. Full-Length Geometry Enveloping:
// NEVER let the blade protrude beyond the slash ribbon!
const innerR = this.r + hiltOffset;                  // Anchors right at the guard / collar
const outerR = this.r + hiltOffset + bladeLength + 4; // Wraps 2-4px beyond the blade tip
const arcRadius = this.r + hiltOffset + bladeLength * 0.85; // Cutting edge streak
const tipDist = this.r + hiltOffset + bladeLength;   // Impact spark detonation point

// 3. Coordinate Synchronization:
// Translate by (x + tx, y + ty) so tremor vibration jitter affects sword and ribbon in 1:1 sync!
ctx.save();
ctx.translate(this.x + tx, this.y + ty);
ctx.rotate(baseAngle);
```

---

## 7. Mandatory Anti-Patterns & Quality Checklist

- [ ] **NEVER omit Phase 4**: Every melee attack must dedicate 5–7 frames to the Impact Lock.
- [ ] **NEVER start recovery at maximum extension**: Maximum stroke travel must transition into the impact lock before returning.
- [ ] **NEVER allow forward velocity during the lock**: Clamp `vx = 0, vy = 0` during `strikeEnd <= elapsed < lockEnd`.
- [ ] **NEVER use separate easing exponents for the slash VFX leading edge**: Always lock `currentEndAngle = swordLocalAngle` so the ribbon tracks the blade with zero angular drift.
- [ ] **NEVER let the blade stick out past the slash ribbon**: Always calibrate `outerR = r + hiltOffset + bladeLength + 4px` so the crescent envelops the entire blade.
- [ ] **NEVER detonate impact sparks in mid-blade**: Sparks and compression rings must explode at `tipDist = r + hiltOffset + bladeLength`.
- [ ] **NEVER use single-sound whooshes**: Always layer `attack_fleshhit` for the fleshy slap.
- [ ] **Always anchor to canonical hands (Rule 20)**: Right hand at `(+0.82r, +0.38r)`, Left hand at `(-0.82r, +0.38r)`.
- [ ] **Always render dynamic arm linkages from shoulders to hands (Section 2.1)**: Connect shoulders `(±r * 0.65, r * 0.22)` directly to hands with upper/forearm segments. Zero detached floating hands.
- [ ] **Always translate hands with bodily kinetic force (Section 2.1)**: Hands and weapon hilt must move forward via `lunge` and vertical dip (`offY`), not rotate statically at `(0, 0)`.
- [ ] **Always apply backward recoil impulse and spring damping (Section 2.1)**: Heavy swings must kick back on the body (`this.vx -= Math.cos(angle) * recoilKick`) with damped spring settle.
- [ ] **Always decay effect timers before freeze guard (Rule 25)**: `swordHitTremorTimer` must update before `_handleTimeStop()`.
- [ ] **Always use concentric rings for ground impact (Rule 26)**: No radial spiderweb meshes or cobweb lines.
- [ ] **Reference Implementation**: See [chemical-katana-animator](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/skills/chemical-katana-animator/SKILL.md) for the 2-hit Chemical Katana combo specification (Horizontal Cross Cleave & Upward Rising Scoop).

