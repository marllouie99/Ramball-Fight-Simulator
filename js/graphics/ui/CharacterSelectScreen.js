import { goToTitle, startGame, startFaceOffScreen } from '../../core/gameFlow.js';
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
import { GAME_MODES } from '../../core/modeConfig.js';
import { STARTER_MAP, MONOLITH_MAP } from '../../../Tactical Force/maps/index.js';

let selectingSlot = null;
let modalInspectIndex = 0;
let modalPage = 0;
let isTacticalMapModalOpen = false;
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
  ctx.font = '700 7.5px "Press Start 2P", monospace';
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

function drawMinimapBlueprint(ctx, map, x, y, w, h) {
  ctx.save();
  // Floor background
  ctx.fillStyle = '#060a12';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Scale map obstacles to fit the minimap rect dynamically
  const mapArena = map.arena || { x: 40, y: 105, width: 460, height: 740 };
  const scaleX = w / mapArena.width;
  const scaleY = h / mapArena.height;

  if (map.obstacles && Array.isArray(map.obstacles)) {
    map.obstacles.forEach(obs => {
      const ox = x + (obs.x - mapArena.x) * scaleX;
      const oy = y + (obs.y - mapArena.y) * scaleY;
      const ow = obs.w * scaleX;
      const oh = obs.h * scaleY;
      ctx.fillStyle = '#334155';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, ow, oh);
    });
  }

  // Draw spawn indicator points (cyan dots)
  const isMonolith = (map.id === 'tactical_monolith_map' || map === MONOLITH_MAP);
  const spawnPoints = isMonolith
    ? (map.spawns?.fourPlayer || MONOLITH_MAP.spawns.fourPlayer)
    : (map.spawns?.ffa || STARTER_MAP.spawns?.ffa || [
        { x: 87.5, y: 210 }, { x: 452.5, y: 210 }, { x: 87.5, y: 690 }, { x: 452.5, y: 690 }
      ]);

  spawnPoints.forEach(sp => {
    const sx = x + (sp.x - mapArena.x) * scaleX;
    const sy = y + (sp.y - mapArena.y) * scaleY;
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();
  });

  ctx.restore();
}

