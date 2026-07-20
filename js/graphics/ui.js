// ─────────────────────────────────────────────
// UI MODULE
// ─────────────────────────────────────────────

// Polyfill for ctx.roundRect if not supported
if (typeof CanvasRenderingContext2D.prototype.roundRect === 'undefined') {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 0) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
  };
}

import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { GAME_MODES, MODE_ROUNDS, MODE_SETTINGS } from '../core/modeConfig.js';
import { Fighter } from '../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../entities/factories/fighterFactory.js';
import { state, getLeaderboardData } from '../core/state.js';
import { previewProjectileSystem, updateIndexDetailDemo } from './preview.js';
import { startGame, goToTitle, startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters } from '../core/gameFlow.js';
import {
  drawRedSniperGun,
  drawOrangeFlamethrowerGun,
  drawBlueAimbotGun,
  drawGreenBottleGun,
  drawWhiteRailgun,
  drawWhiteChargeEffect,
  drawDarkSlateGrayShuriken,
  drawDarkSlateGrayMelee,
  drawGrayShield,
  drawGraySword,
  drawGrayBrokenSword,
  drawBerserkerDualAxes,
  drawCronosCrescentBlade,
  drawSpikeWeapon,
  drawSingleSpike,
  drawGunSlingerDualRevolver,
  drawEngineer,
  drawZeusWeapon
} from './weaponVisuals.js';
import { drawRubyScythe } from './weapons/rubyWeaponGraphics.js';
import { drawMusashiWeapons, drawMusashiSheaths } from './weapons/musashiWeaponGraphics.js';

// --- Fighter Preview Cache ---
const fighterPreviewCache = {};

function preRenderFighterPreviews() {
  const previewSize = 128; // Larger size for better quality when scaling down
  FIGHTER_DEFS.forEach((def, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = previewSize;
    canvas.height = previewSize;
    const ctx = canvas.getContext('2d');
    
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const previewFighter = new FighterClass({
      ...def,
      startX: previewSize / 2,
      startY: previewSize / 2,
    });
    previewFighter.angle = 0; // Static angle for consistent previews
    previewFighter.gunAngle = Math.PI / 4; // Consistent gun angle
    
    try {
      if (typeof previewFighter.aim === 'function') {
        previewFighter.aim({ x: previewSize, y: previewSize });
      }
      previewFighter.draw(ctx);
      fighterPreviewCache[index] = canvas;
    } catch (e) {
      console.error('Failed to pre-render fighter preview:', def.name, e);
    }
  });
}

function getFighterPreview(index) {
  return fighterPreviewCache[index];
}

// Initial pre-rendering call
preRenderFighterPreviews();
// --------------------------




state.canvas.addEventListener('wheel', (e) => {
  if (selectingSlot === null) return;

  const rect = state.canvas.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const modalW = 620;
  const modalH = 380;
  const modalX = (state.canvas.width - modalW) / 2;
  const modalY = (state.canvas.height - modalH) / 2;
  const listX = modalX + 24;
  const listY = modalY + 64;
  const listW = 240;
  const listH = modalH - 120;
  let modalScrollOffset = 0;

  if (mx >= listX && mx <= listX + listW && my >= listY && my <= listY + listH) {
    const itemH = 38;
    const itemGap = 10;
    const totalHeight = FIGHTER_DEFS.length * (itemH + itemGap);
    const maxScroll = Math.max(0, totalHeight - listH);
    modalScrollOffset = Math.min(Math.max(0, modalScrollOffset + e.deltaY * 0.75), maxScroll);
    e.preventDefault();
  }
}, { passive: false });

function drawTlfsEnemyPoolGrid(x, y, w, h) {
  const { ctx } = state;
  drawPanel(x, y, w, h, 0.84);

  // Draw grid of toggleable fighters
  const cols = 4;
  const padding = 10;
  const availableW = w - padding * 2;
  const gap = 8;
  const cellW = (availableW - gap * (cols - 1)) / cols;
  const cellH = cellW; // square cells
  
  const startX = x + padding;
  let currentY = y + padding;
  
  // Filter out dummy
  const poolFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx })).filter(({ def }) => def.type !== 'dummy');
  
  poolFighters.forEach(({ def, idx }, listPos) => {
    const col = listPos % cols;
    const row = Math.floor(listPos / cols);
    const cellX = startX + col * (cellW + gap);
    const cellY = currentY + row * (cellH + gap);
    
    const isSelected = state.tlfsAllowedEnemies.includes(idx);
    
    // Draw cell bg
    ctx.fillStyle = isSelected ? 'rgba(255, 77, 77, 0.3)' : 'rgba(20, 22, 28, 0.8)';
    ctx.strokeStyle = isSelected ? '#ff4d4d' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cellX, cellY, cellW, cellH, 6);
    ctx.fill();
    ctx.stroke();
    
    // Draw badge
    drawSmallFighterBadge(ctx, def, cellX + cellW / 2, cellY + cellH / 2, Math.min(cellW, cellH) * 0.7);
    
    // Draw X if not selected
    if (!isSelected) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cellX + 4, cellY + 4);
      ctx.lineTo(cellX + cellW - 4, cellY + cellH - 4);
      ctx.moveTo(cellX + cellW - 4, cellY + 4);
      ctx.lineTo(cellX + 4, cellY + cellH - 4);
      ctx.stroke();
    }
    
    // Register button
    _registerButton(cellX, cellY, cellW, cellH, () => {
      if (isSelected) {
        // Prevent deselecting if it would drop below 5 fighters
        if (state.tlfsAllowedEnemies.length <= 5) {
          spawnFloatingText(cellX + cellW/2, cellY, 'MINIMUM 5 ENEMIES!', '#ff4d4d');
          return;
        }
        state.tlfsAllowedEnemies = state.tlfsAllowedEnemies.filter(i => i !== idx);
      } else {
        state.tlfsAllowedEnemies.push(idx);
      }
    });
  });
}

// Draw a tiny fighter badge using the fighter class draw routine.
function drawSmallFighterBadge(ctx, def, cx, cy, size = 16) {
  try {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const badge = new FighterClass({ ...def, startX: 0, startY: 0, startVx: 0, startVy: 0 });
    const origR = badge.r;
    badge.r = size / 2;
    badge.x = 0;
    badge.y = 0;
    badge.vx = 0;
    badge.vy = 0;
    badge.angle = 0;
    badge.gunAngle = 0;

    ctx.save();
    ctx.translate(cx, cy);
    // slight scale-down to keep details readable
    const scale = Math.min(1, (size / (origR * 2)));
    ctx.scale(scale, scale);
    badge.draw(ctx);
    ctx.restore();

    // restore radius in case something holds reference (defensive)
    badge.r = origR;
  } catch (e) {
    // fallback: draw a colored dot with initial
    ctx.fillStyle = def.color || '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((def.name || '?').charAt(0).toUpperCase(), cx, cy);
  }
}

// ─────────────────────────────────────────────
// BUTTON REGISTRY
// ─────────────────────────────────────────────
let _buttons = [];
let _hoveredButton = null;
let _mouseX = 0;
let _mouseY = 0;

function _clearButtons() {
  _buttons = [];
  _hoveredButton = null;
}

function _registerButton(x, y, w, h, action) {
  _buttons.push({ x, y, w, h, action });
}

export function handleUIMove(mx, my) {
  _mouseX = mx;
  _mouseY = my;
  let found = null;
  for (let i = _buttons.length - 1; i >= 0; i -= 1) {
    const btn = _buttons[i];
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      found = btn;
      break;
    }
  }
  _hoveredButton = found;
  state.canvas.style.cursor = found ? 'pointer' : 'default';
}

export function handleUIClick(mx, my) {
  for (let i = _buttons.length - 1; i >= 0; i -= 1) {
    const btn = _buttons[i];
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      btn.action();
      return true;
    }
  }
  return false;
}

let selectingSlot = null;
let modalInspectIndex = 0;

function drawPlayerCard(slotProp, title, x, y, w, h, borderColor, enabled) {
  const { ctx, mode } = state;
  drawPanel(x, y, w, h, 0.86, 14);

  ctx.fillStyle = borderColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, 34, 10);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 18);

  const fighterIndex = state[slotProp];
  const def = FIGHTER_DEFS[fighterIndex];

  if (!enabled) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FFA ONLY', x + w / 2, y + h / 2 - 12);
    ctx.font = '12px Arial';
    ctx.fillText('Switch mode to select', x + w / 2, y + h / 2 + 16);
    return;
  }

  // Right Side (Preview & Button)
  const previewX = x + w - 74;
  const previewY = y + 74;

  const teamColor = mode === '2v2'
    ? (slotProp === 'p1Index' || slotProp === 'p3Index' ? '#ff4d4d' : '#4da3ff')
    : null;
  if (teamColor) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.ellipse(previewX, previewY, 42, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const previewImage = getFighterPreview(fighterIndex);
  if (previewImage) {
    const previewSize = 84;
    ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
  }

  const btnW = 120;
  const btnH = 32;
  const btnX = x + w - btnW - 14;
  const btnY = y + h - btnH - 12;

  drawPanel(btnX, btnY, btnW, btnH, 0.92, 10);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SELECT FIGHTER', btnX + btnW / 2, btnY + btnH / 2);

  _registerButton(btnX, btnY, btnW, btnH, () => {
    selectingSlot = slotProp;
    modalInspectIndex = fighterIndex;
  });

  // Left Side (Text/Stats)
  const detailX = x + 16;
  let textY = y + 54;

  ctx.fillStyle = def.color;
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(def.name.toUpperCase(), detailX, textY);

  ctx.fillStyle = '#aaa';
  ctx.font = '11px Arial';
  textY += 18;
  ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, detailX, textY);
  textY += 18;

  drawStatBar(ctx, 'HP', def.hp, 100, detailX, textY, 110, def.color);
  textY += 16;
  drawStatBar(ctx, 'DMG', def.damage, 50, detailX, textY, 110, '#f9c846');
  textY += 16;
  drawStatBar(ctx, 'RFR', Math.min(2, def.cooldown / 60), 2, detailX, textY, 110, '#8ad4ff');
  textY += 14;

  // Fighter description
  ctx.fillStyle = '#999';
  ctx.font = '10px Arial';
  const maxDescWidth = 110;
  wrapText(ctx, def.desc, detailX, textY, maxDescWidth, 13);
}

