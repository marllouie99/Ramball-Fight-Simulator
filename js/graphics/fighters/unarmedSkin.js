// ─────────────────────────────────────────────
// UNARMED FIGHTER SKIN & BODY MODEL
// Official Earclacks Fighting Standard
// (https://earclacks-fighting.fandom.com/wiki/Unarmed)
// 
// Features:
// 1. Official Earclacks Physics Ball Aesthetic: Flat Solid Neutral Grey (#CFCFCF) Sphere
// 2. Crisp, Bold Jet-Black Circular Outer Border (#000000, ~2px line weight)
// 3. Iconic Centered Bold Black HP Number ("100" at full health) in Heavy Sans-Serif (Upright Front POV)
// 4. Super Unarmed Form: Pure white ball (#FFFFFF) with light grey outline (#D4D4D8) (Wiki Canon)
// 5. Weaponless & Handless Ball Model (this.hideHands = true by default)
// 6. Ghost Afterimage Trails & Rule 26 Compliant Clean Concentric Supersonic Shockwaves
// 7. Rule 19 Upright Front POV & Rule 11 Zero shadowBlur
// ─────────────────────────────────────────────

import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _unarmedHairImage = null;
let _unarmedHairImageLoading = false;

export function _getUnarmedHairImage() {
  if (_unarmedHairImage && _unarmedHairImage.complete && _unarmedHairImage.naturalWidth > 0) {
    return _unarmedHairImage;
  }
  if (!_unarmedHairImageLoading && typeof Image !== 'undefined') {
    _unarmedHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _unarmedHairImage = img;
      _unarmedHairImageLoading = false;
    };
    img.onerror = () => {
      _unarmedHairImageLoading = false;
    };
    img.src = 'Assets/model/unarmed/Unarmed-hair.png?v=1';
    _unarmedHairImage = img;
  }
  return _unarmedHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getUnarmedHairImage();
}

/**
 * Draws Unarmed's hair asset if customized via skin studio (bald by default).
 */
export function _drawUnarmedHair(ctx, r, facingLeft = false) {
  const hairImg = _getUnarmedHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 1) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.unarmed) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    const targetW = r * 2.80 * wMult;
    const targetH = r * 2.10 * hMult;
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
    ctx.restore();
  }
}

/**
 * Official Earclacks Model Body Renderer:
 * Solid neutral grey (#CFCFCF) circular sphere with bold jet-black circular outer border (#000000).
 * Super Unarmed (Wiki Canon): Pure white ball (#FFFFFF) with light grey outline (#D4D4D8).
 */
