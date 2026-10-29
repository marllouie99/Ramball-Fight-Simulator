// ═══════════════════════════════════════════════════════════════════════════
// PAC-MAN (Namco / Retro Arcade Legend) — Character Skin Renderer
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _pacmanHairImage = null;

/**
 * Rule 22: Module-Level Dedicated Hair Asset Loader for Pac-Man.
 */
export function _getPacmanHairImage() {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!_pacmanHairImage) {
    _pacmanHairImage = new Image();
    _pacmanHairImage.src = 'Assets/model/pacman/Pacman-hair.png';
  }
  return _pacmanHairImage;
}

// Proactive eager initialization
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getPacmanHairImage();
}

/**
 * Rule 22: Renders Pac-Man's dedicated headband / arcade top asset on Layer 2.
 */
export function _drawPacmanHair(ctx, r, facingLeft = false) {
  const img = _getPacmanHairImage();
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const userCustom = state.skinCustomizations?.pacman;
  const hairScale = (userCustom?.hairScale ?? 1.0);
  const hairOffsetX = (userCustom?.hairOffsetX ?? 0);
  const hairOffsetY = (userCustom?.hairOffsetY ?? 0);
  const hairRotation = (userCustom?.hairRotation ?? 0);

  const drawW = r * 1.60 * hairScale;
  const drawH = r * 0.85 * hairScale;
  const drawX = -drawW * 0.5 + hairOffsetX;
  const drawY = -r * 1.05 + hairOffsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (hairRotation !== 0) {
    ctx.rotate((hairRotation * Math.PI) / 180);
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/**
 * Renders Pac-Man's retro arcade energizer aura during Super Chomp Mode.
 */
function _drawChompModeAura(ctx, r, fighter) {
  if (!fighter.isChompModeActive) return;

  const tick = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : (Date.now() * 0.06);
  const pulse = Math.sin(tick * 0.22) * 3.5;
  const auraR = r + 8 + pulse;

  ctx.save();

  // Pulsing electric neon wash disc
  const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR + 4);
  grad.addColorStop(0, 'rgba(250, 204, 21, 0.0)');
  grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.25)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.40)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Outer supersonic shockwave ring (Rule 26)
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.stroke();

  // 4 discrete orbiting energizer motes (Rule 26: discrete shapes, no radial spokes)
  for (let i = 0; i < 4; i++) {
    const angle = tick * 0.12 + i * (Math.PI * 0.5);
    const mx = Math.cos(angle) * auraR;
    const my = Math.sin(angle) * auraR;
    ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#EF4444';
    ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
  }

  ctx.restore();
}

/**
 * Procedural Pac-Man body rasterizer adhering to Toji Reference Geometry (Rule 24).
 * Dynamically articulates the iconic wedge mouth during movement & combat.
 */
