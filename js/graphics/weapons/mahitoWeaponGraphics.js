// ─────────────────────────────────────────────
// MAHITO WEAPON & MORPH GRAPHICS
// Idle Transfiguration: Giant Blade & Spiked Mace Morphs
// Adheres strictly to:
// - Rule #11: Zero shadowBlur CPU filters
// - Rule #15 & #16: Sharp needle-tapered polygons & crisp crescent curves
// - Rule #19 & #20: Upright camera POV & state.showSkinOnly guards
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// ── Pre-allocated Static Buffers (Zero per-frame heap allocations) ──
const _clawFlamePts = Array.from({ length: 10 }, () => ({ x: 0, y: 0 }));
const _fleshLoopLeft = [];
const _fleshLoopRight = [];
const _surgeHumpPoints = [];
const _maceSplinePoints = [];
const _scissorLeftPoints = [];
const _scissorRightPoints = [];

const _T_VALS_2 = [0.28, 0.72];
const _T_VALS_3 = [0.22, 0.38, 0.80];

const _mappedBlades = [
  { idx: 0, knuckleX: 0, knuckleY: 0, fanAngle: 0, length: 0, heelWidth: 0, topArchY: 0, tipY: 0 },
  { idx: 1, knuckleX: 0, knuckleY: 0, fanAngle: 0, length: 0, heelWidth: 0, topArchY: 0, tipY: 0 },
  { idx: 2, knuckleX: 0, knuckleY: 0, fanAngle: 0, length: 0, heelWidth: 0, topArchY: 0, tipY: 0 },
  { idx: 3, knuckleX: 0, knuckleY: 0, fanAngle: 0, length: 0, heelWidth: 0, topArchY: 0, tipY: 0 }
];
const _orderedBlades = [null, null, null, null];

/**
 * Helper: Draws authentic anime surgical suture lines with paired bold cross-stitches / staples.
 * Batched for 60 FPS performance.
 */
