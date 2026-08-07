import { CONFIG } from '../../../core/config.js';
import { spawnFloatingText, state } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { stopSound } from '../../../systems/soundSystem.js';

export const COPIED_TECHNIQUES = [
  'CURSED_SPEECH',
  'THIN_ICE_BREAKER'
];

export function getNextCopiedTechnique(fighter) {
  if (fighter.copiedTechniqueIndex === undefined) {
    fighter.copiedTechniqueIndex = 0;
  } else {
    fighter.copiedTechniqueIndex = (fighter.copiedTechniqueIndex + 1) % COPIED_TECHNIQUES.length;
  }
  return COPIED_TECHNIQUES[fighter.copiedTechniqueIndex];
}

export function executeCopiedTechnique(fighter, angle) {
  const technique = COPIED_TECHNIQUES[fighter.copiedTechniqueIndex || 0];
  
  if (technique === 'CURSED_SPEECH') {
    executeCursedSpeech(fighter);
  } else if (technique === 'THIN_ICE_BREAKER') {
    executeThinIceBreaker(fighter, angle);
  }
}

function executeCursedSpeech(fighter) {
  // Spawn a fast expanding wave or just instantly apply an AoE freeze
  spawnFloatingText(fighter.x, fighter.y - 40, '"DONT MOVE!"', '#FFFFFF');
  
  // Play sound if we had one
  // audioSystem.playSFX('skill_cursedspeech', 0.8);
  
  // We'll handle the actual hit logic by spawning a special visual projectile 
  // that instantly expands and checks collisions in projectileSystem.js, 
  // or we can just apply it directly here.
  
  // Let's spawn an expanding ring projectile to give it a hitbox
  projectileSystem.projectiles.push({
    owner: state.fighters.indexOf(fighter),
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: 10,
    maxR: CONFIG.yuta.cursedSpeechRadius || 150,
    damage: 0, // No damage, just CC
    life: 20,
    maxLife: 20,
    visual: 'cursedSpeechWave',
    isCursedSpeech: true
  });
}

export function executeThinIceBreaker(fighter, angle) {
  const isRikaAlive = typeof fighter.isRikaAliveInDomain === 'function' && fighter.isRikaAliveInDomain();
  const dmgMult = isRikaAlive ? (CONFIG.yuta.domainRikaDamageMultiplier || 1.5) : 1.0;
  const baseDmg = CONFIG.yuta.thinIceBreakerDamage || 45; // Massive burst
  const damage = baseDmg * dmgMult;
  
  // Spatial Crack Effect tracking
  if (!fighter.spatialCracks) fighter.spatialCracks = [];
  
  const originX = fighter.x + Math.cos(angle) * (fighter.r + 5);
  const originY = fighter.y + Math.sin(angle) * (fighter.r + 5);
  
  fighter.spatialCracks.push({
    x: originX,
    y: originY,
    angle: angle,
    timer: 25,
    maxTimer: 25
  });

  const range = 250;
  const coneArc = Math.PI * 0.8; // 144 degrees
  
  if (CONFIG.yuta?.thinIceBreakerSound) {
    const handle = audioSystem.playSFX(
      CONFIG.yuta.thinIceBreakerSound,
      CONFIG.yuta.thinIceBreakerVolume ?? 1.5,
      1.0, 0,
      CONFIG.yuta.thinIceBreakerDelay ?? 0
    );
    const maxDur = CONFIG.yuta?.thinIceBreakerMaxDuration;
    if (handle && typeof maxDur === 'number' && maxDur > 0) {
      setTimeout(() => {
        try { stopSound(handle); } catch (e) {}
      }, maxDur);
    }
  }
  const thinIceBreakerNoiseChance = CONFIG.yuta?.thinIceBreakerNoiseChance ?? 0.35;
  if (CONFIG.yuta?.thinIceBreakerNoiseSound && Math.random() < thinIceBreakerNoiseChance) {
    const handle = audioSystem.playSFX(
      CONFIG.yuta.thinIceBreakerNoiseSound,
      CONFIG.yuta.thinIceBreakerNoiseVolume ?? 1.5,
      1.0, 0,
      CONFIG.yuta.thinIceBreakerNoiseDelay ?? 0
    );
    const maxDur = CONFIG.yuta?.thinIceBreakerNoiseMaxDuration;
    if (handle && typeof maxDur === 'number' && maxDur > 0) {
      setTimeout(() => {
        try { stopSound(handle); } catch (e) {}
      }, maxDur);
    }
  }
  
  // Hit detection
  state.fighters.forEach(target => {
    if (target !== fighter && target.hp > 0) {
      const dx = target.x - originX;
      const dy = target.y - originY;
      const dist = Math.hypot(dx, dy);
      if (dist < range) {
        let targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) < coneArc / 2) {
          // Unblockable hit via 'fromBlackHole' trick which ignores parries
          target.takeDamage(damage, fighter, { fromBlackHole: true }); 
          state.thinIceBreakerDimTimer = 18; // Trigger quick screen dim effect
          
          // Apply massive knockback
          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(angle) * 35, Math.sin(angle) * 35);
          } else {
            target.vx = Math.cos(angle) * 35;
            target.vy = Math.sin(angle) * 35;
          }
          // Removed target.applyHitStun per user request to prevent freezing/locking targets
        }
      }
    }
  });
}
