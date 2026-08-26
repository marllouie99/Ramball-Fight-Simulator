// ─────────────────────────────────────────────
// GAME OVER & CHAMPION VICTORY REVEAL SCREEN
// (Seamless In-Arena Layout: Champion Left, Stats Right)
// ─────────────────────────────────────────────
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { Fighter } from '../../entities/fighter.js';
import { drawHUD, drawMissionPassedOverlay } from '../hudManager.js?v=6';
import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters, randomize1v2Fighters, goToTitle } from '../../core/gameFlow.js';
import { MODE_SETTINGS, GAME_MODES } from '../../core/modeConfig.js';
import { stopArenaBgm } from '../../systems/arenaBgmSystem.js';

// ──────────────────────────────────────────
// COLOR & MATH UTILITIES
// ──────────────────────────────────────────

function adjustBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex || '#ffffff';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ──────────────────────────────────────────
// ENGINEER-STYLE HOLOGRAPHIC HERO GLOW SYSTEM
// ──────────────────────────────────────────

function drawEngineerStyleHeroGlow(ctx, cx, cy, radius, glowColor = '#38bdf8', globalAlpha = 1.0) {
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, Math.max(0.0, globalAlpha));
  ctx.translate(cx, cy);

  // 1. Volumetric Back Silhouette Body Bloom
  const backBloom = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 2.4);
  backBloom.addColorStop(0, hexToRgba(glowColor, 0.75));
  backBloom.addColorStop(0.35, hexToRgba(glowColor, 0.45));
  backBloom.addColorStop(0.70, hexToRgba(glowColor, 0.14));
  backBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = backBloom;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.4, 0, Math.PI * 2);
  ctx.fill();

  // 2. Ground Oval Drop Shadow Base
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.45, radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.70)';
  ctx.fill();

  // 3. Translucent Radial Holographic Floor Fill
  const floorFill = ctx.createRadialGradient(0, radius * 0.95, 6, 0, radius * 0.95, radius * 1.9);
  floorFill.addColorStop(0, hexToRgba(glowColor, 0.60));
  floorFill.addColorStop(0.55, hexToRgba(glowColor, 0.22));
  floorFill.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorFill;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.9, radius * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Multi-Layered Perimeter Boundary Rings
  ctx.strokeStyle = hexToRgba(glowColor, 0.30);
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.65, radius * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(glowColor, 0.90);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.65, radius * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.65, radius * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Inner Concentric Ripple Ring
  ctx.strokeStyle = hexToRgba(glowColor, 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.10, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Tactical Holographic Cross / Diamond Tech Nodes
  const rx = radius * 1.65;
  const ry = radius * 0.55;
  const nodes = [
    { x: -rx, y: radius * 0.95 },
    { x: rx,  y: radius * 0.95 },
    { x: 0,   y: radius * 0.95 - ry },
    { x: 0,   y: radius * 0.95 + ry }
  ];

  nodes.forEach(n => {
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2.0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// ──────────────────────────────────────────
// STYLIZED CHAMPION TYPOGRAPHY & NAMEPLATES
// ──────────────────────────────────────────

function drawChampionTitle(ctx, cx, y, titleText, themeColor, maxAllowedWidth = 260) {
  if (!titleText) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = 34;
  ctx.font = `900 ${fontSize}px "Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif`;
  let measuredW = ctx.measureText(titleText).width;
  if (measuredW > maxAllowedWidth) {
    fontSize = Math.max(16, Math.floor(fontSize * (maxAllowedWidth / measuredW)));
    ctx.font = `900 ${fontSize}px "Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif`;
    measuredW = ctx.measureText(titleText).width;
  }

  // Layer 1: Wide radiant outer glow stroke
  ctx.strokeStyle = hexToRgba(themeColor, 0.55);
  ctx.lineWidth = Math.max(4, fontSize * 0.35);
  ctx.strokeText(titleText, cx, y);

  // Layer 2: Sharp bold black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(3, fontSize * 0.18);
  ctx.lineJoin = 'round';
  ctx.strokeText(titleText, cx, y);

  // Layer 3: Dynamic vertical gradient fill
  const grad = ctx.createLinearGradient(0, y - fontSize * 0.5, 0, y + fontSize * 0.5);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.40, adjustBrightness(themeColor, +30));
  grad.addColorStop(1, themeColor);
  ctx.fillStyle = grad;
  ctx.fillText(titleText, cx, y);

  // Layer 4: Bright inner highlight core
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, fontSize - 2)}px "Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif`;
  ctx.fillText(titleText, cx, y - 1);

  ctx.restore();
}

