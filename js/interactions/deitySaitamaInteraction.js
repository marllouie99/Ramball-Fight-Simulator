import { deitySaitamaConfig } from '../configs/interactions/deitySaitamaConfig.js';
import { CONFIG } from '../core/config.js';
import { audioSystem } from '../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../graphics/particles/sparkEffect.js';
import { pushTrailCap } from '../graphics/particles/visualTrailSystem.js';
import { spawnFloatingText } from '../core/state.js';
import { playSound } from '../systems/soundSystem.js';
import { interactionManager } from './interactionManager.js';

/**
 * Get active configuration for the Deity vs Saitama interaction.
 */
export function getDeitySaitamaConfig() {
  if (typeof CONFIG !== 'undefined' && CONFIG.interactions?.deitySaitama) {
    return CONFIG.interactions.deitySaitama;
  }
  return deitySaitamaConfig;
}

/**
 * Returns true if the target entity is Nameless Deity.
 * @param {Object} target 
 * @returns {boolean}
 */
export function isNamelessDeityEntity(target) {
  if (!target) return false;
  return Boolean(
    target.characterId === 'namelessdeity' ||
    target.characterId === 'nameless_deity' ||
    target.type === 'namelessdeity' ||
    target._def?.id === 'namelessdeity' ||
    (typeof target.name === 'string' && target.name.toLowerCase().includes('nameless'))
  );
}

/**
 * Returns true if the target entity is Saitama.
 * @param {Object} target 
 * @returns {boolean}
 */
export function isSaitamaEntity(target) {
  if (!target) return false;
  return Boolean(
    target.characterId === 'saitama' ||
    target.type === 'saitama' ||
    target._def?.id === 'saitama' ||
    (typeof target.name === 'string' && target.name.toLowerCase().includes('saitama'))
  );
}

/**
 * Checks if a live Saitama enemy is present in the current match against Nameless Deity.
 * @param {Object} deity 
 * @param {Object} opponent 
 * @param {Object} [stateObj] 
 * @returns {boolean}
 */
export function hasSaitamaEnemy(deity, opponent, stateObj) {
  if (opponent && isSaitamaEntity(opponent) && !deity?.isTeammate?.(opponent)) {
    return true;
  }
  if (stateObj && Array.isArray(stateObj.fighters)) {
    return stateObj.fighters.some(f => 
      f && f !== deity &&
      isSaitamaEntity(f) &&
      !deity?.isTeammate?.(f) &&
      (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead))
    );
  }
  return false;
}

/**
 * Checks if Nameless Deity should perform the center rebounce leap on ultimate cast.
 * @param {Object} deity 
 * @param {Object} opponent 
 * @param {Object} [stateObj] 
 * @param {boolean} [bypassRebounce=false] 
 * @returns {boolean}
 */
export function shouldNamelessDeityRebounce(deity, opponent, stateObj, bypassRebounce = false) {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || cfg.enableCenterRebounce === false) return false;
  if (bypassRebounce || deity.isRebouncingToCenter) return false;
  if (!hasSaitamaEnemy(deity, opponent, stateObj)) return false;

  const arena = stateObj?.arena || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
  const centerX = arena ? (arena.x + arena.width / 2) : 400;
  const centerY = arena ? (arena.y + arena.height / 2) : 300;
  const distToCenter = Math.hypot(centerX - deity.x, centerY - deity.y);
  return distToCenter > 15;
}

/**
 * Checks if camera zoom out should be disabled during Nameless Deity ultimate channeling.
 * @param {Object} deity 
 * @param {Array<Object>} fighters 
 * @returns {boolean}
 */
export function shouldDisableCameraZoomForDeity(deity, fighters) {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || !cfg.disableCameraZoomOut) return false;
  if (!Array.isArray(fighters)) return false;

  return fighters.some(f => 
    f && f !== deity &&
    isSaitamaEntity(f) &&
    !deity?.isTeammate?.(f) &&
    (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead))
  );
}

/**
 * Calculates the standoff retreat destination for Saitama when countering Nameless Deity.
 * @param {Object} saitama 
 * @param {Object} deity 
 * @param {Object} [arena] 
 * @param {number} [customRetreatDist] 
 * @returns {{ x: number, y: number }}
 */
