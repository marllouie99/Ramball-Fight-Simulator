// ─────────────────────────────────────────────
// MAHORAGA EIGHT-HANDLED SWORD WHEEL ADAPTATION MODULE
// Encapsulates wheel click system, damage accumulation,
// Gojo-specific adaptation, and Infinity freeze handling
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { mahoragaAdaptationConfig } from './mahoragaAdaptationConfig.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { SKILL_REGISTRY } from '../../../configs/skills/skillRegistry.js';

export function triggerMahoragaGammaRayRainbow(fighter) {
  if (!fighter) return;
  fighter.gammaRayRainbowTimer = 180; // 3 seconds at 60 FPS
  fighter.gammaRayRainbowMax = 180;
}

/**
 * Handle adaptation damage accumulation inside takeDamage().
 * Determines attack type, applies stage reduction, accumulates damage,
 * and triggers wheel click when threshold is crossed.
 * @returns {object} { finalAmount, type } — the reduced damage amount and classified type
 */
export function handleAdaptationDamage(fighter, amount, attacker, opts = {}) {
  const type = opts.isMelee ? 'melee' : (opts.isSkill || opts.isUltimate || opts.isTrueDamage || opts.isExplosion ? 'skill' : 'ranged');
  const reductionPerStage = CONFIG.mahoraga?.adaptationReductionPerStage || 0.12;

  // ── Gojo-Specific Attack Detection ──
  let gojoAttackType = null;
  if (attacker && (attacker.characterId === 'gojo' || attacker.type === 'gojo')) {
    if (opts.isRed) {
      gojoAttackType = 'red';
    } else if (opts.projectile && opts.projectile.isGojoPurple) {
      gojoAttackType = 'purple';
    } else if (opts.projectile && opts.projectile.isGojoBlue) {
      gojoAttackType = 'blue';
    }
  }

  // ── Sukuna-Specific Attack Detection ──
  let sukunaAttackType = null;
  if (attacker && (attacker.characterId === 'sukuna' || attacker.type === 'sukuna')) {
    if (opts.isDivineFlame) {
      sukunaAttackType = 'divineFlame';
    }
  }

  // ── General / Skill Shot Adaptation Detection ──
  let skillShotId = null;
  let skillShotColor = null;
  if (opts.isAdaptableSkillShot) {
    skillShotId = opts.skillShotId;
    skillShotColor = opts.skillShotColor || (skillShotId && SKILL_REGISTRY[skillShotId]?.skillShotColor) || '#FFD700';
  } else if (opts.projectile && opts.projectile.isAdaptableSkillShot) {
    skillShotId = opts.projectile.skillShotId;
    skillShotColor = opts.projectile.skillShotColor || (skillShotId && SKILL_REGISTRY[skillShotId]?.skillShotColor) || '#FFD700';
  } else if (opts.isDivineFlame) {
    skillShotId = 'divineFlame';
    skillShotColor = '#FF6F00';
  } else if (opts.projectile && opts.projectile.isGojoPurple) {
    skillShotId = 'purple';
    skillShotColor = '#8A2BE2';
  } else if (opts.isGetsuga || (opts.projectile && (opts.projectile.isGetsuga || opts.projectile.behaviorType === 'getsuga_tensho' || opts.projectile.skillShotId === 'getsugaTensho'))) {
    skillShotId = 'getsugaTensho';
    const form = opts.getsugaForm || (opts.projectile && opts.projectile.getsugaForm) || 'shikai';
    skillShotColor = (form === 'final_bankai' || form === 'bankai' || form === 'bankai_hollow') ? '#FF1E00' : '#00D5FF';
  }

  let finalAmount = amount;
  const currentStage = fighter.goldAdaptationStage?.[type] || 0;

  // ── Getsuga Tensho 2-Exposure Adaptation Tracking & 50% Damage Reduction ──
  const isGetsugaHit = opts.isGetsuga || (opts.projectile && (opts.projectile.isGetsuga || opts.projectile.behaviorType === 'getsuga_tensho' || opts.projectile.skillShotId === 'getsugaTensho'));
  const isGetsugaAdapted = fighter.adaptedGetsuga || 
                          (fighter.adaptedSkills && (fighter.adaptedSkills['getsugaTensho'] || fighter.adaptedSkills['getsuga'])) || 
                          (fighter.gojoAdaptColorHistory && (fighter.gojoAdaptColorHistory.includes('#00D5FF') || fighter.gojoAdaptColorHistory.includes('#FF1E32') || fighter.gojoAdaptColorHistory.includes('#FF1E00')));

  if (isGetsugaHit) {
    if (isGetsugaAdapted) {
      finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Getsuga Tensho!
    } else {
      // Track distinct Getsuga wave projectile exposures
      const projId = opts.projectile ? (opts.projectile.getsugaReleaseId || opts.projectile.id || opts.projectile) : (attacker ? (attacker.getsugaReleaseCount || 1) : 1);
      if (fighter._lastGetsugaExposureProjId !== projId) {
        fighter._lastGetsugaExposureProjId = projId;
        fighter.getsugaExposureCount = (fighter.getsugaExposureCount || 0) + 1;

        if (fighter.getsugaExposureCount >= 2) {
          // 2nd Getsuga hit: queue adaptation to trigger wheel click after the duration of this Getsuga is done!
          fighter.pendingGetsugaAdaptation = true;
          fighter.pendingGetsugaAttacker = attacker;
          fighter.pendingGetsugaProj = opts.projectile || null;
          fighter._lastSkillShotId = 'getsugaTensho';
          fighter._lastSkillShotColor = '#FF1E00';
        }
      }
    }
  }

  // ── 50% Damage Reduction when Adapted to Reversal Red ──
  const isRedHit = Boolean(opts.isRed || (opts.projectile && opts.projectile.isGojoRed) || (opts.skillShotId === 'red'));
  const isRedAdapted = Boolean((fighter.gojoAdapted && fighter.gojoAdapted.red) || 
                               (fighter.adaptedGojo && fighter.adaptedGojo.red) ||
                               (fighter.adaptedSkills && fighter.adaptedSkills['red']) || 
                               (fighter.gojoAdaptColorHistory && fighter.gojoAdaptColorHistory.includes('#FF1144')));

  if (isRedHit && isRedAdapted) {
    finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Red!
  }

  // ── 50% Damage Reduction when Adapted to Hollow Purple ──
  const isPurpleHit = opts.isPurpleDPS || (opts.projectile && (opts.projectile.isGojoPurple || opts.projectile.isGojoPurpleOrb || opts.projectile.behaviorType === 'gojo_purple' || opts.projectile.skillShotId === 'purple')) || opts.isPurple;
  const isPurpleAdapted = (fighter.gojoAdapted && fighter.gojoAdapted.purple) || 
                          (fighter.adaptedSkills && fighter.adaptedSkills['purple']) || 
                          (fighter.gojoAdaptColorHistory && fighter.gojoAdaptColorHistory.includes('#8A2BE2')) || 
                          ((fighter.goldAdaptationStage?.skill || 0) >= 2);

  if (isPurpleHit && isPurpleAdapted) {
    finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Purple!
  }

  // ── 50% Damage Reduction when Adapted to Yuta's Pure Love Beam ──
  const isPureLoveBeamHit = opts.isPureLoveBeam || (opts.projectile && opts.projectile.isPureLoveBeam);
  const isPureLoveBeamAdapted = fighter.adaptedPureLoveBeam || 
                                (fighter.gojoAdaptColorHistory && fighter.gojoAdaptColorHistory.includes('#FF1493'));

  if (isPureLoveBeamHit && isPureLoveBeamAdapted) {
    finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Pure Love Beam (same as Gojo's Purple)!
  }

  // ── 50% Damage Reduction when Adapted to Soul Disfigurement ──
  if (opts.isSoulDisfigurement && fighter.adaptedSoulDisfigurement) {
    finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Soul Disfigurement!
  }

  // ── 50% Damage Reduction when Adapted to Saitama's Serious Counter ──
  const isSaitamaCounterHit = opts.isSaitamaCounter || (opts.isCounter && attacker && (attacker.characterId === 'saitama' || attacker.type === 'saitama'));
  if (isSaitamaCounterHit && fighter.adaptedSaitamaCounter) {
    finalAmount *= 0.50; // Half damage (50% reduction) when adapted to Saitama's Serious Counter!
  }

  // ── General Defense Buff per Wheel Click ──
  // Each wheel click (adaptation stage) increases defense by defBuffPerClickPercent (reduces incoming damage), capped at maxDefBuffPercent.
  const defBuffPerStage = CONFIG.mahoraga?.defBuffPerClickPercent ?? 0.01;
  const maxDefBuff = CONFIG.mahoraga?.maxDefBuffPercent ?? 0.50;
  const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const defReduction = Math.min(maxDefBuff, totalStages * defBuffPerStage);
  finalAmount *= (1.0 - defReduction);


  // ── Toji ISOH Bypass Check ──
  if (attacker && (attacker.characterId === 'toji' || attacker.type === 'toji') && opts.isIsoh) {
    const tojiConfig = mahoragaAdaptationConfig.toji?.isoh;
    if (tojiConfig && tojiConfig.canAdapt === false) {
      // Inverted Spear of Heaven completely bypasses/cancels adaptation logic
      return { finalAmount, type };
    }
  }

  // ── ROLLING SHARED FATAL DAMAGE ACCUMULATION WHEEL CLICK (General System) ──
  if (!fighter.isInfinityBlitz) {
    let windowFrames  = CONFIG.mahoraga?.fatalAdaptWindowFrames   ?? 400;
    let thresholdPct  = CONFIG.mahoraga?.fatalDamageThresholdPct  ?? 0.15;
    const adaptCooldown = CONFIG.mahoraga?.fatalAdaptCooldownFrames ?? 30;

    // Check specific fighter config
    if (attacker) {
      const charId = attacker.characterId || attacker.type;
      const charConfig = mahoragaAdaptationConfig[charId];
      if (charConfig) {
        let specificConfig = null;
        if (charId === 'gojo') {
          if (opts.isRed) specificConfig = charConfig.red;
          else if (opts.projectile?.isGojoBlue) specificConfig = charConfig.blue;
          else if (opts.projectile?.isGojoPurple) specificConfig = charConfig.purple;
        } else if (charId === 'sukuna') {
          if (opts.isCleave) specificConfig = charConfig.cleave;
          else if (opts.isDivineFlame) specificConfig = charConfig.divineFlame;
          else if (opts.isDismantle) specificConfig = charConfig.dismantle;
        } else if (charId === 'yuta') {
          if (opts.isLoveBeam) specificConfig = charConfig.loveBeam;
          else if (opts.isThinIce) specificConfig = charConfig.thinIceBreaker;
          else if (opts.isRika) specificConfig = charConfig.rika;
        } else if (charId === 'toji') {
          if (opts.isSoulSplit) specificConfig = charConfig.ssk;
        }
        
        if (specificConfig) {
          if (specificConfig.damageThresholdPct !== undefined) thresholdPct = specificConfig.damageThresholdPct;
          if (specificConfig.windowFrames !== undefined) windowFrames = specificConfig.windowFrames;
        }
      }
    }

    let thresholdPctDefault = 0.15; // default 15%
    let windowFramesDefault = 300;  // default 5s

    // Default to the provided options, but override if present in the SKILL_REGISTRY
    if (opts.isAdaptableSkillShot) {
      if (opts.adaptationThresholdPct !== undefined) thresholdPct = opts.adaptationThresholdPct;
      if (opts.adaptationWindowFrames !== undefined) windowFrames = opts.adaptationWindowFrames;
      
      const registryEntry = SKILL_REGISTRY[opts.skillShotId];
      if (registryEntry) {
        if (registryEntry.adaptationThresholdPct !== undefined) thresholdPct = registryEntry.adaptationThresholdPct;
        if (registryEntry.adaptationWindowFrames !== undefined) windowFrames = registryEntry.adaptationWindowFrames;
      }
    } else if (opts.projectile && opts.projectile.isAdaptableSkillShot) {
      if (opts.projectile.adaptationThresholdPct !== undefined) thresholdPct = opts.projectile.adaptationThresholdPct;
      if (opts.projectile.adaptationWindowFrames !== undefined) windowFrames = opts.projectile.adaptationWindowFrames;
      
      const registryEntry = SKILL_REGISTRY[opts.projectile.skillShotId];
      if (registryEntry) {
        if (registryEntry.adaptationThresholdPct !== undefined) thresholdPct = registryEntry.adaptationThresholdPct;
        if (registryEntry.adaptationWindowFrames !== undefined) windowFrames = registryEntry.adaptationWindowFrames;
      }
    }

    const isPurple = gojoAttackType === 'purple' || skillShotId === 'purple' || (opts.projectile && (opts.projectile.isGojoPurple || opts.projectile.isGojoPurpleOrb));
    const isGetsuga = isGetsugaHit || skillShotId === 'getsugaTensho' || skillShotId === 'getsuga';
    const isAdaptableSkill = (opts.isAdaptableSkillShot || (opts.projectile && opts.projectile.isAdaptableSkillShot)) && !isGetsuga;
    
    // Always accumulate damage for all hits and continuous tick damages (Getsuga ticks, Bleed, Burn, Poison, Domain, etc.)
    fighter.totalAccumDamage = (fighter.totalAccumDamage || 0) + finalAmount;
    fighter.accumTimer = windowFrames;

    if (gojoAttackType) {
      fighter._lastGojoHitType = gojoAttackType;
    }
    if (sukunaAttackType) {
      fighter._lastSukunaHitType = sukunaAttackType;
    }
    if (skillShotId) {
      fighter._lastSkillShotId = skillShotId;
      fighter._lastSkillShotColor = skillShotColor;
    }

    // ── FATAL DAMAGE THRESHOLD EVALUATION ──
    // The Wheel of Adaptation ONLY clicks when accumulated damage fills the WOA skill bar (meets or exceeds fatalDamageThresholdPct)
    if (!opts.isPureLoveBeam && !opts.isGenosBeam) {
      const threshold = fighter.maxHp * thresholdPct;
      if (fighter.totalAccumDamage >= threshold && (fighter.fatalAdaptCooldown || 0) <= 0) {
        triggerAdaptation(fighter, type, attacker);
      }
    }
  }

  return { finalAmount, type };
}

/**
 * Trigger a wheel click adaptation.
 * Increments the adaptation stage, performs cinematic pause,
 * freezes enemies, heals via RCT, and checks for Level 8 awakening.
 */
export function triggerAdaptation(fighter, type, attacker) {
  // Block any general adaptation wheel clicks while caught in beam paralysis
  const isCaughtInBeam = fighter.caughtInPureLoveBeam || 
                         (fighter.pureLoveBeamTimer || 0) > 0 || 
                         (fighter.pureLoveBeamRecoveryTimer || 0) > 0 ||
                         (fighter.caughtInGenosBeamTimer || 0) > 0 || 
                         fighter.caughtInGenosFlurry;
  if (isCaughtInBeam) {
    return;
  }

  // Strictly enforce WOA fatalDamageThresholdPct (15% max HP): Do NOT click wheel unless accumulated damage filled WOA bar!
  // Exceptions: Limitless Infinity 5-freeze exposure or Unlimited Void Domain survival.
  const isInfinityAdaptation = fighter.gojoInfinityImmune && fighter._lastGojoHitType === 'infinity';
  const isDomainAdaptation = fighter.gojoDomainAdapted || fighter._lastGojoHitType === 'domain';
  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);

  if (!isInfinityAdaptation && !isDomainAdaptation && (fighter.totalAccumDamage || 0) < threshold) {
    return;
  }

  // Hold adaptation ticks while inside Gojo's Domain Expansion until domain expires!
  const isInsideGojoDomain = !fighter.gojoDomainAdapted && !fighter.gojoAdapted?.domain && typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
  );

  if (isInsideGojoDomain) {
    if (!fighter.pendingDomainAdaptation) {
      fighter.pendingDomainAdaptation = {
        type: type || 'skill',
        attacker: attacker || null,
        lastGojoHitType: fighter._lastGojoHitType || 'domain',
        lastSukunaHitType: fighter._lastSukunaHitType,
        lastSkillShotId: fighter._lastSkillShotId,
        lastSkillShotColor: fighter._lastSkillShotColor
      };
      spawnFloatingText(fighter.x, (fighter.y - (fighter.z || 0)) - fighter.r - 25, '⚙️ ADAPTATION HELD (DOMAIN)', '#A0C8FF');
    }
    return;
  }

  if (attacker && attacker !== fighter && attacker.hp > 0) {
    fighter._pendingCounterTarget = attacker;
  }
  if (!fighter.goldAdaptationStage) fighter.goldAdaptationStage = {};

  let addedNewGojoColor = false;
  if (fighter._lastGojoHitType) {
    const gojoType = fighter._lastGojoHitType;
    let adaptColor = null;
    if (gojoType === 'purple') adaptColor = '#8A2BE2';
    else if (gojoType === 'red') adaptColor = '#FF1144';
    else if (gojoType === 'blue') adaptColor = '#00FFFF';
    else if (gojoType === 'infinity') adaptColor = '#00E5FF';
    
    if (adaptColor) {
      if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
      if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
        addedNewGojoColor = true;
        fighter.gojoAdaptColorHistory.push(adaptColor);
      }
    }
  }

  let addedNewSukunaColor = false;
  if (fighter._lastSukunaHitType) {
    const sukunaType = fighter._lastSukunaHitType;
    let adaptColor = null;
    if (sukunaType === 'divineFlame') adaptColor = '#FF6F00'; // Orange
    
    if (adaptColor) {
      if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
      if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
        addedNewSukunaColor = true;
        fighter.gojoAdaptColorHistory.push(adaptColor);
      }
    }
  }

  let addedNewSkillShotColor = false;
  if (fighter._lastSkillShotId && fighter._lastSkillShotColor) {
    const color = fighter._lastSkillShotColor;
    if (color) {
      if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
      if (!fighter.gojoAdaptColorHistory.includes(color)) {
        addedNewSkillShotColor = true;
        fighter.gojoAdaptColorHistory.push(color);
      }
    }
  }

  fighter.adapted[type] = true;
  fighter.adaptationStage[type] = (fighter.adaptationStage[type] || 0) + 1;
  const currentStage = fighter.adaptationStage[type];
  
  const addedNewSpecialColor = addedNewGojoColor || addedNewSukunaColor || addedNewSkillShotColor;
  if (!addedNewSpecialColor) {
    fighter.goldAdaptationStage[type] = (fighter.goldAdaptationStage[type] || 0) + 1;
  }
  
  const goldStage = fighter.goldAdaptationStage[type] || 0;
  const speedBoostPerStage = CONFIG.mahoraga?.wheelAdaptationSpeedMultiplier ?? CONFIG.mahoraga?.adaptationSpeedBoostPerStage ?? CONFIG.mahoraga?.movementSpeedMultiplierPerAdaptation ?? 0.15;
  const speedBoostPct = Math.round((goldStage * speedBoostPerStage) * 100);

  const totalStages = (fighter.adaptationStage.melee || 0) + (fighter.adaptationStage.ranged || 0) + (fighter.adaptationStage.skill || 0);
  if (totalStages >= 8 || currentStage >= 8) {
    fighter.isMaxAdapted = true;
  }
  const isLevel8 = totalStages >= 8 || currentStage >= 8 || fighter.isMaxAdapted;

  // Discrete 45-degree step click & cinematic pause on every adaptation (no stage limits!)
  const pauseFrames = isInfinityAdaptation ? 0 : (CONFIG.mahoraga?.wheelClickDuration ?? 25);
  const clickFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelGlowTimer = 65;
  fighter.wheelClickTimer = clickFrames;
  fighter.wheelClickMax = clickFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  // Freeze all enemy targets on screen
  const targetsToFreeze = [];
  if (attacker && attacker !== fighter && attacker.hp > 0) targetsToFreeze.push(attacker);
  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0 && !targetsToFreeze.includes(f)) {
        targetsToFreeze.push(f);
      }
    });
  }

  targetsToFreeze.forEach(f => {
    f.mahoragaAdaptationFreezeTimer = pauseFrames;
    f.vx = 0;
    f.vy = 0;
  });

  playSkillEffectSound('mahoraga', 'wheelclick');

  triggerGlobalScreenShake(6, 18);

  // Global Cooldown and Accumulation Resets
  fighter.fatalAdaptCooldown = CONFIG.mahoraga?.fatalAdaptCooldownFrames ?? 30;
  fighter.totalAccumDamage = 0;
  fighter.accumTimer = 0;

  const wheelY = fighter.y - fighter.r - 28;
  if (!addedNewGojoColor) {
    spawnFloatingText(fighter.x, wheelY - 25, `🏃 +${speedBoostPct}% SPEED & ✨ RCT REGEN!`, '#00FF66');
  }

  // Trigger pop-out Divine Shield Badge & RCT Healing (+) Emblem Badge
  fighter.shieldIconTimer = 90;

  applyRCTHeal(fighter);

  if (totalStages >= 2 || currentStage >= 2) {
    if (!fighter.hasAnnouncedLevel2) {
      fighter.hasAnnouncedLevel2 = true;
      spawnFloatingText(fighter.x, wheelY - 45, '⚡ ADAPTED TO TELEPORTATION & SPEED-BLITZ!', '#FFD700');
    }
  }

  // Save attacker for smooth divine flash-dash counter (strictly disabled when dragged by Getsuga)
  if (!fighter.isDraggedByGetsuga) {
    if (attacker && !attacker.isDead && attacker !== fighter) {
      fighter._pendingCounterTarget = attacker;
    } else if (typeof state !== 'undefined' && state.fighters) {
      const liveEnemy = state.fighters.find(f => f && f !== fighter && !f.isDead && f.hp > 0);
      if (liveEnemy) fighter._pendingCounterTarget = liveEnemy;
    }
  }

  // ── Gojo-Specific Adaptation (Last Hit Priority) ──
  if (fighter._lastGojoHitType) {
    applyGojoAdaptation(fighter, fighter._lastGojoHitType);
  }

  // ── Sukuna-Specific Adaptation (Last Hit Priority) ──
  if (fighter._lastSukunaHitType) {
    applySukunaAdaptation(fighter, fighter._lastSukunaHitType);
  }

  // ── Generalized Skill Shot Adaptation ──
  if (fighter._lastSkillShotId && fighter._lastSkillShotColor) {
    applySkillShotAdaptation(fighter, fighter._lastSkillShotId, fighter._lastSkillShotColor);
  }

  // Clear hit memory after adaptation triggers
  fighter._lastGojoHitType = null;
  fighter._lastSukunaHitType = null;
  fighter._lastSkillShotId = null;
  fighter._lastSkillShotColor = null;
}

