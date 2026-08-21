import { randomize1v1Fighters, randomize1v2Fighters, goToTitle, startGame } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { drawModeSelection } from './MainMenuScreen.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js?v=6';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;
let _lastModalWheelTime = 0;
let _lastCardWheelTime = 0;
let _playerCardBounds = [];

function drawTlfsEnemyPoolGrid(x, y, w, h) {
  const { ctx } = state;
  drawPanel(x, y, w, h, 0.90, 8);

  // Header band
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 28, 5);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENEMY GAUNTLET POOL', x + w / 2, y + 16);

  const cols = 4;
  const padding = 12;
  const availableW = w - padding * 2;
  const gap = 6;
  const cellW = Math.floor((availableW - gap * (cols - 1)) / cols);
  const cellH = 56;
  
  const startX = x + padding;
  let startY = y + 38;
  
  const poolFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx })).filter(({ def }) => def.type !== 'dummy');
  
  poolFighters.forEach(({ def, idx }, listPos) => {
    const col = listPos % cols;
    const row = Math.floor(listPos / cols);
    const cellX = startX + col * (cellW + gap);
    const cellY = startY + row * (cellH + gap);
    
    const isSelected = state.tlfsAllowedEnemies.includes(idx);
    
    ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.16)' : 'rgba(14, 18, 26, 0.88)';
    ctx.strokeStyle = isSelected ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, cellX, cellY, cellW, cellH, 4);
    ctx.fill();
    ctx.stroke();
    
    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      const badgeSize = Math.min(cellW - 8, cellH - 16);
      ctx.drawImage(previewImg, cellX + cellW / 2 - badgeSize / 2, cellY + 6, badgeSize, badgeSize);
    } else {
      drawSmallFighterBadge(ctx, def, cellX + cellW / 2, cellY + 20, 24);
    }

    // Name tag
    ctx.fillStyle = isSelected ? '#ffffff' : '#64748b';
    ctx.font = 'bold 8.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    let nameStr = def.name;
    if (nameStr.length > 7) nameStr = nameStr.substring(0, 6) + '.';
    ctx.fillText(nameStr.toUpperCase(), cellX + cellW / 2, cellY + cellH - 3);
    
    if (!isSelected) {
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cellX + 4, cellY + 4);
      ctx.lineTo(cellX + cellW - 4, cellY + cellH - 4);
      ctx.moveTo(cellX + cellW - 4, cellY + 4);
      ctx.lineTo(cellX + 4, cellY + cellH - 4);
      ctx.stroke();
    }
    
    _registerButton(cellX, cellY, cellW, cellH, () => {
      if (isSelected) {
        if (state.tlfsAllowedEnemies.length <= 5) {
          spawnFloatingText(cellX + cellW / 2, cellY, 'MINIMUM 5 ENEMIES!', '#dc2626');
          return;
        }
        state.tlfsAllowedEnemies = state.tlfsAllowedEnemies.filter(i => i !== idx);
      } else {
        state.tlfsAllowedEnemies.push(idx);
      }
    });
  });

  // Footer Actions for TLFS Pool
  const poolBtnY = y + h - 44;
  const halfBtnW = (w - 32) / 2;
  
  drawButton('SELECT ALL', x + 16 + halfBtnW / 2, poolBtnY + 16, () => {
    state.tlfsAllowedEnemies = poolFighters.map(f => f.idx);
  }, halfBtnW - 4, 30, null, 4);

  drawButton('CLEAR ALL', x + w - 16 - halfBtnW / 2, poolBtnY + 16, () => {
    state.tlfsAllowedEnemies = poolFighters.slice(0, 5).map(f => f.idx);
  }, halfBtnW - 4, 30, null, 4);
}

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
    const scale = Math.min(1, (size / (origR * 2)));
    ctx.scale(scale, scale);
    badge.draw(ctx);
    ctx.restore();

    badge.r = origR;
  } catch (e) {
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

function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const modalW = Math.min(canvas.width - 20, 510);
  const modalH = Math.min(canvas.height - 40, 600);
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  // Dark glass backdrop overlay
  ctx.fillStyle = 'rgba(6, 8, 14, 0.90)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const selectedDef = FIGHTER_DEFS[modalInspectIndex] || FIGHTER_DEFS[0];

  // Draw main outer Tactical Chamfered Panel
  drawPanel(mx, my, modalW, modalH, 0.96, 12, 'rgba(255, 255, 255, 0.18)');

  // Header Banner
  const pNumMatch = selectingSlot ? selectingSlot.match(/\d/) : null;
  const slotLabel = pNumMatch ? `PLAYER ${pNumMatch[0]}` : 'PLAYER';

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TACTICAL ROSTER // PROTOCOL 01', mx + 20, my + 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText(`CHOOSE FIGHTER FOR ${slotLabel}`, mx + 20, my + 28);

  // Header accent line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(mx + 20, my + 52, modalW - 40, 1.5);

  // ── Paginated Grid Configuration (Left Side: 3 Columns x 5 Rows = 15 Items per Page) ──
  const cols = 3;
  const rows = 5;
  const itemsPerPage = cols * rows;
  const gap = 6;
  const gridW = 210;
  const listX = mx + 20;
  const listY = my + 62;

  const cellW = Math.floor((gridW - (cols - 1) * gap) / cols);
  const cellH = 68;

  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
  modalPage = Math.max(0, Math.min(totalPages - 1, modalPage));

  const startIdx = modalPage * itemsPerPage;
  const pageFighters = modalAvailableFighters.slice(startIdx, startIdx + itemsPerPage);

  // ── Render Current Page Roster Grid ──
  pageFighters.forEach(({ def, idx }, localPos) => {
    const col = localPos % cols;
    const row = Math.floor(localPos / cols);

    const itemX = listX + col * (cellW + gap);
    const itemY = listY + row * (cellH + gap);

    const isSelected = idx === modalInspectIndex;

    ctx.save();
    if (isSelected) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
    }

    drawChamferedRect(ctx, itemX, itemY, cellW, cellH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Fighter Preview Avatar inside card
    const avatarX = itemX + cellW / 2;
    const avatarY = itemY + cellH / 2 - 7;
    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      const avatarSize = cellW - 14;
      ctx.drawImage(previewImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = def.color || '#fff';
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Card Name Tag
    ctx.fillStyle = isSelected ? '#ffffff' : '#8899aa';
    ctx.font = 'bold 9px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    let shortName = def.name;
    if (shortName.length > 9) shortName = shortName.substring(0, 8) + '.';
    ctx.fillText(shortName.toUpperCase(), avatarX, itemY + cellH - 3);

    _registerButton(itemX, itemY, cellW, cellH, () => {
      if (modalInspectIndex !== idx) {
        modalInspectIndex = idx;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    });
  });

  // ── Pagination Controls Dock at Bottom of Roster Grid ──
  const paginationY = listY + rows * (cellH + gap) + 4;
  const paginationH = 34;

  // Background panel for pagination
  ctx.save();
  ctx.fillStyle = 'rgba(12, 16, 24, 0.90)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, listX, paginationY, gridW, paginationH, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Previous Page Button
  const pageBtnW = 32;
  const pageBtnH = 24;
  const pageBtnY = paginationY + paginationH / 2;

  drawButton('◄', listX + 8 + pageBtnW / 2, pageBtnY, () => {
    if (modalPage > 0) {
      modalPage--;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, pageBtnW, pageBtnH, null, 4);

  // Next Page Button
  drawButton('►', listX + gridW - 8 - pageBtnW / 2, pageBtnY, () => {
    if (modalPage < totalPages - 1) {
      modalPage++;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, pageBtnW, pageBtnH, null, 4);

  // Page Indicator Text & Dot Pips
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${modalPage + 1} / ${totalPages}`, listX + gridW / 2, paginationY + 11);

  // Tactical Dot Pips
  const dotSpacing = 14;
  const dotsStartX = listX + gridW / 2 - ((totalPages - 1) * dotSpacing) / 2;
  for (let p = 0; p < totalPages; p++) {
    const dotX = dotsStartX + p * dotSpacing;
    const dotY = paginationY + 24;
    const isCurrentPage = p === modalPage;

    ctx.fillStyle = isCurrentPage ? '#f59e0b' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(dotX, dotY, isCurrentPage ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();

    _registerButton(dotX - 6, dotY - 6, 12, 12, () => {
      if (modalPage !== p) {
        modalPage = p;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    });
  }

  // ── Right Side: Champion Showcase Stage ──
  const detailX = listX + gridW + 16;
  const detailW = modalW - (detailX - mx) - 20;
  const detailY = my + 62;
  const detailH = 440;

  drawPanel(detailX, detailY, detailW, detailH, 0.90, 8);

  const previewX = detailX + detailW / 2;
  const previewY = detailY + 58;

  // Draw Champion Preview Image
  const previewImage = getFighterPreview(modalInspectIndex);
  if (previewImage) {
    const previewSize = 88;
    ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
  }

  // Champion Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 114);

  // Class Badge Pill
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, previewX - 55, detailY + 128, 110, 18, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '900 9px "Rajdhani", sans-serif';
  ctx.fillText(selectedDef.type.toUpperCase(), previewX, detailY + 137);

  // Stat Bars
  let textY = detailY + 158;
  const barW = detailW - 24;
  const barX = detailX + 12;

  drawStatBar(ctx, 'HP', selectedDef.hp, 150, barX, textY, barW, '#dc2626');
  textY += 19;
  drawStatBar(ctx, 'DMG', selectedDef.damage, 60, barX, textY, barW, '#f59e0b');
  textY += 19;
  drawStatBar(ctx, 'SPD', selectedDef.speed || 2, 4, barX, textY, barW, '#94a3b8');
  textY += 24;

  const modalWeaponInfo = getFighterWeaponInfo(selectedDef);

  // ── Weapon Visual Showcase Box in Modal ──
  const mWeaponBoxY = textY + 6;
  const mWeaponBoxH = 110;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 16, 24, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, barX, mWeaponBoxY, barW, mWeaponBoxH, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Weapon Title
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`WEAPON // ${modalWeaponInfo.name}`, barX + 8, mWeaponBoxY + 7);

  ctx.fillStyle = '#64748b';
  ctx.font = '900 8px "Rajdhani", sans-serif';
  ctx.fillText(`[ ${modalWeaponInfo.category} ]`, barX + 8, mWeaponBoxY + 21);

  // Live Weapon Graphic Stage
  const mStageX = barX + barW / 2;
  const mStageY = mWeaponBoxY + 66;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(mStageX, mStageY + 16, 36, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.translate(mStageX, mStageY);
  ctx.scale(0.9, 0.9);
  drawWeaponPreview(ctx, selectedDef.type, selectedDef.color);
  ctx.restore();

  // Ability Header & Text Below
  const mAbilityY = mWeaponBoxY + mWeaponBoxH + 8;
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`ABILITY // ${selectedDef.ability.toUpperCase()}`, barX, mAbilityY);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9.5px "Rajdhani", Arial, sans-serif';
  wrapText(ctx, selectedDef.desc, barX, mAbilityY + 14, barW, 12.5);

  // Footer Action Buttons
  const footerY = my + modalH - 34;
  const btnW = 130;
  const btnH = 36;

  drawButton('CANCEL', listX + gridW / 2, footerY, () => {
    selectingSlot = null;
  }, btnW, btnH, null, 6);

  drawButton('LOCK IN', detailX + detailW / 2, footerY, () => {
    if (selectingSlot) {
      state[selectingSlot] = modalInspectIndex;
    }
    selectingSlot = null;
  }, btnW, btnH, null, 6);
}

function drawSelectScreen() {
  const { ctx, canvas, mode } = state;
  _clearButtons();
  _playerCardBounds = [];
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sleek Gunmetal & Matte Charcoal Cinematic Background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#07080c');
  gradient.addColorStop(0.5, '#10131c');
  gradient.addColorStop(1, '#07080c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // ── Header Section ──
  // Tactical Breadcrumb
  ctx.fillStyle = '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CIRCLE BATTLE // OPERATION SETUP // SYS.v2.5', canvas.width / 2, 56);

  // Screen Title
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px "Outfit", "Rajdhani", sans-serif';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillText('[ TACTICAL DEPLOYMENT ]', canvas.width / 2, 78);
  ctx.restore();

  // Mode Selection Tabs (Shifted down to Y = 104)
  const modeButtonY = 104;
  drawModeSelection(canvas.width / 2, modeButtonY);

  // Tactical Sub-Controls (Test Mode & Dummy Toggles - Shifted to Y = 128)
  const tmW = 114;
  const tmH = 22;
  const gap = 12;
  const tmX = canvas.width / 2 - tmW - gap / 2;
  const tmY = 128;

  ctx.save();
  ctx.fillStyle = state.testMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(18, 22, 32, 0.85)';
  ctx.strokeStyle = state.testMode ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, tmX, tmY, tmW, tmH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.testMode ? '#f59e0b' : '#8899aa';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TEST MODE', tmX + tmW / 2 - 8, tmY + tmH / 2);

  ctx.beginPath();
  ctx.arc(tmX + tmW - 12, tmY + tmH / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = state.testMode ? '#f59e0b' : '#475569';
  if (state.testMode) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;
  }
  ctx.fill();
  ctx.restore();

  _registerButton(tmX, tmY, tmW, tmH, () => { state.testMode = !state.testMode; });

  const daX = canvas.width / 2 + gap / 2;
  const daY = 128;

  ctx.save();
  ctx.fillStyle = state.dummyEnabled ? 'rgba(245, 158, 11, 0.15)' : 'rgba(18, 22, 32, 0.85)';
  ctx.strokeStyle = state.dummyEnabled ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, daX, daY, tmW, tmH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.dummyEnabled ? '#f59e0b' : '#8899aa';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DUMMY TARGET', daX + tmW / 2 - 8, daY + tmH / 2);

  ctx.beginPath();
  ctx.arc(daX + tmW - 12, daY + tmH / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = state.dummyEnabled ? '#f59e0b' : '#475569';
  if (state.dummyEnabled) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;
  }
  ctx.fill();
  ctx.restore();

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

  // ── Main Combatant Grid (Shifted to topY = 158) ──
  const topY = 158;
  const margin = 16;
  const cardGap = 12;
  const totalCardW = canvas.width - margin * 2;
  const cardW = Math.floor((totalCardW - cardGap) / 2); // 248px
  const fullCardH = 650; // Expands to Y = 808!

  if (mode === '1v1' || mode === 'Stand Off') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;

    drawPlayerCard('p1Index', 'PLAYER 1 // RED CORNER', leftX, topY, cardW, fullCardH, '#dc2626', true, true);
    drawPlayerCard('p2Index', 'PLAYER 2 // BLUE CORNER', rightX, topY, cardW, fullCardH, '#38bdf8', true, true);

    // Center Holographic VS Crest
    const vsX = canvas.width / 2;
    const vsY = topY + fullCardH / 2 - 10;
    
    ctx.save();
    // Outer tech ring
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Inner shield
    ctx.fillStyle = '#0b0d13';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 1);
    ctx.restore();

    // Bottom Command Dock
    drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomize1v1Fighters());

  } else if (mode === '1v2 Stand Off') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    drawPlayerCard('p1Index', 'SOLO BOSS CHAMPION', leftX, topY, cardW, fullCardH, '#dc2626', true, true);
    drawPlayerCard('p2Index', 'DUO SQUAD 1', rightX, topY, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p3Index', 'DUO SQUAD 2', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

    drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomize1v2Fighters());

  } else if (mode === '2v2' || mode === 'FFA') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    const p1Title = mode === '2v2' ? 'RED TEAM // SQUAD 1' : 'PLAYER 1';
    const p2Title = mode === '2v2' ? 'BLUE TEAM // SQUAD 1' : 'PLAYER 2';
    const p3Title = mode === '2v2' ? 'RED TEAM // SQUAD 2' : 'PLAYER 3';
    const p4Title = mode === '2v2' ? 'BLUE TEAM // SQUAD 2' : 'PLAYER 4';

    drawPlayerCard('p1Index', p1Title, leftX, topY, cardW, stackedH, '#dc2626', true);
    drawPlayerCard('p2Index', p2Title, rightX, topY, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p3Index', p3Title, leftX, bottomY, cardW, stackedH, '#dc2626', true);
    drawPlayerCard('p4Index', p4Title, rightX, bottomY, cardW, stackedH, '#38bdf8', true);

    drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomizeFfaFighters());

  } else if (mode === 'TLFS') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;

    drawPlayerCard('p1Index', 'YOUR GAUNTLET CHAMPION', leftX, topY, cardW, fullCardH, '#f59e0b', true, true);
    drawTlfsEnemyPoolGrid(rightX, topY, cardW, fullCardH);

    drawBottomCommandDeck('START GAUNTLET', () => startGame(), () => {
      state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
    });
  }

  if (selectingSlot !== null) {
    drawFighterSelectModal();
  }
}