function drawStatBar(ctx, label, value, maxValue, x, y, width, color) {
  ctx.fillStyle = '#888';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 4);

  const labelW = 28;
  const barX = x + labelW;
  const barY = y;
  const barHeight = 8;
  const barWidth = width - labelW;

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 4);
  ctx.fill();

  const ratio = Math.min(1, Math.max(0, value / maxValue));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * ratio, barHeight, 4);
  ctx.fill();
}

function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const modalW = Math.min(canvas.width - 20, 560);
  const modalH = Math.min(canvas.height - 20, 460);
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawPanel(mx, my, modalW, modalH, 0.94, 14);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const pNumMatch = selectingSlot ? selectingSlot.match(/\d/) : null;
  const slotLabel = pNumMatch ? `PLAYER ${pNumMatch[0]}` : 'PLAYER';
  ctx.fillText(`SELECT FIGHTER FOR ${slotLabel}`, mx + 24, my + 20);

  // Grid Configuration
  const cols = 4;
  const gap = 12;
  // Calculate cell size based on available width, reserving roughly half for the grid
  const maxGridW = modalW * 0.52;
  const cellW = Math.floor((maxGridW - (cols - 1) * gap) / cols);
  const cellH = cellW;
  const gridW = cols * cellW + (cols - 1) * gap;

  const listX = mx + 24;
  const listY = my + 60;

  // Filter out dummy-type fighters when dummy is disabled
  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  modalAvailableFighters.forEach(({ def, idx }, gridPos) => {
    const col = gridPos % cols;
    const row = Math.floor(gridPos / cols);

    const itemX = listX + col * (cellW + gap);
    const itemY = listY + row * (cellH + gap);

    const selected = idx === modalInspectIndex;

    ctx.fillStyle = selected ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = selected ? def.color : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(itemX, itemY, cellW, cellH, 10);
    ctx.fill();
    ctx.stroke();

    if (selected) {
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw abbreviated name or initials inside cell
    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = def.name.split(' ');
    let abbr = '';
    if (words.length > 1) {
      abbr = words[0][0] + words[1][0];
    } else {
      abbr = words[0].substring(0, 3);
    }

    // Draw fighter's color as a circle behind text
    ctx.globalAlpha = selected ? 0.3 : 0.15;
    ctx.beginPath();
    ctx.arc(itemX + cellW / 2, itemY + cellH / 2 - 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.fillText(abbr.toUpperCase(), itemX + cellW / 2, itemY + cellH / 2 - 8);

    // Draw full name tiny at the bottom of the cell
    ctx.fillStyle = selected ? '#fff' : '#aaa';
    ctx.font = '9px Arial';
    let shortName = def.name;
    if (shortName.length > 10) shortName = shortName.substring(0, 9) + '.';
    ctx.fillText(shortName.toUpperCase(), itemX + cellW / 2, itemY + cellH - 12);

    _registerButton(itemX, itemY, cellW, cellH, () => {
      modalInspectIndex = idx;
    });
  });

  const detailX = listX + gridW + 24;
  const detailW = modalW - (detailX - mx) - 24;
  const detailY = my + 60;
  const detailH = modalH - 130;
  const selectedDef = FIGHTER_DEFS[modalInspectIndex];

  drawPanel(detailX, detailY, detailW, detailH, 0.9, 12);

  // Fancy title background (taller to fit the model)
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(detailX, detailY, detailW, 86, { tl: 12, tr: 12, bl: 0, br: 0 });
  ctx.fill();

  // Draw fighter model preview
  const previewX = detailX + detailW / 2;
  const previewY = detailY + 45;
  const previewImage = getFighterPreview(modalInspectIndex);
  if (previewImage) {
    const previewSize = 80;
    ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
  }

  // Fighter Name
  ctx.fillStyle = selectedDef.color;
  ctx.font = 'bold 17px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 90);

  let textY = detailY + 100;

  ctx.fillStyle = '#aaa';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`CLASS: ${selectedDef.type.toUpperCase()}`, detailX + 16, textY);
  textY += 24;

  const barW = detailW - 32;
  drawStatBar(ctx, 'HP', selectedDef.hp, 150, detailX + 16, textY, barW, selectedDef.color);
  textY += 18;
  drawStatBar(ctx, 'DMG', selectedDef.damage, 60, detailX + 16, textY, barW, '#f9c846');
  textY += 18;
  drawStatBar(ctx, 'RFR', Math.min(2, selectedDef.cooldown / 60), 2, detailX + 16, textY, barW, '#8ad4ff');
  textY += 28;

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(selectedDef.ability.toUpperCase(), detailX + 16, textY);
  textY += 18;

  ctx.fillStyle = '#ccc';
  ctx.font = '11px Arial';
  ctx.textBaseline = 'top';
  wrapText(ctx, selectedDef.desc, detailX + 16, textY, detailW - 32, 16);

  const footerY = my + modalH - 44;
  drawButton('CANCEL', mx + modalW / 2 - 110, footerY, () => { selectingSlot = null; }, 120, 38);
  drawButton('CONFIRM', mx + modalW / 2 + 110, footerY, () => {
    if (selectingSlot) {
      state[selectingSlot] = modalInspectIndex;
    }
    selectingSlot = null;
  }, 120, 38);
}

// ─────────────────────────────────────────────
// DRAWING HELPERS
// ─────────────────────────────────────────────

/** Draws a semi-transparent rounded rectangle panel with gradient and glow. */
function drawPanel(x, y, w, h, alpha = 0.8, r = 8) {
  const ctx = state.ctx;

  // Create gradient background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(30, 30, 40, ' + alpha + ')');
  grad.addColorStop(0.5, 'rgba(20, 20, 30, ' + alpha + ')');
  grad.addColorStop(1, 'rgba(10, 10, 20, ' + alpha + ')');

  ctx.fillStyle = grad;
  ctx.strokeStyle = `rgba(100, 140, 255, ${alpha * 0.6})`;
  ctx.lineWidth = 2;

  // Outer glow effect
  ctx.shadowColor = 'rgba(100, 140, 255, 0.3)';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/** Draws a centered text button with hover effects. */
function drawButton(text, cx, cy, action, w = 200, h = 44) {
  const ctx = state.ctx;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Check if button is hovered
  const isHovered = _hoveredButton &&
    _mouseX >= x && _mouseX <= x + w &&
    _mouseY >= y && _mouseY <= y + h;

  // Button background with gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (isHovered) {
    grad.addColorStop(0, 'rgba(40, 60, 100, 0.95)');
    grad.addColorStop(0.5, 'rgba(30, 50, 90, 0.95)');
    grad.addColorStop(1, 'rgba(20, 40, 80, 0.95)');
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(120, 180, 255, 0.5)';
    ctx.shadowBlur = 12;
  } else {
    grad.addColorStop(0, 'rgba(25, 35, 70, 0.9)');
    grad.addColorStop(0.5, 'rgba(20, 30, 60, 0.9)');
    grad.addColorStop(1, 'rgba(15, 25, 50, 0.9)');
    ctx.strokeStyle = 'rgba(100, 140, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(100, 140, 255, 0.2)';
    ctx.shadowBlur = 6;
  }

  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Button text with hover effect
  ctx.fillStyle = isHovered ? '#e0f0ff' : '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slight scale effect on hover
  if (isHovered) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.05, 1.05);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, cx, cy);
  }

  const transform = ctx.getTransform();
  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];
  const points = corners.map((pt) => ({
    x: transform.a * pt.x + transform.c * pt.y + transform.e,
    y: transform.b * pt.x + transform.d * pt.y + transform.f,
  }));
  const minX = Math.min(...points.map((pt) => pt.x));
  const maxX = Math.max(...points.map((pt) => pt.x));
  const minY = Math.min(...points.map((pt) => pt.y));
  const maxY = Math.max(...points.map((pt) => pt.y));
  _registerButton(minX, minY, maxX - minX, maxY - minY, action);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight = 16) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
  }
}

// ─────────────────────────────────────────────
// PREVIEW BALLS (Title Screen Background)
// ─────────────────────────────────────────────

function updatePreviewBalls() {
  const { ctx, canvas } = state;
  if (state.previewBalls.length === 0) {
    for (let i = 0; i < 4; i++) {
      state.previewBalls.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        r: 20 + Math.random() * 25,
        color: Math.random() > 0.5 ? 'rgba(255, 77, 77, 0.15)' : 'rgba(77, 163, 255, 0.15)',
      });
    }
  }

  state.previewBalls.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x - b.r < 0 || b.x + b.r > canvas.width) b.vx *= -1;
    if (b.y - b.r < 0 || b.y + b.r > canvas.height) b.vy *= -1;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  });
}

// ─────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────

