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
import { drawVoidmasterWeapon } from '../../graphics/weapons/voidmasterWeaponGraphics.js';

export class BlackFighter extends Fighter {
  constructor(def) {
    super(def);
    this.skillCooldown = 0;
    this.blackHoleChance = CONFIG.black.blackHoleChance;
    this.enhancedBlackHoleChance = CONFIG.black.enhancedBlackHoleChance;
    this.roundStartTimer = 0;
    this.enemyInBlackHole = false;
    this.enhancedShotsRemaining = 0;
    this.skillCharging = false;
    this.skillChargeTimer = 0;
  }

  reset() {
    super.reset();
    this.skillCooldown = 0;
    this.roundStartTimer = 60; // Prevent skill use for 1 second after round start
    this.enemyInBlackHole = false;
    this.enhancedShotsRemaining = 0;
    this.skillCharging = false;
    this.skillChargeTimer = 0;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle skill charging state
    if (this.skillCharging) {
      this.skillChargeTimer--;
      
      // Still aim at opponent while charging
      this.aim(opponent);
      
      // Allow knockback and other velocity changes to move the fighter
      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);
      
      // When charging completes, summon the black hole
      if (this.skillChargeTimer <= 0) {
        this.skillCharging = false;
        this.summonBlackHole(opponent, ownerIndex);
      }
      return;
    }

    // Round start timer to prevent immediate skill use
    if (this.roundStartTimer > 0) {
      this.roundStartTimer--;
    }

    // Skill cooldown
    if (this.skillCooldown > 0) {
      this.skillCooldown--;
    }

    // Try to use skill when cooldown is ready (with some randomness) and not at round start
    if (this.skillCooldown === 0 && this.roundStartTimer === 0 && opponent && Math.random() < 0.15) {
      this.startSkillCharge(opponent);
    }

    // Normal shooting
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;
      
      if (aligned) {
        const speed = CONFIG.black.projectileSpeed || (CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1));
        let isBlackHole = false;

        if (this.enhancedShotsRemaining > 0) {
          isBlackHole = true;
          this.enhancedShotsRemaining--;
        } else if (this.enemyInBlackHole) {
          // Use enhanced chance while the enemy is currently inside a black hole.
          isBlackHole = Math.random() < this.enhancedBlackHoleChance;
        } else {
          isBlackHole = Math.random() < this.blackHoleChance;
        }

        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, isBlackHole);
        this.shootCooldown = CONFIG.black.shotCooldown;

        const sound = getBasicAttackSound(this._def.id, this._def.type);
        if (sound) playSound(sound.src, sound.volume);
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena);
  }

  startSkillCharge(opponent) {
    if (!opponent) return;
    
    this.skillCharging = true;
    this.skillChargeTimer = CONFIG.black.skillChargeDuration;
    
    // Stop movement immediately
    this.vx = 0;
    this.vy = 0;
    
    spawnFloatingText(this.x, this.y - this.r - 15, 'CHARGING...', '#9900ff');
  }

  summonBlackHole(opponent, ownerIndex) {
    if (!projectileSystem || !opponent) return;

    // Calculate a random position around the opponent's direction
    const angleToOpponent = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    const randomOffset = (Math.random() - 0.5) * Math.PI; // Random angle offset
    const spawnAngle = angleToOpponent + randomOffset;
    
    const spawnDist = CONFIG.black.skillSpawnRadius;
    const spawnX = opponent.x + Math.cos(spawnAngle) * spawnDist;
    const spawnY = opponent.y + Math.sin(spawnAngle) * spawnDist;

    // Fire a black hole projectile at that position
    projectileSystem.fireBlackHole(spawnX, spawnY, ownerIndex, CONFIG.black.blackHoleDamage);
    
    const bhSound = getSkillSound('voidmaster', 'blackhole');
    if (bhSound) playSound(bhSound.src, bhSound.volume);
    
    this.skillCooldown = CONFIG.black.skillCooldown;
    spawnFloatingText(spawnX, spawnY, 'BLACK HOLE!', '#9900ff');
    
    // Resume gentle movement after summoning
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9900ff';
    ctx.stroke();
  }

  drawGun(ctx) {
    drawVoidmasterWeapon(ctx, this.x, this.y, this.r);
  }

  draw(ctx) {
    // Draw charging indicator
    if (this.skillCharging) {
      const progress = 1 - (this.skillChargeTimer / CONFIG.black.skillChargeDuration);
      const rings = 3;
      
      for (let i = 0; i < rings; i++) {
        const phase = (progress + i / rings) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - phase) * 0.6;
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 2.5 - phase * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 8 + phase * 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      
      // Direction indicator
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#9900ff';
      ctx.lineWidth = 2;
      const arrowLen = this.r + 35;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.gunAngle) * (this.r + 8),
                 this.y + Math.sin(this.gunAngle) * (this.r + 8));
      ctx.lineTo(this.x + Math.cos(this.gunAngle) * arrowLen,
                 this.y + Math.sin(this.gunAngle) * arrowLen);
      ctx.stroke();
      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * DarkSlateGray Fighter (Ninja)
 * Stealthy ninja with shuriken throwing and dodge mechanics.
 * 
 * Basic Attack: Throws shuriken (5 damage, normal fire rate)
 * Passive Skill: Probability to dodge incoming projectiles
 * Activate Skill: After 3 successful dodges, becomes invisible with speed boost (5 seconds)
 * During Invisibility: Deals 2x damage on backstab attacks
 */
