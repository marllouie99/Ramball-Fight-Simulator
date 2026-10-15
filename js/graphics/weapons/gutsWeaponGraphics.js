// ─────────────────────────────────────────────
// GUTS — DRAGON SLAYER WEAPON GRAPHICS
// Adheres strictly to Repository Rules:
// - Rule 11: Zero ctx.shadowBlur or ctx.shadowColor
// - Rule 15: Double-tapered crescent blade slashes & dynamic eraser wipe
// - Rule 20: Canonical hand positioning & ZERO duplicate hands
// - Rule 26: Concentric supersonic shockwaves (Anti-cobweb standard)
// - Rule 30: 5-Phase melee combat animation & impact lock standard
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { gutsConfig } from '../../configs/characters/gutsConfig.js';

let _gutsSwordImage = null;
let _gutsSwordLoading = false;

export function _getGutsSwordImage() {
  if (_gutsSwordImage && _gutsSwordImage.complete && _gutsSwordImage.naturalWidth > 0) {
    return _gutsSwordImage;
  }
  if (!_gutsSwordLoading && typeof Image !== 'undefined') {
    _gutsSwordLoading = true;
    const img = new Image();
    img.onload = () => {
      _gutsSwordImage = img;
      _gutsSwordLoading = false;
    };
    img.onerror = () => {
      _gutsSwordLoading = false;
    };
    img.src = 'Assets/model/Guts/Guts_heavy_sword.png';
    _gutsSwordImage = img;
  }
  return _gutsSwordImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGutsSwordImage();
}

/**
 * Draws the Dragon Slayer base blade model rotated around its grip hilt.
 * Specifically calibrated for Assets/model/Guts/Guts_heavy_sword.png:
 * - Dimensions: 500x500
 * - Grip hilt center: (117, 374)
 * - Blade tip: (471, 28)
 * - Raw asset angle: -44.35 deg (-0.77402 rad)
 * - Alignment rotation: +0.77402 rad to align blade horizontally along +X
 * - Reach span from grip to tip: 495.0 px -> Scaled to 85.0 px reach
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} swordScale
 * @param {boolean} isBerserkerActive
 * @param {number} [widthScale=1.0]
 * @param {number} [lengthScale=1.0]
 */
