import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { state, triggerGlobalScreenShake } from '../core/state.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getSkillSound } from '../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact } from '../graphics/particles/sparkEffect.js';

export const HitImpactSystem = {
  /**
   * Checks if two fighters are on the same team.
   */
  areOnSameTeam(ownerIndex, targetIndex) {
    if (state.mode !== GAME_MODES.TWO_VS_TWO && state.mode !== GAME_MODES.STAND_OFF_1V2) return false;
    const ownerTeam = state.getFighterTeam(ownerIndex);
    const targetTeam = state.getFighterTeam(targetIndex);
    return ownerTeam !== null && ownerTeam === targetTeam;
  },

  /**
   * Processes visual and auditory feedback, debuffs, and piercing/bouncing when a projectile hits a target.
   * @param {Object} target - The fighter or illusion that was hit.
   * @param {Object} projectile - The projectile object.
   * @param {Object} attacker - The fighter who shot the projectile.
   * @param {Array} fighters - All fighters (used for bouncing targeting).
   * @returns {boolean} - true if projectile should be destroyed, false if it should pierce/bounce and continue.
   */
  processProjectileHit(target, projectile, attacker, fighters) {
    const isSukunaSlash = projectile.visual === 'sukunaSlash' || projectile.visual === 'sukunaCleave' || projectile.visual === 'sukunaDismantleGrid' || projectile.visual === 'ghostBlade' || projectile.isSukunaSlash;
    const isMahoragaThrow = projectile.visual === 'mahoragaBasaltMonolith' || projectile.visual === 'mahoragaRuinConcrete' || projectile.visual === 'mahoragaLavaRubble';
    
    if (isSukunaSlash || isMahoragaThrow) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      
      // Spawn rock dust, pale stone shatter fragments, & crunching impact flash
      if (isMahoragaThrow) {
        spawnSparks(target.x, target.y, 16, 'paleStoneShatter');
        spawnImpactFlash(target.x, target.y, 35, '#E2E8F0');
        audioSystem.playSFX('attack_fleshhit', 0.8);
        audioSystem.playSFX('attack_groundsmash', 0.4);
      } else {
        spawnSparks(target.x, target.y, 10, 'crimsonSniper');
        spawnImpactFlash(target.x, target.y, 25, 'crimsonSniper');
        audioSystem.playSFX('attack_fleshhit', 0.5);

        if (attacker) {
          if (!attacker.slashHitVisuals) attacker.slashHitVisuals = [];
          const hitAngle = Math.atan2(projectile.vy, projectile.vx);
          attacker.slashHitVisuals.push({
            x: target.x + (Math.random() - 0.5) * target.r * 0.4,
            y: target.y + (Math.random() - 0.5) * target.r * 0.4,
            angle: hitAngle + (Math.random() - 0.5) * 0.4,
            timer: 12,
            maxTimer: 12,
            scale: 1.0 + Math.random() * 0.4
          });
        }
      }

      // Apply physical push backward on hit (using throwKnockback config for Mahoraga!)
      const knockbackForce = (isMahoragaThrow && CONFIG.mahoraga?.throwKnockback !== undefined) ? CONFIG.mahoraga.throwKnockback : 6.0; 
      const angle = Math.atan2(projectile.vy, projectile.vx);
      target.vx += Math.cos(angle) * knockbackForce;
      target.vy += Math.sin(angle) * knockbackForce;
      target.x += Math.cos(angle) * (knockbackForce * 0.5);
      target.y += Math.sin(angle) * (knockbackForce * 0.5);
      if (typeof target.applyHitStun === 'function') target.applyHitStun(8);
      
      return false; // Pierce through every enemy
    } 
    
    if (projectile.visual === 'crimsonSniperBullet_enhanced' || projectile.visual === 'tricksterSniperBullet_enhanced') {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      
      const isTrickster = projectile.visual === 'tricksterSniperBullet_enhanced';
      
      if (isTrickster) {
        spawnSparks(target.x, target.y, 8, 'lightningTrail', 'rgba(0, 255, 0, 1)');
        spawnImpactFlash(target.x, target.y, 25, 'lightningTrail'); 
        if (typeof spawnCrimsonLightningImpact === 'function') {
          spawnCrimsonLightningImpact(target.x, target.y, 50, true);
        }
      } else {
        spawnSparks(target.x, target.y, 8, 'crimsonSniper');
        spawnImpactFlash(target.x, target.y, 25, 'crimsonSniper');
        if (typeof spawnCrimsonLightningImpact === 'function') {
          spawnCrimsonLightningImpact(target.x, target.y, 50, false);
        }
      }
      
      const duration = CONFIG.sharpshooter?.electrifiedDuration || 45;
      target.crimsonElectrifiedTimer = Math.max(target.crimsonElectrifiedTimer || 0, duration);
      target.crimsonElectrifiedTrickster = isTrickster;
      target.lastCrimsonAttacker = attacker;
      return false; // Pierce
    } 
    
    if (projectile.isGojoPurple) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      spawnSparks(target.x, target.y, 8, 'lightningTrail', '#8A2BE2');
      spawnImpactFlash(target.x, target.y, 35, 'lightningTrail');
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(2, 4);
      }
      return false; // Pierce
    } 
    
    if (projectile.isGojoBlue) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      if (!projectile.hitFighters.has(target)) {
        projectile.hitFighters.add(target);
        spawnSparks(target.x, target.y, 6, 'lightningTrail', '#00D4CC');
        spawnImpactFlash(target.x, target.y, 20, 'lightningTrail');
      }
      return false; // Pierce
    } 
    
    if (projectile.isArcaneBolt) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      if (projectile.bouncesLeft > 0) {
        projectile.bouncesLeft--;
        projectile.damage *= projectile.bounceDamageMultiplier;
        let bestDist = Infinity;
        let bestFighter = null;
        for (let f of fighters) {
          if (f && f !== target && f !== attacker && f.hp > 0 && !projectile.hitFighters.has(f)) {
            const ddx = f.x - projectile.x;
            const ddy = f.y - projectile.y;
            const distSq = ddx * ddx + ddy * ddy;
            if (distSq < bestDist) {
              bestDist = distSq;
              bestFighter = f;
            }
          }
        }
        if (bestFighter) {
          const ddx = bestFighter.x - projectile.x;
          const ddy = bestFighter.y - projectile.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy) || 1;
          projectile.vx = (ddx / dist) * speed;
          projectile.vy = (ddy / dist) * speed;
          projectile.life = 180;
        }
        return false;
      } else {
        return true;
      }
    } 
    
    if (projectile.isChainLightning) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      
      // Apply Zeus Debuffs
      if (Math.random() < (CONFIG.zeus.staticChance || 0)) {
        target.staticDebuffTimer = CONFIG.zeus.staticDuration || 120;
      }
      if (Math.random() < (CONFIG.zeus.stunChance || 0)) {
        target.electricStunTimer = Math.max(target.electricStunTimer || 0, CONFIG.zeus.stunDuration || 15);
      }
      
      // Apply dramatic hit-pause and screen shake ONLY on the direct hit (not on bounces)
      if (projectile.hitFighters.size === 1) {
        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(2);
        }
        if (attacker && typeof attacker.applyTimeStop === 'function') {
          attacker.applyTimeStop(2);
        }
        
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(2, 4);
        }
      }
      
      // Apply visual thunder roots effect
      target.thunderRootsTimer = Math.max(target.thunderRootsTimer || 0, 45);
      
      // Add vertical thunder strike visual and electric roots
      if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
      state.zeusStormStrikes.push({
        x: target.x,
        y: target.y,
        life: 15,
        maxLife: 15
      });
      
      spawnImpactFlash(target.x, target.y, 50, 'lightningTrail');
      
      // Play thunder strike sound on basic attack hit
      if (attacker && typeof attacker._def !== 'undefined') {
        const stormSound = getSkillSound(attacker._def.id, 'storm');
        if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.5);
        const thunderSound = getSkillSound(attacker._def.id, 'thunderstrike');
        if (thunderSound) audioSystem.playSFX(thunderSound.src, (thunderSound.volume || 1.0) * 0.5);
      }
      
      if (projectile.chainCount > 0) {
        projectile.chainCount--;
        projectile.damage *= (CONFIG.zeus.chainDamageMultiplier || 0.8);
        
        // Find nearest valid enemy to chain towards
        let bestDist = (CONFIG.zeus.chainRange || 150) ** 2;
        let bestTarget = null;
        
        const checkTarget = (t, index = null) => {
          let isEnemy = false;
          if (index !== null) {
            isEnemy = !this.areOnSameTeam(projectile.owner, index);
          } else if (t.owner) {
            isEnemy = !this.areOnSameTeam(projectile.owner, fighters.indexOf(t.owner));
          }
          
          if (t && t !== target && t !== attacker && t.hp > 0 && !projectile.hitFighters.has(t) && isEnemy) {
            const ddx = t.x - projectile.x;
            const ddy = t.y - projectile.y;
            const distSq = ddx * ddx + ddy * ddy;
            if (distSq < bestDist) {
              bestDist = distSq;
              bestTarget = t;
            }
          }
        };

        for (let i = 0; i < fighters.length; i++) {
          checkTarget(fighters[i], i);
        }
        if (state.illusions) {
          for (let ill of state.illusions) {
            checkTarget(ill);
          }
        }
        
        if (bestTarget) {
          const ddx = bestTarget.x - projectile.x;
          const ddy = bestTarget.y - projectile.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy) || 1;
          projectile.vx = (ddx / dist) * speed;
          projectile.vy = (ddy / dist) * speed;
          projectile.life = 100;
        } else {
          const angle = Math.atan2(projectile.vy, projectile.vx) + (Math.random() - 0.5) * Math.PI;
          const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy) || 1;
          projectile.vx = Math.cos(angle) * speed;
          projectile.vy = Math.sin(angle) * speed;
        }
        return false;
      } else {
        return true; 
      }
    }

    return true; // Default behavior: destroy projectile
  }
};
