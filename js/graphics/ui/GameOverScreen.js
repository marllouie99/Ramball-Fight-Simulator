import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { drawHUD } from '../hudManager.js';
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters, randomize1v2Fighters, goToTitle } from '../../core/gameFlow.js';
import { MODE_SETTINGS } from '../../core/modeConfig.js';


function drawRoundEndScreen() {
  const { ctx, canvas, arena, roundWinner, roundNum, roundEndTimer, mode, ffaMatchComplete, scores } = state;
  _clearButtons();
  drawHUD();

  // Delay before winning display appears (in frames, ~1 second delay)
  const displayDelay = 60;
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Smooth fade-in effect (only after delay)
  const fadeAlpha = Math.min(0.7, delayedTimer / 60);
  ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
  ctx.fillRect(arena.x, arena.y, arena.width, arena.height);

  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2;

  // Check if winner has 2 victories (match win condition)
  const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
  const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  const winThresholdForReveal = modeRounds === 1 ? 1 : 2;
  const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= winThresholdForReveal;
  const showModel = hasTwoWins && roundWinner;

  // Determine winner text
  let winnerText;
  if (mode === '2v2') {
    const winningTeam = state.teamScores[0] > state.teamScores[1] ? 0 : 1;
    winnerText = `TEAM ${winningTeam + 1} WINS ROUND ${roundNum}!`;
    ctx.fillStyle = winningTeam === 0 ? '#ff4d4d' : '#4da3ff';
  } else {
    if (roundWinner) {
      winnerText = `${roundWinner.name.toUpperCase()} WINS ROUND ${roundNum}!`;
      ctx.fillStyle = roundWinner.color;
    } else {
      winnerText = `ROUND ${roundNum} IS A DRAW!`;
      ctx.fillStyle = '#ffffff';
    }
  }
  const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || showModel;

  if (!isChampionReveal) {
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(winnerText, cx, cy - 10);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(``, cx, cy + 25);
    }
  }

  // Champion reveal animation in final FFA round
  if (mode === 'FFA' && ffaMatchComplete && roundWinner) {
    drawFfaChampionReveal(roundWinner, delayedTimer);
  }

  // Show winner model at 2 victories for 1v1 and 2v2 modes
  if (showModel && mode !== 'FFA') {
    drawWinnerReveal(roundWinner, delayedTimer, mode);
  }

  // Register full screen click
  _registerButton(0, 0, canvas.width, canvas.height, () => { startNextRound(); });
}

function drawWinnerReveal(winner, timer, mode) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;
  const scale = 1.4 + Math.sin(timer * 0.08) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);

  // Draw pulsing rings
  for (let i = 0; i < 4; i += 1) {
    const radius = 74 + i * 18 + Math.sin(timer * 0.12 + i * 0.7) * 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.03})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const preview = new FighterClass({
    ...def,
    startX: 0,
    startY: 0,
    startVx: 0,
    startVy: 0,
  });
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = def.type === 'yuta' ? 0 : Math.PI * 0.5; // Yuta faces forward, others point weapons down
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;
  if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.shadowBlur = 24;
  ctx.shadowColor = winner.color;
  preview.draw(ctx, null);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('WINNER', cx, cy - 116);

  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + winner.r * scale + 18);
}

