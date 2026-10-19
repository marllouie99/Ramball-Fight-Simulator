import { goToTitle, startGame, startFaceOffScreen, randomizeTagMatchFighters, preloadFighterAssets } from '../../core/gameFlow.js';
import { state, saveFighterSelections } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, fitSingleLineText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview, getFighterStickerPreview } from './FighterPreviewCache.js';
import {
  drawCollectorFighterCard,
  drawCollectorModalBackdrop,
  drawCollectorShowcaseHeader,
  drawCompactFighterDossierBar,
  drawHazardStripes,
  drawCornerBrackets,
  drawTacticalStatBar,
  getFighterCollectorTheme,
} from './CollectorCardRenderer.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawArenaBgmSelector, isArenaBgmModalOpen, drawArenaBgmModal, closeArenaBgmModal } from '../../systems/arenaBgmSystem.js';
import { drawArenaFloorSelector, isArenaFloorModalOpen, drawArenaFloorModal, closeArenaFloorModal } from '../../systems/arenaTileSystem.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { getBossConfig } from '../../configs/bosses/bossConfigRegistry.js';
import { drawGradeBadge } from '../../configs/gradeConfig.js';

const MODAL_ITEMS_PER_PAGE = 12;

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;
let _lastModalWheelTime = 0;
let _lastCardWheelTime = 0;
let _lastCardClickTime = 0;
let _lastCardClickIdx = -1;
let _playerCardBounds = [];

