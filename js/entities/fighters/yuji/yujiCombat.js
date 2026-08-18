import { CONFIG } from '../../../core/config.js';
import { applyDamageToTarget } from '../../fighter.js';
import { state, spawnFloatingText } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { spawnBlackFlash } from '../../../graphics/particles/blackFlashEffect.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
let lastPunchSoundSrc = null;

function playYujiPunchSound(disableVoice = false) {
  const sounds = CONFIG.yuji?.punchSounds;
  const chance = CONFIG.yuji?.punchSoundsChance ?? 1.0;
  const shouldPlayNoise = !disableVoice && Math.random() < chance;

  let soundSrc;
  let soundVol;
  if (shouldPlayNoise && sounds && Array.isArray(sounds) && sounds.length > 0) {
    let availableSounds = sounds;
    if (sounds.length > 1 && lastPunchSoundSrc) {
      availableSounds = sounds.filter(s => s !== lastPunchSoundSrc);
    }
    const idx = Math.floor(Math.random() * availableSounds.length);
    soundSrc = availableSounds[idx];
    lastPunchSoundSrc = soundSrc;
    soundVol = CONFIG.yuji?.punchSoundsVolume || CONFIG.yuji?.punchVolume || 2.5;
  } else {
    soundSrc = CONFIG.yuji?.punchSound || 'Assets/Sound Effects/Attacks/punch.mp3';
    soundVol = CONFIG.yuji?.punchVolume || 2.5;
  }
  audioSystem.playSFX(soundSrc, soundVol);
}

/**
 * Executes Yuji's basic attack punch.
 * Performs a frontal-arc collision check against all enemies.
 */
