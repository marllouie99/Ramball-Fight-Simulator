import { state } from '../../core/state.js';
import { getFighterPreview, getFighterBodyOnlyPreview, getFighterStickerPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { _registerButton, drawButton, drawStatBar, drawChamferedRect, fitSingleLineText, wrapText } from './uiFramework.js';
import { audioSystem } from '../../systems/audioSystem.js';

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

function _traceCollectorCardPath(ctx, x, y, w, h, r = 3) {
  const notchY = y + h * 0.47;
  const notchR = Math.min(4.5, Math.max(3, w * 0.036));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  // Right edge down to semicircular collector notch
  ctx.lineTo(x + w, notchY - notchR);
  ctx.arc(x + w, notchY, notchR, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _drawCardGridAndWatermark(ctx, idx, x, y, w, h, theme) {
  // 1. Dark Tactical Carbon Plate Backdrop
  ctx.fillStyle = '#161820';
  ctx.fillRect(x, y, w, h);

  // 2. Subtle Blueprint Dot-Grid Pattern
  const step = Math.max(8, Math.round(w / 14));
  ctx.strokeStyle = 'rgba(245, 166, 35, 0.055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = x + step; gx < x + w; gx += step) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (let gy = y + step; gy < y + h; gy += step) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();

  // 3. Faded Zoomed-In Close-Up Portrait Watermark on Right Half
  const bodyImg = getFighterBodyOnlyPreview(idx);
  if (bodyImg) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.13);
    ctx.lineTo(x + w, y + h * 0.34);
    ctx.lineTo(x + w, y + h * 0.79);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.clip();

    const zoomSize = Math.round(w * 1.04);
    const wx = x + w * 0.70 - zoomSize / 2;
    const wy = y + h * 0.56 - zoomSize / 2;
    ctx.globalAlpha = 0.22;
    ctx.drawImage(bodyImg, wx, wy, zoomSize, zoomSize);

    // Dark moody wash over watermark
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#0F1116';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

function _drawTopDiagonalBannerAndTitle(ctx, def, x, y, w, h, theme) {
  const leftBannerY = y + h * 0.13;
  const rightBannerY = y + h * 0.35;

  // 1. Diagonal Character Theme Header Wedge
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, rightBannerY);
  ctx.lineTo(x, leftBannerY);
  ctx.closePath();
  ctx.fill();

  // Heavy dark separation band under banner with amber hairline
  ctx.strokeStyle = '#101217';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, leftBannerY + 2);
  ctx.lineTo(x + w, rightBannerY + 2);
  ctx.stroke();

  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, leftBannerY + 4);
  ctx.lineTo(x + w, rightBannerY + 4);
  ctx.stroke();

  // 2. Signature Top-Left Hazard Amber Accent Wedge (Image 2/3 hallmark)
  ctx.fillStyle = '#F5A623';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.03);
  ctx.lineTo(x + w * 0.20, y + h * 0.125);
  ctx.lineTo(x, y + h * 0.215);
  ctx.closePath();
  ctx.fill();

  // 3. Tilted Bold Stencil Display Name in Top-Right Banner
  const rawName = String(def?.name || def?.type || 'FIGHTER');
  let shortName = rawName.includes(' - ')
    ? rawName.split(' - ')[0]
    : rawName;
  shortName = shortName.toUpperCase();

  const slopeAngle = Math.atan2(rightBannerY - leftBannerY, w);
  const titleCx = x + w * 0.58;
  const titleCy = y + h * 0.155;
  const maxTextW = w * 0.68;

  ctx.save();
  ctx.translate(titleCx, titleCy);
  ctx.rotate(slopeAngle);
  const fontSize = Math.max(11, Math.min(16, Math.round(w * 0.115)));
  ctx.font = `900 ${fontSize}px "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fitted = fitSingleLineText(ctx, shortName, maxTextW);

  // Deep dark drop outline
  ctx.fillStyle = '#090B0E';
  ctx.fillText(fitted, 0, 1.5);
  ctx.fillText(fitted, 1.2, 0);

  // Pure white bold stencil display text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fitted, 0, 0);

  // Stencil diagonal cut line across text (authentic industrial stencil vibe)
  ctx.strokeStyle = 'rgba(16, 18, 23, 0.85)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-maxTextW * 0.44, -fontSize * 0.08);
  ctx.lineTo(maxTextW * 0.44, fontSize * 0.08);
  ctx.stroke();
  ctx.restore();
}

function _drawBottomDiagonalGlyphBand(ctx, def, x, y, w, h, theme) {
  const botLeftX = x + w * 0.08;
  const botRightY = y + h * 0.79;

  // 1. Dark Carbon Footer Wedge
  ctx.fillStyle = '#101217';
  ctx.beginPath();
  ctx.moveTo(botLeftX, y + h);
  ctx.lineTo(x + w, botRightY);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Crisp Hazard Amber slash line above bottom wedge
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(botLeftX, y + h);
  ctx.lineTo(x + w, botRightY);
  ctx.stroke();

  // 2. Stylized Tech Annotation / Hazard Ticks along Bottom-Right Slope
  const botSlope = Math.atan2(botRightY - (y + h), w - botLeftX);
  ctx.save();
  ctx.translate(x + w * 0.72, y + h * 0.91);
  ctx.rotate(botSlope);
  ctx.fillStyle = '#F5A623';
  const glyphFont = Math.max(8, Math.round(w * 0.072));
  ctx.font = `900 ${glyphFont}px "Silkscreen", "Rajdhani", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('// SPEC.01', 0, 0);
  ctx.restore();
}

