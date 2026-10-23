// ─────────────────────────────────────────────
// GUTS FIGHTER SKIN & BODY MODEL
// The Black Swordsman / Berserker Armor
// Adheres strictly to Repository Standards:
// - Rule 19: Upright Front-Profile Camera POV (Hair/Helm top -Y, Torso bottom +Y)
// - Rule 18 & 3.2: Strict faceless minimalist aesthetic (Zero drawn eyes, mouth, nose)
// - Rule 20: Canonical Symmetrical Hands on front layer (Zero duplicate hands)
// - Rule 22: Dedicated head/helmet asset model import (Guts_helmet.png / Guts_helmet.jpg)
// - Rule 24: Universal Body Model (Toji Reference Standard, r = 25, P = 2.0px offscreen cache)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawGutsWeapons, drawGutsShoulderSword, drawGutsComboSlashVFX } from '../weapons/gutsWeaponGraphics.js';

let _gutsHelmetImage = null;
let _gutsHelmetLoading = false;

export function _getGutsHelmetImage() {
  if (_gutsHelmetImage && _gutsHelmetImage.complete && _gutsHelmetImage.naturalWidth > 0) {
    return _gutsHelmetImage;
  }
  if (!_gutsHelmetLoading && typeof Image !== 'undefined') {
    _gutsHelmetLoading = true;
    const img = new Image();
    img.onload = () => {
      _gutsHelmetImage = img;
      _gutsHelmetLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/guts/Guts_helmet.jpg?v=1';
      } else {
        _gutsHelmetLoading = false;
      }
    };
    img.src = 'Assets/model/guts/Guts_helmet.png?v=1';
    _gutsHelmetImage = img;
  }
  return _gutsHelmetImage;
}

let _gutsHairImage = null;
let _gutsHairLoading = false;

export function _getGutsHairImage() {
  if (_gutsHairImage && _gutsHairImage.complete && _gutsHairImage.naturalWidth > 0) {
    return _gutsHairImage;
  }
  if (!_gutsHairLoading && typeof Image !== 'undefined') {
    _gutsHairLoading = true;
    const img = new Image();
    img.onload = () => {
      _gutsHairImage = img;
      _gutsHairLoading = false;
    };
    img.onerror = () => {
      _gutsHairLoading = false;
    };
    img.src = 'Assets/model/guts/Guts-hair.png?v=1';
    _gutsHairImage = img;
  }
  return _gutsHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGutsHelmetImage();
  _getGutsHairImage();
}

let _cachedGutsCanvas = null;
let _cachedGutsR = 0;
let _cachedGutsBerserker = false;

/**
 * Procedural Discrete Offscreen Canvas Rasterization Engine (Rule 24 Toji Standard)
 * Rasterizes Guts' authentic manga ink body onto an axis-aligned canvas.
 */
