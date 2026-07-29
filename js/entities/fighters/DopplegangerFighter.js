import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from '../../graphics/weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from '../../graphics/fighters/doppelgangerSkin.js';
import { spawnIllusionSpawn } from '../../graphics/particles/illusionSpawnEffect.js';
import { spawnDoppelgangerDeath } from '../../graphics/particles/doppelgangerDeathEffect.js';

/**
 * Doppleganger — Illusion melee fighter
 * Core mechanic: Creates illusions of itself when health drops by 25%
 * Weapon: Purple crystalline sword
 */
export class DopplegangerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.swordCooldown = 0;
    this.swordSwingActive = false;
    this.swordSwingTimer = 0;
    this.swordSwingAngle = 0;
    this.swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20;

    // Illusion tracking
    this.lastHealthThreshold = 1.0; // Starts at 100% (1.0)
    this.illusionsSummoned = 0;
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.swordSwingActive = false;
    this.swordSwingTimer = 0;
    this.swordSwingAngle = 0;
    this.swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20;
    this.lastHealthThreshold = 1.0;
    this.illusionsSummoned = 0;

    // Clear illusions on reset
    state.illusions = state.illusions.filter(ill => ill.owner !== this);
  }



  // Auto-lock toward enemy upon wall bounce
  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      // Instead of physical reflection, bounce perfectly toward the enemy
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || this.speed;
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;
      const d = distSq > 0 ? Math.sqrt(distSq) : 1;
      this.vx = (dx / d) * currentSpeed;
      this.vy = (dy / d) * currentSpeed;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    const prevHp = this.hp;
    const applied = super.takeDamage(amount, attacker, opts);

    if (applied && amount > 0) {
      const healthPercent = this.hp / this.maxHp;
      const threshold = CONFIG.doppleganger.illusionHealthPercent; // 0.25 (25%)

      // Check if we've crossed a 25% threshold
      const prevThreshold = Math.floor(prevHp / this.maxHp / threshold);
      const currentThreshold = Math.floor(healthPercent / threshold);

      if (currentThreshold < prevThreshold && this.illusionsSummoned < CONFIG.doppleganger.maxIllusions) {
        this.summonIllusion();
      }
    }

    return applied;
  }

  summonIllusion() {
    // Check max illusion cap
    const maxIllusions = CONFIG.doppleganger?.maxIllusions || 4;
    if (this.illusionsSummoned >= maxIllusions) return;

    // Spawn illusion at a random position near the Doppleganger
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    const illusionX = this.x + Math.cos(angle) * distance;
    const illusionY = this.y + Math.sin(angle) * distance;

    // Illusion health is based on current Doppleganger health
    const illusionHealth = this.hp * 0.5; // 50% of current health

    // Illusions spawn with the owner's current movement speed to match exactly
    const illusionSpeed = this.speed || this.baseSpeed || 3;

    // Lock onto nearest target initially
    // OPTIMIZATION: Use opponent directly if available to avoid loop
    let targetAngle = Math.random() * Math.PI * 2;
    if (this._currentOpponent && this._currentOpponent.hp > 0) {
      targetAngle = Math.atan2(this._currentOpponent.y - illusionY, this._currentOpponent.x - illusionX);
    } else {
      let nearestDist = Infinity;
      for (const fighter of state.fighters) {
        if (!fighter || fighter.hp <= 0 || fighter === this) continue;

        const dx = fighter.x - illusionX;
        const dy = fighter.y - illusionY;
        const distSq = dx * dx + dy * dy;

        if (distSq < nearestDist) {
          nearestDist = distSq;
          targetAngle = Math.atan2(fighter.y - illusionY, fighter.x - illusionX);
        }
      }
    }

    const illusion = {
      x: illusionX,
      y: illusionY,
      vx: Math.cos(targetAngle) * illusionSpeed,
      vy: Math.sin(targetAngle) * illusionSpeed,
      r: this.r,
      color: this.color,
      hp: illusionHealth,
      maxHp: illusionHealth,
      damage: this.damage * CONFIG.doppleganger.illusionDamagePercent,
      owner: this,
      swordCooldown: 30,
      swordSwingActive: false,
      swordSwingTimer: 0,
      swordSwingAngle: 0,
      duration: CONFIG.doppleganger.illusionDuration, // Kept for visual reference but not used for removal
      angle: 0,
      gunAngle: 0,
      moveSpeed: illusionSpeed, // Store for speed normalization after bounce
      isIllusion: true,
      timeStopTimer: 0,
      hitStunTimer: 0,
      applyTimeStop(duration) {
        this.timeStopTimer = Math.max(this.timeStopTimer || 0, duration);
      },
      applyHitStun(duration) {
        this.hitStunTimer = Math.max(this.hitStunTimer || 0, duration);
      },
      applyKnockback(vx, vy) {
        this.knockbackVx = vx;
        this.knockbackVy = vy;
      },
      takeDamage(amount, attacker, opts = {}) {
        return applyDamageToTarget(this, amount, attacker, opts);
      },
    };

    state.illusions.push(illusion);
    spawnIllusionSpawn(illusion);
    this.illusionsSummoned++;
    spawnFloatingText(this.x, this.y - this.r - 15, 'ILLUSION!', '#9b59b6');
    // Play summon illusion sound
    const illusionSound = getSkillSound(this._def?.id, 'summonillusion');
    if (illusionSound) audioSystem.playSFX(illusionSound.src, illusionSound.volume);
  }

  _trySwordSwing(opponent, ownerIndex) {
    if (!opponent || this.swordCooldown > 0) return;
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const maxRange = this.r + opponent.r + CONFIG.doppleganger.swordRange;
    if ((dx * dx + dy * dy) > maxRange * maxRange) return;

    // Hit!
    this.swordSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSwingActive = true;
    this.swordSwingTimer = this.swordSwingDuration;
    this.swordCooldown = CONFIG.doppleganger.swordCooldown;
    // Use this.damage which is already reduced for illusions (50% of Doppleganger's damage)
    opponent.takeDamage(this.damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#9b59b6');

    // Play attack sound    
    const sound = getBasicAttackSound(this._def?.id);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  onDeath() {
    spawnDoppelgangerDeath(this);
  }

  update(opponent, ownerIndex, arena) {
    const isFrozen = this._handleTimeStop();
    if (isFrozen) {
      this.interruptAttacks();
      return;
    }

    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Sword swing cooldown
    if (this.swordCooldown > 0) {
      this.swordCooldown--;
    }

    // Sword swing animation timer
    if (this.swordSwingActive) {
      this.swordSwingTimer--;
      if (this.swordSwingTimer <= 0) {
        this.swordSwingActive = false;
      }
    }

    // Try sword swing
    this._trySwordSwing(opponent, ownerIndex);

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    // This matches the base Fighter behavior so illusions don't outrun the Doppelganger
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    let currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // While being knocked back, let velocity decay naturally - don't override it
    const isKnockedBack = (this.knockbackStunTimer || 0) > 0 || currentSpeed > this.speed * 2.5;

    if (isKnockedBack) {
      // Decay knockback gradually
      this.vx *= 0.88;
      this.vy *= 0.88;
      if (this.knockbackStunTimer > 0) this.knockbackStunTimer--;
    } else {
      // Auto-recover from zero velocity if we should be moving
      if (targetSpeed > 0 && currentSpeed < 0.05) {
        const nudgeAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        this.vx = Math.cos(nudgeAngle) * targetSpeed;
        this.vy = Math.sin(nudgeAngle) * targetSpeed;
        currentSpeed = targetSpeed;
      } else if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
        this.vx = (this.vx / currentSpeed) * targetSpeed;
        this.vy = (this.vy / currentSpeed) * targetSpeed;
      }
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  /** Auto-locks onto opponent like Aimbot fighters */
  aim(opponent) {
    if (!opponent || opponent.hp <= 0) return;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
  }

  drawBody(ctx) {
    const animTime = this.animationTime || Date.now();
    
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw the haze and void core UNDER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, this.r, this.angle, 'under', animTime);

    // Custom body skin drawn in the middle slot
    drawDoppelgangerSkin(ctx, 0, 0, this.r, this.angle, animTime);

    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, this.r, this.angle, 'over', animTime);

    // Draw status overlays (shock, poison, burn)
    this.drawStatusOverlays(ctx, this.r);
    
    ctx.restore();
  }

  drawGun(ctx) {
    const animTime = this.animationTime || Date.now();
    drawDopplegangerPurpleSword(
      ctx,
      this.x, this.y,
      this.gunAngle,
      this.r,
      this.swordSwingActive,
      this.swordSwingTimer,
      this.swordSwingAngle,
      this.swordSwingDuration,
      animTime,
      this.color
    );
  }
}
