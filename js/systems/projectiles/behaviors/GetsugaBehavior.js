import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { applyDamageToTarget, suppressAfterimagesAndAttackEffects, isSuppressedByGetsuga } from '../../../entities/fighter.js';
import { spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';

export class GetsugaBehavior extends ProjectileBehavior {
  update(projectile, fighters, system) {
    // 0. Gojo Limitless Infinity Stasis Guard: projectile frozen motionless in space
    if (projectile.isFrozenByInfinity) {
      if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
        projectile.draggedTargets.clear();
      }
      return false;
    }

    const form = projectile.getsugaForm || 'shikai';
    const isFinal = form === 'final_bankai';
    const isBankaiForm = form === 'bankai' || form === 'bankai_hollow';
    const isMaskForm = form === 'hollow' || form === 'bankai_hollow';
    const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

    // ── Continuous arena screen shake while Getsuga Tensho travels across the arena ──
    if (projectile.vx !== 0 || projectile.vy !== 0) {
      projectile.getsugaTravelShakeCounter = (projectile.getsugaTravelShakeCounter || 0) + 1;
      const shakeInterval = isFinal
        ? (CONFIG.ichigo?.bankaiFinalGetsugaTravelShakeInterval || 4)
        : (isBankaiForm
          ? (CONFIG.ichigo?.bankaiGetsugaTravelShakeInterval || 5)
          : (CONFIG.ichigo?.getsugaTravelShakeInterval || 6));

      if (projectile.getsugaTravelShakeCounter >= shakeInterval) {
        projectile.getsugaTravelShakeCounter = 0;
        const shakeIntensity = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaTravelShakeIntensity || 4.5)
          : (isBankaiForm
            ? (CONFIG.ichigo?.bankaiGetsugaTravelShakeIntensity || 3.0)
            : (isMaskForm ? 2.5 : (CONFIG.ichigo?.getsugaTravelShakeIntensity || 2.0)));
        const shakeDuration = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaTravelShakeDuration || 6)
          : 5;

        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(shakeIntensity, shakeDuration);
        }
      }
    }

    // ── Getsuga Tensho Wall Pinning & Clamping (Calculates true visual crescent scale extent) ──
    if (arena) {
      const owner = (fighters && typeof projectile.owner === 'number') ? fighters[projectile.owner] : ((typeof state !== 'undefined' && state.fighters && typeof projectile.owner === 'number') ? state.fighters[projectile.owner] : projectile.owner);
      const form = projectile.getsugaForm || 'shikai';
      const isFinal = form === 'final_bankai';
      const isBankaiHollow = form === 'bankai_hollow';
      const isShikaiHollow = form === 'hollow';
      const isBankai = form === 'bankai' || isBankaiHollow || isFinal;
      const ownerScale = owner ? Math.max(0.9, owner.r / 22) : 1.0;
      const baseProjRadius = isFinal
        ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius ?? 120)
        : (isBankaiHollow
          ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius ?? (CONFIG.ichigo?.getsugaRadius ?? 100))
          : (isShikaiHollow
            ? (CONFIG.ichigo?.hollowGetsugaRadius ?? (CONFIG.ichigo?.getsugaRadius ?? 100))
            : (isBankai
              ? (CONFIG.ichigo?.bankaiGetsugaRadius ?? 110)
              : (CONFIG.ichigo?.getsugaRadius ?? 100))));
      const effectiveRadius = ((projectile.r !== undefined && projectile.r > 0) ? projectile.r : baseProjRadius) * ownerScale;

      let ang = projectile.angle;
      if (projectile.vx !== 0 || projectile.vy !== 0) {
        ang = Math.atan2(projectile.vy, projectile.vx);
      } else if (projectile.launchAngle !== undefined) {
        ang = projectile.launchAngle;
      } else if (projectile._resumeVx !== undefined && projectile._resumeVy !== undefined && (projectile._resumeVx !== 0 || projectile._resumeVy !== 0)) {
        ang = Math.atan2(projectile._resumeVy, projectile._resumeVx);
      } else if (ang === undefined) {
        ang = 0;
      }

      // Middle top cutting edge (apex) of Getsuga Tensho
      const apexOffsetX = Math.cos(ang) * effectiveRadius;
      const apexOffsetY = Math.sin(ang) * effectiveRadius;

      let hitWall = false;

      if (projectile.vx < 0 && projectile.x + apexOffsetX <= arena.x) {
        projectile.x = arena.x - apexOffsetX;
        hitWall = true;
      }
      if (projectile.vx > 0 && projectile.x + apexOffsetX >= arena.x + arena.width) {
        projectile.x = arena.x + arena.width - apexOffsetX;
        hitWall = true;
      }
      if (projectile.vy < 0 && projectile.y + apexOffsetY <= arena.y) {
        projectile.y = arena.y - apexOffsetY;
        hitWall = true;
      }
      if (projectile.vy > 0 && projectile.y + apexOffsetY >= arena.y + arena.height) {
        projectile.y = arena.y + arena.height - apexOffsetY;
        hitWall = true;
      }

      if (hitWall) {
        if (projectile.vx !== 0 || projectile.vy !== 0) {
          projectile.angle = Math.atan2(projectile.vy, projectile.vx);
          projectile.launchAngle = projectile.angle;
          projectile._resumeVx = projectile.vx;
          projectile._resumeVy = projectile.vy;
          projectile.vx = 0;
          projectile.vy = 0;

          // Wall impact burst & heavy screen shake on initial wall collision
          if (typeof spawnImpactFlash === 'function') {
            spawnImpactFlash(projectile.x, projectile.y, isFinal ? 45 : 35, projectile.color || '#00E5FF');
          }
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isFinal ? 6.5 : 4.5, isFinal ? 12 : 8);
          }
          const hitSfx = CONFIG.ichigo?.sounds?.getsugaHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
          audioSystem.playSFX(hitSfx, 1.0);
        }
      }

      // Continuous wall grinding effects while pinned on the wall
      if (projectile.vx === 0 && projectile.vy === 0) {
        projectile.getsugaWallShakeCounter = (projectile.getsugaWallShakeCounter || 0) + 1;
        if (projectile.getsugaWallShakeCounter >= 6) {
          projectile.getsugaWallShakeCounter = 0;
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isFinal ? 2.5 : 1.8, 6);
          }
        }
      }
    }

    // 1. History tracking for speed trail rendering
    if (!projectile.history) projectile.history = [];
    projectile.history.unshift({ x: projectile.x, y: projectile.y });
    const maxHist = projectile.historyMax || 10;
    if (projectile.history.length > maxHist) {
      projectile.history.pop();
    }

    // 2. Decrement target re-hit cooldown timers
    if (projectile.hitTargets && projectile.hitTargets.size > 0) {
      for (const [target, timer] of projectile.hitTargets.entries()) {
        if (timer <= 1) {
          projectile.hitTargets.delete(target);
        } else {
          projectile.hitTargets.set(target, timer - 1);
        }
      }
    }

    // 3. Process Dragged Targets (Carrying caught enemies forward along with the crescent wave)
    if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
      const waveSpeed = Math.hypot(projectile.vx, projectile.vy);
      const dirX = waveSpeed > 0.001 ? projectile.vx / waveSpeed : 0;
      const dirY = waveSpeed > 0.001 ? projectile.vy / waveSpeed : 0;
      const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

      for (const [target, dragFrames] of projectile.draggedTargets.entries()) {
        if (!target || target.hp <= 0 || target.isDead || target.dead || target.isRespawning) {
          if (target) {
            target.isDraggedByGetsuga = false;
            target.preventKnockbackBounce = false;
          }
          projectile.draggedTargets.delete(target);
          continue;
        }

        target.isDraggedByGetsuga = true;
        target.preventKnockbackBounce = true;
        suppressAfterimagesAndAttackEffects(target);

        // Getsuga Tensho maintains Paralyze debuff while carrying target
        const isTargetAdapted = Boolean(target.adaptedGetsuga || (target.adaptedSkills && (target.adaptedSkills['getsugaTensho'] || target.adaptedSkills['getsuga'])));
        if (!isTargetAdapted) {
          const paralyzeDuration = projectile.getsugaForm === 'final_bankai'
            ? (CONFIG.ichigo?.bankaiFinalGetsugaParalyzeDuration || 28)
            : (projectile.getsugaForm === 'bankai_hollow'
              ? (CONFIG.ichigo?.bankaiHollowGetsugaParalyzeDuration || 24)
              : (projectile.getsugaForm === 'hollow'
                ? (CONFIG.ichigo?.hollowGetsugaParalyzeDuration || 20)
                : (projectile.getsugaForm === 'bankai' ? (CONFIG.ichigo?.bankaiGetsugaParalyzeDuration || 20) : (CONFIG.ichigo?.getsugaParalyzeDuration || 18))));
          if (typeof target.applyParalyze === 'function') {
            target.applyParalyze(paralyzeDuration);
          } else {
            target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, paralyzeDuration);
            if (target.statusEffects && typeof target.statusEffects.applyParalyze === 'function') {
              target.statusEffects.applyParalyze(paralyzeDuration);
            }
          }
          if (typeof target.interruptAttacks === 'function') {
            target.interruptAttacks(true);
          }
        }

        // Check if target has reached the arena wall boundary
        let isAtWall = false;
        if (arena) {
          const pad = target.r || 25;
          const minX = arena.x + pad;
          const maxX = arena.x + arena.width - pad;
          const minY = arena.y + pad;
          const maxY = arena.y + arena.height - pad;

          const nextX = target.x + dirX * (waveSpeed * 0.40);
          const nextY = target.y + dirY * (waveSpeed * 0.40);
          if (nextX <= minX || nextX >= maxX || nextY <= minY || nextY >= maxY ||
              target.x <= minX + 1 || target.x >= maxX - 1 || target.y <= minY + 1 || target.y >= maxY - 1) {
            isAtWall = true;
            target.x = Math.max(minX, Math.min(maxX, nextX));
            target.y = Math.max(minY, Math.min(maxY, nextY));
          }
        }

        if (isAtWall) {
          // Slammed into wall: Stop all velocities and pin target in place without sliding
          target.vx = 0;
          target.vy = 0;
          target.knockbackVx = 0;
          target.knockbackVy = 0;
          target.preventKnockbackBounce = true;

          // Single clean wall impact spark & flash (no ground/wall cracks)
          if (!target._getsugaWallImpactTimer || target._getsugaWallImpactTimer <= 0) {
            target._getsugaWallImpactTimer = 30; // Debounce so impact triggers once per slam
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(target.x, target.y, 22, projectile.color || '#00E5FF');
            }
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(2.5, 5);
            }
            const hitSfx = CONFIG.ichigo?.sounds?.getsugaHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
            const hitVol = (CONFIG.ichigo?.soundVolumes?.getsugaHit ?? 0.75) * 0.85;
            audioSystem.playSFX(hitSfx, hitVol);
          }

          // Release from active wave dragging immediately upon hitting the wall so enemy stays firmly pinned in place
          target.isDraggedByGetsuga = false;
          projectile.draggedTargets.delete(target);
          continue;
        }

        // Apply physical drag impulse matching wave velocity (in open arena)
        const dragSpeed = waveSpeed * 0.90;
        target.vx = dirX * dragSpeed;
        target.vy = dirY * dragSpeed;
        target.knockbackVx = dirX * dragSpeed;
        target.knockbackVy = dirY * dragSpeed;

        // Position entity smoothly along the front of the crescent wave
        target.x += dirX * (waveSpeed * 0.40);
        target.y += dirY * (waveSpeed * 0.40);

        // Clamp entity position within arena bounds
        if (arena) {
          const pad = target.r || 25;
          target.x = Math.max(arena.x + pad, Math.min(arena.x + arena.width - pad, target.x));
          target.y = Math.max(arena.y + pad, Math.min(arena.y + arena.height - pad, target.y));
        }

        if (dragFrames <= 1) {
          target.isDraggedByGetsuga = false;
          target.preventKnockbackBounce = false;
          projectile.draggedTargets.delete(target);
        } else {
          projectile.draggedTargets.set(target, dragFrames - 1);
        }
      }
    }

    const ownerIdx = projectile.owner;
    const attacker = (fighters && fighters[ownerIdx]) || (typeof state !== 'undefined' && state.fighters ? state.fighters[ownerIdx] : null);
    const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : null;

    const allCandidates = [];
    if (fighters) allCandidates.push(...fighters);
    if (typeof state !== 'undefined' && state.illusions) allCandidates.push(...state.illusions);
    if (typeof state !== 'undefined' && state.cjDriveBys) allCandidates.push(...state.cjDriveBys);

    const isMask = form === 'hollow' || form === 'bankai_hollow';
    const isBankai = form === 'bankai' || form === 'bankai_hollow' || isFinal;
    const hitRadius = projectile.r || (isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius || 120)
      : (form === 'bankai_hollow'
        ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius || (CONFIG.ichigo?.getsugaRadius || 100))
        : (form === 'hollow'
          ? (CONFIG.ichigo?.hollowGetsugaRadius || (CONFIG.ichigo?.getsugaRadius || 100))
          : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaRadius || 110) : (CONFIG.ichigo?.getsugaRadius || 100)))));

    // 4. Piercing Sweep: Cleave all valid enemy entities in the crescent wave's path
    for (let i = 0; i < allCandidates.length; i++) {
      const f = allCandidates[i];
      if (!f || f.hp <= 0 || f.isDead || f.dead || f.isRespawning || f === attacker || f.owner === attacker) continue;

      const fIdx = (fighters || []).indexOf(f);
      let isEnemy = true;
      if (fIdx !== -1) {
        isEnemy = (myTeam === null || state.getFighterTeam(fIdx) !== myTeam);
      } else if (f.owner) {
        const oIdx = (fighters || []).indexOf(f.owner);
        if (oIdx !== -1 && myTeam !== null && typeof state.getFighterTeam === 'function') {
          isEnemy = (state.getFighterTeam(oIdx) !== myTeam);
        }
      }
      if (!isEnemy) continue;

      // Check if target was recently hit by this same Getsuga wave
      if (projectile.hitTargets && projectile.hitTargets.has(f)) continue;

      // Precise Geometric Crescent Arc Collision Check (Matches exact visual sweep)
      const dx = f.x - projectile.x;
      const dy = f.y - projectile.y;
      const dist = Math.hypot(dx, dy);
      const tRadius = f.hitRadius || f.r || 25;
      const projAngle = projectile.angle !== undefined ? projectile.angle : Math.atan2(projectile.vy, projectile.vx);
      const angleToTarget = Math.atan2(dy, dx);
      const angleDiff = Math.atan2(Math.sin(angleToTarget - projAngle), Math.cos(angleToTarget - projAngle));

      const halfAngle = 0.64 * Math.PI + 0.12; // Matches visual crescent arc span (~122 deg)
      const maxReach = hitRadius + tRadius + 8;

      // Arc hit: target must be within crescent radius AND within the forward-facing arc angle
      let isHit = (dist <= maxReach && Math.abs(angleDiff) <= halfAngle);

      // Point-blank catch zone: Active during the first 6 frames after launch to catch enemies
      // standing in melee range of Ichigo who may be behind/inside the projectile spawn point
      if (!isHit && attacker && (projectile.life >= (projectile.maxLife || 30) - 6)) {
        const distToAttacker = Math.hypot(f.x - attacker.x, f.y - attacker.y);
        const reach = (attacker.r || 25) + 65 + tRadius;
        if (distToAttacker <= reach) {
          const toEnemyAngle = Math.atan2(f.y - attacker.y, f.x - attacker.x);
          const pbAngleDiff = Math.atan2(Math.sin(toEnemyAngle - projAngle), Math.cos(toEnemyAngle - projAngle));
          if (Math.abs(pbAngleDiff) <= Math.PI * 0.50) {
            isHit = true;
          }
        }
      }

      if (isHit) {
        if (!projectile.hitTargets) projectile.hitTargets = new Map();
        const hitCooldown = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaHitCooldown || 4)
          : (CONFIG.ichigo?.getsugaHitCooldown || 4);
        projectile.hitTargets.set(f, hitCooldown); // Cooldown before this target can be hit again by the same wave

        // Apply skill damage (continuous multi-tick damage for ALL Getsuga waves)
        const tickDamage = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaTickDamage || 20)
          : (form === 'bankai_hollow'
            ? (CONFIG.ichigo?.bankaiHollowGetsugaTickDamage || 24)
            : (form === 'hollow'
              ? (CONFIG.ichigo?.hollowGetsugaTickDamage || 16)
              : (isBankai
                ? (CONFIG.ichigo?.bankaiGetsugaTickDamage || 16)
                : (CONFIG.ichigo?.getsugaTickDamage || projectile.damage || 10))));
        applyDamageToTarget(f, tickDamage, attacker, { isSkill: true, isGetsuga: true, getsugaForm: form, isFinalGetsugaTick: isFinal, isFinalMassiveGetsuga: isFinal, projectile });
        suppressAfterimagesAndAttackEffects(f);

        const isGetsugaAdapted = Boolean(f.adaptedGetsuga || (f.adaptedSkills && (f.adaptedSkills['getsugaTensho'] || f.adaptedSkills['getsuga'])));

        const pad = f.r || 25;
        const isTargetAtWall = arena && (
          f.x <= arena.x + pad + 2 ||
          f.x >= arena.x + arena.width - pad - 2 ||
          f.y <= arena.y + pad + 2 ||
          f.y >= arena.y + arena.height - pad - 2
        );

        // Apply knockback in wave direction ONLY if target is in the open arena (not pinned at wall)
        if (!isTargetAtWall && (projectile.vx !== 0 || projectile.vy !== 0)) {
          const angle = Math.atan2(projectile.vy, projectile.vx);
          const kbForce = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaKnockback || 30)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaKnockback || 8)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaKnockback || 8) : (CONFIG.ichigo?.getsugaKnockback || 6)));
          if (typeof f.applyKnockback === 'function') {
            f.applyKnockback(Math.cos(angle) * (isGetsugaAdapted ? kbForce * 0.5 : kbForce), Math.sin(angle) * (isGetsugaAdapted ? kbForce * 0.5 : kbForce));
          }
        } else {
          // Firmly lock velocities against wall to prevent lateral sliding along the edge
          f.vx = 0;
          f.vy = 0;
          f.knockbackVx = 0;
          f.knockbackVy = 0;
          f.preventKnockbackBounce = true;
        }

        // Apply Paralyze debuff & Hit Stun (Immune if Adapted!)
        if (!isGetsugaAdapted) {
          const paralyzeDuration = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaParalyzeDuration || 28)
            : (form === 'bankai_hollow'
              ? (CONFIG.ichigo?.bankaiHollowGetsugaParalyzeDuration || 24)
              : (form === 'hollow'
                ? (CONFIG.ichigo?.hollowGetsugaParalyzeDuration || 20)
                : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaParalyzeDuration || 20) : (CONFIG.ichigo?.getsugaParalyzeDuration || 18))));
          if (typeof f.applyParalyze === 'function') {
            f.applyParalyze(paralyzeDuration);
          } else {
            f.paralyzeTimer = Math.max(f.paralyzeTimer || 0, paralyzeDuration);
            if (f.statusEffects && typeof f.statusEffects.applyParalyze === 'function') {
              f.statusEffects.applyParalyze(paralyzeDuration);
            }
          }
          if (typeof f.interruptAttacks === 'function') {
            f.interruptAttacks(true);
          }
          const stunDuration = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaHitStun || 28)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaHitStun || 20)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaHitStun || 20) : (CONFIG.ichigo?.getsugaHitStun || 18)));
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(stunDuration);
          }
        } else {
          const stunDuration = isMask
            ? (CONFIG.ichigo?.hollowGetsugaHitStun || 20)
            : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaHitStun || 20) : (CONFIG.ichigo?.getsugaHitStun || 18));
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(Math.round(stunDuration * 0.4));
          }
        }

        // ── 5. Apply Movement Slow Debuff (Immune if Adapted!) ──
        if (!isGetsugaAdapted) {
          const slowDuration = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaSlowDuration || 140)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaSlowDuration || 100)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSlowDuration || 100) : (CONFIG.ichigo?.getsugaSlowDuration || 90)));
          const slowMultiplier = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaSlowMultiplier || 0.20)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaSlowMultiplier || 0.35)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSlowMultiplier || 0.35) : (CONFIG.ichigo?.getsugaSlowMultiplier || 0.40)));

          if (typeof f.applySlow === 'function') {
            f.applySlow(slowDuration, slowMultiplier, { isGetsuga: true });
          }
          if (f.statusEffects && typeof f.statusEffects.applySlow === 'function') {
            f.statusEffects.applySlow(slowDuration, slowMultiplier);
          }
          f.slowTimer = Math.max(f.slowTimer || 0, slowDuration);
          f.slowMultiplier = Math.min(f.slowMultiplier || 1.0, slowMultiplier);
        }

        // ── 6. Register for Active Wave Dragging (Pull along with wave only in open arena) ──
        if (!isTargetAtWall && (projectile.vx !== 0 || projectile.vy !== 0) && !f.isBaguvixActive && !f.isGodModeActive) {
          if (!projectile.draggedTargets) projectile.draggedTargets = new Map();
          const dragFrames = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaDragFrames || 24)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaDragFrames || 18)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDragFrames || 16) : (CONFIG.ichigo?.getsugaDragFrames || 14)));
          projectile.draggedTargets.set(f, dragFrames);
        }

        // Ring shockwave hit effect (Theme color matches current Getsuga Tensho color!)
        if (typeof spawnMeleeClashShockwave === 'function') {
          const swColor = projectile.color || (isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaColor || '#DC143C')
            : (form === 'bankai_hollow'
              ? (CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00')
              : (form === 'hollow'
                ? (CONFIG.ichigo?.hollowGetsugaColor || '#FFFFFF')
                : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaColor || '#DC143C') : (CONFIG.ichigo?.getsugaColor || '#00D5FF')))));
          const swSize = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaShockwaveSize || 110)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaShockwaveSize || 45)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaShockwaveSize || 42) : (CONFIG.ichigo?.getsugaShockwaveSize || 40)));
          spawnMeleeClashShockwave(f.x, f.y, swSize, swColor);
        }
        if (typeof triggerGlobalScreenShake === 'function') {
          const shakeAmt = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaHitScreenShake ?? CONFIG.ichigo?.bankaiFinalGetsugaScreenShake ?? 8.5)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaHitScreenShake ?? CONFIG.ichigo?.hollowGetsugaScreenShake ?? 4.5)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaHitScreenShake ?? CONFIG.ichigo?.bankaiGetsugaScreenShake ?? 4.5) : (CONFIG.ichigo?.getsugaHitScreenShake ?? CONFIG.ichigo?.getsugaScreenShake ?? 3.5)));
          triggerGlobalScreenShake(shakeAmt, isFinal ? 16 : 10);
        }

        const hitSfx = CONFIG.ichigo?.sounds?.getsugaHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
        const hitVol = CONFIG.ichigo?.soundVolumes?.getsugaHit ?? 0.85;
        audioSystem.playSFX(hitSfx, hitVol);
      }
    }

    // 4. Piercing Wave: Destroy regular enemy bullets in the path of Getsuga Tensho
    if (system && system.projectiles) {
      for (let j = 0; j < system.projectiles.length; j++) {
        const other = system.projectiles[j];
        if (!other || other === projectile || other.owner === ownerIdx || other.isGetsuga || other.isGojoPurple || other.isSukunaFurnace || other.behaviorType === 'yuta_pure_love_beam' || other.visual === 'yuta_pure_love_beam' || other.isPureLoveBeam) continue;
        const d = Math.hypot(other.x - projectile.x, other.y - projectile.y);
        if (d <= hitRadius + (other.r || 6)) {
          other.life = 0;
          if (typeof spawnSparks === 'function') {
            spawnSparks(other.x, other.y, 4, projectile.color || '#00E5FF');
          }
        }
      }
    }

    return false; // Does not destroy upon hit — it pierces through!
  }

  onHit(projectile, target, attacker, fighters, system) {
    // Getsuga pierces through targets
    return false;
  }

  checkExpire(projectile, system) {
    if (projectile.isFrozenByInfinity) {
      if (projectile.infinityFreezeTimer !== undefined && projectile.infinityFreezeTimer <= 0) {
        if (typeof spawnSparks === 'function') {
          spawnSparks(projectile.x, projectile.y, 8, '#00E5FF');
        }
        return true;
      }
      return false; // Stays suspended in air during Infinity freeze
    }

    const form = projectile.getsugaForm || 'shikai';
    const isFinal = form === 'final_bankai';
    const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

    // ── All Getsuga Tensho Waves Stay Pinned to the Wall Until Lifespan Ends (Does not clip out of arena) ──
    if (arena) {
      if (projectile.life <= 0) {
        if (typeof spawnSparks === 'function') {
          spawnSparks(projectile.x, projectile.y, 16, projectile.color || '#00E5FF');
        }
        return true;
      }

      // Clamp position to arena boundaries so it sits flush against walls
      const pad = 24;
      let isAtWall = false;

      if (projectile.vx < 0 && projectile.x - pad < arena.x) {
        projectile.x = arena.x + pad;
        isAtWall = true;
      }
      if (projectile.vx > 0 && projectile.x + pad > arena.x + arena.width) {
        projectile.x = arena.x + arena.width - pad;
        isAtWall = true;
      }
      if (projectile.vy < 0 && projectile.y - pad < arena.y) {
        projectile.y = arena.y + pad;
        isAtWall = true;
      }
      if (projectile.vy > 0 && projectile.y + pad > arena.y + arena.height) {
        projectile.y = arena.y + arena.height - pad;
        isAtWall = true;
      }

      if (isAtWall) {
        if (projectile.vx !== 0 || projectile.vy !== 0) {
          projectile.angle = Math.atan2(projectile.vy, projectile.vx);
          projectile.launchAngle = projectile.angle;
          projectile._resumeVx = projectile.vx;
          projectile._resumeVy = projectile.vy;
          projectile.vx = 0;
          projectile.vy = 0;
        }
      }

      return false; // Never expire from wall collision — stays at the wall for its full duration!
    }

    const canvas = (typeof state !== 'undefined' && state.canvas) || null;
    const screenW = canvas ? canvas.width : (typeof window !== 'undefined' ? window.innerWidth : 2400);
    const screenH = canvas ? canvas.height : (typeof window !== 'undefined' ? window.innerHeight : 1400);
    const margin = (projectile.r || 50) + 100;

    // Slices through all arena walls unimpeded until it passes the outer screen/window edge
    const isOutsideWindow = (
      projectile.x < -margin ||
      projectile.x > screenW + margin ||
      projectile.y < -margin ||
      projectile.y > screenH + margin
    );

    if (projectile.life <= 0 || isOutsideWindow) {
      if (typeof spawnSparks === 'function') {
        spawnSparks(projectile.x, projectile.y, 8, projectile.color || '#00E5FF');
      }
      return true;
    }
    return false; // Continues travelling through walls!
  }
}
