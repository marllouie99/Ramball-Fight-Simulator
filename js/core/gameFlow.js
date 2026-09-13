import { stopAllSounds, stopAllLoopingSounds, preloadSound, stopSound, unlockAudio } from '../systems/soundSystem.js';
// ─────────────────────────────────────────────
// GAME FLOW — State transitions and round management
// Extracted from main.js so that ui.js can import these without
// creating a circular dependency with main.js.
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';
import { state, createFighterInstance, clearProjectiles, spawnFloatingText, saveFighterSelections } from './state.js';
import { STARTER_MAP, MONOLITH_MAP } from '../../Tactical Force/maps/index.js';
import { updateFighters, updateProjectiles, spawnFuelPickup } from '../systems/physics.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getBasicAttackSoundPaths, getFighterBasicAttackSoundPaths } from '../soundEffects/basicAttackSounds.js';
import { getSkillSoundPaths, getFighterSkillSoundPaths } from '../soundEffects/skillSounds.js';
import { getSkillEffectSoundPaths } from '../soundEffects/skillEffectSounds.js';
import { getAnnouncerSoundPaths, getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { ParticleSystem } from '../systems/particles/ParticleSystem.js';
import { clearAllPools } from '../graphics/objectPool.js';
import { clearHealthHud } from '../graphics/hudManager.js';
import { AUDIO_CONFIG } from '../configs/audioConfig.js';
import { clearDroppedMagazines } from '../graphics/particles/johnWickDroppedMagazine.js';
import { clearDriveBys } from '../systems/cjDriveBySystem.js';
import { clearFloatingJetpacks } from '../graphics/particles/cjFloatingJetpack.js';
import { startArenaBgm, stopArenaBgm, ARENA_BGM_TRACKS, getSavedArenaBgmId } from '../systems/arenaBgmSystem.js';
import { clearDroppedMiniguns } from '../graphics/particles/cjDroppedMinigun.js';
import { clearDroppedMahoragaWheels } from '../graphics/particles/mahoragaDroppedWheel.js';
import { clearCarExplosions } from '../graphics/particles/cjCarExplosion.js';
import { clearBamEffects } from '../graphics/particles/bamImpactEffect.js';
import { clearHybridProjectiles } from '../graphics/renderers/hybridProjectileRenderer.js';
import { tacticalProjectileSystem } from '../../Tactical Force/systems/tacticalProjectileSystem.js';
import { resetCamera } from '../systems/cameraSystem.js';

// ─────────────────────────────────────────────
// SOUND PRELOADING
// ─────────────────────────────────────────────
const SOUND_ASSETS = {
  crimsonSniperShot: 'Assets/Sound Effects/Attacks/lasersniper1.mp3',
  ivoryLaserBeam: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
  gunSlingerShot: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
  flameWardenShot: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
  rangerLaserPew: 'Assets/Sound Effects/Attacks/laserpew.mp3',
  spikeStab: 'Assets/Sound Effects/Attacks/spikestab.mp3',
  yutaThinIceBreaker: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
  yutaThinIceBreakerNoise: 'Assets/Sound Effects/Skills/yuta-thin-ice-breaker-noise.mp3',
};


function extractSoundsFromObject(obj, seen = new Set(), results = []) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return results;
  seen.add(obj);

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if ((lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.includes('assets/sound')) && !results.includes(val)) {
        results.push(val);
      }
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') {
          const lower = item.toLowerCase();
          if ((lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.includes('assets/sound')) && !results.includes(item)) {
            results.push(item);
          }
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      extractSoundsFromObject(val, seen, results);
    }
  }
  return results;
}

/**
 * Fast-path priority preloader for the active match combatants.
 * Gathers essential combat impact sounds, announcer countdown SFX, the selected
 * arena BGM track, and the active fighters' specific attack and skill sounds.
 * Decodes this compact set (~10-15 files) immediately with high priority so all
 * active combat audio is 100% resident in Web Audio memory before countdown ends.
 */
export function preloadActiveMatchSounds(fighters) {
  const activeFighters = (fighters || state.fighters || []).filter(Boolean);
  const activePaths = [
    // Core physical combat hits
    'Assets/Sound Effects/Attacks/fleshhit.mp3',
    'Assets/Sound Effects/Attacks/punch.mp3',
    'Assets/Sound Effects/Attacks/swordswing.mp3',
    'Assets/Sound Effects/Attacks/groundSmash.mp3',
    'Assets/Sound Effects/Attacks/explosion.mp3',
    'Assets/Sound Effects/Attacks/spaceshot.mp3',
    // Dynamic In-arena countdown & announcer sound configs
    ...getAnnouncerSoundPaths()
  ];

  // Active match Arena BGM (only the chosen track, not all 7 tracks!)
  try {
    const trackId = getSavedArenaBgmId();
    if (trackId !== 'off') {
      let chosenSrc = null;
      if (trackId === 'random') {
        const validTracks = ARENA_BGM_TRACKS.filter(t => t.src !== null);
        if (validTracks.length > 0) {
          const randTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
          chosenSrc = randTrack?.src;
        }
      } else {
        const track = ARENA_BGM_TRACKS.find(t => t.id === trackId);
        chosenSrc = track ? track.src : null;
      }
      if (chosenSrc) {
        state.activeMatchBgmSrc = chosenSrc;
        activePaths.push(chosenSrc);
      }
    }
  } catch (e) {}

  // Active fighters' specific basic attacks & skills
  for (const f of activeFighters) {
    if (!f) continue;
    const def = f._def || f;
    const fId = f.fighterIndex !== undefined ? f.fighterIndex : def.id;
    const fType = f.type || def.type || f.characterId;

    // Basic attack sound
    activePaths.push(...getFighterBasicAttackSoundPaths(fId, fType));

    // Skill sounds
    activePaths.push(...getFighterSkillSoundPaths(fId));
    if (fType && fType !== fId) {
      activePaths.push(...getFighterSkillSoundPaths(fType));
    }
    if (f.characterId && f.characterId !== fType) {
      activePaths.push(...getFighterSkillSoundPaths(f.characterId));
    }

    // Config custom sounds
    const cfg = (f.characterId && CONFIG[f.characterId]) || (fType && CONFIG[fType]);
    if (cfg && cfg.sounds) {
      Object.values(cfg.sounds).forEach(val => {
        if (typeof val === 'string' && (val.includes('/') || val.includes('.'))) {
          activePaths.push(val);
        }
      });
    }
  }

  const uniqueActivePaths = [...new Set(activePaths.filter(Boolean))];
  return preloadSound(uniqueActivePaths, { priority: true });
}

