import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { state } from '../core/state.js';
import { GAME_MODES, MODE_SETTINGS, MODE_SPEED_MULTIPLIER } from '../core/modeConfig.js';
import { drawBlueAimbotGun } from './weaponVisuals.js';
import { drawPanel } from './ui.js';

import { syncHudPosition, initHudSync } from './ui/hudLayout.js';
import { getSkillDataForFighter } from './ui/hudSkillProviders.js';

export { syncHudPosition, initHudSync };

// Initialize immediately
initHudSync();

/**
 * Checks if the screen is currently dimmed by an active Domain Expansion (or active non-Purple ultimate strike).
 * Strictly excludes skill channeling / windup phases, and excludes Hollow Purple per explicit requirements.
 */
export function isScreenDimmedActive() {
  if (typeof state === 'undefined' || !state.fighters) return false;

  // 1. Any active Domain Expansion (deployed barrier phase, NOT during slide or channeling/windup)
  const isAnyDomainActive = state.fighters.some(f => 
    f && f.domainActive && 
    !f.isChannelingDomainExpansion && 
    !f.isChannelingDomain && 
    !f.isDomainPreSlide
  );
  if (isAnyDomainActive) return true;

  // 2. Active non-domain ultimate strikes (e.g. Toji Swarm, Sukuna Fuga Arrow) — STRICTLY EXCLUDES HOLLOW PURPLE
  const hasNonPurpleDimEffect = state.fighters.some(f => f && (
    ((f.characterId === 'toji' || f.type === 'toji') && f.ultimateActive && f.ultimatePhase !== 'CHANNELING' && !f.isChannelingDomain) ||
    (f.furnaceFireArrowTimer || 0) > 0
  ));
  if (hasNonPurpleDimEffect) return true;

  return false;
}

export function triggerHudHealBubble(hpBarElement, healAmount) {
  if (!hpBarElement) return;
  const bubble = document.createElement('div');
  bubble.className = 'hud-heal-bubble';
  bubble.textContent = `+${Math.round(healAmount)}`;
  hpBarElement.appendChild(bubble);
  setTimeout(() => {
    if (bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  }, 2200);
}

export function isDarkModeActive() {
  return Boolean(
    (typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode)) ||
    CONFIG.arenaTheme === 'dark' ||
    (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
  );
}

export function getFighterHealthBarColor(fighter, ratio, isDark = null) {
  if (!fighter) return '#22c55e';
  const isCj = fighter.characterId === 'cj' || fighter.type === 'cj';
  if (isCj) {
    return '#FFFFFF';
  }
  const isDarkTheme = isDark !== null ? isDark : isDarkModeActive();
  const themeColor = fighter.themeColor || fighter.color || '#15803d';

  if (isDarkTheme) {
    // In Dark Mode: healthbar fill color strictly stays based on fighter's theme color without transitioning to yellow-red
    return themeColor;
  }

  // In Light Mode: standard HP color transitions (Green -> Yellow -> Red)
  return ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#eab308' : '#ef4444');
}

/**
 * Checks if a specific fighter is a Tactical Shooter operative.
 */
export function isTacticalFighter(f) {
  if (!f) return false;
  if (f.gameCategory === 'tactical' || (f._def && f._def.gameCategory === 'tactical')) return true;
  const t = String(f.characterId || f.type || (f._def && f._def.type) || '').toLowerCase();
  return ['rifle', 'm4a1', 'shotgun', 'spas12', 'spas_12', 'pistol', 'desert_eagle', 'deserteagle', 'sniper', 'awp', 'barrett', 'barrett50cal', 'tactical_commando', 'tactical_guerilla', 'tactical_breacher', 'tactical_gunslinger', 'tactical_infiltrator', 'tactical_marksman', 'tactical_barrett', 'tactical_sniper', 'tactical_heavy'].includes(t);
}

/**
 * Robust check if current match/gamemode is Tactical Shooter.
 */
export function isTacticalMatch(s) {
  const stateObj = s || (typeof state !== 'undefined' ? state : null);
  if (!stateObj) return false;
  if (stateObj.gameCategory === 'tactical') return true;
  const m = String(stateObj.mode || '').toLowerCase();
  if (m.includes('tactical')) return true;
  if (stateObj.fighters && stateObj.fighters.some(f => isTacticalFighter(f))) {
    return true;
  }
  return false;
}

/**
 * Returns formatted caliber string for tactical operatives.
 */
export function getTacticalCaliber(f) {
  if (!f) return 'TACTICAL';
  const t = String(f.characterId || f.type || (f._def && f._def.type) || (f.name) || '').toLowerCase();
  if (t.includes('rifle') || t.includes('m4a1')) return '5.56 NATO';
  if (t.includes('shotgun') || t.includes('spas')) return '12-GAUGE';
  if (t.includes('pistol') || t.includes('desert') || t.includes('eagle')) return '.50 AE';
  if (t.includes('sniper') || t.includes('awp')) return '.338 LAPUA';
  if (t.includes('barrett')) return '.50 BMG';
  return 'TACTICAL';
}

/**
 * Returns formatted damage string for tactical operatives (e.g. 18×6 for shotgun, 35×3 for rifle).
 */
export function getTacticalDamageDisplay(f) {
  if (!f) return '0';
  const t = String(f.characterId || f.type || (f._def && f._def.type) || (f.name) || '').toLowerCase();
  const baseDmg = Math.round(Number(f.damage !== undefined ? f.damage : (f._def && f._def.damage)) || 0);
  if (t.includes('shotgun') || t.includes('spas')) return `${baseDmg}×6`;
  if (t.includes('rifle') || t.includes('m4a1')) return `${baseDmg}×3`;
  return `${baseDmg}`;
}

// ── Cached DOM references for per-frame HUD functions ──
let _cachedContainerBottom = null;
let _cachedContainerLeft = null;
let _cachedContainerRight = null;
let _cachedTopContainer = null;
let _cachedBottomContainer = null;
let _cachedTopLeft = null;
let _cachedTopRight = null;
let _cachedBottomLeft = null;
let _cachedBottomRight = null;


export function drawHUD() {
  const { ctx, canvas, fighters, scores, roundNum, mode, gameState, matchEndTimer, roundEndTimer, roundWinner, ffaMatchComplete } = state;


  // Calculate HUD opacity during champion reveal fade-in
  let hudOpacity = 1;
  if (gameState === 'matchEnd') {
    const displayDelay = 60; // match end delay before background overlay/transition starts
    const revealTimer = Math.max(0, matchEndTimer - (displayDelay + 45)); // match end delay plus reveal offset
    hudOpacity = Math.max(0, 1 - (revealTimer / 30));
  } else if (gameState === 'roundEnd') {
    const winnerIndex = roundWinner ? fighters.indexOf(roundWinner) : -1;
    const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
    const winThreshold = modeRounds === 1 ? 1 : 2;
    const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= winThreshold;
    const showModel = hasTwoWins && roundWinner;
    const isChampionReveal = ((mode === 'FFA' || mode === 'Tactical FFA' || mode === GAME_MODES.FFA || mode === GAME_MODES.TACTICAL_FFA) && ffaMatchComplete) || showModel;
    
    if (isChampionReveal) {
      const displayDelay = 60; // round end delay
      const delayedTimer = Math.max(0, roundEndTimer - displayDelay);
      hudOpacity = Math.max(0, 1 - (delayedTimer / 30));
    }
  }

  // Health HUD is rendered below the canvas in DOM (cached lookups).
  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  if (!_cachedContainerLeft) _cachedContainerLeft = document.getElementById('healthHudLeft');
  if (!_cachedContainerRight) _cachedContainerRight = document.getElementById('healthHudRight');
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer') || document.querySelector('.hud-top-container');
  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer') || document.querySelector('.hud-bottom-container');
  const containerBottom = _cachedContainerBottom;
  const containerLeft = _cachedContainerLeft;
  const containerRight = _cachedContainerRight;
  const topContainer = _cachedTopContainer;
  const bottomContainer = _cachedBottomContainer;

  // FOC & Tactical modes HUD visibility
  if (topContainer) {
    topContainer.style.display = 'none';
    topContainer.style.visibility = 'hidden';
  }
  if (bottomContainer) {
    bottomContainer.style.display = 'none';
    bottomContainer.style.visibility = 'hidden';
  }
  if (containerBottom) {
    const isTactical = isTacticalMatch(state);

    // Tactical HUD toggle — when enableHud is false in tacticalMainConfig, hide all HUD
    if (isTactical && CONFIG.tactical && CONFIG.tactical.enableHud === false) {
      hudOpacity = 0;
    }

    const isFfaMode = (mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA');
    containerBottom.classList.toggle('ffa-hud', isFfaMode && !isTactical);
    containerBottom.classList.toggle('tactical-hud', isTactical);
    const isSingleColMode = !isTactical && (mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'Stand Off');
    containerBottom.classList.toggle('single-column-hud', isSingleColMode);
    containerBottom.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerBottom.style.visibility = 'hidden';
      containerBottom.style.pointerEvents = 'none';
      containerBottom.style.display = 'none';
    } else {
      containerBottom.style.display = 'flex';
      containerBottom.style.visibility = 'visible';
      containerBottom.style.pointerEvents = 'auto';
    }
  }
  if (containerLeft) {
    if (hudOpacity <= 0 || !containerLeft.children || !containerLeft.children.length) {
      containerLeft.style.visibility = 'hidden';
      containerLeft.style.pointerEvents = 'none';
      containerLeft.style.display = 'none';
    } else {
      containerLeft.style.opacity = hudOpacity;
      containerLeft.style.display = 'block';
      containerLeft.style.visibility = 'visible';
      containerLeft.style.pointerEvents = 'auto';
    }
  }
  if (containerRight) {
    if (hudOpacity <= 0 || !containerRight.children || !containerRight.children.length) {
      containerRight.style.visibility = 'hidden';
      containerRight.style.pointerEvents = 'none';
      containerRight.style.display = 'none';
    } else {
      containerRight.style.opacity = hudOpacity;
      containerRight.style.display = 'block';
      containerRight.style.visibility = 'visible';
      containerRight.style.pointerEvents = 'auto';
    }
  }

  updateHealthHud();

  if (hudOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = hudOpacity;

    // Draw authentic GTA San Andreas "Cheat activated" top-left arena slide banner
    drawCheatNotification(ctx);

    ctx.restore();
  }
}

/**
 * Draws the iconic GTA San Andreas "Cheat activated" top-left pop-out notification banner.
 */
export function drawCheatNotification(ctx) {
  const notif = state.cheatNotification;
  if (!notif || notif.timer <= 0) {
    if (state.cheatNotification && state.cheatNotification.timer <= 0) {
      state.cheatNotification = null;
    }
    return;
  }

  notif.timer--;
  if (notif.timer <= 0) {
    state.cheatNotification = null;
    return;
  }

  const text = notif.text || 'Cheat activated';
  const fontSize = 15;
  const fontStr = `900 ${fontSize}px "Franklin Gothic Heavy", "Impact", "Arial Black", "Trebuchet MS", sans-serif`;

  ctx.save();
  ctx.font = fontStr;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  // Authentic GTA San Andreas rectangular bar with wide right-side extension
  const boxWidth = Math.max(195, textWidth + 60);
  const boxHeight = 26;

  // Position directly at top-left inside the arena (pops out in place)
  const arenaX = (state.arena && state.arena.x !== undefined) ? state.arena.x : 20;
  const arenaY = (state.arena && state.arena.y !== undefined) ? state.arena.y : 180;
  const targetX = arenaX + 10;
  const targetY = arenaY + 10;

  // 1. Box Background: dark-gray in Dark Mode (#262930), authentic GTA dark teal-slate in Light Mode (#1d3336)
  const isDark = (typeof state !== 'undefined' && state.arenaTheme === 'dark');
  ctx.fillStyle = isDark ? '#262930' : '#1d3336';
  ctx.fillRect(targetX, targetY, boxWidth, boxHeight);

  // 2. Text rendering with 1px black drop-shadow
  const textX = targetX + 8;
  const textY = targetY + boxHeight / 2 + 1;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillText(text, textX + 1, textY + 1);

  // Text color: crisp silver-white (#f1f5f9) in Dark Mode, muted silver-teal (#b3c8cc) in Light Mode
  ctx.fillStyle = isDark ? '#f1f5f9' : '#b3c8cc';
  ctx.fillText(text, textX, textY);

  ctx.restore();
}

/**
 * Draws the iconic GTA San Andreas "mission passed! RESPECT +" center arena overlay.
 */
export function drawMissionPassedOverlay(ctx) {
  const overlay = state.missionPassedOverlay;
  if (!overlay || !overlay.active || overlay.timer <= 0) {
    if (state.missionPassedOverlay && (state.missionPassedOverlay.timer <= 0 || !state.missionPassedOverlay.active)) {
      state.missionPassedOverlay = null;
    }
    return;
  }

  // Unconditionally decrement timer once per draw frame
  overlay.timer--;

  const totalFrames = overlay.maxTimer || 180;
  const elapsed = totalFrames - overlay.timer;
  const remaining = overlay.timer;

  // Pure smooth alpha fade-in (30 frames) and smooth fade-out (30 frames) with zero scaling/popping
  let alpha = 1.0;

  if (elapsed < 30) {
    const t = Math.max(0, Math.min(1, elapsed / 30));
    alpha = Math.sin((t * Math.PI) / 2);
  } else if (remaining < 30) {
    const t = Math.max(0, Math.min(1, remaining / 30));
    alpha = Math.sin((t * Math.PI) / 2);
  }

  if (overlay.timer <= 0) {
    overlay.active = false;
    overlay.isComplete = true;
    state.missionPassedOverlay = null;
    return;
  }

  const arenaX = (state.arena && state.arena.x !== undefined) ? state.arena.x : (CONFIG.arena?.x ?? 40);
  const arenaY = (state.arena && state.arena.y !== undefined) ? state.arena.y : (CONFIG.arena?.y ?? 240);
  const arenaW = (state.arena && state.arena.width !== undefined) ? state.arena.width : (CONFIG.arena?.width ?? 450);
  const arenaH = (state.arena && state.arena.height !== undefined) ? state.arena.height : (CONFIG.arena?.height ?? 450);

  const cx = arenaX + arenaW / 2;
  const cy = arenaY + arenaH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ── Line 1: "mission Passed!" (Exact 1:1 GTA San Andreas Capital P & Proportions) ──
  ctx.font = 'normal 56px "Pricedown", "Impact", "Arial Black", sans-serif';
  ctx.lineWidth = 7.5;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.strokeText('mission Passed!', 0, -20);

  // Gradient Fill: Exact Authentic GTA San Andreas Warm Ochre-Amber
  const grad = ctx.createLinearGradient(0, -48, 0, 10);
  grad.addColorStop(0, '#E18E06');
  grad.addColorStop(0.5, '#D88204');
  grad.addColorStop(1, '#B86500');
  ctx.fillStyle = grad;
  ctx.fillText('mission Passed!', 0, -20);

  // ── Line 2: "RESPECT" + Authentic 1:1 GTA Block Cross Plus Sign ──
  const line2Y = 32;
  ctx.font = 'normal 48px "Pricedown", "Impact", "Arial Black", sans-serif';
  const respectText = 'RESPECT';
  const textMetrics = ctx.measureText(respectText);
  const textW = textMetrics.width;

  const plusSize = 22;      // Full width and height of the plus sign
  const barThick = 8;       // Thickness of the horizontal & vertical arms
  const gap = 12;           // Space between "RESPECT" and the plus sign
  const totalW = textW + gap + plusSize;

  const textStartX = -totalW / 2;
  const respectCenterX = textStartX + textW / 2;
  const plusCenterX = textStartX + textW + gap + plusSize / 2;
  const plusCenterY = line2Y;

  // Draw "RESPECT"
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.strokeText(respectText, respectCenterX, line2Y);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(respectText, respectCenterX, line2Y);

  // Draw 1:1 Authentic GTA San Andreas Block Cross Plus Sign
  const s = plusSize / 2;
  const t = barThick / 2;

  ctx.beginPath();
  ctx.moveTo(plusCenterX - t, plusCenterY - s);
  ctx.lineTo(plusCenterX + t, plusCenterY - s);
  ctx.lineTo(plusCenterX + t, plusCenterY - t);
  ctx.lineTo(plusCenterX + s, plusCenterY - t);
  ctx.lineTo(plusCenterX + s, plusCenterY + t);
  ctx.lineTo(plusCenterX + t, plusCenterY + t);
  ctx.lineTo(plusCenterX + t, plusCenterY + s);
  ctx.lineTo(plusCenterX - t, plusCenterY + s);
  ctx.lineTo(plusCenterX - t, plusCenterY + t);
  ctx.lineTo(plusCenterX - s, plusCenterY + t);
  ctx.lineTo(plusCenterX - s, plusCenterY - t);
  ctx.lineTo(plusCenterX - t, plusCenterY - t);
  ctx.closePath();

  ctx.lineWidth = 6.5;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.restore();
}

/**
 * Triggers and draws the authentic GTA: San Andreas "WASTED" screen overlay.
 * Renders full-width horizontal dark band banner with red Pricedown typography.
 */
export function drawWastedOverlay(ctx) {
  const overlay = state.wastedOverlay;
  if (!overlay || !overlay.active || overlay.timer <= 0) {
    if (state.wastedOverlay && (state.wastedOverlay.timer <= 0 || !state.wastedOverlay.active)) {
      state.wastedOverlay = null;
    }
    return;
  }

  // Unconditionally decrement timer once per draw frame
  overlay.timer--;

  const totalFrames = overlay.maxTimer || 200;
  const elapsed = totalFrames - overlay.timer;
  const remaining = overlay.timer;

  // Smooth alpha fade-in (20 frames) and smooth fade-out (30 frames)
  let alpha = 1.0;
  if (elapsed < 20) {
    const t = Math.max(0, Math.min(1, elapsed / 20));
    alpha = Math.sin((t * Math.PI) / 2);
  } else if (remaining < 30) {
    const t = Math.max(0, Math.min(1, remaining / 30));
    alpha = Math.sin((t * Math.PI) / 2);
  }

  if (overlay.timer <= 0) {
    overlay.active = false;
    overlay.isComplete = true;
    state.wastedOverlay = null;
    return;
  }

  const cw = (ctx.canvas && ctx.canvas.width) || (state.canvas && state.canvas.width) || 530;
  const ch = (ctx.canvas && ctx.canvas.height) || (state.canvas && state.canvas.height) || 940;

  const arenaY = (state.arena && state.arena.y !== undefined) ? state.arena.y : 240;
  const arenaH = (state.arena && state.arena.height !== undefined) ? state.arena.height : 450;
  const cy = arenaY + arenaH / 2;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // 1. Full-screen subtle death vignette / desaturation dim
  const vigGrad = ctx.createRadialGradient(cw / 2, cy, 50, cw / 2, cy, Math.max(cw, ch) * 0.7);
  vigGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.15)');
  vigGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.35)');
  vigGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, cw, ch);

  // 2. Full-width horizontal dark banner band across screen
  const bannerH = 92;
  const bannerTop = cy - bannerH / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(0, bannerTop, cw, bannerH);

  // Top and bottom crisp black edge rules
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, bannerTop, cw, 2.5);
  ctx.fillRect(0, bannerTop + bannerH - 2.5, cw, 2.5);

  // 3. Center "WASTED" Red Typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'normal 62px "Pricedown", "Impact", "Arial Black", sans-serif';

  // Heavy Black Miter Outline
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.strokeText('WASTED', cw / 2, cy);

  // Authentic GTA Red Gradient Fill
  const textGrad = ctx.createLinearGradient(0, cy - 30, 0, cy + 30);
  textGrad.addColorStop(0.0, '#EF4444'); // Bright Crimson Top
  textGrad.addColorStop(0.5, '#DC2626'); // Rich Red Mid
  textGrad.addColorStop(1.0, '#991B1B'); // Deep Dark Red Bottom
  ctx.fillStyle = textGrad;
  ctx.fillText('WASTED', cw / 2, cy);

  ctx.restore();
}

