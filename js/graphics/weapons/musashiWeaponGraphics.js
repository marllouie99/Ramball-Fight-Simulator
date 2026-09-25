// ─────────────────────────────────────────────
// Musashi Weapon Graphics & Visual Effects (Authentic Upright Anime Edition)
// Dual Niten Ichi-ryū Katanas:
// 1. Primary Katana (Dark Damascus steel with glowing neon stance hamon edge)
// 2. Companion Wakizashi (Polished gunmetal metallic blade with wavy temper line)
// 3. Dual Sheaths (Saya) with Sageo cords & physics-simulated Kusari hanging chains
// 4. Calligraphy Ink-Brush Smoke Trail after Phantom Flurry
// Adheres strictly to Rule 19 (Upright Front POV), Rule 20 (Pixel Hands), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

export function drawMusashiWeapons(ctx, fighter, isLocal = false) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  if (!fighter) return;

  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  // Weapon Studio customization support
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.musashi)
    ? state.weaponCustomizations.musashi
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();

  if (!isLocal) {
    ctx.translate(fighter.x, fighter.y);
    const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft && !fighter.isSpinning) {
      ctx.scale(1, -1);
    }
  }

  if (customOffsetX !== 0 || customOffsetY !== 0) {
    ctx.translate(customOffsetX, customOffsetY);
  }
  if (customAngle !== 0) {
    ctx.rotate(customAngle);
  }
  if (customScale !== 1.0) {
    ctx.scale(customScale, customScale);
  }

  // ── 1. Calculate Local Upright Stance Angles & Hand Coordinates ──
  // In local upright front-POV: +X is Forward (towards enemy), -X is Back, -Y is Up (Hair), +Y is Down (Hakama)
  let targetKatanaAngle = -Math.PI / 14;   // Slight upward tilt (~ -12.8 deg)
  let targetWakizashiAngle = Math.PI / 10; // Downward-forward guard (~ +18 deg)

  let katanaHandX = r * 0.85;
  let katanaHandY = -r * 0.12;

  let wakizashiHandX = r * 0.65;
  let wakizashiHandY = r * 0.22;

  const strikeMax = 15;
  if (fighter.strikeTimer && fighter.strikeTimer > 0) {
    const prog = 1.0 - (fighter.strikeTimer / strikeMax);
    if (fighter.nitenActiveTimer > 0 || fighter.isNitenSecondHit) {
      if (!fighter.isNitenSecondHit) {
        // Quick Wakizashi Thrust/Slash
        targetWakizashiAngle = -Math.PI / 4 + (prog * Math.PI * 0.55);
        wakizashiHandX = r * 0.92;
        targetKatanaAngle = -Math.PI / 10; // Katana held in steady guard
      } else {
        // Heavy Katana Overhead/Cross Cleave
        targetKatanaAngle = -Math.PI / 2.2 + (prog * Math.PI * 0.85);
        katanaHandX = r * 0.95 + Math.sin(prog * Math.PI) * 6;
        targetWakizashiAngle = Math.PI / 6; // Wakizashi held back at hip
      }
    } else {
      // Basic Niten Dual Slash (Scissor / Cross X swing)
      targetKatanaAngle = -Math.PI / 3 + (prog * Math.PI * 0.65);
      targetWakizashiAngle = Math.PI / 3 - (prog * Math.PI * 0.65);
      katanaHandX = r * 0.88 + Math.sin(prog * Math.PI) * 4;
      wakizashiHandX = r * 0.72 + Math.sin(prog * Math.PI) * 4;
    }
  } else if (fighter.dashAnimTimer && fighter.dashAnimTimer > 0) {
    // Aerodynamic Dash / Piercing Stance: Katana points dead straight forward, Wakizashi tight at flank
    targetKatanaAngle = 0;
    katanaHandX = r * 1.05;
    katanaHandY = -r * 0.08;

    targetWakizashiAngle = Math.PI / 14;
    wakizashiHandX = r * 0.75;
    wakizashiHandY = r * 0.20;
  } else {
    // IDLE / COMBAT SPACING
    const distSq = fighter.distToTargetSq !== undefined ? fighter.distToTargetSq : 0;
    const isClose = distSq < 40000; // ~200 pixels

    if (isClose) {
      // X-Shape Niten Guard (Close combat parry guard)
      targetKatanaAngle = -Math.PI / 5.5;  // Angled forward-up
      katanaHandX = r * 0.80;
      katanaHandY = -r * 0.16;

      targetWakizashiAngle = Math.PI / 5.5; // Crossed forward-up to lock blades in front
      wakizashiHandX = r * 0.72;
      wakizashiHandY = r * 0.14;
    } else {
      // Flowing Ready Stance (Out of range)
      targetKatanaAngle = -Math.PI / 14;
      katanaHandX = r * 0.85;
      katanaHandY = -r * 0.12;

      targetWakizashiAngle = Math.PI / 10;
      wakizashiHandX = r * 0.65;
      wakizashiHandY = r * 0.22;
    }
  }

  // Smooth shortest-path angle interpolation
  const lerpAngle = (current, target, t) => {
    let diff = (target - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * t;
  };

  if (fighter.vLocalKatanaAngle === undefined) {
    fighter.vLocalKatanaAngle = targetKatanaAngle;
    fighter.vLocalWakizashiAngle = targetWakizashiAngle;
    fighter.vKatanaHandX = katanaHandX;
    fighter.vKatanaHandY = katanaHandY;
    fighter.vWakizashiHandX = wakizashiHandX;
    fighter.vWakizashiHandY = wakizashiHandY;
  }

  const lerpSpeed = (fighter.strikeTimer > 0 || (fighter.dashAnimTimer || 0) > 0) ? 1.0 : 0.25;
  fighter.vLocalKatanaAngle = lerpAngle(fighter.vLocalKatanaAngle, targetKatanaAngle, lerpSpeed);
  fighter.vLocalWakizashiAngle = lerpAngle(fighter.vLocalWakizashiAngle, targetWakizashiAngle, lerpSpeed);
  fighter.vKatanaHandX += (katanaHandX - fighter.vKatanaHandX) * lerpSpeed;
  fighter.vKatanaHandY += (katanaHandY - fighter.vKatanaHandY) * lerpSpeed;
  fighter.vWakizashiHandX += (wakizashiHandX - fighter.vWakizashiHandX) * lerpSpeed;
  fighter.vWakizashiHandY += (wakizashiHandY - fighter.vWakizashiHandY) * lerpSpeed;

  // Stance aura color palette
  let aura = '#fff';
  if (fighter.currentStance === 'earth') aura = 'rgb(220, 100, 50)';
  if (fighter.currentStance === 'water') aura = 'rgb(50, 180, 255)';
  if (fighter.currentStance === 'fire') aura = 'rgb(255, 80, 20)';
  if (fighter.currentStance === 'wind') aura = 'rgb(80, 220, 130)';
  if (fighter.currentStance === 'void') aura = 'rgb(180, 80, 255)';

  // ── INK-BRUSH SMOKE TRAIL (after Phantom Flurry) ──
  if (fighter.flurrySmokeTimer && fighter.flurrySmokeTimer > 0) {
    const smokeAlpha = fighter.flurrySmokeTimer / 150;
    _drawBrushSmokeTrail(ctx, fighter.vKatanaHandX, fighter.vKatanaHandY, fighter.vLocalKatanaAngle, smokeAlpha, 87, false);
    _drawBrushSmokeTrail(ctx, fighter.vWakizashiHandX, fighter.vWakizashiHandY, fighter.vLocalWakizashiAngle, smokeAlpha, 58, true);
  }

  // ── LAYER 1: Draw Wakizashi (Left/Offhand Sword) ──
  drawWakizashiAt(ctx, fighter.vWakizashiHandX, fighter.vWakizashiHandY, fighter.vLocalWakizashiAngle, 0.95, aura, '#E0A882');

  // ── LAYER 2: Draw Katana (Right/Lead Sword) on top ──
  drawKatanaAt(ctx, fighter.vKatanaHandX, fighter.vKatanaHandY, fighter.vLocalKatanaAngle, 1.0, aura, '#E0A882');

  ctx.restore();
}

