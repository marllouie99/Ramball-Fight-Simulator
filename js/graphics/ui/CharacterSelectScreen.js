import { goToTitle, startGame, startFaceOffScreen, randomizeTagMatchFighters, preloadFighterAssets } from '../../core/gameFlow.js';
import { state, saveFighterSelections } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, fitSingleLineText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawArenaBgmSelector, isArenaBgmModalOpen, drawArenaBgmModal, closeArenaBgmModal } from '../../systems/arenaBgmSystem.js';
import { drawArenaFloorSelector, isArenaFloorModalOpen, drawArenaFloorModal, closeArenaFloorModal } from '../../systems/arenaTileSystem.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { getBossConfig } from '../../configs/bosses/bossConfigRegistry.js';

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;
let _lastModalWheelTime = 0;
let _lastCardWheelTime = 0;
let _playerCardBounds = [];

function drawTlfsEnemyPoolGrid(x, y, w, h) {
  const { ctx } = state;
  drawPanel(x, y, w, h, 0.98, 6, '#21050c');

  // Header band
  ctx.fillStyle = '#21050c';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Top accent line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 12, y + 2, w - 24, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENEMY GAUNTLET POOL', x + w / 2, y + 15);

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
      ctx.fillStyle = '#5e0d1f';
      drawChamferedRect(ctx, cellX, cellY + 2, cellW, cellH, 3);
      ctx.fill();

      ctx.fillStyle = '#f26f88';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.6;
      drawChamferedRect(ctx, cellX, cellY, cellW, cellH, 3);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#baa88c';
      drawChamferedRect(ctx, cellX, cellY + 2, cellW, cellH, 3);
      ctx.fill();

      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.4;
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
    ctx.fillStyle = isSelected ? '#ffffff' : '#21050c';
    ctx.font = '700 6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    let nameStr = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
    if (nameStr.length > 7) nameStr = nameStr.substring(0, 6) + '.';
    ctx.fillText(nameStr.toUpperCase(), cellX + cellW / 2, cellY + cellH - 3);
    
    if (!isSelected) {
      ctx.strokeStyle = '#cc2b4d';
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

function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const isLandscape = canvas.width > 600 || state.viewOrientation === 'horizontal';
  const modalW = isLandscape ? Math.min(canvas.width - 40, 900) : Math.min(canvas.width - 20, 510);
  const modalH = isLandscape ? Math.min(canvas.height - 30, 490) : Math.min(canvas.height - 40, 600);
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  // Retro dim backdrop overlay
  ctx.fillStyle = 'rgba(33, 5, 12, 0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Backdrop click closes modal
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    selectingSlot = null;
  });

  // Blocker over modal panel window
  _registerButton(mx, my, modalW, modalH, () => {});

  const currentDefs = getActiveFighterDefs();
  const selectedDef = currentDefs[modalInspectIndex] || currentDefs[0] || FIGHTER_DEFS[0];

  // Draw main outer retro cream-pink panel
  drawPanel(mx, my, modalW, modalH, 0.98, 6, '#21050c');

  // Header Banner
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

  ctx.fillStyle = '#b81c3b';
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('FIGHTER ROSTER // PROTOCOL 01', mx + 18, my + 12);

  ctx.fillStyle = '#21050c';
  ctx.font = '900 14px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText(`CHOOSE FIGHTER (${slotLabel})`, mx + 18, my + 24);

  // Header accent line
  ctx.fillStyle = '#21050c';
  ctx.fillRect(mx + 18, my + 42, modalW - 36, 2);

  const modalAvailableFighters = currentDefs.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));

  if (isLandscape) {
    // ── LANDSCAPE 16:9 DUAL-STAGE ROSTER MODAL ──
    const cols = 5;
    const rows = 3;
    const itemsPerPage = cols * rows; // 15
    const gap = 6;
    const gridW = 460;
    const listX = mx + 16;
    const listY = my + 50;

    const cellW = Math.floor((gridW - (cols - 1) * gap) / cols); // ~87px
    const cellH = 92;

    const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
    modalPage = Math.max(0, Math.min(totalPages - 1, modalPage));

    const startIdx = modalPage * itemsPerPage;
    const pageFighters = modalAvailableFighters.slice(startIdx, startIdx + itemsPerPage);

    // Render 5x3 Grid
    pageFighters.forEach(({ def, idx }, localPos) => {
      const col = localPos % cols;
      const row = Math.floor(localPos / cols);

      const itemX = listX + col * (cellW + gap);
      const itemY = listY + row * (cellH + gap);
      const isSelected = idx === modalInspectIndex;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = '#5e0d1f';
        drawChamferedRect(ctx, itemX, itemY + 2.5, cellW, cellH, 3);
        ctx.fill();

        ctx.fillStyle = '#f26f88';
        ctx.strokeStyle = '#21050c';
        ctx.lineWidth = 1.8;
        drawChamferedRect(ctx, itemX, itemY, cellW, cellH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ffaec0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(itemX + 2, itemY + 1.5);
        ctx.lineTo(itemX + cellW - 2, itemY + 1.5);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#baa88c';
        drawChamferedRect(ctx, itemX, itemY + 2, cellW, cellH, 3);
        ctx.fill();

        ctx.fillStyle = '#fff5f7';
        ctx.strokeStyle = '#21050c';
        ctx.lineWidth = 1.5;
        drawChamferedRect(ctx, itemX, itemY, cellW, cellH, 3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Avatar
      const avatarX = itemX + cellW / 2;
      const avatarY = itemY + cellH / 2 - 8;
      const previewImg = getFighterPreview(idx);
      if (previewImg) {
        const avatarSize = cellW - 16;
        ctx.drawImage(previewImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      } else {
        ctx.fillStyle = def.color || '#fff';
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name Tag
      ctx.fillStyle = isSelected ? '#ffffff' : '#21050c';
      ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      let shortName = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
      if (shortName.length > 10) shortName = shortName.substring(0, 9) + '.';
      ctx.fillText(shortName.toUpperCase(), avatarX, itemY + cellH - 3);

      _registerButton(itemX, itemY, cellW, cellH + 2, () => {
        if (modalInspectIndex !== idx) {
          modalInspectIndex = idx;
          preloadFighterAssets(idx);
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.12);
          }
        }
      });
    });

    // Pagination Controls Dock
    const paginationY = listY + rows * (cellH + gap) + 4;
    const paginationH = 32;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, listX, paginationY, gridW, paginationH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const pageBtnW = 34;
    const pageBtnH = 22;
    const pageBtnY = paginationY + paginationH / 2;

    drawButton('◄', listX + 8 + pageBtnW / 2, pageBtnY, () => {
      if (modalPage > 0) {
        modalPage--;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }, pageBtnW, pageBtnH, null, 3);

    drawButton('►', listX + gridW - 8 - pageBtnW / 2, pageBtnY, () => {
      if (modalPage < totalPages - 1) {
        modalPage++;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }, pageBtnW, pageBtnH, null, 3);

    ctx.fillStyle = '#21050c';
    ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PAGE ${modalPage + 1} / ${totalPages}`, listX + gridW / 2, paginationY + 11);

    const dotSpacing = 14;
    const dotsStartX = listX + gridW / 2 - ((totalPages - 1) * dotSpacing) / 2;
    for (let p = 0; p < totalPages; p++) {
      const dotX = dotsStartX + p * dotSpacing;
      const dotY = paginationY + 23;
      const isCurrentPage = p === modalPage;
      ctx.fillStyle = isCurrentPage ? '#b81c3b' : '#baa88c';
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

    // Cancel / Lock In action buttons below grid
    const footerY = my + modalH - 34;
    const actionBtnW = 210;
    const actionBtnH = 30;

    drawButton('CANCEL', listX + gridW / 4, footerY, () => {
      selectingSlot = null;
    }, actionBtnW, actionBtnH, null, 4);

    drawButton('LOCK IN', listX + (gridW * 3) / 4, footerY, () => {
      applyFighterSelection();
    }, actionBtnW, actionBtnH, '#cc2b4d', 4);

    // ── Right Side: 2-Column Champion & Weapon Showcase Stage ──
    const detailX = listX + gridW + 16;
    const detailW = modalW - (detailX - mx) - 16; // ~392px
    const detailY = listY;
    const detailH = 414;

    ctx.save();
    ctx.fillStyle = '#baa88c';
    drawChamferedRect(ctx, detailX, detailY + 3, detailW, detailH, 4);
    ctx.fill();

    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.8;
    drawChamferedRect(ctx, detailX, detailY, detailW, detailH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Split Right Side into Left Sub-panel (Stats/Hero) and Right Sub-panel (Weapon/Ability)
    const subLeftX = detailX + 10;
    const subLeftW = 175;
    const subRightX = detailX + 192;
    const subRightW = detailW - 202;

    // Champion Preview Avatar
    const previewX = subLeftX + subLeftW / 2;
    const previewY = detailY + 44;
    const previewSize = 64;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(previewX, previewY + 26, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const previewImage = getFighterPreview(modalInspectIndex);
    if (previewImage) {
      ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
    }

    ctx.fillStyle = '#21050c';
    ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitSingleLineText(ctx, selectedDef.name.toUpperCase(), subLeftW - 8), previewX, detailY + 86);

    // Class Badge Pill
    const pillW = Math.min(subLeftW - 12, 110);
    const pillH = 16;
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, previewX - pillW / 2, detailY + 98, pillW, pillH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(`CLASS // ${selectedDef.type.toUpperCase()}`, previewX, detailY + 106.5);

    let statBarY = detailY + 124;
    if (selectedDef.type === 'reze') {
      const isHybrid = Boolean(state.showRezeTransformation);
      drawButton(
        isHybrid ? '💣 BOMB DEVIL' : '🌸 HUMAN FORM',
        previewX,
        statBarY + 8,
        () => {
          state.showRezeTransformation = !state.showRezeTransformation;
          try {
            if (state.showRezeTransformation) audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.95);
            else audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
          } catch (e) {}
        },
        subLeftW - 16,
        18,
        isHybrid ? '#b81c3b' : null,
        3
      );
      statBarY += 24;
    } else if (selectedDef.type === 'eye_of_cthulhu') {
      const isP2 = Boolean(state.showEyeOfCthulhuPhase2);
      drawButton(
        isP2 ? '🦷 PHASE 2' : '👁️ PHASE 1',
        previewX,
        statBarY + 8,
        () => {
          state.showEyeOfCthulhuPhase2 = !state.showEyeOfCthulhuPhase2;
          try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
        },
        subLeftW - 16,
        18,
        isP2 ? '#e11d48' : null,
        3
      );
      statBarY += 24;
    }

    drawStatBar(ctx, 'HP', selectedDef.hp, 150, subLeftX, statBarY, subLeftW, '#cc2b4d');
    statBarY += 16;
    drawStatBar(ctx, 'DMG', selectedDef.damage, 60, subLeftX, statBarY, subLeftW, '#f59e0b');
    statBarY += 16;
    drawStatBar(ctx, 'SPD', selectedDef.speed || 2, 4, subLeftX, statBarY, subLeftW, '#7c2d37');

    // Right Sub-panel: Ability Box + Weapon Visual Box
    const modalWeaponInfo = getFighterWeaponInfo(selectedDef);

    // Ability Sub-box
    const abY = detailY + 8;
    const abH = 86;
    ctx.save();
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, subRightX, abY, subRightW, abH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#b81c3b';
    ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${selectedDef.ability.toUpperCase()}`, subRightW - 12), subRightX + 6, abY + 6);

    ctx.fillStyle = '#21050c';
    ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    wrapText(ctx, selectedDef.desc, subRightX + 6, abY + 18, subRightW - 12, 12, 4);

    // Weapon Visual Box
    const wpY = abY + abH + 8;
    const wpH = detailH - (wpY - detailY) - 8;
    ctx.save();
    ctx.fillStyle = '#faedf0';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.6;
    drawChamferedRect(ctx, subRightX, wpY, subRightW, wpH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#b81c3b';
    ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${modalWeaponInfo.name}`, subRightW - 12), subRightX + 6, wpY + 6);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `[ ${modalWeaponInfo.category} ]`, subRightW - 12), subRightX + 6, wpY + 19);

    const mStageX = subRightX + subRightW / 2;
    const mStageY = wpY + 95;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(mStageX, mStageY + 20, 44, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.translate(mStageX, mStageY);
    ctx.scale(1.05, 1.05);
    drawWeaponPreview(ctx, selectedDef.type, selectedDef.color);
    ctx.restore();

    ctx.fillStyle = '#21050c';
    ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, modalWeaponInfo.desc, mStageX, wpY + 190, subRightW - 12, 12, 4);

  } else {
    // ── PORTRAIT (540x960) ORIGINAL MODAL LAYOUT (Rule 28 Baseline Preserved) ──
    const cols = 3;
    const rows = 5;
    const itemsPerPage = cols * rows;
    const gap = 6;
    const gridW = 210;
    const listX = mx + 18;
    const listY = my + 58;

    const cellW = Math.floor((gridW - (cols - 1) * gap) / cols);
    const cellH = 68;

    const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
    modalPage = Math.max(0, Math.min(totalPages - 1, modalPage));

    const startIdx = modalPage * itemsPerPage;
    const pageFighters = modalAvailableFighters.slice(startIdx, startIdx + itemsPerPage);

    // Render Current Page Roster Grid
    pageFighters.forEach(({ def, idx }, localPos) => {
      const col = localPos % cols;
      const row = Math.floor(localPos / cols);

      const itemX = listX + col * (cellW + gap);
      const itemY = listY + row * (cellH + gap);

      const isSelected = idx === modalInspectIndex;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = '#5e0d1f';
        drawChamferedRect(ctx, itemX, itemY + 2.5, cellW, cellH, 3);
        ctx.fill();

        ctx.fillStyle = '#f26f88';
        ctx.strokeStyle = '#21050c';
        ctx.lineWidth = 1.8;
        drawChamferedRect(ctx, itemX, itemY, cellW, cellH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ffaec0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(itemX + 2, itemY + 1.5);
        ctx.lineTo(itemX + cellW - 2, itemY + 1.5);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#baa88c';
        drawChamferedRect(ctx, itemX, itemY + 2, cellW, cellH, 3);
        ctx.fill();

        ctx.fillStyle = '#fff5f7';
        ctx.strokeStyle = '#21050c';
        ctx.lineWidth = 1.5;
        drawChamferedRect(ctx, itemX, itemY, cellW, cellH, 3);
        ctx.fill();
        ctx.stroke();
      }
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
      ctx.fillStyle = isSelected ? '#ffffff' : '#21050c';
      ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      let shortName = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
      if (shortName.length > 9) shortName = shortName.substring(0, 8) + '.';
      ctx.fillText(shortName.toUpperCase(), avatarX, itemY + cellH - 3);

      _registerButton(itemX, itemY, cellW, cellH + 2, () => {
        if (modalInspectIndex !== idx) {
          modalInspectIndex = idx;
          preloadFighterAssets(idx);
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.12);
          }
        }
      });
    });

    // Pagination Controls Dock at Bottom of Roster Grid
    const paginationY = listY + rows * (cellH + gap) + 4;
    const paginationH = 34;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, listX, paginationY, gridW, paginationH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

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
    }, pageBtnW, pageBtnH, null, 3);

    drawButton('►', listX + gridW - 8 - pageBtnW / 2, pageBtnY, () => {
      if (modalPage < totalPages - 1) {
        modalPage++;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }, pageBtnW, pageBtnH, null, 3);

    ctx.fillStyle = '#21050c';
    ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PAGE ${modalPage + 1} / ${totalPages}`, listX + gridW / 2, paginationY + 11);

    const dotSpacing = 14;
    const dotsStartX = listX + gridW / 2 - ((totalPages - 1) * dotSpacing) / 2;
    for (let p = 0; p < totalPages; p++) {
      const dotX = dotsStartX + p * dotSpacing;
      const dotY = paginationY + 24;
      const isCurrentPage = p === modalPage;

      ctx.fillStyle = isCurrentPage ? '#b81c3b' : '#baa88c';
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

    // Right Side: Champion Showcase Stage
    const detailX = listX + gridW + 16;
    const detailW = modalW - (detailX - mx) - 18;
    const detailY = my + 58;
    const detailH = 444;

    ctx.save();
    ctx.fillStyle = '#baa88c';
    drawChamferedRect(ctx, detailX, detailY + 3, detailW, detailH, 4);
    ctx.fill();

    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.8;
    drawChamferedRect(ctx, detailX, detailY, detailW, detailH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const previewX = detailX + detailW / 2;
    const previewY = detailY + 54;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(previewX, previewY + 32, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const previewImage = getFighterPreview(modalInspectIndex);
    if (previewImage) {
      const previewSize = 78;
      ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
    }

    ctx.fillStyle = '#21050c';
    ctx.font = '900 13.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 104);

    const pillW = 96;
    const pillH = 16;
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, previewX - pillW / 2, detailY + 116, pillW, pillH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(`CLASS // ${selectedDef.type.toUpperCase()}`, previewX, detailY + 124.5);

    let textY = detailY + 146;
    if (selectedDef.type === 'reze') {
      const isHybrid = Boolean(state.showRezeTransformation);
      drawButton(
        isHybrid ? '💣 BOMB DEVIL' : '🌸 HUMAN FORM',
        previewX,
        detailY + 142,
        () => {
          state.showRezeTransformation = !state.showRezeTransformation;
          try {
            if (state.showRezeTransformation) audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.95);
            else audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
          } catch (e) {}
        },
        115,
        18,
        isHybrid ? '#b81c3b' : null,
        3
      );
      textY += 20;
    } else if (selectedDef.type === 'eye_of_cthulhu') {
      const isP2 = Boolean(state.showEyeOfCthulhuPhase2);
      drawButton(
        isP2 ? '🦷 PHASE 2 (FANGED MAW)' : '👁️ PHASE 1 (OCULAR)',
        previewX,
        detailY + 142,
        () => {
          state.showEyeOfCthulhuPhase2 = !state.showEyeOfCthulhuPhase2;
          try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
        },
        135,
        18,
        isP2 ? '#e11d48' : null,
        3
      );
      textY += 20;
    }
    const barW = detailW - 20;
    const barX = detailX + 10;

    drawStatBar(ctx, 'HP', selectedDef.hp, 150, barX, textY, barW, '#cc2b4d');
    textY += 16;
    drawStatBar(ctx, 'DMG', selectedDef.damage, 60, barX, textY, barW, '#f59e0b');
    textY += 16;
    drawStatBar(ctx, 'SPD', selectedDef.speed || 2, 4, barX, textY, barW, '#7c2d37');
    textY += 22;

    const modalWeaponInfo = getFighterWeaponInfo(selectedDef);

    // Weapon Visual Showcase Box in Modal
    const mWeaponBoxY = textY;
    const mWeaponBoxH = 110;
    ctx.save();
    ctx.fillStyle = '#faedf0';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.6;
    drawChamferedRect(ctx, barX, mWeaponBoxY, barW, mWeaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#b81c3b';
    ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${modalWeaponInfo.name}`, barW - 16), barX + 8, mWeaponBoxY + 7);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `[ ${modalWeaponInfo.category} ]`, barW - 16), barX + 8, mWeaponBoxY + 20);

    const mStageX = barX + barW / 2;
    const mStageY = mWeaponBoxY + 58;

    ctx.save();
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(mStageX, mStageY + 16, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.translate(mStageX, mStageY);
    ctx.scale(0.9, 0.9);
    drawWeaponPreview(ctx, selectedDef.type, selectedDef.color);
    ctx.restore();

    const mAbilityY = mWeaponBoxY + mWeaponBoxH + 8;
    ctx.fillStyle = '#b81c3b';
    ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${selectedDef.ability.toUpperCase()}`, barW), barX, mAbilityY);

    ctx.fillStyle = '#21050c';
    ctx.font = '800 10px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    wrapText(ctx, selectedDef.desc, barX, mAbilityY + 14, barW, 13, 4);

    const footerY = my + modalH - 34;
    const btnW = 130;
    const btnH = 34;

    drawButton('CANCEL', listX + gridW / 2, footerY, () => {
      selectingSlot = null;
    }, btnW, btnH, null, 4);

    drawButton('LOCK IN', detailX + detailW / 2, footerY, () => {
      applyFighterSelection();
    }, btnW, btnH, '#cc2b4d', 4);
  }
}