function drawChampionNameplate(ctx, cx, y, nameStr, themeColor, fontScale = 1.0, maxAllowedWidth = 260) {
  if (!nameStr) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Base font size with dynamic measurement fitting
  let baseFontSize = 24;
  let fontSize = Math.round(baseFontSize * fontScale);
  ctx.font = `900 ${fontSize}px "Permanent Marker", "Bangers", "Outfit", sans-serif`;

  const targetMaxW = maxAllowedWidth * fontScale;
  let measuredW = ctx.measureText(nameStr).width;
  if (measuredW > targetMaxW) {
    fontSize = Math.max(13, Math.floor(fontSize * (targetMaxW / measuredW)));
    ctx.font = `900 ${fontSize}px "Permanent Marker", "Bangers", "Outfit", sans-serif`;
    measuredW = ctx.measureText(nameStr).width;
  }

  // Radiant outer stroke
  ctx.strokeStyle = hexToRgba(themeColor, 0.40);
  ctx.lineWidth = Math.max(3, 6 * fontScale);
  ctx.strokeText(nameStr, cx, y);

  // Black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(2.5, 3.8 * fontScale);
  ctx.strokeText(nameStr, cx, y);

  // Gradient text fill
  const nameGrad = ctx.createLinearGradient(0, y - fontSize * 0.45, 0, y + fontSize * 0.45);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(0.5, adjustBrightness(themeColor, +25));
  nameGrad.addColorStop(1, themeColor);
  ctx.fillStyle = nameGrad;
  ctx.fillText(nameStr, cx, y);

  // Laser Underline with Tactical Diamond Pins
  const lineY = y + (fontSize * 0.65) + 3;
  const halfW = Math.min(targetMaxW / 2, Math.max(35 * fontScale, measuredW / 2 + 10 * fontScale));

  const lineGrad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
  lineGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  lineGrad.addColorStop(0.2, hexToRgba(themeColor, 0.5));
  lineGrad.addColorStop(0.5, '#ffffff');
  lineGrad.addColorStop(0.8, hexToRgba(themeColor, 0.5));
  lineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.0 * fontScale;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, lineY);
  ctx.lineTo(cx + halfW, lineY);
  ctx.stroke();

  // Diamond End Pins
  [-halfW + 6 * fontScale, halfW - 6 * fontScale].forEach(dx => {
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(cx + dx, lineY, 2.2 * fontScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + dx, lineY, 1.0 * fontScale, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawChampionStats(ctx, cx, yStart, fighter, themeColor, timer = 60, startDelay = 14, fontScale = 1.0) {
  if (!fighter) return;
  const dealt = Math.round(fighter.damageDealt || 0);
  const received = Math.round(fighter.damageReceived || 0);

  const rowW = 175 * fontScale;
  const leftX = cx - rowW / 2;
  const rightX = cx + rowW / 2;
  const rowGap = 20 * fontScale;

  ctx.save();

  // Helper for rolling numeric values with smooth ease-out interpolation
  const drawRollingRow = (label, targetNum, y, valColor, delay) => {
    // 1. Label with black outline for high contrast
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(12 * fontScale)}px "Outfit", "Rajdhani", sans-serif`;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0 * fontScale;
    ctx.strokeText(label.toUpperCase(), leftX, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(label.toUpperCase(), leftX, y);

    // 2. Rolling Number Value
    const rollProgress = Math.min(1.0, Math.max(0.0, (timer - delay) / 38));
    const ease = 1 - Math.pow(1 - rollProgress, 3); // easeOutCubic
    const currentNum = Math.round(targetNum * ease);
    const numStr = currentNum.toString();

    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.round(15 * fontScale)}px "Outfit", "Rajdhani", sans-serif`;

    // Active rolling glow stroke
    if (rollProgress > 0 && rollProgress < 1.0) {
      ctx.strokeStyle = hexToRgba(valColor || '#ffffff', 0.40);
      ctx.lineWidth = 5.0 * fontScale;
      ctx.strokeText(numStr, rightX, y);
    }

    // Crisp black outline & fill
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0 * fontScale;
    ctx.strokeText(numStr, rightX, y);

    ctx.fillStyle = valColor || '#ffffff';
    ctx.fillText(numStr, rightX, y);
  };

  // Calculate Kill Count for the champion
  const rawKills = (state.gameState === 'roundEnd')
    ? ((fighter.roundKilledDefs && fighter.roundKilledDefs.length > 0) ? fighter.roundKilledDefs : (fighter.killedDefs || []))
    : ((fighter.killedDefs && fighter.killedDefs.length > 0) ? fighter.killedDefs : (fighter.roundKilledDefs || []));

  const killCount = (rawKills && rawKills.length > 0)
    ? rawKills.length
    : (fighter.lastKilledDef ? 1 : 0);

  const mode = state.mode;
  const is1v1Mode = mode === '1v1' || mode === 'Stand Off' || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.STAND_OFF || mode === 'Tactical 1v1' || mode === GAME_MODES.TACTICAL_1V1 || mode === 'Tactical Stand Off' || mode === GAME_MODES.TACTICAL_STANDOFF || mode === 'Tactical Random' || mode === GAME_MODES.TACTICAL_RANDOM;

  // Staggered roll: Damage Dealt starts at startDelay, Damage Received starts at startDelay + 4, Kill Count at startDelay + 8
  drawRollingRow('Damage Dealt', dealt, yStart, '#ffffff', startDelay);
  drawRollingRow('Damage Received', received, yStart + rowGap, '#f87171', startDelay + 4);
  if (!is1v1Mode) {
    drawRollingRow('Kill Count', killCount, yStart + rowGap * 2, '#38bdf8', startDelay + 8);
  }

  ctx.restore();
}

/**
 * Animated Pop-Out "Follow for more :)" Text Banner in the bottom
 */
function drawFollowForMoreBanner(ctx, cx, cy, timer) {
  // Entrance pops out at frame 122 strictly AFTER the fighter's champion voiceline finishes
  const popProgress = Math.min(1.0, Math.max(0.0, (timer - 122) / 16));
  if (popProgress <= 0) return;

  // Play Announcer bell sound when text pops out (frame 122)
  if (!state._hasPlayedFollowForMoreSfx) {
    state._hasPlayedFollowForMoreSfx = true;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('Assets/Sound Effects/Announcer/bell.mp3', 1.0);
    }
  }

  const popEase = easeOutBack(popProgress);
  const textStr = 'Follow for more :)';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(popEase, popEase);

  // Clean, simple typography (slightly bigger & bolder for clarity)
  ctx.font = '700 17.5px "Outfit", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp, simple black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.2;
  ctx.strokeText(textStr, 0, 0);

  // Clean white text fill
  ctx.fillStyle = '#ffffff';
  ctx.fillText(textStr, 0, 0);

  ctx.restore();
}

// ─────────────────────────────────────────────
// SIMPLE IN-ARENA TACTICAL WINNER OVERLAY
// (Clean In-Arena Text: e.g. "M4A1 Wins!")
// ─────────────────────────────────────────────

function drawTacticalWinnerOverlay(ctx, winner, timer, mode) {
  const arena = state.arena || { x: 50, y: 150, width: 440, height: 680 };
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const arenaW = arena ? arena.width : state.canvas.width;
  const arenaH = arena ? arena.height : state.canvas.height;

  // 0. Snap Cut Arena BGM & Play Winner Announcer Audio (Frame 1)
  if (timer > 0) {
    stopArenaBgm(true);
  }
  if (!state._hasPlayedChampionYouWinVoice && timer > 0) {
    state._hasPlayedChampionYouWinVoice = true;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('Assets/Sound Effects/Announcer/street-fighter-ii-you-win.mp3', 1.0);
    }
  }

  const centerX = arenaX + arenaW / 2;
  const centerY = arenaY + arenaH * 0.48;

  // Resolve winner entity or team
  const effectiveWinner = winner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);
  
  let winText = 'Round Draw!';
  let themeColor = '#ffffff';

  if (effectiveWinner) {
    const rawName = effectiveWinner.name || effectiveWinner._def?.name || 'Operative';
    winText = `${rawName} Wins!`;
    themeColor = effectiveWinner.color || effectiveWinner.themeColor || '#ffffff';
  }

  // Smooth entrance scale & alpha
  const animProgress = Math.min(1.0, timer / 14);
  const alpha = animProgress;
  const scale = 0.90 + 0.10 * easeOutBack(animProgress);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // High-contrast pure Winner Text ("M4A1 Wins!")
  ctx.font = '900 36px "Outfit", "Segoe UI", Arial, sans-serif';

  // Thick dark stroke for high readability against map floor
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.strokeText(winText, 0, 0);

  // Vibrant theme fill
  ctx.fillStyle = themeColor;
  ctx.fillText(winText, 0, 0);

  ctx.restore();
}

