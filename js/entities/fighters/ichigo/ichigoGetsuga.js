import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { stopSound } from '../../../systems/soundSystem.js';
import { isHollowTransformationVoicelinePlaying } from './ichigoHollow.js';

/**
 * Snaps any angle to the nearest strict cardinal direction (UP / DOWN / LEFT / RIGHT).
 * @param {number} angle
 * @returns {number} 0 (Right), Math.PI / 2 (Down), Math.PI (Left), or -Math.PI / 2 (Up)
 */
export function snapToCardinalAngle(angle) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  if (Math.abs(cosA) >= Math.abs(sinA)) {
    return cosA >= 0 ? 0 : Math.PI;
  } else {
    return sinA >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

/**
 * Calculates strict cardinal angle (UP / DOWN / LEFT / RIGHT) from (fromX, fromY) to (toX, toY).
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @returns {number}
 */
export function getCardinalAimAngle(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 0 : Math.PI;
  } else {
    return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

/**
 * Returns true if a Getsuga Tensho projectile launched by this Ichigo is currently active in the arena.
 * During this time, Ichigo is barred from performing basic attack swings or initiating new skills.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isGetsugaActive(fighter) {
  if (fighter.activeGetsugaProjectile) {
    if ((fighter.activeGetsugaProjectile.life || 0) > 0 && projectileSystem?.projectiles?.includes(fighter.activeGetsugaProjectile)) {
      return true;
    } else {
      fighter.activeGetsugaProjectile = null;
    }
  }
  if (projectileSystem && projectileSystem.projectiles && projectileSystem.projectiles.length > 0) {
    const myIdx = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(fighter) : -1;
    const found = projectileSystem.projectiles.find(p => p && (p.isGetsuga || p.behaviorType === 'getsuga_tensho') && (p.owner === myIdx || p.ownerFighter === fighter) && (p.life || 0) > 0);
    if (found) {
      fighter.activeGetsugaProjectile = found;
      return true;
    }
  }
  return false;
}

/**
 * Returns true if Ichigo is actively preparing, channeling, releasing, or about to unleash normal Getsuga Tensho.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isAboutToUnleashNormalGetsuga(fighter) {
  if (fighter.isDead || fighter.hp <= 0) return false;
  // 1. Actively charging / channeling normal Getsuga Tensho
  if (fighter.isChannelingGetsuga && !fighter.isFinalMassiveGetsuga) {
    return true;
  }
  // 2. Normal Getsuga release swing animation / follow-through
  if (fighter.isGetsugaSlash && !fighter.isFinalGetsugaRecovery && (fighter.slashSwingTimer > 0 || (fighter.getsugaRecoveryTimer && fighter.getsugaRecoveryTimer > 0))) {
    return true;
  }
  // 3. Shunpo Combo: Flash step flurry finished and disengaging or preparing back-step to unleash Getsuga
  if (fighter.shunpoComboActive) {
    const maxSteps = fighter.shunpoMaxSteps || (fighter.bankaiActive ? 6 : 4);
    if (fighter.isShunpoDisengaging || (fighter.shunpoDisengageDelayTimer && fighter.shunpoDisengageDelayTimer > 0) || fighter.shunpoComboStep >= maxSteps) {
      return true;
    }
  }
  return false;
}

/**
 * Immediately stops any active Final Getsuga or Getsuga voiceline playback.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {boolean} [force=false]
 */
export function stopFinalGetsugaVoiceline(fighter, force = false) {
  if (!force && fighter.hp > 0 && !fighter.isDead) {
    return; // Do NOT cut off speaking voice mid-sentence on normal hits or transient recovery endings
  }
  if (fighter._finalGetsugaVoiceHandle) {
    stopSound(fighter._finalGetsugaVoiceHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._finalGetsugaVoiceHandle);
    }
    fighter._finalGetsugaVoiceHandle = null;
  }
  if (fighter._getsugaVoiceHandle) {
    stopSound(fighter._getsugaVoiceHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._getsugaVoiceHandle);
    }
    fighter._getsugaVoiceHandle = null;
  }
  if (fighter._getsugaChargeHandle) {
    stopSound(fighter._getsugaChargeHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._getsugaChargeHandle);
    }
    fighter._getsugaChargeHandle = null;
  }
  if (fighter._activeVoicelineHandle) {
    const srcStr = String(fighter._activeVoicelineHandle.src || (fighter._activeVoicelineHandle.audio && fighter._activeVoicelineHandle.audio.src) || '').toLowerCase();
    if (srcStr.includes('getsugatensho') || srcStr.includes('getsuga') || srcStr.includes('kuroi') || srcStr.includes('redcharging')) {
      stopSound(fighter._activeVoicelineHandle);
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
        audioSystem.stopSFX(fighter._activeVoicelineHandle);
      }
      fighter._activeVoicelineHandle = null;
    }
  }
  fighter._finalGetsugaVoicePlaying = false;
  fighter._finalGetsugaVoiceEndTime = 0;
  fighter._getsugaVoicePlaying = false;
  fighter._getsugaVoiceEndTime = 0;
}