function drawFfaChampionReveal(winner, timer) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;
  const pulse = 1 + Math.sin(timer * 0.10) * 0.12;
  const scale = 1.4 + Math.sin(timer * 0.08) * 0.08;

  // Smooth fade-in animation over 30 frames (0.5 seconds at 60fps)
  const fadeAlpha = Math.min(1, timer / 30);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cx, cy);

  for (let i = 0; i < 4; i += 1) {
    const radius = 74 + i * 18 + Math.sin(timer * 0.12 + i * 0.7) * 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.03})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const preview = new FighterClass({
    ...def,
    startX: 0,
    startY: 0,
    startVx: 0,
    startVy: 0,
  });
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = def.type === 'yuta' ? 0 : Math.PI * 0.5; // Yuta faces forward, others point weapons down
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;
  if (preview.rika) {
    preview.rika.active = false;
    preview.rikaAlpha = 0;
  }
  if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }

  // Use an offscreen canvas to guarantee perfect fade-in composition
  // This prevents complex weapon rendering logic from overriding globalAlpha
  if (!state._championPreviewCanvas) {
    state._championPreviewCanvas = document.createElement('canvas');
    state._championPreviewCanvas.width = 400;
    state._championPreviewCanvas.height = 400;
    state._championPreviewCtx = state._championPreviewCanvas.getContext('2d');
  }
  
  const pCtx = state._championPreviewCtx;
  pCtx.clearRect(0, 0, 400, 400);
  
  pCtx.save();
  pCtx.translate(200, 200);
  pCtx.shadowBlur = 24;
  pCtx.shadowColor = (def.type === 'layla') ? '#00E5FF' : (winner.color || '#fff');
  preview.draw(pCtx, null);
  pCtx.restore();

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.drawImage(state._championPreviewCanvas, -200, -200);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CHAMPION', cx, cy - 116);

  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);

  if (def && def.desc) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'italic 14px Arial';
    wrapText(ctx, def.desc, cx, cy + 144, 480, 18);
  }
  ctx.restore();
}

function drawMatchEndScreen() {
  const { ctx, canvas, matchWinner, scores, fighters, mode } = state;
  _clearButtons();
  drawHUD();

  // Fade in the dark background over 60 frames
  const bgAlpha = Math.min(0.85, (state.matchEndTimer / 60) * 0.85);
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Delay showing the rest of the screen by 45 frames (0.75s)
  const delay = 45;
  if (state.matchEndTimer < delay) return;

  const revealTimer = state.matchEndTimer - delay;
  const globalAlpha = Math.min(1, revealTimer / 30);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;



  // TLFS mode Champion Screen
  if (mode === 'TLFS') {
    const wonGauntlet = state.matchWinner === fighters[0];
    
    ctx.save();
    ctx.textAlign = 'center';
    
    if (wonGauntlet) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 48px Arial';
      ctx.fillText('CHAMPION!', cx, cy - 40);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(`YOU DEFEATED 5 ENEMIES`, cx, cy + 10);
    } else {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff4d4d';
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 48px Arial';
      ctx.fillText('CHAMPION FALLEN', cx, cy - 40);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(`YOU DEFEATED ${state.tlfsDefeatedEnemies} ENEMIES`, cx, cy + 10);
    }
    
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(`CLICK ANYWHERE TO RESTART`, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      resetMatch();
      goToTitle(); // Optional: send them back to select screen after TLFS
    });
    
    ctx.restore();
    return;
  }

  // Special champion reveal animation for match winner (1v1, 1v2 Stand Off, 2v2 & FFA)
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters[0] : null);
  if (effectiveWinner) {
    drawMatchWinnerReveal(effectiveWinner, state.matchEndTimer, mode);
  }

  if (mode === '1v1' || mode === 'Stand Off' || mode === '1v2 Stand Off' || mode === '2v2' || mode === 'FFA') {
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText(`CLICK ANYWHERE TO RESTART`, cx, canvas.height - 30);
    }

    _registerButton(0, 0, canvas.width, canvas.height, () => {
      if (mode === '1v2 Stand Off') {
        import('../core/gameFlow.js').then(m => m.randomize1v2Fighters());
      } else if (mode === '1v1' || mode === 'Stand Off') {
        randomize1v1Fighters();
      }
      resetMatch();
    });
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// MATCH WINNER CHAMPION REVEAL ANIMATION
// ─────────────────────────────────────────────