export function preloadGameSounds(isIdle = true) {
  // Preload legacy assets + basic attack sounds + skill sounds + skill effect sounds + mapped audio config sounds
  const legacyPaths = Object.values(SOUND_ASSETS).filter(Boolean);
  const mappedConfigPaths = Object.values(AUDIO_CONFIG).filter(s => typeof s === 'string' && (s.includes('/') || s.includes('.')));
  const basicAttackPaths = getBasicAttackSoundPaths();
  const skillPaths = getSkillSoundPaths();
  const skillEffectPaths = getSkillEffectSoundPaths();
  const announcerPaths = getAnnouncerSoundPaths();
  const configSounds = extractSoundsFromObject(CONFIG);
  const bgmTracks = ARENA_BGM_TRACKS.map(t => t.src).filter(Boolean);

  const allPaths = [...new Set([
    ...legacyPaths,
    ...mappedConfigPaths,
    ...basicAttackPaths,
    ...skillPaths,
    ...skillEffectPaths,
    ...announcerPaths,
    ...configSounds,
    ...bgmTracks
  ])];
  return preloadSound(allPaths, { idle: isIdle });
}

// Re-export physics update steps so callers can import them from gameFlow.js
export { updateFighters, updateProjectiles };

export function resetFighter(fighter) {
  fighter.reset();
}

