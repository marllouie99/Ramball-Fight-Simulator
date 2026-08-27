// ─────────────────────────────────────────────
// Uryu Ishida Weapon Graphics: Ginrei Kojaku & Seele Schneider
// Quincy Spirit Particle Bow & High-Frequency Vibrating Blade
// Adhering to Rule 11 (Zero shadowBlur) & Rule 20 (Skin Only Guard)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

export const URYU_WEAPON_GRAPHICS = {
  bow: {
    coreCyan: '#00E5FF',
    brightWhite: '#FFFFFF',
    deepBlue: '#0052CC',
    glowCyan: 'rgba(0, 229, 255, 0.65)',
    silverMetal: '#E2E8F0',
    silverDark: '#64748B'
  },
  positioning: {
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    angleOffset: 0
  }
};

/**
 * Draws Ginrei Kojaku (Sacred Spirit Bow) and loaded Heilig Pfeil arrow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Front hand grip X in local space
 * @param {number} y - Front hand grip Y in local space
 * @param {number} r - Fighter body radius
 * @param {number} drawProgress - 0.0 (idle) to 1.0 (fully drawn string)
 * @param {Object} opts - Additional options (e.g. isDrawing, isVollstandig)
 */
export function drawUryuBow(ctx, x, y, r, drawProgress = 0, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const isVollstandig = Boolean(opts.isVollstandig);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(x, y);

  // Weapon customization offsets if configured in Weapon Studio
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.uryu)
    ? state.weaponCustomizations.uryu
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.translate(customOffsetX, customOffsetY);
  ctx.rotate(customAngle);
  ctx.scale(customScale, customScale);

  // ── TYBW WANDENREICH BROAD-BLADE SPIRIT BOW (HEILIG BOGEN) ──
  const scale = isVollstandig ? 1.25 : 1.0;
  const R_center = r * 2.15 * scale; // Radius of circular bow arc (~54px)
  const centerX = - (R_center - r * 0.45); // Arc center behind the grip (~-43px)
  const bladeHW = r * 0.22 * scale; // Broad-blade half-width (~5.5px)
  const R_inner = R_center - bladeHW;
  const R_outer = R_center + bladeHW;

  const stemHW = 1.8;
  const needleHW = 1.3;

  // Key angles (in radians) along the circular arc
  const a_stem_start = 0.07; // Just above/below the central grip
  const a_stem_end   = 0.18; // Stepped shoulder expanding into broad blade
  const a_blade_end  = 0.88; // Stepped shoulder tapering into needle tip rod
  const a_tip_end    = 1.06; // Final needle tip where bowstring attaches

  // String nock endpoints
  const topTipX = centerX + R_center * Math.cos(-a_tip_end);
  const topTipY = R_center * Math.sin(-a_tip_end);
  const botTipX = centerX + R_center * Math.cos(a_tip_end);
  const botTipY = R_center * Math.sin(a_tip_end);

  // Smooth string draw physics with harmonic release recoil
  const recoilTimer = opts.recoilTimer || 0;
  const recoilMax = opts.recoilMax || 6;
  const recoilP = (recoilTimer > 0) ? (1.0 - recoilTimer / recoilMax) : 1.0;
  const recoilOffset = (recoilTimer > 0)
    ? Math.sin(recoilP * Math.PI * 3) * Math.exp(-recoilP * 3.2) * (r * 0.40)
    : 0;

  const maxDrawBackX = - (r * 1.65 + drawProgress * (r * 0.95));
  const restStringX = topTipX; // Natural straight resting line
  const clampedDraw = Math.min(1.0, Math.max(0.0, drawProgress));
  const drawBackX = restStringX + (maxDrawBackX - restStringX) * Math.pow(clampedDraw, 0.75) + recoilOffset;

  // ── 0. FLOATING AMBIENT REISHI SPARKLES (Frosted starlight aura) ──
  ctx.save();
  ctx.fillStyle = '#00E5FF';
  for (let p = 0; p < 6; p++) {
    const particlePhase = ((now * 0.002) + p * 1.1) % 1.0;
    const aP = a_stem_end + (a_blade_end - a_stem_end) * particlePhase;
    const dirP = (p % 2 === 0) ? -1 : 1;
    const rOffset = Math.sin(now * 0.003 + p * 2.3) * (bladeHW * 0.6);
    const px = centerX + (R_center + rOffset) * Math.cos(dirP * aP);
    const py = (R_center + rOffset) * Math.sin(dirP * aP);
    const pAlpha = Math.sin(particlePhase * Math.PI) * 0.85;
    ctx.globalAlpha = pAlpha;
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 1. REISHI ENERGY BOWSTRING (Straight Laser Beam) ──
  ctx.save();
  // Outer Cyan Spirit Glow
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.50)';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (clampedDraw <= 0.02 && recoilTimer <= 0) {
    // Pure straight laser string at rest
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(botTipX, botTipY);
  } else {
    // Drawn / vibrating V-shape
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
  }
  ctx.stroke();

  // Pure White-Hot Laser Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (clampedDraw <= 0.02 && recoilTimer <= 0) {
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(botTipX, botTipY);
  } else {
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
  }
  ctx.stroke();
  ctx.restore();

  // ── 2. LOADED HEILIG PFEIL (SACRED ARROW) ──
  if (clampedDraw > 0.08 || opts.isAiming) {
    const arrowAlpha = Math.min(1.0, (clampedDraw - 0.08) / 0.25);
    const arrowLen = Math.abs(drawBackX) + r * 1.85 + drawProgress * 10;
    const arrowTipX = drawBackX + arrowLen;

    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * arrowAlpha;

    // A. Arrow Outer Spirit Aura
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.60)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(drawBackX, 0);
    ctx.lineTo(arrowTipX, 0);
    ctx.stroke();

    // B. White-Hot Energy Shaft Core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(drawBackX, 0);
    ctx.lineTo(arrowTipX, 0);
    ctx.stroke();

    // C. Reishi Energy Spiral Helix around shaft
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    const spirals = 8;
    for (let s = 0; s < spirals; s++) {
      const sx = drawBackX + (s / spirals) * (arrowTipX - drawBackX);
      const phase1 = ((now * 0.007) + s * 0.85) % (Math.PI * 2);
      const sy1 = Math.sin(phase1) * 2.8;
      if (s === 0) ctx.moveTo(sx, sy1);
      else ctx.lineTo(sx, sy1);
    }
    ctx.stroke();

    // D. Diamond Reishi Arrowhead
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(arrowTipX + 10, 0);
    ctx.lineTo(arrowTipX - 4.5, -4.5);
    ctx.lineTo(arrowTipX - 1.5, 0);
    ctx.lineTo(arrowTipX - 4.5, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // E. 4-Pointed Cruciform Reishi Flare at Arrowhead
    const flarePulse = 0.75 + Math.sin(now * 0.01) * 0.25;
    ctx.strokeStyle = `rgba(255, 255, 255, ${flarePulse.toFixed(2)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(arrowTipX + 4, 0);
    ctx.lineTo(arrowTipX + 13, 0);
    ctx.moveTo(arrowTipX + 8, -4.5);
    ctx.lineTo(arrowTipX + 8, 4.5);
    ctx.stroke();

    // F. Sacred Spirit Spark Fletching at Nock
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(drawBackX + 2, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(drawBackX + 2, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── 3. CIRCULAR ARC BROAD-BLADE CRYSTAL LIMBS (TOP & BOTTOM) ──
  const drawArcLimb = (isTop) => {
    const dir = isTop ? -1 : 1;
    ctx.save();

    // Build the clean circular arc polygon with stepped shoulders
    const buildArcLimbPath = () => {
      ctx.beginPath();

      if (isTop) {
        // TOP LIMB: Angles are negative (-a), counter-clockwise = going up (-Y), clockwise = going down (+Y)
        // 1. Start at inner stem base
        ctx.arc(centerX, 0, R_center - stemHW, -a_stem_start, -a_stem_end, true);
        // 2. Step shoulder out to broad blade inner radius
        ctx.arc(centerX, 0, R_inner, -a_stem_end, -a_blade_end, true);
        // 3. Step shoulder in to needle rod inner radius
        ctx.arc(centerX, 0, R_center - needleHW, -a_blade_end, -a_tip_end, true);
        // 4. Tip cap across to outer needle radius
        ctx.arc(centerX, 0, R_center + needleHW, -a_tip_end, -a_blade_end, false);
        // 5. Step shoulder out to broad blade outer radius
        ctx.arc(centerX, 0, R_outer, -a_blade_end, -a_stem_end, false);
        // 6. Step shoulder in to stem outer radius
        ctx.arc(centerX, 0, R_center + stemHW, -a_stem_end, -a_stem_start, false);
      } else {
        // BOTTOM LIMB: Angles are positive (+a), clockwise = going down (+Y), counter-clockwise = going up (-Y)
        // 1. Start at inner stem base
        ctx.arc(centerX, 0, R_center - stemHW, a_stem_start, a_stem_end, false);
        // 2. Step shoulder out to broad blade inner radius
        ctx.arc(centerX, 0, R_inner, a_stem_end, a_blade_end, false);
        // 3. Step shoulder in to needle rod inner radius
        ctx.arc(centerX, 0, R_center - needleHW, a_blade_end, a_tip_end, false);
        // 4. Tip cap across to outer needle radius
        ctx.arc(centerX, 0, R_center + needleHW, a_tip_end, a_blade_end, true);
        // 5. Step shoulder out to broad blade outer radius
        ctx.arc(centerX, 0, R_outer, a_blade_end, a_stem_end, true);
        // 6. Step shoulder in to stem outer radius
        ctx.arc(centerX, 0, R_center + stemHW, a_stem_end, a_stem_start, true);
      }

      ctx.closePath();
    };

    // A. Outer Radiant Cyan Spirit Glow Shell (Zero shadowBlur - Rule 11)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 5.5;
    ctx.lineJoin = 'miter';
    buildArcLimbPath();
    ctx.stroke();

    // B. Frosted Sparkling Crystal Broad-Blade Body (Gradient Fill)
    const midAngle = dir * (a_stem_end + a_blade_end) * 0.5;
    const gradStartX = centerX + R_inner * Math.cos(dir * a_stem_end);
    const gradStartY = R_inner * Math.sin(dir * a_stem_end);
    const gradEndX = centerX + R_outer * Math.cos(midAngle);
    const gradEndY = R_outer * Math.sin(midAngle);

    const bladeGrad = ctx.createLinearGradient(gradStartX, gradStartY, gradEndX, gradEndY);
    bladeGrad.addColorStop(0, '#FFFFFF');
    bladeGrad.addColorStop(0.20, '#67E8F9');
    bladeGrad.addColorStop(0.60, '#00E5FF');
    bladeGrad.addColorStop(0.90, '#0284C7');
    bladeGrad.addColorStop(1.0, '#38BDF8');

    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.4;
    buildArcLimbPath();
    ctx.fill();
    ctx.stroke();

    // C. Internal Frosted Crystalline Starlight Sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    for (let k = 0; k < 6; k++) {
      const spFrac = 0.15 + k * 0.14;
      const spA = dir * (a_stem_end + (a_blade_end - a_stem_end) * spFrac);
      const spR = R_center + Math.sin(now * 0.0035 + k * 1.8) * (bladeHW * 0.45);
      const spX = centerX + spR * Math.cos(spA);
      const spY = spR * Math.sin(spA);
      const spPulse = Math.sin(now * 0.006 + k * 1.3) * 0.35 + 0.65;
      ctx.beginPath();
      ctx.arc(spX, spY, 1.0 * spPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. Pure White Central Energy Light Spine (Concentric circle arc)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isTop) {
      ctx.arc(centerX, 0, R_center, -a_stem_start, -a_tip_end, true);
    } else {
      ctx.arc(centerX, 0, R_center, a_stem_start, a_tip_end, false);
    }
    ctx.stroke();

    // E. Slender Needle Tip Energy Nock Glint
    const tipX = isTop ? topTipX : botTipX;
    const tipY = isTop ? topTipY : botTipY;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Draw Upper & Lower Broad-Blade Crystal Limbs
  drawArcLimb(true);
  drawArcLimb(false);

  // ── 4. SILVER QUINCY CROSS CENTER GRIP ──
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-2.8, -6, 5.6, 12, 1.4);
  ctx.fill();
  ctx.stroke();

  // Central Gemstone Core
  ctx.fillStyle = '#00E5FF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Core Glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-0.5, -0.5, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Seele Schneider (vibrating spirit blade for melee intercept).
 */
export function drawSeeleSchneider(ctx, x, y, r, swingProgress = 0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(x, y);

  // Swing rotational angle
  const swingAngle = (swingProgress > 0)
    ? -0.8 + swingProgress * 1.6
    : 0.35;
  ctx.rotate(swingAngle);

  const bladeLen = r * 1.9;

  // 1. Handle & Silver Reishi Tube Base
  ctx.fillStyle = '#64748B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-2.5, -3, 5, 16, 1.5);
  ctx.fill();
  ctx.stroke();

  // Silver tube bottom cap
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.arc(0, 13, 3, 0, Math.PI * 2);
  ctx.fill();

  // 2. Vibrating Spirit Blade (3M RPM Saw-Tooth Visual)
  const vibration = (Math.sin(now * 0.08) * 0.8);

  // Cyan outer aura
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Main cyan blade
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // White core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Vibrating edge notches
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 6; i++) {
    const toothY = -8 - i * (bladeLen / 7) + vibration;
    ctx.beginPath();
    ctx.moveTo(-2, toothY);
    ctx.lineTo(2, toothY - 2);
    ctx.stroke();
  }

  // Sharp tip point
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -bladeLen - 4);
  ctx.lineTo(3, -bladeLen + 2);
  ctx.lineTo(-3, -bladeLen + 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