function drawBottomCommandDeck(primaryLabel, onStart, onRandomize) {
  const { canvas } = state;
  const startBtnW = 170;
  const randBtnW = 140;
  const btnGap = 12;
  const startBtnX = canvas.width / 2 - (startBtnW + randBtnW + btnGap) / 2 + startBtnW / 2;
  const randBtnX = startBtnX + startBtnW / 2 + btnGap + randBtnW / 2;
  const actionRowY = 840;

  drawButton(primaryLabel, startBtnX, actionRowY, onStart, startBtnW, 44);
  drawButton('RANDOMIZE', randBtnX, actionRowY, onRandomize, randBtnW, 44);
  drawButton('BACK TO MENU', canvas.width / 2, 898, () => { goToTitle(); }, 140, 32);

  // Bottom Hotkey prompts
  const { ctx } = state;
  ctx.fillStyle = '#64748b';
  ctx.font = '900 9.5px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[SPACE] START  •  [R] RANDOMIZE  •  [ESC] BACK', canvas.width / 2, 940);
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

export function getFighterWeaponInfo(def) {
  const t = def.type ? def.type.toLowerCase() : '';
  switch (t) {
    case 'normal':
    case 'sharpshooter':
      return { name: 'HEAVY SNIPER RIFLE', category: 'BALLISTIC // RANGED', desc: 'Fires high-velocity match bullets with a lethal execution shot on reload.' };
    case 'aimbot':
    case 'ranger':
      return { name: 'DUBSTEP SONIC LASER', category: 'ENERGY // TRACKING', desc: 'Synthesizes musical soundwave projectiles that auto-lock onto nearby targets.' };
    case 'melee':
      return { name: 'MARTIAL ARTS FISTS', category: 'MELEE // BRAWLER', desc: 'Rapid 2-handed supersonic punch flurries with dash momentum.' };
    case 'orange':
      return { name: 'INCINERATOR FLAMETHROWER', category: 'PYRO // AOE SPRAY', desc: 'Projects a continuous burning cone that applies stacking thermal damage.' };
    case 'laser':
      return { name: 'HIGH-OUTPUT RAILGUN', category: 'ENERGY // PIERCING', desc: 'Charges a high-energy particle beam that pierces through all arena targets.' };
    case 'poison':
      return { name: 'TOXIC FLASK CANNON', category: 'CHEMICAL // DOT', desc: 'Launches acid canisters that burst into lingering poisonous AOE clouds.' };
    case 'darkslategray':
    case 'asassin':
      return { name: 'SHADOW NINJATO & SHURIKEN', category: 'MELEE // STEALTH', desc: 'Twin stealth blades with backstab criticals and projectile evasion.' };
    case 'knight':
      return { name: 'AEGIS TOWER SHIELD & SWORD', category: 'DEFENSE // MELEE', desc: 'Reinforced ballistic shield that absorbs attacks paired with heavy sword slashes.' };
    case 'berserker':
      return { name: 'BLOODFORGED BATTLEAXES', category: 'DUAL MELEE // FRENZY', desc: 'Twin heavy war axes that gain lifesteal and attack speed as health drops.' };
    case 'cronos':
      return { name: 'TEMPORAL CRESCENT BLADE', category: 'TEMPORAL // MELEE', desc: 'Spatial curved blade that deploys a chronostasis stasis sphere.' };
    case 'bomber':
      return { name: 'GRENADE & C4 CANISTER', category: 'DEMOLITIONS // AOE', desc: 'Throws high-explosive grenades and drops a massive lethal C4 bomb on defeat.' };
    case 'gunslinger':
      return { name: 'DUAL CUSTOM REVOLVERS', category: 'DUAL BALLISTIC // RAPID', desc: 'Twin six-shooters with rapid-fire fanning and devastating bullet barrages.' };
    case 'doppleganger':
      return { name: 'PHANTOM SHADOWBLADE', category: 'ILLUSION // MELEE', desc: 'Ghostly curved sword that synchronizes strikes with spawned clones.' };
    case 'engineer':
      return { name: 'AUTO-SENTRY RIVET GUN', category: 'DEPLOYABLE // TURRET', desc: 'Rapid rivet fire backed by automated 360-degree combat sentry turrets.' };
    case 'spike':
      return { name: 'CRYSTALLINE SPINE EMITTER', category: 'PROJECTILE // PIERCING', desc: 'Fires clusters of razor needle quills in multi-directional needle bursts.' };
    case 'voidmaster':
      return { name: 'SINGULARITY VOID CORE', category: 'GRAVITATIONAL // AOE', desc: 'Manipulates dark matter to pull enemies into a crushing gravitational vortex.' };
    case 'zeus':
      return { name: 'OLYMPIAN THUNDER JAVELIN', category: 'LIGHTNING // PIERCING', desc: 'Hurled lightning spears that chain crackling electric arcs across enemies.' };
    case 'gojo':
      return { name: 'LIMITLESS INFINITY BARRIER', category: 'CURSED TECHNIQUE // SPACE', desc: 'Absolute space manipulation: Limitless Infinity barrier, Blue, Red, & Purple.' };
    case 'sukuna':
      return { name: 'CLEAVE, DISMANTLE & FUGA', category: 'CURSED // SPATIAL SLASH', desc: 'Invisible spatial slashes with Malevolent Shrine and Fuga Divine Flame arrow.' };
    case 'toji':
      return { name: 'INVERTED SPEAR & SPLIT SOUL', category: 'SPECIAL GRADE // CURSED TOOLS', desc: 'ISOH nullifies cursed barriers while the Split Soul Katana ignores physical defense.' };
    case 'mahoraga':
      return { name: 'SWORD OF EXTERMINATION', category: 'DIVINE // ADAPTATION', desc: 'Blade coated in positive energy that rapidly adapts and counters all damage.' };
    case 'yuta':
      return { name: 'CURSED KATANA & RIKA', category: 'CURSED // SPECIAL GRADE', desc: 'Reinforced katana strikes backed by Rika Queen of Curses and Love Beam.' };
    case 'mahito':
      return { name: 'TRANSFIGURATION BLADE CLAWS', category: 'SOUL // MORPHING', desc: 'Bladed soul claws that morph into mace cannons and reshape target souls.' };
    case 'musashi':
      return { name: 'DUAL NITEN ICHI-RYU BLADES', category: 'DUAL KATANA // KENJUTSU', desc: 'Master dual swordsmanship with supersonic dashing vacuum slashes.' };
    case 'ruby':
      return { name: 'CRESCENT ROSE SNIPER-SCYTHE', category: 'HYBRID SCYTHE // BALLISTIC', desc: 'Massive high-caliber sniper rifle embedded in a supersonic scythe.' };
    case 'layla':
      return { name: 'MALEFIC ENERGY CANNON', category: 'ENERGY // HYPER-RANGE', desc: 'Long-range particle beam rifle with extreme single-shot execution power.' };
    case 'ichigo':
      return { name: 'ZANGETSU / TENSA ZANGETSU', category: 'ZANPAKUTO // GETSUGA', desc: 'Heavy cleaver blade unleashing Kuroi Getsuga Tensho energy waves.' };
    case 'nanami':
      return { name: 'RATIO TECHNIQUE CLEAVER', category: 'CURSED // 7:3 RATIO', desc: 'Fabric-wrapped blunt blade that creates critical hit weak points on contact.' };
    case 'john_wick':
    case 'johnwick':
      return { name: 'TTI PIT VIPER & BENELLI M4', category: 'TACTICAL FIREARMS // GUN-FU', desc: 'Combat Master 9mm, Super 90 shotgun, M4A1 rifle, and sharpened No. 2 pencil.' };
    case 'cj':
      return { name: 'BRASS KNUCKLES & JETPACK', category: 'STREET BRAWLER // CHEAT ARSENAL', desc: 'Heavy metallic brass knuckles for CQC boxing, Area 69 Jetpack flight, and Minigun.' };
    case 'dummy':
      return { name: 'BALLISTIC TARGET CHASSIS', category: 'TRAINING // SANDBOX', desc: 'Reinforced training frame designed for testing weapon DPS and combos.' };
    default:
      return { name: (def.ability || 'TACTICAL WEAPON').toUpperCase(), category: 'COMBAT ARSENAL', desc: def.desc || 'Standard tactical armament.' };
  }
}

