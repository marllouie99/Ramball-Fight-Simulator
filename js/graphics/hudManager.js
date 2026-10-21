import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../core/config.js';
import { state } from '../core/state.js';
import { GAME_MODES, MODE_SETTINGS, MODE_SPEED_MULTIPLIER } from '../core/modeConfig.js';
import { drawBlueAimbotGun } from './weaponVisuals.js';
import { drawPanel } from './ui.js';
import { getFighterPreview, getFighterBodyOnlyPreview } from './ui/FighterPreviewCache.js';

import { syncHudPosition, initHudSync, updateTopHudCameraTracking, updateBottomHudCameraTracking } from './ui/hudLayout.js';
import { getSkillDataForFighter, isSkillExceptionInDarkMode, shouldShowFighterSkill, shouldShowHudSkillBars, shouldShowHudStats } from './ui/hudSkillProviders.js';
import { applyCameraToCtx } from '../systems/cameraSystem.js';
import { ensureComboTrackers, getComboConfig, tickComboTrackers } from '../systems/comboTracker.js';
import { getBossConfig } from '../configs/bosses/bossConfigRegistry.js';
import { getFighterGrade, getGradeMeta } from '../configs/gradeConfig.js';
import { drawWingedGradeLetter, getZeusGradeCardTheme } from './ui/CollectorCardRenderer.js';

export { syncHudPosition, initHudSync, updateTopHudCameraTracking, updateBottomHudCameraTracking };

// Initialize immediately
initHudSync();

/**
 * Resolves dynamic display name for a fighter directly from its character config (e.g. CONFIG[id].displayName || CONFIG[id].name).
 * Live config updates immediately reflect in the HUD.
 */
export function getFighterDisplayName(fighter, uppercase = true) {
  if (!fighter) return '';
  const charId = fighter.characterId || fighter.type || (fighter._def && (fighter._def.id || fighter._def.type));
  const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;
  const rawName = charCfg?.displayName || charCfg?.name || fighter.displayName || fighter.name || fighter._def?.displayName || fighter._def?.name || charId || 'FIGHTER';
  const isSans = Boolean(charId === 'sans' || (typeof rawName === 'string' && rawName.toLowerCase() === 'sans'));
  if (isSans) return 'sans';
  return uppercase ? String(rawName).toUpperCase() : String(rawName);
}

/**
 * Formats a fighter's display name for DOM elements, styling Japanese corner brackets 『...』
 * (e.g. 『SHIRO』) with dedicated CSS classes so 『 sits at top-left and 』 sits at bottom-right.
 */
export function formatFighterNameHTML(name) {
  if (!name || typeof name !== 'string') return name || '';
  const match = name.match(/^[『「](.+)[』」]$/);
  if (!match) return name;
  return `<span class="kuhaku-bracket kuhaku-bracket-left">『</span><span class="kuhaku-inner-name">${match[1]}</span><span class="kuhaku-bracket kuhaku-bracket-right">』</span>`;
}

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

  // 2. Active non-domain ultimate strikes (e.g. Toji Swarm, Sukuna Fuga Arrow)
  const hasNonPurpleDimEffect = state.fighters.some(f => f && (
    ((f.characterId === 'toji' || f.type === 'toji') && f.ultimateActive && f.ultimatePhase !== 'CHANNELING' && !f.isChannelingDomain) ||
    (f.furnaceFireArrowTimer || 0) > 0
  ));
  if (hasNonPurpleDimEffect) return true;

  // 3. Gojo Hollow Purple channeling, active orb flight, or post-fire recovery (dark purple dim screen active)
  const isDarkTheme = (state.arenaTheme === 'dark');
  if (!isDarkTheme) {
    const isHollowPurpleActive = state.fighters.some(f => f && (
      (f.characterId === 'gojo' || f.type === 'gojo') && (
        f.isChannelingPurple ||
        (f.purpleRecoveryTimer && f.purpleRecoveryTimer > 0)
      )
    ));
    if (isHollowPurpleActive) return true;
  }

  return false;
}