function _drawForegroundStickerCharacter(ctx, idx, def, x, y, w, h, theme) {
  const charCx = x + w * 0.39;
  const charCy = y + h * 0.56;
  const stickerSize = Math.round(Math.min(w * 0.80, h * 0.70));

  // Dark ground shadow ellipse under character
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(charCx, charCy + stickerSize * 0.31, stickerSize * 0.28, Math.max(4, stickerSize * 0.07), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const stickerImg = getFighterStickerPreview(idx);
  if (stickerImg) {
    ctx.drawImage(stickerImg, charCx - stickerSize / 2, charCy - stickerSize / 2, stickerSize, stickerSize);
  } else {
    ctx.fillStyle = def?.color || theme.primary;
    ctx.beginPath();
    ctx.arc(charCx, charCy, stickerSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Renders a single Collector Fighter Card in Industrial Tactical Cyberpunk Theme.
 */
export function drawCollectorFighterCard(ctx, def, idx, x, y, w, h, isSelected, onSelect) {
  const theme = getFighterCollectorTheme(def);

  ctx.save();
  // 1. Tactical Card Drop Shadow
  ctx.fillStyle = isSelected ? 'rgba(245, 166, 35, 0.25)' : 'rgba(0, 0, 0, 0.42)';
  _traceCollectorCardPath(ctx, x + (isSelected ? 2.5 : 1.5), y + (isSelected ? 3.5 : 2), w, h, 3);
  ctx.fill();

  // 2. Clipped Card Interior Layers
  ctx.save();
  _traceCollectorCardPath(ctx, x, y, w, h, 3);
  ctx.clip();

  _drawCardGridAndWatermark(ctx, idx, x, y, w, h, theme);
  _drawTopDiagonalBannerAndTitle(ctx, def, x, y, w, h, theme);
  _drawBottomDiagonalGlyphBand(ctx, def, x, y, w, h, theme);
  _drawForegroundStickerCharacter(ctx, idx, def, x, y, w, h, theme);
  ctx.restore();

  // 3. Crisp Card Border & Active Selection Indicator
  _traceCollectorCardPath(ctx, x, y, w, h, 3);
  ctx.strokeStyle = isSelected ? '#F5A623' : '#2C313E';
  ctx.lineWidth = isSelected ? 2.4 : 1.3;
  ctx.stroke();

  if (isSelected) {
    // Inner glowing rim
    ctx.strokeStyle = '#FFD043';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Top-left active hazard badge (Image 2/3 style)
    ctx.fillStyle = '#161922';
    ctx.fillRect(x + 4, y + 4, 44, 13);
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(x + 4, y + 4, 44, 13);

    // Mini hazard stripe edge
    drawHazardStripes(ctx, x + 4, y + 4, 6, 13, 2, '#F5A623', '#111216');

    ctx.fillStyle = '#F5A623';
    ctx.font = '900 7.5px "Silkscreen", "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ ACTIVE', x + 27, y + 10.5);
  }

  // 4. Below-Card Character Name Plate
  const labelY = y + h + 11;
  const rawLabel = String(def?.name || def?.type || 'FIGHTER');
  let displayName = rawLabel.includes(' - ')
    ? rawLabel.split(' - ')[0]
    : rawLabel;
  displayName = displayName.toUpperCase();

  const pillW = Math.min(w - 4, Math.max(68, displayName.length * 7.5 + 16));
  if (isSelected) {
    ctx.fillStyle = '#F5A623';
    ctx.strokeStyle = '#0F1014';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, x + w / 2 - pillW / 2, labelY - 7, pillW, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111215';
  } else {
    ctx.fillStyle = '#13151D';
    ctx.strokeStyle = '#2A2F3C';
    ctx.lineWidth = 1.0;
    drawChamferedRect(ctx, x + w / 2 - pillW / 2, labelY - 7, pillW, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
  }

  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, displayName, w - 8), x + w / 2, labelY);
  ctx.restore();

  if (typeof onSelect === 'function') {
    _registerButton(x, y, w, h + 18, onSelect);
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

  // Fighter Name in bold white
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, String(selectedDef.name || selectedDef.type || 'FIGHTER').toUpperCase(), col1W - 4), col1X, y + 7);

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
