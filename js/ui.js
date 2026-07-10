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

import { CONFIG, FIGHTER_DEFS } from './config.js';
import { GAME_MODES, MODE_ROUNDS, MODE_SETTINGS } from './modeConfig.js';
import { Fighter } from './fighter.js';
import { FIGHTER_CLASS_MAP } from './customFighters.js';
import { state, getLeaderboardData } from './state.js';
import { previewProjectileSystem, updateIndexDetailDemo } from './preview.js';
import { startGame, goToTitle, startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters } from './gameFlow.js';
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
} from './weaponVisuals.js';




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

  if (mx >= listX && mx <= listX + listW && my >= listY && my <= listY + listH) {
    const itemH = 38;
    const itemGap = 10;
    const totalHeight = FIGHTER_DEFS.length * (itemH + itemGap);
    const maxScroll = Math.max(0, totalHeight - listH);
    modalScrollOffset = Math.min(Math.max(0, modalScrollOffset + e.deltaY * 0.75), maxScroll);
    e.preventDefault();
  }
}, { passive: false });

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

  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const previewFighter = new FighterClass({
    ...def,
    startX: previewX,
    startY: previewY,
    startVx: 0,
    startVy: 0,
  });
  previewFighter.angle = performance.now() / 180;
  try {
    if (typeof previewFighter.aim === 'function') {
      previewFighter.aim({ x: previewX + 56, y: previewY + 12 });
    }
    previewFighter.draw(ctx);
  } catch (e) {
    console.error('Preview draw error:', e);
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

  FIGHTER_DEFS.forEach((def, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

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
  const previewY = detailY + 36;

  // Fighter body glow and circle
  ctx.shadowColor = selectedDef.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = selectedDef.color;
  ctx.beginPath();
  ctx.arc(previewX, previewY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Add a slight inner gradient/highlight for the body
  const bodyGrad = ctx.createRadialGradient(previewX - 4, previewY - 4, 2, previewX, previewY, 16);
  bodyGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
  bodyGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Draw weapon preview
  ctx.save();
  ctx.translate(previewX, previewY);
  ctx.scale(1.1, 1.1); // Slightly scale up the weapon
  drawWeaponPreview(ctx, selectedDef.type, selectedDef.color);
  ctx.restore();

  // Fighter Name
  ctx.fillStyle = selectedDef.color;
  ctx.font = 'bold 17px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 70);

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
    for (let i = 0; i < 8; i++) {
      state.previewBalls.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        r: 15 + Math.random() * 20,
        color: Math.random() > 0.5 ? 'rgba(255, 77, 77, 0.2)' : 'rgba(77, 163, 255, 0.2)',
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Animated gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  const time = Date.now() * 0.0005;
  gradient.addColorStop(0, `hsl(${Math.sin(time) * 30 + 240}, 70%, 10%)`);
  gradient.addColorStop(0.5, `hsl(${Math.sin(time * 0.7) * 20 + 260}, 60%, 15%)`);
  gradient.addColorStop(1, `hsl(${Math.sin(time * 0.9) * 40 + 250}, 80%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Animated background particles
  updatePreviewBalls();

  // Primary buttons with enhanced styling
  const pulse = 1 + Math.sin(Date.now() / 150) * 0.04;
  ctx.save();
  ctx.translate(canvas.width / 2, 180);
  ctx.scale(pulse, pulse);
  drawButton('⚔ BATTLE', 0, -22, () => { state.gameState = 'select'; }, 200, 52);
  ctx.restore();

  drawButton('📖 FIGHTER INDEX', canvas.width / 2, 250, () => { state.gameState = 'index'; }, 240, 48);

  drawButton('⚔ WEAPONS', canvas.width / 2, 310, () => { state.gameState = 'weapons'; }, 240, 48);

  drawButton('🏆 LEADERBOARD', canvas.width / 2, 435, () => { state.gameState = 'leaderboard'; }, 240, 48);

  // Footer with subtle animation
  const footerPulse = 1 + Math.sin(Date.now() * 0.002) * 0.02;
  ctx.save();
  ctx.translate(canvas.width / 2, 350);
  ctx.scale(footerPulse, footerPulse);
  ctx.fillStyle = 'rgba(200, 210, 255, 0.7)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Press SPACE/ENTER, Click BATTLE, or use FIGHTER INDEX to inspect fighters', 0, 0);
  ctx.restore();
}

// ─────────────────────────────────────────────
// LEADERBOARD SCREEN
// ─────────────────────────────────────────────

let leaderboardSortBy = 'wins'; // 'wins' | 'losses' | 'winRate'

export function drawLeaderboardScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
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

      ctx.fillText(entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2);
      ctx.fillText(entry.losses, colX[3] + colWidths[3] / 2, rowY + rowH / 2);
      ctx.fillText(entry.totalGames, colX[4] + colWidths[4] / 2, rowY + rowH / 2);

      // Win rate with color coding
      const winRateColor = entry.winRate >= 70 ? '#4ade80' : entry.winRate >= 50 ? '#fbbf24' : '#f87171';
      ctx.fillStyle = winRateColor;
      ctx.fillText(`${entry.winRate.toFixed(1)}%`, colX[5] + colWidths[5] / 2, rowY + rowH / 2);
    });
  }

  // Back button
  const footerY = canvas.height - 60;
  drawButton('⌂ BACK', canvas.width / 2, footerY, () => { state.gameState = 'title'; }, 160, 44);

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
        import('./state.js').then(m => m.saveLeaderboard());
      }
    }
  };
}

let indexScroll_local = 0; // kept local for scroll state (also mirrored in state.indexScroll)
let indexInspectIndex_local = 0;

export function drawIndexScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
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

  const cardX = 30;
  const cardW = canvas.width - 60;
  const cardH = 120;
  const cardSpacing = 22;

  FIGHTER_DEFS.forEach((def, idx) => {
    const cardY = 90 + idx * (cardH + cardSpacing) - state.indexScroll;
    if (cardY > canvas.height || cardY + cardH < 0) {
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
      state.indexInspectIndex = idx;
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
  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('⚔ WEAPON MENU', canvas.width / 2, 42);

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Browse all fighter weapons and their stats', canvas.width / 2, 70);

  const cardX = 30;
  const cardW = canvas.width - 60;
  const cardH = 140;
  const cardSpacing = 18;

  FIGHTER_DEFS.forEach((def, idx) => {
    const cardY = 90 + idx * (cardH + cardSpacing) - state.weaponScroll;
    if (cardY > canvas.height || cardY + cardH < 0) {
      return;
    }

    drawPanel(cardX, cardY, cardW, cardH, 0.85);

    // Fighter name and color indicator
    ctx.fillStyle = def.color;
    ctx.fillRect(cardX + 10, cardY + 10, 6, cardH - 20);

    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 26, cardY + 12);

    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText(def.type.toUpperCase(), cardX + 26, cardY + 32);

    // Weapon stats
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(def.ability, cardX + 26, cardY + 52);

    // Stats row
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    const statsText = `DMG ${def.damage}   CD ${(def.cooldown / 60).toFixed(1)}s   PROJ SPD ${def.projectileSpeedMultiplier ? def.projectileSpeedMultiplier.toFixed(1) : '1.0'}x`;
    ctx.fillText(statsText, cardX + 26, cardY + 74);

    // Description
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 26, cardY + 96, cardW - 40, 16);

    // Weapon visual preview area
    const previewAreaX = cardX + cardW - 100;
    const previewAreaY = cardY + 15;
    const previewAreaW = 80;
    const previewAreaH = cardH - 30;

    drawPanel(previewAreaX, previewAreaY, previewAreaW, previewAreaH, 0.6);

    // Draw weapon preview based on fighter type
    ctx.save();
    ctx.translate(previewAreaX + previewAreaW / 2, previewAreaY + previewAreaH / 2);
    ctx.scale(0.5, 0.5);

    // Draw a simple weapon representation based on type
    drawWeaponPreview(ctx, def.type, def.color);

    ctx.restore();

    // Click hint
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Click for details →', cardX + cardW - 10, cardY + cardH - 10);
    ctx.textAlign = 'left';

    // Make card clickable
    drawButton('', cardX + cardW / 2, cardY + cardH / 2, () => {
      state.selectedWeapon = def;
      state.gameState = 'weaponDetail';
    }, cardW, cardH, true);
  });

  drawButton('⌂ BACK', 75, 335, () => { goToTitle(); }, 100, 35);
}

// ─────────────────────────────────────────────
// WEAPON DETAIL SCREEN
// ─────────────────────────────────────────────

export function drawWeaponDetailScreen() {
  const { ctx, canvas } = state;
  const def = state.selectedWeapon;
  if (!def) {
    state.gameState = 'weapons';
    return;
  }

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Main panel
  const panelX = 40;
  const panelY = 40;
  const panelW = canvas.width - 80;
  const panelH = canvas.height - 80;

  drawPanel(panelX, panelY, panelW, panelH, 0.9);

  // Color accent bar
  ctx.fillStyle = def.color;
  ctx.fillRect(panelX, panelY, 8, panelH);

  // Fighter name
  ctx.fillStyle = def.color;
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name.toUpperCase(), canvas.width / 2, panelY + 30);

  // Type badge
  ctx.fillStyle = '#333';
  ctx.fillRect(canvas.width / 2 - 60, panelY + 70, 120, 28);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(def.type.toUpperCase(), canvas.width / 2, panelY + 78);

  // Large weapon preview
  const previewCenterX = canvas.width / 2;
  const previewCenterY = panelY + 180;
  const previewSize = 120;

  // Preview background circle
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.arc(previewCenterX, previewCenterY, previewSize + 20, 0, Math.PI * 2);
  ctx.fill();

  // Draw animated weapon preview
  ctx.save();
  ctx.translate(previewCenterX, previewCenterY);
  ctx.scale(1.5, 1.5);
  drawWeaponPreview(ctx, def.type, def.color);
  ctx.restore();

  // Ability name
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(def.ability, canvas.width / 2, panelY + 320);

  // Stats section
  const statsY = panelY + 360;
  const statBoxW = 150;
  const statBoxH = 80;
  const statSpacing = 20;
  const totalWidth = statBoxW * 3 + statSpacing * 2;
  const startX = (canvas.width - totalWidth) / 2;

  // Damage stat
  drawPanel(startX, statsY, statBoxW, statBoxH, 0.7);
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(def.damage, startX + statBoxW / 2, statsY + 35);
  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('DAMAGE', startX + statBoxW / 2, statsY + 55);

  // Cooldown stat
  drawPanel(startX + statBoxW + statSpacing, statsY, statBoxW, statBoxH, 0.7);
  ctx.fillStyle = '#4ecdc4';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText((def.cooldown / 60).toFixed(1) + 's', startX + statBoxW + statSpacing + statBoxW / 2, statsY + 35);
  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('COOLDOWN', startX + statBoxW + statSpacing + statBoxW / 2, statsY + 55);

  // Projectile speed stat
  drawPanel(startX + (statBoxW + statSpacing) * 2, statsY, statBoxW, statBoxH, 0.7);
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText((def.projectileSpeedMultiplier ? def.projectileSpeedMultiplier.toFixed(1) : '1.0') + 'x', startX + (statBoxW + statSpacing) * 2 + statBoxW / 2, statsY + 35);
  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('PROJ SPEED', startX + (statBoxW + statSpacing) * 2 + statBoxW / 2, statsY + 55);

  // Description
  const descY = statsY + statBoxH + 30;
  ctx.fillStyle = '#ccc';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  wrapText(ctx, def.desc, canvas.width / 2, descY, panelW - 60, 20);

  // HP info
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`HP: ${def.hp}`, canvas.width / 2, descY + 60);

  // Navigation buttons
  const btnY = panelY + panelH - 50;
  drawButton('← BACK TO LIST', 150, btnY, () => {
    state.gameState = 'weapons';
  }, 200, 40);

  // Previous/Next navigation
  const currentIdx = FIGHTER_DEFS.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width / 2 - 120, btnY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx - 1];
    }, 140, 40);
  }
  if (currentIdx < FIGHTER_DEFS.length - 1) {
    drawButton('NEXT ►', canvas.width / 2 + 120, btnY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx + 1];
    }, 140, 40);
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
        drawCronosCrescentBlade(ctx, 0, 0, gunAngle, r, false, 0, 0, 10);
        return;

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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  const margin = 34;
  const cardGap = 14;
  const cardW = Math.min(250, Math.max(220, (canvas.width - margin * 2 - cardGap) / 2));
  const cardH = 200;
  const leftX = margin;
  const rightX = canvas.width - margin - cardW;
  const topY = modeButtonY + 70;
  const bottomY = topY + cardH + cardGap;

  if (mode === '2v2') {
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RED SIDE', leftX + cardW / 2, topY - 24);
    ctx.fillStyle = '#4da3ff';
    ctx.fillText('BLUE SIDE', rightX + cardW / 2, topY - 24);
  }

  drawPlayerCard('p1Index', mode === '2v2' ? 'RED 1' : 'PLAYER 1', leftX, topY, cardW, cardH, '#ff4d4d', true);
  drawPlayerCard('p2Index', mode === '2v2' ? 'BLUE 1' : 'PLAYER 2', rightX, topY, cardW, cardH, '#4da3ff', true);
  const p3Enabled = mode === 'FFA' || mode === '2v2';
  const p4Enabled = mode === 'FFA' || mode === '2v2';
  drawPlayerCard('p3Index', mode === '2v2' ? 'RED 2' : 'PLAYER 3', leftX, bottomY, cardW, cardH, '#ff4d4d', p3Enabled);
  drawPlayerCard('p4Index', mode === '2v2' ? 'BLUE 2' : 'PLAYER 4', rightX, bottomY, cardW, cardH, '#4da3ff', p4Enabled);

  const footerY = Math.min(canvas.height - 54, bottomY + 54);
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
  const modes = [{ id: '1v1', label: '1v1' }, { id: '2v2', label: '2v2' }, { id: 'FFA', label: 'FFA' }];
  const buttonWidth = Math.min(120, Math.max(88, canvas.width * 0.16));
  const buttonHeight = 36;
  const gap = Math.min(20, Math.max(12, canvas.width * 0.03));
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

  FIGHTER_DEFS.forEach((def, idx) => {
    const btnY = btnYStart + idx * (btnH + btnSpacing);
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

  // Prepare name rendering
  ctx.fillStyle = fighter.color;
  ctx.font = 'bold 14px Arial';
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
  const { ctx, canvas, fighters, scores, roundNum, mode } = state;
  _clearButtons(); // We might not have buttons here, but good practice

  // Health HUD is rendered below the canvas in DOM.
  updateHealthHud();

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
  ctx.fillText('Ramball Fight Simulator', cx, bottomY);
}

// Helper function to adjust color brightness
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

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

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '' }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const safeBorder = borderColor ? `border-color:${borderColor};` : '';
    // Use fighter's color theme for background
    const bgStyle = fighterColor ? `background: linear-gradient(135deg, ${fighterColor}22 0%, rgba(16, 18, 22, 0.95) 60%);` : '';
    const cardClasses = ['health-card', extraClass].filter(Boolean).join(' ');
    const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
    const glowAlpha = shakeTimer > 0 ? (shakeTimer / 12) * 0.85 : 0;
    const shakeStyle = shakeTimer > 0 ? `transform: translateX(${shakeAmount}px); border-color: rgba(255, 96, 96, 0.9); box-shadow: 0 0 20px rgba(255, 80, 80, ${glowAlpha}), inset 0 0 0 1px rgba(255, 120, 120, ${Math.min(0.9, glowAlpha)});` : '';
    // Winner glow effect - green pulsing glow
    const winnerStyle = isWinner ? 'border-color: #22c55e; box-shadow: 0 0 25px rgba(34, 197, 94, 0.7), inset 0 0 0 2px rgba(34, 197, 94, 0.5);' : '';

    // Build win indicator bullets
    const winReq = Math.ceil(MODE_SETTINGS[GAME_MODES.ONE_VS_ONE].rounds / 2);
    const winBullets = Array.from({ length: winReq }, (_, i) => {
      const filled = i < wins;
      const bulletColor = filled ? (fighterColor || fillColor) : 'rgba(255, 255, 255, 0.2)';
      return `<span class="health-card__win-bullet" style="background:${bulletColor}; ${filled ? `box-shadow: 0 0 8px ${fighterColor || fillColor};` : ''}"></span>`;
    }).join('');

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

    return `
      <div class="${cardClasses}" style="${safeBorder}${bgStyle}${shakeStyle}${winnerStyle}">
        <div class="health-card__header">
          <div class="health-card__title">${title}</div>
          <div class="health-card__score">${scoreText}</div>
        </div>
        <div class="health-card__wins">${winBullets}</div>
        ${barsHTML}
        ${description ? `<div class="health-card__desc">${description}</div>` : ''}
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

      const cardHTML = buildCard({
        title: team.title,
        scoreText: `${teamScores[teamIndex] || 0} WINS`,
        fillColor: team.color,
        members: members,
        extraClass: team.key,
        shakeTimer,
        isWinner: state.roundWinner && team.indexes.some(idx => fighters[idx] === state.roundWinner),
      });
      if (teamIndex === 0) cardsLeft.push(cardHTML);
      else cardsRight.push(cardHTML);
    });
  } else {
    fighters.forEach((fighter, index) => {
      if (!fighter) return;
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

      const cardHTML = buildCard({
        title: fighterName,
        scoreText: '',
        fillColor: color,
        fillRatio: ratio,
        metaLabel: `DMG: ${Math.max(0, Number(fighter.damage) || 0)}`,
        metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
        extraClass: '',
        borderColor: color,
        wins: matchWins,
        fighterColor: color,
        shakeTimer,
        isWinner: fighter === state.roundWinner,
        description: fighterDef ? fighterDef.desc : '',
      });

      if (mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE) {
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
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(winnerText, cx, cy - 10);

  ctx.fillStyle = '#aaa';
  ctx.font = '16px Arial';
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    if (mode === 'FFA' && ffaMatchComplete) {
      ctx.fillText(`Match complete! Press SPACE or Click to reset`, cx, cy + 25);
    } else {
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
  const def = winner._def || FIGHTER_DEFS.find(d => d.name === winner.name);
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

  ctx.save();
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
  const def = winner._def || FIGHTER_DEFS.find(d => d.name === winner.name);
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
  ctx.fillText('CHAMPION', cx, cy - 116);

  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + winner.r * scale + 18);

  ctx.fillStyle = '#ccc';
  ctx.font = '14px Arial';
  ctx.fillText('Click to reset the FFA match', cx, cy + winner.r * scale + 44);
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

  // Special champion reveal animation for match winner (1v1 & FFA)
  if (matchWinner) {
    drawMatchWinnerReveal(matchWinner, state.matchEndTimer, mode);
  }

  if (mode === '1v1') {
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(``, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      randomize1v1Fighters();
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
  const def = winner._def || FIGHTER_DEFS.find(d => d.name === winner.name);
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
  ctx.fillText(winner.name.toUpperCase(), cx, cy + winner.r * scale + 22);

  ctx.restore();

  // ── Score display below champion ───────────────────────────────────────
  if (mode !== 'FFA') {
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.scores[0]} — ${state.scores[1]}`, cx, cy + winner.r * scale + 50);
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
