// ─────────────────────────────────────────────
// GAME OVER & CHAMPION VICTORY REVEAL SCREEN
// (Seamless In-Arena Layout: Champion Left, Stats Right)
// ─────────────────────────────────────────────
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { Fighter } from '../../entities/fighter.js';
import { drawHUD, drawMissionPassedOverlay } from '../hudManager.js';
import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { startNextRound, restartCurrentRound, resetMatch, randomize1v1Fighters, randomize1v2Fighters, goToTitle } from '../../core/gameFlow.js';
import { stopArenaBgm } from '../../systems/arenaBgmSystem.js';
import { getAnnouncerSound } from '../../soundEffects/announcerSounds.js';
import { GAME_MODES, MODE_SETTINGS } from '../../core/modeConfig.js';

// ──────────────────────────────────────────
// COLOR & MATH UTILITIES
// ──────────────────────────────────────────

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

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

  const isDark = (state.arenaTheme === 'dark');
  const fontFamily = isDark ? '"Silkscreen", "Press Start 2P", monospace' : '"Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif';

  let fontSize = isDark ? 28 : 34;
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  let measuredW = ctx.measureText(titleText).width;
  if (measuredW > maxAllowedWidth) {
    fontSize = Math.max(16, Math.floor(fontSize * (maxAllowedWidth / measuredW)));
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
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
  ctx.font = `900 ${Math.max(12, fontSize - 2)}px ${fontFamily}`;
  ctx.fillText(titleText, cx, y - 1);

  ctx.restore();
}

