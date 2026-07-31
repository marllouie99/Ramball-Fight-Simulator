// ─────────────────────────────────────────────
// MAHORAGA COMBAT MODULE
// Sword attacks, cleave, divine shout, throw barrage,
// and helper utilities
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame, spawnMahoragaShoutShockwave, spawnMahoragaShoutBurst } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
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
  audioSystem.playSFX(chosenSound, volume);
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
  const isStanceEnabled = CONFIG.mahoraga?.enableCloseQuartersTeleport !== false;
  const isStanceOnCooldown = !isStanceEnabled || (fighter.neutralStanceCooldownTimer || 0) > 0;

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
      audioSystem.playSFX('attack_swordswing', 1.0);
    }

    const range = CONFIG.mahoraga?.swordRange || 110;
    const frontTargets = getFrontRadiusTargets(fighter, range, Math.PI * 1.3);
    if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
      const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y);
      if (dist <= range + fighter.r + opponent.r) {
        frontTargets.push(opponent);
      }
    }
    const damage = CONFIG.mahoraga?.swordDamage || 25;
    for (const t of frontTargets) {
      t.takeDamage(damage, fighter, { isMelee: true });
      if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
      const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);
      t.vx += Math.cos(pushAngle) * 4;
      t.vy += Math.sin(pushAngle) * 4;
    }
    if (frontTargets.length > 0) {
      const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
      // Spawn golden spiky crescent effect for both punches and blade slash attacks!
      spawnAnimePunchImpactFrame(opponent.x, opponent.y, 55, angle, 'gold');
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
    audioSystem.playSFX('attack_swordswing', 1.0);
  }

  // AOE frontal arc damage to ALL targets
  const range = CONFIG.mahoraga?.swordRange || 110;
  const frontTargets = getFrontRadiusTargets(fighter, range, Math.PI * 1.3);
  if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
    const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y);
    if (dist <= range + fighter.r + opponent.r) {
      frontTargets.push(opponent);
    }
  }
  const damage = CONFIG.mahoraga?.swordDamage || 25;
  for (const t of frontTargets) {
    t.takeDamage(damage, fighter, { isMelee: true });
    if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
    const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);
    t.vx += Math.cos(pushAngle) * 4;
    t.vy += Math.sin(pushAngle) * 4;
  }
  if (frontTargets.length > 0) {
    const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    // Spawn golden spiky crescent effect for both punches and blade slash attacks!
    spawnAnimePunchImpactFrame(opponent.x, opponent.y, 55, angle, 'gold');
    spawnSparks(opponent.x, opponent.y, 12, 'silver', '#FFFFFF');
    triggerGlobalScreenShake(5, 8);
  }

  // Sakuga impact visuals on main opponent (only for sword combo hits, not punches)
  const isPunch = (fighter.attackCount % 2 === 0);
  if (!isPunch) {
    fighter.sakugaImpactTimer = 8;
    fighter.sakugaImpactMaxTimer = 8;
    fighter.sakugaImpactX = opponent.x;
    fighter.sakugaImpactY = opponent.y;
    fighter.sakugaImpactAngle = Math.random() * Math.PI * 2;
    fighter.sakugaImpactSeed = Math.random();
  }

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

    // Set up smooth flash-dash travel using the adaptationDashSpeedFrames config
    fighter.dashFromX = oldX;
    fighter.dashFromY = oldY;
    fighter.dashToX = teleX;
    fighter.dashToY = teleY;
    const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
    fighter.adaptationDashTimer = dashFrames;
    fighter.adaptationDashTarget = opponent;
    fighter.adaptationDashIsCounter = false;

    spawnTeleportAfterimages(fighter, oldX, oldY, teleX, teleY, fighter.gunAngle);

    audioSystem.playSFX('skill_dash5', 1.0);
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
  audioSystem.playSFX('attack_swordswing', 1.0);
  audioSystem.playSFX('attack_explosion', 0.6);

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

  audioSystem.playSFX('attack_swordswing', 0.6);
}

/**
 * Execute Divine Shout — AoE shockwave roar.
 */
export function executeShout(fighter, opponent, ownerIndex) {
  const shoutRadius = CONFIG.mahoraga?.shoutRadius || 180;
  const shoutDamage = CONFIG.mahoraga?.shoutDamage || 30;
  const shoutKnockback = CONFIG.mahoraga?.shoutKnockback || 18;

  triggerGlobalScreenShake(10, 20);
  audioSystem.playSFX('attack_explosion', 0.8);
  audioSystem.playSFX('skill_dash3', 0.9);

  // Spawn the improved Concentric Gold/Silver Shockwave and Outward Spark Burst
  spawnMahoragaShoutBurst(fighter.x, fighter.y, shoutRadius);
  spawnImpactFlash(fighter.x, fighter.y, shoutRadius * 0.7, '#FFD700');

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'DIVINE SHOUT!', '#E0E8FF');

  // Damage all enemies (fighters & illusions) within shout radius
  if (state.fighters) {
    const myIndex = state.fighters.indexOf(fighter);
    const myTeam = state.getFighterTeam(myIndex);

    const targetList = [...state.fighters, ...(state.illusions || [])];

    targetList.forEach((f) => {
      if (!f || f === fighter || f.hp <= 0) return;

      // Avoid hitting teammates or friendly illusions
      let isTeammate = false;
      if (state.fighters.includes(f)) {
        const idx = state.fighters.indexOf(f);
        const enemyTeam = state.getFighterTeam(idx);
        isTeammate = myTeam !== null && enemyTeam === myTeam;
      } else if (f.owner) {
        const ownerIdx = state.fighters.indexOf(f.owner);
        const enemyTeam = state.getFighterTeam(ownerIdx);
        isTeammate = myTeam !== null && enemyTeam === myTeam;
      }
      if (isTeammate) return;

      const dist = Math.hypot(fighter.x - f.x, fighter.y - f.y);
      if (dist <= shoutRadius) {
        f.takeDamage(shoutDamage, fighter, { isSkill: true });
        f.applyHitStun(18);

        // Apply brief slow movement debuff
        const slowDur = CONFIG.mahoraga?.shoutSlowDurationFrames || 90;
        const slowMult = CONFIG.mahoraga?.shoutSlowMultiplier || 0.50;
        if (typeof f.applySlow === 'function') {
          f.applySlow(slowDur, slowMult, { isMahoragaShout: true });
        } else {
          f.slowTimer = slowDur;
          f.slowMultiplier = slowMult;
        }

        const pushAngle = Math.atan2(f.y - fighter.y, f.x - fighter.x);
        f.vx += Math.cos(pushAngle) * shoutKnockback;
        f.vy += Math.sin(pushAngle) * shoutKnockback;
      }
    });
  }
}
