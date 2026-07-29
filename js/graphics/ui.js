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
import { previewProjectileSystem, updateIndexDetailDemo, resetIndexDetailState } from './preview.js';
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
  drawZeusWeapon,
  drawInvertedSpear,
  drawSplitSoulKatana,
  drawMahoragaSword,
  drawMahoraga3DWheel,
  drawMahoragaChestNecklace,
  drawMahoragaLeftPunch
} from './weaponVisuals.js';
import { renderTeamHpCard } from './ui/hudRenderer.js';
import { renderFpsDebugOverlay } from './ui/debugOverlay.js';
import { drawMusashiWeapons, drawMusashiSheaths } from './weapons/musashiWeaponGraphics.js';
import { drawRubyScythe } from './weapons/rubyWeaponGraphics.js';
import { playSound, unlockAudio } from '../systems/soundSystem.js';
import { getSkillSound } from '../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../soundEffects/skillEffectSounds.js';
import { drawHUD, clearHealthHud } from './hudManager.js';
export { renderTeamHpCard, renderFpsDebugOverlay, drawHUD, clearHealthHud };

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
  if (state.gameState === 'weaponDetail') {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    state.weaponPreviewScale = Math.min(4.8, Math.max(1.0, (state.weaponPreviewScale || 2.4) + delta));
    return;
  }

  if (state.gameState === 'weapons') {
    e.preventDefault();
    const totalPages = Math.ceil(FIGHTER_DEFS.length / 5);
    if (e.deltaY > 0 && state.weaponPage < totalPages - 1) {
      state.weaponPage++;
    } else if (e.deltaY < 0 && state.weaponPage > 0) {
      state.weaponPage--;
    }
    return;
  }

  if (state.gameState === 'index') {
    e.preventDefault();
    const filteredDefs = FIGHTER_DEFS.filter(def => 
      !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
    );
    const totalPages = Math.ceil(filteredDefs.length / 5);
    if (e.deltaY > 0 && state.indexPage < totalPages - 1) {
      state.indexPage++;
    } else if (e.deltaY < 0 && state.indexPage > 0) {
      state.indexPage--;
    }
    return;
  }

  if (selectingSlot === null) return;

  const rect = state.canvas.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Match modal dimensions from drawFighterSelectModal
  const modalW = Math.min(state.canvas.width - 20, 520);
  const modalH = Math.min(state.canvas.height - 20, 520);
  const mx = (state.canvas.width - modalW) / 2;
  const my = (state.canvas.height - modalH) / 2;

  const cols = 3;
  const gap = 10;
  const gridW = 210;
  const listX = mx + 24;
  const listY = my + 68;
  const gridVisibleH = modalH - 128 - 10; // grid clipping area height

  const cellW = Math.floor((gridW - (cols - 1) * gap) / cols);
  const cellH = cellW + 18;

  // Check if mouse is inside the grid or pagination area
  if (mouseX >= listX && mouseX <= listX + gridW && mouseY >= listY && mouseY <= listY + 440) {
    const totalFighters = FIGHTER_DEFS.filter(def => !(!state.dummyEnabled && def.type === 'dummy')).length;
    const totalPages = Math.max(1, Math.ceil(totalFighters / 18));
    if (e.deltaY > 0 && modalPage < totalPages - 1) {
      modalPage++;
    } else if (e.deltaY < 0 && modalPage > 0) {
      modalPage--;
    }
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
let modalPage = 0;



function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const modalW = Math.min(canvas.width - 20, 510);
  const modalH = Math.min(canvas.height - 40, 580);
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  // Dark glass backdrop overlay
  ctx.fillStyle = 'rgba(6, 8, 14, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const selectedDef = FIGHTER_DEFS[modalInspectIndex] || FIGHTER_DEFS[0];
  const accentColor = selectedDef.color || '#ff1493';

  // Draw main outer Glassmorphism container with neon glow
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 18;
  drawPanel(mx, my, modalW, modalH, 0.94, 16);
  ctx.restore();

  // Header Banner
  const pNumMatch = selectingSlot ? selectingSlot.match(/\d/) : null;
  const slotLabel = pNumMatch ? `PLAYER ${pNumMatch[0]}` : 'PLAYER';

  ctx.fillStyle = accentColor;
  ctx.font = '900 11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SELECT CHAMPION', mx + 20, my + 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`FIGHTER FOR ${slotLabel}`, mx + 20, my + 28);

  // Top header accent line
  ctx.fillStyle = accentColor;
  ctx.fillRect(mx + 20, my + 52, modalW - 40, 2);

  // ── Grid Configuration (Left Side: 6 Rows x 3 Columns = 18 per page) ──
  const cols = 3;
  const itemsPerPage = 18; // 6x3 grid
  const gap = 5;
  const gridW = 210;
  const listX = mx + 20;
  const listY = my + 62;

  const cellW = Math.floor((gridW - (cols - 1) * gap) / cols); // ~66px
  const cellH = 60; // 60px height per card

  // Filter out dummy when dummy disabled
  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));

  // Clamp current page
  if (modalPage >= totalPages) modalPage = totalPages - 1;
  if (modalPage < 0) modalPage = 0;

  // Extract fighters for the active page
  const currentPageFighters = modalAvailableFighters.slice(modalPage * itemsPerPage, (modalPage + 1) * itemsPerPage);

  // Draw 6x3 Grid Cards for active page
  currentPageFighters.forEach(({ def, idx }, pagePos) => {
    const col = pagePos % cols;
    const row = Math.floor(pagePos / cols);

    const itemX = listX + col * (cellW + gap);
    const itemY = listY + row * (cellH + gap);

    const isSelected = idx === modalInspectIndex;

    // Card background
    ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = isSelected ? def.color : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(itemX, itemY, cellW, cellH, 8);
    ctx.fill();
    ctx.stroke();

    if (isSelected) {
      ctx.save();
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Fighter Preview Avatar inside card
    const avatarX = itemX + cellW / 2;
    const avatarY = itemY + cellH / 2 - 7;
    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      const avatarSize = cellW - 14;
      ctx.drawImage(previewImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Card Name Tag
    ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.font = isSelected ? 'bold 9px Arial' : '9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    let shortName = def.name;
    if (shortName.length > 9) shortName = shortName.substring(0, 8) + '.';
    ctx.fillText(shortName.toUpperCase(), avatarX, itemY + cellH - 3);

    // Register button click for selecting fighter
    _registerButton(itemX, itemY, cellW, cellH, () => {
      if (modalInspectIndex !== idx) {
        modalInspectIndex = idx;
      }
    });
  });

  // ── Pagination Controls Bar ──
  const navY = listY + 6 * (cellH + gap) + 4;
  const navBtnW = 60;
  const navBtnH = 26;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = listX + navBtnW / 2;
  if (modalPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      modalPage--;
    }, navBtnW, navBtnH);
  } else {
    // Disabled/Dimmed PREV button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(listX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◄ PREV', prevBtnCenterX, navBtnCenterY);
  }

  // Page Badge Text in center (well-spaced between buttons)
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${modalPage + 1} / ${totalPages}`, listX + gridW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = listX + gridW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (modalPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      modalPage++;
    }, navBtnW, navBtnH);
  } else {
    // Disabled/Dimmed NEXT button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(nextBtnLeftX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT ►', nextBtnCenterX, navBtnCenterY);
  }

  // ── Right Side: Champion Showcase Stage ──
  const detailX = listX + gridW + 16;
  const detailW = modalW - (detailX - mx) - 20;
  const detailY = my + 62;
  const detailH = 422;

  drawPanel(detailX, detailY, detailW, detailH, 0.88, 14);

  // Live Stage Pulse Aura behind Preview Image
  const previewX = detailX + detailW / 2;
  const previewY = detailY + 54;
  const now = performance.now() * 0.003;
  const pulseR = 44 + Math.sin(now) * 4;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(previewX, previewY, pulseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw Champion Preview Image
  const previewImage = getFighterPreview(modalInspectIndex);
  if (previewImage) {
    const previewSize = 82;
    ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
  }

  // Champion Name
  ctx.fillStyle = accentColor;
  ctx.font = '900 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 108);

  // Class Badge Pill
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(previewX - 50, detailY + 120, 100, 18, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Arial';
  ctx.fillText(selectedDef.type.toUpperCase(), previewX, detailY + 129);

  // Stat Bars
  let textY = detailY + 148;
  const barW = detailW - 24;
  const barX = detailX + 12;

  drawStatBar(ctx, 'HP', selectedDef.hp, 150, barX, textY, barW, selectedDef.color);
  textY += 18;
  drawStatBar(ctx, 'DMG', selectedDef.damage, 60, barX, textY, barW, '#f9c846');
  textY += 18;
  drawStatBar(ctx, 'SPD', selectedDef.speed || 2, 4, barX, textY, barW, '#8ad4ff');
  textY += 24;

  // Ability Header
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`ABILITY: ${selectedDef.ability.toUpperCase()}`, barX, textY);
  textY += 16;

  // Ability Description
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '10px Arial';
  ctx.textBaseline = 'top';
  wrapText(ctx, selectedDef.desc, barX, textY, barW, 14);

  // Footer Action Buttons (Symmetrically Aligned Below Panels)
  const footerY = my + modalH - 32;
  const btnW = 130;
  const btnH = 34;

  drawButton('CANCEL', listX + gridW / 2, footerY, () => {
    selectingSlot = null;
  }, btnW, btnH);

  drawButton('LOCK IN', detailX + detailW / 2, footerY, () => {
    if (selectingSlot) {
      state[selectingSlot] = modalInspectIndex;
    }
    selectingSlot = null;
  }, btnW, btnH);
}

// ─────────────────────────────────────────────
// DRAWING HELPERS
// ─────────────────────────────────────────────

/** Draws a semi-transparent rounded rectangle panel with gradient and glow. */
export function drawPanel(x, y, w, h, alpha = 0.8, r = 8) {
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
        color: Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(160, 160, 175, 0.06)',
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

  // Black and white cinematic background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#060709');
  gradient.addColorStop(0.5, '#151820');
  gradient.addColorStop(1, '#08090c');
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
  ctx.fillStyle = 'rgba(220, 220, 230, 0.7)';
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
  gradient.addColorStop(0, '#060709');
  gradient.addColorStop(0.5, '#151820');
  gradient.addColorStop(1, '#08090c');
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
    const returnState = state.leaderboardReturnState || 'title';
    state.leaderboardReturnState = null;
    clearHealthHud();
    state.gameState = returnState;
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

  // Header Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('FIGHTER INDEX', canvas.width / 2, 42);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Browse champion abilities and stats, or click a card for detail', canvas.width / 2, 64);

  // Category Filter Pills
  const categories = ['All', 'Greek Mythology', 'Japanese', 'Sci-Fi & Modern', 'Fantasy & Magic'];
  
  const catXStart = 20;
  let currentCX = catXStart;
  let currentCY = 76;
  
  categories.forEach(cat => {
    ctx.font = 'bold 11px Arial';
    const textW = ctx.measureText(cat).width;
    const btnW = textW + 16;
    const btnH = 24;
    
    if (currentCX + btnW > canvas.width - 20) {
      currentCX = catXStart;
      currentCY += btnH + 6;
    }
    
    const isSelected = (state.indexCategory || 'All') === cat;
    
    ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.9)' : 'rgba(40, 45, 60, 0.85)';
    ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(currentCX, currentCY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isSelected ? '#000000' : 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat, currentCX + btnW / 2, currentCY + btnH / 2);
    
    _registerButton(currentCX, currentCY, btnW, btnH, () => {
       state.indexCategory = cat;
       state.indexPage = 0; // Reset page on category change
    });
    
    currentCX += btnW + 6;
  });

  const cardsStartY = currentCY + 34;
  const cardX = Math.max(20, (canvas.width - 500) / 2);
  const cardW = Math.min(canvas.width - 40, 500);
  const cardH = 118;
  const cardSpacing = 14;
  const itemsPerPage = 5;

  const filteredDefs = FIGHTER_DEFS.filter(def => 
    !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
  );

  const totalPages = Math.max(1, Math.ceil(filteredDefs.length / itemsPerPage));
  if (state.indexPage === undefined) state.indexPage = 0;
  if (state.indexPage >= totalPages) state.indexPage = totalPages - 1;
  if (state.indexPage < 0) state.indexPage = 0;

  const startIdx = state.indexPage * itemsPerPage;
  const pageItems = filteredDefs.slice(startIdx, startIdx + itemsPerPage);

  pageItems.forEach((def, pos) => {
    const originalIdx = FIGHTER_DEFS.findIndex(d => d.id === def.id);
    const cardY = cardsStartY + pos * (cardH + cardSpacing);

    // Glassmorphism Card Container
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    // Glowing Left Accent Line
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + 10, 4, cardH - 20, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Fighter Preview Avatar
    const avatarX = cardX + 48;
    const avatarY = cardY + cardH / 2;
    const avatarSize = 64;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, avatarSize / 2);
    pedGrad.addColorStop(0, `rgba(255, 255, 255, 0.15)`);
    pedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const previewImg = getFighterPreview(originalIdx);
    if (previewImg) {
      ctx.drawImage(previewImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text Content Layout
    ctx.fillStyle = def.color;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 96, cardY + 12);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`CLASS: ${def.type.toUpperCase()}  |  HP ${def.hp}  DMG ${def.damage}  CD ${(def.cooldown / 60).toFixed(1)}s`, cardX + 96, cardY + 34);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(def.ability, cardX + 96, cardY + 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 96, cardY + 68, cardW - 110, 15);

    // Register Card Click Action
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.indexInspectIndex = originalIdx;
      state.gameState = 'indexDetail';
    });
  });

  // ── Pagination Controls Bar ──
  const navY = cardsStartY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 80;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.indexPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.indexPage--;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◄ PREV', prevBtnCenterX, navBtnCenterY);
  }

  // Page Indicator Badge
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${state.indexPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.indexPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.indexPage++;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(nextBtnLeftX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT ►', nextBtnCenterX, navBtnCenterY);
  }

  // Back Button in footer
  drawButton('⌂ BACK', cardX + 50, canvas.height - 40, () => { goToTitle(); }, 100, 35);
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
  ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('WEAPON ARSENAL', canvas.width / 2, 45);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Inspect detailed weapon schematics', canvas.width / 2, 65);

  const cardX = Math.max(20, (canvas.width - 500) / 2);
  const cardW = Math.min(canvas.width - 40, 500);
  const cardH = 118;
  const cardSpacing = 14;
  const itemsPerPage = 5;

  const totalPages = Math.max(1, Math.ceil(FIGHTER_DEFS.length / itemsPerPage));
  if (state.weaponPage === undefined) state.weaponPage = 0;
  if (state.weaponPage >= totalPages) state.weaponPage = totalPages - 1;
  if (state.weaponPage < 0) state.weaponPage = 0;

  const startIdx = state.weaponPage * itemsPerPage;
  const pageItems = FIGHTER_DEFS.slice(startIdx, startIdx + itemsPerPage);

  const startY = 85;

  pageItems.forEach((def, pos) => {
    const idx = startIdx + pos;
    const cardY = startY + pos * (cardH + cardSpacing);

    // Glassmorphism Panel
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
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
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 22, cardY + 14);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(def.type.toUpperCase(), cardX + 22, cardY + 36);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(def.ability, cardX + 22, cardY + 52);

    // Shortened description snippet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 22, cardY + 70, cardW - 145, 15);

    // Weapon Preview Pedestal
    const previewSize = 84;
    const previewX = cardX + cardW - previewSize / 2 - 16;
    const previewY = cardY + cardH / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(previewX, previewY, 0, previewX, previewY, previewSize / 2);
    pedGrad.addColorStop(0, `rgba(255, 255, 255, 0.12)`);
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
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.selectedWeapon = def;
      state.gameState = 'weaponDetail';
    });
  });

  // ── Pagination Controls Bar ──
  const navY = startY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 80;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.weaponPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.weaponPage--;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◄ PREV', prevBtnCenterX, navBtnCenterY);
  }

  // Page Indicator Badge
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${state.weaponPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.weaponPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.weaponPage++;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(nextBtnLeftX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT ►', nextBtnCenterX, navBtnCenterY);
  }

  drawButton('⌂ BACK', cardX + 50, canvas.height - 40, () => { goToTitle(); }, 100, 35);
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

export function isFighterDemoAttacking(fighter) {
  if (!fighter) return false;
  return (
    (fighter.spearSwingTimer > 0) ||
    (fighter.katanaSlashTimer > 0) ||
    (fighter.punchAnimTimer > 0) ||
    (fighter.meleeSwingTimer > 0) ||
    (fighter.slashGlowTimer > 0) ||
    (fighter.isCleaving === true) ||
    (fighter.meleeCooldown > (fighter.meleeCooldownMax - 15))
  );
}

export function drawWeaponInfoCard(ctx, def) {
  const { canvas } = state;
  const panelH = Math.min(150, canvas.height * 0.28);
  const panelY = canvas.height - panelH - 15;
  const panelW = Math.min(canvas.width - 30, 640);
  const panelX = (canvas.width - panelW) / 2;

  // Glassmorphism Card Panel
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
  ctx.strokeStyle = def.color || '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  // Top Accent Line
  ctx.fillStyle = def.color || '#FFD700';
  ctx.shadowColor = def.color || '#FFD700';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 40, panelY, 80, 3, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Header: Name & Type
  ctx.fillStyle = def.color || '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name.toUpperCase(), panelX + 20, panelY + 16);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 11px Arial';
  ctx.fillText((def.category || 'FIGHTER').toUpperCase(), panelX + 20, panelY + 38);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`⚡ ABILITY: ${def.ability || 'Special Weapon'}`, panelX + 20, panelY + 55);

  // Description snippet
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '11px Arial';
  wrapText(ctx, def.desc || '', panelX + 20, panelY + 76, panelW - 240, 16);

  // Stat Bars Column (Right Side of Info Card)
  const statW = 180;
  const statX = panelX + panelW - statW - 20;
  let statY = panelY + 32;

  drawPremiumStatBar(ctx, statX, statY, statW, 'HEALTH', `${def.hp || 100} HP`, Math.min(1.0, (def.hp || 100) / 300), '#4da3ff');
  statY += 28;
  drawPremiumStatBar(ctx, statX, statY, statW, 'DAMAGE', `${def.damage || 10} DMG`, Math.min(1.0, (def.damage || 10) / 40), '#ff4d4d');
  statY += 28;
  drawPremiumStatBar(ctx, statX, statY, statW, 'MOVE SPEED', `${def.moveSpeed || 5} SPD`, Math.min(1.0, (def.moveSpeed || 5) / 10), '#55ff55');

  ctx.restore();
}

export function triggerWeaponDemoAttack(def) {
  if (!def) return;
  state.showWeaponModel = true;
  state.showSummonModel = false;

  if (!state.previewFighter || state.previewFighter.type !== def.type) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    state.previewFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
    state.previewFighter.hideHpText = true;
  }

  const fighter = state.previewFighter;
  fighter.x = 0;
  fighter.y = 0;
  fighter.angle = 0;
  fighter.gunAngle = 0;

  if (typeof fighter.triggerDemoAttack === 'function') {
    fighter.triggerDemoAttack();
  }
}

export function drawWeaponDetailScreen() {
  const { ctx, canvas } = state;
  const def = state.selectedWeapon;
  if (!def) {
    state.gameState = 'weapons';
    return;
  }

  const hasSummon = ['yuta', 'doppleganger', 'Engineer', 'black'].includes(def.type);

  if (!state.showSummonModel) {
    state.showWeaponModel = true;
    state.slashEditMode = false;
  }

  // Reset context to prevent leaks from previous frames
  ctx.resetTransform();
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
  const heroY = canvas.height * 0.30;
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

  // Animated Hero Weapon Display (With dynamic Zoom In / Out scale)
  const currentScale = state.weaponPreviewScale || 2.4;
  ctx.save();
  ctx.translate(canvas.width / 2, heroY);
  ctx.scale(currentScale, currentScale);
  // Bobbing animation
  ctx.translate(0, Math.sin(Date.now() / 400) * 8);
  
  if (state.showSummonModel) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const previewFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
    previewFighter.hideHpText = true;
    previewFighter.x = 0;
    previewFighter.y = 0;
    previewFighter.angle = 0;

    try {
      if (def.type === 'yuta' && previewFighter.rika) {
        // Only draw Rika and center her perfectly
        previewFighter.rika.active = true;
        previewFighter.rika.x = 0;
        previewFighter.rika.y = 0;
        previewFighter.cursedEnergyAlpha = 1.0;
        
        // Drive both arm timers independently so they alternate, not swing together
        if ((state.previewRightArmTimer || 0) > 0) {
          state.previewRightArmTimer--;
          // Fire left arm 30 frames after right arm starts
          if (state.previewRightArmTimer === 30 && (state.previewLeftArmTimer || 0) <= 0) {
            state.previewLeftArmTimer = 60;
          }
        }
        if ((state.previewLeftArmTimer || 0) > 0) {
          state.previewLeftArmTimer--;
        }
        previewFighter.rika.attackTimer  = state.previewRightArmTimer || 0;
        previewFighter.rika.leftArmTimer = state.previewLeftArmTimer  || 0;

        // Draw cursed energy aura if toggled on
        if (state.previewShowCursedEnergy) {
          previewFighter._drawRikaCursedEnergyAura(ctx);
        }

        previewFighter._drawRika(ctx, { x: 100, y: 0 });
      } else {
        // Fallback for others that might not have custom standalone draw
        previewFighter.draw(ctx, { x: 100, y: 0 });
      }
    } catch (e) {
      console.error('Preview summon draw error:', e);
    }
  } else if (state.showWeaponModel) {
    if (!state.previewFighter || state.previewFighter.type !== def.type) {
      const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
      state.previewFighter = new FighterClass({
        ...def,
        startX: 0,
        startY: 0,
        startVx: 0,
        startVy: 0,
      });
      state.previewFighter.hideHpText = true;
    }

    const previewFighter = state.previewFighter;
    previewFighter.x = 0;
    previewFighter.y = 0;

    // If Slash Editor is ON, freeze fighter in static mid-swing pose with 100% full slash arc
    if (state.slashEditMode) {
      previewFighter.spearSwingTimer = Math.floor((previewFighter.spearSwingMax || 55) * 0.55);
      previewFighter.katanaSlashTimer = 25;
      previewFighter.punchAnimTimer = 18;
      previewFighter.meleeSwingTimer = 10;
      previewFighter.meleeSwingActive = true;
      previewFighter.meleeCooldownMax = 50;
      previewFighter.meleeCooldown = 42;
      previewFighter.slashGlowTimer = 20;
    } else {
      // Tick demo attack animation timers normally
      if (previewFighter.spearSwingTimer > 0) previewFighter.spearSwingTimer--;
      if (previewFighter.katanaSlashTimer > 0) previewFighter.katanaSlashTimer--;
      if (previewFighter.punchAnimTimer > 0) previewFighter.punchAnimTimer--;
      if (previewFighter.recoilTimer > 0) previewFighter.recoilTimer--;
      if (previewFighter.slashGlowTimer > 0) previewFighter.slashGlowTimer--;
      if (previewFighter.meleeCooldown > 0) previewFighter.meleeCooldown--;
      if (previewFighter.wheelGlowTimer > 0) previewFighter.wheelGlowTimer--;

      if (previewFighter.wheelClickTimer > 0) {
        previewFighter.wheelClickTimer--;
        previewFighter.wheelRotation += (previewFighter.wheelTargetRotation - previewFighter.wheelRotation) * 0.25;
      } else if (previewFighter.wheelTargetRotation !== undefined) {
        previewFighter.wheelRotation = previewFighter.wheelTargetRotation;
      }

      if (previewFighter.isCleaving) {
        previewFighter.cleaveWindupTimer++;
        const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;
        if (previewFighter.cleaveWindupTimer >= maxWindup) {
          previewFighter.isCleaving = false;
          previewFighter.cleaveWindupTimer = 0;
          playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
          playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.6);
        }
      }

      if (previewFighter.meleeSwingTimer > 0) {
        previewFighter.meleeSwingTimer--;
        if (previewFighter.meleeSwingTimer <= 0) {
          previewFighter.meleeSwingActive = false;
        }
      }

      if (previewFighter.trailGenTimer > 0) {
        previewFighter.trailGenTimer--;
        if (typeof previewFighter._getKatanaTipPositions === 'function') {
          const pos = previewFighter._getKatanaTipPositions();
          if (!previewFighter.swordTrail) previewFighter.swordTrail = [];
          previewFighter.swordTrail.unshift({ outer: pos.outer, inner: pos.inner, life: 1.0 });
          if (previewFighter.swordTrail.length > 20) previewFighter.swordTrail.pop();
        }
      }
      if (previewFighter.swordTrail && previewFighter.swordTrail.length > 0) {
        for (let i = previewFighter.swordTrail.length - 1; i >= 0; i--) {
          previewFighter.swordTrail[i].life -= 0.04;
          if (previewFighter.swordTrail[i].life <= 0) {
            previewFighter.swordTrail.splice(i, 1);
          }
        }
      }
    }

    // Auto Loop demo attack if slash studio auto-loop is ON
    if (state.slashEditMode && state.slashAutoLoop) {
      if (!isFighterDemoAttacking(previewFighter)) {
        triggerWeaponDemoAttack(def);
      }
    }

    try {
      const fakeTarget = { x: 80, y: 0, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
      previewFighter.draw(ctx, fakeTarget);
    } catch (e) {
      console.error('Preview draw error:', e);
    }
  } else {
    drawWeaponPreview(ctx, def.type, def.color);
  }
  ctx.restore();

  // Vertical Interactive Zoom Controls on right side of Hero display
  const zoomX = canvas.width - 26;
  const zoomY = heroY - 45;

  drawButton('🔍+', zoomX, zoomY, () => {
    state.weaponPreviewScale = Math.min(4.8, (state.weaponPreviewScale || 2.4) + 0.4);
  }, 32, 24);

  const zoomPct = Math.round(((state.weaponPreviewScale || 2.4) / 2.4) * 100);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${zoomPct}%`, zoomX, zoomY + 22);

  drawButton('1:1', zoomX, zoomY + 38, () => {
    state.weaponPreviewScale = 2.4;
  }, 32, 20);

  drawButton('🔍-', zoomX, zoomY + 60, () => {
    state.weaponPreviewScale = Math.max(1.0, (state.weaponPreviewScale || 2.4) - 0.4);
  }, 32, 24);

  // Interactive Pagination for Multi-Weapon Fighters (Toji)
  if (def.type === 'toji') {
    state.tojiWeaponIndex = state.tojiWeaponIndex || 0;
    const currentWeaponLabel = (state.tojiWeaponIndex === 0) 
      ? '1/2: INVERTED SPEAR OF HEAVEN' 
      : '2/2: SPLIT SOUL KATANA';

    const pagY = canvas.height * 0.42;

    // Pagination Dots & Label
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    // Left Arrow Button
    drawButton('◄', canvas.width / 2 - 140, pagY - 7, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 35, 26);

    // Right Arrow Button
    drawButton('►', canvas.width / 2 + 140, pagY - 7, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 35, 26);
  }

  // Fighter & Weapon Info Card HUD
  drawWeaponInfoCard(ctx, def);

  // Navigation Bar (Row 1 at Y = 25: Left = Arsenal, Right = Prev/Next)
  const navY = 22; 
  drawButton('← ARSENAL', 60, navY, () => {
    state.gameState = 'weapons';
  }, 95, 28);

  const currentIdx = FIGHTER_DEFS.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width - 105, navY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx - 1];
    }, 65, 28);
  }
  if (currentIdx < FIGHTER_DEFS.length - 1) {
    drawButton('NEXT ►', canvas.width - 36, navY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx + 1];
    }, 65, 28);
  }

  // Action Bar (Row 2 at Y = 62: Dynamic Centered Buttons)
  const actionY = 58;
  const buttonsToDraw = [];

  const isAttacking = isFighterDemoAttacking(state.previewFighter);
  const demoBtnText = isAttacking ? '⚔ SWINGING...' : '⚔ DEMO ATTACK';
  buttonsToDraw.push({
    text: demoBtnText,
    width: 125,
    action: () => { 
      triggerWeaponDemoAttack(def); 
    }
  });

  if (hasSummon) {
    const summonLabel = (def.type === 'yuta') ? 'RIKA' : (def.type === 'Engineer' ? 'TURRET' : 'SUMMON');
    const summonToggleText = state.showSummonModel ? `👻 ${summonLabel}: ON` : `👻 ${summonLabel}: OFF`;
    buttonsToDraw.push({
      text: summonToggleText,
      width: 110,
      action: () => {
        state.showSummonModel = !state.showSummonModel;
        if (state.showSummonModel) {
          state.showWeaponModel = false;
          state.slashEditMode = false;
        }
      }
    });
  }

  // Calculate total width & centered starting X with spacing gap
  const totalBtnWidth = buttonsToDraw.reduce((acc, b) => acc + b.width, 0);
  const gap = 12;
  const totalRowW = totalBtnWidth + (buttonsToDraw.length - 1) * gap;
  let currentBtnX = (canvas.width - totalRowW) / 2;

  buttonsToDraw.forEach(btn => {
    drawButton(btn.text, currentBtnX + btn.width / 2, actionY, btn.action, btn.width, 32);
    currentBtnX += btn.width + gap;
  });

  // Minion Actions (Left side of screen)
  if (hasSummon && state.showSummonModel) {
    drawButton('💥 ATTACK ANIM', 90, 110, () => {
      state.previewRightArmTimer = 60;
      state.previewLeftArmTimer  = 0;
    }, 120, 28);

    const ceLabel = state.previewShowCursedEnergy ? '🔮 CURSE ENERGY: ON' : '🔮 CURSE ENERGY: OFF';
    drawButton(ceLabel, 90, 145, () => {
      state.previewShowCursedEnergy = !state.previewShowCursedEnergy;
    }, 140, 28);
  }
}

