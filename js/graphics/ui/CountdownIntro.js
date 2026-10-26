// ============================================================================
// COUNTDOWN INTRO SCREEN
// High-Energy Anime "VS" & "WHO WINS?" Pre-Match Cinematic Sequence
// Dynamic Fighter Theme Colors with Clean Slabs, Crisp Frames, and Zero Scratch Lines
// Reference: intro.mp4 (Dual Slanted Theme Slabs + Fighter Portrait Cards + VS Slam)
// ============================================================================
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { Fighter } from '../../entities/fighter.js';
import { _clearButtons, _registerButton } from './uiFramework.js';

// Cache for live fighter preview instances (Pooled by character type to eliminate GC churn)
const _previewFighterCache = {};

function easeOutBack(t) {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getVsScale(t) {
  if (t < 0) return 0;
  if (t < 2) return 1.35;
  if (t < 4) return 0.88;
  if (t < 7) return 1.05;
  return 1.00;
}

function getWhoWinsScale(t) {
  if (t < 0) return 0;
  if (t === 0) return 0.50;
  if (t === 1) return 0.85;
  if (t < 4) return 1.25;
  if (t < 7) return 0.95;
  return 1.00;
}

export function getFaceOffThemeColor(def, fallback = '#38BDF8') {
  if (!def) return fallback;
  if (def.type === 'yuta' || def.id === 23 || def.id === 'yuta') {
    return '#FF1493';
  }
  const charId = def.type || def.id || def.key;
  const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;
  let color = charCfg?.themeColor || def.themeColor || charCfg?.color || def.color || fallback;
  if (typeof color === 'string' && /^[0-9a-fA-F]{3,8}$/.test(color)) {
    color = '#' + color;
  }
  return color;
}

/**
 * Converts a hex or rgb/rgba color string into an { r, g, b } object.
 */
function parseColorToRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return { r: 56, g: 189, b: 248 };
  colorStr = colorStr.trim();

  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
    }
  }

  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return { r: 56, g: 189, b: 248 };
}

/**
 * Blends a vibrant theme color with a dark slate obsidian tone (#0D101A)
 * to produce a sleek, moody, dark anime theme shade that preserves the character's signature hue.
 * @param {string} colorStr - Source theme color (hex or rgb)
 * @param {number} weight - Weight of theme color (0.0 = dark slate #0D101A, 1.0 = raw bright theme color)
 */
