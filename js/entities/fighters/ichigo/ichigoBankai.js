import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { fastCleanArray, pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { applyDamageToTarget } from '../../fighter.js';
import { applyHollowLifesteal } from './ichigoHollow.js';

/**
 * Activates Ichigo's Bankai transformation.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function activateBankai(fighter) {
  if (fighter.isDead || fighter.hp <= 0 || fighter.isTargetOfAmbush || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (
    fighter.isChannelingBankai || 
    fighter.bankaiActive || 
    fighter.hollowMaskActive || // Cannot activate Bankai if in Hollow state first
    fighter.hollowMaskFormationTimer > 0 || 
    fighter.hollowBurstTimer > 0 || 
    fighter.shikaiReversionBurstTimer > 0 ||
    fighter.isAboutToUnleashNormalGetsuga() ||
    fighter.isChannelingGetsuga || 
    fighter.getsugaRecoveryTimer > 0 || 
    fighter._isGetsugaVoicelinePlaying() || 
    fighter._isFinalGetsugaVoicelinePlaying() ||
    fighter.isShunpoDashing ||
    fighter.shunpoComboActive
  ) return;

  // Strict validation: Ensure Bankai condition is genuinely met (HP <= 90% on 1st use, or HP lost >= 20% on subsequent use)
  const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.90;
  const reqDamage = (fighter.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
  const baseline = fighter.bankaiRechargeHpBaseline !== undefined ? fighter.bankaiRechargeHpBaseline : fighter.hp;
  const damageTaken = Math.max(0, baseline - fighter.hp);
  const isReady = !fighter.bankaiUsed ? (fighter.hp / fighter.maxHp <= ultThreshold) : (damageTaken >= reqDamage);
  if (!isReady) return;

  fighter.bankaiUsed = true;
  fighter.bankaiRechargeHpBaseline = undefined;
  fighter._maxBankaiPct = 0;
  fighter.ultimateCooldown = 0;

  fighter.slashSwingTimer = 0;
  fighter.isGetsugaSlash = false;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.knockbackVx = 0;
  fighter.knockbackVy = 0;

  // Immediately flush lingering afterimages from prior dashes/combos and re-anchor Bankai trail coordinates to current position
  fighter.afterImages = [];
  fighter._lastBankaiTrailX = fighter.x;
  fighter._lastBankaiTrailY = fighter.y;
  fighter.isShunpoDashing = false;
  fighter.shunpoDashTimer = 0;
  fighter.shunpoComboActive = false;
  fighter.shunpoComboStep = 0;
  fighter.shunpoComboDelayTimer = 0;
  fighter.shunpoDisengageDelayTimer = 0;
  fighter.isShunpoDisengaging = false;
  fighter.shunpoTarget = null;

  const chargeFrames = CONFIG.ichigo?.bankaiChargeFrames || 66;
  const enemy = fighter._getClosestEnemy();
  if (enemy && enemy.hp > 0 && !enemy.isDead) {
    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
    fighter.gunAngle = Math.atan2(dy, dx);
    fighter.angle = fighter.gunAngle;
  }

  fighter.isChannelingBankai = true;
  fighter.bankaiChargeMax = chargeFrames;
  fighter.bankaiChargeTimer = chargeFrames;
  fighter.bankaiSlideTimer = 0; // Immediate complete stop (no sliding)

  const chargeText = fighter.hollowMaskActive ? "BAN... KAI! (HOLLOW)" : "BAN... KAI!";
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, chargeText, "#DC143C");

  const voiceSrc = CONFIG.ichigo?.sounds?.bankaiCharge || 'Assets/Sound Effects/Skills/Ichigo-bankai-charging-voiceline.mp3';
  const voiceVol = CONFIG.ichigo?.soundVolumes?.bankaiCharge ?? 2.8;
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
    audioSystem.playFighterVoiceline(fighter, voiceSrc, voiceVol, 1.0, 0, 0, {
      priority: 'domain',
      isProtected: true,
      durationMs: 1150
    });
  } else {
    fighter._playSound('bankaiCharge', voiceSrc, voiceVol);
  }
}

/**
 * Releases Bankai: triggers the Reiatsu shockwave, crystalline shards, cloth streamers, and applies mode boosts.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
export function releaseBankai(fighter) {
  fighter.isChannelingBankai = false;
  fighter.bankaiChargeTimer = 0;
  fighter.bankaiSlideTimer = 0;

  fighter.bankaiActive = true;
  fighter.bankaiTimer = CONFIG.ichigo?.bankaiDuration || 800;
  fighter.bankaiFinalGetsugaTriggered = false;
  fighter.isFinalMassiveGetsuga = false;
  fighter.ultimateCooldown = 0;

  fighter.bankaiBurstMax = CONFIG.ichigo?.bankaiBurstFrames || 36;
  fighter.bankaiBurstTimer = fighter.bankaiBurstMax;
  fighter.bankaiRibbonMax = CONFIG.ichigo?.bankaiRibbonDuration || 280;
  fighter.bankaiRibbonTimer = fighter.bankaiRibbonMax;

  // Immediately flush afterimages and re-anchor Bankai trail coordinates to current position
  fighter.afterImages = [];
  fighter._lastBankaiTrailX = fighter.x;
  fighter._lastBankaiTrailY = fighter.y;

  // Initialize 28 crystalline Reiatsu barrier diamond shards exploding outward
  fighter.bankaiShards = [];
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

    fighter.bankaiShards.push({
      x: fighter.x,
      y: fighter.y,
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
  fighter.bankaiClothStreamers = [];
  const streamerCount = 14;
  for (let i = 0; i < streamerCount; i++) {
    const angle = (i / streamerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 4.0 + Math.random() * 5.5;
    const length = 18 + Math.random() * 24;
    const width = 3.2 + Math.random() * 2.8;
    fighter.bankaiClothStreamers.push({
      x: fighter.x,
      y: fighter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      length,
      width,
      life: 1.0
    });
  }

  const releaseText = fighter.hollowMaskActive ? "...KAI! TENSA ZANGETSU (BANKAI + HOLLOW)" : "...KAI! TENSA ZANGETSU";
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, releaseText, "#FF1E00");
  fighter._playSound('bankaiReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
  fighter._playSound('bankaiReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.90);
  
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(CONFIG.ichigo?.bankaiScreenShake || 7, 28);
  }
  const shockwaveSize = CONFIG.ichigo?.bankaiAuraShockwaveSize || 95;
  spawnMeleeClashShockwave(fighter.x, fighter.y, shockwaveSize, 'sukuna');
  spawnMeleeClashShockwave(fighter.x, fighter.y, shockwaveSize * 0.8, 'gojo');
  spawnImpactFlash(fighter.x, fighter.y, 'sukuna');

  // ── Frontal Supersonic Reiatsu Wind Pressure Damage & Knockback Blast ──
  const aimAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  fighter._bankaiBurstAngle = aimAngle; // Saved for frontal wind blast rendering
  const reach = CONFIG.ichigo?.bankaiWindReach || 240;
  const arc = ((CONFIG.ichigo?.bankaiWindArc || 140) * Math.PI) / 180;
  const windDmg = CONFIG.ichigo?.bankaiWindDamage || 35;
  const kbForce = CONFIG.ichigo?.bankaiWindKnockback || 14;
  const stunDuration = CONFIG.ichigo?.bankaiWindHitStun || 24;

  const myIndex = state.fighters ? state.fighters.indexOf(fighter) : -1;
  const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;

  const candidates = [];
  if (state.fighters) {
    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0 && !f.isRespawning) {
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
    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
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
        applyDamageToTarget(enemy, windDmg, fighter, { isSkill: true });
        applyHollowLifesteal(fighter, windDmg, enemy);

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

/**
 * Updates Bankai transformation channeling, burst freeze, shards/streamers, ribbon lifecycle,
 * Shikai reversion burst, Bankai duration decay, and supersonic trail afterimages.
 * Returns true if fighter is locked in a Bankai transition state.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} opponent
 * @param {boolean} isMatchEnded
 * @returns {boolean} isLocked
 */
export function updateBankai(fighter, opponent, isMatchEnded) {
  // 1. Bankai Transformation Channeling
  if (fighter.isChannelingBankai) {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.knockbackVx = 0;
    fighter.knockbackVy = 0;
    fighter.bankaiSlideTimer = 0;
    fighter.afterImages = [];
    fighter._lastBankaiTrailX = fighter.x;
    fighter._lastBankaiTrailY = fighter.y;

    // Sparking crimson/black spiritual pressure motes
    if (Math.random() < 0.7) {
      spawnSparks(fighter.x, fighter.y, 2, Math.random() < 0.5 ? '#FF0000' : '#111111');
    }

    fighter.bankaiChargeTimer--;
    if (fighter.bankaiChargeTimer <= 0) {
      if (typeof fighter._releaseBankai === 'function') {
        fighter._releaseBankai();
      } else {
        releaseBankai(fighter);
      }
    }
    return true; // Locked in transformation channeling
  }

  // 2. Bankai 3D Ribbon Lifecycle
  if (fighter.bankaiRibbonTimer > 0 && !fighter.isParalyzedDebuffActive()) {
    fighter.bankaiRibbonTimer--;
  }

  // 3. Bankai Post-Release Burst & Crystalline Shards / Cloth Streamers Update
  if (fighter.bankaiBurstTimer > 0) {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.bankaiSlideTimer = 0;
    fighter.afterImages = [];
    fighter._lastBankaiTrailX = fighter.x;
    fighter._lastBankaiTrailY = fighter.y;

    fighter.bankaiBurstTimer--;
    if (fighter.bankaiBurstTimer <= 0) {
      fighter.resumeMovement(opponent);
    }
    if (fighter.bankaiShards && fighter.bankaiShards.length > 0) {
      fastCleanArray(fighter.bankaiShards, (shard) => {
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vx *= 0.93;
        shard.vy *= 0.93;
        shard.rot += shard.rotSpeed;
        shard.life = fighter.bankaiBurstTimer / fighter.bankaiBurstMax;
        return fighter.bankaiBurstTimer > 0;
      });
    }
    if (fighter.bankaiClothStreamers && fighter.bankaiClothStreamers.length > 0) {
      fastCleanArray(fighter.bankaiClothStreamers, (st) => {
        st.x += st.vx;
        st.y += st.vy;
        st.vx *= 0.92;
        st.vy *= 0.92;
        st.angle += 0.05;
        st.life = fighter.bankaiBurstTimer / fighter.bankaiBurstMax;
        return fighter.bankaiBurstTimer > 0;
      });
    }
    if (Math.random() < 0.50) {
      spawnSparks(fighter.x + (Math.random() - 0.5) * fighter.r * 2, fighter.y + (Math.random() - 0.5) * fighter.r * 2, 2, Math.random() < 0.5 ? '#FF1E00' : '#00E5FF');
    }

    return true; // Complete immobility & skill lock during burst
  }

  // 4. Shikai reversion burst animation timer decay & action lock breather
  if (fighter.shikaiReversionBurstTimer > 0) {
    fighter.slashSwingTimer = 0;
    fighter.slashSwingMaxTimer = 0;
    fighter.isGetsugaSlash = false;
    fighter.isFinalMassiveGetsuga = false;
    fighter.isFinalGetsugaRecovery = false;
    fighter.isChannelingGetsuga = false;
    fighter.getsugaChargeTimer = 0;
    fighter.getsugaSlideTimer = 0;
    fighter.getsugaRecoveryTimer = 0;
    fighter.isShunpoDashing = false;
    fighter.shunpoComboActive = false;
    fighter.vx *= 0.85;
    fighter.vy *= 0.85;
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;
    fighter.shikaiReversionBurstTimer--;
    if (fighter.shikaiReversionBurstTimer <= 0) {
      fighter.resumeMovement(opponent);
    }
    return true; // Action lock breather
  }

  // 5. Bankai Active Loop
  if (fighter.bankaiActive) {
    if (!isMatchEnded) {
      // If Hollow Mask formation or burst is running, pause Bankai timer decay
      const isHollowTransforming = (fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0);
      if (!isHollowTransforming && !fighter.isParalyzedDebuffActive()) {
        fighter.bankaiTimer--;
      }

      // Bankai Finale: Unleash Massive Final Kuroi Getsuga Tensho before Bankai ends
      const finalTriggerThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
      const isPlaying = typeof state === 'undefined' || state.gameState === 'playing';
      const isAboutToUnleashNormalGetsugaWave = fighter.isAboutToUnleashNormalGetsuga();
      if (isPlaying && !fighter.isDemoFighter && !fighter._isFaceOff && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer > 0 && fighter.bankaiTimer <= finalTriggerThreshold && !fighter.isChannelingBankai && !isHollowTransforming) {
        if (isAboutToUnleashNormalGetsugaWave) {
          fighter.bankaiTimer = Math.max(fighter.bankaiTimer, finalTriggerThreshold + 1);
        } else {
          fighter.bankaiFinalGetsugaTriggered = true;
          fighter.interruptAttacks();
          const enemy = fighter._getClosestEnemy();
          if (enemy && enemy.hp > 0 && !enemy.isDead) {
            fighter.aim(enemy);
          }
          fighter.fireFinalMassiveGetsuga(enemy);
        }
      }

      if (fighter.bankaiTimer <= 0) {
        if (isAboutToUnleashNormalGetsugaWave || fighter.isChannelingGetsuga || (fighter.isChannelingGetsuga && fighter.isFinalMassiveGetsuga) || (fighter.getsugaRecoveryTimer > 0 && fighter.isFinalGetsugaRecovery) || fighter._isFinalGetsugaVoicelinePlaying() || isHollowTransforming || !fighter.bankaiFinalGetsugaTriggered) {
          fighter.bankaiTimer = 1;
        } else {
          fighter.bankaiActive = false;
          fighter.bankaiUsed = true;
          fighter._stopFinalGetsugaVoiceline();
          fighter.bankaiRechargeHpBaseline = fighter.hp; // Snapshot HP baseline upon Bankai expiration
          fighter._maxBankaiPct = 0;
          fighter.ultimateCooldown = 0;
          fighter.shikaiReversionBurstTimer = CONFIG.ichigo?.shikaiReversionRecoveryFrames || CONFIG.ichigo?.shikaiReversionBurstFrames || 42;
          fighter.shikaiReversionBurstMax = fighter.shikaiReversionBurstTimer;

          // Clear lingering states
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
          fighter.bankaiShards = [];
          fighter.bankaiClothStreamers = [];

          spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "BANKAI ENDED", "#00D5FF");
          fighter._playSound('bankaiEnded', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(3.5, 14);
          }
        }
      }
    }

    // 6. Supersonic black-crimson speed afterimages
    if (fighter.bankaiActive && !isMatchEnded && !fighter.isChannelingBankai && (fighter.bankaiBurstTimer || 0) <= 0) {
      if (fighter._lastBankaiTrailX === undefined) {
        fighter._lastBankaiTrailX = fighter.x;
        fighter._lastBankaiTrailY = fighter.y;
      }
      const distMoved = Math.hypot(fighter.x - fighter._lastBankaiTrailX, fighter.y - fighter._lastBankaiTrailY);
      if (distMoved > 60) {
        fighter._lastBankaiTrailX = fighter.x;
        fighter._lastBankaiTrailY = fighter.y;
      } else if (distMoved >= 14) {
        const steps = Math.min(4, Math.floor(distMoved / 14));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const subX = fighter._lastBankaiTrailX + (fighter.x - fighter._lastBankaiTrailX) * t;
          const subY = fighter._lastBankaiTrailY + (fighter.y - fighter._lastBankaiTrailY) * t;
          const aiClamped = fighter._clampToArena(subX, subY, fighter.r - 2);

          pushTrailCap(fighter.afterImages, {
            x: aiClamped.x,
            y: aiClamped.y,
            r: fighter.r,
            angle: fighter.angle,
            color: (Math.random() < 0.5) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(220, 20, 20, 0.55)',
            strokeColor: 'rgba(220, 20, 20, 0.90)',
            isBankai: true,
            timer: 16,
            maxTimer: 16
          }, 32);
        }
        fighter._lastBankaiTrailX = fighter.x;
        fighter._lastBankaiTrailY = fighter.y;
      }
    }
  }

  return false;
}
