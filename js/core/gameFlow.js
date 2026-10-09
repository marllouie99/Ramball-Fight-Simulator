import { stopAllSounds, stopAllLoopingSounds, preloadSound, preloadAudioBuffer, preloadAudioBufferBatch, stopSound, unlockAudio } from '../systems/soundSystem.js';
// ─────────────────────────────────────────────
// GAME FLOW — State transitions and round management
// Extracted from main.js so that ui.js can import these without
// creating a circular dependency with main.js.
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';
import { state, createFighterInstance, clearProjectiles, spawnFloatingText, saveFighterSelections } from './state.js';
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
import { clearHudShatters } from '../graphics/particles/hudShatterEffect.js';
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
import { resetCamera } from '../systems/cameraSystem.js';
import { BossManager, BossEntranceSequence } from '../bosses/index.js';
import { getFocMapForBoss } from '../../FOC Maps/index.js';
import { setViewportOrientation, getArenaConfigForMode } from './viewportManager.js';
import { getFfaPlusQuadrantSpawns } from '../systems/arenaObstacleSystem.js';

// ─────────────────────────────────────────────
// ON-DEMAND AUDIO & ASSET STREAMING (LAZY LOADING)
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
 * Preloads universal baseline UI and physical combat impact audio (~10-15 files, <500 KB total).
 * Invoked on startup boot to guarantee instantaneous responsive UI and core hit impacts
 * without downloading the entire 233+ MB game asset library upfront.
 */
export function preloadEssentialCoreSounds() {
  const corePaths = [
    'Assets/Sound Effects/Attacks/fleshhit.mp3',
    'Assets/Sound Effects/Attacks/punch.mp3',
    'Assets/Sound Effects/Attacks/swordswing.mp3',
    'Assets/Sound Effects/Attacks/groundSmash.mp3',
    'Assets/Sound Effects/Attacks/explosion.mp3',
    'Assets/Sound Effects/Attacks/spaceshot.mp3',
    'Assets/Sound Effects/Attacks/laserpew.mp3',
    'Assets/Sound Effects/Skills/dash1.mp3',
    'Assets/Sound Effects/Skills/dash3.mp3',
    'Assets/Sound Effects/Skills/dash5.mp3',
    ...getAnnouncerSoundPaths()
  ];
  return preloadSound([...new Set(corePaths.filter(Boolean))], { priority: false, idle: true });
}

/**
 * Streams and decodes audio and hair assets on-demand for a specific fighter character.
 * @param {object|string|number} fighterOrId - Fighter instance, character ID, or index
 * @param {boolean} [isPriority=false]
 * @returns {Promise<any>}
 */
export function preloadFighterAssets(fighterOrId, isPriority = false) {
  if (fighterOrId === undefined || fighterOrId === null) return Promise.resolve();

  let f = fighterOrId;
  if (typeof fighterOrId === 'number') {
    const currentDefs = getActiveFighterDefs();
    f = currentDefs[fighterOrId] || FIGHTER_DEFS[fighterOrId] || { id: fighterOrId };
  } else if (typeof fighterOrId === 'string') {
    f = { characterId: fighterOrId, type: fighterOrId };
  }

  const def = f._def || f;
  const fId = f.fighterIndex !== undefined ? f.fighterIndex : def.id;
  const fType = f.type || def.type || f.characterId;
  const charId = f.characterId || fType || fId;

  const paths = [];

  // 1. Basic attack sound paths
  paths.push(...getFighterBasicAttackSoundPaths(fId, fType));
  if (charId && charId !== fId && charId !== fType) {
    paths.push(...getFighterBasicAttackSoundPaths(charId, charId));
  }

  // 2. Skill sound paths
  paths.push(...getFighterSkillSoundPaths(fId));
  if (fType && fType !== fId) {
    paths.push(...getFighterSkillSoundPaths(fType));
  }
  if (charId && charId !== fType) {
    paths.push(...getFighterSkillSoundPaths(charId));
  }

  // 3. Custom sounds and minion audio from character config
  const cfg = (charId && CONFIG[charId]) || (fType && CONFIG[fType]) || (fId && CONFIG[fId]);
  if (cfg) {
    paths.push(...extractSoundsFromObject(cfg));
  }

  // 5. Preload character hair model asset if configured in character assets
  if (typeof Image !== 'undefined' && cfg?.assets?.hair) {
    try {
      const img = new Image();
      img.src = cfg.assets.hair;
    } catch (e) {}
  }

  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return Promise.resolve();
  return preloadSound(uniquePaths, { priority: isPriority, idle: !isPriority });
}

