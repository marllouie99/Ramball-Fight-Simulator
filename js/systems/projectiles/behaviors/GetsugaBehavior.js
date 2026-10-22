import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { applyDamageToTarget, suppressAfterimagesAndAttackEffects, isSuppressedByGetsuga } from '../../../entities/fighter.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { resolveProjectilePlusObstacleCollision, checkRayIntersectsPlusObstacle } from '../../../systems/arenaObstacleSystem.js';

const _candidatePool = [];

export class GetsugaBehavior extends ProjectileBehavior {
  update(projectile, fighters, system) {
    // 0. Gojo Limitless Infinity Stasis / Fading / Expiration Guard
    if (projectile.isFrozenByInfinity || projectile.isVisual || projectile.damage === 0 || projectile.fadingOut || (projectile.life !== undefined && projectile.life <= 0)) {
      if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
        for (const [target] of projectile.draggedTargets.entries()) {
          if (target) {
            target.isDraggedByGetsuga = false;
            target.preventKnockbackBounce = false;
            target.z = 0;
          }
        }
        projectile.draggedTargets.clear();
      }
      if (projectile.dragTimers) projectile.dragTimers.clear();
      return false;
    }

    const form = projectile.getsugaForm || 'shikai';
    const isFinal = form === 'final_bankai';
    const isBankaiForm = form === 'bankai' || form === 'bankai_hollow';
    const isMaskForm = form === 'hollow' || form === 'bankai_hollow';
    const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

    const ownerIdx = projectile.owner;
    const attacker = (fighters && fighters[ownerIdx]) || (typeof state !== 'undefined' && state.fighters ? state.fighters[ownerIdx] : null);
    const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : null;

