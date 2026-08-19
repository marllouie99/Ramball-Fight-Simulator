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
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
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
    const dz = (f.z || 0) - (fighter.z || 0);
    const dist = Math.hypot(dx, dy, dz);
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
  const isInsideDomain = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
  );

  const isCaughtInBeam = (
    (!fighter.adaptedPureLoveBeam && (fighter.caughtInPureLoveBeam || (fighter.pureLoveBeamTimer || 0) > 0 || (fighter.pureLoveBeamRecoveryTimer || 0) > 0)) ||
    fighter.isCaughtInPurple || (fighter.purpleHitTimer || 0) > 0 ||
    (!fighter.adaptedGenosBeam && ((fighter.caughtInGenosBeamTimer || 0) > 0 || fighter.caughtInGenosFlurry))
  );

  let isParalyzed = isInsideDomain || (fighter.timeStopTimer || 0) > 0 || isCaughtInBeam;
  if (isParalyzed) {
    const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
    const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.075;
    const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.60;
    const ccTenacity = Math.min(maxCcTenacity, totalStages * ccTenacityMult);
    const inMeleeRange = opponent && Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y) < (fighter.r + opponent.r + (CONFIG.mahoraga?.swordRange ?? 110));
    
    if (ccTenacity > 0 && inMeleeRange) {
      isParalyzed = false; // Allow attacking under CC!
    }
  }

  if (isParalyzed) {
    fighter.neutralStanceTimer = 0;
    fighter.adaptationDashTimer = 0;
    return;
  }

  if (opponent && fighter.neutralStanceTimer > 0) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dz = (opponent.z || 0) - (fighter.z || 0);
    const dist = Math.hypot(dx, dy, dz);
    const maxReach = fighter.r + opponent.r + (CONFIG.mahoraga?.swordRange ?? 20);

    if (dist > maxReach) {
      return; // Stop/cancel stance attacks if enemy gets out of range
    }
  }

  const attackInterval = CONFIG.mahoraga?.neutralAttackInterval ?? 15;
  const attacksPerTeleport = CONFIG.mahoraga?.neutralAttacksPerTeleport ?? 3;
  const teleportDelay = CONFIG.mahoraga?.neutralTeleportDelay ?? 5;
  const teleportDist = CONFIG.mahoraga?.neutralTeleportDistance ?? 100;

  // Track stance duration window and cooldown
  const isStanceEnabled = CONFIG.mahoraga?.enableCloseQuartersTeleport !== false;
  const isStanceOnCooldown = !isStanceEnabled || (fighter.neutralStanceCooldownTimer || 0) > 0;

  // Initialize stance tracking timers when entering stance
  if ((!fighter.neutralStanceTimer || fighter.neutralStanceTimer <= 0) && !isStanceOnCooldown) {
    fighter.neutralStanceTimer = CONFIG.mahoraga?.neutralStanceDurationFrames ?? 200;
    fighter.neutralStanceAttackCount = 0;
  }

  // If stance expired or on cooldown, do NOT start new stance (just single attacks)
  if (isStanceOnCooldown) {
    // Single attack outside of stance (basic sword swing)
    fighter.swordCooldown = attackInterval;
    fighter.attackCount = (fighter.attackCount || 0) + 1;
    if (fighter.attackCount % 5 === 0) {
      fighter.leftPunchTimer = 18;
      fighter.leftPunchMaxTimer = 18;
      playRandomHeavyPunchSound(1.0);
    } else {
      fighter.swordCombo = (fighter.swordCombo || 0) + 1;
      fighter.punchAnimTimer = 18;
      fighter.punchAnimMaxTimer = 18;
      audioSystem.playSFX('attack_swordswing', 1.0);
    }

    const range = CONFIG.mahoraga?.swordRange ?? 20;
    const frontTargets = getFrontRadiusTargets(fighter, range, Math.PI * 1.3);
    if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
      const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y, (opponent.z || 0) - (fighter.z || 0));
      if (dist <= range + fighter.r + opponent.r) {
        frontTargets.push(opponent);
      }
    }
    const damage = CONFIG.mahoraga?.swordDamage ?? 15;
    const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
    const knockbackChance = Math.min(0.65, 0.40 + totalStages * 0.04);
    const isPunch = (fighter.attackCount % 5 === 0);
    const rollKnockback = isPunch && (Math.random() < knockbackChance);

    for (const t of frontTargets) {
      if (typeof t.takeDamage === 'function') {
        t.takeDamage(damage, fighter, { isMelee: true });
      }
      const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);

      if (rollKnockback) {
        const kbForce = CONFIG.mahoraga?.heavyPunchKnockbackForce ?? 18.0;
        t.vx = (t.vx || 0) + Math.cos(pushAngle) * kbForce;
        t.vy = (t.vy || 0) + Math.sin(pushAngle) * kbForce;
        t.x += Math.cos(pushAngle) * (kbForce * 0.35);
        t.y += Math.sin(pushAngle) * (kbForce * 0.35);
        if (typeof t.applyHitStun === 'function') t.applyHitStun(16);
        spawnFloatingText(t.x, t.y - (t.r || 20) - 22, 'HEAVY PUNCH KNOCKBACK!', '#FFD700');
        triggerGlobalScreenShake(9, 14);
      } else {
        t.vx += Math.cos(pushAngle) * 4;
        t.vy += Math.sin(pushAngle) * 4;
        if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
      }

      if (state && state.arena) {
        const minX = state.arena.x + (t.r || 20);
        const maxX = state.arena.x + state.arena.width - (t.r || 20);
        const minY = state.arena.y + (t.r || 20);
        const maxY = state.arena.y + state.arena.height - (t.r || 20);
        t.x = Math.max(minX, Math.min(maxX, t.x));
        t.y = Math.max(minY, Math.min(maxY, t.y));
      }
    }
    if (frontTargets.length > 0) {
      const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
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

  // Sword of Extermination blade swings during Close-Quarters Attack-Teleport Stance (86% sword swings!)
  if (fighter.attackCount % 7 === 0) {
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
  const range = CONFIG.mahoraga?.swordRange ?? 20;
  const frontTargets = getFrontRadiusTargets(fighter, range, Math.PI * 1.3);
  if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
    const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y, (opponent.z || 0) - (fighter.z || 0));
    if (dist <= range + fighter.r + opponent.r) {
      frontTargets.push(opponent);
    }
  }
  const damage = CONFIG.mahoraga?.swordDamage ?? 15;
  const totalStagesStance = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const knockbackChanceStance = Math.min(0.65, 0.40 + totalStagesStance * 0.04);
  const isPunchStance = (fighter.attackCount % 7 === 0);
  const rollKnockbackStance = isPunchStance && (Math.random() < knockbackChanceStance);

  for (const t of frontTargets) {
    if (typeof t.takeDamage === 'function') {
      t.takeDamage(damage, fighter, { isMelee: true });
    }
    const pushAngle = Math.atan2(t.y - fighter.y, t.x - fighter.x);

    if (rollKnockbackStance) {
      const kbForce = CONFIG.mahoraga?.heavyPunchKnockbackForce ?? 18.0;
      t.vx = (t.vx || 0) + Math.cos(pushAngle) * kbForce;
      t.vy = (t.vy || 0) + Math.sin(pushAngle) * kbForce;
      t.x += Math.cos(pushAngle) * (kbForce * 0.35);
      t.y += Math.sin(pushAngle) * (kbForce * 0.35);
      if (typeof t.applyHitStun === 'function') t.applyHitStun(16);
      spawnFloatingText(t.x, t.y - (t.r || 20) - 22, 'HEAVY PUNCH KNOCKBACK!', '#FFD700');
      triggerGlobalScreenShake(9, 14);
    } else {
      t.vx += Math.cos(pushAngle) * 4;
      t.vy += Math.sin(pushAngle) * 4;
      if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
    }

    if (state && state.arena) {
      const minX = state.arena.x + (t.r || 20);
      const maxX = state.arena.x + state.arena.width - (t.r || 20);
      const minY = state.arena.y + (t.r || 20);
      const maxY = state.arena.y + state.arena.height - (t.r || 20);
      t.x = Math.max(minX, Math.min(maxX, t.x));
      t.y = Math.max(minY, Math.min(maxY, t.y));
    }
  }
  if (frontTargets.length > 0) {
    const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    // Spawn golden spiky crescent effect for both punches and blade slash attacks!
    spawnAnimePunchImpactFrame(opponent.x, opponent.y, 55, angle, 'gold');
    spawnSparks(opponent.x, opponent.y, 12, 'silver', '#FFFFFF');
    triggerGlobalScreenShake(5, 8);
  }

  // Sakuga impact visuals on main opponent (only for sword combo hits, not punches)
  const isPunch = (fighter.attackCount % 5 === 0);
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
    const isBeamTeleportDisabled = (fighter.caughtInPureLoveBeam || (fighter.pureLoveBeamRecoveryTimer || 0) > 0) && !fighter.adaptedPureLoveBeam;
    if (isBeamTeleportDisabled) {
      fighter.neutralStanceAttackCount = 0;
      return; // Disable teleportation while caught in beam before adapting!
    }
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
    const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames ?? 10;
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
  audioSystem.playSFX('attack_swordswing', 0.9);
  fighter.punchAnimTimer = 18;
  fighter.punchAnimMaxTimer = 18;
  fighter.swordCombo = (fighter.swordCombo || 0) + 1;
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'WORLD CLEAVE!', '#FFD700');

  const cleaveRadius = CONFIG.mahoraga?.cleaveRadius ?? 150;
  const damage = CONFIG.mahoraga?.cleaveDamage ?? 40;

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

  const throwDamage = CONFIG.mahoraga?.throwDamage ?? 14;
  const throwSpeed = CONFIG.mahoraga?.throwSpeed ?? 20;

  const spreadAngle = (Math.random() - 0.5) * (CONFIG.mahoraga?.throwSpreadAngle || 0.28);
  const customAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : 0) + spreadAngle;

  const throwVisuals = ['mahoragaBasaltMonolith', 'mahoragaRuinConcrete', 'mahoragaLavaRubble'];
  const visual = throwVisuals[Math.floor(Math.random() * throwVisuals.length)];

  const proj = projectileSystem.fireProjectile(
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

  if (proj) {
    proj.isMahoragaThrow = true;
    proj.isAdaptableSkillShot = true;
    proj.skillShotId = 'throw';
    proj.skillShotColor = '#8B4513';
  }

  audioSystem.playSFX('attack_swordswing', 0.35);
}

