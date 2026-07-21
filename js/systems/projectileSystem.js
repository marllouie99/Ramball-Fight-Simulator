// ─────────────────────────────────────────────
// PROJECTILE SYSTEM - Dependency Injection Module
// ─────────────────────────────────────────────
import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { state, registerProjectileSystem, triggerGlobalScreenShake } from '../core/state.js';
import { applyDamageToTarget } from '../entities/fighter.js';
import { playSound, playLoopingSound, stopLoopingSound, fadeOutLoopingSound } from './soundSystem.js';
import { getBasicAttackSound } from '../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../soundEffects/skillEffectSounds.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnGroundScorch } from '../graphics/particles/sparkEffect.js';
import { spatialGrid } from './physics.js';

// Frame counter for visual-only particle optimization
let visualUpdateFrame = 0;

/**
 * Checks if two fighters are on the same team (for 2v2 mode).
 * Returns false for non-2v2 modes or if fighters are on different teams.
 */
function areOnSameTeam(ownerIndex, targetIndex) {
  if (state.mode !== GAME_MODES.TWO_VS_TWO) return false;
  const ownerTeam = state.getFighterTeam(ownerIndex);
  const targetTeam = state.getFighterTeam(targetIndex);
  return ownerTeam !== null && ownerTeam === targetTeam;
}

/**
 * ProjectileSystem handles all projectile creation and updates.
 * This allows swapping between production and preview implementations.
 */
class ProjectileSystem {
  constructor() {
    this.projectiles = [];
    this.frozenProjectiles = []; // Decoupled: frozen projectiles are moved here, ignored by update loop
    this.stuckShurikens = []; // Array for shurikens stuck in the wall
    this.poolSize = 500; // Pre-allocate pool size
    this.pool = Array.from({ length: this.poolSize }, () => ({}));
    this.poolIndex = 0; // Circular pointer to reuse objects without array push/pop thrashing
    this.maxActiveProjectiles = 200; // Dynamic limit based on fighter count
    this._preallocatePool();
  }