function _drawDragonSlayerModel(ctx, swordScale = 1.0, isBerserkerActive = false, widthScale = 1.0, lengthScale = 1.0) {
  const swordImg = _getGutsSwordImage();
  const hasSwordImg = swordImg && swordImg.complete && swordImg.naturalWidth > 0;

  if (hasSwordImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Detect if 500x500 asset or 2048x2048 asset
    const imgW = swordImg.naturalWidth || 500;
    const is500Asset = imgW <= 1024;

    const gripX = is500Asset ? 117 : 440;
    const gripY = is500Asset ? 374 : 1660;
    const rotAlign = is500Asset ? 0.77402 : Math.PI / 4;
    const baseLength = is500Asset ? 495.0 : 1920.0;

    // Target blade reach is ~85px
    const sx = (85.0 * swordScale * lengthScale) / baseLength;
    const sy = (85.0 * swordScale * widthScale) / baseLength;
    const cosA = Math.cos(rotAlign);
    const sinA = Math.sin(rotAlign);

    // Exact orthogonal affine projection matrix:
    // Aligns blade length strictly along +X scaled by sx, and blade width strictly along Y scaled by sy.
    // Completely eliminates diagonal shear distortion, angle drift, and cross-axis stretching.
    ctx.transform(sx * cosA, sy * sinA, -sx * sinA, sy * cosA, 0, 0);

    // Anchor grip (117, 374) directly at local (0, 0)
    ctx.drawImage(swordImg, -gripX, -gripY);

    // Demonic crimson aura glint if Berserker Armor active
    if (isBerserkerActive) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
      const auraLen = baseLength;
      const auraW = 60;
      ctx.fillRect(0, -auraW, auraLen, auraW * 2);
    }

    ctx.restore();
    return;
  }

  // ── PROCEDURAL FALLBACK: Authentic Raw Iron Dragon Slayer ──
  ctx.save();
  const bladeLen = 85 * swordScale * lengthScale;
  const bladeW = 16 * swordScale * widthScale;

  // 1. Two-Handed Leather Wrapped Grip (-X Behind Guard)
  ctx.fillStyle = '#5c4033'; // Weathered brown leather
  ctx.fillRect(-18 * swordScale * lengthScale, -3.5 * swordScale * widthScale, 18 * swordScale * lengthScale, 7 * swordScale * widthScale);

  // Bandage ribbing wraps
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1.5;
  for (let gx = -16 * swordScale * lengthScale; gx < 0; gx += 4 * swordScale * lengthScale) {
    ctx.beginPath();
    ctx.moveTo(gx, -3.5 * swordScale * widthScale);
    ctx.lineTo(gx + 2 * swordScale * lengthScale, 3.5 * swordScale * widthScale);
    ctx.stroke();
  }

  // 2. Heavy Iron Pommel
  ctx.fillStyle = '#27272a';
  ctx.fillRect(-22 * swordScale * lengthScale, -5 * swordScale * widthScale, 4 * swordScale * lengthScale, 10 * swordScale * widthScale);

  // 3. Rectangular Iron Crossguard Block with Raised Central Boss
  ctx.fillStyle = '#1c1e24';
  ctx.fillRect(0, -bladeW * 0.75, 6 * swordScale * lengthScale, bladeW * 1.5);
  ctx.fillStyle = '#3f444e';
  ctx.beginPath();
  ctx.arc(3 * swordScale * lengthScale, 0, 4 * swordScale * widthScale, 0, Math.PI * 2);
  ctx.fill();

  // 4. Massive Beveled Raw Iron Blade Slab
  // Outer Razor Cutting Bevel
  ctx.fillStyle = isBerserkerActive ? '#b91c1c' : '#71717a';
  ctx.beginPath();
  ctx.moveTo(6 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.lineTo(bladeLen - 12 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.lineTo(bladeLen, 0); // Blade Point
  ctx.lineTo(bladeLen - 12 * swordScale * lengthScale, bladeW * 0.5);
  ctx.lineTo(6 * swordScale * lengthScale, bladeW * 0.5);
  ctx.closePath();
  ctx.fill();

  // Dark Blackened Raw Iron Core Slab
  ctx.fillStyle = isBerserkerActive ? '#450a0a' : '#18181b';
  ctx.beginPath();
  ctx.moveTo(8 * swordScale * lengthScale, -bladeW * 0.35);
  ctx.lineTo(bladeLen - 14 * swordScale * lengthScale, -bladeW * 0.35);
  ctx.lineTo(bladeLen - 4 * swordScale * lengthScale, 0);
  ctx.lineTo(bladeLen - 14 * swordScale * lengthScale, bladeW * 0.35);
  ctx.lineTo(8 * swordScale * lengthScale, bladeW * 0.35);
  ctx.closePath();
  ctx.fill();

  // Polished Upper Spine Specular Glint
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(10 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.lineTo(bladeLen - 12 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the Dragon Slayer resting diagonally across the shoulder/back (Stance 1: IDLE / Countdown).
 * Specifically calibrated to match the user's IDLE mockup:
 * - Blade extends UP-LEFT (-145.2 deg) behind the helmet and neck.
 * - Handle pommel emerges on the right side near (r * 0.76, r * 0.32).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r
 * @param {object} [custom={}]
 * @param {boolean} [isBerserkerActive=false]
 */
export function drawGutsShoulderSword(ctx, r, custom = {}, isBerserkerActive = false) {
  const swordScale = custom.scale ?? 1.0;
  const customWidthScale = custom.widthScale ?? 1.0;
  const customLengthScale = custom.lengthScale ?? 1.0;
  const customOffX = custom.offsetX ?? 0;
  const customOffY = custom.offsetY ?? 0;
  const customAngle = custom.angleOffset ?? 0;

  // Grip pommel emerges near right shoulder flank
  const shoulderGripX = r * 0.76 + customOffX;
  const shoulderGripY = r * 0.32 + customOffY;

  ctx.save();
  ctx.translate(shoulderGripX, shoulderGripY);
  // Blade points UP-LEFT (-145.2 deg = -2.534 rad).
  // _drawDragonSlayerModel normalizes blade along +X, so rotating by -2.534 rad points it up-left!
  ctx.rotate(-2.534 + customAngle);
  _drawDragonSlayerModel(ctx, swordScale, isBerserkerActive, customWidthScale, customLengthScale);
  ctx.restore();
}

/**
 * Draws Guts' Dragon Slayer in Combat Battle Stance & 2-Hit Jaw Cleave Pattern.
 * - In Combat Battle Stance & Swing Animations: Held/clamped firmly in the jaws of the Berserker helmet
 *   at (mouthX, mouthY = r * 0.55), sweeping dynamically across 210 degrees without hands on weapon.
 * - Fists remain canonically positioned on lower flanks (Rule 20 compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 * @param {number} r
 * @param {boolean} [facingLeft=false]
 */
export function drawGutsWeapons(ctx, fighter, r, facingLeft = false) {
  if (!fighter) return;

  const shouldHide = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (shouldHide) return;

  const isCountdown = (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'select' || state.gameState === 'faceoff')) || Boolean(fighter?.isCountdownStance || fighter?._isCountdown);
  if (isCountdown) {
    // Stance 1 (IDLE) shoulder rest sword is rendered on Layer 0.8 in gutsSkin.js behind the helmet
    return;
  }

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
  const swordScale = custom.scale ?? 1.0;
  const customWidthScale = custom.widthScale ?? 1.0;
  const customLengthScale = custom.lengthScale ?? 1.0;
  const customOffX = custom.offsetX ?? 0;
  const customOffY = custom.offsetY ?? 0;
  const customAngle = custom.angleOffset ?? 0;
  const isBerserkerActive = fighter.isBerserkerActive === true;

  const isSwinging = Boolean((fighter.swipeActive && fighter.swordSwingTimer > 0) || (fighter.swordHitPauseTimer && fighter.swordHitPauseTimer > 0));

  const cfg = gutsConfig || {};
  const mouthX = (cfg.battleStanceMouthX ?? 0) + customOffX;
  const mouthY = r * (cfg.battleStanceMouthY ?? 0.55) + customOffY;
  const tx = fighter.swordTremorX || 0;
  const ty = fighter.swordTremorY || 0;

  const offsets = isSwinging && typeof fighter._getSwordSwingOffsets === 'function'
    ? fighter._getSwordSwingOffsets()
    : { lunge: 0, offY: 0 };
  const lunge = offsets.lunge || 0;
  const offY = offsets.offY || 0;

  const hiltX = mouthX + tx + lunge;
  const hiltY = mouthY + ty + offY;

  const swordAngle = isSwinging
    ? (typeof fighter._getSwordSwingAngle === 'function' ? fighter._getSwordSwingAngle() : (cfg.battleStanceStartAngle ?? 2.97))
    : (cfg.battleStanceStartAngle ?? (cfg.battleStanceAngle ?? 2.97));

  const totalAngle = swordAngle + customAngle;
  const cosS = Math.cos(totalAngle);
  const sinS = Math.sin(totalAngle);

  const rHandLocalX = -4 * swordScale * customLengthScale;
  const lHandLocalX = -13 * swordScale * customLengthScale;

  // World coordinates of both hands in local fighter space
  const rHandX = hiltX + cosS * rHandLocalX;
  const rHandY = hiltY + sinS * rHandLocalX;
  const lHandX = hiltX + cosS * lHandLocalX;
  const lHandY = hiltY + sinS * lHandLocalX;

  // Shoulder anchors on upper torso
  const lShoulderX = -r * 0.65;
  const lShoulderY = r * 0.22;
  const rShoulderX = r * 0.65;
  const rShoulderY = r * 0.22;

  // 1. Draw Muscular Arms connecting shoulders to hands (Visual Force of the Hands!)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left Arm (Blackened Berserker iron plate prosthetic):
  ctx.beginPath();
  ctx.moveTo(lShoulderX, lShoulderY);
  ctx.lineTo(lHandX, lHandY);
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.lineWidth = r * 0.20;
  ctx.strokeStyle = isBerserkerActive ? '#1c1e24' : '#27272a';
  ctx.stroke();

  // Right Arm (Muscular sword arm with blackened plate / tanned sleeve):
  ctx.beginPath();
  ctx.moveTo(rShoulderX, rShoulderY);
  ctx.lineTo(rHandX, rHandY);
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.lineWidth = r * 0.20;
  ctx.strokeStyle = isBerserkerActive ? '#27272a' : '#c4906c';
  ctx.stroke();
  ctx.restore();

  // 2. Draw Dragon Slayer Model rotated around the dynamic hilt anchor
  ctx.save();
  ctx.translate(hiltX, hiltY);
  ctx.rotate(totalAngle);
  _drawDragonSlayerModel(ctx, swordScale, isBerserkerActive, customWidthScale, customLengthScale);

  // 3. Draw Hands firmly clasped over the hilt on front layer (Rule 20 compliant)
  const handRadius = r * 0.28;
  // Right hand (Bandaged fist) on upper grip near crossguard
  drawPixelHand(ctx, rHandLocalX, 0, handRadius, '#e2e8f0', '#0E0F14');
  // Left hand (Iron prosthetic fist) on lower grip near pommel
  drawPixelHand(ctx, lHandLocalX, 0, handRadius, '#4a505a', '#0E0F14');

  ctx.restore();
}

/**
 * Draws dynamic crescent blade slash arcs and dynamic sinusoidal eraser wipes (Rule 15 & Knight Standard).
 * Envelops the 210-degree half-full sweep from mouth clamp to blade tip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsComboSlashVFX(ctx, fighter) {
  if (!fighter) return;

  const isSwinging = Boolean((fighter.swipeActive && fighter.swordSwingTimer > 0) || (fighter.swordHitPauseTimer && fighter.swordHitPauseTimer > 0));
  const r = fighter.r || 30;
  const isBerserker = fighter.isBerserkerActive === true;
  const cfg = gutsConfig || {};

  // 1. Concentric Supersonic Blade Impact Shockwave (Rule 26) on Hit-Pause
  if (fighter.swordImpactTimer && fighter.swordImpactTimer > 0) {
    const ip = 1 - (fighter.swordImpactTimer / 14);
    const ringAlpha = Math.max(0, 1 - ip);

    ctx.save();
    // Wave 1: Supersonic white core compression ring
    const r1 = 10 + Math.pow(ip, 0.7) * 38;
    ctx.beginPath();
    ctx.arc(fighter.swordImpactX, fighter.swordImpactY, r1, 0, Math.PI * 2);
    ctx.lineWidth = 2.8 * (1 - ip);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ringAlpha})`;
    ctx.stroke();

    // Translucent warm interior wash
    ctx.fillStyle = isBerserker ? `rgba(220, 38, 38, ${0.20 * ringAlpha})` : `rgba(255, 100, 30, ${0.16 * ringAlpha})`;
    ctx.fill();

    // Wave 2: Staggered blood-red energy ionization ring (pops out after ip > 0.10)
    if (ip > 0.10) {
      const ip2 = (ip - 0.10) / 0.90;
      const r2 = 6 + Math.pow(ip2, 0.7) * 28;
      ctx.beginPath();
      ctx.arc(fighter.swordImpactX, fighter.swordImpactY, r2, 0, Math.PI * 2);
      ctx.lineWidth = 2.0 * (1 - ip2);
      ctx.strokeStyle = isBerserker ? `rgba(239, 68, 68, ${0.85 * (1 - ip2)})` : `rgba(220, 38, 38, ${0.80 * (1 - ip2)})`;
      ctx.stroke();
    }

    // Discrete spark dots at contact point (Rule 26: zero radial spokes!)
    for (let s = 0; s < 8; s++) {
      const sparkA = (s / 8) * Math.PI * 2 + ip * 1.8;
      const sparkDist = 8 + ip * 30 + ((s % 3) * 4);
      const sx = fighter.swordImpactX + Math.cos(sparkA) * sparkDist;
      const sy = fighter.swordImpactY + Math.sin(sparkA) * sparkDist;
      ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : (isBerserker ? '#ef4444' : '#dc2626');
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
    ctx.restore();
  }

  // 2. Anime 5-Phase Melee Slash Ribbon (210-Degree Mouth Cleave Standard)
  if (isSwinging) {
    const totalF = fighter.swordSwingMax || 22;
    const elapsed = Math.max(0, totalF - fighter.swordSwingTimer);
    const liftF = fighter.swordSwingLiftFrames || 6;
    const holdF = fighter.swordSwingHoldFrames || 2;
    const strikeF = fighter.swordSwingStrikeFrames || 7;
    const pinF = fighter.swordSwingImpactLockFrames || 5;
    const recF = fighter.swordSwingRecFrames || 2;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    if (elapsed >= strikeStart) {
      const isHit2 = (fighter.swordComboStep === 2);
      const startAngle = cfg.battleStanceStartAngle ?? (cfg.battleStanceAngle ?? 2.97); // ~170 deg (down-left)
      const apexAngle = cfg.battleStanceApexAngle ?? -0.70; // ~ -40 deg (up-right)
      const hit2StartAngle = cfg.hit2StartAngle ?? -2.15; // ~ -123 deg (overhead coiled sword position matching diagram)
      const hit2EndAngle = cfg.hit2EndAngle ?? 0.85;       // ~ +49 deg (downward ground cleave impact)

      const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
      const weaponReach = typeof fighter.getWeaponReach === 'function'
        ? fighter.getWeaponReach()
        : (85.0 * (custom.scale ?? 1.0) * (custom.lengthScale ?? 1.0));

      const innerR = r * 0.40;
      const outerR = r + weaponReach + 6;

      const currentSwordAngle = typeof fighter._getSwordSwingAngle === 'function'
        ? fighter._getSwordSwingAngle()
        : (isHit2 ? hit2EndAngle : apexAngle);

      let currentStartAngle = isHit2 ? hit2StartAngle : startAngle;
      let currentEndAngle = currentSwordAngle;

      if (elapsed >= strikeEnd && elapsed < pinEnd) {
        // Phase 4: Impact Lock hold
        currentStartAngle = isHit2 ? hit2StartAngle : startAngle;
        currentEndAngle = isHit2 ? hit2EndAngle : apexAngle;
      } else if (elapsed >= pinEnd) {
        // Phase 5: Dynamic Tail-to-Tip Eraser Wipe (Rule 15 & 30)
        const rp = Math.min(1.0, (elapsed - pinEnd) / Math.max(1, recF));
        const recP = Math.pow(rp, 1.4);
        const originStart = isHit2 ? hit2StartAngle : startAngle;
        const targetEnd = isHit2 ? hit2EndAngle : apexAngle;
        currentStartAngle = originStart + (targetEnd - originStart) * recP;
        currentEndAngle = targetEnd;
      }

      const angularSpan = Math.abs(currentEndAngle - currentStartAngle);
      if (angularSpan > 0.04) {
        const steps = 22;
        const tx = fighter.swordTremorX || 0;
        const ty = fighter.swordTremorY || 0;

        ctx.save();
        ctx.translate(fighter.x + tx, fighter.y + ty - (fighter.z || 0));
        const aimAngle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
        ctx.rotate(aimAngle);
        const facingLeft = Math.abs(aimAngle) > Math.PI / 2;
        if (facingLeft) {
          ctx.scale(1, -1);
        }
        const mouthX = cfg.battleStanceMouthX ?? 0;
        const mouthY = r * (cfg.battleStanceMouthY ?? 0.55);
        const slashOffsets = typeof fighter._getSwordSwingOffsets === 'function'
          ? fighter._getSwordSwingOffsets()
          : { lunge: 0, offY: 0 };
        ctx.translate(mouthX + (slashOffsets.lunge || 0), mouthY + (slashOffsets.offY || 0));

        // Outer Dark Iron Smoke Rim
        ctx.fillStyle = isBerserker ? 'rgba(220, 38, 38, 0.40)' : 'rgba(24, 24, 27, 0.50)';
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const a = currentStartAngle + (currentEndAngle - currentStartAngle) * t;
          const taper = Math.sin(t * Math.PI);
          const rad = outerR + taper * 8;
          const x = Math.cos(a) * rad;
          const y = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const a = currentStartAngle + (currentEndAngle - currentStartAngle) * t;
          const taper = Math.sin(t * Math.PI);
          const rad = innerR - taper * 4;
          const x = Math.cos(a) * rad;
          const y = Math.sin(a) * rad;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Dense Razor Core (White Supersonic Streak)
        ctx.strokeStyle = isBerserker ? '#ffffff' : '#f8fafc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, (innerR + outerR) * 0.5, currentStartAngle, currentEndAngle, currentStartAngle > currentEndAngle);
        ctx.stroke();

        // Visceral Crimson Blood Edge
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, outerR - 2, currentStartAngle, currentEndAngle, currentStartAngle > currentEndAngle);
        ctx.stroke();

        ctx.restore();
      }
    }
  }
}

/**
 * Standalone Dragon Slayer weapon preview renderer for Weapon Studio & Weapon Index Screen.
 * Supports Weapon Studio transformations (scale, widthScale, lengthScale, offsetX, offsetY, angleOffset).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} r
 * @param {Object} [opts={}]
 */
export function drawGutsWeaponPreview(ctx, x = 0, y = 0, angle = 0, r = 28, opts = {}) {
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customWidthScale = custom.widthScale !== undefined ? custom.widthScale : 1.0;
  const customLengthScale = custom.lengthScale !== undefined ? custom.lengthScale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;
  const isBerserkerActive = Boolean(opts.isBerserkerActive || (typeof state !== 'undefined' && state.showBerserkerTransformation));

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);

  _drawDragonSlayerModel(ctx, customScale, isBerserkerActive, customWidthScale, customLengthScale);

  if (opts.showHands !== false) {
    const handRadius = r * 0.28;
    // Right hand (Bandaged fist) on upper grip near crossguard
    drawPixelHand(ctx, -4 * customScale * customLengthScale, 0, handRadius, '#e2e8f0', '#0E0F14');
    // Left hand (Iron prosthetic fist) on lower grip near pommel
    drawPixelHand(ctx, -13 * customScale * customLengthScale, 0, handRadius, '#4a505a', '#0E0F14');
  }

  ctx.restore();
}
