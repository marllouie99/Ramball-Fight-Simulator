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
import { drawArenaDecorationSelector } from '../../systems/arenaDecorationSystem.js';
import { GAME_MODES, MODE_SETTINGS } from '../../core/modeConfig.js';
import { getBossConfig } from '../../configs/bosses/bossConfigRegistry.js';
import { drawGradeBadge } from '../../configs/gradeConfig.js';

const MODAL_ITEMS_PER_PAGE_PORTRAIT = 9;  // 3x3 grid in Portrait Mode
const MODAL_ITEMS_PER_PAGE_LANDSCAPE = 12; // 6x2 grid in Landscape Mode

function _getModalItemsPerPage() {
  const isLandscape = typeof state !== 'undefined' && state.canvas && (state.canvas.width > 600 || state.viewOrientation === 'horizontal');
  return isLandscape ? MODAL_ITEMS_PER_PAGE_LANDSCAPE : MODAL_ITEMS_PER_PAGE_PORTRAIT;
}

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;
let _lastModalWheelTime = 0;
let _lastCardWheelTime = 0;
let _lastCardClickTime = 0;
let _lastCardClickIdx = -1;
let _playerCardBounds = [];
let tlfsPoolPage = 0;
let _tlfsEnemyPoolBounds = null;
let _lastTlfsWheelTime = 0;


function drawSurvivorBriefingCard(x, y, w, h) {
  const { ctx } = state;
  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  ctx.fillRect(x + 4, y + 5, w, h);

  // Background
  ctx.fillStyle = '#0F1715';
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);

  // Header band
  const headerH = 34;
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(x + 2, y + 2, w - 4, headerH);
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 2, y + 2, w - 4, headerH);

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦇 CIRCLE SURVIVOR // MISSION BRIEFING', x + 12, y + headerH / 2 + 2);

  // Studio Config Button in Header
  drawButton('⚙️ STUDIO', x + w - 58, y + headerH / 2 + 1, () => {
    state.gameState = 'survivorStudio';
  }, 92, 22, '#059669', 3);

  // Content lines
  const sCfg = (typeof MODE_SETTINGS !== 'undefined' && MODE_SETTINGS[GAME_MODES.SURVIVOR]) || {};
  const sPool = Array.isArray(sCfg.enemyPool) && sCfg.enemyPool.length > 0 ? sCfg.enemyPool : ['knight'];
  const enemyNames = sPool.map(id => id.charAt(0).toUpperCase() + id.slice(1)).join(', ');
  const enemyDesc = sPool.length === 1 && sPool[0].toLowerCase() === 'knight'
    ? 'Endless waves of Armored Knights swarming inward'
    : `Endless swarms of ${enemyNames} swarming inward`;

  const startY = y + headerH + 20;
  const lines = [
    { icon: '⚔️', title: 'ENEMY SWARMS', desc: enemyDesc },
    { icon: '💎', title: 'XP GEMS & MAGNET', desc: 'Slain foes drop gems; vacuum pull to level up' },
    { icon: '⚡', title: '3-CARD UPGRADES', desc: 'Choose Orbiters, Garlic Aura, Kunai, Thunder, Scythe' },
    { icon: '🧱', title: 'BOUNCING WALLS', desc: 'Tactical ricochets off 5 interior walls & obstacles' },
    { icon: '⏱️', title: 'FINAL CLIMAX', desc: 'Survive to 3:00 and defeat The Dark Overlord!' }
  ];

  ctx.font = '11px "Segoe UI", Roboto, sans-serif';
  let curY = startY;
  for (let i = 0; i < lines.length; i++) {
    const item = lines[i];
    ctx.fillStyle = '#00FF66';
    ctx.fillText(`${item.icon} ${item.title}:`, x + 16, curY);
    ctx.fillStyle = '#CBD5E0';
    ctx.fillText(item.desc, x + 34, curY + 16);
    curY += 40;
  }

  // Footer badge
  const badgeY = y + h - 32;
  ctx.fillStyle = 'rgba(0, 255, 102, 0.12)';
  ctx.fillRect(x + 10, badgeY, w - 20, 24);
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 10, badgeY, w - 20, 24);

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 9.5px monospace';
  ctx.textAlign = 'center';
  const startHp = sCfg.playerFixedHp || 500;
  const matchSec = sCfg.matchDurationSec || 180;
  const mins = Math.floor(matchSec / 60);
  const secs = (matchSec % 60).toString().padStart(2, '0');
  ctx.fillText(`STARTING HP: ${startHp}  •  DURATION: ${mins}:${secs}  •  AUTO-ATTACK ENABLED`, x + w / 2, badgeY + 12);

  ctx.restore();
}

