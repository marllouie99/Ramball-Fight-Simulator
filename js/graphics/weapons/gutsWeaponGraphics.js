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
import { getHandSize } from '../../core/config.js';
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
    img.src = 'Assets/model/guts/Guts_heavy_sword.png';
    _gutsSwordImage = img;
  }
  return _gutsSwordImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGutsSwordImage();
}

/**
 * Draws the Dragon Slayer base blade model rotated around its grip hilt.
 * Specifically calibrated for Assets/model/guts/Guts_heavy_sword.png:
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
function _drawDragonSlayerModel(ctx, swordScale = 1.0, isBerserkerActive = false, widthScale = 1.0, lengthScale = 1.0, isGoldenCharge = false) {
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
  ctx.fillStyle = isBerserkerActive ? '#b91c1c' : (isGoldenCharge ? '#fbbf24' : '#71717a');
  ctx.beginPath();
  ctx.moveTo(6 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.lineTo(bladeLen - 12 * swordScale * lengthScale, -bladeW * 0.5);
  ctx.lineTo(bladeLen, 0); // Blade Point
  ctx.lineTo(bladeLen - 12 * swordScale * lengthScale, bladeW * 0.5);
  ctx.lineTo(6 * swordScale * lengthScale, bladeW * 0.5);
  ctx.closePath();
  ctx.fill();

  // Dark Blackened Raw Iron Core Slab
  ctx.fillStyle = isBerserkerActive ? '#450a0a' : (isGoldenCharge ? '#d97706' : '#18181b');
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
  _drawDragonSlayerModel(ctx, swordScale, isBerserkerActive, customWidthScale, customLengthScale, false);
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

  const isSwinging = Boolean((fighter.swipeActive && fighter.swordSwingTimer > 0) || (fighter.swordHitPauseTimer && fighter.swordHitPauseTimer > 0) || (fighter.calamityActive && fighter.calamityTimer > 0) || (fighter.calamityHitPauseTimer && fighter.calamityHitPauseTimer > 0));
  const isGoldenCharge = Boolean(fighter.calamityActive && fighter.calamityTimer > 0);

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

  const rHandLocalX = -4 * swordScale * customLengthScale;
  const lHandLocalX = -13 * swordScale * customLengthScale;

  const skinCustom = (typeof state !== 'undefined' && state.skinCustomizations?.guts) || {};
  const handScale = skinCustom.handScale ?? (fighter && fighter.handScale) ?? 1.0;
  const handRadius = getHandSize ? getHandSize(r * 0.30 * handScale) : (r * 0.30 * handScale);

  // 1. Draw Dragon Slayer Model rotated around the dynamic hilt anchor
  ctx.save();
  ctx.translate(hiltX, hiltY);
  ctx.rotate(totalAngle);
  _drawDragonSlayerModel(ctx, swordScale, isBerserkerActive, customWidthScale, customLengthScale, isGoldenCharge);

  // 2. Draw Guts' Canonical Default Hands directly gripping the hilt (Rule 20 compliant, zero stick-arm lines)
  // Left hand (Iron prosthetic default hand) on lower grip near pommel
  drawPixelHand(ctx, lHandLocalX, 0, handRadius, '#4a505a', '#0E0F14');
  // Right hand (Bandaged default hand) on upper grip near crossguard
  drawPixelHand(ctx, rHandLocalX, 0, handRadius, '#e2e8f0', '#0E0F14');

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

  // 3. Skill 1 (Calamity Cleave): Smooth 2-Sequence Attack Slash Animation Only
  drawGutsCalamitySlashVFX(ctx, fighter);
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

/**
 * Hypersonic Horizontal Cleave Flash (Frame 4 Reference)
 * Screen-spanning horizontal lightburst with supersonic needles and warm floor illumination.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsCalamityFlash(ctx, fighter) {
  if (!fighter || !fighter.calamityFlashTimer || fighter.calamityFlashTimer <= 0) return;

  const aim = fighter.committedAttackAngle !== undefined ? fighter.committedAttackAngle : (fighter.gunAngle || 0);
  const r = fighter.r || 30;
  const weaponReach = typeof fighter.getWeaponReach === 'function' ? fighter.getWeaponReach() : 85.0;
  const isSeq2 = (fighter.calamityFlashSeq === 2);

  const fx = fighter.x + Math.cos(aim) * (r + weaponReach * (isSeq2 ? 0.75 : 0.65));
  const fy = fighter.y + Math.sin(aim) * (r + weaponReach * (isSeq2 ? 0.75 : 0.65));

  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(aim);

  ctx.globalCompositeOperation = 'lighter';
  const beamW = isSeq2 ? 34.0 : 28.0;
  const beamLen = isSeq2 ? 580.0 : 520.0;

  // Ground illumination ellipse under the strike plane
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, beamLen * 0.45, beamW * 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = isSeq2 ? 'rgba(251, 191, 36, 0.45)' : 'rgba(251, 191, 36, 0.35)';
  ctx.fill();
  ctx.restore();

  // Translucent golden outer streak
  ctx.fillStyle = isSeq2 ? 'rgba(245, 158, 11, 0.70)' : 'rgba(245, 158, 11, 0.60)';
  ctx.beginPath();
  ctx.moveTo(0, -beamLen * 0.5);
  ctx.lineTo(beamW * 0.45, 0);
  ctx.lineTo(0, beamLen * 0.5);
  ctx.lineTo(-beamW * 0.45, 0);
  ctx.closePath();
  ctx.fill();

  // Supersonic needle core (pure white-hot lightburst - Rule 16 standard)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -beamLen * 0.45);
  ctx.lineTo(isSeq2 ? 4.5 : 3.8, 0);
  ctx.lineTo(0, beamLen * 0.45);
  ctx.lineTo(isSeq2 ? -4.5 : -3.8, 0);
  ctx.closePath();
  ctx.fill();

  // Forward speedline needles
  const needleCount = isSeq2 ? 4 : 3;
  for (let i = -needleCount; i <= needleCount; i++) {
    const spdLen = 85 + Math.abs(i) * 35;
    const off = i * 26;
    ctx.strokeStyle = (i === 0) ? '#ffffff' : 'rgba(254, 240, 138, 0.80)';
    ctx.lineWidth = (i === 0) ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, off);
    ctx.lineTo(spdLen, off);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Inward Golden Vortex Particles (Frame 7 Reference)
 * Golden swirling flakes spiraling inwards towards Guts during Sequence 2 tension load.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsCalamityVortex(ctx, fighter) {
  if (!fighter || !fighter.activeCalamityVortex || fighter.activeCalamityVortex.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const v of fighter.activeCalamityVortex) {
    const lifeP = v.age / Math.max(1, v.maxAge);
    const alpha = Math.max(0, 1.0 - lifeP * 0.85);
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = alpha;
    ctx.fillRect(v.x - v.size * 0.5, v.y - v.size * 0.5, v.size, v.size);
    // Incandescent gold core
    ctx.fillStyle = '#fef08a';
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillRect(v.x - v.size * 0.25, v.y - v.size * 0.25, v.size * 0.5, v.size * 0.5);
  }
  ctx.restore();
}

/**
 * Smooth 5-Phase Attack Slash Animation for Skill 1 (Calamity Cleave Sequences 1 & 2)
 * Renders a clean, double-tapered crescent slash ribbon locked 1:1 to the Dragon Slayer's
 * cutting edge with a smooth tail-to-tip eraser wipe (Rule 15 & Rule 30).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsCalamitySlashVFX(ctx, fighter) {
  if (!fighter || !fighter.calamityActive || !fighter.calamityTimer || fighter.calamityTimer <= 0) return;

  const cfg = gutsConfig || {};
  const isSeq2 = (fighter.calamitySeq === 2);
  const r = fighter.r || 30;
  const isBerserker = fighter.isBerserkerActive === true;

  const windupF = isSeq2 ? (cfg.calamitySeq2WindupFrames ?? 18) : (cfg.calamityWindupFrames ?? 28);
  const strikeF = isSeq2 ? (cfg.calamitySeq2StrikeFrames ?? 11) : (cfg.calamityStrikeFrames ?? 9);
  const lockF = isSeq2 ? (cfg.calamitySeq2LockFrames ?? 18) : (cfg.calamityLockFrames ?? 22);
  const recF = isSeq2 ? (cfg.calamitySeq2RecoveryFrames ?? 24) : (cfg.calamityRecoveryFrames ?? 0);

  const totalF = fighter.calamityMax || (windupF + strikeF + lockF + recF);
  const elapsed = Math.max(0, totalF - fighter.calamityTimer);
  const strikeStart = windupF;
  const strikeEnd = strikeStart + strikeF;

  // Slash ribbon only visible starting from strike phase!
  if (elapsed < strikeStart) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
  const weaponReach = typeof fighter.getWeaponReach === 'function'
    ? fighter.getWeaponReach()
    : (85.0 * (custom.scale ?? 1.0) * (custom.lengthScale ?? 1.0));

  const innerR = r * 0.42;
  const outerR = r + weaponReach + 6;

  // Sequence 1 sweeps from 3.32 rad down to -2.45 rad; Sequence 2 sweeps from 3.58 rad down to -0.65 rad
  const originStart = isSeq2 ? 3.58 : 3.32;
  const targetEnd = isSeq2 ? -0.65 : -2.45;
  const maxArcSpan = 2.65; // ~152 deg smooth crescent arc span following the blade

  const currentSwordAngle = typeof fighter._getSwordSwingAngle === 'function'
    ? fighter._getSwordSwingAngle()
    : targetEnd;

  let currentStartAngle = Math.min(originStart, currentSwordAngle + maxArcSpan);
  let currentEndAngle = currentSwordAngle;

  if (elapsed >= strikeEnd) {
    // Dynamic Tail-to-Tip Eraser Wipe (Rule 15 & Rule 30)
    const wipeWindow = isSeq2 ? (lockF + recF * 0.4) : lockF;
    const rp = Math.min(1.0, (elapsed - strikeEnd) / Math.max(1, wipeWindow));
    const recP = Math.pow(rp, 1.35);
    const lockStart = targetEnd + maxArcSpan;
    currentStartAngle = lockStart + (targetEnd - lockStart) * recP;
    currentEndAngle = targetEnd;
  }

  const angularSpan = Math.abs(currentEndAngle - currentStartAngle);
  if (angularSpan > 0.04) {
    const steps = 24;
    const tx = fighter.swordTremorX || 0;
    const ty = fighter.swordTremorY || 0;

    ctx.save();
    ctx.translate(fighter.x + tx, fighter.y + ty - (fighter.z || 0));
    const aimAngle = fighter._isWinnerReveal ? 0 : (fighter.committedAttackAngle !== undefined ? fighter.committedAttackAngle : (fighter.gunAngle || 0));
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

    // 1. Outer Dark Iron / Amber Smoke Envelope (Double-Tapered Crescent)
    ctx.fillStyle = isBerserker ? 'rgba(220, 38, 38, 0.42)' : 'rgba(24, 24, 27, 0.50)';
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

    // 2. Smooth Golden / Crimson Cutting Ribbon Body
    ctx.fillStyle = isBerserker ? 'rgba(239, 68, 68, 0.55)' : 'rgba(251, 191, 36, 0.55)';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = currentStartAngle + (currentEndAngle - currentStartAngle) * t;
      const taper = Math.sin(t * Math.PI);
      const rad = (innerR + outerR) * 0.5 + taper * 6;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const a = currentStartAngle + (currentEndAngle - currentStartAngle) * t;
      const taper = Math.sin(t * Math.PI);
      const rad = (innerR + outerR) * 0.5 - taper * 6;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Incandescent White Razor Core Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, (innerR + outerR) * 0.5, currentStartAngle, currentEndAngle, currentStartAngle > currentEndAngle);
    ctx.stroke();

    // 4. Outer Cutting Edge Rim
    ctx.strokeStyle = isBerserker ? '#dc2626' : '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - 2, currentStartAngle, currentEndAngle, currentStartAngle > currentEndAngle);
    ctx.stroke();

    ctx.restore();
  }
}

export function drawGutsCrescentWaves(ctx, fighter) {
  if (!fighter || !fighter.activeCrescentWaves || fighter.activeCrescentWaves.length === 0) return;

  for (const wave of fighter.activeCrescentWaves) {
    const lifeP = Math.min(1.0, wave.age / Math.max(1, wave.maxAge));
    const alpha = Math.max(0, 1.0 - Math.pow(lifeP, 1.4));
    const width = wave.width || 140;
    const isBerserker = wave.isBerserker === true;

    ctx.save();
    ctx.translate(wave.x, wave.y);
    ctx.rotate(wave.angle);

    // Warm ground light under the travelling wave
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.45, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = isBerserker ? `rgba(220, 38, 38, ${0.25 * alpha})` : `rgba(251, 191, 36, ${0.28 * alpha})`;
    ctx.fill();
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';

    // Frame 6 check: If wave is past 55% lifetime, split into twin trailing ribbons!
    const isSplitting = lifeP > 0.55;
    const splitProgress = isSplitting ? ((lifeP - 0.55) / 0.45) : 0;
    const ribbonOffsets = isSplitting ? [-6 * splitProgress, 6 * splitProgress] : [0];

    const steps = 18;
    const isSeq2 = (wave.seq === 2);
    const arcSpan = (isSeq2 ? 85 : 70) * Math.PI / 180;
    const rad = width * 0.55;
    const maxThick = isSplitting ? (isSeq2 ? 9.0 : 7.0) : (isSeq2 ? 18.0 : 14.0);

    for (const ribbonOff of ribbonOffsets) {
      ctx.save();
      ctx.translate(ribbonOff, 0);

      // Outer Golden Amber Ribbon
      ctx.fillStyle = isBerserker
        ? `rgba(239, 68, 68, ${0.75 * alpha})`
        : `rgba(245, 158, 11, ${0.75 * alpha})`;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = -arcSpan * 0.5 + arcSpan * t;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15);
        const rCurrent = rad + (maxThick * taper) * 0.5;
        const x = Math.cos(a) * rCurrent - rad;
        const y = Math.sin(a) * rCurrent;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = -arcSpan * 0.5 + arcSpan * t;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15);
        const rCurrent = rad - (maxThick * taper) * 0.5;
        const x = Math.cos(a) * rCurrent - rad;
        const y = Math.sin(a) * rCurrent;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Razor-sharp Incandescent White Streak
      ctx.strokeStyle = isBerserker ? '#ffffff' : '#fef08a';
      ctx.lineWidth = isSplitting ? 1.8 : 3.0;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = -arcSpan * 0.5 + arcSpan * t;
        const x = Math.cos(a) * rad - rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}

/**
 * Trailing Ground Embers (Frame 6 Reference)
 * Discrete glowing ember particles scattering along the ground (Rule 26 compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawGutsCalamityEmbers(ctx, fighter) {
  if (!fighter || !fighter.activeCalamityEmbers || fighter.activeCalamityEmbers.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of fighter.activeCalamityEmbers) {
    const lifeP = e.age / Math.max(1, e.maxAge);
    const alpha = Math.max(0, 1.0 - lifeP);
    ctx.fillStyle = e.color || '#fbbf24';
    ctx.globalAlpha = alpha;
    ctx.fillRect(e.x - e.size * 0.5, e.y - e.size * 0.5, e.size, e.size);
  }
  ctx.restore();
}

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
    const skinCustom = (typeof state !== 'undefined' && state.skinCustomizations?.guts) || {};
    const handScale = skinCustom.handScale ?? 1.0;
    const handRadius = getHandSize ? getHandSize(r * 0.30 * handScale) : (r * 0.30 * handScale);
    // Left hand (Iron prosthetic default hand) on lower grip near pommel
    drawPixelHand(ctx, -13 * customScale * customLengthScale, 0, handRadius, '#4a505a', '#0E0F14');
    // Right hand (Bandaged default hand) on upper grip near crossguard
    drawPixelHand(ctx, -4 * customScale * customLengthScale, 0, handRadius, '#e2e8f0', '#0E0F14');
  }

  ctx.restore();
}
