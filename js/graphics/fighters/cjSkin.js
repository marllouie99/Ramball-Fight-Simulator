// ─────────────────────────────────────────────
// Carl "CJ" Johnson ("The Grove Street Cheatmaster") Fighter Skin
// Strictly adheres to:
// - Rule 19 (Upright Front POV, No Eyes/Mouth/Nose Standard)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { drawAuthenticBrassKnucklesShape, drawCjMicroUzi, drawCjMinigun, drawCjTec9 } from '../weapons/cjWeaponGraphics.js';

let _cjImage = null;
let _cjImageLoading = false;
let _cachedSkinGrad = null;
let _cachedSkinGradR = 0;
let _cachedFadeGrad = null;
let _cachedFadeGradR = 0;

const _FINGER_HOLES = [
  { x: 3.2 * 0.85, y: -7.2 * 0.85 },
  { x: 4.9 * 0.85, y: -2.3 * 0.85 },
  { x: 4.9 * 0.85, y:  2.3 * 0.85 },
  { x: 3.2 * 0.85, y:  7.2 * 0.85 },
];

const _RIBBED_OFFSETS = [-0.55, -0.40, -0.25, -0.10, 0, 0.10, 0.25, 0.40, 0.55];
const _SHOULDER_STRAP_OFFSETS = [-0.32, 0.20];

function _getSkinGrad(ctx, r) {
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, 'rgba(255, 235, 210, 0.25)');
  g.addColorStop(0.65, 'rgba(160, 95, 60, 0.18)');
  g.addColorStop(1, 'rgba(60, 30, 15, 0.40)');
  return g;
}

function _getFadeGrad(ctx, r) {
  const g = ctx.createLinearGradient(0, -r * 0.85, 0, -r * 0.35);
  g.addColorStop(0, '#1C120C');
  g.addColorStop(0.70, 'rgba(40, 25, 18, 0.75)');
  g.addColorStop(1, 'rgba(141, 85, 56, 0)');
  return g;
}

/**
 * Draws CJ's hand equipped with authentic vintage cast-brass knuckles or gripping weapons
 * in authentic Pixel Art Style (Rule 20 compliant, Saitama Tech).
 */
