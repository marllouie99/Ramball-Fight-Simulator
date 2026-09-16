import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { stopSound } from '../../../systems/soundSystem.js';
import { spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { spawnHollowMaskShatter } from '../../../graphics/particles/deathShatterEffect.js';

/**
 * Activates Ichigo's Hollow Mask transformation state.
 * Strictly requires Bankai to have popped first.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function activateHollowMask(fighter) {
  if (fighter.isDead || fighter.hp <= 0 || fighter.isTargetOfAmbush || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (fighter.hollowMaskActive || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0) return;
  // Hollow Mask strictly requires Bankai form to be actively running!
  if (!fighter.bankaiActive) return;
  // Do not interrupt Bankai Transformation or Bankai Grand Finisher (Final Massive Kuroi Getsuga)
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0) return;
  // When Ichigo is about to unleash any normal Getsuga Tensho, let him unleash it before activating Hollow Mask!
  if (fighter.isAboutToUnleashNormalGetsuga() || fighter.isChannelingGetsuga || fighter._isGetsugaVoicelinePlaying()) return;
  if (fighter.isFinalMassiveGetsuga || (fighter.isChannelingGetsuga && fighter.isFinalMassiveGetsuga) || fighter._isFinalGetsugaVoicelinePlaying()) return;
  if (fighter.getsugaRecoveryTimer > 0 && fighter.isFinalGetsugaRecovery) return;
  const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
  if (fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer <= finalThreshold) return;

  fighter.interruptAttacks(true); // Cancel any ongoing attack/dash to lock in place
  fighter.hollowMaskUsed = true;
  fighter.hollowMaskActive = true;
  fighter.hollowRechargeHpBaseline = undefined;
  fighter._maxHollowPct = 0;
  fighter.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration ?? 800;
  const chargeFrames = CONFIG.ichigo?.hollowMaskFormationFrames ?? 325;
  fighter.hollowMaskFormationTimer = chargeFrames;
  fighter.hollowMaskFormationMax = chargeFrames;
  fighter.hollowBurstTimer = 0; // Starts after formation/channeling finishes!
  fighter.hollowBurstMax = CONFIG.ichigo?.hollowBurstFrames || 36;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.knockbackVx = 0;
  fighter.knockbackVy = 0;
  fighter.gunAngle = 0; // Strictly face towards player/viewer during Hollow Channeling
  fighter.angle = 0;
  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const text = isBankai ? "BANKAI + HOLLOW AWAKENING!" : "HOLLOW AWAKENING!";
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, text, "#FF1E00");

  // Recover 50% of maximum HP upon transforming into Hollow Mask
  const healRatio = CONFIG.ichigo?.hollowHpRecovery ?? CONFIG.ichigo?.hollowHealPercent ?? 0.50;
  const healAmount = Math.max(1, Math.round((fighter.maxHp || 240) * healRatio));
  if (healAmount > 0) {
    fighter.hp = Math.min(fighter.maxHp || 240, fighter.hp + healAmount);
    fighter._lastHealAmount = (fighter._lastHealAmount || 0) + healAmount;
    fighter._healthBarHealTimer = 24;
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 48, `+${healAmount} HP`, "#00FF66");
  }

  // Play the 5.35-second Hollow Transformation Voiceline
  const voiceSrc = CONFIG.ichigo?.sounds?.hollowAwakenVoice || 'Assets/Sound Effects/Skills/ichigo-hollowtransformation-voiceline.mp3';
  const voiceVol = CONFIG.ichigo?.soundVolumes?.hollowAwakenVoice ?? 3.0;
  fighter._hollowVoicePlaying = true;
  fighter._hollowVoiceEndTime = Date.now() + 5350;
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
    fighter._hollowVoiceHandle = audioSystem.playFighterVoiceline(fighter, voiceSrc, voiceVol, 1.0, 0, 0, {
      priority: 'domain',
      isProtected: true,
      durationMs: 5350
    });
  } else {
    fighter._hollowVoiceHandle = fighter._playSound('hollowAwakenVoice', voiceSrc, voiceVol);
  }

  fighter._hollowFlareHandle = fighter._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(isBankai ? 4.5 : 3.5, 24);
  }
}

/**
 * Checks whether Hollow Transformation voiceline audio is currently playing.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isHollowTransformationVoicelinePlaying(fighter) {
  if (!fighter) return false;
  if (fighter.isDead || fighter.hp <= 0) {
    stopHollowTransformationVoiceline(fighter, true);
    return false;
  }
  if (!fighter._hollowVoicePlaying) return false;
  const now = Date.now();
  if (fighter._hollowVoiceEndTime && now < fighter._hollowVoiceEndTime) {
    return true;
  }
  const handle = fighter._hollowVoiceHandle || fighter._activeVoicelineHandle;
  if (handle && typeof handle.isPlaying === 'function' && handle.isPlaying()) {
    return true;
  }
  fighter._hollowVoicePlaying = false;
  fighter._hollowVoiceHandle = null;
  return false;
}

/**
 * Stops Hollow Transformation voiceline and flare sounds immediately (e.g. fighter death).
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {boolean} [force=false]
 */
export function stopHollowTransformationVoiceline(fighter, force = false) {
  if (!fighter) return;
  if (!force && fighter.hp > 0 && !fighter.isDead) return;

  if (fighter._hollowVoiceHandle) {
    stopSound(fighter._hollowVoiceHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._hollowVoiceHandle);
    }
    fighter._hollowVoiceHandle = null;
  }
  if (fighter._hollowFlareHandle) {
    stopSound(fighter._hollowFlareHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._hollowFlareHandle);
    }
    fighter._hollowFlareHandle = null;
  }
  if (fighter._activeVoicelineHandle) {
    const srcStr = String(fighter._activeVoicelineHandle.src || (fighter._activeVoicelineHandle.audio && fighter._activeVoicelineHandle.audio.src) || '').toLowerCase();
    if (srcStr.includes('hollow') || srcStr.includes('transformation') || srcStr.includes('flare')) {
      stopSound(fighter._activeVoicelineHandle);
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
        audioSystem.stopSFX(fighter._activeVoicelineHandle);
      }
      fighter._activeVoicelineHandle = null;
    }
  }
  fighter._hollowVoicePlaying = false;
  fighter._hollowVoiceEndTime = 0;
}