function drawPlayerCard(slotProp, title, x, y, w, h, accentColor, enabled, isLarge = false) {
  const { ctx } = state;
  // Track card bounds for direct mouse wheel cycling
  if (enabled) {
    _playerCardBounds.push({ slotProp, x, y, w, h });
  }

  // Unified Dark Gunmetal Slate Panel with subtle border
  drawPanel(x, y, w, h, 0.92, 8, 'rgba(255, 255, 255, 0.12)');

  // Header band with subtle team accent indicator
  ctx.fillStyle = 'rgba(12, 15, 22, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 28, 5);
  ctx.fill();
  ctx.stroke();

  // Top accent pip line
  ctx.fillStyle = accentColor || '#f59e0b';
  ctx.fillRect(x + 16, y + 2, w - 32, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 17);

  const fighterIndex = state[slotProp];
  const def = FIGHTER_DEFS[fighterIndex];

  if (!enabled) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 12px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLOT UNAVAILABLE', x + w / 2, y + h / 2);
    return;
  }

  const previewImage = getFighterPreview(fighterIndex);
  const weaponInfo = getFighterWeaponInfo(def);

  // Helper function to cycle fighters for this slot
  const cycleFighter = (direction) => {
    const availableFighters = FIGHTER_DEFS.map((d, idx) => ({ d, idx }))
      .filter(({ d }) => !(!state.dummyEnabled && d.type === 'dummy'));
    const pos = availableFighters.findIndex(f => f.idx === state[slotProp]);
    const count = availableFighters.length;
    if (count > 0) {
      const nextPos = (pos + direction + count) % count;
      state[slotProp] = availableFighters[nextPos].idx;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  };

  if (isLarge) {
    // ── TALL SHOWCASE CARD (1v1 / Stand-Off Solo / TLFS: H = 680) ──
    const avatarX = x + w / 2;
    const avatarY = y + 88;
    const avatarSize = 84;

    // Quick cycle arrows on large card avatar sides
    drawButton('◄', x + 24, avatarY, () => cycleFighter(-1), 26, 26, null, 4);
    drawButton('►', x + w - 24, avatarY, () => cycleFighter(1), 26, 26, null, 4);

    // Glowing stage pedestal ring
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY + 40, avatarSize * 0.44, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    // Fighter Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.toUpperCase(), avatarX, y + 148);

    // Class Tag Pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, avatarX - 50, y + 160, 100, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '900 8px "Rajdhani", sans-serif';
    ctx.fillText(`CLASS // ${def.type.toUpperCase()}`, avatarX, y + 168);

    // Stat Telemetry Block
    const statBoxX = x + 12;
    const statBoxY = y + 184;
    const statBoxW = w - 24;

    drawStatBar(ctx, 'HP', def.hp, 150, statBoxX, statBoxY, statBoxW, '#dc2626');
    drawStatBar(ctx, 'DMG', def.damage, 60, statBoxX, statBoxY + 18, statBoxW, '#f59e0b');
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, statBoxX, statBoxY + 36, statBoxW, '#94a3b8');

    // ── Ability Dossier Sub-Panel ──
    const abilityY = y + 248;
    const abilityH = 76;
    
    ctx.save();
    ctx.fillStyle = 'rgba(14, 18, 26, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, statBoxX, abilityY, statBoxW, abilityH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`ABILITY // ${def.ability.toUpperCase()}`, statBoxX + 10, abilityY + 7);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px "Rajdhani", Arial, sans-serif';
    wrapText(ctx, def.desc, statBoxX + 10, abilityY + 22, statBoxW - 20, 13);

    // ── Live Weapon Graphic Visual Stage Sub-Panel ──
    const weaponY = abilityY + abilityH + 8;
    const weaponH = 284;

    ctx.save();
    ctx.fillStyle = 'rgba(14, 18, 26, 0.90)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, statBoxX, weaponY, statBoxW, weaponH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Weapon Header & Category
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`WEAPON // ${weaponInfo.name}`, statBoxX + 10, weaponY + 8);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 8px "Rajdhani", sans-serif';
    ctx.fillText(`[ ${weaponInfo.category} ]`, statBoxX + 10, weaponY + 23);

    // Live Weapon Holographic Center Stage
    const wStageX = statBoxX + statBoxW / 2;
    const wStageY = weaponY + 115;

    // Glowing stage pedestal ring
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(wStageX, wStageY + 28, 54, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle holographic tech grid marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wStageX - 35, wStageY);
    ctx.lineTo(wStageX + 35, wStageY);
    ctx.moveTo(wStageX, wStageY - 25);
    ctx.lineTo(wStageX, wStageY + 25);
    ctx.stroke();

    // Render LIVE WEAPON GRAPHIC
    ctx.save();
    ctx.translate(wStageX, wStageY);
    ctx.scale(1.15, 1.15);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();
    ctx.restore();

    // Weapon Description Telemetry
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px "Rajdhani", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, weaponInfo.desc, wStageX, weaponY + 218, statBoxW - 16, 12.5);

    // Change Fighter Button
    const btnW = w - 24;
    const btnH = 38;
    const btnY = y + h - btnH - 12;

    drawButton('CHANGE FIGHTER (ROSTER)', x + w / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, btnW, btnH, null, 6);

  } else {
    // ── MEDIUM CARD (2v2 / 1v2 Duo Stacked / FFA: H ~ 334px) ──
    const avatarX = x + 38;
    const avatarY = y + 68;
    const avatarSize = 58;

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    const detailX = x + 76;
    const detailW = w - 86;

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), detailX, y + 32);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 8px "Rajdhani", sans-serif';
    ctx.fillText(`CLASS // ${def.type.toUpperCase()}`, detailX, y + 47);

    drawStatBar(ctx, 'HP', def.hp, 150, detailX, y + 62, detailW, '#dc2626');
    drawStatBar(ctx, 'DMG', def.damage, 60, detailX, y + 78, detailW, '#f59e0b');
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, y + 94, detailW, '#94a3b8');

    // Live Weapon preview sub-box
    const weaponBoxY = y + 118;
    const weaponBoxH = h - (weaponBoxY - y) - 46;
    const boxW = w - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(14, 18, 26, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, x + 10, weaponBoxY, boxW, weaponBoxH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`WEAPON // ${weaponInfo.name}`, x + 16, weaponBoxY + 6);

    // Mini Live Weapon render on right
    const miniWX = x + boxW - 35;
    const miniWY = weaponBoxY + weaponBoxH / 2 + 6;
    ctx.save();
    ctx.translate(miniWX, miniWY);
    ctx.scale(0.65, 0.65);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    ctx.fillStyle = '#8899aa';
    ctx.font = '8.5px "Rajdhani", Arial, sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 16, weaponBoxY + 20, boxW - 75, 11);

    // Quick cycle arrows + Change Fighter Button
    const arrowW = 28;
    const changeBtnW = w - 20 - arrowW * 2 - 8;
    const btnH = 28;
    const btnY = y + h - btnH - 10;

    drawButton('◄', x + 10 + arrowW / 2, btnY + btnH / 2, () => cycleFighter(-1), arrowW, btnH, null, 4);
    drawButton('CHANGE', x + 10 + arrowW + 4 + changeBtnW / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, changeBtnW, btnH, null, 4);
    drawButton('►', x + w - 10 - arrowW / 2, btnY + btnH / 2, () => cycleFighter(1), arrowW, btnH, null, 4);
  }
}