function drawSuture(ctx, x1, y1, x2, y2, stitchCount = 4, crossH = 3.6, color = '#000000') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const snx = -dy / len;
  const sny =  dx / len;

  // 1. Incision Cut Line
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  const midX = (x1 + x2) / 2 + snx * (len * 0.10);
  const midY = (y1 + y2) / 2 + sny * (len * 0.10);
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(midX, midY, x2, y2);
  ctx.stroke();

  // 2. Cross-Stitches (Batched path)
  ctx.lineWidth = 2.0;
  const tValues = (stitchCount === 2) ? _T_VALS_2 : _T_VALS_3;

  ctx.beginPath();
  for (let i = 0; i < tValues.length; i++) {
    const t = tValues[i];
    const mt = 1 - t;
    const px = mt * mt * x1 + 2 * mt * t * midX + t * t * x2;
    const py = mt * mt * y1 + 2 * mt * t * midY + t * t * y2;

    const tdx = 2 * (1 - t) * (midX - x1) + 2 * t * (x2 - midX);
    const tdy = 2 * (1 - t) * (midY - y1) + 2 * t * (y2 - midY);
    const tlen = Math.hypot(tdx, tdy) || 1;
    const nx = -tdy / tlen;
    const ny =  tdx / tlen;

    ctx.moveTo(px - nx * crossH, py - ny * crossH);
    ctx.lineTo(px + nx * crossH, py + ny * crossH);
  }
  ctx.stroke();

  // Puncture knots (Batched fill)
  ctx.beginPath();
  for (let i = 0; i < tValues.length; i++) {
    const t = tValues[i];
    const mt = 1 - t;
    const px = mt * mt * x1 + 2 * mt * t * midX + t * t * x2;
    const py = mt * mt * y1 + 2 * mt * t * midY + t * t * y2;

    const tdx = 2 * (1 - t) * (midX - x1) + 2 * t * (x2 - midX);
    const tdy = 2 * (1 - t) * (midY - y1) + 2 * t * (y2 - midY);
    const tlen = Math.hypot(tdx, tdy) || 1;
    const nx = -tdy / tlen;
    const ny =  tdx / tlen;

    ctx.arc(px - nx * crossH, py - ny * crossH, 0.8, 0, Math.PI * 2);
    ctx.arc(px + nx * crossH, py + ny * crossH, 0.8, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Mahito's 4-Blade Needle Claw Morph in authentic 3D Side-Profile Perspective.
 * High-performance optimized.
 */
function drawClawMorphArm(ctx, r, handX, handY, isTransformed, progress, isRightPunch, fighter) {
  const cfg = CONFIG.mahito || {};
  const baseClawScale = isTransformed ? 0.90 : 0.70;
  const customScale = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.weaponScale !== undefined) ? state.weaponCustomizations.mahito.weaponScale : 1.0;
  const clawScale = baseClawScale * customScale;
  const handRadius = 7.0 * customScale;

  // 1. Snappy Rotational Chop/Slash Dynamics
  let swingAngle = 0;
  let isSlashing = false;
  let slashProgress = 0;
  let recoveryProgress = 0;

  if (progress < 0.08) {
    const p = progress / 0.08;
    const snapUp = Math.sin(p * Math.PI * 0.5);
    swingAngle = -0.30 - 0.90 * snapUp;
  } else if (progress < 0.44) {
    isSlashing = true;
    slashProgress = (progress - 0.08) / 0.36;
    const snapWhip = 1.0 - Math.pow(1.0 - slashProgress, 3.2);
    swingAngle = -1.20 + 2.40 * snapWhip;
  } else if (progress < 0.54) {
    isSlashing = true;
    slashProgress = 1.0;
    swingAngle = 1.20;
  } else {
    recoveryProgress = (progress - 0.54) / 0.46;
    const easedRec = recoveryProgress * recoveryProgress * (3 - 2 * recoveryProgress);
    swingAngle = 1.20 - 0.85 * easedRec;
  }

  ctx.save();
  ctx.translate(handX, handY);
  if (!isRightPunch) {
    ctx.scale(1, -1);
  }
  ctx.rotate(swingAngle);

  // 2. Billowing Cursed Energy Flame Aura behind Knuckles & Hand (Zero shadowBlur, Rule #11)
  const now = Date.now() * 0.005;
  ctx.save();
  ctx.translate(-handRadius * 0.3, 0);

  const ceRadius = handRadius * 2.6;
  const numFlamePts = 10;
  for (let i = 0; i < numFlamePts; i++) {
    const ang = (Math.PI * 2 / numFlamePts) * i;
    const wave = Math.sin(now * 3.2 + i * 1.6) * (handRadius * 0.4);
    const stretch = Math.cos(ang) > 0.1 ? handRadius * 0.8 : -handRadius * 0.3;
    const curR = ceRadius + wave + stretch;
    _clawFlamePts[i].x = Math.cos(ang) * curR;
    _clawFlamePts[i].y = Math.sin(ang) * curR;
  }

  ctx.beginPath();
  let fmx = (_clawFlamePts[numFlamePts - 1].x + _clawFlamePts[0].x) / 2;
  let fmy = (_clawFlamePts[numFlamePts - 1].y + _clawFlamePts[0].y) / 2;
  ctx.moveTo(fmx, fmy);
  for (let i = 0; i < numFlamePts; i++) {
    const nextIdx = (i + 1) % numFlamePts;
    const midX = (_clawFlamePts[i].x + _clawFlamePts[nextIdx].x) / 2;
    const midY = (_clawFlamePts[i].y + _clawFlamePts[nextIdx].y) / 2;
    ctx.quadraticCurveTo(_clawFlamePts[i].x, _clawFlamePts[i].y, midX, midY);
  }
  ctx.closePath();
  ctx.fillStyle = isTransformed ? 'rgba(217, 70, 239, 0.55)' : 'rgba(147, 51, 234, 0.45)';
  ctx.fill();

  // Darker inner cursed smoke core
  ctx.beginPath();
  ctx.arc(handRadius * 0.2, 0, handRadius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = isTransformed ? 'rgba(168, 85, 247, 0.35)' : 'rgba(126, 34, 206, 0.35)';
  ctx.fill();
  ctx.restore();

  // 3. Side-Profile Stitched Hand Fist Base
  ctx.beginPath();
  ctx.arc(0, 0, handRadius, 0, Math.PI * 2);
  if (isTransformed) {
    ctx.fillStyle = '#0E1322';
    ctx.fill();
    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#EEF3F7';
    ctx.fill();
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hand suture cross-stitches
    drawSuture(ctx, -handRadius * 0.6, 0, handRadius * 0.6, 0, 2, 2.0, '#181C26');
  }

  if (state.weaponCustomizations && state.weaponCustomizations.mahito) {
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  // Initialize default custom blades if not already present in global state
  if (!state.mahitoClawCustomBlades) {
    state.mahitoClawCustomBlades = [
      { idx: 0, knuckleX: 3.0, knuckleY: -6.5, fanAngle: -0.32, length: 82, heelWidth: 14.0, topArchY: -14.0, tipY: 16.0 },
      { idx: 1, knuckleX: 5.0, knuckleY: -3.8, fanAngle: -0.22, length: 88, heelWidth: 15.5, topArchY: -9.0, tipY: 18.0 },
      { idx: 2, knuckleX: 6.0, knuckleY: -0.8, fanAngle: -0.06, length: 84, heelWidth: 15.0, topArchY: -3.0, tipY: 24.0 },
      { idx: 3, knuckleX: 1.5, knuckleY: 9.0, fanAngle: 0.48, length: 80, heelWidth: 14.5, topArchY: 18.0, tipY: -22.0 }
    ];
  }

  // Map blades dynamically from global customizable state
  const blades = state.mahitoClawCustomBlades.map(b => {
    const s = clawScale / 0.70;
    return {
      idx: b.idx,
      knuckleX: b.knuckleX * s,
      knuckleY: b.knuckleY * s,
      fanAngle: b.fanAngle,
      length: b.length * clawScale,
      heelWidth: b.heelWidth * clawScale,
      topArchY: b.topArchY * clawScale,
      tipY: b.tipY * clawScale
    };
  });

  // Sort blades by customizable draw order (back-to-front layering)
  const drawOrder = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.drawOrder) || [0, 1, 2, 3];
  const orderedBlades = drawOrder.map(i => blades[i]).filter(Boolean);

  // Draw each blade from back to front with authentic mechanical knuckle caps and stepped ricasso heels
  orderedBlades.forEach(b => {
    ctx.save();
    ctx.translate(b.knuckleX, b.knuckleY);
    ctx.rotate(b.fanAngle);

    const blen = b.length;
    const hw = b.heelWidth;
    const halfHw = hw * 0.5;

    // ── 1. ARTICULATED 3D KNUCKLE SOCKET CAP & C-COLLAR (Exact Match to 3rd Pic) ──
    ctx.save();
    // A. C-Shaped Socket Bracket Collar (holding the pivot cylinder)
    ctx.beginPath();
    ctx.ellipse(-2.5 * clawScale, 0, 3.5 * clawScale, halfHw * 0.75, 0, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.lineTo(-4.5 * clawScale, 0);
    ctx.closePath();
    ctx.fillStyle = isTransformed ? '#1E142B' : '#64748B';
    ctx.fill();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // B. Cylindrical Pivot Hinge
    ctx.beginPath();
    ctx.arc(-2.0 * clawScale, 0, halfHw * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = isTransformed ? '#2A1B3D' : '#94A3B8';
    ctx.fill();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // C. Dome/Mushroom Knuckle Cap on Top
    ctx.beginPath();
    ctx.ellipse(-2.8 * clawScale, 0, 2.8 * clawScale, halfHw * 0.65, 0, 0, Math.PI * 2);
    if (isTransformed) {
      ctx.fillStyle = '#0E1322';
      ctx.fill();
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else {
      // OPTIMIZED: Replaced per-blade createLinearGradient with flat fill
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Specular shine on dome cap
      ctx.beginPath();
      ctx.ellipse(-3.5 * clawScale, -halfHw * 0.2, 1.0 * clawScale, halfHw * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    }
    ctx.restore();

    // ── 2. BLADE HEEL STEPPED NOTCH & RICASSO (Exact Match to 3rd Pic) ──
    const neckTopY  = -halfHw * 0.35;
    const neckBotY  = halfHw * 0.35;
    const heelTopX  = 5.0 * clawScale;
    const heelTopY  = -halfHw * 0.65;
    const notchInX  = 4.0 * clawScale;
    const notchInY  = halfHw * 0.25;
    const heelBotX  = 7.5 * clawScale;
    const heelBotY  = halfHw * 0.85;
    const tipX      = blen;
    const tipY      = b.tipY;
    const midSpineY = b.topArchY - halfHw * 0.35;
    const midBellyY = b.topArchY + halfHw * 0.55;

    // ── 3. UPPER SPINE FACET (Skin-Themed Porcelain Bevel to Match Hands) ──
    ctx.beginPath();
    ctx.moveTo(0, neckTopY);
    ctx.lineTo(heelTopX, heelTopY);
    ctx.quadraticCurveTo(blen * 0.45, midSpineY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, heelTopX, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();

    if (isTransformed) {
      ctx.fillStyle = '#2A1B3D';
      ctx.fill();
    } else {
      ctx.fillStyle = '#EEF3F7'; // Pale porcelain skin tone to match hands
      ctx.fill();
    }

    // ── 4. LOWER UNDERSIDE FACET & STEPPED RICASSO NOTCH (Skin-Themed Darker Grey Bevel) ──
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(heelTopX, 0);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.48, midBellyY, heelBotX, heelBotY);
    ctx.lineTo(notchInX, notchInY);
    ctx.lineTo(0, neckBotY);
    ctx.closePath();

    if (isTransformed) {
      ctx.fillStyle = '#0E1322';
      ctx.fill();
    } else {
      ctx.fillStyle = '#E2E8F0'; // Slightly darker grey skin tone to match hands
      ctx.fill();

      // Lower cutting edge razor highlight
      ctx.beginPath();
      ctx.moveTo(heelBotX, heelBotY);
      ctx.quadraticCurveTo(blen * 0.48, midBellyY, tipX, tipY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── 5. HEAVY MANGA INK CONTOUR OUTLINE ──
    ctx.beginPath();
    ctx.moveTo(0, neckTopY);
    ctx.lineTo(heelTopX, heelTopY);
    ctx.quadraticCurveTo(blen * 0.45, midSpineY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.48, midBellyY, heelBotX, heelBotY);
    ctx.lineTo(notchInX, notchInY);
    ctx.lineTo(0, neckBotY);
    ctx.closePath();

    ctx.strokeStyle = isTransformed ? '#D946EF' : '#000000';
    ctx.lineWidth = isTransformed ? 1.4 : 1.25;
    ctx.lineJoin = 'miter';
    ctx.stroke();

    // ── Quadratic Bezier Curve Helper Functions for Exact Surface Point Alignment ──
    const getSpinePt = (t) => {
      const mt = 1 - t;
      return {
        x: mt * mt * heelTopX + 2 * mt * t * (blen * 0.45) + t * t * tipX,
        y: mt * mt * heelTopY + 2 * mt * t * midSpineY + t * t * tipY
      };
    };

    const getBellyPt = (t) => {
      const mt = 1 - t;
      return {
        x: mt * mt * heelBotX + 2 * mt * t * (blen * 0.48) + t * t * tipX,
        y: mt * mt * heelBotY + 2 * mt * t * midBellyY + t * t * tipY
      };
    };

    const getCreasePt = (t) => {
      const mt = 1 - t;
      return {
        x: mt * mt * heelTopX + 2 * mt * t * (blen * 0.50) + t * t * tipX,
        y: mt * mt * 0 + 2 * mt * t * b.topArchY + t * t * tipY
      };
    };

    // Center Crease Dividing Suture Line
    const cEnd = getCreasePt(0.82);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(heelTopX, 0);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, cEnd.x, cEnd.y);
    ctx.strokeStyle = isTransformed ? '#F5D0FE' : '#000000';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Add stitches along the center crease to match skin sutures
    if (!isTransformed) {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.0;

      const getQuadTangent = (t) => {
        const mt = 1 - t;
        const dx = 2 * mt * (blen * 0.50 - heelTopX) + 2 * t * (cEnd.x - blen * 0.50);
        const dy = 2 * mt * (b.topArchY - 0) + 2 * t * (cEnd.y - b.topArchY);
        const len = Math.hypot(dx, dy) || 1;
        return { nx: -dy / len, ny: dx / len };
      };

      const tValues = [0.35, 0.70];
      tValues.forEach(t => {
        const pt = getCreasePt(t);
        const norm = getQuadTangent(t);
        const crossW = 2.2 * clawScale;
        ctx.beginPath();
        ctx.moveTo(pt.x - norm.nx * crossW, pt.y - norm.ny * crossW);
        ctx.lineTo(pt.x + norm.nx * crossW, pt.y + norm.ny * crossW);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── 6. CRIMSON RED DIPPED NEEDLE TIP ──
    const tipStart = 0.80;
    const ptTopTip = getSpinePt(tipStart);
    const ptBotTip = getBellyPt(tipStart);

    ctx.beginPath();
    ctx.moveTo(ptTopTip.x, ptTopTip.y);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(ptBotTip.x, ptBotTip.y);
    ctx.closePath();

    if (isTransformed) {
      ctx.fillStyle = '#F5D0FE';
      ctx.fill();
    } else {
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // ── 7. DUAL DIAGONAL CRIMSON ACCENT PINSTRIPES (//) ──
    if (!isTransformed) {
      const drawStripe = (startFrac, endFrac) => {
        const pTop1 = getSpinePt(startFrac);
        const pTop2 = getSpinePt(endFrac);
        const pBot1 = getBellyPt(startFrac);
        const pBot2 = getBellyPt(endFrac);

        ctx.beginPath();
        ctx.moveTo(pTop1.x, pTop1.y);
        ctx.lineTo(pTop2.x, pTop2.y);
        ctx.lineTo(pBot2.x - 1.5 * clawScale, pBot2.y);
        ctx.lineTo(pBot1.x - 1.5 * clawScale, pBot1.y);
        ctx.closePath();
        ctx.fillStyle = '#DC2626';
        ctx.fill();
      };

      drawStripe(0.58, 0.63);
      drawStripe(0.66, 0.71);
    }

    ctx.restore();
  });

  ctx.restore(); // Restore hand transform

  // 5. Dynamic 4-Crescent Scratch Slash Trails (Rule #15 & #11 Compliant)
  if (progress > 0.08 && progress < 0.90) {
    let startAng = -1.20;
    let endAng = -1.20;
    let trailAlpha = 1.0;

    if (isSlashing) {
      endAng = -1.20 + 2.40 * Math.sin(slashProgress * (Math.PI * 0.5));
      startAng = -1.20 + 2.40 * Math.max(0, slashProgress - 0.40);
      trailAlpha = Math.sin(slashProgress * Math.PI * 0.95);
    } else if (recoveryProgress > 0) {
      endAng = 1.20;
      const tailP = Math.pow(recoveryProgress, 1.4);
      startAng = -1.20 + 2.40 * tailP;
      trailAlpha = Math.max(0, 1.0 - recoveryProgress);
    }

    if (endAng > startAng + 0.05 && trailAlpha > 0.05) {
      const numPoints = 16;

      blades.forEach((b, idx) => {
        const slashRadius = r + b.length + (idx * 3.5);
        const maxThick = (isTransformed ? 5.2 : 3.8) * trailAlpha;

        ctx.save();
        ctx.translate(handX, handY);
        if (!isRightPunch) {
          ctx.scale(1, -1);
        }
        ctx.beginPath();

        // Leading arc envelope
        for (let i = 0; i <= numPoints; i++) {
          const t = i / numPoints;
          const ang = startAng + (endAng - startAng) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
          const rad = slashRadius + (maxThick * 0.5 * taper);
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        // Trailing arc envelope
        for (let i = numPoints; i >= 0; i--) {
          const t = i / numPoints;
          const ang = startAng + (endAng - startAng) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
          const rad = slashRadius - (maxThick * 0.5 * taper);
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Outer Crimson & Vivid Magenta Cursed Gradient Fill (Zero shadowBlur)
        ctx.fillStyle = isTransformed
          ? `rgba(217, 70, 239, ${(0.85 * trailAlpha).toFixed(3)})`
          : (idx % 2 === 0
              ? `rgba(220, 38, 38, ${(0.88 * trailAlpha).toFixed(3)})`
              : `rgba(217, 70, 239, ${(0.82 * trailAlpha).toFixed(3)})`);
        ctx.fill();

        // Crisp White Core Streak
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.92 * trailAlpha).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const t = i / numPoints;
          const ang = startAng + (endAng - startAng) * t;
          const px = Math.cos(ang) * slashRadius;
          const py = Math.sin(ang) * slashRadius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.restore();
      });
    }
  }
}

/**
 * Draws Mahito's Spiked Mace Morph (Idle Transfiguration: Mutated Spiked Flesh Club).
 */
function drawMaceMorphArm(ctx, r, lungeX, isTransformed, progress, isRightPunch) {
  const cfg = CONFIG.mahito || {};
  const maceLen = (cfg.maceMorphLength || 46) * (isTransformed ? 1.25 : 1.0);
  const maceR = (cfg.maceMorphRadius || 18) * (isTransformed ? 1.25 : 1.0);

  const armOriginX = r * 0.65;
  const armOriginY = isRightPunch ? r * 0.15 : -r * 0.15;
  const maceCenterX = armOriginX + lungeX + maceLen;
  const maceCenterY = armOriginY;

  ctx.save();

  // 1. Bulging Muscular Flesh Arm Shaft
  ctx.beginPath();
  ctx.moveTo(armOriginX, armOriginY - 7);
  ctx.quadraticCurveTo(armOriginX + lungeX * 0.5, armOriginY - 11, maceCenterX - maceR * 0.7, armOriginY - 8);
  ctx.lineTo(maceCenterX - maceR * 0.7, armOriginY + 8);
  ctx.quadraticCurveTo(armOriginX + lungeX * 0.5, armOriginY + 11, armOriginX, armOriginY + 7);
  ctx.closePath();

  if (isTransformed) {
    ctx.fillStyle = '#0E1322';
    ctx.fill();
    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Muscle fiber stitch lines
    drawSuture(ctx, armOriginX + 6, armOriginY - 3, maceCenterX - maceR * 0.8, armOriginY - 3, 3, 2.8, '#181C26');
    drawSuture(ctx, armOriginX + 8, armOriginY + 3, maceCenterX - maceR * 0.8, armOriginY + 3, 3, 2.8, '#181C26');
  }

  // 2. Heavy Deformed Spiked Mace Head
  ctx.save();
  ctx.translate(maceCenterX, maceCenterY);

  // A. Studded Spikes radiating outward
  const spikeCount = 7;
  const spikeLen = (isTransformed ? 12 : 9);
  const spikeBaseW = 4.5;

  for (let i = 0; i < spikeCount; i++) {
    const ang = (i * Math.PI * 2 / spikeCount) + (progress * 0.3);
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const perpX = -sinA * spikeBaseW;
    const perpY =  cosA * spikeBaseW;

    const basePtX = cosA * (maceR * 0.85);
    const basePtY = sinA * (maceR * 0.85);
    const tipPtX  = cosA * (maceR + spikeLen);
    const tipPtY  = sinA * (maceR + spikeLen);

    ctx.beginPath();
    ctx.moveTo(basePtX + perpX, basePtY + perpY);
    ctx.lineTo(tipPtX, tipPtY);
    ctx.lineTo(basePtX - perpX, basePtY - perpY);
    ctx.closePath();

    if (isTransformed) {
      ctx.fillStyle = '#F5D0FE';
      ctx.fill();
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  // B. Main Deformed Spiked Head Sphere
  ctx.beginPath();
  ctx.arc(0, 0, maceR, 0, Math.PI * 2);

  if (isTransformed) {
    ctx.fillStyle = '#0E1322';
    ctx.fill();
    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Luminous Magenta Core Energy Veins
    ctx.fillStyle = '#D946EF';
    ctx.beginPath();
    ctx.arc(0, 0, maceR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F5D0FE';
    ctx.beginPath();
    ctx.arc(0, 0, maceR * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#EEF3F7';
    ctx.fill();
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Mutated stitch patchwork on mace head
    drawSuture(ctx, -maceR * 0.65, 0, maceR * 0.65, 0, 3, 3.0, '#181C26');
    drawSuture(ctx, 0, -maceR * 0.65, 0, maceR * 0.65, 3, 3.0, '#181C26');
  }

  ctx.restore();

  // 3. Impact Thrust Burst & Shockwave Rings (Zero shadowBlur)
  if (progress > 0.15 && progress < 0.85) {
    const impactAlpha = Math.sin(((progress - 0.15) / 0.70) * Math.PI);
    const impactR = maceR * (1.2 + progress * 1.4);

    ctx.save();
    ctx.translate(maceCenterX, maceCenterY);

    // Expanding Blunt Shockwave Arc in Vibrant Magenta CE
    ctx.strokeStyle = isTransformed
      ? `rgba(217, 70, 239, ${(0.85 * impactAlpha).toFixed(3)})`
      : `rgba(192, 38, 211, ${(0.75 * impactAlpha).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, impactR, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();

    // Outer Lilac Faint Ring
    ctx.strokeStyle = isTransformed
      ? `rgba(245, 208, 254, ${(0.55 * impactAlpha).toFixed(3)})`
      : `rgba(232, 121, 249, ${(0.45 * impactAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, impactR * 1.35, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main Morph Drawing Dispatcher for Mahito's basic attacks.
 */
export function drawMahitoArmMorph(ctx, fighter, isTransformed, isRightPunch, morphType, punchProgress, handX, handY) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const r = fighter.r || 25;
  let easeExtension = 0;

  if (punchProgress < 0.28) {
    easeExtension = Math.sin((punchProgress / 0.28) * (Math.PI / 2));
  } else {
    const retract = (punchProgress - 0.28) / 0.72;
    easeExtension = Math.cos(retract * (Math.PI / 2));
  }

  const lungeX = easeExtension * (r * 0.25);
  const hX = (handX !== undefined) ? handX : (r * 0.70 + lungeX);
  const hY = (handY !== undefined) ? handY : 0;

  if (morphType === 'mace') {
    drawMaceMorphArm(ctx, r, lungeX, isTransformed, punchProgress, isRightPunch);
  } else {
    drawClawMorphArm(ctx, r, hX, hY, isTransformed, punchProgress, isRightPunch, fighter);
  }
}

/**
 * Renders Mahito's Subterranean Flesh Surge skill (Idle Transfiguration: Underground Arm Eruption).
 * Features:
 * - Plunge impact ground fissures at Mahito's feet
 * - 3–5 stretched flesh arm tendrils curving through the air clad in vivid magenta/purple CE
 * - Surgical suture cuts along tendril spines
 * - Eruption point ground cracks & expanding magenta shockwaves
 * Strictly adheres to Rule #11 (Zero shadowBlur).
 */
export function drawMahitoSubterraneanFleshSurge(ctx, fighter) {
  const data = fighter._fleshSurgeData;
  if (!data || !data.maxTimer || fighter.fleshSurgeAnimTimer <= 0) return;

  const maxT = data.maxTimer || 42;
  const rawElapsed = data.elapsedFrames || 0;
  // 30 FPS stepped anime cadence (changes every 2 frames at 60Hz)
  const elapsedFrames = Math.floor(rawElapsed / 2) * 2;
  const progress = Math.min(1.0, Math.max(0.0, elapsedFrames / maxT));
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const startX = data.startX; // Stationary ground origin (cast coordinates)
  const startY = data.startY; // Stationary ground origin (cast coordinates)
  const baseAngle = data.baseAngle !== undefined ? data.baseAngle : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const cosA = Math.cos(baseAngle);
  const sinA = Math.sin(baseAngle);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // 1. Ground impact cracks at Mahito's plunge point
  if (elapsedFrames >= (data.slideEndFrame || 8)) {
    const plungeAge = elapsedFrames - (data.slideEndFrame || 8);
    const plungeAlpha = Math.max(0, 1.0 - (plungeAge / 30));

    if (plungeAlpha > 0.05) {
      ctx.save();
      
      // Draw a dark concrete impact smudge/crater shadow
      ctx.fillStyle = `rgba(24, 24, 26, ${(0.22 * plungeAlpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(startX, startY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Draw jagged concrete cracks radiating outward
      ctx.strokeStyle = `rgba(28, 28, 30, ${(0.92 * plungeAlpha).toFixed(3)})`;
      ctx.lineWidth = 2.4;
      for (let k = 0; k < 6; k++) {
        const crackAngle = (Math.PI * 2 / 6) * k + 0.35;
        const cLen = 22 + (k % 2) * 6;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let curX = startX;
        let curY = startY;
        const segments = 3;
        const segLen = cLen / segments;
        for (let s = 0; s < segments; s++) {
          const jitter = (s === 0 ? 0 : Math.sin(s * 2 + k) * 0.28);
          curX += Math.cos(crackAngle + jitter) * segLen;
          curY += Math.sin(crackAngle + jitter) * segLen;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      }

      // Draw concrete rock debris shatters
      ctx.fillStyle = `rgba(60, 60, 65, ${(plungeAlpha).toFixed(3)})`;
      for (let d = 0; d < 4; d++) {
        const rockAng = (d * 1.5) + 0.3;
        const rockDist = 10 + d * 4;
        const rx = startX + Math.cos(rockAng) * rockDist;
        const ry = startY + Math.sin(rockAng) * rockDist;
        const rSize = 1.6 + (d % 2) * 1.5;
        ctx.fillRect(rx - rSize / 2, ry - rSize / 2, rSize, rSize);
      }

      ctx.restore();
    }
  }

  // 2. Read dynamic loops configuration from state data
  const loops = data.loops || [];
  const tendrilCount = loops.length || 4;
  const animStartFrame = data.plungeEndFrame || 18;
  const growthDuration = data.growthDuration || 38;
  const lingerDuration = data.lingerDuration || 18;
  const retractDuration = data.retractDuration || 24;
  const retractStartFrame = data.retractStartFrame !== undefined ? data.retractStartFrame : (animStartFrame + growthDuration + lingerDuration);

  const fadeOutAlpha = progress > 0.88 ? Math.max(0, (1.0 - progress) / 0.12) : 1.0;

  // Calculate overall retraction progress (30 FPS stepped)
  let retractRatio = 0;
  if (elapsedFrames >= retractStartFrame) {
    retractRatio = Math.min(1.0, (elapsedFrames - retractStartFrame) / retractDuration);
  }

  // 3. Render Subterranean Humps (Frames >= animStartFrame, 30 FPS Sakuga stepped cadence)
  if (elapsedFrames >= animStartFrame) {
    // A. Draw underground connection lines between sequential ground craters
    ctx.save();
    ctx.strokeStyle = `rgba(59, 7, 100, ${(0.55 * fadeOutAlpha).toFixed(3)})`;
    ctx.lineWidth = isTransformed ? 5.0 : 3.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i < loops.length - 1; i++) {
      const lp = loops[i];
      const nextLp = loops[i + 1];
      if (elapsedFrames >= lp.startFrame) {
        ctx.moveTo(lp.exitX, lp.exitY);
        ctx.lineTo(nextLp.entryX, nextLp.entryY);
      }
    }
    ctx.stroke();
    ctx.restore();

    // B. Draw Ground Crater Cavity Voids (UNDERNEATH the flesh arches)
    for (let i = 0; i < loops.length; i++) {
      const lp = loops[i];
      if (elapsedFrames >= lp.startFrame) {
        drawGroundHoleBack(ctx, lp.entryX, lp.entryY, lp.dirAngle, isTransformed, fadeOutAlpha);
        // If this hump has started plunging back into exit hole
        if (elapsedFrames >= lp.startFrame + (lp.growthDuration || 14) * 0.5) {
          drawGroundHoleBack(ctx, lp.exitX, lp.exitY, lp.dirAngle, isTransformed, fadeOutAlpha);
        }
      }
    }

    // C. Draw Organic Fleshy Arches for each active/chasing hump
    for (let i = 0; i < loops.length; i++) {
      const lp = loops[i];
      if (elapsedFrames < lp.startFrame) continue;

      // Retraction: Humps sink back sequentially along the chain from last to first
      let humpAlpha = 1.0;
      let humpProgress = 1.0;

      if (retractRatio > 0) {
        // Timeline split across (tendrilCount + 1) stages so foreground arm is the final stage
        const totalStages = tendrilCount + 1;
        const humpRetractStart = (tendrilCount - 1 - i) / totalStages;
        const humpRetractEnd = (tendrilCount - i) / totalStages;
        if (retractRatio >= humpRetractEnd) {
          continue; // Fully sunk into ground hole
        } else if (retractRatio > humpRetractStart) {
          const rProg = (retractRatio - humpRetractStart) / (humpRetractEnd - humpRetractStart);
          const easedSink = rProg * rProg * (3 - 2 * rProg);
          humpProgress = 1.0 - easedSink;
          humpAlpha = Math.max(0, 1.0 - rProg);
        }
      } else {
        // Growth phase for this specific hump (30 FPS stepped Sakuga cadence)
        const hGrowthDur = lp.growthDuration || 14;
        const gProg = Math.min(1.0, (elapsedFrames - lp.startFrame) / hGrowthDur);
        humpProgress = Math.sin(gProg * (Math.PI * 0.5));
      }

      if (humpProgress <= 0.05) continue;

      // Generate smooth quadratic spline points from entry -> peak -> exit
      const numSamples = 10;
      const activeSamples = Math.max(2, Math.floor(numSamples * humpProgress));
      _surgeHumpPoints.length = 0;

      for (let s = 0; s <= activeSamples; s++) {
        const t = s / numSamples;
        const invT = 1.0 - t;

        // Quadratic Bezier ground coordinates: Entry -> Peak -> Exit
        const gx = invT * invT * lp.entryX + 2 * invT * t * lp.peakX + t * t * lp.exitX;
        const gy = invT * invT * lp.entryY + 2 * invT * t * lp.peakY + t * t * lp.exitY;

        // Parabolic vertical height arching into the air
        const h = lp.maxHeight * Math.sin(t * Math.PI) * humpProgress;
        const py = gy - h;

        const baseThickness = (isTransformed ? 12 : 9) * (1.0 - (i / tendrilCount) * 0.40);
        _surgeHumpPoints.push({
          x: gx,
          y: py,
          isUnderground: false,
          thickness: baseThickness,
          height: h
        });
      }

      if (_surgeHumpPoints.length >= 2) {
        // 1 suture band per hump -> strictly exactly 4 suture bands total across the 4 subterranean humps
        drawFleshLoop(ctx, _surgeHumpPoints, isTransformed, fadeOutAlpha * humpAlpha, 1, lp.isFrozenByInfinity);
      }
    }

    // D. Draw Foreground Crater Lips & Debris (OVERLAPS the tendril entry/exit for 3D ground penetration)
    for (let i = 0; i < loops.length; i++) {
      const lp = loops[i];
      if (elapsedFrames >= lp.startFrame) {
        drawGroundHoleFront(ctx, lp.entryX, lp.entryY, lp.dirAngle, isTransformed, fadeOutAlpha);
        if (elapsedFrames >= lp.startFrame + (lp.growthDuration || 14) * 0.5) {
          drawGroundHoleFront(ctx, lp.exitX, lp.exitY, lp.dirAngle, isTransformed, fadeOutAlpha);
        }
      }
    }
  }

  ctx.restore();
}

/**
 * Draws the front hand stretch socket circle and foreground stretch arm
 * on top of Mahito's body circle and cursed energy aura.
 */
export function drawMahitoFleshSurgeForegroundArm(ctx, fighter, isTransformed) {
  const data = fighter._fleshSurgeData;
  if (!data || !data.maxTimer || fighter.fleshSurgeAnimTimer <= 0) return;

  const currentX = fighter.x;
  const currentY = fighter.y;
  const startX = data.startX;
  const startY = data.startY;
  const rawElapsed = data.elapsedFrames || 0;
  const elapsedFrames = Math.floor(rawElapsed / 2) * 2; // 30 FPS stepped Sakuga cadence
  const animStartFrame = data.plungeEndFrame || 18;
  const growthDuration = data.growthDuration || 38;
  const lingerDuration = data.lingerDuration || 18;
  const retractDuration = data.retractDuration || 24;
  const retractStartFrame = data.retractStartFrame !== undefined ? data.retractStartFrame : (animStartFrame + growthDuration + lingerDuration);
  const baseThick = isTransformed ? 12 : 9;

  const loops = data.loops || [];
  const tendrilCount = loops.length || 4;
  const totalStages = tendrilCount + 1;
  const foregroundArmStart = tendrilCount / totalStages;

  let armPullbackRatio = 0;
  if (elapsedFrames >= retractStartFrame) {
    const retractProgress = Math.min(1.0, (elapsedFrames - retractStartFrame) / retractDuration);
    if (retractProgress >= foregroundArmStart) {
      const armProg = Math.min(1.0, Math.max(0.0, (retractProgress - foregroundArmStart) / (1.0 - foregroundArmStart)));
      armPullbackRatio = armProg * armProg * (3 - 2 * armProg);
    }
  }

  // 1. Draw Front Hand Stretch Socket on Center of Body (World Space)
  ctx.save();
  const socketRadius = isTransformed ? 9.5 : 8.5;

  // A. Radiating muscular stretch root tendons anchoring into Mahito's chest
  ctx.save();
  ctx.strokeStyle = isTransformed ? 'rgba(217, 70, 239, 0.65)' : 'rgba(59, 7, 100, 0.55)';
  ctx.lineWidth = 1.4;
  for (let r = 0; r < 6; r++) {
    const rootAngle = (Math.PI * 2 / 6) * r + 0.2;
    const rLen = socketRadius * 1.55;
    ctx.beginPath();
    ctx.moveTo(currentX + Math.cos(rootAngle) * (socketRadius * 0.7), currentY + Math.sin(rootAngle) * (socketRadius * 0.7));
    ctx.lineTo(currentX + Math.cos(rootAngle) * rLen, currentY + Math.sin(rootAngle) * rLen);
    ctx.stroke();
  }
  ctx.restore();

  // B. Concentric muscular sphincter fold rim
  ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
  ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#3B0764';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(currentX, currentY, socketRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // C. Deep subterranean dark void core inside socket
  ctx.fillStyle = '#050508';
  ctx.beginPath();
  ctx.arc(currentX, currentY, socketRadius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // D. Surgical cross-stitch details around socket rim
  if (!isTransformed) {
    drawSuture(ctx, currentX - socketRadius * 0.9, currentY, currentX - socketRadius * 0.35, currentY, 2, 2.0, '#181C26');
    drawSuture(ctx, currentX + socketRadius * 0.35, currentY, currentX + socketRadius * 0.9, currentY, 2, 2.0, '#181C26');
  }

  // E. Viscous Cursed Energy glow on socket aperture
  ctx.strokeStyle = 'rgba(217, 70, 239, 0.75)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(currentX, currentY, socketRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. Draw Stretching Plunge / Surge Arm (World Space)
  if (elapsedFrames < animStartFrame) {
    const slideEnd = data.slideEndFrame || 8;
    if (elapsedFrames < slideEnd) {
      // Wind-up lift (-Y)
      const windupProg = elapsedFrames / slideEnd;
      const liftY = -Math.sin(windupProg * Math.PI * 0.5) * 16;
      const handX = currentX;
      const handY = currentY + liftY;
      const dist = Math.hypot(handX - currentX, handY - currentY) || 1;
      _surgeHumpPoints.length = 0;
      for (let d = 0; d <= dist; d += 2) {
        const pct = d / dist;
        const px = currentX + (handX - currentX) * pct;
        const py = currentY + (handY - currentY) * pct;
        const thick = baseThick * (1.0 + 0.35 * Math.sin(Math.PI * pct) * windupProg);
        _surgeHumpPoints.push({ x: px, y: py, isUnderground: false, thickness: thick });
      }
      if (_surgeHumpPoints.length >= 2) {
        drawFleshLoop(ctx, _surgeHumpPoints, isTransformed, 1.0);
      }
      const fistR = (isTransformed ? 10 : 8.5) * (1.0 + 0.35 * windupProg);
      drawArticulatedFist(ctx, handX, handY, fistR, isTransformed, -Math.PI / 2, true);
    } else {
      // Downward ground slam (+Y)
      const slamProg = Math.min(1.0, (elapsedFrames - slideEnd) / (animStartFrame - slideEnd));
      const stretchRatio = Math.sin(slamProg * Math.PI * 0.5);
      const tipX = currentX + (startX - currentX) * stretchRatio;
      const tipY = currentY + (startY - currentY) * stretchRatio;
      const dist = Math.hypot(tipX - currentX, tipY - currentY);
      if (dist > 1.0) {
        _surgeHumpPoints.length = 0;
        for (let d = 0; d <= dist; d += 3) {
          const pct = d / dist;
          const px = currentX + (tipX - currentX) * pct;
          const py = currentY + (tipY - currentY) * pct;
          const thick = baseThick * (1.0 - 0.20 * pct);
          _surgeHumpPoints.push({ x: px, y: py, isUnderground: false, thickness: thick });
        }
        if (_surgeHumpPoints.length >= 2) {
          drawFleshLoop(ctx, _surgeHumpPoints, isTransformed, 1.0, 1);
        }
        const fistR = (isTransformed ? 12 : 10) * (0.85 + 0.35 * (1.0 - slamProg));
        drawArticulatedFist(ctx, tipX, tipY, fistR, isTransformed, Math.PI / 2, true);
      }
    }
  } else {
    // Frames >= animStartFrame: Stretch arm connecting chest socket into ground plunge hole
    const stretchEndX = startX + (currentX - startX) * armPullbackRatio;
    const stretchEndY = startY + (currentY - startY) * armPullbackRatio;
    const distToAnchor = Math.hypot(stretchEndX - currentX, stretchEndY - currentY);

    if (distToAnchor > 1.0 && armPullbackRatio < 1.0) {
      _surgeHumpPoints.length = 0;
      const step = 3;
      for (let d = 0; d <= distToAnchor; d += step) {
        const pct = d / distToAnchor;
        const px = currentX + (stretchEndX - currentX) * pct;
        const py = currentY + (stretchEndY - currentY) * pct;

        let thickness = baseThick;
        if (armPullbackRatio > 0.5) {
          const taper = 1.0 - (armPullbackRatio - 0.5) * 0.40;
          thickness *= taper;
        }
        _surgeHumpPoints.push({ x: px, y: py, isUnderground: false, thickness });
      }

      if (_surgeHumpPoints.length >= 2) {
        drawFleshLoop(ctx, _surgeHumpPoints, isTransformed, 1.0, 1);
      }

      // Smooth reforming articulated fist as arm arrives back into chest socket
      if (armPullbackRatio > 0.60) {
        const capProgress = (armPullbackRatio - 0.60) / 0.40;
        const capRadius = (isTransformed ? 9.5 : 8.0) * (0.6 + 0.4 * capProgress);
        const baseAngle = data.baseAngle !== undefined ? data.baseAngle : (fighter.gunAngle || 0);
        drawArticulatedFist(ctx, stretchEndX, stretchEndY, capRadius, isTransformed, baseAngle, false);
      }
    }
  }
}

/**
 * Helper to draw an articulated brawler fist / scythe claw with full anatomy,
 * knuckles, thumb, surgical sutures, and Cursed Energy flame envelope.
 */
function drawArticulatedFist(ctx, x, y, handRadius, isTransformed, angle = 0, isPunching = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Cursed Energy Flame Aura
  ctx.save();
  const ceBlobRadius = handRadius * (isPunching ? 2.2 : 1.6);
  const now = Date.now() * 0.005;
  const numFlamePts = 7;
  const flamePts = [];
  for (let i = 0; i < numFlamePts; i++) {
    const ang = (Math.PI * 2 / numFlamePts) * i;
    const wave = Math.sin(now * 3.5 + i * 1.8) * (handRadius * 0.3);
    const curR = ceBlobRadius + wave;
    flamePts.push({ x: Math.cos(ang) * curR, y: Math.sin(ang) * curR });
  }

  ctx.beginPath();
  let fmx = (flamePts[numFlamePts - 1].x + flamePts[0].x) / 2;
  let fmy = (flamePts[numFlamePts - 1].y + flamePts[0].y) / 2;
  ctx.moveTo(fmx, fmy);
  for (let i = 0; i < numFlamePts; i++) {
    const p = flamePts[i];
    const next = flamePts[(i + 1) % numFlamePts];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  }
  ctx.closePath();

  // OPTIMIZED: Replaced per-frame createRadialGradient with layered flat concentric fills
  ctx.fillStyle = 'rgba(59, 7, 100, 0.15)';
  ctx.fill();
  // Brighter inner core overlay
  ctx.beginPath();
  ctx.arc(0, 0, ceBlobRadius * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, handRadius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245, 208, 254, 0.65)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(59, 7, 100, 0.9)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // 2. Physical Hand Structure
  if (isTransformed) {
    // Transformed Obsidian Claws
    ctx.fillStyle = '#0E1322';
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.8, -handRadius * 0.7);
    ctx.lineTo(handRadius * 0.4, -handRadius * 0.8);
    ctx.lineTo(handRadius * 1.0, 0);
    ctx.lineTo(handRadius * 0.4, handRadius * 0.8);
    ctx.lineTo(-handRadius * 0.8, handRadius * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3 Scythe Talons
    for (let c = 0; c < 3; c++) {
      const cy = -handRadius * 0.4 + c * (handRadius * 0.4);
      const cx = handRadius * 0.6;
      const clawLen = handRadius * (0.8 + (c === 1 ? 0.3 : 0));
      ctx.fillStyle = '#F5D0FE';
      ctx.beginPath();
      ctx.moveTo(cx, cy - handRadius * 0.15);
      ctx.lineTo(cx + clawLen, cy);
      ctx.lineTo(cx, cy + handRadius * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  } else {
    // Base Anatomical Fist with Knuckles & Sutures
    ctx.fillStyle = '#EEF3F7';
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.7, -handRadius * 0.6);
    ctx.lineTo(handRadius * 0.4, -handRadius * 0.7);
    ctx.quadraticCurveTo(handRadius * 1.0, -handRadius * 0.4, handRadius * 1.0, 0);
    ctx.quadraticCurveTo(handRadius * 1.0, handRadius * 0.4, handRadius * 0.4, handRadius * 0.7);
    ctx.lineTo(-handRadius * 0.7, handRadius * 0.6);
    ctx.closePath();
    ctx.fill();

    // Secondary patched tone
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.7, 0);
    ctx.lineTo(handRadius * 1.0, 0);
    ctx.lineTo(handRadius * 0.4, handRadius * 0.7);
    ctx.lineTo(-handRadius * 0.7, handRadius * 0.6);
    ctx.closePath();
    ctx.fill();

    // 4 Knuckles
    for (let k = 0; k < 4; k++) {
      const ky = -handRadius * 0.48 + k * (handRadius * 0.32);
      const kx = handRadius * (0.85 + Math.cos((k - 1.5) * 0.7) * 0.15);
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(kx, ky, handRadius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Folded Thumb
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.3, -handRadius * 0.5);
    ctx.quadraticCurveTo(handRadius * 0.2, -handRadius * 0.8, handRadius * 0.4, -handRadius * 0.3);
    ctx.quadraticCurveTo(handRadius * 0.1, -handRadius * 0.2, -handRadius * 0.3, -handRadius * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Suture stitches
    drawSuture(ctx, -handRadius * 0.4, -handRadius * 0.55, -handRadius * 0.1, handRadius * 0.55, 3, 2.2, '#181C26');

    // Outline
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.7, -handRadius * 0.6);
    ctx.lineTo(handRadius * 0.4, -handRadius * 0.7);
    ctx.quadraticCurveTo(handRadius * 1.0, -handRadius * 0.4, handRadius * 1.0, 0);
    ctx.quadraticCurveTo(handRadius * 1.0, handRadius * 0.4, handRadius * 0.4, handRadius * 0.7);
    ctx.lineTo(-handRadius * 0.7, handRadius * 0.6);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the background void and deep shadow of the ground crater hole
 * (rendered UNDERNEATH the flesh tendril so it emerges from within).
 */
/**
 * Draws the background void and deep shadow of the ground crater hole
 * (rendered UNDERNEATH the flesh tendril so it emerges from within).
 */
function drawGroundHoleBack(ctx, tx, ty, baseAngle, isTransformed, fadeOutAlpha) {
  ctx.save();
  ctx.globalAlpha = fadeOutAlpha;
  ctx.translate(tx, ty);
  ctx.rotate(baseAngle);

  const holeRx = 14;
  const holeRy = 8.5;

  // 1. Surrounding concrete stress shadow
  ctx.fillStyle = 'rgba(15, 15, 20, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, holeRx * 1.5, holeRy * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Deep subterranean void cavity (Pitch black center)
  ctx.fillStyle = '#050508';
  ctx.beginPath();
  ctx.ellipse(0, 0, holeRx, holeRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Back rim ink contour
  ctx.strokeStyle = 'rgba(30, 20, 42, 0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, holeRx, holeRy, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the foreground crater lip, rock debris, and fissures
 * (rendered ON TOP of the flesh tendril entry to create true 3D ground penetration).
 */
function drawGroundHoleFront(ctx, tx, ty, baseAngle, isTransformed, fadeOutAlpha) {
  ctx.save();
  ctx.globalAlpha = fadeOutAlpha;
  ctx.translate(tx, ty);
  ctx.rotate(baseAngle);

  const holeRx = 14;
  const holeRy = 8.5;

  // 1. Front crater rim (overlaps the tendril base as it dives into the hole)
  ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#3B0764';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(0, 0, holeRx, holeRy, 0, 0, Math.PI);
  ctx.stroke();

  // 2. Concrete rim highlight lip
  ctx.strokeStyle = 'rgba(210, 215, 225, 0.45)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(0, 1.2, holeRx * 0.9, holeRy * 0.75, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // 3. Jagged concrete fissure cracks radiating from the crater (Batched)
  ctx.strokeStyle = 'rgba(25, 25, 30, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const crackAngle = (Math.PI * 2 / 6) * k + 0.35;
    const length = 10 + (k % 2) * 5;
    const startX = Math.cos(crackAngle) * (holeRx * 0.8);
    const startY = Math.sin(crackAngle) * (holeRy * 0.8);
    const endX = Math.cos(crackAngle) * (holeRx * 0.8 + length);
    const endY = Math.sin(crackAngle) * (holeRy * 0.8 + length);
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
  }
  ctx.stroke();

  // 4. Shattered concrete stones scattered around the crater rim
  ctx.fillStyle = 'rgba(50, 50, 58, 0.95)';
  for (let d = 0; d < 4; d++) {
    const rockAng = (d * 1.55) + 0.4;
    const rockDist = holeRx + 3 + (d % 2) * 4;
    const rx = Math.cos(rockAng) * rockDist;
    const ry = Math.sin(rockAng) * rockDist * 0.65;
    const rSize = 1.6 + (d % 2) * 1.4;
    ctx.fillRect(rx - rSize / 2, ry - rSize / 2, rSize, rSize);
  }

  // 5. Concrete dust puff
  ctx.fillStyle = 'rgba(140, 140, 148, 0.25)';
  ctx.beginPath();
  ctx.arc(0, -2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Helper to draw a single fleshy arm hump polygon along loop points.
 * Features organic curvature, upper spine highlights, surgical sutures, and Cursed Energy bloom.
 * Optimized with static module-level buffers.
 */
function drawFleshLoop(ctx, points, isTransformed, fadeOutAlpha = 1.0, maxBands = 2, isFrozenByInfinity = false) {
  const pCount = points.length;
  if (pCount < 2) return;

  _fleshLoopLeft.length = 0;
  _fleshLoopRight.length = 0;

  for (let i = 0; i < pCount; i++) {
    const pt = points[i];
    const prev = points[i > 0 ? i - 1 : 0];
    const next = points[i < pCount - 1 ? i + 1 : pCount - 1];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny =  dx / len;

    const midFactor = Math.sin((i / (pCount - 1)) * Math.PI);
    const swollenThick = pt.thickness * (1.0 + midFactor * 0.15);

    _fleshLoopLeft.push({ x: pt.x + nx * swollenThick, y: pt.y + ny * swollenThick });
    _fleshLoopRight.push({ x: pt.x - nx * swollenThick, y: pt.y - ny * swollenThick });
  }

  ctx.save();
  ctx.globalAlpha = fadeOutAlpha;

  // B. Flesh / Obsidian Body Fill
  ctx.beginPath();
  ctx.moveTo(_fleshLoopLeft[0].x, _fleshLoopLeft[0].y);
  for (let p = 1; p < _fleshLoopLeft.length; p++) {
    ctx.lineTo(_fleshLoopLeft[p].x, _fleshLoopLeft[p].y);
  }
  for (let p = _fleshLoopRight.length - 1; p >= 0; p--) {
    ctx.lineTo(_fleshLoopRight[p].x, _fleshLoopRight[p].y);
  }
  ctx.closePath();

  if (isFrozenByInfinity) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
    ctx.fill();

    // C. Natural Side Edge Contour Strokes
    ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#000000';
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(_fleshLoopLeft[0].x, _fleshLoopLeft[0].y);
    for (let p = 1; p < _fleshLoopLeft.length; p++) {
      ctx.lineTo(_fleshLoopLeft[p].x, _fleshLoopLeft[p].y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(_fleshLoopRight[0].x, _fleshLoopRight[0].y);
    for (let p = 1; p < _fleshLoopRight.length; p++) {
      ctx.lineTo(_fleshLoopRight[p].x, _fleshLoopRight[p].y);
    }
    ctx.stroke();

    // D. Volumetric Top Spine Highlight
    if (pCount >= 4) {
      ctx.strokeStyle = isTransformed ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.60)';
      ctx.lineWidth = isTransformed ? 2.5 : 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const startIdx = Math.floor(pCount * 0.15);
      const endIdx = Math.floor(pCount * 0.85);
      ctx.moveTo(points[startIdx].x, points[startIdx].y - 2);
      for (let i = startIdx + 1; i <= endIdx; i++) {
        ctx.lineTo(points[i].x, points[i].y - 2);
      }
      ctx.stroke();
    }

    // E. Surgical Cross-Stitches
    if (!isTransformed && pCount >= 4 && maxBands > 0) {
      for (let s = 1; s <= maxBands; s++) {
        const idx = Math.floor((pCount / (maxBands + 1)) * s);
        const lp = _fleshLoopLeft[idx];
        const rp = _fleshLoopRight[idx];
        if (lp && rp) {
          drawSuture(ctx, lp.x, lp.y, rp.x, rp.y, 3, 3.8, '#000000');
        }
      }
    }
  }

  ctx.restore();
}

/**
 * Standalone Weapon Preview Drawer for Mahito's 4-Blade Curved Talon Claws in Weapon Menu / Arsenal.
 * Exact 1:1 match to reference artwork.
 */
export function drawMahitoClawWeapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, isTransformed = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  const baseClawScale = isTransformed ? 0.90 : 0.70;
  const customScale = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.weaponScale !== undefined) ? state.weaponCustomizations.mahito.weaponScale : 1.0;
  const clawScale = baseClawScale * customScale;
  const handRadius = 7.0 * customScale;
  const handX = r;
  const handY = 0;

  // 1. Billowing Cursed Energy flame aura behind hand & knuckles
  const now = Date.now() * 0.005;
  ctx.save();
  ctx.translate(handX - handRadius * 0.3, handY);

  const ceRadius = handRadius * 2.6;
  const numFlamePts = 10;
  for (let i = 0; i < numFlamePts; i++) {
    const ang = (Math.PI * 2 / numFlamePts) * i;
    const wave = Math.sin(now * 3.2 + i * 1.6) * (handRadius * 0.4);
    const stretch = Math.cos(ang) > 0.1 ? handRadius * 0.8 : -handRadius * 0.3;
    const curR = ceRadius + wave + stretch;
    _clawFlamePts[i].x = Math.cos(ang) * curR;
    _clawFlamePts[i].y = Math.sin(ang) * curR;
  }

  ctx.beginPath();
  let fmx = (_clawFlamePts[numFlamePts - 1].x + _clawFlamePts[0].x) / 2;
  let fmy = (_clawFlamePts[numFlamePts - 1].y + _clawFlamePts[0].y) / 2;
  ctx.moveTo(fmx, fmy);
  for (let i = 0; i < numFlamePts; i++) {
    const nextIdx = (i + 1) % numFlamePts;
    const midX = (_clawFlamePts[i].x + _clawFlamePts[nextIdx].x) / 2;
    const midY = (_clawFlamePts[i].y + _clawFlamePts[nextIdx].y) / 2;
    ctx.quadraticCurveTo(_clawFlamePts[i].x, _clawFlamePts[i].y, midX, midY);
  }
  ctx.closePath();
  ctx.fillStyle = isTransformed ? 'rgba(217, 70, 239, 0.55)' : 'rgba(147, 51, 234, 0.45)';
  ctx.fill();

  // Darker inner cursed core
  ctx.beginPath();
  ctx.arc(handRadius * 0.2, 0, handRadius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = isTransformed ? 'rgba(168, 85, 247, 0.35)' : 'rgba(126, 34, 206, 0.35)';
  ctx.fill();
  ctx.restore();

  // 2. Hand Circle Fist Base
  ctx.beginPath();
  ctx.arc(handX, handY, handRadius, 0, Math.PI * 2);
  if (isTransformed) {
    ctx.fillStyle = '#0E1322';
    ctx.fill();
    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#EEF3F7';
    ctx.fill();
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawSuture(ctx, handX - handRadius * 0.6, handY, handX + handRadius * 0.6, handY, 2, 2.0, '#181C26');
  }

  // Draw morph blades with static buffer
  drawMahitoStaticClawBlades(ctx, r, handX, handY, isTransformed, 1.0, true, null);

  ctx.restore();
}

/**
 * Draws Mahito's 4-Blade Needle Claw Morph with high-performance static caching.
 */
export function drawMahitoStaticClawBlades(ctx, r, handX, handY, isTransformed, progress, isRightPunch, fighter) {
  const baseClawScale = isTransformed ? 0.90 : 0.70;
  const customScale = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.weaponScale !== undefined) ? state.weaponCustomizations.mahito.weaponScale : 1.0;
  const clawScale = baseClawScale * customScale;
  const s = clawScale / 0.70;

  const rawBlades = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.blades) || state.mahitoClawCustomBlades;

  for (let i = 0; i < 4; i++) {
    const src = (rawBlades && rawBlades[i]) ? rawBlades[i] : { idx: i, knuckleX: 3, knuckleY: -6, fanAngle: 0, length: 82, heelWidth: 14, topArchY: -14, tipY: 16 };
    const dst = _mappedBlades[i];
    dst.idx = src.idx !== undefined ? src.idx : i;
    dst.knuckleX = handX + (src.knuckleX || 0) * s;
    dst.knuckleY = handY + (src.knuckleY || 0) * s;
    dst.fanAngle = src.fanAngle || 0;
    dst.length = (src.length || 80) * clawScale;
    dst.heelWidth = (src.heelWidth || 14) * clawScale;
    dst.topArchY = (src.topArchY || 0) * clawScale;
    dst.tipY = (src.tipY || 0) * clawScale;
  }

  const drawOrder = (state.weaponCustomizations && state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.drawOrder) || [0, 1, 2, 3];

  for (let d = 0; d < 4; d++) {
    const bIdx = drawOrder[d] !== undefined ? drawOrder[d] : d;
    const b = _mappedBlades[bIdx];
    if (!b) continue;

    ctx.save();
    ctx.translate(b.knuckleX, b.knuckleY);
    ctx.rotate(b.fanAngle);

    const blen = b.length;
    const hw = b.heelWidth;
    const halfHw = hw * 0.5;

    // 1. Knuckle Socket Cap & Collar
    ctx.beginPath();
    ctx.ellipse(-2.5 * clawScale, 0, 3.5 * clawScale, halfHw * 0.75, 0, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.lineTo(-4.5 * clawScale, 0);
    ctx.closePath();
    ctx.fillStyle = isTransformed ? '#1E142B' : '#64748B';
    ctx.fill();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-2.0 * clawScale, 0, halfHw * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = isTransformed ? '#2A1B3D' : '#94A3B8';
    ctx.fill();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-2.8 * clawScale, 0, 2.8 * clawScale, halfHw * 0.65, 0, 0, Math.PI * 2);
    ctx.fillStyle = isTransformed ? '#0E1322' : '#CBD5E1';
    ctx.fill();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // 2. Blade Geometry Coordinates
    const neckTopY  = -halfHw * 0.35;
    const neckBotY  = halfHw * 0.35;
    const heelTopX  = 5.0 * clawScale;
    const heelTopY  = -halfHw * 0.65;
    const notchInX  = 4.0 * clawScale;
    const notchInY  = halfHw * 0.25;
    const heelBotX  = 7.5 * clawScale;
    const heelBotY  = halfHw * 0.85;
    const tipX      = blen;
    const tipY      = b.tipY;
    const midSpineY = b.topArchY - halfHw * 0.35;
    const midBellyY = b.topArchY + halfHw * 0.55;

    // 3. Upper Spine Facet (Gleaming Polished Silver)
    ctx.beginPath();
    ctx.moveTo(0, neckTopY);
    ctx.lineTo(heelTopX, heelTopY);
    ctx.quadraticCurveTo(blen * 0.45, midSpineY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, heelTopX, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = isTransformed ? '#2A1B3D' : '#F8FAFC';
    ctx.fill();

    // 4. Lower Underside Facet (Dark Steel Shadow)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(heelTopX, 0);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.48, midBellyY, heelBotX, heelBotY);
    ctx.lineTo(notchInX, notchInY);
    ctx.lineTo(0, neckBotY);
    ctx.closePath();
    ctx.fillStyle = isTransformed ? '#0E1322' : '#334155';
    ctx.fill();

    // Lower cutting edge razor highlight
    if (!isTransformed) {
      ctx.beginPath();
      ctx.moveTo(heelBotX, heelBotY);
      ctx.quadraticCurveTo(blen * 0.48, midBellyY, tipX, tipY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // 5. Ink Outline
    ctx.beginPath();
    ctx.moveTo(0, neckTopY);
    ctx.lineTo(heelTopX, heelTopY);
    ctx.quadraticCurveTo(blen * 0.45, midSpineY, tipX, tipY);
    ctx.quadraticCurveTo(blen * 0.48, midBellyY, heelBotX, heelBotY);
    ctx.lineTo(notchInX, notchInY);
    ctx.lineTo(0, neckBotY);
    ctx.closePath();
    ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
    ctx.lineWidth = isTransformed ? 1.4 : 1.2;
    ctx.stroke();

    // Center Crease Dividing Line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(heelTopX, 0);
    ctx.quadraticCurveTo(blen * 0.50, b.topArchY, blen * 0.82, b.topArchY * 0.82 + tipY * 0.18);
    ctx.strokeStyle = isTransformed ? '#F5D0FE' : '#94A3B8';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // 6. Crimson Dipped Tip
    const tStart = 0.80;
    const mtS = 1 - tStart;
    const pTopTipX = mtS * mtS * heelTopX + 2 * mtS * tStart * (blen * 0.45) + tStart * tStart * tipX;
    const pTopTipY = mtS * mtS * heelTopY + 2 * mtS * tStart * midSpineY + tStart * tStart * tipY;
    const pBotTipX = mtS * mtS * heelBotX + 2 * mtS * tStart * (blen * 0.48) + tStart * tStart * tipX;
    const pBotTipY = mtS * mtS * heelBotY + 2 * mtS * tStart * midBellyY + tStart * tStart * tipY;

    ctx.beginPath();
    ctx.moveTo(pTopTipX, pTopTipY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(pBotTipX, pBotTipY);
    ctx.closePath();
    ctx.fillStyle = isTransformed ? '#F5D0FE' : '#DC2626';
    ctx.fill();
    if (!isTransformed) {
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 7. Dual Diagonal Crimson Accent Stripes
      for (let s = 0; s < 2; s++) {
        const s1 = s === 0 ? 0.58 : 0.66;
        const s2 = s === 0 ? 0.63 : 0.71;
        const mt1 = 1 - s1, mt2 = 1 - s2;
        const pt1X = mt1 * mt1 * heelTopX + 2 * mt1 * s1 * (blen * 0.45) + s1 * s1 * tipX;
        const pt1Y = mt1 * mt1 * heelTopY + 2 * mt1 * s1 * midSpineY + s1 * s1 * tipY;
        const pt2X = mt2 * mt2 * heelTopX + 2 * mt2 * s2 * (blen * 0.45) + s2 * s2 * tipX;
        const pt2Y = mt2 * mt2 * heelTopY + 2 * mt2 * s2 * midSpineY + s2 * s2 * tipY;

        const pb1X = mt1 * mt1 * heelBotX + 2 * mt1 * s1 * (blen * 0.48) + s1 * s1 * tipX;
        const pb1Y = mt1 * mt1 * heelBotY + 2 * mt1 * s1 * midBellyY + s1 * s1 * tipY;
        const pb2X = mt2 * mt2 * heelBotX + 2 * mt2 * s2 * (blen * 0.48) + s2 * s2 * tipX;
        const pb2Y = mt2 * mt2 * heelBotY + 2 * mt2 * s2 * midBellyY + s2 * s2 * tipY;

        ctx.beginPath();
        ctx.moveTo(pt1X, pt1Y);
        ctx.lineTo(pt2X, pt2Y);
        ctx.lineTo(pb2X - 1.5 * clawScale, pb2Y);
        ctx.lineTo(pb1X - 1.5 * clawScale, pb1Y);
        ctx.closePath();
        ctx.fillStyle = '#DC2626';
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

/**
 * Renders Mahito's 3rd Skill: Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel Explosion).
 * - Muscular stretched flesh arm connecting chest socket to moving tip
 * - Fist morphing & swelling into giant spiked mace ball as it approaches target
 * - High-contrast two-tone beveling, glowing magenta CE core veins, protruding bone spikes
 * - Flying 4-point razor shrapnel spikes radiating outward
 */
export function drawMahitoMaceCannon(ctx, fighter) {
  const data = fighter._maceCannonData;
  if (!data) return;

  const r = fighter.r || 25;
  const facingAngle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(facingAngle) > Math.PI / 2;
  const localBackX = r * 0.70;
  const localBackY = facingLeft ? (r * 0.18) : (-r * 0.18);
  const cosA = Math.cos(facingAngle);
  const sinA = Math.sin(facingAngle);
  const currentX = fighter.x + (localBackX * cosA - localBackY * sinA);
  const currentY = fighter.y + (localBackX * sinA + localBackY * cosA);
  const tipX = data.currentTipX;
  const tipY = data.currentTipY;
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);
  const cfg = CONFIG.mahito || {};
  const cannonCfg = cfg.maceCannon || {};
  const baseThick = isTransformed ? 12 : 9;

  ctx.save();

  // Clip Mahito's Skill 3 (Mutated Mace Cannon) to the arena boundaries
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (arena) {
    ctx.beginPath();
    if (arena.shape === 'circle') {
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = arena.radius || (arena.width / 2);
      ctx.arc(cx, cy, ar, 0, Math.PI * 2);
    } else {
      ctx.rect(arena.x, arena.y, arena.width, arena.height);
    }
    ctx.clip();
  }

  // 1. Draw Flying Razor Bone Shrapnel Spikes in World Space
  if (data.shrapnelSpikes && data.shrapnelSpikes.length > 0) {
    for (let i = 0; i < data.shrapnelSpikes.length; i++) {
      const spk = data.shrapnelSpikes[i];
      if (spk.life <= 0) continue;
      const alpha = Math.min(1.0, spk.life / (spk.maxLife * 0.3));

      ctx.save();
      ctx.translate(spk.x, spk.y);
      ctx.rotate(spk.angle);
      ctx.globalAlpha = alpha;

      const sLen = spk.length;
      const halfW = spk.width * 0.5;

      // Sharp 4-point needle bone spike polygon (Rule #16 compliant)
      ctx.beginPath();
      ctx.moveTo(-sLen * 0.4, 0);       // sharp trailing tail
      ctx.lineTo(0, -halfW);            // top edge
      ctx.lineTo(sLen * 0.6, 0);        // leading needle tip
      ctx.lineTo(0, halfW);             // bottom edge
      ctx.closePath();

      if (spk.isFrozenByInfinity) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (spk.isTransformed) {
        ctx.fillStyle = '#0E1322';
        ctx.fill();
        ctx.strokeStyle = '#D946EF';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Glowing core line
        ctx.beginPath();
        ctx.moveTo(-sLen * 0.3, 0);
        ctx.lineTo(sLen * 0.5, 0);
        ctx.strokeStyle = '#F5D0FE';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#CBD5E1';
        ctx.fill();
        ctx.strokeStyle = '#181C26';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Crimson dipped tip
        ctx.beginPath();
        ctx.moveTo(sLen * 0.3, -halfW * 0.5);
        ctx.lineTo(sLen * 0.6, 0);
        ctx.lineTo(sLen * 0.3, halfW * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#DC2626';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 2. Draw Stretched Flesh Arm (24-30 FPS Stepped Sakuga Trailing Thread Physics)
  const distToTip = Math.hypot(tipX - currentX, tipY - currentY);
  const rawProg = data.maceProgress || 0;
  const mProg = Math.floor(rawProg * 30) / 30; // 30 FPS anime keyframe quantization
  const baseMaceR = isTransformed ? (cannonCfg.maceRadiusTransformed || 29) : (cannonCfg.maceRadiusBase || 22);
  const fistR = isTransformed ? 10 : 8.5;
  const ballProg = Math.min(1.0, mProg / 0.68);
  const ballEased = Math.sin(ballProg * Math.PI * 0.5);
  const currentHeadR = fistR + (baseMaceR - fistR) * ballEased;

  const nodes = data.steppedNodes || data.armNodes;
  if (distToTip > 2.0) {
    _maceSplinePoints.length = 0;

    if (nodes && nodes.length >= 2) {
      const numSamples = 12;
      for (let s = 0; s <= numSamples; s++) {
        const pct = s / numSamples;
        const floatIdx = pct * (nodes.length - 1);
        const i0 = Math.floor(floatIdx);
        const i1 = Math.min(nodes.length - 1, i0 + 1);
        const t = floatIdx - i0;

        const p0 = nodes[Math.max(0, i0 - 1)];
        const p1 = nodes[i0];
        const p2 = nodes[i1];
        const p3 = nodes[Math.min(nodes.length - 1, i1 + 1)];

        const t2 = t * t;
        const t3 = t2 * t;

        const px = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const py = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        let thick = baseThick;
        if (pct > 0.50 && mProg > 0.15) {
          const flareP = (pct - 0.50) / 0.50;
          const targetNeckThick = currentHeadR * 0.90;
          thick = baseThick + (targetNeckThick - baseThick) * (flareP * flareP);
        } else {
          thick = baseThick * (1.0 - 0.08 * pct);
        }

        _maceSplinePoints.push({ x: px, y: py, isUnderground: false, thickness: thick });
      }
    } else {
      _maceSplinePoints.push({ x: currentX, y: currentY, isUnderground: false, thickness: baseThick });
      _maceSplinePoints.push({ x: tipX, y: tipY, isUnderground: false, thickness: mProg > 0.15 ? currentHeadR * 0.90 : baseThick });
    }

    if (_maceSplinePoints.length >= 2) {
      drawFleshLoop(ctx, _maceSplinePoints, isTransformed, 1.0, 2, data.isFrozenByInfinity);
    }
  }

  // 3. Draw Chest/Shoulder Stretch Socket on Body
  const socketRadius = isTransformed ? 9.5 : 8.5;
  ctx.save();
  ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
  ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#3B0764';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(currentX, currentY, socketRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Viscous Cursed Energy glow on socket aperture
  ctx.strokeStyle = 'rgba(217, 70, 239, 0.75)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(currentX, currentY, socketRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 4. Draw End of Arm: Fist swelling into flesh ball first, then spikes instantly popping out
  if (distToTip > 1.0 && !data.hasDetonated) {
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(data.angle || 0);

    // Billowing Cursed Energy Aura around expanding flesh ball
    const ceR = currentHeadR * (1.25 + 0.45 * mProg);
    const now = Date.now() * 0.006;
    ctx.fillStyle = isTransformed ? 'rgba(217, 70, 239, 0.45)' : 'rgba(147, 51, 234, 0.40)';
    ctx.beginPath();
    ctx.arc(0, 0, ceR + Math.sin(now * 3) * 3, 0, Math.PI * 2);
    ctx.fill();

    if (mProg < 0.15) {
      // Draw standard starting fist
      drawArticulatedFist(ctx, 0, 0, currentHeadR, isTransformed, 0, true);
    } else {
      const spikeDefs = data.spikes || [];

      // ── Stage 2A: Draw Perimeter Bone Spikes (Behind / Erupting through organic deformed rim) ──
      if (mProg >= 0.68) {
        for (let i = 0; i < spikeDefs.length; i++) {
          const spk = spikeDefs[i];
          if (spk.isSurface) continue; // Surface spikes drawn after body for depth

          const spkMorphProg = Math.max(0, (mProg - 0.68 - (spk.popDelay || 0)) / 0.10);
          const spikeEased = spkMorphProg >= 1.0 ? 1.0 : (1 - Math.pow(1 - Math.min(1.0, spkMorphProg), 3.5));
          if (spikeEased <= 0.02) continue;

          const ang = spk.angle;
          const tipAng = ang + (spk.curveOffset || 0);

          // Sample exact organic deformed hull radius at this angle
          const defWave = Math.sin(ang * 2 + 1.1) * 0.16 + Math.cos(ang * 3 + 0.4) * 0.12 + Math.sin(ang * 5) * 0.06;
          const localHullR = currentHeadR * (1.0 + defWave);

          const baseSpikeMaxLen = (isTransformed ? 18 : 14) * (spk.lenMult || 1.0);
          const spikeMaxLen = baseSpikeMaxLen * spikeEased;
          const baseW = (isTransformed ? 5.5 : 4.2) * (spk.widthMult || 1.0) * spikeEased;

          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const perpX = -Math.sin(tipAng) * baseW;
          const perpY =  Math.cos(tipAng) * baseW;

          const basePtX = cosA * (localHullR * 0.86);
          const basePtY = sinA * (localHullR * 0.86);
          const tipPtX  = Math.cos(tipAng) * (localHullR + spikeMaxLen);
          const tipPtY  = Math.sin(tipAng) * (localHullR + spikeMaxLen);

          // Left facet (Highlight side)
          ctx.beginPath();
          ctx.moveTo(basePtX + perpX, basePtY + perpY);
          ctx.lineTo(tipPtX, tipPtY);
          ctx.lineTo(basePtX, basePtY);
          ctx.closePath();
          ctx.fillStyle = isTransformed ? '#F5D0FE' : '#FFFFFF';
          ctx.fill();

          // Right facet (Shadow side)
          ctx.beginPath();
          ctx.moveTo(basePtX, basePtY);
          ctx.lineTo(tipPtX, tipPtY);
          ctx.lineTo(basePtX - perpX, basePtY - perpY);
          ctx.closePath();
          ctx.fillStyle = isTransformed ? '#C026D3' : '#64748B';
          ctx.fill();

          // Sharp razor outline
          ctx.beginPath();
          ctx.moveTo(basePtX + perpX, basePtY + perpY);
          ctx.lineTo(tipPtX, tipPtY);
          ctx.lineTo(basePtX - perpX, basePtY - perpY);
          ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
          ctx.lineWidth = 1.3;
          ctx.stroke();

          // Crimson blood-stained tip & root socket
          if (!isTransformed) {
            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.moveTo(tipPtX - Math.cos(tipAng) * 4 + perpX * 0.3, tipPtY - Math.sin(tipAng) * 4 + perpY * 0.3);
            ctx.lineTo(tipPtX, tipPtY);
            ctx.lineTo(tipPtX - Math.cos(tipAng) * 4 - perpX * 0.3, tipPtY - Math.sin(tipAng) * 4 - perpY * 0.3);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // ── Main Asymmetrical Mutated Flesh Hull (Seamlessly Fused with Forearm) ──
      // Calculate 16 organic hull vertices deformed with harmonic waves
      const numHullPts = 16;
      const hullPts = [];
      for (let p = 0; p < numHullPts; p++) {
        const hAng = (Math.PI * 2 / numHullPts) * p;
        const defWave = Math.sin(hAng * 2 + 1.1) * 0.16 + Math.cos(hAng * 3 + 0.4) * 0.12 + Math.sin(hAng * 5) * 0.06;
        const hr = currentHeadR * (1.0 + defWave);
        hullPts.push({
          x: Math.cos(hAng) * hr,
          y: Math.sin(hAng) * hr,
          r: hr
        });
      }

      // 1. Organic muscle lobes bulging asymmetrically around the forward/side hull
      const lobeOffsets = [
        { ang: 0.6, dist: 0.68, rFrac: 0.48 },
        { ang: 1.5, dist: 0.60, rFrac: 0.42 },
        { ang: -0.8, dist: 0.70, rFrac: 0.50 },
        { ang: -1.6, dist: 0.64, rFrac: 0.44 }
      ];

      for (let l = 0; l < lobeOffsets.length; l++) {
        const lob = lobeOffsets[l];
        const lx = Math.cos(lob.ang) * (currentHeadR * lob.dist);
        const ly = Math.sin(lob.ang) * (currentHeadR * lob.dist);
        const lr = currentHeadR * lob.rFrac;

        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        if (isTransformed) {
          ctx.fillStyle = '#140E24';
          ctx.fill();
          ctx.strokeStyle = '#3B0764';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#CBD5E1';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // 2. Procedural Smooth Asymmetrical Flesh Body (with open seamless neck collar)
      const neckThickHalf = currentHeadR * 0.45;
      const neckBackX = -currentHeadR * 1.15;

      ctx.beginPath();
      // Start at the top edge of the arm shaft
      ctx.moveTo(neckBackX, -neckThickHalf);

      // Curve through the top, front, and bottom perimeter of the mutating head
      for (let p = 12; p < numHullPts; p++) {
        const nextPt = hullPts[(p + 1) % numHullPts];
        const curPt = hullPts[p];
        const midX = (curPt.x + nextPt.x) / 2;
        const midY = (curPt.y + nextPt.y) / 2;
        ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
      }
      for (let p = 0; p <= 5; p++) {
        const nextPt = hullPts[(p + 1) % numHullPts];
        const curPt = hullPts[p];
        const midX = (curPt.x + nextPt.x) / 2;
        const midY = (curPt.y + nextPt.y) / 2;
        ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
      }

      // Connect to the bottom edge of the arm shaft
      ctx.lineTo(neckBackX, neckThickHalf);
      ctx.lineTo(neckBackX, -neckThickHalf);
      ctx.closePath();

      if (isTransformed) {
        const carGrad = ctx.createRadialGradient(-currentHeadR * 0.25, -currentHeadR * 0.25, 2, 0, 0, currentHeadR * 1.25);
        carGrad.addColorStop(0, '#2A1B3D');
        carGrad.addColorStop(0.6, '#0E1322');
        carGrad.addColorStop(1.0, '#050508');
        ctx.fillStyle = carGrad;
        ctx.fill();

        // Glowing outer outline along the outer contour only (leaving the arm neck seam open)
        ctx.strokeStyle = '#D946EF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(neckBackX, -neckThickHalf);
        for (let p = 12; p < numHullPts; p++) {
          const nextPt = hullPts[(p + 1) % numHullPts];
          const curPt = hullPts[p];
          const midX = (curPt.x + nextPt.x) / 2;
          const midY = (curPt.y + nextPt.y) / 2;
          ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
        }
        for (let p = 0; p <= 5; p++) {
          const nextPt = hullPts[(p + 1) % numHullPts];
          const curPt = hullPts[p];
          const midX = (curPt.x + nextPt.x) / 2;
          const midY = (curPt.y + nextPt.y) / 2;
          ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
        }
        ctx.lineTo(neckBackX, neckThickHalf);
        ctx.stroke();

        // Pulsating Magenta Core Veins
        ctx.fillStyle = '#D946EF';
        ctx.beginPath();
        ctx.arc(currentHeadR * 0.05, -currentHeadR * 0.05, currentHeadR * 0.44, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(currentHeadR * 0.05, -currentHeadR * 0.05, currentHeadR * 0.20, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const fleshGrad = ctx.createRadialGradient(-currentHeadR * 0.35, -currentHeadR * 0.35, 2, 0, 0, currentHeadR * 1.25);
        fleshGrad.addColorStop(0, '#FFFFFF');
        fleshGrad.addColorStop(0.35, '#EEF3F7');
        fleshGrad.addColorStop(0.75, '#CBD5E1');
        fleshGrad.addColorStop(1.0, '#64748B');
        ctx.fillStyle = fleshGrad;
        ctx.fill();

        // Outer ink outline along the outer contour only (leaving the arm neck seam open)
        ctx.strokeStyle = '#181C26';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(neckBackX, -neckThickHalf);
        for (let p = 12; p < numHullPts; p++) {
          const nextPt = hullPts[(p + 1) % numHullPts];
          const curPt = hullPts[p];
          const midX = (curPt.x + nextPt.x) / 2;
          const midY = (curPt.y + nextPt.y) / 2;
          ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
        }
        for (let p = 0; p <= 5; p++) {
          const nextPt = hullPts[(p + 1) % numHullPts];
          const curPt = hullPts[p];
          const midX = (curPt.x + nextPt.x) / 2;
          const midY = (curPt.y + nextPt.y) / 2;
          ctx.quadraticCurveTo(curPt.x, curPt.y, midX, midY);
        }
        ctx.lineTo(neckBackX, neckThickHalf);
        ctx.stroke();

        // Muscle tendon striations streaming from the arm directly into the head
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(neckBackX, -neckThickHalf * 0.5);
        ctx.quadraticCurveTo(-currentHeadR * 0.3, -currentHeadR * 0.15, currentHeadR * 0.55, -currentHeadR * 0.30);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(neckBackX, neckThickHalf * 0.5);
        ctx.quadraticCurveTo(-currentHeadR * 0.2, currentHeadR * 0.20, currentHeadR * 0.45, currentHeadR * 0.40);
        ctx.stroke();

        // Surgical suture bands spanning across the neck collar and flesh lobes
        drawSuture(ctx, -currentHeadR * 0.90, -neckThickHalf * 0.85, -currentHeadR * 0.90, neckThickHalf * 0.85, 3, 2.8, '#181C26');
        drawSuture(ctx, -currentHeadR * 0.40, -currentHeadR * 0.15, currentHeadR * 0.45, -currentHeadR * 0.15, 3, 2.5, '#181C26');
        drawSuture(ctx, currentHeadR * 0.10, -currentHeadR * 0.55, -currentHeadR * 0.15, currentHeadR * 0.55, 3, 2.5, '#181C26');
      }

      // ── Stage 2B: Draw 3D Surface Depth Spikes (Protruding from front face) ──
      if (mProg >= 0.68) {
        for (let i = 0; i < spikeDefs.length; i++) {
          const spk = spikeDefs[i];
          if (!spk.isSurface) continue;

          const spkMorphProg = Math.max(0, (mProg - 0.68 - (spk.popDelay || 0)) / 0.10);
          const spikeEased = spkMorphProg >= 1.0 ? 1.0 : (1 - Math.pow(1 - Math.min(1.0, spkMorphProg), 3.5));
          if (spikeEased <= 0.02) continue;

          const rootDist = (spk.surfaceDist || 0.45) * currentHeadR;
          const rootX = Math.cos(spk.angle) * rootDist;
          const rootY = Math.sin(spk.angle) * rootDist;

          const tipLen = (isTransformed ? 15 : 12) * (spk.lenMult || 1.0) * spikeEased;
          const tipAng = spk.angle + (spk.curveOffset || 0);
          const tipX = rootX + Math.cos(tipAng) * tipLen;
          const tipY = rootY + Math.sin(tipAng) * tipLen;

          const baseW = (isTransformed ? 4.5 : 3.5) * (spk.widthMult || 1.0) * spikeEased;
          const perpX = -Math.sin(tipAng) * baseW;
          const perpY =  Math.cos(tipAng) * baseW;

          // Bruised root socket ring
          ctx.beginPath();
          ctx.arc(rootX, rootY, baseW * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = isTransformed ? '#2A1B3D' : 'rgba(153, 27, 27, 0.45)';
          ctx.fill();

          // Left facet highlight
          ctx.beginPath();
          ctx.moveTo(rootX + perpX, rootY + perpY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX, rootY);
          ctx.closePath();
          ctx.fillStyle = isTransformed ? '#F5D0FE' : '#FFFFFF';
          ctx.fill();

          // Right facet shadow
          ctx.beginPath();
          ctx.moveTo(rootX, rootY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX - perpX, rootY - perpY);
          ctx.closePath();
          ctx.fillStyle = isTransformed ? '#C026D3' : '#475569';
          ctx.fill();

          // Outline
          ctx.beginPath();
          ctx.moveTo(rootX + perpX, rootY + perpY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX - perpX, rootY - perpY);
          ctx.strokeStyle = isTransformed ? '#D946EF' : '#181C26';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    if (data.isFrozenByInfinity) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
      ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, currentHeadR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders a massive Gothic Grim Reaper Scythe Blade on Mahito's arm tip (Matching reference image).
 * - Aggressively arched convex back spine extending into a downward/inward hooked razor needle beak tip
 * - Deep concave inner sickle cutting edge
 * - Gothic bat-wing crest horns / spine thorns on the neck collar
 * - Glowing Cursed Energy inner sickle edge (Magenta / Lilac CE)
 * - Longitudinal dual-tone beveled steel blade facets with spine gleam
 * - Crimson dipped needle beak tip and diagonal blood stripes
 * - Patchwork surgical suture flesh collar socket
 */
function drawMahitoGrimReaperScythe(ctx, isTransformed, scytheScale, isMirrored, isFrozenByInfinity = false) {
  const blen = 94 * scytheScale;
  const baseW = 18 * scytheScale; // Ultra-slim, razor-sharp crescent base width

  const tipX = blen * 0.95;
  const tipY = baseW * 1.80; // Deep downward hooked crescent beak tip

  const spineCtrlX1 = blen * 0.35;
  const spineCtrlY1 = -baseW * 2.40; // High arched convex dorsal spine
  const spineCtrlX2 = blen * 0.82;
  const spineCtrlY2 = -baseW * 0.40;

  const bellyCtrlX1 = blen * 0.38;
  const bellyCtrlY1 = -baseW * 1.75; // Closely nested inner belly curve for a razor-thin crescent
  const bellyCtrlX2 = blen * 0.82;
  const bellyCtrlY2 = baseW * 0.30;

  const throatX = baseW * 0.35;
  const throatY = baseW * 0.15;

  // Shared dividing line points
  const p0 = { x: 0, y: -baseW * 0.25 };
  const p1 = { x: blen * 0.37, y: -baseW * 2.08 };
  const p2 = { x: blen * 0.82, y: -baseW * 0.05 };
  const p3 = { x: tipX, y: tipY };

  ctx.save();
  if (isMirrored) {
    ctx.scale(1, -1);
  }



  // 2. Flesh Collar & Surgical Suture Socket
  ctx.save();
  ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
  ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#000000';
  ctx.lineWidth = isTransformed ? 1.8 : 1.6;
  
  // Fill the collar socket area to cover gaps
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.quadraticCurveTo(-9, 0, 0, 13);
  ctx.lineTo(throatX, throatY);
  ctx.lineTo(p0.x, p0.y);
  ctx.lineTo(0, -baseW * 0.6);
  ctx.closePath();
  ctx.fill();

  if (!isTransformed) {
    drawSuture(ctx, -baseW * 0.25, -baseW * 0.35, -baseW * 0.25, baseW * 0.35, 3, 2.2, '#000000');
  }
  ctx.restore();

  // A. Inner Cutting Edge / Lower Facet (Skin-Themed Darker Grey to Match Hands)
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  ctx.bezierCurveTo(bellyCtrlX2, bellyCtrlY2, bellyCtrlX1, bellyCtrlY1, throatX + 11 * scytheScale, throatY + 3 * scytheScale);
  ctx.lineTo(throatX + 5 * scytheScale, throatY + 9 * scytheScale);
  ctx.lineTo(throatX, throatY);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();

  if (isTransformed) {
    ctx.fillStyle = '#0E1322';
    ctx.fill();
  } else {
    ctx.fillStyle = '#E2E8F0'; // Darker grey skin patch to match hands
    ctx.fill();
  }

  // White razor sharp hone line
  ctx.beginPath();
  ctx.moveTo(throatX + 11 * scytheScale, throatY + 3 * scytheScale);
  ctx.bezierCurveTo(bellyCtrlX1, bellyCtrlY1, bellyCtrlX2, bellyCtrlY2, tipX, tipY);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0 * scytheScale;
  ctx.stroke();

  // B. Upper Convex Spine Facet (Skin-Themed Porcelain Bevel to Match Hands)
  ctx.beginPath();
  ctx.moveTo(0, -baseW * 0.6);
  ctx.bezierCurveTo(spineCtrlX1, spineCtrlY1, spineCtrlX2, spineCtrlY2, tipX, tipY);
  ctx.bezierCurveTo(p2.x, p2.y, p1.x, p1.y, p0.x, p0.y);
  ctx.lineTo(0, -baseW * 0.6);
  ctx.closePath();

  if (isTransformed) {
    ctx.fillStyle = '#2A1B3D';
    ctx.fill();
  } else {
    ctx.fillStyle = '#EEF3F7'; // Pale porcelain skin tone to match hands
    ctx.fill();
  }

  // D. Master Gothic Ink Outline (Single unbroken continuous perimeter outline)
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.quadraticCurveTo(-9, 0, 0, -13);
  ctx.lineTo(0, -baseW * 0.6);
  ctx.bezierCurveTo(spineCtrlX1, spineCtrlY1, spineCtrlX2, spineCtrlY2, tipX, tipY);
  ctx.bezierCurveTo(bellyCtrlX2, bellyCtrlY2, bellyCtrlX1, bellyCtrlY1, throatX + 11 * scytheScale, throatY + 3 * scytheScale);
  ctx.lineTo(throatX + 5 * scytheScale, throatY + 9 * scytheScale);
  ctx.lineTo(throatX, throatY);
  ctx.lineTo(0, 13);
  ctx.closePath();

  ctx.strokeStyle = isTransformed ? '#D946EF' : '#000000';
  ctx.lineWidth = isTransformed ? 2.4 : 1.6; // Matches hand outline width (1.6)
  ctx.stroke();

  // E. Longitudinal Center Ridge Spine Suture Line
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  ctx.strokeStyle = isTransformed ? '#F5D0FE' : '#000000';
  ctx.lineWidth = isTransformed ? 1.6 : 1.1;
  ctx.stroke();

  // Draw cross-stitches along the center ridge curve in base form
  if (!isTransformed) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.1;

    const getBezierPt = (t) => {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
      };
    };

    const getBezierTangent = (t) => {
      const mt = 1 - t;
      const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      const len = Math.hypot(dx, dy) || 1;
      return { nx: -dy / len, ny: dx / len };
    };

    // 3 cross-stitches: pair of 2 close lines + 1 isolated line far away (|| ... |)
    const pairT = [0.22, 0.38, 0.80];
    const crossLen = 3.6 * scytheScale;
    ctx.lineWidth = 2.0;
    for (let i = 0; i < pairT.length; i++) {
      const t = pairT[i];
      const pt = getBezierPt(t);
      const norm = getBezierTangent(t);

      ctx.beginPath();
      ctx.moveTo(pt.x - norm.nx * crossLen, pt.y - norm.ny * crossLen);
      ctx.lineTo(pt.x + norm.nx * crossLen, pt.y + norm.ny * crossLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x - norm.nx * crossLen, pt.y - norm.ny * crossLen, 0.8, 0, Math.PI * 2);
      ctx.arc(pt.x + norm.nx * crossLen, pt.y + norm.ny * crossLen, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // F. Crimson Dipped Hook tip
  ctx.beginPath();
  ctx.moveTo(blen * 0.78, baseW * 0.20);
  ctx.bezierCurveTo(blen * 0.88, baseW * 0.80, blen * 0.94, baseW * 1.20, tipX, tipY);
  ctx.quadraticCurveTo(blen * 0.84, baseW * 1.20, blen * 0.76, baseW * 0.60);
  ctx.closePath();
  ctx.fillStyle = '#DC2626';
  ctx.fill();
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // G. Dual Diagonal Crimson Accent Blood Stripes (//)
  if (!isTransformed) {
    const drawStripe = (frac) => {
      const sx = blen * frac;
      const sTopY = -baseW * 2.0 * (1 - frac) * 0.6 + tipY * frac - 5;
      const sBotY = -baseW * 0.6 * (1 - frac) * 0.6 + tipY * frac + 2;
      ctx.beginPath();
      ctx.moveTo(sx, sTopY);
      ctx.lineTo(sx + 3.0 * scytheScale, sTopY);
      ctx.lineTo(sx - 2.0 * scytheScale, sBotY);
      ctx.lineTo(sx - 5.0 * scytheScale, sBotY);
      ctx.closePath();
      ctx.fillStyle = '#DC2626';
      ctx.fill();
    };
    drawStripe(0.52);
    drawStripe(0.64);
  }

  if (isFrozenByInfinity) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(-9, 0, 0, -13);
    ctx.lineTo(0, -baseW * 0.6);
    ctx.bezierCurveTo(spineCtrlX1, spineCtrlY1, spineCtrlX2, spineCtrlY2, tipX, tipY);
    ctx.bezierCurveTo(bellyCtrlX2, bellyCtrlY2, bellyCtrlX1, bellyCtrlY1, throatX + 11 * scytheScale, throatY + 3 * scytheScale);
    ctx.lineTo(throatX + 5 * scytheScale, throatY + 9 * scytheScale);
    ctx.lineTo(throatX, throatY);
    ctx.lineTo(0, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders Mahito's Fourth Skill: Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush).
 * - Twin stretched flesh arms arcing wide around the target
 * - Massive Gothic Grim Reaper Scythes on both tips facing inward
 * - Inward scissor guillotine cross-slash
 */
export function drawMahitoTwinScissor(ctx, fighter, layer = 'all') {
  const data = fighter._twinScissorData;
  if (!data) return;

  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);
  const baseThick = isTransformed ? 11 : 8.5;
  const cfg = CONFIG.mahito || {};

  const drawLeftArm = (layer === 'all' || layer === 'back');
  const drawRightArm = (layer === 'all' || layer === 'front');

  // Real-time anchor re-syncing so arms stay 100% attached to shoulders regardless of knockback/pushback
  const angle = data.angle !== undefined ? data.angle : (fighter.gunAngle || 0);
  const r = fighter.r || 25;
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const leftOriginX = fighter.x + (r * 0.70 * Math.cos(angle) - (facingLeft ? r * 0.18 : -r * 0.18) * Math.sin(angle));
  const leftOriginY = fighter.y + (r * 0.70 * Math.sin(angle) + (facingLeft ? r * 0.18 : -r * 0.18) * Math.cos(angle));
  const rightOriginX = fighter.x + (r * 0.45 * Math.cos(angle) - (facingLeft ? -r * 0.18 : r * 0.18) * Math.sin(angle));
  const rightOriginY = fighter.y + (r * 0.45 * Math.sin(angle) + (facingLeft ? -r * 0.18 : r * 0.18) * Math.cos(angle));

  data.leftOriginX = leftOriginX;
  data.leftOriginY = leftOriginY;
  data.rightOriginX = rightOriginX;
  data.rightOriginY = rightOriginY;

  if (data.leftNodes && data.leftNodes.length > 0) {
    data.leftNodes[0].x = leftOriginX;
    data.leftNodes[0].y = leftOriginY;
  }
  if (data.rightNodes && data.rightNodes.length > 0) {
    data.rightNodes[0].x = rightOriginX;
    data.rightNodes[0].y = rightOriginY;
  }
  if (data.steppedLeftNodes && data.steppedLeftNodes.length > 0) {
    data.steppedLeftNodes[0].x = leftOriginX;
    data.steppedLeftNodes[0].y = leftOriginY;
  }
  if (data.steppedRightNodes && data.steppedRightNodes.length > 0) {
    data.steppedRightNodes[0].x = rightOriginX;
    data.steppedRightNodes[0].y = rightOriginY;
  }

  ctx.save();

  // 1. Draw Left Stretch Arm (Back Arm)
  if (drawLeftArm) {
    const leftNodes = data.steppedLeftNodes || data.leftNodes;
    const distToLeft = Math.hypot(data.leftTipX - leftOriginX, data.leftTipY - leftOriginY);
    if (distToLeft > 2.0 && leftNodes && leftNodes.length >= 2) {
      _scissorLeftPoints.length = 0;
      const numSamples = 10;
      for (let s = 0; s <= numSamples; s++) {
        const pct = s / numSamples;
        const floatIdx = pct * (leftNodes.length - 1);
        const i0 = Math.floor(floatIdx);
        const i1 = Math.min(leftNodes.length - 1, i0 + 1);
        const t = floatIdx - i0;

        const p0 = leftNodes[Math.max(0, i0 - 1)];
        const p1 = leftNodes[i0];
        const p2 = leftNodes[i1];
        const p3 = leftNodes[Math.min(leftNodes.length - 1, i1 + 1)];

        const t2 = t * t;
        const t3 = t2 * t;

        const px = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const py = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        let thick = baseThick;
        if (pct > 0.60 && data.morphProgress > 0.15) {
          const flareP = (pct - 0.60) / 0.40;
          thick = baseThick + (18 - baseThick) * (flareP * flareP);
        } else {
          thick = baseThick * (1.0 - 0.08 * pct);
        }
        _scissorLeftPoints.push({ x: px, y: py, isUnderground: false, thickness: thick });
      }

      if (_scissorLeftPoints.length >= 2) {
        drawFleshLoop(ctx, _scissorLeftPoints, isTransformed, 1.0, 2, data.isFrozenByInfinity);
      }
    }
  }

  // 2. Draw Right Stretch Arm (Front Arm)
  if (drawRightArm) {
    const rightNodes = data.steppedRightNodes || data.rightNodes;
    const distToRight = Math.hypot(data.rightTipX - rightOriginX, data.rightTipY - rightOriginY);
    if (distToRight > 2.0 && rightNodes && rightNodes.length >= 2) {
      _scissorRightPoints.length = 0;
      const numSamples = 10;
      for (let s = 0; s <= numSamples; s++) {
        const pct = s / numSamples;
        const floatIdx = pct * (rightNodes.length - 1);
        const i0 = Math.floor(floatIdx);
        const i1 = Math.min(rightNodes.length - 1, i0 + 1);
        const t = floatIdx - i0;

        const p0 = rightNodes[Math.max(0, i0 - 1)];
        const p1 = rightNodes[i0];
        const p2 = rightNodes[i1];
        const p3 = rightNodes[Math.min(rightNodes.length - 1, i1 + 1)];

        const t2 = t * t;
        const t3 = t2 * t;

        const px = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const py = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        let thick = baseThick;
        if (pct > 0.60 && data.morphProgress > 0.15) {
          const flareP = (pct - 0.60) / 0.40;
          thick = baseThick + (18 - baseThick) * (flareP * flareP);
        } else {
          thick = baseThick * (1.0 - 0.08 * pct);
        }
        _scissorRightPoints.push({ x: px, y: py, isUnderground: false, thickness: thick });
      }

      if (_scissorRightPoints.length >= 2) {
        drawFleshLoop(ctx, _scissorRightPoints, isTransformed, 1.0, 2, data.isFrozenByInfinity);
      }
    }
  }

  // 3. Draw Giant Left & Right Inward Hooked Grim Reaper Scythes at the Tips
  const morphProg = Math.min(1.15, data.morphProgress || 0.0);

  // Compute blade aim angles:
  // During non-crossing phases, aim from flank toward target.
  // During crossing phases (clamp/flipHold/release), aim from current tip toward target
  // to prevent sudden angle flips when arms cross past each other.
  const isCrossing = data.phase === 'clamp' || data.phase === 'flipHold' || data.phase === 'release';

  let leftBaseAngle, rightBaseAngle;
  if (isCrossing) {
    // Use the angle from the current tip toward the target — stays stable during crossing
    leftBaseAngle = Math.atan2(data.targetY - data.leftTipY, data.targetX - data.leftTipX);
    rightBaseAngle = Math.atan2(data.targetY - data.rightTipY, data.targetX - data.rightTipX);
  } else {
    leftBaseAngle = Math.atan2(data.targetY - data.leftFlankY, data.targetX - data.leftFlankX);
    rightBaseAngle = Math.atan2(data.targetY - data.rightFlankY, data.targetX - data.rightFlankX);
  }

  // When no blade has popped out yet (during launch & reachPause), draw flesh fists at the tips
  if (morphProg <= 0.05) {
    const handRadius = isTransformed ? 8.5 : 7.0;
    if (drawLeftArm) {
      ctx.save();
      ctx.translate(data.leftTipX, data.leftTipY);
      ctx.rotate(leftBaseAngle);
      ctx.beginPath();
      ctx.arc(0, 0, handRadius, 0, Math.PI * 2);
      ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
      ctx.fill();
      ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#000000';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (!isTransformed) {
        drawSuture(ctx, -handRadius * 0.35, -handRadius * 0.5, -handRadius * 0.35, handRadius * 0.5, 2, 1.8, '#000000');
      }
      if (data.isFrozenByInfinity) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }
      ctx.restore();
    }
    if (drawRightArm) {
      ctx.save();
      ctx.translate(data.rightTipX, data.rightTipY);
      ctx.rotate(rightBaseAngle);
      ctx.beginPath();
      ctx.arc(0, 0, handRadius, 0, Math.PI * 2);
      ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
      ctx.fill();
      ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#000000';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (!isTransformed) {
        drawSuture(ctx, -handRadius * 0.35, -handRadius * 0.5, -handRadius * 0.35, handRadius * 0.5, 2, 1.8, '#000000');
      }
      if (data.isFrozenByInfinity) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 255, 255, 0.95)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    const scytheScale = (isTransformed ? 1.35 : 1.15) * morphProg;

    let clampP = 0.0;
    if (data.phase === 'clamp') {
      clampP = data.clampProgress || 0.0;
    } else if (data.phase === 'release') {
      clampP = 1.0 - (data.releaseProgress || 0.0); // Fully opens scythe blades back out as arms uncross
    } else if (data.phase === 'retract') {
      clampP = 0.0;
    }

    // Lock mirror state: during crossing phases, do NOT flip the blade
    // so the scythe maintains consistent visual orientation throughout the entire animation
    const leftMirrored = isCrossing ? false : true;
    const rightMirrored = false;

    // Left Tip Scythe (Back Arm)
    if (drawLeftArm) {
      ctx.save();
      let leftSwing = leftBaseAngle;
      if (data.phase === 'clamp') {
        leftSwing = leftBaseAngle + (1 - clampP) * 0.6 - Math.sin(clampP * Math.PI) * 0.45;
      } else if (data.phase === 'flipHold') {
        leftSwing = leftBaseAngle; // Stays locked at crossed-in angle during hold pause
      } else if (data.phase === 'release') {
        const relP = data.releaseProgress || 0.0;
        // Rotates back smoothly to wide flanking angle
        leftSwing = leftBaseAngle + relP * 0.60;
      } else if (data.phase === 'retract') {
        leftSwing = leftBaseAngle + 0.60; // Trailing back to shoulders
      }
      ctx.translate(data.leftTipX, data.leftTipY);
      ctx.rotate(leftSwing);
      drawMahitoGrimReaperScythe(ctx, isTransformed, scytheScale, leftMirrored, data.isFrozenByInfinity);
      ctx.restore();
    }

    // Right Tip Scythe (Front Arm)
    if (drawRightArm) {
      ctx.save();
      let rightSwing = rightBaseAngle;
      if (data.phase === 'clamp') {
        rightSwing = rightBaseAngle - (1 - clampP) * 0.6 + Math.sin(clampP * Math.PI) * 0.45;
      } else if (data.phase === 'flipHold') {
        rightSwing = rightBaseAngle; // Stays locked at crossed-in angle during hold pause
      } else if (data.phase === 'release') {
        const relP = data.releaseProgress || 0.0;
        // Rotates back smoothly to wide flanking angle
        rightSwing = rightBaseAngle - relP * 0.60;
      } else if (data.phase === 'retract') {
        rightSwing = rightBaseAngle - 0.60; // Trailing back to shoulders
      }
      ctx.translate(data.rightTipX, data.rightTipY);
      ctx.rotate(rightSwing);
      drawMahitoGrimReaperScythe(ctx, isTransformed, scytheScale, rightMirrored, data.isFrozenByInfinity);
      ctx.restore();
    }
  }

  // 4. Draw Stretch Sockets at Shoulders
  const socketRadius = isTransformed ? 9.0 : 7.5;
  ctx.save();
  ctx.fillStyle = isTransformed ? '#0E1322' : '#EEF3F7';
  ctx.strokeStyle = isTransformed ? '#2A1B3D' : '#000000';
  ctx.lineWidth = 2.0;

  if (drawLeftArm) {
    ctx.beginPath();
    ctx.arc(leftOriginX, leftOriginY, socketRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (drawRightArm) {
    ctx.beginPath();
    ctx.arc(rightOriginX, rightOriginY, socketRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Draws Mahito's Body Repel projectile (a grotesque consolidated mass of transfigured humans).
 * Rendered using the Hybrid WebGL / PixiJS pipeline.
 */
export function drawMahitoBodyRepelProjectile(ctx, p) {
  const r = p.r || 28;
  const time = Date.now();

  // 1. Draw trailing energy path using trajectory history
  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < p.history.length; i++) {
      const pct = i / p.history.length;
      const p0 = p.history[i - 1];
      const p1 = p.history[i];
      ctx.strokeStyle = `rgba(192, 38, 211, ${pct * 0.35})`; // Magenta theme
      ctx.lineWidth = r * 1.5 * pct;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Draw consolidated flesh body at projectile position
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.angle || 0) + (time * 0.003)); // Slowly rotate as it flies

  // Sickly pale grey/blue flesh base
  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 2.0;

  // Main mass
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw 4 smaller overlapping flesh lumps to make it look lumpy, distorted, and asymmetric
  const lumps = [
    { dx: -r * 0.4, dy: -r * 0.3, lr: r * 0.6 },
    { dx: r * 0.5, dy: -r * 0.2, lr: r * 0.5 },
    { dx: -r * 0.2, dy: r * 0.5, lr: r * 0.55 },
    { dx: r * 0.3, dy: r * 0.4, lr: r * 0.65 }
  ];

  for (const lump of lumps) {
    ctx.beginPath();
    ctx.arc(lump.dx, lump.dy, lump.lr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw stitching suture lines across the lumps
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const startAngle = i * 2.0;
    ctx.arc(0, 0, r * 0.75, startAngle, startAngle + 1.2);
    ctx.stroke();
    
    // Draw cross hatches along the sutures
    ctx.save();
    ctx.lineWidth = 1.0;
    for (let j = 0; j < 3; j++) {
      const a = startAngle + 0.2 + j * 0.4;
      const sx = Math.cos(a) * r * 0.75;
      const sy = Math.sin(a) * r * 0.75;
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy - 3); ctx.lineTo(sx + 3, sy + 3);
      ctx.moveTo(sx + 3, sy - 3); ctx.lineTo(sx - 3, sy + 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw grotesque faces embedded in the body mass
  // Face 1 (Left-top): Empty hollow eyes, gaping mouth
  ctx.save();
  ctx.translate(-r * 0.3, -r * 0.35);
  ctx.fillStyle = '#0F172A'; // Slate-900 hollow black
  ctx.beginPath();
  ctx.arc(-4, -3, 2, 0, Math.PI * 2);
  ctx.arc(4, -3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 3, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Face 2 (Right-bottom): Mismatched red eye, stitch mouth
  ctx.save();
  ctx.translate(r * 0.3, r * 0.35);
  ctx.fillStyle = '#DC2626'; // Red pupil
  ctx.beginPath();
  ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, 4); ctx.lineTo(5, 2);
  ctx.stroke();
  ctx.restore();

  // Face 3 (Center): Screaming mouth
  ctx.save();
  ctx.translate(0, -r * 0.1);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(0, 4, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  // Jagged upper teeth
  ctx.beginPath();
  ctx.moveTo(-3, 1); ctx.lineTo(-2, 3); ctx.lineTo(-1, 1); ctx.lineTo(0, 3); ctx.lineTo(1, 1); ctx.lineTo(2, 3); ctx.lineTo(3, 1);
  ctx.stroke();
  ctx.restore();

  // 3. Pulsating Cursed Energy Aura
  const pulse = 1.0 + Math.sin(time * 0.01) * 0.08;
  ctx.strokeStyle = 'rgba(192, 38, 211, 0.45)'; // Magenta theme color
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(217, 70, 239, 0.2)'; // Light pink border
  ctx.lineWidth = 5.0;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

