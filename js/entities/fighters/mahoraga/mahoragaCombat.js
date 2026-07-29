// ─────────────────────────────────────────────
// MAHORAGA COMBAT MODULE
// Sword attacks, cleave, divine shout, throw barrage,
// and helper utilities
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { playSound } from '../../../systems/soundSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { getBasicAttackSound } from '../../../soundEffects/basicAttackSounds.js';
import { spawnTeleportAfterimages } from './mahoragaSkills.js';

/**
 * Play a random heavy punch sound effect.
 */
export function playRandomHeavyPunchSound(volume = 1.0) {
  const heavyPunches = [
    'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    'Assets/Sound Effects/Attacks/heavypunch3.mp3'
  ];
  const chosenSound = heavyPunches[Math.floor(Math.random() * heavyPunches.length)];
  playSound(chosenSound, volume);
}

/**
 * Helper: Find all enemy targets (fighters, illusions) within a front-facing radius arc.
 * @param {object} fighter - The Mahoraga fighter instance
 * @param {number} maxRangeOffset - Max distance offset beyond Mahoraga's radius
 * @param {number} coneAngle - Frontal cone angle in radians
 * @returns {Array<Object>} Array of target entities in front radius
 */
export function getFrontRadiusTargets(fighter, maxRangeOffset = 75, coneAngle = Math.PI * 0.75) {
  const targets = [];
  if (typeof state === 'undefined' || !state || !state.fighters) return targets;

  const myIndex = state.fighters.indexOf(fighter);
  const myTeam = state.getFighterTeam(myIndex);
  const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

  const candidates = [...state.fighters, ...(state.illusions || [])];
  for (const f of candidates) {
    if (!f || f === fighter || f.hp <= 0 || f.isDead) continue;

    const idx = state.fighters.indexOf(f);
    if (idx !== -1) {
      const enemyTeam = state.getFighterTeam(idx);
      if (myTeam !== null && enemyTeam === myTeam) continue;
    } else if (f.owner) {
      const ownerIdx = state.fighters.indexOf(f.owner);
      const ownerTeam = state.getFighterTeam(ownerIdx);
      if (myTeam !== null && ownerTeam === myTeam) continue;
    }

    const dx = f.x - fighter.x;
    const dy = f.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    const maxHitDist = fighter.r + f.r + maxRangeOffset;

    if (dist <= maxHitDist) {
      const angleToEnemy = Math.atan2(dy, dx);
      let diff = angleToEnemy - facingAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) <= coneAngle / 2) {
        targets.push(f);
      }
    }
  }

  return targets;
}

/**
 * Perform the neutral melee attack sequence — alternating sword chops & left off-hand punches,
 * with teleportation every N attacks.
 */
