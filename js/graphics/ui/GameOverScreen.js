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
import { MODE_SETTINGS } from '../../core/modeConfig.js';
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

function drawChampionTitle(ctx, cx, y, titleText, themeColor) {
  ctx.save();
  ctx.font = '900 38px "Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Layer 1: Wide radiant outer glow stroke
  ctx.strokeStyle = hexToRgba(themeColor, 0.55);
  ctx.lineWidth = 14;
  ctx.strokeText(titleText, cx, y);

  // Layer 2: Sharp bold black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(titleText, cx, y);

  // Layer 3: Dynamic vertical gradient fill
  const grad = ctx.createLinearGradient(0, y - 20, 0, y + 20);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.40, adjustBrightness(themeColor, +30));
  grad.addColorStop(1, themeColor);
  ctx.fillStyle = grad;
  ctx.fillText(titleText, cx, y);

  // Layer 4: Bright inner highlight core
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Permanent Marker", "Bangers", "Outfit", "Arial Black", sans-serif';
  ctx.fillText(titleText, cx, y - 1);

  ctx.restore();
}

function drawChampionNameplate(ctx, cx, y, nameStr, themeColor) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Fighter Name
  ctx.font = '900 24px "Permanent Marker", "Bangers", "Outfit", sans-serif';

  // Radiant outer stroke
  ctx.strokeStyle = hexToRgba(themeColor, 0.40);
  ctx.lineWidth = 8;
  ctx.strokeText(nameStr, cx, y);

  // Black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(nameStr, cx, y);

  // Gradient text fill
  const nameGrad = ctx.createLinearGradient(0, y - 12, 0, y + 12);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(0.5, adjustBrightness(themeColor, +25));
  nameGrad.addColorStop(1, themeColor);
  ctx.fillStyle = nameGrad;
  ctx.fillText(nameStr, cx, y);

  // Laser Underline with Tactical Diamond Pins
  const lineY = y + 18;
  const halfW = Math.min(140, Math.max(75, nameStr.length * 8.0));

  const lineGrad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
  lineGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  lineGrad.addColorStop(0.2, hexToRgba(themeColor, 0.5));
  lineGrad.addColorStop(0.5, '#ffffff');
  lineGrad.addColorStop(0.8, hexToRgba(themeColor, 0.5));
  lineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, lineY);
  ctx.lineTo(cx + halfW, lineY);
  ctx.stroke();

  // Diamond End Pins
  [-halfW + 10, halfW - 10].forEach(dx => {
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(cx + dx, lineY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + dx, lineY, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawChampionStats(ctx, cx, yStart, winner, themeColor, timer = 60) {
  const winnerDealt = Math.round(winner?.damageDealt || 0);
  const winnerReceived = Math.round(winner?.damageReceived || 0);

  const rowW = 180;
  const leftX = cx - rowW / 2;
  const rightX = cx + rowW / 2;

  ctx.save();

  // Helper for rolling numeric values with smooth ease-out interpolation
  const drawRollingRow = (label, targetNum, y, valColor, delay) => {
    // 1. Label with black outline for high contrast
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '900 13px "Outfit", "Rajdhani", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText(label.toUpperCase(), leftX, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(label.toUpperCase(), leftX, y);

    // 2. Rolling Number Value
    const rollProgress = Math.min(1.0, Math.max(0.0, (timer - delay) / 38));
    const ease = 1 - Math.pow(1 - rollProgress, 3); // easeOutCubic
    const currentNum = Math.round(targetNum * ease);
    const numStr = currentNum.toString();

    ctx.textAlign = 'right';
    ctx.font = '900 16px "Outfit", "Rajdhani", sans-serif';

    // Active rolling glow stroke
    if (rollProgress > 0 && rollProgress < 1.0) {
      ctx.strokeStyle = hexToRgba(valColor || '#ffffff', 0.40);
      ctx.lineWidth = 6.0;
      ctx.strokeText(numStr, rightX, y);
    }

    // Crisp black outline & fill
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText(numStr, rightX, y);

    ctx.fillStyle = valColor || '#ffffff';
    ctx.fillText(numStr, rightX, y);
  };

  // Staggered roll: Damage Dealt starts at frame 14, Damage Received starts at frame 18
  drawRollingRow('Damage Dealt', winnerDealt, yStart, '#ffffff', 14);
  drawRollingRow('Damage Received', winnerReceived, yStart + 24, '#f87171', 18);

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
// SEAMLESS IN-ARENA CHAMPION LAYOUT
// (Fighter Glides Left, Stats Slide Right)
// ─────────────────────────────────────────────

function drawInArenaChampionLayout(winner, timer, titleText, mode, isMatchEnd) {
  const { ctx, arena } = state;
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const arenaW = arena ? arena.width : state.canvas.width;
  const arenaH = arena ? arena.height : state.canvas.height;

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
  }

  // 1. Smoothly Darken the Arena & Full Canvas (Deep Dark Victory Backdrop)
  const fadeAlpha = Math.min(1.0, timer / 30);
  ctx.save();
  ctx.fillStyle = `rgba(3, 4, 6, ${0.90 * fadeAlpha})`;
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.restore();

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

  const isMultiWinner = winningFighters.length > 1;
  const primaryThemeColor = winner?.color || '#38bdf8';

  // 2. Left Hero Zone (Fighter Glides Smoothly into Left Side)
  const targetHeroX = arenaX + arenaW * 0.22;
  const targetHeroY = arenaY + arenaH * 0.50;
  const targetScale = isMultiWinner ? 1.15 : 1.35;

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
    const def = wFighter._def || FIGHTER_DEFS.find(d => d.id === wFighter._def?.id);
    if (!def) return;

    const startPos = state._winnerStartPositions[idx] || { x: wFighter.x, y: wFighter.y, gunAngle: 0 };
    const heroYOffset = isMultiWinner ? (idx === 0 ? -arenaH * 0.18 : arenaH * 0.18) : 0;
    const finalHeroY = targetHeroY + heroYOffset;

    const currX = startPos.x + (targetHeroX - startPos.x) * glideEase;
    const currY = startPos.y + (finalHeroY - startPos.y) * glideEase;
    const currScale = 1.0 + (targetScale - 1.0) * glideEase;

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

    // Top Title ("CHAMPION" / "ROUND VICTORY")
    drawChampionTitle(ctx, statsX, targetStatsY - 50, titleText, primaryThemeColor);

    // Fighter Nameplate
    if (isMultiWinner && winningFighters.length === 2) {
      const nameStr = `${winningFighters[0].name.toUpperCase()}  &  ${winningFighters[1].name.toUpperCase()}`;
      drawChampionNameplate(ctx, statsX, targetStatsY - 14, nameStr, primaryThemeColor);
    } else if (winner) {
      drawChampionNameplate(ctx, statsX, targetStatsY - 14, winner.name.toUpperCase(), primaryThemeColor);
    }

    // Clean Text Stats with Rolling Digit Animation
    if (winner) {
      drawChampionStats(ctx, statsX, targetStatsY + 22, winner, primaryThemeColor, timer);
    }

    ctx.restore();
  }

  // 4. Pop-out "Follow for more :)" banner in the bottom center of the arena
  drawFollowForMoreBanner(ctx, arenaX + arenaW / 2, arenaY + arenaH - 26, timer, primaryThemeColor);
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
  // Otherwise wait ~75 frames (~1.25s) for faah.mp3 death audio before transitioning into the champion layout!
  const hasMissionOverlay = Boolean(state.missionPassedOverlay && (state.missionPassedOverlay.active || state.missionPassedOverlay.timer > 0 || state.missionPassedOverlay.isComplete)) || Boolean(state.wastedOverlay && (state.wastedOverlay.active || state.wastedOverlay.timer > 0 || state.wastedOverlay.isComplete));
  const displayDelay = hasMissionOverlay ? 160 : 75;
  const delayedTimer = Math.max(0, roundEndTimer - displayDelay);

  // Check if winner has 2 victories (match win condition)
  const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
  const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  const winThresholdForReveal = modeRounds === 1 ? 1 : 2;
  const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= winThresholdForReveal;
  const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || (hasTwoWins && roundWinner);

  const isChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = isChampionActive;

  if (isChampionActive) {
    const titleText = isChampionReveal 
      ? 'CHAMPION' 
      : (roundWinner ? `${roundWinner.name.toUpperCase()} WINS!` : 'ROUND DRAW!');

    drawInArenaChampionLayout(roundWinner, delayedTimer, titleText, mode, isChampionReveal);
  }

  // Register full screen click
  _registerButton(0, 0, state.canvas.width, state.canvas.height, () => { startNextRound(); });
}

// ─────────────────────────────────────────────
// WINNER REVEAL HELPERS
// ─────────────────────────────────────────────

function drawWinnerReveal(winner, timer, mode) {
  state._isChampionLayoutActive = true;
  drawInArenaChampionLayout(winner, timer, 'CHAMPION', mode, true);
}

function drawFfaChampionReveal(winner, timer) {
  state._isChampionLayoutActive = true;
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
  // Otherwise wait ~75 frames (~1.25s) for faah.mp3 death audio before transitioning into the champion layout!
  const hasMissionOverlay = Boolean(state.missionPassedOverlay && (state.missionPassedOverlay.active || state.missionPassedOverlay.timer > 0 || state.missionPassedOverlay.isComplete)) || Boolean(state.wastedOverlay && (state.wastedOverlay.active || state.wastedOverlay.timer > 0 || state.wastedOverlay.isComplete));
  const displayDelay = hasMissionOverlay ? 160 : 75;
  const delayedTimer = Math.max(0, matchEndTimer - displayDelay);

  // Determine Match Winner Entity
  const effectiveWinner = matchWinner || (state.fighters ? state.fighters.find(f => f && f.hp > 0) : null);

  const isMatchChampionActive = delayedTimer > 0;
  state._isChampionLayoutActive = isMatchChampionActive;

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
      if (mode === '1v2 Stand Off') {
        import('../core/gameFlow.js').then(m => m.randomize1v2Fighters());
      } else if (mode === '1v1' || mode === 'Stand Off') {
        randomize1v1Fighters();
      }
      resetMatch();
    }
  });
}

const drawMatchWinnerReveal = drawWinnerReveal;

export { drawRoundEndScreen, drawWinnerReveal, drawFfaChampionReveal, drawMatchEndScreen, drawMatchWinnerReveal };
