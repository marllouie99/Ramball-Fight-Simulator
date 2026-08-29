import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics, updateTensaZangetsuChainPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks, spawnParrySparksEffect } from '../../graphics/particles/sparkEffect.js';
import { drawIchigoSlashArc } from '../../graphics/weapons/ichigoWeaponGraphics.js';
import { stopSound } from '../../systems/soundSystem.js';

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
    this.shunpoCooldown = 0;
    this.ultimateCooldown = 0;

    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
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
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
  }

  _playSound(key, defaultSfx, defaultVol = 1.0, minIntervalMs = 0) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (minIntervalMs > 0 && (now - lastPlayed < minIntervalMs)) return;
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.ichigo?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.ichigo?.soundVolumes?.[key] ?? defaultVol;
    const delay = CONFIG.ichigo?.soundDelays?.[key] ?? 0;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfx, vol, 1.0, 0, delay);
    }
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = 0;
    this.ultimateCooldown = 0;
    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
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
    this._stopFinalGetsugaVoiceline();
    this.afterImages = [];
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
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
    this.bankaiBurstTimer = 0;
    this.shikaiReversionBurstTimer = 0;
    this.bankaiRibbonTimer = 0;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
  }

  interruptAttacks(forceCancelAll = false) {
    // If channeling Bankai, Grand Finisher (Final Massive Kuroi Getsuga), or Hollow Awakening, do NOT cancel unless forceCancelAll is true (e.g. death)
    if (!forceCancelAll) {
      if (this.isChannelingBankai || this.bankaiBurstTimer > 0) return;
      if (this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying()) return;
      if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0) return;
    }

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;

    if (!this.isFinalMassiveGetsuga || forceCancelAll) {
      this.isChannelingGetsuga = false;
      this.isFinalMassiveGetsuga = false;
      this.getsugaChargeTimer = 0;
      this.getsugaSlideTimer = 0;
      this.getsugaRecoveryTimer = 0;
      this.getsugaTarget = null;
    }

    if (forceCancelAll) {
      this._stopFinalGetsugaVoiceline();
      this.isChannelingBankai = false;
      this.bankaiChargeTimer = 0;
      this.bankaiSlideTimer = 0;
      this.bankaiBurstTimer = 0;
      this.shikaiReversionBurstTimer = 0;
      this.isFinalGetsugaRecovery = false;
      this.hollowMaskFormationTimer = 0;
      this.hollowBurstTimer = 0;
      this.bankaiShards = [];
      this.bankaiClothStreamers = [];
    }

    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks(forceCancelAll);
    }
  }

  applyKnockback(vx, vy, options = {}) {
    // When channeling Hollow Mask, Ichigo receives knockback/pushback from any attack!
    const isChannelingHollow = Boolean(this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait);

    // Hyper-Armor & Beam Pushback Immunity: Complete immunity to attack pushback / knockback during Bankai (channeling, active, burst), Final Getsuga, or when caught in Yuta's Pure Love Beam
    const isIchigoReiatsuArmored = !isChannelingHollow && (
      this.bankaiActive || this.isChannelingBankai || this.bankaiBurstTimer > 0 ||
      this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isGetsugaSlash && this.isFinalGetsugaRecovery) ||
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

  applyTimeStop(frames) {
    if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait) {
      return; // Hyper-Armor: Do not allow external attacks to freeze/pause Hollow Awakening transformation
    }
    super.applyTimeStop(frames);
    if (!this.isChannelingBankai && !(this.isChannelingGetsuga && this.isFinalMassiveGetsuga) && (!this.hollowMaskFormationTimer || this.hollowMaskFormationTimer <= 0)) {
      this._stopFinalGetsugaVoiceline();
      this.interruptAttacks(true);
    }
  }

  applyParalysis(duration, opts = {}) {
    if ((this.isChannelingBankai || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || this.hollowMaskFormationTimer > 0) && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to paralysis during Bankai transformation, Final Getsuga charge & Hollow Awakening
    }
    this._stopFinalGetsugaVoiceline();
    if (typeof super.applyParalysis === 'function') super.applyParalysis(duration);
    this.interruptAttacks(true);
  }

  applyHitStun(duration, opts = {}) {
    const isHyperArmored = (this.isChannelingBankai || this.bankaiBurstTimer > 0) ||
      (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || this.isFinalMassiveGetsuga || (this.getsugaRecoveryTimer > 0 && this.isGetsugaSlash && this.isFinalGetsugaRecovery) ||
      (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0);

    if (isHyperArmored && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga && !opts?.isIsoh && !opts?.isSoulSplit) {
      return; // Hyper-Armor: immune to hit stun during Bankai transformation, Final Getsuga charge/recovery & Hollow Awakening
    }
    if (opts?.isWallSlam || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || opts?.isIsoh || opts?.isSoulSplit) {
      this._stopFinalGetsugaVoiceline();
    }
    super.applyHitStun(duration);
    this.interruptAttacks(false);
  }

  applyElectricStun(duration, opts = {}) {
    if ((this.isChannelingBankai || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || this.hollowMaskFormationTimer > 0) && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to electric stun during Bankai transformation, Final Getsuga charge & Hollow Awakening
    }
    this._stopFinalGetsugaVoiceline();
    if (typeof super.applyElectricStun === 'function') super.applyElectricStun(duration);
    this.interruptAttacks(true);
  }

  isParalyzedOrBeamTrapped() {
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
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      this.isCaughtInPurple ||
      (this.purpleHitTimer && this.purpleHitTimer > 0) ||
      this.caughtInPureLoveBeam ||
      (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) ||
      (this.pureLoveBeamRecoveryTimer && this.pureLoveBeamRecoveryTimer > 0)
    );
  }

  activateHollowMask() {
    if (this.hollowMaskUsed || this.isDead || this.hp <= 0 || this.isTargetOfAmbush || this.isParalyzedOrBeamTrapped()) return;
    // Do not interrupt Bankai Transformation or Bankai Grand Finisher (Final Massive Kuroi Getsuga)
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0) return;
    if (this.isFinalMassiveGetsuga || (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || this._isFinalGetsugaVoicelinePlaying()) return;
    if (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) return;
    const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
    if (this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer <= finalThreshold) return;

    this.interruptAttacks(true); // Cancel any ongoing attack/dash to lock in place
    this.hollowMaskUsed = true;
    this.hollowMaskActive = true;
    this.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration ?? 800;
    const chargeFrames = CONFIG.ichigo?.hollowMaskFormationFrames ?? 325;
    this.hollowMaskFormationTimer = chargeFrames;
    this.hollowMaskFormationMax = chargeFrames;
    this.hollowBurstTimer = 0; // Starts after formation/channeling finishes!
    this.hollowBurstMax = CONFIG.ichigo?.hollowBurstFrames || 36;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.gunAngle = 0; // Strictly face towards player/viewer during Hollow Channeling
    this.angle = 0;
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const text = isBankai ? "BANKAI + HOLLOW AWAKENING!" : "HOLLOW AWAKENING!";
    spawnFloatingText(this.x, this.y - this.r - 28, text, "#FF1E00");

    // Play the 5.35-second Hollow Transformation Voiceline
    const voiceSrc = CONFIG.ichigo?.sounds?.hollowAwakenVoice || 'Assets/Sound Effects/Skills/ichigo-hollowtransformation-voiceline.mp3';
    const voiceVol = CONFIG.ichigo?.soundVolumes?.hollowAwakenVoice ?? 3.0;
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
      audioSystem.playFighterVoiceline(this, voiceSrc, voiceVol, 1.0, 0, 0, {
        priority: 'domain',
        isProtected: true,
        durationMs: 5350
      });
    } else {
      this._playSound('hollowAwakenVoice', voiceSrc, voiceVol);
    }

    this._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(isBankai ? 4.5 : 3.5, 24);
    }
  }

  _handleTimeStop() {
    if (!this.isParalyzedDebuffActive()) {
      if (this.swordCooldown > 0) this.swordCooldown--;
      if (this.getsugaCooldown > 0) this.getsugaCooldown--;
      if (this.shunpoCooldown > 0) this.shunpoCooldown--;
      if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    }
    return super._handleTimeStop();
  }

  getParryChance() {
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let chance = CONFIG.ichigo?.parryChance ?? 0.15;
    if (isBankai && isMask) {
      chance = CONFIG.ichigo?.bankaiHollowParryChance ?? 0.35;
    } else if (isMask) {
      chance = CONFIG.ichigo?.hollowParryChance ?? 0.30;
    } else if (isBankai) {
      chance = CONFIG.ichigo?.bankaiParryChance ?? 0.25;
    }
    if (this.blockPoseTimer > 0) {
      chance += 0.15;
    }
    return Math.min(0.85, chance);
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts.isHeal || amount <= 0) {
      return super.takeDamage(amount, attacker, opts);
    }
    if (this.isDead || this.hp <= 0) {
      this._stopFinalGetsugaVoiceline();
      return super.takeDamage(amount, attacker, opts);
    }

    if (opts.isWallSlam || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || this.isTargetOfAmbush) {
      this._stopFinalGetsugaVoiceline();
      this.interruptAttacks(true);
    }

    // 1. Reiatsu Armor (30% damage reduction during Final Getsuga charge and Hollow Awakening formation)
    let finalAmount = amount;
    if ((this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.hollowMaskFormationTimer && this.hollowMaskFormationTimer > 0)) {
      finalAmount *= 0.70;
    }

    // 2. Zanjutsu Parry Check (Blade deflection on incoming attack)
    const isBusy = this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing || this.isFrozen || this.isParalyzed || this.isTargetOfAmbush || opts.isIsoh || opts.isSoulSplit;
    if (!isBusy && !opts.bypassShield && Math.random() < this.getParryChance()) {
      // Successful Parry & Deflection!
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const lastStance = this.parryStanceIndex || 0;
      this.parryStanceIndex = (lastStance + 1 + Math.floor(Math.random() * 3)) % 4;
      this.blockPoseTimer = CONFIG.ichigo?.parryGuardDuration || 45;
      this.parryHitAnimTimer = CONFIG.ichigo?.parryHitAnimDuration || 18;

      if (attacker && !attacker.isDead && typeof this.aim === 'function') {
        this.aim(attacker);
      }

      // Spark calculation along angled parry blade
      const pStance = this.parryStanceIndex;
      let stanceOffset = -1.15;
      if (pStance === 1) stanceOffset = 1.30;
      else if (pStance === 2) stanceOffset = 1.57;
      else if (pStance === 3) stanceOffset = -0.78;

      const bladeAngle = (this.gunAngle || 0) + stanceOffset;
      const sparkX = this.x + Math.cos(bladeAngle) * 45;
      const sparkY = this.y + Math.sin(bladeAngle) * 45;

      if (typeof spawnParrySparksEffect === 'function') {
        spawnParrySparksEffect(sparkX, sparkY);
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(sparkX, sparkY, 12, isBankai ? '#DC143C' : '#00E5FF');
      }

      this._playSound('parry', 'Assets/Sound Effects/Skills/shieldblock2.mp3', 0.85);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3.5, 8);
      }

      // Deflection pushback on melee attacker
      if (attacker && attacker !== this && !attacker.isDead && typeof attacker.applyKnockback === 'function') {
        const pushAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
        const pushF = CONFIG.ichigo?.parryDeflectionPush || 7.0;
        attacker.applyKnockback(Math.cos(pushAngle) * pushF, Math.sin(pushAngle) * pushF);
      }

      spawnFloatingText(this.x, this.y - this.r - 20, "PARRY!", isBankai ? "#DC143C" : "#00E5FF");
      return 0; // Fully deflected / negated damage!
    }

    // 3. Hierro (Iron Skin) Damage Reduction
    if (this.hollowMaskActive) {
      const defRed = CONFIG.ichigo?.hollowDamageReduction ?? 0.10;
      finalAmount = Math.max(1, finalAmount * (1.0 - defRed));
    }

    const res = super.takeDamage(finalAmount, attacker, opts);

    if (this.isDead || this.hp <= 0) {
      this._stopFinalGetsugaVoiceline();
      this.interruptAttacks(true);
    }

    // Immediate Hollow Mask trigger upon taking critical damage below 70% HP (only if not busy with Bankai Grand Finisher or in ambush)
    const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
    const isBusyWithFinalGetsuga = (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying();
    const isPendingFinalGetsuga = this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer > 0 && this.bankaiTimer <= finalThreshold;
    if (!this.hollowMaskUsed && !this.isTargetOfAmbush && !isBusyWithFinalGetsuga && !isPendingFinalGetsuga && !this.isChannelingBankai && !this.isParalyzedOrBeamTrapped() && this.hp > 0 && this.hp / this.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold ?? 0.70)) {
      this.activateHollowMask();
    }

    return res;
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

  aim(opponent) {
    if (this.isChannelingBankai) {
      const target = this._getClosestEnemy();
      if (target && target.hp > 0 && !target.isDead) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        this.gunAngle = Math.atan2(dy, dx);
        this.angle = this.gunAngle;
      }
      return;
    }
    if (this.isChannelingGetsuga && this.getsugaTarget && this.getsugaTarget.hp > 0 && !this.getsugaTarget.isDead) {
      const dx = this.getsugaTarget.x - this.x;
      const dy = this.getsugaTarget.y - this.y;
      this.gunAngle = Math.atan2(dy, dx);
      this.angle = this.gunAngle;
      return;
    }
    if (this.shunpoComboActive && this.shunpoTarget && this.shunpoTarget.hp > 0 && !this.shunpoTarget.isDead) {
      // Rule #3: Always update facing direction directly toward target upon flash-stepping and attacking
      const dx = this.shunpoTarget.x - this.x;
      const dy = this.shunpoTarget.y - this.y;
      this.gunAngle = Math.atan2(dy, dx);
      this.angle = this.gunAngle;
      return;
    }
    super.aim(opponent);
  }

  activateBankai() {
    if (this.isDead || this.hp <= 0 || this.isTargetOfAmbush || this.isParalyzedOrBeamTrapped() || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (
      this.isChannelingBankai || 
      this.bankaiActive || 
      this.hollowMaskActive || // Cannot activate Bankai if in Hollow state first
      this.hollowMaskFormationTimer > 0 || 
      this.hollowBurstTimer > 0 || 
      this.shikaiReversionBurstTimer > 0 ||
      this.isChannelingGetsuga || 
      this.getsugaRecoveryTimer > 0 || 
      this._isGetsugaVoicelinePlaying() || 
      this._isFinalGetsugaVoicelinePlaying() ||
      this.isShunpoDashing ||
      this.shunpoComboActive
    ) return;

    // Strict validation: Ensure Bankai condition is genuinely met (HP <= 90% on 1st use, or HP lost >= 20% on subsequent use)
    const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.90;
    const reqDamage = (this.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
    const baseline = this.bankaiRechargeHpBaseline !== undefined ? this.bankaiRechargeHpBaseline : this.hp;
    const damageTaken = Math.max(0, baseline - this.hp);
    const isReady = !this.bankaiUsed ? (this.hp / this.maxHp <= ultThreshold) : (damageTaken >= reqDamage);
    if (!isReady) return;

    this.bankaiUsed = true;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this.ultimateCooldown = 0;

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    const chargeFrames = CONFIG.ichigo?.bankaiChargeFrames || 66;

    this.isChannelingBankai = true;
    this.bankaiChargeMax = chargeFrames;
    this.bankaiChargeTimer = chargeFrames;
    this.bankaiSlideTimer = 0; // Immediate complete stop (no sliding)

    const chargeText = this.hollowMaskActive ? "BAN... KAI! (HOLLOW)" : "BAN... KAI!";
    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, "#DC143C");

    const voiceSrc = CONFIG.ichigo?.sounds?.bankaiCharge || 'Assets/Sound Effects/Skills/Ichigo-bankai-charging-voiceline.mp3';
    const voiceVol = CONFIG.ichigo?.soundVolumes?.bankaiCharge ?? 2.8;
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
      audioSystem.playFighterVoiceline(this, voiceSrc, voiceVol, 1.0, 0, 0, {
        priority: 'domain',
        isProtected: true,
        durationMs: 1150
      });
    } else {
      this._playSound('bankaiCharge', voiceSrc, voiceVol);
    }
  }

  _releaseBankai() {
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;

    this.bankaiActive = true;
    this.bankaiTimer = CONFIG.ichigo?.bankaiDuration || 800;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.ultimateCooldown = 0;

    this.bankaiBurstMax = CONFIG.ichigo?.bankaiBurstFrames || 36;
    this.bankaiBurstTimer = this.bankaiBurstMax;
    this.bankaiRibbonMax = CONFIG.ichigo?.bankaiRibbonDuration || 280;
    this.bankaiRibbonTimer = this.bankaiRibbonMax;

    // Initialize 28 crystalline Reiatsu barrier diamond shards exploding outward
    this.bankaiShards = [];
    const shardCount = 28;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = 5.0 + Math.random() * 7.5;
      const size = 6.5 + Math.random() * 9.0;
      const rot = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.30;
      let color;
      if (i % 4 === 0) color = '#111111';        // Jet Black void shard
      else if (i % 4 === 1) color = '#DC143C';   // Crimson core
      else if (i % 4 === 2) color = '#FF1E00';   // Fiery red
      else color = '#FF4500';                   // Blazing vermilion edge

      this.bankaiShards.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        rot,
        rotSpeed,
        color,
        life: 1.0
      });
    }

    // Initialize 14 swirling torn Shihakusho black cloth streamers
    this.bankaiClothStreamers = [];
    const streamerCount = 14;
    for (let i = 0; i < streamerCount; i++) {
      const angle = (i / streamerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4.0 + Math.random() * 5.5;
      const length = 18 + Math.random() * 24;
      const width = 3.2 + Math.random() * 2.8;
      this.bankaiClothStreamers.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        length,
        width,
        life: 1.0
      });
    }

    const releaseText = this.hollowMaskActive ? "...KAI! TENSA ZANGETSU (BANKAI + HOLLOW)" : "...KAI! TENSA ZANGETSU";
    spawnFloatingText(this.x, this.y - this.r - 28, releaseText, "#FF1E00");
    this._playSound('bankaiReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    this._playSound('bankaiReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.90);
    
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(CONFIG.ichigo?.bankaiScreenShake || 7, 28);
    }
    const shockwaveSize = CONFIG.ichigo?.bankaiAuraShockwaveSize || 95;
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize, 'sukuna');
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize * 0.8, 'gojo');
    spawnImpactFlash(this.x, this.y, 'sukuna');

    // ── Frontal Supersonic Reiatsu Wind Pressure Damage & Knockback Blast ──
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    this._bankaiBurstAngle = aimAngle; // Saved for frontal wind blast rendering
    const reach = CONFIG.ichigo?.bankaiWindReach || 240;
    const arc = ((CONFIG.ichigo?.bankaiWindArc || 140) * Math.PI) / 180;
    const windDmg = CONFIG.ichigo?.bankaiWindDamage || 35;
    const kbForce = CONFIG.ichigo?.bankaiWindKnockback || 14;
    const stunDuration = CONFIG.ichigo?.bankaiWindHitStun || 24;

    const myIndex = state.fighters ? state.fighters.indexOf(this) : -1;
    const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;

    const candidates = [];
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
            candidates.push(f);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
            candidates.push(ill);
          }
        }
      });
    }

    candidates.forEach((enemy) => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.r) {
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - aimAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          // Rule #5: Apply hit pause only to target
          if (typeof enemy.applyTimeStop === 'function') {
            enemy.applyTimeStop(CONFIG.ichigo?.bankaiWindFreezeDuration || 12);
          }
          if (typeof enemy.applyHitStun === 'function') {
            enemy.applyHitStun(stunDuration);
          }

          // Apply frontal wind blast damage and massive knockback push
          applyDamageToTarget(enemy, windDmg, this, { isSkill: true });

          if (typeof enemy.applyKnockback === 'function') {
            enemy.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
          }

          spawnImpactFlash(enemy.x, enemy.y, 'sukuna');
          spawnMeleeClashShockwave(enemy.x, enemy.y, 65, 'sukuna');
          spawnSparks(enemy.x, enemy.y, 8, '#DC143C');

          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(CONFIG.ichigo?.bankaiWindHitScreenShake ?? 6.0, CONFIG.ichigo?.bankaiWindHitShakeDuration ?? 12);
          }
        }
      }
    });
  }

  shoot(ownerIndex) {
    if (this.isDead || this.hp <= 0 || this.isParalyzedOrBeamTrapped()) return false;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive || this._isFinalGetsugaVoicelinePlaying()) return false;
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
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;
    this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }


  _stopFinalGetsugaVoiceline() {
    if (this._finalGetsugaVoiceHandle) {
      stopSound(this._finalGetsugaVoiceHandle);
      this._finalGetsugaVoiceHandle = null;
    }
    if (this._getsugaVoiceHandle) {
      stopSound(this._getsugaVoiceHandle);
      this._getsugaVoiceHandle = null;
    }
    if (this._activeVoicelineHandle) {
      const srcStr = String(this._activeVoicelineHandle.src || (this._activeVoicelineHandle.audio && this._activeVoicelineHandle.audio.src) || '').toLowerCase();
      if (srcStr.includes('getsugatensho') || srcStr.includes('getsuga') || srcStr.includes('kuroi')) {
        stopSound(this._activeVoicelineHandle);
        this._activeVoicelineHandle = null;
      }
    }
    this._finalGetsugaVoicePlaying = false;
    this._finalGetsugaVoiceEndTime = 0;
    this._getsugaVoicePlaying = false;
    this._getsugaVoiceEndTime = 0;
  }

  _isGetsugaVoicelinePlaying() {
    if (this.isDead || this.hp <= 0) {
      this._stopFinalGetsugaVoiceline();
      return false;
    }
    if (!this._getsugaVoicePlaying) return false;
    const now = Date.now();

    // 1. If hard duration timestamp has elapsed, voiceline is finished
    if (this._getsugaVoiceEndTime && now >= this._getsugaVoiceEndTime) {
      this._getsugaVoicePlaying = false;
      this._getsugaVoiceHandle = null;
      return false;
    }

    // 2. If sound handle is explicitly ended or stopped
    const handle = this._getsugaVoiceHandle || this._activeVoicelineHandle;
    if (handle) {
      if (typeof handle.isPlaying === 'function' && !handle.isPlaying()) {
        this._getsugaVoicePlaying = false;
        this._getsugaVoiceHandle = null;
        return false;
      }
      if (handle.ended === true || handle.paused === true) {
        this._getsugaVoicePlaying = false;
        this._getsugaVoiceHandle = null;
        return false;
      }
      return true;
    }

    // 3. Fallback check on end time
    if (this._getsugaVoiceEndTime && now < this._getsugaVoiceEndTime) {
      return true;
    }

    this._getsugaVoicePlaying = false;
    this._getsugaVoiceHandle = null;
    return false;
  }

  _isFinalGetsugaVoicelinePlaying() {
    if (this.isDead || this.hp <= 0) {
      this._stopFinalGetsugaVoiceline();
      return false;
    }
    if (!this._finalGetsugaVoicePlaying) return false;
    const now = Date.now();

    // 1. If hard duration timestamp has elapsed, voiceline is finished
    if (this._finalGetsugaVoiceEndTime && now >= this._finalGetsugaVoiceEndTime) {
      this._finalGetsugaVoicePlaying = false;
      this._finalGetsugaVoiceHandle = null;
      return false;
    }

    // 2. If sound handle is explicitly ended or stopped
    const handle = this._finalGetsugaVoiceHandle || this._activeVoicelineHandle;
    if (handle) {
      if (typeof handle.isPlaying === 'function' && !handle.isPlaying()) {
        this._finalGetsugaVoicePlaying = false;
        this._finalGetsugaVoiceHandle = null;
        return false;
      }
      if (handle.ended === true || handle.paused === true) {
        this._finalGetsugaVoicePlaying = false;
        this._finalGetsugaVoiceHandle = null;
        return false;
      }
      return true;
    }

    // 3. If handle is no longer present and no active voiceline on fighter
    if (!this._activeVoicelineHandle && !this._finalGetsugaVoiceHandle) {
      if (!this._finalGetsugaVoiceEndTime || now >= this._finalGetsugaVoiceEndTime) {
        this._finalGetsugaVoicePlaying = false;
        return false;
      }
    }

    return Boolean(this._finalGetsugaVoiceEndTime && now < this._finalGetsugaVoiceEndTime);
  }

  fireFinalMassiveGetsuga(target = null) {
    if (this.isDead || this.hp <= 0 || this.isTargetOfAmbush || this.isParalyzedOrBeamTrapped()) {
      this._stopFinalGetsugaVoiceline();
      return;
    }
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing) {
      this._stopFinalGetsugaVoiceline();
      return;
    }

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;

    if (target && target.hp > 0 && !target.isDead) {
      this.getsugaTarget = target;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.gunAngle = Math.atan2(dy, dx);
      this.angle = this.gunAngle;
    } else {
      this.getsugaTarget = this._getClosestEnemy();
      if (this.getsugaTarget) {
        const dx = this.getsugaTarget.x - this.x;
        const dy = this.getsugaTarget.y - this.y;
        this.gunAngle = Math.atan2(dy, dx);
        this.angle = this.gunAngle;
      }
    }

    const isMask = Boolean(this.hollowMaskActive || this.skin === 'bankai_mask' || this.skin === 'shikai_mask');
    let chargeFrames = CONFIG.ichigo?.bankaiFinalGetsugaChargeFrames || 80;
    let voiceSrc;
    let voiceVol;
    let voiceDurMs = 2600;
    let chargeText = "GETSUGA...";
    let chargeColor = "#DC143C";

    if (isMask) {
      chargeText = "BLACK KUROI GETSUGA...";
      chargeColor = CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00';
      const rawHollowVoice = CONFIG.ichigo?.sounds?.hollowGetsugaVoice || [
        'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3',
        'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline2.mp3'
      ];
      if (Array.isArray(rawHollowVoice)) {
        voiceSrc = rawHollowVoice[Math.floor(Math.random() * rawHollowVoice.length)];
      } else {
        voiceSrc = rawHollowVoice;
      }
      voiceVol = CONFIG.ichigo?.soundVolumes?.hollowGetsugaVoice ?? 3.0;
      const isShortVoiceline = typeof voiceSrc === 'string' && (voiceSrc.includes('voiceline2') || voiceSrc.includes('flashstep-voiceline2'));
      chargeFrames = isShortVoiceline 
        ? (CONFIG.ichigo?.hollowGetsugaVoice2ChargeFrames ?? 34) 
        : (CONFIG.ichigo?.hollowGetsugaVoice1ChargeFrames ?? 80);
      voiceDurMs = isShortVoiceline ? 760 : 2015;
    } else {
      voiceSrc = CONFIG.ichigo?.sounds?.finalGetsugaVoice || CONFIG.ichigo?.sounds?.finalGetsugaCharge || 'Assets/Sound Effects/Skills/ichigo-getsugatensho-voiceline.mp3';
      voiceVol = CONFIG.ichigo?.soundVolumes?.finalGetsugaVoice ?? CONFIG.ichigo?.soundVolumes?.finalGetsugaCharge ?? 3.0;
    }

    this.isChannelingGetsuga = true;
    this.isFinalMassiveGetsuga = true;
    this.isFinalGetsugaRecovery = false;
    this._finalGetsugaVoicePlaying = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = 0;

    const now = Date.now();
    this._finalGetsugaVoiceEndTime = now + voiceDurMs;

    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, chargeColor);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
      this._finalGetsugaVoiceHandle = audioSystem.playFighterVoiceline(this, voiceSrc, voiceVol, 1.0, 0, 0, {
        priority: 'domain',
        isProtected: true,
        durationMs: voiceDurMs
      });
    } else {
      this._finalGetsugaVoiceHandle = this._playSound(isMask ? 'hollowGetsugaVoice' : 'finalGetsugaVoice', voiceSrc, voiceVol);
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(isMask ? 5.5 : 4.5, 22);
    }
  }

  fireGetsuga(target = null, isCombo = false) {
    if (this.isDead || this.hp <= 0 || this.isTargetOfAmbush || this.isParalyzedOrBeamTrapped()) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this._isFinalGetsugaVoicelinePlaying()) return;
    if (this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;

    if (target && target.hp > 0 && !target.isDead) {
      this.getsugaTarget = target;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.gunAngle = Math.atan2(dy, dx);
      this.angle = this.gunAngle;
    } else {
      this.getsugaTarget = this._getClosestEnemy();
      if (this.getsugaTarget) {
        const dx = this.getsugaTarget.x - this.x;
        const dy = this.getsugaTarget.y - this.y;
        this.gunAngle = Math.atan2(dy, dx);
        this.angle = this.gunAngle;
      }
    }

    const isBankai = this.bankaiActive || this.skin === 'bankai' || this.skin === 'bankai_mask';
    const isMask = Boolean(this.hollowMaskActive || this.skin === 'bankai_mask' || this.skin === 'shikai_mask');

    const voiceChance = isMask 
      ? (CONFIG.ichigo?.soundChances?.hollowGetsugaVoice ?? 0.50)
      : (CONFIG.ichigo?.soundChances?.comboGetsugaVoice ?? 0.50);
    const shouldPlayVoiceline = Math.random() < voiceChance;

    let voiceSrc = null;
    let chargeFrames = 24;
    let durationMs = 400;

    if (isMask) {
      if (shouldPlayVoiceline) {
        const rawHollowVoice = CONFIG.ichigo?.sounds?.hollowGetsugaVoice || [
          'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3',
          'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline2.mp3'
        ];
        if (Array.isArray(rawHollowVoice)) {
          voiceSrc = rawHollowVoice[Math.floor(Math.random() * rawHollowVoice.length)];
        } else {
          voiceSrc = rawHollowVoice;
        }
        const isShortVoiceline = typeof voiceSrc === 'string' && (voiceSrc.includes('voiceline2') || voiceSrc.includes('flashstep-voiceline2'));
        
        // Exact timing synchronization with audio shout peak:
        // Voice 1: "...TENSHO!" peaks & finishes at ~1.33s = 80 frames
        // Voice 2: "TENSHO!" peaks & finishes at ~0.57s = 34 frames
        chargeFrames = isShortVoiceline 
          ? (CONFIG.ichigo?.hollowGetsugaVoice2ChargeFrames ?? 34) 
          : (CONFIG.ichigo?.hollowGetsugaVoice1ChargeFrames ?? 80);
        durationMs = isShortVoiceline ? 760 : 2015;
      } else {
        // Fallback when voiceline does not trigger (SFX only):
        // Respects hollowGetsugaChargeMultiplier (e.g. 0.0 = instant release, 0.5 = 50% faster)
        const defaultShikaiCharge = CONFIG.ichigo?.getsugaChargeFrames || 64;
        const hollowMult = (CONFIG.ichigo?.hollowGetsugaChargeMultiplier !== undefined)
          ? CONFIG.ichigo.hollowGetsugaChargeMultiplier
          : 0.50;
        const calcCharge = Math.round(defaultShikaiCharge * hollowMult);
        chargeFrames = isBankai 
          ? (hollowMult === 0 ? 1 : (CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30)) 
          : Math.max(1, calcCharge);
      }
    } else if (shouldPlayVoiceline) {
      const rawVoice = CONFIG.ichigo?.sounds?.comboGetsugaVoice || [
        'Assets/Sound Effects/Skills/Ichigo-getsugatensho-flashstep-voiceline.mp3',
        'Assets/Sound Effects/Skills/ichigo-getsugatensho-flashstep-voiceline2.mp3'
      ];
      if (Array.isArray(rawVoice)) {
        voiceSrc = rawVoice[Math.floor(Math.random() * rawVoice.length)];
      } else {
        voiceSrc = rawVoice;
      }

      const isShortVoiceline = typeof voiceSrc === 'string' && voiceSrc.includes('voiceline2');
      chargeFrames = isShortVoiceline 
        ? (isBankai ? (CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30) : 30)
        : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30) : (CONFIG.ichigo?.getsugaChargeFrames || 64));
      durationMs = isShortVoiceline ? 500 : 1100;
    } else {
      const defaultShikaiCharge = CONFIG.ichigo?.getsugaChargeFrames || 64;
      chargeFrames = isBankai 
        ? (CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30) 
        : defaultShikaiCharge;
    }

    const slideFrames = isCombo ? 0 : (CONFIG.ichigo?.getsugaSlideFrames || 8);

    this.isChannelingGetsuga = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = slideFrames;

    const chargeText = (isBankai && isMask) ? 'BLACK KUROI GETSUGA...' : (isMask ? 'HOLLOW GETSUGA...' : (isBankai ? 'KUROI GETSUGA...' : 'GETSUGA...'));
    const chargeColor = (isBankai && isMask) 
      ? (CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00') 
      : (isMask 
        ? (CONFIG.ichigo?.hollowGetsugaColor || '#00E5FF') 
        : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaColor || '#DC143C') : (CONFIG.ichigo?.getsugaColor || '#00D5FF')));

    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, chargeColor);

    if (shouldPlayVoiceline && voiceSrc) {
      const voiceVol = isMask 
        ? (CONFIG.ichigo?.soundVolumes?.hollowGetsugaVoice ?? 3.0) 
        : (CONFIG.ichigo?.soundVolumes?.comboGetsugaVoice ?? 2.8);
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
        this._getsugaVoiceHandle = audioSystem.playFighterVoiceline(this, voiceSrc, voiceVol, 1.0, 0, 0, {
          priority: 'protected',
          isProtected: true,
          durationMs: durationMs
        });
        this._getsugaVoicePlaying = true;
        this._getsugaVoiceEndTime = Date.now() + durationMs;
      } else {
        this._playSound(isMask ? 'hollowGetsugaVoice' : 'comboGetsugaVoice', voiceSrc, voiceVol);
      }
    } else {
      const sfx = CONFIG.ichigo?.sounds?.getsugaCharge || 'Assets/Sound Effects/Skills/redcharging.mp3';
      const vol = CONFIG.ichigo?.soundVolumes?.getsugaCharge ?? 0.85;
      this._playSound('getsugaCharge', sfx, vol);
    }
  }

  _releaseGetsuga() {
    this.isChannelingGetsuga = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;

    const isFinal = Boolean(this.isFinalMassiveGetsuga);
    this.isFinalMassiveGetsuga = false;

    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;

    let form = 'shikai';
    let text = '...TENSHO!';
    let textColor = CONFIG.ichigo?.getsugaColor || '#00D5FF';
    let shakeAmt = CONFIG.ichigo?.getsugaScreenShake || 3.5;

    if (isFinal) {
      form = 'final_bankai';
      text = '...TENSHO!';
      textColor = CONFIG.ichigo?.bankaiFinalGetsugaColor || '#DC143C';
      shakeAmt = CONFIG.ichigo?.bankaiFinalGetsugaScreenShake || 8.5;
    } else if (isBankai && isMask) {
      form = 'bankai_hollow';
      text = '...BLACK KUROI GETSUGA!';
      textColor = CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00';
      shakeAmt = CONFIG.ichigo?.bankaiHollowGetsugaScreenShake || 5.5;
    } else if (isMask) {
      form = 'hollow';
      text = '...HOLLOW GETSUGA!';
      textColor = CONFIG.ichigo?.hollowGetsugaColor || '#00E5FF';
      shakeAmt = CONFIG.ichigo?.hollowGetsugaScreenShake || 5.0;
    } else if (isBankai) {
      form = 'bankai';
      text = '...KUROI GETSUGA!';
      textColor = CONFIG.ichigo?.bankaiGetsugaColor || '#DC143C';
      shakeAmt = CONFIG.ichigo?.bankaiGetsugaScreenShake || 4.5;
    }

    const baseDmg = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaTickDamage || 26) * (isMask ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5) : 1.0)
      : (isBankai && isMask
        ? (CONFIG.ichigo?.bankaiHollowGetsugaDamage || Math.round((CONFIG.ichigo?.bankaiGetsugaDamage || 100) * (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)))
        : (isMask
          ? (CONFIG.ichigo?.hollowGetsugaDamage || 100)
          : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDamage || 100) : (CONFIG.ichigo?.getsugaDamage || 32))));
    const baseSpeed = CONFIG.ichigo?.getsugaTravelSpeed ?? CONFIG.ichigo?.getsugaSpeed ?? 11;
    const speed = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaSpeed ?? 24)
      : (isMask ? (CONFIG.ichigo?.hollowGetsugaSpeed ?? 10) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSpeed ?? 22) : baseSpeed));
    const ownerIndex = state.fighters.indexOf(this);

    const target = (this.getsugaTarget && this.getsugaTarget.hp > 0 && !this.getsugaTarget.isDead)
      ? this.getsugaTarget
      : this._getClosestEnemy();

    if (target && target.hp > 0 && !target.isDead) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.gunAngle = Math.atan2(dy, dx);
      this.angle = this.gunAngle;
    }

    if (projectileSystem && typeof projectileSystem.fireGetsugaTensho === 'function') {
      projectileSystem.fireGetsugaTensho(this, ownerIndex, baseDmg, speed, form);
    }

    this.isGetsugaSlash = true;
    const slashDur = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaSlashDuration || 30)
      : (CONFIG.ichigo?.getsugaSlashDuration || 24);
    this.slashSwingTimer = slashDur;
    this.slashSwingMaxTimer = slashDur;
    let cdMult = 1.0;
    if (isBankai) {
      cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiGetsugaCooldownMultiplier ?? 0.50);
    }
    if (isMask) {
      cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowGetsugaCooldownMultiplier ?? 0.25);
    }
    this.getsugaCooldown = Math.round((CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.getsugaCooldown || 450) * cdMult);

    // Set post-release breather / recovery frames before resuming movement or new attacks
    const recoveryFrames = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaRecoveryFrames || 48)
      : (isBankai 
        ? (CONFIG.ichigo?.bankaiGetsugaRecoveryFrames ?? 20)
        : (CONFIG.ichigo?.getsugaRecoveryFrames ?? 24));
    this.getsugaRecoveryTimer = recoveryFrames;
    this.isFinalGetsugaRecovery = isFinal;

    // Small kinetic recoil kick
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    const recoil = CONFIG.ichigo?.getsugaRecoil || 3.5;
    this.vx = -Math.cos(aimAngle) * recoil;
    this.vy = -Math.sin(aimAngle) * recoil;

    spawnFloatingText(this.x, this.y - this.r - 28, text, textColor);
    this._playSound('getsugaReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    this._playSound('getsugaReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(shakeAmt, 14);
    }

    this.getsugaTarget = null;
  }

  /** Clamps coordinates strictly inside the arena bounds to prevent flash stepping outside arena walls */
  _clampToArena(x, y, r = this.r) {
    const arenaObj = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (!arenaObj) return { x, y };

    const margin = r + 6;

    // Handle circular arena if present
    if (arenaObj.radius) {
      const dx = x - (arenaObj.x || 0);
      const dy = y - (arenaObj.y || 0);
      const dist = Math.hypot(dx, dy);
      const maxDist = arenaObj.radius - margin;
      if (dist > maxDist && dist > 0) {
        return {
          x: (arenaObj.x || 0) + (dx / dist) * maxDist,
          y: (arenaObj.y || 0) + (dy / dist) * maxDist
        };
      }
      return { x, y };
    }

    // Standard rectangular arena (x, y, width, height)
    const minX = (arenaObj.x || 0) + margin;
    const maxX = (arenaObj.x || 0) + (arenaObj.width || 800) - margin;
    const minY = (arenaObj.y || 0) + margin;
    const maxY = (arenaObj.y || 0) + (arenaObj.height || 600) - margin;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  performShunpoStrike(target) {
    this.performShunpoGetsugaCombo(target);
  }

  performShunpoGetsugaCombo(target) {
    if (this.isDead || this.hp <= 0 || this.isTargetOfAmbush || this.isParalyzedOrBeamTrapped() || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive || this._isFinalGetsugaVoicelinePlaying()) return;
    if (this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;
    if (!target || target.hp <= 0) return;
    const baseAngle = Math.atan2(this.y - target.y, this.x - target.x);
    
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let maxStrikes = isBankai 
      ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
      : (CONFIG.ichigo?.shunpoStrikes || 2);
    if (isMask) {
      const maskStrikeMult = CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2;
      maxStrikes = Math.round(maxStrikes * maskStrikeMult);
    }
    let cdMult = 1.0;
    if (isBankai) {
      cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? 0.50);
    }
    if (isMask) {
      cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowShunpoCooldownMultiplier ?? 0.25);
    }

    const cd = Math.round((CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.shunpoCooldown || 450) * cdMult);
    this.shunpoCooldown = cd;
    this.getsugaCooldown = cd;

    this.shunpoTarget = target;
    this.shunpoComboActive = true;
    this.shunpoComboStep = 1;
    this.shunpoMaxSteps = maxStrikes;
    this.isShunpoDisengaging = false;
    this.shunpoDisengageDelayTimer = 0;
    this._shunpoBaseAngle = baseAngle;

    const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

    // Flash step 1: Target flank angle 1 (+110° / +1.92 rad offset)
    const angle1 = baseAngle + 1.92;
    const startClamped = this._clampToArena(this.x, this.y);
    this.shunpoStartX = startClamped.x;
    this.shunpoStartY = startClamped.y;
    const rawTx = target.x + Math.cos(angle1) * offset;
    const rawTy = target.y + Math.sin(angle1) * offset;
    const targetClamped = this._clampToArena(rawTx, rawTy);

    this.shunpoTargetX = targetClamped.x;
    this.shunpoTargetY = targetClamped.y;

    this.isShunpoDashing = true;
    this.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

    // Immediately seed the start position afterimage
    pushTrailCap(this.afterImages, {
      x: startClamped.x,
      y: startClamped.y,
      r: this.r,
      angle: this.angle,
      color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
      strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
      isBankai: (isBankai || isMask),
      timer: 16,
      maxTimer: 16
    }, 32);

    spawnFloatingText(this.x, this.y - this.r - 20, isBankai ? 'TENSA SHUNPO!' : 'SHUNPO!', isBankai ? '#DC143C' : '#FFFFFF');
    this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);

    if (isMask) {
      const noiseChance = CONFIG.ichigo?.soundChances?.hollowFlurryNoise ?? 0.50;
      if (Math.random() < noiseChance) {
        const hollowNoise = CONFIG.ichigo?.sounds?.hollowFlurryNoise || 'Assets/Sound Effects/Attacks/ichigo-attack-hollow-noise.mp3';
        const hollowVol = CONFIG.ichigo?.soundVolumes?.hollowFlurryNoise ?? 2.8;
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
          audioSystem.playFighterVoiceline(this, hollowNoise, hollowVol, 1.0, 0, 0, {
            priority: 'protected',
            isProtected: true,
            durationMs: 1400
          });
        } else {
          this._playSound('hollowFlurryNoise', hollowNoise, hollowVol);
        }
      }
    }
  }

  performMeleeCleave(target) {
    if (this.isDead || this.hp <= 0 || this.isParalyzedOrBeamTrapped() || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive || this._isFinalGetsugaVoicelinePlaying()) return;
    if (this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let damageMult = 1.0;
    if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
    if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
    const baseDamage = CONFIG.ichigo?.swordDamage || 16;
    const finalDamage = baseDamage * damageMult;

    let baseCooldown = CONFIG.ichigo?.swordCooldown || 30;
    if (isMask) {
      const maskCdMult = CONFIG.ichigo?.hollowSwordCooldownMultiplier || 0.65;
      baseCooldown = Math.round(baseCooldown * maskCdMult);
    }
    this.swordCooldown = baseCooldown;
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;

    this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

    // Rule #7: Frontal Arc Radius AOE for Melee Weapon Users
    const arc = ((CONFIG.ichigo?.swordArc || 140) * Math.PI) / 180;
    const reach = CONFIG.ichigo?.swordRange || 70;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);

    // Check all valid targets (fighters & illusions)
    const candidates = [];
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
            candidates.push(f);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
            candidates.push(ill);
          }
        }
      });
    }

    candidates.forEach((enemy) => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.r) {
        // Calculate angle relative to aim direction
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - this.gunAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          // Rule #5: ALWAYS apply hit-pause/time-stop exclusively to the target, NEVER to the attacker
          if (typeof enemy.applyTimeStop === 'function') {
            enemy.applyTimeStop(CONFIG.ichigo?.swordFreezeDuration || 8);
          }

          // Deal damage and knockback
          applyDamageToTarget(enemy, finalDamage, this, { isMelee: true });

          // Hollow Mask Lifesteal (High-Speed Regeneration)
          if (isMask && finalDamage > 0) {
            const healPercent = CONFIG.ichigo?.hollowLifesteal ?? 0.10;
            const healAmount = Math.round(finalDamage * healPercent);
            if (healAmount > 0 && this.hp < this.maxHp) {
              this.hp = Math.min(this.maxHp, this.hp + healAmount);
              this._lastHealAmount = healAmount;
              this._healthBarHealTimer = 16;
              spawnFloatingText(this.x + (Math.random() - 0.5) * 16, this.y - this.r - 12, `+${healAmount}`, "#00FF66");
            }
          }
          
          const kbForce = CONFIG.ichigo?.knockback || 6;
          enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);
          
          spawnImpactFlash(enemy.x, enemy.y, isMask ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(enemy.x, enemy.y, CONFIG.ichigo?.swordShockwaveSize || 35, isMask ? 'sukuna' : 'gojo');

          if (typeof triggerGlobalScreenShake === 'function') {
            const shakeIntensity = isMask
              ? (CONFIG.ichigo?.hollowSwordHitScreenShake ?? 4.5)
              : (isBankai ? (CONFIG.ichigo?.bankaiSwordHitScreenShake ?? 4.0) : (CONFIG.ichigo?.swordHitScreenShake ?? 3.0));
            const shakeDuration = CONFIG.ichigo?.swordHitShakeDuration ?? 6;
            triggerGlobalScreenShake(shakeIntensity, shakeDuration);
          }
        }
      }
    });
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      return;
    }

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
    const isChannelingHollow = this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this._hollowVoicelineWait;
    const isFrozen = this._handleTimeStop() || 
      this.isParalyzedOrBeamTrapped();

    if (isFrozen && !isChannelingHollow) {
      this._stopFinalGetsugaVoiceline();
      this.interruptAttacks(true);
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // Hollow Mask Passive Activation (Activates under 70% HP in both Shikai and Bankai, holding if Grand Finisher is pending/channeling, in ambush, or paralyzed / caught in Gojo Purple or Yuta Beam)
    const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
    const isBusyWithFinalGetsuga = (this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isGetsugaSlash && this.isFinalGetsugaRecovery);
    const isPendingFinalGetsuga = this.bankaiActive && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer > 0 && this.bankaiTimer <= finalThreshold;
    if (!this.hollowMaskUsed && !this.isTargetOfAmbush && !isBusyWithFinalGetsuga && !isPendingFinalGetsuga && !this.isChannelingBankai && !this.isParalyzedOrBeamTrapped() && this.hp / this.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold ?? 0.70)) {
      this.activateHollowMask();
    }

    // Hollow Mask Formation & Sky Burst Immobility Lock (Freezes movement and actions until transformation visual and voiceline are completely finished)
    if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = 0; // Strictly face towards player/viewer during Hollow Channeling
      this.angle = 0;

      if (this.hollowMaskFormationTimer > 0) {
        this.hollowMaskFormationTimer--;

        // Continuous arena screen shake building up as Hollow Mask formation progresses
        if (typeof triggerGlobalScreenShake === 'function') {
          const maxF = this.hollowMaskFormationMax || 325;
          const prog = 1.0 - (this.hollowMaskFormationTimer / maxF);
          const shakeIntensity = 1.2 + prog * 2.8;
          if (this.hollowMaskFormationTimer % 4 === 0) {
            triggerGlobalScreenShake(shakeIntensity, 6);
          }
        }

        // Check if voiceline audio is still actively playing
        const isVoicelinePlaying = Boolean(
          this._activeVoicelineHandle &&
          (
            (typeof this._activeVoicelineHandle.isPlaying === 'function' && this._activeVoicelineHandle.isPlaying()) ||
            (this._activeVoicelineEndTime && Date.now() < this._activeVoicelineEndTime)
          )
        );

        if (this.hollowMaskFormationTimer <= 0) {
          if (isVoicelinePlaying) {
            this.hollowMaskFormationTimer = 0;
            this._hollowVoicelineWait = true;
          } else {
            this._hollowVoicelineWait = false;
            this.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 36;
            this.hollowBurstMax = this.hollowBurstTimer;
            const isBankai = this.bankaiActive || this.skin === 'bankai';
            this._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.95);
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(isBankai ? 5.5 : 4.5, 20);
            }
          }
        }
      } else if (this._hollowVoicelineWait) {
        const isVoicelinePlaying = Boolean(
          this._activeVoicelineHandle &&
          (
            (typeof this._activeVoicelineHandle.isPlaying === 'function' && this._activeVoicelineHandle.isPlaying()) ||
            (this._activeVoicelineEndTime && Date.now() < this._activeVoicelineEndTime)
          )
        );
        if (!isVoicelinePlaying) {
          this._hollowVoicelineWait = false;
          this.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 36;
          this.hollowBurstMax = this.hollowBurstTimer;
          const isBankai = this.bankaiActive || this.skin === 'bankai';
          this._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.95);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isBankai ? 5.5 : 4.5, 20);
          }
        }
      } else if (this.hollowBurstTimer > 0) {
        this.hollowBurstTimer--;
      }

      // Micro-spark emission during mask formation (Ghost White spectral theme)
      if (Math.random() < 0.40) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 1.6, this.y - this.r * 0.3 + (Math.random() - 0.5) * this.r * 1.6, 2, Math.random() < 0.5 ? '#F8F8FF' : '#D8E4F8');
      }

      // Lock fighter from moving / taking action / triggering skills until the transformation visual and voiceline are completely finished
      return;
    }

    // Bankai Transformation Channeling (Complete Physical Immobility & Pushback/Knockback Immunity)
    if (this.isChannelingBankai) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.bankaiSlideTimer = 0;

      // Sparking crimson/black spiritual pressure motes
      if (Math.random() < 0.7) {
        spawnSparks(this.x, this.y, 2, Math.random() < 0.5 ? '#FF0000' : '#111111');
      }

      const enemy = this._getClosestEnemy();
      if (enemy && enemy.hp > 0 && !enemy.isDead) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        this.gunAngle = Math.atan2(dy, dx);
        this.angle = this.gunAngle;
      }

      this.bankaiChargeTimer--;
      if (this.bankaiChargeTimer <= 0) {
        this._releaseBankai();
      }
      return;
    }

    // Getsuga Tensho Channeling & Slide Physics
    if (this.isChannelingGetsuga) {
      // If caught in a beam (Yuta's Pure Love Beam, etc.), cancel Getsuga channeling immediately so the beam can drag Ichigo
      if (this.isCaughtInBeam()) {
        this.isChannelingGetsuga = false;
        this.getsugaChargeTimer = 0;
        this.getsugaSlideTimer = 0;
        this.isFinalMassiveGetsuga = false;
        // Let update continue to super.update for beam drag physics
      } else {
        if (this.getsugaSlideTimer > 0) {
          this.getsugaSlideTimer--;
          const damping = CONFIG.ichigo?.getsugaSlideDamping || 0.72;
          this.vx *= damping;
          this.vy *= damping;
          this.x += this.vx;
          this.y += this.vy;
          if (Math.random() < 0.6) {
            spawnSparks(this.x, this.y + this.r * 0.7, 2, '#FFFFFF');
          }
        } else {
          this.vx = 0;
          this.vy = 0;
        }

        // Continuously rotate to track and face the enemy while lifting sword overhead
        const target = (this.getsugaTarget && this.getsugaTarget.hp > 0 && !this.getsugaTarget.isDead)
          ? this.getsugaTarget
          : this._getClosestEnemy();

        if (target && target.hp > 0 && !target.isDead) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const directAngle = Math.atan2(dy, dx);

          // Smooth responsive rotation tracking toward target (bypassing slow stealth lag)
          const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
          let diff = directAngle - currentAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          this.gunAngle = currentAngle + diff * 0.35;
          this.angle = this.gunAngle;
        }

        this.getsugaChargeTimer--;
        if (this.getsugaChargeTimer <= 0) {
          this._releaseGetsuga();
        }
        return;
      }
    }

    // Bankai 3D Ribbon Lifecycle: immediately active on release and slowly decays (paused while paralyzed)
    if (this.bankaiRibbonTimer > 0 && !this.isParalyzedDebuffActive()) {
      this.bankaiRibbonTimer--;
    }

    // Bankai Post-Release Burst & Crystalline Shards / Cloth Streamers Update (Complete Immobility & Skill Lock during Burst)
    if (this.bankaiBurstTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.bankaiSlideTimer = 0;

      this.bankaiBurstTimer--;
      if (this.bankaiShards && this.bankaiShards.length > 0) {
        fastCleanArray(this.bankaiShards, (shard) => {
          shard.x += shard.vx;
          shard.y += shard.vy;
          shard.vx *= 0.93;
          shard.vy *= 0.93;
          shard.rot += shard.rotSpeed;
          shard.life = this.bankaiBurstTimer / this.bankaiBurstMax;
          return this.bankaiBurstTimer > 0;
        });
      }
      if (this.bankaiClothStreamers && this.bankaiClothStreamers.length > 0) {
        fastCleanArray(this.bankaiClothStreamers, (st) => {
          st.x += st.vx;
          st.y += st.vy;
          st.vx *= 0.92;
          st.vy *= 0.92;
          st.angle += 0.05;
          st.life = this.bankaiBurstTimer / this.bankaiBurstMax;
          return this.bankaiBurstTimer > 0;
        });
      }
      if (Math.random() < 0.50) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 2, this.y + (Math.random() - 0.5) * this.r * 2, 2, Math.random() < 0.5 ? '#FF1E00' : '#00E5FF');
      }

      // Lock fighter from moving / taking action / triggering skills until burst animation fully finishes
      return;
    }

    // Shikai reversion burst animation timer decay & action lock breather
    if (this.shikaiReversionBurstTimer > 0) {
      this.slashSwingTimer = 0;
      this.slashSwingMaxTimer = 0;
      this.isGetsugaSlash = false;
      this.isFinalMassiveGetsuga = false;
      this.isFinalGetsugaRecovery = false;
      this.isChannelingGetsuga = false;
      this.getsugaChargeTimer = 0;
      this.getsugaSlideTimer = 0;
      this.getsugaRecoveryTimer = 0;
      this.isShunpoDashing = false;
      this.shunpoComboActive = false;
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
      this.shikaiReversionBurstTimer--;
      // Lock fighter from moving / taking action / triggering skills until Shikai reversion breather fully finishes
      return;
    }

    // Slash swing animation timer
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      if (this.slashSwingTimer <= 0) {
        this.isGetsugaSlash = false;
      }
    }

    const isMatchEnded = Boolean(typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || state.gameState === 'champion'));

    // Hollow Mask expiration (frozen during victory/champion screens and paused while paralyzed)
    if (this.hollowMaskActive && !isMatchEnded) {
      if (!this.isParalyzedDebuffActive()) {
        this.hollowMaskTimer--;
      }

      // Micro-spark emission during the final cracking phase
      if (this.hollowMaskTimer < 60 && Math.random() < 0.28) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r, this.y - this.r * 0.3 + (Math.random() - 0.5) * this.r, 1, Math.random() < 0.5 ? '#DC143C' : '#FFFFFF');
      }

      if (this.hollowMaskTimer <= 0) {
        this.hollowMaskActive = false;
        spawnHollowMaskShatter(this);
        spawnFloatingText(this.x, this.y - this.r - 28, "MASK SHATTERED!", "#FFFFFF");
        spawnSparks(this.x, this.y, 14, '#DC143C');
        spawnSparks(this.x, this.y, 8, '#111111');
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(3.5, 16);
        }
        // Trigger Shikai sonic-blast sky effect upon reverting to Shikai
        if (!this.bankaiActive) {
          this.shikaiReversionBurstTimer = CONFIG.ichigo?.shikaiReversionRecoveryFrames || CONFIG.ichigo?.shikaiReversionBurstFrames || 36;
          this.shikaiReversionBurstMax = this.shikaiReversionBurstTimer;

          // Clear and hide all lingering attack effects, timers, slashes, afterimages, and charging aura upon reverting to Shikai
          this.slashSwingTimer = 0;
          this.slashSwingMaxTimer = 0;
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
        }
      }
    }

    // Bankai (Ultimate) Active Loop (frozen during victory/champion screens and paused while paralyzed)
    if (this.bankaiActive) {
      if (!isMatchEnded) {
        // If Hollow Mask formation or burst is running, pause Bankai timer decay so Bankai never expires during Hollow transformation!
        const isHollowTransforming = (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0);
        if (!isHollowTransforming && !this.isParalyzedDebuffActive()) {
          this.bankaiTimer--;
        }

        // Bankai Finale: Unleash Massive Final Kuroi Getsuga Tensho before Bankai ends
        const finalTriggerThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
        const isPlaying = typeof state === 'undefined' || state.gameState === 'playing';
        if (isPlaying && !this.isDemoFighter && !this._isFaceOff && !this.bankaiFinalGetsugaTriggered && this.bankaiTimer > 0 && this.bankaiTimer <= finalTriggerThreshold && !this.isChannelingBankai && !isHollowTransforming && !this.isParalyzedOrBeamTrapped()) {
          this.bankaiFinalGetsugaTriggered = true;
          this.interruptAttacks();
          const enemy = this._getClosestEnemy();
          if (enemy && enemy.hp > 0 && !enemy.isDead) {
            this.aim(enemy);
          }
          this.fireFinalMassiveGetsuga(enemy);
        }

        if (this.bankaiTimer <= 0) {
          // If still channeling the final grand finisher, recovering from it, playing the voiceline, in hollow formation, or awaiting the grand finisher, hold Bankai active!
          if ((this.isChannelingGetsuga && this.isFinalMassiveGetsuga) || (this.getsugaRecoveryTimer > 0 && this.isFinalGetsugaRecovery) || this._isFinalGetsugaVoicelinePlaying() || isHollowTransforming || !this.bankaiFinalGetsugaTriggered) {
            this.bankaiTimer = 1;
          } else {
            this.bankaiActive = false;
            this.bankaiUsed = true;
            this._stopFinalGetsugaVoiceline();
            this.bankaiRechargeHpBaseline = this.hp; // Snapshot HP baseline upon Bankai expiration
            this._maxBankaiPct = 0;
            this.ultimateCooldown = 0;
            this.shikaiReversionBurstTimer = CONFIG.ichigo?.shikaiReversionRecoveryFrames || CONFIG.ichigo?.shikaiReversionBurstFrames || 42;
            this.shikaiReversionBurstMax = this.shikaiReversionBurstTimer;

            // Clear and hide all lingering attack effects, timers, slashes, afterimages, and charging aura upon reverting to Shikai
            this.slashSwingTimer = 0;
            this.slashSwingMaxTimer = 0;
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
            this.bankaiShards = [];
            this.bankaiClothStreamers = [];

            spawnFloatingText(this.x, this.y - this.r - 28, "BANKAI ENDED", "#00D5FF");
            this._playSound('bankaiEnded', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(3.5, 14);
            }
          }
        }
      }

      // Bankai supersonic black-crimson speed afterimages with gap-free distance spacing
      if (this.bankaiActive && !isMatchEnded) {
        if (this._lastBankaiTrailX === undefined) {
          this._lastBankaiTrailX = this.x;
          this._lastBankaiTrailY = this.y;
        }
        const distMoved = Math.hypot(this.x - this._lastBankaiTrailX, this.y - this._lastBankaiTrailY);
        if (distMoved >= 14) {
          const steps = Math.min(4, Math.floor(distMoved / 14));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const subX = this._lastBankaiTrailX + (this.x - this._lastBankaiTrailX) * t;
            const subY = this._lastBankaiTrailY + (this.y - this._lastBankaiTrailY) * t;
            const aiClamped = this._clampToArena(subX, subY, this.r - 2);

            pushTrailCap(this.afterImages, {
              x: aiClamped.x,
              y: aiClamped.y,
              r: this.r,
              angle: this.angle,
              color: (Math.random() < 0.5) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(220, 20, 20, 0.55)',
              strokeColor: 'rgba(220, 20, 20, 0.90)',
              isBankai: true,
              timer: 16,
              maxTimer: 16
            }, 32);
          }
          this._lastBankaiTrailX = this.x;
          this._lastBankaiTrailY = this.y;
        }
      }
    }

    // Shunpo Dashing Physics & Flurry Combos (Gap-Free Interpolated Afterimages)
    if (this.isShunpoDashing) {
      // If caught in a beam mid-dash, cancel dash immediately so the beam can drag Ichigo
      if (this.isCaughtInBeam()) {
        this.isShunpoDashing = false;
        this.isShunpoDisengaging = false;
        this.shunpoComboActive = false;
        this.shunpoTarget = null;
        this.shunpoDashTimer = 0;
        // Fall through to super.update for beam drag physics
      } else {
      this.shunpoDashTimer--;
      
      const dashMax = this.isShunpoDisengaging 
        ? (CONFIG.ichigo?.comboDisengageDashFrames || 3) 
        : (CONFIG.ichigo?.shunpoDashDuration || 4);
      const prevP = 1 - ((this.shunpoDashTimer + 1) / Math.max(1, dashMax));
      const curP = 1 - (this.shunpoDashTimer / Math.max(1, dashMax));

      const prevX = this.shunpoStartX + (this.shunpoTargetX - this.shunpoStartX) * prevP;
      const prevY = this.shunpoStartY + (this.shunpoTargetY - this.shunpoStartY) * prevP;
      const curX = this.shunpoStartX + (this.shunpoTargetX - this.shunpoStartX) * curP;
      const curY = this.shunpoStartY + (this.shunpoTargetY - this.shunpoStartY) * curP;

      const clampedCur = this._clampToArena(curX, curY);
      this.x = clampedCur.x;
      this.y = clampedCur.y;
      this.vx = 0;
      this.vy = 0;

      // Spawn gap-free interpolated afterimages along the dash vector
      const isMask = this.hollowMaskActive;
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const stepDist = Math.hypot(curX - prevX, curY - prevY);
      const subSteps = Math.max(1, Math.ceil(stepDist / 14)); // Spaced every ~14px seamlessly!

      for (let s = 1; s <= subSteps; s++) {
        const t = s / subSteps;
        const subX = prevX + (curX - prevX) * t;
        const subY = prevY + (curY - prevY) * t;
        const aiClamped = this._clampToArena(subX, subY, this.r - 2);

        pushTrailCap(this.afterImages, {
          x: aiClamped.x,
          y: aiClamped.y,
          r: this.r,
          angle: this.angle,
          color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
          strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
          isBankai: (isBankai || isMask),
          timer: 16,
          maxTimer: 16
        }, 32);
      }

      if (this.shunpoDashTimer <= 0) {
        this.isShunpoDashing = false;
        const finalClamped = this._clampToArena(this.shunpoTargetX, this.shunpoTargetY);
        this.x = finalClamped.x;
        this.y = finalClamped.y;
        
        const target = this.shunpoTarget;

        if (this.isShunpoDisengaging) {
          // ── Disengage Flash Step Completed: Seamlessly unleash Getsuga Tensho ──
          this.isShunpoDisengaging = false;
          this.shunpoComboActive = false;
          if (target && target.hp > 0 && !target.isDead) {
            this.aim(target);
            this.fireGetsuga(target, true);
          } else {
            this.shunpoTarget = null;
          }
          return;
        }

        if (target && target.hp > 0 && !target.isDead) {
          // Rule #3: Always update aim(target) immediately after teleport
          this.aim(target);

          const isBankai = this.bankaiActive || this.skin === 'bankai';
          const isMask = this.hollowMaskActive;
          let damageMult = 1.0;
          if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
          if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
          const baseSlashDmg = CONFIG.ichigo?.shunpoStrike1Damage || 20;
          let defaultStrikes = isBankai 
            ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
            : (CONFIG.ichigo?.shunpoStrikes || 2);
          if (isBankai) {
            defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
          }
          if (isMask) {
            defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
          }
          const maxSteps = this.shunpoMaxSteps || defaultStrikes;

          if (this.shunpoComboStep < maxSteps) {
            // ── Intermediate Flurry Strike (Step k of N) ──
            const s1Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike1Duration || 10) : (CONFIG.ichigo?.shunpoStrike1SlashDuration || 14);
            this.slashSwingTimer = s1Duration;
            this.slashSwingMaxTimer = s1Duration;
            this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

            // Allow enemies (like Mahoraga) to react, rotate aim, and retaliate during the combo
            if (typeof target.applyHitStun === 'function') {
              target.applyHitStun(2);
            }

            // Deal intermediate strike damage
            applyDamageToTarget(target, baseSlashDmg * damageMult, this, { isSkill: true });
            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            this._playSound('shunpoStrikeHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.75);
            if (typeof triggerGlobalScreenShake === 'function') {
              const strikeShake = isBankai
                ? (CONFIG.ichigo?.bankaiShunpoStrike1ScreenShake ?? 3.5)
                : (CONFIG.ichigo?.shunpoStrike1ScreenShake ?? 2.5);
              const strikeDur = CONFIG.ichigo?.shunpoStrike1ShakeDuration ?? 6;
              triggerGlobalScreenShake(strikeShake, strikeDur);
            }

            // Set delay before triggering next Flash Step
            this.shunpoComboDelayTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiShunpoComboDelayFrames || 5) 
              : (CONFIG.ichigo?.shunpoComboDelayFrames || 8);
          } else {
            // ── Final Finisher Strike (Step N of N) ──
            const s2Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike2Duration || 14) : (CONFIG.ichigo?.shunpoStrike2SlashDuration || 16);
            this.slashSwingTimer = s2Duration;
            this.slashSwingMaxTimer = s2Duration;
            this._playSound('shunpoFinisherSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);

            // Deal final finisher damage & knockback
            const strike2Mult = CONFIG.ichigo?.shunpoStrike2Multiplier || 1.35;
            const finisherDmg = baseSlashDmg * strike2Mult * damageMult;
            applyDamageToTarget(target, finisherDmg, this, { isSkill: true });
            const finStun = isBankai ? (CONFIG.ichigo?.bankaiShunpoStunDuration || 8) : (CONFIG.ichigo?.shunpoStrike2StunDuration || 8);
            target.applyHitStun(finStun);

            const aimAngle = this.gunAngle || 0;
            const kbForce = CONFIG.ichigo?.shunpoStrike2Knockback || 7;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
            }

            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            spawnMeleeClashShockwave(target.x, target.y, CONFIG.ichigo?.shunpoShockwaveSize || 45, (isBankai || isMask) ? 'sukuna' : 'gojo');
            this._playSound('shunpoFinisherHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.90);
            if (typeof triggerGlobalScreenShake === 'function') {
              const finShake = isBankai
                ? (CONFIG.ichigo?.bankaiShunpoFinisherScreenShake ?? 5.5)
                : (isMask ? (CONFIG.ichigo?.hollowShunpoFinisherScreenShake ?? 5.0) : (CONFIG.ichigo?.shunpoScreenShake ?? 4.0));
              const finDur = CONFIG.ichigo?.shunpoFinisherShakeDuration ?? 10;
              triggerGlobalScreenShake(finShake, finDur);
            }

            // Immediately schedule the Disengage Back-Step Flash Step!
            this.shunpoDisengageDelayTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDelayFrames || 5) 
              : (CONFIG.ichigo?.comboDisengageDelayFrames || 7);
          }
        } else {
          this.shunpoComboActive = false;
          this.shunpoTarget = null;
        }
      }
      return;
    } // end beam-safe shunpo dash block
    }

    // Advance Shunpo Flurry Combo or Trigger Disengage Back-Step
    if (this.shunpoComboActive && this.shunpoTarget) {
      // If caught in a beam, cancel the entire Shunpo combo so beam drag works
      if (this.isCaughtInBeam()) {
        this.shunpoComboActive = false;
        this.shunpoTarget = null;
        this.shunpoComboDelayTimer = 0;
        this.shunpoDisengageDelayTimer = 0;
        // Fall through to super.update for beam drag physics
      } else {
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const isMask = this.hollowMaskActive;
      let defaultStrikes = isBankai 
        ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
        : (CONFIG.ichigo?.shunpoStrikes || 2);
      if (isBankai) {
        defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
      }
      if (isMask) {
        defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
      }
      const maxSteps = this.shunpoMaxSteps || defaultStrikes;
      
      // Check Disengage Back-Step trigger
      if (this.shunpoComboStep >= maxSteps && this.shunpoDisengageDelayTimer > 0) {
        this.shunpoDisengageDelayTimer--;
        if (this.shunpoDisengageDelayTimer <= 0) {
          const target = this.shunpoTarget;
          if (target && target.hp > 0 && !target.isDead) {
            const isBankai = this.bankaiActive || this.skin === 'bankai';
            const backAngle = Math.atan2(this.y - target.y, this.x - target.x);
            const disengageDist = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDistance || CONFIG.ichigo?.comboDisengageDistance || 350) 
              : (CONFIG.ichigo?.comboDisengageDistance || 290);

            const startClamped = this._clampToArena(this.x, this.y);
            this.shunpoStartX = startClamped.x;
            this.shunpoStartY = startClamped.y;
            const rawTx = target.x + Math.cos(backAngle) * disengageDist;
            const rawTy = target.y + Math.sin(backAngle) * disengageDist;
            const targetClamped = this._clampToArena(rawTx, rawTy);

            this.shunpoTargetX = targetClamped.x;
            this.shunpoTargetY = targetClamped.y;
            this.isShunpoDashing = true;
            this.isShunpoDisengaging = true;
            this.shunpoDashTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDashFrames || 3) 
              : (CONFIG.ichigo?.comboDisengageDashFrames || 3);

            // Immediately seed start position afterimage
            pushTrailCap(this.afterImages, {
              x: startClamped.x,
              y: startClamped.y,
              r: this.r,
              angle: this.angle,
              color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
              strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
              isBankai: (isBankai || isMask),
              timer: 16,
              maxTimer: 16
            }, 32);

            spawnFloatingText(this.x, this.y - this.r - 20, isBankai ? 'TENSA STEP!' : 'FLASH STEP!', isBankai ? '#DC143C' : '#00D5FF');
            this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.95);
            return;
          } else {
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        }
      } else if (this.shunpoComboStep < maxSteps && this.shunpoComboDelayTimer > 0) {
        this.shunpoComboDelayTimer--;
        if (this.shunpoComboDelayTimer <= 0) {
          const target = this.shunpoTarget;
          if (target && target.hp > 0 && !target.isDead) {
            this.shunpoComboStep++;
            const isBankai = this.bankaiActive || this.skin === 'bankai';
            
            // Multi-angle supersonic flash steps around target:
            // Sector offsets for 6-step blitz: [+110°, -110°, +160°, -40°, +40°, 180°]
            const angleOffsets = [0, 1.92, -1.92, 2.80, -0.70, 0.70, 3.14];
            const baseAngle = this._shunpoBaseAngle !== undefined ? this._shunpoBaseAngle : Math.atan2(this.y - target.y, this.x - target.x);
            const stepAng = baseAngle + (angleOffsets[this.shunpoComboStep] !== undefined ? angleOffsets[this.shunpoComboStep] : (this.shunpoComboStep * 1.8));
            const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

            const startClamped = this._clampToArena(this.x, this.y);
            this.shunpoStartX = startClamped.x;
            this.shunpoStartY = startClamped.y;
            const rawTx = target.x + Math.cos(stepAng) * offset;
            const rawTy = target.y + Math.sin(stepAng) * offset;
            const targetClamped = this._clampToArena(rawTx, rawTy);

            this.shunpoTargetX = targetClamped.x;
            this.shunpoTargetY = targetClamped.y;

            this.isShunpoDashing = true;
            this.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

            // Immediately seed start position afterimage
            pushTrailCap(this.afterImages, {
              x: startClamped.x,
              y: startClamped.y,
              r: this.r,
              angle: this.angle,
              color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
              strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
              isBankai: (isBankai || isMask),
              timer: 16,
              maxTimer: 16
            }, 32);

            const isFinalStep = this.shunpoComboStep === maxSteps;
            const labels = ['', 'FLANK SLASH!', 'CROSS STRIKE!', 'LIGHTNING FLASH!', 'SHADOW PIERCE!', 'TENSA BLITZ!', 'CROSS SLASH!'];
            const stepText = isFinalStep ? 'CROSS SLASH!' : (labels[this.shunpoComboStep] || 'FLASH STRIKE!');
            spawnFloatingText(this.x, this.y - this.r - 20, stepText, isBankai ? '#DC143C' : '#FFD700');
            this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', isBankai ? 0.95 : 0.9);
            return;
          } else {
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        }
      }
      } // end beam-safe shunpo combo block
    }

    // Post-Getsuga Breather Recovery Lock (Freezes actions, animates recoil slide, and prevents movement until recovery finishes)
    if (this.getsugaRecoveryTimer > 0) {
      if (this.isFinalGetsugaRecovery && this._isFinalGetsugaVoicelinePlaying()) {
        this.getsugaRecoveryTimer = Math.max(this.getsugaRecoveryTimer, 2);
      }

      this.getsugaRecoveryTimer--;
      if (this.getsugaRecoveryTimer <= 0) {
        this.isFinalGetsugaRecovery = false;
        this._finalGetsugaVoicePlaying = false;
        this._finalGetsugaVoiceHandle = null;
      }
      const damping = CONFIG.ichigo?.getsugaSlideDamping || 0.85;
      this.vx *= damping;
      this.vy *= damping;
      this.x += this.vx;
      this.y += this.vy;
      const clamped = this._clampToArena(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;

      if (Math.random() < 0.35) {
        spawnSparks(this.x, this.y + this.r * 0.7, 1, '#FFFFFF');
      }

      // Lock fighter from external movement, shooting, or triggering AI actions during recovery follow-through pose
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
    if (!this.playerControlled && !this.isParalyzedOrBeamTrapped() && !this.isChannelingGetsuga && this.getsugaRecoveryTimer <= 0 && !this._isGetsugaVoicelinePlaying() && !this._isFinalGetsugaVoicelinePlaying()) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // 1. Trigger Ultimate: Bankai Awakening (Based strictly on HP lost!)
        const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.90;
        const reqDamage = (this.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
        const baseline = this.bankaiRechargeHpBaseline !== undefined ? this.bankaiRechargeHpBaseline : this.hp;
        const damageTaken = Math.max(0, baseline - this.hp);

        const isFirstTrigger = (!this.bankaiUsed && (this.hp / this.maxHp <= ultThreshold));
        const isSubsequentTrigger = (this.bankaiUsed && (damageTaken >= reqDamage));

        const isBusy = this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this._isGetsugaVoicelinePlaying() || this._isFinalGetsugaVoicelinePlaying() || this.hollowMaskActive || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.shikaiReversionBurstTimer > 0 || this.isShunpoDashing || this.shunpoComboActive;
        const canBankai = !this.bankaiActive && !this.isChannelingBankai && !isBusy && (isFirstTrigger || isSubsequentTrigger);
        if (canBankai) {
          this.activateBankai();
        }

        // 2. Trigger Unified Skill Combo: Shunpo Getsuga Blitz (Flash Step Flurry -> Disengage Back-Step -> Getsuga Tensho)
        const isBankai = this.bankaiActive || this.skin === 'bankai';
        const comboMin = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMinDist ?? 0) : (CONFIG.ichigo?.comboTriggerMinDist ?? 0);
        const comboMax = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMaxDist || 400) : (CONFIG.ichigo?.comboTriggerMaxDist || 400);
        if (this.shunpoCooldown <= 0 && dist >= comboMin && dist <= comboMax) {
          this.performShunpoGetsugaCombo(target);
          this.aim(target); // Rule #3: aim immediately after teleport
          return;
        }

        // 3. Melee attacks (Tensa Zangetsu cleave)
        const reach = CONFIG.ichigo?.swordRange || 70;
        if (dist <= reach + target.r && this.swordCooldown <= 0) {
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
    // Handled in drawYujiSkin style inline or via ichigoSkin.js
    drawIchigoSkin(ctx, this);
  }

  drawGun(ctx) {
    // Override to prevent drawing the default gun barrel and hands
  }

  drawOutline(ctx) {
    // No-op: ichigoSkin already renders the crisp 3px body stroke aligned with body shift/tilt
  }

  draw(ctx) {
    // Render afterimages with smooth alpha decay and arena boundary clipping
    if (this.afterImages && this.afterImages.length > 0) {
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
      ctx.save();

      // Clip afterimage drawing strictly within arena boundaries so edges never poke through arena walls
      if (arena) {
        if (arena.radius) {
          ctx.beginPath();
          ctx.arc(arena.x, arena.y, arena.radius - 1, 0, Math.PI * 2);
          ctx.clip();
        } else if (arena.width && arena.height) {
          ctx.beginPath();
          ctx.rect(arena.x, arena.y, arena.width, arena.height);
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
}
