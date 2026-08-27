import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../core/state.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getSkillSound } from '../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave } from '../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../graphics/particles/bloodEffect.js';
import { handleObstacleCollision, STARTER_MAP } from '../../Tactical Force/maps/index.js';

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
    const isMahoragaThrow = projectile.isMahoragaThrow || projectile.visual === 'mahoragaBasaltMonolith' || projectile.visual === 'mahoragaRuinConcrete' || projectile.visual === 'mahoragaLavaRubble';
    
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
      }

      // Apply physical push backward on hit (only for Mahoraga debris throws, disabled for Sukuna basic slashes)
      if (isMahoragaThrow) {
        const knockbackForce = CONFIG.mahoraga?.throwKnockback !== undefined ? CONFIG.mahoraga.throwKnockback : 12.0; 
        const angle = Math.atan2(projectile.vy || Math.sin(projectile.angle || 0), projectile.vx || Math.cos(projectile.angle || 0));
        
        target.vx = (target.vx || 0) + Math.cos(angle) * knockbackForce;
        target.vy = (target.vy || 0) + Math.sin(angle) * knockbackForce;
        target.x += Math.cos(angle) * (knockbackForce * 0.4);
        target.y += Math.sin(angle) * (knockbackForce * 0.4);

        if (state && state.arena) {
          const minX = state.arena.x + (target.r || 20);
          const maxX = state.arena.x + state.arena.width - (target.r || 20);
          const minY = state.arena.y + (target.r || 20);
          const maxY = state.arena.y + state.arena.height - (target.r || 20);
          target.x = Math.max(minX, Math.min(maxX, target.x));
          target.y = Math.max(minY, Math.min(maxY, target.y));
        }
      }

      return isSukunaSlash ? false : true; // Debris breaks on target hit
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

    // ── Uryu Ishida: Heilig Pfeil (Sacred Spirit Arrow) Hit Processing ──
    if (projectile.visual === 'heiligPfeil' || projectile.isHeiligPfeil) {
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);

      // Reishi impact flash & silver/cyan sparks
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 8, 'cyan', '#00E5FF');
        spawnSparks(target.x, target.y, 4, 'silverStreak', '#FFFFFF');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 24, '#00E5FF');
      }
      if (audioSystem && typeof audioSystem.playSFX === 'function') {
        audioSystem.playSFX('attack_fleshhit', 0.65);
      }

      // Micro-knockback pushing target (safe, non-tunneling)
      const kb = CONFIG.uryu?.arrowKnockback || 2.2;
      const angle = (projectile.lastAngle !== undefined) ? projectile.lastAngle : (Math.atan2(projectile.vy || 0, projectile.vx || 0) || 0);
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb);
      } else {
        target.vx = (target.vx || 0) + Math.cos(angle) * kb;
        target.vy = (target.vy || 0) + Math.sin(angle) * kb;
      }

      // Charge Uryu's Reishi Sklaverei gauge on hit
      if (attacker && (attacker.characterId === 'uryu' || attacker.type === 'uryu')) {
        if (typeof attacker.reishiGauge === 'number' && !attacker.isPiercingLightActive) {
          const gain = CONFIG.uryu?.siphonHitGain || 4.5;
          attacker.reishiGauge = Math.min(100, attacker.reishiGauge + gain);
        }
      }

      // Check Piercing Light state
      if (projectile.isPiercing) {
        if (!projectile.pierceCount) projectile.pierceCount = 0;
        projectile.pierceCount++;
        const maxPierces = projectile.maxPierces || (CONFIG.uryu?.piercingMaxPierces || 4);
        if (projectile.pierceCount < maxPierces) {
          return false; // Continues piercing!
        }
      }
      return true; // Destroyed on final hit
    }

    // Genos Incineration Palm Fireball — Physical push back knockback & impact flash on hit!
    if (projectile.visual === 'genosFireball') {
      const knockbackForce = CONFIG.genos?.blastKnockback || 8.5;
      const hitAngle = Math.atan2(projectile.vy, projectile.vx);

      // 1. Push back (physical directional knockback)
      target.vx += Math.cos(hitAngle) * knockbackForce;
      target.vy += Math.sin(hitAngle) * knockbackForce;
      target.x += Math.cos(hitAngle) * (knockbackForce * 0.4);
      target.y += Math.sin(hitAngle) * (knockbackForce * 0.4);

      // 2. Orange heat impact flash & fiery sparks
      const expRadius = projectile.explosionRadius || 35;
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, expRadius, '#FF5500');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 8, 'orange');
      }

      return true; // Destroy fireball on hit
    }

    // John Wick TTI Pit Viper 9mm — Tactical push back knockback & ballistic impact flash
    if (projectile.visual === 'johnWickBullet') {
      const knockbackForce = CONFIG.john_wick?.bulletHitPushback || 3.5;
      const hitAngle = Math.atan2(projectile.vy, projectile.vx);

      // 1. Physical push back on target along the bullet velocity vector
      target.vx = (target.vx || 0) + Math.cos(hitAngle) * knockbackForce;
      target.vy = (target.vy || 0) + Math.sin(hitAngle) * knockbackForce;
      target.x += Math.cos(hitAngle) * (knockbackForce * 0.45);
      target.y += Math.sin(hitAngle) * (knockbackForce * 0.45);

      // Arena boundary clamp to prevent targets from getting pushed through walls
      if (state && state.arena) {
        const minX = state.arena.x + (target.r || 20);
        const maxX = state.arena.x + state.arena.width - (target.r || 20);
        const minY = state.arena.y + (target.r || 20);
        const maxY = state.arena.y + state.arena.height - (target.r || 20);
        target.x = Math.max(minX, Math.min(maxX, target.x));
        target.y = Math.max(minY, Math.min(maxY, target.y));
      }

      // 2. High-contrast amber/gold kinetic impact sparks & flash
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 22, '#F59E0B');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 8, 'orange');
      }

      // 3. Directional blood splatter particles on bullet entry/exit
      if (typeof spawnBloodEffect === 'function') {
        const bloodMin = CONFIG.john_wick?.bulletHitBloodMinSize ?? 2.5;
        const bloodMax = CONFIG.john_wick?.bulletHitBloodMaxSize ?? 4.8;
        const bloodCount = CONFIG.john_wick?.bulletHitBloodCount ?? 4;
        spawnBloodEffect(target, 12, hitAngle, { minSize: bloodMin, maxSize: bloodMax, count: bloodCount });
      }

      // 4. Crisp flesh hit / ballistic impact SFX
      const hitSfx = CONFIG.john_wick?.sounds?.fleshHit || 'attack_fleshhit';
      const hitVol = CONFIG.john_wick?.soundVolumes?.fleshHit ?? 0.6;
      audioSystem.playSFX(hitSfx, hitVol);

      // 4. Subtle punchy screen shake on direct 9mm pistol bullet impact
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeInt = CONFIG.john_wick?.bulletHitShakeIntensity || 1.4;
        const shakeDur = CONFIG.john_wick?.bulletHitShakeDuration || 3;
        triggerGlobalScreenShake(shakeInt, shakeDur);
      }

      return true; // Bullet spent on impact
    }

    // John Wick Benelli M4 12-Gauge Buckshot Pellet — Staggering push back knockback & heavy kinetic impact
    if (projectile.visual === 'johnWickShotgunPellet') {
      const pelletKnockback = CONFIG.john_wick?.shotgunPelletKnockback || 7.5;
      const hitAngle = Math.atan2(projectile.vy || Math.sin(projectile.angle || 0), projectile.vx || Math.cos(projectile.angle || 0));

      // 1. Heavy physical push back on target along the buckshot velocity vector
      target.vx = (target.vx || 0) + Math.cos(hitAngle) * pelletKnockback;
      target.vy = (target.vy || 0) + Math.sin(hitAngle) * pelletKnockback;
      target.x += Math.cos(hitAngle) * (pelletKnockback * 0.55);
      target.y += Math.sin(hitAngle) * (pelletKnockback * 0.55);

      // Arena boundary clamp to prevent targets from clipping out of bounds
      if (state && state.arena) {
        const minX = state.arena.x + (target.r || 20);
        const maxX = state.arena.x + state.arena.width - (target.r || 20);
        const minY = state.arena.y + (target.r || 20);
        const maxY = state.arena.y + state.arena.height - (target.r || 20);
        target.x = Math.max(minX, Math.min(maxX, target.x));
        target.y = Math.max(minY, Math.min(maxY, target.y));
      }

      // 2. High-impact kinetic orange sparks & fiery flash
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 26, '#F59E0B');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 8, 'orange');
      }

      // 3. Directional blood splatter particles
      if (typeof spawnBloodEffect === 'function') {
        const bloodMin = CONFIG.john_wick?.bulletHitBloodMinSize ?? 2.8;
        const bloodMax = CONFIG.john_wick?.bulletHitBloodMaxSize ?? 5.2;
        spawnBloodEffect(target, 14, hitAngle, { minSize: bloodMin, maxSize: bloodMax, count: 4 });
      }

      // 4. Ballistic impact SFX & heavy 12-gauge screen shake
      const sgHitSfx = CONFIG.john_wick?.sounds?.fleshHit || 'attack_fleshhit';
      const sgHitVol = CONFIG.john_wick?.soundVolumes?.fleshHit ?? 0.8;
      audioSystem.playSFX(sgHitSfx, sgHitVol);
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeInt = CONFIG.john_wick?.shotgunHitShakeIntensity || 4.0;
        const shakeDur = CONFIG.john_wick?.shotgunHitShakeDuration || 7;
        triggerGlobalScreenShake(shakeInt, shakeDur);
      }

      return true; // Pellet spent on impact
    }

    // John Wick TTI M4 Rifle 5.56 NATO — Supersonic penetrator pushback & cyan tracer flash
    if (projectile.visual === 'johnWickRifleBullet') {
      const knockbackForce = CONFIG.john_wick?.rifleBulletPushback || 7.0;
      const hitAngle = Math.atan2(projectile.vy || Math.sin(projectile.angle || 0), projectile.vx || Math.cos(projectile.angle || 0));

      // 1. Physical directional push back
      target.vx = (target.vx || 0) + Math.cos(hitAngle) * knockbackForce;
      target.vy = (target.vy || 0) + Math.sin(hitAngle) * knockbackForce;
      target.x += Math.cos(hitAngle) * (knockbackForce * 0.45);
      target.y += Math.sin(hitAngle) * (knockbackForce * 0.45);

      // Arena boundary clamp
      if (state && state.arena) {
        const minX = state.arena.x + (target.r || 20);
        const maxX = state.arena.x + state.arena.width - (target.r || 20);
        const minY = state.arena.y + (target.r || 20);
        const maxY = state.arena.y + state.arena.height - (target.r || 20);
        target.x = Math.max(minX, Math.min(maxX, target.x));
        target.y = Math.max(minY, Math.min(maxY, target.y));
      }

      // 2. Cyan supersonic tracer spark & flash
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 22, '#06B6D4');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 6, 'cyan');
      }

      // 3. Directional blood splatter particles
      if (typeof spawnBloodEffect === 'function') {
        const bloodMin = CONFIG.john_wick?.bulletHitBloodMinSize ?? 2.4;
        const bloodMax = CONFIG.john_wick?.bulletHitBloodMaxSize ?? 4.5;
        spawnBloodEffect(target, 10, hitAngle, { minSize: bloodMin, maxSize: bloodMax, count: 3 });
      }

      // 4. Ballistic impact SFX & machine gun rapid vibration shake
      const rifleHitSfx = CONFIG.john_wick?.sounds?.fleshHit || 'attack_fleshhit';
      const rifleHitVol = CONFIG.john_wick?.soundVolumes?.fleshHit ?? 0.55;
      audioSystem.playSFX(rifleHitSfx, rifleHitVol);
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeInt = CONFIG.john_wick?.rifleHitShakeIntensity || 0.7;
        const shakeDur = CONFIG.john_wick?.rifleHitShakeDuration || 2;
        triggerGlobalScreenShake(shakeInt, shakeDur);
      }

      return true; // Bullet spent on impact
    }

    // Carl "CJ" Johnson Gunshots (Drive-By Tec-9, Dual Micro-Uzis, Riot Minigun) — Physical push back knockback & ballistic impact flash
    const isCjBullet = projectile.visual === 'cjUziBullet' || projectile.visual === 'cjMinigunBullet' || (attacker && (attacker.characterId === 'cj' || attacker.type === 'cj') && projectile.visual && projectile.visual.includes('cj'));
    if (isCjBullet) {
      const knockbackForce = projectile.knockback || (CONFIG.cj?.gunHitPushback || 3.5);
      const hitAngle = Math.atan2(projectile.vy || Math.sin(projectile.angle || 0), projectile.vx || Math.cos(projectile.angle || 0));

      // 1. Physical push back on target along the bullet velocity vector
      target.vx = (target.vx || 0) + Math.cos(hitAngle) * knockbackForce;
      target.vy = (target.vy || 0) + Math.sin(hitAngle) * knockbackForce;
      target.x += Math.cos(hitAngle) * (knockbackForce * 0.45);
      target.y += Math.sin(hitAngle) * (knockbackForce * 0.45);

      // Arena boundary clamp to prevent targets from getting pushed through walls
      if (state && state.arena) {
        const minX = state.arena.x + (target.r || 20);
        const maxX = state.arena.x + state.arena.width - (target.r || 20);
        const minY = state.arena.y + (target.r || 20);
        const maxY = state.arena.y + state.arena.height - (target.r || 20);
        target.x = Math.max(minX, Math.min(maxX, target.x));
        target.y = Math.max(minY, Math.min(maxY, target.y));
      }

      // 3. High-contrast golden-amber kinetic impact sparks & flash
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 22, '#F59E0B');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 6, '#F59E0B');
      }

      // 4. Directional blood splatter particles on bullet entry/exit
      if (typeof spawnBloodEffect === 'function') {
        spawnBloodEffect(target, 10, hitAngle, { minSize: 2.2, maxSize: 4.2, count: 3 });
      }

      // 5. Subtle punchy screen shake on direct bullet impact
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeInt = CONFIG.cj?.gunHitShakeIntensity || 1.2;
        triggerGlobalScreenShake(shakeInt, 3);
      }

      return true; // Bullet spent on impact
    }

    // Tactical Force Operative Bullets (M4A1, SPAS-12, Desert Eagle, AWP, Barrett M82) — Ballistic impact without knockback
    if (projectile.visual === 'tacticalBullet') {
      const dmg = projectile.damage || 25;
      const hitAngle = Math.atan2(projectile.vy || Math.sin(projectile.angle || 0), projectile.vx || Math.cos(projectile.angle || 0));

      // 1. Directional blood splatter particles on bullet entry/exit
      if (typeof spawnBloodEffect === 'function') {
        const bloodCount = (dmg >= 60) ? 6 : ((dmg >= 30) ? 4 : 3);
        const bloodSize = (dmg >= 60) ? 4.8 : 3.5;
        spawnBloodEffect(target, 12, hitAngle, { minSize: 2.5, maxSize: bloodSize, count: bloodCount });
      }

      // 2. Expanding kinetic shockwave ring visual around target (Visual only, no physical knockback displacement)
      if (typeof spawnMeleeClashShockwave === 'function') {
        const swRadius = (dmg >= 60) ? 55 : ((dmg >= 30) ? 42 : 32);
        const sparkColor = (attacker && attacker.color) ? attacker.color : 'gold';
        spawnMeleeClashShockwave(target.x, target.y, swRadius, sparkColor);
      }

      // 3. Kinetic impact sparks & flash matching operative theme
      const sparkColor = (attacker && attacker.color) ? attacker.color : '#F59E0B';
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, (dmg >= 60) ? 30 : 22, sparkColor);
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, (dmg >= 60) ? 10 : 6, 'orange');
      }

      // 4. Ballistic impact SFX & punchy screen shake on heavy hits
      audioSystem.playSFX('attack_fleshhit', (dmg >= 60) ? 0.9 : 0.6);
      if (dmg >= 50 && typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake((dmg >= 60) ? 5.0 : 2.5, 4);
      }

      return true; // Bullet spent on impact
    }

    // Layla Steampunk Cannon - custom cyan sparks and flash impact effects
    const isLaylaBasic = projectile.visual === 'layla_basic_bullet';
    const isLaylaUlt = projectile.visual === 'layla_ultimate_bullet';
    const isLaylaBomb = projectile.visual === 'layla_bomb';
    if (isLaylaBasic || isLaylaUlt || isLaylaBomb) {
      const sparkCount = isLaylaUlt ? 15 : (isLaylaBomb ? 12 : 7);
      const flashSize = isLaylaUlt ? 38 : (isLaylaBomb ? 28 : 18);
      
      spawnSparks(target.x, target.y, sparkCount, 'laylaSpark');
      spawnImpactFlash(target.x, target.y, flashSize, 'layla');
      
      // Play high-tech energy impact sound
      audioSystem.playSFX('Assets/Sound Effects/Attacks/laserpew.mp3', 0.25);
      return true; // Destroy bullet on hit
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
      const isNewHit = !projectile.hitFighters || !projectile.hitFighters.has(target);
      if (!projectile.hitFighters) projectile.hitFighters = new Set();
      projectile.hitFighters.add(target);
      
      // Apply Zeus Debuffs
      if (Math.random() < (CONFIG.zeus.staticChance || 0)) {
        target.staticDebuffTimer = CONFIG.zeus.staticDuration || 120;
      }

      const zeusAttacker = (typeof projectile.owner === 'number' && state.fighters) ? state.fighters[projectile.owner] : (attacker || null);

      if (isNewHit && zeusAttacker) {
        const currentStunChance = zeusAttacker.stunChance !== undefined ? zeusAttacker.stunChance : (CONFIG.zeus.baseStunChance || 0.10);
        if (Math.random() < currentStunChance) {
          target.electricStunTimer = Math.max(target.electricStunTimer || 0, CONFIG.zeus.stunDuration || 18);
          spawnFloatingText(target.x, target.y - target.r - 5, 'STUNNED!', '#00F3FF');
          // Reset stun chance to base after landing a stun
          zeusAttacker.stunChance = zeusAttacker.baseStunChance || 0.10;
        } else {
          // Increase stun chance on hit
          const inc = CONFIG.zeus.stunChanceIncrease || 0.10;
          const maxCap = CONFIG.zeus.maxStunChance || 0.80;
          zeusAttacker.stunChance = Math.min(maxCap, (zeusAttacker.stunChance || 0.10) + inc);
        }
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

    // Default standard projectile physical pushback & kinetic impulse
    const knockbackForce = projectile.knockback || Math.min(5.5, Math.max(1.8, (projectile.damage || 15) * 0.12));
    const hitAngle = Math.atan2(projectile.vy || 0, projectile.vx || 0.001);
    target.vx = (target.vx || 0) + Math.cos(hitAngle) * knockbackForce;
    target.vy = (target.vy || 0) + Math.sin(hitAngle) * knockbackForce;
    target.x += Math.cos(hitAngle) * (knockbackForce * 0.35);
    target.y += Math.sin(hitAngle) * (knockbackForce * 0.35);

    if (state && state.arena) {
      const minX = state.arena.x + (target.r || 20);
      const maxX = state.arena.x + state.arena.width - (target.r || 20);
      const minY = state.arena.y + (target.r || 20);
      const maxY = state.arena.y + state.arena.height - (target.r || 20);
      target.x = Math.max(minX, Math.min(maxX, target.x));
      target.y = Math.max(minY, Math.min(maxY, target.y));
    }

    return true; // Default behavior: destroy projectile
  }
};