export function triggerHudHealBubble(target, healAmount) {
  if (!target || !healAmount || typeof document === 'undefined') return;
  let hpBarElement = target;
  if (typeof target === 'number') {
    const fighter = (typeof state !== 'undefined' && state.fighters) ? state.fighters[target] : null;
    if (fighter && _hudCache.fighters.has(fighter)) {
      hpBarElement = _hudCache.fighters.get(fighter)?.hpBar;
    }
  } else if (typeof target === 'object' && target !== null && !(target instanceof Element)) {
    if (_hudCache.fighters.has(target)) {
      hpBarElement = _hudCache.fighters.get(target)?.hpBar;
    } else if (target.isBoss || target._isBoss) {
      const topContainer = document.getElementById('hudTopContainer');
      hpBarElement = topContainer ? topContainer.querySelector('.boss-bar') : null;
    }
  }
  if (!hpBarElement || typeof hpBarElement.appendChild !== 'function') return;
  hpBarElement.style.overflow = 'visible';
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

/**
 * Whether CJ's GTA San Andreas custom HUD is active for this fighter.
 * The widget (weapon box, match clock, money, wanted stars, white stamina bar,
 * red HP bar, Pricedown name font) is toggled by CONFIG.cj.enableCustomHud.
 * When disabled, CJ renders through the standard health card like every other fighter.
 */
export function isCjCustomHudActive(fighter) {
  if (!fighter) return false;
  const isCj = fighter.characterId === 'cj' || fighter.type === 'cj';
  if (!isCj) return false;
  const cfg = CONFIG.cj || {};
  return cfg.enableCustomHud !== false;
}

export function getFighterHealthBarColor(fighter, ratio, isDark = null) {
  if (!fighter) return '#22c55e';
  const isDarkTheme = isDark !== null ? isDark : isDarkModeActive();
  const isCj = isCjCustomHudActive(fighter);
  if (isCj) {
    return '#DC2626';
  }

  // Derive color theme directly from the fighter's HUD skill bar color theme
  try {
    const skills = getSkillDataForFighter(fighter);
    const hudSkillColor = (skills && skills.length > 0 && skills[0]?.color) ? skills[0].color : null;
    if (hudSkillColor) {
      return hudSkillColor;
    }
  } catch (e) {}

  return fighter.themeColor || fighter.color || '#22c55e';
}

/**
 * Resolves the primary theme color for any fighter entity.
 */
export function getFighterThemeColor(f, fallbackColor = '#38bdf8') {
  if (!f) return fallbackColor;
  const isYuta = Boolean(
    f.characterId === 'yuta' ||
    f.type === 'yuta' ||
    (f._def && (f._def.id === 'yuta' || f._def.type === 'yuta' || f._def.id === 23)) ||
    (f.name && f.name.toUpperCase().includes('YUTA'))
  );
  if (isYuta) return '#FF1493';
  const charId = f.characterId || f.type || (f._def && (f._def.id || f._def.type));
  const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;
  let color = charCfg?.themeColor || f.themeColor ||
    f._def?.themeColor ||
    (f.fighterIndex !== undefined && FIGHTER_DEFS && FIGHTER_DEFS[f.fighterIndex] ? FIGHTER_DEFS[f.fighterIndex].themeColor : null) ||
    (f.characterId && CONFIG && CONFIG[f.characterId] ? CONFIG[f.characterId].themeColor : null) ||
    f.color ||
    f._def?.color ||
    (f.fighterIndex !== undefined && FIGHTER_DEFS && FIGHTER_DEFS[f.fighterIndex] ? FIGHTER_DEFS[f.fighterIndex].color : null) ||
    (f.characterId && CONFIG && CONFIG[f.characterId] ? CONFIG[f.characterId].color : null) ||
    fallbackColor;
  if (typeof color === 'string' && /^[0-9a-fA-F]{3,8}$/.test(color)) {
    color = '#' + color;
  }
  return color;
}

const BOSS_SUB_NAMES = {
  yuta: 'The Bush Camper',
  gojo: 'The Honored One',
  sukuna: 'King of Curses',
  toji: 'Sorcerer Killer',
  saitama: 'One Punch Man',
  genos: 'Demon Cyborg',
  mahoraga: 'Divine General',
  escanor: 'Lion Sin of Pride',
  makima: 'Control Devil',
  zeus: 'King of Olympus',
  john_wick: 'Baba Yaga',
  johnwick: 'Baba Yaga',
  nanami: '7:3 Ratio Sorcerer',
  mahito: 'Curse of Humanity',
  yuji: 'Tiger of West Junior High',
  todo: '530,000 IQ Brother',
  cj: 'Grove Street Legend',
  denji: 'Chainsaw Man',
  reze: 'Bomb Devil',
  nezuko: 'Demon Princess',
  tanjiro: 'Sun Breathing Slayer',
  zenitsu: 'Thunder Breathing Slayer',
  inosuke: 'Beast Breathing Slayer',
  nobara: 'Straw Doll Sorcerer',
  megumi: 'Ten Shadows Summoner',
  power: 'Blood Fiend',
  uryu: 'Last Quincy',
  ichigo: 'Substitute Soul Reaper',
  ulquiorra: '4th Espada',
  layla: 'Cosmic Gunner',
  rubbick: 'Grand Magus',
  engineer: 'Combat Engineer',
  sharpshooter: 'Supreme Marksman',
  normal: 'Supreme Marksman',
  jazz: 'Dubstep Prodigy',
  aimbot: 'Dubstep Prodigy',
  spike: 'Thorn Brawler',
  melee: 'Thorn Brawler',
  laser: 'Beam Master',
  bomber: 'Explosives Expert',
  black: 'Shadow Operative',
  ruby: 'Crimson Duelist',
  musashi: 'Legendary Swordsman',
  knight: 'Iron Paladin',
  berserker: 'Untamed Warrior',
  sans: 'The Judge of the Underground',
  darkslategray: 'Obsidian Vanguard',
  grenadier: 'Heavy Artillery',
  gunslinger: 'Rapid Outlaw',
  hydra: 'Multi-Headed Beast',
  orange: 'Solar Striker',
  dummy: 'Unbreakable Target',
  targetdummy: 'Unbreakable Target',
  doppleganger: 'Mirror Phantom',
  shiro: 'Queen of Elkia 『　　』',
};

/**
 * Returns formatted boss subtitle for Boss Battle mode (e.g. "- ANCIENT OCULAR HORROR -").
 */
export function getBossSubName(fighter) {
  if (!fighter) return '- BOSS -';
  const charId = (fighter.characterId || fighter.type || (fighter._def && (fighter._def.id || fighter._def.type)) || '').toLowerCase();
  const config = fighter.bossConfig || (typeof getBossConfig === 'function' ? getBossConfig(fighter) : null);
  const charConfig = (typeof CONFIG !== 'undefined' && charId && CONFIG[charId]) ? CONFIG[charId] : null;

  const sub = config?.bossTitle || config?.bossSubtitle || charConfig?.bossTitle || charConfig?.bossSubtitle || fighter.bossTitle || fighter.bossSubtitle;

  if (sub && String(sub).trim().toUpperCase() !== 'BOSS') {
    return `- ${String(sub).trim().toUpperCase()} -`;
  }
  return '- BOSS -';
}

/**
 * Checks if a specific fighter is a Tactical Shooter operative.
 */
export function isTacticalFighter(f) {
  return false;
  if (f.gameCategory === 'tactical' || (f._def && f._def.gameCategory === 'tactical')) return true;
  const t = String(f.characterId || f.type || (f._def && f._def.type) || '').toLowerCase();
  return ['rifle', 'm4a1', 'shotgun', 'spas12', 'spas_12', 'pistol', 'desert_eagle', 'deserteagle', 'sniper', 'awp', 'barrett', 'barrett50cal', 'tactical_commando', 'tactical_guerilla', 'tactical_breacher', 'tactical_gunslinger', 'tactical_infiltrator', 'tactical_marksman', 'tactical_barrett', 'tactical_sniper', 'tactical_heavy'].includes(t);
}

/**
 * Robust check if current match/gamemode is Tactical Shooter.
 */
export function isTacticalMatch(s) {
  return false;
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


  // Calculate HUD opacity during champion reveal fade-in (only if champion screen layout is active)
  let hudOpacity = 1;

  // Boss entrance cutscene: completely hide all HUD elements during entrance
  if (gameState === 'boss_intro' || state._bossEntranceActive) {
    hudOpacity = 0;
  }

  const isChampionActive = Boolean(state._isChampionLayoutActive);
  if (isChampionActive) {
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
  }

  // Boss entrance HUD smooth fade-in (hidden → fully visible over ~50 frames / ~0.83s)
  if (typeof state._bossEntranceHudFadeTimer === 'number') {
    const fadeDuration = 50;
    const fadeP = Math.min(1.0, state._bossEntranceHudFadeTimer / fadeDuration);
    hudOpacity *= fadeP;
    state._bossEntranceHudFadeTimer++;
    if (state._bossEntranceHudFadeTimer > fadeDuration) {
      state._bossEntranceHudFadeTimer = undefined;
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

  const isBossBattleMode = mode === GAME_MODES.STAND_OFF_1V2 || mode === GAME_MODES.BOSS_BATTLE || mode === 'Boss Battle' || mode === '1v2 Stand Off' || mode === 'STAND_OFF_1V2';
  const is1v2Mode = mode === GAME_MODES.ONE_VS_TWO || mode === '1v2' || isBossBattleMode;

  const isHorizontal = (typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const isTactical = isTacticalMatch(state);
  const mainFighters = (fighters || []).filter(f => f && !f.isTurret && !f.isEndCrystal && !f.isMinion && !f.isDeployable);
  const is1v1Mode = mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.TACTICAL_1V1 || mode === 'Tactical 1v1' || (isTactical && mainFighters && mainFighters.length === 2 && !mode.includes('2v2') && !mode.includes('4v4'));
  const isStandOffMode = mode === GAME_MODES.STAND_OFF || mode === 'Stand Off' || mode === GAME_MODES.TACTICAL_STANDOFF || mode === 'Tactical Stand Off' || mode === GAME_MODES.TACTICAL_RANDOM || mode === 'Tactical Random';
  const is2v2Mode = mode === GAME_MODES.TWO_VS_TWO || mode === '2v2' || mode === GAME_MODES.TACTICAL_2V2 || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_4V4 || mode === 'Tactical 4v4';
  const isTLFSMode = mode === GAME_MODES.TLFS || mode === 'TLFS';
  const isFfaMode = (mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA');
  const isTeamMode = is2v2Mode || is1v2Mode || isTLFSMode || (mainFighters && mainFighters.length > 2 && !isFfaMode);
  const isSideHud1v1 = isHorizontal && (is1v1Mode || isStandOffMode || isTLFSMode || isFfaMode || (mainFighters && mainFighters.length <= 4 && !is2v2Mode && !is1v2Mode));
  const isDuelTopHud = !isSideHud1v1 && !isBossBattleMode && !isTeamMode && !isFfaMode && mainFighters.length === 2;

  // FOC & Tactical modes HUD visibility
  let topHudOpacity = hudOpacity;
  if (CONFIG.saitama?.enableHudShatter && state.hudShatters && state.hudShatters.topNameShatter) {
    topHudOpacity = 0;
  }

  if (topContainer) {
    if ((isBossBattleMode || isDuelTopHud) && topHudOpacity > 0 && !CONFIG.hudHideAll && !CONFIG.hudHideHealthBars) {
      topContainer.style.display = 'flex';
      topContainer.style.visibility = 'visible';
      topContainer.style.opacity = topHudOpacity;
      topContainer.style.pointerEvents = 'none';
      updateTopHudCameraTracking(topContainer);
    } else {
      topContainer.style.display = 'none';
      topContainer.style.visibility = 'hidden';
    }
  }
  if (bottomContainer) {
    bottomContainer.style.display = 'none';
    bottomContainer.style.visibility = 'hidden';
  }
  if (containerBottom) {
    // Tactical HUD toggle — when enableHud is false in tacticalMainConfig, hide all HUD
    if (isTactical && CONFIG.tactical && CONFIG.tactical.enableHud === false) {
      hudOpacity = 0;
    }

    // Global HUD Master Toggle (hides completely when CONFIG.hudHideAll is true)
    if (CONFIG.hudHideAll) {
      hudOpacity = 0;
    }

    let bottomHudOpacity = hudOpacity;
    if (CONFIG.saitama?.enableHudShatter && state.hudShatters && state.hudShatters.bottomHudShatter) {
      bottomHudOpacity = 0;
    }

    containerBottom.classList.toggle('ffa-hud', isFfaMode && !isTactical);
    containerBottom.classList.toggle('tactical-hud', isTactical);
    const isCameraTracking = (!state.camera || state.camera.mode === 'dynamic');
    if (isSideHud1v1) {
      containerBottom.style.visibility = 'hidden';
      containerBottom.style.pointerEvents = 'none';
      containerBottom.style.display = 'none';
    } else {
      const isSingleColMode = (!isTactical && (is1v1Mode || isStandOffMode || (isFfaMode && !isHorizontal))) || (isCameraTracking && isTeamMode && !isTactical);
      containerBottom.classList.toggle('single-column-hud', isSingleColMode);
      containerBottom.style.opacity = bottomHudOpacity;
      if (bottomHudOpacity <= 0) {
        containerBottom.style.visibility = 'hidden';
        containerBottom.style.pointerEvents = 'none';
        containerBottom.style.display = 'none';
      } else {
        containerBottom.style.display = 'flex';
        containerBottom.style.visibility = 'visible';
        containerBottom.style.pointerEvents = 'auto';
        updateBottomHudCameraTracking(containerBottom);
      }
    }
  }
  if (containerLeft) {
    const isH = (typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
    const mainF = (fighters || []).filter(f => f && !f.isTurret && !f.isEndCrystal && !f.isMinion && !f.isDeployable);
    const isSide1v1 = isH && (mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'Stand Off' || mode === GAME_MODES.TLFS || mode === 'TLFS' || mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.HORIZONTAL_1V1 || (mainF && mainF.length <= 4 && mode !== GAME_MODES.TWO_VS_TWO && mode !== '2v2'));
    const sideOpacity = (CONFIG.saitama?.enableHudShatter && state.hudShatters && state.hudShatters.bottomHudShatter) ? 0 : hudOpacity;
    if (sideOpacity <= 0 || !containerLeft.children || !containerLeft.children.length || (!isSide1v1 && state.mode !== 'FFA' && !isTacticalMatch(state) && mainF.length <= 4)) {
      containerLeft.style.visibility = 'hidden';
      containerLeft.style.pointerEvents = 'none';
      containerLeft.style.display = 'none';
    } else {
      containerLeft.style.opacity = sideOpacity;
      containerLeft.style.display = 'flex';
      containerLeft.style.visibility = 'visible';
      containerLeft.style.pointerEvents = 'auto';
    }
  }
  if (containerRight) {
    const isH = (typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
    const mainF = (fighters || []).filter(f => f && !f.isTurret && !f.isEndCrystal && !f.isMinion && !f.isDeployable);
    const isSide1v1 = isH && (mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'Stand Off' || mode === GAME_MODES.TLFS || mode === 'TLFS' || mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.HORIZONTAL_1V1 || (mainF && mainF.length <= 4 && mode !== GAME_MODES.TWO_VS_TWO && mode !== '2v2'));
    const sideOpacity = (CONFIG.saitama?.enableHudShatter && state.hudShatters && state.hudShatters.bottomHudShatter) ? 0 : hudOpacity;
    if (sideOpacity <= 0 || !containerRight.children || !containerRight.children.length || (!isSide1v1 && state.mode !== 'FFA' && !isTacticalMatch(state) && mainF.length <= 4)) {
      containerRight.style.visibility = 'hidden';
      containerRight.style.pointerEvents = 'none';
      containerRight.style.display = 'none';
    } else {
      containerRight.style.opacity = sideOpacity;
      containerRight.style.display = 'flex';
      containerRight.style.visibility = 'visible';
      containerRight.style.pointerEvents = 'auto';
    }
  }

  updateHealthHud();

  if (hudOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = hudOpacity;

    // Draw Tag Match Roster HUD banner across top of arena
    drawTagMatchRosterHUD(ctx);

    // Draw authentic GTA San Andreas "Cheat activated" top-left arena slide banner
    drawCheatNotification(ctx);

    // Draw mirrored combo counter cards at each window edge, below the TOP HUD
    drawComboCounter(ctx);

    ctx.restore();
  }
}

/**
 * Draws the Tag Match 3v3 active/bench roster strip across the top of the arena.
 */
export function drawTagMatchRosterHUD(ctx) {
  if (!state.tagMatch || (state.mode !== 'Tag Match' && state.mode !== GAME_MODES.TAG_MATCH && state.mode !== 'TAG_MATCH')) return;
  const currentDefs = getActiveFighterDefs();
  const arena = state.arena || CONFIG.arena;
  const cx = arena.x + arena.width / 2;
  const topY = arena.y + 10;

  const { team0Roster, team1Roster, team0ActiveSlot, team1ActiveSlot } = state.tagMatch;
  if (!team0Roster || !team1Roster || team0Roster.length < 3 || team1Roster.length < 3) return;

  ctx.save();
  applyCameraToCtx(ctx);

  const slotSize = 28;
  const slotGap = 6;
  const teamBlockWidth = 3 * slotSize + 2 * slotGap;
  const centerGap = 90;

  // ── Team 0 (Red) Roster: 3 circles on the left ──
  const team0StartX = cx - (centerGap / 2) - teamBlockWidth;
  for (let i = 0; i < 3; i++) {
    const fIdx = team0Roster[i];
    const def = currentDefs[fIdx] || FIGHTER_DEFS[fIdx];
    const sx = team0StartX + i * (slotSize + slotGap) + slotSize / 2;
    const sy = topY + slotSize / 2;
    const isActive = i === team0ActiveSlot;
    const isDefeated = i < team0ActiveSlot;

    ctx.save();
    // Circle background
    ctx.beginPath();
    ctx.arc(sx, sy, slotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isDefeated ? 'rgba(30, 10, 15, 0.75)' : (isActive ? 'rgba(204, 43, 77, 0.4)' : 'rgba(20, 20, 30, 0.7)');
    ctx.fill();

    // Border
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.strokeStyle = isDefeated ? '#551520' : (isActive ? '#ff4d4d' : '#883344');
    ctx.stroke();

    // Avatar preview
    const img = getFighterPreview(fIdx);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, slotSize / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      if (isDefeated) {
        ctx.globalAlpha = 0.35;
      }
      ctx.drawImage(img, sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize);
      ctx.restore();
    }

    // Status Overlay
    if (isDefeated) {
      // Red X mark
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy - 7);
      ctx.lineTo(sx + 7, sy + 7);
      ctx.moveTo(sx + 7, sy - 7);
      ctx.lineTo(sx - 7, sy + 7);
      ctx.stroke();
    } else if (isActive) {
      // "ACTIVE" badge below
      ctx.fillStyle = '#ff4d4d';
      ctx.font = '700 6px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('ACTIVE', sx, sy + slotSize / 2 + 3);
    }
    ctx.restore();
  }

  // ── Center VS Banner ──
  ctx.save();
  const pillW = 74;
  const pillH = 20;
  const pillX = cx - pillW / 2;
  const pillY = topY + (slotSize - pillH) / 2;

  ctx.fillStyle = '#1e050c';
  ctx.strokeStyle = '#cc2b4d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAG 3v3', cx, pillY + pillH / 2 + 0.5);
  ctx.restore();

  // ── Team 1 (Blue) Roster: 3 circles on the right ──
  const team1StartX = cx + (centerGap / 2);
  for (let i = 0; i < 3; i++) {
    const fIdx = team1Roster[i];
    const def = currentDefs[fIdx] || FIGHTER_DEFS[fIdx];
    const sx = team1StartX + i * (slotSize + slotGap) + slotSize / 2;
    const sy = topY + slotSize / 2;
    const isActive = i === team1ActiveSlot;
    const isDefeated = i < team1ActiveSlot;

    ctx.save();
    // Circle background
    ctx.beginPath();
    ctx.arc(sx, sy, slotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isDefeated ? 'rgba(10, 20, 35, 0.75)' : (isActive ? 'rgba(56, 189, 248, 0.4)' : 'rgba(20, 20, 30, 0.7)');
    ctx.fill();

    // Border
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.strokeStyle = isDefeated ? '#153055' : (isActive ? '#38bdf8' : '#335588');
    ctx.stroke();

    // Avatar preview
    const img = getFighterPreview(fIdx);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, slotSize / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      if (isDefeated) {
        ctx.globalAlpha = 0.35;
      }
      ctx.drawImage(img, sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize);
      ctx.restore();
    }

    // Status Overlay
    if (isDefeated) {
      // Red X mark
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy - 7);
      ctx.lineTo(sx + 7, sy + 7);
      ctx.moveTo(sx + 7, sy - 7);
      ctx.lineTo(sx - 7, sy + 7);
      ctx.stroke();
    } else if (isActive) {
      // "ACTIVE" badge below
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 6px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('ACTIVE', sx, sy + slotSize / 2 + 3);
    }
    ctx.restore();
  }

  ctx.restore();
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

  // ── Window-edge spawn (pure screen space, camera-independent) ──
  // This is a HUD notification, not a world object: it spawns pinned to the left edge of the window
  // and never touches the camera transform, so dynamic camera tracking (pan/zoom/shake) can neither
  // drag it around nor scale its type. Vertical position follows the arena's top band so the banner
  // clears the DOM match-title HUD above the arena.
  const arena = (state.arena && state.arena.y !== undefined) ? state.arena : (CONFIG.arena || {});
  const arenaY = Number.isFinite(arena.y) ? arena.y : 180;
  const targetX = 10;
  const targetY = arenaY + 10;

  ctx.save();
  ctx.font = fontStr;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  // Authentic GTA San Andreas rectangular bar with wide right-side extension
  const boxWidth = Math.max(195, textWidth + 60);
  const boxHeight = 26;

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

function _parseHexOrRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const s = colorStr.trim().toLowerCase();
  if (s.startsWith('#') || /^[0-9a-f]{3,8}$/.test(s)) {
    const raw = s.startsWith('#') ? s.slice(1) : s;
    if (raw.length === 3 || raw.length === 4) {
      return {
        r: parseInt(raw[0] + raw[0], 16) || 0,
        g: parseInt(raw[1] + raw[1], 16) || 0,
        b: parseInt(raw[2] + raw[2], 16) || 0,
      };
    }
    if (raw.length >= 6) {
      return {
        r: parseInt(raw.substring(0, 2), 16) || 0,
        g: parseInt(raw.substring(2, 4), 16) || 0,
        b: parseInt(raw.substring(4, 6), 16) || 0,
      };
    }
  }
  if (s.startsWith('rgb')) {
    const m = s.match(/\d+/g);
    if (m && m.length >= 3) {
      return { r: parseInt(m[0], 10) || 0, g: parseInt(m[1], 10) || 0, b: parseInt(m[2], 10) || 0 };
    }
  }
  const NAMED = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 14, g: 15, b: 20 },
    red: { r: 239, g: 68, b: 68 },
    green: { r: 34, g: 197, b: 94 },
    blue: { r: 59, g: 130, b: 246 },
    yellow: { r: 250, g: 204, b: 21 },
    cyan: { r: 6, g: 182, b: 212 },
    magenta: { r: 236, g: 72, b: 153 },
    orange: { r: 249, g: 115, b: 22 },
    gold: { r: 250, g: 204, b: 21 },
    purple: { r: 168, g: 85, b: 247 },
    pink: { r: 244, g: 63, b: 94 },
  };
  return NAMED[s] || null;
}

function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Resolves or dynamically generates the 4-tier beat-'em-up combo counter color palette for a fighter.
 * Derives dynamic tiers from the fighter's signature themeColor, secondaryColor, or character config.
 *
 * @param {Object} fighter Attacking Fighter entity or definition
 * @param {string} fallbackBase Fallback hex color if fighter has no theme (e.g. '#38BDF8' for P1, '#EF4444' for P2)
 * @param {Object} [cfg] Optional comboCounter config object
 * @returns {string[]} Array of 4 tier color strings [Tier 0 (base), Tier 1 (heated), Tier 2 (surge), Tier 3 (radiant apex)]
 */
export function getFighterComboTierColors(fighter, fallbackBase = '#38BDF8', cfg = null) {
  // If useFighterTheme is explicitly disabled, fall back to global tierColors
  if (cfg && cfg.useFighterTheme === false && Array.isArray(cfg.tierColors) && cfg.tierColors.length > 0) {
    return cfg.tierColors;
  }

  const charId = fighter?.characterId || fighter?.type || (fighter?._def && (fighter._def.id || fighter._def.type));
  const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;

  // 1. Explicit per-character comboTierColors override if defined in character config or fighter entity
  if (Array.isArray(charCfg?.comboTierColors) && charCfg.comboTierColors.length >= 4) {
    return charCfg.comboTierColors;
  }
  if (Array.isArray(fighter?.comboTierColors) && fighter.comboTierColors.length >= 4) {
    return fighter.comboTierColors;
  }

  // 2. Resolve primary theme color and secondary color
  const baseColor = getFighterThemeColor(fighter, fallbackBase);
  const secondaryColor = charCfg?.secondaryColor || fighter?.secondaryColor || null;

  const rgb = _parseHexOrRgb(baseColor);
  if (!rgb) {
    return [baseColor, baseColor, secondaryColor || baseColor, '#FFD400'];
  }

  const hsl = _rgbToHsl(rgb.r, rgb.g, rgb.b);
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;

  // Handle neutral / monochrome / steel palettes (e.g. Guts, John Wick)
  if (s < 18) {
    const l0 = Math.max(50, Math.min(68, l));
    const t0 = `hsl(${h}, ${s}%, ${l0}%)`;
    const t1 = `hsl(${h}, ${s}%, ${Math.min(80, l0 + 14)}%)`;
    const secRgb = secondaryColor ? _parseHexOrRgb(secondaryColor) : null;
    const t2 = secRgb ? secondaryColor : `hsl(${h}, ${Math.min(100, s + 30)}%, ${Math.min(88, l0 + 24)}%)`;
    const t3 = '#FDE047'; // Radiant kinetic glint
    return [t0, t1, t2, t3];
  }

  // Standard chromatic palette:
  // Tier 0 (Hits 1-4): Authentic fighter theme color, normalized for floating dark outline contrast
  const l0 = Math.max(46, Math.min(58, l));
  const s0 = Math.max(68, s);
  const tier0 = `hsl(${h}, ${s0}%, ${l0}%)`;

  // Tier 1 (Hits 5-9): Heated chain - boosted luminance & saturation
  const l1 = Math.min(68, l0 + 8);
  const s1 = Math.min(100, s0 + 8);
  const tier1 = `hsl(${h}, ${s1}%, ${l1}%)`;

  // Tier 2 (Hits 10-19): Combo Surge - transitions into secondary color if present, else energetic hue shift
  let tier2;
  if (secondaryColor) {
    const secRgb = _parseHexOrRgb(secondaryColor);
    if (secRgb) {
      const secHsl = _rgbToHsl(secRgb.r, secRgb.g, secRgb.b);
      const secL = Math.max(50, Math.min(68, secHsl.l));
      const secS = Math.max(70, secHsl.s);
      tier2 = `hsl(${secHsl.h}, ${secS}%, ${secL}%)`;
    } else {
      tier2 = secondaryColor;
    }
  } else {
    // Hue-shifted luminous energetic tone
    const shiftH = (h >= 30 && h <= 150) ? Math.max(38, h - 14) : (h + 12) % 360;
    tier2 = `hsl(${shiftH}, 100%, ${Math.min(74, l1 + 8)}%)`;
  }

  // Tier 3 (Hits 20+): Radiant Apex - hyper-luminescent crown
  let tier3;
  if (h >= 0 && h <= 55) {
    // Warm fire / crimson / orange -> Radiant Sun Gold
    tier3 = '#FDE047';
  } else if (h >= 56 && h <= 165) {
    // Yellow-green / green / lime -> Radiant Solar Yellow-Lime / Gold
    tier3 = '#FACC15';
  } else if (h >= 166 && h <= 250) {
    // Cyan / Ice / Blue -> Radiant Ice Glint
    tier3 = '#E0FFFF';
  } else {
    // Purple / Magenta / Pink -> Radiant Astral White-Pink
    tier3 = '#FDF2F8';
  }

  return [tier0, tier1, tier2, tier3];
}

/**
 * Draws the mirrored beat-'em-up combo banners (left/right window edges, just below the TOP HUD).
 * Rendered with high-contrast floating arcade typography (heavy comic ink stroke + white crown glint)
 * with zero dark placard background, giving maximum visibility over arena action.
 * Pure screen space: camera pan, zoom and shake never move or scale these banners.
 * Counts consecutive damaging hits per side (see js/systems/comboTracker.js).
 */
export function drawComboCounter(ctx) {
  if (!ctx) return;
  const cfg = getComboConfig();
  if (!cfg.enabled || CONFIG.hudHideAll) return;

  const slots = ensureComboTrackers();
  tickComboTrackers();

  let hasActiveCard = false;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].phase !== 'hidden') { hasActiveCard = true; break; }
  }
  if (!hasActiveCard) return;

  const canvasW = (state.canvas && Number.isFinite(state.canvas.width)) ? state.canvas.width : (CONFIG.canvasWidth || 540);
  const arena = state.arena || CONFIG.arena || {};
  const arenaY = Number.isFinite(arena.y) ? arena.y : 240;
  // Sits just under the scaled TOP HUD cards, hanging into the arena's empty top corner
  const cardTop = Math.max(40, arenaY - cfg.topGapBelowHud);
  const minHits = Math.max(1, cfg.minHits | 0);
  const thresholds = cfg.tierThresholds || [1, 5, 10, 20];
  const tierColors = cfg.tierColors || ['#E11D2E', '#FF3B30', '#FF7A00', '#FFD400'];
  const CARD_H = 68;

  const numFont = 'italic 900 38px "Franklin Gothic Heavy", "Impact", "Arial Black", "Trebuchet MS", sans-serif';
  const hitFont = 'italic 900 18px "Franklin Gothic Heavy", "Impact", "Arial Black", "Trebuchet MS", sans-serif';
  const dmgFont = '900 14px "Press Start 2P", "Silkscreen", "Rajdhani", monospace, sans-serif';

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.phase === 'hidden' || slot.hits < minHits) continue;

    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, slot.slideP)), 3);
    if (eased <= 0) continue;

    // Color tier climbs with the chain length (deep red -> bright red -> orange -> gold)
    // Resolve attacking fighter entity for this combo slot
    let fighter = slot.attackerFighter;
    if (!fighter && slot.attackerFighterIndex >= 0 && Array.isArray(state.fighters)) {
      fighter = state.fighters[slot.attackerFighterIndex];
    }
    if (!fighter && Array.isArray(state.fighters)) {
      fighter = state.fighters[slot.side] || state.fighters[0];
    }

    // Resolve tiered color theme derived dynamically from the fighter's signature color theme
    const fallbackBase = slot.side === 0 ? '#38BDF8' : '#EF4444';
    const tierColors = getFighterComboTierColors(fighter, fallbackBase, cfg);

    // Color tier climbs with the chain length
    let tier = 0;
    for (let t = 0; t < thresholds.length; t++) {
      if (slot.hits >= thresholds[t]) tier = t;
    }
    const accent = tierColors[Math.min(tier, tierColors.length - 1)] || tierColors[0] || fallbackBase || '#E11D2E';

    const numberText = String(slot.hits);
    // Bottom row always shows the chain's total damage, zero-padded like an arcade score
    const damageText = String(Math.max(0, Math.round(slot.damage))).padStart(5, '0');

    ctx.font = numFont;
    const numberW = ctx.measureText(numberText).width;
    ctx.font = hitFont;
    const hitW = ctx.measureText('HIT!').width;
    ctx.font = dmgFont;
    const damageW = ctx.measureText(damageText).width;

    const topRowW = numberW + 4 + hitW;
    const contentW = Math.ceil(Math.max(topRowW, damageW));
    const CARD_W = Math.max(86, contentW + 10);

    // Slide in from outside the window edge; right card mirrors the left
    const inset = cfg.edgeInset || 12;
    const targetX = slot.side === 0 ? inset : (canvasW - inset - CARD_W);
    const off = (1 - eased) * (CARD_W + 16);
    const x = slot.side === 0 ? targetX - off : targetX + off;

    // Impact pop: damped sine over popFrames
    const popT = slot.pop > 0 ? 1 - (slot.pop / Math.max(1, cfg.popFrames)) : 0;
    const scale = 1 + 0.14 * Math.sin(popT * Math.PI);

    const isRight = slot.side === 1;

    ctx.save();
    ctx.globalAlpha = eased;
    ctx.translate(x + CARD_W / 2, cardTop + CARD_H / 2);
    ctx.scale(scale, scale);
    ctx.translate(-CARD_W / 2, -CARD_H / 2); // local origin = card top-left

    // ZERO dark background: no placard polygon and no dark drop-shadow rectangle.
    // Instead, rendering uses high-contrast floating arcade typography with heavy ink strokes,
    // a subtle drop shadow, and a metallic crown glint for 100% legibility over any arena floor.

    const numBaseX = isRight ? (CARD_W - 4 - topRowW) : 4;
    const numBaseY = 36;
    const hitBaseX = numBaseX + numberW + 4;
    const hitBaseY = 36;
    const dmgX = isRight ? (CARD_W - 4) : 4;
    const dmgY = 53;

    // ── Big hit count: heavy ink outline with specular arcade crown glint ──
    ctx.save();
    ctx.transform(1, 0, -0.10, 1, 0, 0);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = numFont;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2.4;

    // Deep ink drop shadow for 3D comic depth
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(5, 6, 9, 0.75)';
    ctx.strokeText(numberText, numBaseX + 1.5, numBaseY + 2);

    // Crisp outer black ink outline
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#050609';
    ctx.strokeText(numberText, numBaseX, numBaseY);

    // Dynamic gradient fill with top white crown glint
    const numGrad = ctx.createLinearGradient(0, numBaseY - 32, 0, numBaseY);
    numGrad.addColorStop(0, '#FFFFFF');
    numGrad.addColorStop(0.32, accent);
    numGrad.addColorStop(1.0, accent);
    ctx.fillStyle = numGrad;
    ctx.fillText(numberText, numBaseX, numBaseY);
    ctx.restore();

    // ── "HIT!" tag tucked right next to the number ──
    ctx.save();
    ctx.transform(1, 0, -0.14, 1, 0, 0);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = hitFont;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2.4;

    // Drop shadow
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = 'rgba(5, 6, 9, 0.75)';
    ctx.strokeText('HIT!', hitBaseX + 1.2, hitBaseY + 1.8);

    // Outer ink outline
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#050609';
    ctx.strokeText('HIT!', hitBaseX, hitBaseY);

    // Gradient fill
    const hitGrad = ctx.createLinearGradient(0, hitBaseY - 18, 0, hitBaseY);
    hitGrad.addColorStop(0, '#FFFFFF');
    hitGrad.addColorStop(0.35, accent);
    hitGrad.addColorStop(1.0, accent);
    ctx.fillStyle = hitGrad;
    ctx.fillText('HIT!', hitBaseX, hitBaseY);
    ctx.restore();

    // ── Bottom row: total damage of the chain (crisp white pixel digits with ink stroke) ──
    ctx.save();
    ctx.textAlign = isRight ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = dmgFont;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2.4;

    // Drop shadow
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5, 6, 9, 0.75)';
    ctx.strokeText(damageText, dmgX + (isRight ? -1 : 1), dmgY + 1.5);

    // Outer ink outline
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#050609';
    ctx.strokeText(damageText, dmgX, dmgY);

    // Crisp white fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(damageText, dmgX, dmgY);
    ctx.restore();

    // ── Floating combo window drain micro-gauge ──
    const barW = Math.max(48, CARD_W - 8);
    const barH = 4;
    const barY = 59;
    const barX = isRight ? (CARD_W - 4 - barW) : 4;
    const maxFrames = Math.max(1, slot.maxTimer || cfg.windowFrames || 90);
    const ratio = Math.max(0, Math.min(1, slot.timer / maxFrames));

    // Gauge track (capsule pill with 1px border)
    ctx.fillStyle = 'rgba(5, 6, 9, 0.82)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(barX, barY, barW, barH, 2);
    } else {
      ctx.rect(barX, barY, barW, barH);
    }
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();

    // Draining progress fill
    const fillW = Math.max(0, barW * ratio);
    if (fillW > 0) {
      ctx.fillStyle = accent;
      const fillX = isRight ? (barX + barW - fillW) : barX;
      const primaryTheme = tierColors[0] || accent;
      const barGrad = ctx.createLinearGradient(fillX, barY, fillX + fillW, barY);
      if (isRight) {
        barGrad.addColorStop(0, accent);
        barGrad.addColorStop(1, primaryTheme);
      } else {
        barGrad.addColorStop(0, primaryTheme);
        barGrad.addColorStop(1, accent);
      }
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(fillX, barY, fillW, barH, 2);
      } else {
        ctx.fillRect(fillX, barY, fillW, barH);
      }
      ctx.fill();

      // Leading white spark pip at the drain head
      if (fillW > 3 && ratio < 0.98) {
        ctx.fillStyle = '#FFFFFF';
        const sparkX = isRight ? fillX : (fillX + fillW - 1.5);
        ctx.fillRect(sparkX, barY, 1.5, barH);
      }
    }

    ctx.restore();
  }
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