    // ── Continuous arena screen shake while Getsuga Tensho travels across the arena ──
    if (!projectile.hasHitWall && (projectile.vx !== 0 || projectile.vy !== 0)) {
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

    // ── Getsuga Tensho Wall Collision, Slow Forward Penetration & Arena Clipping ──
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

      // Top center cutting apex of Getsuga Tensho (anchored strictly at the crescent outer center curve)
      const apexDist = effectiveRadius * 0.872;
      const apexOffsetX = Math.cos(ang) * apexDist;
      const apexOffsetY = Math.sin(ang) * apexDist;
      const curApexX = projectile.x + apexOffsetX;
      const curApexY = projectile.y + apexOffsetY;
      const nextApexX = curApexX + projectile.vx;
      const nextApexY = curApexY + projectile.vy;

      const creepSpeed = isFinal
        ? (CONFIG.ichigo?.bankaiFinalGetsugaWallCreepSpeed ?? 1.5)
        : (CONFIG.ichigo?.getsugaWallCreepSpeed ?? 1.2);

      if (!projectile.hasHitWall) {
        let hitWall = false;
        let hitContactX = nextApexX;
        let hitContactY = nextApexY;

        // Check center obstacle collision strictly at the cutting apex ray without false-positive padding
        const obsHit = checkRayIntersectsPlusObstacle(curApexX, curApexY, nextApexX, nextApexY, arena, 0);
        if (obsHit) {
          hitWall = true;
          hitContactX = obsHit.hitX;
          hitContactY = obsHit.hitY;
        }

        if (!hitWall) {
          if (arena.shape === 'circle') {
            const cx = arena.x + arena.width / 2;
            const cy = arena.y + arena.height / 2;
            const ar = arena.radius || (arena.width / 2);
            const curDist = Math.hypot(curApexX - cx, curApexY - cy);
            const nextDist = Math.hypot(nextApexX - cx, nextApexY - cy);

            if ((curDist < ar && nextDist >= ar) || (curDist >= ar && nextDist >= curDist)) {
              hitWall = true;
              const contactAngle = Math.atan2(nextApexY - cy, nextApexX - cx);
              hitContactX = cx + Math.cos(contactAngle) * ar;
              hitContactY = cy + Math.sin(contactAngle) * ar;
            }
          } else {
            const minX = arena.x;
            const maxX = arena.x + arena.width;
            const minY = arena.y;
            const maxY = arena.y + arena.height;

            let bestT = Infinity;
            let bestX = nextApexX;
            let bestY = nextApexY;

            // Check Right Wall (X = maxX)
            if (projectile.vx > 0) {
              if (curApexX >= maxX && curApexY >= minY && curApexY <= maxY) {
                bestT = 0;
                bestX = maxX;
                bestY = curApexY;
                hitWall = true;
              } else if (curApexX < maxX && nextApexX >= maxX) {
                const t = (maxX - curApexX) / projectile.vx;
                const yCross = curApexY + t * projectile.vy;
                if (yCross >= minY && yCross <= maxY && t < bestT) {
                  bestT = t;
                  bestX = maxX;
                  bestY = yCross;
                  hitWall = true;
                }
              }
            }

            // Check Left Wall (X = minX)
            if (projectile.vx < 0) {
              if (curApexX <= minX && curApexY >= minY && curApexY <= maxY) {
                bestT = 0;
                bestX = minX;
                bestY = curApexY;
                hitWall = true;
              } else if (curApexX > minX && nextApexX <= minX) {
                const t = (minX - curApexX) / projectile.vx;
                const yCross = curApexY + t * projectile.vy;
                if (yCross >= minY && yCross <= maxY && t < bestT) {
                  bestT = t;
                  bestX = minX;
                  bestY = yCross;
                  hitWall = true;
                }
              }
            }

            // Check Top Wall (Y = minY)
            if (projectile.vy < 0) {
              if (curApexY <= minY && curApexX >= minX && curApexX <= maxX) {
                if (0 < bestT) {
                  bestT = 0;
                  bestX = curApexX;
                  bestY = minY;
                  hitWall = true;
                }
              } else if (curApexY > minY && nextApexY <= minY) {
                const t = (minY - curApexY) / projectile.vy;
                const xCross = curApexX + t * projectile.vx;
                if (xCross >= minX && xCross <= maxX && t < bestT) {
                  bestT = t;
                  bestX = xCross;
                  bestY = minY;
                  hitWall = true;
                }
              }
            }

            // Check Bottom Wall (Y = maxY)
            if (projectile.vy > 0) {
              if (curApexY >= maxY && curApexX >= minX && curApexX <= maxX) {
                if (0 < bestT) {
                  bestT = 0;
                  bestX = curApexX;
                  bestY = maxY;
                  hitWall = true;
                }
              } else if (curApexY < maxY && nextApexY >= maxY) {
                const t = (maxY - curApexY) / projectile.vy;
                const xCross = curApexX + t * projectile.vx;
                if (xCross >= minX && xCross <= maxX && t < bestT) {
                  bestT = t;
                  bestX = xCross;
                  bestY = maxY;
                  hitWall = true;
                }
              }
            }

            if (hitWall) {
              hitContactX = bestX;
              hitContactY = bestY;
            }
          }
        }

        if (hitWall) {
          projectile.hasHitWall = true;
          projectile.isWallPenetrating = true;
          projectile.angle = ang;
          projectile.launchAngle = ang;
          projectile._resumeVx = projectile.vx;
          projectile._resumeVy = projectile.vy;
          projectile.wallContactX = hitContactX;
          projectile.wallContactY = hitContactY;

          // Transition to slow forward movement as it cuts into and clips out of the arena
          projectile.vx = Math.cos(ang) * creepSpeed;
          projectile.vy = Math.sin(ang) * creepSpeed;

          // Wall impact burst & heavy screen shake on initial wall collision at the apex contact plane
          if (typeof spawnImpactFlash === 'function') {
            spawnImpactFlash(hitContactX, hitContactY, isFinal ? 45 : 35, projectile.color || '#00E5FF');
          }
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isFinal ? 6.5 : 4.5, isFinal ? 12 : 8);
          }
          const hitSfx = CONFIG.ichigo?.sounds?.getsugaHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
          audioSystem.playSFX(hitSfx, 1.0);
        }
      } else {
        // Projectile is already wall-penetrating: maintain slow forward creep speed as it clips out of the arena
        projectile.vx = Math.cos(ang) * creepSpeed;
        projectile.vy = Math.sin(ang) * creepSpeed;
        projectile.angle = ang;
        projectile.launchAngle = ang;
      }

      // Continuous wall grinding effects and screen shake while penetrating/clipping through the wall
      if (projectile.hasHitWall) {
        projectile.getsugaWallShakeCounter = (projectile.getsugaWallShakeCounter || 0) + 1;
        if (projectile.getsugaWallShakeCounter % 6 === 0) {
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isFinal ? 2.5 : 1.8, 6);
          }
        }
        const sparkX = projectile.wallContactX !== undefined ? projectile.wallContactX : curApexX;
        const sparkY = projectile.wallContactY !== undefined ? projectile.wallContactY : curApexY;
        if (typeof spawnSparks === 'function' && projectile.getsugaWallShakeCounter % 4 === 0) {
          spawnSparks(sparkX, sparkY, 3, projectile.color || '#00E5FF');
        }
      }
    }

    // 1. History tracking for speed trail rendering
    if (!projectile.history) projectile.history = [];
    projectile.history.push({ x: projectile.x, y: projectile.y });
    const maxHist = projectile.historyMax || 10;
    if (projectile.history.length > maxHist) {
      projectile.history.shift();
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

    // 3. Continuous Wave Drag: Carry trapped targets along the wave's path while projectile travels
    if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
      const isBankaiWave = form === 'bankai' || form === 'bankai_hollow' || isFinal;
      const waveRadius = projectile.r || (isFinal
        ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius || 120)
        : (form === 'bankai_hollow'
          ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius || (CONFIG.ichigo?.getsugaRadius || 100))
          : (form === 'hollow'
            ? (CONFIG.ichigo?.hollowGetsugaRadius || (CONFIG.ichigo?.getsugaRadius || 100))
            : (isBankaiWave ? (CONFIG.ichigo?.bankaiGetsugaRadius || 110) : (CONFIG.ichigo?.getsugaRadius || 100)))));

      if (!projectile.dragTimers) projectile.dragTimers = new Map();

      for (const [target] of projectile.draggedTargets.entries()) {
        if (!target || target.hp <= 0 || target.isDead || target.dead) {
          projectile.draggedTargets.delete(target);
          if (projectile.dragTimers) projectile.dragTimers.delete(target);
          if (target) {
            target.isDraggedByGetsuga = false;
            target.preventKnockbackBounce = false;
          }
          continue;
        }

        const dragFrames = (projectile.dragTimers.get(target) || 0) + 1;
        projectile.dragTimers.set(target, dragFrames);

        const distToTarget = Math.hypot(target.x - projectile.x, target.y - projectile.y);
        const tRadius = target.hitRadius || target.r || 25;

        // Check if target is behind the projectile along its forward travel vector
        let isBehindWave = false;
        const travelVx = projectile.vx !== 0 ? projectile.vx : (projectile._resumeVx || 0);
        const travelVy = projectile.vy !== 0 ? projectile.vy : (projectile._resumeVy || 0);
        if (travelVx !== 0 || travelVy !== 0) {
          const moveAngle = Math.atan2(travelVy, travelVx);
          const angleToTarget = Math.atan2(target.y - projectile.y, target.x - projectile.x);
          const angleDiff = Math.atan2(Math.sin(angleToTarget - moveAngle), Math.cos(angleToTarget - moveAngle));
          // If target is behind the forward crescent arc (> 95 deg off travel direction) and past crescent interior
          isBehindWave = Math.abs(angleDiff) > Math.PI * 0.52 && distToTarget > waveRadius * 0.35;
        }

        // Release pinned/dragged target once the wave has clipped past them (at wall or in mid-air),
        // or if they have fallen behind the wave, or if max drag duration (90 frames) exceeded
        const isOutOfReach = distToTarget > waveRadius + tRadius + 20;
        const maxDragFrames = projectile.maxLife || 90;
        if (isOutOfReach || isBehindWave || dragFrames >= maxDragFrames) {
          projectile.draggedTargets.delete(target);
          if (projectile.dragTimers) projectile.dragTimers.delete(target);
          target.isDraggedByGetsuga = false;
          target.preventKnockbackBounce = false;
          continue;
        }

        target.isDraggedByGetsuga = true;
        if (!projectile.hasHitWall && (projectile.vx !== 0 || projectile.vy !== 0)) {
          // Carry trapped target smoothly along with the moving wave
          const dragSpeed = 0.65;
          target.vx = (target.vx || 0) * 0.35 + projectile.vx * dragSpeed;
          target.vy = (target.vy || 0) * 0.35 + projectile.vy * dragSpeed;
          target.knockbackVx = projectile.vx * 0.85;
          target.knockbackVy = projectile.vy * 0.85;
        }
        if (target.characterId === 'eye_of_cthulhu' || target.type === 'eye_of_cthulhu') {
          if (projectile.vx !== 0 || projectile.vy !== 0) {
            target.knockbackVx = projectile.vx * 0.90;
            target.knockbackVy = projectile.vy * 0.90;
            target.vx = projectile.vx * 0.60;
            target.vy = projectile.vy * 0.60;
          }
        }
      }
    }

    _candidatePool.length = 0;
    if (fighters) {
      for (let i = 0; i < fighters.length; i++) _candidatePool.push(fighters[i]);
    }
    if (typeof state !== 'undefined' && state.illusions) {
      for (let i = 0; i < state.illusions.length; i++) _candidatePool.push(state.illusions[i]);
    }
    if (typeof state !== 'undefined' && state.cjDriveBys) {
      for (let i = 0; i < state.cjDriveBys.length; i++) _candidatePool.push(state.cjDriveBys[i]);
    }

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
    if (projectile.isFrozenByInfinity || projectile.isVisual || projectile.damage === 0 || projectile.fadingOut || (projectile.life !== undefined && projectile.life <= 0)) {
      return false;
    }
    for (let i = 0; i < _candidatePool.length; i++) {
      const f = _candidatePool[i];
      if (!f || f.hp <= 0 || f.isDead || f.dead || f.isRespawning || f === attacker || f.owner === attacker) continue;

      const fIdx = (fighters || []).indexOf(f);
      let isEnemy = true;
      if (fIdx !== -1) {
        const theirTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(fIdx) : null;
        if (myTeam !== null && myTeam !== undefined && theirTeam !== null && theirTeam !== undefined) {
          isEnemy = (myTeam !== theirTeam);
        } else if (attacker && attacker.team !== undefined && f.team !== undefined) {
          isEnemy = (attacker.team !== f.team);
        } else {
          isEnemy = (fIdx !== ownerIdx);
        }
      } else if (f.owner) {
        const oIdx = (fighters || []).indexOf(f.owner);
        const theirTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function' && oIdx !== -1) ? state.getFighterTeam(oIdx) : null;
        if (myTeam !== null && myTeam !== undefined && theirTeam !== null && theirTeam !== undefined) {
          isEnemy = (myTeam !== theirTeam);
        } else if (attacker && attacker.team !== undefined && f.owner.team !== undefined) {
          isEnemy = (attacker.team !== f.owner.team);
        } else {
          isEnemy = (oIdx !== ownerIdx);
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

        if (projectile.isFrozenByInfinity || projectile.isVisual || projectile.damage === 0) {
          continue;
        }

        // Apply skill damage (continuous multi-tick damage for ALL Getsuga waves)
        const baseTickDamage = isFinal
          ? (CONFIG.ichigo?.bankaiFinalGetsugaTickDamage || 20)
          : (form === 'bankai_hollow'
            ? (CONFIG.ichigo?.bankaiHollowGetsugaTickDamage || 16)
            : (form === 'hollow'
              ? (CONFIG.ichigo?.hollowGetsugaTickDamage || 12)
              : (isBankai
                ? (CONFIG.ichigo?.bankaiGetsugaTickDamage || 12)
                : (CONFIG.ichigo?.getsugaTickDamage || 12))));
        const tickDamage = (typeof projectile.damage === 'number' && projectile.damage > 0)
          ? Math.max(projectile.damage, baseTickDamage)
          : baseTickDamage;
        applyDamageToTarget(f, tickDamage, attacker, { isSkill: true, isGetsuga: true, getsugaForm: form, isFinalGetsugaTick: isFinal, isFinalMassiveGetsuga: isFinal, projectile });

        // If the projectile became frozen by Gojo's Infinity during damage application, immediately halt and return
        if (projectile.isFrozenByInfinity || projectile.damage === 0 || projectile.isVisual) {
          _candidatePool.length = 0;
          return false;
        }
        if (typeof f.clearAllAfterimages === 'function') {
          f.clearAllAfterimages();
        }

        const isGetsugaAdapted = Boolean(f.adaptedGetsuga || (f.adaptedSkills && (f.adaptedSkills['getsugaTensho'] || f.adaptedSkills['getsuga'])));

        const pad = f.r || 25;
        const isTargetAtWall = arena && (
          f.x <= arena.x + pad + 2 ||
          f.x >= arena.x + arena.width - pad - 2 ||
          f.y <= arena.y + pad + 2 ||
          f.y >= arena.y + arena.height - pad - 2
        );

        const isSaitamaCounter = Boolean(f && (f.characterId === 'saitama' || f.type === 'saitama') && (f.isCountering || (f._counterPunchTimer && f._counterPunchTimer > 0) || (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0)));
        const isMakimaShatter = Boolean(f && (f.isRevivingFromContract || f.isShatterReviving || (f.shatteredPieces && f.shatteredPieces.length > 0) || (f.characterId === 'makima' && (f.isDead || f.dead || f.hp <= 0))));
        const isEscanorImmune = Boolean(f && (
          f.characterId === 'escanor' ||
          f.type === 'escanor' ||
          f.immuneToPull ||
          (f.immuneToKnockback && f.characterId !== 'eye_of_cthulhu' && f.type !== 'eye_of_cthulhu')
        ));
        if (isMakimaShatter) {
          f.vx = 0;
          f.vy = 0;
          f.knockbackVx = 0;
          f.knockbackVy = 0;
          if (typeof f._shatterLockedX === 'number' && typeof f._shatterLockedY === 'number') {
            f.x = f._shatterLockedX;
            f.y = f._shatterLockedY;
          }
        } else if (isSaitamaCounter || isEscanorImmune) {
          f.isDraggedByGetsuga = false;
          f.preventKnockbackBounce = false;
          if (projectile.draggedTargets && projectile.draggedTargets.has(f)) {
            projectile.draggedTargets.delete(f);
          }
          f.knockbackVx = 0;
          f.knockbackVy = 0;
        } else if (projectile.vx !== 0 || projectile.vy !== 0 || projectile._resumeVx !== undefined || projectile.launchAngle !== undefined) {
          f.isDraggedByGetsuga = true;
          if (!projectile.draggedTargets) projectile.draggedTargets = new Map();
          projectile.draggedTargets.set(f, true);
          const travelVx = projectile.vx !== 0 ? projectile.vx : (projectile._resumeVx || 0);
          const travelVy = projectile.vy !== 0 ? projectile.vy : (projectile._resumeVy || 0);
          const angle = (travelVx !== 0 || travelVy !== 0)
            ? Math.atan2(travelVy, travelVx)
            : (projectile.launchAngle !== undefined ? projectile.launchAngle : (projectile.angle || 0));
          const kbForce = isFinal
            ? (CONFIG.ichigo?.bankaiFinalGetsugaKnockback || 30)
            : (isMask
              ? (CONFIG.ichigo?.hollowGetsugaKnockback || 8)
              : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaKnockback || 8) : (CONFIG.ichigo?.getsugaKnockback || 6)));
          if (typeof f.applyKnockback === 'function') {
            f.applyKnockback(
              Math.cos(angle) * kbForce,
              Math.sin(angle) * kbForce,
              0,
              { isGetsuga: true, isDrag: true, isPull: true }
            );
          }
          if (f.characterId === 'eye_of_cthulhu' || f.type === 'eye_of_cthulhu') {
            if (projectile.vx !== 0 || projectile.vy !== 0) {
              f.knockbackVx = projectile.vx * 0.90;
              f.knockbackVy = projectile.vy * 0.90;
              f.vx = projectile.vx * 0.60;
              f.vy = projectile.vy * 0.60;
            } else {
              f.knockbackVx = Math.cos(angle) * 4.0;
              f.knockbackVy = Math.sin(angle) * 4.0;
            }
          }
        }

        // ── Apply Movement Slow Debuff (Immune if Adapted or Saitama Counter!) ──
        if (!isGetsugaAdapted && !isSaitamaCounter) {
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
    _candidatePool.length = 0;

    // 4. Piercing Wave: Destroy regular enemy bullets in the path of Getsuga Tensho
    if (system && system.projectiles) {
      for (let j = 0; j < system.projectiles.length; j++) {
        const other = system.projectiles[j];
        if (!other || other === projectile || other.owner === ownerIdx || other.isGetsuga || other.isGojoPurple || other.isGojoPurpleOrb || other.behaviorType === 'gojo_purple' || other.visual === 'gojoPurple' || other.isSukunaFurnace || other.behaviorType === 'sukuna_furnace' || other.behaviorType === 'yuta_pure_love_beam' || other.visual === 'yuta_pure_love_beam' || other.isPureLoveBeam) continue;
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

    const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;
    const canvas = (typeof state !== 'undefined' && state.canvas) || null;
    const screenW = canvas ? (canvas.width || 2400) : (typeof window !== 'undefined' ? window.innerWidth : 2400);
    const screenH = canvas ? (canvas.height || 1400) : (typeof window !== 'undefined' ? window.innerHeight : 1400);
    const margin = (projectile.r || 50) + 120;

    const boundMinX = (arena && typeof arena.x === 'number') ? arena.x - margin : -margin;
    const boundMaxX = (arena && typeof arena.x === 'number' && typeof arena.width === 'number')
      ? Math.max(arena.x + arena.width + margin, screenW + margin)
      : screenW + margin;
    const boundMinY = (arena && typeof arena.y === 'number') ? arena.y - margin : -margin;
    const boundMaxY = (arena && typeof arena.y === 'number' && typeof arena.height === 'number')
      ? Math.max(arena.y + arena.height + margin, screenH + margin)
      : screenH + margin;

    // Slices through all arena walls slowly until lifespan ends or it passes outer bounds
    const isOutsideBounds = (
      projectile.x < boundMinX ||
      projectile.x > boundMaxX ||
      projectile.y < boundMinY ||
      projectile.y > boundMaxY
    );

    if (projectile.life <= 0 || isOutsideBounds) {
      if (projectile.draggedTargets && projectile.draggedTargets.size > 0) {
        for (const [target] of projectile.draggedTargets.entries()) {
          if (target) {
            target.isDraggedByGetsuga = false;
            target.preventKnockbackBounce = false;
            target.z = 0;
          }
        }
        projectile.draggedTargets.clear();
      }
      if (projectile.dragTimers) projectile.dragTimers.clear();
      if (typeof spawnSparks === 'function') {
        spawnSparks(projectile.x, projectile.y, 16, projectile.color || '#00E5FF');
      }
      return true;
    }
    return false; // Continues slowly moving forward as it clips out to the arena!
  }
}
