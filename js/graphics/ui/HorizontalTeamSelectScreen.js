import { state, saveFighterSelections, loadFighterSelections } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { HORIZONTAL_MAPS, getActiveHorizontalMap, setActiveHorizontalMap } from '../../systems/horizontalMapSystem.js';
import { _clearButtons, _registerButton, drawPanel, drawButton, drawStatBar, drawChamferedRect, fitSingleLineText, wrapText } from './uiFramework.js';
import { openFighterSelectModal, isFighterSelectModalOpen, drawFighterSelectModal, drawPlayerCard, getFighterWeaponInfo } from './CharacterSelectScreen.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';
import { drawArenaBgmSelector, isArenaBgmModalOpen, drawArenaBgmModal, openArenaBgmModal, closeArenaBgmModal } from '../../systems/arenaBgmSystem.js';
import { drawArenaFloorSelector, isArenaFloorModalOpen, drawArenaFloorModal, openArenaFloorModal, closeArenaFloorModal } from '../../systems/arenaTileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { goToTitle, startGame, startFaceOffScreen } from '../../core/gameFlow.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HORIZONTAL TEAM SELECT SCREEN (16:9 Widescreen Draft & Match Setup)
 * Fully unified with the Retro Crimson Pixel & Cream-Pink Manga UI Theme.
 * Displays authentic fighter models, live weapon previews, and consistent tokens:
 *  1. 1v1 Widescreen Duel (P1 vs P2 Arcade Face-Off)
 *  2. Free For All (4 Solo Combatants in Red, Blue, Green, Gold Columns)
 *  3. 4v4 Grand War (2 Big Team Columns)
 *  4. 8-Fighter Battle Royale (8 Solo Free-For-All Grid)
 *  5. 3v3v3v3 Teamfight & 2v2v2v2 Quad Battle (4 Team Pods)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TEAM_PALETTES = [
  { id: 0, name: 'RED TEAM', color: '#cc2b4d', bg: '#fff5f7', border: '#21050c', headerBg: '#21050c', accent: '#cc2b4d' },
  { id: 1, name: 'BLUE TEAM', color: '#38bdf8', bg: '#f0f9ff', border: '#21050c', headerBg: '#21050c', accent: '#38bdf8' },
  { id: 2, name: 'GREEN TEAM', color: '#00ff66', bg: '#f0fdf4', border: '#21050c', headerBg: '#21050c', accent: '#00ff66' },
  { id: 3, name: 'GOLD TEAM', color: '#ffd700', bg: '#fefce8', border: '#21050c', headerBg: '#21050c', accent: '#ffd700' },
];

export const ROYALE_PALETTES = [
  { id: 0, label: 'P1', color: '#cc2b4d', border: '#21050c' },
  { id: 1, label: 'P2', color: '#38bdf8', border: '#21050c' },
  { id: 2, label: 'P3', color: '#00ff66', border: '#21050c' },
  { id: 3, label: 'P4', color: '#ffd700', border: '#21050c' },
  { id: 4, label: 'P5', color: '#ff6b00', border: '#21050c' },
  { id: 5, label: 'P6', color: '#b5179e', border: '#21050c' },
  { id: 6, label: 'P7', color: '#7209b7', border: '#21050c' },
  { id: 7, label: 'P8', color: '#4cc9f0', border: '#21050c' },
];

export function initHorizontalTeamSelectScreen() {
  const isFfa = (state.mode === GAME_MODES.FFA || state.mode === 'FFA');
  if (!isFfa) {
    state.mode = GAME_MODES.HORIZONTAL_1V1;
  }
  loadFighterSelections();
  const requiredSlots = isFfa ? 4 : 2;
  if (!Array.isArray(state.horizontalRosterSlots) || state.horizontalRosterSlots.length < requiredSlots) {
    if (!Array.isArray(state.horizontalRosterSlots)) {
      state.horizontalRosterSlots = [0, 1, 2, 3];
    }
    while (state.horizontalRosterSlots.length < requiredSlots) {
      state.horizontalRosterSlots.push(state.horizontalRosterSlots.length);
    }
  }
  state.p1Index = state.horizontalRosterSlots[0] ?? state.p1Index ?? 0;
  state.p2Index = state.horizontalRosterSlots[1] ?? state.p2Index ?? 1;
  if (isFfa) {
    state.p3Index = state.horizontalRosterSlots[2] ?? state.p3Index ?? 2;
    state.p4Index = state.horizontalRosterSlots[3] ?? state.p4Index ?? 3;
  }
}