/**
 * Apply Gojo-specific adaptation based on the attack type.
 * - Purple: Next time Gojo fires Purple, Mahoraga teleports away.
 * - Red: Next time Gojo uses Red, Mahoraga teleport-dodges.
 * - Blue: Mahoraga becomes immune to Blue's drag mechanic.
 * - Infinity: Mahoraga bypasses Limitless barrier completely.
 */
export function applyGojoAdaptation(fighter, gojoType) {
  fighter.gojoAdapted[gojoType] = true;
  const wheelY = fighter.y - fighter.r - 28;

  let adaptColor = null;
  switch (gojoType) {
    case 'purple':
      adaptColor = '#8A2BE2';
      fighter.gojoPurpleDodgeReady = true;
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: PURPLE TELEPORT DODGE!', '#8A2BE2');
      break;
    case 'red':
      adaptColor = '#FF1144';
      fighter.gojoRedDodgeReady = false; // Tanks Red instead of teleport-dodging away, with 50% damage reduction
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: RED TANK (50% REDUCED)!', '#FF1144');
      break;
    case 'blue':
      adaptColor = '#00FFFF';
      fighter.gojoBlueDragImmune = false;
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: BLUE RESISTANCE!', '#00FFFF');
      break;
    case 'infinity':
      adaptColor = '#00E5FF';
      fighter.gojoInfinityImmune = true;
      spawnFloatingText(fighter.x, wheelY - 35, '⚡ ADAPTED: INFINITY BYPASS!', '#00E5FF');
      spawnFloatingText(fighter.x, wheelY - 52, '∞ Limitless no longer works on Mahoraga!', '#FFFFFF');
      break;
    case 'domain':
      adaptColor = '#00E5FF';
      fighter.gojoDomainAdapted = true;
      if (!fighter.gojoAdapted) fighter.gojoAdapted = {};
      fighter.gojoAdapted.domain = true;
      fighter.timeStopTimer = 0;
      fighter.hitStunTimer = 0;
      spawnFloatingText(fighter.x, wheelY - 35, '⚡ ADAPTED: UNLIMITED VOID IMMUNITY!', '#00E5FF');
      spawnFloatingText(fighter.x, wheelY - 52, '🌌 Mahoraga moves freely inside Domain!', '#FFFFFF');
      break;
  }

  if (adaptColor) {
    if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
    if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
      fighter.gojoAdaptColorHistory.push(adaptColor);
    }
  }

  fighter.wheelGlowColor = adaptColor || fighter.wheelGlowColor;

  spawnImpactFlash(fighter.x, fighter.y, 45, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 20, 'arcane', fighter.wheelGlowColor);
  const tpSnd = CONFIG.mahoraga?.sounds?.teleportDash || 'skill_dash3';
  const tpVol = CONFIG.mahoraga?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(tpSnd, tpVol);
}