/**
 * Applies Hollow lifesteal to Ichigo when dealing damage in Hollow mask state.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {number} damageDealt
 * @param {Object} target
 */
export function applyHollowLifesteal(fighter, damageDealt, target) {
  const isMask = Boolean(
    fighter.hollowMaskActive || 
    (fighter.hollowMaskTimer && fighter.hollowMaskTimer > 0) ||
    fighter.skin === 'hollow' || 
    fighter.skin === 'bankai_hollow'
  );
  if (!isMask || fighter.isDead || fighter.hp <= 0 || !damageDealt || damageDealt <= 0) return;

  // Defensive validation for target (e.g. if target blocked with Gojo Limitless Infinity, is invulnerable, or dead)
  if (target) {
    const isGojoInfinity = (target.characterId === 'gojo' || target.type === 'gojo') &&
      !target.isMeleeMode &&
      (target.infinityActive || (target.infinityCooldown || 0) <= 0) &&
      !target.isChainedByMakima &&
      !(fighter.gojoInfinityImmune || fighter.isMaxAdapted);
    if (isGojoInfinity) return;

    if (target.isInvulnerable || (target.invulnerabilityTimer && target.invulnerabilityTimer > 0)) return;
    if (target.isDead && (target.hp <= 0)) return;
  }

  const healPercent = CONFIG.ichigo?.hollowLifesteal ?? 0;
  if (!healPercent || healPercent <= 0) return;

  const healAmount = Math.round(damageDealt * healPercent);
  if (healAmount > 0 && fighter.hp < fighter.maxHp) {
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmount);
    fighter._lastHealAmount = (fighter._lastHealAmount || 0) + healAmount;
    fighter._healthBarHealTimer = 16;

    const now = Date.now();
    if (!fighter._lastHollowLifestealTextTime || now - fighter._lastHollowLifestealTextTime >= 120) {
      fighter._lastHollowLifestealTextTime = now;
      spawnFloatingText(fighter.x + (Math.random() - 0.5) * 16, fighter.y - fighter.r - 12, `+${healAmount}`, "#00FF66");
    }
  }
}

/**
 * Updates Hollow Mask formation, screen shake, duration decay, and mask shattering.
 * Returns true if fighter is locked in transformation channeling/burst.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} opponent
 * @param {boolean} isMatchEnded
 * @returns {boolean} isLocked
 */
