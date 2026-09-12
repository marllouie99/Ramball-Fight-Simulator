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
    this.skillManager.registerSkills([
      {
        id: 'flying_dropkick',
        name: 'Flying Demon Dropkick',
        type: 'active',
        cooldownKey: 'dropkickCooldown',
        cooldownMaxKey: 'dropkickCooldownMax'
      },
      {
        id: 'exploding_blood',
        name: 'Exploding Blood (Bakketsu)',
        type: 'active',
        cooldownKey: 'bakketsuCooldown',
        cooldownMaxKey: 'bakketsuCooldownMax'
      },
      {
        id: 'crimson_lotus_awakening',
        name: 'Full Demon Awakening',
        type: 'ultimate',
        cooldownKey: 'awakeningCooldown',
        cooldownMaxKey: 'awakeningCooldownMax'
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

    // Passive Demonic Regeneration (every 120 frames = 2.0s)
    this.regenTimer++;
    if (this.regenTimer >= 120) {
      this.regenTimer = 0;
      if (this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + 10);
        spawnFloatingText(this.x, this.y - 20, '+10 HP', '#4ADE80');
      }
    }

    // Skill Cooldowns
    if (this.dropkickCooldown > 0) this.dropkickCooldown--;
    if (this.bakketsuCooldown > 0) this.bakketsuCooldown--;
    if (this.awakeningCooldown > 0) this.awakeningCooldown--;

    const target = this.getNearestTarget();
    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority
    if (this.awakeningCooldown <= 0 && dist < 170) {
      this._triggerCrimsonLotusAwakening(target);
    } else if (this.bakketsuCooldown <= 0 && dist < 130) {
      this._triggerExplodingBlood(target);
    } else if (this.dropkickCooldown <= 0 && dist < 160) {
      this._triggerFlyingDropkick(target);
    } else if (dist < 75 && this.slashSwingTimer <= 0) {
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
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.clawComboCount = (this.clawComboCount + 1) % 3;

    this.aim(target);
    const reach = 70;
    const arc = Math.PI * 0.667; // 120 degrees (Rule 8)
    const angle = this.gunAngle || 0;

    const damages = [16, 20, 30];
    const dmg = damages[this.clawComboCount];

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
            ent.applyKnockback?.(Math.cos(angle) * 26, Math.sin(angle) * 26);
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _triggerFlyingDropkick(target) {
    this.dropkickCooldown = this.dropkickCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.vx = Math.cos(angle) * 16;
    this.vy = Math.sin(angle) * 16;

    applyDamageToTarget(target, 32, this);
    target.applyKnockback?.(Math.cos(angle) * 32, Math.sin(angle) * 32);
    spawnSparks(target.x, target.y, '#F472B6', 12);
    triggerGlobalScreenShake(4, 10);
    spawnFloatingText(this.x, this.y - 30, '飛び蹴り FLYING DROPKICK!', '#EC4899');
  }

  _triggerExplodingBlood(target) {
    this.bakketsuCooldown = this.bakketsuCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d <= 160 + ent.r) {
        applyDamageToTarget(ent, 40, this);
        spawnSparks(ent.x, ent.y, '#E11D48', 16);
        spawnImpactFlash(ent.x, ent.y, '#EC4899', 24);
      }
    }
    triggerGlobalScreenShake(6, 14);
    spawnFloatingText(this.x, this.y - 30, '血鬼術・爆血 BAKKETSU!', '#E11D48');
  }

  _triggerCrimsonLotusAwakening(target) {
    this.awakeningCooldown = this.awakeningCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 35;
    this.y = target.y - Math.sin(angle) * 35;

    applyDamageToTarget(target, 70, this);
    target.applyKnockback?.(Math.cos(angle) * 44, Math.sin(angle) * 44);
    this.hp = Math.min(this.maxHp, this.hp + 40);

    spawnSparks(target.x, target.y, '#BE185D', 20);
    spawnImpactFlash(target.x, target.y, '#EC4899', 40);
    triggerGlobalScreenShake(8, 18);
    spawnFloatingText(this.x, this.y - 40, '鬼化覚醒 DEMON AWAKENING!', '#EC4899');
  }

  draw(ctx) {
    drawNezukoSkin(ctx, this);
  }
}
