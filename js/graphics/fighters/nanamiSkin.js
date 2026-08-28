// ─────────────────────────────────────────────
// Kento Nanami Fighter Skin & Body Model
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { drawNanamiCleaver, drawNanamiCollapseShockwaves, drawNanamiBlackFlashActivationAura } from '../weapons/nanamiWeaponGraphics.js';
import { GojoRenderer } from './gojoRenderer.js';

let _nanamiSkinImage = null;
let _nanamiSkinImageLoading = false;

export function _getNanamiSkinImage() {
  if (_nanamiSkinImage && _nanamiSkinImage.complete && _nanamiSkinImage.naturalWidth > 0) {
    return _nanamiSkinImage;
  }
  if (!_nanamiSkinImageLoading && typeof Image !== 'undefined') {
    _nanamiSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _nanamiSkinImage = img;
      _nanamiSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Nanami pixel skin image at Assets/model/Nanami-PIXEL-SKIN.png', e);
      _nanamiSkinImageLoading = false;
    };
    img.src = 'Assets/model/Nanami-PIXEL-SKIN.png?v=1';
    _nanamiSkinImage = img;
  }
  return _nanamiSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getNanamiSkinImage();
}

// Pre-computed normalized constants to eliminate per-frame GC allocations
const _TIE_SPLOTCHES = [
  { x: -0.04, y: 0.33, rx: 1.3, ry: 1.0 },
  { x:  0.05, y: 0.35, rx: 1.1, ry: 1.4 },
  { x:  0.00, y: 0.40, rx: 1.4, ry: 1.0 },
  { x: -0.04, y: 0.48, rx: 1.4, ry: 1.8 },
  { x:  0.04, y: 0.52, rx: 1.6, ry: 1.2 },
  { x: -0.06, y: 0.58, rx: 1.2, ry: 1.5 },
  { x:  0.01, y: 0.61, rx: 1.5, ry: 1.3 },
  { x:  0.06, y: 0.66, rx: 1.3, ry: 1.6 },
  { x: -0.04, y: 0.72, rx: 1.7, ry: 1.3 },
  { x:  0.03, y: 0.77, rx: 1.4, ry: 1.5 },
  { x: -0.07, y: 0.82, rx: 1.3, ry: 1.2 },
  { x:  0.00, y: 0.85, rx: 1.6, ry: 1.4 },
  { x:  0.06, y: 0.89, rx: 1.2, ry: 1.3 },
  { x: -0.03, y: 0.94, rx: 1.4, ry: 1.2 },
  { x:  0.00, y: 1.00, rx: 1.1, ry: 1.1 }
];

const _BANGS_COORDS = [
  { nx:  1.00, ny: -0.15 },
  { nx:  0.75, ny: -0.28 },
  { nx:  0.55, ny: -0.35 },
  { nx:  0.35, ny: -0.48 },
  { nx:  0.18, ny: -0.25 },
  { nx:  0.00, ny: -0.38 },
  { nx: -0.22, ny: -0.22 },
  { nx: -0.42, ny: -0.34 },
  { nx: -0.65, ny: -0.18 },
  { nx: -0.85, ny: -0.26 },
  { nx: -1.00, ny: -0.15 }
];

/**
 * Draws Nanami's signature Golden-Amber JJK Cursed Energy Aura.
 * In standard mode: subtle golden CE flame bloom and animated wisps.
 * In Overtime (120%): grounded golden clockwork watch dial field, steady 12-hour indices with 18:00 Overtime mark, smooth rotating second-hand ray, and crackling lightning arcs!
 * Zero floating objects, zero pulsing scaling (Rule 11 compliant).
 */
export function drawNanamiCursedEnergyAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isOvertime = Boolean(fighter.isOvertimeActive || ((fighter.hp / (fighter.maxHp || 420)) <= 0.40));
  
  if (fighter && fighter._isWinnerReveal) return;

  const auraAlpha = isOvertime ? 1.0 : (fighter.combatAuraOpacity || 0);
  if (auraAlpha <= 0.01) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();

  // 1. Draw JJK-Authentic Sakuga Cursed Energy Flame Aura (Electric Blue theme — matching Gojo, Yuji, and Todo)
  if (typeof GojoRenderer !== 'undefined' && typeof GojoRenderer._drawJJKCursedEnergyAura === 'function') {
    GojoRenderer._drawJJKCursedEnergyAura(ctx, fighter, 'blue', 0, 0, r);
  }

  // 2. Overtime 120% Grounded Clockwork Watch Dial Energy Field (Steady, Zero Pulsing)
  if (isOvertime) {
    ctx.globalAlpha = auraAlpha;
    const haloRadius = r * 1.55;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.70)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([10, 4, 3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 12-Hour Watch Dial Radial Indices on the Ground (Steady)
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 - Math.PI / 2;
      const isOvertimeMark = (i === 6); // 18:00 (6 o'clock) Overtime Start Point
      const innerTick = isOvertimeMark ? haloRadius - 9 : haloRadius - 5;
      ctx.strokeStyle = isOvertimeMark ? '#EF4444' : 'rgba(255, 235, 120, 0.75)';
      ctx.lineWidth = isOvertimeMark ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerTick, Math.sin(a) * innerTick);
      ctx.lineTo(Math.cos(a) * (haloRadius + 1), Math.sin(a) * (haloRadius + 1));
      ctx.stroke();
    }

    // Live Sweeping Golden Clockwork Second Hand Ray (Smooth 360° Sweep)
    const sweepAngle = (now * 0.002) % (Math.PI * 2) - Math.PI / 2;
    const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, haloRadius);
    sweepGrad.addColorStop(0, 'rgba(255, 245, 160, 0.45)');
    sweepGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.28)');
    sweepGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweepAngle) * haloRadius, Math.sin(sweepAngle) * haloRadius);
    ctx.stroke();
    ctx.restore();

    // Inner Gold Boundary Ring (Steady)
    ctx.strokeStyle = 'rgba(255, 235, 120, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();

    // Crackling Golden Cursed Energy Lightning Arcs (Steady)
    ctx.strokeStyle = 'rgba(255, 240, 150, 0.85)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const arcAng = (Math.PI / 2) * i + Math.sin(now * 0.008 + i) * 0.35;
      const startDist = r * 0.9;
      const endDist = r * 1.45;
      const midDist = (startDist + endDist) * 0.5;
      const perpOffset = (Math.sin(now * 0.02 + i * 3) - 0.5) * 10;

      const cosA = Math.cos(arcAng);
      const sinA = Math.sin(arcAng);
      const perpX = -sinA;
      const perpY = cosA;

      ctx.beginPath();
      ctx.moveTo(cosA * startDist, sinA * startDist);
      ctx.lineTo(cosA * midDist + perpX * perpOffset, sinA * midDist + perpY * perpOffset);
      ctx.lineTo(cosA * endDist, sinA * endDist);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Helper to draw a clenched fist with watch and skin tone (Pixel Art Edition)
 */
function _drawFist(ctx, x, y, radius, skinColor, fighter, isFrontHand = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  // 1. Wrist / Cuff base (Deep cerulean blue shirt cuff - Stepped Pixel Art)
  ctx.fillStyle = '#12243A';
  ctx.fillRect(-gridR * 0.9, -gridR * 0.85, gridR * 1.8, gridR * 0.65);
  ctx.fillStyle = '#2B5882';
  ctx.fillRect(-gridR * 0.8, -gridR * 0.75, gridR * 1.6, gridR * 0.45);

  // 2. Golden Wristwatch on the back hand (Stepped Pixel Art)
  if (!isFrontHand) {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-gridR * 0.65, -gridR * 0.95, gridR * 1.3, gridR * 0.45);
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-gridR * 0.55, -gridR * 0.85, gridR * 1.1, gridR * 0.25);
    // Watch Face Pixel
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-P * 0.5, -gridR * 0.85, P, P);
  }

  // 3. Stepped Dark Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 4. Stepped Inner Base Skin Tone
  ctx.fillStyle = skinColor;
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 5. Knuckle Depth Shading
  ctx.fillStyle = '#C49677';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 6. Knuckle Specular Highlight Pixels
  ctx.fillStyle = '#FFF3E8';
  ctx.fillRect(P * 0.5, -innerR * 0.45, P, P);
  ctx.fillRect(P * 1.5, -innerR * 0.45, P, P);

  ctx.restore();
}

/**
 * Renders Nanami's dash afterimages at their recorded absolute world coordinates.
 */