export function calculateSaitamaRetreatPosition(saitama, deity, arena, customRetreatDist) {
  const cfg = getDeitySaitamaConfig();
  const retreatDist = customRetreatDist ?? cfg.retreatStandoffDistance ?? 300;

  const dx = saitama.x - deity.x;
  const dy = saitama.y - deity.y;
  const curDist = Math.hypot(dx, dy);
  let awayAngle = curDist > 1 ? Math.atan2(dy, dx) : ((deity.gunAngle || 0) + Math.PI);

  let chosenX = deity.x + Math.cos(awayAngle) * retreatDist;
  let chosenY = deity.y + Math.sin(awayAngle) * retreatDist;

  const targetArena = arena || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
  if (targetArena) {
    const minX = targetArena.x + saitama.r + 20;
    const maxX = targetArena.x + targetArena.width - saitama.r - 20;
    const minY = targetArena.y + saitama.r + 20;
    const maxY = targetArena.y + targetArena.height - saitama.r - 20;

    const isInside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;

    if (!isInside(chosenX, chosenY)) {
      const candidateOffsets = [0.35, -0.35, 0.7, -0.7, 1.0, -1.0, Math.PI / 2, -Math.PI / 2, Math.PI];
      for (const off of candidateOffsets) {
        const candAngle = awayAngle + off;
        const candX = deity.x + Math.cos(candAngle) * retreatDist;
        const candY = deity.y + Math.sin(candAngle) * retreatDist;
        if (isInside(candX, candY)) {
          chosenX = candX;
          chosenY = candY;
          break;
        }
      }
    }
    chosenX = Math.max(minX, Math.min(maxX, chosenX));
    chosenY = Math.max(minY, Math.min(maxY, chosenY));
  }

  return { x: chosenX, y: chosenY };
}

/**
 * Executes the standoff retreat teleportation & trail spawning for Saitama vs Nameless Deity.
 * @param {Object} saitama 
 * @param {Object} deity 
 * @param {Object} [arena] 
 * @param {number} [oldX] 
 * @param {number} [oldY] 
 */
export function executeSaitamaCounterDeity(saitama, deity, arena, oldX = saitama.x, oldY = saitama.y) {
  const cfg = getDeitySaitamaConfig();
  const retreatPos = calculateSaitamaRetreatPosition(saitama, deity, arena);
  saitama.x = retreatPos.x;
  saitama.y = retreatPos.y;
  saitama.vx = 0;
  saitama.vy = 0;
  saitama.knockbackVx = 0;
  saitama.knockbackVy = 0;

  // Spawn subtle fading ghost model skin afterimages along teleport trajectory
  if (!saitama.afterImages) saitama.afterImages = [];
  const counterDist = Math.hypot(saitama.x - oldX, saitama.y - oldY);
  const stepsMax = cfg.retreatAfterimageSteps ?? 3;
  const steps = Math.min(stepsMax, Math.max(1, Math.floor(counterDist / 80)));
  const afterimageDuration = cfg.retreatAfterimageDuration ?? 12;

  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    pushTrailCap(saitama.afterImages, {
      x: oldX + (saitama.x - oldX) * p,
      y: oldY + (saitama.y - oldY) * p,
      r: saitama.r,
      gunAngle: saitama.gunAngle !== undefined ? saitama.gunAngle : (saitama.angle || 0),
      timer: afterimageDuration,
      maxTimer: afterimageDuration,
    }, 6);
  }

  // Teleport SFX & Impact flashes
  const counterDashSFX = CONFIG.saitama?.sounds?.counterDashSFX || 'skill_dash5';
  const counterDashVol = CONFIG.saitama?.soundVolumes?.counterDash ?? 1.0;
  audioSystem.playSFX(counterDashSFX, counterDashVol);

  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(oldX, oldY, 25, '#F5C400');
    spawnImpactFlash(saitama.x, saitama.y, 30, '#FFFFFF');
  }
}