/**
 * Cycles a fighter slot forward or backward through the available roster.
 */
function _cycleFighterSlot(slotIndex, direction) {
  const currentDefs = getActiveFighterDefs();
  const availableFighters = currentDefs.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => !(!state.dummyEnabled && def.type === 'dummy'));
  if (availableFighters.length === 0) return;

  const currentIdx = state.horizontalRosterSlots?.[slotIndex] ?? slotIndex;
  const listPos = availableFighters.findIndex(f => f.idx === currentIdx);
  const count = availableFighters.length;
  let nextPos = 0;
  if (listPos !== -1) {
    nextPos = (listPos + direction + count) % count;
  }
  const nextIdx = availableFighters[nextPos].idx;
  if (!Array.isArray(state.horizontalRosterSlots)) {
    state.horizontalRosterSlots = [];
  }
  state.horizontalRosterSlots[slotIndex] = nextIdx;
  if (slotIndex === 0) state.p1Index = nextIdx;
  else if (slotIndex === 1) state.p2Index = nextIdx;
  else if (slotIndex === 2) state.p3Index = nextIdx;
  else if (slotIndex === 3) state.p4Index = nextIdx;
  saveFighterSelections();
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash5', 0.12);
  }
}

/**
 * Randomizes duel/FFA fighters with random unique characters from the roster.
 */
export function randomizeHorizontalRoster() {
  const defs = getActiveFighterDefs();
  const isFfa = (state.mode === GAME_MODES.FFA || state.mode === 'FFA');
  const numSlots = isFfa ? 4 : 2;
  if (defs.length < numSlots) return;

  const picked = [];
  while (picked.length < numSlots) {
    const idx = Math.floor(Math.random() * defs.length);
    if (!picked.includes(idx) || picked.length >= defs.length) {
      picked.push(idx);
    }
  }

  state.p1Index = picked[0];
  state.p2Index = picked[1];
  if (isFfa) {
    state.p3Index = picked[2];
    state.p4Index = picked[3];
  }

  if (!Array.isArray(state.horizontalRosterSlots)) {
    state.horizontalRosterSlots = [...picked];
  } else {
    for (let i = 0; i < numSlots; i++) {
      state.horizontalRosterSlots[i] = picked[i];
    }
  }
  saveFighterSelections();
}

/**
 * Draws an authentic fighter model avatar with a warm stage pedestal ring.
 */