// HUD Cache Map
const _hudCache = {
  teams: new Map(), // teamIndex -> cached team card elements
  fighters: new Map(), // fighter -> cached fighter card elements
};

// Persistent Tactical Card DOM elements cache
const _tacticalCards = {
  top: [],
  bottom: []
};

export function clearHealthHud() {
  _hudCache.teams.clear();
  _hudCache.fighters.clear();
  _tacticalCards.top = [];
  _tacticalCards.bottom = [];

  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  if (!_cachedContainerLeft) _cachedContainerLeft = document.getElementById('healthHudLeft');
  if (!_cachedContainerRight) _cachedContainerRight = document.getElementById('healthHudRight');
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer');
  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer');

  if (_cachedContainerBottom) {
    _cachedContainerBottom.innerHTML = '';
    _cachedContainerBottom.style.display = 'none';
    _cachedContainerBottom.style.visibility = 'hidden';
  }
  if (_cachedContainerLeft) {
    _cachedContainerLeft.innerHTML = '';
    _cachedContainerLeft.style.display = 'none';
    _cachedContainerLeft.style.visibility = 'hidden';
  }
  if (_cachedContainerRight) {
    _cachedContainerRight.innerHTML = '';
    _cachedContainerRight.style.display = 'none';
    _cachedContainerRight.style.visibility = 'hidden';
  }
  if (_cachedTopContainer) {
    _cachedTopContainer.innerHTML = '';
    _cachedTopContainer.style.display = 'none';
    _cachedTopContainer.style.visibility = 'hidden';
  }
  if (_cachedBottomContainer) {
    _cachedBottomContainer.innerHTML = '';
    _cachedBottomContainer.style.display = 'none';
    _cachedBottomContainer.style.visibility = 'hidden';
  }
  
  if (!_cachedTopLeft) _cachedTopLeft = document.getElementById('hudTopLeft');
  if (!_cachedTopRight) _cachedTopRight = document.getElementById('hudTopRight');
  if (!_cachedBottomLeft) _cachedBottomLeft = document.getElementById('hudBottomLeft');
  if (!_cachedBottomRight) _cachedBottomRight = document.getElementById('hudBottomRight');
  if (_cachedTopLeft) _cachedTopLeft.innerHTML = '';
  if (_cachedTopRight) _cachedTopRight.innerHTML = '';
  if (_cachedBottomLeft) _cachedBottomLeft.innerHTML = '';
  if (_cachedBottomRight) _cachedBottomRight.innerHTML = '';
}