export function drawPacmanPixelBody(ctx, r, fighter) {
  const isChomp = Boolean(fighter && fighter.isChompModeActive);
  const animTick = fighter?._mouthAnimTicks || (typeof state !== 'undefined' ? state.frameCount : 0) || 0;

  // Mouth wedge aperture angle: cycles open/shut
  // Normal mode: 0 to 45 deg (~0.78 rad)
  // Chomp mode: 15 to 70 deg (~1.22 rad)
  const baseMouthAngle = isChomp ? 0.35 : 0.05;
  const maxMouthAngle = isChomp ? 1.15 : 0.78;
  const mouthCycle = (Math.sin(animTick * 0.35) + 1) * 0.5; // 0..1
  const mouthHalfAngle = baseMouthAngle + mouthCycle * (maxMouthAngle - baseMouthAngle) * 0.5;

  ctx.save();

  // 1. Solid Classic Pac-Man Yellow Body Wedge
  ctx.fillStyle = '#FACC15'; // Main body color
  ctx.beginPath();
  ctx.arc(0, 0, r, mouthHalfAngle, Math.PI * 2 - mouthHalfAngle, false);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // 2. Beveled Shading / Specular Highlight (Upper hemisphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, mouthHalfAngle, Math.PI * 2 - mouthHalfAngle, false);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.clip();

  // Top highlight crescent
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, -r * 0.35, r * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // Bottom shadow rim
  ctx.fillStyle = '#CA8A04';
  ctx.beginPath();
  ctx.arc(0, r * 0.65, r * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Restore clip
  ctx.restore();

  // 3. Retro Eyes (Classic Pac-Man pie-wedge eye on upper flank)
  const eyeX = r * 0.15;
  const eyeY = -r * 0.42;
  const eyeR = r * 0.22;

  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Pie wedge pupil cutout in white
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(eyeX + 1.5, eyeY - 1.5, eyeR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 4. In Super Chomp Mode: Render predatory white teeth along upper & lower jaw
  if (isChomp && mouthHalfAngle > 0.25) {
    ctx.fillStyle = '#FFFFFF';
    const toothCount = 3;
    for (let i = 1; i <= toothCount; i++) {
      const frac = i / (toothCount + 1);
      const toothDist = r * frac;

      // Upper jaw tooth
      const ux = Math.cos(mouthHalfAngle) * toothDist;
      const uy = -Math.sin(mouthHalfAngle) * toothDist;
      ctx.beginPath();
      ctx.arc(ux, uy + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Lower jaw tooth
      const lx = Math.cos(mouthHalfAngle) * toothDist;
      const ly = Math.sin(mouthHalfAngle) * toothDist;
      ctx.beginPath();
      ctx.arc(lx, ly - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Retro Arcade Red Boots (Lower Flank)
  const bootW = r * 0.36;
  const bootH = r * 0.22;
  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;

  // Left Boot
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, r * 0.78, bootW, bootH, 3);
  ctx.fill();
  ctx.stroke();

  // Right Boot
  ctx.beginPath();
  ctx.roundRect(r * 0.18, r * 0.78, bootW, bootH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Main skin entry point for Pac-Man (`drawPacmanSkin(ctx, fighter)`).
 * Adheres to Rule 19 (Upright Front POV), Rule 20 (Symmetrical Hands at +-0.82r, +0.38r),
 * Rule 22 (Hair Layer 2), Rule 24 (Toji Body Baseline), and Rule 32 (Manga Ink Outline).
 */
export function drawPacmanSkin(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  // Mandatory Rule 32 Coordinate Translation Contract
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Super Chomp Mode Energizer Aura (suppressed during silhouette pass)
  if (!fighter._isSilhouettePass) {
    _drawChompModeAura(ctx, r, fighter);
  }

  // Rule 19: Upright Front POV orientation & vertical flip when facing left
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Layer 1: Pac-Man pixel body circle & mouth wedge
  drawPacmanPixelBody(ctx, r, fighter);

  // Layer 1.5: Mandatory Universal Character Black Outline Standard (Rule 32)
  const isChomp = Boolean(fighter.isChompModeActive);
  const animTick = fighter._mouthAnimTicks || 0;
  const baseMouthAngle = isChomp ? 0.35 : 0.05;
  const maxMouthAngle = isChomp ? 1.15 : 0.78;
  const mouthCycle = (Math.sin(animTick * 0.35) + 1) * 0.5;
  const mouthHalfAngle = baseMouthAngle + mouthCycle * (maxMouthAngle - baseMouthAngle) * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, mouthHalfAngle, Math.PI * 2 - mouthHalfAngle, false);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.restore();

  // Layer 2: Dedicated Headband / Cap Hair Asset (Rule 22)
  _drawPacmanHair(ctx, r, false);

  // Layer 3: Hands (Suppressed for Pac-Man — Classic Retro Sphere Form)
  const shouldHideHands = fighter.hideHands !== false || fighter.hideHand;
  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.30, fighter);
    const gloveFill = fighter.isChompModeActive ? '#FACC15' : '#EF4444';
    const handOutline = '#0E0F14';

    // Off-hand (Left Hand)
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, gloveFill, handOutline);

    // Main-hand (Right Hand)
    drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, gloveFill, handOutline);
  }

  ctx.restore();
}
