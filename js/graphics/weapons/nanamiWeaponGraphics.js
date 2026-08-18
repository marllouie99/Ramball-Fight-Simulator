// ─────────────────────────────────────────────
// Nanami Weapon Graphics: Authentic 7:3 Blunt Cleaver
// Heavy rectangular blade fully wrapped in spotted cloth with ergonomic black 3-rivet handle.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

export const NANAMI_WEAPON_GRAPHICS = {
  blade: {
    handleBase: '#1F2024',
    handleHighlight: '#33353D',
    handleEdge: '#0D0E11',
    rivetSilver: '#CBD5E1',
    rivetCore: '#111215',
    clothBase: '#F8FAFC',
    clothShade: '#E2E8F0',
    clothSeam: '#94A3B8',
    clothSpot: '#181A1D'
  },
  positioning: {
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    angleOffset: 0
  }
};

// Pre-computed organic splotches across the full blade surface (eliminates per-frame GC allocations)
// Y-coordinates distributed across [topY + 2, bladeBottomY - 2] = [-2.25, 15.75]
const _CLEAVER_SPLOTCHES = [
  // Strip 1 (near heel, x ~ 4..12)
  { x: 4.5, y: 0.75, rx: 2.4, ry: 1.8, rot: 0.3 },
  { x: 9.0, y: 5.25, rx: 3.4, ry: 2.6, rot: -0.2 },
  { x: 4.0, y: 10.25, rx: 2.2, ry: 2.8, rot: 0.1 },
  { x: 8.5, y: 15.25, rx: 3.6, ry: 2.4, rot: 0.4 },
  { x: 12.0, y: -0.75, rx: 2.8, ry: 2.0, rot: -0.3 },
  { x: 6.5, y: 7.25, rx: 1.4, ry: 1.2, rot: 0.0 },

  // Strip 2 (x ~ 13..21)
  { x: 16.5, y: 3.25, rx: 4.0, ry: 3.0, rot: 0.2 },
  { x: 14.0, y: 11.25, rx: 2.8, ry: 3.2, rot: -0.4 },
  { x: 19.5, y: 14.25, rx: 3.2, ry: 2.4, rot: 0.1 },
  { x: 20.5, y: -1.25, rx: 2.6, ry: 2.0, rot: 0.5 },
  { x: 17.0, y: 8.25, rx: 2.0, ry: 1.6, rot: 0.0 },
  { x: 13.5, y: 5.75, rx: 1.5, ry: 1.4, rot: 0.2 },

  // Strip 3 (x ~ 22..30)
  { x: 25.5, y: 0.25, rx: 3.6, ry: 2.8, rot: -0.2 },
  { x: 23.0, y: 5.75, rx: 2.4, ry: 2.0, rot: 0.3 },
  { x: 27.5, y: 10.25, rx: 4.2, ry: 3.2, rot: 0.2 },
  { x: 24.5, y: 15.25, rx: 2.8, ry: 2.2, rot: -0.1 },
  { x: 29.5, y: -1.25, rx: 3.2, ry: 2.4, rot: 0.4 },
  { x: 28.0, y: 5.25, rx: 1.6, ry: 1.4, rot: 0.1 },

  // Strip 4 (7:3 Ratio Zone, x ~ 31..39)
  { x: 34.5, y: 2.75, rx: 3.8, ry: 3.0, rot: 0.1 },
  { x: 32.0, y: 9.25, rx: 3.0, ry: 3.4, rot: -0.3 },
  { x: 37.5, y: 13.25, rx: 3.6, ry: 2.6, rot: 0.3 },
  { x: 38.5, y: -0.75, rx: 2.8, ry: 2.2, rot: -0.2 },
  { x: 35.5, y: 7.25, rx: 2.1, ry: 1.7, rot: 0.2 },
  { x: 31.0, y: -0.25, rx: 1.5, ry: 1.3, rot: 0.0 },

  // Strip 5 (x ~ 40..48)
  { x: 43.5, y: 0.25, rx: 3.4, ry: 2.6, rot: 0.4 },
  { x: 41.0, y: 6.25, rx: 2.6, ry: 2.3, rot: -0.1 },
  { x: 45.5, y: 11.25, rx: 4.0, ry: 3.0, rot: 0.2 },
  { x: 43.5, y: 15.25, rx: 2.6, ry: 2.0, rot: -0.3 },
  { x: 47.5, y: -1.25, rx: 2.9, ry: 2.2, rot: 0.1 },
  { x: 46.5, y: 5.75, rx: 1.7, ry: 1.5, rot: 0.3 },

  // Strip 6 (tip zone, x ~ 49..53)
  { x: 51.5, y: 2.25, rx: 3.2, ry: 2.8, rot: -0.2 },
  { x: 50.0, y: 9.25, rx: 2.8, ry: 3.2, rot: 0.3 },
  { x: 52.5, y: 14.25, rx: 3.0, ry: 2.4, rot: 0.0 },
  { x: 51.5, y: -1.75, rx: 2.4, ry: 2.0, rot: 0.2 }
];