export function reinitFighters(isNewMatch = false) {
  // Proper cleanup of PixiJS Sprites before resetting lengths
  ParticleSystem.clearAll();
  burnEffectSystem.clear();
  bomberExplosionSystem.clear();
  flamewardenFlameSystem.clear();
  clearDroppedMagazines();
  clearDriveBys();
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearDroppedMahoragaWheels();
  clearCarExplosions();
  clearBamEffects();
  clearHybridProjectiles();
  clearProjectiles();
  tacticalProjectileSystem.clear();

  if (state.floatingTexts) state.floatingTexts.length = 0;
  if (state.bloodEffects) state.bloodEffects.length = 0;
  if (state.sparkEffects) state.sparkEffects.length = 0;
  if (state.deathEffects) state.deathEffects.length = 0;
  if (state.illusionDeathEffects) state.illusionDeathEffects.length = 0;
  if (state.doppelgangerDeathEffects) state.doppelgangerDeathEffects.length = 0;
  if (state.illusionSpawnEffects) state.illusionSpawnEffects.length = 0;
  if (state.berserkerRageEffects) state.berserkerRageEffects.length = 0;
  if (state.effects) state.effects.length = 0;
  if (state.illusions) state.illusions.length = 0;
  if (state.wallCracks) state.wallCracks.length = 0;
  if (state.thermobaricExplosions) state.thermobaricExplosions.length = 0;
  if (state.purpleExplosions) state.purpleExplosions.length = 0;
  if (state.soulSwapBeams) state.soulSwapBeams.length = 0;
  state.roundWinner = null;
  state.roundEndTimer = 0;
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state._hadMissionOverlay = false;
  state.cheatNotification = null;
  state._isChampionLayoutActive = false;
  state._winnerStartPositions = null;
 
  // Reset qualityLevel and screenShake on round init
  state.qualityLevel = state.performanceMode ? 0.2 : 1.0;
  state.qualityCheckTimer = 0;
  state.screenShake = { timer: 0, maxTimer: 0, intensity: 0 };
  state.matchTimer = 0;
 
  // Clear fuel pickups
  state.fuelPickups.length = 0;
  state.fuelPickupSpawnTimer = 0;
 
  // Spawn initial fuel pickups immediately
  const initialFuelPickups = MODE_SETTINGS[state.mode]?.initialFuelPickups ?? 2;
  const hasOrange = state.fighters.some(f => f && f._def.type === 'orange');
  if (hasOrange) {
    for (let i = 0; i < initialFuelPickups; i++) {
      spawnFuelPickup();
    }
  }
 
  // Clear any lingering last-kill badges from previous rounds
  state.fighters.forEach((f) => { if (f) f.lastKilledDef = null; });
 
  let fighterIndexes = [state.p1Index, state.p2Index];
  if (state.mode === GAME_MODES.TAG_MATCH || state.mode === 'Tag Match') {
    if (isNewMatch || !state.tagMatch || !state.tagMatch.team0Roster || state.tagMatch.team0Roster.length === 0) {
      state.tagMatch = {
        team0Roster: [state.p1Index ?? 0, state.p3Index ?? 2, state.p5Index ?? 4],
        team1Roster: [state.p2Index ?? 1, state.p4Index ?? 3, state.p6Index ?? 5],
        team0ActiveSlot: 0,
        team1ActiveSlot: 0,
        team0Eliminations: 0,
        team1Eliminations: 0,
        tagInTransition: null,
      };
    }
    const idx0 = state.tagMatch.team0Roster[state.tagMatch.team0ActiveSlot] ?? state.p1Index ?? 0;
    const idx1 = state.tagMatch.team1Roster[state.tagMatch.team1ActiveSlot] ?? state.p2Index ?? 1;
    fighterIndexes = [idx0, idx1];
  } else if (state.mode === GAME_MODES.FFA || state.mode === GAME_MODES.TACTICAL_FFA || state.mode === 'Tactical FFA') {
    fighterIndexes.push(state.p3Index, state.p4Index);
  } else if (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.TACTICAL_2V2 || state.mode === GAME_MODES.TACTICAL_4V4) {
    // Arrange fighters to match the team spawn ordering.
    fighterIndexes = [state.p1Index, state.p3Index, state.p2Index, state.p4Index];
  } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    // 1v2 mode: Team 0 is p1, Team 1 is p2 and p3
    fighterIndexes = [state.p1Index, state.p2Index, state.p3Index];
  }
 
  const isTacticalActive = (state.gameCategory === 'tactical' || String(state.mode).toLowerCase().startsWith('tactical'));
  if (CONFIG.globalFighter) {
    CONFIG.globalFighter.sizeMultiplier = isTacticalActive
      ? (CONFIG.tactical?.sizeMultiplier ?? 0.8)
      : (CONFIG.globalFighter._defaultFocSizeMultiplier ?? 1.2);
  }

  const currentDefs = getActiveFighterDefs();
  state.fighters.length = 0;
  for (const idx of fighterIndexes) {
    const def = currentDefs[idx] || FIGHTER_DEFS[idx] || currentDefs[0];
    state.fighters.push(createFighterInstance(def, idx));
  }
 
  state.fighters.forEach((fighter) => {
    fighter.reset();
  });

  if (state.mode === 'TLFS' && state.fighters[0]) {
    const fixedHp = MODE_SETTINGS[state.mode]?.playerFixedHp || 500;
    if (!state.fighters[0].isTurret && !state.fighters[0].isMinion) {
      const f = state.fighters[0];
      const isMakima = (f.characterId === 'makima' || f.type === 'makima');
      const hp = isMakima ? Math.round(fixedHp * 0.50) : fixedHp;
      f.maxHp = hp;
      f.hp = hp;
    }
  } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    const fixedHp = MODE_SETTINGS[state.mode]?.fixedHp || 1000;
    const soloFixedHp = MODE_SETTINGS[state.mode]?.soloFixedHp || 2000;
    state.fighters.forEach((f, idx) => {
      if (f && !f.isTurret && !f.isMinion && !f.isDeployable && !f.isIceWall && !f.isIllusion) {
        const baseHp = idx === 0 ? soloFixedHp : fixedHp;
        const isMakima = (f.characterId === 'makima' || f.type === 'makima');
        const hp = isMakima ? Math.round(baseHp * 0.50) : baseHp;
        f.maxHp = hp;
        f.hp = hp;
      }
    });
  } else if (MODE_SETTINGS[state.mode]?.fixedHp) {
    const fixedHp = MODE_SETTINGS[state.mode].fixedHp;
    state.fighters.forEach((f) => {
      if (f && !f.isTurret && !f.isMinion && !f.isDeployable && !f.isIceWall && !f.isIllusion) {
        const isMakima = (f.characterId === 'makima' || f.type === 'makima');
        const hp = isMakima ? Math.round(fixedHp * 0.50) : fixedHp;
        f.maxHp = hp;
        f.hp = hp;
      }
    });
  }

  const activeTacticalMap = state.activeMap || STARTER_MAP;

  if (isTacticalActive) {
    state.arena = { ...activeTacticalMap.arena };
    state.arenaTheme = 'dark';
    CONFIG.arenaTheme = 'dark';
  } else if (!state.arena || state.arena.width === STARTER_MAP.arena.width) {
    state.arena = { ...CONFIG.arena };
  }

  const arena = state.arena;
  if (isTacticalActive) {
    if (activeTacticalMap.id === 'tactical_monolith_map' || activeTacticalMap === MONOLITH_MAP) {
      // ── Monolith Map (Sector 02) ──
      // 2 Players: West vs East
      // 3 Players: West vs East vs North Corridor
      // 4 Players: West vs East vs North vs South Corridor
      const count = state.fighters.length;
      const spawnList = count <= 2
        ? (activeTacticalMap.spawns?.twoPlayer || MONOLITH_MAP.spawns.twoPlayer)
        : (count === 3
            ? (activeTacticalMap.spawns?.threePlayer || MONOLITH_MAP.spawns.threePlayer)
            : (activeTacticalMap.spawns?.fourPlayer || MONOLITH_MAP.spawns.fourPlayer));

      state.fighters.forEach((fighter, index) => {
        if (!fighter) return;
        const pt = spawnList[index % spawnList.length];
        const pad = (fighter.r || 24) + (arena.wallWidth || 6) + 6;
        fighter.x = Math.max(arena.x + pad, Math.min(arena.x + arena.width - pad, pt.x));
        fighter.y = Math.max(arena.y + pad, Math.min(arena.y + arena.height - pad, pt.y));
        fighter.gunAngle = pt.angle;
        fighter.angle = pt.angle;
        const spd = fighter.speed || 1.5;
        const moveAngle = Math.random() * Math.PI * 2;
        fighter.vx = Math.cos(moveAngle) * spd;
        fighter.vy = Math.sin(moveAngle) * spd;
      });
    } else {
      // ── Starter Map (Sector 01) & Dynamic Tactical Spawns ──
      const spawns = activeTacticalMap.spawns?.ffa || [
        { x: arena.x + 67.5, y: arena.y + 45 },
        { x: arena.x + arena.width - 67.5, y: arena.y + 45 },
        { x: arena.x + 67.5, y: arena.y + arena.height - 45 },
        { x: arena.x + arena.width - 67.5, y: arena.y + arena.height - 45 }
      ];

      // Shuffle corner indices randomly so every player gets a distinct pocket
      const shuffledIndices = spawns.map((_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }

      const arenaCenterX = arena.x + arena.width / 2;
      const arenaCenterY = arena.y + arena.height / 2;

      state.fighters.forEach((fighter, index) => {
        if (!fighter) return;
        const cornerIndex = shuffledIndices[index % shuffledIndices.length];
        const pt = spawns[cornerIndex];
        const angle = pt.angle !== undefined ? pt.angle : Math.atan2(arenaCenterY - pt.y, arenaCenterX - pt.x);

        const pad = (fighter.r || 24) + (arena.wallWidth || 6) + 6;
        fighter.x = Math.max(arena.x + pad, Math.min(arena.x + arena.width - pad, pt.x));
        fighter.y = Math.max(arena.y + pad, Math.min(arena.y + arena.height - pad, pt.y));
        fighter.gunAngle = angle;
        fighter.angle = angle;
        const spd = fighter.speed || 1.5;
        fighter.vx = Math.cos(angle) * spd;
        fighter.vy = Math.sin(angle) * spd;
      });
    }
  } else if (state.mode === GAME_MODES.FFA || state.mode === 'FFA') {
    const leftX = arena.x + arena.width * 0.20;
    const rightX = arena.x + arena.width * 0.80;
    const topY = arena.y + arena.height * 0.25;
    const bottomY = arena.y + arena.height * 0.75;
    const spawnPoints = [
      { x: leftX,  y: topY },
      { x: rightX, y: topY },
      { x: leftX,  y: bottomY },
      { x: rightX, y: bottomY },
    ];

    // Shuffle spawn points so fighter positions change each round
    for (let i = spawnPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = spawnPoints[i];
      spawnPoints[i] = spawnPoints[j];
      spawnPoints[j] = tmp;
    }

    state.fighters.forEach((fighter, index) => {
      const point = spawnPoints[index % spawnPoints.length] || spawnPoints[0];
      fighter.x = point.x;
      fighter.y = point.y;
      const angle = Math.random() * Math.PI * 2;
      fighter.vx = Math.cos(angle) * fighter.speed;
      fighter.vy = Math.sin(angle) * fighter.speed;
    });
  } else if (state.mode === GAME_MODES.TWO_VS_TWO) {
    // 2v2: Team 1 (fighters 0,1) on left, Team 2 (fighters 2,3) on right
    const leftX = arena.x + arena.width * 0.25;
    const rightX = arena.x + arena.width * 0.75;
    const centerY = arena.y + arena.height * 0.5;
    const verticalSpread = arena.height * 0.25;

    // Team 1: top-left and bottom-left
    state.fighters[0].x = leftX;
    state.fighters[0].y = centerY - verticalSpread;
    const angle0 = Math.random() * Math.PI * 2;
    state.fighters[0].vx = Math.cos(angle0) * state.fighters[0].speed;
    state.fighters[0].vy = Math.sin(angle0) * state.fighters[0].speed;

    state.fighters[1].x = leftX;
    state.fighters[1].y = centerY + verticalSpread;
    const angle1 = Math.random() * Math.PI * 2;
    state.fighters[1].vx = Math.cos(angle1) * state.fighters[1].speed;
    state.fighters[1].vy = Math.sin(angle1) * state.fighters[1].speed;

    // Team 2: top-right and bottom-right
    state.fighters[2].x = rightX;
    state.fighters[2].y = centerY - verticalSpread;
    const angle2 = Math.random() * Math.PI * 2;
    state.fighters[2].vx = Math.cos(angle2) * state.fighters[2].speed;
    state.fighters[2].vy = Math.sin(angle2) * state.fighters[2].speed;

    state.fighters[3].x = rightX;
    state.fighters[3].y = centerY + verticalSpread;
    const angle3 = Math.random() * Math.PI * 2;
    state.fighters[3].vx = Math.cos(angle3) * state.fighters[3].speed;
    state.fighters[3].vy = Math.sin(angle3) * state.fighters[3].speed;
  } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    const leftX = arena.x + arena.width * 0.25;
    const rightX = arena.x + arena.width * 0.75;
    const centerY = arena.y + arena.height * 0.5;
    const verticalSpread = arena.height * 0.25;

    // Team 1: Solo on left
    if (state.fighters[0]) {
      state.fighters[0].x = leftX;
      state.fighters[0].y = centerY;
      state.fighters[0].angle = 0;
      state.fighters[0].gunAngle = 0;
      state.fighters[0].rightGunAngle = 0;
      state.fighters[0].leftGunAngle = 0;
      const angle0 = Math.random() * Math.PI * 2;
      state.fighters[0].vx = Math.cos(angle0) * state.fighters[0].speed;
      state.fighters[0].vy = Math.sin(angle0) * state.fighters[0].speed;
    }

    // Team 2: Duo on right
    if (state.fighters[1]) {
      state.fighters[1].x = rightX;
      state.fighters[1].y = centerY - verticalSpread;
      state.fighters[1].angle = Math.PI;
      state.fighters[1].gunAngle = Math.PI;
      state.fighters[1].rightGunAngle = Math.PI;
      state.fighters[1].leftGunAngle = Math.PI;
      const angle1 = Math.random() * Math.PI * 2;
      state.fighters[1].vx = Math.cos(angle1) * state.fighters[1].speed;
      state.fighters[1].vy = Math.sin(angle1) * state.fighters[1].speed;
    }

    if (state.fighters[2]) {
      state.fighters[2].x = rightX;
      state.fighters[2].y = centerY + verticalSpread;
      state.fighters[2].angle = Math.PI;
      state.fighters[2].gunAngle = Math.PI;
      state.fighters[2].rightGunAngle = Math.PI;
      state.fighters[2].leftGunAngle = Math.PI;
      const angle2 = Math.random() * Math.PI * 2;
      state.fighters[2].vx = Math.cos(angle2) * state.fighters[2].speed;
      state.fighters[2].vy = Math.sin(angle2) * state.fighters[2].speed;
    }
  } else {
    // 1v1: Fighters on opposite sides, aligned horizontally, facing each other
    const centerY = arena.y + arena.height * 0.5;
    const leftX = arena.x + arena.width * 0.25;
    const rightX = arena.x + arena.width * 0.75;

    state.fighters[0].x = leftX;
    state.fighters[0].y = centerY;
    // Face right (toward opponent) - angle 0 points right
    state.fighters[0].angle = 0;
    state.fighters[0].gunAngle = 0;
    state.fighters[0].rightGunAngle = 0;
    state.fighters[0].leftGunAngle = 0;
    const angle0 = Math.random() * Math.PI * 2;
    state.fighters[0].vx = Math.cos(angle0) * state.fighters[0].speed;
    state.fighters[0].vy = Math.sin(angle0) * state.fighters[0].speed;

    state.fighters[1].x = rightX;
    state.fighters[1].y = centerY;
    // Face left (toward opponent)
    state.fighters[1].angle = Math.PI;
    state.fighters[1].gunAngle = Math.PI;
    state.fighters[1].rightGunAngle = Math.PI;
    state.fighters[1].leftGunAngle = Math.PI;
    const angle1 = Math.random() * Math.PI * 2;
    state.fighters[1].vx = Math.cos(angle1) * state.fighters[1].speed;
    state.fighters[1].vy = Math.sin(angle1) * state.fighters[1].speed;
  }
}

