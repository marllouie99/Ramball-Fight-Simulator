import { randomize1v1Fighters, goToTitle, startGame } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { drawModeSelection } from './MainMenuScreen.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { spawnFloatingText } from '../../core/state.js';

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;


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
    
    // Draw badge using cached pre-rendered preview image if available
    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      const badgeSize = Math.min(cellW, cellH) * 0.7;
      ctx.drawImage(previewImg, cellX + cellW / 2 - badgeSize / 2, cellY + cellH / 2 - badgeSize / 2, badgeSize, badgeSize);
    } else {
      drawSmallFighterBadge(ctx, def, cellX + cellW / 2, cellY + cellH / 2, Math.min(cellW, cellH) * 0.7);
    }
    
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



function drawSelectScreen() {
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
    drawButton('🎲 RANDOMIZE', centerX + actionBtnW / 2 + actionSpacing / 2, footerY, () => { randomize1v2Fighters(); }, actionBtnW, 40);
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

export { drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, drawFfaSelectionPanel, selectingSlot, modalInspectIndex, modalPage };

const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
eventTarget.addEventListener('wheel', (e) => {
  if (selectingSlot === null) return;

  const rect = eventTarget.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const modalW = Math.min(state.canvas.width - 20, 520);
  const modalH = Math.min(state.canvas.height - 20, 520);
  const mx = (state.canvas.width - modalW) / 2;
  const my = (state.canvas.height - modalH) / 2;

  const cols = 3;
  const gap = 10;
  const gridW = 210;
  const listX = mx + 24;
  const listY = my + 68;

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

