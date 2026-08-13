import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { state } from '../core/state.js';
import { GAME_MODES, MODE_SETTINGS, MODE_SPEED_MULTIPLIER } from '../core/modeConfig.js';
import { drawBlueAimbotGun } from './weaponVisuals.js';
import { drawPanel } from './ui.js';

// ─────────────────────────────────────────────
// HUD POSITION SYNC — keeps HUD locked to the canvas
// regardless of browser zoom (Ctrl+/Ctrl-)
// ─────────────────────────────────────────────
let _hudSyncInitialized = false;
let _cachedGameBox = null;

// ── Cached DOM references for per-frame HUD functions ──
let _cachedContainerBottom = null;
let _cachedContainerLeft = null;
let _cachedContainerRight = null;
let _cachedTopContainer = null;
let _cachedBottomContainer = null;
let _cachedPixiView = null;
let _cachedTopLeft = null;
let _cachedTopRight = null;
let _cachedBottomLeft = null;
let _cachedBottomRight = null;

/**
 * Dynamically recalculates the HUD container positions based on the actual
 * PixiJS canvas element's bounding rect relative to the game-box.
 * This prevents HUD drift during browser zoom changes.
 */
function syncHudPosition() {
  if (!_cachedGameBox) _cachedGameBox = document.querySelector('.game-box');
  if (!_cachedPixiView) _cachedPixiView = _cachedGameBox?.querySelector('canvas');
  if (!_cachedGameBox || !_cachedPixiView) return;

  const canvasWidth = CONFIG.canvasWidth || 540;
  const canvasHeight = CONFIG.canvasHeight || 960;

  // Dynamically set aspect ratio, max-width, and background color on game-box from config
  _cachedGameBox.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
  _cachedGameBox.style.maxWidth = `${canvasWidth}px`;
  
  const outerBgColor = CONFIG.arenaOuterBgColor || '#ffffff';
  _cachedGameBox.style.backgroundColor = outerBgColor.replace(/ff$/, '');

  const boxRect = _cachedGameBox.getBoundingClientRect();
  const canvasRect = _cachedPixiView.getBoundingClientRect();

  if (boxRect.height <= 0 || canvasRect.height <= 0) return;

  const canvasTopInBox = canvasRect.top - boxRect.top;

  const scale = CONFIG.internalScale || 1.0;
  const hudScale = scale * 0.9;

  const arenaWidth = CONFIG.arena.width;
  const arenaX = CONFIG.arena.x;
  
  // Read from CONFIG so it can be tuned without touching engine code.
  // 1.0 = raw arena width; internalScale (0.95) = aligns with arena side walls.
  const widthModifier = CONFIG.hudWidthModifier ?? scale;

  const hudCssWidth = (arenaWidth * widthModifier) / hudScale;
  const visualWidthPercent = (hudCssWidth / canvasWidth) * 100;

  const hudCssLeft = (arenaX + arenaWidth / 2) - hudCssWidth / 2;
  const visualLeftPercent = (hudCssLeft / canvasWidth) * 100;

  // 1. Position Top HUD Container (names, dynamically kept ~90px above arena top)
  const topRatio = (CONFIG.arena.y - 90) / canvasHeight;
  const topPx = canvasTopInBox + canvasRect.height * topRatio;
  const topPercent = (topPx / boxRect.height) * 100;
  
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer');
  if (_cachedTopContainer) {
    _cachedTopContainer.style.top = `${topPercent.toFixed(3)}%`;
    _cachedTopContainer.style.width = `${visualWidthPercent.toFixed(3)}%`;
    _cachedTopContainer.style.maxWidth = 'none';
    _cachedTopContainer.style.left = `${visualLeftPercent.toFixed(3)}%`;
    _cachedTopContainer.style.right = 'auto';
    _cachedTopContainer.style.transform = `scale(${hudScale})`;
    _cachedTopContainer.style.transformOrigin = 'top center';
  }

  // 2. Position Bottom HUD Container (skills/descriptions, dynamically kept ~20px below arena bottom)
  const bottomRatio = (CONFIG.arena.y + CONFIG.arena.height + 20) / canvasHeight;
  const bottomPx = canvasTopInBox + canvasRect.height * bottomRatio;
  const bottomPercent = (bottomPx / boxRect.height) * 100;

  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer');
  if (_cachedBottomContainer) {
    _cachedBottomContainer.style.top = `${bottomPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.width = `${visualWidthPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.maxWidth = 'none';
    _cachedBottomContainer.style.left = `${visualLeftPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.right = 'auto';
    _cachedBottomContainer.style.transform = `scale(${hudScale})`;
    _cachedBottomContainer.style.transformOrigin = 'top center';
  }

  // 3. Position Health HUD (health bars, dynamically positioned with a slight margin)
  const arenaBottomRatio = (CONFIG.arena.y + CONFIG.arena.height) / canvasHeight;
  const arenaBottomInBox = canvasTopInBox + canvasRect.height * arenaBottomRatio;
  const hudMargin = canvasRect.height * (20 / canvasHeight);
  const hudTopPx = arenaBottomInBox + hudMargin;
  const hudTopPercent = (hudTopPx / boxRect.height) * 100;

  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  const healthHud = _cachedContainerBottom;
  if (healthHud) {
    healthHud.style.top = `${hudTopPercent.toFixed(3)}%`;
    healthHud.style.width = `${visualWidthPercent.toFixed(3)}%`;
    healthHud.style.maxWidth = 'none';
    healthHud.style.left = `${visualLeftPercent.toFixed(3)}%`;
    healthHud.style.right = 'auto';
    healthHud.style.margin = '0';
    healthHud.style.transform = `scale(${hudScale})`;
    healthHud.style.transformOrigin = 'top center';
  }
}

function initHudSync() {
  if (_hudSyncInitialized) return;
  _hudSyncInitialized = true;

  // Sync on initial load
  syncHudPosition();

  // Sync on window resize
  window.addEventListener('resize', syncHudPosition);

  // Sync on browser zoom changes (devicePixelRatio changes)
  // matchMedia fires when the effective DPR changes due to browser zoom
  const dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const onDprChange = () => {
    syncHudPosition();
    // Re-register with the new DPR value
    const newQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    newQuery.addEventListener('change', onDprChange, { once: true });
  };
  dprMediaQuery.addEventListener('change', onDprChange, { once: true });

  // Use ResizeObserver for game-box size changes
  const gameBox = document.querySelector('.game-box');
  if (gameBox && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      // Invalidate cached elements in case canvas was replaced
      _cachedPixiView = null;
      syncHudPosition();
    });
    ro.observe(gameBox);
  }
}

// Initialize immediately
initHudSync();


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
    const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || showModel;
    
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
  if (!_cachedTopContainer) _cachedTopContainer = document.querySelector('.hud-top-container');
  if (!_cachedBottomContainer) _cachedBottomContainer = document.querySelector('.hud-bottom-container');
  const containerBottom = _cachedContainerBottom;
  const containerLeft = _cachedContainerLeft;
  const containerRight = _cachedContainerRight;
  const topContainer = _cachedTopContainer;
  const bottomContainer = _cachedBottomContainer;
  
  if (containerBottom) {
    containerBottom.classList.toggle('ffa-hud', mode === GAME_MODES.FFA);
    containerBottom.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerBottom.style.visibility = 'hidden';
      containerBottom.style.pointerEvents = 'none';
    } else {
      containerBottom.style.display = 'flex';
      containerBottom.style.visibility = 'visible';
      containerBottom.style.pointerEvents = 'auto';
    }
  }
  if (containerLeft) {
    containerLeft.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerLeft.style.visibility = 'hidden';
      containerLeft.style.pointerEvents = 'none';
    } else {
      containerLeft.style.display = 'block';
      containerLeft.style.visibility = 'visible';
      containerLeft.style.pointerEvents = 'auto';
    }
  }
  if (containerRight) {
    containerRight.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerRight.style.visibility = 'hidden';
      containerRight.style.pointerEvents = 'none';
    } else {
      containerRight.style.display = 'block';
      containerRight.style.visibility = 'visible';
      containerRight.style.pointerEvents = 'auto';
    }
  }
  if (topContainer) {
    topContainer.style.opacity = hudOpacity;
    topContainer.style.display = 'none';
  }
  if (bottomContainer) {
    bottomContainer.style.opacity = hudOpacity;
    bottomContainer.style.display = 'none';
  }

  updateHealthHud();

  if (hudOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = hudOpacity;

    const cx = state.arena.x + state.arena.width / 2;
    const topY = state.arena.y - 36;

    // Draw round on top (hidden in 1v1, FFA, and Stand Off modes)
    if (mode !== GAME_MODES.ONE_VS_ONE && mode !== '1v1' && mode !== GAME_MODES.STAND_OFF && mode !== GAME_MODES.STAND_OFF_1V2 && mode !== 'Stand Off' && mode !== '1v2 Stand Off' && mode !== GAME_MODES.FFA && mode !== 'FFA') {
        drawPanel(cx - 90, topY, 180, 26, 0.7);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const roundsMax = MODE_SETTINGS[mode]?.rounds || MODE_SETTINGS[GAME_MODES.ONE_VS_ONE].rounds;
        ctx.fillText(`ROUND ${roundNum} OF ${roundsMax}`, cx, topY + 18);
    }

    // Draw rotate message at the bottom
    const bottomY = state.arena.y + state.arena.height + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'italic 12px Arial';
    ctx.fillText('', cx, bottomY);

    ctx.restore();
  }
}
// HUD Cache Map
const _hudCache = {
  teams: new Map(), // teamIndex -> cached team card elements
  fighters: new Map(), // fighter -> cached fighter card elements
};

export function clearHealthHud() {
  _hudCache.teams.clear();
  _hudCache.fighters.clear();

  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  if (!_cachedContainerLeft) _cachedContainerLeft = document.getElementById('healthHudLeft');
  if (!_cachedContainerRight) _cachedContainerRight = document.getElementById('healthHudRight');
  if (_cachedContainerBottom) _cachedContainerBottom.innerHTML = '';
  if (_cachedContainerLeft) _cachedContainerLeft.innerHTML = '';
  if (_cachedContainerRight) _cachedContainerRight.innerHTML = '';
  
  if (!_cachedTopLeft) _cachedTopLeft = document.getElementById('hudTopLeft');
  if (!_cachedTopRight) _cachedTopRight = document.getElementById('hudTopRight');
  if (!_cachedBottomLeft) _cachedBottomLeft = document.getElementById('hudBottomLeft');
  if (!_cachedBottomRight) _cachedBottomRight = document.getElementById('hudBottomRight');
  if (_cachedTopLeft) _cachedTopLeft.innerHTML = '';
  if (_cachedTopRight) _cachedTopRight.innerHTML = '';
  if (_cachedBottomLeft) _cachedBottomLeft.innerHTML = '';
  if (_cachedBottomRight) _cachedBottomRight.innerHTML = '';
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

  // OPTIMIZATION: Auto-rebuild if HUD display mode changed.
  const hudModeChanged = state._lastHudShowFighterDescription !== CONFIG.hudShowFighterDescription;
  state._lastHudShowFighterDescription = CONFIG.hudShowFighterDescription;
  if (hudModeChanged) {
    clearHealthHud();
  }

  // OPTIMIZATION: Throttling HUD updates to prevent extreme DOM reflow lag from progress bars.
  // Fast-ticking cooldown timers change by ~1 every single frame, which used to defeat this
  // throttle entirely. Quantizing them lets per-frame ticking fall through to the periodic
  // refresh below instead of forcing a full HUD recompute on every single frame.
  const is1v2 = mode === GAME_MODES.STAND_OFF_1V2 || mode === '1v2 Stand Off';
  const is2v2 = mode === GAME_MODES.TWO_VS_TWO || mode === '2v2';
  const teamMode = is2v2;

  const currentHpStr = fighters.map(f => f ? Math.round(f.hp) : 0).join(',');
  const q = (v) => Math.round((v || 0) / 4);
  const currentSkillsStr = fighters.map((f, i) => {
    if (!f) return '';
    if (is2v2) return '';
    if (is1v2 && i !== 0) return '';
    const illCount = (f.characterId === 'doppleganger' || f.type === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppelganger')
      ? (state.illusions ? state.illusions.filter(ill => ill && ill.isDoppelganger && ill.hp > 0).length : 0) : 0;
    return `${f.isReloading || false},${f.magazineBullets || 0},${q(f.skillCooldown)},${q(f.cooldownTimer)},${f.domainActive || false},${q(f.beamCharge)},${q(f.beamTimer)},${q(f.shootCooldown)},${illCount},${q(f.totalAccumDamage)},${q(f.throwCooldown)},${q(f.shoutCooldown)}`;
  }).join('|');

  const hpChanged = currentHpStr !== state._lastHpStr;
  const skillsChanged = currentSkillsStr !== state._lastSkillsStr;

  state._lastHpStr = currentHpStr;
  state._lastSkillsStr = currentSkillsStr;

  state._hudFrameCount = (state._hudFrameCount || 0) + 1;

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

  const getSkillDataForFighter = (f) => {
    if (f.characterId === 'gojo' || f.type === 'gojo') {
      const themeColor = '#0055ff'; 
      const domainMax = CONFIG.gojo?.domainCooldown || 2000;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.gojo?.domainDuration || 400;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }

      const activeProjectiles = typeof getProjectiles === 'function' ? getProjectiles() : [];
      const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0 && p.owner === state.fighters?.indexOf(f));
      const purpleMax = CONFIG.gojo?.purpleCooldown || 1500;
      const purpleTimer = f.purpleCooldown !== undefined ? f.purpleCooldown : purpleMax;
      let purplePct;
      if (f.isChannelingPurple) {
        const chargeMax = CONFIG.gojo?.purpleChargeMax || 100;
        const chargeTimer = f.purpleChargeTimer || 0;
        purplePct = Math.max(0, Math.min(100, (1 - chargeTimer / chargeMax) * 100));
      } else if (purpleOrb) {
        const orbMaxLife = CONFIG.gojo?.purpleLife || 250;
        purplePct = Math.max(0, Math.min(100, (purpleOrb.life / orbMaxLife) * 100));
      } else if ((f.purpleRecoveryTimer || 0) > 0) {
        purplePct = 0;
      } else {
        purplePct = Math.max(0, Math.min(100, (1 - (purpleTimer / purpleMax)) * 100));
      }

      const redMax = CONFIG.gojo?.redCooldown || 1000;
      const redTimer = f.redCooldown !== undefined ? f.redCooldown : redMax;
      const redPct = Math.max(0, Math.min(100, (1 - (redTimer / redMax)) * 100));

      const rctMax = CONFIG.gojo?.reverseCursedTechniqueCooldown || 900;
      const rctTimer = f.reverseCursedTechniqueCooldown !== undefined ? f.reverseCursedTechniqueCooldown : 0;
      let rctPct = 0;
      if (f.isChannelingRCT) {
        const rctChannelMax = 90;
        const remaining = f.rctHealTimer || 0;
        rctPct = Math.max(0, Math.min(100, (remaining / rctChannelMax) * 100));
      } else {
        rctPct = Math.max(0, Math.min(100, (1 - (rctTimer / rctMax)) * 100));
      }

      return [
        { id: 'uv',     pct: domainPct, ready: domainPct >= 99, color: themeColor, label: 'UNLIMITED VOID' },
        { id: 'purple', pct: purplePct, ready: purplePct >= 99, color: themeColor, label: 'HOLLOW PURPLE' },
        { id: 'red',    pct: redPct,    ready: redPct >= 99,    color: themeColor, label: 'REVERSAL RED' },
        { id: 'rct',    pct: rctPct,    ready: rctPct >= 99 && !f.isChannelingRCT, color: themeColor, label: 'RCT' },
      ];
    }
    if (f.characterId === 'toji' || f.type === 'toji') {
      const themeColor = '#a855f7';
      const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 55;
      const ambushMax = (CONFIG.toji?.stealthCooldown || 500) - ambushTrigger;
      const rawAmbushTimer = f.stealthCooldown !== undefined ? f.stealthCooldown : 0;
      let ambushPct = 0;
      if (f.stealthTimer > 0) { ambushPct = 0; }
      else {
        const cooldownRemaining = Math.max(0, rawAmbushTimer - ambushTrigger);
        ambushPct = Math.max(0, Math.min(100, (1 - (cooldownRemaining / ambushMax)) * 100));
      }
      if (f.isAmbushing) {
        let ap = 0;
        const ph = f.ambushPhase;
        if (ph === 'FRONT_PAUSE' || ph === 'FRONT_LAUNCH') { ap = 0.05; }
        else if (ph === 'BACK_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushBackChargeDuration || 25))); ap = 0.10 + p * 0.20; }
        else if (ph === 'BACK_STAB' || ph === 'KATANA_DRAW') { ap = 0.35; }
        else if (ph === 'KATANA_CHASE' || ph === 'KATANA_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushKatanaChargeDuration || 30))); ap = 0.40 + p * 0.20; }
        else if (ph === 'KATANA_SLASH') { ap = 0.65; }
        else if (ph === 'PHANTOM_FLURRY') { ap = 0.65 + ((f.phantomStrikeCount || 0) / (CONFIG.toji?.ambushPhantomFlurryStrikes || 10)) * 0.25; }
        else if (ph === 'FINISHER_DASH' || ph === 'FINISHER_SLASH') { ap = 0.95; }
        ambushPct = Math.max(0, 100 - ap * 100);
      }
      const ultMax = f.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 1500;
      const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
      let ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

      if (f.ultimateActive) {
        if (f.ultimatePhase === 'CHANNELING') {
          const chgMax = f.ultimateChargeMax || 90;
          const remainingChg = Math.max(0, chgMax - (f.ultimateChargeTimer || 0));
          ultPct = Math.max(0, Math.min(100, (remainingChg / chgMax) * 100));
        } else {
          const totalMax = CONFIG.toji?.ultimateSwarmDuration || 500;
          const remainingSwarm = Math.max(0, f.ultimateTotalTimer !== undefined ? f.ultimateTotalTimer : totalMax);
          ultPct = Math.max(0, Math.min(100, (remainingSwarm / totalMax) * 100));
        }
      }
      return [
        { id: 'ambush', pct: ambushPct, ready: ambushPct >= 99, color: themeColor, label: 'STEALTH AMBUSH' },
        { id: 'ult',    pct: ultPct,    ready: ultPct >= 99,    color: themeColor, label: 'CURSE INVENTORY' },
      ];
    }
    if (f.characterId === 'sukuna' || f.type === 'sukuna') {
      const themeColor = f.color || '#ff4500';
      const domainMax = CONFIG.sukuna?.domainCooldown || 1200;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.sukuna?.domainDuration || 500;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }

      const flameMax = CONFIG.sukuna?.divineFlameCooldown || 1500;
      const flameTimer = f.divineFlameCooldown !== undefined ? f.divineFlameCooldown : flameMax;
      let flamePct;
      if (f.isChannelingDivineFlame) {
        const chargeMax = f.divineFlameChargeMax || 150;
        const chargeTimer = f.divineFlameChargeTimer || 0;
        flamePct = Math.max(0, Math.min(100, (chargeTimer / chargeMax) * 100));
      } else if ((f.divineFlameRecoveryTimer || 0) > 0) {
        flamePct = 0;
      } else {
        flamePct = Math.max(0, Math.min(100, (1 - (flameTimer / flameMax)) * 100));
      }

      return [
        { id: 'ms',     pct: domainPct,  ready: domainPct >= 99,  color: themeColor, label: 'MALEVOLENT SHRINE' },
        { id: 'fuga',   pct: flamePct,   ready: flamePct >= 99,   color: themeColor, label: 'FUGA (FURNACE)' }
      ];
    }
    if (f.characterId === 'mahoraga' || f.type === 'mahoraga') {
      const themeColor = '#FFD700'; // All skill bars gold theme for Mahoraga!

      // 1. Dharma Wheel Rotation Level Progress Bar (LVL 01 - LVL 08)
      const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
      const currentLevel = Math.min(8, Math.max(1, totalStages + 1));
      const lvlStr = currentLevel < 10 ? `0${currentLevel}` : `${currentLevel}`;

      const isLevel8 = totalStages >= 8 || currentLevel >= 8 || f.isInfinityBlitz;
      const windowThreshold = f.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct || 0.05);

      let wheelPct = 0;
      if (isLevel8 || f.isInfinityBlitz || (f.wheelClickTimer || 0) > 0 || (f.adaptationPauseTimer || 0) > 0) {
        wheelPct = 100;
      } else {
        const accum = f.totalAccumDamage || 0;
        wheelPct = Math.max(0, Math.min(100, (accum / windowThreshold) * 100));
      }

      // 2. Throw Cooldown Progress Bar
      const throwMax = CONFIG.mahoraga?.throwCooldown || 1000;
      const throwTimer = f.throwCooldown !== undefined ? f.throwCooldown : throwMax;
      let throwPct = 0;
      if (f.isThrowing) {
        throwPct = 0;
      } else {
        throwPct = Math.max(0, Math.min(100, (1 - (throwTimer / throwMax)) * 100));
      }

      // Check if renamed to WALL SLAM THROW when reaching Level 8
      const rawThrowLabel = isLevel8 ? 'WALL SLAM THROW' : 'THROW';
      if (!f._throwLabelAnimation) {
        f._throwLabelAnimation = { prev: rawThrowLabel, active: false, timer: 0 };
      }
      if (f._throwLabelAnimation.prev !== rawThrowLabel) {
        f._throwLabelAnimation.prev = rawThrowLabel;
        f._throwLabelAnimation.active = true;
        f._throwLabelAnimation.timer = 20; // 20 frames of simple cross-fade transition
      }

      let throwLabelHtml = rawThrowLabel;
      if (f._throwLabelAnimation.active && f._throwLabelAnimation.timer > 0) {
        f._throwLabelAnimation.timer--;
        // Simple cross-fade: fade out the old text, then fade in the new text
        const opacity = Math.abs(f._throwLabelAnimation.timer - 10) / 10;
        const displayLabel = f._throwLabelAnimation.timer > 10 ? (isLevel8 ? 'THROW' : 'WALL SLAM THROW') : rawThrowLabel;
        throwLabelHtml = `<span style="display: inline-block; opacity: ${opacity.toFixed(2)}; transition: opacity 0.1s ease-in-out;">${displayLabel}</span>`;
        if (f._throwLabelAnimation.timer <= 0) {
          f._throwLabelAnimation.active = false;
        }
      }

      // 3. Divine Shout Cooldown Progress Bar
      const shoutMax = CONFIG.mahoraga?.shoutCooldown || 480;
      const shoutTimer = f.shoutCooldown !== undefined ? f.shoutCooldown : shoutMax;
      let shoutPct = 0;
      if (f.isShouting) {
        shoutPct = 0;
      } else {
        shoutPct = Math.max(0, Math.min(100, (1 - (shoutTimer / shoutMax)) * 100));
      }

      const numHtml = `<span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">${lvlStr}</span>`;

      const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage || 0.10;
      const minLevel8Regen = CONFIG.mahoraga?.maxLevelRctRegen || 0.80;
      const currentRegenRate = isLevel8 ? Math.max(minLevel8Regen, totalStages * rctPerStage) : (totalStages * rctPerStage);
      const currentRegenPerSec = Math.round(currentRegenRate * 60);

      const skillList = [
        { id: 'wheel', pct: wheelPct, ready: wheelPct >= 99, color: themeColor, label: `DHARMA WHEEL - LVL ${numHtml}` },
        { id: 'throw', pct: throwPct, ready: throwPct >= 99, color: themeColor, label: throwLabelHtml },
        { id: 'shout', pct: shoutPct, ready: shoutPct >= 99, color: themeColor, label: 'DIVINE SHOUT' }
      ];

      if (totalStages > 0 || isLevel8) {
        skillList.push({
          id: 'rct',
          pct: 100,
          ready: true,
          color: '#00FF66',
          label: `RCT REGEN: +${currentRegenPerSec}%`
        });
      }

      return skillList;
    }
    if (f.characterId === 'layla' || f.type === 'layla') {
      const themeColor = '#00E5FF'; 
      const bombMax = CONFIG.layla?.maleficBombCooldown || 200;
      const bombTimer = f.maleficBombCooldown !== undefined ? f.maleficBombCooldown : bombMax;
      const bombPct = Math.max(0, Math.min(100, (1 - (bombTimer / bombMax)) * 100));

      const dashMax = CONFIG.layla?.voidDashCooldown || 120;
      const dashTimer = f.voidDashCooldown !== undefined ? f.voidDashCooldown : dashMax;
      const dashPct = Math.max(0, Math.min(100, (1 - (dashTimer / dashMax)) * 100));

      const ultMax = CONFIG.layla?.ultimateCooldown || 600;
      const ultTimer = f.destructionBarrageCooldown !== undefined ? f.destructionBarrageCooldown : ultMax;
      
      let ultPct;
      if (f.isUltimateCharging || f.isUltimateFiring) {
        ultPct = 0;
      } else {
        ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      }

      return [
        { id: 'bomb', pct: bombPct, ready: bombPct >= 99, color: themeColor, label: 'MALEFIC BOMB' },
        { id: 'dash', pct: dashPct, ready: dashPct >= 99, color: themeColor, label: 'VOID PROJECTILE' },
        { id: 'ult',  pct: ultPct,  ready: ultPct >= 99,  color: '#00E5FF', label: 'DESTRUCTION RUSH' }
      ];
    }
    if (f.characterId === 'todo' || f.type === 'todo') {
      const themeColor = f.color || '#eab308';
      const clapMax = CONFIG.todo?.clapCooldown || 60;
      const clapTimer = f.boogieWoogieCooldown !== undefined ? f.boogieWoogieCooldown : clapMax;
      const clapPct = Math.max(0, Math.min(100, (1 - (clapTimer / clapMax)) * 100));

      const rockMax = CONFIG.todo?.rockCooldown || 300;
      const rockTimer = f.rockThrowCooldown !== undefined ? f.rockThrowCooldown : rockMax;
      const rockPct = Math.max(0, Math.min(100, (1 - (rockTimer / rockMax)) * 100));

      return [
        { id: 'clap', pct: clapPct, ready: clapPct >= 99, color: themeColor, label: 'BOOGIE WOOGIE' },
        { id: 'rock', pct: rockPct, ready: rockPct >= 99, color: themeColor, label: 'CURSED ROCK' }
      ];
    }
    if (f.characterId === 'yuji' || f.type === 'yuji') {
      const themeColor = '#ff3366';
      
      const comboMax = CONFIG.yuji?.comboRushCooldown || 600;
      const comboTimer = f.comboRushCooldown !== undefined ? f.comboRushCooldown : comboMax;
      const comboPct = Math.max(0, Math.min(100, (1 - (comboTimer / comboMax)) * 100));

      const bfThreshold = f.soulSwapActive 
        ? (CONFIG.yuji?.soulSwapBlackFlashThreshold || 2)
        : (f.blackFlashThreshold || CONFIG.yuji?.blackFlashThreshold || 4);
      const bfThresholdPct = Math.max(0, Math.min(100, ((f.blackFlashCharge || 0) / bfThreshold) * 100));

      let ultPct = 0;
      let ultReady = false;

      if (f.soulSwapActive) {
        const ultDuration = CONFIG.yuji?.soulSwapDuration || 500;
        ultPct = Math.max(0, Math.min(100, ((f.soulSwapTimer || 0) / ultDuration) * 100));
      } else if (f.hasSoulSwapped) {
        ultPct = 0;
      } else {
        const ultThresholdHp = CONFIG.yuji?.soulSwapHpThreshold || 0.30;
        ultPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - ultThresholdHp)) * 100));
        ultReady = ultPct >= 99 && (f.hp / f.maxHp <= ultThresholdHp);
      }

      return [
        { id: 'combo',        pct: comboPct,       ready: comboPct >= 99,       color: themeColor, label: 'DIVERGENT FIST' },
        { id: 'bf_threshold', pct: bfThresholdPct, ready: bfThresholdPct >= 99, color: themeColor, label: 'BLACK FLASH CHARGE' },
        { id: 'ult',          pct: ultPct,         ready: ultReady,             color: themeColor, label: 'SOUL SWAP' }
      ];
    }
    if (f.characterId === 'saitama' || f.type === 'saitama') {
      const themeColor = '#F5C400';
      const skillMax = CONFIG.saitama?.skillPunishCooldown || 2000;
      const skillTimer = f.skillPunishCooldown !== undefined ? f.skillPunishCooldown : 0;
      const skillPct = Math.max(0, Math.min(100, (1 - (skillTimer / skillMax)) * 100));

      return [
        { id: 'counter', pct: skillPct, ready: skillPct >= 99, color: themeColor, label: 'Serious Punch' }
      ];
    }
    if (f.characterId === 'genos' || f.type === 'genos') {
      const themeColor = '#FF5500';

      // 1. Heat Ammo Bar
      const maxAmmo = f.maxHeatAmmo || CONFIG.genos?.maxHeatAmmo || 20;
      const currentAmmo = f.heatAmmo !== undefined ? f.heatAmmo : maxAmmo;
      let ammoPct = 0;
      let ammoReady = false;
      let ammoLabel = 'HEAT AMMO';
      if (f.ammoReloadTimer > 0) {
        const reloadMax = f.ammoReloadMax || CONFIG.genos?.ammoReloadFrames || 300;
        ammoPct = Math.max(0, Math.min(100, (1 - (f.ammoReloadTimer / reloadMax)) * 100));
        ammoReady = false;
        ammoLabel = 'RELOADING AMMO...';
      } else {
        ammoPct = Math.max(0, Math.min(100, (currentAmmo / maxAmmo) * 100));
        ammoReady = currentAmmo > 0;
      }

      // 2. Machine Gun Blows
      const flurryMax = CONFIG.genos?.flurryCooldown || 480;
      const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : 0;
      const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));

      // 3. Incineration Cannon
      const ultMax = CONFIG.genos?.ultCooldown || 1680;
      const ultTimer = f.ultCooldown !== undefined ? f.ultCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

      // 4. Core Overload (Self-Destruct)
      let sdPct = 0;
      let sdReady = false;
      let sdColor = '#FF3300';
      let sdLabel = 'CORE OVERLOAD';

      if (f.isSelfDestructing) {
        const sdMax = CONFIG.genos?.selfDestructCountdownFrames || 150;
        const remaining = f.selfDestructTimer || 0;
        sdPct = Math.max(0, Math.min(100, (remaining / sdMax) * 100));
        sdReady = true;
        sdColor = '#FF0000';
        sdLabel = 'OVERLOAD DETONATING...';
      } else if (f.usedSelfDestruct) {
        sdPct = 0;
        sdReady = false;
        sdColor = '#555555';
        sdLabel = 'OVERLOAD USED';
      } else {
        const threshold = 0.10;
        const currentHpRatio = f.hp / f.maxHp;
        if (currentHpRatio <= threshold) {
          sdPct = 100;
          sdReady = true;
          sdColor = '#FF3300';
          sdLabel = 'CORE OVERLOAD READY';
        } else {
          sdPct = Math.max(0, Math.min(100, ((1 - currentHpRatio) / (1 - threshold)) * 100));
          sdReady = false;
          sdColor = '#FF5500';
          sdLabel = 'CORE OVERLOAD';
        }
      }

      return [
        { id: 'ammo',         pct: ammoPct,   ready: ammoReady,       color: '#FF8800', label: ammoLabel },
        { id: 'flurry',       pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'MACHINE GUN BLOWS' },
        { id: 'ult',          pct: ultPct,    ready: ultPct >= 99,    color: themeColor, label: 'INCINERATION CANNON' },
        { id: 'selfdestruct', pct: sdPct,     ready: sdReady,        color: sdColor,   label: sdLabel }
      ];
    }
    if (f.characterId === 'cronos' || f.type === 'cronos') {
      const themeColor = f.color || '#00e5ff';
      const sphereMax = CONFIG.cronos?.sphereCooldown || 1200;
      const sphereTimer = f.sphereCooldown !== undefined ? f.sphereCooldown : sphereMax;
      const spherePct = Math.max(0, Math.min(100, (1 - (sphereTimer / sphereMax)) * 100));
      return [{ id: 'sphere', pct: spherePct, ready: spherePct >= 99, color: themeColor, label: 'TIME SPHERE' }];
    }
    if (f.characterId === 'musashi' || f.type === 'musashi') {
      const themeColor = f.color || '#3cb371';
      const flurryMax = CONFIG.musashi?.flurryCooldown || 900;
      const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : flurryMax;
      const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
      return [{ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'NITEN ICHIRYU FLURRY' }];
    }
    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const themeColor = '#ff69b4';

      let rikaPct = 0;
      const rk = f.rika;
      const isInsideDomain = f.domainActive || f.isChannelingDomain;
      const alreadySummoned = rk && rk.hasSummonedAt50Hp;

      if (rk && rk.active && !rk.isDying) {
        // Rika is ALIVE & ACTIVE: bar = Rika's remaining HP % (reaches 0% naturally during beam drain)
        const maxHp = rk.maxHp || CONFIG.yuta?.rikaMaxHp || 250;
        rikaPct = Math.max(0, Math.min(100, (rk.hp / maxHp) * 100));
      } else if (f.rikaCallTimer > 0) {
        // Yuta is channeling the call: 100% full
        rikaPct = 100;
      } else if (alreadySummoned) {
        // Rika is DEAD (inside OR outside domain): Fills up smoothly as Yuta takes damage since Rika died!
        const baseline = f.rikaRechargeHpBaseline !== undefined ? f.rikaRechargeHpBaseline : f.hp;
        const reqDamage = (f.maxHp || 200) * (CONFIG.yuta?.rikaRechargeHpRatio ?? 0.50);
        const damageTaken = Math.max(0, baseline - f.hp);
        rikaPct = Math.max(0, Math.min(100, (damageTaken / reqDamage) * 100));
      } else {
        // First time filling: pure Yuta lost-HP based (0% at 100%HP → 100% at 50%HP)
        const threshold = CONFIG.yuta?.rikaSummonHpThreshold ?? 0.5;
        rikaPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - threshold)) * 100));
      }

      // Smooth visual lerp — but snap instantly on big jumps, calling Rika, or during beam (so drain tracks in real-time)
      const isBeamActive = f.isChannelingPureLoveBeam || f.isFiringPureLoveBeam || (f.rikaEmergingForBeamTimer || 0) > 0;
      if (typeof f._smoothRikaPct !== 'number' || Math.abs(f._smoothRikaPct - rikaPct) > 30 || f.rikaCallTimer > 0 || isBeamActive) {
        f._smoothRikaPct = rikaPct;
      } else {
        f._smoothRikaPct += (rikaPct - f._smoothRikaPct) * 0.15;
      }
      rikaPct = Math.max(0, Math.min(100, f._smoothRikaPct));

      const domainHpThreshold = CONFIG.yuta?.domainHpThreshold ?? 0.80;
      let domainPct;
      if (f.isChannelingDomain) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.yuta?.domainDuration || 800;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else if (f.domainUseCount === 0) {
        // Fills up as Yuta takes damage down to 80% HP for 1st Domain
        domainPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - domainHpThreshold)) * 100));
      } else if (f.domainUseCount === 1) {
        // Fills up as Yuta takes new damage AFTER 1st domain ends for 2nd Domain
        const hpNeeded = (f.maxHp || 200) * (CONFIG.yuta?.domain2HpDamageRequired ?? 0.20);
        const hpLost = f.domain2DamageTaken || 0;
        domainPct = Math.max(0, Math.min(100, (hpLost / hpNeeded) * 100));
      } else {
        domainPct = 0; // Exhausted both domain uses
      }

      let beamPct = 0;
      const beamCdTimer = f.pureLoveBeamCooldownTimer || 0;
      const beamCdMax = CONFIG.yuta?.pureLoveBeamCooldown || 1200;
      if (f.isChannelingPureLoveBeam) {
        beamPct = 100;
      } else if (f.isFiringPureLoveBeam || (f.rikaEmergingForBeamTimer || 0) > 0) {
        beamPct = 0; // Pure Love Beam is actively emerging/firing — bar stays 0%!
      } else if (beamCdTimer > 0) {
        beamPct = Math.max(0, Math.min(100, (1 - (beamCdTimer / beamCdMax)) * 100));
      } else {
        const beamThreshold = CONFIG.yuta?.pureLoveBeamHpThreshold ?? 0.15;
        beamPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - beamThreshold)) * 100));
      }

      return [
        { id: 'rika',   pct: rikaPct,   ready: rikaPct >= 99 && (!rk || !rk.active), color: themeColor, label: 'RIKA SUMMON' },
        { id: 'domain', pct: domainPct, ready: domainPct >= 99 && !f.domainActive,   color: themeColor, label: 'AUTHENTIC MUTUAL LOVE' },
        { id: 'beam',   pct: beamPct,   ready: beamPct >= 99 && (rk && rk.active) && beamCdTimer <= 0, color: themeColor, label: 'PURE LOVE BEAM' }
      ];
    }
    if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
      const themeColor = f.color || '#eab308';
      let pct = 0;

      if (f.isReloading) {
        const reloadTime = CONFIG.gunslinger?.reloadTime || 90;
        pct = Math.max(0, Math.min(100, (f.reloadTimer / reloadTime) * 100));
      } else {
        pct = Math.max(0, Math.min(100, (1 - (f.magazineBullets || 0) / (f.maxMagazine || 24)) * 100));
      }

      return [
        { id: 'rapidfire', pct: pct, ready: pct >= 99 && !f.isReloading, color: themeColor, label: 'RAPID FIRE' }
      ];
    }

    if (f.characterId === 'laser' || f.type === 'laser') {
      const themeColor = f.color || '#ffaa00';
      const windupMax = CONFIG.laser?.windupDuration || 150;
      const beamMax = CONFIG.laser?.beamDuration || 100;
      const cooldownMax = f.shootCooldownMax || CONFIG.laser?.cooldown || 300;

      let pct = 0;
      let ready = false;

      if (f.beamTimer > 0) {
        pct = Math.max(0, Math.min(100, (f.beamTimer / beamMax) * 100));
        ready = false;
      } else if (f.beamCharge > 0) {
        pct = Math.max(0, Math.min(100, (f.beamCharge / windupMax) * 100));
        ready = f.beamCharge >= windupMax;
      } else if (f.shootCooldown > 0) {
        pct = Math.max(0, Math.min(100, (1 - f.shootCooldown / cooldownMax) * 100));
        ready = false;
      } else {
        pct = 100;
        ready = true;
      }

      return [
        { id: 'laser_beam', pct: pct, ready: ready, color: themeColor, label: 'LASER BEAM' }
      ];
    }

    if (f.characterId === 'zeus' || f.type === 'zeus') {
      const themeColor = f.color || '#00BFFF';
      
      const aegisMax = CONFIG.zeus?.aegisCooldown || 300;
      const aegisTimer = f.aegisCooldown || 0;
      const aegisPct = Math.max(0, Math.min(100, (1 - (aegisTimer / aegisMax)) * 100));
      const aegisReady = aegisPct >= 99;

      const stormMax = CONFIG.zeus?.stormCooldown || 900;
      const stormTimer = f.stormCooldown !== undefined ? f.stormCooldown : stormMax;
      let stormPct = 0;
      let stormReady = false;

      if (f.isChargingStorm) {
        const teleMax = CONFIG.zeus?.stormTelegraphFrames || 120;
        stormPct = Math.max(0, Math.min(100, (1 - f.stormCooldown / teleMax) * 100));
        stormReady = false;
      } else if (f.stormActive) {
        const durationMax = CONFIG.zeus?.stormDuration || 130;
        stormPct = Math.max(0, Math.min(100, (f.stormTimer / durationMax) * 100));
        stormReady = false;
      } else {
        stormPct = Math.max(0, Math.min(100, (1 - (stormTimer / stormMax)) * 100));
        stormReady = stormPct >= 99;
      }

      return [
        { id: 'aegis', pct: aegisPct, ready: aegisReady, color: themeColor, label: 'AEGIS SHIELD' },
        { id: 'storm', pct: stormPct, ready: stormReady, color: themeColor, label: 'ULTIMATE STORM' }
      ];
    }

    if (f.characterId === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppleganger' || f.type === 'doppelganger') {
      return [];
    }

    let current = 0;
    let max = 1;
    if (f.skillCooldown !== undefined) {
      current = f.skillCooldown;
      max = (CONFIG[f.type] && CONFIG[f.type].skillCooldown) || 100;
    } else if (f.cooldownTimer !== undefined) {
      current = f.cooldownTimer;
      max = f.cooldown || f.shootCooldownMax || 100;
    }
    const skillPct = Math.max(0, Math.min(100, (1 - (current / max)) * 100));
    
    const color = f.color || '#a491d3';
    const def = f.fighterIndex !== undefined ? FIGHTER_DEFS[f.fighterIndex] : null;
    const ability = def ? (def.ability || def.name) : 'Skill';
    return [{ id: 'skill', pct: skillPct, ready: skillPct >= 99, color, label: ability.toUpperCase() }];
  };

  const getAdditionalInfoForFighter = (f) => {
    const info = [];
    const baseDmg = Math.max(0, Number(f.damage) || 0);

    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const isRikaAlive = typeof f.isRikaAliveInDomain === 'function' ? f.isRikaAliveInDomain() : (f.rika && f.rika.active && !f.rika.isDying);
      
      if (isRikaAlive) {
        const dmgMult = typeof f.getRikaDamageMultiplier === 'function' ? f.getRikaDamageMultiplier() : (CONFIG.yuta?.domainRikaDamageMultiplier || 2.0);
        const boostDmg = Math.round(baseDmg * (dmgMult - 1));
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }
      
      const isGuarding = (f.blockPoseTimer || 0) > 0;
      const baseParryRatio = isGuarding ? (CONFIG.yuta?.parryActiveChance ?? 0.90) : (CONFIG.yuta?.parryPassiveChance ?? 0.90);
      const parryStacks = f.parryStacks || 0;
      const parryBonus = Math.round(parryStacks * (CONFIG.yuta?.parryChancePerStack ?? 0.05) * 100);
      const baseParryVal = Math.round(baseParryRatio * 100);
      const totalParryVal = Math.min(98, baseParryVal + parryBonus);

      const isSummoningRika = typeof f.isSummoningRika === 'function' ? f.isSummoningRika() : ((f.rikaCallTimer || 0) > 0 || (f.rika && ((f.rika.chargeTimer || 0) > 0 || (f.rika.spawnTimer || 0) > 0)));

      if (isSummoningRika) {
        info.push(`<b>Parry Chance:</b> 0% <span style="color: #ef4444; font-size: 10px;">(Summoning)</span>`);
      } else if (parryBonus > 0) {
        info.push(`<b>Parry Chance:</b> ${baseParryVal}% + ${parryBonus}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else if (isGuarding) {
        info.push(`<b>Parry Chance:</b> ${totalParryVal}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Parry Chance:</b> ${totalParryVal}%`);
      }

      const baseRegen = CONFIG.yuta?.regenRate || 0.05;
      if (f.domainActive || isRikaAlive) {
        const regenMult = typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (CONFIG.yuta?.domainRikaRegenMultiplier || 2.0);
        const domainRctHealRate = CONFIG.yuta?.domainRctHealRate || 0.45;
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
    } else {
      info.push(`<b>DMG:</b> ${baseDmg}`);
      
      if (f.characterId === 'gojo' || f.type === 'gojo') {
        const infinityCooldown = f.infinityCooldown || 0;
        const isLimitlessActive = (!f.isMeleeMode && (infinityCooldown <= 0 || f.infinityActive || (f.infinityBlockTimer || 0) > 0));
        if (f.isMeleeMode) {
          info.push(`<b>Infinity:</b> Off`);
        } else if (isLimitlessActive) {
          info.push(`<b>Infinity:</b> Active`);
        } else {
          info.push(`<b>Infinity:</b> CD`);
        }
      } else if (f.characterId === 'layla' || f.type === 'layla') {
        if (f.powerStacks > 0) {
          info.push(`<b>Power Stacks:</b> ${f.powerStacks}/${f.maxStacks || 10} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
        if (f.isInUltimate) {
          info.push(`<b>Ultimate:</b> Rapid Fire <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'todo' || f.type === 'todo') {
        if (f.blackFlashTimer > 0) {
          info.push(`<b>The Zone:</b> 120% Potential <span style="color: #15803d; font-size: 10px;">▲</span>`);
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
        info.push(`<b>Slash Stacks:</b> ${f.slashHitCount || 0}`);
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
        info.push(`<b>Dodge:</b> ${Math.round((CONFIG.toji?.stealthDodgeChance || 0.10) * 100)}%`);
      } else if (f.characterId === 'cronos' || f.type === 'cronos') {
        const baseSpeed = (f.baseSpeed || 5.0) * (MODE_SPEED_MULTIPLIER[state.mode] || 1);
        const currentSpeed = f.speed !== undefined ? f.speed : baseSpeed;
        info.push(`<b>Speed:</b> ${currentSpeed.toFixed(1)}`);
      } else if (f.characterId === 'musashi' || f.type === 'musashi') {
        const stanceName = f.currentStance === 1 ? 'ICHI NO TACHI' : f.currentStance === 2 ? 'NI NO TACHI' : 'SAN NO TACHI';
        info.push(`<b>Stance:</b> ${stanceName}`);
      } else if (f.characterId === 'saitama' || f.type === 'saitama') {
        const dodgeRate = Math.round((f.dodgeChance !== undefined ? f.dodgeChance : (CONFIG.saitama?.dodgeChance ?? 0.99)) * 100);
        info.push(`<b>Dodge Chance:</b> ${dodgeRate}%`);
        info.push(`<b>Push-ups:</b> 100`);
        info.push(`<b>Sit-ups:</b> 100`);
        info.push(`<b>Squats:</b> 100`);
        info.push(`<b>Run:</b> 10 km`);
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
      } else if (f.characterId === 'zeus' || f.type === 'zeus') {
        if ((f.aegisTimer || 0) > 0) {
          info.push(`<b>Aegis:</b> ACTIVE <span style="color: #15803d; font-size: 10px;">▲</span>`);
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
          info.push(`<b>Parry Chance:</b> ${baseParry}% + ${bonusParry}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Parry Chance:</b> ${baseParry}%`);
        }

        const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
        const isLevel8 = totalStages >= 8 || f.isInfinityBlitz || f.isMaxAdapted;
        const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage || 0.10;
        const minLevel8Regen = CONFIG.mahoraga?.maxLevelRctRegen || 0.80;
        const currentRegenRate = isLevel8 ? Math.max(minLevel8Regen, totalStages * rctPerStage) : (totalStages * rctPerStage);
        const currentRegenPerSec = Math.round(currentRegenRate * 60);

        if (totalStages > 0 || isLevel8) {
          info.push(`<b>Regen:</b> +${currentRegenPerSec}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> 0%`);
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
      }
    }

    // Tick Damage
    if (f.tickDamageTimer > 0 && f.tickDamage > 0) {
      info.push(`<b>Tick DMG:</b> ${f.tickDamage}/tick <span style="color: #ef4444; font-size: 10px;">▼</span>`);
    }

    return info;
  };

  const generateFighterSkillsHTML = (f, align) => {
    const skills = getSkillDataForFighter(f);
    return skills.map(s => {
      let fontSz = CONFIG.hudSkillFontSize || 13;
      const plainTextLen = s.label ? s.label.replace(/<[^>]*>/g, '').length : 0;
      if (plainTextLen > 32) fontSz = 9.5;
      else if (plainTextLen > 24) fontSz = 11;
      const textStyle = `font-size: ${fontSz}px; text-align: ${align}; white-space: nowrap;`;
      if (s.noFill) {
        const parentColor = s.color ? `color: ${s.color};` : '';
        return `
          <div class="hud-skill-box align-${align} label-only" data-skill-id="${s.id}" style="${parentColor} justify-content: ${align === 'right' ? 'flex-end' : 'flex-start'};">
            <div class="hud-skill-box-fill" style="display: none;"></div>
            <div class="hud-skill-box-text" style="${textStyle}">${s.label}</div>
          </div>
        `;
      }
      const boxStyle = `--skill-glow-color: ${s.color}; margin-top: 4px;`;
      const fillStyle = `width: ${Math.round(s.pct)}%; background: ${s.color};`;
      return `
        <div class="hud-skill-box align-${align}${s.ready ? ' hud-skill-ready' : ''}" data-skill-id="${s.id}" style="${boxStyle}">
          <div class="hud-skill-box-fill" style="${fillStyle}"></div>
          <div class="hud-skill-box-text" style="${textStyle}">${s.label}</div>
        </div>
      `;
    }).join('');
  };

  const generateFighterInfoHTML = (f) => {
    let info = getAdditionalInfoForFighter(f);
    const isDummy = f.characterId === 'dummy' || f.type === 'dummy';
    if (CONFIG.hudShowFighterDescription && !isDummy) {
      info = info.filter(line => line.includes('<b>DMG:</b>') || line.includes('<b>Tick DMG:</b>') || line.includes('<b>Stun Chance:</b>') || line.includes('<b>Illusions:</b>') || line.includes('<b>Dodge Chance:</b>') || line.includes('<b>Push-ups:</b>') || line.includes('<b>Sit-ups:</b>') || line.includes('<b>Squats:</b>') || line.includes('<b>Run:</b>'));
    }
    if (info.length === 0) return '';
    
    if (!f._prevHudValues) {
      f._prevHudValues = {};
      f._hudGlowTimers = {};
    }

    const getLabelBoostArrow = (labelText, valStr, fighter) => {
      return '';
    };
    
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
      
      if (labelText) {
        const prevVal = f._prevHudValues[labelText];
        
        if (prevVal !== undefined && prevVal !== textOnlyVal) {
          let isIncrease = true;
          
          const parseVal = (str) => {
            return str.split('+').reduce((acc, part) => {
              const mulParts = part.split(/[*x]/);
              const partVal = mulParts.reduce((mulAcc, p, idx) => {
                const num = parseFloat(p) || 0;
                return idx === 0 ? num : mulAcc * num;
              }, 1);
              return acc + partVal;
            }, 0);
          };
          const prevNum = parseVal(prevVal);
          const currNum = parseVal(textOnlyVal);
          
          if (!isNaN(prevNum) && !isNaN(currNum) && prevNum !== currNum) {
            isIncrease = currNum > prevNum;
          } else {
            if (textOnlyVal.includes('CD') || prevVal.includes('Active')) {
              isIncrease = false;
            }
          }
          
          f._hudGlowTimers[labelText] = isIncrease ? 45 : -45;
        }
        
        f._prevHudValues[labelText] = textOnlyVal;
        
        const timer = f._hudGlowTimers[labelText] || 0;
        if (timer > 0) f._hudGlowTimers[labelText]--;
        else if (timer < 0) f._hudGlowTimers[labelText]++;
      }
      
      let glowClass = '';
      if (labelText) {
        const timer = f._hudGlowTimers[labelText] || 0;
        if (timer > 0) glowClass = ' glow-green';
        else if (timer < 0) glowClass = ' glow-red';
      }
      
      const baseValSize = (CONFIG.hudInfoFontSize || 15) * 0.86;
      let valFontSize = baseValSize;
      const textOnly = textOnlyVal;
      if (textOnly.length > 14) {
        valFontSize = Math.max(baseValSize * 0.8, baseValSize - (textOnly.length - 14) * 0.4);
      }
      
      if (splitIdx !== -1) {
        return `<div class="${glowClass}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}<span style="font-size: ${valFontSize.toFixed(1)}px; margin-left: 2px;">${displayVal}</span></div>`;
      }
      return `<div class="${glowClass}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${line}</div>`;
    }).join('');

    return `
      <div class="health-card__info" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 15}px;">
        ${linesHTML}
      </div>
    `;
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

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5, targetFighter = null, titleAlign = 'left' }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const winnerStyle = '';

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map(m => {
        const ratio = m.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(m.hp) / Number(m.maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        const { className } = getGlowStyles(m);
        const hpText = `${Math.floor(Math.min(Number(m.maxHp), Math.max(0, Number(m.hp) || 0)))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}`;
        const memberShakeTimer = m._healthBarShakeTimer || 0;
        const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
        const memberShakeStyle = memberShakeTimer > 0 ? `transform: translateX(${memberShakeAmount}px);` : '';
        return `
          <div class="health-card__member" style="margin-top: 6px;">
            <div style="font-size: 12px; margin-bottom: 4px; color: ${CONFIG.hudTextColor}; font-weight: bold;">${m.name || ('PLAYER ' + (state.fighters.indexOf(m) + 1))}</div>
            <div class="health-card__bar" style="${memberShakeStyle}">
              <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
              <span class="health-card__bar-text">${hpText}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      const percent = Math.round(safeRatio * 100);
      const barColor = safeRatio > 0.5 ? '#22c55e' : safeRatio > 0.25 ? '#eab308' : '#ef4444';
      const { className } = getGlowStyles(targetFighter);
      
      const isDummy = targetFighter && (targetFighter.characterId === 'dummy' || targetFighter.type === 'dummy');
      const showDescription = CONFIG.hudShowFighterDescription || isDummy;
      const skillsHTML = targetFighter && !showDescription ? generateFighterSkillsHTML(targetFighter, 'left') : '';
      const infoHTML = targetFighter ? generateFighterInfoHTML(targetFighter) : '';

      const barShakeTimer = targetFighter ? (targetFighter._healthBarShakeTimer || 0) : 0;
      const barShakeAmount = barShakeTimer > 0 ? Math.sin((12 - barShakeTimer) * 0.75) * 3 : 0;
      const barShakeStyle = barShakeTimer > 0 ? `transform: translateX(${barShakeAmount}px);` : '';

      barsHTML = `
        <div class="health-card__bar" style="${barShakeStyle}">
          <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
          <span class="health-card__bar-text">${metaValue}</span>
        </div>
        ${showDescription ? `
          ${infoHTML}
          <div class="health-card__desc" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudDescFontSize || 16}px; line-height: 1.4; margin-top: 8px;">
            ${description.replace(/(\d+(?:\.\d+)?%?)/g, '<span class="hud-number">$1</span>')}
          </div>
        ` : `
          <div class="health-card__skills">
            ${skillsHTML}
          </div>
          ${infoHTML}
        `}
      `;
    }

    const baseFontSize = extraClass.includes('ffa-card') ? 16 : (CONFIG.hudTitleFontSize || 20);
    const maxChars = extraClass.includes('ffa-card') ? 14 : 12;
    let nameColor = fighterColor || '#ffffff';
    let truncatedTitle = title;
    if (title && title.length > maxChars) {
      truncatedTitle = title.substring(0, maxChars - 1) + '…';
    }

    const titleStyle = `font-size: ${baseFontSize}px; text-transform: uppercase; font-family: 'Glast Blitch', Arial, sans-serif; letter-spacing: 0.5px; `;

    const winsBullets = Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      return `<div class="health-card__win-bullet ${filled ? 'filled' : ''}"></div>`;
    }).join('');
    const winsHTML = maxBullets > 0 ? `<div class="health-card__wins" style="display: flex; gap: 4px; align-items: center;">${winsBullets}</div>` : '';

    const headerRowHTML = `
      <div class="health-card__header-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-direction: ${titleAlign === 'right' ? 'row-reverse' : 'row'}; margin-bottom: 6px;">
        ${title ? `<div class="health-card__title" style="${titleStyle}color: ${nameColor}; font-weight: bold; margin: 0; text-align: ${titleAlign};">${truncatedTitle}</div>` : ''}
        ${winsHTML}
      </div>
    `;

    return `
      <div class="health-card ${extraClass}" style="${winnerStyle} background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none;">
        ${headerRowHTML}
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
        const ratio = soloFighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(soloFighter.hp) / Number(soloFighter.maxHp))) : 0;
        const color = soloFighter.color || '#fff';
        let nameColor = color;
        const fType = (soloFighter.type || soloFighter.characterId || (soloFighter._def && soloFighter._def.type) || '').toLowerCase();
        if (fType === 'gojo') nameColor = '#00E5FF';        // Cyan name
        else if (fType === 'yuta') nameColor = '#FF69B4';   // Pink name
        else if (fType === 'mahoraga') nameColor = '#FFD700'; // Gold name
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
          metaLabel: `DMG: ${Math.max(0, Number(soloFighter.damage) || 0)}`,
          metaValue: `${Math.floor(Math.max(0, Number(soloFighter.hp) || 0))}/${Math.floor(Math.max(0, Number(soloFighter.maxHp) || 0))}`,
          extraClass: 'red',
          borderColor: color,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: soloFighter === state.roundWinner,
          description: cardDesc,
          kills: state.matchKills ? state.matchKills[0] || [] : [],
          maxBullets: 0,
          targetFighter: soloFighter,
          titleAlign: 'left'
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = soloCardHTML;
        const soloCardElement = tempDiv.firstElementChild;
        containerBottom.appendChild(soloCardElement);

        const hpBar = soloCardElement.querySelector('.health-card__bar');
        const hpBarFill = soloCardElement.querySelector('.health-card__fill');
        const hpBarText = soloCardElement.querySelector('.health-card__bar-text');
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
          winBullets,
          infoContainer,
          checkbox,
          skillBars,
          lastInfoHTML: ''
        });
      }

      // Opponent Team (fighters[1], fighters[2])
      const oppMembers = [fighters[1], fighters[2]].filter(Boolean);
      const oppShakeTimer = oppMembers.reduce((max, fighter) => Math.max(max, fighter._healthBarShakeTimer || 0), 0);
      const isOppWinner = state.roundWinner && oppMembers.includes(state.roundWinner);

      const oppCardHTML = buildCard({
        title: 'BLUE TEAM',
        scoreText: `${teamScores[1] || 0} WINS`,
        fillColor: '#4da3ff',
        members: oppMembers,
        extraClass: 'blue',
        shakeTimer: oppShakeTimer,
        isWinner: isOppWinner,
        borderColor: isOppWinner ? '#ffd700' : null,
        kills: oppMembers.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
        maxBullets: 0,
        titleAlign: 'right'
      });

      const tempDiv2 = document.createElement('div');
      tempDiv2.innerHTML = oppCardHTML;
      const oppCardElement = tempDiv2.firstElementChild;
      containerBottom.appendChild(oppCardElement);

      const cachedOppMembers = [];
      oppCardElement.querySelectorAll('.health-card__member').forEach((memberEl, i) => {
        const fill = memberEl.querySelector('.health-card__fill');
        const text = memberEl.querySelector('.health-card__bar-text');
        const bar = memberEl.querySelector('.health-card__bar');
        cachedOppMembers.push({ fill, text, bar, fighter: oppMembers[i] });
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
          extraClass: team.key,
          shakeTimer,
          isWinner: isWinner,
          borderColor: isWinner ? '#ffd700' : null,
          kills: members.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
          maxBullets: 3,
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
          cachedMembers.push({ fill, text, bar, fighter: members[i] });
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
        let nameColor = color;
        const fType = (fighter.type || fighter.characterId || (fighter._def && fighter._def.type) || '').toLowerCase();
        if (fType === 'gojo') nameColor = '#00E5FF';        // Cyan name
        else if (fType === 'yuta') nameColor = '#FF69B4';   // Pink name
        else if (fType === 'mahoraga') nameColor = '#FFD700'; // Gold name
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

        const cardHTML = buildCard({
          title: fighterName,
          scoreText: totalGames > 0 ? `${winRate}% WR` : '',
          fillColor: color,
          fillRatio: ratio,
          metaLabel: `DMG: ${Math.max(0, Number(fighter.damage) || 0)}`,
          metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
          extraClass: mode === GAME_MODES.FFA ? 'ffa-card' : '',
          borderColor: color,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: fighter === state.roundWinner,
          description: cardDesc,
          kills: (mode === GAME_MODES.FFA) && state.matchKills ? state.matchKills[index] || [] : [],
          maxBullets: (mode === GAME_MODES.STAND_OFF || mode === GAME_MODES.FFA) ? 0 : 2,
          targetFighter: fighter,
          titleAlign: (index % 2 === 0 ? 'left' : 'right')
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;

        if (mode === GAME_MODES.FFA || mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'TLFS') {
          containerBottom.appendChild(cardElement);
        } else if (index % 2 === 0) {
          containerLeft.appendChild(cardElement);
        } else {
          containerRight.appendChild(cardElement);
        }

        const hpBar = cardElement.querySelector('.health-card__bar');
        const hpBarFill = cardElement.querySelector('.health-card__fill');
        const hpBarText = cardElement.querySelector('.health-card__bar-text');
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

        const ratio = fighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(fighter.hp) / Number(fighter.maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        const glow = getGlowStyles(fighter);
        
        m.fill.style.width = `${percent}%`;
        m.fill.style.background = barColor;
        m.fill.style.boxShadow = glow.boxShadow || '';
        m.fill.style.filter = glow.filter || '';
        m.fill.className = glow.className || 'health-card__fill';
        
        if (m.bar) {
          m.bar.className = `health-card__bar${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
          const memberShakeTimer = fighter._healthBarShakeTimer || 0;
          const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
          m.bar.style.transform = memberShakeTimer > 0 ? `translateX(${memberShakeAmount}px)` : '';
        }

        const hpText = `${Math.floor(Math.min(Number(fighter.maxHp), Math.max(0, Number(fighter.hp) || 0)))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`;
        m.text.textContent = hpText;
      });

      cachedCard.cardElement.style.transform = '';
    });
  }
  if (_hudCache.fighters.size > 0) {
    fighters.forEach((fighter, index) => {
      if (!fighter || fighter.isTurret) return;
      const cachedCard = _hudCache.fighters.get(fighter);
      if (!cachedCard) return;

      const ratio = fighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(fighter.hp) / Number(fighter.maxHp))) : 0;
      const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
      const glow = getGlowStyles(fighter);

      if (cachedCard.hpBarFill) {
        cachedCard.hpBarFill.style.width = `${percent}%`;
        cachedCard.hpBarFill.style.background = barColor;
        cachedCard.hpBarFill.style.boxShadow = glow.boxShadow || '';
        cachedCard.hpBarFill.style.filter = glow.filter || '';
        cachedCard.hpBarFill.className = glow.className || 'health-card__fill';
      }

      if (cachedCard.hpBar) {
        cachedCard.hpBar.className = `health-card__bar${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
        const shakeTimer = fighter._healthBarShakeTimer || 0;
        const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
        cachedCard.hpBar.style.transform = shakeTimer > 0 ? `translateX(${shakeAmount}px)` : '';
      }

      if (cachedCard.hpBarText) {
        const metaValue = `${Math.floor(Math.min(Number(fighter.maxHp), Math.max(0, Number(fighter.hp) || 0)))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`;
        cachedCard.hpBarText.textContent = metaValue;
      }

      cachedCard.cardElement.style.transform = '';

      // 3. Wins bullets
      const matchWins = scores[index] || 0;
      cachedCard.winBullets.forEach((bullet, i) => {
        const filled = i < matchWins;
        if (filled) {
          bullet.classList.add('filled');
          bullet.style.background = fighter.color || '#ffd700';
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
                cachedSkill.text.innerHTML = s.label;
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
                cachedSkill.text.innerHTML = s.label;
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
        const infoHTML = generateFighterInfoHTML(fighter);
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

