// ─────────────────────────────────────────────
// Power (The Blood Fiend) — Entity & Combat Engine
// Chainsaw Man / Public Safety Special Division 4
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee / Blood Hammer Cleaves)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 15 (Physics & Displacement Engine)
// - Rule 16 (Manga Action Speed Line Effects)
// - Rule 18 (HUD Theme Consistency: #EF4444)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawPowerSkin } from '../../graphics/fighters/powerSkin.js';
import { drawPowerSpeedLines, drawPowerBloodDagger } from '../../graphics/weapons/powerWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class PowerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'power';
    this.type = 'power';
    this.color = '#EF4444'; // Crimson Blood Red
    this.themeColor = '#EF4444';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.power) ? CONFIG.power : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 330) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & Hands
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.hammerComboCount = 0;

    // Blood Reservoir Passive
    this.bloodGauge = 0;
    this.maxBloodGauge = cfg.maxBloodReservoir || 100;

    // Skill 1: Blood Scythe Whirlwind
    this.scytheCooldownMax = cfg.scytheCooldown || 240;
    this.scytheCooldown = this.scytheCooldownMax;
    this.isScytheSpinning = false;
    this.scytheTimer = 0;
    this.scytheMaxTimer = 24;

    // Skill 2: Thousand Blood Daggers
    this.daggersCooldownMax = cfg.daggersCooldown || 380;
    this.daggersCooldown = this.daggersCooldownMax;
    this.activeDaggers = [];

    // Ultimate: Blood Rain Cataclysm
    this.bloodRainCooldownMax = cfg.ultimateCooldown || 1500;
    this.bloodRainCooldown = this.bloodRainCooldownMax;
    this.isExecutingBloodRain = false;
    this.bloodRainTimer = 0;
    this.isHammerLunging = false;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'blood_scythe',
        name: 'Blood Scythe',
        type: 'active',
        cooldownKey: 'scytheCooldown',
        cooldownMaxKey: 'scytheCooldownMax'
      },
      {
        id: 'blood_daggers',
        name: 'Thousand Daggers',
        type: 'active',
        cooldownKey: 'daggersCooldown',
        cooldownMaxKey: 'daggersCooldownMax'
      },
      {
        id: 'blood_rain',
        name: 'Blood Rain Cataclysm',
        type: 'ultimate',
        cooldownKey: 'bloodRainCooldown',
        cooldownMaxKey: 'bloodRainCooldownMax'
      }
    ]);
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

    // 2. Cooldown ticks
    if (this.scytheCooldown > 0) this.scytheCooldown--;
    if (this.daggersCooldown > 0) this.daggersCooldown--;
    if (this.bloodRainCooldown > 0) this.bloodRainCooldown--;

    // 3. Update Active Projectiles / Skills
    this._updateActiveDaggers();

    if (this.isExecutingBloodRain) {
      this._updateBloodRain();
      return;
    }

    if (this.isScytheSpinning) {
      this._updateScytheSpin();
      return;
    }

    // 4. Combat AI
    const target = this._findBestTarget();
    if (target) {
      this.aim(target);
      const dist = Math.hypot(target.x - this.x, target.y - this.y);

      // Ultimate
      if (this.bloodRainCooldown <= 0 && dist < 220) {
        this._startBloodRain(target);
        return;
      }

      // Skill 2: Thousand Blood Daggers
      if (this.daggersCooldown <= 0 && dist > 120 && dist < 320) {
        this._launchBloodDaggers(target);
        return;
      }

      // Skill 1: Blood Scythe
      if (this.scytheCooldown <= 0 && dist < 110) {
        this._startScytheSpin();
        return;
      }

      // Basic Attack: Gigantic Blood Hammer
      if (this.attackCooldown <= 0 && dist <= 85) {
        this._performBloodHammerAttack(target);
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

  _performBloodHammerAttack(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.hammerComboCount = (this.hammerComboCount + 1) % 3;
    this.attackCooldown = 22;

    const dmg = (this.hammerComboCount === 2) ? 36 : 24;
    const kb = (this.hammerComboCount === 2) ? 28 : 18;

    // 140° Frontal Arc Multi-Target Cleave
    const targets = this._queryAllTargets();
    const aim = this.gunAngle || this.angle || 0;
    const arc = Math.PI * 0.778; // 140 deg

    for (let t of targets) {
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const d = Math.hypot(dx, dy);

      if (d <= 85 + (t.r || 20)) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - aim;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          applyDamageToTarget(t, dmg, this);
          t.knockbackVx = Math.cos(targetAngle) * kb;
          t.knockbackVy = Math.sin(targetAngle) * kb;
          spawnBloodEffect(t.x, t.y, 8);
          spawnImpactFlash(t.x, t.y, '#EF4444');
        }
      }
    }

    triggerGlobalScreenShake(12, 8);
  }

  _startScytheSpin() {
    this.isScytheSpinning = true;
    this.scytheTimer = this.scytheMaxTimer;
    this.scytheCooldown = this.scytheCooldownMax;
  }

  _updateScytheSpin() {
    this.scytheTimer--;
    if (this.scytheTimer % 6 === 0) {
      const targets = this._queryAllTargets();
      for (let t of targets) {
        if (Math.hypot(t.x - this.x, t.y - this.y) <= 90) {
          applyDamageToTarget(t, 22, this);
          spawnBloodEffect(t.x, t.y, 6);
        }
      }
    }
    if (this.scytheTimer <= 0) {
      this.isScytheSpinning = false;
    }
  }

  _launchBloodDaggers(target) {
    this.daggersCooldown = this.daggersCooldownMax;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 / count) * i;
      this.activeDaggers.push({
        x: this.x + Math.cos(ang) * 35,
        y: this.y + Math.sin(ang) * 35,
        target,
        speed: 22,
        life: 60
      });
    }
  }

  _updateActiveDaggers() {
    for (let i = this.activeDaggers.length - 1; i >= 0; i--) {
      const d = this.activeDaggers[i];
      if (d.target && d.target.hp > 0) {
        const ang = Math.atan2(d.target.y - d.y, d.target.x - d.x);
        d.x += Math.cos(ang) * d.speed;
        d.y += Math.sin(ang) * d.speed;
        d.angle = ang;

        if (Math.hypot(d.target.x - d.x, d.target.y - d.y) < 25) {
          applyDamageToTarget(d.target, 12, this);
          spawnImpactFlash(d.x, d.y, '#EF4444');
          this.activeDaggers.splice(i, 1);
          continue;
        }
      }
      d.life--;
      if (d.life <= 0) {
        this.activeDaggers.splice(i, 1);
      }
    }
  }

  _startBloodRain(target) {
    this.isExecutingBloodRain = true;
    this.bloodRainCooldown = this.bloodRainCooldownMax;
    this.bloodRainTimer = 60;

    const enemies = this._queryAllTargets();
    for (let e of enemies) {
      if (typeof e.applyTimeStop === 'function') {
        e.applyTimeStop(35);
      }
    }

    spawnFloatingText(this.x, this.y - 30, '👑 BLOOD RAIN CATACLYSM!', '#EF4444');
    triggerGlobalScreenShake(22, 25);
  }

  _updateBloodRain() {
    this.bloodRainTimer--;
    if (this.bloodRainTimer % 10 === 0) {
      const targets = this._queryAllTargets();
      for (let t of targets) {
        applyDamageToTarget(t, 18, this);
        spawnBloodEffect(t.x, t.y, 8);
      }
    }

    if (this.bloodRainTimer <= 0) {
      this.isExecutingBloodRain = false;
      const targets = this._queryAllTargets();
      for (let t of targets) {
        applyDamageToTarget(t, 40, this);
        t.knockbackVx = (Math.random() - 0.5) * 30;
        t.knockbackVy = -25;
      }
      triggerGlobalScreenShake(26, 20);
    }
  }

  draw(ctx) {
    // 1. Manga Speed Lines
    drawPowerSpeedLines(ctx, this);

    // 2. Active Blood Daggers
    for (let d of this.activeDaggers) {
      drawPowerBloodDagger(ctx, d);
    }

    // 3. Main Skin Body & Weapon
    drawPowerSkin(ctx, this);
  }
}
