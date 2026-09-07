// ─────────────────────────────────────────────
// AOI TODO — THE BOOGIE WOOGIE BRAWLER
// Authentic Pixel Art Skin Renderer
// Matching Saitama / Yuji / Sukuna Pixel Art Tech
//
// Adhering strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Faceless Skin Standards - Strictly NO eyes, mouth, or nose)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { GojoRenderer } from './gojoRenderer.js';
import { state } from '../../core/state.js';

// Pre-rendered body and fist caches for zero-GC 60 FPS performance
let _cachedTodoNormalCanvas = null;
let _cachedTodoZoneCanvas = null;
let _cachedTodoR = 0;

let _cachedFistNormalCanvas = null;
let _cachedFistZoneCanvas = null;
let _cachedFistRadius = 0;

let _todoBfGlowCanvas = null;
let _todoBlueGlowCanvas = null;

// Pre-rendered Pixel Art Heart & Star Canvases for Takada Idol Aura (Zero GC)
let _cachedPixelHeartPinkCanvas = null;
let _cachedPixelHeartGoldCanvas = null;
let _cachedPixelStarGoldCanvas = null;
let _cachedPixelStarPinkCanvas = null;

function _initTodoTakadaSprites() {
  if (typeof document === 'undefined' || _cachedPixelHeartPinkCanvas) return;

  const P = 2.0;
  const size = 18;

  // Helper to render pixel heart
  function renderPixelHeart(outlineCol, coreCol, highlightCol, shadeCol) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    // 7x7 pixel heart matrix
    const map = [
      " 11 11 ",
      "1221221",
      "1322221",
      "1222241",
      " 12241 ",
      "  141  ",
      "   1   "
    ];

    const offsetX = Math.floor((size - 7 * P) / 2);
    const offsetY = Math.floor((size - 7 * P) / 2);

    for (let r = 0; r < map.length; r++) {
      for (let col = 0; col < map[r].length; col++) {
        const ch = map[r][col];
        if (ch === ' ') continue;
        if (ch === '1') g.fillStyle = outlineCol;
        else if (ch === '2') g.fillStyle = coreCol;
        else if (ch === '3') g.fillStyle = highlightCol;
        else if (ch === '4') g.fillStyle = shadeCol;
        g.fillRect(offsetX + col * P, offsetY + r * P, P, P);
      }
    }
    return c;
  }

  // Helper to render pixel star
  function renderPixelStar(outlineCol, coreCol, highlightCol) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    // 7x7 diamond sparkle star matrix
    const map = [
      "   1   ",
      "  121  ",
      " 12321 ",
      "1233321",
      " 12321 ",
      "  121  ",
      "   1   "
    ];

    const offsetX = Math.floor((size - 7 * P) / 2);
    const offsetY = Math.floor((size - 7 * P) / 2);

    for (let r = 0; r < map.length; r++) {
      for (let col = 0; col < map[r].length; col++) {
        const ch = map[r][col];
        if (ch === ' ') continue;
        if (ch === '1') g.fillStyle = outlineCol;
        else if (ch === '2') g.fillStyle = coreCol;
        else if (ch === '3') g.fillStyle = highlightCol;
        g.fillRect(offsetX + col * P, offsetY + r * P, P, P);
      }
    }
    return c;
  }

  _cachedPixelHeartPinkCanvas = renderPixelHeart('#3A0620', '#FF3399', '#FFFFFF', '#BE185D');
  _cachedPixelHeartGoldCanvas = renderPixelHeart('#4A2A04', '#FBBF24', '#FFFFFF', '#D97706');
  _cachedPixelStarGoldCanvas  = renderPixelStar('#4A2A04', '#FBBF24', '#FFFFFF');
  _cachedPixelStarPinkCanvas  = renderPixelStar('#3A0620', '#EC4899', '#FFFFFF');
}

function _initTodoGlowCanvases() {
  if (typeof document === 'undefined' || _todoBfGlowCanvas) return;

  // 1. Black Flash Zone Glow: Lilac-white core -> Deep Crimson red -> Stark Black edge
  _todoBfGlowCanvas = document.createElement('canvas');
  _todoBfGlowCanvas.width = 64;
  _todoBfGlowCanvas.height = 64;
  const bfCtx = _todoBfGlowCanvas.getContext('2d');
  const bfGrad = bfCtx.createRadialGradient(32, 32, 5, 32, 32, 32);
  bfGrad.addColorStop(0,    'rgba(243, 232, 255, 0.95)');
  bfGrad.addColorStop(0.35, 'rgba(179, 0, 0, 0.85)');
  bfGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.75)');
  bfGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
  bfCtx.fillStyle = bfGrad;
  bfCtx.fillRect(0, 0, 64, 64);

  // 2. Blue standard JJK CE glow
  _todoBlueGlowCanvas = document.createElement('canvas');
  _todoBlueGlowCanvas.width = 64;
  _todoBlueGlowCanvas.height = 64;
  const bCtx = _todoBlueGlowCanvas.getContext('2d');
  const bGrad = bCtx.createRadialGradient(32, 32, 5, 32, 32, 32);
  bGrad.addColorStop(0,    'rgba(255, 255, 255, 0.85)');
  bGrad.addColorStop(0.35, 'rgba(0, 235, 255, 0.70)');
  bGrad.addColorStop(0.75, 'rgba(0, 140, 255, 0.35)');
  bGrad.addColorStop(1.0,  'rgba(0, 80, 255, 0)');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 64, 64);
}

