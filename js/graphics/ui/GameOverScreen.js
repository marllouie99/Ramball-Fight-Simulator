import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { Fighter } from '../../entities/fighter.js';
import { drawHUD } from '../hudManager.js';
import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters, randomize1v2Fighters, goToTitle } from '../../core/gameFlow.js';
import { MODE_SETTINGS } from '../../core/modeConfig.js';


function drawRoundEndScreen() {
  const { ctx, canvas, arena, roundWinner, roundNum, roundEndTimer, mode, ffaMatchComplete, scores } = state;
  _clearButtons();
  drawHUD();

  if (roundEndTimer <= 2) {
    state._winnerEmbers = null;
  }

  // Delay before winning display appears (in frames, ~1 second delay)
  const displayDelay = 60;
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Smooth fade-in effect (only after delay)
  const fadeAlpha = Math.min(0.96, (delayedTimer / 60) * 0.96);
  ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

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
    const textFadeAlpha = Math.min(1.0, delayedTimer / 30);
    if (textFadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = textFadeAlpha;
      
      // Slight vertical slide-up for a silky smooth entry
      const yOffset = (1 - textFadeAlpha) * 10;
      const textY = cy - 10 + yOffset;

      // Choose font based on numerical character detection
      const hasNumber = /\d/.test(winnerText);
      ctx.font = hasNumber ? 'bold 36px "Architects Daughter", Arial' : 'bold 38px "Glast Blitch", Arial';
      ctx.textAlign = 'center';
      
      // Draw outline for premium visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(winnerText, cx, textY);
      ctx.fillText(winnerText, cx, textY);

      ctx.restore();
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





  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  if (!state._winnerRevealFighter || state._winnerRevealFighter.type !== def.type) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    state._winnerRevealFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
  }
  const preview = state._winnerRevealFighter;
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = def.type === 'yuta' ? 0 : Math.PI * 0.5; // Yuta faces forward, others point weapons down
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;
  if (def.type === 'gojo' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }
  if (def.type === 'gojo') {
    preview.isMeleeMode = false;  // Force ranged mode so the Blue Lapse orb is visible
    preview.orbTransition = 1;   // Fully show the orb (0=melee/hidden, 1=ranged/visible)
  }

  // Draw volumetric god rays behind the model
  drawGodRays(ctx, cx, cy, timer, winner);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Draw a layered alpha glow ring BEFORE the fighter body (no shadowBlur — per perf rules,
  // shadowBlur forces a CPU Gaussian blur on every fill call inside preview.draw)
  const glowColor = winner.color || '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, (winner.r || 25) + 30, 0, Math.PI * 2);
  ctx.fillStyle = glowColor.startsWith('#') ? glowColor + '30' : 'rgba(255,255,255,0.19)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, (winner.r || 25) + 14, 0, Math.PI * 2);
  ctx.fillStyle = glowColor.startsWith('#') ? glowColor + '18' : 'rgba(255,255,255,0.09)';
  ctx.fill();

  preview.draw(ctx, null);
  ctx.restore();

  const textFadeAlpha = Math.min(1.0, timer / 30);

  ctx.save();
  ctx.globalAlpha = textFadeAlpha;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText('WINNER', cx, cy - 116);
  ctx.fillStyle = '#fff';
  ctx.fillText('WINNER', cx, cy - 116);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = textFadeAlpha;
  ctx.font = '32px "Glast Blitch", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = winner.color || '#fff';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + winner.r * scale + 18);
  ctx.restore();

  const isDuelMode = mode === '1v1' || mode === 'Stand Off' || mode === '1v2 Stand Off';
  if (isDuelMode) {
    ctx.save();
    ctx.globalAlpha = textFadeAlpha;
    drawWinnerStats(ctx, cx, cy + winner.r * scale + 50, winner);
    ctx.restore();
  }
}

function drawFfaChampionReveal(winner, timer) {
  const { ctx, canvas } = state;
  const cx = state.arena.x + state.arena.width / 2;
  const cy = state.arena.y + state.arena.height / 2 - 10;
  const pulse = 1 + Math.sin(timer * 0.10) * 0.12;
  const scale = 1.4 + Math.sin(timer * 0.08) * 0.08;

  // Smooth fade-in animation over 30 frames (0.5 seconds at 60fps)
  const fadeAlpha = Math.min(1, timer / 30);



  // Draw the actual fighter model at the center, scaled up for the reveal.
  const def = winner._def || FIGHTER_DEFS.find(d => d.id === winner._def?.id);
  if (!state._winnerRevealFighter || state._winnerRevealFighter.type !== def.type) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    state._winnerRevealFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
  }
  const preview = state._winnerRevealFighter;
  preview.x = 0;
  preview.y = 0;
  preview.vx = 0;
  preview.vy = 0;
  preview.angle = 0;
  preview.gunAngle = (def.type === 'yuta' || def.type === 'toji') ? 0 : Math.PI * 0.5; // Yuta and Toji face forward, others point weapons down
  preview.shootCooldown = 0;
  preview._isWinnerReveal = true;
  if (preview.rika) {
    preview.rika.active = false;
    preview.rikaAlpha = 0;
  }
  if (def.type === 'gojo' || def.type === 'yuta') {
    preview.combatAuraOpacity = 1;
  }
  if (def.type === 'gojo') {
    preview.isMeleeMode = false;  // Force ranged mode so the Blue Lapse orb is visible
    preview.orbTransition = 1;   // Fully show the orb (0=melee/hidden, 1=ranged/visible)
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
  // No shadowBlur here — it forces CPU Gaussian blur on every fill inside preview.draw()
  // (drawGojoOrb alone has ~10 fill calls per orb), causing severe lag spikes.
  // The glow is provided by drawGojoOrb's own layered aura fills.
  preview.draw(pCtx, null);
  pCtx.restore();

  // Draw volumetric god rays behind the model
  drawGodRays(ctx, cx, cy, timer, winner);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.drawImage(state._championPreviewCanvas, -200, -200);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.font = 'bold 36px "Conformity", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText('CHAMPION', cx, cy - 116);
  ctx.fillStyle = '#fff';
  ctx.fillText('CHAMPION', cx, cy - 116);
  ctx.restore();

  ctx.font = '32px "Glast Blitch", Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);


  ctx.restore();
}

function drawMatchEndScreen() {
  const { ctx, canvas, matchWinner, scores, fighters, mode, matchEndTimer } = state;
  _clearButtons();
  drawHUD();

  if (matchEndTimer <= 2) {
    state._winnerEmbers = null;
  }

  // Delay before winning display and black background overlay starts (in frames, ~1 second delay)
  const displayDelay = 60;
  const delayedTimer = Math.max(0, matchEndTimer - displayDelay);

  // Fade in the dark background over 60 frames (only after delay)
  const bgAlpha = Math.min(0.96, (delayedTimer / 60) * 0.96);
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Delay showing the rest of the screen by 45 frames (0.75s) after the background starts fading
  const delay = displayDelay + 45;
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
      ctx.font = '48px "Conformity", Arial';
      ctx.fillText('CHAMPION!', cx, cy - 40);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(`YOU DEFEATED 5 ENEMIES`, cx, cy + 10);
    } else {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff4d4d';
      ctx.fillStyle = '#ff4d4d';
      ctx.font = '48px "Conformity", Arial';
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
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);
  if (effectiveWinner) {
    drawMatchWinnerReveal(effectiveWinner, delayedTimer, mode);
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





  // Trigger Champion Victory Voiceline when champion screen is revealed
  if (!state._hasPlayedChampionVictoryVoice && timer > 0) {
    state._hasPlayedChampionVictoryVoice = true;

    const hasTodo = winningFighters.some(f => f && (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo'));
    if (hasTodo) {
      const todoSnd = CONFIG.todo?.victoryVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3';
      const vol = CONFIG.todo?.victoryVoiceVolume ?? 3.5;
      audioSystem.playSFX(todoSnd, vol);
    }
  }

  // ── Draw volumetric god rays behind model(s) ────────────────────────────────
  winningFighters.forEach((wFighter, idx) => {
    const offsetX = offsets[idx] || 0;
    drawGodRays(ctx, cx + offsetX, cy, timer, wFighter);
  });

  // ── Draw the winner fighter model(s) ───────────────────────────────────────
  winningFighters.forEach((wFighter, idx) => {
    const offsetX = offsets[idx] || 0;
    const def = wFighter._def || FIGHTER_DEFS.find(d => d.id === wFighter._def?.id);
    if (!def) return;
    if (!state._winnerFightersCache) state._winnerFightersCache = {};
    if (!state._winnerFightersCache[def.type]) {
      const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
      state._winnerFightersCache[def.type] = new FighterClass({
        ...def,
        startX: 0,
        startY: 0,
        startVx: 0,
        startVy: 0,
      });
    }
    const preview = state._winnerFightersCache[def.type];
    preview.x = 0;
    preview.y = 0;
    preview.vx = 0;
    preview.vy = 0;
    preview.angle = 0;
    preview.gunAngle = (def.type === 'yuta' || def.type === 'toji') ? 0 : Math.PI * 0.5; // Relaxed resting pose pointing downwards, but Yuta and Toji point forward
    preview.shootCooldown = 0;
    preview._isWinnerReveal = true;
    if (preview.rika) {
      preview.rika.active = false;
      preview.rikaAlpha = 0;
    }
    if (def.type === 'gojo' || def.type === 'yuta') {
      preview.combatAuraOpacity = 1;
    }
    if (def.type === 'gojo') {
      preview.isMeleeMode = false;  // Force ranged mode so the Blue Lapse orb is visible
      preview.orbTransition = 1;   // Fully show the orb (0=melee/hidden, 1=ranged/visible)
    }

    ctx.save();
    ctx.translate(cx + offsetX, cy);
    ctx.scale(scale, scale);

    // Draw layered alpha glow ring BEFORE the fighter (no shadowBlur — causes CPU lag spike
    // because it blurs every single fill inside preview.draw, including all drawGojoOrb fills)
    const fighterGlowColor = (def.type === 'layla') ? '#00E5FF' : (wFighter.color || '#ffffff');
    ctx.beginPath();
    ctx.arc(0, 0, (wFighter.r || 20) + 32, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,0.06)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, (wFighter.r || 20) + 16, 0, Math.PI * 2);
    ctx.fillStyle = fighterGlowColor.startsWith('#') ? fighterGlowColor + '22' : 'rgba(255,255,255,0.13)';
    ctx.fill();
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
  ctx.font = '48px "Conformity", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // High-contrast stroke outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 5;
  const titleText = isMultiWinner ? 'CHAMPIONS' : 'CHAMPION';
  ctx.strokeText(titleText, cx, cy - 145);
  
  ctx.fillStyle = '#fff';
  ctx.fillText(titleText, cx, cy - 145);

  ctx.shadowBlur = 0;
  if (isMultiWinner && winningFighters.length === 2) {
    ctx.font = '32px "Glast Blitch", Arial';
    ctx.fillStyle = winningFighters[0].color || '#fff';
    ctx.fillText(winningFighters[0].name.toUpperCase(), cx - 95, cy + 115);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 24px Rajdhani, Arial';
    ctx.fillText('&', cx, cy + 114);

    ctx.font = '32px "Glast Blitch", Arial';
    ctx.fillStyle = winningFighters[1].color || '#fff';
    ctx.fillText(winningFighters[1].name.toUpperCase(), cx + 95, cy + 115);
  } else {
    ctx.font = '32px "Glast Blitch", Arial';
    ctx.fillStyle = winner.color || '#fff';
    ctx.fillText(winner.name.toUpperCase(), cx, cy + 110);
    
    const isDuelMode = mode === '1v1' || mode === 'Stand Off' || mode === '1v2 Stand Off';
    if (isDuelMode) {
      drawWinnerStats(ctx, cx, cy + 144, winner);
    }
  }

  ctx.restore();
}

function drawWinnerStats(ctx, cx, yStart, winner) {
  const winnerDealt = Math.round(winner.damageDealt || 0);
  const winnerReceived = Math.round(winner.damageReceived || 0);



  ctx.save();
  
  // Draw subtle horizontal separator
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 160, yStart);
  ctx.lineTo(cx + 160, yStart);
  ctx.stroke();

  // Draw header (Removed as requested)
  /*
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '20px "Glast Blitch", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('ROUND STATISTICS', cx, yStart + 12);
  */
  // Row helper: Left column (labels) starting at cx-110, Right column (values) ending at cx+110
  const drawStatRow = (label, val, y) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#bbb';
    ctx.font = '18px "Glast Blitch", Arial';
    ctx.fillText(label.toUpperCase(), cx - 110, y);

    ctx.font = 'bold 20px "Architects Daughter", Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(val, cx + 110, y);
  };

  // Draw rows
  drawStatRow('Damage Dealt', winnerDealt, yStart + 42);
  drawStatRow('Damage Received', winnerReceived, yStart + 66);



  ctx.restore();
}

function drawGodRays(ctx, cx, cy, timer, winner) {
  const baseColor = winner.color || '#fff';
  const arenaY = (state.arena && state.arena.y !== undefined) ? state.arena.y : 170;
  const arenaH = (state.arena && state.arena.height !== undefined) ? state.arena.height : 460;

  // The light source origin — high above the visible area, never drawn directly
  const srcY = arenaY - 600;

  // Helper: draw one shaft from the invisible source point downward
  function drawShaft(destX, destY, halfAngle, alpha, width) {
    // Calculate angles to the left and right edges of the shaft
    const dx1 = destX - cx;
    const baseAngle = Math.atan2(destY - srcY, dx1);
    const leftAngle  = baseAngle - halfAngle;
    const rightAngle = baseAngle + halfAngle;

    const length = 900; // long enough to fill the whole canvas height

    const lx = cx + Math.cos(leftAngle)  * length;
    const ly = srcY + Math.sin(leftAngle)  * length;
    const rx = cx + Math.cos(rightAngle) * length;
    const ry = srcY + Math.sin(rightAngle) * length;

    // Gradient along the shaft from source downward
    const grad = ctx.createLinearGradient(cx, srcY, cx, srcY + length * 0.75);
    grad.addColorStop(0,    'rgba(0,0,0,0)');
    grad.addColorStop(0.10, colorToRgba(baseColor, alpha * 1.0));
    grad.addColorStop(0.50, colorToRgba(baseColor, alpha * 0.35));
    grad.addColorStop(1,    'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, srcY);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Clip to arena bounds so light doesn't spill outside the dark panel
  ctx.beginPath();
  ctx.rect(0, arenaY, (state.canvas && state.canvas.width) || 540, arenaH);
  ctx.clip();

  // 3 swaying spotlights — narrow angle for tight theatrical beams
  const s1 = Math.sin(timer * 0.012) * 0.04;
  drawShaft(cx - 90 + s1 * 300, arenaY + arenaH, 0.045, 0.18, 0.045);

  const s2 = Math.cos(timer * 0.008) * 0.03;
  drawShaft(cx      + s2 * 300, arenaY + arenaH, 0.065, 0.28, 0.065);

  const s3 = Math.sin(timer * 0.01 + 1.5) * 0.04;
  drawShaft(cx + 90 + s3 * 300, arenaY + arenaH, 0.045, 0.18, 0.045);

  ctx.restore();

  // 2. Render Floating Ember Sparks rising upwards (angled diagonal lines)
  // (Removed as requested)
}

function colorToRgba(color, alpha) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`;
  if (color.startsWith('rgba')) {
    return color.replace(/[^,]+(?=\))/, alpha);
  }
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // Fallback
  return `rgba(255, 255, 255, ${alpha})`;
}

// ─────────────────────────────────────────────
// COUNTDOWN SCREEN
// ─────────────────────────────────────────────

export { drawRoundEndScreen, drawWinnerReveal, drawFfaChampionReveal, drawMatchEndScreen, drawMatchWinnerReveal };