function drawTacticalMapSelectModal() {
  const { ctx, canvas } = state;
  const modalW = Math.min(canvas.width - 24, 500);
  const modalH = 590;
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  // Retro Dim Backdrop Overlay
  ctx.fillStyle = 'rgba(33, 5, 12, 0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Backdrop click closes modal
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    isTacticalMapModalOpen = false;
  });

  // Blocker over modal panel window
  _registerButton(mx, my, modalW, modalH, () => {});

  // Draw main outer retro cream-pink panel
  drawPanel(mx, my, modalW, modalH, 0.98, 6, '#21050c');

  // Header Banner
  ctx.fillStyle = '#b81c3b';
  ctx.font = '700 7.5px "Silkscreen", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TACTICAL SHOOTER // BATTLEGROUND MAP SELECTION // SYS.v2.5', mx + 18, my + 14);

  ctx.fillStyle = '#21050c';
  ctx.font = '700 10.5px "Press Start 2P", monospace';
  ctx.fillText('CHOOSE COMBAT SECTOR MAP', mx + 18, my + 28);

  // Header accent line
  ctx.fillStyle = '#21050c';
  ctx.fillRect(mx + 18, my + 48, modalW - 36, 2);

  const activeMap = state.activeMap || STARTER_MAP;
  const maps = [
    {
      map: STARTER_MAP,
      title: 'SECTOR 01: STARTER PROTOCOL',
      subtitle: 'BALANCED BREACH FACILITY',
      features: '4 CORNERS • 7 BARRIERS • CENTER MID-WALL',
      desc: 'Balanced breach facility with corner spawn pockets, wide flanking corridors, and center mid-lane cover. Ideal for dynamic team crossfires.'
    },
    {
      map: MONOLITH_MAP,
      title: 'SECTOR 02: MONOLITH',
      subtitle: 'QUAD 2x2 MONOLITH PILLARS',
      features: '4 MONOLITHS • CROSSFIRE CORRIDOR • 4-WAY FLANKS',
      desc: 'Quad central monolith pillars divided by a crossfire intersection, creating 4-way cover pockets and dynamic tactical shootouts.'
    }
  ];

  const cardW = modalW - 36;
  const cardH = 210;
  const startCardY = my + 60;
  const cardGap = 16;

  maps.forEach((item, idx) => {
    const cardY = startCardY + idx * (cardH + cardGap);
    const isSelected = (activeMap.id === item.map.id || activeMap === item.map);

    // 3D Shadow
    ctx.fillStyle = isSelected ? '#5e0d1f' : '#baa88c';
    drawChamferedRect(ctx, mx + 18, cardY + 3, cardW, cardH, 4);
    ctx.fill();

    // Card background
    ctx.fillStyle = isSelected ? '#fff5f7' : '#faedf0';
    ctx.strokeStyle = isSelected ? '#b81c3b' : '#21050c';
    ctx.lineWidth = isSelected ? 2 : 1.6;
    drawChamferedRect(ctx, mx + 18, cardY, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();

    // Minimap blueprint preview on left
    const miniW = 90;
    const miniH = 170;
    const miniX = mx + 30;
    const miniY = cardY + 20;
    drawMinimapBlueprint(ctx, item.map, miniX, miniY, miniW, miniH);

    // Text intel on right
    const textX = miniX + miniW + 16;
    const maxTextW = cardW - miniW - 44;

    // Title
    ctx.fillStyle = isSelected ? '#b81c3b' : '#21050c';
    ctx.font = '700 8.5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(item.title, textX, cardY + 18);

    // Subtitle
    ctx.fillStyle = '#8b1524';
    ctx.font = '700 7.5px "Silkscreen", monospace';
    ctx.fillText(item.subtitle, textX, cardY + 36);

    // Features tag
    ctx.fillStyle = '#d97706';
    ctx.font = '700 7px "Silkscreen", monospace';
    ctx.fillText(item.features, textX, cardY + 52);

    // Description
    ctx.fillStyle = '#21050c';
    ctx.font = '700 7.5px "Silkscreen", monospace';
    wrapText(ctx, item.desc, textX, cardY + 70, maxTextW, 13);

    // Status pill button
    const pillW = 108;
    const pillH = 26;
    const pillX = textX;
    const pillY = cardY + cardH - 36;

    ctx.save();
    ctx.fillStyle = isSelected ? '#5e0d1f' : '#baa88c';
    drawChamferedRect(ctx, pillX, pillY + 2, pillW, pillH, 3);
    ctx.fill();

    ctx.fillStyle = isSelected ? '#cc2b4d' : '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.6;
    drawChamferedRect(ctx, pillX, pillY, pillW, pillH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#ffffff' : '#21050c';
    ctx.font = '700 6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isSelected ? '✓ ACTIVE' : 'SELECT MAP', pillX + pillW / 2, pillY + pillH / 2 + 0.5);
    ctx.restore();

    // Register card click
    _registerButton(mx + 18, cardY, cardW, cardH, () => {
      state.activeMap = item.map;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25);
      }
      isTacticalMapModalOpen = false;
    });
  });

  // Bottom Close Button
  const closeBtnW = 160;
  const closeBtnH = 32;
  const closeBtnX = canvas.width / 2;
  const closeBtnY = my + modalH - 28;
  drawButton('CLOSE MAP LIST', closeBtnX, closeBtnY, () => {
    isTacticalMapModalOpen = false;
  }, closeBtnW, closeBtnH, null, 4);
}