/**
 * Renders the authentic stepped pixel-art fist into an offscreen canvas.
 */
function _renderFistToCanvas(destCtx, radius, inBFState) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  const outlineCol = inBFState ? '#1A0A0E' : '#0E0F14';
  const baseSkin   = inBFState ? '#D88A75' : '#EBBF9E';
  const shadowCol  = inBFState ? '#A85D4B' : '#C49677';
  const glintCol   = inBFState ? '#FFEAE5' : '#FFF3E8';

  // 1. Dark Manga Ink Outline Shell
  destCtx.fillStyle = outlineCol;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 2. Inner Base Skin Tone
  destCtx.fillStyle = baseSkin;
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 3. Knuckle Depth Shading
  destCtx.fillStyle = shadowCol;
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 4. Knuckle Specular Glint Pixels
  destCtx.fillStyle = glintCol;
  const hx = Math.round(P * 0.5);
  const hy = Math.round(-innerR * 0.45);
  destCtx.fillRect(hx, hy, P, P);
  destCtx.fillRect(hx + P, hy, P, P);

  destCtx.restore();
}

/**
 * Draws a brawler fist matching skin color with optional Cursed Energy glow
 */
function drawHandFist(ctx, x, y, radius, skinColor, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();

  const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || (fighter && fighter._isWinnerReveal));
  const inBFState = (fighter && (fighter.justSwappedTimer > 0 || fighter.blackFlashGlowTimer > 0));
  const bfVal = fighter ? Math.max(fighter.justSwappedTimer || 0, fighter.blackFlashGlowTimer || 0) : 0;
  const alpha = isMatchEnded ? 0.90 : (bfVal / 45);

  // 1. CE glow around fist
  const opacity = (fighter && fighter._isWinnerReveal) ? 0 : ((fighter && fighter.combatAuraOpacity !== undefined) ? fighter.combatAuraOpacity : 0.0);
  const glow = Math.max(opacity, inBFState ? alpha : 0);
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  if (!isLowQuality && glow > 0.01) {
    _initTodoGlowCanvases();
    const glowCanvas = inBFState ? _todoBfGlowCanvas : _todoBlueGlowCanvas;
    if (glowCanvas) {
      const glowR = radius * 1.8;
      ctx.globalAlpha = Math.max(0, Math.min(1.0, inBFState ? alpha : glow));
      ctx.drawImage(glowCanvas, x - glowR, y - glowR, glowR * 2, glowR * 2);
    }
  }

  // 2. Pre-rendered Stepped Pixel-Art Fist
  if (typeof document !== 'undefined') {
    if (!_cachedFistNormalCanvas || !_cachedFistZoneCanvas || _cachedFistRadius !== radius) {
      _cachedFistRadius = radius;
      const size = Math.ceil((radius + 6) * 2);

      _cachedFistNormalCanvas = document.createElement('canvas');
      _cachedFistNormalCanvas.width = size;
      _cachedFistNormalCanvas.height = size;
      const fCtxNormal = _cachedFistNormalCanvas.getContext('2d');
      _renderFistToCanvas(fCtxNormal, radius, false);

      _cachedFistZoneCanvas = document.createElement('canvas');
      _cachedFistZoneCanvas.width = size;
      _cachedFistZoneCanvas.height = size;
      const fCtxZone = _cachedFistZoneCanvas.getContext('2d');
      _renderFistToCanvas(fCtxZone, radius, true);
    }

    const fistCanvas = inBFState ? _cachedFistZoneCanvas : _cachedFistNormalCanvas;
    if (fistCanvas) {
      ctx.globalAlpha = 1.0;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fistCanvas, x - fistCanvas.width / 2, y - fistCanvas.height / 2);
    }
  }

  ctx.restore();
}

/**
 * Procedural Pixel Art Render Function for Aoi Todo's body model.
 * Upright Front POV, Faceless (Rule #19 compliant), with signature left burn scar,
 * combed black hair, topknot man-bun, purple compression shirt, white obi sash, and hakama pants.
 */