export function drawYutaKatana(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Kashira (Gold Pommel)
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(-18, -3, 3, 6);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-18, -3, 3, 6);

  // 2. Tsuka (Black Hilt underwrap)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(-15, -2.5, 23, 5);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(-15, -2.5, 23, 5);

  // Menuki (Tiny gold ornaments inside the black tsuka gaps)
  ctx.fillStyle = '#DAA520';
  for (let dx = -13.25; dx <= 6; dx += 3.5) {
    ctx.fillRect(dx, -0.5, 1, 1);
  }

  // 3. Tsuka-ito (Red criss-cross wrap pattern)
  ctx.strokeStyle = '#D11A2A'; // Red wrap
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'butt';
  for (let dx = -15; dx <= 6; dx += 3.5) {
    ctx.beginPath();
    ctx.moveTo(dx, -2.5);
    ctx.lineTo(dx + 3.5, 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx + 3.5, -2.5);
    ctx.lineTo(dx, 2.5);
    ctx.stroke();
  }

  // Fuchi (Dark Golden Hilt Collar)
  ctx.fillStyle = '#8B6508';
  ctx.fillRect(8, -2.5, 2, 5);
  ctx.strokeRect(8, -2.5, 2, 5);

  // Left Seppa (Spacer washer)
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(10, -4, 0.8, 8);

  // 4. Tsuba (Golden Rounded Rectangular Guard)
  ctx.fillStyle = '#C5A059';
  ctx.beginPath();
  ctx.moveTo(10.8, -7);
  ctx.quadraticCurveTo(10.8, -8.5, 12.3, -8.5);
  ctx.lineTo(13.3, -8.5);
  ctx.quadraticCurveTo(14.8, -8.5, 14.8, -7);
  ctx.lineTo(14.8, 7);
  ctx.quadraticCurveTo(14.8, 8.5, 13.3, 8.5);
  ctx.lineTo(12.3, 8.5);
  ctx.quadraticCurveTo(10.8, 8.5, 10.8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Tsuba Details (two hitsu-ana holes / engravings in the guard)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(12.3, -4.5, 1, 1.2);
  ctx.fillRect(12.3, 3.3, 1, 1.2);

  // Right Seppa (Spacer washer)
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(14.8, -4, 0.8, 8);

  // 5. Habaki (Golden Blade Collar)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(15.6, -2, 3.4, 4);
  ctx.strokeRect(15.6, -2, 3.4, 4);

  // 6. Blade — Curved katana shape with authentic sori (gentle upward arc)
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.fillStyle = '#E5E8E8'; // Polished silver steel
  ctx.fill();

  // Second, overlay the dark spine (Shinogi-ji) ending at the Yokote line (tip division)
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.0, 75, -6.8);
  ctx.lineTo(75, -4.2);
  ctx.quadraticCurveTo(49, -0.8, 19, 0.2);
  ctx.closePath();
  ctx.fillStyle = '#2F3538'; // Dark spine steel
  ctx.fill();

  // Hamon line (temper line) — complex wavy boundary line
  ctx.beginPath();
  ctx.moveTo(19, 0.2);
  for (let x = 19; x <= 75; x += 3.5) {
    const waveY = 0.2 - 4.4 * ((x - 19) / 56) + Math.sin(x * 0.75) * 0.45;
    ctx.lineTo(x, waveY);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Metallic Mune Highlight — bright shine along the back spine of the blade
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Third, draw a clean black stroke outline over the entire outer blade boundary
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
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
  else if (type === 'toji') offsetX = -40; // Inverted Spear
  else if (type === 'yuta') offsetX = -40; // Katana
  
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

      case 'yuta':
        // Yuta's Lore-Accurate Cursed Katana
        drawYutaKatana(ctx, 0, 0, gunAngle);
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

      case 'yuta': {
        // Draw Yuta Katana + Rika Cursed Energy Aura in weapon preview
        ctx.save();
        ctx.translate(r, 0);
        ctx.rotate(0.2);

        // Katana blade
        ctx.fillStyle = '#E8E8E8';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(0, -2, 28, 4);
        ctx.fill();
        ctx.stroke();

        // Katana tsuba (guard) & hilt
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.fillStyle = '#111111';
        ctx.fillRect(-12, -2.5, 10, 5);

        // Cursed energy glow surrounding blade
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, -2, 28, 4);

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

      case 'toji': {
        // Detail screen uses manual pagination index; Grid cards auto-cycle every 2.5 seconds
        const isDetail = (state.gameState === 'weaponDetail');
        const activeIndex = isDetail 
          ? (state.tojiWeaponIndex || 0) 
          : (Math.floor(Date.now() / 2500) % 2);
        
        if (activeIndex === 0) {
          drawInvertedSpear(ctx, 0, 0, gunAngle, r);
        } else {
          drawSplitSoulKatana(ctx, 0, 0, gunAngle, r);
        }
        return;
      }

      case 'mahoraga':
        // Mahoraga's Sword of Extermination Wrist Blade
        drawMahoragaSword(ctx, 0, 0, gunAngle, r);
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

  const def = FIGHTER_DEFS[state.indexInspectIndex];
  if (!def) {
    state.gameState = 'index';
    return;
  }

  // 1. Cinematic Background & Signature Radial Aura
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#0f141e');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let r = 0, g = 150, b = 255;
  if (def.color && def.color.startsWith('#') && def.color.length === 7) {
    r = parseInt(def.color.slice(1, 3), 16);
    g = parseInt(def.color.slice(3, 5), 16);
    b = parseInt(def.color.slice(5, 7), 16);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.45, 0, canvas.width * 0.7, canvas.height * 0.45, 260);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.20)`);
  glow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.04)`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 2. Top Header Bar (Navigation & Title)
  const headerY = 22;
  drawButton('← INDEX', 65, headerY, () => { state.gameState = 'index'; }, 95, 28);

  ctx.fillStyle = def.color || '#FFD700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.toUpperCase(), canvas.width / 2, headerY);

  // Title Accent Line
  ctx.fillStyle = def.color || '#FFD700';
  ctx.shadowColor = def.color || '#FFD700';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 35, headerY + 12, 70, 2, 1);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Category Badge (Right side of header)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`[ ${(def.category || 'ANIME').toUpperCase()} / ${def.type.toUpperCase()} ]`, canvas.width - 25, headerY);

  // 3. Two-Column Layout Calculations
  const gap = 20;
  const maxContainerW = 760;
  const totalW = Math.min(canvas.width - 40, maxContainerW);
  const leftW = Math.floor(totalW * 0.44);
  const rightW = totalW - leftW - gap;

  const startX = (canvas.width - totalW) / 2;
  const startY = 62;
  const panelH = Math.min(canvas.height - startY - 15, 430);

  const leftX = startX;
  const rightX = startX + leftW + gap;

  // 4. LEFT PANEL: Fighter Stats & Profile Card
  drawPanel(leftX, startY, leftW, panelH, 0.88, 12);
  ctx.save();
  ctx.strokeStyle = def.color || '#FFD700';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(leftX, startY, leftW, panelH, 12);
  ctx.stroke();
  ctx.restore();

  let curY = startY + 18;

  // Explicitly reset canvas text alignment properties
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Name & Category Tag
  ctx.fillStyle = def.color || '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(def.name.toUpperCase(), leftX + 18, curY);
  curY += 24;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, leftX + 18, curY);
  curY += 18;

  // Ability Name
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(`⚡ ABILITY: ${def.ability || 'Standard'}`, leftX + 18, curY);
  curY += 32;

  // Stat Bars (Spacing 32px to account for label offset)
  const statBarW = leftW - 36;
  const fighterSpeed = def.moveSpeed || 5;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'HEALTH', `${def.hp} HP`, Math.min(1.0, def.hp / 300), '#4da3ff');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'DAMAGE', `${def.damage} DMG`, Math.min(1.0, def.damage / 40), '#ff4d4d');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'COOLDOWN', `${(def.cooldown / 60).toFixed(1)}s`, Math.max(0.1, 1 - (def.cooldown / 120)), '#ffd700');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'MOVE SPEED', `${fighterSpeed.toFixed(1)}`, Math.min(1.0, fighterSpeed / 10), '#55ff55');
  curY += 22;

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX + 18, curY);
  ctx.lineTo(leftX + leftW - 18, curY);
  ctx.stroke();
  curY += 14;

  // Description Section (Reset text align and baseline)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('DESCRIPTION:', leftX + 18, curY);
  curY += 16;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  wrapText(ctx, def.desc || '', leftX + 18, curY, leftW - 36, 15);

  // 5. RIGHT PANEL: Live Combat Demo Arena Window
  drawPanel(rightX, startY, rightW, panelH, 0.90, 12);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(rightX, startY, rightW, panelH, 12);
  ctx.stroke();
  ctx.restore();

  // Demo Arena Header Bar inside Panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(rightX + 2, startY + 2, rightW - 4, 28, { tl: 10, tr: 10, bl: 0, br: 0 });
  ctx.fill();

  // Live Pulse Dot & Label
  const dotPulse = Math.sin(Date.now() / 250) > 0;
  ctx.fillStyle = dotPulse ? '#00FF88' : '#009944';
  ctx.beginPath();
  ctx.arc(rightX + 16, startY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE COMBAT DEMO', rightX + 26, startY + 16);

  // Demo Subtext
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('AI Movement & Targeting', rightX + rightW - 14, startY + 16);

  // Define Demo Area coordinates inside panel
  const demoInnerY = startY + 34;
  const demoInnerH = panelH - 44;
  const demoArea = { x: rightX + 6, y: demoInnerY, width: rightW - 12, height: demoInnerH };

  // Clip combat rendering inside the demo window
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(demoArea.x, demoArea.y, demoArea.width, demoArea.height, 8);
  ctx.clip();

  // Draw grid background inside demo area
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let gx = demoArea.x; gx < demoArea.x + demoArea.width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, demoArea.y);
    ctx.lineTo(gx, demoArea.y + demoArea.height);
    ctx.stroke();
  }
  for (let gy = demoArea.y; gy < demoArea.y + demoArea.height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(demoArea.x, gy);
    ctx.lineTo(demoArea.x + demoArea.width, gy);
    ctx.stroke();
  }

  // Update & Render Fighter Demo State
  const demoState = updateIndexDetailDemo(def, demoArea);
  const fighter = demoState.fighter;
  const target = demoState.target;

  // Target Dummy Pulsing Ring (Hidden during special animation demonstrations)
  if (!demoState.hideTarget) {
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

    // Target Crosshair Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(target.x - target.r - 6, target.y);
    ctx.lineTo(target.x + target.r + 6, target.y);
    ctx.moveTo(target.x, target.y - target.r - 6);
    ctx.lineTo(target.x, target.y + target.r + 6);
    ctx.stroke();
  }

  // Projectiles (Custom & Signature Visuals for each character type)
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
    } else if (p.isGojoBlue) {
      // Gojo Blue Sphere with Glowing Aura
      ctx.save();
      ctx.translate(p.x, p.y);
      const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      auraGrad.addColorStop(0, 'rgba(0, 229, 255, 0.9)');
      auraGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.4)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isGhostBlade) {
      // Sukuna Dismantle Ghost Blade Slash Arc
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle || 0);
      ctx.strokeStyle = 'rgba(255, 70, 70, 0.95)';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (p.isShuriken) {
      // DarkSlateGray Spinning Shuriken
      p.spinAngle = (p.spinAngle || 0) + 0.25;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spinAngle);
      ctx.fillStyle = '#2f4f4f';
      ctx.strokeStyle = '#a0a0a0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 3, Math.sin(a + Math.PI / 4) * 3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (p.isSniper) {
      // Red Sniper Tracer Beam
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isFlame) {
      // Orange Flamethrower Burst
      ctx.save();
      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 4) * (1 + Math.sin(Date.now() / 50) * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isZeus) {
      // Zeus Lightning Bolt
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
      ctx.lineTo(p.x - p.vx * 0.6 + (Math.random() - 0.5) * 6, p.y - p.vy * 0.6 + (Math.random() - 0.5) * 6);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isAimbot) {
      // Aimbot Homing Bullet
      ctx.save();
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Default Styled Energy Bullet with Glow
      ctx.save();
      ctx.fillStyle = p.color || '#ffffff';
      ctx.shadowColor = p.color || '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Impacts
  const impacts = previewProjectileSystem.getImpacts();
  impacts.forEach((effect) => {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, effect.life / 14);
    ctx.stroke();
  });

  // Draw Demo Fighter
  fighter.draw(ctx, target);

  ctx.restore(); // Restore clip

  // 5. Playback Speed & Rotation Controls Bar (Cleanly integrated at bottom of right card)
  const currentSpeed = (state.indexDemoSpeed !== undefined) ? state.indexDemoSpeed : 1.0;
  const ctrlY1 = startY + panelH - 18;
  const btnCount = 5;
  const btnW = Math.floor((rightW - 32) / btnCount);
  const btnH = 22;
  const totalBtnsW = btnW * btnCount + (btnCount - 1) * 4;
  let btnX = rightX + (rightW - totalBtnsW) / 2 + btnW / 2;

  const controlButtons = [
    {
      label: currentSpeed === 0 ? '▶ PLAY' : '⏸ STOP',
      action: () => { state.indexDemoSpeed = currentSpeed === 0 ? 1.0 : 0; },
      active: currentSpeed === 0,
      glowColor: '#FF4444'
    },
    {
      label: '0.5x',
      action: () => { state.indexDemoSpeed = 0.5; },
      active: currentSpeed === 0.5,
      glowColor: '#00FF88'
    },
    {
      label: '1.0x',
      action: () => { state.indexDemoSpeed = 1.0; },
      active: currentSpeed === 1.0,
      glowColor: '#00FF88'
    },
    {
      label: '2.0x',
      action: () => { state.indexDemoSpeed = 2.0; },
      active: currentSpeed === 2.0,
      glowColor: '#00FF88'
    },
    {
      label: '🔄 ROTATE',
      action: () => {
        state.indexDemoRotation = ((state.indexDemoRotation || 0) + Math.PI / 2) % (Math.PI * 2);
      },
      active: !!state.indexDemoRotation,
      glowColor: '#FFD700'
    }
  ];

  controlButtons.forEach((btn) => {
    const isCurActive = btn.active;
    drawButton(btn.label, btnX, ctrlY1, btn.action, btnW, btnH);

    // Glowing highlight for active control option
    if (isCurActive) {
      ctx.save();
      const color = btn.glowColor || '#00FF88';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btnX - btnW / 2 - 1, ctrlY1 - btnH / 2 - 1, btnW + 2, btnH + 2, 5);
      ctx.stroke();
      ctx.restore();
    }

    btnX += btnW + 4;
  });

  // 6. Animation Demonstration Controls Panel (Simple & Clean)
  const bottomY = startY + panelH + 14;
  const bottomH = Math.max(72, canvas.height - bottomY - 16);

  drawPanel(startX, bottomY, totalW, bottomH, 0.88, 14);

  // Simple Clean Header
  ctx.fillStyle = def.color || '#FFD700';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('⚡ ANIMATION DEMO', startX + 16, bottomY + 12);

  // Dynamic Button List for Character Animations
  const animBtns = [
    { id: 'basic', label: '⚔️ Basic' }
  ];

  if (def.type === 'gojo') {
    animBtns.push(
      { id: 'mixing', label: '🔮 Mixing' },
      { id: 'red', label: '🔴 Red' },
      { id: 'domain', label: '🌌 Void' }
    );
  } else if (def.type === 'sukuna') {
    animBtns.push(
      { id: 'flurry', label: '⚔️ Flurry' },
      { id: 'fuga', label: '🔥 Fuga' },
      { id: 'domain', label: '🏯 Shrine' }
    );
  } else if (def.type === 'toji') {
    animBtns.push(
      { id: 'spear', label: '🗡️ Spear' },
      { id: 'stealth', label: '🥷 Stealth' }
    );
  } else if (def.type === 'todo') {
    animBtns.push(
      { id: 'rock', label: '🪨 Rock' },
      { id: 'clap', label: '👏 Clap' }
    );
  } else if (def.type === 'mahoraga') {
    animBtns.push(
      { id: 'level8', label: '⚡ Level 8' }
    );
  } else if (def.type === 'zeus') {
    animBtns.push(
      { id: 'lightning', label: '⚡ Lightning' }
    );
  } else {
    animBtns.push(
      { id: 'ability', label: `✨ ${(def.ability || 'Ability').slice(0, 10)}` }
    );
  }

  const activeAnim = state.indexDemoAnim || 'basic';
  const bWidth = 110;
  const bHeight = 28;
  let bX = startX + 16 + bWidth / 2;
  const bY = bottomY + 40;

  animBtns.forEach((btn) => {
    const isActive = activeAnim === btn.id;

    drawButton(btn.label, bX, bY, () => {
      unlockAudio();
      state.indexDemoAnim = btn.id;
      // Completely reset the demo state (fighter pos, target HP/pos, projectiles) when switching animations
      const demoInnerY = startY + 34;
      const demoInnerH = panelH - 44;
      const demoArea = { x: rightX + 6, y: demoInnerY, width: rightW - 12, height: demoInnerH };
      resetIndexDetailState(def, demoArea);

      // Play audio for the specific animation demo
      if (btn.id === 'mixing') playSound('Assets/Sound Effects/Skills/mixing.mp3', 3.0);
      else if (btn.id === 'red') playSound('Assets/Sound Effects/Skills/redcharging.mp3', 2.0);
      else if (btn.id === 'domain' && def.type === 'gojo') playSound('Assets/Sound Effects/Skills/gojodomain.mp3', 5.0);
      else if (btn.id === 'fuga') playSound('Assets/Sound Effects/Skills/fuga.mp3', 3.5);
      else if (btn.id === 'domain' && def.type === 'sukuna') playSound('Assets/Sound Effects/Skills/domainexpansion.mp3', 5.5);
      else if (btn.id === 'flurry') playSound('Assets/Sound Effects/Skills/spinslash.mp3', 2.0);
      else if (btn.id === 'spear') playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
      else if (btn.id === 'stealth') playSound('Assets/Sound Effects/Skills/dash5.mp3', 1.0);
      else if (btn.id === 'rock') playSound('Assets/Sound Effects/Skills/dash1.mp3', 1.0);
      else if (btn.id === 'clap') playSound('Assets/Sound Effects/Skills/todo-clap.mp3', 2.0);
      else if (btn.id === 'lightning') playSound('Assets/Sound Effects/Skills/thunderstrike.mp3', 1.5);
      else if (btn.id === 'level8') playSound('Assets/Sound Effects/Skills/dash5.mp3', 2.0);
    }, bWidth, bHeight);

    if (isActive) {
      ctx.save();
      const glowColor = btn.id === 'basic' ? '#00FF88' : '#FFD700';
      ctx.strokeStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bX - bWidth / 2 - 1, bY - bHeight / 2 - 1, bWidth + 2, bHeight + 2, 6);
      ctx.stroke();
      ctx.restore();
    }

    bX += bWidth + 12;
  });
}