export function randomize1v1Fighters() {
  const currentDefs = getActiveFighterDefs();
  if (currentDefs.length < 2) return;
  
  const indices = currentDefs.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  state.p1Index = indices[0];
  state.p2Index = indices[1];
}

export function resetMatchWithRandom1v1Fighters() {
  randomize1v1Fighters();
  resetMatch();
}

export function startRandomStandoffBattle() {
  state.mode = 'Stand Off';
  randomize1v1Fighters();
  state.isRandomRollShowoff = true;
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffAutoStart = true;
  state.faceOffFromSelect = false;
  state.faceOffCleanMode = false;
  resetMatch();
  startFaceOffScreen(false);
}

export function randomize1v2Fighters() {
  const currentDefs = getActiveFighterDefs();
  if (currentDefs.length < 3) return;
  const indices = currentDefs.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.p1Index = indices[0];
  state.p2Index = indices[1];
  state.p3Index = indices[2];
}

export function resetMatchWithRandom1v2Fighters() {
  randomize1v2Fighters();
  resetMatch();
}

export function startRandom1v2Battle() {
  state.mode = '1v2 Stand Off';
  randomize1v2Fighters();
  state.isRandomRollShowoff = true;
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffAutoStart = true;
  state.faceOffFromSelect = false;
  state.faceOffCleanMode = false;
  resetMatch();
  startFaceOffScreen(false);
}