export function drawTitleScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Static gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `hsl(240, 70%, 10%)`);
  gradient.addColorStop(0.5, `hsl(260, 60%, 15%)`);
  gradient.addColorStop(1, `hsl(250, 80%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Animated background particles
  updatePreviewBalls();

  // Primary buttons
  drawButton('⚔ BATTLE', canvas.width / 2, 180 - 22, () => { state.gameState = 'select'; }, 200, 52);

  drawButton('📖 FIGHTER INDEX', canvas.width / 2, 250, () => { state.gameState = 'index'; }, 240, 48);

  drawButton('⚔ WEAPONS', canvas.width / 2, 310, () => { state.gameState = 'weapons'; }, 240, 48);

  drawButton('🧪 TEST MODE: ' + (state.testMode ? 'ON' : 'OFF'), canvas.width / 2, 370, () => { state.testMode = !state.testMode; }, 240, 48);

  drawButton('🏆 LEADERBOARD', canvas.width / 2, 435, () => {
    clearHealthHud();
    state.gameState = 'leaderboard';
  }, 240, 48);

  // Footer text
  ctx.fillStyle = 'rgba(200, 210, 255, 0.7)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Press SPACE/ENTER, Click BATTLE, or use FIGHTER INDEX to inspect fighters', canvas.width / 2, 350);
}

// ─────────────────────────────────────────────
// LEADERBOARD SCREEN
// ─────────────────────────────────────────────

let leaderboardSortBy = 'wins'; // 'wins' | 'losses' | 'winRate'
let isLeaderboardEditMode = false;

export function drawLeaderboardScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🏆 LEADERBOARD', canvas.width / 2, 50);

  ctx.fillStyle = '#888';
  ctx.font = '14px Arial';
  ctx.fillText('1v1 Mode Stats', canvas.width / 2, 75);

  // Edit Mode Toggle
  drawButton('✏️ EDIT: ' + (isLeaderboardEditMode ? 'ON' : 'OFF'), canvas.width - 90, 40, () => {
    if (isLeaderboardEditMode) {
      if (confirm('Save your edited leaderboard records?')) {
        import('../core/state.js').then(m => m.saveLeaderboard());
      } else {
        import('../core/state.js').then(m => m.loadLeaderboard());
      }
    }
    isLeaderboardEditMode = !isLeaderboardEditMode;
  }, 140, 30);

  // Sort buttons
  const sortY = 105;
  const sortOptions = [
    { id: 'wins', label: 'WINS' },
    { id: 'losses', label: 'LOSSES' },
    { id: 'winRate', label: 'WIN RATE' },
  ];

  const btnWidth = 120;
  const btnHeight = 36;
  const gap = 16;
  const totalWidth = sortOptions.length * btnWidth + (sortOptions.length - 1) * gap;
  let startX = canvas.width / 2 - totalWidth / 2;

  sortOptions.forEach((opt) => {
    const selected = leaderboardSortBy === opt.id;
    ctx.fillStyle = selected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = selected ? '#ffd700' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(startX, sortY - btnHeight / 2, btnWidth, btnHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? '#ffd700' : '#aaa';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.label, startX + btnWidth / 2, sortY);

    _registerButton(startX, sortY - btnHeight / 2, btnWidth, btnHeight, () => {
      leaderboardSortBy = opt.id;
    });

    startX += btnWidth + gap;
  });

  // Get sorted leaderboard data
  const leaderboardData = getLeaderboardData(leaderboardSortBy);

  // Table header
  const tableX = 60;
  const tableY = 160;
  const tableW = canvas.width - 120;
  const rowH = 50;
  const colWidths = [tableW * 0.08, tableW * 0.32, tableW * 0.15, tableW * 0.15, tableW * 0.15, tableW * 0.15];
  const colX = [tableX];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  // Header background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(tableX, tableY, tableW, rowH, 8);
  ctx.fill();

  // Header text
  const headers = ['#', 'FIGHTER', 'WINS', 'LOSSES', 'GAMES', 'WIN%'];
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd700';

  headers.forEach((header, i) => {
    const align = i === 1 ? 'left' : 'center';
    ctx.textAlign = align;
    const xPos = i === 1 ? colX[i] + 10 : colX[i] + colWidths[i] / 2;
    ctx.fillText(header, xPos, tableY + rowH / 2);
  });

  // Table rows
  const maxRows = 12;
  const displayData = leaderboardData.slice(0, maxRows);

  if (displayData.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No matches played yet', canvas.width / 2, tableY + rowH + 60);
    ctx.font = '14px Arial';
    ctx.fillText('Play 1v1 battles to see your stats here!', canvas.width / 2, tableY + rowH + 85);
  } else {
    displayData.forEach((entry, idx) => {
      const rowY = tableY + rowH + idx * (rowH + 4);
      const def = FIGHTER_DEFS[entry.fighterIndex];

      // Row background (alternating)
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.roundRect(tableX, rowY, tableW, rowH, 6);
      ctx.fill();

      // Rank
      ctx.fillStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#888';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(idx + 1, colX[0] + colWidths[0] / 2, rowY + rowH / 2);

      // Fighter name with color
      ctx.fillStyle = def ? def.color : '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(def ? def.name : `Fighter ${entry.fighterIndex}`, colX[1] + 10, rowY + rowH / 2);

      // Stats
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';

      if (isLeaderboardEditMode) {
        // Draw editors for WINS
        _drawSmallEditor(ctx, entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2, entry.fighterIndex, 'wins');
        // Draw editors for LOSSES
        _drawSmallEditor(ctx, entry.losses, colX[3] + colWidths[3] / 2, rowY + rowH / 2, entry.fighterIndex, 'losses');
      } else {
        ctx.fillText(entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2);
        ctx.fillText(entry.losses, colX[3] + colWidths[3] / 2, rowY + rowH / 2);
      }
      ctx.fillText(entry.totalGames, colX[4] + colWidths[4] / 2, rowY + rowH / 2);

      // Win rate with color coding
      const winRateColor = entry.winRate >= 70 ? '#4ade80' : entry.winRate >= 50 ? '#fbbf24' : '#f87171';
      ctx.fillStyle = winRateColor;
      ctx.fillText(`${entry.winRate.toFixed(1)}%`, colX[5] + colWidths[5] / 2, rowY + rowH / 2);
    });
  }

  // Back button
  const footerY = canvas.height - 60;
  drawButton('⌂ BACK', canvas.width / 2, footerY, () => {
    if (isLeaderboardEditMode) {
      if (confirm('Save your edited leaderboard records?')) {
        import('../core/state.js').then(m => m.saveLeaderboard());
      } else {
        import('../core/state.js').then(m => m.loadLeaderboard());
      }
      isLeaderboardEditMode = false;
    }
    clearHealthHud();
    state.gameState = 'title';
  }, 160, 44);

  // Clear stats button (small, bottom left)
  ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Right-click to clear stats', 80, footerY + 5);
  _registerButton(60, footerY - 10, 200, 24, () => { }); // Invisible button area

  // Handle right-click to clear stats
  state.canvas.oncontextmenu = (e) => {
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (mx >= 60 && mx <= 260 && my >= footerY - 30 && my <= footerY + 20) {
      if (confirm('Clear all leaderboard stats?')) {
        state.leaderboard = {};
        import('../core/state.js').then(m => m.saveLeaderboard());
      }
    }
  };
}

function _drawSmallEditor(ctx, val, x, y, fighterIndex, statName) {
  // Center value
  ctx.fillStyle = '#fff';
  ctx.fillText(val, x, y);

  // Minus button
  const btnSize = 18;
  const mx = x - 26;
  const my = y - btnSize / 2;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.beginPath(); ctx.roundRect(mx, my, btnSize, btnSize, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('-', mx + btnSize / 2, y);
  _registerButton(mx, my, btnSize, btnSize, () => {
    import('../core/state.js').then(m => {
      m.initLeaderboardEntry(fighterIndex);
      state.leaderboard[fighterIndex][statName] = Math.max(0, state.leaderboard[fighterIndex][statName] - 1);
    });
  });

  // Plus button
  const px = x + 26 - btnSize;
  const py = y - btnSize / 2;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.beginPath(); ctx.roundRect(px, py, btnSize, btnSize, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('+', px + btnSize / 2, y);
  _registerButton(px, py, btnSize, btnSize, () => {
    import('../core/state.js').then(m => {
      m.initLeaderboardEntry(fighterIndex);
      state.leaderboard[fighterIndex][statName]++;
    });
  });
}

let indexScroll_local = 0; // kept local for scroll state (also mirrored in state.indexScroll)
let indexInspectIndex_local = 0;

export function drawIndexScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePreviewBalls();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FIGHTER INDEX', canvas.width / 2, 42);

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Scroll to browse fighters, or click a card for more details', canvas.width / 2, 70);

  const categories = ['All', 'Greek Mythology', 'Japanese', 'Sci-Fi & Modern', 'Fantasy & Magic'];
  
  const catXStart = 30;
  let currentCX = catXStart;
  let currentCY = 85;
  
  categories.forEach(cat => {
    ctx.font = 'bold 11px Arial';
    const textW = ctx.measureText(cat).width;
    const btnW = textW + 16;
    const btnH = 24;
    
    if (currentCX + btnW > canvas.width - 30) {
      currentCX = catXStart;
      currentCY += btnH + 8;
    }
    
    const isSelected = (state.indexCategory || 'All') === cat;
    
    ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(50,50,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(currentCX, currentCY, btnW, btnH, 12);
    ctx.fill();
    
    ctx.fillStyle = isSelected ? '#000' : '#ccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat, currentCX + btnW/2, currentCY + btnH/2);
    
    _registerButton(currentCX, currentCY, btnW, btnH, () => {
       state.indexCategory = cat;
       state.indexScroll = 0; // Reset scroll on category change
    });
    
    currentCX += btnW + 8;
  });

  const cardsStartY = currentCY + 36;
  const cardX = 30;
  const cardW = canvas.width - 60;
  const cardH = 120;
  const cardSpacing = 22;

  const filteredDefs = FIGHTER_DEFS.filter(def => 
    !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
  );

  filteredDefs.forEach((def, displayIdx) => {
    const originalIdx = FIGHTER_DEFS.findIndex(d => d.id === def.id);
    const cardY = cardsStartY + displayIdx * (cardH + cardSpacing) - state.indexScroll;
    
    // Don't draw if outside scroll area
    if (cardY > canvas.height || cardY + cardH < cardsStartY - 10) {
      return;
    }

    drawPanel(cardX, cardY, cardW, cardH, 0.85);

    const previewX = cardX + 55;
    const previewY = cardY + cardH / 2;
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const previewFighter = new FighterClass({
      ...def,
      startX: previewX,
      startY: previewY,
      startVx: 0,
      startVy: 0,
    });
    previewFighter.angle = performance.now() / 350;
    try {
      previewFighter.draw(ctx, { x: previewX + 80, y: previewY + 10 });
    } catch (e) {
      console.error('Preview draw error:', e);
    }

    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 95, cardY + 12);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px Arial';
    ctx.fillText(`Class: ${def.type.toUpperCase()}`, cardX + 95, cardY + 36);
    ctx.fillText(`HP ${def.hp}   DMG ${def.damage}   CD ${(def.cooldown / 60).toFixed(1)}s`, cardX + 95, cardY + 54);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(def.ability, cardX + 95, cardY + 74);

    ctx.fillStyle = '#ccc';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 95, cardY + 96, cardW - 110, 16);

    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.indexInspectIndex = originalIdx;
      state.gameState = 'indexDetail';
    });
  });

  drawButton('⌂ BACK', 75, 335, () => { goToTitle(); }, 100, 35);
}

// ─────────────────────────────────────────────
// WEAPON MENU SCREEN
// ─────────────────────────────────────────────

export function drawWeaponMenu() {
  const { ctx, canvas } = state;
  
  // Reset context to prevent leaks from previous frames
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cinematic Background (Dark Vignette)
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#111520');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  ctx.fillText('WEAPON ARSENAL', canvas.width / 2, 45);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Inspect detailed weapon schematics', canvas.width / 2, 65);

  const cardX = Math.max(30, (canvas.width - 600) / 2);
  const cardW = Math.min(canvas.width - 60, 600);
  const cardH = 130;
  const cardSpacing = 20;

  FIGHTER_DEFS.forEach((def, idx) => {
    const cardY = 95 + idx * (cardH + cardSpacing) - state.weaponScroll;
    if (cardY > canvas.height || cardY + cardH < 0) return;

    // Glassmorphism Panel
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Glowing left accent line
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + 10, 4, cardH - 20, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Text Layout
    ctx.fillStyle = def.color;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 24, cardY + 16);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(def.type.toUpperCase(), cardX + 24, cardY + 40);

    ctx.fillStyle = '#ffd700';
    ctx.font = '12px Arial';
    ctx.fillText(def.ability, cardX + 24, cardY + 58);

    // Shortened description snippet
    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 24, cardY + 80, cardW - 160, 16);

    // Weapon Preview Pedestal
    const previewSize = 90;
    const previewX = cardX + cardW - previewSize / 2 - 20;
    const previewY = cardY + cardH / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(previewX, previewY, 0, previewX, previewY, previewSize / 2);
    pedGrad.addColorStop(0, `rgba(255, 255, 255, 0.1)`);
    pedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.arc(previewX, previewY, previewSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(previewX, previewY);
    ctx.scale(0.65, 0.65);
    // Add a slight floating animation per card
    ctx.translate(0, Math.sin(Date.now() / 300 + idx) * 4);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Make card clickable
    drawButton('', cardX + cardW / 2, cardY + cardH / 2, () => {
      state.selectedWeapon = def;
      state.gameState = 'weaponDetail';
    }, cardW, cardH, true);
  });

  drawButton('⌂ BACK', 75, canvas.height - 40, () => { goToTitle(); }, 100, 35);
}

// ─────────────────────────────────────────────
// WEAPON DETAIL SCREEN
// ─────────────────────────────────────────────

function drawPremiumStatBar(ctx, x, y, width, label, valueStr, percentage, color) {
  // Label
  ctx.fillStyle = '#aaa';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 5);
  
  // Value text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(valueStr, x + width, y - 5);

  // Background bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, 6, 3);
  ctx.fill();

  // Foreground bar (glow)
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(6, width * percentage), 6, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawWeaponDetailScreen() {
  const { ctx, canvas } = state;
  const def = state.selectedWeapon;
  if (!def) {
    state.gameState = 'weapons';
    return;
  }

  // Reset context to prevent leaks from previous frames
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cinematic Background
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#0f141e');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hero Display: massive radial backlight matching signature color
  const heroY = canvas.height * 0.38;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(canvas.width / 2, heroY, 0, canvas.width / 2, heroY, 250);
  // Parse hex to rgba for glow
  let r=0, g=150, b=255;
  if (def.color.startsWith('#') && def.color.length === 7) {
    r = parseInt(def.color.slice(1,3), 16);
    g = parseInt(def.color.slice(3,5), 16);
    b = parseInt(def.color.slice(5,7), 16);
  }
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
  glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.05)`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Animated Hero Weapon Display
  ctx.save();
  ctx.translate(canvas.width / 2, heroY);
  ctx.scale(2.4, 2.4);
  // Bobbing animation
  ctx.translate(0, Math.sin(Date.now() / 400) * 8);
  
  if (state.showWeaponModel) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const previewFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
    previewFighter.angle = 0;
    try {
      // The fighter might need a fake opponent to render certain things (like eyes tracking)
      previewFighter.draw(ctx, { x: 100, y: 0 });
    } catch (e) {
      console.error('Preview draw error:', e);
    }
  } else {
    drawWeaponPreview(ctx, def.type, def.color);
  }
  ctx.restore();

  // Glassmorphism Info Panel at the bottom
  const panelH = Math.min(280, canvas.height * 0.45);
  const panelY = canvas.height - panelH - 20;
  const panelW = Math.min(canvas.width - 40, 700);
  const panelX = (canvas.width - panelW) / 2;

  ctx.fillStyle = 'rgba(15, 20, 30, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  // Top Accent Line on the panel
  ctx.fillStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 40, panelY, 80, 3, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Header Texts
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name.toUpperCase(), canvas.width / 2, panelY + 25);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(def.ability.toUpperCase(), canvas.width / 2, panelY + 65);

  // Stats Section (Horizontal Bars)
  const barW = Math.min(500, panelW - 100);
  const statsX = (canvas.width - barW) / 2;
  const barY = panelY + 110;
  
  // Normalization logic for stats
  const maxDmg = 150; // max reasonable damage
  const maxCD = 10; // max 10 sec
  const maxSpd = 3.0; // max 3x speed

  const dmgVal = def.damage;
  const dmgPct = Math.min(1, dmgVal / maxDmg);
  
  const cdVal = def.cooldown / 60;
  const cdPct = Math.min(1, cdVal / maxCD);
  
  const spdVal = def.projectileSpeedMultiplier || 1.0;
  const spdPct = Math.min(1, spdVal / maxSpd);

  drawPremiumStatBar(ctx, statsX, barY, barW, 'DAMAGE OUTPUT', dmgVal.toString(), dmgPct, '#ff4d4d');
  drawPremiumStatBar(ctx, statsX, barY + 30, barW, 'COOLDOWN TIME', cdVal.toFixed(1) + 's', cdPct, '#4da6ff');
  drawPremiumStatBar(ctx, statsX, barY + 60, barW, 'PROJECTILE VELOCITY', spdVal.toFixed(1) + 'x', spdPct, '#b366ff');

  // Description
  ctx.fillStyle = '#ccc';
  ctx.font = '13px Arial';
  wrapText(ctx, def.desc, canvas.width / 2, barY + 100, barW, 20);

  // Navigation (Pinned to the top)
  const btnY = 35; 
  drawButton('← ARSENAL', 80, btnY, () => {
    state.gameState = 'weapons';
  }, 120, 35);

  // Toggle Fighter Model Button
  const toggleText = state.showWeaponModel ? '▣ SHOW MODEL' : '☐ SHOW MODEL';
  drawButton(toggleText, canvas.width / 2, btnY, () => {
    state.showWeaponModel = !state.showWeaponModel;
  }, 160, 35);

  const currentIdx = FIGHTER_DEFS.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width - 240, btnY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx - 1];
    }, 100, 35);
  }
  if (currentIdx < FIGHTER_DEFS.length - 1) {
    drawButton('NEXT ►', canvas.width - 120, btnY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx + 1];
    }, 100, 35);
  }
}

