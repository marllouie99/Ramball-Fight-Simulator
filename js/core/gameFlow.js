// ─────────────────────────────────────────────
// GAME FLOW — State transitions and round management
// Extracted from main.js so that ui.js can import these without
// creating a circular dependency with main.js.
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';
import { state, createFighterInstance, clearProjectiles } from './state.js';
import { updateFighters, updateProjectiles, spawnFuelPickup } from '../systems/physics.js';
import { preloadSound, playSound, stopAllSounds, stopAllLoopingSounds } from '../systems/soundSystem.js';
import { getBasicAttackSoundPaths } from '../soundEffects/basicAttackSounds.js';
import { getSkillSoundPaths } from '../soundEffects/skillSounds.js';
import { getSkillEffectSoundPaths } from '../soundEffects/skillEffectSounds.js';
import { getAnnouncerSoundPaths, getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';

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
};

function preloadGameSounds() {
  // Legacy assets + basic attack sounds + skill sounds + skill effect sounds
  const legacyPaths = Object.values(SOUND_ASSETS);
  const basicAttackPaths = getBasicAttackSoundPaths();
  const skillPaths = getSkillSoundPaths();
  const skillEffectPaths = getSkillEffectSoundPaths();
  const announcerPaths = getAnnouncerSoundPaths();
  const allPaths = [...new Set([...legacyPaths, ...basicAttackPaths, ...skillPaths, ...skillEffectPaths, ...announcerPaths])];
  return Promise.all(allPaths.map(preloadSound));
}

// Re-export physics update steps so callers can import them from gameFlow.js
export { updateFighters, updateProjectiles };

export function resetFighter(fighter) {
  fighter.reset();
}

export function reinitFighters() {
  state.floatingTexts.length = 0;
  state.roundWinner = null;
  state.roundEndTimer = 0;

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
  if (state.mode === GAME_MODES.FFA) {
    fighterIndexes.push(state.p3Index, state.p4Index);
  } else if (state.mode === GAME_MODES.TWO_VS_TWO) {
    // UI shows RED side as p1/p3 and BLUE side as p2/p4,
    // so arrange fighters to match the team spawn ordering.
    fighterIndexes = [state.p1Index, state.p3Index, state.p2Index, state.p4Index];
  }

  state.fighters.length = 0;
  for (const idx of fighterIndexes) {
    state.fighters.push(createFighterInstance(FIGHTER_DEFS[idx], idx));
  }

  state.fighters.forEach((fighter) => fighter.reset());

  const arena = state.arena;
  if (state.mode === GAME_MODES.FFA) {
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
    state.fighters[0].vx = state.fighters[0].speed;
    state.fighters[0].vy = 0;

    state.fighters[1].x = rightX;
    state.fighters[1].y = centerY;
    // Face left (toward opponent)
    state.fighters[1].angle = Math.PI;
    state.fighters[1].gunAngle = Math.PI;
    state.fighters[1].rightGunAngle = Math.PI;
    state.fighters[1].leftGunAngle = Math.PI;
    state.fighters[1].vx = -state.fighters[1].speed;
    state.fighters[1].vy = 0;
  }
}

export function randomize1v1Fighters() {
  if (FIGHTER_DEFS.length < 2) return;
  const indices = FIGHTER_DEFS.map((_, idx) => idx);
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

export async function startGame() {
  await preloadGameSounds();
  resetMatch();
}

export function startNextRound() {
  if (state.mode === GAME_MODES.FFA && state.ffaMatchComplete) {
    resetMatch();
    return;
  }

  state.roundNum++;
  state.illusions = []; // Clear all illusions on new round
  reinitFighters();
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles from previous round
  burnEffectSystem.clear();
  startCountdown();
}

export function restartCurrentRound() {
  reinitFighters();
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles
  burnEffectSystem.clear();
  startCountdown();
}

export function startCountdown() {
  state.countdownTimer = 0;
  state.gameState = 'countdown';

  if (state.roundNum === 1) {
    const snd = getAnnouncerSound('round1');
    if (snd) playSound(snd.src, snd.volume, snd.speed, snd.offset || 0);
  } else if (state.roundNum === 2) {
    const snd = getAnnouncerSound('round2');
    if (snd) playSound(snd.src, snd.volume, snd.speed, snd.offset || 0);
  } else if (state.roundNum === 3) {
    const snd = getAnnouncerSound('round3');
    if (snd) playSound(snd.src, snd.volume, snd.speed, snd.offset || 0);
  }
}

export function resetMatch() {
  state.scores = [0, 0, 0, 0];
  state.teamScores = [0, 0]; // Reset 2v2 team scores
  state.roundNum = 1;
  state.roundWinner = null;
  state.matchWinner = null;
  state.roundEndTimer = 0;
  state.matchEndTimer = 0;
  state.ffaMatchComplete = false;
  state.illusions = []; // Clear all illusions on match reset
  state.matchKills = [[], [], [], []];

  // Stop all sounds when resetting match
  stopAllSounds();
  stopAllLoopingSounds();

  reinitFighters();
  clearProjectiles();
  flamewardenFlameSystem.clear(); // Clear flame particles
  burnEffectSystem.clear();
  startCountdown();
}

export function goToTitle() {
  // Stop all sounds when returning to title
  stopAllSounds();
  stopAllLoopingSounds();
  
  // Clear the persistent health HUDs from the DOM
  const containerBottom = document.getElementById('healthHud');
  if (containerBottom) containerBottom.innerHTML = '';
  const containerLeft = document.getElementById('healthHudLeft');
  if (containerLeft) containerLeft.innerHTML = '';
  const containerRight = document.getElementById('healthHudRight');
  if (containerRight) containerRight.innerHTML = '';
  
  state.gameState = 'title';
}