function _renderTodoPixelBodyToCanvas(destCtx, r, inBFState) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Hairline shape calculation: smooth combed-back widow's peak
  function getHairlineY(rx) {
    const nx = rx / r; // -1 to +1
    return -r * 0.40 + (1 - nx * nx) * (r * 0.14);
  }

  // ─────────────────────────────────────────────
  // 1. TOPKNOT BUN (Above top edge of head at -Y)
  // ─────────────────────────────────────────────
  const bunCenterX = 0;
  const bunCenterY = -r * 0.94;
  const bunRadius  = r * 0.35;
  const bunSteps   = Math.ceil((bunRadius + P) / P);

  // Bun Outer Outline Shell
  destCtx.fillStyle = '#0A0A0E';
  for (let gy = -bunSteps; gy <= bunSteps; gy++) {
    for (let gx = -bunSteps; gx <= bunSteps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= bunRadius + P * 0.75) {
        destCtx.fillRect(snap(bunCenterX + gx * P), snap(bunCenterY + gy * P), P, P);
      }
    }
  }

  // Bun Black Hair Fill & Texture
  for (let gy = -bunSteps; gy <= bunSteps; gy++) {
    for (let gx = -bunSteps; gx <= bunSteps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= bunRadius) {
        const px = snap(bunCenterX + gx * P);
        const py = snap(bunCenterY + gy * P);
        let col = '#0E0E14';
        if (gy * P < -bunRadius * 0.35 && Math.abs(gx * P) < bunRadius * 0.55) {
          col = '#242432'; // Topknot crown highlight
        } else if (dist > bunRadius - P * 0.8) {
          col = '#08080C'; // Bun inner contour
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  // White Hair Tie Band across base of Topknot
  const tieW = r * 0.38;
  const tieH = P * 2;
  const tieY = -r * 0.74;
  for (let gx = -Math.ceil(tieW / (2 * P)); gx <= Math.ceil(tieW / (2 * P)); gx++) {
    const px = snap(gx * P);
    if (Math.abs(px) <= tieW / 2) {
      destCtx.fillStyle = '#0E0F14';
      destCtx.fillRect(px, snap(tieY - P), P, P);
      destCtx.fillRect(px, snap(tieY + tieH), P, P);

      destCtx.fillStyle = (Math.abs(px) < P * 1.5) ? '#FFFFFF' : '#E0E8F2';
      destCtx.fillRect(px, snap(tieY), P, P);
      destCtx.fillStyle = '#BAC5D6';
      destCtx.fillRect(px, snap(tieY + P), P, P);
    }
  }

  // ─────────────────────────────────────────────
  // 2. MAIN BODY CIRCLE (Upright Front POV)
  // ─────────────────────────────────────────────
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Border Shell
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        destCtx.fillStyle = inBFState ? '#1A0A0E' : '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const hairlineY = getHairlineY(rx);
      const nx = rx / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: Combed Black Hair (ry < hairlineY)
      // ──────────────────────────────────────────
      if (ry < hairlineY) {
        let col = '#0E0E14';
        if (ry < -r * 0.72 && absX < 0.50) {
          col = '#282836'; // Crown specular highlight
        } else if (ry < -r * 0.52 && Math.abs(Math.round(rx / P) % 3) === 0) {
          col = '#1E1E2A'; // Combed strand texture
        } else if (ry > hairlineY - P * 1.8) {
          col = '#08080C'; // Root shadow
        } else if (absX > 0.75) {
          col = '#0A0A10'; // Temple hair shadow
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Face Skin & Iconic Left Burn Scar (hairlineY <= ry < r * 0.12)
      // ──────────────────────────────────────────
      else if (ry < r * 0.12) {
        // Base Face Skin Palette
        let col = inBFState ? '#D88A75' : '#EBBF9E';
        if (ry < hairlineY + P * 2.0) {
          col = inBFState ? '#BF6E5A' : '#D69E7B'; // Hairline forehead shadow
        } else if (ry < -r * 0.10 && absX < 0.40) {
          col = inBFState ? '#E8A28E' : '#F5D2B8'; // Center forehead highlight
        } else if (absX > 0.72 || ry > r * 0.02) {
          col = inBFState ? '#A85A48' : '#D49D79'; // Jaw / cheek shadow
        }

        // ── Todo's Signature Left Facial Burn Scar ──
        // Spans left temple down to jawbone (rx < -r * 0.08 to -r * 0.65, ry in [-r * 0.52, r * 0.06])
        let isScar = false;
        let isScarEdge = false;
        let isScarCrease = false;

        if (rx <= -r * 0.08 && rx >= -r * 0.65 && ry >= -r * 0.50 && ry <= r * 0.06) {
          // Organically shaped scar profile across left temple & cheekbone
          const scarProg = (ry - (-r * 0.50)) / (r * 0.56); // 0.0 (temple) -> 1.0 (jaw)
          let scarMinX, scarMaxX;
          if (scarProg < 0.45) {
            // Temple to upper cheekbone (widens outward)
            scarMinX = -r * 0.62;
            scarMaxX = -r * 0.10 - (1 - scarProg / 0.45) * (r * 0.15);
          } else {
            // Cheekbone to jaw (tapers back inward)
            const t = (scarProg - 0.45) / 0.55;
            scarMinX = -r * 0.62 + t * (r * 0.16);
            scarMaxX = -r * 0.10 - t * (r * 0.12);
          }

          if (rx >= scarMinX && rx <= scarMaxX) {
            isScar = true;
            // Scar dark outer boundary border
            if (rx <= scarMinX + P * 1.0 || rx >= scarMaxX - P * 1.0 || ry <= -r * 0.48 || ry >= r * 0.04) {
              isScarEdge = true;
            }
            // Horizontal burn tissue texture lines
            if (Math.round((ry + r) / P) % 3 === 0) {
              isScarCrease = true;
            }
          }
        }

        if (isScar) {
          if (isScarEdge) {
            destCtx.fillStyle = inBFState ? '#5E1B15' : '#7D3D32'; // Scar dark contour edge
          } else if (isScarCrease) {
            destCtx.fillStyle = inBFState ? '#8A3228' : '#AF6859'; // Deep crease tissue
          } else {
            destCtx.fillStyle = inBFState ? '#A84438' : '#C88576'; // Warm dusty rose scar base
          }
        } else {
          destCtx.fillStyle = col;
        }

        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Deep Magenta/Purple Athletic Shirt (r * 0.12 <= ry < r * 0.50)
      // ──────────────────────────────────────────
      else if (ry < r * 0.50) {
        // Crew-Neck Collar Seam below chin (ry in [r * 0.12, r * 0.18], absX < 0.40)
        const isCollar = (ry <= r * 0.18 && absX < 0.40);
        const isCollarRim = (isCollar && (ry <= r * 0.14 || Math.abs(absX - 0.38) <= 0.06));

        // Center Sternum Seam
        const isSternumSeam = (absX < 0.05 && ry >= r * 0.18 && ry <= r * 0.46);

        // Pectoral Muscle Highlights
        const isPecHighlight = (ry >= r * 0.22 && ry <= r * 0.38 && absX >= 0.12 && absX <= 0.46);

        // Short-Sleeve Shoulder Seams
        const isShoulderSeam = (absX > 0.68 && ry >= r * 0.16 && ry <= r * 0.42);

        if (isCollarRim) {
          destCtx.fillStyle = '#300A38'; // Dark collar outline
        } else if (isCollar) {
          destCtx.fillStyle = '#4A1254'; // Collar band
        } else if (isSternumSeam || isShoulderSeam) {
          destCtx.fillStyle = '#3E1045'; // Deep shirt seam shadow
        } else if (isPecHighlight) {
          destCtx.fillStyle = '#882E95'; // Pectoral muscle highlight
        } else if (ry > r * 0.42 || absX > 0.62) {
          destCtx.fillStyle = '#4E1656'; // Lower shirt fold shadow
        } else {
          destCtx.fillStyle = '#6B2375'; // Base Magenta Purple shirt
        }

        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Thick White Belt Sash / Obi (r * 0.50 <= ry < r * 0.68)
      // ──────────────────────────────────────────
      else if (ry < r * 0.68) {
        // Obi Horizontal Fold Crease Line
        const isCrease = Math.abs(ry - r * 0.59) <= P * 0.6;
        // Center Knot Detail
        const isCenterKnot = (absX <= 0.16);

        if (isCenterKnot) {
          if (absX >= 0.12 || Math.abs(ry - r * 0.59) >= r * 0.07) {
            destCtx.fillStyle = '#788698'; // Knot tie contour
          } else {
            destCtx.fillStyle = '#D4DCE8'; // Knot center plate
          }
        } else if (ry <= r * 0.52) {
          destCtx.fillStyle = '#FFFFFF'; // Top obi rim highlight
        } else if (isCrease) {
          destCtx.fillStyle = '#BAC5D6'; // Crease fold line
        } else if (ry >= r * 0.65) {
          destCtx.fillStyle = '#A0ACB8'; // Bottom obi shadow
        } else {
          destCtx.fillStyle = '#F0F4F8'; // Base White Obi
        }

        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: Dark Hakama Martial Artist Pants (ry >= r * 0.68)
      // ──────────────────────────────────────────
      else {
        // Center Vertical Inseam Pleat
        const isInseam = (absX <= 0.04);
        // Left & Right Hakama Pleat Highlights
        const isPleat = (absX >= 0.22 && absX <= 0.38 && ry < r * 0.88);

        if (isInseam) {
          destCtx.fillStyle = '#0A090D'; // Deep center inseam
        } else if (isPleat) {
          destCtx.fillStyle = '#2A2533'; // Pleat highlight
        } else if (absX > 0.70 || ry > r * 0.88) {
          destCtx.fillStyle = '#0E0C12'; // Pants outer shadow
        } else {
          destCtx.fillStyle = '#18151D'; // Base Hakama dark charcoal
        }

        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Takada-chan Idol Ultimate Aura:
 * - Unclipped world-space projection with smart boundary checking so banner/auras are NEVER sliced
 * - Authentic stepped Pixel-Art Hearts (♥) & Sparkle Stars (✦) rendered via pre-rendered canvas sprites
 * - Stepped concentric pixel rings in radiant pink & gold
 * - Compliant with Rule #11 (No shadowBlur CPU filters) with zero-GC allocations per frame
 */
function drawTakadaIdolAura(ctx, fighter) {
  const r = fighter.r || 25;
  const now = Date.now();
  const time = now * 0.003;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  _initTodoTakadaSprites();

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Radiant Stepped Pixel-Art Idol Aura Rings
  const ringCount = isLowQuality ? 2 : 3;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  for (let i = 0; i < ringCount; i++) {
    const scale = 1.20 + Math.sin(time * 2.2 + i * 1.5) * 0.12;
    const ringR = r * scale + i * 8;
    const ringCol = (i % 2 === 0) ? 'rgba(244, 114, 182, 0.75)' : 'rgba(251, 191, 36, 0.75)';

    const ringSteps = Math.max(12, Math.round((ringR * Math.PI * 2) / (P * 3.2)));
    ctx.fillStyle = ringCol;
    for (let s = 0; s < ringSteps; s++) {
      const a = (s / ringSteps) * Math.PI * 2 + (i % 2 === 0 ? time * 0.7 : -time * 0.7);
      const px = snap(Math.cos(a) * ringR);
      const py = snap(Math.sin(a) * ringR);
      ctx.fillRect(px, py, P, P);
    }
  }

  // 2. Animated Stepped Pixel-Art Hearts (♥) & Stars (✦) Orbiting Todo (Zero-GC texture blits)
  const particleCount = isLowQuality ? 4 : 8;
  for (let i = 0; i < particleCount; i++) {
    const sAngle = time * 1.4 + (i * Math.PI * 2 / particleCount);
    const orbitDist = r * 1.52 + Math.sin(time * 2.6 + i * 1.2) * (r * 0.22);
    const sx = Math.cos(sAngle) * orbitDist;
    const sy = Math.sin(sAngle) * orbitDist;

    // Bobbing scale pulse
    const pScale = 0.90 + Math.sin(time * 3.8 + i) * 0.20;
    const sprSize = Math.round(14 * pScale);

    let sprite = null;
    if (i % 4 === 0) {
      sprite = _cachedPixelHeartPinkCanvas;
    } else if (i % 4 === 1) {
      sprite = _cachedPixelStarGoldCanvas;
    } else if (i % 4 === 2) {
      sprite = _cachedPixelHeartGoldCanvas;
    } else {
      sprite = _cachedPixelStarPinkCanvas;
    }

    if (sprite) {
      ctx.drawImage(sprite, Math.round(sx - sprSize / 2), Math.round(sy - sprSize / 2), sprSize, sprSize);
    }
  }

  // 3. Unclipped Glowing "♥ TAKADA-CHAN ♥" Pixel Banner (Smart boundary clamping)
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : null;
  const worldX = fighter.x;
  const worldY = fighter.y - (fighter.z || 0);

  // Pixel-Art Badge Plate dimensions
  const text = '♥ TAKADA-CHAN ♥';
  ctx.font = 'bold 11px Outfit, monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(text).width;
  const padX = 8;
  const badgeW = Math.round(textW + padX * 2);
  const badgeH = 18;

  let bannerRelY = -r - 35; // Default distance above head
  let bannerRelX = 0;

  if (arena) {
    const topMargin = (arena.y || 0) + 16;
    if (worldY + bannerRelY < topMargin) {
      // Smoothly push banner down to stay completely visible without clipping
      bannerRelY = topMargin - worldY;
    }
    const leftMargin = (arena.x || 0) + badgeW / 2 + 8;
    const rightMargin = (arena.x || 0) + (arena.width || 0) - badgeW / 2 - 8;
    if (worldX + bannerRelX < leftMargin) {
      bannerRelX = leftMargin - worldX;
    } else if (worldX + bannerRelX > rightMargin) {
      bannerRelX = rightMargin - worldX;
    }
  }

  const badgeX = Math.round(bannerRelX - badgeW / 2);
  const badgeY = Math.round(bannerRelY - badgeH / 2);

  // Stepped Pixel Badge Plate with Dark Outer Shell & Radiant Magenta/Pink Fill
  ctx.fillStyle = '#1A0612';
  ctx.fillRect(snap(badgeX - P), snap(badgeY - P), snap(badgeW + P * 2), snap(badgeH + P * 2));

  ctx.fillStyle = '#831843';
  ctx.fillRect(snap(badgeX), snap(badgeY), snap(badgeW), snap(badgeH));

  // Top Highlight & Bottom Shadow Lines
  ctx.fillStyle = '#EC4899';
  ctx.fillRect(snap(badgeX), snap(badgeY), snap(badgeW), P);

  ctx.fillStyle = '#50072B';
  ctx.fillRect(snap(badgeX), snap(badgeY + badgeH - P), snap(badgeW), P);

  // Corner Pixel Cutouts for retro arcade badge shape
  ctx.clearRect(snap(badgeX - P), snap(badgeY - P), P, P);
  ctx.clearRect(snap(badgeX + badgeW), snap(badgeY - P), P, P);
  ctx.clearRect(snap(badgeX - P), snap(badgeY + badgeH), P, P);
  ctx.clearRect(snap(badgeX + badgeW), snap(badgeY + badgeH), P, P);

  // Layer 1: Dark drop shadow
  ctx.fillStyle = '#260416';
  ctx.fillText(text, bannerRelX + 1, bannerRelY + 1);
  // Layer 2: Radiant White / Gold Core Text
  ctx.fillStyle = '#FFF1F2';
  ctx.fillText(text, bannerRelX, bannerRelY);

  ctx.restore();
}

/**
 * Visual Skin Renderer for Aoi Todo (Boogie Woogie Brawler)
 * Recreated in Authentic Pixel Art Style matching Saitama / Yuji / Sukuna standards.
 */
export function drawTodoSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const skinColor = '#EBBF9E';
  const now = Date.now();
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Draw Takada-chan Idol Ultimate Aura if active or channeling
  if (fighter.isTakadaUltActive || fighter.isTakadaChanneling) {
    ctx.save();
    drawTakadaIdolAura(ctx, fighter);
    ctx.restore();
  }

  // 2. Draw Cursed Energy body aura if opacity > 0 (disabled on winner reveal / podium)
  const auraOpacity = isPodiumPreview ? 0 : (fighter.combatAuraOpacity || 0);
  if (auraOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = auraOpacity;
    drawTodoCursedEnergyAura(ctx, fighter);
    ctx.restore();
  }

  // 3. Black Flash Zone Visual Indicator (Stepped pixel crackling lightning streaks)
  const inBFState = !isPodiumPreview && Boolean(fighter.justSwappedTimer > 0 || fighter.blackFlashGlowTimer > 0 || fighter.blackFlashTimer > 0);
  if (inBFState) {
    const bfVal = Math.max(fighter.justSwappedTimer || 0, fighter.blackFlashGlowTimer || 0, fighter.blackFlashTimer || 0);
    const pulse = 0.6 + Math.sin(now * 0.015) * 0.4;
    const sparkCount = 4;
    const rotSpeed = now * 0.016;
    const P = 2.0;

    for (let i = 0; i < sparkCount; i++) {
      const a = (Math.PI / 2) * i + rotSpeed;
      const sDist = r + 4;
      const x0 = Math.round((Math.cos(a) * sDist) / P) * P;
      const y0 = Math.round((Math.sin(a) * sDist) / P) * P;
      const x1 = Math.round((Math.cos(a + 0.3) * (sDist + 10)) / P) * P;
      const y1 = Math.round((Math.sin(a + 0.3) * (sDist + 10)) / P) * P;

      // Black outer streak
      ctx.fillStyle = `rgba(0, 0, 0, ${pulse * 0.85})`;
      const steps = 4;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round((x0 + (x1 - x0) * (s / steps)) / P) * P;
        const py = Math.round((y0 + (y1 - y0) * (s / steps)) / P) * P;
        ctx.fillRect(px - P, py - P, P * 2, P * 2);
      }

      // Crimson core line
      ctx.fillStyle = `rgba(220, 20, 40, ${pulse})`;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round((x0 + (x1 - x0) * (s / steps)) / P) * P;
        const py = Math.round((y0 + (y1 - y0) * (s / steps)) / P) * P;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }
  }

  // 4. Orientation & Facing Angle
  const isClapping = !isPodiumPreview && Boolean((fighter.clapAnimTimer || 0) > 0 || (fighter.clapWindupTimer || 0) > 0 || (fighter.clapHoldTimer || 0) > 0);
  let angle = isPodiumPreview ? 0 : (fighter.gunAngle || fighter.angle || 0);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (isClapping) {
    angle = facingLeft ? Math.PI : 0;
  }
  ctx.rotate(angle);
  if (facingLeft) ctx.scale(1, -1);

  // 5. Punch & Clap Dynamics
  const isPunching = !isPodiumPreview && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  let rawProgress = 0;
  let easePunch = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retractT = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retractT * (Math.PI / 2));
    }
  }
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;

  let frontHandX = 0, frontHandY = 0;
  let clapLeftHandX = 0, clapLeftHandY = 0;
  let clapRightHandX = 0, clapRightHandY = 0;

  if (isClapping) {
    const animTimer = fighter.clapAnimTimer || 0;
    const windupTimer = fighter.clapWindupTimer || 0;

    let spread = 0;
    if (windupTimer > 0) {
      // Windup phase (7 frames): hands start wide apart on left/right and slam together
      const windupProgress = (7 - windupTimer) / 7.0;
      spread = r * 0.85 * Math.pow(1 - windupProgress, 1.8) + r * 0.06;
    } else {
      // Impact & release phase (13 frames): hands held together at center then retract
      const releaseProgress = Math.min(1.0, (13 - animTimer) / 13.0);
      if (releaseProgress < 0.25) {
        spread = r * 0.06; // Held together on impact
      } else {
        const retractP = (releaseProgress - 0.25) / 0.75;
        spread = r * 0.06 + r * 0.45 * Math.sin(retractP * Math.PI * 0.5);
      }
    }

    clapLeftHandX  = r * 0.88;
    clapLeftHandY  = -spread;
    clapRightHandX = r * 0.88;
    clapRightHandY = +spread;
  } else if (isPunching) {
    frontHandX = r * 0.95 + lungeExtension * 1.40;
    frontHandY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else {
    frontHandX = r * 0.95;
    frontHandY = 0;
  }

  const handRadius = getHandSize(7.5);

  // 6. MAIN BODY CIRCLE (AUTHENTIC PIXEL ART MODEL)
  if (typeof document !== 'undefined') {
    if (!_cachedTodoNormalCanvas || !_cachedTodoZoneCanvas || _cachedTodoR !== r) {
      _cachedTodoR = r;
      const size = Math.ceil((r + 14) * 2);

      _cachedTodoNormalCanvas = document.createElement('canvas');
      _cachedTodoNormalCanvas.width = size;
      _cachedTodoNormalCanvas.height = size;
      const tCtxNormal = _cachedTodoNormalCanvas.getContext('2d');
      _renderTodoPixelBodyToCanvas(tCtxNormal, r, false);

      _cachedTodoZoneCanvas = document.createElement('canvas');
      _cachedTodoZoneCanvas.width = size;
      _cachedTodoZoneCanvas.height = size;
      const tCtxZone = _cachedTodoZoneCanvas.getContext('2d');
      _renderTodoPixelBodyToCanvas(tCtxZone, r, true);
    }

    const bodyCanvas = inBFState ? _cachedTodoZoneCanvas : _cachedTodoNormalCanvas;
    if (bodyCanvas) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bodyCanvas, -bodyCanvas.width / 2, -bodyCanvas.height / 2);
    }
  } else {
    _renderTodoPixelBodyToCanvas(ctx, r, inBFState);
  }

  // 7. Render Hands (Front Layer - On Top of Body Circle)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isPodiumPreview;
  if (!shouldHideHands) {
    if (isClapping) {
      // Draw BOTH hands in front of body to show full clap animation facing the user!
      if (!fighter.hideBackHand) {
        drawHandFist(ctx, clapLeftHandX, clapLeftHandY, handRadius, skinColor, fighter);
      }
      if (!fighter.hideFrontHand) {
        drawHandFist(ctx, clapRightHandX, clapRightHandY, handRadius, skinColor, fighter);
      }

      // Clap impact shockwave flash at palms collision point
      const windupTimer = fighter.clapWindupTimer || 0;
      const animTimer = fighter.clapAnimTimer || 0;
      if (windupTimer === 0 && animTimer > 8) {
        const flashAlpha = Math.min(1.0, (animTimer - 8) / 5.0);
        ctx.save();
        const flashGrad = ctx.createRadialGradient(r * 0.88, 0, 2, r * 0.88, 0, handRadius * 2.2);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashAlpha})`);
        flashGrad.addColorStop(0.4, `rgba(0, 229, 255, ${0.75 * flashAlpha})`);
        flashGrad.addColorStop(1.0, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(r * 0.88, 0, handRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (!fighter.hideFrontHand) {
      drawHandFist(ctx, frontHandX, frontHandY, handRadius, skinColor, fighter);
    }
  }

  // 8. Status Overlays (stun, slow, burn, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();

  // 9. Draw Cursed Rocks (drawn in absolute world space outside fighter transform)
  drawCursedRocks(ctx, fighter);
}

/**
 * Draws Todo's Cursed Rocks in authentic Pixel Art Style.
 */
export function drawCursedRocks(ctx, fighter) {
  if (!fighter.cursedRocks || fighter.cursedRocks.length === 0) return;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  for (let rock of fighter.cursedRocks) {
    const isTargetOfClap = rock.hasTriggeredTeleport || 
      (fighter.pendingSwapData && (fighter.pendingSwapData.rock === rock || fighter.pendingSwapData.swapTarget === rock));

    let ceSurgeAlpha = 0.0;
    let rockAuraRadius = rock.radius * 1.35;

    if (isTargetOfClap && (fighter.clapAnimTimer || 0) > 0) {
      const animTimer = fighter.clapAnimTimer || 0;
      const windupTimer = fighter.clapWindupTimer || 0;

      if (windupTimer > 0) {
        const progressIn = Math.min(1.0, Math.max(0.0, (20 - animTimer) / 7.0));
        ceSurgeAlpha = Math.pow(progressIn, 1.5);
      } else {
        const progressOut = Math.min(1.0, Math.max(0.0, animTimer / 13.0));
        ceSurgeAlpha = Math.pow(progressOut, 1.2);
      }

      rockAuraRadius = rock.radius * (1.1 + ceSurgeAlpha * 0.4);
    }

    // 1. JJK Cursed Energy Sakuga Aura behind rock
    if (ceSurgeAlpha > 0.01) {
      const rockFighter = {
        x: rock.x,
        y: rock.y,
        r: rockAuraRadius,
        combatAuraOpacity: ceSurgeAlpha
      };
      GojoRenderer._drawJJKCursedEnergyAura(ctx, rockFighter, 'blue', rock.x, rock.y, rockAuraRadius);
    }

    // 2. Stepped Pixel-Art Cursed Rock Body
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(rock.x, rock.y);

    const rkR = rock.radius || 12;
    const rkSteps = Math.ceil((rkR + P) / P);

    // Dark Manga Outline Shell
    ctx.fillStyle = '#0E0F14';
    for (let gy = -rkSteps; gy <= rkSteps; gy++) {
      for (let gx = -rkSteps; gx <= rkSteps; gx++) {
        const dist = Math.hypot(gx * P, gy * P);
        if (dist <= rkR + P * 0.75) {
          ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
        }
      }
    }

    // Stepped Grey Facet Fill
    for (let gy = -rkSteps; gy <= rkSteps; gy++) {
      for (let gx = -rkSteps; gx <= rkSteps; gx++) {
        const rx = gx * P;
        const ry = gy * P;
        const dist = Math.hypot(rx, ry);
        if (dist <= rkR) {
          let col = '#5A5F6E';
          if (ry < -rkR * 0.35 && rx < rkR * 0.35) {
            col = '#8B93A6'; // Top-left facet highlight
          } else if (ry > rkR * 0.35 || rx > rkR * 0.35) {
            col = '#363942'; // Bottom-right facet shadow
          }
          ctx.fillStyle = col;
          ctx.fillRect(snap(rx), snap(ry), P, P);
        }
      }
    }

    ctx.restore();
  }
}

/**
 * Render JJK Cursed Energy Cyan Flame Aura surrounding Todo's body
 */
function drawTodoCursedEnergyAura(ctx, fighter) {
  const r = fighter.r;
  const time = Date.now();

  ctx.save();

  // 1. Outer Radial Glow Bloom (Deep Cyan & Electric Blue)
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const outerRadius = r * 1.85;
  if (!isLowQuality) {
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, outerRadius);
    glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    glowGrad.addColorStop(0.35, 'rgba(0, 175, 255, 0.18)');
    glowGrad.addColorStop(0.70, 'rgba(0, 100, 255, 0.09)');
    glowGrad.addColorStop(1.0, 'rgba(0, 40, 180, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Animated JJK Flame Tendrils
  const flameCount = 5;
  for (let i = 0; i < flameCount; i++) {
    const baseAngle = (Math.PI * 2 / flameCount) * i;
    const rotation = time * 0.003;
    const angle = baseAngle + rotation;

    ctx.save();
    ctx.rotate(angle);

    const flameLength = r * (0.75 + Math.sin(time * 0.01 + i * 1.2) * 0.25);
    const flameWidth = r * 0.32;

    ctx.fillStyle = 'rgba(0, 200, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);

    const segments = 5;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const x = r * 0.7 + flameLength * t;
      const waveOffset = Math.sin(time * 0.015 + j * 0.6 + i * 0.9) * flameWidth * (1 - t * 0.4);
      const width = flameWidth * (1 - t * 0.6);
      ctx.lineTo(x, waveOffset - width * 0.5);
    }

    for (let j = segments; j >= 0; j--) {
      const t = j / segments;
      const x = r * 0.7 + flameLength * t;
      const waveOffset = Math.sin(time * 0.015 + j * 0.6 + i * 0.9) * flameWidth * (1 - t * 0.4);
      const width = flameWidth * (1 - t * 0.6);
      ctx.lineTo(x, waveOffset + width * 0.5);
    }

    ctx.fill();
    ctx.restore();
  }

  // 3. Electric Cursed Energy Arcs / Rays
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const sparkAngle = (Math.PI * 2 / 3) * i + (time * 0.007);
    const startR = r * 1.0;
    const endR = r * (1.3 + Math.sin(time * 0.01 + i) * 0.2);

    ctx.beginPath();
    ctx.moveTo(Math.cos(sparkAngle) * startR, Math.sin(sparkAngle) * startR);
    ctx.lineTo(Math.cos(sparkAngle) * endR, Math.sin(sparkAngle) * endR);
    ctx.stroke();
  }

  ctx.restore();
}