/**
 * Handle Infinity freeze logic inside update().
 * Returns true if Mahoraga is currently frozen by Infinity (should early-exit update).
 */
export function handleInfinityFreeze(fighter) {
  // If already adapted to Limitless Infinity, break out of all freezes instantly and never freeze
  if (fighter.gojoInfinityImmune) {
    fighter.infinityFreezeTimer = 0;
    fighter.isFrozenByInfinity = false;
    fighter._wasInfinityFrozenLastFrame = false;
    return false; // Adapted — NOT frozen!
  }

  if (fighter.infinityFreezeTimer > 0 || (fighter.isFrozenByInfinity && (fighter.timeStopTimer || 0) > 0)) {
    if (!fighter._wasInfinityFrozenLastFrame) {
      fighter._wasInfinityFrozenLastFrame = true;
      fighter.infinityFreezeCount = (fighter.infinityFreezeCount || 0) + 1;

      const configCount = mahoragaAdaptationConfig.gojo?.infinity?.requiredFreezes;
      const freezesNeeded = configCount ?? (CONFIG.mahoraga?.infinityAdaptFreezeCount ?? 2);
      
      if (!fighter.gojoInfinityImmune && fighter.infinityFreezeCount >= freezesNeeded) {
        fighter._lastGojoHitType = 'infinity';
        fighter.gojoInfinityImmune = true;
        fighter.adapted.melee = true;
        fighter.adapted.skill = true;

        const gojoFighter = state.fighters
          ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.hp > 0)
          : null;
        triggerAdaptation(fighter, 'skill', gojoFighter || null);
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, `⚡ LIMITLESS ADAPTED! (${freezesNeeded}/${freezesNeeded})`, '#00F3FF');

        // IMMEDIATELY BREAK OUT OF ALL FREEZES AND PAUSES ON THE FRAME HE ADAPTS (0 DELAY)!
        fighter.infinityFreezeTimer = 0;
        fighter.timeStopTimer = 0;
        fighter.isFrozenByInfinity = false;
        fighter._wasInfinityFrozenLastFrame = false;
        fighter.adaptationPauseTimer = 0; // 0 pause frames — do not stop moving!
        return false; // Break out of freeze instantly!
      } else if (!fighter.gojoInfinityImmune) {
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, `⚙️ LIMITLESS (${fighter.infinityFreezeCount}/${freezesNeeded})`, '#A0C8FF');
      }
    }

    if (fighter.infinityFreezeTimer > 0) fighter.infinityFreezeTimer--;
    fighter.isFrozenByInfinity = true;
    fighter.vx = 0;
    fighter.vy = 0;
    if (fighter.knockbackVx !== undefined) fighter.knockbackVx = 0;
    if (fighter.knockbackVy !== undefined) fighter.knockbackVy = 0;
    return true; // Frozen — caller should return early
  } else {
    fighter.isFrozenByInfinity = false;
    fighter._wasInfinityFrozenLastFrame = false;
    return false;
  }
}