function _drawFighterModelStage(ctx, cx, cy, radius, fighterIndex, def) {
  ctx.save();
  // Warm stage pedestal ellipse
  ctx.fillStyle = '#eed8dc';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.45, radius * 0.85, Math.max(6, radius * 0.20), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Authentic Fighter Live Preview
  const previewImg = getFighterPreview(fighterIndex);
  if (previewImg) {
    const size = radius * 2;
    ctx.drawImage(previewImg, cx - size / 2, cy - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = def?.color || '#FF3366';
    ctx.fill();
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(radius * 0.65)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((def?.name || '?').charAt(0).toUpperCase(), cx, cy);
  }
  ctx.restore();
}

/**
 * Renders the 16:9 Horizontal Team Select Screen onto ctx.
 */
export function drawHorizontalTeamSelectScreen(ctx) {
  _clearButtons();
  const defs = getActiveFighterDefs();
  const w = state.canvas.width || 960;
  const h = state.canvas.height || 540;

  ctx.save();

  // 1. Retro Crimson Pixel Backdrop (Unified with Vertical Mode)
  ctx.fillStyle = '#5c0f1c';
  ctx.fillRect(0, 0, w, h);

  // Pixel Dither Grid
  ctx.fillStyle = '#3d0711';
  for (let y = 0; y < h; y += 6) {
    for (let x = 0; x < w; x += 6) {
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + 3, y + 3, 2, 2);
    }
  }

  // 2. Top-Left Back Button
  drawButton('◀ BACK', 52, 28, () => {
    goToTitle();
  }, 76, 26);

  // 3. Header Title & Sub-Controls
  const isFfa = (state.mode === GAME_MODES.FFA || state.mode === 'FFA');
  const modeTitle = isFfa ? '[ FREE FOR ALL • 4 FIGHTERS ]' : '[ 1 VS 1 WIDESCREEN DUEL ]';

  // Title Text
  const titleY = 28;
  ctx.save();
  ctx.fillStyle = '#21050c';
  ctx.font = '700 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(modeTitle, w / 2 + 1, titleY + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(modeTitle, w / 2, titleY);
  ctx.restore();

  // Sub-Controls Bar (Arena BGM & Arena Floor / Tiles)
  const tmY = 54;
  const bgmW = 115;
  const floorW = 115;
  const gap = 8;
  const totalCtrlW = bgmW + gap + floorW;
  const startCtrlX = w / 2 - totalCtrlW / 2;

  drawArenaBgmSelector(ctx, startCtrlX, tmY, bgmW, 24);
  drawArenaFloorSelector(ctx, startCtrlX + bgmW + gap, tmY, floorW, 24);

  // 4. Layout
  if (isFfa) {
    _drawFfaSelectLayout(ctx, defs, w, h);
  } else {
    _draw1v1SelectLayout(ctx, defs, w, h);
  }

  ctx.restore();

  // 5. Render Modal Overlays on top if active
  if (isFighterSelectModalOpen()) {
    drawFighterSelectModal();
  }
  if (isArenaBgmModalOpen()) {
    drawArenaBgmModal(ctx);
  }
  if (isArenaFloorModalOpen()) {
    drawArenaFloorModal(ctx);
  }
}

/**
 * Layout 0: Free-For-All 4-Fighter Widescreen Draft Screen
 * 4 Symmetrical Columns across 16:9 canvas with authentic models, live weapon previews,
 * quick cycle buttons, stat bars, and modal selection triggers.
 */
