// ─────────────────────────────────────────────
// SPARTAN FIGHTER CLASS
// Ancient Greek Hoplite (Option 3: Dory Spear Thrusts + Ranged Javelin Throw)
// Rule 20 (Single-Source-of-Truth Hands), Rule 21 (drawHealth & drawFreezeTimer),
// Rule 23 (Basic Projectile Suppression), Rule 25 (Active VFX Decay), Rule 30 (5-Phase Melee)
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawSpartanSkin, _drawSpartanCrest } from '../../graphics/fighters/spartanSkin.js';
import {
  drawSpartanHoplon,
  drawSpartanSpear,
  drawSpartanJavelin,
  drawSpartanThrustVFX
} from '../../graphics/weapons/spartanWeaponGraphics.js';

export class SpartanFighter extends Fighter {
  constructor(def) {
    super(def);

    // ── Dory Spear Melee Combat Tracking (Rule 30: 5-Phase Architecture) ──
    this.spearCooldown = 0;
    this.spearThrustTimer = 0;
    this.spearThrustMax = 0;
    this.spearLiftFrames = 6;
    this.spearHoldFrames = 2;
    this.spearStrikeFrames = 5;
    this.spearImpactLockFrames = 6;
    this.spearRecoveryFrames = 9;
    this.spearDamage = 32;
    this.spearKnockback = 7.0;
    this.spearLunge = 6.8;
    this.spearHitPause = 8;
    this.spearHitStun = 12;
    this.spearHitDelivered = false;
    this.spearSoundPlayed = false;
    this.spearSlashAngle = 0;
    this.spearTremorX = 0;
    this.spearTremorY = 0;

    // Spear Hit-Pause & Impact Concentric Shockwave (Rule 26)
    this.spearHitPauseTimer = 0;
    this.spearHitPauseMax = 0;
    this.spearHitPauseTargets = [];
    this.spearImpactTimer = 0;
    this.spearImpactX = 0;
    this.spearImpactY = 0;

    // ── Ranged Javelin Throw (Medium/Long Range Active Skill) ──
    const cfg = CONFIG.spartan || {};
    this.javelinCooldown = 60; // Brief ready pause on round start
    this.javelinMaxCooldown = cfg.javelinCooldown || 360;
    this.isThrowingJavelin = false;
    this.javelinWindupTimer = 0;
    this.javelinWindupMax = cfg.javelinWindupFrames || 16;
    this.javelinLockedAngle = 0;
    this.activeJavelins = [];

    // Javelin Detonation Shockwaves
    this.javelinImpactTimer = 0;
    this.javelinImpactX = 0;
    this.javelinImpactY = 0;

    // ── Hoplon Round Bronze Shield (Passive Frontal Deflection) ──
    this.blockFlashTimer = 0;
    this.blockHitPauseTimer = 0;
    this.blockHitPauseMax = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    this.shieldImpactTimer = 0;
    this.shieldImpactX = 0;
    this.shieldImpactY = 0;
    this.shieldHoldTimer = 0;
    this.shieldVisualOffset = 0;
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Spartan uses Dory spear thrusts and heavy Javelin hurls.
  }

  reset() {
    super.reset();

    this.spearCooldown = 0;
    this.spearThrustTimer = 0;
    this.spearThrustMax = 0;
    this.spearHitDelivered = false;
    this.spearSoundPlayed = false;
    this.spearTremorX = 0;
    this.spearTremorY = 0;

    this.spearHitPauseTimer = 0;
    this.spearHitPauseMax = 0;
    this.spearHitPauseTargets = [];
    this.spearImpactTimer = 0;
    this.spearImpactX = 0;
    this.spearImpactY = 0;

    this.javelinCooldown = 60;
    this.isThrowingJavelin = false;
    this.javelinWindupTimer = 0;
    this.javelinLockedAngle = 0;
    this.activeJavelins = [];
    this.javelinImpactTimer = 0;

    this.blockFlashTimer = 0;
    this.blockHitPauseTimer = 0;
    this.blockHitPauseMax = 0;
    this.blockHitPauseAttacker = null;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
    this.shieldImpactTimer = 0;
    this.shieldImpactX = 0;
    this.shieldImpactY = 0;
    this.shieldHoldTimer = 0;
    this.shieldVisualOffset = 0;
  }

