import { fadeOutLoopingSound, stopLoopingSound, fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';
import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnTelekinesisDebris, spawnArcaneCrater, spawnArcaneSmoke, spawnArcaneShockwave, spawnArcaneFlash, spawnArcaneGlyphs, spawnSpellStealWisps, spawnGojoRedFrontalBlast } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { spawnBerserkerRageEffect } from '../../graphics/particles/berserkerRageEffect.js';
import { drawRubbickStaff, drawRubbickChargeEffect, getRubbickStaffTip } from '../../graphics/weapons/rubbickWeaponGraphics.js';
import { updateStolenRubyHook, updateStolenCronosSphere, resolveStolenCronosWallBounce } from './rubbick/rubbickStealLogic.js';
import { getStolenMultiplier, STOLEN_SKILL_CONFIG } from './rubbick/stolenSkillConfig.js';
import { RubbickRubyTheme, RubbickCronosTheme, isInsideEnemyGojoDomain } from './rubbick/rubbickThemes.js';
import { drawRubyScythe } from '../../graphics/weapons/rubyWeaponGraphics.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { drawRubbickSkin, drawRubbickGhostModel, drawRubbickPixelDebrisLayer } from '../../graphics/fighters/rubbickSkin.js';
import { renderRubbickDomainBackground } from './gojo/gojoDomainVisuals.js';

