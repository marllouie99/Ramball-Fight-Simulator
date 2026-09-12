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

    // Animation & Hands
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.punchComboCount = 0;
    this.sawComboCount = 0;

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
    this.skillManager.registerSkills([
      {
        id: 'engine_lunge',
        name: 'Engine Lunge',
        type: 'active',
        cooldownKey: 'lungeCooldown',
        cooldownMaxKey: 'lungeCooldownMax'
      },
      {
        id: 'blood_cleave',
        name: 'Blood Cleave',
        type: 'active',
        cooldownKey: 'cleaveCooldown',
        cooldownMaxKey: 'cleaveCooldownMax'
      },

      {
        id: 'massacre_engine',
        name: 'Massacre Engine',
        type: 'ultimate',
        cooldownKey: 'massacreCooldown',
        cooldownMaxKey: 'massacreCooldownMax'
      }
    ]);
  }

  takeDamage(amount, attacker = null) {
    if (this.isInvulnerable || this.hp <= 0) return 0;
    const actualDamage = super.takeDamage(amount, attacker);

    // Passive 1: Pochita Heart Ripcord Revive Trigger
    if (this.hp <= 0 && this.reviveStocks > 0 && !this.isExecutingMassacre) {
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

  _queryAllTargets() {
    const targets = [];
    if (state.fighters) {
      for (let f of state.fighters) {
        if (f && f !== this && f.hp > 0 && f.team !== this.team) {
          targets.push(f);
        }
      }
    }
    if (state.illusions) {
      for (let ill of state.illusions) {
        if (ill && ill !== this && ill.hp > 0 && ill.team !== this.team) {
          targets.push(ill);
        }
      }
    }
    return targets;
  }

  update(allFighters) {
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

    if (this.lungeCooldown > 0) this.lungeCooldown--;
    if (this.cleaveCooldown > 0) this.cleaveCooldown--;
    if (this.massacreCooldown > 0) this.massacreCooldown--;

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
    const target = this._findBestTarget();
    if (target) {
      this.aim(target);
      const dist = Math.hypot(target.x - this.x, target.y - this.y);

      // Ultimate check
      if (this.massacreCooldown <= 0 && dist < 180) {
        this._startMassacreEngine(target);
        return;
      }

      // Skill 1: Engine Lunge
      if (this.lungeCooldown <= 0 && dist > 100 && dist < 260) {
        this._startEngineLunge(target);
        return;
      }

      // Skill 2: Blood Cleave
      if (this.cleaveCooldown <= 0 && dist > 80 && dist < 160) {
        this._performBloodCleave(target);
        return;
      }

      // Basic Attack String
      if (this.attackCooldown <= 0 && dist <= (this.isHybridModeActive ? 75 : 65)) {
        this._performBasicAttack(target);
      }
    }

    super.update(allFighters);
  }

  _findBestTarget() {
    const targets = this._queryAllTargets();
    let best = null;
    let minD = Infinity;
    for (let t of targets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < minD) {
        minD = d;
        best = t;
      }
    }
    return best;
  }

  _performBasicAttack(target) {
    if (this.isHybridModeActive) {
      // 140° Twin Forearm Chainsaw Shred
      this.slashSwingTimer = this.slashSwingMaxTimer;
      this.sawComboCount = (this.sawComboCount + 1) % 3;
      this.attackCooldown = 18;

      const dmg = (this.sawComboCount === 2) ? 24 : 16;
      this._executeFrontalArcHit(target, Math.PI * 0.778, 75, dmg, 24, true);
    } else {
      // 3-Hit Street Brawler Punch
      this.punchAnimTimer = this.punchMaxTime;
      this.punchComboCount = (this.punchComboCount + 1) % 3;
      this.attackCooldown = 14;

      const dmg = this.punchComboCount === 2 ? 20 : (this.punchComboCount === 1 ? 14 : 12);
      this._executeFrontalArcHit(target, Math.PI * 0.50, 65, dmg, 18, false);
    }
  }

  _executeFrontalArcHit(primaryTarget, arcAngle, reach, damage, knockback, isSaw) {
    const targets = this._queryAllTargets();
    const aim = this.gunAngle || this.angle || 0;

    for (let t of targets) {
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const d = Math.hypot(dx, dy);

      if (d <= reach + (t.r || 20)) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - aim;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) <= arcAngle / 2) {
          applyDamageToTarget(t, damage, this);
          t.knockbackVx = Math.cos(targetAngle) * knockback;
          t.knockbackVy = Math.sin(targetAngle) * knockback;

          // Lifesteal on Saw Hit
          if (isSaw) {
            const heal = Math.round(damage * 0.25);
            this.hp = Math.min(this.maxHp, this.hp + heal);
            spawnBloodEffect(t.x, t.y, 6);
          }

          spawnImpactFlash(t.x, t.y, '#EAB308');
        }
      }
    }
  }

  _startEngineLunge(target) {
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
    this.cleaveCooldown = this.cleaveCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    target.x = this.x + Math.cos(angle) * 40;
    target.y = this.y + Math.sin(angle) * 40;
    applyDamageToTarget(target, 28, this);
    spawnFloatingText(target.x, target.y - 20, 'CHAIN CLEAVE!', '#DC2626');
  }

  _startMassacreEngine(target) {
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
      this.hp = Math.min(this.maxHp, this.hp + 6);
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
  }
}
