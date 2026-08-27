import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { state, getLeaderboardData } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { startGame, goToTitle } from '../../core/gameFlow.js';
import { GAME_MODES, MODE_ROUNDS, MODE_SETTINGS } from '../../core/modeConfig.js';

function drawTitleScreen() {
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
  
  // Note: HTML DOM Overlay now handles buttons and text.
}

// ─────────────────────────────────────────────
// LEADERBOARD SCREEN
// ─────────────────────────────────────────────
let leaderboardSortBy = 'wins'; // 'wins' | 'losses' | 'winRate'
let isLeaderboardEditMode = false;

function drawLeaderboardScreen() {
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
  ctx.font = '900 26px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🏆 LEADERBOARD', canvas.width / 2, 66);

  ctx.fillStyle = '#8899aa';
  ctx.font = 'bold 11px "Rajdhani", sans-serif';
  ctx.fillText('1v1 Mode Combat Statistics', canvas.width / 2, 86);

  // Edit Mode Toggle
  drawButton('✏️ EDIT: ' + (isLeaderboardEditMode ? 'ON' : 'OFF'), canvas.width - 90, 62, () => {
    if (isLeaderboardEditMode) {
      if (confirm('Save your edited leaderboard records?')) {
        import('../core/state.js').then(m => m.saveLeaderboard());
      } else {
        import('../core/state.js').then(m => m.loadLeaderboard());
      }
    }
    isLeaderboardEditMode = !isLeaderboardEditMode;
  }, 130, 26);

  // Sort buttons
  const sortY = 118;
  const sortOptions = [
    { id: 'wins', label: 'WINS' },
    { id: 'losses', label: 'LOSSES' },
    { id: 'winRate', label: 'WIN RATE' },
  ];

  const btnWidth = 110;
  const btnHeight = 28;
  const gap = 12;
  const totalWidth = sortOptions.length * btnWidth + (sortOptions.length - 1) * gap;
  let startX = canvas.width / 2 - totalWidth / 2;

  sortOptions.forEach((opt) => {
    const selected = leaderboardSortBy === opt.id;
    ctx.save();
    if (selected) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
    }
    drawChamferedRect(ctx, startX, sortY - btnHeight / 2, btnWidth, btnHeight, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = selected ? '#00e5ff' : '#94a3b8';
    ctx.font = '900 12px "Rajdhani", sans-serif';
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
  const tableX = 40;
  const tableY = 156;
  const tableW = canvas.width - 80;
  const rowH = 46;
  const colWidths = [tableW * 0.08, tableW * 0.34, tableW * 0.14, tableW * 0.14, tableW * 0.14, tableW * 0.16];
  const colX = [tableX];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  // Header background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, tableX, tableY, tableW, rowH, 6);
  ctx.fill();
  ctx.stroke();

  // Header text
  const headers = ['#', 'FIGHTER', 'WINS', 'LOSSES', 'GAMES', 'WIN%'];
  ctx.font = '900 11.5px "Rajdhani", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#00e5ff';

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
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No matches played yet', canvas.width / 2, tableY + rowH + 60);
    ctx.font = '12px Arial';
    ctx.fillText('Play 1v1 battles to see your stats here!', canvas.width / 2, tableY + rowH + 85);
  } else {
    displayData.forEach((entry, idx) => {
      const rowY = tableY + rowH + idx * (rowH + 3);
      const def = FIGHTER_DEFS[entry.fighterIndex];

      // Row background (alternating)
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, tableX, rowY, tableW, rowH, 5);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.fillStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#888';
      ctx.font = '900 13px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(idx + 1, colX[0] + colWidths[0] / 2, rowY + rowH / 2);

      // Fighter name with color
      ctx.fillStyle = def ? def.color : '#fff';
      ctx.font = 'bold 13px "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((def ? def.name : `Fighter ${entry.fighterIndex}`).toUpperCase(), colX[1] + 10, rowY + rowH / 2);

      // Stats
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';

      if (isLeaderboardEditMode) {
        _drawSmallEditor(ctx, entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2, entry.fighterIndex, 'wins');
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
  const footerY = canvas.height - 50;
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
  }, 150, 36);

  // Clear stats button
  ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
  ctx.font = '10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Right-click to clear stats', 40, footerY + 5);
  _registerButton(40, footerY - 10, 150, 24, () => { });

  state.canvas.oncontextmenu = (e) => {
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (mx >= 40 && mx <= 200 && my >= footerY - 30 && my <= footerY + 20) {
      if (confirm('Clear all leaderboard stats?')) {
        state.leaderboard = {};
        import('../core/state.js').then(m => m.saveLeaderboard());
      }
    }
  };
}

