// ─────────────────────────────────────────────
// John Wick ("The Baba Yaga") Fighter Skin & Body Model
// Authentic 1:1 Procedural Pixel Art Model
// Strictly adheres to:
// - Rule 19 (Upright Front POV, No Eyes/Mouth/Nose Standard)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

let _johnWickPixelSkinImage = null;
let _johnWickPixelSkinLoading = false;

/**
 * Preload and retrieve the John Wick Pixel Art PNG body model
 */
export function _getJohnWickPixelSkinImage() {
  if (_johnWickPixelSkinImage && _johnWickPixelSkinImage.complete && _johnWickPixelSkinImage.naturalWidth > 0) {
    return _johnWickPixelSkinImage;
  }
  if (!_johnWickPixelSkinLoading && typeof Image !== 'undefined') {
    _johnWickPixelSkinLoading = true;
    const img = new Image();
    img.onload = () => {
      _johnWickPixelSkinImage = img;
      _johnWickPixelSkinLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load John Wick pixel skin at Assets/model/Johnwick-pixel-skin.png', e);
      _johnWickPixelSkinLoading = false;
    };
    img.src = 'Assets/model/Johnwick-pixel-skin.png?v=2';
    _johnWickPixelSkinImage = img;
  }
  return _johnWickPixelSkinImage;
}

let _johnWickHairImage = null;
let _johnWickHairImageLoading = false;

/**
 * Preload and retrieve the John Wick hair PNG image overlay
 */
export function _getJohnWickHairImage() {
  if (_johnWickHairImage && _johnWickHairImage.complete && _johnWickHairImage.naturalWidth > 0) {
    return _johnWickHairImage;
  }
  if (!_johnWickHairImageLoading && typeof Image !== 'undefined') {
    _johnWickHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _johnWickHairImage = img;
      _johnWickHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load John Wick hair image at Assets/model/Johnwick-hair.png', e);
      _johnWickHairImageLoading = false;
    };
    img.src = 'Assets/model/Johnwick-hair.png?v=1';
    _johnWickHairImage = img;
  }
  return _johnWickHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getJohnWickPixelSkinImage();
  _getJohnWickHairImage();
}

/**
 * Draws John Wick's authentic pixel-art hair from Assets/model/Johnwick-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawJohnWickHair(ctx, r, facingLeft = false) {
  const hairImg = _getJohnWickHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.john_wick) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Johnwick-hair.png (1254x1254). True visible hair bounding box:
    // X: [165, 1088] (width 924, horizontal center at 626.5)
    // Y: [209, 1120] (height 912, top crown at 209)
    // Calibrated to cleanly frame the upper circle with center-parted locks
    const targetHairWidth = r * 2.85 * wMult;
    const targetHairHeight = r * 2.40 * hMult;
    const scaleX = targetHairWidth / 924;
    const scaleY = targetHairHeight / 912;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -626.5 * scaleX + offX;
    const drawY = -r * 1.65 - 209 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Draws a tactical fist with black suit sleeve cuff in authentic Pixel Art Style.
 */
