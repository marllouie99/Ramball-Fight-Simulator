// ─────────────────────────────────────────────
// MAHORAGA SKILLS MODULE
// Gojo-specific dodge teleports, adaptation flash-dash counter,
// and teleport afterimage generation
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';

function isTeleportDisabled(fighter) {
  if (!fighter) return false;
  if (typeof fighter.isPulledOrDragged === 'function' && fighter.isPulledOrDragged()) return true;
  const isInsideDomain = !fighter.gojoDomainAdapted && !fighter.gojoAdapted?.domain && typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
  );
  if (isInsideDomain || fighter.isTargetOfAmbush) return true;
  if (!fighter.gojoInfinityImmune && fighter.isFrozenByInfinity) return true;
  if (!fighter.gojoDomainAdapted && (fighter.timeStopTimer || 0) > 0) return true;
  if (fighter.isDraggedByGetsuga) return true; // Strictly disable all teleports/dashes while carried by Getsuga Tensho wave even if adapted
  return false;
}

/**
 * Gojo Purple Teleport Dodge (Removed: Mahoraga tanks Purple with 50% damage reduction & vortex immunity instead of teleporting away).
 */
export function gojoPurpleTeleportDodge(fighter, gojo, purpleOrb = null) {
  // Teleport-away removed on adaptation: Mahoraga marches forward and tanks with 50% damage reduction
}

/**
 * Gojo Red Teleport Dodge (Removed: Mahoraga tanks Red with 50% damage reduction instead of teleporting away).
 */
export function gojoRedTeleportDodge(fighter, gojo) {
  // Teleport-away removed on adaptation: Mahoraga marches forward and tanks with 50% damage reduction
}

/**
 * Spawn fading afterimage ghosts along a teleport/dash trajectory.
 */
export function spawnTeleportAfterimages(fighter, oldX, oldY, newX, newY, customAngle = null) {
  if (!fighter.adaptationAfterimages) fighter.adaptationAfterimages = [];
  const dist = Math.hypot(newX - oldX, newY - oldY);
  const steps = Math.max(3, Math.floor(dist / 14));
  const lifetime = CONFIG.mahoraga?.afterimageLifetimeFrames ?? 16;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const stepX = oldX + (newX - oldX) * t;
    const stepY = oldY + (newY - oldY) * t;

    pushTrailCap(fighter.adaptationAfterimages, {
      x: stepX,
      y: stepY,
      fromX: i > 0 ? oldX + (newX - oldX) * ((i - 1) / steps) : oldX,
      fromY: i > 0 ? oldY + (newY - oldY) * ((i - 1) / steps) : oldY,
      toX: stepX,
      toY: stepY,
      gunAngle: customAngle !== null ? customAngle : (fighter.gunAngle || 0),
      timer: lifetime,
      maxTimer: lifetime
    }, 60);
  }
}

/**
 * Start adaptation flash-dash toward the attacker after wheel click cinematic pause.
 */
export function startAdaptationFlashDash(fighter, attacker) {
  if (isTeleportDisabled(fighter) || fighter.isDraggedByGetsuga || (typeof fighter.isPulledOrDragged === 'function' && fighter.isPulledOrDragged())) return;
  if (!attacker || attacker.isDead || attacker === fighter || attacker.isLawnmower || attacker.isUntargetable || attacker.characterId === 'crazydave_lawnmower') return;
  const isInsideDomain = !fighter.gojoDomainAdapted && !fighter.gojoAdapted?.domain && !fighter.domainImmunity && typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
  );
  if (isInsideDomain) return;

  fighter.adaptationPauseTimer = 0;
  fighter.wheelGlowTimer = 0;
  fighter.wheelClickTimer = 0;

  const fromX = fighter.x;
  const fromY = fighter.y;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;

  const angleToMahoraga = Math.atan2(fromY - attacker.y, fromX - attacker.x);
  const behindAngle = angleToMahoraga + Math.PI;
  const offsetDist = attacker.r + fighter.r + 18;

  let toX = attacker.x + Math.cos(behindAngle) * offsetDist;
  let toY = attacker.y + Math.sin(behindAngle) * offsetDist;

  // ARENA BOUNDARY PROTECTION
  if (arena) {
    const minX = arena.x + fighter.r + 5;
    const maxX = arena.x + arena.width - fighter.r - 5;
    const minY = arena.y + fighter.r + 5;
    const maxY = arena.y + arena.height - fighter.r - 5;

    if (toX < minX || toX > maxX || toY < minY || toY > maxY) {
      const centerAngle = Math.atan2(arena.y + arena.height / 2 - attacker.y, arena.x + arena.width / 2 - attacker.x);
      toX = attacker.x + Math.cos(centerAngle + Math.PI * 0.4) * offsetDist;
      toY = attacker.y + Math.sin(centerAngle + Math.PI * 0.4) * offsetDist;

      toX = Math.max(minX, Math.min(maxX, toX));
      toY = Math.max(minY, Math.min(maxY, toY));
    }
  }

  fighter.dashFromX = fromX;
  fighter.dashFromY = fromY;
  fighter.dashToX = toX;
  fighter.dashToY = toY;
  const speedMult = fighter.isInfinityBlitz ? (CONFIG.mahoraga?.infinityBlitzTeleportSpeedMultiplier ?? 0.05) : 1.0;
  const baseDashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames ?? 10;
  const dashFrames = Math.max(1, Math.round(baseDashFrames * speedMult));
  fighter.adaptationDashMaxTimer = dashFrames;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = attacker;
  fighter.adaptationDashIsCounter = true;

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);

  spawnImpactFlash(fromX, fromY, 28, '#E0E0E0');
  const tpSnd = CONFIG.mahoraga?.sounds?.teleportDash || 'skill_dash3';
  const tpVol = CONFIG.mahoraga?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(tpSnd, tpVol);
}

/**
 * Sukuna Fuga Teleport Dodge (Removed: Mahoraga tanks Fuga with 50% damage reduction instead of teleporting away).
 */
export function sukunaFugaTeleportDodge(fighter, sukuna, fugaOrb = null) {
  // Teleport-away removed on adaptation: Mahoraga marches forward and tanks with 50% damage reduction
}

/**
 * General Skill Shot Teleport Dodge (Removed: Mahoraga tanks adapted skill shots with 50% damage reduction instead of teleporting away).
 */
export function generalSkillShotTeleportDodge(fighter, attacker, projectile) {
  // Teleport-away removed on adaptation: Mahoraga marches forward and tanks with 50% damage reduction
}