export function drawUnarmedPixelBody(ctx, r, isSuper = false, text = null) {
  ctx.save();

  // 1. Solid circular sphere fill
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = isSuper ? '#FFFFFF' : '#CFCFCF';
  ctx.fill();

  // 2. Bold circular outer outline border
  ctx.lineWidth = Math.max(2, Math.round(r * 0.08));
  ctx.strokeStyle = isSuper ? '#D4D4D8' : '#000000';
  ctx.stroke();

  // 3. Optional centered text if provided (e.g. in preview states or icons)
  if (text !== null && text !== undefined) {
    const textStr = String(text);
    let fontSize;
    if (textStr.length >= 4) fontSize = Math.round(r * 0.72);
    else if (textStr.length === 3) fontSize = Math.round(r * 0.88);
    else if (textStr.length === 2) fontSize = Math.round(r * 0.95);
    else fontSize = Math.round(r * 1.05);

    ctx.font = `900 ${fontSize}px Impact, "Arial Black", "Segoe UI Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSuper ? '#71717A' : '#000000';
    ctx.fillText(textStr, 0, 1);
  }

  ctx.restore();
}

/**
 * Resolves the display health text for Unarmed.
 * Supports both percentage (100 -> 0) and actual numerical HP (e.g. 1100 -> 0) via config.
 * When fighter has valid HP, consistently displays its current HP across all match states
 * (playing, roundEnd, matchEnd, winner reveal, celebration) so the number never suddenly jumps.
 */
export function getUnarmedHpText(fighter) {
  if (!fighter) return '100';
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.unarmed) || {};
  const mode = cfg.hpOverlayMode || 'percentage';

  if (typeof fighter.hp === 'number' && !isNaN(fighter.hp)) {
    if (mode === 'actual') {
      return String(Math.max(0, Math.ceil(fighter.hp)));
    }
    const maxHp = fighter.maxHp || 1;
    const pct = Math.max(0, Math.ceil((fighter.hp / maxHp) * 100));
    return String(pct);
  }
  return '100';
}

/**
 * Official Earclacks Centered HP Overlay (Rule 21):
 * Renders the live health number directly in the center of Unarmed's body.
 * Supports both percentage (100 -> 0) and actual numerical HP (e.g. 1100 -> 0) via config.
 * Always remains upright (unrotated Front POV) across all match states.
 */
export function drawUnarmedCenterHpOverlay(ctx, fighter) {
  if (!fighter) return;
  const r = fighter.r || 25;
  const isSuper = fighter.isSuperUnarmed || fighter.isTerminalVelocity;

  const text = getUnarmedHpText(fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  let fontSize;
  if (text.length >= 4) {
    fontSize = Math.round(r * 0.72);
  } else if (text.length === 3) {
    fontSize = Math.round(r * 0.88);
  } else if (text.length === 2) {
    fontSize = Math.round(r * 0.95);
  } else {
    fontSize = Math.round(r * 1.05);
  }

  ctx.font = `900 ${fontSize}px Impact, "Arial Black", "Segoe UI Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isSuper ? '#71717A' : '#000000';
  ctx.fillText(text, 0, 1);

  ctx.restore();
}

/**
 * Renders Rule 26 compliant concentric supersonic shockwaves.
 */
export function drawKineticShockwaves(ctx, fighter) {
  if (!fighter.visualShockwaves || fighter.visualShockwaves.length === 0) return;

  for (let i = 0; i < fighter.visualShockwaves.length; i++) {
    const sw = fighter.visualShockwaves[i];
    const p = 1.0 - (sw.timer / sw.maxTimer);
    if (p < 0 || p > 1) continue;

    ctx.save();
    ctx.translate(sw.x, sw.y);

    const waveCount = sw.waveCount || 3;
    const maxR = sw.maxRadius || 60;

    for (let k = 0; k < waveCount; k++) {
      const delay = k * 0.14;
      if (p < delay) continue;
      const lp = (p - delay) / (1.0 - delay);
      const ringR = maxR * Math.pow(lp, 0.65);
      const fadeOut = Math.pow(1.0 - lp, 1.25);
      const ringAlpha = Math.max(0, fadeOut * 0.85);

      if (ringAlpha <= 0.01) continue;

      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244, 244, 245, ${0.12 * ringAlpha})`;
      ctx.fill();

      ctx.lineWidth = Math.max(1, (1.0 - lp) * 2.8);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Draws the official Earclacks dynamic tubular afterimage trail in world coordinates.
 * Slices linger and decay independently in world space with aerodynamic tapering (r -> 0.62r)
 * and sub-frame opacity dissipation, creating fluid, kinetic motion trails (EXnr_YQRg50 standard).
 */
export function drawUnarmedAfterimages(ctx, fighter) {
  if (!fighter.afterimages || fighter.afterimages.length === 0) return;

  const r = fighter.r || 25;
  const isSuper = fighter.isSuperUnarmed || fighter.isTerminalVelocity;
  const len = fighter.afterimages.length;
  const fillColor = isSuper ? '#FFFFFF' : '#CFCFCF';
  const strokeColor = isSuper ? '#D4D4D8' : '#000000';
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.unarmed) || {};
  const peakAlpha = isSuper ? (cfg.afterimageSuperMaxAlpha ?? 0.48) : (cfg.afterimageMaxAlpha ?? 0.38);

  // Render from oldest (tail) to newest (head) so newer slices naturally overlap older slices
  for (let i = 0; i < len; i++) {
    const ghost = fighter.afterimages[i];
    if (!ghost || ghost.timer <= 0) continue;

    // Progress along this slice's individual lifetime (0.0 = about to expire at tail, 1.0 = freshly spawned at head)
    const p = Math.max(0, Math.min(1.0, ghost.timer / (ghost.maxTimer || 8)));

    // Reduced translucent opacity curve: soft ethereal fading ghost trail
    const alpha = Math.pow(p, 1.1) * peakAlpha;
    if (alpha <= 0.01) continue;

    // Dynamic aerodynamic taper: tail tapers down to ~62% radius
    const sliceR = r * (0.62 + 0.38 * Math.pow(p, 0.55));
    const strokeW = Math.max(1.8, Math.round(sliceR * 0.08));

    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.globalAlpha = alpha;

    // 1. Slice interior fill (overlaps previous slice)
    ctx.beginPath();
    ctx.arc(0, 0, sliceR, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // 2. Slice outer circular boundary (creates the stacked black ribbing and cylinder rails)
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Main Skin Renderer for Unarmed (Official Earclacks Fighting Model Standard).
 */
export function drawUnarmedSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isSuper = fighter.isSuperUnarmed || fighter.isTerminalVelocity;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Calculate orientation for hair or optional custom hands
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;

  // 2. Earclacks Model Body (Flat Gray Sphere with Solid Jet-Black Border)
  // Consistently uses fighter's actual live HP across all match states (playing, roundEnd, matchEnd, victory reveal).
  // In preview states without an active fighter HP, gracefully defaults to '100'.
  // This guarantees the body number never suddenly resets or jumps to 100 upon winning!
  const hpText = getUnarmedHpText(fighter);
  drawUnarmedPixelBody(ctx, r, isSuper, hpText);

  // 3. Hair Asset Overlay (Rule 22) - Bald by default, supports skin customizations
  _drawUnarmedHair(ctx, r, facingLeft);

  // 4. Default Hands: Strictly hidden for Unarmed (official weaponless and handless Earclacks physics ball)
  const showHands = Boolean(fighter.showHands || CONFIG.unarmed?.showHands);
  if (showHands) {
    ctx.save();
    ctx.rotate(angle);
    if (facingLeft && !fighter.isSpinning) {
      ctx.scale(1, -1);
    }
    const handR = getHandSize(r * 0.30);
    const skinColor = isSuper ? '#FFFFFF' : '#CFCFCF';
    const strokeColor = isSuper ? '#D4D4D8' : '#000000';

    let leftHandX = -r * 0.82;
    let leftHandY = r * 0.38;
    let rightHandX = r * 0.82;
    let rightHandY = r * 0.38;

    // Dynamic punch animation lunge
    if (fighter.punchAnimTimer > 0) {
      const punchProgress = fighter.punchAnimTimer / (fighter.punchAnimMaxTimer || 14);
      const lungeDist = Math.sin(punchProgress * Math.PI) * (r * 0.70);
      if (fighter.punchHand === 'left') {
        leftHandY -= lungeDist;
      } else {
        rightHandY -= lungeDist;
      }
    }

    // Kinetic Surge aerodynamic fist vibration
    if (fighter.surgeTimer > 0 || isSuper) {
      const surgeVibe = Math.sin(Date.now() * 0.05) * (isSuper ? 2.0 : 1.2);
      leftHandX += surgeVibe;
      rightHandX -= surgeVibe;
    }

    drawPixelHand(ctx, leftHandX, leftHandY, handR, skinColor, strokeColor);
    drawPixelHand(ctx, rightHandX, rightHandY, handR, skinColor, strokeColor);
    ctx.restore();
  }

  // 5. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