let selectInspectedIndex = 0;
let previewFighterInstance = null;
let lastInspectedIndex = -1;

function drawPlayerCard(slotProp, title, x, y, w, h, borderColor, enabled, isLarge = false) {
  const { ctx, mode } = state;
  drawPanel(x, y, w, h, 0.86, 14);

  ctx.fillStyle = borderColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, 30, 8);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 17);

  const fighterIndex = state[slotProp];
  const def = FIGHTER_DEFS[fighterIndex];

  if (!enabled) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLOT UNAVAILABLE', x + w / 2, y + h / 2);
    return;
  }

  const previewImage = getFighterPreview(fighterIndex);

  if (isLarge) {
    const avatarX = x + w / 2;
    const avatarY = y + 78;
    const avatarSize = 82;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, avatarSize / 2);
    pedGrad.addColorStop(0, `${def.color}44`);
    pedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    ctx.fillStyle = def.color;
    ctx.font = '900 17px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.toUpperCase(), avatarX, y + 138);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, avatarX, y + 158);

    let textY = y + 178;
    const barW = Math.min(160, w - 40);
    const barX = x + (w - barW) / 2;

    drawStatBar(ctx, 'HP', def.hp, 150, barX, textY, barW, def.color);
    textY += 18;
    drawStatBar(ctx, 'DMG', def.damage, 60, barX, textY, barW, '#f9c846');
    textY += 18;
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, barX, textY, barW, '#8ad4ff');
    textY += 24;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`ABILITY: ${def.ability.toUpperCase()}`, avatarX, textY);
    textY += 16;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '10px Arial';
    wrapText(ctx, def.desc, avatarX, textY, w - 32, 14);

    const btnW = Math.min(150, w - 32);
    const btnH = 32;
    const btnX = x + (w - btnW) / 2;
    const btnY = y + h - btnH - 12;

    drawPanel(btnX, btnY, btnW, btnH, 0.92, 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SELECT FIGHTER', btnX + btnW / 2, btnY + btnH / 2);

    _registerButton(btnX, btnY, btnW, btnH, () => {
      selectingSlot = slotProp;
      modalInspectIndex = fighterIndex;
      const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
        .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
      const pos = modalAvailableFighters.findIndex(f => f.idx === fighterIndex);
      modalPage = pos !== -1 ? Math.floor(pos / 18) : 0;
    });

  } else {
    const previewX = x + w - 50;
    const previewY = y + 62;

    const teamColor = mode === '2v2'
      ? (slotProp === 'p1Index' || slotProp === 'p3Index' ? '#ff4d4d' : '#4da3ff')
      : null;
    if (teamColor) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.ellipse(previewX, previewY, 36, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (previewImage) {
      const previewSize = 70;
      ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
    }

    const detailX = x + 14;
    let textY = y + 42;

    ctx.fillStyle = def.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), detailX, textY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 9px Arial';
    textY += 18;
    ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, detailX, textY);
    textY += 16;

    const barW = Math.min(95, w - 125);
    drawStatBar(ctx, 'HP', def.hp, 150, detailX, textY, barW, def.color);
    textY += 15;
    drawStatBar(ctx, 'DMG', def.damage, 60, detailX, textY, barW, '#f9c846');
    textY += 15;
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, textY, barW, '#8ad4ff');
    textY += 14;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '9px Arial';
    const maxDescWidth = w - 120;
    wrapText(ctx, def.desc, detailX, textY, maxDescWidth, 12);

    const btnW = 95;
    const btnH = 26;
    const btnX = x + w - btnW - 10;
    const btnY = y + h - btnH - 8;

    drawPanel(btnX, btnY, btnW, btnH, 0.92, 8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SELECT', btnX + btnW / 2, btnY + btnH / 2);

    _registerButton(btnX, btnY, btnW, btnH, () => {
      selectingSlot = slotProp;
      modalInspectIndex = fighterIndex;
      const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
        .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
      const pos = modalAvailableFighters.findIndex(f => f.idx === fighterIndex);
      modalPage = pos !== -1 ? Math.floor(pos / 18) : 0;
    });
  }
}