function drawWeaponPreview(ctx, type, color) {
  // Draw the real weapon designs used by the fighter implementations.
  // The preview caller already translates to the preview center.
  const now = Date.now();
  // Important: weapon previews should NOT spin in the WEAPON menu.
  // Keep them at a stable angle based on the current render time,
  // but quantize to avoid visible rotation.
  const gunAngle = 0;

  // We map the type to the same underlying visual functions.
  // The in-game visuals expect absolute positions, but our preview draws around (0,0)
  // so we pass x=y=0.
  const r = 25; // approximate fighter radius for consistent weapon sizing

  // Offset the canvas to perfectly center the weapon (which is usually drawn at X = r)
  let offsetX = -40; // Default offset for most right-handed weapons
  if (type === 'black') offsetX = 0; // Symmetrical
  else if (type === 'knight' || type === 'musashi') offsetX = -20; 
  else if (type === 'zeus' || type === 'darkslategray' || type === 'berserker' || type === 'bomber' || type === 'melee') offsetX = -35;
  else if (type === 'cronos') offsetX = -55; // Huge blade
  else if (type === 'ruby') offsetX = -75; // Massive scythe
  
  ctx.translate(offsetX, 0);

  try {
    switch (type) {
      case 'crimsonsniper':
      case 'normal':
        // Sniper rifle (uses color tint internally via stroke/fill)
        drawRedSniperGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'aimbot':
        // Aimbot laser gun
        drawBlueAimbotGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'grenadier':
        // Alchemist grenade launcher
        drawGreenBottleGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'laser':
        // Ivory railgun
        drawWhiteRailgun(ctx, 0, 0, gunAngle, r);
        return;

      case 'knight':
        // Gray knight shield + sword
        drawGrayShield(ctx, 0, 0, gunAngle, 0, 'none', r);
        drawGraySword(ctx, 0, 0, gunAngle, r);
        return;

      case 'darkslategray':
        // Assassin shuriken/melee dual visual — draw a shuriken stance
        drawDarkSlateGrayShuriken(ctx, 0, 0, gunAngle, r);
        return;

      case 'orange':
        // Flamethrower gun
        drawOrangeFlamethrowerGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'berserker':
        // Dual axes
        drawBerserkerDualAxes(ctx, 0, 0, gunAngle, r, false, false, 0, 0, 24);
        return;

      case 'cronos':
        // Cronos crescent blade (melee weapon visual)
        drawCronosCrescentBlade(ctx, 0, 0, gunAngle, r, false, 0, 0, 10, 1);
        return;

      case 'ruby':
        // Ruby's huge scythe
        drawRubyScythe(ctx, { r, gunAngle, activePullActive: false, passiveSpinActive: false, scytheSwingActive: false });
        return;

      case 'musashi': {
        const mockFighter = {
          x: 0,
          y: 0,
          r: r,
          gunAngle: gunAngle,
          oarWindupTimer: 0,
          strikeTimer: 0,
          nitenActiveTimer: 0,
          isNitenSecondHit: false,
          currentStance: 'water'
        };
        drawMusashiSheaths(ctx, mockFighter, false);
        drawMusashiWeapons(ctx, mockFighter);
        return;
      }

      case 'bomber': {
        const skinColor = color || '#4A2508';
        const skinAccentColor = '#FFD700';
        ctx.save();
        ctx.translate(r, 0);

        // Draw grenade launcher barrel
        ctx.fillStyle = skinColor;
        ctx.fillRect(0, -6, 20, 12);
        ctx.fillStyle = '#3B2A18';
        ctx.fillRect(15, -4, 8, 8);

        // Draw grenade texture pattern
        ctx.fillStyle = skinAccentColor;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(5 + i * 6, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }


      case 'gunslinger':
        // Dual revolvers
        drawGunSlingerDualRevolver(0, 0, gunAngle, gunAngle + 0.18, r, false, 0);
        return;

      case 'melee':
        // Spike fighter uses spike weapon visual
        drawSpikeWeapon(ctx, 0, 0, gunAngle, r, false, now);
        return;

      case 'black': {
        ctx.save();

        // Left orb
        ctx.save();
        ctx.translate(-r - 8, 0);
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 0, 255, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        const orbitAngle = Date.now() / 150;
        ctx.beginPath();
        ctx.arc(Math.cos(orbitAngle) * 6, Math.sin(orbitAngle) * 6, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#df80ff';
        ctx.fill();
        ctx.restore();

        // Right orb
        ctx.save();
        ctx.translate(r + 8, 0);
        const pulse2 = Math.sin(Date.now() / 200 + Math.PI) * 0.2 + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * pulse2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 0, 255, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        const orbitAngle2 = Date.now() / 150 + Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(orbitAngle2) * 6, Math.sin(orbitAngle2) * 6, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#df80ff';
        ctx.fill();
        ctx.restore();

        ctx.restore();
        return;
      }

      case 'Engineer':
        // Draws Engineer's shotgun active and wrench stowed on back
        drawEngineer(ctx, { x: 0, y: 0, gunAngle: gunAngle, r: r, lastWeaponUsed: 'shotgun' });
        return;

      case 'zeus':
        // Draws the Master Bolt
        drawZeusWeapon(ctx, 0, 0, gunAngle, r, Date.now() / 200);
        return;

      default:
        // Fallback: draw the default gray gun used by base fighters
        ctx.save();
        ctx.translate(r, 0);
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, -5, 14, 10);
        ctx.fillStyle = '#222';
        ctx.fillRect(8, -2.5, 10, 5);
        ctx.restore();
        return;
    }
  } catch (e) {
    console.warn('Weapon preview render failed:', type, e);

    // Last-resort fallback
    ctx.save();
    ctx.translate(r, 0);
    ctx.fillStyle = '#444';
    ctx.fillRect(-3, -5, 14, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2.5, 10, 5);
    ctx.restore();
  }
}


export function drawIndexDetailScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePreviewBalls();

  const def = FIGHTER_DEFS[state.indexInspectIndex];
  const demoArea = { x: 310, y: 90, width: 260, height: 220 };

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(def.name.toUpperCase(), canvas.width / 2, 42);

  drawPanel(demoArea.x, demoArea.y, demoArea.width, demoArea.height, 0.85);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(demoArea.x, demoArea.y, demoArea.width, demoArea.height);

  const demoState = updateIndexDetailDemo(def, demoArea);
  const fighter = demoState.fighter;
  const target = demoState.target;

  // Demo label and guide lines
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('DEMO: moves, aims, and fires', demoArea.x + 12, demoArea.y + 18);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const step = (i + 1) * 40;
    ctx.strokeRect(demoArea.x + step, demoArea.y + step / 2, demoArea.width - step * 2, demoArea.height - step / 2 * 2);
  }
  ctx.restore();

  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(demoState.frame / 12));
  ctx.save();
  ctx.globalAlpha = pulse * 0.9;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 77, 77, 0.18)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 77, 77, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(target.x - target.r - 6, target.y);
  ctx.lineTo(target.x + target.r + 6, target.y);
  ctx.moveTo(target.x, target.y - target.r - 6);
  ctx.lineTo(target.x, target.y + target.r + 6);
  ctx.stroke();

  const projectiles = previewProjectileSystem.getProjectiles();
  projectiles.forEach((p) => {
    if (p.isGrenade) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      if (p.history && p.history.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(77, 255, 77, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        p.history.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  });

  const impacts = previewProjectileSystem.getImpacts();
  impacts.forEach((effect) => {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, effect.life / 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  projectiles.forEach((p) => {
    if (p.isGrenade && p.life <= 8) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28 + (8 - p.life) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77, 255, 77, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  });

  fighter.draw(ctx, target);

  const leftX = 40;
  const leftY = 100;
  const leftW = 240;

  drawPanel(leftX, 80, leftW, 300, 0.85);
  ctx.fillStyle = def.color;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name, leftX + 18, leftY + 4);

  ctx.fillStyle = '#aaa';
  ctx.font = '11px Arial';
  ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, leftX + 18, leftY + 32);
  ctx.fillText(`ABILITY: ${def.ability}`, leftX + 18, leftY + 50);
  ctx.fillText(`HP: ${def.hp}`, leftX + 18, leftY + 72);
  ctx.fillText(`DMG: ${def.damage}`, leftX + 18, leftY + 88);
  ctx.fillText(`COOLDOWN: ${(def.cooldown / 60).toFixed(1)}s`, leftX + 18, leftY + 104);
  ctx.fillText(`MOVEMENT: ${fighter.speed.toFixed(1)}`, leftX + 18, leftY + 120);
  ctx.fillText(`DESCRIPTION:`, leftX + 18, leftY + 144);

  ctx.fillStyle = '#ccc';
  ctx.font = '11px Arial';
  wrapText(ctx, def.desc, leftX + 18, leftY + 164, leftW - 36, 16);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '11px Arial';
  ctx.fillText('Demo arena shows how the fighter moves and aims.', leftX + 18, leftY + 260);

  drawButton('⌂ BACK', 75, 350, () => { state.gameState = 'index'; }, 100, 35);
}


let selectInspectedIndex = 0;
let previewFighterInstance = null;
let lastInspectedIndex = -1;

export function drawSelectScreen() {
  const { ctx, canvas, mode } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Animated gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  const time = Date.now() * 0.0005;
  gradient.addColorStop(0, `hsl(${Math.sin(time) * 30 + 240}, 70%, 10%)`);
  gradient.addColorStop(0.5, `hsl(${Math.sin(time * 0.7) * 20 + 260}, 60%, 15%)`);
  gradient.addColorStop(1, `hsl(${Math.sin(time * 0.9) * 40 + 250}, 80%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background preview balls
  updatePreviewBalls();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CHOOSE YOUR FIGHTERS', canvas.width / 2, 44);

  ctx.fillStyle = '#ccc';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('GAME MODE', canvas.width / 2, 72);

  const modeButtonY = 100;
  drawModeSelection(canvas.width / 2, modeButtonY);

  // Test Mode Premium Toggle
  const tmW = 150;
  const tmH = 28;
  const gap = 16;
  const tmX = canvas.width / 2 - tmW - gap / 2;
  const tmY = 140 - tmH / 2;

  ctx.fillStyle = state.testMode ? 'rgba(40, 180, 80, 0.3)' : 'rgba(100, 100, 100, 0.2)';
  ctx.strokeStyle = state.testMode ? '#4ade80' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(tmX, tmY, tmW, tmH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.testMode ? '#fff' : '#ccc';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧪 TEST MODE', tmX + tmW / 2 + (state.testMode ? -10 : 10), tmY + tmH / 2);

  ctx.beginPath();
  ctx.arc(state.testMode ? tmX + tmW - 14 : tmX + 14, tmY + tmH / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = state.testMode ? '#4ade80' : '#888';
  ctx.shadowColor = state.testMode ? '#4ade80' : 'transparent';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  _registerButton(tmX, tmY, tmW, tmH, () => { state.testMode = !state.testMode; });

  // Dummy Visibility Toggle
  const daX = canvas.width / 2 + gap / 2;
  const daY = 140 - tmH / 2;

  ctx.fillStyle = state.dummyEnabled ? 'rgba(34, 120, 60, 0.3)' : 'rgba(100, 100, 100, 0.2)';
  ctx.strokeStyle = state.dummyEnabled ? '#4ade80' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(daX, daY, tmW, tmH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.dummyEnabled ? '#fff' : '#ccc';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎯 DUMMY', daX + tmW / 2 + (state.dummyEnabled ? -10 : 10), daY + tmH / 2);

  ctx.beginPath();
  ctx.arc(state.dummyEnabled ? daX + tmW - 14 : daX + 14, daY + tmH / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = state.dummyEnabled ? '#4ade80' : '#888';
  ctx.shadowColor = state.dummyEnabled ? '#4ade80' : 'transparent';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  _registerButton(daX, daY, tmW, tmH, () => {
    state.dummyEnabled = !state.dummyEnabled;
    // If disabling, reset any player selection that points to a dummy-type fighter
    if (!state.dummyEnabled) {
      const dummyIdx = FIGHTER_DEFS.findIndex(d => d.type === 'dummy');
      if (dummyIdx !== -1) {
        if (state.p1Index === dummyIdx) state.p1Index = 0;
        if (state.p2Index === dummyIdx) state.p2Index = 1;
        if (state.p3Index === dummyIdx) state.p3Index = 2;
        if (state.p4Index === dummyIdx) state.p4Index = 3;
      }
    }
  });

  const margin = 34;
  const cardGap = 14;
  const cardW = Math.min(250, Math.max(220, (canvas.width - margin * 2 - cardGap) / 2));

  // Dynamically calculate card height to avoid overlapping with footer
  const availableH = canvas.height - 180 - 70; // 180 is approx topY, 70 is space for footer
  const cardH = Math.min(200, Math.max(150, (availableH - cardGap) / 2));

  const leftX = margin;
  const rightX = canvas.width - margin - cardW;
  const topY = 180;
  const bottomY = topY + cardH + cardGap;

  if (mode === '2v2') {
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RED SIDE', leftX + cardW / 2, topY - 24);
    ctx.fillStyle = '#4da3ff';
    ctx.fillText('BLUE SIDE', rightX + cardW / 2, topY - 24);
  } else if (mode === 'TLFS') {
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR CHAMPION', leftX + cardW / 2, topY - 24);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('ENEMY POOL', rightX + cardW / 2, topY - 24);
  }

  if (mode === 'TLFS') {
    // Only one player card
    drawPlayerCard('p1Index', 'PLAYER 1', leftX, topY + cardH / 2, cardW, cardH, '#00f3ff', true);
    
    // Draw Enemy Pool toggles
    drawTlfsEnemyPoolGrid(rightX, topY, cardW, cardH * 2 + cardGap);
  } else {
    drawPlayerCard('p1Index', mode === '2v2' ? 'RED 1' : 'PLAYER 1', leftX, topY, cardW, cardH, '#ff4d4d', true);
    drawPlayerCard('p2Index', mode === '2v2' ? 'BLUE 1' : 'PLAYER 2', rightX, topY, cardW, cardH, '#4da3ff', true);
    const p3Enabled = mode === 'FFA' || mode === '2v2';
    const p4Enabled = mode === 'FFA' || mode === '2v2';
    drawPlayerCard('p3Index', mode === '2v2' ? 'RED 2' : 'PLAYER 3', leftX, bottomY, cardW, cardH, '#ff4d4d', p3Enabled);
    drawPlayerCard('p4Index', mode === '2v2' ? 'BLUE 2' : 'PLAYER 4', rightX, bottomY, cardW, cardH, '#4da3ff', p4Enabled);
  }

  // Ensure footer is placed exactly after the bottom cards with padding
  const footerY = bottomY + cardH + 34;
  const centerX = canvas.width / 2;
  const actionBtnW = Math.min(180, Math.max(120, canvas.width * 0.28));
  const actionSpacing = Math.min(24, Math.max(14, canvas.width * 0.04));

  if (mode === 'FFA' || mode === '2v2') {
    drawButton('🎲 RANDOMIZE', centerX, footerY, () => { randomizeFfaFighters(); }, actionBtnW, 36);
    drawButton('⚔ START BATTLE', centerX - actionBtnW - actionSpacing, footerY, () => { startGame(); }, actionBtnW, 36);
    drawButton('⌂ BACK', centerX + actionBtnW + actionSpacing, footerY, () => { goToTitle(); }, Math.min(140, actionBtnW), 36);
  } else if (mode === '1v1') {
    drawButton('🎲 RANDOMIZE', centerX, footerY, () => { randomize1v1Fighters(); }, actionBtnW, 36);
    drawButton('⚔ START BATTLE', centerX - actionBtnW - actionSpacing, footerY, () => { startGame(); }, actionBtnW, 36);
    drawButton('⌂ BACK', centerX + actionBtnW + actionSpacing, footerY, () => { goToTitle(); }, Math.min(140, actionBtnW), 36);
  } else if (mode === 'TLFS') {
    drawButton('🎲 RANDOMIZE', centerX, footerY, () => { state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length); }, actionBtnW, 36);
    drawButton('⚔ START GAUNTLET', centerX - actionBtnW - actionSpacing, footerY, () => { startGame(); }, actionBtnW, 36);
    drawButton('⌂ BACK', centerX + actionBtnW + actionSpacing, footerY, () => { goToTitle(); }, Math.min(140, actionBtnW), 36);
  } else {
    drawButton('⚔ START BATTLE', centerX - actionBtnW / 2 - actionSpacing / 2, footerY, () => { startGame(); }, actionBtnW, 36);
    drawButton('⌂ BACK', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { goToTitle(); }, Math.min(140, actionBtnW), 36);
  }

  if (selectingSlot !== null) {
    drawFighterSelectModal();
  }
}

function randomizeFfaFighters() {
  const indices = FIGHTER_DEFS.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  state.p1Index = indices[0];
  state.p2Index = indices[1];
  state.p3Index = indices[2];
  state.p4Index = indices[3];
}

function drawModeSelection(cx, cy) {
  const { ctx, canvas } = state;
  const modes = [{ id: '1v1', label: '1v1' }, { id: '2v2', label: '2v2' }, { id: 'FFA', label: 'FFA' }, { id: 'TLFS', label: 'TLFS' }];
  const buttonWidth = Math.min(100, Math.max(70, canvas.width * 0.12)); // slightly smaller to fit 4 buttons
  const buttonHeight = 36;
  const gap = Math.min(15, Math.max(10, canvas.width * 0.02));
  const totalWidth = modes.length * buttonWidth + (modes.length - 1) * gap;
  let startX = cx - totalWidth / 2;

  modes.forEach((mode) => {
    const selected = state.mode === mode.id;
    ctx.fillStyle = selected ? 'rgba(255,255,255,0.16)' : 'rgba(20,22,28,0.8)';
    ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = selected ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(startX, cy - buttonHeight / 2, buttonWidth, buttonHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? '#fff' : '#ccc';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mode.label, startX + buttonWidth / 2, cy);

    _registerButton(startX, cy - buttonHeight / 2, buttonWidth, buttonHeight, () => {
      state.mode = mode.id;
      if (state.mode === 'FFA' || state.mode === '2v2') {
        state.p3Index = state.p3Index ?? 2;
        state.p4Index = state.p4Index ?? 3;
      }
      if (state.mode === 'TLFS') {
        // Initialize allowed enemies list if not already
        if (!state.tlfsAllowedEnemies || state.tlfsAllowedEnemies.length === 0) {
          state.tlfsAllowedEnemies = FIGHTER_DEFS.map((_, i) => i);
        }
      }
    });

    startX += buttonWidth + gap;
  });
}

function drawFfaSelectionPanel(x, y, title, selectedIndexProp) {
  const { ctx } = state;
  const panelW = 172;
  const panelH = 170;
  drawPanel(x, y, panelW, panelH, 0.84);

  ctx.fillStyle = title === 'PLAYER 3' ? '#ffbf4d' : '#8c8cff';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + panelW / 2, y + 28);

  const btnX = x + 14;
  const btnW = panelW - 28;
  const btnH = 26;
  const btnYStart = y + 56;
  const btnSpacing = 8;

  // Filter out dummy-type fighters when dummy is disabled
  const ffaAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  ffaAvailableFighters.forEach(({ def, idx }, listPos) => {
    const btnY = btnYStart + listPos * (btnH + btnSpacing);
    const isSelected = state[selectedIndexProp] === idx;

    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.18)' : 'rgba(20, 22, 28, 0.8)';
    ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = def.color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.toUpperCase(), btnX + btnW / 2, btnY + btnH / 2);

    _registerButton(btnX, btnY, btnW, btnH, () => {
      state[selectedIndexProp] = idx;
      selectInspectedIndex = idx;
    });
  });
}

function drawHpPanel(fighter, x, y, alignRight, fighterIndex) {
  const ctx = state.ctx;
  const panelW = 160;
  const panelH = (state.mode === 'FFA' || state.mode === '2v2') ? 58 : 46;
  const px = alignRight ? x - panelW : x;

  drawPanel(px, y, panelW, panelH, 0.7);

  const padding = 12;
  const barW = panelW - padding * 2;
  const barH = 10;
  const barX = px + padding;
  const barY = y + 26;

  const badgeSize = fighter.lastKilledDef ? 14 : 0;
  const badgeSpacing = fighter.lastKilledDef ? 6 : 0;

  // Prepare name rendering - auto-scale font for long names
  const maxNameW = panelW - padding * 2 - 40; // Reserve space for HP text
  let nameFontSize = 14;
  ctx.font = `bold ${nameFontSize}px Arial`;
  while (ctx.measureText(fighter.name).width > maxNameW && nameFontSize > 8) {
    nameFontSize--;
    ctx.font = `bold ${nameFontSize}px Arial`;
  }
  ctx.fillStyle = fighter.color;
  ctx.textBaseline = 'alphabetic';

  const nameXBase = alignRight ? px + panelW - padding : px + padding;
  ctx.textAlign = alignRight ? 'right' : 'left';
  // Measure name width to position badge relative to the rendered name
  const nameWidth = ctx.measureText(fighter.name).width;

  if (fighter.lastKilledDef) {
    const badgeCenterX = alignRight
      ? nameXBase - nameWidth - badgeSpacing - (badgeSize / 2)
      : nameXBase + nameWidth + badgeSpacing + (badgeSize / 2);
    const badgeY = y + 18;
    drawSmallFighterBadge(ctx, fighter.lastKilledDef, badgeCenterX, badgeY, badgeSize);
  }

  // Name
  ctx.fillText(fighter.name, nameXBase, y + 18);

  // HP Text
  const displayHp = Number.isInteger(fighter.hp) ? `${fighter.hp}` : fighter.hp.toFixed(1);
  const displayMaxHp = Number.isInteger(fighter.maxHp) ? `${fighter.maxHp}` : fighter.maxHp.toFixed(1);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = alignRight ? 'left' : 'right';
  ctx.fillText(`${displayHp}/${displayMaxHp}`, alignRight ? px + padding : px + panelW - padding, y + 18);

  // Bar Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();

  // Bar Fill
  const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);
  const hue = hpRatio * 120;
  ctx.fillStyle = `hsl(${hue}, 90%, 48%)`;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
  ctx.fill();

  if (state.mode === 'FFA' && typeof fighterIndex === 'number') {
    const winCount = state.scores[fighterIndex] || 0;
    const maxWins = 2;
    const bulletSize = 8;
    const bulletGap = 8;
    const totalWidth = maxWins * bulletSize + (maxWins - 1) * bulletGap;
    const startX = alignRight ? px + panelW - padding - totalWidth : px + padding;
    const bulletY = y + panelH - 14;

    for (let i = 0; i < maxWins; i += 1) {
      const bulletX = startX + i * (bulletSize + bulletGap) + bulletSize / 2;
      const filled = i < winCount;
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, bulletSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = filled ? fighter.color : 'transparent';
      ctx.fill();
      ctx.strokeStyle = filled ? fighter.color : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawTeamHpCard(teamIndex, fighterIndexes, x, y, w, h, teamColor, teamName) {
  const ctx = state.ctx;
  drawPanel(x, y, w, h, 0.84, 14);

  // Team tint overlay
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12);
  ctx.fill();
  ctx.restore();

  // Team header stripe
  ctx.fillStyle = teamColor;
  ctx.fillRect(x + 2, y + 2, w - 4, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(teamName, x + 14, y + 14);

  const rowX = x + 12;
  const rowW = w - 24;
  const rowH = 32;
  const rowGap = 8;

  fighterIndexes.forEach((fighterIndex, i) => {
    const fighter = state.fighters[fighterIndex];
    if (!fighter) return;

    const currentY = y + 32 + 8 + i * (rowH + rowGap);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(rowX, currentY, rowW, rowH, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fighter.name, rowX + 10, currentY + 6);

    const displayHp = Number.isInteger(fighter.hp) ? `${fighter.hp}` : fighter.hp.toFixed(1);
    const displayMaxHp = Number.isInteger(fighter.maxHp) ? `${fighter.maxHp}` : fighter.maxHp.toFixed(1);
    ctx.font = '11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${displayHp}/${displayMaxHp}`, rowX + rowW - 10, currentY + 6);

    const barX = rowX + 10;
    const barY = currentY + rowH - 14;
    const barW = rowW - 20;
    const barH = 8;
    const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = `hsl(${hpRatio * 120}, 92%, 56%)`;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
    ctx.fill();
  });
}