export class RubbickFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Initial hovering state for correct display before first update()
    this.z = 25;
    
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = (CONFIG.rubbick || CONFIG.trickster).spellStealCooldown;

    // Telekinesis state
    this.tkTarget = null;
    this.tkTimer = 0;
    this.tkOriginalScale = 1;

    // Spell Steal state
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenWindUpTimer = 0;
    this.rubbickRageTimer = 0;
    
    // Laser state
    this.beamCharge = 0;
    this.beamTimer = 0;
    this.beamHitState = new Map();
    
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    
    this.stormActive = false;
    this.stormTimer = 0;
    this.stormLastStrikeTimer = 0;
    
    // For specific stolen skills that need internal cooldowns
    this.stolenSkillCooldown = 0;
    
    // Pseudo-random helper to keep debris consistent across instantiations (for UI screens)
    const prng = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Permanent orbiting magical debris
    this.orbitingDebris = [];
    for (let i = 0; i < 6; i++) {
      this.orbitingDebris.push({
        baseAngle: (i / 6) * Math.PI * 2,
        dist: 50 + prng(i * 1.1) * 14, // 50px to 64px orbit radius (clears 25px body radius)
        speed: 0.015 + prng(i * 2.2) * 0.02,
        size: 5 + prng(i * 3.3) * 4,
        baseRotation: prng(i * 4.4) * Math.PI * 2,
        rotationSpeed: (prng(i * 5.5) - 0.5) * 0.04,
        color: `rgba(${40 + prng(i * 6.6) * 30}, ${220 + prng(i * 7.7) * 35}, ${120 + prng(i * 8.8) * 40}, 1)`,
        baseZPhase: prng(i * 9.9) * Math.PI * 2,
        zSpeed: 0.02 + prng(i * 10.1) * 0.03
      });
    }
  }

  reset() {
    super.reset();
    this.z = 25;
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = (CONFIG.rubbick || CONFIG.trickster).spellStealCooldown;
    this.tkTarget = null;
    this.tkTimer = 0;
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenSkillCooldown = 0;
    this.rubbickRageTimer = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    this.activePullActive = false;
    this.activePullPhase = -1;
    this.activePullPhaseTimer = 0;
    this.activePullAngle = 0;
    this.pullTargets = [];
    this.primaryHookTarget = null;
    
    this.stormActive = false;
    this.stormTimer = 0;
    this.stormLastStrikeTimer = 0;
    
    // Phase durations (frames)
    this.pullPhaseWindUp = 14;
    this.pullPhaseSwingOut = 10;
    this.pullPhaseHookGrab = 3;
    this.pullPhasePullDrag = 25;
    this.pullPhaseDisengage = 12;

    if (this.tkTarget) {
      this.tkTarget.isCaughtInTelekinesis = false;
      this.tkTarget.isParalyzed = false;
      this.tkTarget.z = 0;
      this.tkTarget = null;
    }
  }

  interruptAttacks() {
    super.interruptAttacks();
    this.stolenWindUpTimer = 0;
    this.activePullActive = false;
    this.activePullPhase = -1;
    this.pullTargets = [];
    this.beamCharge = 0;
    this.beamTimer = 0;
    this.stormActive = false;
    
    if (this.tkTarget) {
      this.tkTarget.isCaughtInTelekinesis = false;
      this.tkTarget.isParalyzed = false;
      this.tkTarget.z = 0;
      this.tkTarget = null;
      this.tkTimer = 0;
    }

    // Stop the laser sound immediately if it's playing
    if (this._isLaserSoundPlaying && this._laserSoundKey) {
      fadeOutLoopingSound(this._laserSoundKey, 100);
      this._isLaserSoundPlaying = false;
    }
  }

  /**
   * Silences and cuts off active skill/channeling audio on a target when caught in Telekinesis.
   */
  _silenceTargetAudio(target) {
    if (!target) return;

    // 1. Cut off character-specific channeling audio handles & looping sounds
    if (target._purpleChargeSoundHandle) {
      fadeOutSound(target._purpleChargeSoundHandle, 100);
      target._purpleChargeSoundHandle = null;
    }
    if (target._domainSoundHandle) {
      fadeOutSound(target._domainSoundHandle, 100);
      target._domainSoundHandle = null;
    }
    if (target.fugaSoundKey) {
      try { stopLoopingSound(target.fugaSoundKey); } catch (e) {}
      target.fugaSoundKey = null;
    }
    if (typeof target._stopBeamAudio === 'function') target._stopBeamAudio();
    if (typeof target._stopChannelAudio === 'function') target._stopChannelAudio();
    if (typeof target._stopFinalGetsugaVoiceline === 'function') target._stopFinalGetsugaVoiceline(true);
    if (typeof target._stopAllSounds === 'function') target._stopAllSounds();

    // 2. Cut off active skill charge/channel audio sources across fighters
    fadeOutSoundBySrc('mixing', 100);
    fadeOutSoundBySrc('purplecharge', 100);
    fadeOutSoundBySrc('purpledeploy', 100);
    fadeOutSoundBySrc('redcharging', 100);
    fadeOutSoundBySrc('redchanneling', 100);
    fadeOutSoundBySrc('domain', 100);
    fadeOutSoundBySrc('fuga', 100);
    fadeOutSoundBySrc('divine_flame', 100);
    fadeOutSoundBySrc('stormstrike', 100);
    fadeOutSoundBySrc('charging', 100);
    fadeOutSoundBySrc('charge', 100);
    fadeOutSoundBySrc('laser', 100);
    fadeOutSoundBySrc('beam', 100);
    fadeOutSoundBySrc('incineration', 100);
    fadeOutSoundBySrc('cero', 100);
    fadeOutSoundBySrc('getsuga', 100);
    fadeOutSoundBySrc('bankai', 100);
  }

  /**
   * Universally and completely cancels any active skill channeling, ultimate charging,
   * transformations, or cast windups on a target caught in Telekinesis.
   * Forces a full attack interruption (forceCancelAll = true), clears lingering attack effects,
   * puts interrupted skills on penalty cooldowns, and terminates all active audio loops/handles.
   *
   * @param {Object} target - The enemy fighter/illusion being lifted or slammed by Telekinesis
   * @param {boolean} isInitial - Whether this is the initial lift/interruption (spawns visual text)
   */
  _cancelTargetChanneling(target, isInitial = true) {
    if (!target || target.hp <= 0 || target.isDead) return;

    // Detect if target is actively channeling, charging, or casting any ability (capture before interruptAttacks resets them)
    const wasChannelingPurple = Boolean(target.isChannelingPurple || (target.purpleChargeTimer && target.purpleChargeTimer > 0));
    const wasChannelingDomain = Boolean(target.isChannelingDomainExpansion || target.isChannelingDomain || (target.domainChargeTimer && target.domainChargeTimer > 0));
    const wasChannelingRed = Boolean((target.redEffectTimer && target.redEffectTimer > 0) || target.redBuildupPhase);
    const wasChannelingRCT = Boolean(target.isChannelingRCT || (target.rctChannelTimer && target.rctChannelTimer > 0));
    const wasChannelingDivineFlame = Boolean(target.isChannelingDivineFlame || (target.divineFlameChargeTimer && target.divineFlameChargeTimer > 0) || (target.fugaTimer && target.fugaTimer > 0));
    const wasChannelingPureLoveBeam = Boolean(target.isChannelingPureLoveBeam || (target.pureLoveBeamChargeTimer && target.pureLoveBeamChargeTimer > 0) || target.isFiringPureLoveBeam || (target.pureLoveBeamActiveTimer && target.pureLoveBeamActiveTimer > 0) || (target.rikaEmergingForBeamTimer && target.rikaEmergingForBeamTimer > 0) || (target.rikaCallTimer && target.rikaCallTimer > 0));
    const wasChannelingThinIce = Boolean(target.isChannelingThinIceBreaker || (target.thinIceBreakerChargeTimer && target.thinIceBreakerChargeTimer > 0));
    const wasChannelingMahoraga = Boolean(target.isChannelingMahoraga || (target.mahoragaChannelTimer && target.mahoragaChannelTimer > 0));
    const wasChannelingCero = Boolean(target.isChargingCero || (target.ceroChargeTimer && target.ceroChargeTimer > 0));
    const wasChannelingBow = Boolean(target.isDrawingBow || (target.arrowDrawTimer && target.arrowDrawTimer > 0) || target.isDeployingSprenger || target.isSkywardWindup || target.isSkywardAscending || target.isFlurrying);
    const wasChannelingGenosUlt = Boolean(target.isChargingUlt || target.isFiringUlt || (target.ultTimer && target.ultTimer > 0));
    const wasChannelingLaylaUlt = Boolean(target.isUltimateCharging || target.isUltimateFiring || (target.ultimateWindupTimer && target.ultimateWindupTimer > 0) || (target.ultimateFireTimer && target.ultimateFireTimer > 0));
    const wasChannelingLaser = Boolean((target.beamTimer && target.beamTimer > 0) || target.isFiringLaser || target.isChannelingBeam || (target.beamCharge && target.beamCharge > 0));
    const wasChannelingStorm = Boolean(target.stormActive || (target.stormTimer && target.stormTimer > 0));
    const wasChannelingSphere = Boolean(target.sphereActive || (target.sphereImpactTimer && target.sphereImpactTimer > 0));
    const wasChannelingBlackFlash = Boolean(target.isChannelingBlackFlash || (target.blackFlashChannelTimer && target.blackFlashChannelTimer > 0));
    const wasChannelingGetsuga = Boolean(target.isChargingGetsuga || target.isChannelingGetsuga || (target.getsugaChargeTimer && target.getsugaChargeTimer > 0));
    const wasChannelingBankai = Boolean(target.isChannelingBankai || (target.bankaiChargeTimer && target.bankaiChargeTimer > 0) || (target.hollowMaskFormationTimer && target.hollowMaskFormationTimer > 0) || (target.hollowBurstTimer && target.hollowBurstTimer > 0));
    const wasChannelingSeriousPunch = Boolean(target.isChargingSeriousPunch || (target.seriousPunchChargeTimer && target.seriousPunchChargeTimer > 0));

    const wasChanneling = wasChannelingPurple || wasChannelingDomain || wasChannelingRed || wasChannelingRCT ||
      wasChannelingDivineFlame || wasChannelingPureLoveBeam || wasChannelingThinIce || wasChannelingMahoraga ||
      wasChannelingCero || wasChannelingBow || wasChannelingGenosUlt || wasChannelingLaylaUlt || wasChannelingLaser ||
      wasChannelingStorm || wasChannelingSphere || wasChannelingBlackFlash || wasChannelingGetsuga || wasChannelingBankai ||
      wasChannelingSeriousPunch || target.isSubmerged || target.isErupting || target.activePullActive || target.passiveSpinActive ||
      (typeof target.isChannelingAnySkill === 'function' && target.isChannelingAnySkill());

    // 1. Force interrupt all attacks and channeling abilities (passing true forces hyper-armor bypass)
    if (typeof target.interruptAttacks === 'function') {
      target.interruptAttacks(true);
    }
    if (typeof target.clearAllAttackEffects === 'function') {
      target.clearAllAttackEffects();
    }
    if (typeof target.clearAllAfterimages === 'function') {
      target.clearAllAfterimages();
    }

    // 2. Silence all channeling audio loops and handles
    this._silenceTargetAudio(target);

    // 3. Apply standard penalty cooldowns (4.5s / 270 frames) so interrupted abilities cannot immediately recast
    const penaltyCD = 270;
    if (wasChannelingPurple) {
      if (target.purpleCooldown !== undefined) target.purpleCooldown = Math.max(target.purpleCooldown || 0, penaltyCD);
    }
    if (wasChannelingDomain) {
      if (target.domainCooldown !== undefined) target.domainCooldown = Math.max(target.domainCooldown || 0, penaltyCD + 30);
    }
    if (wasChannelingRed) {
      if (target.redCooldown !== undefined) target.redCooldown = Math.max(target.redCooldown || 0, penaltyCD);
    }
    if (wasChannelingRCT) {
      if (target.reverseCursedTechniqueCooldown !== undefined) target.reverseCursedTechniqueCooldown = Math.max(target.reverseCursedTechniqueCooldown || 0, penaltyCD);
    }
    if (wasChannelingDivineFlame) {
      if (target.divineFlameCooldown !== undefined) target.divineFlameCooldown = Math.max(target.divineFlameCooldown || 0, penaltyCD);
    }
    if (wasChannelingPureLoveBeam) {
      if (target.pureLoveBeamCooldownTimer !== undefined) target.pureLoveBeamCooldownTimer = Math.max(target.pureLoveBeamCooldownTimer || 0, penaltyCD);
      if (target.pureLoveBeamCooldown !== undefined) target.pureLoveBeamCooldown = Math.max(target.pureLoveBeamCooldown || 0, penaltyCD);
    }
    if (wasChannelingThinIce) {
      if (target.techniqueCooldown !== undefined) target.techniqueCooldown = Math.max(target.techniqueCooldown || 0, 180);
      if (target.thinIceCooldown !== undefined) target.thinIceCooldown = Math.max(target.thinIceCooldown || 0, 180);
    }
    if (wasChannelingGetsuga) {
      if (target.getsugaCooldown !== undefined) target.getsugaCooldown = Math.max(target.getsugaCooldown || 0, penaltyCD);
    }
    if (wasChannelingGenosUlt) {
      if (target.ultCooldown !== undefined) target.ultCooldown = Math.max(target.ultCooldown || 0, penaltyCD);
    }
    if (wasChannelingLaylaUlt) {
      if (target.destructionBarrageCooldown !== undefined) target.destructionBarrageCooldown = Math.max(target.destructionBarrageCooldown || 0, penaltyCD);
    }
    if (wasChannelingLaser) {
      if (target.shootCooldown !== undefined) target.shootCooldown = Math.max(target.shootCooldown || 0, penaltyCD);
    }
    if (wasChannelingStorm) {
      if (target.stormCooldown !== undefined) target.stormCooldown = Math.max(target.stormCooldown || 0, penaltyCD);
    }
    if (wasChannelingSphere) {
      if (target.sphereCooldown !== undefined) target.sphereCooldown = Math.max(target.sphereCooldown || 0, penaltyCD);
    }

    // 4. Force reset character-specific channeling state variables
    target.isChannelingPurple = false;
    target.purpleChargeTimer = 0;
    target.purpleRecoveryTimer = 0;
    target.isChannelingDomainExpansion = false;
    target.isChannelingDomain = false;
    target.domainChargeTimer = 0;
    target.isDomainPreSlide = false;
    target.domainPreSlideTimer = 0;
    target.redEffectTimer = 0;
    target.redBuildupPhase = false;
    target.redDetonated = false;
    target.isChannelingRCT = false;
    target.rctChannelTimer = 0;

    target.isChannelingDivineFlame = false;
    target.divineFlameChargeTimer = 0;
    target.divineFlameRecoveryTimer = 0;
    target.fugaTimer = 0;
    target.cleaveCutTimer = 0;

    target.isChannelingPureLoveBeam = false;
    target.pureLoveBeamChargeTimer = 0;
    target.isFiringPureLoveBeam = false;
    target.pureLoveBeamActiveTimer = 0;
    target.beamRetreatSlideTimer = 0;
    target.rikaEmergingForBeamTimer = 0;
    target.rikaCallTimer = 0;
    target.isChannelingThinIceBreaker = false;
    target.thinIceBreakerChargeTimer = 0;

    target.isChannelingMahoraga = false;
    target.mahoragaChannelTimer = 0;
    target.isSubmerged = false;
    target.submergeTimer = 0;
    target.isErupting = false;
    target.eruptTimer = 0;

    target.isChargingCero = false;
    target.ceroChargeTimer = 0;
    target.isSonidoDashing = false;

    target.isDrawingBow = false;
    target.arrowDrawTimer = 0;
    target.isDeployingSprenger = false;
    target.isSkywardWindup = false;
    target.isSkywardAscending = false;
    target.isFlurrying = false;
    target.burstRemaining = 0;
    target.drawPhase = 'IDLE';

    target.isChargingUlt = false;
    target.isFiringUlt = false;
    target.ultTimer = 0;
    target.speedBoostTimer = 0;

    target.isUltimateCharging = false;
    target.isUltimateFiring = false;
    target.ultimateWindupTimer = 0;
    target.ultimateFireTimer = 0;
    target.isDashing = false;
    target.dashTimer = 0;

    target.beamTimer = 0;
    target.isFiringLaser = false;
    target.isChannelingBeam = false;
    target.beamCharge = 0;

    target.stormActive = false;
    target.stormTimer = 0;

    target.sphereActive = false;
    target.sphereImpactTimer = 0;

    target.activePullActive = false;
    target.activePullPhase = -1;
    target.activePullPhaseTimer = 0;
    target.pullTargets = [];
    target.passiveSpinActive = false;
    target.passiveSpinTimer = 0;

    target.isChannelingBlackFlash = false;
    target.blackFlashChannelTimer = 0;
    target.isBlitzing = false;
    target.isLunging = false;

    target.isChannelingGetsuga = false;
    target.isChargingGetsuga = false;
    target.getsugaChargeTimer = 0;
    target.getsugaSlideTimer = 0;
    target.getsugaRecoveryTimer = 0;
    target.isGetsugaSlash = false;
    target.isChannelingBankai = false;
    target.bankaiChargeTimer = 0;
    target.bankaiSlideTimer = 0;
    target.bankaiBurstTimer = 0;
    target.shikaiReversionBurstTimer = 0;
    target.hollowMaskFormationTimer = 0;
    target.hollowBurstTimer = 0;
    target.isFinalMassiveGetsuga = false;
    target.isFinalGetsugaRecovery = false;
    target.shunpoComboActive = false;
    target.isShunpoDashing = false;

    target.isChargingSeriousPunch = false;
    target.seriousPunchChargeTimer = 0;
    target.isCountering = false;
    target.caughtInSaitamaCounter = false;

    // 5. Visual cancellation feedback text
    if (wasChanneling && isInitial) {
      spawnFloatingText(target.x, target.y - (target.r || 25) - 28, 'CHANNELING CANCELED!', '#FF3366', 16);
      spawnSparks(target.x, target.y, 8, 'arcane');
    }
  }

  getBeamLine() {
    // Rubbick staff tip is roughly r + 75 away
    const tipDist = this.r + 75;
    const startX = this.x + Math.cos(this.gunAngle) * tipDist;
    const startY = this.y + Math.sin(this.gunAngle) * tipDist;
    const beamLength = CONFIG.laser.beamLength;
    const endX = startX + Math.cos(this.gunAngle) * beamLength;
    const endY = startY + Math.sin(this.gunAngle) * beamLength;

    return { startX, startY, endX, endY };
  }

  getBeamHitFighters(fighters) {
    if (!fighters || fighters.length === 0) return [];

    const { startX, startY, endX, endY } = this.getBeamLine();
    const dx = endX - startX;
    const dy = endY - startY;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return [];

    const hitFighters = [];

    for (let fi = 0; fi < fighters.length; fi++) {
      const fighter = fighters[fi];
      if (!fighter || fighter === this || fighter.hp <= 0) continue;

      let t = ((fighter.x - startX) * dx + (fighter.y - startY) * dy) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = startX + t * dx;
      const projY = startY + t * dy;
      const distToCenter = Math.hypot(fighter.x - projX, fighter.y - projY);

      if (distToCenter <= fighter.r + 4) {
        hitFighters.push(fighter);
      }
    }

    return hitFighters;
  }

  takeDamage(amount, attacker, opts = {}) {
    const tookDamage = super.takeDamage(amount, attacker, opts);
    if (tookDamage && amount > 0) {
      if (this.stolenType === 'berserker') {
        const rageGain = amount * (CONFIG.berserker.rageFromDamageScale || 2);
        this.rage = Math.min(CONFIG.berserker.maxRage || 100, (this.rage || 0) + rageGain);
        
        if (this.rage >= (CONFIG.berserker.maxRage || 100) && !this.isInRage) {
          this.isInRage = true;
          this.rageTimer = CONFIG.berserker.rageDuration || 480;
          this.rage = 0;
        }
      }
    }
    return tookDamage;
  }

  applyBeamEffectsToTarget(target, ownerIndex) {
    if (!target || target === this) return;

    target.caughtInLaserBeamTimer = 10;

    let hitState = this.beamHitState.get(target);
    if (!hitState) {
      hitState = { initialHitDone: false, continuousDamageTimer: 0 };
      this.beamHitState.set(target, hitState);
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Use a damage multiplier for stolen skills if necessary, but rubbick usually borrows raw config for beam
    const dmgMulti = getStolenMultiplier('laser', 'damageMultiplier');

    if (!hitState.initialHitDone) {
      const applied = target.takeDamage(this.damage * dmgMulti, this, { isProjectile: true, isLaser: true });
      if (applied) {
        const slowChance = Number(CONFIG.laser.slowChance || 1);
        if (slowChance >= 1 || Math.random() <= slowChance) {
          // Default beam slow duration and multiplier if rubbick doesn't define it
          target.applySlow(CONFIG.laser.beamSlowDuration || 60, CONFIG.laser.beamSlowMultiplier || 0.4);
          spawnFloatingText(target.x, target.y - target.r - 5, 'SLOWED!', '#88ccff');
        }

        const startPush = Number(CONFIG.laser.initialKnockback) || 0;
        if (startPush !== 0) {
          target.vx += (dx / dist) * startPush;
          target.vy += (dy / dist) * startPush;
        }

        hitState.initialHitDone = true;
        spawnFloatingText(target.x, target.y - target.r - 5, 'BEAM HIT!', '#00ff00');

        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: this.damage * dmgMulti, isLaser: true }, ownerIndex);
        }
      }
      return;
    }

    hitState.continuousDamageTimer++;
    if (hitState.continuousDamageTimer >= CONFIG.laser.tickInterval) {
      const applied = target.takeDamage(CONFIG.laser.tickDamage * dmgMulti, this, { isProjectile: true, isLaser: true });
      if (applied) {
        const pushStrength = Number(CONFIG.laser.initialKnockback) || 0;
        if (pushStrength !== 0) {
          target.vx += (dx / dist) * pushStrength;
          target.vy += (dy / dist) * pushStrength;
        }

        spawnFloatingText(target.x, target.y - target.r - 5, 'ZZZAP!', '#aaffaa');
        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: CONFIG.laser.tickDamage * dmgMulti, isLaser: true }, ownerIndex);
        }
      }
      hitState.continuousDamageTimer = 0;
    }
  }

  _processStolenStorm(ownerIndex) {
    this.stormLastStrikeTimer++;
    const interval = Math.floor(60 / (CONFIG.zeus.stormStrikesPerSec || 3));
    
    if (this.stormLastStrikeTimer >= interval) {
      this.stormLastStrikeTimer = 0;
      
      if (state && state.fighters) {
        const myTeam = state.getFighterTeam(ownerIndex);

        state.fighters.forEach((f, idx) => {
          if (f && f !== this && f.hp > 0) {
            const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
            if (isEnemy) this._strikeEnemyWithStolenStorm(f);
          }
        });
        
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && ill.hp > 0 && ill.owner !== this) {
              const illOwnerTeam = state.getFighterTeam(state.fighters.indexOf(ill.owner));
              const isEnemy = myTeam === null || illOwnerTeam !== myTeam;
              if (isEnemy) this._strikeEnemyWithStolenStorm(ill);
            }
          });
        }
      }
    }
  }

  _strikeEnemyWithStolenStorm(target) {
    const dmgMulti = getStolenMultiplier('zeus', 'damageMultiplier');
    let damage = (CONFIG.zeus.stormStrikeDamage || 15) * dmgMulti;
    
    target.takeDamage(damage, this, { isStorm: true });
    
    if (target.applySlow) {
      target.applySlow(CONFIG.zeus.paralyzeDuration || 30, CONFIG.zeus.paralyzeSlowMultiplier || 0.5);
    }
    
    triggerGlobalScreenShake(CONFIG.zeus.stormStrikeShakeIntensity || 4, CONFIG.zeus.stormStrikeShakeFrames || 10);
    spawnImpactFlash(target.x, target.y, 50, 'ghostTrail');
    spawnSparks(target.x, target.y, 10, 'arcane');
    
    const stormSound = getSkillSound(99, 'storm');
    if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.6);

    const thunderSound = getSkillSound('zeus', 'thunderstrike');
    if (thunderSound) audioSystem.playSFX(thunderSound.src, (thunderSound.volume || 1.0) * 0.6);
    
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    state.zeusStormStrikes.push({
      x: target.x,
      y: target.y,
      life: 15,
      maxLife: 15,
      color: 'green'
    });
  }

  update(opponent, ownerIndex, arena) {
    // Visual hovering effect: dynamically adjust the Z coordinate
    // Float high enough (25+ pixels) so the shadow is clearly visible beneath the character's body!
    this.z = 25 + Math.sin(Date.now() / 200) * 6;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();
    
    const isTimeStopped = this._handleTimeStop();
    if (typeof this._updateStaffTrail === 'function') this._updateStaffTrail(isTimeStopped);
    if (isTimeStopped) return;
    // Clear Berserker Rage if the buff faded or changed
    if (this.stolenType !== 'berserker') {
      this.rage = 0;
      this.rageTimer = 0;
      this.rageFadeTimer = 0;
      this.isInRage = false;
      this.berserkerRageActivated = false;
    }

    // Handle stolen Berserker Rage
    if (this.stolenType === 'berserker' && this.isInRage) {
      this.rageTimer--;

      if (!this.berserkerRageActivated) {
        this.berserkerRageActivated = true;
        spawnFloatingText(this.x, this.y - this.r - 10, 'ARCANE RAGE!', '#00ff64');
        triggerGlobalScreenShake(12, 8);
        if (typeof spawnBerserkerRageEffect === 'function') {
          spawnBerserkerRageEffect(this, '#00ff64', '#00cc50');
        }
      }

      this.speed = this.baseSpeed * (CONFIG.berserker.rageMoveSpeedMultiplier || 2.0);
      
      // Spawn green afterimages (motion trails) while in rage
      if (this.rageTimer % 3 === 0) {
        if (!this.afterImages) this.afterImages = [];
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          gunAngle: this.gunAngle,
          timer: 15,
          color: '#00ff64'
        });
      }

      if (this.rageTimer <= 0) {
        this.isInRage = false;
        this.berserkerRageActivated = false;
        this.rageFadeTimer = 45;
        this.speed = this.baseSpeed;
        spawnFloatingText(this.x, this.y - this.r - 15, 'RAGE ENDED', '#aaa');
      }
    } else {
      if (this.rageFadeTimer > 0) this.rageFadeTimer--;
      this.berserkerRageActivated = false;
      this.speed = this.baseSpeed;
    }

    // Stolen Zeus Storm Logic
    if (this.stormActive) {
      this.stormTimer--;
      this._processStolenStorm(ownerIndex);
      if (this.stormTimer <= 0) {
        this.stormActive = false;
        spawnFloatingText(this.x, this.y - this.r - 10, 'STORM ENDED', '#aaa');
      }
    }

    // Stolen Laser Logic
    if (this.beamTimer > 0) {
      this.beamTimer--;
      
      // Continuous screen shake while firing
      triggerGlobalScreenShake(6, 5);

      // Beam angle remains strictly locked in the direction it was fired; no auto-aim while firing

      // Check all valid targets
      const allTargets = state.fighters.concat(state.illusions || []);
      const hitFighters = this.getBeamHitFighters(allTargets);
      for (const fighter of hitFighters) {
        this.applyBeamEffectsToTarget(fighter, ownerIndex);
      }

      // Drift slowly backward while firing
      const backwardSpeed = Number(CONFIG.laser.beamBackwardSpeed) || 0;
      const beamRecoilX = -Math.cos(this.gunAngle) * backwardSpeed;
      const beamRecoilY = -Math.sin(this.gunAngle) * backwardSpeed;
      const retention = Number(CONFIG.laser.beamDriftRetention) || 0.92;
      const blend = Number(CONFIG.laser.beamDriftBlend) || 0.08;

      this.vx = this.vx * retention + beamRecoilX * blend;
      this.vy = this.vy * retention + beamRecoilY * blend;

      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);
      return; // Skip normal update when firing laser
    }

    // Stop laser sound if beam ends
    if (this.beamTimer === 0 && this._isLaserSoundPlaying) {
      if (this._laserSoundKey) fadeOutLoopingSound(this._laserSoundKey, 100);
      this._isLaserSoundPlaying = false;
    }

    // Charge the laser
    if (this.stolenType === 'laser' && this.stolenSkillCooldown <= 0) {
      if (opponent) {
        if (this.beamCharge === 0) {
          this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          const chargeSound = getSkillEffectSound('solarchampion', 'lasercharge');
          if (chargeSound) audioSystem.playSFX(chargeSound.src, chargeSound.volume);
        }
        
        this.beamCharge = Math.min(this.beamCharge + 1, CONFIG.laser.windupDuration);

        if (this.beamCharge >= CONFIG.laser.windupDuration) {
          this.beamTimer = CONFIG.laser.beamDuration;
          this.stolenSkillCooldown = 300 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
          this.beamHitState.clear();
          this.beamCharge = 0;
          
          triggerGlobalScreenShake(15, 20);

          if (!this._laserSoundKey) {
            this._laserSoundKey = `ivory-laser-${ownerIndex}`;
          }
          if (!this._isLaserSoundPlaying) {
            const sound = getBasicAttackSound('laser', 'laser'); // Assuming LaserFighter uses this for its beam sound
            if (sound) audioSystem.playLoop(this._laserSoundKey, sound.src, sound.volume);
            this._isLaserSoundPlaying = true;
          }

          // Small backward knockback when beam starts
          const kickback = CONFIG.laser.beamStartKnockback || 0;
          this.vx += -Math.cos(this.gunAngle) * kickback;
          this.vy += -Math.sin(this.gunAngle) * kickback;
        }
      } else {
        this.beamCharge = Math.max(this.beamCharge - 1, 0);
      }
    } else {
       this.beamCharge = Math.max(this.beamCharge - 1, 0);
    }

    // Phantom Flurry Execution Logic
    if (this.flurryHitsLeft > 0) {
       this.vx *= 0.1;
       this.vy *= 0.1;
       
       if (this.flurryTimer > 0) this.flurryTimer--;
       if (this.flurryTimer <= 0) {
         if (this.flurryHitsLeft <= 0) {
           this.flurryGhost = null;
           this.flurryTarget = null;
           return;
         }

         this.flurryHitsLeft--;
         this.flurryTimer = 6;
         
         let possibleTargets = state.fighters.filter(f => f && f !== this && f.hp > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 450);
         if (state.illusions) {
           possibleTargets = possibleTargets.concat(state.illusions.filter(ill => ill && ill.hp > 0 && Math.hypot(ill.x - this.x, ill.y - this.y) < 450));
         }
         
         if (possibleTargets.length > 0) {
            this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
         }

         if (this.flurryTarget && !this.flurryTarget.isDead) {
            this.strikeAngle = Math.random() * Math.PI * 2;
            
            const flurryDmg = ((CONFIG.rubbick || CONFIG.trickster)?.flurryDamage || 10) * getStolenMultiplier('musashi', 'damageMultiplier');
            this.flurryTarget.takeDamage(flurryDmg, this, { isMelee: true });
            if (typeof this.flurryTarget.applyHitStun === 'function') this.flurryTarget.applyHitStun(15);
            
            spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#fff');
            
            triggerGlobalScreenShake(6, 6);
            spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 10, 'flash');

            const angle = Math.random() * Math.PI * 2;
            const dist = this.flurryTarget.r + this.r + 10;
            const oldX = this.x;
            const oldY = this.y;
            this.x = this.flurryTarget.x + Math.cos(angle) * dist;
            this.y = this.flurryTarget.y + Math.sin(angle) * dist;
            this.gunAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);

            if (!this.afterImages) this.afterImages = [];
            const teleportDist = Math.hypot(this.x - oldX, this.y - oldY);
            const numImages = Math.max(3, Math.floor(teleportDist / 12));
            for (let i = 0; i <= numImages; i++) {
              const t = i / numImages;
              pushTrailCap(this.afterImages, {
                x: oldX + (this.x - oldX) * t,
                y: oldY + (this.y - oldY) * t,
                timer: 15,
                r: this.r,
                gunAngle: this.gunAngle
              });
            }

            if (typeof this.flurryTarget.applyTimeStop === 'function') this.flurryTarget.applyTimeStop(8);
         } else {
            this.flurryHitsLeft = 0;
            this.flurryGhost = null;
            this.flurryTarget = null;
         }
       }
       
       this.x += this.vx;
       this.y += this.vy;
       this.resolveWallBounce(arena, this.flurryTarget);
       return;
    }

    if (this.stolenWindUpTimer > 0) {
      this.stolenWindUpTimer--;
      this.applyMovementPhysics(0);
      // Facing angle remains locked to the initial cast angle; no auto-aim while winding up
      
      if (this.stolenWindUpTimer === 0) {
        if (!this._hasFiredStolenSkillTrick) {
          this._hasFiredStolenSkillTrick = true;
          this.fireStolenSkill(opponent, ownerIndex);
          this.attackCooldown = (CONFIG.rubbick || CONFIG.trickster).attackCooldown;
        }
      }
      return;
    }

    let timeMultiplier = 1;
    if (this._isInsideOwnSphere && this._isInsideOwnSphere()) {
      timeMultiplier = CONFIG.cronos.sphereSpeedMultiplier || 5;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= timeMultiplier;
    if (this.attackSwingTimer > 0) this.attackSwingTimer -= timeMultiplier;
    if (this.telekinesisCooldown > 0) this.telekinesisCooldown--; // Keep ability cooldowns normal
    if (this.spellStealCooldown > 0) this.spellStealCooldown--;
    if (this.stolenSkillCooldown > 0) this.stolenSkillCooldown--;
    if (this.stolenTimer > 0) {
      this.stolenTimer--;
      if (this.stolenTimer === 0 && !this.stolenDomainActive) {
        this.stolenType = null;
        spawnFloatingText(this.x, this.y - this.r - 20, 'SPELL FADED', '#2E8B57');
      }
    }

    // ─── Stolen Unlimited Void Domain Active Logic ───
    if (this.stolenDomainActive && this.stolenDomainTimer > 0) {
      this.stolenDomainTimer--;

      // Stasis immunity inside own stolen domain
      this.timeStopTimer = 0;
      this.hitStunTimer = 0;

      // Lock Rubbick in place while domain is active (hovering levitation)
      this.vx = 0;
      this.vy = 0;

      // Aim at closest opponent
      if (opponent && !opponent.isDead) {
        const dx = opponent.x - this.x;
        const dy = (opponent.y - (opponent.z || 0)) - (this.y - (this.z || 0));
        this.gunAngle = Math.atan2(dy, dx);
        this.angle = this.gunAngle;
      }

      // Continuous active Arcane Bolts punishment on time-stopped targets!
      if (this.attackCooldown > 0) this.attackCooldown--;
      if (this.attackSwingTimer > 0) this.attackSwingTimer--;

      if (this.attackCooldown <= 0 && opponent && !opponent.isDead) {
        this.attackCooldown = 12; // Rapid arcane space strikes
        this.attackSwingTimer = 10;
        const rcfg = CONFIG.rubbick || CONFIG.trickster;
        const boltDamage = ((rcfg?.boltDamage || 12) * 1.5) * getStolenMultiplier('gojo_domain', 'damageMultiplier');
        if (projectileSystem && projectileSystem.fireArcaneBolt) {
          projectileSystem.fireArcaneBolt(this, ownerIndex, boltDamage, opponent, { isDomainEmpowered: true });
        }
      }

      // Ascending emerald sparks & space ripples around Rubbick
      if (Math.random() < 0.35) {
        spawnSparks(
          this.x + (Math.random() - 0.5) * 60,
          this.y + (Math.random() - 0.5) * 60,
          1, 'arcaneAscendLine'
        );
      }

      // Apply paralysis / time-stop to all enemy fighters, illusions, and cars (Rule #17: paralyzing domain)
      const myIdx = state.fighters ? state.fighters.indexOf(this) : -1;
      const myTeam = state.getFighterTeam ? state.getFighterTeam(myIdx) : null;

      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0) continue;
          const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
          if (myTeam !== null && myTeam === targetTeam) continue;

          // Heavenly Restriction immunity (Toji bypasses domain)
          if (f.domainImmunity || f.characterId === 'toji' || f.type === 'toji') continue;

          if (typeof f.applyTimeStop === 'function') {
            f.applyTimeStop(15, { isDomain: true, isUltimate: true });
          } else {
            f.timeStopTimer = Math.max(f.timeStopTimer || 0, 15);
          }
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(15);
          }
          f.vx = 0;
          f.vy = 0;
          if (f.knockbackVx !== undefined) f.knockbackVx = 0;
          if (f.knockbackVy !== undefined) f.knockbackVy = 0;

          // Disable Gojo's Limitless Infinity barrier while trapped inside Rubbick's stolen Unlimited Void
          if (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') {
            f.infinityActive = false;
            f.infinityCooldown = 30;
            f.infinityFadeOpacity = 0;
            f.infinityBlockTimer = 0;
          }
        }
      }

      // Also freeze direct opponent if passed
      if (opponent && opponent !== this && opponent.hp > 0) {
        if (!opponent.domainImmunity && opponent.characterId !== 'toji' && opponent.type !== 'toji') {
          if (typeof opponent.applyTimeStop === 'function') {
            opponent.applyTimeStop(15, { isDomain: true, isUltimate: true });
          } else {
            opponent.timeStopTimer = Math.max(opponent.timeStopTimer || 0, 15);
          }
          if (typeof opponent.applyHitStun === 'function') {
            opponent.applyHitStun(15);
          }
          opponent.vx = 0;
          opponent.vy = 0;
          if (opponent.knockbackVx !== undefined) opponent.knockbackVx = 0;
          if (opponent.knockbackVy !== undefined) opponent.knockbackVy = 0;

          // Disable Gojo's Limitless Infinity barrier while trapped inside Rubbick's stolen Unlimited Void
          if (opponent.characterId === 'gojo' || opponent.type === 'gojo' || opponent._def?.id === 'gojo') {
            opponent.infinityActive = false;
            opponent.infinityCooldown = 30;
            opponent.infinityFadeOpacity = 0;
            opponent.infinityBlockTimer = 0;
          }
        }
      }

      // Also freeze illusions
      if (state.illusions) {
        for (const ill of state.illusions) {
          if (!ill || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined) {
            const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
            if (myTeam !== null && myTeam === illTeam) continue;
          }
          if (typeof ill.applyTimeStop === 'function') ill.applyTimeStop(15);
          else ill.timeStopTimer = Math.max(ill.timeStopTimer || 0, 15);
          if (typeof ill.applyHitStun === 'function') ill.applyHitStun(15);
          else ill.hitStunTimer = Math.max(ill.hitStunTimer || 0, 15);
          ill.vx = 0;
          ill.vy = 0;
        }
      }

      // Domain expired
      if (this.stolenDomainTimer <= 0) {
        this.stolenDomainActive = false;
        this.domainActive = false;
        this.stolenType = null;
        this.stolenTimer = 0;

        spawnFloatingText(this.x, this.y - this.r - 20, 'DOMAIN EXPIRED', '#00FF64');

        // Apply post-domain slow to all enemies (same as Gojo's domain expiry)
        const slowDur = CONFIG.gojo?.domainPostSlowDuration ?? 180;
        const slowMult = CONFIG.gojo?.domainPostSlowMultiplier ?? 0.35;
        if (state.fighters) {
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0) continue;
            const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
            if (myTeam !== null && myTeam === targetTeam) continue;
            if (typeof f.applySlow === 'function') {
              f.applySlow(slowDur, slowMult, { isDomainSlow: true });
            } else {
              f.slowTimer = Math.max(f.slowTimer || 0, slowDur);
              f.slowMultiplier = slowMult;
            }
            if (typeof spawnFloatingText === 'function') {
              spawnFloatingText(f.x, f.y - (f.r || 25) - 20, 'SLOWED!', '#00FF64');
            }
          }
        }
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Telekinesis Logic
    if (this.tkTimer > 0 && this.tkTarget) {
      this.tkTimer--;

      // Stop moving while channeling
      this.vx = 0;
      this.vy = 0;
      
      // Smoothly rotate staff towards the lifted target
      const targetAimY = this.tkTarget.y - (this.tkTarget.z || 0);
      const targetAngle = Math.atan2(targetAimY - (this.y - (this.z || 0)), this.tkTarget.x - this.x);
      let diff = targetAngle - this.gunAngle;
      
      // Normalize angle difference for shortest path
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.gunAngle += diff * 0.35; // Responsive snap to lifted target
      
      // Spawn ascending glowing green neon particles from the drop location
      if (Math.random() < 0.6) {
        spawnSparks(
          this.tkDropX + (Math.random() - 0.5) * 60,
          this.tkDropY + (Math.random() - 0.5) * 60,
          1, 'arcaneAscendLine'
        );
      }
      
      // Immobilize and continuously apply paralyze debuff to the target throughout telekinesis
      this.tkTarget.vx = 0;
      this.tkTarget.vy = 0;
      this.tkTarget.timeStopTimer = 2; // Force them to be frozen
      this.tkTarget.isCaughtInTelekinesis = true;
      this.tkTarget.paralyzeTimer = Math.max(this.tkTarget.paralyzeTimer || 0, this.tkTimer + 2);
      if (this.tkTarget.statusEffects && typeof this.tkTarget.statusEffects.applyParalyze === 'function') {
        this.tkTarget.statusEffects.applyParalyze(this.tkTimer + 2);
      }
      this._cancelTargetChanneling(this.tkTarget, false);
      
      // Visual lift effect is handled in drawing if we could, but let's simulate it by adding an aura
      if (Math.random() < 0.2) {
        spawnSparks(this.tkTarget.x, this.tkTarget.y, 1, 'flash');
      }

      const tkTotalDuration = (CONFIG.rubbick || CONFIG.trickster).telekinesisDuration;
      const progress = 1 - (this.tkTimer / tkTotalDuration);
      
      // Calculate smooth movement progress (hover -> sweep -> hover -> slam)
      let moveProgress = 0;
      if (progress > 0.3 && progress <= 0.9) {
         // Smoothstep interpolation (3x^2 - 2x^3) for smooth acceleration and deceleration
         let t = (progress - 0.3) / 0.6;
         moveProgress = t * t * (3 - 2 * t);
      } else if (progress > 0.9) {
         moveProgress = 1;
      }

      const nextX = this.tkStartX + (this.tkDropX - this.tkStartX) * moveProgress;
      const nextY = this.tkStartY + (this.tkDropY - this.tkStartY) * moveProgress;
      
      const dx = this.tkTargetLastX !== undefined ? nextX - this.tkTargetLastX : 0;
      const dy = this.tkTargetLastY !== undefined ? nextY - this.tkTargetLastY : 0;

      this.tkTarget.x = nextX;
      this.tkTarget.y = nextY;
      
      this.tkTargetLastX = nextX;
      this.tkTargetLastY = nextY;

      // Drag debris along perfectly with the target
      if (dx !== 0 || dy !== 0) {
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.x += dx;
            spark.y += dy;
          }
        }
      }

      // Animate Z for floating effect
      const maxZ = 60;
      if (this.tkTimer > tkTotalDuration - 10) {
          // Going up
          this.tkTarget.z = ((tkTotalDuration - this.tkTimer) / 10) * maxZ;
      } else if (this.tkTimer < 10) {
          // Going down
          this.tkTarget.z = (this.tkTimer / 10) * maxZ;
      } else {
          // Floating / Bobbing
          this.tkTarget.z = maxZ + Math.sin(this.tkTimer * 0.1) * 5;
      }
      
      // Floating glowing magical particles
      if (this.tkTarget.z > 0 && Math.random() < 0.6) {
        spawnSparks(this.tkTarget.x + (Math.random() - 0.5) * 40, this.tkTarget.y - this.tkTarget.z + (Math.random() - 0.5) * 40, 2, 'arcane');
      }
      
      // Ascending magical glowing lines from the ground
      if (this.tkTarget.z > 0) {
        spawnSparks(
          this.tkTarget.x + (Math.random() - 0.5) * 80, 
          this.tkTarget.y + (Math.random() - 0.5) * 80, 
          2, 'arcaneAscendLine'
        );
      }

      if (this.tkTimer === 0) {
        const directTarget = this.tkTarget;
        const slamX = directTarget ? directTarget.x : this.tkStartX;
        const slamY = directTarget ? directTarget.y : this.tkStartY;

        if (directTarget) {
          directTarget.z = 0; // Reset Z
          directTarget.isCaughtInTelekinesis = false;
          directTarget.isParalyzed = false;
          directTarget.timeStopTimer = 0;
        }
        
        // Spawn arcane crater impact graphic on the ground
        spawnArcaneCrater(slamX, slamY, 75);
        
        // Spawn an expanding dark green shockwave
        spawnArcaneShockwave(slamX, slamY);
        
        // Small dust burst instead of massive explosion
        for (let i = 0; i < 4; i++) {
          spawnArcaneSmoke(
            slamX + (Math.random() - 0.5) * 20,
            slamY + (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 4, 
            (Math.random() - 0.5) * 4, 
            'ground'
          );
        }
        
        // Scatter floating telekinesis debris on slam radially outwards
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.type = 'telekinesisDebrisScattered'; // Stop bobbing and draw below fighters
            
            // Bring them back down to ground level under the fighter's feet
            const radius = Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            spark.x = slamX + Math.cos(angle) * radius;
            spark.y = slamY + Math.sin(angle) * radius;

            const speed = 4 + Math.random() * 6; // Slower blast to keep them grouped closer
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.decay = 0.02 + Math.random() * 0.02; // Fade out slowly
            spark.friction = 0.82; // Stronger friction so they stop much sooner
          }
        }
        
        triggerGlobalScreenShake(8, 12); // Quick, controlled screen shake
        
        // Arcane magical landing effects
        spawnArcaneFlash(slamX, slamY);
        spawnArcaneGlyphs(slamX, slamY, 10);

        // Play Telekinesis drop impact sound
        const dropSound = getSkillSound(this._def?.id || 'rubbick', 'telekinesisDrop');
        if (dropSound) {
          audioSystem.playSFX(dropSound.src, dropSound.volume);
        }

        const rcfg = CONFIG.rubbick || CONFIG.trickster;
        const slamDamage = rcfg.telekinesisLandDamage || rcfg.telekinesisDamage || 25;
        const stunRadius = rcfg.telekinesisStunRadius || 100;
        const stunRadiusSq = stunRadius * stunRadius;
        const stunDur = rcfg.telekinesisStunDuration || 60;

        // Query all valid enemy entities (fighters and illusions) within the landing impact zone
        const myIdx = (state.fighters) ? state.fighters.indexOf(this) : -1;
        const myTeam = (myIdx >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : null;

        const allCandidates = [];
        if (state.fighters) {
          for (let fi = 0; fi < state.fighters.length; fi++) {
            const f = state.fighters[fi];
            if (!f || f === this || f.hp <= 0 || f.isDead) continue;
            if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(fi) === myTeam) continue;
            allCandidates.push(f);
          }
        }
        if (state.illusions) {
          for (let ill of state.illusions) {
            if (!ill || ill === this || ill.hp <= 0 || ill.isDead) continue;
            if (ill.owner && myTeam !== null && typeof state.getFighterTeam === 'function') {
              const oIdx = state.fighters ? state.fighters.indexOf(ill.owner) : -1;
              if (oIdx >= 0 && state.getFighterTeam(oIdx) === myTeam) continue;
            }
            allCandidates.push(ill);
          }
        }

        // Apply slam impact damage, blood/flash, stun, paralyze, and channeling cancel to all enemies in the landing area
        for (let enemy of allCandidates) {
          const dx = enemy.x - slamX;
          const dy = enemy.y - slamY;
          const distSq = dx * dx + dy * dy;
          const isDirect = (enemy === directTarget);

          if (isDirect || distSq < stunRadiusSq) {
            // Apply Telekinesis slam impact damage
            applyDamageToTarget(enemy, slamDamage, this, {
              isSkill: true,
              isArcane: true,
              isAOE: true,
              isTelekinesis: true,
              isSlam: true
            });

            // Impact particles & blood
            spawnBloodEffect(enemy.x, enemy.y);
            spawnImpactFlash(enemy.x, enemy.y);

            // Stun and Paralyze debuff
            enemy.electricStunTimer = stunDur;
            enemy.paralyzeTimer = Math.max(enemy.paralyzeTimer || 0, stunDur);
            if (enemy.statusEffects && typeof enemy.statusEffects.applyParalyze === 'function') {
              enemy.statusEffects.applyParalyze(stunDur);
            }
            this._cancelTargetChanneling(enemy, true);
            spawnFloatingText(enemy.x, enemy.y - (enemy.r || 25) - 5, 'PARALYZED!', '#FFEE58');
          }
        }

        if (directTarget && directTarget.isTurret) {
          directTarget._fixedX = directTarget.x;
          directTarget._fixedY = directTarget.y;
        }

        this.tkTarget = null;
      }
    }

    if (opponent && !opponent.isDead && !this.tkTimer) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;

      this.gunAngle = Math.atan2(dy, dx);

      // Ultimate: Spell Steal
      const rubbickCfg = CONFIG.rubbick || CONFIG.trickster;
      if (this.spellStealCooldown <= 0 && !this.stolenType && distSq < rubbickCfg.spellStealRange * rubbickCfg.spellStealRange) {
        const isGojoOpponent = opponent && (opponent.characterId === 'gojo' || opponent.type === 'gojo' || opponent._def?.type === 'gojo' || opponent._def?.id === 'gojo');
        
        // If opponent is Gojo, Rubbick can steal whichever skill Gojo has cast (Hollow Purple, Reversal Red, or Unlimited Void)!
        if (isGojoOpponent) {
          const gojoHasFiredPurple = Boolean(
            opponent.hasFiredPurple ||
            opponent._hasFiredPurpleAtLeastOnce ||
            (state.projectiles && state.projectiles.some(p => p && p.isGojoPurple && p.owner === state.fighters?.indexOf(opponent)))
          );
          const gojoHasFiredRed = Boolean(
            opponent.hasFiredRed ||
            opponent._hasFiredRedAtLeastOnce
          );
          const gojoHasFiredDomain = Boolean(
            opponent.hasFiredDomain ||
            opponent._hasFiredDomainAtLeastOnce ||
            opponent.domainActive ||
            opponent.isChannelingDomainExpansion
          );

          if (gojoHasFiredPurple || gojoHasFiredRed || gojoHasFiredDomain) {
            // Steal the skill Gojo used most recently (priority: lastCastSkill or currently active state)
            let stolenId = 'gojo'; // default to purple
            let skillLabel = 'HOLLOW PURPLE';
            if (opponent.domainActive || opponent.isChannelingDomainExpansion || opponent.lastCastSkill === 'domain') {
              stolenId = 'gojo_domain';
              skillLabel = 'UNLIMITED VOID';
            } else if (opponent.lastCastSkill === 'red') {
              stolenId = 'gojo_red';
              skillLabel = 'REVERSAL RED';
            } else if (opponent.lastCastSkill === 'purple') {
              stolenId = 'gojo';
              skillLabel = 'HOLLOW PURPLE';
            } else if (gojoHasFiredDomain && !gojoHasFiredPurple && !gojoHasFiredRed) {
              stolenId = 'gojo_domain';
              skillLabel = 'UNLIMITED VOID';
            } else if (gojoHasFiredRed && !gojoHasFiredPurple && !gojoHasFiredDomain) {
              stolenId = 'gojo_red';
              skillLabel = 'REVERSAL RED';
            }

            this.spellStealCooldown = rubbickCfg.spellStealCooldown;
            this.stolenType = stolenId;
            this.stolenColor = '#00FF64';
            this.stolenTimer = rubbickCfg.spellStealDuration;
            this.stolenSkillCooldown = rubbickCfg.spellStealCastDelay ?? 45; // Initial delay before casting newly stolen skill
            this._hasFiredStolenSkillTrick = false;

            spawnFloatingText(this.x, this.y - this.r - 20, `STOLEN: ${skillLabel}!`, '#00FF64');
            spawnSpellStealWisps(this, opponent, '#00FF64', 15);
          }
        } else {
          this.spellStealCooldown = rubbickCfg.spellStealCooldown;
          this.stolenType = opponent._def.type;
          this.stolenColor = opponent._def.color;
          this.stolenTimer = rubbickCfg.spellStealDuration;
          this.stolenSkillCooldown = rubbickCfg.spellStealCastDelay ?? 45; // Initial delay before casting newly stolen skill
          this._hasFiredStolenSkillTrick = false;

          const stolenLabel = this.stolenType.toUpperCase();
          spawnFloatingText(this.x, this.y - this.r - 20, `STOLEN: ${stolenLabel}!`, '#00FF00');
          spawnSpellStealWisps(this, opponent, this.stolenColor || '#00FF64', 15);
        }
      }

      // Skill 1: Telekinesis
      if (this.telekinesisCooldown <= 0 && !this.stolenType && distSq < rubbickCfg.telekinesisRange * rubbickCfg.telekinesisRange && !opponent.immuneToCC) {
        this.telekinesisCooldown = rubbickCfg.telekinesisCooldown;
        this.tkTarget = opponent;
        this.tkTimer = rubbickCfg.telekinesisDuration;
        
        // Apply paralyze debuff and cut off target audio & attacks immediately
        const paralyzeDuration = this.tkTimer + 2;
        opponent.paralyzeTimer = Math.max(opponent.paralyzeTimer || 0, paralyzeDuration);
        opponent.isCaughtInTelekinesis = true;
        if (opponent.statusEffects && typeof opponent.statusEffects.applyParalyze === 'function') {
          opponent.statusEffects.applyParalyze(paralyzeDuration);
        }

        // Interrupt attacks, force cancel all channeling abilities, and cut audio
        this._cancelTargetChanneling(opponent, true);
        
        // Pre-calculate drop location (Mage wants to keep distance)
        const minDistance = 150;
        const maxDistance = 220;
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        this.tkStartX = opponent.x;
        this.tkStartY = opponent.y;
        this.tkTargetLastX = undefined;
        this.tkTargetLastY = undefined;
        
        let dropX = this.x + Math.cos(angle) * distance;
        let dropY = this.y + Math.sin(angle) * distance;
        
        // Keep in arena
        dropX = Math.max(arena.x + opponent.r, Math.min(arena.x + arena.width - opponent.r, dropX));
        dropY = Math.max(arena.y + opponent.r, Math.min(arena.y + arena.height - opponent.r, dropY));
        
        this.tkDropX = dropX;
        this.tkDropY = dropY;

        spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'LIFTED!', '#8A2BE2');
        
        // Massive initial burst of rocks from the ground
        spawnTelekinesisDebris(opponent.x, opponent.y, 25);
      }

      // Check heavy stolen skills every frame
      let castedHeavy = false;
      if (this.stolenType && !this.tkTimer && this.stolenSkillCooldown <= 0) {
        if (['cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'musashi', 'normal', 'zeus', 'gojo', 'gojo_red', 'gojo_domain'].includes(this.stolenType)) {
          // It's a Heavy Spell! (One-time cast that consumes the stolen buff)
          castedHeavy = true;
          this.executeStolenSkill(opponent, ownerIndex);
        }
      }

      // Basic Attack / Spammable Stolen Attack
      if (!castedHeavy && this.attackCooldown <= 0 && !this.tkTimer) {
        const rubbickCfg = CONFIG.rubbick || CONFIG.trickster;
        this.attackCooldown = rubbickCfg.attackCooldown;
        this.attackSwingTimer = 15; // 15 frames of staff swing animation
        
        let castedSpammable = false;
        if (this.stolenType && ['orange', 'darkslategray', 'gunslinger'].includes(this.stolenType) && this.stolenSkillCooldown <= 0) {
          castedSpammable = this.executeStolenSkill(opponent, ownerIndex);
        }
        
        if (!castedSpammable) {
          // Normal Arcane Bolt
          let dmg = rubbickCfg.boltDamage;
          if (this.stolenType === 'cronos' && this._isInsideOwnSphere && this._isInsideOwnSphere()) {
             // Apply Sphere buffs to Arcane Bolt
             const cronosCfg = STOLEN_SKILL_CONFIG.skills.cronos;
             this.attackCooldown = cronosCfg.sphereStaffCooldown || 40;
             dmg = cronosCfg.sphereStaffDamage || 18;
             
             // Ensure swing animation finishes before the next attack
             this.attackSwingTimer = Math.min(15, cronosCfg.sphereStaffCooldown || 40);
             
             // Aim before swinging the visual effect
             if (opponent) {
                this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
             }
          } else if (this.stolenType === 'berserker') {
            // Apply Berserker Rage buffs to Arcane Bolt
            const rageAttackMultiplier = CONFIG.berserker.rageAttackSpeedMultiplier || 1.1;
            this.attackCooldown = (rubbickCfg.attackCooldown / rageAttackMultiplier) * getStolenMultiplier('berserker', 'cooldownMultiplier');
            dmg *= (CONFIG.berserker.rageDamageMultiplier || 1.8) * getStolenMultiplier('berserker', 'damageMultiplier');
            
            // Speed up the swing animation to match the faster attack speed
            const totalSpeedUp = rageAttackMultiplier / getStolenMultiplier('berserker', 'cooldownMultiplier');
            this.attackSwingTimer = Math.max(5, Math.floor(15 / totalSpeedUp));
            
            // Aim before swinging the visual effect
            if (opponent) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
            }
          }
          
          if (projectileSystem.fireArcaneBolt) {
             projectileSystem.fireArcaneBolt(this, ownerIndex, dmg, opponent);
          }
        }
      }
    }

    this.applyMovementPhysics();
    this.resolveWallBounce(arena, opponent);

    // Orbiting debris is updated dynamically in _drawDebrisLayer using performance.now()
    // Update Stolen Ruby Hook
    updateStolenRubyHook(this);
    if (this.sphereActive) {
      updateStolenCronosSphere(this);
    }

    if (this.afterImages) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
      }
    }
    if (this.slashEffects) {
      for (let i = this.slashEffects.length - 1; i >= 0; i--) {
        this.slashEffects[i].timer--;
        if (this.slashEffects[i].timer <= 0) this.slashEffects.splice(i, 1);
      }
    }
  }

  executeStolenSkill(opponent, ownerIndex) {
    let skillCast = false;
    // Map of copied active skills
    switch (this.stolenType) {
      case 'musashi':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= 250) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'cronos':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.cronos.sphereActivationDistance || 120)) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'ruby':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.ruby?.activePullRange || 200)) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'bomber':
      case 'grenadier':
      case 'normal':
      case 'zeus':
      case 'gojo':
      case 'gojo_red':
      case 'gojo_domain':
        // These are heavy skills! We will enter the wind-up phase first!
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           }
            this.stolenWindUpTimer = this.stolenType === 'normal' 
              ? (CONFIG.sharpshooter?.executeWindupFrames || 30) 
              : (this.stolenType === 'gojo' ? 45 : (this.stolenType === 'gojo_red' ? 35 : (this.stolenType === 'gojo_domain' ? 60 : 30))); 
            skillCast = true;
            if (this.stolenType === 'gojo') {
              const chargeSound = getSkillSound('gojo', 'purple_charging') || { src: 'Assets/Sound Effects/Skills/mixing.mp3', volume: 1.8 };
              if (chargeSound) audioSystem.playSFX(chargeSound.src, chargeSound.volume || 1.0);
            } else if (this.stolenType === 'gojo_red') {
              const chargeSound = getSkillSound('gojo', 'red_charging') || { src: 'Assets/Sound Effects/Skills/redcharging.mp3', volume: 2.0 };
              if (chargeSound) audioSystem.playSFX(chargeSound.src, chargeSound.volume || 1.8);
            } else if (this.stolenType === 'gojo_domain') {
              // Stolen Unlimited Void wind-up: Play subtle spatial whoosh SFX (no Gojo voiceline)
              audioSystem.playSFX('Assets/Sound Effects/Skills/woosh.mp3', 0.85);
            }
        }
        break;
      case 'orange':
        // Flame warden flamethrower
        projectileSystem.fireFlameProjectile(this, ownerIndex, CONFIG.orange.flameDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), 0, undefined, undefined, undefined, '#00FFFF'); // cyan flames
        this.attackCooldown = 4 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier'); // rapid fire
        skillCast = true;
        break;
      case 'darkslategray':
        // Ninja shuriken
        projectileSystem.fireProjectile(this, ownerIndex, CONFIG.darkslategray.shurikenDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.darkslategray.shurikenSpeed, false, 'darkslategrayShuriken');
        this.attackCooldown = CONFIG.darkslategray.shurikenCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        skillCast = true;
        break;
      case 'gunslinger':
         // Rapid fire
         projectileSystem.fireProjectile(this, ownerIndex, CONFIG.gunslinger.bulletDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.gunslinger.bulletSpeed, false, 'gunslingerBullet');
         this.attackCooldown = CONFIG.gunslinger.shotCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         skillCast = true;
         break;

      default:
         break;
    }
    
    // Clear the stolen skill after casting ONLY if it's a spammable skill
    if (skillCast && !['musashi', 'cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'normal', 'zeus', 'gojo', 'gojo_red', 'gojo_domain'].includes(this.stolenType)) {
      this.stolenType = null;
      this.stolenTimer = 0;
    }
    
    return skillCast;
  }

  fireStolenSkill(opponent, ownerIndex) {
    switch (this.stolenType) {
      case 'musashi':
         this.flurryHitsLeft = 5;
         this.flurryTimer = 0;
         this.flurryTarget = opponent;
         this.stolenSkillCooldown = CONFIG.musashi.flurryCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         
         const dx = opponent.x - this.x;
         const dy = opponent.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         const oldX = this.x;
         const oldY = this.y;
         
         this.x = opponent.x - (dx/dist) * (this.r + opponent.r + 5);
         this.y = opponent.y - (dy/dist) * (this.r + opponent.r + 5);
         
         if (!this.afterImages) this.afterImages = [];
         const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
         const numImages = Math.max(5, Math.floor(teleportDist / 12));
         for (let i = 0; i <= numImages; i++) {
           const t = i / numImages;
           pushTrailCap(this.afterImages, {
             x: oldX + (this.x - oldX) * t,
             y: oldY + (this.y - oldY) * t,
             gunAngle: this.gunAngle,
             timer: 20
           });
         }
         
         spawnFloatingText(this.x, this.y - 30, 'STOLEN FLURRY!', '#ff00ff');
         break;
      case 'bomber':
        projectileSystem.fireBomberGrenade(this, ownerIndex, CONFIG.bomber.grenadeDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent, false);
        this.stolenSkillCooldown = CONFIG.bomber.grenadeCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'cronos':
        this.sphereActive = true;
        this.sphereTheme = RubbickCronosTheme;
        this.sphereX = this.x;
        this.sphereY = this.y;
        this.sphereTimer = CONFIG.cronos.sphereDuration;
        this.stolenSkillCooldown = CONFIG.cronos.sphereCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        spawnFloatingText(this.x, this.y - this.r - 10, 'TIME SPHERE!', '#07cdfa');
        break;
      case 'zeus':
        this.stormActive = true;
        this.stormTimer = CONFIG.zeus.stormDuration * getStolenMultiplier('zeus', 'durationMultiplier') || CONFIG.zeus.stormDuration;
        this.stormLastStrikeTimer = 0;
        this.stolenSkillCooldown = CONFIG.zeus.stormCooldown * getStolenMultiplier('zeus', 'cooldownMultiplier');
        spawnFloatingText(this.x, this.y - this.r - 20, 'ARCANE STORM!', '#00ff64');
        triggerGlobalScreenShake(CONFIG.zeus.stormCastShakeIntensity || 8, CONFIG.zeus.stormCastShakeFrames || 20);
        const stormSound = getSkillSound(99, 'storm');
        if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.7);
        break;
      case 'grenadier':
        projectileSystem.fireGrenade(this, ownerIndex, (CONFIG.grenadier.poisonDamagePerTick || 10) * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent);
        this.stolenSkillCooldown = CONFIG.grenadier.throwCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'ruby':
         if (opponent) {
           this.stolenSkillCooldown = (CONFIG.ruby?.activePullCooldown || 240) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           this.activePullAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           this.gunAngle = this.activePullAngle;
           this.activePullActive = true;
           this.activePullPhase = 0; // WIND_UP
           this.activePullPhaseTimer = this.pullPhaseWindUp;
           this.pullTargets = [];
           this.primaryHookTarget = opponent;
           this.vx = 0;
           this.vy = 0;
         }
        break;
      case 'normal':
        if (opponent) {
           this.stolenSkillCooldown = (CONFIG.normal.shotCooldown || 70) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           
           // Fire from tip of staff along locked cast angle (no snap auto-aim)
           const customTipDist = this.r + 20;
           const customSpawnX = this.x + Math.cos(this.gunAngle) * customTipDist;
           const customSpawnY = this.y + Math.sin(this.gunAngle) * customTipDist;
           
           const finalDamage = this.damage * (CONFIG.sharpshooter?.enhancedDamageMultiplier || 2.5) * getStolenMultiplier(this.stolenType, 'damageMultiplier');
           const finalSpeed = CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1) * (CONFIG.sharpshooter?.enhancedSpeedMultiplier || 1.5);
           
           spawnFloatingText(this.x, this.y - this.r - 20, 'EXECUTE!', '#00ff00');
           triggerGlobalScreenShake(15, 10);
           
           projectileSystem.fireProjectile(this, ownerIndex, finalDamage, false, finalSpeed, false, 'rubbickSniperBullet_enhanced', customSpawnX, customSpawnY);
           
           let recoilForce = (CONFIG.sharpshooter?.enhancedRecoilForce || 30);
           this.vx -= Math.cos(this.gunAngle) * recoilForce;
           this.vy -= Math.sin(this.gunAngle) * recoilForce;
           
           const enhanceSound = getSkillSound(1, 'enhance'); // 1 is Sharpshooter ID
           if (enhanceSound) {
             audioSystem.playSFX(enhanceSound.src, enhanceSound.volume);
           }
        }
        break;
      case 'gojo':
        if (opponent) {
           this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        }
        const gojoDmgMult = getStolenMultiplier('gojo', 'damageMultiplier');
        const purpleDamage = (CONFIG.gojo?.purpleDamage || 70) * gojoDmgMult;
        const purpleDPS = (CONFIG.gojo?.purpleDPS || 150) * gojoDmgMult;
        this.stolenSkillCooldown = (CONFIG.gojo?.purpleCooldown || 1500) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        
        spawnFloatingText(this.x, this.y - this.r - 20, 'HOLLOW PURPLE!', '#00FF64');
        triggerGlobalScreenShake(CONFIG.gojo?.purpleShakeIntensity || 15, CONFIG.gojo?.purpleShakeDuration || 20);

        // Backward recoil impulse from releasing the immense green imaginary mass
        const recoilForce = 18;
        this.vx -= Math.cos(this.gunAngle) * recoilForce;
        this.vy -= Math.sin(this.gunAngle) * recoilForce;
        this.attackSwingTimer = 18; // Follow-through thrust/release animation

        if (projectileSystem && projectileSystem.fireGojoPurple) {
          projectileSystem.fireGojoPurple(this, ownerIndex, purpleDamage, purpleDPS, { isRubbick: true, isTrickster: true, colorTheme: 'green' });
        }
        
        const purpleSound = { src: 'Assets/Sound Effects/Skills/purpledeploy.mp3', volume: 1.5 };
        if (purpleSound) audioSystem.playSFX(purpleSound.src, purpleSound.volume || 1.5);
        break;
      case 'gojo_red':
        if (opponent) {
           this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        }
        const redDmgMult = getStolenMultiplier('gojo_red', 'damageMultiplier') || getStolenMultiplier('gojo', 'damageMultiplier');
        const redDamage = (CONFIG.gojo?.redDamage || 100) * redDmgMult;
        const redKnockback = CONFIG.gojo?.redKnockback || 40;
        const pushAngle = this.gunAngle !== undefined ? this.gunAngle : 0;
        const frontalReach = CONFIG.gojo?.redFrontalReach || CONFIG.gojo?.redRange || 650;
        const frontalArc = CONFIG.gojo?.redFrontalArc || (Math.PI * 0.45);
        const halfArc = frontalArc / 2;
        const slowDuration = CONFIG.gojo?.redSlowDuration || 120;
        const slowMultiplier = CONFIG.gojo?.redSlowMultiplier || 0.35;
        this.stolenSkillCooldown = (CONFIG.gojo?.redCooldown || 1000) * getStolenMultiplier('gojo_red', 'cooldownMultiplier');

        spawnFloatingText(this.x, this.y - this.r - 20, 'REVERSAL RED!', '#00FF64');
        triggerGlobalScreenShake(CONFIG.gojo?.redShakeIntensity || 14, CONFIG.gojo?.redShakeDuration || 25);

        // Backward recoil impulse
        const redRecoilForce = 16;
        this.vx -= Math.cos(this.gunAngle) * redRecoilForce;
        this.vy -= Math.sin(this.gunAngle) * redRecoilForce;
        this.attackSwingTimer = 18;

        const sBlast = getSkillSound('gojo', 'red_blast');
        const blastSnd = sBlast?.src || CONFIG.gojo?.sounds?.redBlast || 'Assets/Sound Effects/Skills/redblast.mp3';
        const blastVol = sBlast?.volume ?? (CONFIG.gojo?.soundVolumes?.redBlast ?? 2.5);
        audioSystem.playSFX(blastSnd, blastVol);

        // Query all valid enemy targets (fighters, illusions, and cars) per Rule #6 & Rule #7
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        const validTargets = [];
        if (typeof state !== 'undefined') {
          if (state.fighters) {
            for (let i = 0; i < state.fighters.length; i++) {
              const f = state.fighters[i];
              if (!f || f === this || f.hp <= 0) continue;
              const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
              if (myTeam !== null && myTeam === targetTeam) continue;
              validTargets.push(f);
            }
          }
          if (state.illusions) {
            for (const ill of state.illusions) {
              if (!ill || ill === this || ill.hp <= 0) continue;
              if (ill.ownerIndex !== undefined) {
                const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
                if (myTeam !== null && myTeam === illTeam) continue;
              }
              validTargets.push(ill);
            }
          }
          if (state.cjDriveBys) {
            for (const car of state.cjDriveBys) {
              if (!car || car.dead || car.hp <= 0) continue;
              if (car.owner) {
                const carTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(car.owner)) : null;
                if (myTeam !== null && myTeam === carTeam) continue;
              }
              validTargets.push(car);
            }
          }
        }

        for (const f of validTargets) {
          const dist = Math.hypot(f.x - this.x, f.y - this.y);
          const effectiveReach = frontalReach + (f.r || 20);

          if (dist <= effectiveReach) {
            const angleToEnemy = Math.atan2(f.y - this.y, f.x - this.x);
            let angleDiff = angleToEnemy - pushAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) <= halfArc || dist <= (this.r + (f.r || 20) + 20)) {
              f.timeStopTimer = 0;
              f.isFrozenByInfinity = false;
              f.infinityFreezeTimer = 0;

              if (typeof f.takeDamage === 'function') {
                f.takeDamage(redDamage, this, { isRed: true, isSkill: true, isAdaptableSkillShot: true, skillShotId: 'red' });
              }

              const kbVx = Math.cos(pushAngle) * redKnockback;
              const kbVy = Math.sin(pushAngle) * redKnockback;
              f.vx = kbVx;
              f.vy = kbVy;
              f.knockbackDecay = 0.92;

              if (typeof f.applyRedKnockback === 'function') {
                f.applyRedKnockback(kbVx, kbVy);
              } else if (typeof f.applyKnockback === 'function') {
                f.applyKnockback(kbVx, kbVy, { isRed: true });
              }

              if (typeof f.applyHitStun === 'function') {
                f.applyHitStun(25);
              }

              if (!f.immuneToCC || f.characterId === 'toji' || f.type === 'toji') {
                if (typeof f.applySlow === 'function') {
                  f.applySlow(slowDuration, slowMultiplier, { isRed: true });
                } else {
                  f.slowTimer = Math.max(f.slowTimer || 0, slowDuration);
                  f.slowMultiplier = slowMultiplier;
                }
                f.redSlowTimer = slowDuration;
                f.redSlowMaxTimer = slowDuration;
              }

              spawnImpactFlash(f.x, f.y, 50, 'arcane');
            }
          }
        }

        if (typeof spawnGojoRedFrontalBlast === 'function') {
          spawnGojoRedFrontalBlast(this.x, this.y, pushAngle, frontalReach, frontalArc, { isRubbick: true, colorTheme: 'green' });
        }
        break;
      case 'gojo_domain':
        {
          const domainDurationMult = getStolenMultiplier('gojo_domain', 'durationMultiplier') || 0.7;
          const domainDuration = Math.round((CONFIG.gojo?.domainDuration || 300) * domainDurationMult);
          const domainRadius = CONFIG.gojo?.domainRadius || 400;

          spawnFloatingText(this.x, this.y - this.r - 20, 'UNLIMITED VOID!', '#00FF64');
          triggerGlobalScreenShake(CONFIG.gojo?.domainShakeIntensity || 18, CONFIG.gojo?.domainShakeDuration || 30);

          // Activate Rubbick's stolen domain state
          this.stolenDomainActive = true;
          this.domainActive = true;
          this.stolenDomainTimer = domainDuration;
          this.stolenDomainMaxTimer = domainDuration;
          this.stolenDomainRadius = domainRadius;
          this.stolenDomainX = this.x;
          this.stolenDomainY = this.y;

          // Lock Rubbick in place during domain (hand sign channeling pose)
          this.vx = 0;
          this.vy = 0;

          // Stolen Unlimited Void deployment: Play pure spatial time-stop sphere SFX (100% voiceline-free)
          audioSystem.playSFX('Assets/Sound Effects/Skills/cronosphere.mp3', 1.2);
          audioSystem.playSFX('Assets/Sound Effects/Skills/purpledeploy.mp3', 1.0);

          this.stolenSkillCooldown = (CONFIG.gojo?.domainCooldown || 1200) * getStolenMultiplier('gojo_domain', 'cooldownMultiplier');
        }
        break;
    }
    
    // Clear the stolen skill after casting (except gojo_domain which runs over time)
    if (this.stolenType !== 'gojo_domain') {
      this.stolenType = null;
      this.stolenTimer = 0;
    }
    this.stolenWindUpTimer = 0;
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius + 2; // +2 for floating point leniency at the boundary
  }

  drawGun(ctx) {
    if (this.activePullActive) {
      drawRubyScythe(ctx, this, RubbickRubyTheme);
    } else {
      drawRubbickStaff(ctx, this);
    }
  }

  _updateStaffTrail(isTimeStopped = false) {
    if (!this.staffTrail) this.staffTrail = [];
    if (!this.staffSmokeParticles) this.staffSmokeParticles = [];

    // Fade and clean up
    for (let p of this.staffTrail) p.life--;
    this.staffTrail = this.staffTrail.filter(p => p.life > 0);

    for (let p of this.staffSmokeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size += 0.5;
      p.angle += p.spin;
    }
    this.staffSmokeParticles = this.staffSmokeParticles.filter(p => p.life > 0);

    if (isTimeStopped || this.stolenType !== 'berserker') return;

    const isSwinging = this.attackSwingTimer > 0;
    const speed = Math.hypot(this.vx, this.vy);
    const isMoving = speed > 0.5;

    if (isSwinging || isMoving) {
       // Staff head position calculation
       const idleHover = 0; 
       const progress = isSwinging ? this.attackSwingTimer / 15 : 0;
       const swingAngle = Math.sin(progress * Math.PI) * -0.6;
       const thrustOffset = Math.sin(progress * Math.PI) * 12;

       const tx = this.r * 0.4 + thrustOffset;
       const ty = this.r * 0.85 + idleHover;
       const staffRot = Math.PI * 0.3 + swingAngle;

       const headLocalX = 0;
       const headLocalY = -50;

       const rotX = headLocalX * Math.cos(staffRot) - headLocalY * Math.sin(staffRot);
       const rotY = headLocalX * Math.sin(staffRot) + headLocalY * Math.cos(staffRot);

       const gunX = tx + rotX;
       const gunY = ty + rotY;

       const worldX = this.x + gunX * Math.cos(this.gunAngle) - gunY * Math.sin(this.gunAngle);
       const worldY = this.y + gunX * Math.sin(this.gunAngle) + gunY * Math.cos(this.gunAngle);

       let shouldPush = true;
       if (this.staffTrail.length > 0) {
           const last = this.staffTrail[this.staffTrail.length - 1];
           if (Math.hypot(worldX - last.x, worldY - last.y) < 1.0) shouldPush = false;
       }

       if (shouldPush) {
           this.staffTrail.push({
               x: worldX,
               y: worldY,
               life: 12,
               jitter: Math.random() * 4 - 2
           });

           const smokeCount = isSwinging ? 3 : 1;
           for (let i = 0; i < smokeCount; i++) {
               const staffAngle = this.gunAngle + staffRot;
               const shaftOffset = Math.random() * 35;
               const px = worldX - Math.cos(staffAngle) * shaftOffset;
               const py = worldY - Math.sin(staffAngle) * shaftOffset;

               this.staffSmokeParticles.push({
                  x: px + (Math.random() - 0.5) * 15,
                  y: py + (Math.random() - 0.5) * 15,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: (Math.random() - 0.5) * 1.5 - 0.5,
                  life: 15 + Math.random() * 10,
                  maxLife: 25,
                  size: 6 + Math.random() * 6,
                  stretch: 0.4 + Math.random() * 0.4,
                  angle: Math.random() * Math.PI * 2,
                  spin: (Math.random() - 0.5) * 0.1,
                  color: Math.random() > 0.6 ? '#000000' : (Math.random() > 0.4 ? '#004a20' : '#008840')
               });
           }
        }
     }
  }
  
  _drawStaffTrail(ctx) {
    if (this.stolenType !== 'berserker' || isInsideEnemyGojoDomain(this)) return;

    if (this.staffSmokeParticles && this.staffSmokeParticles.length > 0) {
        for (const p of this.staffSmokeParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            const lifeRatio = p.life / p.maxLife;
            ctx.globalAlpha = lifeRatio * 0.7;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * p.stretch, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    if (!this.staffTrail || this.staffTrail.length < 2) return;
    
    ctx.save();
    
    const drawCrescentPolygon = (trail, r, g, b, baseThickness) => {
        const headLife = trail[trail.length - 1].life / 12;
        const globalAlpha = headLife > 0.2 ? 1.0 : (headLife / 0.2);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${globalAlpha})`;
        ctx.beginPath();
        
        const outer = [];
        const inner = [];
        
        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            const progress = p.life / 12; // 0 to 1
            
            let thickness = baseThickness * progress;
            if (i === trail.length - 1 || i === 0) {
                thickness = 0; 
            }
            
            thickness += (p.jitter * progress * 0.4);
            
            let prev = i > 0 ? trail[i - 1] : trail[0];
            let next = i < trail.length - 1 ? trail[i + 1] : trail[trail.length - 1];
            
            if (i === 0 && trail.length > 1) next = trail[1];
            if (i === trail.length - 1 && trail.length > 1) prev = trail[trail.length - 2];
            
            let dx = next.x - prev.x;
            let dy = next.y - prev.y;
            let len = Math.hypot(dx, dy) || 1;
            
            let nx = -dy / len;
            let ny = dx / len;
            
            outer.push({ x: p.x + nx * thickness, y: p.y + ny * thickness });
            inner.push({ x: p.x - nx * thickness, y: p.y - ny * thickness });
        }
        
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
        for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
        
        ctx.closePath();
        ctx.fill();
    };

    if (this.isInRage) {
      // Draw massive green anime-style trails when in rage
      drawCrescentPolygon(this.staffTrail, 0, 0, 0, 16);     // Black Aura
      drawCrescentPolygon(this.staffTrail, 0, 220, 100, 8);  // Green Aura
      drawCrescentPolygon(this.staffTrail, 255, 255, 255, 2);// White Core
    } else {
      // Draw a dark basic trail for normal non-rage swings
      drawCrescentPolygon(this.staffTrail, 0, 0, 0, 4);
      drawCrescentPolygon(this.staffTrail, 51, 51, 51, 2);
    }

    ctx.restore();
  }
  
  drawBody(ctx) {
    drawRubbickSkin(ctx, this);
  }

  draw(ctx) {
    // Draw debris that is currently BEHIND Rubbick (Pixel Art Style)
    drawRubbickPixelDebrisLayer(ctx, this, true);
    
    // Draw afterimages in authentic discrete pixel ghost style
    if (this.afterImages && this.afterImages.length > 0) {
      this.afterImages.forEach(img => {
        const alpha = img.timer / 20.0;
        const aiAngle = img.gunAngle !== undefined ? img.gunAngle : (img.angle || 0);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.translate(img.x, img.y);
        ctx.rotate(aiAngle);
        const facingLeft = Math.abs(aiAngle) > Math.PI / 2;
        if (facingLeft) ctx.scale(1, -1);
        drawRubbickGhostModel(ctx, img.r || this.r);
        ctx.restore();
      });
    }

    super.draw(ctx);
    
    // Draw debris that is currently IN FRONT of Rubbick (Pixel Art Style)
    drawRubbickPixelDebrisLayer(ctx, this, false);

    // Draw telekinesis visual (Continuous Solid Pixel Art Style)
    if (this.tkTarget && this.tkTimer > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const P = 2.0;
      const snap = (v) => Math.round(v / P) * P;

      // 1. ── ACCURATELY POSITION TETHER AT STAFF CRYSTAL TIP ──
      const staffTip = (typeof getRubbickStaffTip === 'function') ? getRubbickStaffTip(this) : { x: this.x, y: this.y - (this.z || 0) };
      const startX = snap(staffTip.x);
      const startY = snap(staffTip.y);
      const targetX = snap(this.tkTarget.x);
      const targetY = snap(this.tkTarget.y - (this.tkTarget.z || 0));

      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      // 1. ── CONTINUOUS SOLID PIXEL ART ENERGY TETHER ──
      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(angle);
      
      // Staff crystal emitter rune glint
      ctx.fillStyle = '#05180B';
      ctx.fillRect(-P * 2, -P * 2, P * 4, P * 4);
      ctx.fillStyle = '#00FF64';
      ctx.fillRect(-P * 1.5, -P * 1.5, P * 3, P * 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-P * 0.5, -P * 0.5, P, P);

      const timeStr = performance.now() / 150;
      const waveColors = ['#00FF64', '#00E5FF'];
      const waveHighlights = ['#A7F3D0', '#E0F2FE'];
      
      // Two overlapping animated continuous pixel sine streams
      for (let w = 0; w < 2; w++) {
        const points = [];
        const step = 3.0;
        for (let i = 0; i <= dist; i += step) {
          const progress = i / dist;
          const amplitude = Math.sin(progress * Math.PI) * 14; // Thickest in center
          const rawOffset = Math.sin(timeStr * (w === 0 ? 1.4 : -1.6) + i * 0.06) * amplitude;
          points.push({ x: snap(i), y: snap(rawOffset) });
        }
        // Ensure connects precisely to target center
        points.push({ x: snap(dist), y: 0 });

        if (points.length > 1) {
          // A. Continuous Solid Dark Outline
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.strokeStyle = '#05180B';
          ctx.lineWidth = 5.5;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'miter';
          ctx.stroke();

          // B. Continuous Vibrant Emerald/Cyan Energy Body
          ctx.strokeStyle = waveColors[w];
          ctx.lineWidth = 3.2;
          ctx.stroke();

          // C. Continuous Mint/Cyan Specular Core
          ctx.strokeStyle = waveHighlights[w];
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // D. Pure White Center Filament
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Traveling pixel energy rune glint on the beam
        const packetPhase = ((timeStr * 0.8 + w * 0.5) % 1.0);
        const packetDist = snap(dist * packetPhase);
        const pAmp = Math.sin(packetPhase * Math.PI) * 14;
        const pOff = snap(Math.sin(timeStr * (w === 0 ? 1.4 : -1.6) + packetDist * 0.06) * pAmp);
        
        ctx.fillStyle = '#05180B';
        ctx.fillRect(packetDist - P * 2, pOff - P * 2, P * 4, P * 4);
        ctx.fillStyle = '#00FF88';
        ctx.fillRect(packetDist - P * 1.5, pOff - P * 1.5, P * 3, P * 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(packetDist - P * 0.5, pOff - P * 0.5, P, P);
      }
      ctx.restore();
      
      // 2. ── SOLID STEPPED PIXEL ART LANDING RETICLE & TARGET ZONE ──
      const dropRadius = snap(this.tkTarget.r * 1.4);
      const dropX = snap(this.tkDropX);
      const dropY = snap(this.tkDropY);
      const rGrid = Math.max(6, Math.round(dropRadius / P));
      const size = rGrid + 3;
      const reticleTime = performance.now() * 0.005;

      // Pass 1: Solid Dark Obsidian Outline (Thick 1-2px border around ring)
      ctx.fillStyle = '#05180B';
      for (let gy = -size; gy <= size; gy++) {
        for (let gx = -size; gx <= size; gx++) {
          const d = Math.hypot(gx, gy);
          if (Math.abs(d - rGrid) <= 1.60) {
            ctx.fillRect(dropX + gx * P, dropY + gy * P, P, P);
          }
        }
      }

      // Pass 2: Vibrant Emerald / Neon Mint Pixel Ring with rotating glints
      for (let gy = -size; gy <= size; gy++) {
        for (let gx = -size; gx <= size; gx++) {
          const d = Math.hypot(gx, gy);
          if (Math.abs(d - rGrid) <= 0.65) {
            const angle = Math.atan2(gy, gx);
            const isGlint = Math.sin(angle * 4 + reticleTime) > 0.65;
            ctx.fillStyle = isGlint ? '#FFFFFF' : ((Math.abs(gx + gy) % 2 === 0) ? '#00FF64' : '#60FFB0');
            ctx.fillRect(dropX + gx * P, dropY + gy * P, P, P);
          }
        }
      }

      // 4 Cardinal Pixel Inward Brackets [ ]
      const bracketDist = snap(dropRadius + P * 4);
      const bLen = P * 3;

      const drawPixelBracketPart = (bx, by, bw, bh) => {
        // Dark outline
        ctx.fillStyle = '#05180B';
        ctx.fillRect(bx - P, by - P, bw + P * 2, bh + P * 2);
        // Bright pixel fill
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bx, by, bw, bh);
      };

      // Top [
      drawPixelBracketPart(dropX - bLen, dropY - bracketDist, bLen * 2, P);
      drawPixelBracketPart(dropX - bLen, dropY - bracketDist, P, bLen);
      drawPixelBracketPart(dropX + bLen - P, dropY - bracketDist, P, bLen);

      // Bottom ]
      drawPixelBracketPart(dropX - bLen, dropY + bracketDist - P, bLen * 2, P);
      drawPixelBracketPart(dropX - bLen, dropY + bracketDist - bLen, P, bLen);
      drawPixelBracketPart(dropX + bLen - P, dropY + bracketDist - bLen, P, bLen);

      // Left [
      drawPixelBracketPart(dropX - bracketDist, dropY - bLen, P, bLen * 2);
      drawPixelBracketPart(dropX - bracketDist, dropY - bLen, bLen, P);
      drawPixelBracketPart(dropX - bracketDist, dropY + bLen - P, bLen, P);

      // Right ]
      drawPixelBracketPart(dropX + bracketDist - P, dropY - bLen, P, bLen * 2);
      drawPixelBracketPart(dropX + bracketDist - bLen, dropY - bLen, bLen, P);
      drawPixelBracketPart(dropX + bracketDist - bLen, dropY + bLen - P, bLen, P);

      ctx.restore();
    }
    
    // If copied a skill, draw an authentic orbiting pixel aura
    if (this.stolenType) {
       ctx.save();
       ctx.imageSmoothingEnabled = false;
       const P = 2.0;
       const snap = (v) => Math.round(v / P) * P;
       const auraR = snap(this.r + 10);
       const auraTime = performance.now() * 0.004;

       for (let i = 0; i < 4; i++) {
         const aAng = auraTime + (i * Math.PI / 2);
         const ax = snap(this.x + Math.cos(aAng) * auraR);
         const ay = snap(this.y + Math.sin(aAng) * auraR);

         ctx.fillStyle = '#05180B';
         ctx.fillRect(ax - P, ay - P, P * 3, P * 3);
         ctx.fillStyle = (i % 2 === 0) ? (this.stolenColor || '#00FF64') : '#FFFFFF';
         ctx.fillRect(ax, ay, P, P);
       }
       ctx.restore();
    }
    
    // Draw stolen Cronos pre-activation barrier
    if (this.stolenType === 'cronos' && typeof drawCronosPreActivateBarrier !== 'undefined') {
      const stolenSphereReady = !this.sphereActive && this.stolenSkillCooldown <= 0;
      const inPreWindow = this.stolenSkillCooldown > 0 && this.stolenSkillCooldown <= (CONFIG.cronos.spherePreActivateFrames || 30);
      
      if (stolenSphereReady || inPreWindow) {
        const now = Date.now();
        const progress = stolenSphereReady 
          ? 1  // full intensity when fully charged
          : 1 - this.stolenSkillCooldown / Math.max(1, (CONFIG.cronos.spherePreActivateFrames || 30));
          
        const barrierRadius = Math.max(this.r * 1.5, 55);
        
        drawCronosPreActivateBarrier({
          ctx,
          x: this.x,
          y: this.y,
          radius: barrierRadius,
          progress: progress,
          pulsePhase: now / 300,
          energyColor: this.stolenColor || '#00F3FF',
          shieldColor: 'rgba(0, 243, 255, 0.15)'
        });
      }
    }

    // Update and draw slash effects
    if (this.slashEffects && this.slashEffects.length > 0) {
      this.slashEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        
        // For Rubbick's stolen ability, all slashes are a magical arcane green
        let color = '#00FF64';
        
        ctx.globalAlpha = 1 - prog;
        
        if (effect.type.startsWith('slash')) {
          const size = effect.size * (0.6 + 0.6 * prog);
          const thick = (1 - Math.pow(prog, 1.5)) * (effect.type === 'slash_katana' ? 28 : 18);
          
          const drawCrescent = (radius, thickness, angleSpread) => {
             ctx.beginPath();
             const startX = radius * Math.cos(-angleSpread);
             const startY = radius * Math.sin(-angleSpread);
             const endX = radius * Math.cos(angleSpread);
             const endY = radius * Math.sin(angleSpread);
             
             ctx.moveTo(startX, startY);
             ctx.quadraticCurveTo(radius + thickness * 1.5, 0, endX, endY);
             ctx.quadraticCurveTo(radius - thickness * 0.5, 0, startX, startY);
             ctx.closePath();
          };

          // Simulated Glow
          ctx.fillStyle = color;
          ctx.save();
          ctx.globalAlpha = (1 - prog) * 0.25;
          drawCrescent(size * 1.15, thick * 1.5, 1.35);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = color;
          drawCrescent(size, thick, 1.3);
          ctx.fill();

          ctx.fillStyle = '#0a0a0a';
          drawCrescent(size * 0.98, thick * 0.75, 1.15);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          drawCrescent(size * 0.96, thick * 0.35, 1.0);
          ctx.fill();
        }
        
        ctx.restore();
      });
    }

    // Draw Stolen Laser Charge Effect
    if (this.beamCharge > 0 && !isInsideEnemyGojoDomain(this)) {
      drawRubbickChargeEffect(ctx, this.x, this.y, this.gunAngle, this.beamCharge, this.r);
    }

    // Draw teleport-in effect
    this._drawTeleportEffect(ctx);

    if (typeof this._drawStaffTrail === 'function') {
      this._drawStaffTrail(ctx);
    }
    
    this.drawRageBar(ctx);
  }

  drawBeamOverlay(ctx) {
    if (this.hp <= 0 || this.beamTimer <= 0 || isInsideEnemyGojoDomain(this)) return;
    
    // Smooth fade in over the first 8 frames, and fade out over the last 8 frames
    const fadeOutMultiplier = Math.min(1, this.beamTimer / 8);
    const timeFired = (typeof CONFIG !== 'undefined' && CONFIG.laser ? CONFIG.laser.beamDuration : 100) - this.beamTimer;
    const fadeInMultiplier = Math.min(1, Math.max(0, timeFired) / 8);
    const fadeMultiplier = fadeOutMultiplier * fadeInMultiplier;
    
    let { startX, startY, endX, endY } = this.getBeamLine();
    const zOffset = this.z || 0;
    startY -= zOffset;
    endY -= zOffset;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const beamLen = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    const time = performance.now() / 150;
    const pulse1 = Math.sin(time) * 1.5;
    const pulse2 = Math.cos(time * 1.3) * 2;
    const pulse3 = Math.sin(time * 0.8) * 3;

    ctx.save();
    
    // Outer huge bloom (green)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 16 + pulse3 * 1.5) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Secondary wide glow (bright green)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(50, 255, 100, ${0.5 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 4 + pulse2) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Mid bright glow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(150, 255, 150, ${0.8 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) - 2 + pulse2) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner core (white)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.coreWidth || 4) + pulse1 + 1.5) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Energy nodes traveling down the beam
    const numNodes = 6;
    const speed = 1.0;
    ctx.fillStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
    
    for (let i = 0; i < numNodes; i++) {
      let offset = ((time * speed) + (i / numNodes)) % 1.0;
      let nx = startX + Math.cos(angle) * (beamLen * offset);
      let ny = startY + Math.sin(angle) * (beamLen * offset);
      let nodeRadius = (2 + Math.sin(offset * Math.PI) * 4) * fadeMultiplier;

      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Target hit glow
    for (const [target, hitState] of this.beamHitState.entries()) {
      if (!target || target.hp <= 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hitGlow = ctx.createRadialGradient(target.x, target.y, target.r * 0.2, target.x, target.y, target.r * 3);
      hitGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + Math.random() * 0.2) * fadeMultiplier})`);
      hitGlow.addColorStop(0.2, `rgba(50, 255, 100, ${(0.6 + Math.random() * 0.2) * fadeMultiplier})`);
      hitGlow.addColorStop(1, 'rgba(0, 255, 50, 0)');
      ctx.fillStyle = hitGlow;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Proximity illumination on ANY fighter near the beam
    if (state && state.fighters) {
      const l2 = dx * dx + dy * dy;
      if (l2 > 0) {
        for (const f of state.fighters) {
          if (!f || f.hp <= 0 || f === this) continue;
          let t = ((f.x - startX) * dx + (f.y - startY) * dy) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = startX + t * dx;
          const projY = startY + t * dy;
          const dist = Math.hypot(f.x - projX, f.y - projY);

          const maxLightDist = 150;
          if (dist < maxLightDist && !this.beamHitState.has(f)) {
            const intensity = 1 - (dist / maxLightDist);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const shineGlow = ctx.createRadialGradient(f.x, f.y, f.r * 0.5, f.x, f.y, f.r * 1.5);
            shineGlow.addColorStop(0, `rgba(50, 255, 100, ${intensity * 0.5 * fadeMultiplier})`);
            shineGlow.addColorStop(1, 'rgba(0, 255, 50, 0)');
            
            ctx.fillStyle = shineGlow;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }
  }

  _drawTeleportEffect(ctx) {
    if (this._teleportTimer <= 0 || isInsideEnemyGojoDomain(this)) return;
    const progress = 1 - (this._teleportTimer / 20);
    const alpha = 1 - progress;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;
    ctx.translate(snap(this.x), snap(this.y));
    
    // Expanding stepped pixel diamond rift
    const riftR = snap(this.r + 30 * alpha);
    ctx.fillStyle = `rgba(5, 25, 12, ${(alpha * 0.85).toFixed(2)})`;
    ctx.fillRect(-riftR - P, -P, (riftR + P) * 2, P * 2);
    ctx.fillRect(-P, -riftR - P, P * 2, (riftR + P) * 2);

    ctx.fillStyle = `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
    ctx.fillRect(-riftR, -P * 0.5, riftR * 2, P);
    ctx.fillRect(-P * 0.5, -riftR, P, riftR * 2);

    // Vertical central white pixel rift
    const vLen = snap(this.r * 1.5 + 20 * alpha);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.fillRect(-P * 0.5, -vLen, P, vLen * 2);
    
    ctx.restore();
  }

  resolveWallBounce(arena, opponent) {
    if (this.sphereActive) {
      resolveStolenCronosWallBounce(this, arena, opponent);
    } else if (this.stolenType === 'berserker' && opponent) {
      let bounced = false;
      if (this.x - this.r < arena.x) { this.x = arena.x + this.r; bounced = true; }
      else if (this.x + this.r > arena.x + arena.width) { this.x = arena.x + arena.width - this.r; bounced = true; }

      if (this.y - this.r < arena.y) { this.y = arena.y + this.r; bounced = true; }
      else if (this.y + this.r > arena.y + arena.height) { this.y = arena.y + arena.height - this.r; bounced = true; }

      if (bounced) {
        if (typeof this.playWallBounceSound === 'function') this.playWallBounceSound();
        const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

        // Snap toward a point *away* from opponent to tighten the fight
        const dx = this.x - opponent.x; 
        const dy = this.y - opponent.y;
        const dist = Math.hypot(dx, dy) || 1;
        const awayDist = CONFIG.berserker.rageRebounceAwayDistance ?? 0;
        
        const targetX = opponent.x - (dx / dist) * awayDist;
        const targetY = opponent.y - (dy / dist) * awayDist;

        const hx = targetX - this.x;
        const hy = targetY - this.y;
        const hDist = Math.hypot(hx, hy) || 1;

        this.vx = (hx / hDist) * currentSpeed;
        this.vy = (hy / hDist) * currentSpeed;
      }
    } else {
      super.resolveWallBounce(arena, opponent);
    }
  }

  _drawDebrisLayer(ctx, drawBehind) {
    if (isInsideEnemyGojoDomain(this)) return;
    drawRubbickPixelDebrisLayer(ctx, this, drawBehind);
  }
  drawRageBar(ctx) {
    if (this.stolenType !== 'berserker' || isInsideEnemyGojoDomain(this)) return;
    if (this.rage <= 0 && this.rageTimer <= 0 && this.rageFadeTimer <= 0) return;

    ctx.save();
    
    // Draw directly below the fighter
    // The exact height matches where Berserker draws it (this.y + this.r + 20)
    ctx.translate(this.x, this.y + this.r + 20);

    const barWidth = 40;
    const barHeight = 6;
    
    // Base dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    let fillRatio = 0;
    let fillColor = '#00ff64'; // Arcane rage green
    let glowColor = '#00cc50';

    if (this.isInRage) {
      // Draining full bar during rage
      fillRatio = this.rageTimer / (CONFIG.berserker.rageDuration || 480);
      fillRatio = Math.max(0, Math.min(1, fillRatio));
    } else if (this.rageFadeTimer > 0) {
      // Fading out empty bar after rage
      fillRatio = 0;
      ctx.globalAlpha = this.rageFadeTimer / 45;
    } else {
      // Filling bar before rage
      fillRatio = this.rage / (CONFIG.berserker.maxRage || 100);
      fillRatio = Math.max(0, Math.min(1, fillRatio));
    }

    if (fillRatio > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(-barWidth / 2, 0, barWidth * fillRatio, barHeight);
    }

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, 0, barWidth, barHeight);

    ctx.restore();
  }

  /**
   * Ground telegraph rendering for Rubbick (Arcane Emerald Ground Magic Circles)
   */
  drawGroundTelegraph(ctx) {
    if (this.hp <= 0 || this.isDead || isInsideEnemyGojoDomain(this)) return;

    // 1. Stolen Unlimited Void Wind-up Ground Summoning Circle (Arcane Emerald Green)
    if (this.stolenType === 'gojo_domain' && this.stolenWindUpTimer > 0) {
      const windupMax = 60;
      const progress = Math.min(1.0, Math.max(0, 1 - (this.stolenWindUpTimer / windupMax)));

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(1, 0.4); // Isometric perspective

      const ringRadius = 160 * progress;

      // Outer glowing Arcane Emerald ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(0, 255, 100, ${progress * 0.95})`;
      ctx.stroke();

      // Inner rotating dashed jade/emerald ring
      ctx.rotate(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(80, 255, 150, ${progress * 1.2})`;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    // 2. Stolen Unlimited Void Active Ground Magic Circle (Continuous Pulsing Arcane Emerald)
    if ((this.stolenDomainActive || (this.domainActive && this.stolenType === 'gojo_domain')) && this.stolenDomainTimer > 0) {
      const time = Date.now();
      const pulse = 0.95 + Math.sin(time * 0.005) * 0.05;
      const ringRadius = 160 * pulse;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(1, 0.4); // Isometric perspective

      // Outer glowing emerald ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.85)';
      ctx.stroke();

      // Inner rotating dashed jade ring
      ctx.rotate(time / 400);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([16, 12]);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(80, 255, 150, 0.80)';
      ctx.stroke();
      ctx.setLineDash([]);

      // 8-point rotating arcane glyph star in center
      ctx.rotate(-time / 250);
      ctx.beginPath();
      const starR = ringRadius * 0.55;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const dist = (i % 2 === 0) ? starR : starR * 0.45;
        const px = Math.cos(a) * dist;
        const py = Math.sin(a) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.55)';
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * Domain expansion background rendering for Rubbick (Unlimited Void in Arcane Emerald Green)
   */
  drawDomainBackground(ctx, isClashSecondary = false) {
    if (!this.domainActive && !this.stolenDomainActive) return;
    if (isInsideEnemyGojoDomain(this)) return;
    if (typeof state !== 'undefined' && state.pixiApp) return;
    if (this.stolenType === 'gojo_domain' || this.stolenDomainActive) {
      renderRubbickDomainBackground(this, ctx, isClashSecondary);
      return;
    }
    const arena = CONFIG.arena;
    if (!arena) return;

    ctx.save();
    // Dark void domain canvas background
    ctx.fillStyle = '#011106';
    ctx.fillRect(-200, -200, state.canvas.width + 400, state.canvas.height + 400);

    // Deep arcane domain background fill
    ctx.fillStyle = 'rgba(5, 25, 15, 0.95)';
    ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.restore();
  }

  drawDomainForeground(ctx, isClashSecondary = false) {
    if (!this.domainActive && !this.stolenDomainActive) return;
  }
}

export const TricksterFighter = RubbickFighter;

