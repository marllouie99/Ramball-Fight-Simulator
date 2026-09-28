// ─────────────────────────────────────────────
// Megumin (The Crimson Demon Archmage) Entity
// KonoSuba: God's Blessing on this Wonderful World!
// Single-Spell Cataclysm Nuker & Tactical Artillery
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { meguminConfig } from '../../configs/characters/meguminConfig.js';
import { CONFIG } from '../../core/config.js';
import { drawMeguminSkin } from '../../graphics/fighters/meguminSkin.js';

export class MeguminFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'megumin';
    this.type = 'megumin';
    this.color = def?.color || meguminConfig.color || '#C81D25';
    this.themeColor = def?.themeColor || meguminConfig.themeColor || '#C81D25';
    this.secondaryColor = def?.secondaryColor || meguminConfig.secondaryColor || '#FFD166';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumin) ? CONFIG.megumin : meguminConfig;

    // Base Combat Attributes
    this.hp = cfg.hp || 280;
    this.maxHp = this.hp;
    this.speed = cfg.speed || 2.45;
    this.moveSpeed = this.speed;
    this.r = cfg.r || 24;

    // Chanting & Explosion State Machine
    this.isChantingExplosion = false;
    this.chantTimer = 0;
    this.chantMaxTimer = cfg.chantMaxFrames || 240;
    this.chantProgress = 0;
    this.committedCastAngle = 0;

    // Post-Cast Total Mana Burnout (The Faceplant)
    this.isDepleted = false;
    this.isProne = false;
    this.faceplantTimer = 0;
    this.faceplantMaxTimer = cfg.faceplantDurationFrames || 360;

    // Non-Damaging Utility & Defensive Timers
    this.isParrying = false;
    this.parryTimer = 0;
    this.isFocusing = false;
    this.focusTimer = 0;
    this.focusBarrierHp = 0;
    this.gleamCooldown = cfg.gleamCooldown || 420;
    this.capeDashCooldown = cfg.capeDashCooldown || 160;

    this._registerSkills();
  }

  /**
   * Registers skill bars to HUD (all toggled off by default in config).
   */
  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumin) ? CONFIG.megumin : meguminConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableChuunibyouFocus, false)) {
      skills.push({
        id: 'chuunibyouFocus',
        name: 'Chuunibyou Focus',
        type: 'active',
        cooldownKey: 'focusCooldown',
        cooldownMaxKey: 'focusCooldownMax'
      });
    }

    if (this.isSkillEnabled(cfg.enableCrimsonGleam, false)) {
      skills.push({
        id: 'crimsonGleam',
        name: 'Crimson Gleam',
        type: 'active',
        cooldownKey: 'gleamCooldown',
        cooldownMaxKey: 'gleamCooldownMax'
      });
    }

    if (this.isSkillEnabled(cfg.enableExplosion, false) || this.isSkillEnabled(cfg.enableUltimate, false)) {
      skills.push({
        id: 'explosion',
        name: 'EXPLOSION!',
        type: 'ultimate',
        cooldownKey: 'explosionCooldown',
        cooldownMaxKey: 'explosionCooldownMax'
      });
    }

    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
  }

  /**
   * Helper to evaluate skill toggle from config.
   */
  isSkillEnabled(configValue, defaultValue = false) {
    if (configValue === 0 || configValue === false) return false;
    if (configValue === 1 || configValue === true) return true;
    return defaultValue;
  }

  /**
   * Interrupt active channeling upon receiving hard CC.
   */
  interruptAttacks() {
    if (this.isChantingExplosion) {
      this.isChantingExplosion = false;
      this.chantTimer = 0;
    }
    this.isFocusing = false;
    this.isParrying = false;
  }

  /**
   * Core Fighter Update Loop.
   * Strictly adheres to Rule 1.1 (Freeze Guard) & Rule 1.2 (Centralized Movement Physics).
   */
  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1.1 Freeze & Time-Stop Early Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumin) ? CONFIG.megumin : meguminConfig;

    // 2. Handle Total Mana Burnout (Faceplant Prone State)
    if (this.isDepleted || this.faceplantTimer > 0) {
      this.faceplantTimer--;
      this.vx = 0;
      this.vy = 0;
      this.speed = 0;
      if (this.faceplantTimer <= 0) {
        this.isDepleted = false;
        this.isProne = false;
        this.speed = cfg.speed || 2.45;
      }
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 3. Centralized movement and physics resolution
    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Skin Renderer hook.
   */
  draw(ctx) {
    drawMeguminSkin(ctx, this);
  }
}
