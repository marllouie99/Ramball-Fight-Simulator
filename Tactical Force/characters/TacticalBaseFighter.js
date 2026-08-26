// ─────────────────────────────────────────────
// TACTICAL FORCE — BASE TACTICAL FIGHTER CLASS
// Dedicated base class encapsulating continuous body spin,
// obstacle navigation, tangential rebounding, and LOS checks.
// ─────────────────────────────────────────────
import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { tacticalProjectileSystem } from '../systems/tacticalProjectileSystem.js';
import { spawnMeleeClashShockwave } from '../../js/graphics/particles/sparkEffect.js';
import { STARTER_MAP, handleObstacleCollision, hasLineOfSight } from '../maps/index.js';

export class TacticalBaseFighter extends Fighter {
  constructor(def) {
    super(def);
    this.isTacticalFighter = true;
    this.gameCategory = 'tactical';
    if (CONFIG.tactical?.enableUnifiedSpeed && CONFIG.tactical?.unifiedMovementSpeed) {
      this.speed = CONFIG.tactical.unifiedMovementSpeed;
      this.baseSpeed = CONFIG.tactical.unifiedMovementSpeed;
    }
    this.isSpinning = false;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 45;
    this.magazineBullets = 30;
    this.maxMagazine = 30;
    this.fireCooldown = 24;
    this.muzzleFlashTimer = 0;
    this.gunRecoil = 0;
    this.shootDebounce = 0;
    this.actionDuration = 0;
    this.actionTimer = 0;
    this._actionCrackPlayed = false;
    this.hasClearLOS = true;
    this._activeBouncingProjectile = null; // Track the last fired projectile for hold-fire-during-bounce
  }

  /**
   * Initializes weapon attributes from weapon config or default values.
   */
  initTacticalWeapon(cfg = {}, defaultMag = 30, defaultReload = 45, defaultCooldown = 24) {
    this.maxMagazine = cfg.magazineSize || defaultMag;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || defaultReload;
    this.fireCooldown = cfg.fireCooldown || defaultCooldown;
    this.shootCooldownMax = this.fireCooldown;
    this.shootCooldown = Math.floor((this.fireCooldown || defaultCooldown) * 0.4);
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.gunRecoil = 0;
    this.shootDebounce = 0;
    this.actionDuration = cfg.pumpDuration || cfg.boltDuration || 0;
    this.actionTimer = 0;
    this._actionCrackPlayed = false;
  }

  /**
   * Resets tactical weapon state cleanly on match/round restart.
   */
  resetTacticalWeapon(cfg = {}, defaultMag = 30, defaultReload = 45) {
    if (CONFIG.tactical?.enableUnifiedSpeed && CONFIG.tactical?.unifiedMovementSpeed) {
      this.speed = CONFIG.tactical.unifiedMovementSpeed;
      this.baseSpeed = CONFIG.tactical.unifiedMovementSpeed;
    }
    this.maxMagazine = cfg.magazineSize || defaultMag;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || defaultReload;
    this.fireCooldown = cfg.fireCooldown || this.fireCooldown || 24;
    this.shootCooldownMax = this.fireCooldown;
    this.shootCooldown = Math.floor((this.fireCooldown || 24) * 0.4);
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.gunRecoil = 0;
    this.shootDebounce = 0;
    this.actionTimer = 0;
    this.boltTimer = 0;
    this.pumpTimer = 0;
    this._actionCrackPlayed = false;
    this._activeBouncingProjectile = null;
    this.lastAimAligned = false;
  }