/**
 * Checks whether normal Getsuga Tensho voiceline audio is currently playing.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isGetsugaVoicelinePlaying(fighter) {
  if (fighter.isDead || fighter.hp <= 0) {
    stopFinalGetsugaVoiceline(fighter, true);
    return false;
  }
  if (!fighter._getsugaVoicePlaying) return false;
  const now = Date.now();

  // 1. Authoritative window: If hard duration timestamp has not elapsed, voiceline is active!
  if (fighter._getsugaVoiceEndTime && now < fighter._getsugaVoiceEndTime) {
    return true;
  }

  // 2. If sound handle is explicitly playing past duration
  const handle = fighter._getsugaVoiceHandle || fighter._activeVoicelineHandle;
  if (handle && typeof handle.isPlaying === 'function' && handle.isPlaying()) {
    return true;
  }

  fighter._getsugaVoicePlaying = false;
  fighter._getsugaVoiceHandle = null;
  return false;
}

/**
 * Checks whether Final Massive Getsuga voiceline audio is currently playing.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isFinalGetsugaVoicelinePlaying(fighter) {
  if (fighter.isDead || fighter.hp <= 0) {
    stopFinalGetsugaVoiceline(fighter, true);
    return false;
  }
  if (!fighter._finalGetsugaVoicePlaying) return false;
  const now = Date.now();

  // 1. Authoritative window: If hard duration timestamp has not elapsed, voiceline is active!
  if (fighter._finalGetsugaVoiceEndTime && now < fighter._finalGetsugaVoiceEndTime) {
    return true;
  }

  // 2. If sound handle is explicitly playing past duration
  const handle = fighter._finalGetsugaVoiceHandle || fighter._activeVoicelineHandle;
  if (handle && typeof handle.isPlaying === 'function' && handle.isPlaying()) {
    return true;
  }

  fighter._finalGetsugaVoicePlaying = false;
  fighter._finalGetsugaVoiceHandle = null;
  return false;
}

/**
 * Prepares and channels the Grand Finisher: Final Massive Kuroi Getsuga Tensho.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} [target=null]
 */
export function fireFinalMassiveGetsuga(fighter, target = null) {
  if (fighter.isDead || fighter.hp <= 0 || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (isGetsugaActive(fighter)) return;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isChannelingGetsuga || isFinalGetsugaVoicelinePlaying(fighter)) return;

  // Aim at target (any continuous angle)
  let castAngle;
  if (target && target.hp > 0 && !target.isDead) {
    fighter.getsugaTarget = target;
    const targetY = (target.y !== undefined ? target.y : fighter.y) - (target.z || 0);
    const fighterY = fighter.y - (fighter.z || 0);
    castAngle = Math.atan2(targetY - fighterY, (target.x !== undefined ? target.x : fighter.x) - fighter.x);
  } else if (fighter.isPlayerControlled) {
    const opp = fighter.getNearestOpponent ? fighter.getNearestOpponent() : null;
    if (opp && opp.hp > 0 && !opp.isDead) {
      const targetY = (opp.y !== undefined ? opp.y : fighter.y) - (opp.z || 0);
      const fighterY = fighter.y - (fighter.z || 0);
      castAngle = Math.atan2(targetY - fighterY, (opp.x !== undefined ? opp.x : fighter.x) - fighter.x);
    } else {
      castAngle = (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0);
    }
  } else {
    fighter.getsugaTarget = (typeof fighter._getClosestEnemy === 'function') ? fighter._getClosestEnemy() : null;
    if (fighter.getsugaTarget && fighter.getsugaTarget.hp > 0 && !fighter.getsugaTarget.isDead) {
      const targetY = (fighter.getsugaTarget.y !== undefined ? fighter.getsugaTarget.y : fighter.y) - (fighter.getsugaTarget.z || 0);
      const fighterY = fighter.y - (fighter.z || 0);
      castAngle = Math.atan2(targetY - fighterY, (fighter.getsugaTarget.x !== undefined ? fighter.getsugaTarget.x : fighter.x) - fighter.x);
    } else {
      castAngle = (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0);
    }
  }
  fighter.getsugaCastAngle = castAngle;
  fighter.gunAngle = castAngle;
  fighter.angle = castAngle;

  fighter.bankaiFinalGetsugaTriggered = true;
  fighter.slashSwingTimer = 0;
  fighter.isGetsugaSlash = false;
  castBankaiFinalGetsuga(fighter);
}

