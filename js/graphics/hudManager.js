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
 * Checks if the screen is currently dimmed by an active Domain Expansion or visual dim effect.
 * Excludes skill channeling / windup phases per explicit requirement.
 */
export function isScreenDimmedActive() {
  if (typeof state === 'undefined' || !state.fighters) return false;

  // 1. Any active Domain Expansion (active phase, NOT during channeling/windup)
  const isAnyDomainActive = state.fighters.some(f => f && f.domainActive && !f.isChannelingDomainExpansion && !f.isChannelingDomain && (f.domainChargeTimer || 0) <= 0);
  if (isAnyDomainActive) return true;

  // 2. Global full-screen dim flags (excluding active channeling windups)
  if (state.isScreenDimmed || state.activeDimScreen) {
    const isChanneling = state.fighters.some(f => f && (
      f.isChannelingPurple ||
      f.isChannelingDomain ||
      f.isChannelingDomainExpansion ||
      f.isChannelingFuga ||
      f.isChannelingUlt ||
      (f.domainChargeTimer || 0) > 0 ||
      (f.purpleChargeTimer || 0) > 0
    ));
    if (!isChanneling) return true;
  }

  // 3. Active Dim Effect States (active beam/strike phase)
  const hasActiveDimEffect = state.fighters.some(f => f && (
    (f.isFiringPurple || (f.purpleHitTimer || 0) > 0) ||
    f.isSaitamaPunchActive ||
    f.tojiUltimateActive ||
    (f.furnaceFireArrowTimer || 0) > 0
  ));
  if (hasActiveDimEffect) return true;

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
    const isSingleColMode = (mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'Stand Off');
    containerBottom.classList.toggle('single-column-hud', isSingleColMode);
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
  const is1v1 = mode === GAME_MODES.ONE_VS_ONE || mode === '1v1';
  const isStandOff = mode === GAME_MODES.STAND_OFF || mode === 'Stand Off';
  const is1v2 = mode === GAME_MODES.STAND_OFF_1V2 || mode === '1v2 Stand Off';
  const is2v2 = mode === GAME_MODES.TWO_VS_TWO || mode === '2v2';
  const isTLFS = mode === GAME_MODES.TLFS || mode === 'TLFS';
  const isSingleColumnMode = is1v1 || isStandOff;
  const teamMode = is2v2;

  const currentHpStr = fighters.map(f => f ? Math.round(f.hp) : 0).join(',');
  const q = (v) => Math.round((v || 0) / 4);
  const currentSkillsStr = fighters.map(f => {
    if (!f) return '';
    const illCount = (f.characterId === 'doppleganger' || f.type === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppelganger')
      ? (state.illusions ? state.illusions.filter(ill => ill && ill.isDoppelganger && ill.hp > 0).length : 0) : 0;
    return `${f.isReloading || false},${f.magazineBullets || 0},${q(f.skillCooldown)},${q(f.cooldownTimer)},${f.domainActive || false},${q(f.beamCharge)},${q(f.beamTimer)},${q(f.shootCooldown)},${illCount},${q(f.totalAccumDamage)},${q(f.throwCooldown)},${q(f.shoutCooldown)},${q(f.reverseCursedTechniqueCooldown)},${f.isTakadaUltActive || false},${q(f.takadaUltTimer)},${f.isTakadaChanneling || false},${q(f.takadaChannelTimer)},${q(f.timeStopTimer)},${q(f.evadeBuffTimer)}`;
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

  // getSkillDataForFighter is imported from ./ui/hudSkillProviders.js

  const getAdditionalInfoForFighter = (f) => {
    const info = [];
    const baseDmg = parseFloat(Math.max(0, Number(f.damage) || 0).toFixed(1));

    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const isRikaAlive = typeof f.isRikaAliveInDomain === 'function' ? f.isRikaAliveInDomain() : (f.rika && f.rika.active && !f.rika.isDying);
      const baseRegen = CONFIG.yuta?.regenRate || 0.05;

      if (checkHasTeammate(f)) {
        if (f.caughtInPureLoveBeam || (f.pureLoveBeamTimer || 0) > 0) {
          info.push(`<b>Regen:</b> 0% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.pureLoveBeamRegenDebuffTimer > 0) {
          const currentRegen = (f.domainActive || isRikaAlive) ? (CONFIG.yuta?.domainRctHealRate || 0.45) * (typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : 2.0) : baseRegen;
          const debuffMult = CONFIG.yuta?.pureLoveBeamRegenDebuffMultiplier ?? 0.25;
          const debuffedRegen = currentRegen * debuffMult;
          info.push(`<b>Regen:</b> ${debuffedRegen.toFixed(2)}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.domainActive || isRikaAlive) {
          const regenMult = typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (CONFIG.yuta?.domainRikaRegenMultiplier || 2.0);
          const domainRctHealRate = CONFIG.yuta?.domainRctHealRate || 0.45;
          const rctRate = domainRctHealRate * regenMult;
          const bonusRegen = rctRate - baseRegen;
          info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}% + ${bonusRegen.toFixed(2)}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}%`);
        }
      } else {
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
          info.push(`<b>Parry:</b> 0% <span style="color: #ef4444; font-size: 10px;">(Summoning)</span>`);
        } else if (parryBonus > 0) {
          info.push(`<b>Parry:</b> ${baseParryVal}% + ${parryBonus}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else if (isGuarding) {
          info.push(`<b>Parry:</b> ${totalParryVal}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Parry:</b> ${totalParryVal}%`);
        }

        if (f.caughtInPureLoveBeam || (f.pureLoveBeamTimer || 0) > 0) {
          info.push(`<b>Regen:</b> 0% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.pureLoveBeamRegenDebuffTimer > 0) {
          const currentRegen = (f.domainActive || isRikaAlive) ? (CONFIG.yuta?.domainRctHealRate || 0.45) * (typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : 2.0) : baseRegen;
          const debuffMult = CONFIG.yuta?.pureLoveBeamRegenDebuffMultiplier ?? 0.25;
          const debuffedRegen = currentRegen * debuffMult;
          info.push(`<b>Regen:</b> ${debuffedRegen.toFixed(2)}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.domainActive || isRikaAlive) {
          const regenMult = typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (CONFIG.yuta?.domainRikaRegenMultiplier || 2.0);
          const domainRctHealRate = CONFIG.yuta?.domainRctHealRate || 0.45;
          const rctRate = domainRctHealRate * regenMult;
          const bonusRegen = rctRate - baseRegen;
          info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}% + ${bonusRegen.toFixed(2)}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}%`);
        }
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
    } else {
      info.push(`<b>DMG:</b> ${baseDmg}`);
      
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
          critDmgStr = `${overtimeCritMult}% (True DMG) <span style="color: #D4AF37; font-size: 10px;">⚡</span>`;
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
          info.push(`<b>Parry:</b> ${baseParry}% + ${bonusParry}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Parry:</b> ${baseParry}%`);
        }

        const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
        const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage || 0.10;
        const currentRegenRate = totalStages * rctPerStage;
        const currentRegenPerSec = Math.round(currentRegenRate * 60);

        if (f.caughtInPureLoveBeam || (f.pureLoveBeamTimer || 0) > 0) {
          info.push(`<b>Regen:</b> 0% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (f.pureLoveBeamRegenDebuffTimer > 0) {
          const debuffMult = CONFIG.yuta?.pureLoveBeamRegenDebuffMultiplier ?? 0.25;
          const debuffedRegenPerSec = Math.round(currentRegenPerSec * debuffMult);
          info.push(`<b>Regen:</b> +${debuffedRegenPerSec}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
        } else if (totalStages > 0) {
          info.push(`<b>Regen:</b> +${currentRegenPerSec}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> 0%`);
        }

        // DEF (Damage Reduction) stat
        const defBuffPerStage = CONFIG.mahoraga?.defBuffPerClickPercent || 0.05;
        const maxDefBuff = CONFIG.mahoraga?.maxDefBuffPercent || 0.50;
        const defReduction = Math.min(maxDefBuff, totalStages * defBuffPerStage);
        const defPercent = Math.round(defReduction * 100);
        if (defPercent > 0) {
          info.push(`<b>DEF:</b> +${defPercent}% <span style="color: #00FF66; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>DEF:</b> 0%`);
        }

        // CC (Stun/Paralyze/Slow Resistance) stat
        const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.05;
        const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.40;
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

    // Tick Damage
    if (f.tickDamageTimer > 0 && f.tickDamage > 0) {
      info.push(`<b>Tick DMG:</b> ${f.tickDamage}/tick <span style="color: #ef4444; font-size: 10px;">▼</span>`);
    }

    return info;
  };

  const formatSkillLabel = (label) => {
    if (!label) return '';
    if (String(label).includes('<')) {
      return String(label).replace(/(<[^>]+>)|(\d+%|\d+)/g, (match, tag, num) => {
        if (tag) return tag;
        return `<span class="hud-num">${num}</span>`;
      });
    }
    return String(label).replace(/(\d+%|\d+)/g, '<span class="hud-num">$1</span>');
  };

  const generateFighterSkillsHTML = (f, align, singleColumn = false) => {
    const skills = getSkillDataForFighter(f);
    if (!skills || skills.length === 0) return '';

    return skills.map((s, index) => {
      const plainTextLen = s.label ? s.label.replace(/<[^>]*>/g, '').length : 0;
      
      // Automatic Grid Span Detection:
      // In 1-column mode, all skills span 1 full width column.
      // In 2-column mode: long names (> 14 chars), single skills, or odd skills span 2 columns.
      const isLastOddSkill = (skills.length % 2 === 1 && index === skills.length - 1);
      const isLongName = plainTextLen > 14;
      const isSpan2 = singleColumn || skills.length === 1 || isLongName || isLastOddSkill || s.fullWidth;

      let fontSz = 14.5;
      if (singleColumn) {
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

      const textStyle = `font-size: ${fontSz}px; text-align: ${align}; white-space: nowrap;`;
      const formattedLabel = formatSkillLabel(s.label);
      const spanClass = isSpan2 ? ' span-2' : '';

      if (s.noFill) {
        const parentColor = s.color ? `color: ${s.color};` : '';
        return `
          <div class="hud-skill-box align-${align} label-only${spanClass}" data-skill-id="${s.id}" style="${parentColor} justify-content: ${align === 'right' ? 'flex-end' : 'flex-start'};">
            <div class="hud-skill-box-fill" style="display: none;"></div>
            <div class="hud-skill-box-text" style="${textStyle}">${formattedLabel}</div>
          </div>
        `;
      }
      const boxStyle = `--skill-glow-color: ${s.color};`;
      const fillStyle = `width: ${Math.round(s.pct)}%; background: ${s.color};`;
      return `
        <div class="hud-skill-box align-${align}${s.ready ? ' hud-skill-ready' : ''}${spanClass}" data-skill-id="${s.id}" style="${boxStyle}">
          <div class="hud-skill-box-fill" style="${fillStyle}"></div>
          <div class="hud-skill-box-text" style="${textStyle}">${formattedLabel}</div>
        </div>
      `;
    }).join('');
  };

  const generateFighterInfoHTML = (f, singleColumn = false, isTeam = false) => {
    let info = getAdditionalInfoForFighter(f);
    const isDummy = f.characterId === 'dummy' || f.type === 'dummy';
    if (CONFIG.hudShowFighterDescription && !isDummy) {
      info = info.filter(line => line.includes('<b>DMG:</b>') || line.includes('<b>Tick DMG:</b>') || line.includes('<b>Stun Chance:</b>') || line.includes('<b>Illusions:</b>') || line.includes('<b>Dodge Chance:</b>') || line.includes('<b>Push-ups:</b>') || line.includes('<b>Sit-ups:</b>') || line.includes('<b>Squats:</b>') || line.includes('<b>Run:</b>') || line.includes('<b>DEF:</b>') || line.includes('<b>ATK RANGE:</b>') || line.includes('<b>CC:</b>') || line.includes('<b>Parry:</b>') || line.includes('<b>Regen:</b>'));
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
      
      const baseValSize = (CONFIG.hudInfoFontSize || 14.5) * 0.95;
      let valFontSize = baseValSize;
      const textOnly = textOnlyVal;
      if (textOnly.length > 14) {
        valFontSize = Math.max(baseValSize * 0.85, baseValSize - (textOnly.length - 14) * 0.35);
      }

      const plainLen = (labelText + ' ' + textOnlyVal).length;
      const isSpan2 = singleColumn || info.length === 1 || plainLen > 24;
      const spanClass = isSpan2 ? ' span-2' : '';

      if (splitIdx !== -1) {
        return `<div class="${spanClass}">${label}<span style="font-size: ${valFontSize.toFixed(1)}px;">${displayVal.trim()}</span></div>`;
      }
      return `<div class="${spanClass}">${line}</div>`;
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

    const baseFontSize = extraClass.includes('ffa-card') ? 16 : (CONFIG.hudTitleFontSize || 20);
    const maxChars = extraClass.includes('ffa-card') ? 18 : 24;
    let nameColor = fighterColor || '#ffffff';
    let truncatedTitle = title;
    if (title && title.length > maxChars) {
      truncatedTitle = title.substring(0, maxChars - 1) + '…';
    }

    const titleStyle = `font-size: ${baseFontSize}px; text-transform: uppercase; font-family: 'Glast Blitch', Arial, sans-serif; letter-spacing: 0.5px; `;

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map((m, mIndex) => {
        const ratio = m.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(m.hp) / Number(m.maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        const { className } = getGlowStyles(m);
        const hpText = `${Math.floor(Math.min(Number(m.maxHp), Math.max(0, Number(m.hp) || 0)))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}`;
        const memberShakeTimer = m._healthBarShakeTimer || 0;
        const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
        const memberShakeStyle = memberShakeTimer > 0 ? `transform: translateX(${memberShakeAmount}px);` : '';
        const isDummy = m && (m.characterId === 'dummy' || m.type === 'dummy');
        const showDescription = CONFIG.hudShowFighterDescription || isDummy;
        const isSingleCol = singleColumn;
        const memberSkillsHTML = !showDescription ? generateFighterSkillsHTML(m, titleAlign || 'left', isSingleCol) : '';
        const memberInfoHTML = generateFighterInfoHTML(m, isSingleCol, true);

        let memberNameColor = m.color || '#ffffff';
        const fType = (m.type || m.characterId || (m._def && m._def.type) || '').toLowerCase();
        if (fType === 'gojo') memberNameColor = '#00E5FF';
        else if (fType === 'yuta') memberNameColor = '#FF69B4';
        else if (fType === 'mahoraga') memberNameColor = '#FFD700';
        else if (fType === 'yuji') memberNameColor = '#FF3366';
        else if (fType === 'mahito') memberNameColor = '#D946EF';
        else if (fType === 'toji') memberNameColor = '#A855F7';
        else if (fType === 'sukuna') memberNameColor = '#FF4500';

        const memberName = (m.name || m.characterId || ('PLAYER ' + (state.fighters.indexOf(m) + 1))).toUpperCase();

        return `
          <div class="health-card__member" style="margin-top: ${mIndex === 0 ? '0' : '14px'};">
            <div class="health-card__title" style="${titleStyle}color: ${memberNameColor}; font-weight: bold; margin: 0 0 4px 0; text-align: ${titleAlign || 'left'};">${memberName}</div>
            <div class="health-card__bar" style="${memberShakeStyle}">
              <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
              <span class="health-card__bar-text">${hpText}</span>
            </div>
            ${memberSkillsHTML ? `<div class="health-card__skills">${memberSkillsHTML}</div>` : ''}
            ${memberInfoHTML ? `<div class="health-card__info" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudInfoFontSize || 14.5}px;">${memberInfoHTML}</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      const percent = Math.round(safeRatio * 100);
      const barColor = safeRatio > 0.5 ? '#22c55e' : safeRatio > 0.25 ? '#eab308' : '#ef4444';
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

      barsHTML = `
        <div class="health-card__bar" style="${barShakeStyle}">
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

    const winsBullets = Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      return `<div class="health-card__win-bullet ${filled ? 'filled' : ''}"></div>`;
    }).join('');
    const winsHTML = maxBullets > 0 ? `<div class="health-card__wins" style="display: flex; gap: 4px; align-items: center;">${winsBullets}</div>` : '';

    const headerRowHTML = (title || maxBullets > 0) ? `
      <div class="health-card__header-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-direction: ${titleAlign === 'right' ? 'row-reverse' : 'row'}; margin-bottom: 6px;">
        ${title ? `<div class="health-card__title" style="${titleStyle}color: ${nameColor}; font-weight: bold; margin: 0; text-align: ${titleAlign};">${truncatedTitle}</div>` : ''}
        ${winsHTML}
      </div>
    ` : '';

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
        else if (fType === 'mahito') nameColor = '#D946EF';   // Vivid Magenta-Violet name
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
          extraClass: 'red solo-1v2-card',
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
        title: '',
        scoreText: `${teamScores[1] || 0} WINS`,
        fillColor: '#4da3ff',
        members: oppMembers,
        extraClass: 'blue',
        shakeTimer: oppShakeTimer,
        isWinner: isOppWinner,
        borderColor: isOppWinner ? '#ffd700' : null,
        kills: oppMembers.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
        maxBullets: 0,
        titleAlign: 'left'
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
        const infoContainer = memberEl.querySelector('.health-card__info');
        const skillBars = new Map();
        memberEl.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fillEl = box.querySelector('.hud-skill-box-fill');
          const textEl = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill: fillEl, text: textEl });
        });
        cachedOppMembers.push({ fill, text, bar, infoContainer, skillBars, fighter: oppMembers[i], lastInfoHTML: '' });
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
          const infoContainer = memberEl.querySelector('.health-card__info');
          const skillBars = new Map();
          memberEl.querySelectorAll('.hud-skill-box').forEach(box => {
            const id = box.getAttribute('data-skill-id');
            const fillEl = box.querySelector('.hud-skill-box-fill');
            const textEl = box.querySelector('.hud-skill-box-text');
            skillBars.set(id, { box, fill: fillEl, text: textEl });
          });
          cachedMembers.push({ fill, text, bar, infoContainer, skillBars, fighter: members[i], lastInfoHTML: '' });
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
        else if (fType === 'mahito') nameColor = '#D946EF';   // Vivid Magenta-Violet name
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

        const isSingleCol = isSingleColumnMode && mode !== GAME_MODES.FFA;
        const cardHTML = buildCard({
          title: fighterName,
          scoreText: totalGames > 0 ? `${winRate}% WR` : '',
          fillColor: color,
          fillRatio: ratio,
          metaLabel: `DMG: ${parseFloat(Math.max(0, Number(fighter.damage) || 0).toFixed(1))}`,
          metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
          extraClass: mode === GAME_MODES.FFA ? 'ffa-card' : (isSingleCol ? 'single-column' : ''),
          borderColor: color,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: fighter === state.roundWinner,
          description: cardDesc,
          kills: (mode === GAME_MODES.FFA) && state.matchKills ? state.matchKills[index] || [] : [],
          maxBullets: (mode === GAME_MODES.STAND_OFF || mode === GAME_MODES.FFA) ? 0 : 2,
          targetFighter: fighter,
          titleAlign: (index % 2 === 0 ? 'left' : 'right'),
          singleColumn: isSingleCol
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

        if (fighter._lastHealAmount && fighter._lastHealAmount > 0 && m.bar) {
          triggerHudHealBubble(m.bar, fighter._lastHealAmount);
          fighter._lastHealAmount = 0;
        }

        const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
        const maxHp = fighter._originalMaxHp || fighter.maxHp;
        const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
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

        const hpText = `${Math.floor(Math.min(Number(maxHp), Math.max(0, Number(curHp) || 0)))}/${Math.floor(Math.max(0, Number(maxHp) || 0))}`;
        m.text.textContent = hpText;

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
                  cachedSkill.text.innerHTML = formatSkillLabel(s.label);
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
                  cachedSkill.text.innerHTML = formatSkillLabel(s.label);
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

      const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
      const maxHp = fighter._originalMaxHp || fighter.maxHp;
      const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
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
        const metaValue = `${Math.floor(Math.min(Number(maxHp), Math.max(0, Number(curHp) || 0)))}/${Math.floor(Math.max(0, Number(maxHp) || 0))}`;
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
                cachedSkill.text.innerHTML = formatSkillLabel(s.label);
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
                cachedSkill.text.innerHTML = formatSkillLabel(s.label);
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

    // 7. Dynamic Screen Dim Mode: Automatically turn ALL HUD text white during active dim effects (excluding skill channeling)
    const isDimmed = isScreenDimmedActive();
    const gameContainer = document.querySelector('.game-container') || document.body;
    if (gameContainer) {
      if (isDimmed) {
        gameContainer.classList.add('hud-dimmed');
      } else {
        gameContainer.classList.remove('hud-dimmed');
      }
    }
  }
}

