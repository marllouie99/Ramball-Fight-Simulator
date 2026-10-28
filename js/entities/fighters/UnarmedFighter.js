import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnFloatingText, triggerGlobalScreenShake, state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { drawUnarmedSkin, drawUnarmedAfterimages, drawKineticShockwaves, drawUnarmedCenterHpOverlay } from '../../graphics/fighters/unarmedSkin.js';

export class UnarmedFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'unarmed';
    this.type = 'unarmed';
    const cfg = CONFIG.unarmed || {};

    this.name = def?.name || cfg.name || 'Unarmed';
    this.displayName = def?.displayName || cfg.displayName || this.name;
    this.themeColor = cfg.themeColor || '#71717A';
    this.color = cfg.color || '#CFCFCF';
    this.damageNumberColor = cfg.damageNumberColor || '#E4E4E7';

    this.hp = cfg.hp || 1100;
    this.maxHp = cfg.maxHp || 1100;
    this.speed = cfg.speed || 5.0;
    this.baseSpeed = cfg.speed || 5.0;

    // Official Earclacks Fighting Wiki Traits (https://earclacks-fighting.fandom.com/wiki/Unarmed)
    // 1. Unparriable: Lacks a weapon, hits directly with body, cannot be weapon-parried
    this.isUnparriable = true;
    this.cannotBeParried = true;
    this.hideHands = true; // Earclacks weaponless and handless physics ball model

    // 2. Momentum & Scaling (+0.60 permanent max speed & +5 damage with every wall bounce & hit)
    this.momentumStacks = 0;
    this.maxMomentumStacks = cfg.maxMomentumStacks || 10;
    this.speedPerHit = cfg.speedPerHit || 1.00;
    this.damagePerHit = cfg.damagePerHit || 1.0;
    this.maxTerminalVelocity = cfg.maxTerminalVelocity || 18.0;
    this.wallBounceMultiplier = cfg.wallBounceMultiplier || 1.12;
    this.damage = cfg.baseCollisionDamage || cfg.damage || 30;

    // 3. Kinetic Evade Mechanic (Gains evade chance for each hit)
    this.evadeHits = 0;
    this.evadeChance = cfg.baseEvadeChance ?? 0.05;
    this.evadeBuffTimer = 999999;
    this._syncEvadeChance();

    // 4. Super Unarmed Form (White ball with light grey outline, immune to gravity/friction)
    this.isSuperUnarmed = false;
    this.isTerminalVelocity = false;
    this.superUnarmedTimer = 0;
    this.superUnarmedDuration = cfg.superUnarmedDuration || 240;

    this.surgeTimer = 0;
    this.surgeDuration = cfg.kineticSurgeDuration || 18;
    this.surgeSpeed = cfg.kineticSurgeSpeed || 16.0;
    this.surgeAngle = 0;

    this.collisionCooldown = 0;
    this.collisionCooldownMax = cfg.collisionCooldownMax || 18;
    this.punchAnimTimer = 0;
    this.punchAnimMaxTimer = 14;
    this.punchHand = 'right';

    // Skill Cooldowns
    this.kineticSurgeCooldown = 0;
    this.kineticSurgeCooldownMax = cfg.kineticSurgeCooldownMax || 280; // ~4.6s
    this.superUnarmedCooldown = 0;
    this.superUnarmedCooldownMax = cfg.superUnarmedCooldownMax || 600; // 10.0s
    this.terminalVelocityCooldown = 0;

    // Transient VFX Arrays (Rule 25 Compliant)
    this.afterimages = [];
    this.visualShockwaves = [];
    this._lastTrailX = this.x;
    this._lastTrailY = this.y;

    // Rebound Damage Mechanic (Earclacks Standard: must rebounce to the wall first to deal damage)
    this.hasWallRebounded = false;

    // Declarative Skill Registration (Rule 18 HUD Theme Consistency)
    // Official Earclacks Canon: Basic Attack is bumping into the enemy to deal damage and gain speed
    const skills = [];
    if (this.isSkillEnabled(cfg.enableKineticBump, true)) {
      skills.push({
        id: 'kineticBump',
        name: cfg.basicAttackName || 'Kinetic Bump',
        type: 'basic',
        cooldownKey: 'collisionCooldown',
        cooldownMax: () => this.collisionCooldownMax,
        color: this.themeColor,
        description: cfg.basicAttackDesc || 'Every bump into an enemy deals kinetic damage and permanently increases speed and damage.',
        onActivate: (fighter, opponent) => {
          fighter.shoot(0, opponent);
        }
      });
    }
    if (this.isSkillEnabled(cfg.enableKineticSurge, true)) {
      skills.push({
        id: 'kineticSurge',
        name: 'Kinetic Surge',
        type: 'skill',
        cooldownKey: 'kineticSurgeCooldown',
        cooldownMax: () => this.kineticSurgeCooldownMax,
        color: this.themeColor,
        onActivate: (fighter, opponent) => {
          fighter._castKineticSurge(opponent);
        }
      });
    }
    if (this.isSkillEnabled(cfg.enableSuperUnarmed, true)) {
      skills.push({
        id: 'superUnarmed',
        name: 'Super Unarmed',
        type: 'ultimate',
        cooldownKey: 'superUnarmedCooldown',
        cooldownMax: () => this.superUnarmedCooldownMax,
        color: '#FFFFFF',
        onActivate: (fighter, opponent) => {
          fighter._castSuperUnarmed(opponent);
        }
      });
    }
    this.skillManager.registerSkills(skills);
  }

  reset() {
    super.reset();
    this.momentumStacks = 0;
    this.speed = this.baseSpeed;
    this.isSuperUnarmed = false;
    this.isTerminalVelocity = false;
    this.superUnarmedTimer = 0;
    this.terminalVelocityTimer = 0;
    this.surgeTimer = 0;
    this.collisionCooldown = 0;
    this.punchAnimTimer = 0;
    this.kineticSurgeCooldown = 0;
    this.superUnarmedCooldown = 0;
    this.terminalVelocityCooldown = 0;
    this.evadeHits = 0;
    this._syncEvadeChance();
    this.hasWallRebounded = false;
    if (this.afterimages) this.afterimages.length = 0;
    else this.afterimages = [];
    if (this.visualShockwaves) this.visualShockwaves.length = 0;
    else this.visualShockwaves = [];
    this._lastTrailX = this.x;
    this._lastTrailY = this.y;
    this._syncLiveDamageAndSpeed();
  }

  clearAllAfterimages() {
    super.clearAllAfterimages?.();
    if (this.afterimages) this.afterimages.length = 0;
    this._lastTrailX = this.x;
    this._lastTrailY = this.y;
  }

  get afterImages() {
    return this.afterimages;
  }

  set afterImages(val) {
    this.afterimages = val;
  }

  /**
   * Synchronizes dynamic evade chance based on accumulated hits (deals or takes).
   */
  _syncEvadeChance() {
    const cfg = CONFIG.unarmed || {};
    if (!this.isSkillEnabled(cfg.enableEvade, true)) {
      this.evadeChance = 0;
      this.evadeBuffTimer = 0;
      return;
    }

    const baseEvade = cfg.baseEvadeChance ?? 0.05;
    const evadeGain = cfg.evadeBonusPerHit ?? 0.03;
    const maxEvade = cfg.maxEvadeChance ?? 0.65;
    const hits = this.evadeHits || 0;

    let chance = baseEvade + hits * evadeGain;
    if (this.isSuperUnarmed || this.isTerminalVelocity) {
      chance = Math.max(chance, maxEvade);
    }
    this.evadeChance = Math.min(maxEvade, chance);
    this.evadeBuffTimer = 999999;
  }

  /**
   * Evaluates incoming damage against Unarmed's dynamic kinetic evade chance.
   */
  _filterDamageImmunityAndEvade(amount, attacker, opts, isGuaranteedHit) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableEvade, true)) {
      return super._filterDamageImmunityAndEvade(amount, attacker, opts, isGuaranteedHit);
    }

    if (this.evadeChance > 0 && amount > 0 && !isGuaranteedHit && !this.isChainedByMakima) {
      const isTickOrBeam = Boolean(
        opts && (
          opts.isPureLoveBeam ||
          opts.isGenosBeam ||
          opts.isLaser ||
          opts.isLaserBeam ||
          opts.isBeam ||
          opts.isContinuous ||
          opts.isTickDamage ||
          opts.isTick ||
          opts.isBleed ||
          opts.fromBleed ||
          opts.isBurn ||
          opts.fromBurn ||
          opts.isPoison ||
          opts.isPurpleDPS ||
          opts.isDivineFlame ||
          opts.isDomain ||
          opts.isDomainSlash ||
          opts.fromDomain ||
          opts.fromBlackHole
        )
      ) || (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam());

      const isBasicAttack = !isTickOrBeam && (opts.isProjectile || opts.isMelee || opts.isBasicAttack || (!opts.isSkill && !opts.isUltimate && !opts.isDomain));
      if (isBasicAttack) {
        if (Math.random() < this.evadeChance) {
          spawnFloatingText(this.x, this.y - this.r - 10, 'EVADE!', '#00F2FE');
          spawnSparks(this.x, this.y, 8, 'lightningTrail', '#00F2FE');
          audioSystem.playSFX('dash_heavy', 0.6);
          this.afterimages.push({
            x: this.x,
            y: this.y,
            timer: 6,
            maxTimer: 6
          });
          return false;
        }
      }
    }

    return super._filterDamageImmunityAndEvade(amount, attacker, opts, isGuaranteedHit);
  }

  /**
   * Synchronizes dynamic speed and damage with momentum stacks and kinetic velocity in real-time.
   */
  _syncLiveDamageAndSpeed() {
    const cfg = CONFIG.unarmed || {};
    this.speed = Math.min(
      this.maxTerminalVelocity,
      this.baseSpeed + this.momentumStacks * this.speedPerHit
    );

    const baseDmg = cfg.baseCollisionDamage || cfg.damage || 30;
    const speedScale = cfg.speedDamageScale !== undefined ? cfg.speedDamageScale : 1.0;
    const speedBonus = Math.max(0, this.speed - this.baseSpeed) * speedScale;
    let totalDmg = Math.round(baseDmg + this.momentumStacks * this.damagePerHit + speedBonus);

    if (this.isSuperUnarmed || this.isTerminalVelocity) {
      totalDmg = Math.round(totalDmg * (cfg.superUnarmedDamageMult || 1.6));
    }

    this.damage = totalDmg;
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
    this.surgeTimer = 0;
  }

  isStationarySkillActive() {
    return false;
  }

  resumeMovement(opponent) {
    if (this.vx !== 0 || this.vy !== 0) {
      const spd = Math.hypot(this.vx, this.vy);
      if (spd >= 0.5) return;
    }

    const target = opponent || (state.fighters && state.fighters.find(f => f !== this && !f.isDead && !this.isTeammate(f)));
    const cfg = CONFIG.unarmed || {};
    const requireRebound = this.isSkillEnabled(cfg.requireWallBounceForDamage, true);

    let launchAngle;
    if (requireRebound && !this.hasWallRebounded && target) {
      // Must rebounce to a wall first: launch towards a wall at an angle away from direct line to target
      const toTarget = Math.atan2(target.y - this.y, target.x - this.x);
      const side = Math.random() < 0.5 ? 1 : -1;
      launchAngle = toTarget + side * (Math.PI * 0.40 + Math.random() * 0.30);
    } else if (target) {
      launchAngle = Math.atan2(target.y - this.y, target.x - this.x) + (Math.random() - 0.5) * 0.4;
    } else {
      launchAngle = Math.random() * Math.PI * 2;
    }

    const slowFactor = (this.slowTimer > 0 && this.slowMultiplier) ? this.slowMultiplier : 1.0;
    const currentSpeed = Math.max(this.baseSpeed, this.baseSpeed + this.momentumStacks * this.speedPerHit) * slowFactor;
    this.vx = Math.cos(launchAngle) * currentSpeed;
    this.vy = Math.sin(launchAngle) * currentSpeed;
    this.gunAngle = launchAngle;
  }

  /**
   * Official Earclacks Gimmick:
   * "Typically slows down slightly after being hit by an opponent"
   * (Gained max speed and momentum stacks are PERMANENT for the entire round;
   * only current momentary velocity experiences a slight deceleration on hit)
   */
  takeDamage(amount, attacker, hitAngle) {
    const res = super.takeDamage(amount, attacker, hitAngle);

    if (res && amount > 0) {
      // Gains evade chance for each hit taken
      this.evadeHits = (this.evadeHits || 0) + 1;
      this._syncEvadeChance();
    }

    if (!this.isSuperUnarmed && !this.isTerminalVelocity) {
      this.vx *= 0.88;
      this.vy *= 0.88;
    }

    return res;
  }

  _castKineticSurge(opponent) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableKineticSurge, true)) return;
    if (!opponent) return;
    this.kineticSurgeCooldown = this.kineticSurgeCooldownMax;

    // Direct aim lock towards enemy (Rule 1.4)
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    this.surgeAngle = Math.atan2(dy, dx);
    this.gunAngle = this.surgeAngle;

    this.surgeTimer = this.surgeDuration;
    this.momentumStacks = Math.min(this.maxMomentumStacks, this.momentumStacks + 2);
    this.hasWallRebounded = true; // Empowers burst dash with primed wall-rebound force
    this._syncLiveDamageAndSpeed();

    // Rocket forward impulse
    this.vx = Math.cos(this.surgeAngle) * this.surgeSpeed;
    this.vy = Math.sin(this.surgeAngle) * this.surgeSpeed;

    spawnFloatingText(this.x, this.y - this.r - 20, 'KINETIC SURGE!', '#F4F4F5');
    triggerGlobalScreenShake(4, 6);
    audioSystem.playSFX('attack_fleshhit', 0.85);

    // Rule 26 Concentric Supersonic Shockwave
    this._spawnShockwave(this.x, this.y, 70, 18, 3, '#F4F4F5');
  }

  _castSuperUnarmed(opponent) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableSuperUnarmed, true)) return;
    this.superUnarmedCooldown = this.superUnarmedCooldownMax;
    this.isSuperUnarmed = true;
    this.isTerminalVelocity = true;
    this.superUnarmedTimer = this.superUnarmedDuration;
    this.terminalVelocityTimer = this.superUnarmedDuration;
    this.momentumStacks = this.maxMomentumStacks;
    this.evadeHits = (CONFIG.unarmed?.maxEvadeStacks || 20);
    this.hasWallRebounded = true; // Super form enters primed with explosive force
    this._syncEvadeChance();
    this._syncLiveDamageAndSpeed();

    const angle = this.gunAngle !== undefined ? this.gunAngle : (Math.atan2(this.vy, this.vx) || 0);
    this.vx = Math.cos(angle) * this.maxTerminalVelocity;
    this.vy = Math.sin(angle) * this.maxTerminalVelocity;

    spawnFloatingText(this.x, this.y - this.r - 25, 'SUPER UNARMED!', '#FFFFFF');
    triggerGlobalScreenShake(9, 14);
    audioSystem.playSFX('attack_fleshhit', 1.0);

    // Heavy detonation blast (Rule 26)
    this._spawnShockwave(this.x, this.y, 95, 24, 4, '#FFFFFF');
  }

  // Alias for backward compatibility with tests
  _castTerminalVelocity(opponent) {
    this._castSuperUnarmed(opponent);
  }

  _spawnShockwave(x, y, maxRadius, maxTimer = 20, waveCount = 3, color = '#E4E4E7') {
    this.visualShockwaves.push({
      x,
      y,
      maxRadius,
      timer: maxTimer,
      maxTimer,
      waveCount,
      color
    });
  }

  _updateVisualExplosions() {
    // Satisfies Rule 25 hook interface
  }

  _updateVisualEffects() {
    // 1. Decay visual shockwaves
    for (let i = this.visualShockwaves.length - 1; i >= 0; i--) {
      const sw = this.visualShockwaves[i];
      sw.timer--;
      if (sw.timer <= 0) {
        this.visualShockwaves.splice(i, 1);
      }
    }

    // 2. Decay ghost afterimages independently in world space (Rule 25)
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const ghost = this.afterimages[i];
      ghost.timer--;
      if (ghost.timer <= 0) {
        this.afterimages.splice(i, 1);
      }
    }
  }

  /**
   * Official Earclacks Gimmick:
   * Natural Specular Wall Ricochets with Tangent Cushion Dispersion & Circular Arena Support.
   * "Speed increases whenever it bumps into unmoving objects, such as walls"
   */
  resolveWallBounce(arena, opponent) {
    if (!arena) return false;
    if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama) {
      return super.resolveWallBounce(arena, opponent);
    }

    let bounced = false;
    let contactX = this.x;
    let contactY = this.y;

    if (arena.shape === 'circle') {
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = arena.radius || (arena.width / 2);
      const d = Math.hypot(this.x - cx, this.y - cy);
      if (d + this.r >= ar && d > 0) {
        const nx = (this.x - cx) / d;
        const ny = (this.y - cy) / d;
        this.x = cx + nx * (ar - this.r);
        this.y = cy + ny * (ar - this.r);

        // Specular reflection: v' = v - 2(v · n)n with subtle natural tangent cushion dispersion
        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          const tangentX = -ny;
          const tangentY = nx;
          const tangentDispersion = (Math.random() - 0.5) * 0.35;
          this.vx = (this.vx - 2 * dot * nx) + tangentX * tangentDispersion;
          this.vy = (this.vy - 2 * dot * ny) + tangentY * tangentDispersion;
        }
        bounced = true;
        contactX = this.x + nx * this.r;
        contactY = this.y + ny * this.r;
      }
    } else {
      const minX = arena.x + this.r;
      const maxX = arena.x + arena.width - this.r;
      const minY = arena.y + this.r;
      const maxY = arena.y + arena.height - this.r;
      const angleJitter = 0.35; // Natural subtle billiard cushion dispersion

      if (this.x < minX) {
        this.x = minX;
        this.vx = Math.abs(this.vx);
        this.vy += (Math.random() - 0.5) * angleJitter;
        contactX = arena.x;
        bounced = true;
      } else if (this.x > maxX) {
        this.x = maxX;
        this.vx = -Math.abs(this.vx);
        this.vy += (Math.random() - 0.5) * angleJitter;
        contactX = arena.x + arena.width;
        bounced = true;
      }

      if (this.y < minY) {
        this.y = minY;
        this.vy = Math.abs(this.vy);
        this.vx += (Math.random() - 0.5) * angleJitter;
        contactY = arena.y;
        bounced = true;
      } else if (this.y > maxY) {
        this.y = maxY;
        this.vy = -Math.abs(this.vy);
        this.vx += (Math.random() - 0.5) * angleJitter;
        contactY = arena.y + arena.height;
        bounced = true;
      }
    }

    if (bounced) {
      // Wall rebounce primes Unarmed's damage capability (Earclacks Standard)
      this.hasWallRebounded = true;

      // Natural wall bounce: reflects velocity along collision normal (conserves current kinetic speed)
      // Note: Momentum, speed, and damage are ONLY gained when hitting an enemy, NOT arena walls!
      const curSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const targetSpeed = Math.min(
        this.maxTerminalVelocity,
        Math.max(curSpeed, this.speed)
      );

      // Ricochet homing towards enemy if enabled
      const cfg = CONFIG.unarmed || {};
      const target = opponent || (state.fighters && state.fighters.find(f => f !== this && !f.isDead && !this.isTeammate(f)));
      const homing = cfg.wallBounceHoming !== undefined ? cfg.wallBounceHoming : 0.85;

      if (target && !target.isDead && homing > 0) {
        const toTargetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const curAngle = Math.atan2(this.vy, this.vx);
        let diff = toTargetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const finalAngle = curAngle + diff * homing + (Math.random() - 0.5) * 0.12;
        this.vx = Math.cos(finalAngle) * targetSpeed;
        this.vy = Math.sin(finalAngle) * targetSpeed;
        this.gunAngle = finalAngle;
      } else {
        const curAngle = Math.atan2(this.vy, this.vx);
        this.vx = Math.cos(curAngle) * targetSpeed;
        this.vy = Math.sin(curAngle) * targetSpeed;
        this.gunAngle = curAngle;
      }

      // Concussive audio: Official Earclacks wall bump THUD & screen shake feedback
      const wallSound = CONFIG.unarmed?.sounds?.wallBounce || 'Assets/Sound Effects/UnarmedSFX/unarmed_wall_bump.mp3';
      const wallVol = CONFIG.unarmed?.soundVolumes?.wallBounce ?? 0.90;
      audioSystem.playSFX(wallSound, wallVol);
      const shakePower = Math.min(6, 2 + this.momentumStacks * 0.4);
      triggerGlobalScreenShake(shakePower, 4);

      // Rule 26 Concentric Wall Shockwave
      this._spawnShockwave(contactX, contactY, 45 + this.momentumStacks * 3, 16, 2, '#D4D4D8');
    }

    return bounced;
  }

  /**
   * Universal Engine Physics Collision Hook (invoked by physics.js lines 312-313 & 1316).
   * Delivers Unarmed's iconic kinetic slam / basic attack body bump!
   */
  onCollide(opponent) {
    if (!opponent) return;
    this._handleKineticBumpCollision(opponent);
  }

  /**
   * Official Earclacks Gimmick:
   * "Damage scales directly depending on its current speed"
   * Hits apply a brief movement slow for BOTH Unarmed and the enemy on impact.
   */
  _handleKineticBumpCollision(target) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableKineticBump, true)) return;
    if (this.collisionCooldown > 0) return;
    if (!target || target.isDead || (typeof target.hp === 'number' && target.hp <= 0)) return;
    if (typeof this.isTeammate === 'function' && this.isTeammate(target)) return;
    if (this.isCaughtInBeam() || this.isWallPinnedByMakima || this.isWallPinnedBySaitama) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const curSpeed = Math.hypot(this.vx, this.vy);
    const cfg = CONFIG.unarmed || {};
    const requireRebound = this.isSkillEnabled(cfg.requireWallBounceForDamage, true);
    const canDealDamage = !requireRebound || this.hasWallRebounded;

    if (!canDealDamage) {
      // Unarmed bumped an enemy WITHOUT rebouncing to the wall first:
      // Zero damage is dealt, zero momentum/evade stacks gained.
      // Elastic deflection separates fighters and directs Unarmed towards the walls.
      const reboundBaseSpeed = Math.max(this.baseSpeed, curSpeed || this.speed);
      const nx = dx / dist;
      const ny = dy / dist;

      // Deflect outward away from target
      this.vx = -nx * reboundBaseSpeed;
      this.vy = -ny * reboundBaseSpeed;
      this.gunAngle = Math.atan2(this.vy, this.vx);

      // Resolve physical overlap on target
      target.vx = (target.vx || 0) + nx * 3.5;
      target.vy = (target.vy || 0) + ny * 3.5;

      this.collisionCooldown = 12;
      audioSystem.playSFX('dash_light', 0.45);
      triggerGlobalScreenShake(1.5, 3);
      const midX = (this.x + target.x) / 2;
      const midY = (this.y + target.y) / 2;
      spawnSparks(midX, midY, 4, '#A1A1AA');
      return;
    }

    const baseDmg = cfg.baseCollisionDamage || cfg.damage || 30;
    const speedScale = cfg.speedDamageScale !== undefined ? cfg.speedDamageScale : 1.0;
    const speedBonus = Math.max(0, curSpeed - this.baseSpeed) * speedScale;
    let totalDmg = Math.round(baseDmg + speedBonus + this.momentumStacks * this.damagePerHit);

    if (this.isSuperUnarmed || this.isTerminalVelocity) {
      totalDmg = Math.round(totalDmg * (cfg.superUnarmedDamageMult || 1.6));
    }

    // Deal kinetic slam damage (Unparriable body impact basic attack)
    if (typeof target.takeDamage === 'function') {
      target.takeDamage(totalDmg, this, {
        isMelee: true,
        isBasicAttack: true,
        isKineticBump: true,
        unparriable: true
      });
    }

    // Hit Slow Movement for BOTH Unarmed and the enemy for a brief moment (Gated by enableHitSlow)
    const isSlowEnabled = this.isSkillEnabled(CONFIG.unarmed?.enableHitSlow, true);
    const slowDur = isSlowEnabled ? (cfg.hitSlowDuration || 14) : 0;
    const slowMult = isSlowEnabled ? (cfg.hitSlowMultiplier || 0.35) : 1.0;
    const enemySlowDur = isSlowEnabled ? (cfg.enemyHitSlowDuration || slowDur) : 0;
    const enemySlowMult = isSlowEnabled ? (cfg.enemyHitSlowMultiplier || slowMult) : 1.0;

    if (isSlowEnabled) {
      // 1. Apply hit slow movement to target
      if (typeof target.applySlow === 'function') {
        target.applySlow(enemySlowDur, enemySlowMult, { isUnarmedImpact: true });
      } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
        target.statusEffects.applySlow(enemySlowDur, enemySlowMult, { isUnarmedImpact: true });
      } else {
        target.slowTimer = Math.max(target.slowTimer || 0, enemySlowDur);
        target.slowMultiplier = enemySlowMult;
      }

      // 2. Apply hit slow movement to Unarmed
      if (typeof this.applySlow === 'function') {
        this.applySlow(slowDur, slowMult, { isUnarmedImpact: true });
      } else if (this.statusEffects && typeof this.statusEffects.applySlow === 'function') {
        this.statusEffects.applySlow(slowDur, slowMult, { isUnarmedImpact: true });
      } else {
        this.slowTimer = Math.max(this.slowTimer || 0, slowDur);
        this.slowMultiplier = slowMult;
      }
    }

    // Dynamic martial arts fist punch animation on impact
    this.punchAnimTimer = this.punchAnimMaxTimer;
    this.punchHand = this.punchHand === 'right' ? 'left' : 'right';

    // ── True 2D Elastic Sphere-on-Sphere Collision Physics ──
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;

    // Normal and tangential velocity projections
    const v1n = this.vx * nx + this.vy * ny;
    const v1t = this.vx * tx + this.vy * ty;
    const targetVx = target.vx || 0;
    const targetVy = target.vy || 0;
    const v2n = targetVx * nx + targetVy * ny;
    const v2t = targetVx * tx + targetVy * ty;

    const kbBase = cfg.collisionKnockbackBase || 14;
    const kbScale = cfg.collisionKnockbackScale || 1.5;
    const rawKbForce = kbBase + (curSpeed / this.baseSpeed) * kbScale * 5;
    const kbForce = rawKbForce * enemySlowMult;

    // Target receives forward impulse along normal while conserving tangential momentum
    target.vx = (v2t * tx + nx * (v2n + kbForce)) * enemySlowMult;
    target.vy = (v2t * ty + ny * (v2n + kbForce)) * enemySlowMult;

    // Cancel active kinetic surge dash so surge speed does not bypass hit slow
    this.surgeTimer = 0;

    // Unarmed 2D elastic rebound: tangential velocity is conserved for natural angular deflection!
    const reboundBaseSpeed = Math.max(this.baseSpeed, Math.max(curSpeed, this.speed));
    if (this.isSuperUnarmed || this.isTerminalVelocity) {
      // Super Unarmed has unstoppable kinetic mass — punches through with minimal normal reflection
      const superNormal = Math.max(v1n * 0.70, 4.0);
      let sVx = (nx * superNormal + tx * v1t) * slowMult;
      let sVy = (ny * superNormal + ty * v1t) * slowMult;
      const sSpd = Math.hypot(sVx, sVy) || 1;
      this.vx = (sVx / sSpd) * this.maxTerminalVelocity * slowMult;
      this.vy = (sVy / sSpd) * this.maxTerminalVelocity * slowMult;
    } else {
      // Normal Unarmed rebounds elastically off target normal while retaining full tangential momentum
      const reboundNormal = -Math.max(Math.abs(v1n) * 0.85, 4.0);
      const reboundSpeed = reboundBaseSpeed * slowMult;
      let rVx = nx * reboundNormal + tx * v1t;
      let rVy = ny * reboundNormal + ty * v1t;
      const rSpd = Math.hypot(rVx, rVy) || 1;
      this.vx = (rVx / rSpd) * reboundSpeed;
      this.vy = (rVy / rSpd) * reboundSpeed;
    }
    this.gunAngle = Math.atan2(this.vy, this.vx);

    this.collisionCooldown = Math.max(14, slowDur + 2);

    if (this.isSkillEnabled(CONFIG.unarmed?.enableMomentumScaling, true)) {
      this.momentumStacks = Math.min(this.maxMomentumStacks, this.momentumStacks + 1);
      this._syncLiveDamageAndSpeed();
    }

    // Gains evade chance for each hit connected
    this.evadeHits = (this.evadeHits || 0) + 1;
    this._syncEvadeChance();

    // Signature loud "THUD" audio & screen shake
    audioSystem.playSFX('attack_fleshhit', 1.0);
    triggerGlobalScreenShake(Math.min(13, 3 + curSpeed * 0.55), 8);

    // Impact flash & spark effects
    const midX = (this.x + target.x) / 2;
    const midY = (this.y + target.y) / 2;
    spawnImpactFlash(midX, midY, 32, this.isSuperUnarmed ? '#FFFFFF' : '#E4E4E7');
    spawnSparks(midX, midY, 8, '#FFFFFF');

    // Concentric Supersonic Shockwave at collision point (Rule 26)
    this._spawnShockwave(midX, midY, 65 + this.momentumStacks * 2.5, 20, 3, this.isSuperUnarmed ? '#FFFFFF' : '#F4F4F5');

    // Consumes wall rebounce charge: must rebounce to the arena wall first to deal damage again!
    this.hasWallRebounded = false;
  }

  /**
   * Proximity collision check for update() loop (supports multi-target / standalone simulations).
   */
  _checkFighterCollision(opponent) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableKineticBump, true)) return;
    if (this.collisionCooldown > 0) return;

    // Gather valid enemy targets (supports 1v1, 1v2, 2v2, Tag Match, minions/illusions)
    const targets = [];
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)) {
          targets.push(f);
        }
      }
    }
    if (targets.length === 0 && opponent && !opponent.isDead && opponent.hp > 0) {
      targets.push(opponent);
    }

    for (const target of targets) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.r + target.r;

      if (dist <= minDist + 8 && dist > 0) {
        this._handleKineticBumpCollision(target);
        break;
      }
    }
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   * Unarmed's Basic Attack: Hurtle towards the enemy to deliver a kinetic body bump!
   */
  shoot(ownerIndex, opponent) {
    if (!this.isSkillEnabled(CONFIG.unarmed?.enableKineticBump, true)) return;
    const requireRebound = this.isSkillEnabled(CONFIG.unarmed?.requireWallBounceForDamage, true);
    if (requireRebound && !this.hasWallRebounded) {
      // Must rebounce to the wall first: preserve natural ricochet velocity towards the walls!
      return;
    }
    const target = opponent || (state.fighters && state.fighters.find(f => f !== this && !f.isDead && !this.isTeammate(f)));
    if (!target || target.isDead) return;

    // Direct momentum towards the opponent to deliver the body bump
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const angle = Math.atan2(dy, dx);
      this.gunAngle = angle;
      const curSpeed = Math.hypot(this.vx, this.vy);
      const targetSpeed = Math.max(curSpeed, this.speed);
      this.vx = Math.cos(angle) * targetSpeed;
      this.vy = Math.sin(angle) * targetSpeed;
    }
  }

  update(opponent, ownerIndex, arena) {
    // 0. Process active visual effects lifecycles before freeze guard (Rule 25)
    this._updateVisualExplosions();
    this._updateVisualEffects();

    // 1. Mandatory freeze & time-stop guard (Rule 1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.kineticSurgeCooldown > 0) this.kineticSurgeCooldown--;
    if (this.superUnarmedCooldown > 0) this.superUnarmedCooldown--;
    if (this.terminalVelocityCooldown > 0) this.terminalVelocityCooldown--;
    if (this.collisionCooldown > 0) this.collisionCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // 2. Super Unarmed Overdrive Timer (Wiki: Maintains top speed for entire duration)
    if (this.isSuperUnarmed) {
      this.superUnarmedTimer--;
      if (this.superUnarmedTimer <= 0) {
        this.isSuperUnarmed = false;
        this.isTerminalVelocity = false;
      }
    }

    // 3. Kinetic Surge Active Dash
    if (this.surgeTimer > 0) {
      this.surgeTimer--;
      this.vx = Math.cos(this.surgeAngle) * this.surgeSpeed;
      this.vy = Math.sin(this.surgeAngle) * this.surgeSpeed;
    }

    // 4. Permanent Speed & Damage Scaling Sync (Gained momentum never decays over time)
    this._syncLiveDamageAndSpeed();

    // 7. Movement, Wall Ricochet & Proximity Collision Physics
    this.applyMovementPhysics(1.0);
    this.resolveWallBounce(arena, opponent);
    this._checkFighterCollision(opponent);

    // 8. Sleek Earclacks Ghost Afterimage Trail Generation (Reduced count & Anti-Summon Bug Fix)
    const isPlaying = typeof state !== 'undefined' && (!state.gameState || state.gameState === 'playing' || state.gameState === 'running');
    const isSummoningOrSpawning = Boolean(this.isSpawning || (this.invulnerableTimer && this.invulnerableTimer > 40) || (this._tagInGlowTimer && this._tagInGlowTimer > 0));

    if (!isPlaying || isSummoningOrSpawning) {
      this._lastTrailX = this.x;
      this._lastTrailY = this.y;
      if (this.afterimages) this.afterimages.length = 0;
    } else {
      const trailSpeed = Math.hypot(this.vx, this.vy);
      if (this._lastTrailX === undefined) {
        this._lastTrailX = this.x;
        this._lastTrailY = this.y;
      }
      const dx = this.x - this._lastTrailX;
      const dy = this.y - this._lastTrailY;
      const dist = Math.hypot(dx, dy);

      // If distance jumped unnaturally (teleport, summon, arena wrap, respawn), snap immediately without spawning trails
      if (dist > 25.0) {
        this._lastTrailX = this.x;
        this._lastTrailY = this.y;
        if (this.afterimages) this.afterimages.length = 0;
      } else if (trailSpeed >= 3.8 || this.isSuperUnarmed || this.surgeTimer > 0) {
        // Reduced lifetime (4-7 frames instead of 14) for a crisp, snappy trail
        const lifetime = Math.min(7, Math.max(4, Math.round(3 + trailSpeed * 0.25)));

        if (dist >= 14.0) {
          // At extreme supersonic speeds (>14px/f), spawn 2 slices (midpoint + current position)
          this.afterimages.push({
            x: this._lastTrailX + dx * 0.5,
            y: this._lastTrailY + dy * 0.5,
            timer: lifetime,
            maxTimer: lifetime
          });
          this.afterimages.push({
            x: this.x,
            y: this.y,
            timer: lifetime,
            maxTimer: lifetime
          });
        } else {
          // Normal high-speed motion: exactly 1 slice per frame at current position
          this.afterimages.push({
            x: this.x,
            y: this.y,
            timer: lifetime,
            maxTimer: lifetime
          });
        }

        this._lastTrailX = this.x;
        this._lastTrailY = this.y;

        // Strictly reduced max active afterimages from 48 down to 8-12 (reduces visual clutter)
        const maxAllowed = this.isSuperUnarmed ? 12 : 8;
        while (this.afterimages.length > maxAllowed) {
          this.afterimages.shift();
        }
      } else {
        this._lastTrailX = this.x;
        this._lastTrailY = this.y;
      }
    }

    // Watchdog check for stalled velocity (skip during active hit slow window)
    if (this.slowTimer <= 0 && Math.hypot(this.vx, this.vy) < 0.1) {
      this.resumeMovement(opponent);
    }
  }

  /**
   * Mandatory In-Game Overlay HP Drawing (Rule 21):
   * Unarmed uses the iconic Earclacks centered HP overlay directly in the middle of its body.
   * Suppresses the default floating text underneath the body and renders the centered HP number on the top layer.
   */
  drawHealth(ctx) {
    if (typeof state !== 'undefined' && (state.gameState === 'faceoff' || state.gameState === 'faceOff' || state.gameState === 'faceOffThumbnail')) return;
    if (CONFIG.hudHideOverheadHp) return;
    if (this._isWinnerReveal || this._isFaceOff) return;

    drawUnarmedCenterHpOverlay(ctx, this);
  }

  drawBody(ctx) {
    drawUnarmedSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawUnarmedSkin(ctx, this);
  }

  draw(ctx, opponent) {
    // 1. Draw ghost afterimage trails in world space
    drawUnarmedAfterimages(ctx, this);

    // 2. Draw concentric supersonic shockwaves in world space
    drawKineticShockwaves(ctx, this);

    // 3. Draw character skin & body (Shaded Grey or Super Unarmed White)
    drawUnarmedSkin(ctx, this);

    // 4. Mandatory in-game overhead HP & freeze timer (Rule 21)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
