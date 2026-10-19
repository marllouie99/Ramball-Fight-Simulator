import { state } from '../../core/state.js';
import { getFighterPreview, getFighterBodyOnlyPreview, getFighterStickerPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { _registerButton, drawButton, drawStatBar, drawChamferedRect, fitSingleLineText, wrapText } from './uiFramework.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawGradeBadge } from '../../configs/gradeConfig.js';

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTOR CARD THEME ENGINE (Reference 1 Aotu-Style Pastel & Vibrant Palettes)
// ─────────────────────────────────────────────────────────────────────────────

const PRESET_THEMES = {
  cyan: {
    primary: '#0284C7',
    title: '#0369A1',
    banner: '#CBE8F6',
    bg: '#F3FAFD',
    grid: 'rgba(2, 132, 199, 0.10)',
    border: '#7DD3FC',
    dark: '#0C4A6E',
  },
  blue: {
    primary: '#2563EB',
    title: '#1D4ED8',
    banner: '#DBEAFE',
    bg: '#EFF6FF',
    grid: 'rgba(37, 99, 235, 0.10)',
    border: '#93C5FD',
    dark: '#1E3A8A',
  },
  crimson: {
    primary: '#E11D48',
    title: '#BE123C',
    banner: '#FAD1DA',
    bg: '#FFF5F7',
    grid: 'rgba(225, 29, 72, 0.10)',
    border: '#FDA4AF',
    dark: '#881337',
  },
  gold: {
    primary: '#D97706',
    title: '#B45309',
    banner: '#FDE6B0',
    bg: '#FFFBEB',
    grid: 'rgba(217, 119, 6, 0.10)',
    border: '#FCD34D',
    dark: '#78350F',
  },
  emerald: {
    primary: '#16A34A',
    title: '#15803D',
    banner: '#C8F2D6',
    bg: '#F2FBF5',
    grid: 'rgba(22, 163, 74, 0.10)',
    border: '#86EFAC',
    dark: '#14532D',
  },
  violet: {
    primary: '#7C3AED',
    title: '#6D28D9',
    banner: '#DDD6FE',
    bg: '#F7F5FF',
    grid: 'rgba(124, 58, 237, 0.10)',
    border: '#C4B5FD',
    dark: '#4C1D95',
  },
  orange: {
    primary: '#EA580C',
    title: '#C2410C',
    banner: '#FED7AA',
    bg: '#FFF7ED',
    grid: 'rgba(234, 88, 12, 0.10)',
    border: '#FDBA74',
    dark: '#7C2D12',
  },
  teal: {
    primary: '#0D9488',
    title: '#0F766E',
    banner: '#CCFBF1',
    bg: '#F0FDFA',
    grid: 'rgba(13, 148, 136, 0.10)',
    border: '#5EEAD4',
    dark: '#134E4A',
  },
  pink: {
    primary: '#DB2777',
    title: '#BE185D',
    banner: '#FBCFE8',
    bg: '#FDF2F8',
    grid: 'rgba(219, 39, 119, 0.10)',
    border: '#F472B6',
    dark: '#831843',
  },
  slate: {
    primary: '#475569',
    title: '#334155',
    banner: '#E2E8F0',
    bg: '#F8FAFC',
    grid: 'rgba(71, 85, 105, 0.10)',
    border: '#94A3B8',
    dark: '#0F172A',
  },
  bronze: {
    primary: '#92400E',
    title: '#78350F',
    banner: '#FEF3C7',
    bg: '#FFFBEB',
    grid: 'rgba(146, 64, 14, 0.10)',
    border: '#FCD34D',
    dark: '#451A03',
  },
  navy: {
    primary: '#1E3A8A',
    title: '#172554',
    banner: '#BFDBFE',
    bg: '#F0F9FF',
    grid: 'rgba(30, 58, 138, 0.10)',
    border: '#60A5FA',
    dark: '#0A192F',
  },
};

const TYPE_THEME_MAP = {
  // Sci-Fi & Core Types
  sharpshooter: 'crimson',
  normal: 'crimson',
  jazz: 'blue',
  aimbot: 'blue',
  spike: 'gold',
  melee: 'gold',
  circe: 'emerald',
  grenadier: 'emerald',
  hyperion: 'cyan',
  laser: 'cyan',
  knight: 'slate',
  erebus: 'violet',
  black: 'violet',
  shinobi: 'slate',
  darkslategray: 'slate',
  ember: 'orange',
  berserker: 'crimson',
  cronos: 'cyan',
  cronus: 'cyan',
  bomber: 'bronze',
  bombardier: 'bronze',
  alucard: 'crimson',
  gunslinger: 'crimson',
  doppelganger: 'violet',
  doppleganger: 'violet',
  engineer: 'gold',
  ruby: 'pink',
  musashi: 'navy',
  rubbick: 'emerald',
  zeus: 'cyan',
  hydra: 'violet',
  gojo: 'cyan',
  sukuna: 'crimson',
  yuta: 'pink',
  toji: 'violet',
  todo: 'orange',
  yuji: 'pink',
  layla: 'cyan',
  saitama: 'gold',
  genos: 'orange',
  ichigo: 'orange',
  mahito: 'violet',
  nanami: 'gold',
  nobara: 'pink',
  john_wick: 'slate',
  johnwick: 'slate',
  cj: 'emerald',
  megumi: 'navy',
  uryu: 'cyan',
  ishida: 'cyan',
  ulquiorra: 'emerald',
  makima: 'crimson',
  reze: 'violet',
  denji: 'gold',
  power: 'crimson',
  tanjiro: 'emerald',
  nezuko: 'pink',
  zenitsu: 'gold',
  inosuke: 'blue',
  escanor: 'gold',
  eye_of_cthulhu: 'crimson',
  ender_dragon: 'violet',
  enderdragon: 'violet',
  megumin: 'crimson',
  crazydave: 'emerald',
  crazy_dave: 'emerald',
  plants: 'emerald',
  pekka: 'slate',
  namelessdeity: 'slate',
  nameless_deity: 'slate',
  draedon: 'cyan',
  sans: 'cyan',
  avatarofemptiness: 'violet',
  avatar_of_emptiness: 'violet',
  naoya: 'emerald',
  maki: 'emerald',
  shiro: 'violet',
  spartan: 'crimson',
  guts: 'slate',
  choso: 'crimson',
  mahoraga: 'gold',
};

function _hexToHsl(hex) {
  if (!hex) return null;
  hex = String(hex).replace('#', '');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return null;
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function _classifyColorToTheme(rawColor) {
  const hsl = _hexToHsl(rawColor);
  if (!hsl) return null;
  const { h, s, l } = hsl;
  // Very low saturation or dark steel/charcoal -> Slate
  if (s < 18 || (l > 92 && s < 30)) return 'slate';
  if (l < 30 && s < 35) return 'slate';

  if (h >= 345 || h < 14) return 'crimson';
  if (h >= 14 && h < 45) {
    if (l < 35 && s < 60) return 'bronze';
    if (h >= 35 && s > 70) return 'gold';
    return 'orange';
  }
  if (h >= 45 && h < 70) return 'gold';
  if (h >= 70 && h < 165) return 'emerald';
  if (h >= 165 && h < 200) return 'cyan';
  if (h >= 200 && h < 255) {
    if (l < 30 && s > 30) return 'navy';
    return 'blue';
  }
  if (h >= 255 && h < 315) return 'violet';
  if (h >= 315 && h < 345) return 'pink';
  return 'gold';
}

export function getFighterCollectorTheme(def) {
  if (!def) return PRESET_THEMES.crimson;

  // 1. Explicit character/type mapping
  const typeKey = String(def.type || '').toLowerCase();
  if (TYPE_THEME_MAP[typeKey] && PRESET_THEMES[TYPE_THEME_MAP[typeKey]]) {
    return PRESET_THEMES[TYPE_THEME_MAP[typeKey]];
  }
  const nameKey = String(def.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (TYPE_THEME_MAP[nameKey] && PRESET_THEMES[TYPE_THEME_MAP[nameKey]]) {
    return PRESET_THEMES[TYPE_THEME_MAP[nameKey]];
  }
  const idKey = String(def.id || '').toLowerCase();
  if (TYPE_THEME_MAP[idKey] && PRESET_THEMES[TYPE_THEME_MAP[idKey]]) {
    return PRESET_THEMES[TYPE_THEME_MAP[idKey]];
  }

  // 2. Classify explicit themeColor or body color
  if (def.themeColor) {
    const key = _classifyColorToTheme(def.themeColor);
    if (key && PRESET_THEMES[key]) return PRESET_THEMES[key];
  }
  if (def.color) {
    const key = _classifyColorToTheme(def.color);
    if (key && PRESET_THEMES[key]) return PRESET_THEMES[key];
  }

  // 3. Fallback cycle based on name hash so every fighter gets a rich pastel/vibrant card
  const keys = Object.keys(PRESET_THEMES);
  const nameStr = String(def.name || def.type || 'FIGHTER');
  let hash = 0;
  for (let i = 0; i < nameStr.length; i++) {
    hash = (hash * 31 + nameStr.charCodeAt(i)) >>> 0;
  }
  return PRESET_THEMES[keys[hash % keys.length]];
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRIAL TACTICAL TECH HELPERS (FOADAO 555 2nd / Ake Nights Theme)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws high-voltage industrial caution / hazard diagonal stripes (////)
 */
export function drawHazardStripes(ctx, x, y, w, h, stripeW = 6, color1 = '#F5A623', color2 = '#15171F') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color1;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color2;
  const diagSpan = w + h + stripeW * 4;
  for (let offset = -h * 2; offset < diagSpan; offset += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + h);
    ctx.lineTo(x + offset + stripeW, y + h);
    ctx.lineTo(x + offset + stripeW + h * 0.75, y);
    ctx.lineTo(x + offset + h * 0.75, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawCornerBrackets(ctx, x, y, w, h, len = 8, color = '#F5A623', strokeW = 1.6) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(x + len, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + len);
  // Top-right
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  // Bottom-left
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  // Bottom-right
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
  ctx.restore();
}
const _drawCornerBrackets = drawCornerBrackets;

/**
 * Draws a dark tactical stat gauge with dark recessed track, glowing fill, and numeric readout
 */
export function drawTacticalStatBar(ctx, label, value, maxValue, x, y, width, color = '#F5A623') {
  // Label on left
  ctx.fillStyle = '#94A3B8';
  ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, Math.round(x), Math.round(y + 3));

  const labelW = 26;
  const valueW = width > 120 ? 32 : 0;
  const barX = x + labelW;
  const barW = width - labelW - valueW - 4;
  const barH = 5;

  // Dark Recessed Background Track
  ctx.fillStyle = '#0B0D12';
  ctx.strokeStyle = '#232733';
  ctx.lineWidth = 1.0;
  drawChamferedRect(ctx, barX, y + 1, barW, barH, 2);
  ctx.fill();
  ctx.stroke();

  // Segmented Foreground Gauge
  const pct = Math.max(0.04, Math.min(1.0, value / maxValue));
  const fillW = Math.max(2, Math.round((barW - 2) * pct));
  ctx.save();
  ctx.fillStyle = color;
  drawChamferedRect(ctx, barX + 1, y + 2, fillW, barH - 2, 1);
  ctx.fill();
  ctx.restore();

  // Numeric Value on right
  if (valueW > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 9.5px "Silkscreen", "Rajdhani", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value ?? 0), Math.round(x + width), Math.round(y + 3));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD SILHOUETTE & DIE-CUT NOTCH GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────

function _traceCollectorCardPath(ctx, x, y, w, h, r = 4) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Returns the Zeus-inspired Gacha Card Grade Palette (B, A, S, SS).
 * S-Grade corresponds 1:1 to the Zeus Golden Master reference.
 */
export function getZeusGradeCardTheme(grade = 'B') {
  const g = String(grade || 'B').toUpperCase();
  switch (g) {
    case 'SS':
      // SS - RED (Crimson / Scarlet Phoenix)
      return {
        grade: 'SS',
        primary: '#F43F5E',
        glowCenter: 'rgba(244, 63, 94, 0.46)',
        glowMid: 'rgba(159, 18, 57, 0.22)',
        accentBar: '#F43F5E',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#7F1D1D',
        rayHighlight: '#F43F5E',
        rayCore: '#FFE4E6',
        plateBg: '#130A0D',
        plateBorder: '#F43F5E',
        starColor: '#FFD700',
        stars: 6,
        wingBase: '#FFFFFF',
        wingShade: '#FECDD3',
        burstOuter: '#9F1239',
        burstInner: '#FFF1F2',
        letterFill: '#F43F5E',
        ribbonFill: '#E11D48',
        ribbonBorder: '#0A0C10',
        ribbonText: '#FFFFFF',
        sashBase: '#BE123C',
        sashHighlight: '#FDA4AF',
        sparkle: '#FFE4E6',
      };
    case 'S':
      // S - GOLD (The Zeus Radiant 24K Solar Master)
      return {
        grade: 'S',
        primary: '#FFD700',
        glowCenter: 'rgba(255, 252, 215, 0.92)',
        glowMid: 'rgba(255, 215, 0, 0.72)',
        glowWarm: 'rgba(245, 175, 10, 0.45)',
        bgBase: '#120E04',
        bgDark: '#0A0803',
        accentBar: '#FFD700',
        borderOuter: '#050609',
        borderInner: '#FFD700',
        rayBase: '#D97706',
        rayHighlight: '#FFF59D',
        rayCore: '#FFFDF0',
        plateBg: '#181204',
        plateBorder: '#FFD700',
        starColor: '#FFD700',
        stars: 5,
        wingBase: '#FFFFFF',
        wingShade: '#FFF176',
        burstOuter: '#D97706',
        burstInner: '#FFFDE7',
        letterFill: '#FFD700',
        ribbonFill: '#FFD700',
        ribbonBorder: '#0A0C10',
        ribbonText: '#180B02',
        sashBase: '#F59E0B',
        sashHighlight: '#FFF59D',
        sparkle: '#FFFDF0',
      };
    case 'A':
      // A - PURPLE (Amethyst / Royal Violet)
      return {
        grade: 'A',
        primary: '#A855F7',
        glowCenter: 'rgba(168, 85, 247, 0.42)',
        glowMid: 'rgba(107, 33, 168, 0.20)',
        accentBar: '#A855F7',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#581C87',
        rayHighlight: '#A855F7',
        rayCore: '#FAF5FF',
        plateBg: '#120A1A',
        plateBorder: '#A855F7',
        starColor: '#E9D5FF',
        stars: 4,
        wingBase: '#FFFFFF',
        wingShade: '#E9D5FF',
        burstOuter: '#6B21A8',
        burstInner: '#FAF5FF',
        letterFill: '#C084FC',
        ribbonFill: '#A855F7',
        ribbonBorder: '#0A0C10',
        ribbonText: '#FFFFFF',
        sashBase: '#7E22CE',
        sashHighlight: '#E9D5FF',
        sparkle: '#E9D5FF',
      };
    case 'B':
    default:
      // B - GREEN (Emerald / Jade / Mint)
      return {
        grade: 'B',
        primary: '#10B981',
        glowCenter: 'rgba(16, 185, 129, 0.42)',
        glowMid: 'rgba(6, 95, 70, 0.20)',
        accentBar: '#10B981',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#064E3B',
        rayHighlight: '#10B981',
        rayCore: '#ECFDF5',
        plateBg: '#05140F',
        plateBorder: '#10B981',
        starColor: '#6EE7B7',
        stars: 3,
        wingBase: '#FFFFFF',
        wingShade: '#A7F3D0',
        burstOuter: '#065F46',
        burstInner: '#F0FDF4',
        letterFill: '#34D399',
        ribbonFill: '#10B981',
        ribbonBorder: '#0A0C10',
        ribbonText: '#022C22',
        sashBase: '#059669',
        sashHighlight: '#6EE7B7',
        sparkle: '#A7F3D0',
      };
  }
}

/**
 * Draws a 4-point comic sparkle cross with a bright diamond core.
 */
function _draw4PointSparkle(ctx, cx, cy, size, color = '#FFE082') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size * 0.35, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size * 0.35, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size * 0.35);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size * 0.35);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, size * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the dynamic comic sunburst rays and screentone dots from the Zeus reference.
 */
function _drawComicSunburstRays(ctx, x, y, w, h, cx, cy, theme) {
  const numRays = 22;
  const rayAngle = (Math.PI * 2) / numRays;
  const maxR = Math.hypot(w, h) * 1.35;

  ctx.save();
  ctx.fillStyle = theme.rayBase;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < numRays; i += 2) {
    const a1 = i * rayAngle;
    const a2 = (i + 1) * rayAngle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a1) * maxR, cy + Math.sin(a1) * maxR);
    ctx.lineTo(cx + Math.cos(a2) * maxR, cy + Math.sin(a2) * maxR);
    ctx.closePath();
    ctx.fillStyle = theme.rayHighlight;
    ctx.fill();
  }

  // Soft center core radial wash
  const coreR = Math.max(w, h) * 0.40;
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR);
  grad.addColorStop(0, theme.rayCore);
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.28)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Corner Screentone Halftone Dots
  const dotStep = 7;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let dy = y + 4; dy < y + h * 0.36; dy += dotStep) {
    for (let dx = x + w * 0.60; dx < x + w - 4; dx += dotStep) {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws the top-left angled comic nameplate with fighter name, gold stars, and sparkle cross.
 */
function _drawTopLeftComicNameplate(ctx, x, y, w, h, name, theme) {
  ctx.save();
  const npX = x - 2;
  const npY = y + 7;
  const npW = Math.min(w * 0.55, Math.max(54, name.length * 7.2 + 16));
  const npH = 25;

  ctx.beginPath();
  ctx.moveTo(npX, npY);
  ctx.lineTo(npX + npW, npY + 4);
  ctx.lineTo(npX + npW - 7, npY + npH);
  ctx.lineTo(npX, npY + npH - 3);
  ctx.closePath();

  ctx.fillStyle = theme.plateBg;
  ctx.fill();

  ctx.strokeStyle = theme.borderOuter;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  ctx.strokeStyle = theme.plateBorder;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.save();
  ctx.translate(npX + 9, npY + 9);
  ctx.rotate(0.04);
  let fontSize = Math.max(9.0, Math.min(12.0, Math.round(w * 0.082)));
  ctx.font = `900 ${fontSize}px "Outfit", "Impact", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const maxTextW = npW - 14;
  while (fontSize > 7.5 && ctx.measureText(name).width > maxTextW) {
    fontSize -= 0.5;
    ctx.font = `900 ${fontSize}px "Outfit", "Impact", sans-serif`;
  }
  const fittedName = fitSingleLineText(ctx, name, maxTextW);

  // Drop shadow
  ctx.fillStyle = '#000000';
  ctx.fillText(fittedName, 1.2, 1.2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fittedName, 0, 0);

  // Gold stars row under the name
  const starCount = theme.stars || 5;
  const starsStr = '★'.repeat(starCount);
  ctx.font = '900 8.5px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(starsStr, 0.8, 9.8);
  ctx.fillStyle = theme.starColor;
  ctx.fillText(starsStr, 0, 9);
  ctx.restore();

  // Sparkle cross on top-right corner of nameplate
  _draw4PointSparkle(ctx, npX + npW - 3, npY + 3, 4.2, theme.sparkle);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDCRAFTED GACHA GRADE BANNER ASSET LOADER (Assets/Overlays/Banners/grade*.png)
// ─────────────────────────────────────────────────────────────────────────────

const _gradeBannerImages = {
  A: null,
  B: null,
  S: null,
  SS: null,
};

export function getGradeBannerImage(grade = 'B') {
  const g = String(grade || 'B').toUpperCase();
  const validKey = ['A', 'B', 'S', 'SS'].includes(g) ? g : 'B';
  if (_gradeBannerImages[validKey] && _gradeBannerImages[validKey].complete && _gradeBannerImages[validKey].naturalWidth > 0) {
    return _gradeBannerImages[validKey];
  }
  if (typeof Image !== 'undefined') {
    if (!_gradeBannerImages[validKey]) {
      const img = new Image();
      img.src = `Assets/Overlays/Banners/grade${validKey}.png`;
      _gradeBannerImages[validKey] = img;
    }
    return _gradeBannerImages[validKey];
  }
  return _gradeBannerImages[validKey];
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  ['A', 'B', 'S', 'SS'].forEach(getGradeBannerImage);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE BANNER PROCEDURAL SPECIAL EFFECTS ENGINE (B -> A -> S -> SS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws a rotating 4-point comic sparkle cross with diamond core.
 */
function _drawRotatedComicSparkle(ctx, cx, cy, size, angle, outerColor, coreColor = '#FFFFFF') {
  ctx.save();
  ctx.translate(cx, cy);
  if (angle) ctx.rotate(angle);

  ctx.fillStyle = outerColor;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(0, 0, size * 0.35, 0);
  ctx.quadraticCurveTo(0, 0, 0, size);
  ctx.quadraticCurveTo(0, 0, -size * 0.35, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, 0, 0, size * 0.35);
  ctx.quadraticCurveTo(0, 0, size, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size * 0.35);
  ctx.quadraticCurveTo(0, 0, -size, 0);
  ctx.fill();

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  const cSize = size * 0.35;
  ctx.arc(0, 0, cSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a rotating 2D diamond particle with specular core.
 */
function _drawRotatedDiamond(ctx, cx, cy, size, angle, outerColor, coreColor = '#FFFFFF') {
  ctx.save();
  ctx.translate(cx, cy);
  if (angle) ctx.rotate(angle);

  ctx.fillStyle = outerColor;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.65, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.65, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.lineTo(size * 0.30, 0);
  ctx.lineTo(0, size * 0.45);
  ctx.lineTo(-size * 0.30, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a razor-sharp, sleek ember sliver / energy shard particle (no bulky flame blobs).
 */
function _drawSharpEmberSliver(ctx, ex, ey, len, width, angle, alpha, isDarkCore = false) {
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle);

  // Soft micro-glow halo around the particle
  const haloR = len * 0.75;
  const grad = ctx.createRadialGradient(0, 0, 0.2, 0, 0, haloR);
  grad.addColorStop(0, isDarkCore ? `rgba(244, 63, 94, ${alpha * 0.55})` : `rgba(255, 90, 20, ${alpha * 0.48})`);
  grad.addColorStop(1, 'rgba(185, 28, 28, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Outer razor diamond sliver
  ctx.fillStyle = isDarkCore
    ? `rgba(244, 63, 94, ${alpha * 0.95})`
    : `rgba(239, 68, 68, ${alpha * 0.92})`;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.62);
  ctx.lineTo(width * 0.50, 0);
  ctx.lineTo(0, len * 0.42);
  ctx.lineTo(-width * 0.50, 0);
  ctx.closePath();
  ctx.fill();

  // Inner core (dark void core for menacing Haki sparks, or incandescent gold-white for fire cinders)
  ctx.fillStyle = isDarkCore
    ? `rgba(10, 10, 14, ${alpha * 0.96})`
    : `rgba(255, 248, 200, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.34);
  ctx.lineTo(width * 0.24, 0);
  ctx.lineTo(0, len * 0.22);
  ctx.lineTo(-width * 0.24, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── TIER 1: GRADE B VFX (Modest / Low-intensity / Emerald Green) ──

function _drawGradeVFX_B_Midground(ctx, cx, cy, drawW, drawH, t) {
  // A single faint emerald dust particle floating slowly upward
  const p = (t * 0.30) % 1.0;
  const sx = cx + Math.sin(t * 1.5) * (drawW * 0.25);
  const sy = cy + drawH * 0.15 - p * (drawH * 0.45);
  const sa = Math.sin(p * Math.PI) * 0.38;
  if (sa > 0.03) {
    ctx.fillStyle = `rgba(52, 211, 153, ${sa})`;
    ctx.fillRect(Math.round(sx), Math.round(sy), 1.5, 1.5);
  }
}


// ── TIER 2: GRADE A VFX (Good / Royal Purple & Amethyst Sparkles) ──

function _drawGradeVFX_A_Backdrop(ctx, cx, cy, drawW, drawH, t) {
  // Warm royal purple/amethyst halo breath
  const pulse = Math.sin(t * 2.8) * 0.5 + 0.5;
  const haloR = drawW * 0.40 + pulse * 5;
  const haloGrad = ctx.createRadialGradient(cx, cy, haloR * 0.3, cx, cy, haloR);
  haloGrad.addColorStop(0, 'rgba(168, 85, 247, 0.26)');
  haloGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();
}

function _drawGradeVFX_A_Midground(ctx, cx, cy, drawW, drawH, t) {
  // 4 animated lavender/amethyst diamond cross sparkles at wing tips & crest
  const sparkles = [
    { dx: -drawW * 0.38, dy: -drawH * 0.28, phase: 0.0, size: 4.8 },
    { dx: drawW * 0.38, dy: -drawH * 0.28, phase: 0.5, size: 4.8 },
    { dx: -drawW * 0.42, dy: drawH * 0.06, phase: 0.25, size: 3.6 },
    { dx: drawW * 0.42, dy: drawH * 0.06, phase: 0.75, size: 3.6 },
    { dx: 0, dy: -drawH * 0.44, phase: 0.4, size: 4.2 }
  ];

  sparkles.forEach(sp => {
    const sPhase = (t * 2.4 + sp.phase * Math.PI * 2);
    const sAlpha = Math.max(0, Math.sin(sPhase));
    if (sAlpha > 0.12) {
      const curSize = sp.size * (0.65 + sAlpha * 0.45);
      const rot = t * 1.6 + sp.phase;
      _drawRotatedComicSparkle(ctx, cx + sp.dx, cy + sp.dy, curSize, rot, `rgba(216, 180, 254, ${sAlpha})`, `rgba(255, 255, 255, ${sAlpha * 0.95})`);
    }
  });

  // Rising lavender light motes
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.65 + i * 0.33) % 1.0;
    const sx = cx + (Math.sin(i * 2.4 + t * 2.2) * drawW * 0.22);
    const sy = cy + drawH * 0.18 - p * (drawH * 0.52);
    const sa = Math.sin(p * Math.PI) * 0.75;
    if (sa > 0.04) {
      ctx.fillStyle = `rgba(216, 180, 254, ${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// ── TIER 3: GRADE S VFX (Very Good / Radiant Solar Gold Corona & Orbiting Stars) ──

function _drawGradeVFX_S_Backdrop(ctx, cx, cy, drawW, drawH, t) {
  // Radiant Golden Amber Corona
  const pulse = Math.sin(t * 3.4) * 0.5 + 0.5;
  const coronaR = drawW * 0.44 + pulse * 6;
  const coronaGrad = ctx.createRadialGradient(cx, cy, coronaR * 0.25, cx, cy, coronaR);
  coronaGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
  coronaGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.26)');
  coronaGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
  ctx.fill();

  // Rule 26 Concentric Cosmic Ripple (Supersonic golden compression wave)
  const waveCycle = (t * 0.72) % 1.0;
  const waveR = drawW * 0.16 + Math.pow(waveCycle, 0.72) * (drawW * 0.42);
  const waveAlpha = Math.pow(1 - waveCycle, 1.3) * 0.55;
  if (waveAlpha > 0.02) {
    ctx.strokeStyle = `rgba(253, 224, 71, ${waveAlpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(245, 158, 11, ${waveAlpha * 0.70})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR * 0.88, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function _drawGradeVFX_S_Midground(ctx, cx, cy, drawW, drawH, t) {
  // Orbiting 3D Celestial Golden Star Diamonds (tilted ellipse around seal)
  const orbitRx = drawW * 0.48;
  const orbitRy = drawH * 0.25;
  const orbitTilt = -0.18;
  const cosT = Math.cos(orbitTilt);
  const sinT = Math.sin(orbitTilt);

  for (let i = 0; i < 3; i++) {
    const a = t * 2.8 + (i * Math.PI * 2) / 3;
    const localX = Math.cos(a) * orbitRx;
    const localY = Math.sin(a) * orbitRy;
    const ox = cx + (localX * cosT - localY * sinT);
    const oy = cy + (localX * sinT + localY * cosT);
    const depth = Math.sin(a);
    const size = 3.2 + (depth + 1) * 1.4;
    const orbAlpha = 0.45 + (depth + 1) * 0.26;

    _drawRotatedDiamond(ctx, ox, oy, size, a * 1.6, `rgba(255, 215, 0, ${orbAlpha})`, `rgba(255, 255, 230, ${orbAlpha * 0.95})`);

    // Trailing comet golden stardust
    const trailA = a - 0.22;
    const tx = cx + ((Math.cos(trailA) * orbitRx) * cosT - (Math.sin(trailA) * orbitRy) * sinT);
    const ty = cy + ((Math.cos(trailA) * orbitRx) * sinT + (Math.sin(trailA) * orbitRy) * cosT);
    ctx.fillStyle = `rgba(245, 158, 11, ${orbAlpha * 0.50})`;
    ctx.fillRect(tx - 1, ty - 1, 2, 2);
  }

  // Golden starlight diamond flares on wing tips
  const wingFlares = [
    { dx: -drawW * 0.42, dy: -drawH * 0.32, p: 0.1 },
    { dx: drawW * 0.42, dy: -drawH * 0.32, p: 0.6 },
    { dx: 0, dy: -drawH * 0.45, p: 0.35 }
  ];
  wingFlares.forEach(wf => {
    const fPhase = (t * 3.0 + wf.p * Math.PI * 2);
    const fAlpha = Math.max(0, Math.sin(fPhase));
    if (fAlpha > 0.15) {
      _drawRotatedComicSparkle(ctx, cx + wf.dx, cy + wf.dy, 5.5 * fAlpha, t * 2.0, `rgba(254, 240, 138, ${fAlpha})`, `rgba(255, 255, 255, ${fAlpha})`);
    }
  });
}


// ── TIER 4: GRADE SS VFX (Intimidating Crimson/Black-Red & Gold Aura Particles) ──

function _drawSSParticlesBackdrop(ctx, cx, cy, drawW, drawH, t) {
  // Subtle, ominous dark-crimson & blood-red aura pulse behind the seal
  const pulse = Math.sin(t * 3.8) * 0.5 + 0.5;
  const glowR = drawW * 0.52 + pulse * 4;
  const glowGrad = ctx.createRadialGradient(cx, cy, glowR * 0.15, cx, cy, glowR);
  glowGrad.addColorStop(0, 'rgba(220, 38, 38, 0.38)');
  glowGrad.addColorStop(0.55, 'rgba(153, 27, 27, 0.22)');
  glowGrad.addColorStop(1, 'rgba(69, 10, 10, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
}

function _drawSSParticlesMidground(ctx, cx, cy, drawW, drawH, t) {
  // 1. Razor-Sharp Intimidating Ember Slivers & Dark-Core Menacing Sparks (16 particles)
  const slivers = [
    // Upper wing flanks & inner valleys
    { dx: -0.44, dy: -0.18, ang: -0.32, len: 5.2, w: 1.7, ph: 0.00, dark: false },
    { dx:  0.44, dy: -0.18, ang:  0.32, len: 5.2, w: 1.7, ph: 0.50, dark: false },
    { dx: -0.36, dy: -0.34, ang: -0.22, len: 4.6, w: 1.5, ph: 0.25, dark: true  },
    { dx:  0.36, dy: -0.34, ang:  0.22, len: 4.6, w: 1.5, ph: 0.75, dark: true  },
    { dx: -0.20, dy: -0.26, ang: -0.15, len: 4.8, w: 1.6, ph: 0.12, dark: false },
    { dx:  0.20, dy: -0.26, ang:  0.15, len: 4.8, w: 1.6, ph: 0.62, dark: false },
    // Outer wing perimeter
    { dx: -0.50, dy:  0.04, ang: -0.45, len: 5.5, w: 1.8, ph: 0.38, dark: true  },
    { dx:  0.50, dy:  0.04, ang:  0.45, len: 5.5, w: 1.8, ph: 0.88, dark: true  },
    { dx: -0.46, dy:  0.22, ang: -0.38, len: 4.4, w: 1.5, ph: 0.18, dark: false },
    { dx:  0.46, dy:  0.22, ang:  0.38, len: 4.4, w: 1.5, ph: 0.68, dark: false },
    // Lower flanks rising upward
    { dx: -0.32, dy:  0.32, ang: -0.28, len: 5.0, w: 1.6, ph: 0.42, dark: false },
    { dx:  0.32, dy:  0.32, ang:  0.28, len: 5.0, w: 1.6, ph: 0.92, dark: false },
    { dx: -0.16, dy:  0.36, ang: -0.12, len: 4.2, w: 1.4, ph: 0.30, dark: true  },
    { dx:  0.16, dy:  0.36, ang:  0.12, len: 4.2, w: 1.4, ph: 0.80, dark: true  },
    // Crown apex slivers
    { dx: -0.06, dy: -0.36, ang: -0.08, len: 4.5, w: 1.5, ph: 0.55, dark: false },
    { dx:  0.06, dy: -0.36, ang:  0.08, len: 4.5, w: 1.5, ph: 0.05, dark: false },
  ];

  for (let i = 0; i < slivers.length; i++) {
    const s = slivers[i];
    const cycle = (t * 0.88 + s.ph) % 1.0;
    const rise = cycle * 11.5;
    const sway = Math.sin(cycle * Math.PI * 2 + i) * 2.2;
    const dirX = Math.sin(s.ang);
    const dirY = -Math.cos(s.ang);
    const px = cx + s.dx * drawW + dirX * rise + sway;
    const py = cy + s.dy * drawH + dirY * rise;
    const alpha = Math.sin(cycle * Math.PI) * 0.95;

    if (alpha > 0.08) {
      const scale = 0.72 + Math.sin(cycle * Math.PI) * 0.38;
      _drawSharpEmberSliver(ctx, px, py, s.len * scale, s.w * scale, s.ang + sway * 0.06, alpha, s.dark);
    }
  }

  // 2. Floating Glowing Cinder Motes (12 fine pinpoint embers drifting upward)
  const numMotes = 12;
  for (let i = 0; i < numMotes; i++) {
    const p = (t * 0.75 + i * (1 / numMotes)) % 1.0;
    const side = (i % 2 === 0) ? -1 : 1;
    const spread = 0.14 + ((i * 0.19) % 0.36);
    const mx = cx + side * spread * drawW + Math.sin(t * 2.6 + i * 1.7) * 3.0;
    const my = cy + drawH * 0.28 - p * (drawH * 0.82);
    const mAlpha = Math.sin(p * Math.PI) * 0.90;

    if (mAlpha > 0.06) {
      const r = 1.0 + Math.sin(p * Math.PI) * 0.8;
      // Soft crimson-orange cinder halo
      ctx.fillStyle = `rgba(239, 68, 68, ${mAlpha * 0.38})`;
      ctx.beginPath();
      ctx.arc(mx, my, r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Hot gold-white pinpoint core
      ctx.fillStyle = (i % 3 === 0)
        ? `rgba(254, 240, 138, ${mAlpha})`
        : `rgba(255, 120, 40, ${mAlpha})`;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Crisp 4-Point Crimson/Gold Star Glints at Wing Tips
  const glints = [
    { dx: -drawW * 0.42, dy: -drawH * 0.34, phase: 0.0 },
    { dx:  drawW * 0.42, dy: -drawH * 0.34, phase: 0.5 },
    { dx:  0,            dy: -drawH * 0.42, phase: 0.25 },
  ];
  for (let i = 0; i < glints.length; i++) {
    const g = glints[i];
    const gAlpha = Math.max(0, Math.sin(t * 3.2 + g.phase * Math.PI * 2));
    if (gAlpha > 0.22) {
      _drawRotatedComicSparkle(
        ctx,
        cx + g.dx,
        cy + g.dy,
        4.6 * gAlpha,
        t * 2.0,
        `rgba(244, 63, 94, ${gAlpha})`,
        `rgba(255, 250, 220, ${gAlpha})`
      );
    }
  }
}

/**
 * Draws a flowing specular gleam directly ONTO the letter glyphs
 * via ctx.fillText(grade, letterX, letterY) — zero rect clipping, zero cropping!
 */
function _drawGradeLetterGlintOnText(ctx, letterX, letterY, grade, t) {
  const isSS = grade === 'SS';

  if (grade === 'B') {
    // ── B (GREEN): Subtle mint/emerald gleam passing across letter "B" ──
    const cycle = (t * 0.24) % 1.0;
    if (cycle < 0.28) {
      const sp = cycle / 0.28;
      const gx = letterX - 16 + sp * 32;
      const grad = ctx.createLinearGradient(gx - 8, letterY - 10, gx + 8, letterY + 10);
      grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.70)');
      grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
      ctx.fillStyle = grad;
      ctx.fillText(grade, letterX, letterY);
    }
  } else if (grade === 'A') {
    // ── A (PURPLE): Sweeping royal purple and starlight beam across letter "A" ──
    const cycle = (t * 0.45) % 1.0;
    if (cycle < 0.38) {
      const sp = cycle / 0.38;
      const gx = letterX - 18 + sp * 36;
      const grad = ctx.createLinearGradient(gx - 10, letterY - 12, gx + 10, letterY + 12);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.6, 'rgba(233, 213, 255, 0.90)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.fillText(grade, letterX, letterY);

      // Organic diamond sparkle riding the gleam
      const gleamAlpha = Math.sin(sp * Math.PI);
      if (gleamAlpha > 0.3) {
        _drawRotatedComicSparkle(ctx, gx, letterY, 4.2 * gleamAlpha, t * 2.5, `rgba(233, 213, 255, ${gleamAlpha})`, `rgba(255, 255, 255, ${gleamAlpha})`);
      }
    }
  } else if (grade === 'S') {
    // ── S (GOLD): Dazzling golden-white solar flare across letter "S" ──
    const cycle = (t * 0.55) % 1.0;
    if (cycle < 0.36) {
      const sp = cycle / 0.36;
      const gx = letterX - 18 + sp * 36;
      const grad = ctx.createLinearGradient(gx - 10, letterY - 14, gx + 10, letterY + 14);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(0.65, 'rgba(253, 224, 71, 0.92)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = grad;
      ctx.fillText(grade, letterX, letterY);

      // Radiant 4-point golden star sparkle riding the leading edge of the gleam
      const gleamAlpha = Math.sin(sp * Math.PI);
      if (gleamAlpha > 0.25) {
        _drawRotatedComicSparkle(ctx, gx, letterY, 4.8 * gleamAlpha, t * 3.0, `rgba(254, 240, 138, ${gleamAlpha})`, `rgba(255, 255, 255, ${gleamAlpha})`);
      }
    }
  } else if (isSS) {
    // ── SS (RED): Searing Crimson-Gold-White slash gleam across double "SS" ──
    const cycle = (t * 0.60) % 1.0;
    if (cycle < 0.38) {
      const cp = cycle / 0.38;
      const gx = letterX - 20 + cp * 40;
      const grad = ctx.createLinearGradient(gx - 10, letterY - 12, gx + 10, letterY + 12);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0)');
      grad.addColorStop(0.3, 'rgba(253, 224, 71, 0.92)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(0.7, 'rgba(251, 113, 133, 0.90)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.fillText(grade, letterX, letterY);

      // Sharp crimson-gold spark riding the letters
      const gleamAlpha = Math.sin(cp * Math.PI);
      if (gleamAlpha > 0.28) {
        _drawRotatedComicSparkle(ctx, gx, letterY, 4.8 * gleamAlpha, t * 3.2, `rgba(253, 224, 71, ${gleamAlpha})`, `rgba(255, 255, 255, ${gleamAlpha})`);
      }
    }
  }
}

export function drawWingedGradeLetter(ctx, letterX, letterY, grade, theme, cardIdx = 0, scale = 1.0, includeGradeEffects = false) {
  if (!theme) {
    theme = getZeusGradeCardTheme(grade);
  }

  const phaseOffset = (cardIdx * 0.73 + letterX * 0.04) % (Math.PI * 2);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const t = now * 0.001 + phaseOffset;
  const fontSize = grade === 'SS' ? 17.5 : 21.5;

  if (includeGradeEffects) {
    if (grade === 'SS') {
      _drawSSParticlesBackdrop(ctx, letterX, letterY, 76, 54, t);
    } else if (grade === 'S') {
      _drawGradeVFX_S_Backdrop(ctx, letterX, letterY, 76, 54, t);
    } else if (grade === 'A') {
      _drawGradeVFX_A_Backdrop(ctx, letterX, letterY, 76, 54, t);
    }
  }

  ctx.save();
  ctx.translate(letterX, letterY);
  ctx.scale(scale, scale);
  ctx.font = `900 ${fontSize}px "Impact", "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#0B0C10';
  ctx.lineWidth = 4.2;
  ctx.strokeText(grade, 0, 0);
  ctx.fillStyle = theme.letterFill;
  ctx.fillText(grade, 0, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(grade, -0.5, -0.5);
  ctx.fillStyle = theme.letterFill;
  ctx.fillText(grade, 0, 0);
  _drawGradeLetterGlintOnText(ctx, 0, 0, grade, t);
  ctx.restore();

  if (includeGradeEffects) {
    if (grade === 'SS') {
      _drawSSParticlesMidground(ctx, letterX, letterY, 76, 54, t);
    } else if (grade === 'S') {
      _drawGradeVFX_S_Midground(ctx, letterX, letterY, 76, 54, t);
    } else if (grade === 'A') {
      _drawGradeVFX_A_Midground(ctx, letterX, letterY, 76, 54, t);
    } else {
      _drawGradeVFX_B_Midground(ctx, letterX, letterY, 76, 54, t);
    }
  }
}

const _gradeBannerOutlinedCache = {};

function _getOutlinedGradeBannerCanvas(grade, targetW, targetH) {
  const g = String(grade || 'B').toUpperCase();
  const validKey = ['A', 'B', 'S', 'SS'].includes(g) ? g : 'B';
  const cacheKey = `${validKey}_${targetW}_${targetH}`;
  if (_gradeBannerOutlinedCache[cacheKey]) {
    return _gradeBannerOutlinedCache[cacheKey];
  }

  const rawImg = getGradeBannerImage(validKey);
  if (!rawImg || !rawImg.complete || !rawImg.naturalWidth) return null;
  if (typeof document === 'undefined') return null;

  try {
    const pad = 6;
    const can = document.createElement('canvas');
    can.width = targetW + pad * 2;
    can.height = targetH + pad * 2;
    const c = can.getContext('2d');
    if (!c) return null;

    // Create silhouette mask canvas
    const sil = document.createElement('canvas');
    sil.width = targetW;
    sil.height = targetH;
    const sc = sil.getContext('2d');
    if (!sc) return null;

    sc.drawImage(rawImg, 0, 0, targetW, targetH);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#050609';
    sc.fillRect(0, 0, targetW, targetH);

    // 1. Hard manga drop shadow offset (+2.0px, +2.5px)
    c.drawImage(sil, pad + 2.0, pad + 2.5);

    // 2. Thick 12-way black silhouette outline (R = 3.2px matching the 3.5px card/HUD frame outline)
    const R = 3.2;
    const numAngles = 12;
    for (let i = 0; i < numAngles; i++) {
      const a = (i * Math.PI * 2) / numAngles;
      c.drawImage(sil, pad + Math.cos(a) * R, pad + Math.sin(a) * R);
    }

    // 3. Draw original crisp image over the thick black outline
    c.drawImage(rawImg, pad, pad, targetW, targetH);

    _gradeBannerOutlinedCache[cacheKey] = {
      canvas: can,
      pad: pad,
    };
    return _gradeBannerOutlinedCache[cacheKey];
  } catch (e) {
    return null;
  }
}

/**
 * Draws the top-right Winged Comic Starburst Grade Seal with grade-dependent visual special effects.
 */
export function drawWingedGradeSeal(ctx, sealCx, sealCy, grade, theme, cardIdx = 0, scale = 1.0) {
  if (!theme) {
    theme = getZeusGradeCardTheme(grade);
  }
  ctx.save();

  const phaseOffset = (cardIdx * 0.73 + sealCx * 0.04) % (Math.PI * 2);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const t = now * 0.001 + phaseOffset;

  if (scale !== 1.0) {
    ctx.translate(sealCx, sealCy);
    ctx.scale(scale, scale);
    sealCx = 0;
    sealCy = 0;
  }

  const bannerImg = getGradeBannerImage(grade);
  const isSS = grade === 'SS';
  const drawW = isSS ? 88 : (grade === 'A' ? 76 : 82);
  const imgAspect = isSS ? (284 / 203) : (grade === 'S' ? (250 / 173) : (grade === 'A' ? (226 / 186) : (239 / 174)));
  const drawH = Math.round(drawW / imgAspect);

  const drawX = Math.round(sealCx - drawW / 2);
  const drawY = Math.round(sealCy - drawH / 2);

  // ─────────────────────────────────────────────────────────────
  // 1. BACKDROP SPECIAL EFFECTS (Behind Banner Artwork)
  // ─────────────────────────────────────────────────────────────
  if (isSS) {
    _drawSSParticlesBackdrop(ctx, sealCx, sealCy, drawW, drawH, t);
  } else if (grade === 'S') {
    _drawGradeVFX_S_Backdrop(ctx, sealCx, sealCy, drawW, drawH, t);
  } else if (grade === 'A') {
    _drawGradeVFX_A_Backdrop(ctx, sealCx, sealCy, drawW, drawH, t);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MAIN BANNER IMAGE ASSET / PROCEDURAL FALLBACK
  // ─────────────────────────────────────────────────────────────
  const outlinedBanner = _getOutlinedGradeBannerCanvas(grade, drawW, drawH);
  if (outlinedBanner && outlinedBanner.canvas) {
    ctx.drawImage(outlinedBanner.canvas, drawX - outlinedBanner.pad, drawY - outlinedBanner.pad);
  } else if (bannerImg && bannerImg.complete && bannerImg.naturalWidth > 0) {
    ctx.drawImage(bannerImg, drawX, drawY, drawW, drawH);
  } else {
    // Clean procedural fallback if image asset is loading or in headless tests
    const drawStarburst = (rOuter, rInner, points, fill, stroke) => {
      const totalPts = points * 2;
      const step = (Math.PI * 2) / totalPts;
      ctx.beginPath();
      for (let i = 0; i < totalPts; i++) {
        const a = i * step - Math.PI / 2;
        const r = (i % 2 === 0) ? rOuter : rInner;
        const px = sealCx + Math.cos(a) * r;
        const py = sealCy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = '#050609';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    };
    drawStarburst(22, 14, 12, theme.burstOuter, theme.borderOuter);
    drawStarburst(16, 10, 12, theme.burstInner, theme.borderOuter);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. MIDGROUND SPECIAL EFFECTS (On Wings & Starburst Perimeter)
  // ─────────────────────────────────────────────────────────────
  if (isSS) {
    _drawSSParticlesMidground(ctx, sealCx, sealCy, drawW, drawH, t);
  } else if (grade === 'S') {
    _drawGradeVFX_S_Midground(ctx, sealCx, sealCy, drawW, drawH, t);
  } else if (grade === 'A') {
    _drawGradeVFX_A_Midground(ctx, sealCx, sealCy, drawW, drawH, t);
  } else {
    _drawGradeVFX_B_Midground(ctx, sealCx, sealCy, drawW, drawH, t);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 3D GRADE LETTER IN HOLLOW STARBURST CENTER
  // ─────────────────────────────────────────────────────────────
  const letterY = Math.round(drawY + drawH * 0.55);
  drawWingedGradeLetter(ctx, sealCx, letterY, grade, theme, cardIdx);

  ctx.restore();
}
const _drawWingedGradeSeal = drawWingedGradeSeal;

/**
 * Draws crisp anime/gacha-style 4-point diamond glint stars for S-Grade cards (Rule 2.2 compliant).
 */
function _drawShinyGoldSparkles(ctx, x, y, w, h, charCx, charCy) {
  const sparkles = [
    { x: x + w * 0.16, y: y + h * 0.36, size: 3.6, alpha: 0.90 },
    { x: x + w * 0.84, y: y + h * 0.72, size: 4.2, alpha: 0.95 },
    { x: x + w * 0.22, y: y + h * 0.76, size: 2.8, alpha: 0.80 },
    { x: x + w * 0.78, y: y + h * 0.32, size: 2.6, alpha: 0.75 },
    { x: x + w * 0.50, y: y + h * 0.20, size: 2.2, alpha: 0.85 },
  ];

  ctx.save();
  for (let i = 0; i < sparkles.length; i++) {
    const sp = sparkles[i];
    const sx = Math.round(sp.x);
    const sy = Math.round(sp.y);
    const s = sp.size;

    // Diamond flare 4-point star in luminous pale gold
    ctx.fillStyle = `rgba(255, 253, 215, ${sp.alpha})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.6);
    ctx.lineTo(sx + s * 0.42, sy);
    ctx.lineTo(sx, sy + s * 1.6);
    ctx.lineTo(sx - s * 0.42, sy);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx - s * 1.6, sy);
    ctx.lineTo(sx, sy + s * 0.42);
    ctx.lineTo(sx + s * 1.6, sy);
    ctx.lineTo(sx - s * 0.42, sy);
    ctx.closePath();
    ctx.fill();

    // Central specular white core
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx - 0.75, sy - 0.75, 1.5, 1.5);
  }
  ctx.restore();
}

/**
 * Draws the HUD Top style interior background: dark carbon with central theme radial glow and blueprint dots.
 */
function _drawHudTopCardInterior(ctx, x, y, w, h, charCx, charCy, theme, fighterColor) {
  const isGradeS = theme.grade === 'S';

  if (isGradeS) {
    // 1. Rich Obsidian Gold Carbon Base (warm deep carbon instead of cold blue-gray #0E1019)
    ctx.fillStyle = '#120E04';
    ctx.fillRect(x, y, w, h);

    // 2. Multi-stop Brilliant Solar Gold Radial Aura
    const radR = Math.max(w, h) * 0.72;
    const radGrad = ctx.createRadialGradient(charCx, charCy - 4, 2, charCx, charCy - 4, radR);
    radGrad.addColorStop(0, 'rgba(255, 253, 220, 0.94)'); // Specular hot white-gold core
    radGrad.addColorStop(0.16, 'rgba(255, 220, 30, 0.80)'); // Radiant 24k Solar Gold (#FFDC1E)
    radGrad.addColorStop(0.38, 'rgba(255, 185, 0, 0.54)'); // Deep luminous gold
    radGrad.addColorStop(0.68, 'rgba(180, 110, 0, 0.24)'); // Burnished gold perimeter
    radGrad.addColorStop(1, '#0C0A04'); // Deep obsidian gold rim
    ctx.fillStyle = radGrad;
    ctx.fillRect(x, y, w, h);

    // 3. Radiant Gold Sunburst Flare Rays behind character (crisp, elegant, ultra-shiny)
    ctx.save();
    ctx.translate(charCx, charCy - 4);
    const numRays = 12;
    const rayMaxR = radR * 0.95;
    for (let i = 0; i < numRays; i++) {
      const angle = (i * (Math.PI * 2) / numRays) + 0.12;
      const halfW = 0.082;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rayMaxR, angle - halfW, angle + halfW);
      ctx.closePath();
      const rayGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, rayMaxR);
      rayGrad.addColorStop(0, 'rgba(255, 245, 160, 0.35)');
      rayGrad.addColorStop(0.45, 'rgba(255, 210, 20, 0.16)');
      rayGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.fill();
    }
    ctx.restore();

    // 4. Subtle Concentric Golden Halo Rings
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 230, 90, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(charCx, charCy - 4, radR * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.12)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(charCx, charCy - 4, radR * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. Diagonal Metallic Specular Luster (The "Shiny Gold" sheen sweep)
    const sheenGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    sheenGrad.addColorStop(0, 'rgba(255, 245, 180, 0.05)');
    sheenGrad.addColorStop(0.38, 'rgba(255, 255, 240, 0.26)'); // Brilliant diagonal glint
    sheenGrad.addColorStop(0.46, 'rgba(255, 215, 0, 0.16)');
    sheenGrad.addColorStop(1, 'rgba(255, 200, 50, 0.02)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(x, y, w, h);

    // 6. Specular Golden Diamond Stars (✦) floating on stage
    _drawShinyGoldSparkles(ctx, x, y, w, h, charCx, charCy);

    // 7. Subtle Industrial Blueprint Dot Grid with golden tint
    ctx.fillStyle = 'rgba(255, 235, 120, 0.04)';
    const step = 14;
    for (let py = y + 4; py < y + h; py += step) {
      for (let px = x + 4; px < x + w; px += step) {
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
    return;
  }

  // Base dark carbon fill for other grades
  ctx.fillStyle = theme.bgBase || '#0E1019';
  ctx.fillRect(x, y, w, h);

  // Radial gradient: circle at (charCx, charCy - 4)
  const radR = Math.max(w, h) * 0.65;
  const radGrad = ctx.createRadialGradient(charCx, charCy - 4, 3, charCx, charCy - 4, radR);
  radGrad.addColorStop(0, theme.glowCenter || 'rgba(56, 189, 248, 0.42)');
  radGrad.addColorStop(0.55, theme.glowMid || 'rgba(30, 41, 59, 0.25)');
  radGrad.addColorStop(1, theme.bgDark || '#090B10');
  ctx.fillStyle = radGrad;
  ctx.fillRect(x, y, w, h);

  // Subtle industrial blueprint dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  const step = 14;
  for (let py = y + 4; py < y + h; py += step) {
    for (let px = x + 4; px < x + w; px += step) {
      ctx.fillRect(px, py, 1.2, 1.2);
    }
  }
}

/**
 * Draws the fighter's name directly as clean italic bold comic typography (zero container card/box).
 */
function _drawHudTopCardNameText(ctx, cardX, cardY, cardW, cardH, name) {
  ctx.save();
  const textX = cardX + 10;
  const textY = cardY + 10;
  const maxW = cardW - 52; // keep clearance from the top-right winged grade banner

  ctx.font = '900 italic 13px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const fittedName = fitSingleLineText(ctx, name, maxW);

  // Heavy black manga ink stroke & drop shadow (matching SPIKE in Top HUD)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.2;
  ctx.strokeText(fittedName, textX, textY);

  ctx.fillStyle = '#050609';
  ctx.fillText(fittedName, textX + 1.2, textY + 1.5);

  // Crisp white text fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fittedName, textX, textY);

  ctx.restore();
}

/**
 * Renders a single Collector Fighter Card using the HUD TOP FRAME architecture.
 * Features:
 *  - Signature double border (outer 3.5px #050609 + inner 1.8px #FFFFFF bevel)
 *  - Dark tactical carbon interior with vibrant character/grade radial aura
 *  - Connected HUD Top style header bar with italic comic typography
 *  - Bottom tactical spec strip with HP / Class readout
 *  - Top-Right Winged Grade Seal with special effects
 *  - Bottom-Left HUD Top corner grade badge
 */
export function drawCollectorFighterCard(ctx, def, idx, x, y, w, h, isSelected, onSelect) {
  const grade = def?.grade || 'B';
  const theme = getZeusGradeCardTheme(grade);
  const fighterColor = def?.themeColor || def?.color || theme.primary;

  ctx.save();

  // 1. HUD Top Style Solid Hard Cell Drop Shadow (2.5px 3.5px 0px #050609 + ambient shadow)
  const shadowX = x + (isSelected ? 3.0 : 2.0);
  const shadowY = y + (isSelected ? 4.0 : 2.8);
  ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.45)' : 'rgba(5, 6, 9, 0.75)';
  _traceCollectorCardPath(ctx, shadowX, shadowY, w, h, 6);
  ctx.fill();

  // 2. Clipped Card Interior
  ctx.save();
  _traceCollectorCardPath(ctx, x, y, w, h, 6);
  ctx.clip();

  const charCx = Math.round(x + w * 0.50);
  const charCy = Math.round(y + h * 0.52);

  // A. HUD Top Frame Dark Carbon Background with Radiant Center Glow
  _drawHudTopCardInterior(ctx, x, y, w, h, charCx, charCy, theme, fighterColor);

  // B. Floor Shadow Ellipse under character
  const floorShadowY = Math.round(charCy + 22 * (h / 138));
  const shadowRx = Math.round(w * 0.22);
  const shadowRy = Math.max(5, Math.round(h * 0.05));
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 9, 0.62)';
  ctx.beginPath();
  ctx.ellipse(charCx, floorShadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // C. Character Sprite Preview
  const stickerSize = Math.round(Math.min(w * 1.58, h * 1.54));
  const stickerImg = getFighterStickerPreview(idx);
  if (stickerImg) {
    ctx.drawImage(stickerImg, charCx - stickerSize / 2, charCy - stickerSize / 2, stickerSize, stickerSize);
  } else {
    const fallbackR = Math.round(21 * (w / 136));
    ctx.fillStyle = fighterColor;
    ctx.beginPath();
    ctx.arc(charCx, charCy, fallbackR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#050609';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // D. Floating Fighter Name (Clean bold italic text, zero container card)
  const rawLabel = String(def?.name || def?.type || 'FIGHTER');
  let displayName = rawLabel.includes(' - ') ? rawLabel.split(' - ')[0] : rawLabel;
  displayName = displayName.toUpperCase();
  _drawHudTopCardNameText(ctx, x, y, w, h, displayName);


  ctx.restore(); // Restore clip so borders, grade seal and corner badge pop out!

  // 3. Double Card Borders (The Signature HUD Top Profile Frame)
  // Outer Heavy Manga Border (#050609, 3.5px)
  _traceCollectorCardPath(ctx, x, y, w, h, 6);
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = isSelected ? 4.0 : 3.5;
  ctx.stroke();

  // Inner Beveled White/Highlight Outline (The Signature HUD Top Inset Stroke: inset 0 0 0 2px #FFFFFF)
  _traceCollectorCardPath(ctx, x + 2.5, y + 2.5, w - 5, h - 5, 4.5);
  if (grade === 'S') {
    const goldBevel = ctx.createLinearGradient(x, y, x + w, y + h);
    goldBevel.addColorStop(0, '#FFFDE7');
    goldBevel.addColorStop(0.30, '#FFD700');
    goldBevel.addColorStop(0.70, '#F59E0B');
    goldBevel.addColorStop(1, '#FFF59D');
    ctx.strokeStyle = isSelected ? '#FFFFFF' : goldBevel;
    ctx.lineWidth = isSelected ? 2.5 : 2.0;
  } else if (grade === 'SS') {
    const redBevel = ctx.createLinearGradient(x, y, x + w, y + h);
    redBevel.addColorStop(0, '#FFE4E6');
    redBevel.addColorStop(0.40, '#F43F5E');
    redBevel.addColorStop(1, '#FDA4AF');
    ctx.strokeStyle = isSelected ? '#FFFFFF' : redBevel;
    ctx.lineWidth = isSelected ? 2.5 : 2.0;
  } else {
    ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = isSelected ? 2.2 : 1.8;
  }
  ctx.stroke();

  // 4. Top-Right Winged Comic Grade Seal with Special Effects
  const sealCx = x + w - 24;
  const sealCy = y + 17;
  _drawWingedGradeSeal(ctx, sealCx, sealCy, grade, theme, idx);

  // 5. Active Selection Ring
  if (isSelected) {
    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 1.4;
    _traceCollectorCardPath(ctx, x + 4.5, y + 4.5, w - 9, h - 9, 3.5);
    ctx.stroke();
  }

  ctx.restore();

  if (typeof onSelect === 'function') {
    _registerButton(x, y, w, h, onSelect);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SHOWCASE MODAL BACKDROP, INDUSTRIAL HEADER & COMPACT DOSSIER BAR
// ─────────────────────────────────────────────────────────────────────────────

export function drawCollectorModalBackdrop(ctx, mx, my, modalW, modalH) {
  ctx.save();
  // Deep tactical shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.78)';
  drawChamferedRect(ctx, mx + 5, my + 6, modalW, modalH, 6);
  ctx.fill();

  // Dark Tactical Carbon Armor Base (Matches Image 2 & 3)
  ctx.fillStyle = '#12141A';
  ctx.strokeStyle = '#090A0E';
  ctx.lineWidth = 3;
  drawChamferedRect(ctx, mx, my, modalW, modalH, 6);
  ctx.fill();
  ctx.stroke();

  // Inner Tactical Hazard Frame
  ctx.save();
  drawChamferedRect(ctx, mx + 2, my + 2, modalW - 4, modalH - 4, 5);
  ctx.clip();

  // Subtle industrial blueprint dot grid
  ctx.fillStyle = 'rgba(245, 166, 35, 0.055)';
  const step = 16;
  for (let py = my + 8; py < my + modalH; py += step) {
    for (let px = mx + 8; px < mx + modalW; px += step) {
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }

  ctx.restore();

  // Inner Golden Hazard Amber Border Line
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, mx + 3, my + 3, modalW - 6, modalH - 6, 5);
  ctx.stroke();

  // Tech Corner Brackets (┌ ┐ └ ┘) in glowing Hazard Amber
  _drawCornerBrackets(ctx, mx + 6, my + 6, modalW - 12, modalH - 12, 14, '#FFD043', 2.2);

  // Technical Marking Text
  ctx.fillStyle = 'rgba(245, 166, 35, 0.40)';
  ctx.font = '900 8px "Silkscreen", "Rajdhani", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('SYS.SPEC.09 // CLASSIFIED', mx + modalW - 36, my + 6);
  ctx.restore();
}

export function drawCollectorShowcaseHeader(ctx, mx, my, modalW, slotLabel, onClose) {
  const bannerY = my + 10;
  const bannerH = 29;
  const bannerW = Math.min(modalW - 74, 320);

  ctx.save();

  // 1. Slanted Dark Carbon Badge Base
  ctx.fillStyle = '#161922';
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(mx + 6, bannerY);
  ctx.lineTo(mx + bannerW - 14, bannerY);
  ctx.lineTo(mx + bannerW, bannerY + bannerH / 2);
  ctx.lineTo(mx + bannerW - 14, bannerY + bannerH);
  ctx.lineTo(mx + 6, bannerY + bannerH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left solid hazard yellow wedge
  ctx.fillStyle = '#F5A623';
  ctx.beginPath();
  ctx.moveTo(mx + 6, bannerY);
  ctx.lineTo(mx + 14, bannerY);
  ctx.lineTo(mx + 14, bannerY + bannerH);
  ctx.lineTo(mx + 6, bannerY + bannerH);
  ctx.closePath();
  ctx.fill();

  // 2. Signature Hazard Stripe Bar along the bottom of the header badge (Image 2/3)
  drawHazardStripes(ctx, mx + 16, bannerY + bannerH - 5, bannerW - 32, 5, 5, '#F5A623', '#111216');

  // 3. Three Industrial Golden Chevrons >>>
  for (let c = 0; c < 3; c++) {
    const cx = mx + bannerW + 6 + c * 11;
    ctx.fillStyle = '#F5A623';
    ctx.beginPath();
    ctx.moveTo(cx, bannerY + 2);
    ctx.lineTo(cx + 6, bannerY + 2);
    ctx.lineTo(cx + 13, bannerY + bannerH / 2);
    ctx.lineTo(cx + 6, bannerY + bannerH - 2);
    ctx.lineTo(cx, bannerY + bannerH - 2);
    ctx.lineTo(cx + 7, bannerY + bannerH / 2);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Banner Title Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`OPERATOR SELECT // ${slotLabel}`, mx + 22, bannerY + bannerH / 2 - 2);

  // Technical Sub-Label
  ctx.fillStyle = '#F5A623';
  ctx.font = '900 7.5px "Silkscreen", "Rajdhani", monospace';
  ctx.fillText('SYS.SPEC.09', mx + 22, bannerY + bannerH / 2 + 8);

  ctx.restore();

  // Close button [✕] at top-right
  drawButton('✕', mx + modalW - 24, bannerY + bannerH / 2, onClose, 28, 26, '#20242E', 3);
}

export function drawCompactFighterDossierBar(ctx, selectedDef, weaponInfo, x, y, w, h) {
  if (!selectedDef) return;
  const theme = getFighterCollectorTheme(selectedDef);

  ctx.save();
  // Tactical Dark Carbon Dossier Container
  ctx.fillStyle = '#151820';
  ctx.strokeStyle = '#2B313E';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Left vertical hazard stripe bar (Image 2/3 signature element)
  drawHazardStripes(ctx, x + 2, y + 4, 6, h - 8, 4, '#F5A623', '#101217');

  // Tech Corner Brackets on Dossier Bar
  _drawCornerBrackets(ctx, x + 3, y + 3, w - 6, h - 6, 8, '#F5A623', 1.2);
  ctx.restore();

  // Column 1: Fighter Name, Class Pill, Form Toggle & Tactical Stat Bars
  const col1X = x + 16;
  const col1W = Math.min(182, Math.floor(w * 0.38));

  // Fighter Name in bold white + Tactical Grade Badge
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const rawName = String(selectedDef.name || selectedDef.type || 'FIGHTER').toUpperCase();
  const nameMaxW = col1W - 32;
  const fittedName = fitSingleLineText(ctx, rawName, nameMaxW);
  ctx.fillText(fittedName, col1X, y + 7);

  const measuredNameW = ctx.measureText(fittedName).width;
  drawGradeBadge(ctx, Math.min(col1X + col1W - 24, col1X + measuredNameW + 6), y + 6, selectedDef.grade, { scale: 0.82 });

  // Class Pill
  ctx.fillStyle = '#1B1E28';
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, col1X, y + 23, Math.min(col1W - 8, 110), 14, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F5A623';
  ctx.font = '900 8.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, `CLASS // ${String(selectedDef.type || selectedDef.name || 'FIGHTER').toUpperCase()}`, 104), col1X + Math.min(col1W - 8, 110) / 2, y + 30);

  // Optional form toggle (Reze / Eye of Cthulhu)
  if (selectedDef.type === 'reze') {
    const isHybrid = Boolean(state.showRezeTransformation);
    drawButton(isHybrid ? '💣 DEVIL' : '🌸 HUMAN', col1X + 140, y + 30, () => {
      state.showRezeTransformation = !state.showRezeTransformation;
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
    }, 56, 15, isHybrid ? '#B81C3B' : '#20242E', 2);
  } else if (selectedDef.type === 'eye_of_cthulhu') {
    const isP2 = Boolean(state.showEyeOfCthulhuPhase2);
    drawButton(isP2 ? '🦷 P2' : '👁️ P1', col1X + 140, y + 30, () => {
      state.showEyeOfCthulhuPhase2 = !state.showEyeOfCthulhuPhase2;
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
    }, 56, 15, isP2 ? '#E11D48' : '#20242E', 2);
  }

  // Tactical Stat Bars
  const statY = y + 43;
  drawTacticalStatBar(ctx, 'HP', selectedDef.hp, 150, col1X, statY, col1W - 6, '#EF4444');
  drawTacticalStatBar(ctx, 'DMG', selectedDef.damage, 60, col1X, statY + 15, col1W - 6, '#F5A623');
  drawTacticalStatBar(ctx, 'SPD', selectedDef.speed || 2, 4, col1X, statY + 30, col1W - 6, theme.primary);

  // Column 2: Ability & Weapon Description
  const col2X = col1X + col1W + 8;
  const col3W = 92;
  const col2W = w - (col2X - x) - col3W - 10;

  ctx.fillStyle = '#F5A623';
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, `SPEC // ${(String(selectedDef.ability || 'DEFAULT')).toUpperCase()}`, col2W), col2X, y + 8);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
  wrapText(ctx, String(selectedDef.desc || ''), col2X, y + 21, col2W, 11.5, 4);

  // Column 3: Live Weapon Containment Cell
  const col3X = x + w - col3W - 6;
  ctx.save();
  ctx.fillStyle = '#101217';
  ctx.strokeStyle = '#2B313E';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, col3X, y + 6, col3W, h - 12, 3);
  ctx.fill();
  ctx.stroke();

  _drawCornerBrackets(ctx, col3X + 2, y + 8, col3W - 4, h - 16, 5, '#F5A623', 1.0);

  ctx.fillStyle = '#F5A623';
  ctx.font = '900 8px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, String(weaponInfo?.name || 'WEAPON'), col3W - 6), col3X + col3W / 2, y + 10);

  const wStageX = col3X + col3W / 2;
  const wStageY = y + h / 2 + 8;
  ctx.fillStyle = 'rgba(245, 166, 35, 0.16)';
  ctx.beginPath();
  ctx.ellipse(wStageX, wStageY + 12, 26, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(wStageX, wStageY);
  ctx.scale(0.68, 0.68);
  drawWeaponPreview(ctx, selectedDef.type, selectedDef.color);
  ctx.restore();
}