// ─────────────────────────────────────────────
// SEAMLESS IN-ARENA CHAMPION LAYOUT
// (Fighter Glides Left, Stats Slide Right)
// ─────────────────────────────────────────────

function drawInArenaChampionLayout(winner, timer, titleText, mode, isMatchEnd) {
  const { ctx, arena } = state;
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const arenaW = arena ? arena.width : state.canvas.width;
  const arenaH = arena ? arena.height : state.canvas.height;

  // Tactical Mode Override: simple in-arena overlay text without champion layout
  const isTactical = state.gameCategory === 'tactical' || (typeof mode === 'string' && (mode.toLowerCase().includes('tactical')));
  if (isTactical) {
    drawTacticalWinnerOverlay(ctx, winner, timer, mode);
    return;
  }

  // 0. Snap Cut Arena BGM & Play Street Fighter II "YOU WIN!" Announcer Voice (Frame 1)
  if (timer > 0) {
    stopArenaBgm(true);
  }
  if (!state._hasPlayedChampionYouWinVoice && timer > 0) {
    state._hasPlayedChampionYouWinVoice = true;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('Assets/Sound Effects/Announcer/street-fighter-ii-you-win.mp3', 1.0);
    }
  }

  // 0b. Play Champion Victory Voiceline of the winning fighter strictly AFTER the SF2 "YOU WIN!" announcer finishes (Frame 68)
  if (!state._hasPlayedChampionVictoryVoice && timer >= 68) {
    state._hasPlayedChampionVictoryVoice = true;

    const isTodo = winner && (winner.characterId === 'todo' || winner.type === 'todo' || winner._def?.id === 'todo');
    if (isTodo) {
      const todoSnd = CONFIG.todo?.victoryVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3';
      const vol = CONFIG.todo?.victoryVoiceVolume ?? 3.5;
      audioSystem.playSFX(todoSnd, vol);
    }

    const isYuji = winner && (winner.characterId === 'yuji' || winner.type === 'yuji' || winner._def?.id === 'yuji');
    if (isYuji) {
      const yujiSnd = CONFIG.yuji?.victoryVoiceSound || 'Assets/Sound Effects/SkillEffects/yuji-voiceline-bestfriend.mp3';
      const vol = CONFIG.yuji?.victoryVoiceVolume ?? 3.5;
      audioSystem.playSFX(yujiSnd, vol);
    }

    const isSaitama = winner && (winner.characterId === 'saitama' || winner.type === 'saitama' || winner._def?.id === 'saitama');
    if (isSaitama) {
      const saitamaSnd = CONFIG.saitama?.sounds?.championVoiceline || CONFIG.saitama?.championVoiceline || 'Assets/Sound Effects/SkillEffects/saitama-champion-voiceline.mp3';
      const vol = CONFIG.saitama?.soundVolumes?.championVoiceline ?? (CONFIG.saitama?.championVoiceVolume ?? 3.5);
      audioSystem.playSFX(saitamaSnd, vol);
    }

    const isSukuna = winner && (winner.characterId === 'sukuna' || winner.type === 'sukuna' || winner._def?.id === 'sukuna');
    if (isSukuna) {
      const sukunaSnd = CONFIG.sukuna?.sounds?.championVoiceline || CONFIG.sukuna?.championVoiceline || 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3';
      const vol = CONFIG.sukuna?.soundVolumes?.championVoiceline ?? (CONFIG.sukuna?.championVoiceVolume ?? 3.5);
      audioSystem.playSFX(sukunaSnd, vol);
    }
  }

  // 1. Smoothly Darken the Arena & Full Canvas (Deep Dark Victory Backdrop)
  const fadeAlpha = Math.min(1.0, timer / 30);
  ctx.save();
  ctx.fillStyle = `rgba(3, 4, 6, ${0.90 * fadeAlpha})`;
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.restore();

  // Detect winning team members for team modes (1v2 Stand Off or 2v2)
  const is1v2 = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
  const is2v2 = (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO);
  const isTeamMode = is1v2 || is2v2;

  const winnerIndex = state.fighters ? state.fighters.indexOf(winner) : -1;
  let winningTeam = winnerIndex >= 0 ? state.getFighterTeam(winnerIndex) : null;
  if (winningTeam === null && isTeamMode) {
    winningTeam = state.teamScores[0] >= state.teamScores[1] ? 0 : 1;
  }
  let winningFighters = winner ? [winner] : [];

  if (winningTeam !== null && isTeamMode) {
    const teamMembers = state.fighters.filter((f, idx) => f && state.getFighterTeam(idx) === winningTeam);
    if (teamMembers.length > 0) {
      winningFighters = teamMembers;
    }
  }

  const isMultiWinner = winningFighters.length > 1;
  const primaryThemeColor = winner?.color || winningFighters[0]?.color || '#38bdf8';

  // 2. Left Hero Zone (Fighter Glides Smoothly into Left Side)
  const targetHeroX = arenaX + arenaW * 0.22;
  const targetHeroY = arenaY + arenaH * 0.50;
  const targetScale = isMultiWinner ? 1.05 : 1.35;

  // Store start positions snapshot at the moment of death
  if (!state._winnerStartPositions || state._winnerStartPositionsTimerReset !== isMatchEnd) {
    state._winnerStartPositions = winningFighters.map(f => ({
      x: f.x || targetHeroX,
      y: f.y || targetHeroY,
      gunAngle: f.gunAngle || 0
    }));
    state._winnerStartPositionsTimerReset = isMatchEnd;
  }

  // Smooth Glide Animation Curve (easeOutCubic)
  const glideProgress = Math.min(1.0, timer / 42);
  const glideEase = 1 - Math.pow(1 - glideProgress, 3);
  const glowProgress = Math.min(1.0, Math.max(0.0, (timer - 8) / 30));

  winningFighters.forEach((wFighter, idx) => {
    const def = wFighter._def || FIGHTER_DEFS.find(d => d.id === wFighter._def?.id || d.id === wFighter.characterId || d.type === wFighter.type || d.id === wFighter.id || d.name === wFighter.name) || wFighter;
    if (!def) return;

    const startPos = state._winnerStartPositions[idx] || { x: wFighter.x, y: wFighter.y, gunAngle: 0 };
    const heroYOffset = isMultiWinner ? (idx === 0 ? -70 : 70) : 0;
    const finalHeroY = targetHeroY + heroYOffset;

    const currX = startPos.x + (targetHeroX - startPos.x) * glideEase;
    const currY = startPos.y + (finalHeroY - startPos.y) * glideEase;
    const currScale = 1.0 + (targetScale - 1.0) * glideEase;

    const fType = def.type || def.characterId || wFighter.type || wFighter.characterId || 'default';
    const previewKey = fType + '_' + idx;
    if (!state._winnerFightersCache) state._winnerFightersCache = {};
    if (!state._winnerFightersCache[previewKey]) {
      const FighterClass = FIGHTER_CLASS_MAP[fType] || Fighter;
      state._winnerFightersCache[previewKey] = new FighterClass({
        ...def,
        startX: 0,
        startY: 0,
        startVx: 0,
        startVy: 0,
      });
    }

    const preview = state._winnerFightersCache[previewKey];
    preview.x = 0;
    preview.y = 0;
    preview.vx = 0;
    preview.vy = 0;
    preview.angle = 0;
    preview.gunAngle = 0; // Upright frontal victory stance
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
      preview.isMeleeMode = false;
      preview.orbTransition = 1;
    }

    // Sync active transformations & skins from the winning fighter entity (e.g. Ichigo Bankai/Hollow Mask)
    if (wFighter.skin) preview.skin = wFighter.skin;
    if (fType === 'ichigo' || wFighter.characterId === 'ichigo' || wFighter.type === 'ichigo') {
      preview.bankaiActive = Boolean(wFighter.bankaiActive);
      preview.hollowMaskActive = Boolean(wFighter.hollowMaskActive);
      preview.skin = wFighter.skin || (wFighter.bankaiActive ? (wFighter.hollowMaskActive ? 'bankai_mask' : 'bankai') : (wFighter.hollowMaskActive ? 'shikai_mask' : 'shikai'));
      preview.combatAuraOpacity = wFighter.combatAuraOpacity !== undefined ? wFighter.combatAuraOpacity : (wFighter.bankaiActive ? 1 : 0.5);
    }
    if (wFighter.isHeianEra !== undefined) preview.isHeianEra = wFighter.isHeianEra;
    if (wFighter.isFourArms !== undefined) preview.isFourArms = wFighter.isFourArms;
    if (wFighter.mode !== undefined) preview.mode = wFighter.mode;

    const fColor = def.color || wFighter.color || '#38bdf8';

    ctx.save();
    // Engineer Hero Glow (Blooms underneath fighter on the left)
    drawEngineerStyleHeroGlow(ctx, currX, currY, (wFighter.r || 24) * currScale, fColor, glowProgress);

    ctx.translate(currX, currY);
    ctx.scale(currScale, currScale);
    preview.draw(ctx, null);
    ctx.restore();
  });

  // 3. Right Stats Zone (Stats Slide Smoothly into Right Side)
  const targetStatsX = arenaX + arenaW * 0.72;
  const targetStatsY = arenaY + arenaH * 0.50;

  const statsProgress = Math.min(1.0, Math.max(0.0, (timer - 12) / 32));
  if (statsProgress > 0) {
    const statsEase = easeOutBack(statsProgress);
    const slideOffset = (1 - statsProgress) * 45;
    const statsX = targetStatsX + slideOffset;

    ctx.save();
    ctx.globalAlpha = statsProgress;

    if (isMultiWinner && winningFighters.length >= 2) {
      // Top Title ("CHAMPION" / "ROUND WINNER")
      drawChampionTitle(ctx, statsX, targetStatsY - 145, titleText, primaryThemeColor, arenaW * 0.44);

      // Teammate 1 (Top Hero individual block)
      const t1 = winningFighters[0];
      const t1Y = targetStatsY - 70;
      drawChampionNameplate(ctx, statsX, t1Y - 18, t1.name.toUpperCase(), t1.color || primaryThemeColor, 0.88, arenaW * 0.42);
      drawChampionStats(ctx, statsX, t1Y + 12, t1, t1.color || primaryThemeColor, timer, 12, 0.90);

      // Teammate 2 (Bottom Hero individual block)
      const t2 = winningFighters[1];
      const t2Y = targetStatsY + 70;
      drawChampionNameplate(ctx, statsX, t2Y - 18, t2.name.toUpperCase(), t2.color || primaryThemeColor, 0.88, arenaW * 0.42);
      drawChampionStats(ctx, statsX, t2Y + 12, t2, t2.color || primaryThemeColor, timer, 16, 0.90);
    } else {
      // Top Title ("CHAMPION" / "ROUND WINNER")
      drawChampionTitle(ctx, statsX, targetStatsY - 58, titleText, primaryThemeColor, arenaW * 0.44);

      // Solo Fighter Nameplate & Individual Stats
      if (winner) {
        drawChampionNameplate(ctx, statsX, targetStatsY - 14, winner.name.toUpperCase(), primaryThemeColor, 1.0, arenaW * 0.42);
        drawChampionStats(ctx, statsX, targetStatsY + 22, winner, primaryThemeColor, timer, 14, 1.0);
      }
    }

    ctx.restore();
  }

  // 4. Pop-out "Follow for more :)" banner in the bottom center of the arena
  const bannerY = arenaY + arenaH - 34;
  drawFollowForMoreBanner(ctx, arenaX + arenaW / 2, bannerY, timer, primaryThemeColor);
}