function _renderGutsPixelBodyToCanvas(destCtx, r, isBerserker = false) {
  const P = 2.0;
  const intR = Math.round(r);
  const snap = (v) => Math.round(v / P) * P;

  destCtx.save();
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  destCtx.imageSmoothingEnabled = false;

  const steps = Math.ceil((intR + P) / P);

  // Helper inside circle shape test
  const isInside = (x, y) => Math.hypot(x, y) <= r;

  // 1. Fill Interior Stepped Proportions
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      if (!isInside(rx, ry)) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // Vertical Proportion Zones (Rule 24 Baseline)
      if (ry < r * 0.28) {
        // Zone 1: Throat & Neck Collar Skin Dome
        if (isBerserker) {
          destCtx.fillStyle = '#1c1e24'; // Berserker dark gorget
        } else {
          // Weathered tanned skin
          destCtx.fillStyle = Math.abs(rx) > r * 0.35 ? '#c4906c' : '#dfac87';
        }
      } else if (ry < r * 0.65) {
        // Zone 2: Blackened Steel Breastplate Cuirass
        const isCenterKeel = Math.abs(rx) <= P;
        const isPauldron = Math.abs(rx) >= r * 0.65;
        if (isBerserker) {
          destCtx.fillStyle = isCenterKeel ? '#3f444e' : '#14161a';
        } else {
          if (isPauldron) destCtx.fillStyle = '#3a3e47'; // Shoulder pauldron
          else if (isCenterKeel) destCtx.fillStyle = '#4a505c'; // Chest center ridge highlight
          else destCtx.fillStyle = '#22252b'; // Dark cuirass steel
        }
      } else if (ry < r * 0.78) {
        // Zone 3: Criss-Crossed Studded Leather Utility Belts
        const isBuckle = Math.abs(rx) <= P * 1.5;
        destCtx.fillStyle = isBuckle ? '#c29b38' : '#45281a';
      } else {
        // Zone 4: Articulated Plate Greaves & Sabatons (Y >= 24)
        const isFlySeam = Math.abs(rx) <= P * 0.5;
        destCtx.fillStyle = isFlySeam ? '#14161a' : '#1c1f26';
      }

      destCtx.fillRect(px, py, P, P);
    }
  }

  // 2. Solid 4-Neighbor Attached Boundary Ink Shell (#0E0F14)
  destCtx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      if (!isInside(rx, ry)) continue;

      // 4-Neighbor boundary edge test
      const isEdge =
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r;

      if (isEdge) {
        destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
      }
    }
  }

  // 3. Brand of Sacrifice on Right Neck Flank (Occult Crimson Stigma)
  if (!isBerserker) {
    destCtx.fillStyle = '#dc2626';
    const brandX = r * 0.38;
    const brandY = r * 0.12;
    destCtx.fillRect(brandX - P, brandY - P, P * 2, P * 3);
    destCtx.fillRect(brandX - P * 1.5, brandY, P * 3, P);
  }

  destCtx.restore();
}

/**
 * Draws Guts' authentic Berserker wolf helmet from Assets/model/guts/Guts_helmet.png (Rule 22 compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r
 * @param {boolean} [facingLeft=false]
 * @param {boolean} [isBerserkerActive=false]
 */
