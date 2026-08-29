// ─────────────────────────────────────────────
// ULQUIORRA CIFER FIGHTER SKIN & BODY MODEL
// Cuatro Espada #4 (Bleach: Arrancar / Hueco Mundo Arc)
//
// Discrete Stepped Pixel Art Architecture:
// - Matches Saitama, Ichigo, Nanami, and Yuji
// - Rule 19 (Upright Front POV, Minimalist Faceless: No eyes/mouth/nose)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawUlquiorraMurcielago, drawLanzaDelRelampago } from '../weapons/ulquiorraWeaponGraphics.js';

// Pre-computed normalized coordinates for Ulquiorra's authentic anime bangs
const _ULQUIORRA_BANGS = [
  { nx: -0.95, ny: -0.32 },
  { nx: -0.84, ny: -0.04 }, // Left long cheek side lock
  { nx: -0.72, ny: -0.22 },
  { nx: -0.58, ny: -0.08 }, // Left mid strand
  { nx: -0.44, ny: -0.24 },
  { nx: -0.26, ny: -0.04 }, // Inner-left long strand
  { nx: -0.14, ny: -0.22 },
  { nx: -0.02, ny:  0.08 }, // Signature Center Deep Spike (dips between eyes)
  { nx:  0.10, ny: -0.20 },
  { nx:  0.22, ny: -0.04 }, // First strand under helmet window
  { nx:  0.30, ny: -0.18 },
  { nx:  0.40, ny: -0.06 }, // Second strand under helmet window
  { nx:  0.48, ny: -0.16 },
  { nx:  0.58, ny: -0.04 }, // Third strand under helmet window
  { nx:  0.68, ny: -0.18 },
  { nx:  0.80, ny:  0.12 }, // Right side lock
  { nx:  0.95, ny: -0.32 }
];

/**
 * Calculates continuous piecewise hairline height for pixel rasterization.
 */
function getHairlineY(rx, r) {
  const nx = Math.max(-0.95, Math.min(0.95, rx / r));
  for (let i = 0; i < _ULQUIORRA_BANGS.length - 1; i++) {
    const p1 = _ULQUIORRA_BANGS[i];
    const p2 = _ULQUIORRA_BANGS[i + 1];
    if (nx >= p1.nx && nx <= p2.nx) {
      const t = (nx - p1.nx) / (p2.nx - p1.nx);
      return (p1.ny + t * (p2.ny - p1.ny)) * r;
    }
  }
  return -r * 0.32;
}

/**
 * Returns whether a point (rx, ry) falls inside the bone helmet plate.
 */
function isInsideHelmetPlate(rx, ry, r) {
  if (rx < -r * 0.12) return false;

  // Center crest fin
  if (rx >= -r * 0.12 && rx <= 0 && ry < -r * 0.40) return true;

  if (rx < 0) return false;

  // Window cutout top edge
  const nx = rx / r;
  let windowTopY = -r * 0.42;
  if (nx <= 0.30) {
    windowTopY = (-0.42 + (nx / 0.30) * 0.08) * r;
  } else if (nx <= 0.46) {
    windowTopY = (-0.34 + ((nx - 0.30) / 0.16) * 0.18) * r;
  } else {
    windowTopY = (-0.16 + ((nx - 0.46) / 0.18) * 0.18) * r;
  }

  // Right ear/cheek flange
  if (nx > 0.65 && ry <= r * 0.20) return true;

  return ry <= windowTopY;
}

/**
 * Returns whether a point (rx, ry) is on the dark bevel border of the window cutout.
 */
function isHelmetWindowBevel(rx, ry, r, P) {
  if (rx < -r * 0.04 || rx > r * 0.68) return false;
  const nx = rx / r;
  let windowTopY = -r * 0.42;
  if (nx <= 0.30) {
    windowTopY = (-0.42 + (nx / 0.30) * 0.08) * r;
  } else if (nx <= 0.46) {
    windowTopY = (-0.34 + ((nx - 0.30) / 0.16) * 0.18) * r;
  } else {
    windowTopY = (-0.16 + ((nx - 0.46) / 0.18) * 0.18) * r;
  }

  return Math.abs(ry - windowTopY) <= P * 1.4;
}