/**
 * Executes the Grand Finisher channeling state.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function castBankaiFinalGetsuga(fighter) {
  const isMask = Boolean(fighter.hollowMaskActive || fighter.skin === 'bankai_mask' || fighter.skin === 'shikai_mask');
  const chargeFrames = CONFIG.ichigo?.bankaiFinalGetsugaChargeFrames || 80;
  const voiceSrc = isMask
    ? (CONFIG.ichigo?.sounds?.finalHollowGetsugaVoice || 'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3')
    : (CONFIG.ichigo?.sounds?.finalGetsugaVoice || 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3');
  const voiceVol = isMask
    ? (CONFIG.ichigo?.soundVolumes?.finalHollowGetsugaVoice ?? CONFIG.ichigo?.soundVolumes?.hollowGetsugaVoice ?? 3.0)
    : (CONFIG.ichigo?.soundVolumes?.finalGetsugaVoice ?? 3.0);
  const voiceDurMs = isMask ? 2015 : 2460;
  const chargeText = isMask ? "FINAL KUROI HOLLOW GETSUGA..." : "FINAL KUROI GETSUGA...";
  const chargeColor = isMask ? (CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00') : (CONFIG.ichigo?.bankaiFinalGetsugaColor || '#DC143C');

  // Supreme Poise: clear any incoming hit stun or pushback displacement
  fighter.hitStunTimer = 0;
  fighter.knockbackVx = 0;
  fighter.knockbackVy = 0;
  fighter.vx = 0;
  fighter.vy = 0;

  // Clear and override any active dash, swing, or basic attack states so Grand Finisher immediately unleashes
  fighter.isShunpoDashing = false;
  fighter.shunpoDashTimer = 0;
  fighter.shunpoComboActive = false;
  fighter.shunpoComboStep = 0;
  fighter.shunpoComboDelayTimer = 0;
  fighter.shunpoTarget = null;
  fighter.slashSwingTimer = 0;
  fighter.isGetsugaSlash = false;

  fighter.isChannelingGetsuga = true;
  fighter.isFinalMassiveGetsuga = true;
  fighter.isFinalGetsugaRecovery = false;
  fighter._finalGetsugaVoicePlaying = true;
  fighter.getsugaChargeMax = chargeFrames;
  fighter.getsugaChargeTimer = chargeFrames;
  fighter.getsugaSlideTimer = 0;

  const now = Date.now();
  fighter._finalGetsugaVoiceEndTime = now + voiceDurMs;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, chargeText, chargeColor);
  if (!isHollowTransformationVoicelinePlaying(fighter)) {
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
      fighter._finalGetsugaVoiceHandle = audioSystem.playFighterVoiceline(fighter, voiceSrc, voiceVol, 1.0, 0, 0, {
        priority: 'domain',
        isProtected: true,
        durationMs: voiceDurMs
      });
    } else {
      fighter._finalGetsugaVoiceHandle = fighter._playSound(isMask ? 'finalHollowGetsugaVoice' : 'finalGetsugaVoice', voiceSrc, voiceVol);
    }
  }
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(isMask ? 5.5 : 4.5, 22);
  }
}

/**
 * Fires standard Getsuga Tensho wave (Shikai, Bankai, or Hollow form).
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} [target=null]
 * @param {boolean} [isCombo=false]
 */