export function modUpdateMeleeCombat(customTarget = null, isCombo = false) {
  // If already punching or slashing, don't restart (unless it's a combo flurry punch)
  if (!isCombo && (this.punchAnimTimer > 0 || this.slashSwingTimer > 0)) return;

  const isZone = (this.blackFlashTimer > 0);
  
  const thresholdForAudio = this.soulSwapActive 
    ? (CONFIG.yuji?.soulSwapBlackFlashThreshold || 2)
    : (CONFIG.yuji?.blackFlashThreshold || 4);
    
  if (!isZone && this.blackFlashCharge >= thresholdForAudio) {
    if (CONFIG.yuji?.blackFlashEnterSound && !this.soulSwapActive && Math.random() < (CONFIG.yuji?.blackFlashNoiseChance ?? 0.35)) {
      audioSystem.playSFX(
        CONFIG.yuji.blackFlashEnterSound, 
        CONFIG.yuji.blackFlashEnterVolume ?? 1.5,
        1.0, 0, 
        CONFIG.yuji.blackFlashEnterDelay ?? 0
      );
    }
  }

  // Start attack animation (when transformed as Sukuna, use slash swing chop instead of punch)
  if (this.soulSwapActive) {
    this.punchAnimTimer = 0;
    this.slashGlowTimer = 25;
    this.slashSwingTimer = 14;
    this.slashSwingMaxTimer = 14;
    this.slashHand = this.slashHand === 1 ? 0 : 1;
  } else {
    const normalSpeed = this.punchMaxTime || 25;
    const zoneSpeed = CONFIG.yuji?.blackFlashZonePunchSpeed || 16;
    this.punchAnimTimer = isCombo ? 8 : (isZone ? zoneSpeed : normalSpeed);
    this.isRightPunch = !this.isRightPunch;
    this.hideFrontHand = false;
    this.hideBackHand = false;
  }

  // Set attack cooldown (none during combo)
  if (!isCombo) {
    this.cooldownTimer = isZone
      ? (CONFIG.yuji?.blackFlashZonePunchCooldown || 30)
      : (CONFIG.yuji?.basicPunchCooldown || 35);
  }

  // Query all valid targets (fighters & illusions) in the arena
  const allTargets = [];
  if (state && state.fighters) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
      // Exclude teammates
      if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
      allTargets.push(f);
    }
  }
  if (state && state.illusions) {
    for (let ill of state.illusions) {
      if (!ill || ill === this || ill.hp <= 0) continue;
      // Exclude teammate illusions
      if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
      allTargets.push(ill);
    }
  }

  // If a specific custom target is forced (e.g. from combo rush), prioritize it
  let targetsToScan = allTargets;
  if (customTarget && !customTarget.isDead && customTarget.hp > 0) {
    targetsToScan = [customTarget];
  }

  let hitAny = false;
  const punchReach = CONFIG.yuji?.punchRange || 50;
  const maxReach = this.r + punchReach; // base reach plus reach distance
  const arcAngle = Math.PI / 4; // 45 degrees either side (90 degree frontal cone)

  // Determine if this strike is a Black Flash (if charge has reached the threshold or we are in the Black Flash zone)
  const threshold = this.soulSwapActive 
    ? (CONFIG.yuji?.soulSwapBlackFlashThreshold || 2)
    : (CONFIG.yuji?.blackFlashThreshold || 4);
  const isBlackFlash = (this.blackFlashTimer > 0) || (this.blackFlashCharge >= threshold);

  for (const target of targetsToScan) {
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const targetReach = maxReach + target.r;

    if (dist <= targetReach) {
      // Frontal arc angle check
      const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
      let angleDiff = angleToTarget - this.gunAngle;
      
      // Normalize angle difference to [-PI, PI]
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (Math.abs(angleDiff) <= arcAngle) {
        hitAny = true;

        // Calculate stats
        let damage = isCombo 
          ? (CONFIG.yuji?.comboDamage || 12)
          : (CONFIG.yuji?.punchDamage || 18);
        let knockback = CONFIG.yuji?.knockback || 7;

        if (isBlackFlash) {
          damage *= (CONFIG.yuji?.blackFlashMultiplier || 2.5);
          knockback = CONFIG.yuji?.blackFlashKnockback || 20;
        }

        // Apply Soul Swap damage multiplier if active
        if (this.soulSwapActive) {
          damage *= (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
        }

        // Apply damage & knockback
        const didDamage = applyDamageToTarget(target, damage, this);
        
        if (didDamage !== false) {
          target.vx += Math.cos(angleToTarget) * knockback;
          target.vy += Math.sin(angleToTarget) * knockback;
        }

        // Visual effects
        spawnAnimePunchImpactFrame(target.x, target.y, isBlackFlash ? 80 : 55, angleToTarget, 'blackpink');

        if (isBlackFlash) {
          spawnBlackFlash(target.x, target.y);
          if (this.blackFlashTimer <= 0) {
            spawnFloatingText(target.x, target.y - target.r - 25, "BLACK FLASH", "#ff0000");
          }
          const bfAudioCfg = CONFIG.blackFlash?.audio || {};
          const sound = getSkillSound(this.id, 'blackflash');
          const bfVol = bfAudioCfg.volume ?? sound?.volume ?? 1.5;
          const bfElecVol = bfAudioCfg.electricVolume ?? bfVol;
          const bfSrc = bfAudioCfg.src || sound?.src || 'Assets/Sound Effects/Skills/blackflash1.mp3';
          const bfSrc2 = bfAudioCfg.src2 || sound?.src2 || 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3';
          if (bfSrc) audioSystem.playSFX(bfSrc, bfVol);
          if (bfSrc2) audioSystem.playSFX(bfSrc2, bfElecVol);
          if (didDamage !== false) {
            if (typeof target.applySlow === 'function') {
              target.applySlow(
                CONFIG.blackFlash?.debuff?.slowDuration ?? 70,
                CONFIG.blackFlash?.debuff?.slowMultiplier ?? 0.45
              );
            }
            target.blackFlashDebuffTimer = CONFIG.blackFlash?.debuff?.healReductionDuration ?? 270;
          }
        }

        // Queue Divergent Fist delayed shockwave only if attack was not blocked
        if (this.delayedShockwaves && didDamage !== false) {
          let swDamage = CONFIG.yuji?.shockwaveDamage || 10;
          if (this.soulSwapActive) {
            swDamage *= (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
          }
          this.delayedShockwaves.push({
            target: target,
            delay: CONFIG.yuji?.shockwaveDelay || 6,
            damage: swDamage,
            x: target.x,
            y: target.y
          });
        }
      }
    }
  }

  // Sound effects
  if (hitAny) {
    playYujiPunchSound(isBlackFlash || this.soulSwapActive);
    
    // Build Black Flash charge / manage zone
    if (isBlackFlash) {
      this.blackFlashCharge = 0; // Reset build-up charge after trigger
      
      if (this.blackFlashTimer <= 0) {
        // Just entered the zone!
        this.blackFlashTimer = CONFIG.blackFlash?.zone?.duration ?? 300;
        this.blackFlashHitsLeft = CONFIG.yuji?.blackFlashZoneMaxHits || 4;
      } else {
        // Already in the zone, decrement hits left
        this.blackFlashHitsLeft--;
        if (this.blackFlashHitsLeft <= 0) {
          this.blackFlashTimer = 0; // End zone early
          this.blackFlashHitsLeft = 0;
        } else {
          // Refresh the timer
          this.blackFlashTimer = CONFIG.blackFlash?.zone?.duration ?? 300;
        }
      }
    } else {
      this.blackFlashCharge++;
    }
  } else {
    // Punched the air
    playYujiPunchSound(isBlackFlash || this.soulSwapActive);
    // Only reset charge on whiff if we are NOT in the active Black Flash zone
    if (this.blackFlashTimer <= 0 && CONFIG.yuji?.blackFlashResetOnMiss) {
      this.blackFlashCharge = 0; // Reset charge on whiff
    }
  }
}