function openFighterSelectModal(slotProp, fighterIndex) {
  selectingSlot = slotProp;
  modalInspectIndex = fighterIndex;
  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
  const pos = modalAvailableFighters.findIndex(f => f.idx === fighterIndex);
  
  if (pos !== -1) {
    modalPage = Math.floor(pos / 15);
  } else {
    modalPage = 0;
  }
}

// Global Keyboard Shortcuts for Tactical Select Screen
window.addEventListener('keydown', (e) => {
  if (state.gameState === 'select') {
    if (selectingSlot !== null) {
      if (e.key === 'Escape') {
        selectingSlot = null;
        e.preventDefault();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        if (selectingSlot) {
          state[selectingSlot] = modalInspectIndex;
        }
        selectingSlot = null;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (modalPage > 0) {
          modalPage--;
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.12);
          }
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
          .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / 15));
        if (modalPage < totalPages - 1) {
          modalPage++;
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.12);
          }
        }
      }
      return;
    }

    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      startGame();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      if (state.mode === '1v1' || state.mode === 'Stand Off') {
        randomize1v1Fighters();
      } else if (state.mode === '1v2 Stand Off') {
        randomize1v2Fighters();
      } else if (state.mode === '2v2' || state.mode === 'FFA') {
        randomizeFfaFighters();
      } else if (state.mode === 'TLFS') {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      goToTitle();
    }
  }
});