export function performMeleeAttack(fighter, opponent) {
  fighter.vx = 0;
  fighter.vy = 0;

  const attackInterval = CONFIG.mahoraga?.neutralAttackInterval || 20;
  const attacksPerTeleport = CONFIG.mahoraga?.neutralAttacksPerTeleport || 2;
  const teleportDelay = CONFIG.mahoraga?.neutralTeleportDelay || 12;
  const teleportDist = CONFIG.mahoraga?.neutralTeleportDistance || 55;

  // Track stance duration window and cooldown
  const isStanceOnCooldown = (fighter.neutralStanceCooldownTimer || 0) > 0;

  // Initialize stance tracking timers on first entry
  if (!fighter.neutralStanceTimer && !isStanceOnCooldown) {
    fighter.neutralStanceTimer = CONFIG.mahoraga?.neutralStanceDurationFrames || 180;
    fighter.neutralStanceAttackCount = 0;
  }

  // If stance expired or on cooldown, do NOT start new stance (just single attacks)
  if (isStanceOnCooldown) {
    // Single attack outside of stance (basic sword swing)
    fighter.swordCooldown = attackInterval;
    fighter.attackCount = (fighter.attackCount || 0) + 1;
    if (fighter.attackCount % 2 === 0) {
      fighter.leftPunchTimer = 18;
      fighter.leftPunchMaxTimer = 18;
      playRandomHeavyPunchSound(1.0);
    } else {
      fighter.swordCombo = (fighter.swordCombo || 0) + 1;
      fighter.punchAnimTimer = 18;
      fighter.punchAnimMaxTimer = 18;
      playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
    }

    const frontTargets = getFrontRadiusTargets(fighter, CONFIG.mahoraga?.swordRange || 110, Math.PI * 1.3);
    if (opponent && !frontTargets.includes(opponent)) frontTargets.push(opponent);
    const damage = CONFIG.mahoraga?.swordDamage || 25;
    for (const t of frontTargets) {
      t.takeDamage(damage, fighter, { isMelee: true });
      if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
      const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);
      t.vx += Math.cos(pushAngle) * 4;
      t.vy += Math.sin(pushAngle) * 4;
    }
    if (frontTargets.length > 0) {
      spawnImpactFlash(opponent.x, opponent.y, 35, '#FFFFFF');
      spawnSparks(opponent.x, opponent.y, 12, 'silver', '#FFFFFF');
      triggerGlobalScreenShake(5, 8);
    }
    return;
  }

  // INSIDE ACTIVE STANCE: Attack-Teleport loop
  fighter.swordCooldown = attackInterval;
  fighter.neutralStanceAttackCount = (fighter.neutralStanceAttackCount || 0) + 1;
  fighter.attackCount = (fighter.attackCount || 0) + 1;

  // Alternating sword chop vs left fist punch
  if (fighter.attackCount % 2 === 0) {
    fighter.leftPunchTimer = 18;
    fighter.leftPunchMaxTimer = 18;
    playRandomHeavyPunchSound(1.0);
  } else {
    fighter.swordCombo = (fighter.swordCombo || 0) + 1;
    fighter.punchAnimTimer = 18;
    fighter.punchAnimMaxTimer = 18;
    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
  }

  // AOE frontal arc damage to ALL targets
  const frontTargets = getFrontRadiusTargets(fighter, CONFIG.mahoraga?.swordRange || 110, Math.PI * 1.3);
  if (opponent && !frontTargets.includes(opponent)) frontTargets.push(opponent);
  const damage = CONFIG.mahoraga?.swordDamage || 25;
  for (const t of frontTargets) {
    t.takeDamage(damage, fighter, { isMelee: true });
    if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
    const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);
    t.vx += Math.cos(pushAngle) * 4;
    t.vy += Math.sin(pushAngle) * 4;
  }
  if (frontTargets.length > 0) {
    spawnImpactFlash(opponent.x, opponent.y, 35, '#FFFFFF');
    spawnSparks(opponent.x, opponent.y, 12, 'silver', '#FFFFFF');
    triggerGlobalScreenShake(5, 8);
  }

  // Sakuga impact visuals on main opponent
  fighter.sakugaImpactTimer = 8;
  fighter.sakugaImpactMaxTimer = 8;
  fighter.sakugaImpactX = opponent.x;
  fighter.sakugaImpactY = opponent.y;
  fighter.sakugaImpactAngle = Math.random() * Math.PI * 2;
  fighter.sakugaImpactSeed = Math.random();

  // Teleport after every N attacks
  if (fighter.neutralStanceAttackCount >= attacksPerTeleport) {
    fighter.neutralStanceAttackCount = 0;

    const oldX = fighter.x;
    const oldY = fighter.y;

    // Teleport behind opponent
    const approachAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    const backAngle = approachAngle + Math.PI + (Math.random() - 0.5) * 1.0;
    const teleDist = fighter.r + opponent.r + teleportDist;

    let teleX = opponent.x + Math.cos(backAngle) * teleDist;
    let teleY = opponent.y + Math.sin(backAngle) * teleDist;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (arena) {
      teleX = Math.max(arena.x + fighter.r + 5, Math.min(arena.x + arena.width - fighter.r - 5, teleX));
      teleY = Math.max(arena.y + fighter.r + 5, Math.min(arena.y + arena.height - fighter.r - 5, teleY));
    }

    fighter.x = teleX;
    fighter.y = teleY;
    fighter.aim(opponent);
    fighter.vx = 0;
    fighter.vy = 0;

    spawnTeleportAfterimages(fighter, oldX, oldY, fighter.x, fighter.y, fighter.gunAngle);

    playSound('Assets/Sound Effects/Skills/dash5.mp3', 1.0);
    spawnImpactFlash(fighter.x, fighter.y, 25, 'silver');

    // Post-teleport cooldown delay
    fighter.swordCooldown = teleportDelay;
  }
}

/**
 * Execute Cleave — Sword of Extermination AoE frontal arc.
 */
