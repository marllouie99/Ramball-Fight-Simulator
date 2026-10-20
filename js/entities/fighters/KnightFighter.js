import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, getProjectiles, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { FighterStateMachine, FighterState } from '../../core/fighterStateMachine.js';
import { drawGrayShield, drawGraySword } from '../../graphics/weaponVisuals.js';
import { drawKnightPixelBody, drawKnightSkin, _drawKnightHair } from '../../graphics/fighters/knightSkin.js';
import { spawnParrySparksEffect } from '../../graphics/particles/sparkEffect.js';

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
    this.swordSwingLunge = 0;
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

    // ── Tower Shield HP, Defense Buff & Broken State Mechanics ──
    const kConfig = CONFIG.knight || {};
    this._baseDamage = Number(kConfig.damage ?? this.damage ?? 10);
    this.damage = this._baseDamage;
    this.shieldMaxHp = kConfig.shieldMaxHp !== undefined ? kConfig.shieldMaxHp : 90;
    this.shieldHp = kConfig.shieldHp !== undefined ? kConfig.shieldHp : this.shieldMaxHp;
    this.shieldPassiveDefBuff = kConfig.shieldPassiveDefBuff !== undefined ? kConfig.shieldPassiveDefBuff : 0.40;
    this.shieldBrokenDefPenalty = kConfig.shieldBrokenDefPenalty !== undefined ? kConfig.shieldBrokenDefPenalty : 0.50;
    this.isShieldBroken = false;
    this.shieldBreakEffectTimer = 0;
    this.shieldBreakParticles = [];
    this.shieldShatterRingTimer = 0;
    this.shieldShatterX = 0;
    this.shieldShatterY = 0;

    // ── Forward Dash Ability (Every 5 seconds) ──
    this.dashCooldown = 120; // Initial delay 2s before first dash, then 300 (5s)
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashAngle = 0;
    this.dashTrail = [];

    // ── Shield Break Parry Mechanics ──
    this.parryAnimationTimer = 0;
    this.parryFlashTimer = 0;
    this.parryX = 0;
    this.parryY = 0;
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

    // Reset shield HP and broken state on match/round restart
    const kConfig = CONFIG.knight || {};
    this.shieldMaxHp = kConfig.shieldMaxHp !== undefined ? kConfig.shieldMaxHp : 90;
    this.shieldHp = this.shieldMaxHp;
    this.shieldPassiveDefBuff = kConfig.shieldPassiveDefBuff !== undefined ? kConfig.shieldPassiveDefBuff : 0.40;
    this.shieldBrokenDefPenalty = kConfig.shieldBrokenDefPenalty !== undefined ? kConfig.shieldBrokenDefPenalty : 0.50;
    this.isShieldBroken = false;
    this.damage = this._baseDamage;
    this.shieldBreakEffectTimer = 0;
    this.shieldBreakParticles = [];
    this.shieldShatterRingTimer = 0;
    this.shieldShatterX = 0;
    this.shieldShatterY = 0;

    // ── Forward Dash Ability (Every 5 seconds) ──
    this.dashCooldown = 120; // Initial delay 2s before first dash, then 300 (5s)
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashAngle = 0;
    this.dashTrail = [];

    // ── Shield Break Parry Mechanics ──
    this.parryAnimationTimer = 0;
    this.parryFlashTimer = 0;
    this.parryX = 0;
    this.parryY = 0;
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
    this.isDashing = false;
    this.dashTimer = 0;

    // Cleanly unpause and release sword hit-pause targets
    if (this.swordHitPauseTimer > 0) {
      this._resolveSwordUnpause();
    }
    this.swordHitPauseTimer = 0;
    this.swordHitPauseTargets = [];

    // Cleanly unpause and release shield block attacker
    if (this.blockHitPauseTimer > 0) {
      this._resolveBlockUnpause();
    }
    this.blockHitPauseTimer = 0;
    this.blockHitPauseAttacker = null;
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
    this.isDashing = false;
    this.dashTimer = 0;

    if (this.swordHitPauseTimer > 0) {
      this._resolveSwordUnpause();
    }
    this.swordHitPauseTimer = 0;
    this.swordHitPauseTargets = [];

    if (this.blockHitPauseTimer > 0) {
      this._resolveBlockUnpause();
    }
    this.blockHitPauseTimer = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
  }

  clearAllAfterimages() {
    super.clearAllAfterimages();
    if (this.dashTrail) this.dashTrail.length = 0;
  }

  /**
   * Returns true if Knight is currently in a sword impact hit-pause or shield deflection hit-pause.
   */
  isHitPausing() {
    return Boolean(this.swordHitPauseTimer > 0 || this.blockHitPauseTimer > 0);
  }

  canAim() {
    if (this.swipeActive || this.swordSwingTimer > 0 || this.isHitPausing() || this.isDashing) {
      return false;
    }
    return super.canAim();
  }

  canPerformBasicAttack() {
    if (this.swipeActive || this.swordSwingTimer > 0 || this.isHitPausing() || this.isDashing) {
      return false;
    }
    return super.canPerformBasicAttack();
  }

  /**
   * Returns Knight's current passive DEF buff damage reduction multiplier.
   * Full buff (e.g. 40% damage reduction) while shield is active;
   * Loses 50% of the DEF buff (e.g. drops to 20% damage reduction) once shield is broken.
   */
  getDefenseBuff() {
    const kConfig = CONFIG.knight || {};
    const baseBuff = kConfig.shieldPassiveDefBuff !== undefined ? kConfig.shieldPassiveDefBuff : (this.shieldPassiveDefBuff ?? 0.40);
    if (!this.isShieldBroken && this.shieldHp > 0) {
      return baseBuff;
    }
    const penalty = kConfig.shieldBrokenDefPenalty !== undefined ? kConfig.shieldBrokenDefPenalty : (this.shieldBrokenDefPenalty ?? 0.50);
    return baseBuff * (1 - penalty);
  }

  /**
   * Triggers the shield break event when shield HP reaches 0.
   * Executes an authentic 12-frame Global Parry explosion animation, layered parry sound,
   * stuns and knocks back the attacker, and transforms the sword into Minecraft Gold Sword.
   */
  _triggerShieldBreak(shieldAngle, attacker = null, opts = {}) {
    this.isShieldBroken = true;
    this.shieldHp = 0;
    const kConfig = CONFIG.knight || {};
    const damageMultiplier = kConfig.brokenShieldSwordDamageMultiplier ?? 2.0;
    this.damage = Math.round(this._baseDamage * damageMultiplier);
    this.shieldBreakEffectTimer = 60;

    const contactX = this.shieldImpactX || (this.x + Math.cos(shieldAngle || 0) * (this.r + 14));
    const contactY = this.shieldImpactY || (this.y + Math.sin(shieldAngle || 0) * (this.r + 14));
    this.shieldShatterRingTimer = 22;
    this.shieldShatterX = contactX;
    this.shieldShatterY = contactY;

    // ── 1. Authentic 12-Frame Global Parry Explosion Animation & Spark Burst ──
    try {
      spawnParrySparksEffect(contactX, contactY, 32);
    } catch (e) {}

    // Parry animation and flash state on Knight
    this.parryAnimationTimer = CONFIG.knight?.parryAnimationFrames || 24;
    this.parryFlashTimer = 18;
    this.parryX = contactX;
    this.parryY = contactY;

    // ── 2. Parry Audio: Layered Parry Stinger & Concussive Shield Shatter ──
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        const parrySound = CONFIG.knight?.sounds?.parry || 'Assets/Sound Effects/Skills/parry.mp3';
        const parryVol = CONFIG.knight?.soundVolumes?.parry ?? 1.0;
        audioSystem.playSFX(parrySound, parryVol);

        const breakSound = CONFIG.knight?.sounds?.shieldBreak || 'Assets/Sound Effects/SkillEffects/shield-break.mp3';
        const breakVol = CONFIG.knight?.soundVolumes?.shieldBreak ?? 1.0;
        audioSystem.playSFX(breakSound, breakVol);
      }
    } catch (e) {}

    triggerGlobalScreenShake(10.0, 16);

    // ── 3. Parry Counter: Stun, Hit-Pause & Knockback on Breaking Attacker ──
    if (attacker && attacker !== this && attacker.hp > 0 && !attacker.isDead) {
      const stunFrames = CONFIG.knight?.parryHitStunFrames || 28;
      const pauseFrames = CONFIG.knight?.parryTimeStopFrames || 16;
      const knockbackForce = CONFIG.knight?.parryKnockback || 11.0;

      if (typeof attacker.applyHitStun === 'function') {
        attacker.applyHitStun(stunFrames);
      }
      if (typeof attacker.applyTimeStop === 'function') {
        attacker.applyTimeStop(pauseFrames);
      }
      attacker.suppressFreezeOverlay = true;

      const pushAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
      attacker.vx += Math.cos(pushAngle) * knockbackForce;
      attacker.vy += Math.sin(pushAngle) * knockbackForce;
    }

    // Destroy incoming projectile that shattered the shield
    if (opts && opts.projectile) {
      opts.projectile.life = 0;
    }

    // ── 4. Floating text: "⚡ PERFECT PARRY!", "🛡️ SHIELD SHATTERED!", "🗡️ MINECRAFT GOLD SWORD! 2X DMG!" ──
    if (typeof state !== 'undefined' && state.spawnFloatingText) {
      state.spawnFloatingText('⚡ PERFECT PARRY!', this.x, this.y - this.r - 42, {
        color: '#FFD700',
        font: '900 16px "Rajdhani", sans-serif',
        rise: 30,
        duration: 65
      });
      state.spawnFloatingText('🛡️ SHIELD SHATTERED!', this.x, this.y - this.r - 26, {
        color: '#ef4444',
        font: '900 14px "Rajdhani", sans-serif',
        rise: 26,
        duration: 55
      });
      state.spawnFloatingText('🗡️ MINECRAFT GOLD SWORD! 2X DMG!', this.x, this.y - this.r - 10, {
        color: '#FFD700',
        font: '900 15px "Rajdhani", sans-serif',
        rise: 34,
        duration: 75
      });
    }

    // Shield break particles: 32 faceted polygonal metal/gold/sheared shards
    this.shieldBreakParticles = [];
    const shardCount = 32;
    const baseAngle = shieldAngle || 0;

    // Shard polygon silhouettes (pre-calculated relative vertices for varied shard shapes)
    const SHARD_SHAPES = [
      // Large triangular shield plate fragments
      [[-7, -4], [8, -2], [1, 7]],
      [[-6, -6], [7, -1], [-2, 8]],
      [[-8, 2], [3, -7], [6, 5]],
      // Rhombus / quadrilateral armor shards
      [[-6, -3], [5, -5], [7, 4], [-4, 6]],
      [[-4, -5], [6, -3], [4, 6], [-5, 4]],
      [[-5, -4], [6, -1], [3, 7], [-6, 3]],
      // Needle-like edge splinters
      [[-2, -7], [3, -1], [1, 8], [-2, 1]],
      [[-1, -8], [2, 0], [0, 8], [-2, 2]],
      // Small faceted chips
      [[-3, -3], [4, -2], [1, 4]],
      [[-4, -1], [3, -4], [2, 4], [-3, 3]],
    ];

    for (let i = 0; i < shardCount; i++) {
      // Outward cone biased toward the incoming impact / outward from the shield
      const pAngle = baseAngle + (Math.random() - 0.5) * Math.PI * 1.5;
      const pSpeed = 3.2 + Math.random() * 6.5;
      const shapeIdx = i % SHARD_SHAPES.length;
      const scale = 0.75 + Math.random() * 0.9;
      const pts = SHARD_SHAPES[shapeIdx].map(pt => [pt[0] * scale, pt[1] * scale]);

      // Color distribution: steel armor, gold crest trim, dark alloy, hot sheared orange
      let fillColor;
      const randColor = Math.random();
      if (randColor < 0.38) {
        fillColor = '#2b2f38'; // Dark steel plate
      } else if (randColor < 0.65) {
        fillColor = '#414652'; // Mid steel plate
      } else if (randColor < 0.88) {
        fillColor = '#ffd700'; // Gold crest trim
      } else {
        fillColor = '#ff6b1a'; // Hot sheared fracture edge
      }

      this.shieldBreakParticles.push({
        x: contactX + (Math.random() - 0.5) * 12,
        y: contactY + (Math.random() - 0.5) * 12,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed - (1.2 + Math.random() * 2.2), // Upward explosive pop
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.55,
        gravity: 0.22,
        life: 36 + Math.floor(Math.random() * 24),
        maxLife: 60,
        pts: pts,
        fillColor: fillColor,
        strokeColor: '#0a0a0c',
        hasHighlight: Math.random() > 0.4
      });
    }
  }

  // ── Passive: shield block on incoming attacks (Shield HP & Passive DEF Buff) ──
  takeDamage(amount, attacker, opts = {}) {
    if (opts && (opts.isHeal || opts.heal) || amount <= 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    // ── ACTIVE SHIELD: Knight absolutely does NOT take any incoming damage to his HP as long as shield is not broken ──
    // Absorbs ALL incoming damage sources (basic attacks, skills, projectiles, beams, explosions, domains) into the shield.
    const isShieldActive = !this.isShieldBroken && (this.shieldHp > 0);

    if (isShieldActive) {
      // While shield is active, full passive DEF buff reduces incoming damage to the shield (unless true damage)
      const defBuff = opts.isTrueDamage ? 0 : this.getDefenseBuff();
      const damageToShield = Math.max(1, Math.round(amount * (1 - defBuff)));

      // Deduct from shield HP
      this.shieldHp = Math.max(0, this.shieldHp - damageToShield);

      // Hit-pause & deflection effects
      const pauseFrames = CONFIG.knight?.blockHitPauseFrames ?? 8;
      if (this.blockHitPauseTimer <= 0) {
        this.blockHitPauseTimer = pauseFrames;
        this.blockHitPauseMax = pauseFrames;

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
      }

      this.blockFlashTimer = CONFIG.knight?.blockFlashFrames || 18;
      this.shieldHoldTimer = CONFIG.knight?.shieldHoldFrames || 50;
      this.shieldVisualOffset = 0.35; // Forward bracing angle!

      // Calculate shield contact point for deflection shockwave & sparks (Rule 26)
      const shieldAngle = (this.gunAngle || 0) + this.shieldVisualOffset;
      this.shieldImpactX = this.x + Math.cos(shieldAngle) * (this.r + 14);
      this.shieldImpactY = this.y + Math.sin(shieldAngle) * (this.r + 14);
      this.shieldImpactTimer = 14;

      // Trigger shield block sound with audio debounce (prevents clipping during flurries)
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (!this._lastShieldBlockSoundTime || now - this._lastShieldBlockSoundTime > 60) {
        this._lastShieldBlockSoundTime = now;
        const blockSound = getSkillSound(this._def?.id, 'shieldblock');
        const blockSrc = CONFIG.knight?.sounds?.shieldBlock || blockSound?.src || 'Assets/Sound Effects/Skills/shieldblock.mp3';
        const blockVol = CONFIG.knight?.soundVolumes?.shieldBlock ?? blockSound?.volume ?? 0.95;
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX(blockSrc, blockVol);
          }
        } catch (e) {}
      }

      // Display floating combat damage text on the shield (amber/gold for shield absorption)
      if (typeof state !== 'undefined' && state.spawnFloatingText && !opts.skipStandardDamageText) {
        const textColor = (opts && opts.damageNumberColor) || (attacker && attacker.damageNumberColor) || '#eab308';
        state.spawnFloatingText(this.x, this.y - this.r - 12, `${damageToShield}`, textColor);
      }

      // Notify attacker that damage was dealt (for passives, lifesteal, combos)
      if (attacker && typeof attacker.onDamageDealt === 'function' && amount > 0) {
        attacker.onDamageDealt(this, opts.projectile || null, (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(attacker) : -1, damageToShield);
      }

      triggerGlobalScreenShake(2.5, 4);

      // Check if this attack shattered the shield!
      if (this.shieldHp <= 0) {
        this._triggerShieldBreak(shieldAngle, attacker, opts);
      }

      // Destroy non-piercing projectile upon impact with the solid tower shield
      if (opts && opts.projectile && !opts.projectile.isPiercing && !opts.projectile.isBeam) {
        opts.projectile.life = 0;
      }

      // CRITICAL: Return false to indicate Knight's body HP took 0 damage while shield absorbed the hit!
      return false;
    }

    // ── BROKEN SHIELD / UNBLOCKED: Knight is completely vulnerable and loses 50% of his DEF buff ──
    const brokenDefBuff = this.getDefenseBuff(); // 50% reduced DEF buff
    const finalDamage = Math.max(1, Math.round(amount * (1 - brokenDefBuff)));

    return super.takeDamage(finalDamage, attacker, opts);
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
    if (this.swipeCooldown > 0 || this.isCaughtInBeam() || this.swordSwingTimer > 0 || this.isHitPausing() || this.isDashing) return;
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
      lunge = cfg.hit1LungeSpeed ?? 0;
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
      lunge = cfg.hit2LungeSpeed ?? 0;
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

    // Minecraft Gold Sword Mechanic: Deals 2x damage when shield is broken
    const damageMultiplier = this.isShieldBroken ? (cfg.brokenShieldSwordDamageMultiplier ?? 2.0) : 1.0;
    dmg = Math.round(dmg * damageMultiplier);
    this.damage = Math.round(this._baseDamage * damageMultiplier);

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
        const liftSound = CONFIG.knight?.sounds?.swordLift || 'skill_dash1';
        const liftVol = CONFIG.knight?.soundVolumes?.swordLift ?? 0.40;
        audioSystem.playSFX(liftSound, liftVol);
      }
    } catch (e) {}
  }

  /**
   * Updates 5-phase melee combo lifecycle, forward lunge physics, impact lock, and layered slap audio.
   */
  _updateSwordSwing(opponent, arena) {
    if (this.swordSwingTimer <= 0) {
      this.swipeActive = false;
      this.swordSwingTimer = 0;
      this.slashFadeTimer = 15;
      this.swordSwingTarget = null;
      return;
    }

    if (this.swordHitPauseTimer > 0) {
      return; // Progression held in hit-pause stasis
    }

    const totalF = this.swordSwingMax || 30;
    const elapsed = Math.max(0, Math.min(totalF, totalF - this.swordSwingTimer));
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
        this.gunAngle = this.swordSlashAngle;
        this.angle = this.swordSlashAngle;
      }
    } else if (elapsed < strikeEnd) {
      // Phase 3: Hypersonic Whip Strike Window
      const strikeElapsed = elapsed - strikeStart;
      const strikeP = Math.max(0, Math.min(1.0, strikeElapsed / Math.max(1, strikeF)));

      if (!this.swordSwingSoundPlayed) {
        this.swordSwingSoundPlayed = true;
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            const swingSound = CONFIG.knight?.sounds?.swordSwing || 'attack_swordswing';
            const swingVol = CONFIG.knight?.soundVolumes?.swordSwing ?? 0.95;
            audioSystem.playSFX(swingSound, swingVol);
          }
        } catch (e) {}
      }

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
              const fleshSound = CONFIG.knight?.sounds?.fleshHit || 'attack_fleshhit';
              const fleshVol = CONFIG.knight?.soundVolumes?.fleshHit ?? 1.0;
              const sliceSound = CONFIG.knight?.sounds?.bladeSlice || 'sukuna_slice';
              const sliceVol = CONFIG.knight?.soundVolumes?.bladeSlice ?? 0.90;
              audioSystem.playSFX(fleshSound, fleshVol);
              audioSystem.playSFX(sliceSound, sliceVol);
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
      this.swordSwingTimer = 0;
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
          const impactSound = CONFIG.knight?.sounds?.heavyImpact || 'attack_heavypunch1';
          const impactVol = CONFIG.knight?.soundVolumes?.heavyImpact ?? 0.85;
          audioSystem.playSFX(impactSound, impactVol);
        }
      } catch (e) {}
    }
    triggerGlobalScreenShake(isStep2 ? 8 : 6, 8);

    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordHitPauseTimer = 0;
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
    this.blockHitPauseTimer = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    triggerGlobalScreenShake(3.5, 6);
  }

  // ── Natural Arena Wall Bounce ──
  resolveWallBounce(arena, opponent) {
    return super.resolveWallBounce(arena, opponent);
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
    if (this.parryAnimationTimer > 0) this.parryAnimationTimer--;
    if (this.parryFlashTimer > 0) this.parryFlashTimer--;
    if (this.swordImpactTimer > 0) this.swordImpactTimer--;
    if (this.shieldImpactTimer > 0) this.shieldImpactTimer--;
    if (this.shieldShatterRingTimer > 0) this.shieldShatterRingTimer--;
    if (this.shieldBreakEffectTimer > 0) this.shieldBreakEffectTimer--;
    if (this.dashTrail && this.dashTrail.length > 0) {
      for (let i = this.dashTrail.length - 1; i >= 0; i--) {
        this.dashTrail[i].alpha -= 0.08;
        if (this.dashTrail[i].alpha <= 0) {
          this.dashTrail.splice(i, 1);
        }
      }
    }
    if (this.shieldBreakParticles && this.shieldBreakParticles.length > 0) {
      for (let i = this.shieldBreakParticles.length - 1; i >= 0; i--) {
        const p = this.shieldBreakParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.22;
        p.rot += p.vrot;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life--;
        if (p.life <= 0) {
          this.shieldBreakParticles.splice(i, 1);
        }
      }
    }

    this.handleStatusEffects();

    // Rule 1.1 Freeze & TimeStop Guard: Stop execution and interrupt attacks while frozen or ambushed
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // ── Sword Hit-Pause Active (Freezes attacker & targets in impact stasis - Rule 30) ──
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

      // Pause update progression while in sword hit-pause stasis
      return;
    }

    // ── Shield Block Deflection Hit-Pause ──
    if (this.blockHitPauseTimer > 0) {
      this.blockHitPauseTimer--;
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

    // Lerp shield offset (rests on right flank at offset 0, braces forward at offset 0.35 during block stance)
    const targetOffset = (blocking || this.blockHitPauseTimer > 0 || this.shieldHoldTimer > 0) ? 0.35 : 0;
    this.shieldVisualOffset += (targetOffset - this.shieldVisualOffset) * 0.2;

    if (this.fsm) {
      this.fsm.update(1);
    }

    // ── 5-Second Tactical Forward Dash Cooldown & Trigger ──
    if (this.dashCooldown > 0) {
      this.dashCooldown--;
    }

    const kCfg = CONFIG.knight || {};
    if (kCfg.enableDash !== false && this.dashCooldown <= 0 && !this.isDashing && !this.isHitPausing() && !this.swipeActive) {
      if (opponent && !opponent.isDead && opponent.hp > 0) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        const minRange = kCfg.dashMinRange || 55;
        const maxRange = kCfg.dashMaxRange || 420;
        if (dist > minRange && dist <= maxRange) {
          this._performForwardDash(opponent);
        }
      }
    }

    // ── Movement: Forward Dash vs Normal Natural Movement ──
    if (this.isDashing && this.dashTimer > 0) {
      this.dashTimer--;
      const dashSpeed = kCfg.dashSpeed || 15.5;
      this.vx = Math.cos(this.dashAngle) * dashSpeed;
      this.vy = Math.sin(this.dashAngle) * dashSpeed;
      this.applyMovementPhysics(1.0);
      this.resolveWallBounce(arena, opponent);

      // Dash trail afterimages
      if (!this.dashTrail) this.dashTrail = [];
      if (this.dashTrail.length < 5) {
        this.dashTrail.push({
          x: this.x,
          y: this.y,
          angle: this.gunAngle,
          alpha: 0.60
        });
      }

      // Check if reached close melee contact with target
      if (opponent && !opponent.isDead && opponent.hp > 0) {
        const curDist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (curDist <= this.r + (opponent.r || 25) + 20) {
          this.dashTimer = 0;
        }
      }

      if (this.dashTimer === 0) {
        this.isDashing = false;
        this.vx *= 0.25;
        this.vy *= 0.25;
      }
    } else {
      this.isDashing = false;
      this.applyMovementPhysics();
      this.aim(opponent);
      this.resolveWallBounce(arena, opponent);
    }

    // Firmly lock gunAngle to committed attack angle during melee combo (Rule 1.4)
    if (this.swipeActive && this.swordSlashAngle !== undefined) {
      this.gunAngle = this.swordSlashAngle;
      this.angle = this.swordSlashAngle;
    }

    // Cooldown and combo timer ticks
    if (this.comboResetTimer > 0) this.comboResetTimer--;
    if (this.swipeCooldown > 0) this.swipeCooldown--;

    // Update 5-phase sword combo swing
    if (this.swipeActive && this.swordSwingTimer > 0) {
      this._updateSwordSwing(opponent, arena);
    } else {
      this.swipeActive = false;
      this.swordSwingTimer = 0;
      if (this.slashFadeTimer > 0) {
        this.slashFadeTimer--;
      }
    }

    // Try auto-swipe combo
    this._trySwordSwipe(opponent, ownerIndex);
  }

  /**
   * Executes a short forward dash towards the target enemy (triggers every 5 seconds).
   */
  _performForwardDash(opponent, dashAngle = null) {
    const angle = dashAngle !== null ? dashAngle : Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.isDashing = true;
    this.dashTimer = CONFIG.knight?.dashDuration || 10;
    this.dashAngle = angle;
    this.gunAngle = angle;
    this.angle = angle;
    this.dashCooldown = CONFIG.knight?.dashCooldown || 300; // 5 seconds at 60 FPS

    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        const dashSound = CONFIG.knight?.sounds?.dash || 'Assets/Sound Effects/Skills/dash1.mp3';
        const dashVol = CONFIG.knight?.soundVolumes?.dash ?? 0.85;
        audioSystem.playSFX(dashSound, dashVol);
      }
    } catch (e) {}

    const dashSpeed = CONFIG.knight?.dashSpeed || 15.5;
    this.vx = Math.cos(angle) * dashSpeed;
    this.vy = Math.sin(angle) * dashSpeed;
  }

  /**
   * Rule 16 Manga Action Speed Lines Standard: 4-point filled needle polygons trailing behind Knight during dash.
   */
  _drawDashSpeedLines(ctx) {
    const aimAngle = this.dashAngle || this.gunAngle || this.angle || 0;
    const cosA = Math.cos(aimAngle);
    const sinA = Math.sin(aimAngle);
    const normX = -sinA;
    const normY = cosA;

    const clusterWidth = this.r * 1.35;
    const palette = ['#FFFFFF', '#E2E8F0', '#9E9E9E', '#0E0F14'];

    ctx.save();
    for (let i = 0; i < 6; i++) {
      const seed1 = Math.abs(Math.sin((i + 1) * 19.33));
      const seed2 = Math.abs(Math.sin((i + 1) * 43.17));
      const seed3 = Math.abs(Math.sin((i + 1) * 71.91));

      const perpOffset = (seed1 * 2 - 1) * clusterWidth;
      const trailDist = this.r + 6 + seed2 * 26;
      const needleLen = 14 + seed3 * 22;
      const halfThick = 0.6 + seed1 * 0.7;

      const tailX = this.x - cosA * (trailDist + needleLen) + normX * perpOffset;
      const tailY = this.y - sinA * (trailDist + needleLen) + normY * perpOffset;

      const headX = this.x - cosA * trailDist + normX * perpOffset;
      const headY = this.y - sinA * trailDist + normY * perpOffset;

      const midX = (tailX + headX) * 0.5;
      const midY = (tailY + headY) * 0.5;

      const topMidX = midX + normX * halfThick;
      const topMidY = midY + normY * halfThick;

      const botMidX = midX - normX * halfThick;
      const botMidY = midY - normY * halfThick;

      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(topMidX, topMidY);
      ctx.lineTo(headX, headY);
      ctx.lineTo(botMidX, botMidY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Computes exact sword blade angle based on 5-phase Chemical Katana combo lifecycle.
   */
  _getSwordSwingAngle() {
    if (!this.swipeActive || this.swordSwingTimer <= 0) {
      return this.gunAngle || 0;
    }

    const totalF = this.swordSwingMax || 30;
    const elapsed = Math.max(0, Math.min(totalF, totalF - this.swordSwingTimer));
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    const baseAngle = this.swordSlashAngle !== undefined ? this.swordSlashAngle : (this.swipeAngle || this.gunAngle || 0);
    const isHit2 = (this.swordComboStep === 2);
    const swingTotal = Math.PI * (isHit2 ? 1.40 : 1.30);

    if (isHit2) {
      // Hit 2: Upward Rising Cleave
      const startAngle = baseAngle + swingTotal * 0.55;
      const endAngle = baseAngle - swingTotal * 0.55;

      if (elapsed < liftF) {
        const p = Math.max(0, Math.min(1.0, elapsed / Math.max(1, liftF)));
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        return startAngle;
      } else if (elapsed < strikeEnd) {
        const sp = Math.max(0, Math.min(1.0, (elapsed - strikeStart) / Math.max(1, strikeF)));
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        return endAngle;
      } else {
        const rp = Math.max(0, Math.min(1.0, (elapsed - pinEnd) / Math.max(1, recF)));
        const ease = Math.pow(Math.max(0, 1.0 - rp), 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    } else {
      // Hit 1: Horizontal Cross Cleave
      const startAngle = baseAngle - swingTotal * 0.5;
      const endAngle = baseAngle + swingTotal * 0.5;

      if (elapsed < liftF) {
        const p = Math.max(0, Math.min(1.0, elapsed / Math.max(1, liftF)));
        return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        return startAngle;
      } else if (elapsed < strikeEnd) {
        const sp = Math.max(0, Math.min(1.0, (elapsed - strikeStart) / Math.max(1, strikeF)));
        const ease = Math.pow(sp, 2.4);
        return startAngle + (endAngle - startAngle) * ease;
      } else if (elapsed < pinEnd) {
        return endAngle;
      } else {
        const rp = Math.max(0, Math.min(1.0, (elapsed - pinEnd) / Math.max(1, recF)));
        const ease = Math.pow(Math.max(0, 1.0 - rp), 1.8);
        return baseAngle + (endAngle - baseAngle) * ease;
      }
    }
  }

  // ── Drawing ──
  drawOutline(ctx) {
    super.drawOutline(ctx);
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
    drawGrayShield(ctx, this.x + stx, this.y + sty, ga, this.blockFlashTimer, null, this.r, 0, shieldOffset, this.isShieldBroken);

    // Sword: if swiping or hit-pausing, animate using 5-phase Chemical Katana combo angle; otherwise upright ready guard.
    const isSwinging = Boolean((this.swipeActive && this.swordSwingTimer > 0) || this.swordHitPauseTimer > 0);
    const swordAngle = isSwinging ? this._getSwordSwingAngle() : (ga || 0);

    // Apply tremor jitter during Impact Lock & Hit-Pause (Rule 30)
    const tx = (isSwinging && this.swordTremorX) ? this.swordTremorX : 0;
    const ty = (isSwinging && this.swordTremorY) ? this.swordTremorY : 0;

    // Draw Main Sword (on the left side in idle, lunging forward when swinging; transforms into Minecraft Gold Sword if shield broken)
    drawGraySword(ctx, this.x + tx, this.y + ty, swordAngle, this.r, null, false, isSwinging, this.isShieldBroken);
    
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
    // ── Dash Trail Afterimages ──
    if (this.dashTrail && this.dashTrail.length > 0) {
      for (const trail of this.dashTrail) {
        if (!trail || trail.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, trail.alpha * 0.45));
        ctx.translate(trail.x, trail.y);
        ctx.rotate(trail.angle || 0);
        const facingLeft = Math.abs(trail.angle || 0) > Math.PI / 2;
        if (facingLeft) ctx.scale(1, -1);
        drawKnightPixelBody(ctx, this.r, false);
        ctx.restore();
      }
    }

    // ── Speed Lines during Active Dash (Rule 16) ──
    if (this.isDashing) {
      this._drawDashSpeedLines(ctx);
    }

    // ── Shield Break Parry Animation (12-Frame Parry Shockwave & Flash Aura) ──
    if (this.parryAnimationTimer > 0) {
      const maxF = CONFIG.knight?.parryAnimationFrames || 24;
      const progress = 1 - (this.parryAnimationTimer / maxF);
      const alpha = Math.max(0, 1 - progress);
      const px = this.parryX || this.x;
      const py = this.parryY || this.y;

      ctx.save();
      // Wave 1: Expanding radiant golden parry ring
      const ringRadius = 14 + Math.pow(progress, 0.6) * 55;
      ctx.beginPath();
      ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 3.5 * (1 - progress);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.95 * alpha})`;
      ctx.stroke();

      // Wave 2: Inner supersonic white core
      const coreRadius = 8 + Math.pow(progress, 0.5) * 35;
      ctx.beginPath();
      ctx.arc(px, py, coreRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.0 * (1 - progress);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.stroke();

      // Wave 3: 4-point cross star glint at detonation center
      if (progress < 0.6) {
        const starLen = (1 - progress / 0.6) * 22;
        ctx.beginPath();
        ctx.moveTo(px - starLen, py);
        ctx.lineTo(px + starLen, py);
        ctx.moveTo(px, py - starLen);
        ctx.lineTo(px, py + starLen);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Shield Shatter Debris & Faceted Shards ──
    if (this.shieldBreakParticles && this.shieldBreakParticles.length > 0) {
      ctx.save();
      for (const p of this.shieldBreakParticles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;

        if (p.pts && p.pts.length >= 3) {
          ctx.beginPath();
          for (let j = 0; j < p.pts.length; j++) {
            const pt = p.pts[j];
            if (j === 0) ctx.moveTo(pt[0], pt[1]);
            else ctx.lineTo(pt[0], pt[1]);
          }
          ctx.closePath();
          ctx.fillStyle = p.fillColor || '#2b2f38';
          ctx.fill();
          ctx.strokeStyle = p.strokeColor || '#0a0a0c';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Bright glint highlight line along one facet
          if (p.hasHighlight) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.pts[0][0], p.pts[0][1]);
            ctx.lineTo(p.pts[1][0], p.pts[1][1]);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = p.fillColor || '#eab308';
          ctx.fillRect(-2, -2, 4, 4);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // ── Rule 26 Concentric Supersonic Shatter Shockwave ──
    if (this.shieldShatterRingTimer > 0) {
      const sp = 1 - (this.shieldShatterRingTimer / 22);
      const ringAlpha = Math.max(0, 1 - sp);

      ctx.save();
      // Wave 1: Supersonic white core compression ring
      const r1 = 12 + Math.pow(sp, 0.65) * 48;
      ctx.beginPath();
      ctx.arc(this.shieldShatterX, this.shieldShatterY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 3.0 * (1 - sp);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ringAlpha})`;
      ctx.stroke();

      // Translucent expanding warm interior wash
      ctx.fillStyle = `rgba(255, 180, 0, ${0.18 * ringAlpha})`;
      ctx.fill();

      // Wave 2: Staggered fiery gold/amber shockwave (pops out after sp > 0.12)
      if (sp > 0.12) {
        const sp2 = (sp - 0.12) / 0.88;
        const r2 = 8 + Math.pow(sp2, 0.70) * 36;
        ctx.beginPath();
        ctx.arc(this.shieldShatterX, this.shieldShatterY, r2, 0, Math.PI * 2);
        ctx.lineWidth = 2.2 * (1 - sp2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.85 * (1 - sp2)})`;
        ctx.stroke();
      }

      // Wave 3: Staggered red-orange fracture ionization ring (pops out after sp > 0.24)
      if (sp > 0.24) {
        const sp3 = (sp - 0.24) / 0.76;
        const r3 = 5 + Math.pow(sp3, 0.75) * 26;
        ctx.beginPath();
        ctx.arc(this.shieldShatterX, this.shieldShatterY, r3, 0, Math.PI * 2);
        ctx.lineWidth = 1.6 * (1 - sp3);
        ctx.strokeStyle = `rgba(255, 80, 20, ${0.75 * (1 - sp3)})`;
        ctx.stroke();
      }

      // Discrete spark dots at the perimeter (Rule 26: discrete squares/dots, zero radial spokes!)
      for (let s = 0; s < 10; s++) {
        const sparkA = (s / 10) * Math.PI * 2 + sp * 2.2;
        const sparkDist = 10 + sp * 40 + ((s % 3) * 5);
        const sx = this.shieldShatterX + Math.cos(sparkA) * sparkDist;
        const sy = this.shieldShatterY + Math.sin(sparkA) * sparkDist;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : (s % 3 === 1 ? '#ffd700' : '#ff4500');
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

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


    // ── Anime Vibe 5-Phase Melee Slash Ribbon (Chemical Katana Combo) ──
    if (this.swipeActive && this.swordSwingTimer > 0) {
      const totalF = this.swordSwingMax || 30;
      const elapsed = Math.max(0, Math.min(totalF, totalF - this.swordSwingTimer));
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
        const baseAngle = this.swordSlashAngle !== undefined ? this.swordSlashAngle : (this.swipeAngle || this.gunAngle || 0);

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
          const rp = Math.max(0, Math.min(1.0, (elapsed - pinEnd) / Math.max(1, recF)));
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
    this.drawShieldHealth(ctx);
  }

  /**
   * Draws overhead shield HP bar or broken indicator above Knight's head.
   */
  drawShieldHealth(ctx) {
    if (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'faceoff' || state.gameState === 'faceOff' || state.gameState === 'faceOffThumbnail')) return;
    if (CONFIG.hudHideOverheadHp) return;
    if (this.hp <= 0 || this._isWinnerReveal || this._isFaceOff || this.hideHpText) return;

    ctx.save();
    const z = this.z || 0;
    const drawY = this.y - z;
    const barW = 34;
    const barH = 4;
    const barX = this.x - barW / 2;
    const barY = drawY - this.r - 14;

    const maxHp = this.shieldMaxHp || 90;
    const curHp = Math.max(0, this.shieldHp || 0);
    const pct = Math.max(0, Math.min(1.0, curHp / maxHp));

    if (!this.isShieldBroken && curHp > 0) {
      // Background track
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      // Shield HP fill (unified with Knight's theme color)
      ctx.fillStyle = this.themeColor || this.color || '#9e9e9e';
      ctx.fillRect(barX, barY, barW * pct, barH);
      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
    } else if (this.shieldBreakEffectTimer > 0) {
      // Broken flash text
      ctx.font = '900 10.5px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('🛡️ BROKEN', this.x, barY + 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('🛡️ BROKEN', this.x, barY + 4);
    }
    ctx.restore();
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