/**
 * Initiates the divine center rebounce glide sequence on Nameless Deity.
 * @param {Object} deity 
 * @param {Object} opponent 
 * @param {Object} [stateObj] 
 * @param {boolean} [bypassRebounce=false] 
 * @returns {boolean}
 */
export function executeDeityCenterRebounce(deity, opponent, stateObj, bypassRebounce = false) {
  if (!shouldNamelessDeityRebounce(deity, opponent, stateObj, bypassRebounce)) {
    return false;
  }

  const arena = stateObj?.arena || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
  const centerX = arena ? (arena.x + arena.width / 2) : 400;
  const centerY = arena ? (arena.y + arena.height / 2) : 300;
  const interactionCfg = getDeitySaitamaConfig();
  const duration = interactionCfg.centerRebounceFrames || 18;

  deity.isRebouncingToCenter = true;
  deity.rebounceTimer = duration;
  deity.rebounceMaxFrames = duration;
  deity.rebounceStartX = deity.x;
  deity.rebounceStartY = deity.y;
  deity.rebounceTargetX = centerX;
  deity.rebounceTargetY = centerY;
  deity.rebounceTargetOpponent = opponent;
  deity.vx = 0;
  deity.vy = 0;
  deity.knockbackVx = 0;
  deity.knockbackVy = 0;

  // Launch VFX & SFX
  if (typeof spawnImpactFlash === 'function') {
    const flashR = interactionCfg.centerArrivalFlashRadius ?? 30;
    spawnImpactFlash(deity.x, deity.y, flashR, '#00F0FF');
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(deity.x, deity.y, 14, '#00F0FF');
  }
  const wingSound = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.sounds?.wingFlap) || 'Assets/Sound Effects/NamelessDeity/WingFlap2.ogg';
  playSound(wingSound, 1.0);
  spawnFloatingText(deity.x, deity.y - 45, 'DIVINE RECENTERING!', '#00F0FF');
  return true;
}

/**
 * Checks if Saitama is actively countering and immune to beam interrupts.
 * @param {Object} target 
 * @returns {boolean}
 */
export function isSaitamaCounterImmuneToDeityBeam(target) {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || !cfg.beamSuperArmor) return false;
  if (!isSaitamaEntity(target)) return false;
  return Boolean(target.isCountering || (target._counterPunchTimer && target._counterPunchTimer > 0));
}

// ─────────────────────────────────────────────────────────────────
// Auto-Register Event Hooks with InteractionManager
// ─────────────────────────────────────────────────────────────────

interactionManager.registerHook('onCounterTeleport', (attacker, target, arena, oldX, oldY) => {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || cfg.enableStandoffRetreat === false) return false;

  if (isSaitamaEntity(attacker) && isNamelessDeityEntity(target)) {
    executeSaitamaCounterDeity(attacker, target, arena, oldX, oldY);
    return true;
  }
  return false;
});

interactionManager.registerHook('onUltimatePreCast', (caster, opponent, stateObj, bypass) => {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || cfg.enableCenterRebounce === false) return false;

  if (isNamelessDeityEntity(caster)) {
    return executeDeityCenterRebounce(caster, opponent, stateObj, bypass);
  }
  return false;
});

interactionManager.registerHook('onBeamHitVictim', (victim, attacker, beamType) => {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false) return false;

  if (isNamelessDeityEntity(attacker) && isSaitamaEntity(victim)) {
    return isSaitamaCounterImmuneToDeityBeam(victim);
  }
  return false;
});

interactionManager.registerHook('onBeamEvade', (victim, attacker, beamData) => {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false || cfg.enableBeamDodge === false) return false;

  if (isNamelessDeityEntity(attacker) && isSaitamaEntity(victim)) {
    if (typeof victim.dodgeBeam === 'function') {
      return victim.dodgeBeam(beamData);
    }
  }
  return false;
});

interactionManager.registerHook('onCameraZoomOverride', (caster, fighters) => {
  const cfg = getDeitySaitamaConfig();
  if (cfg.enabled === false) return false;

  if (isNamelessDeityEntity(caster)) {
    return shouldDisableCameraZoomForDeity(caster, fighters);
  }
  return false;
});