function drawFighterSelectModal() {
  const { ctx, canvas } = state;
  const modalW = Math.min(canvas.width - 20, 510);
  const modalH = Math.min(canvas.height - 40, 600);
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

  const isTactical = state.gameCategory === 'tactical';
  const currentDefs = getActiveFighterDefs();
  const selectedDef = currentDefs[modalInspectIndex] || currentDefs[0] || FIGHTER_DEFS[0];

  // Draw main outer retro cream-pink panel
  drawPanel(mx, my, modalW, modalH, 0.98, 6, '#21050c');

  // Header Banner
  const pNumMatch = selectingSlot ? selectingSlot.match(/\d/) : null;
  const slotLabel = pNumMatch ? `PLAYER ${pNumMatch[0]}` : 'PLAYER';

  ctx.fillStyle = '#b81c3b';
  ctx.font = '700 7.5px "Silkscreen", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(isTactical ? 'TACTICAL FORCE // OPERATIVE ROSTER' : 'TACTICAL ROSTER // PROTOCOL 01', mx + 18, my + 14);

  ctx.fillStyle = '#21050c';
  ctx.font = '700 10.5px "Press Start 2P", monospace';
  ctx.fillText(`CHOOSE FIGHTER (${slotLabel})`, mx + 18, my + 28);

  // Header accent line
  ctx.fillStyle = '#21050c';
  ctx.fillRect(mx + 18, my + 48, modalW - 36, 2);

  // ── Paginated Grid Configuration (Left Side: 3 Columns x 5 Rows = 15 Items per Page) ──
  const cols = 3;
  const rows = 5;
  const itemsPerPage = cols * rows;
  const gap = 6;
  const gridW = 210;
  const listX = mx + 18;
  const listY = my + 58;

  const cellW = Math.floor((gridW - (cols - 1) * gap) / cols);
  const cellH = 68;

  const modalAvailableFighters = currentDefs.map((def, idx) => ({ def, idx }))
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
    ctx.font = '700 6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    let shortName = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
    if (shortName.length > 8) shortName = shortName.substring(0, 7) + '.';
    ctx.fillText(shortName.toUpperCase(), avatarX, itemY + cellH - 3);

    _registerButton(itemX, itemY, cellW, cellH + 2, () => {
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
  ctx.fillStyle = '#eed8dc';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, listX, paginationY, gridW, paginationH, 4);
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
  }, pageBtnW, pageBtnH, null, 3);

  // Next Page Button
  drawButton('►', listX + gridW - 8 - pageBtnW / 2, pageBtnY, () => {
    if (modalPage < totalPages - 1) {
      modalPage++;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  }, pageBtnW, pageBtnH, null, 3);

  // Page Indicator Text & Dot Pips
  ctx.fillStyle = '#21050c';
  ctx.font = '700 7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${modalPage + 1} / ${totalPages}`, listX + gridW / 2, paginationY + 11);

  // Retro Dot Pips
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

  // ── Right Side: Champion Showcase Stage ──
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

  // Warm pedestal
  ctx.save();
  ctx.fillStyle = '#eed8dc';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(previewX, previewY + 32, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Draw Champion Preview Image
  const previewImage = getFighterPreview(modalInspectIndex);
  if (previewImage) {
    const previewSize = 78;
    ctx.drawImage(previewImage, previewX - previewSize / 2, previewY - previewSize / 2, previewSize, previewSize);
  }

  // Champion Name
  ctx.fillStyle = '#21050c';
  ctx.font = '700 9.5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDef.name.toUpperCase(), previewX, detailY + 104);

  // Class Badge Pill
  const pillW = 96;
  const pillH = 16;
  ctx.fillStyle = '#b81c3b';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, previewX - pillW / 2, detailY + 116, pillW, pillH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 6.5px "Press Start 2P", monospace';
  ctx.fillText(`CLASS // ${selectedDef.type.toUpperCase()}`, previewX, detailY + 124.5);

  // Stat Bars
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
          if (state.showRezeTransformation) {
            audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.95);
          } else {
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
          }
        } catch (e) {}
      },
      115,
      18,
      isHybrid ? '#b81c3b' : null,
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

  // ── Weapon Visual Showcase Box in Modal ──
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

  // Weapon Title
  ctx.fillStyle = '#b81c3b';
  ctx.font = '700 6.5px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${modalWeaponInfo.name}`, barW - 16), barX + 8, mWeaponBoxY + 7);

  ctx.fillStyle = '#8b1524';
  ctx.font = '700 6px "Silkscreen", monospace';
  ctx.fillText(fitSingleLineText(ctx, `[ ${modalWeaponInfo.category} ]`, barW - 16), barX + 8, mWeaponBoxY + 20);

  // Live Weapon Graphic Stage
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

  // Ability Header & Text Below
  const mAbilityY = mWeaponBoxY + mWeaponBoxH + 8;
  ctx.fillStyle = '#b81c3b';
  ctx.font = '700 6.5px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${selectedDef.ability.toUpperCase()}`, barW), barX, mAbilityY);

  ctx.fillStyle = '#21050c';
  ctx.font = '700 7px "Silkscreen", monospace';
  wrapText(ctx, selectedDef.desc, barX, mAbilityY + 14, barW, 11, 4);

  // Footer Action Buttons
  const footerY = my + modalH - 34;
  const btnW = 130;
  const btnH = 34;

  drawButton('CANCEL', listX + gridW / 2, footerY, () => {
    selectingSlot = null;
  }, btnW, btnH, null, 4);

  drawButton('LOCK IN', detailX + detailW / 2, footerY, () => {
    if (selectingSlot) {
      state[selectingSlot] = modalInspectIndex;
      saveFighterSelections();
    }
    selectingSlot = null;
  }, btnW, btnH, '#cc2b4d', 4);
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

  // ── Unified Top Back Button ──
  drawButton('◀ BACK', 52, 64, () => { goToTitle(); }, 76, 26);

  // ── Header Section ──
  const isTactical = state.gameCategory === 'tactical' || mode === 'Tactical 2v2' || mode === 'Tactical FFA' || mode === 'Tactical 4v4' || mode === 'Tactical 1v1' || mode === GAME_MODES.TACTICAL_1V1;
  const isTac1v1 = isTactical && (mode === 'Tactical 1v1' || mode === GAME_MODES.TACTICAL_1V1 || mode === '1v1');
  const isTacFFA = isTactical && (mode === 'Tactical FFA' || mode === GAME_MODES.TACTICAL_FFA);

  // Screen Title: FIGHT OF LARPERS 101
  ctx.save();
  const titleText = isTac1v1
    ? '[ 1 VS 1 DUEL ]'
    : (isTacFFA
      ? '[ 4-PLAYER FFA ]'
      : (isTactical ? '[ 2 VS 2 FIREFIGHT ]' : '[ FIGHT OF LARPERS 101 ]'));
  
  ctx.fillStyle = '#21050c';
  ctx.font = '700 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, canvas.width / 2 + 1, 64 + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(titleText, canvas.width / 2, 64);
  ctx.restore();

  // Tactical Sub-Controls (Map Selector & Arena BGM)
  const mapW = isTactical ? 130 : 0;
  const bgmW = 130;
  const ctrlH = 24;
  const gap = 10;
  const totalCtrlW = (isTactical ? mapW + gap : 0) + bgmW;
  const startCtrlX = canvas.width / 2 - totalCtrlW / 2;
  
  const tmY = 96;
  let curCtrlX = startCtrlX;
  if (isTactical) {
    const activeMap = state.activeMap || STARTER_MAP;
    const isMonolith = (activeMap.id === 'tactical_monolith_map' || activeMap === MONOLITH_MAP);
    const mapLabel = isMonolith ? '🗺️ MONOLITH' : '🗺️ SECTOR 01';

    ctx.save();
    ctx.fillStyle = '#baa88c';
    drawChamferedRect(ctx, curCtrlX, tmY + 2, mapW, ctrlH, 3);
    ctx.fill();

    ctx.fillStyle = '#faedf0';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.6;
    drawChamferedRect(ctx, curCtrlX, tmY, mapW, ctrlH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#21050c';
    ctx.font = '700 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mapLabel, curCtrlX + mapW / 2, tmY + ctrlH / 2 + 0.5);
    ctx.restore();

    _registerButton(curCtrlX, tmY, mapW, ctrlH + 2, () => {
      isTacticalMapModalOpen = true;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25);
      }
    });

    curCtrlX += mapW + gap;
  }

  // Arena BGM Selector Button
  drawArenaBgmSelector(ctx, curCtrlX, tmY, bgmW, ctrlH);

  // ── Main Combatant Grid ──
  const topY = 134;
  const margin = 16;
  const cardGap = 12;
  const totalCardW = canvas.width - margin * 2;
  const cardW = Math.floor((totalCardW - cardGap) / 2); // 248px
  const fullCardH = 680; // Expands to Y = 814, leaving clean space before bottom command dock

  if (isTac1v1 || (!isTactical && (mode === '1v1' || mode === 'Stand Off'))) {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;

    const p1Title = isTac1v1 ? 'OPERATIVE 1 // CT' : 'PLAYER 1 // RED';
    const p2Title = isTac1v1 ? 'OPERATIVE 2 // T' : 'PLAYER 2 // BLUE';
    const p1Color = isTac1v1 ? '#3b82f6' : '#cc2b4d';
    const p2Color = isTac1v1 ? '#ef4444' : '#38bdf8';

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
    ctx.font = '700 9.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY + 0.5);
    ctx.restore();

    // Bottom Command Dock
    const btnText = isTac1v1 ? 'START TACTICAL DUEL' : 'START BATTLE';
    drawBottomCommandDeck(btnText, () => startGame(), () => randomize1v1Fighters());

  } else if (!isTactical && (mode === '1v2 Stand Off' || mode === '1v2' || mode === GAME_MODES.STAND_OFF_1V2 || mode === 'STAND_OFF_1V2')) {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    drawPlayerCard('p1Index', 'BOSS CHAMPION', leftX, topY, cardW, fullCardH, '#cc2b4d', true, true);
    drawPlayerCard('p2Index', 'DUO SQUAD 1', rightX, topY, cardW, stackedH, '#38bdf8', true);
    drawPlayerCard('p3Index', 'DUO SQUAD 2', rightX, bottomY, cardW, stackedH, '#38bdf8', true);

    drawBottomCommandDeck('START BATTLE', () => startGame(), () => randomize1v2Fighters());

  } else if (isTactical || mode === '2v2' || mode === 'Tactical 2v2' || mode === 'FFA' || mode === 'Tactical FFA') {
    const leftX = margin;
    const rightX = margin + cardW + cardGap;
    const stackedH = Math.floor((fullCardH - cardGap) / 2);
    const bottomY = topY + stackedH + cardGap;

    const isTeamMode = isTactical || mode === '2v2' || mode === 'Tactical 2v2';

    const p1Title = isTactical ? 'TEAM 1 // ALPHA' : (mode === '2v2' ? 'RED // SQUAD 1' : 'PLAYER 1');
    const p2Title = isTactical ? 'TEAM 2 // CHARLIE' : (mode === '2v2' ? 'BLUE // SQUAD 1' : 'PLAYER 2');
    const p3Title = isTactical ? 'TEAM 1 // BRAVO' : (mode === '2v2' ? 'RED // SQUAD 2' : 'PLAYER 3');
    const p4Title = isTactical ? 'TEAM 2 // DELTA' : (mode === '2v2' ? 'BLUE // SQUAD 2' : 'PLAYER 4');

    const p1Color = isTactical ? '#3b82f6' : (mode === '2v2' ? '#cc2b4d' : '#ef4444');
    const p2Color = isTactical ? '#ef4444' : (mode === '2v2' ? '#38bdf8' : '#38bdf8');
    const p3Color = isTactical ? '#3b82f6' : (mode === '2v2' ? '#cc2b4d' : '#f59e0b');
    const p4Color = isTactical ? '#ef4444' : (mode === '2v2' ? '#38bdf8' : '#a855f7');

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
      ctx.font = '700 9.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', vsX, vsY + 0.5);
      ctx.restore();
    }

    drawBottomCommandDeck(isTactical ? 'START TACTICAL 2V2' : (mode === '2v2' ? 'START 2V2 DUO' : 'START BATTLE'), () => startGame(), () => randomizeFfaFighters());

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

  if (isTacticalMapModalOpen) {
    drawTacticalMapSelectModal();
  }

  if (isArenaBgmModalOpen()) {
    drawArenaBgmModal(state.ctx);
  }
}

