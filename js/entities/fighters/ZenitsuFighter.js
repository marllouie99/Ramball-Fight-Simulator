// ─────────────────────────────────────────────
// Zenitsu Agatsuma — Entity & Combat Engine
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee Swings)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #F59E0B)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawZenitsuSkin } from '../../graphics/fighters/zenitsuSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class ZenitsuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'zenitsu';
    this.type = 'zenitsu';
    this.color = '#F59E0B'; // Lightning Gold
    this.themeColor = '#F59E0B';
    this.secondaryColor = '#FBBF24'; // Electric Amber

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 310) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.iaiComboCount = 0;

    // Skill 1: Thunderclap and Flash (Hekireki Issen)
    this.thunderclapCooldownMax = cfg.thunderclapCooldown || 228;
    this.thunderclapCooldown = this.thunderclapCooldownMax;

    // Skill 2: Thunderclap and Flash: Sixfold (Rokuren)
    this.rokurenCooldownMax = cfg.rokurenCooldown || 420;
    this.rokurenCooldown = this.rokurenCooldownMax;

    // Ultimate: Flaming Thunder God (Honoikazuchi no Kami)
    this.flamingGodCooldownMax = cfg.ultimateCooldown || 1440;
    this.flamingGodCooldown = this.flamingGodCooldownMax;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'thunderclap_and_flash',
        name: 'Thunderclap and Flash',
        type: 'active',
        cooldownKey: 'thunderclapCooldown',
        cooldownMaxKey: 'thunderclapCooldownMax'
      },
      {
        id: 'thunderclap_sixfold',
        name: 'Sixfold (Rokuren)',
        type: 'active',
        cooldownKey: 'rokurenCooldown',
        cooldownMaxKey: 'rokurenCooldownMax'
      },
      {
        id: 'flaming_thunder_god',
        name: 'Flaming Thunder God',
        type: 'ultimate',
        cooldownKey: 'flamingGodCooldown',
        cooldownMaxKey: 'flamingGodCooldownMax'
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
    if (this.thunderclapCooldown > 0) this.thunderclapCooldown--;
    if (this.rokurenCooldown > 0) this.rokurenCooldown--;
    if (this.flamingGodCooldown > 0) this.flamingGodCooldown--;

    const target = this.getNearestTarget();
    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority
    if (this.flamingGodCooldown <= 0 && dist < 190) {
      this._triggerFlamingThunderGod(target);
    } else if (this.rokurenCooldown <= 0 && dist < 150) {
      this._triggerRokuren(target);
    } else if (this.thunderclapCooldown <= 0 && dist < 180) {
      this._triggerThunderclapAndFlash(target);
    } else if (dist < 80 && this.slashSwingTimer <= 0) {
      this._executeThunderIaiCombo(target);
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

  _executeThunderIaiCombo(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.iaiComboCount = (this.iaiComboCount + 1) % 3;

    this.aim(target);
    const reach = 78;
    const arc = Math.PI * 0.778; // 140 degrees (Rule 7)
    const angle = this.gunAngle || 0;

    const damages = [18, 22, 28];
    const dmg = damages[this.iaiComboCount];

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
          spawnSparks(ent.x, ent.y, '#F59E0B', 8);
          spawnBloodEffect(ent.x, ent.y, ent.bloodColor || '#DC2626');
          if (this.iaiComboCount === 2) {
            ent.applyKnockback?.(Math.cos(angle) * 22, Math.sin(angle) * 22);
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _triggerThunderclapAndFlash(target) {
    this.thunderclapCooldown = this.thunderclapCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x + Math.cos(angle) * 30;
    this.y = target.y + Math.sin(angle) * 30;

    applyDamageToTarget(target, 38, this);
    target.applyKnockback?.(Math.cos(angle) * 26, Math.sin(angle) * 26);
    spawnSparks(target.x, target.y, '#38BDF8', 14);
    spawnImpactFlash(target.x, target.y, '#FBBF24', 26);
    triggerGlobalScreenShake(5, 12);
    spawnFloatingText(this.x, this.y - 30, '霹靂一閃 HEKIREKI ISSEN!', '#F59E0B');
  }

  _triggerRokuren(target) {
    this.rokurenCooldown = this.rokurenCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    applyDamageToTarget(target, 48, this);
    target.applyKnockback?.(Math.cos(this.gunAngle || 0) * 30, Math.sin(this.gunAngle || 0) * 30);
    spawnSparks(target.x, target.y, '#F59E0B', 18);
    triggerGlobalScreenShake(6, 14);
    spawnFloatingText(this.x, this.y - 30, '霹靂一閃・六連 ROKUREN!', '#F59E0B');
  }

  _triggerFlamingThunderGod(target) {
    this.flamingGodCooldown = this.flamingGodCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 45;
    this.y = target.y - Math.sin(angle) * 45;

    applyDamageToTarget(target, 85, this);
    target.applyKnockback?.(Math.cos(angle) * 48, Math.sin(angle) * 48);

    spawnSparks(target.x, target.y, '#FBBF24', 24);
    spawnImpactFlash(target.x, target.y, '#EF4444', 45);
    triggerGlobalScreenShake(9, 20);
    spawnFloatingText(this.x, this.y - 40, '火雷神 FLAMING THUNDER GOD!', '#F59E0B');
  }

  draw(ctx) {
    drawZenitsuSkin(ctx, this);
  }
}