/**
 * Calculates the outer boundary of the left black wing lapel.
 */
function getLeftWingOuterX(ry, r) {
  const normY = (ry - r * 0.22) / (r * 0.72);
  if (normY < 0 || normY > 1.0) return 0;

  // 3 distinct serration waves (notches at ~0.25, ~0.50, ~0.78)
  const notch1 = Math.max(0, 1 - Math.abs(normY - 0.22) / 0.15) * 0.18;
  const notch2 = Math.max(0, 1 - Math.abs(normY - 0.50) / 0.16) * 0.16;
  const notch3 = Math.max(0, 1 - Math.abs(normY - 0.78) / 0.15) * 0.14;

  const baseWidth = 0.32 * (1.0 - normY * 0.85);
  const totalWidth = (baseWidth + notch1 + notch2 + notch3) * r;
  const innerX = -r * 0.20 + (r * 0.16) * normY;

  return innerX - totalWidth;
}

/**
 * Calculates the outer boundary of the right black wing lapel.
 */
function getRightWingOuterX(ry, r) {
  const normY = (ry - r * 0.22) / (r * 0.72);
  if (normY < 0 || normY > 1.0) return 0;

  const notch1 = Math.max(0, 1 - Math.abs(normY - 0.22) / 0.15) * 0.18;
  const notch2 = Math.max(0, 1 - Math.abs(normY - 0.50) / 0.16) * 0.16;
  const notch3 = Math.max(0, 1 - Math.abs(normY - 0.78) / 0.15) * 0.14;

  const baseWidth = 0.32 * (1.0 - normY * 0.85);
  const totalWidth = (baseWidth + notch1 + notch2 + notch3) * r;
  const innerX = r * 0.20 - (r * 0.16) * normY;

  return innerX + totalWidth;
}

