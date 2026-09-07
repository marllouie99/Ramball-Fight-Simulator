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

  // Retro Crimson Pixel Backdrop
  ctx.fillStyle = '#8b1524';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pixel Dither Grid
  ctx.fillStyle = '#6d0e19';
  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      ctx.fillRect(x, y, 1.5, 1.5);
      ctx.fillRect(x + 2, y + 2, 1.5, 1.5);
    }
  }

  updatePreviewBalls();

  // Retro Window Box
  const winX = 16;
  const winY = 32;
  const winW = canvas.width - 32;
  const winH = canvas.height - 54;

  drawPanel(winX, winY, winW, winH, 0.98, 4, '#2d080c');

  // Pinstripe Header
  const titleBarH = 26;
  ctx.save();
  ctx.beginPath();
  ctx.rect(winX + 2, winY + 2, winW - 4, titleBarH);
  ctx.clip();
  ctx.fillStyle = '#f5eedc';
  ctx.fillRect(winX + 2, winY + 2, winW - 4, titleBarH);

  for (let ly = winY + 3; ly < winY + titleBarH; ly += 3) {
    ctx.fillStyle = '#d8ceb9';
    ctx.fillRect(winX + 2, ly, winW - 4, 1);
  }

  // Close box [■] (Click to return)
  const closeBoxSize = 14;
  const closeBoxX = winX + 8;
  const closeBoxY = winY + 6;
  ctx.fillStyle = '#fbf6ec';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(closeBoxX, closeBoxY, closeBoxSize, closeBoxSize);
  ctx.strokeRect(closeBoxX, closeBoxY, closeBoxSize, closeBoxSize);
  ctx.fillStyle = '#2d080c';
  ctx.fillRect(closeBoxX + 4, closeBoxY + 4, 6, 6);
  _registerButton(closeBoxX, closeBoxY, closeBoxSize, closeBoxSize, () => {
    const returnState = state.leaderboardReturnState || 'title';
    state.leaderboardReturnState = null;
    clearHealthHud();
    state.gameState = returnState;
  });

  // Title Badge
  const badgeW = 160;
  const badgeH = 18;
  const badgeX = canvas.width / 2 - badgeW / 2;
  const badgeY = winY + 4;
  ctx.fillStyle = '#f5eedc';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

  ctx.fillStyle = '#2d080c';
  ctx.font = '900 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEADERBOARDS', canvas.width / 2, badgeY + badgeH / 2);
  ctx.restore();

  // Bottom Line of Titlebar
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(winX, winY + titleBarH + 2);
  ctx.lineTo(winX + winW, winY + titleBarH + 2);
  ctx.stroke();

  // Subtitle
  ctx.fillStyle = '#63222a';
  ctx.font = 'bold 10px "Rajdhani", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('* COMBAT STATISTICS & WIN RATES *', canvas.width / 2, winY + 46);

  // Edit Mode Toggle
  drawButton('✏️ EDIT: ' + (isLeaderboardEditMode ? 'ON' : 'OFF'), winX + winW - 75, winY + 46, () => {
    if (isLeaderboardEditMode) {
      if (confirm('Save your edited leaderboard records?')) {
        import('../core/state.js').then(m => m.saveLeaderboard());
      } else {
        import('../core/state.js').then(m => m.loadLeaderboard());
      }
    }
    isLeaderboardEditMode = !isLeaderboardEditMode;
  }, 100, 22, null, 3);

  // Sort buttons (Chunky 3D tabs)
  const sortY = winY + 76;
  const sortOptions = [
    { id: 'wins', label: 'WINS' },
    { id: 'losses', label: 'LOSSES' },
    { id: 'winRate', label: 'WIN RATE' },
  ];

  const btnWidth = 90;
  const btnHeight = 24;
  const gap = 6;
  const totalWidth = sortOptions.length * btnWidth + (sortOptions.length - 1) * gap;
  let startX = canvas.width / 2 - totalWidth / 2;

  sortOptions.forEach((opt) => {
    const selected = leaderboardSortBy === opt.id;
    ctx.save();
    if (selected) {
      ctx.fillStyle = '#9e1a2b';
      ctx.strokeStyle = '#2d080c';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = '#e8dec8';
      ctx.strokeStyle = '#2d080c';
      ctx.lineWidth = 1.5;
    }
    drawChamferedRect(ctx, startX, sortY - btnHeight / 2, btnWidth, btnHeight, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = selected ? '#ffffff' : '#2d080c';
    ctx.font = '900 10.5px "Outfit", sans-serif';
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
  const tableX = winX + 12;
  const tableY = winY + 98;
  const tableW = winW - 24;
  const rowH = 40;
  const colWidths = [tableW * 0.08, tableW * 0.34, tableW * 0.14, tableW * 0.14, tableW * 0.14, tableW * 0.16];
  const colX = [tableX];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  // Header background (Sunken Cream Panel)
  ctx.fillStyle = '#ede3d0';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, tableX, tableY, tableW, rowH, 3);
  ctx.fill();
  ctx.stroke();

  // Header text
  const headers = ['#', 'FIGHTER', 'WINS', 'LOSSES', 'GAMES', 'WIN%'];
  ctx.font = '900 10.5px "Outfit", monospace, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2d080c';

  headers.forEach((header, i) => {
    const align = i === 1 ? 'left' : 'center';
    ctx.textAlign = align;
    const xPos = i === 1 ? colX[i] + 8 : colX[i] + colWidths[i] / 2;
    ctx.fillText(header, xPos, tableY + rowH / 2);
  });

  // Table rows
  const maxRows = 12;
  const displayData = leaderboardData.slice(0, maxRows);

  if (displayData.length === 0) {
    ctx.fillStyle = '#63222a';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No matches played yet', canvas.width / 2, tableY + rowH + 60);
    ctx.font = '10.5px "Rajdhani", sans-serif';
    ctx.fillText('Play 1v1 battles to record combat telemetry!', canvas.width / 2, tableY + rowH + 80);
  } else {
    displayData.forEach((entry, idx) => {
      const rowY = tableY + rowH + idx * (rowH + 2);
      const def = FIGHTER_DEFS[entry.fighterIndex];

      // Row background
      ctx.fillStyle = idx % 2 === 0 ? '#fbf6ec' : '#f5eedc';
      ctx.strokeStyle = '#baa88c';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, tableX, rowY, tableW, rowH, 3);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.fillStyle = idx === 0 ? '#9e1a2b' : idx === 1 ? '#4a121a' : idx === 2 ? '#7c2d37' : '#63222a';
      ctx.font = '900 11.5px "Outfit", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(idx + 1, colX[0] + colWidths[0] / 2, rowY + rowH / 2);

      // Fighter name with dark text
      ctx.fillStyle = '#2d080c';
      ctx.font = '900 11.5px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((def ? def.name : `Fighter ${entry.fighterIndex}`).toUpperCase(), colX[1] + 8, rowY + rowH / 2);

      // Stats
      ctx.fillStyle = '#4a121a';
      ctx.font = 'bold 11px "Rajdhani", monospace, sans-serif';
      ctx.textAlign = 'center';

      if (isLeaderboardEditMode) {
        _drawSmallEditor(ctx, entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2, entry.fighterIndex, 'wins');
        _drawSmallEditor(ctx, entry.losses, colX[3] + colWidths[3] / 2, rowY + rowH / 2, entry.fighterIndex, 'losses');
      } else {
        ctx.fillText(entry.wins, colX[2] + colWidths[2] / 2, rowY + rowH / 2);
        ctx.fillText(entry.losses, colX[3] + colWidths[3] / 2, rowY + rowH / 2);
      }
      ctx.fillText(entry.totalGames, colX[4] + colWidths[4] / 2, rowY + rowH / 2);

      // Win rate
      const winRateColor = entry.winRate >= 70 ? '#9e1a2b' : entry.winRate >= 50 ? '#2d080c' : '#63222a';
      ctx.fillStyle = winRateColor;
      ctx.font = '900 11px "Outfit", monospace, sans-serif';
      ctx.fillText(`${entry.winRate.toFixed(1)}%`, colX[5] + colWidths[5] / 2, rowY + rowH / 2);
    });
  }

  // Back button (Chunky 3D Pink button)
  const footerY = winY + winH - 32;
  drawButton('◀ BACK TO TITLE', canvas.width / 2, footerY, () => {
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
  }, 160, 32, null, 4);

  // Clear stats button
  ctx.fillStyle = '#702028';
  ctx.font = 'bold 9.5px "Rajdhani", monospace, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Right-click to reset records', winX + 16, footerY + 2);
  _registerButton(winX + 16, footerY - 12, 140, 24, () => { });

  state.canvas.oncontextmenu = (e) => {
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (mx >= winX + 16 && mx <= winX + 180 && my >= footerY - 30 && my <= footerY + 20) {
      if (confirm('Clear all leaderboard stats?')) {
        state.leaderboard = {};
        import('../core/state.js').then(m => m.saveLeaderboard());
      }
    }
  };
}