function drawSelectScreen() {
  const { ctx, canvas, mode } = state;
  _clearButtons();
  _playerCardBounds = [];
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Retro Crimson Pixel Backdrop
  ctx.fillStyle = '#5c0f1c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pixel Dither Grid
  ctx.fillStyle = '#3d0711';
  for (let y = 0; y < canvas.height; y += 6) {
    for (let x = 0; x < canvas.width; x += 6) {
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + 3, y + 3, 2, 2);
    }
  }

  updatePreviewBalls();

  const isLandscape = canvas.width > 600 || state.viewOrientation === 'horizontal';
  const backBtnY = isLandscape ? 30 : 64;
  const titleY = isLandscape ? 30 : 64;
  const tmY = isLandscape ? 56 : 96;

  // ── Unified Top Back Button ──
  drawButton('◀ BACK', 52, backBtnY, () => { goToTitle(); }, 76, 26);

  // ── Header Section ──
  const isTag = mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH';
  const isRegular1v2 = mode === '1v2' || mode === GAME_MODES.ONE_VS_TWO;

  // Screen Title: FIGHT OF LARPERS 101
  ctx.save();
  const titleText = isTag ? '[ 3 VS 3 TAG MATCH ]' : (isRegular1v2 ? '[ 1 VS 2 BATTLE ]' : '[ FIGHT OF LARPERS 101 ]');
  
  ctx.fillStyle = '#21050c';
  ctx.font = '700 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, canvas.width / 2 + 1, titleY + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(titleText, canvas.width / 2, titleY);
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
    ctx.fillStyle = '#baa88c';
    drawChamferedRect(ctx, curCtrlX, tmY + 2, teamToggleW, ctrlH, 3);
    ctx.fill();

    ctx.fillStyle = isSolo ? '#fff5f7' : '#faedf0';
    ctx.strokeStyle = isSolo ? '#b81c3b' : '#21050c';
    ctx.lineWidth = 1.6;
    drawChamferedRect(ctx, curCtrlX, tmY, teamToggleW, ctrlH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSolo ? '#b81c3b' : '#21050c';
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
  const topY = isLandscape ? 88 : 134;
  const margin = isLandscape ? 40 : 16;
  const cardGap = isLandscape ? 40 : 12;
  const totalCardW = canvas.width - margin * 2;
  const cardW = Math.floor((totalCardW - cardGap) / 2); // ~390px in landscape, 248px in portrait
  const fullCardH = isLandscape ? 380 : 680;

  if (mode === '1v1' || mode === 'Stand Off' || !mode || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.STAND_OFF) {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;

    const p1Title = 'PLAYER 1 // RED';
    const p2Title = 'PLAYER 2 // BLUE';
    const p1Color = '#cc2b4d';
    const p2Color = '#38bdf8';

    drawPlayerCard('p1Index', p1Title, leftX, topY, cardW, fullCardH, p1Color, true, true);
    drawPlayerCard('p2Index', p2Title, rightX, topY, cardW, fullCardH, p2Color, true, true);

    // Center Retro Pixel VS Crest
    const vsX = canvas.width / 2;
    const vsY = topY + fullCardH / 2 - 10;
    
    ctx.save();
    // 3D Shadow
    ctx.fillStyle = '#5e0d1f';
    ctx.beginPath();
    ctx.arc(vsX, vsY + 2.5, 18, 0, Math.PI * 2);
    ctx.fill();

    // Center berry badge
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inset highlight
    ctx.strokeStyle = '#ffaec0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 0.5);
    ctx.restore();

    // Bottom Command Dock
    const btnText = 'START BATTLE';
    drawBottomCommandDeck(btnText, () => startGame(), () => randomize1v1Fighters());

  } else if (isRegular1v2) {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    drawPlayerCard('p1Index', 'PLAYER 1 // RED', leftX, topY, cardW, fullCardH, '#cc2b4d', true, true);
    drawPlayerCard('p2Index', 'PLAYER 2 // BLUE', rightX, topY, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p3Index', 'PLAYER 3 // BLUE', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

    // Center Retro Pixel VS Crest
    const vsX = canvas.width / 2;
    const vsY = topY + fullCardH / 2 - 10;
    
    ctx.save();
    // 3D Shadow
    ctx.fillStyle = '#5e0d1f';
    ctx.beginPath();
    ctx.arc(vsX, vsY + 2.5, 18, 0, Math.PI * 2);
    ctx.fill();

    // Center berry badge
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inset highlight
    ctx.strokeStyle = '#ffaec0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 0.5);
    ctx.restore();

    drawBottomCommandDeck('START 1V2 BATTLE', () => startGame(), () => randomize1v2Fighters());

  } else if (isBossBattleMode) {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const isSolo = Boolean(state.bossBattleNoTeammate);
    const currentDefs = getActiveFighterDefs();
    const p1Def = currentDefs[state.p1Index] || currentDefs[0];
    const p1BossCfg = getBossConfig(p1Def);
    const p1BossTitle = (p1BossCfg?.bossTitle || p1Def?.bossTitle || '').toUpperCase();
    const bossCardTitle = (p1BossTitle && p1BossTitle !== 'BOSS') ? `BOSS // ${p1BossTitle}` : 'THE BOSS';

    if (isSolo) {
      // 1v1 Solo Challenger vs Boss
      drawPlayerCard('p1Index', bossCardTitle, leftX, topY, cardW, fullCardH, '#cc2b4d', true, true);
      drawPlayerCard('p2Index', 'SOLO CHALLENGER', rightX, topY, cardW, fullCardH, '#38bdf8', true, true);

      // Center Retro Pixel VS Crest
      const vsX = canvas.width / 2;
      const vsY = topY + fullCardH / 2 - 10;
      
      ctx.save();
      // 3D Shadow
      ctx.fillStyle = '#5e0d1f';
      ctx.beginPath();
      ctx.arc(vsX, vsY + 2.5, 18, 0, Math.PI * 2);
      ctx.fill();

      // Center berry badge
      ctx.fillStyle = '#b81c3b';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inset highlight
      ctx.strokeStyle = '#ffaec0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vsX, vsY, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', vsX, vsY + 0.5);
      ctx.restore();

      drawBottomCommandDeck('START SOLO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
    } else {
      // 1v2 Duo Challengers vs Boss
      const stackedH = Math.floor((fullCardH - cardGap) / 2);
      const bottomY = topY + stackedH + cardGap;

      drawPlayerCard('p1Index', bossCardTitle, leftX, topY, cardW, fullCardH, '#cc2b4d', true, true);
      drawPlayerCard('p2Index', 'CHALLENGER 1', rightX, topY, cardW, stackedH, '#38bdf8', true);
      drawPlayerCard('p3Index', 'CHALLENGER 2', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

      drawBottomCommandDeck('START DUO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
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

    drawPlayerCard('p1Index', p1Title, leftX, topY, cardW, stackedH, p1Color, true);
    drawPlayerCard('p2Index', p2Title, rightX, topY, cardW, stackedH, p2Color, true);
    drawPlayerCard('p3Index', p3Title, leftX, bottomY, cardW, stackedH, p3Color, true);
    drawPlayerCard('p4Index', p4Title, rightX, bottomY, cardW, stackedH, p4Color, true);

    // Center Holographic VS Crest for team mode
    if (isTeamMode) {
      const vsX = canvas.width / 2;
      const vsY = topY + fullCardH / 2 - 10;
      
      ctx.save();
      ctx.fillStyle = '#5e0d1f';
      ctx.beginPath();
      ctx.arc(vsX, vsY + 2.5, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b81c3b';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffaec0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vsX, vsY, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', vsX, vsY + 0.5);
      ctx.restore();
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

    // Center Retro Pixel VS Crest
    const vsX = canvas.width / 2;
    const vsY = topY + fullCardH / 2 - 10;
    
    ctx.save();
    // 3D Shadow
    ctx.fillStyle = '#5e0d1f';
    ctx.beginPath();
    ctx.arc(vsX, vsY + 2.5, 18, 0, Math.PI * 2);
    ctx.fill();

    // Center berry badge
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inset highlight
    ctx.strokeStyle = '#ffaec0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 0.5);
    ctx.restore();

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

  drawButton(primaryLabel, startBtnX, actionRowY, onStart, startBtnW, btnH, '#cc2b4d', 6);
  drawButton('📸 THUMBNAIL', thumbBtnX, actionRowY, () => {
    startFaceOffScreen(true);
  }, thumbBtnW, btnH, '#d97706', 6);
  drawButton('RANDOMIZE', randBtnX, actionRowY, onRandomize, randBtnW, btnH, null, 6);
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
  state.p4Index = indices[3] ?? (indices.length > 3 ? 3 : 0);
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
      return { name: 'DUAL CUSTOM REVOLVERS', category: 'DUAL BALLISTIC // RAPID', desc: 'Twin six-shooters with rapid-fire fanning and devastating bullet barrages.' };
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

  // Retro Cream-Pink Window Panel with dark chocolate border
  drawPanel(x, y, w, h, 0.98, 6, '#21050c');

  // Header band with dark chocolate background and team accent indicator
  ctx.fillStyle = '#21050c';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Top accent pip line
  ctx.fillStyle = accentColor || '#b81c3b';
  ctx.fillRect(x + 12, y + 2, w - 24, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 15);

  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];

  // Register click on card to open character selection modal
  if (isInteractive) {
    _registerButton(x, y, w, h, () => {
      selectingSlot = slotProp;
      modalInspectIndex = state[slotProp] ?? 0;
      modalPage = Math.floor(modalInspectIndex / 15);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.2);
      }
    });
  }

  if (!enabled) {
    ctx.fillStyle = '#8b1524';
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
      drawButton('◄', subLeftX + 16, avatarY, () => cycleFighter(-1), 24, 24, null, 3);
      drawButton('►', subLeftX + subLeftW - 16, avatarY, () => cycleFighter(1), 24, 24, null, 3);

      // Warm pedestal ring
      ctx.save();
      ctx.fillStyle = '#eed8dc';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 30, avatarSize * 0.44, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (previewImage) {
        ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      }

      // Fighter Name
      ctx.fillStyle = '#21050c';
      ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), subLeftW - 8), avatarX, y + 124);

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
      ctx.fillStyle = '#b81c3b';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, avatarX - pillW / 2, y + 136, pillW, pillH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(pillText, avatarX, y + 144.5);

      // Stat Telemetry Block
      const statBoxY = y + 160;
      drawStatBar(ctx, 'HP', def.hp, 150, subLeftX, statBoxY, subLeftW, '#cc2b4d');
      drawStatBar(ctx, 'DMG', def.damage, 60, subLeftX, statBoxY + 16, subLeftW, '#f59e0b');
      drawStatBar(ctx, 'SPD', def.speed || 2, 4, subLeftX, statBoxY + 32, subLeftW, '#7c2d37');

      // Change Fighter Button
      const btnW = subLeftW;
      const btnH = 32;
      const btnY = y + h - btnH - 12;

      drawButton('CHANGE (ROSTER)', avatarX, btnY + btnH / 2, () => {
        openFighterSelectModal(slotProp, fighterIndex);
      }, btnW, btnH, null, 3);

      // Right Side: Ability Box + Live Weapon Box
      const abY = y + 32;
      const abH = 80;
      ctx.save();
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.5;
      drawChamferedRect(ctx, subRightX, abY, subRightW, abH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#b81c3b';
      ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, subRightW - 12), subRightX + 6, abY + 6);

      ctx.fillStyle = '#21050c';
      ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      wrapText(ctx, def.desc, subRightX + 6, abY + 18, subRightW - 12, 12, 4);

      // Live Weapon Visual Box
      const wpY = abY + abH + 6;
      const wpH = h - (wpY - y) - 12;
      ctx.save();
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.5;
      drawChamferedRect(ctx, subRightX, wpY, subRightW, wpH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#b81c3b';
      ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, subRightW - 12), subRightX + 6, wpY + 6);

      ctx.fillStyle = '#8b1524';
      ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
      ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, subRightW - 12), subRightX + 6, wpY + 19);

      const wStageX = subRightX + subRightW / 2;
      const wStageY = wpY + 86;

      ctx.save();
      ctx.fillStyle = '#eed8dc';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(wStageX, wStageY + 20, 44, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.translate(wStageX, wStageY);
      ctx.scale(1.0, 1.0);
      drawWeaponPreview(ctx, def.type, def.color);
      ctx.restore();

      ctx.fillStyle = '#21050c';
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
      drawButton('◄', x + 24, avatarY, () => cycleFighter(-1), 26, 26, null, 3);
      drawButton('►', x + w - 24, avatarY, () => cycleFighter(1), 26, 26, null, 3);

      // Warm stage pedestal ring
      ctx.save();
      ctx.fillStyle = '#eed8dc';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 38, avatarSize * 0.44, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (previewImage) {
        ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      }

      // Fighter Name
      ctx.fillStyle = '#21050c';
      ctx.font = '900 14px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.name.toUpperCase(), avatarX, y + 144);

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
      ctx.fillStyle = '#b81c3b';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, avatarX - pillW / 2, y + 156, pillW, pillH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(pillText, avatarX, y + 164.5);

      // Stat Telemetry Block
      const statBoxX = x + 10;
      const statBoxY = y + 180;
      const statBoxW = w - 20;

      drawStatBar(ctx, 'HP', def.hp, 150, statBoxX, statBoxY, statBoxW, '#cc2b4d');
      drawStatBar(ctx, 'DMG', def.damage, 60, statBoxX, statBoxY + 16, statBoxW, '#f59e0b');
      drawStatBar(ctx, 'SPD', def.speed || 2, 4, statBoxX, statBoxY + 32, statBoxW, '#7c2d37');

      // ── Ability Dossier Sub-Panel (Warm Cream Sub-box) ──
      const abilityY = y + 224;
      const abilityH = 88;
      
      ctx.save();
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.6;
      drawChamferedRect(ctx, statBoxX, abilityY, statBoxW, abilityH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#b81c3b';
      ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, statBoxW - 16), statBoxX + 8, abilityY + 7);

      ctx.fillStyle = '#21050c';
      ctx.font = '800 10px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      wrapText(ctx, def.desc, statBoxX + 8, abilityY + 20, statBoxW - 16, 13, 5);

      // ── Live Weapon Graphic Visual Stage Sub-Panel (Warm Cream Sub-box) ──
      const weaponY = abilityY + abilityH + 8;
      const weaponH = 296;

      ctx.save();
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.6;
      drawChamferedRect(ctx, statBoxX, weaponY, statBoxW, weaponH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Weapon Header & Category
      ctx.fillStyle = '#b81c3b';
      ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, statBoxW - 16), statBoxX + 8, weaponY + 7);

      ctx.fillStyle = '#8b1524';
      ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
      ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, statBoxW - 16), statBoxX + 8, weaponY + 20);

      // Live Weapon Center Stage
      const wStageX = statBoxX + statBoxW / 2;
      const wStageY = weaponY + 114;

      // Stage pedestal ring
      ctx.save();
      ctx.fillStyle = '#eed8dc';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(wStageX, wStageY + 28, 54, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Render LIVE WEAPON GRAPHIC
      ctx.translate(wStageX, wStageY);
      ctx.scale(1.15, 1.15);
      drawWeaponPreview(ctx, def.type, def.color);
      ctx.restore();

      // Weapon Description Telemetry
      ctx.fillStyle = '#21050c';
      ctx.font = '800 10px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrapText(ctx, weaponInfo.desc, wStageX, weaponY + 222, statBoxW - 16, 13, 4);

      // Change Fighter Button
      const btnW = w - 24;
      const btnH = 36;
      const btnY = y + h - btnH - 12;

      drawButton('CHANGE FIGHTER (ROSTER)', x + w / 2, btnY + btnH / 2, () => {
        openFighterSelectModal(slotProp, fighterIndex);
      }, btnW, btnH, null, 4);
    }

  } else if (h < 260) {
    // ── COMPACT STACKED CARD (Tag Match 3-Stack: H ~ 218px) ──
    const avatarX = x + 30;
    const avatarY = y + 54;
    const avatarSize = 44;

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    const detailX = x + 58;
    const detailW = w - 68;

    ctx.fillStyle = '#21050c';
    ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), detailW - 4), detailX, y + 28);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${def.type.toUpperCase()}`, detailW - 4), detailX, y + 40);

    drawStatBar(ctx, 'HP', def.hp, 150, detailX, y + 50, detailW, '#cc2b4d');
    drawStatBar(ctx, 'DMG', def.damage, 60, detailX, y + 64, detailW, '#f59e0b');
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, y + 78, detailW, '#7c2d37');

    // Mini Live Weapon preview sub-box
    const weaponBoxY = y + 96;
    const weaponBoxH = h - (weaponBoxY - y) - 34;
    const boxW = w - 16;

    ctx.save();
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, x + 8, weaponBoxY, boxW, weaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#b81c3b';
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

    ctx.fillStyle = '#21050c';
    ctx.font = '800 9px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 12, weaponBoxY + 17, boxW - 55, 11, 3);

    // Quick cycle arrows + Change Fighter Button
    const arrowW = 24;
    const changeBtnW = w - 16 - arrowW * 2 - 6;
    const btnH = 22;
    const btnY = y + h - btnH - 6;

    drawButton('◄', x + 8 + arrowW / 2, btnY + btnH / 2, () => cycleFighter(-1), arrowW, btnH, null, 3);
    drawButton('CHANGE', x + 8 + arrowW + 3 + changeBtnW / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, changeBtnW, btnH, null, 3);
    drawButton('►', x + w - 8 - arrowW / 2, btnY + btnH / 2, () => cycleFighter(1), arrowW, btnH, null, 3);

  } else {
    // ── MEDIUM CARD (2v2 / 1v2 Duo Stacked / FFA: H ~ 334px) ──
    const avatarX = x + 36;
    const avatarY = y + 64;
    const avatarSize = 54;

    if (previewImage) {
      ctx.drawImage(previewImage, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }

    const detailX = x + 72;
    const detailW = w - 82;

    ctx.fillStyle = '#21050c';
    ctx.font = '900 12.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), detailW - 4), detailX, y + 32);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${def.type.toUpperCase()}`, detailW - 4), detailX, y + 46);

    drawStatBar(ctx, 'HP', def.hp, 150, detailX, y + 58, detailW, '#cc2b4d');
    drawStatBar(ctx, 'DMG', def.damage, 60, detailX, y + 74, detailW, '#f59e0b');
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, detailX, y + 90, detailW, '#7c2d37');

    // Live Weapon preview sub-box
    const weaponBoxY = y + 112;
    const weaponBoxH = h - (weaponBoxY - y) - 44;
    const boxW = w - 18;

    ctx.save();
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, x + 9, weaponBoxY, boxW, weaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#b81c3b';
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

    ctx.fillStyle = '#21050c';
    ctx.font = '800 9.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 15, weaponBoxY + 18, boxW - 75, 12, 4);

    // Quick cycle arrows + Change Fighter Button
    const arrowW = 28;
    const changeBtnW = w - 18 - arrowW * 2 - 8;
    const btnH = 26;
    const btnY = y + h - btnH - 10;

    drawButton('◄', x + 9 + arrowW / 2, btnY + btnH / 2, () => cycleFighter(-1), arrowW, btnH, null, 3);
    drawButton('CHANGE', x + 9 + arrowW + 4 + changeBtnW / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, changeBtnW, btnH, null, 3);
    drawButton('►', x + w - 9 - arrowW / 2, btnY + btnH / 2, () => cycleFighter(1), arrowW, btnH, null, 3);
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
    const modalW = isLandscape ? Math.min(state.canvas.width - 40, 900) : Math.min(state.canvas.width - 20, 510);
    const modalH = isLandscape ? Math.min(state.canvas.height - 30, 490) : Math.min(state.canvas.height - 40, 600);
    const mx = (state.canvas.width - modalW) / 2;
    const my = (state.canvas.height - modalH) / 2;

    // If hovering anywhere over the modal or modal area
    if (mouseX >= mx - 20 && mouseX <= mx + modalW + 20 && mouseY >= my - 20 && mouseY <= my + modalH + 20) {
      e.preventDefault();
      const now = performance.now();
      if (now - _lastModalWheelTime > 140) {
        const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
          .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
        const itemsPerPage = isLandscape ? 15 : 15;
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
        
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

export { drawPlayerCard, drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, randomize1v1Fighters, selectingSlot, modalInspectIndex, modalPage, openFighterSelectModal, isFighterSelectModalOpen, closeFighterSelectModal, getSelectingSlot };