function ensureTacticalCardElement(container, index, accentColor) {
  let card = container.querySelector(`[data-tactical-idx="${index}"]`);
  if (!card) {
    card = document.createElement('div');
    card.className = 'tactical-hud-card';
    card.setAttribute('data-tactical-idx', index);
    card.style.cssText = `
      flex: 1 1 0;
      min-width: 0;
      box-sizing: border-box;
      padding: 3.5px 6px;
      background: linear-gradient(135deg, rgba(11, 15, 25, 0.94) 0%, rgba(15, 23, 42, 0.94) 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 3px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      gap: 2.5px;
    `;
    card.innerHTML = `
      <!-- Top Row: Operator Name & Caliber / Live Health Readout -->
      <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.15;">
        <div style="display: flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden;">
          <span class="tac-name" style="font-family: 'Rajdhani', 'Outfit', sans-serif; font-size: 10.5px; font-weight: 900; color: ${accentColor}; letter-spacing: 0.4px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
          <span class="tac-caliber" style="font-family: 'Rajdhani', monospace; font-size: 8px; font-weight: 700; color: #94a3b8; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); padding: 0 3px; border-radius: 2px; white-space: nowrap;"></span>
        </div>
        <div class="tac-hp-badge" style="font-family: 'Rajdhani', monospace; font-size: 10px; font-weight: 900; color: #f8fafc; display: flex; align-items: baseline; gap: 2px;">
          <span class="tac-hp">0</span><span class="tac-hp-unit" style="font-size: 8px; color: #64748b;"> HP</span>
        </div>
      </div>

      <!-- Middle: Clean Health Bar Track -->
      <div class="health-card__bar" style="height: 3.5px; background: rgba(255, 255, 255, 0.12); border-radius: 1.5px; overflow: hidden; position: relative;">
        <div class="health-card__fill" style="width: 100%; height: 100%; background: ${accentColor}; border-radius: 1.5px; transition: width 0.15s ease, background 0.2s ease;"></div>
      </div>

      <!-- Bottom Row: Simple Clean Minimal Text for AMMO and DMG (No cards/boxes) -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-family: 'Rajdhani', monospace; font-size: 9px; font-weight: 700; line-height: 1; padding: 0.5px 0;">
        <!-- Left: Ammo Simple Text -->
        <div style="display: flex; align-items: center; gap: 3px;">
          <span style="font-size: 8px; color: #64748b;">AMMO</span>
          <span class="tac-ammo" style="color: #fbbf24; font-weight: 800;">0/0</span>
        </div>
        <!-- Right: Damage Simple Text -->
        <div style="display: flex; align-items: center; gap: 3px;">
          <span style="font-size: 8px; color: #64748b;">DMG</span>
          <span class="tac-dmg" style="color: #cbd5e1; font-weight: 800;">0</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
  return {
    card,
    nameEl: card.querySelector('.tac-name'),
    caliberEl: card.querySelector('.tac-caliber'),
    dmgEl: card.querySelector('.tac-dmg'),
    ammoEl: card.querySelector('.tac-ammo'),
    hpEl: card.querySelector('.tac-hp'),
    hpUnitEl: card.querySelector('.tac-hp-unit'),
    hpBadge: card.querySelector('.tac-hp-badge'),
    fillEl: card.querySelector('.health-card__fill')
  };
}

function updateTacticalCard(cardObj, f, index, accentColor) {
  if (!cardObj || !cardObj.card) return;
  if (!f) {
    if (cardObj.card.style.display !== 'none') cardObj.card.style.display = 'none';
    return;
  }
  if (cardObj.card.style.display !== '') cardObj.card.style.display = '';

  const maxHp = Math.max(1, Math.round(Number(f.maxHp) || 100));
  const hp = Math.max(0, Math.min(maxHp, Math.round(Number(f.hp) || 0)));
  const ratio = hp / maxHp;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const name = (f.name || f.type || `OP ${index + 1}`).toUpperCase();
  const fighterColor = (f.color || accentColor || '#ffffff');
  const isDark = isDarkModeActive();
  const barColor = isDark ? (f.themeColor || f.color || accentColor || '#ffffff') : (ratio > 0.25 ? fighterColor : '#ef4444');
  const isDead = hp <= 0;
  const attackDmg = Math.round(Number(f.damage !== undefined ? f.damage : (f._def && f._def.damage)) || 0);
  const curAmmo = f.magazineBullets !== undefined ? f.magazineBullets : (f.maxMagazine || 30);
  const maxAmmo = f.maxMagazine || 30;
  const isReloading = Boolean(f.isReloading);

  // 1. Operator Name
  if (cardObj.nameEl) {
    if (cardObj.nameEl.textContent !== name) cardObj.nameEl.textContent = name;
    if (cardObj.nameEl.style.color !== fighterColor) cardObj.nameEl.style.color = fighterColor;
  }

  // 2. Caliber / Class Sub-tag
  if (cardObj.caliberEl) {
    let caliberStr = 'TACTICAL';
    const t = (f.type || f.name || '').toLowerCase();
    if (t.includes('rifle') || t.includes('m4a1')) {
      caliberStr = '5.56 NATO';
    } else if (t.includes('shotgun') || t.includes('spas')) {
      caliberStr = '12-GAUGE';
    } else if (t.includes('pistol') || t.includes('desert') || t.includes('eagle')) {
      caliberStr = '.50 AE';
    } else if (t.includes('sniper') || t.includes('awp')) {
      caliberStr = '.338 LAPUA';
    }
    if (cardObj.caliberEl.textContent !== caliberStr) cardObj.caliberEl.textContent = caliberStr;
  }

  // 3. Damage Simple Text
  if (cardObj.dmgEl) {
    let dmgText = `${attackDmg}`;
    const t = (f.type || f.name || '').toLowerCase();
    if (t.includes('shotgun') || t.includes('spas')) {
      dmgText = `${attackDmg}×6`;
    } else if (t.includes('rifle') || t.includes('m4a1')) {
      dmgText = `${attackDmg}×3`;
    }
    if (cardObj.dmgEl.textContent !== dmgText) cardObj.dmgEl.textContent = dmgText;
  }

  // 4. Ammo Simple Text
  if (cardObj.ammoEl) {
    if (isDead) {
      cardObj.ammoEl.textContent = '-';
      cardObj.ammoEl.style.color = '#64748b';
    } else if (isReloading) {
      cardObj.ammoEl.textContent = 'RELOAD...';
      cardObj.ammoEl.style.color = '#38bdf8';
    } else {
      const isLow = curAmmo <= Math.max(1, Math.floor(maxAmmo * 0.25));
      cardObj.ammoEl.textContent = `${curAmmo}/${maxAmmo}`;
      cardObj.ammoEl.style.color = isLow ? '#ef4444' : '#fbbf24';
    }
  }

  // 5. HP Readout
  if (cardObj.hpEl) {
    if (isDead) {
      cardObj.hpEl.textContent = 'KIA';
      cardObj.hpEl.style.color = '#ef4444';
      if (cardObj.hpUnitEl) cardObj.hpUnitEl.style.display = 'none';
    } else {
      cardObj.hpEl.textContent = `${hp}`;
      cardObj.hpEl.style.color = (ratio <= 0.25) ? '#ef4444' : '#f8fafc';
      if (cardObj.hpUnitEl) cardObj.hpUnitEl.style.display = 'inline';
    }
  }

  // 6. Healthbar Fill
  if (cardObj.fillEl) {
    const widthStr = `${percent}%`;
    if (cardObj.fillEl.style.width !== widthStr) cardObj.fillEl.style.width = widthStr;
    if (cardObj.fillEl.style.background !== barColor) cardObj.fillEl.style.background = barColor;
  }

  const opacityStr = isDead ? '0.35' : '1';
  if (cardObj.card.style.opacity !== opacityStr) cardObj.card.style.opacity = opacityStr;
}

document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.dummy-aggressive-toggle')) {
    import('../core/state.js').then(m => {
      m.state.dummyAggressive = !m.state.dummyAggressive;
    });
  }
});

function updateHealthHud() {
  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  if (!_cachedContainerLeft) _cachedContainerLeft = document.getElementById('healthHudLeft');
  if (!_cachedContainerRight) _cachedContainerRight = document.getElementById('healthHudRight');
  const containerBottom = _cachedContainerBottom;
  const containerLeft = _cachedContainerLeft;
  const containerRight = _cachedContainerRight;
  if (!containerBottom) return;

  const { fighters, mode, scores, teamScores } = state;
  if (!fighters) return;

  // OPTIMIZATION: Auto-rebuild if HUD display mode or Arena Theme changed.
  const hudModeChanged = state._lastHudShowFighterDescription !== CONFIG.hudShowFighterDescription ||
                         state._lastDarkModeShowHudSkillBars !== CONFIG.darkModeShowHudSkillBars ||
                         state._lastDarkModeShowHudStats !== CONFIG.darkModeShowHudStats;
  const themeChanged = state._lastArenaTheme !== (state.arenaTheme || 'light');
  state._lastHudShowFighterDescription = CONFIG.hudShowFighterDescription;
  state._lastDarkModeShowHudSkillBars = CONFIG.darkModeShowHudSkillBars;
  state._lastDarkModeShowHudStats = CONFIG.darkModeShowHudStats;
  state._lastArenaTheme = state.arenaTheme || 'light';
  if (hudModeChanged || themeChanged) {
    clearHealthHud();
  }

  // OPTIMIZATION: Throttling HUD updates to prevent extreme DOM reflow lag from progress bars.
  const isTactical = isTacticalMatch(state);
  const is1v1 = mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.TACTICAL_1V1 || mode === 'Tactical 1v1' || (isTactical && fighters.length === 2 && !mode.includes('2v2') && !mode.includes('4v4'));
  const isStandOff = mode === GAME_MODES.STAND_OFF || mode === 'Stand Off' || mode === GAME_MODES.TACTICAL_STANDOFF || mode === 'Tactical Stand Off' || mode === GAME_MODES.TACTICAL_RANDOM || mode === 'Tactical Random';
  const is1v2 = mode === GAME_MODES.STAND_OFF_1V2 || mode === '1v2 Stand Off';
  const is2v2 = mode === GAME_MODES.TWO_VS_TWO || mode === '2v2' || mode === GAME_MODES.TACTICAL_2V2 || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_4V4 || mode === 'Tactical 4v4';
  const isTLFS = mode === GAME_MODES.TLFS || mode === 'TLFS';
  const isSingleColumnMode = (is1v1 || isStandOff) && !isTactical;
  const currentHpStr = fighters.map(f => f ? Math.round(f.hp) : 0).join(',');
  const q = (v) => Math.round((v || 0) / 4);
  const currentSkillsStr = fighters.map(f => {
    if (!f) return '';
    const illCount = (f.characterId === 'doppleganger' || f.type === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppelganger')
      ? (state.illusions ? state.illusions.filter(ill => ill && ill.isDoppelganger && ill.hp > 0).length : 0) : 0;
    return `${f.isReloading || false},${f.magazineBullets || 0},${q(f.skillCooldown)},${q(f.cooldownTimer)},${f.domainActive || false},${q(f.beamCharge)},${q(f.beamTimer)},${q(f.shootCooldown)},${illCount},${q(f.totalAccumDamage)},${q(f.throwCooldown)},${q(f.shoutCooldown)},${q(f.reverseCursedTechniqueCooldown)},${f.isTakadaUltActive || false},${q(f.takadaUltTimer)},${f.isTakadaChanneling || false},${q(f.takadaChannelTimer)},${q(f.timeStopTimer)},${q(f.evadeBuffTimer)},${f.isRolling || false},${q(f.rollCooldown)},${f.isSelfDestructing || false},${f.isJetpackActive || false},${q(f.jetpackTimer)},${f.isBaguvixActive || false},${q(f.hesoyamShield)},${q(f.respect)},${q(f.jetpackCooldown)},${q(f.driveByCooldown)},${q(f.baguvixCooldown)},${q(f.baguvixTimer)},${q(f.driveByTimer)},${f.hasUsedHesoyam || false},${f.isDriveByActive || false},${f.isTypingCheat || false}`;
  }).join('|');
  const hpChanged = currentHpStr !== state._lastHpStr;
  const skillsChanged = currentSkillsStr !== state._lastSkillsStr;

  state._lastHpStr = currentHpStr;
  state._lastSkillsStr = currentSkillsStr;

  state._hudFrameCount = (state._hudFrameCount || 0) + 1;

  // ── INSTANT Dim Class Toggle (runs EVERY frame, before throttle) ──
  {
    const isDimmedNow = isScreenDimmedActive();

    // Detect Saitama's counter punch impact flash (HUD text snaps to black during bright white screen flash)
    const isSaitamaPunchImpactFlash = state.fighters && state.fighters.some(f =>
      f && (f.characterId === 'saitama' || f.type === 'saitama') &&
      f._counterPunchImpactFlashTimer && f._counterPunchImpactFlashTimer > 0
    );

    const isDarkTheme = (state.arenaTheme === 'dark');
    const _dimEls = [
      document.querySelector('.game-container'),
      document.querySelector('.game-box'),
      document.getElementById('hudBottomContainer'),
      document.getElementById('hudTopContainer'),
      document.getElementById('hudTopLeft'),
      document.getElementById('hudTopRight'),
      document.getElementById('hudBottomLeft'),
      document.getElementById('hudBottomRight'),
      document.getElementById('healthHud'),
      document.getElementById('healthHudLeft'),
      document.getElementById('healthHudRight'),
      document.body
    ];
    _dimEls.forEach(el => {
      if (el) {
        if (isDimmedNow) el.classList.add('hud-dimmed');
        else el.classList.remove('hud-dimmed');

        if (isDarkTheme) el.classList.add('arena-dark-mode');
        else el.classList.remove('arena-dark-mode');

        // Snap HUD text to black during punch impact white flash
        if (isSaitamaPunchImpactFlash) el.classList.add('hud-punch-impact');
        else el.classList.remove('hud-punch-impact');
      }
    });
  }

  // Performance: Throttle expensive HUD innerHTML writes to avoid layout reflow stalls
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)));
  const throttleInterval = isLowQuality ? 8 : 4;
  const isCriticalState = ['roundEnd', 'matchEnd', 'countdown'].includes(state.gameState);
  
  if (!isCriticalState && (state._hudFrameCount % throttleInterval !== 0)) {
    return; // Skip DOM update this frame to preserve CPU and lock 60 FPS
  }

  // Already declared above: const is1v2 = mode === GAME_MODES.STAND_OFF_1V2;
  // Already declared above: const teamMode = mode === GAME_MODES.TWO_VS_TWO || is1v2;
  
  if (!_cachedTopLeft) _cachedTopLeft = document.getElementById('hudTopLeft');
  if (!_cachedTopRight) _cachedTopRight = document.getElementById('hudTopRight');
  if (!_cachedBottomLeft) _cachedBottomLeft = document.getElementById('hudBottomLeft');
  if (!_cachedBottomRight) _cachedBottomRight = document.getElementById('hudBottomRight');

  const checkHasTeammate = (f) => {
    if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
      const myIndex = state.fighters.indexOf(f);
      if (myIndex !== -1) {
        const myTeam = state.getFighterTeam(myIndex);
        if (myTeam !== null) {
          return state.fighters.some((other, idx) => idx !== myIndex && other && !other.isTurret && state.getFighterTeam(idx) === myTeam);
        }
      }
    }
    return false;
  };

  const isSkillExceptionInDarkMode = (fighter, skill) => {
    if (!fighter || !skill) return false;
    const fId = String(fighter.characterId || fighter.type || (fighter._def && fighter._def.type) || '').toLowerCase();
    const sId = String(skill.id || '').toLowerCase();
    const sLabel = String(skill.label || '').toUpperCase();

    // 1. Ichigo exception: BANKAI (strictly sId === 'bankai' so 'HOLLOW (BANKAI REQ)' is hidden when darkModeShowHudSkillBars is off)
    if (fId === 'ichigo') {
      if (sId === 'bankai') {
        return true;
      }
    }

    // 2. Toji exception: His Ultimate (Curse Inventory)
    if (fId === 'toji') {
      if (sId === 'ult' || sId === 'ultimate' || sLabel.includes('CURSE INVENTORY') || sLabel.includes('INVENTORY')) {
        return true;
      }
    }

    // 3. Gojo exception: Domain Expansion (Unlimited Void)
    if (fId === 'gojo') {
      if (sId === 'uv' || sId === 'domain' || sLabel.includes('UNLIMITED VOID') || sLabel.includes('VOID')) {
        return true;
      }
    }

    // 4. Sukuna exception: Domain Expansion (Malevolent Shrine)
    if (fId === 'sukuna') {
      if (sId === 'ms' || sId === 'domain' || sLabel.includes('MALEVOLENT SHRINE') || sLabel.includes('SHRINE')) {
        return true;
      }
    }

    // 5. Yuta exception: Domain Expansion (Authentic Mutual Love)
    if (fId === 'yuta') {
      if (sId === 'domain' || sLabel.includes('AUTHENTIC MUTUAL LOVE') || sLabel.includes('MUTUAL LOVE')) {
        return true;
      }
    }

    // 6. Mahito exception: Domain Expansion (Self-Embodiment of Perfection)
    if (fId === 'mahito') {
      if (sId === 'domain_expansion' || sId === 'domain' || sLabel.includes('SELF-EMBODIMENT') || sLabel.includes('PERFECTION')) {
        return true;
      }
    }

    // 7. Saitama exception: SERIOUS PUNCH (Serious Counter)
    if (fId === 'saitama') {
      if (sId === 'punish' || sId === 'counter' || sLabel.includes('SERIOUS PUNCH') || sLabel.includes('SERIOUS')) {
        return true;
      }
    }

    // 8. Genos exception: His Ultimate (Incineration Cannon)
    if (fId === 'genos') {
      if (sId === 'ult' || sId === 'ultimate' || sLabel.includes('INCINERATION CANNON') || sLabel.includes('INCINERATION')) {
        return true;
      }
    }

    // 9. Yuji exception: Black Flash charges
    if (fId === 'yuji') {
      if (sId === 'bf_threshold' || sId === 'black_flash' || sLabel.includes('BLACK FLASH')) {
        return true;
      }
    }

    // 10. Todo exception: Boogie (Boogie Woogie)
    if (fId === 'todo') {
      if (sId === 'clap' || sId === 'boogie' || sLabel.includes('BOOGIE')) {
        return true;
      }
    }

    // 11. Nanami exception: Decisive Strike (Ratio Lunge)
    if (fId === 'nanami') {
      if (sId === 'lunge' || sId === 'decisive' || sLabel.includes('DECISIVE')) {
        return true;
      }
    }

    // 12. Mahoraga exception: Wheel of Adaptation
    if (fId === 'mahoraga') {
      if (sId === 'wheel' || sId === 'adaptation' || sLabel.includes('WHEEL') || sLabel.includes('ADAPTATION') || sLabel.includes('WOA')) {
        return true;
      }
    }

    // 13. CJ exception: BAGUVIX (God Mode)
    if (fId === 'cj') {
      if (sId === 'baguvix' || sId === 'godmode' || sLabel.includes('BAGUVIX') || sLabel.includes('GODMODE')) {
        return true;
      }
    }

    // 14. Engineer exception: Sentry
    if (fId === 'engineer') {
      if (sId === 'turret' || sId === 'sentry' || sLabel.includes('SENTRY') || sLabel.includes('TURRET')) {
        return true;
      }
    }

    // 15. John Wick exception: EXCOMMUNICADO
    if (fId === 'john_wick' || fId === 'johnwick' || fId === 'wick') {
      if (sId === 'ultimate' || sId === 'excommunicado' || sLabel.includes('EXCOMMUNICADO')) {
        return true;
      }
    }

    return false;
  };

  const shouldShowFighterSkill = (fighter, skill) => {
    if (isDarkModeActive()) {
      const showAll = (CONFIG.darkModeShowHudSkillBars !== undefined)
        ? Boolean(CONFIG.darkModeShowHudSkillBars)
        : ((CONFIG.darkModeShowSkillBars !== undefined) ? Boolean(CONFIG.darkModeShowSkillBars) : true);
      
      if (!showAll) {
        return isSkillExceptionInDarkMode(fighter, skill);
      }
    }
    return true;
  };

  const shouldShowHudSkillBars = () => {
    if (isDarkModeActive()) {
      if (CONFIG.darkModeShowHudSkillBars !== undefined) return Boolean(CONFIG.darkModeShowHudSkillBars);
      if (CONFIG.darkModeShowSkillBars !== undefined) return Boolean(CONFIG.darkModeShowSkillBars);
    }
    return true;
  };

  const shouldShowHudStats = () => {
    if (isDarkModeActive()) {
      if (CONFIG.darkModeShowHudStats !== undefined) return Boolean(CONFIG.darkModeShowHudStats);
      if (CONFIG.darkModeShowStats !== undefined) return Boolean(CONFIG.darkModeShowStats);
    }
    return true;
  };

  // getSkillDataForFighter is imported from ./ui/hudSkillProviders.js

  const getAdditionalInfoForFighter = (f) => {
    const info = [];
    const baseDmg = parseFloat(Math.max(0, Number(f.damage) || 0).toFixed(1));
    const fType = (f.characterId || f.type || (f._def && f._def.type) || '').toLowerCase();

    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const isRikaAlive = typeof f.isRikaAliveInDomain === 'function' ? f.isRikaAliveInDomain() : (f.rika && f.rika.active && !f.rika.isDying);
      const baseDmg = CONFIG.yuta?.meleeDamage || CONFIG.yuta?.damage || 15;
      const baseRegen = CONFIG.yuta?.regenRate || 0.05;

      // 1. DMG Stat Line (Includes Pure Love Beam bonus damage stacks + Rika multiplier)
      const bonusBeamDmg = Math.round(f.pureLoveBeamBonusDamage || 0);
      const dmgMult = typeof f.getRikaDamageMultiplier === 'function' ? f.getRikaDamageMultiplier() : (isRikaAlive ? (CONFIG.yuta?.domainRikaDamageMultiplier || 1.50) : 1.0);
      const totalDmg = Math.round((baseDmg + bonusBeamDmg) * dmgMult);
      const boostDmg = totalDmg - baseDmg;
      if (boostDmg > 0) {
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }

      // 2. Parry Stat Line
      const isGuarding = (f.blockPoseTimer || 0) > 0;
      const baseParryRatio = CONFIG.yuta?.parryPassiveChance ?? 0.50;
      const baseParryVal = Math.round(baseParryRatio * 100);
      const parryStacks = f.parryStacks || 0;
      const stackBonus = Math.round(parryStacks * (CONFIG.yuta?.parryChancePerStack ?? 0.05) * 100);
      const guardBonus = isGuarding ? Math.max(0, Math.round(((CONFIG.yuta?.parryActiveChance ?? 0.50) - baseParryRatio) * 100)) : 0;
      const totalBonus = stackBonus + guardBonus;

      const isSummoningRika = typeof f.isSummoningRika === 'function' ? f.isSummoningRika() : ((f.rikaCallTimer || 0) > 0 || (f.rika && ((f.rika.chargeTimer || 0) > 0 || (f.rika.spawnTimer || 0) > 0)));

      if (isSummoningRika) {
        info.push(`<b>Parry:</b> 0% <span style="color: #ef4444; font-size: 10px;">(Summoning)</span>`);
      } else if (totalBonus > 0) {
        info.push(`<b>Parry:</b> ${baseParryVal}% + ${totalBonus}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Parry:</b> ${baseParryVal}%`);
      }

      // 3. Regen Stat Line
      if (f.caughtInPureLoveBeam || (f.pureLoveBeamTimer || 0) > 0) {
        info.push(`<b>Regen:</b> 0% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
      } else if (f.tojiRegenDebuffTimer > 0 || f.pureLoveBeamRegenDebuffTimer > 0) {
        const currentRegen = (f.domainActive || isRikaAlive) ? (CONFIG.yuta?.domainRctHealRate || 0.05) * (typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (CONFIG.yuta?.domainRikaRegenMultiplier || 1.10)) : baseRegen;
        const debuffMult = f.tojiRegenDebuffTimer > 0 ? (CONFIG.toji?.regenDebuffMultiplier ?? 0.40) : (CONFIG.yuta?.pureLoveBeamRegenDebuffMultiplier ?? 0.50);
        const debuffedRegen = currentRegen * debuffMult;
        info.push(`<b>Regen:</b> ${debuffedRegen.toFixed(2)}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
      } else if (f.domainActive || isRikaAlive) {
        const regenMult = typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (CONFIG.yuta?.domainRikaRegenMultiplier || 1.10);
        const domainRctHealRate = CONFIG.yuta?.domainRctHealRate || 0.05;
        const rctRate = domainRctHealRate * regenMult;
        const bonusRegen = rctRate - baseRegen;
        info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}% + ${bonusRegen.toFixed(2)}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}%`);
      }
    } else if (f.characterId === 'yuji' || f.type === 'yuji') {
      const punchBase = CONFIG.yuji?.punchDamage || 18;
      const hasDmgBoost = f.soulSwapActive || f.blackFlashTimer > 0;
      if (hasDmgBoost) {
        let currentDmg = punchBase;
        if (f.soulSwapActive) currentDmg = Math.round(currentDmg * (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5));
        if (f.blackFlashTimer > 0) currentDmg = Math.round(currentDmg * (CONFIG.yuji?.blackFlashMultiplier || 1.5));
        const boost = currentDmg - punchBase;
        info.push(`<b>DMG:</b> ${punchBase} + ${boost} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${punchBase}`);
      }
    } else if (f.characterId === 'mahito' || f.type === 'mahito') {
      const baseDmg = CONFIG.mahito?.damage || 16;
      const baseReach = CONFIG.mahito?.punchRange || 75;

      if (f.domainActive) {
        const addVal = CONFIG.mahito?.domainExpansion?.domainRangeBoost ?? 200;
        info.push(`<b>DMG:</b> ${baseDmg}`);
        info.push(`<b>DEF:</b> 10%`);
        info.push(`<b>ATK RANGE:</b> ${baseReach} + ${addVal} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
      } else if (f.isTransformed) {
        const mult = CONFIG.mahito?.transformation?.damageMultiplier || 1.60;
        const currentDmg = Math.round(baseDmg * mult);
        const boostDmg = currentDmg - baseDmg;
        const defVal = Math.round((1 - (CONFIG.mahito?.transformation?.defenseMultiplier ?? 0.50)) * 100);
        const transReach = Math.round(baseReach * 1.25);
        const addReach = transReach - baseReach;
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        info.push(`<b>DEF:</b> ${defVal}%`);
        info.push(`<b>ATK RANGE:</b> ${baseReach} + ${addReach} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
      } else {
        const defVal = Math.round((CONFIG.mahito?.soulDurabilityReduction ?? 0.25) * 100);
        info.push(`<b>DMG:</b> ${baseDmg}`);
        info.push(`<b>DEF:</b> ${defVal}%`);
        info.push(`<b>ATK RANGE:</b> ${baseReach}`);
      }
    } else if (f.characterId === 'todo' || f.type === 'todo') {
      // 1. ATK Speed
      const hasTakadaBoost = f.isTakadaUltActive;
      if (hasTakadaBoost) {
        info.push(`<b>ATK Speed:</b> +67% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>ATK Speed:</b> 0%`);
      }

      // 2. DEF (renamed from DMG REDUCTION)
      const baseRed = Math.round((CONFIG.todo?.baseDamageReduction ?? 0.05) * 100);
      let currentRed = baseRed;

      if (f.isTakadaChanneling) {
        currentRed = 50;
      } else if (hasTakadaBoost) {
        currentRed = Math.round((CONFIG.todo?.zoneDamageReduction || 0.35) * 100);
      } else if (f.rockCounterComboLeft > 0) {
        currentRed = Math.round((CONFIG.todo?.counterStanceDamageReduction || 0.40) * 100);
      } else if (f.justSwappedTimer > 0 || f.blackFlashGlowTimer > 0 || f.blackFlashTimer > 0) {
        currentRed = Math.round((CONFIG.todo?.zoneDamageReduction || 0.35) * 100);
      }

      if (currentRed > baseRed) {
        const boost = currentRed - baseRed;
        info.push(`<b>DEF:</b> ${baseRed}% + ${boost}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DEF:</b> ${baseRed}%`);
      }

      // 3. Evade
      if ((f.evadeBuffTimer || 0) > 0) {
        const evadeVal = Math.round((f.evadeChance ?? (CONFIG.todo?.evadeChance || 0.60)) * 100);
        info.push(`<b>Evade:</b> ${evadeVal}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Evade:</b> 0%`);
      }
    } else if (f.characterId === 'cj' || f.type === 'cj') {
      const cfg = CONFIG.cj || {};
      const baseDmg = cfg.meleePunchDamage || 24;

      // 1. Punch Damage (DMG)
      if (f.isGroveStreetOg) {
        const dmgBoost = cfg.respectDamageBoost || 0.15;
        const boostDmg = Math.round(baseDmg * dmgBoost);
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }

      // 2. Attack Speed (ATK SPD)
      if (f.isGroveStreetOg) {
        info.push(`<b>ATK SPD:</b> +25% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      }
    } else if (f.characterId === 'ichigo' || f.type === 'ichigo') {
      const isBankai = Boolean(f.bankaiActive || f.skin === 'bankai');
      const isMask = Boolean(f.hollowMaskActive);
      const baseDmg = CONFIG.ichigo?.swordDamage || 16;
      let dmgMult = 1.0;
      if (isBankai) dmgMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
      if (isMask) dmgMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
      const currentDmg = Math.round(baseDmg * dmgMult);
      const boostDmg = currentDmg - baseDmg;

      // 1. DMG: XX + XX
      if (boostDmg > 0) {
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }

      // 2. ATTK SPD: XX + XX
      if (isMask) {
        const cdMult = CONFIG.ichigo?.hollowSwordCooldownMultiplier || 0.65;
        const atkSpdBoost = Math.round(((1 / cdMult) - 1) * 100);
        info.push(`<b>ATTK SPD:</b> 0% + ${atkSpdBoost}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>ATTK SPD:</b> 0%`);
      }

      // 3. SPD: XX + XX
      const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
      const baseSpeed = (CONFIG.ichigo?.moveSpeed || 7.0) * modeMult;
      let spdMult = 1.0;
      if (isBankai) spdMult *= (CONFIG.ichigo?.bankaiSpeedMultiplier || 1.5);
      if (isMask) spdMult *= (CONFIG.ichigo?.hollowSpeedMultiplier || 1.4);
      const currentSpeed = baseSpeed * spdMult;
      const spdDiff = currentSpeed - baseSpeed;
      if (spdDiff > 0.01) {
        info.push(`<b>SPD:</b> ${baseSpeed.toFixed(1)} + ${spdDiff.toFixed(1)} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>SPD:</b> ${baseSpeed.toFixed(1)}`);
      }

      // 4. DEF: XX + XX
      const baseDef = 0;
      if (isMask) {
        const defBoost = Math.round((CONFIG.ichigo?.hollowDamageReduction ?? 0.10) * 100);
        info.push(`<b>DEF:</b> ${baseDef}% + ${defBoost}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DEF:</b> ${baseDef}%`);
      }

      // 5. PARRY: XX + XX
      const baseParry = Math.round((CONFIG.ichigo?.parryChance ?? 0.15) * 100);
      let currentParry = baseParry;
      if (isBankai && isMask) {
        currentParry = Math.round((CONFIG.ichigo?.bankaiHollowParryChance ?? 0.35) * 100);
      } else if (isMask) {
        currentParry = Math.round((CONFIG.ichigo?.hollowParryChance ?? 0.30) * 100);
      } else if (isBankai) {
        currentParry = Math.round((CONFIG.ichigo?.bankaiParryChance ?? 0.25) * 100);
      }
      if (f.blockPoseTimer > 0) {
        currentParry = Math.min(95, currentParry + 15);
      }

      const fIdx = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(f) : -1;
      const fTeam = (fIdx >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(fIdx) : null;
      const isInsideEnemyGojoDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some((g, gIdx) => {
        if (!g || g === f || g.hp <= 0 || !g.domainActive) return false;
        const isGojo = (g.characterId === 'gojo' || g.type === 'gojo' || g._def?.id === 'gojo');
        if (!isGojo) return false;
        if (fTeam !== null && typeof state.getFighterTeam === 'function') {
          const gTeam = state.getFighterTeam(gIdx);
          if (gTeam !== null && gTeam === fTeam) return false;
        }
        return true;
      });

      if (isInsideEnemyGojoDomain) {
        info.push(`<b>PARRY:</b> 0% <span style="color: #ef4444; font-size: 10px;">(Domain)</span>`);
      } else if (currentParry > baseParry) {
        const parryBoost = currentParry - baseParry;
        info.push(`<b>PARRY:</b> ${baseParry}% + ${parryBoost}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>PARRY:</b> ${baseParry}%`);
      }
    } else {
      const isTacticalChar = ['rifle', 'm4a1', 'shotgun', 'spas12', 'spas_12', 'pistol', 'desert_eagle', 'deserteagle', 'sniper', 'awp', 'barrett', 'barrett50cal'].includes(fType);
      if (!isTacticalChar) {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }
      
      if (f.characterId === 'gojo' || f.type === 'gojo') {
        if (f.isMeleeMode) {
          info.push(`<b>Infinity:</b> Off`);
        } else {
          info.push(`<b>Infinity:</b> Active`);
        }
      } else if (f.characterId === 'layla' || f.type === 'layla') {
        if (f.powerStacks > 0) {
          info.push(`<b>Power Stacks:</b> ${f.powerStacks}/${f.maxStacks || 10} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
        if (f.isInUltimate) {
          info.push(`<b>Ultimate:</b> Rapid Fire <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
        const baseChance = CONFIG.gunslinger?.critChance || 0.20;
        const baseMult = CONFIG.gunslinger?.critMultiplier || 1.8;
        const currentChance = f.critChance !== undefined ? f.critChance : baseChance;
        const currentMult = f.critMultiplier !== undefined ? f.critMultiplier : baseMult;
        
        const baseChanceVal = Math.round(baseChance * 100);
        const baseMultVal = Math.round(baseMult * 100);
        
        let critChanceStr = `${baseChanceVal}%`;
        if (currentChance > baseChance) {
          const boostChance = Math.round((currentChance - baseChance) * 100);
          critChanceStr = `${baseChanceVal}% + ${boostChance}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        } else if (currentChance < baseChance) {
          const debuffChance = Math.round((baseChance - currentChance) * 100);
          critChanceStr = `${baseChanceVal}% - ${debuffChance}% <span style="color: #ef4444; font-size: 10px;">▼</span>`;
        }
        
        let critMultStr = `${baseMultVal}%`;
        if (currentMult > baseMult) {
          const boostMult = Math.round((currentMult - baseMult) * 100);
          critMultStr = `${baseMultVal}% + ${boostMult}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        } else if (currentMult < baseMult) {
          const debuffMult = Math.round((baseMult - currentMult) * 100);
          critMultStr = `${baseMultVal}% - ${debuffMult}% <span style="color: #ef4444; font-size: 10px;">▼</span>`;
        }
        
        info.push(`<b>Crit Rate:</b> ${critChanceStr}`);
        info.push(`<b>Crit DMG:</b> ${critMultStr}`);
      } else if (f.characterId === 'sukuna' || f.type === 'sukuna') {
        const baseChance = CONFIG.sukuna?.baseCritChance || 0.10;
        const baseMult = CONFIG.sukuna?.baseCritMultiplier || 1.50;
        const currentChance = f.critChance !== undefined ? f.critChance : baseChance;
        const currentMult = f.critMultiplier !== undefined ? f.critMultiplier : baseMult;

        const baseChanceVal = Math.round(baseChance * 100);
        const baseMultVal = Math.round(baseMult * 100);

        let critChanceStr = `${baseChanceVal}%`;
        if (currentChance > baseChance) {
          const boostChance = Math.round((currentChance - baseChance) * 100);
          critChanceStr = `${baseChanceVal}% + ${boostChance}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        }

        let critMultStr = `${baseMultVal}%`;
        if (currentMult > baseMult) {
          const boostMult = Math.round((currentMult - baseMult) * 100);
          critMultStr = `${baseMultVal}% + ${boostMult}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        }

        info.push(`<b>Crit Rate:</b> ${critChanceStr}`);
        info.push(`<b>Crit DMG:</b> ${critMultStr}`);
      } else if (f.characterId === 'nanami' || f.type === 'nanami') {
        const isOvertime = Boolean(f.isOvertimeActive);
        const isGuaranteedCrit = isOvertime && ((f.overtimeGuaranteedCritTimer || 0) <= 0);

        const baseCritRate = Math.round((CONFIG.nanami?.ratioBaseCritChance || 0.30) * 100);
        const currentCritRate = isGuaranteedCrit ? 100 : (isOvertime ? Math.round((CONFIG.nanami?.overtimeBaseCritChance || 0.45) * 100) : baseCritRate);

        let critRateStr = `${baseCritRate}%`;
        if (isGuaranteedCrit) {
          critRateStr = `100% <span style="color: #D4AF37; font-size: 10px; font-weight: bold;">(GUARANTEED) ▲</span>`;
        } else if (isOvertime) {
          const boost = currentCritRate - baseCritRate;
          critRateStr = `${baseCritRate}% + ${boost}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        }

        const baseCritMult = Math.round((CONFIG.nanami?.ratioCritMultiplier || 2.0) * 100);
        const overtimeCritMult = Math.round((CONFIG.nanami?.overtimeRatioCritMultiplier || 1.80) * 100);

        let critDmgStr = `${baseCritMult}% (True DMG)`;
        if (isOvertime) {
          critDmgStr = `${overtimeCritMult}% (True DMG)`;
        }

        info.push(`<b>Crit Rate:</b> ${critRateStr}`);
        info.push(`<b>Crit DMG:</b> ${critDmgStr}`);
      } else if (f.characterId === 'toji' || f.type === 'toji') {
        const baseSpeed = (f.baseSpeed || 5.0) * (MODE_SPEED_MULTIPLIER[state.mode] || 1);
        const currentSpeed = f.speed !== undefined ? f.speed : baseSpeed;
        const speedDiff = currentSpeed - baseSpeed;
        if (speedDiff > 0.01) {
          info.push(`<b>SPD:</b> ${baseSpeed.toFixed(1)} + ${speedDiff.toFixed(1)} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else if (speedDiff < -0.01) {
          info.push(`<b>SPD:</b> ${baseSpeed.toFixed(1)} - ${Math.abs(speedDiff).toFixed(1)} <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else {
          info.push(`<b>SPD:</b> ${baseSpeed.toFixed(1)}`);
        }
        const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(f)) : null;
        const isEnemyDomain = state.fighters && state.fighters.some((enemy, idx) => {
          if (!enemy || enemy === f || enemy.hp <= 0) return false;
          const isDomainRunning = enemy.domainActive || enemy._mahitoDomainActive || enemy.isChannelingDomainExpansion || enemy.isChannelingDomain;
          if (!isDomainRunning) return false;
          const enemyTeam = state.getFighterTeam(idx);
          return myTeam === null || enemyTeam === null || myTeam !== enemyTeam;
        });
        const currentDodgeRate = isEnemyDomain 
          ? Math.round((CONFIG.toji?.domainDodgeChance ?? 1.0) * 100)
          : Math.round((CONFIG.toji?.stealthDodgeChance ?? 0.25) * 100);
        info.push(`<b>Dodge:</b> ${currentDodgeRate}%${isEnemyDomain ? ' <span style="color: #c084fc; font-size: 10px;">(DOMAIN)</span>' : ''}`);
      } else if (f.characterId === 'cronos' || f.type === 'cronos') {
        const baseSpeed = (f.baseSpeed || 5.0) * (MODE_SPEED_MULTIPLIER[state.mode] || 1);
        const currentSpeed = f.speed !== undefined ? f.speed : baseSpeed;
        info.push(`<b>Speed:</b> ${currentSpeed.toFixed(1)}`);
      } else if (f.characterId === 'musashi' || f.type === 'musashi') {
        const stanceName = f.currentStance === 1 ? 'ICHI NO TACHI' : f.currentStance === 2 ? 'NI NO TACHI' : 'SAN NO TACHI';
        info.push(`<b>Stance:</b> ${stanceName}`);
      } else if (f.characterId === 'saitama' || f.type === 'saitama') {
        const dodgeRate = Math.round((f.dodgeChance !== undefined ? f.dodgeChance : (CONFIG.saitama?.dodgeChance ?? 0.95)) * 100);
        info.push(`<b>DODGE:</b> ${dodgeRate}%`);
      } else if (f.characterId === 'genos' || f.type === 'genos') {
        const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
        const baseSpd = (f.baseSpeed || CONFIG.genos?.moveSpeed || 5.2) * modeMult;
        const speedMult = CONFIG.genos?.dashes?.meleeThrusterDash?.speedMultiplier ?? 2.4;
        
        if (f.speedBoostTimer > 0) {
          const boostVal = (baseSpd * (speedMult - 1)).toFixed(1);
          info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)} + ${boostVal} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)}`);
        }

        const maxDashes = CONFIG.genos?.maxMeleeDashes || 10;
        if (f.isMeleeStance) {
          const remainingDashes = Math.max(0, maxDashes - (f.meleeDashCount || 0));
          info.push(`<b>Dash:</b> ${remainingDashes}/${maxDashes}`);
        } else {
          info.push(`<b>Dash:</b> ${maxDashes}`);
        }

        // DEF (Damage Reduction): Increased during Core Overdrive Self-Destruct charging
        const isSelfDestructing = Boolean(f.isSelfDestructing);
        const baseDef = 0;
        const sdDef = Math.round((CONFIG.genos?.selfDestructDamageReduction ?? 0.75) * 100);
        if (isSelfDestructing) {
          info.push(`<b>DEF:</b> ${baseDef}% + ${sdDef}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>DEF:</b> ${baseDef}%`);
        }
      } else if (f.characterId === 'zeus' || f.type === 'zeus') {
        if ((f.aegisTimer || 0) > 0) {
          info.push(`<b>Aegis:</b> ACTIVE <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'john_wick' || f.type === 'john_wick') {
        const isExcommunicado = (f.currentEquippedWeapon === 'rifle');
        const baseDef = CONFIG.john_wick?.ballisticSuitDamageReduction || 0.40;
        const defMult = isExcommunicado ? (CONFIG.john_wick?.excommunicadoDefMultiplier || 1.50) : 1.0;
        const finalDef = Math.round(Math.min(0.85, baseDef * defMult) * 100);
        info.push(`<b>DEF:</b> ${finalDef}%${isExcommunicado ? ' <span style="color: #15803d; font-size: 10px;">▲</span>' : ''}`);

        const baseEvadeActive = (f.isEvadeAlwaysActive !== undefined) 
          ? Boolean(f.isEvadeAlwaysActive) 
          : Boolean(CONFIG.john_wick?.evadeAlwaysActive || f.isRolling || ((f.evadeBuffTimer || 0) > 0));
        const isEvading = Boolean(isExcommunicado || baseEvadeActive);

        if (isEvading) {
          const defaultEvade = (f.evadeChance !== undefined) ? f.evadeChance : (CONFIG.john_wick?.evadeChance ?? 1.0);
          const evadeVal = Math.round((isExcommunicado ? (CONFIG.john_wick?.excommunicadoEvadeChance ?? 1.0) : defaultEvade) * 100);
          info.push(`<b>Evade:</b> ${evadeVal}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Evade:</b> 0%`);
        }

        if (isExcommunicado) {
          const spdBonus = Math.round(((CONFIG.john_wick?.excommunicadoSpeedMultiplier || 1.40) - 1.0) * 100);
          info.push(`<b>SPD:</b> +${spdBonus}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'dummy' || f.type === 'dummy') {
        info.push(`<b>Stun Chance:</b> ${Math.round((CONFIG.dummy?.stunChance || 0.15) * 100)}%`);
        const stunDir = f.stunDirection === 'left' ? 'LEFT' : f.stunDirection === 'right' ? 'RIGHT' : f.stunDirection === 'up' ? 'UP' : 'NONE';
        info.push(`<b>Stun Dir:</b> ${stunDir}`);
      } else if (f.characterId === 'mahoraga' || f.type === 'mahoraga') {
        const totalGoldStages = (f.goldAdaptationStage?.melee || 0) + 
                                (f.goldAdaptationStage?.ranged || 0) + 
                                (f.goldAdaptationStage?.skill || 0);
        const parryPerStage = CONFIG.mahoraga?.parryChancePerStage || 0.08;
        const baseParry = Math.round((CONFIG.mahoraga?.baseParryChance || 0) * 100);
        const bonusParry = Math.round(totalGoldStages * parryPerStage * 100);

        if (bonusParry > 0) {
          info.push(`<b>Parry:</b> ${baseParry}% + ${bonusParry}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Parry:</b> ${baseParry}%`);
        }

        const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
        const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage || 0.03;
        const currentRegenRate = totalStages * rctPerStage;
        const currentRegenPerSec = Math.round(currentRegenRate * 60);

        if (f.caughtInPureLoveBeam || (f.pureLoveBeamTimer || 0) > 0) {
          info.push(`<b>Regen:</b> 0% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.tojiRegenDebuffTimer > 0 || f.pureLoveBeamRegenDebuffTimer > 0) {
          const debuffMult = f.tojiRegenDebuffTimer > 0 ? (CONFIG.toji?.regenDebuffMultiplier ?? 0.40) : (CONFIG.yuta?.pureLoveBeamRegenDebuffMultiplier ?? 0.50);
          const debuffedRegenPerSec = Math.round(currentRegenPerSec * debuffMult);
          info.push(`<b>Regen:</b> +${debuffedRegenPerSec}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (totalStages > 0) {
          info.push(`<b>Regen:</b> +${currentRegenPerSec}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> 0%`);
        }

        // DEF (Damage Reduction) stat
        const defBuffPerStage = CONFIG.mahoraga?.defBuffPerClickPercent || 0.01;
        const maxDefBuff = CONFIG.mahoraga?.maxDefBuffPercent || 0.50;
        const defReduction = Math.min(maxDefBuff, totalStages * defBuffPerStage);
        const defPercent = Math.round(defReduction * 100);
        if (defPercent > 0) {
          info.push(`<b>DEF:</b> +${defPercent}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>DEF:</b> 0%`);
        }

        // CC (Stun/Paralyze/Slow Resistance) stat
        const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.075;
        const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.60;
        const ccTenacity = Math.min(maxCcTenacity, totalStages * ccTenacityMult);
        const tenacityPercent = Math.round(ccTenacity * 100);
        if (tenacityPercent > 0) {
          info.push(`<b>CC:</b> +${tenacityPercent}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>CC:</b> 0%`);
        }

        const adaptedSet = new Set();
        if (f.adaptedSkills) {
          Object.keys(f.adaptedSkills).forEach(k => { if (f.adaptedSkills[k]) adaptedSet.add(k); });
        }
        if (f.gojoAdapted) {
          if (f.gojoAdapted.purple) adaptedSet.add('purple');
          if (f.gojoAdapted.red) adaptedSet.add('red');
          if (f.gojoAdapted.blue) adaptedSet.add('blue');
        }
        if (f.gojoInfinityImmune) adaptedSet.add('infinity');
        if (f.sukunaAdapted) {
          if (f.sukunaAdapted.divineFlame) adaptedSet.add('divineFlame');
        }
        if (f.adapted) {
          if (f.adapted.melee) adaptedSet.add('melee');
          if (f.adapted.ranged) adaptedSet.add('ranged');
          if (f.adapted.skill && adaptedSet.size === 0) adaptedSet.add('skill');
        }
        const adaptedCount = adaptedSet.size;

        if (adaptedCount > 0) {
          info.push(`<b>Skills Adapted:</b> ${adaptedCount} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Skills Adapted:</b> ${adaptedCount}`);
        }
      } else if (f.characterId === 'berserker' || f.type === 'berserker') {
        const rage = Math.round((f.rage || 0) * 100);
        const rageMax = Math.round((f.maxRage || 1) * 100);
        info.push(`<b>Rage:</b> ${rage}/${rageMax}`);
        if (f.isEnraged) {
          info.push(`<b>ENRAGED:</b> Active <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppleganger' || f.type === 'doppelganger') {
        const liveCount = state.illusions ? state.illusions.filter(ill => ill && ill.isDoppelganger && ill.hp > 0).length : 0;
        info.push(`<b>Illusions:</b> ${liveCount}`);
      } else if (f.characterId === 'cj' || f.type === 'cj') {
        const cfg = CONFIG.cj || {};
        const isTier1 = (f.respect || 0) >= 50;
        const isOg = Boolean(f.isGroveStreetOg);

        // 1. DMG: Base / Heavy punch (+15% during OG Surge)
        const basePunch = cfg.meleePunchDamage || 24;
        const heavyPunch = Math.round(basePunch * 1.25);
        if (isOg) {
          const dmgBoost = cfg.respectDamageBoost || 0.15;
          const ogBase = Math.round(basePunch * (1 + dmgBoost));
          const ogHeavy = Math.round(heavyPunch * (1 + dmgBoost));
          info.push(`<b>DMG:</b> ${ogBase} / ${ogHeavy} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>DMG:</b> ${basePunch} / ${heavyPunch}`);
        }

        // 2. SPD: +15% (Tier 1) / +20% (OG)
        if (isOg) {
          const spdBoost = Math.round(((cfg.respectSpeedBoost || 0.15) + 0.05) * 100);
          info.push(`<b>SPD:</b> +${spdBoost}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else if (isTier1) {
          const spdBoost = Math.round((cfg.respectSpeedBoost || 0.15) * 100);
          info.push(`<b>SPD:</b> +${spdBoost}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>SPD:</b> 0%`);
        }

        // 3. DEF: Kevlar Shield + 10% OG Resistance
        const shieldVal = f.hesoyamShield || 0;
        if (shieldVal > 0 && isOg) {
          const defPercent = Math.round((cfg.respectDefenseBoost || 0.10) * 100);
          info.push(`<b>DEF:</b> +${shieldVal} | +${defPercent}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else if (shieldVal > 0) {
          info.push(`<b>DEF:</b> +${shieldVal} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else if (isOg) {
          const defPercent = Math.round((cfg.respectDefenseBoost || 0.10) * 100);
          info.push(`<b>DEF:</b> +${defPercent}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>DEF:</b> 0%`);
        }

        // 4. KB: Base Knockback (Tier 1 +15% Boost)
        const baseKb = cfg.meleeKnockback || 18.0;
        const heavyKb = Math.round(baseKb * 1.22);
        if (isTier1 || isOg) {
          const kbBoost = cfg.respectSpeedBoost || 0.15;
          const t1Base = Math.round(baseKb * (1 + kbBoost));
          const t1Heavy = Math.round(heavyKb * (1 + kbBoost));
          info.push(`<b>KB:</b> ${t1Base} / ${t1Heavy} <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>KB:</b> ${Math.round(baseKb)} / ${heavyKb}`);
        }

        // 5. ATK SPD: +25% (OG)
        if (isOg) {
          const atkSpdBoost = Math.round((cfg.respectAttackSpeedBoost || 0.25) * 100);
          info.push(`<b>ATK SPD:</b> +${atkSpdBoost}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>ATK SPD:</b> 0%`);
        }
      }
    }

    // Evade stat display for any teammate teamed up with Todo (in 1v2 Stand-Off, 2v2, etc.)
    const isTeamedWithTodo = (f.characterId !== 'todo' && f.type !== 'todo') && (
      state && state.fighters && state.fighters.some((other, idx) => {
        if (!other || other === f) return false;
        if (other.characterId !== 'todo' && other.type !== 'todo') return false;
        const fIdx = state.fighters.indexOf(f);
        const fTeam = (state.getFighterTeam && fIdx >= 0) ? state.getFighterTeam(fIdx) : f.team;
        const otherTeam = (state.getFighterTeam && idx >= 0) ? state.getFighterTeam(idx) : other.team;
        return fTeam !== null && fTeam !== undefined && fTeam === otherTeam;
      })
    );

    if (isTeamedWithTodo) {
      if ((f.evadeBuffTimer || 0) > 0) {
        const evadeRate = Math.round(((f.evadeChance !== undefined ? f.evadeChance : (CONFIG.todo?.evadeChance || 0.60))) * 100);
        info.push(`<b>Evade:</b> ${evadeRate}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Evade:</b> 0%`);
      }
    }

    // Tactical Force Operatives stats info
    if (['rifle', 'm4a1', 'shotgun', 'spas12', 'spas_12', 'pistol', 'desert_eagle', 'deserteagle', 'sniper', 'awp', 'barrett', 'barrett50cal'].includes(fType)) {
      const dmg = f.damage || (f._def && f._def.damage) || 20;
      info.push(`<b>DMG:</b> ${dmg}`);
      const spd = (f.speed || (f._def && f._def.moveSpeed) || 5.0).toFixed(1);
      info.push(`<b>SPD:</b> ${spd}`);
      let caliber = 'TACTICAL';
      if (fType.includes('rifle') || fType.includes('m4a1')) caliber = '5.56 NATO';
      else if (fType.includes('shotgun') || fType.includes('spas')) caliber = '12-GAUGE';
      else if (fType.includes('pistol') || fType.includes('desert') || fType.includes('eagle')) caliber = '.50 AE';
      else if (fType.includes('sniper') || fType.includes('awp')) caliber = '.338 LAPUA';
      else if (fType.includes('barrett')) caliber = '.50 BMG';
      info.push(`<b>CALIBER:</b> ${caliber}`);
    }

    // Tick Damage
    if (f.tickDamageTimer > 0 && f.tickDamage > 0) {
      info.push(`<b>Tick DMG:</b> ${f.tickDamage}/tick <span style="color: #ef4444; font-size: 10px;">▼</span>`);
    }

    return info;
  };

  const formatSkillLabel = (label, isTac = false) => {
    if (!label) return '';
    if (isTac) {
      return String(label);
    }
    if (String(label).includes('<')) {
      return String(label).replace(/(<[^>]+>)|(\d+%|\d+)/g, (match, tag, num) => {
        if (tag) return tag;
        return `<span class="hud-num">${num}</span>`;
      });
    }
    return String(label).replace(/(\d+%|\d+)/g, '<span class="hud-num">$1</span>');
  };

  const getCjStarLevel = (fighter) => {
    if (!fighter || !state.fighters) return 0;
    
    // Find all opposing enemy fighters
    const myIndex = state.fighters.indexOf(fighter);
    const myTeam = (typeof state.getFighterTeam === 'function' && myIndex >= 0) ? state.getFighterTeam(myIndex) : null;
    
    let totalOppMaxHp = 0;
    let totalOppCurrentHp = 0;
    let allOpponentsDead = true;

    for (let i = 0; i < state.fighters.length; i++) {
      const other = state.fighters[i];
      if (!other || other === fighter || other.isTurret) continue;
      
      // If team mode, exclude teammates
      if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(i) === myTeam) {
        continue;
      }

      const oppMax = other._originalMaxHp || other.maxHp || 440;
      const oppHp = Math.max(0, (typeof other.getDisplayHp === 'function') ? other.getDisplayHp() : (other.hp || 0));
      
      totalOppMaxHp += oppMax;
      totalOppCurrentHp += oppHp;

      if (oppHp > 0 && !other.dead) {
        allOpponentsDead = false;
      }
    }

    if (totalOppMaxHp <= 0) return 0;
    if (allOpponentsDead || totalOppCurrentHp <= 0) return 6; // Enemy completely drained all HP / died -> Full 6 stars!

    // Drained ratio: 0.0 (enemy full HP) -> 1.0 (enemy 0 HP)
    const drainedRatio = Math.max(0, Math.min(1.0, 1.0 - (totalOppCurrentHp / totalOppMaxHp)));

    // Progressive 6-star distribution: 1 star per ~16.67% of enemy HP drained
    const stars = Math.min(6, Math.max(0, Math.floor(drainedRatio * 6)));
    return stars;
  };

  const generateCjStarsSVGs = (filledStars = 0) => {
    let html = '';
    const safeStars = Math.min(6, Math.max(0, filledStars));
    for (let i = 0; i < 6; i++) {
      // In GTA: San Andreas, wanted stars fill from right to left (☆☆☆★★★)
      const isFilled = i >= (6 - safeStars);
      const starFill = isFilled ? '#EAB308' : '#141417';
      const starClass = isFilled ? 'hud-cj-star filled' : 'hud-cj-star empty';
      html += `
        <span class="${starClass}">
          <svg viewBox="0 0 24 24">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" 
              fill="${starFill}" 
              stroke="#000000" 
              stroke-width="2" 
              stroke-linejoin="miter" />
          </svg>
        </span>
      `;
    }
    return html;
  };

  const generateCjStarsHTML = (fighter, align = 'left') => {
    const starCount = getCjStarLevel(fighter);
    const justify = align === 'right' ? 'flex-end' : 'flex-start';
    return `
      <div class="hud-cj-stars" data-cj-stars="true" style="display: flex; align-items: center; justify-content: ${justify}; gap: 3px;">
        ${generateCjStarsSVGs(starCount)}
      </div>
    `;
  };

  const getCjMoneyText = (fighter) => {
    if (!fighter) return '$00000350';
    if (fighter.money === undefined) fighter.money = 350;
    return '$' + String(Math.max(0, Math.round(fighter.money))).padStart(8, '0');
  };

  const updateAndGetCjMoneyText = (fighter) => {
    if (!fighter) return '$00000350';
    if (fighter.money === undefined) fighter.money = 350;
    if (fighter._currentMoneyVal === undefined) fighter._currentMoneyVal = fighter.money;

    // Check if money changed to trigger a roll
    if (fighter._lastTargetMoney === undefined) {
      fighter._lastTargetMoney = fighter.money;
    } else if (fighter.money !== fighter._lastTargetMoney) {
      fighter._moneyRollStart = fighter._currentMoneyVal;
      fighter._moneyRollTarget = fighter.money;
      fighter._moneyRollingTimer = 75; // 75 frames (~1.25s)
      fighter._moneyRollMaxTimer = 75;
      fighter._lastTargetMoney = fighter.money;
    }

    if (fighter._moneyRollingTimer && fighter._moneyRollingTimer > 0) {
      fighter._moneyRollingTimer--;
      const progress = 1 - (fighter._moneyRollingTimer / fighter._moneyRollMaxTimer);
      const currentBase = Math.round(fighter._moneyRollStart + (fighter._moneyRollTarget - fighter._moneyRollStart) * progress);
      fighter._currentMoneyVal = currentBase;

      const targetStr = String(Math.max(0, fighter._moneyRollTarget)).padStart(8, '0');
      let displayStr = '$';
      for (let i = 0; i < 8; i++) {
        // Digits settle progressively from left to right as progress increases
        const settleProgress = 0.25 + (i / 8) * 0.70;
        if (progress < settleProgress && fighter._moneyRollingTimer > 0) {
          // Active rolling digit: random 0-9
          displayStr += Math.floor(Math.random() * 10);
        } else {
          displayStr += targetStr[i];
        }
      }
      return displayStr;
    }

    fighter._currentMoneyVal = fighter.money;
    return '$' + String(Math.max(0, Math.round(fighter.money))).padStart(8, '0');
  };

  const generateCjMoneyHTML = (fighter, align = 'left') => {
    const moneyText = getCjMoneyText(fighter);
    const justify = align === 'right' ? 'flex-end' : 'flex-start';
    return `
      <div class="hud-cj-money" style="display: flex; align-items: center; justify-content: ${justify}; width: 100%;">
        <span class="hud-cj-money-text">${moneyText}</span>
      </div>
    `;
  };

  const getMatchTimeString = () => {
    const frames = (typeof state !== 'undefined' && state.matchTimer) ? state.matchTimer : 0;
    const totalSec = Math.floor(frames / 60);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getCjActiveWeaponData = (f) => {
    if (!f) {
      return {
        icon: 'Assets/references/knuckle-icon.png',
        ammo: '',
        name: 'Brass Knuckles'
      };
    }

    // 1. Minigun (BAGUVIX God Mode)
    if (f.isBaguvixActive || f.isGodModeActive || (f.minigunHeat && f.minigunHeat > 0)) {
      return {
        icon: 'Assets/references/minigun-icon.png',
        ammo: '∞',
        name: 'M134 Minigun'
      };
    }

    // 2. Dual Micro-Uzis (Rocketman Jetpack flight / Drive-By / Ranged)
    if (f.isJetpackActive || f.isDriveByActive || (f.magazineBullets !== undefined && f.magazineBullets > 0)) {
      return {
        icon: 'Assets/references/uzi-icon.png',
        ammo: '∞',
        name: 'Micro-Uzi'
      };
    }

    // 3. Fists / Brass Knuckles (Default Melee)
    return {
      icon: 'Assets/references/knuckle-icon.png',
      ammo: '',
      name: 'Brass Knuckles'
    };
  };

  const generateCjGtaHudWidgetHTML = (targetFighter, titleAlign = 'left', metaValue = '', shakeStyle = '') => {
    const wp = getCjActiveWeaponData(targetFighter);
    const clockText = getMatchTimeString();
    
    const curHp = (typeof targetFighter.getDisplayHp === 'function') ? targetFighter.getDisplayHp() : targetFighter.hp;
    const maxHp = targetFighter._originalMaxHp || targetFighter.maxHp || 440;
    const hpRatio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
    const hpPercent = Math.min(100, Math.max(0, Math.round(hpRatio * 100)));

    const staminaVal = (targetFighter.stamina !== undefined) ? targetFighter.stamina : 100;
    const maxStamina = targetFighter.maxStamina || 100;
    const staminaRatio = maxStamina > 0 ? Math.min(1.0, Math.max(0, staminaVal / maxStamina)) : 1.0;
    const staminaPercent = Math.min(100, Math.max(0, Math.round(staminaRatio * 100)));

    const moneyText = getCjMoneyText(targetFighter);
    const starCount = getCjStarLevel(targetFighter);
    const isRight = (titleAlign === 'right');
    const alignSelf = isRight ? 'margin-left: auto;' : 'margin-right: auto;';

    return `
      <div class="hud-cj-gta-widget" style="${alignSelf} ${shakeStyle}">
        <!-- Top Row: Weapon Box on Left, Clock + Armor/Health on Right (Authentic GTA PS2 Layout) -->
        <div class="hud-cj-top-row">
          <!-- 1. Weapon Icon Frame -->
          <div class="hud-cj-weapon-box">
            <img class="hud-cj-weapon-icon" src="${wp.icon}" alt="${wp.name}" />
            <span class="hud-cj-weapon-ammo">${wp.ammo}</span>
          </div>

          <!-- 2. Clock + Armor/Health Bars Stack -->
          <div class="hud-cj-bars-column">
            <!-- Match Clock (MM:SS) -->
            <div class="hud-cj-clock-row">
              <span class="hud-cj-clock-text">${clockText}</span>
            </div>

            <!-- White Stamina / Sprint Bar (GTA Fatigue & Movement Speed Mechanic) -->
            <div class="hud-cj-armor-bar">
              <div class="hud-cj-armor-fill" style="width: ${staminaPercent}%; background: ${targetFighter.isExhausted ? '#94A3B8' : '#FFFFFF'};"></div>
            </div>

            <!-- Red Health Bar (HP) -->
            <div class="health-card__bar hud-bar-cj">
              <div class="health-card__fill" style="width: ${hpPercent}%; background: #DC2626;"></div>
              <span class="health-card__bar-text" style="display: none;">${metaValue}</span>
            </div>
          </div>
        </div>

        <!-- Middle: GTA Cash Money ($00000000) -->
        <div class="hud-cj-money-row">
          <span class="hud-cj-money-text">${moneyText}</span>
        </div>

        <!-- Bottom of Widget: 6 Wanted Stars (Filling Right to Left) -->
        <div class="hud-cj-stars" data-cj-stars="true">
          ${generateCjStarsSVGs(starCount)}
        </div>
      </div>
    `;
  };

  const generateCjGtaStackHTML = (fighter, align = 'left') => {
    return generateCjGtaHudWidgetHTML(fighter, align);
  };

  const generateFighterSkillsHTML = (f, align, singleColumn = false) => {
    const isTac = isTacticalFighter(f) || isTacticalMatch(state);
    if (isTac) return ''; // Simple HUD mode: Only Name & Healthbar

    const allSkills = getSkillDataForFighter(f);
    if (!allSkills || allSkills.length === 0) return '';

    // Filter skills based on Dark Mode settings & fighter-specific exceptions (e.g. Ichigo Bankai, Toji Ultimate)
    const skills = allSkills.filter(s => shouldShowFighterSkill(f, s));
    if (!skills || skills.length === 0) return '';

    const isCj = f && (f.characterId === 'cj' || f.type === 'cj');
    const cjSkillClass = isCj ? ' hud-skill-box-cj' : '';

    return skills.map((s, index) => {
      const plainTextLen = s.label ? s.label.replace(/<[^>]*>/g, '').length : 0;
      
      // Automatic Grid Span Detection:
      // In 1-column mode, all skills span 1 full width column.
      // In 2-column mode: long names (> 14 chars), single skills, or odd skills span 2 columns.
      const isLastOddSkill = (skills.length % 2 === 1 && index === skills.length - 1);
      const isLongName = plainTextLen > 14;
      const isSpan2 = isTac || singleColumn || skills.length === 1 || isLongName || isLastOddSkill || s.fullWidth;

      let fontSz = 14.5;
      if (isTac) {
        fontSz = 11.0;
      } else if (singleColumn) {
        if (plainTextLen > 36) fontSz = 12.5;
        else if (plainTextLen > 28) fontSz = 13.5;
        else if (plainTextLen > 22) fontSz = 14.2;
        else fontSz = 14.8;
      } else if (isSpan2) {
        if (plainTextLen > 36) fontSz = 12.0;
        else if (plainTextLen > 28) fontSz = 13.0;
        else if (plainTextLen > 22) fontSz = 14.0;
        else fontSz = 15.0;
      } else {
        // Half-width column
        if (plainTextLen > 12) fontSz = 12.5;
        else if (plainTextLen > 9) fontSz = 13.5;
        else fontSz = 14.5;
      }

      const textStyle = isTac
        ? `font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, monospace, sans-serif; font-size: 11px; font-weight: 800; text-align: center; width: 100%; letter-spacing: 0.5px; text-transform: uppercase;`
        : `font-size: ${fontSz}px; text-align: ${align}; white-space: nowrap;`;
      const formattedLabel = formatSkillLabel(s.label, isTac);
      const spanClass = isSpan2 ? ' span-2' : '';

      if (s.noFill) {
        const parentColor = s.color ? `color: ${s.color};` : '';
        return `
          <div class="hud-skill-box align-${align} label-only${spanClass}${cjSkillClass}" data-skill-id="${s.id}" style="${parentColor} justify-content: ${align === 'right' ? 'flex-end' : 'flex-start'};">
            <div class="hud-skill-box-fill" style="display: none;"></div>
            <div class="hud-skill-box-text" style="${textStyle}">${formattedLabel}</div>
          </div>
        `;
      }
      const boxStyle = `--skill-glow-color: ${s.color};`;
      const fillStyle = `width: ${Math.round(s.pct)}%; background: ${s.color};`;
      return `
        <div class="hud-skill-box align-${align}${s.ready ? ' hud-skill-ready' : ''}${spanClass}${cjSkillClass}" data-skill-id="${s.id}" style="${boxStyle}">
          <div class="hud-skill-box-fill" style="${fillStyle}"></div>
          <div class="hud-skill-box-text" style="${textStyle}">${formattedLabel}</div>
        </div>
      `;
    }).join('');
  };

  const generateFighterInfoHTML = (f, singleColumn = false, isTeam = false) => {
    if (!shouldShowHudStats()) return '';
    if (!f) return '';
    const isTacFighter = isTacticalFighter(f) || isTacticalMatch(state);
    if (isTacFighter) return ''; // Simple HUD mode: Only Name & Healthbar

    let info = getAdditionalInfoForFighter(f);
    const isDummy = f.characterId === 'dummy' || f.type === 'dummy';
    if (CONFIG.hudShowFighterDescription && !isDummy) {
      info = info.filter(line => line.includes('<b>DMG:</b>') || line.includes('<b>Tick DMG:</b>') || line.includes('<b>Stun Chance:</b>') || line.includes('<b>Illusions:</b>') || line.includes('<b>DODGE:</b>') || line.includes('<b>Dodge:</b>') || line.includes('<b>Dodge Chance:</b>') || line.includes('<b>DEF:</b>') || line.includes('<b>ATK RANGE:</b>') || line.includes('<b>CC:</b>') || line.includes('<b>Parry:</b>') || line.includes('<b>PARRY:</b>') || line.includes('<b>ATTK SPD:</b>') || line.includes('<b>ATK SPD:</b>') || line.includes('<b>SPD:</b>') || line.includes('<b>Speed:</b>') || line.includes('<b>Regen:</b>'));
    }
    if (info.length === 0) return '';
    
    if (!f._prevHudValues) {
      f._prevHudValues = {};
      f._hudGlowTimers = {};
    }

    const getLabelBoostArrow = (labelText, valStr, fighter) => {
      return '';
    };
    
    // Pre-scan: if any stat line is too long for a 2-column grid in team cards,
    // force all lines to single-column (span-2) to prevent text overflow
    let forceAllSpan2 = false;
    if (isTeam && !singleColumn) {
      for (const ln of info) {
        const pt = ln.replace(/<[^>]*>/g, '').trim();
        if (pt.length > 20) {
          forceAllSpan2 = true;
          break;
        }
      }
    }

    const linesHTML = info.map(line => {
      let labelText = '';
      const labelStart = line.indexOf('<b>');
      const labelEnd = line.indexOf('</b>');
      if (labelStart !== -1 && labelEnd !== -1) {
        labelText = line.substring(labelStart + 3, labelEnd).replace(':', '').trim();
      }
      
      const splitIdx = line.indexOf('</b>');
      const label = splitIdx !== -1 ? line.substring(0, splitIdx + 4) : '';
      const val = splitIdx !== -1 ? line.substring(splitIdx + 4) : line;
      
      const textOnlyVal = val.replace(/<[^>]*>/g, '').trim();
      
      const arrowHtml = getLabelBoostArrow(labelText, textOnlyVal, f);
      const displayVal = val + arrowHtml;
      
      const baseValSize = (CONFIG.hudInfoFontSize || 14.5) * 0.95;
      let valFontSize = baseValSize;
      const textOnly = textOnlyVal;
      if (textOnly.length > 14) {
        valFontSize = Math.max(baseValSize * 0.85, baseValSize - (textOnly.length - 14) * 0.35);
      }

      const plainLen = (labelText + ' ' + textOnlyVal).length;
      const isSpan2 = singleColumn || forceAllSpan2 || info.length === 1 || plainLen > 24;
      const spanClass = isSpan2 ? ' span-2' : '';

      if (splitIdx !== -1) {
        const cleanLabel = label.replace(/<\/?b>/g, '');
        const cleanVal = displayVal.replace(/<\/?b>/g, '').trim();
        return `<div class="${spanClass}"><span class="hud-stat-label" style="font-weight: normal;">${cleanLabel}</span> <span class="hud-stat-val" style="font-size: ${valFontSize.toFixed(1)}px; font-weight: normal;">${cleanVal}</span></div>`;
      }
      return `<div class="${spanClass}" style="font-weight: normal;">${line.replace(/<\/?b>/g, '')}</div>`;
    }).join('');

    return linesHTML;
  };

  // Hoisted to updateHealthHud scope so both buildCard and in-place updates can use it.
  const getGlowStyles = (f) => {
    if (!f) return { glowStyle: '', glowClass: '', boxShadow: '', filter: '', className: 'health-card__fill' };
    // NOTE: fighter._tickCooldowns() already decrements these once per simulation frame;
    // just read them here instead of re-deriving/decrementing (was double-decaying the glow).
    const hitTimer = f._healthBarHitTimer || 0;
    const healTimer = f._healthBarHealTimer || 0;

    if (hitTimer > 0) {
      const alpha = (hitTimer / 14).toFixed(2);
      const intensity = (1 + 0.35 * (hitTimer / 14)).toFixed(2);
      return {
        glowStyle: `box-shadow: 0 0 14px 2px rgba(255, 30, 30, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha}); filter: brightness(${intensity});`,
        glowClass: ' hit-glow',
        boxShadow: `0 0 14px 2px rgba(255, 30, 30, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha})`,
        filter: `brightness(${intensity})`,
        className: 'health-card__fill hit-glow'
      };
    } else if (healTimer > 0) {
      const alpha = (healTimer / 14).toFixed(2);
      const intensity = (1 + 0.35 * (healTimer / 14)).toFixed(2);
      return {
        glowStyle: `box-shadow: 0 0 14px 2px rgba(34, 197, 94, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha}); filter: brightness(${intensity});`,
        glowClass: ' heal-glow',
        boxShadow: `0 0 14px 2px rgba(34, 197, 94, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha})`,
        filter: `brightness(${intensity})`,
        className: 'health-card__fill heal-glow'
      };
    }

    return {
      glowStyle: '',
      glowClass: '',
      boxShadow: '',
      filter: '',
      className: 'health-card__fill'
    };
  };

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5, targetFighter = null, titleAlign = 'left', singleColumn = false }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const winnerStyle = '';
    const isTactical = isTacticalMatch(state) || (targetFighter && isTacticalFighter(targetFighter)) || (members && members.some(m => isTacticalFighter(m)));
    if (isTactical) {
      maxBullets = 0;
    }

    const baseFontSize = extraClass.includes('ffa-card') ? 16 : (CONFIG.hudTitleFontSize || 20);
    const maxChars = isTactical ? 28 : (extraClass.includes('ffa-card') ? 18 : 24);
    const isDark = (state.arenaTheme === 'dark') || isTactical;
    const isYutaCard = (targetFighter && (targetFighter.characterId === 'yuta' || targetFighter.type === 'yuta')) || (title && (title.toUpperCase().includes('YUTA') || title.toUpperCase().includes('OKKOTSU')));
    const defaultNameColor = isDark ? (isYutaCard ? '#FF1493' : '#ffffff') : '#000000';
    let nameColor = defaultNameColor;
    let truncatedTitle = title;
    if (title && title.length > maxChars) {
      truncatedTitle = title.substring(0, maxChars - 1) + '…';
    }

    const getTitleStyle = (color, isCj = false) => {
      if (isTactical) {
        return `color: ${color || '#ffffff'}; font-size: 13px; text-transform: uppercase; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Inter', 'Helvetica Neue', Arial, sans-serif; font-weight: 800; letter-spacing: 0.6px; line-height: 1.15; `;
      }
      const fontFamily = isCj ? `'Pricedown', 'Impact', 'Arial Black', Arial, sans-serif` : `'Glast Blitch', Arial, sans-serif`;
      const fontSize = isCj ? (baseFontSize + 2) : baseFontSize;
      const letterSpacing = isCj ? '1.2px' : '0.8px';
      return `color: ${color || '#ffffff'}; font-size: ${fontSize}px; text-transform: uppercase; font-family: ${fontFamily}; letter-spacing: ${letterSpacing}; font-weight: normal; `;
    };

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map((m, mIndex) => {
        const isMemberCj = m && (m.characterId === 'cj' || m.type === 'cj');
        const ratio = m.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(m.hp) / Number(m.maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const isDarkTheme = isDarkModeActive();
        const barColor = isMemberCj ? '#FFFFFF' : getFighterHealthBarColor(m, ratio, isDarkTheme);
        const cjBarClass = isMemberCj ? ' hud-bar-cj' : '';
        const memberStackHTML = isMemberCj ? generateCjGtaStackHTML(m, titleAlign || 'left') : '';
        const { className } = getGlowStyles(m);
        const hpText = (isTactical && m.hp <= 0) ? 'KIA' : `${Math.floor(Math.min(Number(m.maxHp), Math.max(0, Number(m.hp) || 0)))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}`;
        const memberShakeTimer = m._healthBarShakeTimer || 0;
        const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
        const memberShakeStyle = memberShakeTimer > 0 ? `transform: translateX(${memberShakeAmount}px);` : '';
        const isDummy = m && (m.characterId === 'dummy' || m.type === 'dummy');
        const showDescription = CONFIG.hudShowFighterDescription || isDummy;
        const isSingleCol = singleColumn;
        const memberSkillsHTML = !showDescription ? generateFighterSkillsHTML(m, titleAlign || 'left', isSingleCol) : '';
        const memberInfoHTML = generateFighterInfoHTML(m, isSingleCol, true);

        const isMemberYuta = m && (m.characterId === 'yuta' || m.type === 'yuta' || (m.name && m.name.toUpperCase().includes('YUTA')));
        let memberNameColor = isDarkTheme ? (isMemberYuta ? '#FF1493' : defaultNameColor) : defaultNameColor;
        const memberName = (m.name || m.characterId || ('PLAYER ' + (state.fighters.indexOf(m) + 1))).toUpperCase();

        if (isMemberCj) {
          return `
            <div class="health-card__member" style="margin-top: ${mIndex === 0 ? '0' : '14px'};">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-direction: ${titleAlign === 'right' ? 'row-reverse' : 'row'}; margin: 0 0 4px 0;">
                <div class="health-card__title" style="${getTitleStyle(memberNameColor, isMemberCj)}margin: 0; text-align: ${titleAlign || 'left'}; flex-shrink: 0;">${memberName}</div>
              </div>
              ${generateCjGtaHudWidgetHTML(m, titleAlign, hpText, memberShakeStyle)}
              ${memberSkillsHTML ? `<div class="health-card__skills">${memberSkillsHTML}</div>` : ''}
              ${memberInfoHTML ? `<div class="health-card__info" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 14.5}px;">${memberInfoHTML}</div>` : ''}
            </div>
          `;
        }

        return `
          <div class="health-card__member" style="margin-top: ${mIndex === 0 ? '0' : '6px'};">
            <div class="health-card__header-row tactical-header-row" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-direction: ${titleAlign === 'right' ? 'row-reverse' : 'row'}; margin: 0 0 3px 0;">
              <div class="health-card__title tac-name" style="${getTitleStyle(memberNameColor, isMemberCj)}margin: 0; text-align: ${titleAlign || 'left'}; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${memberName}</div>
            </div>
            ${memberStackHTML}
            <div class="health-card__bar${cjBarClass}" style="${memberShakeStyle}">
              <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
              <span class="health-card__bar-text">${hpText}</span>
            </div>
            ${memberSkillsHTML ? `<div class="health-card__skills">${memberSkillsHTML}</div>` : ''}
            ${memberInfoHTML ? `<div class="health-card__info" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 14.5}px;">${memberInfoHTML}</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      const isTargetCj = targetFighter && (targetFighter.characterId === 'cj' || targetFighter.type === 'cj');
      const percent = Math.round(safeRatio * 100);
      const isDarkTheme = isDarkModeActive();
      const barColor = isTargetCj ? '#DC2626' : getFighterHealthBarColor(targetFighter, safeRatio, isDarkTheme);
      const cjBarClass = isTargetCj ? ' hud-bar-cj' : '';
      const { className } = getGlowStyles(targetFighter);
      
      const isDummy = targetFighter && (targetFighter.characterId === 'dummy' || targetFighter.type === 'dummy');
      const showDescription = CONFIG.hudShowFighterDescription || isDummy;
      const skillsHTML = targetFighter && !showDescription ? generateFighterSkillsHTML(targetFighter, 'left', singleColumn) : '';
      const infoHTML = targetFighter ? generateFighterInfoHTML(targetFighter, singleColumn) : '';

      const barShakeTimer = targetFighter ? (targetFighter._healthBarShakeTimer || 0) : 0;
      const barShakeAmount = barShakeTimer > 0 ? Math.sin((12 - barShakeTimer) * 0.75) * 3 : 0;
      const barShakeStyle = barShakeTimer > 0 ? `transform: translateX(${barShakeAmount}px);` : '';

      const skillsGridStyle = singleColumn ? 'grid-template-columns: 1fr;' : '';
      const infoGridStyle = singleColumn ? `color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 14.5}px; grid-template-columns: 1fr;` : `color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 14.5}px;`;

      if (isTargetCj) {
        barsHTML = `
          ${generateCjGtaHudWidgetHTML(targetFighter, titleAlign, metaValue, barShakeStyle)}
          <div class="health-card__skills" style="${skillsGridStyle}">
            ${skillsHTML}
          </div>
          ${infoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${infoHTML}</div>` : ''}
        `;
      } else {
        barsHTML = `
          <div class="health-card__bar${cjBarClass}" style="${barShakeStyle}">
            <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
            <span class="health-card__bar-text">${metaValue}</span>
          </div>
          ${showDescription ? `
            ${infoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${infoHTML}</div>` : ''}
            <div class="health-card__desc" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudDescFontSize || 16}px; line-height: 1.4; margin-top: 8px;">
              ${description.replace(/(\d+(?:\.\d+)?%?)/g, '<span class="hud-number">$1</span>')}
            </div>
          ` : `
            <div class="health-card__skills" style="${skillsGridStyle}">
              ${skillsHTML}
            </div>
            ${infoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${infoHTML}</div>` : ''}
          `}
        `;
      }
    }

    const isCardCj = targetFighter && (targetFighter.characterId === 'cj' || targetFighter.type === 'cj');
    const cjStackHTML = '';
    const winsBullets = Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      return `<div class="health-card__win-bullet ${filled ? 'filled' : ''}"></div>`;
    }).join('');
    const winsHTML = maxBullets > 0 ? `<div class="health-card__wins" style="display: flex; gap: 3px; align-items: center; flex-shrink: 0; margin: 0;">${winsBullets}</div>` : '';

    const rightHeaderHTML = winsHTML ? `
      <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
        ${winsHTML}
      </div>
    ` : '';

    const headerRowHTML = (title || rightHeaderHTML) ? `
      <div class="health-card__header-row tactical-header-row" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-direction: ${titleAlign === 'right' ? 'row-reverse' : 'row'}; margin-bottom: 3px;">
        ${title ? `<div class="health-card__title tac-name" style="${getTitleStyle(nameColor, isCardCj)}margin: 0; text-align: ${titleAlign}; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${truncatedTitle}</div>` : ''}
        ${rightHeaderHTML}
      </div>
    ` : '';

    const cardBgStyle = 'background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none;';
    return `
      <div class="health-card ${extraClass}" style="${winnerStyle} ${cardBgStyle}">
        ${headerRowHTML}
        ${cjStackHTML}
        ${barsHTML}
      </div>
    `;
  };

  const isCacheEmpty = is1v2
    ? (_hudCache.fighters.size === 0 || _hudCache.teams.size === 0)
    : (is2v2 ? _hudCache.teams.size === 0 : _hudCache.fighters.size === 0);

  if (isCacheEmpty) {
    if (containerBottom) containerBottom.innerHTML = '';
    if (containerLeft) containerLeft.innerHTML = '';
    if (containerRight) containerRight.innerHTML = '';

    if (is1v2) {
      // 1v2 Stand Off Mode: Solo player (fighters[0]) is rendered as individual card with skills & stats
      const soloFighter = fighters[0];
      if (soloFighter && !soloFighter.isTurret) {
        const isSoloYuta = soloFighter && (soloFighter.characterId === 'yuta' || soloFighter.type === 'yuta' || (soloFighter.name && soloFighter.name.toUpperCase().includes('YUTA')));
        let nameColor = (state.arenaTheme === 'dark') ? (isSoloYuta ? '#FF1493' : '#ffffff') : '#000000';
        const ratio = soloFighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(soloFighter.hp) / Number(soloFighter.maxHp))) : 0;
        const color = soloFighter.color || '#fff';
        const fighterName = soloFighter.name || 'SOLO PLAYER';
        const fighterStats = state.leaderboard[soloFighter.fighterIndex] || { wins: 0, losses: 0 };
        const careerWins = fighterStats.wins;
        const losses = fighterStats.losses;
        const totalGames = careerWins + losses;
        const winRate = totalGames > 0 ? Math.round((careerWins / totalGames) * 100) : 0;
        const fighterDef = soloFighter.fighterIndex !== undefined ? FIGHTER_DEFS[soloFighter.fighterIndex] : null;
        const shakeTimer = soloFighter._healthBarShakeTimer || 0;
        const matchWins = (state.scores && state.scores[0]) ? state.scores[0] : 0;
        const cardDesc = (fighterDef && mode !== GAME_MODES.FFA) ? fighterDef.desc : '';

        const soloCardHTML = buildCard({
          title: fighterName,
          scoreText: totalGames > 0 ? `${winRate}% WR` : '',
          fillColor: color,
          fillRatio: ratio,
          metaLabel: `DMG: ${parseFloat(Math.max(0, Number(soloFighter.damage) || 0).toFixed(1))}`,
          metaValue: `${Math.floor(Math.max(0, Number(soloFighter.hp) || 0))}/${Math.floor(Math.max(0, Number(soloFighter.maxHp) || 0))}`,
          extraClass: isTactical ? 'tactical-card' : 'red solo-1v2-card',
          borderColor: color,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: soloFighter === state.roundWinner,
          description: cardDesc,
          kills: state.matchKills ? state.matchKills[0] || [] : [],
          maxBullets: 0,
          targetFighter: soloFighter,
          titleAlign: 'left',
          singleColumn: true
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = soloCardHTML;
        const soloCardElement = tempDiv.firstElementChild;
        containerBottom.appendChild(soloCardElement);

        const hpBar = soloCardElement.querySelector('.health-card__bar');
        const hpBarFill = soloCardElement.querySelector('.health-card__fill');
        const hpBarText = soloCardElement.querySelector('.health-card__bar-text');
        const starsContainer = soloCardElement.querySelector('.hud-cj-stars');
        const moneyTextEl = soloCardElement.querySelector('.hud-cj-money-text');
        const winBullets = Array.from(soloCardElement.querySelectorAll('.health-card__win-bullet'));
        const infoContainer = soloCardElement.querySelector('.health-card__info');
        const checkbox = soloCardElement.querySelector('input[type="checkbox"]');

        const skillBars = new Map();
        soloCardElement.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fill = box.querySelector('.hud-skill-box-fill');
          const text = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill, text });
        });

        _hudCache.fighters.set(soloFighter, {
          cardElement: soloCardElement,
          hpBar,
          hpBarFill,
          hpBarText,
          starsContainer,
          moneyTextEl,
          lastMoneyText: '',
          lastStarCount: -1,
          winBullets,
          infoContainer,
          checkbox,
          skillBars,
          lastInfoHTML: '',
          lastHpPct: -1,
          lastBarColor: '',
          lastHpText: '',
          lastChecked: null
        });
      }

      // Opponent Team (fighters[1], fighters[2])
      const oppMembers = [fighters[1], fighters[2]].filter(Boolean);
      const oppShakeTimer = oppMembers.reduce((max, fighter) => Math.max(max, fighter._healthBarShakeTimer || 0), 0);
      const isOppWinner = state.roundWinner && oppMembers.includes(state.roundWinner);

      const oppCardHTML = buildCard({
        title: 'DUO TEAM',
        scoreText: `${state.teamScores ? state.teamScores[1] || 0 : 0} WINS`,
        fillColor: '#4da3ff',
        members: oppMembers,
        extraClass: isTactical ? 'blue tactical-card' : 'blue duo-1v2-card',
        shakeTimer: oppShakeTimer,
        isWinner: isOppWinner,
        borderColor: isOppWinner ? '#ffd700' : null,
        kills: oppMembers.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
        maxBullets: 0,
        titleAlign: 'right'
      });

      const tempOppDiv = document.createElement('div');
      tempOppDiv.innerHTML = oppCardHTML;
      const oppCardElement = tempOppDiv.firstElementChild;
      containerBottom.appendChild(oppCardElement);

      const cachedOppMembers = [];
      oppCardElement.querySelectorAll('.health-card__member').forEach((memberEl, i) => {
        const fill = memberEl.querySelector('.health-card__fill');
        const text = memberEl.querySelector('.health-card__bar-text');
        const bar = memberEl.querySelector('.health-card__bar');
        const starsContainer = memberEl.querySelector('.hud-cj-stars');
        const moneyTextEl = memberEl.querySelector('.hud-cj-money-text');
        const infoContainer = memberEl.querySelector('.health-card__info');
        const skillBars = new Map();
        memberEl.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fillEl = box.querySelector('.hud-skill-box-fill');
          const textEl = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill: fillEl, text: textEl });
        });
        cachedOppMembers.push({ fill, text, bar, starsContainer, moneyTextEl, lastMoneyText: '', lastStarCount: -1, infoContainer, skillBars, fighter: oppMembers[i], lastInfoHTML: '' });
      });

      _hudCache.teams.set(1, {
        cardElement: oppCardElement,
        members: cachedOppMembers
      });
    } else if (is2v2) {
      // 2v2 Pure Team Mode
      const teamLabels = [
        { title: 'RED TEAM', color: '#ff4d4d', indexes: [0, 1], key: 'red' },
        { title: 'BLUE TEAM', color: '#4da3ff', indexes: [2, 3], key: 'blue' },
      ];

      teamLabels.forEach((team, teamIndex) => {
        const members = team.indexes.map((fighterIndex) => fighters[fighterIndex]).filter(Boolean);
        const shakeTimer = members.reduce((max, fighter) => Math.max(max, fighter._healthBarShakeTimer || 0), 0);
        const isWinner = state.roundWinner && team.indexes.some(idx => fighters[idx] === state.roundWinner);

        const cardHTML = buildCard({
          title: team.title,
          scoreText: `${teamScores[teamIndex] || 0} WINS`,
          fillColor: team.color,
          members: members,
          extraClass: isTactical ? `${team.key} tactical-card` : team.key,
          shakeTimer,
          isWinner: isWinner,
          borderColor: isWinner ? '#ffd700' : null,
          kills: members.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
          maxBullets: isTactical ? 0 : 3,
          titleAlign: teamIndex === 0 ? 'left' : 'right'
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;
        containerBottom.appendChild(cardElement);

        const cachedMembers = [];
        cardElement.querySelectorAll('.health-card__member').forEach((memberEl, i) => {
          const fill = memberEl.querySelector('.health-card__fill');
          const text = memberEl.querySelector('.health-card__bar-text');
          const bar = memberEl.querySelector('.health-card__bar');
          const starsContainer = memberEl.querySelector('.hud-cj-stars');
          const moneyTextEl = memberEl.querySelector('.hud-cj-money-text');
          const weaponIconEl = memberEl.querySelector('.hud-cj-weapon-icon');
          const weaponAmmoEl = memberEl.querySelector('.hud-cj-weapon-ammo');
          const clockTextEl = memberEl.querySelector('.hud-cj-clock-text');
          const armorFillEl = memberEl.querySelector('.hud-cj-armor-fill');
          const infoContainer = memberEl.querySelector('.health-card__info');
          const skillBars = new Map();
          cardElement.querySelectorAll('.hud-skill-box').forEach(box => {
            const id = box.getAttribute('data-skill-id');
            const fillEl = box.querySelector('.hud-skill-box-fill');
            const textEl = box.querySelector('.hud-skill-box-text');
            skillBars.set(id, { box, fill: fillEl, text: textEl });
          });
          cachedMembers.push({
            fill, text, bar, starsContainer, moneyTextEl, weaponIconEl, weaponAmmoEl, clockTextEl, armorFillEl,
            lastMoneyText: '', lastStarCount: -1, lastWeaponIcon: '', lastWeaponAmmo: '', lastClockText: '',
            infoContainer, skillBars, fighter: members[i], lastInfoHTML: ''
          });
        });

        _hudCache.teams.set(teamIndex, {
          cardElement,
          members: cachedMembers
        });
      });
    } else {
      // 1v1 / FFA Individual Mode
      fighters.forEach((fighter, index) => {
        if (!fighter || fighter.isTurret) return;
        const ratio = fighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(fighter.hp) / Number(fighter.maxHp))) : 0;
        const color = fighter.color || '#fff';
        const isYutaFighter = fighter && (fighter.characterId === 'yuta' || fighter.type === 'yuta' || (fighter.name && fighter.name.toUpperCase().includes('YUTA')));
        let nameColor = (state.arenaTheme === 'dark') ? (isYutaFighter ? '#FF1493' : '#ffffff') : '#000000';
        const fighterName = fighter.name || `FIGHTER ${index + 1}`;
        const fighterStats = state.leaderboard[fighter.fighterIndex] || { wins: 0, losses: 0 };
        const careerWins = fighterStats.wins;
        const losses = fighterStats.losses;
        const totalGames = careerWins + losses;
        const winRate = totalGames > 0 ? Math.round((careerWins / totalGames) * 100) : 0;
        const fighterDef = fighter.fighterIndex !== undefined ? FIGHTER_DEFS[fighter.fighterIndex] : null;
        const shakeTimer = fighter._healthBarShakeTimer || 0;
        const matchWins = (state.scores && state.scores[index]) ? state.scores[index] : 0;

        let cardDesc = (fighterDef && mode !== GAME_MODES.FFA) ? fighterDef.desc : '';
        if (fighterDef && fighterDef.type === 'dummy') {
          const checkedStr = state.dummyAggressive ? 'checked' : '';
          cardDesc = `
              <div class="dummy-aggressive-toggle" style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); cursor: pointer; pointer-events: auto;">
                <span style="font-weight: bold; font-size: 11px; color: ${state.dummyAggressive ? '#ef4444' : '#aaa'}; pointer-events: none;">AGGRESSIVE MODE</span>
                <label style="position: relative; display: inline-block; width: 34px; height: 18px; pointer-events: none;">
                  <input type="checkbox" ${checkedStr} style="opacity: 0; width: 0; height: 0;">
                  <span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: ${state.dummyAggressive ? '#ef4444' : '#555'}; border-radius: 18px; transition: .2s;">
                    <span style="position: absolute; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; border-radius: 50%; transition: .2s; transform: ${state.dummyAggressive ? 'translateX(16px)' : 'none'};"></span>
                  </span>
                </label>
              </div>
            `;
        }

        const isFfa = mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA';
        let extraClassStr = '';
        if (isTactical) {
          const is2x2 = isFfa || fighters.length >= 3;
          extraClassStr = is2x2 ? 'tactical-card tactical-card-2x2' : 'tactical-card tactical-card-1v1';
        } else {
          extraClassStr = isFfa ? 'ffa-card' : (isSingleColumnMode ? 'single-column' : '');
        }

        const maxBulletsCount = (mode === GAME_MODES.STAND_OFF || mode === GAME_MODES.TACTICAL_STANDOFF || isTactical) ? 0 : (isFfa ? 0 : 2);

        const cardHTML = buildCard({
          title: fighterName,
          scoreText: totalGames > 0 ? `${winRate}% WR` : '',
          fillColor: color,
          fillRatio: ratio,
          metaLabel: `DMG: ${parseFloat(Math.max(0, Number(fighter.damage) || 0).toFixed(1))}`,
          metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
          extraClass: extraClassStr,
          borderColor: color,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: fighter === state.roundWinner,
          description: cardDesc,
          kills: (isFfa) && state.matchKills ? state.matchKills[index] || [] : [],
          maxBullets: maxBulletsCount,
          targetFighter: fighter,
          titleAlign: (index % 2 === 0 ? 'left' : 'right'),
          singleColumn: isSingleColumnMode
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;

        if (mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA' || is1v1 || isStandOff || isTLFS || isTactical || fighters.length <= 4) {
          containerBottom.appendChild(cardElement);
        } else if (index % 2 === 0) {
          containerLeft.appendChild(cardElement);
        } else {
          containerRight.appendChild(cardElement);
        }

        const hpBar = cardElement.querySelector('.health-card__bar');
        const hpBarFill = cardElement.querySelector('.health-card__fill');
        const hpBarText = cardElement.querySelector('.health-card__bar-text');
        const starsContainer = cardElement.querySelector('.hud-cj-stars');
        const moneyTextEl = cardElement.querySelector('.hud-cj-money-text');
        const weaponIconEl = cardElement.querySelector('.hud-cj-weapon-icon');
        const weaponAmmoEl = cardElement.querySelector('.hud-cj-weapon-ammo');
        const clockTextEl = cardElement.querySelector('.hud-cj-clock-text');
        const armorFillEl = cardElement.querySelector('.hud-cj-armor-fill');
        const winBullets = Array.from(cardElement.querySelectorAll('.health-card__win-bullet'));
        const infoContainer = cardElement.querySelector('.health-card__info');
        const checkbox = cardElement.querySelector('input[type="checkbox"]');

        const skillBars = new Map();
        cardElement.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fill = box.querySelector('.hud-skill-box-fill');
          const text = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill, text });
        });

        _hudCache.fighters.set(fighter, {
          cardElement,
          hpBar,
          hpBarFill,
          hpBarText,
          starsContainer,
          moneyTextEl,
          weaponIconEl,
          weaponAmmoEl,
          clockTextEl,
          armorFillEl,
          lastMoneyText: '',
          lastStarCount: -1,
          lastWeaponIcon: '',
          lastWeaponAmmo: '',
          lastClockText: '',
          lastStaminaPct: -1,
          lastIsExhausted: null,
          lastHpPct: -1,
          lastBarColor: '',
          lastHpText: '',
          winBullets,
          infoContainer,
          checkbox,
          skillBars,
          lastInfoHTML: ''
        });
      });
    }
  }

  if (_hudCache.teams.size > 0) {
    _hudCache.teams.forEach((cachedCard, teamIndex) => {
      cachedCard.members.forEach((m) => {
        const fighter = m.fighter;
        if (!fighter) return;

        if (fighter._lastHealAmount && fighter._lastHealAmount > 0 && m.bar) {
          triggerHudHealBubble(m.bar, fighter._lastHealAmount);
          fighter._lastHealAmount = 0;
        }

        const isCj = fighter && (fighter.characterId === 'cj' || fighter.type === 'cj');
        const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
        const maxHp = fighter._originalMaxHp || fighter.maxHp;
        const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const isDarkTheme = isDarkModeActive();
        const barColor = isCj ? '#FFFFFF' : getFighterHealthBarColor(fighter, ratio, isDarkTheme);
        const glow = getGlowStyles(fighter);
        
        if (m.lastHpPct !== percent) {
          m.fill.style.width = `${percent}%`;
          m.lastHpPct = percent;
        }
        if (m.lastBarColor !== barColor) {
          m.fill.style.background = barColor;
          m.lastBarColor = barColor;
        }
        m.fill.style.boxShadow = isCj ? '' : (glow.boxShadow || '');
        m.fill.style.filter = glow.filter || '';
        m.fill.className = glow.className || 'health-card__fill';
        
        if (m.bar) {
          const cjBarClass = isCj ? ' hud-bar-cj' : '';
          m.bar.className = `health-card__bar${cjBarClass}${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
          const memberShakeTimer = fighter._healthBarShakeTimer || 0;
          const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
          m.bar.style.transform = memberShakeTimer > 0 ? `translateX(${memberShakeAmount}px)` : '';
        }

        const isTactical = isTacticalMatch(state);
        const hpText = (curHp <= 0 && isTactical) ? 'KIA' : `${Math.floor(Math.min(Number(maxHp), Math.max(0, Number(curHp) || 0)))}/${Math.floor(Math.max(0, Number(maxHp) || 0))}`;
        if (m.lastHpText !== hpText) {
          m.text.textContent = hpText;
          m.lastHpText = hpText;
        }

        // Wanted Stars Update for CJ (Team Member)
        if (isCj && m.starsContainer) {
          const starCount = getCjStarLevel(fighter);
          if (m.lastStarCount !== starCount) {
            m.starsContainer.innerHTML = generateCjStarsSVGs(starCount);
            m.lastStarCount = starCount;
          }
        }

        // Money Update for CJ (Team Member)
        if (isCj && m.moneyTextEl) {
          const text = updateAndGetCjMoneyText(fighter);
          if (m.lastMoneyText !== text) {
            m.moneyTextEl.textContent = text;
            m.lastMoneyText = text;
          }
        }

        // GTA HUD Widget Updates for CJ (Team Member)
        if (isCj) {
          if (m.clockTextEl) {
            const clockStr = getMatchTimeString();
            if (m.lastClockText !== clockStr) {
              m.clockTextEl.textContent = clockStr;
              m.lastClockText = clockStr;
            }
          }
          if (m.weaponIconEl) {
            const wp = getCjActiveWeaponData(fighter);
            if (m.lastWeaponIcon !== wp.icon) {
              m.weaponIconEl.setAttribute('src', wp.icon);
              m.lastWeaponIcon = wp.icon;
            }
            if (m.weaponAmmoEl && m.lastWeaponAmmo !== wp.ammo) {
              m.weaponAmmoEl.textContent = wp.ammo;
              m.lastWeaponAmmo = wp.ammo;
            }
          }
          if (m.armorFillEl) {
            const staminaVal = (fighter.stamina !== undefined) ? fighter.stamina : 100;
            const maxStamina = fighter.maxStamina || 100;
            const staminaPct = Math.min(100, Math.max(0, Math.round((staminaVal / maxStamina) * 100)));
            const isExh = Boolean(fighter.isExhausted);
            if (m.lastStaminaPct !== staminaPct) {
              m.armorFillEl.style.width = `${staminaPct}%`;
              m.lastStaminaPct = staminaPct;
            }
            if (m.lastIsExhausted !== isExh) {
              m.armorFillEl.style.background = isExh ? '#94A3B8' : '#FFFFFF';
              m.lastIsExhausted = isExh;
            }
          }
        }

        // Skill Bars Update for Team Member
        if (m.skillBars && m.skillBars.size > 0) {
          const skills = getSkillDataForFighter(fighter);
          skills.forEach(s => {
            const cachedSkill = m.skillBars.get(s.id);
            if (cachedSkill) {
              const roundedPct = Math.round(s.pct);
              const isReady = !!s.ready;

              if (s.noFill) {
                if (cachedSkill.lastDisplay !== 'none') {
                  cachedSkill.fill.style.display = 'none';
                  cachedSkill.lastDisplay = 'none';
                }
                if (!cachedSkill.lastLabelOnly) {
                  cachedSkill.box.classList.add('label-only');
                  cachedSkill.lastLabelOnly = true;
                }
                if (cachedSkill.lastLabel !== s.label) {
                  cachedSkill.text.innerHTML = formatSkillLabel(s.label, isTactical);
                  cachedSkill.lastLabel = s.label;
                }
              } else {
                if (cachedSkill.lastDisplay !== 'block') {
                  cachedSkill.fill.style.display = 'block';
                  cachedSkill.lastDisplay = 'block';
                }
                if (cachedSkill.lastPct !== roundedPct) {
                  cachedSkill.fill.style.width = `${roundedPct}%`;
                  cachedSkill.lastPct = roundedPct;
                }
                if (cachedSkill.lastColor !== s.color) {
                  cachedSkill.fill.style.background = s.color;
                  cachedSkill.lastColor = s.color;
                }
                if (cachedSkill.lastLabelOnly) {
                  cachedSkill.box.classList.remove('label-only');
                  cachedSkill.lastLabelOnly = false;
                }
                if (cachedSkill.lastLabel !== s.label) {
                  cachedSkill.text.innerHTML = formatSkillLabel(s.label, isTactical);
                  cachedSkill.lastLabel = s.label;
                }
              }

              if (cachedSkill.lastReady !== isReady) {
                if (isReady) {
                  cachedSkill.box.classList.add('hud-skill-ready');
                } else {
                  cachedSkill.box.classList.remove('hud-skill-ready');
                }
                cachedSkill.lastReady = isReady;
              }
            }
          });
        }

        // Stats Info Update for Team Member
        if (m.infoContainer) {
          const isSingleCol = isSingleColumnMode && mode !== GAME_MODES.FFA;
          const infoHTML = generateFighterInfoHTML(fighter, isSingleCol, true);
          if (m.lastInfoHTML !== infoHTML) {
            m.infoContainer.innerHTML = infoHTML;
            m.lastInfoHTML = infoHTML;
          }
        }
      });

      cachedCard.cardElement.style.transform = '';
    });
  }
  if (_hudCache.fighters.size > 0) {
    fighters.forEach((fighter, index) => {
      if (!fighter || fighter.isTurret) return;
      const cachedCard = _hudCache.fighters.get(fighter);
      if (!cachedCard) return;

      if (fighter._lastHealAmount && fighter._lastHealAmount > 0 && cachedCard.hpBar) {
        triggerHudHealBubble(cachedCard.hpBar, fighter._lastHealAmount);
        fighter._lastHealAmount = 0;
      }

      const isCj = fighter && (fighter.characterId === 'cj' || fighter.type === 'cj');
      const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
      const maxHp = fighter._originalMaxHp || fighter.maxHp;
      const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
      const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      const isDarkTheme = isDarkModeActive();
      const barColor = isCj ? '#FFFFFF' : getFighterHealthBarColor(fighter, ratio, isDarkTheme);
      const glow = getGlowStyles(fighter);

      if (cachedCard.hpBarFill) {
        if (cachedCard.lastHpPct !== percent) {
          cachedCard.hpBarFill.style.width = `${percent}%`;
          cachedCard.lastHpPct = percent;
        }
        if (cachedCard.lastBarColor !== barColor) {
          cachedCard.hpBarFill.style.background = barColor;
          cachedCard.lastBarColor = barColor;
        }
        cachedCard.hpBarFill.style.boxShadow = isCj ? '' : (glow.boxShadow || '');
        cachedCard.hpBarFill.style.filter = glow.filter || '';
        cachedCard.hpBarFill.className = glow.className || 'health-card__fill';
      }

      if (cachedCard.hpBar) {
        const cjBarClass = isCj ? ' hud-bar-cj' : '';
        cachedCard.hpBar.className = `health-card__bar${cjBarClass}${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
        const shakeTimer = fighter._healthBarShakeTimer || 0;
        const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
        cachedCard.hpBar.style.transform = shakeTimer > 0 ? `translateX(${shakeAmount}px)` : '';
      }

      if (cachedCard.hpBarText) {
        const isTactical = isTacticalMatch(state);
        const metaValue = (curHp <= 0 && isTactical) ? 'KIA' : `${Math.floor(Math.min(Number(maxHp), Math.max(0, Number(curHp) || 0)))}/${Math.floor(Math.max(0, Number(maxHp) || 0))}`;
        if (cachedCard.lastHpText !== metaValue) {
          cachedCard.hpBarText.textContent = metaValue;
          cachedCard.lastHpText = metaValue;
        }
      }

      // Wanted Stars Update for CJ (Individual Fighter)
      if (isCj && cachedCard.starsContainer) {
        const starCount = getCjStarLevel(fighter);
        if (cachedCard.lastStarCount !== starCount) {
          cachedCard.starsContainer.innerHTML = generateCjStarsSVGs(starCount);
          cachedCard.lastStarCount = starCount;
        }
      }

      // Money Update for CJ (Individual Fighter)
      if (isCj && cachedCard.moneyTextEl) {
        const text = updateAndGetCjMoneyText(fighter);
        if (cachedCard.lastMoneyText !== text) {
          cachedCard.moneyTextEl.textContent = text;
          cachedCard.lastMoneyText = text;
        }
      }

      // GTA HUD Widget Updates for CJ (Individual Fighter)
      if (isCj) {
        if (cachedCard.clockTextEl) {
          const clockStr = getMatchTimeString();
          if (cachedCard.lastClockText !== clockStr) {
            cachedCard.clockTextEl.textContent = clockStr;
            cachedCard.lastClockText = clockStr;
          }
        }
        if (cachedCard.weaponIconEl) {
          const wp = getCjActiveWeaponData(fighter);
          if (cachedCard.lastWeaponIcon !== wp.icon) {
            cachedCard.weaponIconEl.setAttribute('src', wp.icon);
            cachedCard.lastWeaponIcon = wp.icon;
          }
          if (cachedCard.weaponAmmoEl && cachedCard.lastWeaponAmmo !== wp.ammo) {
            cachedCard.weaponAmmoEl.textContent = wp.ammo;
            cachedCard.lastWeaponAmmo = wp.ammo;
          }
        }
        if (cachedCard.armorFillEl) {
          const staminaVal = (fighter.stamina !== undefined) ? fighter.stamina : 100;
          const maxStamina = fighter.maxStamina || 100;
          const staminaPct = Math.min(100, Math.max(0, Math.round((staminaVal / maxStamina) * 100)));
          const isExh = Boolean(fighter.isExhausted);
          if (cachedCard.lastStaminaPct !== staminaPct) {
            cachedCard.armorFillEl.style.width = `${staminaPct}%`;
            cachedCard.lastStaminaPct = staminaPct;
          }
          if (cachedCard.lastIsExhausted !== isExh) {
            cachedCard.armorFillEl.style.background = isExh ? '#94A3B8' : '#FFFFFF';
            cachedCard.lastIsExhausted = isExh;
          }
        }
      }

      cachedCard.cardElement.style.transform = '';

      // 3. Wins bullets
      const isTactical = isTacticalMatch(state);
      const matchWins = scores[index] || 0;
      cachedCard.winBullets.forEach((bullet, i) => {
        const filled = i < matchWins;
        if (filled) {
          bullet.classList.add('filled');
          if (isTactical) {
            bullet.style.background = '#fbbf24';
          } else {
            bullet.style.background = fighter.color || '#ffd700';
          }
        } else {
          bullet.classList.remove('filled');
          bullet.style.background = '';
        }
      });

      // 4. Skills updates (Optimized: Dirty-check variables and remove inline style resets to completely prevent layout reflows)
      const isDummy = fighter.characterId === 'dummy' || fighter.type === 'dummy';
      const showDescription = CONFIG.hudShowFighterDescription || isDummy;

      if (!showDescription && cachedCard.skillBars.size > 0) {
        const skills = getSkillDataForFighter(fighter);
        skills.forEach(s => {
          const cachedSkill = cachedCard.skillBars.get(s.id);
          if (cachedSkill) {
            const roundedPct = Math.round(s.pct);
            const isReady = !!s.ready;

            if (s.noFill) {
              if (cachedSkill.lastDisplay !== 'none') {
                cachedSkill.fill.style.display = 'none';
                cachedSkill.lastDisplay = 'none';
              }
              if (!cachedSkill.lastLabelOnly) {
                cachedSkill.box.classList.add('label-only');
                cachedSkill.lastLabelOnly = true;
              }
              if (cachedSkill.lastLabel !== s.label) {
                cachedSkill.text.innerHTML = formatSkillLabel(s.label, isTactical);
                cachedSkill.lastLabel = s.label;
              }
            } else {
              if (cachedSkill.lastDisplay !== 'block') {
                cachedSkill.fill.style.display = 'block';
                cachedSkill.lastDisplay = 'block';
              }
              if (cachedSkill.lastPct !== roundedPct) {
                cachedSkill.fill.style.width = `${roundedPct}%`;
                cachedSkill.lastPct = roundedPct;
              }
              if (cachedSkill.lastColor !== s.color) {
                cachedSkill.fill.style.background = s.color;
                cachedSkill.lastColor = s.color;
              }
              if (cachedSkill.lastLabelOnly) {
                cachedSkill.box.classList.remove('label-only');
                cachedSkill.lastLabelOnly = false;
              }
              if (cachedSkill.lastLabel !== s.label) {
                cachedSkill.text.innerHTML = formatSkillLabel(s.label, isTactical);
                cachedSkill.lastLabel = s.label;
              }
            }

            if (cachedSkill.lastReady !== isReady) {
              if (isReady) {
                cachedSkill.box.classList.add('hud-skill-ready');
              } else {
                cachedSkill.box.classList.remove('hud-skill-ready');
              }
              cachedSkill.lastReady = isReady;
            }
          }
        });
      }

      // 5. Additional Info (stats) — only write to DOM if text changed
      if (cachedCard.infoContainer) {
        const isSingleCol = (isSingleColumnMode && mode !== GAME_MODES.FFA) || (is1v2 && index === 0);
        const infoHTML = generateFighterInfoHTML(fighter, isSingleCol);
        if (cachedCard.lastInfoHTML !== infoHTML) {
          cachedCard.infoContainer.innerHTML = infoHTML;
          cachedCard.lastInfoHTML = infoHTML;
        }
      }

      // 6. Checkbox / Aggressive mode toggle for dummy
      if (isDummy && cachedCard.checkbox) {
        cachedCard.checkbox.checked = state.dummyAggressive;
        const slider = cachedCard.checkbox.nextElementSibling;
        if (slider) {
          slider.style.backgroundColor = state.dummyAggressive ? '#ef4444' : '#555';
          const knob = slider.firstElementChild;
          if (knob) {
            knob.style.transform = state.dummyAggressive ? 'translateX(16px)' : 'none';
          }
        }
        const toggleLabel = cachedCard.checkbox.closest('.dummy-aggressive-toggle')?.firstElementChild;
        if (toggleLabel) {
          toggleLabel.style.color = state.dummyAggressive ? '#ef4444' : '#aaa';
        }
      }
    });
  }
}

export { updateHealthHud };


