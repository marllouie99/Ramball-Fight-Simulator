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

/**
 * Gojo Purple Teleport Dodge: When Gojo fires Purple and Mahoraga has adapted,
 * Mahoraga instantly teleports away to a safe distance.
 */
export function gojoPurpleTeleportDodge(fighter, gojo, purpleOrb = null) {
  const fromX = fighter.x;
  const fromY = fighter.y;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const margin = (fighter.r || 25) + 15;

  const orbX = purpleOrb ? purpleOrb.x : (gojo.x || fighter.x);
  const orbY = purpleOrb ? purpleOrb.y : (gojo.y || fighter.y);
  const angleToOrb = Math.atan2(orbY - fighter.y, orbX - fighter.x);
  const purpleDamageRadius = CONFIG.gojo?.purpleRadius || 50;

  const dodgeDist = purpleDamageRadius + (fighter.r || 25) + 80;
  const perpAngleLeft  = angleToOrb + Math.PI / 2;
  const perpAngleRight = angleToOrb - Math.PI / 2;

  let leftX = fighter.x + Math.cos(perpAngleLeft) * dodgeDist;
  let leftY = fighter.y + Math.sin(perpAngleLeft) * dodgeDist;
  let rightX = fighter.x + Math.cos(perpAngleRight) * dodgeDist;
  let rightY = fighter.y + Math.sin(perpAngleRight) * dodgeDist;

  if (arena) {
    leftX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, leftX));
    leftY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, leftY));
    rightX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, rightX));
    rightY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, rightY));
  }

  const leftDistToOrb  = Math.hypot(leftX - orbX, leftY - orbY);
  const rightDistToOrb = Math.hypot(rightX - orbX, rightY - orbY);

  let toX, toY;
  if (leftDistToOrb >= rightDistToOrb) {
    toX = leftX;
    toY = leftY;
  } else {
    toX = rightX;
    toY = rightY;
  }

  // Also check arena corners for the safest landing spot
  if (arena) {
    const corners = [
      { x: arena.x + margin, y: arena.y + margin },
      { x: arena.x + arena.width - margin, y: arena.y + margin },
      { x: arena.x + margin, y: arena.y + arena.height - margin },
      { x: arena.x + arena.width - margin, y: arena.y + arena.height - margin },
    ];
    let bestCorner = null;
    let bestDist = Math.hypot(toX - orbX, toY - orbY);
    for (const c of corners) {
      const d = Math.hypot(c.x - orbX, c.y - orbY);
      if (d > bestDist) {
        bestDist = d;
        bestCorner = c;
      }
    }
    if (bestCorner) {
      toX = bestCorner.x;
      toY = bestCorner.y;
    }
  }

  fighter.dashFromX = fromX;
  fighter.dashFromY = fromY;
  fighter.dashToX = toX;
  fighter.dashToY = toY;
  const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = gojo;
  fighter.adaptationDashIsCounter = false;

  fighter.gojoPurpleDodgeReady = false;

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);
  spawnImpactFlash(fromX, fromY, 40, '#8A2BE2');
  spawnSparks(fromX, fromY, 20, 'arcane', '#8A2BE2');
  spawnImpactFlash(toX, toY, 35, '#8A2BE2');
  audioSystem.playSFX('skill_dash5', 1.0);
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, '⚡ PURPLE DODGED!', '#8A2BE2');
}

/**
 * Gojo Red Teleport Dodge: When Gojo uses Red and Mahoraga has adapted,
 * Mahoraga teleport-dodges away.
 */
export function gojoRedTeleportDodge(fighter, gojo) {
  const fromX = fighter.x;
  const fromY = fighter.y;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const margin = (fighter.r || 25) + 15;

  const angleToGojo = Math.atan2(gojo.y - fighter.y, gojo.x - fighter.x);
  const perpAngle = angleToGojo + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
  const dodgeDist = (CONFIG.gojo?.redEffectRadius || 80) + fighter.r + 60;

  let toX = fighter.x + Math.cos(perpAngle) * dodgeDist;
  let toY = fighter.y + Math.sin(perpAngle) * dodgeDist;

  if (arena) {
    toX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, toX));
    toY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, toY));
  }

  fighter.dashFromX = fromX;
  fighter.dashFromY = fromY;
  fighter.dashToX = toX;
  fighter.dashToY = toY;
  const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = gojo;
  fighter.adaptationDashIsCounter = false;

  fighter.gojoRedDodgeReady = false;

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);
  spawnImpactFlash(fromX, fromY, 40, '#FF1144');
  spawnSparks(fromX, fromY, 20, 'arcane', '#FF1144');
  spawnImpactFlash(toX, toY, 35, '#FF1144');
  audioSystem.playSFX('skill_dash5', 1.0);
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, '⚡ RED DODGED!', '#FF1144');
}