function drawTlfsEnemyPoolGrid(x, y, w, h) {
  const { ctx } = state;
  // Deep Tactical Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.70)';
  drawChamferedRect(ctx, x + 3, y + 4, w, h, 6);
  ctx.fill();

  // Dark Tactical Carbon Base
  ctx.fillStyle = '#141720';
  ctx.strokeStyle = '#282E3C';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Tech Corner Brackets
  drawCornerBrackets(ctx, x + 3, y + 3, w - 6, h - 6, 12, '#F5A623', 1.8);

  // Header band
  ctx.fillStyle = '#181C26';
  ctx.strokeStyle = '#282E3C';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Top accent line
  ctx.fillStyle = '#F5A623';
  ctx.fillRect(x + 10, y + 2, w - 20, 2);

  // Bottom hazard stripe
  drawHazardStripes(ctx, x + 6, y + 23, w - 12, 3, 4, '#F5A623', '#101217');

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENEMY GAUNTLET POOL', x + w / 2, y + 14);
  ctx.restore();

  const cols = 4;
  const padding = 12;
  const availableW = w - padding * 2;
  const gap = 6;
  const cellW = Math.floor((availableW - gap * (cols - 1)) / cols);
  const cellH = 56;
  
  const startX = x + padding;
  let startY = y + 36;
  
  const currentDefs = getActiveFighterDefs();
  const poolFighters = currentDefs.map((def, idx) => ({ def, idx })).filter(({ def }) => def.type !== 'dummy');
  
  poolFighters.forEach(({ def, idx }, listPos) => {
    const col = listPos % cols;
    const row = Math.floor(listPos / cols);
    const cellX = startX + col * (cellW + gap);
    const cellY = startY + row * (cellH + gap);
    
    const isSelected = state.tlfsAllowedEnemies.includes(idx);
    
    ctx.save();
    if (isSelected) {
      ctx.fillStyle = '#1E2330';
      ctx.strokeStyle = '#F5A623';
      ctx.lineWidth = 1.6;
      drawChamferedRect(ctx, cellX, cellY, cellW, cellH, 3);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#111319';
      ctx.strokeStyle = '#232733';
      ctx.lineWidth = 1.2;
      drawChamferedRect(ctx, cellX, cellY, cellW, cellH, 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    
    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      const badgeSize = Math.min(cellW - 8, cellH - 16);
      ctx.drawImage(previewImg, cellX + cellW / 2 - badgeSize / 2, cellY + 4, badgeSize, badgeSize);
    } else {
      drawSmallFighterBadge(ctx, def, cellX + cellW / 2, cellY + 18, 22);
    }

    // Name tag
    ctx.fillStyle = isSelected ? '#FFD043' : '#64748B';
    ctx.font = '900 8.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    let nameStr = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
    if (nameStr.length > 9) nameStr = nameStr.substring(0, 8) + '..';
    ctx.fillText(nameStr.toUpperCase(), cellX + cellW / 2, cellY + cellH - 3);
    
    if (!isSelected) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.8;
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
  }, halfBtnW - 4, 30, '#20242E', 4);

  drawButton('CLEAR ALL', x + w - 16 - halfBtnW / 2, poolBtnY + 16, () => {
    state.tlfsAllowedEnemies = poolFighters.slice(0, 5).map(f => f.idx);
  }, halfBtnW - 4, 30, '#20242E', 4);
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
    badge.hideHpText = true;
    badge._isPreview = true;

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

function applyFighterSelection() {
  if (selectingSlot) {
    if (typeof selectingSlot === 'string' && selectingSlot.startsWith('slot_')) {
      const slotNum = parseInt(selectingSlot.replace('slot_', ''), 10);
      if (!state.horizontalRosterSlots) state.horizontalRosterSlots = [];
      state.horizontalRosterSlots[slotNum] = modalInspectIndex;
      if (slotNum === 0) state.p1Index = modalInspectIndex;
      else if (slotNum === 1) state.p2Index = modalInspectIndex;
      else if (slotNum === 2) state.p3Index = modalInspectIndex;
      else if (slotNum === 3) state.p4Index = modalInspectIndex;
      else if (slotNum === 4) state.p5Index = modalInspectIndex;
      else if (slotNum === 5) state.p6Index = modalInspectIndex;
      else if (slotNum === 6) state.p7Index = modalInspectIndex;
      else if (slotNum === 7) state.p8Index = modalInspectIndex;
      else if (slotNum === 8) state.p9Index = modalInspectIndex;
      else if (slotNum === 9) state.p10Index = modalInspectIndex;
      else if (slotNum === 10) state.p11Index = modalInspectIndex;
      else if (slotNum === 11) state.p12Index = modalInspectIndex;
    } else {
      state[selectingSlot] = modalInspectIndex;
      if (selectingSlot === 'p1Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[0] = modalInspectIndex;
      else if (selectingSlot === 'p2Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[1] = modalInspectIndex;
      else if (selectingSlot === 'p3Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[2] = modalInspectIndex;
      else if (selectingSlot === 'p4Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[3] = modalInspectIndex;
      else if (selectingSlot === 'p5Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[4] = modalInspectIndex;
      else if (selectingSlot === 'p6Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[5] = modalInspectIndex;
    }
    saveFighterSelections();
    preloadFighterAssets(modalInspectIndex);
  }
  selectingSlot = null;
}

function _handleCollectorCardSelect(idx) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (modalInspectIndex === idx && _lastCardClickIdx === idx && now - _lastCardClickTime < 360) {
    applyFighterSelection();
    return;
  }
  _lastCardClickIdx = idx;
  _lastCardClickTime = now;
  if (modalInspectIndex !== idx) {
    modalInspectIndex = idx;
    preloadFighterAssets(idx);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash5', 0.14);
    }
  }
}

function _drawModalPaginationDock(ctx, x, y, w, h, totalPages) {
  ctx.save();
  // Tactical carbon plate with subtle hazard amber edge line
  ctx.fillStyle = '#161922';
  ctx.strokeStyle = '#2B313E';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Top yellow accent hairline
  ctx.fillStyle = '#F5A623';
  ctx.fillRect(x + 10, y, w - 20, 1.5);
  ctx.restore();

  const btnW = 34;
  const btnH = h - 6;
  const btnCenterY = y + h / 2;

  drawButton('◄', x + 6 + btnW / 2, btnCenterY, () => {
    if (modalPage > 0) {
      modalPage--;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, btnW, btnH, '#20242E', 3);

  drawButton('►', x + w - 6 - btnW / 2, btnCenterY, () => {
    if (modalPage < totalPages - 1) {
      modalPage++;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, btnW, btnH, '#20242E', 3);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const curP = String(modalPage + 1).padStart(2, '0');
  const totP = String(totalPages).padStart(2, '0');
  ctx.fillText(`PAGE // [ ${curP} / ${totP} ]`, x + w / 2 - 34, btnCenterY);

  const dotSpacing = 14;
  const dotsStartX = x + w / 2 + 24;
  for (let p = 0; p < totalPages; p++) {
    const dotX = dotsStartX + p * dotSpacing;
    const isCurrentPage = p === modalPage;
    ctx.fillStyle = isCurrentPage ? '#F5A623' : '#333846';
    ctx.save();
    ctx.translate(dotX, btnCenterY);
    ctx.rotate(Math.PI / 4);
    const size = isCurrentPage ? 6 : 4;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    _registerButton(dotX - 6, btnCenterY - 6, 12, 12, () => {
      if (modalPage !== p) {
        modalPage = p;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    });
  }
}

function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const isLandscape = canvas.width > 600 || state.viewOrientation === 'horizontal';
  const modalW = isLandscape ? Math.min(canvas.width - 28, 912) : Math.min(canvas.width - 20, 508);
  const modalH = isLandscape ? Math.min(canvas.height - 20, 508) : Math.min(canvas.height - 44, 896);
  const mx = Math.round((canvas.width - modalW) / 2);
  const my = Math.round((canvas.height - modalH) / 2);

  // Darken arena/menu behind modal
  ctx.fillStyle = 'rgba(20, 5, 10, 0.86)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Click outside closes modal
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    selectingSlot = null;
  });
  _registerButton(mx, my, modalW, modalH, () => {});

  const currentDefs = getActiveFighterDefs();
  const selectedDef = currentDefs[modalInspectIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const modalWeaponInfo = getFighterWeaponInfo(selectedDef);

  // 1. Warm Cream Checkered Paper Showcase Board (Reference 1 Backdrop)
  drawCollectorModalBackdrop(ctx, mx, my, modalW, modalH);

  // 2. Top-Left Golden Chevron Header Banner (Reference 1 Header)
  const pNumMatch = selectingSlot ? String(selectingSlot).match(/\d+/) : null;
  let slotLabel = 'PLAYER';
  if (selectingSlot) {
    if (String(selectingSlot).startsWith('slot_')) {
      const sNum = parseInt(String(selectingSlot).replace('slot_', ''), 10) + 1;
      slotLabel = `SLOT ${sNum}`;
    } else if (pNumMatch) {
      slotLabel = `PLAYER ${pNumMatch[0]}`;
    }
  }
  drawCollectorShowcaseHeader(ctx, mx, my, modalW, slotLabel, () => {
    selectingSlot = null;
  });

  const modalAvailableFighters = currentDefs
    .map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / MODAL_ITEMS_PER_PAGE));
  modalPage = Math.max(0, Math.min(totalPages - 1, modalPage));

  const startIdx = modalPage * MODAL_ITEMS_PER_PAGE;
  const pageFighters = modalAvailableFighters.slice(startIdx, startIdx + MODAL_ITEMS_PER_PAGE);

  if (isLandscape) {
    // ── LANDSCAPE (960x540): 6x2 Collector Card Grid + Top Pagination + Bottom Dossier & Lock-In ──
    _drawModalPaginationDock(ctx, mx + 410, my + 10, modalW - 456, 28, totalPages);

    const cols = 6;
    const cardW = 130;
    const cardH = 140;
    const gapX = Math.floor((modalW - 36 - cols * cardW) / (cols - 1));
    const rowStride = cardH + 21;
    const listX = mx + 18;
    const listY = my + 48;

    pageFighters.forEach(({ def, idx }, localPos) => {
      const col = localPos % cols;
      const row = Math.floor(localPos / cols);
      const cardX = listX + col * (cardW + gapX);
      const cardY = listY + row * rowStride;
      drawCollectorFighterCard(
        ctx,
        def,
        idx,
        cardX,
        cardY,
        cardW,
        cardH,
        idx === modalInspectIndex,
        () => _handleCollectorCardSelect(idx)
      );
    });

    // Bottom Dossier Bar + Action Buttons
    const bottomY = my + modalH - 96;
    const dossierW = modalW - 220;
    drawCompactFighterDossierBar(ctx, selectedDef, modalWeaponInfo, listX, bottomY, dossierW, 84);

    const btnCenterX = listX + dossierW + 14 + 84;
    drawButton('LOCK IN // 确认', btnCenterX, bottomY + 21, () => applyFighterSelection(), 168, 40, '#F5A623', 4);
    drawButton('CANCEL', btnCenterX, bottomY + 65, () => { selectingSlot = null; }, 168, 34, '#20242E', 4);
  } else {
    // ── PORTRAIT (540x960): Reference 1 3x4 Full-Width Collector Card Grid (12 Cards) ──
    const cols = 3;
    const cardW = 136;
    const cardH = 138;
    const listX = mx + 20;
    const availW = modalW - 40;
    const gapX = Math.floor((availW - cols * cardW) / (cols - 1));
    const rowStride = cardH + 21;
    const listY = my + 46;

    pageFighters.forEach(({ def, idx }, localPos) => {
      const col = localPos % cols;
      const row = Math.floor(localPos / cols);
      const cardX = listX + col * (cardW + gapX);
      const cardY = listY + row * rowStride;
      drawCollectorFighterCard(
        ctx,
        def,
        idx,
        cardX,
        cardY,
        cardW,
        cardH,
        idx === modalInspectIndex,
        () => _handleCollectorCardSelect(idx)
      );
    });

    // Pagination Dock
    const paginationY = listY + 4 * rowStride + 2;
    _drawModalPaginationDock(ctx, listX, paginationY, availW, 28, totalPages);

    // Compact Selected Fighter Dossier Bar (Stats, Ability, Live Weapon Stage)
    const dossierY = paginationY + 34;
    drawCompactFighterDossierBar(ctx, selectedDef, modalWeaponInfo, listX, dossierY, availW, 86);

    // Bottom Action Footer: CANCEL & LOCK IN
    const footerY = dossierY + 86 + 24;
    const btnW = Math.floor((availW - 16) / 2);
    drawButton('CANCEL', listX + btnW / 2, footerY, () => {
      selectingSlot = null;
    }, btnW, 36, '#20242E', 4);
    drawButton('LOCK IN // 确认', listX + availW - btnW / 2, footerY, () => {
      applyFighterSelection();
    }, btnW, 36, '#F5A623', 4);
  }
}

function drawSlantedParallelogram(ctx, x, y, w, h, slant = 10, fillStyle = null, strokeStyle = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && lineWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawSlantedStatBar(ctx, label, value, max, x, y, w, h, color, slant = 6) {
  const ratio = Math.min(1, Math.max(0, value / max));
  const barX = x + 30;
  const barW = Math.max(20, w - 66);
  const fillW = Math.max(4, Math.round(barW * ratio));

  // 1. Label
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + h / 2);

  // 2. Slanted track background
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(barX + slant, y);
  ctx.lineTo(barX + barW, y);
  ctx.lineTo(barX + barW - slant, y + h);
  ctx.lineTo(barX, y + h);
  ctx.closePath();
  ctx.fillStyle = '#0B0D14';
  ctx.fill();
  ctx.strokeStyle = '#222838';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.clip();

  // 3. Slanted active fill
  ctx.beginPath();
  ctx.moveTo(barX + slant, y);
  ctx.lineTo(barX + fillW + slant, y);
  ctx.lineTo(barX + fillW, y + h);
  ctx.lineTo(barX, y + h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // 4. Subtle top gloss line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(barX, y, fillW + slant, 1.5);
  ctx.restore();

  // 5. Value telemetry text on right
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 10px "Outfit", "Rajdhani", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${value}`, x + w, y + h / 2);
}

function drawDynamicVsClashEmblem(ctx, vsX, vsY, isLandscape) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  ctx.save();

  // 1. Horizontal dramatic lightning slash beam across the divide (Animated Electric Surge)
  const beamW = isLandscape ? 40 : 220;
  
  if (!isLandscape) {
    const beamPulse = 0.85 + Math.sin(now * 8.0) * 0.15;
    // Horizontal energy slash across the seam
    const grad = ctx.createLinearGradient(vsX - beamW, vsY, vsX + beamW, vsY);
    grad.addColorStop(0, 'rgba(245, 166, 35, 0)');
    grad.addColorStop(0.3, `rgba(245, 166, 35, ${(0.45 * beamPulse).toFixed(3)})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${(0.95 * beamPulse).toFixed(3)})`);
    grad.addColorStop(0.7, `rgba(245, 166, 35, ${(0.45 * beamPulse).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(245, 166, 35, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(vsX - beamW, vsY - 2, beamW * 2, 4);

    // Dynamic jagged lightning ticks (Electric Crackle)
    const tickJitter = Math.sin(now * 25) * 2.0;
    ctx.strokeStyle = Math.sin(now * 16) > 0.0 ? '#FFD043' : '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(vsX - 90, vsY - 1);
    ctx.lineTo(vsX - 45, vsY - 6 + tickJitter);
    ctx.lineTo(vsX - 35, vsY + 5 - tickJitter);
    ctx.lineTo(vsX - 18, vsY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(vsX + 18, vsY);
    ctx.lineTo(vsX + 35, vsY - 5 - tickJitter);
    ctx.lineTo(vsX + 45, vsY + 6 + tickJitter);
    ctx.lineTo(vsX + 90, vsY - 1);
    ctx.stroke();
  }

  // 2. Heavy 3D comic ink drop shadow for central crest (Dynamic Floating Pulse)
  const shieldScale = 1.0 + Math.sin(now * 3.6) * 0.04;
  const shieldJitter = Math.sin(now * 35) * 0.4;

  ctx.fillStyle = '#06070A';
  ctx.beginPath();
  ctx.ellipse(vsX + 2, vsY + 3.5, 25 * shieldScale, 21 * shieldScale, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // 3. Outer Diamond / Hexagonal Shield Base
  const crestW = 46 * shieldScale;
  const crestH = 34 * shieldScale;
  ctx.save();
  ctx.translate(vsX + shieldJitter, vsY);
  ctx.rotate(-0.06);

  ctx.beginPath();
  ctx.moveTo(0, -crestH / 2);
  ctx.lineTo(crestW / 2, -crestH / 4);
  ctx.lineTo(crestW / 2, crestH / 4);
  ctx.lineTo(0, crestH / 2);
  ctx.lineTo(-crestW / 2, crestH / 4);
  ctx.lineTo(-crestW / 2, -crestH / 4);
  ctx.closePath();
  ctx.fillStyle = '#11131C';
  ctx.fill();
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Inner metallic rim
  ctx.beginPath();
  ctx.moveTo(0, -crestH / 2 + 3);
  ctx.lineTo(crestW / 2 - 3, -crestH / 4 + 1.5);
  ctx.lineTo(crestW / 2 - 3, crestH / 4 - 1.5);
  ctx.lineTo(0, crestH / 2 - 3);
  ctx.lineTo(-crestW / 2 + 3, crestH / 4 - 1.5);
  ctx.lineTo(-crestW / 2 + 3, -crestH / 4 + 1.5);
  ctx.closePath();
  ctx.strokeStyle = '#FFE169';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Stylized 3D Dual-Tone VS Typography (Animated Glow)
  ctx.font = '900 16px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ink drop shadow
  ctx.fillStyle = '#05070B';
  ctx.fillText('VS', 1.5, 2);

  // Gradient / Dual text fill
  ctx.fillStyle = Math.sin(now * 12) > 0.6 ? '#FFE145' : '#FFFFFF';
  ctx.fillText('VS', 0, 0.5);

  ctx.restore();
  ctx.restore();
}

function drawTacticalVsCrest(ctx, vsX, vsY) {
  drawDynamicVsClashEmblem(ctx, vsX, vsY, true);
}

function _drawComicHalftoneField(ctx, x0, y0, w, h, dotColor) {
  ctx.save();
  ctx.fillStyle = dotColor;
  const step = 11;
  for (let gy = y0; gy < y0 + h; gy += step) {
    const rowShift = (Math.floor((gy - y0) / step) % 2) * (step * 0.5);
    for (let gx = x0 + rowShift; gx < x0 + w; gx += step) {
      const distFactor = Math.max(0.28, 1 - (gx - x0) / (w * 1.15));
      const r = 1.2 + distFactor * 2.6;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function _drawComicStar5(ctx, cx, cy, outerR, innerR, fillStyle) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function _drawSpikyMangaExplosion(ctx, cx, cy, rx, ry, burstColor = '#DC2626', rot = 0, pulseScale = 1.0) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rot !== 0) ctx.rotate(rot);
  if (pulseScale !== 1.0) ctx.scale(pulseScale, pulseScale);
  const drawBurstLayer = (scaleX, scaleY, fill, stroke, lw) => {
    const pts = [
      [0.0, -1.05], [0.22, -0.52], [0.55, -0.95], [0.48, -0.38],
      [0.98, -0.58], [0.66, -0.08], [1.08, 0.18], [0.58, 0.34],
      [0.82, 0.78], [0.32, 0.52], [0.12, 0.96], [-0.14, 0.50],
      [-0.52, 0.88], [-0.46, 0.32], [-1.02, 0.38], [-0.62, -0.05],
      [-1.06, -0.48], [-0.48, -0.44], [-0.64, -0.96], [-0.18, -0.54],
    ];
    ctx.beginPath();
    pts.forEach(([px, py], idx) => {
      const vx = px * scaleX;
      const vy = py * scaleY;
      if (idx === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  };

  drawBurstLayer(rx, ry, burstColor, '#050609', 3.2);
  drawBurstLayer(rx * 0.64, ry * 0.64, '#FFFFFF', '#050609', 2.4);
  ctx.restore();
}

function _drawComicBannerBackdrop(ctx, def, palette, isMirrored = false) {
  const mx = (px) => isMirrored ? (508 - px) : px;

  // 1. Deep Comic Slate Base
  ctx.fillStyle = '#14151D';
  ctx.fillRect(0, 0, 508, 280);

  // 2. Golden-Amber Halftone Comic Wedge (Top-Left on P1, Top-Right on P2)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(0), 0);
  ctx.lineTo(mx(312), 0);
  ctx.lineTo(mx(216), 280);
  ctx.lineTo(mx(156), 280);
  ctx.lineTo(mx(0), 122);
  ctx.closePath();
  const goldGrad = ctx.createLinearGradient(mx(0), 0, mx(260), 240);
  goldGrad.addColorStop(0, '#FBBF24');
  goldGrad.addColorStop(1, '#EA8C0C');
  ctx.fillStyle = goldGrad;
  ctx.fill();
  ctx.clip();
  _drawComicHalftoneField(ctx, isMirrored ? 190 : -10, -10, 330, 290, 'rgba(204, 78, 8, 0.40)');
  ctx.restore();

  // 3. Dark Corner with Diagonal Slash & Giant Tilted Watermark
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(0), 122);
  ctx.lineTo(mx(164), 280);
  ctx.lineTo(mx(0), 280);
  ctx.closePath();
  ctx.fillStyle = '#13151E';
  ctx.fill();
  ctx.clip();

  ctx.translate(mx(56), 226);
  ctx.rotate(isMirrored ? 0.38 : -0.38);
  ctx.fillStyle = '#1E212E';
  ctx.font = '900 54px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.substring(0, 4).toUpperCase(), 0, 0);
  ctx.restore();

  // Heavy Black Diagonal Divider Slash
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(mx(-4), 120);
  ctx.lineTo(mx(168), 284);
  ctx.stroke();
}

function _drawComicCutInStage(ctx, def, fighterIndex, weaponInfo, isP1, palette, isMirrored = false) {
  const stickerImg = getFighterStickerPreview(fighterIndex) || getFighterPreview(fighterIndex);
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  const phase = isP1 ? 0.0 : 1.7;
  const mx = (px) => isMirrored ? (508 - px) : px;

  // 1. Outer Tilted Cut-In Trapezoid Drop Shadow
  const traceCutInTrap = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(mx(226) + ox, 8 + oy);
    ctx.lineTo(mx(486) + ox, 20 + oy);
    ctx.lineTo(mx(498) + ox, 268 + oy);
    ctx.lineTo(mx(202) + ox, 272 + oy);
    ctx.closePath();
  };

  traceCutInTrap(isMirrored ? -6 : 6, 6);
  ctx.fillStyle = '#050609';
  ctx.fill();

  // 2. Clipped Interior of Character Cut-In Stage Background
  ctx.save();
  traceCutInTrap(0, 0);
  ctx.fillStyle = '#1A1115';
  ctx.fill();
  ctx.clip();

  // Dramatic dark character-tinted backdrop gradient
  const stageGrad = ctx.createLinearGradient(mx(210), 10, mx(495), 270);
  stageGrad.addColorStop(0, palette.dark);
  stageGrad.addColorStop(0.65, '#160E13');
  stageGrad.addColorStop(1, '#0D090D');
  ctx.fillStyle = stageGrad;
  ctx.fillRect(isMirrored ? 0 : 195, 0, 315, 280);

  // Golden-Yellow Halftone Triangle Wedge inside Cut-In
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(388), 12);
  ctx.lineTo(mx(504), 16);
  ctx.lineTo(mx(504), 224);
  ctx.lineTo(mx(348), 168);
  ctx.closePath();
  ctx.fillStyle = '#FBBF24';
  ctx.fill();
  ctx.clip();
  _drawComicHalftoneField(ctx, isMirrored ? 0 : 345, 10, 165, 220, 'rgba(208, 82, 10, 0.42)');
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(mx(388), 12);
  ctx.lineTo(mx(348), 168);
  ctx.lineTo(mx(504), 224);
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Rule 16 Manga Speed-Line Needles behind character (Dynamic Hypersonic Surging)
  const avatarCX = mx(328);
  const avatarCY = 118;
  ctx.save();
  for (let i = -5; i <= 5; i++) {
    const ang = (isMirrored ? Math.PI : 0) + i * 0.24 * (isMirrored ? -1 : 1);
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const needlePhase = now * 7.5 + i * 1.6 + phase;
    const pulse = Math.sin(needlePhase);
    const lengthMod = 165 + pulse * 32;
    const startDist = 24 + Math.sin(now * 9.0 + i * 2.2) * 5;
    const lineAlpha = Math.max(0.04, 0.12 + pulse * 0.07);
    ctx.fillStyle = `rgba(255, 255, 255, ${lineAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(avatarCX + nx * startDist, avatarCY + ny * startDist);
    ctx.lineTo(avatarCX + nx * (lengthMod - 18) - ny * 4, avatarCY + ny * (lengthMod - 18) + nx * 4);
    ctx.lineTo(avatarCX + nx * lengthMod, avatarCY + ny * lengthMod);
    ctx.lineTo(avatarCX + nx * (lengthMod - 18) + ny * 4, avatarCY + ny * (lengthMod - 18) - nx * 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Stylized Comic Fire / Energy Aura at bottom of character cut-in (Dynamic 3-Tier Undulating Flame Wave)
  const flameTime = now * 4.6 + phase;
  const drawFlamePoly = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#050609';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  drawFlamePoly([
    [mx(245), 265],
    [mx(268), 196 + Math.sin(flameTime * 1.1 + 0.3) * 8],
    [mx(295), 222 + Math.sin(flameTime * 0.9 + 1.2) * 6],
    [mx(326), 174 + Math.sin(flameTime * 1.3 + 2.1) * 11],
    [mx(352), 212 + Math.sin(flameTime * 1.0 + 3.2) * 7],
    [mx(388), 168 + Math.sin(flameTime * 1.4 + 4.1) * 12],
    [mx(408), 210 + Math.sin(flameTime * 1.1 + 5.0) * 8],
    [mx(442), 184 + Math.sin(flameTime * 1.2 + 5.9) * 9],
    [mx(456), 265]
  ], palette.primary);
  drawFlamePoly([
    [mx(268), 265],
    [mx(286), 214 + Math.sin(flameTime * 1.2 + 1.1) * 7],
    [mx(312), 232 + Math.sin(flameTime * 1.0 + 2.2) * 6],
    [mx(338), 194 + Math.sin(flameTime * 1.4 + 3.4) * 9],
    [mx(362), 224 + Math.sin(flameTime * 1.1 + 4.5) * 6],
    [mx(392), 192 + Math.sin(flameTime * 1.3 + 5.3) * 10],
    [mx(418), 265]
  ], palette.border || '#FFE145');
  drawFlamePoly([
    [mx(295), 265],
    [mx(316), 226 + Math.sin(flameTime * 1.3 + 2.1) * 6],
    [mx(342), 208 + Math.sin(flameTime * 1.5 + 3.6) * 8],
    [mx(365), 234 + Math.sin(flameTime * 1.2 + 4.9) * 5],
    [mx(386), 212 + Math.sin(flameTime * 1.4 + 6.1) * 7],
    [mx(400), 265]
  ], '#FFFFFF');

  ctx.restore(); // End cut-in interior clip

  // 3. Cut-In Trapezoid Comic Frame Borders (Themed to character)
  traceCutInTrap(0, 0);
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 6.5;
  ctx.stroke();
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 3.6;
  ctx.stroke();

  // 4. Spiky Red & White Explosion Burst behind top-left of character head (Dynamic Pulsing & Rotation)
  const burstRot = Math.sin(now * 1.6 + phase) * 0.04;
  const burstScale = 1.0 + Math.sin(now * 4.4 + phase) * 0.055;
  _drawSpikyMangaExplosion(ctx, mx(296), 52, 64, 38, palette.primary, isMirrored ? -burstRot : burstRot, burstScale);

  // 5. UNCLIPPED POPPED-OUT HEROIC FIGHTER + FULL WEAPONS (ANIMATED BREATHING & COMBAT FLOAT)
  if (stickerImg) {
    const srcW = stickerImg.width || 256;
    const srcH = stickerImg.height || 256;
    const destSize = 296;

    // Organic breathing, float bob, idle sway & engine rev jitter
    const charBobY = Math.sin(now * 2.8 + phase) * 4.2;
    const charSwayX = (isMirrored ? -1 : 1) * Math.cos(now * 1.4 + phase) * 1.8;
    const charRot = (isMirrored ? -1 : 1) * Math.sin(now * 1.4 + phase) * 0.016;
    const charBreathScaleY = 1.0 + Math.sin(now * 2.8 + phase) * 0.018;
    const charBreathScaleX = (isMirrored ? -1.0 : 1.0) * (1.0 - Math.sin(now * 2.8 + phase) * 0.008);
    const revJitter = (Math.sin(now * 40 + phase) * 0.65);

    // Dynamic ground shadow under the fighter's feet (expands/contracts with breathing cycle)
    ctx.save();
    const shadowW = (destSize * 0.32) + Math.sin(now * 2.8 + phase) * 6;
    const shadowH = 13 + Math.sin(now * 2.8 + phase) * 2;
    const shadowY = avatarCY + 84 + charBobY * 0.25;
    ctx.beginPath();
    ctx.ellipse(avatarCX + charSwayX * 0.5, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 6, 9, 0.40)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(avatarCX + charSwayX, avatarCY + charBobY + revJitter);
    ctx.rotate(charRot);
    ctx.scale(charBreathScaleX, charBreathScaleY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      stickerImg,
      0, 0, srcW, srcH,
      -destSize / 2, -destSize / 2, destSize, destSize
    );
    ctx.restore();
  }

  // 6. Top Role Blocks & Chunky Yellow Lightning Arrow (Dynamic Sway & Jitter)
  ctx.save();
  const blockTilt = (isMirrored ? -1 : 1) * (0.20 + Math.sin(now * 1.6 + phase) * 0.012);
  const blockSwayY = Math.sin(now * 2.2 + phase) * 1.5;
  ctx.translate(mx(416), 14 + blockSwayY);
  ctx.rotate(blockTilt);
  const blocks = isMirrored ? [
    { txt: isP1 ? 'P1' : 'P2', bg: '#090A0F', fg: '#FFFFFF' },
    { txt: isP1 ? 'RED' : 'BLU', bg: palette.primary, fg: '#FFFFFF' },
    { txt: '▶', bg: '#090A0F', fg: '#FFFFFF' },
    { txt: '◀', bg: '#090A0F', fg: '#FFFFFF' },
  ] : [
    { txt: isP1 ? 'P1' : 'P2', bg: '#090A0F', fg: '#FFFFFF' },
    { txt: isP1 ? 'RED' : 'BLU', bg: palette.primary, fg: '#FFFFFF' },
    { txt: '◀', bg: '#090A0F', fg: '#FFFFFF' },
    { txt: '▶', bg: '#090A0F', fg: '#FFFFFF' },
  ];
  blocks.forEach((b, idx) => {
    const bx = isMirrored ? (44 - (idx + 1) * 24) : (-44 + idx * 24);
    const by = -11;
    ctx.fillStyle = '#050609';
    ctx.fillRect(bx + 2, by + 2, 22, 22);
    ctx.fillStyle = b.bg;
    ctx.fillRect(bx, by, 22, 22);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(bx, by, 22, 22);
    ctx.fillStyle = b.fg;
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.txt, bx + 11, by + 11.5);
  });
  ctx.restore();

  // Chunky Yellow Comic Lightning Arrow at Top Corner (Electric Micro-Jitter)
  ctx.save();
  const arrowJitterX = (isMirrored ? -1 : 1) * Math.sin(now * 26 + phase) * 1.2;
  const arrowJitterY = Math.cos(now * 30 + phase) * 1.0;
  const arrowScale = 1.0 + Math.sin(now * 6.0 + phase) * 0.04;
  ctx.translate(mx(484) + arrowJitterX, 14 + arrowJitterY);
  ctx.scale((isMirrored ? -1 : 1) * arrowScale, arrowScale);
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(4, -12);
  ctx.lineTo(-2, -2);
  ctx.lineTo(14, -2);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-2, 2);
  ctx.lineTo(-14, 2);
  ctx.closePath();
  ctx.fillStyle = '#FFE145';
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.restore();

  // 7. Bottom Tilted Black & Accent Slash Button ("SELECT CHARACTER" with Animated Light Sheen & Floating Arrow)
  const btnFloatY = Math.sin(now * 2.4 + phase) * 1.8;
  const btnTilt = (isMirrored ? 1 : -1) * (0.085 + Math.sin(now * 1.4 + phase) * 0.008);

  ctx.save();
  // Drop Shadow
  ctx.beginPath();
  ctx.moveTo(mx(214) + (isMirrored ? -5 : 5), 234 + 6 + btnFloatY);
  ctx.lineTo(mx(496) + (isMirrored ? -5 : 5), 206 + 6 + btnFloatY);
  ctx.lineTo(mx(503) + (isMirrored ? -5 : 5), 266 + 6 + btnFloatY);
  ctx.lineTo(mx(222) + (isMirrored ? -5 : 5), 280 + 6 + btnFloatY);
  ctx.closePath();
  ctx.fillStyle = '#050609';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(mx(214), 234 + btnFloatY);
  ctx.lineTo(mx(496), 206 + btnFloatY);
  ctx.lineTo(mx(503), 266 + btnFloatY);
  ctx.lineTo(mx(222), 280 + btnFloatY);
  ctx.closePath();
  ctx.fillStyle = '#07080C';
  ctx.fill();
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.clip();

  _drawComicHalftoneField(ctx, isMirrored ? 200 : 214, 220 + btnFloatY, 85, 60, palette.primary);

  // Dynamic diagonal light sheen sweep traveling across the button
  const sheenProgress = ((now * 0.65 + (isP1 ? 0 : 0.5)) % 1.0);
  const sheenBaseX = isMirrored ? (320 - sheenProgress * 320) : (190 + sheenProgress * 320);
  const sheenGrad = ctx.createLinearGradient(sheenBaseX - 35, 200, sheenBaseX + 35, 290);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(isMirrored ? 0 : 180, 190, 340, 100);

  ctx.translate(mx(362), 245 + btnFloatY);
  ctx.rotate(btnTilt);
  const arrowSlide = Math.sin(now * 5.5 + phase) * 3.5;
  const bannerLabel = 'SELECT CHARACTER';
  ctx.font = '900 18.5px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4.5;
  ctx.strokeText(bannerLabel, isMirrored ? 8 : -8, 0);
  ctx.fillStyle = palette.primary;
  ctx.fillText(bannerLabel, isMirrored ? 8 : -8, 0);

  // Animated sliding chevron arrow
  ctx.save();
  ctx.translate(isMirrored ? (-92 - arrowSlide) : (92 + arrowSlide), 0);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4.5;
  const chevron = isMirrored ? '⯇' : '⯈';
  ctx.strokeText(chevron, 0, 0);
  ctx.fillStyle = '#FFE145';
  ctx.fillText(chevron, 0, 0);
  ctx.restore();

  ctx.restore();
}

function _drawComicSteppedInfoStack(ctx, def, fighterIndex, isP1, palette, isMirrored = false) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  const phase = isP1 ? 0.0 : 1.7;
  const mx = (px) => isMirrored ? (508 - px) : px;

  // ── PLATE 1: Top Z-Stepped Name & Level Polygon (Popped out over top frame with Floating Parallax) ──
  const p1FloatY = Math.sin(now * 2.4 + phase + 0.0) * 2.2;
  const p1FloatX = (isMirrored ? -1 : 1) * Math.cos(now * 1.2 + phase + 0.0) * 1.0;
  ctx.save();
  ctx.translate(p1FloatX, p1FloatY);

  const plateOy = -15;
  const traceRedPlate = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(mx(44) + ox, 5 + oy + plateOy);
    ctx.lineTo(mx(252) + ox, 34 + oy + plateOy);
    ctx.lineTo(mx(247) + ox, 66 + oy + plateOy);
    ctx.lineTo(mx(274) + ox, 70 + oy + plateOy);
    ctx.lineTo(mx(268) + ox, 104 + oy + plateOy);
    ctx.lineTo(mx(80) + ox, 82 + oy + plateOy);
    ctx.lineTo(mx(84) + ox, 56 + oy + plateOy);
    ctx.lineTo(mx(52) + ox, 51 + oy + plateOy);
    ctx.closePath();
  };

  // Heavy Black Ink Drop Shadow & Character-Themed Outer Rim
  traceRedPlate(isMirrored ? -5 : 5, 5);
  ctx.fillStyle = '#050609';
  ctx.fill();

  traceRedPlate(0, 0);
  const plateGrad = ctx.createLinearGradient(mx(44), 5 + plateOy, mx(268), 104 + plateOy);
  plateGrad.addColorStop(0, palette.dark);
  plateGrad.addColorStop(0.55, palette.primary);
  plateGrad.addColorStop(1, palette.border || palette.primary);
  ctx.fillStyle = plateGrad;
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Upper Row Content (Circular Emblem + Bold Fighter Name tilted with plate)
  ctx.save();
  ctx.translate(mx(68), 30 + plateOy);
  ctx.rotate(isMirrored ? -0.138 : 0.138);

  // Circular Comic Emblem (Themed ring)
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#08090D';
  ctx.fill();
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 9px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isP1 ? 'P1' : 'P2', 0, 0.5);

  // Bold Comic Fighter Name
  ctx.font = '900 22px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = isMirrored ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  const nameText = fitSingleLineText(ctx, def.name.toUpperCase(), 158);
  const nameX = isMirrored ? -18 : 18;
  const shadowX = isMirrored ? -19.5 : 19.5;
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 5.5;
  ctx.strokeText(nameText, nameX, 1);
  ctx.fillStyle = '#FFE145';
  ctx.fillText(nameText, shadowX, 2.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameText, nameX, 1);
  ctx.restore();

  // Lower Stepped Sub-Bar (Sub-gauge + LV Text + Animated Gloss Sheen)
  ctx.save();
  ctx.translate(mx(92), 66 + plateOy);
  ctx.rotate(isMirrored ? -0.118 : 0.118);
  ctx.fillStyle = '#050609';
  ctx.fillRect(isMirrored ? -112 : -2, -7, 114, 15);
  ctx.fillStyle = isP1 ? '#38BDF8' : '#FFE145';
  ctx.fillRect(isMirrored ? -109 : 1, -4, 108, 9);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(isMirrored ? -109 : 1, -4, 108, 3);

  // Sliding gloss sheen glint on the gauge bar
  const sheenCycle = ((now * 0.9 + phase * 0.3) % 1.0);
  const sheenGX = isMirrored ? (16 - sheenCycle * 135) : (-10 + sheenCycle * 135);
  ctx.save();
  ctx.beginPath();
  ctx.rect(isMirrored ? -109 : 1, -4, 108, 9);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.fillRect(sheenGX, -4, 18, 9);
  ctx.restore();

  const lvNum = Math.min(99, Math.max(50, Math.round((def.hp || 100) * 0.48 + (def.damage || 15))));
  ctx.font = '900 13px "Outfit", "Impact", sans-serif';
  ctx.textAlign = isMirrored ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  const lvX = isMirrored ? -118 : 118;
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4;
  ctx.strokeText(`LV.${lvNum}`, lvX, 1);
  ctx.fillStyle = '#FFE145';
  ctx.fillText(`LV.${lvNum}`, lvX, 1);

  // Grade Badge next to LV on Plate 1
  const gradeBadgeX = isMirrored ? (lvX - 58) : (lvX + 44);
  drawGradeBadge(ctx, gradeBadgeX, -8, def.grade, { scale: 0.88 });

  ctx.restore();

  ctx.restore(); // End Plate 1

  // ── PLATE 2: Middle White-Outlined Black Polygon (Popped out past frame with Floating Parallax) ──
  const p2FloatY = Math.sin(now * 2.4 + phase + 1.2) * 2.8;
  const p2FloatX = (isMirrored ? -1 : 1) * Math.cos(now * 1.2 + phase + 0.8) * 1.4;
  ctx.save();
  ctx.translate(p2FloatX, p2FloatY);

  const traceMidPlate = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(mx(16) + ox, 82 + oy);
    ctx.lineTo(mx(76) + ox, 78 + oy);
    ctx.lineTo(mx(80) + ox, 92 + oy);
    ctx.lineTo(mx(238) + ox, 98 + oy);
    ctx.lineTo(mx(214) + ox, 176 + oy);
    ctx.lineTo(mx(60) + ox, 184 + oy);
    ctx.lineTo(mx(58) + ox, 168 + oy);
    ctx.lineTo(mx(22) + ox, 170 + oy);
    ctx.lineTo(mx(-4) + ox, 112 + oy);
    ctx.lineTo(mx(18) + ox, 108 + oy);
    ctx.closePath();
  };

  traceMidPlate(isMirrored ? -5 : 5, 5);
  ctx.fillStyle = '#050609';
  ctx.fill();

  traceMidPlate(0, 0);
  ctx.fillStyle = '#090A0F';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Giant 3D Slanted 'S' / 'A' Emblem on Wing (Rhythmic Rank Breathing)
  const sScale = 1.0 + Math.sin(now * 3.2 + phase) * 0.035;
  ctx.save();
  ctx.translate(mx(38), 130);
  ctx.rotate(isMirrored ? 0.22 : -0.22);
  ctx.scale(sScale, sScale);
  ctx.font = '900 54px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rankLetter = (def.hp >= 100 || def.damage >= 15) ? 'S' : 'A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 9;
  ctx.strokeText(rankLetter, isMirrored ? 2 : -2, 2);
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5;
  ctx.strokeText(rankLetter, 0, 0);
  ctx.fillStyle = '#FFE145';
  ctx.fillText(rankLetter, 0, 0);
  ctx.restore();

  // 'RANK' Label + Technical VX Code + Bold Class Title (De-duplicated)
  ctx.save();
  ctx.translate(mx(80), 146);
  ctx.rotate(isMirrored ? 0.06 : -0.06);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 8.5px "Outfit", sans-serif';
  ctx.textAlign = isMirrored ? 'right' : 'left';
  ctx.fillText('RANK', isMirrored ? 12 : -12, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(mx(94), 126);
  ctx.rotate(isMirrored ? 0.04 : -0.04);
  ctx.fillStyle = palette.primary;
  ctx.font = '900 17px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = isMirrored ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, (def.type || 'BRAWLER').toUpperCase(), 92), 0, 0);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '800 8px "Outfit", monospace';
  ctx.textAlign = isMirrored ? 'left' : 'right';
  ctx.fillText(`VX:${String(fighterIndex + 1).padStart(2, '0')}-${isP1 ? 'A' : 'B'}`, isMirrored ? -134 : 134, -14);
  ctx.restore();

  // Row of 10 Comic 5-Pointed Stars (with 2 oversized accent stars, 1:1 Reference + Animated Twinkle)
  const activeStars = Math.min(10, Math.max(7, Math.round((def.hp || 100) / 35 + (def.damage || 15) / 5)));
  for (let s = 0; s < 10; s++) {
    const isBigStar = s >= 7 && s < activeStars;
    const baseSx = 70 + s * 12.8 + (s >= 8 ? (s - 7) * 2.5 : 0);
    const starX = mx(baseSx);
    const starY = 165 - s * 0.7;
    const starShimmer = Math.sin(now * 5.0 + s * 0.75 + phase);
    const starScale = isBigStar ? (1.0 + starShimmer * 0.08) : 1.0;
    const outerR = (isBigStar ? 7.8 : 5.2) * starScale;
    const innerR = outerR * 0.44;
    _drawComicStar5(ctx, starX, starY, outerR, innerR, s < activeStars ? (starShimmer > 0.65 ? '#FFFFFF' : '#FFE145') : '#333846');
  }

  ctx.restore(); // End Plate 2

  // ── PLATE 3: Bottom 2-Step Staircase White-Outlined Black Polygon (HP & ATK Bars with Floating Parallax) ──
  const p3FloatY = Math.sin(now * 2.4 + phase + 2.4) * 2.0;
  const p3FloatX = (isMirrored ? -1 : 1) * Math.cos(now * 1.2 + phase + 1.6) * 1.0;
  ctx.save();
  ctx.translate(p3FloatX, p3FloatY);

  // Golden-Yellow Accent Triangle underneath bottom corner
  ctx.beginPath();
  ctx.moveTo(mx(152), 254);
  ctx.lineTo(mx(222), 246);
  ctx.lineTo(mx(210), 276);
  ctx.closePath();
  ctx.fillStyle = '#F5A623';
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3;
  ctx.stroke();

  const traceBotPlate = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(mx(44) + ox, 190 + oy);
    ctx.lineTo(mx(230) + ox, 178 + oy);
    ctx.lineTo(mx(238) + ox, 246 + oy);
    ctx.lineTo(mx(70) + ox, 262 + oy);
    ctx.lineTo(mx(64) + ox, 226 + oy);
    ctx.lineTo(mx(52) + ox, 227 + oy);
    ctx.closePath();
  };

  traceBotPlate(isMirrored ? -5 : 5, 5);
  ctx.fillStyle = '#050609';
  ctx.fill();

  traceBotPlate(0, 0);
  ctx.fillStyle = '#090A0F';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // 2 Tilted Stat Rows inside Staircase Polygon (Number | Colored Bar | Label)
  const drawSteppedStatRow = (cx, cy, numVal, pct, barColor, labelTxt) => {
    ctx.save();
    ctx.translate(mx(cx), cy);
    ctx.rotate(isMirrored ? 0.075 : -0.075);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = isMirrored ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${numVal}`, 0, 0);

    // Slanted Bar Track
    const bx = 34;
    const bw = 82;
    const bh = 7.5;
    ctx.beginPath();
    if (isMirrored) {
      ctx.moveTo(-bx - 4, -bh / 2);
      ctx.lineTo(-bx - bw - 4, -bh / 2);
      ctx.lineTo(-bx - bw, bh / 2);
      ctx.lineTo(-bx, bh / 2);
    } else {
      ctx.moveTo(bx + 4, -bh / 2);
      ctx.lineTo(bx + bw + 4, -bh / 2);
      ctx.lineTo(bx + bw, bh / 2);
      ctx.lineTo(bx, bh / 2);
    }
    ctx.closePath();
    ctx.fillStyle = '#252A3A';
    ctx.fill();

    // Slanted Active Fill
    const fw = Math.max(8, Math.min(bw, bw * pct));
    ctx.beginPath();
    if (isMirrored) {
      ctx.moveTo(-bx - 4, -bh / 2);
      ctx.lineTo(-bx - fw - 4, -bh / 2);
      ctx.lineTo(-bx - fw, bh / 2);
      ctx.lineTo(-bx, bh / 2);
    } else {
      ctx.moveTo(bx + 4, -bh / 2);
      ctx.lineTo(bx + fw + 4, -bh / 2);
      ctx.lineTo(bx + fw, bh / 2);
      ctx.lineTo(bx, bh / 2);
    }
    ctx.closePath();
    ctx.fillStyle = barColor;
    ctx.fill();

    // Stat Label on Inner Edge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = isMirrored ? 'left' : 'right';
    ctx.fillText(labelTxt, isMirrored ? -158 : 158, 0);
    ctx.restore();
  };

  const hpPulse = 1.0 + Math.sin(now * 3.6 + phase) * 0.02;
  const atkPulse = 1.0 + Math.sin(now * 3.6 + phase + 1.0) * 0.02;
  drawSteppedStatRow(60, 208, def.hp, Math.min(1, ((def.hp || 100) / 250) * hpPulse), '#EF4444', 'HP');
  drawSteppedStatRow(74, 239, def.damage, Math.min(1, ((def.damage || 15) / 45) * atkPulse), '#38BDF8', 'ATK');

  ctx.restore(); // End Plate 3
}

function drawHeroicFighterCard(slotProp, title, x, y, w, h, isP1, enabled) {
  const { ctx } = state;
  const isAnyModalOpen = (selectingSlot !== null || isArenaBgmModalOpen() || isArenaFloorModalOpen());
  const isInteractive = enabled && !isAnyModalOpen;
  const isMirrored = !isP1;

  if (isInteractive) {
    _playerCardBounds.push({ slotProp, x, y, w, h });
  }

  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const weaponInfo = getFighterWeaponInfo(def);

  // Derive rich character-specific theme palette
  const theme = getFighterCollectorTheme(def) || {};
  const themeColor = def.themeColor || def.color || theme.primary || (isP1 ? '#EF4444' : '#38BDF8');
  const palette = {
    primary: themeColor,
    dark: theme.dark || '#1A1115',
    title: theme.title || themeColor,
    border: theme.border || themeColor,
  };

  const cycleFighter = (direction) => {
    if (!isInteractive) return;
    const availableFighters = currentDefs.map((d, idx) => ({ d, idx }))
      .filter(({ d }) => !(!state.dummyEnabled && d.type === 'dummy'));
    const pos = availableFighters.findIndex(f => f.idx === state[slotProp]);
    const count = availableFighters.length;
    if (count > 0) {
      const nextPos = (pos + direction + count) % count;
      state[slotProp] = availableFighters[nextPos].idx;
      if (slotProp === 'p1Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[0] = state.p1Index;
      else if (slotProp === 'p2Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[1] = state.p2Index;
      else if (slotProp === 'p3Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[2] = state.p3Index;
      else if (slotProp === 'p4Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[3] = state.p4Index;
      else if (slotProp === 'p5Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[4] = state.p5Index;
      else if (slotProp === 'p6Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[5] = state.p6Index;
      saveFighterSelections();
      preloadFighterAssets(state[slotProp]);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  };

  const sx = w / 508;
  const sy = h / 280;

  // Register interactive hit zones (expanded to cover popped-out top and left/right areas)
  if (isInteractive) {
    const prevBtnX = x + Math.round((isMirrored ? 38 : 416) * sx);
    const prevBtnY = y + Math.round(2 * sy);
    const nextBtnX = x + Math.round((isMirrored ? 62 : 444) * sx);
    const btnW = Math.round(36 * sx);
    const btnH = Math.round(36 * sy);

    _registerButton(x - Math.round(25 * sx), y - Math.round(35 * sy), w + Math.round(50 * sx), h + Math.round(42 * sy), () => {
      openFighterSelectModal(slotProp, state[slotProp] ?? 0);
    });
    _registerButton(prevBtnX, prevBtnY, btnW, btnH, () => cycleFighter(-1));
    _registerButton(nextBtnX, prevBtnY, btnW, btnH, () => cycleFighter(1));
  }

  // Subtle Slot Index Tag ('A' / 'B') above top corner of banner (1:1 Reference)
  ctx.save();
  ctx.fillStyle = '#7DD3FC';
  ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = isMirrored ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(isP1 ? 'A' : 'B', isMirrored ? (x + 8) : (x + w - 6), y - 5);
  ctx.restore();

  // Outer Drop Shadow for base card frame
  ctx.save();
  ctx.fillStyle = 'rgba(4, 5, 8, 0.75)';
  ctx.fillRect(x + 5, y + 6, w, h);
  ctx.restore();

  // Render Reference 5 Comic Banner in normalized 508x280 coordinate space
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);

  // 1. Base card backdrop (Clipped to the card frame so halftone and watermarks stay inside)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 508, 280);
  ctx.clip();
  _drawComicBannerBackdrop(ctx, def, palette, isMirrored);
  ctx.restore();

  // 2. Solid Black Manga Ink Outer Frame
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(0, 0, 508, 280);

  // 3. Popped-out elements drawn on top WITHOUT card-level clipping:
  //    - Heroic Fighter Avatar (Pops out above top border y = -29!)
  //    - Stepped Info Stack (Name plate pops out at top y = -10, Rank plate pops out at left/right)
  _drawComicCutInStage(ctx, def, fighterIndex, weaponInfo, isP1, palette, isMirrored);
  _drawComicSteppedInfoStack(ctx, def, fighterIndex, isP1, palette, isMirrored);

  ctx.restore();
}

function drawSelectScreen() {
  const { ctx, canvas, mode } = state;
  _clearButtons();
  _playerCardBounds = [];
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clean Dark Matte Backdrop (Matching Reference 5 outer canvas)
  ctx.fillStyle = '#181A22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle Dot Grid
  ctx.fillStyle = 'rgba(245, 166, 35, 0.035)';
  const dotStep = 18;
  for (let y = 8; y < canvas.height; y += dotStep) {
    for (let x = 8; x < canvas.width; x += dotStep) {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // Outer Screen Tech Corner Brackets
  drawCornerBrackets(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 16, 'rgba(245, 166, 35, 0.35)', 1.8);

  updatePreviewBalls();

  const isLandscape = canvas.width > 600 || state.viewOrientation === 'horizontal';
  const backBtnY = isLandscape ? 30 : 54;
  const titleY = isLandscape ? 30 : 54;
  const tmY = isLandscape ? 56 : 84;

  // ── Unified Top Back Button (Tactical Dark Carbon + Amber border) ──
  drawButton('◀ BACK', 52, backBtnY, () => { goToTitle(); }, 76, 26, '#20242E', 4);

  // ── Header Section ──
  const isTag = mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH';
  const isRegular1v2 = mode === '1v2' || mode === GAME_MODES.ONE_VS_TWO;

  // Screen Title Badge
  ctx.save();
  const rawTitle = isTag ? '3 VS 3 TAG MATCH' : (isRegular1v2 ? '1 VS 2 BATTLE' : 'FIGHT OF LARPERS 101');
  const titleW = isLandscape ? 320 : 270;
  const titleH = 28;
  const titleX = canvas.width / 2 - titleW / 2;
  const titleBoxY = titleY - titleH / 2;

  // Chamfered Dark Carbon Badge Base
  ctx.fillStyle = '#161922';
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, titleX, titleBoxY, titleW, titleH, 4);
  ctx.fill();
  ctx.stroke();

  // Bottom hazard stripe accent line
  drawHazardStripes(ctx, titleX + 8, titleBoxY + titleH - 4, titleW - 16, 3, 4, '#F5A623', '#101217');

  // Title typography
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`[ ${rawTitle} // DEPLOYMENT ]`, canvas.width / 2, titleY - 1);
  ctx.restore();

  // Sub-Controls (Boss Battle Team Toggle, Arena BGM & Arena Floor Selector)
  const isBossBattleMode = (mode === 'Boss Battle' || mode === GAME_MODES.BOSS_BATTLE || mode === '1v2 Stand Off' || mode === GAME_MODES.STAND_OFF_1V2 || mode === 'STAND_OFF_1V2');
  const teamToggleW = isBossBattleMode ? 135 : 0;
  const bgmW = 115;
  const floorW = 115;
  const ctrlH = 24;
  const gap = 8;
  const totalCtrlW = (isBossBattleMode ? teamToggleW + gap : 0) + bgmW + gap + floorW;
  const startCtrlX = canvas.width / 2 - totalCtrlW / 2;
  
  let curCtrlX = startCtrlX;
  if (isBossBattleMode) {
    const isSolo = Boolean(state.bossBattleNoTeammate);
    const toggleLabel = isSolo ? '👤 SOLO (1v1)' : '👥 DUO (1v2)';

    ctx.save();
    ctx.fillStyle = '#0B0C10';
    drawChamferedRect(ctx, curCtrlX, tmY + 2, teamToggleW, ctrlH, 3);
    ctx.fill();

    ctx.fillStyle = isSolo ? '#20242E' : '#181A22';
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, curCtrlX, tmY, teamToggleW, ctrlH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSolo ? '#FFD043' : '#F5A623';
    ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(toggleLabel, curCtrlX + teamToggleW / 2, tmY + ctrlH / 2);
    ctx.restore();

    _registerButton(curCtrlX, tmY, teamToggleW, ctrlH + 2, () => {
      state.bossBattleNoTeammate = !state.bossBattleNoTeammate;
      saveFighterSelections();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25);
      }
    });

    curCtrlX += teamToggleW + gap;
  }
  // Arena BGM Selector Button
  drawArenaBgmSelector(ctx, curCtrlX, tmY, bgmW, ctrlH);
  curCtrlX += bgmW + gap;

  // Arena Floor / Tiles Selector Button
  drawArenaFloorSelector(ctx, curCtrlX, tmY, floorW, ctrlH);

  // ── Main Combatant Grid ──
  const topY = isLandscape ? 88 : 132;
  const margin = isLandscape ? 24 : 18;
  const cardGap = isLandscape ? 24 : 12;
  const totalCardW = canvas.width - margin * 2;
  const cardW = Math.floor((totalCardW - cardGap) / 2);
  const fullCardH = isLandscape ? 380 : 680;

  if (mode === '1v1' || mode === 'Stand Off' || !mode || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.STAND_OFF || mode === GAME_MODES.HORIZONTAL_1V1 || mode === '1v1 Widescreen Duel') {
    if (isLandscape) {
      // Landscape 1v1: Left vs Right Reference 5 Comic Cut-In Banners
      const bannerW = Math.floor((totalCardW - cardGap) / 2);
      const bannerH = 264;
      const leftX = margin;
      const rightX = margin + bannerW + cardGap;
      const bannerY = topY + 34;

      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', leftX, bannerY, bannerW, bannerH, true, true);
      drawHeroicFighterCard('p2Index', 'PLAYER 2 // BLUE', rightX, bannerY, bannerW, bannerH, false, true);

      // Center Dynamic VS Emblem
      const vsX = canvas.width / 2;
      const vsY = bannerY + bannerH / 2;
      drawDynamicVsClashEmblem(ctx, vsX, vsY, true);

      drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomize1v1Fighters());
    } else {
      // Portrait 1v1: Top (Banner A) & Bottom (Banner B) with clean Reference 5 aspect ratio & spacing
      const bannerW = canvas.width - 36; // 504px
      const bannerH = 280;
      const bannerX = 18;
      const p1Y = 128;
      const p2Y = 468;

      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', bannerX, p1Y, bannerW, bannerH, true, true);
      drawHeroicFighterCard('p2Index', 'PLAYER 2 // BLUE', bannerX, p2Y, bannerW, bannerH, false, true);

      // Center Dynamic VS Emblem in the breathing space between Banner A and Banner B
      const vsX = canvas.width / 2;
      const vsY = Math.round((p1Y + bannerH + p2Y) / 2);
      drawDynamicVsClashEmblem(ctx, vsX, vsY, false);

      drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomize1v1Fighters());
    }

  } else if (isRegular1v2) {
    if (isLandscape) {
      const leftX = margin;
      const rightX = margin + cardW + cardGap;
      const stackedH = Math.floor((fullCardH - cardGap) / 2);
      const bottomY = topY + stackedH + cardGap;

      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', leftX, topY + 34, cardW, 264, true, true);
      drawPlayerCard('p2Index', 'PLAYER 2 // BLUE', rightX, topY, cardW, stackedH, '#38bdf8', true);
      drawPlayerCard('p3Index', 'PLAYER 3 // BLUE', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

      drawBottomCommandDeck('START 1V2 BATTLE', () => startGame(), () => randomize1v2Fighters());
    } else {
      const bannerW = canvas.width - 36;
      const p1Y = 124;
      const p1H = 276;
      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', 18, p1Y, bannerW, p1H, true, true);

      const duoCardW = Math.floor((canvas.width - 44) / 2);
      const duoY = p1Y + p1H + 38;
      const duoH = 340;
      drawPlayerCard('p2Index', 'PLAYER 2 // BLUE', 18, duoY, duoCardW, duoH, '#38bdf8', true);
      drawPlayerCard('p3Index', 'PLAYER 3 // BLUE', 18 + duoCardW + 8, duoY, duoCardW, duoH, '#38bdf8', true);

      const vsX = canvas.width / 2;
      const vsY = p1Y + p1H + 19;
      drawDynamicVsClashEmblem(ctx, vsX, vsY, false);

      drawBottomCommandDeck('START 1V2 BATTLE', () => startGame(), () => randomize1v2Fighters());
    }

  } else if (isBossBattleMode) {
    const isSolo = Boolean(state.bossBattleNoTeammate);
    const currentDefs = getActiveFighterDefs();
    const p1Def = currentDefs[state.p1Index] || currentDefs[0];
    const p1BossCfg = getBossConfig(p1Def);
    const p1BossTitle = (p1BossCfg?.bossTitle || p1Def?.bossTitle || '').toUpperCase();
    const bossCardTitle = (p1BossTitle && p1BossTitle !== 'BOSS') ? `BOSS // ${p1BossTitle}` : 'THE BOSS';

    if (isSolo) {
      if (isLandscape) {
        const bannerW = Math.floor((totalCardW - cardGap) / 2);
        const bannerH = 264;
        const leftX = margin;
        const rightX = margin + bannerW + cardGap;
        const bannerY = topY + 34;

        drawHeroicFighterCard('p1Index', bossCardTitle, leftX, bannerY, bannerW, bannerH, true, true);
        drawHeroicFighterCard('p2Index', 'SOLO CHALLENGER', rightX, bannerY, bannerW, bannerH, false, true);

        const vsX = canvas.width / 2;
        const vsY = bannerY + bannerH / 2;
        drawDynamicVsClashEmblem(ctx, vsX, vsY, true);

        drawBottomCommandDeck('START SOLO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      } else {
        const bannerW = canvas.width - 36;
        const bannerH = 280;
        const bannerX = 18;
        const p1Y = 128;
        const p2Y = 468;

        drawHeroicFighterCard('p1Index', bossCardTitle, bannerX, p1Y, bannerW, bannerH, true, true);
        drawHeroicFighterCard('p2Index', 'SOLO CHALLENGER', bannerX, p2Y, bannerW, bannerH, false, true);

        const vsX = canvas.width / 2;
        const vsY = Math.round((p1Y + bannerH + p2Y) / 2);
        drawDynamicVsClashEmblem(ctx, vsX, vsY, false);

        drawBottomCommandDeck('START SOLO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      }
    } else {
      // 1v2 Duo Challengers vs Boss
      if (isLandscape) {
        const leftX = margin;
        const rightX = margin + cardW + cardGap;
        const stackedH = Math.floor((fullCardH - cardGap) / 2);
        const bottomY = topY + stackedH + cardGap;

        drawHeroicFighterCard('p1Index', bossCardTitle, leftX, topY + 34, cardW, 264, true, true);
        drawPlayerCard('p2Index', 'CHALLENGER 1', rightX, topY, cardW, stackedH, '#38bdf8', true);
        drawPlayerCard('p3Index', 'CHALLENGER 2', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

        drawBottomCommandDeck('START DUO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      } else {
        const bannerW = canvas.width - 36;
        const p1Y = 124;
        const p1H = 276;
        drawHeroicFighterCard('p1Index', bossCardTitle, 18, p1Y, bannerW, p1H, true, true);

        const duoCardW = Math.floor((canvas.width - 44) / 2);
        const duoY = p1Y + p1H + 38;
        const duoH = 340;
        drawPlayerCard('p2Index', 'CHALLENGER 1', 18, duoY, duoCardW, duoH, '#38bdf8', true);
        drawPlayerCard('p3Index', 'CHALLENGER 2', 18 + duoCardW + 8, duoY, duoCardW, duoH, '#38bdf8', true);

        const vsX = canvas.width / 2;
        const vsY = p1Y + p1H + 19;
        drawDynamicVsClashEmblem(ctx, vsX, vsY, false);

        drawBottomCommandDeck('START DUO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      }
    }

  } else if (mode === '2v2' || mode === 'FFA') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    const isTeamMode = mode === '2v2';

    const p1Title = mode === '2v2' ? 'RED // SQUAD 1' : 'PLAYER 1';
    const p2Title = mode === '2v2' ? 'BLUE // SQUAD 1' : 'PLAYER 2';
    const p3Title = mode === '2v2' ? 'RED // SQUAD 2' : 'PLAYER 3';
    const p4Title = mode === '2v2' ? 'BLUE // SQUAD 2' : 'PLAYER 4';

    const p1Color = mode === '2v2' ? '#cc2b4d' : '#ef4444';
    const p2Color = mode === '2v2' ? '#38bdf8' : '#38bdf8';
    const p3Color = mode === '2v2' ? '#cc2b4d' : '#f59e0b';
    const p4Color = mode === '2v2' ? '#38bdf8' : '#a855f7';

    const isFfa3 = (mode === 'FFA' || mode === GAME_MODES.FFA) && !isLandscape;

    if (isFfa3) {
      // Vertical FFA: Exactly 3 players (P1 top-left, P2 top-right, P3 bottom-center)
      const centerX = canvas.width / 2;
      const p3X = Math.round(centerX - cardW / 2);
      drawPlayerCard('p1Index', 'PLAYER 1', leftX, topY, cardW, stackedH, '#ef4444', true);
      drawPlayerCard('p2Index', 'PLAYER 2', rightX, topY, cardW, stackedH, '#38bdf8', true);
      drawPlayerCard('p3Index', 'PLAYER 3', p3X, bottomY, cardW, stackedH, '#f59e0b', true);
    } else {
      drawPlayerCard('p1Index', p1Title, leftX, topY, cardW, stackedH, p1Color, true);
      drawPlayerCard('p2Index', p2Title, rightX, topY, cardW, stackedH, p2Color, true);
      drawPlayerCard('p3Index', p3Title, leftX, bottomY, cardW, stackedH, p3Color, true);
      drawPlayerCard('p4Index', p4Title, rightX, bottomY, cardW, stackedH, p4Color, true);
    }

    // Center Tactical VS Crest for team mode
    if (isTeamMode) {
      const vsX = canvas.width / 2;
      const vsY = topY + fullCardH / 2 - 10;
      drawTacticalVsCrest(ctx, vsX, vsY);
    }

    drawBottomCommandDeck(mode === '2v2' ? 'START 2V2 DUO' : 'START BATTLE', () => startGame(), () => randomizeFfaFighters());

  } else if (mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap * 2) / 3);
    const slotGap = cardGap;
    const y0 = topY;
    const y1 = topY + stackedH + slotGap;
    const y2 = topY + (stackedH + slotGap) * 2;

    // Team 1 / Red Squad (Slots 1, 2, 3 -> p1, p3, p5)
    drawPlayerCard('p1Index', 'RED // SQUAD 1', leftX, y0, cardW, stackedH, '#cc2b4d', true);
    drawPlayerCard('p3Index', 'RED // SQUAD 2', leftX, y1, cardW, stackedH, '#cc2b4d', true);
    drawPlayerCard('p5Index', 'RED // SQUAD 3', leftX, y2, cardW, stackedH, '#cc2b4d', true);

    // Team 2 / Blue Squad (Slots 1, 2, 3 -> p2, p4, p6)
    drawPlayerCard('p2Index', 'BLUE // SQUAD 1', rightX, y0, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p4Index', 'BLUE // SQUAD 2', rightX, y1, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p6Index', 'BLUE // SQUAD 3', rightX, y2, cardW, stackedH, '#38bdf8', true);

    // Center Tactical VS Crest
    const vsX = canvas.width / 2;
    const vsY = topY + fullCardH / 2 - 10;
    drawTacticalVsCrest(ctx, vsX, vsY);

    drawBottomCommandDeck('START TAG MATCH', () => startGame(), () => randomizeTagMatchFighters());

  } else if (mode === 'TLFS') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;

    drawPlayerCard('p1Index', 'GAUNTLET HERO', leftX, topY, cardW, fullCardH, '#f59e0b', true, true);
    drawTlfsEnemyPoolGrid(rightX, topY, cardW, fullCardH);

    drawBottomCommandDeck('START GAUNTLET', () => startGame(), () => {
      state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
    });
  }

  if (selectingSlot !== null) {
    drawFighterSelectModal();
  }

  if (isArenaBgmModalOpen()) {
    drawArenaBgmModal(state.ctx);
  }

  if (isArenaFloorModalOpen()) {
    drawArenaFloorModal(state.ctx);
  }
}

function drawBottomCommandDeck(primaryLabel, onStart, onRandomize) {
  const { canvas, ctx } = state;
  const isLandscape = canvas.width > 600 || state.viewOrientation === 'horizontal';
  const startBtnW = isLandscape ? 220 : 180;
  const thumbBtnW = isLandscape ? 150 : 135;
  const randBtnW = isLandscape ? 150 : 135;
  const btnGap = 10;
  const totalRowW = startBtnW + thumbBtnW + randBtnW + btnGap * 2;
  let startX = canvas.width / 2 - totalRowW / 2;

  const startBtnX = startX + startBtnW / 2;
  startX += startBtnW + btnGap;
  const thumbBtnX = startX + thumbBtnW / 2;
  startX += thumbBtnW + btnGap;
  const randBtnX = startX + randBtnW / 2;

  const actionRowY = isLandscape ? 498 : 852;
  const btnH = isLandscape ? 38 : 46;

  drawButton(primaryLabel, startBtnX, actionRowY, onStart, startBtnW, btnH, '#F5A623', 6);
  drawButton('📸 THUMBNAIL', thumbBtnX, actionRowY, () => {
    startFaceOffScreen(true);
  }, thumbBtnW, btnH, '#D97706', 6);
  drawButton('RANDOMIZE', randBtnX, actionRowY, onRandomize, randBtnW, btnH, '#20242E', 6);
}

function randomize1v1Fighters() {
  const currentDefs = getActiveFighterDefs();
  const available = currentDefs.map((_, idx) => idx).filter(idx => currentDefs[idx] && currentDefs[idx].type !== 'dummy');
  if (available.length > 0) {
    state.p1Index = available[Math.floor(Math.random() * available.length)];
    const remaining = available.filter(idx => idx !== state.p1Index);
    state.p2Index = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : state.p1Index;
    saveFighterSelections();
  }
}

function randomize1v2Fighters() {
  const currentDefs = getActiveFighterDefs();
  const available = currentDefs.map((_, idx) => idx).filter(idx => currentDefs[idx] && currentDefs[idx].type !== 'dummy');
  if (available.length > 0) {
    state.p1Index = available[Math.floor(Math.random() * available.length)];
    const rem1 = available.filter(idx => idx !== state.p1Index);
    state.p2Index = rem1.length > 0 ? rem1[Math.floor(Math.random() * rem1.length)] : state.p1Index;
    if (!state.bossBattleNoTeammate) {
      const rem2 = rem1.filter(idx => idx !== state.p2Index);
      state.p3Index = rem2.length > 0 ? rem2[Math.floor(Math.random() * rem2.length)] : state.p2Index;
    }
    saveFighterSelections();
  }
}

function randomizeFfaFighters() {
  const currentDefs = getActiveFighterDefs();
  const indices = currentDefs.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  state.p1Index = indices[0] ?? 0;
  state.p2Index = indices[1] ?? (indices.length > 1 ? 1 : 0);
  state.p3Index = indices[2] ?? (indices.length > 2 ? 2 : 0);
  if (state.viewOrientation === 'horizontal') {
    state.p4Index = indices[3] ?? (indices.length > 3 ? 3 : 0);
  }
  saveFighterSelections();
}

export function getFighterWeaponInfo(def) {
  if (!def) return { name: 'TACTICAL FIREARM', category: 'BALLISTIC', desc: 'Standard issue firearm.' };
  const t = def.type ? def.type.toLowerCase() : '';
  switch (t) {
    case 'rifle':
      return { name: 'M4A1 CARBINE', category: 'BALLISTIC // 5.56MM RIFLE', desc: 'Versatile combat carbine delivering sustained ballistic bursts and rapid magazine reloads.' };
    case 'shotgun':
      return { name: 'SPAS-12 SHOTGUN', category: 'BALLISTIC // 12-GAUGE', desc: 'Heavy close-quarters entry weapon firing 6-pellet buckshot spread with massive target knockback.' };
    case 'pistol':
      return { name: 'DESERT EAGLE .50', category: 'BALLISTIC // .50 MAGNUM', desc: 'Lightweight high-mobility sidearm with fast trigger response and critical headshot potential.' };
    case 'sniper':
      return { name: 'AWP .338 MAGNUM', category: 'BALLISTIC // .338 SNIPER', desc: 'Heavy high-caliber sniper rifle with laser aim trajectory and armor-piercing match rounds.' };
    case 'tactical_sniper':
      return { name: '.338 BOLT-ACTION AWP', category: 'BALLISTIC // SNIPER', desc: 'Precision long-range sniper rifle with armor-piercing execution rounds.' };
    case 'tactical_gunslinger':
      return { name: 'DUAL .45 REVOLVERS', category: 'BALLISTIC // DUAL PISTOLS', desc: 'Twin tactical revolvers with rapid fire rate and critical impact chance.' };
    case 'tactical_commando':
      return { name: 'M4A1-S TACTICAL CARBINE', category: 'BALLISTIC // ASSAULT RIFLE', desc: 'Suppressed military carbine delivering pinpoint burst fire and steady recoil control.' };
    case 'tactical_guerilla':
      return { name: '7.62MM AK-47 RIFLE', category: 'BALLISTIC // HEAVY RIFLE', desc: 'Heavy assault rifle delivering high stopping power and punishing bullet impacts.' };
    case 'tactical_breacher':
      return { name: 'SPAS-12 TACTICAL SHOTGUN', category: 'BALLISTIC // BUCKSHOT', desc: '12-gauge entry shotgun with multi-pellet spread and close-quarters knockback.' };
    case 'tactical_heavy':
      return { name: 'M134 ROTARY MINIGUN', category: 'BALLISTIC // HEAVY SUPPORT', desc: 'Motorized high-RPM multi-barrel minigun providing heavy bullet suppression.' };
    case 'tactical_infiltrator':
      return { name: 'MP5-SD SILENCED SMG', category: 'BALLISTIC // SUBMACHINE GUN', desc: 'Stealth submachine gun with high fire rate, silenced muzzle, and high mobility.' };
    case 'tactical_marksman':
      return { name: 'MK14 EBR SEMI-AUTO DMR', category: 'BALLISTIC // DESIGNATED MARKSMAN', desc: 'Semi-automatic battle rifle providing continuous mid-range precision suppression.' };
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
    case 'alucard':
      return { name: '.454 CASULL & 13MM JACKAL', category: 'HOLY & MERCURY // VAMPIRE', desc: 'Custom sacred silver semi-auto and 13mm matte black combat pistol with vampiric blood lifesteal and Baskerville shadow release.' };
    case 'doppleganger':
      return { name: 'PHANTOM SHADOWBLADE', category: 'ILLUSION // MELEE', desc: 'Ghostly curved sword that synchronizes strikes with spawned clones.' };
    case 'engineer':
    case 'Engineer':
      return { name: '12-GAUGE SHOTGUN & WRENCH', category: 'BALLISTIC // DEPLOYABLE', desc: 'Pump-action 12-gauge shotgun and heavy pipe wrench backed by deployable Sentry Turrets (Lv 1-3) and Dispenser.' };
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
    case 'maki':
      return { name: 'SPLIT SOUL KATANA & DRAGON-BONE', category: 'HEAVENLY RESTRICTION // COMPLETE', desc: 'True soul-severing damage that bypasses domains, air-stepping mobility, and Dragon-Bone kinetic exhaust.' };
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
    case 'rubbick':
    case 'trickster':
      return { name: 'ARCANE STAFF OF THE GRAND MAGUS', category: 'ARCANE // SPELL STEAL', desc: 'Floating crystal core and gold-inlaid mahogany staff that channels arcane bolts, telekinesis, and stolen enemy skills.' };
    case 'layla':
      return { name: 'MALEFIC ENERGY CANNON', category: 'ENERGY // HYPER-RANGE', desc: 'Long-range particle beam rifle with extreme single-shot execution power.' };
    case 'ichigo':
      return { name: 'ZANGETSU / TENSA ZANGETSU', category: 'ZANPAKUTO // GETSUGA', desc: 'Heavy cleaver blade unleashing Kuroi Getsuga Tensho energy waves.' };
    case 'nanami':
      return { name: 'RATIO TECHNIQUE CLEAVER', category: 'CURSED // 7:3 RATIO', desc: 'Fabric-wrapped blunt blade that creates critical hit weak points on contact.' };
    case 'megumi':
      return { name: "MEGUMI'S CURSED SWORD", category: 'CURSED TOOL // BROADSWORD', desc: "Megumi's signature heavy broad cursed blade. Features a thick slate-steel slab blade with a spearhead chisel tip, white cloth bandage collar wrapping, matte black cylindrical hilt, and ring pommel." };
    case 'john_wick':
    case 'johnwick':
      return { name: 'TTI PIT VIPER & BENELLI M4', category: 'TACTICAL FIREARMS // GUN-FU', desc: 'Combat Master 9mm, Super 90 shotgun, M4A1 rifle, and sharpened No. 2 pencil.' };
    case 'cj':
      return { name: 'KNUCKLES, JETPACK, TEC-9 & MINIGUN', category: 'STREET BRAWLER // CHEAT ARSENAL', desc: 'Vintage cast-brass knuckles for CQC boxing, Area 69 Jetpack flight, Skill 3 Tec-9 drive-bys, and M134 Minigun.' };
    case 'makima':
      return { name: 'CONTROL DEVIL // "BANG!"', category: 'DEVIL // DOMINATION', desc: 'Instantaneous hitscan kinetic shockwaves with heavy knockback, Chains of Domination, 1000-Year Holy Spear, and Kyoto Shrine compression.' };
    case 'reze':
      return { name: 'SOVIET CONCEALED BLADE & BOMB DEVIL', category: 'DEVIL // RUSHDOWN & MELEE', desc: 'Sleeve-concealed surgical knife strings, 120° blast martial punches, Spark Flechette projectile spreads, Decoy Bombs, and Megaton Tsar Nuke.' };
    case 'denji':
      return { name: 'TWIN CHAINSAWS & POCHITA RIPCORD', category: 'DEVIL // BERSERKER', desc: 'Mechanical forearm and forehead chainsaws with high-RPM shredding, 25% lifesteal, engine lunges, and Pochita ripcord revive.' };
    case 'power':
      return { name: 'GIGANTIC BLOOD HAMMER & SCYTHE', category: 'DEVIL // BLOOD MANIPULATION', desc: 'Solidified crystalline blood warhammer with 140° ground shockwave stuns, 360° blood scythe whirlwinds, and Thousand Blood Daggers.' };
    case 'tanjiro':
      return { name: 'NICHIRIN KATANA & HINOKAMI KAGURA', category: 'BREATHING // WATER & SUN', desc: 'Obsidian-black Nichirin blade channeling Water Surface Slashes, Constant Flux dragon lunges, Clear Blue Sky projectile deflections, and Dragon Sun Halo Head Dance.' };
    case 'nezuko':
      return { name: 'DEMON CLAWS & BAKKETSU FLAMES', category: 'DEMON // PYROKINESIS', desc: 'Demonic claw flurries, 120° Demonic Axe Kicks, supersonic Flying Dropkicks, and Exploding Blood (Bakketsu) anti-demon pyrokinesis.' };
    case 'zenitsu':
      return { name: 'LIGHTNING NICHIRIN KATANA', category: 'SIGNATURE // THUNDERCLAP & FLASH', desc: "Golden lightning-hamon blade unleashing Zenitsu's signature First Form: Thunderclap and Flash godspeed teleport slashes, Sixfold wall bounces, and Flaming Thunder God." };
    case 'inosuke':
      return { name: 'DUAL SERRATED NICHIRIN KATANAS', category: 'BREATHING // BEAST KENJUTSU', desc: 'Twin chipped serrated blades with 160° Dual Hacks, 360° Crazy Cutting whirlwind shredding, Explosive Rush boar charges, and Spatial Awareness.' };
    case 'escanor':
      return { name: 'DIVINE AXE RHITTA & CRUEL SUN', category: 'SIGNATURE // CRUEL SUN', desc: "Legendary giant golden battleaxe and Escanor's signature Cruel Sun (無慈悲な太陽). Channels 140° Divine Slashes, colossal blazing solar spheres dragging & paralyzing enemies along arena walls, Pride Flare, and the invincible \"The One\" form." };
    case 'zeus':
      return { name: 'DIVINE LIGHTNING & AEGIS', category: 'SIGNATURE // THUNDER STORM', desc: "Olympian God of Thunder wielding Chain Lightning, Aegis Counter Barrier, and signature Ultimate: Thunder Storm arena-wide divine judgment wrath." };
    case 'sans':
      return { name: 'GASTER BLASTERS & BONE ARSENAL', category: 'SIGNATURE // GASTER BLASTER', desc: "The Judge of the Underground's signature Gaster Blaster laser cannons, 360° carousel orbits, Bone Zone spikes, and Blue Soul telekinesis gravity slams." };
    case 'ender_dragon':
    case 'enderdragon':
      return { name: "DRAGON'S BREATH & VOID WINGS", category: 'VOID LEVIATHAN // KINETIC SWOOP', desc: 'Ancient draconic arsenal deploying lingering acidic Dragon Breath pools, supersonic 120° Wing Buffet kinetic swoops, and 360° Void Cataclysm shockwaves.' };
    case 'guts':
      return { name: 'DRAGON SLAYER & PROSTHETIC CANNON', category: 'COLOSSAL MELEE // BERSERK', desc: 'Monstrous 400-pound black iron greatsword cleaving across 210° frontal arcs, concealed high-explosive wrist cannon, repeating crossbow, and dwarf-forged Berserker Armor.' };
    case 'dummy':
      return { name: 'BALLISTIC TARGET CHASSIS', category: 'TRAINING // SANDBOX', desc: 'Reinforced training frame designed for testing weapon DPS and combos.' };
    default:
      return { name: (def.ability || 'COMBAT SKILL').toUpperCase(), category: 'COMBAT ARSENAL', desc: def.desc || 'Standard combat armament.' };
  }
}

function drawPlayerCard(slotProp, title, x, y, w, h, accentColor, enabled, isLarge = false) {
  const { ctx, mode } = state;
  const isBossBattleMode = (mode === 'Boss Battle' || mode === GAME_MODES.BOSS_BATTLE || mode === '1v2 Stand Off' || mode === GAME_MODES.STAND_OFF_1V2 || mode === 'STAND_OFF_1V2');
  const isAnyModalOpen = (selectingSlot !== null || isArenaBgmModalOpen() || isArenaFloorModalOpen());
  const isInteractive = enabled && !isAnyModalOpen;

  // Track card bounds for direct mouse wheel cycling (only when interactive)
  if (isInteractive) {
    _playerCardBounds.push({ slotProp, x, y, w, h });
  }

  // 1. Deep Drop Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.70)';
  drawChamferedRect(ctx, x + 3, y + 4, w, h, 6);
  ctx.fill();

  // 2. Dark Tactical Carbon Armor Plate Base
  ctx.fillStyle = '#141720';
  ctx.strokeStyle = '#282E3C';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // 3. Tech Corner Brackets in Hazard Amber
  drawCornerBrackets(ctx, x + 3, y + 3, w - 6, h - 6, 12, '#F5A623', 1.8);

  // 4. Header band with dark carbon plate, team accent line & hazard stripes
  const headerH = 26;
  ctx.fillStyle = '#181C26';
  ctx.strokeStyle = '#282E3C';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, headerH, 4);
  ctx.fill();
  ctx.stroke();

  // Team accent pip line on top of header
  ctx.fillStyle = accentColor || '#F5A623';
  ctx.fillRect(x + 10, y + 2, w - 20, 2);

  // Hazard stripe accent bar along bottom of header
  drawHazardStripes(ctx, x + 6, y + headerH - 3, w - 12, 3, 4, accentColor || '#F5A623', '#101217');

  // Header Title Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 14);
  ctx.restore();

  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const theme = getFighterCollectorTheme(def);

  // Register click on card to open character selection modal
  if (isInteractive) {
    _registerButton(x, y, w, h, () => {
      openFighterSelectModal(slotProp, state[slotProp] ?? 0);
    });
  }

  if (!enabled) {
    ctx.fillStyle = '#EF4444';
    ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLOT UNAVAILABLE', x + w / 2, y + h / 2);
    return;
  }

  const previewImage = getFighterPreview(fighterIndex);
  const weaponInfo = getFighterWeaponInfo(def);

  // Helper function to cycle fighters for this slot
  const cycleFighter = (direction) => {
    if (!isInteractive) return;
    const availableFighters = currentDefs.map((d, idx) => ({ d, idx }))
      .filter(({ d }) => !(!state.dummyEnabled && d.type === 'dummy'));
    const pos = availableFighters.findIndex(f => f.idx === state[slotProp]);
    const count = availableFighters.length;
    if (count > 0) {
      const nextPos = (pos + direction + count) % count;
      state[slotProp] = availableFighters[nextPos].idx;
      if (slotProp === 'p1Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[0] = state.p1Index;
      else if (slotProp === 'p2Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[1] = state.p2Index;
      else if (slotProp === 'p3Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[2] = state.p3Index;
      else if (slotProp === 'p4Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[3] = state.p4Index;
      else if (slotProp === 'p5Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[4] = state.p5Index;
      else if (slotProp === 'p6Index' && state.horizontalRosterSlots) state.horizontalRosterSlots[5] = state.p6Index;
      saveFighterSelections();
      preloadFighterAssets(state[slotProp]);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  };

  if (isLarge) {
    const isLandscape = (state.canvas && state.canvas.width > 600) || state.viewOrientation === 'horizontal';
    if (isLandscape && h <= 420) {
      // ── WIDESCREEN 16:9 LARGE CARD (1v1 / Stand-Off Solo in Horizontal Mode: H ~ 380, W ~ 390) ──
      const subLeftX = x + 10;
      const subLeftW = 168;
      const subRightX = x + 184;
      const subRightW = w - 194;

      const avatarX = subLeftX + subLeftW / 2;
      const avatarY = y + 76;
      const avatarSize = 64;

      // Quick cycle arrows on avatar sides
      drawButton('◄', subLeftX + 16, avatarY, () => cycleFighter(-1), 24, 24, '#20242E', 3);
      drawButton('►', subLeftX + subLeftW - 16, avatarY, () => cycleFighter(1), 24, 24, '#20242E', 3);

      // Glowing pedestal ring
      ctx.save();
      ctx.fillStyle = '#101217';
      ctx.strokeStyle = theme.primary || '#F5A623';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 30, avatarSize * 0.44, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 166, 35, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 30, avatarSize * 0.52, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (previewImage) {
        ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      }

      // Fighter Name + Grade Badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameText = fitSingleLineText(ctx, def.name.toUpperCase(), subLeftW - 34);
      const measuredNameW = ctx.measureText(nameText).width;
      const nameCx = avatarX - 10;
      ctx.fillText(nameText, nameCx, y + 124);
      drawGradeBadge(ctx, nameCx + measuredNameW / 2 + 4, y + 116, def.grade, { scale: 0.8 });

      // Class / Boss Tag Pill
      const isBossCard = isBossBattleMode && slotProp === 'p1Index';
      const p1BossCfg = isBossCard ? getBossConfig(def) : null;
      const p1BossTitle = isBossCard ? (p1BossCfg?.bossTitle || def?.bossTitle || '').toUpperCase() : '';
      const pillText = (isBossCard && p1BossTitle && p1BossTitle !== 'BOSS')
        ? `BOSS // ${p1BossTitle}`
        : `CLASS // ${def.type.toUpperCase()}`;

      ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
      const measuredPillW = Math.max(90, ctx.measureText(pillText).width + 16);
      const pillW = Math.min(subLeftW - 12, measuredPillW);
      const pillH = 16;
      ctx.fillStyle = '#1A1D26';
      ctx.strokeStyle = theme.primary || '#F5A623';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, avatarX - pillW / 2, y + 136, pillW, pillH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primary || '#F5A623';
      ctx.fillText(pillText, avatarX, y + 144.5);

      // Stat Telemetry Block
      const statBoxY = y + 160;
      drawTacticalStatBar(ctx, 'HP', def.hp, 150, subLeftX, statBoxY, subLeftW, '#EF4444');
      drawTacticalStatBar(ctx, 'DMG', def.damage, 60, subLeftX, statBoxY + 16, subLeftW, '#F5A623');
      drawTacticalStatBar(ctx, 'SPD', def.speed || 2, 4, subLeftX, statBoxY + 32, subLeftW, theme.primary || '#38BDF8');

      // Change Fighter Button
      const btnW = subLeftW;
      const btnH = 32;
      const btnY = y + h - btnH - 12;

      drawButton('CHANGE (ROSTER)', avatarX, btnY + btnH / 2, () => {
        openFighterSelectModal(slotProp, fighterIndex);
      }, btnW, btnH, '#20242E', 3);

      // Right Side: Ability Box + Live Weapon Box
      const abY = y + 32;
      const abH = 80;
      ctx.save();
      ctx.fillStyle = '#0F1116';
      ctx.strokeStyle = '#252A36';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, subRightX, abY, subRightW, abH, 4);
      ctx.fill();
      ctx.stroke();
      drawCornerBrackets(ctx, subRightX, abY, subRightW, abH, 6, 'rgba(245, 166, 35, 0.4)', 1.2);
      ctx.restore();

      ctx.fillStyle = '#F5A623';
      ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, subRightW - 12), subRightX + 6, abY + 6);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      wrapText(ctx, def.desc, subRightX + 6, abY + 18, subRightW - 12, 12, 4);

      // Live Weapon Visual Box
      const wpY = abY + abH + 6;
      const wpH = h - (wpY - y) - 12;
      ctx.save();
      ctx.fillStyle = '#0F1116';
      ctx.strokeStyle = '#252A36';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, subRightX, wpY, subRightW, wpH, 4);
      ctx.fill();
      ctx.stroke();
      drawCornerBrackets(ctx, subRightX, wpY, subRightW, wpH, 8, '#F5A623', 1.4);
      ctx.restore();

      ctx.fillStyle = '#F5A623';
      ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, subRightW - 12), subRightX + 6, wpY + 6);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
      ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, subRightW - 12), subRightX + 6, wpY + 19);

      const wStageX = subRightX + subRightW / 2;
      const wStageY = wpY + 86;

      ctx.save();
      ctx.fillStyle = '#151822';
      ctx.strokeStyle = '#F5A623';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(wStageX, wStageY + 20, 44, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.translate(wStageX, wStageY);
      ctx.scale(1.0, 1.0);
      drawWeaponPreview(ctx, def.type, def.color);
      ctx.restore();

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrapText(ctx, weaponInfo.desc, wStageX, wpY + 172, subRightW - 12, 12, 4);

    } else {
      // ── TALL SHOWCASE CARD (1v1 / Stand-Off Solo / TLFS: H = 680 in Portrait) ──
      const avatarX = x + w / 2;
      const avatarY = y + 84;
      const avatarSize = 80;

      // Quick cycle arrows on large card avatar sides
      drawButton('◄', x + 24, avatarY, () => cycleFighter(-1), 26, 26, '#20242E', 3);
      drawButton('►', x + w - 24, avatarY, () => cycleFighter(1), 26, 26, '#20242E', 3);

      // Glowing high-tech pedestal ring (themed to character's accent)
      ctx.save();
      ctx.fillStyle = '#101217';
      ctx.strokeStyle = theme.primary || '#F5A623';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 38, avatarSize * 0.44, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 166, 35, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 38, avatarSize * 0.52, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (previewImage) {
        ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      }

      // Fighter Name + Grade Badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 15px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameText = fitSingleLineText(ctx, def.name.toUpperCase(), w - 46);
      const measuredNameW = ctx.measureText(nameText).width;
      const nameCx = avatarX - 10;
      ctx.fillText(nameText, nameCx, y + 144);
      drawGradeBadge(ctx, nameCx + measuredNameW / 2 + 4, y + 136, def.grade, { scale: 0.8 });

      // Class / Boss Tag Pill
      const isBossCard = isBossBattleMode && slotProp === 'p1Index';
      const p1BossCfg = isBossCard ? getBossConfig(def) : null;
      const p1BossTitle = isBossCard ? (p1BossCfg?.bossTitle || def?.bossTitle || '').toUpperCase() : '';
      const pillText = (isBossCard && p1BossTitle && p1BossTitle !== 'BOSS')
        ? `BOSS // ${p1BossTitle}`
        : `CLASS // ${def.type.toUpperCase()}`;

      ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
      const measuredPillW = Math.max(96, ctx.measureText(pillText).width + 18);
      const pillW = Math.min(w - 24, measuredPillW);
      const pillH = 16;
      ctx.fillStyle = '#1A1D26';
      ctx.strokeStyle = theme.primary || '#F5A623';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, avatarX - pillW / 2, y + 156, pillW, pillH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primary || '#F5A623';
      ctx.fillText(pillText, avatarX, y + 164.5);

      // Stat Telemetry Block (Tactical gauges matching Image 1)
      const statBoxX = x + 10;
      const statBoxY = y + 180;
      const statBoxW = w - 20;

      drawTacticalStatBar(ctx, 'HP', def.hp, 150, statBoxX, statBoxY, statBoxW, '#EF4444');
      drawTacticalStatBar(ctx, 'DMG', def.damage, 60, statBoxX, statBoxY + 16, statBoxW, '#F5A623');
      drawTacticalStatBar(ctx, 'SPD', def.speed || 2, 4, statBoxX, statBoxY + 32, statBoxW, theme.primary || '#38BDF8');

      // ── Ability Dossier Sub-Panel (Dark Carbon Recessed Sub-box) ──
      const abilityY = y + 224;
      const abilityH = 88;
      
      ctx.save();
      ctx.fillStyle = '#0F1116';
      ctx.strokeStyle = '#252A36';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, statBoxX, abilityY, statBoxW, abilityH, 4);
      ctx.fill();
      ctx.stroke();
      drawCornerBrackets(ctx, statBoxX, abilityY, statBoxW, abilityH, 6, 'rgba(245, 166, 35, 0.4)', 1.2);
      ctx.restore();

      ctx.fillStyle = '#F5A623';
      ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, statBoxW - 16), statBoxX + 8, abilityY + 7);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '800 10px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      wrapText(ctx, def.desc, statBoxX + 8, abilityY + 22, statBoxW - 16, 13, 5);

      // ── Live Weapon Graphic Visual Stage Sub-Panel (Dark Carbon Recessed Sub-box) ──
      const weaponY = abilityY + abilityH + 8;
      const weaponH = 296;

      ctx.save();
      ctx.fillStyle = '#0F1116';
      ctx.strokeStyle = '#252A36';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, statBoxX, weaponY, statBoxW, weaponH, 5);
      ctx.fill();
      ctx.stroke();
      drawCornerBrackets(ctx, statBoxX, weaponY, statBoxW, weaponH, 8, '#F5A623', 1.4);
      ctx.restore();

      // Weapon Header & Category
      ctx.fillStyle = '#F5A623';
      ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, statBoxW - 16), statBoxX + 8, weaponY + 7);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
      ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, statBoxW - 16), statBoxX + 8, weaponY + 20);

      // Live Weapon Center Stage
      const wStageX = statBoxX + statBoxW / 2;
      const wStageY = weaponY + 114;

      // High-tech weapon pedestal
      ctx.save();
      ctx.fillStyle = '#151822';
      ctx.strokeStyle = '#F5A623';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(wStageX, wStageY + 28, 54, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 166, 35, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(wStageX, wStageY + 28, 62, 15, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Render LIVE WEAPON GRAPHIC
      ctx.translate(wStageX, wStageY);
      ctx.scale(1.15, 1.15);
      drawWeaponPreview(ctx, def.type, def.color);
      ctx.restore();

      // Weapon Description Telemetry
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '800 10px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrapText(ctx, weaponInfo.desc, wStageX, weaponY + 222, statBoxW - 16, 13, 4);

      // Change Fighter Button (Dark Tactical Carbon with Amber Border)
      const btnW = w - 24;
      const btnH = 36;
      const btnY = y + h - btnH - 12;

      drawButton('CHANGE FIGHTER (ROSTER)', x + w / 2, btnY + btnH / 2, () => {
        openFighterSelectModal(slotProp, fighterIndex);
      }, btnW, btnH, '#20242E', 4);
    }

  } else if (h < 260) {
    // ── COMPACT STACKED CARD (Tag Match 3-Stack: H ~ 218px) ──
    const avatarX = x + 30;
    const avatarY = y + 54;
    const avatarSize = 44;

    // Glowing pedestal
    ctx.save();
    ctx.fillStyle = '#101217';
    ctx.strokeStyle = theme.primary || '#F5A623';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY + 22, avatarSize * 0.44, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    const detailX = x + 58;
    const detailW = w - 68;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), detailW - 4), detailX, y + 28);

    ctx.fillStyle = theme.primary || '#F5A623';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${def.type.toUpperCase()}`, detailW - 4), detailX, y + 40);

    drawTacticalStatBar(ctx, 'HP', def.hp, 150, detailX, y + 50, detailW, '#EF4444');
    drawTacticalStatBar(ctx, 'DMG', def.damage, 60, detailX, y + 64, detailW, '#F5A623');
    drawTacticalStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, y + 78, detailW, theme.primary || '#38BDF8');

    // Mini Live Weapon preview sub-box
    const weaponBoxY = y + 96;
    const weaponBoxH = h - (weaponBoxY - y) - 34;
    const boxW = w - 16;

    ctx.save();
    ctx.fillStyle = '#0F1116';
    ctx.strokeStyle = '#252A36';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, x + 8, weaponBoxY, boxW, weaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    drawCornerBrackets(ctx, x + 8, weaponBoxY, boxW, weaponBoxH, 5, 'rgba(245, 166, 35, 0.4)', 1.2);
    ctx.restore();

    ctx.fillStyle = '#F5A623';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, boxW - 50), x + 12, weaponBoxY + 5);

    // Mini Live Weapon render on right
    const miniWX = x + boxW - 24;
    const miniWY = weaponBoxY + weaponBoxH / 2 + 3;
    ctx.save();
    ctx.translate(miniWX, miniWY);
    ctx.scale(0.55, 0.55);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '800 9px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 12, weaponBoxY + 17, boxW - 55, 11, 3);

    // Quick cycle arrows + Change Fighter Button
    const arrowW = 24;
    const changeBtnW = w - 16 - arrowW * 2 - 6;
    const btnH = 22;
    const btnY = y + h - btnH - 6;

    drawButton('◄', x + 8 + arrowW / 2, btnY + btnH / 2, () => cycleFighter(-1), arrowW, btnH, '#20242E', 3);
    drawButton('CHANGE', x + 8 + arrowW + 3 + changeBtnW / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, changeBtnW, btnH, '#20242E', 3);
    drawButton('►', x + w - 8 - arrowW / 2, btnY + btnH / 2, () => cycleFighter(1), arrowW, btnH, '#20242E', 3);

  } else {
    // ── MEDIUM CARD (2v2 / 1v2 Duo Stacked / FFA: H ~ 334px) ──
    const avatarX = x + 36;
    const avatarY = y + 64;
    const avatarSize = 54;

    // Glowing pedestal
    ctx.save();
    ctx.fillStyle = '#101217';
    ctx.strokeStyle = theme.primary || '#F5A623';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY + 26, avatarSize * 0.44, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    const detailX = x + 72;
    const detailW = w - 82;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 12.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), detailW - 4), detailX, y + 32);

    ctx.fillStyle = theme.primary || '#F5A623';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${def.type.toUpperCase()}`, detailW - 4), detailX, y + 46);

    drawTacticalStatBar(ctx, 'HP', def.hp, 150, detailX, y + 58, detailW, '#EF4444');
    drawTacticalStatBar(ctx, 'DMG', def.damage, 60, detailX, y + 74, detailW, '#F5A623');
    drawTacticalStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, y + 90, detailW, theme.primary || '#38BDF8');

    // Live Weapon preview sub-box
    const weaponBoxY = y + 112;
    const weaponBoxH = h - (weaponBoxY - y) - 44;
    const boxW = w - 18;

    ctx.save();
    ctx.fillStyle = '#0F1116';
    ctx.strokeStyle = '#252A36';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, x + 9, weaponBoxY, boxW, weaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    drawCornerBrackets(ctx, x + 9, weaponBoxY, boxW, weaponBoxH, 6, 'rgba(245, 166, 35, 0.4)', 1.2);
    ctx.restore();

    ctx.fillStyle = '#F5A623';
    ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, boxW - 65), x + 15, weaponBoxY + 6);

    // Mini Live Weapon render on right
    const miniWX = x + boxW - 35;
    const miniWY = weaponBoxY + weaponBoxH / 2 + 6;
    ctx.save();
    ctx.translate(miniWX, miniWY);
    ctx.scale(0.65, 0.65);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 15, weaponBoxY + 18, boxW - 75, 12, 4);

    // Quick cycle arrows + Change Fighter Button
    const arrowW = 28;
    const changeBtnW = w - 18 - arrowW * 2 - 8;
    const btnH = 26;
    const btnY = y + h - btnH - 10;

    drawButton('◄', x + 9 + arrowW / 2, btnY + btnH / 2, () => cycleFighter(-1), arrowW, btnH, '#20242E', 3);
    drawButton('CHANGE', x + 9 + arrowW + 4 + changeBtnW / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, changeBtnW, btnH, '#20242E', 3);
    drawButton('►', x + w - 9 - arrowW / 2, btnY + btnH / 2, () => cycleFighter(1), arrowW, btnH, '#20242E', 3);
  }
}

function openFighterSelectModal(slotProp, fighterIndex) {
  selectingSlot = slotProp;
  modalInspectIndex = fighterIndex;
  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
  const pos = modalAvailableFighters.findIndex(f => f.idx === fighterIndex);
  
  if (pos !== -1) {
    modalPage = Math.floor(pos / MODAL_ITEMS_PER_PAGE);
  } else {
    modalPage = 0;
  }
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.2);
  }
}