export function drawCjPixelHand(ctx, x, y, radius, skinColor, punchProgress = 0, isHoldingGun = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const handX = snap(x);
  const handY = snap(y);
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  // 1. Black Wrist Sweatband / Watch (Behind hand, -X)
  const bandW = snap(radius * 0.75);
  const bandH = snap(radius * 1.40);
  const bandX = snap(handX - radius * 0.95);
  const bandY = snap(handY - bandH * 0.5);

  ctx.fillStyle = '#0E0F14'; // Sweatband outline
  ctx.fillRect(bandX - P, bandY - P, bandW + P * 2, bandH + P * 2);
  ctx.fillStyle = '#18181B'; // Black sweatband base
  ctx.fillRect(bandX, bandY, bandW, bandH);

  // 2. Stepped 2D Fist Body
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > gridR) continue;

      const px = snap(handX + rx);
      const py = snap(handY + ry);

      // 4-neighbor attached border
      if (
        Math.hypot(rx + P, ry) > gridR ||
        Math.hypot(rx - P, ry) > gridR ||
        Math.hypot(rx, ry + P) > gridR ||
        Math.hypot(rx, ry - P) > gridR
      ) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Knuckle & palm shading
      if (ry > gridR * 0.35 || rx < -gridR * 0.30) {
        ctx.fillStyle = '#6E3F27'; // Hand shadow / knuckle crease
      } else if (rx > 0 && ry < -gridR * 0.25) {
        ctx.fillStyle = '#AB6B49'; // Top highlight
      } else {
        ctx.fillStyle = skinColor || '#8D5538'; // Natural warm brown skin
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // 3. Authentic Stepped Pixel Brass Knuckles (When not holding guns)
  if (!isHoldingGun) {
    const kX = snap(handX + gridR * 0.30);
    const kW = snap(gridR * 0.55);
    const kH = snap(gridR * 1.50);
    const kY = snap(handY - kH * 0.5);

    // Brass knuckle outer plate & 4 knuckle crown spikes
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(kX - P, kY - P, kW + P * 2, kH + P * 2);
    ctx.fillStyle = '#D97706'; // Vintage cast brass gold
    ctx.fillRect(kX, kY, kW, kH);

    // Specular Brass Highlight
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(kX + kW - P, kY + P, P, kH - P * 2);

    // 4 Finger Loop Holes
    ctx.fillStyle = '#0E0F14';
    const holeStep = kH / 4;
    for (let h = 0; h < 4; h++) {
      const hy = snap(kY + h * holeStep + holeStep * 0.2);
      ctx.fillRect(kX + P * 0.5, hy, snap(kW * 0.5), snap(holeStep * 0.6));
    }
  }

  ctx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Carl "CJ" Johnson ("The Grove Street Cheatmaster")
 * Uses pure discrete 2D grid-scan rasterization loop with zero subpixel bleed (P = 2.0px, Rule #19 & Rule #35 compliant).
 * Exact same tech, grid resolution, and border calculation as Saitama's skin.
 */
export function drawCjPixelBody(ctx, r, isJetpackActive = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Constants matching Saitama tech & GTA SA CJ aesthetic
  const C = {
    outline: '#0E0F14',        // Pure dark manga ink border (exact Saitama tech)
    hairBase: '#1C120C',       // Deep espresso black buzzcut
    hairDark: '#0E0F14',       // Hair crown shadow / tape-up border
    hairFade1: '#3D2518',      // Mid fade shadow
    hairFade2: '#5A3622',      // Temple taper fade
    skinBase: '#8D5538',       // Natural rich warm brown complexion
    skinHighlight: '#AB6B49',  // Forehead highlight
    skinShadow: '#6E3F27',     // Cheek shadow dither
    skinStubble: '#522E1B',    // 5 o'clock jaw stubble
    tankWhite: '#FFFFFF',      // Crisp white ribbed tank top
    tankRib: '#E2E8F0',        // Ribbed vertical stripe shadow
    tankTrim: '#CBD5E1',       // Scoop neckline hem trim
    strapBase: '#784B28',      // Jetpack leather torso strap
    strapBorder: '#3D2514',    // Strap dark edge
    buckleSilver: '#E2E8F0',   // Heavy harness / belt buckle
    bucklePin: '#475569',      // Buckle center pin
    beltBase: '#18181B',       // Black leather belt
    jeansBase: '#1E3A8A',      // Classic Grove Street dark blue denim jeans
    jeansShadow: '#172554',    // Denim seam & pocket shadow
  };

  // Helper functions for geometric regions
  // 1. Hairline & buzzcut test
  const isHair = (nx, ny) => {
    const absX = Math.abs(nx);
    if (absX > 0.58) {
      return ny < -0.15; // Temple & sideburn drop down
    }
    return ny < -0.38; // Clean horizontal tape-up lineup
  };

  // 2. Tank top test
  const isTankTop = (nx, ny) => {
    if (ny < 0.08 || ny >= 0.60) return false;
    // Scoop neckline curve
    const absX = Math.abs(nx);
    const necklineY = 0.09 - 0.05 * Math.pow(absX / 0.85, 2.0);
    return ny >= necklineY;
  };

  // 3. Harness straps test (when Jetpack is active)
  const isShoulderStrap = (nx, ny) => {
    if (!isJetpackActive || ny < 0.08 || ny >= 0.60) return false;
    const absX = Math.abs(nx);
    return (absX >= 0.20 && absX <= 0.34);
  };

  const isChestStrap = (nx, ny) => {
    if (!isJetpackActive || ny < 0.28 || ny > 0.38) return false;
    return Math.abs(nx) <= 0.50;
  };

  // 4. Belt test
  const isBelt = (nx, ny) => {
    return ny >= 0.60 && ny < 0.68;
  };

  // 5. Jeans test
  const isJeans = (nx, ny) => {
    return ny >= 0.68;
  };

  // ── Main Discrete 2D Grid Scan (Exact Saitama Tech) ──
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Border (Exact Saitama standard)
      if (
        Math.hypot(rx + P, ry) > r ||
        Math.hypot(rx - P, ry) > r ||
        Math.hypot(rx, ry + P) > r ||
        Math.hypot(rx, ry - P) > r
      ) {
        ctx.fillStyle = C.outline;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // LAYER A: BUZZCUT FADE & CLEAN LINEUP
      // ──────────────────────────────────────────
      if (isHair(nx, ny)) {
        const isHairEdge = !isHair(nx + P / r, ny) || !isHair(nx - P / r, ny) || !isHair(nx, ny + P / r) || !isHair(nx, ny - P / r);
        if (isHairEdge) {
          ctx.fillStyle = C.hairDark; // Sharp tape-up razor outline
        } else if (ny > -0.44 && ny <= -0.38) {
          // Temple taper fade dither
          ctx.fillStyle = ((gx + gy) % 2 === 0) ? C.hairFade1 : C.hairFade2;
        } else if (ny < -0.75) {
          ctx.fillStyle = C.hairDark; // Top crown shadow
        } else {
          ctx.fillStyle = C.hairBase; // Main espresso buzzcut
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER B: WHITE RIBBED TANK TOP & HARNESS
      // ──────────────────────────────────────────
      if (isTankTop(nx, ny)) {
        // B1. Jetpack Torso Harness
        if (isChestStrap(nx, ny) || isShoulderStrap(nx, ny)) {
          // Silver Center Buckle
          if (isChestStrap(nx, ny) && absX <= 0.10) {
            if (Math.abs(nx) <= 0.03 && ny >= 0.31 && ny <= 0.35) {
              ctx.fillStyle = C.bucklePin;
            } else {
              ctx.fillStyle = C.buckleSilver;
            }
          } else {
            const isStrapEdge = (
              !isChestStrap(nx, ny + P / r) && !isShoulderStrap(nx, ny + P / r)
            ) || (
              !isChestStrap(nx, ny - P / r) && !isShoulderStrap(nx, ny - P / r)
            );
            ctx.fillStyle = isStrapEdge ? C.strapBorder : C.strapBase;
          }
        }
        // B2. Tank Top Scoop Neckline Trim
        else if (ny < 0.12) {
          ctx.fillStyle = C.tankTrim;
        }
        // B3. Vertical Ribbed Stripes
        else {
          ctx.fillStyle = (gx % 2 === 0) ? C.tankWhite : C.tankRib;
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER C: BLACK LEATHER BELT & BUCKLE
      // ──────────────────────────────────────────
      if (isBelt(nx, ny)) {
        if (absX <= 0.14) {
          if (absX <= 0.04 && ny >= 0.62 && ny <= 0.66) {
            ctx.fillStyle = C.bucklePin;
          } else {
            ctx.fillStyle = C.buckleSilver; // Silver Belt Buckle
          }
        } else {
          ctx.fillStyle = C.beltBase; // Black Leather Belt
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER D: DARK BLUE DENIM JEANS
      // ──────────────────────────────────────────
      if (isJeans(nx, ny)) {
        if (absX <= 0.04) {
          ctx.fillStyle = C.jeansShadow; // Center fly seam
        } else if (absX > 0.55 || ny > 0.88) {
          ctx.fillStyle = C.jeansShadow; // Pocket / outer denim shadow
        } else {
          ctx.fillStyle = C.jeansBase; // Deep classic denim
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER E: WARM BROWN FACE & JAW SKIN
      // ──────────────────────────────────────────
      if (ny < -0.20 && absX < 0.32) {
        ctx.fillStyle = C.skinHighlight; // Center forehead highlight
      } else if (ny >= -0.02 && ny <= 0.08 && absX <= 0.40) {
        // 5 o'clock subtle jaw stubble dither
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? C.skinStubble : C.skinBase;
      } else if (absX > 0.48 || ny > 0.04) {
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? C.skinShadow : C.skinBase; // Cheek / jaw shadow
      } else {
        ctx.fillStyle = C.skinBase; // Rich natural skin tone
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

/**
 * Draws CJ's 1:1 Authentic GTA San Andreas DARPA Jetpack (ROCKETMAN)
 * Correctly oriented along CJ's body axes:
 * - Mounted firmly on CJ's back (-X)
 * - Top Manifold & Capsule Dome Caps at Upper Back (-Y / Head & Shoulder level)
 * - Twin Brushed Slate-Blue Cylinders extending vertically down the back
 * - Central Olive-Drab Avionics Box with Orange Bays & Hazard Chevrons
 * - Nozzles & Rocket Exhaust Flames blasting DOWNWARD (+Y direction towards ground/feet)
 * Rule 11 Compliant (Zero shadowBlur CPU filters)
 */
function _drawCjJetpack(ctx, r, isJetpackActive) {
  if (!isJetpackActive) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.006;

  ctx.save();

  // Jetpack base anchor on CJ's back (-X direction)
  const jpX = -r * 0.78;
  const tankW = r * 0.34;
  const tankH = r * 0.94;
  const tankTopY = -r * 0.54;
  const tankBtmY = tankTopY + tankH;

  // ── 0. REAR HARNESS & MATTE INDUSTRIAL SILVER / BRUSHED ALUMINUM BACKING MOUNT ──
  const frameGrad = ctx.createLinearGradient(jpX - tankW, tankTopY, jpX + tankW, tankBtmY);
  frameGrad.addColorStop(0.00, '#64748B');
  frameGrad.addColorStop(0.25, '#94A3B8');
  frameGrad.addColorStop(0.50, '#CBD5E1'); // Brushed aluminum sheen
  frameGrad.addColorStop(0.80, '#94A3B8');
  frameGrad.addColorStop(1.00, '#475569');

  ctx.fillStyle = frameGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(jpX - tankW * 0.85, tankTopY + 4, tankW * 2.1, tankH - 12, 3);
  ctx.fill();
  ctx.stroke();

  // Dark-Tan Leather Harness Straps with Heavy Buckles
  ctx.fillStyle = '#784B28'; // Dark-tan leather
  ctx.strokeStyle = '#3D2514';
  ctx.lineWidth = 0.8;
  ctx.fillRect(jpX - tankW * 0.85 + 2, tankTopY + 7, tankW * 2.1 - 4, 3.0);
  ctx.strokeRect(jpX - tankW * 0.85 + 2, tankTopY + 7, tankW * 2.1 - 4, 3.0);
  ctx.fillRect(jpX - tankW * 0.85 + 2, tankBtmY - 14, tankW * 2.1 - 4, 3.0);
  ctx.strokeRect(jpX - tankW * 0.85 + 2, tankBtmY - 14, tankW * 2.1 - 4, 3.0);

  // Central Vertical Manifold Riser Block (Matte Brushed Aluminum)
  const riserGrad = ctx.createLinearGradient(jpX - 4, 0, jpX + 4, 0);
  riserGrad.addColorStop(0.0, '#64748B');
  riserGrad.addColorStop(0.5, '#CBD5E1');
  riserGrad.addColorStop(1.0, '#475569');
  ctx.fillStyle = riserGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.fillRect(jpX - 4, tankTopY - 7, 8, 7);
  ctx.strokeRect(jpX - 4, tankTopY - 7, 8, 7);

  // ── 1. DUAL MUTED OLIVE DRAB / MILITARY GREEN FUEL TANKS (Left & Right) ──
  const tankXPositions = [jpX - tankW * 0.75, jpX + tankW * 0.25];

  for (let tIdx = 0; tIdx < tankXPositions.length; tIdx++) {
    const tX = tankXPositions[tIdx];
    const isLeft = (tIdx === 0);

    // Curved Silver Feeder Tube from Tank Dome to Top Manifold (with black outline)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tX + tankW * 0.5, tankTopY);
    ctx.quadraticCurveTo(tX + tankW * 0.5, tankTopY - 5, (isLeft ? jpX - 3 : jpX + 3), tankTopY - 6);
    ctx.stroke();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 3D Muted Olive Drab / Military Green Gradient
    const tankGrad = ctx.createLinearGradient(tX, 0, tX + tankW, 0);
    tankGrad.addColorStop(0.00, '#2E381C'); // Shadowed olive drab
    tankGrad.addColorStop(0.18, '#44542A'); // Military olive body
    tankGrad.addColorStop(0.40, '#657B3E'); // Top specular military sheen
    tankGrad.addColorStop(0.70, '#44542A'); // Matte green
    tankGrad.addColorStop(1.00, '#1D2411'); // Dark underside shadow

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(tX, tankTopY, tankW, tankH, 6.5);
    ctx.fill();
    ctx.stroke();

    // Top Dome Specular Arc Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(tX + tankW * 0.5, tankTopY + 5.5, 4.0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Vertical Cyan Sight Glass Fuel Gauge Slot
    const glassX = isLeft ? (tX + 1.8) : (tX + tankW - 4.8);
    const glassY = tankTopY + 12;
    const glassW = 3.0;
    const glassH = tankH * 0.48;

    // Recessed Dark Housing
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(glassX, glassY, glassW, glassH, 1.2);
    ctx.fill();
    ctx.stroke();

    // Glowing Cyan Fuel Column
    const fuelGrad = ctx.createLinearGradient(glassX, glassY, glassX + glassW, glassY);
    fuelGrad.addColorStop(0.0, '#0284C7');
    fuelGrad.addColorStop(0.5, '#38BDF8');
    fuelGrad.addColorStop(1.0, '#7DD3FC');
    ctx.fillStyle = fuelGrad;
    ctx.fillRect(glassX + 0.5, glassY + 0.5, glassW - 1.0, glassH - 1.0);

    // White Glint Line on Glass
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(glassX + 0.7, glassY + 1.5, 0.6, glassH - 3.0);

    // Dark Canvas Strap with Heavy Buckles
    const strapY = tankTopY + 8.5;
    const strapH = 5.0;
    const strapGrad = ctx.createLinearGradient(tX - 1, 0, tX + tankW + 1, 0);
    strapGrad.addColorStop(0, '#181B14');
    strapGrad.addColorStop(0.4, '#2B3024');
    strapGrad.addColorStop(1, '#11140E');

    ctx.fillStyle = strapGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tX - 0.8, strapY, tankW + 1.6, strapH);
    ctx.strokeRect(tX - 0.8, strapY, tankW + 1.6, strapH);

    // Heavy Silver Buckle Clasp
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(tX + 1.5, strapY + 1.0, 3.0, strapH - 2.0);
    ctx.fillRect(tX + tankW - 4.5, strapY + 1.0, 3.0, strapH - 2.0);
  }

  // ── 2. CENTRAL OLIVE-DRAB AVIONICS & CONTROL MODULE ──
  const boxW = r * 0.44;
  const boxH = r * 0.76;
  const boxX = jpX - boxW * 0.5;
  const boxY = -r * 0.34;

  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  boxGrad.addColorStop(0.0, '#44542A');
  boxGrad.addColorStop(0.5, '#3B4824');
  boxGrad.addColorStop(1.0, '#242C16');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2.2);
  ctx.fill();
  ctx.stroke();

  // Copper/Brass Side Wiring Brackets connecting Box to Tanks
  const copperYs = [boxY + boxH * 0.38, boxY + boxH * 0.52];
  for (const cY of copperYs) {
    const cGradL = ctx.createLinearGradient(boxX - 3, cY, boxX, cY);
    cGradL.addColorStop(0, '#B45309');
    cGradL.addColorStop(0.5, '#F59E0B');
    cGradL.addColorStop(1, '#92400E');
    ctx.fillStyle = cGradL;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.fillRect(boxX - 3.2, cY - 1.2, 3.6, 2.4);
    ctx.strokeRect(boxX - 3.2, cY - 1.2, 3.6, 2.4);

    const cGradR = ctx.createLinearGradient(boxX + boxW, cY, boxX + boxW + 3, cY);
    cGradR.addColorStop(0, '#92400E');
    cGradR.addColorStop(0.5, '#F59E0B');
    cGradR.addColorStop(1, '#B45309');
    ctx.fillStyle = cGradR;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.fillRect(boxX + boxW - 0.4, cY - 1.2, 3.6, 2.4);
    ctx.strokeRect(boxX + boxW - 0.4, cY - 1.2, 3.6, 2.4);
  }

  // A. Upper Instrument Section Bay
  const upperBayX = boxX + 1.8;
  const upperBayY = boxY + 2.0;
  const upperBayW = boxW - 3.6;
  const upperBayH = boxH * 0.30;

  ctx.fillStyle = '#22280F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.fillRect(upperBayX, upperBayY, upperBayW, upperBayH);
  ctx.strokeRect(upperBayX, upperBayY, upperBayW, upperBayH);

  // White Status Display Monitor
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.fillRect(upperBayX + 1.5, upperBayY + 1.5, upperBayW - 3.0, 2.6);
  ctx.strokeRect(upperBayX + 1.5, upperBayY + 1.5, upperBayW - 3.0, 2.6);

  // Red Rectangular Command Button
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.fillRect(upperBayX + 1.5, upperBayY + 4.8, 4.5, 2.2);
  ctx.strokeRect(upperBayX + 1.5, upperBayY + 4.8, 4.5, 2.2);

  // Status LED Array (Amber, Cyan, Green)
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(upperBayX + 1.5, upperBayY + 7.8, 2.0, 1.6);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(upperBayX + 4.2, upperBayY + 7.8, 2.0, 1.6);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(upperBayX + 6.9, upperBayY + 7.8, 2.0, 1.6);

  // B. Center Authentic Red/Black Caution Hazard Warning Sticker
  const hazX = boxX + 2.6;
  const hazY = boxY + boxH * 0.36;
  const hazW = boxW - 5.2;
  const hazH = boxH * 0.28;

  ctx.save();
  ctx.beginPath();
  ctx.rect(hazX, hazY, hazW, hazH);
  ctx.clip();

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(hazX, hazY, hazW, hazH);

  ctx.fillStyle = '#111827';
  for (let sx = -hazW * 2; sx <= hazW * 3; sx += 3.8) {
    ctx.beginPath();
    ctx.moveTo(hazX + sx, hazY);
    ctx.lineTo(hazX + sx + 2.4, hazY);
    ctx.lineTo(hazX + sx + 2.4 - 4.0, hazY + hazH);
    ctx.lineTo(hazX + sx - 4.0, hazY + hazH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(hazX, hazY, hazW, hazH);

  // C. Lower Switch Section Bay
  const lowerBayX = boxX + 1.8;
  const lowerBayY = boxY + boxH * 0.68;
  const lowerBayW = boxW - 3.6;
  const lowerBayH = boxH * 0.26;

  ctx.fillStyle = '#22280F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.fillRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);
  ctx.strokeRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);

  // 3 Stacked Buttons (Red, Red, Gold)
  const swCols = ['#DC2626', '#DC2626', '#EAB308'];
  for (let s = 0; s < swCols.length; s++) {
    const sY = lowerBayY + 1.2 + s * 2.5;
    ctx.fillStyle = swCols[s];
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.7;
    ctx.fillRect(lowerBayX + 1.8, sY, lowerBayW - 3.6, 1.8);
    ctx.strokeRect(lowerBayX + 1.8, sY, lowerBayW - 3.6, 1.8);
  }

  // ── 3. WIDE OVERHEAD ARCHING EXHAUST MANIFOLD (Dark Charcoal / Burnt-Metal Steel Cross-Pipe) ──
  const archLeftX = tankXPositions[0] - tankW * 0.45;
  const archRightX = tankXPositions[1] + tankW * 1.45;
  const archTopY = tankTopY - 7.0;
  const elbowY = tankTopY + 6.0;

  // 1. Pipe Black Outer Outline Stroke Underlayer
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 11.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, jpX, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 2. Main Dark Charcoal / Burnt-Metal Steel Pipe Body
  const pipeGrad = ctx.createLinearGradient(archLeftX, 0, archRightX, 0);
  pipeGrad.addColorStop(0.0, '#1C1E24');
  pipeGrad.addColorStop(0.25, '#3B424D');
  pipeGrad.addColorStop(0.5, '#16191F');
  pipeGrad.addColorStop(0.75, '#3B424D');
  pipeGrad.addColorStop(1.0, '#1C1E24');

  ctx.strokeStyle = pipeGrad;
  ctx.lineWidth = 7.0;
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, jpX, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 3. Specular Center Highlight Curve
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(archLeftX + 1.5, elbowY - 1.5);
  ctx.quadraticCurveTo(archLeftX + 1.5, archTopY + 1.5, jpX, archTopY + 1.5);
  ctx.quadraticCurveTo(archRightX - 1.5, archTopY + 1.5, archRightX - 1.5, elbowY - 1.5);
  ctx.stroke();

  // ── 4. DOWNWARD-FACING THRUSTER NOZZLES (+Y Direction — Burnt-Metal Steel & Heat-Treated Rings) ──
  const nozzleXs = [archLeftX, archRightX];

  for (let nIdx = 0; nIdx < nozzleXs.length; nIdx++) {
    const nX = nozzleXs[nIdx];

    // Heat-Treated Burnt Bronze/Steel Collar Ring
    const ringW = 7.5;
    const ringH = 4.2;
    const ringY = elbowY;
    const ringGrad = ctx.createLinearGradient(nX - ringW * 0.5, 0, nX + ringW * 0.5, 0);
    ringGrad.addColorStop(0.0, '#78350F');
    ringGrad.addColorStop(0.35, '#D97706');
    ringGrad.addColorStop(0.7, '#92400E');
    ringGrad.addColorStop(1.0, '#451A03');

    ctx.fillStyle = ringGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(nX - ringW * 0.5, ringY, ringW, ringH, 1.0);
    ctx.fill();
    ctx.stroke();

    // Tapered Dark Charcoal / Burnt Steel Nozzle Cone
    const coneTopW = 6.8;
    const coneBtmW = 4.2;
    const coneTopY = ringY + ringH;
    const coneH = 6.5;
    const coneBtmY = coneTopY + coneH;

    const coneGrad = ctx.createLinearGradient(nX - coneTopW * 0.5, 0, nX + coneTopW * 0.5, 0);
    coneGrad.addColorStop(0.0, '#1C1E24');
    coneGrad.addColorStop(0.35, '#3F4654');
    coneGrad.addColorStop(0.7, '#2A303C');
    coneGrad.addColorStop(1.0, '#121418');

    ctx.fillStyle = coneGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(nX - coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneBtmW * 0.5, coneBtmY);
    ctx.lineTo(nX - coneBtmW * 0.5, coneBtmY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Open Exhaust Rim
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.ellipse(nX, coneBtmY, coneBtmW * 0.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── 5. VIBRANT DOWNWARD ROCKET THRUST FLAMES (Shooting in +Y direction) ──
    const flameWobble = Math.sin(time * 16 + nIdx * 7) * 0.15 + Math.cos(time * 24 + nIdx * 11) * 0.10;
    const flameLen = (r * 1.60) * (1.0 + flameWobble);
    const flameSpread = (r * 0.36) * (1.0 + flameWobble * 0.5);

    // Stage 1: Outer Orange / Amber Jet Plume
    const outerFlameGrad = ctx.createLinearGradient(nX, coneBtmY, nX, coneBtmY + flameLen);
    outerFlameGrad.addColorStop(0, 'rgba(255, 170, 0, 0.98)');
    outerFlameGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.88)');
    outerFlameGrad.addColorStop(0.70, 'rgba(234, 88, 12, 0.50)');
    outerFlameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

    ctx.fillStyle = outerFlameGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.50, coneBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.85, coneBtmY + flameLen * 0.45, nX, coneBtmY + flameLen);
    ctx.quadraticCurveTo(nX + flameSpread * 0.85, coneBtmY + flameLen * 0.45, nX + flameSpread * 0.50, coneBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 2: Bright Yellow Core Flame (1:1 with GTA San Andreas)
    const coreFlameGrad = ctx.createLinearGradient(nX, coneBtmY, nX, coneBtmY + flameLen * 0.65);
    coreFlameGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    coreFlameGrad.addColorStop(0.30, 'rgba(255, 230, 0, 0.95)');
    coreFlameGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.60)');
    coreFlameGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.fillStyle = coreFlameGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.30, coneBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.45, coneBtmY + flameLen * 0.28, nX, coneBtmY + flameLen * 0.65);
    ctx.quadraticCurveTo(nX + flameSpread * 0.45, coneBtmY + flameLen * 0.28, nX + flameSpread * 0.30, coneBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 3: Intense White-Hot Throat Stream
    const throatGrad = ctx.createLinearGradient(nX, coneBtmY, nX, coneBtmY + flameLen * 0.30);
    throatGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    throatGrad.addColorStop(0.60, 'rgba(254, 240, 138, 0.90)');
    throatGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = throatGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.15, coneBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.20, coneBtmY + flameLen * 0.14, nX, coneBtmY + flameLen * 0.30);
    ctx.quadraticCurveTo(nX + flameSpread * 0.20, coneBtmY + flameLen * 0.14, nX + flameSpread * 0.15, coneBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 4: Micro Sparks Trailing in the Downward Jet Wash
    for (let s = 0; s < 2; s++) {
      const sparkPhase = ((time * 32 + s * 19 + nIdx * 29) % 45);
      const sparkX = nX + Math.sin(sparkPhase * 1.8) * (flameSpread * 0.35);
      const sparkY = coneBtmY + flameLen * 0.25 + sparkPhase * 1.5;
      const sparkAlpha = Math.max(0, 1.0 - sparkPhase / 45);

      ctx.fillStyle = `rgba(255, 230, 0, ${sparkAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws BAGUVIX God-Mode & Cheat Code Matrix Aura
 * Rule 11 & Rule 16 Compliant: Zero shadowBlur, purely geometric & gradient based.
 */
function _drawCjCheatAura(ctx, r, isGodMode, isHesoyamActive, isRespectAura = false) {
  if (!isGodMode && !isHesoyamActive && !isRespectAura) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.0035;

  ctx.save();

  // ── 1. Expanding Golden / Emerald God Mode Barrier Rings ──
  const primaryColor = (isGodMode || isRespectAura) ? 'rgba(245, 158, 11, ' : 'rgba(34, 197, 94, ';
  const ringCount = isGodMode ? 3 : 2;

  for (let i = 0; i < ringCount; i++) {
    const waveProgress = ((time * 0.45 + i * (1.0 / ringCount)) % 1.0);
    const waveR = r * (1.05 + waveProgress * 0.75);
    const waveAlpha = (1.0 - waveProgress) * 0.60;

    ctx.strokeStyle = `${primaryColor}${waveAlpha.toFixed(3)})`;
    ctx.lineWidth = 2.2 * (1.0 - waveProgress * 0.45);
    ctx.setLineDash([8, 6, 4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── 2. Floating Cash Dollar Signs ($) & Binary Cheat Particles ──
  const particleCount = isGodMode ? 8 : 5;
  for (let p = 0; p < particleCount; p++) {
    const pAngle = time * 1.8 + (p * (Math.PI * 2 / particleCount));
    const pDist = r * (1.35 + Math.sin(time * 2.5 + p) * 0.25);
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    ctx.fillStyle = isGodMode ? '#FDE047' : '#4ADE80';
    ctx.font = `bold ${Math.round(r * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', px, py);
  }

  // ── 3. Subtle Radial Shield Glow Fills (Rule 11: Radial Gradient) ──
  const shieldGrad = ctx.createRadialGradient(0, 0, r * 0.80, 0, 0, r * 1.55);
  shieldGrad.addColorStop(0, `${primaryColor}0.10)`);
  shieldGrad.addColorStop(0.70, `${primaryColor}0.25)`);
  shieldGrad.addColorStop(1, `${primaryColor}0)`);
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws High-Contrast Ground Shadow Silhouette & Thruster Scorch beneath CJ when flying
 * Gives the 3D optical depth illusion of levitation/floating in mid-air (similar to Trickster & Gojo)
 * Rule 11 Compliant (Zero shadowBlur CPU filters)
 */
function _drawCjGroundShadow(ctx, fighter, r, z, isJetpackActive) {
  if (!isJetpackActive && z <= 0) return;

  const floatZ = Math.max(14, z || 26);
  const levFactor = Math.min(1.0, floatZ / 40);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const heatPulse = 0.70 + Math.sin(now * 0.016) * 0.30;

  ctx.save();
  // Anchor shadow strictly to the ground plane (with perspective ground offset)
  ctx.translate(fighter.x, fighter.y + 8);
  ctx.scale(1.0, 0.48); // Natural perspective ground ellipse

  // 1. Thruster Floor Scorch Burn Rings (Twin orange-yellow heat wash under nozzles)
  const angle = fighter.gunAngle || fighter.angle || 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const perpX = -sinA;
  const perpY = cosA;
  const backDist = r * 0.75;
  const nozzleSpread = 16;

  // Left & Right Nozzle floor heat spots
  [-1, 1].forEach(side => {
    const spotX = -cosA * backDist + perpX * (side * nozzleSpread);
    const spotY = -sinA * backDist + perpY * (side * nozzleSpread);
    const spotR = 24;

    const heatGlow = ctx.createRadialGradient(spotX, spotY, 2, spotX, spotY, spotR);
    heatGlow.addColorStop(0, `rgba(251, 191, 36, ${(0.65 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(0.35, `rgba(249, 115, 22, ${(0.45 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(0.75, `rgba(234, 88, 12, ${(0.20 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.fillStyle = heatGlow;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Soft Ambient Outer Ground Shadow
  const shadowR = r * (1.45 + levFactor * 0.20);
  const ambientShadow = ctx.createRadialGradient(0, 0, r * 0.30, 0, 0, shadowR);
  ambientShadow.addColorStop(0, `rgba(0, 0, 0, ${(0.78 * levFactor).toFixed(3)})`);
  ambientShadow.addColorStop(0.60, `rgba(0, 0, 0, ${(0.45 * levFactor).toFixed(3)})`);
  ambientShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = ambientShadow;
  ctx.beginPath();
  ctx.arc(0, 0, shadowR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crisp High-Contrast Inner Ground Silhouette Core (Body & Backpack)
  const coreR = r * (1.10 - levFactor * 0.15);
  ctx.fillStyle = `rgba(8, 10, 18, ${(0.88 * levFactor).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  // Backpack silhouette lobe extending backward
  const backLobeX = -cosA * (r * 0.45);
  const backLobeY = -sinA * (r * 0.45);
  ctx.arc(backLobeX, backLobeY, coreR * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Main Skin Renderer for Carl "CJ" Johnson
 * Fully conforms to Rule 19, Rule 20, and Rule 11
 */
export function drawCjSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const z = fighter.z || 0;
  const previewIdx = fighter.previewWeaponIndex !== undefined ? fighter.previewWeaponIndex : null;
  const isTec9Active = Boolean(previewIdx === 4 || fighter.isTec9Active);
  const isMinigunActive = Boolean(fighter.isBaguvixActive || fighter.isGodModeActive || previewIdx === 3);
  const isJetpackActive = Boolean(fighter.isJetpackActive || (fighter.jetpackTimer && fighter.jetpackTimer > 0) || z > 0 || previewIdx === 1 || previewIdx === 2);
  const isUziActive = Boolean(previewIdx === 2 || (isJetpackActive && previewIdx !== 1 && !isMinigunActive && !isTec9Active));

  // ── LAYER -1: GROUND SHADOW SILHOUETTE (Drawn on ground plane before Z-elevation) ──
  _drawCjGroundShadow(ctx, fighter, r, z, isJetpackActive);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - z);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Punch Animation Progress (Sinusoidal lead jab / overhand cross)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isPunching = !isPodiumPreview && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);

  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  const easePunch = isPunching ? Math.sin(rawProgress * Math.PI) : 0;
  const lungeExtension = easePunch * (r * 1.35);

  // Hand Position Coordinates
  let frontX = r * 0.95, frontY = 0;
  let backX = 0, backY = 0;
  let hideFrontHand = false;
  let hideBackHand = true;

  if (isMinigunActive) {
    hideBackHand = false; // Both hands grip the heavy M134 Minigun
    const mgScale = 1.15;
    const mgAnchorX = r * 1.67;
    // Back hand grips the forward upright carry handle loop in front
    backX = mgAnchorX + (6.0 * mgScale);
    backY = -14.0 * mgScale;
    // Front hand grips the rear chainsaw spade grip holder at the back
    frontX = mgAnchorX + (-36.5 * mgScale);
    frontY = -12.5 * mgScale;
  } else if (isJetpackActive && isUziActive) {
    hideBackHand = false; // Both hands active during Jetpack Dual Uzi mode
    backX = r * 0.88;
    backY = -r * 0.38;
    frontX = r * 0.96;
    frontY = r * 0.38;
  } else if (isJetpackActive && !isUziActive) {
    hideBackHand = true;
    frontX = r * 0.95;
    frontY = 0;
  } else if (isPunching) {
    frontX = r * 0.95 + lungeExtension * 1.40;
    frontY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else {
    frontX = r * 0.95;
    frontY = 0;
  }

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (hideHandsAndWeapon || fighter.hideFrontHand) hideFrontHand = true;
  if (hideHandsAndWeapon || fighter.hideBackHand) hideBackHand = true;

  const handRadius = getHandSize(7.5);
  const skinColor = '#8D5538'; // Authentic warm brown skin tone

  // Status checks for Jetpack & Cheats
  const isGodMode = Boolean(fighter.isBaguvixActive || fighter.isGodModeActive);
  const isHesoyamActive = Boolean(fighter.hesoyamShield && fighter.hesoyamShield > 0);
  const isRespectAura = Boolean(
    fighter.isGroveStreetOg ||
    (fighter.respectAuraTimer && fighter.respectAuraTimer > 0) ||
    (fighter.respect && fighter.respect >= 50)
  );

  // ── LAYER 0: JETPACK & CHEAT AURA (Background Layer) ──
  _drawCjCheatAura(ctx, r, isGodMode, isHesoyamActive, isRespectAura);
  _drawCjJetpack(ctx, r, isJetpackActive);

  // ── LAYER 1: BACK HAND (Behind Body Layer — Left Micro-Uzi / Minigun Forward Grip / Fist) ──
  if (!hideBackHand) {
    if (isMinigunActive) {
      const minigunRecoil = fighter.minigunRecoil || 0;
      // Back hand grips forward upright support handle loop
      drawCjPixelHand(ctx, backX - minigunRecoil, backY, handRadius * 0.92, skinColor, 0, true);
    } else if (isJetpackActive && isUziActive) {
      const recoilB = fighter.uziRecoilBack || 0;
      const flashB = fighter.uziFlashTimerBack || 0;
      // 1. Draw hand base FIRST behind the gun
      drawCjPixelHand(ctx, backX - recoilB * 0.5 - 6, backY, handRadius * 0.92, skinColor, 0, true);
      // 2. Draw Micro-Uzi ON TOP of the hand (never overlayed by hand)
      drawCjMicroUzi(ctx, backX, backY, 1.05, recoilB, flashB);
    } else {
      drawCjPixelHand(ctx, backX, backY, handRadius * 0.92, skinColor, rawProgress, false);
    }
  }

  // ── LAYER 2: PROCEDURAL PIXEL ART BODY (SAITAMA TECH & RULE 19 COMPLIANT) ──
  drawCjPixelBody(ctx, r, isJetpackActive);

  // ── LAYER 3: FRONT HAND (Front Layer — On Top of Body Circle — Minigun / Right Micro-Uzi / Fist) ──
  if (!hideFrontHand) {
    if (isMinigunActive) {
      const minigunRecoil = fighter.minigunRecoil || 0;
      const minigunFlash = fighter.minigunFlashTimer || 0;
      const minigunHeat = (previewIdx === 3) ? 0.35 : (fighter.minigunHeat || 0);
      const minigunSpin = (previewIdx === 3) ? (Date.now() * 0.004) : (fighter.minigunSpinAngle || 0);

      // 1. Draw M134 Heavy Minigun centered at fighter forward anchor
      drawCjMinigun(ctx, r * 0.92, 0, 0, r, {
        scale: 1.15,
        recoil: minigunRecoil,
        flashTimer: minigunFlash,
        heat: minigunHeat,
        spinAngle: minigunSpin
      });

      // 2. Draw front hand gripping the rear trigger spade housing holder at the back
      drawCjPixelHand(ctx, frontX - minigunRecoil, frontY, handRadius, skinColor, 0, true);
    } else if (isTec9Active) {
      const recoilTec = fighter.tec9Recoil || 0;
      const flashTec = fighter.tec9Flash || 0;
      // 1. Draw hand base FIRST behind the gun
      drawCjPixelHand(ctx, frontX - recoilTec * 0.5 - 6, frontY, handRadius, skinColor, 0, true);
      // 2. Draw Intratec TEC-9 ON TOP of the hand
      drawCjTec9(ctx, frontX, frontY, 1.15, recoilTec, flashTec);
    } else if (isJetpackActive && isUziActive) {
      const recoilF = fighter.uziRecoilFront || 0;
      const flashF = fighter.uziFlashTimerFront || 0;
      // 1. Draw hand base FIRST behind the gun
      drawCjPixelHand(ctx, frontX - recoilF * 0.5 - 6, frontY, handRadius, skinColor, 0, true);
      // 2. Draw Micro-Uzi ON TOP of the hand (never overlayed by hand)
      drawCjMicroUzi(ctx, frontX, frontY, 1.05, recoilF, flashF);
    } else {
      drawCjPixelHand(ctx, frontX, frontY, handRadius, skinColor, rawProgress, false);
    }
  }

  ctx.restore(); // restore local transform

  // ── LAYER 4: RETRO GTA CHEAT CODE TYPING HUD OVERLAY (World Upright) ──
  if (fighter.isTypingCheat && fighter.cheatCodeString) {
    _drawCjCheatTypingOverlay(ctx, fighter, r);
  }
}

/**
 * Renders simple, clean typing text directly above CJ's head as he spells out the cheat.
 */
function _drawCjCheatTypingOverlay(ctx, fighter, r) {
  const fullCode = fighter.cheatCodeString || '';
  const typedCount = Math.min(fullCode.length, fighter.cheatTypedChars || 0);
  const typedSub = fullCode.slice(0, typedCount);
  const isComplete = (typedCount >= fullCode.length);

  // Blinking vertical bar pipe cursor (|)
  const showCursor = !isComplete && (Math.floor(Date.now() / 160) % 2 === 0);
  const displayText = typedSub + (showCursor ? '|' : '');

  ctx.save();
  ctx.translate(fighter.x, fighter.y - r - 16);

  ctx.font = 'bold 14px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp black outline for clarity against any arena background
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.strokeText(displayText, 0, 0);

  // Simple clean fill: White while typing, Emerald Green when complete
  ctx.fillStyle = isComplete ? '#22C55E' : '#FFFFFF';
  ctx.fillText(displayText, 0, 0);

  ctx.restore();
}