function _drawFfaSelectLayout(ctx, defs, w, h) {
  const colW = 210;
  const colGap = 16;
  const startX = Math.floor((w - (colW * 4 + colGap * 3)) / 2); // 36px
  const topY = 88;
  const colH = 380;

  // Sync state.horizontalRosterSlots to p1..p4
  state.p1Index = state.horizontalRosterSlots?.[0] ?? state.p1Index ?? 0;
  state.p2Index = state.horizontalRosterSlots?.[1] ?? state.p2Index ?? 1;
  state.p3Index = state.horizontalRosterSlots?.[2] ?? state.p3Index ?? 2;
  state.p4Index = state.horizontalRosterSlots?.[3] ?? state.p4Index ?? 3;

  const playerNames = ['RED', 'BLUE', 'GREEN', 'GOLD'];

  for (let i = 0; i < 4; i++) {
    const cx = startX + i * (colW + colGap);
    const pal = TEAM_PALETTES[i] || TEAM_PALETTES[0];
    const fighterIndex = state.horizontalRosterSlots?.[i] ?? state[`p${i + 1}Index`] ?? i;
    const def = defs[fighterIndex] || FIGHTER_DEFS[fighterIndex] || defs[0];

    // 1. Outer Container Panel (Retro Cream/Crimson Frame)
    drawPanel(cx, topY, colW, colH, 0.98, 6, '#21050c');

    // 2. Header Band
    ctx.save();
    ctx.fillStyle = '#21050c';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, cx + 2, topY + 2, colW - 4, 26, 4);
    ctx.fill();
    ctx.stroke();

    // Top Accent Stripe
    ctx.fillStyle = pal.accent;
    ctx.fillRect(cx + 12, topY + 2, colW - 24, 2);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PLAYER ${i + 1} // ${playerNames[i]}`, cx + colW / 2, topY + 15);
    ctx.restore();

    // 3. Sub-Card Interior Area
    const subCardX = cx + 7;
    const subCardY = topY + 32;
    const subCardW = colW - 14;
    const subCardH = colH - 40;

    ctx.save();
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, subCardX, subCardY, subCardW, subCardH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Register click on sub-card to open fighter select modal
    _registerButton(subCardX, subCardY, subCardW, subCardH, () => {
      openFighterSelectModal(`slot_${i}`, fighterIndex);
    });

    // 4. Authentic Fighter Model Stage Avatar
    const avatarX = cx + colW / 2;
    const avatarY = topY + 76;
    _drawFighterModelStage(ctx, avatarX, avatarY, 28, fighterIndex, def);

    // Quick Cycle Arrow Buttons
    const arrowW = 22;
    const arrowH = 24;
    drawButton('◄', cx + 20, avatarY, () => _cycleFighterSlot(i, -1), arrowW, arrowH, null, 3);
    drawButton('►', cx + colW - 20, avatarY, () => _cycleFighterSlot(i, 1), arrowW, arrowH, null, 3);

    // 5. Fighter Name & Class Subtitle
    ctx.save();
    ctx.fillStyle = '#21050c';
    ctx.font = '900 12.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitSingleLineText(ctx, (def.name || 'FIGHTER').toUpperCase(), colW - 24), cx + colW / 2, topY + 116);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${(def.type || 'BRAWLER').toUpperCase()}`, colW - 24), cx + colW / 2, topY + 130);
    ctx.restore();

    // 6. Stat Bars
    const barW = colW - 28;
    const barX = cx + 14;
    drawStatBar(ctx, 'HP', def.hp || 200, 150, barX, topY + 144, barW, pal.accent);
    drawStatBar(ctx, 'DMG', def.damage || 20, 60, barX, topY + 159, barW, '#f59e0b');
    drawStatBar(ctx, 'SPD', def.speed || 2, 4, barX, topY + 174, barW, '#7c2d37');

    // 7. Live Weapon Preview Sub-Box
    const weaponBoxX = cx + 12;
    const weaponBoxY = topY + 193;
    const weaponBoxW = colW - 24;
    const weaponBoxH = 120;

    ctx.save();
    ctx.fillStyle = '#faedf0';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    drawChamferedRect(ctx, weaponBoxX, weaponBoxY, weaponBoxW, weaponBoxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const weaponInfo = getFighterWeaponInfo(def);

    ctx.save();
    ctx.fillStyle = '#b81c3b';
    ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, weaponBoxW - 12), weaponBoxX + 6, weaponBoxY + 6);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 8.5px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `[ ${weaponInfo.category} ]`, weaponBoxW - 12), weaponBoxX + 6, weaponBoxY + 18);

    // Mini Live Weapon Render
    const wStageX = weaponBoxX + weaponBoxW / 2;
    const wStageY = weaponBoxY + 58;

    // Stage ellipse
    ctx.fillStyle = '#eed8dc';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(wStageX, wStageY + 14, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.translate(wStageX, wStageY);
    ctx.scale(0.72, 0.72);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Short Ability / Desc Text
    ctx.save();
    ctx.fillStyle = '#21050c';
    ctx.font = '800 8.5px "Outfit", "Rajdhani", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, def.desc || '', wStageX, weaponBoxY + 84, weaponBoxW - 10, 10, 3);
    ctx.restore();

    // 8. "CHANGE" Button
    drawButton('CHANGE', cx + colW / 2, topY + colH - 24, () => {
      openFighterSelectModal(`slot_${i}`, fighterIndex);
    }, colW - 28, 22, null, 3);
  }

  // 9. Bottom Command Deck
  _drawUnifiedBottomCommandDeck(w, h, 'START FREE FOR ALL');
}

/**
 * Layout 1: Dedicated 1v1 Widescreen Duel (P1 vs P2 Unified 16:9 Large Cards)
 */