function _drawSmallEditor(ctx, val, x, y, fighterIndex, statName) {
  ctx.fillStyle = '#2d080c';
  ctx.fillText(val, x, y);

  const btnSize = 14;
  const mx = x - 18;
  const my = y - btnSize / 2;
  ctx.fillStyle = '#f0b6ba';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1;
  ctx.fillRect(mx, my, btnSize, btnSize);
  ctx.strokeRect(mx, my, btnSize, btnSize);
  ctx.fillStyle = '#2d080c'; ctx.fillText('-', mx + btnSize / 2, y);
  _registerButton(mx, my, btnSize, btnSize, () => {
    import('../core/state.js').then(m => {
      m.initLeaderboardEntry(fighterIndex);
      state.leaderboard[fighterIndex][statName] = Math.max(0, state.leaderboard[fighterIndex][statName] - 1);
    });
  });

  const px = x + 18 - btnSize;
  const py = y - btnSize / 2;
  ctx.fillStyle = '#f0b6ba';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1;
  ctx.fillRect(px, py, btnSize, btnSize);
  ctx.strokeRect(px, py, btnSize, btnSize);
  ctx.fillStyle = '#2d080c'; ctx.fillText('+', px + btnSize / 2, y);
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

  const buttonWidth = isTactical ? 120 : Math.min(76, Math.max(60, (canvas.width - 40) / modes.length - 4));
  const buttonHeight = 24;
  const gap = 4;
  const totalWidth = modes.length * buttonWidth + (modes.length - 1) * gap;
  let startX = cx - totalWidth / 2;

  modes.forEach((mode) => {
    const selected = state.mode === mode.id;
    const btnY = cy - buttonHeight / 2;

    ctx.save();
    if (selected) {
      ctx.fillStyle = '#9e1a2b';
      ctx.strokeStyle = '#2d080c';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = '#e8dec8';
      ctx.strokeStyle = '#2d080c';
      ctx.lineWidth = 1.2;
    }

    drawChamferedRect(ctx, startX, btnY, buttonWidth, buttonHeight, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mode text
    ctx.fillStyle = selected ? '#ffffff' : '#2d080c';
    ctx.font = '900 10px "Outfit", sans-serif';
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