export function randomize2v2Fighters() {
  if (FIGHTER_DEFS.length < 4) return;
  const indices = FIGHTER_DEFS.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.p1Index = indices[0];
  state.p3Index = indices[1];
  state.p2Index = indices[2];
  state.p4Index = indices[3];
}

export function startRandom2v2Battle() {
  state.mode = '2v2';
  randomize2v2Fighters();
  state.isRandomRollShowoff = true;
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffAutoStart = true;
  state.faceOffFromSelect = false;
  state.faceOffCleanMode = false;
  resetMatch();
  startFaceOffScreen(false);
}

export function randomizeFfaFighters() {
  if (FIGHTER_DEFS.length < 4) return;
  const indices = FIGHTER_DEFS.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.p1Index = indices[0];
  state.p2Index = indices[1];
  state.p3Index = indices[2];
  state.p4Index = indices[3];
}

export function startRandomFfaBattle() {
  state.mode = 'FFA';
  randomizeFfaFighters();
  state.isRandomRollShowoff = true;
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffAutoStart = true;
  state.faceOffFromSelect = false;
  state.faceOffCleanMode = false;
  resetMatch();
  startFaceOffScreen(false);
}

export function randomizeTagMatchFighters() {
  const currentDefs = getActiveFighterDefs();
  if (currentDefs.length < 6) return;
  const indices = currentDefs.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.p1Index = indices[0];
  state.p3Index = indices[1];
  state.p5Index = indices[2];
  state.p2Index = indices[3];
  state.p4Index = indices[4];
  state.p6Index = indices[5];
  saveFighterSelections();
}