function _draw1v1SelectLayout(ctx, defs, w, h) {
  const topY = 88;
  const margin = 40;
  const cardGap = 40;
  const totalCardW = w - margin * 2;
  const cardW = Math.floor((totalCardW - cardGap) / 2); // ~390px
  const fullCardH = 380;

  const leftX = margin;
  const rightX = margin + cardW + cardGap;

  // Sync state.horizontalRosterSlots with p1Index and p2Index
  state.p1Index = state.horizontalRosterSlots?.[0] ?? state.p1Index ?? 0;
  state.p2Index = state.horizontalRosterSlots?.[1] ?? state.p2Index ?? 1;

  // Left Card (Player 1 // Red Challenger)
  drawPlayerCard('p1Index', 'PLAYER 1 // RED', leftX, topY, cardW, fullCardH, '#cc2b4d', true, true);

  // Right Card (Player 2 // Blue Opponent)
  drawPlayerCard('p2Index', 'PLAYER 2 // BLUE', rightX, topY, cardW, fullCardH, '#38bdf8', true, true);

  // Center Retro Pixel VS Crest
  const vsX = w / 2;
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

  // Bottom Command Deck
  _drawUnifiedBottomCommandDeck(w, h, 'START DUEL');
}

/**
 * Layout 2: 4v4 Grand War (2 Big Team Panels with Authentic Character Models)
 */
function _draw4v4SelectLayout(ctx, defs, w, h) {
  const colW = 410;
  const colH = 380;
  const topY = 88;
  const leftX = (w - (colW * 2 + 30)) / 2;
  const rightX = leftX + colW + 30;

  // 1. Red Team (Left Column, Slots 0..3)
  _draw4v4TeamColumn(ctx, leftX, topY, colW, colH, 'RED TEAM // SQUAD 1', '#cc2b4d', [0, 1, 2, 3], defs);

  // 2. Blue Team (Right Column, Slots 4..7)
  _draw4v4TeamColumn(ctx, rightX, topY, colW, colH, 'BLUE TEAM // SQUAD 2', '#38bdf8', [4, 5, 6, 7], defs);

  // Center VS Badge
  const vsX = w / 2;
  const vsY = topY + colH / 2;
  ctx.save();
  ctx.fillStyle = '#5e0d1f';
  ctx.beginPath();
  ctx.arc(vsX, vsY + 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b81c3b';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(vsX, vsY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', vsX, vsY + 0.5);
  ctx.restore();

  // Bottom Command Deck
  _drawUnifiedBottomCommandDeck(w, h, 'START GRAND WAR');
}

/**
 * Draws a 4v4 team panel with authentic fighter models and stats.
 */