function drawTlfsEnemyPoolGrid(x, y, w, h) {
  const { ctx, canvas } = state;
  const isLandscape = (canvas && canvas.width > 600) || state.viewOrientation === 'horizontal';

  // 1. Resolve and sanitize pool fighters (exclude dummies & hidden fighters)
  const currentDefs = getActiveFighterDefs();
  const poolFighters = currentDefs
    .map((def, idx) => ({ def, idx }))
    .filter(({ def }) => def && def.type !== 'dummy' && def.isAvailableInArena !== false);

  // Auto-initialize if empty or corrupted
  if (!Array.isArray(state.tlfsAllowedEnemies) || state.tlfsAllowedEnemies.length === 0) {
    state.tlfsAllowedEnemies = poolFighters.map(f => f.idx);
  } else {
    const validIdxSet = new Set(poolFighters.map(f => f.idx));
    state.tlfsAllowedEnemies = state.tlfsAllowedEnemies.filter(i => validIdxSet.has(i));
    if (state.tlfsAllowedEnemies.length < 5 && poolFighters.length >= 5) {
      state.tlfsAllowedEnemies = poolFighters.slice(0, 5).map(f => f.idx);
    }
  }

  // 2. Base Container Frame & Deep Comic Drop Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  ctx.fillRect(x + 4, y + 5, w, h);

  ctx.fillStyle = '#12141C';
  ctx.fillRect(x, y, w, h);

  // Solid Black Manga Ink Outer Frame
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(x, y, w, h);

  // Subtle interior border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  // 3. Header Band
  const headerH = isLandscape ? 30 : 32;
  ctx.fillStyle = '#10121A';
  ctx.fillRect(x + 2, y + 2, w - 4, headerH);
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, w - 4, headerH);

  // Top accent amber pinstripe
  ctx.fillStyle = '#F5A623';
  ctx.fillRect(x + 8, y + 2, w - 16, 2.5);

  // Halftone wash in header
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, headerH);
  ctx.clip();
  _drawComicHalftoneField(ctx, x + 4, y + 2, w - 8, headerH, 'rgba(245, 166, 35, 0.22)');
  ctx.restore();

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔️ [ ENEMY GAUNTLET POOL ]', x + 14, y + headerH / 2 + 1);

  // Active Count Chip in Header Right
  const activeCount = state.tlfsAllowedEnemies.length;
  const isAllActive = activeCount === poolFighters.length;
  const chipText = `${activeCount} / ${poolFighters.length} ACTIVE`;
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  const chipW = ctx.measureText(chipText).width + 16;
  const chipH = 20;
  const chipX = x + w - chipW - 12;
  const chipY = y + (headerH - chipH) / 2 + 1;

  ctx.fillStyle = isAllActive ? 'rgba(245, 166, 35, 0.16)' : 'rgba(34, 197, 94, 0.16)';
  ctx.fillRect(chipX, chipY, chipW, chipH);
  ctx.strokeStyle = isAllActive ? '#F5A623' : '#22C55E';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(chipX, chipY, chipW, chipH);

  ctx.fillStyle = isAllActive ? '#FFE145' : '#4ADE80';
  ctx.textAlign = 'center';
  ctx.fillText(chipText, chipX + chipW / 2, chipY + chipH / 2 + 0.5);

  // 4. Sub-Header Toolbar Row (Quick Actions)
  const subH = isLandscape ? 26 : 28;
  const subY = y + headerH + 2;
  ctx.fillStyle = '#161924';
  ctx.fillRect(x + 2, subY, w - 4, subH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, subY + subH);
  ctx.lineTo(x + w - 2, subY + subH);
  ctx.stroke();

  // Sub-header left text: Run Info
  ctx.fillStyle = '#8B9BB4';
  ctx.font = '800 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const chalHp = MODE_SETTINGS[GAME_MODES.TLFS]?.challengerFixedHp || 500;
  ctx.fillText(`⚡ 5 CHALLENGERS • ${chalHp} HP`, x + 14, subY + subH / 2);

  // Sub-header right action buttons (Pills)
  const pillH = 18;
  const pillY = subY + (subH - pillH) / 2;

  // Button 1: [ ALL ]
  const allBtnW = isLandscape ? 44 : 52;
  const allBtnX = x + w - allBtnW - 12;
  drawButton('ALL', allBtnX + allBtnW / 2, pillY + pillH / 2, () => {
    state.tlfsAllowedEnemies = poolFighters.map(f => f.idx);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash5', 0.12);
    }
  }, allBtnW, pillH, '#202636', 3);

  // Button 2: [ RANDOM 5 ]
  const rand5BtnW = isLandscape ? 66 : 74;
  const rand5BtnX = allBtnX - rand5BtnW - 6;
  drawButton('RANDOM 5', rand5BtnX + rand5BtnW / 2, pillY + pillH / 2, () => {
    const shuffled = [...poolFighters].sort(() => Math.random() - 0.5);
    state.tlfsAllowedEnemies = shuffled.slice(0, 5).map(f => f.idx);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash5', 0.12);
    }
  }, rand5BtnW, pillH, '#202636', 3);

  // Button 3: [ RANDOM 10 ]
  const rand10BtnW = isLandscape ? 70 : 78;
  const rand10BtnX = rand5BtnX - rand10BtnW - 6;
  drawButton('RANDOM 10', rand10BtnX + rand10BtnW / 2, pillY + pillH / 2, () => {
    const shuffled = [...poolFighters].sort(() => Math.random() - 0.5);
    state.tlfsAllowedEnemies = shuffled.slice(0, Math.min(10, shuffled.length)).map(f => f.idx);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash5', 0.12);
    }
  }, rand10BtnW, pillH, '#202636', 3);

  // 5. Grid Metrics & Pagination Calculations
  const footerH = isLandscape ? 30 : 34;
  const gridTop = subY + subH;
  const gridH = h - (headerH + 2) - subH - footerH;

  const cols = isLandscape ? (w > 380 ? 6 : 5) : (w > 400 ? 6 : 4);
  const rows = isLandscape ? (gridH > 180 ? 3 : 2) : 4;
  const itemsPerPage = cols * rows;
  const totalPages = Math.max(1, Math.ceil(poolFighters.length / itemsPerPage));
  tlfsPoolPage = Math.max(0, Math.min(tlfsPoolPage, totalPages - 1));

  // Store bounds for mouse wheel listener
  _tlfsEnemyPoolBounds = { x, y, w, h, totalPages };

  const paddingX = 10;
  const paddingY = 6;
  const gapX = 6;
  const gapY = 6;
  const cellW = Math.floor((w - paddingX * 2 - gapX * (cols - 1)) / cols);
  const cellH = Math.floor((gridH - paddingY * 2 - gapY * (rows - 1)) / rows);

  // 6. Draw Grid with Strict Bounding Clip
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, gridTop, w - 4, gridH);
  ctx.clip();

  const pageStart = tlfsPoolPage * itemsPerPage;
  const pageSlice = poolFighters.slice(pageStart, pageStart + itemsPerPage);

  pageSlice.forEach(({ def, idx }, pos) => {
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const cellX = x + paddingX + col * (cellW + gapX);
    const cellY = gridTop + paddingY + row * (cellH + gapY);

    const isSelected = state.tlfsAllowedEnemies.includes(idx);

    ctx.save();
    // 1. Clip inside cell to prevent any overflow outside cell boundary
    ctx.beginPath();
    ctx.rect(cellX + 1, cellY + 1, cellW - 2, cellH - 2);
    ctx.clip();

    if (isSelected) {
      // Selected Active Card
      ctx.fillStyle = '#1B2130';
      ctx.fillRect(cellX, cellY, cellW, cellH);

      // Subtle top inner ambient highlight
      const topGrad = ctx.createLinearGradient(cellX, cellY, cellX, cellY + cellH * 0.4);
      topGrad.addColorStop(0, 'rgba(245, 166, 35, 0.16)');
      topGrad.addColorStop(1, 'rgba(245, 166, 35, 0.0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(cellX, cellY, cellW, cellH * 0.4);
    } else {
      // Muted Excluded Card
      ctx.fillStyle = '#0D0F15';
      ctx.fillRect(cellX, cellY, cellW, cellH);
    }

    // 2. Fighter Character Model / Avatar Display (Scaled Boldly & Centered)
    const stickerImg = getFighterStickerPreview(idx) || getFighterPreview(idx);
    const availableAvatarH = cellH - 15;
    const avatarCX = cellX + cellW / 2;
    const avatarCY = cellY + availableAvatarH / 2 + 1;
    const destSize = Math.round(availableAvatarH * 2.85);

    if (!isSelected) {
      ctx.globalAlpha = 0.28; // Ghosted dimmed silhouette for excluded challengers
    }

    if (stickerImg) {
      const srcW = stickerImg.width || 256;
      const srcH = stickerImg.height || 256;
      ctx.drawImage(stickerImg, 0, 0, srcW, srcH, avatarCX - destSize / 2, avatarCY - destSize / 2, destSize, destSize);
    } else {
      drawSmallFighterBadge(ctx, def, avatarCX, avatarCY, Math.min(cellW - 14, cellH - 18, 44));
    }

    ctx.globalAlpha = 1.0;

    // 3. Nameplate background pill & text
    ctx.fillStyle = isSelected ? 'rgba(10, 12, 18, 0.72)' : 'rgba(5, 7, 10, 0.65)';
    ctx.fillRect(cellX + 2, cellY + cellH - 14, cellW - 4, 12);

    ctx.fillStyle = isSelected ? '#FFFFFF' : '#4E5A70';
    ctx.font = '800 8.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let nameStr = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
    nameStr = nameStr.toUpperCase();
    const maxTextW = cellW - 6;
    if (ctx.measureText(nameStr).width > maxTextW) {
      while (nameStr.length > 3 && ctx.measureText(nameStr + '..').width > maxTextW) {
        nameStr = nameStr.slice(0, -1);
      }
      nameStr += '..';
    }
    ctx.fillText(nameStr, cellX + cellW / 2, cellY + cellH - 8);

    ctx.restore(); // Restore cell clip

    // 4. Cell Border & Corner Status Indicator (Drawn on top of clip for crisp pixel edges)
    ctx.save();
    if (isSelected) {
      ctx.strokeStyle = '#F5A623';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(cellX, cellY, cellW, cellH);

      // Active Gold Pip in top-right corner
      ctx.fillStyle = '#FFE145';
      ctx.fillRect(cellX + cellW - 7, cellY + 3, 4, 4);
    } else {
      ctx.strokeStyle = '#1E2332';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(cellX, cellY, cellW, cellH);

      // Inactive dash in top-right corner
      ctx.fillStyle = '#3E465A';
      ctx.fillRect(cellX + cellW - 8, cellY + 4, 5, 2);
    }
    ctx.restore();

    // Click handler to toggle selection
    _registerButton(cellX, cellY, cellW, cellH, () => {
      if (isSelected) {
        if (state.tlfsAllowedEnemies.length <= 5) {
          spawnFloatingText(cellX + cellW / 2, cellY + 10, 'MINIMUM 5 ENEMIES REQUIRED!', '#EF4444');
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.2);
          }
          return;
        }
        state.tlfsAllowedEnemies = state.tlfsAllowedEnemies.filter(i => i !== idx);
      } else {
        state.tlfsAllowedEnemies.push(idx);
      }
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    });
  });

  ctx.restore(); // Restore grid clipping

  // 7. Pagination Footer Bar
  const footerY = y + h - footerH;
  ctx.fillStyle = '#10121A';
  ctx.fillRect(x + 2, footerY, w - 4, footerH - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, footerY);
  ctx.lineTo(x + w - 2, footerY);
  ctx.stroke();

  const navBtnW = 62;
  const navBtnH = 22;
  const navBtnCenterY = footerY + footerH / 2 - 1;

  // Previous Page Button
  const prevDisabled = tlfsPoolPage === 0;
  drawButton('◀ PREV', x + 12 + navBtnW / 2, navBtnCenterY, () => {
    if (tlfsPoolPage > 0) {
      tlfsPoolPage--;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, navBtnW, navBtnH, prevDisabled ? '#151822' : '#20242E', 3);

  // Next Page Button
  const nextDisabled = tlfsPoolPage >= totalPages - 1;
  drawButton('NEXT ▶', x + w - 12 - navBtnW / 2, navBtnCenterY, () => {
    if (tlfsPoolPage < totalPages - 1) {
      tlfsPoolPage++;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, navBtnW, navBtnH, nextDisabled ? '#151822' : '#20242E', 3);

  // Center Page Indicator & Diamonds
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const curP = String(tlfsPoolPage + 1).padStart(2, '0');
  const totP = String(totalPages).padStart(2, '0');
  ctx.fillText(`PAGE // [ ${curP} / ${totP} ]`, x + w / 2 - 28, navBtnCenterY);

  // Clickable Page Diamonds
  const dotSpacing = 12;
  const dotsStartX = x + w / 2 + 28;
  for (let p = 0; p < totalPages; p++) {
    const dotX = dotsStartX + p * dotSpacing;
    const isCurrentPage = p === tlfsPoolPage;
    ctx.fillStyle = isCurrentPage ? '#F5A623' : '#333846';
    ctx.save();
    ctx.translate(dotX, navBtnCenterY);
    ctx.rotate(Math.PI / 4);
    const dotSize = isCurrentPage ? 6 : 4;
    ctx.fillRect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
    ctx.restore();

    // Click diamond to jump to page
    _registerButton(dotX - 6, navBtnCenterY - 6, 12, 12, () => {
      if (tlfsPoolPage !== p) {
        tlfsPoolPage = p;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    });
  }

  ctx.restore(); // Restore outer frame context
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
  const modalW = isLandscape ? Math.min(canvas.width - 28, 912) : Math.min(canvas.width - 20, 516);
  const modalH = isLandscape ? Math.min(canvas.height - 20, 508) : Math.min(canvas.height - 36, 760);
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

  const itemsPerPage = _getModalItemsPerPage();
  const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
  modalPage = Math.max(0, Math.min(totalPages - 1, modalPage));

  const startIdx = modalPage * itemsPerPage;
  const pageFighters = modalAvailableFighters.slice(startIdx, startIdx + itemsPerPage);

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
    // ── PORTRAIT (540x960): Scaled-Up 3x3 Full-Width Collector Card Grid (9 Cards) ──
    const cols = 3;
    const cardW = 156;
    const cardH = 170;
    const listX = mx + 12;
    const availW = modalW - 24;
    const gapX = Math.floor((availW - cols * cardW) / (cols - 1));
    const gapY = 12;
    const rowStride = cardH + gapY;
    const listY = my + 44;

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

    // Pagination Dock (Immediately below 3rd row of scaled cards)
    const paginationY = listY + 2 * rowStride + cardH + 6;
    _drawModalPaginationDock(ctx, listX, paginationY, availW, 28, totalPages);

    // Compact Selected Fighter Dossier Bar (Stats, Ability, Live Weapon Stage)
    const dossierY = paginationY + 34;
    drawCompactFighterDossierBar(ctx, selectedDef, modalWeaponInfo, listX, dossierY, availW, 84);

    // Bottom Action Footer: CANCEL & LOCK IN
    const footerY = dossierY + 84 + 24;
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
  drawDynamicVsClashEmblem(ctx, vsX, vsY, false);
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

function _drawComicCutInStage(ctx, def, fighterIndex, weaponInfo, isP1, palette, isMirrored = false, slotTag = null, teamTag = null) {
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
  const displaySlot = slotTag || (isP1 ? 'P1' : 'P2');
  const displayTeam = teamTag || (isP1 ? 'RED' : 'BLU');
  const blocks = isMirrored ? [
    { txt: displaySlot, bg: '#090A0F', fg: '#FFFFFF' },
    { txt: displayTeam, bg: palette.primary, fg: '#FFFFFF' },
    { txt: '▶', bg: '#090A0F', fg: '#FFFFFF' },
    { txt: '◀', bg: '#090A0F', fg: '#FFFFFF' },
  ] : [
    { txt: displaySlot, bg: '#090A0F', fg: '#FFFFFF' },
    { txt: displayTeam, bg: palette.primary, fg: '#FFFFFF' },
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

function _drawComicSteppedInfoStack(ctx, def, fighterIndex, isP1, palette, isMirrored = false, slotTag = null, slotLetter = null) {
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
  ctx.fillText(slotTag || (isP1 ? 'P1' : 'P2'), 0, 0.5);

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
  ctx.fillText(`VX:${String(fighterIndex + 1).padStart(2, '0')}-${slotLetter || (isP1 ? 'A' : 'B')}`, isMirrored ? -134 : 134, -14);
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

function drawTcgFighterSlotCard(slotProp, title, x, y, w, h, isP1, enabled, isMirrored = null, customSlotTag = null, customSlotLetter = null) {
  const { ctx } = state;
  const isAnyModalOpen = (selectingSlot !== null || isArenaBgmModalOpen() || isArenaFloorModalOpen());
  const isInteractive = enabled && !isAnyModalOpen;

  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];

  const slotTag = customSlotTag || (
    slotProp === 'p1Index' ? 'P1' :
    slotProp === 'p2Index' ? 'P2' :
    slotProp === 'p3Index' ? 'P3' :
    slotProp === 'p4Index' ? 'P4' :
    slotProp === 'p5Index' ? 'P5' :
    slotProp === 'p6Index' ? 'P6' : (isP1 ? 'P1' : 'P2')
  );

  const slotLetter = customSlotLetter || (
    slotProp === 'p1Index' ? 'A' :
    slotProp === 'p2Index' ? 'B' :
    slotProp === 'p3Index' ? 'C' :
    slotProp === 'p4Index' ? 'D' :
    slotProp === 'p5Index' ? 'E' :
    slotProp === 'p6Index' ? 'F' : (isP1 ? 'A' : 'B')
  );

  const teamTag = isP1 ? 'RED' : 'BLU';
  const teamColor = isP1 ? '#EF4444' : '#38BDF8';

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

  // Dimensions & Aspect ratio matching Pokémon TCG Collector Card (156 : 170)
  const isCompact = w < 180;
  const hdrH = isCompact ? 24 : 26;
  const btnH = isCompact ? 26 : 28;
  const gap = isCompact ? 5 : 6;

  // Compute maximum card dimensions that preserve the authentic TCG aspect ratio
  const maxCardH = Math.max(130, h - hdrH - btnH - gap * 2);
  const idealCardW = Math.round(maxCardH * (156 / 170));
  const cardW = Math.min(w, idealCardW);
  const cardH = Math.round(cardW * (170 / 156));

  const totalSlotW = cardW;
  const slotX = Math.round(x + (w - totalSlotW) / 2);
  const cardY = y + hdrH + gap;
  const btnY = cardY + cardH + gap;

  if (isInteractive) {
    _playerCardBounds.push({ slotProp, x: slotX, y, w: totalSlotW, h: (btnY + btnH - y) });
  }

  // ── 1. Top Tactical Slot Header (Team Badge + Quick Cycle Buttons) ──
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  drawChamferedRect(ctx, slotX + 2, y + 2, totalSlotW, hdrH, 3);
  ctx.fill();

  // Header base
  ctx.fillStyle = '#12151E';
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, slotX, y, totalSlotW, hdrH, 3);
  ctx.fill();
  ctx.stroke();

  // Left team color stripe
  ctx.fillStyle = teamColor;
  ctx.fillRect(slotX + 3, y + 3, 4, hdrH - 6);

  // Role title text: [P1 // RED] or [BOSS // RED]
  const displayTitle = customSlotTag ? `[ ${slotTag} ]` : (title ? `[ ${slotTag} // ${teamTag} ]` : `[ ${slotTag} ]`);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = isCompact ? '900 9.5px "Outfit", "Rajdhani", sans-serif' : '900 10.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayTitle, slotX + 11, y + hdrH / 2);

  // Quick-cycle buttons on right: [◀] and [▶]
  const arrowSize = isCompact ? 16 : 18;
  const prevX = slotX + totalSlotW - arrowSize * 2 - (isCompact ? 5 : 8);
  const nextX = slotX + totalSlotW - arrowSize - (isCompact ? 3 : 4);
  const arrowY = y + (hdrH - arrowSize) / 2;

  const drawCycleBtn = (bx, by, label, onClk) => {
    ctx.save();
    ctx.fillStyle = '#090B10';
    ctx.strokeStyle = '#282D3C';
    ctx.lineWidth = 1.2;
    drawChamferedRect(ctx, bx, by, arrowSize, arrowSize, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFE145';
    ctx.font = '900 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + arrowSize / 2, by + arrowSize / 2 + 0.5);
    ctx.restore();

    if (isInteractive) {
      _registerButton(bx, by, arrowSize, arrowSize, onClk);
    }
  };

  drawCycleBtn(prevX, arrowY, '◀', () => cycleFighter(-1));
  drawCycleBtn(nextX, arrowY, '▶', () => cycleFighter(1));

  ctx.restore(); // End Header

  // ── 2. Pokémon TCG Collector Card (Direct from Character Selection Menu) ──
  drawCollectorFighterCard(
    ctx,
    def,
    fighterIndex,
    slotX,
    cardY,
    cardW,
    cardH,
    false,
    () => openFighterSelectModal(slotProp, fighterIndex)
  );

  // ── 3. Bottom "SELECT FIGHTER ⯈" Action Button ──
  ctx.save();
  // Button drop shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  drawChamferedRect(ctx, slotX + 2, btnY + 2, totalSlotW, btnH, 3);
  ctx.fill();

  // Button body
  ctx.fillStyle = '#0D1017';
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, slotX, btnY, totalSlotW, btnH, 3);
  ctx.fill();
  ctx.stroke();

  // Sheen sweep across button
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const t = now * 0.001 + (fighterIndex * 0.5);
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, slotX, btnY, totalSlotW, btnH, 3);
  ctx.clip();
  const sheenP = (t * 0.75) % 1.0;
  const sheenX = slotX - 30 + sheenP * (totalSlotW + 60);
  const sheenGrad = ctx.createLinearGradient(sheenX - 15, btnY, sheenX + 15, btnY + btnH);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(slotX, btnY, totalSlotW, btnH);
  ctx.restore();

  // Button text + animated arrow
  const arrowSlide = Math.sin(t * 6.0) * 2.0;
  const isCompactBtn = totalSlotW < 170;
  const btnTxt = isCompactBtn ? 'SELECT' : 'SELECT FIGHTER';
  ctx.font = isCompactBtn ? '900 10px "Outfit", "Impact", "Rajdhani", sans-serif' : '900 11px "Outfit", "Impact", "Rajdhani", sans-serif';
  const txtW = ctx.measureText(btnTxt).width;
  const contentW = txtW + 16;
  const startX = slotX + (totalSlotW - contentW) / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(btnTxt, startX, btnY + btnH / 2 + 0.5);

  ctx.fillStyle = '#FFE145';
  ctx.fillText('⯈', startX + txtW + 8 + arrowSlide, btnY + btnH / 2 + 0.5);
  ctx.restore();

  if (isInteractive) {
    _registerButton(slotX, btnY, totalSlotW, btnH, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    });
  }
}

function _drawTeamHeaderBar(ctx, x, y, w, h, title, teamColor, isP1) {
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  drawChamferedRect(ctx, x + 2, y + 2, w, h, 3);
  ctx.fill();

  // Dark tactical carbon base
  ctx.fillStyle = '#141720';
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();

  // Color accent stripe on leading edge
  ctx.fillStyle = teamColor;
  ctx.fillRect(isP1 ? x + 4 : x + w - 10, y + 3, 6, h - 6);

  // Subtle interior gradient glow
  const glowGrad = ctx.createLinearGradient(x, y, x + w, y);
  if (isP1) {
    glowGrad.addColorStop(0.0, 'rgba(239, 68, 68, 0.18)');
    glowGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.0)');
  } else {
    glowGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.0)');
    glowGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0.18)');
  }
  ctx.fillStyle = glowGrad;
  drawChamferedRect(ctx, x + 1, y + 1, w - 2, h - 2, 2.5);
  ctx.fill();

  // Squad Title text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + h / 2 + 0.5);

  // Squad tag on flank
  ctx.fillStyle = teamColor;
  ctx.font = '900 9px "Outfit", sans-serif';
  ctx.textAlign = isP1 ? 'right' : 'left';
  ctx.fillText(isP1 ? 'TEAM RED' : 'TEAM BLUE', isP1 ? x + w - 14 : x + 18, y + h / 2 + 0.5);

  ctx.restore();
}

function drawHeroicFighterCard(slotProp, title, x, y, w, h, isP1, enabled, isMirrored = null, customSlotTag = null, customSlotLetter = null) {
  return drawTcgFighterSlotCard(slotProp, title, x, y, w, h, isP1, enabled, isMirrored, customSlotTag, customSlotLetter);
}

let _cachedDotGridPattern = null;
function _getDotGridPattern(ctx) {
  if (_cachedDotGridPattern) return _cachedDotGridPattern;
  if (typeof document === 'undefined') return null;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 18;
  pCanvas.height = 18;
  const pCtx = pCanvas.getContext('2d');
  if (pCtx) {
    pCtx.fillStyle = 'rgba(245, 166, 35, 0.035)';
    pCtx.fillRect(8, 8, 2, 2);
    _cachedDotGridPattern = ctx.createPattern(pCanvas, 'repeat');
  }
  return _cachedDotGridPattern;
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

  // Subtle Dot Grid (Cached Pattern)
  const dotPattern = _getDotGridPattern(ctx);
  if (dotPattern) {
    ctx.fillStyle = dotPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  const isGauntlet = mode === 'TLFS' || mode === GAME_MODES.TLFS;

  // Screen Title Badge
  ctx.save();
  const rawTitle = isTag ? '3 VS 3 TAG MATCH' : (isRegular1v2 ? '1 VS 2 BATTLE' : (isGauntlet ? 'THE GAUNTLET RUN' : 'FIGHT OF LARPERS 101'));
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

  // Sub-Controls (Boss Battle Team Toggle, Arena BGM, Arena Floor & Arena Decoration)
  const isBossBattleMode = (mode === 'Boss Battle' || mode === GAME_MODES.BOSS_BATTLE || mode === '1v2 Stand Off' || mode === GAME_MODES.STAND_OFF_1V2 || mode === 'STAND_OFF_1V2');
  const teamToggleW = isBossBattleMode ? 120 : 0;
  const bgmW = isBossBattleMode ? 96 : 110;
  const floorW = isBossBattleMode ? 96 : 110;
  const decoW = isBossBattleMode ? 96 : 110;
  const ctrlH = 24;
  const gap = isBossBattleMode ? 6 : 8;
  const totalCtrlW = (isBossBattleMode ? teamToggleW + gap : 0) + bgmW + gap + floorW + gap + decoW;
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
  curCtrlX += floorW + gap;

  // Arena Decoration / Seasonal Event Toggle Button
  drawArenaDecorationSelector(ctx, curCtrlX, tmY, decoW, ctrlH);

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
    const currentDefs = getActiveFighterDefs();

    if (isLandscape) {
      const bannerW = Math.floor((totalCardW - cardGap) / 2);
      const bannerH = 280;
      const leftX = margin;
      const rightX = margin + bannerW + cardGap;
      const duoW = Math.floor((bannerW - 10) / 2);

      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', leftX, topY + 10, bannerW, bannerH, true, true, false, 'P1', 'A');
      drawHeroicFighterCard('p2Index', 'PLAYER 2 // BLUE', rightX, topY + 10, duoW, bannerH, false, true, true, 'P2', 'B');
      drawHeroicFighterCard('p3Index', 'PLAYER 3 // BLUE', rightX + duoW + 10, topY + 10, duoW, bannerH, false, true, true, 'P3', 'C');

      drawDynamicVsClashEmblem(ctx, canvas.width / 2, topY + bannerH / 2 + 10, true);
      drawBottomCommandDeck('START 1V2 BATTLE', () => startGame(), () => randomize1v2Fighters());
    } else {
      // Portrait: Exactly matches user's comic deployment screen!
      // Top: Player 1 (Red) full-width Heroic Banner
      // Center: Dynamic VS Clash Emblem
      // Bottom: Two side-by-side Heroic Banners (P2 on left, P3 on right, both mirrored)
      const bannerW = canvas.width - 36; // 504px
      const bannerX = 18;
      const p1Y = 120;
      const p1H = 270;

      drawHeroicFighterCard('p1Index', 'PLAYER 1 // RED', bannerX, p1Y, bannerW, p1H, true, true, false, 'P1', 'A');

      const vsY = Math.round(p1Y + p1H + 32); // ~422
      drawDynamicVsClashEmblem(ctx, canvas.width / 2, vsY, false);

      const duoGap = 10;
      const duoCardW = Math.floor((bannerW - duoGap) / 2); // 247px
      const duoY = vsY + 34; // ~456
      const duoH = 270; // Clean uniform proportion matching the TCG aesthetic

      drawHeroicFighterCard('p2Index', 'PLAYER 2 // BLUE', bannerX, duoY, duoCardW, duoH, false, true, true, 'P2', 'B');
      drawHeroicFighterCard('p3Index', 'PLAYER 3 // BLUE', bannerX + duoCardW + duoGap, duoY, duoCardW, duoH, false, true, true, 'P3', 'C');

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

        drawHeroicFighterCard('p1Index', bossCardTitle, leftX, bannerY, bannerW, bannerH, true, true, false, 'BOSS', 'A');
        drawHeroicFighterCard('p2Index', 'SOLO CHALLENGER', rightX, bannerY, bannerW, bannerH, false, true, true, 'P1', 'B');

        drawDynamicVsClashEmblem(ctx, canvas.width / 2, bannerY + bannerH / 2, true);
        drawBottomCommandDeck('START SOLO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      } else {
        const bannerW = canvas.width - 36;
        const bannerH = 280;
        const bannerX = 18;
        const p1Y = 128;
        const p2Y = 468;

        drawHeroicFighterCard('p1Index', bossCardTitle, bannerX, p1Y, bannerW, bannerH, true, true, false, 'BOSS', 'A');
        drawHeroicFighterCard('p2Index', 'SOLO CHALLENGER', bannerX, p2Y, bannerW, bannerH, false, true, true, 'P1', 'B');

        drawDynamicVsClashEmblem(ctx, canvas.width / 2, Math.round((p1Y + bannerH + p2Y) / 2), false);
        drawBottomCommandDeck('START SOLO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      }
    } else {
      // 1v2 Duo Challengers vs Boss (Boss top, Duo Challengers side-by-side bottom)
      if (isLandscape) {
        const bannerW = Math.floor((totalCardW - cardGap) / 2);
        const bannerH = 280;
        const leftX = margin;
        const rightX = margin + bannerW + cardGap;
        const duoW = Math.floor((bannerW - 10) / 2);

        drawHeroicFighterCard('p1Index', bossCardTitle, leftX, topY + 10, bannerW, bannerH, true, true, false, 'BOSS', 'A');
        drawHeroicFighterCard('p2Index', 'CHALLENGER 1', rightX, topY + 10, duoW, bannerH, false, true, true, 'P1', 'B');
        drawHeroicFighterCard('p3Index', 'CHALLENGER 2', rightX + duoW + 10, topY + 10, duoW, bannerH, false, true, true, 'P2', 'C');

        drawDynamicVsClashEmblem(ctx, canvas.width / 2, topY + bannerH / 2 + 10, true);
        drawBottomCommandDeck('START DUO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      } else {
        const bannerW = canvas.width - 36;
        const bannerX = 18;
        const p1Y = 120;
        const p1H = 270;

        drawHeroicFighterCard('p1Index', bossCardTitle, bannerX, p1Y, bannerW, p1H, true, true, false, 'BOSS', 'A');

        const vsY = Math.round(p1Y + p1H + 32);
        drawDynamicVsClashEmblem(ctx, canvas.width / 2, vsY, false);

        const duoGap = 10;
        const duoCardW = Math.floor((bannerW - duoGap) / 2);
        const duoY = vsY + 34;
        const duoH = 270;

        drawHeroicFighterCard('p2Index', 'CHALLENGER 1', bannerX, duoY, duoCardW, duoH, false, true, true, 'P1', 'B');
        drawHeroicFighterCard('p3Index', 'CHALLENGER 2', bannerX + duoCardW + duoGap, duoY, duoCardW, duoH, false, true, true, 'P2', 'C');

        drawBottomCommandDeck('START DUO BOSS BATTLE', () => startGame(), () => randomize1v2Fighters());
      }
    }

  } else if (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO || mode === 'TWO_VS_TWO') {
    if (isLandscape) {
      const colW = Math.floor((totalCardW - cardGap) / 2);
      const leftX = margin;
      const rightX = margin + colW + cardGap;
      const bannerH = 280;
      const duoW = Math.floor((colW - 10) / 2);

      // Red Team (P1, P3 side-by-side)
      drawHeroicFighterCard('p1Index', 'RED // SQUAD 1', leftX, topY + 10, duoW, bannerH, true, true, false, 'P1', 'A');
      drawHeroicFighterCard('p3Index', 'RED // SQUAD 2', leftX + duoW + 10, topY + 10, duoW, bannerH, true, true, false, 'P3', 'B');

      // Blue Team (P2, P4 side-by-side)
      drawHeroicFighterCard('p2Index', 'BLUE // SQUAD 1', rightX, topY + 10, duoW, bannerH, false, true, true, 'P2', 'C');
      drawHeroicFighterCard('p4Index', 'BLUE // SQUAD 2', rightX + duoW + 10, topY + 10, duoW, bannerH, false, true, true, 'P4', 'D');

      drawDynamicVsClashEmblem(ctx, canvas.width / 2, topY + bannerH / 2 + 10, true);
      drawBottomCommandDeck('START 2V2 DUO', () => startGame(), () => randomizeFfaFighters());
    } else {
      // Portrait: 4 cards visible on screen simultaneously!
      // Top row: Red Team (P1 on left, P3 on right)
      // Center: Dynamic VS Clash Emblem
      // Bottom row: Blue Team (P2 on left, P4 on right)
      const bannerW = canvas.width - 36;
      const bannerX = 18;
      const duoGap = 10;
      const duoCardW = Math.floor((bannerW - duoGap) / 2);
      const cardH = 270;

      const topY0 = 120;
      drawHeroicFighterCard('p1Index', 'RED // SQUAD 1', bannerX, topY0, duoCardW, cardH, true, true, false, 'P1', 'A');
      drawHeroicFighterCard('p3Index', 'RED // SQUAD 2', bannerX + duoCardW + duoGap, topY0, duoCardW, cardH, true, true, false, 'P3', 'B');

      const vsY = topY0 + cardH + 30; // ~420
      drawDynamicVsClashEmblem(ctx, canvas.width / 2, vsY, false);

      const botY0 = vsY + 32; // ~452
      drawHeroicFighterCard('p2Index', 'BLUE // SQUAD 1', bannerX, botY0, duoCardW, cardH, false, true, true, 'P2', 'C');
      drawHeroicFighterCard('p4Index', 'BLUE // SQUAD 2', bannerX + duoCardW + duoGap, botY0, duoCardW, cardH, false, true, true, 'P4', 'D');

      drawBottomCommandDeck('START 2V2 DUO', () => startGame(), () => randomizeFfaFighters());
    }

  } else if (mode === 'FFA' || mode === GAME_MODES.FFA || mode === 'FFA 4-Way') {
    const isHorizontal = state.viewOrientation === 'horizontal';
    if (isHorizontal) {
      const colW = Math.floor((totalCardW - cardGap) / 2);
      const leftX = margin;
      const rightX = margin + colW + cardGap;
      const bannerH = 280;
      const duoW = Math.floor((colW - 10) / 2);

      drawHeroicFighterCard('p1Index', 'PLAYER 1', leftX, topY + 10, duoW, bannerH, true, true, false, 'P1', 'A');
      drawHeroicFighterCard('p3Index', 'PLAYER 3', leftX + duoW + 10, topY + 10, duoW, bannerH, false, true, false, 'P3', 'C');
      drawHeroicFighterCard('p2Index', 'PLAYER 2', rightX, topY + 10, duoW, bannerH, false, true, true, 'P2', 'B');
      drawHeroicFighterCard('p4Index', 'PLAYER 4', rightX + duoW + 10, topY + 10, duoW, bannerH, false, true, true, 'P4', 'D');

      drawDynamicVsClashEmblem(ctx, canvas.width / 2, topY + bannerH / 2 + 10, true);
      drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomizeFfaFighters());
    } else {
      // 3-player vertical layout: P1 full-width on top, P2 and P3 side-by-side at bottom!
      const bannerW = canvas.width - 36;
      const bannerX = 18;
      const p1Y = 120;
      const p1H = 270;

      drawHeroicFighterCard('p1Index', 'PLAYER 1', bannerX, p1Y, bannerW, p1H, true, true, false, 'P1', 'A');

      const vsY = Math.round(p1Y + p1H + 32);
      drawDynamicVsClashEmblem(ctx, canvas.width / 2, vsY, false);

      const duoGap = 10;
      const duoCardW = Math.floor((bannerW - duoGap) / 2);
      const duoY = vsY + 34;
      const duoH = 270;

      drawHeroicFighterCard('p2Index', 'PLAYER 2', bannerX, duoY, duoCardW, duoH, false, true, true, 'P2', 'B');
      drawHeroicFighterCard('p3Index', 'PLAYER 3', bannerX + duoCardW + duoGap, duoY, duoCardW, duoH, false, true, true, 'P3', 'C');

      drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomizeFfaFighters());
    }

  } else if (mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH') {
    if (isLandscape) {
      // Landscape 3v3 Tag Match: Left (Red Squad 3 Cards) vs Right (Blue Squad 3 Cards)
      const bannerW = Math.floor((totalCardW - cardGap) / 2);
      const bannerH = 268;
      const leftX = margin;
      const rightX = margin + bannerW + cardGap;
      const headerH = 22;
      const headerY = topY + 4;
      const cardY = headerY + headerH + 6;
      const slotGap = 8;
      const slotW = Math.floor((bannerW - slotGap * 2) / 3);

      _drawTeamHeaderBar(ctx, leftX, headerY, bannerW, headerH, '[ RED SQUAD // 3 COMBATANTS ]', '#EF4444', true);
      _drawTeamHeaderBar(ctx, rightX, headerY, bannerW, headerH, '[ BLUE SQUAD // 3 COMBATANTS ]', '#38BDF8', false);

      drawHeroicFighterCard('p1Index', 'LEAD', leftX, cardY, slotW, bannerH, true, true, false, 'SLOT 1', 'A');
      drawHeroicFighterCard('p3Index', 'MID', leftX + slotW + slotGap, cardY, slotW, bannerH, true, true, false, 'SLOT 2', 'B');
      drawHeroicFighterCard('p5Index', 'ANCHOR', leftX + (slotW + slotGap) * 2, cardY, slotW, bannerH, true, true, false, 'SLOT 3', 'C');

      drawDynamicVsClashEmblem(ctx, canvas.width / 2, cardY + bannerH / 2, true);

      drawHeroicFighterCard('p2Index', 'LEAD', rightX, cardY, slotW, bannerH, false, true, true, 'SLOT 1', 'D');
      drawHeroicFighterCard('p4Index', 'MID', rightX + slotW + slotGap, cardY, slotW, bannerH, false, true, true, 'SLOT 2', 'E');
      drawHeroicFighterCard('p6Index', 'ANCHOR', rightX + (slotW + slotGap) * 2, cardY, slotW, bannerH, false, true, true, 'SLOT 3', 'F');

      drawBottomCommandDeck('START TAG MATCH', () => startGame(), () => randomizeTagMatchFighters());
    } else {
      // Portrait 3v3 Tag Match: All 6 Pokémon TCG Collector Cards visible simultaneously!
      // Top: Red Squad (3 Cards Side-by-Side)
      // Center: Dynamic VS Clash Emblem
      // Bottom: Blue Squad (3 Cards Side-by-Side)
      const bannerW = canvas.width - 36; // 504px
      const bannerX = 18;
      const cardGap = 12;
      const slotW = Math.floor((bannerW - cardGap * 2) / 3); // 160px
      const cardSlotH = 248;
      const teamHdrH = 24;

      // 1. Red Squad Section
      const redHdrY = 114;
      _drawTeamHeaderBar(ctx, bannerX, redHdrY, bannerW, teamHdrH, '[ RED SQUAD // 3 COMBATANTS ]', '#EF4444', true);
      const row1Y = redHdrY + teamHdrH + 6; // 144
      drawHeroicFighterCard('p1Index', 'LEAD', bannerX, row1Y, slotW, cardSlotH, true, true, false, 'SLOT 1', 'A');
      drawHeroicFighterCard('p3Index', 'MID', bannerX + slotW + cardGap, row1Y, slotW, cardSlotH, true, true, false, 'SLOT 2', 'B');
      drawHeroicFighterCard('p5Index', 'ANCHOR', bannerX + (slotW + cardGap) * 2, row1Y, slotW, cardSlotH, true, true, false, 'SLOT 3', 'C');

      // 2. Dynamic Center VS Clash Emblem
      const vsY = 428;
      drawDynamicVsClashEmblem(ctx, canvas.width / 2, vsY, false);

      // 3. Blue Squad Section
      const blueHdrY = 464;
      _drawTeamHeaderBar(ctx, bannerX, blueHdrY, bannerW, teamHdrH, '[ BLUE SQUAD // 3 COMBATANTS ]', '#38BDF8', false);
      const row2Y = blueHdrY + teamHdrH + 6; // 494
      drawHeroicFighterCard('p2Index', 'LEAD', bannerX, row2Y, slotW, cardSlotH, false, true, true, 'SLOT 1', 'D');
      drawHeroicFighterCard('p4Index', 'MID', bannerX + slotW + cardGap, row2Y, slotW, cardSlotH, false, true, true, 'SLOT 2', 'E');
      drawHeroicFighterCard('p6Index', 'ANCHOR', bannerX + (slotW + cardGap) * 2, row2Y, slotW, cardSlotH, false, true, true, 'SLOT 3', 'F');

      drawBottomCommandDeck('START TAG MATCH', () => startGame(), () => randomizeTagMatchFighters());
    }

  } else if (mode === 'TLFS' || mode === GAME_MODES.TLFS) {
    if (isLandscape) {
      const leftX = margin;
      const rightX = margin + cardW + cardGap;

      drawHeroicFighterCard('p1Index', 'GAUNTLET HERO', leftX, topY + 34, cardW, 264, true, true);
      drawTlfsEnemyPoolGrid(rightX, topY + 34, cardW, 300);

      drawBottomCommandDeck('START GAUNTLET', () => startGame(), () => {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
      });
    } else {
      const bannerW = canvas.width - 36;
      const bannerX = 18;
      const p1Y = 124;
      const p1H = 276;

      drawHeroicFighterCard('p1Index', 'GAUNTLET HERO', bannerX, p1Y, bannerW, p1H, true, true);
      drawTlfsEnemyPoolGrid(bannerX, 412, bannerW, 400);

      drawBottomCommandDeck('START GAUNTLET', () => startGame(), () => {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
      });
    }
  } else if (mode === 'Survivor' || mode === GAME_MODES.SURVIVOR) {
    if (isLandscape) {
      const leftX = margin;
      const rightX = margin + cardW + cardGap;

      drawHeroicFighterCard('p1Index', 'SURVIVOR HERO', leftX, topY + 34, cardW, 264, true, true);
      drawSurvivorBriefingCard(rightX, topY + 34, cardW, 264);

      drawBottomCommandDeck('START SURVIVAL', () => startGame(), () => {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
      });
    } else {
      const bannerW = canvas.width - 36;
      const bannerX = 18;
      const p1Y = 124;
      const p1H = 280;

      drawHeroicFighterCard('p1Index', 'SURVIVOR HERO', bannerX, p1Y, bannerW, p1H, true, true);
      drawSurvivorBriefingCard(bannerX, 420, bannerW, 320);

      drawBottomCommandDeck('START SURVIVAL', () => startGame(), () => {
        state.p1Index = Math.floor(Math.random() * FIGHTER_DEFS.length);
      });
    }
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
      return { name: 'DRAGON SLAYER & CALAMITY CLEAVE', category: 'COLOSSAL MELEE // BERSERK', desc: 'Monstrous 400-pound black iron greatsword cleaving across 210° frontal arcs, supersonic Calamity Cleave crescent shockwaves, and unyielding poise.' };
    case 'dummy':
      return { name: 'BALLISTIC TARGET CHASSIS', category: 'TRAINING // SANDBOX', desc: 'Reinforced training frame designed for testing weapon DPS and combos.' };
    default:
      return { name: (def.ability || 'COMBAT SKILL').toUpperCase(), category: 'COMBAT ARSENAL', desc: def.desc || 'Standard combat armament.' };
  }
}

// ── COMIC MANGA POP-ART CARDS FOR 2V2, 1V2, FFA, TAG MATCH & TLFS ──

function _drawComicMediumCard(slotProp, title, x, y, w, h, accentColor, enabled, isInteractive, isMirrored, cycleFighter) {
  const { ctx } = state;
  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const weaponInfo = getFighterWeaponInfo(def);
  const theme = getFighterCollectorTheme(def) || {};
  const themeColor = def.themeColor || def.color || theme.primary || accentColor || '#F5A623';
  const palette = {
    primary: accentColor || themeColor,
    dark: theme.dark || '#161219',
    title: theme.title || themeColor,
    border: themeColor,
  };

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  const phase = isMirrored ? 1.7 : 0.0;

  // Normalized coordinate space: 244 x 338
  const sx = w / 244;
  const sy = h / 338;
  const mx = (px) => isMirrored ? (244 - px) : px;

  // Outer Comic Drop Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  ctx.fillRect(x + 4, y + 5, w, h);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);

  // 1. Base card backdrop (Clipped to the card frame)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 244, 338);
  ctx.clip();

  // Deep slate base
  ctx.fillStyle = '#14151D';
  ctx.fillRect(0, 0, 244, 338);

  // Team-colored halftone wedge
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(0), 0);
  ctx.lineTo(mx(180), 0);
  ctx.lineTo(mx(108), 182);
  ctx.lineTo(mx(0), 146);
  ctx.closePath();
  const grad = ctx.createLinearGradient(mx(0), 0, mx(160), 160);
  grad.addColorStop(0, palette.primary);
  grad.addColorStop(1, '#0C0D13');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();
  _drawComicHalftoneField(ctx, isMirrored ? 64 : 0, 0, 180, 185, 'rgba(0, 0, 0, 0.35)');
  ctx.restore();

  // Dark diagonal corner with giant tilted watermark
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(0), 146);
  ctx.lineTo(mx(108), 182);
  ctx.lineTo(mx(0), 224);
  ctx.closePath();
  ctx.fillStyle = '#10121A';
  ctx.fill();
  ctx.clip();
  ctx.translate(mx(40), 175);
  ctx.rotate(isMirrored ? 0.35 : -0.35);
  ctx.fillStyle = '#181B26';
  ctx.font = '900 36px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.substring(0, 4).toUpperCase(), 0, 0);
  ctx.restore();

  // Solid black diagonal divider slash
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(mx(180), 0);
  ctx.lineTo(mx(108), 182);
  ctx.stroke();

  ctx.restore(); // End base backdrop clip

  // 2. Solid Black Manga Ink Outer Frame
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(0, 0, 244, 338);

  // Top accent pinstripe
  ctx.fillStyle = palette.primary;
  ctx.fillRect(8, 0, 228, 2.5);

  // 3. Top Header Bar: Team Badge & Quick Cycle Blocks
  const hdrY = 8;
  const isLeft = !isMirrored;

  // Title pill
  ctx.save();
  const titleW = 144;
  const titleH = 20;
  const titleX = isLeft ? 10 : (244 - 10 - titleW);
  ctx.fillStyle = '#090A0F';
  ctx.fillRect(titleX + 2, hdrY + 2, titleW, titleH);
  ctx.fillStyle = '#12141D';
  ctx.fillRect(titleX, hdrY, titleW, titleH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(titleX, hdrY, titleW, titleH);

  ctx.fillStyle = palette.primary;
  ctx.fillRect(titleX + 2, hdrY + 2, 4, titleH - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, titleX + titleW / 2 + 2, hdrY + titleH / 2);
  ctx.restore();

  // Comic Cycle Blocks [◀] [▶]
  const cycleBtnSize = 20;
  const btn1X = isLeft ? 190 : 10;
  const btn2X = isLeft ? 214 : 34;

  const drawCycleBtn = (bx, by, label) => {
    ctx.save();
    ctx.fillStyle = '#050609';
    ctx.fillRect(bx + 1.5, by + 1.5, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#10121A';
    ctx.fillRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#FFE145';
    ctx.font = '900 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + cycleBtnSize / 2, by + cycleBtnSize / 2);
    ctx.restore();
  };

  drawCycleBtn(btn1X, hdrY, '◀');
  drawCycleBtn(btn2X, hdrY, '▶');

  // Mini lightning accent next to cycle buttons
  ctx.save();
  const boltX = isLeft ? 178 : 60;
  ctx.translate(boltX, hdrY + 10);
  ctx.scale(0.8, 0.8);
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(2, -7);
  ctx.lineTo(-1, -1);
  ctx.lineTo(6, -1);
  ctx.lineTo(-4, 7);
  ctx.lineTo(-1, 1);
  ctx.lineTo(-6, 1);
  ctx.closePath();
  ctx.fillStyle = '#FFE145';
  ctx.fill();
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // 4. Character Cut-In Stage
  const avatarCX = mx(122);
  const avatarCY = 96;

  // Spiky manga explosion burst behind head
  const burstRot = Math.sin(now * 1.6 + phase) * 0.04;
  const burstScale = 1.0 + Math.sin(now * 4.4 + phase) * 0.055;
  _drawSpikyMangaExplosion(ctx, avatarCX + (isMirrored ? -10 : 10), 66, 36, 22, palette.primary, isMirrored ? -burstRot : burstRot, burstScale);

  // Undulating comic flame wave at bottom of character
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
    ctx.lineWidth = 2.0;
    ctx.stroke();
  };
  drawFlamePoly([
    [avatarCX - 60, 154],
    [avatarCX - 40, 126 + Math.sin(flameTime + 0.3) * 6],
    [avatarCX - 15, 140 + Math.sin(flameTime * 1.2 + 1.2) * 5],
    [avatarCX + 10, 120 + Math.sin(flameTime * 1.1 + 2.5) * 7],
    [avatarCX + 35, 138 + Math.sin(flameTime + 3.8) * 5],
    [avatarCX + 60, 154]
  ], palette.primary);
  drawFlamePoly([
    [avatarCX - 40, 154],
    [avatarCX - 22, 136 + Math.sin(flameTime * 1.2 + 1.1) * 5],
    [avatarCX + 4, 142 + Math.sin(flameTime + 2.4) * 4],
    [avatarCX + 28, 132 + Math.sin(flameTime * 1.3 + 3.6) * 6],
    [avatarCX + 45, 154]
  ], '#FFE145');

  // Ground shadow under feet
  ctx.save();
  const shadowW = 48 + Math.sin(now * 2.8 + phase) * 4;
  const shadowH = 9 + Math.sin(now * 2.8 + phase) * 1.5;
  ctx.beginPath();
  ctx.ellipse(avatarCX, 146, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5, 6, 9, 0.45)';
  ctx.fill();
  ctx.restore();

  // Large Animated Character Avatar
  const stickerImg = getFighterStickerPreview(fighterIndex) || getFighterPreview(fighterIndex);
  if (stickerImg) {
    const srcW = stickerImg.width || 256;
    const srcH = stickerImg.height || 256;
    const destSize = 114;

    const charBobY = Math.sin(now * 2.8 + phase) * 3.2;
    const charSwayX = (isMirrored ? -1 : 1) * Math.cos(now * 1.4 + phase) * 1.2;
    const charRot = (isMirrored ? -1 : 1) * Math.sin(now * 1.4 + phase) * 0.015;
    const charBreathScaleY = 1.0 + Math.sin(now * 2.8 + phase) * 0.018;
    const charBreathScaleX = (isMirrored ? -1.0 : 1.0) * (1.0 - Math.sin(now * 2.8 + phase) * 0.008);

    ctx.save();
    ctx.translate(avatarCX + charSwayX, avatarCY + charBobY);
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

  // 5. Stepped Info Stack: Name & Grade
  const nameBoxY = 158;
  const nameBoxH = 26;
  const nameBoxW = 224;
  const nameBoxX = 10;

  // Name plate base
  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(nameBoxX + 2, nameBoxY + 2, nameBoxW, nameBoxH);
  ctx.fillStyle = '#161922';
  ctx.fillRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);

  // Character Name
  ctx.font = '900 13px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nameMaxW = nameBoxW - 46;
  const nameStr = fitSingleLineText(ctx, def.name.toUpperCase(), nameMaxW);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText(nameStr, nameBoxX + 8, nameBoxY + nameBoxH / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameStr, nameBoxX + 8, nameBoxY + nameBoxH / 2);

  // Grade Badge
  const measuredNameW = ctx.measureText(nameStr).width;
  drawGradeBadge(ctx, nameBoxX + 8 + measuredNameW + 12, nameBoxY + nameBoxH / 2 - 8, def.grade, { scale: 0.72 });
  ctx.restore();

  // Sub-tag / Weapon Row & Shimmering Stars
  const subY = 188;
  ctx.save();
  ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.primary;
  const subText = fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name.toUpperCase()}`, 130);
  ctx.fillText(subText, 14, subY);

  // Level Pill on right
  const lvlW = 44;
  const lvlH = 14;
  const lvlX = 244 - 14 - lvlW;
  ctx.fillStyle = '#0B0D13';
  ctx.fillRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.strokeStyle = '#FFE145';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.fillStyle = '#FFE145';
  ctx.textAlign = 'center';
  ctx.fillText('LV.99', lvlX + lvlW / 2, subY + 0.5);

  // 5 Comic Shimmering Stars
  const starStartX = 14;
  const starY = 202;
  const starShimmer = Math.sin(now * 3.5);
  for (let s = 0; s < 5; s++) {
    const starFill = s < 4 ? (starShimmer > 0.6 ? '#FFFFFF' : '#FFE145') : '#4B5563';
    _drawComicStar5(ctx, starStartX + s * 10, starY, 4, 1.8, starFill);
  }
  ctx.restore();

  // 6. Slanted Comic Stat Bars (HP, ATK, SPD)
  const statBoxX = 10;
  const statBoxY = 212;
  const statBoxW = 224;
  const statBoxH = 68;

  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(statBoxX + 2, statBoxY + 2, statBoxW, statBoxH);
  ctx.fillStyle = '#0C0E14';
  ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
  ctx.strokeStyle = '#222634';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

  // Slanted bars helper
  const drawComicStatRow = (label, val, maxVal, barY, col) => {
    ctx.save();
    ctx.fillStyle = col;
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, statBoxX + 6, barY);

    const bX = statBoxX + 32;
    const bW = statBoxW - 68;
    const bH = 10;
    const bY = barY - bH / 2;

    // Track
    drawSlantedParallelogram(ctx, bX, bY, bW, bH, 4, '#161922', '#282E3E', 1);

    // Fill
    const fillRatio = Math.min(1, Math.max(0.08, val / maxVal));
    const fillW = Math.max(6, bW * fillRatio);
    drawSlantedParallelogram(ctx, bX, bY, fillW, bH, 4, col, null, 0);

    // Number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 9.5px "Outfit", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}`, statBoxX + statBoxW - 6, barY);
    ctx.restore();
  };

  drawComicStatRow('HP', def.hp, 200, statBoxY + 14, '#EF4444');
  drawComicStatRow('ATK', def.damage, 50, statBoxY + 34, '#38BDF8');
  drawComicStatRow('SPD', def.speed || 2, 4, statBoxY + 54, '#F59E0B');
  ctx.restore();

  // 7. Bottom Action Button: "SELECT FIGHTER ⯈"
  const btnX = 10;
  const btnY = 288;
  const btnW = 224;
  const btnH = 38;

  ctx.save();
  // Drop shadow
  ctx.fillStyle = '#050609';
  ctx.fillRect(btnX + 2, btnY + 2, btnW, btnH);

  // Button base
  ctx.fillStyle = '#07080C';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  // Light sheen sweep
  ctx.save();
  ctx.beginPath();
  ctx.rect(btnX, btnY, btnW, btnH);
  ctx.clip();
  const sheenProgress = ((now * 0.65 + (isMirrored ? 0.5 : 0)) % 1.0);
  const sheenX = btnX - 40 + sheenProgress * (btnW + 80);
  const sheenGrad = ctx.createLinearGradient(sheenX - 25, btnY, sheenX + 25, btnY + btnH);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.restore();

  // Text & Arrow
  const arrowSlide = Math.sin(now * 5.5 + phase) * 2.5;
  ctx.font = '900 13px "Outfit", "Impact", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const btnLabel = 'SELECT FIGHTER';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);
  ctx.fillStyle = palette.primary;
  ctx.fillText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText('⯈', btnX + btnW / 2 + 58 + arrowSlide, btnY + btnH / 2);
  ctx.fillStyle = '#FFE145';
  ctx.fillText('⯈', btnX + btnW / 2 + 58 + arrowSlide, btnY + btnH / 2);

  ctx.restore();

  ctx.restore(); // End normalized scale & translate

  // Register interactive hit zones (in real screen coordinates)
  if (isInteractive) {
    _registerButton(x, y, w, h, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    });
    _registerButton(x + btn1X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(-1));
    _registerButton(x + btn2X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(1));
    _registerButton(x + btnX * sx, y + btnY * sy, btnW * sx, btnH * sy, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    });
  }
}