// Event listeners for character select screen & modal scrolling
window.addEventListener('wheel', (e) => {
  if (state.gameState !== 'select') return;

  const activeCanvas = (state.pixiApp && state.pixiApp.view) ? state.pixiApp.view : state.canvas;
  const rect = (activeCanvas && activeCanvas.getBoundingClientRect) ? activeCanvas.getBoundingClientRect() : { left: 0, top: 0, width: state.canvas.width, height: state.canvas.height };
  const scaleX = state.canvas.width / (rect.width || 1);
  const scaleY = state.canvas.height / (rect.height || 1);
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  if (selectingSlot !== null) {
    // Modal scroll: flip to next / previous page on scroll!
    const modalW = Math.min(state.canvas.width - 20, 510);
    const modalH = Math.min(state.canvas.height - 40, 600);
    const mx = (state.canvas.width - modalW) / 2;
    const my = (state.canvas.height - modalH) / 2;

    // If hovering anywhere over the modal or modal area
    if (mouseX >= mx - 20 && mouseX <= mx + modalW + 20 && mouseY >= my - 20 && mouseY <= my + modalH + 20) {
      e.preventDefault();
      const now = performance.now();
      if (now - _lastModalWheelTime > 140) {
        const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
          .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / 15));
        
        if (e.deltaY > 0) {
          if (modalPage < totalPages - 1) {
            modalPage++;
            _lastModalWheelTime = now;
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('skill_dash5', 0.12);
            }
          }
        } else if (e.deltaY < 0) {
          if (modalPage > 0) {
            modalPage--;
            _lastModalWheelTime = now;
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('skill_dash5', 0.12);
            }
          }
        }
      }
    }
    return;
  }

  // Main character select screen: scroll over player card to cycle fighters cleanly
  const card = _playerCardBounds.find(c => mouseX >= c.x && mouseX <= c.x + c.w && mouseY >= c.y && mouseY <= c.y + c.h);
  if (card) {
    e.preventDefault();
    const now = performance.now();
    if (now - _lastCardWheelTime < 130) return;
    _lastCardWheelTime = now;
    const availableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
      .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
    const currentIdx = state[card.slotProp];
    const listPos = availableFighters.findIndex(f => f.idx === currentIdx);
    const count = availableFighters.length;
    if (count > 0) {
      let nextPos = listPos;
      if (e.deltaY > 0) {
        nextPos = (listPos + 1) % count;
      } else if (e.deltaY < 0) {
        nextPos = (listPos - 1 + count) % count;
      }
      if (nextPos !== listPos && nextPos >= 0 && nextPos < count) {
        state[card.slotProp] = availableFighters[nextPos].idx;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }
  }
}, { passive: false });

export { drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, selectingSlot, modalInspectIndex, modalPage };