export function drawNanamiAfterImages(ctx, fighter) {
  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0) return;
  const r = fighter.r || 25;

  ctx.save();
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 14);
    const alpha = progress * 0.45;
    const angle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);

    // 1. Golden Cursed Energy Ghost Silhouette
    ctx.beginPath();
    ctx.arc(0, 0, ai.r || r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.40)';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 2. Suit jacket silhouette (+Y Bottom Hemisphere)
    ctx.fillStyle = 'rgba(226, 212, 183, 0.50)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.95, 0, Math.PI);
    ctx.fill();

    // 3. Blonde 7:3 hair silhouette (-Y Top Hemisphere)
    ctx.fillStyle = 'rgba(245, 224, 123, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.98, Math.PI, Math.PI * 2);
    ctx.fill();

    // 4. Ghost Cleaver Blade
    drawNanamiCleaver(ctx, 0, 0, 0, ai.r || r, false);

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Main Skin Renderer for Kento Nanami (7:3 Ratio Sorcerer)
 */
export function drawNanamiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isOvertime = fighter.isOvertimeActive || ((fighter.hp / (fighter.maxHp || 420)) <= 0.40);
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  // 0. Render dash afterimages & collapse ground shockwaves in absolute world space
  drawNanamiAfterImages(ctx, fighter);
  drawNanamiCollapseShockwaves(ctx, fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Draw JJK Cursed Energy Aura when in close combat or Overtime
  // Delegates all alpha/gating logic to drawNanamiCursedEnergyAura itself.
  if (!fighter._isWinnerReveal) {
    drawNanamiCursedEnergyAura(ctx, fighter);
  }

  // 2. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Melee Chop, Punch & Collapse Animation Progress (Continuous Smooth Curve)
  const isCollapsing = Boolean(fighter.isCollapsing || (fighter.collapseTimer && fighter.collapseTimer > 0));
  const isPunching = !isPodiumPreview && (fighter.punchAnimTimer > 0 || fighter.slashSwingTimer > 0 || isCollapsing);
  let rawProgress = 0;
  if (isCollapsing) {
    const maxT = fighter.collapseMaxTimer || 14;
    const curTimer = fighter.collapseTimer || 0;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  } else if (isPunching) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 18;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  }

  // Smooth continuous bell-curve thrust
  const easeChop = isPunching ? Math.pow(Math.sin(rawProgress * Math.PI), 1.25) : 0;
  const lungeExtension = easeChop * (r * 0.95);

  // Hand Position Coordinates (Rule 19 / 20)
  let frontX = r * 0.95, frontY = 0;
  let backX = r * 0.70, backY = 0;
  let hideBackHand = true;

  const isBlitzing = Boolean(fighter.isBlitzing);
  const blitzIndex = isBlitzing ? (fighter.blitzStrikeIndex || 0) : 0;
  const isFinalBlitz = isBlitzing && (blitzIndex === ((fighter.blitzMaxStrikes || 4) - 1));

  if (isCollapsing) {
    hideBackHand = false; // Show 2-handed grip for structural ground slam!
    if (rawProgress < 0.45) {
      // Windup: Rear back high overhead with both hands
      const windupP = rawProgress / 0.45;
      const easeWindup = Math.sin(windupP * (Math.PI / 2));
      frontX = r * 0.50 - easeWindup * (r * 0.30);
      frontY = -r * 0.45 * easeWindup;
      backX = frontX - 13;
      backY = frontY + 3;
    } else {
      // Ground Slam: Drive cleaver down into the floor with 2 hands
      const slamP = (rawProgress - 0.45) / 0.55;
      const easeSlam = Math.pow(slamP, 1.8);
      frontX = r * 0.50 + easeSlam * (r * 0.85);
      frontY = -r * 0.45 + easeSlam * (r * 0.80);
      backX = frontX - 13;
      backY = frontY + 3;
    }
  } else if (isBlitzing) {
    if (isFinalBlitz) {
      hideBackHand = false; // 2-handed grip for execution finisher!
    }
    const t = Math.min(1.0, rawProgress / 0.45);
    const snapP = t * t * (3 - 2 * t);
    const extendBonus = isFinalBlitz ? 1.25 : 1.0;
    frontX = r * 0.95 + snapP * (r * 0.70 * extendBonus);
    frontY = -r * 0.20 + snapP * (r * 0.38);
    if (!hideBackHand) {
      backX = frontX - 13;
      backY = frontY + 3;
    }
  } else if (isPunching) {
    frontX = r * 0.95 + lungeExtension;
    frontY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else {
    // Idle stance: Front hand at the right edge of his body circle
    frontX = r * 0.95;
    frontY = 0;
  }

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const handRadius = getHandSize(7.5);
  const skinColor = '#F3CBB0';

  // ── LAYER 1: BACK HAND (Visible for 2-handed Collapse ground slam) ──
  if (!hideHandsAndWeapon && !hideBackHand && !hideFrontHand) {
    _drawFist(ctx, backX, backY, handRadius * 0.95, skinColor, fighter, false);
  }

  // ── LAYER 2: BODY CIRCLE (Clipped to Radius r) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const nanamiImg = _getNanamiSkinImage();
  if (nanamiImg && nanamiImg.complete && nanamiImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for authentic pixel art
    const modelScale = 1.04;
    const drawR = r * modelScale;
    ctx.drawImage(nanamiImg, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // A. Base Skin Fill (Warm Fair Tone)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // B. Shading Gradient for 3D depth (Zero shadowBlur - Rule 11)
    const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.15, 0, 0, r * 1.05);
    bodyGrad.addColorStop(0, 'rgba(255, 245, 235, 0.25)');
    bodyGrad.addColorStop(0.75, 'rgba(200, 140, 100, 0.12)');
    bodyGrad.addColorStop(1, 'rgba(60, 30, 20, 0.35)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

  // C. TORSO & CLOTHING (+Y Bottom Hemisphere — Rule 19)
  const shirtBlue = '#2B5882';       // Deep Cerulean / Steel Blue Dress Shirt
  const shirtDark = '#1B3B5B';       // Shirt crease & shadow
  const leatherBrown = '#733722';    // Reddish-Brown Leather Suspenders
  const leatherDark = '#4A2114';     // Leather border shadow
  const leatherHighlight = '#8F4830';// Leather top highlight
  const tieOlive = '#9A924D';        // Olive-Gold / Khaki Tie Base
  const tieSpot = '#111315';         // Dense Dark Splotches

  // 1. Deep Blue Button-Down Shirt Base (+Y)
  ctx.fillStyle = shirtBlue;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.18);
  ctx.lineTo(r, r * 0.18);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Subtle shirt folds / shading
  ctx.strokeStyle = shirtDark;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.50);
  ctx.quadraticCurveTo(-r * 0.15, r * 0.65, -r * 0.20, r * 0.85);
  ctx.moveTo(r * 0.25, r * 0.50);
  ctx.quadraticCurveTo(r * 0.15, r * 0.65, r * 0.20, r * 0.85);
  ctx.stroke();

  // 2. Reddish-Brown Leather Suspenders (Left & Right)
  // Left Suspender Strap
  ctx.fillStyle = leatherBrown;
  ctx.strokeStyle = leatherDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-r * 0.66, r * 0.18, r * 0.19, r * 0.84, 1);
  ctx.fill();
  ctx.stroke();

  // Left suspender inner highlight
  ctx.strokeStyle = leatherHighlight;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.61, r * 0.20);
  ctx.lineTo(-r * 0.61, r * 0.98);
  ctx.stroke();

  // Right Suspender Strap
  ctx.fillStyle = leatherBrown;
  ctx.strokeStyle = leatherDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(r * 0.47, r * 0.18, r * 0.19, r * 0.84, 1);
  ctx.fill();
  ctx.stroke();

  // Right suspender inner highlight
  ctx.strokeStyle = leatherHighlight;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(r * 0.52, r * 0.20);
  ctx.lineTo(r * 0.52, r * 0.98);
  ctx.stroke();

  // 3. Open V-Neck Opening & Neck Skin
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, r * 0.18);
  ctx.lineTo(r * 0.18, r * 0.18);
  ctx.lineTo(0, r * 0.42);
  ctx.closePath();
  ctx.fill();

  // Neck shadow at the top
  ctx.fillStyle = 'rgba(180, 100, 70, 0.35)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, r * 0.18);
  ctx.lineTo(r * 0.16, r * 0.18);
  ctx.lineTo(0, r * 0.30);
  ctx.closePath();
  ctx.fill();

  // 4. Loosened Olive-Gold Necktie with Dense Black Splotches
  const tieGrad = ctx.createLinearGradient(0, r * 0.28, 0, r * 1.0);
  tieGrad.addColorStop(0, '#AAA258');
  tieGrad.addColorStop(0.5, tieOlive);
  tieGrad.addColorStop(1, '#8A823F');

  ctx.fillStyle = tieGrad;
  ctx.strokeStyle = '#181A12';
  ctx.lineWidth = 1.2;

  // Loosened Tie Knot
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.28);
  ctx.lineTo(r * 0.12, r * 0.28);
  ctx.lineTo(r * 0.10, r * 0.44);
  ctx.lineTo(-r * 0.10, r * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hanging Tie Blade Body
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, r * 0.44);
  ctx.lineTo(r * 0.09, r * 0.44);
  ctx.lineTo(r * 0.14, r * 0.90);
  ctx.lineTo(0, r * 1.04); // Pointed tie tip
  ctx.lineTo(-r * 0.14, r * 0.90);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dense Organic Black Splotches / Leopard Pattern on Tie
  ctx.fillStyle = tieSpot;
  for (let i = 0; i < _TIE_SPLOTCHES.length; i++) {
    const s = _TIE_SPLOTCHES[i];
    ctx.beginPath();
    ctx.ellipse(r * s.x, r * s.y, s.rx, s.ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Button-Down Shirt Collar Flaps (Framing the open neck)
  ctx.fillStyle = '#244B74';
  ctx.strokeStyle = '#12243A';
  ctx.lineWidth = 1.3;

  // Left Collar Flap
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.18);
  ctx.lineTo(-r * 0.12, r * 0.38);
  ctx.lineTo(-r * 0.15, r * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left Collar Button Point
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(-r * 0.24, r * 0.24, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Right Collar Flap
  ctx.fillStyle = '#244B74';
  ctx.beginPath();
  ctx.moveTo(r * 0.32, r * 0.18);
  ctx.lineTo(r * 0.12, r * 0.38);
  ctx.lineTo(r * 0.15, r * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Collar Button Point
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(r * 0.24, r * 0.24, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // D. SIGNATURE 7:3 GOGGLES (Steel-Grey Frames, Side-Shields & Moss-Green Lenses — Rule 19)
  const goggleY = -r * 0.03;
  const leftX = -r * 0.30;
  const rightX = r * 0.30;
  const outerR = r * 0.28;
  const innerR = r * 0.20;

  // 1. Outer Metallic Temple Housings / Side Shields (with dark vent slots)
  ctx.fillStyle = '#8B9CA6';
  ctx.strokeStyle = '#222C33';
  ctx.lineWidth = 1.3;

  // Left Temple Housing
  ctx.beginPath();
  ctx.moveTo(leftX, goggleY - outerR * 0.85);
  ctx.lineTo(-r * 0.70, goggleY - outerR * 0.45);
  ctx.lineTo(-r * 0.70, goggleY + outerR * 0.55);
  ctx.lineTo(leftX, goggleY + outerR * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left Temple Vent Slots (2 dark horizontal bars)
  ctx.fillStyle = '#141C22';
  ctx.beginPath();
  ctx.roundRect(-r * 0.65, goggleY - outerR * 0.25, r * 0.14, 2.2, 0.5);
  ctx.roundRect(-r * 0.65, goggleY + outerR * 0.15, r * 0.14, 2.2, 0.5);
  ctx.fill();

  // Right Temple Housing
  ctx.fillStyle = '#8B9CA6';
  ctx.beginPath();
  ctx.moveTo(rightX, goggleY - outerR * 0.85);
  ctx.lineTo(r * 0.70, goggleY - outerR * 0.45);
  ctx.lineTo(r * 0.70, goggleY + outerR * 0.55);
  ctx.lineTo(rightX, goggleY + outerR * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Temple Vent Slots (2 dark horizontal bars)
  ctx.fillStyle = '#141C22';
  ctx.beginPath();
  ctx.roundRect(r * 0.51, goggleY - outerR * 0.25, r * 0.14, 2.2, 0.5);
  ctx.roundRect(r * 0.51, goggleY + outerR * 0.15, r * 0.14, 2.2, 0.5);
  ctx.fill();

  // 2. Arched Metallic Center Bridge
  ctx.strokeStyle = '#323E45';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(leftX + outerR * 0.65, goggleY);
  ctx.quadraticCurveTo(0, goggleY + r * 0.05, rightX - outerR * 0.65, goggleY);
  ctx.stroke();

  ctx.strokeStyle = '#B2C0C7';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(leftX + outerR * 0.65, goggleY);
  ctx.quadraticCurveTo(0, goggleY + r * 0.05, rightX - outerR * 0.65, goggleY);
  ctx.stroke();

  // 3. Eyepiece Circular Metallic Rims (Double Bevel) & Moss-Green Lenses
  const goggleCenters = [leftX, rightX];
  for (const cx of goggleCenters) {
    // Outer Beveled Steel Rim
    const rimGrad = ctx.createLinearGradient(cx - outerR, goggleY - outerR, cx + outerR, goggleY + outerR);
    rimGrad.addColorStop(0, '#DDE6EA');
    rimGrad.addColorStop(0.4, '#A0B0B8');
    rimGrad.addColorStop(1, '#5C6C75');

    ctx.fillStyle = rimGrad;
    ctx.strokeStyle = '#20292F';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, goggleY, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Shadow Ring
    ctx.strokeStyle = '#435158';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, goggleY, outerR * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Moss-Green / Chartreuse Tinted Optical Glass Lens
    const lensGrad = ctx.createLinearGradient(cx - innerR * 0.5, goggleY - innerR * 0.8, cx + innerR * 0.8, goggleY + innerR * 0.8);
    if (isOvertime) {
      lensGrad.addColorStop(0, '#E4FF88');
      lensGrad.addColorStop(0.5, '#A4E03C');
      lensGrad.addColorStop(1, '#4A8018');
    } else {
      lensGrad.addColorStop(0, '#C2E576');
      lensGrad.addColorStop(0.45, '#7BA638');
      lensGrad.addColorStop(1, '#2E4815');
    }

    ctx.fillStyle = lensGrad;
    ctx.strokeStyle = '#182410';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, goggleY, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Curved Glass Reflection Glare (Upper-Right Crescent Glint)
    ctx.fillStyle = isOvertime ? 'rgba(255, 255, 220, 0.90)' : 'rgba(235, 255, 185, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, goggleY, innerR * 0.78, -Math.PI * 0.45, -Math.PI * 0.05);
    ctx.lineTo(cx + innerR * 0.45, goggleY - innerR * 0.25);
    ctx.arc(cx, goggleY, innerR * 0.45, -Math.PI * 0.05, -Math.PI * 0.45, true);
    ctx.closePath();
    ctx.fill();

    // Secondary subtle bottom-left corner reflection point
    ctx.fillStyle = 'rgba(210, 245, 150, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - innerR * 0.45, goggleY + innerR * 0.45, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // E. HAIR — SIGNATURE 7:3 SIDE-PART BLONDE HAIR (-Y Top Hemisphere — Rule 19)
  const hairBlonde = '#E5B25D';
  const hairHighlight = '#FDE68A';
  const hairShadow = '#B47B2A';

  // Hair Base Mesh (Clean side-parting on right at x = r * 0.35, sweeping across forehead)
  ctx.fillStyle = hairBlonde;
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r, -r * 0.15); // Right side hair lock

  // Curving stylized 7:3 fringe bangs sweeping from right part to left
  for (let i = 0; i < _BANGS_COORDS.length; i++) {
    const pt = _BANGS_COORDS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.closePath();
  ctx.fill();

  // Hair Strand Highlights & Texture
  ctx.strokeStyle = hairHighlight;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  // Part highlight
  ctx.moveTo(r * 0.35, -r * 0.90);
  ctx.quadraticCurveTo(r * 0.15, -r * 0.50, -r * 0.20, -r * 0.25);
  // Upper sweep highlight
  ctx.moveTo(r * 0.25, -r * 0.82);
  ctx.quadraticCurveTo(-r * 0.10, -r * 0.60, -r * 0.55, -r * 0.22);
  ctx.stroke();

  // Hair Edge Crisp Outline
  ctx.strokeStyle = '#271A0B';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * _BANGS_COORDS[0].nx, r * _BANGS_COORDS[0].ny);
  for (let i = 1; i < _BANGS_COORDS.length; i++) {
    const pt = _BANGS_COORDS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.stroke();
  }

  ctx.restore(); // End clipped body circle

  // ── Bold Black Body Outline ──
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Status overlays (stun, freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }
  if (!hideHandsAndWeapon && !hideFrontHand) {
    // 1. Draw Nanami's Wrapped Blunt Cleaver
    const swingActive = isPunching;
    const swingTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    drawNanamiCleaver(ctx, frontX, frontY, 0, r, swingActive, swingTimer, rawProgress, {
      isRatioCharged: (fighter.ratioCritCharge || 0) > 0,
      isOvertime: isOvertime,
      isCollapseSlam: isCollapsing,
      isBlitzing: isBlitzing,
      blitzStrikeIndex: blitzIndex
    });

    // 2. Draw Front Hand with watch and natural skin tone gripping the handle
    _drawFist(ctx, frontX, frontY, handRadius, skinColor, fighter, false);
  }

  ctx.restore(); // End main transform
}
