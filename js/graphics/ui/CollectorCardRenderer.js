import { state } from '../../core/state.js';
import { getFighterPreview, getFighterBodyOnlyPreview, getFighterStickerPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { _registerButton, drawButton, drawStatBar, drawChamferedRect, fitSingleLineText, wrapText } from './uiFramework.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawGradeBadge, getFighterGrade } from '../../configs/gradeConfig.js';
import { getFighterCardElement, drawEnergyOrb } from '../../configs/cardElementConfig.js';

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
    case 'BOSS':
      return {
        grade: 'BOSS',
        primary: '#EF4444',
        bgBase: '#360813',
        bgDark: '#1A0309',
        glowHot: 'rgba(255, 235, 238, 0.96)',
        glowCenter: 'rgba(220, 38, 38, 0.90)',
        glowMid: 'rgba(185, 28, 28, 0.75)',
        glowRim: 'rgba(153, 27, 27, 0.52)',
        glowOuter: 'rgba(127, 29, 29, 0.35)',
        sheenTint: 'rgba(254, 202, 202, 0.10)',
        sheenAccent: 'rgba(220, 38, 38, 0.20)',
        dotColor: 'rgba(252, 165, 165, 0.08)',
        halftoneDotColor: 'rgba(127, 29, 29, 0.44)',
        beamColor: 'rgba(254, 202, 202, 0.14)',
        accentBar: '#EF4444',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#7F1D1D',
        rayHighlight: '#EF4444',
        rayCore: '#FEE2E2',
        plateBg: '#1F050B',
        plateBorder: '#EF4444',
        starColor: '#EF4444',
        stars: 7,
        wingBase: '#FFFFFF',
        wingShade: '#FCA5A5',
        burstOuter: '#991B1B',
        burstInner: '#FEF2F2',
        letterFill: '#EF4444',
        ribbonFill: '#B91C1C',
        ribbonBorder: '#0A0C10',
        ribbonText: '#FFFFFF',
        sashBase: '#991B1B',
        sashHighlight: '#F87171',
        sparkle: '#FECACA',
      };
    case 'SSS':
    case 'SSR':
      // SSR - ABYSS BLACK (VOID CHARCOAL & ORBITING BLACK SMOKE) - Supreme Tier
      return {
        grade: 'SSR',
        primary: '#FFFFFF',
        bgBase: '#090A0F',
        bgDark: '#010204',
        glowHot: 'rgba(255, 255, 255, 0.90)',
        glowCenter: 'rgba(22, 25, 36, 0.75)',
        glowMid: 'rgba(14, 16, 24, 0.85)',
        glowRim: 'rgba(8, 9, 14, 0.90)',
        glowOuter: 'rgba(2, 3, 5, 0.98)',
        sheenTint: 'rgba(255, 255, 255, 0.08)',
        sheenAccent: 'rgba(255, 255, 255, 0.18)',
        dotColor: 'rgba(255, 255, 255, 0.04)',
        halftoneDotColor: 'rgba(18, 20, 30, 0.60)',
        beamColor: 'rgba(255, 255, 255, 0.04)',
        accentBar: '#FFFFFF',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#0A0B12',
        rayHighlight: '#161925',
        rayCore: '#1F2436',
        plateBg: '#08090D',
        plateBorder: '#FFFFFF',
        starColor: '#FFFFFF',
        stars: 7,
        wingBase: '#FFFFFF',
        wingShade: '#CBD5E1',
        burstOuter: '#050609',
        burstInner: '#12141F',
        letterFill: '#FFFFFF',
        ribbonFill: '#0D0E15',
        ribbonBorder: '#FFFFFF',
        ribbonText: '#FFFFFF',
        sashBase: '#090A0F',
        sashHighlight: '#FFFFFF',
        sparkle: '#FFFFFF',
      };
    case 'SS':
      // SS - RED (Dark Crimson Red / Blood Phoenix) - Dramatic & Intense
      return {
        grade: 'SS',
        primary: '#DC2626',
        bgBase: '#360813',
        bgDark: '#1A0309',
        glowHot: 'rgba(255, 235, 238, 0.96)',
        glowCenter: 'rgba(220, 38, 38, 0.90)',
        glowMid: 'rgba(185, 28, 28, 0.75)',
        glowRim: 'rgba(153, 27, 27, 0.52)',
        glowOuter: 'rgba(127, 29, 29, 0.35)',
        sheenTint: 'rgba(254, 202, 202, 0.10)',
        sheenAccent: 'rgba(220, 38, 38, 0.20)',
        dotColor: 'rgba(252, 165, 165, 0.08)',
        halftoneDotColor: 'rgba(127, 29, 29, 0.44)',
        beamColor: 'rgba(254, 202, 202, 0.14)',
        accentBar: '#DC2626',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#7F1D1D',
        rayHighlight: '#EF4444',
        rayCore: '#FEE2E2',
        plateBg: '#1F050B',
        plateBorder: '#DC2626',
        starColor: '#FFD700',
        stars: 6,
        wingBase: '#FFFFFF',
        wingShade: '#FCA5A5',
        burstOuter: '#991B1B',
        burstInner: '#FEF2F2',
        letterFill: '#DC2626',
        ribbonFill: '#B91C1C',
        ribbonBorder: '#0A0C10',
        ribbonText: '#FFFFFF',
        sashBase: '#991B1B',
        sashHighlight: '#F87171',
        sparkle: '#FECACA',
      };
    case 'S':
      // S - GOLD (The Zeus Radiant 24K Solar Master) - Warm, Bright & Lustrous
      return {
        grade: 'S',
        primary: '#FFD700',
        glowHot: 'rgba(255, 254, 235, 1.0)',
        glowCenter: 'rgba(255, 225, 45, 0.95)',
        glowMid: 'rgba(245, 180, 0, 0.82)',
        glowRim: 'rgba(217, 119, 6, 0.60)',
        glowOuter: 'rgba(180, 83, 9, 0.38)',
        bgBase: '#382706',
        bgDark: '#221703',
        sheenTint: 'rgba(255, 245, 180, 0.10)',
        sheenAccent: 'rgba(255, 215, 0, 0.22)',
        dotColor: 'rgba(255, 235, 120, 0.07)',
        halftoneDotColor: 'rgba(217, 119, 6, 0.44)',
        beamColor: 'rgba(255, 255, 230, 0.22)',
        accentBar: '#FFD700',
        borderOuter: '#050609',
        borderInner: '#FFD700',
        rayBase: '#D97706',
        rayHighlight: '#FFF59D',
        rayCore: '#FFFDF0',
        plateBg: '#2A1D05',
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
      // A - PURPLE (Amethyst / Royal Violet) - Slightly Dark Purple
      return {
        grade: 'A',
        primary: '#7C3AED',
        bgBase: '#260A3D',
        bgDark: '#140422',
        glowHot: 'rgba(245, 235, 255, 0.96)',
        glowCenter: 'rgba(124, 58, 237, 0.90)',
        glowMid: 'rgba(109, 40, 217, 0.75)',
        glowRim: 'rgba(91, 33, 182, 0.52)',
        glowOuter: 'rgba(76, 29, 149, 0.35)',
        sheenTint: 'rgba(233, 213, 255, 0.10)',
        sheenAccent: 'rgba(124, 58, 237, 0.20)',
        dotColor: 'rgba(216, 180, 254, 0.08)',
        halftoneDotColor: 'rgba(76, 29, 149, 0.44)',
        beamColor: 'rgba(233, 213, 255, 0.14)',
        accentBar: '#7C3AED',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#581C87',
        rayHighlight: '#A855F7',
        rayCore: '#FAF5FF',
        plateBg: '#170526',
        plateBorder: '#7C3AED',
        starColor: '#E9D5FF',
        stars: 4,
        wingBase: '#FFFFFF',
        wingShade: '#D8B4FE',
        burstOuter: '#6B21A8',
        burstInner: '#FAF5FF',
        letterFill: '#8B5CF6',
        ribbonFill: '#7C3AED',
        ribbonBorder: '#0A0C10',
        ribbonText: '#FFFFFF',
        sashBase: '#6D28D9',
        sashHighlight: '#C4B5FD',
        sparkle: '#DDD6FE',
      };
    case 'B':
    default:
      // B - GREEN (Emerald / Jade / Mint) - Vibrant, Bright & Luminous
      return {
        grade: 'B',
        primary: '#10B981',
        bgBase: '#144630',
        bgDark: '#0B2B1D',
        glowHot: 'rgba(240, 255, 250, 1.0)',
        glowCenter: 'rgba(16, 185, 129, 0.95)',
        glowMid: 'rgba(16, 185, 129, 0.82)',
        glowRim: 'rgba(5, 150, 105, 0.60)',
        glowOuter: 'rgba(4, 120, 87, 0.38)',
        sheenTint: 'rgba(215, 255, 238, 0.12)',
        sheenAccent: 'rgba(16, 185, 129, 0.22)',
        dotColor: 'rgba(175, 250, 220, 0.08)',
        halftoneDotColor: 'rgba(6, 95, 70, 0.38)',
        beamColor: 'rgba(255, 255, 255, 0.15)',
        accentBar: '#10B981',
        borderOuter: '#050609',
        borderInner: '#FFFFFF',
        rayBase: '#047857',
        rayHighlight: '#34D399',
        rayCore: '#ECFDF5',
        plateBg: '#0B2A1D',
        plateBorder: '#10B981',
        starColor: '#6EE7B7',
        stars: 3,
        wingBase: '#FFFFFF',
        wingShade: '#A7F3D0',
        burstOuter: '#047857',
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
  SSR: null,
};

export function getGradeBannerImage(grade = 'B') {
  const g = String(grade || 'B').toUpperCase();
  const validKey = ['A', 'B', 'S', 'SS', 'SSR'].includes(g) ? g : 'B';
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
  ['A', 'B', 'S', 'SS', 'SSR'].forEach(getGradeBannerImage);
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
  const coronaR = Math.min(drawW * 0.44 + pulse * 6, (drawH || drawW) * 0.45);
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

// ── TIER 5: GRADE SSR VFX (Particle effects on SSR banner removed per user request) ──

function _drawGradeVFX_SSR_Backdrop(ctx, cx, cy, drawW, drawH, t) {
  // Particle effects on SSR banner intentionally removed per user request
}

function _drawGradeVFX_SSR_Midground(ctx, cx, cy, drawW, drawH, t) {
  // Particle effects on SSR banner intentionally removed per user request
}

/**
 * Draws a flowing specular gleam directly ONTO the letter glyphs
 * via ctx.fillText(grade, letterX, letterY) — zero rect clipping, zero cropping!
 */
function _drawGradeLetterGlintOnText(ctx, letterX, letterY, grade, t) {
  const isSSR = grade === 'SSR' || grade === 'SSS';
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
  } else if (isSSR) {
    // ── SSR: Sweeping specular iridescent SHINY RAINBOW gleam across "SSR" ──
    const cycle = (t * 0.55) % 1.0;
    if (cycle < 0.42) {
      const cp = cycle / 0.42;
      const gx = letterX - 28 + cp * 56;
      const grad = ctx.createLinearGradient(gx - 16, letterY - 14, gx + 16, letterY + 14);
      grad.addColorStop(0.00, 'rgba(255, 46, 116, 0)');
      grad.addColorStop(0.18, 'rgba(255, 46, 116, 0.90)'); // Vivid Rose Ruby
      grad.addColorStop(0.36, 'rgba(255, 170, 0, 0.90)');  // Radiant Solar Amber
      grad.addColorStop(0.50, 'rgba(255, 255, 255, 0.98)'); // Specular Incandescent Core
      grad.addColorStop(0.64, 'rgba(0, 229, 255, 0.92)');  // Electric Cyan
      grad.addColorStop(0.82, 'rgba(176, 56, 255, 0.90)'); // Celestial Amethyst
      grad.addColorStop(1.00, 'rgba(176, 56, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillText(grade, letterX, letterY);

      // Specular diamond sparkle riding the rainbow gleam with dynamic chromatic flare
      const gleamAlpha = Math.sin(cp * Math.PI);
      if (gleamAlpha > 0.22) {
        const starHue = (t * 4.0) % (Math.PI * 2);
        const starColor = `hsl(${Math.round((starHue / (Math.PI * 2)) * 360)}, 100%, 75%)`;
        _drawRotatedComicSparkle(
          ctx,
          gx,
          letterY,
          5.4 * gleamAlpha,
          t * 3.2,
          starColor,
          `rgba(255, 255, 255, ${gleamAlpha})`
        );
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
  const isSSRGrade = grade === 'SSR' || grade === 'SSS';
  // Uniform font size for ALL grade letters (exact same size as SSR)
  const fontSize = 20.5;

  // Effect bounding dimensions:
  // When includeGradeEffects is enabled on constrained canvas surfaces (such as the Top HUD grade canvas),
  // effects (radial aura coronas, compression rings, orbiting particles) must gracefully fade to 100%
  // transparency BEFORE reaching the canvas edges to completely eliminate hard rectangular edge clipping.
  let maxSafeR = 40;
  if (ctx && ctx.canvas && typeof ctx.canvas.width === 'number' && typeof ctx.canvas.height === 'number') {
    const leftMargin = letterX;
    const rightMargin = ctx.canvas.width - letterX;
    const topMargin = letterY;
    const botMargin = ctx.canvas.height - letterY;
    const minMargin = Math.min(leftMargin, rightMargin, topMargin, botMargin);
    if (minMargin > 0) {
      maxSafeR = Math.max(22, minMargin - 6);
    }
  }

  // Base effect dimensions scaled to comfortably frame the letter without ever exceeding the canvas safe boundary
  const baseW = isSSRGrade ? 24 : (grade === 'BOSS' ? 28 : 22);
  const baseH = isSSRGrade ? 18 : 16;
  const rawEffW = baseW * scale;
  const rawEffH = baseH * scale;
  const effW = Math.min(rawEffW, maxSafeR * 1.50);
  const effH = Math.min(rawEffH, maxSafeR * 1.15);

  if (includeGradeEffects) {
    if (isSSRGrade) {
      // Particle effects on SSR banner intentionally removed per user request
    } else if (grade === 'SS') {
      _drawSSParticlesBackdrop(ctx, letterX, letterY, effW, effH, t);
    } else if (grade === 'S') {
      _drawGradeVFX_S_Backdrop(ctx, letterX, letterY, effW, effH, t);
    } else if (grade === 'A') {
      _drawGradeVFX_A_Backdrop(ctx, letterX, letterY, effW, effH, t);
    }
  }

  ctx.save();
  ctx.translate(letterX, letterY);
  ctx.scale(scale, scale);
  ctx.font = `900 ${fontSize}px "Impact", "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ── ALL GRADE LETTERS: SOLID BLACK MANGA INK OUTLINE JUST LIKE SSR ──
  // 1. Heavy Solid Black Outer Manga Outline (High-contrast separation against any card background)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 5.2;
  ctx.lineJoin = 'round';
  ctx.strokeText(grade, 0, 0);

  // 2. Letter Fill
  if (isSSRGrade) {
    // Animated Flowing Shiny Rainbow Font Color (Letter Fill for SSR/SSS)
    const rainbowAngle = t * 2.4;
    const rCos = Math.cos(rainbowAngle);
    const rSin = Math.sin(rainbowAngle);
    const rDiag = 24;
    const textRainbow = ctx.createLinearGradient(
      -rCos * rDiag, -rSin * rDiag,
      rCos * rDiag, rSin * rDiag
    );
    textRainbow.addColorStop(0.00, '#FF2E74'); // Vivid Rose Ruby
    textRainbow.addColorStop(0.18, '#FF8A00'); // Radiant Orange
    textRainbow.addColorStop(0.36, '#FFEA00'); // Solar Gold Yellow
    textRainbow.addColorStop(0.52, '#00FF9D'); // Electric Emerald Green
    textRainbow.addColorStop(0.70, '#00D8FF'); // Bright Cyan
    textRainbow.addColorStop(0.86, '#B038FF'); // Neon Purple
    textRainbow.addColorStop(1.00, '#FF2E74'); // Wrap

    ctx.fillStyle = textRainbow;
    ctx.fillText(grade, 0, 0);
  } else {
    // Pure vibrant grade fill (SS, S, A, B, BOSS)
    ctx.fillStyle = theme.letterFill || '#FFFFFF';
    ctx.fillText(grade, 0, 0);
  }

  // 3. Crisp Black Inner Separation Stroke (Just like SSR: cleanly defines and separates letter glyphs)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.strokeText(grade, 0, 0);

  _drawGradeLetterGlintOnText(ctx, 0, 0, grade, t);
  ctx.restore();

  if (includeGradeEffects) {
    if (isSSRGrade) {
      // Particle effects on SSR banner intentionally removed per user request
    } else if (grade === 'SS') {
      _drawSSParticlesMidground(ctx, letterX, letterY, effW, effH, t);
    } else if (grade === 'S') {
      _drawGradeVFX_S_Midground(ctx, letterX, letterY, effW, effH, t);
    } else if (grade === 'A') {
      _drawGradeVFX_A_Midground(ctx, letterX, letterY, effW, effH, t);
    } else {
      _drawGradeVFX_B_Midground(ctx, letterX, letterY, effW, effH, t);
    }
  }
}

const _gradeBannerOutlinedCache = {};

function _getOutlinedGradeBannerCanvas(grade, targetW, targetH) {
  const g = String(grade || 'B').toUpperCase();
  const validKey = ['A', 'B', 'S', 'SS', 'SSR'].includes(g) ? g : 'B';
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
  const isSSR = grade === 'SSR';
  const isSS = grade === 'SS';
  const drawW = isSSR ? 92 : (isSS ? 88 : (grade === 'A' ? 76 : 82));
  const imgAspect = isSSR ? (600 / 448) : (isSS ? (284 / 203) : (grade === 'S' ? (250 / 173) : (grade === 'A' ? (226 / 186) : (239 / 174))));
  const drawH = Math.round(drawW / imgAspect);

  const drawX = Math.round(sealCx - drawW / 2);
  const drawY = Math.round(sealCy - drawH / 2);

  // ─────────────────────────────────────────────────────────────
  // 1. BACKDROP SPECIAL EFFECTS (Behind Banner Artwork)
  // ─────────────────────────────────────────────────────────────
  if (isSSR) {
    // Particle effects on SSR banner intentionally removed per user request
  } else if (isSS) {
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
  if (isSSR) {
    // Particle effects on SSR banner intentionally removed per user request
  } else if (isSS) {
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
  const letterY = Math.round(drawY + drawH * (isSSR ? 0.54 : 0.55));
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
 * Draws the fiery ember slivers, floating glowing cinder motes, and crimson/gold sparkles
 * across the SS Card stage, matching the SS Grade Banner visual effects standard.
 */
function _drawSSCardStageEffects(ctx, x, y, w, h, charCx, charCy, t) {
  ctx.save();

  // 1. Razor-Sharp Intimidating Ember Slivers (10 slivers rising across card stage)
  const slivers = [
    { relX: 0.14, relY: 0.72, ang: -0.28, len: 6.2, w: 2.0, ph: 0.00, dark: false },
    { relX: 0.86, relY: 0.68, ang:  0.28, len: 6.2, w: 2.0, ph: 0.50, dark: false },
    { relX: 0.22, relY: 0.84, ang: -0.18, len: 5.4, w: 1.8, ph: 0.25, dark: true  },
    { relX: 0.78, relY: 0.82, ang:  0.22, len: 5.4, w: 1.8, ph: 0.75, dark: true  },
    { relX: 0.32, relY: 0.76, ang: -0.14, len: 5.8, w: 1.9, ph: 0.15, dark: false },
    { relX: 0.68, relY: 0.74, ang:  0.16, len: 5.8, w: 1.9, ph: 0.65, dark: false },
    { relX: 0.12, relY: 0.45, ang: -0.32, len: 5.0, w: 1.6, ph: 0.35, dark: true  },
    { relX: 0.88, relY: 0.48, ang:  0.30, len: 5.0, w: 1.6, ph: 0.85, dark: false },
    { relX: 0.40, relY: 0.88, ang: -0.08, len: 4.8, w: 1.6, ph: 0.45, dark: false },
    { relX: 0.60, relY: 0.86, ang:  0.10, len: 4.8, w: 1.6, ph: 0.95, dark: true  },
  ];

  for (let i = 0; i < slivers.length; i++) {
    const s = slivers[i];
    const cycle = (t * 0.72 + s.ph) % 1.0;
    const rise = cycle * (h * 0.48);
    const sway = Math.sin(cycle * Math.PI * 2 + i * 1.3) * 3.2;
    const px = x + s.relX * w + sway;
    const py = y + s.relY * h - rise;
    const alpha = Math.sin(cycle * Math.PI) * 0.92;

    if (alpha > 0.08) {
      const scale = 0.75 + Math.sin(cycle * Math.PI) * 0.35;
      _drawSharpEmberSliver(ctx, px, py, s.len * scale, s.w * scale, s.ang + sway * 0.05, alpha, s.dark);
    }
  }

  // 2. Floating Glowing Cinder Motes (14 fine embers drifting upward across card)
  const numMotes = 14;
  for (let i = 0; i < numMotes; i++) {
    const p = (t * 0.58 + i * (1 / numMotes)) % 1.0;
    const relX = 0.12 + ((i * 0.17) % 0.76);
    const mx = x + relX * w + Math.sin(t * 2.4 + i * 1.8) * 3.5;
    const my = y + h * 0.88 - p * (h * 0.78);
    const mAlpha = Math.sin(p * Math.PI) * 0.88;

    if (mAlpha > 0.06) {
      const r = 1.0 + Math.sin(p * Math.PI) * 0.9;
      // Soft crimson-orange cinder halo
      ctx.fillStyle = `rgba(239, 68, 68, ${mAlpha * 0.36})`;
      ctx.beginPath();
      ctx.arc(mx, my, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Incandescent gold/orange pinpoint core
      ctx.fillStyle = (i % 3 === 0)
        ? `rgba(254, 240, 138, ${mAlpha})`
        : `rgba(255, 120, 40, ${mAlpha})`;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Crisp 4-Point Crimson/Gold Star Glints
  const glints = [
    { rx: 0.16, ry: 0.28, phase: 0.00 },
    { rx: 0.84, ry: 0.32, phase: 0.50 },
    { rx: 0.18, ry: 0.75, phase: 0.25 },
    { rx: 0.82, ry: 0.78, phase: 0.75 },
    { rx: 0.50, ry: 0.16, phase: 0.40 },
  ];
  for (let i = 0; i < glints.length; i++) {
    const g = glints[i];
    const gAlpha = Math.max(0, Math.sin(t * 2.8 + g.phase * Math.PI * 2));
    if (gAlpha > 0.18) {
      _drawRotatedComicSparkle(
        ctx,
        x + g.rx * w,
        y + g.ry * h,
        4.5 * gAlpha,
        t * 1.8,
        `rgba(220, 38, 38, ${gAlpha})`,
        `rgba(255, 245, 210, ${gAlpha * 0.95})`
      );
    }
  }

  ctx.restore();
}

/**
/**
 * Draws drifting abyss smoke plumes, void ash wisps, and subtle silver diamond stardust
 * across the SSR Card stage in the deep abyss void (Zero gold glow).
 */
function _drawSSRCardStageEffects(ctx, x, y, w, h, charCx, charCy, t) {
  ctx.save();

  // 1. Drifting Dark Void Smoke Wisps & Ash Plumes rising through the abyss
  const wisps = [
    { relX: 0.12, relY: 0.74, r: 7.2, ph: 0.00 },
    { relX: 0.88, relY: 0.70, r: 7.5, ph: 0.50 },
    { relX: 0.20, relY: 0.86, r: 6.2, ph: 0.25 },
    { relX: 0.80, relY: 0.84, r: 6.4, ph: 0.75 },
    { relX: 0.30, relY: 0.78, r: 6.8, ph: 0.15 },
    { relX: 0.70, relY: 0.76, r: 6.6, ph: 0.65 },
    { relX: 0.10, relY: 0.44, r: 5.6, ph: 0.35 },
    { relX: 0.90, relY: 0.46, r: 5.8, ph: 0.85 },
  ];

  for (let i = 0; i < wisps.length; i++) {
    const s = wisps[i];
    const cycle = (t * 0.55 + s.ph) % 1.0;
    const rise = cycle * (h * 0.48);
    const sway = Math.sin(cycle * Math.PI * 2 + i * 1.5) * 4.0;
    const px = x + s.relX * w + sway;
    const py = y + s.relY * h - rise;
    const alpha = Math.sin(cycle * Math.PI) * 0.75;

    if (alpha > 0.05) {
      const curR = s.r * (0.8 + cycle * 0.5);
      const smokeGrad = ctx.createRadialGradient(px, py, curR * 0.1, px, py, curR);
      smokeGrad.addColorStop(0, `rgba(4, 5, 8, ${alpha * 0.85})`);
      smokeGrad.addColorStop(0.5, `rgba(18, 22, 32, ${alpha * 0.50})`);
      smokeGrad.addColorStop(1, 'rgba(10, 12, 16, 0)');
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(px, py, curR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Rising Fine Void Ash Motes (Monochrome / Silver, Zero Gold)
  const numMotes = 14;
  for (let i = 0; i < numMotes; i++) {
    const p = (t * 0.50 + i * (1 / numMotes)) % 1.0;
    const relX = 0.10 + ((i * 0.17) % 0.80);
    const mx = x + relX * w + Math.sin(t * 2.0 + i * 1.6) * 3.0;
    const my = y + h * 0.90 - p * (h * 0.82);
    const mAlpha = Math.sin(p * Math.PI) * 0.80;

    if (mAlpha > 0.05) {
      const r = 0.9 + Math.sin(p * Math.PI) * 0.8;
      // Charcoal ash halo
      ctx.fillStyle = `rgba(10, 12, 18, ${mAlpha * 0.60})`;
      ctx.beginPath();
      ctx.arc(mx, my, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Faint platinum-silver ash pinpoint (zero gold)
      ctx.fillStyle = (i % 2 === 0)
        ? `rgba(255, 255, 255, ${mAlpha * 0.85})`
        : `rgba(180, 195, 220, ${mAlpha * 0.70})`;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Crisp Silver Diamond Starlight Glints (✦) (Pure Platinum / Ice-White, Zero Gold)
  const glints = [
    { rx: 0.15, ry: 0.26, phase: 0.00 },
    { rx: 0.85, ry: 0.30, phase: 0.50 },
    { rx: 0.16, ry: 0.76, phase: 0.25 },
    { rx: 0.84, ry: 0.78, phase: 0.75 },
    { rx: 0.50, ry: 0.14, phase: 0.40 },
    { rx: 0.50, ry: 0.86, phase: 0.60 },
  ];
  for (let i = 0; i < glints.length; i++) {
    const g = glints[i];
    const gAlpha = Math.max(0, Math.sin(t * 2.6 + g.phase * Math.PI * 2));
    if (gAlpha > 0.18) {
      _drawRotatedComicSparkle(
        ctx,
        x + g.rx * w,
        y + g.ry * h,
        4.6 * gAlpha,
        t * 1.8,
        `rgba(255, 255, 255, ${gAlpha * 0.90})`,
        `rgba(240, 245, 255, ${gAlpha})`
      );
    }
  }

  ctx.restore();
}

/**
 * Draws the authentic Comic Halftone Ben Day polka dot pattern and static action flare streaks
 * matching the pop-art comic card reference.
 */
function _drawComicHalftoneTexture(ctx, x, y, w, h, theme) {
  ctx.save();

  // 1. Static Comic Action Rays / Fan Streaks (originating from left-flank)
  const originX = x - w * 0.08;
  const originY = y + h * 0.34;
  const beamAngles = [-0.68, -0.40, -0.12, 0.16, 0.44, 0.72];
  const maxR = Math.hypot(w, h) * 1.35;
  const beamColor = theme.beamColor || 'rgba(255, 255, 255, 0.15)';

  ctx.fillStyle = beamColor;
  for (let i = 0; i < beamAngles.length; i++) {
    const ang = beamAngles[i];
    const halfW = 0.085;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.arc(originX, originY, maxR, ang - halfW, ang + halfW);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Comic Halftone / Ben Day Polka Dots (staggered offset circular grid)
  const stepX = 11.5;
  const stepY = 10.0;
  const dotR = 2.4;
  const dotColor = theme.halftoneDotColor || 'rgba(0, 0, 0, 0.22)';

  ctx.fillStyle = dotColor;
  ctx.beginPath();
  let row = 0;
  for (let py = y + 4; py < y + h - 2; py += stepY) {
    const offsetX = (row % 2 === 1) ? stepX * 0.5 : 0;
    for (let px = x + 4 + offsetX; px < x + w - 2; px += stepX) {
      ctx.moveTo(px + dotR, py);
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
    }
    row++;
  }
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the HUD Top style interior background: dark carbon with central theme radial glow,
 * comic action streaks, and Ben Day halftone dots.
 */
function _drawHudTopCardInterior(ctx, x, y, w, h, charCx, charCy, theme, fighterColor) {
  const isGradeSSR = theme.grade === 'SSR';
  const isGradeS = theme.grade === 'S';

  if (isGradeSSR) {
    // 1. Bottom-to-Middle Fade-Out Gradient:
    // Instead of filling the card with solid color, renders an abyss dark gradient starting from the bottom of the card
    // that smoothly fades out to 0 opacity at the middle part of the card (top half remains transparent).
    const bottomGrad = ctx.createLinearGradient(x, y + h, x, y);
    bottomGrad.addColorStop(0.00, '#040508');                  // Bottom of card: deep solid abyss black
    bottomGrad.addColorStop(0.18, 'rgba(6, 7, 11, 0.94)');     // Lower zone: rich abyss charcoal
    bottomGrad.addColorStop(0.34, 'rgba(12, 14, 22, 0.60)');   // Lower-mid: smooth smoky transition
    bottomGrad.addColorStop(0.44, 'rgba(16, 20, 30, 0.20)');   // Feathered transition
    bottomGrad.addColorStop(0.50, 'rgba(10, 12, 18, 0.00)');   // Middle part of card: fully faded out
    bottomGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0.00)');      // Upper card: completely transparent
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(x, y, w, h);
    return;
  }

  if (isGradeS) {
    // 1. Rich Warm Solar Gold Base
    const baseGrad = ctx.createLinearGradient(x, y, x, y + h);
    baseGrad.addColorStop(0, theme.bgBase || '#382706');
    baseGrad.addColorStop(1, theme.bgDark || '#221703');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x, y, w, h);

    // 2. Multi-stop Brilliant Solar Gold Radial Aura
    const radR = Math.max(w, h) * 0.95;
    const radGrad = ctx.createRadialGradient(charCx, charCy - 4, 2, charCx, charCy - 4, radR);
    radGrad.addColorStop(0, 'rgba(255, 254, 235, 1.0)'); // Specular hot white-gold core
    radGrad.addColorStop(0.18, 'rgba(255, 225, 45, 0.95)'); // Radiant 24k Solar Gold (#FFDC1E)
    radGrad.addColorStop(0.46, 'rgba(245, 180, 0, 0.82)'); // Deep luminous gold
    radGrad.addColorStop(0.74, 'rgba(217, 119, 6, 0.58)'); // Burnished gold perimeter
    radGrad.addColorStop(1, theme.glowOuter || '#221703'); // Rich warm gold rim
    ctx.fillStyle = radGrad;
    ctx.fillRect(x, y, w, h);

    // 3. Comic Halftone Texture: Action Flare Rays + Amber Ben Day Dots
    _drawComicHalftoneTexture(ctx, x, y, w, h, theme);

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
    sheenGrad.addColorStop(0, 'rgba(255, 245, 180, 0.08)');
    sheenGrad.addColorStop(0.35, 'rgba(255, 255, 240, 0.30)'); // Brilliant diagonal glint
    sheenGrad.addColorStop(0.48, 'rgba(255, 215, 0, 0.20)');
    sheenGrad.addColorStop(1, 'rgba(255, 200, 50, 0.04)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(x, y, w, h);

    // 6. Specular Golden Diamond Stars (✦) floating on stage
    _drawShinyGoldSparkles(ctx, x, y, w, h, charCx, charCy);
    return;
  }

  // Base rich vibrant gradient fill for all cards (SS, A, B, and custom)
  const baseGrad = ctx.createLinearGradient(x, y, x, y + h);
  baseGrad.addColorStop(0, theme.bgBase || '#263147');
  baseGrad.addColorStop(1, theme.bgDark || '#141B28');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(x, y, w, h);

  // Multi-stop brilliant radiant aura: circle at (charCx, charCy - 2)
  const radR = Math.max(w, h) * 0.96;
  const radGrad = ctx.createRadialGradient(charCx, charCy - 2, 2, charCx, charCy - 2, radR);
  radGrad.addColorStop(0, theme.glowHot || 'rgba(255, 255, 255, 1.0)'); // Specular hot core
  radGrad.addColorStop(0.22, theme.glowCenter || 'rgba(56, 189, 248, 0.95)'); // Saturated primary color
  radGrad.addColorStop(0.50, theme.glowMid || 'rgba(30, 41, 59, 0.82)'); // Luminous mid tone
  radGrad.addColorStop(0.76, theme.glowRim || 'rgba(15, 23, 42, 0.58)'); // Vibrant outer zone
  radGrad.addColorStop(1, theme.glowOuter || theme.bgDark || '#141B28'); // Deep colorful rim at perimeter
  ctx.fillStyle = radGrad;
  ctx.fillRect(x, y, w, h);

  // Comic Halftone Texture: Action Flare Rays + Staggered Ben Day Dots
  _drawComicHalftoneTexture(ctx, x, y, w, h, theme);

  // Diagonal Metallic Specular Luster (The Sheen Sweep)
  const sheenGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  sheenGrad.addColorStop(0, theme.sheenTint || 'rgba(255, 255, 255, 0.10)');
  sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.28)'); // Brilliant diagonal glint
  sheenGrad.addColorStop(0.48, theme.sheenAccent || 'rgba(255, 255, 255, 0.20)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(x, y, w, h);
}

/**
 * Draws the fighter's name directly as clean italic bold comic typography in the BOTTOM CENTER of the card.
 */
function _drawHudTopCardNameText(ctx, cardX, cardY, cardW, cardH, name) {
  ctx.save();
  const textX = Math.round(cardX + cardW * 0.50);
  const textY = Math.round(cardY + cardH - 8);
  const maxW = cardW - 16; // full width clearance from card borders

  ctx.font = '900 italic 13px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const fittedName = fitSingleLineText(ctx, name, maxW);

  // Heavy black manga ink stroke & drop shadow (matching comic title typography)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.4;
  ctx.lineJoin = 'round';
  ctx.strokeText(fittedName, textX, textY);

  ctx.fillStyle = '#050609';
  ctx.fillText(fittedName, textX + 1.0, textY + 1.2);

  // Crisp white text fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fittedName, textX, textY);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 16-BIT RETRO POKÉMON-STYLE COLLECTOR CARD ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws floating 4-point rotating starlight holo sparkles across the Pokemon card stage.
 */
function _drawPokemonHoloSparkles(ctx, x, y, w, h, charCx, charCy, t, element) {
  const glints = [
    { rx: 0.16, ry: 0.28, phase: 0.00, size: 3.4 },
    { rx: 0.84, ry: 0.32, phase: 0.45, size: 3.8 },
    { rx: 0.18, ry: 0.62, phase: 0.25, size: 3.0 },
    { rx: 0.82, ry: 0.66, phase: 0.70, size: 3.2 },
  ];

  for (let i = 0; i < glints.length; i++) {
    const g = glints[i];
    const alpha = Math.max(0, Math.sin(t * 2.5 + g.phase * Math.PI * 2));
    if (alpha > 0.15) {
      _drawRotatedComicSparkle(
        ctx,
        x + g.rx * w,
        y + g.ry * h,
        g.size * alpha,
        t * 1.5 + g.phase,
        element.accent || '#FFFFFF',
        '#FFFFFF'
      );
    }
  }
}

/**
 * Returns the grade-based palette configuration for the 16-Bit Pokémon card background:
 *  - Grade B: Emerald Green
 *  - Grade A: Royal Purple / Amethyst
 *  - Grade S: Radiant 24K Solar Gold
 *  - Grade SS: Dark Crimson / Scarlet Flame
 *  - Grade SSR: Abyss Void / Celestial Platinum
 */
export function getGradeCardBackground(grade = 'B') {
  const g = String(grade || 'B').toUpperCase();
  switch (g) {
    case 'SSR':
      return {
        grade: 'SSR',
        name: 'Abyss Platinum',
        bgGrad: ['#141724', '#090B12', '#020306'],
        radialCore: 'rgba(255, 255, 255, 0.52)',
        radialMid: 'rgba(203, 213, 225, 0.32)',
        radialOuter: 'rgba(51, 65, 85, 0.20)',
        scanline: 'rgba(255, 255, 255, 0.05)',
        hasShine: true,
        shineHalo: 'rgba(255, 255, 255, 0.14)',
        shineAccent: 'rgba(203, 213, 225, 0.40)',
        shineCore: 'rgba(255, 255, 255, 0.95)',
        shineSecondary: 'rgba(226, 232, 240, 0.45)',
      };
    case 'SS':
      return {
        grade: 'SS',
        name: 'Crimson Flame',
        bgGrad: ['#450915', '#29040C', '#120105'],
        radialCore: 'rgba(254, 202, 202, 0.55)',
        radialMid: 'rgba(239, 68, 68, 0.42)',
        radialOuter: 'rgba(153, 27, 27, 0.20)',
        scanline: 'rgba(248, 113, 113, 0.04)',
        hasShine: true,
        shineHalo: 'rgba(254, 202, 202, 0.12)',
        shineAccent: 'rgba(239, 68, 68, 0.40)',
        shineCore: 'rgba(255, 241, 242, 0.92)',
        shineSecondary: 'rgba(254, 202, 202, 0.40)',
      };
    case 'S':
      return {
        grade: 'S',
        name: 'Radiant Gold',
        bgGrad: ['#3E2A06', '#271A03', '#140C01'],
        radialCore: 'rgba(254, 240, 138, 0.58)',
        radialMid: 'rgba(245, 158, 11, 0.42)',
        radialOuter: 'rgba(180, 83, 9, 0.20)',
        scanline: 'rgba(253, 224, 71, 0.045)',
        hasShine: true,
        shineHalo: 'rgba(254, 240, 138, 0.14)',
        shineAccent: 'rgba(245, 158, 11, 0.42)',
        shineCore: 'rgba(255, 254, 235, 0.95)',
        shineSecondary: 'rgba(254, 240, 138, 0.45)',
      };
    case 'A':
      return {
        grade: 'A',
        name: 'Royal Purple',
        bgGrad: ['#280C44', '#18062B', '#0B0215'],
        radialCore: 'rgba(233, 213, 255, 0.52)',
        radialMid: 'rgba(168, 85, 247, 0.40)',
        radialOuter: 'rgba(109, 40, 217, 0.18)',
        scanline: 'rgba(192, 132, 252, 0.04)',
        hasShine: true,
        shineHalo: 'rgba(216, 180, 254, 0.12)',
        shineAccent: 'rgba(168, 85, 247, 0.38)',
        shineCore: 'rgba(250, 245, 255, 0.92)',
        shineSecondary: 'rgba(233, 213, 255, 0.40)',
      };
    case 'B':
    default:
      return {
        grade: 'B',
        name: 'Emerald Green',
        bgGrad: ['#0A341E', '#062113', '#020F08'],
        radialCore: 'rgba(167, 243, 208, 0.48)',
        radialMid: 'rgba(16, 185, 129, 0.36)',
        radialOuter: 'rgba(5, 150, 105, 0.16)',
        scanline: 'rgba(52, 211, 153, 0.035)',
        hasShine: false, // Grade B cards remain clean and non-holo
      };
  }
}

/**
 * Draws the Full-Art 16-bit retro Pokemon card interior stage:
 * Grade-driven background gradient, scanline grid, dynamic radial burst,
 * floor shadow, and the crisp 16-bit character sprite.
 */
const _scanlinePatternCache = new Map();
function _getScanlinePattern(ctx, color) {
  let pat = _scanlinePatternCache.get(color);
  if (!pat && typeof document !== 'undefined') {
    const pc = document.createElement('canvas');
    pc.width = 4;
    pc.height = 4;
    const pctx = pc.getContext('2d');
    if (pctx) {
      pctx.fillStyle = color;
      pctx.fillRect(0, 0, 4, 1);
      pat = ctx.createPattern(pc, 'repeat');
      if (pat) _scanlinePatternCache.set(color, pat);
    }
  }
  return pat;
}

const ELEMENT_WEAKNESS_MAP = Object.freeze({
  lightning: { weak: 'fighting', res: 'steel', retreat: 1 },
  water: { weak: 'lightning', res: 'fire', retreat: 2 },
  fire: { weak: 'water', res: 'grass', retreat: 1 },
  psychic: { weak: 'dark', res: 'fighting', retreat: 1 },
  steel: { weak: 'fire', res: 'psychic', retreat: 2 },
  fighting: { weak: 'psychic', res: 'dark', retreat: 1 },
  dark: { weak: 'fighting', res: 'psychic', retreat: 1 },
  grass: { weak: 'fire', res: 'water', retreat: 1 },
  dragon: { weak: 'colorless', res: 'grass', retreat: 2 },
  colorless: { weak: 'fighting', res: 'psychic', retreat: 1 },
});

function _toTitleCase(str) {
  if (!str) return 'Fighter';
  return String(str)
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function _formatFighterCardName(str) {
  if (!str) return 'Fighter';
  const clean = String(str).includes(' - ') ? str.split(' - ')[0] : str;
  if (/^(PEKKA|CMB|SSR|NPC)$/i.test(clean.trim())) {
    return clean.trim().toUpperCase();
  }
  return _toTitleCase(clean);
}

/**
 * Calculates responsive proportional layout parameters for the Celebrations Pokémon Card,
 * ensuring flawless rendering across compact grids (130x140) and large showcase cards (210x300).
 */
function _getPokemonCardLayout(w, h) {
  const topMargin = Math.max(3, Math.round(h * 0.024));
  const sideMargin = Math.max(5, Math.round(w * 0.040));
  const bottomMargin = Math.max(3, Math.round(h * 0.024));

  // 1. Header Bar
  const headerY = topMargin;
  const headerH = Math.max(14, Math.round(h * 0.080));

  // 2. Art Box (Illustration Window)
  const artY = headerY + headerH + Math.max(2, Math.round(h * 0.012));
  const artX = sideMargin;
  const artW = w - sideMargin * 2;
  const artH = Math.round(h * 0.40);

  // Pokédex Info Ribbon (along bottom of Art Box)
  const ribbonH = Math.max(8, Math.round(h * 0.046));
  const ribbonY = artY + artH - ribbonH;

  // Character Center inside Art Box (centered in art area above ribbon)
  const charCx = Math.round(artX + artW * 0.50);
  const charCy = Math.round(artY + (artH - ribbonH) * 0.52);

  // 3. Footer (anchored at bottom)
  const footerH = Math.max(13, Math.round(h * 0.068));
  const footerY = h - bottomMargin - footerH;

  // 4. Weakness / Resistance / Retreat Bar (Generous sizing for high-end TCG clarity)
  const ruleH = Math.max(18, Math.round(h * 0.092));
  const ruleGap = Math.max(3, Math.round(h * 0.014));
  const ruleY = footerY - ruleH - ruleGap;

  // 5. Middle Action Section (between Art Box and Rule Bar)
  const midY = artY + artH + Math.max(3, Math.round(h * 0.016));
  const midH = ruleY - midY - Math.max(3, Math.round(h * 0.014));

  return {
    topMargin,
    sideMargin,
    bottomMargin,
    headerY,
    headerH,
    artX,
    artY,
    artW,
    artH,
    ribbonY,
    ribbonH,
    charCx,
    charCy,
    midY,
    midH,
    ruleY,
    ruleH,
    footerY,
    footerH,
  };
}

/**
 * Renders single-line card text guaranteed to NEVER truncate with an ellipsis ("...")!
 * Dynamically scales down font size and uses condensed horizontal scaling if necessary,
 * ensuring the full, complete text is always rendered cleanly without clipping or trailing dots.
 */
function _drawShrinkFittedText(ctx, text, x, y, maxW, baseFontSize, fontWeight = '900', fontFamily = '"Outfit", "Segoe UI", sans-serif') {
  if (!text || maxW <= 0) return;

  ctx.save();
  ctx.font = `${fontWeight} ${baseFontSize}px ${fontFamily}`;
  let textW = ctx.measureText(text).width;

  if (textW <= maxW) {
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  // Calculate proportional font size reduction
  const targetFontSize = (baseFontSize * maxW) / textW;
  const minCleanFontSize = Math.max(5.5, baseFontSize * 0.60);

  if (targetFontSize >= minCleanFontSize) {
    ctx.font = `${fontWeight} ${targetFontSize.toFixed(1)}px ${fontFamily}`;
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  // If target font size is smaller than minCleanFontSize, clamp font to minCleanFontSize
  // and apply condensed horizontal scaling so the whole word fits without clipping or dots
  ctx.font = `${fontWeight} ${minCleanFontSize.toFixed(1)}px ${fontFamily}`;
  textW = ctx.measureText(text).width;
  const squeeze = Math.max(0.50, Math.min(1.0, maxW / textW));

  ctx.translate(x, y);
  ctx.scale(squeeze, 1.0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Draws the Full-Art 16-bit retro Pokémon card interior:
 * Base Brushed Platinum Metal Surface, Inset Illustration Window (Art Box) with
 * 3D Bevel, Character Sprite, Contact Shadow, Pokédex Info Ribbon, and the
 * Iconic Celebrations Pikachu Head Stamp.
 */
function _drawPokemonCardStage(ctx, x, y, w, h, def, idx, element, grade, t, layout, theme = null) {
  if (!theme) {
    theme = getFighterCollectorTheme(def);
  }
  const gradeBg = getGradeCardBackground(grade);
  const { artX, artY, artW, artH, ribbonY, ribbonH, charCx, charCy } = layout;

  const boxX = x + artX;
  const boxY = y + artY;
  const ribY = y + ribbonY;
  const cCx = x + charCx;
  const cCy = y + charCy;

  // 1. Base Card Surface: Fighter Signature Themed Metallic Pearl Face
  const baseGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  baseGrad.addColorStop(0.00, theme?.bg || '#F8F9FB');
  baseGrad.addColorStop(0.28, '#FFFFFF'); // Specular light reflect
  baseGrad.addColorStop(0.65, theme?.bg || '#EEF0F5');
  baseGrad.addColorStop(1.00, theme?.banner || '#D8DAE2');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(x, y, w, h);

  // 2. Brushed Metallic Horizontal Sheen Texture
  ctx.save();
  ctx.fillStyle = theme?.grid || 'rgba(255, 255, 255, 0.40)';
  for (let py = y + 4; py < y + h - 4; py += 3) {
    ctx.fillRect(x + 4, py, w - 8, 0.6);
  }
  ctx.restore();

  // 3. Illustration Window (Art Box)
  // Drop shadow behind art box
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 9, 0.35)';
  drawChamferedRect(ctx, boxX + 1.2, boxY + 1.2, artW, artH, 3.5);
  ctx.fill();

  // Clipped Art Box Interior
  ctx.save();
  drawChamferedRect(ctx, boxX, boxY, artW, artH, 3.5);
  ctx.clip();

  // A. Dynamic Stage Background Gradient (Grade / Celestial Atmosphere)
  const stageGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + artH);
  stageGrad.addColorStop(0.00, gradeBg.bgGrad[0]);
  stageGrad.addColorStop(0.50, gradeBg.bgGrad[1]);
  stageGrad.addColorStop(1.00, gradeBg.bgGrad[2]);
  ctx.fillStyle = stageGrad;
  ctx.fillRect(boxX, boxY, artW, artH);

  // B. Scanline Texture inside Art Box
  const scanPat = _getScanlinePattern(ctx, gradeBg.scanline);
  if (scanPat) {
    ctx.fillStyle = scanPat;
    ctx.fillRect(boxX, boxY, artW, artH);
  }

  // Calculate Heroic Fighter Scale inside Art Window
  const visibleH = artH - ribbonH;
  // Heroic target height: Occupies ~84% of visible art height, capped at ~78% of art width
  const targetFighterH = Math.round(Math.min(visibleH * 0.84, artW * 0.78));
  // Baseline humanoid sprite height inside 256x256 preview canvas is ~62px
  const stickerScale = targetFighterH / 62;
  const stickerSize = Math.round(256 * stickerScale);

  // Anchor floor shadow right above the Pokédex ribbon bar
  const shadowY = Math.round(boxY + visibleH - Math.max(5, Math.round(visibleH * 0.12)));
  const shadowRx = Math.round(targetFighterH * 0.50);
  const shadowRy = Math.max(3, Math.round(shadowRx * 0.26));

  // Anchor character vertical center so feet (at +25px in 256px canvas) stand squarely on floor shadow
  const spriteCX = Math.round(boxX + artW * 0.50);
  const spriteCY = Math.round(shadowY - targetFighterH * 0.38);

  // C. Central Grade Radiant Burst behind Sprite
  const radR = Math.max(artW, artH) * 0.90;
  const radGrad = ctx.createRadialGradient(spriteCX, spriteCY - 4, 2, spriteCX, spriteCY - 4, radR);
  radGrad.addColorStop(0.00, gradeBg.radialCore);
  radGrad.addColorStop(0.30, gradeBg.radialMid);
  radGrad.addColorStop(0.70, gradeBg.radialOuter);
  radGrad.addColorStop(1.00, 'rgba(5, 7, 10, 0.00)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(boxX, boxY, artW, artH);

  // D. Floor Contact Shadow Ellipse directly beneath feet
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 9, 0.65)';
  ctx.beginPath();
  ctx.ellipse(spriteCX, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // E. 16-Bit Character Sprite Preview (Nearest Neighbor, Heroic Scale)
  const stickerImg = getFighterStickerPreview(idx);
  if (stickerImg) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      stickerImg,
      spriteCX - stickerSize / 2,
      spriteCY - stickerSize / 2,
      stickerSize,
      stickerSize
    );
  } else {
    ctx.fillStyle = def?.color || '#38BDF8';
    ctx.beginPath();
    ctx.arc(spriteCX, spriteCY, Math.round(targetFighterH * 0.40), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#050609';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // F. Fighter Themed Pokédex Info Ribbon Bar
  const ribbonGrad = ctx.createLinearGradient(boxX, ribY, boxX, ribY + ribbonH);
  ribbonGrad.addColorStop(0.00, '#FFFFFF');
  ribbonGrad.addColorStop(0.40, theme?.banner || '#D5D9E2');
  ribbonGrad.addColorStop(1.00, theme?.border || '#C2C7D2');
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(boxX, ribY, artW, ribbonH);

  // Top border line of ribbon
  ctx.fillStyle = theme?.primary || '#94A3B8';
  ctx.fillRect(boxX, ribY, artW, 0.8);

  // Pokédex Info Text: e.g. "NO. 0062 FIGHTING"
  const pkmNum = `NO. ${String(idx + 1).padStart(4, '0')}`;
  const pkmCategory = `${element.label || 'FIGHTER'}`;
  const pkmText = `${pkmNum} ${pkmCategory}`;
  const ribbonFontSize = Math.max(5.0, Math.round(ribbonH * 0.58));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme?.dark || '#334155';
  const maxRibbonTextW = artW - Math.max(16, Math.round(w * 0.12));
  _drawShrinkFittedText(ctx, pkmText, boxX + 4, ribY + ribbonH / 2 + 0.4, maxRibbonTextW, ribbonFontSize, '800');

  ctx.restore(); // Restore art clip

  // 4. 3D Inset Beveled Frame around the Art Box
  ctx.strokeStyle = theme?.primary || '#8E94A0';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, boxX, boxY, artW, artH, 3.5);
  ctx.stroke();

  // Inset hairline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)';
  ctx.lineWidth = 0.6;
  drawChamferedRect(ctx, boxX + 0.8, boxY + 0.8, artW - 1.6, artH - 1.6, 3.0);
  ctx.stroke();

  // 5. Standalone 3D Comic Grade Letter (Bottom-Left Corner of Art Box Frame)
  const isBoss = def?.type === 'boss' || Boolean(def?.bossTitle);
  const label = isBoss ? 'BOSS' : String(grade || 'B').toUpperCase();
  const gradeScale = Math.max(0.68, Math.min(1.02, artH / 120));
  const letterW = (label === 'BOSS' ? 38 : (label.length >= 3 ? 30 : (label.length === 2 ? 22 : 14))) * gradeScale;
  const letterH = 20.5 * gradeScale;
  const letterCx = Math.round(boxX + letterW / 2 + Math.max(5, Math.round(artW * 0.038)));
  const letterCy = Math.round(ribY - letterH / 2 - Math.max(2, Math.round(artH * 0.024)));

  drawWingedGradeLetter(ctx, letterCx, letterCy, label, null, idx, gradeScale, true);

  ctx.restore(); // Restore drop shadow save
}

/**
 * Draws the Classic Pokémon TCG Top Header Bar:
 * Clean Bold Fighter Name (Title Case, Charcoal, Full-Width), HP [value], and Circular Energy Orb.
 * (Note: Standalone Grade Letter is now anchored in the Art Box bottom-left corner per user layout).
 */
function _drawPokemonCardHeader(ctx, x, y, w, h, def, idx, element, isBoss = false, layout, grade = 'B', t = 0, theme = null) {
  if (!theme) {
    theme = getFighterCollectorTheme(def);
  }
  ctx.save();
  const { headerY, headerH, sideMargin } = layout;

  // Space allocation: Leave room for HP + Energy Orb on right
  const orbR = Math.max(4.2, Math.round(h * 0.032));
  const orbX = x + w - sideMargin - orbR - 1;
  const orbY = y + headerY + headerH / 2;

  const hpStr = `HP ${def?.hp || 100}`;
  const hpFontSize = Math.max(8, Math.round(h * 0.054));
  ctx.font = `900 ${hpFontSize}px "Outfit", sans-serif`;
  const hpW = ctx.measureText(hpStr).width;
  const hpX = orbX - orbR - 3;

  // 1. Fighter Name (Clean Bold Modern Charcoal Typography, Title Case - NEVER truncated with ellipsis!)
  // Now has full horizontal room from left margin to HP value
  const nameX = Math.round(x + sideMargin + 2);
  const displayName = _formatFighterCardName(def?.name || def?.type || 'Fighter');
  const nameMaxW = hpX - hpW - nameX - 6;
  const nameBaseFontSize = Math.max(9.5, Math.round(h * 0.062));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  _drawShrinkFittedText(ctx, displayName, nameX, orbY, nameMaxW, nameBaseFontSize, '900');

  // 2. HP [value] Readout
  ctx.font = `900 ${hpFontSize}px "Outfit", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme?.dark || '#111827';
  ctx.fillText(hpStr, hpX, orbY);

  // 3. Circular Elemental Energy Orb
  drawEnergyOrb(ctx, element.key, orbX, orbY, orbR);

  ctx.restore();
}

/**
 * Draws the Lower Pokémon TCG Section:
 * Attack Move Row with Energy Pips and Damage Value,
 * Authentic Weakness / Resistance / Retreat Bar, and Collector Set Number Footer.
 */
function _drawPokemonCardBottomSection(ctx, x, y, w, h, def, idx, element, grade, layout, theme = null) {
  if (!theme) {
    theme = getFighterCollectorTheme(def);
  }
  ctx.save();
  const { midY, midH, ruleY, ruleH, footerY, footerH, sideMargin } = layout;

  // 1. Attack Move Row (Cost Energy Orbs + Signature Move Name + Damage Value)
  const pipR = Math.max(3.2, Math.round(h * 0.024));
  const pipY = Math.round(y + midY + midH / 2);
  const dmgVal = String(def?.damage || 80);

  // Cost Pips
  const pipX1 = x + sideMargin + pipR + 1;
  drawEnergyOrb(ctx, element.key, pipX1, pipY, pipR);
  const pipX2 = pipX1 + pipR * 2 + 1.5;
  drawEnergyOrb(ctx, 'colorless', pipX2, pipY, pipR);
  let lastPipX = pipX2;
  if (Number(def?.damage || 80) >= 100) {
    const pipX3 = pipX2 + pipR * 2 + 1.5;
    drawEnergyOrb(ctx, 'colorless', pipX3, pipY, pipR);
    lastPipX = pipX3;
  }

  // Attack Damage Number (Right Aligned)
  const dmgX = x + w - sideMargin - 2;
  ctx.font = `900 ${Math.max(10.5, Math.round(h * 0.070))}px "Outfit", "Impact", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme?.dark || '#111827';
  ctx.fillText(dmgVal, dmgX, pipY);
  const dmgW = ctx.measureText(dmgVal).width;

  // Attack Move Name (NEVER truncated with ellipsis!)
  const rawMove = def?.signatureMove || def?.ability || def?.name || 'Strike';
  const moveName = _formatFighterCardName(rawMove);
  const moveX = lastPipX + pipR + 3;
  const moveBaseFontSize = moveName.length > 20
    ? Math.max(7.2, Math.round(h * 0.046))
    : (moveName.length > 15 ? Math.max(7.8, Math.round(h * 0.050)) : Math.max(8.4, Math.round(h * 0.054)));
  const moveMaxW = dmgX - dmgW - moveX - 3;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  _drawShrinkFittedText(ctx, moveName, moveX, pipY, moveMaxW, moveBaseFontSize, '800');

  // 3. Weakness / Resistance / Retreat Bar
  const ruleBoxY = y + ruleY;
  ctx.fillStyle = theme?.banner ? `${theme.banner}99` : 'rgba(226, 232, 240, 0.50)';
  ctx.fillRect(x + sideMargin, ruleBoxY, w - sideMargin * 2, ruleH);

  // Top and bottom divider hairlines
  ctx.fillStyle = theme?.border || '#CBD5E1';
  ctx.fillRect(x + sideMargin, ruleBoxY, w - sideMargin * 2, 0.8);
  ctx.fillRect(x + sideMargin, ruleBoxY + ruleH, w - sideMargin * 2, 0.8);

  const colW = (w - sideMargin * 2) / 3;
  const col1X = x + sideMargin;
  const col2X = col1X + colW;
  const col3X = col2X + colW;

  // Vertical dividers
  ctx.fillRect(col2X, ruleBoxY + 2, 0.8, ruleH - 4);
  ctx.fillRect(col3X, ruleBoxY + 2, 0.8, ruleH - 4);

  const weakElem = ELEMENT_WEAKNESS_MAP[element.key]?.weak || 'fighting';
  const resElem = ELEMENT_WEAKNESS_MAP[element.key]?.res || 'steel';
  const retCount = ELEMENT_WEAKNESS_MAP[element.key]?.retreat || 1;

  ctx.textBaseline = 'middle';

  const ruleLabelFontSize = Math.max(6.8, Math.round(ruleH * 0.38));
  const ruleValFontSize = Math.max(8.0, Math.round(ruleH * 0.44));
  const ruleOrbR = Math.max(4.0, Math.round(ruleH * 0.23));

  // Column 1: Weakness
  const valStr = '×2';
  ctx.font = `900 ${ruleValFontSize}px "Outfit", sans-serif`;
  const valW = ctx.measureText(valStr).width;
  const valX = col1X + colW - 3;
  const orbX = Math.round(valX - valW - ruleOrbR - 3);
  const labelMaxW = orbX - ruleOrbR - (col1X + 4) - 2;
  ctx.fillStyle = theme?.dark ? `${theme.dark}CC` : '#64748B';
  _drawShrinkFittedText(ctx, 'Weakness', col1X + 4, ruleBoxY + ruleH / 2, labelMaxW, ruleLabelFontSize, '700');
  drawEnergyOrb(ctx, weakElem, orbX, ruleBoxY + ruleH / 2, ruleOrbR);
  ctx.font = `900 ${ruleValFontSize}px "Outfit", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = theme?.dark || '#334155';
  ctx.fillText(valStr, valX, ruleBoxY + ruleH / 2);

  // Column 2: Resistance
  const resValStr = '-30';
  ctx.font = `900 ${ruleValFontSize}px "Outfit", sans-serif`;
  const resValW = ctx.measureText(resValStr).width;
  const resValX = col2X + colW - 3;
  const resOrbX = Math.round(resValX - resValW - ruleOrbR - 3);
  const resLabelMaxW = resOrbX - ruleOrbR - (col2X + 4) - 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme?.dark ? `${theme.dark}CC` : '#64748B';
  _drawShrinkFittedText(ctx, 'Resistance', col2X + 4, ruleBoxY + ruleH / 2, resLabelMaxW, ruleLabelFontSize, '700');
  drawEnergyOrb(ctx, resElem, resOrbX, ruleBoxY + ruleH / 2, ruleOrbR);
  ctx.font = `900 ${ruleValFontSize}px "Outfit", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = theme?.dark || '#334155';
  ctx.fillText(resValStr, resValX, ruleBoxY + ruleH / 2);

  // Column 3: Retreat
  ctx.fillStyle = theme?.dark ? `${theme.dark}CC` : '#64748B';
  ctx.textAlign = 'left';
  if (retCount === 1) {
    const retOrbX = Math.round(col3X + colW - ruleOrbR - 3);
    drawEnergyOrb(ctx, 'colorless', retOrbX, ruleBoxY + ruleH / 2, ruleOrbR);
    const retLabelMaxW = retOrbX - ruleOrbR - (col3X + 4) - 2;
    _drawShrinkFittedText(ctx, 'Retreat', col3X + 4, ruleBoxY + ruleH / 2, retLabelMaxW, ruleLabelFontSize, '700');
  } else {
    const retOrbX2 = Math.round(col3X + colW - ruleOrbR - 3);
    const retOrbX1 = Math.round(retOrbX2 - ruleOrbR * 2 - 2);
    drawEnergyOrb(ctx, 'colorless', retOrbX1, ruleBoxY + ruleH / 2, ruleOrbR);
    drawEnergyOrb(ctx, 'colorless', retOrbX2, ruleBoxY + ruleH / 2, ruleOrbR);
    const retLabelMaxW = retOrbX1 - ruleOrbR - (col3X + 4) - 2;
    _drawShrinkFittedText(ctx, 'Retreat', col3X + 4, ruleBoxY + ruleH / 2, retLabelMaxW, ruleLabelFontSize, '700');
  }

  // 4. Card Footer
  const footBoxY = y + footerY;
  ctx.fillStyle = theme?.border || '#CBD5E1';
  ctx.fillRect(x + sideMargin, footBoxY, w - sideMargin * 2, 0.8);

  const footFontSize = Math.max(7.2, Math.round(footerH * 0.52));
  const setStr = `${String(idx + 1).padStart(3, '0')}/064 ★`;
  ctx.font = `800 ${footFontSize}px "Silkscreen", monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme?.dark || '#475569';
  ctx.fillText(setStr, x + sideMargin + 3, footBoxY + footerH / 2 + 0.5);

  ctx.font = `800 ${footFontSize}px "Outfit", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = theme?.dark ? `${theme.dark}AA` : '#64748B';
  ctx.fillText('Illus. CMB', x + w - sideMargin - 3, footBoxY + footerH / 2 + 0.5);

  ctx.restore();
}

/**
 * Helper to trace the angled wedge / pennant banner polygon.
 */
function _traceWedgeBannerPath(ctx, x0, y0, topW, botW, h_left, h_bot) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + topW, y0);
  ctx.lineTo(x0 + botW, y0 + h_bot);
  ctx.lineTo(x0, y0 + h_left);
  ctx.closePath();
}

/**
 * Draws a single golden 5-point star with metallic fill, dark outline, and specular core.
 */
function _drawGoldMiniStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = i * (Math.PI / 5) - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.44;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Dark drop shadow outline
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 1.0;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Warm metallic gold star fill
  const starGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  starGrad.addColorStop(0.00, '#FFFBEB');
  starGrad.addColorStop(0.35, '#FBBF24');
  starGrad.addColorStop(1.00, '#B45309');
  ctx.fillStyle = starGrad;
  ctx.fill();

  // Specular top sparkle glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 0.3, cy - 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the 16-Bit Pokémon TCG Angled Wedge Rarity Banner in top-left
 * (Matching the user's reference image: gold-beveled pennant, wine velvet field,
 * embossed gold grade lettering, and golden stars).
 */
function _drawPokemonWedgeRarityBanner(ctx, x, y, w, h, grade, theme, idx, t) {
  const x0 = x + 3.5;
  const y0 = y + 20.0;
  const topW = Math.round(w * 0.28);
  const botW = Math.round(topW * 0.80);
  const h_left = Math.round(h * 0.22);
  const h_bot = Math.round(h * 0.28);

  ctx.save();

  // 1. Drop Shadow behind the banner
  ctx.fillStyle = 'rgba(5, 6, 9, 0.72)';
  _traceWedgeBannerPath(ctx, x0 + 1.6, y0 + 1.6, topW, botW, h_left, h_bot);
  ctx.fill();

  // 2. Clipped Jewel Plate Interior (Velvet Gradient + Diagonal Sheen Luster)
  ctx.save();
  _traceWedgeBannerPath(ctx, x0, y0, topW, botW, h_left, h_bot);
  ctx.clip();

  const plateGrad = ctx.createLinearGradient(x0, y0, x0 + topW, y0 + h_bot);
  if (grade === 'SSR') {
    plateGrad.addColorStop(0.00, '#7A142A'); // Rich crimson-wine
    plateGrad.addColorStop(0.50, '#540D1D');
    plateGrad.addColorStop(1.00, '#2E060F'); // Deep abyss maroon
  } else if (grade === 'SS') {
    plateGrad.addColorStop(0.00, '#881337'); // Rose ruby
    plateGrad.addColorStop(0.50, '#5C0D24');
    plateGrad.addColorStop(1.00, '#310613');
  } else if (grade === 'S') {
    plateGrad.addColorStop(0.00, '#662208'); // Warm solar amber-crimson
    plateGrad.addColorStop(0.50, '#421404');
    plateGrad.addColorStop(1.00, '#240A02');
  } else if (grade === 'A') {
    plateGrad.addColorStop(0.00, '#581C87'); // Royal amethyst
    plateGrad.addColorStop(0.50, '#3B0764');
    plateGrad.addColorStop(1.00, '#1E0436');
  } else {
    plateGrad.addColorStop(0.00, '#064E3B'); // Forest emerald
    plateGrad.addColorStop(0.50, '#022C22');
    plateGrad.addColorStop(1.00, '#011711');
  }
  ctx.fillStyle = plateGrad;
  ctx.fillRect(x0 - 2, y0 - 2, topW + 6, h_bot + 6);

  // Diagonal Light Beam Sheen across the velvet field (Signature image highlight)
  const sheenGrad = ctx.createLinearGradient(x0, y0, x0 + topW, y0 + h_bot);
  sheenGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.00)');
  sheenGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.28)'); // Luminous white beam
  sheenGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.12)');
  sheenGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(x0 - 2, y0 - 2, topW + 6, h_bot + 6);

  ctx.restore(); // End plate clip

  // 3. Double Gold Rim Bevel Frame
  const goldRim = ctx.createLinearGradient(x0, y0, x0 + topW, y0 + h_bot);
  goldRim.addColorStop(0.00, '#FFF3B0'); // Incandescent light gold
  goldRim.addColorStop(0.30, '#FFD700'); // Radiant 24k gold
  goldRim.addColorStop(0.70, '#D99B1E'); // Amber gold
  goldRim.addColorStop(1.00, '#8C590E'); // Warm bronze gold

  // Outer Gold Line
  _traceWedgeBannerPath(ctx, x0, y0, topW, botW, h_left, h_bot);
  ctx.strokeStyle = goldRim;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // Inner Thin Gold Line
  _traceWedgeBannerPath(ctx, x0 + 1.2, y0 + 1.0, topW - 2.2, botW - 2.0, h_left - 1.8, h_bot - 2.2);
  ctx.strokeStyle = 'rgba(255, 245, 180, 0.40)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4. Embossed Metallic Gold Grade Text ("SSR" / "S" / "SS" / "A" / "B")
  const letterCx = x0 + (topW * 0.48);
  const letterCy = y0 + (h_bot * 0.36);
  const fontSize = grade === 'SSR' ? 13.5 : (grade === 'SS' ? 13.0 : 15.0);

  ctx.save();
  ctx.font = `900 ${fontSize}px "Impact", "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark 3D Drop Shadow underneath letters
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.strokeText(grade, letterCx, letterCy);

  ctx.fillStyle = '#050609';
  ctx.fillText(grade, letterCx + 0.8, letterCy + 1.2);

  // Metallic Gold Letter Gradient Fill
  const textGold = ctx.createLinearGradient(letterCx, letterCy - fontSize * 0.5, letterCx, letterCy + fontSize * 0.5);
  textGold.addColorStop(0.00, '#FFFDE7'); // Incandescent glint highlight
  textGold.addColorStop(0.25, '#FFD700'); // Radiant Solar Gold
  textGold.addColorStop(0.65, '#E5A512'); // Amber gold
  textGold.addColorStop(1.00, '#8C5406'); // Deep bronze base shadow
  ctx.fillStyle = textGold;
  ctx.fillText(grade, letterCx, letterCy);

  // Top Specular Highlight on letters
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText(grade, letterCx - 0.3, letterCy - 0.4);
  ctx.fillStyle = textGold;
  ctx.fillText(grade, letterCx, letterCy);

  ctx.restore();

  // 5. Golden Stars Underneath (★ ★ ★)
  const starsY = letterCy + (fontSize * 0.46) + 4;
  const starCount = grade === 'B' ? 1 : (grade === 'A' ? 2 : 3);
  const starSpacing = 5.8;
  const startStarX = letterCx - ((starCount - 1) * starSpacing) / 2;

  for (let s = 0; s < starCount; s++) {
    const sx = startStarX + s * starSpacing;
    _drawGoldMiniStar(ctx, sx, starsY, 2.4);
  }

  ctx.restore();
}

/**
 * Draws the Metallic Silver / Titanium Holo Foil Card Frame with pixel bevels,
 * dynamic rainbow holographic foil sheen, and corner sparkles.
 */
function _drawPokemonCardHoloFrame(ctx, x, y, w, h, isSelected, grade, t, idx, theme = null) {
  const isSSR = grade === 'SSR';
  const isSS = grade === 'SS';
  const isS = grade === 'S';

  // 1. Outer Dark Manga Border (#090A0E)
  _traceCollectorCardPath(ctx, x, y, w, h, 6);
  ctx.strokeStyle = '#090A0E';
  ctx.lineWidth = isSelected ? 3.8 : 3.2;
  ctx.stroke();

  // 2. Base Fighter-Themed Metallic Frame Bevel
  const themeFrame = ctx.createLinearGradient(x, y, x + w, y + h);
  themeFrame.addColorStop(0.00, '#FFFFFF'); // Specular highlight
  themeFrame.addColorStop(0.25, theme?.border || '#E2E8F0');
  themeFrame.addColorStop(0.60, theme?.primary || '#CBD5E1');
  themeFrame.addColorStop(1.00, theme?.dark || '#94A3B8');

  // 3. Dynamic Holographic Rainbow Foil Sheen for High Grades
  if (isSSR) {
    // Underlayer: Fighter-Themed Metallic Frame
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.strokeStyle = themeFrame;
    ctx.lineWidth = isSelected ? 3.2 : 2.6;
    ctx.stroke();

    const rainbowAngle = (t * 1.8) + (idx * 0.65);
    const rCos = Math.cos(rainbowAngle);
    const rSin = Math.sin(rainbowAngle);
    const rDiag = Math.hypot(w, h) * 0.58;
    const goldenRainbow = ctx.createLinearGradient(
      (x + w / 2) - rCos * rDiag, (y + h / 2) - rSin * rDiag,
      (x + w / 2) + rCos * rDiag, (y + h / 2) + rSin * rDiag
    );
    goldenRainbow.addColorStop(0.00, theme?.primary || '#FFD700');
    goldenRainbow.addColorStop(0.15, '#FFA000');
    goldenRainbow.addColorStop(0.30, '#FF2E74');
    goldenRainbow.addColorStop(0.48, '#B038FF');
    goldenRainbow.addColorStop(0.65, '#00E5FF');
    goldenRainbow.addColorStop(0.82, '#00FF88');
    goldenRainbow.addColorStop(1.00, theme?.primary || '#FFD700');

    // Corona glow (Rule 2.2 compliant: 0 shadowBlur)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = goldenRainbow;
    ctx.lineWidth = isSelected ? 4.8 : 3.8;
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.stroke();
    ctx.restore();

    // Core crisp golden rainbow border with subtle blend
    ctx.save();
    ctx.globalAlpha = 0.75;
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.strokeStyle = goldenRainbow;
    ctx.lineWidth = isSelected ? 2.6 : 2.0;
    ctx.stroke();
    ctx.restore();
  } else if (isSS) {
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.strokeStyle = themeFrame;
    ctx.lineWidth = isSelected ? 3.0 : 2.4;
    ctx.stroke();

    const rainbowAngle = (t * 1.8) + (idx * 0.65);
    const rCos = Math.cos(rainbowAngle);
    const rSin = Math.sin(rainbowAngle);
    const rDiag = Math.hypot(w, h) * 0.55;
    const rainbowBevel = ctx.createLinearGradient(
      (x + w / 2) - rCos * rDiag, (y + h / 2) - rSin * rDiag,
      (x + w / 2) + rCos * rDiag, (y + h / 2) + rSin * rDiag
    );
    rainbowBevel.addColorStop(0.00, '#FF2E74');
    rainbowBevel.addColorStop(0.20, '#FF8A00');
    rainbowBevel.addColorStop(0.40, '#FFEA00');
    rainbowBevel.addColorStop(0.60, '#00FF9D');
    rainbowBevel.addColorStop(0.80, '#00D8FF');
    rainbowBevel.addColorStop(1.00, '#FF2E74');

    ctx.save();
    ctx.globalAlpha = 0.60;
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.strokeStyle = rainbowBevel;
    ctx.lineWidth = isSelected ? 2.4 : 1.8;
    ctx.stroke();
    ctx.restore();
  } else if (isS) {
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    const goldBevel = ctx.createLinearGradient(x, y, x + w, y + h);
    goldBevel.addColorStop(0.00, '#FFFDE7');
    goldBevel.addColorStop(0.35, theme?.border || '#FFD700');
    goldBevel.addColorStop(0.70, theme?.primary || '#F59E0B');
    goldBevel.addColorStop(1.00, '#FFF59D');
    ctx.strokeStyle = isSelected ? '#FFFFFF' : goldBevel;
    ctx.lineWidth = isSelected ? 2.6 : 2.0;
    ctx.stroke();
  } else {
    // Fighter Theme Metallic Bevel for A and B tiers
    _traceCollectorCardPath(ctx, x + 2.2, y + 2.2, w - 4.4, h - 4.4, 4.5);
    ctx.strokeStyle = isSelected ? '#FFFFFF' : themeFrame;
    ctx.lineWidth = isSelected ? 2.6 : 2.0;
    ctx.stroke();
  }

  // 4. Inset Dark Bezel separating frame from art face
  _traceCollectorCardPath(ctx, x + 3.2, y + 3.2, w - 6.4, h - 6.4, 3.8);
  ctx.strokeStyle = theme?.dark || '#0F172A';
  ctx.lineWidth = 1.0;
  ctx.stroke();
}

/**
 * Renders a clean, luminous diagonal holographic swipe shine across the card face
 * for Grade A-S fighters (A, S, SS, SSR). Grade B cards remain non-holo.
 * 
 * Features:
 *  - Organic 3.2s cadence with 1.15s active swipe and 2.05s calm rest
 *  - Staggered phase offset per card index so grid cards don't shine in lockstep
 *  - Smooth acceleration/deceleration cubic easing curve
 *  - Razor-sharp white/specular core flanked by grade-tinted prismatic halo
 *  - Companion parallel thin secondary glint band for authentic TCG foil luster
 *  - 100% compliant with Rule 2.2 (zero shadowBlur) and Rule 2.4 (balanced transform stack)
 */
function _drawPokemonCardSwipeShine(ctx, x, y, w, h, grade, t, idx) {
  const gradeBg = getGradeCardBackground(grade);
  if (!gradeBg.hasShine) return;

  const cycleDuration = 3.2;
  const swipeDuration = 1.15;
  const localT = (t + idx * 0.42) % cycleDuration;
  if (localT > swipeDuration) return; // In calm rest phase

  const p = localT / swipeDuration;
  // Smooth cubic ease (swift, energetic sweep across card)
  const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  const diag = Math.hypot(w, h);
  const cardCx = x + w / 2;
  const cardCy = y + h / 2;

  ctx.save();
  // Clip strictly to card interior bounds so shine stays inside the frame
  _traceCollectorCardPath(ctx, x + 2.5, y + 2.5, w - 5, h - 5, 4.5);
  ctx.clip();

  ctx.translate(cardCx, cardCy);
  ctx.rotate(-0.58); // Slanted diagonal angle (~ -33 degrees)

  const startX = -diag * 0.85;
  const endX = diag * 0.85;
  const beamX = startX + ease * (endX - startX);

  // 1. Primary Holographic Beam (Dual-tapered specular ribbon)
  const mainW = Math.round(w * 0.20);
  const mainGrad = ctx.createLinearGradient(beamX - mainW, 0, beamX + mainW, 0);
  mainGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.00)');
  mainGrad.addColorStop(0.22, gradeBg.shineHalo);
  mainGrad.addColorStop(0.42, gradeBg.shineAccent);
  mainGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.70)');
  mainGrad.addColorStop(0.50, gradeBg.shineCore);
  mainGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.70)');
  mainGrad.addColorStop(0.58, gradeBg.shineAccent);
  mainGrad.addColorStop(0.78, gradeBg.shineHalo);
  mainGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');

  ctx.fillStyle = mainGrad;
  ctx.fillRect(-diag, -diag, diag * 2, diag * 2);

  // 2. Trailing Companion Thin Glint Band
  const compX = beamX - 14;
  const compW = 6;
  const compGrad = ctx.createLinearGradient(compX - compW, 0, compX + compW, 0);
  compGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.00)');
  compGrad.addColorStop(0.50, gradeBg.shineSecondary);
  compGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');

  ctx.fillStyle = compGrad;
  ctx.fillRect(-diag, -diag, diag * 2, diag * 2);

  ctx.restore();
}

/**
 * Renders a single 16-Bit Retro Pokémon-Style Collector Fighter Card:
 * Features:
 *  - Prismatic Metallic Silver / Titanium Holo Foil Border with corner diamond sparkles
 *  - Classic TCG Top Header Bar: [BASIC] capsule pill + Name + HP + Circular Elemental Energy Orb
 *  - Full-Art 16-Bit Character Sprite Showcase with dynamic elemental background and floor shadow
 *  - Red Capsule [Ability] Box with ability name
 *  - Attack Move Row with Energy Pips and Damage Value
 *  - Collector Set Number Footer
 *  - PRESERVED: Top-Right Winged Grade Seal with special effects
 */
export function drawCollectorFighterCard(ctx, def, idx, x, y, w, h, isSelected, onSelect) {
  const grade = getFighterGrade(def);
  const element = getFighterCardElement(def);
  const isBoss = def?.type === 'boss' || Boolean(def?.bossTitle);
  const fighterTheme = getFighterCollectorTheme(def);

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const t = now * 0.001 + (idx * 0.73);

  ctx.save();

  // 1. Drop Shadow
  const shadowX = x + (isSelected ? 3.0 : 2.0);
  const shadowY = y + (isSelected ? 4.0 : 2.8);
  ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.45)' : 'rgba(5, 6, 9, 0.75)';
  _traceCollectorCardPath(ctx, shadowX, shadowY, w, h, 6);
  ctx.fill();

  // 2. Clipped Card Interior (Full-Art Stage + Classic TCG Header + Bottom Section)
  ctx.save();
  _traceCollectorCardPath(ctx, x, y, w, h, 6);
  ctx.clip();

  // Responsive Layout Budgeting across all viewport modes & card dimensions
  const layout = _getPokemonCardLayout(w, h);

  // A. Fighter-Themed Card Base + Framed Art Window + Pokédex Ribbon
  _drawPokemonCardStage(ctx, x, y, w, h, def, idx, element, grade, t, layout, fighterTheme);

  // B. Clean TCG Top Header Bar (Standalone Top HUD Frame Grade Letter, Title Case Name, HP, Energy Orb)
  _drawPokemonCardHeader(ctx, x, y, w, h, def, idx, element, isBoss, layout, grade, t, fighterTheme);

  // C. Lower TCG Action Section (Attack Move Row + Weakness/Retreat Bar + Set Footer)
  _drawPokemonCardBottomSection(ctx, x, y, w, h, def, idx, element, grade, layout, fighterTheme);

  // D. Clean Holographic Foil Swipe Shiny Effect (Grades A, S, SS, SSR)
  _drawPokemonCardSwipeShine(ctx, x, y, w, h, grade, t, idx);

  ctx.restore(); // Restore interior clip

  // 3. Metallic Silver / Holo Foil Card Frame & Corner Sparkles
  _drawPokemonCardHoloFrame(ctx, x, y, w, h, isSelected, grade, t, idx, fighterTheme);

  // 4. Active Selection Ring
  if (isSelected) {
    ctx.strokeStyle = fighterTheme?.primary || '#FFE082';
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
  _drawShrinkFittedText(ctx, rawName, col1X, y + 7, nameMaxW, 13, '900', '"Outfit", "Rajdhani", sans-serif');

  const measuredNameW = Math.min(nameMaxW, ctx.measureText(rawName).width);
  drawGradeBadge(ctx, Math.min(col1X + col1W - 24, col1X + measuredNameW + 6), y + 6, selectedDef.grade, { scale: 0.82 });

  // Class Pill
  ctx.fillStyle = '#1B1E28';
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1.2;
  const pillW = Math.min(col1W - 24, 96);
  drawChamferedRect(ctx, col1X, y + 23, pillW, 14, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F5A623';
  ctx.font = '900 8.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  _drawShrinkFittedText(ctx, `CLASS // ${String(selectedDef.type || selectedDef.name || 'FIGHTER').toUpperCase()}`, col1X + pillW / 2, y + 30, pillW - 6, 8.5, '900', '"Outfit", "Rajdhani", sans-serif');

  // Elemental Energy Orb beside Class Pill
  const element = getFighterCardElement(selectedDef);
  drawEnergyOrb(ctx, element.key, col1X + pillW + 11, y + 30, 6.0);

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

  // Red Ability Capsule Pill
  const abPillW = 34;
  const abPillH = 12;
  const redGrad = ctx.createLinearGradient(col2X, y + 6, col2X + abPillW, y + 6 + abPillH);
  redGrad.addColorStop(0.00, '#DC2626');
  redGrad.addColorStop(1.00, '#991B1B');
  drawChamferedRect(ctx, col2X, y + 6, abPillW, abPillH, 2.5);
  ctx.fillStyle = redGrad;
  ctx.fill();
  ctx.strokeStyle = '#090A0E';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 italic 7px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ability', col2X + abPillW / 2, y + 6 + abPillH / 2 + 0.3);

  // Ability Name (NEVER truncated with ellipsis!)
  ctx.fillStyle = '#F5A623';
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  _drawShrinkFittedText(ctx, (String(selectedDef.ability || 'DEFAULT')).toUpperCase(), col2X + abPillW + 6, y + 6 + abPillH / 2, col2W - abPillW - 6, 10, '900', '"Outfit", "Rajdhani", sans-serif');

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  wrapText(ctx, String(selectedDef.desc || ''), col2X, y + 22, col2W, 11.5, 4);

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
  _drawShrinkFittedText(ctx, String(weaponInfo?.name || 'WEAPON'), col3X + col3W / 2, y + 10, col3W - 6, 8, '900', '"Outfit", "Rajdhani", sans-serif');

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
