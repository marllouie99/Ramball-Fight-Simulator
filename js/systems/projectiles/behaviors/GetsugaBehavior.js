import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { applyDamageToTarget } from '../../../entities/fighter.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { spawnGetsugaHitEffect } from '../../../graphics/particles/getsugaImpactEffect.js';

export class GetsugaBehavior extends ProjectileBehavior {
  update(projectile, fighters, system) {
    // 0. Gojo Limitless Infinity Stasis Guard: projectile frozen motionless in space
    if (projectile.isFrozenByInfinity) {
      if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
        projectile.draggedTargets.clear();
      }
      return false;
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
      const dirX = waveSpeed > 0.001 ? projectile.vx / waveSpeed : 1;
      const dirY = waveSpeed > 0.001 ? projectile.vy / waveSpeed : 0;
      const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

      for (const [target, dragFrames] of projectile.draggedTargets.entries()) {
        if (!target || target.hp <= 0 || target.isDead || target.isRespawning) {
          if (target) {
            target.isDraggedByGetsuga = false;
            target.preventKnockbackBounce = false;
          }
          projectile.draggedTargets.delete(target);
          continue;
        }

        target.isDraggedByGetsuga = true;
        target.preventKnockbackBounce = true;

        // Grand Finisher: Final Massive Kuroi Getsuga maintains Paralyze while carrying target
        if (projectile.getsugaForm === 'final_bankai') {
          const paralyzeDuration = CONFIG.ichigo?.bankaiFinalGetsugaParalyzeDuration || 28;
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
          // Slammed into wall: Stop all velocities and prevent multiple rapid rebounces!
          target.vx = 0;
          target.vy = 0;
          target.knockbackVx = 0;
          target.knockbackVy = 0;

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

          // Release from active wave dragging immediately upon hitting the wall so enemy sticks cleanly
          target.isDraggedByGetsuga = false;
          target.preventKnockbackBounce = false;
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

        // Spawn air friction & ground drag spark particles
        if (Math.random() < 0.35 && typeof spawnSparks === 'function') {
          spawnSparks(target.x, target.y, 2, projectile.color || '#00D5FF');
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

    const form = projectile.getsugaForm || 'shikai';
    const isFinal = form === 'final_bankai';
    const isMask = form === 'hollow' || form === 'bankai_hollow';
    const isBankai = form === 'bankai' || form === 'bankai_hollow' || isFinal;
    const hitRadius = projectile.r || (isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius || 120)
      : (form === 'bankai_hollow'
        ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius || 68)
        : (form === 'hollow'
          ? (CONFIG.ichigo?.hollowGetsugaRadius || 100)
          : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaRadius || 110) : (CONFIG.ichigo?.getsugaRadius || 100)))));

    // 4. Piercing Sweep: Cleave all valid enemy entities in the crescent wave's path
    for (let i = 0; i < allCandidates.length; i++) {
      const f = allCandidates[i];
      if (!f || f.hp <= 0 || f.isDead || f.isRespawning || f === attacker) continue;

      const fIdx = (fighters || []).indexOf(f);
      const isEnemy = fIdx === -1 ? true : (myTeam === null || state.getFighterTeam(fIdx) !== myTeam);
      if (!isEnemy) continue;

      // Check if target was recently hit by this same Getsuga wave
      if (projectile.hitTargets && projectile.hitTargets.has(f)) continue;

      const dist = Math.hypot(f.x - projectile.x, f.y - projectile.y);
      if (dist <= hitRadius + (f.r || 25)) {
        if (!projectile.hitTargets) projectile.hitTargets = new Map();
        const hitCooldown = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaHitCooldown || 4)
          : (CONFIG.ichigo?.getsugaHitCooldown || 20);
        projectile.hitTargets.set(f, hitCooldown); // Cooldown before this target can be hit again by the same wave

        // Apply skill damage (continuous multi-tick damage for Final Getsuga)
        const tickDamage = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaTickDamage || projectile.damage || 26)
          : projectile.damage;
        applyDamageToTarget(f, tickDamage, attacker, { isSkill: true, isGetsuga: true, getsugaForm: form, isFinalGetsugaTick: isFinal, projectile });

        const isGetsugaAdapted = Boolean(f.adaptedGetsuga || (f.adaptedSkills && (f.adaptedSkills['getsugaTensho'] || f.adaptedSkills['getsuga'])));

        // Apply knockback in wave direction
        const angle = Math.atan2(projectile.vy, projectile.vx);
        const kbForce = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaKnockback || 30)
          : (isMask
            ? (CONFIG.ichigo?.hollowGetsugaKnockback || 8)
            : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaKnockback || 8) : (CONFIG.ichigo?.getsugaKnockback || 6)));
        if (typeof f.applyKnockback === 'function') {
          f.applyKnockback(Math.cos(angle) * (isGetsugaAdapted ? kbForce * 0.5 : kbForce), Math.sin(angle) * (isGetsugaAdapted ? kbForce * 0.5 : kbForce));
        }

        // Apply hit stun / Paralyze effect
        if (isFinal && !isGetsugaAdapted) {
          // ── Grand Finisher: Final Massive Kuroi Getsuga Paralyzes Target Throughout Wave Ticks ──
          const paralyzeDuration = CONFIG.ichigo?.bankaiFinalGetsugaParalyzeDuration || 28;
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
        } else {
          const stunDuration = isMask
            ? (CONFIG.ichigo?.hollowGetsugaHitStun || 20)
            : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaHitStun || 20) : (CONFIG.ichigo?.getsugaHitStun || 18));
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(isGetsugaAdapted ? Math.round(stunDuration * 0.4) : stunDuration);
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

        // ── 6. Register for Active Wave Dragging (Immune if Adapted!) ──
        if (!isGetsugaAdapted) {
          if (!projectile.draggedTargets) projectile.draggedTargets = new Map();
          const dragFrames = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaDragFrames || 24)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaDragFrames || 18)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDragFrames || 16) : (CONFIG.ichigo?.getsugaDragFrames || 14)));
          projectile.draggedTargets.set(f, dragFrames);
        }

        // Visual impacts: specialized Bleach Getsuga Tensho spatial cleave hit effect
        // Skip Getsuga slice/flash hit effect for the Grand Finisher Final Kuroi Getsuga
        if (!isFinal) {
          if (typeof spawnGetsugaHitEffect === 'function') {
            spawnGetsugaHitEffect(f.x, f.y, angle, form);
          }

          const flashType = (isMask) ? 'sukuna' : 'gojo';
          if (typeof spawnImpactFlash === 'function') {
            spawnImpactFlash(f.x, f.y, flashType);
          }
        }

        // Ring shockwave hit effect (kept for all forms including Grand Finisher)
        if (typeof spawnMeleeClashShockwave === 'function') {
          const flashType = (isFinal || isMask) ? 'sukuna' : 'gojo';
          const swSize = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaShockwaveSize || 110)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaShockwaveSize || 45)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaShockwaveSize || 42) : (CONFIG.ichigo?.getsugaShockwaveSize || 40)));
          spawnMeleeClashShockwave(f.x, f.y, swSize, flashType);
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