  /**
   * Updates per-frame visual recoil, muzzle flash, and action (pump/bolt) timers.
   */
  updateTacticalWeaponTimers(cfg = {}) {
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }
    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil * 0.80 - 0.05);
    }
    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // Action timer (Shotgun pump or Sniper bolt cycle)
    if (this.actionTimer > 0) {
      this.actionTimer--;
      if (this.actionTimer === Math.floor(this.actionDuration / 2) && !this._actionCrackPlayed) {
        this._actionCrackPlayed = true;
        const soundPath = cfg.sounds?.pump || cfg.sounds?.bolt;
        if (soundPath && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(soundPath, cfg.soundVolumes?.pump ?? cfg.soundVolumes?.bolt ?? 0.30, 1.0);
        }
      }
    }
  }

  /**
   * Centralized tactical reload routine with audio feedback.
   */
  updateTacticalReload(cfg = {}, reloadedText = 'RELOADED', reloadSound = null) {
    if (this.isReloading) {
      if (this.burstShotsRemaining !== undefined) this.burstShotsRemaining = 0;
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(reloadSound || cfg.sounds?.reload || 'skill_dash1', cfg.soundVolumes?.reload ?? 0.30);
        }
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      if (this.burstShotsRemaining !== undefined) this.burstShotsRemaining = 0;
      this.reloadTimer = this.reloadDuration;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25, 1.0);
      }
      spawnFloatingText(this.x, this.y - this.r - 15, 'RELOADING...', '#94a3b8');
    }
  }

  /**
   * Comprehensive tactical weapon initialization helper.
   * Centralizes weapon config, magazine, reload timing, cooldown, recoil, and bullet options.
   */
  setupWeapon(cfg = {}, options = {}) {
    this.weaponConfig = cfg;
    this.weaponOptions = options;
    this.reloadText = options.reloadText || 'RELOADED';
    this.muzzleTipOffset = options.tipOffset || 42;
    this.recoilDivisor = options.recoilDivisor || 6.0;
    this.baseRecoil = options.baseRecoil || 1.0;
    this.bulletOptions = options.bulletOptions || {};
    this.screenShakeConfig = options.screenShake || null;

    const defaultMag = options.defaultMag || 30;
    const defaultReload = options.defaultReload || 45;
    const defaultCooldown = options.defaultCooldown || 24;

    this.initTacticalWeapon(cfg, defaultMag, defaultReload, defaultCooldown);
    if (options.actionDuration !== undefined) {
      this.actionDuration = options.actionDuration;
    }
  }

  /**
   * Dedicated Tactical Update Loop:
   * 100% self-contained update engine for Tactical Force fighters.
   * Handles status effects, cooldown ticks, stasis guards, weapon cycling,
   * continuous 360 rotational firing on fireCooldown, and tactical obstacle physics.
   */
  update(opponent, ownerIndex, arena) {
    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.isCaughtInBeam()) {
      this.interruptAttacks();
    }

    const isGamePlaying = typeof state !== 'undefined' && state.gameState === 'playing';
    if (!isGamePlaying) {
      this.interruptAttacks();
      this.shootCooldown = 60;
      this.applyMovementPhysics();
      this.resolveWallBounce(arena);
      return;
    }

    const cfg = this.weaponConfig || {};
    this.updateTacticalWeaponTimers(cfg);

    // Sync action timers
    if (this.boltDuration !== undefined) this.boltTimer = this.actionTimer;
    if (this.pumpDuration !== undefined) this.pumpTimer = this.actionTimer;

    // Custom weapon action hook (e.g. burst queue)
    this.onUpdateWeaponAction(opponent, ownerIndex);

    this.updateTacticalReload(cfg, this.reloadText || 'RELOADED', cfg.sounds?.reload);

    // Continuous combat engagement on fire cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }
    if (this.canTacticalShoot(opponent)) {
      this.shoot(opponent, ownerIndex);
    }

    // Apply tactical physics & wall reflections
    this.applyMovementPhysics();
    this.resolveWallBounce(arena);
  }

  /** Hook for custom per-frame action processing in subclasses (e.g. bursts). */
  onUpdateWeaponAction(opponent, ownerIndex) {}

  /**
   * Firing angle is locked to the spinning gun barrel orientation (gunAngle / angle),
   * ensuring bullets fire outward in the exact direction the weapon is pointing as the fighter rotates.
   */
  getFireAngle(target) {
    return this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
  }

  /**
   * Computes the spawn position at the gun muzzle tip based on fire angle and weapon length.
   */
  getMuzzlePosition(fireAngle, customTipOffset) {
    const scaleFactor = (this.r / 25);
    const offset = customTipOffset !== undefined ? customTipOffset : (this.muzzleTipOffset || 42);
    const tipDist = this.r + offset * scaleFactor;
    return {
      x: this.x + Math.cos(fireAngle) * tipDist,
      y: this.y + Math.sin(fireAngle) * tipDist,
      scaleFactor
    };
  }

  /**
   * Normalizes overloaded shoot signatures (Rule 2).
   */
  normalizeShootArgs(target, ownerIndex) {
    if (typeof target === 'number' && ownerIndex === undefined) {
      ownerIndex = target;
      target = null;
    }
    if (ownerIndex === undefined) {
      ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
    }
    return { target, ownerIndex };
  }

  /**
   * Master Tactical Shoot Pipeline:
   * Fires continuously along the spinning weapon orientation on fire cooldown.
   */
  shoot(target, ownerIndex) {
    const normalized = this.normalizeShootArgs(target, ownerIndex);
    target = normalized.target;
    ownerIndex = normalized.ownerIndex;

    if (typeof state !== 'undefined' && state.gameState !== 'playing') return;
    if (this.isReloading || this.magazineBullets <= 0) return;
    if (this.shootCooldown > 0 || this.actionTimer > 0 || (this.boltTimer && this.boltTimer > 0) || (this.pumpTimer && this.pumpTimer > 0)) return;
    if (this.burstShotsRemaining > 0) return;

    const cfg = this.weaponConfig || {};
    this.shootCooldown = this.shootCooldownMax || cfg.fireCooldown || 24;
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / (this.recoilDivisor || 6.0)) : (this.baseRecoil || 1.0);

    if (this.actionDuration > 0) {
      this.actionTimer = this.actionDuration;
      if (this.boltDuration !== undefined) this.boltTimer = this.actionDuration;
      if (this.pumpDuration !== undefined) this.pumpTimer = this.actionDuration;
      this._actionCrackPlayed = false;
    }

    const fireAngle = this.getFireAngle(target);
    const muzzle = this.getMuzzlePosition(fireAngle);

    // Screen shake trigger
    const shakeIntensity = cfg.screenShakeIntensity || this.screenShakeConfig?.intensity;
    const shakeDuration = cfg.screenShakeDuration || this.screenShakeConfig?.duration;
    if (shakeIntensity && typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(shakeIntensity, shakeDuration || 6);
    }

    // Dispatch weapon fire hook
    this.onFireWeapon(target, ownerIndex, fireAngle, muzzle.x, muzzle.y);

    // Weapon SFX
    const fireSound = cfg.sounds?.fire;
    if (fireSound && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(fireSound, cfg.soundVolumes?.fire ?? 0.30, 1.0);
    }
  }

  /**
   * Virtual hook for custom bullet spawn logic.
   * Default implementation spawns a single high-velocity tactical bullet.
   */
  onFireWeapon(target, ownerIndex, fireAngle, spawnX, spawnY) {
    const cfg = this.weaponConfig || {};
    const bOpts = this.bulletOptions || {};
    const speedMult = cfg.projectileSpeedMultiplier || 2.4;

    this.createTacticalBullet(spawnX, spawnY, fireAngle, speedMult, this.damage, ownerIndex, {
      r: bOpts.r || 5.0,
      length: bOpts.length || 16,
      width: bOpts.width || 3.2,
      radius: cfg.bulletRadius || bOpts.radius || 4.5,
      life: cfg.bulletLife || bOpts.life || 90,
      caliberScale: bOpts.caliberScale || 1.0,
      historyMax: bOpts.historyMax || 14
    });
  }

  /**
   * Default demo attack trigger for character select / menus.
   */
  triggerDemoAttack() {
    const cfg = this.weaponConfig || {};
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = this.baseRecoil || 1.2;
    if (this.actionDuration > 0) {
      this.actionTimer = this.actionDuration;
      if (this.boltDuration !== undefined) this.boltTimer = this.actionDuration;
      if (this.pumpDuration !== undefined) this.pumpTimer = this.actionDuration;
      this._actionCrackPlayed = false;
    }
    const fireSound = cfg.sounds?.fire;
    if (fireSound && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(fireSound, cfg.soundVolumes?.fire ?? 0.30, 1.0);
    }
  }

  /**
   * Unified Tactical Shoot Guard:
   * Checks paralysis, beam stasis, reload state, remaining ammo, shoot cooldown,
   * active action cycle (bolt/pump), and burst queue state.
   * Operatives fire continuously along their rotating weapon angle based strictly on fireCooldown.
   */
  canTacticalShoot(opponent) {
    if (typeof state !== 'undefined' && state.gameState !== 'playing') return false;
    if (this.paralyzeTimer && this.paralyzeTimer > 0) return false;
    if (this.isCaughtInBeam()) return false;
    if (this.isReloading || this.magazineBullets <= 0) return false;
    if (this.shootCooldown > 0) return false;
    if (this.actionTimer > 0) return false;
    if (this.boltTimer && this.boltTimer > 0) return false;
    if (this.pumpTimer && this.pumpTimer > 0) return false;
    if (this.burstShotsRemaining > 0) return false;
    if (this.hasActiveBouncingProjectile()) return false;
    return true;
  }

  /**
   * Unified Tactical Bullet Factory:
   * Spawns a projectile into the dedicated tacticalProjectileSystem.
   */
  createTacticalBullet(spawnX, spawnY, fireAngle, speedMult, damage, ownerIndex, options = {}) {
    const scaleFactor = (this.r / 25);
    const globalSpeedMult = CONFIG.tactical?.globalBulletSpeedMultiplier ?? 1.0;
    const baseSpeed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || speedMult || 1.0) * globalSpeedMult;
    const bulletSpeed = options.speed !== undefined ? options.speed : baseSpeed;

    const proj = tacticalProjectileSystem.fireTacticalBullet(this, ownerIndex, damage || this.damage, bulletSpeed, spawnX, spawnY, fireAngle, {
      ...options,
      r: (options.r || 5.0) * scaleFactor,
      bulletLength: (options.length || 16) * scaleFactor,
      bulletWidth: (options.width || 3.2) * scaleFactor,
      bulletRadius: (options.radius || 4.5) * scaleFactor,
      tacticalCaliberScale: (options.caliberScale || 1.0) * scaleFactor,
      historyMax: options.historyMax || 14
    });
    this._activeBouncingProjectile = proj;
    return proj;
  }

  /**
   * Returns true if this fighter has an active projectile still in flight or rebouncing.
   * Used to hold fire discipline — fighters don't shoot until their previous projectile is done rebouncing/expiring.
   */
  hasActiveBouncingProjectile() {
    if (!(CONFIG.tactical?.holdFireDuringBounce)) return false;
    return tacticalProjectileSystem.hasActiveBouncingProjectile(this);
  }

  onCountdown(opponent) {
    if (opponent && opponent.hp > 0 && !opponent.isDead) {
      this.aim(opponent);
    }
  }

  /**
   * Reverses rotational body spin direction (Disabled for constant continuous 360 spin).
   */
  reverseSpin(debounceFrames = 8) {
    // Continuous 360 spin maintains constant rotational spin without flipping on collisions
    return;
  }

  /**
   * Disables physical knockback/pushback displacement while rendering the kinetic shockwave ring visual.
   */
  applyKnockback(vx, vy) {
    const force = Math.hypot(vx || 0, vy || 0);
    if (force > 0.3 && typeof spawnMeleeClashShockwave === 'function') {
      const swRadius = Math.min(65, Math.max(32, (this.r || 25) * 1.4 + force * 2.5));
      spawnMeleeClashShockwave(this.x, this.y, swRadius, this.color || 'gold');
    }
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackStunTimer = 0;
  }

  /**
   * Tactical Wall Rebounding:
   * Enforces non-zero tangential velocity and open-lane deflections to navigate around rectangular covers.
   */
  resolveWallBounce(arena) {
    if (!arena) return;
    const isBeamTrapped = (this.caughtInGenosBeamTimer > 0) || this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0) || this.preventKnockbackBounce;
    if (isBeamTrapped) {
      let clamped = false;
      if (this.x - this.r < arena.x) {
        this.x = arena.x + this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      } else if (this.x + this.r > arena.x + arena.width) {
        this.x = arena.x + arena.width - this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      }
      if (this.y - this.r < arena.y) {
        this.y = arena.y + this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      } else if (this.y + this.r > arena.y + arena.height) {
        this.y = arena.y + arena.height - this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      }
      return clamped;
    }

    let bounced = false;
    const baseSpeed = this.speed || 5.0;
    const restitution = 0.95;

    // Left wall
    if (this.x - this.r <= arena.x) {
      this.x = arena.x + this.r;
      this.vx = Math.abs(this.vx) * restitution;
      if (Math.abs(this.vy) < baseSpeed * 0.15) {
        this.vy += (Math.random() < 0.5 ? 1 : -1) * baseSpeed * 0.20;
      }
      bounced = true;
    } else if (this.x + this.r >= arena.x + arena.width) { // Right wall
      this.x = arena.x + arena.width - this.r;
      this.vx = -Math.abs(this.vx) * restitution;
      if (Math.abs(this.vy) < baseSpeed * 0.15) {
        this.vy += (Math.random() < 0.5 ? 1 : -1) * baseSpeed * 0.20;
      }
      bounced = true;
    }

    // Top wall
    if (this.y - this.r <= arena.y) {
      this.y = arena.y + this.r;
      this.vy = Math.abs(this.vy) * restitution;
      if (Math.abs(this.vx) < baseSpeed * 0.15) {
        this.vx += (Math.random() < 0.5 ? 1 : -1) * baseSpeed * 0.20;
      }
      bounced = true;
    } else if (this.y + this.r >= arena.y + arena.height) { // Bottom wall
      this.y = arena.y + arena.height - this.r;
      this.vy = -Math.abs(this.vy) * restitution;
      if (Math.abs(this.vx) < baseSpeed * 0.15) {
        this.vx += (Math.random() < 0.5 ? 1 : -1) * baseSpeed * 0.20;
      }
      bounced = true;
    }

    if (bounced) {
      this.normalizeSpeed();
    }
    return bounced;
  }

  /**
   * Tactical Movement & Continuous Spin Physics:
   * Body continuously rotates at defined spin rate and evaluates cover obstacle collisions.
   */
  applyMovementPhysics() {
    if (this.spinDebounce > 0) {
      this.spinDebounce--;
    }

    let targetSpeed = this.speed || 5.0;
    let extraMultiplier = 1.0;

    if (this.speedMultiplier !== undefined && this.speedMultiplier !== 1) {
      targetSpeed *= this.speedMultiplier;
    }
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      targetSpeed *= (this.speedBoostMultiplier || 1.35);
    }

    const damp = this.damping !== undefined ? this.damping : 0.98;
    if (damp < 1.0) {
      const dampMult = Math.pow(damp, 1.0);
      this.vx *= dampMult;
      this.vy *= dampMult;
    }
    
    targetSpeed *= extraMultiplier;

    let currentSpeed = Math.hypot(this.vx, this.vy);
    
    // Low-velocity recovery toward arena center to prevent stalling
    if (targetSpeed > 0 && currentSpeed < 0.5) {
      if (typeof state !== 'undefined' && state.arena) {
        const centerX = state.arena.x + state.arena.width / 2;
        const centerY = state.arena.y + state.arena.height / 2;
        const centerAngle = Math.atan2(centerY - this.y, centerX - this.x);
        this.vx = Math.cos(centerAngle) * targetSpeed;
        this.vy = Math.sin(centerAngle) * targetSpeed;
        currentSpeed = targetSpeed;
      } else {
        const nudgeAngle = this.angle || this.gunAngle || 0;
        this.vx = Math.cos(nudgeAngle) * targetSpeed * 0.5;
        this.vy = Math.sin(nudgeAngle) * targetSpeed * 0.5;
        currentSpeed = targetSpeed * 0.5;
      }
    }
    
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.08;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Continuous 360 Spin Physics (Keeps spinning as they move)
    const spinRate = this.bodySpinRate || CONFIG.tactical?.bodySpinRate || 0.08;
    this._prevAngle = this.angle !== undefined ? this.angle : 0;
    this.angle += (this.spinDirection || 1) * spinRate;
    while (this.angle > Math.PI) this.angle -= Math.PI * 2;
    while (this.angle < -Math.PI) this.angle += Math.PI * 2;
    this.gunAngle = this.angle;

    // Obstacle collision resolution
    const activeObstacles = (typeof state !== 'undefined' && state.activeMap && state.activeMap.obstacles) || (typeof STARTER_MAP !== 'undefined' ? STARTER_MAP.obstacles : null);
    if (activeObstacles && activeObstacles.length > 0) {
      handleObstacleCollision(this, activeObstacles);
    }
  }

  /**
   * Tactical Line of Sight (LOS) Evaluation:
   * Checks if opponent is visible (not occluded behind cover obstacles).
   * Operative maintains continuous 360 movement spin.
   */
  aim(opponent) {
    if (!opponent || opponent.hp <= 0 || opponent.isDead) {
      this.hasClearLOS = false;
      return false;
    }
    this.hasClearLOS = hasLineOfSight(this.x, this.y, opponent.x, opponent.y);
    return this.hasClearLOS;
  }

  /**
   * Evaluates aim alignment between gun barrel and opponent with Line of Sight check.
   */
  isAimAlignedWith(opponent, tolerance = 0.20) {
    if (!opponent || opponent.hp <= 0 || opponent.isDead) return false;
    if (!this.hasClearLOS) return false;
    const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    let angleDiff = targetAngle - (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    return Math.abs(angleDiff) <= tolerance;
  }

  /**
   * Evaluates whether the spinning gun barrel swept across the opponent's angular position
   * during this rotational step, ensuring frame-rate independent, seamless hit triggers.
   */
  checkSpinSweep(opponent, tolerance = 0.16) {
    if (!opponent || opponent.hp <= 0 || opponent.isDead) return false;
    const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) <= tolerance) {
      return true;
    }

    if (this._prevAngle !== undefined) {
      let pDiff = targetAngle - this._prevAngle;
      while (pDiff > Math.PI) pDiff -= Math.PI * 2;
      while (pDiff < -Math.PI) pDiff += Math.PI * 2;

      // Crossed the target vector between last frame and current frame
      if (Math.sign(pDiff) !== Math.sign(angleDiff) && Math.abs(pDiff - angleDiff) < 0.40) {
        return true;
      }
    }

    return false;
  }
}
