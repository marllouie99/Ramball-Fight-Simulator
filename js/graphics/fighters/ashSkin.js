// ─────────────────────────────────────────────
// ASH KETCHUM (POKÉMON TRAINER) SKIN & BODY MODEL
// World Coronation Monarch of Pallet Town
// Adheres strictly to Repository Rules:
// - Rule 11: Zero ctx.shadowBlur / ctx.shadowColor
// - Rule 19: Upright Front POV & Faceless Minimalist Aesthetic (Cheek Z-marks only)
// - Rule 20: Symmetrical Lower-Flank Canonical Hands holding Poké Ball
// - Rule 22: Dedicated Hair & League Cap Asset Import (Assets/model/ash/Ash-hair.png)
// - Rule 24: Toji Reference Standard (P = 2.0px Offscreen Buffer & 4-Zone Proportions)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getTrainerHandRenderState, drawTrainerArmLinkage } from '../../systems/pokemonTrainerSystem.js';

let _ashHairImage = null;
let _ashHairImageLoading = false;

export function _getAshHairImage() {
  if (_ashHairImage && _ashHairImage.complete && _ashHairImage.naturalWidth > 0) {
    return _ashHairImage;
  }
  if (!_ashHairImageLoading && typeof Image !== 'undefined') {
    _ashHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _ashHairImage = img;
      _ashHairImageLoading = false;
    };
    img.onerror = () => {
      _ashHairImageLoading = false;
    };
    img.src = 'Assets/model/ash/Ash-hair.png';
    _ashHairImage = img;
  }
  return _ashHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getAshHairImage();
}

/**
 * Draws Ash's Red & White Pokémon League Cap and spiky raven hair (Rule 22).
 */
