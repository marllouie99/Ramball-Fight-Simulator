import { Fighter, isEntityOutsideArena } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound, stopLoopingSound, pauseLoopingSound, resumeLoopingSound } from '../../systems/soundSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { drawDivineFlameArrowConstruct } from '../../graphics/draw.js';
import { renderSukunaDomainBackground, renderSukunaDomainForeground, renderSukunaDomainSlashLines, clearDomainSlashLines } from './sukuna/sukunaDomainVisuals.js';
import { checkSpiderwebTrigger as modCheckSpiderweb, activateSpiderweb as modActivateSpiderweb, fireDivineFlame as modFireDivineFlame, activateReverseCursedTechnique as modActivateRCT, doDomainRapidSlashes as modDomainRapidSlashes, applyDomainEffect as modApplyDomainEffect } from './sukuna/sukunaSkills.js';
import { spawnTeleportAfterimages as modSpawnTeleportAfterimages, executeTeleportDodge as modExecuteTeleportDodge, teleportAwayFrom as modTeleportAwayFrom, updateMeleeCombat as modUpdateMeleeCombat, teleportToMeleeAngle as modTeleportToMeleeAngle } from './sukuna/sukunaCombat.js';
import { initMahoragaSummon, resetMahoragaSummon, updateMahoragaSummon } from './sukuna/sukunaMahoragaSummon.js';
import { drawSukunaBody } from '../../graphics/fighters/sukunaSkin.js';
import { SukunaRenderer } from '../../graphics/fighters/sukunaRenderer.js';