export function drawJohnWickPixelHand(ctx, x, y, radius, skinColor) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const handX = snap(x);
  const handY = snap(y);
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  // 1. Black Suit Sleeve Cuff (Behind hand, -X)
  const cuffW = snap(radius * 0.9);
  const cuffH = snap(radius * 1.5);
  const cuffX = snap(handX - radius * 0.85);
  const cuffY = snap(handY - cuffH * 0.5);

  ctx.fillStyle = '#0B0C10'; // Outer outline
  ctx.fillRect(cuffX - P, cuffY - P, cuffW + P * 2, cuffH + P * 2);
  ctx.fillStyle = '#14151A'; // Black suit sleeve
  ctx.fillRect(cuffX, cuffY, cuffW, cuffH);

  // White shirt cuff peek line
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cuffX + cuffW - P, cuffY + P, P, cuffH - P * 2);

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
        ctx.fillStyle = '#0B0C10';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Knuckle & palm shading
      if (ry > gridR * 0.35 || rx < -gridR * 0.30) {
        ctx.fillStyle = '#CE8F6F'; // Hand shadow / knuckle crease
      } else if (rx > 0 && ry < -gridR * 0.25) {
        ctx.fillStyle = '#F3BF9F'; // Top highlight
      } else {
        ctx.fillStyle = skinColor || '#E8AC8B'; // Natural skin tone
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for John Wick ("The Baba Yaga")
 * Renders the pixelated skin model image (Johnwick-pixel-skin.png) with nearest-neighbor scaling
 * with its authentic 4-neighbor attached black pixel stroke border.
 */
/**
 * Authentic 1:1 Procedural Pixel Art Body for John Wick ("The Baba Yaga")
 * Uses pure discrete 2D grid-scan rasterization loop with zero subpixel bleed (P = 2.0px, Rule #19 & Rule #35 compliant).
 * Exact same tech, grid resolution, and border calculation as Saitama's skin.
 */
export function drawJohnWickPixelBody(ctx, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Constants matching Saitama standard
  const C = {
    outline: '#0E0F14',        // Pure dark manga ink border (exact Saitama tech)
    skinBase: '#E8AC8B',       // Warm peach face skin
    skinHighlight: '#F3BF9F',  // Forehead highlight
    skinCrownGlint: '#FFF0E4', // Top bald cranium glint
    skinShadow: '#CE8F6F',     // Cheek shadow dither
    beardBase: '#121318',      // Keanu signature beard & soul patch
    beardHighlight: '#262834', // Beard texture highlight
    scarRed: '#C42B2B',        // Cheek battle cut core
    scarDark: '#7A1010',       // Scab line
    scarLight: '#E86E6E',      // Slash edge glint
    shirtWhite: '#FFFFFF',     // Crisp white dress shirt
    shirtShadow: '#C8D0DC',    // Shirt collar fold shadow
    suitBase: '#13141A',       // Bespoke black tailored suit jacket
    suitLapel: '#1E2028',      // Satin lapel
    suitHighlight: '#303340',  // Lapel edge highlight
    tieBase: '#0E0F14',        // Charcoal black necktie
    tieHighlight: '#2A2C38'    // Tie blade crease
  };

  // Helper functions for geometric regions
  // 1. Soul patch test
  const isSoulPatch = (nx, ny) => {
    if (ny < 0.12 || ny > 0.19) return false;
    const t = (ny - 0.12) / 0.07;
    const halfW = 0.05 * (1.0 - t * 0.8);
    return Math.abs(nx) <= halfW;
  };

  // 2. Beard & jawline test (clean jawline contour without mustache)
  const isBeard = (nx, ny) => {
    const absX = Math.abs(nx);
    if (ny > 0.34 || ny < 0.10) return false;
    // Outer jawline
    const jawY = 0.32 - 0.42 * Math.pow(absX / 0.56, 2.0);
    if (ny > jawY) return false;

    // Inner boundary
    const innerY = 0.20 - 0.26 * Math.pow(absX / 0.42, 2.0);
    return ny >= innerY;
  };

  // 3. Cheek battle cut scar test
  const isCheekScar = (nx, ny) => {
    // Left cheek (viewer's right, nx in [0.24, 0.39], ny in [-0.13, +0.03])
    if (nx < 0.24 || nx > 0.39 || ny < -0.13 || ny > 0.03) return false;
    const scarLineY = -0.05 + (nx - 0.31) * 1.15;
    return Math.abs(ny - scarLineY) <= P / r * 0.9;
  };

  // 4. Suit and tie test
  const getShirtHalfWidth = (ny) => {
    if (ny < 0.10 || ny > 0.72) return 0;
    return 0.30 * (1.0 - (ny - 0.10) / 0.62);
  };

  const isShirt = (nx, ny) => {
    if (ny < 0.10 || ny > 0.72) return false;
    return Math.abs(nx) <= getShirtHalfWidth(ny);
  };

  const isTie = (nx, ny) => {
    if (ny < 0.28 || ny > 0.96) return false;
    if (ny <= 0.38) {
      return Math.abs(nx) <= 0.075; // Tie knot
    }
    if (ny <= 0.88) {
      return Math.abs(nx) <= 0.065; // Tie blade
    }
    // Bottom triangular tip
    return Math.abs(nx) <= 0.065 * (1.0 - (ny - 0.88) / 0.08);
  };

  const isLapel = (nx, ny) => {
    if (ny < 0.12 || ny > 0.85) return false;
    const absX = Math.abs(nx);
    const shirtW = getShirtHalfWidth(ny);
    // Lapels flank the shirt opening
    return absX > shirtW && absX <= shirtW + 0.24;
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

      // Pixelated Black Stroke Border (Exact Saitama tech)
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
      // LAYER A: BEARD & SOUL PATCH (Mustache removed)
      // ──────────────────────────────────────────
      if (isSoulPatch(nx, ny) || isBeard(nx, ny)) {
        // Outline test
        const isBeardEdge = (
          (!isSoulPatch(nx + P / r, ny) && !isBeard(nx + P / r, ny)) ||
          (!isSoulPatch(nx - P / r, ny) && !isBeard(nx - P / r, ny)) ||
          (!isSoulPatch(nx, ny + P / r) && !isBeard(nx, ny + P / r)) ||
          (!isSoulPatch(nx, ny - P / r) && !isBeard(nx, ny - P / r))
        );

        if (isBeardEdge) {
          ctx.fillStyle = C.outline;
        } else if ((gx + gy) % 2 === 0 && ny > 0.22) {
          ctx.fillStyle = C.beardHighlight; // Beard hair texture
        } else {
          ctx.fillStyle = C.beardBase;
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER B: CHEEK CUT SCAR
      // ──────────────────────────────────────────
      if (isCheekScar(nx, ny)) {
        if (nx > 0.34 || ny < -0.08) {
          ctx.fillStyle = C.scarDark;
        } else if (nx < 0.28) {
          ctx.fillStyle = C.scarLight;
        } else {
          ctx.fillStyle = C.scarRed;
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER C: TORSO & SUIT (ny >= 0.10)
      // ──────────────────────────────────────────
      if (ny >= 0.10) {
        // C1. Tie
        if (isTie(nx, ny)) {
          const isTieEdge = !isTie(nx + P / r, ny) || !isTie(nx - P / r, ny) || !isTie(nx, ny + P / r) || !isTie(nx, ny - P / r);
          if (isTieEdge) {
            ctx.fillStyle = C.outline;
          } else if (Math.abs(nx) < P / r * 0.5 && ny > 0.38) {
            ctx.fillStyle = C.tieHighlight; // Center blade crease
          } else {
            ctx.fillStyle = C.tieBase;
          }
        }
        // C2. White Dress Shirt
        else if (isShirt(nx, ny)) {
          const isShirtEdge = !isShirt(nx + P / r, ny) || !isShirt(nx - P / r, ny);
          if (isShirtEdge || ny < 0.14) {
            ctx.fillStyle = C.shirtShadow; // Collar rim shadow
          } else {
            ctx.fillStyle = C.shirtWhite;
          }
        }
        // C3. Suit Lapels
        else if (isLapel(nx, ny)) {
          const isLapelOuterEdge = Math.abs(absX - (getShirtHalfWidth(ny) + 0.24)) <= P / r * 0.8;
          if (isLapelOuterEdge) {
            ctx.fillStyle = C.outline;
          } else if (Math.abs(absX - (getShirtHalfWidth(ny) + 0.20)) <= P / r * 0.8) {
            ctx.fillStyle = C.suitHighlight; // Satin lapel edge highlight
          } else {
            ctx.fillStyle = C.suitLapel;
          }
        }
        // C4. Suit Base Jacket
        else {
          ctx.fillStyle = (absX > 0.70 || ny > 0.85) ? C.outline : C.suitBase;
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // LAYER D: WARM FAIR FACE & BALD CRANIUM SKIN
      // ──────────────────────────────────────────
      if (ny < -0.65 && absX < 0.45) {
        ctx.fillStyle = C.skinCrownGlint; // Top crown bald glint / shine
      } else if (ny < -0.35 && absX < 0.50) {
        ctx.fillStyle = C.skinHighlight; // Forehead highlight
      } else if (absX > 0.68) {
        ctx.fillStyle = C.skinShadow; // Side temple & jaw shadow
      } else if (absX > 0.50 || ny > 0.02) {
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? C.skinShadow : C.skinBase; // Lower cheek & chin shadow
      } else {
        ctx.fillStyle = C.skinBase; // Base warm peach skin
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

// Pre-seeded static particle array for aura motes (Zero GC allocation per frame)
const _WICK_AURA_MOTES = Array.from({ length: 14 }, (_, i) => ({
  speed: 0.6 + (i % 5) * 0.25,
  phase: (i * 0.45) % (Math.PI * 2),
  radiusMul: 1.05 + ((i * 17) % 70) * 0.01,
  size: 1.4 + ((i * 13) % 20) * 0.1,
  isGold: i % 4 === 0
}));

/**
 * Draws John Wick's Emanating Black-Gray Assassin Aura during Ultimate Mode (Excommunicado / M4 Rifle)
 * Rule 11 & Rule 16 Compliant: Zero shadowBlur, purely geometric & gradient based.
 */
export function drawJohnWickExcommunicadoAura(ctx, r, isForeground = false) {
  const now = Date.now();
  const time = now * 0.0032;

  ctx.save();

  if (!isForeground) {
    // ── 1. DEEP GROUND SHADOW / VOID VORTEX (Rule 11: Radial Gradient) ──
    const groundGrad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 2.35);
    groundGrad.addColorStop(0,    'rgba(5, 5, 8, 0.82)');
    groundGrad.addColorStop(0.30, 'rgba(23, 28, 38, 0.58)');
    groundGrad.addColorStop(0.65, 'rgba(51, 65, 85, 0.28)');
    groundGrad.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.35, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. CONCENTRIC EXPANDING DARK CORONA SHOCKWAVES ──
    for (let w = 0; w < 2; w++) {
      const waveProgress = ((time * 0.55 + w * 0.50) % 1.0);
      const waveR = r * (1.05 + waveProgress * 0.85);
      const waveAlpha = (1.0 - waveProgress) * 0.45;
      ctx.strokeStyle = `rgba(30, 41, 59, ${waveAlpha.toFixed(3)})`;
      ctx.lineWidth = 2.4 * (1.0 - waveProgress * 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 3. EMANATING DARK FLAME & SMOKE TENDRILS (18 Organic Petals) ──
    const tendrilCount = 18;
    for (let i = 0; i < tendrilCount; i++) {
      const baseA = (i / tendrilCount) * Math.PI * 2;
      const wobble = Math.sin(time * 2.8 + i * 1.4) * 0.14;
      const angle = baseA + wobble;
      const len = r * (1.28 + Math.sin(time * 3.4 + i * 2.2) * 0.34);
      const halfWidth = 0.18;

      const tipX = Math.cos(angle) * len;
      const tipY = Math.sin(angle) * len;
      const leftX = Math.cos(baseA - halfWidth) * (r * 0.95);
      const leftY = Math.sin(baseA - halfWidth) * (r * 0.95);
      const rightX = Math.cos(baseA + halfWidth) * (r * 0.95);
      const rightY = Math.sin(baseA + halfWidth) * (r * 0.95);
      const midCtrlX = Math.cos(angle + 0.10) * (len * 0.62);
      const midCtrlY = Math.sin(angle + 0.10) * (len * 0.62);

      let color = 'rgba(10, 12, 16, 0.84)'; // Deep ink black
      if (i % 3 === 1) color = 'rgba(51, 65, 85, 0.68)'; // Steel charcoal gray
      else if (i % 3 === 2) color = 'rgba(30, 41, 59, 0.55)'; // Cold slate smoke

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.quadraticCurveTo(midCtrlX, midCtrlY, tipX, tipY);
      ctx.quadraticCurveTo(midCtrlX * 0.85, midCtrlY * 0.85, rightX, rightY);
      ctx.closePath();
      ctx.fill();
    }

    // ── 4. ORBITING ASH & SHADOW MOTES ──
    for (let m = 0; m < _WICK_AURA_MOTES.length; m++) {
      const mote = _WICK_AURA_MOTES[m];
      const motA = (time * mote.speed + mote.phase) % (Math.PI * 2);
      const motDist = r * (mote.radiusMul + Math.sin(time * 2.2 + mote.phase) * 0.22);
      const mx = Math.cos(motA) * motDist;
      const my = Math.sin(motA) * motDist;

      if (mote.isGold) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.70)'; // Faint Continental Gold speck
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)'; // Slate silver ash mote
      }

      ctx.beginPath();
      ctx.arc(mx, my, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // ── FOREGROUND RIM & VOLUMETRIC SMOKE WHISPERS ──
    // Subtle pulsating charcoal-silver rim around John Wick's circumference
    const rimPulse = 0.55 + Math.sin(time * 4.0) * 0.25;
    ctx.strokeStyle = `rgba(148, 163, 184, ${rimPulse.toFixed(3)})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, r + 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Frontal smoke wisps crossing over body
    for (let f = 0; f < 4; f++) {
      const fAngle = (time * 1.8 + f * 1.57) % (Math.PI * 2);
      const fDist = r * (0.45 + Math.sin(time * 2.5 + f) * 0.35);
      const fx = Math.cos(fAngle) * fDist;
      const fy = Math.sin(fAngle) * fDist;
      const fw = r * 0.32;

      ctx.fillStyle = (f % 2 === 0) ? 'rgba(15, 23, 42, 0.28)' : 'rgba(71, 85, 105, 0.22)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, fw, fw * 0.55, fAngle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for John Wick ("The Baba Yaga")
 */
export function drawJohnWickSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 360° Tactical Roll Spin (Forward = Clockwise, Backward = Counter-Clockwise)
  const isRolling = Boolean(fighter.isRolling && fighter.rollTimer > 0);
  if (isRolling) {
    const rollMax = fighter.rollMaxTimer || 20;
    const rollProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.rollTimer / rollMax)));
    const spinSign = fighter.isRollingBack ? -1 : 1;
    const spinAngle = spinSign * (Math.PI * 2 * rollProgress);
    ctx.rotate(spinAngle);
  }

  // 2. Animation & Punch/Gun-Fu Extension Progress
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isPunching = !isPodiumPreview && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isPencilStabbing = !isPodiumPreview && Boolean(fighter.pencilAttackTimer && fighter.pencilAttackTimer > 0);

  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  } else if (isPencilStabbing) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
    const maxT = fighter.pencilMaxTime || cfg.cqcPencilStabDuration || 36;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.pencilAttackTimer / maxT)));
  }

  const easePunch = isPunching ? Math.sin(rawProgress * Math.PI) : 0;
  const lungeExtension = easePunch * (r * 1.15);

  // Hand Position Coordinates (CAR stance / CQC grapple / Pencil Assassination)
  let frontX = r * 0.88, frontY = r * 0.22;
  let backX = r * 0.72, backY = r * 0.38;
  let hideFrontHand = false;
  let hideBackHand = false;

  if (isPencilStabbing) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
    const windupF = cfg.cqcPencilWindupFrames ?? 14;
    const thrustF = cfg.cqcPencilThrustFrames ?? 8;
    const pullbackF = cfg.cqcPencilPullbackFrames ?? 14;
    const totalF = fighter.pencilMaxTime || cfg.cqcPencilStabDuration || (windupF + thrustF + pullbackF);

    const windupRatio = Math.min(0.85, Math.max(0.1, windupF / totalF));
    const thrustRatio = Math.min(0.95, Math.max(windupRatio + 0.05, (windupF + thrustF) / totalF));

    if (rawProgress < windupRatio) {
      // 1. Chamber / Pullback Phase: Smoothly retract arm & hand back to chest
      const chamberT = rawProgress / windupRatio;
      const easeChamber = (1 - Math.cos(chamberT * Math.PI)) * 0.5; // Smooth ease-in-out
      frontX = r * (0.88 - 0.45 * easeChamber);
      frontY = r * (0.22 + 0.04 * easeChamber);
      backX = r * (0.45 + 0.05 * easeChamber);
      backY = r * 0.36;
    } else if (rawProgress < thrustRatio) {
      // 2. Explosive Forward Stab Phase: Plunges front hand straight forward deep into target
      const thrustT = (rawProgress - windupRatio) / (thrustRatio - windupRatio);
      const easeThrust = 1 - Math.pow(1 - thrustT, 3); // Snappy ease-out cubic
      frontX = r * (0.43 + 1.42 * easeThrust);
      frontY = r * (0.24 - 0.02 * easeThrust);
      backX = r * 0.40;
      backY = r * 0.36;
    } else {
      // 3. Snappy Pullback Phase: Retracts hand cleanly back to guard position
      const pullT = (rawProgress - thrustRatio) / (1.0 - thrustRatio);
      const easePull = (1 - Math.cos(pullT * Math.PI)) * 0.5; // Smooth ease-in-out
      frontX = r * (1.85 - 0.97 * easePull);
      frontY = r * (0.22 + 0.02 * easePull);
      backX = r * 0.45;
      backY = r * 0.36;
    }
  } else if (isPunching) {
    if (fighter.punchAnimHand === 1) {
      // Punch 2: Cross hook with back hand
      frontX = r * 0.70 - lungeExtension * 0.2;
      frontY = -r * 0.08;
      backX = r * 0.90 + lungeExtension * 1.4;
      backY = r * 0.12 - Math.sin(rawProgress * Math.PI) * (r * 0.15);
    } else {
      // Punch 1: Lead punch with front hand
      frontX = r * 0.90 + lungeExtension * 1.4;
      frontY = Math.sin(rawProgress * Math.PI) * (r * 0.15);
      backX = r * 0.65 - lungeExtension * 0.2;
      backY = r * 0.15;
    }
  } else if (fighter.currentEquippedWeapon === 'shotgun') {
    // Two-handed Tactical Shotgun: hide generic hand circles during aiming/firing
    const isShotgunReloading = Boolean(fighter.isReloading && fighter.reloadTimer > 0);
    if (!isShotgunReloading) {
      hideFrontHand = true;
      hideBackHand = true;
    } else {
      hideBackHand = true;
      const relMax = fighter.reloadMaxTime || 96;
      const relP = 1.0 - (fighter.reloadTimer / relMax);
      if (relP > 0.88) {
        hideFrontHand = true;
      } else {
        const cycleP = (relP * 6) % 1.0;
        const feedOffset = -Math.sin(cycleP * Math.PI) * (r * 0.24);
        frontX = r * 0.96 + feedOffset;
        frontY = r * 0.10 - Math.sin(cycleP * Math.PI) * (r * 0.08);
      }
    }
  } else if (fighter.currentEquippedWeapon === 'rifle') {
    // Two-handed M4 Rifle: hide generic hand circles during aiming/firing
    const isRifleReloading = Boolean(fighter.isReloading && fighter.reloadTimer > 0);
    if (!isRifleReloading) {
      hideFrontHand = true;
      hideBackHand = true;
    } else {
      hideBackHand = true;
      const relMax = fighter.reloadMaxTime || 85;
      const relP = 1.0 - (fighter.reloadTimer / relMax);
      if (relP < 0.28) {
        const p1 = relP / 0.28;
        frontX = r * 0.95 - p1 * (r * 0.12);
        frontY = r * 0.22 + p1 * (r * 0.50);
      } else if (relP < 0.55) {
        const p2 = (relP - 0.28) / 0.27;
        frontX = r * 0.55;
        frontY = r * 0.72 - Math.sin(p2 * Math.PI) * (r * 0.12);
      } else if (relP < 0.85) {
        const p3 = (relP - 0.55) / 0.30;
        frontX = r * 0.82 + p3 * (r * 0.13);
        frontY = r * 0.72 - p3 * (r * 0.50);
      } else {
        hideFrontHand = true;
      }
    }
  } else {
    // Default Pistol CAR Stance with Recoil
    const recoilKick = (fighter.recoilOffset || 0) * 0.60;
    frontX = r * 0.88 - recoilKick;
    frontY = r * 0.28;
    backX = r * 0.72 - recoilKick;
    backY = r * 0.42;
  }

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isRolling;
  if (hideHandsAndWeapon || fighter.hideFrontHand) hideFrontHand = true;
  if (hideHandsAndWeapon || fighter.hideBackHand) hideBackHand = true;
  const handRadius = getHandSize(7.2);
  const skinColor = '#E8AC8B';

  // ── ULTIMATE MODE EMANATING BLACK-GRAY ASSASSIN AURA (Background Layer) ──
  const isUltimate = Boolean(
    fighter.isUltimateMode ||
    fighter.isExcommunicado ||
    fighter.currentEquippedWeapon === 'rifle' ||
    (fighter.cqcComboPhase === 'PENCIL_STAB')
  );

  if (isUltimate) {
    drawJohnWickExcommunicadoAura(ctx, r, false);
  }

  // ── LAYER 1: BACK HAND (Behind Body Layer) ──
  if (!hideBackHand) {
    drawJohnWickPixelHand(ctx, backX, backY, handRadius * 0.92, skinColor);
  }

  // ── EVADE BUFF / ROLL INTANGIBILITY AFTERIMAGE GHOSTS ──
  const isSuppressed = typeof fighter?.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);
  const isEvading = !isSuppressed && Boolean(fighter.isRolling || (fighter.evadeBuffTimer && fighter.evadeBuffTimer > 0));
  if (isEvading) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(-10, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-20, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 0.78;
  }

  // ── LAYER 2: MAIN BODY CIRCLE (100% DISCRETE 2D PIXEL ART ENGINE) ──
  drawJohnWickPixelBody(ctx, r);

  // ── LAYER 3: PIXEL ART HAIR OVERLAY (Assets/model/Johnwick-hair.png) ──
  _drawJohnWickHair(ctx, r, facingLeft);

  // ── PASSIVE 1: BALLISTIC TAILORED SUIT (Kevlar Weave Shimmer Overlay) ──
  if (fighter.suitShimmerTimer > 0) {
    const shimmerP = fighter.suitShimmerTimer / 14;
    const shimmerAlpha = Math.sin(shimmerP * Math.PI) * 0.70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = `rgba(148, 163, 184, ${0.45 * shimmerAlpha})`;
    ctx.lineWidth = 1.0;
    const gridStep = 4.5;
    for (let gx = -r; gx <= r; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, -r);
      ctx.lineTo(gx, r);
      ctx.stroke();
    }
    for (let gy = -r; gy <= r; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(-r, gy);
      ctx.lineTo(r, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(203, 213, 225, ${0.90 * shimmerAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ── ULTIMATE MODE EMANATING BLACK-GRAY ASSASSIN AURA (Foreground Whispers & Rim Glow) ──
  if (isUltimate) {
    drawJohnWickExcommunicadoAura(ctx, r, true);
  }

  // ── LAYER 4: FRONT HAND (Front Layer — On Top of Body) ──
  if (!hideFrontHand) {
    drawJohnWickPixelHand(ctx, frontX, frontY, handRadius, skinColor);
  }

  // Status Overlays (Stun, Slow, Bleed, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