export function drawHUD() {
  const { ctx, canvas, fighters, scores, roundNum, mode, gameState, matchEndTimer, roundEndTimer, roundWinner, ffaMatchComplete } = state;
  _clearButtons(); // We might not have buttons here, but good practice

  // Calculate HUD opacity during champion reveal fade-in
  let hudOpacity = 1;
  if (gameState === 'matchEnd') {
    const revealTimer = Math.max(0, matchEndTimer - 45); // match end delay
    hudOpacity = Math.max(0, 1 - (revealTimer / 30));
  } else if (gameState === 'roundEnd') {
    const winnerIndex = roundWinner ? fighters.indexOf(roundWinner) : -1;
    const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= 2;
    const showModel = hasTwoWins && roundWinner;
    const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || (showModel && mode !== 'FFA');
    
    if (isChampionReveal) {
      const displayDelay = 60; // round end delay
      const delayedTimer = Math.max(0, roundEndTimer - displayDelay);
      hudOpacity = Math.max(0, 1 - (delayedTimer / 30));
    }
  }

  // Health HUD is rendered below the canvas in DOM.
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  
  if (containerBottom) containerBottom.style.opacity = hudOpacity;
  if (containerLeft) containerLeft.style.opacity = hudOpacity;
  if (containerRight) containerRight.style.opacity = hudOpacity;

  updateHealthHud();

  if (hudOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = hudOpacity;

    const cx = state.arena.x + state.arena.width / 2;
    const topY = state.arena.y - 36;

    // Draw round on top
    drawPanel(cx - 90, topY, 180, 26, 0.7);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    const roundsMax = MODE_SETTINGS[mode]?.rounds || MODE_SETTINGS[GAME_MODES.ONE_VS_ONE].rounds;
    ctx.fillText(`ROUND ${roundNum} OF ${roundsMax}`, cx, topY + 18);

    // Draw rotate message at the bottom
    const bottomY = state.arena.y + state.arena.height + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'italic 12px Arial';
    ctx.fillText('', cx, bottomY);

    ctx.restore();
  }
}

