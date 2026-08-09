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
  }

  let finalAmount = amount;
  const currentStage = fighter.goldAdaptationStage?.[type] || 0;


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
    let thresholdPct  = CONFIG.mahoraga?.fatalDamageThresholdPct  ?? 0.08;
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

    const isAdaptableSkill = opts.isAdaptableSkillShot || (opts.projectile && opts.projectile.isAdaptableSkillShot);
    
    if (isAdaptableSkill) {
      if ((fighter.fatalAdaptCooldown || 0) <= 0 && !fighter.skillExposureTimer) {
        const delay = (skillShotId && SKILL_REGISTRY[skillShotId]?.adaptationDelayFrames) || 60;
        fighter.skillExposureTimer = delay; // Timer to click the wheel!
        fighter.exposedSkillType = type;
        fighter.exposedSkillAttacker = attacker;
        
        if (gojoAttackType) fighter._lastGojoHitType = gojoAttackType;
        if (sukunaAttackType) fighter._lastSukunaHitType = sukunaAttackType;
        if (skillShotId) {
          fighter._lastSkillShotId = skillShotId;
          fighter._lastSkillShotColor = skillShotColor;
        }
      }
    } else {
      fighter.totalAccumDamage = (fighter.totalAccumDamage || 0) + amount;
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
  if (!fighter.goldAdaptationStage) fighter.goldAdaptationStage = {};

  let addedNewGojoColor = false;
  if (fighter._lastGojoHitType) {
    const gojoType = fighter._lastGojoHitType;
    let adaptColor = null;
    if (gojoType === 'purple') adaptColor = '#8A2BE2';
    else if (gojoType === 'red') adaptColor = '#FF1144';
    else if (gojoType === 'blue') adaptColor = '#00FFFF';
    else if (gojoType === 'infinity') adaptColor = '#A0C8FF';
    
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
  const speedBoostPerStage = CONFIG.mahoraga?.adaptationSpeedBoostPerStage || 0.10;
  const speedBoostPct = Math.round((goldStage * speedBoostPerStage) * 100);

  const totalStages = (fighter.adaptationStage.melee || 0) + (fighter.adaptationStage.ranged || 0) + (fighter.adaptationStage.skill || 0);
  const isLevel8 = totalStages >= 8 || currentStage >= 8 || fighter.isInfinityBlitz;

  // Only do the discrete 45-degree step click & cinematic pause if NOT at Level 8 (continuous spin)
  if (!isLevel8) {
    const pauseFrames = 40;
    fighter.adaptationPauseTimer = pauseFrames;
    fighter.adaptationPauseMax = pauseFrames;
    fighter.wheelGlowTimer = 65;
    fighter.wheelClickTimer = pauseFrames;
    fighter.wheelClickMax = pauseFrames;
    fighter.wheelStartRotation = fighter.wheelRotation || 0;
    fighter.wheelTargetRotation = fighter.wheelStartRotation + (Math.PI / 4);

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
    audioSystem.playSFX('skill_dash5', 1.0);
    audioSystem.playSFX('attack_swordswing', 1.0);
  } else {
    fighter.wheelGlowTimer = 40;
  }

  triggerGlobalScreenShake(6, 18);

  // Global Cooldown and Accumulation Resets
  fighter.fatalAdaptCooldown = CONFIG.mahoraga?.fatalAdaptCooldownFrames ?? 300;
  fighter.totalAccumDamage = 0;
  fighter.accumTimer = 0;

  const wheelY = fighter.y - fighter.r - 28;
  if (!addedNewGojoColor) {
    spawnFloatingText(fighter.x, wheelY - 25, `🏃 +${speedBoostPct}% MOVEMENT SPEED!`, '#FFD700');
  }

  // Trigger pop-out Divine Shield Badge & RCT Healing (+) Emblem Badge
  fighter.shieldIconTimer = 90;

  // --- REVERSE CURSED TECHNIQUE (RCT / DIVINE HEALING ON WHEEL CLICK ADAPTATION) ---
  const enableRCT = CONFIG.mahoraga?.enableRCTHeal ?? true;
  const healInterval = CONFIG.mahoraga?.rctHealLevelInterval ?? 1;
  
  if (enableRCT && fighter.hp > 0 && !fighter.isDead && totalStages > 0 && (totalStages % healInterval === 0)) {
    const healPercent = CONFIG.mahoraga?.rctHealAmountPercent ?? CONFIG.mahoraga?.rctHealPerClickPercent ?? 0.10;
    const healAmount = Math.round(fighter.maxHp * healPercent);
    const targetHp = Math.min(fighter.maxHp, fighter.hp + healAmount);
    const actualHealed = Math.max(0, targetHp - fighter.hp);

    if (actualHealed > 0) {
      if (typeof fighter.takeDamage === 'function') {
        fighter.takeDamage(-actualHealed, fighter, { isHeal: true, skipHealText: true });
      } else {
        fighter.hp = targetHp;
      }
    }

    // Always trigger visual RCT Heal badge & green pop-up heal number on every wheel click!
    fighter._healthBarHealTimer = 14;
    spawnFloatingText(fighter.x, wheelY - 45, '✨ RCT HEAL!', '#00FF66');
    const displayHeal = actualHealed > 0 ? actualHealed : healAmount;
    spawnFloatingText(fighter.x + (Math.random() - 0.5) * 16, (fighter.y - (fighter.z || 0)) - fighter.r - 12, `+${displayHeal}`, '#00FF66');
    spawnImpactFlash(fighter.x, fighter.y, 55, 'healing');
    spawnSparks(fighter.x, fighter.y, 30, 'arcane');
    spawnSparks(fighter.x, fighter.y, 20, 'arcaneAscendLine');
    audioSystem.playSFX('skill_enhance', 0.85);
  }

  // Max Adaptation Awakening Check (Wheel 360° rotation complete at Stage 8)
  if (totalStages >= 8 || currentStage >= 8) {
    if (!fighter.isInfinityBlitz && (fighter.infinityBlitzCooldownTimer || 0) <= 0) {
      fighter.isInfinityBlitz = true;
      fighter.infinityBlitzDurationTimer = CONFIG.mahoraga?.infinityBlitzDurationFrames || 600;
      fighter.isCleaving = false;
      fighter.isShouting = false;
      fighter.isThrowing = false;
      fighter.isBlitzActive = false;

      spawnFloatingText(fighter.x, wheelY - 55, '⚡ LEVEL 8 MAX ADAPTATION: SPEED-BLITZ!', '#FFD700');
      triggerGlobalScreenShake(14, 30);
      audioSystem.playSFX('skill_dash3', 1.0);
      audioSystem.playSFX('attack_swordswing', 1.0);
    }
  } else if (totalStages >= 2 || currentStage >= 2) {
    if (!fighter.hasAnnouncedLevel2) {
      fighter.hasAnnouncedLevel2 = true;
      spawnFloatingText(fighter.x, wheelY - 45, '⚡ ADAPTED TO TELEPORTATION & SPEED-BLITZ!', '#FFD700');
    }
  }

  // Save attacker for smooth divine flash-dash counter
  if (attacker && !attacker.isDead && attacker !== fighter) {
    fighter._pendingCounterTarget = attacker;
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
      fighter.gojoRedDodgeReady = true;
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: RED TELEPORT DODGE!', '#FF1144');
      break;
    case 'blue':
      adaptColor = '#00FFFF';
      fighter.gojoBlueDragImmune = true;
      spawnFloatingText(fighter.x, wheelY - 35, '🛡️ ADAPTED: BLUE DRAG IMMUNITY!', '#00FFFF');
      break;
    case 'infinity':
      adaptColor = '#A0C8FF';
      fighter.gojoInfinityImmune = true;
      spawnFloatingText(fighter.x, wheelY - 35, '⚡ ADAPTED: INFINITY BYPASS!', '#A0C8FF');
      spawnFloatingText(fighter.x, wheelY - 52, '∞ Limitless no longer works on Mahoraga!', '#FFFFFF');
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
  audioSystem.playSFX('skill_dash3', 0.8);
}

/**
 * Handle Infinity freeze logic inside update().
 * Returns true if Mahoraga is currently frozen by Infinity (should early-exit update).
 */
export function handleInfinityFreeze(fighter) {
  if (fighter.infinityFreezeTimer > 0 || (fighter.isFrozenByInfinity && (fighter.timeStopTimer || 0) > 0)) {
    if (!fighter._wasInfinityFrozenLastFrame) {
      fighter._wasInfinityFrozenLastFrame = true;
      fighter.infinityFreezeCount = (fighter.infinityFreezeCount || 0) + 1;

      const configCount = mahoragaAdaptationConfig.gojo?.infinity?.requiredFreezes;
      const freezesNeeded = configCount ?? (CONFIG.mahoraga?.infinityAdaptFreezeCount ?? 10);
      
      if (!fighter.gojoInfinityImmune && fighter.infinityFreezeCount >= freezesNeeded) {
        fighter._lastGojoHitType = 'infinity';
        fighter.gojoInfinityImmune = true;
        fighter.adapted.melee = true;
        fighter.adapted.skill = true;

        const gojoFighter = state.fighters
          ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.hp > 0)
          : null;
        triggerAdaptation(fighter, 'skill', gojoFighter || null);
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, '⚡ LIMITLESS ADAPTED! (10/10)', '#00F3FF');
      } else if (!fighter.gojoInfinityImmune) {
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, `⚙️ LIMITLESS (${fighter.infinityFreezeCount}/10)`, '#A0C8FF');
      }
    }

    if (fighter.infinityFreezeTimer > 0) fighter.infinityFreezeTimer--;
    fighter.isFrozenByInfinity = true;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.applyMovementPhysics(0);
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
  audioSystem.playSFX('skill_dash3', 0.8);
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
  fighter.skillDodgeReady[skillShotId] = true;

  // Track specific old variables for backwards compatibility
  if (skillShotId === 'purple') {
    fighter.gojoAdapted.purple = true;
    fighter.gojoPurpleDodgeReady = true;
  }
  if (skillShotId === 'divineFlame') {
    if (!fighter.sukunaAdapted) fighter.sukunaAdapted = { divineFlame: false };
    fighter.sukunaAdapted.divineFlame = true;
    fighter.sukunaFugaDodgeReady = true;
  }

  fighter.wheelGlowColor = color || fighter.wheelGlowColor;

  if (color) {
    if (!fighter.gojoAdaptColorHistory) fighter.gojoAdaptColorHistory = [];
    if (!fighter.gojoAdaptColorHistory.includes(color)) {
      fighter.gojoAdaptColorHistory.push(color);
    }
  }

  const wheelY = fighter.y - fighter.r - 28;
  const displayName = skillShotId.toUpperCase().replace('_', ' ');
  spawnFloatingText(fighter.x, wheelY - 35, `🛡️ ADAPTED: ${displayName} DODGE!`, color);

  spawnImpactFlash(fighter.x, fighter.y, 45, 'lightningTrail');
  spawnSparks(fighter.x, fighter.y, 20, 'arcane', fighter.wheelGlowColor);
  audioSystem.playSFX('skill_dash3', 0.8);
}
