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

function _drawPixelLine(ctx, x0, y0, x1, y1, color, thickness = 2) {
  if (!color) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function _drawPixelEllipse(ctx, cx, cy, rx, ry, strokeColor, fillColor) {
  ctx.beginPath();
  ctx.arc(cx, cy, rx, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();
  }
}

function _fillPixelCircle(ctx, cx, cy, radius, layers) {
  if (!layers) return;
  if (layers.border) {
    const bWidth = (layers.borderWidth !== undefined) ? layers.borderWidth : 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + bWidth, 0, Math.PI * 2);
    ctx.fillStyle = layers.border;
    ctx.fill();
  }
  if (layers.outer) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = layers.outer;
    ctx.fill();
  }
  if (layers.mid) {
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.15, radius * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = layers.mid;
    ctx.fill();
  }
  if (layers.inner) {
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.35, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = layers.inner;
    ctx.fill();
  }
  if (layers.glint) {
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.35, radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = layers.glint;
    ctx.fill();
  }
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

  if (fighter.isDead || fighter.dead || fighter._wheelDropped) {
    return;
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

  drawMahoragaDharmaWheelCore(ctx, fighter);

  ctx.restore(); // Restore from wheel translation
}

/**
 * Draws the 3D Dharma Wheel of Adaptation core model (shared between living fighter and dropped physical entity).
 * @param {CanvasRenderingContext2D} ctx Main 2D Canvas context
 * @param {object} wheelData Object containing wheel rotation, scale, glow, and adaptation history
 */