export function resetMatchWithRandomTagMatchFighters() {
  randomizeTagMatchFighters();
  resetMatch();
}

export function startRandomTagMatchBattle() {
  state.mode = 'Tag Match';
  randomizeTagMatchFighters();
  state.isRandomRollShowoff = true;
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffAutoStart = true;
  state.faceOffFromSelect = false;
  state.faceOffCleanMode = false;
  resetMatch();
  startFaceOffScreen(false);
}

export function spawnTagInFighter(teamIndex) {
  if (!state.tagMatch) return false;
  const teamKey = 'team' + teamIndex;
  state.tagMatch[teamKey + 'Eliminations']++;
  state.tagMatch[teamKey + 'ActiveSlot']++;
  const nextSlot = state.tagMatch[teamKey + 'ActiveSlot'];
  const roster = state.tagMatch[teamKey + 'Roster'];
  if (!roster || nextSlot >= roster.length) {
    return false; // All 3 fighters in this team are eliminated!
  }

  const nextFighterIndex = roster[nextSlot];
  const currentDefs = getActiveFighterDefs();
  const def = currentDefs[nextFighterIndex] || FIGHTER_DEFS[nextFighterIndex] || currentDefs[0];
  const newFighter = createFighterInstance(def, nextFighterIndex);
  newFighter.reset();

  const fixedHp = MODE_SETTINGS[state.mode]?.fixedHp || 1000;
  const isMakima = (newFighter.characterId === 'makima' || newFighter.type === 'makima');
  const hp = isMakima ? Math.round(fixedHp * 0.50) : fixedHp;
  newFighter.maxHp = hp;
  newFighter.hp = hp;

  const arena = state.arena || CONFIG.arena;
  const centerY = arena.y + arena.height * 0.5;
  const leftX = arena.x + arena.width * 0.25;
  const rightX = arena.x + arena.width * 0.75;

  if (teamIndex === 0) {
    newFighter.x = leftX;
    newFighter.y = centerY;
    newFighter.angle = 0;
    newFighter.gunAngle = 0;
    newFighter.rightGunAngle = 0;
    newFighter.leftGunAngle = 0;
    const angle0 = Math.random() * Math.PI * 2;
    newFighter.vx = Math.cos(angle0) * newFighter.speed;
    newFighter.vy = Math.sin(angle0) * newFighter.speed;
  } else {
    newFighter.x = rightX;
    newFighter.y = centerY;
    newFighter.angle = Math.PI;
    newFighter.gunAngle = Math.PI;
    newFighter.rightGunAngle = Math.PI;
    newFighter.leftGunAngle = Math.PI;
    const angle1 = Math.random() * Math.PI * 2;
    newFighter.vx = Math.cos(angle1) * newFighter.speed;
    newFighter.vy = Math.sin(angle1) * newFighter.speed;
  }

  // Tag-in invulnerability (60 frames ~ 1 sec)
  newFighter.invulnerableTimer = 60;
  newFighter._tagInGlowTimer = 60;

  // Aim towards current active opponent
  const oppIndex = 1 - teamIndex;
  const oppFighter = state.fighters[oppIndex];
  if (oppFighter && typeof newFighter.aim === 'function') {
    newFighter.aim(oppFighter);
  }

  // Replace dead fighter in state.fighters array at index teamIndex
  state.fighters[teamIndex] = newFighter;

  // Clear HUD cache so the new fighter's stats and skill bars build cleanly
  clearHealthHud();

  // Floating text announcement
  const teamColor = teamIndex === 0 ? '#ff4d4d' : '#4da3ff';
  const teamName = teamIndex === 0 ? 'TEAM RED' : 'TEAM BLUE';
  if (typeof spawnFloatingText === 'function') {
    spawnFloatingText(newFighter.x, newFighter.y - 40, `TAG IN: ${def.name.toUpperCase()}!`, teamColor, 24);
  }

  // Audio SFX
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.5);
  }

  return true;
}

state.spawnTagInFighter = spawnTagInFighter;

