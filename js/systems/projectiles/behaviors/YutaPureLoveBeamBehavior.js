import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';

export class YutaPureLoveBeamBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const ownerFighter = fighters[p.owner];
    if (!ownerFighter || ownerFighter.hp <= 0 || ownerFighter.isDead) {
      return true; // Extinguish and destroy beam immediately if Yuta dies!
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
        ...(state.illusions || [])
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
        if (ent.owner && ent.owner === ownerFighter) continue;
        
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        const isEnemy = ownerTeam === null || (entIdx !== -1 ? (state.getFighterTeam ? state.getFighterTeam(entIdx) !== ownerTeam : true) : true);
        if (!isEnemy) continue;

        // Line-to-Circle Collision & Origin Proximity Check
        const cx = ent.x;
        const cy = ent.y;
        const radius = ent.r || 20;
        
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
          const normalizedOffAxis = Math.min(1.0, distFromAxis / Math.max(1, currentBeamRadius + radius));
          const widthSpreadDamageMult = 1.0 - (normalizedOffAxis * 0.35);
          const finalDamage = p.damage * widthSpreadDamageMult;

          if (p.hitTargets && !p.hitTargets.has(ent)) {
            p.hitTargets.add(ent);
            
            if (typeof ent.takeDamage === 'function') {
              ent.takeDamage(finalDamage, ownerFighter, { isPureLoveBeam: true, bypassShield: true });
              const dmgGain = CONFIG.yuta?.pureLoveBeamDamageStackPerTick ?? 0.5;
              ownerFighter.pureLoveBeamBonusDamage = (ownerFighter.pureLoveBeamBonusDamage || 0) + dmgGain;
              p.damage = (p.damage || CONFIG.yuta?.pureLoveBeamDamagePerTick || 12) + dmgGain;

              const lifestealPct = CONFIG.yuta?.pureLoveBeamLifestealPct ?? 0.1;
              const healAmount = finalDamage * lifestealPct;
              if (healAmount > 0 && typeof ownerFighter.takeDamage === 'function') {
                ownerFighter.takeDamage(-healAmount, ownerFighter, { isHeal: true });
              }
            }
          }

          ent.caughtInPureLoveBeam = true;
          ent.wasCaughtInPureLoveBeam = true;
          ent.pureLoveBeamTimer = 10;
          ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 15;
          ent.pureLoveBeamRegenDebuffTimer = CONFIG.yuta?.pureLoveBeamRegenDebuffDuration ?? 600; // Disable & reduce regen after beam expires

          if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent._def?.id === 'mahoraga') {
            ent.neutralStanceTimer = 0;
            ent.neutralStanceCooldownTimer = 300;
            ent.adaptationDashTimer = 0;
            ent.isInfinityBlitz = false;
            ent.isBlitzActive = false;
            ent.isWallSlamActive = false;
          }
          
          if (typeof ent.interruptAttacks === 'function') {
            ent.interruptAttacks();
          }
          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(8);
          }
          
          const arena = state.arena || CONFIG.arena;
          const isTouchingWall = arena && (
            (ent.x - ent.r <= arena.x + 5) ||
            (ent.x + ent.r >= arena.x + arena.width - 5) ||
            (ent.y - ent.r <= arena.y + 5) ||
            (ent.y + ent.r >= arena.y + arena.height - 5)
          );

          if (isTouchingWall) {
            ent.vx = 0;
            ent.vy = 0;
            ent.knockbackVx = 0;
            ent.knockbackVy = 0;
          } else {
            const pushForce = p.knockback || 6;
            const pushAngle = p.angle;
            if (ent.applyKnockback) {
              ent.applyKnockback(Math.cos(pushAngle) * pushForce, Math.sin(pushAngle) * pushForce);
            } else {
              ent.vx = (ent.vx || 0) + Math.cos(pushAngle) * pushForce;
              ent.vy = (ent.vy || 0) + Math.sin(pushAngle) * pushForce;
            }
          }
          
          spawnImpactFlash(ent.x, ent.y, 50, 'rgba(255, 20, 147, 0.7)');
          spawnSparks(ent.x, ent.y, 4, 'rikaCurse');
        } else if (ent.wasCaughtInPureLoveBeam || ent.caughtInPureLoveBeam) {
          ent.caughtInPureLoveBeam = false;
          ent.wasCaughtInPureLoveBeam = false;
          ent.pureLoveBeamTimer = 0;
          ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 15;
          if (typeof ent.interruptAttacks === 'function') {
            ent.interruptAttacks();
          }
          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(15);
          }

          if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent._def?.id === 'mahoraga') {
            if (typeof ent.adaptToPureLoveBeam === 'function') {
              ent.adaptToPureLoveBeam();
            }
          }
        }
      }
    }
    
    // Beam lifetime logic
    p.life -= 1;
    if (p.life <= 0) {
      const allTargets = [
        ...(state.fighters || []),
        ...(state.illusions || [])
      ];
      for (let k = 0; k < allTargets.length; k++) {
        const ent = allTargets[k];
        if (ent) {
          if (ent.wasCaughtInPureLoveBeam || ent.caughtInPureLoveBeam) {
            ent.caughtInPureLoveBeam = false;
            ent.wasCaughtInPureLoveBeam = false;
            ent.pureLoveBeamTimer = 0;
            ent.pureLoveBeamRecoveryTimer = CONFIG.yuta?.pureLoveBeamStunDuration ?? 15;
            
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

    return false; // Beam remains active while life > 0
  }

  onHit(projectile, target, attacker, fighters, system) {
    // Pure Love Beam pierces all targets and handles continuous damage/stun in update()
    return false; // Do NOT destroy beam on hit
  }

  checkExpire(projectile, system) {
    if (projectile.life <= 0) return true;
    return false; // Beam lifetime is controlled by life property, not arena boundaries
  }
}