export function drawMahoragaDharmaWheelCore(ctx, wheelData) {
  if (!wheelData) return;

  const scaleX = wheelData.scaleX || MAHORAGA_WEAPON_GRAPHICS.wheel.scaleX;
  const scaleY = wheelData.scaleY || MAHORAGA_WEAPON_GRAPHICS.wheel.scaleY;
  const wheelRadius = wheelData.wheelRadius || MAHORAGA_WEAPON_GRAPHICS.wheel.wheelRadius;
  const spokeRadius = wheelData.spokeRadius || MAHORAGA_WEAPON_GRAPHICS.wheel.spokeRadius;
  const sphereRadius = wheelData.sphereRadius || MAHORAGA_WEAPON_GRAPHICS.wheel.sphereRadius;
  const depthOffset = wheelData.depthOffset || MAHORAGA_WEAPON_GRAPHICS.wheel.depthOffset;
  const wheelRotation = wheelData.wheelRotation || 0;

  // Glow Effect when actively adapting (click timer) or when FULLY adapted (8 stages / max adapted)
  const totalStages = (wheelData.adaptationStage?.melee || 0) + (wheelData.adaptationStage?.ranged || 0) + (wheelData.adaptationStage?.skill || 0);
  const isFullyAdapted = totalStages >= 8 || wheelData.isMaxAdapted;
  const isGlowing = (wheelData.wheelGlowTimer > 0) || isFullyAdapted;
  if (isGlowing) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    const glowAlpha = (wheelData.wheelGlowTimer || 0) > 0 ? Math.min(1.0, wheelData.wheelGlowTimer / 45) : 0.45;
    const glowColor = wheelData.wheelGlowColor || '#FFD700';
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

  const isGojoDomainActive = wheelData.isGojoDomainActive || (!wheelData.gojoDomainAdapted && !wheelData.gojoAdapted?.domain && !wheelData.domainImmunity && typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  ));

  // ----------------------------------------------------
  // RECOGNIZABLE ROTATION VISUAL EFFECT (PIXEL ART DIVINE SHOCKWAVE HALO & SUNBURST RAYS)
  // ----------------------------------------------------
  if ((wheelData.wheelClickTimer || 0) > 0 && !isGojoDomainActive) {
    const clickMax = CONFIG.mahoraga?.wheelClickDuration || 25;
    const clickProgress = 1.0 - (wheelData.wheelClickTimer / clickMax); // 0.0 to 1.0
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
    const currentRot = wheelRotation;
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
    const flareGridR = Math.ceil(flareR / _P);
    for (let g = -flareGridR; g <= flareGridR; g++) {
      const dist = Math.abs(g) * _P;
      if (dist > flareR) continue;
      const brightness = 1 - dist / flareR;
      const alpha = brightness * haloAlpha * 0.75;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(_snap(g * _P) - _P * 0.5, -_P * 0.5, _P, _P);
      ctx.fillRect(-_P * 0.5, _snap(g * _P) - _P * 0.5, _P, _P);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  // ── PIXEL ART HELPERS (P = 2.0px grid) ──
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // ----------------------------------------------------
  // LAYER 1: 3D EXTRUSION / UNDERSIDE SHADOW (Pixel Art Depth)
  // ----------------------------------------------------
  ctx.save();
  ctx.translate(0, depthOffset);
  ctx.scale(scaleX, scaleY);
  ctx.rotate(wheelRotation);

  // Dark underside outer ring — stepped pixel ellipse
  _drawPixelEllipse(ctx, 0, 0, wheelRadius + P, wheelRadius + P, '#3D2B0F', '#000000');
  _drawPixelEllipse(ctx, 0, 0, wheelRadius, wheelRadius, null, '#1A0F00');

  // Dark underside spokes & sphere bases
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius - 2), sinA * (spokeRadius - 2), '#000000', P * 1.2);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius - 2), sinA * (spokeRadius - 2), '#2A1D0A', P * 0.6);
    _fillPixelCircle(ctx, cosA * spokeRadius, sinA * spokeRadius, sphereRadius * 0.85, {
      border: null, outer: '#1A0F00', mid: '#100A00', inner: '#100A00'
    });
  }
  ctx.restore();

  // ----------------------------------------------------
  // LAYER 2: MAIN TOP 3D WHEEL SURFACE (Pixel Art)
  // ----------------------------------------------------
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.rotate(wheelRotation);

  // 1. 8 Spokes — triple-layer pixel lines
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius - 1), sinA * (spokeRadius - 1), '#000000', P * 1.2);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius - 1), sinA * (spokeRadius - 1), '#DAA520', P * 0.7);
    _drawPixelLine(ctx, 0, 0, cosA * (spokeRadius * 0.85), sinA * (spokeRadius * 0.85), '#FFE57F', P * 0.35);
  }

  // 2. Outer Ring Rim — stepped pixel ellipse
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
    borderWidth: 0.6,
    outer: '#8B6508',
    mid: '#D4AF37',
    inner: '#FFF59D',
    glint: '#FFFFFF'
  });

  // Calculate total adaptation levels reached across all damage types & color history
  let activeStages = 0;
  const historyCount = wheelData.gojoAdaptColorHistory ? wheelData.gojoAdaptColorHistory.length : 0;
  if (wheelData.adaptationStage) {
    const totalClicks = (wheelData.adaptationStage.melee || 0) + (wheelData.adaptationStage.ranged || 0) + (wheelData.adaptationStage.skill || 0);
    activeStages = Math.min(8, Math.max(totalClicks, historyCount));
  } else if (wheelData.adapted && (wheelData.adapted.melee || wheelData.adapted.ranged || wheelData.adapted.skill)) {
    activeStages = Math.min(8, Math.max(1, historyCount));
  }

  // 5. 8 Handle Spheres — Pixel Art with Adaptation Color Support
  const sphereGlowColor = wheelData.wheelGlowColor || '#FFD700';
  const sphereGlowRgb = hexToRgb(sphereGlowColor);
  const sphereGlowLight = wheelData.wheelGlowColor ? lightenHex(sphereGlowColor, 0.5) : '#FFF9C4';
  const sphereGlowLightRgb = hexToRgb(sphereGlowLight);
  const sphereGlowDark = wheelData.wheelGlowColor ? darkenHex(sphereGlowColor, 0.4) : '#FF8C00';
  const sphereGlowDarkRgb = hexToRgb(sphereGlowDark);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = Math.cos(angle) * spokeRadius;
    const sy = Math.sin(angle) * spokeRadius;
    const isLeveled = i < activeStages;

    const adaptColorHistory = wheelData.gojoAdaptColorHistory;
    const thisSphereColor      = (adaptColorHistory && adaptColorHistory[i]) ? adaptColorHistory[i] : '#FFD700';
    const thisSphereColorLight = lightenHex(thisSphereColor, 0.5);
    const thisSphereColorDark  = darkenHex(thisSphereColor, 0.4);
    const thisSphereRgb        = hexToRgb(thisSphereColor);
    const thisSphereRgbLight   = hexToRgb(thisSphereColorLight);

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

    if (isLeveled) {
      _fillPixelCircle(ctx, sx, sy, sphereRadius, {
        border: '#000000',
        borderWidth: 0.45,
        outer: thisSphereColorDark,
        mid: thisSphereColor,
        inner: thisSphereColorLight,
        glint: '#FFFFFF'
      });
    } else {
      _fillPixelCircle(ctx, sx, sy, sphereRadius, {
        border: '#000000',
        borderWidth: 0.45,
        outer: '#7A5518',
        mid: '#D4AF37',
        inner: '#FFE082',
        glint: '#FFFFFF'
      });
    }
  }

  ctx.restore();
}



/**
 * Draws Mahoraga's Sword of Extermination Wrist Blade (Matching Reference Image 2 & 3).
 */
/**
 * Renders a muscular, jointed anime arm segment connecting shoulder to wrist with dynamic elbow kinematics.
 * Adheres to Rule 30 Dynamic Arm Linkage & Physical Force Drive standard.
 *
 * @param {CanvasRenderingContext2D} ctx Context
 * @param {number} sx Shoulder X
 * @param {number} sy Shoulder Y
 * @param {number} hx Hand/Wrist X
 * @param {number} hy Hand/Wrist Y
 * @param {boolean} isRightArm True for right sword arm, false for left punch arm
 * @param {number} r Fighter radius
 * @param {string} skinColor Base divine flesh color (#F4F4EC)
 * @param {boolean} isBandaged True to draw ritual bandage wraps on forearm
 * @param {number} [flexDirection=1] +1 or -1 elbow flexion orientation
 */