/**
 * Draws the Primary Katana at the specified local hand coordinates and angle.
 */
export function drawKatanaAt(ctx, handX, handY, angle, scale = 1.0, auraColor = '#32b4ff', skinColor = '#E0A882') {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── 1. Kashira (Pommel End Cap) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-22, -3.5, 5, 7);
  ctx.fillStyle = '#1A1C22';
  ctx.fillRect(-21, -2.5, 3, 5);

  // ── 2. Tsuka (Handle with Diamond Cutout Wrapping) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-17, -3, 18, 6);
  ctx.fillStyle = '#1C1F28';
  ctx.fillRect(-16, -2, 16, 4);

  // Diamond wraps (Tsuka-ito)
  ctx.fillStyle = '#3A4154';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-14 + i * 5, -1, 3, 2);
  }

  // ── 3. Tsuba (Rectangular Handguard) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-1, -7, 4, 14);
  ctx.fillStyle = '#2A2E3B';
  ctx.fillRect(0, -6, 2, 12);
  ctx.fillStyle = '#5A637C';
  ctx.fillRect(0, -5, 1, 10);

  // ── 4. Habaki (Gold Blade Collar) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(2, -4, 5, 8);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(3, -3.5, 3, 7);
  ctx.fillStyle = '#FFF2A8';
  ctx.fillRect(3, -3.5, 1, 7);

  // ── 5. Blade Body (Sweeping Dark Steel Kissaki) ──
  ctx.beginPath();
  ctx.moveTo(6, -3.5);
  // Curved spine
  ctx.bezierCurveTo(30, -4.5, 60, -6.5, 82, -4);
  // Kissaki sharp tip
  ctx.lineTo(87, 0);
  // Sweeping cutting edge
  ctx.bezierCurveTo(60, 3.5, 30, 3.5, 6, 3.5);
  ctx.closePath();

  // Damascus steel gradient
  const bladeGrad = ctx.createLinearGradient(6, -5, 6, 4);
  bladeGrad.addColorStop(0, '#161820');
  bladeGrad.addColorStop(0.4, '#2A2E3A');
  bladeGrad.addColorStop(0.6, '#1C1F28');
  bladeGrad.addColorStop(1, '#101217');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Dark outline
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // ── 6. Shinogi (Ridge line) ──
  ctx.beginPath();
  ctx.moveTo(6, -1);
  ctx.bezierCurveTo(30, -2, 60, -3, 82, -2);
  ctx.strokeStyle = '#3E465A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── 7. Glowing Stance Aura along the cutting edge (Simulated Glow - Rule 11) ──
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(6, 3.5);
  ctx.bezierCurveTo(30, 3.5, 60, 3.5, 87, 0);

  // Outer bloom
  ctx.strokeStyle = auraColor;
  ctx.lineWidth = 12;
  ctx.globalAlpha = 0.15;
  ctx.stroke();

  // Mid glow
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.40;
  ctx.stroke();

  // Inner core glow
  ctx.lineWidth = 2.8;
  ctx.globalAlpha = 0.95;
  ctx.stroke();

  // Razor white cutting line
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  ctx.restore();

  // ── 8. Pixel Hand Gripping the Katana Tsuka ──
  drawPixelHand(ctx, -7, 0, getHandSize(5.8), skinColor || '#E0A882', '#0E0F14');

  ctx.restore();
}