export function startFaceOffScreen(isThumbnailOnly = false) {
  if (!isThumbnailOnly) {
    // Skip showoff screen, launch in-arena countdown directly!
    startCountdown();
    return;
  }
  state.faceOffTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffFromSelect = isThumbnailOnly;
  state.faceOffAutoStart = !isThumbnailOnly;
  state.faceOffCleanMode = false;
  state.gameState = 'faceoff';
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash5', 0.25);
  }
}

export function startMatchDirectlyFromFaceOff() {
  state._isChampionLayoutActive = false;
  state.roundEndTimer = 0;
  state.matchEndTimer = 0;
  state.faceOffExiting = false;
  state.faceOffExitTimer = 0;
  state.faceOffTimer = 0; // Reset faceOffTimer so HP overlay and in-game timers activate cleanly
  state.isRandomRollShowoff = false;
  state.battleStartFadeTimer = 16;
  state.battleStartDelayTimer = 22; // Small delay (22 frames / ~0.35s) before fighters start moving
  state.gameState = 'playing';
  state.countdownTimer = state.countdownDuration || 180;
  state.announcerPlayingSequence = false;
  state.announcerSubtitle = '';
  startArenaBgm(true);

  // Instant Battle Start Readiness: Clear initial spawn cooldowns & ensure HP overlay displays!
  if (state.fighters) {
    state.fighters.forEach(f => {
      if (f && f.hp > 0) {
        f._isFaceOff = false;
        f.hideHpText = false;
        f.shootCooldown = 0;
        f.cooldown = 0;
        f.meleeCooldown = 0;
        f.forcedMeleeTimer = 0;
        f.hitStunTimer = 0;
        f.knockbackStunTimer = 0;
        if (f.type === 'gojo' || (f._def && f._def.type === 'gojo')) {
          f.combatAuraOpacity = 1;
        } else if (f.type === 'sukuna' || (f._def && f._def.type === 'sukuna')) {
          f.combatAuraOpacity = 1;
        }
      }
    });
  }
}

export function proceedFromFaceOffToCountdown() {
  if (state.gameState === 'faceoff') {
    state.faceOffAutoStart = true;
    if (state.faceOffTimer < 216) {
      state.faceOffTimer = 216; // Fast-forward directly to match start
      return;
    }
    startMatchDirectlyFromFaceOff();
    return;
  }
  startCountdown();
}

export async function startGame() {
  await unlockAudio();
  resetMatch(true); // Enters Face-Off overlay before countdown immediately
  // Prioritize active match audio first so combatants' sounds are fully decoded before countdown ends
  preloadActiveMatchSounds(state.fighters);
}

export function startNextRound() {
  state._isChampionLayoutActive = false;
  state.roundEndTimer = 0;
  state.matchEndTimer = 0;
  state.isRoundDraw = false;
  state.isDraw = false;
  state.roundWinner = null;
  state.matchWinner = null;
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state._hadMissionOverlay = false;
  const isFFA = (state.mode === GAME_MODES.FFA || state.mode === 'FFA' || state.mode === GAME_MODES.TACTICAL_FFA || state.mode === 'Tactical FFA');
  if (isFFA && state.ffaMatchComplete) {
    resetMatch();
    return;
  }

  const maxRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  if (state.roundNum >= maxRounds) {
    // Already at or past max rounds — end the match instead of starting a new round
    resetMatch();
    return;
  }

  state.roundNum++;
  state.illusions = []; // Clear all illusions on new round
  state.wallCracks = []; // Clear all wall crack decals on new round
  if (state.announcerSoundHandle) {
    stopSound(state.announcerSoundHandle);
    state.announcerSoundHandle = null;
  }
  state.announcerSubtitle = '';
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0); // Stop any lingering audio loops from previous round
  clearHealthHud(); // Flush stale fighter-keyed DOM cache before new instances are created
  reinitFighters();
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles from previous round
  burnEffectSystem.clear();
  clearDroppedMagazines(); // Clear all John Wick dropped magazines, thrown guns, and spent casings
  clearDriveBys();
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearDroppedMahoragaWheels();
  clearCarExplosions();
  clearBamEffects();
  clearHybridProjectiles();
  clearAllPools(); // Clear all particle object pools
  startCountdown();
}

export function restartCurrentRound() {
  state._isChampionLayoutActive = false;
  state.roundEndTimer = 0;
  state.matchEndTimer = 0;
  state.isRoundDraw = false;
  state.isDraw = false;
  state.roundWinner = null;
  state.matchWinner = null;
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state._hadMissionOverlay = false;
  state.illusions = []; // Clear all illusions
  state.wallCracks = []; // Clear all wall crack decals
  if (state.announcerSoundHandle) {
    stopSound(state.announcerSoundHandle);
    state.announcerSoundHandle = null;
  }
  state.announcerSubtitle = '';
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0);
  clearHealthHud(); // Flush stale fighter-keyed DOM cache before new instances are created
  reinitFighters();
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles
  burnEffectSystem.clear();
  clearDroppedMagazines(); // Clear all John Wick dropped magazines, thrown guns, and spent casings
  clearDriveBys();
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearDroppedMahoragaWheels();
  clearCarExplosions();
  clearBamEffects();
  clearHybridProjectiles();
  clearAllPools(); // Clear all particle object pools
  tacticalProjectileSystem.clear();
  startCountdown();
}