function _drawMahoragaKinematicArm(ctx, sx, sy, hx, hy, isRightArm, r, skinColor, isBandaged = true, flexDirection = 1) {
  const dx = hx - sx;
  const dy = hy - sy;
  const D = Math.hypot(dx, dy);
  if (D < 2) return;

  // 1. Two-Bone Inverse Kinematics
  const naturalL1 = r * 0.56;
  const naturalL2 = r * 0.52;
  const naturalReach = naturalL1 + naturalL2;

  let L1 = naturalL1;
  let L2 = naturalL2;
  if (D > naturalReach - 2.0) {
    L1 = D * 0.52;
    L2 = D * 0.48;
  }

  const mx = (sx + hx) * 0.5;
  const my = (sy + hy) * 0.5;
  const theta = Math.atan2(dy, dx);
  const perpTheta = theta + (flexDirection * Math.PI * 0.5);

  let hElbow = Math.sqrt(Math.max(0, (L1 * L1) - (D * 0.5) * (D * 0.5)));
  hElbow = Math.min(hElbow, r * 0.50);

  const ex = mx + Math.cos(perpTheta) * hElbow;
  const ey = my + Math.sin(perpTheta) * hElbow;

  // 2. Anatomical Muscle Widths (deltoid, bicep, elbow, forearm, wrist)
  const wShoulder = Math.max(14.0, r * 0.50);
  const wElbow = Math.max(11.0, r * 0.38);
  const wWrist = Math.max(12.0, r * 0.42);

  const drawSegment = (p1x, p1y, p2x, p2y, w1, w2, isForearm) => {
    const segDx = p2x - p1x;
    const segDy = p2y - p1y;
    const segLen = Math.hypot(segDx, segDy);
    if (segLen < 1.0) return;

    const segAngle = Math.atan2(segDy, segDx);
    const segPerpX = -Math.sin(segAngle);
    const segPerpY = Math.cos(segAngle);

    const halfW1 = w1 * 0.5;
    const halfW2 = w2 * 0.5;

    // 4 polygon corners
    const c1x = p1x + segPerpX * halfW1;
    const c1y = p1y + segPerpY * halfW1;
    const c2x = p2x + segPerpX * halfW2;
    const c2y = p2y + segPerpY * halfW2;
    const c3x = p2x - segPerpX * halfW2;
    const c3y = p2y - segPerpY * halfW2;
    const c4x = p1x - segPerpX * halfW1;
    const c4y = p1y - segPerpY * halfW1;

    // Manga ink outline
    ctx.beginPath();
    ctx.moveTo(c1x, c1y);
    ctx.lineTo(c2x, c2y);
    ctx.lineTo(c3x, c3y);
    ctx.lineTo(c4x, c4y);
    ctx.closePath();
    ctx.fillStyle = '#0E0F14';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#0E0F14';
    ctx.stroke();

    // Interior Fill
    const inHalfW1 = Math.max(1.0, halfW1 - 1.2);
    const inHalfW2 = Math.max(1.0, halfW2 - 1.2);

    const ic1x = p1x + segPerpX * inHalfW1;
    const ic1y = p1y + segPerpY * inHalfW1;
    const ic2x = p2x + segPerpX * inHalfW2;
    const ic2y = p2y + segPerpY * inHalfW2;
    const ic3x = p2x - segPerpX * inHalfW2;
    const ic3y = p2y - segPerpY * inHalfW2;
    const ic4x = p1x - segPerpX * inHalfW1;
    const ic4y = p1y - segPerpY * inHalfW1;

    ctx.beginPath();
    ctx.moveTo(ic1x, ic1y);
    ctx.lineTo(ic2x, ic2y);
    ctx.lineTo(ic3x, ic3y);
    ctx.lineTo(ic4x, ic4y);
    ctx.closePath();

    if (isForearm && isBandaged) {
      // White ritual bandages
      ctx.fillStyle = '#EBEBE6';
      ctx.fill();

      // Bandage wraps / cross-hatched pixel stripes
      const numWraps = Math.max(3, Math.floor(segLen / 6.0));
      ctx.save();
      ctx.strokeStyle = '#AFAFA5';
      ctx.lineWidth = 1.4;
      for (let w = 1; w < numWraps; w++) {
        const wt = w / numWraps;
        const wx = p1x + segDx * wt;
        const wy = p1y + segDy * wt;
        const curW = inHalfW1 + (inHalfW2 - inHalfW1) * wt;
        ctx.beginPath();
        ctx.moveTo(wx + segPerpX * curW - segDx * 0.12, wy + segPerpY * curW - segDy * 0.12);
        ctx.lineTo(wx - segPerpX * curW + segDx * 0.12, wy - segPerpY * curW + segDy * 0.12);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Bare muscular bicep/tricep
      ctx.fillStyle = skinColor || '#F4F4EC';
      ctx.fill();

      // Muscle shadow on inner flex
      ctx.beginPath();
      ctx.moveTo(ic4x, ic4y);
      ctx.lineTo(ic3x, ic3y);
      ctx.lineTo(p2x - segPerpX * (inHalfW2 * 0.3), p2y - segPerpY * (inHalfW2 * 0.3));
      ctx.lineTo(p1x - segPerpX * (inHalfW1 * 0.3), p1y - segPerpY * (inHalfW1 * 0.3));
      ctx.closePath();
      ctx.fillStyle = '#D0D0C4';
      ctx.fill();

      // Muscle crest glint
      ctx.beginPath();
      ctx.moveTo(ic1x, ic1y);
      ctx.lineTo(ic2x, ic2y);
      ctx.lineTo(p2x + segPerpX * (inHalfW2 * 0.5), p2y + segPerpY * (inHalfW2 * 0.5));
      ctx.lineTo(p1x + segPerpX * (inHalfW1 * 0.5), p1y + segPerpY * (inHalfW1 * 0.5));
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  };

  // Draw Upper Arm: Shoulder -> Elbow
  drawSegment(sx, sy, ex, ey, wShoulder, wElbow, false);

  // Rounded elbow joint cap
  ctx.beginPath();
  ctx.arc(ex, ey, wElbow * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = '#0E0F14';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex, ey, wElbow * 0.48 - 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#EBEBE6';
  ctx.fill();

  // Draw Forearm: Elbow -> Wrist
  drawSegment(ex, ey, hx, hy, wElbow, wWrist, true);

  // Rounded wrist joint cap
  ctx.beginPath();
  ctx.arc(hx, hy, wWrist * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = '#0E0F14';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx, hy, wWrist * 0.48 - 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#EBEBE6';
  ctx.fill();
}

export function drawMahoragaSword(ctx, x = 0, y = 0, gunAngle = 0, r = 30, punchAnimTimer = 0, isCleaving = false, color = '#F5F5DC', swordCombo = 0, isThrowing = false, bladeRetractProgress = 1.0, maxAnimTimer = 22, isWorldCutting = false, worldCuttingTimer = 0) {
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
  const isGojoDomainActive = (!fighterObj?.gojoDomainAdapted && !fighterObj?.gojoAdapted?.domain && !fighterObj?.domainImmunity) && typeof state !== 'undefined' && (
    state.domainActive || state.activeDomain ||
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  const isSwinging = (punchAnimTimer > 0) || (isCleaving && (fighterObj?.cleaveWindupTimer > 0));

  const isSuppressed = fighterObj?.isTargetOfAmbush || (typeof fighterObj?.areAttackEffectsSuppressed === 'function' && fighterObj.areAttackEffectsSuppressed());

  if (fighterObj && !isGojoDomainActive && !isSuppressed && isSwinging) {
    const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 22.0;
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

    const coilP = 0.23;
    const holdP = 0.32;
    const strikeP = 0.55;
    const lockP = 0.73;

    if (rawP < holdP) {
      currentTipOffset = startOffset;
      currentTailOffset = startOffset;
      trailAlpha = 0;
    } else if (rawP < strikeP) {
      const sp = (rawP - holdP) / (strikeP - holdP);
      const eased = Math.pow(sp, 2.5);
      currentTipOffset = startOffset + eased * (endOffset - startOffset);
      currentTailOffset = startOffset;
      trailAlpha = Math.min(1.0, sp * 2.2);
    } else if (rawP < lockP) {
      // Phase 4: THE IMPACT LOCK — 100% UNFURLED & LATCHED ON CLEAVE PLANE!
      currentTipOffset = endOffset;
      currentTailOffset = startOffset;
      trailAlpha = 1.0;
    } else {
      // Phase 5: Dynamic Eraser Wipe
      const recP = (rawP - lockP) / (1.0 - lockP);
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
      const isDoubleDamage = Boolean(fighterObj && (fighterObj.wheelDoubleDamageTimer > 0));

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
          } else if (isDoubleDamage) {
            if (depthFromApex < P * 1.4) {
              col = '#FFFFFF';
            } else if (depthFromApex < P * 3.0) {
              col = '#FFF176';
            } else if (depthFromApex < P * 5.5) {
              col = '#FFD54F';
            } else {
              col = '#FF8F00';
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
      const numEmbers = isLevel8 ? 8 : (isDoubleDamage ? 7 : 5);
      for (let eb = 0; eb < numEmbers; eb++) {
        const ebT = (eb / numEmbers + (Date.now() / 250)) % 1.0;
        const ebAng = currentTailOffset + ebT * span;
        const ebDist = outerRadius - 8 - eb * 3.5;
        const ex = snap(Math.cos(ebAng) * ebDist);
        const ey = snap(Math.sin(ebAng) * ebDist);
        const col = isLevel8 ? ((eb % 2 === 0) ? '#FF4500' : '#FFFFFF') : (isDoubleDamage ? ((eb % 2 === 0) ? '#FFF176' : '#FFD700') : ((eb % 2 === 0) ? '#FFD700' : '#FFFFFF'));

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
    const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 22.0;
    const elapsed = maxTimer - punchAnimTimer;
    const progress = Math.min(1.0, Math.max(0.0, elapsed / maxTimer));
    const comboIndex = (fighterObj && fighterObj.isInfinityBlitz) ? (1 + ((swordCombo || 0) % 2)) : ((swordCombo || 0) % 3);

    const coilP = 0.23;
    const holdP = 0.32;
    const strikeP = 0.55;
    const lockP = 0.73;

    let startAngle = -0.45;
    let impactAngle = 0.65;
    let coilLunge = -10.0;
    let maxLunge = 32.0;

    if (comboIndex === 1) {
      startAngle = 0.75;
      impactAngle = -0.55;
      coilLunge = -8.0;
      maxLunge = 30.0;
    } else if (comboIndex === 2) {
      startAngle = -0.95;
      impactAngle = 0.85;
      coilLunge = -14.0;
      maxLunge = 36.0;
    }

    if (progress < coilP) {
      const wp = progress / coilP;
      const easeW = Math.sin(wp * Math.PI * 0.5);
      swingAngle = startAngle * easeW;
      extendDist = coilLunge * easeW;
    } else if (progress < holdP) {
      swingAngle = startAngle;
      extendDist = coilLunge;
    } else if (progress < strikeP) {
      const sp = (progress - holdP) / (strikeP - holdP);
      const whipEase = Math.pow(sp, 2.5);
      swingAngle = startAngle + (impactAngle - startAngle) * whipEase;
      extendDist = coilLunge + (maxLunge - coilLunge) * whipEase;
    } else if (progress < lockP) {
      const pp = (progress - strikeP) / (lockP - strikeP);
      const tremor = (1.0 - pp) * (CONFIG.mahoraga?.swordTremorIntensity ?? 1.8);
      swingAngle = impactAngle + (Math.random() - 0.5) * 0.06 * tremor;
      extendDist = maxLunge + (Math.random() - 0.5) * tremor;
      if (fighterObj && (fighterObj.knockbackStunTimer || 0) <= 0) {
        fighterObj.vx = 0;
        fighterObj.vy = 0;
      }
    } else {
      const rp = (progress - lockP) / (1.0 - lockP);
      const settleEase = Math.pow(1.0 - rp, 1.8);
      const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
      swingAngle = impactAngle * settleEase - 0.20 * springWave;
      extendDist = maxLunge * settleEase - 5.0 * springWave;
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

  let liftTilt = 0;
  if (fighterObj && fighterObj.isWallSlamActive && fighterObj.wallSlamPhase === 'grab') {
    const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;
    const liftP = Math.min(1.0, Math.max(0.0, (fighterObj.wallSlamTimer - 12) / (holdFrames - 12)));
    const easeLift = Math.sin(liftP * Math.PI * 0.5);
    liftTilt = -0.32 * easeLift; // Upward tilt of arm (~18 degrees)
  }

  ctx.save();
  ctx.translate(rotatedShoulderX, rotatedShoulderY);
  
  // Rotate by gunAngle, swingAngle, and the upward lift tilt
  ctx.rotate(gunAngle + swingAngle + liftTilt);

  // Flip Y when facing left so sword faces target correctly
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const isDark = _isDarkMode();
  const fistColor = isDark ? '#FFFFFF' : (fighterObj?.skinColor || (color !== '#FFD700' && color !== '#FFEE58' ? color : '#F4F4EC'));
  const handDist = r * 0.3 + extendDist;

  // Render Dynamic Muscular Kinematic Arm connecting right shoulder (0, 0) to wrist (handDist, 0)
  _drawMahoragaKinematicArm(ctx, 0, 0, handDist, 0, true, r, fistColor, true, 1);

  ctx.translate(handDist, 0);

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
    const isDoubleDamage = Boolean(fighterObj && (fighterObj.wheelDoubleDamageTimer > 0));
    const isGoldenSword = isLevel8 || isDoubleDamage;

    // Build blade pixel map — tapered diamond blade shape
    // Blade extends from x=1 to x=bladeLength, width from -bladeWidth/2 to +bladeWidth/2
    const halfW = bladeWidth / 2;
    const taperStart = bladeLength - 16; // Point where blade starts narrowing to tip

    // Golden Aura (outer glow pixels when double damage active or Level 8)
    if (isGoldenSword) {
      const auraExpand = isDoubleDamage ? 4.0 : 3.0;
      const pulse = isDoubleDamage ? (0.75 + 0.25 * Math.sin(Date.now() / 90)) : 1.0;
      for (let bx = -2; bx <= bladeLength + 6; bx += sP) {
        let maxHalfW;
        if (bx < 1) maxHalfW = halfW + auraExpand;
        else if (bx < taperStart) maxHalfW = halfW + auraExpand - (bx / taperStart) * 1;
        else {
          const tipT = (bx - taperStart) / (bladeLength + 6 - taperStart);
          maxHalfW = (halfW + auraExpand) * (1 - tipT);
        }
        for (let by = -maxHalfW; by <= maxHalfW; by += sP) {
          const px = sSnap(bx);
          const py = sSnap(by);
          const distNorm = Math.abs(by) / Math.max(1, maxHalfW);
          const alpha = ((0.55 - distNorm * 0.28) * pulse).toFixed(2);
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
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
          pixColor = isGoldenSword ? '#D4A017' : '#000000';
        } else if (normY < 0.25 && normX < 0.62) {
          // Central bevel inset (dark core)
          pixColor = isGoldenSword ? '#78350F' : '#22252A';
        } else if (normY < 0.08) {
          // Ridge spine center line (radiant pure white-gold glint)
          pixColor = isGoldenSword ? '#FFFBE6' : '#FFFFFF';
        } else {
          // Main blade surface
          if (isGoldenSword) {
            pixColor = normY < 0.4 ? '#FFF176' : (normY < 0.65 ? '#FFD54F' : '#FFA000');
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
      const borderColor = isGoldenSword ? '#D4A017' : '#000000';
      // Top edge
      ctx.fillStyle = borderColor;
      ctx.fillRect(px - sP * 0.5, sSnap(-edgeHalfW) - sP * 0.5, sP, sP);
      // Bottom edge
      ctx.fillRect(px - sP * 0.5, sSnap(edgeHalfW) - sP * 0.5, sP, sP);
    }

    // Base cap (left edge of blade)
    for (let by = -halfW; by <= halfW; by += sP) {
      ctx.fillStyle = isGoldenSword ? '#D4A017' : '#000000';
      ctx.fillRect(sSnap(1) - sP * 0.5, sSnap(by) - sP * 0.5, sP, sP);
    }

    // Golden sparks around the blade during double damage / golden sword mode
    if (isGoldenSword) {
      const now = Date.now();
      const sparkCount = isDoubleDamage ? 6 : 3;
      for (let i = 0; i < sparkCount; i++) {
        const seed = (now * 0.003 + i * 1.618) % 1;
        const sparkX = sSnap(10 + seed * (bladeLength - 14));
        const sparkY = sSnap(Math.sin(now * 0.005 + i * 2.3) * (halfW + 4));
        const sparkAlpha = Math.max(0.2, (0.4 + 0.6 * Math.sin(now * 0.01 + i))).toFixed(2);
        ctx.fillStyle = `rgba(255, 235, 59, ${sparkAlpha})`;
        ctx.fillRect(sparkX - sP * 0.5, sparkY - sP * 0.5, sP, sP);
      }
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
    const maxT = (fighter.leftPunchMaxTimer && fighter.leftPunchMaxTimer > 0) ? fighter.leftPunchMaxTimer : 22.0;
    fighter.currentPunchProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.leftPunchTimer / maxT)));
  } else if (fighter.currentPunchProgress > 0) {
    fighter.currentPunchProgress = Math.max(0.0, fighter.currentPunchProgress - 0.12);
  } else {
    fighter.currentPunchProgress = 0.0;
  }

  let lungeProgress = 0;
  let punchTremor = 0;
  const isThrowing = fighter.isThrowing || false;
  const isGuarding = fighter.defensePoseType === 'guard' && (fighter.defensePoseTimer || 0) > 0;
  const isWallSlamGrab = fighter.isWallSlamActive && fighter.wallSlamPhase === 'grab';
  let grabWindupProgress = 0;
  let isGrabPowerCharging = false;

  if (isWallSlamGrab && (fighter.wallSlamTimer || 0) > 12) {
    const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;
    const windupT = Math.min(1.0, Math.max(0.0, (fighter.wallSlamTimer - 12) / (holdFrames - 12)));
    grabWindupProgress = windupT * windupT;
    isGrabPowerCharging = ((fighter.wallSlamTimer || 0) >= holdFrames - 16);
  }

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
  } else if (fighter.leftPunchTimer > 0) {
    // 5-Phase Melee Combat Kinematics (Rule 30)
    const rawProgress = fighter.currentPunchProgress || 0.0;
    const coilP = 0.22;
    const holdP = 0.30;
    const strikeP = 0.52;
    const lockP = 0.72;

    if (rawProgress < coilP) {
      // Phase 1: Deep muscular coil pull behind left shoulder
      const wp = rawProgress / coilP;
      const easeW = Math.sin(wp * Math.PI * 0.5);
      lungeProgress = -0.15 * easeW;
    } else if (rawProgress < holdP) {
      // Phase 2: Poised tension hold
      lungeProgress = -0.15;
    } else if (rawProgress < strikeP) {
      // Phase 3: Explosive forward punch stroke
      const sp = (rawProgress - holdP) / (strikeP - holdP);
      const punchEase = Math.pow(sp, 2.6);
      lungeProgress = -0.15 + 1.15 * punchEase;
    } else if (rawProgress < lockP) {
      // Phase 4: THE IMPACT LOCK (Fist locked deep in target impact plane!)
      const pp = (rawProgress - strikeP) / (lockP - strikeP);
      punchTremor = (1.0 - pp) * 2.2;
      lungeProgress = 1.0;
      if (fighter && (fighter.knockbackStunTimer || 0) <= 0) {
        fighter.vx = 0;
        fighter.vy = 0;
      }
    } else {
      // Phase 5: Extraction & Spring-Damped Settle
      const rp = (rawProgress - lockP) / (1.0 - lockP);
      const settleEase = Math.pow(1.0 - rp, 1.8);
      const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
      lungeProgress = settleEase - 0.12 * springWave;
    }
  } else {
    lungeProgress = 0;
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
  let handAngle = gunAngle;
  let handDist = -r * 0.35 + punchLunge;
  if (isGuarding) {
    handAngle = gunAngle - Math.PI * 0.35;
    handDist = -r * 0.15;
  } else if (isWallSlamGrab && grabWindupProgress > 0) {
    // Deep menacing power windup coil behind shoulder
    const windupAngle = -Math.PI * 0.42 * grabWindupProgress;
    handAngle = gunAngle + windupAngle;
    handDist = -r * 0.35 - 14 * grabWindupProgress;
  }

  ctx.rotate(handAngle);

  // Intense kinetic vibration while gathering execution punch power or during Phase 4 impact lock
  if (isGrabPowerCharging || punchTremor > 0) {
    const tremorVal = isGrabPowerCharging ? 2.2 : punchTremor;
    const jitter = (Math.random() - 0.5) * tremorVal;
    ctx.translate(jitter, jitter);
  }

  // Flip Y when facing left
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const isDarkLeft = _isDarkMode();
  const fistColor = isDarkLeft ? '#FFFFFF' : (fighter?.skinColor || fighter?.bodyColor || '#F4F4EC');

  // Render Dynamic Muscular Kinematic Arm connecting left shoulder (0, 0) to wrist (handDist, 0)
  _drawMahoragaKinematicArm(ctx, 0, 0, handDist, 0, false, r, fistColor, true, -1);

  ctx.translate(handDist, 0);

  // Radiant Golden Divine Adaptation Aura around the fist while charging execution smash
  if (isGrabPowerCharging) {
    const auraPulse = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 215, 0, ${(0.35 + 0.25 * auraPulse).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${(0.50 * auraPulse).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1. PIXEL ART CLENCHED LEFT FIST (Radius = 14.0px, matching right sword hand size!)
  const fistRadius = 14.0;
  const _lP = 2.0;
  const _lSnap = (v) => Math.round(v / _lP) * _lP;
  const _lGridR = Math.ceil(fistRadius / _lP);
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
  const isGojoDomainActive = !fighter.gojoDomainAdapted && !fighter.gojoAdapted?.domain && !fighter.domainImmunity && typeof state !== 'undefined' && (
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
  window.drawMahoragaSonicBoom = drawMahoragaSonicBoom;
}

// ─────────────────────────────────────────────
// 12-FRAME GOLDEN SONIC BOOM ASSET LOADER & RENDERER
// ─────────────────────────────────────────────
const MAHORAGA_SONIC_BOOM_FRAME_COUNT = 12;
const MAHORAGA_SONIC_BOOM_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/mahoraga/Sonic Boom/sonic-boom-${i + 1}.png`
);

let _mahoragaSonicBoomFrames = [];
let _mahoragaSonicBoomFramesLoading = false;

export function _getMahoragaSonicBoomFrames() {
  if (
    _mahoragaSonicBoomFrames.length === MAHORAGA_SONIC_BOOM_FRAME_COUNT &&
    _mahoragaSonicBoomFrames.every(img => img && img.complete && ((img.naturalWidth || img.width || 0) > 0))
  ) {
    return _mahoragaSonicBoomFrames;
  }
  if (!_mahoragaSonicBoomFramesLoading && typeof Image !== 'undefined') {
    _mahoragaSonicBoomFramesLoading = true;
    _mahoragaSonicBoomFrames = [];
    MAHORAGA_SONIC_BOOM_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _mahoragaSonicBoomFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Mahoraga Sonic Boom frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _mahoragaSonicBoomFrames[idx] = img;
    });
  }
  return _mahoragaSonicBoomFrames;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMahoragaSonicBoomFrames();
}

/**
 * Procedural fallback for headless test runners or when images are buffering.
 * Uses discrete pixel art stepped boxes (P = 2.0px) to match the retro sprite aesthetic.
 */
function _drawProceduralSonicBoomFallback(ctx, sb, p, scale) {
  const range = sb.range || 350;
  const BASELINE_RANGE = 350;
  // Soft-cap visual size at 1.5× baseline to match sprite renderer
  const visualRange = Math.min(range, BASELINE_RANGE * 1.5);
  const numRings = 5;
  const leadDist = visualRange * Math.min(1.0, p * 1.3);
  const P = 2.0;

  for (let i = 0; i < numRings; i++) {
    const ringFrac = (numRings - 1 - i) / (numRings - 1);
    const rx = Math.round((leadDist * ringFrac) / P) * P;
    if (rx < 10) continue;
    const ry = Math.round((12 + rx * 0.42) / P) * P;
    const rWidth = Math.round((ry * 0.52) / P) * P;

    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.fillRect(rx - rWidth, -ry, rWidth * 2, ry * 2);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(rx - rWidth, -ry, rWidth * 2, ry * 2);

    // Inner bright crest
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rx + rWidth - P, -ry * 0.5, P, ry);
  }
}

/**
 * Draws Mahoraga's 12-Frame Long-Range Golden Conical Sonic Boom.
 * Anchored directly at Mahoraga's mouth/body (24, 128), rotated along shout aim angle,
 * expanding forward in a supersonic conical shockwave.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} sb Active sonic boom data object
 */
export function drawMahoragaSonicBoom(ctx, sb) {
  if (!sb || !ctx) return;
  const maxTimer = sb.maxTimer || 50;
  const p = Math.min(1.0, Math.max(0, (sb.timer || 0) / maxTimer));
  if (p >= 1.0) return;

  const frames = _getMahoragaSonicBoomFrames();
  const range = sb.range || 350;
  const BASELINE_RANGE = 350;

  // 1. Non-linear power ease for explosive expansion and smooth deceleration
  const pEase = 1.0 - Math.pow(1.0 - p, 1.5);

  // 2. Physical forward momentum: the shockwave TRAVELS forward proportional to range.
  //    At baseline (350), creep is ~42px. Extra range beyond baseline adds forward travel
  //    so the cone rolls out to cover the full damage reach without stretching the sprite.
  const baseCreep = 42.0;
  const extraCreep = Math.max(0, range - BASELINE_RANGE) * 0.65;
  const creepX = pEase * (baseCreep + extraCreep);

  // 3. Smooth frame interpolation between consecutive frames
  const rawFrame = pEase * 11.0;
  const f1 = Math.min(11, Math.floor(rawFrame));
  const f2 = Math.min(11, f1 + 1);
  const frac = rawFrame - f1;
  const frameIndex = f1;
  const img = frames[frameIndex];

  ctx.save();
  ctx.translate(sb.x + Math.cos(sb.angle || 0) * creepX, sb.y + Math.sin(sb.angle || 0) * creepX);
  ctx.rotate(sb.angle || 0);

  const prevSmoothing = ctx.imageSmoothingEnabled;
  const prevAlpha = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;

  // Luxurious cosine dissipation over the final 45% of lifecycle
  let fadeAlpha = 1.0;
  if (p > 0.55) {
    const fadeP = (p - 0.55) / 0.45;
    fadeAlpha = Math.cos(fadeP * Math.PI * 0.5);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1.0, prevAlpha * fadeAlpha));

  // The 256x256 sprite has its apex at (24, 128) and reaches to ~240 (span ~216px).
  // UNIFORM scaling: sprite stays proportional. Allow mild upscale for larger ranges
  // (soft cap at ~1.5× baseline) so the cone is slightly bigger but not distorted.
  const visualScale = Math.min(range, BASELINE_RANGE * 1.5) / 216.0;
  const scale = visualScale;
  const originX = 24.0 * scale;
  const originY = 128.0 * scale;
  const drawW = 256.0 * scale;
  const drawH = 256.0 * scale;

  const img1 = img;
  const img2 = (f2 !== f1 && frames[f2]) ? frames[f2] : null;
  const isImg1Ready = img1 && img1.complete && ((img1.naturalWidth || img1.width || 0) > 0);
  const isImg2Ready = img2 && img2.complete && ((img2.naturalWidth || img2.width || 0) > 0);

  if (isImg1Ready) {
    ctx.drawImage(img1, -originX, -originY, drawW, drawH);
    if (isImg2Ready && frac > 0.04) {
      ctx.globalAlpha = Math.max(0, Math.min(1.0, ctx.globalAlpha * (frac * 0.70)));
      ctx.drawImage(img2, -originX, -originY, drawW, drawH);
    }
  } else {
    _drawProceduralSonicBoomFallback(ctx, sb, pEase, scale);
  }

  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.globalAlpha = prevAlpha;
  ctx.restore();
}
