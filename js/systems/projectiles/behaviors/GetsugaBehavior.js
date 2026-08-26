import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { applyDamageToTarget } from '../../../entities/fighter.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks } from '../../../graphics/particles/sparkEffect.js';

export class GetsugaBehavior extends ProjectileBehavior {
  update(projectile, fighters, system) {
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

    const ownerIdx = projectile.owner;
    const attacker = (fighters && fighters[ownerIdx]) || (typeof state !== 'undefined' && state.fighters ? state.fighters[ownerIdx] : null);
    const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : null;

    const allCandidates = [];
    if (fighters) allCandidates.push(...fighters);
    if (typeof state !== 'undefined' && state.illusions) allCandidates.push(...state.illusions);

    const form = projectile.getsugaForm || 'shikai';
    const hitRadius = projectile.r || (form === 'hollow'
      ? (CONFIG.ichigo?.hollowGetsugaRadius || 42)
      : (form === 'bankai' ? (CONFIG.ichigo?.bankaiGetsugaRadius || 36) : (CONFIG.ichigo?.getsugaRadius || 38)));

    // 3. Piercing Sweep: Cleave all valid enemy entities in the crescent wave's path
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
        const hitCooldown = CONFIG.ichigo?.getsugaHitCooldown || 20;
        projectile.hitTargets.set(f, hitCooldown); // Cooldown before this target can be hit again by the same wave

        // Apply skill damage
        applyDamageToTarget(f, projectile.damage, attacker, { isSkill: true });

        // Apply knockback in wave direction
        const angle = Math.atan2(projectile.vy, projectile.vx);
        const isFinal = form === 'final_bankai';
        const kbForce = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaKnockback || 14)
          : (form === 'hollow'
            ? (CONFIG.ichigo?.hollowGetsugaKnockback || 8)
            : (form === 'bankai' ? (CONFIG.ichigo?.bankaiGetsugaKnockback || 8) : (CONFIG.ichigo?.getsugaKnockback || 6)));
        if (typeof f.applyKnockback === 'function') {
          f.applyKnockback(Math.cos(angle) * kbForce, Math.sin(angle) * kbForce);
        }
        const stunDuration = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaHitStun || 28)
          : (form === 'hollow'
            ? (CONFIG.ichigo?.hollowGetsugaHitStun || 20)
            : (form === 'bankai' ? (CONFIG.ichigo?.bankaiGetsugaHitStun || 20) : (CONFIG.ichigo?.getsugaHitStun || 18)));
        if (typeof f.applyHitStun === 'function') {
          f.applyHitStun(stunDuration);
        }

        // Visual impacts
        const flashType = (isFinal || form === 'hollow') ? 'sukuna' : 'gojo';
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(f.x, f.y, flashType);
        }
        if (typeof spawnMeleeClashShockwave === 'function') {
          const swSize = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaShockwaveSize || 110)
            : (CONFIG.ichigo?.getsugaShockwaveSize || 40);
          spawnMeleeClashShockwave(f.x, f.y, swSize, flashType);
        }
        if (typeof triggerGlobalScreenShake === 'function') {
          const shakeAmt = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaScreenShake || 8)
            : (form === 'hollow'
              ? (CONFIG.ichigo?.hollowGetsugaScreenShake || 4)
              : (form === 'bankai' ? (CONFIG.ichigo?.bankaiGetsugaScreenShake || 4) : (CONFIG.ichigo?.getsugaScreenShake || 3)));
          triggerGlobalScreenShake(shakeAmt, 14);
        }

        audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.85);
      }
    }

    // 4. Piercing Wave: Destroy regular enemy bullets in the path of Getsuga Tensho
    if (system && system.projectiles) {
      for (let j = 0; j < system.projectiles.length; j++) {
        const other = system.projectiles[j];
        if (!other || other === projectile || other.owner === ownerIdx || other.isGetsuga || other.isGojoPurple || other.isSukunaFurnace) continue;
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