/**
 * Level 8 Transformed Throw Skill: Wall Slam & Supersonic Dash Execute Combo.
 */
export function initiateLevel8WallSlam(fighter, opponent) {
  if (!opponent || opponent.hp <= 0 || opponent.isDead) return;
  if (fighter.isWallSlamActive || (fighter.throwCooldown || 0) > 0) return;

  // Block initiation if Mahoraga is caught inside Gojo's active Hollow Purple
  const activeOrbs = (projectileSystem && projectileSystem.projectiles)
    ? projectileSystem.projectiles.filter(p => p && (p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple' || p.skillShotId === 'purple') && (p.life || 0) > 0)
    : [];
  for (const orb of activeOrbs) {
    const purpleR = CONFIG.gojo?.purpleRadius || 140;
    const distSq = (fighter.x - orb.x) ** 2 + (fighter.y - orb.y) ** 2;
    if (distSq <= (purpleR + fighter.r) ** 2) {
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, 'BLOCKED BY PURPLE!', '#FF3D00');
      }
      return; // Block cast!
    }
  }

  // Also block cast if frozen, stunned, or time-stopped
  const isFrozen = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0) || fighter.isTargetOfAmbush ||
                   (fighter.electricStunTimer > 0) || (fighter.dubstepStunTimer > 0) || (fighter.isFrozenByInfinity);
  if (isFrozen) return;

  fighter.isWallSlamActive = true;
  fighter.wallSlamPhase = 'grab';
  fighter.wallSlamTimer = 0;
  fighter.wallSlamTarget = opponent;
  fighter.throwCooldown = CONFIG.mahoraga?.throwCooldown ?? 600;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, '⚡ LEVEL 8 WALL SLAM!', '#FFEE58');
  audioSystem.playSFX('attack_fleshhit', 0.9);
}