// ─────────────────────────────────────────────
// ROUND END SCREEN (INTERIM ROUNDS)
// ─────────────────────────────────────────────

function drawRoundEndScreen() {
  const { ctx, roundWinner, roundNum, roundEndTimer, mode, ffaMatchComplete, scores } = state;
  _clearButtons();
  drawHUD();

  if (roundEndTimer <= 2) {
    state._winnerStartPositions = null;
    state._hasPlayedFollowForMoreSfx = false;
    state._hasPlayedChampionYouWinVoice = false;
  }

  // If CJ's Mission Passed or Wasted overlay is active, let it play out smoothly (160 frames).
  // For Tactical Force, respond quickly (10 frames) with the simple in-arena text.
  // Otherwise wait ~75 frames (~1.25s) for faah.mp3 death audio before transitioning into the champion layout!
  const isTactical = state.gameCategory === 'tactical' || (typeof mode === 'string' && (mode.toLowerCase().includes('tactical')));
  const hasMissionOverlay = Boolean(state.missionPassedOverlay && (state.missionPassedOverlay.active || state.missionPassedOverlay.timer > 0 || state.missionPassedOverlay.isComplete)) || Boolean(state.wastedOverlay && (state.wastedOverlay.active || state.wastedOverlay.timer > 0 || state.wastedOverlay.isComplete));
  const displayDelay = isTactical ? 10 : (hasMissionOverlay ? 160 : 75);
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Check if winner has 2 victories (match win condition)
  const is1v2 = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
  const is2v2 = (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_2V2);
  const isTeamMode = is1v2 || is2v2;
  const isFFA = (mode === 'FFA' || mode === 'Tactical FFA' || mode === GAME_MODES.FFA || mode === GAME_MODES.TACTICAL_FFA);

  const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
  const winningTeam = winnerIndex >= 0 ? state.getFighterTeam(winnerIndex) : (state.teamScores[0] >= state.teamScores[1] ? 0 : 1);
  const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  const winThresholdForReveal = modeRounds === 1 ? 1 : 2;

  const hasTwoWins = isTeamMode 
    ? (winningTeam !== null && state.teamScores[winningTeam] >= winThresholdForReveal)
    : (winnerIndex >= 0 && scores[winnerIndex] >= winThresholdForReveal);

  const isChampionReveal = (isFFA && (ffaMatchComplete || modeRounds === 1)) || (hasTwoWins && roundWinner);

  const isChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = isChampionActive && !isTactical;

  if (isChampionActive) {
    const titleText = isChampionReveal 
      ? 'CHAMPION' 
      : (roundWinner ? 'ROUND WINNER' : 'ROUND DRAW');

    drawInArenaChampionLayout(roundWinner, delayedTimer, titleText, mode, isChampionReveal);
  }

  // Register full screen click
  _registerButton(0, 0, state.canvas.width, state.canvas.height, () => { startNextRound(); });
}

