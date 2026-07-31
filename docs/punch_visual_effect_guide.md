# Recreating the Anime Punch Impact Effect (Spiky Crescent Crown)

This guide documents how to implement, customize, and trigger the high-impact, JJK-inspired **Spiky Crescent Crown Punch Effect** (as seen on Aoi Todo and Mahoraga) for any future fist-based brawler fighters.

---

## 1. Effect Architecture Overview

The punch effect consists of three primary visual layers drawn on the canvas context on contact:
1. **Concentric Spiky Crescent Segments**: 8 separate chopped arc segments with alternating peak-spikes ("teeth") creating the crescent band shape.
2. **Speed Accent Outlines**: Concentric thin outlines floating just outside the crescent pieces to create a multi-layered hand-drawn look.
3. **Radial Action Lines**: Short sharp lines projecting outward from the impact center, adding high-velocity motion lines to the hit.

The system supports color theme parameters (e.g., `'black'` for Todo's classic JJK void aesthetic, or `'gold'` for Mahoraga's high-contrast black/gold cursed energy).

---

## 2. Step 1: Spawning the Effect Particle

Every time a fighter lands a basic punch or melee strike, trigger the effect by spawning the impact frame particle at the target's position.

### A. Particle System Trigger Function
Add or export this function inside your particle system script (e.g., `js/graphics/particles/sparkEffect.js`):

```javascript
/**
 * Spawns a high-impact Anime Punch Impact Frame effect with sakuga action lines.
 * @param {number} x - Hit position X (e.g., target.x)
 * @param {number} y - Hit position Y (e.g., target.y)
 * @param {number} radius - Impact frame radius (usually 55 - 80px)
 * @param {number} hitAngle - Direction angle of punch force (Math.atan2(target.y - attacker.y, target.x - attacker.x))
 * @param {string} color - Theme identifier ('black' or 'gold')
 */
export function spawnAnimePunchImpactFrame(x, y, radius = 55, hitAngle = 0, color = 'black') {
  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = radius; // Start at full size
  shockwave.targetSize = radius;
  shockwave.life = 1.0;
  shockwave.decay = 0.055; // Lasts ~18 frames (fast sakuga fade)
  shockwave.type = 'animeImpactFrame';
  shockwave.hitAngle = hitAngle;
  shockwave.color = color; // Store color theme!

  state.sparkEffects.push(shockwave);
}
```

---

## 3. Step 2: Drawing the Effect (`drawSparkEffects`)

Inside your main particle rendering engine, handle the `'animeImpactFrame'` type inside the `draw` loop.

> [!IMPORTANT]
> **Clear Context Shadows**: Canvas context properties like `shadowColor` and `shadowBlur` can leak from other rendering routines and cause the black spiky crescent to render a circular black shadow blob behind it. Always clear shadows at the start of your drawing block.

### Render Routine Code:

