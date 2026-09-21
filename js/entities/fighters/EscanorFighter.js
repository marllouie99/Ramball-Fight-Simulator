// ─────────────────────────────────────────────
// Escanor — The Lion's Sin of Pride (Entity & Combat Engine)
// The Seven Deadly Sins (Nanatsu no Taizai)
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 1.1 (Centralized Movement & Physics Standard)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 (Frontal Arc Radius AOE for Rhitta Axe Cleaves)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #F59E0B)
// - Rule 19 & 20 (Fighter Skin & Hand Visibility Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawEscanorSkin, _getEscanorChopAnimationState } from '../../graphics/fighters/escanorSkin.js';
import { drawCruelSunOrb, drawPrideFlareShockwave, drawDivineSwordEscanorBlade, drawRhittaSlashArc } from '../../graphics/weapons/escanorWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

/**
 * Computes minimum squared distance from point (px, py) to segment [A, B] and closest projected point.
 */
function _distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) {
    const dpx = px - ax;
    const dpy = py - ay;
    return { distSq: dpx * dpx + dpy * dpy, projX: ax, projY: ay };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return { distSq: ex * ex + ey * ey, projX, projY };
}

/**
 * Calculates world-space blade segment [inner, tip] and hand coordinates at given strike progress.
 */
function _getEscanorBladeWorldSegment(fighter, strikeP) {
  const r = fighter.r || 32;
  const overheadAngle = -2.45;
  const strikeEndAngle = 1.05;
  const overheadHandX = -r * 0.25;
  const overheadHandY = -r * 0.40;
  const strikeEndHandX = r * 1.15;
  const strikeEndHandY = r * 0.42;
  const overheadBackHandX = r * 0.35;
  const overheadBackHandY = -r * 0.10;
  const strikeEndBackHandX = r * 1.35;
  const strikeEndBackHandY = -r * 0.05;

  const clampedP = Math.max(0, Math.min(1.0, strikeP));
  const ease = 1 - Math.pow(1 - clampedP, 3);
  const localAxeAngle = overheadAngle + (strikeEndAngle - overheadAngle) * ease;
  const localHandX = overheadHandX + ease * (strikeEndHandX - overheadHandX);
  const localHandY = overheadHandY + ease * (strikeEndHandY - overheadHandY);
  const localBackHandX = overheadBackHandX + ease * (strikeEndBackHandX - overheadBackHandX);
  const localBackHandY = overheadBackHandY + ease * (strikeEndBackHandY - overheadBackHandY);

  const aimAngle = (fighter.chopCastAngle !== undefined)
    ? fighter.chopCastAngle
    : ((fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(aimAngle) > Math.PI / 2;

  const effHandY = facingLeft ? -localHandY : localHandY;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const worldHandX = fighter.x + (cosA * localHandX - sinA * effHandY);
  const worldHandY = (fighter.y - (fighter.z || 0)) + (sinA * localHandX + cosA * effHandY);
  const worldAxeAngle = facingLeft ? (aimAngle - localAxeAngle) : (aimAngle + localAxeAngle);

  const prideScaleMult = 1.0 + (fighter.prideStacks || 0) * 0.04;
  const shaftDist = (r * 4.0) * (fighter.isTheOneActive ? 1.35 : prideScaleMult);
  const reach = (typeof fighter.currentRhittaReach === 'number') ? fighter.currentRhittaReach : 160;

  const innerDist = Math.max(16, r * 0.55);
  const tipDist = Math.max(shaftDist * 1.30, reach * 0.96);

  return {
    innerX: worldHandX + Math.cos(worldAxeAngle) * innerDist,
    innerY: worldHandY + Math.sin(worldAxeAngle) * innerDist,
    tipX: worldHandX + Math.cos(worldAxeAngle) * tipDist,
    tipY: worldHandY + Math.sin(worldAxeAngle) * tipDist,
    worldHandX,
    worldHandY,
    worldAxeAngle,
    localAxeAngle,
    localHandX,
    localHandY,
    localBackHandX,
    localBackHandY
  };
}

/**
 * Tests direct geometric collision between target and Rhitta's blade swept across strike progress.
 */
function _testRhittaBladeHit(fighter, target, currentStrikeP, prevStrikeP) {
  if (!target || target.dead || target.isDead || target.hp <= 0) return null;

  const dx = target.x - fighter.x;
  const dy = target.y - (fighter.y - (fighter.z || 0));
  const dist = Math.hypot(dx, dy);
  const r = fighter.r || 32;
  const targetRadius = target.r || 25;
  const reach = (typeof fighter.currentRhittaReach === 'number') ? fighter.currentRhittaReach : 160;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const arcLimit = (typeof cfg.chopFrontalArcLimit === 'number') ? cfg.chopFrontalArcLimit : 1.34;
  const bladeRadius = (typeof cfg.chopBladeRadius === 'number')
    ? cfg.chopBladeRadius
    : Math.max(18, (r * 0.60) * (fighter.isTheOneActive ? 1.3 : 1.0));

  // 1. Strict Frontal Arc Guard (Rule 1.6): Downward chop can only strike targets in front
  const aimAngle = (fighter.chopCastAngle !== undefined)
    ? fighter.chopCastAngle
    : ((fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0));
  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - aimAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (Math.abs(angleDiff) > arcLimit) return null;

  // 2. Maximum reach boundary guard
  if (dist > (r + reach + targetRadius + 15)) return null;

  // 3. Forward cleave progress bounds: axe is high behind back when strikeP < 0.12
  const minP = Math.min(prevStrikeP, currentStrikeP);
  const maxP = Math.max(prevStrikeP, currentStrikeP);
  if (maxP < 0.12) return null;

  const startP = Math.max(0.12, minP);
  const endP = Math.max(0.12, maxP);
  const pDiff = endP - startP;
  const numSamples = (pDiff > 0.3) ? 7 : ((pDiff > 0.08) ? 5 : 3);
  const hitThresholdSq = Math.pow(targetRadius + bladeRadius, 2);

  for (let i = 0; i < numSamples; i++) {
    const t = (numSamples === 1) ? 1.0 : (i / (numSamples - 1));
    const sampleP = startP + t * (endP - startP);
    const blade = _getEscanorBladeWorldSegment(fighter, sampleP);
    const res = _distToSegment(target.x, target.y, blade.innerX, blade.innerY, blade.tipX, blade.tipY);

    if (res.distSq <= hitThresholdSq) {
      return { sampleP, blade, contactX: res.projX, contactY: res.projY, angleToTarget };
    }
  }

  return null;
}

export class EscanorFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'escanor';
    this.type = 'escanor';
    this.color = '#F59E0B'; // Solar Gold
    this.themeColor = '#F59E0B';
    this.secondaryColor = '#DC2626'; // Solar Flare Crimson

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 390) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Body size & growth scaling
    this.baseRadius = def?.radius || cfg.radius || 32;
    this.r = this.baseRadius;

    // Rule 1.4 Committed Aim & Smooth Turn Rate
    this.chopCastAngle = undefined;
    this.aimTurnRate = (typeof cfg.aimTurnRate === 'number') ? cfg.aimTurnRate : 0.12;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 20;
    this.slashSwingImpactTimer = 10;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.chopHitProgress = null;
    this.chopHitAxeAngle = null;
    this.chopHitHandX = null;
    this.chopHitHandY = null;
    this.chopHitBackHandX = null;
    this.chopHitBackHandY = null;
    this._chopPreviousStrikeP = 0;
    this.chopHitPauseTimer = 0;
    this.chopHitPauseMax = 0;
    this.chopHitPauseTarget = null;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Attack Release & World-Space Anchoring
    this.slashOriginX = undefined;
    this.slashOriginY = undefined;
    this.slashOriginAngle = undefined;
    this.slashOriginReach = undefined;
    this.slashOriginRadius = undefined;
    this.slashOriginTheOne = undefined;

    // Passive: Sunshine & Solar Pride Stacks
    this.prideStacks = 0;
    this.prideMaxStacks = cfg.prideStackMax || 5;
    this.prideChargeTimer = 0;
    this.sunshineHeatTimer = 0;

    // Skill 1: Cruel Sun (無慈悲な太陽)
    this.cruelSunCooldownMax = cfg.cruelSunCooldown || 510;
    this.cruelSunCooldown = this.cruelSunCooldownMax;
    this.activeCruelSuns = []; // Active orbs

    // Skill 2: Pride Flare (プライド・フレア)
    this.prideFlareCooldownMax = cfg.prideFlareCooldown || 660;
    this.prideFlareCooldown = this.prideFlareCooldownMax;
    this.prideFlareActiveTimer = 0;
    this.prideFlareMaxTimer = 24;

    // Ultimate: "THE ONE" — Divine Sword Escanor (天地無双)
    this.theOneCooldownMax = cfg.theOneCooldown || 1560;
    this.theOneCooldown = this.theOneCooldownMax;
    this.isTheOneActive = false;
    this.theOneTimer = 0;
    this.theOneMaxTimer = cfg.theOneDuration || 480;
    this.theOneFinisherUsed = false;
    this.divineSwordActiveTimer = 0;
    this.divineSwordMaxTimer = 24;
    this.divineSwordAngle = 0;
    this.divineSwordReach = 160;

    // Unshakable Solar Poise: Immune to all pull / pushback / knockback mechanics from enemies
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToPull = true;
    this.gojoBlueDragImmune = true;

    // Solar Lord: Complete Burn Status & Fire Immunity
    this.isImmuneToBurn = true;
    this.burnTimer = 0;
    this.burnDamageTimer = 0;

    // Solar Armor & Holy Knight DEF stats
    this.baseDefense = cfg.defense ?? 0.20;
    this.defense = this.baseDefense;
    this._lastArmorDeflectTime = 0;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'cruel_sun',
        name: 'Cruel Sun (無慈悲な太陽)',
        type: 'active',
        cooldownKey: 'cruelSunCooldown',
        cooldownMaxKey: 'cruelSunCooldownMax'
      },
      {
        id: 'pride_flare',
        name: 'Pride Flare (プライド・フレア)',
        type: 'active',
        cooldownKey: 'prideFlareCooldown',
        cooldownMaxKey: 'prideFlareCooldownMax'
      },
      {
        id: 'the_one',
        name: '"THE ONE" (天上天下唯我独尊)',
        type: 'ultimate',
        cooldownKey: 'theOneCooldown',
        cooldownMaxKey: 'theOneCooldownMax'
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    this.baseDefense = cfg.defense ?? 0.20;
    this.defense = this.baseDefense;
    this.baseRadius = cfg.radius || 32;
    this.r = this.baseRadius;
    this.aimTurnRate = (typeof cfg.aimTurnRate === 'number') ? cfg.aimTurnRate : 0.12;
    this.chopCastAngle = undefined;
    this.isImmuneToBurn = true;
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.divineSwordActiveTimer = 0;
    this._lastArmorDeflectTime = 0;
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToPull = true;
    this.gojoBlueDragImmune = true;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.slashSwingTimer = 0;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.chopHitProgress = null;
    this.chopHitAxeAngle = null;
    this.chopHitHandX = null;
    this.chopHitHandY = null;
    this.chopHitBackHandX = null;
    this.chopHitBackHandY = null;
    this._chopPreviousStrikeP = 0;
    this.chopHitPauseTimer = 0;
    this.chopHitPauseMax = 0;
    this.chopHitPauseTarget = null;
    this.prideStacks = 0;
    this.prideChargeTimer = 0;
    this.isTheOneActive = false;
    this.theOneTimer = 0;
    this.theOneFinisherUsed = false;
    this.activeCruelSuns = [];
    this.slashOriginX = undefined;
    this.slashOriginY = undefined;
    this.slashOriginAngle = undefined;
    this.slashOriginReach = undefined;
    this.slashOriginRadius = undefined;
    this.slashOriginTheOne = undefined;
  }

  /**
   * Disables default projectile gun rendering since Escanor wields Divine Axe Rhitta.
   */
  drawGun(ctx) {
    // Escanor wields Divine Axe Rhitta, suppressing standard gun barrels.
  }

  /**
   * Aim Validation Guard:
   * Allows smooth auto-aim tracking while lifting/holding Divine Axe Rhitta (isLiftingWeapon),
   * but strictly locks aim during the downward chop strike, impact hit-pause, and recovery.
   */
  canAim() {
    if (this.chopHitPauseTimer > 0) {
      return false;
    }
    if (this.slashSwingTimer > 0 && !this.isLiftingWeapon()) {
      return false;
    }
    return super.canAim ? super.canAim() : true;
  }

  /**
   * Smooth Auto-Aim & Committed Swing Execution:
   * - While lifting weapon: smoothly tracks target using aimTurnRate (no angle snapping).
   * - Downward strike & recovery: locks strictly to the committed chopCastAngle.
   */
  aim(target) {
    if (this.chopHitPauseTimer > 0 || (this.slashSwingTimer > 0 && !this.isLiftingWeapon())) {
      if (this.chopCastAngle !== undefined) {
        this.gunAngle = this.chopCastAngle;
        this.angle = this.chopCastAngle;
      }
      return false;
    }
    if (!target) return false;
    const aimed = super.aim(target);
    if (this.isLiftingWeapon()) {
      this.chopCastAngle = this.gunAngle;
    }
    return aimed;
  }

  /**
   * Returns true while Escanor is winding up (lifting or holding) Divine Axe Rhitta.
   */
  isLiftingWeapon() {
    if (this.slashSwingTimer <= 0) return false;
    const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (CONFIG.escanor?.chopStrikeFrames || 24);
    const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (CONFIG.escanor?.chopRecoveryFrames || 28);
    return this.slashSwingTimer > (strikeFrames + recFrames);
  }

  /**
   * Super Armor / Solar Poise: Immune to all pushback / knockback attacks from enemies
   */
  applyKnockback(vx, vy, stunFrames = 0) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    // Escanor is completely immune to any pull/push back mechanics coming from enemies
    return;
  }

  /**
   * Super Armor / Solar Poise: Immune to Gojo Red explosive knockback
   */
  applyRedKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    return;
  }

  /**
   * Super Armor: Immune to hit-stun / flinch interruptions while lifting weapon
   */
  applyHitStun(duration, opts = {}) {
    if (this.isLiftingWeapon() || (this.chopHitPauseTimer || 0) > 0) {
      return; // Unwavering solar poise
    }
    super.applyHitStun(duration, opts);
  }

  /**
   * Dynamic Defense (DEF) Calculation:
   * Combines base Holy Armor DEF + Solar Pride escalation + "THE ONE" invincible state + Rhitta lifting poise.
   * @returns {number} Fraction of damage mitigated (e.g. 0.20 = 20% DEF)
   */
  get currentDefense() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const baseDef = cfg.defense ?? 0.20;
    const prideDef = (this.prideStacks || 0) * (cfg.prideDefBonusPerStack ?? 0.02);
    const theOneDef = this.isTheOneActive ? (cfg.theOneDefenseBonus ?? 0.25) : 0;
    const liftingDef = this.isLiftingWeapon() ? (cfg.liftingDefenseBonus ?? 0.15) : 0;

    let totalDef = Math.min(0.85, baseDef + prideDef + theOneDef + liftingDef);

    // Nanami's 7:3 Ratio armor fracture weakens active defense
    if (this.nanamiArmorFractureTimer > 0) {
      totalDef = Math.max(0, totalDef - (this.nanamiArmorFractureAmount || 0.20));
    }

    return totalDef;
  }

  /**
   * Dynamic Weapon Attack Range / Reach Calculation:
   * Scales dynamically as Escanor grows in size with Solar Pride escalation and "THE ONE" High Noon state.
   * Directly incorporates physical size scaling (this.r / baseRadius) so that when Escanor gets big,
   * his weapon attack range increases proportionally.
   * @returns {number} Current reach in pixels
   */
  get currentRhittaReach() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const baseReach = cfg.rhittaReach || 160;
    const baseRadius = this.baseRadius || cfg.radius || 32;
    const currentRadius = this.r || baseRadius;
    const sizeScale = currentRadius / baseRadius;

    if (this.isTheOneActive) {
      const theOneMult = cfg.theOneReachMultiplier || 1.45;
      return Math.round(baseReach * theOneMult * sizeScale);
    }

    const prideBonus = (this.prideStacks || 0) * (cfg.prideReachBonusPerStack || 0.06);
    return Math.round(baseReach * (1.0 + prideBonus) * sizeScale);
  }

  /**
   * Dynamic Finisher Reach for Divine Sword Escanor during "THE ONE".
   * Scales dynamically with Escanor's enlarged physical body radius.
   * @returns {number}
   */
  get currentFinisherReach() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const baseFinisherReach = cfg.theOneFinisherReach || 165;
    const baseRadius = this.baseRadius || cfg.radius || 32;
    const currentRadius = this.r || baseRadius;
    const sizeScale = currentRadius / baseRadius;
    return Math.round(baseFinisherReach * sizeScale);
  }

  /**
   * Dynamic Sunshine Heat Aura Radius:
   * Driven by CONFIG.escanor.sunshineHeatRadius and scaled with body size and "THE ONE".
   * @returns {number}
   */
  get currentSunshineHeatRadius() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const baseRadius = (typeof cfg.sunshineHeatRadius === 'number') ? cfg.sunshineHeatRadius : 200;
    const bodyBaseRadius = this.baseRadius || cfg.radius || 32;
    const sizeScale = (this.r || bodyBaseRadius) / bodyBaseRadius;
    const theOneMult = this.isTheOneActive ? 1.35 : 1.0;
    return Math.round(baseRadius * sizeScale * theOneMult);
  }

  /**
   * Solar Armor & Holy Knight DEF Damage Mitigation
   */
  takeDamage(amount, attacker, opts = {}) {
    // Escanor is the Master of the Sun / Grace "Sunshine" and is completely immune to burn/fire ticks
    if (opts.isBurn) {
      return 0;
    }

    if (opts.isHeal || amount < 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    const isTrueDamage = Boolean(opts && (opts.isTrueDamage || opts.isRatioCrit || opts.isPureUnscaled));
    let finalAmount = amount;

    // ── SOLAR ARMOR & HOLY KNIGHT DEFENSE (DEF STATS) ──
    if (!isTrueDamage) {
      const totalDef = this.currentDefense;
      finalAmount = Math.max(1, amount * (1.0 - totalDef));

      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
      if (cfg.armorDeflectSparks !== false && finalAmount < amount) {
        const now = Date.now();
        if (!this._lastArmorDeflectTime || now - this._lastArmorDeflectTime > 180) {
          this._lastArmorDeflectTime = now;
          spawnSparks(this.x, this.y - (this.z || 0), 6, 'gold', '#F59E0B');
          spawnSparks(this.x, this.y - (this.z || 0), 4, 'silverStreak', '#FBBF24');
          try {
            const parrySnd = cfg.sounds?.armorParry || 'Assets/Sound Effects/Skills/parry.mp3';
            const parryVol = cfg.soundVolumes?.armorParry !== undefined ? cfg.soundVolumes.armorParry : 0.35;
            audioSystem.playSFX(parrySnd, parryVol);
          } catch (e) {}
        }
      }
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  /**
   * Complete Burn Immunity: Escanor embodies the blazing solar heat of Grace "Sunshine"
   */
  applyBurn(attacker, duration) {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
  }

  canPerformBasicAttack() {
    if ((this.chopHitPauseTimer || 0) > 0 || (this.slashSwingTimer || 0) > 0) return false;
    return super.canPerformBasicAttack();
  }

  /**
   * Holds round and match transitions active while Escanor completes his basic attack
   * (overhead lift, hold, downward strike, dramatic hit-pause, knockback blast, and recovery)
   * or active finishing moves, ensuring his full attack animation never gets cut off when the enemy dies and he wins.
   * @returns {boolean}
   */
  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.dead || this.isDead) return false;
    if ((this.slashSwingTimer && this.slashSwingTimer > 0) || (this.chopHitPauseTimer && this.chopHitPauseTimer > 0)) {
      return true;
    }
    return super.hasActiveFinishingAbility ? super.hasActiveFinishingAbility() : false;
  }

  /**
   * Manual / 2P Player Input & Base Fighter Update Trigger for Basic Attack
   * Strictly verifies melee range so Escanor never chops when out of range!
   */
  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack() || this.chopHitPauseTimer > 0 || this.slashSwingTimer > 0) return false;
    const target = this.getNearestTarget(null);
    if (!target) return false;

    const reach = (this.r || 25) + this.currentRhittaReach + (target.r || 25);
    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    if (dist <= reach && this.shootCooldown <= 0 && this.slashSwingTimer <= 0) {
      this._startRhittaChop(target);
      return true;
    }
    return false;
  }

  update(opponent, ownerIndex, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};

    // 1. Rule 1 Freeze / TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      const isNanamiPausing = typeof isGlobalHitPauseActive === 'function' && isGlobalHitPauseActive(state, this);
      if (!isNanamiPausing && !this.isChannelingCruelSun && !this.isChannelingDivineSword && !this.cruelSunCharging) {
        this.interruptAttacks();
      }
      return;
    }

    // ── Dramatic Axe Chop Hit-Pause (freeze in mid-chop impact pose) ──
    if (this.chopHitPauseTimer > 0) {
      this.chopHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // Hold committed cast angle firmly during hit-pause
      if (this.chopCastAngle !== undefined) {
        this.gunAngle = this.chopCastAngle;
        this.angle = this.chopCastAngle;
      }

      // Keep target frozen in hit-pause stasis
      if (this.chopHitPauseTarget) {
        this.chopHitPauseTarget.vx = 0;
        this.chopHitPauseTarget.vy = 0;
        if (typeof this.chopHitPauseTarget.applyTimeStop === 'function') {
          this.chopHitPauseTarget.applyTimeStop(this.chopHitPauseTimer);
        } else {
          this.chopHitPauseTarget.timeStopTimer = Math.max(this.chopHitPauseTarget.timeStopTimer || 0, this.chopHitPauseTimer);
        }
        this.chopHitPauseTarget.suppressFreezeOverlay = true;
      }

      // On pause completion (unpause moment): release stasis, launch knockback & screen shake!
      if (this.chopHitPauseTimer === 0) {
        const unpauseShake = (cfg.basicUnpauseShake || 10.0) * (this.isTheOneActive ? 1.5 : 1.0);
        const unpauseDur = cfg.basicUnpauseShakeDuration || 18;
        triggerGlobalScreenShake(unpauseShake, unpauseDur);

        if (this.chopHitPauseTarget) {
          const target = this.chopHitPauseTarget;
          target.suppressFreezeOverlay = false;
          target.timeStopTimer = 0; // Release timeStop so knockback is NOT zeroed by physics!

          // Tag target for wall pin upon wall collision
          target.isWallPinnedByEscanor = true;
          target._knockedBackByEscanorBasicAttack = true;
          target._escanorAttacker = this;

          // Apply physical knockback push upon unpause along committed chop angle
          const knockbackAngle = (this.chopCastAngle !== undefined)
            ? this.chopCastAngle
            : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
          const prideMult = 1.0 + (this.prideStacks * (cfg.prideStackDamageBonus || 0.08)) + (this.isTheOneActive ? 0.45 : 0);
          const baseKnockback = (cfg.basicKnockback || 50.0) * (this.isTheOneActive ? 1.6 : 1.0) * prideMult;

          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(knockbackAngle) * baseKnockback, Math.sin(knockbackAngle) * baseKnockback);
          } else {
            target.knockbackVx = Math.cos(knockbackAngle) * baseKnockback;
            target.knockbackVy = Math.sin(knockbackAngle) * baseKnockback;
            target.vx = target.knockbackVx;
            target.vy = target.knockbackVy;
          }

          // Apply hit stun so target reels in knockback
          const stunFrames = cfg.basicHitStunFrames || 18;
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(stunFrames);
          } else {
            target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunFrames);
          }

          // Crushing weight slow — stagger from divine axe impact
          if (typeof target.applySlow === 'function') {
            target.applySlow(45, 0.4); // 40% speed for ~0.75s
          }

          // Explosive unpause effects: blood burst, sparks & heavy cleave audio!
          spawnBloodEffect(target.x, target.y, 10, knockbackAngle);
          spawnSparks(target.x, target.y, '#F59E0B', 14);

          try {
            const unpauseSnd = cfg.sounds?.unpauseHit || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
            const unpauseVol = cfg.soundVolumes?.unpauseHit !== undefined ? cfg.soundVolumes.unpauseHit : 1.0;
            audioSystem.playSFX(unpauseSnd, unpauseVol);
          } catch (e) {}

          // Residual forward cleave step on unpause carries weapon weight
          this.vx = Math.cos(knockbackAngle) * 2.2;
          this.vy = Math.sin(knockbackAngle) * 2.2;

          this.chopHitPauseTarget = null;
        }
      }
      return; // Freeze Escanor's actions during the hit-pause!
    }

    // Super Armor / Solar Poise: Zero out and negate any incoming knockback, pull, or wall-pin states
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.isWallPinnedByMakima = false;
    this.isCurrentlyWallPinnedByMakima = false;
    this.makimaWallPinTimer = 0;
    this.isWallPinnedBySaitama = false;
    this._knockedBackBySaitamaBasicPunch = false;
    this.isDraggedByGetsuga = false;
    this.isCaughtInBluePull = false;
    this.isCaughtInBlackHole = false;
    this.isCaughtInPurple = false;
    this.caughtInGenosFlurry = false;
    this.preventKnockbackBounce = false;
    this.burnTimer = 0;
    this.burnDamageTimer = 0;

    // Centralized Movement & Physics (Rule 1.1)
    super.update(opponent, ownerIndex, arena);

    // Lock facing direction strictly to committed chopCastAngle during downward strike, hit-pause, and recovery
    if (this.slashSwingTimer > 0 || (this.chopHitPauseTimer || 0) > 0) {
      if (this.isLiftingWeapon()) {
        this.chopCastAngle = this.gunAngle;
      } else if (this.chopCastAngle !== undefined) {
        this.gunAngle = this.chopCastAngle;
        this.angle = this.chopCastAngle;
      }
    }

    // Dynamically scale physical body radius as Escanor grows with Solar Pride & "THE ONE"
    const sizeGrowth = this.isTheOneActive
      ? (cfg.theOneRadiusBonus ?? 4)
      : ((this.prideStacks || 0) * (cfg.prideRadiusBonusPerStack ?? 1.0));
    this.r = (this.baseRadius || 32) + sizeGrowth;

    // Cleaver / Axe Swing Timer & Downward Chop Hit Delivery
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (CONFIG.escanor?.chopRecoveryFrames || 24);
      const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (CONFIG.escanor?.chopStrikeFrames || 15);
      
      // When Escanor releases his attack, snapshot its world origin & cast angle so the effect stays anchored in the air
      if (!this.isLiftingWeapon()) {
        if (this.slashOriginX === undefined) {
          this.slashOriginX = this.x;
          this.slashOriginY = this.y - (this.z || 0);
          this.slashOriginAngle = (this.chopCastAngle !== undefined)
            ? this.chopCastAngle
            : ((this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : (this.angle || 0));
          this.slashOriginReach = this.currentRhittaReach;
          this.slashOriginRadius = this.r;
          this.slashOriginTheOne = Boolean(this.isTheOneActive);

          try {
            const attackSnd = cfg.sounds?.attack || 'Assets/Sound Effects/Attacks/Escanor-attack.mp3';
            const attackVol = cfg.soundVolumes?.attack !== undefined ? cfg.soundVolumes.attack : 1.0;
            audioSystem.playSFX(attackSnd, attackVol);
          } catch (e) {}
        }
      }

      // Active downward strike window: continuously test weapon collision on every frame of the strike
      const isStrikingWindow = this.slashSwingTimer <= (strikeFrames + recFrames) && this.slashSwingTimer >= recFrames;
      if (isStrikingWindow && !this._chopHitDelivered) {
        const totalFrames = this.slashSwingMaxTimer || (this.chopLiftFrames + this.chopLiftHoldFrames + strikeFrames + recFrames);
        const elapsed = Math.max(0, totalFrames - this.slashSwingTimer);
        const strikeElapsed = Math.max(0, elapsed - (this.chopLiftFrames + this.chopLiftHoldFrames));
        const currentStrikeP = Math.max(0, Math.min(1.0, strikeElapsed / Math.max(1, strikeFrames)));
        const prevStrikeP = this._chopPreviousStrikeP || 0;
        this._chopPreviousStrikeP = currentStrikeP;

        // Physical forward step momentum: Escanor lunges forward into the downward cleave
        const lungeSpeed = (cfg.chopLungeSpeed || 4.5) * (this.isTheOneActive ? 1.3 : 1.0);
        const lungeAngle = (this.chopCastAngle !== undefined)
          ? this.chopCastAngle
          : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
        const lungeDecay = Math.sin(Math.PI * Math.max(0, Math.min(1.0, currentStrikeP)));
        this.vx = Math.cos(lungeAngle) * lungeSpeed * lungeDecay;
        this.vy = Math.sin(lungeAngle) * lungeSpeed * lungeDecay;

        const connected = this._executeRhittaChopHit(currentStrikeP, prevStrikeP);
        if (connected) {
          this._chopHitDelivered = true;
          this.vx = 0;
          this.vy = 0;
          return; // Freeze Escanor immediately on the collision frame!
        }
      }

      // At the exact moment the downward chop strike reaches follow-through (slashSwingTimer === recFrames):
      if (this.slashSwingTimer === recFrames) {
        this.vx = 0;
        this.vy = 0;
        this._onChopStrikeFinished();
      }

      // If strike window passed without connecting, mark as delivered (miss)
      if (this.slashSwingTimer < recFrames && !this._chopHitDelivered) {
        this._chopHitDelivered = true;
      }
    } else if (!this.chopHitPauseTimer || this.chopHitPauseTimer <= 0) {
      this.slashOriginX = undefined;
      this.slashOriginY = undefined;
      this.slashOriginAngle = undefined;
      this.slashOriginReach = undefined;
      this.slashOriginRadius = undefined;
      this.slashOriginTheOne = undefined;
    }
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.prideFlareActiveTimer > 0) this.prideFlareActiveTimer--;
    if (this.divineSwordActiveTimer > 0) this.divineSwordActiveTimer--;

    // Skill Cooldowns
    if (this.cruelSunCooldown > 0) this.cruelSunCooldown--;
    if (this.prideFlareCooldown > 0) this.prideFlareCooldown--;
    if (this.theOneCooldown > 0 && !this.isTheOneActive) this.theOneCooldown--;

    // "The One" Transformation Timer
    if (this.isTheOneActive) {
      this.theOneTimer--;
      if (this.theOneTimer <= 0) {
        this.isTheOneActive = false;
        this.theOneCooldown = this.theOneCooldownMax;
      }
    }

    // Update Cruel Sun Projectiles
    this._updateCruelSuns(arena);

    // Passive 1 & 2: Grace "Sunshine" — Solar Pride Escalation & Heat Aura (Toggle: enableSunshine)
    if (Boolean(cfg.enableSunshine ?? true)) {
      this.prideChargeTimer++;
      if (this.prideChargeTimer >= (cfg.prideChargeIntervalFrames || 150)) {
        this.prideChargeTimer = 0;
        if (this.prideStacks < this.prideMaxStacks) {
          this.prideStacks++;
        }
      }
      this._updateSunshineHeat();
    }

    // AI & Combat Execution
    const target = this.getNearestTarget(opponent);

    // Aim smoothly at target when in neutral/idle or while lifting weapon (locks during downward strike & hit-pause)
    const isLockedInChop = (this.slashSwingTimer > 0 && !this.isLiftingWeapon()) || (this.chopHitPauseTimer && this.chopHitPauseTimer > 0);
    if (target && !isLockedInChop) {
      this.aim(target);
    }

    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // 1. Try Ultimate: "THE ONE" (Toggle: enableTheOne)
    if (Boolean(cfg.enableTheOne ?? true) && this.theOneCooldown <= 0 && !this.isTheOneActive && (dist < 180 || this.hp < this.maxHp * 0.65)) {
      this._activateTheOne();
      return;
    }

    // 2. Try Divine Sword Escanor during "The One" (Toggle: enableTheOne)
    const finisherReach = (this.r || 25) + this.currentFinisherReach;
    if (Boolean(cfg.enableTheOne ?? true) && this.isTheOneActive && !this.theOneFinisherUsed && dist <= (finisherReach + (target.r || 25))) {
      this._executeDivineSwordEscanor(target);
      return;
    }

    // 3. Try Skill 1: Cruel Sun (Toggle: enableCruelSun)
    if (Boolean(cfg.enableCruelSun ?? true) && this.cruelSunCooldown <= 0 && dist > 70 && dist < 280) {
      this._castCruelSun(target);
      return;
    }

    // 4. Try Skill 2: Pride Flare (Toggle: enablePrideFlare)
    if (Boolean(cfg.enablePrideFlare ?? true) && this.prideFlareCooldown <= 0 && (dist < 110 || this.activeCruelSuns.length > 0)) {
      this._castPrideFlare();
      return;
    }

    // 5. Basic Attack: Divine Axe Rhitta Chop (Windup overhead lift -> downward chop strike)
    const reach = (this.r || 25) + this.currentRhittaReach + (target.r || 25);
    if (this.shootCooldown <= 0 && this.slashSwingTimer <= 0 && dist <= reach) {
      this._startRhittaChop(target);
    }
  }

  /**
   * Passive 1: Grace "Sunshine" & Thermal Updraft
   * Radiates continuous solar heat burn and generates a rising thermal updraft slow field
   */
  _updateSunshineHeat() {
    this.sunshineHeatTimer++;
    if (this.sunshineHeatTimer % 30 !== 0) return; // Tick every half second

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const heatRadius = this.currentSunshineHeatRadius;
    const heatDmg = (cfg.sunshineHeatDps || 3) * (this.isTheOneActive ? 2.0 : 1.0);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      if (d <= heatRadius + (tgt.r || 28)) {
        if (typeof tgt.takeDamage === 'function') {
          tgt.takeDamage(heatDmg, this, { isBurn: true });
        }
        if (typeof tgt.applyBurn === 'function') {
          tgt.applyBurn(this);
        } else {
          tgt.burnTimer = Math.max(tgt.burnTimer || 0, 60);
          tgt.burnDamageTimer = 0;
          tgt.lastBurnAttacker = this;
        }
        const slowAmount = cfg.thermalUpdraftSlow || 0.15;
        if (slowAmount > 0 && typeof tgt.applySlow === 'function') {
          tgt.applySlow(35, slowAmount);
        }
      }
    }
  }

  /**
   * Initiates the 4-Stage Divine Axe Rhitta Overhead Lift, Poised Hold & Chop (Missable).
   * Snapshots and commits to the initial 360° cast angle upon lifting the weapon (Rule 1.4).
   * Guarantees zero auto-aim tracking or snapping throughout the entire lift, poised hold, strike, and recovery.
   */
  _startRhittaChop(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const liftFrames = (typeof cfg.chopLiftFrames === 'number') ? cfg.chopLiftFrames : 80;
    const holdFrames = (typeof cfg.chopLiftHoldFrames === 'number') ? cfg.chopLiftHoldFrames : 100;
    const strikeFrames = (typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 24;
    const recFrames = (typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 28;

    this.chopLiftFrames = liftFrames;
    this.chopLiftHoldFrames = holdFrames;
    this.chopStrikeFrames = strikeFrames;
    this.chopRecoveryFrames = recFrames;

    const totalFrames = liftFrames + holdFrames + strikeFrames + recFrames;
    this.slashSwingMaxTimer = totalFrames;
    this.slashSwingTimer = totalFrames;

    // Start with current angle (DO NOT snap angle to target on initiation)
    const currentAngle = (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle))
      ? this.gunAngle
      : ((this.angle !== undefined && !Number.isNaN(this.angle)) ? this.angle : 0);

    this.chopCastAngle = currentAngle;
    this.gunAngle = currentAngle;
    this.angle = currentAngle;

    this.slashOriginX = undefined;
    this.slashOriginY = undefined;
    this.slashOriginAngle = undefined;
    this.slashOriginReach = undefined;
    this.slashOriginRadius = undefined;
    this.slashOriginTheOne = undefined;

    // Downward chop impact lands exactly upon strike completion at the transition to recovery:
    this.slashSwingImpactTimer = recFrames;
    this._chopHitDelivered = false;
    this._chopHitConnected = false;
    this.chopHitProgress = null;
    this.chopHitAxeAngle = null;
    this.chopHitHandX = null;
    this.chopHitHandY = null;
    this.chopHitBackHandX = null;
    this.chopHitBackHandY = null;
    this._chopPreviousStrikeP = 0;
    this.shootCooldown = (typeof cfg.cooldown === 'number') ? cfg.cooldown : (totalFrames + 20);

    // Slow movement during lift + hold (heavy axe overhead windup)
    if (typeof this.applySlow === 'function') {
      this.applySlow(liftFrames + holdFrames, 0.3); // 30% speed while winding up
    }

    try {
      const liftSnd = cfg.sounds?.weaponLift || 'Assets/Sound Effects/SkillEffects/Escanor-weapon-lift.mp3';
      const liftVol = cfg.soundVolumes?.weaponLift !== undefined ? cfg.soundVolumes.weaponLift : 1.0;
      audioSystem.playSFX(liftSnd, liftVol);
    } catch (e) {}
  }

  /**
   * Resolves Hit Detection during the Downward Chop Stroke frame-by-frame.
   * Tracks the physical sweep of Divine Axe Rhitta as it chops from overheadAngle (-2.45 rad)
   * down to strikeEndAngle (+1.18 rad).
   * The exact frame the blade collides with an enemy:
   * 1. Snapshots the impact pose (chopHitProgress, chopHitAxeAngle, hand positions).
   * 2. Spawns crisp initial contact effects (golden flash, sparks, impact audio).
   * 3. Triggers chopHitPauseFrames stasis, freezing Escanor and the target at the contact pose!
   * @param {number} currentStrikeP Current progress of strike (0.0 to 1.0)
   * @param {number} prevStrikeP Previous progress of strike (0.0 to 1.0)
   * @returns {boolean} True if a target was hit
  /**
   * Resolves Hit Detection during the Downward Chop Stroke frame-by-frame.
   * Tracks the physical blade collision of Divine Axe Rhitta as it chops down.
   * The exact frame the blade directly collides with an enemy:
   * 1. Snapshots the impact pose (chopHitProgress, chopHitAxeAngle, hand positions).
   * 2. Spawns crisp initial contact effects (golden flash, sparks, impact audio).
   * 3. Triggers chopHitPauseFrames stasis, freezing Escanor and the target at the contact pose!
   * @param {number} [currentStrikeP] Current progress of strike (0.0 to 1.0)
   * @param {number} [prevStrikeP] Previous progress of strike (0.0 to 1.0)
   * @returns {boolean} True if a target was hit
   */
  _executeRhittaChopHit(currentStrikeP, prevStrikeP) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (cfg.chopStrikeFrames || 24);
    const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (cfg.chopRecoveryFrames || 28);
    const liftFrames = (typeof this.chopLiftFrames === 'number') ? this.chopLiftFrames : (cfg.chopLiftFrames || 80);
    const holdFrames = (typeof this.chopLiftHoldFrames === 'number') ? this.chopLiftHoldFrames : (cfg.chopLiftHoldFrames || 100);
    const totalFrames = this.slashSwingMaxTimer || (liftFrames + holdFrames + strikeFrames + recFrames);

    if (currentStrikeP === undefined) {
      if (typeof this.slashSwingTimer === 'number' && this.slashSwingTimer > 0) {
        const elapsed = Math.max(0, totalFrames - this.slashSwingTimer);
        const strikeElapsed = Math.max(0, elapsed - (liftFrames + holdFrames));
        currentStrikeP = Math.max(0, Math.min(1.0, strikeElapsed / Math.max(1, strikeFrames)));
        if (this.slashSwingTimer <= recFrames) currentStrikeP = 1.0;
        else if (currentStrikeP <= 0) currentStrikeP = 0.5;
      } else {
        currentStrikeP = 1.0;
      }
    }
    if (prevStrikeP === undefined) {
      prevStrikeP = (this._chopPreviousStrikeP !== undefined && this._chopPreviousStrikeP > 0)
        ? this._chopPreviousStrikeP
        : 0;
    }

    const baseMin = cfg.basicDamageMin || 30;
    const baseMax = cfg.basicDamageMax || 38;
    const prideMult = 1.0 + (this.prideStacks * (cfg.prideStackDamageBonus || 0.08)) + (this.isTheOneActive ? 0.45 : 0);
    const damage = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * prideMult);

    let hitTarget = null;
    const validTargets = this._getAllValidEnemyTargets();

    for (const tgt of validTargets) {
      const hit = _testRhittaBladeHit(this, tgt, currentStrikeP, prevStrikeP);
      if (!hit) continue;

      hitTarget = tgt;
      this._chopHitConnected = true;

      // Snapshot exact collision pose for hit-pause freeze
      this.chopHitProgress = hit.sampleP;
      this.chopHitAxeAngle = hit.blade.localAxeAngle;
      this.chopHitHandX = hit.blade.localHandX;
      this.chopHitHandY = hit.blade.localHandY;
      this.chopHitBackHandX = hit.blade.localBackHandX;
      this.chopHitBackHandY = hit.blade.localBackHandY;

      // Apply initial damage and burn
      applyDamageToTarget(tgt, damage, this, { isMelee: true, isGuaranteedHit: true });
      if (typeof tgt.takeDamage === 'function') {
        tgt.takeDamage(cfg.basicBurnDamage || 6, this, { isMelee: true, isGuaranteedHit: true, isBurn: true });
      }
      if (typeof tgt.applyBurn === 'function') {
        tgt.applyBurn(this);
      } else {
        tgt.burnTimer = Math.max(tgt.burnTimer || 0, 120);
        tgt.burnDamageTimer = 0;
        tgt.lastBurnAttacker = this;
      }

      // Initial contact effects at the exact point of blade impact
      const contactX = hit.contactX;
      const contactY = hit.contactY;
      spawnImpactFlash(contactX, contactY, '#F59E0B', 55);
      spawnSparks(contactX, contactY, '#F59E0B', 14);

      try {
        const hitSnd = cfg.sounds?.chopHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
        const hitVol = cfg.soundVolumes?.chopHit !== undefined ? cfg.soundVolumes.chopHit : 0.95;
        audioSystem.playSFX(hitSnd, hitVol);
      } catch (e) {}

      // Cinematic Hit-Pause (freeze at the exact point of impact)
      const pauseFrames = cfg.chopHitPauseFrames || 26;
      this.chopHitPauseTimer = pauseFrames;
      this.chopHitPauseMax = pauseFrames;
      this.chopHitPauseTarget = tgt;

      if (typeof tgt.applyTimeStop === 'function') {
        tgt.applyTimeStop(pauseFrames);
      } else {
        tgt.timeStopTimer = Math.max(tgt.timeStopTimer || 0, pauseFrames);
      }
      tgt.suppressFreezeOverlay = true;
      tgt.vx = 0;
      tgt.vy = 0;
      this.vx = 0;
      this.vy = 0;

      const impactShake = (cfg.basicImpactShake || 7.0) * (this.isTheOneActive ? 1.5 : 1.0);
      const impactDur = cfg.basicImpactShakeDuration || 12;
      triggerGlobalScreenShake(impactShake, impactDur);

      if (this.prideStacks < this.prideMaxStacks) {
        this.prideStacks++;
      }

      break; // Primary target hit connected
    }

    return Boolean(hitTarget);
  }

  /**
   * Called when the downward chop strike reaches full follow-through (strikeP = 1.0, at slashSwingTimer === recFrames).
   * If a hit was connected during the chop, detonates explosive unpause screen shake, launches massive knockback,
   * spawns blood/sparks, and triggers the crushing cleave audio.
   * If the attack was a whiff / miss, triggers miss ground shake.
   */
  _onChopStrikeFinished() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    if (this._chopHitConnected && this.chopHitPauseTarget) {
      const target = this.chopHitPauseTarget;
      target.suppressFreezeOverlay = false;
      target.timeStopTimer = 0;

      const unpauseShake = (cfg.basicUnpauseShake || 10.0) * (this.isTheOneActive ? 1.5 : 1.0);
      const unpauseDur = cfg.basicUnpauseShakeDuration || 18;
      triggerGlobalScreenShake(unpauseShake, unpauseDur);

      // Tag target for wall pin upon wall collision
      target.isWallPinnedByEscanor = true;
      target._knockedBackByEscanorBasicAttack = true;
      target._escanorAttacker = this;

      // Apply physical knockback push along committed chop angle
      const knockbackAngle = (this.chopCastAngle !== undefined)
        ? this.chopCastAngle
        : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
      const prideMult = 1.0 + (this.prideStacks * (cfg.prideStackDamageBonus || 0.08)) + (this.isTheOneActive ? 0.45 : 0);
      const baseKnockback = (cfg.basicKnockback || 50.0) * (this.isTheOneActive ? 1.6 : 1.0) * prideMult;

      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(Math.cos(knockbackAngle) * baseKnockback, Math.sin(knockbackAngle) * baseKnockback);
      } else {
        target.knockbackVx = Math.cos(knockbackAngle) * baseKnockback;
        target.knockbackVy = Math.sin(knockbackAngle) * baseKnockback;
        target.vx = target.knockbackVx;
        target.vy = target.knockbackVy;
      }

      // Apply hit stun so target reels in knockback
      const stunFrames = cfg.basicHitStunFrames || 18;
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(stunFrames);
      } else {
        target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunFrames);
      }

      // Crushing weight slow — stagger from divine axe impact
      if (typeof target.applySlow === 'function') {
        target.applySlow(45, 0.4); // 40% speed for ~0.75s
      }

      // Explosive unpause effects: blood burst, sparks & heavy cleave audio!
      spawnBloodEffect(target.x, target.y, 10, knockbackAngle);
      spawnSparks(target.x, target.y, '#F59E0B', 14);

      try {
        const unpauseSnd = cfg.sounds?.unpauseHit || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
        const unpauseVol = cfg.soundVolumes?.unpauseHit !== undefined ? cfg.soundVolumes.unpauseHit : 1.0;
        audioSystem.playSFX(unpauseSnd, unpauseVol);
      } catch (e) {}

      this.chopHitPauseTarget = null;
    } else if (!this._chopHitConnected) {
      // Missed downward chop slammed into empty arena floor
      const missShake = (cfg.basicMissShake || 4.5);
      const missDur = cfg.basicMissShakeDuration || 8;
      triggerGlobalScreenShake(missShake, missDur);
      const castAngle = (this.chopCastAngle !== undefined) ? this.chopCastAngle : (this.gunAngle || 0);
      const groundX = this.x + Math.cos(castAngle) * (this.r + this.currentRhittaReach * 0.8);
      const groundY = this.y + Math.sin(castAngle) * (this.r + this.currentRhittaReach * 0.8);
      spawnSparks(groundX, groundY, '#B45309', 6);
    }
  }

  /**
   * Skill 1: Cruel Sun (無慈悲な太陽)
   */
  _castCruelSun(target) {
    this.cruelSunCooldown = this.cruelSunCooldownMax;
    this.aim(target);

    const angle = this.gunAngle || 0;
    const speed = CONFIG.escanor?.cruelSunSpeed || 9.5;
    const spawnDist = this.r + 20;

    const sunOrb = {
      x: this.x + Math.cos(angle) * spawnDist,
      y: this.y + Math.sin(angle) * spawnDist,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: CONFIG.escanor?.cruelSunOrbRadius || 18,
      life: 90,
      maxLife: 90,
      damage: (CONFIG.escanor?.cruelSunDamage || 65) * (this.isTheOneActive ? 1.4 : 1.0),
      aoeRadius: CONFIG.escanor?.cruelSunAoeRadius || 80,
      aoeDamage: (CONFIG.escanor?.cruelSunAoeDamage || 38) * (this.isTheOneActive ? 1.4 : 1.0),
      owner: this
    };

    this.activeCruelSuns.push(sunOrb);
    spawnFloatingText(this.x, this.y - 30, 'CRUEL SUN!', '#F59E0B');

    try {
      const sunSnd = cfg.sounds?.cruelSun || 'Assets/Sound Effects/Attacks/flamespray1.mp3';
      const sunVol = cfg.soundVolumes?.cruelSun !== undefined ? cfg.soundVolumes.cruelSun : 0.7;
      audioSystem.playSFX(sunSnd, sunVol);
    } catch (e) {}
  }

  /**
   * Updates Cruel Sun projectiles and checks collision
   */
  _updateCruelSuns(arena) {
    for (let i = this.activeCruelSuns.length - 1; i >= 0; i--) {
      const sun = this.activeCruelSuns[i];
      sun.x += sun.vx;
      sun.y += sun.vy;
      sun.life--;

      let shouldExplode = (sun.life <= 0);

      // Arena boundary collision
      if (arena) {
        if (sun.x - sun.r <= arena.x || sun.x + sun.r >= arena.x + arena.width ||
            sun.y - sun.r <= arena.y || sun.y + sun.r >= arena.y + arena.height) {
          shouldExplode = true;
        }
      }

      // Check hit with enemy targets (Rule 6: Check fighters & illusions)
      const validTargets = this._getAllValidEnemyTargets();
      for (const tgt of validTargets) {
        const d = Math.hypot(tgt.x - sun.x, tgt.y - sun.y);
        if (d <= sun.r + (tgt.r || 25)) {
          shouldExplode = true;
          break;
        }
      }

      if (shouldExplode) {
        this._detonateCruelSun(sun);
        this.activeCruelSuns.splice(i, 1);
      }
    }
  }

  /**
   * Detonates Cruel Sun in a massive AOE explosion
   */
  _detonateCruelSun(sun) {
    spawnImpactFlash(sun.x, sun.y, '#F59E0B', sun.aoeRadius);
    spawnSparks(sun.x, sun.y, '#FEF08A', 24);
    triggerGlobalScreenShake(10, 16);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - sun.x, tgt.y - sun.y);
      if (d <= sun.aoeRadius + (tgt.r || 25)) {
        const isDirect = (d <= sun.r + (tgt.r || 25));
        const dmg = isDirect ? sun.damage : sun.aoeDamage;

        applyDamageToTarget(tgt, dmg, this, { isFlame: true, isBurn: true });
        if (typeof tgt.applyBurn === 'function') {
          tgt.applyBurn(this);
        } else {
          tgt.burnTimer = Math.max(tgt.burnTimer || 0, 180);
          tgt.burnDamageTimer = 0;
          tgt.lastBurnAttacker = this;
        }
        if (typeof tgt.applyHitStun === 'function') {
          tgt.applyHitStun(16);
        }

        // Radial Knockback
        const angle = Math.atan2(tgt.y - sun.y, tgt.x - sun.x);
        const kb = CONFIG.escanor?.cruelSunKnockback || 14.0;
        tgt.isWallPinnedByEscanor = true;
        tgt._knockedBackByEscanorBasicAttack = true;
        tgt._escanorAttacker = this;
        tgt.knockbackVx = Math.cos(angle) * kb;
        tgt.knockbackVy = Math.sin(angle) * kb;
      }
    }

    try {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.9);
    } catch (e) {}
  }

  /**
   * Skill 2: Pride Flare (プライド・フレア)
   */
  _castPrideFlare() {
    this.prideFlareCooldown = this.prideFlareCooldownMax;
    this.prideFlareActiveTimer = this.prideFlareMaxTimer;

    const radius = CONFIG.escanor?.prideFlareRadius || 110;
    const dmg = (CONFIG.escanor?.prideFlareDamage || 52) * (this.isTheOneActive ? 1.5 : 1.0);
    const kb = CONFIG.escanor?.prideFlareKnockback || 22.0;

    spawnFloatingText(this.x, this.y - 35, 'PRIDE FLARE!', '#DC2626');
    triggerGlobalScreenShake(12, 18);

    // Detonate any active Cruel Sun orbs first
    for (const sun of this.activeCruelSuns) {
      this._detonateCruelSun(sun);
    }
    this.activeCruelSuns = [];

    // Detonate Escanor's Solar Aura
    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      if (d <= radius + (tgt.r || 25)) {
        applyDamageToTarget(tgt, dmg, this, { isFlame: true, isBurn: true });
        if (typeof tgt.applyBurn === 'function') {
          tgt.applyBurn(this);
        } else {
          tgt.burnTimer = Math.max(tgt.burnTimer || 0, 240);
          tgt.burnDamageTimer = 0;
          tgt.lastBurnAttacker = this;
        }
        if (typeof tgt.applyHitStun === 'function') {
          tgt.applyHitStun(CONFIG.escanor?.prideFlareStunDuration || 36);
        }

        const angle = Math.atan2(tgt.y - this.y, tgt.x - this.x);
        tgt.isWallPinnedByEscanor = true;
        tgt._knockedBackByEscanorBasicAttack = true;
        tgt._escanorAttacker = this;
        tgt.knockbackVx = Math.cos(angle) * kb;
        tgt.knockbackVy = Math.sin(angle) * kb;

        spawnSparks(tgt.x, tgt.y, '#F59E0B', 16);
      }
    }

    try {
      const flareSnd = cfg.sounds?.prideFlare || 'Assets/Sound Effects/Attacks/flamespray1.mp3';
      const flareVol = cfg.soundVolumes?.prideFlare !== undefined ? cfg.soundVolumes.prideFlare : 0.9;
      audioSystem.playSFX(flareSnd, flareVol);
    } catch (e) {}
  }

  /**
   * Ultimate: "THE ONE" (天上天下唯我独尊)
   */
  _activateTheOne() {
    this.isTheOneActive = true;
    this.theOneTimer = this.theOneMaxTimer;
    this.theOneFinisherUsed = false;
    this.prideStacks = this.prideMaxStacks; // Max pride stacks

    spawnFloatingText(this.x, this.y - 45, 'THE ONE — HIGH NOON!', '#FEF08A');
    triggerGlobalScreenShake(16, 24);

    spawnImpactFlash(this.x, this.y, '#FEF08A', 120);
    spawnSparks(this.x, this.y, '#F59E0B', 32);

    try {
      const theOneSnd = cfg.sounds?.theOne || 'Assets/Sound Effects/Attacks/laserbeam.mp3';
      const theOneVol = cfg.soundVolumes?.theOne !== undefined ? cfg.soundVolumes.theOne : 0.9;
      audioSystem.playSFX(theOneSnd, theOneVol);
    } catch (e) {}
  }

  /**
   * Finisher during The One: Divine Sword Escanor (聖剣エスカノール)
   */
  _executeDivineSwordEscanor(target) {
    this.theOneFinisherUsed = true;
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this._chopHitDelivered = true;

    let castAngle;
    if (target) {
      const targetZ = target.z || 0;
      const myZ = this.z || 0;
      castAngle = Math.atan2((target.y - targetZ) - (this.y - myZ), target.x - this.x);
    } else {
      castAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    }
    while (castAngle > Math.PI) castAngle -= Math.PI * 2;
    while (castAngle < -Math.PI) castAngle += Math.PI * 2;

    this.chopCastAngle = castAngle;
    this.gunAngle = castAngle;
    this.angle = castAngle;

    const aimAngle = castAngle;
    const reach = this.currentFinisherReach;
    const dmg = CONFIG.escanor?.theOneFinisherDamage || 115;
    const kb = CONFIG.escanor?.theOneFinisherKnockback || 42.0;

    this.divineSwordActiveTimer = 24;
    this.divineSwordMaxTimer = 24;
    this.divineSwordAngle = aimAngle;
    this.divineSwordReach = reach;

    spawnFloatingText(this.x, this.y - 40, 'DIVINE SWORD ESCANOR!', '#FEF08A');
    triggerGlobalScreenShake(20, 24);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const dx = tgt.x - this.x;
      const dy = tgt.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= (this.r + reach + (tgt.r || 25))) {
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Frontal linear cone (80 degrees)
        if (Math.abs(angleDiff) <= (Math.PI * 0.44)) {
          applyDamageToTarget(tgt, dmg, this, { isFlame: true, isBurn: true });
          if (typeof tgt.applyBurn === 'function') {
            tgt.applyBurn(this);
          } else {
            tgt.burnTimer = Math.max(tgt.burnTimer || 0, 300);
            tgt.burnDamageTimer = 0;
            tgt.lastBurnAttacker = this;
          }
          if (typeof tgt.applyHitStun === 'function') {
            tgt.applyHitStun(24);
          }

          tgt.isWallPinnedByEscanor = true;
          tgt._knockedBackByEscanorBasicAttack = true;
          tgt._escanorAttacker = this;
          tgt.knockbackVx = Math.cos(angleToTarget) * kb;
          tgt.knockbackVy = Math.sin(angleToTarget) * kb;

          spawnImpactFlash(tgt.x, tgt.y, '#FFFFFF', 60);
          spawnSparks(tgt.x, tgt.y, '#FEF08A', 24);
          spawnBloodEffect(tgt.x, tgt.y, 14);
        }
      }
    }

    try {
      const swordSnd = cfg.sounds?.divineSword || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
      const swordVol = cfg.soundVolumes?.divineSword !== undefined ? cfg.soundVolumes.divineSword : 1.0;
      audioSystem.playSFX(swordSnd, swordVol);
    } catch (e) {}
  }

  /**
   * Helper: Resolves nearest enemy entity or direct opponent
   */
  getNearestTarget(opponent) {
    if (opponent && !opponent.isDead && (opponent.hp || 0) > 0) return opponent;
    let nearest = null;
    let minDist = Infinity;
    const validTargets = this._getAllValidEnemyTargets();
    for (const ent of validTargets) {
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = ent;
      }
    }
    return nearest;
  }

  /**
   * Helper: Queries all valid enemy targets (fighters & illusions) per Rule 6
   */
  _getAllValidEnemyTargets() {
    const targets = [];
    if (typeof state === 'undefined') return targets;

    const myIndex = (state.fighters || []).indexOf(this);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

    // 1. Check state.fighters
    if (state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.isDead || (f.hp || 0) <= 0) continue;
        if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(i) === myTeam) continue;
        targets.push(f);
      }
    }

    // 2. Check state.illusions (Rule 6)
    if (state.illusions) {
      for (let i = 0; i < state.illusions.length; i++) {
        const ill = state.illusions[i];
        if (!ill || ill.isDead || (ill.hp || 0) <= 0 || ill.owner === this) continue;
        targets.push(ill);
      }
    }

    return targets;
  }

  interruptAttacks(forceCancelAll = false) {
    // Super Armor: Do not cancel weapon lift/hold on standard damage interruptions
    if (!forceCancelAll && this.isLiftingWeapon()) {
      return;
    }
    super.interruptAttacks(forceCancelAll);
    this.slashSwingTimer = 0;
    this.punchAnimTimer = 0;
    this.chopCastAngle = undefined;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.slashOriginX = undefined;
    this.slashOriginY = undefined;
    this.slashOriginAngle = undefined;
    this.slashOriginReach = undefined;
    this.slashOriginRadius = undefined;
    this.slashOriginTheOne = undefined;
    if (this.chopHitPauseTarget) {
      this.chopHitPauseTarget.suppressFreezeOverlay = false;
      this.chopHitPauseTarget = null;
    }
    this.chopHitPauseTimer = 0;
    this.chopHitProgress = null;
    this.chopHitAxeAngle = null;
    this.chopHitHandX = null;
    this.chopHitHandY = null;
    this.chopHitBackHandX = null;
    this.chopHitBackHandY = null;
    this._chopPreviousStrikeP = 0;
  }

  draw(ctx) {
    // 1. Draw Active Cruel Sun Orbs
    for (const sun of this.activeCruelSuns) {
      drawCruelSunOrb(ctx, sun.x, sun.y, sun.r);
    }

    // 2. Draw Active Pride Flare Shockwave
    if (this.prideFlareActiveTimer > 0) {
      const p = 1.0 - (this.prideFlareActiveTimer / this.prideFlareMaxTimer);
      const currentR = p * (CONFIG.escanor?.prideFlareRadius || 110);
      drawPrideFlareShockwave(ctx, this.x, this.y, currentR, CONFIG.escanor?.prideFlareRadius || 110, 1.0 - p);
    }

    // 3. Draw Divine Sword Escanor Finisher Blade Wave
    if (this.divineSwordActiveTimer > 0) {
      const lifeRatio = this.divineSwordActiveTimer / (this.divineSwordMaxTimer || 24);
      drawDivineSwordEscanorBlade(ctx, this.x, this.y, this.divineSwordAngle || 0, this.r || 28, this.divineSwordReach || 160, lifeRatio);
    }

    // 4. Draw Active Rhitta Slash Arc in World Space (Stays anchored in the air where released!)
    const isPodiumPreview = Boolean(this._isWinnerReveal);
    const isSuppressed = !isPodiumPreview && Boolean(
      this.isTargetOfAmbush ||
      (typeof this.areAttackEffectsSuppressed === 'function' && this.areAttackEffectsSuppressed())
    );

    if (!isPodiumPreview && !isSuppressed) {
      const chopState = _getEscanorChopAnimationState(this);
      if (chopState.isSwinging && (chopState.phase === 'strike' || chopState.phase === 'hitPause' || chopState.phase === 'recovery')) {
        const slashX = (this.slashOriginX !== undefined) ? this.slashOriginX : this.x;
        const slashY = (this.slashOriginY !== undefined) ? this.slashOriginY : (this.y - (this.z || 0));
        const slashAngle = (this.slashOriginAngle !== undefined)
          ? this.slashOriginAngle
          : ((this.chopCastAngle !== undefined) ? this.chopCastAngle : ((this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : (this.angle || 0)));
        const slashReach = (this.slashOriginReach !== undefined) ? this.slashOriginReach : this.currentRhittaReach;
        const slashRadius = (this.slashOriginRadius !== undefined) ? this.slashOriginRadius : this.r;
        const slashTheOne = (this.slashOriginTheOne !== undefined) ? this.slashOriginTheOne : Boolean(this.isTheOneActive);

        drawRhittaSlashArc(ctx, slashX, slashY, slashAngle, slashRadius, chopState, slashTheOne, slashReach);
      }
    }

    // 5. Draw Escanor Main Skin Model
    drawEscanorSkin(ctx, this);
  }
}