// ── Persistent Module-Level Cache for Screen Dimming DOM Elements (Rule #13) ──
let _cachedDimEls = null;
let _lastDimmedState = null;
let _lastDarkThemeState = null;
let _lastSaitamaImpactState = null;
let _cachedRoundBanner = null;
let _cachedTopTimerEl = null;
let _lastTopTimerText = '';

function _getDimElements() {
  if (!_cachedDimEls || !_cachedDimEls[0] || (typeof document !== 'undefined' && document.body && typeof document.body.contains === 'function' && !document.body.contains(_cachedDimEls[0]))) {
    if (typeof document === 'undefined') return [];
    _cachedDimEls = [
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
    ].filter(Boolean);
  }
  return _cachedDimEls;
}

export function clearHealthHud() {
  _hudCache.teams.clear();
  _hudCache.fighters.clear();
  _tacticalCards.top = [];
  _tacticalCards.bottom = [];
  _lastDimmedState = null;
  _lastDarkThemeState = null;
  _lastSaitamaImpactState = null;
  _cachedDimEls = null;
  _cachedRoundBanner = null;
  _cachedTopTimerEl = null;
  _lastTopTimerText = '';

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
          <span class="tac-name" style="font-family: 'Rajdhani', 'Outfit', sans-serif; font-size: 10.5px; font-weight: 900; color: ${accentColor}; letter-spacing: 0.1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
          <span class="tac-caliber" style="font-family: 'Rajdhani', monospace; font-size: 8px; font-weight: 700; color: #94a3b8; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); padding: 0 3px; border-radius: 2px; white-space: nowrap;"></span>
        </div>
        <div class="tac-hp-badge" style="font-family: 'Rajdhani', monospace; font-size: 10px; font-weight: 900; color: #f8fafc; display: flex; align-items: baseline; gap: 2px;">
          <span class="tac-hp">0</span><span class="tac-hp-unit" style="font-size: 8px; color: #64748b;"> HP</span>
        </div>
      </div>

      <!-- Middle: Clean Health Bar Track -->
      <div class="health-card__bar" style="height: 3.5px; background: rgba(255, 255, 255, 0.12); border-radius: 1.5px; overflow: hidden; position: relative;">
        <div class="health-card__ghost" style="position: absolute; left: 0; top: 0; height: 100%; width: 100%; background: #dc2626; border-radius: 1.5px; z-index: 1;"></div>
        <div class="health-card__fill" style="width: 100%; height: 100%; background: ${accentColor}; border-radius: 1.5px; position: relative; z-index: 2; transition: width 0.15s ease, background 0.2s ease;"></div>
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
    fillEl: card.querySelector('.health-card__fill'),
    ghostEl: card.querySelector('.health-card__ghost')
  };
}

/**
 * Updates the trailing damage ghost bar with fighting-game hold delay and smooth catch-up decay.
 * @param {HTMLElement} ghostEl - The .health-card__ghost element
 * @param {number} currentPct - Target HP/stamina percentage (0 - 100)
 * @param {object} tracker - State tracking object (cachedCard, member, cardObj)
 * @param {boolean} isSans - Whether this is Sans's stamina bar (uses amber glow)
 */
function updateHealthBarGhost(ghostEl, currentPct, tracker, isSans = false) {
  if (!ghostEl || (typeof CONFIG !== 'undefined' && CONFIG.hudGhostBarEnabled === false)) return;

  if (tracker.ghostHpPct === undefined) {
    tracker.ghostHpPct = currentPct;
    tracker.ghostHoldTimer = 0;
    tracker.lastTargetHpPct = currentPct;
  }

  // KO / zero health / zero stamina catch-up: instantly clear ghost bar
  if (currentPct <= 0) {
    tracker.ghostHpPct = 0;
    tracker.ghostHoldTimer = 0;
    tracker.lastTargetHpPct = 0;
    if (tracker.lastGhostPct !== '0%') {
      ghostEl.style.width = '0%';
      tracker.lastGhostPct = '0%';
    }
    return;
  }

  const holdFrames = (typeof CONFIG !== 'undefined' ? CONFIG.hudGhostBarHoldFrames : 8) ?? 8;
  const lastTarget = tracker.lastTargetHpPct ?? currentPct;

  // Detect fresh damage: target HP dropped lower than last frame
  if (currentPct < lastTarget) {
    if (!tracker.ghostHoldTimer || tracker.ghostHoldTimer <= 0) {
      // First damage impact: start snappy hold delay (~133ms)
      tracker.ghostHoldTimer = holdFrames;
    } else {
      // Multi-hit flurry / combo: add a slight micro-buffer (+2 frames) capped at holdFrames
      // Prevents the ghost bar from perpetually stalling indefinitely during sustained flurries/DoTs
      tracker.ghostHoldTimer = Math.min(holdFrames, tracker.ghostHoldTimer + 2);
    }
  } else if (currentPct > tracker.ghostHpPct) {
    // Immediate catch-up on heal, stamina recovery or round reset
    tracker.ghostHpPct = currentPct;
    tracker.ghostHoldTimer = 0;
  }
  tracker.lastTargetHpPct = currentPct;

  // Frame decay processing
  if (tracker.ghostHoldTimer > 0) {
    tracker.ghostHoldTimer--;
  } else if (tracker.ghostHpPct > currentPct) {
    const decay = (typeof CONFIG !== 'undefined' ? CONFIG.hudGhostBarDecaySpeed : 3.5) ?? 3.5;
    const gap = tracker.ghostHpPct - currentPct;
    const step = Math.max(decay, gap * 0.22);
    if (gap <= step || gap < 0.4) {
      tracker.ghostHpPct = currentPct;
    } else {
      tracker.ghostHpPct -= step;
    }
  } else {
    tracker.ghostHpPct = currentPct;
  }

  // Apply to DOM via dirty-check
  const ghostPctStr = `${Math.round(tracker.ghostHpPct * 10) / 10}%`;
  if (tracker.lastGhostPct !== ghostPctStr) {
    ghostEl.style.width = ghostPctStr;
    tracker.lastGhostPct = ghostPctStr;
  }
  const ghostColor = isSans ? '#f59e0b' : ((typeof CONFIG !== 'undefined' && CONFIG.hudGhostBarColor) ? CONFIG.hudGhostBarColor : '#dc2626');
  if (tracker.lastGhostColor !== ghostColor) {
    ghostEl.style.background = ghostColor;
    if (isSans) {
      ghostEl.style.boxShadow = '0 0 6px rgba(245, 158, 11, 0.6)';
    } else {
      ghostEl.style.boxShadow = '';
    }
    tracker.lastGhostColor = ghostColor;
  }
}

function updateTacticalCard(cardObj, f, index, accentColor) {
  if (!cardObj || !cardObj.card) return;
  if (!f) {
    if (cardObj.card.style.display !== 'none') cardObj.card.style.display = 'none';
    return;
  }
  if (cardObj.card.style.display !== '') cardObj.card.style.display = '';

  const isSans = f && (f.characterId === 'sans' || f.type === 'sans' || (f.name && f.name.toLowerCase() === 'sans'));
  const isDead = f.hp <= 0;
  let maxHp, hp, ratio, percent, barColor;
  if (isSans) {
    const curStam = isDead ? 0 : ((f.stamina !== undefined) ? f.stamina : 100);
    const maxStam = f.maxStamina || 100;
    maxHp = maxStam;
    hp = curStam;
    ratio = (!isDead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
    percent = isDead ? 0 : Math.min(100, Math.max(0, Math.round(ratio * 100)));
    barColor = (ratio < 0.25) ? '#FFE600' : '#2c4de0ff';
  } else {
    maxHp = Math.max(1, Math.round(Number(f.maxHp) || 100));
    hp = Math.max(0, Math.min(maxHp, Math.round(Number(f.hp) || 0)));
    ratio = hp / maxHp;
    percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
    const isDark = isDarkModeActive();
    barColor = isDark ? (f.themeColor || f.color || accentColor || '#ffffff') : (ratio > 0.25 ? fighterColor : '#ef4444');
  }
  const name = (f.name || f.type || `OP ${index + 1}`).toUpperCase();
  const attackDmg = Math.round(Number(f.damage !== undefined ? f.damage : (f._def && f._def.damage)) || 0);
  const curAmmo = f.magazineBullets !== undefined ? f.magazineBullets : (f.maxMagazine || 30);
  const maxAmmo = f.maxMagazine || 30;
  const isReloading = Boolean(f.isReloading);

  // 1. Operator Name
  if (cardObj.nameEl) {
    if (cardObj.lastCardName !== name) {
      if (typeof name === 'string' && name.includes('『')) {
        cardObj.nameEl.innerHTML = formatFighterNameHTML(name);
      } else {
        cardObj.nameEl.textContent = name;
      }
      cardObj.lastCardName = name;
    }
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

  // 7. Trailing Damage Ghost Bar
  if (cardObj.ghostEl) {
    updateHealthBarGhost(cardObj.ghostEl, percent, cardObj, isSans);
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

let _deityCosmicLightImage = null;

function getDeityCosmicLightImage() {
  if (_deityCosmicLightImage && _deityCosmicLightImage.complete && (_deityCosmicLightImage.naturalWidth > 0 || _deityCosmicLightImage.width > 0)) {
    return _deityCosmicLightImage;
  }
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = 'Assets/model/NamelessDeity/CosmicLightCircleCenter1.png';
    _deityCosmicLightImage = img;
  }
  return _deityCosmicLightImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getDeityCosmicLightImage();
}

/**
 * Renders a fighter's avatar headshot/body onto a profile canvas element.
 * Implements the Pop-Out Portrait Standard:
 * - The central body circle is uniformly scaled and centered so it fits cleanly into the 58x52px profile frame.
 * - Hats, hair crowns, horns, wings, and accessories naturally extend beyond the frame borders without clipping.
 */
export function renderTopHudProfileCanvas(canvasEl, fighter) {
  if (!canvasEl || !fighter) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  const w = canvasEl.width;
  const h = canvasEl.height;
  ctx.clearRect(0, 0, w, h);

  let fIdx = fighter.fighterIndex;
  if (fIdx === undefined || fIdx < 0) {
    const charId = (fighter.characterId || fighter.type || '').toLowerCase();
    fIdx = FIGHTER_DEFS.findIndex(d => d && (
      (d.id && String(d.id).toLowerCase() === charId) ||
      (d.type && String(d.type).toLowerCase() === charId) ||
      (d.name && String(d.name).toLowerCase() === charId)
    ));
  }

  // Nameless Deity: Display iconic Cosmic Light Center asset instead of the massive multi-limbed entity body
  const isNamelessDeity = Boolean(
    fighter.characterId === 'namelessdeity' ||
    fighter.characterId === 'nameless_deity' ||
    fighter.type === 'namelessdeity' ||
    fighter.type === 'nameless_deity' ||
    (fighter.name && fighter.name.toLowerCase().includes('nameless')) ||
    (fIdx !== undefined && fIdx >= 0 && (FIGHTER_DEFS[fIdx]?.type === 'namelessdeity' || FIGHTER_DEFS[fIdx]?.type === 'nameless_deity'))
  );

  if (isNamelessDeity) {
    const deityImg = getDeityCosmicLightImage();
    const destX = Math.round(w / 2);
    const destY = Math.round(h / 2);
    const drawSize = 820; // Perfectly frames the cosmic starlight emblem in the 58x52px top profile badge
    const applyHaloDraw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(deityImg, destX - drawSize / 2, destY - drawSize / 2, drawSize, drawSize);
      // Soft radial circular feathering to guarantee zero straight rectangular cutoffs on starlight rays
      const maxR = Math.min(w, h) * 0.46;
      const maskGrad = ctx.createRadialGradient(destX, destY, maxR * 0.45, destX, destY, maxR);
      maskGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
      maskGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.90)');
      maskGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = maskGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    if (deityImg && (deityImg.complete || deityImg.width > 0)) {
      applyHaloDraw();
    } else if (deityImg) {
      deityImg.onload = () => {
        try {
          applyHaloDraw();
        } catch (_) {}
      };
    }
    return;
  }

  const preview = (fIdx !== undefined && fIdx >= 0)
    ? (getFighterBodyOnlyPreview(fIdx) || getFighterPreview(fIdx))
    : null;

  const baseR = (fighter && (fighter.r || fighter.radius)) ? (fighter.r || fighter.radius) : 25;
  // Keep the enlarged model centered, with transparent room for headgear and hair outside the fixed frame.
  const customScale = (fighter && fighter.profileScale) || 1.0;
  const customOffY = (fighter && fighter.profileOffsetY) || 0;
  const targetR = Math.round(192 * customScale);
  const scale = targetR / baseR;
  const destX = Math.round(w / 2);
  const destY = Math.round(h / 2 + customOffY);

  if (preview) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sW = w / scale;
    const sH = h / scale;
    const sX = 128 - (destX / scale);
    const sY = 128 - (destY / scale);
    ctx.drawImage(preview, sX, sY, sW, sH, 0, 0, w, h);
    ctx.restore();
  } else if (typeof fighter.drawBody === 'function') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(destX, destY);
    ctx.scale(scale, scale);
    const origX = fighter.x, origY = fighter.y;
    fighter.x = 0; fighter.y = 0;
    fighter.drawBody(ctx);
    fighter.x = origX; fighter.y = origY;
    ctx.restore();
  }
}

/**
 * Formats the elapsed fight duration in seconds (00, 01, 02...) for the Top Duel HUD center timer.
 * Freezes cleanly at the moment a round ends so the KO timestamp remains readable.
 */
function getTopDuelTimerSecondsString() {
  if (typeof state === 'undefined') return '00';
  if (state.gameState === 'countdown' || (state.matchTimer || 0) === 0) {
    state._hudDuelTimerFrames = 0;
  } else if (state.gameState === 'playing') {
    state._hudDuelTimerFrames = state.matchTimer || 0;
  } else if (state._hudDuelTimerFrames === undefined) {
    state._hudDuelTimerFrames = state.matchTimer || 0;
  }
  const sec = Math.max(0, Math.floor((state._hudDuelTimerFrames || 0) / 60));
  return String(sec).padStart(2, '0');
}

