import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, getProjectiles, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { FighterStateMachine, FighterState } from '../../core/fighterStateMachine.js';
import { drawGrayShield, drawGraySword, drawGrayBrokenSword } from '../../graphics/weaponVisuals.js';
import { drawKnightPixelBody, drawKnightSkin, _drawKnightHair } from '../../graphics/fighters/knightSkin.js';

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

// ─────────────────────────────────────────────
// KNIGHT FIGHTER CLASS
// ─────────────────────────────────────────────

export class KnightFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Initialize FSM in idle state
    this.fsm = new FighterStateMachine(this);
    this.fsm.addState('KnightIdle', KnightIdleState);
    this.fsm.setState('KnightIdle');
    
    // Sword/swipe properties
    this.swipeCooldown   = 0;
    this.swipeActive     = false;
    this.swipeTimer      = 0;
    this.swipeAngle      = 0;
    this.blockFlashTimer = 0;
    
    // ── Chemical Katana 2-Hit Combo & 5-Phase State Tracking (Basic Attack) ──
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
    this.swordSwingHitPause = 7;
    this.swordSwingHitStun = 10;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordSlashAngle = 0;
    this.swordSwingTarget = null;
    this.swordTremorX    = 0;
    this.swordTremorY    = 0;
    
    // ── Hit-Pause Mechanics (Sword Impact Freeze & Shield Deflection Freeze) ──
    this.swordHitPauseTimer = 0;
    this.swordHitPauseMax = 0;
    this.swordHitPauseTargets = [];
    this.swordHitPauseAngle = 0;
    this.swordImpactTimer = 0;
    this.swordImpactX = 0;
    this.swordImpactY = 0;

    this.blockHitPauseTimer = 0;
    this.blockHitPauseMax = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    this.shieldImpactTimer = 0;
    this.shieldImpactX = 0;
    this.shieldImpactY = 0;

    // Visual properties
    this.slashFadeTimer  = 0;
    this.shieldVisualOffset = 0; // Right side resting stance
    this.shieldHoldTimer = 0;

    // Compatibility properties
    this.swordBroken     = false;
    this.shieldBroken    = false;
    this.swordThrown     = false;
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Knight uses melee sword combos and shield defense.
  }

  reset() {
    super.reset();
    
    if (this.fsm) {
      this.fsm.setState('KnightIdle');
    }
    
    this.swipeCooldown   = 0;
    this.swipeActive     = false;
    this.swipeTimer      = 0;
    this.blockFlashTimer = 0;

    this.swordComboStep  = 1;
    this.comboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax   = 0;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingTarget = null;
    this.swordTremorX    = 0;
    this.swordTremorY    = 0;

    this.swordHitPauseTimer = 0;
    this.swordHitPauseMax = 0;
    this.swordHitPauseTargets = [];
    this.swordHitPauseAngle = 0;
    this.swordImpactTimer = 0;
    this.swordImpactX = 0;
    this.swordImpactY = 0;

    this.blockHitPauseTimer = 0;
    this.blockHitPauseMax = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    this.shieldImpactTimer = 0;
    this.shieldImpactX = 0;
    this.shieldImpactY = 0;

    this.slashFadeTimer  = 0;
    this.shieldVisualOffset = 0;
    this.shieldHoldTimer = 0;

    this.swordBroken     = false;
    this.shieldBroken    = false;
    this.swordThrown     = false;
  }

  isDashing() {
    return false;
  }

  isCharging() {
    return false;
  }

  restoreWeapons() {
    this.swordBroken = false;
    this.shieldBroken = false;
    this.swordThrown = false;
  }

  /**
   * Rule 25: Universally clear Knight's 5-phase sword swing and hit-pause states upon CC or stasis
   * interruption to prevent any stasis leaks or soft-locking.
   */
  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.swordSwingTimer = 0;
    this.swipeActive = false;
    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordSwingTarget = null;
    this.swordHitDelivered = false;

    // Release hit-pause targets
    if (this.swordHitPauseTargets && this.swordHitPauseTargets.length > 0) {
      for (const tgt of this.swordHitPauseTargets) {
        if (tgt) tgt.suppressFreezeOverlay = false;
      }
      this.swordHitPauseTargets = [];
    }
    this.swordHitPauseTimer = 0;

    // Release block attacker
    if (this.blockHitPauseAttacker) {
      this.blockHitPauseAttacker.suppressFreezeOverlay = false;
      this.blockHitPauseAttacker = null;
    }
    this.blockHitPauseTimer = 0;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
  }

  /**
   * Clears attack animations and resets combo timer so Knight never remains stuck mid-swing.
   */
  clearAllAttackEffects() {
    super.clearAllAttackEffects();
    this.swordSwingTimer = 0;
    this.swipeActive = false;
    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordSwingTarget = null;
    this.swordHitDelivered = false;

    if (this.swordHitPauseTargets && this.swordHitPauseTargets.length > 0) {
      for (const tgt of this.swordHitPauseTargets) {
        if (tgt) tgt.suppressFreezeOverlay = false;
      }
      this.swordHitPauseTargets = [];
    }
    this.swordHitPauseTimer = 0;

    if (this.blockHitPauseAttacker) {
      this.blockHitPauseAttacker.suppressFreezeOverlay = false;
      this.blockHitPauseAttacker = null;
    }
    this.blockHitPauseTimer = 0;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
  }

  /**
   * Returns true if Knight is currently in a sword impact hit-pause or shield deflection hit-pause.
   */
  isHitPausing() {
    return Boolean(this.swordHitPauseTimer > 0 || this.blockHitPauseTimer > 0);
  }

  canAim() {
    if (this.isHitPausing()) {
      return false;
    }
    return super.canAim();
  }

  canPerformBasicAttack() {
    if (this.isHitPausing()) {
      return false;
    }
    return super.canPerformBasicAttack();
  }

  // ── Passive: shield block on direct projectile hits and melee attacks ──
  takeDamage(amount, attacker, opts = {}) {
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassShield || opts.bypassEvade || opts.isGuaranteedHit));
    // Shield blocks direct projectile hits and melee attacks
    const isBlockableHit = !!(opts.isProjectile || opts.projectile || opts.isMelee) && !isGuaranteedHit;
    if (isBlockableHit && !(this.timeStopTimer > 0)) {
      const blockChance = CONFIG.knight?.shieldBlockChance ?? 0.50;
      if (Math.random() < blockChance) {
        // Shield absorbs this hit! Trigger Shield Block Deflection Hit-Pause
        const pauseFrames = CONFIG.knight?.blockHitPauseFrames ?? 8;
        this.blockHitPauseTimer = pauseFrames;
        this.blockHitPauseMax = pauseFrames;
        this.blockFlashTimer = CONFIG.knight?.blockFlashFrames || 18;
        this.shieldHoldTimer = CONFIG.knight?.shieldHoldFrames || 50;
        this.shieldVisualOffset = 0.35; // Forward bracing angle!
        this.vx = 0;
        this.vy = 0;

        // Calculate shield contact point for deflection shockwave & sparks (Rule 26)
        const shieldAngle = (this.gunAngle || 0) + this.shieldVisualOffset;
        this.shieldImpactX = this.x + Math.cos(shieldAngle) * (this.r + 14);
        this.shieldImpactY = this.y + Math.sin(shieldAngle) * (this.r + 14);
        this.shieldImpactTimer = 14;

        // If blocked a melee attacker, stagger/pause the attacker as well!
        if (opts.isMelee && attacker && attacker !== this && attacker.hp > 0 && !attacker.isDead) {
          if (typeof attacker.applyTimeStop === 'function') {
            attacker.applyTimeStop(pauseFrames);
          }
          attacker.suppressFreezeOverlay = true;
          attacker.vx = 0;
          attacker.vy = 0;
          this.blockHitPauseAttacker = attacker;
        }

        // Trigger shield block sound
        const blockSound = getSkillSound(this._def?.id, 'shieldblock');
        if (blockSound) audioSystem.playSFX(blockSound.src, blockSound.volume);
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('shieldblock', 0.95);
          }
        } catch (e) {}

        triggerGlobalScreenShake(3.0, 5);
        return false; // absorbed the hit
      }
    }
    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Identifies the optimal melee attack target (prioritizing primary fighter opponent,
   * then other enemy fighters, before falling back to illusions or summons).
   */
  _findBestMeleeTarget(opponent, reach) {
    const maxDist = this.r + reach;
    // 1. Primary opponent fighter takes top priority if in reach
    if (opponent && !opponent.isDead && (opponent.hp > 0)) {
      const dSq = (opponent.x - this.x) ** 2 + (opponent.y - this.y) ** 2;
      const targetReach = maxDist + (opponent.r || 25);
      if (dSq <= targetReach * targetReach) {
        return opponent;
      }
    }

    // 2. Scan other enemy fighters first before checking summons/illusions
    const enemyFighters = state.fighters || [];
    let bestFighter = null;
    let bestFighterDistSq = Infinity;
    for (const enemy of enemyFighters) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable || enemy.cannotBeTargeted || enemy.isTargetable === false) continue;
      const dSq = (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2;
      const enemyMaxDist = maxDist + (enemy.r || 25);
      if (dSq <= enemyMaxDist * enemyMaxDist && dSq < bestFighterDistSq) {
        bestFighterDistSq = dSq;
        bestFighter = enemy;
      }
    }
    if (bestFighter) return bestFighter;

    // 3. Only if no enemy fighter is in reach, scan illusions/summons
    const allIllusions = state.illusions || [];
    let bestIllusion = null;
    let bestIllDistSq = Infinity;
    for (const enemy of allIllusions) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable || enemy.cannotBeTargeted || enemy.isTargetable === false) continue;
      const dSq = (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2;
      const enemyMaxDist = maxDist + (enemy.r || 25);
      if (dSq <= enemyMaxDist * enemyMaxDist && dSq < bestIllDistSq) {
        bestIllDistSq = dSq;
        bestIllusion = enemy;
      }
    }
    return bestIllusion;
  }

  /**
   * Rule 1.6: Collects all valid enemy targets within frontal arc cone for multi-target cleave.
   */
  _getTargetsInFrontalArc(reach, arcAngle) {
    const targets = [];
    const allEnemies = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];
    for (const enemy of allEnemies) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable || enemy.cannotBeTargeted || enemy.isTargetable === false) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (enemy.r || 25)) {
        const angleToEnemy = Math.atan2(dy, dx);
        let diff = Math.abs(angleToEnemy - this.swordSlashAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        diff = Math.abs(diff);
        if (diff <= arcAngle / 2) {
          targets.push(enemy);
        }
      }
    }
    return targets;
  }

  // ── Sword Combo Swipe (Chemical Katana 2-Hit Motion & Rule 30 5-Phase Architecture) ──
  _trySwordSwipe(opponent, ownerIndex) {
    if (this.swipeCooldown > 0 || this.isCaughtInBeam() || this.swordSwingTimer > 0 || this.isHitPausing()) return;
    const reach = (CONFIG.knight?.swordRange || 75);
    const target = this._findBestMeleeTarget(opponent, reach);
    if (!target) return;

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
      hitPause = cfg.hit1HitPauseFrames ?? 7;
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
      hitPause = cfg.hit2HitPauseFrames ?? 9;
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
    this.swipeAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.swordSlashAngle = this.swipeAngle;
    this.gunAngle = this.swipeAngle;
    this.angle = this.swipeAngle;
    this.swordSwingTarget = target;
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

    // ── Sword Hit-Pause Active (Freezes attacker & targets in impact stasis) ──
    if (this.swordHitPauseTimer > 0) {
      this.swordHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // Jitter tremor against collision resistance (Rule 30)
      this.swordTremorX = (Math.random() - 0.5) * 2.6;
      this.swordTremorY = (Math.random() - 0.5) * 2.6;

      // Hold targets in hit-pause stasis
      for (const tgt of (this.swordHitPauseTargets || [])) {
        if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
        tgt.vx = 0;
        tgt.vy = 0;
        if (typeof tgt.applyTimeStop === 'function') {
          tgt.applyTimeStop(this.swordHitPauseTimer);
        }
        tgt.suppressFreezeOverlay = true;
      }

      // On Hit-Pause Completion: UNPAUSE RELEASE!
      if (this.swordHitPauseTimer === 0) {
        this._resolveSwordUnpause();
      }

      // Pause sword swing frame progression while hit-paused
      return;
    }

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
      const trackTarget = (this.swordSwingTarget && !this.swordSwingTarget.isDead && this.swordSwingTarget.hp > 0)
        ? this.swordSwingTarget
        : (opponent && !opponent.isDead && opponent.hp > 0 ? opponent : null);
      if (trackTarget) {
        this.swordSlashAngle = Math.atan2(trackTarget.y - this.y, trackTarget.x - this.x);
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
      if (strikeP >= 0.50 && !this.swordHitDelivered) {
        this.swordHitDelivered = true;
        const reach = this.r + (CONFIG.knight?.swordRange || 75) + 12;
        const arc = (this.swordComboStep === 1) ? ((140 * Math.PI) / 180) : ((150 * Math.PI) / 180);
        let targets = this._getTargetsInFrontalArc(reach, arc);

        if (targets.length === 0) {
          const fallback = (this.swordSwingTarget && !this.swordSwingTarget.isDead && this.swordSwingTarget.hp > 0)
            ? this.swordSwingTarget
            : (opponent && !opponent.isDead && opponent.hp > 0 ? opponent : null);
          if (fallback) {
            const dx = fallback.x - this.x;
            const dy = fallback.y - this.y;
            const maxDist = this.r + (fallback.r || 25) + (CONFIG.knight?.swordRange || 75);
            if ((dx * dx + dy * dy) <= (maxDist * 1.35) * (maxDist * 1.35)) {
              targets = [fallback];
            }
          }
        }

        if (targets.length > 0) {
          // ENTER SWORD HIT-PAUSE!
          const pauseFrames = this.swordSwingHitPause || (this.swordComboStep === 2 ? 9 : 7);
          this.swordHitPauseTimer = pauseFrames;
          this.swordHitPauseMax = pauseFrames;
          this.swordHitPauseTargets = targets;
          this.swordHitPauseAngle = this.swordSlashAngle;
          this.vx = 0;
          this.vy = 0;

          // Blade impact spark point at blade tip (Rule 26)
          this.swordImpactX = this.x + Math.cos(this.swordSlashAngle) * (this.r + 76);
          this.swordImpactY = this.y + Math.sin(this.swordSlashAngle) * (this.r + 76);
          this.swordImpactTimer = 14;

          for (const tgt of targets) {
            tgt.takeDamage(this.swordSwingDamage, this, { isMelee: true });
            tgt.vx = 0;
            tgt.vy = 0;
            if (typeof tgt.applyTimeStop === 'function') {
              tgt.applyTimeStop(pauseFrames);
            }
            tgt.suppressFreezeOverlay = true;
          }

          // Rule 30: Layered fleshy slap audio
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('attack_fleshhit', 1.0);
              audioSystem.playSFX('sukuna_slice', 0.90);
            }
          } catch (e) {}

          triggerGlobalScreenShake(this.swordComboStep === 2 ? 5 : 4, 6);
          return; // Instantly enter hit-pause stasis
        }
      }
    } else if (elapsed < pinEnd) {
      // Phase 4: THE IMPACT LOCK / LATCH (Rule 30)
      this.vx = 0;
      this.vy = 0;
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
      this.swordSwingTarget = null;
    }
  }

  /**
   * Rule 30: Unpause release event when sword hit-pause concludes.
   * Releases target stasis, detonates explosive knockback and secondary audio.
   */
  _resolveSwordUnpause() {
    const kbAngle = this.swordHitPauseAngle || this.swordSlashAngle;
    const isStep2 = (this.swordComboStep === 2);

    for (const tgt of (this.swordHitPauseTargets || [])) {
      if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
      tgt.suppressFreezeOverlay = false;
      tgt.timeStopTimer = 0; // Release timeStop stasis so knockback is accepted

      // Explosive knockback impulse
      tgt.vx += Math.cos(kbAngle) * this.swordSwingKnockback;
      tgt.vy += Math.sin(kbAngle) * this.swordSwingKnockback;
      if (isStep2) {
        tgt.vy -= 2.8; // Uppercut loft
      }

      // Hit stun
      if (typeof tgt.applyHitStun === 'function') {
        tgt.applyHitStun(this.swordSwingHitStun);
      }
    }

    // Heavy unpause audio & screen shake
    if (isStep2) {
      try {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('attack_heavypunch1', 0.85);
        }
      } catch (e) {}
    }
    triggerGlobalScreenShake(isStep2 ? 8 : 6, 8);

    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordHitPauseTargets = [];
  }

  /**
   * Unpause release event when shield block hit-pause concludes.
   * Releases attacker stasis with guard deflection recoil and brief stagger stun.
   */
  _resolveBlockUnpause() {
    if (this.blockHitPauseAttacker && this.blockHitPauseAttacker.hp > 0 && !this.blockHitPauseAttacker.isDead) {
      const att = this.blockHitPauseAttacker;
      att.suppressFreezeOverlay = false;
      att.timeStopTimer = 0;

      // Push attacker away from shield impact
      const pushAngle = Math.atan2(att.y - this.y, att.x - this.x);
      att.vx += Math.cos(pushAngle) * 3.8;
      att.vy += Math.sin(pushAngle) * 3.8;

      if (typeof att.applyHitStun === 'function') {
        att.applyHitStun(12);
      }
    }
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    triggerGlobalScreenShake(3.5, 6);
  }

  // ── Smart Wall bounce (Melee Approach Vector) ──
  resolveWallBounce(arena, opponent) {
    if (!opponent || this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
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
      // Melee approach: reflect directly toward the enemy to close combat distance!
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
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

  // ── Main update ──
  update(opponent, ownerIndex, arena) {
    // 0. Rule 25: Visual effect timers decay continuously before freeze guard
    if (this.swordImpactTimer > 0) this.swordImpactTimer--;
    if (this.shieldImpactTimer > 0) this.shieldImpactTimer--;

    this.handleStatusEffects();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // ── Shield Block Deflection Hit-Pause ──
    if (this.blockHitPauseTimer > 0) {
      this.blockHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.shieldTremorX = (Math.random() - 0.5) * 2.2;
      this.shieldTremorY = (Math.random() - 0.5) * 2.2;

      // Keep melee attacker frozen during deflection
      if (this.blockHitPauseAttacker && this.blockHitPauseAttacker.hp > 0 && !this.blockHitPauseAttacker.isDead) {
        this.blockHitPauseAttacker.vx = 0;
        this.blockHitPauseAttacker.vy = 0;
        if (typeof this.blockHitPauseAttacker.applyTimeStop === 'function') {
          this.blockHitPauseAttacker.applyTimeStop(this.blockHitPauseTimer);
        }
        this.blockHitPauseAttacker.suppressFreezeOverlay = true;
      }

      // On Block Hit-Pause Completion: Guard Deflection Stagger
      if (this.blockHitPauseTimer === 0) {
        this._resolveBlockUnpause();
      }
    }

    this._tickCooldowns();
    this._tickAttackSound();
    if (this.blockFlashTimer > 0) this.blockFlashTimer--;
    if (this.shieldHoldTimer > 0) this.shieldHoldTimer--;

    // Detect incoming attacks for shield block visual
    let blocking = false;
    if (this.shieldHoldTimer > 0 || this.blockHitPauseTimer > 0) {
      blocking = true;
    }
    const projectiles = getProjectiles();
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (p.owner !== ownerIndex && !p.isVisual && p.maxLife > 0) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const distSq = dx * dx + dy * dy;
        const projRadius = CONFIG.knight?.blockProjectileDetectionRadius || 200;
        if (distSq < projRadius * projRadius) {
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
      const meleeRadius = CONFIG.knight?.blockMeleeDetectionRadius || 130;
      if (distSq < meleeRadius * meleeRadius) {
        blocking = true;
      }
    }

    // Lerp shield offset (rests on right flank at offset 0, braces forward at offset 0.35 during block hit-pause)
    const targetOffset = (this.blockHitPauseTimer > 0) ? 0.35 : 0;
    this.shieldVisualOffset += (targetOffset - this.shieldVisualOffset) * 0.2;

    if (this.fsm) {
      this.fsm.update(1);
    }

    // Normal movement / Deceleration (prevent movement while hit-pausing)
    if (!this.isHitPausing()) {
      this.applyMovementPhysics();
      this.aim(opponent);
      this.resolveWallBounce(arena, opponent);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // Cooldown and combo timer ticks
    if (this.comboResetTimer > 0) this.comboResetTimer--;
    if (this.swipeCooldown > 0) this.swipeCooldown--;

    // Update 5-phase sword combo swing
    if (this.swipeActive) {
      this._updateSwordSwing(opponent, arena);
    } else {
      if (this.swordSwingTimer > 0) {
        this.swordSwingTimer = 0; // Fail-safe: never allow swordSwingTimer to soft-lock Knight
      }
      if (this.slashFadeTimer > 0) {
        this.slashFadeTimer--;
      }
    }

    // Try auto-swipe combo
    this._trySwordSwipe(opponent, ownerIndex);
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
      // Hit 2: Upward Rising Cleave
      const startAngle = baseAngle + swingTotal * 0.55;
      const endAngle = baseAngle - swingTotal * 0.55;

      if (elapsed < liftF) {
        const p = elapsed / Math.max(1, liftF);
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        return startAngle;
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        return endAngle;
      } else {
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const ease = Math.pow(1 - rp, 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    } else {
      // Hit 1: Horizontal Cross Cleave
      const startAngle = baseAngle - swingTotal * 0.5;
      const endAngle = baseAngle + swingTotal * 0.5;

      if (elapsed < liftF) {
        const p = elapsed / Math.max(1, liftF);
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        return startAngle;
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        return endAngle;
      } else {
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const ease = Math.pow(1 - rp, 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    }
  }

  // ── Drawing ──
  drawOutline(ctx) {
    super.drawOutline(ctx);

    // Draw sword range radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + (CONFIG.knight?.swordRange || 75), 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(158, 158, 158, 0.35)'; // Visible gray ring
    ctx.stroke();
  }

  /** Draws the sword (left) and shield (right) around the body. */
  drawGun(ctx) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    const ga = this.gunAngle;
    const shieldOffset = this.shieldVisualOffset;

    // Apply shield tremor during block hit-pause
    const stx = (this.blockHitPauseTimer > 0 && this.shieldTremorX) ? this.shieldTremorX : 0;
    const sty = (this.blockHitPauseTimer > 0 && this.shieldTremorY) ? this.shieldTremorY : 0;

    // Draw Shield Hand (drawn under shield grip on the right flank)
    ctx.save();
    ctx.translate(this.x + stx, this.y + sty);
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
    drawGrayShield(ctx, this.x + stx, this.y + sty, ga, this.blockFlashTimer, null, this.r, 0, shieldOffset);

    // Sword: if swiping or hit-pausing, animate using 5-phase Chemical Katana combo angle; otherwise aim angle.
    const swordAngle = this._getSwordSwingAngle();
    const isSwinging = Boolean((this.swipeActive && this.swordSwingTimer > 0) || this.swordHitPauseTimer > 0);

    // Apply tremor jitter during Impact Lock & Hit-Pause (Rule 30)
    const tx = ((this.swipeActive || this.swordHitPauseTimer > 0) && this.swordTremorX) ? this.swordTremorX : 0;
    const ty = ((this.swipeActive || this.swordHitPauseTimer > 0) && this.swordTremorY) ? this.swordTremorY : 0;

    // Draw Main Sword (on the left side in idle, lunging forward when swinging)
    drawGraySword(ctx, this.x + tx, this.y + ty, swordAngle, this.r, null, false, isSwinging);
    
    // Draw Sword Hand (drawn over sword hilt on the left flank)
    ctx.save();
    ctx.translate(this.x + tx, this.y + ty);
    const facingLeftSword = Math.abs(swordAngle) > Math.PI / 2;
    ctx.rotate(swordAngle);
    if (facingLeftSword) {
      ctx.scale(1, -1);
    }
    if (isSwinging) {
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

  draw(ctx) {
    // ── Rule 26 Concentric Deflection Shockwave on Shield Block ──
    if (this.shieldImpactTimer > 0) {
      const ip = 1 - (this.shieldImpactTimer / 14);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      // Wave 1: Supersonic white deflection ring
      const r1 = 8 + Math.pow(ip, 0.7) * 32;
      ctx.beginPath();
      ctx.arc(this.shieldImpactX, this.shieldImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 2.5 * (1 - ip);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * ringAlpha})`;
      ctx.stroke();

      // Wave 2: Staggered secondary blue-white ionization ring
      if (ip > 0.12) {
        const ip2 = (ip - 0.12) / 0.88;
        const r2 = 5 + Math.pow(ip2, 0.7) * 22;
        ctx.beginPath();
        ctx.arc(this.shieldImpactX, this.shieldImpactY, r2, 0, Math.PI * 2);
        ctx.lineWidth = 1.8 * (1 - ip2);
        ctx.strokeStyle = `rgba(200, 220, 255, ${0.80 * (1 - ip2)})`;
        ctx.stroke();
      }

      // Discrete spark dots (Rule 26: zero radial spokes!)
      for (let s = 0; s < 6; s++) {
        const sparkA = (s / 6) * Math.PI * 2 + ip * 1.5;
        const sparkDist = 6 + ip * 22 + ((s % 3) * 3);
        const sx = this.shieldImpactX + Math.cos(sparkA) * sparkDist;
        const sy = this.shieldImpactY + Math.sin(sparkA) * sparkDist;
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#c8dcff';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

    // ── Rule 26 Concentric Blade Impact Shockwave on Sword Hit-Pause ──
    if (this.swordImpactTimer > 0) {
      const ip = 1 - (this.swordImpactTimer / 14);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      // Wave 1: Supersonic white blade impact ring
      const r1 = 10 + Math.pow(ip, 0.7) * 36;
      ctx.beginPath();
      ctx.arc(this.swordImpactX, this.swordImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 2.5 * (1 - ip);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ringAlpha})`;
      ctx.stroke();

      // Wave 2: Staggered gold energy ionization ring
      if (ip > 0.10) {
        const ip2 = (ip - 0.10) / 0.90;
        const r2 = 6 + Math.pow(ip2, 0.7) * 26;
        ctx.beginPath();
        ctx.arc(this.swordImpactX, this.swordImpactY, r2, 0, Math.PI * 2);
        ctx.lineWidth = 2.0 * (1 - ip2);
        ctx.strokeStyle = `rgba(255, 200, 40, ${0.85 * (1 - ip2)})`;
        ctx.stroke();
      }

      // Discrete spark dots (Rule 26: discrete squares/dots, zero radial spokes!)
      for (let s = 0; s < 8; s++) {
        const sparkA = (s / 8) * Math.PI * 2 + ip * 1.8;
        const sparkDist = 8 + ip * 28 + ((s % 3) * 4);
        const sx = this.swordImpactX + Math.cos(sparkA) * sparkDist;
        const sy = this.swordImpactY + Math.sin(sparkA) * sparkDist;
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#ffd700';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

    // ——— Block expanding flash ———
    if (this.blockFlashTimer > 0) {
      const p = 1 - (this.blockFlashTimer / (CONFIG.knight?.blockFlashFrames || 15));
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

    super.draw(ctx);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
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
    _drawKnightHair(ctx, this.r, facingLeft);
    this.drawStatusOverlays(ctx, this.r);
    ctx.restore();
  }

  drawBody(ctx) {
    this.drawSkin(ctx);
  }
}