export function updateLevel8WallSlam(fighter, opponent, ownerIndex, arena) {
  const target = fighter.wallSlamTarget || opponent;

  const isInterrupted = (
    fighter.isCaughtInPurple || (fighter.purpleHitTimer || 0) > 0 ||
    (!fighter.adaptedPureLoveBeam && (fighter.caughtInPureLoveBeam || (fighter.pureLoveBeamRecoveryTimer || 0) > 0)) ||
    (!fighter.adaptedGenosBeam && ((fighter.caughtInGenosBeamTimer || 0) > 0 || fighter.caughtInGenosFlurry))
  );

  if (isInterrupted || !target || target.hp <= 0 || target.isDead) {
    if (target) {
      target.isGrabbedByMahoraga = false;
      target.z = 0;
    }
    fighter.isWallSlamActive = false;
    fighter.wallSlamPhase = null;
    fighter.wallSlamTimer = 0;
    fighter.throwCooldown = 180;
    if (isInterrupted) {
      spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, 'INTERRUPTED!', '#FF3D00');
    }
    return;
  }

  const arenaBounds = arena || CONFIG.arena || { x: 50, y: 50, width: 1100, height: 700 };
  fighter.wallSlamTimer = (fighter.wallSlamTimer || 0) + 1;

  const margin = Math.max(fighter.r, target.r) + 14;
  const minX = arenaBounds.x + margin;
  const maxX = arenaBounds.x + (arenaBounds.width || arenaBounds.w || 1100) - margin;
  const minY = arenaBounds.y + margin;
  const maxY = arenaBounds.y + (arenaBounds.height || arenaBounds.h || 700) - margin;

  // ── PHASE 1: IMPALE & LIFT ──
  if (fighter.wallSlamPhase === 'grab') {
    if (fighter.wallSlamTimer === 1) {
      // Snapshot target position and angle to prevent circular feedback drift
      fighter.wallSlamGrabStartX = target.x;
      fighter.wallSlamGrabStartY = target.y;
      fighter.wallSlamGrabAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);

      // Play lunge dash sound at start of grab lunge
      audioSystem.playSFX('skill_dash5', 0.9);

      // Clear target's active projectiles (like Gojo's Blue, Red, Purple) to hide all active attack visual effects
      if (state.projectiles) {
        const targetIndex = state.fighters ? state.fighters.indexOf(target) : -1;
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          if (p && p.ownerIndex === targetIndex && (p.isGojoBlue || p.isGojoRed || p.isGojoPurple || p.isGojoPurpleOrb)) {
            if (p.pixiSprite && p.pixiSprite.parent) {
              p.pixiSprite.parent.removeChild(p.pixiSprite);
            }
            state.projectiles.splice(i, 1);
          }
        }
      }
    }
    
    if (fighter.wallSlamTimer === 12) {
      // Play backstab sound upon contact/impale
      audioSystem.playSFX('skill_backstab', 1.0);
      spawnFloatingText(target.x, target.y - target.r - 28, '⚔️ IMPALED!', '#FFEE58');
      spawnImpactFlash(target.x, target.y, 45, '#FF3333');
      spawnSparks(target.x, target.y, 15, 'crimsonSniper', '#FFFFFF');
    }
    
    const angle = fighter.wallSlamGrabAngle !== undefined ? fighter.wallSlamGrabAngle : Math.atan2(target.y - fighter.y, target.x - fighter.x);
    fighter.aim({ x: target.x, y: target.y });

    const startX = fighter.wallSlamGrabStartX;
    const startY = fighter.wallSlamGrabStartY;
    const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;
    const grabDist = 140; // Mahoraga lunges from this distance

    const shoulderOffsetX = Math.cos(angle + Math.PI / 2) * (fighter.r * 0.20);
    const shoulderOffsetY = Math.sin(angle + Math.PI / 2) * (fighter.r * 0.20);

    // Calculate Mahoraga's final destination where the sword tip will touch the target's starting position
    const endX = startX - Math.cos(angle) * (fighter.r + target.r + 32) - shoulderOffsetX;
    const endY = startY - Math.sin(angle) * (fighter.r + target.r + 32) - shoulderOffsetY;

    if (fighter.wallSlamTimer <= 12) {
      // 1. Thrust/Lunge sub-phase: Mahoraga lunges forward; target remains completely still at start position
      const p = Math.min(1.0, fighter.wallSlamTimer / 12);
      fighter.x = Math.max(minX, Math.min(maxX, endX - Math.cos(angle) * (grabDist * (1 - p))));
      fighter.y = Math.max(minY, Math.min(maxY, endY - Math.sin(angle) * (grabDist * (1 - p))));

      // Play dynamic forward sword thrust swing (comboIndex 0, which corresponds to swordCombo = 3)
      fighter.swordCombo = 3;
      fighter.punchAnimMaxTimer = 12;
      fighter.punchAnimTimer = 12 - fighter.wallSlamTimer; // Ticks down from 12 to 0 to play swing

      target.x = startX;
      target.y = startY;
      target.z = 0;
    } else {
      // 2. Lift sub-phase: Mahoraga reaches target, pins them to sword tip, and hoists them into the air
      fighter.x = Math.max(minX, Math.min(maxX, endX));
      fighter.y = Math.max(minY, Math.min(maxY, endY));

      // Lock the sword in its fully-extended thrust pose
      fighter.swordCombo = 3;
      fighter.punchAnimMaxTimer = 12;
      fighter.punchAnimTimer = 1; // Frozen at peak extension

      target.x = Math.max(minX, Math.min(maxX, fighter.x + Math.cos(angle) * (fighter.r + target.r + 32) + shoulderOffsetX));
      target.y = Math.max(minY, Math.min(maxY, fighter.y + Math.sin(angle) * (fighter.r + target.r + 32) + shoulderOffsetY));

      const liftProgress = Math.min(1.0, (fighter.wallSlamTimer - 12) / (holdFrames - 12));
      target.z = liftProgress * (CONFIG.mahoraga?.wallSlamImpaleLiftHeight ?? 35);
    }

    target.vx = 0;
    target.vy = 0;
    target.isGrabbedByMahoraga = true;
    if (typeof target.applyHitStun === 'function') target.applyHitStun(20);

    if (fighter.wallSlamTimer >= holdFrames) { // Hold completed
      fighter.wallSlamPhase = 'punch'; 
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 1.5: PUNCH & LAUNCH ──
  else if (fighter.wallSlamPhase === 'punch') {
    const angle = fighter.wallSlamGrabAngle !== undefined ? fighter.wallSlamGrabAngle : Math.atan2(target.y - fighter.y, target.x - fighter.x);
    
    // KEEP sword frozen in extended thrust pose while other hand punches!
    fighter.swordCombo = 3;
    fighter.punchAnimMaxTimer = 12;
    fighter.punchAnimTimer = 1;
    
    if (fighter.wallSlamTimer === 1) {
      // Trigger massive left-hand punch!
      fighter.leftPunchTimer = 25;
      fighter.leftPunchMaxTimer = 25;
      
      spawnFloatingText(target.x, (target.y - (target.z || 0)) - target.r - 28, '💥 SMASH!', '#FFEE58');
      spawnAnimePunchImpactFrame(target.x, target.y, 60, angle, 'gold');
      spawnImpactFlash(target.x, target.y, 60, '#FFEE58');
      triggerGlobalScreenShake(12, 15);
      audioSystem.playSFX('attack_fleshhit', 1.0);
    }
    
    // Keep target locked during the first few frames of the punch hitpause
    const shoulderOffsetX = Math.cos(angle + Math.PI / 2) * (fighter.r * 0.20);
    const shoulderOffsetY = Math.sin(angle + Math.PI / 2) * (fighter.r * 0.20);
    target.x = Math.max(minX, Math.min(maxX, fighter.x + Math.cos(angle) * (fighter.r + target.r + 15) + shoulderOffsetX));
    target.y = Math.max(minY, Math.min(maxY, fighter.y + Math.sin(angle) * (fighter.r + target.r + 15) + shoulderOffsetY));
    target.vx = 0;
    target.vy = 0;
    target.isGrabbedByMahoraga = true;
    if (typeof target.applyHitStun === 'function') target.applyHitStun(20);

    const hitpause = CONFIG.mahoraga?.wallSlamPunchHitpause ?? 15;
    if (fighter.wallSlamTimer >= hitpause) { // After frames of punch hitpause, throw them!
      fighter.wallSlamPhase = 'throw';
      fighter.wallSlamTimer = 0;
      target.isGrabbedByMahoraga = false;
      target.z = 0; // Drop back to ground for the wall slam

      // Calculate distances to left, right, top, and bottom walls to find the farthest wall
      const distLeft = target.x - minX;
      const distRight = maxX - target.x;
      const distTop = target.y - minY;
      const distBottom = maxY - target.y;

      let wallAngle = angle; // Fallback to lunge direction if check fails
      const maxDist = Math.max(distLeft, distRight, distTop, distBottom);
      if (maxDist === distLeft) {
        wallAngle = Math.PI; // Throw to the far left wall
      } else if (maxDist === distRight) {
        wallAngle = 0;       // Throw to the far right wall
      } else if (maxDist === distTop) {
        wallAngle = -Math.PI / 2; // Throw to the far top wall
      } else {
        wallAngle = Math.PI / 2;  // Throw to the far bottom wall
      }

      fighter.aim({ x: target.x + Math.cos(wallAngle) * 100, y: target.y + Math.sin(wallAngle) * 100 });

      // Hurl opponent at supersonic throw speed towards the chosen wall
      const throwSpeed = CONFIG.mahoraga?.wallSlamThrowSpeed ?? 45.0;
      fighter.wallSlamTargetVelX = Math.cos(wallAngle) * throwSpeed;
      fighter.wallSlamTargetVelY = Math.sin(wallAngle) * throwSpeed;

      triggerGlobalScreenShake(8, 14);
      audioSystem.playSFX('skill_dash5', 1.0);
    }
  }
  // ── PHASE 2: SUPERSONIC WALL THROW ──
  else if (fighter.wallSlamPhase === 'throw') {
    target.isGrabbedByMahoraga = false;
    
    // Launch target at supersonic velocity toward arena wall
    target.x += fighter.wallSlamTargetVelX * 0.5;
    target.y += fighter.wallSlamTargetVelY * 0.5;

    // Per-frame strict clamping to prevent target from ever clipping outside arena boundaries
    target.x = Math.max(minX, Math.min(maxX, target.x));
    target.y = Math.max(minY, Math.min(maxY, target.y));

    target.vx = fighter.wallSlamTargetVelX;
    target.vy = fighter.wallSlamTargetVelY;

    // Spawn streak sparks & motion lines behind thrown target
    if (Math.random() < 0.8) {
      spawnSparks(target.x, target.y, 6, 'crimsonSniper', '#FFEE58');
    }

    const hitLeft = (fighter.wallSlamTargetVelX < -0.1 && target.x <= minX);
    const hitRight = (fighter.wallSlamTargetVelX > 0.1 && target.x >= maxX);
    const hitTop = (fighter.wallSlamTargetVelY < -0.1 && target.y <= minY);
    const hitBottom = (fighter.wallSlamTargetVelY > 0.1 && target.y >= maxY);
    const hitWall = hitLeft || hitRight || hitTop || hitBottom;

    if (hitWall || fighter.wallSlamTimer >= 30) {
      // Final clamp target within arena boundary at wall
      target.x = Math.max(minX, Math.min(maxX, target.x));
      target.y = Math.max(minY, Math.min(maxY, target.y));
      target.vx = 0;
      target.vy = 0;

      // Deal heavy wall impact damage
      const impactDamage = CONFIG.mahoraga?.wallSlamImpactDamage ?? 20;
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(impactDamage, fighter, { isMelee: true, isWallSlam: true, isParalyzed: true });
      }
      // Wall crack shockwave & impact visuals
      spawnMahoragaShoutBurst(target.x, target.y, 130);
      spawnImpactFlash(target.x, target.y, 75, '#FFEE58');

      // APPLY PARALYZE STUN (freeze & hitstun on wall contact!)
      const paralyzeDuration = CONFIG.mahoraga?.wallSlamParalyzeDuration ?? 150;
      if (typeof target.applyHitStun === 'function') target.applyHitStun(paralyzeDuration);
      target.paralyzeTimer = paralyzeDuration;
      target.isParalyzedByMahoraga = true;
      target.hitStunTimer = Math.max(target.hitStunTimer || 0, paralyzeDuration);

      if (typeof target.applySlow === 'function') {
        target.applySlow(paralyzeDuration, 0.20, { isWallSlam: true });
      }

      // Clear any remaining or newly spawned projectiles
      if (state.projectiles) {
        const targetIndex = state.fighters ? state.fighters.indexOf(target) : -1;
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          if (p && p.ownerIndex === targetIndex && (p.isGojoBlue || p.isGojoRed || p.isGojoPurple || p.isGojoPurpleOrb)) {
            if (p.pixiSprite && p.pixiSprite.parent) {
              p.pixiSprite.parent.removeChild(p.pixiSprite);
            }
            state.projectiles.splice(i, 1);
          }
        }
      }

      spawnFloatingText(target.x, target.y - target.r - 28, '⚡ PARALYZED!', '#FFEE58');

      fighter.wallSlamPhase = 'post_throw_delay';
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 2.5: POST-THROW MENACING STANDOFF ──
  else if (fighter.wallSlamPhase === 'post_throw_delay') {
    fighter.aim(target);
    fighter.vx = 0;
    fighter.vy = 0;

    const standoffFrames = CONFIG.mahoraga?.wallSlamMenacingStandoff ?? 50;
    if (fighter.wallSlamTimer >= standoffFrames) { // Wait before dashing
      fighter.wallSlamPhase = 'dash';
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 3: SUPERSONIC DASH TO PARALYZED TARGET ──
  else if (fighter.wallSlamPhase === 'dash') {
    const oldX = fighter.x;
    const oldY = fighter.y;
    const dashRate = 0.40;

    fighter.x += (target.x - fighter.x) * dashRate;
    fighter.y += (target.y - fighter.y) * dashRate;
    fighter.aim(target);

    const dist = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    if (dist <= fighter.r + target.r + 25 || fighter.wallSlamTimer >= 14) {
      fighter.wallSlamPhase = 'strike';
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 4: HEAVY SWORD EXECUTE HIT & FLURRY TRANSITION ──
  else if (fighter.wallSlamPhase === 'strike') {
    fighter.aim(target);
    fighter.punchAnimTimer = 10;
    fighter.swordCombo = 1;

    // Deal initial follow-up execution damage
    const followupDamage = CONFIG.mahoraga?.wallSlamFollowupDamage ?? 25;
    target.takeDamage(followupDamage, fighter, { isMelee: true, isCritical: true });

    const angle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    spawnAnimePunchImpactFrame(target.x, target.y, 70, angle, 'gold');
    spawnMeleeClashShockwave(target.x, target.y, 110, 'mahoraga');
    spawnSparks(target.x, target.y, 20, 'gold', '#FFFFFF');
    triggerGlobalScreenShake(12, 18);
    audioSystem.playSFX('attack_swordswing', 1.0);
    audioSystem.playSFX('attack_fleshhit', 1.0);

    // End Wall Slam combo
    target.isGrabbedByMahoraga = false;
    fighter.isWallSlamActive = false;
    fighter.wallSlamPhase = null;
    fighter.wallSlamTimer = 0;
    fighter.throwCooldown = CONFIG.mahoraga?.throwCooldown ?? 600;

    // Smoothly transition and force-trigger his rapid H2H Blitz flurry on the paralyzed target!
    fighter.isBlitzActive = true;
    fighter.isWallSlamBlitz = true; // Tag this blitz as originating from Wall Slam for speed line rendering
    fighter.wallSlamBlitzInterval = CONFIG.mahoraga?.wallSlamBlitzHitInterval ?? 10;
    fighter.blitzWindupTimer = 0; // Start flurry instantly without windup delay
    fighter.blitzHitsLeft = CONFIG.mahoraga?.wallSlamBlitzHitsCount ?? 10;
    fighter.blitzTimer = 0;
    fighter.blitzStayTimer = 999;
    fighter.blitzTotalDuration = CONFIG.mahoraga?.wallSlamBlitzDuration ?? 120;
    fighter.blitzTarget = target;
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'EXECUTION FLURRY!', '#FFD700');
  }
}

/**
 * Execute Divine Shout — AoE shockwave roar.
 */
export function executeShout(fighter, opponent, ownerIndex) {
  const shoutRadius = CONFIG.mahoraga?.shoutRadius || 180;
  const shoutDamage = CONFIG.mahoraga?.shoutDamage || 30;
  const shoutKnockback = CONFIG.mahoraga?.shoutKnockback || 18;

  triggerGlobalScreenShake(10, 20);
  
  // Play heavy ground impact and shockwave burst SFX
  playSkillEffectSound('mahoraga', 'shout');
  audioSystem.playSFX('attack_groundsmash', 1.8);
  audioSystem.playSFX('attack_explosion', 0.85);

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
        const slowDur = CONFIG.mahoraga?.shoutSlowDurationFrames || 120;
        const slowMult = CONFIG.mahoraga?.shoutSlowMultiplier || 0.50;
        if (typeof f.applySlow === 'function') {
          f.applySlow(slowDur, slowMult, { isMahoragaShout: true });
        } else {
          f.slowTimer = slowDur;
          f.slowMultiplier = slowMult;
        }

        const pushAngle = Math.atan2(f.y - fighter.y, f.x - fighter.x);
        const kbX = Math.cos(pushAngle) * shoutKnockback;
        const kbY = Math.sin(pushAngle) * shoutKnockback;
        if (typeof f.applyKnockback === 'function') {
          f.applyKnockback(kbX, kbY);
        } else {
          f.vx += kbX;
          f.vy += kbY;
        }
      }
    });
  }
}
