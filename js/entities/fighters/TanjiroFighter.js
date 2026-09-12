// ─────────────────────────────────────────────
// Tanjiro Kamado — Entity & Combat Engine
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee Swings)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #10B981)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawTanjiroSkin } from '../../graphics/fighters/tanjiroSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class TanjiroFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'tanjiro';
    this.type = 'tanjiro';
    this.color = '#10B981'; // Emerald Green
    this.themeColor = '#10B981';
    this.secondaryColor = '#EF4444'; // Sunfire Crimson

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.tanjiro) ? CONFIG.tanjiro : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 340) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.waterComboCount = 0;

    // Skill 1: Water Breathing Tenth Form: Constant Flux
    this.fluxCooldownMax = cfg.fluxCooldown || 270;
    this.fluxCooldown = this.fluxCooldownMax;
    this.isFluxDashing = false;
    this.fluxTimer = 0;
    this.fluxMaxTimer = 22;

    // Skill 2: Sun Breathing: Clear Blue Sky
    this.sunCooldownMax = cfg.sunCooldown || 360;
    this.sunCooldown = this.sunCooldownMax;
    this.isSunSpinning = false;
    this.sunTimer = 0;
    this.sunMaxTimer = 20;

    // Ultimate: Dragon Sun Halo Head Dance
    this.dragonDanceCooldownMax = cfg.ultimateCooldown || 1440;
    this.dragonDanceCooldown = this.dragonDanceCooldownMax;
    this.isDragonDancing = false;
    this.dragonDanceTimer = 0;
    this.dragonDanceStrikesLeft = 0;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'constant_flux',
        name: 'Tenth Form: Constant Flux',
        type: 'active',
        cooldownKey: 'fluxCooldown',
        cooldownMaxKey: 'fluxCooldownMax'
      },
      {
        id: 'clear_blue_sky',
        name: 'Sun Breathing: Blue Sky',
        type: 'active',
        cooldownKey: 'sunCooldown',
        cooldownMaxKey: 'sunCooldownMax'
      },
      {
        id: 'dragon_sun_dance',
        name: 'Hinokami Kagura: Dragon Sun Dance',
        type: 'ultimate',
        cooldownKey: 'dragonDanceCooldown',
        cooldownMaxKey: 'dragonDanceCooldownMax'
      }
    ]);
  }

  update() {
    // 1. Rule 1 Freeze / TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    super.update();

    // Decay swing timers
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // Skill Cooldowns
    if (this.fluxCooldown > 0) this.fluxCooldown--;
    if (this.sunCooldown > 0) this.sunCooldown--;
    if (this.dragonDanceCooldown > 0) this.dragonDanceCooldown--;

    const target = this.getNearestTarget();
    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority
    if (this.dragonDanceCooldown <= 0 && dist < 180 && !this.isFluxDashing && !this.isSunSpinning) {
      this._triggerDragonSunDance(target);
    } else if (this.sunCooldown <= 0 && dist < 90 && !this.isFluxDashing && !this.isDragonDancing) {
      this._triggerClearBlueSky(target);
    } else if (this.fluxCooldown <= 0 && dist < 160 && !this.isSunSpinning && !this.isDragonDancing) {
      this._triggerConstantFlux(target);
    } else if (dist < 85 && this.slashSwingTimer <= 0) {
      this._executeWaterBreathingBasicAttack(target);
    }
  }

  getNearestTarget() {
    let nearest = null;
    let minDist = Infinity;
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = ent;
      }
    }
    return nearest;
  }

  _executeWaterBreathingBasicAttack(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.waterComboCount = (this.waterComboCount + 1) % 3;

    this.aim(target);
    const reach = 80;
    const arc = Math.PI * 0.778; // 140 degrees (Rule 7)
    const angle = this.gunAngle || 0;

    const damages = [18, 22, 28];
    const dmg = damages[this.waterComboCount];

    // Query all valid targets in 140° frontal arc (Rule 6 & 7)
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= reach + ent.r) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          applyDamageToTarget(ent, dmg, this);
          spawnSparks(ent.x, ent.y, '#06B6D4', 6);
          spawnBloodEffect(ent.x, ent.y, ent.bloodColor || '#DC2626');
          if (this.waterComboCount === 2) {
            ent.applyKnockback?.(Math.cos(angle) * 24, Math.sin(angle) * 24);
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _triggerConstantFlux(target) {
    this.fluxCooldown = this.fluxCooldownMax;
    this.isFluxDashing = true;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.vx = Math.cos(angle) * 12;
    this.vy = Math.sin(angle) * 12;

    applyDamageToTarget(target, 28, this);
    spawnSparks(target.x, target.y, '#06B6D4', 10);
    triggerGlobalScreenShake(3, 8);
    spawnFloatingText(this.x, this.y - 30, '生生流転 CONSTANT FLUX!', '#06B6D4');
  }

  _triggerClearBlueSky(target) {
    this.sunCooldown = this.sunCooldownMax;
    this.isSunSpinning = true;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d <= 90 + ent.r) {
        applyDamageToTarget(ent, 35, this);
        spawnSparks(ent.x, ent.y, '#EF4444', 12);
        triggerGlobalScreenShake(4, 10);
      }
    }
    spawnFloatingText(this.x, this.y - 30, '碧羅の天 CLEAR BLUE SKY!', '#EF4444');
  }

  _triggerDragonSunDance(target) {
    this.dragonDanceCooldown = this.dragonDanceCooldownMax;
    this.isDragonDancing = true;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 40;
    this.y = target.y - Math.sin(angle) * 40;

    applyDamageToTarget(target, 65, this);
    target.applyKnockback?.(Math.cos(angle) * 40, Math.sin(angle) * 40);
    spawnSparks(target.x, target.y, '#F59E0B', 18);
    spawnImpactFlash(target.x, target.y, '#EF4444', 35);
    triggerGlobalScreenShake(8, 18);
    spawnFloatingText(this.x, this.y - 40, '日運の竜 DRAGON SUN DANCE!', '#EF4444');
  }

  draw(ctx) {
    drawTanjiroSkin(ctx, this);
  }
}