/**
 * Apply Sukuna-specific adaptation based on the attack type.
 * - divineFlame: Next time Sukuna fires Fuga, Mahoraga teleports away.
 */
export function applySukunaAdaptation(fighter, sukunaType) {
  if (!fighter.sukunaAdapted) {
    fighter.sukunaAdapted = { divineFlame: false };
  }
  fighter.sukunaAdapted[sukunaType] = true;
  const wheelY = fighter.y - fighter.r - 28;

  let adaptColor = null;
  switch (sukunaType) {
    case 'divineFlame':
      adaptColor = '#FF6F00'; // Orange
      fighter.sukunaFugaDodgeReady = true;
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: FUGA TELEPORT DODGE!', '#FF6F00');
      break;
  }

  if (adaptColor) {
    if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
    if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
      fighter.gojoAdaptColorHistory.push(adaptColor);
    }
  }

  fighter.wheelGlowColor = adaptColor || fighter.wheelGlowColor;

  spawnImpactFlash(fighter.x, fighter.y, 45, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 20, 'arcane', fighter.wheelGlowColor);
  const tpSnd = CONFIG.mahoraga?.sounds?.teleportDash || 'skill_dash3';
  const tpVol = CONFIG.mahoraga?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(tpSnd, tpVol);
}

/**
 * Apply general skill shot adaptation.
 * - skillShotId: The unique ID of the skill shot to adapt to.
 * - color: Color of the wheel ball and sparks when adapting/dodging.
 */
