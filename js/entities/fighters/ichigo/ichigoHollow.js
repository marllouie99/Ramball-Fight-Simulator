import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { spawnHollowMaskShatter } from '../../../graphics/particles/deathShatterEffect.js';

/**
 * Activates Ichigo's Hollow Mask transformation state.
 * Strictly requires Bankai to have popped first.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function activateHollowMask(fighter) {
  if (fighter.hollowMaskUsed || fighter.isDead || fighter.hp <= 0 || fighter.isTargetOfAmbush || fighter.isParalyzedOrBeamTrapped()) return;
  // Hollow Mask strictly requires Bankai to have been popped first!
  if (!fighter.bankaiActive && !fighter.bankaiUsed) return;
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

  // Play the 5.35-second Hollow Transformation Voiceline
  const voiceSrc = CONFIG.ichigo?.sounds?.hollowAwakenVoice || 'Assets/Sound Effects/Skills/ichigo-hollowtransformation-voiceline.mp3';
  const voiceVol = CONFIG.ichigo?.soundVolumes?.hollowAwakenVoice ?? 3.0;
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
    audioSystem.playFighterVoiceline(fighter, voiceSrc, voiceVol, 1.0, 0, 0, {
      priority: 'domain',
      isProtected: true,
      durationMs: 5350
    });
  } else {
    fighter._playSound('hollowAwakenVoice', voiceSrc, voiceVol);
  }

  fighter._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(isBankai ? 4.5 : 3.5, 24);
  }
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

  const healPercent = CONFIG.ichigo?.hollowLifesteal ?? 0.10;
  const healAmount = Math.max(1, Math.round(damageDealt * healPercent));
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
  // 1. Passive threshold check
  const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
  const isBusyWithFinalGetsuga = (fighter.isChannelingGetsuga && fighter.isFinalMassiveGetsuga) || (fighter.getsugaRecoveryTimer > 0 && fighter.isGetsugaSlash && fighter.isFinalGetsugaRecovery);
  const isAboutToUnleashNormal = fighter.isAboutToUnleashNormalGetsuga();
  const isBusyWithGetsuga = isAboutToUnleashNormal || fighter.isChannelingGetsuga || isBusyWithFinalGetsuga;
  const isPendingFinalGetsuga = fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer > 0 && fighter.bankaiTimer <= finalThreshold;
  const canHollowAwaken = Boolean(fighter.bankaiActive || fighter.bankaiUsed);
  if (canHollowAwaken && !fighter.hollowMaskUsed && !fighter.isTargetOfAmbush && !isBusyWithGetsuga && !isPendingFinalGetsuga && !fighter.isChannelingBankai && !fighter.isParalyzedOrBeamTrapped() && fighter.hp / fighter.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold ?? 0.70)) {
    activateHollowMask(fighter);
  }

  // 2. Formation & Sky Burst Immobility Lock
  if (fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter._hollowVoicelineWait) {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.gunAngle = 0; // Strictly face towards player/viewer during Hollow Channeling
    fighter.angle = 0;

    if (fighter.hollowMaskFormationTimer > 0) {
      fighter.hollowMaskFormationTimer--;

      // Continuous arena screen shake building up as Hollow Mask formation progresses
      if (typeof triggerGlobalScreenShake === 'function') {
        const maxF = fighter.hollowMaskFormationMax || 325;
        const prog = 1.0 - (fighter.hollowMaskFormationTimer / maxF);
        const shakeIntensity = 1.2 + prog * 2.8;
        if (fighter.hollowMaskFormationTimer % 4 === 0) {
          triggerGlobalScreenShake(shakeIntensity, 6);
        }
      }

      // Check if voiceline audio is still actively playing
      const isVoicelinePlaying = Boolean(
        fighter._activeVoicelineHandle &&
        (
          (typeof fighter._activeVoicelineHandle.isPlaying === 'function' && fighter._activeVoicelineHandle.isPlaying()) ||
          (fighter._activeVoicelineEndTime && Date.now() < fighter._activeVoicelineEndTime)
        )
      );

      if (fighter.hollowMaskFormationTimer <= 0) {
        if (isVoicelinePlaying) {
          fighter.hollowMaskFormationTimer = 0;
          fighter._hollowVoicelineWait = true;
        } else {
          fighter._hollowVoicelineWait = false;
          fighter.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 36;
          fighter.hollowBurstMax = fighter.hollowBurstTimer;
          const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
          fighter._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.95);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isBankai ? 5.5 : 4.5, 20);
          }
        }
      }
    } else if (fighter._hollowVoicelineWait) {
      const isVoicelinePlaying = Boolean(
        fighter._activeVoicelineHandle &&
        (
          (typeof fighter._activeVoicelineHandle.isPlaying === 'function' && fighter._activeVoicelineHandle.isPlaying()) ||
          (fighter._activeVoicelineEndTime && Date.now() < fighter._activeVoicelineEndTime)
        )
      );
      if (!isVoicelinePlaying) {
        fighter._hollowVoicelineWait = false;
        fighter.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 36;
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
    if (!fighter.isParalyzedDebuffActive()) {
      fighter.hollowMaskTimer--;
    }

    // Micro-spark emission during the final cracking phase
    if (fighter.hollowMaskTimer < 60 && Math.random() < 0.28) {
      spawnSparks(fighter.x + (Math.random() - 0.5) * fighter.r, fighter.y - fighter.r * 0.3 + (Math.random() - 0.5) * fighter.r, 1, Math.random() < 0.5 ? '#DC143C' : '#FFFFFF');
    }

    if (fighter.hollowMaskTimer <= 0) {
      fighter.hollowMaskActive = false;
      spawnHollowMaskShatter(fighter);
      spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "MASK SHATTERED!", "#FFFFFF");
      spawnSparks(fighter.x, fighter.y, 14, '#DC143C');
      spawnSparks(fighter.x, fighter.y, 8, '#111111');
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3.5, 16);
      }
      // Trigger Shikai sonic-blast sky effect upon reverting to Shikai
      if (!fighter.bankaiActive) {
        fighter.shikaiReversionBurstTimer = CONFIG.ichigo?.shikaiReversionRecoveryFrames || CONFIG.ichigo?.shikaiReversionBurstFrames || 36;
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
