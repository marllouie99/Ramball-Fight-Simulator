// ─────────────────────────────────────────────
// Inosuke Hashibira — Entity & Combat Engine
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Dual Katana Swings)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #3B82F6)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawInosukeSkin } from '../../graphics/fighters/inosukeSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class InosukeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'inosuke';
    this.type = 'inosuke';
    this.color = '#3B82F6'; // Wild Beast Indigo
    this.themeColor = '#3B82F6';
    this.secondaryColor = '#6B7280'; // Boar Fur Grey

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.inosuke) ? CONFIG.inosuke : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 350) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.beastComboCount = 0;

    // Skill 1: Beast Fifth Fang: Crazy Cutting (Kuruizaki)
    this.crazyCuttingCooldownMax = cfg.crazyCuttingCooldown || 252;
    this.crazyCuttingCooldown = this.crazyCuttingCooldownMax;

    // Skill 2: Beast Eighth Fang: Explosive Rush (Bakuretsu Mōshin)
    this.explosiveRushCooldownMax = cfg.explosiveRushCooldown || 330;
    this.explosiveRushCooldown = this.explosiveRushCooldownMax;

    // Ultimate: King of the Mountain Cataclysm
    this.kingOfMountainCooldownMax = cfg.ultimateCooldown || 1440;
    this.kingOfMountainCooldown = this.kingOfMountainCooldownMax;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'crazy_cutting',
        name: 'Fifth Fang: Crazy Cutting',
        type: 'active',
        cooldownKey: 'crazyCuttingCooldown',
        cooldownMaxKey: 'crazyCuttingCooldownMax'
      },
      {
        id: 'explosive_rush',
        name: 'Eighth Fang: Explosive Rush',
        type: 'active',
        cooldownKey: 'explosiveRushCooldown',
        cooldownMaxKey: 'explosiveRushCooldownMax'
      },
      {
        id: 'king_of_mountain',
        name: 'King of the Mountain',
        type: 'ultimate',
        cooldownKey: 'kingOfMountainCooldown',
        cooldownMaxKey: 'kingOfMountainCooldownMax'
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
    if (this.crazyCuttingCooldown > 0) this.crazyCuttingCooldown--;
    if (this.explosiveRushCooldown > 0) this.explosiveRushCooldown--;
    if (this.kingOfMountainCooldown > 0) this.kingOfMountainCooldown--;

    const target = this.getNearestTarget();
    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority
    if (this.kingOfMountainCooldown <= 0 && dist < 180) {
      this._triggerKingOfMountain(target);
    } else if (this.crazyCuttingCooldown <= 0 && dist < 100) {
      this._triggerCrazyCutting(target);
    } else if (this.explosiveRushCooldown <= 0 && dist < 170) {
      this._triggerExplosiveRush(target);
    } else if (dist < 85 && this.slashSwingTimer <= 0) {
      this._executeBeastBreathingCombo(target);
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

  _executeBeastBreathingCombo(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.beastComboCount = (this.beastComboCount + 1) % 3;

    this.aim(target);
    const reach = 85;
    const arc = Math.PI * 0.889; // 160 degrees (Rule 7)
    const angle = this.gunAngle || 0;

    const damages = [16, 22, 32];
    const dmg = damages[this.beastComboCount];

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
          spawnSparks(ent.x, ent.y, '#3B82F6', 8);
          spawnBloodEffect(ent.x, ent.y, ent.bloodColor || '#DC2626');
          if (this.beastComboCount === 2) {
            ent.applyKnockback?.(Math.cos(angle) * 26, Math.sin(angle) * 26);
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _triggerCrazyCutting(target) {
    this.crazyCuttingCooldown = this.crazyCuttingCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d <= 100 + ent.r) {
        applyDamageToTarget(ent, 36, this);
        spawnSparks(ent.x, ent.y, '#60A5FA', 12);
      }
    }
    triggerGlobalScreenShake(4, 10);
    spawnFloatingText(this.x, this.y - 30, '狂い咲き CRAZY CUTTING!', '#3B82F6');
  }

  _triggerExplosiveRush(target) {
    this.explosiveRushCooldown = this.explosiveRushCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.vx = Math.cos(angle) * 18;
    this.vy = Math.sin(angle) * 18;

    applyDamageToTarget(target, 36, this);
    target.applyKnockback?.(Math.cos(angle) * 38, Math.sin(angle) * 38);
    spawnSparks(target.x, target.y, '#9CA3AF', 14);
    spawnImpactFlash(target.x, target.y, '#3B82F6', 24);
    triggerGlobalScreenShake(5, 12);
    spawnFloatingText(this.x, this.y - 30, '爆裂猛進 EXPLOSIVE RUSH!', '#3B82F6');
  }

  _triggerKingOfMountain(target) {
    this.kingOfMountainCooldown = this.kingOfMountainCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 35;
    this.y = target.y - Math.sin(angle) * 35;

    applyDamageToTarget(target, 60, this);
    target.applyKnockback?.(Math.cos(angle) * 46, Math.sin(angle) * 46);

    spawnSparks(target.x, target.y, '#3B82F6', 22);
    spawnImpactFlash(target.x, target.y, '#60A5FA', 38);
    triggerGlobalScreenShake(8, 18);
    spawnFloatingText(this.x, this.y - 40, '山の王 KING OF THE MOUNTAINS!', '#3B82F6');
  }

  draw(ctx) {
    drawInosukeSkin(ctx, this);
  }
}
