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
import { drawDenjiSkin } from '../../graphics/fighters/denjiSkin.js';
import { drawDenjiSpeedLines } from '../../graphics/weapons/denjiWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class DenjiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'denji';
    this.type = 'denji';
    this.color = '#EAB308'; // Chainsaw Amber Gold
    this.themeColor = '#EAB308';

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
    this.shredBladeCount = 0;
    this.shredTickTimer = 0;
    this.lastShredAudioTime = 0;
    this._multiBladeIndicatorTimer = 0;

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
    this.skillManager.registerSkills(denjiSkills);
  }

  takeDamage(amount, attacker = null) {
    if (this.isInvulnerable || this.hp <= 0) return 0;
    const actualDamage = super.takeDamage(amount, attacker);

    // Passive 1: Pochita Heart Ripcord Revive Trigger
    if (this.isSkillEnabled(CONFIG.denji?.enablePochitaRevive, true) && this.hp <= 0 && this.reviveStocks > 0 && !this.isExecutingMassacre) {
      this._triggerPochitaRevive();
    }

    return actualDamage;
  }

  _triggerPochitaRevive() {
    this.reviveStocks--;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.denji) ? CONFIG.denji : {};
    this.hp = Math.round(this.maxHp * (cfg.reviveHpPercent || 0.50));
    this.isHybridModeActive = true;
    this.hybridModeTimer = this.hybridModeMaxTimer;

    // Radial Blood Blast
    triggerGlobalScreenShake(18, 15);
    spawnFloatingText(this.x, this.y - 20, '🫀 POCHITA REVIVE!', '#EAB308');

    try {
      audioSystem.playSound('Assets/Sound Effects/Skills/parry.mp3', { volume: 0.9 });
      audioSystem.playSound('Assets/Sound Effects/Skills/genos-dash-noise.mp3', { volume: 0.8 });
    } catch (e) {}

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
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

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

    // Decrement combo reset timer (resets combo back to Hit 1 after idle)
    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) {
        this.sawComboCount = 0;
        this.punchComboCount = 0;
      }
    }

    // 3. Active Skill Execution
    if (this.isExecutingMassacre) {
      this._updateMassacreEngine();
      return;
    }

    if (this.isEngineLunging) {
      this._updateEngineLunge();
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

    // 5. Continuous 3-Blade Chainsaw Collision Shred
    this._updateChainsawShredCollision(target || opponent);

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

    const blades = [
      // 1. Central Forehead Chainsaw Blade
      { id: 'head', name: 'Forehead Saw', lx: r * 0.30, ly: -r * 0.35, lAngle: -0.18, len: Math.round(r * 3.1), halfThick: 9 },
      // 2. Lead Right Hand Chainsaw Blade (Rule 20 lead hand)
      { id: 'right', name: 'Lead Arm Saw', lx: r * 0.82, ly: r * 0.38, lAngle: 0.0, len: 56, halfThick: 7 },
      // 3. Off-Hand Left Hand Chainsaw Blade (Rule 20 off-hand)
      { id: 'left', name: 'Off-Hand Arm Saw', lx: -r * 0.82, ly: r * 0.38, lAngle: 0.73, len: 56, halfThick: 7 }
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
      this.isShredding = false;
      this.shredBladeCount = 0;
      return;
    }

    if (this.shredTickTimer > 0) {
      this.shredTickTimer--;
    }

    const targets = this._queryAllTargets(opponent);
    if (targets.length === 0) {
      this.isShredding = false;
      this.shredBladeCount = 0;
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

        const now = Date.now();
        if (now - (this.lastShredAudioTime || 0) > 90) {
          this.lastShredAudioTime = now;
          try {
            audioSystem.playSound('Assets/Sound Effects/Attacks/heavypunch1.mp3', { volume: 0.55 });
          } catch (e) {}
        }

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

          // 2. Deal scaled shred damage
          const finalDamage = Math.max(1, Math.round(baseDamage * damageMultiplier));
          applyDamageToTarget(t, finalDamage, this);

          // 3. Apply Multi-Blade Hit-Pause (pauses enemy completely on each chain tooth impact tick)
          if (typeof t.applyTimeStop === 'function') {
            t.applyTimeStop(pauseFrames);
          } else if (typeof t.timeStopTimer === 'number') {
            t.timeStopTimer = Math.max(t.timeStopTimer, pauseFrames);
          }

          // 4. Mechanical teeth friction & drag (locks enemy momentum in the grinding saws)
          t.vx = 0;
          t.vy = 0;
          if (t.knockbackVx !== undefined) t.knockbackVx = 0;
          if (t.knockbackVy !== undefined) t.knockbackVy = 0;

          // 5. Spawn Blood Splatters & Chainsaw Sparks at all contacting blade points
          const bloodAngle = Math.atan2(t.y - this.y, t.x - this.x);
          for (let seg of blades) {
            const contactX = (t.x + (seg.startX + seg.endX) * 0.5) * 0.5;
            const contactY = (t.y + (seg.startY + seg.endY) * 0.5) * 0.5;
            spawnBloodEffect(contactX, contactY, bloodAngle);
            spawnSparks(contactX, contactY, bladeCount >= 3 ? '#EF4444' : (bladeCount === 2 ? '#F59E0B' : '#F97316'), Math.ceil(sparkCount / blades.length));
          }

          // 6. Blood Siphon Lifesteal (Passive 2 with Multi-Blade bonus)
          if (this.isSkillEnabled(cfg.enableBloodSiphon, true)) {
            const baseRatio = t.isBleeding ? (cfg.bleedingTargetLifestealRatio || 0.35) : (cfg.lifestealRatio || 0.25);
            const lifestealRatio = baseRatio * lifestealBonus;
            const heal = Math.max(1, Math.round(finalDamage * lifestealRatio));
            this.hp = Math.min(this.maxHp, this.hp + heal);
          }

          // 7. Hemorrhage & Bleed Stacks (Passive 3 with Multi-Blade bonus)
          if (this.isSkillEnabled(cfg.enableHemorrhage, true)) {
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

        // 9. Screen shake scaled dynamically to max blades colliding
        const shakePower = maxBladesInFrame >= 3 ? 5 : (maxBladesInFrame === 2 ? 3 : 2);
        triggerGlobalScreenShake(shakePower, 2);
      }
    } else {
      this.isShredding = false;
      this.shredBladeCount = 0;
      if (this._multiBladeIndicatorTimer > 0) {
        this._multiBladeIndicatorTimer--;
      }
    }
  }

  _startEngineLunge(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableEngineLunge, true)) return;
    this.isEngineLunging = true;
    this.lungeTimer = this.lungeMaxTimer;
    this.lungeCooldown = this.lungeCooldownMax;
    this.lungeTarget = target;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.lungeVx = Math.cos(angle) * 28;
    this.lungeVy = Math.sin(angle) * 28;

    try {
      audioSystem.playSound('Assets/Sound Effects/Skills/genos-dash-noise.mp3', { volume: 0.8 });
    } catch (e) {}
  }

  _updateEngineLunge() {
    this.x += this.lungeVx;
    this.y += this.lungeVy;
    this.lungeTimer--;

    if (this.lungeTarget && Math.hypot(this.lungeTarget.x - this.x, this.lungeTarget.y - this.y) < 40) {
      applyDamageToTarget(this.lungeTarget, 38, this);
      this.lungeTarget.knockbackVx = this.lungeVx * 0.8;
      this.lungeTarget.knockbackVy = this.lungeVy * 0.8;
      triggerGlobalScreenShake(14, 10);
      this.isEngineLunging = false;
      return;
    }

    if (this.lungeTimer <= 0) {
      this.isEngineLunging = false;
    }
  }

  _performBloodCleave(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableBloodCleave, true)) return;
    this.cleaveCooldown = this.cleaveCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    target.x = this.x + Math.cos(angle) * 40;
    target.y = this.y + Math.sin(angle) * 40;
    applyDamageToTarget(target, 28, this);
    spawnFloatingText(target.x, target.y - 20, 'CHAIN CLEAVE!', '#DC2626');
  }

  _startMassacreEngine(target) {
    if (!this.isSkillEnabled(CONFIG.denji?.enableMassacreEngine, true)) return;
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

    spawnFloatingText(this.x, this.y - 30, '⛓️ MASSACRE ENGINE!', '#EAB308');
    triggerGlobalScreenShake(20, 25);
  }

  _updateMassacreEngine() {
    this.massacreTimer--;
    if (this.massacreTimer % 8 === 0 && this.massacreTarget) {
      applyDamageToTarget(this.massacreTarget, 15, this);
      if (this.isSkillEnabled(CONFIG.denji?.enableBloodSiphon, true)) {
        this.hp = Math.min(this.maxHp, this.hp + 6);
      }
      spawnBloodEffect(this.massacreTarget.x, this.massacreTarget.y, 8);
    }

    if (this.massacreTimer <= 0) {
      this.isExecutingMassacre = false;
      if (this.massacreTarget) {
        applyDamageToTarget(this.massacreTarget, 50, this);
        triggerGlobalScreenShake(24, 20);
      }
    }
  }

  draw(ctx) {
    // 1. Manga Speed Lines
    drawDenjiSpeedLines(ctx, this);

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