export function fireGetsuga(fighter, target = null, isCombo = false) {
  if (fighter.isDead || fighter.hp <= 0 || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (!isCombo && isGetsugaActive(fighter)) return;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isChannelingGetsuga || fighter.getsugaRecoveryTimer > 0 || isFinalGetsugaVoicelinePlaying(fighter)) return;
  if (!isCombo && (fighter.isTargetOfAmbush || fighter.isParalyzedOrBeamTrapped() || fighter.isShunpoDashing)) return;

  // 1. Aim at target (any continuous angle)
  let castAngle;
  if (target && target.hp > 0 && !target.isDead) {
    fighter.getsugaTarget = target;
    const targetY = (target.y !== undefined ? target.y : fighter.y) - (target.z || 0);
    const fighterY = fighter.y - (fighter.z || 0);
    castAngle = Math.atan2(targetY - fighterY, (target.x !== undefined ? target.x : fighter.x) - fighter.x);
  } else if (fighter.isPlayerControlled) {
    const opp = fighter.getNearestOpponent ? fighter.getNearestOpponent() : null;
    if (opp && opp.hp > 0 && !opp.isDead) {
      const targetY = (opp.y !== undefined ? opp.y : fighter.y) - (opp.z || 0);
      const fighterY = fighter.y - (fighter.z || 0);
      castAngle = Math.atan2(targetY - fighterY, (opp.x !== undefined ? opp.x : fighter.x) - fighter.x);
    } else {
      castAngle = (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0);
    }
  } else {
    fighter.getsugaTarget = (typeof fighter._getClosestEnemy === 'function') ? fighter._getClosestEnemy() : null;
    if (fighter.getsugaTarget && fighter.getsugaTarget.hp > 0 && !fighter.getsugaTarget.isDead) {
      const targetY = (fighter.getsugaTarget.y !== undefined ? fighter.getsugaTarget.y : fighter.y) - (fighter.getsugaTarget.z || 0);
      const fighterY = fighter.y - (fighter.z || 0);
      castAngle = Math.atan2(targetY - fighterY, (fighter.getsugaTarget.x !== undefined ? fighter.getsugaTarget.x : fighter.x) - fighter.x);
    } else {
      castAngle = (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0);
    }
  }
  fighter.getsugaCastAngle = castAngle;
  fighter.gunAngle = castAngle;
  fighter.angle = castAngle;

  fighter._isComboGetsuga = Boolean(isCombo);
  if (isCombo) {
    fighter.hitStunTimer = 0;
    fighter.knockbackVx = 0;
    fighter.knockbackVy = 0;
    fighter.vx = 0;
    fighter.vy = 0;
  }

  fighter.slashSwingTimer = 0;
  fighter.isGetsugaSlash = false;

  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask';
  const isMask = Boolean(fighter.hollowMaskActive || fighter.skin === 'bankai_mask' || fighter.skin === 'shikai_mask');

  const voiceChance = isMask 
    ? (CONFIG.ichigo?.soundChances?.hollowGetsugaVoice ?? 0.50)
    : (isBankai 
      ? (CONFIG.ichigo?.soundChances?.bankaiGetsugaVoice ?? 0.50)
      : (CONFIG.ichigo?.soundChances?.comboGetsugaVoice ?? 0.50));
  const shouldPlayVoiceline = !isFinalGetsugaVoicelinePlaying(fighter) && 
                              !isHollowTransformationVoicelinePlaying(fighter) && 
                              (Math.random() < voiceChance);

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
      
      chargeFrames = isShortVoiceline 
        ? (CONFIG.ichigo?.hollowGetsugaVoice2ChargeFrames ?? 34) 
        : (CONFIG.ichigo?.hollowGetsugaVoice1ChargeFrames ?? 80);
      durationMs = isShortVoiceline ? 760 : 2015;
    } else {
      const defaultShikaiCharge = CONFIG.ichigo?.getsugaChargeFrames || 64;
      const hollowMult = (CONFIG.ichigo?.hollowGetsugaChargeMultiplier !== undefined)
        ? CONFIG.ichigo.hollowGetsugaChargeMultiplier
        : 0.50;
      const calcCharge = Math.round(defaultShikaiCharge * hollowMult);
      chargeFrames = isBankai 
        ? (hollowMult === 0 ? 1 : (CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30)) 
        : Math.max(1, calcCharge);
    }
  } else if (isBankai) {
    if (shouldPlayVoiceline) {
      voiceSrc = CONFIG.ichigo?.sounds?.bankaiGetsugaVoice || 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3';
    }
    chargeFrames = CONFIG.ichigo?.bankaiGetsugaChargeFrames || 30;
    durationMs = CONFIG.ichigo?.bankaiGetsugaVoiceDurationMs || 2500;
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
      ? 30
      : (CONFIG.ichigo?.getsugaChargeFrames || 64);
    durationMs = isShortVoiceline ? 500 : 1100;
  } else {
    const defaultShikaiCharge = CONFIG.ichigo?.getsugaChargeFrames || 64;
    chargeFrames = defaultShikaiCharge;
  }

  const slideFrames = isCombo ? 0 : (CONFIG.ichigo?.getsugaSlideFrames || 8);

  fighter.isChannelingGetsuga = true;
  fighter.getsugaChargeMax = chargeFrames;
  fighter.getsugaChargeTimer = chargeFrames;
  fighter.getsugaSlideTimer = slideFrames;

  const chargeText = (isBankai && isMask) ? 'BLACK KUROI GETSUGA...' : (isMask ? 'HOLLOW GETSUGA...' : (isBankai ? 'KUROI GETSUGA...' : 'GETSUGA...'));
  const chargeColor = (isBankai && isMask) 
    ? (CONFIG.ichigo?.bankaiHollowGetsugaColor || '#FF1E00') 
    : (isMask 
      ? (CONFIG.ichigo?.hollowGetsugaColor || '#FFFFFF') 
      : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaColor || '#DC143C') : (CONFIG.ichigo?.getsugaColor || '#00D5FF')));

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, chargeText, chargeColor);

  if (shouldPlayVoiceline && voiceSrc) {
    const voiceVol = isMask 
      ? (CONFIG.ichigo?.soundVolumes?.hollowGetsugaVoice ?? 3.0) 
      : (isBankai 
        ? (CONFIG.ichigo?.soundVolumes?.bankaiGetsugaVoice ?? 3.0)
        : (CONFIG.ichigo?.soundVolumes?.comboGetsugaVoice ?? 2.8));
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
      fighter._getsugaVoiceHandle = audioSystem.playFighterVoiceline(fighter, voiceSrc, voiceVol, 1.0, 0, 0, {
        priority: 'protected',
        isProtected: true,
        durationMs: durationMs
      });
      fighter._getsugaVoicePlaying = true;
      fighter._getsugaVoiceEndTime = Date.now() + durationMs;
    } else {
      fighter._getsugaVoiceHandle = fighter._playSound(isMask ? 'hollowGetsugaVoice' : (isBankai ? 'bankaiGetsugaVoice' : 'comboGetsugaVoice'), voiceSrc, voiceVol);
      fighter._getsugaVoicePlaying = true;
      fighter._getsugaVoiceEndTime = Date.now() + durationMs;
    }
  } else {
    const sfx = CONFIG.ichigo?.sounds?.getsugaCharge || 'Assets/Sound Effects/Skills/redcharging.mp3';
    const vol = CONFIG.ichigo?.soundVolumes?.getsugaCharge ?? 0.85;
    fighter._getsugaChargeHandle = fighter._playSound('getsugaCharge', sfx, vol);
  }
}

