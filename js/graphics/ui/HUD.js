import { drawHUD } from '../hudManager.js';
import { restartCurrentRound, goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { drawSmallFighterBadge } from './CharacterSelectScreen.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';


function drawHpPanel(fighter, x, y, alignRight, fighterIndex) {
  const ctx = state.ctx;
  const panelW = 160;
  const panelH = (state.mode === 'FFA' || state.mode === '2v2') ? 58 : 46;
  const px = alignRight ? x - panelW : x;

  drawPanel(px, y, panelW, panelH, 0.7);

  const padding = 12;
  const barW = panelW - padding * 2;
  const barH = 10;
  const barX = px + padding;
  const barY = y + 26;

  const badgeSize = fighter.lastKilledDef ? 14 : 0;
  const badgeSpacing = fighter.lastKilledDef ? 6 : 0;

  // Prepare name rendering - auto-scale font for long names
  const maxNameW = panelW - padding * 2 - 40; // Reserve space for HP text
  let nameFontSize = 14;
  ctx.font = `bold ${nameFontSize}px Arial`;
  while (ctx.measureText(fighter.name).width > maxNameW && nameFontSize > 8) {
    nameFontSize--;
    ctx.font = `bold ${nameFontSize}px Arial`;
  }
  ctx.fillStyle = fighter.color;
  ctx.textBaseline = 'alphabetic';

  const nameXBase = alignRight ? px + panelW - padding : px + padding;
  ctx.textAlign = alignRight ? 'right' : 'left';
  // Measure name width to position badge relative to the rendered name
  const nameWidth = ctx.measureText(fighter.name).width;

  if (fighter.lastKilledDef) {
    const badgeCenterX = alignRight
      ? nameXBase - nameWidth - badgeSpacing - (badgeSize / 2)
      : nameXBase + nameWidth + badgeSpacing + (badgeSize / 2);
    const badgeY = y + 18;
    drawSmallFighterBadge(ctx, fighter.lastKilledDef, badgeCenterX, badgeY, badgeSize);
  }

  // Name
  ctx.fillText(fighter.name, nameXBase, y + 18);

  // HP Text
  const displayHp = Number.isInteger(fighter.hp) ? `${fighter.hp}` : fighter.hp.toFixed(1);
  const displayMaxHp = Number.isInteger(fighter.maxHp) ? `${fighter.maxHp}` : fighter.maxHp.toFixed(1);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = alignRight ? 'left' : 'right';
  ctx.fillText(`${displayHp}/${displayMaxHp}`, alignRight ? px + padding : px + panelW - padding, y + 18);

  // Bar Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();

  // Bar Fill
  const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);
  const hue = hpRatio * 120;
  ctx.fillStyle = `hsl(${hue}, 90%, 48%)`;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
  ctx.fill();

  if (state.mode === 'FFA' && typeof fighterIndex === 'number') {
    const winCount = state.scores[fighterIndex] || 0;
    const maxWins = 2;
    const bulletSize = 8;
    const bulletGap = 8;
    const totalWidth = maxWins * bulletSize + (maxWins - 1) * bulletGap;
    const startX = alignRight ? px + panelW - padding - totalWidth : px + padding;
    const bulletY = y + panelH - 14;

    for (let i = 0; i < maxWins; i += 1) {
      const bulletX = startX + i * (bulletSize + bulletGap) + bulletSize / 2;
      const filled = i < winCount;
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, bulletSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = filled ? fighter.color : 'transparent';
      ctx.fill();
      ctx.strokeStyle = filled ? fighter.color : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawTeamHpCard(teamIndex, fighterIndexes, x, y, w, h, teamColor, teamName) {
  const ctx = state.ctx;
  drawPanel(x, y, w, h, 0.84, 14);

  // Team tint overlay
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12);
  ctx.fill();
  ctx.restore();

  // Team header stripe
  ctx.fillStyle = teamColor;
  ctx.fillRect(x + 2, y + 2, w - 4, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(teamName, x + 14, y + 14);

  const rowX = x + 12;
  const rowW = w - 24;
  const rowH = 32;
  const rowGap = 8;

  fighterIndexes.forEach((fighterIndex, i) => {
    const fighter = state.fighters[fighterIndex];
    if (!fighter) return;

    const currentY = y + 32 + 8 + i * (rowH + rowGap);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(rowX, currentY, rowW, rowH, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fighter.name, rowX + 10, currentY + 6);

    const displayHp = Number.isInteger(fighter.hp) ? `${fighter.hp}` : fighter.hp.toFixed(1);
    const displayMaxHp = Number.isInteger(fighter.maxHp) ? `${fighter.maxHp}` : fighter.maxHp.toFixed(1);
    ctx.font = '11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${displayHp}/${displayMaxHp}`, rowX + rowW - 10, currentY + 6);

    const barX = rowX + 10;
    const barY = currentY + rowH - 14;
    const barW = rowW - 20;
    const barH = 8;
    const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = `hsl(${hpRatio * 120}, 92%, 56%)`;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
    ctx.fill();
  });
}






function drawPauseScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHUD(); // Keep HUD visible in background

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  const panelW = 260;
  const panelH = 280;
  drawPanel(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', cx, cy - 80);

  const btnW = 200;
  const btnH = 36;

  drawButton('▶ Resume', cx, cy - 30, () => {
    state.gameState = state.previousGameState || 'playing';
  }, btnW, btnH);

  drawButton('↺ Restart Round', cx, cy + 20, () => {
    restartCurrentRound();
  }, btnW, btnH);

  drawButton('🏆 Leaderboard', cx, cy + 70, () => {
    state.leaderboardReturnState = 'paused';
    state.gameState = 'leaderboard';
  }, btnW, btnH);

  drawButton('⌂ Main Menu', cx, cy + 120, () => {
    goToTitle();
  }, btnW, btnH);
}


function drawCountdown() {
  drawHUD();
  const { ctx, canvas, countdownTimer, countdownDuration } = state;

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  // Calculate remaining time (in seconds)
  const remainingFrames = countdownDuration - countdownTimer;
  const remainingSeconds = Math.ceil(remainingFrames / 60);

  // Determine what to display
  let displayText = '';
  if (remainingSeconds > 1) {
    displayText = remainingSeconds.toString();
  } else if (remainingSeconds === 1) {
    displayText = '1';
  } else {
    displayText = 'GO!';
  }

  // Draw countdown number - smaller and subtle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, cx, cy);
}



export { drawHpPanel, drawTeamHpCard, drawPauseScreen, drawCountdown };