function _drawSmallEditor(ctx, val, x, y, fighterIndex, statName) {
  ctx.fillStyle = '#fff';
  ctx.fillText(val, x, y);

  const btnSize = 16;
  const mx = x - 22;
  const my = y - btnSize / 2;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.beginPath(); ctx.roundRect(mx, my, btnSize, btnSize, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('-', mx + btnSize / 2, y);
  _registerButton(mx, my, btnSize, btnSize, () => {
    import('../core/state.js').then(m => {
      m.initLeaderboardEntry(fighterIndex);
      state.leaderboard[fighterIndex][statName] = Math.max(0, state.leaderboard[fighterIndex][statName] - 1);
    });
  });

  const px = x + 22 - btnSize;
  const py = y - btnSize / 2;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.beginPath(); ctx.roundRect(px, py, btnSize, btnSize, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('+', px + btnSize / 2, y);
  _registerButton(px, py, btnSize, btnSize, () => {
    import('../core/state.js').then(m => {
      m.initLeaderboardEntry(fighterIndex);
      state.leaderboard[fighterIndex][statName]++;
    });
  });
}

function drawModeSelection(cx, cy) {
  const { ctx, canvas } = state;
  const isTactical = state.gameCategory === 'tactical';
  const modes = isTactical ? [
    { id: GAME_MODES.TACTICAL_1V1 || 'Tactical 1v1', label: 'DUEL (1V1)' },
    { id: GAME_MODES.TACTICAL_FFA || 'Tactical FFA', label: 'TACTICAL FFA (4P)' },
    { id: GAME_MODES.TACTICAL_2V2 || 'Tactical 2v2', label: '2 VS 2 (TEAMS)' }
  ] : [
    { id: '1v1', label: '1V1' },
    { id: 'Stand Off', label: 'STANDOFF' },
    { id: '1v2 Stand Off', label: '1V2 SHOW' },
    { id: '2v2', label: '2V2 DUO' },
    { id: 'FFA', label: 'FFA' },
    { id: 'TLFS', label: 'TLFS' }
  ];

  const buttonWidth = isTactical ? 140 : Math.min(80, Math.max(65, (canvas.width - 40) / modes.length - 4));
  const buttonHeight = 28;
  const gap = 5;
  const totalWidth = modes.length * buttonWidth + (modes.length - 1) * gap;
  let startX = cx - totalWidth / 2;

  modes.forEach((mode) => {
    const selected = state.mode === mode.id;
    const btnY = cy - buttonHeight / 2;

    ctx.save();
    if (selected) {
      ctx.fillStyle = isTactical ? 'rgba(0, 229, 255, 0.18)' : 'rgba(245, 158, 11, 0.16)';
      ctx.strokeStyle = isTactical ? '#00e5ff' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = isTactical ? 'rgba(0, 229, 255, 0.5)' : 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
    }

    drawChamferedRect(ctx, startX, btnY, buttonWidth, buttonHeight, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mode text
    ctx.fillStyle = selected ? (isTactical ? '#00e5ff' : '#ffffff') : '#8899aa';
    ctx.font = '900 11.5px "Rajdhani", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mode.label, startX + buttonWidth / 2, cy);

    _registerButton(startX, btnY, buttonWidth, buttonHeight, () => {
      if (state.mode !== mode.id) {
        state.mode = mode.id;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash1', 0.2);
        }
        if (state.mode === 'FFA' || state.mode === '2v2' || state.mode === 'Tactical 4v4' || state.mode === GAME_MODES.TACTICAL_4V4 || state.mode === 'Tactical 2v2' || state.mode === GAME_MODES.TACTICAL_2V2 || state.mode === 'Tactical FFA' || state.mode === GAME_MODES.TACTICAL_FFA) {
          state.p3Index = state.p3Index ?? 2;
          state.p4Index = state.p4Index ?? 3;
        }
        if (state.mode === 'TLFS') {
          if (!state.tlfsAllowedEnemies || state.tlfsAllowedEnemies.length === 0) {
            state.tlfsAllowedEnemies = FIGHTER_DEFS.map((_, i) => i);
          }
        }
      }
    });

    startX += buttonWidth + gap;
  });
}

export { drawTitleScreen, drawLeaderboardScreen, _drawSmallEditor, drawModeSelection };