function _drawComicCompactCard(slotProp, title, x, y, w, h, accentColor, enabled, isInteractive, isMirrored, cycleFighter) {
  const { ctx } = state;
  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const weaponInfo = getFighterWeaponInfo(def);
  const theme = getFighterCollectorTheme(def) || {};
  const themeColor = def.themeColor || def.color || theme.primary || accentColor || '#F5A623';
  const palette = {
    primary: accentColor || themeColor,
    dark: theme.dark || '#161219',
    title: theme.title || themeColor,
    border: themeColor,
  };

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  const phase = isMirrored ? 1.7 : 0.0;

  // Normalized coordinate space: 244 x 218
  const sx = w / 244;
  const sy = h / 218;
  const mx = (px) => isMirrored ? (244 - px) : px;

  // Outer Comic Drop Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);

  // 1. Base card backdrop
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 244, 218);
  ctx.clip();

  ctx.fillStyle = '#14151D';
  ctx.fillRect(0, 0, 244, 218);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx(0), 0);
  ctx.lineTo(mx(160), 0);
  ctx.lineTo(mx(80), 170);
  ctx.lineTo(mx(0), 130);
  ctx.closePath();
  const grad = ctx.createLinearGradient(mx(0), 0, mx(140), 140);
  grad.addColorStop(0, palette.primary);
  grad.addColorStop(1, '#0C0D13');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();
  _drawComicHalftoneField(ctx, isMirrored ? 84 : 0, 0, 160, 170, 'rgba(0, 0, 0, 0.35)');
  ctx.restore();

  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(mx(160), 0);
  ctx.lineTo(mx(80), 170);
  ctx.stroke();

  ctx.restore(); // End base clip

  // 2. Solid Black Manga Ink Outer Frame
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.0;
  ctx.strokeRect(0, 0, 244, 218);

  // Top accent pinstripe
  ctx.fillStyle = palette.primary;
  ctx.fillRect(8, 0, 228, 2.5);

  // 3. Header Bar
  const hdrY = 6;
  const isLeft = !isMirrored;
  const titleW = 140;
  const titleH = 18;
  const titleX = isLeft ? 8 : (244 - 8 - titleW);

  ctx.save();
  ctx.fillStyle = '#090A0F';
  ctx.fillRect(titleX + 1.5, hdrY + 1.5, titleW, titleH);
  ctx.fillStyle = '#12141D';
  ctx.fillRect(titleX, hdrY, titleW, titleH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(titleX, hdrY, titleW, titleH);

  ctx.fillStyle = palette.primary;
  ctx.fillRect(titleX + 2, hdrY + 2, 3, titleH - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, titleX + titleW / 2 + 2, hdrY + titleH / 2);
  ctx.restore();

  // Cycle buttons
  const cycleBtnSize = 18;
  const btn1X = isLeft ? 192 : 8;
  const btn2X = isLeft ? 214 : 30;

  const drawCycleBtn = (bx, by, label) => {
    ctx.save();
    ctx.fillStyle = '#050609';
    ctx.fillRect(bx + 1, by + 1, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#10121A';
    ctx.fillRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#FFE145';
    ctx.font = '900 8.5px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + cycleBtnSize / 2, by + cycleBtnSize / 2);
    ctx.restore();
  };

  drawCycleBtn(btn1X, hdrY, '◀');
  drawCycleBtn(btn2X, hdrY, '▶');

  // 4. Left Half: Character Cut-In Stage
  const avatarCX = isLeft ? 54 : (244 - 54);
  const avatarCY = 92;

  // Spiky burst behind avatar
  const burstRot = Math.sin(now * 1.6 + phase) * 0.04;
  const burstScale = 1.0 + Math.sin(now * 4.4 + phase) * 0.055;
  _drawSpikyMangaExplosion(ctx, avatarCX, 72, 28, 18, palette.primary, isMirrored ? -burstRot : burstRot, burstScale);

  // Flame wave
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
    ctx.lineWidth = 1.8;
    ctx.stroke();
  };
  drawFlamePoly([
    [avatarCX - 40, 134],
    [avatarCX - 24, 114 + Math.sin(flameTime + 0.3) * 5],
    [avatarCX - 8, 124 + Math.sin(flameTime * 1.2 + 1.2) * 4],
    [avatarCX + 10, 110 + Math.sin(flameTime * 1.1 + 2.5) * 5],
    [avatarCX + 26, 122 + Math.sin(flameTime + 3.8) * 4],
    [avatarCX + 40, 134]
  ], palette.primary);

  // Ground shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(avatarCX, 128, 36, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5, 6, 9, 0.45)';
  ctx.fill();
  ctx.restore();

  // Character Sprite
  const stickerImg = getFighterStickerPreview(fighterIndex) || getFighterPreview(fighterIndex);
  if (stickerImg) {
    const srcW = stickerImg.width || 256;
    const srcH = stickerImg.height || 256;
    const destSize = 82;

    const charBobY = Math.sin(now * 2.8 + phase) * 2.5;
    const charSwayX = (isMirrored ? -1 : 1) * Math.cos(now * 1.4 + phase) * 1.0;
    const charBreathScaleY = 1.0 + Math.sin(now * 2.8 + phase) * 0.016;
    const charBreathScaleX = (isMirrored ? -1.0 : 1.0) * (1.0 - Math.sin(now * 2.8 + phase) * 0.008);

    ctx.save();
    ctx.translate(avatarCX + charSwayX, avatarCY + charBobY);
    ctx.scale(charBreathScaleX, charBreathScaleY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      stickerImg,
      0, 0, srcW, srcH,
      -destSize / 2, -destSize / 2, destSize, destSize
    );
    ctx.restore();
  }

  // 5. Right Half: Name, Grade & Slanted Stat Bars
  const rightX = isLeft ? 112 : 10;
  const rightW = 122;

  // Name plate
  ctx.save();
  const nameBoxY = 28;
  const nameBoxH = 22;
  ctx.fillStyle = '#050609';
  ctx.fillRect(rightX + 1.5, nameBoxY + 1.5, rightW, nameBoxH);
  ctx.fillStyle = '#161922';
  ctx.fillRect(rightX, nameBoxY, rightW, nameBoxH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(rightX, nameBoxY, rightW, nameBoxH);

  ctx.font = '900 11px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nameStr = fitSingleLineText(ctx, def.name.toUpperCase(), rightW - 32);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeText(nameStr, rightX + 6, nameBoxY + nameBoxH / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameStr, rightX + 6, nameBoxY + nameBoxH / 2);

  const measuredNameW = ctx.measureText(nameStr).width;
  drawGradeBadge(ctx, rightX + 6 + measuredNameW + 8, nameBoxY + nameBoxH / 2 - 7, def.grade, { scale: 0.64 });
  ctx.restore();

  // Class & Level
  ctx.save();
  const subY = 56;
  ctx.font = '900 8.5px "Outfit", "Rajdhani", sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, `CLASS // ${def.type.toUpperCase()}`, 74), rightX + 2, subY);

  const lvlW = 38;
  const lvlH = 13;
  const lvlX = rightX + rightW - lvlW;
  ctx.fillStyle = '#0B0D13';
  ctx.fillRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.strokeStyle = '#FFE145';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.fillStyle = '#FFE145';
  ctx.textAlign = 'center';
  ctx.fillText('LV.99', lvlX + lvlW / 2, subY + 0.5);

  // Slanted mini bars
  const statBoxY = 68;
  const drawMiniStat = (label, val, maxVal, by, col) => {
    ctx.save();
    ctx.fillStyle = col;
    ctx.font = '900 8px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rightX + 2, by);

    const bX = rightX + 24;
    const bW = rightW - 48;
    const bH = 8;
    drawSlantedParallelogram(ctx, bX, by - bH / 2, bW, bH, 3, '#161922', '#282E3E', 1);

    const fillRatio = Math.min(1, Math.max(0.08, val / maxVal));
    const fillW = Math.max(4, bW * fillRatio);
    drawSlantedParallelogram(ctx, bX, by - bH / 2, fillW, bH, 3, col, null, 0);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 8.5px "Outfit", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}`, rightX + rightW - 2, by);
    ctx.restore();
  };

  drawMiniStat('HP', def.hp, 200, statBoxY + 8, '#EF4444');
  drawMiniStat('ATK', def.damage, 50, statBoxY + 22, '#38BDF8');
  drawMiniStat('SPD', def.speed || 2, 4, statBoxY + 36, '#F59E0B');

  // Mini weapon label
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '900 8px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fitSingleLineText(ctx, `WEAPON: ${weaponInfo.name.toUpperCase()}`, rightW - 4), rightX + 2, statBoxY + 50);

  ctx.restore();

  // 6. Bottom Action Button
  const btnX = 8;
  const btnY = 176;
  const btnW = 228;
  const btnH = 32;

  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(btnX + 1.5, btnY + 1.5, btnW, btnH);
  ctx.fillStyle = '#07080C';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 2.0;
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  // Sheen
  ctx.save();
  ctx.beginPath();
  ctx.rect(btnX, btnY, btnW, btnH);
  ctx.clip();
  const sheenProgress = ((now * 0.65 + (isMirrored ? 0.5 : 0)) % 1.0);
  const sheenX = btnX - 30 + sheenProgress * (btnW + 60);
  const sheenGrad = ctx.createLinearGradient(sheenX - 20, btnY, sheenX + 20, btnY + btnH);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.20)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.restore();

  const arrowSlide = Math.sin(now * 5.5 + phase) * 2;
  ctx.font = '900 11.5px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const btnLabel = 'SELECT FIGHTER';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.0;
  ctx.strokeText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);
  ctx.fillStyle = palette.primary;
  ctx.fillText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.0;
  ctx.strokeText('⯈', btnX + btnW / 2 + 54 + arrowSlide, btnY + btnH / 2);
  ctx.fillStyle = '#FFE145';
  ctx.fillText('⯈', btnX + btnW / 2 + 54 + arrowSlide, btnY + btnH / 2);
  ctx.restore();

  ctx.restore(); // End scale/translate

  if (isInteractive) {
    _registerButton(x, y, w, h, () => openFighterSelectModal(slotProp, fighterIndex));
    _registerButton(x + btn1X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(-1));
    _registerButton(x + btn2X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(1));
    _registerButton(x + btnX * sx, y + btnY * sy, btnW * sx, btnH * sy, () => openFighterSelectModal(slotProp, fighterIndex));
  }
}

function _drawComicTallCard(slotProp, title, x, y, w, h, accentColor, enabled, isInteractive, isMirrored, cycleFighter) {
  const { ctx } = state;
  const isLandscape = (state.canvas && state.canvas.width > 600) || state.viewOrientation === 'horizontal';

  const currentDefs = getActiveFighterDefs();
  const fighterIndex = state[slotProp] ?? 0;
  const def = currentDefs[fighterIndex] || currentDefs[0] || FIGHTER_DEFS[0];
  const weaponInfo = getFighterWeaponInfo(def);
  const theme = getFighterCollectorTheme(def) || {};
  const themeColor = def.themeColor || def.color || theme.primary || accentColor || '#F5A623';
  const palette = {
    primary: accentColor || themeColor,
    dark: theme.dark || '#161219',
    title: theme.title || themeColor,
    border: themeColor,
  };

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
  const phase = isMirrored ? 1.7 : 0.0;

  if (isLandscape && h <= 420) {
    // ── WIDESCREEN 16:9 LARGE COMIC CARD (Horizontal Duel) ──
    const sx = w / 390;
    const sy = h / 380;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
    ctx.fillRect(x + 4, y + 5, w, h);
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);

    ctx.fillStyle = '#14151D';
    ctx.fillRect(0, 0, 390, 380);

    ctx.strokeStyle = '#050609';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(0, 0, 390, 380);

    ctx.fillStyle = palette.primary;
    ctx.fillRect(8, 0, 374, 2.5);

    // Left sub-column: Avatar & Stats
    const subLeftW = 168;
    const subLeftX = 10;
    const subRightX = 184;
    const subRightW = 390 - 194;

    const avatarCX = subLeftX + subLeftW / 2;
    const avatarCY = 76;

    _drawSpikyMangaExplosion(ctx, avatarCX, avatarCY - 10, 38, 22, palette.primary, 0, 1.0);

    const stickerImg = getFighterStickerPreview(fighterIndex) || getFighterPreview(fighterIndex);
    if (stickerImg) {
      const charBobY = Math.sin(now * 2.8 + phase) * 2.8;
      ctx.save();
      ctx.translate(avatarCX, avatarCY + charBobY);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(stickerImg, 0, 0, stickerImg.width || 256, stickerImg.height || 256, -42, -42, 84, 84);
      ctx.restore();
    }

    // Name + Grade
    ctx.save();
    ctx.font = '900 13px "Outfit", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameStr = fitSingleLineText(ctx, def.name.toUpperCase(), subLeftW - 32);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(nameStr, avatarCX, 128);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(nameStr, avatarCX, 128);
    drawGradeBadge(ctx, avatarCX + ctx.measureText(nameStr).width / 2 + 10, 121, def.grade, { scale: 0.72 });
    ctx.restore();

    // Stats
    const drawTacticalBar = (label, val, maxVal, by, col) => {
      ctx.save();
      ctx.fillStyle = col;
      ctx.font = '900 9px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, subLeftX, by);
      drawSlantedParallelogram(ctx, subLeftX + 28, by - 5, subLeftW - 56, 10, 3, '#161922', '#282E3E', 1);
      const fw = Math.max(4, (subLeftW - 56) * Math.min(1, val / maxVal));
      drawSlantedParallelogram(ctx, subLeftX + 28, by - 5, fw, 10, 3, col, null, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 9px "Outfit", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}`, subLeftX + subLeftW, by);
      ctx.restore();
    };

    drawTacticalBar('HP', def.hp, 200, 156, '#EF4444');
    drawTacticalBar('ATK', def.damage, 50, 174, '#38BDF8');
    drawTacticalBar('SPD', def.speed || 2, 4, 192, '#F59E0B');

    // Right sub-column: Ability & Live Weapon
    const abY = 32;
    const abH = 76;
    ctx.save();
    ctx.fillStyle = '#0F1116';
    ctx.fillRect(subRightX, abY, subRightW, abH);
    ctx.strokeStyle = '#252A36';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(subRightX, abY, subRightW, abH);
    ctx.fillStyle = '#FFE145';
    ctx.font = '900 10px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, subRightW - 12), subRightX + 6, abY + 6);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '800 9px "Outfit", sans-serif';
    wrapText(ctx, def.desc, subRightX + 6, abY + 20, subRightW - 12, 11, 4);
    ctx.restore();

    // Weapon Preview
    const wpY = abY + abH + 8;
    const wpH = 236;
    ctx.save();
    ctx.fillStyle = '#0F1116';
    ctx.fillRect(subRightX, wpY, subRightW, wpH);
    ctx.strokeStyle = '#252A36';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(subRightX, wpY, subRightW, wpH);

    ctx.fillStyle = '#FFE145';
    ctx.font = '900 10px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name.toUpperCase()}`, subRightW - 12), subRightX + 6, wpY + 6);

    const wStageX = subRightX + subRightW / 2;
    const wStageY = wpY + 66;
    ctx.translate(wStageX, wStageY);
    ctx.scale(1.0, 1.0);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '800 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, weaponInfo.desc, subRightX + subRightW / 2, wpY + 140, subRightW - 12, 11, 4);
    ctx.restore();

    // Bottom Action Button
    const btnW = subLeftW;
    const btnH = 36;
    const btnX = subLeftX;
    const btnY = 320;
    ctx.save();
    ctx.fillStyle = '#07080C';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2.0;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = '900 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.primary;
    ctx.fillText('CHANGE FIGHTER', btnX + btnW / 2, btnY + btnH / 2);
    ctx.restore();

    ctx.restore(); // End scale/translate

    if (isInteractive) {
      _registerButton(x, y, w, h, () => openFighterSelectModal(slotProp, fighterIndex));
      _registerButton(x + btnX * sx, y + btnY * sy, btnW * sx, btnH * sy, () => openFighterSelectModal(slotProp, fighterIndex));
    }
    return;
  }

  // ── PORTRAIT TALL COMIC CARD (TLFS: H ~ 680) ──
  const sx = w / 244;
  const sy = h / 680;

  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
  ctx.fillRect(x + 4, y + 5, w, h);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);

  // 1. Base card backdrop
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 244, 680);
  ctx.clip();

  ctx.fillStyle = '#14151D';
  ctx.fillRect(0, 0, 244, 680);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(190, 0);
  ctx.lineTo(110, 240);
  ctx.lineTo(0, 190);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 180, 220);
  grad.addColorStop(0, '#F5A623');
  grad.addColorStop(1, '#0C0D13');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();
  _drawComicHalftoneField(ctx, 0, 0, 200, 240, 'rgba(0, 0, 0, 0.35)');
  ctx.restore();

  // Watermark
  ctx.save();
  ctx.translate(46, 230);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#181B26';
  ctx.font = '900 48px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.substring(0, 4).toUpperCase(), 0, 0);
  ctx.restore();

  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(190, 0);
  ctx.lineTo(110, 240);
  ctx.stroke();

  ctx.restore(); // End base clip

  // 2. Solid Black Outer Frame
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(0, 0, 244, 680);

  ctx.fillStyle = '#F5A623';
  ctx.fillRect(8, 0, 228, 2.5);

  // 3. Header
  const hdrY = 8;
  const titleW = 144;
  const titleH = 22;
  const titleX = 10;

  ctx.save();
  ctx.fillStyle = '#090A0F';
  ctx.fillRect(titleX + 2, hdrY + 2, titleW, titleH);
  ctx.fillStyle = '#12141D';
  ctx.fillRect(titleX, hdrY, titleW, titleH);
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(titleX, hdrY, titleW, titleH);

  ctx.fillStyle = '#F5A623';
  ctx.fillRect(titleX + 2, hdrY + 2, 4, titleH - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 10.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, titleX + titleW / 2 + 2, hdrY + titleH / 2);
  ctx.restore();

  // Cycle buttons
  const cycleBtnSize = 22;
  const btn1X = 188;
  const btn2X = 214;

  const drawCycleBtn = (bx, by, label) => {
    ctx.save();
    ctx.fillStyle = '#050609';
    ctx.fillRect(bx + 1.5, by + 1.5, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#10121A';
    ctx.fillRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(bx, by, cycleBtnSize, cycleBtnSize);
    ctx.fillStyle = '#FFE145';
    ctx.font = '900 9.5px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + cycleBtnSize / 2, by + cycleBtnSize / 2);
    ctx.restore();
  };

  drawCycleBtn(btn1X, hdrY, '◀');
  drawCycleBtn(btn2X, hdrY, '▶');

  // 4. Cut-In Stage
  const avatarCX = 122;
  const avatarCY = 114;

  _drawSpikyMangaExplosion(ctx, avatarCX, 82, 46, 28, '#F5A623', 0, 1.0);

  // Ground shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(avatarCX, 172, 60, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5, 6, 9, 0.45)';
  ctx.fill();
  ctx.restore();

  // Character Sprite
  const stickerImg = getFighterStickerPreview(fighterIndex) || getFighterPreview(fighterIndex);
  if (stickerImg) {
    const srcW = stickerImg.width || 256;
    const srcH = stickerImg.height || 256;
    const destSize = 138;

    const charBobY = Math.sin(now * 2.8 + phase) * 3.5;
    ctx.save();
    ctx.translate(avatarCX, avatarCY + charBobY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(stickerImg, 0, 0, srcW, srcH, -destSize / 2, -destSize / 2, destSize, destSize);
    ctx.restore();
  }

  // 5. Stepped Info Stack
  const nameBoxY = 192;
  const nameBoxH = 28;
  const nameBoxW = 224;
  const nameBoxX = 10;

  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(nameBoxX + 2, nameBoxY + 2, nameBoxW, nameBoxH);
  ctx.fillStyle = '#161922';
  ctx.fillRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);

  ctx.font = '900 14px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nameStr = fitSingleLineText(ctx, def.name.toUpperCase(), nameBoxW - 46);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText(nameStr, nameBoxX + 8, nameBoxY + nameBoxH / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameStr, nameBoxX + 8, nameBoxY + nameBoxH / 2);

  drawGradeBadge(ctx, nameBoxX + 8 + ctx.measureText(nameStr).width + 12, nameBoxY + nameBoxH / 2 - 8, def.grade, { scale: 0.75 });
  ctx.restore();

  // Class & Level
  const subY = 228;
  ctx.save();
  ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
  ctx.fillStyle = '#F5A623';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`CLASS // ${def.type.toUpperCase()}`, 14, subY);

  const lvlW = 46;
  const lvlH = 15;
  const lvlX = 244 - 14 - lvlW;
  ctx.fillStyle = '#0B0D13';
  ctx.fillRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.strokeStyle = '#FFE145';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlX, subY - lvlH / 2, lvlW, lvlH);
  ctx.fillStyle = '#FFE145';
  ctx.textAlign = 'center';
  ctx.fillText('SSR V.99', lvlX + lvlW / 2, subY + 0.5);

  for (let s = 0; s < 5; s++) {
    _drawComicStar5(ctx, 14 + s * 11, 242, 4.5, 2, '#FFE145');
  }
  ctx.restore();

  // 6. Slanted Stat Bars
  const statBoxX = 10;
  const statBoxY = 254;
  const statBoxW = 224;
  const statBoxH = 72;

  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(statBoxX + 2, statBoxY + 2, statBoxW, statBoxH);
  ctx.fillStyle = '#0C0E14';
  ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
  ctx.strokeStyle = '#222634';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

  const drawTallStatRow = (label, val, maxVal, by, col) => {
    ctx.save();
    ctx.fillStyle = col;
    ctx.font = '900 9.5px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, statBoxX + 6, by);

    const bX = statBoxX + 34;
    const bW = statBoxW - 72;
    const bH = 10;
    drawSlantedParallelogram(ctx, bX, by - bH / 2, bW, bH, 4, '#161922', '#282E3E', 1);

    const fillRatio = Math.min(1, Math.max(0.08, val / maxVal));
    const fillW = Math.max(6, bW * fillRatio);
    drawSlantedParallelogram(ctx, bX, by - bH / 2, fillW, bH, 4, col, null, 0);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 9.5px "Outfit", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}`, statBoxX + statBoxW - 6, by);
    ctx.restore();
  };

  drawTallStatRow('HP', def.hp, 200, statBoxY + 15, '#EF4444');
  drawTallStatRow('DMG', def.damage, 50, statBoxY + 36, '#F5A623');
  drawTallStatRow('SPD', def.speed || 2, 4, statBoxY + 57, '#38BDF8');
  ctx.restore();

  // 7. Ability Dossier Box
  const abY = 336;
  const abH = 76;
  ctx.save();
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(statBoxX, abY, statBoxW, abH);
  ctx.strokeStyle = '#252A36';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(statBoxX, abY, statBoxW, abH);
  ctx.fillStyle = '#FFE145';
  ctx.font = '900 10px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, statBoxW - 12), statBoxX + 6, abY + 6);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '800 9px "Outfit", sans-serif';
  wrapText(ctx, def.desc, statBoxX + 6, abY + 20, statBoxW - 12, 11, 4);
  ctx.restore();

  // 8. Live Weapon Showcase Box
  const wpY = 420;
  const wpH = 196;
  ctx.save();
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(statBoxX, wpY, statBoxW, wpH);
  ctx.strokeStyle = '#252A36';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(statBoxX, wpY, statBoxW, wpH);

  ctx.fillStyle = '#FFE145';
  ctx.font = '900 10px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name.toUpperCase()}`, statBoxW - 12), statBoxX + 6, wpY + 6);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '900 9px "Outfit", sans-serif';
  ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, statBoxW - 12), statBoxX + 6, wpY + 18);

  const wStageX = statBoxX + statBoxW / 2;
  const wStageY = wpY + 74;

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
  ctx.font = '800 9.5px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  wrapText(ctx, weaponInfo.desc, wStageX, wpY + 148, statBoxW - 12, 11, 4);
  ctx.restore();

  // 9. Bottom Action Button
  const btnX = 10;
  const btnY = 626;
  const btnW = 224;
  const btnH = 42;

  ctx.save();
  ctx.fillStyle = '#050609';
  ctx.fillRect(btnX + 2, btnY + 2, btnW, btnH);
  ctx.fillStyle = '#07080C';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(btnX, btnY, btnW, btnH);
  ctx.clip();
  const sheenProgress = ((now * 0.65) % 1.0);
  const sheenX = btnX - 40 + sheenProgress * (btnW + 80);
  const sheenGrad = ctx.createLinearGradient(sheenX - 25, btnY, sheenX + 25, btnY + btnH);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.restore();

  const arrowSlide = Math.sin(now * 5.5 + phase) * 2.5;
  ctx.font = '900 13.5px "Outfit", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const btnLabel = 'CHANGE HERO';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);
  ctx.fillStyle = '#F5A623';
  ctx.fillText(btnLabel, btnX + btnW / 2 - 8, btnY + btnH / 2);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.strokeText('⯈', btnX + btnW / 2 + 58 + arrowSlide, btnY + btnH / 2);
  ctx.fillStyle = '#FFE145';
  ctx.fillText('⯈', btnX + btnW / 2 + 58 + arrowSlide, btnY + btnH / 2);
  ctx.restore();

  ctx.restore(); // End scale/translate

  if (isInteractive) {
    _registerButton(x, y, w, h, () => openFighterSelectModal(slotProp, fighterIndex));
    _registerButton(x + btn1X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(-1));
    _registerButton(x + btn2X * sx, y + hdrY * sy, cycleBtnSize * sx, cycleBtnSize * sy, () => cycleFighter(1));
    _registerButton(x + btnX * sx, y + btnY * sy, btnW * sx, btnH * sy, () => openFighterSelectModal(slotProp, fighterIndex));
  }
}

