import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';

export class YutaPureLoveBeamBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const ownerFighter = (fighters && p.owner !== undefined) ? (fighters[p.owner] || p.ownerFighter) : p.ownerFighter;
    if (!ownerFighter || ownerFighter.hp <= 0 || ownerFighter.isDead || (!ownerFighter.isFiringPureLoveBeam && !ownerFighter.isChannelingPureLoveBeam)) {
      // Clear trapped status from all entities when beam terminates
      const allTargets = [
        ...(state.fighters || []),
        ...(state.illusions || []),
        ...(state.cjDriveBys || [])
      ];
      for (const ent of allTargets) {
        if (ent && (ent.caughtInPureLoveBeam || ent.wasCaughtInPureLoveBeam)) {
          ent.caughtInPureLoveBeam = false;
          ent.wasCaughtInPureLoveBeam = false;
          ent.pureLoveBeamTimer = 0;
        }
      }
      return true; // Extinguish and destroy beam immediately!
    }
    if (ownerFighter) {
      // Beam stays glued to Yuta's hand position and locked angle
      const beamOffset = (ownerFighter.r || 22) + 14;
      p.angle = ownerFighter.pureLoveBeamLockedAngle !== undefined ? ownerFighter.pureLoveBeamLockedAngle : (ownerFighter.gunAngle || 0);
      p.x = ownerFighter.x + Math.cos(p.angle) * beamOffset;
      p.y = ownerFighter.y + Math.sin(p.angle) * beamOffset;
      p.vx = Math.cos(p.angle) * 20; // Maintain logical velocity
      p.vy = Math.sin(p.angle) * 20;

      const allTargets = [
        ...(state.fighters || []),
        ...(state.illusions || []),
        ...(state.cjDriveBys || [])
      ];

      // Calculate line segment for collision
      const beamLength = p.length || 2500;
      const beamRadius = p.r || 120;
      const startX = ownerFighter.x - Math.cos(p.angle) * 60;
      const startY = ownerFighter.y - Math.sin(p.angle) * 60;
      const endX = ownerFighter.x + Math.cos(p.angle) * beamLength;
      const endY = ownerFighter.y + Math.sin(p.angle) * beamLength;

      // Process ticks
      p.hitTickTimer = (p.hitTickTimer || 0) + 1;
      const ticksPerHit = 5;
      if (p.hitTickTimer >= ticksPerHit) {
        p.hitTickTimer = 0;
        if (p.hitTargets) p.hitTargets.clear();
      }

      const ownerTeam = state.getFighterTeam ? state.getFighterTeam(p.owner) : null;

      for (let i = 0; i < allTargets.length; i++) {
        const ent = allTargets[i];
        if (!ent || ent.hp <= 0 || ent === ownerFighter) continue;
        const isControlledRika = ownerFighter.isMakimaControlledRikaTarget?.(ent);
        if (ent.owner && ent.owner === ownerFighter && !isControlledRika) continue;
        
        let isEnemy = true;
        if (ownerTeam !== null) {
          const checkFighter = ent.owner || ent;
          const entIdx = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
          if (entIdx !== -1 && state.getFighterTeam) {
            isEnemy = state.getFighterTeam(entIdx) !== ownerTeam;
          }
        }
        if (isControlledRika) isEnemy = true;
        if (!isEnemy) continue;

        // Line-to-Circle Collision & Origin Proximity Check
        const cx = ent.x;
        const cy = ent.y;
        const radius = ent.hitRadius || ent.r || 20;
        
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSq = dx * dx + dy * dy;
        
        let t = Math.max(0, Math.min(1, ((cx - startX) * dx + (cy - startY) * dy) / lengthSq));
        const closestX = startX + t * dx;
        const closestY = startY + t * dy;
        
        const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
        const distFromAxis = Math.sqrt(distSq);

        const startR = (beamRadius * 0.40);
        const endR = (beamRadius * 2.10);
        const currentBeamRadius = startR + (endR - startR) * t;

        const distToOrigin = Math.hypot(cx - ownerFighter.x, cy - ownerFighter.y);
        const isAtBeamOrigin = distToOrigin <= ((ownerFighter.r || 22) + radius + startR);
        const isInsideBeam = isAtBeamOrigin || (distFromAxis <= (currentBeamRadius + radius));

        if (isInsideBeam) {
          const solidDamage = CONFIG.yuta?.pureLoveBeamDamagePerTick ?? p.damage ?? 10;

          if (p.hitTargets && !p.hitTargets.has(ent)) {
            p.hitTargets.add(ent);
            
            if (typeof ent.takeDamage === 'function') {
              ent.takeDamage(solidDamage, ownerFighter, { isPureLoveBeam: true, bypassShield: true });

              const dmgGain = CONFIG.yuta?.pureLoveBeamDamageStackPerTick ?? 0.5;
              if (dmgGain > 0 && ownerFighter) {
                ownerFighter.pureLoveBeamBonusDamage = (ownerFighter.pureLoveBeamBonusDamage || 0) + dmgGain;
              }

              const lifestealPct = CONFIG.yuta?.pureLoveBeamLifestealPct ?? 0.5;
              const healAmount = solidDamage * lifestealPct;
              if (healAmount > 0 && typeof ownerFighter.takeDamage === 'function') {
                ownerFighter.takeDamage(-healAmount, ownerFighter, { isHeal: true });
              }
            }
          }

          if (!ent.isBaguvixActive && !ent.isGodModeActive) {
            ent.caughtInPureLoveBeam = true;
            ent.wasCaughtInPureLoveBeam = true;
            ent.pureLoveBeamTimer = 10;
            ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 120;
            ent.pureLoveBeamRegenDebuffTimer = CONFIG.yuta?.pureLoveBeamRegenDebuffDuration ?? 1500; // Disable & reduce regen after beam expires

            if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent._def?.id === 'mahoraga') {
              ent.neutralStanceTimer = 0;
              ent.neutralStanceCooldownTimer = 300;
              ent.adaptationDashTimer = 0;
              ent.isInfinityBlitz = false;
              ent.isBlitzActive = false;
              ent.isWallSlamActive = false;
            }

            // Force cancel all skill channeling / charging / active counters across all fighters hit by Pure Love Beam
            if (ent.isChannelingPurple) {
              ent.isChannelingPurple = false;
              ent.purpleChargeTimer = 0;
              ent._hasPlayedPurpleChannelSound = false;
              if (ent._purpleChargeSoundHandle) {
                if (typeof fadeOutSound === 'function') fadeOutSound(ent._purpleChargeSoundHandle, 200);
                ent._purpleChargeSoundHandle = null;
              }
              if (typeof fadeOutSoundBySrc === 'function') fadeOutSoundBySrc('mixing', 200);
            }
            if (ent.isChannelingDomainExpansion) {
              ent.isChannelingDomainExpansion = false;
              ent.domainChargeTimer = 0;
              ent._hasPlayedDomainChannelSound = false;
            }
            if (ent.isChannelingDomain) {
              ent.isChannelingDomain = false;
              ent.domainChargeTimer = 0;
            }
            if (ent.isChannelingDivineFlame) {
              ent.isChannelingDivineFlame = false;
              ent.divineFlameChargeTimer = 0;
              if (ent.fugaSoundKey && typeof stopLoopingSound === 'function') {
                stopLoopingSound(ent.fugaSoundKey);
                ent.fugaSoundKey = null;
              }
            }
            if (ent.isChannelingGetsuga || ent.getsugaChargeTimer > 0) {
              ent.isChannelingGetsuga = false;
              ent.getsugaChargeTimer = 0;
              ent.getsugaSlideTimer = 0;
            }
            if (ent.isTakadaChanneling) {
              ent.isTakadaChanneling = false;
              ent.takadaChannelTimer = 0;
            }
            if (ent.isCountering || ent._counterPunchTimer > 0 || ent._counterWindupTimer > 0) {
              ent.isCountering = false;
              ent._counterPunchTimer = 0;
              ent._counterWindupTimer = 0;
              ent._postCounterRecoveryTimer = 0;
            }
            if (typeof ent.cancelRed === 'function') {
              ent.cancelRed(true);
            }
            if (typeof ent.interruptAttacks === 'function') {
              ent.interruptAttacks(true);
            }
            const slowMult = CONFIG.yuta?.pureLoveBeamSlowMultiplier ?? 0.35;
            if (typeof ent.applySlow === 'function') {
              if (ent.isCJDriveBy) {
                ent.applySlow(slowMult, 15);
              } else {
                ent.applySlow(15, slowMult, { isPureLoveBeam: true });
              }
            } else if (ent.statusEffects && typeof ent.statusEffects.applySlow === 'function') {
              ent.statusEffects.applySlow(15, slowMult, { isPureLoveBeam: true });
            } else {
              ent.slowTimer = Math.max(ent.slowTimer || 0, 15);
              ent.slowMultiplier = Math.min(ent.slowMultiplier || 1.0, slowMult);
            }
          }
          
          const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
          const r = ent.r || 25;
          const minX = arena ? (arena.x + r) : -Infinity;
          const maxX = arena ? (arena.x + arena.width - r) : Infinity;
          const minY = arena ? (arena.y + r) : -Infinity;
          const maxY = arena ? (arena.y + arena.height - r) : Infinity;

          if (!ent.isBaguvixActive && !ent.isGodModeActive) {
            const isMakimaShatter = Boolean(ent && (ent.isRevivingFromContract || ent.isShatterReviving || (ent.shatteredPieces && ent.shatteredPieces.length > 0) || (ent.characterId === 'makima' && (ent.isDead || ent.dead || ent.hp <= 0))));
            const isIchigo = ent.characterId === 'ichigo' || ent.type === 'ichigo' || (ent._def && (ent._def.id === 'ichigo' || ent._def.type === 'ichigo'));
            if (isMakimaShatter) {
              ent.vx = 0;
              ent.vy = 0;
              ent.knockbackVx = 0;
              ent.knockbackVy = 0;
              if (typeof ent._shatterLockedX === 'number' && typeof ent._shatterLockedY === 'number') {
                ent.x = ent._shatterLockedX;
                ent.y = ent._shatterLockedY;
              }
            } else if (!isIchigo) {
              const pushForce = p.knockback || 6;
              const pushAngle = p.angle;
              if (typeof ent.applyKnockback === 'function') {
                ent.applyKnockback(Math.cos(pushAngle) * pushForce, Math.sin(pushAngle) * pushForce, { isPureLoveBeam: true });
              } else {
                ent.vx = (ent.vx || 0) + Math.cos(pushAngle) * pushForce;
                ent.vy = (ent.vy || 0) + Math.sin(pushAngle) * pushForce;
              }
              if (arena) {
                ent.x = Math.max(minX, Math.min(maxX, ent.x));
                ent.y = Math.max(minY, Math.min(maxY, ent.y));
              }
            }
          }
          
          spawnImpactFlash(ent.x, ent.y, 50, 'rgba(255, 20, 147, 0.7)');
          spawnSparks(ent.x, ent.y, 4, 'rikaCurse');
        } else if (ent.wasCaughtInPureLoveBeam || ent.caughtInPureLoveBeam) {
          ent.caughtInPureLoveBeam = false;
          ent.wasCaughtInPureLoveBeam = false;
          ent.pureLoveBeamTimer = 0;
          ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 120;
          if (typeof ent.interruptAttacks === 'function') {
            ent.interruptAttacks();
          }

          if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent._def?.id === 'mahoraga') {
            if (typeof ent.adaptToPureLoveBeam === 'function') {
              ent.adaptToPureLoveBeam();
            }
          }
        }
      }
    }
    
    // Beam lifetime logic - strictly synced with owner fighter's active timer
    if (ownerFighter && ownerFighter.isFiringPureLoveBeam) {
      p.life = ownerFighter.pureLoveBeamActiveTimer;
      p.maxLife = CONFIG.yuta?.pureLoveBeamDuration || 280;
    }

    if (!ownerFighter || ownerFighter.hp <= 0 || ownerFighter.isDead || !ownerFighter.isFiringPureLoveBeam || ownerFighter.pureLoveBeamActiveTimer <= 0) {
      const allTargets = [
        ...(state.fighters || []),
        ...(state.illusions || []),
        ...(state.cjDriveBys || [])
      ];
      for (let k = 0; k < allTargets.length; k++) {
        const ent = allTargets[k];
        if (ent) {
          if (ent.wasCaughtInPureLoveBeam || ent.caughtInPureLoveBeam) {
            ent.caughtInPureLoveBeam = false;
            ent.wasCaughtInPureLoveBeam = false;
            ent.pureLoveBeamTimer = 0;
            ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 120;
            
            if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent._def?.id === 'mahoraga') {
              if (typeof ent.adaptToPureLoveBeam === 'function') {
                ent.adaptToPureLoveBeam();
              }
            }
          }
        }
      }
      return true; // Destroy beam
    }

    return false; // Beam remains active while ownerFighter is firing
  }

  onHit(projectile, target, attacker, fighters, system) {
    // Pure Love Beam pierces all targets and handles continuous damage/stun in update()
    return false; // Do NOT destroy beam on hit
  }

  checkExpire(projectile, system) {
    if (projectile.ownerFighter && (!projectile.ownerFighter.isFiringPureLoveBeam || projectile.ownerFighter.hp <= 0 || projectile.ownerFighter.isDead)) {
      return true;
    }
    if (projectile.owner !== undefined && typeof state !== 'undefined' && state.fighters) {
      const ownerFighter = state.fighters[projectile.owner] || projectile.ownerFighter;
      if (!ownerFighter || ownerFighter.hp <= 0 || ownerFighter.isDead || !ownerFighter.isFiringPureLoveBeam) {
        return true;
      }
      return false;
    }
    if (projectile.life <= 0) return true;
    return false; // Beam lifetime is controlled by owner fighter timer, not arena boundaries
  }
}
