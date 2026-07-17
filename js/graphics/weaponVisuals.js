// ─────────────────────────────────────────────
// WEAPON VISUALS
// ─────────────────────────────────────────────
//
// This file contains the custom weapon drawing helpers used by fighter classes.
// Adjust the size of each weapon by changing the constants below.
// Most functions use the fighter radius `r` to scale naturally with the fighter.
// If you want to move the weapon farther from the body, update
// `CONFIG.gun.baseOffset` in js/config.js.
//
// NOTE: Weapon graphics have been moved to individual files in js/graphics/weapons/:
//       - Gun Slinger: gunSlingerWeaponGraphics.js
//       - Berserker: berserkerWeaponGraphics.js
//       - Cronos: cronosWeaponGraphics.js
//       - Crimson Sniper: cronosWeaponGraphics.js
//       - Flamewarden: flamewardenWeaponGraphics.js
//       - Assassin (Dark Slate Gray): asassinWeaponGraphics.js
//       - Ivory (White): ivoryWeaponGraphics.js
//       - Spike: spikeWeaponGraphics.js
//       - Bomber: bomberWeaponGraphics.js

import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
export { drawGunSlingerDualRevolver } from './weapons/gunSlingerWeaponGraphics.js';
export { drawBerserkerDualAxes } from './weapons/berserkerWeaponGraphics.js';
export { drawCronosCrescentBlade } from './weapons/cronosWeaponGraphics.js';
export { drawRedSniperGun } from './weapons/crimsonsniperWeaponGraphics.js';
export { drawOrangeFlamethrowerGun } from './weapons/flamewardenWeaponGraphics.js';
export { drawDarkSlateGrayShuriken, drawDarkSlateGrayMelee, drawShurikenProjectile } from './weapons/asassinWeaponGraphics.js';
export { drawWhiteRailgun, drawWhiteChargeEffect } from './weapons/ivoryWeaponGraphics.js';
export { drawSpikeWeapon, drawSingleSpike } from './weapons/spikeWeaponGraphics.js';
export { drawBlueAimbotGun } from './weapons/rangerWeaponGraphics.js';
export { drawEngineer, drawEngineerBullet, drawTurret, drawTurretBullet, Engineer_WEAPON_GRAPHICS } from './engineerWeaponGraphics.js';
export { drawBomberGrenade } from './weapons/bomberWeaponGraphics.js';
export { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from './weapons/dopplegangerWeaponGraphics.js';
export { drawVoidmasterWeapon } from './weapons/voidmasterWeaponGraphics.js';
export { drawZeusWeapon } from './weapons/zeusWeaponGraphics.js';

// ─────────────────────────────────────────────
// GRAY KNIGHT WEAPONS (Shield & Sword)
// ─────────────────────────────────────────────

export { drawGrayShield, drawGraySword, drawGrayBrokenSword, drawGraySwordProjectile } from './weapons/knightWeaponGrpahics.js';

export function drawSwordProjectile(ctx, x, y, angle, scale = 1.0) {
  // Draw the same cyberpunk sword art used for Gray's held sword,
  // but scaled down and positioned at (x,y) pointing along `angle`.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const swordScale = Math.max(0.4, scale); // enforce a minimum readable size

  // Pommel
  ctx.fillStyle = '#7a838b';
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5 * swordScale;
  ctx.beginPath();
  ctx.arc(-22 * swordScale, 0, 4.4 * swordScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Grip
  ctx.fillStyle = '#111214';
  ctx.strokeStyle = '#2b2f33';
  ctx.lineWidth = 1 * swordScale;
  ctx.fillRect(-18 * swordScale, -4 * swordScale, 16 * swordScale, 8 * swordScale);
  ctx.strokeRect(-18 * swordScale, -4 * swordScale, 16 * swordScale, 8 * swordScale);

  // Guard / armored midsection
  ctx.fillStyle = '#232830';
  ctx.strokeStyle = '#5f6974';
  ctx.lineWidth = 1.2 * swordScale;
  ctx.beginPath();
  ctx.moveTo(-3 * swordScale, -14 * swordScale);
  ctx.lineTo(8 * swordScale, -14 * swordScale);
  ctx.lineTo(10 * swordScale, -8 * swordScale);
  ctx.lineTo(10 * swordScale, 8 * swordScale);
  ctx.lineTo(8 * swordScale, 14 * swordScale);
  ctx.lineTo(-3 * swordScale, 14 * swordScale);
  ctx.lineTo(-6 * swordScale, 8 * swordScale);
  ctx.lineTo(-6 * swordScale, -8 * swordScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Activation button
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath();
  ctx.arc(-10 * swordScale, -8 * swordScale, 1.5 * swordScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a0c0c';
  ctx.lineWidth = 0.6 * swordScale;
  ctx.stroke();

  // Blade
  ctx.beginPath();
  ctx.moveTo(6 * swordScale, -4.8 * swordScale);
  ctx.lineTo(18 * swordScale, -3.6 * swordScale);
  ctx.lineTo(40 * swordScale, -2.1 * swordScale);
  ctx.lineTo(64 * swordScale, -0.6 * swordScale);
  ctx.lineTo(76 * swordScale, 0);
  ctx.lineTo(64 * swordScale, 0.6 * swordScale);
  ctx.lineTo(40 * swordScale, 2.1 * swordScale);
  ctx.lineTo(18 * swordScale, 3.6 * swordScale);
  ctx.lineTo(6 * swordScale, 4.8 * swordScale);
  ctx.closePath();

  const bladeGradient = ctx.createLinearGradient(6 * swordScale, -5 * swordScale, 76 * swordScale, 5 * swordScale);
  bladeGradient.addColorStop(0, '#050608');
  bladeGradient.addColorStop(0.35, '#20252b');
  bladeGradient.addColorStop(0.72, '#111419');
  bladeGradient.addColorStop(1, '#06080a');
  ctx.fillStyle = bladeGradient;
  ctx.fill();
  ctx.strokeStyle = '#3a4149';
  ctx.lineWidth = 1.1 * swordScale;
  ctx.stroke();

  ctx.save();
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.beginPath();
  ctx.moveTo(6 * swordScale, -4 * swordScale);
  ctx.lineTo(20 * swordScale, -3 * swordScale);
  ctx.lineTo(48 * swordScale, -1.2 * swordScale);
  ctx.lineTo(74 * swordScale, 0);
  ctx.lineTo(48 * swordScale, 1.2 * swordScale);
  ctx.lineTo(20 * swordScale, 3 * swordScale);
  ctx.lineTo(6 * swordScale, 4 * swordScale);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 0.8 * swordScale;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(8 * swordScale, -3.3 * swordScale);
  ctx.lineTo(24 * swordScale, -2.6 * swordScale);
  ctx.lineTo(40 * swordScale, -1.8 * swordScale);
  ctx.lineTo(56 * swordScale, -1.1 * swordScale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8 * swordScale, 3.3 * swordScale);
  ctx.lineTo(24 * swordScale, 2.6 * swordScale);
  ctx.lineTo(40 * swordScale, 1.8 * swordScale);
  ctx.lineTo(56 * swordScale, 1.1 * swordScale);
  ctx.stroke();
  ctx.fillStyle = '#00e5ff';
  for (const [cx, cy] of [[58, -0.8], [60.5, 0.2], [63.5, -0.3]]) {
    ctx.beginPath();
    ctx.arc(cx * swordScale, cy * swordScale, 0.8 * swordScale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

export function drawPoisonBottleCore(ctx, scale = 1.15) {
  ctx.save();
  ctx.scale(scale, scale);

  const flaskRadius = 13;
  const neckWidth = 8;
  const neckHeight = 12;
  const intersectAngle = Math.acos((neckWidth / 2) / flaskRadius);
  const neckY = -flaskRadius * Math.sin(intersectAngle) - neckHeight;

  // 1. Back/Inner Liquid Glow
  const liquidGrad = ctx.createRadialGradient(0, 5, 0, 0, 5, flaskRadius);
  liquidGrad.addColorStop(0, '#7fff00'); // Bright green center
  liquidGrad.addColorStop(0.7, '#228b22'); // Darker green
  liquidGrad.addColorStop(1, '#004400'); // Deep dark green

  // Draw Liquid Level (Clip region)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(neckWidth / 2, neckY);
  ctx.arc(0, 0, flaskRadius - 1.5, -intersectAngle, Math.PI + intersectAngle, false);
  ctx.lineTo(-neckWidth / 2, neckY);
  ctx.closePath();
  ctx.clip(); // Restrict liquid to inside the bottle

  ctx.fillStyle = liquidGrad;
  // Fill liquid up to a certain height
  ctx.fillRect(-flaskRadius, -flaskRadius * 0.2, flaskRadius * 2, flaskRadius * 2.2);

  // Liquid Surface (Ellipse)
  ctx.beginPath();
  ctx.ellipse(0, -flaskRadius * 0.2, flaskRadius - 1.5, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#aaff66';
  ctx.fill();
  
  // Small bubbling effect inside the flask
  const t = performance.now() / 200;
  ctx.fillStyle = 'rgba(200, 255, 150, 0.8)';
  for (let i = 0; i < 6; i++) {
    const bx = -flaskRadius * 0.6 + ((i * 47 + t) % (flaskRadius * 1.2));
    const by = flaskRadius * 0.8 - ((i * 23 + t * 2.5) % (flaskRadius * 1.0));
    ctx.beginPath();
    ctx.arc(bx, by, 1 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // Remove clip

  // 2. Flask Glass Body (Perimeter)
  ctx.beginPath();
  ctx.moveTo(neckWidth / 2, neckY);
  ctx.arc(0, 0, flaskRadius, -intersectAngle, Math.PI + intersectAngle, false);
  ctx.lineTo(-neckWidth / 2, neckY);
  ctx.closePath();

  // Glass gradient
  const glassGrad = ctx.createLinearGradient(-flaskRadius, 0, flaskRadius, 0);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  glassGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)');
  glassGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
  glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
  
  ctx.fillStyle = glassGrad;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(200, 255, 200, 0.7)';
  ctx.stroke();

  // 3. Flask Lip
  ctx.beginPath();
  ctx.roundRect(-neckWidth / 2 - 2.5, neckY - 2, neckWidth + 5, 5, 2);
  ctx.fillStyle = 'rgba(220, 255, 220, 0.9)';
  ctx.fill();
  ctx.stroke();

  // 4. Cork
  ctx.beginPath();
  ctx.roundRect(-neckWidth / 2 + 1, neckY - 9, neckWidth - 2, 8, 1);
  ctx.fillStyle = '#8b5a2b';
  ctx.fill();
  ctx.strokeStyle = '#5c3a18';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Glass Highlight (Curved reflection)
  ctx.beginPath();
  ctx.arc(0, 0, flaskRadius - 3.5, Math.PI * 0.6, Math.PI * 1.1, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 6. Poison Label
  ctx.beginPath();
  ctx.roundRect(-7, -4, 14, 12, 2);
  ctx.fillStyle = '#f4e4bc'; // Parchment
  ctx.fill();
  ctx.strokeStyle = '#b09b71';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw tiny skull symbol on label
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -1, 3, 0, Math.PI * 2); // skull head
  ctx.fill();
  ctx.fillRect(-2, 1, 4, 3); // skull jaw
  
  // Skull eyes
  ctx.fillStyle = '#f4e4bc';
  ctx.beginPath();
  ctx.arc(-1.2, -1, 0.8, 0, Math.PI * 2);
  ctx.arc(1.2, -1, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawGreenBottleGun(ctx, x, y, gunAngle, r, throwProgress = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Animate during a throw (moves out and rotates slightly)
  const throwOffsetX = Math.sin(throwProgress * Math.PI) * 10;
  const throwRot = Math.sin(throwProgress * Math.PI) * (Math.PI / 4); // rotate 45 degrees
  
  const cx = r + 13 + throwOffsetX;
  const cy = 0;
  
  ctx.translate(cx, cy);
  ctx.rotate(throwRot);

  drawPoisonBottleCore(ctx, 1.15);
  ctx.restore();
}

export function drawGreenBoilingEffect(ctx, x, y, gunAngle, r, active) {
  if (!active) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const neckX = r + 13;
  // The top of the cork is around -33 scaled, so bubbles should start there
  const startY = -33;
  const progress = (Math.sin(Date.now() / 120) + 1) / 2;

  for (let i = 0; i < 5; i += 1) {
    const offsetY = startY - i * 6 - progress * 5;
    const offsetX = Math.sin(Date.now() / 200 + i * 2) * 4; // slight swaying
    const radius = 1.5 + Math.sin(Date.now() / 180 + i) * 1.2;
    
    ctx.beginPath();
    ctx.fillStyle = `rgba(180, 255, 100, ${0.7 - i * 0.12})`;
    ctx.arc(neckX + offsetX, offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────