/**
 * Draws the Companion Wakizashi at the specified local hand coordinates and angle.
 */
export function drawWakizashiAt(ctx, handX, handY, angle, scale = 1.0, auraColor = '#32b4ff', skinColor = '#E0A882') {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── 1. Kashira (Pommel) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-16, -3, 4, 6);
  ctx.fillStyle = '#1A1C22';
  ctx.fillRect(-15, -2, 2, 4);

  // ── 2. Handle with Cross-Hatch Tsuka Wrapping ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-13, -2.5, 14, 5);
  ctx.fillStyle = '#181A20';
  ctx.fillRect(-12, -2, 12, 4);

  ctx.strokeStyle = '#353B4B';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const wx = -10 + i * 2.2;
    ctx.beginPath();
    ctx.moveTo(wx, -2);
    ctx.lineTo(wx + 1.5, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + 1.5, -2);
    ctx.lineTo(wx, 2);
    ctx.stroke();
  }

  // ── 3. Tsuba (Rectangular Guard) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-1, -5.5, 3, 11);
  ctx.fillStyle = '#8A7A50';
  ctx.fillRect(0, -4.5, 2, 9);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, -3.5, 1, 7);

  // ── 4. Habaki (Collar) ──
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(1, -4, 4, 8);
  ctx.fillStyle = '#B0A070';
  ctx.fillRect(2, -3.5, 2, 7);

  // ── 5. Blade Body (Wide Metallic Gunmetal Profile) ──
  ctx.beginPath();
  ctx.moveTo(4, -4.0);
  ctx.bezierCurveTo(18, -4.5, 38, -6.5, 52, -4.5);
  ctx.lineTo(56, -0.5); // Wakizashi tip
  ctx.bezierCurveTo(38, 3.5, 18, 4.0, 4, 4.0);
  ctx.closePath();

  // Gunmetal steel gradient
  const bladeGrad = ctx.createLinearGradient(4, -5, 4, 4);
  bladeGrad.addColorStop(0, '#555A66');
  bladeGrad.addColorStop(0.3, '#888F9E');
  bladeGrad.addColorStop(0.5, '#4A505C');
  bladeGrad.addColorStop(0.7, '#788090');
  bladeGrad.addColorStop(1, '#2E323A');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // ── 6. Shinogi & Hamon Wave ──
  ctx.beginPath();
  ctx.moveTo(4, -1);
  ctx.bezierCurveTo(18, -2, 38, -2.8, 52, -2);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Hamon temper wave
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.quadraticCurveTo(14, 0.5, 24, 2);
  ctx.quadraticCurveTo(34, 3.5, 44, 1);
  ctx.quadraticCurveTo(48, 0, 54, 0);
  ctx.strokeStyle = 'rgba(220, 230, 245, 0.65)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── 7. Glowing Stance Aura on cutting edge ──
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(4, 4.0);
  ctx.bezierCurveTo(18, 4.0, 38, 3.0, 56, -0.5);

  ctx.strokeStyle = auraColor;
  ctx.lineWidth = 10;
  ctx.globalAlpha = 0.15;
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.40;
  ctx.stroke();

  ctx.lineWidth = 2.4;
  ctx.globalAlpha = 0.95;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  ctx.restore();

  // ── 8. Pixel Hand Gripping Wakizashi Tsuka ──
  drawPixelHand(ctx, -5, 0, getHandSize(5.4), skinColor || '#E0A882', '#0E0F14');

  ctx.restore();
}