function drawPlayerCard(slotProp, title, x, y, w, h, accentColor, enabled, isLarge = false, isMirrored = undefined) {
  if (!enabled) {
    const { ctx } = state;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
    ctx.fillRect(x + 4, y + 5, w, h);
    ctx.fillStyle = '#101217';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#EF4444';
    ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLOT UNAVAILABLE', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const isP1 = slotProp === 'p1Index' || slotProp === 'p3Index' || slotProp === 'p5Index';
  const mirrored = isMirrored ?? (x > (state.canvas?.width || 540) / 2 - 20);
  return drawHeroicFighterCard(slotProp, title, x, y, w, h, isP1, enabled, mirrored);
}

function openFighterSelectModal(slotProp, fighterIndex) {
  selectingSlot = slotProp;
  modalInspectIndex = fighterIndex;
  const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
  const pos = modalAvailableFighters.findIndex(f => f.idx === fighterIndex);
  
  if (pos !== -1) {
    const itemsPerPage = _getModalItemsPerPage();
    modalPage = Math.floor(pos / itemsPerPage);
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
        const itemsPerPage = _getModalItemsPerPage();
        const totalPages = Math.max(1, Math.ceil(modalAvailableFighters.length / itemsPerPage));
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
    const modalW = isLandscape ? Math.min(state.canvas.width - 28, 912) : Math.min(state.canvas.width - 20, 516);
    const modalH = isLandscape ? Math.min(state.canvas.height - 20, 508) : Math.min(state.canvas.height - 36, 760);
    const mx = (state.canvas.width - modalW) / 2;
    const my = (state.canvas.height - modalH) / 2;

    // If hovering anywhere over the modal or modal area
    if (mouseX >= mx - 20 && mouseX <= mx + modalW + 20 && mouseY >= my - 20 && mouseY <= my + modalH + 20) {
      e.preventDefault();
      const now = performance.now();
      if (now - _lastModalWheelTime > 140) {
        const modalAvailableFighters = FIGHTER_DEFS.map((def, idx) => ({ def, idx }))
          .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
        const itemsPerPage = _getModalItemsPerPage();
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

  // Gauntlet Mode: Mouse wheel over enemy pool flips pages!
  if ((state.mode === 'TLFS' || state.mode === GAME_MODES.TLFS) && _tlfsEnemyPoolBounds) {
    const { x, y, w, h, totalPages } = _tlfsEnemyPoolBounds;
    if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
      e.preventDefault();
      const now = performance.now();
      if (now - _lastTlfsWheelTime > 140) {
        _lastTlfsWheelTime = now;
        if (e.deltaY > 0) {
          if (tlfsPoolPage < (totalPages || 1) - 1) {
            tlfsPoolPage++;
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('skill_dash5', 0.12);
            }
          }
        } else if (e.deltaY < 0) {
          if (tlfsPoolPage > 0) {
            tlfsPoolPage--;
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('skill_dash5', 0.12);
            }
          }
        }
      }
      return;
    }
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

export { drawPlayerCard, drawHeroicFighterCard, drawDynamicVsClashEmblem, drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, randomize1v1Fighters, selectingSlot, modalInspectIndex, modalPage, tlfsPoolPage, openFighterSelectModal, isFighterSelectModalOpen, closeFighterSelectModal, getSelectingSlot };
