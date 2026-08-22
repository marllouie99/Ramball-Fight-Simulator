import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { state } from '../../../core/state.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { triggerGlobalScreenShake } from '../../../core/state.js';
// Re-implement areOnSameTeam locally or export it from a shared utils
function areOnSameTeam(ownerIndex, targetIndex) {
  if (ownerIndex === targetIndex) return true;
  if (!state.mode) return false;
  const isTeamMode = state.mode === '2v2' || state.mode === 'Stand Off';
  if (!isTeamMode) return false;
  const team1 = state.getFighterTeam ? state.getFighterTeam(ownerIndex) : null;
  const team2 = state.getFighterTeam ? state.getFighterTeam(targetIndex) : null;
  return team1 !== null && team1 === team2;
}
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';

export class GojoPurpleBehavior extends ProjectileBehavior {
  static spawn(system, x, y, vx, vy, damage, ownerIndex, dps) {
    const proj = system._getProjectile();
    proj.x = x;
    proj.y = y;
    proj.vx = vx;
    proj.vy = vy;
    proj.r = 45;
    proj.life = CONFIG.gojo?.purpleLife || 250;
    proj.maxLife = proj.life;
    proj.color = '#8A2BE2'; // Purple
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : (CONFIG.gojo?.purpleDamage || 70);
    
    // Core visual/behavior properties
    proj.behaviorType = 'gojo_purple';
    proj.visual = 'gojoPurple';
    proj.isGojoPurple = true; // Backwards compat
    proj.isGojoPurpleOrb = true;
    
    proj.hitTargets = new Set();
    proj.hitFighters = new Set(); // Piercing
    proj.purpleDPS = Number.isFinite(Number(dps)) ? Number(dps) : (CONFIG.gojo?.purpleDPS || 150);
    proj.purpleDPSInterval = CONFIG.gojo?.purpleDPSInterval ?? 10;
    proj.purpleLastDPSTick = 0;
    proj.purpleDamagedFighters = new Set();
    
    // Initialize history for trail effect - Hollow Purple swirling vortex
    proj.history = [];
    proj.history.push({ x: proj.x, y: proj.y });
    proj.historyMax = 20;
    
    // Setup sound
    const sfx = getSkillSound('gojo', 'hollowpurple');
    if (sfx) {
      const audio = audioSystem.playSFX(sfx.src, sfx.volume);
      if (audio) {
        audio.loop = true;
        proj.purpleSoundHandle = audio;
      }
    }
    
    system.projectiles.push(proj);
  }

  update(projectile, fighters, system) {
    // If the round or match has ended, instantly destroy Hollow Purple to prevent lag and screen shakes during the victory screen
    if (state.gameState !== 'playing') {
      projectile.life = 0;
      return true;
    }

    // Advance visual time for animations so it freezes when caught in time sphere
    projectile.visualTime = (projectile.visualTime || Date.now()) + 16.667;

    const ownerTeam = state.getFighterTeam(projectile.owner);
    const purpleSlowDuration = CONFIG.gojo?.purpleSlowDuration || 60;
    const purpleSlowMultiplier = CONFIG.gojo?.purpleSlowMultiplier || 0.5;
    const purplePullForce = CONFIG.gojo?.purplePullForce || 8.0;
    const effectiveRadius = projectile.r || CONFIG.gojo?.purpleRadius || 50; // Hit radius for damage/destruction
    const purplePullRadius = CONFIG.gojo?.purplePullRadius || 280; // Pull/suction range
    
    // Continuous screen shake while purple orb is active
    projectile.purpleShakeCounter = (projectile.purpleShakeCounter || 0) + 1;
    if (projectile.purpleShakeCounter >= 5) {
      projectile.purpleShakeCounter = 0;
      const shakeIntensity = CONFIG.gojo?.purpleShakeIntensity || 2;
      const shakeDuration = CONFIG.gojo?.purpleShakeDuration || 20;
      triggerGlobalScreenShake(shakeIntensity, shakeDuration);
    }
    
    // Destroy incoming enemy projectiles (like Sukuna's slashes) that touch Purple
    for (let j = 0; j < system.projectiles.length; j++) {
        const otherProj = system.projectiles[j];
        if (otherProj === projectile || otherProj.isVisual || otherProj.life <= 0) continue;
        if (areOnSameTeam(projectile.owner, otherProj.owner)) continue;
        if (otherProj.isSukunaFurnace || otherProj.behaviorType === 'sukuna_furnace') continue;
        
        const dx = projectile.x - otherProj.x;
        const dy = projectile.y - otherProj.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= effectiveRadius * effectiveRadius) {
            // Sucked into Hollow Purple and erased from existence
            otherProj.life = 0;
            spawnSparks(otherProj.x, otherProj.y, 3, 'purpleTrail', '#8A2BE2');
        }
    }
    