function drawStatBar(ctx, label, value, maxValue, x, y, width, color) {
  ctx.fillStyle = '#888';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y);

  const barX = x + 28;
  const barW = width - 28;
  const barH = 7;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(barX, y + 2, barW, barH, 3);
  ctx.fill();

  const fillW = Math.min(barW, Math.max(4, (value / maxValue) * barW));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(barX, y + 2, fillW, barH, 3);
  ctx.fill();
}

export function drawSelectScreen() {
  const { ctx, canvas, mode } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sleek Black and White Cinematic Gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  const time = Date.now() * 0.0003;
  const pulse = Math.floor(Math.sin(time) * 6 + 18);
  gradient.addColorStop(0, '#060709');
  gradient.addColorStop(0.5, `rgb(${pulse}, ${pulse + 2}, ${pulse + 5})`);
  gradient.addColorStop(1, '#08090c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('CHOOSE YOUR FIGHTERS', canvas.width / 2, 42);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaa';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('GAME MODE', canvas.width / 2, 66);

  const modeButtonY = 92;
  drawModeSelection(canvas.width / 2, modeButtonY);

  const tmW = 140;
  const tmH = 26;
  const gap = 14;
  const tmX = canvas.width / 2 - tmW - gap / 2;
  const tmY = 124;

  ctx.fillStyle = state.testMode ? 'rgba(40, 180, 80, 0.3)' : 'rgba(100, 100, 100, 0.2)';
  ctx.strokeStyle = state.testMode ? '#4ade80' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(tmX, tmY, tmW, tmH, 13);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.testMode ? '#fff' : '#ccc';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧪 TEST MODE', tmX + tmW / 2 + (state.testMode ? -8 : 8), tmY + tmH / 2);

  ctx.beginPath();
  ctx.arc(state.testMode ? tmX + tmW - 12 : tmX + 12, tmY + tmH / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = state.testMode ? '#4ade80' : '#888';
  ctx.shadowColor = state.testMode ? '#4ade80' : 'transparent';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  _registerButton(tmX, tmY, tmW, tmH, () => { state.testMode = !state.testMode; });

  const daX = canvas.width / 2 + gap / 2;
  const daY = 124;

  ctx.fillStyle = state.dummyEnabled ? 'rgba(34, 120, 60, 0.3)' : 'rgba(100, 100, 100, 0.2)';
  ctx.strokeStyle = state.dummyEnabled ? '#4ade80' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(daX, daY, tmW, tmH, 13);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.dummyEnabled ? '#fff' : '#ccc';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎯 DUMMY', daX + tmW / 2 + (state.dummyEnabled ? -8 : 8), daY + tmH / 2);

  ctx.beginPath();
  ctx.arc(state.dummyEnabled ? daX + tmW - 12 : daX + 12, daY + tmH / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = state.dummyEnabled ? '#4ade80' : '#888';
  ctx.shadowColor = state.dummyEnabled ? '#4ade80' : 'transparent';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  _registerButton(daX, daY, tmW, tmH, () => {
    state.dummyEnabled = !state.dummyEnabled;
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

  const topY = 165;
  const margin = 20;

  if (mode === '1v1' || mode === 'Stand Off') {
    const cardGap = 20;
    const cardW = Math.min(235, (canvas.width - margin * 2 - cardGap) / 2);
    const cardH = 370;

    const leftX = canvas.width / 2 - cardW - cardGap / 2;
    const rightX = canvas.width / 2 + cardGap / 2;

    drawPlayerCard('p1Index', 'PLAYER 1', leftX, topY, cardW, cardH, '#ff4d4d', true, true);
    drawPlayerCard('p2Index', 'PLAYER 2', rightX, topY, cardW, cardH, '#4da3ff', true, true);

    const vsX = canvas.width / 2;
    const vsY = topY + cardH / 2;
    ctx.save();
    ctx.fillStyle = '#060810';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffd700';
    ctx.font = '900 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 1);
    ctx.restore();

    const footerY = topY + cardH + 36;
    const centerX = canvas.width / 2;
    const actionBtnW = 140;
    const actionSpacing = 16;

    drawButton('⚔ START BATTLE', centerX - actionBtnW / 2 - actionSpacing / 2, footerY, () => { startGame(); }, actionBtnW, 40);
    drawButton('🎲 RANDOMIZE', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { randomize1v1Fighters(); }, actionBtnW, 40);
    drawButton('⌂ BACK', centerX, footerY + 48, () => { goToTitle(); }, 120, 34);

  } else if (mode === '1v2 Stand Off') {
    const cardGap = 12;
    const cardW = Math.min(235, (canvas.width - margin * 2 - cardGap) / 2);
    const cardH = 175;

    const leftX = canvas.width / 2 - cardW - cardGap / 2;
    const rightX = canvas.width / 2 + cardGap / 2;
    const bottomY = topY + cardH + cardGap;

    // Left side: Solo fighter
    drawPlayerCard('p1Index', 'SOLO CHAMPION', leftX, topY, cardW, cardH * 2 + cardGap, '#ff4d4d', true, true);
    
    // Right side: Duo fighters
    drawPlayerCard('p2Index', 'DUO 1', rightX, topY, cardW, cardH, '#4da3ff', true);
    drawPlayerCard('p3Index', 'DUO 2', rightX, bottomY, cardW, cardH, '#4da3ff', true);

    const footerY = bottomY + cardH + 34;
    const centerX = canvas.width / 2;
    const actionBtnW = 140;
    const actionSpacing = 16;

    drawButton('⚔ START BATTLE', centerX - actionBtnW / 2 - actionSpacing / 2, footerY, () => { startGame(); }, actionBtnW, 40);
    // Since randomize doesn't exist for 1v2 in UI logic yet, we'll import and use it or just add it inline.
    import('../core/gameFlow.js').then(m => {
      drawButton('🎲 RANDOMIZE', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { m.randomize1v2Fighters(); }, actionBtnW, 40);
    });
    drawButton('⌂ BACK', centerX, footerY + 48, () => { goToTitle(); }, 120, 34);

  } else if (mode === '2v2' || mode === 'FFA') {
    const cardGap = 12;
    const cardW = Math.min(235, (canvas.width - margin * 2 - cardGap) / 2);
    const cardH = 175;

    const leftX = canvas.width / 2 - cardW - cardGap / 2;
    const rightX = canvas.width / 2 + cardGap / 2;
    const bottomY = topY + cardH + cardGap;

    drawPlayerCard('p1Index', mode === '2v2' ? 'RED 1' : 'PLAYER 1', leftX, topY, cardW, cardH, '#ff4d4d', true);
    drawPlayerCard('p2Index', mode === '2v2' ? 'BLUE 1' : 'PLAYER 2', rightX, topY, cardW, cardH, '#4da3ff', true);
    drawPlayerCard('p3Index', mode === '2v2' ? 'RED 2' : 'PLAYER 3', leftX, bottomY, cardW, cardH, '#ff4d4d', true);
    drawPlayerCard('p4Index', mode === '2v2' ? 'BLUE 2' : 'PLAYER 4', rightX, bottomY, cardW, cardH, '#4da3ff', true);

    const footerY = bottomY + cardH + 34;
    const centerX = canvas.width / 2;
    const actionBtnW = 140;
    const actionSpacing = 16;

    drawButton('⚔ START BATTLE', centerX - actionBtnW / 2 - actionSpacing / 2, footerY, () => { startGame(); }, actionBtnW, 40);
    drawButton('🎲 RANDOMIZE', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { randomizeFfaFighters(); }, actionBtnW, 40);
    drawButton('⌂ BACK', centerX, footerY + 48, () => { goToTitle(); }, 120, 34);

  } else if (mode === 'TLFS') {
    const cardGap = 16;
    const cardW = Math.min(235, (canvas.width - margin * 2 - cardGap) / 2);
    const cardH = 370;

    const leftX = canvas.width / 2 - cardW - cardGap / 2;
    const rightX = canvas.width / 2 + cardGap / 2;

    drawPlayerCard('p1Index', 'YOUR CHAMPION', leftX, topY, cardW, cardH, '#00f3ff', true, true);
    drawTlfsEnemyPoolGrid(rightX, topY, cardW, cardH);

    const footerY = topY + cardH + 36;
    const centerX = canvas.width / 2;
    const actionBtnW = 140;
    const actionSpacing = 16;

    drawButton('⚔ GAUNTLET', centerX - actionBtnW / 2 - actionSpacing / 2, footerY, () => { startGame(); }, actionBtnW, 40);
    drawButton('🎲 RANDOMIZE', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length); }, actionBtnW, 40);
    drawButton('⌂ BACK', centerX, footerY + 48, () => { goToTitle(); }, 120, 34);
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
  const modes = [
    { id: '1v1', label: '1v1' },
    { id: 'Stand Off', label: 'Stand Off' },
    { id: '1v2 Stand Off', label: '1v2 Stand Off' },
    { id: '2v2', label: '2v2' },
    { id: 'FFA', label: 'FFA' },
    { id: 'TLFS', label: 'TLFS' }
  ];
  const buttonWidth = Math.min(90, Math.max(65, canvas.width * 0.10));
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





export function drawPauseScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHUD(); // Keep HUD visible in background

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  const panelW = 260;
  const panelH = 280;
  drawPanel(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', cx, cy - 80);

  const btnW = 200;
  const btnH = 36;

  drawButton('▶ Resume', cx, cy - 30, () => {
    state.gameState = state.previousGameState || 'playing';
  }, btnW, btnH);

  drawButton('↺ Restart Round', cx, cy + 20, () => {
    restartCurrentRound();
  }, btnW, btnH);

  drawButton('🏆 Leaderboard', cx, cy + 70, () => {
    state.leaderboardReturnState = 'paused';
    state.gameState = 'leaderboard';
  }, btnW, btnH);

  drawButton('⌂ Main Menu', cx, cy + 120, () => {
    goToTitle();
  }, btnW, btnH);
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
  const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  const winThresholdForReveal = modeRounds === 1 ? 1 : 2;
  const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= winThresholdForReveal;
  const showModel = hasTwoWins && roundWinner;

  // Determine winner text
  let winnerText;
  if (mode === '2v2') {
    const winningTeam = state.teamScores[0] > state.teamScores[1] ? 0 : 1;
    winnerText = `TEAM ${winningTeam + 1} WINS ROUND ${roundNum}!`;
    ctx.fillStyle = winningTeam === 0 ? '#ff4d4d' : '#4da3ff';
  } else {
    if (roundWinner) {
      winnerText = `${roundWinner.name.toUpperCase()} WINS ROUND ${roundNum}!`;
      ctx.fillStyle = roundWinner.color;
    } else {
      winnerText = `ROUND ${roundNum} IS A DRAW!`;
      ctx.fillStyle = '#ffffff';
    }
  }
  const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || showModel;

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
  if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }

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
  if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }

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

  // Special champion reveal animation for match winner (1v1, 1v2 Stand Off, 2v2 & FFA)
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters[0] : null);
  if (effectiveWinner) {
    drawMatchWinnerReveal(effectiveWinner, state.matchEndTimer, mode);
  }

  if (mode === '1v1' || mode === 'Stand Off' || mode === '1v2 Stand Off' || mode === '2v2' || mode === 'FFA') {
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(`CLICK ANYWHERE TO RESTART`, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      if (mode === '1v2 Stand Off') {
        import('../core/gameFlow.js').then(m => m.randomize1v2Fighters());
      } else if (mode === '1v1' || mode === 'Stand Off') {
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

  // Detect winning team members for team modes (1v2 Stand Off or 2v2)
  const winnerIndex = state.fighters ? state.fighters.indexOf(winner) : -1;
  const winningTeam = winnerIndex >= 0 ? state.getFighterTeam(winnerIndex) : (state.teamScores[0] >= state.teamScores[1] ? 0 : 1);
  let winningFighters = winner ? [winner] : [];

  if (winningTeam !== null && (mode === '2v2' || mode === '1v2 Stand Off')) {
    const teamMembers = state.fighters.filter((f, idx) => f && state.getFighterTeam(idx) === winningTeam);
    if (teamMembers.length > 0) {
      winningFighters = teamMembers;
    }
  }

  // Scale animation
  const isMultiWinner = winningFighters.length > 1;
  const scale = isMultiWinner ? 1.1 : 1.5;
  const offsets = isMultiWinner ? [-95, 95] : [0];

  // ── Expanding & pulsing rings ──────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    const radius = (isMultiWinner ? 130 : 80) + i * 24;
    const alpha = 0.22 - i * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // ── Particle burst effect ───────────────────────────────────────────────
  const particleCount = isMultiWinner ? 36 : 24;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const dist = (isMultiWinner ? 135 : 90) + i * 4;
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
    const dist = isMultiWinner ? 100 : 60;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const alpha = 0.5;

    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // ── Draw the winner fighter model(s) ───────────────────────────────────────
  winningFighters.forEach((wFighter, idx) => {
    const offsetX = offsets[idx] || 0;
    const def = wFighter._def || FIGHTER_DEFS.find(d => d.id === wFighter._def?.id);
    if (!def) return;
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
    if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
      preview.combatAuraOpacity = 1;
    }

    ctx.save();
    ctx.translate(cx + offsetX, cy);
    ctx.scale(scale, scale);

    // Glow effect
    ctx.shadowBlur = 40;
    ctx.shadowColor = wFighter.color || '#fff';

    // Extra white glow ring behind the model
    ctx.beginPath();
    ctx.arc(0, 0, (wFighter.r || 20) + 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,0.08)`;
    ctx.fill();

    preview.draw(ctx, null);
    ctx.restore();
  });

  // ── "CHAMPION" title text ───────────────────────────────────────────────
  const titleAlpha = Math.min(1, timer / 30);
  ctx.save();
  ctx.globalAlpha = titleAlpha;

  // Text glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = winner.color || '#fff';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(isMultiWinner ? 'CHAMPIONS' : 'CHAMPION', cx, cy - 145);

  ctx.shadowBlur = 0;
  if (isMultiWinner && winningFighters.length === 2) {
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = winningFighters[0].color || '#fff';
    ctx.fillText(winningFighters[0].name.toUpperCase(), cx - 95, cy + 115);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('&', cx, cy + 114);

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = winningFighters[1].color || '#fff';
    ctx.fillText(winningFighters[1].name.toUpperCase(), cx + 95, cy + 115);
  } else {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = winner.color || '#fff';
    ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);
  }

  ctx.restore();
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

