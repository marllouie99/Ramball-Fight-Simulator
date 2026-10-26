// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL & BATTLE SHOWCASE SCREEN
// Authentic Comic Battle Card Format: Full-Bleed Diagonal Split Canvas,
// Dynamic Mode-Driven Card Layout (1v1, 1v2, 2v2, Tag Match, Boss Battle),
// Authentic Pokémon TCG Collector Cards from Character Card Selection,
// Center Comic "VS" Slam, and "WHO WINS?" Challenger Tag.
// Reference: media_1792819747328_ad46acf3.png (Collector Card Selection Standard)
// ─────────────────────────────────────────────────────────────────────────────
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { _clearButtons, _registerButton, drawChamferedRect } from './uiFramework.js';
import { proceedFromFaceOffToCountdown } from '../../core/gameFlow.js';
import {
  getFaceOffThemeColor,
  getDarkThemeTone,
  getGauntletChallengers
} from './CountdownIntro.js';
import { drawCollectorFighterCard } from './CollectorCardRenderer.js';

/** Robust Fighter Type Resolver (works across def.type, def.characterId, and def.name) */
function _getFighterType(def) {
  if (!def) return '';
  return (def.type || def.characterId || def.name || '').toString().toLowerCase();
}

/** Audio SFX Trigger Helper for Face-Off Sequences */
export function triggerFaceOffSFX(soundName, volume = 0.25) {
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX(soundName, volume);
  }
}

/**
 * Screenshot saved popup notification toast.
 */