function drawChampionNameplate(ctx, cx, y, nameStr, themeColor, fontScale = 1.0, maxAllowedWidth = 260) {
  if (!nameStr) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const isDark = (state.arenaTheme === 'dark');
  const fontFamily = isDark ? '"Silkscreen", "Press Start 2P", monospace' : '"Permanent Marker", "Bangers", "Outfit", sans-serif';

  // Base font size with dynamic measurement fitting
  let baseFontSize = isDark ? 18 : 24;
  let fontSize = Math.round(baseFontSize * fontScale);
  ctx.font = `900 ${fontSize}px ${fontFamily}`;

  const targetMaxW = maxAllowedWidth * fontScale;
  let measuredW = ctx.measureText(nameStr).width;
  if (measuredW > targetMaxW) {
    fontSize = Math.max(13, Math.floor(fontSize * (targetMaxW / measuredW)));
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
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
    const isDarkStat = (state.arenaTheme === 'dark');
    const statFontFamily = isDarkStat ? '"Silkscreen", "Press Start 2P", monospace' : '"Outfit", "Rajdhani", sans-serif';
    ctx.font = `900 ${Math.round((isDarkStat ? 10 : 12) * fontScale)}px ${statFontFamily}`;
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
    ctx.font = `900 ${Math.round((isDarkStat ? 12 : 15) * fontScale)}px ${statFontFamily}`;

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
    const bell = getAnnouncerSound('bell');
    if (bell && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(bell.src, bell.volume, bell.speed, bell.offset || 0);
    }
  }

  const popEase = easeOutBack(popProgress);
  const textStr = 'Follow for more :)';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(popEase, popEase);

  // Clean, simple typography (slightly bigger & bolder for clarity)
  const isDarkFollow = (state.arenaTheme === 'dark');
  ctx.font = isDarkFollow ? '700 13px "Silkscreen", "Press Start 2P", monospace' : '700 17.5px "Outfit", "Segoe UI", sans-serif';
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
// (Clean In-Arena Text: e.g. "M4A1 WINS!")
// ─────────────────────────────────────────────

function drawTacticalWinnerOverlay(ctx, winner, timer, mode, isMatchEnd) {
  const arena = state.arena || { x: 50, y: 150, width: 440, height: 680 };
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const arenaW = arena ? arena.width : state.canvas.width;
  const arenaH = arena ? arena.height : state.canvas.height;

  // Resolve winner entity or team
  const effectiveWinner = winner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);
  const winnerIndex = effectiveWinner ? (state.fighters ? state.fighters.indexOf(effectiveWinner) : -1) : -1;
  const is1v2 = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
  const is2v2 = (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_2V2);
  const isTagMatch = (mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH');
  const isTeamMode = is1v2 || is2v2 || isTagMatch;

  let winCount = 0;
  if (isTeamMode) {
    const winningTeam = (winnerIndex >= 0 && typeof state.getFighterTeam === 'function')
      ? state.getFighterTeam(winnerIndex)
      : (state.winningTeam !== undefined ? state.winningTeam : (state.teamScores && state.teamScores[0] >= state.teamScores[1] ? 0 : 1));
    winCount = (winningTeam !== null && state.teamScores) ? (state.teamScores[winningTeam] || 0) : 0;
  } else if (winnerIndex >= 0 && state.scores) {
    winCount = state.scores[winnerIndex] || 0;
  }

  const modeRounds = MODE_SETTINGS[mode]?.rounds || (mode === '1v1' ? 3 : 1);
  const winThreshold = modeRounds === 1 ? 1 : (mode === '1v1' ? 2 : Math.ceil(modeRounds / 2));
  const isFinalMatchWin = Boolean(isMatchEnd || (winCount >= winThreshold) || state.gameState === 'matchEnd' || state.matchWinner);

  // 0. Snap Cut Arena BGM & Play Winner Announcer Audio (Frame 1)
  if (timer > 0) {
    stopArenaBgm(true);
  }
  if (!state._hasPlayedChampionYouWinVoice && timer > 0) {
    state._hasPlayedChampionYouWinVoice = true;
    if (isFinalMatchWin && effectiveWinner) {
      const youwin = getAnnouncerSound('youwin');
      if (youwin && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(youwin.src, youwin.volume, youwin.speed, youwin.offset || 0);
      }
    }
  }

  const centerX = arenaX + arenaW / 2;
  const centerY = arenaY + arenaH * 0.46;

  let winText = 'ROUND DRAW!';
  let themeColor = '#ffffff';

  if (isTagMatch && state.winningTeam !== undefined) {
    winText = state.winningTeam === 0 ? 'TEAM RED WINS!' : 'TEAM BLUE WINS!';
    themeColor = state.winningTeam === 0 ? '#ff4d4d' : '#4da3ff';
  } else if (effectiveWinner) {
    const rawName = (effectiveWinner.name || effectiveWinner._def?.name || 'OPERATIVE').toUpperCase();
    winText = `${rawName} WINS!`;
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

  const retroFontFamily = '"Silkscreen", "Press Start 2P", monospace, sans-serif';
  const maxAllowedWidth = Math.min(arenaW * 0.88, 440);
  let baseFontSize = 26;

  ctx.font = `700 ${baseFontSize}px ${retroFontFamily}`;
  let textWidth = ctx.measureText(winText).width;
  if (textWidth > maxAllowedWidth) {
    baseFontSize = Math.max(15, Math.floor(baseFontSize * (maxAllowedWidth / textWidth)));
    ctx.font = `700 ${baseFontSize}px ${retroFontFamily}`;
  }

  // Thick dark stroke for high readability against map floor
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'round';
  ctx.strokeText(winText, 0, 0);

  // Vibrant theme fill
  ctx.fillStyle = themeColor;
  ctx.fillText(winText, 0, 0);

  ctx.restore();
}

// ─────────────────────────────────────────────
// SIMPLE IN-ARENA WINNER OVERLAY
// (Clean In-Arena Text: e.g. "GOJO WINS!" / "ROUND 1" in 1v1 mode, "FIGHTER WINS!" only in other modes)
// ─────────────────────────────────────────────

function draw1v1WinnerOverlay(ctx, winner, timer, mode, isMatchEnd) {
  const arena = state.arena || { x: 50, y: 150, width: 440, height: 680 };
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const arenaW = arena ? arena.width : state.canvas.width;
  const arenaH = arena ? arena.height : state.canvas.height;

  const centerX = arenaX + arenaW / 2;
  const centerY = arenaY + arenaH * 0.46;

  const isDraw = !winner || Boolean(state.isRoundDraw || state.isDraw);
  const effectiveWinner = winner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);

  const is1v1 = (mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE || !mode);
  const showSubText = is1v1;

  const roundNum = state.roundNum || 1;

  let mainText = 'ROUND DRAW!';
  let subText = isMatchEnd ? 'FINAL ROUND' : (roundNum === 2 ? 'ROUND 2' : (roundNum >= 3 ? 'FINAL ROUND' : 'ROUND 1'));
  let themeColor = '#FFD700';

  if (!isDraw && effectiveWinner) {
    const rawName = (effectiveWinner.name || effectiveWinner._def?.name || effectiveWinner.characterId || 'FIGHTER').toUpperCase();
    mainText = `${rawName} WINS!`;
    themeColor = effectiveWinner.color || effectiveWinner.themeColor || '#00E5FF';
  }

  // Smooth entrance scale & alpha
  const animProgress = Math.min(1.0, timer / 14);
  const alpha = animProgress;
  const scale = 0.90 + 0.10 * easeOutBack(animProgress);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const isDark = (state.arenaTheme === 'dark');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dynamic font sizing
  const maxAllowedWidth = Math.min(arenaW * 0.88, 440);
  let baseFontSize = 26;
  const retroFontFamily = '"Silkscreen", "Press Start 2P", monospace, sans-serif';

  ctx.font = `700 ${baseFontSize}px ${retroFontFamily}`;
  let textWidth = ctx.measureText(mainText).width;
  if (textWidth > maxAllowedWidth) {
    baseFontSize = Math.max(15, Math.floor(baseFontSize * (maxAllowedWidth / textWidth)));
    ctx.font = `700 ${baseFontSize}px ${retroFontFamily}`;
  }

  const mainY = showSubText ? -12 : 0;
  const subY = 22;

  // Main winner text - Heavy black outline for maximum contrast
  ctx.font = `700 ${baseFontSize}px ${retroFontFamily}`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(mainText, 0, mainY);

  // Vibrant fill
  ctx.fillStyle = themeColor;
  ctx.fillText(mainText, 0, mainY);

  // Subtitle / Round tag text - only in 1v1 multi-round mode
  if (showSubText) {
    const subFontSize = 13;
    ctx.font = `700 ${subFontSize}px ${retroFontFamily}`;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(subText, 0, subY);

    const isFinal = isMatchEnd || roundNum >= 3;
    const subColor = isFinal ? '#FF4D4D' : (isDark ? '#E2E8F0' : '#FFFFFF');
    ctx.fillStyle = subColor;
    ctx.fillText(subText, 0, subY);
  }

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
    drawTacticalWinnerOverlay(ctx, winner, timer, mode, isMatchEnd);
    return;
  }

  // 0. Snap Cut Arena BGM & Play Winner / Draw Announcer Audio (Frame 1)
  if (timer > 0) {
    stopArenaBgm(true);
  }
  const isDraw = !winner || Boolean(state.isRoundDraw || state.isDraw);
  const winnerIndex = winner ? (state.fighters ? state.fighters.indexOf(winner) : -1) : -1;
  const is1v2 = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
  const is2v2 = (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_2V2);
  const isTagMatch = (mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH');
  const isTeamMode = is1v2 || is2v2 || isTagMatch;

  let winCount = 0;
  if (isTeamMode) {
    const winningTeam = (winnerIndex >= 0 && typeof state.getFighterTeam === 'function')
      ? state.getFighterTeam(winnerIndex)
      : (state.winningTeam !== undefined ? state.winningTeam : (state.teamScores && state.teamScores[0] >= state.teamScores[1] ? 0 : 1));
    winCount = (winningTeam !== null && state.teamScores) ? (state.teamScores[winningTeam] || 0) : 0;
  } else if (winnerIndex >= 0 && state.scores) {
    winCount = state.scores[winnerIndex] || 0;
  }

  const modeRounds = MODE_SETTINGS[mode]?.rounds || (mode === '1v1' ? 3 : 1);
  const winThreshold = modeRounds === 1 ? 1 : (mode === '1v1' ? 2 : Math.ceil(modeRounds / 2));
  const isFinalMatchWin = Boolean(isMatchEnd || (winCount >= winThreshold) || state.gameState === 'matchEnd' || state.matchWinner);

  if (!state._hasPlayedChampionYouWinVoice && timer > 0) {
    state._hasPlayedChampionYouWinVoice = true;
    if (!isDraw && winner) {
      if (isFinalMatchWin) {
        const youwin = getAnnouncerSound('youwin');
        if (youwin && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(youwin.src, youwin.volume, youwin.speed, youwin.offset || 0);
        }
      }
    } else if (isDraw) {
      const bell = getAnnouncerSound('bell');
      if (bell && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(bell.src, bell.volume, bell.speed, bell.offset || 0);
      }
    }
  }

  // If Draw: render in-arena Double KO / Round Draw visual
  if (isDraw) {
    const centerX = arenaX + arenaW / 2;
    const centerY = arenaY + arenaH * 0.48;
    const popProgress = Math.min(1.0, timer / 16);
    const popScale = 1.0 + Math.sin(popProgress * Math.PI * 0.5) * 0.12;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(popScale, popScale);

    ctx.fillStyle = 'rgba(8, 8, 14, 0.88)';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    const boxW = 280;
    const boxH = 68;
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 24px "Outfit", "Rajdhani", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText('DOUBLE K.O.', 0, -10);
    ctx.fillStyle = '#FF3366';
    ctx.fillText('DOUBLE K.O.', 0, -10);

    ctx.font = '800 15px "Outfit", "Rajdhani", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText('ROUND DRAW', 0, 16);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('ROUND DRAW', 0, 16);

    ctx.restore();
    return;
  }

  // 0b. Play Champion Victory Voiceline strictly when match is won AFTER announcer finishes (Frame 68)
  if (!state._hasPlayedChampionVictoryVoice && timer >= 68 && isFinalMatchWin) {
    state._hasPlayedChampionVictoryVoice = true;

    const isTodo = winner && (winner.characterId === 'todo' || winner.type === 'todo' || winner._def?.id === 'todo');
    if (isTodo) {
      const todoSnd = CONFIG.todo?.victoryVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3';
      const vol = CONFIG.todo?.victoryVoiceVolume ?? 3.5;
      audioSystem.playSFX(todoSnd, vol);
    }

    const isYuji = winner && (winner.characterId === 'yuji' || winner.type === 'yuji' || winner._def?.id === 'yuji');
    const hasTodoTeammate = isYuji && state.fighters && state.fighters.some(f => f && f !== winner && (f.characterId === 'todo' || f.type === 'todo'));
    if (isYuji && hasTodoTeammate) {
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

    const isSukuna = winner && (winner.characterId === 'sukuna' || winner.type === 'sukuna' || winner._def?.id === 'sukuna') && winner.characterId !== 'yuji' && winner.type !== 'yuji';
    if (isSukuna) {
      const sukunaSnd = CONFIG.sukuna?.sounds?.championVoiceline || CONFIG.sukuna?.championVoiceline || 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3';
      const vol = CONFIG.sukuna?.soundVolumes?.championVoiceline ?? (CONFIG.sukuna?.championVoiceVolume ?? 3.5);
      audioSystem.playSFX(sukunaSnd, vol);
    }
  }

  // Simple In-Arena Winner Overlay
  draw1v1WinnerOverlay(ctx, winner, timer, mode, isMatchEnd);
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
    state._hasPlayedChampionVictoryVoice = false;
  }

  // If CJ's Mission Passed or Wasted overlay is active, let it play out smoothly (180 frames).
  // Announcer audio & voicelines start immediately (0 frames delay) without pausing!
  const hasMissionOverlay = Boolean(state._hadMissionOverlay || (state.missionPassedOverlay && state.missionPassedOverlay.active) || (state.wastedOverlay && state.wastedOverlay.active));
  const displayDelay = hasMissionOverlay ? 180 : 0;
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Check if winner has 2 victories (match win condition)
  const is1v2 = (mode === '1v2 Stand Off' || mode === '1v2' || mode === 'STAND_OFF_1V2' || mode === GAME_MODES.STAND_OFF_1V2);
  const is2v2 = (mode === '2v2' || mode === GAME_MODES.TWO_VS_TWO || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_2V2);
  const isTagMatch = (mode === 'Tag Match' || mode === GAME_MODES.TAG_MATCH || mode === 'TAG_MATCH');
  const isTeamMode = is1v2 || is2v2 || isTagMatch;
  const isFFA = (mode === 'FFA' || mode === 'Tactical FFA' || mode === GAME_MODES.FFA || mode === GAME_MODES.TACTICAL_FFA);

  const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
  const winningTeam = winnerIndex >= 0 ? state.getFighterTeam(winnerIndex) : (state.winningTeam !== undefined ? state.winningTeam : (state.teamScores[0] >= state.teamScores[1] ? 0 : 1));
  const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  const winThresholdForReveal = modeRounds === 1 ? 1 : 2;

  const hasTwoWins = isTeamMode 
    ? (winningTeam !== null && state.teamScores[winningTeam] >= winThresholdForReveal)
    : (winnerIndex >= 0 && scores[winnerIndex] >= winThresholdForReveal);

  const isChampionReveal = (isFFA && (ffaMatchComplete || modeRounds === 1)) || (hasTwoWins && roundWinner);

  const isChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = false;

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
  state._isChampionLayoutActive = false;
  drawInArenaChampionLayout(winner, timer, 'CHAMPION', mode, true);
}

function drawFfaChampionReveal(winner, timer) {
  state._isChampionLayoutActive = false;
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
    state._hasPlayedChampionVictoryVoice = false;
  }

  // If CJ's Mission Passed or Wasted overlay is active, let it play out smoothly (180 frames).
  // Announcer audio & voicelines start immediately (0 frames delay) without pausing!
  const hasMissionOverlay = Boolean(state._hadMissionOverlay || (state.missionPassedOverlay && state.missionPassedOverlay.active) || (state.wastedOverlay && state.wastedOverlay.active));
  const displayDelay = hasMissionOverlay ? 180 : 0;
  const delayedTimer = Math.max(0, matchEndTimer - displayDelay);

  // Determine Match Winner Entity
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);

  const isMatchChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = false;

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
