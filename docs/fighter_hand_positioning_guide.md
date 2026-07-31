# Fighter Hand Positioning & Punch Animation Guide

This guide documents how the hand positioning, guard stances, and punch/skill animations are mathematically calculated and rendered for brawlers (Aoi Todo, Satoru Gojo, Ryomen Sukuna, and Mahoraga) in the codebase. Use this as a reference when designing new fist-based fighters.

---

## 1. The Core Stance Coordinate Frame (Front POV)

All hand and arm positions are calculated inside a **local coordinate space** centered on the fighter. The rendering flow translates and rotates the context so that:
- **`+X`** points directly toward the opponent target.
- **`+Y`** points down toward the camera (front profile).
- **`-X`** points directly back/away from the opponent.
- **`-Y`** points up/away from the camera.

### Local Space Transform Template:
```javascript
const angle = fighter.gunAngle || 0;
const facingLeft = Math.abs(angle) > Math.PI / 2;

ctx.save();
ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
ctx.rotate(angle);

// Mirror vertically to keep hands facing the right way when walking/facing left
if (facingLeft) {
  ctx.scale(1, -1);
}

// Draw body, head, and hands inside this transformed space!
...
ctx.restore();
```

---

## 2. Aoi Todo: Guard Stance, Punches, and Clap Mechanics

Todo utilizes a side-profile boxing guard stance where both hands are always drawn on top of or slightly offset from the body.

### A. Guard/Rest Positions
Inside the local coordinate frame:
- **Right Hand** (Front Hand / Further from enemy): `lx1 = -r * 0.55`, `ly1 = r * 0.35`
- **Left Hand** (Back Hand / Closer to enemy): `lx2 = r * 0.55`, `ly2 = r * 0.35`

### B. Melee Punches
Punches lunge forward along the `+X` axis. Todo alternates between Left and Right punches:
1. **Transition Progression** (Cubic Ease-In-Out):
   ```javascript
   const smoothProgress = rawProgress < 0.5 
     ? 4 * rawProgress * rawProgress * rawProgress 
     : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
   const lungeExtension = Math.sin(smoothProgress * Math.PI) * 32; // Bell curve lunge (max 32px)
   ```
2. **Right Hand Punch (Strikes over body)**:
   ```javascript
   frontHandX += lungeExtension * 2.2; 
   frontHandY *= 0.4;
   ```
3. **Left Hand Punch (Direct jab)**:
   ```javascript
   backHandX += lungeExtension * 1.2;
   backHandY *= 0.4;
   ```

### C. Boogie Woogie Clap (3-Phase Curve)
When Todo claps (`isClapping`), both hands move from their rest positions to meet at a collision target in front of the body: `(2.5, r + 14)`.
- **Phase 1: Windup** (`progress < 0.35`): Hands accelerate smoothly towards the clap target.
- **Phase 2: Collision** (`0.35 <= progress < 0.55`): Hands stay at the clap target with an elastic vibration/recoil offset applied.
- **Phase 3: Retraction** (`progress >= 0.55`): Hands decelerate back to their rest guard coordinates.

---

## 3. Satoru Gojo: Dynamic Reach and Spell Gestures

Gojo utilizes a similar dual-hand guard stance but includes dynamic reach calculation for punches, as well as distinct hand signs for **Hollow Purple** and **Domain Expansion**.

### A. Dynamic Punch Reach
Unlike static lunges, Gojo calculates the physical distance to his target to limit or extend the punch length:
```javascript
let reachDist = 75; // Default fallback
if (targetEnt) {
  const distToTarget = Math.hypot(targetEnt.x - fighter.x, targetEnt.y - fighter.y);
  reachDist = Math.max(45, Math.min(105, distToTarget - fighter.r * 0.45));
}
const punchDist = lungeProgress * reachDist;
```

### B. Hollow Purple Fusion Gesture
During Hollow Purple channeling, hands are positioned symmetrically ahead of the body, collapsing together on the `Y` axis as the charge completes:
```javascript
const handDistance = r + 10;
const handSpread = 14 * (1 - mergeProgress); // Collapses to 0 at 100% charge

const frontHand = { x: handDistance, y: handSpread };
const backHand = { x: handDistance, y: -handSpread };
```

### C. Domain Expansion (Unlimited Void)
Gojo crosses his index and middle fingers. This is rendered by positioning both hands closely touching at the center:
```javascript
const domainDist = r + 8;
const frontHand = { x: domainDist, y: 3 };
const backHand = { x: domainDist, y: -3 };
```

---

## 4. Ryomen Sukuna: Flurry Punches & Cleave Hand Signs

Sukuna's hand renderer is configured similarly to Gojo's base guard stance, but handles the drawing of hands and multi-strike circles during his rapid melee combo.
- Hands hide completely during target freeze/stuns and domain activation.
- During basic combos, hands alternate jabbing along the `+X` axis with motion arcs representing his cursed energy blade cuts.

---

## 5. Mahoraga: Left Punch & Sonic Shockwaves

Mahoraga wields the Sword of Extermination on his right forearm, leaving his left hand free for heavy brawler punches.

### A. Idle Stance
- **Right Arm**: Grips/attaches the forearm sword.
- **Left Hand**: Rests firmly on the back-left side of his body: `idleX = -r * 0.8`, `idleY = r * 0.25`.

### B. Heavy Left Punch Lunge
When punching, the fist lunges diagonally from the back-left shoulder directly across the body towards the enemy target:
- **Target Reach**:
  ```javascript
  let reachDist = 95;
  if (target) {
    const targetDist = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    reachDist = Math.max(55, Math.min(125, targetDist - r * 0.45));
  }
  ```
- **Lunge Position Interpolation**:
  ```javascript
  const idleX = -r * 0.8;
  const idleY = r * 0.25;
  const punchX = r * 0.6 + reachDist; // Heavy forward reach extension
  const punchY = -r * 0.25;

  const armX = idleX + lungeProgress * (punchX - idleX);
  const armY = idleY + lungeProgress * (punchY - idleY);
  ```

### C. Punch Impact Blast Effects
The fist tip draws conical air compression shockwaves (`drawConicalBlast`) and starburst flares dynamically aligned with `armX` and `armY` during the mid-strike phase (`progress > 0.05 && progress < 0.95`).