function drawMatchWinnerReveal(winner, timer, mode) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;

  // Detect winning team members for team modes (1v2 Stand Off or 2v2)
  const winnerIndex = state.fighters ? state.fighters.indexOf(winner) : -1;
  const winningTeam = winnerIndex >= 0 ? state.getFighterTeam(winnerIndex) : (state.teamScores[0] >= state.teamScores[1] ? 0 : 1);
  let winningFighters = winner ? [winner] : [];

  if (winningTeam !== null && (mode === '2v2' || mode === '1v2 Stand Off')) {
    const teamMembers = state.fighters.filter((f, idx) => f && state.getFighterTeam(idx) === winningTeam);
    if (teamMembers.length > 0) {
      winningFighters = teamMembers;
    }
  }

  // Scale animation
  const isMultiWinner = winningFighters.length > 1;
  const scale = isMultiWinner ? 1.1 : 1.5;
  const offsets = isMultiWinner ? [-95, 95] : [0];

  // ── Expanding & pulsing rings ──────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    const radius = (isMultiWinner ? 130 : 80) + i * 24;
    const alpha = 0.22 - i * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // ── Particle burst effect ───────────────────────────────────────────────
  const particleCount = isMultiWinner ? 36 : 24;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const dist = (isMultiWinner ? 135 : 90) + i * 4;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = 2;
    const alpha = Math.max(0, 0.7 - (dist - 90) / 200);

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,220,80,${alpha})`;
    ctx.fill();
  }

  // ── Secondary sparkle particles ─────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist = isMultiWinner ? 100 : 60;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const alpha = 0.5;

    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // ── Draw the winner fighter model(s) ───────────────────────────────────────
  winningFighters.forEach((wFighter, idx) => {
    const offsetX = offsets[idx] || 0;
    const def = wFighter._def || FIGHTER_DEFS.find(d => d.id === wFighter._def?.id);
    if (!def) return;
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    const preview = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
    preview.x = 0;
    preview.y = 0;
    preview.vx = 0;
    preview.vy = 0;
    preview.angle = 0;
    preview.gunAngle = def.type === 'yuta' ? 0 : Math.PI * 0.5; // Relaxed resting pose pointing downwards, but Yuta points forward to align his bag
    preview.shootCooldown = 0;
    preview._isWinnerReveal = true;
    if (preview.rika) {
      preview.rika.active = false;
      preview.rikaAlpha = 0;
    }
    if (def.type === 'gojo' || def.type === 'sukuna' || def.type === 'yuta') {
      preview.combatAuraOpacity = 1;
    }

    ctx.save();
    ctx.translate(cx + offsetX, cy);
    ctx.scale(scale, scale);

    // Glow effect
    ctx.shadowBlur = 40;
    ctx.shadowColor = (def.type === 'layla') ? '#00E5FF' : (wFighter.color || '#fff');

    // Extra white glow ring behind the model
    ctx.beginPath();
    ctx.arc(0, 0, (wFighter.r || 20) + 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,0.08)`;
    ctx.fill();

    preview.draw(ctx, null);
    ctx.restore();
  });

  // ── "CHAMPION" title text ───────────────────────────────────────────────
  const titleAlpha = Math.min(1, timer / 30);
  ctx.save();
  ctx.globalAlpha = titleAlpha;

  // Text glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = winner.color || '#fff';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(isMultiWinner ? 'CHAMPIONS' : 'CHAMPION', cx, cy - 145);

  ctx.shadowBlur = 0;
  if (isMultiWinner && winningFighters.length === 2) {
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = winningFighters[0].color || '#fff';
    ctx.fillText(winningFighters[0].name.toUpperCase(), cx - 95, cy + 115);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('&', cx, cy + 114);

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = winningFighters[1].color || '#fff';
    ctx.fillText(winningFighters[1].name.toUpperCase(), cx + 95, cy + 115);
  } else {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = winner.color || '#fff';
    ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);
    
    const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner.characterId || d.id === winner.type);
    if (def && def.desc) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'italic 14px Arial';
      ctx.textBaseline = 'top';
      wrapText(ctx, def.desc, cx, cy + 122, 480, 18);
    }
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// COUNTDOWN SCREEN
// ─────────────────────────────────────────────

export { drawRoundEndScreen, drawWinnerReveal, drawFfaChampionReveal, drawMatchEndScreen, drawMatchWinnerReveal };