/**
 * Draws Nanami's signature Blunt Cleaver (Dull Chopping Blade fully wrapped in spotted cloth).
 * Supports standard swing animations, Weapon Studio transforms, and skin-only guards.
 */
export function drawNanamiCleaver(ctx, x, y, gunAngle, r, swingActive = false, swingTimer = 0, swingProgress = 0, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.nanami)
    ? state.weaponCustomizations.nanami
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(gunAngle + customAngle);
  ctx.scale(customScale, customScale);

  // Weapon dimensions
  const bladeLength = 54;
  const bladeWidth = 22;
  const gripLength = 22;
  const gripHeight = 8.5;

  // Shared Top Spine Alignment (Handle top and blade top form a continuous flush line)
  const topY = -gripHeight * 0.5;                // -4.25
  const gripBottomY = gripHeight * 0.5;           // +4.25
  const bladeBottomY = topY + bladeWidth;         // +17.75

  if (opts.isCollapseSlam || opts.isCollapsing) {
    let swingAngle = 0;
    if (swingProgress < 0.45) {
      // 1. Structural Windup: Rear back high overhead to -1.55 rad (~12 o'clock high)
      const t = swingProgress / 0.45;
      const easeWindup = Math.sin(t * (Math.PI / 2));
      swingAngle = -easeWindup * 1.55;
    } else {
      // 2. Heavy Ground Shatter Slam: -1.55 rad -> +1.25 rad ground impact
      const t = (swingProgress - 0.45) / 0.55;
      const easeSlam = Math.pow(t, 1.8);
      swingAngle = -1.55 + easeSlam * (1.25 - (-1.55));
    }
    ctx.rotate(swingAngle);
  } else if (opts.isBlitzing) {
    let swingAngle = 0;
    if (swingProgress < 0.45) {
      // Snappy Single Downward Chop: -1.25 rad -> +1.15 rad with high-velocity snap
      const t = swingProgress / 0.45;
      const easeChop = t * t * (3 - 2 * t);
      swingAngle = -1.25 + easeChop * (1.15 - (-1.25));
    } else {
      // Settle and hold firmly at the bottom of the chop — NEVER pull back up!
      const settleP = (swingProgress - 0.45) / 0.55;
      swingAngle = 1.15 - settleP * 0.03;
    }
    ctx.rotate(swingAngle);
  } else if (swingActive) {
    let swingAngle = 0;
    if (swingProgress < 0.12) {
      // 1. Smooth Anticipation Windup: 0.0 -> -1.05 rad
      const t = swingProgress / 0.12;
      const easeWindup = Math.sin(t * (Math.PI / 2));
      swingAngle = -easeWindup * 1.05;
    } else if (swingProgress < 0.60) {
      // 2. Power Stroke Downward Chop: -1.05 rad -> +1.10 rad with smooth cubic curve
      const t = (swingProgress - 0.12) / 0.48;
      const easeChop = t * t * (3 - 2 * t); // Smooth Hermite S-curve
      swingAngle = -1.05 + easeChop * (1.10 - (-1.05));
    } else {
      // 3. Fluid Follow-through & Recovery: +1.10 rad -> 0.0 rad back to guard
      const recP = (swingProgress - 0.60) / 0.40;
      const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI); // Cosine ease-out
      swingAngle = 1.10 * easeRec;
    }
    ctx.rotate(swingAngle);
  }

  // ─────────────────────────────────────────────
  // 1. ERGONOMIC MATTE BLACK HANDLE (x = -gripLength to 0)
  // Top edge aligned flush on the top with blade top spine
  // ─────────────────────────────────────────────
  ctx.fillStyle = NANAMI_WEAPON_GRAPHICS.blade.handleBase;
  ctx.strokeStyle = NANAMI_WEAPON_GRAPHICS.blade.handleEdge;
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  // Top straight handle spine (100% flush with blade top spine)
  ctx.moveTo(0, topY);
  ctx.lineTo(-gripLength * 0.70, topY);
  ctx.lineTo(-gripLength * 0.92, topY - 1.5); // Slight pommel lift
  // Rounded pommel flare
  ctx.quadraticCurveTo(-gripLength - 3.5, topY + 1.0, -gripLength - 2.5, gripBottomY + 2.5);
  ctx.lineTo(-gripLength * 0.90, gripBottomY + 3.0); // Pommel bottom flare
  // Ergonomic palm grip bottom contour
  ctx.quadraticCurveTo(-gripLength * 0.55, gripBottomY - 0.5, -gripLength * 0.30, gripBottomY);
  ctx.lineTo(0, gripBottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle handle spine highlight line
  ctx.strokeStyle = NANAMI_WEAPON_GRAPHICS.blade.handleHighlight;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-2, topY + 1.2);
  ctx.lineTo(-gripLength * 0.65, topY + 1.2);
  ctx.stroke();

  // 3 Steel Screws / Rivets along the handle center
  const rivetX = [-gripLength * 0.28, -gripLength * 0.58, -gripLength * 0.86];
  for (let i = 0; i < rivetX.length; i++) {
    const rx = rivetX[i];
    const ry = (i === 2) ? -0.5 : 0;

    // Outer silver steel rivet
    ctx.fillStyle = NANAMI_WEAPON_GRAPHICS.blade.rivetSilver;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner screw socket
    ctx.fillStyle = NANAMI_WEAPON_GRAPHICS.blade.rivetCore;
    ctx.beginPath();
    ctx.arc(rx, ry, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─────────────────────────────────────────────
  // 2. HEAVY CLEAVER BLADE WRAPPED IN SPOTTED CLOTH (x = 0 to bladeLength)
  // Top spine is flush with handle top; blade body drops down to bladeBottomY
  // ─────────────────────────────────────────────
  ctx.save();

  // Cleaver Path (Flush top spine, straight blunt nose, angled heel ramp)
  ctx.beginPath();
  ctx.moveTo(0, topY);                           // Top guard junction (flush with handle top)
  ctx.lineTo(bladeLength, topY);                  // Top straight spine
  ctx.lineTo(bladeLength, bladeBottomY);          // Blunt vertical nose
  ctx.lineTo(8, bladeBottomY);                    // Bottom straight edge
  ctx.lineTo(0, gripBottomY);                     // Angled heel cut directly to bottom of handle
  ctx.closePath();

  // Base Off-White Cloth Fill with subtle bottom-edge shadow gradient
  const clothGrad = ctx.createLinearGradient(0, topY, 0, bladeBottomY);
  clothGrad.addColorStop(0, '#FFFFFF');
  clothGrad.addColorStop(0.65, NANAMI_WEAPON_GRAPHICS.blade.clothBase);
  clothGrad.addColorStop(1, NANAMI_WEAPON_GRAPHICS.blade.clothShade);
  ctx.fillStyle = clothGrad;
  ctx.fill();

  // Clip all cloth patterns inside the cleaver body
  ctx.clip();

  // Diagonal Spiral Bandage Seams (tilted wrap bands)
  ctx.strokeStyle = NANAMI_WEAPON_GRAPHICS.blade.clothSeam;
  ctx.lineWidth = 1.0;
  const wrapSpacing = 8.5;
  const tiltOffset = 5.5;

  for (let sx = -wrapSpacing; sx <= bladeLength + wrapSpacing; sx += wrapSpacing) {
    ctx.beginPath();
    ctx.moveTo(sx + tiltOffset, topY - 2);
    ctx.lineTo(sx - tiltOffset, bladeBottomY + 2);
    ctx.stroke();
  }

  // Dense Organic Black Splotches across the whole blade
  ctx.fillStyle = NANAMI_WEAPON_GRAPHICS.blade.clothSpot;
  for (let i = 0; i < _CLEAVER_SPLOTCHES.length; i++) {
    const s = _CLEAVER_SPLOTCHES[i];
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // End clipped cleaver body

  // Crisp Dark Outer Cleaver Perimeter Stroke
  ctx.strokeStyle = '#0F1014';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(bladeLength, topY);
  ctx.lineTo(bladeLength, bladeBottomY);
  ctx.lineTo(8, bladeBottomY);
  ctx.lineTo(0, gripBottomY);
  ctx.lineTo(0, topY);
  ctx.closePath();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 3. OVERTIME GOLDEN CURSED ENERGY WRAP & 7:3 GLINT (STEADY)
  // ─────────────────────────────────────────────
  if (opts.isOvertime) {
    // Glowing Golden Edge Surge (Steady Crisp Outline)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, topY - 1);
    ctx.lineTo(bladeLength + 1, topY - 1);
    ctx.lineTo(bladeLength + 1, bladeBottomY + 1);
    ctx.lineTo(8, bladeBottomY + 1);
    ctx.lineTo(0, gripBottomY + 1);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (opts.isRatioCharged || opts.isOvertime) {
    const glintTime = Date.now() * 0.006;
    const glintX = bladeLength * 0.70; // Exact 7:3 ratio spot along blade length!
    const glintY = (topY + bladeBottomY) * 0.5;

    // Glowing golden diamond star on the 7:3 ratio point (Steady, Non-pulsing)
    ctx.save();
    ctx.translate(glintX, glintY);
    ctx.rotate(glintTime);

    const starSize = opts.isOvertime ? 6.5 : 5.0;
    ctx.fillStyle = opts.isOvertime ? 'rgba(255, 245, 160, 0.98)' : 'rgba(255, 230, 100, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, -starSize);
    ctx.lineTo(starSize * 0.35, -starSize * 0.35);
    ctx.lineTo(starSize, 0);
    ctx.lineTo(starSize * 0.35, starSize * 0.35);
    ctx.lineTo(0, starSize);
    ctx.lineTo(-starSize * 0.35, starSize * 0.35);
    ctx.lineTo(-starSize, 0);
    ctx.lineTo(-starSize * 0.35, -starSize * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  ctx.restore(); // end main weapon transform
}

/**
 * Draws Nanami's signature Golden 7:3 Crescent Slash Blade Arc (Rule 15 Compliant).
 * Rendered in world coordinates underneath the cleaver during active basic chops.
 */
export function drawNanamiCleaverSlashArc(ctx, fighter) {
  if (!fighter || fighter.slashSwingTimer <= 0) return;

  const maxT = fighter.slashSwingMaxTimer || 18;
  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));
  const isOvertime = fighter.isOvertimeActive;

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  const isBlitz = Boolean(fighter.isBlitzing);
  const strikeIdx = isBlitz ? (fighter.blitzStrikeIndex || 0) : 0;
  const isFinalStrike = isBlitz && (strikeIdx === ((fighter.blitzMaxStrikes || 4) - 1));

  // Arc angles in local coordinate space tailored per strike type
  let startOffset = -1.05;
  let endOffset   = 1.10;

  if (isBlitz) {
    if (strikeIdx === 0) {
      startOffset = -1.35;
      endOffset = 1.25;
    } else if (strikeIdx === 1) {
      startOffset = 1.30;
      endOffset = -1.35;
    } else if (strikeIdx === 2) {
      startOffset = -1.65;
      endOffset = 1.40;
    } else {
      startOffset = -1.80;
      endOffset = 1.55;
    }
  }

  let currentTipOffset = startOffset;
  let currentTailOffset = startOffset;
  let trailAlpha = 1.0;

  const windupCutoff = isBlitz ? 0.12 : 0.10;
  const cutCutoff = isBlitz ? (isFinalStrike ? 0.68 : 0.62) : 0.58;

  if (rawProgress < windupCutoff) {
    // Brief initial anticipation windup (trail hidden until cutting stroke begins)
    return;
  } else if (rawProgress < cutCutoff) {
    // Active Cutting Phase: crescent grows fluidly from start angle to end angle
    const t = (rawProgress - windupCutoff) / (cutCutoff - windupCutoff);
    const eased = t * t * (3 - 2 * t);
    currentTipOffset = startOffset + eased * (endOffset - startOffset);
    currentTailOffset = startOffset;
    trailAlpha = Math.sin(Math.min(1.0, t * 1.5) * (Math.PI / 2));
  } else {
    // Smooth Recovery Phase: Tip stays locked at final angle while tail chases tip to cleanly erase
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    const easedRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    currentTipOffset = endOffset;
    currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
    trailAlpha = Math.sin((1.0 - recP) * (Math.PI / 2));
  }

  if (trailAlpha <= 0.01 || Math.abs(currentTipOffset - currentTailOffset) < 0.04) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(baseAngle);

  // Inverted Spear / Cleaver sweep direction standard (Rule 15)
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const outerRadius = r + (isFinalStrike ? 74 : (isBlitz ? 62 : 56));
  const maxThick = isFinalStrike ? 32.0 : (isBlitz ? 26.0 : 24.0);
  const numSteps = 24;

  // 1. Draw Cursed Energy Outer Glow Arc (Black Flash Crimson during Blitz)
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.18) * (0.28 + 0.72 * t);
    const rad = outerRadius + taper * (isFinalStrike ? 7.0 : 4.5);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.18) * (0.28 + 0.72 * t);
    const rad = outerRadius - (maxThick * taper) - taper * 3.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = (isFinalStrike || isBlitz || isOvertime)
    ? `rgba(255, 215, 0, ${0.50 * trailAlpha})`
    : `rgba(212, 175, 55, ${0.38 * trailAlpha})`;
  ctx.fill();

  // 2. Draw Dense Core Crescent Polygon (Brilliant 7:3 Golden Core)
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.18) * (0.28 + 0.72 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.18) * (0.28 + 0.72 * t);
    const rad = outerRadius - (maxThick * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = (isFinalStrike || isBlitz || isOvertime)
    ? `rgba(255, 245, 140, ${0.95 * trailAlpha})`
    : `rgba(255, 230, 95, ${0.88 * trailAlpha})`;
  ctx.fill();

  // 3. Draw Sharp Razor White Cutting Edge Line
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.18) * (0.28 + 0.72 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = isFinalStrike
    ? `rgba(255, 255, 255, ${0.98 * trailAlpha})`
    : `rgba(255, 255, 255, ${0.96 * trailAlpha})`;
  ctx.lineWidth = isFinalStrike ? 2.4 : 1.8;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the 10-point Ratio Division Grid & 7:3 Golden Fracture Burst on Critical Impact.
 */
export function drawRatioGridImpact(ctx, impactX, impactY, impactAngle = 0, scale = 1.0, timer = 15, maxTimer = 15) {
  if (timer <= 0) return;
  const progress = 1.0 - (timer / maxTimer);
  const alpha = Math.max(0.0, 1.0 - progress);

  ctx.save();
  ctx.translate(impactX, impactY);
  ctx.rotate(impactAngle);
  ctx.scale(scale, scale);

  const rulerLen = 66;
  const halfLen = rulerLen / 2;

  // 1. Ratio Measurement Line
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.85 * alpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);
  ctx.lineTo(halfLen, 0);
  ctx.stroke();

  // 2. 10 Measurement Ticks across target (0 to 10)
  for (let i = 0; i <= 10; i++) {
    const tx = -halfLen + (i / 10) * rulerLen;
    const is7Point = (i === 7);
    const tickH = is7Point ? 12 : (i === 5 ? 8 : 5);

    ctx.strokeStyle = is7Point
      ? `rgba(255, 255, 255, ${0.98 * alpha})`
      : `rgba(212, 175, 55, ${0.70 * alpha})`;
    ctx.lineWidth = is7Point ? 2.0 : 1.1;

    ctx.beginPath();
    ctx.moveTo(tx, -tickH / 2);
    ctx.lineTo(tx, tickH / 2);
    ctx.stroke();

    // Golden 7:3 Starburst on the 7th tick
    if (is7Point) {
      ctx.save();
      ctx.translate(tx, 0);
      const starR = 6.5 * (1.0 + progress * 0.6);
      ctx.fillStyle = `rgba(255, 230, 100, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -starR);
      ctx.lineTo(starR * 0.3, -starR * 0.3);
      ctx.lineTo(starR, 0);
      ctx.lineTo(starR * 0.3, starR * 0.3);
      ctx.lineTo(0, starR);
      ctx.lineTo(-starR * 0.3, starR * 0.3);
      ctx.lineTo(-starR, 0);
      ctx.lineTo(-starR * 0.3, -starR * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 3. Golden Fracture Crack Lines radiating from 7:3 weak point
  const weakPointX = -halfLen + 0.70 * rulerLen;
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.90 * alpha})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(weakPointX, 0);
  ctx.lineTo(weakPointX + 11, -15 * (1.0 + progress * 0.4));
  ctx.moveTo(weakPointX, 0);
  ctx.lineTo(weakPointX + 12, 13 * (1.0 + progress * 0.4));
  ctx.moveTo(weakPointX, 0);
  ctx.lineTo(weakPointX - 9, -12 * (1.0 + progress * 0.4));
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the active 10-point Ratio Measurement Grid and 7:3 Targeting Crosshair on the locked enemy.
 */
export function drawRatioTargetingCrosshair(ctx, nanami, target) {
  if (!nanami || !target || target.isDead || target.hp <= 0) return;

  const dx = target.x - nanami.x;
  const dy = target.y - nanami.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.1) return;

  const isOvertime = nanami.isOvertimeActive;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const pulse = Math.sin(now * 0.007) * 0.5 + 0.5; // 0.0 to 1.0 smooth breathing
  const baseAlpha = isOvertime ? 1.0 : (0.80 + pulse * 0.20);

  const aimAngle = Math.atan2(dy, dx);
  const gridAngle = aimAngle + Math.PI / 2;
  const rulerLen = Math.max(56, target.r * 2.5);
  const halfLen = rulerLen / 2;

  // 1. Draw Cursed Energy Aim Projection Line from Nanami to target 7:3 point
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = isOvertime
    ? `rgba(255, 215, 0, ${0.40 * baseAlpha})`
    : `rgba(212, 175, 55, ${0.28 * baseAlpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(nanami.x, nanami.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 2. Target 10-Point Measurement Grid
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(gridAngle);

  // A. Dark Backing Drop Shadow for the Ruler (100% visible on white arenas)
  ctx.strokeStyle = `rgba(15, 23, 42, ${0.80 * baseAlpha})`;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);
  ctx.lineTo(halfLen, 0);
  ctx.stroke();

  // B. Glowing Golden Ruler Line
  ctx.strokeStyle = isOvertime
    ? `rgba(255, 235, 120, ${0.98 * baseAlpha})`
    : `rgba(255, 215, 0, ${0.92 * baseAlpha})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);
  ctx.lineTo(halfLen, 0);
  ctx.stroke();

  // C. 10 Division Ticks (0 through 10)
  for (let i = 0; i <= 10; i++) {
    const tx = -halfLen + (i / 10) * rulerLen;
    const is7Point = (i === 7);
    const tickH = is7Point ? 14 : (i === 5 ? 9 : 6);

    // Dark Backing Tick
    ctx.strokeStyle = `rgba(15, 23, 42, ${0.85 * baseAlpha})`;
    ctx.lineWidth = is7Point ? 3.8 : 2.4;
    ctx.beginPath();
    ctx.moveTo(tx, -tickH / 2);
    ctx.lineTo(tx, tickH / 2);
    ctx.stroke();

    // Glowing Foreground Tick
    ctx.strokeStyle = is7Point
      ? '#FFFFFF'
      : (isOvertime ? `rgba(255, 240, 150, ${0.95 * baseAlpha})` : `rgba(255, 215, 0, ${0.85 * baseAlpha})`);
    ctx.lineWidth = is7Point ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.moveTo(tx, -tickH / 2);
    ctx.lineTo(tx, tickH / 2);
    ctx.stroke();
  }

  // 3. 7:3 Ratio Targeting Crosshair Reticle on the 7th point
  const weakX = -halfLen + 0.70 * rulerLen;
  const weakY = 0;

  ctx.save();
  ctx.translate(weakX, weakY);
  ctx.rotate(-gridAngle); // Keep upright

  const reticleR = isOvertime ? 9.5 + pulse * 1.5 : 8.0 + pulse * 1.0;
  const bLen = 4.5;

  // Dark Backing for Bracket Corners
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-reticleR, -reticleR + bLen); ctx.lineTo(-reticleR, -reticleR); ctx.lineTo(-reticleR + bLen, -reticleR);
  ctx.moveTo(reticleR - bLen, -reticleR); ctx.lineTo(reticleR, -reticleR); ctx.lineTo(reticleR, -reticleR + bLen);
  ctx.moveTo(reticleR, reticleR - bLen); ctx.lineTo(reticleR, reticleR); ctx.lineTo(reticleR - bLen, reticleR);
  ctx.moveTo(-reticleR + bLen, reticleR); ctx.lineTo(-reticleR, reticleR); ctx.lineTo(-reticleR, reticleR - bLen);
  ctx.stroke();

  // Vibrant Gold Foreground Bracket Corners: [ + ]
  ctx.strokeStyle = isOvertime ? '#FFF08A' : '#FFD700';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-reticleR, -reticleR + bLen); ctx.lineTo(-reticleR, -reticleR); ctx.lineTo(-reticleR + bLen, -reticleR);
  ctx.moveTo(reticleR - bLen, -reticleR); ctx.lineTo(reticleR, -reticleR); ctx.lineTo(reticleR, -reticleR + bLen);
  ctx.moveTo(reticleR, reticleR - bLen); ctx.lineTo(reticleR, reticleR); ctx.lineTo(reticleR - bLen, reticleR);
  ctx.moveTo(-reticleR + bLen, reticleR); ctx.lineTo(-reticleR, reticleR); ctx.lineTo(-reticleR, reticleR - bLen);
  ctx.stroke();

  // Rotating Golden Diamond at Center
  ctx.save();
  ctx.rotate(now * 0.003);
  ctx.fillStyle = isOvertime ? '#FFFBEB' : '#FFD700';
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -3.2);
  ctx.lineTo(3.2, 0);
  ctx.lineTo(0, 3.2);
  ctx.lineTo(-3.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Central Pure White Dot
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Animated Expanding Pulse Radar Ring
  const ringProgress = (now * 0.0022) % 1.0;
  const ringR = 4 + ringProgress * 14;
  const ringAlpha = (1.0 - ringProgress) * 0.8 * baseAlpha;
  ctx.strokeStyle = isOvertime ? `rgba(255, 235, 120, ${ringAlpha})` : `rgba(255, 215, 0, ${ringAlpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // '7:3' Bold Badge Label
  ctx.font = 'bold 10px Outfit, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3.0;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.strokeText('7:3', 0, -reticleR - 3);
  ctx.fillStyle = isOvertime ? '#FFF08A' : '#FFD700';
  ctx.fillText('7:3', 0, -reticleR - 3);

  ctx.restore(); // restore reticle transform
  ctx.restore(); // restore target grid transform
}

/**
 * Floating watch badge disabled per design request:
 * The watch clockface is cleanly and authentically grounded directly on the arena floor underneath Nanami (zero floating objects).
 */
export function drawOvertimeWatchBadge(ctx, nanami) {
  // Grounded watch clockface is rendered directly inside drawNanamiCursedEnergyAura
  return;
}

/**
 * Draws the Overtime shockwave dispersion wave bursting from basic chops.
 */
export function drawNanamiCleaveShockwave(ctx, x, y, angle, radius = 95, timer = 12, maxTimer = 12) {
  if (timer <= 0) return;
  const progress = 1.0 - (timer / maxTimer);
  const alpha = Math.max(0, 1.0 - progress);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const curR = 25 + progress * (radius - 25);
  const arc = (140 * Math.PI) / 180;

  // Outer Golden Shockwave Arc
  ctx.beginPath();
  ctx.arc(0, 0, curR, -arc / 2, arc / 2);
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.85 * alpha})`;
  ctx.lineWidth = 2.5 * (1.0 - progress * 0.5);
  ctx.stroke();

  // Inner White-Hot Core Arc
  ctx.beginPath();
  ctx.arc(0, 0, curR - 3, -arc / 2.3, arc / 2.3);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.lineWidth = 1.2 * (1.0 - progress * 0.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Nanami's Skill 2: Collapse (Tōka) Ground-Shatter Shockwave, Radiating Cracks & Concrete Debris.
 * Strict Rule 11 (No shadowBlur) & High-Performance Vector Rendering.
 */
export function drawNanamiCollapseShockwaves(ctx, fighter) {
  if (!fighter || !fighter.collapseShockwaves || fighter.collapseShockwaves.length === 0) return;

  for (let i = 0; i < fighter.collapseShockwaves.length; i++) {
    const sw = fighter.collapseShockwaves[i];
    if (!sw || sw.timer <= 0) continue;

    const progress = 1.0 - (sw.timer / (sw.maxTimer || 45));
    const alpha = Math.max(0, 1.0 - progress);
    const easeOut = 1.0 - Math.pow(1.0 - progress, 2.5);
    const curRadius = sw.radius * easeOut;

    ctx.save();
    ctx.translate(sw.x, sw.y);

    // 1. Structural Ground Fissure Cracks (radiating from center)
    if (sw.cracks && sw.cracks.length > 0) {
      ctx.strokeStyle = `rgba(35, 30, 20, ${0.85 * alpha})`;
      ctx.lineWidth = 2.4 * (1.0 - progress * 0.4);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let c = 0; c < sw.cracks.length; c++) {
        const segs = sw.cracks[c];
        if (!segs || segs.length === 0) continue;
        ctx.moveTo(0, 0);
        for (let s = 0; s < segs.length; s++) {
          const segProgress = (s + 1) / segs.length;
          if (segProgress <= easeOut * 1.2) {
            ctx.lineTo(segs[s].x, segs[s].y);
          }
        }
      }
      ctx.stroke();

      // Golden Cursed Energy Fissure Core Glow (Concentric line without shadowBlur)
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.75 * alpha})`;
      ctx.lineWidth = 1.2 * (1.0 - progress * 0.4);
      ctx.beginPath();
      for (let c = 0; c < sw.cracks.length; c++) {
        const segs = sw.cracks[c];
        if (!segs || segs.length === 0) continue;
        ctx.moveTo(0, 0);
        for (let s = 0; s < segs.length; s++) {
          const segProgress = (s + 1) / segs.length;
          if (segProgress <= easeOut * 1.2) {
            ctx.lineTo(segs[s].x, segs[s].y);
          }
        }
      }
      ctx.stroke();
    }

    // 2. Expanding Ground Shockwave Rings
    if (curRadius > 5) {
      // Outer Golden Shockwave Ring
      ctx.beginPath();
      ctx.arc(0, 0, curR(curRadius), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.70 * alpha})`;
      ctx.lineWidth = 3.5 * (1.0 - progress * 0.6);
      ctx.stroke();

      // Inner White-Hot Compression Shockwave Ring
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, curRadius - 4), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * alpha})`;
      ctx.lineWidth = 1.6 * (1.0 - progress * 0.6);
      ctx.stroke();

      // Faint Concrete Dust Perimeter Ring
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, curRadius * 0.85), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 150, 130, ${0.40 * alpha})`;
      ctx.lineWidth = 5.0 * (1.0 - progress * 0.5);
      ctx.stroke();
    }

    // 3. High-Velocity Concrete Rubble & Debris Chunks
    if (sw.debris && sw.debris.length > 0) {
      for (let d = 0; d < sw.debris.length; d++) {
        const deb = sw.debris[d];
        ctx.save();
        ctx.translate(deb.x, deb.y);
        ctx.rotate(deb.rotation || 0);

        const sz = deb.size || 4;
        ctx.fillStyle = `rgba(60, 55, 50, ${0.90 * alpha})`;
        ctx.strokeStyle = `rgba(25, 22, 20, ${0.95 * alpha})`;
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        if (deb.shape === 0) {
          // Irregular Polygon Rock
          ctx.moveTo(-sz, -sz * 0.6);
          ctx.lineTo(sz * 0.8, -sz * 0.9);
          ctx.lineTo(sz, sz * 0.5);
          ctx.lineTo(-sz * 0.4, sz);
        } else if (deb.shape === 1) {
          // Quad Fragment
          ctx.moveTo(-sz * 0.8, -sz * 0.8);
          ctx.lineTo(sz * 0.9, -sz * 0.5);
          ctx.lineTo(sz * 0.7, sz * 0.9);
          ctx.lineTo(-sz * 0.9, sz * 0.6);
        } else {
          // Sharp Triangular Shard
          ctx.moveTo(0, -sz * 1.1);
          ctx.lineTo(sz * 0.8, sz * 0.8);
          ctx.lineTo(-sz * 0.8, sz * 0.6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Highlight edge on rock
        ctx.strokeStyle = `rgba(180, 175, 160, ${0.75 * alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-sz * 0.5, -sz * 0.5);
        ctx.lineTo(sz * 0.4, -sz * 0.7);
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();
  }
}

/**
 * Draws Nanami's live Ultimate Black Flash activation spatial aura (Rule 11/16 compliant).
 * Renders swirling dark crimson spatial distortion rifts and jagged Black Flash lightning needle polygons.
 */
export function drawNanamiBlackFlashActivationAura(ctx, fighter) {
  // Red activation aura disabled
  return;
}

function curR(r) {
  return Math.max(0.1, r);
}