// Helper function to adjust color brightness
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function clearHealthHud() {
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  if (containerBottom) containerBottom.innerHTML = '';
  if (containerLeft) containerLeft.innerHTML = '';
  if (containerRight) containerRight.innerHTML = '';
}

document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.dummy-aggressive-toggle')) {
    import('../core/state.js').then(m => {
      m.state.dummyAggressive = !m.state.dummyAggressive;
    });
  }
});

function updateHealthHud() {
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  if (!containerBottom) return;

  const { fighters, mode, scores, teamScores } = state;
  const teamMode = mode === GAME_MODES.TWO_VS_TWO;
  const cardsLeft = [];
  const cardsRight = [];
  const cardsBottom = [];

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5 }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
    const glowAlpha = shakeTimer > 0 ? (shakeTimer / 12) * 0.85 : 0;
    const shakeStyle = shakeTimer > 0 ? `transform: translateX(${shakeAmount}px);` : '';
    // Winner effect - no glow
    const winnerStyle = '';

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map(m => {
        const ratio = m.maxHp > 0 ? Math.max(0, Number(m.hp) / Number(m.maxHp)) : 0;
        const percent = Math.round(ratio * 100);
        const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        const fillStyle = `width:${percent}%; background:${barColor};`;
        return `
          <div class="health-card__member" style="margin-top: 12px;">
            <div style="font-size: 12px; margin-bottom: 6px; color: rgba(255,255,255,0.95); font-weight: bold;">${m.name || 'Unknown'}</div>
            <div class="health-card__bar">
              <div class="health-card__fill" style="${fillStyle}"></div>
            </div>
            <div class="health-card__meta"><span>HP</span><span>${Math.floor(Math.max(0, Number(m.hp) || 0))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}</span></div>
          </div>
        `;
      }).join('');
    } else {
      const percent = Math.round(safeRatio * 100);
      const barColor = safeRatio > 0.5 ? '#22c55e' : safeRatio > 0.25 ? '#eab308' : '#ef4444';
      const fillStyle = `width:${percent}%; background:${barColor};`;
      barsHTML = `
        <div class="health-card__bar">
          <div class="health-card__fill" style="${fillStyle}"></div>
        </div>
        <div class="health-card__meta"><span>${metaLabel}</span><span>${metaValue}</span></div>
      `;
    }

    // Auto-scale title font size for long names
    const baseFontSize = extraClass.includes('ffa-card') ? 13 : 16;
    const maxChars = extraClass.includes('ffa-card') ? 10 : 12;
    const minFontSize = 9;
    let titleFontSize = baseFontSize;
    if (title.length > maxChars) {
      titleFontSize = Math.max(minFontSize, Math.floor(baseFontSize * maxChars / title.length));
    }
    const titleStyle = titleFontSize < baseFontSize ? `font-size:${titleFontSize}px;` : '';
    const nameColor = '#000000';

    // Generate victory bullets (filled bullets for wins)
    const winsBullets = Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      return `<span class="health-card__win-bullet" style="background: ${filled ? '#ffd700' : 'rgba(0,0,0,0.2)'}; ${filled ? 'box-shadow: 0 0 6px rgba(255,215,0,0.6);' : ''}"></span>`;
    }).join('');

    return `
      <div class="health-card" style="${shakeStyle}${winnerStyle} display: inline-block; vertical-align: top; background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none;">
        <div class="health-card__title" style="${titleStyle}color: ${nameColor}; display: block; margin-bottom: 6px;">${title}</div>
        <div class="health-card__wins" style="margin: 6px 0 8px; display: flex; gap: 6px;">${winsBullets}</div>
        ${barsHTML}
        ${description ? `<div class="health-card__desc" style="color: rgba(0, 0, 0, 0.7); margin-top: 8px; font-size: 11px; line-height: 1.3;">${description}</div>` : ''}
      </div>
    `;
  };

  if (teamMode) {
    const teamLabels = [
      { title: 'RED TEAM', color: '#ff4d4d', indexes: [0, 1], key: 'red' },
      { title: 'BLUE TEAM', color: '#4da3ff', indexes: [2, 3], key: 'blue' },
    ];

    teamLabels.forEach((team, teamIndex) => {
      const members = team.indexes.map((fighterIndex) => fighters[fighterIndex]).filter(Boolean);
      const shakeTimer = members.reduce((max, fighter) => Math.max(max, fighter._healthBarShakeTimer || 0), 0);
      const isWinner = state.roundWinner && team.indexes.some(idx => fighters[idx] === state.roundWinner);

      const cardHTML = buildCard({
        title: team.title,
        scoreText: `${teamScores[teamIndex] || 0} WINS`,
        fillColor: team.color,
        members: members,
        extraClass: team.key,
        shakeTimer,
        isWinner: isWinner,
        borderColor: isWinner ? '#ffd700' : null,
        kills: members.flatMap(m => state.matchKills ? state.matchKills[fighters.indexOf(m)] || [] : [])
      });
      if (teamIndex === 0) cardsLeft.push(cardHTML);
      else cardsRight.push(cardHTML);
    });
  } else {
    fighters.forEach((fighter, index) => {
      if (!fighter || fighter.isTurret) return;
      const ratio = fighter.maxHp > 0 ? Math.max(0, Number(fighter.hp) / Number(fighter.maxHp)) : 0;
      const color = fighter.color || '#fff';
      const fighterName = fighter.name || `FIGHTER ${index + 1}`;
      const fighterStats = state.leaderboard[fighter.fighterIndex] || { wins: 0, losses: 0 };
      const careerWins = fighterStats.wins;
      const losses = fighterStats.losses;
      const totalGames = careerWins + losses;
      const winRate = totalGames > 0 ? Math.round((careerWins / totalGames) * 100) : 0;
      const fighterDef = fighter.fighterIndex !== undefined ? FIGHTER_DEFS[fighter.fighterIndex] : null;
      const className = fighterDef ? fighterDef.type.toUpperCase() : '';
      const shakeTimer = fighter._healthBarShakeTimer || 0;
      const matchWins = scores[index] || 0;

      let cardDesc = (fighterDef && mode !== GAME_MODES.FFA) ? fighterDef.desc : '';
      if (fighterDef && fighterDef.type === 'dummy') {
        const checkedStr = state.dummyAggressive ? 'checked' : '';
        cardDesc = `
            <div class="dummy-aggressive-toggle" style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); cursor: pointer; pointer-events: auto;">
              <span style="font-weight: bold; font-size: 11px; color: ${state.dummyAggressive ? '#ef4444' : '#aaa'}; pointer-events: none;">AGGRESSIVE MODE</span>
              <label style="position: relative; display: inline-block; width: 34px; height: 18px; pointer-events: none;">
                <input type="checkbox" ${checkedStr} style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: ${state.dummyAggressive ? '#ef4444' : '#555'}; border-radius: 18px; transition: .2s;">
                  <span style="position: absolute; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; border-radius: 50%; transition: .2s; transform: ${state.dummyAggressive ? 'translateX(16px)' : 'none'};"></span>
                </span>
              </label>
            </div>
          `;
      }

      const cardHTML = buildCard({
        title: fighterName,
        scoreText: totalGames > 0 ? `${winRate}% WR` : '',
        fillColor: color,
        fillRatio: ratio,
        metaLabel: `DMG: ${Math.max(0, Number(fighter.damage) || 0)}`,
        metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
        extraClass: mode === GAME_MODES.FFA ? 'ffa-card' : '',
        borderColor: color,
        wins: matchWins,
        fighterColor: color,
        shakeTimer,
        isWinner: fighter === state.roundWinner,
        description: cardDesc,
        kills: (mode === GAME_MODES.FFA) && state.matchKills ? state.matchKills[index] || [] : [],
        maxBullets: 2
      });

      if (mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.FFA || mode === 'TLFS') {
        cardsBottom.push(cardHTML);
      } else if (index % 2 === 0) {
        cardsLeft.push(cardHTML);
      } else {
        cardsRight.push(cardHTML);
      }
    });
  }

  const leftHTML = cardsLeft.join('');
  if (containerLeft && containerLeft.innerHTML !== leftHTML) containerLeft.innerHTML = leftHTML;

  const rightHTML = cardsRight.join('');
  if (containerRight && containerRight.innerHTML !== rightHTML) containerRight.innerHTML = rightHTML;

  const bottomHTML = cardsBottom.join('');
  if (containerBottom && containerBottom.innerHTML !== bottomHTML) containerBottom.innerHTML = bottomHTML;
}

