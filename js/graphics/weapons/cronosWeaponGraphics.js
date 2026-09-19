// ─────────────────────────────────────────────
// CRONUS (CRONOS) WEAPON GRAPHICS (Authentic Pixel Art Edition)
// Harpe / Crescent Blade of the Ages (Titan Time God Scythe-Sword)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 15 (Blade Crescent & Swing Standards)
// - Rule 19 & 20 (Authentic Pixel Art & Hand Positioning)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

export const CRONOS_WEAPON_GRAPHICS = {
  blade: {
    pommelGold: '#FACC15',
    pommelDark: '#CA8A04',
    pommelCore: '#00F3FF',
    gripObsidian: '#0F172A',
    gripMid: '#1E293B',
    gripLace: '#CA8A04',
    guardGold: '#FACC15',
    guardGoldGlint: '#FEF08A',
    guardDark: '#A16207',
    guardInk: '#080F1E',
    bladeMain: '#0F172A',
    bladeMid: '#1E293B',
    bladeHighlight: '#334155',
    bladeInk: '#080D1A',
    neonColor: '#00F3FF',
    neonSecondary: '#38BDF8',
    whiteCore: '#FFFFFF',
  },
  positioning: {
    scale: 1.25,
    offset: 12, // Distance from fighter body edge
  },
};

/**
 * Draws Cronus's obsidian Harpe Crescent Blade in authentic pixel art style.
 */