/**
 * Draws Ulquiorra's entire body circle model in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Saitama, Ichigo, and Nanami.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
export function drawUlquiorraPixelBody(ctx, r, isSegunda = false, isStage1 = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for authentic pixel art
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  const neckY = r * 0.22;
  const tearX = r * 0.28;
  const holeY = r * 0.54;
  const holeR = r * 0.16;

  // Stepped Pixel Fill by Zone (Procedural Grid Rasterization)
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Outer Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: LOWER BODY (ry >= neckY)
      // ──────────────────────────────────────────
      if (ry >= neckY) {
        // A. Neckline seam
        if (ry < neckY + P * 0.9) {
          ctx.fillStyle = '#0E0F14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // B. Hollow Hole (Central circular void)
        const distFromHole = Math.hypot(rx, ry - holeY);
        if (distFromHole <= holeR) {
          ctx.fillStyle = (distFromHole > holeR - P * 0.8) ? '#0E0F14' : '#030508';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // C. Left Black Wing Lapel
        const leftInnerX = -r * 0.20 + (r * 0.16) * ((ry - neckY) / (r * 0.72));
        const leftOuterX = getLeftWingOuterX(ry, r);
        if (rx >= leftOuterX && rx <= leftInnerX) {
          ctx.fillStyle = '#090C11';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // D. Right Black Wing Lapel
        const rightInnerX = r * 0.20 - (r * 0.16) * ((ry - neckY) / (r * 0.72));
        const rightOuterX = getRightWingOuterX(ry, r);
        if (rx <= rightOuterX && rx >= rightInnerX) {
          ctx.fillStyle = '#090C11';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // E. Upper-Left Dot on Collar
        if (Math.hypot(rx - (-r * 0.72), ry - (neckY + P * 2.0)) <= r * 0.05) {
          ctx.fillStyle = '#0E0F14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // F. Base White Coat / Pale Chest Skin (Inside V-neck)
        const isInsideV = (rx > leftInnerX && rx < rightInnerX);
        if (isInsideV) {
          ctx.fillStyle = '#F4F7F6'; // Pale chest skin
        } else {
          // White Espada Coat with subtle edge shading
          ctx.fillStyle = (Math.abs(rx) > r * 0.75 || ry > r * 0.85) ? '#D8E2DF' : '#FFFFFF';
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 2: UPPER HEAD & FACE (ry < neckY)
      // ──────────────────────────────────────────
      const hairlineY = getHairlineY(rx, r);

      // A. Emerald Green Tear Tracks (Rule 19 faceless signature) - Slim single-pixel width
      const targetTearX = snap(tearX);
      const isLeftTear = (px === -targetTearX && ry >= -r * 0.06 && ry <= neckY);
      const isRightTear = (px === targetTearX && ry >= -r * 0.06 && ry <= neckY);
      if (isLeftTear || isRightTear) {
        ctx.fillStyle = isSegunda ? '#00CC66' : '#00E575';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // B. Forehead Diamond Mark & Brow Liner (Centered between brows)
      const diamondDist = Math.abs(rx - (-r * 0.02)) / (r * 0.08) + Math.abs(ry - (-r * 0.01)) / (r * 0.06);
      if (diamondDist <= 0.5) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }
      const isBrowLiner = (Math.abs(ry - (-r * 0.01)) <= P * 0.6 && Math.abs(rx) <= r * 0.22 && Math.abs(rx) >= r * 0.04);
      if (isBrowLiner) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // C. Broken Hollow Helmet
      if (isInsideHelmetPlate(rx, ry, r)) {
        // Dark grey window bevel
        if (isHelmetWindowBevel(rx, ry, r, P)) {
          ctx.fillStyle = '#333A42';
        } else if (rx >= -r * 0.12 && rx <= 0 && ry < -r * 0.40) {
          // Center fin crest
          ctx.fillStyle = (rx < -r * 0.06) ? '#FFFFFF' : '#E2E8F0';
        } else if (rx > r * 0.60 || ry < -r * 0.80) {
          // Helmet edge shadow
          ctx.fillStyle = '#CBD5E1';
        } else {
          // Bone-white plate
          ctx.fillStyle = '#F8FAFC';
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // D. Jet-Black Anime Hair (ry < hairlineY)
      if (ry < hairlineY) {
        let col = '#090C11';
        if (ry < -r * 0.70 && rx < 0) {
          col = '#1E2530'; // Crown highlight
        } else if (ry > hairlineY - P * 1.5) {
          col = '#040507'; // Bang tip shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // E. Alabaster Pale Skin (Face)
      let col = '#F4F7F6';
      if (ry < hairlineY + P * 1.5) {
        col = '#E2ECE8'; // Forehead hair shadow
      } else if (Math.abs(rx) > r * 0.72) {
        col = '#D4DFDB'; // Cheek shadow
      }
      ctx.fillStyle = col;
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

/**
 * Draws Ulquiorra's sweeping broken helmet horn in True Stepped Pixel Art Style.
 * Uses 2D grid scan rasterization matching drawUlquiorraPixelBody and _drawUlquiorraPixelWings.
 * In Base Form: Draws single sweeping right horn.
 * In Stage 1 Wings & Segunda Etapa: Draws matching dual sweeping horns!
 */
