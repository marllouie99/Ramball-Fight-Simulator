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
import { FighterStateMachine, FighterState } from '../../core/fighterStateMachine.js';
import { drawGrayShield, drawGraySword } from '../../graphics/weaponVisuals.js';

// ─────────────────────────────────────────────
// KNIGHT FSM STATES
// ─────────────────────────────────────────────

/**
 * Knight is idle - can move and attack freely.
 */
class KnightIdleState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'KnightIdle';
  }

  canMove() { return true; }
  canAttack() { return true; }
  canTakeDamage() { return true; }
}

/**
 * Knight is charging the dash attack after sword breaks.
 */
class KnightChargingState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'KnightCharging';
  }

  enter(prevState) {
    super.enter(prevState);
    this.duration = CONFIG.knight.dashChargeFrames;
    this.hasAppliedKnockback = false;
  }

  update(dt) {
    this.timer++;
    
    // Apply knockback pulse at the start of charging
    if (!this.hasAppliedKnockback && this.timer === 1) {
      this.fighter.applyChargeKnockback();
      this.hasAppliedKnockback = true;
    }
    
    if (this.timer >= this.duration) {
      return 'KnightDashing';
    }
    return null;
  }

  canMove() { return false; }
  canAttack() { return false; }
  canTakeDamage() { return true; }
  canBeInterrupted() { return false; }
}

/**
 * Knight is dashing toward the target after sword breaks.
 */
class KnightDashingState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'KnightDashing';
  }

  enter(prevState) {
    super.enter(prevState);
    this.duration = CONFIG.knight.dashDurationFrames;
    this.hasHit = false;
    
    // Lock target position from when sword broke
    this.targetX = this.fighter.dashTargetX;
    this.targetY = this.fighter.dashTargetY;
    
    // Calculate direction to target
    const dx = this.targetX - this.fighter.x;
    const dy = this.targetY - this.fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      this.dirX = dx / dist;
      this.dirY = dy / dist;
    } else {
      this.dirX = Math.cos(this.fighter.gunAngle);
      this.dirY = Math.sin(this.fighter.gunAngle);
    }
    
    // Store velocity for physics
    const dashSpeed = CONFIG.knight.dashSpeed;
    this.fighter.dashVx = this.dirX * dashSpeed;
    this.fighter.dashVy = this.dirY * dashSpeed;
  }

  update(dt) {
    this.timer++;
    
    // Apply dash movement
    this.fighter.x += this.fighter.dashVx;
    this.fighter.y += this.fighter.dashVy;
    
    // Check for wall collision
    this.fighter.resolveWallBounce(state.arena);
    
    if (this.timer >= this.duration) {
      // End the dash and transition back to idle
      this.fighter._endDash();
      return 'KnightIdle';
    }
    return null;
  }

  canMove() { return false; }
  canAttack() { return false; }
  canTakeDamage() { return false; }
  canBeInterrupted() { return false; }
}

// ─────────────────────────────────────────────
// KNIGHT FIGHTER CLASS
// ─────────────────────────────────────────────