function drawBottomCommandDeck(primaryLabel, onStart, onRandomize) {
  const { canvas, ctx } = state;
  const startBtnW = 180;
  const thumbBtnW = 135;
  const randBtnW = 135;
  const btnGap = 10;
  const totalRowW = startBtnW + thumbBtnW + randBtnW + btnGap * 2;
  let startX = canvas.width / 2 - totalRowW / 2;

  const startBtnX = startX + startBtnW / 2;
  startX += startBtnW + btnGap;
  const thumbBtnX = startX + thumbBtnW / 2;
  startX += thumbBtnW + btnGap;
  const randBtnX = startX + randBtnW / 2;

  const actionRowY = 852;

  drawButton(primaryLabel, startBtnX, actionRowY, onStart, startBtnW, 46, '#cc2b4d', 6);
  drawButton('📸 THUMBNAIL', thumbBtnX, actionRowY, () => {
    startFaceOffScreen(true);
  }, thumbBtnW, 46, '#d97706', 6);
  drawButton('RANDOMIZE', randBtnX, actionRowY, onRandomize, randBtnW, 46, null, 6);
}

function randomize1v1Fighters() {
  const currentDefs = getActiveFighterDefs();
  const available = currentDefs.map((_, idx) => idx).filter(idx => currentDefs[idx] && currentDefs[idx].type !== 'dummy');
  if (available.length > 0) {
    state.p1Index = available[Math.floor(Math.random() * available.length)];
    const remaining = available.filter(idx => idx !== state.p1Index);
    state.p2Index = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : state.p1Index;
  }
}