/**
 * Fast-path priority preloader for the active match combatants.
 * Gathers essential combat impact sounds, announcer countdown SFX, the selected
 * arena BGM track, and the active fighters' specific attack, skill, and voice lines.
 * Decodes this compact set (~15-25 files) immediately with high priority so all
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
    'Assets/Sound Effects/Attacks/laserpew.mp3',
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

  // Trigger fighter assets preloading for each active combatant
  for (const f of activeFighters) {
    if (!f) continue;
    preloadFighterAssets(f, true);
  }

  const uniqueActivePaths = [...new Set(activePaths.filter(Boolean))];
  return preloadSound(uniqueActivePaths, { priority: true });
}

export function preloadGameSounds(isIdle = true) {
  return preloadEssentialCoreSounds();
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
  if (state.shatteredWalls) state.shatteredWalls.length = 0;
  clearHudShatters();
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
 
  // Clear any lingering last-kill badges from previous rounds
  state.fighters.forEach((f) => { if (f) f.lastKilledDef = null; });
 
  let fighterIndexes = [state.p1Index ?? 0, state.p2Index ?? 1];
  if (state.mode === GAME_MODES.TEAMFIGHT_3V3V3V3 || state.mode === '3v3v3v3 Teamfight') {
    const slots = state.horizontalRosterSlots || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    fighterIndexes = [
      slots[0] ?? state.p1Index ?? 0,
      slots[1] ?? state.p2Index ?? 1,
      slots[2] ?? state.p3Index ?? 2,
      slots[3] ?? state.p4Index ?? 3,
      slots[4] ?? state.p5Index ?? 4,
      slots[5] ?? state.p6Index ?? 5,
      slots[6] ?? state.p7Index ?? 6,
      slots[7] ?? state.p8Index ?? 7,
      slots[8] ?? state.p9Index ?? 8,
      slots[9] ?? state.p10Index ?? 9,
      slots[10] ?? state.p11Index ?? 10,
      slots[11] ?? state.p12Index ?? 11,
    ];
  } else if (state.mode === GAME_MODES.TEAMFIGHT_2V2V2V2 || state.mode === '2v2v2v2 Quad') {
    const slots = state.horizontalRosterSlots || [0, 1, 2, 3, 4, 5, 6, 7];
    fighterIndexes = [
      slots[0] ?? state.p1Index ?? 0,
      slots[1] ?? state.p2Index ?? 1,
      slots[2] ?? state.p3Index ?? 2,
      slots[3] ?? state.p4Index ?? 3,
      slots[4] ?? state.p5Index ?? 4,
      slots[5] ?? state.p6Index ?? 5,
      slots[6] ?? state.p7Index ?? 6,
      slots[7] ?? state.p8Index ?? 7,
    ];
  } else if (state.mode === GAME_MODES.TEAM_4V4 || state.mode === '4v4 Grand War') {
    const slots = state.horizontalRosterSlots || [0, 1, 2, 3, 4, 5, 6, 7];
    fighterIndexes = [
      slots[0] ?? state.p1Index ?? 0,
      slots[1] ?? state.p2Index ?? 1,
      slots[2] ?? state.p3Index ?? 2,
      slots[3] ?? state.p4Index ?? 3,
      slots[4] ?? state.p5Index ?? 4,
      slots[5] ?? state.p6Index ?? 5,
      slots[6] ?? state.p7Index ?? 6,
      slots[7] ?? state.p8Index ?? 7,
    ];
  } else if (state.mode === GAME_MODES.BATTLE_ROYALE_8 || state.mode === '8-Fighter Battle Royale') {
    const slots = state.horizontalRosterSlots || [0, 1, 2, 3, 4, 5, 6, 7];
    fighterIndexes = [
      slots[0] ?? state.p1Index ?? 0,
      slots[1] ?? state.p2Index ?? 1,
      slots[2] ?? state.p3Index ?? 2,
      slots[3] ?? state.p4Index ?? 3,
      slots[4] ?? state.p5Index ?? 4,
      slots[5] ?? state.p6Index ?? 5,
      slots[6] ?? state.p7Index ?? 6,
      slots[7] ?? state.p8Index ?? 7,
    ];
  } else if (state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel') {
    const slots = state.horizontalRosterSlots || [0, 1];
    state.p1Index = slots[0] ?? state.p1Index ?? 0;
    state.p2Index = slots[1] ?? state.p2Index ?? 1;
    fighterIndexes = [state.p1Index, state.p2Index];
  } else if (state.mode === GAME_MODES.TAG_MATCH || state.mode === 'Tag Match') {
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
  } else if (state.mode === GAME_MODES.FFA || state.mode === 'FFA') {
    if (state.viewOrientation === 'horizontal' && Array.isArray(state.horizontalRosterSlots)) {
      state.p1Index = state.horizontalRosterSlots[0] ?? state.p1Index ?? 0;
      state.p2Index = state.horizontalRosterSlots[1] ?? state.p2Index ?? 1;
      state.p3Index = state.horizontalRosterSlots[2] ?? state.p3Index ?? 2;
      state.p4Index = state.horizontalRosterSlots[3] ?? state.p4Index ?? 3;
      fighterIndexes = [state.p1Index, state.p2Index, state.p3Index, state.p4Index];
    } else {
      fighterIndexes.push(state.p3Index, state.p4Index);
    }
  } else if (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === '2v2') {
    // Arrange fighters to match the team spawn ordering.
    fighterIndexes = [state.p1Index, state.p3Index, state.p2Index, state.p4Index];
  } else if (state.mode === GAME_MODES.ONE_VS_TWO || state.mode === '1v2') {
    // 1v2 Regular Mode: Team 0 is p1 (Solo), Team 1 is p2 and p3 (Duo)
    fighterIndexes = [state.p1Index, state.p2Index, state.p3Index];
  } else if (state.mode === 'Boss Battle' || state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === '1v2 Stand Off' || state.mode === 'STAND_OFF_1V2') {
    // 1v2 / Boss Battle mode: Team 0 is p1 (Boss), Team 1 is p2 and p3 (Challengers) or solo p2
    fighterIndexes = state.bossBattleNoTeammate ? [state.p1Index, state.p2Index] : [state.p1Index, state.p2Index, state.p3Index];
  }
 
  if (CONFIG.globalFighter) {
    CONFIG.globalFighter.sizeMultiplier = CONFIG.globalFighter._defaultFocSizeMultiplier ?? 1.2;
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
      const isSans = (f.characterId === 'sans' || f.type === 'sans');
      const isMakima = (f.characterId === 'makima' || f.type === 'makima');
      const hp = isSans ? ((typeof CONFIG !== 'undefined' && CONFIG.sans?.hp !== undefined) ? CONFIG.sans.hp : 1) : (isMakima ? Math.round(fixedHp * (CONFIG.makima?.maxHpRatio ?? 1.0)) : fixedHp);
      f.maxHp = hp;
      f.hp = hp;
    }
  } else if (state.mode === 'Boss Battle' || state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === '1v2 Stand Off' || state.mode === 'STAND_OFF_1V2') {
    const fixedHp = MODE_SETTINGS[state.mode]?.fixedHp || 1000;
    state.fighters.forEach((f, idx) => {
      if (f && !f.isTurret && !f.isMinion && !f.isDeployable && !f.isIceWall && !f.isIllusion) {
        if (idx === 0) {
          BossManager.initializeBoss(f);
        } else {
          const isSans = (f.characterId === 'sans' || f.type === 'sans');
          const isMakima = (f.characterId === 'makima' || f.type === 'makima');
          const hp = isSans ? ((typeof CONFIG !== 'undefined' && CONFIG.sans?.hp !== undefined) ? CONFIG.sans.hp : 1) : (isMakima ? Math.round(fixedHp * (CONFIG.makima?.maxHpRatio ?? 1.0)) : fixedHp);
          f.maxHp = hp;
          f.hp = hp;
        }
      }
    });
  } else if (MODE_SETTINGS[state.mode]?.fixedHp) {
    const fixedHp = MODE_SETTINGS[state.mode].fixedHp;
    state.fighters.forEach((f) => {
      if (f && !f.isTurret && !f.isMinion && !f.isDeployable && !f.isIceWall && !f.isIllusion) {
        const isSans = (f.characterId === 'sans' || f.type === 'sans');
        const isMakima = (f.characterId === 'makima' || f.type === 'makima');
        const hp = isSans ? ((typeof CONFIG !== 'undefined' && CONFIG.sans?.hp !== undefined) ? CONFIG.sans.hp : 1) : (isMakima ? Math.round(fixedHp * (CONFIG.makima?.maxHpRatio ?? 1.0)) : fixedHp);
        f.maxHp = hp;
        f.hp = hp;
      }
    });
  }

  // Resolve dedicated FOC Boss Map if active boss exists (e.g. Yuta's Cursed Grove, Ender Dragon's The End)
  const isBoss = Boolean(state.fighters && state.fighters[0]?.isBoss);
  const bossMap = isBoss ? getFocMapForBoss(state.fighters[0]) : null;
  if (bossMap) {
    state.activeFocMap = bossMap;
    state.arena = { ...bossMap.arena };

    // Spawn End Crystal Minion Entities if Ender Dragon Boss Map
    if (bossMap.id === 'foc_ender_dragon_map' && Array.isArray(bossMap.crystals)) {
      // Clear any existing crystals first
      state.fighters = state.fighters.filter(f => !f.isEndCrystal);
      for (let cDef of bossMap.crystals) {
        const crystal = new EndCrystalEntity(cDef.x, cDef.y, cDef.id, cDef.name);
        state.fighters.push(crystal);
      }
    }
  } else {
    state.activeFocMap = null;
    const resolvedArena = getArenaConfigForMode(state.mode, state.viewOrientation);
    CONFIG.arena = { ...resolvedArena };
    state.arena = { ...resolvedArena };
  }

  const arena = state.arena;
  if (state.mode === GAME_MODES.TEAMFIGHT_3V3V3V3 || state.mode === '3v3v3v3 Teamfight') {
    // 4 Corner Pedestals (Red: Top-Left, Blue: Top-Right, Green: Bottom-Left, Gold: Bottom-Right)
    const corners = [
      { cx: arena.x + 260, cy: arena.y + 260, dirAngle: Math.PI / 4 },       // Team 0 (Red)
      { cx: arena.x + arena.width - 260, cy: arena.y + 260, dirAngle: (3 * Math.PI) / 4 }, // Team 1 (Blue)
      { cx: arena.x + 260, cy: arena.y + arena.height - 260, dirAngle: -Math.PI / 4 },      // Team 2 (Green)
      { cx: arena.x + arena.width - 260, cy: arena.y + arena.height - 260, dirAngle: (-3 * Math.PI) / 4 } // Team 3 (Gold)
    ];

    const offsets = [
      { dx: -34, dy: -20 },
      { dx: +34, dy: -20 },
      { dx: 0,   dy: +34 },
    ];

    state.fighters.forEach((fighter, idx) => {
      if (!fighter) return;
      const teamIdx = Math.floor(idx / 3);
      const slotInTeam = idx % 3;
      const corner = corners[teamIdx] || corners[0];
      const offset = offsets[slotInTeam] || offsets[0];

      fighter.x = corner.cx + offset.dx;
      fighter.y = corner.cy + offset.dy;
      const baseA = corner.dirAngle + (Math.random() - 0.5) * 0.4;
      fighter.angle = baseA;
      fighter.gunAngle = baseA;
      fighter.vx = Math.cos(baseA) * fighter.speed * 0.5;
      fighter.vy = Math.sin(baseA) * fighter.speed * 0.5;
    });
  } else if (state.mode === GAME_MODES.TEAMFIGHT_2V2V2V2 || state.mode === '2v2v2v2 Quad') {
    const corners = [
      { cx: arena.x + 260, cy: arena.y + 260, dirAngle: Math.PI / 4 },
      { cx: arena.x + arena.width - 260, cy: arena.y + 260, dirAngle: (3 * Math.PI) / 4 },
      { cx: arena.x + 260, cy: arena.y + arena.height - 260, dirAngle: -Math.PI / 4 },
      { cx: arena.x + arena.width - 260, cy: arena.y + arena.height - 260, dirAngle: (-3 * Math.PI) / 4 }
    ];
    const offsets = [
      { dx: -28, dy: 0 },
      { dx: +28, dy: 0 },
    ];
    state.fighters.forEach((fighter, idx) => {
      if (!fighter) return;
      const teamIdx = Math.floor(idx / 2);
      const slotInTeam = idx % 2;
      const corner = corners[teamIdx] || corners[0];
      const offset = offsets[slotInTeam] || offsets[0];

      fighter.x = corner.cx + offset.dx;
      fighter.y = corner.cy + offset.dy;
      const baseA = corner.dirAngle + (Math.random() - 0.5) * 0.4;
      fighter.angle = baseA;
      fighter.gunAngle = baseA;
      fighter.vx = Math.cos(baseA) * fighter.speed * 0.5;
      fighter.vy = Math.sin(baseA) * fighter.speed * 0.5;
    });
  } else if (state.mode === GAME_MODES.TEAM_4V4 || state.mode === '4v4 Grand War') {
    const leftX = arena.x + 260;
    const rightX = arena.x + arena.width - 260;
    const ySpacing = arena.height / 5;

    state.fighters.forEach((fighter, idx) => {
      if (!fighter) return;
      const isTeam0 = idx < 4;
      const slot = idx % 4;
      fighter.x = isTeam0 ? leftX : rightX;
      fighter.y = arena.y + ySpacing * (slot + 1);
      const baseA = isTeam0 ? 0 : Math.PI;
      fighter.angle = baseA;
      fighter.gunAngle = baseA;
      fighter.vx = Math.cos(baseA) * fighter.speed * 0.5;
      fighter.vy = Math.sin(baseA) * fighter.speed * 0.5;
    });
  } else if (state.mode === GAME_MODES.BATTLE_ROYALE_8 || state.mode === '8-Fighter Battle Royale') {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const rx = arena.width * 0.36;
    const ry = arena.height * 0.36;

    state.fighters.forEach((fighter, idx) => {
      if (!fighter) return;
      const a = (idx / 8) * Math.PI * 2;
      fighter.x = cx + Math.cos(a) * rx;
      fighter.y = cy + Math.sin(a) * ry;
      const faceAngle = a + Math.PI; // Face towards center
      fighter.angle = faceAngle;
      fighter.gunAngle = faceAngle;
      fighter.vx = Math.cos(faceAngle) * fighter.speed * 0.4;
      fighter.vy = Math.sin(faceAngle) * fighter.speed * 0.4;
    });
  } else if (state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel') {
    const cy = arena.y + arena.height / 2;
    if (state.fighters[0]) {
      state.fighters[0].x = arena.x + arena.width * 0.20;
      state.fighters[0].y = cy;
      state.fighters[0].angle = 0;
      state.fighters[0].gunAngle = 0;
      state.fighters[0].vx = state.fighters[0].speed * 0.5;
      state.fighters[0].vy = 0;
    }
    if (state.fighters[1]) {
      state.fighters[1].x = arena.x + arena.width * 0.80;
      state.fighters[1].y = cy;
      state.fighters[1].angle = Math.PI;
      state.fighters[1].gunAngle = Math.PI;
      state.fighters[1].vx = -state.fighters[1].speed * 0.5;
      state.fighters[1].vy = 0;
    }
  } else if (state.mode === GAME_MODES.FFA || state.mode === 'FFA' || state.mode === GAME_MODES.TACTICAL_FFA || state.mode === 'Tactical FFA') {
    const spawnPoints = getFfaPlusQuadrantSpawns(arena);

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
    if (state.fighters[0]) {
      state.fighters[0].x = leftX;
      state.fighters[0].y = centerY - verticalSpread;
      const angle0 = Math.random() * Math.PI * 2;
      state.fighters[0].vx = Math.cos(angle0) * state.fighters[0].speed;
      state.fighters[0].vy = Math.sin(angle0) * state.fighters[0].speed;
    }

    if (state.fighters[1]) {
      state.fighters[1].x = leftX;
      state.fighters[1].y = centerY + verticalSpread;
      const angle1 = Math.random() * Math.PI * 2;
      state.fighters[1].vx = Math.cos(angle1) * state.fighters[1].speed;
      state.fighters[1].vy = Math.sin(angle1) * state.fighters[1].speed;
    }

    // Team 2: top-right and bottom-right
    if (state.fighters[2]) {
      state.fighters[2].x = rightX;
      state.fighters[2].y = centerY - verticalSpread;
      const angle2 = Math.random() * Math.PI * 2;
      state.fighters[2].vx = Math.cos(angle2) * state.fighters[2].speed;
      state.fighters[2].vy = Math.sin(angle2) * state.fighters[2].speed;
    }

    if (state.fighters[3]) {
      state.fighters[3].x = rightX;
      state.fighters[3].y = centerY + verticalSpread;
      const angle3 = Math.random() * Math.PI * 2;
      state.fighters[3].vx = Math.cos(angle3) * state.fighters[3].speed;
      state.fighters[3].vy = Math.sin(angle3) * state.fighters[3].speed;
    }
  } else if (state.mode === GAME_MODES.ONE_VS_TWO || state.mode === '1v2') {
    // Regular 1v2 Formation: Solo Fighter on Left, Duo Opponents on Right (Top-Right & Bottom-Right)
    const leftX = arena.x + arena.width * 0.25;
    const rightX = arena.x + arena.width * 0.75;
    const centerY = arena.y + arena.height * 0.5;
    const verticalSpread = arena.height * 0.22;

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
  } else if (state.mode === 'Boss Battle' || state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === '1v2 Stand Off' || state.mode === 'STAND_OFF_1V2' || state.mode === 'Stand Off 1v2') {
    // Boss Battle Formation: Boss at top center, Solo Challenger at bottom center (or Challengers at bottom-left and bottom-right in Duo)
    const centerX = arena.x + arena.width * 0.5;
    const topY = arena.y + arena.height * 0.28;
    const bottomY = arena.y + arena.height * 0.72;
    const leftX = arena.x + arena.width * 0.28;
    const rightX = arena.x + arena.width * 0.72;

    // Team 1: Boss at top center, facing downward toward challengers
    if (state.fighters[0]) {
      state.fighters[0].x = centerX;
      state.fighters[0].y = topY;
      state.fighters[0].angle = Math.PI / 2;
      state.fighters[0].gunAngle = Math.PI / 2;
      state.fighters[0].rightGunAngle = Math.PI / 2;
      state.fighters[0].leftGunAngle = Math.PI / 2;
      const angle0 = Math.random() * Math.PI * 2;
      state.fighters[0].vx = Math.cos(angle0) * state.fighters[0].speed;
      state.fighters[0].vy = Math.sin(angle0) * state.fighters[0].speed;
    }

    if (state.bossBattleNoTeammate) {
      // Team 2: Solo Challenger at bottom center: gun aims at Boss, body stays in normal upright stance
      if (state.fighters[1]) {
        state.fighters[1].x = centerX;
        state.fighters[1].y = bottomY;
        const aimAngle1 = Math.atan2(topY - bottomY, centerX - centerX); // -Math.PI / 2
        state.fighters[1].angle = 0; // Body upright facing normal
        state.fighters[1].gunAngle = aimAngle1;
        state.fighters[1].rightGunAngle = aimAngle1;
        state.fighters[1].leftGunAngle = aimAngle1;
        const randAngle1 = Math.random() * Math.PI * 2;
        state.fighters[1].vx = Math.cos(randAngle1) * state.fighters[1].speed;
        state.fighters[1].vy = Math.sin(randAngle1) * state.fighters[1].speed;
      }
    } else {
      // Team 2: Challenger 1 at bottom left: gun aims at Boss, body stays in normal upright stance
      if (state.fighters[1]) {
        state.fighters[1].x = leftX;
        state.fighters[1].y = bottomY;
        const aimAngle1 = Math.atan2(topY - bottomY, centerX - leftX);
        state.fighters[1].angle = 0; // Body upright facing right
        state.fighters[1].gunAngle = aimAngle1;
        state.fighters[1].rightGunAngle = aimAngle1;
        state.fighters[1].leftGunAngle = aimAngle1;
        const randAngle1 = Math.random() * Math.PI * 2;
        state.fighters[1].vx = Math.cos(randAngle1) * state.fighters[1].speed;
        state.fighters[1].vy = Math.sin(randAngle1) * state.fighters[1].speed;
      }

      // Team 2: Challenger 2 at bottom right: gun aims at Boss, body stays in normal upright stance
      if (state.fighters[2]) {
        state.fighters[2].x = rightX;
        state.fighters[2].y = bottomY;
        const aimAngle2 = Math.atan2(topY - bottomY, centerX - rightX);
        state.fighters[2].angle = Math.PI; // Body upright facing left
        state.fighters[2].gunAngle = aimAngle2;
        state.fighters[2].rightGunAngle = aimAngle2;
        state.fighters[2].leftGunAngle = aimAngle2;
        const randAngle2 = Math.random() * Math.PI * 2;
        state.fighters[2].vx = Math.cos(randAngle2) * state.fighters[2].speed;
        state.fighters[2].vy = Math.sin(randAngle2) * state.fighters[2].speed;
      }
    }
  } else {
    // 1v1: Fighters on opposite sides, aligned horizontally, facing each other
    const centerY = arena.y + arena.height * 0.5;
    const leftX = arena.x + arena.width * 0.25;
    const rightX = arena.x + arena.width * 0.75;

    if (state.fighters[0]) {
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
    }

    if (state.fighters[1]) {
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
  if (currentDefs.length < 2) return;
  const indices = currentDefs.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.p1Index = indices[0];
  state.p2Index = indices[1];
  if (!state.bossBattleNoTeammate && indices.length > 2) {
    state.p3Index = indices[2];
  }
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
  const isSans = (newFighter.characterId === 'sans' || newFighter.type === 'sans');
  const isMakima = (newFighter.characterId === 'makima' || newFighter.type === 'makima');
  const hp = isSans ? ((typeof CONFIG !== 'undefined' && CONFIG.sans?.hp !== undefined) ? CONFIG.sans.hp : 1) : (isMakima ? Math.round(fixedHp * (CONFIG.makima?.maxHpRatio ?? 1.0)) : fixedHp);
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

export function launchMatchOrBossEntrance() {
  const isBossBattle = (
    state.mode === 'Boss Battle' ||
    state.mode === GAME_MODES.BOSS_BATTLE ||
    state.mode === GAME_MODES.STAND_OFF_1V2 ||
    state.mode === '1v2 Stand Off' ||
    state.mode === '1v2' ||
    state.mode === 'STAND_OFF_1V2' ||
    state.mode === 'Stand Off 1v2' ||
    Boolean(state.fighters && state.fighters[0]?.isBoss)
  );

  if (isBossBattle && state.fighters && state.fighters[0]?.isBoss) {
    state.faceOffAutoStart = false;
    state.gameState = 'boss_intro';

    const boss = state.fighters[0];

    BossEntranceSequence.start(boss, () => {
      // Seamless direct transition to FIGHT after cinematic boss intro concludes
      startBattleDirectlyAfterBossEntrance();
    });
    return;
  }

  startCountdown();
}

/**
 * Skips the 3-2-1 countdown after a boss entrance and goes directly to FIGHT.
 * Plays the FIGHT announcer + ring bell, starts BGM, and enters the playing state.
 */