// ─────────────────────────────────────────────
// WINNER REVEAL HELPERS
// ─────────────────────────────────────────────

function drawWinnerReveal(winner, timer, mode) {
  const isTactical = state.gameCategory === 'tactical' || (typeof mode === 'string' && (mode.toLowerCase().includes('tactical')));
  state._isChampionLayoutActive = !isTactical;
  drawInArenaChampionLayout(winner, timer, 'CHAMPION', mode, true);
}

function drawFfaChampionReveal(winner, timer) {
  const isTactical = state.gameCategory === 'tactical' || (typeof state.mode === 'string' && (state.mode.toLowerCase().includes('tactical')));
  state._isChampionLayoutActive = !isTactical;
  drawInArenaChampionLayout(winner, timer, 'CHAMPION', 'FFA', true);
}

// ─────────────────────────────────────────────
// MATCH END SCREEN (MAIN VICTORY REVEAL)
// ─────────────────────────────────────────────

function drawMatchEndScreen() {
  const { ctx, canvas, matchWinner, fighters, mode, matchEndTimer } = state;
  _clearButtons();
  drawHUD();

  if (matchEndTimer <= 2) {
    state._winnerStartPositions = null;
    state._isChampionLayoutActive = false;
    state._hasPlayedFollowForMoreSfx = false;
    state._hasPlayedChampionYouWinVoice = false;
  }

  // If CJ's Mission Passed or Wasted overlay is active, let it play out smoothly (160 frames).
  // For Tactical Force, respond quickly (10 frames) with the simple in-arena text.
  // Otherwise wait ~75 frames (~1.25s) for faah.mp3 death audio before transitioning into the champion layout!
  const isTactical = state.gameCategory === 'tactical' || (typeof mode === 'string' && (mode.toLowerCase().includes('tactical')));
  const hasMissionOverlay = Boolean(state.missionPassedOverlay && (state.missionPassedOverlay.active || state.missionPassedOverlay.timer > 0 || state.missionPassedOverlay.isComplete)) || Boolean(state.wastedOverlay && (state.wastedOverlay.active || state.wastedOverlay.timer > 0 || state.wastedOverlay.isComplete));
  const displayDelay = isTactical ? 10 : (hasMissionOverlay ? 160 : 75);
  const delayedTimer = Math.max(0, matchEndTimer - displayDelay);

  // Determine Match Winner Entity
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);

  const isMatchChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = isMatchChampionActive && !isTactical;

  if (isMatchChampionActive) {
    const titleText = (mode === 'TLFS') 
      ? (state.matchWinner === fighters[0] ? 'GAUNTLET CONQUERED!' : 'CHAMPION FALLEN')
      : 'CHAMPION';

    drawInArenaChampionLayout(effectiveWinner, delayedTimer, titleText, mode, true);
  }

  // Register Fullscreen Restart Handler
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    if (mode === 'TLFS') {
      resetMatch();
      goToTitle();
    } else {
      const is1v2Mode = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
      if (is1v2Mode) {
        import('../../core/gameFlow.js').then(m => m.randomize1v2Fighters());
      } else if (mode === '1v1' || mode === 'Stand Off') {
        randomize1v1Fighters();
      }
      resetMatch();
    }
  });
}

const drawMatchWinnerReveal = drawWinnerReveal;

export { drawRoundEndScreen, drawWinnerReveal, drawFfaChampionReveal, drawMatchEndScreen, drawMatchWinnerReveal };