export function getDarkThemeTone(colorStr, weight = 0.45) {
  const c = parseColorToRgb(colorStr);
  const baseR = 13;
  const baseG = 16;
  const baseB = 26;
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const r = Math.round(baseR * (1 - clampedWeight) + c.r * clampedWeight);
  const g = Math.round(baseG * (1 - clampedWeight) + c.g * clampedWeight);
  const b = Math.round(baseB * (1 - clampedWeight) + c.b * clampedWeight);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getPreviewFighter(def, targetAngle = 0) {
  if (!def) return null;
  const type = def.type || def.id || 'fighter';
  if (!_previewFighterCache[type]) {
    const FighterClass = (typeof FIGHTER_CLASS_MAP !== 'undefined' && FIGHTER_CLASS_MAP && FIGHTER_CLASS_MAP[type])
      ? FIGHTER_CLASS_MAP[type]
      : Fighter;
    _previewFighterCache[type] = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
  }
  const f = _previewFighterCache[type];
  f.x = 0;
  f.y = 0;
  f.vx = 0;
  f.vy = 0;
  f.z = 0;
  f.angle = targetAngle;
  f.gunAngle = targetAngle;
  f.rightGunAngle = targetAngle;
  f.leftGunAngle = targetAngle;
  f.shootCooldown = 0;
  f.cooldown = 0;
  f.combatAuraOpacity = 1.0;
  f._isFaceOff = true;
  f._isWinnerReveal = false;
  f.hideHpText = true;
  f.hideHands = false;
  f.hideFrontHand = false;
  f.hideBackHand = false;
  f.afterImages = [];
  f.attackCooldown = 0;
  f.attackSwingTimer = 0;

  if (type === 'gojo') {
    f.isMeleeMode = true;
    f.hideWeapon = true;
    f.hideHands = false;
    f.combatAuraOpacity = 1.0;
  } else if (type === 'sukuna' || type === 'yuta' || type === 'yuji') {
    f.combatAuraOpacity = 1.0;
  }
  return f;
}

/**
 * Draws a chamfered polygon path (45-degree angled corner cutouts).
 */
function _drawChamferedRectPath(ctx, x, y, w, h, ch) {
  ch = Math.min(ch, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + ch, y);
  ctx.lineTo(x + w - ch, y);
  ctx.lineTo(x + w, y + ch);
  ctx.lineTo(x + w, y + h - ch);
  ctx.lineTo(x + w - ch, y + h);
  ctx.lineTo(x + ch, y + h);
  ctx.lineTo(x, y + h - ch);
  ctx.lineTo(x, y + ch);
  ctx.closePath();
}

/**
 * Draws a slanted tactical manga placard for character names matching HUD lifebars.
 */
function _drawSlantedNameplate(ctx, cx, cy, width, height, name, themeColor, skewAngle, scaleFactor) {
  ctx.save();
  ctx.translate(cx, cy);

  // 1. 3D Comic Stepped Drop Shadow
  ctx.save();
  ctx.translate(2.5 * scaleFactor, 3.5 * scaleFactor);
  ctx.transform(1, 0, Math.tan(skewAngle), 1, 0, 0);
  ctx.fillStyle = '#050609';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.restore();

  // 2. Placard Main Frame
  ctx.save();
  ctx.transform(1, 0, Math.tan(skewAngle), 1, 0, 0);

  // Dark slate base fill
  ctx.fillStyle = '#0B0E17';
  ctx.fillRect(-width / 2, -height / 2, width, height);

  // Heavy outer manga border
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 2.5 * scaleFactor;
  ctx.strokeRect(-width / 2, -height / 2, width, height);

  // Inner metallic hairline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.0 * scaleFactor;
  ctx.strokeRect(-width / 2 + 1.5, -height / 2 + 1.5, width - 3, height - 3);

  // Bottom theme accent stripe
  ctx.fillStyle = themeColor;
  ctx.fillRect(-width / 2 + 1.5, height / 2 - 3 * scaleFactor, width - 3, 2.5 * scaleFactor);

  ctx.restore();

  // 3. Upright Typography (Unskewed)
  const upperName = (name || 'FIGHTER').toUpperCase();
  const maxTextW = width - 12 * scaleFactor;
  let fontSize = Math.min(Math.round(22 * scaleFactor), Math.round(height * 0.68));
  ctx.font = `900 italic ${fontSize}px "Outfit", "Rajdhani", sans-serif`;
  let textW = ctx.measureText(upperName).width;
  if (textW > maxTextW && maxTextW > 20) {
    fontSize = Math.max(8 * scaleFactor, Math.round(fontSize * (maxTextW / textW)));
    ctx.font = `900 italic ${fontSize}px "Outfit", "Rajdhani", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Thick dark stroke
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5 * scaleFactor;
  ctx.lineJoin = 'round';
  ctx.strokeText(upperName, 0, -0.5 * scaleFactor);

  // Crisp white fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(upperName, 0, -0.5 * scaleFactor);

  ctx.restore();
}

/**
 * Draws a single fighter portrait card with clean theme color fill,
 * solid manga border, upright character model, and slanted tactical nameplate.
 */
function drawFighterCard(ctx, cx, cy, cardW, cardH, def, facingAngle, scaleFactor = 1.0, pIndex = 1) {
  if (!def) return;
  const themeColor = getFaceOffThemeColor(def, (pIndex === 1 ? '#38BDF8' : '#F43F5E'));

  ctx.save();
  ctx.translate(cx, cy);

  // 1. 3D Comic Hard Drop Shadow (Rule 11 compliant)
  ctx.save();
  ctx.translate(4 * scaleFactor, 5 * scaleFactor);
  ctx.fillStyle = '#050609';
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
  ctx.restore();

  // 2. Card Background: Sleek Dark Tactical Slate with Theme-Colored Aura
  const darkCardCore = getDarkThemeTone(themeColor, 0.40);
  const darkCardOuter = '#090B12';
  const bgGrad = ctx.createRadialGradient(0, -cardH * 0.1, 4, 0, 0, cardW * 0.72);
  bgGrad.addColorStop(0.0, darkCardCore); // subtle theme color glow behind head
  bgGrad.addColorStop(0.65, getDarkThemeTone(themeColor, 0.20));
  bgGrad.addColorStop(1.0, darkCardOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

  // Inner subtle metallic theme hairline
  ctx.strokeStyle = getDarkThemeTone(themeColor, 0.65);
  ctx.lineWidth = 1.0 * scaleFactor;
  ctx.strokeRect(-cardW / 2 + 1.5, -cardH / 2 + 1.5, cardW - 3, cardH - 3);

  // 3. Render Upright Pixel Character Model (Clipped to Interior)
  const fighter = getPreviewFighter(def, facingAngle);
  if (fighter) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6);
    ctx.clip();

    ctx.translate(0, 4 * scaleFactor);
    const spriteScale = 2.05 * scaleFactor;
    ctx.scale(spriteScale, spriteScale);
    try {
      fighter.draw(ctx, null);
    } catch (e) {
      if (typeof fighter.drawBody === 'function') fighter.drawBody(ctx);
    }
    ctx.restore();
  }

  // 4. Solid Black Manga Outer Frame (#050609)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

  // 5. Slanted Tactical Manga Nameplate directly below the card
  const nameY = cardH / 2 + 24 * scaleFactor;
  const skew = (facingAngle === 0) ? (-10 * Math.PI / 180) : (10 * Math.PI / 180);
  _drawSlantedNameplate(ctx, 0, nameY, cardW + 18 * scaleFactor, 34 * scaleFactor, def.name, themeColor, skew, scaleFactor);

  ctx.restore();
}

/**
 * Draws the high-impact cyber-manga "VS" badge with metallic duel plate and punch-scale slam.
 */
function drawVsBadge(ctx, cx, cy, timer, scaleFactor, exitP, p1Color, p2Color) {
  if (timer < 44) return;
  const t = timer - 44;
  const vsScale = getVsScale(t);
  if (vsScale <= 0) return;

  ctx.save();
  ctx.translate(cx, cy);

  const exitScale = 1.0 + exitP * 0.45;
  const alpha = Math.max(0, 1 - exitP * 1.6);
  ctx.globalAlpha = alpha;

  ctx.rotate(-0.105); // -6 degree dynamic anime tilt
  const totalScale = vsScale * scaleFactor * exitScale;
  ctx.scale(totalScale, totalScale);

  // 1. Angular Duel Backing Plate (Cyber Manga Hex / Diamond)
  const plateW = 96;
  const plateH = 74;
  const ch = 18;

  // Drop shadow
  ctx.save();
  ctx.translate(3, 4);
  _drawChamferedRectPath(ctx, -plateW / 2, -plateH / 2, plateW, plateH, ch);
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // Plate Body
  _drawChamferedRectPath(ctx, -plateW / 2, -plateH / 2, plateW, plateH, ch);
  ctx.fillStyle = '#090C15';
  ctx.fill();

  // Outer Manga Border
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Left Theme Accent Edge (P1)
  ctx.save();
  ctx.beginPath();
  ctx.rect(-plateW / 2 - 2, -plateH / 2 - 2, plateW / 2 + 2, plateH + 4);
  ctx.clip();
  _drawChamferedRectPath(ctx, -plateW / 2, -plateH / 2, plateW, plateH, ch);
  ctx.strokeStyle = p1Color || '#38BDF8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Right Theme Accent Edge (P2)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -plateH / 2 - 2, plateW / 2 + 2, plateH + 4);
  ctx.clip();
  _drawChamferedRectPath(ctx, -plateW / 2, -plateH / 2, plateW, plateH, ch);
  ctx.strokeStyle = p2Color || '#F43F5E';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Inner Specular Hairline
  _drawChamferedRectPath(ctx, -plateW / 2 + 2.5, -plateH / 2 + 2.5, plateW - 5, plateH - 5, ch - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 2. High-Impact Manga "VS" Lettering
  const fontSize = 54;
  ctx.font = `900 italic ${fontSize}px "Outfit", "Rajdhani", "Impact", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Thick solid manga ink outline
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 14;
  ctx.strokeText('VS', 0, 0);

  // Brushed Electrum Gold Gradient Fill
  const vsGrad = ctx.createLinearGradient(0, -24, 0, 22);
  vsGrad.addColorStop(0.0, '#FFFDE6');
  vsGrad.addColorStop(0.28, '#FFD700');
  vsGrad.addColorStop(0.70, '#F59E0B');
  vsGrad.addColorStop(1.0, '#B45309');
  ctx.fillStyle = vsGrad;
  ctx.fillText('VS', 0, 0);

  // Top/Left Specular Highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('VS', -1, -1.8);

  ctx.restore();
}

/**
 * Draws the tactical manga "WHO WINS?" challenger banner with scale punch-bloom.
 */
function drawWhoWinsBadge(ctx, cx, cy, timer, scaleFactor, exitP, p1Color, p2Color) {
  if (timer < 44) return;
  const t = timer - 44;
  const wwScale = getWhoWinsScale(t);
  if (wwScale <= 0) return;

  ctx.save();
  ctx.translate(cx, cy);

  const exitScale = 1.0 + exitP * 0.40;
  const alpha = Math.max(0, 1 - exitP * 1.6);
  ctx.globalAlpha = alpha;

  const totalScale = wwScale * scaleFactor * exitScale;
  ctx.scale(totalScale, totalScale);

  // "WHO WINS?" Typography (Text Only)
  ctx.font = '900 italic 26px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // 1. Drop shadow for comic pop (Rule 11 compliant)
  ctx.save();
  ctx.translate(2.5, 3.5);
  ctx.fillStyle = '#050609';
  ctx.fillText('WHO WINS?', 0, 0);
  ctx.restore();

  // 2. Solid dark manga outline
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 7;
  ctx.strokeText('WHO WINS?', 0, 0);

  // 3. Pure white fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('WHO WINS?', 0, 0);

  // 4. Top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('WHO WINS?', -0.5, -1);

  ctx.restore();
}

/**
 * Draws the 1v1 Diagonal Slabs, Fighter Cards, VS Slam, and WHO WINS sequence.
 */
function draw1v1CountdownLayout(ctx, width, height, timer, p1Def, p2Def, maxFrames, scaleFactor) {
  const p1Color = getFaceOffThemeColor(p1Def, '#38BDF8');
  const p2Color = getFaceOffThemeColor(p2Def, '#F43F5E');

  // Sequential 1-by-1 Entrance & Exit Interpolation
  const slideDist = Math.max(width, 500) * scaleFactor;

  // Phase 1: Player 1 (Upper-Left Slab) enters frames 0..20
  const p1Prog = Math.max(0, Math.min(1.0, timer / 20));
  const easeP1 = easeOutBack(p1Prog);
  const p1EntryOffset = (1 - easeP1) * slideDist;

  // Phase 2: Player 2 (Lower-Right Slab) enters frames 22..42
  const p2Prog = Math.max(0, Math.min(1.0, (timer - 22) / 20));
  const easeP2 = easeOutBack(p2Prog);
  const p2EntryOffset = (1 - easeP2) * slideDist;

  // Phase 4: Slabs exit slide-out
  const exitStart = Math.max(48, maxFrames - 16);
  const exitProg = (timer >= exitStart) ? Math.min(1.0, (timer - exitStart) / 16) : 0;
  const easeExit = Math.pow(exitProg, 2.2);
  const exitOffset = easeExit * 420 * scaleFactor;

  const leftOffX = -p1EntryOffset - exitOffset;
  const rightOffX = p2EntryOffset + exitOffset;

  const centerX = width / 2;
  const centerY = height * 0.485;

  // Geometry for Upper-Left Slab (Player 1)
  const yTop1 = centerY - 240 * scaleFactor;
  const yBot1 = centerY - 10 * scaleFactor;
  const xTop1 = centerX + 40 * scaleFactor;
  const xBot1 = centerX - 15 * scaleFactor;

  // 1. Upper-Left Slab: 3D Comic Hard Drop Shadow
  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // 1b. Upper-Left Slab: Main Body (Dark Fighter 1 Theme Gradient)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();

  // Dark Theme Gradient: deep obsidian corner to rich dark theme tone near clash seam
  const slabGrad1 = ctx.createLinearGradient(leftOffX - 40, yTop1, xTop1 + leftOffX, yBot1);
  slabGrad1.addColorStop(0.0, getDarkThemeTone(p1Color, 0.32));
  slabGrad1.addColorStop(1.0, getDarkThemeTone(p1Color, 0.48));
  ctx.fillStyle = slabGrad1;
  ctx.fill();

  // Outer manga ink border
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  // Crisp white specular edge along the diagonal clash seam
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.stroke();
  ctx.restore();

  // Geometry for Lower-Right Slab (Player 2)
  const yTop2 = centerY + 10 * scaleFactor;
  const yBot2 = centerY + 240 * scaleFactor;
  const xTop2 = centerX + 15 * scaleFactor + rightOffX;
  const xBot2 = centerX - 40 * scaleFactor + rightOffX;

  // 2. Lower-Right Slab: 3D Comic Hard Drop Shadow
  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // 2b. Lower-Right Slab: Main Body (Dark Fighter 2 Theme Gradient)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();

  // Dark Theme Gradient: rich dark theme tone near clash seam to deep obsidian corner
  const slabGrad2 = ctx.createLinearGradient(xTop2, yTop2, width + rightOffX + 40, yBot2);
  slabGrad2.addColorStop(0.0, getDarkThemeTone(p2Color, 0.48));
  slabGrad2.addColorStop(1.0, getDarkThemeTone(p2Color, 0.32));
  ctx.fillStyle = slabGrad2;
  ctx.fill();

  // Outer manga ink border
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  // Crisp white specular edge along the diagonal clash seam
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(xBot2, yBot2);
  ctx.stroke();
  ctx.restore();

  // 3. Player 1 Square Portrait Card (facing right)
  const cardW = 146 * scaleFactor;
  const cardH = 146 * scaleFactor;
  const p1Cx = (centerX - 150 * scaleFactor) + leftOffX;
  const p1Cy = centerY - 135 * scaleFactor;
  drawFighterCard(ctx, p1Cx, p1Cy, cardW, cardH, p1Def, 0, scaleFactor, 1);

  // 4. Player 2 Square Portrait Card (facing left)
  const p2Cx = (centerX + 150 * scaleFactor) + rightOffX;
  const p2Cy = centerY + 115 * scaleFactor;
  drawFighterCard(ctx, p2Cx, p2Cy, cardW, cardH, p2Def, Math.PI, scaleFactor, 2);

  // 5. Center Cyber-Manga "VS" Badge
  const vsCx = centerX;
  const vsCy = centerY;
  drawVsBadge(ctx, vsCx, vsCy, timer, scaleFactor, exitProg, p1Color, p2Color);

  // 6. Tactical "WHO WINS?" Challenger Banner
  const wwCx = centerX;
  const wwCy = centerY + 288 * scaleFactor;
  drawWhoWinsBadge(ctx, wwCx, wwCy, timer, scaleFactor, exitProg, p1Color, p2Color);
}

/**
 * Resolves the challenger lineup for the Gauntlet mode.
 * Adapts to the number of challengers selected (e.g. 5, 10, or custom pool).
 */
export function getGauntletChallengers() {
  const currentDefs = getActiveFighterDefs();
  if (Array.isArray(state.tlfsRoster) && state.tlfsRoster.length > 0) {
    return state.tlfsRoster.map(idx => currentDefs[idx] || FIGHTER_DEFS[idx] || currentDefs[1]);
  }
  const pool = (Array.isArray(state.tlfsAllowedEnemies) && state.tlfsAllowedEnemies.length > 0)
    ? state.tlfsAllowedEnemies
    : currentDefs.map((_, i) => i);

  const targetCount = (pool.length <= 10) ? Math.max(5, pool.length) : 10;
  const rosterIndices = [];
  if (typeof state.p2Index === 'number') {
    rosterIndices.push(state.p2Index);
  }
  if (typeof state.tlfsNextChallengerIndex === 'number' && !rosterIndices.includes(state.tlfsNextChallengerIndex)) {
    rosterIndices.push(state.tlfsNextChallengerIndex);
  }
  for (const idx of pool) {
    if (rosterIndices.length >= targetCount) break;
    if (!rosterIndices.includes(idx)) {
      rosterIndices.push(idx);
    }
  }
  while (rosterIndices.length < targetCount) {
    rosterIndices.push((rosterIndices.length + 1) % currentDefs.length);
  }
  state.tlfsRoster = rosterIndices;
  if (state.tlfsNextChallengerIndex === null || state.tlfsNextChallengerIndex === undefined) {
    state.tlfsNextChallengerIndex = rosterIndices[1];
  }
  return rosterIndices.map(idx => currentDefs[idx] || FIGHTER_DEFS[idx] || currentDefs[1]);
}

/**
 * Draws a single uniform fighter portrait card for Gauntlet challengers.
 * Uses the exact same cardSize, scale, and clean manga design across all 5 challengers.
 */
function drawChallengerCard(ctx, cx, cy, cardSize, def, scaleFactor) {
  if (!def) return;
  const themeColor = getFaceOffThemeColor(def, '#F43F5E');

  ctx.save();
  ctx.translate(cx, cy);

  // 1. 3D Comic Hard Drop Shadow (Rule 11 compliant)
  ctx.save();
  ctx.translate(2.5 * scaleFactor, 3.5 * scaleFactor);
  ctx.fillStyle = '#050609';
  ctx.fillRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize);
  ctx.restore();

  // 2. Card Background: Sleek Dark Tactical Slate with Theme-Colored Aura
  const darkCardCore = getDarkThemeTone(themeColor, 0.40);
  const darkCardOuter = '#090B12';
  const bgGrad = ctx.createRadialGradient(0, -cardSize * 0.1, 3, 0, 0, cardSize * 0.72);
  bgGrad.addColorStop(0.0, darkCardCore);
  bgGrad.addColorStop(0.65, getDarkThemeTone(themeColor, 0.20));
  bgGrad.addColorStop(1.0, darkCardOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize);

  // Inner subtle metallic theme hairline
  ctx.strokeStyle = getDarkThemeTone(themeColor, 0.65);
  ctx.lineWidth = 1.0 * scaleFactor;
  ctx.strokeRect(-cardSize / 2 + 1.5, -cardSize / 2 + 1.5, cardSize - 3, cardSize - 3);

  // 3. Render Upright Pixel Character Model (Clipped to Interior)
  const fighter = getPreviewFighter(def, Math.PI);
  if (fighter) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-cardSize / 2 + 2, -cardSize / 2 + 2, cardSize - 4, cardSize - 4);
    ctx.clip();

    ctx.translate(0, 2 * scaleFactor);
    const spriteScale = (cardSize / 146) * 2.05 * scaleFactor;
    ctx.scale(spriteScale, spriteScale);
    try {
      fighter.draw(ctx, null);
    } catch (e) {
      if (typeof fighter.drawBody === 'function') fighter.drawBody(ctx);
    }
    ctx.restore();
  }

  // 4. Solid Black Manga Outer Frame (#050609)
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.0 * scaleFactor;
  ctx.strokeRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize);

  // 5. Slanted Tactical Manga Nameplate directly below card
  const nameH = 20 * scaleFactor;
  const nameW = cardSize + 8 * scaleFactor;
  const nameY = cardSize / 2 + nameH / 2 + 2 * scaleFactor;
  const skew = 10 * Math.PI / 180;
  _drawSlantedNameplate(ctx, 0, nameY, nameW, nameH, def.name, themeColor, skew, scaleFactor);

  ctx.restore();
}

