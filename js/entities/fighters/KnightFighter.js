import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { FighterStateMachine, FighterState } from '../../core/fighterStateMachine.js';
import { drawGrayShield, drawGraySword, drawGrayBrokenSword } from '../../graphics/weaponVisuals.js';
import { drawKnightPixelBody, drawKnightSkin } from '../../graphics/fighters/knightSkin.js';

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
    audioSystem.playSFX('skill_shieldcharge', 0.8);
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
    this.fighter.hasHitWithDash = false;
    this.fighter.dashImpactTimer = 0;
    
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
    const dashSpeed = CONFIG.knight.dashSpeed || 9.5;
    this.fighter.dashVx = this.dirX * dashSpeed;
    this.fighter.dashVy = this.dirY * dashSpeed;

    // Antimatter Shield Dash: Lock facing direction and shield prow straight forward
    const dashAngle = Math.atan2(this.fighter.dashVy, this.fighter.dashVx);
    this.fighter.gunAngle = dashAngle;
    this.fighter.angle = dashAngle;
    this.fighter.shieldVisualOffset = 0;

    // Layered Graal Antimatter push + Paladin thruster rush SFX
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_shielddash_push', 0.95);
        audioSystem.playSFX('skill_paladin_rush', 0.65);
        audioSystem.playSFX('skill_dash1', 0.60);
      }
    } catch (e) {}
  }

  update(dt) {
    this.timer++;
    
    // Keep shield locked facing forward along travel vector
    if (Math.hypot(this.fighter.dashVx, this.fighter.dashVy) > 0.1) {
      const dashAngle = Math.atan2(this.fighter.dashVy, this.fighter.dashVx);
      this.fighter.gunAngle = dashAngle;
      this.fighter.angle = dashAngle;
      this.fighter.shieldVisualOffset = 0;
    }

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
    
    // ── Chemical Katana 2-Hit Combo & 5-Phase State Tracking ──
    this.swordComboStep  = 1; // 1 = Horizontal Cross Cleave, 2 = Upward Rising Cleave
    this.comboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax   = 0;
    this.swordSwingLiftFrames = 7;
    this.swordSwingHoldFrames = 2;
    this.swordSwingStrikeFrames = 5;
    this.swordSwingImpactLockFrames = 6;
    this.swordSwingRecFrames = 10;
    this.swordSwingDamage = 28;
    this.swordSwingKnockback = 6.0;
    this.swordSwingLunge = 6.5;
    this.swordSwingHitPause = 3;
    this.swordSwingHitStun = 10;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordSlashAngle = 0;
    this.swordTremorX    = 0;
    this.swordTremorY    = 0;

    // Dash properties (used by FSM states)
    this.dashTargetX     = null;
    this.dashTargetY     = null;
    this.hasHitWithDash  = false;
    this.dashVx          = 0;
    this.dashVy          = 0;
    this.dashImpactTimer = 0;
    this.dashImpactX     = 0;
    this.dashImpactY     = 0;
    
    // Visual properties
    this.slashFadeTimer  = 0;
    this.dashGlowFade    = 0;
    this.shieldVisualOffset = 0; // Right side resting stance
    this.shieldHoldTimer = 0;
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Knight uses melee plasma sword combos and shield abilities.
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

    // Reset combo state
    this.swordComboStep  = 1;
    this.comboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax   = 0;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordTremorX    = 0;
    this.swordTremorY    = 0;

    this.dashTargetX     = null;
    this.dashTargetY     = null;
    this.hasHitWithDash  = false;
    this.dashVx          = 0;
    this.dashVy          = 0;
    this.dashImpactTimer = 0;
    this.dashImpactX     = 0;
    this.dashImpactY     = 0;
    this.slashFadeTimer  = 0;
    this.dashGlowFade    = 0;
    this.shieldVisualOffset = 0; // Right side resting stance
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
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassShield || opts.bypassEvade || opts.isGuaranteedHit));
    // Shield blocks direct projectile hits and melee attacks (not while dashing).
    // Some projectile hits pass opts.isProjectile, others provide opts.projectile.
    const isBlockableHit = !!(opts.isProjectile || opts.projectile || opts.isMelee) && !isGuaranteedHit;
    if (isBlockableHit && this.fsm.isInState('KnightIdle') && !(this.timeStopTimer > 0)) {
      if (Math.random() < CONFIG.knight.shieldBlockChance) {
        // Shield absorbs this hit; reduce shield health and possibly break
        this.blockFlashTimer = CONFIG.knight.blockFlashFrames;
        this.shieldHoldTimer = CONFIG.knight.shieldHoldFrames || 60;
        this.shieldHealth--;
        // Play shield block sound
        const blockSound = getSkillSound(this._def?.id, 'shieldblock');
        if (blockSound) audioSystem.playSFX(blockSound.src, blockSound.volume);
        if (this.shieldHealth <= 0 && !this.shieldBroken) {
          this.shieldBroken = true;
          this.canThrowSword = true; // allow sword throw
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

  // ── Sword Combo Swipe (Chemical Katana 2-Hit Motion & Rule 30 5-Phase Architecture) ──
  _trySwordSwipe(opponent, ownerIndex) {
    if (!opponent || opponent.isDead || this.swipeCooldown > 0 || this.swordBroken || this.isCaughtInBeam() || this.swordSwingTimer > 0) return;
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const maxDist = this.r + opponent.r + (CONFIG.knight.swordRange || 42);
    if ((dx * dx + dy * dy) > maxDist * maxDist) return;

    // Advance combo step (Hit 1 -> Hit 2)
    if (this.comboResetTimer <= 0) {
      this.swordComboStep = 1;
    } else {
      this.swordComboStep = (this.swordComboStep === 1) ? 2 : 1;
    }

    const cfg = CONFIG.knight || {};
    let liftF, holdF, strikeF, pinF, recF, dmg, kb, lunge, hitPause, hitStun;

    if (this.swordComboStep === 1) {
      liftF = cfg.hit1LiftFrames ?? 7;
      holdF = cfg.hit1HoldFrames ?? 2;
      strikeF = cfg.hit1StrikeFrames ?? 5;
      pinF = cfg.hit1ImpactLockFrames ?? 6;
      recF = cfg.hit1RecoveryFrames ?? 10;
      dmg = cfg.hit1Damage ?? 28;
      kb = cfg.hit1Knockback ?? 6.0;
      lunge = cfg.hit1LungeSpeed ?? 6.5;
      hitPause = cfg.hit1HitPauseFrames ?? 3;
      hitStun = cfg.hit1HitStunFrames ?? 10;
    } else {
      liftF = cfg.hit2LiftFrames ?? 6;
      holdF = cfg.hit2HoldFrames ?? 2;
      strikeF = cfg.hit2StrikeFrames ?? 5;
      pinF = cfg.hit2ImpactLockFrames ?? 7;
      recF = cfg.hit2RecoveryFrames ?? 12;
      dmg = cfg.hit2Damage ?? 34;
      kb = cfg.hit2Knockback ?? 8.5;
      lunge = cfg.hit2LungeSpeed ?? 7.2;
      hitPause = cfg.hit2HitPauseFrames ?? 3;
      hitStun = cfg.hit2HitStunFrames ?? 14;
    }

    const totalFrames = liftF + holdF + strikeF + pinF + recF;
    this.swordSwingTimer = totalFrames;
    this.swordSwingMax = totalFrames;
    this.swordSwingLiftFrames = liftF;
    this.swordSwingHoldFrames = holdF;
    this.swordSwingStrikeFrames = strikeF;
    this.swordSwingImpactLockFrames = pinF;
    this.swordSwingRecFrames = recF;
    this.swordSwingDamage = dmg;
    this.swordSwingKnockback = kb;
    this.swordSwingLunge = lunge;
    this.swordSwingHitPause = hitPause;
    this.swordSwingHitStun = hitStun;

    this.swipeActive = true;
    this.swipeTimer = totalFrames;
    this.swipeAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSlashAngle = this.swipeAngle;
    this.comboResetTimer = cfg.comboResetFrames ?? 90;
    this.swipeCooldown = totalFrames + (cfg.swipeCooldown ?? 38);
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordTremorX = 0;
    this.swordTremorY = 0;

    // Anticipation flutter sound
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.40);
      }
    } catch (e) {}
  }

  /**
   * Updates 5-phase melee combo lifecycle, forward lunge physics, impact lock, and layered slap audio.
   */
  _updateSwordSwing(opponent, arena) {
    if (this.swordSwingTimer <= 0) return;

    const totalF = this.swordSwingMax || 30;
    const elapsed = totalF - this.swordSwingTimer;
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = liftF + holdF + strikeF;
    const pinEnd = liftF + holdF + strikeF + pinF;

    if (elapsed < strikeStart) {
      // Phase 1 & 2: Anticipation Coil & Poised Hold
      if (opponent && !opponent.isDead) {
        this.swordSlashAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        this.swipeAngle = this.swordSlashAngle;
      }
      this.vx *= 0.88;
      this.vy *= 0.88;
    } else if (elapsed < strikeEnd) {
      // Phase 3: Hypersonic Whip Strike Window
      const strikeElapsed = elapsed - strikeStart;
      const strikeP = strikeElapsed / Math.max(1, strikeF);

      if (!this.swordSwingSoundPlayed) {
        this.swordSwingSoundPlayed = true;
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('attack_swordswing', 0.95);
          }
        } catch (e) {}
      }

      // Forward lunging momentum impulse
      const lungeP = Math.sin(strikeP * Math.PI);
      this.vx = Math.cos(this.swordSlashAngle) * this.swordSwingLunge * lungeP;
      this.vy = Math.sin(this.swordSlashAngle) * this.swordSwingLunge * lungeP;

      // Deliver impact at mid-strike (strikeP >= 0.50)
      if (strikeP >= 0.50 && !this.swordHitDelivered && opponent && !opponent.isDead) {
        this.swordHitDelivered = true;
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const maxDist = this.r + opponent.r + (CONFIG.knight.swordRange || 42);
        if ((dx * dx + dy * dy) <= (maxDist * 1.35) * (maxDist * 1.35)) {
          opponent.takeDamage(this.swordSwingDamage, this, { isMelee: true });

          // Rule 30: Layered fleshy slap audio
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('attack_fleshhit', 1.0);
              audioSystem.playSFX('sukuna_slice', 0.90);
            }
          } catch (e) {}

          triggerGlobalScreenShake(this.swordComboStep === 2 ? 8 : 6, 8);

          // Physical knockback
          const kbAngle = this.swordSlashAngle;
          opponent.vx += Math.cos(kbAngle) * this.swordSwingKnockback;
          opponent.vy += Math.sin(kbAngle) * this.swordSwingKnockback;
          if (this.swordComboStep === 2) {
            opponent.vy -= 2.5; // rising uppercut loft
          }

          // Hit pause & stun
          if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(this.swordSwingHitPause);
          if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(this.swordSwingHitStun);

          // Reduce durability & trigger break on 0
          this.swordHealth--;
          if (this.swordHealth <= 0) {
            this._breakSword(opponent);
          }
        }
      }
    } else if (elapsed < pinEnd) {
      // Phase 4: THE IMPACT LOCK / LATCH (Rule 30)
      // Zero forward velocity clamp
      this.vx = 0;
      this.vy = 0;
      // Mechanical tremor against impact resistance
      this.swordTremorX = (Math.random() - 0.5) * 2.2;
      this.swordTremorY = (Math.random() - 0.5) * 2.2;
    } else {
      // Phase 5: Extraction & Recovery Settle
      this.swordTremorX = 0;
      this.swordTremorY = 0;
    }

    this.swordSwingTimer--;
    this.swipeTimer = this.swordSwingTimer;
    if (this.swordSwingTimer <= 0) {
      this.swipeActive = false;
      this.slashFadeTimer = 15;
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
    if (!opponent || this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
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

  // ── Aiming ──
  applyAim(opponent, targetAngle) {
    if (opponent) {
      super.applyAim(opponent, targetAngle);
    } else if (Math.hypot(this.vx, this.vy) > 0.1) {
      this.gunAngle = Math.atan2(this.vy, this.vx);
      this.angle = this.gunAngle;
    }
  }

  aimAt(tx, ty) {
    if (typeof tx !== 'number' || typeof ty !== 'number') return;
    this.gunAngle = Math.atan2(ty - this.y, tx - this.x);
  }

  // â”€â”€ Main update â”€â”€
  update(opponent, ownerIndex, arena) {
    this.handleStatusEffects();

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

    // Lerp shield offset (rests on right flank at offset 0)
    const targetOffset = 0;
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

    // — DASHING phase: fly toward locked target (Antimatter Shield Dash) —
    if (this.fsm.isInState('KnightDashing')) {
      // Antimatter Shield Dash: Shield and facing angle locked forward as an impenetrable prow
      const dashAngle = Math.atan2(this.dashVy, this.dashVx);
      this.gunAngle = dashAngle;
      this.angle = dashAngle;
      this.shieldVisualOffset = 0;

      if (!this.hasHitWithDash && opponent && !opponent.isDead && opponent.hp > 0) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const hitRadius = this.r + opponent.r + 6;
        if ((dx * dx + dy * dy) <= hitRadius * hitRadius) {
          opponent.takeDamage(CONFIG.knight.dashDamage || 35, this, { isMelee: true });

          // Rule 30 concussive impact audio layering
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('attack_heavypunch1', 1.0);
              audioSystem.playSFX('attack_fleshhit', 0.95);
              audioSystem.playSFX('attack_groundsmash', 0.65);
            }
          } catch (e) {}

          triggerGlobalScreenShake(14, 12);

          // Hit pause & stasis
          if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(5);
          if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(16);

          // Concussive knockback impulse
          const d = Math.hypot(dx, dy) || 1;
          const kb = CONFIG.knight.dashKnockback || 10.5;
          opponent.vx = (dx / d) * kb;
          opponent.vy = (dy / d) * kb;

          // Impact brake / inertia transfer to simulated collision
          this.dashVx *= 0.25;
          this.dashVy *= 0.25;
          this.hasHitWithDash = true;

          // Record collision contact point for Rule 26 compression rings
          this.dashImpactX = opponent.x - (dx / d) * opponent.r;
          this.dashImpactY = opponent.y - (dy / d) * opponent.r;
          this.dashImpactTimer = 14;
        }
      }
      return;
    }

    // Normal movement / Deceleration
    this.applyMovementPhysics();
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    // Cooldown and combo timer ticks
    if (this.comboResetTimer > 0) this.comboResetTimer--;
    if (this.swipeCooldown > 0) this.swipeCooldown--;
    if (this.dashImpactTimer > 0) this.dashImpactTimer--;

    // Update 5-phase sword combo swing
    if (this.swipeActive) {
      this._updateSwordSwing(opponent, arena);
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
    // Try auto-swipe combo
    this._trySwordSwipe(opponent, ownerIndex);

    // Track sword history for movement afterimages
    if (!this.swordTrailHistory) this.swordTrailHistory = [];
    
    const swordAngle = this._getSwordSwingAngle();
    
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

  /**
   * Computes exact sword blade angle based on 5-phase Chemical Katana combo lifecycle.
   */
  _getSwordSwingAngle() {
    if (!this.swipeActive || this.swordSwingTimer <= 0) {
      return this.gunAngle || 0;
    }

    const totalF = this.swordSwingMax || 30;
    const elapsed = Math.max(0, totalF - this.swordSwingTimer);
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    const baseAngle = this.swordSlashAngle || this.swipeAngle || this.gunAngle || 0;
    const isHit2 = (this.swordComboStep === 2);
    const swingTotal = Math.PI * (isHit2 ? 1.40 : 1.30);

    if (isHit2) {
      // Hit 2: Upward Rising Cleave (Chemical Katana Attack 2)
      // Swings from low right (+swingTotal * 0.55) diagonally up to high left (-swingTotal * 0.55)
      const startAngle = baseAngle + swingTotal * 0.55;
      const endAngle = baseAngle - swingTotal * 0.55;

      if (elapsed < liftF) {
        // Phase 1: Lift / Scoop
        const p = elapsed / Math.max(1, liftF);
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        // Phase 2: Poised Hold
        return startAngle;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        // Phase 4: Impact Lock (latched at apex)
        return endAngle;
      } else {
        // Phase 5: Recovery Settle
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const ease = Math.pow(1 - rp, 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    } else {
      // Hit 1: Horizontal Cross Cleave (Chemical Katana Attack 1)
      // Swings from left shoulder (-swingTotal * 0.5) forward across to right (+swingTotal * 0.5)
      const startAngle = baseAngle - swingTotal * 0.5;
      const endAngle = baseAngle + swingTotal * 0.5;

      if (elapsed < liftF) {
        // Phase 1: Lift / Coil
        const p = elapsed / Math.max(1, liftF);
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        // Phase 2: Poised Hold
        return startAngle;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        // Phase 4: Impact Lock (latched in plane)
        return endAngle;
      } else {
        // Phase 5: Recovery Settle
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const ease = Math.pow(1 - rp, 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    }
  }

  // â”€â”€ Drawing â”€â”€
  drawOutline(ctx) {
    super.drawOutline(ctx);

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
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    const ga = this.gunAngle;
    const isDashingState = this.fsm.isInState('KnightDashing');
    const isChargingState = this.fsm.isInState('KnightCharging');
    const isDashing = isDashingState || isChargingState;
    const shieldState = isDashingState ? 'dashing' : (isChargingState ? 'charging' : null);
    const shieldOffset = isDashing ? 0 : this.shieldVisualOffset;
    const shieldGlow = isDashing ? 1.0 : this.dashGlowFade;

    // Draw Shield Hand (drawn under shield grip on the right flank)
    ctx.save();
    ctx.translate(this.x, this.y);
    const facingLeft = Math.abs(ga) > Math.PI / 2;
    ctx.rotate(ga + shieldOffset);
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    ctx.translate(this.r + 4, 0); // Shield is on the right side
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();

    // Draw shield on the right flank
    drawGrayShield(ctx, this.x, this.y, ga, this.blockFlashTimer, shieldState, this.r, shieldGlow, shieldOffset);

    // Sword: if swiping, animate using 5-phase Chemical Katana combo angle; otherwise aim angle.
    // Hide the sword completely while it is thrown.
    const swordAngle = this._getSwordSwingAngle();
    const isSwinging = Boolean(this.swipeActive && this.swordSwingTimer > 0);

    if (!this.swordThrown) {
      // --- DRAW AFTERIMAGES FROM MOVEMENT OR SWING HISTORY ---
      if (this.swordTrailHistory && this.swordTrailHistory.length > 0) {
        ctx.save();
        if (isSwinging) {
          // Dynamic energy motion blur trailing directly from recorded sword positions
          for (let i = 1; i <= Math.min(4, this.swordTrailHistory.length - 1); i++) {
            const past = this.swordTrailHistory[i];
            ctx.globalAlpha = 0.45 * (1 - i / 5);
            ctx.globalCompositeOperation = 'screen';
            if (!this.swordBroken) {
              drawGraySword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true, true);
            } else {
              drawGrayBrokenSword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true, true);
            }
          }
        } else {
          for (let i = 4; i < this.swordTrailHistory.length; i += 4) {
            const past = this.swordTrailHistory[i];
            ctx.globalAlpha = 0.5 * (1 - (i / 20));
            ctx.globalCompositeOperation = 'screen';
            if (!this.swordBroken) {
              drawGraySword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true, false);
            } else {
              drawGrayBrokenSword(ctx, past.x, past.y, past.angle, this.r, isDashing ? 'dashing' : null, true, false);
            }
          }
        }
        ctx.restore();
      }

      // Apply tremor jitter during Impact Lock (Rule 30)
      const tx = (this.swipeActive && this.swordTremorX) ? this.swordTremorX : 0;
      const ty = (this.swipeActive && this.swordTremorY) ? this.swordTremorY : 0;

      // Draw Main Sword (on the left side in idle, lunging forward when swinging)
      if (!this.swordBroken) {
        drawGraySword(ctx, this.x + tx, this.y + ty, swordAngle, this.r, isDashing ? 'dashing' : null, false, isSwinging);
      } else {
        drawGrayBrokenSword(ctx, this.x + tx, this.y + ty, swordAngle, this.r, isDashing ? 'dashing' : null, false, isSwinging);
      }
      
      // Draw Sword Hand (drawn over sword hilt on the left flank)
      ctx.save();
      ctx.translate(this.x + tx, this.y + ty);
      const facingLeftSword = Math.abs(swordAngle) > Math.PI / 2;
      ctx.rotate(swordAngle);
      if (facingLeftSword) {
        ctx.scale(1, -1);
      }
      if (isDashing) {
        ctx.translate(this.r + 8, 16);
        ctx.translate(-13, 0);
      } else if (isSwinging) {
        ctx.translate(this.r + 14, 0);
        ctx.translate(-13, 0);
      } else {
        // Upright ready guard: hand holding sword hilt upright along left hip
        ctx.translate(-(this.r + 10), 4);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-13, 0); // Move to hilt center
      }
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

      // ── Anime Vibe 5-Phase Melee Slash Ribbon (Chemical Katana Combo) ──
    if (this.swipeActive && this.swordSwingTimer > 0) {
      const totalF = this.swordSwingMax || 30;
      const elapsed = Math.max(0, totalF - this.swordSwingTimer);
      const liftF = this.swordSwingLiftFrames || 7;
      const holdF = this.swordSwingHoldFrames || 2;
      const strikeF = this.swordSwingStrikeFrames || 5;
      const pinF = this.swordSwingImpactLockFrames || 6;
      const recF = this.swordSwingRecFrames || 10;

      const strikeStart = liftF + holdF;
      const strikeEnd = strikeStart + strikeF;
      const pinEnd = strikeEnd + pinF;

      // Render slash ribbon starting from strike phase (Phases 3, 4, 5)
      if (elapsed >= strikeStart) {
        const isHit2 = (this.swordComboStep === 2);
        const swingTotal = Math.PI * (isHit2 ? 1.40 : 1.30);
        const baseAngle = this.swordSlashAngle || this.swipeAngle || this.gunAngle || 0;

        // Reach calibration matching drawSwordBase blade geometry:
        // Crossguard hilt begins at this.r + 14 (39px), blade tip kissaki reaches this.r + 84 (109px)
        const innerR = this.r + 14;
        const outerR = this.r + 88;
        const arcRadius = this.r + 76;

        // Hit 1: Left across to Right (-swingTotal * 0.5 -> +swingTotal * 0.5)
        // Hit 2: Low Right diagonally up to High Left (+swingTotal * 0.55 -> -swingTotal * 0.55)
        const localStart = isHit2 ? (swingTotal * 0.55) : (-swingTotal * 0.5);
        const localEnd = isHit2 ? (-swingTotal * 0.55) : (swingTotal * 0.5);

        // Synchronize leading arc edge 1:1 with sword blade position (Chemical Katana Standard)
        const currentSwordAngle = this._getSwordSwingAngle();
        const swordLocalAngle = currentSwordAngle - baseAngle;

        let currentStartAngle = localStart;
        let currentEndAngle = localEnd;
        let recP = 0;

        if (elapsed < strikeEnd) {
          // Phase 3: Whip Strike expansion — leading tip is 100% locked to the sword blade kissaki!
          currentStartAngle = localStart;
          currentEndAngle = swordLocalAngle;
          recP = 0;
        } else if (elapsed < pinEnd) {
          // Phase 4: Impact Lock (100% full hold, Rule 30)
          currentStartAngle = localStart;
          currentEndAngle = localEnd;
          recP = 0;
        } else {
          // Phase 5: Dynamic Tail-to-Tip Eraser Wipe (Rule 15 & 30)
          const rp = (elapsed - pinEnd) / Math.max(1, recF);
          recP = Math.pow(rp, 1.4);
          currentStartAngle = localStart + (localEnd - localStart) * recP;
          currentEndAngle = localEnd;
        }

        const angularSpan = Math.abs(currentEndAngle - currentStartAngle);

        if (angularSpan > 0.04) {
          const fade = Math.max(0, 1.0 - recP * 0.85);
          const glowAlpha = fade;

          const tx = (this.swipeActive && this.swordTremorX) ? this.swordTremorX : 0;
          const ty = (this.swipeActive && this.swordTremorY) ? this.swordTremorY : 0;

          ctx.save();
          ctx.translate(this.x + tx, this.y + ty);
          ctx.rotate(baseAngle);

          // 1. Radiant Annular Sector Ribbon
          const segCount = 28;
          const stepAngle = (currentEndAngle - currentStartAngle) / segCount;

          ctx.beginPath();
          // Outer arc
          for (let s = 0; s <= segCount; s++) {
            const a = currentStartAngle + s * stepAngle;
            const t = s / segCount;
            const bulge = Math.sin(t * Math.PI) * 4;
            const px = Math.cos(a) * (outerR + bulge);
            const py = Math.sin(a) * (outerR + bulge);
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          // Inner arc back
          for (let s = segCount; s >= 0; s--) {
            const a = currentStartAngle + s * stepAngle;
            const px = Math.cos(a) * innerR;
            const py = Math.sin(a) * innerR;
            ctx.lineTo(px, py);
          }
          ctx.closePath();

          // Gold/orange energy wash
          ctx.fillStyle = isHit2
            ? `rgba(255, 140, 20, ${0.40 * glowAlpha})`
            : `rgba(255, 195, 30, ${0.36 * glowAlpha})`;
          ctx.fill();

          // 2. Razor Core Glow Rim
          ctx.beginPath();
          for (let s = 0; s <= segCount; s++) {
            const a = currentStartAngle + s * stepAngle;
            const px = Math.cos(a) * (arcRadius + 2);
            const py = Math.sin(a) * (arcRadius + 2);
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `rgba(255, 255, 230, ${0.85 * glowAlpha})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // 3. Signature Rough Pencil Sketch lines (Knight anime aesthetic)
          const numStrokes = 32;
          for (let i = 0; i < numStrokes; i++) {
            ctx.beginPath();
            const rand1 = Math.abs(Math.sin(i * 12.9898));
            const rand2 = Math.abs(Math.sin(i * 78.233));
            const rand3 = Math.abs(Math.sin(i * 37.719));
            const rand4 = Math.abs(Math.sin(i * 91.133));

            const sOffset = (rand1 * 0.16 - 0.08) * (currentEndAngle - currentStartAngle);
            const eOffset = (rand2 * 0.16 - 0.08) * (currentEndAngle - currentStartAngle);
            const sAngle = currentStartAngle + sOffset;
            const eAngle = currentEndAngle + eOffset;

            const strokeSegs = 18;
            const strokeStep = (eAngle - sAngle) / strokeSegs;
            const spreadDist = rand3 > 0.75 ? (rand4 * 28 - 14) : (rand4 * 12 - 6);

            let firstPt = true;
            for (let step = 0; step <= strokeSegs; step++) {
              const a = sAngle + step * strokeStep;
              const t = step / strokeSegs;
              const taper = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
              const r = arcRadius + (spreadDist * Math.pow(taper, 0.7));
              const px = Math.cos(a) * r;
              const py = Math.sin(a) * r;
              if (firstPt) {
                ctx.moveTo(px, py);
                firstPt = false;
              } else {
                ctx.lineTo(px, py);
              }
            }

            const colorRand = Math.abs(Math.sin(i * 53.111));
            const alphaBase = 0.5 + 0.5 * Math.abs(Math.sin(i * 17.111));
            if (colorRand > 0.6) {
              ctx.strokeStyle = `rgba(30, 30, 30, ${alphaBase * 0.8 * glowAlpha})`;
              ctx.lineWidth = rand1 * 1.5 + 0.5;
            } else if (colorRand > 0.3) {
              ctx.strokeStyle = `rgba(180, 130, 0, ${alphaBase * 0.7 * glowAlpha})`;
              ctx.lineWidth = rand2 * 2 + 0.5;
            } else if (colorRand > 0.15) {
              ctx.strokeStyle = `rgba(255, 215, 0, ${alphaBase * 0.85 * glowAlpha})`;
              ctx.lineWidth = rand3 * 1.5 + 0.5;
            } else {
              ctx.strokeStyle = `rgba(10, 10, 10, ${alphaBase * 0.9 * glowAlpha})`;
              ctx.lineWidth = rand4 * 2.5 + 1;
            }
            ctx.stroke();
          }

          // 4. Pencil speed lines / scratches
          const numLines = Math.floor(16 * Math.min(1, angularSpan / (swingTotal * 0.5)));
          for (let i = 0; i < numLines; i++) {
            const r1 = Math.abs(Math.sin(i * 41.111));
            const r2 = Math.abs(Math.sin(i * 61.222));
            const r3 = Math.abs(Math.sin(i * 81.333));

            const a = currentStartAngle + r1 * (currentEndAngle - currentStartAngle);
            const r = arcRadius + (r2 * 26 - 13);

            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            const dir = (currentEndAngle >= currentStartAngle) ? 0.08 : -0.08;
            ctx.lineTo(Math.cos(a + dir) * r, Math.sin(a + dir) * r);

            ctx.strokeStyle = r3 > 0.3
              ? `rgba(40, 40, 40, ${(0.3 + 0.7 * r1) * 0.7 * glowAlpha})`
              : `rgba(218, 165, 32, ${(0.3 + 0.7 * r2) * 0.8 * glowAlpha})`;
            ctx.lineWidth = r3 * 1.5 + 0.5;
            ctx.stroke();
          }

          // 5. Phase 4: Impact Lock Sparks & Compression Ring (Rule 26 & 30)
          if (elapsed >= strikeEnd && elapsed < pinEnd) {
            const tipAngle = localEnd;
            const tipDist = this.r + 84; // Blade tip kissaki
            const tipX = Math.cos(tipAngle) * tipDist;
            const tipY = Math.sin(tipAngle) * tipDist;
            const pinProgress = (elapsed - strikeEnd) / Math.max(1, pinF);

            // Supersonic compression ring expanding from impact point (Rule 26)
            const ringR = 8 + pinProgress * 18;
            const ringAlpha = Math.max(0, 1 - pinProgress);
            ctx.beginPath();
            ctx.arc(tipX, tipY, ringR, 0, Math.PI * 2);
            ctx.lineWidth = 2.0;
            ctx.strokeStyle = `rgba(255, 240, 180, ${0.75 * ringAlpha})`;
            ctx.stroke();

            // Discrete spark dots (Rule 26 compliant)
            for (let spk = 0; spk < 6; spk++) {
              const spkAngle = (spk / 6) * Math.PI * 2 + pinProgress * 1.2;
              const spkDist = 6 + pinProgress * 16 + (spk % 3) * 3;
              const sx = tipX + Math.cos(spkAngle) * spkDist;
              const sy = tipY + Math.sin(spkAngle) * spkDist;
              ctx.fillStyle = spk % 2 === 0 ? '#ffffff' : '#ffcc00';
              ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
            }
          }

          ctx.restore();
        }
      }
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

    // ── Antimatter Shield Dash Thrusters, Prow Aura, Speed Lines & Collision Shockwaves ──
    if (this.fsm.isInState('KnightDashing')) {
      const dashAngle = Math.atan2(this.dashVy, this.dashVx);
      const cosA = Math.cos(dashAngle);
      const sinA = Math.sin(dashAngle);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      // 1. Rule 16: Manga Aerodynamic Speed Lines (4-point filled needle polygons trailing behind)
      const numSpeedLines = 14;
      for (let i = 0; i < numSpeedLines; i++) {
        const lateralDist = ((i / (numSpeedLines - 1)) - 0.5) * (this.r * 2.2);
        const perpX = -sinA * lateralDist;
        const perpY = cosA * lateralDist;
        const trailOffset = 18 + ((i * 17) % 24);
        const needleLen = 34 + ((i * 29) % 36);
        const thick = 1.4 + ((i * 13) % 1.6);

        // Trailing tail tip
        const startX = this.x - cosA * (trailOffset + needleLen) + perpX;
        const startY = this.y - sinA * (trailOffset + needleLen) + perpY;
        // Leading sharp tip
        const endX = this.x - cosA * trailOffset + perpX;
        const endY = this.y - sinA * trailOffset + perpY;

        // Mid shoulders
        const midX = (startX + endX) * 0.5;
        const midY = (startY + endY) * 0.5;
        const midPerpX = -sinA * (thick * 0.5);
        const midPerpY = cosA * (thick * 0.5);

        ctx.fillStyle = (i % 3 === 0)
          ? 'rgba(255, 255, 255, 0.85)'
          : (i % 3 === 1 ? 'rgba(255, 220, 100, 0.75)' : 'rgba(255, 170, 0, 0.55)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX + midPerpX, midY + midPerpY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(midX - midPerpX, midY - midPerpY);
        ctx.closePath();
        ctx.fill();
      }

      // 2. Kinetic Shield Prow Aura (Arc in front of the forward locked shield)
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(dashAngle);

      // Translucent forward pressure wave
      ctx.beginPath();
      ctx.arc(this.r + 14, 0, 24, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(255, 180, 0, 0.35)';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Sharp white/gold plasma ram core
      ctx.beginPath();
      ctx.arc(this.r + 15, 0, 25, -Math.PI * 0.36, Math.PI * 0.36);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 3. Trailing Afterimages
      const trailCount = 3;
      for (let i = 1; i <= trailCount; i++) {
        const tx = this.x - this.dashVx * i * 1.8;
        const ty = this.y - this.dashVy * i * 1.8;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.globalAlpha = 0.50 / i;

        // Golden body shadow
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, this.r * (1 - i * 0.1), 0, Math.PI * 2);
        ctx.fill();

        // Forward shield shadow
        ctx.rotate(dashAngle);
        ctx.translate(this.r + 12, 0);
        ctx.beginPath();
        ctx.arc(0, 0, 20 - i * 2, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffe075';
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    }

    // ── Rule 26 Concentric Compression Rings & Sparks on Shield Dash Impact ──
    if (this.dashImpactTimer > 0) {
      const ip = 1 - (this.dashImpactTimer / 14);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      // Wave 1: Supersonic outer compression ring
      const r1 = 10 + Math.pow(ip, 0.7) * 42;
      ctx.beginPath();
      ctx.arc(this.dashImpactX, this.dashImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 3.0 * (1 - ip);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * ringAlpha})`;
      ctx.stroke();

      // Wave 2: Staggered secondary gold ionization ring
      if (ip > 0.12) {
        const ip2 = (ip - 0.12) / 0.88;
        const r2 = 6 + Math.pow(ip2, 0.7) * 28;
        ctx.beginPath();
        ctx.arc(this.dashImpactX, this.dashImpactY, r2, 0, Math.PI * 2);
        ctx.lineWidth = 2.0 * (1 - ip2);
        ctx.strokeStyle = `rgba(255, 200, 30, ${0.75 * (1 - ip2)})`;
        ctx.stroke();
      }

      // Discrete spark dots (Rule 26: discrete squares/dots, zero radial spokes!)
      for (let s = 0; s < 8; s++) {
        const sparkA = (s / 8) * Math.PI * 2 + ip * 1.5;
        const sparkDist = 8 + ip * 30 + ((s % 3) * 4);
        const sx = this.dashImpactX + Math.cos(sparkA) * sparkDist;
        const sy = this.dashImpactY + Math.sin(sparkA) * sparkDist;
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#ffcc00';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

    super.draw(ctx);
  }

  drawSkin(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = this._isWinnerReveal ? 0 : (this.gunAngle || this.angle || 0);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }

    drawKnightPixelBody(ctx, this.r, false);
    this.drawStatusOverlays(ctx, this.r);
    ctx.restore();
  }

  drawBody(ctx) {
    this.drawSkin(ctx);
  }
}