export function applySkillShotAdaptation(fighter, skillShotId, color) {
  if (!fighter.adaptedSkills) {
    fighter.adaptedSkills = {};
  }
  if (!fighter.skillDodgeReady) {
    fighter.skillDodgeReady = {};
  }

  if (fighter.adaptedSkills[skillShotId]) return;

  fighter.adaptedSkills[skillShotId] = true;
  if (skillShotId !== 'getsugaTensho' && skillShotId !== 'getsuga') {
    fighter.skillDodgeReady[skillShotId] = true;
  }

  // Track specific old variables for backwards compatibility
  if (skillShotId === 'purple') {
    fighter.gojoAdapted.purple = true;
    fighter.gojoPurpleDodgeReady = true;
  }
  if (skillShotId === 'getsugaTensho' || skillShotId === 'getsuga') {
    fighter.adaptedGetsuga = true;
    fighter.adaptedSkills['getsugaTensho'] = true;
    fighter.adaptedSkills['getsuga'] = true;
    fighter.skillDodgeReady['getsugaTensho'] = false;
    fighter.skillDodgeReady['getsuga'] = false;
    fighter.isSlowedByGetsuga = false;
    fighter.slowTimer = 0;
    fighter.slowMultiplier = 1.0;
    fighter.isParalyzed = false;
    fighter.paralyzeTimer = 0;
    if (fighter.statusEffects) {
      fighter.statusEffects.slowTimer = 0;
      fighter.statusEffects.slowMultiplier = 1.0;
      fighter.statusEffects.paralyzeTimer = 0;
    }
  }

  fighter.wheelGlowColor = color || fighter.wheelGlowColor;

  if (color) {
    if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
    if (!fighter.gojoAdaptColorHistory.includes(color)) {
      fighter.gojoAdaptColorHistory.push(color);
    }
  }

  const wheelY = fighter.y - fighter.r - 28;
  if (skillShotId === 'getsugaTensho' || skillShotId === 'getsuga') {
    spawnFloatingText(fighter.x, wheelY - 35, '⚙️ ADAPTED: GETSUGA TENSHO!', color || '#FF1E32');
    spawnFloatingText(fighter.x, wheelY - 52, '🛡️ 50% Damage Reduction & Paralyze Immune!', '#FFFFFF');
  } else {
    const displayName = skillShotId.toUpperCase().replace('_', ' ');
    spawnFloatingText(fighter.x, wheelY - 35, `🛡️ ADAPTED: ${displayName} DODGE!`, color);
  }

  spawnImpactFlash(fighter.x, fighter.y, 45, 'lightningTrail');
  const tpSnd = CONFIG.mahoraga?.sounds?.teleportDash || 'skill_dash3';
  const tpVol = CONFIG.mahoraga?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(tpSnd, tpVol);
}