function _draw4v4TeamColumn(ctx, x, y, w, h, title, accentColor, slotIndices, defs) {
  ctx.save();
  drawPanel(x, y, w, h, 0.98, 6, '#21050c');

  // Header band
  ctx.fillStyle = '#21050c';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Accent Line
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 12, y + 2, w - 24, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 15);

  const slotH = 74;
  const slotGap = 8;
  const startY = y + 36;

  slotIndices.forEach((slotIdx, i) => {
    const fighterIndex = state.horizontalRosterSlots?.[slotIdx] ?? slotIdx;
    const def = defs[fighterIndex] || FIGHTER_DEFS[fighterIndex] || defs[0];
    const cardY = startY + i * (slotH + slotGap);

    // Sub-card panel
    ctx.save();
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.4;
    drawChamferedRect(ctx, x + 8, cardY, w - 16, slotH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Register click to open fighter selection modal
    _registerButton(x + 8, cardY, w - 16, slotH, () => {
      openFighterSelectModal('slot_' + slotIdx, fighterIndex);
    });

    // Model Avatar Stage
    const avatarX = x + 40;
    const avatarY = cardY + slotH / 2;
    _drawFighterModelStage(ctx, avatarX, avatarY, 26, fighterIndex, def);

    // Fighter Name & Class Tag
    const textX = x + 76;
    const maxTextW = w - 170;
    ctx.fillStyle = '#21050c';
    ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, (def.name || 'FIGHTER').toUpperCase(), maxTextW), textX, cardY + 8);

    ctx.fillStyle = '#8b1524';
    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, `CLASS // ${(def.type || 'BRAWLER').toUpperCase()}`, maxTextW), textX, cardY + 23);

    // Stat bars
    const statW = 160;
    drawStatBar(ctx, 'HP', def.hp || 200, 150, textX, cardY + 37, statW, '#cc2b4d');
    drawStatBar(ctx, 'DMG', def.damage || 20, 60, textX, cardY + 53, statW, '#f59e0b');

    // Mini Live Weapon Preview Box on Right
    const weaponBoxW = 60;
    const weaponBoxH = slotH - 12;
    const weaponBoxX = x + w - 8 - weaponBoxW - 6;
    const weaponBoxY = cardY + 6;

    ctx.save();
    ctx.fillStyle = '#faedf0';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    drawChamferedRect(ctx, weaponBoxX, weaponBoxY, weaponBoxW, weaponBoxH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.translate(weaponBoxX + weaponBoxW / 2, weaponBoxY + weaponBoxH / 2 + 2);
    ctx.scale(0.60, 0.60);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Layout 3: 8-Fighter Battle Royale (4x2 Grid of Solo Fighters with Authentic Character Models)
 */
function _draw8RoyaleSelectLayout(ctx, defs, w, h) {
  const cardW = 205;
  const cardH = 185;
  const gapX = 14;
  const gapY = 10;
  const startX = (w - (cardW * 4 + gapX * 3)) / 2;
  const startY = 88;

  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    const slotFighter = state.horizontalRosterSlots?.[i] ?? i;
    const def = defs[slotFighter] || FIGHTER_DEFS[slotFighter] || defs[0];
    const pal = ROYALE_PALETTES[i] || ROYALE_PALETTES[0];

    // Card Window Panel
    drawPanel(cx, cy, cardW, cardH, 0.98, 6, '#21050c');

    // Slot Pill (P1..P8)
    ctx.fillStyle = '#21050c';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    drawChamferedRect(ctx, cx + 8, cy + 8, 36, 18, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.color;
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pal.label, cx + 26, cy + 17);

    // Register click on card to open selection modal
    _registerButton(cx, cy, cardW, cardH, () => {
      openFighterSelectModal('slot_' + i, slotFighter);
    });

    // Model Avatar Stage
    const avatarX = cx + cardW / 2;
    const avatarY = cy + 62;
    _drawFighterModelStage(ctx, avatarX, avatarY, 30, slotFighter, def);

    // Fighter Name & Role
    ctx.textAlign = 'center';
    ctx.font = '900 13px "Outfit", sans-serif';
    ctx.fillStyle = '#21050c';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitSingleLineText(ctx, (def.name || 'FIGHTER').toUpperCase(), cardW - 16), cx + cardW / 2, cy + 106);

    ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
    ctx.fillStyle = '#8b1524';
    ctx.fillText(`CLASS // ${(def.type || 'BRAWLER').toUpperCase()}`, cx + cardW / 2, cy + 120);

    // Stat bar
    drawStatBar(ctx, 'HP', def.hp || 200, 150, cx + 12, cy + 138, cardW - 24, pal.color);

    // Change Button
    drawButton('CHANGE', cx + cardW / 2, cy + cardH - 16, () => {
      openFighterSelectModal('slot_' + i, slotFighter);
    }, cardW - 24, 20, null, 3);
  }

  // Bottom Command Deck
  _drawUnifiedBottomCommandDeck(w, h, 'START BATTLE ROYALE');
}

/**
 * Layout 4: Multi-Team Draft (3v3v3v3 or 2v2v2v2 - 4 Columns with Authentic Character Models)
 */