/**
 * Draws the Gauntlet (TLFS) Countdown Layout showing Hero vs all 5 Challengers.
 * All 5 challengers share the exact same frame scale size with zero extra clutter.
 */
function drawGauntletCountdownLayout(ctx, width, height, timer, p1Def, challengers, maxFrames, scaleFactor) {
  const p1Color = getFaceOffThemeColor(p1Def, '#38BDF8');
  const leadChallenger = (challengers && challengers[0]) ? challengers[0] : p1Def;
  const p2Color = getFaceOffThemeColor(leadChallenger, '#F43F5E');

  // Sequential 1-by-1 Entrance & Exit Interpolation
  const slideDist = Math.max(width, 500) * scaleFactor;

  // Phase 1: Player 1 (Upper-Left Slab) enters frames 0..20
  const p1Prog = Math.max(0, Math.min(1.0, timer / 20));
  const easeP1 = easeOutBack(p1Prog);
  const p1EntryOffset = (1 - easeP1) * slideDist;

  // Phase 2: Challengers (Lower-Right Slab) enters frames 22..42
  const p2Prog = Math.max(0, Math.min(1.0, (timer - 22) / 20));
  const easeP2 = easeOutBack(p2Prog);
  const p2EntryOffset = (1 - easeP2) * slideDist;

  // Phase 4: Slabs exit slide-out
  const exitStart = Math.max(48, maxFrames - 16);
  const exitProg = (timer >= exitStart) ? Math.min(1.0, (timer - exitStart) / 16) : 0;
  const easeExit = Math.pow(exitProg, 2.2);
  const exitOffset = easeExit * 420 * scaleFactor;

  const leftOffX = -p1EntryOffset - exitOffset;
  const rightOffX = p2EntryOffset + exitOffset;

  const centerX = width / 2;
  const centerY = height * 0.485;

  // Geometry for Upper-Left Slab (Player 1)
  const yTop1 = centerY - 240 * scaleFactor;
  const yBot1 = centerY - 10 * scaleFactor;
  const xTop1 = centerX + 40 * scaleFactor;
  const xBot1 = centerX - 15 * scaleFactor;

  // 1. Upper-Left Slab: 3D Comic Hard Drop Shadow
  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // 1b. Upper-Left Slab: Main Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();

  const slabGrad1 = ctx.createLinearGradient(leftOffX - 40, yTop1, xTop1 + leftOffX, yBot1);
  slabGrad1.addColorStop(0.0, getDarkThemeTone(p1Color, 0.32));
  slabGrad1.addColorStop(1.0, getDarkThemeTone(p1Color, 0.48));
  ctx.fillStyle = slabGrad1;
  ctx.fill();

  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.stroke();
  ctx.restore();

  // Geometry for Lower-Right Slab (Gauntlet Challengers)
  const yTop2 = centerY + 10 * scaleFactor;
  const yBot2 = centerY + 240 * scaleFactor;
  const xTop2 = centerX + 15 * scaleFactor + rightOffX;
  const xBot2 = centerX - 40 * scaleFactor + rightOffX;

  // 2. Lower-Right Slab: 3D Comic Hard Drop Shadow
  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // 2b. Lower-Right Slab: Main Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();

  const slabGrad2 = ctx.createLinearGradient(xTop2, yTop2, width + rightOffX + 40, yBot2);
  slabGrad2.addColorStop(0.0, getDarkThemeTone(p2Color, 0.48));
  slabGrad2.addColorStop(1.0, getDarkThemeTone(p2Color, 0.32));
  ctx.fillStyle = slabGrad2;
  ctx.fill();

  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(xBot2, yBot2);
  ctx.stroke();
  ctx.restore();

  // 3. Player 1 Square Portrait Card (Hero, facing right)
  const cardW = 146 * scaleFactor;
  const cardH = 146 * scaleFactor;
  const p1Cx = (centerX - 150 * scaleFactor) + leftOffX;
  const p1Cy = centerY - 135 * scaleFactor;
  drawFighterCard(ctx, p1Cx, p1Cy, cardW, cardH, p1Def, 0, scaleFactor, 1);

  // 4. All Gauntlet Challengers (Uniform Scale Size across all selected challengers)
  const numChallengers = (challengers && challengers.length > 0) ? challengers.length : 5;

  if (numChallengers <= 5) {
    // 5 or fewer challengers: 2 rows (2 top, 3 bottom) with 74px cards
    const challengerSize = 74 * scaleFactor;

    const row1Cy = centerY + 65 * scaleFactor;
    const row1Gap = 20 * scaleFactor;
    const row1Cx = (centerX + 136 * scaleFactor) + rightOffX;
    const r1x0 = row1Cx - (challengerSize / 2 + row1Gap / 2);
    const r1x1 = row1Cx + (challengerSize / 2 + row1Gap / 2);

    drawChallengerCard(ctx, r1x0, row1Cy, challengerSize, challengers[0] || leadChallenger, scaleFactor);
    drawChallengerCard(ctx, r1x1, row1Cy, challengerSize, challengers[1] || leadChallenger, scaleFactor);

    const row2Cy = centerY + 172 * scaleFactor;
    const row2Gap = 12 * scaleFactor;
    const row2Cx = (centerX + 125 * scaleFactor) + rightOffX;
    const r2Span = challengerSize + row2Gap;
    const r2x0 = row2Cx - r2Span;
    const r2x1 = row2Cx;
    const r2x2 = row2Cx + r2Span;

    if (numChallengers > 2) drawChallengerCard(ctx, r2x0, row2Cy, challengerSize, challengers[2] || leadChallenger, scaleFactor);
    if (numChallengers > 3) drawChallengerCard(ctx, r2x1, row2Cy, challengerSize, challengers[3] || leadChallenger, scaleFactor);
    if (numChallengers > 4) drawChallengerCard(ctx, r2x2, row2Cy, challengerSize, challengers[4] || leadChallenger, scaleFactor);
  } else {
    // 6 to 10 challengers: 2 balanced rows (e.g. 5 top, 5 bottom) with uniform 47px cards
    const count1 = Math.ceil(numChallengers / 2);
    const count2 = numChallengers - count1;
    const maxCols = Math.max(count1, count2);

    const gap = 7 * scaleFactor;
    const challengerSize = Math.min(48 * scaleFactor, Math.floor((265 * scaleFactor - (maxCols - 1) * gap) / maxCols));

    // Row 1
    const row1Cy = centerY + 72 * scaleFactor;
    const row1Width = count1 * challengerSize + (count1 - 1) * gap;
    const row1Cx = (centerX + 138 * scaleFactor) + rightOffX;
    const startX1 = row1Cx - row1Width / 2 + challengerSize / 2;

    for (let i = 0; i < count1; i++) {
      const cardX = startX1 + i * (challengerSize + gap);
      drawChallengerCard(ctx, cardX, row1Cy, challengerSize, challengers[i] || leadChallenger, scaleFactor);
    }

    // Row 2
    const row2Cy = centerY + 164 * scaleFactor;
    const row2Width = count2 * challengerSize + (count2 - 1) * gap;
    const row2Cx = (centerX + 132 * scaleFactor) + rightOffX;
    const startX2 = row2Cx - row2Width / 2 + challengerSize / 2;

    for (let i = 0; i < count2; i++) {
      const cardX = startX2 + i * (challengerSize + gap);
      drawChallengerCard(ctx, cardX, row2Cy, challengerSize, challengers[count1 + i] || leadChallenger, scaleFactor);
    }
  }

  // 5. Center Cyber-Manga "VS" Badge
  const vsCx = centerX;
  const vsCy = centerY;
  drawVsBadge(ctx, vsCx, vsCy, timer, scaleFactor, exitProg, p1Color, p2Color);

  // 6. Tactical "WHO WINS?" Challenger Banner
  const wwCx = centerX;
  const wwCy = centerY + 288 * scaleFactor;
  drawWhoWinsBadge(ctx, wwCx, wwCy, timer, scaleFactor, exitProg, p1Color, p2Color);
}

