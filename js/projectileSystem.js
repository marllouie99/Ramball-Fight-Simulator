// ─────────────────────────────────────────────
// PROJECTILE SYSTEM - Dependency Injection Module
// ─────────────────────────────────────────────
import { CONFIG, GUN_TIP_DIST } from './config.js';
import { GAME_MODES } from './modeConfig.js';
import { state } from './state.js';
import { applyDamageToTarget } from './fighter.js';
import { playSound } from './soundSystem.js';
import { getBasicAttackSound } from './soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from './soundEffects/skillEffectSounds.js';
import { bomberExplosionSystem } from './weaponVisual/bomberExplosionVisuals.js';

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
    this.pool = [];
    this.poolSize = 500; // Pre-allocate pool size
  }

  /**
   * Get a projectile from pool or create new one
   */
  _getProjectile() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return {};
  }

  /**
   * Return projectile to pool for reuse
   */
  _returnProjectile(proj) {
    // Clear projectile data
    for (const key in proj) {
      delete proj[key];
    }
    if (this.pool.length < this.poolSize) {
      this.pool.push(proj);
    }
  }

  /**
   * Spawns a standard projectile from the fighter's gun barrel tip.
   * Optionally accepts custom spawn position and angle for dual-wield fighters.
   */
  fireProjectile(fighter, ownerIndex, damage, isFollowUp = false, speedOverride, willBecomeBlackHole = false, visual, customSpawnX, customSpawnY, customAngle) {
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
      const tipDist = GUN_TIP_DIST(fighter.r);
      dirX = Math.cos(fighter.gunAngle);
      dirY = Math.sin(fighter.gunAngle);
      spawnX = fighter.x + dirX * tipDist;
      spawnY = fighter.y + dirY * tipDist;
    }

    // Determine visual type based on fighter type
    let visualType = visual;
    if (!visualType && fighter._def && fighter._def.type === 'gunslinger') {
      visualType = 'gunslingerBullet';
    }

    const proj = this._getProjectile();
    proj.x = spawnX;
    proj.y = spawnY;
    proj.vx = dirX * speed;
    proj.vy = dirY * speed;
    proj.r = radius;
    proj.life = life;
    proj.color = fighter.color;
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(projDamage) ? projDamage : 0;
    proj.isFollowUp = isFollowUp;
    proj.visual = visualType;
    proj.history = [{ x: spawnX, y: spawnY }];
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

    const proj = {
      originX,
      originY,
      x: originX + perpX * coneOffset,
      y: originY + perpY * coneOffset,
      vx: dirX * speed,
      vy: dirY * speed,
      r: radius,
      life,
      maxLife: life,
      startLife: life,
      baseRadius: radius,
      baseSpeed: speed,
      color: colorOverride || 'rgba(255, 160, 0, 0.92)',
      owner: ownerIndex,
      damage: Number.isFinite(projDamage) ? projDamage : 0,
      isFollowUp: false,
      isFlame: true,
      turbulence: 0.06 + Math.random() * 0.06,
      wobblePhase: Math.random() * Math.PI * 2,
    };

    this.projectiles.push(proj);
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
    this.projectiles.push({
      x: startX,
      y: startY,
      z: 15,
      vx: vx,
      vy: vy,
      vz: vz,
      g: g,
      r: radius * 1.2,
      life,
      maxLife: life,
      color: fighter.color,
      owner: ownerIndex,
      damage: Number.isFinite(projDamage) ? projDamage : 0,
      isGrenade: true,
      aoeRadius: 60,
      history: [],
    });
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
   */
  checkProjectileHits(projectile, fighters) {
    if (projectile.isExplosion) return false;
    if (projectile.isPoisonSpill) return false;

    for (let fi = 0; fi < fighters.length; fi++) {
      if (projectile.owner === fi) continue;
      // Skip teammates in 2v2 mode
      if (areOnSameTeam(projectile.owner, fi)) continue;

      const fighter = fighters[fi];
      if (!fighter || fighter.hp <= 0) continue;

      const dist = Math.hypot(fighter.x - projectile.x, fighter.y - projectile.y);
      const hitRadius = fighter.r + projectile.r;
      const proximityRadius = hitRadius + (CONFIG.darkslategray.proximityTriggerRadius || 0);

      if (dist < hitRadius) {
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
          const applied = fighter.takeDamage(damageAmount, attacker, { isFlame: true, projectile });
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
            if (projectile.isBlackHole && projectile.hitTargets) {
              projectile.hitTargets.add(fi);
            }
            return true;
          }

          projectile.dodgedFighters.add(fighter);
          continue; // projectile passes through on first dodge contact only
        }
        return true;
      }

      if (dist < proximityRadius && dist >= hitRadius) {
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

      const dist = Math.hypot(illusion.x - projectile.x, illusion.y - projectile.y);
      const hitRadius = illusion.r + projectile.r;
      if (dist < hitRadius) {
        const attacker = fighters[projectile.owner];
        applyDamageToTarget(illusion, projectile.damage, attacker, { isProjectile: true, projectile });
        return true;
      }
    }

    return false;
  }

  /**
   * Holds a projectile in place while it is inside a temporal sphere.
   * Returns true when the projectile should remain suspended until the sphere ends.
   */
  holdForTemporalBubble(projectile, fighters) {
    if (!projectile || !fighters) return false;

    // Check if we reached the maximum frozen projectiles limit globally
    let frozenCount = 0;
    const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 40;
    if (this.projectiles) {
      for (const p of this.projectiles) {
        if (p && p.timeStopped) frozenCount++;
      }
    }

    for (const fighter of fighters) {
      if (!fighter || !fighter.sphereActive) continue;
      const dist = Math.hypot(projectile.x - fighter.sphereX, projectile.y - fighter.sphereY);
      const range = CONFIG.cronos.sphereRadius;
      if (dist <= range) {
        if (!projectile.timeStopped && frozenCount >= maxFrozen) return false; // Prevent freezing more
        projectile._resumeVx = projectile.vx;
        projectile._resumeVy = projectile.vy;
        projectile._resumeVz = projectile.vz;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.vz = 0;
        projectile.timeStopped = true;
        projectile.timeStopTimer = CONFIG.cronos.sphereDuration;
        projectile.stoppedByCronosSphere = true;
        projectile.frozenByCronosSphere = true;
        return true;
      }
    }

    return false;
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
      const dist = Math.hypot(fighter.x - p.x, fighter.y - p.y);
      if (dist <= radius + fighter.r) {
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
      const dist = Math.hypot(illusion.x - p.x, illusion.y - p.y);
      if (dist <= radius + illusion.r) {
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
   */
  createAlchemistExplosion({ x, y, radius, owner }) {
    const motion = { x, y, vx: 0, vy: 0, owner, explosionType: 'poison', isExplosion: true };

    // Bright toxic flash
    const flash = this._getProjectile();
    Object.assign(flash, motion);
    flash.r = radius * 0.35;
    flash.life = 12;
    flash.maxLife = 12;
    flash.isExplosionFlash = true;
    this.projectiles.push(flash);

    // Poison cloud fireball
    const cloud = this._getProjectile();
    Object.assign(cloud, motion);
    cloud.r = radius;
    cloud.life = 28;
    cloud.maxLife = 28;
    cloud.isExplosionFireball = true;
    this.projectiles.push(cloud);

    // Expanding toxic shockwave ring
    const shockwave = this._getProjectile();
    Object.assign(shockwave, motion);
    shockwave.r = radius * 0.5;
    shockwave.life = 22;
    shockwave.maxLife = 22;
    shockwave.isExplosionShockwave = true;
    this.projectiles.push(shockwave);

    // Lingering green mist
    const mist = this._getProjectile();
    Object.assign(mist, motion);
    mist.r = radius * 0.5;
    mist.maxRadius = radius * 1.3;
    mist.life = 45;
    mist.maxLife = 45;
    mist.isExplosionSmoke = true;
    this.projectiles.push(mist);

    // Glass shatter particles from the bottle breaking
    const shardCount = 6 + Math.floor(Math.random() * 4);
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
      this.projectiles.push(shard);
    }

    // Poison bubble particles
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
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
      this.projectiles.push(bubble);
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
      const dist = Math.hypot(x - fighter.sphereX, y - fighter.sphereY);
      if (dist <= CONFIG.cronos.sphereRadius) {
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
      const dist = Math.hypot(fighter.x - p.x, fighter.y - p.y);
      if (dist <= radius + fighter.r) {
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
      const sound = getBasicAttackSound(ownerFighter.name, ownerFighter._def?.type);
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
      const dist = Math.hypot(fighter.x - p.x, fighter.y - p.y);
      if (dist <= radius + fighter.r) {
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
      const sound = getBasicAttackSound(ownerFighter.name, ownerFighter._def?.type);
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

      const dist = Math.hypot(fighter.x - x, fighter.y - y);
      if (dist <= radius + fighter.r) {
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
      const dist = Math.hypot(illusion.x - x, illusion.y - y);
      if (dist <= radius + illusion.r) {
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

      const dist = Math.hypot(projectile.x - x, projectile.y - y);
      if (dist <= chainRadius) {
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
    // PERFORMANCE OPTIMIZATION: Hard limit on active projectiles
    // 2v2 and FFA can spawn a massive amount of particles (especially flames) leading to lag.
    if (this.projectiles.length > 0) {
      const isMulti = state && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.FFA);
      const maxProjectiles = isMulti ? 150 : 350;
      
      if (this.projectiles.length > maxProjectiles) {
        let removedCount = 0;
        const targetToRemove = this.projectiles.length - maxProjectiles;
        
        // First pass: remove oldest flames since they are purely visual/minor damage and spawn in hundreds
        for (let i = 0; i < this.projectiles.length && removedCount < targetToRemove; i++) {
          if (this.projectiles[i] && this.projectiles[i].isFlame) {
            this._returnProjectile(this.projectiles[i]);
            this.projectiles.splice(i, 1);
            i--;
            removedCount++;
          }
        }
        
        // Second pass: if still over limit, just start pruning the oldest regular projectiles
        if (removedCount < targetToRemove) {
          const stillToRemove = targetToRemove - removedCount;
          for (let i = 0; i < stillToRemove && this.projectiles.length > 0; i++) {
            this._returnProjectile(this.projectiles[0]);
            this.projectiles.shift();
          }
        }
      }
    }

    // Track which owners currently have an enemy inside any transformed black hole
    const ownerHasEnemyInHole = new Array(fighters.length).fill(false);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.isExplosion) {
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

      if (p.isGrenade) {
        if (p.timeStopped) {
          p.timeStopTimer = (p.timeStopTimer || 0) - 1;
          if (p.timeStopTimer <= 0) {
            p.timeStopped = false;
            if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
              p.vx = p._resumeVx;
              p.vy = p._resumeVy;
            }
            if (typeof p._resumeVz === 'number') {
              p.vz = p._resumeVz;
            }
            delete p._resumeVx;
            delete p._resumeVy;
            delete p._resumeVz;
          }
          continue;
        }

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
        if (p.timeStopped) {
          p.timeStopTimer = (p.timeStopTimer || 0) - 1;
          if (p.timeStopTimer <= 0) {
            p.timeStopped = false;
            if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
              p.vx = p._resumeVx;
              p.vy = p._resumeVy;
            }
            if (typeof p._resumeVz === 'number') {
              p.vz = p._resumeVz;
            }
            delete p._resumeVx;
            delete p._resumeVy;
            delete p._resumeVz;
          }
          continue;
        }

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
              const dist = Math.hypot(fighter.x - p.x, fighter.y - p.y);
              if (dist < fighter.r + p.r) {
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
        if (p.timeStopped) {
          p.timeStopTimer = (p.timeStopTimer || 0) - 1;
          if (p.timeStopTimer <= 0) {
            p.timeStopped = false;
            if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
              p.vx = p._resumeVx;
              p.vy = p._resumeVy;
            }
            if (typeof p._resumeVz === 'number') {
              p.vz = p._resumeVz;
            }
            delete p._resumeVx;
            delete p._resumeVy;
            delete p._resumeVz;
          }
          continue;
        }

        p.pulsePhase += 0.15;
        p.life -= 1;

        if (p.life <= 0) {
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
        if (p.timeStopped) {
          p.timeStopTimer = (p.timeStopTimer || 0) - 1;
          if (p.timeStopTimer <= 0) {
            p.timeStopped = false;
            if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
              p.vx = p._resumeVx;
              p.vy = p._resumeVy;
            }
            delete p._resumeVx;
            delete p._resumeVy;
          }
          continue;
        }

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
            // Pull fighter toward hole center.
            // Stronger pull when the fighter is moving faster than normal,
            // so speed boosts can't let them escape the black hole.
            const nx = dist > 0 ? dx / dist : 0;
            const ny = dist > 0 ? dy / dist : 0;
            const speedFactor = Math.max(1, f.speed / (f.baseSpeed || f.speed || 1));
            const pullStrength = CONFIG.black.blackHolePullStrength * speedFactor * (1 - dist / effectiveRadius);

            const radialVelocity = f.vx * nx + f.vy * ny;
            if (radialVelocity < 0) {
              const correction = -radialVelocity * 1.2;
              f.vx += nx * correction;
              f.vy += ny * correction;
            }

            f.vx += nx * pullStrength;
            f.vy += ny * pullStrength;

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
            // Skip if the black hole owner is the illusion's owner (so Doppelganger's own black holes don't suck its illusions)
            // But wait, BlackFighter can't be Doppelganger. But just in case.
            if (illusion.owner === fighters[ownerIndex]) continue;
            
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
          if (!otherProj || otherProj.isBlackHole) continue;
          
          const otherProjOwner = fighters[otherProj.owner];
          if (otherProjOwner && otherProjOwner._def && otherProjOwner._def.type === 'black') continue;
          
          const dx = p.x - otherProj.x;
          const dy = p.y - otherProj.y;
          const effectiveRadius = p.r * 2.5; // pull radius for projectiles
          
          if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;

          const dist = Math.hypot(dx, dy);
          
          if (dist < effectiveRadius) {
            if (dist < p.r * 0.5) {
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
            } else {
              // Pull the projectile
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
        const perpLen = Math.hypot(perpX, perpY) || 1;
        p.vx += (perpX / perpLen) * noise;
        p.vy += (perpY / perpLen) * noise;
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const desired = p.baseSpeed || speed;
        p.vx *= desired / speed;
        p.vy *= desired / speed;
        p.wobblePhase += 0.18;
      }

      // Record trail history for normal (non-special) projectiles
      // Used by drawProjectiles() to render a motion streak.
      if (p.history) {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > (p.historyMax || 10)) p.history.shift();
      }

      // Handle time stop for projectiles
      if (p.timeStopped) {
        p.timeStopTimer = (p.timeStopTimer || 0) - 1;
        if (p.timeStopTimer <= 0) {
          p.timeStopped = false;
          // Resume movement using stored velocity if available.
          if (typeof p._resumeVx === 'number' && typeof p._resumeVy === 'number') {
            p.vx = p._resumeVx;
            p.vy = p._resumeVy;
            delete p._resumeVx;
            delete p._resumeVy;
          } else {
            const speed = Math.hypot(p.vx, p.vy) || CONFIG.projectile.speed;
            const angle = Math.atan2(p.vy, p.vx);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
          }
        }

        // While timeStopped, keep the projectile alive even if it would
        // have left the arena bounds. It should resume motion when
        // the stop ends (Cronos sphere) rather than disappearing early.
        // Do not decrement life while frozen so projectiles stack properly,
        // EXCEPT for flames (Orange Fighter), which spawn too rapidly and cause lag.
        if (p.isFlame) {
          p.life -= 1;
          if (this.isProjectileExpired(p)) {
            this._returnProjectile(p);
            this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
            this.projectiles.pop();
            i--;
          }
        }
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      const hit = this.checkProjectileHits(p, fighters);
      const expired = this.isProjectileExpired(p);

      if (hit || expired) {
        if (p.visual === 'crimsonSniperBullet' && expired && !hit && p.life > 0) {
          // Spawn wall hit sparks for Crimson Sniper
          const sparkCount = 15 + Math.random() * 10;
          const hitAngle = Math.atan2(-p.vy, -p.vx);
          
          // 1. Impact Flash
          const flash = this._getProjectile();
          flash.x = p.x;
          flash.y = p.y;
          flash.vx = 0;
          flash.vy = 0;
          flash.life = 8;
          flash.maxLife = 8;
          flash.r = 25 + Math.random() * 15;
          flash.visual = 'crimsonImpactFlash';
          flash.isExplosion = true;
          this.projectiles.push(flash);

          // 2. High-speed sparks
          for (let s = 0; s < sparkCount; s++) {
            const spark = this._getProjectile();
            spark.x = p.x;
            spark.y = p.y;
            const angle = hitAngle + (Math.random() - 0.5) * Math.PI * 1.5;
            const speed = 4 + Math.random() * 12;
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.life = 15 + Math.random() * 20;
            spark.maxLife = spark.life;
            spark.r = 2 + Math.random() * 4;
            spark.visual = 'crimsonSpark';
            spark.isExplosion = true; // Use existing explosion physics logic
            this.projectiles.push(spark);
          }
        }

        this._returnProjectile(p);
        // Swap with last element and pop for O(1) removal
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
        i--; // Adjust index since we swapped
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

  /**
   * Clears all projectiles.
   */
  clear() {
    this.projectiles.length = 0;
  }

  /**
   * Returns the projectiles array for rendering.
   */
  getProjectiles() {
    return this.projectiles;
  }
}

// Global projectile system instance for production use
export const projectileSystem = new ProjectileSystem();