function isFighterSelectModalOpen() {
  return selectingSlot !== null;
}

function closeFighterSelectModal() {
  selectingSlot = null;
}

function getSelectingSlot() {
  return selectingSlot;
}

// Global Keyboard Shortcuts for Select Screen
window.addEventListener('keydown', (e) => {
  if (state.gameState === 'select' || state.gameState === 'horizontal_select') {
    if (isArenaBgmModalOpen()) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeArenaBgmModal();
        e.preventDefault();
        return;
      }
    }
    if (isArenaFloorModalOpen()) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeArenaFloorModal();
        e.preventDefault();
        return;
      }
    }
    if (selectingSlot !== null) {
      if (e.key === 'Escape') {
        selectingSlot = null;
        e.preventDefault();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        applyFighterSelection();
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
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / MODAL_ITEMS_PER_PAGE));
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
    } else if (e.code === 'KeyT') {
      e.preventDefault();
      startFaceOffScreen(true);
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      if (state.gameState === 'horizontal_select') {
        import('./HorizontalTeamSelectScreen.js').then(m => m.randomizeHorizontalRoster && m.randomizeHorizontalRoster()).catch(() => {});
      } else if (state.mode === '1v1' || state.mode === 'Stand Off') {
        randomize1v1Fighters();
      } else if (state.mode === '1v2 Stand Off') {
        randomize1v2Fighters();
      } else if (state.mode === '2v2' || state.mode === 'FFA') {
        randomizeFfaFighters();
      } else if (state.mode === 'TLFS') {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
        saveFighterSelections();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      goToTitle();
    }
  }
});

