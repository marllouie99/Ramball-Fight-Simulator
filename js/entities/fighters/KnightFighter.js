import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { FighterStateMachine, FighterState } from '../../core/fighterStateMachine.js';
import { drawGrayShield, drawGraySword, drawGrayBrokenSword } from '../../graphics/weaponVisuals.js';

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
    playSound('Assets/Sound Effects/Skills/shieldcharge.mp3', 0.8);
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
    this.duration = CONFIG.knight.dashDuration || 40;
    this.hasHit = false;
    playSound('Assets/Sound Effects/Skills/dash1.mp3', 0.6);
    
    // Lock target position from when sword broke
    this.targetX = this.fighter.dashTargetX;
    this.targetY = this.fighter.dashTargetY;
    
    // Calculate direction to target
    const dx = this.targetX - this.fighter.x;
    const dy = this.targetY - this.fighter.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0) {
      const dist = Math.sqrt(distSq);
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
    this.shieldVisualOffset = -Math.PI / 2;
    this.shieldHoldTimer = 0;
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
    this.shieldVisualOffset = -Math.PI / 2;
    this.shieldHoldTimer = 0;
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
        this.shieldHoldTimer = CONFIG.knight.shieldHoldFrames || 60;
        this.shieldHealth--;
        // Play shield block sound
        const blockSound = getSkillSound(this._def?.id, 'shieldblock');
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
        }
        return false; // absorbed the hit
      }
    }
    return super.takeDamage(amount, attacker, opts);
  }

  // â”€â”€ Sword swipe â”€â”€
  _trySwordSwipe(opponent, ownerIndex) {
    if (!opponent || this.swipeCooldown > 0 || this.swordBroken) return;
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const maxDist = this.r + opponent.r + CONFIG.knight.swordRange;
    if ((dx * dx + dy * dy) > maxDist * maxDist) return;

    // Hit!
    this.swipeAngle  = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swipeActive = true;
    this.swipeTimer  = CONFIG.knight.swipeDuration;
    this.swipeCooldown = CONFIG.knight.swipeCooldown;
    opponent.takeDamage(CONFIG.knight.swordDamage, this, { isMelee: true });
    triggerGlobalScreenShake(6, 8);
    
    // Physical hit knockback
    const kbAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    opponent.vx += Math.cos(kbAngle) * 6;
    opponent.vy += Math.sin(kbAngle) * 6;

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
      const distSq = dx * dx + dy * dy;
      const dist = distSq > 0 ? Math.sqrt(distSq) : 1;
      this.dashVx = (dx / dist) * CONFIG.knight.dashSpeed;
      this.dashVy = (dy / dist) * CONFIG.knight.dashSpeed;
    } else if (opponent) {
      const dx   = opponent.x - this.x;
      const dy   = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;
      const dist = distSq > 0 ? Math.sqrt(distSq) : 1;
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
      const dSq = dx * dx + dy * dy;
      if (dSq <= radius * radius) {
        const d = Math.sqrt(dSq) || 1;
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
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || this.speed;
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const distSq = dx * dx + dy * dy;
        const dist = distSq > 0 ? Math.sqrt(distSq) : 1;

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

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    this._tickCooldowns();
    this._tickAttackSound();
    if (this.blockFlashTimer > 0) this.blockFlashTimer--;
    if (this.shieldHoldTimer > 0) this.shieldHoldTimer--;

    // Detect incoming attacks for shield block visual
    let blocking = false;
    if (this.shieldHoldTimer > 0) {
      blocking = true;
    }
    const projectiles = getProjectiles();
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      // Exclude visual-only particles and our own projectiles
      if (p.owner !== ownerIndex && !p.isVisual && p.maxLife > 0) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const distSq = dx * dx + dy * dy;
        const projRadius = CONFIG.knight.blockProjectileDetectionRadius || 200;
        if (distSq < projRadius * projRadius) {
          // Check if moving towards us (dot product of relative position and velocity is negative)
          const dot = dx * p.vx + dy * p.vy;
          if (dot < 0) {
            blocking = true;
            break;
          }
        }
      }
    }
    
    // Also check for close opponent melee range
    if (!blocking && opponent && !opponent.isDead && opponent.hp > 0) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;
      const meleeRadius = CONFIG.knight.blockMeleeDetectionRadius || 130;
      if (distSq < meleeRadius * meleeRadius) {
        blocking = true;
      }
    }

    // Lerp shield offset
    const targetOffset = (blocking || this.isDashing() || this.isCharging()) ? 0 : -Math.PI / 2;
    this.shieldVisualOffset += (targetOffset - this.shieldVisualOffset) * 0.2;

    // Advance state machine for charging/dashing logic
    if (this.fsm) {
      this.fsm.update(1);
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
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const hitRadius = this.r + opponent.r + 4;
        if ((dx * dx + dy * dy) <= hitRadius * hitRadius) {
          opponent.takeDamage(CONFIG.knight.dashDamage, this, { isMelee: true });
          triggerGlobalScreenShake(12, 10);
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SHIELD BASH!', '#88bbff');
          // Knockback
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dSq = dx * dx + dy * dy;
          const d = dSq > 0 ? Math.sqrt(dSq) : 1;
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
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
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
      const moveSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
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

    // Track sword history for movement afterimages
    if (!this.swordTrailHistory) this.swordTrailHistory = [];
    
    let swordAngle = this.gunAngle;
    if (this.swipeActive && this.swipeTimer > 0) {
      const progress = 1 - this.swipeTimer / CONFIG.knight.swipeDuration;
      const swingTotal = Math.PI * 1.1;
      const swingStart = this.swipeAngle - swingTotal * 0.5;
      swordAngle = swingStart + progress * swingTotal;
    }
    
    // Only save history if actually moving to prevent stacking when standing still
    const moveSpeedSq = this.vx * this.vx + this.vy * this.vy;
    if (moveSpeedSq > 0.5 || this.swipeActive) {
      this.swordTrailHistory.unshift({ x: this.x, y: this.y, angle: swordAngle });
      if (this.swordTrailHistory.length > 20) this.swordTrailHistory.pop();
    } else {
      // Degrade history when standing still so trail disappears
      if (this.swordTrailHistory.length > 0) this.swordTrailHistory.pop();
    }
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

    // Draw Shield Hand (drawn under shield grip)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(ga + this.shieldVisualOffset);
    ctx.translate(this.r + 2, 0); // Shield is slightly closer
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();

    // Draw shield
    drawGrayShield(ctx, this.x, this.y, ga, this.blockFlashTimer, isDashing ? 'charging' : null, this.r, this.dashGlowFade, this.shieldVisualOffset);

    // Sword: if swiping, animate the sword arc; otherwise draw normally.
    // Hide the sword completely while it is thrown.
    let swordAngle = ga;
    let swingStart, swingTotal, progress;
    if (this.swipeActive && this.swipeTimer > 0) {
      progress = 1 - this.swipeTimer / CONFIG.knight.swipeDuration; // 0 -> 1
      swingTotal = Math.PI * 1.1; // total sweep angle for visible arc
      swingStart = this.swipeAngle - swingTotal * 0.5;
      swordAngle = swingStart + progress * swingTotal;
    }

    if (!this.swordThrown) {
      
      // --- DRAW AFTERIMAGES FROM MOVEMENT HISTORY ---
      // Disable movement trails during a swing to save massive performance (they overlap anyway)
      if (this.swordTrailHistory && this.swordTrailHistory.length > 0 && !this.swipeActive) {
          ctx.save();
          // Draw a fading trail of past sword positions, sampling further back so it visibly trails
          for (let i = 4; i < this.swordTrailHistory.length; i += 4) { 
             const past = this.swordTrailHistory[i];
             ctx.globalAlpha = 0.5 * (1 - (i / 20)); // Fades smoothly as it gets older
             ctx.globalCompositeOperation = 'screen'; 
             
             if (!this.swordBroken) {
                drawGraySword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true);
             } else {
                drawGrayBrokenSword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true);
             }
          }
          ctx.restore();
      }
      // --- DRAW AFTERIMAGES DURING SWING ---
      if (this.swipeActive && this.swipeTimer > 0) {
          ctx.save();
          // Draw 4 trailing afterimages for a cool sci-fi energy ghosting effect
          for (let i = 1; i <= 4; i++) {
             // Calculate angle slightly further back in the swing time
             const pastProgress = Math.max(0, progress - (i * 0.05)); 
             if (pastProgress > 0) {
                 const trailAngle = swingStart + pastProgress * swingTotal;
                 ctx.globalAlpha = 0.5 - (i * 0.1); // Opacity fades out trailing behind
                 
                 // 'screen' makes overlapping energy edges look brighter and more blinding
                 ctx.globalCompositeOperation = 'screen'; 
                 
                 if (!this.swordBroken) {
                    drawGraySword(ctx, this.x, this.y, trailAngle, this.r, isDashing ? 'dashing' : null, true);
                 } else {
                    drawGrayBrokenSword(ctx, this.x, this.y, trailAngle, this.r, isDashing ? 'dashing' : null, true);
                 }
             }
          }
          ctx.restore();
      }

      // Draw Main Sword
      if (!this.swordBroken) {
        drawGraySword(ctx, this.x, this.y, swordAngle, this.r, isDashing ? 'dashing' : null);
      } else {
        drawGrayBrokenSword(ctx, this.x, this.y, swordAngle, this.r, isDashing ? 'dashing' : null);
      }
      
      // Draw Sword Hand (drawn over sword hilt)
      ctx.save();
      ctx.translate(this.x, this.y);
      if (isDashing) {
        ctx.rotate(swordAngle);
        ctx.translate(this.r + 8, 16);
      } else {
        ctx.rotate(swordAngle + Math.PI / 2);
        ctx.translate(this.r + 12, 0); 
        ctx.rotate(-Math.PI / 2);
      }
      ctx.translate(-13, 0); // Move to hilt center
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.restore();
    }
  }

  draw(ctx) {
    // ——— Block expanding flash ———
    if (this.blockFlashTimer > 0) {
      const p = 1 - (this.blockFlashTimer / CONFIG.knight.blockFlashFrames);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gunAngle + this.shieldVisualOffset);
      ctx.translate(this.r + 5, 0);
      ctx.beginPath();
      ctx.arc(0, 0, 10 + p * 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 216, 255, ${0.6 * (1 - p)})`;
      ctx.fill();
      ctx.restore();
    }

      // ── Anime Vibe Swipe arc flash ──
    if ((this.swipeActive && this.swipeTimer > 0) || this.slashFadeTimer > 0) {
      let progress = 1.0;
      let fade = this.slashFadeTimer / 15;
      
      if (this.swipeActive) {
        // Anime ease-out: explosive start, slowing down near the end
        let rawProgress = 1 - (this.swipeTimer / CONFIG.knight.swipeDuration);
        progress = 1 - Math.pow(1 - rawProgress, 3);
        fade = 1.0;
      }
      
      const glowAlpha = Math.pow(fade, 0.8);
      const arcRadius = this.r + 28; // slightly larger for anime vibe
      
      // Broader swing angle for an exaggerated slash
      const swingTotal = Math.PI * 1.35;
      const localStartAngle = -swingTotal * 0.5;
      const localEndAngle = swingTotal * 0.5;
      const localCurrentEndAngle = localStartAngle + (localEndAngle - localStartAngle) * progress;
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.swipeAngle);
      
      // Use source-over because the arena is white; lighter makes it invisible
      ctx.globalAlpha = glowAlpha;
      ctx.globalCompositeOperation = 'source-over';
      
      const startX = Math.cos(localStartAngle) * arcRadius;
      const startY = Math.sin(localStartAngle) * arcRadius;
      const endX = Math.cos(localCurrentEndAngle) * arcRadius;
      const endY = Math.sin(localCurrentEndAngle) * arcRadius;
      
      const gradX = Math.abs(endX - startX) < 0.1 ? endX + 0.1 : endX;
      const gradY = Math.abs(endY - startY) < 0.1 ? endY + 0.1 : endY;

      // --- GLOWING NEON BASE SLASH ---
      // Draw a bright, smooth sci-fi glowing crescent underneath the rough pencil sketch
      ctx.save();
      ctx.beginPath();
      const neonSegments = 30;
      const neonStep = (localCurrentEndAngle - localStartAngle) / Math.max(0.01, neonSegments);
      let nFirst = true;
      for (let step = 0; step <= neonSegments; step++) {
          const a = localStartAngle + step * neonStep;
          const t = step / neonSegments;
          const taper = Math.sin(t * Math.PI);
          // The neon core has a slight outward bulge
          const r = arcRadius + (6 * taper);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (nFirst) {
              ctx.moveTo(px, py);
              nFirst = false;
          } else {
              ctx.lineTo(px, py);
          }
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Faint ambient neon aura
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff8800';
      ctx.strokeStyle = `rgba(255, 150, 0, ${0.4 * glowAlpha})`;
      ctx.lineWidth = 14;
      ctx.stroke();

      // Bright intense gold core
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#ffcc00';
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 * glowAlpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.restore();

      // --- PENCIL DRAWN SKETCHY SLASH ---
      // Draw many overlapping, smooth arcs in graphite colors to simulate multiple fast pencil strokes
      // No jagged edges, no gold colors, to avoid the 'electric' look.

      const numStrokes = 45; // Lots of scratchy pencil lines
      
      for (let i = 0; i < numStrokes; i++) {
          ctx.beginPath();
          
          // Deterministic pseudo-random values based on stroke index 'i'
          const rand1 = Math.abs(Math.sin(i * 12.9898));
          const rand2 = Math.abs(Math.sin(i * 78.233));
          const rand3 = Math.abs(Math.sin(i * 37.719));
          const rand4 = Math.abs(Math.sin(i * 91.133));

          // Slight random offset for the angle to make strokes imperfect and uneven
          const sAngle = localStartAngle + (rand1 * 0.4 - 0.2);
          const eAngle = localCurrentEndAngle + (rand2 * 0.4 - 0.1);
          
          if (sAngle >= eAngle) continue;

          // Divide the stroke into segments to create a smooth tapering curve
          const segments = 25;
          const aStep = (eAngle - sAngle) / segments;
          
          // Base spread logic for this stroke
          let rSpread = rand3;
          let spreadDist = (rSpread > 0.8 ? (rand4 * 40 - 20) : (rand4 * 16 - 8));
          
          let first = true;
          for (let step = 0; step <= segments; step++) {
              const a = sAngle + step * aStep;
              
              // Normalize angle relative to the FULL swing to create a global crescent envelope
              const t = (a - localStartAngle) / Math.max(0.01, localCurrentEndAngle - localStartAngle);
              
              // Math.sin(t * Math.PI) creates a curve that is 0 at the tips and 1 in the middle.
              // We use this to pinch all pencil strokes tightly together at the start and end.
              const taper = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
              
              // Apply the taper to the radius. Strokes spread wide in the middle and pinch sharp at the tips.
              // Power of 0.7 gives a slightly fatter belly and sharper needle-like ends.
              const r = arcRadius + (spreadDist * Math.pow(taper, 0.7));
              
              const px = Math.cos(a) * r;
              const py = Math.sin(a) * r;
              
              if (first) {
                  ctx.moveTo(px, py);
                  first = false;
              } else {
                  ctx.lineTo(px, py);
              }
          }
          
          // Graphite and Colored Pencil mixing: dark grays, blacks, and golds
          const colorRand = Math.abs(Math.sin(i * 53.111));
          const alphaBase = 0.5 + 0.5 * Math.abs(Math.sin(i * 17.111)); // Opacity variation

          if (colorRand > 0.6) {
              ctx.strokeStyle = `rgba(30, 30, 30, ${alphaBase * 0.8 * glowAlpha})`; // Standard graphite
              ctx.lineWidth = rand1 * 1.5 + 0.5;
          } else if (colorRand > 0.3) {
              ctx.strokeStyle = `rgba(180, 130, 0, ${alphaBase * 0.7 * glowAlpha})`; // Dark Gold colored pencil
              ctx.lineWidth = rand2 * 2 + 0.5;
          } else if (colorRand > 0.15) {
              ctx.strokeStyle = `rgba(255, 215, 0, ${alphaBase * 0.85 * glowAlpha})`; // Bright Gold pencil
              ctx.lineWidth = rand3 * 1.5 + 0.5;
          } else {
              ctx.strokeStyle = `rgba(10, 10, 10, ${alphaBase * 0.9 * glowAlpha})`; // Heavy black pencil press
              ctx.lineWidth = rand4 * 2.5 + 1;
          }
          
          ctx.stroke();
      }

      // --- PENCIL SPEED LINES / SCRATCHES ---
      // Short, straight graphite scratches following the curve
      const numLines = Math.floor(20 * progress);
      for(let i=0; i<numLines; i++) {
          const r1 = Math.abs(Math.sin(i * 41.111));
          const r2 = Math.abs(Math.sin(i * 61.222));
          const r3 = Math.abs(Math.sin(i * 81.333));
          
          const a = localStartAngle + r1 * (localCurrentEndAngle - localStartAngle);
          const r = arcRadius + (r2 * 26 - 13);
          
          ctx.beginPath();
          ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
          // Short scratch in the direction of the swing
          ctx.lineTo(Math.cos(a + 0.08)*r, Math.sin(a + 0.08)*r);
          
          ctx.strokeStyle = r3 > 0.3 ? `rgba(40, 40, 40, ${(0.3 + 0.7*r1) * 0.7 * glowAlpha})` : `rgba(218, 165, 32, ${(0.3 + 0.7*r2) * 0.8 * glowAlpha})`;
          ctx.lineWidth = r3 * 1.5 + 0.5;
          ctx.stroke();
      }

      ctx.restore();
    }

    // â”€â”€ Charge ring â”€â”€
    if (this.isCharging()) {
      const chargeState = this.fsm.currentState;
      const chargeFrames = CONFIG.knight.dashChargeFrames || 30;
      const progress = chargeState ? Math.min(1, chargeState.timer / chargeFrames) : 0;
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

    // ── Dash motion blur ──
    if (this.fsm.isInState('KnightDashing')) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const trailCount = 3;
      for (let i = 1; i <= trailCount; i++) {
        const tx = this.x - this.dashVx * i * 2;
        const ty = this.y - this.dashVy * i * 2;
        
        ctx.save();
        ctx.translate(tx, ty);
        // Dim the trail as it goes back
        ctx.globalAlpha = 0.6 / i;
        
        // Golden body glow
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(0, 0, this.r * (1 - i * 0.1), 0, Math.PI * 2);
        ctx.fill();
        
        // Golden charging shield arc (matches his actual shield angle)
        ctx.rotate(this.gunAngle + this.shieldVisualOffset);
        ctx.translate(this.r + 5, 0);
        ctx.beginPath();
        ctx.arc(0, 0, 22 - i * 2, -Math.PI/2.5, Math.PI/2.5);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffea75';
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.restore();
      }
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