/**
 * Apply adaptation to Yuta's Pure Love Beam when caught in the beam after it expires.
 * - Clicks the Eight-Handled Sword Wheel.
 * - Turns wheel glow & sphere color pink (#FF1493).
 * - Grants immunity to Pure Love Beam.
 */
export function adaptToPureLoveBeam(fighter) {
  if (!fighter || fighter.hp <= 0) return;
  if (fighter.adaptedPureLoveBeam) return; // Already adapted

  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
  if ((fighter.totalAccumDamage || 0) < threshold) return; // Must fill WOA skill bar to adapt!

  fighter.adaptedPureLoveBeam = true;
  fighter.caughtInPureLoveBeam = false;
  fighter.pureLoveBeamTimer = 0;
  fighter.pureLoveBeamRecoveryTimer = 0; // Clear recovery timer so Mahoraga isn't stuck after wheel click!
  fighter.hitStunTimer = 0;
  fighter.knockbackStunTimer = 0;
  if (!fighter.adapted) fighter.adapted = {};
  fighter.adapted.skill = true;
  if (!fighter.adaptationStage) fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.adaptationStage.skill = (fighter.adaptationStage.skill || 0) + 1;

  const adaptColor = '#FF1493'; // Pink for Yuta Pure Love Beam

  if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
  if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
    fighter.gojoAdaptColorHistory.push(adaptColor);
  }

  fighter.wheelGlowColor = adaptColor;
  fighter.wheelGlowTimer = 65;
  const pauseFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelClickTimer = pauseFrames;
  fighter.wheelClickMax = pauseFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0) {
        f.mahoragaAdaptationFreezeTimer = pauseFrames;
        f.vx = 0;
        f.vy = 0;
      }
    });
  }

  playSkillEffectSound('mahoraga', 'wheelclick');
  triggerGlobalScreenShake(6, 18);

  const wheelY = fighter.y - fighter.r - 28;

  spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 25, 'arcane', adaptColor);

  applyRCTHeal(fighter);

  // ── COUNTER BLITZ: TELEPORT BEHIND ENEMY ONLY WHEN ENEMY IS NOT ACTIVELY FIRING A BEAM ──
  const opponent = (typeof state !== 'undefined' && state.fighters) ? state.fighters.find(f => f && f !== fighter && f.hp > 0) : null;
  const isEnemyFiringBeam = opponent && (
    opponent.isFiringPureLoveBeam || opponent.isChannelingPureLoveBeam ||
    opponent.isChannelingDomain || opponent.domainActive
  );

  if (opponent && !isEnemyFiringBeam && !fighter.isDraggedByGetsuga) {
    const oldX = fighter.x;
    const oldY = fighter.y;
    const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    const teleDist = fighter.r + opponent.r + 35;
    const teleX = opponent.x - Math.cos(angle) * teleDist;
    const teleY = opponent.y - Math.sin(angle) * teleDist;

    if (typeof fighter._spawnTeleportAfterimages === 'function') {
      fighter._spawnTeleportAfterimages(oldX, oldY, teleX, teleY, angle);
    }
    fighter.x = teleX;
    fighter.y = teleY;
    if (typeof fighter.aim === 'function') {
      fighter.aim(opponent);
    }

    // Activate Close-Quarters Attack-Teleport Stance
    fighter.neutralStanceTimer = CONFIG.mahoraga?.neutralStanceDurationFrames ?? 200;
    fighter.neutralStanceCooldownTimer = 0;
    fighter.neutralStanceAttackCount = 0;

    // Trigger instant rapid blade swing strike with Sword of Extermination
    fighter.swordCombo = (fighter.swordCombo || 0) + 1;
    fighter.punchAnimTimer = 18;
    fighter.leftPunchTimer = 0;
    const dashSnd = CONFIG.mahoraga?.sounds?.dash || 'skill_dash5';
    const dashVol = CONFIG.mahoraga?.soundVolumes?.dash ?? 1.0;
    audioSystem.playSFX(dashSnd, dashVol);
  } else {
    // If enemy is actively firing a beam, lock stance on 5s cooldown and DO NOT TELEPORT!
    fighter.neutralStanceTimer = 0;
    fighter.neutralStanceCooldownTimer = 300;
  }
}