/**
 * Releases the Getsuga wave projectile and applies recoil kick & recovery frames.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function releaseGetsuga(fighter) {
  fighter.isChannelingGetsuga = false;
  fighter.getsugaChargeTimer = 0;
  fighter.getsugaSlideTimer = 0;

  if (fighter._getsugaChargeHandle) {
    stopSound(fighter._getsugaChargeHandle);
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSFX === 'function') {
      audioSystem.stopSFX(fighter._getsugaChargeHandle);
    }
    fighter._getsugaChargeHandle = null;
  }

  const isFinal = Boolean(fighter.isFinalMassiveGetsuga);
  fighter.isFinalMassiveGetsuga = false;

  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;

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
    textColor = CONFIG.ichigo?.hollowGetsugaColor || '#FFFFFF';
    shakeAmt = CONFIG.ichigo?.hollowGetsugaScreenShake || 5.0;
  } else if (isBankai) {
    form = 'bankai';
    text = '...KUROI GETSUGA!';
    textColor = CONFIG.ichigo?.bankaiGetsugaColor || '#DC143C';
    shakeAmt = CONFIG.ichigo?.bankaiGetsugaScreenShake || 4.5;
  }

  const baseDmg = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaTickDamage || 5) * (isMask ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.1) : 1.0)
    : (isBankai && isMask
      ? (CONFIG.ichigo?.bankaiHollowGetsugaTickDamage || 6)
      : (isMask
        ? (CONFIG.ichigo?.hollowGetsugaTickDamage || 3)
        : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaTickDamage || 4) : (CONFIG.ichigo?.getsugaTickDamage || 2))));
  const baseSpeed = CONFIG.ichigo?.getsugaTravelSpeed ?? CONFIG.ichigo?.getsugaSpeed ?? 11;
  const speed = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaSpeed ?? 24)
    : (isMask ? (CONFIG.ichigo?.hollowGetsugaSpeed ?? 10) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSpeed ?? 22) : baseSpeed));
  const ownerIndex = state.fighters.indexOf(fighter);

  fighter.getsugaReleaseCount = (fighter.getsugaReleaseCount || 0) + 1;
  if (projectileSystem && typeof projectileSystem.fireGetsugaTensho === 'function') {
    fighter.activeGetsugaProjectile = projectileSystem.fireGetsugaTensho(fighter, ownerIndex, baseDmg, speed, form);
  }

  fighter.isGetsugaSlash = true;
  const slashDur = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaSlashDuration || 30)
    : (isBankai 
      ? (CONFIG.ichigo?.bankaiGetsugaSlashDuration || CONFIG.ichigo?.bankaiGetsugaRecoveryFrames || 20)
      : (CONFIG.ichigo?.getsugaSlashDuration || 24));
  fighter.slashSwingTimer = slashDur;
  fighter.slashSwingMaxTimer = slashDur;
  let cdMult = 1.0;
  if (isBankai) {
    cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? CONFIG.ichigo?.bankaiGetsugaCooldownMultiplier ?? 0.50);
  }
  if (isMask) {
    cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowShunpoCooldownMultiplier ?? CONFIG.ichigo?.hollowGetsugaCooldownMultiplier ?? 0.25);
  }
  const isFlurry = fighter._isFlurryEnabled();
  const baseCd = !isFlurry 
    ? (CONFIG.ichigo?.flashStepCooldown ?? CONFIG.ichigo?.singleShunpoCooldown ?? 320)
    : (CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.shunpoCooldown || CONFIG.ichigo?.getsugaCooldown || 450);
  const finalCd = Math.round(baseCd * cdMult);
  fighter.getsugaCooldown = finalCd;
  fighter.shunpoCooldown = finalCd;

  // Set post-release breather / recovery frames before resuming movement or new attacks
  const recoveryFrames = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaRecoveryFrames || 48)
    : (isBankai 
      ? (CONFIG.ichigo?.bankaiGetsugaRecoveryFrames ?? 20)
      : (CONFIG.ichigo?.getsugaRecoveryFrames ?? 24));
  fighter.getsugaRecoveryTimer = recoveryFrames;
  fighter.isFinalGetsugaRecovery = isFinal;

  // Small kinetic recoil kick strictly along committed cast angle
  const lockAngle = (fighter.getsugaCastAngle !== undefined && !Number.isNaN(fighter.getsugaCastAngle))
    ? fighter.getsugaCastAngle
    : ((fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0));
  fighter.getsugaCastAngle = lockAngle;
  fighter.gunAngle = lockAngle;
  fighter.angle = lockAngle;

  const recoil = CONFIG.ichigo?.getsugaRecoil || 3.5;
  fighter.vx = -Math.cos(lockAngle) * recoil;
  fighter.vy = -Math.sin(lockAngle) * recoil;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, text, textColor);
  fighter._playSound('getsugaReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
  fighter._playSound('getsugaReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(shakeAmt, 14);
  }

  fighter.getsugaTarget = null;
}

/**
 * Updates Getsuga channeling, slide physics, smooth aim rotation, and post-release recovery lock.
 * Returns true if fighter is locked in a Getsuga state.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} opponent
 * @returns {boolean} isLocked
 */