  /**
   * Rule 25: Clear active attack states upon CC interruption.
   */
  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.clearAllAttackEffects();
  }

  clearAllAttackEffects() {
    super.clearAllAttackEffects();
    this.spearThrustTimer = 0;
    this.spearTremorX = 0;
    this.spearTremorY = 0;
    this.spearHitDelivered = false;
    this.isThrowingJavelin = false;
    this.javelinWindupTimer = 0;

    if (this.spearHitPauseTargets && this.spearHitPauseTargets.length > 0) {
      for (const tgt of this.spearHitPauseTargets) {
        if (tgt) tgt.suppressFreezeOverlay = false;
      }
      this.spearHitPauseTargets = [];
    }
    this.spearHitPauseTimer = 0;

    if (this.blockHitPauseAttacker) {
      this.blockHitPauseAttacker.suppressFreezeOverlay = false;
      this.blockHitPauseAttacker = null;
    }
    this.blockHitPauseTimer = 0;
    this.shieldTremorX = 0;
    this.shieldTremorY = 0;
  }

  isHitPausing() {
    return Boolean(this.spearHitPauseTimer > 0 || this.blockHitPauseTimer > 0);
  }

  canAim() {
    if (this.isHitPausing() || this.isThrowingJavelin) {
      return false; // Committed aim lock (Rule 1.4)
    }
    return super.canAim();
  }

  canPerformBasicAttack() {
    if (this.isHitPausing() || this.isThrowingJavelin) {
      return false;
    }
    return super.canPerformBasicAttack();
  }

  // ── Hoplon Shield Passive Frontal Deflection ──
  takeDamage(amount, attacker, opts = {}) {
    if (opts && (opts.isHeal || opts.heal) || amount <= 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    const isGuaranteedHit = Boolean(opts && (opts.isSureKill || opts.bypassShield));
    if (!isGuaranteedHit && !(this.timeStopTimer > 0) && attacker && attacker !== this) {
      // Check if attack is coming from the frontal hemisphere (|angleDiff| <= 100 deg)
      const attackAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
      let angleDiff = Math.abs(attackAngle - (this.gunAngle || this.angle || 0));
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);

      if (angleDiff <= (100 * Math.PI) / 180) {
        const blockChance = CONFIG.spartan?.shieldBlockChance ?? 0.35;
        if (Math.random() < blockChance) {
          // Hoplon Bronze Shield Deflects the Hit!
          const pauseFrames = CONFIG.spartan?.blockHitPauseFrames ?? 7;
          if (this.blockHitPauseTimer <= 0) {
            this.blockHitPauseTimer = pauseFrames;
            this.blockHitPauseMax = pauseFrames;
            this.vx = 0;
            this.vy = 0;

            if (opts.isMelee && attacker.hp > 0 && !attacker.isDead) {
              if (typeof attacker.applyTimeStop === 'function') {
                attacker.applyTimeStop(pauseFrames);
              }
              attacker.suppressFreezeOverlay = true;
              attacker.vx = 0;
              attacker.vy = 0;
              this.blockHitPauseAttacker = attacker;
            }
          }

          this.blockFlashTimer = CONFIG.spartan?.blockFlashFrames || 16;
          this.shieldHoldTimer = CONFIG.spartan?.shieldHoldFrames || 45;
          this.shieldVisualOffset = 0.30;

          const shieldAngle = (this.gunAngle || 0) + this.shieldVisualOffset;
          this.shieldImpactX = this.x + Math.cos(shieldAngle) * (this.r + 12);
          this.shieldImpactY = this.y + Math.sin(shieldAngle) * (this.r + 12);
          this.shieldImpactTimer = 12;

          // Sound: shield block deflection
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              const snd = CONFIG.spartan?.sounds?.shieldBlock || 'Assets/Sound Effects/Skills/shieldblock2.mp3';
              const vol = CONFIG.spartan?.soundVolumes?.shieldBlock ?? 0.95;
              audioSystem.playSFX(snd, vol);
            }
          } catch (e) {}

          triggerGlobalScreenShake(2.2, 4);
          return false; // Deflected!
        }
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  // ── Find Optimal Target in Reach ──
  _findBestMeleeTarget(opponent, reach) {
    const maxDist = this.r + reach;
    if (opponent && !opponent.isDead && (opponent.hp > 0)) {
      const dSq = (opponent.x - this.x) ** 2 + (opponent.y - this.y) ** 2;
      const targetReach = maxDist + (opponent.r || 25);
      if (dSq <= targetReach * targetReach) {
        return opponent;
      }
    }

    const enemyFighters = state.fighters || [];
    let bestFighter = null;
    let bestDistSq = Infinity;
    for (const enemy of enemyFighters) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable) continue;
      const dSq = (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2;
      const enemyMaxDist = maxDist + (enemy.r || 25);
      if (dSq <= enemyMaxDist * enemyMaxDist && dSq < bestDistSq) {
        bestDistSq = dSq;
        bestFighter = enemy;
      }
    }
    return bestFighter;
  }

  _getTargetsInFrontalCone(reach, arcAngle) {
    const targets = [];
    const allEnemies = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];
    for (const enemy of allEnemies) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (enemy.r || 25)) {
        const angleToEnemy = Math.atan2(dy, dx);
        let diff = Math.abs(angleToEnemy - this.spearSlashAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        diff = Math.abs(diff);
        if (diff <= arcAngle / 2) {
          targets.push(enemy);
        }
      }
    }
    return targets;
  }

  // ── Dory Spear Melee Thrust (Rule 30: 5-Phase Timing) ──
  _trySpearThrust(opponent) {
    if (this.spearCooldown > 0 || this.spearThrustTimer > 0 || this.isHitPausing() || this.isThrowingJavelin) return;
    const reach = (CONFIG.spartan?.spearRange || 95);
    const target = this._findBestMeleeTarget(opponent, reach);
    if (!target) return;

    const cfg = CONFIG.spartan || {};
    this.spearLiftFrames = cfg.hitLiftFrames ?? 6;
    this.spearHoldFrames = cfg.hitHoldFrames ?? 2;
    this.spearStrikeFrames = cfg.hitStrikeFrames ?? 5;
    this.spearImpactLockFrames = cfg.hitImpactLockFrames ?? 6;
    this.spearRecoveryFrames = cfg.hitRecoveryFrames ?? 9;
    this.spearDamage = cfg.spearDamage ?? 32;
    this.spearKnockback = cfg.hitKnockback ?? 7.0;
    this.spearLunge = cfg.hitLungeSpeed ?? 6.8;
    this.spearHitPause = cfg.hitHitPauseFrames ?? 8;
    this.spearHitStun = cfg.hitHitStunFrames ?? 12;

    const totalFrames = this.spearLiftFrames + this.spearHoldFrames + this.spearStrikeFrames + this.spearImpactLockFrames + this.spearRecoveryFrames;
    this.spearThrustTimer = totalFrames;
    this.spearThrustMax = totalFrames;
    this.spearSlashAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.gunAngle = this.spearSlashAngle;
    this.angle = this.spearSlashAngle;
    this.spearHitDelivered = false;
    this.spearSoundPlayed = false;
    this.spearCooldown = cfg.spearCooldown || 34;

    // Phase 1: Draw spear back audio
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.40);
      }
    } catch (e) {}
  }

  // ── Javelin Ranged Hurl (Medium/Long Range Active Skill) ──
  _tryJavelinHurl(opponent) {
    if (this.javelinCooldown > 0 || this.isThrowingJavelin || this.spearThrustTimer > 0 || this.isHitPausing()) return;
    if (!opponent || opponent.isDead || opponent.hp <= 0) return;

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const minRange = CONFIG.spartan?.javelinMinRange || 110;

    // Only throw if enemy is at medium to long range
    if (dist < minRange) return;

    this.isThrowingJavelin = true;
    this.javelinWindupMax = CONFIG.spartan?.javelinWindupFrames || 16;
    this.javelinWindupTimer = this.javelinWindupMax;
    this.javelinLockedAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.javelinLockedAngle;
    this.angle = this.javelinLockedAngle;
    this.javelinCooldown = CONFIG.spartan?.javelinCooldown || 360;

    // Windup whoosh
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.50);
      }
    } catch (e) {}
  }

  _releaseJavelin() {
    this.isThrowingJavelin = false;
    const cfg = CONFIG.spartan || {};
    const jSpeed = cfg.javelinSpeed || 17.5;
    const spawnDist = this.r + 18;
    const spawnX = this.x + Math.cos(this.javelinLockedAngle) * spawnDist;
    const spawnY = this.y + Math.sin(this.javelinLockedAngle) * spawnDist;

    this.activeJavelins.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(this.javelinLockedAngle) * jSpeed,
      vy: Math.sin(this.javelinLockedAngle) * jSpeed,
      angle: this.javelinLockedAngle,
      damage: cfg.javelinDamage || 52,
      knockback: cfg.javelinKnockback || 14.0,
      radius: cfg.javelinRadius || 5,
      life: cfg.javelinLifeFrames || 120,
      maxLife: cfg.javelinLifeFrames || 120,
      hitTargets: new Set()
    });

    // Recoil push
    this.vx -= Math.cos(this.javelinLockedAngle) * 3.2;
    this.vy -= Math.sin(this.javelinLockedAngle) * 3.2;

    // Sound: Hypersonic javelin release
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
      }
    } catch (e) {}

    triggerGlobalScreenShake(2.5, 4);
  }

  _updateActiveJavelins(arena) {
    if (!this.activeJavelins || this.activeJavelins.length === 0) return;

    for (let i = this.activeJavelins.length - 1; i >= 0; i--) {
      const jav = this.activeJavelins[i];
      jav.x += jav.vx;
      jav.y += jav.vy;
      jav.life--;

      // Arena wall collision
      let hitWall = false;
      if (arena) {
        if (jav.x < arena.x || jav.x > arena.x + arena.width || jav.y < arena.y || jav.y > arena.y + arena.height) {
          hitWall = true;
        }
      }

      if (hitWall || jav.life <= 0) {
        this.activeJavelins.splice(i, 1);
        continue;
      }

      // Enemy target collision check
      const allEnemies = [
        ...(state.fighters || []),
        ...(state.illusions || [])
      ];

      for (const enemy of allEnemies) {
        if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
        if (this.isTeammate && this.isTeammate(enemy)) continue;
        if (jav.hitTargets.has(enemy)) continue;

        const dist = Math.hypot(enemy.x - jav.x, enemy.y - jav.y);
        if (dist <= (enemy.r || 25) + jav.radius) {
          jav.hitTargets.add(enemy);

          // Apply heavy impale damage
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(jav.damage, this, {
              isRanged: true,
              isPierce: true
            });
          }

          // Massive knockback impulse
          const kbAngle = jav.angle;
          enemy.vx += Math.cos(kbAngle) * jav.knockback;
          enemy.vy += Math.sin(kbAngle) * jav.knockback;

          if (typeof enemy.applyHitStun === 'function') {
            enemy.applyHitStun(16);
          }

          // Spawn concentric impact shockwave
          this.javelinImpactX = jav.x;
          this.javelinImpactY = jav.y;
          this.javelinImpactTimer = 16;

          // Sound: Heavy impale punch + slice
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.95);
              audioSystem.playSFX('Assets/Sound Effects/Attacks/Sukuna-slice.mp3', 0.90);
            }
          } catch (e) {}

          triggerGlobalScreenShake(4.5, 8);
          this.activeJavelins.splice(i, 1);
          break;
        }
      }
    }
  }

  // ── Main Update Loop ──
  update(opponent, ownerIndex, arena) {
    // 0. Rule 25: Decay active visual effects before freeze guard
    if (this.spearImpactTimer > 0) this.spearImpactTimer--;
    if (this.shieldImpactTimer > 0) this.shieldImpactTimer--;
    if (this.javelinImpactTimer > 0) this.javelinImpactTimer--;
    this._updateActiveJavelins(arena);

    this.handleStatusEffects();

    // 1. Mandatory freeze & time-stop guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // 2. Shield Deflection Hit-Pause Processing
    if (this.blockHitPauseTimer > 0) {
      this.blockHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.shieldTremorX = (Math.random() - 0.5) * 2.2;
      this.shieldTremorY = (Math.random() - 0.5) * 2.2;

      if (this.blockHitPauseAttacker && this.blockHitPauseAttacker.hp > 0 && !this.blockHitPauseAttacker.isDead) {
        this.blockHitPauseAttacker.vx = 0;
        this.blockHitPauseAttacker.vy = 0;
        if (typeof this.blockHitPauseAttacker.applyTimeStop === 'function') {
          this.blockHitPauseAttacker.applyTimeStop(this.blockHitPauseTimer);
        }
      }

      if (this.blockHitPauseTimer === 0) {
        if (this.blockHitPauseAttacker) {
          const att = this.blockHitPauseAttacker;
          att.suppressFreezeOverlay = false;
          att.timeStopTimer = 0;
          const pushA = Math.atan2(att.y - this.y, att.x - this.x);
          att.vx += Math.cos(pushA) * 3.5;
          att.vy += Math.sin(pushA) * 3.5;
          if (typeof att.applyHitStun === 'function') att.applyHitStun(10);
        }
        this.blockHitPauseAttacker = null;
        this.shieldTremorX = 0;
        this.shieldTremorY = 0;
      }
      return;
    }

    // 3. Spear Strike Impact Lock Freeze Processing (Phase 4)
    if (this.spearHitPauseTimer > 0) {
      this.spearHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.spearTremorX = (Math.random() - 0.5) * 2.5;
      this.spearTremorY = (Math.random() - 0.5) * 2.5;

      if (this.spearHitPauseTargets && this.spearHitPauseTargets.length > 0) {
        for (const tgt of this.spearHitPauseTargets) {
          if (tgt && tgt.hp > 0 && !tgt.isDead) {
            tgt.vx = 0;
            tgt.vy = 0;
            if (typeof tgt.applyTimeStop === 'function') {
              tgt.applyTimeStop(this.spearHitPauseTimer);
            }
          }
        }
      }

      if (this.spearHitPauseTimer === 0) {
        if (this.spearHitPauseTargets && this.spearHitPauseTargets.length > 0) {
          for (const tgt of this.spearHitPauseTargets) {
            if (tgt) tgt.suppressFreezeOverlay = false;
          }
          this.spearHitPauseTargets = [];
        }
        this.spearTremorX = 0;
        this.spearTremorY = 0;
      }
      return;
    }

    // 4. Cooldown Timers
    if (this.spearCooldown > 0) this.spearCooldown--;
    if (this.javelinCooldown > 0) this.javelinCooldown--;
    if (this.blockFlashTimer > 0) this.blockFlashTimer--;
    if (this.shieldHoldTimer > 0) {
      this.shieldHoldTimer--;
      if (this.shieldHoldTimer === 0) this.shieldVisualOffset = 0;
    }

    // 5. Javelin Windup Processing
    if (this.isThrowingJavelin) {
      this.javelinWindupTimer--;
      this.vx *= 0.85;
      this.vy *= 0.85;
      if (this.javelinWindupTimer <= 0) {
        this._releaseJavelin();
      }
      return;
    }

    // 6. 5-Phase Spear Melee Animation Lifecycle (Rule 30)
    if (this.spearThrustTimer > 0) {
      this.spearThrustTimer--;
      const elapsed = this.spearThrustMax - this.spearThrustTimer;
      const liftEnd = this.spearLiftFrames;
      const holdEnd = liftEnd + this.spearHoldFrames;
      const strikeEnd = holdEnd + this.spearStrikeFrames;
      const pinEnd = strikeEnd + this.spearImpactLockFrames;

      if (elapsed <= liftEnd) {
        // Phase 1: Lift / Coil
        this.vx *= 0.90;
        this.vy *= 0.90;
      } else if (elapsed <= holdEnd) {
        // Phase 2: Poised Hold
        this.vx *= 0.80;
        this.vy *= 0.80;
      } else if (elapsed <= strikeEnd) {
        // Phase 3: Hypersonic Whip Thrust
        const strikeP = (elapsed - holdEnd) / this.spearStrikeFrames;
        const lungeSpeed = this.spearLunge * Math.pow(strikeP, 1.8);
        this.vx = Math.cos(this.spearSlashAngle) * lungeSpeed;
        this.vy = Math.sin(this.spearSlashAngle) * lungeSpeed;

        if (!this.spearSoundPlayed) {
          this.spearSoundPlayed = true;
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.90);
            }
          } catch (e) {}
        }

        // Deliver impact at mid-strike
        if (strikeP >= 0.50 && !this.spearHitDelivered) {
          this.spearHitDelivered = true;
          const reach = (CONFIG.spartan?.spearRange || 95);
          const arcAngle = ((CONFIG.spartan?.spearArcAngle || 55) * Math.PI) / 180;
          const targets = this._getTargetsInFrontalCone(reach, arcAngle);

          if (targets.length > 0) {
            this.spearHitPauseTimer = this.spearHitPause;
            this.spearHitPauseMax = this.spearHitPause;
            this.spearHitPauseTargets = [...targets];

            // Concentric spear impact shockwave
            const spearTipDist = this.r + reach * 0.85;
            this.spearImpactX = this.x + Math.cos(this.spearSlashAngle) * spearTipDist;
            this.spearImpactY = this.y + Math.sin(this.spearSlashAngle) * spearTipDist;
            this.spearImpactTimer = 14;

            for (const tgt of targets) {
              tgt.takeDamage(this.spearDamage, this, {
                isMelee: true,
                isPierce: true
              });

              tgt.vx = Math.cos(this.spearSlashAngle) * this.spearKnockback;
              tgt.vy = Math.sin(this.spearSlashAngle) * this.spearKnockback;

              if (typeof tgt.applyHitStun === 'function') {
                tgt.applyHitStun(this.spearHitStun);
              }
            }

            // Layered fleshy slap audio
            try {
              if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
                audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.0);
                audioSystem.playSFX('Assets/Sound Effects/Attacks/Sukuna-slice.mp3', 0.90);
              }
            } catch (e) {}

            triggerGlobalScreenShake(3.0, 6);
          }
        }
      } else if (elapsed <= pinEnd) {
        // Phase 4: Impact Lock Clamp
        this.vx = 0;
        this.vy = 0;
      } else {
        // Phase 5: Recovery Settle
        this.vx *= 0.85;
        this.vy *= 0.85;
      }
    }

    // 7. Tactical AI Decision Matrix
    if (this.canPerformBasicAttack()) {
      // Prioritize ranged Javelin throw if distance > 110px
      if (this.javelinCooldown <= 0) {
        this._tryJavelinHurl(opponent);
      }
      // Otherwise engage with spear thrusts
      if (this.spearCooldown <= 0 && this.spearThrustTimer <= 0) {
        this._trySpearThrust(opponent);
      }
    }

    // 8. Physics & Wall Collisions
    super.update(opponent, ownerIndex, arena);
  }

  // ── Render Pipeline ──
  draw(ctx) {
    // 1. Spear Impact Concentric Shockwave (Rule 26)
    if (this.spearImpactTimer > 0) {
      const ip = 1 - (this.spearImpactTimer / 14);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      const r1 = 8 + Math.pow(ip, 0.7) * 32;
      ctx.beginPath();
      ctx.arc(this.spearImpactX, this.spearImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 2.4 * (1 - ip);
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.90 * ringAlpha})`;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Shield Deflection Shockwave (Rule 26)
    if (this.shieldImpactTimer > 0) {
      const ip = 1 - (this.shieldImpactTimer / 12);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      const r1 = 6 + Math.pow(ip, 0.7) * 28;
      ctx.beginPath();
      ctx.arc(this.shieldImpactX, this.shieldImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 2.2 * (1 - ip);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ringAlpha})`;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Javelin Impact Shockwave (Rule 26)
    if (this.javelinImpactTimer > 0) {
      const ip = 1 - (this.javelinImpactTimer / 16);
      const ringAlpha = Math.max(0, 1 - ip);

      ctx.save();
      const r1 = 10 + Math.pow(ip, 0.7) * 42;
      ctx.beginPath();
      ctx.arc(this.javelinImpactX, this.javelinImpactY, r1, 0, Math.PI * 2);
      ctx.lineWidth = 3.0 * (1 - ip);
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.95 * ringAlpha})`;
      ctx.stroke();
      ctx.restore();
    }

    // 4. In-Flight Javelins
    if (this.activeJavelins && this.activeJavelins.length > 0) {
      for (const jav of this.activeJavelins) {
        drawSpartanJavelin(ctx, jav.x, jav.y, jav.angle);
      }
    }

    // 5. Base Entity Pipeline & Mandatory Rule 21 Overhead HP/Status
    super.draw(ctx);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  /**
   * Draws Spartan weapons: Hoplon Shield (left) and Dory Spear (right).
   */
  drawGun(ctx) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    const ga = this.isThrowingJavelin ? this.javelinLockedAngle : (this.gunAngle || this.angle || 0);

    // Apply shield tremor during deflection hit-pause
    const stx = (this.blockHitPauseTimer > 0 && this.shieldTremorX) ? this.shieldTremorX : 0;
    const sty = (this.blockHitPauseTimer > 0 && this.shieldTremorY) ? this.shieldTremorY : 0;

    // Draw Hoplon round bronze shield on the left flank
    drawSpartanHoplon(ctx, this.x + stx, this.y + sty, ga, this.blockFlashTimer, this.r, this.shieldVisualOffset);

    // Calculate spear thrust lunge offset
    let thrustLunge = 0;
    let isThrusting = false;
    if (this.spearThrustTimer > 0) {
      isThrusting = true;
      const elapsed = this.spearThrustMax - this.spearThrustTimer;
      const liftEnd = this.spearLiftFrames;
      const holdEnd = liftEnd + this.spearHoldFrames;
      const strikeEnd = holdEnd + this.spearStrikeFrames;
      const pinEnd = strikeEnd + this.spearImpactLockFrames;

      if (elapsed <= liftEnd) {
        thrustLunge = -(elapsed / liftEnd) * 12; // Pull back
      } else if (elapsed <= holdEnd) {
        thrustLunge = -12; // Poised hold
      } else if (elapsed <= strikeEnd) {
        const sp = (elapsed - holdEnd) / this.spearStrikeFrames;
        thrustLunge = -12 + (sp * 38); // Forward pierce
      } else if (elapsed <= pinEnd) {
        thrustLunge = 26; // Locked at peak extension
      } else {
        const rp = (elapsed - pinEnd) / this.spearRecoveryFrames;
        thrustLunge = 26 * (1 - rp);
      }
    }

    // Javelin windup pull-back
    if (this.isThrowingJavelin) {
      const wp = 1 - (this.javelinWindupTimer / this.javelinWindupMax);
      thrustLunge = -18 * Math.sin(wp * Math.PI * 0.5);
    }

    const tx = ((this.spearThrustTimer > 0 || this.spearHitPauseTimer > 0) && this.spearTremorX) ? this.spearTremorX : 0;
    const ty = ((this.spearThrustTimer > 0 || this.spearHitPauseTimer > 0) && this.spearTremorY) ? this.spearTremorY : 0;

    // Draw Dory spear on the right flank
    drawSpartanSpear(ctx, this.x + tx, this.y + ty, ga, this.r, thrustLunge, isThrusting);

    // Draw supersonic thrust VFX during strike phase
    if (this.spearThrustTimer > 0) {
      const elapsed = this.spearThrustMax - this.spearThrustTimer;
      const holdEnd = this.spearLiftFrames + this.spearHoldFrames;
      const strikeEnd = holdEnd + this.spearStrikeFrames;
      if (elapsed > holdEnd && elapsed <= strikeEnd + 4) {
        const sp = Math.min(1.0, (elapsed - holdEnd) / (this.spearStrikeFrames + 4));
        const reach = CONFIG.spartan?.spearRange || 95;
        drawSpartanThrustVFX(ctx, this.x, this.y, ga, reach, sp);
      }
    }
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

    drawSpartanSkin(ctx, this);
    this.drawStatusOverlays(ctx, this.r);
    ctx.restore();
  }

  drawBody(ctx) {
    this.drawSkin(ctx);
  }
}