/**
 * Draws 1v2 Boss / Team Match Countdown Layout.
 */
function draw1v2CountdownLayout(ctx, width, height, timer, p1Def, p2Def, p3Def, maxFrames, scaleFactor) {
  const p1Color = getFaceOffThemeColor(p1Def, '#38BDF8');
  const p2Color = getFaceOffThemeColor(p2Def, '#F43F5E');

  // Sequential 1-by-1 Entrance & Exit Interpolation
  const slideDist = Math.max(width, 500) * scaleFactor;

  // Phase 1: Player 1 (Upper-Left Slab) enters frames 0..20
  const p1Prog = Math.max(0, Math.min(1.0, timer / 20));
  const easeP1 = easeOutBack(p1Prog);
  const p1EntryOffset = (1 - easeP1) * slideDist;

  // Phase 2: Enemy Team Slab (Player 2 + Player 3) enters frames 22..42
  const p2Prog = Math.max(0, Math.min(1.0, (timer - 22) / 20));
  const easeP2 = easeOutBack(p2Prog);
  const p2EntryOffset = (1 - easeP2) * slideDist;

  // Phase 4: Slabs exit slide-out
  const exitStart = Math.max(48, maxFrames - 16);
  const exitProg = (timer >= exitStart) ? Math.min(1.0, (timer - exitStart) / 16) : 0;
  const easeExit = Math.pow(exitProg, 2.2);
  const exitOffset = easeExit * 420 * scaleFactor;

  const leftOffX = -p1EntryOffset - exitOffset;
  const rightOffX = p2EntryOffset + exitOffset;

  const centerX = width / 2;
  const centerY = height * 0.485;

  // Player 1 Slab (Hero / Boss)
  const yTop1 = centerY - 240 * scaleFactor;
  const yBot1 = centerY - 10 * scaleFactor;
  const xTop1 = centerX + 40 * scaleFactor;
  const xBot1 = centerX - 15 * scaleFactor;

  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftOffX - 40, yTop1);
  ctx.lineTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.lineTo(leftOffX - 40, yBot1);
  ctx.closePath();
  const slabGrad1 = ctx.createLinearGradient(leftOffX - 40, yTop1, xTop1 + leftOffX, yBot1);
  slabGrad1.addColorStop(0.0, getDarkThemeTone(p1Color, 0.32));
  slabGrad1.addColorStop(1.0, getDarkThemeTone(p1Color, 0.48));
  ctx.fillStyle = slabGrad1;
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop1 + leftOffX, yTop1);
  ctx.lineTo(xBot1 + leftOffX, yBot1);
  ctx.stroke();
  ctx.restore();

  // Enemy Team Slab
  const yTop2 = centerY + 10 * scaleFactor;
  const yBot2 = centerY + 240 * scaleFactor;
  const xTop2 = centerX + 15 * scaleFactor + rightOffX;
  const xBot2 = centerX - 40 * scaleFactor + rightOffX;

  ctx.save();
  ctx.translate(3.5 * scaleFactor, 4.5 * scaleFactor);
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(width + rightOffX + 40, yTop2);
  ctx.lineTo(width + rightOffX + 40, yBot2);
  ctx.lineTo(xBot2, yBot2);
  ctx.closePath();
  const slabGrad2 = ctx.createLinearGradient(xTop2, yTop2, width + rightOffX + 40, yBot2);
  slabGrad2.addColorStop(0.0, getDarkThemeTone(p2Color, 0.48));
  slabGrad2.addColorStop(1.0, getDarkThemeTone(p2Color, 0.32));
  ctx.fillStyle = slabGrad2;
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4 * scaleFactor;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.beginPath();
  ctx.moveTo(xTop2, yTop2);
  ctx.lineTo(xBot2, yBot2);
  ctx.stroke();
  ctx.restore();

  // P1 Card
  const cardW = 146 * scaleFactor;
  const cardH = 146 * scaleFactor;
  drawFighterCard(ctx, (centerX - 150 * scaleFactor) + leftOffX, centerY - 135 * scaleFactor, cardW, cardH, p1Def, 0, scaleFactor, 1);

  // P2 & P3 Cards (side-by-side on the lower slab)
  const smW = 108 * scaleFactor;
  const smH = 108 * scaleFactor;
  drawFighterCard(ctx, (centerX + 78 * scaleFactor) + rightOffX, centerY + 115 * scaleFactor, smW, smH, p2Def, Math.PI, scaleFactor * 0.75, 2);
  drawFighterCard(ctx, (centerX + 198 * scaleFactor) + rightOffX, centerY + 115 * scaleFactor, smW, smH, p3Def, Math.PI, scaleFactor * 0.75, 2);

  // VS & WHO WINS
  drawVsBadge(ctx, centerX, centerY, timer, scaleFactor, exitProg, p1Color, p2Color);
  drawWhoWinsBadge(ctx, centerX, centerY + 288 * scaleFactor, timer, scaleFactor, exitProg, p1Color, p2Color);
}