export function _drawGutsHelmet(ctx, r, facingLeft = false, isBerserkerActive = false) {
  const helmImg = _getGutsHelmetImage();
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.guts) || {};
  const useProcedural = custom.proceduralOnly === true;

  if (!useProcedural && helmImg && helmImg.complete && helmImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Guts_helmet.png: 500x500 canvas with 390x496 visible bounding box (sx: 55, sy: 4)
    // Calibrated to frame the head seamlessly at -1.45r to +0.25r
    const baseW = r * 2.30;
    const baseH = r * 2.925; // 2.30 * (496 / 390)
    const targetW = baseW * wMult;
    const targetH = baseH * hMult;
    const drawX = -targetW / 2 + offX;
    const drawY = -r * 1.45 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + targetW / 2, drawY + targetH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      if (helmImg.naturalWidth === 500) {
        ctx.drawImage(helmImg, 55, 4, 390, 496, -targetW / 2, -targetH / 2, targetW, targetH);
      } else {
        ctx.drawImage(helmImg, -targetW / 2, -targetH / 2, targetW, targetH);
      }
    } else {
      if (helmImg.naturalWidth === 500) {
        ctx.drawImage(helmImg, 55, 4, 390, 496, drawX, drawY, targetW, targetH);
      } else {
        ctx.drawImage(helmImg, drawX, drawY, targetW, targetH);
      }
    }

    // Glowing crimson eye flare if Berserker Armor active
    if (isBerserkerActive) {
      ctx.fillStyle = '#ff1a1a';
      ctx.beginPath();
      ctx.arc(-targetW * 0.18, -r * 0.45, 3.5, 0, Math.PI * 2);
      ctx.arc(targetW * 0.18, -r * 0.45, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // ── PROCEDURAL FALLBACK: Berserker Wolf Visor ──
  ctx.save();
  ctx.fillStyle = '#141619';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;

  // Wolf Snout & Brow Apex
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.45);
  ctx.lineTo(r * 0.75, -r * 0.85);
  ctx.lineTo(r * 0.65, -r * 0.10);
  ctx.lineTo(0, r * 0.20); // Chin point
  ctx.lineTo(-r * 0.65, -r * 0.10);
  ctx.lineTo(-r * 0.75, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Berserker Eye Slits
  ctx.fillStyle = isBerserkerActive ? '#ff1a1a' : '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.55);
  ctx.lineTo(-r * 0.15, -r * 0.40);
  ctx.lineTo(-r * 0.40, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.55);
  ctx.lineTo(r * 0.15, -r * 0.40);
  ctx.lineTo(r * 0.40, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Guts' iconic tattered black mercenary cloak/cape.
 * Draped across the shoulders during countdown, or flowing dynamically during battle.
 */
function _drawGutsCape(ctx, r, isCountdown = false) {
  ctx.save();
  ctx.fillStyle = '#14161a'; // Dark obsidian black wool
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (isCountdown) {
    // Stance 1: Heavy cowl draped over shoulders and hanging down behind back
    ctx.moveTo(-r * 0.95, -r * 0.10);
    ctx.quadraticCurveTo(0, -r * 0.45, r * 0.95, -r * 0.10);
    ctx.lineTo(r * 1.10, r * 0.85);
    // Tattered ragged hem along the bottom
    ctx.lineTo(r * 0.80, r * 1.25);
    ctx.lineTo(r * 0.50, r * 1.10);
    ctx.lineTo(r * 0.20, r * 1.30);
    ctx.lineTo(-r * 0.15, r * 1.15);
    ctx.lineTo(-r * 0.45, r * 1.28);
    ctx.lineTo(-r * 0.75, r * 1.05);
    ctx.lineTo(-r * 1.05, r * 0.80);
  } else {
    // Stance 2: Combat-ready dynamic flare
    ctx.moveTo(-r * 0.90, 0);
    ctx.quadraticCurveTo(0, -r * 0.35, r * 0.90, 0);
    ctx.lineTo(r * 1.05, r * 0.75);
    ctx.lineTo(r * 0.70, r * 1.15);
    ctx.lineTo(r * 0.25, r * 1.05);
    ctx.lineTo(-r * 0.20, r * 1.20);
    ctx.lineTo(-r * 0.65, r * 0.95);
    ctx.lineTo(-r * 0.95, r * 0.65);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Guts' signature spiky black hair with undercut & facial scar (Stance 1 Countdown / Neutral).
 * Imports Assets/model/guts/Guts-hair.png (Rule 22 compliant) with procedural manga fallback.
 */
export function _drawGutsHair(ctx, r, facingLeft = false) {
  const hairImg = _getGutsHairImage();
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.guts) || {};
  const useProcedural = custom.proceduralOnly === true;

  if (!useProcedural && hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Hair bounding box: 44x41. Scale to frame crown at -1.30r to -0.20r (Rule 22)
    const baseW = r * 2.20;
    const baseH = r * 2.05; // 2.20 * (41 / 44)
    const targetW = baseW * wMult;
    const targetH = baseH * hMult;
    const drawX = -targetW / 2 + offX;
    const drawY = -r * 1.30 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + targetW / 2, drawY + targetH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, targetW, targetH);
    }

    // Right-eye vertical battle scar on face dome (closed right eye mark)
    ctx.strokeStyle = '#8f1d1d';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.26, -r * 0.12);
    ctx.lineTo(r * 0.22, r * 0.18);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // ── PROCEDURAL FALLBACK: Discrete Manga Lock Hair Array (Rule 3.4) ──
  ctx.save();
  ctx.fillStyle = '#0f1014'; // Tier 1 Root / Undercut
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;

  // Crown spiky hair silhouette
  ctx.beginPath();
  ctx.moveTo(-r * 0.70, -r * 0.40);
  ctx.lineTo(-r * 0.55, -r * 0.85);
  ctx.lineTo(-r * 0.40, -r * 0.65);
  ctx.lineTo(-r * 0.25, -r * 1.15); // Left crown spike
  ctx.lineTo(-r * 0.10, -r * 0.75);
  ctx.lineTo(0, -r * 1.25);         // Center crown apex spike
  ctx.lineTo(r * 0.12, -r * 0.80);
  ctx.lineTo(r * 0.28, -r * 1.18);  // Right crown spike
  ctx.lineTo(r * 0.45, -r * 0.70);
  ctx.lineTo(r * 0.60, -r * 0.90);
  ctx.lineTo(r * 0.72, -r * 0.35);  // Right sideburn
  ctx.lineTo(r * 0.45, -r * 0.22);  // Hairline termination
  ctx.lineTo(0, -r * 0.28);
  ctx.lineTo(-r * 0.45, -r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tier 4 Specular Highlight Glints on spikes
  ctx.fillStyle = '#3a3f4d';
  ctx.fillRect(-r * 0.05, -r * 1.05, 3, 5);
  ctx.fillRect(r * 0.22, -r * 0.98, 2.5, 4);

  // Right-eye vertical battle scar
  ctx.strokeStyle = '#8f1d1d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.26, -r * 0.12);
  ctx.lineTo(r * 0.22, r * 0.18);
  ctx.stroke();

  ctx.restore();
}

/**
 * Standard Guts Skin Renderer with Upright Front POV Transform (Rule 19)
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsSkin(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  const isBerserker = fighter.isBerserkerActive === true;
  const isCountdown = (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'select' || state.gameState === 'faceoff')) || Boolean(fighter.isCountdownStance || fighter._isCountdown);
  const isUnmasked = Boolean(fighter.isUnmasked);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  // Vertical scale mirroring: Hair/Helm stays on -Y and sabatons on +Y (Rule 19)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 0. Tattered Black Mercenary Cape (Layer 0 Behind Body)
  _drawGutsCape(ctx, r, isCountdown);

  // 0.8. Stance 1 (IDLE / Countdown): Dragon Slayer slung across shoulder (Layer 0.8 behind helmet)
  if (isCountdown && !fighter.hideWeapon && !(typeof state !== 'undefined' && state.showSkinOnly)) {
    const customWeapon = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
    drawGutsShoulderSword(ctx, r, customWeapon, isBerserker);
  }

  // 1. Blit Cached Toji-Standard Body Canvas (Layer 1)
  const P = 2.0;
  const intR = Math.round(r);
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  if (!_cachedGutsCanvas || _cachedGutsR !== intR || _cachedGutsBerserker !== isBerserker) {
    if (!_cachedGutsCanvas) {
      _cachedGutsCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    }
    if (_cachedGutsCanvas) {
      _cachedGutsCanvas.width = size;
      _cachedGutsCanvas.height = size;
      const bCtx = _cachedGutsCanvas.getContext('2d');
      if (bCtx) {
        _renderGutsPixelBodyToCanvas(bCtx, r, isBerserker);
      }
      _cachedGutsR = intR;
      _cachedGutsBerserker = isBerserker;
    }
  }

  if (_cachedGutsCanvas) {
    ctx.drawImage(_cachedGutsCanvas, -size / 2, -size / 2);
  }

  // 2. Head / Helmet Model (Layer 2 - Rule 22)
  if (isUnmasked) {
    _drawGutsHair(ctx, r, facingLeft);
  } else {
    // Both IDLE and Combat stances use the iconic Berserker wolf helmet with glowing red eyes!
    _drawGutsHelmet(ctx, r, facingLeft, isBerserker);
  }

  // 3. Canonical Symmetrical Hands (Rule 20)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const isSwinging = Boolean((fighter.swipeActive && fighter.swordSwingTimer > 0) || (fighter.swordHitPauseTimer && fighter.swordHitPauseTimer > 0));
  if (!shouldHideHands) {
    const handRadius = r * 0.30;
    if (isCountdown) {
      // 1ST PIC (IDLE):
      // Right hand gripping Dragon Slayer handle on the front layer at (+r * 0.76, +r * 0.32)
      // Left arm dangling loose at his side (-r * 0.82, +r * 0.52)
      drawPixelHand(ctx, -r * 0.82, r * 0.52, handRadius, '#4a505a', '#0E0F14');
      drawPixelHand(ctx, r * 0.76, r * 0.32, handRadius, '#e2e8f0', '#0E0F14');
    } else if (fighter.hideWeapon) {
      // Fallback empty fists if weapon is hidden
      drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, '#4a505a', '#0E0F14');
      drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, '#e2e8f0', '#0E0F14');
    }
  }

  // 4. Weapons & Slash Combos (Combat Battle Stance - clamped in jaws / mouth)
  if (!fighter.hideWeapon && !(typeof state !== 'undefined' && state.showSkinOnly) && !isCountdown) {
    drawGutsWeapons(ctx, fighter, r, facingLeft);
  }

  ctx.restore();

  // 5. World-Space Annular Crescent Slashes (Rule 15)
  drawGutsComboSlashVFX(ctx, fighter);
}
