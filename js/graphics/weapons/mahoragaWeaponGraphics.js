// mahoragaWeaponGraphics.js
//  - Use this file for Mahoraga-specific weapon graphics (3D Dharma Wheel & Sword of Extermination).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

/**
 * Convert a hex color string (e.g. '#8A2BE2' or '#FF1144') to an RGB string (e.g. '138, 43, 226').
 * Used for dynamic glow colors in the Dharma Wheel.
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Lighten a hex color by mixing it with white.
 * @param {string} hex - Hex color like '#8A2BE2'
 * @param {number} factor - 0.0 to 1.0, how much to lighten (0 = no change, 1 = white)
 * @returns {string} Lightened hex color
 */
function lightenHex(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return '#' + [lr, lg, lb].map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Darken a hex color by mixing it with black.
 * @param {string} hex - Hex color like '#8A2BE2'
 * @param {number} factor - 0.0 to 1.0, how much to darken (0 = no change, 1 = black)
 * @returns {string} Darkened hex color
 */
function darkenHex(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// STAMP BUFFER CACHES FOR DHARMA WHEEL (Zero Per-Frame Loop Churn)
// ─────────────────────────────────────────────
const _wheelGlowBufferCache = new Map();
const _sphereHaloBufferCache = new Map();

function _renderWheelGlowBuffer(glowR, glowColor) {
  const _gP = 2.0;
  const _gSnap = (v) => Math.round(v / _gP) * _gP;
  const size = Math.ceil((glowR + _gP * 2) * 2);
  const center = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const bCtx = canvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;
  bCtx.translate(center, center);

  const glowGridR = Math.ceil(glowR / _gP);
  for (let gy = -glowGridR; gy <= glowGridR; gy++) {
    for (let gx = -glowGridR; gx <= glowGridR; gx++) {
      const dist = Math.sqrt(gx * gx + gy * gy) * _gP;
      if (dist > glowR || dist < 5) continue;
      const norm = dist / glowR;
      let alpha;
      if (norm < 0.4) alpha = 1.0;
      else if (norm < 0.7) alpha = 0.6;
      else alpha = 0.2;
      if (alpha < 0.05) continue;
      const px = _gSnap(gx * _gP);
      const py = _gSnap(gy * _gP);
      bCtx.fillStyle = norm < 0.4
        ? `rgba(255, 255, 255, ${alpha})`
        : `rgba(${hexToRgb(glowColor)}, ${alpha})`;
      bCtx.fillRect(px - _gP * 0.5, py - _gP * 0.5, _gP, _gP);
    }
  }

  return { canvas, center };
}

function _renderSphereHaloBuffer(sphereRadius, haloR, colorLightRgb, colorRgb) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const size = Math.ceil((haloR + P * 2) * 2);
  const center = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const bCtx = canvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;
  bCtx.translate(center, center);

  const haloGridR = Math.ceil(haloR / P);
  for (let gy = -haloGridR; gy <= haloGridR; gy++) {
    for (let gx = -haloGridR; gx <= haloGridR; gx++) {
      const dist = Math.sqrt(gx * gx + gy * gy) * P;
      if (dist > haloR || dist < sphereRadius + P) continue;
      const norm = (dist - sphereRadius) / (haloR - sphereRadius);
      let alpha;
      if (norm < 0.35) alpha = 0.85;
      else if (norm < 0.7) alpha = 0.45;
      else alpha = 0.15;
      if (alpha < 0.1) continue;
      const px = snap(gx * P);
      const py = snap(gy * P);
      bCtx.fillStyle = norm < 0.35
        ? `rgba(${colorLightRgb}, ${alpha})`
        : `rgba(${colorRgb}, ${alpha})`;
      bCtx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
    }
  }

  return { canvas, center };
}

export const MAHORAGA_WEAPON_GRAPHICS = {
  wheel: {
    scaleX: 1.25,
    scaleY: 0.45,
    wheelRadius: 16,
    spokeRadius: 26,
    sphereRadius: 4.5,
    depthOffset: 4,
    goldMain: '#DAA520',
    goldHighlight: '#FFE57F',
    strokeColor: '#000000',
  },
  sword: {
    bladeLength: 52,
    bladeWidth: 18,
    ringColor: '#1A1A1D',
    strokeColor: '#000000',
  }
};

/**
 * Draws Mahoraga's 3D Angled Dharma Wheel of Adaptation.
 */
export function drawMahoraga3DWheel(ctx, fighter) {
  if (!fighter) return;



  // ----------------------------------------------------
  // 1 DIVINE SHIELD + GREEN UP ARROW ARISING AT HIS FEET THEN FADING
  // Drawn in absolute world coordinates (fighter.x, fighter.y) before any translations!
  // ----------------------------------------------------
  if (fighter && fighter.shieldIconTimer > 0) {
    ctx.save();
    const timer = fighter.shieldIconTimer;
    const maxTime = 90;
    const progress = (maxTime - timer) / maxTime; // 0 to 1
    
    // Fade in quickly, then fade out smoothly
    const alpha = timer < 25 ? timer / 25 : (progress < 0.15 ? progress / 0.15 : 0.95);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const r = fighter.r || 30;
    // Position beside him (to his left side)
    const sideX = fighter.x - r - 18;
    const sideY = (fighter.y + 10) - progress * 28;
    
    ctx.save();
    ctx.translate(sideX, sideY);
    
    const popScale = Math.sin(Math.min(1, progress * 3) * Math.PI / 2) * 0.65;
    ctx.scale(popScale, popScale);

    // 1. Pixel Art Shield Badge — stepped pixel blocks
    const shP = 2.0;
    // Shield outline pixels (shield shape approximation)
    const shieldPixels = [
      // Top cap
      [-2, -11], [-1, -11], [0, -11], [1, -11], [2, -11],
      // Upper sides
      [-6, -9], [-7, -7], [-7, -5], [-7, -3], [-7, -1], [-7, 1],
      [6, -9], [7, -7], [7, -5], [7, -3], [7, -1], [7, 1],
      [-5, -10], [5, -10],
      // Narrowing sides
      [-6, 3], [-5, 5], [-4, 7], [-3, 9], [-2, 10], [-1, 11], [0, 12],
      [6, 3], [5, 5], [4, 7], [3, 9], [2, 10], [1, 11],
    ];
    // Shield fill (golden gradient zones)
    const shieldFillTop = '#FFFFFF';
    const shieldFillMid = '#FFEB64';
    const shieldFillBot = '#FFB400';
    for (let sy = -10; sy <= 11; sy++) {
      const halfW = sy < -8 ? 4 : (sy < 0 ? 6 : Math.max(0, 6 - Math.floor((sy + 1) * 0.55)));
      for (let sx = -halfW; sx <= halfW; sx++) {
        const norm = (sy + 10) / 21;
        ctx.fillStyle = norm < 0.3 ? shieldFillTop : (norm < 0.65 ? shieldFillMid : shieldFillBot);
        ctx.fillRect(sx * shP - shP * 0.5, sy * shP - shP * 0.5, shP, shP);
      }
    }
    // Shield border
    for (const [bx, by] of shieldPixels) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx * shP - shP * 0.5, by * shP - shP * 0.5, shP, shP);
    }

    // 2. Pixel Art Green Up Arrow — centered inside shield
    const arrowColor1 = '#76FF03';
    const arrowColor2 = '#00E676';
    // Arrow tip pixels
    const arrowPixels = [
      [0, -6, arrowColor1],
      [-1, -5, arrowColor1], [0, -5, arrowColor1], [1, -5, arrowColor1],
      [-2, -4, arrowColor1], [-1, -4, arrowColor1], [0, -4, arrowColor1], [1, -4, arrowColor1], [2, -4, arrowColor1],
      [-3, -3, arrowColor2], [-2, -3, arrowColor2], [2, -3, arrowColor2], [3, -3, arrowColor2],
      [-4, -2, arrowColor2], [-3, -2, arrowColor2], [3, -2, arrowColor2], [4, -2, arrowColor2],
      // Stem
      [-1, -2, arrowColor1], [0, -2, arrowColor1], [1, -2, arrowColor1],
      [-1, -1, arrowColor1], [0, -1, arrowColor2], [1, -1, arrowColor1],
      [-1, 0, arrowColor2], [0, 0, arrowColor2], [1, 0, arrowColor2],
      [-1, 1, arrowColor2], [0, 1, arrowColor2], [1, 1, arrowColor2],
      [-1, 2, arrowColor2], [0, 2, arrowColor2], [1, 2, arrowColor2],
      [-1, 3, arrowColor2], [0, 3, arrowColor2], [1, 3, arrowColor2],
      [-1, 4, arrowColor2], [0, 4, arrowColor2], [1, 4, arrowColor2],
    ];
    for (const [ax, ay, ac] of arrowPixels) {
      ctx.fillStyle = ac;
      ctx.fillRect(ax * shP - shP * 0.5, ay * shP - shP * 0.5, shP, shP);
    }
    // White outline on arrow tip
    const arrowOutline = [[0, -7], [-1, -6], [1, -6], [-5, -2], [5, -2], [-4, -3], [4, -3]];
    for (const [ox, oy] of arrowOutline) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ox * shP - shP * 0.5, oy * shP - shP * 0.5, shP, shP);
    }

    ctx.restore(); // Restore left shield badge transform

    // ----------------------------------------------------
    // 3. SIMPLE GREEN + SIGN (Pixel art on right side)
    // ----------------------------------------------------
    const rightX = fighter.x + r + 16;
    const rightY = (fighter.y + 10) - progress * 28;

    ctx.save();
    ctx.translate(rightX, rightY);
    ctx.scale(popScale, popScale);

    // Pixel art + sign
    const plusP = 2.0;
    ctx.fillStyle = '#00FF66';
    for (let g = -5; g <= 5; g++) {
      // Vertical bar
      ctx.fillRect(-plusP * 0.5, g * plusP - plusP * 0.5, plusP, plusP);
      // Horizontal bar
      ctx.fillRect(g * plusP - plusP * 0.5, -plusP * 0.5, plusP, plusP);
    }

    ctx.restore(); // Restore right RCT badge transform

    ctx.restore(); // Restore root canvas context
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const rotAngle = fighter.angle || 0;
  ctx.rotate(rotAngle);
  if (Math.abs(rotAngle) > Math.PI / 2) ctx.scale(1, -1);

  // Position wheel floating above Mahoraga's head with subtle floating animation along his body orientation
  const floatOffset = Math.sin(Date.now() * 0.003) * 2;
  const wheelOffset = -fighter.r - 28 + floatOffset;
  
  ctx.translate(0, wheelOffset);

  const scaleX = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleX;
  const scaleY = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleY;
  const wheelRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.wheelRadius;
  const spokeRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.spokeRadius;
  const sphereRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.sphereRadius;
  const depthOffset = MAHORAGA_WEAPON_GRAPHICS.wheel.depthOffset;

  // Glow Effect when actively adapting (click timer) or when FULLY adapted (8 stages / max adapted)
  const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const isFullyAdapted = totalStages >= 8 || fighter.isMaxAdapted;
  const isGlowing = (fighter.wheelGlowTimer > 0) || isFullyAdapted;
  if (isGlowing) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    const glowAlpha = fighter.wheelGlowTimer > 0 ? Math.min(1.0, fighter.wheelGlowTimer / 45) : 0.45;
    const glowColor = fighter.wheelGlowColor || '#FFD700';
    const glowR = spokeRadius + 12;

    // Cache wheel glow stamp buffer
    const glowStampKey = `${glowColor}_${glowR}`;
    let glowStamp = _wheelGlowBufferCache.get(glowStampKey);
    if (!glowStamp) {
      glowStamp = _renderWheelGlowBuffer(glowR, glowColor);
      _wheelGlowBufferCache.set(glowStampKey, glowStamp);
    }

    if (glowStamp) {
      ctx.globalAlpha = glowAlpha;
      ctx.drawImage(glowStamp.canvas, -glowStamp.center, -glowStamp.center);
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }

  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  // ----------------------------------------------------
  // RECOGNIZABLE ROTATION VISUAL EFFECT (PIXEL ART DIVINE SHOCKWAVE HALO & SUNBURST RAYS)
  // ----------------------------------------------------
  if (fighter.wheelClickTimer > 0 && !isGojoDomainActive) {
    const clickMax = CONFIG.mahoraga?.wheelClickDuration || 25;
    const clickProgress = 1.0 - (fighter.wheelClickTimer / clickMax); // 0.0 to 1.0
    const haloAlpha = Math.max(0, 1.0 - clickProgress);
    const _P = 2.0;
    const _snap = (v) => Math.round(v / _P) * _P;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // 1. Expanding Golden Halo Shockwave Ring — stepped pixel ellipse
    const haloRadius = spokeRadius + clickProgress * 32;
    const haloSteps = Math.max(32, Math.round(haloRadius * 3));
    ctx.globalAlpha = haloAlpha * 0.95;
    for (let i = 0; i < haloSteps; i++) {
      const a = (i / haloSteps) * Math.PI * 2;
      const px = _snap(Math.cos(a) * haloRadius);
      const py = _snap(Math.sin(a) * haloRadius);
      ctx.fillStyle = '#FFDF00';
      ctx.fillRect(px - _P * 0.5, py - _P * 0.5, _P, _P);
    }

    // Inner bright white shockwave rim — pixel ellipse
    const innerHaloR = haloRadius * 0.82;
    ctx.globalAlpha = haloAlpha * 0.8;
    for (let i = 0; i < haloSteps; i++) {
      const a = (i / haloSteps) * Math.PI * 2;
      const px = _snap(Math.cos(a) * innerHaloR);
      const py = _snap(Math.sin(a) * innerHaloR);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px - _P * 0.5, py - _P * 0.5, _P, _P);
    }
    ctx.globalAlpha = 1.0;

    // 2. 8 Radial Sunburst Laser Beams — stepped pixel lines
    const currentRot = fighter.wheelRotation || 0;
    for (let i = 0; i < 8; i++) {
      const angle = currentRot + (i / 8) * Math.PI * 2;
      const innerDist = spokeRadius * 0.7;
      const outerDist = spokeRadius + clickProgress * 28;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const numSegs = Math.max(3, Math.ceil((outerDist - innerDist) / _P));

      // Gold outer beam
      for (let s = 0; s <= numSegs; s++) {
        const t = s / numSegs;
        const d = innerDist + (outerDist - innerDist) * t;
        const px = _snap(cosAngle * d);
        const py = _snap(sinAngle * d);
        ctx.fillStyle = `rgba(255, 245, 157, ${haloAlpha})`;
        ctx.fillRect(px - _P * 0.75, py - _P * 0.75, _P * 1.5, _P * 1.5);
      }
      // White beam core
      for (let s = 0; s <= numSegs; s++) {
        const t = s / numSegs;
        const d = innerDist + (outerDist - innerDist - 4) * t;
        if (d < innerDist) continue;
        const px = _snap(cosAngle * d);
        const py = _snap(sinAngle * d);
        ctx.fillStyle = `rgba(255, 255, 255, ${haloAlpha * 0.9})`;
        ctx.fillRect(px - _P * 0.3, py - _P * 0.3, _P * 0.6, _P * 0.6);
      }
    }

    // 3. Central Starburst Core Flare — stepped pixel cross
    const flareR = 8 + (1 - clickProgress) * 10;
    ctx.globalAlpha = haloAlpha * 0.75;
    // Horizontal + Vertical cross pixels
    const flareGridR = Math.ceil(flareR / _P);
    for (let g = -flareGridR; g <= flareGridR; g++) {
      const dist = Math.abs(g) * _P;
      if (dist > flareR) continue;
      const brightness = 1 - dist / flareR;
      const alpha = brightness * haloAlpha * 0.75;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      // Horizontal
      ctx.fillRect(_snap(g * _P) - _P * 0.5, -_P * 0.5, _P, _P);
      // Vertical
      ctx.fillRect(-_P * 0.5, _snap(g * _P) - _P * 0.5, _P, _P);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  // ── PIXEL ART HELPERS (P = 2.0px grid) ──
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // Stepped pixel ellipse — draws filled pixel blocks tracing an ellipse
  function _drawPixelEllipse(ctx, cx, cy, rx, ry, fillColor, borderColor) {
    const steps = Math.max(24, Math.round(Math.max(rx, ry) * 2.5));
    // Border layer first (slightly larger)
    if (borderColor) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = snap(cx + Math.cos(a) * (rx + P * 0.5));
        const py = snap(cy + Math.sin(a) * (ry + P * 0.5));
        ctx.fillStyle = borderColor;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }
    // Fill layer
    if (fillColor) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = snap(cx + Math.cos(a) * rx);
        const py = snap(cy + Math.sin(a) * ry);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }
  }

  // Stepped pixel line — draws filled pixel blocks along a line
  function _drawPixelLine(ctx, x0, y0, x1, y1, color, thickness) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const numSteps = Math.max(2, Math.ceil(len / P));
    const halfT = Math.max(P * 0.5, thickness * 0.5);
    for (let s = 0; s <= numSteps; s++) {
      const t = s / numSteps;
      const px = snap(x0 + dx * t);
      const py = snap(y0 + dy * t);
      ctx.fillStyle = color;
      ctx.fillRect(px - halfT, py - halfT, halfT * 2, halfT * 2);
    }
  }

  // Stepped pixel filled circle — fills interior with pixel blocks
  function _fillPixelCircle(ctx, cx, cy, r, colors) {
    // colors = { border, outer, mid, inner, glint }
    const gridR = Math.ceil(r / P);
    for (let gy = -gridR; gy <= gridR; gy++) {
      for (let gx = -gridR; gx <= gridR; gx++) {
        const dist = Math.sqrt(gx * gx + gy * gy) * P;
        if (dist > r + P * 0.5) continue;
        const norm = dist / r; // 0=center, 1=edge
        let color;
        if (norm > 0.92) {
          color = colors.border || '#000000';
        } else if (norm > 0.7) {
          color = colors.outer || '#8B6508';
        } else if (norm > 0.4) {
          color = colors.mid || '#D4AF37';
        } else {
          color = colors.inner || '#FFF59D';
        }
        // Specular glint pixel in upper-left quadrant
        if (colors.glint && gx <= -1 && gy <= -1 && norm < 0.35) {
          color = colors.glint;
        }
        ctx.fillStyle = color;
        ctx.fillRect(snap(cx + gx * P) - P * 0.5, snap(cy + gy * P) - P * 0.5, P, P);
      }
    }
  }

  // ----------------------------------------------------
  // LAYER 1: 3D EXTRUSION / UNDERSIDE SHADOW (Pixel Art Depth)
  // ----------------------------------------------------
  ctx.save();
  ctx.translate(0, depthOffset);
  ctx.scale(scaleX, scaleY);
  ctx.rotate(fighter.wheelRotation || 0);

  // Dark underside outer ring — stepped pixel ellipse
  _drawPixelEllipse(ctx, 0, 0, wheelRadius + P, wheelRadius + P, '#3D2B0F', '#000000');
  _drawPixelEllipse(ctx, 0, 0, wheelRadius, wheelRadius, null, '#1A0F00');

  // Dark underside spokes & sphere bases
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Shadow spoke line
    _drawPixelLine(ctx, 0, 0, cosA * spokeRadius, sinA * spokeRadius, '#000000', P * 2);
    _drawPixelLine(ctx, 0, 0, cosA * spokeRadius, sinA * spokeRadius, '#2A1D0A', P);
    // Shadow sphere base
    _fillPixelCircle(ctx, cosA * spokeRadius, sinA * spokeRadius, sphereRadius + P * 0.5, {
      border: '#000000', outer: '#000000', mid: '#1A0F00', inner: '#1A0F00'
    });
  }
  ctx.restore();

  // ----------------------------------------------------
  // LAYER 2: MAIN TOP 3D WHEEL SURFACE (Pixel Art)
  // ----------------------------------------------------
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.rotate(fighter.wheelRotation || 0);

  // 1. 8 Spokes — triple-layer pixel lines (black border → gold → highlight)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    _drawPixelLine(ctx, 0, 0, cosA * spokeRadius, sinA * spokeRadius, '#000000', P * 2.2);
    _drawPixelLine(ctx, 0, 0, cosA * spokeRadius, sinA * spokeRadius, '#DAA520', P * 1.2);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius * 0.85), sinA * (spokeRadius * 0.85), '#FFE57F', P * 0.5);
  }

  // 2. Outer Ring Rim — stepped pixel ellipse (black border → gold → highlight)
  _drawPixelEllipse(ctx, 0, 0, wheelRadius + P, wheelRadius + P, null, '#000000');
  _drawPixelEllipse(ctx, 0, 0, wheelRadius, wheelRadius, '#DAA520', '#000000');
  _drawPixelEllipse(ctx, 0, 0, wheelRadius - P * 0.5, wheelRadius - P * 0.5, '#FFE57F', null);

  // 3. Inner Ring Rim — stepped pixel ellipse
  const innerRimR = wheelRadius * 0.55;
  _drawPixelEllipse(ctx, 0, 0, innerRimR + P * 0.5, innerRimR + P * 0.5, null, '#000000');
  _drawPixelEllipse(ctx, 0, 0, innerRimR, innerRimR, '#B8860B', '#000000');
  _drawPixelEllipse(ctx, 0, 0, innerRimR - P * 0.4, innerRimR - P * 0.4, '#DAA520', null);

  // 4. Center Hub Dome — stepped pixel filled circle with specular glint
  _fillPixelCircle(ctx, 0, 0, 5.5, {
    border: '#000000',
    outer: '#8B6508',
    mid: '#D4AF37',
    inner: '#FFF59D',
    glint: '#FFFFFF'
  });

  // Calculate total adaptation levels reached across all damage types & color history
  let activeStages = 0;
  const historyCount = fighter.gojoAdaptColorHistory ? fighter.gojoAdaptColorHistory.length : 0;
  if (fighter.adaptationStage) {
    const totalClicks = (fighter.adaptationStage.melee || 0) + (fighter.adaptationStage.ranged || 0) + (fighter.adaptationStage.skill || 0);
    activeStages = Math.min(8, Math.max(totalClicks, historyCount));
  } else if (fighter.adapted && (fighter.adapted.melee || fighter.adapted.ranged || fighter.adapted.skill)) {
    activeStages = Math.min(8, Math.max(1, historyCount));
  }

  // 5. 8 Handle Spheres — Pixel Art with Adaptation Color Support
  const sphereGlowColor = fighter.wheelGlowColor || '#FFD700';
  const sphereGlowRgb = hexToRgb(sphereGlowColor);
  const sphereGlowLight = fighter.wheelGlowColor ? lightenHex(sphereGlowColor, 0.5) : '#FFF9C4';
  const sphereGlowLightRgb = hexToRgb(sphereGlowLight);
  const sphereGlowDark = fighter.wheelGlowColor ? darkenHex(sphereGlowColor, 0.4) : '#FF8C00';
  const sphereGlowDarkRgb = hexToRgb(sphereGlowDark);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = Math.cos(angle) * spokeRadius;
    const sy = Math.sin(angle) * spokeRadius;
    const isLeveled = i < activeStages;

    // Per-sphere color from adaptation history
    const adaptColorHistory = fighter.gojoAdaptColorHistory;
    const thisSphereColor      = (adaptColorHistory && adaptColorHistory[i]) ? adaptColorHistory[i] : '#FFD700';
    const thisSphereColorLight = lightenHex(thisSphereColor, 0.5);
    const thisSphereColorDark  = darkenHex(thisSphereColor, 0.4);
    const thisSphereRgb        = hexToRgb(thisSphereColor);
    const thisSphereRgbLight   = hexToRgb(thisSphereColorLight);

    // Draw steady outer energy halo around leveled spheres — stepped pixel glow ring stamp
    if (isLeveled) {
      const haloR = sphereRadius * 3.0;
      const haloStampKey = `${thisSphereColor}_${sphereRadius}_${haloR}`;
      let haloStamp = _sphereHaloBufferCache.get(haloStampKey);
      if (!haloStamp) {
        haloStamp = _renderSphereHaloBuffer(sphereRadius, haloR, thisSphereRgbLight, thisSphereRgb);
        _sphereHaloBufferCache.set(haloStampKey, haloStamp);
      }
      if (haloStamp) {
        ctx.drawImage(haloStamp.canvas, sx - haloStamp.center, sy - haloStamp.center);
      }
    }

    // Handle sphere — pixel filled circle
    if (isLeveled) {
      _fillPixelCircle(ctx, sx, sy, sphereRadius, {
        border: '#000000',
        outer: thisSphereColorDark,
        mid: thisSphereColor,
        inner: thisSphereColorLight,
        glint: '#FFFFFF'
      });
      // White energy rim pixels on leveled spheres
      _drawPixelEllipse(ctx, sx, sy, sphereRadius + P * 0.6, sphereRadius + P * 0.6, null, '#FFFFFF');
    } else {
      // Standard golden dharma spheres
      _fillPixelCircle(ctx, sx, sy, sphereRadius, {
        border: '#000000',
        outer: '#4A3319',
        mid: '#C59B27',
        inner: '#FFE082',
        glint: '#FFFFFF'
      });
    }
  }

  ctx.restore();

  // ----------------------------------------------------
  // LAYER 3: (Removed spinning orbital sparkles for clean, steady glow)
  // ----------------------------------------------------

  ctx.restore(); // Restore from wheel translation
}



