import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { state, getLeaderboardData } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { clearHealthHud } from '../hudManager.js?v=6';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
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

export { drawTitleScreen, drawLeaderboardScreen, _drawSmallEditor, drawModeSelection };
