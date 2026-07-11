import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from '../../graphics/weaponVisuals.js';
import { drawDoppelgangerSkin } from '../../graphics/fighters/doppelgangerSkin.js';

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
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
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
    if (this.illusionsSummoned >= CONFIG.doppleganger.maxIllusions) return;

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
    let targetAngle = Math.random() * Math.PI * 2;
    let nearestDist = Infinity;
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0 || fighter === this) continue;
      const dist = Math.hypot(fighter.x - illusionX, fighter.y - illusionY);
      if (dist < nearestDist) {
        nearestDist = dist;
        targetAngle = Math.atan2(fighter.y - illusionY, fighter.x - illusionX);
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
      takeDamage(amount, attacker, opts = {}) {
        return applyDamageToTarget(this, amount, attacker, opts);
      },
    };

    state.illusions.push(illusion);
    spawnIllusionSpawn(illusion);
    this.illusionsSummoned++;
    spawnFloatingText(this.x, this.y - this.r - 15, 'ILLUSION!', '#9b59b6');
    // Play summon illusion sound
    const illusionSound = getSkillSound('doppelganger', 'summonillusion');
    if (illusionSound) playSound(illusionSound.src, illusionSound.volume);
  }

  _trySwordSwing(opponent, ownerIndex) {
    if (!opponent || this.swordCooldown > 0) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.doppleganger.swordRange) return;

    // Hit!
    this.swordSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSwingActive = true;
    this.swordSwingTimer = this.swordSwingDuration;
    this.swordCooldown = CONFIG.doppleganger.swordCooldown;
    // Use this.damage which is already reduced for illusions (50% of Doppleganger's damage)
    opponent.takeDamage(this.damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#9b59b6');

    // Play attack sound
    const sound = getBasicAttackSound(this._def.id, this._def.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze movement
    if (this._handleTimeStop()) {
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
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
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
    // Draw the haze and void core UNDER the body
    drawDopplegangerBodyEffect(ctx, this.x, this.y, this.r, this.angle, 'under', animTime);
    // Custom body skin
    drawDoppelgangerSkin(ctx, this.x, this.y, this.r, this.angle, animTime);
    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, this.x, this.y, this.r, this.angle, 'over', animTime);
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
      this.swordSwingDuration
    );
  }
}

/**
 * Machine Gun Fighter (Storm Commando)
 * High-frequency fire rate using a tactical minigun.
 * Mechanics:
 * - Fire builds up "Heat". At 100 Heat, the gun overheats and locks out.
 * - Active Skill: Suppressive Sweep. Performs a fast tactical roll/slide in the movement direction
 *   while spraying a bullet cone that does not generate heat.
 */