export function drawPauseScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHUD(); // Keep HUD visible

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  drawPanel(cx - 120, cy - 100, 240, 260);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, cy - 60);

  drawButton('▶ Resume', cx, cy - 10, () => { state.gameState = 'playing'; });
  drawButton('↺ Restart Round', cx, cy + 45, () => { restartCurrentRound(); });
  drawButton('🏆 Leaderboard', cx, cy + 100, () => { state.gameState = 'leaderboard'; });
  drawButton('⌂ Main Menu', cx, cy + 155, () => { goToTitle(); }, 200, 36);
}

export function drawRoundEndScreen() {
  const { ctx, canvas, arena, roundWinner, roundNum, roundEndTimer, mode, ffaMatchComplete, scores } = state;
  _clearButtons();
  drawHUD();

  // Delay before winning display appears (in frames, ~1 second delay)
  const displayDelay = 60;
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Smooth fade-in effect (only after delay)
  const fadeAlpha = Math.min(0.7, delayedTimer / 60);
  ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
  ctx.fillRect(arena.x, arena.y, arena.width, arena.height);

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  // Check if winner has 2 victories (match win condition)
  const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
  const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= 2;
  const showModel = hasTwoWins && roundWinner;

  // Determine winner text
  let winnerText;
  if (mode === '2v2') {
    const winningTeam = state.teamScores[0] > state.teamScores[1] ? 0 : 1;
    winnerText = `TEAM ${winningTeam + 1} WINS ROUND ${roundNum}!`;
    ctx.fillStyle = winningTeam === 0 ? '#ff4d4d' : '#4da3ff';
  } else {
    winnerText = `${roundWinner.name.toUpperCase()} WINS ROUND ${roundNum}!`;
    ctx.fillStyle = roundWinner.color;
  }
  const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || (showModel && mode !== 'FFA');

  if (!isChampionReveal) {
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(winnerText, cx, cy - 10);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(``, cx, cy + 25);
    }
  }

  // Champion reveal animation in final FFA round
  if (mode === 'FFA' && ffaMatchComplete && roundWinner) {
    drawFfaChampionReveal(roundWinner, delayedTimer);
  }

  // Show winner model at 2 victories for 1v1 and 2v2 modes
  if (showModel && mode !== 'FFA') {
    drawWinnerReveal(roundWinner, delayedTimer, mode);
  }

  // Register full screen click
  _registerButton(0, 0, canvas.width, canvas.height, () => { startNextRound(); });
}