/**
 * Backward compatibility functions for legacy callers.
 */
export function drawKatana(ctx, offset, scale, auraColor, fighterColor = '#555') {
  drawKatanaAt(ctx, offset, 0, 0, scale, auraColor, fighterColor);
}

export function drawWakizashi(ctx, offset, scale, auraColor, fighterColor = '#555') {
  drawWakizashiAt(ctx, offset, 0, 0, scale, auraColor, fighterColor);
}

/**
 * SAYA (SHEATHS) — Mounted at the samurai's hip in Upright Anime POV
 */
export function drawMusashiSheaths(ctx, fighter, hasSwords = false, isLocal = false) {
  if (!fighter) return;
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();

  if (!isLocal) {
    ctx.translate(fighter.x, fighter.y);
    const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft && !fighter.isSpinning) {
      ctx.scale(1, -1);
    }
  }

  // Hip attachment point in front POV coordinates: (-r * 0.35, r * 0.40)
  const hipX = -r * 0.35;
  const hipY = r * 0.38;

  // ── 1. Katana Sheath (Longer sweeping scabbard angled backward-down) ──
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(Math.PI * 0.92); // Points backward and slightly down (-X, +Y)

  ctx.fillStyle = '#08090C';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.bezierCurveTo(20, -3.5, 45, -1.5, 60, 1);
  ctx.lineTo(61, 4.5);
  ctx.bezierCurveTo(45, 5, 20, 4.5, 0, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sageo cords
  ctx.strokeStyle = '#3A4154';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(12 + i * 4, -3.5);
    ctx.lineTo(15 + i * 4, 4);
    ctx.stroke();
  }

  // If sheathed, sword handle sticks out of scabbard opening (pointing forward in local space)
  if (hasSwords) {
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(-17, -2.5, 17, 5);
    ctx.fillStyle = '#1C1F28';
    ctx.fillRect(-16, -2, 15, 4);
    // Tsuba
    ctx.fillStyle = '#2A2E3B';
    ctx.fillRect(0, -6, 3, 12);
  }

  // ── Hanging Kusari Chains Physics ──
  let chainVx = -(fighter.vx || 0) * 1.5;
  let chainVy = 5 - (fighter.vy || 0) * 1.5;
  let targetAngle = Math.atan2(chainVy, chainVx);

  if (!fighter.chainAngles) fighter.chainAngles = [targetAngle, targetAngle];
  if (!fighter.chainVelocities) fighter.chainVelocities = [0, 0];

  const now = performance.now();
  if (fighter.lastChainUpdate === undefined) fighter.lastChainUpdate = now;
  const updatePhysics = (now - fighter.lastChainUpdate) >= (1000 / 30);
  if (updatePhysics) {
    fighter.lastChainUpdate = now;
  }

  const chainConfigs = [
    { attachX: 18, numLinks: 6, charmColor: '#FF4500', stiffness: 0.1, damping: 0.88 },
    { attachX: 26, numLinks: 8, charmColor: '#FF4500', stiffness: 0.07, damping: 0.92 }
  ];

  for (let c = 0; c < chainConfigs.length; c++) {
    const config = chainConfigs[c];

    if (updatePhysics) {
      let diff = targetAngle - fighter.chainAngles[c];
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      fighter.chainVelocities[c] += diff * config.stiffness;
      fighter.chainVelocities[c] *= config.damping;
      fighter.chainAngles[c] += fighter.chainVelocities[c];
    }

    ctx.save();
    ctx.translate(config.attachX, 4.5);

    const chainAngle = fighter.chainAngles[c] || Math.PI / 2;
    ctx.rotate(chainAngle - Math.PI * 0.92);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < config.numLinks; i++) {
      ctx.beginPath();
      const linkY = i * 4;
      const bendProgress = i / config.numLinks;
      const flexLag = Math.pow(bendProgress, 1.5) * ((fighter.chainVelocities[c] || 0) * -35);
      const ambientWave = Math.sin((fighter.lastChainUpdate || 0) * 0.002 - i * 0.4 + c * 2.5) * 0.8;
      const linkX = flexLag + ambientWave;

      if (i % 2 === 0) {
        ctx.ellipse(linkX, linkY, 1.5, 2.5, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(linkX, linkY, 2.5, 1.0, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // Small talisman charm at tip
    const tipFlex = Math.pow(1, 1.5) * ((fighter.chainVelocities[c] || 0) * -35);
    const tipWave = Math.sin((fighter.lastChainUpdate || 0) * 0.002 - config.numLinks * 0.4 + c * 2.5) * 0.8;
    const tipX = tipFlex + tipWave;

    ctx.fillStyle = config.charmColor;
    ctx.beginPath();
    ctx.arc(tipX, config.numLinks * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();

  // ── 2. Wakizashi Sheath (Shorter scabbard mounted parallel above Katana) ──
  ctx.save();
  ctx.translate(hipX + 2, hipY - 6);
  ctx.rotate(Math.PI * 0.88);

  ctx.fillStyle = '#101218';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3.0);
  ctx.quadraticCurveTo(15, -4.5, 34, -2.0);
  ctx.lineTo(36, 2.0);
  ctx.quadraticCurveTo(15, 3.5, 0, 3.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sageo wrap
  ctx.strokeStyle = '#4B556C';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(8 + i * 3, -3.5);
    ctx.lineTo(10 + i * 3, 3.0);
    ctx.stroke();
  }

  if (hasSwords) {
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(-13, -2, 13, 4);
    ctx.fillStyle = '#181A20';
    ctx.fillRect(-12, -1.5, 11, 3);
    // Tsuba
    ctx.fillStyle = '#8A7A50';
    ctx.fillRect(0, -4.5, 2, 9);
  }

  ctx.restore();

  ctx.restore();
}

/**
 * Calligraphy-Style Ink-Brush Smoke Trail on blade tips after Phantom Flurry
 */
function _drawBrushSmokeTrail(ctx, handX, handY, bladeAngle, alpha, bladeLen, isFlipped) {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(bladeAngle);
  if (isFlipped) ctx.scale(1, -1);

  const tipX = bladeLen - 5;
  const fps30Time = Math.floor(performance.now() / (1000 / 30)) * (1000 / 30);
  const time = fps30Time * 0.003;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const numFlames = 7;
  for (let i = 0; i < numFlames; i++) {
    const phase = i * 2.718;
    const speed = 1 + (i % 3) * 0.2;
    const t = time * speed + phase;

    const distFromCenter = Math.abs(i - (numFlames - 1) / 2);
    const length = 160 - (distFromCenter * 30);
    const spread = (i - (numFlames - 1) / 2) * 3;

    const cp1x = tipX - (length * 0.35);
    const cp1y = (spread * 0.5) + Math.sin(t) * 10;
    const cp2x = tipX - (length * 0.7);
    const cp2y = (spread * 1.3) + Math.sin(t * 1.3) * 18;
    const endX = tipX - length;
    const endY = (spread * 1.8) + Math.sin(t * 1.6) * 22;

    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    const grad = ctx.createLinearGradient(tipX, 0, endX, endY);
    if (i === 3) {
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.95})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.lineWidth = 8;
    } else if (i === 2 || i === 4) {
      grad.addColorStop(0, `rgba(200, 210, 230, ${alpha * 0.8})`);
      grad.addColorStop(0.5, `rgba(200, 210, 230, ${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(200, 210, 230, 0)');
      ctx.lineWidth = 5;
    } else {
      grad.addColorStop(0, `rgba(55, 70, 105, ${alpha * 0.9})`);
      grad.addColorStop(0.6, `rgba(42, 53, 80, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(42, 53, 80, 0)');
      ctx.lineWidth = 3 + (3 - distFromCenter);
    }

    ctx.strokeStyle = grad;
    ctx.stroke();
  }

  // 5 Stance Glowing Embers
  const stanceColors = [
    'rgb(220, 100, 50)',
    'rgb(50, 180, 255)',
    'rgb(255, 80, 20)',
    'rgb(80, 220, 130)',
    'rgb(180, 80, 255)'
  ];

  for (let i = 0; i < 15; i++) {
    const colorIdx = i % 5;
    const t = time * 1.2 + i * 2.094;
    const driftX = (t * 55) % 180;
    const partAlpha = Math.max(0, 1 - (driftX / 180)) * alpha;
    if (partAlpha <= 0) continue;

    const px = tipX - driftX;
    const py = Math.sin(t * 1.8 + i) * 30 + Math.cos(i * 77) * 15;
    const size = Math.max(0.5, 3.5 - (driftX / 45));

    ctx.save();
    ctx.globalAlpha = partAlpha * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = stanceColors[colorIdx];
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = partAlpha;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = stanceColors[colorIdx];
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${partAlpha})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