/**
 * Draws Mahoraga's Sword of Extermination Wrist Blade (Matching Reference Image 2 & 3).
 */
export function drawMahoragaSword(ctx, x = 0, y = 0, gunAngle = 0, r = 30, punchAnimTimer = 0, isCleaving = false, color = '#F5F5DC', swordCombo = 0, isThrowing = false, bladeRetractProgress = 1.0, maxAnimTimer = 18, isWorldCutting = false, worldCuttingTimer = 0) {
  let fighterObj = null;
  if (typeof x === 'object' && x !== null) {
    fighterObj = x;
    const f = fighterObj;
    x = f.x || 0;
    y = f.y || 0;
    gunAngle = f.gunAngle || 0;
    r = f.r || 30;
    punchAnimTimer = f.punchAnimTimer || 0;
    isCleaving = f.isCleaving || false;
    color = f.color || '#F5F5DC';
    swordCombo = f.swordCombo || 0;
    isThrowing = f.isThrowing || false;
    bladeRetractProgress = f.bladeRetractProgress !== undefined ? f.bladeRetractProgress : 1.0;
    maxAnimTimer = f.punchAnimMaxTimer || 18;
    isWorldCutting = f.isWorldCutting || false;
    worldCuttingTimer = f.worldCuttingTimer || 0;
  }

  // --- DRAW DYNAMIC RULE 15 CRESCENT SWORD SLASH ARC ---
  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.domainActive || state.activeDomain ||
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  const isSwinging = (punchAnimTimer > 0) || (isCleaving && (fighterObj?.cleaveWindupTimer > 0));

  const isSuppressed = fighterObj?.isTargetOfAmbush || (typeof fighterObj?.areAttackEffectsSuppressed === 'function' && fighterObj.areAttackEffectsSuppressed());

  if (fighterObj && !isGojoDomainActive && !isSuppressed && isSwinging) {
    const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 18.0;
    const elapsed = maxTimer - punchAnimTimer;
    const rawP = Math.min(1.0, Math.max(0.0, elapsed / maxTimer));
    const comboIndex = (fighterObj.isInfinityBlitz) ? (1 + ((swordCombo || 0) % 2)) : ((swordCombo || 0) % 3);

    const baseAngle = gunAngle !== undefined ? gunAngle : (fighterObj.angle || 0);
    const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

    let startOffset = -1.15;
    let endOffset = 1.15;
    if (comboIndex === 1) {
      startOffset = 1.20;
      endOffset = -1.15;
    } else if (comboIndex === 2) {
      startOffset = -1.40;
      endOffset = 1.35;
    }

    let currentTipOffset = startOffset;
    let currentTailOffset = startOffset;
    let trailAlpha = 1.0;

    if (rawP < 0.65) {
      const t = rawP / 0.65;
      const eased = 1.0 - Math.pow(1.0 - t, 2.2);
      currentTipOffset = startOffset + eased * (endOffset - startOffset);
      currentTailOffset = startOffset;
      trailAlpha = Math.min(1.0, t * 2.5);
    } else {
      const recP = (rawP - 0.65) / 0.35;
      const easedRec = Math.pow(1.0 - recP, 1.4);
      currentTipOffset = endOffset;
      currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
      trailAlpha = Math.max(0.0, 1.0 - recP * 1.3);
    }

    if (trailAlpha > 0.01 && Math.abs(currentTipOffset - currentTailOffset) >= 0.05) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(baseAngle);
      if (facingLeft) {
        ctx.scale(1, -1);
      }

      const totalStages = ((fighterObj.adaptationStage?.melee || 0) + (fighterObj.adaptationStage?.ranged || 0) + (fighterObj.adaptationStage?.skill || 0));
      const isLevel8 = totalStages >= 8 || fighterObj.isInfinityBlitz || fighterObj.isMaxAdapted;

      const P = 2.0; // Discrete pixel art grid unit matching Ichigo & Saitama
      const snap = (v) => Math.round(v / P) * P;

      const outerRadius = r + (isLevel8 ? 76 : 68);
      const maxThick = isLevel8 ? 26.0 : 22.0;
      const span = currentTipOffset - currentTailOffset;
      const minAng = Math.min(currentTipOffset, currentTailOffset);
      const maxAng = Math.max(currentTipOffset, currentTailOffset);

      const outlineCol = `rgba(17, 17, 20, ${(0.96 * trailAlpha).toFixed(2)})`;

      const isInsideSlash = (rx, ry) => {
        const dist = Math.hypot(rx, ry);
        if (dist <= 0) return false;
        let ang = Math.atan2(ry, rx);
        while (ang < minAng - Math.PI) ang += Math.PI * 2;
        while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
        if (ang < minAng || ang > maxAng) return false;

        const t = (ang - currentTailOffset) / span;
        if (t < 0 || t > 1.0) return false;

        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.28 + 0.72 * t);
        const thick = maxThick * taper;
        const outRad = outerRadius + taper * 1.5;
        const inRad = outRad - thick;
        return dist >= inRad && dist <= outRad;
      };

      const minX = Math.floor((-outerRadius - P * 2) / P) * P;
      const maxX = Math.ceil((outerRadius + P * 2) / P) * P;
      const minY = Math.floor((-outerRadius - P * 2) / P) * P;
      const maxY = Math.ceil((outerRadius + P * 2) / P) * P;

      // ── 2D Discrete Crescent Grid with 4-Neighbor Attached Border ──
      for (let gy = minY; gy <= maxY; gy += P) {
        for (let gx = minX; gx <= maxX; gx += P) {
          if (!isInsideSlash(gx, gy)) continue;

          const pxX = snap(gx);
          const pyY = snap(gy);

          const isBorder = !isInsideSlash(gx + P, gy) ||
                           !isInsideSlash(gx - P, gy) ||
                           !isInsideSlash(gx, gy + P) ||
                           !isInsideSlash(gx, gy - P);

          if (isBorder) {
            ctx.fillStyle = outlineCol;
            ctx.fillRect(pxX, pyY, P, P);
            continue;
          }

          const dist = Math.hypot(gx, gy);
          let ang = Math.atan2(gy, gx);
          while (ang < minAng - Math.PI) ang += Math.PI * 2;
          while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
          const t = (ang - currentTailOffset) / span;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.28 + 0.72 * t);
          const outRad = outerRadius + taper * 1.5;
          const depthFromApex = outRad - dist;

          let col;
          if (isLevel8) {
            if (depthFromApex < P * 1.4) {
              col = '#FFFFFF';
            } else if (depthFromApex < P * 3.0) {
              col = '#FFA500';
            } else if (depthFromApex < P * 5.5) {
              col = '#FF4500';
            } else {
              col = '#8B0000';
            }
          } else {
            if (depthFromApex < P * 1.4) {
              col = '#FFFFEE';
            } else if (depthFromApex < P * 3.0) {
              col = '#FFD700';
            } else if (depthFromApex < P * 5.5) {
              col = '#DAA520';
            } else {
              col = '#5C4008';
            }
          }

          ctx.fillStyle = col;
          ctx.fillRect(pxX, pyY, P, P);
        }
      }

      // Trailing Divine / Fiery Pixel Sparks
      const numEmbers = isLevel8 ? 8 : 5;
      for (let eb = 0; eb < numEmbers; eb++) {
        const ebT = (eb / numEmbers + (Date.now() / 250)) % 1.0;
        const ebAng = currentTailOffset + ebT * span;
        const ebDist = outerRadius - 8 - eb * 3.5;
        const ex = snap(Math.cos(ebAng) * ebDist);
        const ey = snap(Math.sin(ebAng) * ebDist);
        const col = isLevel8 ? ((eb % 2 === 0) ? '#FF4500' : '#FFFFFF') : ((eb % 2 === 0) ? '#FFD700' : '#FFFFFF');

        ctx.fillStyle = col;
        ctx.fillRect(ex, ey, P, P);
      }

      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x, y); // Center of Mahoraga (statically upright)

  const bladeLength = 58;
  const bladeWidth = 12;

  let swingAngle = 0;
  let extendDist = 0;

  const isParrying = (fighterObj && fighterObj.defensePoseType === 'parry' && (fighterObj.defensePoseTimer || 0) > 0);
  const isGuarding = (fighterObj && fighterObj.defensePoseType === 'guard' && (fighterObj.defensePoseTimer || 0) > 0);

  if (punchAnimTimer > 0) {
    const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 18.0;
    const swingDuration = 12.0;
    const elapsed = maxTimer - punchAnimTimer;
    const comboIndex = (fighterObj && fighterObj.isInfinityBlitz) ? (1 + ((swordCombo || 0) % 2)) : ((swordCombo || 0) % 3);

    if (elapsed <= swingDuration) {
      const p = Math.min(1.0, elapsed / swingDuration);

      if (comboIndex === 1) {
        // Combo 1: Sweeps backhand from +0.65 to -0.55
        const easedP = 1.0 - Math.pow(1.0 - p, 2.2);
        swingAngle = (Math.PI * 0.65) - (Math.PI * 1.20) * easedP;
        extendDist = Math.sin(p * Math.PI) * 28;
      } else if (comboIndex === 2) {
        // Combo 2: Heavy Overhead Chop (Windup -0.55 -> -0.85, then heavy chop -0.85 -> +0.85)
        if (p < 0.15) {
          const w = p / 0.15;
          swingAngle = (-Math.PI * 0.55) + (-Math.PI * 0.30) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.15) / 0.85;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          swingAngle = (-Math.PI * 0.85) + (Math.PI * 1.70) * easedS;
        }
        extendDist = Math.sin(p * Math.PI) * 30;
      } else {
        // Combo 0: Smooth windup back from idle (0 -> -0.45), then slash forward (-0.45 -> +0.65)
        if (p < 0.20) {
          const w = p / 0.20;
          swingAngle = (-Math.PI * 0.45) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.20) / 0.80;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          swingAngle = (-Math.PI * 0.45) + (Math.PI * 1.10) * easedS;
        }
        extendDist = Math.sin(p * Math.PI) * 28;
      }
    } else {
      // Recovery phase: Smoothly return from swing end angle to 0 idle guard
      const recP = Math.min(1.0, (elapsed - swingDuration) / (maxTimer - swingDuration));
      const easeRec = recP * (2 - recP);
      let endAngle = Math.PI * 0.65;
      if (comboIndex === 1) endAngle = -Math.PI * 0.55;
      else if (comboIndex === 2) endAngle = Math.PI * 0.85;

      swingAngle = endAngle * (1.0 - easeRec);
      extendDist = (1.0 - easeRec) * 12;
    }
  } else if (isParrying) {
    // Parry Pose: snappy blade deflection swing
    const maxT = fighterObj.defensePoseMaxTimer || 25;
    const t = 1.0 - (fighterObj.defensePoseTimer / maxT);
    const p = Math.sin(t * Math.PI); // 0 -> 1 -> 0 sweep
    swingAngle = Math.PI * 0.25 - p * (Math.PI * 0.45);
    extendDist = 18 + p * 15;
  } else if (isGuarding) {
    // Guard / Block Pose: sword hand pulled in close covering face
    swingAngle = -Math.PI * 0.35;
    extendDist = -12;
  } else if (isThrowing) {
    // Alternating right hand throw swing (blade remains retracted into forearm gauntlet)
    const shotsLeft = fighterObj ? (fighterObj.throwBarrageShotsLeft || 0) : 0;
    const isRightArmTurn = (shotsLeft % 2 === 0);
    
    if (isRightArmTurn && fighterObj) {
      const interval = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.throwBarrageInterval) || 10;
      const t = (fighterObj.throwBarrageTimer || 0) / interval;
      const p = Math.sin(t * Math.PI); // Smooth 0 -> 1 -> 0 lunge
      
      swingAngle = -Math.PI * 0.25 + p * 0.45;
      extendDist = 10 + p * 38;
    } else {
      swingAngle = -Math.PI * 0.25;
      extendDist = 10;
    }
  } else if (fighterObj && fighterObj.isWallSlamActive && (fighterObj.wallSlamPhase === 'post_throw_delay' || fighterObj.wallSlamPhase === 'dash')) {
    let p = 1.0;
    if (fighterObj.wallSlamPhase === 'post_throw_delay') {
      const standoffDuration = (typeof CONFIG !== 'undefined' && (CONFIG.mahoraga?.wallSlamStandoffDuration || CONFIG.mahoraga?.wallSlamMenacingStandoff)) || 50;
      p = Math.min(1.0, (fighterObj.wallSlamTimer || 0) / standoffDuration);
    }
    const easeP = p * p * (3 - 2 * p); // Smooth ease-in-out transition
    swingAngle = easeP * (-Math.PI * 0.65); // Wide arm open wind-up
    extendDist = easeP * 15; // Extend arm out widely
  } else {
    // Statically follow gunAngle when idle/resting
    swingAngle = 0;
    extendDist = 0;
  }

  // Right shoulder is statically positioned on the right side of his chest (aligned for front hand convention)
  const shoulderX = r * 0.55;
  const shoulderY = 0;

  // Rotate shoulder position by bodyAngle (fighter.angle) so arm stays attached to the spinning body
  const bodyAngle = (fighterObj && fighterObj.angle) || 0;
  const cosB = Math.cos(bodyAngle);
  const sinB = Math.sin(bodyAngle);
  const rotatedShoulderX = shoulderX * cosB - shoulderY * sinB;
  const rotatedShoulderY = shoulderX * sinB + shoulderY * cosB;

  let verticalLift = 0;
  let liftTilt = 0;
  if (fighterObj && fighterObj.isWallSlamActive && fighterObj.wallSlamPhase === 'grab') {
    // Find the grab target
    const opponentObj = state.fighters?.find(f => f && f !== fighterObj && f.hp > 0);
    if (opponentObj) {
      verticalLift = opponentObj.z || 0;
      const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;
      const liftP = Math.min(1.0, Math.max(0.0, (fighterObj.wallSlamTimer - 12) / (holdFrames - 12)));
      liftTilt = -0.22 * liftP; // Upward tilt of arm (approx -12 degrees)
    }
  }

  ctx.save();
  ctx.translate(rotatedShoulderX, rotatedShoulderY - verticalLift);
  
  // Rotate by gunAngle, swingAngle, and the upward lift tilt
  ctx.rotate(gunAngle + swingAngle + liftTilt);

  // Flip Y when facing left so sword faces target correctly
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  ctx.translate(r * 0.3 + extendDist, 0);

  // ── SWORD PIXEL ART HELPERS (P = 2.0px grid) ──
  const sP = 2.0;
  const sSnap = (v) => Math.round(v / sP) * sP;

  // 1. Pixel Art White Bandaged Forearm
  const armX0 = -20, armY0 = -8, armW = 14, armH = 16;
  for (let gy = 0; gy < Math.ceil(armH / sP); gy++) {
    for (let gx = 0; gx < Math.ceil(armW / sP); gx++) {
      const px = sSnap(armX0 + gx * sP);
      const py = sSnap(armY0 + gy * sP);
      // Border pixels
      if (gx === 0 || gx >= Math.ceil(armW / sP) - 1 || gy === 0 || gy >= Math.ceil(armH / sP) - 1) {
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = '#EBEBE6';
      }
      ctx.fillRect(px, py, sP, sP);
    }
  }
  // Bandage texture pixel lines
  for (let gy = 0; gy < Math.ceil(armH / sP); gy++) {
    const py = sSnap(armY0 + gy * sP);
    ctx.fillStyle = '#AFAFA5';
    ctx.fillRect(sSnap(-16), py, sP, sP);
    ctx.fillRect(sSnap(-11), py, sP, sP);
  }

  // 2. Pixel Art Clenched Fist
  const fistRadius = 14.0;
  const fistGridR = Math.ceil(fistRadius / sP);
  const isDark = _isDarkMode();
  const fistColor = isDark ? '#FFFFFF' : (fighterObj?.skinColor || (color !== '#FFD700' && color !== '#FFEE58' ? color : '#F4F4EC'));
  for (let gy = -fistGridR; gy <= fistGridR; gy++) {
    for (let gx = -fistGridR; gx <= fistGridR; gx++) {
      const dist = Math.sqrt(gx * gx + gy * gy) * sP;
      if (dist > fistRadius + sP * 0.3) continue;
      const px = sSnap(-2 + gx * sP);
      const py = sSnap(3 + gy * sP);
      if (dist > fistRadius - sP * 0.5) {
        ctx.fillStyle = '#000000';
      } else if (gx <= -2 && gy <= -2 && dist < fistRadius * 0.35) {
        ctx.fillStyle = '#FFFFFF'; // Specular glint
      } else {
        ctx.fillStyle = fistColor;
      }
      ctx.fillRect(px - sP * 0.5, py - sP * 0.5, sP, sP);
    }
  }

  // 3. Pixel Art Black Gauntlet Wrist Ring Holder
  const ringW = 9;
  const ringH = 21;
  const ringX0 = -7, ringY0 = -Math.floor(ringH / 2);
  for (let gy = 0; gy < Math.ceil(ringH / sP); gy++) {
    for (let gx = 0; gx < Math.ceil(ringW / sP); gx++) {
      const px = sSnap(ringX0 + gx * sP);
      const py = sSnap(ringY0 + gy * sP);
      if (gx === 0 || gx >= Math.ceil(ringW / sP) - 1 || gy === 0 || gy >= Math.ceil(ringH / sP) - 1) {
        ctx.fillStyle = '#000000';
      } else if (gx === 2) {
        ctx.fillStyle = '#55555C'; // Metallic highlight stripe
      } else {
        ctx.fillStyle = '#1A1A1D';
      }
      ctx.fillRect(px, py, sP, sP);
    }
  }

  // 4. RETRACTABLE SWORD OF EXTERMINATION BLADE — Pixel Art
  const retractScale = isGuarding ? 0.45 : (isParrying ? 1.0 : (bladeRetractProgress !== undefined ? Math.max(0, Math.min(1, bladeRetractProgress)) : (isThrowing ? 0.0 : 1.0)));

  if (retractScale > 0.02) {
    ctx.save();
    ctx.scale(retractScale, retractScale);

    const totalStages = fighterObj ? ((fighterObj.adaptationStage?.melee || 0) + (fighterObj.adaptationStage?.ranged || 0) + (fighterObj.adaptationStage?.skill || 0)) : 0;
    const isLevel8 = fighterObj && (totalStages >= 8 || fighterObj.isInfinityBlitz || fighterObj.isMaxAdapted || (fighterObj.goldStages >= 8));

    // Build blade pixel map — tapered diamond blade shape
    // Blade extends from x=1 to x=bladeLength, width from -bladeWidth/2 to +bladeWidth/2
    const halfW = bladeWidth / 2;
    const taperStart = bladeLength - 16; // Point where blade starts narrowing to tip

    // Level 8 Golden Aura (outer glow pixels)
    if (isLevel8) {
      const auraExpand = 3;
      for (let bx = -1; bx <= bladeLength + 5; bx += sP) {
        let maxHalfW;
        if (bx < 1) maxHalfW = halfW + auraExpand;
        else if (bx < taperStart) maxHalfW = halfW + auraExpand - (bx / taperStart) * 1;
        else {
          const tipT = (bx - taperStart) / (bladeLength + 5 - taperStart);
          maxHalfW = (halfW + auraExpand) * (1 - tipT);
        }
        for (let by = -maxHalfW; by <= maxHalfW; by += sP) {
          const px = sSnap(bx);
          const py = sSnap(by);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
          ctx.fillRect(px - sP * 0.5, py - sP * 0.5, sP, sP);
        }
      }
    }

    // Main blade body — pixel filled tapered shape
    for (let bx = 1; bx <= bladeLength; bx += sP) {
      let maxHalfW;
      if (bx < taperStart) {
        // Straight blade section — slight taper from base
        maxHalfW = halfW - (bx / taperStart) * 1;
      } else {
        // Tapered tip section — narrows to needle point
        const tipT = (bx - taperStart) / (bladeLength - taperStart);
        maxHalfW = (halfW - 1) * (1 - tipT);
      }

      for (let by = -maxHalfW; by <= maxHalfW; by += sP) {
        const px = sSnap(bx);
        const py = sSnap(by);
        const normY = Math.abs(by) / Math.max(1, maxHalfW);
        const normX = bx / bladeLength;

        // Determine pixel color — blade coloring with stepped shading zones
        let pixColor;
        if (normY > 0.85) {
          // Border edge
          pixColor = isLevel8 ? '#B78103' : '#000000';
        } else if (normY < 0.25 && normX < 0.62) {
          // Central bevel inset (dark core)
          pixColor = isLevel8 ? '#4E342E' : '#22252A';
        } else if (normY < 0.08) {
          // Ridge spine center line
          pixColor = isLevel8 ? '#FFF8E1' : '#FFFFFF';
        } else {
          // Main blade surface
          if (isLevel8) {
            pixColor = normY < 0.4 ? '#FFEE58' : (normY < 0.65 ? '#FFD54F' : '#FFA000');
          } else {
            pixColor = normY < 0.3 ? '#FFFFFF' : (normY < 0.5 ? '#E2E8F0' : (normY < 0.7 ? '#CBD5E1' : '#94A3B8'));
          }
        }
        ctx.fillStyle = pixColor;
        ctx.fillRect(px - sP * 0.5, py - sP * 0.5, sP, sP);
      }
    }

    // Blade outline — top and bottom edge pixel traces
    for (let bx = 1; bx <= bladeLength; bx += sP) {
      let edgeHalfW;
      if (bx < taperStart) {
        edgeHalfW = halfW - (bx / taperStart) * 1;
      } else {
        const tipT = (bx - taperStart) / (bladeLength - taperStart);
        edgeHalfW = (halfW - 1) * (1 - tipT);
      }
      const px = sSnap(bx);
      const borderColor = isLevel8 ? '#B78103' : '#000000';
      // Top edge
      ctx.fillStyle = borderColor;
      ctx.fillRect(px - sP * 0.5, sSnap(-edgeHalfW) - sP * 0.5, sP, sP);
      // Bottom edge
      ctx.fillRect(px - sP * 0.5, sSnap(edgeHalfW) - sP * 0.5, sP, sP);
    }

    // Base cap (left edge of blade)
    for (let by = -halfW; by <= halfW; by += sP) {
      ctx.fillStyle = isLevel8 ? '#B78103' : '#000000';
      ctx.fillRect(sSnap(1) - sP * 0.5, sSnap(by) - sP * 0.5, sP, sP);
    }

    ctx.restore();
   // (Section 5 visual overlays removed; trail handles all attack graphics now);
  }

  // (Attack tip sparkle removed)

  ctx.restore();
  ctx.restore();
}