/**
 * Main entry point invoked every frame during state.gameState === 'countdown'.
 * Draws the high-energy anime VS intro sequence over the arena with dynamic fighter theme colors.
 */
export function drawCountdownIntro(ctx, width, height, customTimer = null, customP1Def = null, customP2Def = null, customP3Def = null) {
  if (typeof state === 'undefined' || !state) return;
  const timer = (customTimer !== null && customTimer !== undefined) ? customTimer : (state.countdownTimer || 0);
  const maxFrames = state.requiredCountdownFrames || 95;

  if (customTimer === null || customTimer === undefined) {
    _clearButtons();
    // Click-to-Skip: Register full screen click area to skip straight to fight exit
    _registerButton(0, 0, width, height, () => {
      const exitTarget = Math.max(48, maxFrames - 16);
      if ((state.countdownTimer || 0) < exitTarget) {
        state.countdownTimer = exitTarget;
      }
    });
  }

  // Resolve active fighter definitions
  const currentDefs = getActiveFighterDefs();
  const p1Def = customP1Def || (state.gameState === 'faceoff' ? currentDefs[state.p1Index] : (state.fighters?.[0]?._def || currentDefs[state.p1Index])) || currentDefs[0] || FIGHTER_DEFS[0];
  const p2Def = customP2Def || (state.gameState === 'faceoff' ? currentDefs[state.p2Index] : (state.fighters?.[1]?._def || currentDefs[state.p2Index])) || currentDefs[1] || currentDefs[0];
  const p3Def = customP3Def || state.fighters?.[2]?._def || currentDefs[state.p3Index] || currentDefs[2];

  const isHorizontal = (state.viewOrientation === 'horizontal');
  const scaleFactor = isHorizontal ? Math.min(width / 540, height / 960) * 1.15 : 1.0;

  const mode = state.mode || GAME_MODES.ONE_VS_ONE;
  const is1v2 = (mode === GAME_MODES.ONE_VS_TWO || mode === GAME_MODES.STAND_OFF_1V2 || mode === GAME_MODES.BOSS_BATTLE || mode === 'Boss Battle' || mode === '1v2 Stand Off' || mode === '1v2');
  const isGauntlet = (mode === 'TLFS' || mode === GAME_MODES.TLFS);

  // 0. Cinematic Dark Manga Backdrop Dim
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 9, 0.65)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  if (is1v2 && p3Def && !state.bossBattleNoTeammate) {
    draw1v2CountdownLayout(ctx, width, height, timer, p1Def, p2Def, p3Def, maxFrames, scaleFactor);
  } else if (isGauntlet) {
    const challengers = getGauntletChallengers();
    drawGauntletCountdownLayout(ctx, width, height, timer, p1Def, challengers, maxFrames, scaleFactor);
  } else {
    draw1v1CountdownLayout(ctx, width, height, timer, p1Def, p2Def, maxFrames, scaleFactor);
  }
}
