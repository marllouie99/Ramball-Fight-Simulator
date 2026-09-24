// ─────────────────────────────────────────────
// Nezuko Kamado — Entity & Combat Engine
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Martial Kicks)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #EC4899)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawNezukoSkin } from '../../graphics/fighters/nezukoSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class NezukoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'nezuko';
    this.type = 'nezuko';
    this.color = '#EC4899'; // Demon Sakura Pink
    this.themeColor = '#EC4899';
    this.secondaryColor = '#E11D48'; // Pyrokinesis Magenta

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 370) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.clawComboCount = 0;

    // Passive: Demonic Regeneration
    this.regenTimer = 0;

    // Skill 1: Awakened Demon Flying Dropkick
    this.dropkickCooldownMax = cfg.dropkickCooldown || 240;
    this.dropkickCooldown = this.dropkickCooldownMax;

    // Skill 2: Blood Demon Art: Exploding Blood (Bakketsu)
    this.bakketsuCooldownMax = cfg.bakketsuCooldown || 330;
    this.bakketsuCooldown = this.bakketsuCooldownMax;

    // Ultimate: Full Demon Awakening: Crimson Lotus Frenzy
    this.awakeningCooldownMax = cfg.ultimateCooldown || 1500;
    this.awakeningCooldown = this.awakeningCooldownMax;

    // Declarative Skill Registration
    const skills = [];
    if (this.isSkillEnabled(cfg.enableFlyingDropkick, true)) {
      skills.push({
        id: 'flying_dropkick',
        name: 'Flying Demon Dropkick',
        type: 'active',
        cooldownKey: 'dropkickCooldown',
        cooldownMaxKey: 'dropkickCooldownMax'
      });
    }
    if (this.isSkillEnabled(cfg.enableExplodingBlood, true)) {
      skills.push({
        id: 'exploding_blood',
        name: 'Exploding Blood (Bakketsu)',
        type: 'active',
        cooldownKey: 'bakketsuCooldown',
        cooldownMaxKey: 'bakketsuCooldownMax'
      });
    }
    if (this.isSkillEnabled(cfg.enableFullAwakening, true)) {
      skills.push({
        id: 'crimson_lotus_awakening',
        name: 'Full Demon Awakening',
        type: 'ultimate',
        cooldownKey: 'awakeningCooldown',
        cooldownMaxKey: 'awakeningCooldownMax'
      });
    }
    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
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

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};

    // Passive Demonic Regeneration (every 120 frames = 2.0s)
    if (this.isSkillEnabled(cfg.enableDemonRegeneration, true)) {
      this.regenTimer++;
      const interval = cfg.regenIntervalFrames || 120;
      if (this.regenTimer >= interval) {
        this.regenTimer = 0;
        if (this.hp < this.maxHp) {
          const isLowHp = this.hp <= this.maxHp * 0.35;
          const mult = isLowHp ? (cfg.lowHpRegenMultiplier || 2.0) : 1.0;
          const amt = Math.round((cfg.regenAmount || 10) * mult);
          this.hp = Math.min(this.maxHp, this.hp + amt);
          spawnFloatingText(this.x, this.y - 20, `+${amt} HP`, '#4ADE80');
        }
      }
    }

    // Skill Cooldowns
    if (this.dropkickCooldown > 0) this.dropkickCooldown--;
    if (this.bakketsuCooldown > 0) this.bakketsuCooldown--;
    if (this.awakeningCooldown > 0) this.awakeningCooldown--;

    const target = this.getNearestTarget();
    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const dropkickEnabled = this.isSkillEnabled(cfg.enableFlyingDropkick, true);
    const bakketsuEnabled = this.isSkillEnabled(cfg.enableExplodingBlood, true);
    const awakeningEnabled = this.isSkillEnabled(cfg.enableFullAwakening, true);
    const axeKicksEnabled = this.isSkillEnabled(cfg.enableAxeKicks, true);

    // AI / Skill Priority
    if (awakeningEnabled && this.awakeningCooldown <= 0 && dist < 170) {
      this._triggerCrimsonLotusAwakening(target);
    } else if (bakketsuEnabled && this.bakketsuCooldown <= 0 && dist < 130) {
      this._triggerExplodingBlood(target);
    } else if (dropkickEnabled && this.dropkickCooldown <= 0 && dist < 160) {
      this._triggerFlyingDropkick(target);
    } else if (axeKicksEnabled && dist < (cfg.clawReach || 75) && this.slashSwingTimer <= 0) {
      this._executeDemonMartialCombo(target);
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

  _executeDemonMartialCombo(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.clawComboCount = (this.clawComboCount + 1) % 3;

    this.aim(target);
    const reach = cfg.clawReach || 70;
    const arc = cfg.clawArcAngle || (Math.PI * 0.667); // 120 degrees (Rule 8)
    const angle = this.gunAngle || 0;

    const damages = [cfg.hit1Damage || 16, cfg.hit2Damage || 20, cfg.hit3Damage || 30];
    let dmg = damages[this.clawComboCount];
    if (this.isSkillEnabled(cfg.enableBakketsuEmpower, true) && this.hp <= this.maxHp * 0.5) {
      dmg *= (1 + (cfg.empoweredDamageBonus || 0.20));
    }

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
          spawnSparks(ent.x, ent.y, '#EC4899', 8);
          spawnBloodEffect(ent.x, ent.y, ent.bloodColor || '#DC2626');
          if (this.clawComboCount === 2) {
            ent.applyKnockback?.(Math.cos(angle) * (cfg.hit3Knockback || 26), Math.sin(angle) * (cfg.hit3Knockback || 26));
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _triggerFlyingDropkick(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};
    this.dropkickCooldown = this.dropkickCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    this.aim(target);
    const angle = this.gunAngle || 0;
    const spd = cfg.dropkickSpeed || 28.0;
    this.vx = Math.cos(angle) * (spd * 0.55);
    this.vy = Math.sin(angle) * (spd * 0.55);

    const dmg = cfg.dropkickDamage || 32;
    applyDamageToTarget(target, dmg, this);
    target.applyKnockback?.(Math.cos(angle) * 32, Math.sin(angle) * 32);
    spawnSparks(target.x, target.y, '#F472B6', 12);
    triggerGlobalScreenShake(4, 10);
    spawnFloatingText(this.x, this.y - 30, '飛び蹴り FLYING DROPKICK!', '#EC4899');
  }

  _triggerExplodingBlood(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};
    this.bakketsuCooldown = this.bakketsuCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const radius = cfg.bakketsuRadius || 160;
    const dmg = cfg.bakketsuDamage || 40;

    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d <= radius + ent.r) {
        applyDamageToTarget(ent, dmg, this);
        spawnSparks(ent.x, ent.y, '#E11D48', 16);
        spawnImpactFlash(ent.x, ent.y, '#EC4899', 24);
      }
    }
    triggerGlobalScreenShake(6, 14);
    spawnFloatingText(this.x, this.y - 30, '血鬼術・爆血 BAKKETSU!', '#E11D48');
  }

  _triggerCrimsonLotusAwakening(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};
    this.awakeningCooldown = this.awakeningCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 35;
    this.y = target.y - Math.sin(angle) * 35;

    const dmg = cfg.ultimateFinisherDamage || 70;
    const knockback = cfg.ultimateFinisherKnockback || 44;
    const heal = cfg.ultimateHealAmount || 40;

    applyDamageToTarget(target, dmg, this);
    target.applyKnockback?.(Math.cos(angle) * knockback, Math.sin(angle) * knockback);
    this.hp = Math.min(this.maxHp, this.hp + heal);

    spawnSparks(target.x, target.y, '#BE185D', 20);
    spawnImpactFlash(target.x, target.y, '#EC4899', 40);
    triggerGlobalScreenShake(8, 18);
    spawnFloatingText(this.x, this.y - 40, '鬼化覚醒 DEMON AWAKENING!', '#EC4899');
  }

  draw(ctx) {
    drawNezukoSkin(ctx, this);
  }
}