  /**
   * Pre-allocates the entire pool at startup to eliminate runtime allocations.
   * Uses a template object pattern for fast property reset.
   */
  _preallocatePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.r = 0; p.life = 0; p.maxLife = 0;
      p.owner = null; p.damage = 0; p.isFollowUp = false; p.isBlackHole = false;
      p.isFlame = false; p.isGrenade = false; p.isBomberGrenade = false; p.isC4 = false;
      p.history = [];
    }
  }

  /**
   * Get a projectile from pool or create new one (fallback if pool exhausted).
   */
  _getProjectile() {
    const p = this.pool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.poolSize;
    return p;
  }

  _returnProjectile(proj) {
    proj.isFlame = false;
    proj.isBlackHole = false;
    proj.isGrenade = false;
    proj.isBomberGrenade = false;
    proj.isC4 = false;
    proj.capturedByBlackHole = null;
    proj.stoppedByCronosSphere = false;
    
    // Clear visual flags to fix recycle bugs (e.g., normal projectiles turning into green triangles)
    proj.isExplosion = false;
    proj.isGlassShard = false;
    proj.isPoisonSpill = false;
    proj.isExplosionFlash = false;
    proj.isExplosionFireball = false;
    proj.isExplosionShockwave = false;
    proj.isExplosionSmoke = false;
    proj.isExplosionScorch = false;
    proj.isExplosionEmber = false;
    proj.isExplosionSpark = false;
    proj.isExplosionDebris = false;
    proj.isVisual = false;
    proj.isDeathC4 = false;
    proj.isSticky = false;
    proj.transformed = false;
    proj.visual = null;
    proj.explosionType = null;
    
    if (proj.soundKey) {
      fadeOutLoopingSound(proj.soundKey, 500); // Smooth fade out over 0.5s when projectile dies
      proj.soundKey = null;
    }
    
    if (proj.history) proj.history.length = 0;
  }

  /**
   * Updates dynamic projectile limits based on current fighter count and game mode.
   * Called at the start of each update to adjust performance targets.
   */
  _updateDynamicLimits() {
    const fighterCount = state.fighters.filter(f => f && f.hp > 0).length;
    const illusionCount = state.illusions.filter(i => i && i.hp > 0).length;
    const totalEntities = fighterCount + illusionCount;

    // Reduce projectile limits in multi-player modes
    if (totalEntities >= 6) {
      this.maxActiveProjectiles = 100; // FFA with many entities
    } else if (totalEntities >= 4) {
      this.maxActiveProjectiles = 150; // 2v2 mode
    } else if (state.mode === 'Stand Off') {
      this.maxActiveProjectiles = 120; // Stand Off high HP duel optimization
    } else {
      this.maxActiveProjectiles = 200; // 1v1 mode
    }
  }

  /**
   * Spawns a standard projectile from the fighter's gun barrel tip.
   * Optionally accepts custom spawn position and angle for dual-wield fighters.
   */
  fireProjectile(fighter, ownerIndex, damage, isFollowUp = false, speedOverride, willBecomeBlackHole = false, visual, customSpawnX, customSpawnY, customAngle) {
    // OPTIMIZATION: We used to drop projectiles here if we exceeded maxActiveProjectiles,
    // but that caused real bullets to fail to spawn when there were too many visual particles.
    // We now let the array exceed the limit temporarily, and update() will prune oldest/visual
    // projectiles on the next frame to maintain performance without breaking gameplay.

    const { radius, life } = CONFIG.projectile;
    const speed = speedOverride ?? CONFIG.projectile.speed;
    const projDamage = Number(damage);

    // Use custom spawn position if provided, otherwise calculate from gun tip
    let spawnX, spawnY, dirX, dirY;
    if (customSpawnX !== undefined && customSpawnY !== undefined) {
      spawnX = customSpawnX;
      spawnY = customSpawnY;
      const angle = customAngle !== undefined ? customAngle : fighter.gunAngle;
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
    } else {
      let tipDist = GUN_TIP_DIST(fighter.r);
      dirX = Math.cos(fighter.gunAngle);
      dirY = Math.sin(fighter.gunAngle);
      
      // Prevent "gun clipping" by scaling down the tip spawn offset if an enemy is too close
      if (typeof state !== 'undefined' && state.fighters && typeof spatialGrid !== 'undefined') {
        const nearbyFighters = spatialGrid.getNearby(fighter.x, fighter.y, tipDist + 50);
        for (const f of nearbyFighters) {
          if (f && f !== fighter && f.hp > 0) {
            let isEnemy = false;
            const fi = state.fighters.indexOf(f);
            
            if (fi !== -1) {
              // It's a fighter
              isEnemy = !areOnSameTeam(ownerIndex, fi);
            } else if (f.isIllusion) {
              // It's an illusion
              const illusionOwnerIndex = f.owner?.fighterIndex ?? state.fighters.indexOf(f.owner);
              isEnemy = (illusionOwnerIndex !== ownerIndex) && !areOnSameTeam(ownerIndex, illusionOwnerIndex);
            }

            if (isEnemy) {
              const dx = f.x - fighter.x;
              const dy = f.y - fighter.y;
              const distToEnemy = Math.hypot(dx, dy);
              if (distToEnemy < tipDist + f.r) {
                const maxAllowedTipDist = Math.max(0, distToEnemy - f.r);
                if (maxAllowedTipDist < tipDist) {
                  tipDist = maxAllowedTipDist;
                }
              }
            }
          }
        }
      }
      
      spawnX = fighter.x + dirX * tipDist;
      spawnY = fighter.y + dirY * tipDist;
    }

    // Determine visual type based on fighter type
    let visualType = visual;
    if (!visualType && fighter._def && fighter._def.type === 'gunslinger') {
      visualType = 'gunslingerBullet';
    }
    if (!visualType && fighter._def && fighter._def.type === 'Engineer') {
      visualType = 'EngineerBullet';
    }
    if (!visualType && fighter._def && fighter._def.type === 'aimbot') {
      visualType = 'rangerBullet';
    }
    if (!visualType && fighter._def && (fighter._def.type === 'sukuna' || fighter._def.name === 'Sukuna')) {
      visualType = 'sukunaSlash';
    }

    const proj = this._getProjectile();
    proj.x = spawnX;
    proj.y = spawnY;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = radius;
    proj.life = life;
    proj.maxLife = life;
    proj.color = fighter.color;
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    proj.isFollowUp = isFollowUp;
    proj.visual = visualType;
    if (proj.history) { proj.history.length = 0; proj.history.push({ x: spawnX, y: spawnY }); }
    proj.historyMax = 10;

    if (willBecomeBlackHole) {
      proj.isBlackHole = true;
      proj.transformed = false;
      proj.transformTimer = Math.max(12, Math.floor(life / 3));
      proj.initialTransformTimer = proj.transformTimer;
      proj.hitTargets = new Set();
      proj.color = 'rgba(153,0,255,0.9)';
    }

    this.projectiles.push(proj);
  }

  /**
   * Spawns a flame projectile for the Orange fighter.
   * Flame size is now based on flameRange and flameSpread (fan shape) instead of speed/life.
   */
  fireFlameProjectile(fighter, ownerIndex, damage, angleOffset = 0, speedOverride, radiusOverride, lifeOverride, colorOverride) {
    const angle = fighter.gunAngle + angleOffset + (Math.random() - 0.5) * 0.03;
    const speed = (speedOverride ?? CONFIG.orange.flameSpeed ?? CONFIG.projectile.speed) * (0.95 + Math.random() * 0.08);
    const radius = radiusOverride ?? CONFIG.orange.flameRadius ?? CONFIG.projectile.radius;
    const projDamage = Number(damage);

    // Calculate life based on flameRange to ensure projectiles reach the full range
    const flameRange = CONFIG.orange.flameRange || 150;
    const calculatedLife = Math.ceil(flameRange / speed);
    const life = lifeOverride ?? calculatedLife;

    const tipDist = GUN_TIP_DIST(fighter.r) + 15;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const perpX = -dirY;
    const perpY = dirX;
    const coneOffset = (Math.random() - 0.5) * tipDist * 0.16;

    const originX = fighter.x + dirX * tipDist;
    const originY = fighter.y + dirY * tipDist;

    const proj = this._getProjectile();
    proj.originX = originX;
    proj.originY = originY;
    proj.x = originX + perpX * coneOffset;
    proj.y = originY + perpY * coneOffset;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = radius;
    proj.life = life;
    proj.maxLife = life;
    proj.startLife = life;
    proj.baseRadius = radius;
    proj.baseSpeed = speed;
    proj.color = colorOverride || 'rgba(255, 160, 0, 0.92)';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    proj.isFollowUp = false;
    proj.isFlame = true;
    proj.turbulence = 0.06 + Math.random() * 0.06;
    proj.wobblePhase = Math.random() * Math.PI * 2;

    this.projectiles.push(proj);
  }
  
  /**
   * Spawns a Chain Lightning projectile for Zeus.
   */
  fireChainLightning(fighter, ownerIndex, damage, chainCount) {
    const tipDist = GUN_TIP_DIST(fighter.r);
    const speed = CONFIG.zeus.lightningSpeed || 18;
    const dirX = Math.cos(fighter.gunAngle);
    const dirY = Math.sin(fighter.gunAngle);
    
    const proj = this._getProjectile();
    proj.x = fighter.x + dirX * tipDist;
    proj.y = fighter.y + dirY * tipDist;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = 6;
    proj.life = 100;
    proj.maxLife = 100;
    proj.color = '#00BFFF';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : 0;
    proj.isChainLightning = true;
    proj.chainCount = chainCount;
    proj.visual = 'chainLightning';
    proj.hitTargets = new Set();
    
    // Trail for lightning visual
    if (proj.history) { proj.history.length = 0; proj.history.push({ x: proj.x, y: proj.y }); }
    proj.historyMax = 15;
    
    this.projectiles.push(proj);
  }

  fireGojoBlue(fighter, ownerIndex, damage, customSpawnX, customSpawnY, customAngle) {
    const radius = CONFIG.gojo.blueRadius || 80;
    const speed = CONFIG.gojo.blueSpeed || (CONFIG.projectile.speed * (fighter.projectileSpeedMultiplier || 1.5));
    const projDamage = Number(damage);

    let spawnX, spawnY, dirX, dirY;
    if (customSpawnX !== undefined && customSpawnY !== undefined) {
      spawnX = customSpawnX;
      spawnY = customSpawnY;
      const angle = customAngle !== undefined ? customAngle : fighter.gunAngle;
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
    } else {
      const tipDist = GUN_TIP_DIST(fighter.r);
      dirX = Math.cos(fighter.gunAngle);
      dirY = Math.sin(fighter.gunAngle);
      spawnX = fighter.x + dirX * tipDist;
      spawnY = fighter.y + dirY * tipDist;
    }

    const proj = this._getProjectile();
    proj.x = spawnX;
    proj.y = spawnY;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = 10;
    proj.life = 180; // Extended lifetime to reach arena walls
    proj.maxLife = 180;
    proj.color = '#00FFFF'; // Cyan
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    
    proj.isGojoBlue = true;
    proj.visual = 'gojoBlue'; // Distinct visual
    proj.hitTargets = new Set();
    
    if (proj.history) { proj.history.length = 0; proj.history.push({ x: spawnX, y: spawnY }); }
    proj.historyMax = 10;
    this.projectiles.push(proj);
  }

  fireGojoPurple(fighter, ownerIndex, damage) {
    const speed = CONFIG.gojo.purpleSpeed || 8;
    const tipDist = GUN_TIP_DIST(fighter.r) + 20;
    const dirX = Math.cos(fighter.gunAngle);
    const dirY = Math.sin(fighter.gunAngle);
    
    const proj = this._getProjectile();
    proj.x = fighter.x + dirX * tipDist;
    proj.y = fighter.y + dirY * tipDist;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = CONFIG.gojo.purpleRadius || 40;
    proj.life = CONFIG.gojo.purpleLife || 300;
    proj.maxLife = proj.life;
    proj.color = '#8A2BE2'; // Purple
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : 10;
    proj.isGojoPurple = true;
    proj.hitTargets = new Set();
    proj.hitFighters = new Set(); // Piercing
    proj.purpleDPS = CONFIG.gojo.purpleDPS || 5;
    proj.purpleDPSInterval = CONFIG.gojo.purpleDPSInterval || 30;
    proj.purpleLastDPSTick = 0;
    proj.purpleDamagedFighters = new Set(); // Track who has been DPS'd
    
    // Initialize history for trail effect - Hollow Purple swirling vortex
    proj.history = [];
    proj.history.push({ x: proj.x, y: proj.y });
    proj.historyMax = 20;
    this.projectiles.push(proj);

    // Screen shake when purple orb fires - massive impact!
    const shakeIntensity = CONFIG.gojo.purpleShakeIntensity || 25;
    const shakeDuration = CONFIG.gojo.purpleShakeDuration || 30;
    triggerGlobalScreenShake(shakeIntensity, shakeDuration);

    // Play Hollow Purple audio and loop it while the projectile exists
    const sound = getSkillSound(21, 'purple_fire');
    if (sound) {
      const soundKey = 'purple_fire_' + Math.random().toString(36).substr(2, 9);
      proj.soundKey = soundKey;
      playLoopingSound(soundKey, sound.src, sound.volume);
    }
  }

  /**
   * Fires Sukuna's Dismantle grid slashes (long distance basic attack).
   * Spawns parallel faint flying slashes in a grid formation.
   */
  fireSukunaDismantleGrid(fighter, ownerIndex, damage) {
    const speed = CONFIG.sukuna?.slashSpeed ?? (CONFIG.projectile.speed * 1.5);
    const angle = fighter.gunAngle;
    const tipDist = GUN_TIP_DIST(fighter.r);
    
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const perpX = -dirY;
    const perpY = dirX;
    
    const startX = fighter.x + dirX * tipDist;
    const startY = fighter.y + dirY * tipDist;

    const offsets = [-14, 0, 14];
    offsets.forEach((offset, idx) => {
      const proj = this._getProjectile();
      proj.x = startX + perpX * offset;
      proj.y = startY + perpY * offset;
      proj.vx = dirX * speed;
      proj.vy = dirY * speed;
      proj.r = 6;
      proj.life = 90;
      proj.maxLife = 90;
      proj.color = '#8B0000';
      proj.owner = ownerIndex;
      proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : 8;
      proj.visual = 'sukunaDismantleGrid';
      proj.gridIndex = idx;
      proj.history = [];
      proj.history.push({ x: proj.x, y: proj.y });
      proj.historyMax = 8;
      this.projectiles.push(proj);
    });
  }

  /**
   * Fires Sukuna's Furnace (Fuga) flaming arrow nuke.
   */
  fireSukunaFurnace(fighter, ownerIndex, damage) {
    const speed = CONFIG.sukuna?.divineFlameSpeed || (CONFIG.projectile.speed * 1.8);
    const tipDist = GUN_TIP_DIST(fighter.r) + 15;
    const dirX = Math.cos(fighter.gunAngle);
    const dirY = Math.sin(fighter.gunAngle);
    
    const proj = this._getProjectile();
    proj.x = fighter.x + dirX * tipDist;
    proj.y = fighter.y + dirY * tipDist;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = 10;
    proj.life = 180;
    proj.maxLife = 180;
    proj.color = '#FF4500';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : 35;
    proj.isSukunaFurnace = true;
    proj.visual = 'sukunaFurnaceArrow';
    proj.history = [];
    proj.history.push({ x: proj.x, y: proj.y });
    proj.historyMax = 12;
    
    // Initialize wind-blown flame particle system for Fuga arrow
    proj.flameParticles = [];
    proj.emberParticles = [];
    proj._fugaFlameTimer = 0;
    
    this.projectiles.push(proj);
  }

  /**
   * Alias for backwards compatibility
   */
  fireSukunaDivineFlame(fighter, ownerIndex, damage) {
    this.fireSukunaFurnace(fighter, ownerIndex, damage);
  }

  /**
   * Triggers a thermobaric explosion upon Furnace arrow impact.
   */
  triggerThermobaricExplosion(x, y, ownerIndex, damage) {
    const splashRadius = 140;
    const attacker = state.fighters ? state.fighters[ownerIndex] : null;
    
    // Play explosion sound
    const fugaExplodeSound = getSkillSound(attacker?._def?.id || 'sukuna', 'fuga_explode');
    if (fugaExplodeSound) playSound(fugaExplodeSound.src, fugaExplodeSound.volume);
    
    triggerGlobalScreenShake(18, 25);
    if (typeof spawnGroundScorch === 'function') spawnGroundScorch(x, y, 80);
    if (typeof spawnImpactFlash === 'function') spawnImpactFlash(x, y, 100, 'orange');
    if (typeof spawnSparks === 'function') spawnSparks(x, y, 45, 'orange', '#FF4500');

    // Generate ground cracks radiating from impact point
    const cracks = [];
    const numCracks = 8;
    for (let c = 0; c < numCracks; c++) {
      const crackAngle = (c / numCracks) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const crackLen = 45 + Math.random() * 55;
      const segments = [];
      let currentX = x;
      let currentY = y;
      const numSegs = 4;
      for (let s = 0; s < numSegs; s++) {
        const segLen = (crackLen / numSegs);
        const segAngle = crackAngle + (Math.random() - 0.5) * 0.5;
        const nextX = currentX + Math.cos(segAngle) * segLen;
        const nextY = currentY + Math.sin(segAngle) * segLen;
        segments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY });
        currentX = nextX;
        currentY = nextY;
      }
      cracks.push(segments);
    }

    // Generate flying rock debris & ember chunks
    const debris = [];
    const numDebris = 16;
    for (let d = 0; d < numDebris; d++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      debris.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        color: Math.random() > 0.4 ? '#333333' : '#FF4500'
      });
    }

    if (!state.thermobaricExplosions) state.thermobaricExplosions = [];
    state.thermobaricExplosions.push({
      x, y, radius: 10, maxRadius: splashRadius, life: 32, maxLife: 32,
      cracks, debris
    });

    const sound = getSkillEffectSound('explosion');
    if (sound) playSound(sound.src, sound.volume || 0.8);

    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f.hp > 0 && idx !== ownerIndex && !areOnSameTeam(ownerIndex, idx)) {
          const dist = Math.hypot(f.x - x, f.y - y);
          if (dist <= splashRadius) {
            const splashRatio = Math.max(0.4, 1 - (dist / splashRadius) * 0.5);
            const splashDmg = damage * splashRatio;
            f.takeDamage(splashDmg, attacker, { isExplosion: true });
            
            // Apply burn effect to targets hit by Fuga
            if (typeof f.applyBurn === 'function') {
              f.burnTimer = CONFIG.sukuna?.divineFlameBurnDuration || CONFIG.orange.burnDuration;
              f.burnDamageTimer = 0;
              f.lastBurnAttacker = attacker;
            }
            
            const angle = Math.atan2(f.y - y, f.x - x);
            const pushForce = 12 * (1 - dist / splashRadius);
            f.vx += Math.cos(angle) * pushForce;
            f.vy += Math.sin(angle) * pushForce;
          }
        }
      });
    }

    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const illOwner = ill.owner?.fighterIndex ?? (state.fighters ? state.fighters.indexOf(ill.owner) : -1);
          if (illOwner !== ownerIndex && !areOnSameTeam(ownerIndex, illOwner)) {
            const dist = Math.hypot(ill.x - x, ill.y - y);
            if (dist <= splashRadius) {
              applyDamageToTarget(ill, damage * 0.7, attacker, { isExplosion: true });
            }
          }
        }
      });
    }
  }

  /**
   * Spawns a grenade projectile that travels in an arc and detonates on impact.
   */
  fireGrenade(fighter, ownerIndex, damage, opponent) {
    if (!fighter || !opponent) return;

    const { speed, radius } = CONFIG.projectile;
    const tipDist = GUN_TIP_DIST(fighter.r);

    const targetX = opponent.x;
    const targetY = opponent.y;
    const distSq = (targetX - fighter.x) * (targetX - fighter.x) + (targetY - fighter.y) * (targetY - fighter.y);

    const dist = distSq > 0 ? Math.sqrt(distSq) : 1;
    const dirX = (targetX - fighter.x) / dist;
    const dirY = (targetY - fighter.y) / dist;

    const startX = fighter.x + dirX * tipDist;
    const startY = fighter.y + dirY * tipDist;

    const projSpeed = speed * 1.6;
    const life = Math.max(8, Math.floor(dist / projSpeed));

    if (life <= 0) return;

    const vx = (targetX - startX) / life;
    const vy = (targetY - startY) / life;

    const g = 0.5;
    const vz = (g * life) / 2;

    const projDamage = Number(damage);
    const proj = this._getProjectile();
    proj.x = startX;
    proj.y = startY;
    proj.z = 15;
    proj.vx = vx;
    proj.vy = vy;
    proj.vz = vz;
    proj.g = g;
    proj.r = radius * 1.2;
    proj.life = life;
    proj.maxLife = life;
    proj.color = fighter.color;
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    proj.isGrenade = true;
    proj.aoeRadius = 60;
    proj.history = [];
    this.projectiles.push(proj);
  }

  /**
   * Spawns a bomber grenade that travels in an arc (parabolic curve) and explodes on impact.
   * Bomber throws grenades with a curved trajectory — like lobbing a bomb.
   */
  fireBomberGrenade(fighter, ownerIndex, damage, opponent, isSticky = false) {
    if (!fighter || !opponent) return;

    const speed = CONFIG.bomber.grenadeSpeed;
    const radius = CONFIG.bomber.grenadeRadius;
    const tipDist = GUN_TIP_DIST(fighter.r);

    const targetX = opponent.x;
    const targetY = opponent.y;
    const dist = Math.hypot(targetX - fighter.x, targetY - fighter.y);

    const dirX = (targetX - fighter.x) / (dist || 1);
    const dirY = (targetY - fighter.y) / (dist || 1);

    const startX = fighter.x + dirX * tipDist;
    const startY = fighter.y + dirY * tipDist;

    const projSpeed = speed * 1.6;
    const life = Math.max(8, Math.floor(dist / projSpeed));

    if (life <= 0) return;

    const vx = (targetX - startX) / life;
    const vy = (targetY - startY) / life;

    const g = 0.5;
    const vz = (g * life) / 2;

    const projDamage = Number(damage);
    const proj = this._getProjectile();
    proj.x = startX;
    proj.y = startY;
    proj.z = 15;
    proj.vx = vx;
    proj.vy = vy;
    proj.vz = vz;
    proj.g = g;
    proj.r = radius;
    proj.life = life;
    proj.maxLife = life;
    proj.color = isSticky ? '#FF6600' : '#8B4513';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    proj.isBomberGrenade = true;
    proj.isSticky = isSticky;
    proj.aoeRadius = isSticky ? CONFIG.bomber.stickyBombExplosionRadius : CONFIG.bomber.explosionRadius;
    proj.explosionDamage = isSticky ? CONFIG.bomber.stickyBombDamage : CONFIG.bomber.explosionDamage;
    proj.stuckToFighter = null;
    proj.stickTimer = 0;
    proj.history = [];
    this.projectiles.push(proj);
  }

  /**
   * Plants a C4 bomb at a location that explodes after a delay.
   */
  plantC4(fighter, ownerIndex, x, y, isDeathC4 = false) {
    const duration = isDeathC4 ? CONFIG.bomber.deathC4Duration : CONFIG.bomber.c4PlantDuration;
    const damage = isDeathC4 ? CONFIG.bomber.deathC4Damage : CONFIG.bomber.c4Damage;
    const explosionRadius = isDeathC4 ? CONFIG.bomber.deathC4ExplosionRadius : CONFIG.bomber.c4ExplosionRadius;

    const c4Damage = Number(damage);
    const proj = this._getProjectile();
    proj.x = x;
    proj.y = y;
    proj.vx = 0;
    proj.vy = 0;
    proj.r = 12;
    proj.life = duration;
    proj.maxLife = duration;
    proj.color = isDeathC4 ? '#FF0000' : '#FF4444';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(c4Damage) ? c4Damage : 0;
    proj.isC4 = true;
    proj.isDeathC4 = isDeathC4;
    proj.aoeRadius = explosionRadius;
    proj.pulsePhase = 0;
    proj.rotation = 0;
    proj.history = [];
    this.projectiles.push(proj);
  }

  /**
   * Checks if a projectile hit a fighter (skips its own owner).
   * OPTIMIZED: Uses spatial grid to reduce collision checks from O(n) to O(1) for nearby entities.
   */
  checkProjectileHits(projectile, fighters) {
    if (projectile.isExplosion) return false;
    if (projectile.isPoisonSpill) return false;
    if (projectile.isVisual) return false; // Visual-only particles skip all collision

    // OPTIMIZED: Use spatial grid to get only nearby fighters instead of checking all
    const nearbyFighters = spatialGrid.getNearby(projectile.x, projectile.y, projectile.r * 2 + 100);

    for (const fighter of nearbyFighters) {
      if (!fighter || fighter.hp <= 0) continue;
      const fi = fighters.indexOf(fighter);
      if (fi === -1) continue;

      if (projectile.owner === fi) continue;
      // Skip teammates in 2v2 mode
      if (areOnSameTeam(projectile.owner, fi)) continue;
      // Skip if this projectile has piercing and already hit this fighter
      if (projectile.hitFighters && projectile.hitFighters.has(fighter)) continue;

      // ── Bounding-box culling: skip expensive Math.hypot when projectile is far ──
      const hitRadius = fighter.r + projectile.r;
      const dx = fighter.x - projectile.x;
      const dy = fighter.y - projectile.y;
      if (Math.abs(dx) > hitRadius || Math.abs(dy) > hitRadius) continue;

      const distSq = dx * dx + dy * dy;
      const hitRadiusSq = hitRadius * hitRadius;
      const proximityRadius = hitRadius + (CONFIG.darkslategray.proximityTriggerRadius || 0);
      const proxRadiusSq = proximityRadius * proximityRadius;

      if (distSq < hitRadiusSq) {
        if (projectile.isBlackHole && projectile.hitTargets && projectile.hitTargets.has(fi)) {
          continue;
        }

        // Grenades detonate on contact with a fighter
        if (projectile.isGrenade) {
          this.detonateGrenade(projectile, fighters);
          this.createAlchemistExplosion({ x: projectile.x, y: projectile.y, radius: projectile.aoeRadius || 60, owner: projectile.owner });
          return true;
        }

        if (!projectile.isGrenade) {
          if (projectile.isFlame) {
            const intervalSeconds = Number(CONFIG.orange.flameContactIntervalSeconds ?? CONFIG.orange.flameHitCooldown ?? 0.2);
            const safeIntervalSeconds = Math.max(0.01, intervalSeconds);
            const intervalMs = safeIntervalSeconds * 1000;
            const now = Date.now();

            // Check if fighter has been away from flames long enough to trigger burn
            if (fighter._lastFlameHitTime && (now - fighter._lastFlameHitTime) > intervalMs * 3) {
              // Apply burn effect when fighter gets away from flames
              if (fighter._flameContactDuration > 0 && fighter.burnTimer === 0) {
                const attacker = fighters[projectile.owner];
                fighter.applyBurn(attacker);
                fighter._flameContactDuration = 0;
              }
            }

            if (fighter._lastFlameHitTime && (now - fighter._lastFlameHitTime) > intervalMs * 2) {
              fighter._flameContactDuration = 0;
            }
            if (fighter._lastFlameHitTime && (now - fighter._lastFlameHitTime) < intervalMs) {
              // If the same fighter is in rapid successive contact with flames,
              // treat it as "dodged" for this flame particle to prevent absurd multi-ticking.
              // IMPORTANT: DarkSlateGray dodge logic should not be bypassed here,
              // so only mark as dodged when the projectile is NOT coming from a stealth-dodge candidate.
              // (DarkSlateGray takes dodge decisions inside Fighter.takeDamage.)
              if (fighter && fighter._def?.type !== 'darkslategray') {
                if (!projectile.dodgedFighters) projectile.dodgedFighters = new Set();
                projectile.dodgedFighters.add(fighter);
              }
              continue;
            }
          }

          if (!projectile.dodgedFighters) projectile.dodgedFighters = new Set();
          const attacker = fighters[projectile.owner];
          let damageAmount = Number(projectile.damage);
          if (!Number.isFinite(damageAmount)) {
            damageAmount = 0;
          }
          if (projectile.isFlame) {
            const intervalSeconds = Number(CONFIG.orange.flameContactIntervalSeconds ?? CONFIG.orange.flameHitCooldown ?? 0.2);
            const safeIntervalSeconds = Math.max(0.01, intervalSeconds);
            const baseDamage = Number(CONFIG.orange.flameDamage ?? 0.1);
            const rampRate = Number(CONFIG.orange.flameContactRampDamagePerSecond ?? 0.1);
            const maxDamage = Number(CONFIG.orange.flameContactMaxDamage ?? 1.0);
            const now = Date.now();
            const wasRecent = fighter._lastFlameHitTime && (now - fighter._lastFlameHitTime) <= safeIntervalSeconds * 1000 * 1.5;
            fighter._flameContactDuration = wasRecent ? fighter._flameContactDuration + safeIntervalSeconds : safeIntervalSeconds;
            const extraDamage = Math.max(0, fighter._flameContactDuration - safeIntervalSeconds) * rampRate;
            damageAmount = Math.min(maxDamage, baseDamage + extraDamage);
          }
          // Flames should not be treated as dodgeable projectiles for DarkSlateGray.
          // They already have their own rapid-contact cadence; marking them as a projectile
          // causes DarkSlateGray to dodge far too often ("100% dodge" feel).
          const applied = fighter.takeDamage(damageAmount, attacker, { isFlame: !!projectile.isFlame, projectile });
          if (applied) {
            if (projectile.isFlame) {
              fighter._lastFlameHitTime = Date.now();
              fighter._flameHitCooldown = Math.max(1, Math.round(CONFIG.orange.flameHitCooldown || 12));
              if (fighter.burnTimer === 0 && typeof fighter.applyBurn === 'function') {
                fighter.applyBurn(attacker);
              }
            }
            if (typeof attacker.onDamageDealt === 'function') {
              attacker.onDamageDealt(fighter, projectile, projectile.owner);
            }
            if (projectile.visual === 'EngineerBullet') {
              // Apply small knockback from shotgun pellets
              const knockbackForce = 1.0; 
              const hitAngle = Math.atan2(projectile.vy, projectile.vx);
              fighter.vx += Math.cos(hitAngle) * knockbackForce;
              fighter.vy += Math.sin(hitAngle) * knockbackForce;
            }
            if (projectile.isBlackHole && projectile.hitTargets) {
              projectile.hitTargets.add(fi);
            }
            
            // Sukuna slashes pierce through enemies like paper!
            if (projectile.visual === 'sukunaSlash' || projectile.visual === 'sukunaCleave' || projectile.visual === 'sukunaDismantleGrid' || projectile.visual === 'ghostBlade') {
              if (!projectile.hitFighters) projectile.hitFighters = new Set();
              projectile.hitFighters.add(fighter);
              
              // Spawn some blood/sparks to show it sliced straight through
              spawnSparks(fighter.x, fighter.y, 8, 'crimsonSniper');

              // Apply a small physical push backward on hit
              const knockbackForce = 2.5; 
              const angle = Math.atan2(projectile.vy, projectile.vx);
              fighter.vx += Math.cos(angle) * knockbackForce;
              fighter.vy += Math.sin(angle) * knockbackForce;
              
              // Do NOT return true, allowing it to continue flying
            } else if (projectile.visual === 'crimsonSniperBullet_enhanced' || projectile.visual === 'tricksterSniperBullet_enhanced') {
              if (!projectile.hitFighters) projectile.hitFighters = new Set();
              projectile.hitFighters.add(fighter);
              
              const isTrickster = projectile.visual === 'tricksterSniperBullet_enhanced';
              
              if (isTrickster) {
                // Green effects for trickster
                spawnSparks(fighter.x, fighter.y, 8, 'lightningTrail', 'rgba(0, 255, 0, 1)');
                spawnImpactFlash(fighter.x, fighter.y, 25, 'lightningTrail'); // Will fallback to default color or we can use custom
                
                // Spawn green lightning shockwave
                if (typeof spawnCrimsonLightningImpact === 'function') {
                  spawnCrimsonLightningImpact(fighter.x, fighter.y, 50, true); // true for isTrickster
                }
              } else {
                // Red effects for sharpshooter
                spawnSparks(fighter.x, fighter.y, 8, 'crimsonSniper');
                spawnImpactFlash(fighter.x, fighter.y, 25, 'crimsonSniper');
                if (typeof spawnCrimsonLightningImpact === 'function') {
                  spawnCrimsonLightningImpact(fighter.x, fighter.y, 50, false);
                }
              }
              
              // Apply the crimson electrified visual effect to the target
              const duration = CONFIG.sharpshooter?.electrifiedDuration || 45;
              fighter.crimsonElectrifiedTimer = Math.max(fighter.crimsonElectrifiedTimer || 0, duration);
              fighter.crimsonElectrifiedTrickster = isTrickster; // Save trickster state for green electricity
              fighter.lastCrimsonAttacker = attacker;
              // Do NOT return true, so the projectile is not destroyed
            } else if (projectile.isGojoPurple) {
              if (!projectile.hitFighters) projectile.hitFighters = new Set();
              projectile.hitFighters.add(fighter);
              spawnSparks(fighter.x, fighter.y, 8, 'lightningTrail', '#8A2BE2');
              spawnImpactFlash(fighter.x, fighter.y, 35, 'lightningTrail');
              if (typeof triggerGlobalScreenShake === 'function') {
                triggerGlobalScreenShake(2, 4);
              }
              // Do NOT return true
            } else if (projectile.isSukunaFurnace) {
              this.triggerThermobaricExplosion(projectile.x, projectile.y, projectile.owner, projectile.damage);
              return true;
            } else if (projectile.isGojoBlue) {
              if (!projectile.hitFighters) projectile.hitFighters = new Set();
              if (!projectile.hitFighters.has(fighter)) {
                projectile.hitFighters.add(fighter);
                spawnSparks(fighter.x, fighter.y, 6, 'lightningTrail', '#00D4CC');
                spawnImpactFlash(fighter.x, fighter.y, 20, 'lightningTrail');
              }
              // Do NOT return true so Gojo Blue passes THROUGH targets to the walls!
            } else if (projectile.isArcaneBolt) {
                 if (!projectile.hitFighters) projectile.hitFighters = new Set();
                 projectile.hitFighters.add(fighter);
                 if (projectile.bouncesLeft > 0) {
                     projectile.bouncesLeft--;
                     projectile.damage *= projectile.bounceDamageMultiplier;
                     // find nearest valid enemy to bounce towards
                     let bestDist = Infinity;
                     let bestFighter = null;
                     for (let f of fighters) {
                        if (f && f !== fighter && f !== attacker && f.hp > 0 && !projectile.hitFighters.has(f)) {
                            const ddx = f.x - projectile.x;
                            const ddy = f.y - projectile.y;
                            const distSq = ddx*ddx + ddy*ddy;
                            if (distSq < bestDist) {
                                bestDist = distSq;
                                bestFighter = f;
                            }
                        }
                     }
                     if (bestFighter) {
                        const ddx = bestFighter.x - projectile.x;
                        const ddy = bestFighter.y - projectile.y;
                        const dist = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
                        const speed = Math.sqrt(projectile.vx*projectile.vx + projectile.vy*projectile.vy) || 1;
                        projectile.vx = (ddx/dist) * speed;
                        projectile.vy = (ddy/dist) * speed;
                        projectile.life = 180;
                     }
                     // Do NOT return true, so the projectile is not destroyed
                 } else {
                     return true; // no bounces left, destroy it
                 }
            } else if (projectile.isChainLightning) {
                 if (!projectile.hitFighters) projectile.hitFighters = new Set();
                 projectile.hitFighters.add(fighter);
                 
                 // Apply Zeus Debuffs
                 if (Math.random() < (CONFIG.zeus.staticChance || 0)) {
                     fighter.staticDebuffTimer = CONFIG.zeus.staticDuration || 120;
                 }
                 if (Math.random() < (CONFIG.zeus.stunChance || 0)) {
                     fighter.electricStunTimer = Math.max(fighter.electricStunTimer || 0, CONFIG.zeus.stunDuration || 15);
                 }
                 
                 // Apply dramatic hit-pause and screen shake ONLY on the direct hit (not on bounces)
                 if (projectile.hitFighters.size === 1) {
                     if (typeof fighter.applyTimeStop === 'function') {
                       fighter.applyTimeStop(2);
                     }
                     if (attacker && typeof attacker.applyTimeStop === 'function') {
                       attacker.applyTimeStop(2);
                     }
                     
                     if (typeof triggerGlobalScreenShake === 'function') {
                       triggerGlobalScreenShake(2, 4);
                     }
                 }
                 
                 // Apply visual thunder roots effect
                 fighter.thunderRootsTimer = Math.max(fighter.thunderRootsTimer || 0, 45);
                 
                 // Add vertical thunder strike visual and electric roots
                 if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
                 state.zeusStormStrikes.push({
                   x: fighter.x,
                   y: fighter.y,
                   life: 15,
                   maxLife: 15
                 });
                 
                 spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
                 
                 // Play thunder strike sound on basic attack hit
                 if (attacker && typeof attacker._def !== 'undefined') {
                   const stormSound = getSkillSound(attacker._def.id, 'storm');
                   if (stormSound) playSound(stormSound.src, stormSound.volume * 0.5);
                 }
                 
                 if (projectile.chainCount > 0) {
                     projectile.chainCount--;
                     projectile.damage *= (CONFIG.zeus.chainDamageMultiplier || 0.8);
                     
                     // Find nearest valid enemy to chain towards
                     let bestDist = (CONFIG.zeus.chainRange || 150) ** 2;
                     let bestTarget = null;
                     
                     // Helper to check and update best target
                     const checkTarget = (t, index = null) => {
                         let isEnemy = false;
                         if (index !== null) {
                             isEnemy = !areOnSameTeam(projectile.owner, index);
                         } else if (t.owner) {
                             isEnemy = !areOnSameTeam(projectile.owner, fighters.indexOf(t.owner));
                         }
                         
                         if (t && t !== fighter && t !== attacker && t.hp > 0 && !projectile.hitFighters.has(t) && isEnemy) {
                             const ddx = t.x - projectile.x;
                             const ddy = t.y - projectile.y;
                             const distSq = ddx*ddx + ddy*ddy;
                             if (distSq < bestDist) {
                                 bestDist = distSq;
                                 bestTarget = t;
                             }
                         }
                     };

                     // Check main fighters
                     for (let i = 0; i < fighters.length; i++) {
                         checkTarget(fighters[i], i);
                     }
                     // Check illusions
                     if (state.illusions) {
                         for (let ill of state.illusions) {
                             checkTarget(ill);
                         }
                     }
                     
                     if (bestTarget) {
                        const ddx = bestTarget.x - projectile.x;
                        const ddy = bestTarget.y - projectile.y;
                        const dist = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
                        const speed = Math.sqrt(projectile.vx*projectile.vx + projectile.vy*projectile.vy) || 1;
                        projectile.vx = (ddx/dist) * speed;
                        projectile.vy = (ddy/dist) * speed;
                        projectile.life = 100; // Reset life
                     } else {
                        // Bouncing off wall if no targets - just reverse or random angle
                        const angle = Math.atan2(projectile.vy, projectile.vx) + (Math.random() - 0.5) * Math.PI;
                        const speed = Math.sqrt(projectile.vx*projectile.vx + projectile.vy*projectile.vy) || 1;
                        projectile.vx = Math.cos(angle) * speed;
                        projectile.vy = Math.sin(angle) * speed;
                     }
                 } else {
                     return true; // No chains left
                 }
            } else {
              return true;
            }
          }

          projectile.dodgedFighters.add(fighter);
          continue; // projectile passes through on first dodge contact only
        }
        return true;
      }

      if (distSq < proxRadiusSq && distSq >= hitRadiusSq) {
        if (!projectile.nearMissFighters) projectile.nearMissFighters = new Set();
        if (!projectile.nearMissFighters.has(fi)) {
          projectile.nearMissFighters.add(fi);
          const attacker = fighters[projectile.owner];
          if (typeof fighter.onProjectileApproach === 'function') {
            fighter.onProjectileApproach(projectile, attacker);
          }
        }
      } else if (projectile.nearMissFighters) {
        projectile.nearMissFighters.delete(fi);
      }
    }

    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0) continue;

      // Skip friendly illusions
      const illusionOwnerIndex = illusion.owner?.fighterIndex ?? state.fighters?.indexOf(illusion.owner);
      if (illusionOwnerIndex !== undefined && illusionOwnerIndex !== -1) {
        if (projectile.owner === illusionOwnerIndex || areOnSameTeam(projectile.owner, illusionOwnerIndex)) continue;
      }

      // Skip if this projectile has piercing and already hit this illusion
      if (projectile.hitFighters && projectile.hitFighters.has(illusion)) continue;

      // ── Bounding-box culling for illusion collision ──
      const hitRadius = illusion.r + projectile.r;
      const idx = illusion.x - projectile.x;
      const idy = illusion.y - projectile.y;
      if (Math.abs(idx) > hitRadius || Math.abs(idy) > hitRadius) continue;

      const distSq = idx * idx + idy * idy;
      const hitRadiusSq = hitRadius * hitRadius;
      if (distSq < hitRadiusSq) {
        const attacker = fighters[projectile.owner];
        applyDamageToTarget(illusion, projectile.damage, attacker, { isProjectile: true, projectile });
        
        // Sukuna slashes pierce through illusions!
        if (projectile.visual === 'sukunaSlash' || projectile.visual === 'sukunaCleave' || projectile.visual === 'sukunaDismantleGrid') {
          if (!projectile.hitFighters) projectile.hitFighters = new Set();
          projectile.hitFighters.add(illusion);
          spawnSparks(illusion.x, illusion.y, 8, 'crimsonSniper');
          // Do NOT return true
        } else if (projectile.visual === 'crimsonSniperBullet_enhanced' || projectile.visual === 'tricksterSniperBullet_enhanced') {
          if (!projectile.hitFighters) projectile.hitFighters = new Set();
          projectile.hitFighters.add(illusion);
          spawnSparks(illusion.x, illusion.y, 8, 'crimsonSniper');
          spawnImpactFlash(illusion.x, illusion.y, 25, 'crimsonSniper');
          // Apply the crimson electrified visual effect to the target
          const duration = CONFIG.sharpshooter?.electrifiedDuration || 45;
          illusion.crimsonElectrifiedTimer = Math.max(illusion.crimsonElectrifiedTimer || 0, duration);
          illusion.lastCrimsonAttacker = attacker;
          // Do NOT return true
        } else if (projectile.isGojoPurple) {
          if (!projectile.hitFighters) projectile.hitFighters = new Set();
          projectile.hitFighters.add(illusion);
          spawnSparks(illusion.x, illusion.y, 8, 'lightningTrail', '#8A2BE2');
          spawnImpactFlash(illusion.x, illusion.y, 25, 'lightningTrail');
          // Do NOT return true
        } else {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Holds a projectile in place while it is inside a temporal sphere.
   * Returns true when the projectile should remain suspended until the sphere ends.
   *
   * ── PERFORMANCE: Decoupled frozen projectiles ──────────────────────────────────
   * Instead of freezing projectiles in-place within the active projectiles array
   * (which forces the physics engine to iterate over them every frame), we move
   * frozen projectiles into a separate `frozenProjectiles` array that the update
   * loop completely ignores. This eliminates all per-projectile time-stop checks
   * from the hot path. Projectiles are restored when the sphere expires.
   * ─────────────────────────────────────────────────────────────────────────────
   */
  holdForTemporalBubble(projectile, fighters) {
    if (!projectile || !fighters) return false;

    // Check if we reached the maximum frozen projectiles limit globally
    let frozenCount = this.frozenProjectiles.length;
    const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 25;

    for (const fighter of fighters) {
      if (!fighter || !fighter.sphereActive) continue;
      const dx = projectile.x - fighter.sphereX;
      const dy = projectile.y - fighter.sphereY;
      const range = CONFIG.cronos.sphereRadius;
      if ((dx * dx + dy * dy) <= range * range) {
        if (frozenCount >= maxFrozen) return false; // Prevent freezing more

        // Save velocity for trajectory restoration
        projectile._resumeVx = projectile.vx;
        projectile._resumeVy = projectile.vy;
        projectile._resumeVz = projectile.vz;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.vz = 0;

        // Track which sphere owns this frozen projectile
        const fighterIndex = fighters.indexOf(fighter);
        projectile.stoppedByCronosSphere = true;
        projectile.frozenByCronosSphere = true;
        projectile.frozenBySphereId = fighterIndex; // Which Cronos fighter's sphere froze it
        projectile.frozenByFighterIndex = fighterIndex;

        // Move projectile out of active array into frozen array
        const idx = this.projectiles.indexOf(projectile);
        if (idx !== -1) {
          this.projectiles[idx] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
        }
        this.frozenProjectiles.push(projectile);
        return true;
      }
    }

    return false;
  }

  /**
   * Restores all frozen projectiles that were frozen by a specific Cronos sphere owner.
   * Called when the sphere expires so frozen projectiles resume their trajectories.
   * Returns the number of projectiles restored.
   */
  restoreFrozenProjectiles(sphereOwnerIndex) {
    let restored = 0;
    for (let i = this.frozenProjectiles.length - 1; i >= 0; i--) {
      const p = this.frozenProjectiles[i];
      if (!p) continue;

      // Only restore projectiles that were frozen by THIS sphere
      if (p.frozenBySphereId !== sphereOwnerIndex) continue;

      // Restore velocity
      if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
        p.vx = p._resumeVx;
        p.vy = p._resumeVy;
      }
      delete p._resumeVx;
      delete p._resumeVy;
      if (typeof p._resumeVz === 'number') {
        p.vz = p._resumeVz;
        delete p._resumeVz;
      }

      // Clear frozen state
      p.stoppedByCronosSphere = false;
      p.frozenByCronosSphere = false;
      p.frozenBySphereId = null;
      p.frozenByFighterIndex = null;

      // Move back to active array
      this.frozenProjectiles.splice(i, 1);
      this.projectiles.push(p);
      restored++;
    }
    return restored;
  }

  /**
   * Detonates a grenade, dealing AOE damage and applying poison.
   */
  detonateGrenade(p, fighters) {
    const attacker = fighters[p.owner];
    if (!attacker) return;

    if (this.holdForTemporalBubble(p, fighters)) {
      return;
    }

    const radius = p.aoeRadius || 60;

    for (let fi = 0; fi < fighters.length; fi++) {
      if (p.owner === fi) continue;
      // Skip teammates in 2v2 mode
      if (areOnSameTeam(p.owner, fi)) continue;
      const fighter = fighters[fi];
      if (!fighter) continue;
      const dx = fighter.x - p.x;
      const dy = fighter.y - p.y;
      const checkRadius = radius + fighter.r;
      if ((dx * dx + dy * dy) <= checkRadius * checkRadius) {
        try {
          const applied = fighter.takeDamage(p.damage, attacker);
          if (applied) {
            if (typeof attacker.onDamageDealt === 'function') {
              attacker.onDamageDealt(fighter, p, p.owner);
            }
            if (fighter.applyPoison) {
              fighter.applyPoison(attacker);
              const poisonSound = getSkillEffectSound('alchemist', 'poisonsizzle');
              if (poisonSound) {
                playSound(poisonSound.src, poisonSound.volume);
              }
            }
          }
        } catch (e) {
          console.error('Grenade detonation error:', e);
        }
      }
    }

    // AOE damage to illusions
    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0) continue;
      
      // Skip friendly illusions
      const illusionOwnerIndex = illusion.owner?.fighterIndex ?? state.fighters?.indexOf(illusion.owner);
      if (illusionOwnerIndex !== undefined && illusionOwnerIndex !== -1) {
        if (p.owner === illusionOwnerIndex || areOnSameTeam(p.owner, illusionOwnerIndex)) continue;
      }

      const dx = illusion.x - p.x;
      const dy = illusion.y - p.y;
      const checkRadius = radius + illusion.r;
      if ((dx * dx + dy * dy) <= checkRadius * checkRadius) {
        applyDamageToTarget(illusion, p.damage, attacker, { isAOE: true });
      }
    }

    // Create a poison spill on the floor — organic wobbling pool effect
    const proj = this._getProjectile();
    proj.x = p.x;
    proj.y = p.y;
    proj.vx = 0;
    proj.vy = 0;
    proj.r = radius;
    proj.life = 120;
    proj.maxLife = 120;
    proj.color = '#4dff4d';
    proj.owner = p.owner;
    proj.isPoisonSpill = true;
    this.projectiles.push(proj);

    // Create the layered explosion visual effect
    this.createAlchemistExplosion({ x: p.x, y: p.y, radius, owner: p.owner });
  }

  /**
   * Creates a layered poison explosion visual effect for the Alchemist's grenade.
   * OPTIMIZED: Reduced particle count for better performance with multiple fighters
   */
  createAlchemistExplosion({ x, y, radius, owner }) {
    const motion = { x, y, vx: 0, vy: 0, owner, explosionType: 'poison', isExplosion: true };
    const qualityLevel = state.qualityLevel || 1.0;
    const useLOD = false;
    const useUltraLOD = false;

    // Bright toxic flash
    const flash = this._getProjectile();
    Object.assign(flash, motion);
    flash.r = radius * 0.35;
    flash.life = 12;
    flash.maxLife = 12;
    flash.isExplosionFlash = true;
    flash.isVisual = true;
    this.projectiles.push(flash);

    // Poison cloud fireball
    const cloud = this._getProjectile();
    Object.assign(cloud, motion);
    cloud.r = radius;
    cloud.life = 28;
    cloud.maxLife = 28;
    cloud.isExplosionFireball = true;
    cloud.isVisual = true;
    this.projectiles.push(cloud);

    // Expanding toxic shockwave ring (skip in ultra LOD)
    if (!useUltraLOD) {
      const shockwave = this._getProjectile();
      Object.assign(shockwave, motion);
      shockwave.r = radius * 0.5;
      shockwave.life = 22;
      shockwave.maxLife = 22;
      shockwave.isExplosionShockwave = true;
      shockwave.isVisual = true;
      this.projectiles.push(shockwave);
    }

    // Lingering green mist (skip in ultra LOD)
    if (!useUltraLOD) {
      const mist = this._getProjectile();
      Object.assign(mist, motion);
      mist.r = radius * 0.5;
      mist.maxRadius = radius * 1.3;
      mist.life = 45;
      mist.maxLife = 45;
      mist.isExplosionSmoke = true;
      mist.isVisual = true;
      this.projectiles.push(mist);
    }

    // Glass shatter particles from the bottle breaking
    const shardCount = useUltraLOD ? 1 + Math.floor(Math.random() * 2) : (useLOD ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3));
    for (let i = 0; i < shardCount; i++) {
      const shard = this._getProjectile();
      Object.assign(shard, motion);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      shard.vx = Math.cos(angle) * speed;
      shard.vy = Math.sin(angle) * speed;
      shard.r = 3 + Math.random() * 3;
      shard.life = 15 + Math.random() * 15;
      shard.maxLife = shard.life;
      shard.isGlassShard = true;
      shard.rotation = Math.random() * Math.PI * 2;
      shard.rotationSpeed = (Math.random() - 0.5) * 0.5;
      shard.isVisual = true;
      this.projectiles.push(shard);
    }

    // Poison bubble particles
    const bubbleCount = useUltraLOD ? 1 : (useLOD ? 2 : 3);
    for (let i = 0; i < bubbleCount; i++) {
      const angle = (i / bubbleCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = radius * 0.2 + Math.random() * radius * 0.3;
      const bubble = this._getProjectile();
      Object.assign(bubble, motion);
      bubble.x = x + Math.cos(angle) * dist;
      bubble.y = y + Math.sin(angle) * dist;
      bubble.vx = Math.cos(angle) * 1.5;
      bubble.vy = -1.5 - Math.random() * 1.5;
      bubble.r = 3 + Math.random() * 3;
      bubble.life = 20 + Math.floor(Math.random() * 15);
      bubble.maxLife = bubble.life;
      bubble.isExplosionEmber = true;
      bubble.isVisual = true;
      this.projectiles.push(bubble);
    }
  }

  freezeProjectilesInSphere(cronosFighter) {
    if (!cronosFighter || !cronosFighter.sphereActive) return;

    const sphereX = cronosFighter.sphereX;
    const sphereY = cronosFighter.sphereY;
    const sphereRadius = CONFIG.cronos.sphereRadius;
    const sphereRadiusSq = sphereRadius * sphereRadius;
    const ownerIndex = state.fighters.indexOf(cronosFighter);
    const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 40;
    const qualityLevel = state.qualityLevel || 1.0;
    const activeMaxFrozen = qualityLevel < 0.6 ? Math.min(15, maxFrozen) : maxFrozen;

    // OPTIMIZATION: Use spatial grid to get only nearby projectiles instead of checking all
    const nearbyProjectiles = [];
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      const dx = p.x - sphereX;
      const dy = p.y - sphereY;
      // Quick bounding box check first
      if (Math.abs(dx) <= sphereRadius && Math.abs(dy) <= sphereRadius) {
        nearbyProjectiles.push(i);
      }
    }

    for (let i = nearbyProjectiles.length - 1; i >= 0; i--) {
      if (this.frozenProjectiles.length >= activeMaxFrozen) break;

      const projIndex = nearbyProjectiles[i];
      const p = this.projectiles[projIndex];
      const dx = p.x - sphereX;
      const dy = p.y - sphereY;

      if (dx * dx + dy * dy <= sphereRadiusSq) {
        // Freeze it and move it
        p._resumeVx = p.vx;
        p._resumeVy = p.vy;
        p._resumeVz = p.vz;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.stoppedByCronosSphere = true;
        p.frozenByCronosSphere = true;
        p.frozenBySphereId = ownerIndex;
        p.frozenByFighterIndex = ownerIndex;

        this.frozenProjectiles.push(p);
        this.projectiles[projIndex] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      }
    }
  }

  /**
   * Detonates a bomber grenade or sticky bomb, dealing AOE damage.
   */
  /**
   * Checks if a position is inside any active Cronos sphere.
   * Returns true if the position is inside a Cronos sphere (explosions should be prevented).
   */
  isInsideCronosSphere(x, y, fighters) {
    for (const fighter of fighters) {
      if (!fighter) continue;
      if (!fighter.sphereActive) continue;
      const dx = x - fighter.sphereX;
      const dy = y - fighter.sphereY;
      const range = CONFIG.cronos.sphereRadius;
      if ((dx * dx + dy * dy) <= range * range) {
        return true;
      }
    }
    return false;
  }

  detonateBomberGrenade(p, fighters) {
    const attacker = fighters[p.owner];
    if (!attacker) return;

    if (this.holdForTemporalBubble(p, fighters)) {
      return;
    }

    const radius = p.aoeRadius || 70;
    const damage = p.explosionDamage || p.damage;

    for (let fi = 0; fi < fighters.length; fi++) {
      if (p.owner === fi) continue;
      // Skip teammates in 2v2 mode
      if (areOnSameTeam(p.owner, fi)) continue;
      const fighter = fighters[fi];
      if (!fighter) continue;
      const dx = fighter.x - p.x;
      const dy = fighter.y - p.y;
      const checkRadius = radius + fighter.r;
      if ((dx * dx + dy * dy) <= checkRadius * checkRadius) {
        try {
          const applied = fighter.takeDamage(damage, attacker);
          if (applied) {
            if (typeof attacker.onDamageDealt === 'function') {
              attacker.onDamageDealt(fighter, p, p.owner);
            }
          }
        } catch (e) {
          console.error('Bomber grenade detonation error:', e);
        }
      }
    }

    this.createEnhancedExplosion({
      x: p.x,
      y: p.y,
      radius,
      damage,
      owner: p.owner,
      type: p.isSticky ? 'sticky' : 'grenade',
    });

    // Play explosion sound when grenade detonates
    const ownerFighter = fighters[p.owner];
    if (ownerFighter) {
      const sound = getBasicAttackSound(ownerFighter._def?.id);
      if (sound) playSound(sound.src, sound.volume);
    }

    this.applyConcussiveBlast(p.x, p.y, fighters, p.owner, damage, radius);

    this.checkChainReaction(p.x, p.y, fighters, p.owner, damage, radius);
  }

  /**
   * Detonates a C4 bomb, dealing massive AOE damage.
   */
  detonateC4(p, fighters) {
    const attacker = fighters[p.owner];
    if (!attacker) return;

    if (this.holdForTemporalBubble(p, fighters)) {
      return;
    }

    const radius = p.aoeRadius || 100;
    const damage = p.damage;

    for (let fi = 0; fi < fighters.length; fi++) {
      if (p.owner === fi) continue;
      // Skip teammates in 2v2 mode
      if (areOnSameTeam(p.owner, fi)) continue;
      const fighter = fighters[fi];
      if (!fighter) continue;
      const dx = fighter.x - p.x;
      const dy = fighter.y - p.y;
      const checkRadius = radius + fighter.r;
      if ((dx * dx + dy * dy) <= checkRadius * checkRadius) {
        try {
          const applied = fighter.takeDamage(damage, attacker);
          if (applied) {
            if (typeof attacker.onDamageDealt === 'function') {
              attacker.onDamageDealt(fighter, p, p.owner);
            }
          }
        } catch (e) {
          console.error('C4 detonation error:', e);
        }
      }
    }

    this.createEnhancedExplosion({
      x: p.x,
      y: p.y,
      radius,
      damage,
      owner: p.owner,
      type: p.isDeathC4 ? 'deathC4' : 'c4',
    });

    // Play explosion sound when C4 detonates
    const ownerFighter = fighters[p.owner];
    if (ownerFighter) {
      const sound = getBasicAttackSound(ownerFighter._def?.id);
      if (sound) playSound(sound.src, sound.volume);
    }

    this.applyConcussiveBlast(p.x, p.y, fighters, p.owner, damage, radius);

    this.checkChainReaction(p.x, p.y, fighters, p.owner, damage, radius);
  }

  /**
   * Creates a layered bomber explosion visual and effect packet.
   */
  createEnhancedExplosion({ x, y, radius, damage, owner, type = 'grenade' }) {
    bomberExplosionSystem.spawnExplosion(x, y, radius, type);
  }

  /**
   * Applies concussive knockback to fighters within explosion radius.
   */
  applyConcussiveBlast(x, y, fighters, owner, damage, radius) {
    const cfg = CONFIG.bomber.concussiveBlast;
    const attacker = fighters[owner];
    if (!attacker) return;

    for (let fi = 0; fi < fighters.length; fi++) {
      if (owner === fi) continue;
      if (areOnSameTeam(owner, fi)) continue;
      const fighter = fighters[fi];
      if (!fighter) continue;

      const dx = fighter.x - x;
      const dy = fighter.y - y;
      const distSq = dx * dx + dy * dy;
      const checkRadius = radius + fighter.r;
      if (distSq <= checkRadius * checkRadius) {
        const dist = Math.sqrt(distSq);
        const distRatio = dist / Math.max(1, radius + fighter.r);
        const knockback = cfg.baseKnockback * (1 - Math.pow(distRatio, cfg.falloffExponent));
        const angle = Math.atan2(fighter.y - y, fighter.x - x);
        const strength = Math.max(0, knockback);
        fighter.knockbackVx = (fighter.knockbackVx || 0) + Math.cos(angle) * strength;
        fighter.knockbackVy = (fighter.knockbackVy || 0) + Math.sin(angle) * strength + cfg.verticalKnockback * strength;

        if (distRatio < cfg.minKnockbackRadius && Math.random() < cfg.stunChance) {
          fighter.stunTimer = Math.max(fighter.stunTimer || 0, cfg.stunDuration);
        }
      }
    }

    // Apply concussive blast to illusions
    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0) continue;

      // Skip friendly illusions
      const illusionOwnerIndex = illusion.owner?.fighterIndex ?? state.fighters?.indexOf(illusion.owner);
      if (illusionOwnerIndex !== undefined && illusionOwnerIndex !== -1) {
        if (owner === illusionOwnerIndex || areOnSameTeam(owner, illusionOwnerIndex)) continue;
      }

      const dx = illusion.x - x;
      const dy = illusion.y - y;
      const distSq = dx * dx + dy * dy;
      const checkRadius = radius + illusion.r;
      if (distSq <= checkRadius * checkRadius) {
        const dist = Math.sqrt(distSq);
        const distRatio = dist / Math.max(1, radius + illusion.r);
        const knockback = cfg.baseKnockback * (1 - Math.pow(distRatio, cfg.falloffExponent));
        const angle = Math.atan2(illusion.y - y, illusion.x - x);
        const strength = Math.max(0, knockback);
        illusion.knockbackVx = (illusion.knockbackVx || 0) + Math.cos(angle) * strength;
        illusion.knockbackVy = (illusion.knockbackVy || 0) + Math.sin(angle) * strength + cfg.verticalKnockback * strength;
      }
    }
  }

  /**
   * Detects nearby explosions and detonates chain-reactive explosives.
   */
  checkChainReaction(x, y, fighters, owner, damage, radius) {
    const cfg = CONFIG.bomber.chainReaction;
    if (!cfg.enabled) return;

    const chainRadius = cfg.chainRadius;
    let chains = 0;

    for (const projectile of this.projectiles) {
      if (chains >= cfg.maxChains) break;
      if (projectile.owner === owner) continue;
      if (projectile.life <= 0) continue;
      if (!projectile.isBomberGrenade && !projectile.isC4) continue;

      const dx = projectile.x - x;
      const dy = projectile.y - y;
      if ((dx * dx + dy * dy) <= chainRadius * chainRadius) {
        projectile.life = 0;
        projectile.aoeRadius = projectile.aoeRadius || radius * 0.8;
        if (projectile.isC4) {
          this.detonateC4(projectile, fighters);
        } else {
          this.detonateBomberGrenade(projectile, fighters);
        }
        chains += 1;
      }
    }
  }

  /**
   * Returns true if the projectile has expired or left the arena.
   */
  isProjectileExpired(p) {
    const arena = CONFIG.arena;
    
    // Sukuna Furnace Arrow: triggers thermobaric explosion on wall hit or max range expiration
    if (p.isSukunaFurnace) {
      if (
        p.life <= 0 ||
        p.x - p.r < arena.x ||
        p.x + p.r > arena.x + arena.width ||
        p.y - p.r < arena.y ||
        p.y + p.r > arena.y + arena.height
      ) {
        this.triggerThermobaricExplosion(p.x, p.y, p.owner, p.damage);
        return true;
      }
      return false;
    }

    // Gojo Purple orb: don't expire on wall hit, instead stick to the wall
    if (p.isGojoPurple) {
      if (p.life <= 0) return true;

      // Clamp position to arena boundaries so it sticks to walls
      // Zero BOTH velocity components on wall contact so the orb stops completely
      // instead of sliding along the wall edge
      const halfR = p.r / 2;
      if (p.x - halfR < arena.x) { p.x = arena.x + halfR; p.vx = 0; p.vy = 0; }
      if (p.x + halfR > arena.x + arena.width) { p.x = arena.x + arena.width - halfR; p.vx = 0; p.vy = 0; }
      if (p.y - halfR < arena.y) { p.y = arena.y + halfR; p.vx = 0; p.vy = 0; }
      if (p.y + halfR > arena.y + arena.height) { p.y = arena.y + arena.height - halfR; p.vx = 0; p.vy = 0; }

      return false; // Never expire from wall collision
    }
    
    return (
      p.life <= 0 ||
      p.x - p.r < arena.x ||
      p.x + p.r > arena.x + arena.width ||
      p.y - p.r < arena.y ||
      p.y + p.r > arena.y + arena.height
    );
  }

  /**
   * Updates all projectiles in the system.
   */
  update(fighters) {
    // OPTIMIZED: Update dynamic limits based on current entity count
    this._updateDynamicLimits();

    // OPTIMIZED: Rebuild spatial grid with fighters for projectile collision optimization
    spatialGrid.clear();
    for (const fighter of fighters) {
      if (fighter && fighter.hp > 0) {
        spatialGrid.insert(fighter);
      }
    }

    // OPTIMIZED: Increment frame counter for visual-only particle updates
    visualUpdateFrame++;

    // PERFORMANCE OPTIMIZATION: Hard limit on active projectiles
    // 2v2 and FFA can spawn a massive amount of particles (especially flames) leading to lag.
    if (this.projectiles.length > 0) {
      const isMulti = state && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.FFA);
      // OPTIMIZED: Use dynamic limits instead of fixed values
      const maxProjectiles = this.maxActiveProjectiles;

      if (this.projectiles.length > maxProjectiles) {
        let removedCount = 0;
        const targetToRemove = this.projectiles.length - maxProjectiles;

        // First pass: remove oldest flames since they are purely visual/minor damage and spawn in hundreds
        // PERFORMANCE: Use swap-and-pop for O(1) removal instead of splice O(n)
        for (let i = 0; i < this.projectiles.length && removedCount < targetToRemove; i++) {
          if (this.projectiles[i] && this.projectiles[i].isFlame) {
            this._returnProjectile(this.projectiles[i]);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
            removedCount++;
          }
        }

        // Second pass: if still over limit, just start pruning the oldest regular projectiles
        if (removedCount < targetToRemove) {
          const stillToRemove = targetToRemove - removedCount;
          if (stillToRemove > 0 && this.projectiles.length > 0) {
            // Use splice to maintain array order and correctly remove the oldest items.
            // (The previous O(1) swap-and-pop at index 0 inadvertently deleted the newest items).
            const removed = this.projectiles.splice(0, stillToRemove);
            for (let i = 0; i < removed.length; i++) {
              this._returnProjectile(removed[i]);
            }
          }
        }
      }
    }

    // Track which owners currently have an enemy inside any transformed black hole
    const ownerHasEnemyInHole = new Array(fighters.length).fill(false);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.capturedByBlackHole) {
        p.orbitAngle += 0.15;
        p.orbitRadius = Math.max(10, p.orbitRadius - 0.5);
        p.x = p.capturedByBlackHole.x + Math.cos(p.orbitAngle) * p.orbitRadius;
        p.y = p.capturedByBlackHole.y + Math.sin(p.orbitAngle) * p.orbitRadius;

        if (p.angle !== undefined) {
          p.angle = p.orbitAngle + Math.PI / 2;
        }

        // Clear history so the trail doesn't stretch across the screen like a snake
        if (p.history) {
          p.history = [];
        }
        continue;
      }

      if (p.isExplosion) {
        // OPTIMIZED: Skip update for visual-only particles on alternate frames when quality is low
        if (p.isVisual && state.qualityLevel < 0.8 && visualUpdateFrame % 2 === 0) {
          // Still decrement life but skip position update
          p.life -= 1;
          if (p.life <= 0) {
            this._returnProjectile(p);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
          }
          continue;
        }

        if (typeof p.vx === 'number') p.x += p.vx;
        if (typeof p.vy === 'number') p.y += p.vy;
        if (typeof p.gravity === 'number') p.vy += p.gravity;
        if (typeof p.rotation === 'number') p.rotation += p.rotationSpeed || 0;
        p.life -= 1;
        if (p.life <= 0) {
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
        }
        continue;
      }

      // --- Gojo Limitless (Infinity) Spatial Projectile Interception ---
      if (!p.isGojoBlue && !p.isGojoPurple && !p.isVisual && p.visual !== 'ghostBlade' && p.life > 0) {
        for (let fi = 0; fi < fighters.length; fi++) {
          if (fi === p.owner) continue;
          const f = fighters[fi];
          if (!f || f.hp <= 0 || f.characterId !== 'gojo') continue;
          if (areOnSameTeam(p.owner, fi)) continue;

          const infinityRadius = f.r + 30;
          const dx = p.x - f.x;
          const dy = p.y - (f.y - (f.z || 0));
          const distSq = dx * dx + dy * dy;
          if (distSq <= infinityRadius * infinityRadius && (f.infinityCooldown <= 0 || f.infinityActive)) {
            // Intercepted by Limitless: speed reduced to 0 and damage nullified!
            p.vx *= 0.02;
            p.vy *= 0.02;
            p.life = 0; // Nullified at Infinity barrier
            if (typeof f.triggerInfinityBlock === 'function') {
              f.triggerInfinityBlock(p.x, p.y);
            }
          }
        }
      }

      // --- Gojo Blue Pull & Drag Logic ---
      if (p.isGojoBlue) {
        const pullRadius = CONFIG.gojo.blueRadius || 90; // Pull radius for Blue
        const ownerTeam = state.getFighterTeam(p.owner);
        for (let fi = 0; fi < fighters.length; fi++) {
          if (fi === p.owner) continue;
          const f = fighters[fi];
          if (!f || f.hp <= 0) continue;
          
          const isEnemy = ownerTeam === null || state.getFighterTeam(fi) !== ownerTeam;
          if (isEnemy && !f.immuneToCC) {
            const dx = p.x - f.x;
            const dy = p.y - f.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < pullRadius) {
              // 1. Inward spatial attraction toward orb center
              const pullStrength = 3.5;
              const force = (pullRadius - dist) / pullRadius * pullStrength;
              f.x += (dx / dist) * force;
              f.y += (dy / dist) * force;

              // 2. Drag & carry target along with orb velocity toward the wall
              const dragSpeed = 0.55;
              f.vx = f.vx * 0.4 + p.vx * dragSpeed;
              f.vy = f.vy * 0.4 + p.vy * dragSpeed;
            }
          }
        }
        // Allow it to fall through to standard movement and hit logic!
      }

      // --- Gojo Purple DPS + Slow + Pull Logic ---
      if (p.isGojoPurple) {
        // Advance visual time for animations so it freezes when caught in time sphere
        p.visualTime = (p.visualTime || Date.now()) + 16.667;

        const ownerTeam = state.getFighterTeam(p.owner);
        const purpleSlowDuration = CONFIG.gojo.purpleSlowDuration || 60;
        const purpleSlowMultiplier = CONFIG.gojo.purpleSlowMultiplier || 0.5;
        const purplePullForce = CONFIG.gojo.purplePullForce || 2.0;
        const purpleScale = CONFIG.gojo.purpleScale || 1.0;
        const effectiveRadius = p.r * purpleScale; // Scaled hit radius based on visual size
        
        // Continuous screen shake while purple orb is active
        p.purpleShakeCounter = (p.purpleShakeCounter || 0) + 1;
        if (p.purpleShakeCounter >= 5) { // Shake every 5 frames for continuous effect
          p.purpleShakeCounter = 0;
          const shakeIntensity = CONFIG.gojo.purpleShakeIntensity || 2;
          const shakeDuration = CONFIG.gojo.purpleShakeDuration || 30;
          triggerGlobalScreenShake(shakeIntensity, shakeDuration);
        }
        
        // Record history for trail effect - Hollow Purple swirling vortex
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 20) p.history.shift(); // Keep last 20 positions for trail
        
        // Destroy incoming enemy projectiles (like Sukuna's slashes) that touch Purple
        for (let j = 0; j < this.projectiles.length; j++) {
            const otherProj = this.projectiles[j];
            if (otherProj === p || otherProj.isVisual || otherProj.life <= 0) continue;
            // Only destroy enemy projectiles
            if (areOnSameTeam(p.owner, otherProj.owner)) continue;
            
            // Check distance to see if the enemy projectile touches the Purple Orb
            const dx = p.x - otherProj.x;
            const dy = p.y - otherProj.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= effectiveRadius * effectiveRadius) {
                // Sucked into Hollow Purple and erased from existence
                otherProj.life = 0;
                spawnSparks(otherProj.x, otherProj.y, 3, 'purpleTrail', '#8A2BE2');
            }
        }
        
        // DPS tick - damage enemies within the purple orb's radius periodically
        p.purpleLastDPSTick = (p.purpleLastDPSTick || 0) + 1;
        if (p.purpleLastDPSTick >= p.purpleDPSInterval) {
          p.purpleLastDPSTick = 0;
          
          // Find all enemies within the purple orb's radius and apply DPS damage
          for (let fi = 0; fi < fighters.length; fi++) {
            if (fi === p.owner) continue;
            const f = fighters[fi];
            if (!f || f.hp <= 0) continue;
            
            const isEnemy = ownerTeam === null || state.getFighterTeam(fi) !== ownerTeam;
            if (isEnemy) {
              const dx = f.x - p.x;
              const dy = f.y - p.y;
              const distSq = dx * dx + dy * dy;
              const radiusSq = effectiveRadius * effectiveRadius;
              
              if (distSq < radiusSq) {
                // Apply DPS damage
                const attacker = fighters[p.owner];
                const dpsDamage = p.purpleDPS * (p.purpleDPSInterval / 60); // Convert DPS to per-tick damage
                if (typeof f.takeDamage === 'function') {
                  f.takeDamage(dpsDamage, attacker, { isProjectile: true, projectile: p });
                }
                
                // Apply slow effect - refresh duration if already slowed
                if (f.slowTimer !== undefined) {
                  f.slowTimer = Math.max(f.slowTimer, purpleSlowDuration);
                  f.slowMultiplier = Math.min(f.slowMultiplier || 1, purpleSlowMultiplier);
                }
                
                // Dampen velocity so fighters don't fight against the drag
                if (f.vx !== undefined && f.vy !== undefined) {
                  f.vx *= 0.8; // Reduce velocity by 20% each frame while being dragged
                  f.vy *= 0.8;
                }
                
                // Visual feedback - sparks on DPS tick
                spawnSparks(f.x, f.y, 5, 'lightningTrail', '#8A2BE2');
              }
            }
          }
        }
        
        // Continuous slow + pull effect for all enemies in the purple orb's radius
        for (let fi = 0; fi < fighters.length; fi++) {
          if (fi === p.owner) continue;
          const f = fighters[fi];
          if (!f || f.hp <= 0) continue;
          
          const isEnemy = ownerTeam === null || state.getFighterTeam(fi) !== ownerTeam;
          if (isEnemy && !f.immuneToCC) {
            const dx = p.x - f.x;
            const dy = p.y - f.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0 && dist < effectiveRadius) {
              // Apply slow effect continuously while in range
              if (f.slowTimer !== undefined) {
                f.slowTimer = Math.max(f.slowTimer || 0, 10); // Keep slow active
                f.slowMultiplier = Math.min(f.slowMultiplier || 1, purpleSlowMultiplier);
              }
              
              // Drag enemy toward purple orb center
              const pullStrength = purplePullForce * (1 - dist / effectiveRadius); // Stronger pull near center
              f.x += (dx / dist) * pullStrength;
              f.y += (dy / dist) * pullStrength;
              
              // Dampen velocity so fighters don't fight against the drag
              if (f.vx !== undefined && f.vy !== undefined) {
                f.vx *= 0.8; // Reduce velocity by 20% each frame while being dragged
                f.vy *= 0.8;
              }
            }
          }
        }
      }

      if (p.isGrenade) {
        // ── Decoupled: Frozen grenades are in frozenProjectiles array, not here ──

        if (!p.history) p.history = [];
        p.history.push({ x: p.x, y: p.y, z: p.z });
        if (p.history.length > 12) p.history.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.vz -= p.g;
        p.life -= 1;

        if (p.z < 0) p.z = 0;

        if (p.life <= 0) {
          this.detonateGrenade(p, fighters);
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
        }
        continue;
      }

      if (p.isBomberGrenade) {
        // ── Decoupled: Frozen bomber grenades are in frozenProjectiles array, not here ──

        if (!p.history) p.history = [];
        p.history.push({ x: p.x, y: p.y, z: p.z });
        if (p.history.length > 12) p.history.shift();

        // Handle sticky bomb behavior
        if (p.isSticky && p.stuckToFighter !== null) {
          const stuckFighter = fighters[p.stuckToFighter];
          if (stuckFighter && stuckFighter.hp > 0) {
            p.x = stuckFighter.x;
            p.y = stuckFighter.y;
            p.z = 0;
            p.stickTimer++;
            if (p.stickTimer >= CONFIG.bomber.stickyBombStickDuration) {
              this.detonateBomberGrenade(p, fighters);
              this._returnProjectile(p);
              this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
              this.projectiles.pop();
              i--;
              continue;
            }
          } else {
            // Fighter died, explode immediately
            this.detonateBomberGrenade(p, fighters);
            this._returnProjectile(p);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
            continue;
          }
        } else {
          // Arc trajectory movement
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.vz -= p.g;
          p.life -= 1;

          if (p.z < 0) p.z = 0;

          // Check for sticky bomb attachment
          if (p.isSticky) {
            for (let fi = 0; fi < fighters.length; fi++) {
              if (p.owner === fi) continue;
              if (areOnSameTeam(p.owner, fi)) continue;
              const fighter = fighters[fi];
              if (!fighter || fighter.hp <= 0) continue;
              const fdx = fighter.x - p.x;
              const fdy = fighter.y - p.y;
              const combinedR = fighter.r + p.r;
              if ((fdx * fdx + fdy * fdy) < combinedR * combinedR) {
                p.stuckToFighter = fi;
                p.vx = 0;
                p.vy = 0;
                p.vz = 0;
                p.z = 0;
                break;
              }
            }
          }

          // Auto-explode on life end or ground impact
          if (p.life <= 0 || p.z <= 0) {
            this.detonateBomberGrenade(p, fighters);
            this._returnProjectile(p);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
            continue;
          }
        }
        continue;
      }

      if (p.isC4) {
        // ── Decoupled: Frozen C4 projectiles are in frozenProjectiles array, not here ──
        p.pulsePhase += 0.15;
        p.life -= 1;

        // Explode if hit by any other attack (projectile)
        let hitByAttack = false;
        for (let j = 0; j < this.projectiles.length; j++) {
          if (i === j) continue;
          const other = this.projectiles[j];
          // Skip visual-only and non-physical projectiles
          if (other.isVisual || other.isExplosion || other.isPoisonSpill) continue;
          if (other.isC4) continue;
          if (other.isBlackHole && other.transformed) continue; // stationary black holes don't instantly detonate it

          // ── Bounding-box culling ──
          const combinedRadius = p.r + (other.r || 5);
          const odx = p.x - other.x;
          const ody = p.y - other.y;
          if (Math.abs(odx) > combinedRadius || Math.abs(ody) > combinedRadius) continue;

          if ((odx * odx + ody * ody) < combinedRadius * combinedRadius) {
            hitByAttack = true;
            break;
          }
        }

        if (p.life <= 0 || hitByAttack) {
          this.detonateC4(p, fighters);
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
          continue;
        }
        continue;
      }
      // --- Black-hole projectile handling ---
      if (p.isBlackHole) {
        // ── Decoupled: Frozen black holes are in frozenProjectiles array, not here ──

        // Advance visual time for animations so they can freeze smoothly
        p.visualTime = (p.visualTime || Date.now()) + 16.667;

        // If not yet transformed, move as a projectile until timer expires
        if (!p.transformed) {
          p.x += p.vx;
          p.y += p.vy;
          p.transformTimer = (p.transformTimer || 0) - 1;
          p.life -= 1;

          // If transform timer elapsed, convert to stationary black hole
          if (p.transformTimer <= 0) {
            p.transformed = true;
            p.vx = 0;
            p.vy = 0;
            p.life = CONFIG.black.blackHoleDuration;
            p.maxLife = CONFIG.black.blackHoleDuration;
            p.r = CONFIG.black.blackHoleRadius;
            p.tickTimer = 0;
          }

          // Still allow this projectile to hit before transforming
          const hit = this.checkProjectileHits(p, fighters);
          const expired = this.isProjectileExpired(p);
          // For black-hole-capable projectiles, don't remove on hit so they can
          // still travel and transform into a black hole after their timer.
          if (expired) {
            this._returnProjectile(p);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
          }
          continue;
        }

        // Transformed black hole: apply pull and periodic damage
        p.life -= 1;
        p.tickTimer = (p.tickTimer || 0) + 1;
        // decrement visual summon indicator if present
        if (p.indicatorTimer > 0) p.indicatorTimer--;

        const ownerIndex = p.owner;
        const tickInterval = p.maxLife <= 60 ? 1 : 60;

        for (let fi = 0; fi < fighters.length; fi++) {
          if (!fighters[fi]) continue;
          if (fi === ownerIndex) continue;
          const f = fighters[fi];
          const dx = p.x - f.x;
          const dy = p.y - f.y;
          const effectiveRadius = p.r + f.r;
          if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;

          const dist = Math.hypot(dx, dy);
          if (dist < effectiveRadius) {
            if (!f.immuneToCC) {
              // Pull fighter toward hole center.
              // Stronger pull when the fighter is moving faster than normal,
              // so speed boosts can't let them escape the black hole.
              const nx = dist > 0 ? dx / dist : 0;
              const ny = dist > 0 ? dy / dist : 0;
              const speedFactor = Math.max(1, f.speed / (f.baseSpeed || f.speed || 1));
              const pullStrength = CONFIG.black.blackHolePullStrength * speedFactor * (1 - dist / effectiveRadius);

              // Apply visual shrinking effect
              const minScale = CONFIG.black.blackHoleVisualShrinkMin ?? 0.3;
              const targetScale = minScale + (1 - minScale) * (dist / effectiveRadius);
              if (f.visualScaleTarget === undefined || targetScale < f.visualScaleTarget) {
                f.visualScaleTarget = targetScale;
              }

              const radialVelocity = f.vx * nx + f.vy * ny;
              if (radialVelocity < 0) {
                const correction = -radialVelocity * 1.2;
                f.vx += nx * correction;
                f.vy += ny * correction;
              }

              f.vx += nx * pullStrength;
              f.vy += ny * pullStrength;
            }

            // Mark owner as having an enemy in hole (affects enhanced shots)
            ownerHasEnemyInHole[ownerIndex] = true;

            // Periodic damage.
            if (p.tickTimer % tickInterval === 0) {
              try {
                if (!areOnSameTeam(ownerIndex, fi)) {
                  f.takeDamage(CONFIG.black.blackHoleDamage, fighters[ownerIndex], { fromBlackHole: true, bhTextInterval: tickInterval });
                }
              } catch (e) { console.error('Black hole damage error', e); }
            }
          }
        }

        // Apply pull to illusions
        if (typeof state !== 'undefined' && state.illusions) {
          for (const illusion of state.illusions) {
            if (!illusion || illusion.hp <= 0) continue;
            // Skip if the black hole owner is on the same team as the illusion
            const illusionOwnerIndex = illusion.owner?.fighterIndex ?? state.fighters?.indexOf(illusion.owner);
            if (illusionOwnerIndex !== undefined && illusionOwnerIndex !== -1) {
              if (ownerIndex === illusionOwnerIndex || areOnSameTeam(ownerIndex, illusionOwnerIndex)) continue;
            }

            const dx = p.x - illusion.x;
            const dy = p.y - illusion.y;
            const effectiveRadius = p.r + illusion.r;

            if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;

            const dist = Math.hypot(dx, dy);

            if (dist < effectiveRadius) {
              const nx = dist > 0 ? dx / dist : 0;
              const ny = dist > 0 ? dy / dist : 0;
              const speedFactor = Math.max(1, (illusion.speed || illusion.moveSpeed || 1) / (illusion.baseSpeed || illusion.moveSpeed || 1));
              const pullStrength = CONFIG.black.blackHolePullStrength * speedFactor * (1 - dist / effectiveRadius);

              // Apply visual shrinking effect
              const minScale = CONFIG.black.blackHoleVisualShrinkMin ?? 0.3;
              const targetScale = minScale + (1 - minScale) * (dist / effectiveRadius);
              if (illusion.visualScaleTarget === undefined || targetScale < illusion.visualScaleTarget) {
                illusion.visualScaleTarget = targetScale;
              }

              const radialVelocity = (illusion.vx || 0) * nx + (illusion.vy || 0) * ny;
              if (radialVelocity < 0) {
                const correction = -radialVelocity * 1.2;
                illusion.vx = (illusion.vx || 0) + nx * correction;
                illusion.vy = (illusion.vy || 0) + ny * correction;
              }

              illusion.vx = (illusion.vx || 0) + nx * pullStrength;
              illusion.vy = (illusion.vy || 0) + ny * pullStrength;

              ownerHasEnemyInHole[ownerIndex] = true;

              if (p.tickTimer % tickInterval === 0) {
                try {
                  applyDamageToTarget(illusion, CONFIG.black.blackHoleDamage, fighters[ownerIndex], { fromBlackHole: true, bhTextInterval: tickInterval });
                } catch (e) { console.error('Black hole damage error', e); }
              }
            }
          }
        }

        // Apply pull to other projectiles
        for (let j = 0; j < this.projectiles.length; j++) {
          if (j === i) continue;
          const otherProj = this.projectiles[j];
          // Skip visual-only and non-physical projectiles
          if (otherProj.isVisual || otherProj.isExplosion || otherProj.isPoisonSpill) continue;
          if (otherProj.isBlackHole) continue;

          const otherProjOwner = fighters[otherProj.owner];
          if (otherProjOwner && otherProjOwner._def && otherProjOwner._def.type === 'black') continue;

          const dx = p.x - otherProj.x;
          const dy = p.y - otherProj.y;
          const effectiveRadius = p.r * 2.5; // pull radius for projectiles

          // ── Bounding-box culling ──
          if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq < effectiveRadius * effectiveRadius) {
            if (distSq < p.r * p.r * 0.25) {
              if (otherProj.isExplosion) {
                // Sucked in! Destroy silently (no detonation)
                this._returnProjectile(otherProj);
                const lastIdx = this.projectiles.length - 1;
                this.projectiles[j] = this.projectiles[lastIdx];
                this.projectiles.pop();
                if (lastIdx === i) {
                  i = j; // The black hole itself was moved to index j
                }
                j--;
                continue;
              }

              // Capture the projectile instead of destroying it
              if (!otherProj.capturedByBlackHole) {
                const dist = Math.sqrt(distSq);
                otherProj.capturedByBlackHole = p;
                otherProj.orbitRadius = dist;
                otherProj.orbitAngle = Math.atan2(otherProj.y - p.y, otherProj.x - p.x);
              }
            } else {
              // Pull the projectile
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              // Stronger pull on projectiles so they realistically spiral in
              const pullStrength = CONFIG.black.blackHolePullStrength * 2.5 * (1 - dist / effectiveRadius);
              otherProj.vx += nx * pullStrength;
              otherProj.vy += ny * pullStrength;

              if (otherProj.angle !== undefined && !otherProj.isGrenade && !otherProj.isC4) {
                otherProj.angle = Math.atan2(otherProj.vy, otherProj.vx);
              }
            }
          }
        }
        // Remove hole when life expired
        if (p.life <= 0) {
          // Release captured projectiles
          for (let k = 0; k < this.projectiles.length; k++) {
            const capturedProj = this.projectiles[k];
            if (capturedProj.capturedByBlackHole === p) {
              capturedProj.capturedByBlackHole = null;
              const releaseSpeed = CONFIG.black?.blackHoleReleaseSpeed ?? 3.5;
              capturedProj.vx = Math.cos(capturedProj.orbitAngle + Math.PI / 2) * releaseSpeed;
              capturedProj.vy = Math.sin(capturedProj.orbitAngle + Math.PI / 2) * releaseSpeed;
            }
          }
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
        }

        continue;
      }

      // Normal projectile behavior
      if (p.isFlame) {
        const noise = (Math.random() - 0.5) * p.turbulence;
        const perpX = -p.vy;
        const perpY = p.vx;
        const perpLenSq = perpX * perpX + perpY * perpY;
        const perpLen = perpLenSq > 0 ? Math.sqrt(perpLenSq) : 1;
        p.vx += (perpX / perpLen) * noise;
        p.vy += (perpY / perpLen) * noise;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        const desired = p.baseSpeed || speed;
        p.vx *= desired / speed;
        p.vy *= desired / speed;
        p.wobblePhase += 0.18;
      }

      // Smooth serpentine wave movement for Arcane Bolt
      if (p.isArcaneBolt) {
        if (p.wobblePhase === undefined) {
          p.wobblePhase = (p.id || Math.random()) * 10;
        }
        const perpX = -p.vy;
        const perpY = p.vx;
        const speed = Math.hypot(p.vx, p.vy);
        const normX = speed !== 0 ? perpX / speed : 0;
        const normY = speed !== 0 ? perpY / speed : 0;
        
        // Fluid, elegant curve
        const waveSpeed = 0.12; 
        const waveAmplitude = 1.8;
        const wobble = Math.cos(p.wobblePhase) * waveAmplitude;
        
        p.x += normX * wobble;
        p.y += normY * wobble;
        
        p.wobblePhase += waveSpeed;
      }

      // Natural zigzag movement for Chain Lightning
      if (p.isChainLightning) {
        const perpX = -p.vy;
        const perpY = p.vx;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed !== 0) {
          const normX = perpX / speed;
          const normY = perpY / speed;
          // Random lateral offset each frame creates a jagged path
          const jaggedOffset = (Math.random() - 0.5) * 16;
          p.x += normX * jaggedOffset;
          p.y += normY * jaggedOffset;
        }
      }

      // Record trail history for normal (non-special) projectiles
      // Used by drawProjectiles() to render a motion streak.
      // ── Decoupled: Frozen projectiles are in frozenProjectiles array, not here ──
      // PERFORMANCE: Use swap-and-pop for O(1) removal instead of shift O(n)
      if (!p.fadingOut) {
        if (!p.history) p.history = [];
        p.history.push({ x: p.x, y: p.y });
        const maxHistory = p.historyMax || (p.isArcaneBolt ? 30 : (p.isBlue ? 8 : 10));
        if (p.history.length > maxHistory) {
          while (p.history.length > maxHistory) {
            p.history.shift();
          }
        }
      }

      // Apply drag to shotgun pellets so they lose velocity quickly over distance
      if (p.visual === 'EngineerBullet') {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      // Normal projectile movement
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      // TRICKSTER / CRONOS SPHERE BLENDER EFFECT:
      // If the owner has an active Time Sphere, trap their projectiles inside it!
      const owner = fighters[p.owner];
      if (owner && owner.sphereActive && owner.sphereTimer > 0) {
        const R = CONFIG.cronos.sphereRadius;
        // Check if it was previously inside the sphere, but is now outside
        const prevX = p.x - p.vx;
        const prevY = p.y - p.vy;
        const prevDistSq = (prevX - owner.sphereX) ** 2 + (prevY - owner.sphereY) ** 2;
        const currentDistSq = (p.x - owner.sphereX) ** 2 + (p.y - owner.sphereY) ** 2;
        
        if (prevDistSq <= R * R && currentDistSq > R * R) {
          const dist = Math.sqrt(currentDistSq);
          const nx = (p.x - owner.sphereX) / dist;
          const ny = (p.y - owner.sphereY) / dist;
          
          // Reflect velocity against the sphere's inner normal
          const dot = p.vx * nx + p.vy * ny;
          if (dot > 0) {
            p.vx = p.vx - 2 * dot * nx;
            p.vy = p.vy - 2 * dot * ny;
            
            // Push it safely back inside the boundary
            p.x = owner.sphereX + nx * (R - 1);
            p.y = owner.sphereY + ny * (R - 1);
            
            // Update rotation for visual consistency (like Shurikens or bullets)
            if (p.rotation !== undefined && !p.isGrenade && !p.isBomberGrenade) {
              p.rotation = Math.atan2(p.vy, p.vx);
            }
          }
        }
      }



      if (p.fadingOut) {
        // Trail shrinks from the tail toward the impact point
        // Just consume old tail positions — do NOT move p.x/p.y
        if (p.history && p.history.length > 0) {
          // Remove 1 point per frame so it shrinks slower and smoother
          p.history.shift();
        }

        // Dissolve into magical sparks while fading
        if (p.isArcaneBolt && Math.random() < 0.8) {
          spawnSparks(p.x, p.y, 2, 'arcane');
        }
        
        // Smoothly fade out the opacity
        if (p.fadingAlpha === undefined) p.fadingAlpha = 1.0;
        p.fadingAlpha -= 0.06; // About ~16 frames to fully fade to invisible
        
        if (p.fadingAlpha <= 0 || (!p.history || p.history.length <= 1)) {
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
        }
        continue;
      }

      const hit = this.checkProjectileHits(p, fighters);
      const expired = this.isProjectileExpired(p);

      if (hit || expired) {
        const isCrimson = p.visual === 'crimsonSniperBullet';
        const isCrimsonEnhanced = p.visual === 'crimsonSniperBullet_enhanced';
        
        if ((isCrimson || isCrimsonEnhanced) && expired && !hit && p.life > 0) {
          // Spawn wall hit sparks for Crimson Sniper - VISUAL ONLY (no collision/physics)
          const sparkMultiplier = isCrimsonEnhanced ? 3 : 1;
          const sparkCount = (6 + Math.random() * 4) * sparkMultiplier;
          const hitAngle = Math.atan2(-p.vy, -p.vx);

          // 1. Impact Flash (visual-only)
          const flashSize = (25 + Math.random() * 15) * (isCrimsonEnhanced ? 2.5 : 1);
          spawnImpactFlash(p.x, p.y, flashSize, 'crimsonSniper');

          // 2. High-speed sparks (visual-only, bypass physics/collision)
          spawnSparks(p.x, p.y, sparkCount, 'crimsonSniper');
          
          // 3. Enhanced bullet gets a massive crimson lightning shockwave on wall impact
          if (isCrimsonEnhanced) {
            spawnCrimsonLightningImpact(p.x, p.y, 80);
            
            // Spawn an intense ground scorch at the impact site
            spawnGroundScorch(p.x, p.y, 80, 150);
            
            // Massive arena shake
            triggerGlobalScreenShake(25, 20);
          }
        }

        if (p.visual === 'shuriken' && expired && !hit && p.life > 0) {
          if (Math.random() < 0.6) {
            const arena = CONFIG.arena;
            let stuckX = Math.max(arena.x, Math.min(arena.x + arena.width, p.x));
            let stuckY = Math.max(arena.y, Math.min(arena.y + arena.height, p.y));
            this.stuckShurikens.push({
              x: stuckX,
              y: stuckY,
              angle: Math.atan2(p.vy, p.vx) + (Math.random() * Math.PI),
              life: 300,
              maxLife: 300,
              scale: Math.max(0.6, (fighters[p.owner] ? fighters[p.owner].r / 25 : 0.8))
            });
          }
        }

        if (p.history && p.history.length > 1) {
          p.fadingOut = true;
          // Store velocity before setting to 0 so visual angle is maintained during fade out
          p._resumeVx = p.vx;
          p._resumeVy = p.vy;
          // Stop collision and movement logic
          p.vx = 0;
          p.vy = 0;
        } else {
          this._returnProjectile(p);
          // Swap with last element and pop for O(1) removal
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--; // Adjust index since we swapped
        }
      }
    }

    // Update BlackFighter instances with whether their enemy is in a black hole
    for (let oi = 0; oi < ownerHasEnemyInHole.length; oi++) {
      const f = fighters[oi];
      if (f && typeof f.enemyInBlackHole !== 'undefined') {
        const prev = !!f.enemyInBlackHole;
        const nowInHole = !!ownerHasEnemyInHole[oi];
        // If the enemy was just pulled into a black hole, grant enhanced shots
        if (nowInHole && !prev) {
          try {
            f.enhancedShotsRemaining = Math.max(f.enhancedShotsRemaining || 0, (CONFIG.black.enhancedShotsGranted || 1));
          } catch (e) {
            // ignore if fighter doesn't support enhancedShotsRemaining
          }
        }
        f.enemyInBlackHole = nowInHole;
      }
    }

    // Update stuck shurikens
    for (let i = 0; i < this.stuckShurikens.length; i++) {
      const s = this.stuckShurikens[i];
      s.life--;
      if (s.life <= 0) {
        this.stuckShurikens[i] = this.stuckShurikens[this.stuckShurikens.length - 1];
        this.stuckShurikens.pop();
        i--;
      }
    }
  }

  /**
   * Immediately spawn a transformed black hole at a world position.
   */
  fireBlackHole(x, y, ownerIndex, damage) {
    const proj = this._getProjectile();
    proj.x = x;
    proj.y = y;
    proj.vx = 0;
    proj.vy = 0;
    proj.r = CONFIG.black.blackHoleRadius;
    proj.life = CONFIG.black.blackHoleDuration;
    proj.maxLife = CONFIG.black.blackHoleDuration;
    proj.color = 'rgba(153,0,255,0.9)';
    proj.owner = ownerIndex;
    proj.damage = damage || CONFIG.black.blackHoleDamage;
    proj.isBlackHole = true;
    proj.transformed = true;
    proj.tickTimer = 0;
    proj.indicatorTimer = CONFIG.black.summonIndicatorFrames;
    proj.indicatorLife = CONFIG.black.summonIndicatorFrames;
    this.projectiles.push(proj);
  }

  fireArcaneBolt(fighter, ownerIndex, damage, opponent) {
    if (!fighter || !opponent) return;
    const speed = CONFIG.trickster.boltSpeed;
    const radius = CONFIG.projectile.radius * 0.9;
    const tipDist = GUN_TIP_DIST(fighter.r);
    
    const targetX = opponent.x;
    const targetY = opponent.y;
    const dist = Math.hypot(targetX - fighter.x, targetY - fighter.y) || 1;
    const dirX = (targetX - fighter.x) / dist;
    const dirY = (targetY - fighter.y) / dist;
    const gunAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : Math.atan2(dirY, dirX);
    const cosA = Math.cos(gunAngle);
    const sinA = Math.sin(gunAngle);
    
    // The staff is translated and rotated in drawTricksterStaff:
    // 1. Translated by (fighter.r * 0.4, fighter.r * 0.85)
    // 2. Rotated by Math.PI * 0.3
    // 3. The tip of the crystal is at (0, -75) relative to the staff
    const tipLocalX = 75 * Math.sin(Math.PI * 0.3) + fighter.r * 0.4;
    const tipLocalY = -75 * Math.cos(Math.PI * 0.3) + fighter.r * 0.85;

    // Prevent gun clipping when extremely close to the opponent (e.g. frozen in Time Sphere)
    const tipOffsetDist = Math.hypot(tipLocalX, tipLocalY);
    const maxOffset = Math.max(0, dist - opponent.r);
    let scale = 1.0;
    if (tipOffsetDist > maxOffset) {
      scale = maxOffset / tipOffsetDist;
    }
    const scaledTipX = tipLocalX * scale;
    const scaledTipY = tipLocalY * scale;
    
    // Convert local hand coordinates to world coordinates based on the fighter's rotation
    const startX = fighter.x + scaledTipX * cosA - scaledTipY * sinA;
    const startY = fighter.y + scaledTipX * sinA + scaledTipY * cosA;
    const proj = this._getProjectile();
    proj.x = startX;
    proj.y = startY;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = radius;
    proj.life = 180; // 3 seconds max life per bounce
    proj.maxLife = 180;
    proj.color = '#00ffff'; // Electric cyan/blue

    proj.owner = ownerIndex;
    proj.damage = damage;
    proj.isArcaneBolt = true;
    proj.hitFighters = new Set();
    this.projectiles.push(proj);
  }

  /**
   * Clears all projectiles, returning each to the pool for reuse.
   * Also clears the frozen projectiles array.
   */
  clear() {
    // Return all active projectiles to the pool before clearing
    for (let i = 0; i < this.projectiles.length; i++) {
      this._returnProjectile(this.projectiles[i]);
    }
    this.projectiles.length = 0;

    // Return all frozen projectiles to the pool before clearing
    for (let i = 0; i < this.frozenProjectiles.length; i++) {
      this._returnProjectile(this.frozenProjectiles[i]);
    }
    this.frozenProjectiles.length = 0;
    this.stuckShurikens.length = 0;
  }

  /**
   * Returns all projectiles (active + frozen) for rendering.
   * Frozen projectiles are included so they can be drawn in their frozen positions.
   */
  getProjectiles() {
    // Return combined array for rendering — frozen projectiles are drawn in-place
    return this.projectiles.concat(this.frozenProjectiles);
  }

  /**
   * Returns only active projectiles for physics/collision processing.
   * Frozen projectiles are excluded from the hot path.
   */
  getActiveProjectiles() {
    return this.projectiles;
  }

  /**
   * Returns the count of frozen projectiles (for UI/debug display).
   */
  getFrozenCount() {
    return this.frozenProjectiles.length;
  }
}

// Global projectile system instance for production use
export const projectileSystem = new ProjectileSystem();

// Register with state module so getProjectiles/clearProjectiles work
// without state.js needing to import this file (breaks circular dependency)
registerProjectileSystem(projectileSystem);
