import { Fighter, isSuppressedByGetsuga } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { stopSound } from '../../systems/soundSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics, updateTensaZangetsuChainPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray } from '../../graphics/particles/visualTrailSystem.js';
import { drawIchigoSlashArc } from '../../graphics/weapons/ichigoWeaponGraphics.js';
import { spawnHollowMaskShatter } from '../../graphics/particles/deathShatterEffect.js';
import {
  activateHollowMask,
  applyHollowLifesteal,
  updateHollowMask,
  isHollowTransformationVoicelinePlaying,
  stopHollowTransformationVoiceline
} from './ichigo/ichigoHollow.js';

import {
  activateBankai,
  releaseBankai,
  updateBankai,
  stopBankaiVoiceline,
  isBankaiVoicelinePlaying
} from './ichigo/ichigoBankai.js';

import {
  isGetsugaActive,
  isAboutToUnleashNormalGetsuga,
  stopFinalGetsugaVoiceline,
  isGetsugaVoicelinePlaying,
  isFinalGetsugaVoicelinePlaying,
  fireFinalMassiveGetsuga,
  fireGetsuga,
  releaseGetsuga,
  updateGetsuga
} from './ichigo/ichigoGetsuga.js';

import {
  clampToArena,
  canPerformBasicAttack,
  isShunpoComboActive,
  isFlashStepEnabled,
  isFlurryEnabled,
  performShunpoStrike,
  performShunpoGetsugaCombo,
  performMeleeCleave,
  getParryChance,
  handleIchigoTakeDamage,
  updateShunpoCombat
} from './ichigo/ichigoCombat.js';