function startBattleDirectlyAfterBossEntrance() {
  // Play FIGHT announcer + Ring Bell immediately
  const fightSnd = getAnnouncerSound('fight');
  const bellSnd = getAnnouncerSound('ringbell');
  if (fightSnd && typeof audioSystem !== 'undefined') {
    audioSystem.playSFX(fightSnd.src, fightSnd.volume, fightSnd.speed, fightSnd.offset || 0);
  }
  if (bellSnd && typeof audioSystem !== 'undefined') {
    audioSystem.playSFX(bellSnd.src, bellSnd.volume, bellSnd.speed, bellSnd.offset || 0);
  }

  // Reset camera to arena center
  resetCamera(true);

  // Start arena background music
  startArenaBgm(false);

  // Transition directly to playing state (no countdown phase)
  state._isChampionLayoutActive = false;
  state.battleStartDelayTimer = 0;
  state.battleStartFadeTimer = 0;
  state.countdownTimer = state.countdownDuration || 180;
  state.gameState = 'playing';
  state.announcerSoundHandle = null;
  state.announcerPlayingSequence = false;
  state.announcerSubtitle = '';

  if (!state.announcerTimeoutIds) {
    state.announcerTimeoutIds = [];
  }
  state.announcerTimeoutIds.forEach(id => clearTimeout(id));
  state.announcerTimeoutIds = [];

  // Clear initial spawn cooldowns so fighters attack & engage immediately
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
        // Aim challenger dynamically at boss upon battle start
        const boss = state.fighters[0];
        if (f !== boss && boss && typeof f.aim === 'function') {
          f.aim(boss);
        }
        // Randomize initial movement direction
        const startAngle = Math.random() * Math.PI * 2;
        const spd = f.speed || 3.0;
        f.vx = Math.cos(startAngle) * spd;
        f.vy = Math.sin(startAngle) * spd;
        if (f.type === 'gojo' || (f._def && f._def.type === 'gojo')) {
          f.combatAuraOpacity = 1;
        } else if (f.type === 'sukuna' || (f._def && f._def.type === 'sukuna')) {
          f.combatAuraOpacity = 1;
        }
      }
    });
    preloadActiveMatchSounds(state.fighters);
  }
}