export function updateGetsuga(fighter, opponent) {
  // 1. Channeling & Slide Physics
  if (fighter.isChannelingGetsuga) {
    if (fighter.isCaughtInBeam()) {
      fighter.isChannelingGetsuga = false;
      fighter.getsugaChargeTimer = 0;
      fighter.getsugaSlideTimer = 0;
      fighter.isFinalMassiveGetsuga = false;
    } else {
      if (fighter.getsugaSlideTimer > 0) {
        fighter.getsugaSlideTimer--;
        const damping = CONFIG.ichigo?.getsugaSlideDamping || 0.72;
        fighter.vx *= damping;
        fighter.vy *= damping;
        fighter.x += fighter.vx;
        fighter.y += fighter.vy;
        if (Math.random() < 0.6) {
          spawnSparks(fighter.x, fighter.y + fighter.r * 0.7, 2, '#FFFFFF');
        }
      } else {
        fighter.vx = 0;
        fighter.vy = 0;
      }

      // Commit 100% to the locked initial cast angle (strictly NO snap auto-aim tracking!)
      const lockAngle = (fighter.getsugaCastAngle !== undefined && !Number.isNaN(fighter.getsugaCastAngle))
        ? fighter.getsugaCastAngle
        : ((fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) ? fighter.gunAngle : (fighter.angle || 0));
      fighter.getsugaCastAngle = lockAngle;
      fighter.gunAngle = lockAngle;
      fighter.angle = lockAngle;

      fighter.getsugaChargeTimer--;
      if (fighter.getsugaChargeTimer <= 0) {
        if (typeof fighter._releaseGetsuga === 'function') {
          fighter._releaseGetsuga();
        } else {
          releaseGetsuga(fighter);
        }
      }
      return true; // Locked in channeling
    }
  }

  // 2. Post-Getsuga Breather Recovery Lock
  if (fighter.getsugaRecoveryTimer > 0) {
    if (fighter.getsugaCastAngle !== undefined) {
      fighter.gunAngle = fighter.getsugaCastAngle;
      fighter.angle = fighter.getsugaCastAngle;
    }
    if (fighter.isFinalGetsugaRecovery && isFinalGetsugaVoicelinePlaying(fighter)) {
      fighter.getsugaRecoveryTimer = Math.max(fighter.getsugaRecoveryTimer, 2);
    }

    // Ensure sword slash animation timer ticks down smoothly during recovery
    if (fighter.slashSwingTimer > 0) {
      fighter.slashSwingTimer--;
      if (fighter.slashSwingTimer <= 0) {
        fighter.isGetsugaSlash = false;
      }
    }

    fighter.getsugaRecoveryTimer--;
    if (fighter.getsugaRecoveryTimer <= 0) {
      const castAngle = fighter.getsugaCastAngle;
      fighter.getsugaCastAngle = undefined;
      fighter.isFinalGetsugaRecovery = false;
      fighter._finalGetsugaVoicePlaying = false;
      fighter._finalGetsugaVoiceHandle = null;
      if (fighter.slashSwingTimer <= 0) {
        fighter.isGetsugaSlash = false;
      }
      
      // Move backward away from the enemy / cast direction instead of charging forward into the enemy
      const target = (opponent && !opponent.isDead && opponent.hp > 0) ? opponent : (typeof fighter._getClosestEnemy === 'function' ? fighter._getClosestEnemy() : null);
      let backwardAngle;
      if (target && typeof target.x === 'number' && typeof target.y === 'number') {
        backwardAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
      } else if (castAngle !== undefined) {
        backwardAngle = castAngle + Math.PI;
      } else {
        backwardAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0)) + Math.PI;
      }
      fighter.resumeMovement(null, 1.0, backwardAngle);
    }
    const damping = CONFIG.ichigo?.getsugaSlideDamping || 0.85;
    fighter.vx *= damping;
    fighter.vy *= damping;
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;
    const clamped = fighter._clampToArena(fighter.x, fighter.y);
    fighter.x = clamped.x;
    fighter.y = clamped.y;

    if (Math.random() < 0.35) {
      spawnSparks(fighter.x, fighter.y + fighter.r * 0.7, 1, '#FFFFFF');
    }

    return true; // Locked in recovery pose
  }

  return false;
}