/**
 * Apply adaptation to Yuta's Flurry attacks.
 * - Wheel sphere glows Gold (#FFD700).
 * - Gives 50% chance for Mahoraga to automatically block/parry flurry strikes.
 */
export function adaptToYutaFlurry(fighter) {
  if (!fighter || fighter.hp <= 0) return;
  if (fighter.adaptedYutaFlurry) return;

  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
  if ((fighter.totalAccumDamage || 0) < threshold) return; // Must fill WOA skill bar to adapt!

  fighter.adaptedYutaFlurry = true;
  if (!fighter.adapted) fighter.adapted = {};
  fighter.adapted.melee = true;
  if (!fighter.adaptationStage) fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.adaptationStage.melee = (fighter.adaptationStage.melee || 0) + 1;

  const adaptColor = '#FFD700'; // Gold matching Katana basic theme

  if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
  if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
    fighter.gojoAdaptColorHistory.push(adaptColor);
  }

  fighter.wheelGlowColor = adaptColor;
  fighter.wheelGlowTimer = 65;
  const pauseFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelClickTimer = pauseFrames;
  fighter.wheelClickMax = pauseFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0) {
        f.mahoragaAdaptationFreezeTimer = pauseFrames;
        f.vx = 0;
        f.vy = 0;
      }
    });
  }

  playSkillEffectSound('mahoraga', 'wheelclick');
  triggerGlobalScreenShake(6, 18);

  const wheelY = fighter.y - fighter.r - 28;

  spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 25, 'arcane', adaptColor);

  applyRCTHeal(fighter);
}

/**
 * Apply adaptation to Yuta's Thin Ice Breaker skill.
 * - Wheel sphere glows Cyan Blue (#00FFFF).
 * - Automatically triggers Divine Shout when Yuta uses Thin Ice Breaker.
 */
export function adaptToThinIceBreaker(fighter) {
  if (!fighter || fighter.hp <= 0) return;
  if (fighter.adaptedThinIceBreaker) return;

  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
  if ((fighter.totalAccumDamage || 0) < threshold) return; // Must fill WOA skill bar to adapt!

  fighter.adaptedThinIceBreaker = true;
  if (!fighter.adapted) fighter.adapted = {};
  fighter.adapted.skill = true;
  if (!fighter.adaptationStage) fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.adaptationStage.skill = (fighter.adaptationStage.skill || 0) + 1;

  const adaptColor = '#00FFFF'; // Cyan Blue matching Thin Ice Breaker theme

  if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
  if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
    fighter.gojoAdaptColorHistory.push(adaptColor);
  }

  fighter.wheelGlowColor = adaptColor;
  fighter.wheelGlowTimer = 65;
  const pauseFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelClickTimer = pauseFrames;
  fighter.wheelClickMax = pauseFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0) {
        f.mahoragaAdaptationFreezeTimer = pauseFrames;
        f.vx = 0;
        f.vy = 0;
      }
    });
  }

  playSkillEffectSound('mahoraga', 'wheelclick');
  triggerGlobalScreenShake(6, 18);

  const wheelY = fighter.y - fighter.r - 28;

  spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 25, 'arcane', adaptColor);

  applyRCTHeal(fighter);
}

/**
 * Adapt Mahoraga to Mahito's Soul Disfigurement mechanic.
 * - Grants 50% damage reduction on Soul Disfigurement hits.
 * - Grants total immunity to Soul Disfigurement stacks, shivering, and paralyze debuffs.
 */