export function updateHollowMask(fighter, opponent, isMatchEnded) {
  if (fighter.isDead || fighter.hp <= 0 || isMatchEnded) {
    stopHollowTransformationVoiceline(fighter, true);
    return false;
  }

  // 1. Passive threshold check
  const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
  const isBusyWithFinalGetsuga = (fighter.isChannelingGetsuga && fighter.isFinalMassiveGetsuga) || (fighter.getsugaRecoveryTimer > 0 && fighter.isGetsugaSlash && fighter.isFinalGetsugaRecovery);
  const isAboutToUnleashNormal = fighter.isAboutToUnleashNormalGetsuga();
  const isBusyWithGetsuga = isAboutToUnleashNormal || fighter.isChannelingGetsuga || isBusyWithFinalGetsuga;
  const isPendingFinalGetsuga = fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer > 0 && fighter.bankaiTimer <= finalThreshold;
  const canHollowAwaken = Boolean(fighter.bankaiActive);

  const reqDamage = (fighter.maxHp || 240) * (CONFIG.ichigo?.hollowRechargeHpRatio ?? 0.20);
  const baseline = fighter.hollowRechargeHpBaseline !== undefined ? fighter.hollowRechargeHpBaseline : fighter.hp;
  const damageTaken = Math.max(0, baseline - fighter.hp);
  const isHollowReady = damageTaken >= reqDamage;

  if (canHollowAwaken && !fighter.hollowMaskActive && !fighter.hollowMaskFormationTimer && !fighter.hollowBurstTimer && !fighter.isTargetOfAmbush && !isBusyWithGetsuga && !isPendingFinalGetsuga && !fighter.isChannelingBankai && !fighter.isParalyzedOrBeamTrapped() && fighter.hp > 0 && isHollowReady) {
    activateHollowMask(fighter);
  }

  // 2. Formation & Sky Burst Immobility Lock
  if (fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0) {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.gunAngle = 0; // Strictly face towards player/viewer during Hollow Channeling
    fighter.angle = 0;
    // Hold full hollow mask duration during transformation animation (only drains after animation finishes)
    fighter.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration ?? 800;

    if (fighter.hollowMaskFormationTimer > 0) {
      fighter.hollowMaskFormationTimer--;

      // Continuous arena screen shake building up as Hollow Mask formation progresses
      if (typeof triggerGlobalScreenShake === 'function') {
        const maxF = fighter.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 200;
        const prog = 1.0 - (fighter.hollowMaskFormationTimer / maxF);
        const shakeIntensity = 1.2 + prog * 2.8;
        if (fighter.hollowMaskFormationTimer % 4 === 0) {
          triggerGlobalScreenShake(shakeIntensity, 6);
        }
      }

      if (fighter.hollowMaskFormationTimer <= 0) {
        fighter.hollowMaskFormationTimer = 0;
        fighter.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 18;
        fighter.hollowBurstMax = fighter.hollowBurstTimer;
        const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
        fighter._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.95);
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(isBankai ? 5.5 : 4.5, 20);
        }
      }
    } else if (fighter.hollowBurstTimer > 0) {
      fighter.hollowBurstTimer--;
      if (fighter.hollowBurstTimer <= 0) {
        fighter.resumeMovement(opponent);
      }
    }

    // Micro-spark emission during mask formation (Ghost White spectral theme)
    if (Math.random() < 0.40) {
      spawnSparks(fighter.x + (Math.random() - 0.5) * fighter.r * 1.6, fighter.y - fighter.r * 0.3 + (Math.random() - 0.5) * fighter.r * 1.6, 2, Math.random() < 0.5 ? '#F8F8FF' : '#D8E4F8');
    }

    return true; // Locked in transformation
  }

  // 3. Hollow Mask active duration decay & shatter
  if (fighter.hollowMaskActive && !isMatchEnded) {
    fighter.hollowMaskTimer--;

    // Micro-spark emission during the final cracking phase
    if (fighter.hollowMaskTimer < 60 && Math.random() < 0.28) {
      spawnSparks(fighter.x + (Math.random() - 0.5) * fighter.r, fighter.y - fighter.r * 0.3 + (Math.random() - 0.5) * fighter.r, 1, Math.random() < 0.5 ? '#DC143C' : '#FFFFFF');
    }

    if (fighter.hollowMaskTimer <= 0) {
      fighter.hollowMaskActive = false;
      fighter.hollowMaskUsed = true;
      fighter.hollowRechargeHpBaseline = fighter.hp; // Snapshot HP baseline upon Hollow Mask shatter
      fighter._maxHollowPct = 0;
      spawnHollowMaskShatter(fighter);
      spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "MASK SHATTERED!", "#FFFFFF");
      spawnSparks(fighter.x, fighter.y, 14, '#DC143C');
      spawnSparks(fighter.x, fighter.y, 8, '#111111');
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3.5, 16);
      }

      // If Bankai was in combo stasis (bankaiTimer <= 1), conclude Bankai combo as well
      if (fighter.bankaiActive && (fighter.bankaiTimer <= 1 || !fighter.bankaiTimer)) {
        fighter.bankaiActive = false;
        fighter.bankaiUsed = true;
        fighter.bankaiFinalGetsugaTriggered = false;
        fighter.isFinalMassiveGetsuga = false;
        fighter.isFinalGetsugaRecovery = false;
        if (typeof fighter._stopFinalGetsugaVoiceline === 'function') fighter._stopFinalGetsugaVoiceline();
        fighter.bankaiRechargeHpBaseline = fighter.hp;
        fighter._maxBankaiPct = 0;
        const cd = CONFIG.ichigo?.bankaiCooldown ?? CONFIG.ichigo?.ultimateCooldown ?? 600;
        fighter.ultimateCooldown = cd;
        fighter.bankaiCooldownMax = cd;
        fighter.bankaiShards = [];
        fighter.bankaiClothStreamers = [];
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 48, "BANKAI ENDED", "#00D5FF");
      }

      // Trigger Shikai sonic-blast sky effect upon reverting to Shikai
      if (!fighter.bankaiActive) {
        fighter.shikaiReversionBurstTimer = CONFIG.ichigo?.shikaiReversionRecoveryFrames || CONFIG.ichigo?.shikaiReversionBurstFrames || 42;
        fighter.shikaiReversionBurstMax = fighter.shikaiReversionBurstTimer;

        // Clear and hide all lingering attack effects, timers, slashes, afterimages, and charging aura upon reverting to Shikai
        fighter.slashSwingTimer = 0;
        fighter.slashSwingMaxTimer = 0;
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
      }
    }
  }

  return false;
}