```javascript
} else if (effect.type === 'animeImpactFrame') {
  // ── SPIKY CRESCENT IMPACT (Chopped in 8 Pieces + Action Lines) ──
  ctx.save();
  
  // 1. Explicitly clear shadows to prevent circular black shadow visual bugs
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  ctx.translate(effect.x, effect.y);
  
  // Rotate so the concave crescent opening faces BACK toward the attacker (pointing along hitAngle + PI)
  ctx.rotate((effect.hitAngle || 0) + Math.PI);

  const alpha = effect.life;
  const R = effect.size;

  ctx.globalCompositeOperation = 'source-over';

  const outerR = R * 1.12;
  const innerR = R * 0.84;        // Slim crescent band
  const halfArc = Math.PI * 0.72; // ±130° → 260° total arc span
  const totalArc = halfArc * 2;   // 260° sweep

  // 2. Define the 8 chopped crescent segments (t0/t1 angles as percentage, maxSpike scale)
  const segments = [
    { t0: 0.00, t1: 0.09, maxSpike: 1.12 },
    { t0: 0.14, t1: 0.25, maxSpike: 1.30 },
    { t0: 0.29, t1: 0.44, maxSpike: 1.38 },
    { t0: 0.48, t1: 0.56, maxSpike: 1.15 },
    { t0: 0.60, t1: 0.72, maxSpike: 1.32 },
    { t0: 0.76, t1: 0.84, maxSpike: 1.20 },
    { t0: 0.88, t1: 0.94, maxSpike: 1.25 },
    { t0: 0.97, t1: 0.99, maxSpike: 1.10 },
  ];

  const isGold = (effect.color === 'gold');

  // 3. Draw radial speed/action lines projecting outward
  const lineCount = 14;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < lineCount; i++) {
    const a = -halfArc + (i / (lineCount - 1)) * totalArc + (Math.sin(i * 1.7) * 0.06);
    const len = R * (0.55 + Math.abs(Math.sin(i * 2.3)) * 0.45);
    const startRad = innerR * 0.85;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * startRad, Math.sin(a) * startRad);
    ctx.lineTo(Math.cos(a) * (startRad + len), Math.sin(a) * (startRad + len));
    
    // Theme colors: Alternating gold and black lines for the gold theme, solid black for black theme
    if (isGold) {
      ctx.strokeStyle = (i % 3 === 0) ? `rgba(0, 0, 0, ${alpha * 0.95})` : `rgba(255, 215, 0, ${alpha * 0.95})`;
    } else {
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.9})`;
    }
    ctx.stroke();
  }

  // 4. Draw crescent segment pieces
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    const segN = 10; // Spline smoothness step count

    // Set colors: Alternating black and gold blocks for Mahoraga's gold theme
    if (isGold) {
      ctx.fillStyle = (sIdx % 3 === 0) ? `rgba(0, 0, 0, ${Math.min(1.0, alpha * 1.25)})` : `rgba(255, 200, 0, ${Math.min(1.0, alpha * 1.25)})`;
    } else {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1.0, alpha * 1.25)})`;
    }
    ctx.beginPath();

    // Trace the spiky outer edge of the crescent chunk
    for (let i = 0; i <= segN; i++) {
      const localT = i / segN;
      const globalT = seg.t0 + localT * (seg.t1 - seg.t0);
      const a = -halfArc + globalT * totalArc;

      let r;
      if (i === 0 || i === segN) {
        r = outerR * 0.80; // Sharp tapered tips at segment ends
      } else if (i === Math.round(segN * 0.5)) {
        r = outerR * seg.maxSpike; // Central peak spike
      } else {
        const tooth = (i % 2 === 0) ? 0.88 : 1.06; // Alternating teeth jitter
        r = outerR * tooth;
      }

      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;

      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }

    const aStart = -halfArc + seg.t0 * totalArc;
    const aEnd   = -halfArc + seg.t1 * totalArc;

    // Trace the inner circle arc anticlockwise back to close the segment path
    ctx.arc(0, 0, innerR, aEnd, aStart, true);
    ctx.closePath();
    ctx.fill();

    // 5. Draw a secondary thin outer stroke line accent (floating outline speed-line details)
    if (isGold) {
      ctx.strokeStyle = (sIdx % 3 === 0) ? `rgba(255, 215, 0, ${Math.min(1.0, alpha * 0.8)})` : `rgba(0, 0, 0, ${Math.min(1.0, alpha * 0.85)})`;
    } else {
      ctx.strokeStyle = `rgba(0, 0, 0, ${Math.min(1.0, alpha * 0.75)})`;
    }
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= segN; i++) {
      const localT = i / segN;
      const globalT = seg.t0 + localT * (seg.t1 - seg.t0);
      const a = -halfArc + globalT * totalArc;
      const r = outerR * (seg.maxSpike * 1.06) * (1.0 + (i % 2 === 0 ? 0.025 : -0.025));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.restore();
}
```

---

## 4. Step 3: Triggering in Fighter Combat Logic

To integrate this effect on a future fist-based fighter (e.g., Gojo, Todo, or a new Brawler character), trigger it directly inside their hit detection function:

```javascript
import { spawnAnimePunchImpactFrame } from '../../../graphics/particles/sparkEffect.js';

export function handlePunchHit(attacker, target) {
  // 1. Calculate punch impact angle
  const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);

  // 2. Set theme ('black' for Todo, 'gold' for Mahoraga/Gold style, or add custom ones)
  const theme = attacker.characterId === 'mahoraga' ? 'gold' : 'black';

  // 3. Spawn the spiky crescent impact frame centered on target
  spawnAnimePunchImpactFrame(target.x, target.y, 55, angle, theme);

  // 4. Apply damage, knockback, screen shake, audio, and hit-stop values
  applyDamageAndKnockback(attacker, target);
}
```
