// ─────────────────────────────────────────────
// Denji (The Chainsaw Devil Hybrid) — Entity & Combat Engine
// Chainsaw Man / Public Safety Special Division 4
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee / Saw Cleaves)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 15 (Physics & Displacement Engine)
// - Rule 16 (Manga Action Speed Line Effects)
// - Rule 18 (HUD Theme Consistency: #EAB308)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawDenjiSkin, drawDenjiAfterImages } from '../../graphics/fighters/denjiSkin.js';
import { drawDenjiSpeedLines, drawDenjiChainsawSmoke } from '../../graphics/weapons/denjiWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { playSound, stopSound, fadeOutSound, fadeInSound, playLoopingSound, stopLoopingSound, fadeOutLoopingSound, isLoopingSoundPlaying } from '../../systems/soundSystem.js';

export class DenjiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'denji';
    this.type = 'denji';
    this.color = '#EAB308'; // Chainsaw Amber Gold
    this.themeColor = '#EAB308';
    this.shredLoopKey = `denji_shred_loop_${this.characterId}_${Math.floor(Math.random() * 1000000)}`;
    this.engineIdleLoopKey = `denji_engine_idle_loop_${this.characterId}_${Math.floor(Math.random() * 1000000)}`;
    this._isShredLoopPlaying = false;
    this._isEngineIdlePlaying = false;
    this._shredTailHandle = null;
    this._engineIdleHandle = null;
    this._shredSustainTimer = 0;
    this._shredAudioPlayTimer = 0;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 360) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & Continuous Shred States
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;
    this.attackCooldown = 0;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.punchComboCount = 0;
    this.sawComboCount = 0;
    this.lastExecutedSawCombo = 0;
    this.comboResetTimer = 0;
    this.isShredding = false;
    this._wasShredding = false;
    this._lastEngineIdlePlayTime = 0;
    this.shredBladeCount = 0;
    this.shredTickTimer = 0;
    this.shredShakeTimer = 0;
    this.shredShakeIntensity = 0;
    this.lastShredAudioTime = 0;
    this._multiBladeIndicatorTimer = 0;
    this.continuousShredTimer = 0;
    this.chainsawSmokeParticles = [];

    // Passive 1: Pochita Heart Revive
    this.reviveStocksMax = cfg.maxReviveStocks || 1;
    this.reviveStocks = this.reviveStocksMax;
    this.isHybridModeActive = true; // Permanently transformed in Chainsaw Devil form by default
    this.isPochitaOverdrive = false;
    this.overdriveTimer = 0;
    this.hybridModeTimer = 0;
    this.hybridModeMaxTimer = cfg.hybridModeDurationFrames || 720;

    // Skill 1: Ripcord Engine Rev Lunge
    this.lungeCooldownMax = cfg.lungeCooldown || 240;
    this.lungeCooldown = this.lungeCooldownMax;
    this.isEngineLunging = false;
    this.lungeWindupTimer = 0;
    this.lungeHitRecoveryTimer = 0;
    this.lungePostSpeedBoostTimer = 0;
    this.afterImages = [];
    this.lungeTimer = 0;
    this.lungeMaxTimer = 20;
    this.lungeVx = 0;
    this.lungeVy = 0;
    this.lungeTarget = null;

    // Skill 2: Blood Intoxication Cleave
    this.cleaveCooldownMax = cfg.cleaveCooldown || 360;
    this.cleaveCooldown = this.cleaveCooldownMax;

    // Ultimate: Massacre Engine
    this.massacreCooldownMax = cfg.ultimateCooldown || 1500;
    this.massacreCooldown = this.massacreCooldownMax;
    this.isExecutingMassacre = false;
    this.massacrePhase = 'IDLE'; // 'IGNITE' | 'CYCLONE' | 'PLUNGE'
    this.massacreTimer = 0;
    this.massacreTarget = null;

    // Declarative Skill Registration
    const denjiSkills = [];
    if (this.isSkillEnabled(cfg.enableEngineLunge, true)) {
      denjiSkills.push({
        id: 'engine_lunge',
        name: 'Engine Lunge',
        type: 'active',
        cooldownKey: 'lungeCooldown',
        cooldownMaxKey: 'lungeCooldownMax'
      });
    }
    if (this.isSkillEnabled(cfg.enableBloodCleave, true)) {
      denjiSkills.push({
        id: 'blood_cleave',
        name: 'Blood Cleave',
        type: 'active',
        cooldownKey: 'cleaveCooldown',
        cooldownMaxKey: 'cleaveCooldownMax'
      });
    }
    if (this.isSkillEnabled(cfg.enableMassacreEngine, true)) {
      denjiSkills.push({
        id: 'massacre_engine',
        name: 'Massacre Engine',
        type: 'ultimate',
        cooldownKey: 'massacreCooldown',
        cooldownMaxKey: 'massacreCooldownMax'
      });
    }
    if (this.skillManager) {
      this.skillManager.registerSkills(denjiSkills);
    }
  }

  takeDamage(amount, attacker = null, opts = {}) {
    if (this.isInvulnerable || this.hp <= 0) return 0;

    const rawDamage = typeof amount === 'number' ? amount : (amount?.damage || 0);
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};

    // Passive 1: Pochita Heart Ripcord Revive Trigger (Intercept lethal damage before fighter death processing)
    if (this.hp <= rawDamage && this.reviveStocks > 0 && !this.isExecutingMassacre) {
      if (this.isSkillEnabled(cfg.enablePochitaRevive, true)) {
        this._triggerPochitaRevive();
        return 0;
      }
    }

    const actualDamage = super.takeDamage(amount, attacker, typeof opts === 'object' && opts !== null ? opts : {});

    if (this.hp <= 0) {
      this._stopEngineIdleAudio(100);
      this._stopShredAudio(false);
      this._stopShredTailAudio();
      this.continuousShredTimer = 0;
      if (this.chainsawSmokeParticles) this.chainsawSmokeParticles.length = 0;
    }

    return actualDamage;
  }

  isEffectivelyAlive() {
    if (this.hp > 0 && !this.isDead && !this.dead) return true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    if (this.isSkillEnabled(cfg.enablePochitaRevive, true) && this.reviveStocks > 0) return true;
    return false;
  }

  _triggerPochitaRevive() {
    this.reviveStocks--;
    this.dead = false;
    this.isDead = false;
    this._hasDied = false;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    const prevHp = this.hp;
    this.hp = Math.round(this.maxHp * (cfg.reviveHpPercent || 0.50));
    const healed = this.hp - prevHp;
    if (healed > 0) {
      this._lastHealAmount = (this._lastHealAmount || 0) + healed;
      this._healthBarHealTimer = 24;
      spawnFloatingText(this.x, this.y - (this.r || 25) - 36, `+${healed}`, '#00FF66');
    }
    this.isHybridModeActive = true;
    this.hybridModeTimer = this.hybridModeMaxTimer;

    // Radial Blood Blast
    triggerGlobalScreenShake(18, 15);
    spawnFloatingText(this.x, this.y - 20, '🫀 POCHITA REVIVE!', '#EAB308');

    this._playSound('reviveParry', 'Assets/Sound Effects/Skills/parry.mp3', 0.90, 1.0);
    this._playSound('reviveBlast', 'Assets/Sound Effects/Skills/genos-dash-noise.mp3', 0.80, 1.0);

    const targets = this._queryAllTargets();
    for (let target of targets) {
      const d = Math.hypot(target.x - this.x, target.y - this.y);
      if (d <= (cfg.reviveShockwaveRadius || 150)) {
        applyDamageToTarget(target, cfg.reviveShockwaveDamage || 45, this);
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        target.knockbackVx = Math.cos(angle) * (cfg.reviveShockwaveKnockback || 32);
        target.knockbackVy = Math.sin(angle) * (cfg.reviveShockwaveKnockback || 32);
      }
    }
  }

  _queryAllTargets(fallbackOpponent = null) {
    if (typeof this._getAllValidEnemyTargets === 'function') {
      const valid = this._getAllValidEnemyTargets(fallbackOpponent);
      if (valid && valid.length > 0) return valid;
    }
    const targets = [];
    if (typeof state !== 'undefined' && state.fighters && Array.isArray(state.fighters)) {
      for (let f of state.fighters) {
        if (f && f !== this && f.hp > 0) {
          if (this.team === undefined || f.team === undefined || f.team !== this.team) {
            targets.push(f);
          }
        }
      }
    }
    if (typeof state !== 'undefined' && state.illusions && Array.isArray(state.illusions)) {
      for (let ill of state.illusions) {
        if (ill && ill !== this && ill.hp > 0) {
          if (this.team === undefined || ill.team === undefined || ill.team !== this.team) {
            targets.push(ill);
          }
        }
      }
    }
    if (targets.length === 0 && fallbackOpponent && fallbackOpponent !== this && fallbackOpponent.hp > 0) {
      targets.push(fallbackOpponent);
    }
    return targets;
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1 Freeze Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isChainedByMakima) {
      this.interruptAttacks();
      // Continuous 3-Blade Chainsaw Shredding is ALWAYS active even while stunned, frozen, paralyzed, or chained!
      const target = this._findBestTarget(opponent) || opponent;
      this._updateChainsawShredCollision(target || opponent);
      this._updateChainsawSmokeParticles();
      return;
    }

    if (this.hp <= 0) {
      this._stopEngineIdleAudio(100);
      this._stopShredAudio(false);
      this._stopShredTailAudio();
      return;
    }

    // 2. Decrement Timers & Overdrive
    if (this.isPochitaOverdrive && this.overdriveTimer > 0) {
      this.overdriveTimer--;
      if (this.overdriveTimer <= 0) {
        this.isPochitaOverdrive = false;
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.lungeCooldown > 0) this.lungeCooldown--;
    if (this.cleaveCooldown > 0) this.cleaveCooldown--;
    if (this.massacreCooldown > 0) this.massacreCooldown--;
    if (this.shredShakeTimer > 0) this.shredShakeTimer--;

    // Temporary speed boost decay & afterimages after Skill 1 breather
    if (this.lungePostSpeedBoostTimer > 0) {
      this.lungePostSpeedBoostTimer--;
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
      const boostMult = cfg.lungePostSpeedBoostMultiplier !== undefined ? cfg.lungePostSpeedBoostMultiplier : 1.45;
      this.speedMultiplier = boostMult;

      if (this.lungePostSpeedBoostTimer % 4 === 0) {
        if (!this.afterImages) this.afterImages = [];
        this.afterImages.push({
          x: this.x,
          y: this.y,
          r: this.r || 25,
          angle: this.gunAngle || this.angle || 0,
          gunAngle: this.gunAngle || this.angle || 0,
          timer: 10,
          maxTimer: 10
        });
      }

      if (this.lungePostSpeedBoostTimer <= 0) {
        this.speedMultiplier = 1.0;
      }
    }

    // Update & clean up ghost model afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // Decrement combo reset timer (resets combo back to Hit 1 after idle)
    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) {
        this.sawComboCount = 0;
        this.punchComboCount = 0;
      }
    }

    // Update world-space steam smoke particles continuously every frame so smoke never freezes
    this._updateChainsawSmokeParticles();

    // 3. Active Skill Execution
    if (this.isExecutingMassacre) {
      this._updateMassacreEngine();
      return;
    }

    if (this.isEngineLunging) {
      this._updateEngineLunge(arena, opponent);
      return;
    }

    if (this.lungeHitRecoveryTimer > 0) {
      this.lungeHitRecoveryTimer--;
      this.vx = 0;
      this.vy = 0;
      const target = this._findBestTarget(opponent) || opponent;
      if (target) this.aim(target);
      // Run continuous 3-blade chainsaw shredding during the recovery breather!
      this._updateChainsawShredCollision(target || opponent);
      this._updateChainsawSmokeParticles();

      // On the exact frame the breather ends, apply temporary speed boost & engine idle sound!
      if (this.lungeHitRecoveryTimer <= 0) {
        const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
        const boostFrames = cfg.lungePostSpeedBoostFrames !== undefined ? cfg.lungePostSpeedBoostFrames : 60;
        const boostMult = cfg.lungePostSpeedBoostMultiplier !== undefined ? cfg.lungePostSpeedBoostMultiplier : 1.45;
        this.lungePostSpeedBoostTimer = boostFrames;
        this.speedMultiplier = boostMult;

        this.resumeMovement(target || opponent, boostMult);
        spawnFloatingText(this.x, this.y - (this.r || 25) - 10, '⚡ SPEED BOOST!', '#FACC15');
        spawnSparks(this.x, this.y, '#FACC15', 8);
        this._playSound('engineIdle', 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_engine_noise.mp3', 0.60, 1.0);
      }
      return;
    }

    // 4. Regular Combat AI
    const target = this._findBestTarget(opponent) || opponent;
    if (target) {
      this.aim(target);
      const dist = Math.hypot(target.x - this.x, target.y - this.y);

      // Ultimate check
      if (this.isSkillEnabled(CONFIG.denji?.enableMassacreEngine, true) && this.massacreCooldown <= 0 && dist < 180) {
        this._startMassacreEngine(target);
        return;
      }

      // Skill 1: Engine Lunge
      if (this.isSkillEnabled(CONFIG.denji?.enableEngineLunge, true) && this.lungeCooldown <= 0 && dist > 100 && dist < 260) {
        this._startEngineLunge(target);
        return;
      }

      // Skill 2: Blood Cleave
      if (this.isSkillEnabled(CONFIG.denji?.enableBloodCleave, true) && this.cleaveCooldown <= 0 && dist > 80 && dist < 160) {
        this._performBloodCleave(target);
        return;
      }
    }

    // 5. Continuous 3-Blade Chainsaw Collision Shred & Overheat Smoke Particles
    this._updateChainsawShredCollision(target || opponent);
    this._updateChainsawSmokeParticles();

    // If not shredding, not dashing, and not in special attack, ensure engine idle is playing
    if (!this.isShredding && !this._isShredLoopPlaying && !this._shredTailHandle && !this.isEngineLunging && !this.isExecutingMassacre) {
      this._playEngineIdle(0);
    }

    super.update(target || opponent, ownerIndex, arena);
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   * Denji uses continuous 3-blade chainsaw collision shred rather than projectile weapons.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Denji shreds continuously on blade contact
  }

  _findBestTarget(opponent = null) {
    const targets = this._queryAllTargets(opponent);
    let best = null;
    let minD = Infinity;
    for (let t of targets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < minD) {
        minD = d;
        best = t;
      }
    }
    return best || opponent;
  }

  /**
   * Helper to calculate squared distance from a point (px, py) to a line segment [(x1, y1), (x2, y2)].
   */
  _pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return (px - projX) * (px - projX) + (py - projY) * (py - projY);
  }

  /**
   * Returns the 3 active chainsaw blade world-space segments:
   * 1. Forehead Blade
   * 2. Lead Right Hand Blade (0.0 rad)
   * 3. Off-Hand Left Hand Blade (0.73 rad)
   */
  _getChainsawBladeWorldSegments() {
    const r = this.r || 25;
    const angle = this.gunAngle || this.angle || 0;
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const sawLen = Math.round(r * 3.1);
    const sawHalfThick = Math.round((sawLen * 369) / 1594 / 2);

    const isLungeState = Boolean(
      this.isEngineLunging || 
      (this.lungeWindupTimer && this.lungeWindupTimer > 0) || 
      (this.lungeHitRecoveryTimer && this.lungeHitRecoveryTimer > 0)
    );

    const leftSawAngle = isLungeState ? 0.0 : 0.73;
    const leftSawX = isLungeState ? (-r * 0.82 + r * 0.5) : (-r * 0.82);
    const rightSawX = isLungeState ? (r * 0.82 + r * 0.5) : (r * 0.82);

    const blades = [
      // 1. Central Forehead Chainsaw Blade
      { id: 'head', name: 'Forehead Saw', lx: r * 0.30, ly: -r * 0.35, lAngle: -0.18, len: sawLen, halfThick: sawHalfThick },
      // 2. Lead Right Hand Chainsaw Blade (Rule 20 lead hand - same scale size as head chainsaw)
      { id: 'right', name: 'Lead Arm Saw', lx: rightSawX, ly: r * 0.38, lAngle: 0.0, len: sawLen, halfThick: sawHalfThick },
      // 3. Off-Hand Left Hand Chainsaw Blade (Rule 20 off-hand - points forward 0.0 during lunge)
      { id: 'left', name: 'Off-Hand Arm Saw', lx: leftSawX, ly: r * 0.38, lAngle: leftSawAngle, len: sawLen, halfThick: sawHalfThick }
    ];

    const segments = [];
    for (let b of blades) {
      const effLy = facingLeft ? -b.ly : b.ly;
      const effLAngle = facingLeft ? -b.lAngle : b.lAngle;

      const startX = this.x + b.lx * cos - effLy * sin;
      const startY = this.y + b.lx * sin + effLy * cos;
      const bladeAngle = angle + effLAngle;
      const endX = startX + Math.cos(bladeAngle) * b.len;
      const endY = startY + Math.sin(bladeAngle) * b.len;

      segments.push({
        id: b.id,
        name: b.name,
        startX,
        startY,
        endX,
        endY,
        halfThick: b.halfThick,
        bladeAngle
      });
    }
    return segments;
  }

  /**
   * Continuous Chainsaw Shred Damage & Multi-Blade Hit-Pause Engine:
   * When an enemy collides with ANY of Denji's 3 active chainsaw blades,
   * they take rapid shred damage matching the chain teeth velocity, with blood, sparks,
   * hit-pause stasis, and 25%-35% vampiric lifesteal.
   *
   * Multi-Blade Simultaneous Shred Bonus:
   * - 1 Blade (Single Saw): Base shred damage (5 dmg / 3 frames), 3 frames hit pause, 35% drag.
   * - 2 Blades (Dual Saw): 1.6x shred damage (8 dmg / 3 frames), 4 frames hit pause, 50% drag, +50% lifesteal, +2 bleed stacks, amber sparks.
   * - 3 Blades (Triple Saw Vortex): 2.4x shred damage (12 dmg / 3 frames), 5 frames hit pause, 65% drag, +100% lifesteal, +3 bleed stacks, crimson sparks & heavy screen shake.
   */
  _updateChainsawShredCollision(opponent) {
    if (!this.isHybridModeActive || this.hp <= 0) {
      this._stopShredAudio(false);
      this._stopShredTailAudio();
      this.isShredding = false;
      this._wasShredding = false;
      this._shredSustainTimer = 0;
      this._shredAudioPlayTimer = 0;
      this.shredBladeCount = 0;
      return;
    }

    if (this.shredTickTimer > 0) {
      this.shredTickTimer--;
    }
    if (this._shredAudioPlayTimer > 0) {
      this._shredAudioPlayTimer--;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    const lingerFrames = cfg.shredAudioLingerFrames !== undefined ? cfg.shredAudioLingerFrames : 4;
    const idleFadeOutMs = cfg.engineIdleFadeOutMs !== undefined ? cfg.engineIdleFadeOutMs : 0;
    const cooldownRate = cfg.chainsawSmokeCooldownRate ?? 2;

    const targets = this._queryAllTargets(opponent);
    if (targets.length === 0) {
      this.continuousShredTimer = Math.max(0, this.continuousShredTimer - cooldownRate);
      if (this._shredSustainTimer > 0 || this._shredAudioPlayTimer > 0) {
        if (this._shredSustainTimer > 0) this._shredSustainTimer--;
      } else {
        if (this._isShredLoopPlaying) {
          this._stopShredAudio(true);
        }
        this.isShredding = false;
        this.shredBladeCount = 0;
        if (this._wasShredding) {
          this._wasShredding = false;
        }
      }
      return;
    }

    const segments = this._getChainsawBladeWorldSegments();
    const collidingTargets = [];

    for (let t of targets) {
      if (!t || t.hp <= 0) continue;
      const targetR = t.r || 20;
      const hitBlades = [];

      for (let seg of segments) {
        const distSq = this._pointToSegmentDistSq(t.x, t.y, seg.startX, seg.startY, seg.endX, seg.endY);
        const hitR = targetR + seg.halfThick + 6;
        if (distSq <= hitR * hitR) {
          hitBlades.push(seg);
        }
      }

      // Point-blank frontal proximity check (contact with Denji's body circle while facing enemy):
      if (hitBlades.length === 0) {
        const bodyDist = Math.hypot(t.x - this.x, t.y - this.y);
        if (bodyDist <= (this.r || 25) + targetR + 10) {
          const angleToTarget = Math.atan2(t.y - this.y, t.x - this.x);
          const denjiFacing = this.gunAngle || this.angle || 0;
          let angleDiff = angleToTarget - denjiFacing;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          if (Math.abs(angleDiff) < Math.PI * 0.70) {
            hitBlades.push(segments[0]); // Connect with head saw
          }
        }
      }

      if (hitBlades.length > 0) {
        collidingTargets.push({ target: t, blades: hitBlades, bladeCount: hitBlades.length });
      }
    }

    if (collidingTargets.length > 0) {
      this.isShredding = true;
      this._wasShredding = true;
      this._shredSustainTimer = lingerFrames; // Configurable linger frames (~0.40s) so audio sustains before fade-out
      this.continuousShredTimer++;

      // Chainsaw Steam Smoke Generation (emits exclusively from Denji's head helmet engine vents)
      const enableSmoke = this.isSkillEnabled(cfg.enableChainsawSmoke ?? cfg.enableChainsawOverheatSmoke, true);
      const smokeStartFrames = cfg.continuousShredSmokeStartFrames ?? 4;
      const smokeMaxFrames = cfg.continuousShredMaxSmokeFrames ?? Math.round((cfg.continuousShredSmokeMaxSec ?? 2.5) * 60) ?? 150;
      const maxParticles = cfg.chainsawSmokeMaxParticles ?? 45;

      if (enableSmoke && this.continuousShredTimer >= smokeStartFrames) {
        // Smoke progress: 0.0 (just started shredding) -> 1.0 (sustained continuous shred overheat)
        const smokeProgress = Math.min(1.0, (this.continuousShredTimer - smokeStartFrames) / Math.max(1, smokeMaxFrames - smokeStartFrames));
        if (!this.chainsawSmokeParticles) this.chainsawSmokeParticles = [];

        if (this.chainsawSmokeParticles.length < maxParticles) {
          const r = this.r || 25;
          const angle = this.gunAngle || this.angle || 0;
          const facingLeft = Math.abs(angle) > Math.PI / 2;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          
          // Spawn chance starts low (0.35) so thin wisps slowly start emerging from his head, scaling up to 0.95 at peak shred
          const spawnChance = 0.35 + smokeProgress * 0.60;
          const numPuffs = 1 + (smokeProgress > 0.35 && Math.random() < smokeProgress ? 1 : 0);

          for (let pIdx = 0; pIdx < numPuffs; pIdx++) {
            if (Math.random() < spawnChance && this.chainsawSmokeParticles.length < maxParticles) {
              // Denji's head engine exhaust cowl anchor (top of head / helmet vent ridges)
              const localHeadX = -r * 0.15 + (Math.random() - 0.5) * (r * 0.35);
              const localHeadY = -r * 0.58 + (Math.random() - 0.5) * (r * 0.25);
              const effHeadY = facingLeft ? -localHeadY : localHeadY;

              const spawnX = this.x + cosA * localHeadX - sinA * effHeadY;
              const spawnY = this.y + sinA * localHeadX + cosA * effHeadY;

              // Steam billows upward in world space with slight backward exhaust drift
              const vx = (Math.random() - 0.5) * (0.6 + smokeProgress * 0.8) - cosA * 0.25;
              const vy = -0.65 - Math.random() * (0.7 + smokeProgress * 1.4);

              const life = Math.floor(24 + Math.random() * (14 + smokeProgress * 20));
              const isEmber = smokeProgress > 0.40 && Math.random() < (0.18 * smokeProgress);

              this.chainsawSmokeParticles.push({
                x: spawnX,
                y: spawnY,
                vx,
                vy,
                r: 2.2 + Math.random() * 1.5 + smokeProgress * 1.5,
                maxR: 5.5 + Math.random() * 3.5 + smokeProgress * 9.0,
                alpha: 0.10 + Math.random() * 0.08 + smokeProgress * 0.12,
                life,
                maxLife: life,
                isEmber,
                heatRatio: smokeProgress
              });
            }
          }
        }
      }

      // Mute / smoothly fade out engine idle every time when shredding
      this._stopEngineIdleAudio(idleFadeOutMs);

      // Play exactly 1 unified chainsaw shred audio loop regardless of number of active blades/enemies
      this._startShredAudioLoop();

      // When shred tick timer fires (every 3 frames, matching chain teeth animation RPM):
      if (this.shredTickTimer <= 0) {
        const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
        const shredInterval = cfg.shredTickInterval || 3;
        const baseDamage = cfg.shredDamagePerTooth || 5;
        const basePauseFrames = cfg.shredHitPauseFrames || 3;
        const enableBonus = cfg.enableMultiBladeBonus !== false;
        const dualMultiplier = enableBonus ? (cfg.dualBladeDamageMultiplier || 1.6) : 1.0;
        const tripleMultiplier = enableBonus ? (cfg.tripleBladeDamageMultiplier || 2.4) : 1.0;
        const dualPauseBonus = enableBonus ? (cfg.dualBladeHitPauseBonus || 1) : 0;
        const triplePauseBonus = enableBonus ? (cfg.tripleBladeHitPauseBonus || 2) : 0;

        this.shredTickTimer = shredInterval;
        this.shredShakeTimer = Math.max(2, Math.min(4, shredInterval));
        this.shredShakeIntensity = 2.0;

        let maxBladesInFrame = 1;

        for (let { target: t, blades, bladeCount } of collidingTargets) {
          if (bladeCount > maxBladesInFrame) {
            maxBladesInFrame = bladeCount;
          }

          // 1. Calculate Multi-Blade Scaled Parameters
          let damageMultiplier = 1.0;
          let pauseFrames = basePauseFrames;
          let dragFactor = 0.65;
          let lifestealBonus = 1.0;
          let hemorrhageAdd = 1;
          let sparkCount = 3;

          if (bladeCount === 2) {
            damageMultiplier = dualMultiplier;
            pauseFrames = basePauseFrames + dualPauseBonus;
            dragFactor = 0.50; // Dual saw grind friction
            lifestealBonus = 1.5; // +50% lifesteal
            hemorrhageAdd = 2; // +2 bleed stacks
            sparkCount = 6;
          } else if (bladeCount >= 3) {
            damageMultiplier = tripleMultiplier;
            pauseFrames = basePauseFrames + triplePauseBonus;
            dragFactor = 0.35; // Triple saw vice lock
            lifestealBonus = 2.0; // 2x lifesteal
            hemorrhageAdd = 3; // +3 bleed stacks
            sparkCount = 10;
          }

          // 2. Deal scaled shred damage (marked as skill to prevent generic basic attack timeStop interruptions)
          const finalDamage = Math.max(1, Math.round(baseDamage * damageMultiplier));
          const targetPrevHp = typeof t.hp === 'number' ? t.hp : 0;
          const damageResult = applyDamageToTarget(t, finalDamage, this, { isSkill: true, isContinuousShred: true });
          const targetActualDamage = Math.max(0, targetPrevHp - (typeof t.hp === 'number' ? t.hp : 0));
          const didDamage = Boolean(damageResult && (targetActualDamage > 0 || (typeof damageResult === 'number' && damageResult > 0)));

          // 3. Mechanical teeth drag & friction slow (holds momentum in the grinding saws without resetting or cancelling the target's active actions)
          t.vx = 0;
          t.vy = 0;
          if (t.knockbackVx !== undefined) t.knockbackVx = 0;
          if (t.knockbackVy !== undefined) t.knockbackVy = 0;
          if (typeof t.applySlow === 'function') {
            t.applySlow(pauseFrames + 3, dragFactor, { isChainsawFriction: true });
          }

          // 5. Spawn Blood Splatters & Chainsaw Sparks at all contacting blade points
          const bloodAngle = Math.atan2(t.y - this.y, t.x - this.x);
          for (let seg of blades) {
            const contactX = (t.x + (seg.startX + seg.endX) * 0.5) * 0.5;
            const contactY = (t.y + (seg.startY + seg.endY) * 0.5) * 0.5;
            if (didDamage) {
              spawnBloodEffect(contactX, contactY, bloodAngle);
            }
            spawnSparks(contactX, contactY, bladeCount >= 3 ? '#EF4444' : (bladeCount === 2 ? '#F59E0B' : '#F97316'), Math.ceil(sparkCount / blades.length));
          }

          // 6. Blood Siphon Lifesteal (Passive 2 with Multi-Blade bonus)
          // Strictly only siphons when damage was actually dealt to an enemy
          if (didDamage && this.isSkillEnabled(cfg.enableBloodSiphon, true)) {
            const damageForHeal = targetActualDamage > 0 ? targetActualDamage : finalDamage;
            const baseRatio = t.isBleeding ? (cfg.bleedingTargetLifestealRatio || 0.35) : (cfg.lifestealRatio || 0.25);
            const lifestealRatio = baseRatio * lifestealBonus;
            const heal = Math.max(1, Math.round(damageForHeal * lifestealRatio));
            const prevHp = this.hp;
            this.hp = Math.min(this.maxHp, this.hp + heal);
            const actualHealed = this.hp - prevHp;
            if (actualHealed > 0) {
              this._lastHealAmount = (this._lastHealAmount || 0) + actualHealed;
              this._healthBarHealTimer = 16;
            }
          }

          // 7. Hemorrhage & Bleed Stacks (Passive 3 with Multi-Blade bonus)
          if (didDamage && this.isSkillEnabled(cfg.enableHemorrhage, true)) {
            t.hemorrhageStacks = Math.min(cfg.maxHemorrhageStacks || 6, (t.hemorrhageStacks || 0) + hemorrhageAdd);
            t.isBleeding = true;
            t.bleedTimer = 90; // 1.5s refresh
          }

          // 8. Multi-Blade Floating Combat Indicator (Throttled per target)
          if (bladeCount >= 2 && (!this._multiBladeIndicatorTimer || this._multiBladeIndicatorTimer <= 0)) {
            if (bladeCount === 2) {
              spawnFloatingText(t.x, t.y - 24, `⚔️ DUAL SHRED! x${dualMultiplier}`, '#F59E0B');
            } else {
              spawnFloatingText(t.x, t.y - 28, `⛓️ TRIPLE SHRED! x${tripleMultiplier}`, '#EF4444');
            }
            this._multiBladeIndicatorTimer = 16;
          }
        }

        this.shredBladeCount = maxBladesInFrame;

        if (this._multiBladeIndicatorTimer > 0) {
          this._multiBladeIndicatorTimer--;
        }

        // 9. Arena shake and character shake scaled dynamically to max blades colliding
        const baseArenaShake = cfg.shredArenaShakeIntensity || 4.0;
        const arenaShakeDuration = cfg.shredArenaShakeDuration || Math.max(3, shredInterval);
        const bladeMultiplier = maxBladesInFrame >= 3 ? 1.6 : (maxBladesInFrame === 2 ? 1.25 : 1.0);
        const finalArenaShake = baseArenaShake * bladeMultiplier;

        this.shredShakeIntensity = maxBladesInFrame >= 3 ? 3.5 : (maxBladesInFrame === 2 ? 2.5 : 1.8);
        triggerGlobalScreenShake(finalArenaShake, arenaShakeDuration);
      }
    } else {
      // Natural cooldown decay for continuous shred timer when not actively shredding targets
      this.continuousShredTimer = Math.max(0, this.continuousShredTimer - cooldownRate);

      // Handle micro-gaps and sustain audio duration before outro
      if (this._shredSustainTimer > 0 || this._shredAudioPlayTimer > 0) {
        if (this._shredSustainTimer > 0) this._shredSustainTimer--;
      } else {
        // When there is truly no more to shred, trigger natural outro tail (0:04 jump)
        if (this._isShredLoopPlaying) {
          this._stopShredAudio(true);
        }
        this.isShredding = false;
        this.shredBladeCount = 0;
        if (this._wasShredding) {
          this._wasShredding = false;
        }
      }

      if (this._multiBladeIndicatorTimer > 0) {
        this._multiBladeIndicatorTimer--;
      }
    }
  }

  /**
   * Updates world-space chainsaw steam smoke particles and thermal buoyancy
   */
  _updateChainsawSmokeParticles() {
    if (!this.chainsawSmokeParticles || this.chainsawSmokeParticles.length === 0) return;
    for (let i = this.chainsawSmokeParticles.length - 1; i >= 0; i--) {
      const p = this.chainsawSmokeParticles[i];
      p.life--;
      if (p.life <= 0) {
        this.chainsawSmokeParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;

      if (p.isEmber) {
        // Friction spark micro-droplet gravity & air drag
        p.vy += 0.08;
        p.vx *= 0.94;
        p.vy *= 0.96;
      } else {
        // Thermal steam buoyancy (rises swiftly, diffuses softly)
        p.vy -= 0.045;
        p.vx *= 0.95;
        p.vy *= 0.96;
        p.r += (p.maxR - p.r) * 0.065;
      }
    }
  }

  _startEngineLunge(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableEngineLunge, true)) return;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    this.isEngineLunging = true;
    this.lungeWindupTimer = cfg.lungeWindupFrames !== undefined ? cfg.lungeWindupFrames : 14;
    this.lungeTimer = this.lungeMaxTimer;
    this.lungeCooldown = this.lungeCooldownMax;
    this.lungeTarget = target;
    this.lungeVx = 0;
    this.lungeVy = 0;
    this.vx = 0;
    this.vy = 0;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.gunAngle = angle;
    this.angle = angle;

    this._stopShredTailAudio();

    // Ensure the chainsaw engine revs and stays audible during the wind-up preparation!
    if (!this._isShredLoopPlaying) {
      this._playEngineIdle(0);
    }

    // Wind-up rev sparks
    spawnSparks(this.x, this.y, '#F97316', 6);
  }

  _updateEngineLunge(arena = null, opponent = null) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};

    // Update world-space steam smoke particles continuously so steam drifts naturally during lunge & windup
    this._updateChainsawSmokeParticles();

    // 1. Wind-up / Engine Rev pause before dashing forward
    if (this.lungeWindupTimer > 0) {
      this.lungeWindupTimer--;
      this.vx = 0;
      this.vy = 0;

      if (this.lungeTarget && this.lungeTarget.hp > 0) {
        const targetAngle = Math.atan2(this.lungeTarget.y - this.y, this.lungeTarget.x - this.x);
        this.gunAngle = targetAngle;
        this.angle = targetAngle;
      }

      // If an enemy collides with the spinning chainsaws during wind-up, shred them!
      this._updateChainsawShredCollision(this.lungeTarget);

      // Maintain chainsaw engine rev audio during windup if not actively shredding an enemy
      if (!this._isShredLoopPlaying && !this._isEngineIdlePlaying) {
        this._playEngineIdle(0);
      }

      // On the exact frame windup completes, calculate dash vector and launch!
      if (this.lungeWindupTimer <= 0) {
        const speed = cfg.lungeSpeed || 28;
        const launchAngle = this.gunAngle || this.angle || 0;
        this.lungeVx = Math.cos(launchAngle) * speed;
        this.lungeVy = Math.sin(launchAngle) * speed;
        this.vx = this.lungeVx;
        this.vy = this.lungeVy;
        spawnSparks(this.x, this.y, '#FACC15', 8);

        this._stopEngineIdleAudio(0);
        this._playSound('dash', 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_dash_noise.mp3', 0.85, 1.0);
        this._playSound('dashVocal', 'Assets/Sound Effects/DenjiSFX/Denji_dash_vocal_noise.mp3', 0.90, 1.0);
      }
      return;
    }

    // 2. Active supersonic dash movement
    this.x += this.lungeVx;
    this.y += this.lungeVy;
    this.lungeTimer--;

    // Strict Arena Wall Collision & Boundary Clamping (Prevents clipping out of arena bounds)
    const effArena = arena || (typeof state !== 'undefined' ? state.arena : null);
    let hitWall = false;
    if (effArena) {
      const r = this.r || 25;
      if (effArena.shape === 'circle') {
        const cx = effArena.x + effArena.width / 2;
        const cy = effArena.y + effArena.height / 2;
        const ar = effArena.radius || (effArena.width / 2);
        const d = Math.hypot(this.x - cx, this.y - cy);
        if (d + r >= ar && d > 0) {
          const nx = (this.x - cx) / d;
          const ny = (this.y - cy) / d;
          this.x = cx + nx * (ar - r);
          this.y = cy + ny * (ar - r);
          hitWall = true;
        }
      } else {
        if (this.x - r < effArena.x) {
          this.x = effArena.x + r;
          hitWall = true;
        } else if (this.x + r > effArena.x + effArena.width) {
          this.x = effArena.x + effArena.width - r;
          hitWall = true;
        }
        if (this.y - r < effArena.y) {
          this.y = effArena.y + r;
          hitWall = true;
        } else if (this.y + r > effArena.y + effArena.height) {
          this.y = effArena.y + effArena.height - r;
          hitWall = true;
        }
      }
    }

    // Continuous chainsaw shredding active during dash movement as well
    this._updateChainsawShredCollision(this.lungeTarget);

    // Spawn ghost model afterimage snapshot (Chainsaw Devil form with 3 chainsaws attached)
    if (!this.afterImages) this.afterImages = [];
    this.afterImages.push({
      x: this.x,
      y: this.y,
      r: this.r || 25,
      angle: this.gunAngle || this.angle || 0,
      gunAngle: this.gunAngle || this.angle || 0,
      timer: 16,
      maxTimer: 16
    });

    const damage = cfg.lungeDamage || 38;
    const stunDuration = cfg.lungeStunDuration || cfg.lungeWallStunFrames || 24;

    const targets = this._queryAllTargets(this.lungeTarget);
    let hitTarget = null;
    for (let t of targets) {
      if (!t || t.hp <= 0) continue;
      const rSum = (this.r || 25) + (t.r || 20);
      if (Math.hypot(t.x - this.x, t.y - this.y) <= rSum + 10) {
        hitTarget = t;
        break;
      }
    }

    if (!hitTarget && this.lungeTarget && this.lungeTarget.hp > 0) {
      if (Math.hypot(this.lungeTarget.x - this.x, this.lungeTarget.y - this.y) < 45) {
        hitTarget = this.lungeTarget;
      }
    }

    if (hitTarget) {
      // Clamp victim inside arena bounds so they aren't pushed out of bounds
      if (effArena) {
        const tr = hitTarget.r || 20;
        if (effArena.shape === 'circle') {
          const cx = effArena.x + effArena.width / 2;
          const cy = effArena.y + effArena.height / 2;
          const ar = effArena.radius || (effArena.width / 2);
          const td = Math.hypot(hitTarget.x - cx, hitTarget.y - cy);
          if (td + tr >= ar && td > 0) {
            hitTarget.x = cx + ((hitTarget.x - cx) / td) * (ar - tr);
            hitTarget.y = cy + ((hitTarget.y - cy) / td) * (ar - tr);
          }
        } else {
          hitTarget.x = Math.max(effArena.x + tr, Math.min(effArena.x + effArena.width - tr, hitTarget.x));
          hitTarget.y = Math.max(effArena.y + tr, Math.min(effArena.y + effArena.height - tr, hitTarget.y));
        }
      }

      applyDamageToTarget(hitTarget, damage, this, { isSkill: true });

      // Apply Hard Stun / Paralyze mechanic to immobilize the victim while Denji shreds them!
      if (typeof hitTarget.applyParalyze === 'function') {
        hitTarget.applyParalyze(stunDuration, { isStunned: true });
      } else if (hitTarget.statusEffects && typeof hitTarget.statusEffects.applyParalyze === 'function') {
        hitTarget.statusEffects.applyParalyze(stunDuration, { isStunned: true });
      } else {
        hitTarget.paralyzeTimer = stunDuration;
        hitTarget.isParalyzed = true;
      }

      if (typeof hitTarget.applyHitStun === 'function') {
        hitTarget.applyHitStun(stunDuration, { isStunned: true });
      }

      // Interrupt any actions the victim was charging/performing
      if (typeof hitTarget.interruptAttacks === 'function') {
        hitTarget.interruptAttacks(true);
      }

      // Halt the victim in place directly in front of Denji's chainsaws (zero blowback)
      hitTarget.vx = 0;
      hitTarget.vy = 0;
      hitTarget.knockbackVx = 0;
      hitTarget.knockbackVy = 0;

      // Keep aim focused on the stunned victim
      const hitAngle = Math.atan2(hitTarget.y - this.y, hitTarget.x - this.x);
      this.gunAngle = hitAngle;
      this.angle = hitAngle;

      // Visual & Audio Impact Feedback
      spawnFloatingText(hitTarget.x, hitTarget.y - 20, '⚡ STUNNED!', '#FACC15');
      spawnImpactFlash(hitTarget.x, hitTarget.y, '#FACC15');
      spawnBloodEffect(hitTarget.x, hitTarget.y, 10);
      spawnSparks(hitTarget.x, hitTarget.y, '#FACC15', 12);

      this._playSound('lungeImpact', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.80, 1.0);

      this.isEngineLunging = false;
      this.lungeWindupTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.lungeVx = 0;
      this.lungeVy = 0;
      this.lungeHitRecoveryTimer = cfg.lungeHitRecoveryFrames !== undefined ? cfg.lungeHitRecoveryFrames : 16;
      
      // Immediately trigger initial chainsaw shred impact tick
      this._updateChainsawShredCollision(hitTarget);
      return;
    }

    // If Denji collided with arena perimeter during dash:
    if (hitWall) {
      const wallDmg = cfg.lungeWallDamage || 38;
      const wallStun = cfg.lungeWallStunFrames || 16;
      for (let t of targets) {
        if (!t || t.hp <= 0) continue;
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= (this.r || 25) + (t.r || 20) + 15) {
          applyDamageToTarget(t, wallDmg, this, { isSkill: true, isWallSmash: true });
          if (typeof t.applyHitStun === 'function') t.applyHitStun(wallStun, { isStunned: true });
          spawnFloatingText(t.x, t.y - 20, '💥 WALL SLAM!', '#EF4444');
        }
      }

      spawnImpactFlash(this.x, this.y, '#FACC15');
      spawnSparks(this.x, this.y, '#FACC15', 14);
      triggerGlobalScreenShake(14, 12);
      this._playSound('lungeImpact', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.85, 1.0);

      this.isEngineLunging = false;
      this.lungeWindupTimer = 0;
      this.lungeTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.lungeVx = 0;
      this.lungeVy = 0;
      this.lungeHitRecoveryTimer = wallStun;
      return;
    }

    if (this.lungeTimer <= 0) {
      this.isEngineLunging = false;
      this.lungeWindupTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.lungeVx = 0;
      this.lungeVy = 0;
      if (!this._isShredLoopPlaying) {
        this._playEngineIdle(0);
      }
    }
  }

  isStationarySkillActive() {
    return Boolean(
      (this.isEngineLunging && this.lungeWindupTimer > 0) ||
      (this.lungeHitRecoveryTimer && this.lungeHitRecoveryTimer > 0) ||
      this.isExecutingMassacre ||
      super.isStationarySkillActive()
    );
  }

  isPerformingSkill() {
    return Boolean(
      this.isEngineLunging ||
      (this.lungeHitRecoveryTimer && this.lungeHitRecoveryTimer > 0) ||
      this.isExecutingMassacre ||
      super.isPerformingSkill()
    );
  }

  _performBloodCleave(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableBloodCleave, true)) return;
    this.cleaveCooldown = this.cleaveCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    target.x = this.x + Math.cos(angle) * 40;
    target.y = this.y + Math.sin(angle) * 40;

    // Clamp victim within arena bounds
    const effArena = (typeof state !== 'undefined' ? state.arena : null);
    if (effArena) {
      const tr = target.r || 20;
      if (effArena.shape === 'circle') {
        const cx = effArena.x + effArena.width / 2;
        const cy = effArena.y + effArena.height / 2;
        const ar = effArena.radius || (effArena.width / 2);
        const td = Math.hypot(target.x - cx, target.y - cy);
        if (td + tr >= ar && td > 0) {
          target.x = cx + ((target.x - cx) / td) * (ar - tr);
          target.y = cy + ((target.y - cy) / td) * (ar - tr);
        }
      } else {
        target.x = Math.max(effArena.x + tr, Math.min(effArena.x + effArena.width - tr, target.x));
        target.y = Math.max(effArena.y + tr, Math.min(effArena.y + effArena.height - tr, target.y));
      }
    }

    applyDamageToTarget(target, 28, this, { isSkill: true });
    this._updateChainsawShredCollision(target);
    this._playSound('cleaveCut', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.85, 1.0);
    this._playSound('engineIdle', 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_engine_noise.mp3', 0.60, 1.0);
    spawnFloatingText(target.x, target.y - 20, 'CHAIN CLEAVE!', '#DC2626');
  }

  _startMassacreEngine(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableMassacreEngine, true)) return;
    this._stopEngineIdleAudio(0);
    this._stopShredAudio(false);
    this._stopShredTailAudio();
    this.isExecutingMassacre = true;
    this.massacreCooldown = this.massacreCooldownMax;
    this.massacreTarget = target;
    this.massacreTimer = 60;
    this.isHybridModeActive = true;
    this.hybridModeTimer = this.hybridModeMaxTimer;

    // Freeze enemies (Rule 5 compliant: enemies only!)
    const enemies = this._queryAllTargets();
    for (let e of enemies) {
      if (typeof e.applyTimeStop === 'function') {
        e.applyTimeStop(35);
      }
    }

    this._playSound('massacreCyclone', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.70, 1.0);
    spawnFloatingText(this.x, this.y - 30, '⛓️ MASSACRE ENGINE!', '#EAB308');
    triggerGlobalScreenShake(20, 25);
  }

  _updateMassacreEngine() {
    this._updateChainsawSmokeParticles();
    this.massacreTimer--;
    if (this.massacreTimer % 8 === 0 && this.massacreTarget) {
      const targetPrevHp = typeof this.massacreTarget.hp === 'number' ? this.massacreTarget.hp : 0;
      const dmgRes = applyDamageToTarget(this.massacreTarget, 15, this);
      const actualDmg = Math.max(0, targetPrevHp - (typeof this.massacreTarget.hp === 'number' ? this.massacreTarget.hp : 0));
      const didDamage = Boolean(dmgRes && (actualDmg > 0 || (typeof dmgRes === 'number' && dmgRes > 0)));

      this.shredShakeTimer = 4;
      this.shredShakeIntensity = 3.5;
      triggerGlobalScreenShake(5.0, 4);

      // Only lifesteal when damage was successfully dealt to the target
      if (didDamage && this.isSkillEnabled(CONFIG.denji?.enableBloodSiphon, true)) {
        const damageForHeal = actualDmg > 0 ? actualDmg : 15;
        const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
        const ratio = cfg.lifestealRatio || 0.25;
        const heal = Math.max(1, Math.round(damageForHeal * ratio));
        const prevHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        const actualHealed = this.hp - prevHp;
        if (actualHealed > 0) {
          this._lastHealAmount = (this._lastHealAmount || 0) + actualHealed;
          this._healthBarHealTimer = 16;
        }
      }
      if (didDamage) {
        spawnBloodEffect(this.massacreTarget.x, this.massacreTarget.y, 8);
      }
    }

    // Continuous chainsaw shredding active throughout Massacre Engine
    this._updateChainsawShredCollision(this.massacreTarget);

    if (this.massacreTimer <= 0) {
      this.isExecutingMassacre = false;
      if (this.massacreTarget) {
        applyDamageToTarget(this.massacreTarget, 50, this, { isSkill: true });
        triggerGlobalScreenShake(24, 20);
        this._playSound('massacrePlunge', 'Assets/Sound Effects/Attacks/groundSmash.mp3', 1.00, 1.0);
      }
      this._playSound('engineIdle', 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_engine_noise.mp3', 0.60, 1.0);
    }
  }

  /**
   * Config-driven sound playback helper with volume and trigger chance evaluation.
   */
  _playSound(key, defaultSrc, defaultVol = 1.0, defaultChance = 1.0) {
    if (key === 'engineIdle') {
      this._playEngineIdle(200);
      return;
    }
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    let src = cfg.sounds?.[key];
    if (!src && key === 'dash') src = cfg.sounds?.lungeDash;
    if (!src && key === 'lungeDash') src = cfg.sounds?.dash;
    if (!src && (key === 'dashVocal' || key === 'dashVoice')) src = cfg.sounds?.dashVocal || cfg.sounds?.dashVoice;
    if (!src) src = defaultSrc;
    if (!src) return;

    let chance = cfg.soundChances?.[key];
    if (chance === undefined && key === 'dash') chance = cfg.soundChances?.lungeDash;
    if (chance === undefined && key === 'lungeDash') chance = cfg.soundChances?.dash;
    if (chance === undefined && (key === 'dashVocal' || key === 'dashVoice')) chance = cfg.soundChances?.dashVocal ?? cfg.soundChances?.dashVoice;
    if (chance === undefined) chance = (cfg[`${key}Chance`] !== undefined) ? cfg[`${key}Chance`] : defaultChance;

    if (typeof chance === 'number' && chance < 1.0 && Math.random() >= chance) {
      return;
    }

    let volume = cfg.soundVolumes?.[key];
    if (volume === undefined && key === 'dash') volume = cfg.soundVolumes?.lungeDash;
    if (volume === undefined && key === 'lungeDash') volume = cfg.soundVolumes?.dash;
    if (volume === undefined && (key === 'dashVocal' || key === 'dashVoice')) volume = cfg.soundVolumes?.dashVocal ?? cfg.soundVolumes?.dashVoice;
    if (volume === undefined) volume = (cfg[`${key}Volume`] !== undefined) ? cfg[`${key}Volume`] : defaultVol;

    try {
      if (typeof playSound === 'function') {
        playSound(src, volume);
      } else if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
        audioSystem.playSFX(src, volume);
      }
    } catch (e) {}
  }

  _startShredAudioLoop() {
    if (this.hp <= 0 || this.dead || this.isDead || (typeof state !== 'undefined' && state.gameState !== 'playing')) {
      return;
    }
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};

    // Mute/stop engine idle and interrupt any active outro tail whenever actively shredding
    this._stopEngineIdleAudio(0);
    this._stopShredTailAudio();

    if (this._isShredLoopPlaying && isLoopingSoundPlaying(this.shredLoopKey)) {
      return;
    }

    const shredSrc = cfg.sounds?.shredHit || 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_shred_noise.mp3';
    const shredVol = (cfg.soundVolumes?.shredHit !== undefined) ? cfg.soundVolumes.shredHit : 0.60;
    const shredChance = (cfg.soundChances?.shredHit !== undefined) ? cfg.soundChances.shredHit : 1.0;
    const loopStart = cfg.shredLoopStartSec !== undefined ? cfg.shredLoopStartSec : 0.0;
    const loopEnd = cfg.shredLoopEndSec !== undefined ? cfg.shredLoopEndSec : 4.0;

    if (shredChance >= 1.0 || Math.random() < shredChance) {
      playLoopingSound(this.shredLoopKey, shredSrc, shredVol, 1.0, 0, loopStart, loopEnd);
      this._isShredLoopPlaying = true;
    }
  }

  _stopShredAudio(playNaturalTail = true) {
    const wasPlaying = this._isShredLoopPlaying;
    if (this.shredLoopKey && this._isShredLoopPlaying) {
      stopLoopingSound(this.shredLoopKey);
    }
    this._isShredLoopPlaying = false;

    if (playNaturalTail && wasPlaying && this.hp > 0 && !this.dead && !this.isDead && typeof state !== 'undefined' && state.gameState === 'playing') {
      this._playShredNaturalTail();
    }
  }

  _playShredNaturalTail() {
    this._stopShredTailAudio();

    if (this.hp <= 0 || this.dead || this.isDead || (typeof state !== 'undefined' && state.gameState !== 'playing')) {
      return;
    }
    if (this._isShredLoopPlaying || this.isEngineLunging || this.isExecutingMassacre) {
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    const shredSrc = cfg.sounds?.shredHit || 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_shred_noise.mp3';
    const shredVol = (cfg.soundVolumes?.shredHit !== undefined) ? cfg.soundVolumes.shredHit : 0.60;
    const tailOffset = cfg.shredTailOffsetSec !== undefined ? cfg.shredTailOffsetSec : 4.0;

    try {
      const handle = playSound({
        src: shredSrc,
        volume: shredVol,
        speed: 1.0,
        offset: tailOffset,
        onEnded: () => {
          if (this._shredTailHandle === handle) {
            this._shredTailHandle = null;
            if (this.hp > 0 && !this.dead && !this.isDead && !this._isShredLoopPlaying && !this.isEngineLunging && !this.isExecutingMassacre) {
              this._playEngineIdle(0);
            }
          }
        }
      });
      this._shredTailHandle = handle;
      if (!handle) {
        this._playEngineIdle(0);
      }
    } catch (e) {
      this._shredTailHandle = null;
      this._playEngineIdle(0);
    }
  }

  _stopShredTailAudio() {
    if (this._shredTailHandle) {
      const handle = this._shredTailHandle;
      this._shredTailHandle = null;
      try {
        stopSound(handle);
      } catch (e) {}
    }
  }

  _playEngineIdle(fadeInMs = 0) {
    if (this.hp <= 0 || this.dead || this.isDead || (typeof state !== 'undefined' && state.gameState !== 'playing')) {
      this._stopEngineIdleAudio(0);
      return;
    }
    const isMidDash = Boolean(this.isEngineLunging && (!this.lungeWindupTimer || this.lungeWindupTimer <= 0));
    // Strict mutual exclusion: NEVER play engine idle while active shred audio loop is playing, during natural tail outro, during mid-dash flight, or during massacre
    if (this._isShredLoopPlaying || this._shredTailHandle || isMidDash || this.isExecutingMassacre) {
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    const chance = (cfg.soundChances?.engineIdle !== undefined) ? cfg.soundChances.engineIdle : 1.0;
    if (typeof chance === 'number' && chance < 1.0 && Math.random() >= chance) {
      return;
    }

    if (this._isEngineIdlePlaying && isLoopingSoundPlaying(this.engineIdleLoopKey)) {
      return;
    }

    const src = cfg.sounds?.engineIdle || 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_engine_noise.mp3';
    const volume = (cfg.soundVolumes?.engineIdle !== undefined) ? cfg.soundVolumes.engineIdle : 0.70;

    try {
      playLoopingSound(this.engineIdleLoopKey, src, volume, 1.0, fadeInMs);
      this._isEngineIdlePlaying = true;
    } catch (e) {}
  }

  _stopEngineIdleAudio(fadeMs = 0) {
    if (this.engineIdleLoopKey && this._isEngineIdlePlaying) {
      if (fadeMs > 0) {
        fadeOutLoopingSound(this.engineIdleLoopKey, fadeMs);
      } else {
        stopLoopingSound(this.engineIdleLoopKey);
      }
    }
    this._isEngineIdlePlaying = false;
  }

  onDeath() {
    this._stopShredAudio(false);
    this._stopShredTailAudio();
    this._stopEngineIdleAudio(50);
    this._shredSustainTimer = 0;
    this._shredAudioPlayTimer = 0;
    this._wasShredding = false;
    this.continuousShredTimer = 0;
    if (this.chainsawSmokeParticles) this.chainsawSmokeParticles.length = 0;
    super.onDeath();
  }

  reset() {
    super.reset();
    this._stopShredAudio(false);
    this._stopShredTailAudio();
    this._stopEngineIdleAudio(0);
    this._wasShredding = false;
    this._shredSustainTimer = 0;
    this._shredAudioPlayTimer = 0;
    this._lastEngineIdlePlayTime = 0;
    this.continuousShredTimer = 0;
    if (this.chainsawSmokeParticles) this.chainsawSmokeParticles.length = 0;
    this.reviveStocks = this.reviveStocksMax || 1;
    this.isHybridModeActive = true;
    this.hp = this.maxHp;
    this.isDead = false;
    this.dead = false;
    this._hasDied = false;
    this.isEngineLunging = false;
    this.lungeWindupTimer = 0;
    this.lungeHitRecoveryTimer = 0;
    this.lungePostSpeedBoostTimer = 0;
    this.isExecutingMassacre = false;
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    if (this.hp <= 0 || this.dead || this.isDead) {
      this._stopShredAudio(false);
      this._stopShredTailAudio();
      this._stopEngineIdleAudio(50);
      this._shredSustainTimer = 0;
      this._shredAudioPlayTimer = 0;
      this._wasShredding = false;
      this.continuousShredTimer = 0;
      if (this.chainsawSmokeParticles) this.chainsawSmokeParticles.length = 0;
    }
  }

  draw(ctx) {
    // 1. Ghost Model Visual Trails during Dash (Chainsaw Devil with 3 attached chainsaws)
    drawDenjiAfterImages(ctx, this);

    // 2. Main Skin Body & Saws
    drawDenjiSkin(ctx, this);

    // 3. Mandatory Overhead HP & Freeze Timer (Rule 21)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  drawBody(ctx) {
    drawDenjiSkin(ctx, this);
  }
}