export function startFaceOffScreen(isThumbnailOnly = false) {
  if (!isThumbnailOnly) {
    // Launch in-arena countdown or boss entrance directly!
    launchMatchOrBossEntrance();
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
  launchMatchOrBossEntrance();
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
  state.shatteredWalls = []; // Clear all shattered wall breaches on new round
  clearHudShatters();
  if (state.announcerSoundHandle) {
    stopSound(state.announcerSoundHandle);
    state.announcerSoundHandle = null;
  }
  state.announcerSubtitle = '';
  const is1v1Mode = (state.mode === '1v1' || state.mode === GAME_MODES.ONE_VS_ONE || state.mode === '1 VS 1' || state.mode === '1v1 Match' || state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel');
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0, true); // Stop any lingering audio loops from previous round (preserve BGM)
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
  state.shatteredWalls = []; // Clear all shattered wall breaches
  clearHudShatters();
  if (state.announcerSoundHandle) {
    stopSound(state.announcerSoundHandle);
    state.announcerSoundHandle = null;
  }
  state.announcerSubtitle = '';
  const is1v1Mode = (state.mode === '1v1' || state.mode === GAME_MODES.ONE_VS_ONE || state.mode === '1 VS 1' || state.mode === '1v1 Match' || state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel');
  stopAllSounds(false, 0, 0);
  stopAllLoopingSounds(0, 0, true); // Preserve BGM across round restarts
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
  stopAllLoopingSounds(0, 0, true);
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

  // Start background music if not already playing (forceNew = false ensures continuous playback across rounds for all modes)
  startArenaBgm(false);

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
  state.shatteredWalls = []; // Clear all shattered wall breaches on match reset
  clearHudShatters();
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
  stopArenaBgm(true);
  state.activeMatchBgmSrc = null;

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
  if (showFaceOff) {
    startFaceOffScreen(false);
  } else {
    launchMatchOrBossEntrance();
  }
}

export function goToTitle() {
  BossManager.reset();
  BossEntranceSequence.finish();
  state.activeFocMap = null;

  if (state.announcerTimeoutIds) {
    state.announcerTimeoutIds.forEach(id => clearTimeout(id));
    state.announcerTimeoutIds = [];
  }
  state.announcerSubtitle = '';

  // Stop all sounds immediately when returning to title (no fade delay)
  stopAllSounds(false, 0, 0, true);
  stopAllLoopingSounds(0, 0);
  stopArenaBgm(true);
  state.activeMatchBgmSrc = null;
  
  state._isRespectMusicPlaying = false;
  state._respectMusicHandle = null;
  state.missionPassedOverlay = null;
  state.wastedOverlay = null;
  state.cheatNotification = null;
  state.wallCracks = []; // Clear all wall crack decals on return to title
  state.shatteredWalls = []; // Clear all shattered wall breaches on return to title
  clearHudShatters();
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
