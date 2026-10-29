// ═══════════════════════════════════════════════════════════════════════════
// BOMBER MAN (Hudson Soft Classic) — Upright Minimalist Pixel Skin Renderer
// Built strictly on the Toji Reference Standard (Rule 24), Upright Front POV
// (Rule 19), Canonical Symmetrical Hands (Rule 20), and Hair Asset Model (Rule 22).
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawHeldBomb } from '../weapons/bombermanWeaponGraphics.js';

let _cachedBombermanCanvas = null;
let _cachedBombermanR = 0;

// ── Rule 22: Module-Level Hair Asset Cache & Loader ──
let _bombermanHairImage = null;
export function _getBombermanHairImage() {
  if (!_bombermanHairImage && typeof Image !== 'undefined') {
    _bombermanHairImage = new Image();
    _bombermanHairImage.src = 'Assets/model/bomberman/Bomberman-hair.png';
  }
  return _bombermanHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getBombermanHairImage();
}

/**
 * Layer 2: Renders Bomber Man's iconic white antenna stem & pink pom-pom bobble.
 * Supports skinCustomizations.bomberman and includes a crisp procedural pixel fallback
 * when running in headless Node verification or while the PNG is loading.
 */
export function _drawBombermanHair(ctx, r, facingLeft) {
  const hairImg = _getBombermanHairImage();
  const custom = state?.skinCustomizations?.bomberman;
  const customScale = custom?.scale ?? 1.0;
  const customOffsetX = custom?.offsetX ?? 0;
  const customOffsetY = custom?.offsetY ?? 0;
  const customRotation = custom?.rotation ?? 0;
  const flipH = custom?.flipH ?? false;

  ctx.save();
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const targetHairWidth = r * 2.9 * customScale;
  const targetHairHeight = r * 2.2 * customScale;
  const drawX = -targetHairWidth * 0.5 + customOffsetX;
  const drawY = -r * 1.42 - (targetHairHeight - r * 2.2) * 0.5 + customOffsetY;

  if (customRotation !== 0 || flipH) {
    const cx = drawX + targetHairWidth * 0.5;
    const cy = drawY + targetHairHeight * 0.5;
    ctx.translate(cx, cy);
    if (customRotation !== 0) {
      ctx.rotate((customRotation * Math.PI) / 180);
    }
    if (flipH) {
      ctx.scale(-1, 1);
    }
    ctx.translate(-cx, -cy);
  }

  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hairImg, drawX, drawY, targetHairWidth, targetHairHeight);
  } else {
    // Crisp procedural fallback matching Bomberman-hair.png (antenna stem + pink pom-pom)
    const stemW = r * 0.24;
    const stemH = r * 0.42;
    const stemY = -r * 1.24;
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(-stemW * 0.5 - 1.5, stemY - 1.5, stemW + 3, stemH + 3);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-stemW * 0.5, stemY, stemW, stemH);

    const bobbleR = r * 0.30;
    const bobbleY = -r * 1.42;
    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.arc(0, bobbleY, bobbleR + 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.arc(0, bobbleY, bobbleR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FBCFE8';
    ctx.beginPath();
    ctx.arc(-bobbleR * 0.32, bobbleY - bobbleR * 0.32, bobbleR * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Layer 1 (Toji Standard Offscreen Rasterizer — Rule 24):
 * Draws Bomber Man's circular pixel body with 4-neighbor #0E0F14 outline and 4 vertical zones:
 * - Zone 1 (ry < r * 0.30): Glossy White Helmet Dome + Faceless Peach Visor Window
 * - Zone 2 (0.30 <= ry < 0.65): Cobalt Blue Bomber Tunic + White Collar Rim
 * - Zone 3 (0.65 <= ry < 0.78): Dark Slate Belt + Gleaming Gold Square Buckle
 * - Zone 4 (ry >= 0.78): White Trousers + Magenta-Pink Boots (luminance Y >= 24)
 */
function _renderBombermanOffscreen(destCtx, intR) {
  const r = intR;
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  destCtx.save();
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  destCtx.imageSmoothingEnabled = false;

  const OUTLINE = '#0E0F14';
  const HELMET_BASE = '#F8FAFC';
  const HELMET_HIGHLIGHT = '#FFFFFF';
  const HELMET_SHADE = '#CBD5E1';
  const VISOR_FRAME = '#334155';
  const VISOR_PEACH = '#FED7AA';
  const VISOR_SHADE = '#FDBA74';

  const TUNIC_BASE = '#2563EB';
  const TUNIC_HIGHLIGHT = '#3B82F6';
  const TUNIC_DARK = '#1D4ED8';
  const COLLAR_WHITE = '#F8FAFC';

  const BELT_DARK = '#1E293B';
  const BUCKLE_GOLD = '#FACC15';
  const BUCKLE_SHINE = '#FEF08A';

  const PANTS_WHITE = '#E2E8F0';
  const BOOTS_PINK = '#DB2777';
  const BOOTS_HIGHLIGHT = '#EC4899';

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      // Toji 4-neighbor outer manga ink outline test (Rule 24)
      const isBorder =
        Math.hypot((gx + 1) * P, ry) > r ||
        Math.hypot((gx - 1) * P, ry) > r ||
        Math.hypot(rx, (gy + 1) * P) > r ||
        Math.hypot(rx, (gy - 1) * P) > r;

      let color = HELMET_BASE;

      if (isBorder) {
        color = OUTLINE;
      } else if (ry < r * 0.30) {
        // ── ZONE 1: Glossy White Helmet Shell & Faceless Peach Visor Window ──
        const inVisorOuter =
          Math.abs(rx) <= r * 0.56 && ry >= -r * 0.34 && ry <= r * 0.22;
        const inVisorInner =
          Math.abs(rx) <= r * 0.48 && ry >= -r * 0.26 && ry <= r * 0.14;

        if (inVisorInner) {
          // Pure faceless peach visor dome (Rule 19: zero eyes, nose, or mouth)
          color = Math.abs(rx) > r * 0.34 || ry > r * 0.06 ? VISOR_SHADE : VISOR_PEACH;
        } else if (inVisorOuter) {
          color = VISOR_FRAME;
        } else if (ry < -r * 0.58 && Math.abs(rx) < r * 0.45) {
          color = HELMET_HIGHLIGHT;
        } else if (Math.abs(rx) > r * 0.68) {
          color = HELMET_SHADE;
        } else {
          color = HELMET_BASE;
        }
      } else if (ry < r * 0.65) {
        // ── ZONE 2: Cobalt Blue Bomber Tunic & White Collar Rim ──
        if (ry < r * 0.37 && Math.abs(rx) < r * 0.68) {
          color = COLLAR_WHITE;
        } else if (Math.abs(rx) < P * 1.1) {
          // Central tunic seam highlight
          color = TUNIC_HIGHLIGHT;
        } else if (Math.abs(rx) > r * 0.62) {
          color = TUNIC_DARK;
        } else if (ry < r * 0.48 && Math.abs(rx) < r * 0.42) {
          color = TUNIC_HIGHLIGHT;
        } else {
          color = TUNIC_BASE;
        }
      } else if (ry < r * 0.78) {
        // ── ZONE 3: Dark Slate Utility Belt & Gold Square Buckle ──
        if (Math.abs(rx) <= r * 0.24) {
          color = Math.abs(rx) <= r * 0.12 && ry < r * 0.73 ? BUCKLE_SHINE : BUCKLE_GOLD;
        } else {
          color = BELT_DARK;
        }
      } else {
        // ── ZONE 4: White Lower Trousers & Magenta-Pink Boots ──
        if (ry >= r * 0.86) {
          color = Math.abs(rx) < r * 0.28 ? BOOTS_HIGHLIGHT : BOOTS_PINK;
        } else {
          color = Math.abs(rx) < P * 1.1 ? '#94A3B8' : PANTS_WHITE;
        }
      }

      destCtx.fillStyle = color;
      destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
    }
  }

  destCtx.restore();
}

export function drawBombermanPixelBody(ctx, r, fighter = null) {
  const intR = Math.round(r);
  const P = 2.0;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  if (!_cachedBombermanCanvas || _cachedBombermanR !== intR) {
    if (typeof document !== 'undefined') {
      _cachedBombermanCanvas = document.createElement('canvas');
      _cachedBombermanCanvas.width = size;
      _cachedBombermanCanvas.height = size;
      _cachedBombermanR = intR;
      const offCtx = _cachedBombermanCanvas.getContext('2d');
      _renderBombermanOffscreen(offCtx, intR);
    } else {
      _renderBombermanOffscreen(ctx, intR);
      return;
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedBombermanCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Draws the Invincible Ultimate Golden Shield Aura around Bomber Man.
 * Rule 11: Uses concentric translucent shapes and radial rings (zero shadowBlur).
 */
function _drawInvincibleShieldAura(ctx, r, fighter) {
  if (!fighter || !(fighter.invincibleTimer > 0)) return;

  ctx.save();
  const tick = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.015;
  const pulse = 1 + Math.sin(tick) * 0.07;
  const shieldR = r * 1.38 * pulse;

  // Soft golden inner dome fill
  ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
  ctx.fill();

  // Outer radiant gold barrier ring
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.88)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner prism white-gold ring
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, shieldR - 4, 0, Math.PI * 2);
  ctx.stroke();

  // 4 orbiting discrete star-Cross diamond motes (Rule 26: discrete shapes, no radial spokes)
  for (let i = 0; i < 4; i++) {
    const angle = tick * 0.8 + i * (Math.PI * 0.5);
    const mx = Math.cos(angle) * shieldR;
    const my = Math.sin(angle) * shieldR;
    ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#FACC15';
    ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
  }

  ctx.restore();
}

/**
 * Main skin entry point for Bomber Man (`drawBombermanSkin(ctx, fighter)`).
 * Adheres to Rule 19 (Upright Front POV), Rule 20 (Symmetrical Hands at +-0.82r, +0.38r),
 * Rule 22 (Hair Layer 2), and Rule 24 (Toji Body Baseline).
 */
export function drawBombermanSkin(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Kick Boot Activation Shimmer Ring (suppressed during silhouette pass)
  if (fighter.kickAnimTimer > 0 && !fighter._isSilhouettePass) {
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.72)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ultimate: Invincible Golden Barrier Aura (suppressed during silhouette pass)
  if (!fighter._isSilhouettePass) {
    _drawInvincibleShieldAura(ctx, r, fighter);
  }

  // Rule 19: Upright Front POV orientation & vertical flip when facing left
  const angle = fighter._isWinnerReveal ? 0 : fighter.gunAngle || 0;
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Layer 1: Toji-standard pixel body circle
  drawBombermanPixelBody(ctx, r, fighter);

  // Layer 1.5: Mandatory Universal Character Black Outline Standard (Rule 32)
  // Guarantees circular body geometry & pale/white helmets sharply pop off the white arena floor
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.restore();

  // Layer 2: Dedicated Antenna & Pink Pom-Pom Hair Asset (Rule 22)
  _drawBombermanHair(ctx, r, false);

  // Layer 3: Canonical Default Symmetrical Hands (Rule 20) with Crisp Black Ink Outline
  // Left Hand: (-r * 0.82, +r * 0.38), Right Hand: (+r * 0.82, +r * 0.38)
  const shouldHideHands = fighter.hideHands || fighter.hideHand;
  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.30, fighter);
    const gloveFill = fighter.invincibleTimer > 0 ? '#FACC15' : '#EC4899';
    const handOutline = '#0E0F14';

    // Off-hand (Left Hand) — 100% Solid Canonical Glove with Black Ink Outline
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, gloveFill, handOutline);

    // Main-hand (Right Hand) — 100% Solid Canonical Glove with Black Ink Outline (Drawn FIRST so hand NEVER slices or overlays the bomb)
    const rightHandX = r * 0.82;
    const rightHandY = r * 0.38;
    drawPixelHand(ctx, rightHandX, rightHandY, handRadius, gloveFill, handOutline);

    // Held Bomb: Rendered cleanly held in the palm / in front of the hand (Zero overlaying/clipping)
    if (fighter.showHeldBomb !== false && !fighter._isSilhouettePass && !fighter.hideWeapon && !(typeof state !== 'undefined' && state.showSkinOnly)) {
      ctx.save();
      ctx.translate(rightHandX, rightHandY);
      drawHeldBomb(ctx, fighter);
      ctx.restore();
    }
  }

  ctx.restore();
}