export function adaptToSoulDisfigurement(fighter) {
  if (!fighter || fighter.hp <= 0) return;
  if (fighter.adaptedSoulDisfigurement) return; // Already adapted

  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
  if ((fighter.totalAccumDamage || 0) < threshold) return; // Must fill WOA skill bar to adapt!

  fighter.adaptedSoulDisfigurement = true;
  fighter._soulDisfigurementStacks = 0;
  fighter._soulDisfigurementTimer = 0;
  fighter.isParalyzedByMahito = false;
  fighter.paralyzeTimer = 0;
  fighter.hitStunTimer = 0;

  if (!fighter.adaptedSkills) fighter.adaptedSkills = {};
  fighter.adaptedSkills['soulDisfigurement'] = true;
  if (!fighter.adaptationStage) fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.adaptationStage.skill = (fighter.adaptationStage.skill || 0) + 1;

  const adaptColor = '#C026D3'; // Vivid Magenta-Violet

  if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
  if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
    fighter.gojoAdaptColorHistory.push(adaptColor);
  }

  fighter.wheelGlowColor = adaptColor;
  fighter.wheelGlowTimer = 65;
  const pauseFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelClickTimer = pauseFrames;
  fighter.wheelClickMax = pauseFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0) {
        f.mahoragaAdaptationFreezeTimer = pauseFrames;
        f.vx = 0;
        f.vy = 0;
      }
    });
  }

  playSkillEffectSound('mahoraga', 'wheelclick');
  triggerGlobalScreenShake(6, 18);

  const wheelY = fighter.y - fighter.r - 28;
  spawnFloatingText(fighter.x, wheelY - 35, '⚙️ ADAPTED: SOUL DISFIGUREMENT!', adaptColor);
  spawnFloatingText(fighter.x, wheelY - 52, '🛡️ Immune to Soul Disfigurement debuffs!', '#FFFFFF');

  spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 25, 'arcane', adaptColor);

  applyRCTHeal(fighter);
}

/**
 * Adapt Mahoraga to Saitama's Serious Skill Counter (Teleport Behind Punch).
 * - Triggers wheel click when Mahoraga recovers from Saitama's counter stagger / slow debuff.
 * - Grants 50% damage reduction on Serious Counter hits.
 * - Wheel sphere glows fiery crimson red (#FF3300).
 */
export function adaptToSaitamaCounter(fighter, attacker) {
  if (!fighter || fighter.hp <= 0 || fighter.isDead) return;
  if (fighter.adaptedSaitamaCounter) return; // Already adapted

  const threshold = fighter.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
  if ((fighter.totalAccumDamage || 0) < threshold) return; // Must fill WOA skill bar to adapt!

  fighter.adaptedSaitamaCounter = true;
  if (!fighter.adaptedSkills) fighter.adaptedSkills = {};
  fighter.adaptedSkills['saitamaCounter'] = true;

  if (!fighter.adaptationStage) fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.adaptationStage.skill = (fighter.adaptationStage.skill || 0) + 1;
  if (!fighter.goldAdaptationStage) fighter.goldAdaptationStage = { melee: 0, ranged: 0, skill: 0 };
  fighter.goldAdaptationStage.skill = (fighter.goldAdaptationStage.skill || 0) + 1;

  const adaptColor = '#FF3300'; // Fiery Crimson Red

  if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
  if (!fighter.gojoAdaptColorHistory.includes(adaptColor)) {
    fighter.gojoAdaptColorHistory.push(adaptColor);
  }

  fighter.wheelGlowColor = adaptColor;
  fighter.wheelGlowTimer = 65;
  const pauseFrames = CONFIG.mahoraga?.wheelClickDuration ?? 25;
  fighter.adaptationPauseTimer = pauseFrames;
  fighter.adaptationPauseMax = pauseFrames;
  fighter.wheelClickTimer = pauseFrames;
  fighter.wheelClickMax = pauseFrames;
  fighter.wheelStartRotation = fighter.wheelRotation || 0;
  fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

  triggerMahoragaGammaRayRainbow(fighter);

  if (typeof state !== 'undefined' && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f !== fighter && f.hp > 0) {
        f.mahoragaAdaptationFreezeTimer = pauseFrames;
        f.vx = 0;
        f.vy = 0;
      }
    });
  }

  playSkillEffectSound('mahoraga', 'wheelclick');
  triggerGlobalScreenShake(6, 18);

  const wheelY = fighter.y - fighter.r - 28;
  spawnFloatingText(fighter.x, wheelY - 35, '⚙️ ADAPTED: SERIOUS COUNTER!', adaptColor);
  spawnFloatingText(fighter.x, wheelY - 52, '🛡️ Adapted to Saitama\'s Serious Strike!', '#FFFFFF');

  spawnImpactFlash(fighter.x, fighter.y, 50, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 25, 'arcane', adaptColor);

  applyRCTHeal(fighter);
}

function applyRCTHeal(fighter) {
  const enableRCT = CONFIG.mahoraga?.enableRCTHeal ?? true;
  if (enableRCT && fighter.hp > 0 && !fighter.isDead) {
    const flatHeal = CONFIG.mahoraga?.rctHealFlatAmount ?? 100;
    const healAmount = Math.max(1, Math.round(flatHeal));
    fighter.takeDamage(-healAmount, fighter, { isHeal: true });

    fighter._healthBarHealTimer = 14;
    spawnImpactFlash(fighter.x, fighter.y, 55, 'healing');
    spawnSparks(fighter.x, fighter.y, 30, 'arcane');
    spawnSparks(fighter.x, fighter.y, 20, 'arcaneAscendLine');
    const enhSnd = CONFIG.mahoraga?.sounds?.wheelEnhance || 'skill_enhance';
    const enhVol = CONFIG.mahoraga?.soundVolumes?.wheelEnhance ?? 0.85;
    audioSystem.playSFX(enhSnd, enhVol);
  }
}