/**
 * Spawn fading afterimage ghosts along a teleport/dash trajectory.
 */
export function spawnTeleportAfterimages(fighter, oldX, oldY, newX, newY, customAngle = null) {
  if (!fighter.adaptationAfterimages) fighter.adaptationAfterimages = [];
  const dist = Math.hypot(newX - oldX, newY - oldY);
  const steps = Math.max(3, Math.floor(dist / 14));
  const lifetime = CONFIG.mahoraga?.afterimageLifetimeFrames || 14;

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
      timer: lifetime - Math.floor(t * 4),
      maxTimer: lifetime
    }, 40);
  }
}

/**
 * Start adaptation flash-dash toward the attacker after wheel click cinematic pause.
 */
export function startAdaptationFlashDash(fighter, attacker) {
  if (!attacker || attacker.isDead || attacker === fighter) return;
  const isInsideDomain = typeof state !== 'undefined' && (state.activeDomain || state.domainActive || (state.fighters && state.fighters.some(f => f && f.domainActive)));
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
  const baseDashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
  const dashFrames = Math.max(1, Math.round(baseDashFrames * speedMult));
  fighter.adaptationDashMaxTimer = dashFrames;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = attacker;
  fighter.adaptationDashIsCounter = true;

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);

  spawnImpactFlash(fromX, fromY, 28, '#E0E0E0');
  spawnSparks(fromX, fromY, 12, 'silver', '#FFFFFF');
  audioSystem.playSFX('skill_dash3', 1.0);
}

/**
 * Sukuna Fuga Teleport Dodge: When Sukuna fires Fuga and Mahoraga has adapted,
 * Mahoraga instantly teleports away to a safe distance.
 */
export function sukunaFugaTeleportDodge(fighter, sukuna, fugaOrb = null) {
  const fromX = fighter.x;
  const fromY = fighter.y;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const margin = (fighter.r || 25) + 15;

  const orbX = fugaOrb ? fugaOrb.x : (sukuna.x || fighter.x);
  const orbY = fugaOrb ? fugaOrb.y : (sukuna.y || fighter.y);
  const angleToOrb = Math.atan2(orbY - fighter.y, orbX - fighter.x);
  const fugaDamageRadius = 140;

  const dodgeDist = fugaDamageRadius + (fighter.r || 25) + 80;
  const perpAngleLeft  = angleToOrb + Math.PI / 2;
  const perpAngleRight = angleToOrb - Math.PI / 2;

  let leftX = fighter.x + Math.cos(perpAngleLeft) * dodgeDist;
  let leftY = fighter.y + Math.sin(perpAngleLeft) * dodgeDist;
  let rightX = fighter.x + Math.cos(perpAngleRight) * dodgeDist;
  let rightY = fighter.y + Math.sin(perpAngleRight) * dodgeDist;

  if (arena) {
    leftX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, leftX));
    leftY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, leftY));
    rightX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, rightX));
    rightY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, rightY));
  }

  const leftDistToOrb  = Math.hypot(leftX - orbX, leftY - orbY);
  const rightDistToOrb = Math.hypot(rightX - orbX, rightY - orbY);

  let toX, toY;
  if (leftDistToOrb >= rightDistToOrb) {
    toX = leftX;
    toY = leftY;
  } else {
    toX = rightX;
    toY = rightY;
  }

  // Also check arena corners for the safest landing spot
  if (arena) {
    const corners = [
      { x: arena.x + margin, y: arena.y + margin },
      { x: arena.x + arena.width - margin, y: arena.y + margin },
      { x: arena.x + margin, y: arena.y + arena.height - margin },
      { x: arena.x + arena.width - margin, y: arena.y + arena.height - margin },
    ];
    let bestCorner = null;
    let bestDist = Math.hypot(toX - orbX, toY - orbY);
    for (const c of corners) {
      const d = Math.hypot(c.x - orbX, c.y - orbY);
      if (d > bestDist) {
        bestDist = d;
        bestCorner = c;
      }
    }
    if (bestCorner) {
      toX = bestCorner.x;
      toY = bestCorner.y;
    }
  }

  fighter.dashFromX = fromX;
  fighter.dashFromY = fromY;
  fighter.dashToX = toX;
  fighter.dashToY = toY;
  const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = sukuna;
  fighter.adaptationDashIsCounter = false;

  fighter.sukunaFugaDodgeReady = false;

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);
  spawnImpactFlash(fromX, fromY, 40, '#FF6F00');
  spawnSparks(fromX, fromY, 20, 'arcane', '#FF6F00');
  spawnImpactFlash(toX, toY, 35, '#FF6F00');
  audioSystem.playSFX('skill_dash5', 1.0);
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, '⚡ FUGA DODGED!', '#FF6F00');
}