function _drawUlquiorraPixelHorn(ctx, r, hasLeftHorn = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const drawOneHorn = (sign) => {
    const hornTip = { x: sign * r * 1.50, y: -r * 1.45 };
    const rootTop = { x: sign * r * 0.16, y: -r * 0.66 };
    const rootMid = { x: sign * r * 0.28, y: -r * 0.54 };
    const rootBot = { x: sign * r * 0.36, y: -r * 0.44 };

    const ctrlTop = { x: sign * r * 0.68, y: -r * 0.78 };
    const ctrlMid = { x: sign * r * 0.76, y: -r * 0.68 };
    const ctrlBot1 = { x: sign * r * 1.12, y: -r * 0.86 };
    const ctrlBot2 = { x: sign * r * 0.72, y: -r * 0.50 };

    const N = 14;
    const topEdge = [];
    const midEdge = [];
    const botEdge = [];

    // Top edge: rootTop -> hornTip
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      topEdge.push({
        x: mt * mt * rootTop.x + 2 * mt * t * ctrlTop.x + t * t * hornTip.x,
        y: mt * mt * rootTop.y + 2 * mt * t * ctrlTop.y + t * t * hornTip.y
      });
    }

    // Mid ridge: rootMid -> hornTip
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      midEdge.push({
        x: mt * mt * rootMid.x + 2 * mt * t * ctrlMid.x + t * t * hornTip.x,
        y: mt * mt * rootMid.y + 2 * mt * t * ctrlMid.y + t * t * hornTip.y
      });
    }

    // Bottom edge: hornTip -> rootBot
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      const x = mt * mt * mt * hornTip.x + 3 * mt * mt * t * ctrlBot1.x + 3 * mt * t * t * ctrlBot2.x + t * t * t * rootBot.x;
      const y = mt * mt * mt * hornTip.y + 3 * mt * mt * t * ctrlBot1.y + 3 * mt * t * t * ctrlBot2.y + t * t * t * rootBot.y;
      botEdge.push({ x, y });
    }

    // Full closed horn polygon
    const hornPoly = [...topEdge, ...botEdge, rootTop];

    // Top highlight facet polygon (topEdge + reversed midEdge)
    const topFacetPoly = [...topEdge];
    for (let i = midEdge.length - 1; i >= 0; i--) {
      topFacetPoly.push(midEdge[i]);
    }
    topFacetPoly.push(rootTop);

    // Compute bounding box
    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    hornPoly.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const startGx = Math.floor((minX - P) / P);
    const endGx   = Math.ceil((maxX + P) / P);
    const startGy = Math.floor((minY - P) / P);
    const endGy   = Math.ceil((maxY + P) / P);

    // Discrete 2D Pixel Rasterization Loop
    for (let gy = startGy; gy <= endGy; gy++) {
      for (let gx = startGx; gx <= endGx; gx++) {
        const rx = gx * P;
        const ry = gy * P;

        if (!_isPointInPoly(rx, ry, hornPoly)) continue;

        const px = snap(rx);
        const py = snap(ry);

        // 4-neighbor attached border test
        const isBorder = !_isPointInPoly(rx + P, ry, hornPoly) ||
                         !_isPointInPoly(rx - P, ry, hornPoly) ||
                         !_isPointInPoly(rx, ry + P, hornPoly) ||
                         !_isPointInPoly(rx, ry - P, hornPoly);

        if (isBorder) {
          ctx.fillStyle = '#0E0F14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Center ridge line test (distance to midEdge segments)
        let isRidge = false;
        for (let i = 0; i < midEdge.length - 1; i++) {
          if (_distToSegmentSq(rx, ry, midEdge[i].x, midEdge[i].y, midEdge[i + 1].x, midEdge[i + 1].y) <= (P * 0.8) * (P * 0.8)) {
            isRidge = true;
            break;
          }
        }

        if (isRidge) {
          ctx.fillStyle = '#64748B'; // Center ridge line
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Top Highlight vs Bottom Shadow Facet
        if (_isPointInPoly(rx, ry, topFacetPoly)) {
          ctx.fillStyle = '#F8FAFC'; // Bone-white highlight facet
        } else {
          ctx.fillStyle = '#CBD5E1'; // Shadow facet
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  };

  // Always draw right horn
  drawOneHorn(1);

  // Draw left horn when Stage 1 wings or Segunda Etapa are active
  if (hasLeftHorn) {
    drawOneHorn(-1);
  }

  ctx.restore();
}

/**
 * Checks if a 2D point (x, y) is inside a closed polygon using ray-casting.
 */
function _isPointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns squared distance from point (px, py) to line segment (ax, ay)-(bx, by).
 */
function _distToSegmentSq(px, py, ax, ay, bx, by) {
  const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (l2 === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

/**
 * Draws Ulquiorra's authentic gothic Resurrección bat wings in True Stepped Pixel Art Style.
 * Incorporates natural aerodynamic locomotion physics:
 * - Idle breathing hover flutter
 * - High-speed flight flapping frequency & amplitude modulation
 * - Aerodynamic wind drag / speed sweep tucking
 * - Asymmetrical flight banking on lateral turns and strafing
 * - Supersonic Sonído dive dart compression & slash recoil flutters
 */
function _drawUlquiorraPixelWings(ctx, r, isSegunda = false, fighter = null) {
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // 1. Locomotion Kinematics
  const vx = (fighter && typeof fighter.vx === 'number') ? fighter.vx : 0;
  const vy = (fighter && typeof fighter.vy === 'number') ? fighter.vy : 0;
  const speed = Math.hypot(vx, vy);
  const isDashing = Boolean(fighter && (fighter.isSonidoDashing || (fighter.sonidoTimer > 0)));
  const isSlashing = Boolean(fighter && fighter.isSlashing);

  // Local space velocity projection
  const facingAngle = fighter ? (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0)) : 0;
  const cosA = Math.cos(facingAngle);
  const sinA = Math.sin(facingAngle);
  const vForward = (vx * cosA + vy * sinA);
  const vLateral = (-vx * sinA + vy * cosA);

  // 2. Flap Frequency & Power Stroke Modulation
  const flapFrequency = 0.0035 + Math.min(0.010, (speed / 8) * 0.008);
  const baseFlapAmp = isDashing ? 0.20 : (0.07 + Math.min(0.12, (speed / 6) * 0.09));
  const flapPhase = Math.sin(now * flapFrequency);
  const flapAngle = flapPhase * baseFlapAmp;

  // 3. Aerodynamic Wind Drag & Speed Sweep
  const forwardDrag = Math.max(-0.12, Math.min(0.26, (vForward / 7) * 0.24));
  const dashTuck = isDashing ? 0.32 : 0;
  const totalSweep = forwardDrag + dashTuck;

  // 4. Asymmetrical Flight Banking on Lateral Turns / Strafing
  const bankAngle = Math.max(-0.16, Math.min(0.16, (vLateral / 6) * 0.14));

  // 5. Slash Kinetic Recoil Flutter
  const slashFlutter = isSlashing ? Math.sin((fighter.slashProgress || 0) * Math.PI) * 0.14 : 0;

  // 6. Aerodynamic Span Compression at High Speed
  const baseWingScale = isSegunda ? 1.25 : 1.0;
  const spanTuckScale = 1.0 - Math.min(0.14, (speed / 8) * 0.10) - (isDashing ? 0.12 : 0);
  const wingScale = baseWingScale * spanTuckScale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const membraneColor = isSegunda ? '#040508' : '#141720';
  const boneHighlight  = isSegunda ? '#00FF88' : '#2D3440';
  const shellColor     = '#080A0E';

  const drawOneWing = (sign) => {
    ctx.save();
    ctx.translate(sign * r * 0.28, -r * 0.15);

    // Combine natural breathing flap, aerodynamic drag sweep, turn banking, and slash recoil
    const totalRotation = sign * (-0.10 + flapAngle - totalSweep - slashFlutter) + (sign * bankAngle);
    ctx.rotate(totalRotation);
    ctx.scale(sign * wingScale, wingScale);

    // Key Landmarks
    const root       = { x: 0, y: 0 };
    const elbowApex  = { x: -r * 1.35, y: -r * 1.85 }; // High arched elbow
    const elbowHook  = { x: -r * 1.12, y: -r * 2.12 }; // Curled thumb hook tip
    const hookBarb   = { x: -r * 1.25, y: -r * 1.95 };

    const tip1 = { x: -r * 2.65, y: r * 0.95 };  // Primary outer longest needle spire
    const tip2 = { x: -r * 1.80, y: r * 0.65 };  // Middle needle spire
    const tip3 = { x: -r * 1.15, y: r * 0.40 };  // Inner needle spire
    const waistRoot = { x: -r * 0.15, y: r * 0.20 };

    const valley1_2 = { x: -r * 2.05, y: -r * 0.20 };
    const valley2_3 = { x: -r * 1.45, y: -r * 0.25 };
    const valley3_B = { x: -r * 0.75, y: -r * 0.05 };

    // Build the closed wing polygon
    const poly = [];
    const sampleQuad = (p0, p1, p2, n = 8) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const mt = 1 - t;
        poly.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        });
      }
    };

    sampleQuad(root, { x: -r * 0.45, y: -r * 1.30 }, elbowApex, 8);
    sampleQuad(elbowApex, { x: -r * 1.20, y: -r * 2.05 }, elbowHook, 5);
    poly.push(hookBarb);
    poly.push(elbowApex);
    sampleQuad(elbowApex, { x: -r * 2.15, y: -r * 1.35 }, tip1, 12);
    sampleQuad(tip1, { x: valley1_2.x - r * 0.15, y: valley1_2.y + r * 0.25 }, valley1_2, 6);
    sampleQuad(valley1_2, { x: valley1_2.x + r * 0.10, y: valley1_2.y + r * 0.40 }, tip2, 6);
    sampleQuad(tip2, { x: valley2_3.x - r * 0.10, y: valley2_3.y + r * 0.20 }, valley2_3, 6);
    sampleQuad(valley2_3, { x: valley2_3.x + r * 0.10, y: valley2_3.y + r * 0.30 }, tip3, 6);
    sampleQuad(tip3, { x: valley3_B.x - r * 0.10, y: valley3_B.y + r * 0.15 }, valley3_B, 6);
    sampleQuad(valley3_B, { x: valley3_B.x + r * 0.15, y: valley3_B.y + r * 0.15 }, waistRoot, 6);

    // Shoulder tufts polygon
    const tuftsPoly = [
      { x: root.x + r * 0.05, y: root.y - r * 0.10 },
      { x: root.x - r * 0.35, y: root.y - r * 0.35 },
      { x: root.x - r * 0.10, y: root.y - r * 0.05 },
      { x: root.x - r * 0.40, y: root.y - r * 0.15 },
      { x: root.x - r * 0.05, y: root.y + r * 0.10 }
    ];

    // Compute bounding box
    let minX = 0, maxX = -r * 2.8, minY = r, maxY = -r * 2.5;
    poly.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const startGx = Math.floor((minX - P) / P);
    const endGx   = Math.ceil((maxX + P) / P);
    const startGy = Math.floor((minY - P) / P);
    const endGy   = Math.ceil((maxY + P) / P);

    // Discrete 2D Rasterization Loop
    for (let gy = startGy; gy <= endGy; gy++) {
      for (let gx = startGx; gx <= endGx; gx++) {
        const rx = gx * P;
        const ry = gy * P;

        const inWing = _isPointInPoly(rx, ry, poly);
        const inTuft = _isPointInPoly(rx, ry, tuftsPoly);
        if (!inWing && !inTuft) continue;

        const px = snap(rx);
        const py = snap(ry);

        // 4-neighbor boundary test
        const isBorder = (!_isPointInPoly(rx + P, ry, poly) && !_isPointInPoly(rx + P, ry, tuftsPoly)) ||
                         (!_isPointInPoly(rx - P, ry, poly) && !_isPointInPoly(rx - P, ry, tuftsPoly)) ||
                         (!_isPointInPoly(rx, ry + P, poly) && !_isPointInPoly(rx, ry + P, tuftsPoly)) ||
                         (!_isPointInPoly(rx, ry - P, poly) && !_isPointInPoly(rx, ry - P, tuftsPoly));

        if (isBorder) {
          ctx.fillStyle = shellColor;
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (inTuft) {
          ctx.fillStyle = '#090C11';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        const dStrut1 = Math.sqrt(_distToSegmentSq(rx, ry, elbowApex.x, elbowApex.y, tip1.x, tip1.y));
        const dStrut2 = Math.sqrt(_distToSegmentSq(rx, ry, elbowApex.x, elbowApex.y, tip2.x, tip2.y));
        const dStrut3 = Math.sqrt(_distToSegmentSq(rx, ry, elbowApex.x, elbowApex.y, tip3.x, tip3.y));
        const dArm    = Math.sqrt(_distToSegmentSq(rx, ry, root.x, root.y, elbowApex.x, elbowApex.y));

        if (dStrut1 <= P * 0.75 || dStrut2 <= P * 0.75 || dStrut3 <= P * 0.75 || dArm <= P * 0.75) {
          ctx.fillStyle = boneHighlight;
        } else {
          ctx.fillStyle = membraneColor;
        }
        ctx.fillRect(px, py, P, P);
      }
    }

    ctx.restore();
  };

  drawOneWing(-1);
  drawOneWing(1);

  ctx.restore();
}

/**
 * Draws Ulquiorra's Demon Whip Tail in True Stepped Pixel Art Style (Segunda Etapa only).
 * Includes dynamic locomotion physics and natural movement drag.
 */
function _drawUlquiorraPixelTail(ctx, r, fighter = null) {
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  const vx = (fighter && typeof fighter.vx === 'number') ? fighter.vx : 0;
  const vy = (fighter && typeof fighter.vy === 'number') ? fighter.vy : 0;
  const speed = Math.hypot(vx, vy);

  const tailFreq = 0.005 + Math.min(0.008, (speed / 7) * 0.006);
  const baseSway = Math.sin(now * tailFreq) * (r * 0.28);
  const inertiaDrag = Math.max(-r * 0.35, Math.min(r * 0.35, -vx * 0.6));
  const tailSway = baseSway + inertiaDrag;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const p0 = { x: 0, y: r * 0.70 };
  const p1 = { x: -r * 0.80 + tailSway, y: r * 1.25 };
  const p2 = { x: -r * 1.40 + tailSway * 1.4, y: r * 0.85 };

  const steps = 14;
  const leftPoly = [];
  const rightPoly = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const px = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    const py = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;

    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const halfThick = 2.2 * (1.1 - t * 0.35);
    leftPoly.push({ x: px + nx * halfThick, y: py + ny * halfThick });
    rightPoly.push({ x: px - nx * halfThick, y: py - ny * halfThick });
  }

  const tailPoly = [...leftPoly, ...rightPoly.reverse()];

  // Emerald Arrowhead Spade Diamond at tip
  const tipX = p2.x;
  const tipY = p2.y;
  const endDx = 2 * (p2.x - p1.x);
  const endDy = 2 * (p2.y - p1.y);
  const endAngle = Math.atan2(endDy, endDx);
  const cosA = Math.cos(endAngle);
  const sinA = Math.sin(endAngle);

  const diamondPoly = [
    { x: tipX + cosA * 12, y: tipY + sinA * 12 },
    { x: tipX - sinA * 6.5, y: tipY + cosA * 6.5 },
    { x: tipX - cosA * 4, y: tipY - sinA * 4 },
    { x: tipX + sinA * 6.5, y: tipY - cosA * 6.5 }
  ];

  // Compute bounding box
  let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
  [...tailPoly, ...diamondPoly].forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const startGx = Math.floor((minX - P) / P);
  const endGx   = Math.ceil((maxX + P) / P);
  const startGy = Math.floor((minY - P) / P);
  const endGy   = Math.ceil((maxY + P) / P);

  // 2D Pixel Grid Rasterization Loop
  for (let gy = startGy; gy <= endGy; gy++) {
    for (let gx = startGx; gx <= endGx; gx++) {
      const rx = gx * P;
      const ry = gy * P;

      const inTail = _isPointInPoly(rx, ry, tailPoly);
      const inDiamond = _isPointInPoly(rx, ry, diamondPoly);
      if (!inTail && !inDiamond) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 4-neighbor attached border test
      const isBorder = (!_isPointInPoly(rx + P, ry, tailPoly) && !_isPointInPoly(rx + P, ry, diamondPoly)) ||
                       (!_isPointInPoly(rx - P, ry, tailPoly) && !_isPointInPoly(rx - P, ry, diamondPoly)) ||
                       (!_isPointInPoly(rx, ry + P, tailPoly) && !_isPointInPoly(rx, ry + P, diamondPoly)) ||
                       (!_isPointInPoly(rx, ry - P, tailPoly) && !_isPointInPoly(rx, ry - P, diamondPoly));

      if (isBorder) {
        ctx.fillStyle = '#080A0E';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      if (inDiamond) {
        ctx.fillStyle = '#00FF88'; // Emerald Reishi arrowhead spade
      } else {
        ctx.fillStyle = '#070A0F'; // Obsidian whip spine
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Ulquiorra Cifer.
 * Fully compliant with Rule 19 (Upright Front POV), Rule 20 (Hands), and Rule 11 (Zero shadowBlur).
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {object} fighter Fighter instance or mock preview object
 */
export function drawUlquiorraSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  const isStage1 = Boolean(fighter.stage1Active || fighter.isMurcielagoActive || fighter.wingsActive);
  const isSegunda = Boolean(fighter.segundaEtapaActive || fighter.isSegundaEtapa);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Orientation & Mirroring (Rule 19 Upright Front POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // ─────────────────────────────────────────────
  // 2. BACKGROUND LAYER: REISHI AURA & PIXEL WINGS & TAIL
  // ─────────────────────────────────────────────
  if (!isLowQuality) {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    ctx.fillStyle = '#00FF88';
    for (let i = 0; i < 3; i++) {
      const phase = (now * 0.0025 + i * 2.1) % 1.0;
      const sparkX = Math.sin(now * 0.003 + i * 2) * (r * 0.85);
      const sparkY = (r * 0.6) - phase * (r * 1.5);
      const sparkAlpha = Math.sin(phase * Math.PI) * (isSegunda ? 0.8 : 0.4);

      ctx.globalAlpha = sparkAlpha;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, isSegunda ? 1.8 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // Bat Wings (Murciélago & Segunda Etapa) in Stepped Pixel Art Style
  if (isStage1 || isSegunda) {
    _drawUlquiorraPixelWings(ctx, r, isSegunda, fighter);
  }

  // Demonic Tail (Segunda Etapa)
  if (isSegunda) {
    _drawUlquiorraPixelTail(ctx, r, fighter);
  }

  // Back Hand / Idle Stance (Behind body layer)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands && !fighter.hideBackHand) {
    const handRadius = getHandSize(5.5, fighter);
    drawUlquiorraHand(ctx, r * 0.95, -r * 0.15, handRadius, isSegunda);
  }

  // ─────────────────────────────────────────────
  // 3. AUTHENTIC STEPPED PIXEL ART BODY CIRCLE
  // ─────────────────────────────────────────────
  drawUlquiorraPixelBody(ctx, r, isSegunda, isStage1);

  // ─────────────────────────────────────────────
  // 4. UNCLIPPED STEPPED PIXEL HORN LAYER
  // ─────────────────────────────────────────────
  const hasDualHorns = Boolean(isStage1 || isSegunda);
  _drawUlquiorraPixelHorn(ctx, r, hasDualHorns);

  // ─────────────────────────────────────────────
  // 5. FOREGROUND LAYER: FRONT HAND & WEAPONS
  // ─────────────────────────────────────────────
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const handRadius = getHandSize(6.0, fighter);
    const handX = r * 0.85;
    const handY = r * 0.15;
    const isCasting = Boolean(fighter.isChannelingCero || fighter.isFiringBala);
    drawUlquiorraHand(ctx, handX, handY, handRadius, isSegunda, isCasting);
  }

  // Draw Murciélago Katana or Lanza del Relámpago
  if (!shouldHideHands && !fighter.hideWeapon) {
    if (isSegunda && fighter.isChannelingLanza) {
      drawLanzaDelRelampago(ctx, r * 1.1, 0, 0, r, fighter.lanzaChargeRatio || 1.0);
    } else {
      drawUlquiorraMurcielago(ctx, r * 1.05, r * 0.15, 0, r, fighter.isSlashing, fighter.slashProgress || 0);
    }
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // End main transform
}

/**
 * Renders Ulquiorra's Sonído Ghost Afterimage with translucent emerald Reishi silhouette.
 */
export function drawUlquiorraGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5, isSegunda = false) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Spectral Emerald Reishi Outer Glow Aura (Rule 11 zero shadowBlur)
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = isSegunda ? 'rgba(5, 10, 15, 0.40)' : 'rgba(0, 255, 136, 0.30)';
  ctx.fill();

  // 2. Wings on Ghost
  _drawUlquiorraPixelWings(ctx, r, isSegunda);

  // 3. Stepped Pixel Body Silhouette
  drawUlquiorraPixelBody(ctx, r, isSegunda, false);

  // Draw Horn on Ghost
  _drawUlquiorraPixelHorn(ctx, r, isSegunda);

  // 4. Spectral Outline
  ctx.strokeStyle = isSegunda ? '#00FF88' : 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