function drawWinnerReveal(winner, timer, mode) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;
  const scale = 1.4 + Math.sin(timer * 0.08) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);

  // Draw pulsing rings
  for (let i = 0; i < 4; i += 1) {
    const radius = 74 + i * 18 + Math.sin(timer * 0.12 + i * 0.7) * 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.03})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const preview = new FighterClass({
    ...def,
    startX: 0,
    startY: 0,
    startVx: 0,
    startVy: 0,
  });
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = 0;
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.shadowBlur = 24;
  ctx.shadowColor = winner.color;
  preview.draw(ctx, null);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('WINNER', cx, cy - 116);

  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + winner.r * scale + 18);
}

function drawFfaChampionReveal(winner, timer) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;
  const pulse = 1 + Math.sin(timer * 0.10) * 0.12;
  const scale = 1.4 + Math.sin(timer * 0.08) * 0.08;

  // Smooth fade-in animation over 30 frames (0.5 seconds at 60fps)
  const fadeAlpha = Math.min(1, timer / 30);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cx, cy);

  for (let i = 0; i < 4; i += 1) {
    const radius = 74 + i * 18 + Math.sin(timer * 0.12 + i * 0.7) * 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.03})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const preview = new FighterClass({
    ...def,
    startX: 0,
    startY: 0,
    startVx: 0,
    startVy: 0,
  });
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = 0;
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;

  // Use an offscreen canvas to guarantee perfect fade-in composition
  // This prevents complex weapon rendering logic from overriding globalAlpha
  if (!state._championPreviewCanvas) {
    state._championPreviewCanvas = document.createElement('canvas');
    state._championPreviewCanvas.width = 400;
    state._championPreviewCanvas.height = 400;
    state._championPreviewCtx = state._championPreviewCanvas.getContext('2d');
  }
  
  const pCtx = state._championPreviewCtx;
  pCtx.clearRect(0, 0, 400, 400);
  
  pCtx.save();
  pCtx.translate(200, 200);
  pCtx.shadowBlur = 24;
  pCtx.shadowColor = winner.color;
  preview.draw(pCtx, null);
  pCtx.restore();

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.drawImage(state._championPreviewCanvas, -200, -200);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CHAMPION', cx, cy - 116);

  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);

  ctx.fillStyle = '#ccc';
  ctx.font = '14px Arial';
  ctx.fillText('', cx, cy + winner.r * scale + 44);
  ctx.restore();
}

export function drawMatchEndScreen() {
  const { ctx, canvas, matchWinner, scores, fighters, mode } = state;
  _clearButtons();
  drawHUD();

  // Fade in the dark background over 60 frames
  const bgAlpha = Math.min(0.85, (state.matchEndTimer / 60) * 0.85);
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Delay showing the rest of the screen by 45 frames (0.75s)
  const delay = 45;
  if (state.matchEndTimer < delay) return;

  const revealTimer = state.matchEndTimer - delay;
  const globalAlpha = Math.min(1, revealTimer / 30);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // 2v2: show team winner text (no single fighter to display)
  if (mode === '2v2') {
    const winningTeam = state.teamScores[0] > state.teamScores[1] ? 0 : 1;
    const teamColor = winningTeam === 0 ? '#ff4d4d' : '#4da3ff';
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = teamColor;
    ctx.fillStyle = teamColor;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`TEAM ${winningTeam + 1}`, cx, cy - 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('WINS THE MATCH!', cx, cy + 15);
    ctx.restore();

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.fillText(`${state.teamScores[0]} — ${state.teamScores[1]}`, cx, cy + 55);
    ctx.restore();
    return;
  }

  // TLFS mode Champion Screen
  if (mode === 'TLFS') {
    const wonGauntlet = state.matchWinner === fighters[0];
    
    ctx.save();
    ctx.textAlign = 'center';
    
    if (wonGauntlet) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 48px Arial';
      ctx.fillText('CHAMPION!', cx, cy - 40);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(`YOU DEFEATED 5 ENEMIES`, cx, cy + 10);
    } else {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff4d4d';
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 48px Arial';
      ctx.fillText('CHAMPION FALLEN', cx, cy - 40);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(`YOU DEFEATED ${state.tlfsDefeatedEnemies} ENEMIES`, cx, cy + 10);
    }
    
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(`CLICK ANYWHERE TO RESTART`, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      resetMatch();
      goToTitle(); // Optional: send them back to select screen after TLFS
    });
    
    ctx.restore();
    return;
  }

  // Special champion reveal animation for match winner (1v1 & FFA)
  if (matchWinner) {
    drawMatchWinnerReveal(matchWinner, state.matchEndTimer, mode);
  }

  if (mode === '1v1' || mode === 'FFA') {
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(`CLICK ANYWHERE TO RESTART`, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      if (mode === '1v1') {
        randomize1v1Fighters();
      }
      resetMatch();
    });
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// MATCH WINNER CHAMPION REVEAL ANIMATION
// ─────────────────────────────────────────────

function drawMatchWinnerReveal(winner, timer, mode) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;

  // Scale animation
  const scale = 1.5;

  // ── Expanding & pulsing rings ──────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    const radius = 80 + i * 22;
    const alpha = 0.22 - i * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // ── Particle burst effect ───────────────────────────────────────────────
  const particleCount = 24;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const dist = 90 + i * 4;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = 2;
    const alpha = Math.max(0, 0.7 - (dist - 90) / 200);

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,220,80,${alpha})`;
    ctx.fill();
  }

  // ── Secondary sparkle particles ─────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 60;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const alpha = 0.5;

    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // ── Draw the winner fighter model ───────────────────────────────────────
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const preview = new FighterClass({
    ...def,
    startX: 0,
    startY: 0,
    startVx: 0,
    startVy: 0,
  });
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = 0;
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Glow effect
  ctx.shadowBlur = 40;
  ctx.shadowColor = winner.color;

  // Extra white glow ring behind the model
  ctx.beginPath();
  ctx.arc(0, 0, winner.r + 8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,0.08)`;
  ctx.fill();

  preview.draw(ctx, null);
  ctx.restore();

  // ── "CHAMPION" title text ───────────────────────────────────────────────
  const titleAlpha = Math.min(1, timer / 30);
  ctx.save();
  ctx.globalAlpha = titleAlpha;

  // Text glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = winner.color;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CHAMPION', cx, cy - 130);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = winner.color;
  ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);

  ctx.restore();

  // ── Score display below champion ───────────────────────────────────────
  ctx.fillStyle = '#aaa';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';

  if (mode === 'FFA') {
    const startY = cy + 150;
    const ffaResults = state.fighters
      .map((f, i) => {
        if (!f) return null;
        return { name: f.name, score: state.scores[i] || 0, color: f.color };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    ffaResults.forEach((result, idx) => {
      ctx.fillStyle = result.color;
      ctx.fillText(`${result.name}: ${result.score} WINS`, cx, startY + idx * 24);
    });
  } else {
    ctx.fillText(`${state.scores[0]} — ${state.scores[1]}`, cx, cy + 150);
  }
}

// ─────────────────────────────────────────────
// COUNTDOWN SCREEN
// ─────────────────────────────────────────────

export function drawCountdown() {
  drawHUD();
  const { ctx, canvas, countdownTimer, countdownDuration } = state;

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  // Calculate remaining time (in seconds)
  const remainingFrames = countdownDuration - countdownTimer;
  const remainingSeconds = Math.ceil(remainingFrames / 60);

  // Determine what to display
  let displayText = '';
  if (remainingSeconds > 1) {
    displayText = remainingSeconds.toString();
  } else if (remainingSeconds === 1) {
    displayText = '1';
  } else {
    displayText = 'GO!';
  }

  // Draw countdown number - smaller and subtle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, cx, cy);
}