function playAnnouncerSoundWithFallback(soundKey, onEndedCallback) {
  const snd = getAnnouncerSound(soundKey);
  if (!snd) {
    onEndedCallback();
    return null;
  }

  let endedCalled = false;
  const safeEnded = () => {
    if (endedCalled) return;
    endedCalled = true;
    onEndedCallback();
  };

  const handle = audioSystem.playSFX(snd.src, snd.volume, snd.speed, snd.offset || 0, 0, safeEnded);
  
  // Use config-defined duration (adjusted for playback speed) to cut off trailing silence immediately!
  const speed = snd.speed || 1.0;
  const duration = snd.duration ? (snd.duration / speed) : 1.5;
  
  const timeoutId = setTimeout(safeEnded, duration * 1000);
  if (state.announcerTimeoutIds) {
    state.announcerTimeoutIds.push(timeoutId);
  }
  
  return handle;
}

export function startCountdown() {
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0);
  state.countdownTimer = 0;
  state.gameState = 'countdown';
  state.announcerSoundHandle = null;
  state.announcerPlayingSequence = false;
  state.announcerSubtitle = '';
  resetCamera(true); // Center camera on arena center immediately for countdown

  if (!state.announcerTimeoutIds) {
    state.announcerTimeoutIds = [];
  }
  state.announcerTimeoutIds.forEach(id => clearTimeout(id));
  state.announcerTimeoutIds = [];

  // Reset Cursed Energy combat aura for JJK fighters during countdown
  if (state.fighters) {
    state.fighters.forEach(f => {
      if (f) {
        f.combatAuraOpacity = 0;
        f.cursedEnergyAlpha = 0;
      }
    });
    // Ensure active match audio is preloaded with high priority during countdown
    preloadActiveMatchSounds(state.fighters);
  }
}

export function resetMatch(showFaceOff = true) {
  state._isChampionLayoutActive = false;
  if (state.mode === 'TLFS') {
    state.tlfsDefeatedEnemies = 0;
    if (state.tlfsAllowedEnemies && state.tlfsAllowedEnemies.length > 0) {
      state.p2Index = state.tlfsAllowedEnemies[Math.floor(Math.random() * state.tlfsAllowedEnemies.length)];
    }
  } else if (state.mode === GAME_MODES.TAG_MATCH || state.mode === 'Tag Match') {
    state.tagMatch = {
      team0Roster: [state.p1Index ?? 0, state.p3Index ?? 2, state.p5Index ?? 4],
      team1Roster: [state.p2Index ?? 1, state.p4Index ?? 3, state.p6Index ?? 5],
      team0ActiveSlot: 0,
      team1ActiveSlot: 0,
      team0Eliminations: 0,
      team1Eliminations: 0,
      tagInTransition: null,
    };
  }
  state.scores = [0, 0, 0, 0];
  state.teamScores = [0, 0]; // Reset 2v2 team scores
  state.roundNum = 1;
  state.roundWinner = null;
  state.matchWinner = null;
  state.roundEndTimer = 0;
  state.matchEndTimer = 0;
  state.battleStartDelayTimer = 0;
  state.ffaMatchComplete = false;
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state.cheatNotification = null;
  state._hasPlayedChampionVictoryVoice = false;
  state._hasPlayedChampionYouWinVoice = false;
  state._hasPlayedFollowForMoreSfx = false;
  state.illusions = []; // Clear all illusions on match reset
  state.wallCracks = []; // Clear all wall crack decals on match reset
  state.matchKills = [[], [], [], []];

  if (state.announcerSoundHandle) {
    stopSound(state.announcerSoundHandle);
    state.announcerSoundHandle = null;
  }
  state.announcerSubtitle = '';
  if (state.announcerTimeoutIds) {
    state.announcerTimeoutIds.forEach(id => clearTimeout(id));
    state.announcerTimeoutIds = [];
  }

  // Stop all sounds immediately when resetting match (no fade delay)
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0);

  clearHealthHud(); // Flush DOM and Map cache
  reinitFighters(true); // Reinit with new match flag to clear cooldowns/stacks
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles
  burnEffectSystem.clear();
  clearDroppedMagazines(); // Clear all John Wick dropped magazines, thrown guns, and spent casings
  clearDriveBys(); // Clear all Grove Street drive-by vehicles and effects
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearDroppedMahoragaWheels();
  clearCarExplosions();
  clearBamEffects();
  clearHybridProjectiles();
  clearAllPools(); // Clear all particle object pools
  tacticalProjectileSystem.clear();
  if (showFaceOff) {
    startFaceOffScreen(false);
  } else {
    startCountdown();
  }
}

export function goToTitle() {
  if (state.announcerTimeoutIds) {
    state.announcerTimeoutIds.forEach(id => clearTimeout(id));
    state.announcerTimeoutIds = [];
  }
  state.announcerSubtitle = '';

  // Stop all sounds immediately when returning to title (no fade delay)
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0);
  
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state.cheatNotification = null;
  state.wallCracks = []; // Clear all wall crack decals on return to title
  clearHealthHud(); // Flush DOM and Map cache cleanly
  clearDroppedMagazines(); // Clear all John Wick debris
  clearDriveBys();
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearDroppedMahoragaWheels();
  clearCarExplosions();
  clearBamEffects();
  clearHybridProjectiles();
  clearProjectiles();
  clearAllPools();
  
  state.gameState = 'title';
}