export class KnightFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Initialize FSM for dash behavior
    this.fsm = new FighterStateMachine(this);
    this.fsm.addState('KnightIdle', KnightIdleState)
           .addState('KnightCharging', KnightChargingState)
           .addState('KnightDashing', KnightDashingState);
    this.fsm.setState('KnightIdle');
    
    // Sword/swipe properties
    this.swipeCooldown   = 0;
    this.swipeActive     = false;
    this.swipeTimer      = 0;
    this.swipeAngle      = 0;
    this.swordBroken     = false;
    this.swordHealth     = CONFIG.knight.swordDurability;
    this.shieldBroken    = false;
    this.shieldHealth    = CONFIG.knight.shieldDurability;
    this.canThrowSword   = false;
    this.swordThrown     = false;
    this.swordReturnTimer = 0;
    this.blockFlashTimer = 0;
    
    // Dash properties (used by FSM states)
    this.dashTargetX     = null;
    this.dashTargetY     = null;
    this.hasHitWithDash  = false;
    this.dashVx          = 0;
    this.dashVy          = 0;
    
    // Visual properties
    this.slashFadeTimer  = 0;
    this.dashGlowFade    = 0;
  }

  reset() {
    super.reset();
    
    // Reset FSM to idle (guard against being called during constructor before fsm is initialized)
    if (this.fsm) {
      this.fsm.setState('KnightIdle');
    }
    
    // Reset properties
    this.swipeCooldown   = 0;
    this.swipeActive     = false;
    this.swipeTimer      = 0;
    this.swordBroken     = false;
    this.swordHealth     = CONFIG.knight.swordDurability;
    this.shieldBroken    = false;
    this.shieldHealth    = CONFIG.knight.shieldDurability;
    this.canThrowSword   = false;
    this.swordThrown     = false;
    this.swordReturnTimer = 0;
    this.blockFlashTimer = 0;
    this.dashTargetX     = null;
    this.dashTargetY     = null;
    this.hasHitWithDash  = false;
    this.dashVx          = 0;
    this.dashVy          = 0;
    this.slashFadeTimer  = 0;
    this.dashGlowFade    = 0;
  }

  // ── State helpers for external code ──
  
  /** Check if currently in dash state (charging or dashing) */
  isDashing() {
    return this.fsm.isInState('KnightCharging') || this.fsm.isInState('KnightDashing');
  }

  /** Check if currently in charging state */
  isCharging() {
    return this.fsm.isInState('KnightCharging');
  }

  // â”€â”€ Passive: shield block on direct projectile hits and melee attacks â”€â”€
  takeDamage(amount, attacker, opts = {}) {
    // Shield blocks direct projectile hits and melee attacks (not while dashing).
    // Some projectile hits pass opts.isProjectile, others provide opts.projectile.
    const isBlockableHit = !!(opts.isProjectile || opts.projectile || opts.isMelee);
    if (isBlockableHit && this.fsm.isInState('KnightIdle') && !(this.timeStopTimer > 0)) {
      if (Math.random() < CONFIG.knight.shieldBlockChance) {
        // Shield absorbs this hit; reduce shield health and possibly break
        this.blockFlashTimer = CONFIG.knight.blockFlashFrames;
        this.shieldHealth--;
        // Play shield block sound
        const blockSound = getSkillSound('knight', 'shieldblock');
        if (blockSound) playSound(blockSound.src, blockSound.volume);
        if (this.shieldHealth <= 0 && !this.shieldBroken) {
          this.shieldBroken = true;
          this.canThrowSword = true; // allow sword throw
          spawnFloatingText(this.x, this.y - this.r - 25, 'SHIELD BREAK!', '#ff6633');
          // Attempt immediate throw so skill triggers even if stationary
          try {
            const ownerIndex = state.fighters.indexOf(this);
            if (ownerIndex >= 0 && projectileSystem) {
              projectileSystem.fireProjectile(this, ownerIndex, CONFIG.knight.shieldThrowDamage, false, CONFIG.projectile.speed * 1.2, false, 'sword');
              this.swordThrown = true;
              this.canThrowSword = false;
              this.swordBroken = true;
              this.swordHealth = 0;
              this.swordReturnTimer = CONFIG.knight.swordReturnFrames;
              spawnFloatingText(this.x + Math.cos(this.gunAngle) * (this.r + 10), this.y + Math.sin(this.gunAngle) * (this.r + 10), 'THROW!', '#ffcc66');
            }
          } catch (e) {
            // ignore
          }
        } else {
          // Space this out so it doesn't perfectly overlap with "BLOCK!"
          spawnFloatingText(this.x, this.y - this.r - 28, `SHIELD ${this.shieldHealth}`, '#c8d8ff');
        }
        return false; // absorbed the hit
      }
    }
    return super.takeDamage(amount, attacker, opts);
  }

  // â”€â”€ Sword swipe â”€â”€
  _trySwordSwipe(opponent, ownerIndex) {
    if (!opponent || this.swipeCooldown > 0 || this.swordBroken) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.knight.swordRange) return;

    // Hit!
    this.swipeAngle  = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swipeActive = true;
    this.swipeTimer  = CONFIG.knight.swipeDuration;
    this.swipeCooldown = CONFIG.knight.swipeCooldown;
    opponent.takeDamage(CONFIG.knight.swordDamage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#e0e0e0');
    // Play sword swing sound
    const swipeSound = getBasicAttackSound(this._def.id, this._def.type);
    this._attackSoundTimer = swipeSound.delay;
    this._attackSoundConfig = swipeSound;

    // Reduce durability
    this.swordHealth--;
    if (this.swordHealth <= 0) {
      this._breakSword(opponent);
    }
  }

  _breakSword(opponent) {
    this.swordBroken = true;
    this.vx = 0;
    this.vy = 0;
    // Lock dash target at moment of sword break so opponent can dodge
    if (opponent) {
      this.dashTargetX = opponent.x;
      this.dashTargetY = opponent.y;
    } else {
      const lockDist = 220;
      this.dashTargetX = this.x + Math.cos(this.gunAngle) * lockDist;
      this.dashTargetY = this.y + Math.sin(this.gunAngle) * lockDist;
    }
    // Transition to charging state via FSM
    this.fsm.setState('KnightCharging');
    this.hasHitWithDash = false;
    spawnFloatingText(this.x, this.y - this.r - 14, 'SWORD BREAK!', '#ff9933');
  }

  // â”€â”€ Shield dash launch â”€â”€
  _launchDash(opponent) {
    // Dash towards the locked target if present, otherwise toward opponent or current aim
    if (this.dashTargetX != null && this.dashTargetY != null) {
      const dx = this.dashTargetX - this.x;
      const dy = this.dashTargetY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.dashVx = (dx / dist) * CONFIG.knight.dashSpeed;
      this.dashVy = (dy / dist) * CONFIG.knight.dashSpeed;
    } else if (opponent) {
      const dx   = opponent.x - this.x;
      const dy   = opponent.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.dashVx = (dx / dist) * CONFIG.knight.dashSpeed;
      this.dashVy = (dy / dist) * CONFIG.knight.dashSpeed;
    } else {
      this.dashVx = Math.cos(this.gunAngle) * CONFIG.knight.dashSpeed;
      this.dashVy = Math.sin(this.gunAngle) * CONFIG.knight.dashSpeed;
    }
  }

  // One-time knockback applied when charging begins
  applyChargeKnockback() {
    if (!state || !state.fighters) return;
    const radius = CONFIG.knight.chargeKnockbackRadius || 80;
    const kb = CONFIG.knight.chargeKnockback || 2.0;
    for (let i = 0; i < state.fighters.length; i++) {
      const other = state.fighters[i];
      if (!other || other === this) continue;
      // skip dead or unspawned fighters
      if (other.hp <= 0) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d <= radius) {
        const nx = dx / d;
        const ny = dy / d;
        other.vx += nx * kb;
        other.vy += ny * kb;
        spawnFloatingText(other.x, other.y - other.r - 6, 'KNOCKBACK!', '#ffd4b2');
      }
    }
  }

  _endDash() {
    // restore weapons after dash finishes
    this.restoreWeapons();
    // Continue floating naturally in the last dash direction.
    this.vx = this.dashVx;
    this.vy = this.dashVy;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashTargetX = null;
    this.dashTargetY = null;
  }

  // â”€â”€ Smart Bounce â”€â”€
  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      if (this.fsm.isInState('KnightDashing')) {
        if (bouncedX) {
          this.dashVx = -this.dashVx;
        }
        if (bouncedY) {
          this.dashVy = -this.dashVy;
        }
        this.vx = this.dashVx;
        this.vy = this.dashVy;
      } else {
        // Instead of physical reflection, bounce perfectly toward the enemy!
        const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;

        this.vx = (dx / dist) * currentSpeed;
        this.vy = (dy / dist) * currentSpeed;
      }
    }
  }

  // â”€â”€ Aiming â”€â”€
  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else {
      this.gunAngle = Math.atan2(this.vy, this.vx);
    }
  }

  aimAt(tx, ty) {
    if (typeof tx !== 'number' || typeof ty !== 'number') return;
    this.gunAngle = Math.atan2(ty - this.y, tx - this.x);
  }

  // â”€â”€ Main update â”€â”€
  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();
    if (this.blockFlashTimer > 0) this.blockFlashTimer--;

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Shield glow fade out logic
    if (this.isDashing()) {
      this.dashGlowFade = 1.0;
    } else if (this.dashGlowFade > 0) {
      this.dashGlowFade -= 0.03; // Smooth fade out over ~30 frames
      if (this.dashGlowFade < 0) this.dashGlowFade = 0;
    }

    // â€” CHARGING phase: stand still, lock aim, wait â€”
    if (this.isCharging()) {
      // Dampen velocity rapidly so he comes to a halt
      this.vx *= 0.8;
      this.vy *= 0.8;

      // allow knockback to carry the fighter slightly while charging
      this.x += this.vx;
      this.y += this.vy;
      // resolve bounce normally (no homing during charge)
      this.resolveWallBounce(arena);
      return;
    }

    // â€” DASHING phase: fly toward locked target â€”
    if (this.fsm.isInState('KnightDashing')) {
      this.angle += CONFIG.knight.dashSpeed * CONFIG.spin.rate * 3; // spin fast during dash

      if (!this.hasHitWithDash && opponent) {
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (dist <= this.r + opponent.r + 4) {
          opponent.takeDamage(CONFIG.knight.dashDamage, this, { isMelee: true });
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SHIELD BASH!', '#88bbff');
          // Knockback
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const d  = Math.hypot(dx, dy) || 1;
          opponent.vx += (dx / d) * CONFIG.knight.dashKnockback;
          opponent.vy += (dy / d) * CONFIG.knight.dashKnockback;
          this.hasHitWithDash = true;
        }
      }
      return;
    }

    // Normal movement / Deceleration
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const ns = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * ns;
      this.vy = (this.vy / currentSpeed) * ns;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * CONFIG.spin.rate;
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    // Cooldown tick
    if (this.swipeCooldown > 0) this.swipeCooldown--;

    // Swipe animation tick
    if (this.swipeActive) {
      this.swipeTimer--;
      if (this.swipeTimer <= 0) {
        this.swipeActive = false;
        this.slashFadeTimer = 15; // Linger for 15 frames
      }
    } else if (this.slashFadeTimer > 0) {
      this.slashFadeTimer--;
    }

    // If shield was broken, allow a one-time sword throw while moving
    if (this.canThrowSword && !this.swordThrown) {
      const moveSpeed = Math.hypot(this.vx, this.vy);
      if (moveSpeed > 0.6) { // must be moving to throw
        if (projectileSystem) {
          projectileSystem.fireProjectile(this, ownerIndex, CONFIG.knight.shieldThrowDamage, false, CONFIG.projectile.speed * 1.2, false, 'sword');
        }
        spawnFloatingText(this.x + Math.cos(this.gunAngle) * (this.r + 10), this.y + Math.sin(this.gunAngle) * (this.r + 10), 'THROW!', '#ffcc66');
        this.swordThrown = true;
        this.canThrowSword = false;
        // Mark sword as broken/removed after throw
        this.swordBroken = true;
        this.swordHealth = 0;
        this.swordReturnTimer = CONFIG.knight.swordReturnFrames;
      }
    }

    // Handle sword return timer: restore sword after delay
    if (this.swordThrown && this.swordReturnTimer > 0) {
      this.swordReturnTimer--;
      if (this.swordReturnTimer <= 0) {
        this.restoreWeapons();
      }
    }
    // Try auto-swipe
    this._trySwordSwipe(opponent, ownerIndex);
  }

  // â”€â”€ Drawing â”€â”€
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#aaaaaa';
    ctx.stroke();

    // Draw sword range radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + CONFIG.knight.swordRange, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(158, 158, 158, 0.35)'; // Visible gray ring
    ctx.stroke();
  }

  // Restore both sword and shield to full durability and clear thrown state
  restoreWeapons() {
    this.swordBroken = false;
    this.swordHealth = CONFIG.knight.swordDurability;
    this.swordThrown = false;
    this.canThrowSword = false;
    this.shieldBroken = false;
    this.shieldHealth = CONFIG.knight.shieldDurability;
    this.dashGlowFade = 0;
    this.swordReturnTimer = 0;
    spawnFloatingText(this.x, this.y - this.r - 12, 'WEAPONS RESTORED!', '#aaffaa');
  }

  /** Draws the sword (right) and shield (left) around the body. */
  drawGun(ctx) {
    const ga = this.gunAngle;
    const isDashing = this.isDashing();

    // Draw shield
    drawGrayShield(ctx, this.x, this.y, ga, this.blockFlashTimer, isDashing ? 'charging' : null, this.r, this.dashGlowFade);

    // Sword: if swiping, animate the sword arc; otherwise draw normally.
    // Hide the sword completely while it is thrown.
    let swordAngle = ga;
    if (this.swipeActive && this.swipeTimer > 0) {
      const progress = 1 - this.swipeTimer / CONFIG.knight.swipeDuration; // 0 -> 1
      const swingTotal = Math.PI * 1.1; // total sweep angle for visible arc
      const swingStart = this.swipeAngle - swingTotal * 0.5;
      swordAngle = swingStart + progress * swingTotal;
    }

    if (!this.swordThrown) {
      if (!this.swordBroken) {
        drawGraySword(ctx, this.x, this.y, swordAngle, this.r, isDashing ? 'dashing' : null);
      } else {
        drawGrayBrokenSword(ctx, this.x, this.y, swordAngle, this.r, isDashing ? 'dashing' : null);
      }
    }
  }

  draw(ctx) {
    // â”€â”€ Block expanding flash â”€â”€
    if (this.blockFlashTimer > 0) {
      const p = 1 - (this.blockFlashTimer / CONFIG.knight.blockFlashFrames);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gunAngle - Math.PI / 2);
      ctx.translate(this.r + 5, 0);
      ctx.beginPath();
      ctx.arc(0, 0, 10 + p * 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 216, 255, ${0.6 * (1 - p)})`;
      ctx.fill();
      ctx.restore();
    }

    // â”€â”€ Swipe arc flash â”€â”€
    if ((this.swipeActive && this.swipeTimer > 0) || this.slashFadeTimer > 0) {
      let progress = 1.0;
      let fade = this.slashFadeTimer / 15;
      
      if (this.swipeActive) {
        progress = 1 - (this.swipeTimer / CONFIG.knight.swipeDuration);
        fade = 1.0;
      }
      
      const glowAlpha = Math.pow(fade, 0.8);
      const arcRadius = this.r + 22;
      
      const localStartAngle = -Math.PI / 2.8;
      const localEndAngle = Math.PI / 2.8;
      const localCurrentEndAngle = localStartAngle + (localEndAngle - localStartAngle) * progress;
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.swipeAngle);
      
      // The Growing Clip Region
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcRadius + 20, localStartAngle - 0.1, localCurrentEndAngle);
      ctx.closePath();
      ctx.clip();
      
      // Fading Tail Gradient (Golden for new aesthetic)
      const fullStartY = Math.sin(localStartAngle) * arcRadius;
      const currentY = Math.sin(localCurrentEndAngle) * arcRadius;
      const gradEndY = Math.max(fullStartY + 0.1, currentY); 
      
      const tailGrad = ctx.createLinearGradient(0, fullStartY, 0, gradEndY);
      tailGrad.addColorStop(0, 'rgba(255, 200, 0, 0.0)'); 
      tailGrad.addColorStop(1, 'rgba(255, 240, 100, 1.0)');
      
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = glowAlpha;
      ctx.shadowBlur = 0;
      
      // Main arc
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, localStartAngle, localEndAngle);
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth   = 5;
      ctx.lineCap     = 'round';
      ctx.stroke();
      
      // Secondary inner thin arc for extra glow
      ctx.globalAlpha = glowAlpha * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius + 8, localStartAngle, localEndAngle);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }

    // â”€â”€ Charge ring â”€â”€
    if (this.isCharging()) {
      const progress = 1 - this.dashChargeTimer / CONFIG.knight.dashChargeFrames;
      const rings    = 3;
      for (let i = 0; i < rings; i++) {
        const phase = (progress + i / rings) % 1;
        ctx.save();
        ctx.globalAlpha  = (1 - phase) * 0.55;
        ctx.strokeStyle  = '#88aaff';
        ctx.lineWidth    = 2.5 - phase * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 6 + phase * 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Direction arrow showing dash target
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#aaccff';
      ctx.lineWidth   = 2;
      const arrowLen = this.r + 38;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.gunAngle) * (this.r + 8),
                 this.y + Math.sin(this.gunAngle) * (this.r + 8));
      ctx.lineTo(this.x + Math.cos(this.gunAngle) * arrowLen,
                 this.y + Math.sin(this.gunAngle) * arrowLen);
      ctx.stroke();
      ctx.restore();
    }

    // â”€â”€ Dash motion blur â”€â”€
    if (this.fsm.isInState('KnightDashing')) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = '#aabbff';
      ctx.beginPath();
      ctx.arc(this.x - this.dashVx * 3, this.y - this.dashVy * 3, this.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(this.x - this.dashVx * 6, this.y - this.dashVy * 6, this.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * Black Fighter (Black Hole)
 * Shoots black projectiles that can transform into black holes.
 * Skill: Summons a black hole near the opponent to drag them in.
 */