function randomize1v2Fighters() {
  const currentDefs = getActiveFighterDefs();
  const available = currentDefs.map((_, idx) => idx).filter(idx => currentDefs[idx] && currentDefs[idx].type !== 'dummy');
  if (available.length > 0) {
    state.p1Index = available[Math.floor(Math.random() * available.length)];
    const rem1 = available.filter(idx => idx !== state.p1Index);
    state.p2Index = rem1.length > 0 ? rem1[Math.floor(Math.random() * rem1.length)] : state.p1Index;
    const rem2 = rem1.filter(idx => idx !== state.p2Index);
    state.p3Index = rem2.length > 0 ? rem2[Math.floor(Math.random() * rem2.length)] : state.p2Index;
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
      return { name: 'BOMB DEVIL & CONCEALED BLADE', category: 'DEVIL // EXPLOSIVE RUSHDOWN', desc: 'Sleeve-concealed knife strings, 120° blast martial punches, Spark Flechette projectile spreads, Decoy Bombs, and Megaton Tsar Nuke.' };
    case 'denji':
      return { name: 'TWIN CHAINSAWS & POCHITA RIPCORD', category: 'DEVIL // BERSERKER', desc: 'Mechanical forearm and forehead chainsaws with high-RPM shredding, 25% lifesteal, engine lunges, and Pochita ripcord revive.' };
    case 'power':
      return { name: 'GIGANTIC BLOOD HAMMER & SCYTHE', category: 'DEVIL // BLOOD MANIPULATION', desc: 'Solidified crystalline blood warhammer with 140° ground shockwave stuns, 360° blood scythe whirlwinds, and Thousand Blood Daggers.' };
    case 'dummy':
      return { name: 'BALLISTIC TARGET CHASSIS', category: 'TRAINING // SANDBOX', desc: 'Reinforced training frame designed for testing weapon DPS and combos.' };
    default:
      return { name: (def.ability || 'TACTICAL WEAPON').toUpperCase(), category: 'COMBAT ARSENAL', desc: def.desc || 'Standard tactical armament.' };
  }
}

