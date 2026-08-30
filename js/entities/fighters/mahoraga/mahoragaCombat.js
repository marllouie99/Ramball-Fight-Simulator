// ─────────────────────────────────────────────
// MAHORAGA COMBAT MODULE
// Sword attacks, cleave, divine shout, throw barrage,
// and helper utilities
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../../core/state.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnMahoragaShoutShockwave, spawnMahoragaShoutBurst } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { getBasicAttackSound } from '../../../soundEffects/basicAttackSounds.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { spawnTeleportAfterimages } from './mahoragaSkills.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';

/**
 * Play a random heavy punch sound effect.
 */
export function playRandomHeavyPunchSound(volume = null) {
  const vol = volume !== null ? volume : (CONFIG.mahoraga?.soundVolumes?.punch !== undefined ? CONFIG.mahoraga.soundVolumes.punch : 1.0);
  if (vol <= 0.0001) return;
  const heavyPunches = CONFIG.mahoraga?.sounds?.punchSounds || [
    'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    'Assets/Sound Effects/Attacks/heavypunch3.mp3'
  ];
  const chosenSound = heavyPunches[Math.floor(Math.random() * heavyPunches.length)];
  audioSystem.playSFX(chosenSound, vol);
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
  if (!fighter) return;

  const isInsideDomain = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
  );

  const isCaughtInBeam = (
    (!fighter.adaptedPureLoveBeam && (fighter.caughtInPureLoveBeam || (fighter.pureLoveBeamTimer || 0) > 0 || (fighter.pureLoveBeamRecoveryTimer || 0) > 0)) ||
    fighter.isCaughtInPurple || (fighter.purpleHitTimer || 0) > 0 ||
    (!fighter.adaptedGenosBeam && ((fighter.caughtInGenosBeamTimer || 0) > 0 || fighter.caughtInGenosFlurry)) ||
    fighter.isDraggedByGetsuga
  );

  const isInHitReaction = (fighter.knockbackStunTimer || 0) > 0 || (fighter.hitStunTimer || 0) > 0 || (fighter.electricStunTimer || 0) > 0 || (fighter.dubstepStunTimer || 0) > 0;
  const isParalyzed = isInsideDomain || (fighter.timeStopTimer || 0) > 0 || isCaughtInBeam || fighter.isTargetOfAmbush || fighter.isFrozenByInfinity;
  if (isParalyzed || isInHitReaction) {
    fighter.neutralStanceTimer = 0;
    fighter.adaptationDashTimer = 0;
    return;
  }

  // Ensure aim alignment before attacking so sword/punch arc faces target accurately
  if (opponent && !opponent.isDead) {
    fighter.aim(opponent);
  }

  if (opponent && fighter.neutralStanceTimer > 0) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dz = (opponent.z || 0) - (fighter.z || 0);
    const dist = Math.hypot(dx, dy, dz);
    const maxReach = fighter.r + opponent.r + (CONFIG.mahoraga?.swordRange || 110);

    if (dist > maxReach) {
      fighter.neutralStanceTimer = 0; // Reset stance if target moved outside reach, but still proceed to strike!
    }
  }

  const attackCooldown = CONFIG.mahoraga?.swordCooldown ?? CONFIG.mahoraga?.neutralAttackInterval ?? 50;

  // Track stance duration window and cooldown
  const isStanceEnabled = CONFIG.mahoraga?.enableCloseQuartersTeleport !== false;
  const isStanceOnCooldown = !isStanceEnabled || (fighter.neutralStanceCooldownTimer || 0) > 0;

  // Initialize stance tracking timers when entering stance
  if ((!fighter.neutralStanceTimer || fighter.neutralStanceTimer <= 0) && !isStanceOnCooldown) {
    fighter.neutralStanceTimer = CONFIG.mahoraga?.neutralStanceDurationFrames ?? 200;
    fighter.neutralStanceAttackCount = 0;
  }

  fighter.swordCooldown = attackCooldown;
  fighter.attackCount = (fighter.attackCount || 0) + 1;
  if (!isStanceOnCooldown) {
    fighter.neutralStanceAttackCount = (fighter.neutralStanceAttackCount || 0) + 1;
  }

  // Alternating sword chops (majority) and left heavy punches
  const punchFreqStance = CONFIG.mahoraga?.punchFrequencyStance ?? 7;
  const punchFreqNormal = CONFIG.mahoraga?.punchFrequencyNormal ?? 5;
  const punchFrequency = isStanceOnCooldown ? punchFreqNormal : punchFreqStance;
  const isPunch = (fighter.attackCount % punchFrequency === 0);

  const punchAnimDuration = CONFIG.mahoraga?.punchAnimFrames ?? 18;
  const swordAnimDuration = CONFIG.mahoraga?.swordAnimFrames ?? 18;

  if (isPunch) {
    fighter.leftPunchTimer = punchAnimDuration;
    fighter.leftPunchMaxTimer = punchAnimDuration;
    playRandomHeavyPunchSound();
  } else {
    fighter.swordCombo = (fighter.swordCombo || 0) + 1;
    fighter.punchAnimTimer = swordAnimDuration;
    fighter.punchAnimMaxTimer = swordAnimDuration;
    const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
    const swordVol = CONFIG.mahoraga?.soundVolumes?.swordSwing ?? 1.0;
    audioSystem.playSFX(swordSnd, swordVol);
  }

  // AOE frontal arc query (Sword reach & arc angle from config)
  const range = CONFIG.mahoraga?.swordRange ?? 110;
  const arcRadians = CONFIG.mahoraga?.swordArcRadians ?? (Math.PI * 1.3);
  const frontTargets = getFrontRadiusTargets(fighter, range, arcRadians);

  // Guarantee all valid point-blank or reachable enemies are included in the melee hit
  if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
    const dist = Math.hypot(fighter.x - opponent.x, fighter.y - opponent.y, (opponent.z || 0) - (fighter.z || 0));
    if (dist <= range + fighter.r + opponent.r) {
      frontTargets.push(opponent);
    }
  }

  // Also catch any nearby overlapping entities at point-blank collision range
  if (typeof state !== 'undefined') {
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    const myIndex = state.fighters ? state.fighters.indexOf(fighter) : -1;
    const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : fighter.team;

    for (const ent of allEntities) {
      if (!ent || ent === fighter || ent.hp <= 0 || ent.isDead || ent.isInvulnerable) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === fighter) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
        if (ent.owner) {
          const ownerIdx = state.fighters.indexOf(ent.owner);
          if (ownerIdx !== -1 && state.getFighterTeam(ownerIdx) === myTeam) continue;
        }
      }
      if (!frontTargets.includes(ent)) {
        const d = Math.hypot(ent.x - fighter.x, ent.y - fighter.y, (ent.z || 0) - (fighter.z || 0));
        if (d <= fighter.r + ent.r + 20) {
          frontTargets.push(ent);
        }
      }
    }
  }

  const damage = CONFIG.mahoraga?.swordDamage ?? 15;
  const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const baseKnockbackChance = CONFIG.mahoraga?.punchBaseKnockbackChance ?? 0.40;
  const knockbackPerStage = CONFIG.mahoraga?.punchKnockbackChancePerStage ?? 0.04;
  const maxKnockbackChance = CONFIG.mahoraga?.punchMaxKnockbackChance ?? 0.65;
  const knockbackChance = Math.min(maxKnockbackChance, baseKnockbackChance + totalStages * knockbackPerStage);
  const rollKnockback = isPunch && (Math.random() < knockbackChance);

  const punchHitStun = CONFIG.mahoraga?.punchHitStunFrames ?? 16;
  const swordHitStun = CONFIG.mahoraga?.swordHitStunFrames ?? 8;
  const swordBasePush = CONFIG.mahoraga?.swordBasePushForce ?? 4.0;

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
      spawnFloatingText(t.x, t.y - (t.r || 20) - 22, 'HEAVY PUNCH KNOCKBACK!', '#FFD700');
      triggerGlobalScreenShake(9, 14);
    } else {
      t.vx += Math.cos(pushAngle) * swordBasePush;
      t.vy += Math.sin(pushAngle) * swordBasePush;
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
    const targetObj = opponent || frontTargets[0];
    spawnImpactFlash(targetObj.x, targetObj.y, 45, '#FFD700');
    triggerGlobalScreenShake(5, 8);
  }
}

