import { stopAllSounds, stopAllLoopingSounds, preloadSound, stopSound } from '../systems/soundSystem.js';
// ─────────────────────────────────────────────
// GAME FLOW — State transitions and round management
// Extracted from main.js so that ui.js can import these without
// creating a circular dependency with main.js.
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';
import { state, createFighterInstance, clearProjectiles } from './state.js';
import { updateFighters, updateProjectiles, spawnFuelPickup } from '../systems/physics.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getBasicAttackSoundPaths } from '../soundEffects/basicAttackSounds.js';
import { getSkillSoundPaths } from '../soundEffects/skillSounds.js';
import { getSkillEffectSoundPaths } from '../soundEffects/skillEffectSounds.js';
import { getAnnouncerSoundPaths, getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { ParticleSystem } from '../systems/particles/ParticleSystem.js';
import { clearAllPools } from '../graphics/objectPool.js';
import { clearHealthHud } from '../graphics/hudManager.js';
import { AUDIO_CONFIG } from '../configs/audioConfig.js';

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


function preloadGameSounds() {
  // Legacy assets + basic attack sounds + skill sounds + skill effect sounds + mapped audio config sounds
  const legacyPaths = Object.values(SOUND_ASSETS);
  const mappedConfigPaths = Object.values(AUDIO_CONFIG);
  const basicAttackPaths = getBasicAttackSoundPaths();
  const skillPaths = getSkillSoundPaths();
  const skillEffectPaths = getSkillEffectSoundPaths();
  const announcerPaths = getAnnouncerSoundPaths();
  
  const yujiSounds = [];
  if (CONFIG.yuji) {
    if (CONFIG.yuji.punchSound) yujiSounds.push(CONFIG.yuji.punchSound);
    if (CONFIG.yuji.punchSounds) yujiSounds.push(...CONFIG.yuji.punchSounds);
    if (CONFIG.yuji.blackFlashEnterSound) yujiSounds.push(CONFIG.yuji.blackFlashEnterSound);
    if (CONFIG.yuji.transformationSound) yujiSounds.push(CONFIG.yuji.transformationSound);
  }

  const yutaSounds = [];
  if (CONFIG.yuta) {
    if (CONFIG.yuta.katanaSwingSound) yutaSounds.push(CONFIG.yuta.katanaSwingSound);
    if (CONFIG.yuta.comeRikaSound) yutaSounds.push(CONFIG.yuta.comeRikaSound);
    if (CONFIG.yuta.rikaAppearanceSound) yutaSounds.push(CONFIG.yuta.rikaAppearanceSound);
    if (CONFIG.yuta.rikaAttackSound) yutaSounds.push(CONFIG.yuta.rikaAttackSound);
    if (CONFIG.yuta.rikaGroundSmashSound) yutaSounds.push(CONFIG.yuta.rikaGroundSmashSound);
    if (CONFIG.yuta.rikaGroundTrembleSound) yutaSounds.push(CONFIG.yuta.rikaGroundTrembleSound);
    if (CONFIG.yuta.rikaNoises) yutaSounds.push(...CONFIG.yuta.rikaNoises);
    if (CONFIG.yuta.thinIceBreakerSound) yutaSounds.push(CONFIG.yuta.thinIceBreakerSound);
    if (CONFIG.yuta.thinIceBreakerNoiseSound) yutaSounds.push(CONFIG.yuta.thinIceBreakerNoiseSound);
    if (CONFIG.yuta.domainChannelSound) yutaSounds.push(CONFIG.yuta.domainChannelSound);
    if (CONFIG.yuta.domainDeploySound) yutaSounds.push(CONFIG.yuta.domainDeploySound);
    if (CONFIG.yuta.phantomFlurryNoiseSound) yutaSounds.push(CONFIG.yuta.phantomFlurryNoiseSound);
  }

  const genosSounds = [];
  if (CONFIG.genos) {
    if (CONFIG.genos.basicBlastSound) genosSounds.push(CONFIG.genos.basicBlastSound);
    if (CONFIG.genos.basicChargeSound) genosSounds.push(CONFIG.genos.basicChargeSound);
    if (CONFIG.genos.meleePunchSound) genosSounds.push(CONFIG.genos.meleePunchSound);
    if (CONFIG.genos.dashSound) genosSounds.push(CONFIG.genos.dashSound);
    if (CONFIG.genos.flurryVoiceSound) genosSounds.push(CONFIG.genos.flurryVoiceSound);
    if (CONFIG.genos.ultVoiceSound) genosSounds.push(CONFIG.genos.ultVoiceSound);
    if (CONFIG.genos.ultChargeSound) genosSounds.push(CONFIG.genos.ultChargeSound);
    if (CONFIG.genos.ultBlastSound) genosSounds.push(CONFIG.genos.ultBlastSound);
    if (CONFIG.genos.ultRecoverySound) genosSounds.push(CONFIG.genos.ultRecoverySound);
    if (CONFIG.genos.selfDestructSound) genosSounds.push(CONFIG.genos.selfDestructSound);
  }

  const saitamaSounds = [];
  if (CONFIG.saitama) {
    if (CONFIG.saitama.counterPunchImpactSFX) saitamaSounds.push(CONFIG.saitama.counterPunchImpactSFX);
    if (CONFIG.saitama.counterPunchVoiceSFX) saitamaSounds.push(CONFIG.saitama.counterPunchVoiceSFX);
    if (CONFIG.saitama.counterPunchChargingSFX) saitamaSounds.push(CONFIG.saitama.counterPunchChargingSFX);
  }

  const allPaths = [...new Set([
    ...legacyPaths,
    ...mappedConfigPaths,
    ...basicAttackPaths,
    ...skillPaths,
    ...skillEffectPaths,
    ...announcerPaths,
    ...yujiSounds,
    ...yutaSounds,
    ...genosSounds,
    ...saitamaSounds
  ])];
  return Promise.all(allPaths.map(preloadSound));
}

// Re-export physics update steps so callers can import them from gameFlow.js
export { updateFighters, updateProjectiles };

export function resetFighter(fighter) {
  fighter.reset();
}

export function reinitFighters(isNewMatch = false) {
  // Save progressive properties of the current fighters if it's 1v1 mode
  const savedStates = [];
  const is1v1 = !isNewMatch && (state.mode === '1v1' || state.mode === GAME_MODES.ONE_VS_ONE);
  if (is1v1 && state.fighters && state.fighters.length > 0) {
    state.fighters.forEach((f, idx) => {
      if (f) {
        savedStates[idx] = {
          // Cooldowns
          shootCooldown: f.shootCooldown,
          skillCooldown: f.skillCooldown,
          cooldownTimer: f.cooldownTimer,
          stolenSkillCooldown: f.stolenSkillCooldown,
          boogieWoogieCooldown: f.boogieWoogieCooldown,
          boogieWoogieCharges: f.boogieWoogieCharges,
          comboRushCooldown: f.comboRushCooldown,
          rockThrowCooldown: f.rockThrowCooldown,
          divineFlameCooldown: f.divineFlameCooldown,
          cleaveCooldown: f.cleaveCooldown,
          shoutCooldown: f.shoutCooldown,
          destructionBarrageCooldown: f.destructionBarrageCooldown,
          voidDashCooldown: f.voidDashCooldown,
          maleficBombCooldown: f.maleficBombCooldown,
          ultimateCooldown: f.ultimateCooldown,
          aegisCooldown: f.aegisCooldown,
          stormCooldown: f.stormCooldown,
          sphereCooldown: f.sphereCooldown,
          flurryCooldown: f.flurryCooldown,
          swordCooldown: f.swordCooldown,
          c4Cooldown: f.c4Cooldown,
          telekinesisCooldown: f.telekinesisCooldown,
          spellStealCooldown: f.spellStealCooldown,

          // Progressive/Passive stats
          stunChance: f.stunChance,
          baseStunChance: f.baseStunChance,
          critChance: f.critChance,
          critMultiplier: f.critMultiplier,
          powerStacks: f.powerStacks,
          blackFlashCharge: f.blackFlashCharge,
          blackFlashThreshold: f.blackFlashThreshold,
          hasSummonedAt50Hp: f.hasSummonedAt50Hp,
          gojoInfinityImmune: f.gojoInfinityImmune,
          parryCount: f.parryCount,
          soulSwapActive: f.soulSwapActive,
          hasSoulSwapped: f.hasSoulSwapped,
          
          // Mahoraga adaptation wheel rules
          adapted: f.adapted ? { ...f.adapted } : undefined,
          adaptedTypes: f.adaptedTypes ? new Set(f.adaptedTypes) : undefined,
          adaptationProgress: f.adaptationProgress ? { ...f.adaptationProgress } : undefined,
          adaptationStages: f.adaptationStages ? { ...f.adaptationStages } : undefined,
          wheelRotations: f.wheelRotations,

          // Active transformations/states/timers
          isInUltimate: f.isInUltimate,
          soulSwapTimer: f.soulSwapTimer,
          domainActive: f.domainActive,
          domainTimer: f.domainTimer,
          isChannelingDomain: f.isChannelingDomain,
          isChannelingDomainExpansion: f.isChannelingDomainExpansion,
          stealthActive: f.stealthActive,
          stealthTimer: f.stealthTimer,
          ultimateActive: f.ultimateActive,
          ultimateTimer: f.ultimateTimer,
          combatAuraOpacity: f.combatAuraOpacity,
          
          // Rika state for Yuta
          rikaActiveState: (f.rika && f.rika.active) ? {
            active: f.rika.active,
            timer: f.rika.timer,
            cooldownTimer: f.rika.cooldownTimer,
            hasSummonedAt50Hp: f.rika.hasSummonedAt50Hp,
            killedInDomain: f.rika.killedInDomain
          } : null,
          
          // Trickster stolen spell info
          stolenType: f.stolenType,
          stolenDef: f.stolenDef,
          hasStolen: f.hasStolen,
          spellStealTimer: f.spellStealTimer
        };
      }
    });
  }

  // Proper cleanup of PixiJS Sprites before resetting lengths
  ParticleSystem.clearAll();
  burnEffectSystem.clear();
  bomberExplosionSystem.clear();
  flamewardenFlameSystem.clear();

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
  state.roundWinner = null;
  state.roundEndTimer = 0;
 
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
  if (state.mode === GAME_MODES.FFA) {
    fighterIndexes.push(state.p3Index, state.p4Index);
  } else if (state.mode === GAME_MODES.TWO_VS_TWO) {
    // UI shows RED side as p1/p3 and BLUE side as p2/p4,
    // so arrange fighters to match the team spawn ordering.
    fighterIndexes = [state.p1Index, state.p3Index, state.p2Index, state.p4Index];
  } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    // 1v2 mode: Team 0 is p1, Team 1 is p2 and p3
    fighterIndexes = [state.p1Index, state.p2Index, state.p3Index];
  }
 
  state.fighters.length = 0;
  for (const idx of fighterIndexes) {
    state.fighters.push(createFighterInstance(FIGHTER_DEFS[idx], idx));
  }
 
  state.fighters.forEach((fighter, idx) => {
    fighter.reset();

    // Restore states for 1v1 mode
    if (is1v1 && savedStates[idx]) {
      const saved = savedStates[idx];
      
      // Cooldowns
      if (saved.shootCooldown !== undefined) fighter.shootCooldown = saved.shootCooldown;
      if (saved.skillCooldown !== undefined) fighter.skillCooldown = saved.skillCooldown;
      if (saved.cooldownTimer !== undefined) fighter.cooldownTimer = saved.cooldownTimer;
      if (saved.stolenSkillCooldown !== undefined) fighter.stolenSkillCooldown = saved.stolenSkillCooldown;
      if (saved.boogieWoogieCooldown !== undefined) fighter.boogieWoogieCooldown = saved.boogieWoogieCooldown;
      if (saved.boogieWoogieCharges !== undefined) fighter.boogieWoogieCharges = saved.boogieWoogieCharges;
      if (saved.comboRushCooldown !== undefined) fighter.comboRushCooldown = saved.comboRushCooldown;
      if (saved.rockThrowCooldown !== undefined) fighter.rockThrowCooldown = saved.rockThrowCooldown;
      if (saved.divineFlameCooldown !== undefined) fighter.divineFlameCooldown = saved.divineFlameCooldown;
      if (saved.cleaveCooldown !== undefined) fighter.cleaveCooldown = saved.cleaveCooldown;
      if (saved.shoutCooldown !== undefined) fighter.shoutCooldown = saved.shoutCooldown;
      if (saved.destructionBarrageCooldown !== undefined) fighter.destructionBarrageCooldown = saved.destructionBarrageCooldown;
      if (saved.voidDashCooldown !== undefined) fighter.voidDashCooldown = saved.voidDashCooldown;
      if (saved.maleficBombCooldown !== undefined) fighter.maleficBombCooldown = saved.maleficBombCooldown;
      if (saved.ultimateCooldown !== undefined) fighter.ultimateCooldown = saved.ultimateCooldown;
      if (saved.aegisCooldown !== undefined) fighter.aegisCooldown = saved.aegisCooldown;
      if (saved.stormCooldown !== undefined) fighter.stormCooldown = saved.stormCooldown;
      if (saved.sphereCooldown !== undefined) fighter.sphereCooldown = saved.sphereCooldown;
      if (saved.flurryCooldown !== undefined) fighter.flurryCooldown = saved.flurryCooldown;
      if (saved.swordCooldown !== undefined) fighter.swordCooldown = saved.swordCooldown;
      if (saved.c4Cooldown !== undefined) fighter.c4Cooldown = saved.c4Cooldown;
      if (saved.telekinesisCooldown !== undefined) fighter.telekinesisCooldown = saved.telekinesisCooldown;
      if (saved.spellStealCooldown !== undefined) fighter.spellStealCooldown = saved.spellStealCooldown;

      // Passives & Stacks
      if (saved.stunChance !== undefined) fighter.stunChance = saved.stunChance;
      if (saved.baseStunChance !== undefined) fighter.baseStunChance = saved.baseStunChance;
      if (saved.critChance !== undefined) fighter.critChance = saved.critChance;
      if (saved.critMultiplier !== undefined) fighter.critMultiplier = saved.critMultiplier;
      if (saved.powerStacks !== undefined) fighter.powerStacks = saved.powerStacks;
      if (saved.blackFlashCharge !== undefined) fighter.blackFlashCharge = saved.blackFlashCharge;
      if (saved.blackFlashThreshold !== undefined) fighter.blackFlashThreshold = saved.blackFlashThreshold;
      if (saved.hasSummonedAt50Hp !== undefined) fighter.hasSummonedAt50Hp = saved.hasSummonedAt50Hp;
      if (saved.gojoInfinityImmune !== undefined) fighter.gojoInfinityImmune = saved.gojoInfinityImmune;
      if (saved.parryCount !== undefined) fighter.parryCount = saved.parryCount;
      if (saved.soulSwapActive !== undefined) fighter.soulSwapActive = saved.soulSwapActive;
      if (saved.hasSoulSwapped !== undefined) fighter.hasSoulSwapped = saved.hasSoulSwapped;

      // Mahoraga adaptation wheel rules
      if (saved.adapted !== undefined) fighter.adapted = saved.adapted;
      if (saved.adaptedTypes !== undefined) fighter.adaptedTypes = saved.adaptedTypes;
      if (saved.adaptationProgress !== undefined) fighter.adaptationProgress = saved.adaptationProgress;
      if (saved.adaptationStages !== undefined) fighter.adaptationStages = saved.adaptationStages;
      if (saved.wheelRotations !== undefined) fighter.wheelRotations = saved.wheelRotations;

      // Active transformations/states/timers
      if (saved.isInUltimate !== undefined) fighter.isInUltimate = saved.isInUltimate;
      if (saved.soulSwapTimer !== undefined) fighter.soulSwapTimer = saved.soulSwapTimer;
      if (saved.domainActive !== undefined) fighter.domainActive = saved.domainActive;
      if (saved.domainTimer !== undefined) fighter.domainTimer = saved.domainTimer;
      if (saved.isChannelingDomain !== undefined) fighter.isChannelingDomain = saved.isChannelingDomain;
      if (saved.isChannelingDomainExpansion !== undefined) fighter.isChannelingDomainExpansion = saved.isChannelingDomainExpansion;
      if (saved.stealthActive !== undefined) fighter.stealthActive = saved.stealthActive;
      if (saved.stealthTimer !== undefined) fighter.stealthTimer = saved.stealthTimer;
      if (saved.ultimateActive !== undefined) fighter.ultimateActive = saved.ultimateActive;
      if (saved.ultimateTimer !== undefined) fighter.ultimateTimer = saved.ultimateTimer;
      if (saved.combatAuraOpacity !== undefined) fighter.combatAuraOpacity = saved.combatAuraOpacity;

      // Rika state for Yuta
      if (saved.rikaActiveState && fighter.rika) {
        fighter.rika.active = saved.rikaActiveState.active;
        fighter.rika.timer = saved.rikaActiveState.timer;
        fighter.rika.cooldownTimer = saved.rikaActiveState.cooldownTimer;
        fighter.rika.hasSummonedAt50Hp = saved.rikaActiveState.hasSummonedAt50Hp;
        fighter.rika.killedInDomain = saved.rikaActiveState.killedInDomain;
      }

      // Trickster stolen spell info
      if (saved.stolenType !== undefined) fighter.stolenType = saved.stolenType;
      if (saved.stolenDef !== undefined) fighter.stolenDef = saved.stolenDef;
      if (saved.hasStolen !== undefined) fighter.hasStolen = saved.hasStolen;
      if (saved.spellStealTimer !== undefined) fighter.spellStealTimer = saved.spellStealTimer;
    }
  });

  if (state.mode === 'TLFS' && state.fighters[0]) {
    const fixedHp = MODE_SETTINGS[state.mode]?.playerFixedHp || 500;
    state.fighters[0].maxHp = fixedHp;
    state.fighters[0].hp = fixedHp;
  } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    const fixedHp = MODE_SETTINGS[state.mode]?.fixedHp || 1000;
    const soloFixedHp = MODE_SETTINGS[state.mode]?.soloFixedHp || 2000;
    state.fighters.forEach((f, idx) => {
      if (f) {
        const hp = idx === 0 ? soloFixedHp : fixedHp;
        f.maxHp = hp;
        f.hp = hp;
      }
    });
  } else if (MODE_SETTINGS[state.mode]?.fixedHp) {
    const fixedHp = MODE_SETTINGS[state.mode].fixedHp;
    state.fighters.forEach((f) => {
      if (f) {
        f.maxHp = fixedHp;
        f.hp = fixedHp;
      }
    });
  }

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
      state.fighters[0].vx = state.fighters[0].speed;
      state.fighters[0].vy = 0;
    }

    // Team 2: Duo on right
    if (state.fighters[1]) {
      state.fighters[1].x = rightX;
      state.fighters[1].y = centerY - verticalSpread;
      state.fighters[1].angle = Math.PI;
      state.fighters[1].gunAngle = Math.PI;
      state.fighters[1].rightGunAngle = Math.PI;
      state.fighters[1].leftGunAngle = Math.PI;
      state.fighters[1].vx = -state.fighters[1].speed;
      state.fighters[1].vy = 0;
    }

    if (state.fighters[2]) {
      state.fighters[2].x = rightX;
      state.fighters[2].y = centerY + verticalSpread;
      state.fighters[2].angle = Math.PI;
      state.fighters[2].gunAngle = Math.PI;
      state.fighters[2].rightGunAngle = Math.PI;
      state.fighters[2].leftGunAngle = Math.PI;
      state.fighters[2].vx = -state.fighters[2].speed;
      state.fighters[2].vy = 0;
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
  
  // DEBUG: Force Berserker (index 9) for player 1 to test axe swing
  const FORCE_BERSERKER = true;
  if (FORCE_BERSERKER) {
    // Find Berserker index
    const berserkerIdx = FIGHTER_DEFS.findIndex(d => d.id === 'berserker');
    if (berserkerIdx !== -1) {
      state.p1Index = berserkerIdx;
      // Pick a random opponent
      const otherIndices = FIGHTER_DEFS.map((_, idx) => idx).filter(idx => idx !== berserkerIdx);
      state.p2Index = otherIndices[Math.floor(Math.random() * otherIndices.length)];
      return;
    }
  }
  
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

export function randomize1v2Fighters() {
  if (FIGHTER_DEFS.length < 3) return;
  const indices = FIGHTER_DEFS.map((_, idx) => idx);
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

export async function startGame() {
  await preloadGameSounds();
  resetMatch();
}

export function startNextRound() {
  if (state.mode === GAME_MODES.FFA && state.ffaMatchComplete) {
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
  clearAllPools(); // Clear all particle object pools
  startCountdown();
}

export function restartCurrentRound() {
  state.illusions = []; // Clear all illusions
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
  stopAllLoopingSounds(0, 0);
  state.countdownTimer = 0;
  state.gameState = 'countdown';
  state.announcerSoundHandle = null;
  state.announcerPlayingSequence = true;

  if (!state.announcerTimeoutIds) {
    state.announcerTimeoutIds = [];
  }
  state.announcerTimeoutIds.forEach(id => clearTimeout(id));
  state.announcerTimeoutIds = [];

  // Initialize combat aura for Gojo/Sukuna during countdown
  state.fighters.forEach(f => {
    if (f && f._def && f._def.type === 'gojo') {
      f.combatAuraOpacity = 1;
    } else if (f && f._def && f._def.type === 'sukuna') {
      f.combatAuraOpacity = 1;
    }
  });

  const maxRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
  let soundKey = null;

  if (state.mode === 'TLFS') {
    soundKey = null; // No announcer for TLFS
  } else if (state.roundNum === maxRounds) {
    soundKey = 'finalround';
  } else if (state.roundNum === 1) {
    soundKey = 'round1';
  } else if (state.roundNum === 2) {
    soundKey = 'round2';
  } else if (state.roundNum === 3) {
    soundKey = 'round3';
  } else if (state.roundNum === 4) {
    soundKey = 'round4';
  }

  const is1v1 = (state.mode === '1v1' || state.mode === GAME_MODES.ONE_VS_ONE);

  let subtitleText = '';
  if (soundKey === 'round1') {
    subtitleText = 'Round 1, Fight!';
  } else if (soundKey === 'round2') {
    subtitleText = 'Round 2, Fight!';
  } else if (soundKey === 'round3') {
    subtitleText = 'Round 3, Fight!';
  } else if (soundKey === 'round4') {
    subtitleText = 'Round 4, Fight!';
  } else if (soundKey === 'finalround') {
    subtitleText = 'Final Round, Fight!';
  }

  if (is1v1 && state.roundNum === 1) {
    const hasBestOf3 = !!getAnnouncerSound('bestof3');
    if (hasBestOf3) {
      state.announcerSubtitle = "Best of 3";
      state.announcerSoundHandle = playAnnouncerSoundWithFallback('bestof3', () => {
        if (state.gameState !== 'countdown' || state.roundNum !== 1) return;
        
        if (soundKey) {
          state.announcerSubtitle = subtitleText;
          state.announcerSoundHandle = playAnnouncerSoundWithFallback(soundKey, () => {
            if (state.gameState === 'countdown') {
              state.announcerPlayingSequence = false;
              state.announcerSubtitle = '';
            }
          });
        } else {
          state.announcerPlayingSequence = false;
          state.announcerSubtitle = '';
        }
      });
    } else if (soundKey) {
      state.announcerSubtitle = subtitleText;
      state.announcerSoundHandle = playAnnouncerSoundWithFallback(soundKey, () => {
        if (state.gameState === 'countdown') {
          state.announcerPlayingSequence = false;
          state.announcerSubtitle = '';
        }
      });
    } else {
      state.announcerPlayingSequence = false;
      state.announcerSubtitle = '';
    }
  } else {
    if (soundKey) {
      state.announcerSubtitle = subtitleText;
      state.announcerSoundHandle = playAnnouncerSoundWithFallback(soundKey, () => {
        if (state.gameState === 'countdown') {
          state.announcerPlayingSequence = false;
          state.announcerSubtitle = '';
        }
      });
    } else {
      state.announcerPlayingSequence = false;
      state.announcerSubtitle = '';
    }
  }
}

export function resetMatch() {
  if (state.mode === 'TLFS') {
    state.tlfsDefeatedEnemies = 0;
    if (state.tlfsAllowedEnemies && state.tlfsAllowedEnemies.length > 0) {
      state.p2Index = state.tlfsAllowedEnemies[Math.floor(Math.random() * state.tlfsAllowedEnemies.length)];
    }
  }
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
  clearAllPools(); // Clear all particle object pools
  startCountdown();
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
  
  clearHealthHud(); // Flush DOM and Map cache cleanly
  
  state.gameState = 'title';
}