    const ownerFighter = fighters[projectile.owner];
    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || []),
      ...(state.cjDriveBys || [])
    ];

    // 1. Continuous slow + pull + paralysis effect for targets trapped in the purple orb
    const trapRadius = (effectiveRadius || 50) + 30; // ~80px direct hit trapping radius
    for (let i = 0; i < allTargets.length; i++) {
      const ent = allTargets[i];
      if (!ent || ent.hp <= 0 || ent === ownerFighter) continue;
      if (ent.owner && ent.owner === ownerFighter) continue;
      const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
      if (entIdx !== -1 && areOnSameTeam(projectile.owner, entIdx)) continue;
      if (ent.owner) {
        const ownerIdx = state.fighters ? state.fighters.indexOf(ent.owner) : -1;
        if (ownerIdx !== -1 && areOnSameTeam(projectile.owner, ownerIdx)) continue;
      }
      
      const isMahoraga = ent.characterId === 'mahoraga' || ent.type === 'mahoraga' || ent.name === 'Mahoraga';
      const isPurpleAdapted = isMahoraga && (
        (ent.gojoAdapted && ent.gojoAdapted.purple) || 
        (ent.adaptedSkills && ent.adaptedSkills['purple']) ||
        (ent.gojoAdaptColorHistory && ent.gojoAdaptColorHistory.includes('#8A2BE2')) ||
        ((ent.goldAdaptationStage?.skill || 0) >= 2)
      );
      const isImmune = ent.immuneToCC || ent.characterId === 'toji' || ent.type === 'toji';
      if (!isImmune) {
        const dx = projectile.x - ent.x;
        const dy = projectile.y - ent.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0 && dist < trapRadius) {
          ent.purpleHitTimer = 30; // Refresh purpleHitTimer to suppress blue cyan rings while caught in Purple
          ent.isCaughtInPurple = true;
          // Complete paralysis debuff while caught in Hollow Purple gravitational vortex
          if (typeof ent.interruptAttacks === 'function') {
            ent.interruptAttacks(true);
          }
          if (typeof ent.applyTimeStop === 'function') {
            ent.applyTimeStop(12, { isSkill: true, isUltimate: true, isPurple: true });
          } else {
            ent.timeStopTimer = Math.max(ent.timeStopTimer || 0, 12);
          }
          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(12);
          }
          
          const pullStrength = purplePullForce * (1 - dist / trapRadius);
          ent.vx = (ent.vx || 0) * 0.1;
          ent.vy = (ent.vy || 0) * 0.1;
          
          // Suppress existing knockback so they don't fling out of the orb
          if (ent.knockbackVx !== undefined) ent.knockbackVx *= 0.5;
          if (ent.knockbackVy !== undefined) ent.knockbackVy *= 0.5;

          ent.x += (dx / dist) * pullStrength;
          ent.y += (dy / dist) * pullStrength;
        } else if (dist >= trapRadius && dist < purplePullRadius) {
          // Outer gravitational vortex pull field (irresistible suction towards Purple core)
          const falloff = 1 - (dist - trapRadius) / (purplePullRadius - trapRadius);
          const outerPullSpeed = Math.max(1.8, (purplePullForce * 0.75) * Math.pow(falloff, 1.2));
          const dirX = dx / dist;
          const dirY = dy / dist;

          // Apply heavy slow so enemy cannot walk away against the gravitational vortex
          if (typeof ent.applySlow === 'function') {
            ent.applySlow(10, 0.40, { isPurple: true });
          } else {
            ent.slowTimer = Math.max(ent.slowTimer || 0, 10);
            ent.slowMultiplier = 0.40;
          }

          // Direct positional suction displacement towards orb center
          ent.x += dirX * outerPullSpeed;
          ent.y += dirY * outerPullSpeed;

          // Dampen existing velocity and pull velocity impulse towards core
          ent.vx = (ent.vx || 0) * 0.65 + dirX * (outerPullSpeed * 0.4);
          ent.vy = (ent.vy || 0) * 0.65 + dirY * (outerPullSpeed * 0.4);
          if (ent.knockbackVx !== undefined) ent.knockbackVx *= 0.6;
          if (ent.knockbackVy !== undefined) ent.knockbackVy *= 0.6;
        }
      }
    }

    // 2. DPS tick - damage all valid targets (fighters, illusions & vehicles) trapped inside or pulled into the purple orb's radius
    projectile.purpleLastDPSTick = (projectile.purpleLastDPSTick || 0) + 1;
    if (projectile.purpleLastDPSTick >= projectile.purpleDPSInterval) {
      projectile.purpleLastDPSTick = 0;
      
      const damageRadius = Math.max(effectiveRadius * 1.8, purplePullRadius * 0.70);
      const damageRadiusSq = damageRadius * damageRadius;

      for (let i = 0; i < allTargets.length; i++) {
        const ent = allTargets[i];
        if (!ent || ent.hp <= 0 || ent === ownerFighter) continue;
        if (ent.owner && ent.owner === ownerFighter) continue;
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && areOnSameTeam(projectile.owner, entIdx)) continue;
        if (ent.owner) {
          const ownerIdx = state.fighters ? state.fighters.indexOf(ent.owner) : -1;
          if (ownerIdx !== -1 && areOnSameTeam(projectile.owner, ownerIdx)) continue;
        }
        
        const dx = ent.x - projectile.x;
        const dy = ent.y - projectile.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < damageRadiusSq) {
          const dpsDamage = projectile.purpleDPS * (projectile.purpleDPSInterval / 60);
          if (typeof ent.takeDamage === 'function') {
            ent.takeDamage(dpsDamage, ownerFighter, { isPurpleDPS: true, isProjectile: true, projectile: projectile });
          }
          
          if (ent.vx !== undefined && ent.vy !== undefined && !ent.immuneToCC && ent.characterId !== 'toji' && ent.type !== 'toji') {
            ent.vx *= 0.8;
            ent.vy *= 0.8;
          }
          
          spawnSparks(ent.x, ent.y, 4, 'lightningTrail', '#8A2BE2');
        }
      }
    }
    
    projectile.life -= 1;
    if (projectile.life <= 0) return true;

    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    this.checkExpire(projectile, system);

    return false; // Not destroyed
  }

  onHit(projectile, target, attacker, fighters, system) {
    // Gojo Purple doesn't destroy itself on hit (pierces), handles DPS separately
    return false;
  }

  checkExpire(projectile, system) {
    const arena = CONFIG.arena;
    if (projectile.life <= 0) return true;

    // Clamp position to arena boundaries so it sticks to walls
    // Zero BOTH velocity components on wall contact so the orb stops completely
    // instead of sliding along the wall edge
    const halfR = projectile.r / 2;
    if (projectile.x - halfR < arena.x) { projectile.x = arena.x + halfR; projectile.vx = 0; projectile.vy = 0; }
    if (projectile.x + halfR > arena.x + arena.width) { projectile.x = arena.x + arena.width - halfR; projectile.vx = 0; projectile.vy = 0; }
    if (projectile.y - halfR < arena.y) { projectile.y = arena.y + halfR; projectile.vx = 0; projectile.vy = 0; }
    if (projectile.y + halfR > arena.y + arena.height) { projectile.y = arena.y + arena.height - halfR; projectile.vx = 0; projectile.vy = 0; }

    return false; // Never expire from wall collision
  }
}