function _drawMultiTeamSelectLayout(ctx, defs, w, h, is3v3v3v3) {
  const colW = 205;
  const colGap = 16;
  const startX = (w - (colW * 4 + colGap * 3)) / 2;
  const topY = 88;
  const colH = 385;
  const slotsPerTeam = is3v3v3v3 ? 3 : 2;

  for (let t = 0; t < 4; t++) {
    const pal = TEAM_PALETTES[t];
    const cx = startX + t * (colW + colGap);

    // Team Card Container
    drawPanel(cx, topY, colW, colH, 0.98, 6, '#21050c');

    // Team Header Badge
    ctx.fillStyle = '#21050c';
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, cx + 2, topY + 2, colW - 4, 26, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.accent;
    ctx.fillRect(cx + 12, topY + 2, colW - 24, 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pal.name, cx + colW / 2, topY + 15);

    // Render Slots in this Team
    const cardH = is3v3v3v3 ? 102 : 158;
    const cardGap = 8;
    const cardStartY = topY + 36;

    for (let s = 0; s < slotsPerTeam; s++) {
      const slotIndex = t * slotsPerTeam + s;
      const fighterIndex = state.horizontalRosterSlots?.[slotIndex] ?? slotIndex;
      const def = defs[fighterIndex] || FIGHTER_DEFS[fighterIndex] || defs[0];
      const cardY = cardStartY + s * (cardH + cardGap);

      // Slot Card Sub-box
      ctx.save();
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#21050c';
      ctx.lineWidth = 1.4;
      drawChamferedRect(ctx, cx + 8, cardY, colW - 16, cardH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Register click to open fighter selection modal
      _registerButton(cx + 8, cardY, colW - 16, cardH, () => {
        openFighterSelectModal('slot_' + slotIndex, fighterIndex);
      });

      // Model Avatar Stage
      const iconX = cx + 38;
      const iconY = cardY + (is3v3v3v3 ? 42 : 54);
      _drawFighterModelStage(ctx, iconX, iconY, is3v3v3v3 ? 20 : 26, fighterIndex, def);

      // Fighter Name & Role
      const textX = cx + 68;
      const maxTextW = colW - 80;
      ctx.textAlign = 'left';
      ctx.font = '900 12px "Outfit", sans-serif';
      ctx.fillStyle = '#21050c';
      ctx.textBaseline = 'top';
      ctx.fillText(fitSingleLineText(ctx, (def.name || 'FIGHTER').toUpperCase(), maxTextW), textX, cardY + 14);

      ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
      ctx.fillStyle = '#8b1524';
      ctx.fillText(`CLASS // ${(def.type || 'BRAWLER').toUpperCase()}`, textX, cardY + 28);

      // HP stat bar
      drawStatBar(ctx, 'HP', def.hp || 200, 150, cx + 14, cardY + (is3v3v3v3 ? 74 : 110), colW - 28, pal.accent);
    }
  }

  // Bottom Command Deck
  _drawUnifiedBottomCommandDeck(w, h, 'START GRAND BATTLE');
}

/**
 * Shared Bottom Action Command Deck for Horizontal Mode.
 */
function _drawUnifiedBottomCommandDeck(w, h, primaryLabel) {
  const startBtnW = 220;
  const thumbBtnW = 150;
  const randBtnW = 150;
  const btnGap = 10;
  const totalRowW = startBtnW + thumbBtnW + randBtnW + btnGap * 2;
  let startX = w / 2 - totalRowW / 2;

  const startBtnX = startX + startBtnW / 2;
  startX += startBtnW + btnGap;
  const thumbBtnX = startX + thumbBtnW / 2;
  startX += thumbBtnW + btnGap;
  const randBtnX = startX + randBtnW / 2;

  const actionRowY = 498;
  const btnH = 38;

  // 1. Primary Action Button (Start Battle)
  drawButton(primaryLabel, startBtnX, actionRowY, () => {
    startGame();
  }, startBtnW, btnH, '#cc2b4d', 6);

  // 2. Thumbnail / Face-Off Button
  drawButton('📸 THUMBNAIL', thumbBtnX, actionRowY, () => {
    startFaceOffScreen(true);
  }, thumbBtnW, btnH, '#d97706', 6);

  // 3. Randomize Roster Button
  drawButton('RANDOMIZE', randBtnX, actionRowY, () => {
    randomizeHorizontalRoster();
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.2);
    }
  }, randBtnW, btnH, null, 6);
}

/**
 * Handles pointer clicks inside Horizontal Team Select Screen.
 */
export function handleHorizontalTeamSelectClick(x, y, onStartBattle, onBack) {
  // If any modal is active, delegate entirely to modal / UI framework
  if (isFighterSelectModalOpen() || isArenaBgmModalOpen() || isArenaFloorModalOpen()) {
    return false;
  }
  return false;
}
