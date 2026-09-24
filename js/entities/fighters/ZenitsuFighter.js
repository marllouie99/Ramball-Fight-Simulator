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
import { zenitsuConfig } from '../../configs/characters/zenitsuConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawZenitsuSkin, isZenitsuThunderclapBurst } from '../../graphics/fighters/zenitsuSkin.js';
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

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;

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
    this.inBattleTrance = false;

    // Skill 1: Thunderclap and Flash (Hekireki Issen)
    this.thunderclapCooldownMax = cfg.thunderclapCooldown || 228;
    this.thunderclapCooldown = 0; // Ready immediately on combat start
    this.thunderclapChannelDuration = cfg.thunderclapChannelDuration || 36;
    this.thunderclapChannelTimer = 0;
    this.isChannelingThunderclap = false;
    this.thunderclapTarget = null;
    this.skillCastAngle = 0;
    this.isThunderclapAimLocked = false;
    this.thunderclapLockedDistance = 260;

    // Active 6-Frame Lightning Dash Travel State
    this.isDashingThunderclap = false;
    this.thunderclapDashStep = 0;
    this.thunderclapDashDuration = 6;
    this.thunderclapDashStartX = 0;
    this.thunderclapDashStartY = 0;
    this.thunderclapDashDestX = 0;
    this.thunderclapDashDestY = 0;
    this.thunderclapDashAngle = 0;
    this.thunderclapDashDist = 0;
    this.thunderclapDashTarget = null;

    // Skill 2: Thunderclap and Flash: Sixfold (Rokuren)
    this.rokurenCooldownMax = cfg.rokurenCooldown || 420;
    this.rokurenCooldown = this.rokurenCooldownMax;

    // Ultimate: Flaming Thunder God (Honoikazuchi no Kami)
    this.flamingGodCooldownMax = cfg.ultimateCooldown || 1440;
    this.flamingGodCooldown = this.flamingGodCooldownMax;

    // Declarative Skill Registration
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableThunderclap, true)) {
      skills.push({
        id: 'thunderclap_and_flash',
        name: 'Thunderclap and Flash',
        type: 'active',
        cooldownKey: 'thunderclapCooldown',
        cooldownMaxKey: 'thunderclapCooldownMax'
      });
    }

    if (this.isSkillEnabled(cfg.enableRokuren, false)) {
      skills.push({
        id: 'thunderclap_sixfold',
        name: 'Sixfold (Rokuren)',
        type: 'active',
        cooldownKey: 'rokurenCooldown',
        cooldownMaxKey: 'rokurenCooldownMax'
      });
    }

    if (this.isSkillEnabled(cfg.enableFlamingThunderGod, false)) {
      skills.push({
        id: 'flaming_thunder_god',
        name: 'Flaming Thunder God',
        type: 'ultimate',
        cooldownKey: 'flamingGodCooldown',
        cooldownMaxKey: 'flamingGodCooldownMax'
      });
    }

    this.skillManager.registerSkills(skills);
  }

  takeDamage(amount, attacker, opts = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const rawDamage = typeof amount === 'number' ? amount : (amount?.damage || 0);
    const hpRatio = (this.hp - rawDamage) / (this.maxHp || 310);
    let finalAmount = amount;

    // Passive 1: Battle Trance (25% damage reduction below 35% HP)
    if (this.isSkillEnabled(cfg.enableBattleTrance, true) && hpRatio <= (cfg.tranceHpThreshold || 0.35)) {
      if (!this.inBattleTrance) {
        this.inBattleTrance = true;
        spawnFloatingText(this.x, this.y - 35, 'BATTLE TRANCE AWAKENED!', '#F59E0B');
        spawnImpactFlash(this.x, this.y, '#FBBF24', 30);
      }
      const dr = cfg.tranceDamageReduction || 0.25;
      finalAmount = typeof amount === 'number' ? amount * (1 - dr) : { ...amount, damage: rawDamage * (1 - dr) };
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  shoot(ownerIndex) {
    if (this.isChannelingThunderclap || this.thunderclapChannelTimer > 0) return false;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    if (!this.isSkillEnabled(cfg.enableBasicAttack, true)) return false;
    const target = this.getNearestTarget();
    if (!target) return false;
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (dist <= (cfg.katanaReach || 78) + (target.r || 25) && this.slashSwingTimer <= 0) {
      this._executeThunderIaiCombo(target);
      return true;
    }
    return false;
  }

  canAim() {
    if (this.isDashingThunderclap) {
      return false;
    }
    if (this.isChannelingThunderclap) {
      const halfTime = Math.floor((this.thunderclapChannelDuration || 36) / 2);
      // Once locked into Frame 2 (Charge phase), disable auto-aim so he commits strictly to 1 direction
      if (this.isThunderclapAimLocked || this.thunderclapChannelTimer <= halfTime) {
        return false;
      }
    }
    return super.canAim ? super.canAim() : true;
  }

  get channelTurnRate() {
    return 0.065; // Smooth rotational auto-aim tracking during preparation phase
  }

  isChannelingSkill() {
    return Boolean(this.isChannelingThunderclap || this.thunderclapChannelTimer > 0);
  }

  isStationarySkillActive() {
    return Boolean(this.isChannelingThunderclap || this.thunderclapChannelTimer > 0 || this.isDashingThunderclap);
  }

  _updateDashVFX() {
    if (this.thunderclapDashVFX) {
      this.thunderclapDashVFX.timer++;
      if (this.thunderclapDashVFX.timer >= this.thunderclapDashVFX.maxTimer) {
        this.thunderclapDashVFX = null;
      }
    }
  }

  interruptAttacks(forceCancelAll = false) {
    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks(forceCancelAll);
    }
    this.isChannelingThunderclap = false;
    this.isThunderclapAimLocked = false;
    this.thunderclapChannelTimer = 0;
    this.thunderclapTarget = null;
    this.isDashingThunderclap = false;
    if (forceCancelAll) {
      this.thunderclapDashVFX = null;
    }
  }

  update(opponent, ownerIndex, arena) {
    // 1. Rule 1 Freeze / TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Always tick dash VFX timer so air linger and disappearance fadeout never freeze during channeling
    this._updateDashVFX();

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const target = this.getNearestTarget(opponent);

    // Active 6-Frame Lightning Dash Travel (Hekireki Issen Godspeed Travel)
    if (this.isDashingThunderclap) {
      this.thunderclapDashStep++;
      const travelT = Math.min(1.0, this.thunderclapDashStep / this.thunderclapDashDuration);
      const easeT = travelT * (2 - travelT); // Quadratic ease-out godspeed burst
      this.x = this.thunderclapDashStartX + (this.thunderclapDashDestX - this.thunderclapDashStartX) * easeT;
      this.y = this.thunderclapDashStartY + (this.thunderclapDashDestY - this.thunderclapDashStartY) * easeT;
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = this.thunderclapDashAngle;
      this.angle = this.thunderclapDashAngle;

      spawnSparks(this.x, this.y, 2, 'cyan', '#38BDF8');

      if (this.thunderclapDashStep >= this.thunderclapDashDuration) {
        this.isDashingThunderclap = false;
        this.x = this.thunderclapDashDestX;
        this.y = this.thunderclapDashDestY;
        const dashSpeed = (this.speed || 6.4) * 1.5;
        this.vx = Math.cos(this.thunderclapDashAngle) * dashSpeed;
        this.vy = Math.sin(this.thunderclapDashAngle) * dashSpeed;

        this._finalizeThunderclapHit(
          this.thunderclapDashTarget,
          this.thunderclapDashStartX,
          this.thunderclapDashStartY,
          this.thunderclapDashDestX,
          this.thunderclapDashDestY,
          this.thunderclapDashAngle
        );
      }
      return;
    }

    // Skill 1 Channeling Update (Frames 1-2 Stance & Charge Build-Up)
    if (this.isChannelingThunderclap && this.thunderclapChannelTimer > 0) {
      this.thunderclapChannelTimer--;
      this.vx = 0;
      this.vy = 0;

      const halfTime = Math.floor((this.thunderclapChannelDuration || 36) / 2);

      // Phase 1: Preparation (Timer > halfTime) -> Auto-Aim Enabled & Smoothly Tracking Opponent
      if (this.thunderclapChannelTimer > halfTime) {
        const aimTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
          ? this.thunderclapTarget
          : target;
        if (aimTarget) {
          this.aim(aimTarget);
        }
        this.skillCastAngle = this.gunAngle;
      } else {
        // Phase 2: Lock-in to 1 Direction (Timer <= halfTime) -> Commit strictly, NO direction change
        if (!this.isThunderclapAimLocked) {
          this.isThunderclapAimLocked = true;
          const lockedTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
            ? this.thunderclapTarget
            : target;
          if (lockedTarget) {
            const dist = Math.hypot(lockedTarget.x - this.x, lockedTarget.y - this.y);
            this.thunderclapLockedDistance = Math.min(480, Math.max(160, dist + (lockedTarget.r || 25) + 35));
          } else {
            this.thunderclapLockedDistance = 260;
          }

          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_parry', 0.25);
          }
        }

        // Strictly clamp to committed lock angle: NO snapping, NO turning
        this.gunAngle = this.skillCastAngle;
        this.angle = this.skillCastAngle;
      }

      // Energy particles around feet and haori: ONLY during active lightning bursts
      const totalChannel = this.thunderclapChannelDuration || 100;
      const elapsedChannel = totalChannel - this.thunderclapChannelTimer;
      if (isZenitsuThunderclapBurst(totalChannel, elapsedChannel)) {
        spawnSparks(
          this.x + (Math.random() - 0.5) * (this.r || 25) * 1.2,
          this.y + (Math.random() - 0.5) * (this.r || 25) * 0.8,
          2,
          'cyan',
          '#38BDF8'
        );
      }

      // Channel complete -> explosive burst dash along committed 1 direction!
      if (this.thunderclapChannelTimer <= 0) {
        this.isChannelingThunderclap = false;
        this.isThunderclapAimLocked = false;
        const dashTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
          ? this.thunderclapTarget
          : target;
        this._executeThunderclapDash(dashTarget);
      }
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Decay swing timers
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // Skill Cooldowns
    if (this.thunderclapCooldown > 0) this.thunderclapCooldown--;
    if (this.rokurenCooldown > 0) this.rokurenCooldown--;
    if (this.flamingGodCooldown > 0) this.flamingGodCooldown--;

    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority (config-driven enable/disable)
    if (this.isSkillEnabled(cfg.enableFlamingThunderGod, false) && this.flamingGodCooldown <= 0 && dist < 220) {
      this._triggerFlamingThunderGod(target);
    } else if (this.isSkillEnabled(cfg.enableRokuren, false) && this.rokurenCooldown <= 0 && dist < 200) {
      this._triggerRokuren(target);
    } else if (this.isSkillEnabled(cfg.enableThunderclap, true) && this.thunderclapCooldown <= 0 && dist < 450) {
      this._triggerThunderclapAndFlash(target);
    } else if (dist < (cfg.katanaReach || 78) + (target.r || 25) && this.slashSwingTimer <= 0 && this.isSkillEnabled(cfg.enableBasicAttack, true)) {
      this._executeThunderIaiCombo(target);
    }
  }

  getNearestTarget(fallbackOpponent = null) {
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
    if (nearest) return nearest;
    if (fallbackOpponent && fallbackOpponent !== this && fallbackOpponent.hp > 0 && !fallbackOpponent.isDead) {
      return fallbackOpponent;
    }
    return null;
  }

  _executeThunderIaiCombo(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.iaiComboCount = (this.iaiComboCount + 1) % 3;

    this.aim(target);
    const reach = 78;
    const arc = Math.PI * 0.778; // 140 degrees (Rule 7)
    const angle = this.gunAngle || 0;

    const damages = [18, 22, 28];
    let dmg = damages[this.iaiComboCount];
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    if (this.isSkillEnabled(cfg.enableBattleTrance, true) && this.inBattleTrance) {
      dmg = Math.round(dmg * 1.5);
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
          spawnSparks(ent.x, ent.y, 8, 'gold', '#F59E0B');
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
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    this.thunderclapCooldown = this.thunderclapCooldownMax;
    this.thunderclapChannelDuration = cfg.thunderclapChannelDuration || 36;
    this.thunderclapChannelTimer = this.thunderclapChannelDuration;
    this.isChannelingThunderclap = true;
    this.thunderclapTarget = target;

    // Smooth aim initialization without instant snapping
    if (this.gunAngle === undefined) {
      this.gunAngle = this.angle || 0;
    }
    this.skillCastAngle = this.gunAngle;
    this.vx = 0;
    this.vy = 0;

    if (target) {
      this.aim(target);
      this.skillCastAngle = this.gunAngle;
    }

    // Frame 1: calm-before-the-storm stance sound
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.25);
    }
  }

  _executeThunderclapDash(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;

    // Commit strictly to the locked angle: ZERO snap change in direction!
    const angle = this.skillCastAngle;
    this.gunAngle = angle;
    this.angle = angle;

    const dashDist = this.thunderclapLockedDistance || 260;
    const startX = this.x;
    const startY = this.y;

    // Destination is strictly along the committed angle vector
    let destX = startX + Math.cos(angle) * dashDist;
    let destY = startY + Math.sin(angle) * dashDist;

    // Clamp destination to arena bounds
    if (state.arena) {
      const pad = (this.r || 25) + 12;
      destX = Math.max(state.arena.x + pad, Math.min(state.arena.x + state.arena.width - pad, destX));
      destY = Math.max(state.arena.y + pad, Math.min(state.arena.y + state.arena.height - pad, destY));
    }

    const actualDashDist = Math.hypot(destX - startX, destY - startY);

    // Initialize 6-Frame Godspeed Travel State
    this.isDashingThunderclap = true;
    this.thunderclapDashStep = 0;
    this.thunderclapDashDuration = 6;
    this.thunderclapDashStartX = startX;
    this.thunderclapDashStartY = startY;
    this.thunderclapDashDestX = destX;
    this.thunderclapDashDestY = destY;
    this.thunderclapDashAngle = angle;
    this.thunderclapDashDist = actualDashDist;
    this.thunderclapDashTarget = target;

    // Initialize Lightning Dash VFX with air linger & disappearance animation
    const travelDuration = 6;
    const lingerDuration = 8;
    const disappearDuration = 16;
    this.thunderclapDashVFX = {
      startX: startX,
      startY: startY,
      destX: destX,
      destY: destY,
      angle: angle,
      dist: actualDashDist,
      timer: 0,
      travelDuration: travelDuration,
      lingerDuration: lingerDuration,
      disappearDuration: disappearDuration,
      maxTimer: travelDuration + lingerDuration + disappearDuration // 30 frames (~0.50s)
    };

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.35);
    }
  }

  _finalizeThunderclapHit(target, startX, startY, destX, destY, angle) {
    this.slashSwingTimer = this.slashSwingMaxTimer;

    // Check collision / hit on any targets along or near the dash line
    const hitEntities = [];
    const allEnemies = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEnemies) {
      if (ent === this || ent.isDead || ent.hp <= 0) continue;
      if (ent.ownerIndex !== undefined && this.ownerIndex !== undefined && ent.ownerIndex === this.ownerIndex) continue;

      const hitRadius = (this.r || 25) + (ent.r || 25) + 30;

      // Point-to-segment distance check
      const segDx = destX - startX;
      const segDy = destY - startY;
      const segLenSq = segDx * segDx + segDy * segDy;
      let t = segLenSq > 0 ? ((ent.x - startX) * segDx + (ent.y - startY) * segDy) / segLenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const projX = startX + t * segDx;
      const projY = startY + t * segDy;
      const dProj = Math.hypot(ent.x - projX, ent.y - projY);

      if (dProj <= hitRadius || (target && ent === target)) {
        hitEntities.push(ent);
      }
    }

    if (hitEntities.length === 0 && target && target.hp > 0 && !target.isDead) {
      hitEntities.push(target);
    }

    for (const hitEnt of hitEntities) {
      applyDamageToTarget(hitEnt, 38, this);
      hitEnt.applyKnockback?.(Math.cos(angle) * 26, Math.sin(angle) * 26);
      spawnSparks(hitEnt.x, hitEnt.y, 14, 'cyan', '#38BDF8');
      spawnImpactFlash(hitEnt.x, hitEnt.y, '#38BDF8', 26);
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_thunderstrike', 0.4);
    }
    triggerGlobalScreenShake(5, 12);
    spawnFloatingText(this.x, this.y - 30, '霹靂一閃 HEKIREKI ISSEN!', '#38BDF8');
  }

  _triggerRokuren(target) {
    this.rokurenCooldown = this.rokurenCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    applyDamageToTarget(target, 48, this);
    target.applyKnockback?.(Math.cos(this.gunAngle || 0) * 30, Math.sin(this.gunAngle || 0) * 30);
    spawnSparks(target.x, target.y, 18, 'gold', '#F59E0B');
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

    spawnSparks(target.x, target.y, 24, 'flame', '#FBBF24');
    spawnImpactFlash(target.x, target.y, '#EF4444', 45);
    triggerGlobalScreenShake(9, 20);
    spawnFloatingText(this.x, this.y - 40, '火雷神 FLAMING THUNDER GOD!', '#F59E0B');
  }

  draw(ctx) {
    drawZenitsuSkin(ctx, this);
  }
}