// Event listeners for character select screen & modal scrolling
window.addEventListener('wheel', (e) => {
  if (state.gameState !== 'select' && state.gameState !== 'horizontal_select') return;

  // Block card wheel cycling when Arena BGM or Arena Floor modal is active
  if (isArenaBgmModalOpen() || isArenaFloorModalOpen()) {
    return;
  }

  const activeCanvas = (state.pixiApp && state.pixiApp.view) ? state.pixiApp.view : state.canvas;
  const rect = (activeCanvas && activeCanvas.getBoundingClientRect) ? activeCanvas.getBoundingClientRect() : { left: 0, top: 0, width: state.canvas.width, height: state.canvas.height };
  const scaleX = state.canvas.width / (rect.width || 1);
  const scaleY = state.canvas.height / (rect.height || 1);
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  if (selectingSlot !== null) {
    // Modal scroll: flip to next / previous page on scroll!
    const isLandscape = (state.canvas && state.canvas.width > 600) || state.viewOrientation === 'horizontal';
    const modalW = isLandscape ? Math.min(state.canvas.width - 28, 912) : Math.min(state.canvas.width - 20, 508);
    const modalH = isLandscape ? Math.min(state.canvas.height - 20, 508) : Math.min(state.canvas.height - 44, 896);
    const mx = (state.canvas.width - modalW) / 2;
    const my = (state.canvas.height - modalH) / 2;

    // If hovering anywhere over the modal or modal area
    if (mouseX >= mx - 20 && mouseX <= mx + modalW + 20 && mouseY >= my - 20 && mouseY <= my + modalH + 20) {
      e.preventDefault();
      const now = performance.now();
      if (now - _lastModalWheelTime > 140) {
        const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
          .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / MODAL_ITEMS_PER_PAGE));
        
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
        saveFighterSelections();
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }
  }
}, { passive: false });

export { drawPlayerCard, drawHeroicFighterCard, drawDynamicVsClashEmblem, drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, randomize1v1Fighters, selectingSlot, modalInspectIndex, modalPage, openFighterSelectModal, isFighterSelectModalOpen, closeFighterSelectModal, getSelectingSlot };
