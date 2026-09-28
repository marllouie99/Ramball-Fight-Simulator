// CRAZY DAVE WEAPONS & PLANT VISUALS (Plants vs. Zombies)
// Authentic Discrete Pixel Art Aesthetics (100% Balanced Canvas 2D Stacks, Zero shadowBlur)

import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';

export const CrazyDave_WEAPON_GRAPHICS = {
  shovel: {
    name: 'Garden Shovel',
    id: 'crazydave_shovel',
    desc: 'Crazy Dave\'s trusty steel garden trowel/shovel. Swings in a wide arc and pops Sun out of enemies.',
  }
};

/**
 * Draws Crazy Dave's Shovel in hand or stowed.
 */
export function drawCrazyDaveShovel(
  ctx,
  x = 0,
  y = 0,
  angle = 0,
  r = 25,
  facingRight = true,
  swingTimer = 0,
  isStowed = false,
  color = '#84CC16',
  shouldHideHands = false
) {
  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) ctx.rotate(angle);

  const swingProgress = swingTimer > 0 ? Math.min(1.0, swingTimer / 16) : 0;
  const swingOffset = Math.sin(swingProgress * Math.PI) * 0.45;

  ctx.save();
  ctx.rotate(swingOffset);

  const shaftLength = r * 1.5;
  const shaftWidth = 3.2;

  // 1. Wooden Shaft
  ctx.fillStyle = '#78350F'; // Dark walnut wood
  ctx.fillRect(r * 0.2, -shaftWidth / 2, shaftLength, shaftWidth);

  ctx.fillStyle = '#92400E'; // Wood grain highlight
  ctx.fillRect(r * 0.2, -shaftWidth / 2 + 0.8, shaftLength, 1.2);

  // 2. Triangular Wooden / Plastic D-Grip at base
  const gripX = r * 0.2;
  ctx.fillStyle = '#451A03';
  ctx.fillRect(gripX - 4, -4, 4, 8);
  ctx.fillStyle = '#78350F';
  ctx.fillRect(gripX - 3, -3, 2, 6);

  // 3. Metallic Steel Shovel Scoop Head
  const scoopX = r * 0.2 + shaftLength;
  const scoopW = 12;
  const scoopH = 14;

  // Metallic Collar
  ctx.fillStyle = '#475569';
  ctx.fillRect(scoopX - 2, -3.5, 3, 7);

  // Steel Blade Head
  ctx.fillStyle = '#94A3B8'; // Slate Steel
  ctx.beginPath();
  ctx.moveTo(scoopX, -scoopH / 2);
  ctx.lineTo(scoopX + scoopW * 0.7, -scoopH / 2);
  ctx.lineTo(scoopX + scoopW, 0);
  ctx.lineTo(scoopX + scoopW * 0.7, scoopH / 2);
  ctx.lineTo(scoopX, scoopH / 2);
  ctx.closePath();
  ctx.fill();

  // Dark Outline
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Blade Metallic Highlight Core
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(scoopX + 2, -scoopH / 3);
  ctx.lineTo(scoopX + scoopW * 0.5, -scoopH / 3);
  ctx.lineTo(scoopX + scoopW * 0.75, 0);
  ctx.lineTo(scoopX + 2, 0);
  ctx.closePath();
  ctx.fill();

  // Specular Edge
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(scoopX + 2, -1, scoopW * 0.5, 1.5);

  // 4. Hand gripping shaft
  if (!shouldHideHands) {
    const handRadius = getHandSize(4.0);
    drawPixelHand(ctx, r * 0.65, 0, handRadius, '#FFE0BD', '#0E0F14');
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws a radiant bouncing Sun drop on the arena floor.
 */
export function drawSunDrop(ctx, sun) {
  if (!sun) return;
  const x = sun.x || 0;
  const y = sun.y || 0;
  const r = sun.r || 14;
  const pulse = sun.pulse || (Math.sin(Date.now() * 0.006) * 1.5);
  const rotAngle = sun.rotAngle || (Date.now() * 0.002);

  ctx.save();
  ctx.translate(x, y);

  // 1. Concentric Golden Halo (Rule 2.2: Zero shadowBlur)
  const haloGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r + 9 + pulse);
  haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
  haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
  haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r + 9 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating Sun Rays (8 triangular solar petals)
  ctx.save();
  ctx.rotate(rotAngle);
  ctx.fillStyle = '#F59E0B'; // Solar Amber
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 8; i++) {
    const rayAngle = (i * Math.PI) / 4;
    ctx.save();
    ctx.rotate(rayAngle);
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -3.5);
    ctx.lineTo(r * 1.45 + (pulse * 0.5), 0);
    ctx.lineTo(r * 0.7, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 3. Central Golden Disk Body
  ctx.fillStyle = '#FACC15'; // Bright Sunshine Yellow
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B45309'; // Dark golden outline
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Inner Specular Glint & Happy Core
  ctx.fillStyle = '#FEF08A'; // Pale Sun Glint
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Sun value mini badge if defined
  if (sun.value) {
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sun.value}`, 0, r * 0.1);
  }

  ctx.restore();
}

/**
 * Draws a cute, authentic green Peashooter turret entity.
 */
export function drawPeashooter(ctx, peashooter) {
  if (!peashooter) return;
  const x = peashooter.x || 0;
  const y = peashooter.y || 0;
  const r = peashooter.r || 18;
  const angle = peashooter.gunAngle || peashooter.angle || 0;
  const isHit = peashooter.hitFlashTimer > 0;
  const shootTimer = peashooter.shootAnimTimer || 0;
  const recoilOffset = shootTimer > 0 ? Math.sin((shootTimer / 10) * Math.PI) * 4.0 : 0;

  ctx.save();
  ctx.translate(x, y);

  // 1. Root Base / Leaf Skirt on floor
  ctx.fillStyle = isHit ? '#FFFFFF' : '#15803D'; // Deep leaf green
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;

  for (let i = 0; i < 4; i++) {
    const leafAngle = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.save();
    ctx.rotate(leafAngle);
    ctx.beginPath();
    ctx.ellipse(r * 0.85, 0, r * 0.5, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 2. Stem Neck
  ctx.fillStyle = isHit ? '#FFFFFF' : '#22C55E';
  ctx.fillRect(-3, -r * 0.6, 6, r * 0.8);
  ctx.strokeStyle = '#0E0F14';
  ctx.strokeRect(-3, -r * 0.6, 6, r * 0.8);

  // 3. Directional Head & Snout (Rotated by aim angle)
  ctx.save();
  ctx.rotate(angle);
  ctx.translate(-recoilOffset, 0);

  // Back Leaf Pod
  ctx.fillStyle = isHit ? '#FFFFFF' : '#16A34A';
  ctx.beginPath();
  ctx.ellipse(-r * 0.9, -2, r * 0.35, r * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Round Head Body
  ctx.fillStyle = isHit ? '#FFFFFF' : '#4ADE80'; // Vivid pea green
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout Cylinder (Fires the peas)
  const snoutLen = r * 0.75 + (shootTimer > 0 ? 3 : 0);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#22C55E';
  ctx.fillRect(r * 0.3, -r * 0.35, snoutLen, r * 0.7);
  ctx.strokeStyle = '#0E0F14';
  ctx.strokeRect(r * 0.3, -r * 0.35, snoutLen, r * 0.7);

  // Snout Opening (Dark Void Barrel)
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.ellipse(r * 0.3 + snoutLen, 0, 3.5, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head Highlight
  if (!isHit) {
    ctx.fillStyle = '#BBF7D0';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws a vibrant dancing Sunflower entity.
 */
export function drawSunflower(ctx, sunflower) {
  if (!sunflower) return;
  const x = sunflower.x || 0;
  const y = sunflower.y || 0;
  const r = sunflower.r || 18;
  const isHit = sunflower.hitFlashTimer > 0;
  const danceTime = Date.now() * 0.004;
  const bobY = Math.sin(danceTime) * 2.0;
  const swayAngle = Math.cos(danceTime) * 0.12;

  ctx.save();
  ctx.translate(x, y);

  // 1. Solar Warmth Ambient Pulse
  const glowR = r + 8 + (Math.sin(danceTime * 2) * 2);
  const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, glowR);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Base Leaves
  ctx.fillStyle = isHit ? '#FFFFFF' : '#16A34A';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const leafAngle = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.save();
    ctx.rotate(leafAngle);
    ctx.beginPath();
    ctx.ellipse(r * 0.8, 0, r * 0.45, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Stem with Sway
  ctx.save();
  ctx.translate(0, bobY);
  ctx.rotate(swayAngle);

  // 4. Yellow Sunflower Petals (12 petals)
  ctx.fillStyle = isHit ? '#FFFFFF' : '#FACC15'; // Sunny Yellow
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 12; i++) {
    const petalAngle = (i * Math.PI) / 6;
    ctx.save();
    ctx.rotate(petalAngle);
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -3.0);
    ctx.lineTo(r * 1.0, 0);
    ctx.lineTo(r * 0.45, 3.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 5. Brown Seed Center Face
  ctx.fillStyle = isHit ? '#FFFFFF' : '#78350F';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Face Highlight
  if (!isHit) {
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.arc(-2, -2, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws a sturdy Wall-nut barricade entity.
 */
export function drawWallNut(ctx, wallnut) {
  if (!wallnut) return;
  const x = wallnut.x || 0;
  const y = wallnut.y || 0;
  const r = wallnut.r || 20;
  const isHit = wallnut.hitFlashTimer > 0;
  const hpRatio = (wallnut.hp !== undefined && wallnut.maxHp) ? (wallnut.hp / wallnut.maxHp) : 1.0;

  ctx.save();
  ctx.translate(x, y);

  // 1. Oval Walnut Shell
  ctx.fillStyle = isHit ? '#FFFFFF' : '#854D0E'; // Golden brown shell
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Shell Textures & Shading
  if (!isHit) {
    ctx.fillStyle = '#A16207'; // Shell Highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.2, r * 0.45, r * 0.65, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#713F12'; // Base Shadow
    ctx.beginPath();
    ctx.ellipse(r * 0.3, r * 0.3, r * 0.35, r * 0.55, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Crack / Bandaid overlay if damaged (<60% HP)
  if (hpRatio < 0.65) {
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.4);
    ctx.lineTo(-r * 0.1, -r * 0.1);
    ctx.lineTo(-r * 0.35, r * 0.2);
    ctx.stroke();

    if (hpRatio < 0.35) {
      // White/Cream Bandaid
      ctx.fillStyle = '#FEF08A';
      ctx.save();
      ctx.translate(r * 0.1, r * 0.1);
      ctx.rotate(0.4);
      ctx.fillRect(-8, -3, 16, 6);
      ctx.strokeStyle = '#A16207';
      ctx.strokeRect(-8, -3, 16, 6);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Draws an agitated ticking Cherry Bomb entity.
 */
export function drawCherryBomb(ctx, cherrybomb) {
  if (!cherrybomb) return;
  const x = cherrybomb.x || 0;
  const y = cherrybomb.y || 0;
  const r = cherrybomb.r || 16;
  const fuseTimer = cherrybomb.fuseTimer || 45;
  const maxFuse = cherrybomb.maxFuse || 45;
  const fuseRatio = 1.0 - (fuseTimer / maxFuse);
  const swellScale = 1.0 + fuseRatio * 0.4;
  const isFlashing = Math.floor(Date.now() / 80) % 2 === 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(swellScale, swellScale);

  // 1. Green Stem connecting twin cherries
  ctx.strokeStyle = '#15803D';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.2);
  ctx.quadraticCurveTo(0, -r * 1.1, 0, -r * 1.1);
  ctx.quadraticCurveTo(0, -r * 1.1, r * 0.5, -r * 0.2);
  ctx.stroke();

  // Fuse Spark at apex
  ctx.fillStyle = isFlashing ? '#FACC15' : '#EF4444';
  ctx.beginPath();
  ctx.arc(0, -r * 1.15, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Left Cherry Sphere
  ctx.fillStyle = isFlashing ? '#F87171' : '#DC2626';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.arc(-r * 0.5, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Right Cherry Sphere
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Specular Highlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.65, -r * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(r * 0.35, -r * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a charging motorized Lawn Mower entity.
 */
export function drawLawnMower(ctx, mower) {
  if (!mower) return;
  const x = mower.x || 0;
  const y = mower.y || 0;
  const r = mower.r || 24;
  const angle = mower.angle || 0;
  const bladeRot = (Date.now() * 0.04) % (Math.PI * 2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const mW = r * 1.6;
  const mH = r * 1.1;

  // 1. Wheels (4 black rubber tires)
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-mW * 0.45, -mH * 0.65, 8, 5);
  ctx.fillRect(mW * 0.25, -mH * 0.65, 8, 5);
  ctx.fillRect(-mW * 0.45, mH * 0.55, 8, 5);
  ctx.fillRect(mW * 0.25, mH * 0.55, 8, 5);

  // 2. Red Metal Chassis
  ctx.fillStyle = '#DC2626'; // Bright Mower Red
  ctx.fillRect(-mW * 0.5, -mH * 0.5, mW, mH);
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-mW * 0.5, -mH * 0.5, mW, mH);

  // Chassis Highlight
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-mW * 0.45, -mH * 0.45, mW * 0.9, mH * 0.4);

  // 3. Motor Block / Engine
  ctx.fillStyle = '#475569';
  ctx.fillRect(-mW * 0.2, -mH * 0.35, mW * 0.4, mH * 0.7);
  ctx.strokeStyle = '#0E0F14';
  ctx.strokeRect(-mW * 0.2, -mH * 0.35, mW * 0.4, mH * 0.7);

  // 4. Spinning Front Blades
  ctx.save();
  ctx.translate(mW * 0.5, 0);
  ctx.rotate(bladeRot);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(6, 6);
  ctx.moveTo(6, -6);
  ctx.lineTo(-6, 6);
  ctx.stroke();
  ctx.restore();

  // 5. Chrome Handlebars
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-mW * 0.4, -mH * 0.3);
  ctx.lineTo(-mW * 0.85, -mH * 0.2);
  ctx.moveTo(-mW * 0.4, mH * 0.3);
  ctx.lineTo(-mW * 0.85, mH * 0.2);
  ctx.moveTo(-mW * 0.85, -mH * 0.2);
  ctx.lineTo(-mW * 0.85, mH * 0.2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a crisp spherical green Pea projectile.
 */
export function drawPeaBullet(ctx, p) {
  if (!p) return;
  const x = p.x || 0;
  const y = p.y || 0;
  const r = p.r || 5.5;

  ctx.save();
  ctx.translate(x, y);

  // 1. Subtle green speed halo
  const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 4);
  halo.addColorStop(0, 'rgba(134, 239, 172, 0.7)');
  halo.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.fill();

  // 2. Solid Pea Sphere
  ctx.fillStyle = '#22C55E'; // Vibrant Pea Green
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#065F46'; // Dark Emerald Outline
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Specular Glint
  ctx.fillStyle = '#DCFCE7';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.35, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.4, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Wrapper for Weapon Studio & standalone rendering.
 */
export function drawCrazyDaveWeapon(ctx, options = {}) {
  const x = options.x || 0;
  const y = options.y || 0;
  const angle = options.angle || 0;
  const r = options.r || 25;
  const color = options.color || '#84CC16';

  drawCrazyDaveShovel(ctx, x, y, angle, r, true, 0, false, color, false);
}