export function drawCronosCrescentBlade(
  ctx,
  x,
  y,
  gunAngle,
  r,
  swingActive,
  swingTimer,
  swingAngle,
  swingDuration = 20,
  swingDirection = 1,
  fighterColor = '#00F3FF'
) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  ctx.save();
  ctx.translate(x, y);

  const editP = (typeof state !== 'undefined' && state.slashEditMode && state.slashEditParams) ? state.slashEditParams : null;
  if (editP) {
    ctx.translate(editP.offsetX, editP.offsetY);
  }

  let effectiveActive = swingActive;
  let effectiveTimer = swingTimer;
  if (editP) {
    effectiveActive = true;
    effectiveTimer = Math.floor(swingDuration * 0.5);
  }

  // Calculate swing rotation & dynamic lunge extension
  const bladeScale = CRONOS_WEAPON_GRAPHICS.positioning.scale;
  let rotation = gunAngle;
  let visualScale = bladeScale;
  let thrustOffset = 0;

  if (effectiveActive && effectiveTimer > 0) {
    const progress = 1 - (effectiveTimer / Math.max(1, swingDuration));
    const swingTotal = Math.PI * 0.85;

    // Smooth sinusoidal lunge thrust
    thrustOffset = Math.sin(progress * Math.PI) * (8 * bladeScale);

    // Forward swing starts from upper-left (-0.42 PI) and sweeps to lower-right (+0.42 PI)
    // Reverse swing starts from lower-right (+0.42 PI) and sweeps back to upper-left (-0.42 PI)
    if (swingDirection === 1) {
      rotation = swingAngle - (swingTotal / 2) + progress * swingTotal;
      visualScale = bladeScale * 1.0;
    } else {
      rotation = swingAngle + (swingTotal / 2) - progress * swingTotal;
      visualScale = bladeScale * 0.95;
    }
  }

  // Rotate first so the weapon orbits the fighter
  ctx.rotate(rotation);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  ctx.translate(r + CRONOS_WEAPON_GRAPHICS.positioning.offset + thrustOffset, 0);

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.cronos) ? state.weaponCustomizations.cronos : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  const blade = CRONOS_WEAPON_GRAPHICS.blade;
  const now = Date.now();
  const pulse = (Math.sin(now * 0.006) + 1) * 0.5;

  // ── 1. POMMEL: GOLDEN CLOCKWORK GEAR & CHRONO CORE ──
  ctx.save();
  // Gear teeth
  const pommelX = -23 * bladeScale;
  ctx.fillStyle = blade.pommelDark;
  for (let i = 0; i < 6; i++) {
    const ga = i * (Math.PI / 3);
    const gx = pommelX + Math.cos(ga) * (5.5 * bladeScale);
    const gy = Math.sin(ga) * (5.5 * bladeScale);
    ctx.fillRect(gx - 1 * bladeScale, gy - 1 * bladeScale, 2 * bladeScale, 2 * bladeScale);
  }
  // Gold pommel disc
  ctx.fillStyle = blade.pommelGold;
  ctx.strokeStyle = blade.guardInk;
  ctx.lineWidth = 1.4 * bladeScale;
  ctx.beginPath();
  ctx.arc(pommelX, 0, 4.5 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Central Glowing Chrono Jewel
  ctx.fillStyle = blade.pommelCore;
  ctx.beginPath();
  ctx.arc(pommelX, 0, 2.0 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── 2. GRIP / HILT: WRAPPED OBSIDIAN WITH GOLD LACING ──
  const gripW = 16 * bladeScale;
  const gripH = 7 * bladeScale;
  const gripX = -19 * bladeScale;
  const gripY = -gripH / 2;

  // Grip base
  ctx.fillStyle = blade.gripObsidian;
  ctx.strokeStyle = blade.bladeInk;
  ctx.lineWidth = 1.2 * bladeScale;
  ctx.fillRect(gripX, gripY, gripW, gripH);
  ctx.strokeRect(gripX, gripY, gripW, gripH);

  // Gold diamond cross-stitches
  ctx.strokeStyle = blade.gripLace;
  ctx.lineWidth = 0.9 * bladeScale;
  for (let i = 0; i < 4; i++) {
    const lx = gripX + (i * 3.8 + 1.8) * bladeScale;
    ctx.beginPath();
    ctx.moveTo(lx, gripY);
    ctx.lineTo(lx + 2.5 * bladeScale, gripY + gripH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx + 2.5 * bladeScale, gripY);
    ctx.lineTo(lx, gripY + gripH);
    ctx.stroke();
  }

  // ── 3. CROSSGUARD: WINGED GOLDEN TITAN GUARD ──
  const guardX = -3 * bladeScale;
  ctx.save();
  ctx.fillStyle = blade.guardGold;
  ctx.strokeStyle = blade.guardInk;
  ctx.lineWidth = 1.4 * bladeScale;

  ctx.beginPath();
  ctx.moveTo(guardX - 3 * bladeScale, -8 * bladeScale);
  ctx.lineTo(guardX + 6 * bladeScale, -8 * bladeScale);
  ctx.lineTo(guardX + 8 * bladeScale, -5 * bladeScale);
  ctx.lineTo(guardX + 7 * bladeScale, 5 * bladeScale);
  ctx.lineTo(guardX + 5 * bladeScale, 9 * bladeScale);
  ctx.lineTo(guardX - 3 * bladeScale, 9 * bladeScale);
  ctx.lineTo(guardX - 5 * bladeScale, 5 * bladeScale);
  ctx.lineTo(guardX - 5 * bladeScale, -5 * bladeScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Guard detail & central chrono indicator
  ctx.fillStyle = blade.guardGoldGlint;
  ctx.fillRect(guardX - 2 * bladeScale, -6 * bladeScale, 5 * bladeScale, 2 * bladeScale);

  ctx.fillStyle = blade.guardDark;
  ctx.fillRect(guardX - 2 * bladeScale, 5 * bladeScale, 5 * bladeScale, 2 * bladeScale);

  // Central Chrono Power Indicator Node
  ctx.fillStyle = blade.neonColor;
  ctx.beginPath();
  ctx.arc(guardX + 1 * bladeScale, 0, 2.0 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blade.whiteCore;
  ctx.fillRect(guardX + 0.5 * bladeScale, -0.5 * bladeScale, 1.2 * bladeScale, 1.2 * bladeScale);
  ctx.restore();

  // ── 4. BLADE BODY (CURVED OBSIDIAN HARPE / CRESCENT SCYTHE) ──
  const bStartX = 5 * bladeScale;
  const bTipX = 76 * bladeScale;

  ctx.save();
  // Obsidian Blade Polygon
  ctx.beginPath();
  ctx.moveTo(bStartX, -3.5 * bladeScale);
  ctx.lineTo(bTipX - 6 * bladeScale, -3.5 * bladeScale);
  ctx.lineTo(bTipX, -1.0 * bladeScale); // Sharp needle tip
  ctx.quadraticCurveTo(bTipX + 2 * bladeScale, 6 * bladeScale, 38 * bladeScale, 5.5 * bladeScale);
  ctx.lineTo(bStartX, 4.5 * bladeScale);
  ctx.closePath();

  // Gradient fill
  const bGrad = ctx.createLinearGradient(bStartX, -4 * bladeScale, bTipX, 6 * bladeScale);
  bGrad.addColorStop(0, blade.bladeMain);
  bGrad.addColorStop(0.35, blade.bladeMid);
  bGrad.addColorStop(0.70, blade.bladeHighlight);
  bGrad.addColorStop(1, blade.bladeMain);
  ctx.fillStyle = bGrad;
  ctx.fill();
  ctx.strokeStyle = blade.bladeInk;
  ctx.lineWidth = 1.4 * bladeScale;
  ctx.stroke();

  // Inner Gilded Clockwork Spine / Circuit Conduits
  ctx.strokeStyle = blade.guardGold;
  ctx.lineWidth = 0.9 * bladeScale;
  ctx.beginPath();
  ctx.moveTo(bStartX + 4 * bladeScale, -1.2 * bladeScale);
  ctx.lineTo(bTipX - 12 * bladeScale, -1.2 * bladeScale);
  ctx.stroke();

  // Cyan Chrono Nodes along the spine
  ctx.fillStyle = blade.neonColor;
  [14, 28, 42, 56].forEach((nx) => {
    ctx.beginPath();
    ctx.arc((bStartX + nx) * bladeScale, -1.2 * bladeScale, 1.1 * bladeScale, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── 5. GLOWING NEON CUTTING EDGE (Simulated Glow - Rule 11 compliant) ──
  // Outer Corona Glow
  ctx.beginPath();
  ctx.moveTo(bTipX, -1.0 * bladeScale);
  ctx.quadraticCurveTo(bTipX + 2 * bladeScale, 6 * bladeScale, 38 * bladeScale, 5.5 * bladeScale);
  ctx.lineTo(bStartX, 4.5 * bladeScale);

  ctx.strokeStyle = blade.neonColor;
  ctx.globalAlpha = 0.28 + pulse * 0.15;
  ctx.lineWidth = (5.5 + pulse * 2.5) * bladeScale;
  ctx.stroke();

  // Middle Sharp Neon Edge
  ctx.globalAlpha = 0.90;
  ctx.lineWidth = (2.2 + pulse * 0.8) * bladeScale;
  ctx.stroke();

  // White-Hot Specular Razor Core
  ctx.strokeStyle = blade.whiteCore;
  ctx.globalAlpha = 0.85 + pulse * 0.15;
  ctx.lineWidth = 1.0 * bladeScale;
  ctx.stroke();
  ctx.restore();

  // ── 6. HAND: PIXEL ART GLOVE HOLDING THE WEAPON (Rule 20) ──
  drawPixelHand(ctx, -10 * bladeScale, 0, getHandSize(6.0 * bladeScale), '#FCD34D', blade.guardInk);

  ctx.restore();
}