/**
 * Draws Mahoraga's Left Off-Hand (Always visible on the opposite side of the body, lunging forward when punching!).
 */
export function drawMahoragaLeftPunch(ctx, fighter) {
  if (!fighter) return;

  // Smooth continuous progress tracking with multi-frame recovery easing to eliminate 1-frame snaps
  if (fighter.leftPunchTimer > 0) {
    const maxT = (fighter.leftPunchMaxTimer && fighter.leftPunchMaxTimer > 0) ? fighter.leftPunchMaxTimer : 18.0;
    fighter.currentPunchProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.leftPunchTimer / maxT)));
  } else if (fighter.currentPunchProgress > 0) {
    fighter.currentPunchProgress = Math.max(0.0, fighter.currentPunchProgress - 0.12);
  } else {
    fighter.currentPunchProgress = 0.0;
  }

  let lungeProgress = 0;
  const isThrowing = fighter.isThrowing || false;
  const isGuarding = fighter.defensePoseType === 'guard' && (fighter.defensePoseTimer || 0) > 0;

  if (isThrowing) {
    const shotsLeft = fighter.throwBarrageShotsLeft || 0;
    const isLeftArmTurn = (shotsLeft % 2 === 1);
    if (isLeftArmTurn) {
      const interval = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.throwBarrageInterval) || 10;
      const t = (fighter.throwBarrageTimer || 0) / interval;
      lungeProgress = Math.sin(t * Math.PI); // Smooth 0 -> 1 -> 0 lunge
    }
  } else if (isGuarding) {
    lungeProgress = 0;
  } else {
    const rawProgress = fighter.currentPunchProgress || 0.0;
    let easePunch = 0;
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retractT = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retractT * (Math.PI / 2));
    }
    lungeProgress = easePunch;
  }

  const progress = isThrowing ? lungeProgress : (isGuarding ? 0 : (fighter.currentPunchProgress || 0.0));
  const r = fighter.r || 30;
  
  const gunAngle = fighter.gunAngle || 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y); // Center of Mahoraga (statically upright)

  // Calculate dynamic reach distance directly toward enemy target so punch connects cleanly!
  let reachDist = 95;
  if (fighter.target) {
    const targetDist = Math.hypot(fighter.target.x - fighter.x, fighter.target.y - fighter.y);
    reachDist = Math.max(55, Math.min(125, targetDist - r * 0.45));
  }

  // Left shoulder / hand is positioned symmetrically opposite to the sword on the left side of his body circle
  const leftShoulderX = -r * 0.55;
  const leftShoulderY = 0;

  // Rotate shoulder position by bodyAngle (fighter.angle) so arm stays attached to the spinning body
  const bodyAngle = fighter.angle || 0;
  const cosB = Math.cos(bodyAngle);
  const sinB = Math.sin(bodyAngle);
  const rotatedShoulderX = leftShoulderX * cosB - leftShoulderY * sinB;
  const rotatedShoulderY = leftShoulderX * sinB + leftShoulderY * cosB;

  const punchLunge = lungeProgress * reachDist;

  ctx.save();
  ctx.translate(rotatedShoulderX, rotatedShoulderY);
  
  // Rotate the fist & visual trails by gunAngle toward target
  if (isGuarding) {
    ctx.rotate(gunAngle - Math.PI * 0.35);
    ctx.translate(-r * 0.15, 0);
  } else {
    ctx.rotate(gunAngle);
    // When idle: rests on left side edge (-r * 0.35). When punching: lunges forward toward target (+punchLunge)
    ctx.translate(-r * 0.35 + punchLunge, 0);
  }

  // Flip Y when facing left
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // 1. PIXEL ART CLENCHED LEFT FIST (Radius = 14.0px, matching right sword hand size!)
  const fistRadius = 14.0;
  const _lP = 2.0;
  const _lSnap = (v) => Math.round(v / _lP) * _lP;
  const _lGridR = Math.ceil(fistRadius / _lP);
  const isDarkLeft = _isDarkMode();
  const fistColor = isDarkLeft ? '#FFFFFF' : (fighter?.skinColor || fighter?.bodyColor || '#F4F4EC');
  for (let gy = -_lGridR; gy <= _lGridR; gy++) {
    for (let gx = -_lGridR; gx <= _lGridR; gx++) {
      const dist = Math.sqrt(gx * gx + gy * gy) * _lP;
      if (dist > fistRadius + _lP * 0.3) continue;
      const px = _lSnap(gx * _lP);
      const py = _lSnap(gy * _lP);
      if (dist > fistRadius - _lP * 0.5) {
        ctx.fillStyle = '#000000';
      } else if (gx <= -2 && gy <= -2 && dist < fistRadius * 0.35) {
        ctx.fillStyle = '#FFFFFF'; // Specular glint
      } else {
        ctx.fillStyle = fistColor;
      }
      ctx.fillRect(px - _lP * 0.5, py - _lP * 0.5, _lP, _lP);
    }
  }



  // 3. ANIME HIGH-IMPACT PUNCH VISUAL: Distinguishable Conical Air Pressure Blast & Starburst Impact!
  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  if (progress > 0.05 && progress < 0.95 && !isThrowing && !isGojoDomainActive) {
    const shockAlpha = Math.sin(progress * Math.PI);

    // 3a. Heavy Fist Motion Trail
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.9, 0);
    ctx.lineTo(14, 0);
    ctx.strokeStyle = `rgba(240, 240, 245, ${shockAlpha * 0.45})`;
    ctx.lineWidth = fistRadius * 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.7, 0);
    ctx.lineTo(14, 0);
    ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.85})`;
    ctx.lineWidth = fistRadius * 1.1;
    ctx.stroke();
    ctx.restore();

    // 3b. DISTINCT CONICAL SONIC COMPRESSION BLAST (REMOVED - Web-like visual)
    /*
    ctx.save();
    ctx.translate(14, 0);

    const coneLen = 32 + progress * 38;
    const coneWidth = 14 + progress * 28;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLen, -coneWidth);
    ctx.quadraticCurveTo(coneLen + 10, 0, coneLen, coneWidth);
    ctx.closePath();

    const coneGrad = ctx.createLinearGradient(0, 0, coneLen, 0);
    coneGrad.addColorStop(0, `rgba(255, 255, 255, ${shockAlpha * 0.9})`);
    coneGrad.addColorStop(0.35, `rgba(255, 235, 100, ${shockAlpha * 0.75})`);
    coneGrad.addColorStop(0.75, `rgba(255, 160, 0, ${shockAlpha * 0.4})`);
    coneGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = coneGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.95})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 3c. 8 Radial Sonic Gust Lines
    const numRays = 8;
    for (let i = 0; i < numRays; i++) {
      const rayAngle = ((i / (numRays - 1)) - 0.5) * (Math.PI * 0.65);
      const rayLen = 25 + progress * 32;
      const startDist = 6 + progress * 12;

      ctx.beginPath();
      ctx.moveTo(Math.cos(rayAngle) * startDist, Math.sin(rayAngle) * startDist);
      ctx.lineTo(Math.cos(rayAngle) * (startDist + rayLen), Math.sin(rayAngle) * (startDist + rayLen));
      ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${shockAlpha * 0.95})` : `rgba(255, 223, 0, ${shockAlpha * 0.85})`;
      ctx.lineWidth = 2.4 - (i % 2) * 1.0;
      ctx.stroke();
    }
    ctx.restore();

    // 3d. DENSE DUAL SHOCKWAVE DISKS
    const ringRadius = 16 + progress * 28;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(18 + progress * 12, 0, ringRadius * 0.5, ringRadius * 1.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 223, 0, ${shockAlpha * 0.95})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(14 + progress * 10, 0, ringRadius * 0.3, ringRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${shockAlpha * 0.9})`;
    ctx.fill();
    ctx.restore();

    // 3e. RADIANT 8-POINT IMPACT STARBURST FLARE
    if (progress > 0.25 && progress < 0.75) {
      const flareAlpha = Math.sin((progress - 0.25) / 0.5 * Math.PI);
      ctx.save();
      ctx.translate(14, 0);
      ctx.strokeStyle = `rgba(255, 255, 255, ${flareAlpha * 0.95})`;
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(0, 22);
      ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 235, 100, ${flareAlpha * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
      ctx.moveTo(-14, 14); ctx.lineTo(14, -14);
      ctx.stroke();
      ctx.restore();
    }
    */
  }

  ctx.restore();
  ctx.restore();
}

// ─────────────────────────────────────────────
// STAMP BUFFER CACHES FOR THROWN DEBRIS (Zero Per-Frame Rasterization)
// ─────────────────────────────────────────────
const _debrisStampCache = new Map();
let _debrisShadowStamp = null;

function _getDebrisShadowStamp() {
  if (_debrisShadowStamp) return _debrisShadowStamp;
  const dP = 2.0;
  const snap = (v) => Math.round(v / dP) * dP;
  const rx = 28, ry = 11;
  const sizeX = (rx + 4) * 2;
  const sizeY = (ry + 4) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = sizeX;
  canvas.height = sizeY;
  const bCtx = canvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;
  const cx = sizeX / 2, cy = sizeY / 2;

  const gridRx = Math.ceil(rx / dP);
  const gridRy = Math.ceil(ry / dP);
  for (let gy = -gridRy; gy <= gridRy; gy++) {
    for (let gx = -gridRx; gx <= gridRx; gx++) {
      const nx = (gx * dP) / rx;
      const ny = (gy * dP) / ry;
      if (nx * nx + ny * ny <= 1.0) {
        const px = snap(cx + gx * dP);
        const py = snap(cy + gy * dP);
        bCtx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        bCtx.fillRect(px - dP * 0.5, py - dP * 0.5, dP, dP);
      }
    }
  }
  _debrisShadowStamp = { canvas, cx, cy };
  return _debrisShadowStamp;
}

function _renderDebrisStamp(visualType) {
  const dP = 2.0;
  const snap = (v) => Math.round(v / dP) * dP;
  const size = 100;
  const center = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const bCtx = canvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;
  bCtx.translate(center, center);

  function _debPixLine(x0, y0, x1, y1, color, thickness) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(2, Math.ceil(len / dP));
    const halfT = Math.max(dP * 0.5, (thickness || dP) * 0.5);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = snap(x0 + dx * t);
      const py = snap(y0 + dy * t);
      bCtx.fillStyle = color;
      bCtx.fillRect(px - halfT, py - halfT, halfT * 2, halfT * 2);
    }
  }

  function _pointInPoly(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function _drawPixelDebrisPoly(verts, colorFn, borderColor) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }

    const startX = snap(minX - dP);
    const endX = snap(maxX + dP);
    const startY = snap(minY - dP);
    const endY = snap(maxY + dP);

    for (let py = startY; py <= endY; py += dP) {
      for (let px = startX; px <= endX; px += dP) {
        if (_pointInPoly(px, py, verts)) {
          bCtx.fillStyle = colorFn(px, py);
          bCtx.fillRect(px - dP * 0.5, py - dP * 0.5, dP, dP);
        }
      }
    }

    if (borderColor) {
      for (let i = 0; i < verts.length; i++) {
        const v1 = verts[i];
        const v2 = verts[(i + 1) % verts.length];
        _debPixLine(v1.x, v1.y, v2.x, v2.y, borderColor, dP);
      }
    }
  }

  if (visualType === 'mahoragaBasaltMonolith') {
    const monolithVerts = [
      { x: 25,  y: -4 },
      { x: 16,  y: 20 },
      { x: -8,  y: 24 },
      { x: -24, y: 14 },
      { x: -26, y: -10 },
      { x: -10, y: -26 },
      { x: 14,  y: -20 }
    ];
    _drawPixelDebrisPoly(
      monolithVerts,
      (px, py) => {
        const diag = (px + py + 50) / 100;
        if (diag < 0.28) return '#F1F5F9';
        if (diag < 0.52) return '#CBD5E1';
        if (diag < 0.76) return '#94A3B8';
        return '#64748B';
      },
      '#1E293B'
    );
    _debPixLine(14, -20, 3, -2, '#FEF08A', dP * 1.1);
    _debPixLine(3, -2, -14, 12, '#FEF08A', dP * 1.1);
    _debPixLine(-8, 24, 1, 4, '#FEF08A', dP * 1.1);
    _debPixLine(1, 4, 16, -8, '#FEF08A', dP * 1.1);
    _debPixLine(3, -2, 16, -8, '#FFFFFF', dP * 0.7);

  } else if (visualType === 'mahoragaRuinConcrete') {
    const concreteVerts = [
      { x: 26,  y: -12 },
      { x: 24,  y: 14 },
      { x: -22, y: 16 },
      { x: -26, y: -14 }
    ];
    _drawPixelDebrisPoly(
      concreteVerts,
      (px, py) => {
        const diag = (px + py + 40) / 80;
        if (diag < 0.30) return '#E2E8F0';
        if (diag < 0.65) return '#94A3B8';
        return '#475569';
      },
      '#0F172A'
    );
    _debPixLine(26, -6, 36, -8, '#94A3B8', dP * 1.2);
    _debPixLine(34, -8, 36, -8, '#FFFFFF', dP * 0.7);
    _debPixLine(24, 8, 33, 12, '#94A3B8', dP * 1.2);
    _debPixLine(31, 11, 33, 12, '#FFFFFF', dP * 0.7);
    _debPixLine(-26, -4, -35, -2, '#94A3B8', dP * 1.2);
    _debPixLine(-33, -2, -35, -2, '#FFFFFF', dP * 0.7);
    _debPixLine(-18, -14, -4, 0, '#0F172A', dP * 0.9);
    _debPixLine(-4, 0, 20, 14, '#0F172A', dP * 0.9);

  } else {
    // mahoragaLavaRubble / default
    const chalkVerts = [
      { x: 22,  y: -8 },
      { x: 18,  y: 16 },
      { x: -12, y: 20 },
      { x: -24, y: 4 },
      { x: -18, y: -20 },
      { x: 6,   y: -22 }
    ];
    _drawPixelDebrisPoly(
      chalkVerts,
      (px, py) => {
        const diag = (px + py + 46) / 92;
        if (diag < 0.32) return '#F8FAFC';
        if (diag < 0.68) return '#E2E8F0';
        return '#94A3B8';
      },
      '#1E293B'
    );
    const coreR = 8.5;
    const gridR = Math.ceil(coreR / dP);
    for (let gy = -gridR; gy <= gridR; gy++) {
      for (let gx = -gridR; gx <= gridR; gx++) {
        const dist = Math.sqrt(gx * gx + gy * gy) * dP;
        if (dist > coreR + dP * 0.3) continue;
        const px = snap(gx * dP);
        const py = snap(gy * dP);
        let cColor;
        if (dist > coreR - dP * 0.6) {
          cColor = 'rgba(202, 138, 4, 0.9)';
        } else if (dist > coreR * 0.5) {
          cColor = 'rgba(254, 240, 138, 0.85)';
        } else if (dist > dP * 0.8) {
          cColor = '#FEF9C3';
        } else {
          cColor = '#FFFFFF';
        }
        bCtx.fillStyle = cColor;
        bCtx.fillRect(px - dP * 0.5, py - dP * 0.5, dP, dP);
      }
    }
  }

  return { canvas, center };
}

export function drawMahoragaThrow(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const moveAngle = Math.atan2(vy, vx);
  const now = Date.now();
  const spinAngle = moveAngle + (p.spinOffset || 0) + (now * 0.009);

  ctx.save();
  ctx.translate(p.x, p.y);

  // 1. Pixel Art Ground Drop Shadow (Stamp buffer)
  const shadowStamp = _getDebrisShadowStamp();
  if (shadowStamp) {
    ctx.drawImage(shadowStamp.canvas, -shadowStamp.cx, 18 - shadowStamp.cy);
  }

  ctx.rotate(spinAngle);

  // 2. Pre-rendered pixel art debris stamp
  const visualKey = p.visual || 'mahoragaLavaRubble';
  let debrisStamp = _debrisStampCache.get(visualKey);
  if (!debrisStamp) {
    debrisStamp = _renderDebrisStamp(visualKey);
    _debrisStampCache.set(visualKey, debrisStamp);
  }

  if (debrisStamp) {
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(debrisStamp.canvas, -debrisStamp.center, -debrisStamp.center);
    ctx.imageSmoothingEnabled = prevSmoothing;
  }

  ctx.restore();
}

if (typeof window !== 'undefined') {
  window.drawMahoragaLeftPunch = drawMahoragaLeftPunch;
}