function drawSavedToast(ctx, width, height, timer, leftColor = '#38bdf8', rightColor = '#e51a2e') {
  const alpha = Math.min(1.0, timer / 20);
  const toastW = 300;
  const toastH = 42;
  const toastX = width / 2 - toastW / 2;
  const toastY = 88;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Solid comic drop shadow
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(toastX + 4, toastY + 4, toastW, toastH);

  ctx.fillStyle = '#11141E';
  ctx.strokeStyle = rightColor || '#E52521';
  ctx.lineWidth = 2.0;
  drawChamferedRect(ctx, toastX, toastY, toastW, toastH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Rajdhani", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📸 THUMBNAIL PNG SAVED TO DOWNLOADS!', width / 2, toastY + toastH / 2);

  ctx.restore();
}

/**
 * Direct full-resolution PNG capture & download for YouTube / Showcase thumbnails.
 * Guarantees that any transient toast notifications are cleanly excluded from the saved PNG.
 */
export function captureFaceOffScreenshot() {
  const canvas = state.canvas;
  if (!canvas) return;
  try {
    state._isCapturingThumbnail = true;
    drawFaceOffThumbnailScreen();

    const dataUrl = canvas.toDataURL('image/png');
    state._isCapturingThumbnail = false;

    const currentDefs = getActiveFighterDefs();
    const isGauntlet = (state.mode === 'TLFS' || state.mode === GAME_MODES.TLFS || state.mode === 'GAUNTLET' || state.mode === 'Gauntlet');
    const p1Name = currentDefs[state.p1Index]?.name || 'Fighter-1';
    const p2Name = isGauntlet ? 'challengers' : (currentDefs[state.p2Index]?.name || 'Fighter-2');
    const modeName = isGauntlet ? 'gauntlet' : (state.mode || '1v1').toLowerCase().replace(/\s+/g, '-');
    const fileName = `circle-battle-${modeName}-${p1Name}-vs-${p2Name}.png`.toLowerCase().replace(/\s+/g, '-');

    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.showSaveImageDialog === 'function') {
      window.electronAPI.showSaveImageDialog({ defaultName: fileName, base64Data: dataUrl }).then((res) => {
        if (res && res.success) {
          state.faceOffSavedToastTimer = 140;
          triggerFaceOffSFX('skill_dash5', 0.25);
        }
      });
      return;
    }

    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();

    state.faceOffSavedToastTimer = 140;
    triggerFaceOffSFX('skill_dash5', 0.25);
  } catch (e) {
    state._isCapturingThumbnail = false;
    console.error('Failed to export thumbnail PNG:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. High-Impact 3D Comic Typography Helper (Rule 11 Compliant)
// ─────────────────────────────────────────────────────────────────────────────
function _draw3DComicText(ctx, text, x, y, font, fillStyle, strokeStyle, strokeW, shadowOffsets, align = 'left') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;

  // 1. Solid Black 3D Extrusion Shadow Passes
  ctx.fillStyle = '#0E0F14';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = strokeW;
  for (const [ox, oy] of shadowOffsets) {
    ctx.strokeText(text, x + ox, y + oy);
    ctx.fillText(text, x + ox, y + oy);
  }

  // 2. Outer Black Manga Ink Border
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = strokeW;
  ctx.strokeText(text, x, y);

  // 3. Crisp Foreground Fill
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Renders high-impact 3D comic fighter titles calibrated to fit within quadrant safe zones.
 * Supports smart multi-word 2-line stacking for long names (e.g. "NAMELESS DEITY" or "ALUCARD & GUNSLINGER")
 * and dynamic auto-scaling to guarantee 100% visibility on mobile FYP feeds.
 */
function _drawFighterQuadrantTitle(ctx, title, cx, cy, maxW = 220, align = 'center') {
  if (!title) return;
  ctx.save();

  // Test single-line fit at bold starting size
  let fontSize = 40;
  ctx.font = `900 italic ${fontSize}px "Outfit", "Arial Black", "Impact", sans-serif`;

  const words = title.trim().split(/\s+/);
  // If multiple words and total width exceeds maxW, stack cleanly across 2 lines
  if (words.length >= 2 && ctx.measureText(title).width > maxW) {
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');

    let subSize = 32;
    ctx.font = `900 italic ${subSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
    while (subSize > 16 && (ctx.measureText(line1).width > maxW || ctx.measureText(line2).width > maxW)) {
      subSize -= 2;
      ctx.font = `900 italic ${subSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
    }

    const lineH = subSize * 1.10;
    const fontStr = `900 italic ${subSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
    _draw3DComicText(ctx, line1, cx, cy - lineH * 0.52, fontStr, '#FFFFFF', '#0E0F14', 7, [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], align);
    _draw3DComicText(ctx, line2, cx, cy + lineH * 0.52, fontStr, '#FFFFFF', '#0E0F14', 7, [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], align);
  } else {
    // Single line: auto-scale down if still exceeding maxW
    while (fontSize > 16 && ctx.measureText(title).width > maxW) {
      fontSize -= 2;
      ctx.font = `900 italic ${fontSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
    }
    const fontStr = `900 italic ${fontSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
    _draw3DComicText(ctx, title, cx, cy, fontStr, '#FFFFFF', '#0E0F14', 7, [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], align);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Manga Panel Texture Helpers (Halftone Screentones, Speed Needles, Tonbo Marks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws a 4-point filled needle polygon conforming strictly to Rule 16
 * (sharp trailing tip, swelling body, sharp leading tip).
 */
function _drawMangaSpeedNeedle(ctx, x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const nx = -dy / len;
  const ny = dx / len;
  const halfThick = thickness * 0.5;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + dx * 0.45 + nx * halfThick, y1 + dy * 0.45 + ny * halfThick);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x1 + dx * 0.45 - nx * halfThick, y1 + dy * 0.45 - ny * halfThick);
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders an authentic manga halftone / Ben-Day screentone dot matrix across a clipped polygon panel.
 * Uses a single beginPath() / fill() batch for optimal 60 FPS performance.
 */
function _drawMangaHalftoneScreentone(ctx, polygon, dotColor = 'rgba(14, 15, 20, 0.16)', stepX = 13.0, stepY = 11.0, dotR = 1.8) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  let minX = polygon[0][0], maxX = polygon[0][0];
  let minY = polygon[0][1], maxY = polygon[0][1];
  for (let i = 1; i < polygon.length; i++) {
    if (polygon[i][0] < minX) minX = polygon[i][0];
    if (polygon[i][0] > maxX) maxX = polygon[i][0];
    if (polygon[i][1] < minY) minY = polygon[i][1];
    if (polygon[i][1] > maxY) maxY = polygon[i][1];
  }

  ctx.fillStyle = dotColor;
  ctx.beginPath();
  let row = 0;
  for (let py = minY - stepY; py <= maxY + stepY; py += stepY) {
    const offsetX = (row % 2 === 1) ? stepX * 0.5 : 0;
    for (let px = minX - stepX + offsetX; px <= maxX + stepX; px += stepX) {
      ctx.moveTo(px + dotR, py);
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
    }
    row++;
  }
  ctx.fill();

  ctx.restore();
}

/**
 * Renders dynamic manga focus speed needle clusters (Shūchū-sen) radiating from behind the cards.
 */
function _drawMangaFocusNeedles(ctx, cx, cy, polygon, lines) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  for (let i = 0; i < lines.length; i++) {
    const [ang, r1, r2, thick, col] = lines[i];
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const x1 = cx + cosA * r1;
    const y1 = cy + sinA * r1;
    const x2 = cx + cosA * r2;
    const y2 = cy + sinA * r2;
    _drawMangaSpeedNeedle(ctx, x1, y1, x2, y2, thick, col);
  }

  ctx.restore();
}

/**
 * Draws fine manga kakeami (カケアミ) ink cross-hatching in corners.
 */
function _drawMangaKakeamiHatching(ctx, startX, startY, endX, endY, angleDeg, spacing, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const len = Math.hypot(endX - startX, endY - startY) * 0.65;

  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  const diag = Math.hypot(width, height);

  ctx.rect(Math.min(startX, endX), Math.min(startY, endY), width, height);
  ctx.clip();

  for (let d = -diag; d <= diag; d += spacing) {
    const ox = (startX + endX) / 2 + (-sinA) * d;
    const oy = (startY + endY) / 2 + cosA * d;
    ctx.moveTo(ox - cosA * len, oy - sinA * len);
    ctx.lineTo(ox + cosA * len, oy + sinA * len);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draws authentic serialized manga manuscript guide marks (トンボ Tonbo registration marks & outer panel frame).
 */
function _drawMangaManuscriptMarks(ctx, width, height) {
  ctx.save();

  // 1. Outer Inked Comic Panel Border
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 3.0;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Inner White Inset Hairline
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  // 2. Tonbo Manuscript Registration Marks (L-brackets at corners and edge center ticks)
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;
  ctx.beginPath();

  // Top-Left L-bracket
  ctx.moveTo(4, 12); ctx.lineTo(24, 12);
  ctx.moveTo(12, 4); ctx.lineTo(12, 24);

  // Top-Right L-bracket
  ctx.moveTo(width - 24, 12); ctx.lineTo(width - 4, 12);
  ctx.moveTo(width - 12, 4);  ctx.lineTo(width - 12, 24);

  // Bottom-Left L-bracket
  ctx.moveTo(4, height - 12); ctx.lineTo(24, height - 12);
  ctx.moveTo(12, height - 24); ctx.lineTo(12, height - 4);

  // Bottom-Right L-bracket
  ctx.moveTo(width - 24, height - 12); ctx.lineTo(width - 4, height - 12);
  ctx.moveTo(width - 12, height - 24); ctx.lineTo(width - 12, height - 4);

  // Edge Center Registration Cross Ticks
  const midX = width / 2;
  const midY = height / 2;
  ctx.moveTo(midX, 2);  ctx.lineTo(midX, 14);
  ctx.moveTo(midX, height - 14); ctx.lineTo(midX, height - 2);
  ctx.moveTo(2, midY);  ctx.lineTo(14, midY);
  ctx.moveTo(width - 14, midY); ctx.lineTo(width - 2, midY);

  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Full-Bleed Diagonal Split Background & Manga Panel Texture
// ─────────────────────────────────────────────────────────────────────────────
function _drawFullBleedBackground(ctx, width, height, p1Def, p2Def, splitY1, splitY2) {
  ctx.save();

  const topPolygon = [
    [0, 0],
    [width, 0],
    [width, splitY2],
    [0, splitY1]
  ];

  const botPolygon = [
    [0, splitY1],
    [width, splitY2],
    [width, height],
    [0, height]
  ];

  // ── UPPER HALF: Player 1 Theme (Gold & Amber baseline reference) ─────────
  const p1Type = _getFighterType(p1Def);
  const isP1Gold = p1Type === 'ash' || p1Type === 'zenitsu' || p1Type === 'escanor';

  const topGrad = ctx.createLinearGradient(0, 0, width, splitY2);
  if (isP1Gold) {
    topGrad.addColorStop(0.0, '#FCD34D');
    topGrad.addColorStop(0.45, '#F59E0B');
    topGrad.addColorStop(1.0, '#D97706');
  } else {
    const baseColor = getFaceOffThemeColor(p1Def, '#F59E0B');
    topGrad.addColorStop(0.0, '#FFFFFF');
    topGrad.addColorStop(0.2, baseColor);
    topGrad.addColorStop(1.0, getDarkThemeTone(baseColor, 0.45));
  }

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, splitY2);
  ctx.lineTo(0, splitY1);
  ctx.closePath();
  ctx.fillStyle = topGrad;
  ctx.fill();

  // ── LOWER HALF: Player 2 Theme (Fighter Signature Color) ────────────────
  const p2Type = _getFighterType(p2Def);
  const isP2Gold = p2Type === 'ash' || p2Type === 'zenitsu' || p2Type === 'escanor';
  const bothGold = isP1Gold && isP2Gold; // Only force contrast if BOTH fighters share yellow/gold

  const botGrad = ctx.createLinearGradient(0, splitY1, width, height);
  if (bothGold) {
    // Mirror clash: Both are gold (e.g. Zenitsu vs Escanor), give P2 high-contrast crimson
    botGrad.addColorStop(0.0, '#EF4444');
    botGrad.addColorStop(0.45, '#DC2626');
    botGrad.addColorStop(1.0, '#991B1B');
  } else if (isP2Gold) {
    // Zenitsu / Ash / Escanor as Player 2 gets authentic Lightning Gold & Amber!
    botGrad.addColorStop(0.0, '#FDE68A');
    botGrad.addColorStop(0.45, '#F59E0B');
    botGrad.addColorStop(1.0, '#B45309');
  } else {
    // Dynamic theme color driven directly by P2's configuration
    const baseColor = getFaceOffThemeColor(p2Def, '#DC2626');
    botGrad.addColorStop(0.0, baseColor);
    botGrad.addColorStop(0.65, getDarkThemeTone(baseColor, 0.55));
    botGrad.addColorStop(1.0, getDarkThemeTone(baseColor, 0.25));
  }

  ctx.beginPath();
  ctx.moveTo(0, splitY1);
  ctx.lineTo(width, splitY2);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = botGrad;
  ctx.fill();

  // ── MANGA HALFTONE SCREENTONE TEXTURE (網点 Amiten) ────────────────────
  _drawMangaHalftoneScreentone(ctx, topPolygon, 'rgba(14, 15, 20, 0.15)', 13.0, 11.0, 1.8);
  _drawMangaHalftoneScreentone(ctx, botPolygon, 'rgba(14, 15, 20, 0.20)', 13.0, 11.0, 1.8);

  // ── RADIAL MANGA FOCUS SPEED NEEDLES (集中線 Shūchū-sen - Rule 16) ──────
  // Card 1 Focus Needles (bursting outward from behind P1 card)
  const p1FocusLines = [
    [-3.10, 110, 370, 2.8, 'rgba(255, 255, 255, 0.28)'],
    [-2.85, 120, 390, 1.8, 'rgba(14, 15, 20, 0.22)'],
    [-2.60, 105, 350, 3.0, 'rgba(255, 255, 255, 0.32)'],
    [-2.35, 115, 410, 2.0, 'rgba(14, 15, 20, 0.20)'],
    [-2.10, 100, 380, 3.2, 'rgba(255, 255, 255, 0.30)'],
    [-1.85, 125, 420, 2.2, 'rgba(14, 15, 20, 0.24)'],
    [-1.60, 110, 400, 3.4, 'rgba(255, 255, 255, 0.35)'],
    [-1.35, 120, 370, 1.9, 'rgba(14, 15, 20, 0.20)'],
    [-1.10, 105, 390, 2.9, 'rgba(255, 255, 255, 0.28)'],
    [-0.85, 115, 350, 2.1, 'rgba(14, 15, 20, 0.22)'],
    [-0.60, 100, 400, 3.2, 'rgba(255, 255, 255, 0.32)'],
    [-0.35, 125, 430, 2.2, 'rgba(14, 15, 20, 0.24)'],
    [-0.10, 110, 380, 2.9, 'rgba(255, 255, 255, 0.28)'],
    [0.15, 120, 350, 1.9, 'rgba(14, 15, 20, 0.20)'],
    [0.40, 105, 400, 3.0, 'rgba(255, 255, 255, 0.30)'],
    [0.65, 115, 370, 2.1, 'rgba(14, 15, 20, 0.22)'],
    [0.90, 100, 340, 2.8, 'rgba(255, 255, 255, 0.28)'],
    [1.15, 120, 360, 2.2, 'rgba(14, 15, 20, 0.24)'],
    [1.40, 110, 330, 2.7, 'rgba(255, 255, 255, 0.26)'],
    [1.65, 105, 310, 1.9, 'rgba(14, 15, 20, 0.20)']
  ];
  _drawMangaFocusNeedles(ctx, 158, 264, topPolygon, p1FocusLines);

  // Card 2 Focus Needles (bursting outward from behind P2 card)
  const p2FocusLines = [
    [-2.80, 110, 350, 2.0, 'rgba(14, 15, 20, 0.24)'],
    [-2.50, 120, 370, 3.0, 'rgba(255, 255, 255, 0.28)'],
    [-2.20, 105, 340, 2.2, 'rgba(14, 15, 20, 0.22)'],
    [-1.90, 115, 380, 3.2, 'rgba(255, 255, 255, 0.30)'],
    [-1.60, 100, 330, 2.1, 'rgba(14, 15, 20, 0.20)'],
    [-1.30, 125, 400, 3.1, 'rgba(255, 255, 255, 0.32)'],
    [-1.00, 110, 360, 2.3, 'rgba(14, 15, 20, 0.24)'],
    [-0.70, 120, 390, 3.3, 'rgba(255, 255, 255, 0.34)'],
    [-0.40, 105, 350, 1.9, 'rgba(14, 15, 20, 0.20)'],
    [-0.10, 115, 380, 2.8, 'rgba(255, 255, 255, 0.28)'],
    [0.20, 100, 400, 3.2, 'rgba(255, 255, 255, 0.32)'],
    [0.50, 125, 420, 2.2, 'rgba(14, 15, 20, 0.24)'],
    [0.80, 110, 390, 2.9, 'rgba(255, 255, 255, 0.29)'],
    [1.10, 120, 370, 2.0, 'rgba(14, 15, 20, 0.22)'],
    [1.40, 105, 400, 3.4, 'rgba(255, 255, 255, 0.34)'],
    [1.70, 115, 380, 2.1, 'rgba(14, 15, 20, 0.20)'],
    [2.00, 100, 410, 3.0, 'rgba(255, 255, 255, 0.30)'],
    [2.30, 120, 360, 2.2, 'rgba(14, 15, 20, 0.24)'],
    [2.60, 110, 390, 2.8, 'rgba(255, 255, 255, 0.28)'],
    [2.90, 105, 340, 1.9, 'rgba(14, 15, 20, 0.20)']
  ];
  _drawMangaFocusNeedles(ctx, 382, 672, botPolygon, p2FocusLines);

  // ── DIAGONAL CLASH MOTION NEEDLES (Parallel to Seam) ───────────────────
  const seamAngle = Math.atan2(splitY2 - splitY1, width);
  const cosS = Math.cos(seamAngle);
  const sinS = Math.sin(seamAngle);
  const normX = -sinS;
  const normY = cosS;

  const seamStreaks = [
    { dist: -90, t: 0.12, len: 210, thick: 2.8, col: 'rgba(255, 255, 255, 0.25)' },
    { dist: -50, t: 0.50, len: 170, thick: 2.0, col: 'rgba(14, 15, 20, 0.22)' },
    { dist: -26, t: 0.22, len: 250, thick: 3.2, col: 'rgba(255, 255, 255, 0.30)' },
    { dist: 26,  t: 0.38, len: 240, thick: 3.0, col: 'rgba(255, 255, 255, 0.28)' },
    { dist: 58,  t: 0.62, len: 190, thick: 2.2, col: 'rgba(14, 15, 20, 0.24)' },
    { dist: 100, t: 0.16, len: 210, thick: 2.6, col: 'rgba(255, 255, 255, 0.22)' }
  ];

  for (let i = 0; i < seamStreaks.length; i++) {
    const s = seamStreaks[i];
    const baseX = s.t * width;
    const baseY = splitY1 + s.t * (splitY2 - splitY1);
    const startX = baseX + normX * s.dist - cosS * (s.len * 0.5);
    const startY = baseY + normY * s.dist - sinS * (s.len * 0.5);
    const endX = baseX + normX * s.dist + cosS * (s.len * 0.5);
    const endY = baseY + normY * s.dist + sinS * (s.len * 0.5);
    _drawMangaSpeedNeedle(ctx, startX, startY, endX, endY, s.thick, s.col);
  }

  // ── CORNER MANGA KAKEAMI INK HATCHING (カケアミ) ───────────────────────
  // Top-Right Outer Inked Hatching (P1 corner)
  _drawMangaKakeamiHatching(ctx, width - 120, 16, width - 16, 120, -35, 7, 'rgba(14, 15, 20, 0.22)');
  // Bottom-Left Outer Inked Hatching (P2 corner)
  _drawMangaKakeamiHatching(ctx, 16, height - 120, 120, height - 16, -35, 7, 'rgba(14, 15, 20, 0.26)');

  // ── THE DIAGONAL MANGA PANEL GUTTER (コマ割り Inked Slice) ─────────────
  // 1. Deep Black Gutter Trench
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-10, splitY1);
  ctx.lineTo(width + 10, splitY2);
  ctx.stroke();

  // 2. Inner White Channel
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-10, splitY1);
  ctx.lineTo(width + 10, splitY2);
  ctx.stroke();

  // 3. Dynamic Manga Slash Accents along Gutter
  ctx.fillStyle = '#0E0F14';
  const gutterTicks = [55, 115, 175, 235, 305, 365, 425, 485];
  for (let i = 0; i < gutterTicks.length; i++) {
    const gx = gutterTicks[i];
    const gy = splitY1 + (gx / width) * (splitY2 - splitY1);
    ctx.beginPath();
    ctx.moveTo(gx - normX * 8 - cosS * 3, gy - normY * 8 - sinS * 3);
    ctx.lineTo(gx + normX * 8 + cosS * 3, gy + normY * 8 + sinS * 3);
    ctx.lineTo(gx + normX * 8 - cosS * 1, gy + normY * 8 - sinS * 1);
    ctx.closePath();
    ctx.fill();
  }

  // ── MANGA MANUSCRIPT MARKS (トンボ Tonbo Registration Marks & Border) ──
  _drawMangaManuscriptMarks(ctx, width, height);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Pokémon TCG Collector Card from Character Card Selection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pre-calibrated organic comic angles, Y-arcs, and desynchronized X-offsets
 * for Gauntlet mode challenger cards. Replaces stiff, spreadsheet-like 2x5 grids
 * with a dynamic, hand-dealt comic battle array where every card has personality.
 */
const GAUNTLET_ANGLES_ROW1 = [-3.8, +2.4, -1.2, +3.2, -2.8];
const GAUNTLET_ANGLES_ROW2 = [+3.0, -2.6, +1.8, -3.4, +3.8];
const GAUNTLET_Y_OFFSETS_ROW1 = [+4, -3, -7, -2, +5];
const GAUNTLET_Y_OFFSETS_ROW2 = [+4, -5, +2, -4, +5];
const GAUNTLET_X_OFFSETS_ROW1 = [-2, +1, 0, -1, +2];
const GAUNTLET_X_OFFSETS_ROW2 = [+3, -2, 0, +2, -3];

/**
 * Computes organic, dynamically fanned and staggered card layout positions for Gauntlet challengers.
 * For <= 5 challengers:
 *  - 1 card: Centered (cx: 270, cy: 660, w: 154, h: 212, angle: +2.2°)
 *  - 2 cards: Dynamic tilted pair (w: 138, h: 188, angles: -2.8°, +2.5°)
 *  - 3 cards: 1 row fanned like a hand of cards (w: 126, h: 172, angles: -3.8°, +0.6°, +3.5°)
 *  - 4 cards: 2 dynamic tiers of counter-angled pairs (w: 126, h: 172)
 *  - 5 cards: 2 rows (2 top flanking center notch at cy: 575, 3 bottom in fanned battle arc at cy: 725, w: 126, h: 172)
 * For 6-10 challengers:
 *  - 2 dynamic tiers of cards with organic angles (-3.8° to +3.8°), parabolic Y-arcs, and desynchronized X-offsets (w: 90, h: 126)
 */
function _getGauntletCardLayouts(count) {
  const layouts = [];
  if (count <= 1) {
    layouts.push({ cx: 270, cy: 660, w: 154, h: 212, angle: 2.2 * Math.PI / 180 });
  } else if (count === 2) {
    layouts.push({ cx: 188, cy: 660, w: 138, h: 188, angle: -2.8 * Math.PI / 180 });
    layouts.push({ cx: 352, cy: 660, w: 138, h: 188, angle: +2.5 * Math.PI / 180 });
  } else if (count === 3) {
    layouts.push({ cx: 124, cy: 664, w: 126, h: 172, angle: -3.8 * Math.PI / 180 });
    layouts.push({ cx: 270, cy: 654, w: 126, h: 172, angle: +0.6 * Math.PI / 180 });
    layouts.push({ cx: 416, cy: 662, w: 126, h: 172, angle: +3.5 * Math.PI / 180 });
  } else if (count === 4) {
    const w = 126, h = 172;
    // Row 1: dynamic fanned pair
    layouts.push({ cx: 194, cy: 582, w, h, angle: -3.2 * Math.PI / 180 });
    layouts.push({ cx: 346, cy: 576, w, h, angle: +2.8 * Math.PI / 180 });
    // Row 2: counter-angled pair
    layouts.push({ cx: 192, cy: 722, w, h, angle: +2.5 * Math.PI / 180 });
    layouts.push({ cx: 348, cy: 728, w, h, angle: -3.0 * Math.PI / 180 });
  } else if (count === 5) {
    const w = 126, h = 172;
    // Row 1: 2 cards flanking center notch with opposing tilts, leaving clearance for VS crest tip
    layouts.push({ cx: 194, cy: 578, w, h, angle: -3.5 * Math.PI / 180 });
    layouts.push({ cx: 346, cy: 572, w, h, angle: +3.0 * Math.PI / 180 });
    // Row 2: 3 cards fanned in an energetic battle arc
    layouts.push({ cx: 122, cy: 728, w, h, angle: -4.0 * Math.PI / 180 });
    layouts.push({ cx: 270, cy: 718, w, h, angle: +0.8 * Math.PI / 180 });
    layouts.push({ cx: 418, cy: 726, w, h, angle: +3.8 * Math.PI / 180 });
  } else {
    // 6 to 10 challengers: 2 dynamic tiers of cards with organic tilts and desynchronized spacing
    const topCount = Math.floor(count / 2);
    const botCount = count - topCount;
    const w = 90, h = 126;
    const gap = 10;

    // Row 1
    const totalW1 = topCount * w + (topCount - 1) * gap;
    const startX1 = (540 - totalW1) / 2 + w / 2;
    for (let i = 0; i < topCount; i++) {
      const pIdx = i % GAUNTLET_ANGLES_ROW1.length;
      const cx = startX1 + i * (w + gap) + GAUNTLET_X_OFFSETS_ROW1[pIdx];
      const cy = 574 + GAUNTLET_Y_OFFSETS_ROW1[pIdx];
      const angle = GAUNTLET_ANGLES_ROW1[pIdx] * Math.PI / 180;
      layouts.push({ cx, cy, w, h, angle });
    }

    // Row 2
    const totalW2 = botCount * w + (botCount - 1) * gap;
    const startX2 = (540 - totalW2) / 2 + w / 2;
    for (let i = 0; i < botCount; i++) {
      const pIdx = i % GAUNTLET_ANGLES_ROW2.length;
      const cx = startX2 + i * (w + gap) + GAUNTLET_X_OFFSETS_ROW2[pIdx];
      const cy = 714 + GAUNTLET_Y_OFFSETS_ROW2[pIdx];
      const angle = GAUNTLET_ANGLES_ROW2[pIdx] * Math.PI / 180;
      layouts.push({ cx, cy, w, h, angle });
    }
  }
  return layouts;
}

/**
 * Renders the authentic Pokémon TCG Collector Card directly from Character Selection.
 * Features:
 * - High-impact solid black 3D drop shadow
 * - Full-art stage with grade-driven radiant aura and 16-bit sprite showcase
 * - Classic TCG Top Header Bar: [BASIC] + Name + HP + Energy Orb
 * - Top-left wedge rarity banner (e.g. SS ★★★)
 * - Lower Ability Capsule + Attack Move + Energy Pips + Set Number
 * - Prismatic Metallic / Holographic Foil Frame with corner diamond sparkles
 */
function _drawFighterCollectorCard(ctx, cx, cy, w, h, angle, def, idx) {
  if (!def) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (angle) ctx.rotate(angle);

  // Solid Black 3D Comic Drop Shadow underneath the TCG card
  const shadowOffX = Math.max(2, Math.round(w * 0.025));
  const shadowOffY = Math.max(3, Math.round(h * 0.025));
  const cornerR = Math.min(8, Math.round(w * 0.05));
  ctx.fillStyle = '#0E0F14';
  drawChamferedRect(ctx, -w / 2 + shadowOffX, -h / 2 + shadowOffY, w, h, cornerR);
  ctx.fill();

  // Draw the official Pokémon TCG Collector Card from Character Select
  drawCollectorFighterCard(
    ctx,
    def,
    idx,
    -w / 2,
    -h / 2,
    w,
    h,
    false,
    null
  );

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Center Diamond-Faceted Anime Battle "VS" Duel Crest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws an aggressive, chiseled diamond-faceted anime battle duel crest
 * with dual-tone signature aura bevels, radiant electrum gold core,
 * and high-impact interlocking 3D "VS" comic lettering.
 */
function _drawCenterVsBadge(ctx, cx, cy, rot, leftColor = '#38BDF8', rightColor = '#F59E0B') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const w = 118;
  const h = 72;
  const tipX = 14; // Arrow spikes extending horizontally along the seam

  // Helper: Traces the 8-sided faceted diamond duel crest
  const traceVsCrest = (inset = 0) => {
    const hw = w / 2 - inset;
    const hh = h / 2 - inset;
    const tx = tipX - inset * 0.35;
    const chamferX = hw * 0.50;

    ctx.beginPath();
    ctx.moveTo(-hw - tx, 0);              // Left diamond arrow tip
    ctx.lineTo(-chamferX, -hh);           // Top-left shoulder
    ctx.lineTo(0, -hh - 2);               // Top crown point
    ctx.lineTo(chamferX, -hh);            // Top-right shoulder
    ctx.lineTo(hw + tx, 0);               // Right diamond arrow tip
    ctx.lineTo(chamferX, hh);             // Bottom-right shoulder
    ctx.lineTo(0, hh + 2);                // Bottom crown point
    ctx.lineTo(-chamferX, hh);            // Bottom-left shoulder
    ctx.closePath();
  };

  // 1. Solid Pitch-Black 3D Extruded Drop Shadow (+5.5px, +7.5px)
  ctx.save();
  ctx.translate(5.5, 7.5);
  traceVsCrest(0);
  ctx.fillStyle = '#08090C';
  ctx.fill();
  ctx.restore();

  // 2. Heavy Outer Manga Ink Boundary (#0E0F14, lineWidth 4.5)
  traceVsCrest(0);
  ctx.fillStyle = '#0E0F14';
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // 3. Two-Tone Thematic Clash Bevel Frame (P1 leftColor vs P2 rightColor)
  ctx.save();
  traceVsCrest(2.2);
  ctx.clip();

  // Left side: P1 signature aura color
  ctx.beginPath();
  ctx.rect(-w, -h, w, h * 2);
  const leftGrad = ctx.createLinearGradient(-w / 2, 0, 0, 0);
  leftGrad.addColorStop(0.0, leftColor || '#38BDF8');
  leftGrad.addColorStop(0.7, '#FFFFFF');
  leftGrad.addColorStop(1.0, '#CBD5E1');
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // Right side: P2 signature aura color
  ctx.beginPath();
  ctx.rect(0, -h, w, h * 2);
  const rightGrad = ctx.createLinearGradient(0, 0, w / 2, 0);
  rightGrad.addColorStop(0.0, '#CBD5E1');
  rightGrad.addColorStop(0.3, '#FFFFFF');
  rightGrad.addColorStop(1.0, rightColor || '#F59E0B');
  ctx.fillStyle = rightGrad;
  ctx.fill();

  // Vertical center division seam
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(0, h);
  ctx.stroke();
  ctx.restore();

  // 4. Inner Radiant Electrum Gold & Molten Amber Core
  ctx.save();
  traceVsCrest(5.5);
  ctx.clip();

  const coreGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  coreGrad.addColorStop(0.00, '#FFFDE0'); // Incandescent light gold
  coreGrad.addColorStop(0.24, '#FFE600'); // Radiant solar gold
  coreGrad.addColorStop(0.55, '#FF9900'); // Molten amber
  coreGrad.addColorStop(0.85, '#D97706'); // Deep amber
  coreGrad.addColorStop(1.00, '#78350F'); // Bronze base shadow
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Subtle diagonal speed cuts across gold plate
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(-w / 2, -12, w, 2.5);
  ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.fillRect(-w / 2, 8, w, 2.0);

  ctx.restore();

  // 5. Crisp Inner Chrome Hairline
  traceVsCrest(5.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 6. Flanking Sharp Speed Cuts on the side tips
  const drawTipChevron = (tipSign) => {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(tipSign * (w / 2 + tipX - 2), 0);
    ctx.lineTo(tipSign * (w / 2 + 3), -5);
    ctx.lineTo(tipSign * (w / 2 + 5), 0);
    ctx.lineTo(tipSign * (w / 2 + 3), 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawTipChevron(-1);
  drawTipChevron(1);

  // 7. Visceral Chiseled Manga "VS" Typography
  _draw3DComicText(
    ctx,
    'VS',
    0,
    1.5,
    '900 italic 44px "Outfit", "Arial Black", "Impact", sans-serif',
    '#FFFFFF',
    '#08090C',
    8.5,
    [[1.5, 1.5], [3.0, 3.0], [4.5, 4.5], [6.0, 6.0]],
    'center'
  );

  // Specular top highlight on letters
  ctx.save();
  ctx.font = '900 italic 44px "Outfit", "Arial Black", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF8D0';
  ctx.fillText('VS', -0.8, -1.2);
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Bottom-Left Challenger Banner ("WHO WILL TAKE THE L?" & Match Mode Tag)
// ─────────────────────────────────────────────────────────────────────────────

// High-CTR YouTube Shorts Viral Hooks
export const THUMBNAIL_HOOKS = [
  'WHO WILL TAKE THE L?', // Primary: High-engagement gaming & anime showdown hook
  'WHO SURVIVES?',        // Intense anime deathmatch hook
  'WHO IS STRONGER?',     // Powerscaling / debate driver
  'THE STRONGEST?',       // Manga clash homage
  'FINAL SHOWDOWN',       // Cinematic tournament climax
];

/**
 * Draws the redesigned bottom-left challenger banner:
 *  - Top: Angled Cyber-Manga Strike Ribbon with customizable high-CTR hook (default: "WHO WILL TAKE THE L?")
 *  - Bottom: Tactical Frosted Titanium Match Slab with clean mode label (zero "MT. SILVER")
 */
function _drawBottomLeftBanner(ctx, x, y, modeTagText = 'STAND OFF DUEL', hookText = null) {
  ctx.save();

  const hookIdx = (typeof state._thumbnailHookIndex === 'number') ? state._thumbnailHookIndex : 0;
  const currentHook = hookText || THUMBNAIL_HOOKS[hookIdx % THUMBNAIL_HOOKS.length] || 'WHO WILL TAKE THE L?';

  // ── 1. Redesigned Cyber-Manga Strike Ribbon (Top Hook Banner) ─────────────
  const redW = 212;
  const redH = 40;
  const slantX = 14;
  const notch = 7;

  // Solid Black 3D Drop Shadow (+5px, +6px)
  ctx.fillStyle = '#08090C';
  ctx.beginPath();
  ctx.moveTo(x + notch + 5, y + 6);
  ctx.lineTo(x + redW + 5, y + 6);
  ctx.lineTo(x + redW - slantX + 5, y + redH + 6);
  ctx.lineTo(x - slantX + 5, y + redH + 6);
  ctx.lineTo(x - slantX + 5, y + notch + 6);
  ctx.closePath();
  ctx.fill();

  // Outer Manga Border (#0E0F14, lineWidth 4.0)
  ctx.beginPath();
  ctx.moveTo(x + notch, y);
  ctx.lineTo(x + redW, y);
  ctx.lineTo(x + redW - slantX, y + redH);
  ctx.lineTo(x - slantX, y + redH);
  ctx.lineTo(x - slantX, y + notch);
  ctx.closePath();

  // Dynamic Crimson-to-Ruby Core Gradient
  const redGrad = ctx.createLinearGradient(x, y, x + redW, y + redH);
  redGrad.addColorStop(0.00, '#FF2252'); // Electric rose crimson
  redGrad.addColorStop(0.40, '#DC2626'); // Radiant red
  redGrad.addColorStop(1.00, '#991B1B'); // Deep ruby
  ctx.fillStyle = redGrad;
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 4.0;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // Top Specular Sheen Beam across upper third
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(x + notch + 2, y + 2, redW - notch - 16, 2.0);

  // Left Tactical Hazard Chevrons (/// in Gold)
  ctx.fillStyle = '#FFD700';
  for (let ci = 0; ci < 3; ci++) {
    const cx0 = x + 4 + ci * 6;
    ctx.beginPath();
    ctx.moveTo(cx0 + 3, y + 8);
    ctx.lineTo(cx0 + 6, y + 8);
    ctx.lineTo(cx0 + 2, y + redH - 8);
    ctx.lineTo(cx0 - 1, y + redH - 8);
    ctx.closePath();
    ctx.fill();
  }

  // Auto-scale font size dynamically to fit comfortably within the ribbon
  let hookFontSize = 19.5;
  const maxHookW = redW - notch - slantX - 28;
  ctx.font = `900 italic ${hookFontSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
  while (hookFontSize > 13 && ctx.measureText(currentHook).width > maxHookW) {
    hookFontSize -= 0.5;
    ctx.font = `900 italic ${hookFontSize}px "Outfit", "Arial Black", "Impact", sans-serif`;
  }

  // Bold Italic 3D Comic Hook Typography
  _draw3DComicText(
    ctx,
    currentHook,
    x + (redW / 2) + 7 - (slantX / 2),
    y + redH / 2 + 0.5,
    `900 italic ${hookFontSize}px "Outfit", "Arial Black", "Impact", sans-serif`,
    '#FFFFFF',
    '#08090C',
    5.2,
    [[1.5, 1.5], [3.0, 3.0]],
    'center'
  );

  // ── 2. Redesigned Tactical Frosted Titanium Slab (Bottom Mode Tag) ────────
  const whiteY = y + redH + 8;
  const whiteW = 210;
  const whiteH = 32;
  const whiteSlant = 11;

  // Solid Black 3D Drop Shadow (+5px, +6px)
  ctx.fillStyle = '#08090C';
  ctx.beginPath();
  ctx.moveTo(x + 5, whiteY + 6);
  ctx.lineTo(x + whiteW + 5, whiteY + 6);
  ctx.lineTo(x + whiteW - whiteSlant + 5, whiteY + whiteH + 6);
  ctx.lineTo(x + 5, whiteY + whiteH + 6);
  ctx.closePath();
  ctx.fill();

  // Frosted Brushed Titanium Slab
  ctx.beginPath();
  ctx.moveTo(x, whiteY);
  ctx.lineTo(x + whiteW, whiteY);
  ctx.lineTo(x + whiteW - whiteSlant, whiteY + whiteH);
  ctx.lineTo(x, whiteY + whiteH);
  ctx.closePath();

  const platGrad = ctx.createLinearGradient(x, whiteY, x, whiteY + whiteH);
  platGrad.addColorStop(0.00, '#FFFFFF'); // Clean top reflection
  platGrad.addColorStop(0.35, '#F8FAFC'); // Frosted white
  platGrad.addColorStop(0.80, '#E2E8F0'); // Titanium platinum
  platGrad.addColorStop(1.00, '#CBD5E1'); // Grounded metal
  ctx.fillStyle = platGrad;
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 4.0;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // Left Golden Tactical Edge Tab
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(x + 1.5, whiteY + 1.5, 4.5, whiteH - 3.0);

  // Clean Bold Charcoal Typography (NEVER containing "MT. SILVER")
  ctx.fillStyle = '#0E0F14';
  ctx.font = '900 13px "Outfit", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(modeTagText, x + (whiteW / 2) + 3 - (whiteSlant / 2), whiteY + whiteH / 2 + 0.5);

  ctx.restore();

  // Interactive Click Region: Register button so clicking the banner cycles through viral hooks!
  _registerButton(x - slantX, y, Math.max(redW, whiteW) + slantX, redH + whiteH + 8, () => {
    state._thumbnailHookIndex = ((state._thumbnailHookIndex || 0) + 1) % THUMBNAIL_HOOKS.length;
    triggerFaceOffSFX('menu_select', 0.25);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Main Render Entry Point (Strictly Driven by state.mode)
// ─────────────────────────────────────────────────────────────────────────────
export function drawFaceOffThumbnailScreen() {
  const { ctx, canvas } = state;
  _clearButtons();

  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0; // Strictly Rule 11 compliant

  const width = canvas.width;
  const height = canvas.height;

  // Full-screen click proceeds to countdown
  _registerButton(0, 0, width, height, () => {
    proceedFromFaceOffToCountdown();
  });

  // ── 1. Resolve Active Game Mode directly from state.mode ──────────────────
  const activeMode = state.mode || GAME_MODES.ONE_VS_ONE;

  const is1v1 = (
    activeMode === '1v1' ||
    activeMode === GAME_MODES.ONE_VS_ONE ||
    activeMode === 'Stand Off' ||
    activeMode === GAME_MODES.STAND_OFF ||
    activeMode === GAME_MODES.HORIZONTAL_1V1 ||
    activeMode === '1v1 Widescreen Duel' ||
    !state.mode
  );

  const is1v2 = (
    activeMode === '1v2' ||
    activeMode === GAME_MODES.ONE_VS_TWO ||
    activeMode === '1v2 Stand Off' ||
    activeMode === GAME_MODES.STAND_OFF_1V2 ||
    (activeMode === 'Boss Battle' && !state.bossBattleNoTeammate)
  );

  const is2v2 = (
    activeMode === '2v2' ||
    activeMode === GAME_MODES.TWO_VS_TWO ||
    activeMode === '2v2v2v2 Quad' ||
    activeMode === GAME_MODES.TEAMFIGHT_2V2V2V2
  );

  const isTag = (
    activeMode === 'Tag Match' ||
    activeMode === GAME_MODES.TAG_MATCH ||
    activeMode === 'TAG_MATCH'
  );

  const isBoss = (
    activeMode === 'Boss Battle' ||
    activeMode === GAME_MODES.BOSS_BATTLE
  );

  const isSurvivor = (
    activeMode === 'Survivor' ||
    activeMode === GAME_MODES.SURVIVOR
  );

  const isGauntlet = (
    activeMode === 'TLFS' ||
    activeMode === GAME_MODES.TLFS ||
    activeMode === 'GAUNTLET' ||
    activeMode === 'Gauntlet'
  );
  const challengers = isGauntlet ? getGauntletChallengers() : null;

  // ── 2. Resolve Active Combatant Definitions ──────────────────────────────
  const currentDefs = getActiveFighterDefs();
  const p1Idx = (typeof state.p1Index === 'number') ? state.p1Index : 0;
  const p2Idx = (typeof state.p2Index === 'number') ? state.p2Index : 1;
  const p3Idx = (typeof state.p3Index === 'number') ? state.p3Index : 2;
  const p4Idx = (typeof state.p4Index === 'number') ? state.p4Index : 3;

  const p1Def = currentDefs[p1Idx] || currentDefs[0] || FIGHTER_DEFS[0];
  const p2Def = currentDefs[p2Idx] || currentDefs[1] || currentDefs[0];
  const p3Def = currentDefs[p3Idx] || currentDefs[2];
  const p4Def = currentDefs[p4Idx] || currentDefs[3];

  // ── 3. Full-Bleed Diagonal Split Background ──────────────────────────────
  const splitY1 = height * 0.59; // Left edge split ~566px
  const splitY2 = height * 0.39; // Right edge split ~374px
  _drawFullBleedBackground(ctx, width, height, p1Def, p2Def, splitY1, splitY2);

  // ── 4. Player 1 Title Typography (P1 Name or Team Name) ──────────────────
  let p1Title = isGauntlet ? 'PLAYER' : p1Def.name.toUpperCase();
  if (is2v2 && p3Def) {
    p1Title = `${p1Def.name.toUpperCase()} & ${p3Def.name.toUpperCase()}`;
    // 2v2 Mode: Centered above dual cards, lowered safely away from top crop
    _drawFighterQuadrantTitle(ctx, p1Title, width / 2, 108, 460, 'center');
  } else {
    // 1v1, 1v2, & Gauntlet Mode: Placed in Top-Right Quadrant (opposing Card 1) inside FYP safe zone
    _drawFighterQuadrantTitle(ctx, p1Title, 405, 240, 220, 'center');
  }

  // ── 5. Official Pokémon TCG Collector Cards from Character Select ─────────
  if (is2v2 && p3Def) {
    // 2v2 Mode: Team Red (P1 & P3) vs Team Blue (P2 & P4) — Scaled up for clarity
    _drawFighterCollectorCard(ctx, 136, 258, 154, 212, -2.5 * Math.PI / 180, p1Def, p1Idx);
    _drawFighterCollectorCard(ctx, 304, 258, 154, 212, 1.5 * Math.PI / 180, p3Def, p3Idx);

    const p4Actual = p4Def || currentDefs[3] || p2Def;
    _drawFighterCollectorCard(ctx, 236, 668, 154, 212, -1.5 * Math.PI / 180, p2Def, p2Idx);
    _drawFighterCollectorCard(ctx, 404, 668, 154, 212, 2.0 * Math.PI / 180, p4Actual, p4Idx);
  } else if (is1v2 && p3Def) {
    // 1v2 Mode: Solo Challenger (P1) vs Duo Team (P2 & P3)
    _drawFighterCollectorCard(ctx, 158, 264, 236, 314, -2.5 * Math.PI / 180, p1Def, p1Idx);

    _drawFighterCollectorCard(ctx, 236, 668, 154, 212, -1.5 * Math.PI / 180, p2Def, p2Idx);
    _drawFighterCollectorCard(ctx, 404, 668, 154, 212, 2.0 * Math.PI / 180, p3Def, p3Idx);
  } else if (isGauntlet && challengers && challengers.length > 0) {
    // Gauntlet Mode: Player 1 Hero Card vs All Selected Challengers (5 to 10)
    _drawFighterCollectorCard(ctx, 158, 264, 236, 314, -2.5 * Math.PI / 180, p1Def, p1Idx);

    const layouts = _getGauntletCardLayouts(challengers.length);
    for (let i = 0; i < challengers.length; i++) {
      const cDef = challengers[i];
      const cIdx = (state.tlfsRoster && typeof state.tlfsRoster[i] === 'number')
        ? state.tlfsRoster[i]
        : (currentDefs.indexOf(cDef) !== -1 ? currentDefs.indexOf(cDef) : i);
      const pos = layouts[i] || layouts[layouts.length - 1];
      _drawFighterCollectorCard(ctx, pos.cx, pos.cy, pos.w, pos.h, pos.angle || 0, cDef, cIdx);
    }
  } else {
    // 1v1 Mode (Default, Stand Off, Tag Match Anchor, Boss Solo, Survivor):
    // Heroic, large, prominent Pokémon TCG Collector Cards displaying crystal-clear card details
    // Positioned with guaranteed clearance so the center VS badge NEVER covers the bottom card or Grade badge
    _drawFighterCollectorCard(ctx, 158, 264, 236, 314, -2.5 * Math.PI / 180, p1Def, p1Idx);
    _drawFighterCollectorCard(ctx, 382, 672, 236, 314, 2.2 * Math.PI / 180, p2Def, p2Idx);
  }

  // ── 6. Center Diamond-Faceted "VS" Duel Crest ────────────────────────────
  const vsRot = Math.atan2(splitY2 - splitY1, width); // Aligned directly with the seam line
  const leftColor = getFaceOffThemeColor(p1Def, '#38BDF8');
  const rightColor = getFaceOffThemeColor(p2Def, '#F59E0B');
  _drawCenterVsBadge(ctx, width / 2, (splitY1 + splitY2) / 2 - 6, vsRot, leftColor, rightColor);

  // ── 7. Player 2 Title Typography (P2 Name or Team Name) ───────────────────
  let p2Title = p2Def.name.toUpperCase();
  if (is2v2 && p4Def) {
    p2Title = `${p2Def.name.toUpperCase()} & ${p4Def.name.toUpperCase()}`;
  } else if (is1v2 && p3Def) {
    p2Title = `${p2Def.name.toUpperCase()} & ${p3Def.name.toUpperCase()}`;
  } else if (isGauntlet) {
    p2Title = 'CHALLENGERS';
  } else if (isSurvivor) {
    p2Title = 'THE HORDE';
  }

  if (isGauntlet) {
    const titleY = (challengers && challengers.length > 5) ? 848 : 865;
    _drawFighterQuadrantTitle(ctx, p2Title, width / 2, titleY, 460, 'center');
  } else if (is2v2 || (is1v2 && p3Def)) {
    // Team modes with dual cards at bottom: Centered below cards, raised safely away from bottom crop
    _drawFighterQuadrantTitle(ctx, p2Title, width / 2, 820, 440, 'center');
  } else {
    // 1v1 Mode: Placed in Bottom-Left Quadrant (opposing Card 2) inside FYP safe zone
    _drawFighterQuadrantTitle(ctx, p2Title, 140, 690, 220, 'center');
  }

  // ── 8. Bottom-Left Challenger Banner ("WHO WILL TAKE THE L?" & Match Mode Tag) ──────
  // Hidden per user request to keep the thumbnail clean, spacious, and focused on the cards
  if (Boolean(state.showThumbnailBanners)) {
    let modeTag = '1 VS 1 SHOWDOWN';

    if (is2v2) {
      modeTag = '2 VS 2 TEAM CLASH';
    } else if (is1v2) {
      modeTag = '1 VS 2 HANDICAP DUEL';
    } else if (isTag) {
      modeTag = 'TAG TEAM RELAY';
    } else if (isGauntlet) {
      modeTag = `GAUNTLET 1 VS ${challengers ? challengers.length : 5}`;
    } else if (isBoss) {
      modeTag = 'SUPREME BOSS RAID';
    } else if (isSurvivor) {
      modeTag = 'SURVIVOR HORDE CLASH';
    } else if (activeMode === 'Stand Off' || activeMode === GAME_MODES.STAND_OFF) {
      modeTag = 'STAND OFF DUEL';
    }

    _drawBottomLeftBanner(ctx, 32, 628, modeTag);
  }

  // ── 9. Saved Toast Notification (only shown briefly on pressing S) ───────
  if (!state._isCapturingThumbnail && state.faceOffSavedToastTimer > 0) {
    const leftColor = getFaceOffThemeColor(p1Def, '#F59E0B');
    const rightColor = getFaceOffThemeColor(p2Def, '#DC2626');
    drawSavedToast(ctx, width, height, state.faceOffSavedToastTimer, leftColor, rightColor);
  }
}