/**
 * General Skill Shot Teleport Dodge: When a registered skill shot is fired
 * and Mahoraga has adapted to it, Mahoraga instantly teleports away.
 */
export function generalSkillShotTeleportDodge(fighter, attacker, projectile) {
  if (projectile && (projectile.skillShotId === 'tojiAmbush' || projectile.skillShotId === 'purple' || projectile.isGojoPurple || projectile.isGojoPurpleOrb || projectile.behaviorType === 'gojo_purple')) return;
  const fromX = fighter.x;
  const fromY = fighter.y;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const margin = (fighter.r || 25) + 15;

  const orbX = projectile.x;
  const orbY = projectile.y;
  const angleToOrb = Math.atan2(orbY - fighter.y, orbX - fighter.x);
  const damageRadius = projectile.dodgeRadius || 140;

  const dodgeDist = damageRadius + (fighter.r || 25) + 80;
  let toX, toY;

  // For massive sweeping attacks like lasers, teleporting sideways might still get us caught.
  // Instead, teleport BEHIND the attacker!
  if (damageRadius > 400 && attacker) {
    const distBehind = (attacker.r || 25) + (fighter.r || 25) + 60;
    const angleFromAttacker = Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x);
    // Directly opposite to the angle from attacker to fighter (meaning behind attacker)
    toX = attacker.x - Math.cos(angleFromAttacker) * distBehind;
    toY = attacker.y - Math.sin(angleFromAttacker) * distBehind;

    if (arena) {
      toX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, toX));
      toY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, toY));
    }
  } else {
    const perpAngleLeft  = angleToOrb + Math.PI / 2;
    const perpAngleRight = angleToOrb - Math.PI / 2;

    let leftX = fighter.x + Math.cos(perpAngleLeft) * dodgeDist;
    let leftY = fighter.y + Math.sin(perpAngleLeft) * dodgeDist;
    let rightX = fighter.x + Math.cos(perpAngleRight) * dodgeDist;
    let rightY = fighter.y + Math.sin(perpAngleRight) * dodgeDist;

    if (arena) {
      leftX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, leftX));
      leftY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, leftY));
      rightX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, rightX));
      rightY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, rightY));
    }

    const leftDistToOrb  = Math.hypot(leftX - orbX, leftY - orbY);
    const rightDistToOrb = Math.hypot(rightX - orbX, rightY - orbY);

    if (leftDistToOrb >= rightDistToOrb) {
      toX = leftX;
      toY = leftY;
    } else {
      toX = rightX;
      toY = rightY;
    }

    // Also check arena corners for the safest landing spot
    if (arena) {
      const corners = [
        { x: arena.x + margin, y: arena.y + margin },
        { x: arena.x + arena.width - margin, y: arena.y + margin },
        { x: arena.x + margin, y: arena.y + arena.height - margin },
        { x: arena.x + arena.width - margin, y: arena.y + arena.height - margin },
      ];
      let bestCorner = null;
      let bestDist = Math.hypot(toX - orbX, toY - orbY);
      for (const c of corners) {
        const d = Math.hypot(c.x - orbX, c.y - orbY);
        if (d > bestDist) {
          bestDist = d;
          bestCorner = c;
        }
      }
      if (bestCorner) {
        toX = bestCorner.x;
        toY = bestCorner.y;
      }
    }
  }

  fighter.dashFromX = fromX;
  fighter.dashFromY = fromY;
  fighter.dashToX = toX;
  fighter.dashToY = toY;
  const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
  fighter.adaptationDashTimer = dashFrames;
  fighter.adaptationDashTarget = attacker;
  fighter.adaptationDashIsCounter = false;
  fighter.dodgeIFrames = 20; // Gain complete invincibility for 20 frames!

  const skillId = projectile.skillShotId;
  if (fighter.skillDodgeReady) {
    fighter.skillDodgeReady[skillId] = false;
  }

  // Backwards compatibility resets
  if (skillId === 'purple') {
    fighter.gojoPurpleDodgeReady = false;
  }
  if (skillId === 'divineFlame') {
    fighter.sukunaFugaDodgeReady = false;
  }

  const color = projectile.skillShotColor || '#FFD700';
  const displayName = skillId.toUpperCase().replace('_', ' ');

  spawnTeleportAfterimages(fighter, fromX, fromY, toX, toY);
  spawnImpactFlash(fromX, fromY, 40, color);
  spawnSparks(fromX, fromY, 20, 'arcane', color);
  spawnImpactFlash(toX, toY, 35, color);
  audioSystem.playSFX('skill_dash5', 1.0);
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, `⚡ ${displayName} DODGED!`, color);
}