/**
 * Execute Cleave — Sword of Extermination AoE frontal arc.
 */
export function executeCleave(fighter, opponent) {
  triggerGlobalScreenShake(8, 15);
  const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
  const swordVol = (CONFIG.mahoraga?.soundVolumes?.swordSwing ?? 1.0) * 0.9;
  audioSystem.playSFX(swordSnd, swordVol);
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

  const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
  const swordVol = (CONFIG.mahoraga?.soundVolumes?.swordSwing ?? 1.0) * 0.35;
  audioSystem.playSFX(swordSnd, swordVol);
}

/**
 * Level 8 Transformed Throw Skill: Wall Slam & Supersonic Dash Execute Combo.
 */
export function initiateLevel8WallSlam(fighter, opponent) {
  if (!opponent || opponent.hp <= 0 || opponent.isDead) return;
  if (fighter.isWallSlamActive || (fighter.throwCooldown || 0) > 0 || fighter.isDraggedByGetsuga) return;

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

  if (opponent) {
    if (typeof opponent.interruptAttacks === 'function') opponent.interruptAttacks(true);
    opponent.isGrabbedByMahoraga = true;
    opponent.isParalyzedByMahoraga = true;
    opponent.isWallSlammed = true;
  }

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, '⚡ LEVEL 8 WALL SLAM!', '#FFEE58');
  const fleshSnd = CONFIG.mahoraga?.sounds?.fleshHit || 'attack_fleshhit';
  const fleshVol = CONFIG.mahoraga?.soundVolumes?.fleshHit ?? 0.9;
  audioSystem.playSFX(fleshSnd, fleshVol);
}