export function _drawAshHair(ctx, r, facingLeft = false) {
  const hairImg = _getAshHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.ash) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    const targetW = r * 2.95 * wMult;
    const targetH = r * 2.15 * hMult;
    const drawX = -targetW / 2 + offX;
    const drawY = -r * 1.34 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + targetW / 2, drawY + targetH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, targetW, targetH);
    }
    ctx.restore();
    return;
  }

  // Procedural fallback: Spiky raven side locks + Red/White League Cap
  ctx.save();
  ctx.fillStyle = '#12161F';
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -r * 0.25);
  ctx.lineTo(-r * 1.22, -r * 0.48);
  ctx.lineTo(-r * 0.85, -r * 0.58);
  ctx.lineTo(-r * 1.15, -r * 0.82);
  ctx.lineTo(r * 1.15, -r * 0.82);
  ctx.lineTo(r * 0.85, -r * 0.58);
  ctx.lineTo(r * 1.22, -r * 0.48);
  ctx.lineTo(r * 0.92, -r * 0.25);
  ctx.closePath();
  ctx.fill();

  // Red League Cap Dome
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.38, r * 0.88, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White front panel
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(0, -r * 0.40, r * 0.44, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  // Green League arc emblem
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.46, r * 0.20, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

let _cachedAshBodyCanvas = null;
let _cachedAshBodyR = 0;

/**
 * Renders Ash's 4-zone pixel body to an offscreen canvas (Rule 24 — Toji Reference Standard).
 */
function _renderAshPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // Toji 4-neighbor outer boundary test
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Face & Cheeks Dome with Iconic Cheek Z-Marks (ry < r * 0.28)
      // ──────────────────────────────────────────
      if (ry < r * 0.28) {
        let col = '#E8BD9B';
        if (Math.abs(rx) > r * 0.72) {
          col = '#D4A373';
        }
        // Symmetrical cheek lightning-bolt Z-marks (Rule 19 faceless identity marking)
        const absX = Math.abs(rx);
        if (absX >= r * 0.34 && absX <= r * 0.62 && ry >= -r * 0.04 && ry <= r * 0.14) {
          const zBand = Math.round((ry + r * 0.04) / P);
          if (zBand === 0 || zBand === 2) {
            col = '#8B4513';
          }
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Kanto Royal Blue Trainer Jacket & Gold Trim (r * 0.28 <= ry < r * 0.64)
      // ──────────────────────────────────────────
      else if (ry < r * 0.64) {
        if (ry < r * 0.35 && Math.abs(rx) <= r * 0.46) {
          // Crisp white shirt collar & yellow collar trim
          destCtx.fillStyle = (Math.abs(rx) <= r * 0.22) ? '#1E293B' : '#F8FAFC';
        } else if (Math.abs(rx) <= P * 0.8) {
          // Dark center jacket zipper placket
          destCtx.fillStyle = '#0F172A';
        } else if (Math.abs(rx) >= r * 0.20 && Math.abs(rx) <= r * 0.52 && ry >= r * 0.42 && ry <= r * 0.48) {
          // Iconic yellow chest pocket flaps
          destCtx.fillStyle = '#FACC15';
        } else if (Math.abs(rx) > r * 0.74) {
          // White short sleeves on outer flanks
          destCtx.fillStyle = '#E2E8F0';
        } else if (ry > r * 0.58) {
          // White bottom hem trim
          destCtx.fillStyle = '#F1F5F9';
        } else {
          // Royal blue Kanto trainer vest fabric
          destCtx.fillStyle = (Math.abs(rx) < r * 0.42 && ry < r * 0.52) ? '#2563EB' : '#1D4ED8';
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Leather Trainer Belt & Poké Ball Holsters (r * 0.64 <= ry < r * 0.78)
      // ──────────────────────────────────────────
      else if (ry < r * 0.78) {
        if (Math.abs(rx) <= r * 0.16) {
          // Gold belt buckle
          destCtx.fillStyle = '#F59E0B';
        } else if (Math.abs(rx) >= r * 0.36 && Math.abs(rx) <= r * 0.54) {
          // Mini Poké Ball on hip belt (red top, white bottom)
          destCtx.fillStyle = (ry < r * 0.71) ? '#EF4444' : '#F8FAFC';
        } else {
          destCtx.fillStyle = '#451A03';
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Indigo Denim Trainer Jeans (ry >= r * 0.78, Y >= 24)
      // ──────────────────────────────────────────
      else {
        if (Math.abs(rx) <= P * 0.6 && ry > r * 0.82) {
          destCtx.fillStyle = '#0E0F14'; // Center inseam
        } else if (Math.abs(rx) > r * 0.58) {
          destCtx.fillStyle = '#263248'; // Outer denim pleat shadow
        } else if (ry < r * 0.86 && Math.abs(rx) < r * 0.45) {
          destCtx.fillStyle = '#475569'; // Upper denim highlight
        } else {
          destCtx.fillStyle = '#334155'; // Base indigo denim
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

export function drawAshPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderAshPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedAshBodyCanvas || _cachedAshBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedAshBodyCanvas = document.createElement('canvas');
    _cachedAshBodyCanvas.width = size;
    _cachedAshBodyCanvas.height = size;
    const cctx = _cachedAshBodyCanvas.getContext('2d');
    _renderAshPixelBodyToCanvas(cctx, intR);
    _cachedAshBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedAshBodyCanvas.width;
  ctx.drawImage(_cachedAshBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Draws a held Poké Ball anchored directly at the canonical right hand (0, 0 in hand local space).
 */
function _drawHeldPokeball(ctx, ballR, isUltra = false) {
  ctx.save();
  // Bottom white hemisphere
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(0, 0, ballR, 0, Math.PI * 2);
  ctx.fill();

  // Top crimson/ultra hemisphere
  ctx.fillStyle = isUltra ? '#1E293B' : '#EF4444';
  ctx.beginPath();
  ctx.arc(0, 0, ballR, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if (isUltra) {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, ballR * 0.65, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // Center black band & outer ink rim
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-ballR, 0);
  ctx.lineTo(ballR, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, ballR, 0, Math.PI * 2);
  ctx.stroke();

  // Center release button
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(0, 0, ballR * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Main skin renderer for Ash Ketchum (Rule 19, 20, 22, 24).
 * Features retro arcade character breathing animation when steady (Zenitsu Breathing Rhythm Standard).
 */
export function drawAshSkin(ctx, fighter) {
  if (!fighter) return;
  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // ── Retro Arcade Character Breathing Animation when Steady (Zenitsu Rhythm Standard) ──
  const isMovingFast = !fighter._isWinnerReveal && (Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.45);
  const isSteady = Boolean(fighter.isSteady !== undefined ? fighter.isSteady : !isMovingFast);

  if (isSteady) {
    fighter._ashSteadyTick = (fighter._ashSteadyTick || 0) + 1;
  }
  const steadyTick = fighter._ashSteadyTick || 0;
  const breathFreq = 0.16; // Exact Zenitsu breathing cadence (Rule 19 / Zenitsu Standard)
  const rawBreath = Math.sin(steadyTick * breathFreq);
  const breathQuantized = isSteady ? (rawBreath > 0.3 ? 1.0 : (rawBreath < -0.3 ? -1.0 : 0.0)) : 0.0;
  const breathLiftY = breathQuantized * 1.5;
  const chestExpansionX = Math.max(0, breathQuantized) * 1.0;

  // Query centralized Pokémon Trainer Throw Animation & Spring-Damped Hand Physics (Rule 20 & Rule 30)
  const handState = getTrainerHandRenderState(fighter, r);
  const torsoX = chestExpansionX * 0.3 + handState.torso.x;
  const torsoY = breathLiftY * 0.4 + handState.torso.y;
  const torsoRot = handState.torso.rot || 0;

  // Layer 1: Toji-Standard 4-Zone Pixel Body (Applies chest expansion, breathing lift & throw coil/lunge)
  ctx.save();
  ctx.translate(torsoX, torsoY);
  if (torsoRot !== 0) ctx.rotate(torsoRot * 0.55);
  drawAshPixelBody(ctx, r);
  ctx.restore();

  // Layer 2: League Cap & Spiky Hair Asset (Upper head secondary breathing & throw follow-through)
  ctx.save();
  ctx.translate(chestExpansionX * 0.5 + handState.torso.x * 1.15, breathLiftY * 0.6 + handState.torso.y * 0.9);
  if (torsoRot !== 0) ctx.rotate(torsoRot * 0.75);
  _drawAshHair(ctx, r, facingLeft);
  ctx.restore();

  // Layer 3: Symmetrical Lower-Flank Canonical Hands, 2-Bone Arm Linkages & Held Poké Ball (Rule 20 & Rule 30)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    ctx.save();
    ctx.translate(chestExpansionX * 0.4, breathLiftY * 0.5);

    const handR = getHandSize(r * 0.30);
    const armPalette = {
      sleeveColor: '#1D4ED8',
      cuffColor: '#F8FAFC',
      skinColor: '#E8BD9B',
      outlineColor: '#0E0F14'
    };

    // Muscular 2-Segment Sleeve & Forearm Linkages when arms extend during Poké Ball throw
    if (handState.isThrowing) {
      drawTrainerArmLinkage(ctx, handState.leftShoulder, handState.leftElbow, handState.leftHand, r, armPalette);
      drawTrainerArmLinkage(ctx, handState.rightShoulder, handState.rightElbow, handState.rightHand, r, armPalette);
    }

    // Whip Motion Arc Trail during Forward Throw Whip Phase (Rule 11 compliant)
    if (handState.whipIntensity > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.75, handState.whipIntensity * 0.85);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.42);
      ctx.quadraticCurveTo(r * 0.45, -r * 0.78, handState.rightHand.x, handState.rightHand.y);
      ctx.stroke();

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.20, -r * 0.36);
      ctx.quadraticCurveTo(r * 0.50, -r * 0.68, handState.rightHand.x, handState.rightHand.y);
      ctx.stroke();
      ctx.restore();
    }

    // Left Hand (Green fingerless trainer glove with counter-balance physics)
    drawPixelHand(
      ctx,
      handState.leftHand.x,
      handState.leftHand.y,
      handR * (handState.leftHand.scale || 1.0),
      '#16A34A',
      '#0E0F14'
    );

    // Right Hand + Held Poké Ball (Hand drawn first, Poké Ball drawn cleanly on top in palm)
    ctx.save();
    ctx.translate(handState.rightHand.x, handState.rightHand.y);
    const rScale = handState.rightHand.scale || 1.0;
    drawPixelHand(ctx, 0, 0, handR * rScale, '#16A34A', '#0E0F14');
    if (handState.isBallInHand) {
      ctx.save();
      ctx.translate(handR * 0.28 * rScale, -handR * 0.14 * rScale);
      _drawHeldPokeball(ctx, handR * 0.95 * rScale, Boolean(fighter.ultimateActiveTimer > 0));
      ctx.restore();
    }
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}