export class IchigoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ichigo';
    this.type = 'ichigo';
    this.color = '#FF5500'; // Orange theme color for text / highlights
    this.skin = def.skin || (typeof state !== 'undefined' ? (state.selectedIchigoSkin || 'shikai') : 'shikai');

    // Skill & combat states
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = CONFIG.ichigo?.initialShunpoCooldown !== undefined ? CONFIG.ichigo.initialShunpoCooldown : 180;
    this.ultimateCooldown = 0;

    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
    this.hollowRechargeHpBaseline = undefined;
    this._maxHollowPct = 0;
    this.hollowMaskFormationTimer = 0;
    this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    this.hollowBurstTimer = 0;
    this.hollowBurstMax = CONFIG.ichigo?.hollowBurstFrames || 36;

    this.bankaiActive = false;
    this.bankaiTimer = 0;

    // Visuals & Defensive Parry States
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 0;
    this.parryStanceIndex = 0;
    this.blockPoseTimer = 0;
    this.parryHitAnimTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoStartX = 0;
    this.shunpoStartY = 0;
    this.shunpoTargetX = 0;
    this.shunpoTargetY = 0;

    // Shunpo Multi-Strike Flurry Combo State
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this._shunpoBaseAngle = 0;

    // Getsuga Tensho Channeling & Slide State
    this.isChannelingGetsuga = false;
    this.isGetsugaSlash = false;
    this.getsugaChargeTimer = 0;
    this.getsugaChargeMax = CONFIG.ichigo?.getsugaChargeFrames || 64;
    this.getsugaSlideTimer = 0;
    this.getsugaRecoveryTimer = 0;
    this.getsugaTarget = null;
    this.getsugaCastAngle = undefined;
    this.shunpoMaxSteps = CONFIG.ichigo?.shunpoStrikes || 4;

    // Bankai Transformation Channeling & Slide State
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiChargeMax = CONFIG.ichigo?.bankaiChargeFrames || 66;
    this.bankaiSlideTimer = 0;
    this.bankaiBurstTimer = 0;
    this.bankaiBurstMax = CONFIG.ichigo?.bankaiBurstFrames || 36;
    this.shikaiReversionBurstTimer = 0;
    this.shikaiReversionBurstMax = CONFIG.ichigo?.shikaiReversionBurstFrames || 42;
    this.bankaiRibbonTimer = 0;
    this.bankaiRibbonMax = CONFIG.ichigo?.bankaiRibbonDuration || 300;
    this.bankaiUsed = false;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.activeGetsugaProjectile = null;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
    this.damageNumberColor = (typeof CONFIG !== 'undefined' && (CONFIG.ichigo?.damageNumberColor || CONFIG.ichigo?.themeColor)) || '#FF5500';

    // Audio & voiceline tracking handles
    this._bankaiVoiceHandle = null;
    this._bankaiVoicePlaying = false;
    this._bankaiVoiceEndTime = 0;
    this._hollowVoiceHandle = null;
    this._hollowFlareHandle = null;
    this._hollowVoicePlaying = false;
    this._hollowVoiceEndTime = 0;
    this._getsugaVoiceHandle = null;
    this._getsugaChargeHandle = null;
    this._getsugaVoicePlaying = false;
    this._getsugaVoiceEndTime = 0;
    this._finalGetsugaVoiceHandle = null;
    this._finalGetsugaVoicePlaying = false;
    this._finalGetsugaVoiceEndTime = 0;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'sword',
        name: 'Zangetsu Slash',
        type: 'active',
        cooldownKey: 'swordCooldown',
        cooldownMax: () => CONFIG.ichigo?.swordCooldown || 22
      },
      {
        id: 'getsuga',
        name: 'Getsuga Tensho',
        type: 'active',
        cooldownKey: 'getsugaCooldown',
        cooldownMax: () => CONFIG.ichigo?.getsugaCooldown || 450,
        channelingKey: 'isChannelingGetsuga',
        channelTimerKey: 'getsugaChargeTimer'
      },
      {
        id: 'shunpo',
        name: 'Flash Step',
        type: 'active',
        cooldownKey: 'shunpoCooldown',
        cooldownMax: () => CONFIG.ichigo?.shunpoCooldown || 300
      },
      {
        id: 'hollow_mask',
        name: 'Hollow Mask',
        type: 'buff',
        durationKey: 'hollowMaskTimer',
        durationMax: () => CONFIG.ichigo?.hollowMaskDuration || 800,
        activeKey: 'hollowMaskActive',
        channelTimerKey: 'hollowMaskFormationTimer',
        canTickDuration: () => false,
        onExpire: (fighter) => {
          fighter.hollowMaskActive = false;
          if (typeof spawnHollowMaskShatter === 'function') spawnHollowMaskShatter(fighter);
          if (typeof spawnFloatingText === 'function') spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "MASK SHATTERED!", "#FFFFFF");
        }
      },
      {
        id: 'bankai',
        name: 'Tensa Zangetsu',
        type: 'transformation',
        cooldownKey: 'ultimateCooldown',
        cooldownMax: () => CONFIG.ichigo?.bankaiCooldown || CONFIG.ichigo?.ultimateCooldown || 600,
        durationKey: 'bankaiTimer',
        durationMax: () => CONFIG.ichigo?.bankaiDuration || 1000,
        activeKey: 'bankaiActive',
        channelingKey: 'isChannelingBankai',
        channelTimerKey: 'bankaiChargeTimer',
        canTickDuration: () => false,
        onExpire: (fighter) => {
          fighter.bankaiActive = false;
          fighter.bankaiUsed = true;
          fighter.bankaiFinalGetsugaTriggered = false;
          fighter.isFinalMassiveGetsuga = false;
          fighter.isFinalGetsugaRecovery = false;
          if (typeof fighter._stopFinalGetsugaVoiceline === 'function') fighter._stopFinalGetsugaVoiceline();
          fighter.bankaiRechargeHpBaseline = fighter.hp;
          fighter._maxBankaiPct = 0;
          const cd = CONFIG.ichigo?.bankaiCooldown || CONFIG.ichigo?.ultimateCooldown || 600;
          fighter.ultimateCooldown = cd;
          fighter.bankaiCooldownMax = cd;
          fighter.isGetsugaSlash = false;
          fighter.isFinalMassiveGetsuga = false;
          fighter.isFinalGetsugaRecovery = false;
          fighter.isChannelingGetsuga = false;
          fighter.getsugaChargeTimer = 0;
          fighter.getsugaSlideTimer = 0;
          fighter.getsugaRecoveryTimer = 0;
          fighter.getsugaTarget = null;
          fighter.isShunpoDashing = false;
          fighter.shunpoDashTimer = 0;
          fighter.shunpoComboActive = false;
          fighter.shunpoComboStep = 0;
          fighter.shunpoComboDelayTimer = 0;
          fighter.shunpoTarget = null;
          fighter.afterImages = [];
          fighter._lastBankaiTrailX = undefined;
          fighter._lastBankaiTrailY = undefined;
          if (typeof spawnFloatingText === 'function') spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "BANKAI EXPIRED", "#FF1E00");
        }
      }
    ]);
  }

  isStationarySkillActive() {
    return Boolean(
      this.isChannelingGetsuga ||
      (this.getsugaChargeTimer > 0) ||
      (this.getsugaRecoveryTimer > 0) ||
      (this.getsugaSlideTimer > 0) ||
      this.isChannelingBankai ||
      (this.bankaiChargeTimer > 0) ||
      (this.bankaiBurstTimer > 0) ||
      (this.hollowMaskFormationTimer > 0) ||
      (this.hollowBurstTimer > 0) ||
      this._hollowVoicelineWait ||
      (this.shikaiReversionBurstTimer > 0) ||
      this.isShunpoDashing ||
      this.shunpoComboActive ||
      this.isShunpoDisengaging ||
      (this.shunpoComboDelayTimer > 0) ||
      (this.shunpoDisengageDelayTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  _playSound(key, defaultSfx, defaultVol = 1.0, minIntervalMs = 0) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (minIntervalMs > 0 && (now - lastPlayed < minIntervalMs)) return null;
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.ichigo?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.ichigo?.soundVolumes?.[key] ?? defaultVol;
    const delay = CONFIG.ichigo?.soundDelays?.[key] ?? 0;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      return audioSystem.playSFX(sfx, vol, 1.0, 0, delay);
    }
    return null;
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = CONFIG.ichigo?.initialShunpoCooldown !== undefined ? CONFIG.ichigo.initialShunpoCooldown : 180;
    this.ultimateCooldown = 0;
    this.bankaiCooldownMax = CONFIG.ichigo?.bankaiCooldown || 600;
    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
    this.hollowRechargeHpBaseline = undefined;
    this._maxHollowPct = 0;
    this.hollowMaskFormationTimer = 0;
    this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    this.hollowBurstTimer = 0;
    this.bankaiActive = false;
    this.bankaiTimer = 0;
    this.bankaiUsed = false;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this._winnerBankaiActive = undefined;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.isFinalGetsugaRecovery = false;
    this.activeGetsugaProjectile = null;
    this._stopFinalGetsugaVoiceline(true);
    this._stopHollowTransformationVoiceline(true);
    this._finalGetsugaVoicePlaying = false;
    this._finalGetsugaVoiceEndTime = 0;
    this._hollowVoicePlaying = false;
    this._hollowVoiceEndTime = 0;
    this._getsugaVoicePlaying = false;
    this._getsugaVoiceEndTime = 0;
    this.afterImages = [];
    this._lastBankaiTrailX = undefined;
    this._lastBankaiTrailY = undefined;
    this.slashSwingTimer = 0;
    this.parryStanceIndex = 0;
    this.blockPoseTimer = 0;
    this.parryHitAnimTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoMaxSteps = CONFIG.ichigo?.shunpoStrikes || 4;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this.isChannelingGetsuga = false;
    this.isGetsugaSlash = false;
    this.getsugaChargeTimer = 0;
    this.getsugaChargeMax = CONFIG.ichigo?.getsugaChargeFrames || 64;
    this.getsugaSlideTimer = 0;
    this.getsugaRecoveryTimer = 0;
    this.getsugaTarget = null;
    this.getsugaCastAngle = undefined;
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
    this.bankaiBurstTimer = 0;
    this.shikaiReversionBurstTimer = 0;
    this.bankaiRibbonTimer = 0;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
  }

  isGetsugaActive() {
    return isGetsugaActive(this);
  }

  isChannelingSkill() {
    return Boolean(this.isChannelingGetsuga || this.isChannelingBankai || this.hollowMaskFormationTimer > 0);
  }

  get channelTurnRate() {
    return CONFIG.ichigo?.channelTurnRate ?? 0.055;
  }

  canPerformBasicAttack() {
    return canPerformBasicAttack(this, () => super.canPerformBasicAttack());
  }

  _isShunpoComboActive() {
    return isShunpoComboActive(this);
  }

  isAboutToUnleashNormalGetsuga() {
    return isAboutToUnleashNormalGetsuga(this);
  }

  interruptAttacks(forceCancelAll = false) {
    const isTrulyDead = Boolean(this.isDead || this.hp <= 0);
    const isChannelingHollow = Boolean(this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait);
    const isChannelingBankai = Boolean(this.isChannelingBankai || this.bankaiBurstTimer > 0);
    const isChannelingGrandFinisher = Boolean(this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying());

    // Supreme Hyper-Armor Protections:
    // If channeling Hollow Awakening, Bankai transformation, or Grand Finisher, do NOT cancel unless fighter is truly DEAD
    if (!isTrulyDead) {
      if (isChannelingHollow) return;
      if (isChannelingBankai) return;
      if (isChannelingGrandFinisher && !forceCancelAll) return;
      if (!forceCancelAll) {
        if (this.isAboutToUnleashNormalGetsuga() || this.isChannelingGetsuga || this._isGetsugaVoicelinePlaying()) return;
        if (this._isShunpoComboActive()) return;
      }
    }

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoDisengageDelayTimer = 0;
    this.isShunpoDisengaging = false;
    this.shunpoTarget = null;
    this._isComboGetsuga = false;

    if (!this.isFinalMassiveGetsuga || forceCancelAll) {
      this.isChannelingGetsuga = false;
      this.isFinalMassiveGetsuga = false;
      this.getsugaChargeTimer = 0;
      this.getsugaSlideTimer = 0;
      this.getsugaRecoveryTimer = 0;
      this.getsugaTarget = null;
      this.getsugaCastAngle = undefined;
    }

    if (forceCancelAll) {
      this._stopFinalGetsugaVoiceline();
      if (isTrulyDead) {
        this.stopAllSkillAudios(true);
        this.isChannelingBankai = false;
        this.bankaiChargeTimer = 0;
        this.bankaiSlideTimer = 0;
        this.bankaiBurstTimer = 0;
        this.shikaiReversionBurstTimer = 0;
        this.isFinalGetsugaRecovery = false;
        this.hollowMaskFormationTimer = 0;
        this.hollowBurstTimer = 0;
        this._hollowVoicelineWait = false;
      }
      this.bankaiShards = [];
      this.bankaiClothStreamers = [];
      this._isComboGetsuga = false;
    }

    // Preserve existing afterimages across minor flinches so existing trails fade smoothly instead of abruptly disappearing
    // NEVER preserve if forceCancelAll is true or if struck by Getsuga Tensho
    const isGetsugaHit = isSuppressedByGetsuga(this);
    const savedAfterimages = (!forceCancelAll && !isGetsugaHit && this.afterImages && this.afterImages.length > 0) ? this.afterImages.slice() : null;

    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks(forceCancelAll);
    }

    if (savedAfterimages && !this.isDead && this.hp > 0 && !isGetsugaHit && !forceCancelAll) {
      this.afterImages = savedAfterimages;
    } else if (isGetsugaHit || forceCancelAll) {
      if (this.afterImages) this.afterImages.length = 0;
    }
  }

  suppressCombatAndVisuals(options = {}) {
    const isChannelingHollow = Boolean(this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait);
    const isChannelingBankai = Boolean(this.isChannelingBankai || this.bankaiBurstTimer > 0);
    const isChannelingGrandFinisher = Boolean(this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying());

    if (isChannelingHollow || isChannelingBankai || isChannelingGrandFinisher) {
      // Awakening transformations and Grand Finisher possess Supreme Hyper-Armor: do not suppress combat, clear animation timers, or interrupt transformation
      this.clearAllAfterimages();
      return;
    }
    super.suppressCombatAndVisuals(options);
  }

  applyKnockback(vx, vy, options = {}) {
    // When channeling Hollow Mask, Ichigo receives knockback/pushback from any attack!
    const isChannelingHollow = Boolean(this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait);

    // Hyper-Armor & Beam Pushback Immunity: Complete immunity to attack pushback / knockback during Bankai (channeling, active, burst), Final Getsuga, Shunpo Getsuga Blitz combo, or when caught in Yuta's Pure Love Beam
    const isIchigoReiatsuArmored = !isChannelingHollow && (
      this.bankaiActive || this.isChannelingBankai || this.bankaiBurstTimer > 0 ||
      this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isGetsugaSlash && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying() ||
      this._isShunpoComboActive() ||
      this.caughtInPureLoveBeam || (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) || options?.isPureLoveBeam
    );

    if (!this.isTargetOfAmbush && isIchigoReiatsuArmored && !options?.isIsoh && !options?.isSoulSplit) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.vx = 0;
      this.vy = 0;
      return;
    }
    super.applyKnockback(vx, vy);
  }

  _isInsideGojoDomain() {
    if (typeof state === 'undefined' || !state.fighters) return false;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = (myIndex >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
    return state.fighters.some((g, gIdx) => {
      if (!g || g === this || g.hp <= 0 || !g.domainActive) return false;
      const isGojo = (g.characterId === 'gojo' || g.type === 'gojo' || g._def?.id === 'gojo');
      if (!isGojo) return false;
      if (myTeam !== null && typeof state.getFighterTeam === 'function') {
        const gTeam = state.getFighterTeam(gIdx);
        if (gTeam !== null && gTeam === myTeam) return false;
      }
      return true;
    });
  }

  applyTimeStop(frames, opts = {}) {
    if (opts?.isDomain || opts?.isUltimate || this._isInsideGojoDomain()) {
      super.applyTimeStop(frames);
      this.vx = 0;
      this.vy = 0;
      if (this.knockbackVx !== undefined) this.knockbackVx = 0;
      if (this.knockbackVy !== undefined) this.knockbackVy = 0;
      return;
    }
    if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait) {
      return; // Hyper-Armor: Do not allow external attacks to freeze/pause Hollow Awakening transformation
    }
    const isBusyWithFinalGetsuga = this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    if (isBusyWithFinalGetsuga || this._isShunpoComboActive() || this.isAboutToUnleashNormalGetsuga()) {
      return; // Supreme Hyper-Armor: Do not allow external attacks to interrupt or cancel Grand Finisher / Shunpo Combo / Normal Getsuga
    }
    super.applyTimeStop(frames);
    if (!this.isChannelingBankai && (!this.hollowMaskFormationTimer || this.hollowMaskFormationTimer <= 0)) {
      this._stopFinalGetsugaVoiceline();
      this.interruptAttacks(true);
    }
  }

  applyParalysis(duration, opts = {}) {
    if (opts?.isDomain || opts?.isUltimate || this._isInsideGojoDomain()) {
      this._stopFinalGetsugaVoiceline();
      if (typeof super.applyParalysis === 'function') super.applyParalysis(duration);
      this.vx = 0;
      this.vy = 0;
      if (this.knockbackVx !== undefined) this.knockbackVx = 0;
      if (this.knockbackVy !== undefined) this.knockbackVy = 0;
      this.interruptAttacks(true);
      return;
    }
    const isBusyWithFinalGetsuga = this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    if (isBusyWithFinalGetsuga || this._isShunpoComboActive() || this.isAboutToUnleashNormalGetsuga()) {
      return; // Supreme Hyper-Armor: immune to paralysis during Final Getsuga Grand Finisher / Shunpo Combo / Normal Getsuga
    }
    if ((this.isChannelingBankai || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait) && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to paralysis during Bankai transformation & Hollow Awakening
    }
    this._stopFinalGetsugaVoiceline();
    if (typeof super.applyParalysis === 'function') super.applyParalysis(duration);
    this.interruptAttacks(true);
  }

  applyHitStun(duration, opts = {}) {
    if (opts?.isDomain || opts?.isUltimate || this._isInsideGojoDomain()) {
      this.vx = 0;
      this.vy = 0;
      if (this.knockbackVx !== undefined) this.knockbackVx = 0;
      if (this.knockbackVy !== undefined) this.knockbackVy = 0;
      super.applyHitStun(duration);
      return;
    }
    const isBusyWithFinalGetsuga = this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    if (isBusyWithFinalGetsuga || this._isShunpoComboActive() || this.isAboutToUnleashNormalGetsuga()) {
      this.hitStunTimer = 0;
      return; // Supreme Hyper-Armor: immune to hit stun during Final Getsuga Grand Finisher / Shunpo Combo / Normal Getsuga
    }

    const isHyperArmored = (this.isChannelingBankai || this.bankaiBurstTimer > 0) ||
      (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait);

    if (isHyperArmored && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga && !opts?.isIsoh && !opts?.isSoulSplit) {
      this.hitStunTimer = 0;
      return; // Hyper-Armor: immune to hit stun during Bankai transformation & Hollow Awakening
    }
    if (opts?.isWallSlam || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || opts?.isIsoh || opts?.isSoulSplit) {
      this._stopFinalGetsugaVoiceline();
    }
    super.applyHitStun(duration);
    this.interruptAttacks(false);
  }

  applyElectricStun(duration, opts = {}) {
    if (opts?.isDomain || opts?.isUltimate || this._isInsideGojoDomain()) {
      this.vx = 0;
      this.vy = 0;
      if (this.knockbackVx !== undefined) this.knockbackVx = 0;
      if (this.knockbackVy !== undefined) this.knockbackVy = 0;
      this._stopFinalGetsugaVoiceline();
      if (typeof super.applyElectricStun === 'function') super.applyElectricStun(duration);
      this.interruptAttacks(true);
      return;
    }
    const isBusyWithFinalGetsuga = this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    if (isBusyWithFinalGetsuga || this._isShunpoComboActive() || this.isAboutToUnleashNormalGetsuga()) {
      return; // Supreme Hyper-Armor: immune to electric stun during Final Getsuga Grand Finisher / Shunpo Combo / Normal Getsuga
    }
    if ((this.isChannelingBankai || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait) && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to electric stun during Bankai transformation & Hollow Awakening
    }
    this._stopFinalGetsugaVoiceline();
    if (typeof super.applyElectricStun === 'function') super.applyElectricStun(duration);
    this.interruptAttacks(true);
  }

  isParalyzedOrBeamTrapped() {
    if (this._isInsideGojoDomain()) return true;
    if (this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying() || this._isShunpoComboActive() || this.isAboutToUnleashNormalGetsuga()) {
      return false; // Supreme Hyper-Armor: Grand Finisher, Shunpo Combo, and Normal Getsuga are never paralyzed or beam-trapped
    }
    if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait) {
      return Boolean(this.isTargetOfAmbush);
    }
    return Boolean(
      this.isParalyzed ||
      this.isFrozen ||
      this.isTargetOfAmbush ||
      this.isFrozenByInfinity ||
      this.isGrabbedByMahoraga ||
      this.isParalyzedByMahoraga ||
      this.isWallSlammed ||
      (this.paralyzeTimer && this.paralyzeTimer > 0) ||
      (this.timeStopTimer && this.timeStopTimer > 0) ||
      (this.statusEffects && this.statusEffects.timeStopTimer > 0) ||
      (this.electricStunTimer && this.electricStunTimer > 0) ||
      (this.hitStunTimer && this.hitStunTimer > 0) ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam())
    );
  }

  activateHollowMask() {
    activateHollowMask(this);
  }

  applyHollowLifesteal(damageDealt, target) {
    applyHollowLifesteal(this, damageDealt, target);
  }

  onDamageDealt(target, projectile, ownerIndex, damageAmount) {
    super.onDamageDealt(target, projectile, ownerIndex);
    const dmg = damageAmount || (projectile && projectile.damage) || 0;
    if (dmg > 0) {
      this.applyHollowLifesteal(dmg, target);
    }
  }


  getParryChance() {
    return getParryChance(this);
  }

  takeDamage(amount, attacker, opts = {}) {
    return handleIchigoTakeDamage(this, amount, attacker, opts, (amt, atk, op) => super.takeDamage(amt, atk, op));
  }

  onDeath() {
    this.stopAllSkillAudios(true);
    this._hollowVoiceHandle = null;
    this._hollowFlareHandle = null;
    this._hollowVoicePlaying = false;
    this._hollowVoiceEndTime = 0;
    super.onDeath();
  }

  _getClosestEnemy() {
    let closest = null;
    let minDist = Infinity;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);
    
    // Check fighters
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = f;
            }
          }
        }
      });
    }
    // Check illusions (Rule #6: Unified queries include illusions)
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          const isEnemy = myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(ill.x - this.x, ill.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = ill;
            }
          }
        }
      });
    }
    return closest;
  }

  /**
   * Calculates the strict cardinal angle (UP / DOWN / LEFT / RIGHT STRAIGHT) towards the target.
   * Standard: 0 (Right), Math.PI (Left), Math.PI / 2 (Down), -Math.PI / 2 (Up).
   */
  _getCardinalAngle(target) {
    if (!target) {
      const cur = (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : (this.angle || 0);
      const cosA = Math.cos(cur);
      const sinA = Math.sin(cur);
      if (Math.abs(cosA) >= Math.abs(sinA)) {
        return cosA >= 0 ? 0 : Math.PI;
      } else {
        return sinA >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    const targetY = (target.y !== undefined ? target.y : this.y) - (target.z || 0);
    const ichigoY = this.y - (this.z || 0);
    const dx = (target.x !== undefined ? target.x : this.x) - this.x;
    const dy = targetY - ichigoY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 0 : Math.PI;
    } else {
      return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  aim(opponent) {
    if (this.isChannelingBankai) {
      return; // Lock orientation fixed during Bankai transformation vortex
    }
    if (this.isChannelingGetsuga || this.isAboutToUnleashNormalGetsuga() || (this.getsugaRecoveryTimer > 0 && this.isGetsugaSlash)) {
      if (this.getsugaCastAngle !== undefined) {
        this.gunAngle = this.getsugaCastAngle;
        this.angle = this.getsugaCastAngle;
        return; // Fully committed to locked cardinal cast angle (NO snap auto-aim tracking!)
      }
    }
    if (this.shunpoComboActive && this.shunpoTarget && this.shunpoTarget.hp > 0 && !this.shunpoTarget.isDead) {
      // Rule #3: Always update facing direction directly toward target upon flash-stepping and attacking
      const dx = this.shunpoTarget.x - this.x;
      const dy = this.shunpoTarget.y - this.y;
      this.applyAim(this.shunpoTarget, Math.atan2(dy, dx));
      return;
    }
    super.aim(opponent);
  }

  activateBankai() {
    activateBankai(this);
  }

  _releaseBankai() {
    releaseBankai(this);
  }

  shoot(ownerIndex) {
    if (this.isDead || this.hp <= 0 || this.isParalyzedOrBeamTrapped()) return false;
    if (this.isGetsugaActive()) return false;
    if (!this.canPerformBasicAttack()) return false;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isAboutToUnleashNormalGetsuga() || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive || this._isFinalGetsugaVoicelinePlaying()) return false;
    const target = this._getClosestEnemy();
    if (target) {
      this.aim(target);
      const reach = (CONFIG.ichigo?.swordRange || 70) + target.r;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= reach && this.swordCooldown <= 0 && this.slashSwingTimer <= 0) {
        this.performMeleeCleave(target);
        return true;
      }
    }
    return false;
  }

  triggerDemoAttack() {
    if (this.isGetsugaActive()) return;
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;
    this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }

  stopAllSkillAudios(force = true) {
    stopBankaiVoiceline(this, force);
    stopHollowTransformationVoiceline(this, force);
    stopFinalGetsugaVoiceline(this, force);

    this._hollowVoiceHandle = null;
    this._hollowFlareHandle = null;
    this._hollowVoicePlaying = false;
    this._hollowVoiceEndTime = 0;

    if (force || this.isDead || this.hp <= 0) {
      if (this._activeVoicelineHandle) {
        stopSound(this._activeVoicelineHandle);
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
          audioSystem.stopSFX(this._activeVoicelineHandle);
        }
        this._activeVoicelineHandle = null;
      }
    }
  }

  _stopBankaiVoiceline(force = false) {
    stopBankaiVoiceline(this, force);
  }

  _isBankaiVoicelinePlaying() {
    return isBankaiVoicelinePlaying(this);
  }

  _stopFinalGetsugaVoiceline(force = false) {
    stopFinalGetsugaVoiceline(this, force);
  }

  _stopHollowTransformationVoiceline(force = false) {
    stopHollowTransformationVoiceline(this, force);
  }

  _isHollowTransformationVoicelinePlaying() {
    return isHollowTransformationVoicelinePlaying(this);
  }

  _isGetsugaVoicelinePlaying() {
    return isGetsugaVoicelinePlaying(this);
  }

  _isFinalGetsugaVoicelinePlaying() {
    return isFinalGetsugaVoicelinePlaying(this);
  }

  fireFinalMassiveGetsuga(target = null) {
    fireFinalMassiveGetsuga(this, target);
  }

  fireGetsuga(target = null, isCombo = false) {
    fireGetsuga(this, target, isCombo);
  }

  _releaseGetsuga() {
    releaseGetsuga(this);
  }

  _clampToArena(x, y, r = this.r) {
    return clampToArena(this, x, y, r);
  }

  _isFlashStepEnabled() {
    return isFlashStepEnabled(this);
  }

  _isFlurryEnabled() {
    return isFlurryEnabled(this);
  }

  performShunpoStrike(target) {
    performShunpoStrike(this, target);
  }

  performShunpoGetsugaCombo(target) {
    performShunpoGetsugaCombo(this, target);
  }

  performMeleeCleave(target) {
    performMeleeCleave(this, target);
  }

  /**
   * Evaluates if Ichigo is currently engaged in an active attack animation,
   * Getsuga Tensho release swing/recovery, Shunpo combo, or transformation burst.
   * Prevents premature roundEnd/matchEnd transition on lethal kill.
   * @returns {boolean}
   */
  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.dead || this.isDead) return false;

    if (
      (this.slashSwingTimer && this.slashSwingTimer > 0) ||
      this.isGetsugaSlash ||
      this.isChannelingGetsuga ||
      (this.getsugaChargeTimer && this.getsugaChargeTimer > 0) ||
      (this.getsugaSlideTimer && this.getsugaSlideTimer > 0) ||
      (this.getsugaRecoveryTimer && this.getsugaRecoveryTimer > 0) ||
      this.isFinalGetsugaRecovery ||
      this.isFinalMassiveGetsuga ||
      this.shunpoComboActive ||
      this.isShunpoDashing ||
      this.isShunpoDisengaging ||
      (this.shunpoComboDelayTimer && this.shunpoComboDelayTimer > 0) ||
      (this.shunpoDisengageDelayTimer && this.shunpoDisengageDelayTimer > 0) ||
      this.isChannelingBankai ||
      (this.bankaiBurstTimer && this.bankaiBurstTimer > 0) ||
      (this.hollowMaskFormationTimer && this.hollowMaskFormationTimer > 0) ||
      (this.hollowBurstTimer && this.hollowBurstTimer > 0) ||
      this._isGetsugaVoicelinePlaying() ||
      this._isFinalGetsugaVoicelinePlaying()
    ) {
      return true;
    }

    return super.hasActiveFinishingAbility();
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.stopAllSkillAudios(true);
      this.afterImages = [];
      return;
    }

    this._tickCooldowns();

    // Update afterimages (fades even if frozen)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.blockPoseTimer > 0) this.blockPoseTimer--;
    // Update Zangetsu ribbon & Bankai chain physics & anchor (keeps them seamlessly locked to pommel even when frozen)
    updateZangetsuRibbonPhysics(this);
    updateTensaZangetsuChainPhysics(this);

    // Rule #1: At the top of EVERY fighter update() method, freeze/time-stop guard checks
    const isInsideGojoDomain = this._isInsideGojoDomain();
    const isChannelingHollow = this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait;
    const isChannelingGrandFinisher = this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    const isChannelingCombo = this._isShunpoComboActive();
    const isAboutToUnleashNormal = this.isAboutToUnleashNormalGetsuga();
    const isFrozen = this._handleTimeStop() || 
      this.isParalyzedOrBeamTrapped() ||
      isInsideGojoDomain;

    if (isFrozen) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      const isNanamiPausing = typeof isGlobalHitPauseActive === 'function' && isGlobalHitPauseActive(state, this);
      if (!isNanamiPausing && !isChannelingHollow && !isChannelingGrandFinisher && !isAboutToUnleashNormal && !isChannelingCombo && !this.isChannelingBankai && this.bankaiBurstTimer <= 0) {
        this._stopFinalGetsugaVoiceline();
        this.interruptAttacks(true);
      }
      super.update(opponent, ownerIndex, arena);
      return;
    }

    const isMatchEnded = Boolean(typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || state.gameState === 'champion'));

    // Delegate Hollow Mask lifecycle (passive activation, formation screen shake, burst, active decay & shatter)
    if (updateHollowMask(this, opponent, isMatchEnded)) {
      return;
    }

    // Delegate Bankai transformation channeling, burst, shards/streamers, and duration decay
    if (updateBankai(this, opponent, isMatchEnded)) {
      return;
    }

    // Delegate Getsuga Tensho channeling & recoil recovery
    if (updateGetsuga(this, opponent)) {
      return;
    }

    // Slash swing animation timer decay
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      if (this.slashSwingTimer <= 0) {
        this.isGetsugaSlash = false;
      }
    }

    // Delegate Shunpo Dashing & Flurry Combos
    if (updateShunpoCombat(this, opponent)) {
      return;
    }

    // Update active speed multipliers (combines Bankai and Hollow Mask form boosts)
    let speedMult = 1.0;
    if (this.bankaiActive) {
      speedMult *= (CONFIG.ichigo?.bankaiSpeedMultiplier || 1.5);
    }
    if (this.hollowMaskActive) {
      speedMult *= (CONFIG.ichigo?.hollowSpeedMultiplier || 1.4);
    }
    this.speedMultiplier = speedMult;

    super.update(opponent, ownerIndex, arena);

    // AI Logic (autonomous decision making)
    if (!this.playerControlled && !this.isParalyzedOrBeamTrapped() && !this.isStationarySkillActive() && !this.isAboutToUnleashNormalGetsuga() && !this.isChannelingGetsuga && this.getsugaRecoveryTimer <= 0 && !this._isGetsugaVoicelinePlaying() && !this._isFinalGetsugaVoicelinePlaying() && (this.hollowMaskFormationTimer || 0) <= 0 && (this.hollowBurstTimer || 0) <= 0) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // 1. Trigger Ultimate: Bankai Awakening (HP threshold / cooldown recovery / damage recharge)
        const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.80;
        const cd = this.ultimateCooldown || 0;
        const hpRatio = this.hp / (this.maxHp || 240);
        const reqDamage = (this.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
        const baseline = this.bankaiRechargeHpBaseline !== undefined ? this.bankaiRechargeHpBaseline : this.hp;
        const damageTaken = Math.max(0, baseline - this.hp);

        const isFirstTrigger = (!this.bankaiUsed && (hpRatio <= ultThreshold));
        const isSubsequentTrigger = (this.bankaiUsed && ((cd <= 0 && hpRatio <= ultThreshold) || (damageTaken >= reqDamage) || (cd <= 0)));

        const isBusy = this.isAboutToUnleashNormalGetsuga() || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this._isGetsugaVoicelinePlaying() || this._isFinalGetsugaVoicelinePlaying() || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.isShunpoDashing || this.shunpoComboActive;
        const canBankai = !this.bankaiActive && !this.isChannelingBankai && !isBusy && (isFirstTrigger || isSubsequentTrigger);
        if (canBankai) {
          this.activateBankai();
        }

        // 2. Trigger Unified Skill Combo or Standalone Getsuga Tensho
        const isBankai = this.bankaiActive || this.skin === 'bankai';
        const isFlashStepEnabled = this._isFlashStepEnabled();
        const comboMin = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMinDist ?? 0) : (CONFIG.ichigo?.comboTriggerMinDist ?? 0);
        const comboMax = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMaxDist || 400) : (CONFIG.ichigo?.comboTriggerMaxDist || 400);

        if (isFlashStepEnabled) {
          if (!this.isAboutToUnleashNormalGetsuga() && this.shunpoCooldown <= 0 && dist >= comboMin && dist <= comboMax) {
            this.performShunpoGetsugaCombo(target);
            this.aim(target); // Rule #3: aim immediately after teleport
            return;
          }
        } else {
          // When Flash Step is disabled in config, trigger standalone Getsuga Tensho wave at range
          const gMin = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMinDist ?? 0) : (CONFIG.ichigo?.getsugaTriggerMinDist ?? 0);
          const gMax = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMaxDist || 400) : (CONFIG.ichigo?.getsugaTriggerMaxDist || 400);
          if (!this.isAboutToUnleashNormalGetsuga() && this.getsugaCooldown <= 0 && dist >= gMin && dist <= gMax) {
            let cdMult = 1.0;
            if (isBankai) {
              cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? CONFIG.ichigo?.bankaiGetsugaCooldownMultiplier ?? 0.65);
            }
            if (this.hollowMaskActive) {
              cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowShunpoCooldownMultiplier ?? CONFIG.ichigo?.hollowGetsugaCooldownMultiplier ?? 0.60);
            }
            const isFlurry = this._isFlurryEnabled();
            const baseCd = !isFlurry 
              ? (CONFIG.ichigo?.flashStepCooldown ?? CONFIG.ichigo?.singleShunpoCooldown ?? 320)
              : (CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.shunpoCooldown || CONFIG.ichigo?.getsugaCooldown || 450);
            const minPostGetsugaBuffer = (isBankai && this.hollowMaskActive)
              ? (CONFIG.ichigo?.bankaiHollowPostGetsugaCooldown ?? 120)
              : (this.hollowMaskActive
                ? (CONFIG.ichigo?.hollowPostGetsugaCooldown ?? 110)
                : (isBankai ? (CONFIG.ichigo?.bankaiPostGetsugaCooldown ?? 100) : (CONFIG.ichigo?.postGetsugaCooldown ?? 120)));
            const finalCd = Math.max(minPostGetsugaBuffer, Math.round(baseCd * cdMult));
            this.getsugaCooldown = finalCd;
            this.shunpoCooldown = finalCd;
            this.fireGetsuga(target, false);
            return;
          }
        }

        // 3. Melee attacks (Tensa Zangetsu cleave)
        const reach = CONFIG.ichigo?.swordRange || 70;
        if (dist <= reach + target.r && this.swordCooldown <= 0 && !this.isGetsugaActive()) {
          this.performMeleeCleave(target);
        }
      }
    }
  }

  // Helper to calculate distance from point to segment
  _distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  drawBody(ctx) {
    drawIchigoSkin(ctx, this);
  }

  drawGun(ctx) {
    // Override to prevent drawing the default gun barrel and hands
  }

  drawOutline(ctx) {
    // No-op: ichigoSkin already renders the crisp 3px body stroke aligned with body shift/tilt
  }

  draw(ctx) {
    // Render afterimages with smooth alpha decay and arena boundary clipping (strictly suppressed during Bankai channeling and burst)
    if (this.afterImages && this.afterImages.length > 0 && !this.isChannelingBankai && (this.bankaiBurstTimer || 0) <= 0) {
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
      ctx.save();

      // Clip afterimage drawing with generous body margin so afterimages near arena walls are never sliced in half
      if (arena) {
        const margin = (this.r || 25) + 15;
        if (arena.shape === 'circle' || arena.radius) {
          const cx = arena.x + (arena.width ? arena.width / 2 : 0);
          const cy = arena.y + (arena.height ? arena.height / 2 : 0);
          const ar = (arena.radius || (arena.width / 2)) + margin;
          ctx.beginPath();
          ctx.arc(cx, cy, ar, 0, Math.PI * 2);
          ctx.clip();
        } else if (arena.width && arena.height) {
          ctx.beginPath();
          ctx.rect(arena.x - margin, arena.y - margin, arena.width + margin * 2, arena.height + margin * 2);
          ctx.clip();
        }
      }

      for (let i = 0; i < this.afterImages.length; i++) {
        const ai = this.afterImages[i];
        if (!ai || ai.timer <= 0) continue;
        const life = Math.max(0, Math.min(1, ai.timer / (ai.maxTimer || 16)));
        if (life <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = life * 0.55;
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle || 0);
        ctx.imageSmoothingEnabled = false;

        const p = 2.0;
        const snap = (v) => Math.round(v / p) * p;
        const radius = ai.r || 25;
        const maxExtent = Math.ceil(radius / p) + 2;

        // Pixel-art afterimage body silhouette
        ctx.fillStyle = ai.color || 'rgba(12, 4, 10, 0.75)';
        for (let gy = -maxExtent; gy <= maxExtent; gy++) {
          for (let gx = -maxExtent; gx <= maxExtent; gx++) {
            const x = gx * p;
            const y = gy * p;
            if (Math.hypot(x, y) <= radius + 0.25) {
              ctx.fillRect(snap(x), snap(y), p, p);
            }
          }
        }

        // Blocky outer aura border for Bankai / Hollow forms
        if (ai.strokeColor || ai.isBankai) {
          const auraColor = ai.strokeColor || 'rgba(220, 20, 20, 0.90)';
          ctx.fillStyle = auraColor;
          for (let gy = -maxExtent - 1; gy <= maxExtent + 1; gy++) {
            for (let gx = -maxExtent - 1; gx <= maxExtent + 1; gx++) {
              const x = gx * p;
              const y = gy * p;
              const d = Math.hypot(x, y);
              if (d >= radius - 1.5 && d <= radius + 2.5) {
                ctx.fillRect(snap(x), snap(y), p, p);
              }
            }
          }
        }

        ctx.restore();
      }
      ctx.restore();
    }

    // Render dynamic crescent blade slash arc
    drawIchigoSlashArc(ctx, this);

    super.draw(ctx);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    // 1. Hollow Mask expiration while frozen
    if (this.hollowMaskActive && (this.hollowMaskFormationTimer || 0) <= 0 && (this.hollowBurstTimer || 0) <= 0 && this.hollowMaskTimer <= 0) {
      this.hollowMaskActive = false;
      if (typeof spawnHollowMaskShatter === 'function') {
        spawnHollowMaskShatter(this);
      }
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 28, "MASK SHATTERED!", "#FFFFFF");
      }
    }

    // 2. Bankai expiration while frozen
    if (this.bankaiActive && this.bankaiTimer <= 0) {
      this.bankaiActive = false;
      this.bankaiUsed = true;
      this.bankaiFinalGetsugaTriggered = false;
      this.isFinalMassiveGetsuga = false;
      this.isFinalGetsugaRecovery = false;
      if (typeof this._stopFinalGetsugaVoiceline === 'function') {
        this._stopFinalGetsugaVoiceline();
      }
      this.bankaiRechargeHpBaseline = this.hp;
      this._maxBankaiPct = 0;
      const cd = CONFIG.ichigo?.bankaiCooldown || CONFIG.ichigo?.ultimateCooldown || 600;
      this.ultimateCooldown = cd;
      this.bankaiCooldownMax = cd;
      this.isGetsugaSlash = false;
      this.isFinalMassiveGetsuga = false;
      this.isFinalGetsugaRecovery = false;
      this.isChannelingGetsuga = false;
      this.getsugaChargeTimer = 0;
      this.getsugaSlideTimer = 0;
      this.getsugaRecoveryTimer = 0;
      this.getsugaTarget = null;
      this.isShunpoDashing = false;
      this.shunpoDashTimer = 0;
      this.shunpoComboActive = false;
      this.shunpoComboStep = 0;
      this.shunpoComboDelayTimer = 0;
      this.shunpoTarget = null;
      this.afterImages = [];
      this._lastBankaiTrailX = undefined;
      this._lastBankaiTrailY = undefined;
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 28, "BANKAI EXPIRED", "#FF1E00");
      }
    }
  }
}