/**
 * Builds the HTML structure for the Top Duel Combat HUD (Pop-Out Portrait Badge + Connected Top Health Bar + Lower Fighter Name & Win Badges + Center Timer).
 */
export function buildTopDuelHUD(f1, f2, isDark = false) {
  if (!f1 || !f2) return '';

  const isF1Sans = Boolean(f1.characterId === 'sans' || f1.type === 'sans' || (f1.name && f1.name.toLowerCase() === 'sans'));
  const isF2Sans = Boolean(f2.characterId === 'sans' || f2.type === 'sans' || (f2.name && f2.name.toLowerCase() === 'sans'));
  const isF1NamelessDeity = Boolean(f1.characterId === 'namelessdeity' || f1.characterId === 'nameless_deity' || f1.type === 'namelessdeity' || f1.type === 'nameless_deity' || (f1.name && f1.name.toLowerCase().includes('nameless')));
  const isF2NamelessDeity = Boolean(f2.characterId === 'namelessdeity' || f2.characterId === 'nameless_deity' || f2.type === 'namelessdeity' || f2.type === 'nameless_deity' || (f2.name && f2.name.toLowerCase().includes('nameless')));

  let f1Percent, f1BarColor, f1HpText;
  if (isF1Sans) {
    const isF1Dead = f1.hp <= 0;
    const curStam = isF1Dead ? 0 : ((f1.stamina !== undefined) ? f1.stamina : 100);
    const maxStam = f1.maxStamina || 100;
    const stamRatio = (!isF1Dead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
    f1Percent = isF1Dead ? 0 : Math.min(100, Math.max(0, Math.round(stamRatio * 100)));
    f1BarColor = (stamRatio < 0.25)
      ? 'linear-gradient(180deg, #fef08a 0%, #facc15 25%, #eab308 60%, #a16207 100%)'
      : 'linear-gradient(180deg, #93c5fd 0%, #38bdf8 20%, #2c4de0 60%, #1e3a8a 100%)';
    f1HpText = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
  } else {
    const f1Hp = (typeof f1.getDisplayHp === 'function') ? f1.getDisplayHp() : f1.hp;
    const f1MaxHp = f1._originalMaxHp || f1.maxHp || 1000;
    const f1Ratio = f1MaxHp > 0 ? Math.min(1.0, Math.max(0, Number(f1Hp) / Number(f1MaxHp))) : 0;
    f1Percent = Math.min(100, Math.max(0, Math.round(f1Ratio * 100)));
    f1BarColor = getFighterHealthBarColor(f1, f1Ratio, isDark);
    f1HpText = `${Math.floor(Math.max(0, Number(f1Hp) || 0))}`;
  }

  let f2Percent, f2BarColor, f2HpText;
  if (isF2Sans) {
    const isF2Dead = f2.hp <= 0;
    const curStam = isF2Dead ? 0 : ((f2.stamina !== undefined) ? f2.stamina : 100);
    const maxStam = f2.maxStamina || 100;
    const stamRatio = (!isF2Dead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
    f2Percent = isF2Dead ? 0 : Math.min(100, Math.max(0, Math.round(stamRatio * 100)));
    f2BarColor = (stamRatio < 0.25)
      ? 'linear-gradient(180deg, #fef08a 0%, #facc15 25%, #eab308 60%, #a16207 100%)'
      : 'linear-gradient(180deg, #93c5fd 0%, #38bdf8 20%, #2c4de0 60%, #1e3a8a 100%)';
    f2HpText = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
  } else {
    const f2Hp = (typeof f2.getDisplayHp === 'function') ? f2.getDisplayHp() : f2.hp;
    const f2MaxHp = f2._originalMaxHp || f2.maxHp || 1000;
    const f2Ratio = f2MaxHp > 0 ? Math.min(1.0, Math.max(0, Number(f2Hp) / Number(f2MaxHp))) : 0;
    f2Percent = Math.min(100, Math.max(0, Math.round(f2Ratio * 100)));
    f2BarColor = getFighterHealthBarColor(f2, f2Ratio, isDark);
    f2HpText = `${Math.floor(Math.max(0, Number(f2Hp) || 0))}`;
  }

  const f1ThemeColor = getFighterThemeColor(f1, '#38BDF8');
  const f2ThemeColor = getFighterThemeColor(f2, '#EF4444');
  const f1Name = getFighterDisplayName(f1, true);
  const f2Name = getFighterDisplayName(f2, true);
  const f1NameHtml = (typeof f1Name === 'string' && f1Name.includes('『')) ? formatFighterNameHTML(f1Name) : f1Name;
  const f2NameHtml = (typeof f2Name === 'string' && f2Name.includes('『')) ? formatFighterNameHTML(f2Name) : f2Name;
  const f1SansClass = isF1Sans ? ' hud-sans-name' : '';
  const f2SansClass = isF2Sans ? ' hud-sans-name' : '';

  const f1Grade = getFighterGrade(f1);
  const f2Grade = getFighterGrade(f2);
  const f1GradeMeta = getGradeMeta(f1Grade);
  const f2GradeMeta = getGradeMeta(f2Grade);

  const timerStr = getTopDuelTimerSecondsString();

  return `
    <div class="hud-top-duel">
      <!-- Player 1 (Left): Portrait on Outer Left -> Connected Top Health Bar -> Lower Name -->
      <div class="hud-top-player hud-top-p1" style="--fighter-theme: ${f1ThemeColor}; --grade-color: ${f1GradeMeta.color};" data-grade="${f1Grade}"${isF1NamelessDeity ? ' data-character="namelessdeity"' : ''}>
        <div class="hud-top-profile" data-grade="${f1Grade}"${isF1NamelessDeity ? ' data-character="namelessdeity"' : ''}>
          <div class="hud-top-profile__bg"></div>
          <canvas class="hud-top-profile__canvas" width="1400" height="1400"></canvas>
          <canvas class="hud-top-profile__grade-canvas" data-grade="${f1Grade}" width="128" height="88"></canvas>
        </div>
        <div class="hud-top-content">
          <div class="health-card__bar hud-top-bar${isF1Sans ? ' hud-bar-sans-stamina' : ''}">
            ${isF1Sans ? `
            <div class="sans-bolt-wrapper">
              <svg class="sans-bolt-icon" width="22" height="30" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L2 14H10L3 29L20 14H12L17 1H12Z" fill="#000000" stroke="#000000" stroke-width="2.5" stroke-linejoin="miter"/>
                <path d="M12 2L3 14H10L4 27L19 14H12L16 2H12Z" fill="url(#sansBoltGradTopP1)"/>
                <path d="M12 3L5 14H10L6 22L16 14H11L14 3H12Z" fill="#ffffff" opacity="0.6"/>
                <defs>
                  <linearGradient id="sansBoltGradTopP1" x1="3" y1="2" x2="19" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#93c5fd"/>
                    <stop offset="25%" stop-color="#38bdf8"/>
                    <stop offset="60%" stop-color="#2c4de0"/>
                    <stop offset="100%" stop-color="#1e3a8a"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="health-card__ghost" style="width: ${f1Percent}%;"></div>
            <div class="health-card__fill" style="width: ${f1Percent}%; background: ${f1BarColor};"></div>
            <div class="sans-stamina-dividers">
              <span class="sans-stamina-divider" style="left: 20%;"></span>
              <span class="sans-stamina-divider" style="left: 40%;"></span>
              <span class="sans-stamina-divider" style="left: 60%;"></span>
              <span class="sans-stamina-divider" style="left: 80%;"></span>
            </div>
            <span class="health-card__bar-text">${f1HpText}</span>
            ` : `
            <div class="health-card__ghost" style="width: ${f1Percent}%;"></div>
            <div class="health-card__fill" style="width: ${f1Percent}%; background: ${f1BarColor};"></div>
            <span class="health-card__bar-text">${f1HpText}</span>
            `}
          </div>
          <div class="hud-top-header">
            <span class="hud-top-name${f1SansClass}">${f1NameHtml}</span>
          </div>
        </div>
      </div>

      <!-- Center Match Timer -->
      <div class="hud-top-center">
        <div class="hud-top-timer">
          <span class="hud-top-timer-text" data-text="${timerStr}">${timerStr}</span>
        </div>
      </div>

      <!-- Player 2 (Right): Connected Top Health Bar -> Lower Name -> Portrait on Outer Right -->
      <div class="hud-top-player hud-top-p2" style="--fighter-theme: ${f2ThemeColor}; --grade-color: ${f2GradeMeta.color};" data-grade="${f2Grade}"${isF2NamelessDeity ? ' data-character="namelessdeity"' : ''}>
        <div class="hud-top-content">
          <div class="health-card__bar hud-top-bar${isF2Sans ? ' hud-bar-sans-stamina' : ''}">
            ${isF2Sans ? `
            <div class="sans-bolt-wrapper">
              <svg class="sans-bolt-icon" width="22" height="30" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L2 14H10L3 29L20 14H12L17 1H12Z" fill="#000000" stroke="#000000" stroke-width="2.5" stroke-linejoin="miter"/>
                <path d="M12 2L3 14H10L4 27L19 14H12L16 2H12Z" fill="url(#sansBoltGradTopP2)"/>
                <path d="M12 3L5 14H10L6 22L16 14H11L14 3H12Z" fill="#ffffff" opacity="0.6"/>
                <defs>
                  <linearGradient id="sansBoltGradTopP2" x1="3" y1="2" x2="19" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#93c5fd"/>
                    <stop offset="25%" stop-color="#38bdf8"/>
                    <stop offset="60%" stop-color="#2c4de0"/>
                    <stop offset="100%" stop-color="#1e3a8a"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="health-card__ghost" style="width: ${f2Percent}%;"></div>
            <div class="health-card__fill" style="width: ${f2Percent}%; background: ${f2BarColor};"></div>
            <div class="sans-stamina-dividers">
              <span class="sans-stamina-divider" style="left: 20%;"></span>
              <span class="sans-stamina-divider" style="left: 40%;"></span>
              <span class="sans-stamina-divider" style="left: 60%;"></span>
              <span class="sans-stamina-divider" style="left: 80%;"></span>
            </div>
            <span class="health-card__bar-text">${f2HpText}</span>
            ` : `
            <div class="health-card__ghost" style="width: ${f2Percent}%;"></div>
            <div class="health-card__fill" style="width: ${f2Percent}%; background: ${f2BarColor};"></div>
            <span class="health-card__bar-text">${f2HpText}</span>
            `}
          </div>
          <div class="hud-top-header">
            <span class="hud-top-name${f2SansClass}">${f2NameHtml}</span>
          </div>
        </div>
        <div class="hud-top-profile" data-grade="${f2Grade}"${isF2NamelessDeity ? ' data-character="namelessdeity"' : ''}>
          <div class="hud-top-profile__bg"></div>
          <canvas class="hud-top-profile__canvas" width="1400" height="1400"></canvas>
          <canvas class="hud-top-profile__grade-canvas" data-grade="${f2Grade}" width="128" height="88"></canvas>
        </div>
      </div>
    </div>
  `;
}

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
  const isDarkTheme = isDarkModeActive();

  // OPTIMIZATION: Auto-rebuild if HUD display mode, Arena Theme, or Camera Mode changed.
  const currentCameraMode = state.camera ? state.camera.mode : 'dynamic';
  const hudModeChanged = state._lastHudShowFighterDescription !== CONFIG.hudShowFighterDescription ||
                         state._lastDarkModeShowHudSkillBars !== CONFIG.darkModeShowHudSkillBars ||
                         state._lastDarkModeShowHudStats !== CONFIG.darkModeShowHudStats ||
                         state._lastHudHideAll !== CONFIG.hudHideAll ||
                         state._lastHudHideHealthBars !== CONFIG.hudHideHealthBars ||
                         state._lastHudHideSkillBars !== CONFIG.hudHideSkillBars ||
                         state._lastHudHideStats !== CONFIG.hudHideStats ||
                         state._lastHudSkillBarsMode !== CONFIG.hudSkillBarsMode ||
                         state._lastHudHideOverheadHp !== CONFIG.hudHideOverheadHp;
  const themeChanged = state._lastArenaTheme !== (state.arenaTheme || 'light');
  const cameraModeChanged = state._lastCameraMode !== currentCameraMode;
  state._lastHudShowFighterDescription = CONFIG.hudShowFighterDescription;
  state._lastDarkModeShowHudSkillBars = CONFIG.darkModeShowHudSkillBars;
  state._lastDarkModeShowHudStats = CONFIG.darkModeShowHudStats;
  state._lastHudHideAll = CONFIG.hudHideAll;
  state._lastHudHideHealthBars = CONFIG.hudHideHealthBars;
  state._lastHudHideSkillBars = CONFIG.hudHideSkillBars;
  state._lastHudHideStats = CONFIG.hudHideStats;
  state._lastHudSkillBarsMode = CONFIG.hudSkillBarsMode;
  state._lastHudHideOverheadHp = CONFIG.hudHideOverheadHp;
  state._lastArenaTheme = state.arenaTheme || 'light';
  state._lastCameraMode = currentCameraMode;
  const orientationChanged = state._lastViewOrientation !== (state.viewOrientation || 'vertical');
  state._lastViewOrientation = state.viewOrientation || 'vertical';
  if (hudModeChanged || themeChanged || cameraModeChanged || orientationChanged) {
    clearHealthHud();
  }

  // OPTIMIZATION: Throttling HUD updates to prevent extreme DOM reflow lag from progress bars.
  const isTactical = isTacticalMatch(state);
  const isH = (typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const mainFighters = fighters.filter(f => f && !f.isTurret && !f.isEndCrystal && !f.isMinion && !f.isDeployable);
  const is1v1 = mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.TACTICAL_1V1 || mode === 'Tactical 1v1' || mode === GAME_MODES.HORIZONTAL_1V1 || mode === '1v1 Widescreen Duel' || (mainFighters.length === 2 && !mode.includes('2v2') && !mode.includes('4v4'));
  const isStandOff = mode === GAME_MODES.STAND_OFF || mode === 'Stand Off' || mode === GAME_MODES.TACTICAL_STANDOFF || mode === 'Tactical Stand Off' || mode === GAME_MODES.TACTICAL_RANDOM || mode === 'Tactical Random';
  const isRegular1v2 = mode === GAME_MODES.ONE_VS_TWO || mode === '1v2';
  const isBossBattle = mode === GAME_MODES.STAND_OFF_1V2 || mode === GAME_MODES.BOSS_BATTLE || mode === 'Boss Battle' || mode === '1v2 Stand Off' || mode === 'STAND_OFF_1V2';
  const is1v2 = isRegular1v2 || isBossBattle;
  const is2v2 = mode === GAME_MODES.TWO_VS_TWO || mode === '2v2' || mode === GAME_MODES.TACTICAL_2V2 || mode === 'Tactical 2v2' || mode === GAME_MODES.TACTICAL_4V4 || mode === 'Tactical 4v4';
  const isTLFS = mode === GAME_MODES.TLFS || mode === 'TLFS';
  const isCameraTracking = (!state.camera || state.camera.mode === 'dynamic');
  const isFfa = mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA';
  const isTeamSingleColumn = isCameraTracking && (is2v2 || is1v2 || isTLFS || isFfa || mainFighters.length > 2);
  const isSingleColumnMode = (typeof state !== 'undefined' && state.viewOrientation === 'horizontal') || ((is1v1 || isStandOff || isFfa) && !isTactical) || isTeamSingleColumn;
  const currentHpStr = mainFighters.map(f => f ? Math.round(f.hp) : 0).join(',');
  const q = (v) => Math.round((v || 0) / 4);
  const currentSkillsStr = mainFighters.map(f => {
    if (!f) return '';
    const illCount = (f.characterId === 'doppleganger' || f.type === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppelganger')
      ? (state.illusions ? state.illusions.filter(ill => ill && ill.isDoppelganger && ill.hp > 0).length : 0) : 0;
    return `${f.isReloading || false},${f.magazineBullets || 0},${q(f.skillCooldown)},${q(f.cooldownTimer)},${f.domainActive || false},${q(f.beamCharge)},${q(f.beamTimer)},${q(f.shootCooldown)},${illCount},${q(f.totalAccumDamage)},${q(f.fatalAdaptCooldown)},${q(f.throwCooldown)},${q(f.shoutCooldown)},${q(f.reverseCursedTechniqueCooldown)},${q(f.divergentDashCooldown)},${f.isTakadaUltActive || false},${q(f.takadaUltTimer)},${f.isTakadaChanneling || false},${q(f.takadaChannelTimer)},${q(f.timeStopTimer)},${q(f.evadeBuffTimer)},${f.isRolling || false},${q(f.rollCooldown)},${f.isSelfDestructing || false},${f.isJetpackActive || false},${q(f.jetpackTimer)},${f.isBaguvixActive || false},${q(f.hesoyamShield)},${q(f.respect)},${q(f.jetpackCooldown)},${q(f.driveByCooldown)},${q(f.baguvixCooldown)},${q(f.baguvixTimer)},${q(f.driveByTimer)},${f.hasUsedHesoyam || false},${f.hasUsedTakadaUlt || false},${f.isDriveByActive || false},${f.isTypingCheat || false}`;
  }).join('|');
  const hpChanged = currentHpStr !== state._lastHpStr;
  const skillsChanged = currentSkillsStr !== state._lastSkillsStr;

  state._lastHpStr = currentHpStr;
  state._lastSkillsStr = currentSkillsStr;

  state._hudFrameCount = (state._hudFrameCount || 0) + 1;

  // Update Top Duel Center Timer (dirty-checked, updates only once per second)
  if (_cachedTopTimerEl) {
    const nowTimerStr = getTopDuelTimerSecondsString();
    if (_lastTopTimerText !== nowTimerStr) {
      _cachedTopTimerEl.textContent = nowTimerStr;
      _cachedTopTimerEl.setAttribute('data-text', nowTimerStr);
      _lastTopTimerText = nowTimerStr;
    }
  }

  // ── INSTANT Dim Class Toggle (runs ONLY on state transition, before throttle) ──
  {
    const isDimmedNow = isScreenDimmedActive();

    if (isDimmedNow !== _lastDimmedState || isDarkTheme !== _lastDarkThemeState) {
      _lastDimmedState = isDimmedNow;
      _lastDarkThemeState = isDarkTheme;

      const dimEls = _getDimElements();
      for (let i = 0; i < dimEls.length; i++) {
        const el = dimEls[i];
        if (!el || !el.classList) continue;

        if (isDimmedNow) el.classList.add('hud-dimmed');
        else el.classList.remove('hud-dimmed');

        if (isDarkTheme) el.classList.add('arena-dark-mode');
        else el.classList.remove('arena-dark-mode');
      }
    }
  }

  // Performance: Throttle expensive HUD innerHTML writes to avoid layout reflow stalls
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)));
  const throttleInterval = isLowQuality ? 8 : 4;
  const isCriticalState = ['roundEnd', 'matchEnd', 'countdown'].includes(state.gameState);
  const isInitialCacheEmpty = (_hudCache.fighters.size === 0 && _hudCache.teams.size === 0);
  
  if (!isCriticalState && !isInitialCacheEmpty && (state._hudFrameCount % throttleInterval !== 0)) {
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

  // getSkillDataForFighter and shouldShowFighterSkill are imported from ./ui/hudSkillProviders.js

  const getAdditionalInfoForFighter = (f) => {
    const info = [];
    const baseDmg = parseFloat(Math.max(0, Number(f.damage) || 0).toFixed(1));
    const fType = (f.characterId || f.type || (f._def && f._def.type) || '').toLowerCase();

    if (f.characterId === 'sans' || f.type === 'sans' || (f.name && f.name.toLowerCase() === 'sans')) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.sans) ? CONFIG.sans : {};
      const baseBoneDmg = cfg.damage || 8;
      const isBadTime = Boolean(f.isBadTimeActive);

      // 1. DMG Stat Line (with Bad Time boost)
      if (isBadTime) {
        info.push(`<b>DMG:</b> ${baseBoneDmg} <span style="color: #FFE600; font-size: 10px;">(BAD TIME)</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseBoneDmg}`);
      }

      // 2. HP: 1/1 (True Glass Cannon)
      info.push(`<b>HP:</b> 1/1`);
    } else if (f.characterId === 'yuta' || f.type === 'yuta') {
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
      const activeRate = f.domainActive
        ? (CONFIG.yuta?.domainRctHealRate || 0.90)
        : (isRikaAlive ? (CONFIG.yuta?.rikaActiveRegenRate || 0.06) : baseRegen);
      const regenMult = (f.domainActive || isRikaAlive)
        ? (typeof f.getRikaRegenMultiplier === 'function' ? f.getRikaRegenMultiplier() : (f.domainActive ? (CONFIG.yuta?.domainRikaRegenMultiplier || 3.0) : (CONFIG.yuta?.rikaActiveRegenMultiplier || 1.50)))
        : 1.0;
      const currentRegen = activeRate * regenMult;

      if (f.tojiRegenDebuffTimer > 0) {
        const debuffMult = CONFIG.toji?.regenDebuffMultiplier ?? 0.40;
        const debuffedRegen = currentRegen * debuffMult;
        info.push(`<b>Regen:</b> ${debuffedRegen.toFixed(2)}% <span style="color: #ef4444; font-size: 10px;">▼</span>`);
      } else if (f.domainActive || isRikaAlive) {
        const bonusRegen = Math.max(0, currentRegen - baseRegen);
        info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}% + ${bonusRegen.toFixed(2)}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Regen:</b> ${baseRegen.toFixed(2)}%`);
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
    } else if (f.characterId === 'yuji' || f.type === 'yuji' || f._def?.id === 'yuji' || f._def?.type === 'yuji') {
      const baseDmg = CONFIG.yuji?.punchDamage || 6;

      // 1. DMG: Base + Black Flash Zone multiplier
      if (f.blackFlashTimer > 0) {
        const bfMult = CONFIG.yuji?.blackFlashMultiplier || 2.5;
        const boostDmg = Math.round(baseDmg * bfMult) - baseDmg;
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else if (f.soulSwapActive) {
        const ssMult = CONFIG.yuji?.soulSwapDamageMultiplier || 2.0;
        const ssDmg = Math.round((CONFIG.sukuna?.slashDamage ?? (baseDmg * 2.5)) * ssMult);
        info.push(`<b>DMG:</b> ${ssDmg} <span style="color: #DC2626; font-size: 10px;">SUKUNA</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }

      // 2. DEF: Base + Black Flash Zone / Soul Swap boost
      const baseRed = Math.round((CONFIG.yuji?.baseDamageReduction ?? 0.05) * 100);
      let currentRed = baseRed;

      if (f.soulSwapActive) {
        const ssRed = Math.round((CONFIG.yuji?.soulSwapDamageReduction ?? 0.25) * 100);
        currentRed = Math.max(baseRed, ssRed);
      } else if (f.blackFlashTimer > 0) {
        const bfRed = Math.round((CONFIG.yuji?.blackFlashZoneDamageReduction ?? 0.15) * 100);
        currentRed = Math.max(baseRed, bfRed);
      }

      if (currentRed > baseRed) {
        const boost = currentRed - baseRed;
        info.push(`<b>DEF:</b> ${baseRed}% + ${boost}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DEF:</b> ${baseRed}%`);
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
    } else if (f.characterId === 'escanor' || f.type === 'escanor') {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
      const baseDmg = cfg.damage || 15;
      const prideDmgMult = 1.0 + ((f.prideStacks || 0) * (cfg.prideStackDamageBonus || 0.08)) + (f.isTheOneActive ? ((cfg.theOneDamageMultiplier || 1.45) - 1.0) : 0);
      const currentDmg = Math.round(baseDmg * prideDmgMult);
      const boostDmg = currentDmg - baseDmg;

      // 1. DMG: Base + Solar Escalation
      if (boostDmg > 0) {
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }

      // 2. DEF: Base Holy Armor + Solar Pride & The One Escalation
      const baseDef = Math.round((cfg.defense ?? 0.20) * 100);
      const prideDef = Math.round(((f.prideStacks || 0) * (cfg.prideDefBonusPerStack ?? 0.02)) * 100);
      const theOneDef = f.isTheOneActive ? Math.round((cfg.theOneDefenseBonus ?? 0.25) * 100) : 0;
      const liftingDef = (typeof f.isLiftingWeapon === 'function' && f.isLiftingWeapon()) ? Math.round((cfg.liftingDefenseBonus ?? 0.15) * 100) : 0;
      const totalBonusDef = prideDef + theOneDef + liftingDef;

      if (totalBonusDef > 0) {
        info.push(`<b>DEF:</b> ${baseDef}% + ${totalBonusDef}% <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DEF:</b> ${baseDef}%`);
      }

      // 3. Solar Pride / The One Stacks
      if (f.isTheOneActive) {
        info.push(`<b>PRIDE:</b> <span style="color: #F59E0B; font-weight: 700;">THE ONE</span>`);
      } else {
        info.push(`<b>PRIDE:</b> ${f.prideStacks || 0}/${f.prideMaxStacks || 5}`);
      }
    } else if (f.characterId === 'crazydave' || f.type === 'crazydave' || f._def?.id === 'crazydave' || f._def?.type === 'crazydave' || f.isCrazyDave) {
      const sun = Math.max(0, Math.round(f.sunCount || 0));
      info.push(`<b>$UN:</b> ${sun}`);
    } else if (f.characterId === 'shiro' || f.type === 'shiro' || fType === 'shiro' || (f.name && f.name.toLowerCase().includes('shiro')) || (f.displayName && f.displayName.includes('SHIRO'))) {
      const cfg = (typeof CONFIG !== 'undefined' && (CONFIG.shiro || CONFIG.Shiro)) ? (CONFIG.shiro || CONFIG.Shiro) : {};
      const baseDmg = f.damage || cfg.damage || 24;
      if (f.blankActiveTimer > 0) {
        const mult = cfg.blankBuffDamageMultiplier || 1.35;
        const boostDmg = Math.round(baseDmg * mult) - baseDmg;
        info.push(`<b>DMG:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${baseDmg}`);
      }
      let troopCount = 0;
      if (Array.isArray(f.activeMinions)) {
        troopCount = f.activeMinions.filter(m => m && !m.dead && !m.isDead && (m.hp === undefined || m.hp > 0)).length;
      } else if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
        troopCount = state.fighters.filter(other => other && (other.owner === f || other.owner === f.fighterIndex) && (other.isChessTroop || other.isChessMinion) && !other.dead && !other.isDead && (other.hp || 0) > 0).length;
      }
      info.push(`<b>Troops:</b> ${troopCount}`);
    } else if (f.characterId === 'namelessdeity' || f.characterId === 'nameless_deity' || fType === 'namelessdeity' || fType === 'nameless_deity') {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : {};
      const baseDmg = Math.round(cfg.damage || 14);
      const currentDmg = Math.round(Number(f.damage) || baseDmg);
      let dmgDisplay = '';
      if (currentDmg >= 1e12) {
        dmgDisplay = currentDmg.toExponential(0).toUpperCase();
      } else {
        dmgDisplay = currentDmg.toLocaleString('en-US');
      }

      if (currentDmg > baseDmg) {
        info.push(`<b>DMG:</b> ${dmgDisplay} <span style="color: #00F0FF; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>DMG:</b> ${dmgDisplay}`);
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
      } else if (f.characterId === 'zenitsu' || f.type === 'zenitsu') {
        const isTrance = Boolean(f.inBattleTrance);
        const baseCritRate = Math.round((CONFIG.zenitsu?.critChance ?? 0.20) * 100);
        const tranceCritRate = Math.round((CONFIG.zenitsu?.tranceCritChance ?? 1.0) * 100);
        const currentCritRate = isTrance ? tranceCritRate : Math.round((f.critChance !== undefined ? f.critChance : (CONFIG.zenitsu?.critChance ?? 0.20)) * 100);

        let critRateStr = `${baseCritRate}%`;
        if (isTrance) {
          critRateStr = `${tranceCritRate}% <span style="color: #F59E0B; font-size: 10px; font-weight: bold;">(TRANCE) ▲</span>`;
        } else if (currentCritRate > baseCritRate) {
          const boost = currentCritRate - baseCritRate;
          critRateStr = `${baseCritRate}% + ${boost}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
        } else if (currentCritRate < baseCritRate) {
          const debuff = baseCritRate - currentCritRate;
          critRateStr = `${baseCritRate}% - ${debuff}% <span style="color: #ef4444; font-size: 10px;">▼</span>`;
        }

        const baseCritMult = Math.round((CONFIG.zenitsu?.critMultiplier ?? 1.75) * 100);
        const tranceCritMult = Math.round((CONFIG.zenitsu?.tranceCritMultiplier ?? 2.00) * 100);
        const currentCritMult = isTrance ? tranceCritMult : Math.round((f.critMultiplier !== undefined ? f.critMultiplier : (CONFIG.zenitsu?.critMultiplier ?? 1.75)) * 100);

        let critDmgStr = `${baseCritMult}%`;
        if (isTrance) {
          critDmgStr = `${tranceCritMult}% <span style="color: #F59E0B; font-size: 10px; font-weight: bold;">(TRANCE) ▲</span>`;
        } else if (currentCritMult > baseCritMult) {
          const boost = currentCritMult - baseCritMult;
          critDmgStr = `${baseCritMult}% + ${boost}% <span style="color: #15803d; font-size: 10px;">▲</span>`;
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
          ? Math.round((CONFIG.toji?.domainDodgeChance ?? 0.95) * 100)
          : Math.round((CONFIG.toji?.stealthDodgeChance ?? 0.10) * 100);
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
        const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
        const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage ?? 0.025;
        const maxStages = CONFIG.mahoraga?.maxRctRegenStages ?? 6;
        const maxRegenRate = CONFIG.mahoraga?.maxRctRegenRate ?? 0.12;
        const effectiveStages = Math.min(totalStages, maxStages);
        const currentRegenRate = Math.min(maxRegenRate, effectiveStages * rctPerStage);
        const currentRegenPerSec = Math.round(currentRegenRate * 60);

        if (f.tojiRegenDebuffTimer > 0) {
          const debuffMult = CONFIG.toji?.regenDebuffMultiplier ?? 0.40;
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
      } else if (f.characterId === 'berserker' || f.type === 'berserker') {
        const rage = Math.round((f.rage || 0) * 100);
        const rageMax = Math.round((f.maxRage || 1) * 100);
        info.push(`<b>Rage:</b> ${rage}/${rageMax}`);
        if (f.isEnraged) {
          info.push(`<b>ENRAGED:</b> Active <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'rubbick' || f.type === 'rubbick' || f.characterId === 'trickster' || f.type === 'trickster') {
        const bounceMax = (CONFIG.rubbick || CONFIG.trickster)?.bounceCount || 4;
        info.push(`<b>Bounces:</b> ${bounceMax}`);
        if (f.stolenType) {
          const stolenName = (f.stolenType === 'gojo' ? 'HOLLOW PURPLE' : (f.stolenType === 'gojo_red' ? 'REVERSAL RED' : (f.stolenType === 'gojo_domain' ? 'UNLIMITED VOID' : (f.stolenType === 'sukuna' ? 'DIVINE FLAME' : f.stolenType.toUpperCase()))));
          info.push(`<b>Stolen:</b> <span style="color: #00FF64;">${stolenName}</span>`);
        } else {
          info.push(`<b>Stolen:</b> NONE`);
        }
        if (f.tkTimer > 0) {
          info.push(`<b>TK:</b> <span style="color: #8A2BE2;">LIFTING</span>`);
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

    // Spike (Thorn Brawler / Melee) stats info
    if (f.characterId === 'spike' || f.characterId === 'melee' || fType === 'spike' || fType === 'melee' || f._def?.type === 'melee' || (f._def && f._def.name === 'Spike')) {
      const cfg = (typeof CONFIG !== 'undefined' && (CONFIG.spike || CONFIG.melee)) ? (CONFIG.spike || CONFIG.melee) : {};
      const baseDmg = cfg.contactDamage ?? (f.damage || 25);
      info.push(`<b>DMG:</b> ${baseDmg}`);

      const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
      const baseSpd = (f.baseSpeed || cfg.speed || 5.5) * modeMult;
      const currentSpd = (f.speed || baseSpd) * modeMult;
      const spdDiff = Math.max(0, currentSpd - baseSpd);
      const stacks = f.speedStacks || 0;

      if (spdDiff > 0.05 && stacks > 0) {
        info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)} + ${spdDiff.toFixed(1)} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else if (spdDiff > 0.05) {
        info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)} + ${spdDiff.toFixed(1)} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)}`);
      }
    }

    // Naoya (24 FPS Projection Sorcery) stats info
    if (f.characterId === 'naoya' || fType === 'naoya' || (f._def && (f._def.name === 'Naoya' || f._def.name === 'Naoya Zenin')) || f.name === 'Naoya') {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.naoya) ? CONFIG.naoya : {};
      const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
      const baseSpd = (f.baseSpeed || cfg.speed || 5.6) * modeMult;
      const currentSpd = (f.speed || baseSpd) * modeMult;
      const spdDiff = Math.max(0, currentSpd - baseSpd);
      const stacks = f.frameStacks || 0;

      const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 10;
      if (spdDiff > 0.05 && stacks > 0) {
        info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)} + ${spdDiff.toFixed(1)} <span style="color: #76E042; font-size: 10px;">▲ (x${stacks}/${maxStacks})</span>`);
      } else {
        info.push(`<b>SPD:</b> ${baseSpd.toFixed(1)}`);
      }

      const evadePct = Math.round((f.evadeChance ?? (cfg.baseEvadeChance || 0.05)) * 100);
      if (evadePct > 0) {
        info.push(`<b>EVADE:</b> ${evadePct}% <span style="color: #00F2FE; font-size: 10px;">▲</span>`);
      }
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
    return '';
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
    return '';
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
            <div class="hud-cj-armor-bar" style="${(CONFIG.hudHideHealthBars || CONFIG.hudHideAll) ? 'display: none;' : ''}">
              <div class="hud-cj-armor-fill" style="width: ${staminaPercent}%; background: ${targetFighter.isExhausted ? '#94A3B8' : '#FFFFFF'};"></div>
            </div>

            <!-- Red Health Bar (HP) -->
            <div class="health-card__bar hud-bar-cj" style="${(CONFIG.hudHideHealthBars || CONFIG.hudHideAll) ? 'display: none;' : ''}">
              <div class="health-card__ghost" style="width: ${hpPercent}%;"></div>
              <div class="health-card__fill" style="width: ${hpPercent}%; background: #DC2626;"></div>
              <span class="health-card__bar-text" style="display: none;">${metaValue}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const generateCjGtaStackHTML = (fighter, align = 'left') => {
    return generateCjGtaHudWidgetHTML(fighter, align);
  };

  const generateFighterSkillsHTML = (f, align, singleColumn = false) => {
    if (CONFIG.hudHideAll || CONFIG.hudHideSkillBars || CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
      return '';
    }
    const isTac = isTacticalFighter(f) || isTacticalMatch(state);
    if (isTac) return ''; // Simple HUD mode: Only Name & Healthbar

    const allSkills = getSkillDataForFighter(f);
    if (!allSkills || allSkills.length === 0) return '';

    // Filter skills based on Dark Mode settings & fighter-specific exceptions (e.g. Ichigo Bankai, Toji Ultimate)
    const skills = allSkills.filter(s => shouldShowFighterSkill(f, s));
    if (!skills || skills.length === 0) return '';

    const isDarkTheme = isDarkModeActive();
    const isCj = isCjCustomHudActive(f);
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
    if (CONFIG.hudHideAll || CONFIG.hudHideStats || !shouldShowHudStats()) return '';
    if (!f) return '';
    const isTacFighter = isTacticalFighter(f) || isTacticalMatch(state);
    if (isTacFighter) return ''; // Simple HUD mode: Only Name & Healthbar

    let info = getAdditionalInfoForFighter(f);
    const isDummy = f.characterId === 'dummy' || f.type === 'dummy';
    if (CONFIG.hudShowFighterDescription && !isDummy) {
      info = info.filter(line => line.includes('<b>DMG:</b>') || line.includes('<b>Tick DMG:</b>') || line.includes('<b>Stun Chance:</b>') || line.includes('<b>Illusions:</b>') || line.includes('<b>DODGE:</b>') || line.includes('<b>Dodge:</b>') || line.includes('<b>Dodge Chance:</b>') || line.includes('<b>DEF:</b>') || line.includes('<b>ATK RANGE:</b>') || line.includes('<b>CC:</b>') || line.includes('<b>Parry:</b>') || line.includes('<b>PARRY:</b>') || line.includes('<b>ATTK SPD:</b>') || line.includes('<b>ATK SPD:</b>') || line.includes('<b>SPD:</b>') || line.includes('<b>Speed:</b>') || line.includes('<b>Regen:</b>') || line.includes('<b>$UN:</b>') || line.includes('<b>SUN:</b>') || line.includes('<b>Plants:</b>') || line.includes('<b>Troops:</b>'));
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

      const spanClass = ' span-2';

      if (splitIdx !== -1) {
        const cleanLabel = label.replace(/<\/?b>/g, '');
        const cleanVal = displayVal.replace(/<\/?b>/g, '').trim();
        const upperLabel = cleanLabel.toUpperCase();
        const upperVal = cleanVal.toUpperCase();
        const isCyanAccent = upperLabel.includes('INFINITY') || upperVal.includes('ACTIVE') || upperLabel.includes('BARRIER') || upperLabel.includes('SHIELD');
        const isGoldAccent = upperLabel.includes('CRIT') || upperLabel.includes('DMG') || upperLabel.includes('ATK') || upperLabel.includes('KILL');
        const accentClass = isCyanAccent ? ' hud-chip-cyan' : (isGoldAccent ? ' hud-chip-gold' : '');
        return `<div class="${spanClass}${accentClass}"><span class="hud-stat-label">${cleanLabel}</span> <span class="hud-stat-val">${cleanVal}</span></div>`;
      }
      return `<div class="${spanClass}"><span class="hud-stat-val">${line.replace(/<\/?b>/g, '')}</span></div>`;
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

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5, targetFighter = null, titleAlign = 'left', singleColumn = false, customHeaderHTML = '', hideHealthBar = false }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const winnerStyle = '';
    const isTactical = isTacticalMatch(state) || (targetFighter && isTacticalFighter(targetFighter)) || (members && members.some(m => isTacticalFighter(m)));
    if (isTactical) {
      maxBullets = 0;
    }

    const isH = typeof state !== 'undefined' && state.viewOrientation === 'horizontal';
    const isCompactCard = extraClass.includes('ffa-card') || isH;
    const baseFontSize = isCompactCard ? 16 : (CONFIG.hudTitleFontSize || 20);
    const maxChars = isTactical ? 28 : (isCompactCard ? 18 : 24);
    const isDark = (state.arenaTheme === 'dark') || isTactical;
    const isYutaCard = (targetFighter && (targetFighter.characterId === 'yuta' || targetFighter.type === 'yuta')) || (title && (title.toUpperCase().includes('YUTA') || title.toUpperCase().includes('OKKOTSU')));
    const defaultNameColor = isDark ? (isYutaCard ? '#FF1493' : '#ffffff') : '#000000';
    let nameColor = defaultNameColor;
    let truncatedTitle = title;
    if (title && title.length > maxChars) {
      truncatedTitle = title.substring(0, maxChars - 1) + '…';
    }

    const isDarkTheme = isDarkModeActive();
    const getTitleStyle = (color, isCj = false) => {
      if (isTactical) {
        return `color: ${color || '#ffffff'}; font-size: 13px; text-transform: uppercase; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Inter', 'Helvetica Neue', Arial, sans-serif; font-weight: 800; letter-spacing: 0.2px; line-height: 1.15; `;
      }
      const useCj = isCj;
      const fontFamily = useCj ? `'Pricedown', 'Impact', 'Arial Black', Arial, sans-serif` : `'Glast Blitch', Arial, sans-serif`;
      const fontSize = useCj ? (baseFontSize + 2) : baseFontSize;
      const letterSpacing = useCj ? '0.5px' : '0.2px';
      return `color: ${color || '#ffffff'}; font-size: ${fontSize}px; text-transform: uppercase; font-family: ${fontFamily}; letter-spacing: ${letterSpacing}; font-weight: normal; `;
    };

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map((m, mIndex) => {
        const isMemberCj = isCjCustomHudActive(m);
        const isMemberSans = m && (m.characterId === 'sans' || m.type === 'sans' || (m.name && m.name.toLowerCase() === 'sans'));
        let ratio, percent, barColor, hpText;
        if (isMemberSans) {
          const isDead = m.hp <= 0;
          const curStam = isDead ? 0 : ((m.stamina !== undefined) ? m.stamina : 100);
          const maxStam = m.maxStamina || 100;
          ratio = (!isDead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
          percent = isDead ? 0 : Math.min(100, Math.max(0, Math.round(ratio * 100)));
          barColor = (ratio < 0.25) ? '#FFE600' : '#2c4de0ff';
          hpText = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
        } else {
          ratio = m.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(m.hp) / Number(m.maxHp))) : 0;
          percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
          barColor = isMemberCj ? '#DC2626' : getFighterHealthBarColor(m, ratio, isDarkTheme);
          hpText = (isTactical && m.hp <= 0) ? 'KIA' : `${Math.floor(Math.max(0, Number(m.hp) || 0))}`;
        }
        const cjBarClass = isMemberCj ? ' hud-bar-cj' : '';
        const sansBarClass = isMemberSans ? ' hud-bar-sans-stamina' : '';
        const memberStackHTML = isMemberCj ? generateCjGtaStackHTML(m, titleAlign || 'left') : '';
        const { className } = getGlowStyles(m);
        const memberShakeTimer = m._healthBarShakeTimer || 0;
        const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
        const memberShakeStyle = memberShakeTimer > 0 ? `transform: translateX(${memberShakeAmount}px);` : '';
        const isDummy = m && (m.characterId === 'dummy' || m.type === 'dummy');
        const showDescription = CONFIG.hudShowFighterDescription || isDummy;
        const isSingleCol = singleColumn;
        const memberSkillsHTML = !showDescription ? generateFighterSkillsHTML(m, titleAlign || 'left', isSingleCol) : '';
        const memberInfoHTML = generateFighterInfoHTML(m, isSingleCol, true);
        const skillsGridStyle = isSingleCol ? 'grid-template-columns: 1fr;' : '';
        const infoGridStyle = `grid-template-columns: 1fr;`;

        const isMemberYuta = m && (m.characterId === 'yuta' || m.type === 'yuta' || (m.name && m.name.toUpperCase().includes('YUTA')));
        let memberNameColor = isDarkTheme ? (isMemberYuta ? '#FF1493' : defaultNameColor) : defaultNameColor;
        const memberThemeColor = getFighterThemeColor(m, memberNameColor);
        const memberName = getFighterDisplayName(m, true);
        const memberNameClass = isMemberSans ? 'health-card__member-name hud-sans-name' : 'health-card__member-name';
        const memberHeaderHTML = `
          <div class="health-card__member-header" style="margin-bottom: 4px; display: flex; align-items: center; justify-content: ${titleAlign === 'right' ? 'flex-end' : 'flex-start'};">
            <span class="${memberNameClass}" style="color: ${memberThemeColor}; font-family: 'Silkscreen', 'Press Start 2P', monospace, sans-serif; font-size: ${isH ? '14.5px' : '15px'}; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">${memberName}</span>
          </div>
        `;

        const memberMarginTop = isH ? (mIndex === 0 ? '0' : 'auto') : (mIndex === 0 ? '0' : '18px');

        if (isMemberCj) {
          return `
            <div class="health-card__member" style="margin-top: ${memberMarginTop};">
              ${memberHeaderHTML}
              ${generateCjGtaHudWidgetHTML(m, titleAlign, hpText, memberShakeStyle)}
              ${memberSkillsHTML ? `<div class="health-card__skills" style="${skillsGridStyle}">${memberSkillsHTML}</div>` : ''}
              ${memberInfoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${memberInfoHTML}</div>` : ''}
            </div>
          `;
        }

        const hideHb = Boolean(CONFIG.hudHideHealthBars || CONFIG.hudHideAll);
        return `
          <div class="health-card__member" style="margin-top: ${memberMarginTop};">
            ${memberHeaderHTML}
            ${memberStackHTML}
            <div class="health-card__bar${cjBarClass}${sansBarClass}" style="${memberShakeStyle} ${hideHb ? 'display: none;' : ''}">
            ${isMemberSans ? `
              <div class="sans-bolt-wrapper">
                <svg class="sans-bolt-icon" width="22" height="30" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L2 14H10L3 29L20 14H12L17 1H12Z" fill="#000000" stroke="#000000" stroke-width="2.5" stroke-linejoin="miter"/>
                <path d="M12 2L3 14H10L4 27L19 14H12L16 2H12Z" fill="url(#sansBoltGrad)"/>
                <path d="M12 3L5 14H10L6 22L16 14H11L14 3H12Z" fill="#ffffff" opacity="0.6"/>
                <defs>
                  <linearGradient id="sansBoltGrad" x1="3" y1="2" x2="19" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#93c5fd"/>
                    <stop offset="25%" stop-color="#38bdf8"/>
                    <stop offset="60%" stop-color="#2c4de0"/>
                    <stop offset="100%" stop-color="#1e3a8a"/>
                  </linearGradient>
                </defs>
              </svg>
              </div>
              <div class="sans-stamina-pixel-track">
                <div class="health-card__ghost" style="width:${percent}%;"></div>
                <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
                <div class="sans-stamina-dividers">
                  <span class="sans-stamina-divider" style="left: 20%;"></span>
                  <span class="sans-stamina-divider" style="left: 40%;"></span>
                  <span class="sans-stamina-divider" style="left: 60%;"></span>
                  <span class="sans-stamina-divider" style="left: 80%;"></span>
                </div>
                <span class="health-card__bar-text">${hpText}</span>
              </div>
            ` : `
              <div class="health-card__ghost" style="width:${percent}%;"></div>
              <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
              <span class="health-card__bar-text">${hpText}</span>
            `}
            </div>
            ${memberSkillsHTML ? `<div class="health-card__skills" style="${skillsGridStyle}">${memberSkillsHTML}</div>` : ''}
            ${memberInfoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${memberInfoHTML}</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      const isTargetCj = isCjCustomHudActive(targetFighter);
      const isTargetSans = targetFighter && (targetFighter.characterId === 'sans' || targetFighter.type === 'sans' || (targetFighter.name && targetFighter.name.toLowerCase() === 'sans'));
      let percent, barColor, displayValue;
      if (isTargetSans) {
        const isDead = targetFighter.hp <= 0;
        const curStam = isDead ? 0 : ((targetFighter.stamina !== undefined) ? targetFighter.stamina : 100);
        const maxStam = targetFighter.maxStamina || 100;
        const stamRatio = (!isDead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
        percent = isDead ? 0 : Math.min(100, Math.max(0, Math.round(stamRatio * 100)));
        barColor = (stamRatio < 0.25) ? '#FFE600' : '#2c4de0ff';
        displayValue = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
      } else {
        percent = Math.round(safeRatio * 100);
        barColor = isTargetCj ? '#DC2626' : getFighterHealthBarColor(targetFighter, safeRatio, isDarkTheme);
        displayValue = metaValue;
      }
      const cjBarClass = isTargetCj ? ' hud-bar-cj' : '';
      const sansBarClass = isTargetSans ? ' hud-bar-sans-stamina' : '';
      const { className } = getGlowStyles(targetFighter);
      
      const isDummy = targetFighter && (targetFighter.characterId === 'dummy' || targetFighter.type === 'dummy');
      const showDescription = CONFIG.hudShowFighterDescription || isDummy;
      const skillsHTML = targetFighter && !showDescription ? generateFighterSkillsHTML(targetFighter, 'left', singleColumn) : '';
      const infoHTML = targetFighter ? generateFighterInfoHTML(targetFighter, singleColumn) : '';

      const barShakeTimer = targetFighter ? (targetFighter._healthBarShakeTimer || 0) : 0;
      const barShakeAmount = barShakeTimer > 0 ? Math.sin((12 - barShakeTimer) * 0.75) * 3 : 0;
      const barShakeStyle = barShakeTimer > 0 ? `transform: translateX(${barShakeAmount}px);` : '';

      const skillsGridStyle = singleColumn ? 'grid-template-columns: 1fr;' : '';
      const infoGridStyle = `grid-template-columns: 1fr;`;

      const hideHb = Boolean(CONFIG.hudHideHealthBars || CONFIG.hudHideAll || hideHealthBar);

      if (isTargetCj) {
        barsHTML = `
          ${generateCjGtaHudWidgetHTML(targetFighter, titleAlign, metaValue, barShakeStyle)}
          <div class="health-card__skills" style="${skillsGridStyle}">
            ${skillsHTML}
          </div>
          ${infoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${infoHTML}</div>` : ''}
        `;
      } else {
        const hpBarHTML = hideHealthBar ? '' : `
          <div class="health-card__bar${cjBarClass}${sansBarClass}" style="${barShakeStyle} ${hideHb ? 'display: none;' : ''}">
          ${isTargetSans ? `
            <div class="sans-bolt-wrapper">
              <svg class="sans-bolt-icon" width="22" height="30" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L2 14H10L3 29L20 14H12L17 1H12Z" fill="#000000" stroke="#000000" stroke-width="2.5" stroke-linejoin="miter"/>
                <path d="M12 2L3 14H10L4 27L19 14H12L16 2H12Z" fill="url(#sansBoltGrad)"/>
                <path d="M12 3L5 14H10L6 22L16 14H11L14 3H12Z" fill="#ffffff" opacity="0.6"/>
                <defs>
                  <linearGradient id="sansBoltGrad" x1="3" y1="2" x2="19" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#93c5fd"/>
                    <stop offset="25%" stop-color="#38bdf8"/>
                    <stop offset="60%" stop-color="#2c4de0"/>
                    <stop offset="100%" stop-color="#1e3a8a"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="sans-stamina-pixel-track">
              <div class="health-card__ghost" style="width:${percent}%;"></div>
              <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
              <div class="sans-stamina-dividers">
                <span class="sans-stamina-divider" style="left: 20%;"></span>
                <span class="sans-stamina-divider" style="left: 40%;"></span>
                <span class="sans-stamina-divider" style="left: 60%;"></span>
                <span class="sans-stamina-divider" style="left: 80%;"></span>
              </div>
              <span class="health-card__bar-text">${displayValue}</span>
            </div>
          ` : `
            <div class="health-card__ghost" style="width:${percent}%;"></div>
            <div class="${className}" style="width:${percent}%; background:${barColor};"></div>
            <span class="health-card__bar-text">${displayValue}</span>
          `}
          </div>
        `;
        barsHTML = `
          ${hpBarHTML}
          ${showDescription ? `
            ${infoHTML ? `<div class="health-card__info" style="${infoGridStyle}">${infoHTML}</div>` : ''}
            <div class="health-card__desc" style="color: ${CONFIG.hudTextColor}; font-size: ${CONFIG.hudDescFontSize || 16}px; line-height: 1.4; margin-top: 8px; ${(CONFIG.hudHideAll) ? 'display: none;' : ''}">
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
    const winsBullets = (maxBullets > 0) ? Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      const bulletBg = filled ? (fighterColor || '#ffd700') : (isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.20)');
      const bulletBorder = filled ? (fighterColor || '#ffd700') : (isDarkTheme ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.40)');
      const bulletGlow = filled ? 'box-shadow: 0 0 6px rgba(255,215,0,0.65);' : '';
      return `<span class="health-card__win-bullet${filled ? ' filled' : ''}" style="background: ${bulletBg}; border-color: ${bulletBorder}; ${bulletGlow}"></span>`;
    }).join('') : '';

    const winsAlign = titleAlign === 'right' ? 'flex-end' : 'flex-start';
    const winsHTML = (maxBullets > 0 && !hideHealthBar) ? `<div class="health-card__wins" style="display: flex; gap: 6px; align-items: center; justify-content: ${winsAlign}; margin: 2px 0 6px;">${winsBullets}</div>` : '';

    const rightHeaderHTML = '';

    const headerRowHTML = customHeaderHTML || '';

    const cardBgStyle = isTactical ? 'background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none;' : '';
    const themeColor = borderColor || fighterColor || (targetFighter ? getFighterThemeColor(targetFighter) : '#38BDF8');
    const themeVarStyle = `--fighter-theme: ${themeColor};`;
    return `
      <div class="health-card ${extraClass}" style="${winnerStyle} ${cardBgStyle} ${themeVarStyle}">
        ${headerRowHTML}
        ${cjStackHTML}
        ${winsHTML}
        ${barsHTML}
      </div>
    `;
  };

  const isTeamHudMode = is2v2 || isRegular1v2;
  const isCacheEmpty = isTeamHudMode ? (_hudCache.teams.size === 0) : (_hudCache.fighters.size === 0);

  if (isCacheEmpty) {
    syncHudPosition();
    if (containerBottom) containerBottom.innerHTML = '';
    if (containerLeft) containerLeft.innerHTML = '';
    if (containerRight) containerRight.innerHTML = '';

    if (isBossBattle) {
      // BOSS BATTLE MODE:
      // Boss is rendered at the top of the arena (#hudTopContainer) with NO skill bars
      const bossFighter = fighters.find(f => f && f.isBoss) || fighters[0];
      if (bossFighter && !bossFighter.isTurret && !bossFighter.isEndCrystal && !bossFighter.isMinion && !bossFighter.isDeployable && _cachedTopContainer) {
        const isDark = (state.arenaTheme === 'dark');
        const curHp = (typeof bossFighter.getDisplayHp === 'function') ? bossFighter.getDisplayHp() : bossFighter.hp;
        const maxHp = bossFighter._originalMaxHp || bossFighter.maxHp || 440;
        const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        const barColor = getFighterHealthBarColor(bossFighter, ratio, isDark);
        const isBossSans = Boolean(bossFighter.characterId === 'sans' || bossFighter.type === 'sans' || (bossFighter.name && bossFighter.name.toLowerCase() === 'sans'));
        const bossName = getFighterDisplayName(bossFighter, true);
        const bossSubname = getBossSubName(bossFighter);
        const bossColor = getFighterThemeColor(bossFighter, '#ef4444');
        const hpValText = `${Math.floor(Math.max(0, Number(curHp) || 0))} / ${Math.floor(maxHp)}`;
        const bossNameClass = isBossSans ? 'boss-card__name hud-sans-name' : 'boss-card__name';

        const bossCardHTML = `
          <div class="boss-card">
            <div class="boss-card__header">
              <span class="${bossNameClass}" style="color: ${bossColor};">${bossName}</span>
              <span class="boss-card__subname" style="color: ${bossColor};">${bossSubname}</span>
            </div>
            <div class="health-card__bar boss-bar">
              <div class="health-card__ghost" style="width: ${percent}%;"></div>
              <div class="health-card__fill" style="width: ${percent}%; background: ${barColor};"></div>
              <span class="boss-bar__text health-card__bar-text">${hpValText}</span>
            </div>
          </div>
        `;

        _cachedTopContainer.innerHTML = bossCardHTML;
        _cachedTopContainer.style.display = 'flex';
        _cachedTopContainer.style.visibility = 'visible';
        _cachedTopContainer.style.opacity = '1';

        const bossCardEl = _cachedTopContainer.firstElementChild;
        const hpBar = bossCardEl ? bossCardEl.querySelector('.health-card__bar') : null;
        const hpBarFill = bossCardEl ? bossCardEl.querySelector('.health-card__fill') : null;
        const hpBarGhost = bossCardEl ? bossCardEl.querySelector('.health-card__ghost') : null;
        const hpBarText = bossCardEl ? (bossCardEl.querySelector('.boss-bar__text') || bossCardEl.querySelector('.health-card__bar-text')) : null;
        const bossCardName = bossCardEl ? bossCardEl.querySelector('.boss-card__name') : null;
        const bossCardSubname = bossCardEl ? bossCardEl.querySelector('.boss-card__subname') : null;

        _hudCache.fighters.set(bossFighter, {
          cardElement: bossCardEl,
          hpBar,
          hpBarFill,
          hpBarGhost,
          hpBarText,
          bossCardName,
          bossCardSubname,
          lastBossName: bossName,
          lastBossSubname: bossSubname,
          lastBossThemeColor: bossColor,
          lastBossNameOpacity: 1,
          starsContainer: null,
          moneyTextEl: null,
          lastMoneyText: '',
          lastStarCount: -1,
          winBullets: [],
          infoContainer: null,
          checkbox: null,
          skillsContainer: null,
          skillBars: new Map(),
          lastInfoHTML: '',
          lastHpPct: percent,
          lastBarColor: barColor,
          lastHpText: hpValText,
          lastChecked: null
        });
      }

      // 2 Challengers placed side-by-side at bottom (#healthHud)
      // Names are drawn on canvas by drawArenaMatchNames; cards hold healthbar, skills, and info.
      const challengers = fighters.filter(f => f && !f.isBoss && !f.isTurret && !f.isEndCrystal && !f.isMinion && !f.isDeployable).slice(0, 2);
      containerBottom.classList.add('boss-battle-hud');

      challengers.forEach((chFighter, chIdx) => {
        const fighterIndex = state.fighters.indexOf(chFighter);
        const isDark = (state.arenaTheme === 'dark');
        const curHp = (typeof chFighter.getDisplayHp === 'function') ? chFighter.getDisplayHp() : chFighter.hp;
        const maxHp = chFighter._originalMaxHp || chFighter.maxHp || 440;
        const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
        const fighterThemeColor = getFighterThemeColor(chFighter, chIdx === 0 ? '#38bdf8' : '#f43f5e');
        const chColor = chFighter.color || fighterThemeColor;
        let nameColor = isDark ? (fighterThemeColor || '#ffffff') : '#000000';
        const isChSans = Boolean(chFighter.characterId === 'sans' || chFighter.type === 'sans' || (chFighter.name && chFighter.name.toLowerCase() === 'sans'));
        const fighterName = getFighterDisplayName(chFighter, true);
        const fighterStats = state.leaderboard ? (state.leaderboard[chFighter.fighterIndex] || { wins: 0, losses: 0 }) : { wins: 0, losses: 0 };
        const careerWins = fighterStats.wins;
        const losses = fighterStats.losses;
        const totalGames = careerWins + losses;
        const winRate = totalGames > 0 ? Math.round((careerWins / totalGames) * 100) : 0;
        const fighterDef = chFighter.fighterIndex !== undefined ? FIGHTER_DEFS[chFighter.fighterIndex] : null;
        const shakeTimer = chFighter._healthBarShakeTimer || 0;
        const matchWins = (state.scores && fighterIndex >= 0 && state.scores[fighterIndex]) ? state.scores[fighterIndex] : 0;
        const cardDesc = (fighterDef && mode !== GAME_MODES.FFA) ? fighterDef.desc : '';
        const chNameClass = isChSans ? 'challenger-name hud-sans-name' : 'challenger-name';

        const chHeaderHTML = `
          <div class="challenger-header">
            <span class="${chNameClass}" style="color: ${fighterThemeColor};">${fighterName}</span>
          </div>
        `;

        const chCardHTML = buildCard({
          title: fighterName,
          scoreText: '',
          fillColor: chColor,
          fillRatio: ratio,
          metaLabel: `DMG: ${parseFloat(Math.max(0, Number(chFighter.damage) || 0).toFixed(1))}`,
          metaValue: `${Math.floor(Math.max(0, Number(curHp) || 0))}`,
          extraClass: `challenger-card challenger-${chIdx + 1}-card single-column hud-player-p${chIdx + 1}`,
          borderColor: fighterThemeColor,
          wins: matchWins,
          fighterColor: nameColor,
          shakeTimer,
          isWinner: chFighter === state.roundWinner,
          description: cardDesc,
          kills: (state.matchKills && fighterIndex >= 0) ? state.matchKills[fighterIndex] || [] : [],
          maxBullets: 0,
          targetFighter: chFighter,
          titleAlign: 'left',
          singleColumn: true,
          customHeaderHTML: chHeaderHTML
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chCardHTML;
        const cardElement = tempDiv.firstElementChild;
        containerBottom.appendChild(cardElement);

        const hpBar = cardElement.querySelector('.health-card__bar');
        const hpBarFill = cardElement.querySelector('.health-card__fill');
        const hpBarGhost = cardElement.querySelector('.health-card__ghost');
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

        const skillsContainer = cardElement.querySelector('.health-card__skills');
        const skillBars = new Map();
        cardElement.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fill = box.querySelector('.hud-skill-box-fill');
          const text = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill, text });
        });

        const chCardName = cardElement.querySelector('.challenger-name');

        _hudCache.fighters.set(chFighter, {
          cardElement,
          skillsContainer,
          hpBar,
          hpBarFill,
          hpBarGhost,
          hpBarText,
          chCardName,
          lastChName: fighterName,
          lastChThemeColor: fighterThemeColor,
          lastChOpacity: 1,
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
          winBullets,
          infoContainer,
          checkbox,
          skillBars,
          lastInfoHTML: '',
          lastHpPct: -1,
          lastBarColor: '',
          lastHpText: `${Math.floor(Math.max(0, Number(curHp) || 0))}`,
          lastChecked: null
        });
      });
    } else if (is2v2 || isRegular1v2) {
      // 2v2 / Regular 1v2 Team Mode
      const teamLabels = isRegular1v2 ? [
        { title: 'RED TEAM', color: '#ff4d4d', indexes: [0], key: 'red' },
        { title: 'BLUE TEAM', color: '#4da3ff', indexes: [1, 2], key: 'blue' },
      ] : [
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
          extraClass: isTactical ? `${team.key} tactical-card` : (`${team.key} team-card` + (isTeamSingleColumn ? ' single-column' : '')),
          shakeTimer,
          isWinner: isWinner,
          borderColor: isWinner ? '#ffd700' : null,
          kills: members.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
          maxBullets: 0,
          titleAlign: teamIndex === 0 ? 'left' : 'right',
          singleColumn: isTeamSingleColumn
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;
        if (isH) {
          if (teamIndex === 0) {
            containerLeft.appendChild(cardElement);
          } else {
            containerRight.appendChild(cardElement);
          }
        } else {
          containerBottom.appendChild(cardElement);
        }

        const cachedMembers = [];
        cardElement.querySelectorAll('.health-card__member').forEach((memberEl, i) => {
          const nameEl = memberEl.querySelector('.health-card__member-name') || memberEl.querySelector('.health-card__name');
          const fill = memberEl.querySelector('.health-card__fill');
          const text = memberEl.querySelector('.health-card__bar-text');
          const bar = memberEl.querySelector('.health-card__bar');
          const ghost = memberEl.querySelector('.health-card__ghost');
          const starsContainer = memberEl.querySelector('.hud-cj-stars');
          const moneyTextEl = memberEl.querySelector('.hud-cj-money-text');
          const weaponIconEl = memberEl.querySelector('.hud-cj-weapon-icon');
          const weaponAmmoEl = memberEl.querySelector('.hud-cj-weapon-ammo');
          const clockTextEl = memberEl.querySelector('.hud-cj-clock-text');
          const armorFillEl = memberEl.querySelector('.hud-cj-armor-fill');
          const skillsContainer = memberEl.querySelector('.health-card__skills');
          const infoContainer = memberEl.querySelector('.health-card__info') || cardElement.querySelector('.health-card__info');
          const skillBars = new Map();
          memberEl.querySelectorAll('.hud-skill-box').forEach(box => {
            const id = box.getAttribute('data-skill-id');
            const fillEl = box.querySelector('.hud-skill-box-fill');
            const textEl = box.querySelector('.hud-skill-box-text');
            skillBars.set(id, { box, fill: fillEl, text: textEl });
          });
          cachedMembers.push({
            nameEl, fill, ghost, text, bar, starsContainer, moneyTextEl, weaponIconEl, weaponAmmoEl, clockTextEl, armorFillEl,
            lastMoneyText: '', lastStarCount: -1, lastWeaponIcon: '', lastWeaponAmmo: '', lastClockText: '',
            infoContainer, skillsContainer, skillBars, fighter: members[i], lastInfoHTML: '',
            lastMemberName: '', lastMemberColor: ''
          });
        });

        _hudCache.teams.set(teamIndex, {
          cardElement,
          members: cachedMembers
        });
      });
    } else {
      // 1v1 / FFA Individual Mode
      const isSideHud = isH && (is1v1 || isStandOff || isTLFS || isFfa || mainFighters.length <= 4);
      const isDuelTopHud = !isSideHud && !isBossBattle && !isTeamHudMode && !isFfa && mainFighters.length === 2;

      if (isDuelTopHud && _cachedTopContainer) {
        _cachedTopContainer.innerHTML = buildTopDuelHUD(mainFighters[0], mainFighters[1], isDarkTheme);
        _cachedTopContainer.style.display = 'flex';
        _cachedTopContainer.style.visibility = 'visible';
        _cachedTopContainer.style.opacity = '1';

        const p1Canvas = _cachedTopContainer.querySelector('.hud-top-p1 .hud-top-profile__canvas');
        const p2Canvas = _cachedTopContainer.querySelector('.hud-top-p2 .hud-top-profile__canvas');
        if (p1Canvas) renderTopHudProfileCanvas(p1Canvas, mainFighters[0]);
        if (p2Canvas) renderTopHudProfileCanvas(p2Canvas, mainFighters[1]);

        _cachedTopTimerEl = _cachedTopContainer.querySelector('.hud-top-timer-text');
        _lastTopTimerText = _cachedTopTimerEl ? _cachedTopTimerEl.textContent : '';
      }

      fighters.forEach((fighter, index) => {
        if (!fighter || fighter.isTurret || fighter.isEndCrystal || fighter.isMinion || fighter.isDeployable) return;
        const ratio = fighter.maxHp > 0 ? Math.min(1.0, Math.max(0, Number(fighter.hp) / Number(fighter.maxHp))) : 0;
        const color = fighter.color || '#fff';
        const isYutaFighter = fighter && (fighter.characterId === 'yuta' || fighter.type === 'yuta' || (fighter.name && fighter.name.toUpperCase().includes('YUTA')));
        let nameColor = (state.arenaTheme === 'dark') ? (isYutaFighter ? '#FF1493' : '#ffffff') : '#000000';
        const fighterName = getFighterDisplayName(fighter, true);
        const fighterStats = state.leaderboard ? (state.leaderboard[fighter.fighterIndex] || { wins: 0, losses: 0 }) : { wins: 0, losses: 0 };
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
          extraClassStr = isFfa ? 'single-column ffa-card' : (isSingleColumnMode ? 'single-column' : '');
        }
        const playerSlotClass = (index % 2 === 0) ? 'hud-player-p1' : 'hud-player-p2';
        extraClassStr = `${extraClassStr} ${playerSlotClass}`.trim();
        const is1v1Mode = (mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.HORIZONTAL_1V1 || mode === '1v1 Widescreen Duel');
        const maxBulletsCount = (is1v1Mode && !isSideHud) ? 2 : 0;

        const isSans = Boolean(fighter.characterId === 'sans' || fighter.type === 'sans' || (fighter.name && fighter.name.toLowerCase() === 'sans'));
        const fighterThemeColor = getFighterThemeColor(fighter, nameColor);
        const nameClass = isSans ? 'health-card__member-name hud-sans-name' : 'health-card__member-name';
        const isFfaVertical = isFfa && !isH;
        const ffaAlign = isFfaVertical ? (index === 0 ? 'left' : (index === 2 ? 'right' : 'center')) : (index % 2 === 0 ? 'left' : 'right');
        const ffaJustify = ffaAlign === 'left' ? 'flex-start' : (ffaAlign === 'right' ? 'flex-end' : 'center');
        const fighterHeaderHTML = ((isSideHud && mainFighters.length > 2) || isFfaVertical) ? `
          <div class="health-card__member-header" style="margin-bottom: 4px; display: flex; align-items: center; justify-content: ${ffaJustify};">
            <span class="${nameClass}" style="color: ${fighterThemeColor}; font-family: 'Silkscreen', 'Press Start 2P', monospace, sans-serif; font-size: 13.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">${fighterName}</span>
          </div>
        ` : '';

        const cardHTML = buildCard({
          title: fighterName,
          scoreText: totalGames > 0 ? `${winRate}% WR` : '',
          fillColor: color,
          fillRatio: ratio,
          metaLabel: `DMG: ${parseFloat(Math.max(0, Number(fighter.damage) || 0).toFixed(1))}`,
          metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}`,
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
          titleAlign: ffaAlign,
          singleColumn: isSingleColumnMode,
          customHeaderHTML: fighterHeaderHTML,
          hideHealthBar: isDuelTopHud
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;



        if (isSideHud) {
          if (isFfa) {
            if (containerLeft) containerLeft.classList.add('ffa-side-hud');
            if (containerRight) containerRight.classList.add('ffa-side-hud');
          } else {
            if (containerLeft) containerLeft.classList.remove('ffa-side-hud');
            if (containerRight) containerRight.classList.remove('ffa-side-hud');
          }
          if (index % 2 === 0) {
            containerLeft.appendChild(cardElement);
          } else {
            containerRight.appendChild(cardElement);
          }
        } else if (mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA' || is1v1 || isStandOff || isTLFS || isTactical || mainFighters.length <= 4) {
          containerBottom.appendChild(cardElement);
        } else if (index % 2 === 0) {
          containerLeft.appendChild(cardElement);
        } else {
          containerRight.appendChild(cardElement);
        }

        let hpBar = cardElement.querySelector('.health-card__bar');
        let hpBarFill = cardElement.querySelector('.health-card__fill');
        let hpBarGhost = cardElement.querySelector('.health-card__ghost');
        let hpBarText = cardElement.querySelector('.health-card__bar-text');
        let winBullets = Array.from(cardElement.querySelectorAll('.health-card__win-bullet'));
        let topPlayerEl = null;
        let topNameEl = null;
        let topProfileEl = null;
        let topGradeCanvas = null;

        const mainIdx = mainFighters.indexOf(fighter);
        if (isDuelTopHud && _cachedTopContainer && mainIdx >= 0) {
          topPlayerEl = _cachedTopContainer.querySelector(mainIdx === 0 ? '.hud-top-p1' : '.hud-top-p2');
          if (topPlayerEl) {
            hpBar = topPlayerEl.querySelector('.hud-top-bar') || hpBar;
            hpBarFill = topPlayerEl.querySelector('.health-card__fill') || hpBarFill;
            hpBarGhost = topPlayerEl.querySelector('.health-card__ghost') || hpBarGhost;
            hpBarText = topPlayerEl.querySelector('.health-card__bar-text') || hpBarText;
            winBullets = Array.from(topPlayerEl.querySelectorAll('.health-card__win-bullet'));
            topNameEl = topPlayerEl.querySelector('.hud-top-name');
            topProfileEl = topPlayerEl.querySelector('.hud-top-profile');
            topGradeCanvas = topPlayerEl.querySelector('.hud-top-profile__grade-canvas');
          }
        }

        const starsContainer = cardElement.querySelector('.hud-cj-stars');
        const moneyTextEl = cardElement.querySelector('.hud-cj-money-text');
        const weaponIconEl = cardElement.querySelector('.hud-cj-weapon-icon');
        const weaponAmmoEl = cardElement.querySelector('.hud-cj-weapon-ammo');
        const clockTextEl = cardElement.querySelector('.hud-cj-clock-text');
        const armorFillEl = cardElement.querySelector('.hud-cj-armor-fill');
        const infoContainer = cardElement.querySelector('.health-card__info');
        const checkbox = cardElement.querySelector('input[type="checkbox"]');

        const skillsContainer = cardElement.querySelector('.health-card__skills');
        const skillBars = new Map();
        cardElement.querySelectorAll('.hud-skill-box').forEach(box => {
          const id = box.getAttribute('data-skill-id');
          const fill = box.querySelector('.hud-skill-box-fill');
          const text = box.querySelector('.hud-skill-box-text');
          skillBars.set(id, { box, fill, text });
        });

        const nameEl = cardElement.querySelector('.health-card__member-name');

        _hudCache.fighters.set(fighter, {
          cardElement,
          nameEl,
          lastMemberName: fighterName,
          lastMemberColor: fighterThemeColor,
          skillsContainer,
          hpBar,
          hpBarFill,
          hpBarGhost,
          hpBarText,
          topPlayerEl,
          topNameEl,
          topProfileEl,
          topGradeCanvas,
          topGradeCtx: null,
          mainIdx,
          lastGrade: getFighterGrade(fighter),
          lastTopOpacity: 1,
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

        const isCj = isCjCustomHudActive(fighter);
        const isSans = fighter && (fighter.characterId === 'sans' || fighter.type === 'sans' || (fighter.name && fighter.name.toLowerCase() === 'sans'));

        if (m.nameEl) {
          const currentName = getFighterDisplayName(fighter, true);
          const isMemberYuta = fighter && (fighter.characterId === 'yuta' || fighter.type === 'yuta' || (fighter.name && fighter.name.toUpperCase().includes('YUTA')));
          const defaultNameColor = isDarkTheme ? (isMemberYuta ? '#FF1493' : '#ffffff') : '#000000';
          const memberThemeColor = getFighterThemeColor(fighter, defaultNameColor);
          if (m.lastMemberName !== currentName) {
            if (typeof currentName === 'string' && currentName.includes('『')) {
              m.nameEl.innerHTML = formatFighterNameHTML(currentName);
            } else {
              m.nameEl.textContent = currentName;
            }
            m.lastMemberName = currentName;
          }
          if (m.lastMemberColor !== memberThemeColor) {
            m.nameEl.style.color = memberThemeColor;
            m.lastMemberColor = memberThemeColor;
          }
        }
        let percent, barColor, hpText;
        if (isSans) {
          const isDead = fighter.hp <= 0;
          const curStam = isDead ? 0 : ((fighter.stamina !== undefined) ? fighter.stamina : 100);
          const maxStam = fighter.maxStamina || 100;
          const stamRatio = (!isDead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
          percent = isDead ? 0 : Math.min(100, Math.max(0, Math.round(stamRatio * 100)));
          barColor = (stamRatio < 0.25) ? '#FFE600' : '#2c4de0ff';
          hpText = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
        } else {
          const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
          const maxHp = fighter._originalMaxHp || fighter.maxHp;
          const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
          percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
          barColor = isCj ? '#DC2626' : getFighterHealthBarColor(fighter, ratio, isDarkTheme);
          const isTactical = isTacticalMatch(state);
          hpText = (curHp <= 0 && isTactical) ? 'KIA' : `${Math.floor(Math.max(0, Number(curHp) || 0))}`;
        }
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

        if (!m.ghost && m.bar) {
          m.ghost = m.bar.querySelector('.health-card__ghost');
          if (!m.ghost && m.fill) {
            const ghost = document.createElement('div');
            ghost.className = 'health-card__ghost';
            if (m.fill.parentNode) {
              m.fill.parentNode.insertBefore(ghost, m.fill);
            } else {
              m.bar.insertBefore(ghost, m.fill);
            }
            m.ghost = ghost;
          }
        }
        if (m.ghost) {
          updateHealthBarGhost(m.ghost, percent, m, isSans);
        }
        
        if (m.bar) {
          const cjBarClass = isCj ? ' hud-bar-cj' : '';
          const sansBarClass = isSans ? ' hud-bar-sans-stamina' : '';
          m.bar.className = `health-card__bar${cjBarClass}${sansBarClass}${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
          const memberShakeTimer = fighter._healthBarShakeTimer || 0;
          const memberShakeAmount = memberShakeTimer > 0 ? Math.sin((12 - memberShakeTimer) * 0.75) * 3 : 0;
          m.bar.style.transform = memberShakeTimer > 0 ? `translateX(${memberShakeAmount}px)` : '';
        }

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
        if (m.skillsContainer || (m.skillBars && m.skillBars.size > 0)) {
          const rawSkills = getSkillDataForFighter(fighter) || [];
          const skills = rawSkills.filter(s => shouldShowFighterSkill(fighter, s));
          if (m.skillsContainer && (skills.length !== m.skillBars.size || skills.some(s => !m.skillBars.has(s.id)))) {
            const isRight = (cachedCard.cardElement.classList.contains('align-right') || cachedCard.cardElement.parentElement?.id === 'hud-top-right' || cachedCard.cardElement.parentElement?.id === 'hud-bottom-right');
            const align = isRight ? 'right' : 'left';
            const isSingleCol = Boolean(isTeamSingleColumn);
            m.skillsContainer.innerHTML = generateFighterSkillsHTML(fighter, align, isSingleCol);
            m.skillBars.clear();
            m.skillsContainer.querySelectorAll('.hud-skill-box').forEach(box => {
              const id = box.getAttribute('data-skill-id');
              const fillEl = box.querySelector('.hud-skill-box-fill');
              const textEl = box.querySelector('.hud-skill-box-text');
              m.skillBars.set(id, { box, fill: fillEl, text: textEl });
            });
          }
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
          const isSingleCol = isSingleColumnMode;
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
      if (!fighter || fighter.isTurret || fighter.isEndCrystal || fighter.isMinion || fighter.isDeployable) return;
      const cachedCard = _hudCache.fighters.get(fighter);
      if (!cachedCard) return;

      if (fighter._lastHealAmount && fighter._lastHealAmount > 0 && cachedCard.hpBar) {
        triggerHudHealBubble(cachedCard.hpBar, fighter._lastHealAmount);
        fighter._lastHealAmount = 0;
      }

      const isCj = isCjCustomHudActive(fighter);
      const isSans = fighter && (fighter.characterId === 'sans' || fighter.type === 'sans' || (fighter.name && fighter.name.toLowerCase() === 'sans'));
      const isBossBar = Boolean(isBossBattle && _cachedTopContainer && cachedCard.hpBar && _cachedTopContainer.contains(cachedCard.hpBar));
      let percent, barColor, metaValue;

      if (isSans) {
        const isDead = fighter.hp <= 0;
        const curStam = isDead ? 0 : ((fighter.stamina !== undefined) ? fighter.stamina : 100);
        const maxStam = fighter.maxStamina || 100;
        const stamRatio = (!isDead && maxStam > 0) ? Math.min(1.0, Math.max(0, curStam / maxStam)) : 0;
        percent = isDead ? 0 : Math.min(100, Math.max(0, Math.round(stamRatio * 100)));
        barColor = (stamRatio < 0.25)
          ? 'linear-gradient(180deg, #fef08a 0%, #facc15 25%, #eab308 60%, #a16207 100%)'
          : 'linear-gradient(180deg, #93c5fd 0%, #38bdf8 20%, #2c4de0 60%, #1e3a8a 100%)';
        metaValue = `${Math.floor(Math.max(0, curStam))} / ${Math.floor(maxStam)}`;
      } else {
        const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
        const maxHp = fighter._originalMaxHp || fighter.maxHp;
        const ratio = maxHp > 0 ? Math.min(1.0, Math.max(0, Number(curHp) / Number(maxHp))) : 0;
        percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        barColor = isCj ? '#DC2626' : getFighterHealthBarColor(fighter, ratio, isDarkTheme);
        const isTactical = isTacticalMatch(state);
        const bossMaxHp = fighter._originalMaxHp || fighter.maxHp || 440;
        metaValue = isBossBar
          ? `${Math.floor(Math.max(0, Number(curHp) || 0))} / ${Math.floor(bossMaxHp)}`
          : ((curHp <= 0 && isTactical) ? 'KIA' : `${Math.floor(Math.max(0, Number(curHp) || 0))}`);
      }
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

      if (!cachedCard.hpBarGhost && cachedCard.hpBar) {
        cachedCard.hpBarGhost = cachedCard.hpBar.querySelector('.health-card__ghost');
        if (!cachedCard.hpBarGhost && cachedCard.hpBarFill) {
          const ghost = document.createElement('div');
          ghost.className = 'health-card__ghost';
          if (cachedCard.hpBarFill.parentNode) {
            cachedCard.hpBarFill.parentNode.insertBefore(ghost, cachedCard.hpBarFill);
          } else {
            cachedCard.hpBar.insertBefore(ghost, cachedCard.hpBarFill);
          }
          cachedCard.hpBarGhost = ghost;
        }
      }
      if (cachedCard.hpBarGhost) {
        updateHealthBarGhost(cachedCard.hpBarGhost, percent, cachedCard, isSans);
      }

      if (cachedCard.hpBar) {
        const topBarClass = (cachedCard.hpBar && cachedCard.hpBar.classList.contains('hud-top-bar')) ? ' hud-top-bar' : '';
        const cjBarClass = (isCj && !topBarClass) ? ' hud-bar-cj' : '';
        const sansBarClass = isSans ? ' hud-bar-sans-stamina' : '';
        const bossBarClass = isBossBar ? ' boss-bar' : '';
        cachedCard.hpBar.className = `health-card__bar${topBarClass}${bossBarClass}${cjBarClass}${sansBarClass}${glow.className?.includes('hit-glow') ? ' hit-glow' : glow.className?.includes('heal-glow') ? ' heal-glow' : ''}`;
        const shakeTimer = fighter._healthBarShakeTimer || 0;
        const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
        if (topBarClass) {
          const skewAngle = (cachedCard.hpBar.closest && cachedCard.hpBar.closest('.hud-top-p2')) ? 8 : -8;
          cachedCard.hpBar.style.transform = shakeTimer > 0 ? `skewX(${skewAngle}deg) translateX(${shakeAmount}px)` : `skewX(${skewAngle}deg)`;
        } else {
          cachedCard.hpBar.style.transform = shakeTimer > 0 ? `translateX(${shakeAmount}px)` : '';
        }
      }

      if (cachedCard.hpBarText) {
        if (cachedCard.lastHpText !== metaValue) {
          cachedCard.hpBarText.textContent = metaValue;
          cachedCard.lastHpText = metaValue;
        }
      }

      if (cachedCard.topPlayerEl) {
        const curHp = (typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp;
        const isDead = curHp <= 0;
        const targetOpacity = isDead ? 0.45 : 1;
        if (cachedCard.lastTopOpacity !== targetOpacity) {
          cachedCard.topPlayerEl.style.opacity = targetOpacity;
          cachedCard.lastTopOpacity = targetOpacity;
        }
      }

      if (cachedCard.topPlayerEl || cachedCard.topProfileEl || cachedCard.topGradeCanvas) {
        const curGrade = getFighterGrade(fighter);
        if (cachedCard.lastGrade !== curGrade) {
          const meta = getGradeMeta(curGrade);
          if (cachedCard.topPlayerEl) {
            cachedCard.topPlayerEl.setAttribute('data-grade', curGrade);
            cachedCard.topPlayerEl.style.setProperty('--grade-color', meta.color);
          }
          if (cachedCard.topProfileEl) {
            cachedCard.topProfileEl.setAttribute('data-grade', curGrade);
          }
          if (cachedCard.topGradeCanvas) {
            cachedCard.topGradeCanvas.setAttribute('data-grade', curGrade);
          }
          cachedCard.lastGrade = curGrade;
        }

        if (cachedCard.topGradeCanvas) {
          if (!cachedCard.topGradeCtx) {
            cachedCard.topGradeCtx = cachedCard.topGradeCanvas.getContext('2d');
          }
          if (cachedCard.topGradeCtx) {
            cachedCard.topGradeCtx.clearRect(0, 0, cachedCard.topGradeCanvas.width, cachedCard.topGradeCanvas.height);
            drawWingedGradeLetter(
              cachedCard.topGradeCtx,
              cachedCard.topGradeCanvas.width / 2,
              cachedCard.topGradeCanvas.height / 2,
              curGrade,
              getZeusGradeCardTheme(curGrade),
              cachedCard.mainIdx,
              2.8,
              true
            );
          }
        }
      }

      // ── FFA Eliminated State: Grayscale card + huge red X overlay ──
      // Applied whenever this fighter is dead in any FFA game mode.
      // Overlay div is lazy-created once, then shown/hidden per frame via dirty-check.
      {
        const _isFfaHud = (mode === 'FFA' || mode === 'Tactical FFA' ||
          (typeof GAME_MODES !== 'undefined' && (mode === GAME_MODES.FFA || mode === GAME_MODES.TACTICAL_FFA)));
        const _curHpElim = isSans
          ? ((fighter.stamina !== undefined) ? fighter.stamina : 1)
          : ((typeof fighter.getDisplayHp === 'function') ? fighter.getDisplayHp() : fighter.hp);
        const _isEliminated = _isFfaHud && (_curHpElim <= 0);

        if (_isFfaHud && cachedCard.cardElement) {
          // Lazy-create the red X overlay element once per card
          if (!cachedCard.ffaEliminatedOverlay) {
            const _overlay = document.createElement('div');
            _overlay.className = 'ffa-eliminated-overlay';
            _overlay.style.display = 'none';
            cachedCard.cardElement.appendChild(_overlay);
            cachedCard.ffaEliminatedOverlay = _overlay;
          }

          // Dirty-check prevents layout thrashing on every frame
          if (cachedCard.lastFfaEliminated !== _isEliminated) {
            cachedCard.ffaEliminatedOverlay.style.display = _isEliminated ? 'flex' : 'none';
            if (_isEliminated) {
              cachedCard.cardElement.classList.add('ffa-eliminated');
            } else {
              cachedCard.cardElement.classList.remove('ffa-eliminated');
            }
            cachedCard.lastFfaEliminated = _isEliminated;
          }
        }
      }

      if (cachedCard.bossCardName) {
        if (curHp <= 0) {
          if (cachedCard.lastBossNameOpacity !== 0.35) {
            cachedCard.bossCardName.style.opacity = '0.35';
            if (cachedCard.bossCardSubname) cachedCard.bossCardSubname.style.opacity = '0.35';
            cachedCard.lastBossNameOpacity = 0.35;
          }
        } else {
          if (cachedCard.lastBossNameOpacity !== 1) {
            cachedCard.bossCardName.style.opacity = '1';
            if (cachedCard.bossCardSubname) cachedCard.bossCardSubname.style.opacity = '0.92';
            cachedCard.lastBossNameOpacity = 1;
          }
        }
        const isBossSans = Boolean(fighter.characterId === 'sans' || fighter.type === 'sans' || (fighter.name && fighter.name.toLowerCase() === 'sans'));
        const bossName = getFighterDisplayName(fighter, true);
        if (cachedCard.lastBossName !== bossName) {
          cachedCard.bossCardName.textContent = bossName;
          cachedCard.lastBossName = bossName;
        }
        const bossSubname = getBossSubName(fighter);
        if (cachedCard.bossCardSubname && cachedCard.lastBossSubname !== bossSubname) {
          cachedCard.bossCardSubname.textContent = bossSubname;
          cachedCard.lastBossSubname = bossSubname;
        }
        const bossColor = getFighterThemeColor(fighter, '#ef4444');
        if (cachedCard.lastBossThemeColor !== bossColor) {
          cachedCard.bossCardName.style.color = bossColor;
          if (cachedCard.bossCardSubname) cachedCard.bossCardSubname.style.color = bossColor;
          cachedCard.lastBossThemeColor = bossColor;
        }
      }

      if (cachedCard.chCardName) {
        if (curHp <= 0) {
          if (cachedCard.lastChOpacity !== 0.35) {
            cachedCard.chCardName.style.opacity = '0.35';
            cachedCard.lastChOpacity = 0.35;
          }
        } else {
          if (cachedCard.lastChOpacity !== 1) {
            cachedCard.chCardName.style.opacity = '1';
            cachedCard.lastChOpacity = 1;
          }
        }
        const isChSans = Boolean(fighter.characterId === 'sans' || fighter.type === 'sans' || (fighter.name && fighter.name.toLowerCase() === 'sans'));
        const chName = getFighterDisplayName(fighter, true);
        if (cachedCard.lastChName !== chName) {
          cachedCard.chCardName.textContent = chName;
          cachedCard.lastChName = chName;
        }
        const chThemeColor = getFighterThemeColor(fighter, '#38bdf8');
        if (cachedCard.lastChThemeColor !== chThemeColor) {
          cachedCard.chCardName.style.color = chThemeColor;
          cachedCard.lastChThemeColor = chThemeColor;
        }
      }

      if (cachedCard.nameEl) {
        const currentName = getFighterDisplayName(fighter, true);
        const isFighterYuta = fighter && (fighter.characterId === 'yuta' || fighter.type === 'yuta' || (fighter.name && fighter.name.toUpperCase().includes('YUTA')));
        const defaultNameColor = (state.arenaTheme === 'dark') ? (isFighterYuta ? '#FF1493' : '#ffffff') : '#000000';
        const fighterThemeColor = getFighterThemeColor(fighter, defaultNameColor);
        if (cachedCard.lastMemberName !== currentName) {
          if (typeof currentName === 'string' && currentName.includes('『')) {
            cachedCard.nameEl.innerHTML = formatFighterNameHTML(currentName);
          } else {
            cachedCard.nameEl.textContent = currentName;
          }
          cachedCard.lastMemberName = currentName;
        }
        if (cachedCard.lastMemberColor !== fighterThemeColor) {
          cachedCard.nameEl.style.color = fighterThemeColor;
          cachedCard.lastMemberColor = fighterThemeColor;
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

      if (!showDescription && (cachedCard.skillsContainer || cachedCard.skillBars.size > 0)) {
        const rawSkills = getSkillDataForFighter(fighter) || [];
        const skills = rawSkills.filter(s => shouldShowFighterSkill(fighter, s));
        if (cachedCard.skillsContainer && (skills.length !== cachedCard.skillBars.size || skills.some(s => !cachedCard.skillBars.has(s.id)))) {
          const isRight = (cachedCard.cardElement.classList.contains('align-right') || cachedCard.cardElement.parentElement?.id === 'hud-top-right' || cachedCard.cardElement.parentElement?.id === 'hud-bottom-right');
          const align = isRight ? 'right' : 'left';
          const isSingleCol = isSingleColumnMode || (is1v2 && index === 0);
          cachedCard.skillsContainer.innerHTML = generateFighterSkillsHTML(fighter, align, isSingleCol);
          cachedCard.skillBars.clear();
          cachedCard.skillsContainer.querySelectorAll('.hud-skill-box').forEach(box => {
            const id = box.getAttribute('data-skill-id');
            const fill = box.querySelector('.hud-skill-box-fill');
            const text = box.querySelector('.hud-skill-box-text');
            cachedCard.skillBars.set(id, { box, fill, text });
          });
        }
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
        const isSingleCol = isSingleColumnMode || (is1v2 && index === 0);
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

  // 7. 1v1 Mode: Single Round Badge (R1, R2, or F) centered in the middle between P1 and P2 cards
  const is1v1Mode = (mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.HORIZONTAL_1V1 || mode === '1v1 Widescreen Duel');
  if (is1v1Mode && containerBottom) {
    let roundBanner = _cachedRoundBanner;
    if (!roundBanner || !roundBanner.parentNode) {
      roundBanner = containerBottom.querySelector('.hud-round-banner');
      if (!roundBanner) {
        roundBanner = document.createElement('div');
        roundBanner.className = 'hud-round-banner';
        roundBanner.id = 'hudRoundBanner';
        containerBottom.appendChild(roundBanner);
      }
      _cachedRoundBanner = roundBanner;
    }
    const roundNum = state.roundNum || 1;
    let roundText = 'ROUND 1';
    let roundClass = 'hud-round-r1';
    if (roundNum === 2) {
      roundText = 'ROUND 2';
      roundClass = 'hud-round-r2';
    } else if (roundNum >= 3) {
      roundText = 'FINAL ROUND';
      roundClass = 'hud-round-rf';
    }
    const bannerHTML = `<span class="hud-round-item ${roundClass} active">${roundText}</span>`;
    if (roundBanner._lastHTML !== bannerHTML) {
      roundBanner.innerHTML = bannerHTML;
      roundBanner._lastHTML = bannerHTML;
    }
    roundBanner.style.display = 'flex';
  } else if (_cachedRoundBanner) {
    _cachedRoundBanner.style.display = 'none';
  }
}

export { updateHealthHud };
