import { state } from '../../core/state.js';

/**
 * Voidmaster Weapon Graphics — Stepped Pixel Singularity Spheres & Orbiting Dark Matter Diamonds
 * Strictly balanced Canvas 2D transforms (Rule 2.4) and zero shadowBlur (Rule 11)
 */
export function drawVoidmasterWeapon(ctx, x, y, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  ctx.save();
  ctx.translate(x, y);

  const orbOffset = r + 8;

  // Left Singularity Orb
  ctx.save();
  ctx.translate(-orbOffset, 0);
  drawPixelVoidOrb(ctx, 0);
  ctx.restore();

  // Right Singularity Orb
  ctx.save();
  ctx.translate(orbOffset, 0);
  drawPixelVoidOrb(ctx, Math.PI);
  ctx.restore();

  ctx.restore();
}

/**
 * Stepped Pixel Singularity Sphere with Orbiting Dark-Matter Diamonds
 */
function drawPixelVoidOrb(ctx, phaseOffset) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const t = Date.now();
  const pulse = Math.sin(t / 220 + phaseOffset) * 0.15 + 1.0;
  const baseR = 7 * pulse;

  // 1. Outer Translucent Dark-Matter Energy Rings (Simulated Glow without shadowBlur)
  ctx.fillStyle = 'rgba(147, 51, 234, 0.22)';
  ctx.fillRect(snap(-baseR * 1.5), snap(-baseR * 1.5), snap(baseR * 3), snap(baseR * 3));

  ctx.fillStyle = 'rgba(192, 132, 252, 0.40)';
  ctx.fillRect(snap(-baseR * 1.1), snap(-baseR * 1.1), snap(baseR * 2.2), snap(baseR * 2.2));

  // 2. Solid Stepped Void Core
  ctx.fillStyle = '#090214'; // Abyssal black core
  ctx.fillRect(snap(-baseR * 0.8), snap(-baseR * 0.8), snap(baseR * 1.6), snap(baseR * 1.6));

  // 3. Violet Event Horizon Border Shell
  ctx.strokeStyle = '#A855F7';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(snap(-baseR * 0.8), snap(-baseR * 0.8), snap(baseR * 1.6), snap(baseR * 1.6));

  // 4. White-Hot Central Singularity Spark
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(-P), snap(-P), P * 2, P * 2);

  // 5. Orbiting Dark-Matter Micro-Diamonds
  const orbitAngle = t / 160 + phaseOffset;
  const orbitDist = baseR + 5;
  const dotX = snap(Math.cos(orbitAngle) * orbitDist);
  const dotY = snap(Math.sin(orbitAngle) * orbitDist);

  // Diamond shape: center + 4 cardinal pixel arms
  ctx.fillStyle = '#E879F9';
  ctx.fillRect(dotX - P, dotY - P, P * 2, P * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(dotX - P * 0.5, dotY - P * 0.5, P, P);
}
