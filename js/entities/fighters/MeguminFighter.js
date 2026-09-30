// ─────────────────────────────────────────────
// Megumin (The Crimson Demon Archmage) Entity
// KonoSuba: God's Blessing on this Wonderful World!
// Single-Spell Cataclysm Nuker & Tactical Artillery
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { meguminConfig } from '../../configs/characters/meguminConfig.js';
import { CONFIG } from '../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawMeguminGroundTelegraph, drawMeguminSkin } from '../../graphics/fighters/meguminSkin.js';

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

    this._resetMeguminState();

    this._registerSkills();
  }

  reset() {
    super.reset();
    this._resetMeguminState();
  }

  _resetMeguminState() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumin) ? CONFIG.megumin : meguminConfig;

    this.isChantingExplosion = false;
    this.explosionPhase = 'IDLE';
    this.explosionTimer = 0;
    this.chantTimer = 0;
    this.chantMaxTimer = cfg.explosionWindupFrames || cfg.chantMaxFrames || 240;
    this.chantProgress = 0;
    this.committedCastAngle = 0;
    this.explosionTargetX = null;
    this.explosionTargetY = null;
    this.explosionBlastTimer = 0;
    this.explosionBlastMaxTimer = cfg.explosionDetonationFrames || 24;
    this.explosionCraterTimer = 0;
    this.explosionFireTickTimer = 0;
    this.explosionCooldownMax = cfg.explosionCooldown || 2400;
    this.explosionCooldown = cfg.explosionInitialCooldown ?? 0;

    this.isDepleted = false;
    this.isProne = false;
    this.faceplantTimer = 0;
    this.faceplantMaxTimer = cfg.faceplantDurationFrames || 360;
    this.isParrying = false;
    this.parryTimer = 0;
    this.isFocusing = false;
    this.focusTimer = 0;
    this.focusBarrierHp = 0;
    this.gleamCooldown = cfg.gleamCooldown || 420;
    this.capeDashCooldown = cfg.capeDashCooldown || 160;
  }

  /**
  * Registers Megumin's enabled skills with the HUD.
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
        cooldownMaxKey: 'explosionCooldownMax',
        channelingKey: 'isChantingExplosion',
        channelTimerKey: 'explosionTimer',
        channelMaxKey: 'chantMaxTimer'
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
  interruptAttacks(forceCancelAll = false) {
    const wasChantingExplosion = this.isChantingExplosion;
    super.interruptAttacks(forceCancelAll);
    if (wasChantingExplosion) {
      this.isChantingExplosion = false;
      this.explosionPhase = 'IDLE';
      this.explosionTimer = 0;
      this.chantTimer = 0;
      this.chantProgress = 0;
      this.explosionTargetX = null;
      this.explosionTargetY = null;
    }
    this.isFocusing = false;
    this.isParrying = false;
  }

  shoot(ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumin) ? CONFIG.megumin : meguminConfig;
    if (this.isSkillEnabled(cfg.enableOneTruePath, false)) return;
    super.shoot(ownerIndex);
  }

  aim(opponent) {
    if (this.isChantingExplosion) {
      this.gunAngle = this.committedCastAngle;
      this.angle = this.committedCastAngle;
      return;
    }
    super.aim(opponent);
  }

  drawGroundTelegraph(ctx) {
    drawMeguminGroundTelegraph(ctx, this);
  }

  _getExplosionTargets() {
    return (state.fighters || []).filter((target) => (
      target &&
      target !== this &&
      target.hp > 0 &&
      !target.isDead &&
      (!this.isTeammate || !this.isTeammate(target))
    ));
  }

  _beginExplosion(target, cfg) {
    const targetY = (target.y ?? this.y) - (target.z || 0);
    this.committedCastAngle = Math.atan2(targetY - this.y, target.x - this.x);
    this.gunAngle = this.committedCastAngle;
    this.angle = this.committedCastAngle;
    this.explosionTargetX = target.x;
    this.explosionTargetY = targetY;
    this.explosionTimer = 0;
    this.chantTimer = 0;
    this.chantProgress = 0;
    this.chantMaxTimer = cfg.explosionWindupFrames || cfg.chantMaxFrames || 240;
    this.isChantingExplosion = true;
    this.explosionPhase = 'CHANT';
    audioSystem.playSFX(cfg.sounds?.chantDrone || 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3', 0.55);
  }

  _applySingularityPull(cfg) {
    const centerX = this.explosionTargetX;
    const centerY = this.explosionTargetY;
    const radius = cfg.explosionSingularityRadius || 200;
    const maxSpeed = cfg.explosionPullSpeed || 6;
    const acceleration = maxSpeed * 0.3;

    for (const target of this._getExplosionTargets()) {
      const dx = centerX - target.x;
      const dy = centerY - target.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 1 || distance > radius || target.immuneToPull || target.immuneToPush) continue;
      if (typeof target.isImmuneToGravitationalPull === 'function' && target.isImmuneToGravitationalPull('purple')) continue;

      target.vx = (target.vx || 0) + (dx / distance) * acceleration;
      target.vy = (target.vy || 0) + (dy / distance) * acceleration;
      const speed = Math.hypot(target.vx, target.vy);
      if (speed > maxSpeed) {
        target.vx = (target.vx / speed) * maxSpeed;
        target.vy = (target.vy / speed) * maxSpeed;
      }
    }
  }

  _applyExplosionCraterDamage(cfg) {
    const radius = cfg.explosionFireRadius || 120;
    for (const target of this._getExplosionTargets()) {
      if (Math.hypot(target.x - this.explosionTargetX, target.y - this.explosionTargetY) > radius + (target.r || 0)) continue;
      applyDamageToTarget(target, cfg.explosionFireTickDamage ?? 8, this, {
        isSkill: true,
        isUltimate: true,
        isExplosion: true,
        isAOE: true,
        isBurn: true,
        isTickDamage: true
      });
    }
  }

  _updateExplosionCrater(cfg) {
    if (this.explosionCraterTimer <= 0) return;
    this.explosionCraterTimer--;
    this.explosionFireTickTimer--;
    if (this.explosionFireTickTimer <= 0) {
      this.explosionFireTickTimer = cfg.explosionFireTickIntervalFrames || 30;
      this._applyExplosionCraterDamage(cfg);
    }
  }

  _detonateExplosion(cfg) {
    this.isChantingExplosion = false;
    this.explosionPhase = 'DETONATION';
    this.explosionBlastMaxTimer = cfg.explosionDetonationFrames || 24;
    this.explosionBlastTimer = this.explosionBlastMaxTimer;
    this.explosionCooldown = cfg.explosionCooldown || 2400;
    this.explosionCraterTimer = cfg.explosionLingeringFireFrames || 180;
    this.explosionFireTickTimer = cfg.explosionFireTickIntervalFrames || 30;

    const coreRadius = cfg.explosionCoreRadius || 120;
    const blastRadius = cfg.explosionBlastRadius || 260;
    for (const target of this._getExplosionTargets()) {
      const dx = target.x - this.explosionTargetX;
      const dy = target.y - this.explosionTargetY;
      const distance = Math.hypot(dx, dy);
      if (distance > blastRadius + (target.r || 0)) continue;

      const damage = distance <= coreRadius + (target.r || 0)
        ? (cfg.explosionTrueDamage ?? 420)
        : (cfg.explosionOuterDamage ?? 260);
      applyDamageToTarget(target, damage, this, {
        isSkill: true,
        isUltimate: true,
        isExplosion: true,
        isAOE: true,
        isTrueDamage: true,
        bypassShield: true,
        undodgeable: true
      });

      if (target.hp > 0 && typeof target.applyKnockback === 'function') {
        const angle = distance > 0 ? Math.atan2(dy, dx) : this.committedCastAngle;
        const force = cfg.explosionKnockbackForce || 45;
        target.applyKnockback(Math.cos(angle) * force, Math.sin(angle) * force);
      }
    }

    this.isDepleted = true;
    this.isProne = true;
    this.faceplantTimer = this.faceplantMaxTimer;
    this.speed = 0;
    this.vx = 0;
    this.vy = 0;
    audioSystem.playSFX(cfg.sounds?.explosionBlast || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 0.9);
    audioSystem.playSFX(cfg.sounds?.explosionHeavy || 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3', 0.7);
    audioSystem.playSFX(cfg.sounds?.staffDrop || 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3', 0.65);
    triggerGlobalScreenShake(7, 18);
  }

  _advanceExplosion(cfg) {
    const windupFrames = cfg.explosionWindupFrames || cfg.chantMaxFrames || 240;
    const pullFrames = Math.min(cfg.explosionSingularityPullFrames || 30, windupFrames);
    const pullStartFrame = windupFrames - pullFrames;
    this.explosionTimer++;
    this.chantTimer = this.explosionTimer;
    this.chantProgress = Math.min(1, this.explosionTimer / windupFrames);

    if (this.explosionTimer >= pullStartFrame) {
      if (this.explosionPhase !== 'SINGULARITY') {
        this.explosionPhase = 'SINGULARITY';
        audioSystem.playSFX(cfg.sounds?.manaVortex || 'Assets/Sound Effects/Skills/gravitypull.mp3', 0.7);
      }
      this._applySingularityPull(cfg);
    }

    if (this.explosionTimer >= windupFrames) {
      this._detonateExplosion(cfg);
    }
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
      this._updateExplosionCrater(cfg);
      if (this.explosionPhase === 'DETONATION' && this.explosionBlastTimer > 0) {
        this.explosionBlastTimer--;
        if (this.explosionBlastTimer <= 0) this.explosionPhase = 'FACEPLANT';
      }
      this.faceplantTimer = Math.max(0, this.faceplantTimer - 1);
      this.vx = 0;
      this.vy = 0;
      this.speed = 0;
      if (this.faceplantTimer <= 0) {
        this.isDepleted = false;
        this.isProne = false;
        this.explosionPhase = 'IDLE';
        this.speed = this.baseSpeed || cfg.speed || 2.45;
      }
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 3. Centralized movement and physics resolution
    super.update(opponent, ownerIndex, arena);
    this._updateExplosionCrater(cfg);

    if (this.isChantingExplosion) {
      this._advanceExplosion(cfg);
      return;
    }

    const target = opponent && opponent.hp > 0 && !opponent.isDead && !this.isTeammate(opponent)
      ? opponent
      : this._findClosestEnemy();
    if (
      target &&
      target.hp > 0 &&
      !target.isDead &&
      !this.isDepleted &&
      !this.hitStunTimer &&
      !this.isParalyzed &&
      state.gameState === 'playing' &&
      (this.isSkillEnabled(cfg.enableExplosion, false) || this.isSkillEnabled(cfg.enableUltimate, false)) &&
      this.explosionCooldown <= 0
    ) {
      this._beginExplosion(target, cfg);
    }
  }

  /**
   * Skin Renderer hook.
   */
  draw(ctx) {
    drawMeguminSkin(ctx, this);
  }
}