export class SukunaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'sukuna';

    // Bind basic attack cooldown to the specific Sukuna config
    this.shootCooldownMax = CONFIG.sukuna.slashCooldown || 50;

    // Reverse Cursed Technique (Passive)
    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;
    this.hasUsedRCTRevival = false;

    // Martial Arts combo counter for close distance basic attack
    this.martialArtsComboCount = 0;

    // Gojo-style Melee Combat Mode - Start round in Ranged Mode first
    this.isMeleeMode = false;
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;
    this.meleeComboTarget = 0;
    this.meleePunchCooldown = 0;

    this.divineFlameCooldown = CONFIG.sukuna.divineFlameCooldown || 1500; // Delay initial cast
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameChargeMax = CONFIG.sukuna.divineFlameChargeMax || 100;
    this.divineFlameRecoveryTimer = 0;
    this.enableMahoragaSummon = CONFIG.sukuna?.enableMahoragaSummon ?? 1;
    this.divineFlameCastAngle = 0;

    // Domain Expansion: Malevolent Shrine (Ultimate)
    this.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200; // Delay initial cast reads from CONFIG
    this.domainActive = false;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.sukuna.domainChargeMax || 120; // 2 seconds channel
    this.domainUseCount = 0; // Allows domain to be cast up to 2 times per round
    this.domainTimeInsideMap = new Map(); // Tracks enemy frames inside domain for ramping damage

    // Bleed debuff tracking
    this.bleedStacks = new Map(); // Map fighter index -> stack count

    this.afterImages = []; // Red afterimages for teleport effect

    // Gojo-style Melee Combat Visuals (for Phantom Flurry)
    this.hitFlameWisps = []; // Residual stretched cursed energy flame wisps on hit
    this.combatAuraOpacity = 0; // Smooth fade-in & fade-out opacity for cursed energy aura
    this.sakugaImpactTimer = 0;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = 0;
    this.sakugaImpactY = 0;
    this.sakugaImpactAngle = 0;
    this.sakugaImpactSeed = 0;

    // Sound cooldown to prevent audio stacking
    this._slashSoundCooldown = 0;
    this.initialTeleportDone = false;

    // Stacking Slash Crit Passive
    this.slashHitCount = 0;
    this.critChance = CONFIG.sukuna?.baseCritChance || 0.25;
    this.critMultiplier = CONFIG.sukuna?.baseCritMultiplier || 0.25;
    this.damageNumberColor = '#ff4455';
    this.hasUnderBodyAura = true;

    // Optional Skill: Ten Shadows — summon Mahoraga as a temporary allied minion
    initMahoragaSummon(this);

    this._registerSkills();
  }

  _registerSkills() {
    const skills = [];
    if (this.isSkillEnabled(CONFIG.sukuna?.enableDomain, true)) {
      skills.push({
        id: 'ms',
        name: 'MALEVOLENT SHRINE',
        type: 'domain',
        cooldownKey: 'domainCooldown',
        cooldownMax: () => (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200,
        durationKey: 'domainTimer',
        durationMax: () => (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainDuration !== undefined) ? CONFIG.sukuna.domainDuration : 500,
        activeKey: 'domainActive',
        channelingKey: 'isChannelingDomainExpansion',
        isDomain: true,
        allowFrozenTick: true,
        allowsFrozenCooldownTick: true,
        resetCooldownOnExpire: true,
        canTickCooldown: (fighter) => !fighter.domainActive && (fighter.domainTimer || 0) <= 0,
        onExpire: (fighter) => {
          clearDomainSlashLines(this);
          if (fighter) {
            fighter.domainActive = false;
            fighter.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200;
            fighter._hasPlayedDomainChannelSound = false;
            fighter._hasPlayedDomainActivateSound = false;
            fighter._hasFiredFugaInDomain = false;
            fighter._isFiringDomainFuga = false;
            const normalCd = (CONFIG.sukuna && CONFIG.sukuna.divineFlameCooldown) ? CONFIG.sukuna.divineFlameCooldown : 1500;
            fighter.divineFlameCooldown = Math.max(fighter.divineFlameCooldown, normalCd);
          }
        }
      });
    }
    if (this.isSkillEnabled(CONFIG.sukuna?.enableFurnace, true)) {
      skills.push({
        id: 'fuga',
        name: 'FUGA (FURNACE)',
        type: 'offensive',
        cooldownKey: 'divineFlameCooldown',
        cooldownMax: CONFIG.sukuna?.divineFlameCooldown || 1500,
        channelingKey: 'isChannelingDivineFlame',
        channelTimerKey: 'divineFlameChargeTimer',
        channelMaxKey: 'divineFlameChargeMax'
      });
    }
    if (this.isSkillEnabled(CONFIG.sukuna?.enableRCT, true)) {
      skills.push({
        id: 'rct',
        name: 'RCT',
        type: 'healing',
        cooldownKey: 'reverseCursedTechniqueCooldown',
        cooldownMax: CONFIG.sukuna?.reverseCursedTechniqueCooldown || 700,
        allowsFrozenCooldownTick: true,
        bypassParalyze: true
      });
    }
    // Optional Skill: Ten Shadows — Mahoraga summon (cooldown is driven by the summon module)
    if (this.isSkillEnabled(CONFIG.sukuna?.enableMahoragaSummon, true)) {
      skills.push({
        id: 'mahoraga',
        name: 'TEN SHADOWS',
        type: 'summon',
        cooldownKey: 'mahoragaSummonCooldown',
        cooldownMax: CONFIG.sukuna?.mahoragaSummonCooldown ?? 1500,
        activeKey: 'mahoragaSummonActive',
        allowsFrozenCooldownTick: false
      });
    }
    this.skillManager.registerSkills(skills);
  }

  /**
   * Checks whether Sukuna or his summoned Mahoraga minion is still active in combat.
   * If Sukuna dies while Mahoraga is alive, the match continues until one prevails.
   */
  isEffectivelyAlive() {
    if (this.mahoragaMinion && this.mahoragaMinion.hp > 0 && !this.mahoragaMinion.isDead && !this.mahoragaMinion.dead) {
      return true;
    }
    if (typeof state !== 'undefined' && Array.isArray(state.illusions)) {
      const hasLiveMahoraga = state.illusions.some(
        (m) => m && m.isMahoragaSummon && m.owner === this && m.hp > 0 && !m.isDead && !m.dead
      );
      if (hasLiveMahoraga) return true;
    }
    return super.isEffectivelyAlive();
  }

  /**
   * Keeps Mahoraga minion updated and active in combat even if Sukuna is defeated.
   */
  updateAutonomousMinions(ownerIndex, arena) {
    if (this.mahoragaMinion && this.mahoragaMinion.hp > 0 && !this.mahoragaMinion.isDead && !this.mahoragaMinion.dead) {
      updateMahoragaSummon(this, ownerIndex, arena);
    }
  }

  isStationarySkillActive() {
    return Boolean(
      this.isChannelingDivineFlame ||
      (this.divineFlameChargeTimer > 0) ||
      this.isChannelingDomainExpansion ||
      this.isChannelingDomain ||
      (this.domainChargeTimer > 0) ||
      (this.domainChannelTimer > 0) ||
      (this.spiderwebChannelTimer > 0) ||
      this.isSummoningMahoraga ||
      super.isStationarySkillActive?.()
    );
  }

  interruptAttacks(forceCancelAll = false) {
    const wasChannelingDomain = this.isChannelingDomainExpansion;
    const savedDomainCharge = this.domainChargeTimer;
    const savedDomainAudio = this._hasPlayedDomainChannelSound;

    // Fuga Hyper-Armor: ONLY death, Toji ISOH ambush/silence, or Pure Love Beam can cancel Fuga channeling!
    // Getting hit, taking knockback, or getting pulled/dragged by any attack MUST NOT cancel Fuga.
    const isAmbushOrSilence = this.isTargetOfAmbush || ((this.silenceTimer || 0) > 0);
    const isBeamTrapped = this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0);
    const isDead = (this.hp !== undefined && this.hp <= 0) || this.isDead || this.dead;
    const isInsideGojoDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && f !== this && (f.isParalyzingDomain || f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
    );
    const shouldCancelFuga = isDead || isAmbushOrSilence || isBeamTrapped || forceCancelAll || isInsideGojoDomain;
    const preserveFuga = !shouldCancelFuga && this.isChannelingDivineFlame;
    const savedChargeTimer = this.divineFlameChargeTimer;
    const savedFugaKey = this.fugaSoundKey;

    super.interruptAttacks(forceCancelAll);


    this.isTeleporting = false;
    this.teleportSlideTimer = 0;
    this.cleaveCutTimer = 0;
    if (this.afterImages) this.afterImages.length = 0;
    if (this.slashHitVisuals) this.slashHitVisuals.length = 0;
    if (forceCancelAll || shouldCancelFuga) {
      this.isSummoningMahoraga = false;
      this.mahoragaSummonWindupTimer = 0;
    }


    if (shouldCancelFuga) {
      if (this.fugaSoundKey) {
        stopLoopingSound(this.fugaSoundKey);
        this.fugaSoundKey = null;
      }
      if (this.isChannelingDivineFlame) {
        const normalCd = (CONFIG.sukuna && CONFIG.sukuna.divineFlameCooldown) ? CONFIG.sukuna.divineFlameCooldown : 1500;
        const domainCd = CONFIG.sukuna?.divineFlameDomainCooldown ?? 210;
        this.divineFlameCooldown = this.domainActive ? domainCd : Math.round(normalCd * 0.5);
      }
      this.isChannelingDivineFlame = false;
      this.divineFlameChargeTimer = 0;
      this._isFiringDomainFuga = false;
      this.isChannelingDomainExpansion = false;
      this.domainChargeTimer = 0;
      this._hasPlayedDomainChannelSound = false;
      this._hasPlayedDomainActivateSound = false;
      return;
    }

    // Domain Expansion Hyper Armor: ONLY Toji (ISOH ambush/silence) can interrupt domain expansion channeling!
    if (wasChannelingDomain) {
      if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this._hasPlayedDomainChannelSound = false;
        this._hasPlayedDomainActivateSound = false;
      } else {
        this.isChannelingDomainExpansion = true;
        this.domainChargeTimer = savedDomainCharge;
        this._hasPlayedDomainChannelSound = true;
      }
    }

    if (preserveFuga) {
      // Restore Fuga channeling state that super.interruptAttacks() wiped
      this.isChannelingDivineFlame = true;
      this.divineFlameChargeTimer = savedChargeTimer;
      this.fugaSoundKey = savedFugaKey;
      const isDomainTimeStop = (this.timeStopTimer > 0);
      if (isDomainTimeStop && this.fugaSoundKey) {
        pauseLoopingSound(this.fugaSoundKey);
      }
    } else {
      if (this.fugaSoundKey) {
        stopLoopingSound(this.fugaSoundKey);
        this.fugaSoundKey = null;
      }
      if (this.isChannelingDivineFlame) {
        const normalCd = (CONFIG.sukuna && CONFIG.sukuna.divineFlameCooldown) ? CONFIG.sukuna.divineFlameCooldown : 1500;
        const domainCd = CONFIG.sukuna?.divineFlameDomainCooldown ?? 210;
        this.divineFlameCooldown = this.domainActive ? domainCd : Math.round(normalCd * 0.5);
      }
      this.isChannelingDivineFlame = false;
      this.divineFlameChargeTimer = 0;
      this._isFiringDomainFuga = false;
    }
  }

  reset() {
    super.reset();

    // Stop the Fuga charge audio if resetting
    if (this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }

    this.reverseCursedTechniqueCooldown = CONFIG.sukuna.reverseCursedTechniqueCooldown || 700;
    this.reverseCursedTechniqueTriggered = false;
    this.hasUsedRCTRevival = false;
    this.martialArtsComboCount = 0;

    // Start round in Ranged Mode first
    this.isMeleeMode = false;
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;
    this.meleeComboTarget = 0;
    this.meleePunchCooldown = 0;

    this.divineFlameCooldown = CONFIG.sukuna.divineFlameCooldown || 1500;
    this.isChannelingDivineFlame = false;
    this._hasFiredFugaInDomain = false;
    this._isFiringDomainFuga = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameChargeMax = CONFIG.sukuna.divineFlameChargeMax || 100;
    this.divineFlameRecoveryTimer = 0;
    this.divineFlameCastAngle = null;

    this.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this._hasPlayedDomainActivateSound = false;
    this.domainChargeTimer = 0;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainUseCount = 0;
    if (this.domainTimeInsideMap) {
      this.domainTimeInsideMap.clear();
    } else {
      this.domainTimeInsideMap = new Map();
    }
    if (this.bleedStacks) {
      this.bleedStacks.clear();
    } else {
      this.bleedStacks = new Map();
    }
    this.afterImages = [];
    this.hitFlameWisps = [];
    this.combatAuraOpacity = 0;
    this.sakugaImpactTimer = 0;
    this.initialTeleportDone = false;

    // Reset Stacking Slash Crit Passive
    this.slashHitCount = 0;
    this.critChance = CONFIG.sukuna?.baseCritChance || 0.10;
    this.critMultiplier = CONFIG.sukuna?.baseCritMultiplier || 1.50;

    // Reset Optional Skill: Ten Shadows — Mahoraga summon
    resetMahoragaSummon(this);
  }

  // ── STACKING SLASH CRIT PASSIVE ──
  evaluateSlashCrit(target, baseDamage = 15, opts = {}) {
    if (!this.isSkillEnabled(CONFIG.sukuna?.enableCritPassive, true)) {
      return { finalDamage: baseDamage, isCrit: false };
    }
    if (!target || target.hp <= 0 || target.isDead) {
      return { finalDamage: baseDamage, isCrit: false };
    }

    // Increment landed slash hit count
    this.slashHitCount = (this.slashHitCount || 0) + 1;

    // Calculate dynamic Crit Rate & Crit DMG
    const baseChance = CONFIG.sukuna?.baseCritChance || 0.10;
    const chancePerHit = CONFIG.sukuna?.critChancePerSlashHit || 0.02;
    const maxChance = CONFIG.sukuna?.maxCritChance || 0.80;
    this.critChance = Math.min(maxChance, baseChance + this.slashHitCount * chancePerHit);

    const baseMult = CONFIG.sukuna?.baseCritMultiplier || 1.50;
    const multPerHit = CONFIG.sukuna?.critMultiplierPerSlashHit || 0.05;
    const maxMult = CONFIG.sukuna?.maxCritMultiplier || 3.50;
    this.critMultiplier = Math.min(maxMult, baseMult + this.slashHitCount * multPerHit);

    // Roll for critical hit
    const isCrit = !opts.isCrit && Math.random() < this.critChance;
    const finalDamage = isCrit ? Math.round(baseDamage * this.critMultiplier) : baseDamage;

    if (isCrit) {
      const targetDrawY = target.y - (target.z || 0);
      spawnSparks(target.x, targetDrawY, 18, 'crimsonSniper');
      spawnImpactFlash(target.x, targetDrawY, 35, '#ff1144');
    }

    return { finalDamage, isCrit };
  }

  triggerDemoAttack() {
    const fakeTarget = { x: 80, y: 0, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
    this.slashGlowTimer = 40;
    this.punchAnimTimer = 35;
    if (typeof this.performCleaveStrike === 'function') {
      this.performCleaveStrike(fakeTarget, 0);
    }
  }

  get channelTurnRate() {
    if (this.isChannelingDivineFlame) {
      return CONFIG.sukuna?.divineFlameChannelTurnRate ?? 0.045;
    }
    return 0.045;
  }

  canAim() {
    if (this.isChannelingDomainExpansion) {
      return false; // Disable auto-aim while channeling Domain Expansion!
    }
    if ((this.divineFlameRecoveryTimer || 0) > 0) {
      return false; // Lock aim during post-fire recoil/recovery
    }
    return super.canAim();
  }

  aim(target) {
    if (this.isChannelingDomainExpansion) {
      this.gunAngle = 0;
      this.angle = 0;
      return false; // Disable auto-aim and lock facing directly towards player/camera (0) while channeling Domain Expansion!
    }
    if ((this.divineFlameRecoveryTimer || 0) > 0) {
      const lockedAngle = (this.divineFlameCastAngle !== undefined && this.divineFlameCastAngle !== null && !Number.isNaN(this.divineFlameCastAngle))
        ? this.divineFlameCastAngle
        : (this.gunAngle || 0);
      this.divineFlameCastAngle = lockedAngle;
      this.gunAngle = lockedAngle;
      this.angle = lockedAngle;
      return false;
    }

    const aimTarget = target || (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : null);
    const aimResult = super.aim(aimTarget);

    if (this.isChannelingDivineFlame) {
      this.divineFlameCastAngle = this.gunAngle;
      this.angle = this.gunAngle;
      return aimResult;
    }

    // When stationary, body facing matches gunAngle (target aim direction).
    // When moving, body rotates dynamically via movement physics (spinRate).
    const speed = Math.hypot(this.vx || 0, this.vy || 0);
    if (speed <= 0.05) {
      this.angle = this.gunAngle;
    }
    return aimResult;
  }

  /**
   * Helper method to check if Sukuna is currently channeling or performing any active skill/ultimate.
   */
  isChannelingAnySkill() {
    return !!(
      this.isChannelingDivineFlame ||
      this.isChannelingDomainExpansion ||
      this.isSummoningMahoraga ||
      this.isTargetOfAmbush
    );
  }



  takeDamage(amount, attacker, opts = {}) {
    const isChannelingSkill = typeof this.isChannelingSkill === 'function' && this.isChannelingSkill();
    const isDraggedOrTrapped = Boolean(
      this.isDraggedByGetsuga ||
      this.isChainedByMakima ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      (typeof this.isPulledOrDragged === 'function' && this.isPulledOrDragged()) ||
      this.isWallPinnedByMakima ||
      this.isWallPinnedBySaitama ||
      this.isWallPinnedByEscanor ||
      this.isCurrentlyWallPinnedByEscanor
    );

    // If getting meleed or hit up close, force switch into Melee Mode to punch back (only when not channeling skills and not dragged/trapped)
    const closeRangeRadius = CONFIG.sukuna?.closeRangeRadius ?? 85;
    const isAttackerChannelingGojo = attacker && (attacker.characterId === 'gojo' || attacker.type === 'gojo' || attacker._def?.id === 'gojo' || attacker._def?.type === 'gojo') &&
      (attacker.redBuildupPhase || (attacker.redEffectTimer || 0) > 0 || attacker.isDomainPreSlide || attacker.isChannelingDomainExpansion || (attacker.domainChargeTimer || 0) > 0);
    const isMeleeAllowed = this.isSkillEnabled(CONFIG.sukuna?.enableMeleeMode, true);
    if (isMeleeAllowed && !isChannelingSkill && !isAttackerChannelingGojo && !isDraggedOrTrapped && !opts.isGetsuga && !(opts.projectile && opts.projectile.isGetsuga) && (opts.isMelee || (attacker && Math.hypot(attacker.x - this.x, attacker.y - this.y) <= closeRangeRadius))) {
      if (!this.isMeleeMode && (this.meleeModeCooldown || 0) <= 0) {
        this.forcedMeleeTimer = CONFIG.sukuna?.initialMeleeDuration ?? 120;
        this.isMeleeMode = true;
        this.meleeComboCount = 0;
      }
    }

    // High-speed Teleport Dodge chance (30% chance when dodge cooldown is ready, disabled on guaranteed hits / Nanami 7:3 Ratio crit / Getsuga drag / Beam traps)
    if (this.dodgeCooldown === undefined) this.dodgeCooldown = 0;
    const isGuaranteedHit = Boolean(opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit || opts.isDivineFlame || opts.isFuga || opts.isGetsuga || (opts.projectile && opts.projectile.isGetsuga) || opts.isRed || opts.isPurple || opts.isDomain || opts.isDomainSlash || isDraggedOrTrapped);
    const isStunned = (this.timeStopTimer > 0) || (this.hitStunTimer > 0) || (this.electricStunTimer > 0) || (this.dubstepStunTimer > 0) || (this.crimsonElectrifiedTimer > 0) || (this.isInsideCronosSphere && this.isInsideCronosSphere()) || isDraggedOrTrapped;
    const isDodgeEnabled = this.isSkillEnabled(CONFIG.sukuna?.enableTeleportDodge, true);
    if (isDodgeEnabled && !this.isTargetOfAmbush && !this.isChainedByMakima && !isChannelingSkill && !isGuaranteedHit && this.dodgeCooldown <= 0 && !isStunned && Math.random() < (CONFIG.sukuna.teleportDodgeChance ?? 0.30) && !opts.isHeal && !this.isDead && !this.domainActive && !opts.isStorm) {
      this._executeTeleportDodge(attacker, CONFIG.arena);
      this.dodgeCooldown = CONFIG.sukuna.teleportDodgeCooldown ?? 90; // 1.5 second cooldown between dodges
      return false; // Negate damage
    }

    // Snapshot HP before damage so the overpowering check is accurate
    const hpBefore = this.hp;

    const result = super.takeDamage(amount, attacker, opts);

    // Fatal Overpowering Override (matching Gojo):
    // If the attack is a sure kill (opts.isSaitamaCounter, opts.isSeriousPunch, or amount >= hpBefore fatal one-shot),
    // RCT is overwhelmed and does NOT trigger/revive.
    const isOverpoweredKill = (amount >= hpBefore) || Boolean(opts.isSaitamaCounter) || Boolean(opts.isSeriousPunch);
    const isRCTEnabled = this.isSkillEnabled(CONFIG.sukuna?.enableRCT, true);

    // Emergency RCT Revival check on fatal damage (once per match, matching Gojo)
    if (isRCTEnabled && !this.hasUsedRCTRevival && this.hp <= 0 && amount > 0 && !opts.isStorm && !opts.isHeal) {
      if (isOverpoweredKill) {
        // Hit was strong enough to kill him outright (e.g. Saitama counter) — no revival
        return result;
      }

      this.hasUsedRCTRevival = true;
      this.isDead = false;
      const rawRevival = CONFIG.sukuna?.rctRevivalHealAmount ?? (CONFIG.sukuna?.rctRevivalHealPercent ?? (CONFIG.sukuna?.reverseCursedTechniqueHealAmount ?? 0.50));
      const revivalAmount = (typeof rawRevival === 'number' && rawRevival <= 1.0) ? Math.round(this.maxHp * rawRevival) : Math.round(rawRevival);
      this.hp = Math.min(this.maxHp, Math.max(1, revivalAmount));
      this.invincibilityTimer = 60; // 1.0s invincibility during emergency revival
      this._activateReverseCursedTechnique(attacker);
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 45, 'RCT REVIVAL!', '#00FF66');
      }
      return false; // Prevent death
    }

    // Low-HP RCT Healing Auto-Trigger (Non-fatal)
    if (isRCTEnabled && !opts.isHeal && !isOverpoweredKill && (this.reverseCursedTechniqueCooldown || 0) <= 0 && !this.isDead && this.hp > 0) {
      const threshold = CONFIG.sukuna.reverseCursedTechniqueHpThreshold || 0.30;
      const hpPercent = this.hp / this.maxHp;

      // Trigger if HP drops below threshold
      if (hpPercent <= threshold && hpPercent > 0) {
        this._activateReverseCursedTechnique(attacker);
      }
    }

    return result;
  }

  _spawnTeleportAfterimages(oldX, oldY, targetX, targetY) {
    return modSpawnTeleportAfterimages(this, oldX, oldY, targetX, targetY);
  }

  _executeTeleportDodge(attacker, arena) {
    return modExecuteTeleportDodge(this, attacker, arena);
  }

  canPerformBasicAttack() {
    if (!this.isSkillEnabled(CONFIG.sukuna?.enableDismantle, true)) return false;
    if (this.isChannelingDivineFlame || this.isChannelingDomainExpansion || (this.divineFlameRecoveryTimer || 0) > 0) return false;
    if (this.isMeleeMode) return false;
    return super.canPerformBasicAttack();
  }

  shoot(ownerIndex) {
    if (!this.isSkillEnabled(CONFIG.sukuna?.enableDismantle, true)) return false;
    if (!this.canPerformBasicAttack()) return false;
    if (!projectileSystem) return;

    // Find closest valid enemy target
    const closestEnemy = typeof this._findClosestEnemy === 'function'
      ? this._findClosestEnemy()
      : (this.target || null);

    if (!closestEnemy || isEntityOutsideArena(closestEnemy)) return; // No targets available or target is outside arena

    const slashDamage = CONFIG.sukuna?.slashDamage ?? this.damage;
    const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;

    // Determine direct aim angle at enemy target
    let aimAngle = (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : (this.angle || 0);
    if (closestEnemy && !closestEnemy.isDead && closestEnemy.hp > 0) {
      const targetZ = closestEnemy.z || 0;
      const myZ = this.z || 0;
      aimAngle = Math.atan2((closestEnemy.y - targetZ) - (this.y - myZ), closestEnemy.x - this.x);
    }
    this.gunAngle = aimAngle;
    this.angle = aimAngle;

    // Trigger single-hand slicing chop animation with off-hand strictly hidden
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 11;
    this.slashSwingMaxTimer = 11;
    this.slashGlowTimer = 20;
    this.slashHand = (this.slashHand === 1 ? 0 : 1); // Strict toggle: 0 = Right hand, 1 = Left hand

    // Ranged Attack: Dismantle Slash (firing in any continuous angle)
    projectileSystem.fireProjectile(
      this,
      ownerIndex,
      slashDamage,
      false,
      slashSpeed,
      false,
      'ghostBlade',
      undefined,
      undefined,
      aimAngle
    );
    spawnFloatingText(this.x, this.y - this.r - 20, 'DISMANTLE!', '#E0E8FF');
    if (this._slashSoundCooldown <= 0) {
      playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
      playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.7);
      this._slashSoundCooldown = 12; // ~0.2 seconds at 60fps
    }
  }

  update(opponent, ownerIndex, arena) {
    // ── MALEVOLENT SHRINE: OPEN-BARRIER DOMAIN PROGRESSION & TICK ──
    // Malevolent Shrine continues to progress its duration timer and tick slashes/damage
    // even if Sukuna is afflicted with a paralyze debuff effect (Purple, Pure Love Beam, Getsuga Tensho, etc.), electric stun, or is in stasis!
    if (this.domainActive) {
      if (!this.skillManager || (!this.skillManager.hasSkill('ms') && !this.skillManager.hasSkill('domain'))) {
        this.domainTimer--;
      }
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200;
        clearDomainSlashLines(this);
        this._hasFiredFugaInDomain = false;
        this._isFiringDomainFuga = false;
        this.furnaceChargingEffectTimer = 0;
        this.furnaceReleaseEffectTimer = 0;
        const normalCd = (CONFIG.sukuna && CONFIG.sukuna.divineFlameCooldown) ? CONFIG.sukuna.divineFlameCooldown : 1500;
        this.divineFlameCooldown = Math.max(this.divineFlameCooldown, normalCd);
      } else {
        this._applyDomainEffect(arena);
      }
    }

    // Malevolent Shrine and RCT cooldowns are managed by SkillManager (1x canonical rate)

    // Update slash hit visuals (Ghost blade / domain slashes) so they animate even during paralyze / time stop
    if (this.slashHitVisuals && this.slashHitVisuals.length > 0) {
      fastCleanArray(this.slashHitVisuals, (v) => {
        v.timer--;
        return v.timer > 0;
      });
    }

    // Optional Skill: Ten Shadows — Mahoraga summon lifecycle & minion AI
    updateMahoragaSummon(this, ownerIndex, arena);

    // Intro Wall Rebound Stage
    if (this.introReboundActive) {
      if (this.introReboundTimer === undefined) {
        this.introReboundTimer = 18;
      }
      this.introReboundTimer--;

      if (opponent) {
        this.aim(opponent);
      }

      this.applyMovementPhysics(0);
      const didBounce = this.resolveWallBounce(arena);

      // Spawn red afterimages for dramatic slide effect
      if (this.afterImages) {
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          angle: this.angle,
          timer: 10,
          maxTimer: 10
        });
      }

      if (didBounce) {
        if (typeof audioSystem !== 'undefined') {
          audioSystem.playSFX('skill_dash3', 0.8);
        }
        this.introReboundActive = false;
        this.resumeMovement(opponent);
      } else if (this.introReboundTimer <= 0) {
        this.introReboundActive = false;
        this.resumeMovement(opponent);
      }
      return;
    }

    // Decrement slash sound cooldown
    if (this._slashSoundCooldown > 0) this._slashSoundCooldown--;
    if (this.slashGlowTimer > 0) this.slashGlowTimer--;

    if (this.mahoragaAdaptationFreezeTimer > 0) {
      this.mahoragaAdaptationFreezeTimer--;
      this.vx = 0;
      this.vy = 0;
      // Increment Fuga charge safely during wheel adaptation pause
      if (this.isChannelingDivineFlame) {
        this.divineFlameChargeTimer++;
        if (this.divineFlameChargeTimer >= this.divineFlameChargeMax) {
          this.divineFlameChargeTimer = 0;
          this._fireDivineFlame(ownerIndex);
        }
      }
      return; // Hold Sukuna in stasis during Mahoraga's 3D Wheel Adaptation Game Pause!
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.caughtInPureLoveBeam || (this.pureLoveBeamTimer || 0) > 0) {
      if (this.isChannelingDomainExpansion) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this._hasPlayedDomainChannelSound = false;
      }
      if (this.isChannelingDivineFlame) {
        const normalCd = (CONFIG.sukuna && CONFIG.sukuna.divineFlameCooldown) ? CONFIG.sukuna.divineFlameCooldown : 1500;
        const domainCd = CONFIG.sukuna?.divineFlameDomainCooldown ?? 210;
        this.divineFlameCooldown = this.domainActive ? domainCd : Math.round(normalCd * 0.5);
        this.isChannelingDivineFlame = false;
        this.divineFlameChargeTimer = 0;
        this._isFiringDomainFuga = false;
        if (this.fugaSoundKey) {
          stopLoopingSound(this.fugaSoundKey);
          this.fugaSoundKey = null;
        }
      }
      this.interruptAttacks(true);
    }

    if ((this.isChannelingDomainExpansion || this.isChannelingDivineFlame) && !this.isTargetOfAmbush && (this.silenceTimer || 0) <= 0 && !this.caughtInPureLoveBeam && (this.pureLoveBeamTimer || 0) <= 0) {
      // Unstoppable Skill/Domain Channeling Hyper-Armor: Clear all hitStun & paralyze freezes (Purple, Getsuga, etc.) so non-Toji attacks cannot interrupt!
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
      if (!this.isSkillPreservedInStasis()) {
        this.timeStopTimer = 0;
      }
      this.purpleHitTimer = 0;
      this.isCaughtInPurple = false;
      this._hitByGetsugaTimer = 0;
      this.paralyzeTimer = 0;
      this.isParalyzedByMahito = false;
      this.isParalyzedByMahoraga = false;
      this.isFrozenByInfinity = false;
      this.isWallSlammed = false;
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      // Only Toji (ISOH ambush/silence) can interrupt domain expansion channeling!
      if (this.isChannelingDomainExpansion) {
        if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
          this.isChannelingDomainExpansion = false;
          this.domainChargeTimer = 0;
          this._hasPlayedDomainChannelSound = false;
          this._hasPlayedDomainActivateSound = false;
        }
      }
      // Pause Fuga audio while frozen in Gojo's domain or Nanami hit-pause so audio stops until domain ends
      if (this.isChannelingDivineFlame && this.fugaSoundKey && !this.isTargetOfAmbush) {
        pauseLoopingSound(this.fugaSoundKey);
      }
      if (this.isSkillPreservedInStasis() || (isFrozen && (!this.isChannelingDomainExpansion && !this.isChannelingDivineFlame || this.isTargetOfAmbush || (this.silenceTimer || 0) > 0))) {
        return; // Freeze Sukuna completely while inside Gojo's Unlimited Void / time-stop / Nanami hit-pause / Naoya frame stasis
      }
    }

    // Resume Fuga charge audio if channeling after unfreezing
    if (this.isChannelingDivineFlame && this.fugaSoundKey) {
      resumeLoopingSound(this.fugaSoundKey);
    }

    // Failsafe: stop Fuga charge audio if not currently channeling Divine Flame
    if (!this.isChannelingDivineFlame && this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }

    // Update Sakuga impact frame timer
    if (this.sakugaImpactTimer > 0) {
      this.sakugaImpactTimer--;
    }

    // Update hit flame wisps so they animate even during hit pause
    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      fastCleanArray(this.hitFlameWisps, (wisp) => {
        wisp.x += wisp.vx;
        wisp.y += wisp.vy;
        wisp.vy -= 0.18; // Soft upward flame buoyancy
        wisp.angle += Math.sin(wisp.timer * 0.25) * 0.05; // Fluid curling sway
        wisp.vx *= 0.90;
        wisp.vy *= 0.90;
        wisp.timer--;
        return wisp.timer > 0;
      });
    }




    // Update punch effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      fastCleanArray(this.punchEffects, (p) => {
        p.timer--;
        return p.timer > 0;
      });
    }

    // Update teleport afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.forcedMeleeTimer > 0) this.forcedMeleeTimer--;
    if (this.meleeModeCooldown > 0) this.meleeModeCooldown--;

    // Smooth fade IN & fade OUT for Cursed Energy aura in hand-to-hand combat mode & flurry
    let inMeleeCombatMode = false;
    if (this.isMeleeMode || this.domainActive) {
      inMeleeCombatMode = true;
    }

    if (this.combatAuraOpacity === undefined) this.combatAuraOpacity = 0;
    if (state.gameState === 'countdown') {
      this.combatAuraOpacity = 0.0;
    } else if (inMeleeCombatMode) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.08);
    } else {
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.04);
    }

    // Update cooldowns (SkillManager handles base 1x per-frame decay for registered skills)
    if (this.spiderwebCooldown > 0) this.spiderwebCooldown--;
    if (this.domainActive && !this.isChannelingDivineFlame && (this.divineFlameRecoveryTimer || 0) <= 0 && this.divineFlameCooldown > 0) {
      const extraRate = (CONFIG.sukuna?.domainFugaCooldownTickRate || 3);
      this.divineFlameCooldown = Math.max(0, this.divineFlameCooldown - extraRate);
    }
    if (!this.isChannelingDomainExpansion && !this.domainActive && (this.domainChargeTimer || 0) <= 0) this._hasPlayedDomainChannelSound = false;
    if (this.meleeClashCooldown > 0) this.meleeClashCooldown--;

    // Handle Divine Flame Channeling
    if (this.isChannelingDivineFlame) {
      this.divineFlameChargeTimer++;

      // Subtle arena tremor while channeling Fuga (reads from CONFIG.sukuna)
      if (this.divineFlameChargeTimer % 6 === 0) {
        const channelShake = CONFIG.sukuna?.divineFlameChannelShakeIntensity || 2.5;
        const channelDuration = CONFIG.sukuna?.divineFlameChannelShakeDuration || 4;
        triggerGlobalScreenShake(channelShake, channelDuration);
      }

      // Play "Fuga" voice line exactly 45 frames (0.75s) before firing
      if (this.divineFlameChargeTimer === Math.max(1, this.divineFlameChargeMax - 100)) {
        const sound = getSkillSound(this._def?.id, 'fuga_fire');
        if (sound) playSound(sound.src, sound.volume);
      }

      if (this.divineFlameChargeTimer < this.divineFlameChargeMax) {
        // Allow external pulls/pushes (knockback, Getsuga drag, Blue suction, Purple suction, Black Hole pull) to move Sukuna while channeling Fuga!
        // Apply physics with 0 self-speed multiplier so external velocities move him and decay smoothly without self-walking
        this.applyMovementPhysics(0);

        // Smooth auto-aim tracking while channeling Fuga (no sudden snap on firing)
        const fugaAimTarget = (opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving))
          ? opponent
          : (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : null);
        if (fugaAimTarget && !this.isTargetOfAmbush && (this.timeStopTimer || 0) <= 0) {
          this.aim(fugaAimTarget);
        }
      } else {
        this.divineFlameChargeTimer = 0;
        this._fireDivineFlame(ownerIndex);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Stop attacking if round/match has ended or if target/opponent is dead!
    // IMPORTANT: Never interrupt mid-channel (Divine Flame / Fuga) as it would silence the looping Fuga audio.
    const isGamePlaying = typeof state !== 'undefined' && state.gameState === 'playing';
    const isTargetAlive = opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving) && (opponent.hp > 0 || opponent.isRevivingFromContract || opponent.isShatterReviving);

    if (!isGamePlaying || !isTargetAlive) {
      if (!this.isChannelingAnySkill()) {
        this.interruptAttacks(false);
      }
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.slashSwingTimer > 0) this.slashSwingTimer--;
      if (this.cleaveSwingTimer > 0) this.cleaveSwingTimer--;
      this.shootCooldown = 60;
      this.applyMovementPhysics();
      this.resolveWallBounce(arena);
      return;
    }

    // Handle Mahoraga Summon Windup Mudra Channeling
    if (this.isSummoningMahoraga) {
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = 0; // Lock facing angle directly towards player/camera (0)
      this.angle = 0;
      this.resolveWallBounce(arena);
      return;
    }

    // Handle Domain Expansion Channeling
    if (this.isChannelingDomainExpansion) {
      if ((this.silenceTimer || 0) > 0) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200;
        this._hasPlayedDomainChannelSound = false;
        this._hasPlayedDomainActivateSound = false;
        return;
      }
      this.domainChargeTimer++;

      // Immediately stop all movement while channeling domain expansion (holding Enma Ten hand seal)
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = 0; // Lock angle facing directly towards player/camera (Front POV 0)
      this.angle = 0;

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this._activateDomain(arena);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Handle Divine Flame Post-Fire Recovery
    if (this.divineFlameRecoveryTimer > 0) {
      this.divineFlameRecoveryTimer--;
      this.applyMovementPhysics(0);

      // Lock firing stance fixed in place during post-fire recovery
      const lockedAngle = (this.divineFlameCastAngle !== undefined && this.divineFlameCastAngle !== null && !Number.isNaN(this.divineFlameCastAngle))
        ? this.divineFlameCastAngle
        : (this.gunAngle || 0);
      this.gunAngle = lockedAngle;
      this.angle = lockedAngle;

      this.resolveWallBounce(arena);
      return;
    }

    // Inside Domain Expansion: Malevolent Shrine controls the field while Sukuna moves and fights naturally
    if (this.domainActive) {


      const isInsideGojoVoid = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
        f && f !== this && (f.isParalyzingDomain || f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
      );
      const isAmbushedOrStunned = this.isTargetOfAmbush || (this.timeStopTimer || 0) > 0 || (this.hitStunTimer || 0) > 0 || (opponent && opponent.ultimateActive) || isInsideGojoVoid;

      // Enable Sukuna to cast Divine Flame (Fuga: Open) INSIDE Malevolent Shrine when enemy is in range!
      if (this.isSkillEnabled(CONFIG.sukuna?.enableFurnace, true) && !isAmbushedOrStunned && (this.silenceTimer || 0) <= 0 && this.divineFlameCooldown <= 0 && !this.isChannelingDivineFlame && opponent && !opponent.isDead) {
        const alignedResult = (typeof this._findAlignedEnemyForFuga === 'function')
          ? this._findAlignedEnemyForFuga(opponent)
          : this._findCardinalAlignedEnemy(opponent);
        if (alignedResult) {
          const { target: alignedTarget } = alignedResult;
          const targetY = alignedTarget.y - (alignedTarget.z || 0);
          const sukunaY = this.y - (this.z || 0);
          const dx = alignedTarget.x - this.x;
          const dy = targetY - sukunaY;
          const aimAngle = Math.atan2(dy, dx);
          this.divineFlameCastAngle = aimAngle;
          this.gunAngle = aimAngle;
          this.angle = aimAngle;
          this.isChannelingDivineFlame = true;
          this._isFiringDomainFuga = true;
          this.divineFlameChargeTimer = 0;
          this.punchAnimTimer = 0;
          this.slashSwingTimer = 0;
          this.slashGlowTimer = 0;
          this.cleaveSwingTimer = 0;
          this.isMeleeMode = false;
          spawnFloatingText(this.x, this.y - this.r - 20, 'FURNACE (FUGA: OPEN)!', '#FF4500');

          const sound = getSkillSound(this._def?.id, 'divineFlame');
          if (sound) {
            this.fugaSoundKey = 'fuga_charge_' + Math.random().toString(36).substr(2, 9);
            playLoopingSound(this.fugaSoundKey, sound.src, sound.volume);
          }
          return;
        }
      }
    }

    // Check for Spiderweb (Skill 1 - Passive trigger)
    if (this.isSkillEnabled(CONFIG.sukuna?.enableSpiderweb, true)) {
      this._checkSpiderwebTrigger(arena);
    }

    const isInsideGojoVoid = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && f !== this && (f.isParalyzingDomain || f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
    );
    const isAmbushedOrStunned = this.isTargetOfAmbush || (this.timeStopTimer || 0) > 0 || (this.hitStunTimer || 0) > 0 || (opponent && opponent.ultimateActive) || isInsideGojoVoid;

    // Check for Divine Flame (Skill 2 - disabled in demo mode)
    if (this.isSkillEnabled(CONFIG.sukuna?.enableFurnace, true) && !this.isDemoFighter && !isAmbushedOrStunned && !this.isChannelingAnySkill() && this.divineFlameCooldown <= 0 && opponent && !opponent.isDead) {
      const alignedResult = (typeof this._findAlignedEnemyForFuga === 'function')
        ? this._findAlignedEnemyForFuga(opponent)
        : this._findCardinalAlignedEnemy(opponent);
      if (alignedResult) {
        const { target: alignedTarget } = alignedResult;
        const targetY = alignedTarget.y - (alignedTarget.z || 0);
        const sukunaY = this.y - (this.z || 0);
        const dx = alignedTarget.x - this.x;
        const dy = targetY - sukunaY;
        const distSq = dx * dx + dy * dy;
        const safeDistance = 120;
        if (distSq > safeDistance ** 2) {
          const aimAngle = Math.atan2(dy, dx);
          this.divineFlameCastAngle = aimAngle;
          this.gunAngle = aimAngle;
          this.angle = aimAngle;
          this.isChannelingDivineFlame = true;
          this._isFiringDomainFuga = false;
          this.isChannelingDomainExpansion = false; // Explicit mutual exclusion
          this.divineFlameChargeTimer = 0;
          this.punchAnimTimer = 0;
          this.slashSwingTimer = 0;
          this.slashGlowTimer = 0;
          this.cleaveSwingTimer = 0;
          this.isMeleeMode = false;
          spawnFloatingText(this.x, this.y - this.r - 20, 'FURNACE (FUGA)', '#FF4500');

          const sound = getSkillSound(this._def?.id, 'divineFlame');
          if (sound) {
            this.fugaSoundKey = 'fuga_charge_' + Math.random().toString(36).substr(2, 9);
            playLoopingSound(this.fugaSoundKey, sound.src, sound.volume);
          }
          return; // Prevent melee/shoot in the same frame
        }
      }
    }

    // Check for Domain Expansion (Ultimate - disabled in demo mode)
    const isSilenced = (this.silenceTimer || 0) > 0;
    if (this.isSkillEnabled(CONFIG.sukuna?.enableDomain, true) && !this.isDemoFighter && !isSilenced && !isAmbushedOrStunned && !this.isChannelingAnySkill() && this.domainCooldown <= 0 && !this.domainActive && opponent && !opponent.isDead && this.hasSpottedEnemy(opponent, arena)) {
      this.isMeleeMode = false;
      this.forcedMeleeTimer = 0;
      this.punchAnimTimer = 0;
      this.isChannelingDomainExpansion = true;
      this.isChannelingDivineFlame = false; // Explicit mutual exclusion
      this.domainChargeTimer = 0;
      this.vx = 0; // Immediately lock movement when domain channeling starts
      this.vy = 0;
      this.gunAngle = 0; // Lock facing angle directly towards player/camera (0)
      this.angle = 0;
      if (!this._hasPlayedDomainChannelSound) {
        this._hasPlayedDomainChannelSound = true;
        this._hasPlayedDomainActivateSound = false;
        const channelSound = getSkillSound(this._def?.id, 'domain_channel');
        const chanSrc = channelSound?.src || CONFIG.sukuna?.sounds?.domainChannel || 'Assets/Sound Effects/Skills/domainexpansion.mp3';
        const chanVol = channelSound?.volume ?? (CONFIG.sukuna?.soundVolumes?.domainChannel ?? 2.75);
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
          this._domainVoiceHandle = audioSystem.playFighterVoiceline(this, chanSrc, chanVol, 1.0, 0, 0, {
            priority: 'domain',
            isProtected: true,
            durationMs: 3000
          });
        } else {
          playSound(chanSrc, chanVol);
        }
      }
      return; // Prevent melee/shoot in the same frame
    }

    // Dynamic enemy proximity check
    let isBeingMeleed = false;
    let closestEnemyDist = Infinity;
    const myTeam = state.getFighterTeam(ownerIndex);
    const closeRangeRadius = CONFIG.sukuna?.closeRangeRadius ?? 85;
    const leaveMeleeRadius = closeRangeRadius + 30;

    if (opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving) && !opponent.dead && (opponent.hp > 0 || opponent.isRevivingFromContract || opponent.isShatterReviving) && (!opponent.isStealthed || this.domainActive) && !opponent.isJumpedOut && opponent.jumpState !== 'outside' && !opponent.isUntargetable) {
      const d = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (d < closestEnemyDist) closestEnemyDist = d;
      const isOpponentGojoChanneling = (opponent.characterId === 'gojo' || opponent.type === 'gojo' || opponent._def?.id === 'gojo' || opponent._def?.type === 'gojo') &&
        (opponent.redBuildupPhase || (opponent.redEffectTimer || 0) > 0 || opponent.isDomainPreSlide || opponent.isChannelingDomainExpansion || (opponent.domainChargeTimer || 0) > 0);
      if (d <= closeRangeRadius && !isOpponentGojoChanneling) {
        isBeingMeleed = true;
      }
    }

    if (state.fighters && state.fighters.length > 0) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || (f.hp <= 0 && !f.isRevivingFromContract && !f.isShatterReviving) || (f.isStealthed && !this.domainActive)) continue;
        if (f.isJumpedOut || f.jumpState === 'outside' || f.isUntargetable) continue;
        if (this.isTeammate(f)) continue;
        const d = Math.hypot(this.x - f.x, this.y - f.y);
        if (d < closestEnemyDist) closestEnemyDist = d;
        const isFGojoChanneling = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo') &&
          (f.redBuildupPhase || (f.redEffectTimer || 0) > 0 || f.isDomainPreSlide || f.isChannelingDomainExpansion || (f.domainChargeTimer || 0) > 0);
        if (d <= closeRangeRadius && !isFGojoChanneling) {
          isBeingMeleed = true;
        }
      }
    }

    const isDraggedOrTrapped = Boolean(
      this.isDraggedByGetsuga ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      (typeof this.isPulledOrDragged === 'function' && this.isPulledOrDragged()) ||
      this.isWallPinnedByMakima ||
      this.isWallPinnedBySaitama ||
      this.isWallPinnedByEscanor ||
      this.isCurrentlyWallPinnedByEscanor
    );

    // Dynamic Melee vs Ranged Mode Switch
    if (!this.isTeleporting && !this.isChannelingDivineFlame && !this.isChannelingDomainExpansion) {
      if (isDraggedOrTrapped) {
        if (this.isMeleeMode) {
          this.isMeleeMode = false;
          this.forcedMeleeTimer = 0;
          this.punchAnimTimer = 0;
        }
      } else if (opponent && (opponent.isStealthed || opponent.isAmbushing) && !this.domainActive) {
        // Disengage from melee combat while opponent is in stealth or ambush mode so Sukuna moves and can dodge
        this.isMeleeMode = false;
        this.forcedMeleeTimer = 0;
      } else if (this.isMeleeMode) {
        if (this.meleeModeCooldown > 0) this.meleeModeCooldown--;
        if (this.forcedMeleeTimer > 0) {
          this.forcedMeleeTimer--;
        } else if (closestEnemyDist > leaveMeleeRadius) {
          // DURATION EXPIRED: Disengage to Ranged Mode and start separation cooldown!
          this.isMeleeMode = false;
          this.forcedMeleeTimer = 0;
          this.punchAnimTimer = 0;
          this.meleeComboCount = 0;
          this.meleeModeCooldown = CONFIG.sukuna?.meleeModeCooldown ?? 120;
          if (opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving)) {
            this._teleportAwayFrom(opponent, arena);
          }
        }
      } else if (isBeingMeleed && (this.meleeModeCooldown || 0) <= 0) {
        // Cooldown is READY and enemy is in melee range: ENTER MELEE MODE!
        if (this.isSkillEnabled(CONFIG.sukuna?.enableMeleeMode, true)) {
          this.isMeleeMode = true;
          this.forcedMeleeTimer = CONFIG.sukuna?.initialMeleeDuration ?? 120;
          this.meleeComboCount = 0;
        }
      }
    }

    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && (!this.timeStopTimer || this.timeStopTimer <= 0) && !this.isChannelingDivineFlame && !this.isChannelingDomainExpansion && (this.divineFlameRecoveryTimer || 0) <= 0 && !isDraggedOrTrapped;
    const isTargetReforming = Boolean(opponent && (opponent.isRevivingFromContract || opponent.isShatterReviving));

    // Handle Melee Combat Mode vs Ranged Mode
    if (this.isMeleeMode && !isDraggedOrTrapped) {
      this.vx = 0;
      this.vy = 0;
      if (opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving)) {
        if (canAct && !isTargetReforming && Math.hypot(this.knockbackVx || 0, this.knockbackVy || 0) <= 0.5) {
          this._updateMeleeCombat(opponent, arena, ownerIndex);
        }
      }
    } else {
      // Ranged Mode - Basic attack (Dismantle)
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (canAct && !isTargetReforming) {
        this.shoot(ownerIndex);
        this.shootCooldown = this.shootCooldownMax;
      }
    }

    const speedMult = this.isMeleeMode ? 0 : 1.0;
    this.applyMovementPhysics(speedMult);

    if (opponent && (!opponent.isDead || opponent.isRevivingFromContract || opponent.isShatterReviving)) {
      this.aim(opponent);
    } else {
      this.turnToNormalPosition(0.035);
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Handle melee combat - teleports, then rapid strikes
   */
  _updateMeleeCombat(opponent, arena, ownerIndex) {
    return modUpdateMeleeCombat(this, opponent, arena, ownerIndex);
  }

  _teleportToMeleeAngle(opponent, arena) {
    return modTeleportToMeleeAngle(this, opponent, arena);
  }

  _teleportAwayFrom(opponent, arena) {
    return modTeleportAwayFrom(this, opponent, arena);
  }

  _checkSpiderwebTrigger(arena) {
    return modCheckSpiderweb(this, arena);
  }

  _activateSpiderweb() {
    return modActivateSpiderweb(this);
  }

  _fireDivineFlame(ownerIndex) {
    return modFireDivineFlame(this, ownerIndex);
  }

  _activateReverseCursedTechnique(attacker) {
    return modActivateRCT(this, attacker);
  }

  _activateDomain(arena) {
    this.isChannelingDomainExpansion = false;
    this.domainChargeTimer = 0;
    this.domainActive = true;
    this._hasFiredFugaInDomain = false;
    this._isFiringDomainFuga = false;
    this.domainActivationTime = Date.now();
    this.domainUseCount++;
    this.domainTimer = CONFIG.sukuna.domainDuration || 500;
    this.domainCooldown = (typeof CONFIG !== 'undefined' && CONFIG.sukuna?.domainCooldown !== undefined) ? CONFIG.sukuna.domainCooldown : 1200;
    this.rapidSlashTimer = 0; // Ready for first slash immediately upon domain opening!

    // Position closer to the center of the arena so the top of the shrine isn't clipped
    if (arena) {
      this.domainX = arena.x + arena.width / 2;
      this.domainY = arena.y + arena.height * 0.45; // 45% from the top (moved down to fit inside arena bounds)
    } else {
      this.domainX = this.x;
      this.domainY = this.y;
    }

    spawnFloatingText(this.domainX, this.domainY + 50, 'MALEVOLENT SHRINE', '#8B0000');

    if (!this._hasPlayedDomainActivateSound) {
      this._hasPlayedDomainActivateSound = true;
      const sound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
      const actSrc = sound?.src || CONFIG.sukuna?.sounds?.domainActivate || 'Assets/Sound Effects/Skills/shrine.mp3';
      const actVol = sound?.volume ?? (CONFIG.sukuna?.soundVolumes?.domainActivate ?? 1.80);
      if (typeof audioSystem !== 'undefined') {
        audioSystem.playSFX(actSrc, actVol);
      } else {
        playSound(actSrc, actVol);
      }
    }
  }

  _doDomainRapidSlashes(opponent, arena, ownerIndex) {
    return modDomainRapidSlashes(this, opponent, arena, ownerIndex);
  }

  _applyDomainEffect(arena) {
    return modApplyDomainEffect(this, arena);
  }

  applyBleed(target, stacks) {
    if (!this.isSkillEnabled(CONFIG.sukuna?.enableBleed, true)) return;
    if (!target || target.dead || target.isDead || (target.hp !== undefined && target.hp <= 0)) return;
    if (target.isBloodImmune || target.noBlood || target.suppressBlood || target.bleedImmune || target.isStatusImmune || target.isBaguvixActive || target.isGodModeActive) return;
    if (!this.bleedStacks.has(target)) {
      this.bleedStacks.set(target, 0);
    }
    const currentStacks = this.bleedStacks.get(target);
    const newStacks = Math.min(currentStacks + stacks, CONFIG.sukuna.maxBleedStacks || 5);
    this.bleedStacks.set(target, newStacks);

    // Apply bleed damage over time
    const bleedDamage = CONFIG.sukuna.bleedDamagePerStack || 2;
    const totalBleedDamage = newStacks * bleedDamage;

    if (totalBleedDamage > 0) {
      spawnFloatingText(target.x, target.y - target.r - 10, 'BLEED', '#FF0000');
    }
  }

  drawBody(ctx) {
    drawSukunaBody(ctx, this);
  }

  drawSkin(ctx) {
    drawSukunaBody(ctx, this);
  }

  // Override status overlays for Sukuna: keep stun/freeze effects in crimson energy instead of blue rings!
  drawStatusOverlays(ctx, baseRadius) {
    if (this.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    // Replace blue electric stun ring with Sukuna crimson aura
    if (this.electricStunTimer > 0 || this.crimsonElectrifiedTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 30, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.poisonTicks > 0) {
      drawPoisonEffect(ctx, baseRadius);
    }

    if (this.burnTimer > 0) {
      const offset = baseRadius * 0.15;
      const grad = ctx.createRadialGradient(-offset, -offset, 0, 0, 0, baseRadius);
      const pulse = 0.05 * Math.sin(Date.now() / 100);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.65)');
      grad.addColorStop(0.35, `rgba(255, 130, 0, ${0.5 + pulse})`);
      grad.addColorStop(0.75, `rgba(200, 30, 0, ${0.35 + pulse})`);
      grad.addColorStop(1, 'rgba(100, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw(ctx) { SukunaRenderer.draw(ctx, this); }

  // Render physical circle hands + animated blobby Cursed Energy flame aura on Sukuna's front and back hands (Front POV style)
  _drawHandCursedEnergy(ctx, layer = 'all') { SukunaRenderer._drawHandCursedEnergy(ctx, this, layer); }

  // Draw glowing cursed energy on Sukuna's hands when unleashing slashes
  drawGun(ctx) { }

  // Delegated to SukunaRenderer (single source of truth in js/graphics/fighters/sukunaRenderer.js)
  _drawSakugaImpactFrame(ctx) { SukunaRenderer._drawSakugaImpactFrame(ctx, this); }
  _drawHitFlameWisps(ctx) { SukunaRenderer._drawHitFlameWisps(ctx, this); }
  _drawSukunaCursedEnergyAura(ctx, colorTheme = 'red', overrideX = null, overrideY = null, overrideRadius = null) {
    SukunaRenderer._drawSukunaCursedEnergyAura(ctx, this, colorTheme, overrideX, overrideY, overrideRadius);
  }
  _drawRealisticSkull(ctx, sx, sy, scale = 1.0, isDemon = false) {
    SukunaRenderer._drawRealisticSkull(ctx, this, sx, sy, scale, isDemon);
  }
  _drawShrineBody(ctx, skipGlow = false) { SukunaRenderer._drawShrineBody(ctx, this, skipGlow); }
  _createSaitamaPixelShrineCanvas(sourceCanvas) { return SukunaRenderer._createSaitamaPixelShrineCanvas(sourceCanvas); }
  _renderFullShrineToContext(ctx) { SukunaRenderer._renderFullShrineToContext(ctx, this); }

  // PUBLIC: Draw domain liquid water floor BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx, isClashSecondary = false) {
    if (typeof state !== 'undefined' && state.pixiApp) return;
    renderSukunaDomainBackground(this, ctx, isClashSecondary);
  }

  // Draw Malevolent Shrine structure & embers (called during fighter draw, AFTER background)
  drawDomainForeground(ctx) {
    renderSukunaDomainForeground(this, ctx);
    renderSukunaDomainSlashLines(this, ctx);
  }

  _getCardinalAngle(target) {
    if (!target) return (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : 0;
    const targetY = (target.y !== undefined ? target.y : this.y) - (target.z || 0);
    const sukunaY = this.y - (this.z || 0);
    const dx = (target.x !== undefined ? target.x : this.x) - this.x;
    const dy = targetY - sukunaY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 0 : Math.PI;
    } else {
      return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  _findAlignedEnemyForFuga(preferredOpponent = null) {
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
    const myTeam = (typeof state !== 'undefined' && state.getFighterTeam && myIndex >= 0) ? state.getFighterTeam(myIndex) : (this.team !== undefined ? this.team : null);

    const candidates = [];
    if (preferredOpponent && !preferredOpponent.isDead && preferredOpponent.hp > 0) {
      candidates.push(preferredOpponent);
    }
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        for (const f of state.fighters) {
          if (f && !candidates.includes(f)) candidates.push(f);
        }
      }
      if (state.illusions) {
        for (const ill of state.illusions) {
          if (ill && !candidates.includes(ill)) candidates.push(ill);
        }
      }
      if (state.cjDriveBys) {
        for (const car of state.cjDriveBys) {
          if (car && !candidates.includes(car)) candidates.push(car);
        }
      }
    }

    const maxRange = CONFIG.sukuna?.divineFlameTriggerRange || 850;
    const sukunaY = this.y - (this.z || 0);

    let bestTarget = null;
    let bestDist = Infinity;
    let bestAngle = 0;

    for (const ent of candidates) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.dead || ent.isInvulnerable || !this.hasSpottedEnemy(ent)) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === this) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
      }

      const entY = ent.y - (ent.z || 0);
      const dx = ent.x - this.x;
      const dy = entY - sukunaY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRange) continue;
      if (dist < (this.r + 5)) continue;

      const angle = Math.atan2(dy, dx);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = ent;
        bestAngle = angle;
      }
    }

    return bestTarget ? { target: bestTarget, cardinalAngle: bestAngle, aimAngle: bestAngle } : null;
  }

  _findCardinalAlignedEnemy(preferredOpponent = null) {
    return this._findAlignedEnemyForFuga(preferredOpponent);
  }
}