export function executeCleave(fighter, opponent) {
  triggerGlobalScreenShake(8, 15);
  playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
  playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.6);

  const cleaveRadius = CONFIG.mahoraga?.cleaveRadius || 150;
  const damage = CONFIG.mahoraga?.cleaveDamage || 40;

  const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const arcX = fighter.x + Math.cos(facingAngle) * (cleaveRadius * 0.4);
  const arcY = fighter.y + Math.sin(facingAngle) * (cleaveRadius * 0.4);

  spawnImpactFlash(arcX, arcY, cleaveRadius, 'silver');
  spawnMeleeClashShockwave(arcX, arcY, cleaveRadius * 1.2, 'mahoraga');

  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    spawnSparks(fighter.x + Math.cos(angle) * cleaveRadius * 0.5, fighter.y + Math.sin(angle) * cleaveRadius * 0.5, 5, 'gold', '#F5F5DC');
  }

  const frontTargets = getFrontRadiusTargets(fighter, cleaveRadius, Math.PI * 1.0);
  if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
    const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y);
    if (dist <= cleaveRadius + fighter.r + opponent.r) {
      frontTargets.push(opponent);
    }
  }

  for (const target of frontTargets) {
    target.takeDamage(damage, fighter, { isMelee: true });
    if (typeof target.applyHitStun === 'function') target.applyHitStun(20);
    const pushAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    target.vx += Math.cos(pushAngle) * 20;
    target.vy += Math.sin(pushAngle) * 20;
  }
}

/**
 * Shoot — fire a cursed energy projectile (throw barrage).
 */
export function shootBladeBarrage(fighter, ownerIndex) {
  if (!projectileSystem) return;

  const throwDamage = CONFIG.mahoraga?.throwDamage || 14;
  const throwSpeed = CONFIG.mahoraga?.throwSpeed || 25;

  const spreadAngle = (Math.random() - 0.5) * (CONFIG.mahoraga?.throwSpreadAngle || 0.28);
  const customAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : 0) + spreadAngle;

  const throwVisuals = ['mahoragaBasaltMonolith', 'mahoragaRuinConcrete', 'mahoragaLavaRubble'];
  const visual = throwVisuals[Math.floor(Math.random() * throwVisuals.length)];

  projectileSystem.fireProjectile(
    fighter,
    ownerIndex,
    throwDamage,
    false,
    throwSpeed,
    false,
    visual,
    undefined,
    undefined,
    customAngle
  );

  playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
}

/**
 * Execute Divine Shout — AoE shockwave roar.
 */
export function executeShout(fighter, opponent, ownerIndex) {
  const shoutRadius = CONFIG.mahoraga?.shoutRadius || 180;
  const shoutDamage = CONFIG.mahoraga?.shoutDamage || 30;
  const shoutKnockback = CONFIG.mahoraga?.shoutKnockback || 18;

  triggerGlobalScreenShake(10, 20);
  playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.8);
  playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);

  spawnMeleeClashShockwave(fighter.x, fighter.y, shoutRadius, 'silver');
  spawnImpactFlash(fighter.x, fighter.y, shoutRadius * 0.7, '#E0E0E0');

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dist = shoutRadius * 0.4;
    spawnSparks(
      fighter.x + Math.cos(angle) * dist,
      fighter.y + Math.sin(angle) * dist,
      4, 'silver', '#FFFFFF'
    );
  }

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'DIVINE SHOUT!', '#E0E8FF');

  // Damage all enemies within shout radius
  if (state.fighters) {
    const myIndex = state.fighters.indexOf(fighter);
    const myTeam = state.getFighterTeam(myIndex);

    state.fighters.forEach((f, idx) => {
      if (!f || f === fighter || f.hp <= 0) return;
      const enemyTeam = state.getFighterTeam(idx);
      if (myTeam !== null && enemyTeam === myTeam) return;

      const dist = Math.hypot(fighter.x - f.x, fighter.y - f.y);
      if (dist <= shoutRadius) {
        f.takeDamage(shoutDamage, fighter, { isSkill: true });
        f.applyHitStun(18);

        const pushAngle = Math.atan2(f.y - fighter.y, f.x - fighter.x);
        f.vx += Math.cos(pushAngle) * shoutKnockback;
        f.vy += Math.sin(pushAngle) * shoutKnockback;
      }
    });
  }
}
