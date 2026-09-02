// ─────────────────────────────────────────────
// Carl "CJ" Johnson — The Grove Street Cheatmaster
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { MODE_SPEED_MULTIPLIER } from '../../core/modeConfig.js';
import { drawCjSkin } from '../../graphics/fighters/cjSkin.js';
import { state, spawnFloatingText, triggerGlobalScreenShake, triggerWastedOverlay } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { stopSoundBySrc } from '../../systems/soundSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnGroveStreetDriveBy } from '../../systems/cjDriveBySystem.js';
import { spawnDroppedJetpack, clearFloatingJetpacks } from '../../graphics/particles/cjFloatingJetpack.js';
import { spawnDroppedMinigun, clearDroppedMiniguns } from '../../graphics/particles/cjDroppedMinigun.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnSpentCasing } from '../../graphics/particles/johnWickDroppedMagazine.js';

export class CJFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'cj';
    this.type = 'cj';

    const cfg = CONFIG.cj || {};
    this.baseSpeed = (def && (def.moveSpeed || def.speed)) ? (def.moveSpeed || def.speed) : (cfg.speed || 5.5);
    this.speed = this._resolveSpeed(1.0);

    // ── Combat & Punch Variables (Brass Knuckles CQC) ──
    this.punchAnimTimer = 0;
    this.punchMaxTime = cfg.meleePunchCooldown || 18;
    this.punchAnimHand = 0; // 0 = lead jab (front hand), 1 = cross hook (back hand)
    this.meleeCooldown = 0;
    this.meleeCooldownMax = cfg.meleePunchCooldown || 18;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // ── Dual Micro-Uzi Weapons (Jetpack Mode) ──
    this.uziSide = 0; // 0 = right/front gun, 1 = left/back gun
    this.uziFireCooldown = 0;
    this.uziRecoilFront = 0;
    this.uziRecoilBack = 0;
    this.uziFlashTimerFront = 0;
    this.uziFlashTimerBack = 0;

    // ── Passive: RESPECT+ & Cheat Code Dialer ──
    this.respect = 0;
    this.maxRespect = cfg.maxRespect || 100;
    this.hasTriggeredTier1 = false;  // 50% Respect threshold
    this.hasTriggeredTier2 = false;  // 100% Respect threshold ("Grove Street OG")
    this.isGroveStreetOg = false;
    this.respectAuraTimer = 0;

    // ── Cheat Code Walking & Spelled-Out Typing System ──
    this.isTypingCheat = false;
    this.cheatCodeString = '';
    this.cheatTypedChars = 0;
    this.cheatTypingTimer = 0;
    this.cheatTypingMaxTimer = 0;
    this.cheatPostDelayTimer = 0;
    this.cheatActionCallback = null;

    // ── Skill 1: HESOYAM (Health, Armor & $250k Shockwave - 50% HP Lost Trigger) ──
    this.hasUsedHesoyam = false;
    this.hesoyamShield = 0;
    this.hesoyamMaxShield = cfg.hesoyamShieldAmount || 75;
    this.money = 350;

    // ── Stamina & Sprint Fatigue Mechanic (GTA San Andreas White Stamina Bar) ──
    this.maxStamina = cfg.maxStamina || 100;
    this.stamina = this.maxStamina;
    this.isExhausted = false;
    this.staminaDrainRate = cfg.staminaDrainRate || 0.38; // ~4.4s of full sprint/combat drains 100 stamina
    this.staminaRegenRate = cfg.staminaRegenRate || 0.42; // ~4.0s of recovery recharges to 100 stamina
    this.exhaustedSpeedMultiplier = cfg.exhaustedSpeedMultiplier || 0.40; // Movement speed is slow when winded/exhausted

    // ── Skill 2: ROCKETMAN Jetpack & Dual Micro-Uzis ──
    this.isJetpackActive = false;
    this.jetpackTimer = 0;
    this.jetpackMaxTimer = cfg.jetpackDuration || 600;
    this.jetpackCooldownMax = cfg.jetpackCooldown || 800;
    this.jetpackCooldown = this.jetpackCooldownMax; // Starts on cooldown initially
    this.jetpackDiveCooldown = 0;
    this.evadeBuffTimer = 0;
    this.evadeChance = 0;
    this.jetpackBounceGraceTimer = 0;

    // ── Skill 3: GROVESTREET4LIFE Drive-By ──
    this.isDriveByActive = false;
    this.driveByTimer = 0;
    this.driveByMaxTimer = cfg.driveByStayDuration || 300;
    this.driveByCooldownMax = cfg.driveByCooldown || 600;
    this.driveByCooldown = this.driveByCooldownMax; // Starts on cooldown initially

    // ── Ultimate: BAGUVIX God Mode & Minigun ──
    this.isBaguvixActive = false;
    this.isGodModeActive = false;
    this.baguvixTimer = 0;
    this.baguvixMaxTimer = cfg.baguvixDuration || 800;
    this.baguvixCooldownMax = cfg.baguvixCooldown || 2500;
    this.baguvixCooldown = this.baguvixCooldownMax; // Starts on cooldown initially
    this.minigunFireCooldown = 0;
    this.minigunSpinAngle = 0;
    this.minigunSpinSpeed = 0;
    this.minigunRecoil = 0;
    this.minigunFlashTimer = 0;
    this.minigunHeat = 0;
    this.riotShockwaveTimer = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.cj || {};
    this.baseSpeed = (this._def && (this._def.moveSpeed || this._def.speed)) ? (this._def.moveSpeed || this._def.speed) : (cfg.speed || 5.5);
    this.speed = this._resolveSpeed(1.0);
    this.punchAnimTimer = 0;
    this.punchAnimHand = 0;
    this.meleeCooldown = 0;
    this.meleeCooldownMax = cfg.meleePunchCooldown || 18;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    this.uziSide = 0;
    this.uziFireCooldown = 0;
    this.uziRecoilFront = 0;
    this.uziRecoilBack = 0;
    this.uziFlashTimerFront = 0;
    this.uziFlashTimerBack = 0;

    this.respect = 0;
    this.hasTriggeredTier1 = false;
    this.hasTriggeredTier2 = false;
    this.isGroveStreetOg = false;
    this.respectAuraTimer = 0;

    this.isTypingCheat = false;
    this.cheatCodeString = '';
    this.cheatTypedChars = 0;
    this.cheatTypingTimer = 0;
    this.cheatTypingMaxTimer = 0;
    this.cheatPostDelayTimer = 0;
    this.cheatActionCallback = null;

    this.hasUsedHesoyam = false;
    this.hesoyamShield = 0;

    this.isJetpackActive = false;
    this.jetpackTimer = 0;
    this.jetpackMaxTimer = cfg.jetpackDuration || 600;
    this.jetpackCooldownMax = cfg.jetpackCooldown || 800;
    this.jetpackCooldown = this.jetpackCooldownMax;
    this.jetpackDiveCooldown = 0;
    this.evadeBuffTimer = 0;
    this.evadeChance = 0;
    this.jetpackBounceGraceTimer = 0;

    this.isDriveByActive = false;
    this.driveByTimer = 0;
    this.driveByMaxTimer = cfg.driveByStayDuration || 300;
    this.driveByCooldownMax = cfg.driveByCooldown || 600;
    this.driveByCooldown = this.driveByCooldownMax;

    this.isBaguvixActive = false;
    this.isGodModeActive = false;
    this.baguvixTimer = 0;
    this.baguvixMaxTimer = cfg.baguvixDuration || 800;
    this.baguvixCooldownMax = cfg.baguvixCooldown || 2500;
    this.baguvixCooldown = this.baguvixCooldownMax;
    this.minigunFireCooldown = 0;
    this.minigunSpinAngle = 0;
    this.minigunSpinSpeed = 0;
    this.minigunRecoil = 0;
    this.minigunFlashTimer = 0;
    this.minigunHeat = 0;
    this.riotShockwaveTimer = 0;
    this._hasPlayedDeathMusic = false;
    this._hasPlayedIntroVoiceline = false;
    this._countdownFrames = 0;
    this.damageDealt = 0;
    this.money = 350;
    this._lastTargetMoney = 350;
    this._moneyRollingTimer = 0;
    this._currentMoneyVal = 350;
    this.maxStamina = cfg.maxStamina || 100;
    this.stamina = this.maxStamina;
    this.isExhausted = false;
    this.staminaDrainRate = cfg.staminaDrainRate || 0.38;
    this.staminaRegenRate = cfg.staminaRegenRate || 0.42;
    this.exhaustedSpeedMultiplier = cfg.exhaustedSpeedMultiplier || 0.40;
    stopSoundBySrc('cj-carroam-noise');
  }

  /**
   * Helper to resolve CJ's actual movement speed incorporating game mode speed multipliers.
   */
  _resolveSpeed(customMultiplier = 1.0) {
    const modeMult = (typeof state !== 'undefined' && state && state.mode && MODE_SPEED_MULTIPLIER && MODE_SPEED_MULTIPLIER[state.mode]) || 1.0;
    return (this.baseSpeed || 5.5) * modeMult * customMultiplier;
  }

  /**
   * Helper to resolve CJ's baseline ground speed multiplier based on current Respect tier & Stamina.
   */
  _getGroundSpeedMultiplier() {
    const cfg = CONFIG.cj || {};
    let base = 1.0;
    if (this.isGroveStreetOg || this.hasTriggeredTier2 || this.respect >= 100) {
      base = 1 + (cfg.respectSpeedBoost || 0.15) + 0.05;
    } else if (this.hasTriggeredTier1 || this.respect >= 50) {
      base = 1 + (cfg.respectSpeedBoost || 0.15);
    }
    if (this.isExhausted) {
      base *= (this.exhaustedSpeedMultiplier || 0.40);
    }
    return base;
  }

  /**
   * Countdown hook invoked each frame while gameState === 'countdown'.
   * Triggers CJ's intro voiceline once as the fighters prepare to fight.
   */
  onCountdown(opponent) {
    if (!this._hasPlayedIntroVoiceline && typeof state !== 'undefined' && (state.countdownTimer || 0) >= 30) {
      this._hasPlayedIntroVoiceline = true;
      const cjSnd = CONFIG.cj?.sounds?.introVoiceline || 'Assets/Sound Effects/Skills/cj-intro-voiceline.mp3';
      const cjVol = CONFIG.cj?.soundVolumes?.introVoiceline ?? 3.0;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(cjSnd, cjVol);
      }
    }
  }

  /**
   * Passive: RESPECT+ Accumulation & Tier Progression (Permanent Buffs)
   */
  gainRespect(amount) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    const prev = this.respect;
    this.respect = Math.min(this.maxRespect, this.respect + amount);

    // Tier 1: 50% Respect Threshold ("STREET HUSTLER" - Permanent)
    if (this.respect >= 50 && prev < 50 && !this.hasTriggeredTier1) {
      this.hasTriggeredTier1 = true;
      if (!this.isJetpackActive && !this.isBaguvixActive) {
        const groundMult = this._getGroundSpeedMultiplier();
        this.speedMultiplier = 1.0;
        this.speed = this._resolveSpeed(groundMult);
      }
      spawnFloatingText(this.x, this.y - this.r - 18, 'RESPECT+', '#22C55E');
      this.respectAuraTimer = 60;
    }

    // Tier 2: 100% Respect Threshold ("GROVE STREET OG" - Permanent)
    if (this.respect >= 100 && prev < 100 && !this.hasTriggeredTier2) {
      this.hasTriggeredTier2 = true;
      this.isGroveStreetOg = true;
      if (!this.isJetpackActive && !this.isBaguvixActive) {
        const groundMult = this._getGroundSpeedMultiplier();
        this.speedMultiplier = 1.0;
        this.speed = this._resolveSpeed(groundMult);
      }

      // Cooldown refund on active skills
      const cdRefund = cfg.respectCooldownRefund || 90;
      this.jetpackCooldown = Math.max(0, this.jetpackCooldown - cdRefund);
      this.driveByCooldown = Math.max(0, this.driveByCooldown - cdRefund);

      // Attack speed boost (25% faster punch recovery)
      const atkSpdReduction = cfg.respectAttackSpeedBoost || 0.05;
      this.meleeCooldownMax = Math.max(10, Math.round((cfg.meleePunchCooldown || 18) * (1 - atkSpdReduction)));

      // Trigger authentic GTA San Andreas top-left indicator box for Respect gain
      state.cheatNotification = {
        text: 'Respect +',
        timer: 140,
        maxTimer: 140
      };

      this.respectAuraTimer = 180;
      const cheatSound = CONFIG.cj?.sounds?.cheatActivated || 'Assets/Sound Effects/Skills/cj-cheatactivated-banner.mp3';
      const cheatVol = CONFIG.cj?.soundVolumes?.cheatActivated !== undefined ? CONFIG.cj.soundVolumes.cheatActivated : 3.5;
      audioSystem.playSFX(cheatSound, cheatVol);
    }
  }

  /**
   * Helper to trigger a GTA San Andreas Cheat Notification & FX
   */
  triggerCheat(codeName, subtitle = '') {
    // Set authentic GTA San Andreas top-left arena notification box
    state.cheatNotification = {
      text: 'Cheat activated',
      timer: 140,
      maxTimer: 140
    };
    if (subtitle) {
      spawnFloatingText(this.x, this.y - this.r - 20, subtitle, '#22C55E');
    }
    const cheatSound = CONFIG.cj?.sounds?.cheatActivated || 'Assets/Sound Effects/Skills/cj-cheatactivated-banner.mp3';
    const cheatVol = CONFIG.cj?.soundVolumes?.cheatActivated !== undefined ? CONFIG.cj.soundVolumes.cheatActivated : 3.5;
    audioSystem.playSFX(cheatSound, cheatVol);
  }

  /**
   * Damage mitigation & shield absorption with God Mode & Evasion
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.dead) return false;
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit));
    const isHeal = opts.isHeal || amount < 0;
    const cfg = CONFIG.cj || {};

    // 1. BAGUVIX: 100% God Mode Invulnerability
    if (this.isBaguvixActive || this.isGodModeActive) {
      const now = Date.now();
      if (!this._lastBaguvixTextTime || now - this._lastBaguvixTextTime > 120) {
        this._lastBaguvixTextTime = now;
        spawnSparks(this.x, this.y, '#FEF08A', 5);
        const parrySnd = CONFIG.cj?.sounds?.parry || 'Assets/Sound Effects/Skills/parry.mp3';
        const parryVol = CONFIG.cj?.soundVolumes?.parry !== undefined ? CONFIG.cj.soundVolumes.parry : 0.65;
        audioSystem.playSFX(parrySnd, parryVol);
      }
      return false; // Total damage immunity!
    }

    // 2. JETPACK AIRBORNE EVASION MECHANIC
    if (this.isJetpackActive && !isHeal && amount > 0 && !isGuaranteedHit) {
      const isTickOrBeam = Boolean(
        opts && (
          opts.isPureLoveBeam ||
          opts.isGenosBeam ||
          opts.isLaser ||
          opts.isLaserBeam ||
          opts.isBeam ||
          opts.isContinuous ||
          opts.isTickDamage ||
          opts.isTick ||
          opts.isBleed ||
          opts.fromBleed ||
          opts.isBurn ||
          opts.fromBurn ||
          opts.isPoison ||
          opts.isPurpleDPS ||
          opts.isDivineFlame ||
          opts.isDomain ||
          opts.isDomainSlash ||
          opts.fromDomain ||
          opts.fromBlackHole
        )
      ) || (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam());

      const isEvadableAttack = !isTickOrBeam && (opts.isProjectile || opts.isMelee || opts.isBasicAttack || (!opts.isSkill && !opts.isUltimate && !opts.isDomain));

      if (isEvadableAttack) {
        const evadeChance = cfg.jetpackEvadeChance ?? 0.50;
        if (Math.random() < evadeChance) {
          const now = Date.now();
          if (!this._lastEvadeTextTime || now - this._lastEvadeTextTime > 150) {
            this._lastEvadeTextTime = now;
            spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 16, 'EVADE!', '#38BDF8');
            spawnSparks(this.x, this.y, '#38BDF8', 8);
            const evadeSnd = CONFIG.cj?.sounds?.evade || 'Assets/Sound Effects/Skills/dash1.mp3';
            const evadeVol = CONFIG.cj?.soundVolumes?.evade !== undefined ? CONFIG.cj.soundVolumes.evade : 0.85;
            audioSystem.playSFX(evadeSnd, evadeVol);

            // Reactive thruster micro-juke to evade attack
            const jukeAngle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(jukeAngle) * 5.5;
            this.vy += Math.sin(jukeAngle) * 5.5;
          }
          return false; // Evaded!
        }
      }
    }

    // 3. HESOYAM: Kevlar Armor Shield absorbs incoming damage first
    if (this.hesoyamShield > 0 && !isHeal && amount > 0) {
      if (this.hesoyamShield >= amount) {
        this.hesoyamShield -= amount;
        spawnFloatingText(this.x, this.y - this.r - 10, `-${Math.round(amount)}`, '#38BDF8');
        const shieldSnd = CONFIG.cj?.sounds?.shieldBlock || 'Assets/Sound Effects/Skills/shieldblock.mp3';
        const shieldVol = CONFIG.cj?.soundVolumes?.shieldBlock !== undefined ? CONFIG.cj.soundVolumes.shieldBlock : 0.65;
        audioSystem.playSFX(shieldSnd, shieldVol);
        this.gainRespect(cfg.respectGainOnHit || 2);
        return false;
      } else {
        const remaining = amount - this.hesoyamShield;
        spawnFloatingText(this.x, this.y - this.r - 10, 'ARMOR BREAK!', '#38BDF8');
        this.hesoyamShield = 0;
        amount = remaining;
      }
    }

    // 4. Grove Street OG: Flat Damage Resistance
    if (this.isGroveStreetOg && !isHeal && amount > 0) {
      amount *= (1 - (cfg.respectDefenseBoost || 0.02));
    }

    // Build Respect when absorbing combat damage
    if (!isHeal && amount > 0) {
      this.gainRespect(cfg.respectGainOnHit || 2);
    }

    const res = super.takeDamage(amount, attacker, opts);

    // Trigger GTA WASTED overlay and death music when CJ receives fatal damage
    if ((this.hp <= 0 || this.dead) && !this._hasPlayedDeathMusic) {
      this._hasPlayedDeathMusic = true;
      stopSoundBySrc('cj-carroam-noise');
      if (typeof triggerWastedOverlay === 'function') {
        triggerWastedOverlay({ timer: 180 });
      }
    }

    // 5. HESOYAM 50% HP Lost Trigger (Triggers strictly when HP drops to <= 50%)
    const hesoThreshold = cfg.hesoyamHpThreshold ?? 0.50;
    if (this.hp > 0 && !this.dead && !this.isTypingCheat && !this.isBaguvixActive && !this.hasUsedHesoyam) {
      if ((this.hp / (this.maxHp || 100)) <= hesoThreshold) {
        this.activateHesoyam();
      }
    }

    return res;
  }

  /**
   * Countdown Phase Hook
   */
  onCountdown(opponent) {
    // Handled exclusively by the show-off screen countdown transition
  }

  /**
   * Override base cooldown handling during time-stop/paralyze/stasis.
   * BAGUVIX God Mode cooldown must NEVER pause when CJ is afflicted with a paralyze debuff.
   */
  _handleFrozenSkillCooldowns() {
    super._handleFrozenSkillCooldowns();
    if (!this.isBaguvixActive && this.baguvixCooldown > 0) {
      const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : 0;
      if (this._lastBaguvixCdFrame !== currentFrame) {
        this._lastBaguvixCdFrame = currentFrame;
        this.baguvixCooldown--;
      }
    }
  }

  // ── BAGUVIX GOD MODE DEBUFF IMMUNITIES ──
  applySlow(frames, multiplier, opts = {}) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applySlow(frames, multiplier, opts);
  }

  applyHitStun(frames, opts = {}) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyHitStun(frames, opts);
  }

  applyParalyze(frames, opts = {}) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyParalyze(frames, opts);
  }

  applyElectricStun(frames) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    if (typeof super.applyElectricStun === 'function') super.applyElectricStun(frames);
    else this.electricStunTimer = 0;
  }

  applyTimeStop(frames, opts = {}) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    if (typeof super.applyTimeStop === 'function') super.applyTimeStop(frames, opts);
    else this.timeStopTimer = 0;
  }

  applyPoison(attacker) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyPoison(attacker);
  }

  applyBurn(attacker) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyBurn(attacker);
  }

  applyBleed(attacker, duration, damagePerTick, intervalFrames) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyBleed(attacker, duration, damagePerTick, intervalFrames);
  }

  applyKnockback(kx, ky) {
    if (this.isBaguvixActive || this.isGodModeActive) return;
    super.applyKnockback(kx, ky);
  }

  applyStatusEffect(effectName, ...args) {
    if (this.isBaguvixActive || this.isGodModeActive) return false;
    return super.applyStatusEffect(effectName, ...args);
  }

  /**
   * Main Fighter Update Loop
   * Rule 1 Compliant (Early exit on freeze/time-stop, bypassed during BAGUVIX God Mode)
   */
  update(opponent, ownerIndex, arena) {
    // Trigger GTA WASTED overlay and death music if HP drops to 0
    if ((this.hp <= 0 || this.dead) && !this._hasPlayedDeathMusic) {
      this._hasPlayedDeathMusic = true;
      stopSoundBySrc('cj-carroam-noise');
      if (typeof triggerWastedOverlay === 'function') {
        triggerWastedOverlay({ timer: 180 });
      }
    }
    if (this.dead) return;

    // Rule 1: TimeStop & Ambush early exit guard (Immune to all CC & debuffs during BAGUVIX God Mode)
    if (this.isBaguvixActive || this.isGodModeActive) {
      this.timeStopTimer = 0;
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
      this.paralyzeTimer = 0;
      this.isParalyzed = false;
      this.isParalyzedByMahito = false;
      this.isParalyzedByMahoraga = false;
      this.isWallSlammed = false;
      this.isGrabbedByMahoraga = false;
      this.isFrozenByInfinity = false;
      this.caughtInPureLoveBeam = false;
      this.pureLoveBeamTimer = 0;
      this.pureLoveBeamRecoveryTimer = 0;
      this.isCaughtInPurple = false;
      this.purpleHitTimer = 0;
      this.slowTimer = 0;
      this.slowMultiplier = 1.0;
      this.burnTimer = 0;
      this.poisonTicks = 0;
      this.poisonTimer = 0;
      this.bleedTimer = 0;
      this.bleedDamageTimer = 0;
      this.silenceTimer = 0;
      this.nanamiArmorFractureTimer = 0;
      this.ratioHitPauseTimer = 0;
      this.basicAttackHitPauseTimer = 0;
    } else {
      const isFrozen = this._handleTimeStop();
      if (isFrozen || this.isTargetOfAmbush) {
        this.interruptAttacks();
        // BAGUVIX Cooldown must NEVER pause even when afflicted with paralyze debuffs / stasis / freeze
        if (!this.isBaguvixActive && this.baguvixCooldown > 0) {
          const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : 0;
          if (this._lastBaguvixCdFrame !== currentFrame) {
            this._lastBaguvixCdFrame = currentFrame;
            this.baguvixCooldown--;
          }
        }
        return;
      }
    }

    const cfg = CONFIG.cj || {};

    // Update combat, respect, minigun & uzi weapon timers
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (this.respectAuraTimer > 0) this.respectAuraTimer--;
    if (!this.isJetpackActive && this.jetpackCooldown > 0) this.jetpackCooldown--;
    if (!this.isDriveByActive && this.driveByCooldown > 0) this.driveByCooldown--;
    if (!this.isBaguvixActive && this.baguvixCooldown > 0) {
      const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : 0;
      if (this._lastBaguvixCdFrame !== currentFrame) {
        this._lastBaguvixCdFrame = currentFrame;
        this.baguvixCooldown--;
      }
    }

    // ── Stamina System & Sprint Fatigue Mechanic ──
    if (!this.dead && !this.isTypingCheat) {
      const isGroundSprinting = !this.isJetpackActive && !this.isBaguvixActive;
      const isMovingOrPunching = Math.hypot(this.vx, this.vy) > 0.4 || this.punchAnimTimer > 0;

      if (this.isExhausted) {
        // While exhausted, CJ slowly walks and regenerates stamina until full
        this.stamina = Math.min(this.maxStamina, (this.stamina || 0) + (this.staminaRegenRate || 0.42));
        if (this.stamina >= this.maxStamina) {
          this.stamina = this.maxStamina;
          this.isExhausted = false;
          spawnFloatingText(this.x, this.y - this.r - 18, 'STAMINA RECOVERED', '#FFFFFF');
        }
      } else if (isGroundSprinting && isMovingOrPunching) {
        // Drains stamina while actively running and fighting
        this.stamina = Math.max(0, (this.stamina || this.maxStamina) - (this.staminaDrainRate || 0.38));
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.isExhausted = true;
          spawnFloatingText(this.x, this.y - this.r - 18, '*OUT OF BREATH*', '#94A3B8');
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.5);
        }
      } else {
        // Regenerates stamina while resting / stationary / in jetpack
        this.stamina = Math.min(this.maxStamina, (this.stamina || 0) + (this.staminaRegenRate || 0.42));
      }
    }

    // Update Drive-By Active Stay Duration countdown
    if (this.isDriveByActive) {
      const activeCar = typeof state !== 'undefined' && state.cjDriveBys ? state.cjDriveBys.find(c => c && c.owner === this && !c.dead) : null;
      if (activeCar) {
        const stayDur = activeCar.stayDuration || cfg.driveByStayDuration || 240;
        this.driveByMaxTimer = stayDur;
        this.driveByTimer = Math.max(0, stayDur - (activeCar.stayTimer || 0));
      } else if (this.driveByTimer > 0) {
        this.driveByTimer--;
      } else {
        this.isDriveByActive = false;
      }
    }

    // Micro-Uzi recoil and muzzle flash decay
    if (this.uziRecoilFront > 0) this.uziRecoilFront = Math.max(0, this.uziRecoilFront - 0.7);
    if (this.uziRecoilBack > 0) this.uziRecoilBack = Math.max(0, this.uziRecoilBack - 0.7);
    if (this.uziFlashTimerFront > 0) this.uziFlashTimerFront--;
    if (this.uziFlashTimerBack > 0) this.uziFlashTimerBack--;
    if (this.uziFireCooldown > 0) this.uziFireCooldown--;

    // Minigun recoil, flash, spin and cooldown decay
    if (this.minigunRecoil > 0) this.minigunRecoil = Math.max(0, this.minigunRecoil - 1.0);
    if (this.minigunFlashTimer > 0) this.minigunFlashTimer--;
    if (this.minigunFireCooldown > 0) this.minigunFireCooldown--;
    if (!this.isBaguvixActive) {
      if (this.minigunSpinSpeed > 0) this.minigunSpinSpeed = Math.max(0, this.minigunSpinSpeed - 0.025);
      if (this.minigunSpinSpeed > 0) this.minigunSpinAngle += this.minigunSpinSpeed;
      if (this.minigunHeat > 0) this.minigunHeat = Math.max(0, this.minigunHeat - 0.008);
    }

    // ── Skill 2: ROCKETMAN Jetpack Flight Physics & Thruster Dynamics ──
    if (this.isJetpackActive) {
      this.jetpackTimer--;

      // Elevation hover oscillation (noticeable floating gap above ground shadow)
      const time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.006;
      this.z = 28 + Math.sin(time) * 5;

      // Dynamic flight speed boost (active strictly while flying on the Jetpack)
      const groundMult = this._getGroundSpeedMultiplier();
      const jetMult = groundMult * (cfg.jetpackSpeedMultiplier || 1.40);
      this.speedMultiplier = 1.0;
      this.speed = this._resolveSpeed(jetMult);

      // Natural Wall Bounce Deflection Grace Period (allows clean ricochet deflection before AI resumes tracking)
      if (this.jetpackBounceGraceTimer > 0) {
        this.jetpackBounceGraceTimer--;
        const curSpd = Math.hypot(this.vx, this.vy);
        if (curSpd > 0) {
          this.vx = (this.vx / curSpd) * this.speed;
          this.vy = (this.vy / curSpd) * this.speed;
        }
        if (opponent && !opponent.dead && opponent.hp > 0 && typeof this.aim === 'function') {
          this.aim(opponent);
        }
      } else if (opponent && !opponent.dead && opponent.hp > 0) {
        if (typeof this.aim === 'function') {
          this.aim(opponent);
        }

        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        const directAngle = Math.atan2(dy, dx);

        // Desired flight trajectory: circle and strafe at optimal Uzi range (~180px)
        let flightAngle;
        if (dist > 220) {
          flightAngle = directAngle; // Close in rapidly
        } else if (dist < 110) {
          flightAngle = directAngle + Math.PI; // Back up to maintain shooting clearance
        } else {
          // High-speed strafe circling
          const strafeDir = (this.jetpackTimer % 120 < 60) ? (Math.PI * 0.5) : (-Math.PI * 0.5);
          flightAngle = directAngle + strafeDir * 0.75;
        }

        // Steer velocity smoothly at balanced flight speed
        const targetVx = Math.cos(flightAngle) * this.speed;
        const targetVy = Math.sin(flightAngle) * this.speed;
        this.vx += (targetVx - this.vx) * 0.14;
        this.vy += (targetVy - this.vy) * 0.14;

        // Maintain full flight speed
        const curSpd = Math.hypot(this.vx, this.vy);
        if (curSpd > 0) {
          this.vx = (this.vx / curSpd) * this.speed;
          this.vy = (this.vy / curSpd) * this.speed;
        }
      } else {
        const curVelMag = Math.hypot(this.vx, this.vy);
        if (curVelMag > 0.05) {
          this.vx = (this.vx / curVelMag) * this.speed;
          this.vy = (this.vy / curVelMag) * this.speed;
        }
      }

      // Thruster ground burn AOE trail behind CJ
      if (this.jetpackTimer % 5 === 0) {
        this._emitJetpackThrusterBurn(arena);
      }

      // Dual Micro-Uzi Rapid Airborne Strafe Fire (Alternate Left/Right barrels)
      if (opponent && !opponent.dead && opponent.hp > 0) {
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (this.uziFireCooldown <= 0 && d <= (cfg.jetpackUziRange || 340)) {
          this._fireJetpackUzi(opponent);
        }
      }

      // Supersonic Knuckle Dive Bomb Thruster Strike AI (if in close-medium range)
      if (this.jetpackDiveCooldown > 0) {
        this.jetpackDiveCooldown--;
      } else if (opponent && !opponent.dead && opponent.hp > 0 && this.meleeCooldown <= 0) {
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (d > 85 && d < 250) {
          this._executeJetpackDive(opponent);
        }
      }

      // Maintain Airborne Evade Buff during Jetpack Flight
      this.evadeBuffTimer = this.jetpackTimer;
      this.evadeChance = cfg.jetpackEvadeChance ?? 0.50;

      // Flight time expired: Land back down
      if (this.jetpackTimer <= 0) {
        this.isJetpackActive = false;
        this.z = 0;
        this.evadeBuffTimer = 0;
        this.evadeChance = 0;

        // Strictly restore ground speed immediately upon landing
        const groundMult = this._getGroundSpeedMultiplier();
        this.speedMultiplier = 1.0;
        this.speed = this._resolveSpeed(groundMult);
        this.jetpackCooldown = this.jetpackCooldownMax;

        const landVelMag = Math.hypot(this.vx, this.vy);
        if (landVelMag > this.speed) {
          this.vx = (this.vx / landVelMag) * this.speed;
          this.vy = (this.vy / landVelMag) * this.speed;
        }

        // Spawn floating 360° rotating Jetpack pickup item on the ground where CJ detached it
        spawnDroppedJetpack(this.x, this.y);
      }
    } else {
      this.z = 0;
      if (this.evadeChance > 0 && !this.isJetpackActive) {
        this.evadeChance = 0;
        this.evadeBuffTimer = 0;
      }

      // Strictly ground speed when not on jetpack and not in baguvix
      if (!this.isBaguvixActive) {
        const groundMult = this._getGroundSpeedMultiplier();
        this.speedMultiplier = 1.0;
        this.speed = this._resolveSpeed(groundMult);
      }

      // Decelerate any leftover supersonic flight velocity to normal ground speed
      const curVelMag = Math.hypot(this.vx, this.vy);
      if (curVelMag > this.speed && !this.isRolling && !this.isBaguvixActive) {
        this.vx = (this.vx / curVelMag) * this.speed;
        this.vy = (this.vy / curVelMag) * this.speed;
      }
    }

    // ── Ultimate: BAGUVIX God Mode & Minigun Overdrive State Machine ──
    if (this.isBaguvixActive) {
      this.baguvixTimer--;

      // Absolute God Mode status protection
      this.timeStopTimer = 0;
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.isFrozenByInfinity = false;

      // High-speed 6-barrel rotor spin & heat curve (dynamic spool-up)
      this.minigunSpinSpeed = Math.min(0.65, (this.minigunSpinSpeed || 0) + 0.04);
      this.minigunSpinAngle += this.minigunSpinSpeed;
      this.minigunHeat = Math.min(1.0, 0.45 + (1.0 - this.baguvixTimer / this.baguvixMaxTimer) * 0.55);

      // Aim at opponent and fire Minigun while roaming/rebouncing naturally (No target chase/follow)
      if (opponent && !opponent.dead && opponent.hp > 0) {
        if (typeof this.aim === 'function') {
          this.aim(opponent);
        }

        // Minigun Rapid Fire Barrage (Every 2 frames = 30-45 rounds/sec)
        if (this.minigunFireCooldown <= 0) {
          this._fireMinigun(opponent);
        }
      }

      // Significantly reduced movement speed strictly while in BAGUVIX minigun mode (natural cruising & bouncing)
      const baguvixMult = cfg.baguvixSpeedMultiplier || 0.28;
      this.speedMultiplier = baguvixMult;
      this.speed = this._resolveSpeed(baguvixMult);

      // Periodic Riot Mode Fiery Shockwave (Every 1.0s / 60 frames)
      this.riotShockwaveTimer--;
      if (this.riotShockwaveTimer <= 0) {
        this._triggerRiotShockwave();
        this.riotShockwaveTimer = cfg.riotShockwaveInterval || 60;
      }

      // Expiration: Drop overheated smoking minigun & play dialogue
      if (this.baguvixTimer <= 0) {
        this.isBaguvixActive = false;
        this.isGodModeActive = false;
        this.minigunRecoil = 0;
        this.minigunFlashTimer = 0;

        // Restore normal ground speed immediately upon dropping minigun
        const groundMult = this._getGroundSpeedMultiplier();
        this.speedMultiplier = 1.0;
        this.speed = this._resolveSpeed(groundMult);
        this.baguvixCooldown = this.baguvixCooldownMax;

        spawnDroppedMinigun(this.x, this.y, this.gunAngle || this.angle || 0);
        spawnFloatingText(this.x, this.y - this.r - 20, '"Grove Street is King!"', '#16A34A');
        audioSystem.playSFX('Assets/Sound Effects/SkillEffects/poisonsizzle.mp3', 0.65);
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
      }
    }

    // ── Update Cheat Typing Phase (Stationary / Standing in Place) ──
    if (this.isTypingCheat) {
      const framesPerChar = cfg.cheatTypingFramesPerChar || 3;

      // Stationary: Stop all movement while typing
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;

      if (this.cheatPostDelayTimer > 0) {
        // Post-activation brief pose delay before resuming action
        this.cheatPostDelayTimer--;

        if (this.cheatPostDelayTimer <= 0) {
          this.isTypingCheat = false;
        }
      } else {
        this.cheatTypingTimer++;
        const targetChars = Math.min(this.cheatCodeString.length, 1 + Math.floor(this.cheatTypingTimer / framesPerChar));
        if (targetChars > this.cheatTypedChars) {
          this.cheatTypedChars = targetChars;
          // Keystroke click SFX per character typed
          const typeSound = CONFIG.cj?.sounds?.typeClickNoise || 'Assets/Sound Effects/Skills/cj-typeclick1letter-noise.mp3';
          const typeVol = CONFIG.cj?.soundVolumes?.typeClickNoise !== undefined ? CONFIG.cj.soundVolumes.typeClickNoise : 2.5;
          audioSystem.playSFX(typeSound, typeVol);
        }

        // Keep aiming at opponent while standing in place
        const target = opponent || null;
        if (target && typeof this.aim === 'function') {
          this.aim(target);
        }

        // Typing finished & full-word confirmation delay held: Trigger cheat effect!
        if (this.cheatTypingTimer >= this.cheatTypingMaxTimer) {
          if (typeof this.cheatActionCallback === 'function') {
            const cb = this.cheatActionCallback;
            this.cheatActionCallback = null;
            cb();
          }
          if (this.isJetpackActive) {
            this.cheatPostDelayTimer = 0;
            this.isTypingCheat = false;
          } else {
            this.cheatPostDelayTimer = cfg.cheatActivationPostDelay || 4;
          }
        }
      }
    }

    // ── Check Strict Close-Range Collision with Dropped Floating Jetpack Pickup Item (ONLY when skill CD is ready!) ──
    const hasDroppedJetpack = Boolean(state.cjDroppedJetpacks && state.cjDroppedJetpacks.length > 0);
    if (!this.dead && !this.isJetpackActive && this.jetpackCooldown <= 0 && hasDroppedJetpack) {
      for (let i = state.cjDroppedJetpacks.length - 1; i >= 0; i--) {
        const item = state.cjDroppedJetpacks[i];
        if (!item) continue;
        const d = Math.hypot(this.x - item.x, this.y - item.y);
        const closePickupRadius = (this.r || 25) + 8; // Strict close-range contact (~33px)
        if (d <= closePickupRadius) {
          state.cjDroppedJetpacks.splice(i, 1);
          this._executeRocketman(true); // Pickup immediately without typing once CD is ready!
          break;
        }
      }
    }

    // Ground AI: Steer towards dropped jetpack to retrieve it ONLY when CD is ready!
    if (!this.dead && !this.isJetpackActive && !this.isTypingCheat && !this.isBaguvixActive && this.jetpackCooldown <= 0 && hasDroppedJetpack) {
      const nearestJetpack = state.cjDroppedJetpacks[0];
      if (nearestJetpack) {
        const toAngle = Math.atan2(nearestJetpack.y - this.y, nearestJetpack.x - this.x);
        this.vx += Math.cos(toAngle) * 0.85;
        this.vy += Math.sin(toAngle) * 0.85;
      }
    }

    // ── Ultimate: BAGUVIX Activation Condition (Cooldown Based) ──
    if (!this.isBaguvixActive && this.baguvixCooldown <= 0 && !this.dead && !this.isTypingCheat) {
      if (opponent && !opponent.dead && opponent.hp > 0) {
        this.activateBaguvix();
      }
    }

    // ── Skill 1: HESOYAM Activation Condition (Triggers when HP drops <= 50%) ──
    const hpRatio = (this.hp || 0) / (this.maxHp || 100);
    const hesoThreshold = cfg.hesoyamHpThreshold ?? 0.50;
    if (hpRatio <= hesoThreshold && !this.hasUsedHesoyam && !this.dead && !this.isTypingCheat && !this.isBaguvixActive) {
      if (opponent && !opponent.dead && opponent.hp > 0) {
        this.activateHesoyam();
      }
    }

    // ── Skill 2: ROCKETMAN Jetpack Initial Activation Condition (When NO dropped jetpack on ground) ──
    if (!this.isJetpackActive && this.jetpackCooldown <= 0 && !this.dead && !hasDroppedJetpack && !this.isBaguvixActive && !this.isTypingCheat) {
      if (opponent && !opponent.dead && opponent.hp > 0) {
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (d > 70) {
          this.activateRocketman();
        }
      }
    }

    // ── Skill 3: GROVESTREET4LIFE Drive-By Activation Condition ──
    if (!this.isDriveByActive && this.driveByCooldown <= 0 && !this.dead && !this.isTypingCheat && !this.isBaguvixActive) {
      if (opponent && !opponent.dead && opponent.hp > 0) {
        this.activateDriveBy();
      }
    }

    // Call base physics & AI update
    super.update(opponent, ownerIndex, arena);
    if (this.isTypingCheat) {
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;
      this.shootCooldown = Math.max(this.shootCooldown || 0, 30);
    }
    if (!this.isBaguvixActive && !this.isTypingCheat) {
      this._updateMeleeCombat(opponent, arena);
      this.resolveWallBounce(arena || (typeof state !== 'undefined' ? state.arena : null), opponent);
    }
  }

  /**
   * Dedicated movement physics for CJ.
   * During Jetpack flight, directly applies full supersonic kinematic velocity
   * and immediately resolves boundary bounces.
   */
  applyMovementPhysics(extraMultiplier = 1) {
    if (this.isJetpackActive) {
      this.x += this.vx;
      this.y += this.vy;
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG && CONFIG.arena ? CONFIG.arena : null);
      if (arena) {
        this.resolveWallBounce(arena);
      }
      return;
    }
    if (this.isBaguvixActive) {
      const cfg = CONFIG.cj || {};
      const baguvixMult = cfg.baguvixSpeedMultiplier || 0.28;
      const walkSpeed = this._resolveSpeed(baguvixMult);
      this.speed = walkSpeed;
      this.speedMultiplier = baguvixMult;

      const curSpd = Math.hypot(this.vx, this.vy);
      if (curSpd > 0.01) {
        this.vx = (this.vx / curSpd) * walkSpeed;
        this.vy = (this.vy / curSpd) * walkSpeed;
      }
      this.x += this.vx;
      this.y += this.vy;

      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG && CONFIG.arena ? CONFIG.arena : null);
      if (arena) {
        this.resolveWallBounce(arena);
      }
      return;
    }
    super.applyMovementPhysics(extraMultiplier);
  }

  /**
   * Dedicated wall bounce logic for CJ.
   * During Jetpack flight, deflects naturally off arena boundaries with physical angle of reflection,
   * preserving flight momentum and preventing edge stickiness.
   */
  resolveWallBounce(arena, opponent) {
    const ar = arena || (typeof state !== 'undefined' ? state.arena : null);
    if (!ar) return false;

    if (this.isJetpackActive) {
      let bounced = false;
      const speed = this.speed || 8.4;
      const r = this.r || 20;

      // 1. Check & resolve Left wall collision
      if (this.x - r < ar.x) {
        this.x = ar.x + r;
        this.vx = Math.abs(this.vx);
        if (this.vx < speed * 0.40) this.vx = speed * 0.50;
        bounced = true;
      }
      // 2. Check & resolve Right wall collision
      else if (this.x + r > ar.x + ar.width) {
        this.x = ar.x + ar.width - r;
        this.vx = -Math.abs(this.vx);
        if (Math.abs(this.vx) < speed * 0.40) this.vx = -speed * 0.50;
        bounced = true;
      }

      // 3. Check & resolve Top wall collision
      if (this.y - r < ar.y) {
        this.y = ar.y + r;
        this.vy = Math.abs(this.vy);
        if (this.vy < speed * 0.40) this.vy = speed * 0.50;
        bounced = true;
      }
      // 4. Check & resolve Bottom wall collision
      else if (this.y + r > ar.y + ar.height) {
        this.y = ar.y + ar.height - r;
        this.vy = -Math.abs(this.vy);
        if (Math.abs(this.vy) < speed * 0.40) this.vy = -speed * 0.50;
        bounced = true;
      }

      if (bounced) {
        // Normalize ricochet vector strictly to maintain natural momentum
        const mag = Math.hypot(this.vx, this.vy);
        if (mag > 0) {
          this.vx = (this.vx / mag) * speed;
          this.vy = (this.vy / mag) * speed;
        }

        // Give CJ a clean deflection glide period so AI doesn't immediately steer back into the wall
        this.jetpackBounceGraceTimer = 18; // ~0.30s natural reflection flight
        if (typeof spawnSparks === 'function') {
          spawnSparks(this.x, this.y, '#FBBF24', 6);
        }
      }
      return bounced;
    }

    const didBounce = super.resolveWallBounce ? super.resolveWallBounce(ar, opponent) : false;
    if (didBounce && this.isBaguvixActive) {
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x, this.y, '#16A34A', 6);
      }
    }
    return didBounce;
  }

  /**
   * Override base gun shoot to disable default shooting logic (CJ uses street boxing CQC).
   * Also ensures all attacks are strictly disabled while typing cheat codes.
   */
  shoot(ownerIndex) {
    if (this.dead || this.isTypingCheat) return;
  }

  /**
   * Enters cheat code typing state.
   * CJ stands firmly in place while dynamically spelling out the cheat string above his model.
   */
  startCheatTyping(codeString, onComplete) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    const framesPerChar = cfg.cheatTypingFramesPerChar || 3;
    const holdDelay = cfg.cheatTypingHoldDelay || 6;
    this.isTypingCheat = true;
    this.cheatCodeString = codeString.toUpperCase();
    this.cheatTypedChars = 1; // Instant first letter on keystroke start
    this.cheatTypingTimer = 0;
    this.cheatTypingMaxTimer = Math.max(1, ((this.cheatCodeString.length - 1) * framesPerChar) + holdDelay);
    this.cheatPostDelayTimer = 0;
    this.cheatActionCallback = onComplete;
    this.punchAnimTimer = 0;

    // Instant first keystroke audio click on activation
    const typeSound = CONFIG.cj?.sounds?.typeClickNoise || 'Assets/Sound Effects/Skills/cj-typeclick1letter-noise.mp3';
    const typeVol = CONFIG.cj?.soundVolumes?.typeClickNoise !== undefined ? CONFIG.cj.soundVolumes.typeClickNoise : 2.5;
    audioSystem.playSFX(typeSound, typeVol);
  }

  /**
   * Skill 1: HESOYAM ($250k Cash, Instant Heal, Armor Shield & Shockwave - Triggers at <= 50% HP)
   */
  activateHesoyam() {
    const cfg = CONFIG.cj || {};
    const hesoThreshold = cfg.hesoyamHpThreshold ?? 0.50;
    const hpRatio = (this.hp || 0) / (this.maxHp || 100);

    if (this.dead || this.isTypingCheat || this.hasUsedHesoyam || hpRatio > hesoThreshold) return;

    // Mark used immediately to prevent multiple triggers
    this.hasUsedHesoyam = true;

    this.startCheatTyping('HESOYAM', () => {
      this._executeHesoyam();
    });
  }

  _executeHesoyam() {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};

    // 1. Instant HP Heal (% of Max HP, Permanent)
    const healPercent = cfg.hesoyamHealPercent ?? 0.50;
    const maxHp = this.maxHp || 440;
    const healAmt = maxHp * healPercent;
    const prevHp = this.hp;
    this.hp = Math.min(maxHp, this.hp + healAmt);
    const actualHealed = this.hp - prevHp;

    // Trigger pop-out vibrant green heal glow pulse, DOM heal bubble popup, & micro-pulse on HUD health bar
    if (actualHealed > 0) {
      this._lastHealAmount = actualHealed; // Triggers DOM .hud-heal-bubble popup on the health bar!
      this._healthBarHealTimer = 30; // Triggers pop-out green heal glow pulse on HUD health bar
      this._healthBarShakeTimer = 8;
    }

    // 2. Armor & Stamina Full Restore & $250k Cash Deposit
    this.hesoyamShield = cfg.hesoyamShieldAmount || 75;
    this.stamina = this.maxStamina || 100;
    this.isExhausted = false;
    this.money = (this.money || 0) + 250000;

    // 3. Trigger Cheat Display & Floating Texts
    this.triggerCheat('HESOYAM', '+$250,000 | HEALTH & ARMOR');
    if (actualHealed > 0) {
      spawnFloatingText(this.x + (Math.random() - 0.5) * 16, this.y - this.r - 28, `+${Math.round(actualHealed)}`, '#00FF66');
    }
    spawnFloatingText(this.x, this.y - this.r - 42, '+$250,000', '#22C55E');

    // 4. Rule 6 Unified Query: $250k AOE Cash Blast Shockwave
    const radius = cfg.hesoyamShockwaveRadius || cfg.hesoyamRadius || 160;
    const dmg = cfg.hesoyamShockwaveDamage || cfg.hesoyamDamage || 35;
    const kb = cfg.hesoyamKnockback || 22;

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];
    const myIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= radius + (ent.r || 20)) {
        // Deal AOE blast damage
        if (typeof ent.takeDamage === 'function') {
          ent.takeDamage(dmg, this, { isSkill: true });
        }

        // Apply radial knockback push away from CJ (hesoyamKnockback)
        const angle = Math.atan2(dy, dx);
        ent.vx = (ent.vx || 0) + Math.cos(angle) * kb;
        ent.vy = (ent.vy || 0) + Math.sin(angle) * kb;

        // Visual impacts
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(ent.x, ent.y, 35, '#22C55E');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(ent.x, ent.y, '#4ADE80', 10);
        }
      }
    }

    // CJ Centered Visuals & Screen Shake
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 65, '#22C55E');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(6, 6);
    }

    // Build Respect on successful skill activation
    this.gainRespect(cfg.hesoyamRespectGain || 15);
  }

  /**
   * Skill 2: ROCKETMAN (DARPA Area 69 Jetpack Flight & Sonic Thrust Dive)
   * Enters cheat code typing state for 'ROCKETMAN'.
   * When a jetpack is dropped as a floating item on the ground, picking it up bypasses typing.
   */
  activateRocketman() {
    if (this.dead || this.isTypingCheat || this.isJetpackActive || this.jetpackCooldown > 0) return;

    // Immediately discharge cooldown on activation start
    this.jetpackCooldown = this.jetpackCooldownMax;

    this.startCheatTyping('ROCKETMAN', () => {
      this._executeRocketman(false);
    });
  }

  _executeRocketman(isPickup = false) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    this.isTypingCheat = false;
    this.cheatPostDelayTimer = 0;
    this.isJetpackActive = true;
    this.jetpackTimer = this.jetpackMaxTimer;
    this.jetpackCooldown = this.jetpackCooldownMax;
    this.jetpackDiveCooldown = 25;

    // Clear all dropped floating jetpack pickups from the arena floor
    clearFloatingJetpacks();

    // Apply high-speed flight physics immediately
    const baseRespectBoost = this.respect >= 50 ? (cfg.respectSpeedBoost || 0.05) : 0;
    const jetMult = (1 + baseRespectBoost) * (cfg.jetpackSpeedMultiplier || 0.70);
    this.speedMultiplier = jetMult;
    this.speed = (this.baseSpeed || cfg.speed || 5.5) * jetMult;

    const launchAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0);
    this.vx = Math.cos(launchAngle) * this.speed;
    this.vy = Math.sin(launchAngle) * this.speed;

    // Trigger authentic GTA San Andreas cheat notification or pickup floating text
    if (!isPickup) {
      this.triggerCheat('ROCKETMAN', 'JETPACK FLIGHT ACTIVE');
    } else {
      spawnFloatingText(this.x, this.y - this.r - 20, 'JETPACK EQUIPPED!', '#38BDF8');
    }

    // Rocket ignition and thrust SFX
    const igniteSnd = CONFIG.cj?.sounds?.jetpackIgnition || 'Assets/Sound Effects/Attacks/flamespray1.mp3';
    const igniteVol = CONFIG.cj?.soundVolumes?.jetpackIgnition !== undefined ? CONFIG.cj.soundVolumes.jetpackIgnition : 0.85;
    audioSystem.playSFX(igniteSnd, igniteVol);

    // Visual ignition burst & sparks
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 50, '#38BDF8');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, '#FBBF24', 18);
    }

    this.gainRespect(cfg.jetpackRespectGain || 10);
  }

  /**
   * Skill 3: GROVESTREET4LIFE (Gang Drive-By Backup)
   */
  activateDriveBy() {
    if (this.dead || this.isTypingCheat || this.isDriveByActive || this.driveByCooldown > 0) return;

    // Immediately discharge cooldown on activation start
    this.driveByCooldown = this.driveByCooldownMax;

    this.startCheatTyping('GROVESTREET4LIFE', () => {
      this._executeDriveBy();
    });
  }

  _executeDriveBy() {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    this.isDriveByActive = true;
    this.driveByMaxTimer = cfg.driveByStayDuration || 240;
    this.driveByTimer = this.driveByMaxTimer;
    this.driveByCooldown = this.driveByCooldownMax;

    // Trigger authentic GTA San Andreas cheat notification
    this.triggerCheat('GROVESTREET4LIFE', 'GROVE STREET GANG BACKUP');

    // Spawn the Greenwood sedan drive-by car
    spawnGroveStreetDriveBy(this);

    // Build Respect on successful skill activation
    this.gainRespect(cfg.driveByRespectGain || 15);
  }

  /**
   * Ultimate: BAGUVIX (God Mode & Minigun Riot Overdrive - Cooldown Based)
   */
  activateBaguvix() {
    if (this.dead || this.isTypingCheat || this.isBaguvixActive || this.baguvixCooldown > 0) return;

    // Immediately discharge cooldown on activation start
    this.baguvixCooldown = this.baguvixCooldownMax;

    // Gracefully exit Jetpack flight if airborne so CJ plants his feet
    if (this.isJetpackActive) {
      this.isJetpackActive = false;
      this.z = 0;
      this.jetpackTimer = 0;
      this.evadeBuffTimer = 0;
      this.evadeChance = 0;
      const groundMult = this._getGroundSpeedMultiplier();
      this.speedMultiplier = groundMult;
      this.speed = (this.baseSpeed || 6.0) * groundMult;
    }

    this.startCheatTyping('BAGUVIX', () => {
      this._executeBaguvix();
    });
  }

  _executeBaguvix() {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    this.isBaguvixActive = true;
    this.isGodModeActive = true;
    this.baguvixTimer = this.baguvixMaxTimer;
    this.baguvixCooldown = this.baguvixCooldownMax;
    this.minigunFireCooldown = 0;
    this.minigunSpinAngle = 0;
    this.minigunRecoil = 0;
    this.minigunFlashTimer = 0;
    this.minigunHeat = 0.5;
    this.riotShockwaveTimer = cfg.riotShockwaveInterval || 60;

    // Instantly purge all active crowd control, stun, and damage-over-time debuffs
    this.timeStopTimer = 0;
    this.hitStunTimer = 0;
    this.electricStunTimer = 0;
    this.dubstepStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.paralyzeTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isWallSlammed = false;
    this.isGrabbedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.caughtInPureLoveBeam = false;
    this.pureLoveBeamTimer = 0;
    this.pureLoveBeamRecoveryTimer = 0;
    this.isCaughtInPurple = false;
    this.purpleHitTimer = 0;
    this.slowTimer = 0;
    this.burnTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.silenceTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.ratioHitPauseTimer = 0;
    this.basicAttackHitPauseTimer = 0;

    // Reset Respect meter to 0 so it can recharge, while retaining permanent passive bonuses
    this.respect = 0;

    // Trigger authentic GTA San Andreas cheat notification & floating banner
    this.triggerCheat('BAGUVIX', 'GOD MODE & MINIGUN OVERDRIVE');
    spawnFloatingText(this.x, this.y - this.r - 28, '"You picked the wrong house, fool!"', '#F59E0B');

    // Initialize significantly reduced slow walking speed for BAGUVIX minigun mode
    const baguvixMult = cfg.baguvixSpeedMultiplier || 0.28;
    const walkSpeed = this._resolveSpeed(baguvixMult);
    this.speedMultiplier = baguvixMult;
    this.speed = walkSpeed;

    const curSpeed = Math.hypot(this.vx, this.vy);
    if (curSpeed > 0.05) {
      this.vx = (this.vx / curSpeed) * walkSpeed;
      this.vy = (this.vy / curSpeed) * walkSpeed;
    } else {
      const randAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randAngle) * walkSpeed;
      this.vy = Math.sin(randAngle) * walkSpeed;
    }

    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 75, '#F59E0B');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, '#FEF08A', 22);
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(8, 8);
    }
  }

  /**
   * Fires high-velocity supersonic armor-piercing Minigun rounds
   */
  _fireMinigun(opponent) {
    if (this.dead || this.isTypingCheat || (typeof state !== 'undefined' && state.gameState !== 'playing')) return;
    const cfg = CONFIG.cj || {};
    this.minigunFireCooldown = cfg.minigunFireRate || 2;
    // Dynamic rapid oscillating kickback vibration
    this.minigunRecoil = 5.8 + Math.sin(this.minigunSpinAngle * 4) * 1.8;
    this.minigunFlashTimer = 2;

    const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    // Exact M134 Minigun 6-barrel cluster muzzle tip (posX = r * 1.67, barrel tip = 56.0 * scale 1.15)
    const forwardDist = (this.r * 1.67 - (this.minigunRecoil || 0) * 0.8) + (56.0 * 1.15);
    const spread = (Math.random() - 0.5) * (cfg.minigunSpread || 0.05);
    const bulletAngle = angle + spread;
    const spawnX = this.x + Math.cos(angle) * forwardDist;
    const spawnY = this.y + Math.sin(angle) * forwardDist;

    const dmg = cfg.minigunBulletDamage || 12;
    const speed = cfg.minigunBulletSpeed || 28.0;
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;

    if (typeof projectileSystem !== 'undefined' && projectileSystem) {
      projectileSystem.fireProjectile(this, myIndex, dmg, false, speed, false, 'cjMinigunBullet', spawnX, spawnY, bulletAngle, {
        knockback: cfg.minigunKnockback || 6.5
      });
    }

    // Heavy alternating minigun gunfire sounds with John Wick M4 rifle crack
    const mgSounds = CONFIG.cj?.sounds?.minigunShot || [
      'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
      'Assets/Sound Effects/Attacks/revolvershot.mp3',
      'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3'
    ];
    const mgSound = Array.isArray(mgSounds) ? mgSounds[Math.floor(Math.random() * mgSounds.length)] : mgSounds;
    const mgVol = CONFIG.cj?.soundVolumes?.minigunShot !== undefined ? CONFIG.cj.soundVolumes.minigunShot : 0.80;
    audioSystem.playSFX(mgSound, mgVol);

    // Eject tumbling 7.62mm minigun brass casing to the ground
    if (typeof spawnSpentCasing === 'function') {
      spawnSpentCasing(this.x, this.y, angle, '762minigun', this.r);
    }

    if (typeof spawnSparks === 'function') {
      spawnSparks(spawnX, spawnY, 4, 'gold', '#FEF08A');
      spawnSparks(spawnX, spawnY, 2, 'crimson', '#F59E0B');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(1.5, 2);
    }
  }

  /**
   * Periodic Riot Mode Shockwave (Every 1.0s during BAGUVIX)
   * Rule 6 Unified Query on all enemy fighters & illusions
   */
  _triggerRiotShockwave() {
    if (this.dead || (typeof state !== 'undefined' && state.gameState !== 'playing')) return;
    const cfg = CONFIG.cj || {};
    const radius = cfg.riotShockwaveRadius || 220;
    const dmg = cfg.riotShockwaveDamage || 25;
    const kb = cfg.riotShockwaveKnockback || 22.0;

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];
    const myIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= radius + (ent.r || 20)) {
        if (typeof ent.takeDamage === 'function') {
          ent.takeDamage(dmg, this, { isSkill: true, isUltimate: true });
        }

        const angle = Math.atan2(dy, dx);
        ent.vx = (ent.vx || 0) + Math.cos(angle) * kb;
        ent.vy = (ent.vy || 0) + Math.sin(angle) * kb;

        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(ent.x, ent.y, 40, '#EA580C');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(ent.x, ent.y, '#F97316', 10);
        }
      }
    }

    // Visual shockwave & audio
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 80, '#EA580C');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, '#F97316', 18);
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(8, 8);
    }
    const riotSnd = CONFIG.cj?.sounds?.riotShockwave || 'Assets/Sound Effects/Attacks/explosion.mp3';
    const riotVol = CONFIG.cj?.soundVolumes?.riotShockwave !== undefined ? CONFIG.cj.soundVolumes.riotShockwave : 0.85;
    audioSystem.playSFX(riotSnd, riotVol);
    spawnFloatingText(this.x, this.y - this.r - 32, 'RIOT SHOCKWAVE!', '#EA580C');
  }

  _executeJetpackDive(opponent) {
    if (this.dead || this.isTypingCheat || !opponent || opponent.dead) return;
    const cfg = CONFIG.cj || {};
    const angle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    if (typeof this.aim === 'function') {
      this.aim(opponent);
    }

    // Supersonic kinematic dash boost
    const diveSpeed = cfg.jetpackDiveDashSpeed || 5.0;
    this.vx = Math.cos(angle) * diveSpeed;
    this.vy = Math.sin(angle) * diveSpeed;
    this.jetpackDiveCooldown = 55; // ~0.9s cooldown between dive punches

    // Trigger punch animation and audio
    this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
    this.punchAnimTimer = this.punchMaxTime;
    this.meleeCooldown = this.meleeCooldownMax;

    const diveSnd = CONFIG.cj?.sounds?.jetpackDive || 'Assets/Sound Effects/Attacks/heavypunch3.mp3';
    const diveVol = CONFIG.cj?.soundVolumes?.jetpackDive !== undefined ? CONFIG.cj.soundVolumes.jetpackDive : 1.0;
    audioSystem.playSFX(diveSnd, diveVol);
  }

  _emitJetpackThrusterBurn(arena) {
    if (this.dead || this.isTypingCheat) return;
    const cfg = CONFIG.cj || {};
    const burnDmg = cfg.jetpackThrusterBurnDamage || 2;
    const angle = (this.gunAngle || this.angle || 0);
    const backX = this.x - Math.cos(angle) * (this.r * 1.15);
    const backY = this.y - Math.sin(angle) * (this.r * 1.15);

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters.indexOf(this)) : null;

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const d = Math.hypot(ent.x - backX, ent.y - backY);
      if (d <= (this.r + 28)) {
        if (typeof ent.takeDamage === 'function') {
          ent.takeDamage(burnDmg, this, { isMelee: false });
        } else {
          ent.hp -= burnDmg;
        }
        spawnFloatingText(ent.x, ent.y - ent.r - 10, `${burnDmg}`, '#EA580C');
        if (typeof spawnSparks === 'function') {
          spawnSparks(ent.x, ent.y, '#F97316', 3);
        }
      }
    }
  }

  /**
   * Fires high-velocity alternating Dual Micro-Uzi bursts during Jetpack flight
   */
  _fireJetpackUzi(opponent) {
    if (this.dead || this.isTypingCheat || (typeof state !== 'undefined' && state.gameState !== 'playing')) return;
    const cfg = CONFIG.cj || {};
    const isFront = (this.uziSide === 0);
    this.uziSide = (this.uziSide === 0) ? 1 : 0; // Alternate between front and back guns
    this.uziFireCooldown = cfg.jetpackUziFireInterval || 5;

    const angle = this.gunAngle || this.angle || 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const sideDist = isFront ? (this.r * 0.38) : (-this.r * 0.38);
    // Exact Micro-Uzi barrel muzzle tip (barrel reach 39.5px * scale 1.05 = 41.5px)
    const forwardDist = isFront ? (this.r * 0.96 + 41.5) : (this.r * 0.88 + 41.5);
    const spawnX = this.x + cosA * forwardDist + perpX * sideDist;
    const spawnY = (this.y - (this.z || 0)) + sinA * forwardDist + perpY * sideDist;

    const spread = (Math.random() - 0.5) * (cfg.jetpackUziSpread || 0.07);
    const bulletAngle = angle + spread;
    const speed = cfg.jetpackUziBulletSpeed || 23.0;
    const dmg = cfg.jetpackUziBulletDamage || 8;

    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
    if (typeof projectileSystem !== 'undefined' && projectileSystem) {
      projectileSystem.fireProjectile(this, myIndex, dmg, false, speed, false, 'cjUziBullet', spawnX, spawnY, bulletAngle);
    }

    if (isFront) {
      this.uziFlashTimerFront = 3;
      this.uziRecoilFront = 4.5;
    } else {
      this.uziFlashTimerBack = 3;
      this.uziRecoilBack = 4.5;
    }

    const uziSnd = CONFIG.cj?.sounds?.jetpackUziShot || 'Assets/Sound Effects/Attacks/revolvershot.mp3';
    const uziVol = CONFIG.cj?.soundVolumes?.jetpackUziShot !== undefined ? CONFIG.cj.soundVolumes.jetpackUziShot : 0.60;
    audioSystem.playSFX(uziSnd, uziVol);
    if (typeof spawnSparks === 'function') {
      spawnSparks(spawnX, spawnY, '#F59E0B', 3);
    }
  }

  /**
   * CQC Brass Knuckles Punch Combat (Rule 6 Unified Queries & Rule 8 Frontal Arc Multi-Target)
   */
  _updateMeleeCombat(opponent, arena) {
    if (this.dead || this.isTypingCheat || this.isBaguvixActive) return;

    // ── 1. Rule 6 Unified Target Query: Find Closest Living Enemy Target ──
    let activeTarget = opponent;
    const myIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
    let minDist = (activeTarget && !activeTarget.dead && activeTarget.hp > 0)
      ? Math.hypot(activeTarget.x - this.x, activeTarget.y - this.y)
      : Infinity;

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        activeTarget = ent;
      }
    }

    if (!activeTarget || activeTarget.dead || activeTarget.hp <= 0) return;

    // ── 2. Reach & Aim Alignment (Rule 3) ──
    const cfg = CONFIG.cj || {};
    const reach = (cfg.meleePunchReach || 50) + (this.isJetpackActive ? 30 : 0);
    const distToTarget = Math.hypot(activeTarget.x - this.x, activeTarget.y - this.y);

    // Keep aim oriented toward the target
    if (typeof this.aim === 'function') {
      this.aim(activeTarget);
    }

    // Verify distance before executing punch strike
    if (distToTarget <= reach + (activeTarget.r || 20) && this.meleeCooldown <= 0) {
      // ── 3. Combo Step & Hand Alternation (Lead Jab vs Heavy Cross) ──
      this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
      this.punchAnimTimer = this.punchMaxTime;
      this.meleeCooldown = this.meleeCooldownMax;

      const isHeavyCross = (this.punchAnimHand === 1);
      const aimAngle = this.gunAngle || Math.atan2(activeTarget.y - this.y, activeTarget.x - this.x);

      // Kinetic Forward Step / Momentum Lunge
      const lungeStep = isHeavyCross ? 3.8 : 2.5;
      this.vx = (this.vx || 0) + Math.cos(aimAngle) * lungeStep;
      this.vy = (this.vy || 0) + Math.sin(aimAngle) * lungeStep;

      // ── 4. Rule 8 Frontal Arc Multi-Target AOE Detection ──
      const arc = cfg.meleePunchArc || ((120 * Math.PI) / 180);
      const hitEntities = [];

      for (const ent of allCandidates) {
        if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

        if (typeof state.getFighterTeam === 'function') {
          if (ent.owner) {
            const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
            if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
          } else {
            const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
            if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
          }
        }

        const edx = ent.x - this.x;
        const edy = ent.y - this.y;
        const edist = Math.hypot(edx, edy);

        if (edist <= reach + (ent.r || 20)) {
          const entAngle = Math.atan2(edy, edx);
          let angleDiff = Math.abs(entAngle - aimAngle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff <= arc / 2) {
            hitEntities.push(ent);
          }
        }
      }

      if (hitEntities.length === 0 && activeTarget && !activeTarget.dead) {
        hitEntities.push(activeTarget);
      }

      // ── 5. Apply Damage, Knockback, VFX & Respect to All Targets in Arc ──
      const basePunch = cfg.meleePunchDamage || 10;
      let baseDmg = isHeavyCross ? Math.round(basePunch * 1.25) : basePunch;
      if (this.isGroveStreetOg) {
        baseDmg = Math.round(baseDmg * (1 + (cfg.respectDamageBoost || 0.05)));
      }

      const baseKnock = cfg.meleeKnockback || 18.0;
      let baseKb = isHeavyCross ? Math.round(baseKnock * 1.22) : Math.round(baseKnock * 0.89);
      if (this.respect >= 50) {
        baseKb = Math.round(baseKb * (1 + (cfg.respectSpeedBoost || 0.05)));
      }

      for (const target of hitEntities) {
        if (typeof target.takeDamage === 'function') {
          target.takeDamage(baseDmg, this, { isMelee: true });
        }

        // Kinetic Pushback
        const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
        target.vx = (target.vx || 0) + Math.cos(kbAngle) * baseKb;
        target.vy = (target.vy || 0) + Math.sin(kbAngle) * baseKb;

        // Visual Spark FX & Impact Flash
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(target.x, target.y, isHeavyCross ? 34 : 26, '#F59E0B');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(target.x, target.y, '#FEF08A', isHeavyCross ? 8 : 5);
        }

        // Build Respect upon landing punches
        const respectGain = cfg.respectGainPerPunch || 2;
        this.gainRespect(respectGain);
      }

      // Micro Screen Shake
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(isHeavyCross ? 6 : 3, isHeavyCross ? 6 : 4);
      }

      // Punch Audio SFX
      const punchSounds = CONFIG.cj?.sounds?.punchHit || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
      const soundFile = Array.isArray(punchSounds) ? punchSounds[Math.floor(Math.random() * punchSounds.length)] : punchSounds;
      const punchVol = CONFIG.cj?.soundVolumes?.punchHit !== undefined ? CONFIG.cj.soundVolumes.punchHit : 0.80;
      audioSystem.playSFX(soundFile, isHeavyCross ? punchVol * 1.2 : punchVol);
    }
  }

  /**
   * Demo attack trigger for Weapon Studio & Weapon Preview Screen
   */
  triggerDemoAttack() {
    const activeIndex = (typeof state !== 'undefined' && state.cjWeaponIndex !== undefined)
      ? state.cjWeaponIndex
      : (this.previewWeaponIndex || 0);

    if (activeIndex === 0) {
      // 1. Brass Knuckles Punch Combo
      this.punchAnimTimer = this.punchMaxTime;
      this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
      this.meleeCooldown = this.meleeCooldownMax;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.85);
    } else if (activeIndex === 1) {
      // 2. Jetpack Rocket Ignition Burst
      audioSystem.playSFX('Assets/Sound Effects/Attacks/flamespray1.mp3', 0.85);
      audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.90);
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(this.x, this.y, 50, '#38BDF8');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x, this.y, '#FBBF24', 18);
      }
    } else if (activeIndex === 2) {
      // 3. Dual Micro-Uzi Rapid Fire Burst
      this.uziFlashTimerFront = 6;
      this.uziFlashTimerBack = 6;
      this.uziRecoilFront = 6.0;
      this.uziRecoilBack = 6.0;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/revolvershot.mp3', 0.80);
      if (typeof spawnSpentCasing === 'function') {
        spawnSpentCasing(this.x, this.y, this.gunAngle || 0, '9mm', this.r);
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x + 30, this.y, 8, 'gold', '#F59E0B');
      }
    } else if (activeIndex === 3) {
      // 4. M134 Minigun Overdrive Barrage
      this.minigunFlashTimer = 12;
      this.minigunRecoil = 7.5;
      this.minigunSpinAngle = (this.minigunSpinAngle || 0) + Math.PI * 0.8;
      this.minigunHeat = 0.8;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/spaceshot.mp3', 0.85);
      audioSystem.playSFX('Assets/Sound Effects/Attacks/revolvershot.mp3', 0.70);
      if (typeof spawnSpentCasing === 'function') {
        spawnSpentCasing(this.x, this.y, this.gunAngle || 0, '762minigun', this.r);
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(this.x + 40, this.y, 45, '#F59E0B');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x + 40, this.y, 12, 'gold', '#FEF08A');
      }
    } else {
      // 5. Intratec TEC-9 Submachine Gun Burst
      audioSystem.playSFX('Assets/Sound Effects/Attacks/revolvershot.mp3', 0.85);
      audioSystem.playSFX('Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3', 0.70);
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3', 0.50);
      if (typeof spawnSpentCasing === 'function') {
        spawnSpentCasing(this.x, this.y, this.gunAngle || 0, '9mm', this.r);
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(this.x + 40, this.y, 45, '#F59E0B');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x + 40, this.y, 10, 'gold', '#FEF08A');
      }
    }
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
  }

  /**
   * Basic Attack Shoot Override
   * Pure melee brawler: disables default gun projectiles during basic attacks.
   */
  shoot(ownerIndex) {
    return false;
  }

  /**
   * Draw Health Number Overlay (Anchored to elevated body when flying)
   */
  drawHealth(ctx) {
    if (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'faceoff' || state.gameState === 'faceOff' || state.gameState === 'faceOffThumbnail')) return;
    if (this.hp <= 0 || this._isWinnerReveal || this._isFaceOff || (this.hideHpText && typeof state !== 'undefined' && state.gameState !== 'playing')) return;

    const z = this.z || 0;
    const drawY = this.y - z;
    ctx.save();

    // 1. Floating Name on TOP of the Fighter Body Circle (Hidden in FOC mode)
    const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));
    if (this.name && isTactical && !this.hideFloatingName && !this.hideName) {
      const nameText = this.name.toUpperCase();
      const nameY = drawY - this.r - 8;
      const themeColor = this.themeColor || this.color || '#ffffff';

      ctx.font = 'bold 11px "Outfit", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeText(nameText, this.x, nameY);
      ctx.fillStyle = themeColor;
      ctx.fillText(nameText, this.x, nameY);
    }

    // 2. Health Number underneath the body
    const hpY = drawY + (this.r || 25) + 4;
    ctx.font = '700 13px "Silkscreen", "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const hpText = Math.floor(this.hp).toString();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeText(hpText, this.x, hpY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, this.x, hpY);
    ctx.restore();
  }

  /**
   * Draw CJ skin & Body HP Overlay
   */
  drawBody(ctx) {
    drawCjSkin(ctx, this);
    this.drawHealth(ctx);
  }

  draw(ctx, opponent) {
    drawCjSkin(ctx, this);
    this.drawHealth(ctx);
  }
}