function drawPlayerCard(slotProp, title, x, y, w, h, accentColor, enabled, isLarge = false) {
  const { ctx } = state;
  const isAnyModalOpen = (selectingSlot !== null || isTacticalMapModalOpen || isArenaBgmModalOpen());
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
  ctx.font = '700 7.5px "Press Start 2P", monospace';
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
    ctx.font = '700 8px "Press Start 2P", monospace';
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
      saveFighterSelections();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.12);
      }
    }
  };

  if (isLarge) {
    // ── TALL SHOWCASE CARD (1v1 / Stand-Off Solo / TLFS: H = 680) ──
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
    ctx.font = '700 10.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.toUpperCase(), avatarX, y + 144);

    // Class Tag Pill
    const pillW = 96;
    const pillH = 16;
    ctx.fillStyle = '#b81c3b';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, avatarX - pillW / 2, y + 156, pillW, pillH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 6.5px "Press Start 2P", monospace';
    ctx.fillText(`CLASS // ${def.type.toUpperCase()}`, avatarX, y + 164.5);

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
    ctx.font = '700 6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `ABILITY // ${def.ability.toUpperCase()}`, statBoxW - 16), statBoxX + 8, abilityY + 7);

    ctx.fillStyle = '#21050c';
    ctx.font = '700 7px "Silkscreen", monospace';
    wrapText(ctx, def.desc, statBoxX + 8, abilityY + 20, statBoxW - 16, 11, 5);

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
    ctx.font = '700 6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, statBoxW - 16), statBoxX + 8, weaponY + 7);

    ctx.fillStyle = '#8b1524';
    ctx.font = '700 6px "Silkscreen", monospace';
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
    ctx.font = '700 7px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, weaponInfo.desc, wStageX, weaponY + 222, statBoxW - 16, 11, 4);

    // Change Fighter Button
    const btnW = w - 24;
    const btnH = 36;
    const btnY = y + h - btnH - 12;

    drawButton('CHANGE FIGHTER (ROSTER)', x + w / 2, btnY + btnH / 2, () => {
      openFighterSelectModal(slotProp, fighterIndex);
    }, btnW, btnH, null, 4);

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
    ctx.font = '700 8.5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, def.name.toUpperCase(), detailW - 4), detailX, y + 32);

    ctx.fillStyle = '#8b1524';
    ctx.font = '700 6.5px "Silkscreen", monospace';
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
    ctx.font = '700 6.5px "Press Start 2P", monospace';
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
    ctx.font = '700 7px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    wrapText(ctx, `${def.ability}: ${def.desc}`, x + 15, weaponBoxY + 18, boxW - 75, 10.5, 4);

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
}

// Global Keyboard Shortcuts for Tactical Select Screen
window.addEventListener('keydown', (e) => {
  if (state.gameState === 'select') {
    if (isTacticalMapModalOpen) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        isTacticalMapModalOpen = false;
        e.preventDefault();
        return;
      }
    }
    if (isArenaBgmModalOpen()) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeArenaBgmModal();
        e.preventDefault();
        return;
      }
    }
    if (selectingSlot !== null) {
      if (e.key === 'Escape') {
        selectingSlot = null;
        e.preventDefault();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        if (selectingSlot) {
          state[selectingSlot] = modalInspectIndex;
          saveFighterSelections();
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
    } else if (e.code === 'KeyT') {
      e.preventDefault();
      startFaceOffScreen(true);
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

  // Block card wheel cycling when Arena BGM or Tactical Map modal is active
  if (isArenaBgmModalOpen() || isTacticalMapModalOpen) {
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
        saveFighterSelections();
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.12);
        }
      }
    }
  }
}, { passive: false });

export { drawTlfsEnemyPoolGrid, drawSmallFighterBadge, drawFighterSelectModal, drawSelectScreen, randomizeFfaFighters, selectingSlot, modalInspectIndex, modalPage };