export function updateLevel8WallSlam(fighter, opponent, ownerIndex, arena) {
  const target = fighter.wallSlamTarget || opponent;

  const isInterrupted = (
    fighter.isCaughtInPurple || (fighter.purpleHitTimer || 0) > 0 ||
    (!fighter.adaptedPureLoveBeam && (fighter.caughtInPureLoveBeam || (fighter.pureLoveBeamRecoveryTimer || 0) > 0)) ||
    (!fighter.adaptedGenosBeam && ((fighter.caughtInGenosBeamTimer || 0) > 0 || fighter.caughtInGenosFlurry)) ||
    fighter.isDraggedByGetsuga
  );

  if (isInterrupted || !target || target.hp <= 0 || target.isDead) {
    if (target) {
      target.isGrabbedByMahoraga = false;
      target.isParalyzedByMahoraga = false;
      target.isWallSlammed = false;
      target.wallSlamPinnedX = undefined;
      target.wallSlamPinnedY = undefined;
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
      // Snapshot Mahoraga and target positions and angle to prevent instant snapping/slide
      fighter.wallSlamGrabMahoragaStartX = fighter.x;
      fighter.wallSlamGrabMahoragaStartY = fighter.y;
      fighter.wallSlamGrabStartX = target.x;
      fighter.wallSlamGrabStartY = target.y;
      fighter.wallSlamGrabAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);

      // Play lunge dash sound at start of grab lunge
      const lungeSnd = CONFIG.mahoraga?.sounds?.wallSlamLunge || 'skill_dash5';
      const lungeVol = CONFIG.mahoraga?.soundVolumes?.wallSlamLunge ?? 0.9;
      audioSystem.playSFX(lungeSnd, lungeVol);

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
      const impaleSnd = CONFIG.mahoraga?.sounds?.wallSlamImpale || 'skill_backstab';
      const impaleVol = CONFIG.mahoraga?.soundVolumes?.wallSlamImpale ?? 1.0;
      audioSystem.playSFX(impaleSnd, impaleVol);
      spawnFloatingText(target.x, target.y - target.r - 28, '⚔️ IMPALED!', '#FFEE58');
      spawnImpactFlash(target.x, target.y, 45, '#FF3333');
    }
    
    const angle = fighter.wallSlamGrabAngle !== undefined ? fighter.wallSlamGrabAngle : Math.atan2(target.y - fighter.y, target.x - fighter.x);
    fighter.aim({ x: target.x, y: target.y });

    const startX = fighter.wallSlamGrabStartX;
    const startY = fighter.wallSlamGrabStartY;
    const mahoStartX = fighter.wallSlamGrabMahoragaStartX !== undefined ? fighter.wallSlamGrabMahoragaStartX : fighter.x;
    const mahoStartY = fighter.wallSlamGrabMahoragaStartY !== undefined ? fighter.wallSlamGrabMahoragaStartY : fighter.y;
    const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;

    const shoulderOffsetX = Math.cos(angle + Math.PI / 2) * (fighter.r * 0.20);
    const shoulderOffsetY = Math.sin(angle + Math.PI / 2) * (fighter.r * 0.20);

    // Calculate Mahoraga's final destination where the sword tip will touch the target's starting position
    const endX = startX - Math.cos(angle) * (fighter.r + target.r + 32) - shoulderOffsetX;
    const endY = startY - Math.sin(angle) * (fighter.r + target.r + 32) - shoulderOffsetY;

    if (fighter.wallSlamTimer <= 12) {
      // 1. Thrust/Lunge sub-phase: Mahoraga lunges forward smoothly from actual starting coordinates
      const p = Math.min(1.0, fighter.wallSlamTimer / 12);
      const easeP = 1 - Math.pow(1 - p, 2);
      fighter.x = Math.max(minX, Math.min(maxX, mahoStartX + (endX - mahoStartX) * easeP));
      fighter.y = Math.max(minY, Math.min(maxY, mahoStartY + (endY - mahoStartY) * easeP));

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
      spawnImpactFlash(target.x, target.y, 60, '#FFEE58');
      triggerGlobalScreenShake(12, 15);
      const smashSnd = CONFIG.mahoraga?.sounds?.wallSlamImpact || 'attack_fleshhit';
      const smashVol = CONFIG.mahoraga?.soundVolumes?.wallSlamImpact ?? 1.0;
      audioSystem.playSFX(smashSnd, smashVol);
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
      const throwSnd = CONFIG.mahoraga?.sounds?.dash || 'skill_dash5';
      const throwVol = CONFIG.mahoraga?.soundVolumes?.dash ?? 1.0;
      audioSystem.playSFX(throwSnd, throwVol);
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
      target.wallSlamPinnedX = target.x;
      target.wallSlamPinnedY = target.y;

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

    const standoffFrames = CONFIG.mahoraga?.wallSlamMenacingStandoff ?? 20;
    if (fighter.wallSlamTimer >= standoffFrames) { // Wait before dashing
      fighter.wallSlamPhase = 'dash';
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 3: SUPERSONIC DASH TO PARALYZED TARGET ──
  else if (fighter.wallSlamPhase === 'dash') {
    if (fighter.wallSlamTimer === 1) {
      fighter.wallSlamDashStartX = fighter.x;
      fighter.wallSlamDashStartY = fighter.y;
      fighter.aim(target);
      const dashSnd = CONFIG.mahoraga?.sounds?.dash || 'skill_dash5';
      const dashVol = CONFIG.mahoraga?.soundVolumes?.dash ?? 1.0;
      audioSystem.playSFX(dashSnd, dashVol);
    }
    const dashDuration = 10;
    const p = Math.min(1.0, fighter.wallSlamTimer / dashDuration);
    const easeP = 1 - Math.pow(1 - p, 2);
    const dashStartX = fighter.wallSlamDashStartX !== undefined ? fighter.wallSlamDashStartX : fighter.x;
    const dashStartY = fighter.wallSlamDashStartY !== undefined ? fighter.wallSlamDashStartY : fighter.y;

    const angleToTarget = Math.atan2(target.y - dashStartY, target.x - dashStartX);
    const idealDist = fighter.r + target.r + 14;
    const targetX = target.x - Math.cos(angleToTarget) * idealDist;
    const targetY = target.y - Math.sin(angleToTarget) * idealDist;

    const prevX = fighter.x;
    const prevY = fighter.y;

    fighter.x = Math.max(minX, Math.min(maxX, dashStartX + (targetX - dashStartX) * easeP));
    fighter.y = Math.max(minY, Math.min(maxY, dashStartY + (targetY - dashStartY) * easeP));
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.knockbackVx = 0;
    fighter.knockbackVy = 0;
    fighter.aim(target);

    // Spawn smooth, gap-free afterimages along this frame's supersonic dash movement segment
    if (!fighter.adaptationAfterimages) fighter.adaptationAfterimages = [];
    const stepDist = Math.hypot(fighter.x - prevX, fighter.y - prevY);
    if (stepDist > 0) {
      const subSteps = Math.max(1, Math.ceil(stepDist / 12));
      for (let s = 1; s <= subSteps; s++) {
        const t = s / subSteps;
        const subX = prevX + (fighter.x - prevX) * t;
        const subY = prevY + (fighter.y - prevY) * t;
        pushTrailCap(fighter.adaptationAfterimages, {
          x: subX,
          y: subY,
          gunAngle: fighter.gunAngle || 0,
          timer: 18,
          maxTimer: 18
        }, 70);
      }
    }

    if (p >= 1.0 || fighter.wallSlamTimer >= dashDuration) {
      fighter.x = Math.max(minX, Math.min(maxX, targetX));
      fighter.y = Math.max(minY, Math.min(maxY, targetY));
      fighter.wallSlamPhase = 'strike';
      fighter.wallSlamTimer = 0;
    }
  }
  // ── PHASE 4: HEAVY SWORD EXECUTE HIT & FLURRY TRANSITION ──
  else if (fighter.wallSlamPhase === 'strike') {
    fighter.aim(target);
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.knockbackVx = 0;
    fighter.knockbackVy = 0;
    fighter.punchAnimTimer = 10;
    fighter.swordCombo = 1;

    // Deal initial follow-up execution damage
    const followupDamage = CONFIG.mahoraga?.wallSlamFollowupDamage ?? 25;
    target.takeDamage(followupDamage, fighter, { isMelee: true, isCritical: true });

    const angle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    spawnImpactFlash(target.x, target.y, 65, '#FFD700');
    spawnMeleeClashShockwave(target.x, target.y, 110, 'mahoraga');
    triggerGlobalScreenShake(12, 18);
    const execSwordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
    const execSwordVol = CONFIG.mahoraga?.soundVolumes?.swordSwing ?? 1.0;
    const execFleshSnd = CONFIG.mahoraga?.sounds?.fleshHit || 'attack_fleshhit';
    const execFleshVol = CONFIG.mahoraga?.soundVolumes?.fleshHit ?? 1.0;
    audioSystem.playSFX(execSwordSnd, execSwordVol);
    audioSystem.playSFX(execFleshSnd, execFleshVol);

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
  const shoutImpactSnd = CONFIG.mahoraga?.sounds?.shoutImpact || 'attack_groundsmash';
  const shoutImpactVol = CONFIG.mahoraga?.soundVolumes?.shoutImpact ?? 1.8;
  const shoutExpSnd = CONFIG.mahoraga?.sounds?.shoutExplosion || 'attack_explosion';
  const shoutExpVol = CONFIG.mahoraga?.soundVolumes?.shoutExplosion ?? 0.85;
  audioSystem.playSFX(shoutImpactSnd, shoutImpactVol);
  audioSystem.playSFX(shoutExpSnd, shoutExpVol);

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
