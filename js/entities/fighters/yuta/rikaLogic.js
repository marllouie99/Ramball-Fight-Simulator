import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnRikaRoarShockwave } from '../../../graphics/particles/sparkEffect.js';
import { playSound, stopSound, fadeOutSound, fadeOutSoundBySrc } from '../../../systems/soundSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';

export function initRika(fighter) {
  fighter.rika = {
    active: false,
    timer: 0,
    cooldownTimer: 99999, // Disabled timer-based auto-summon (requires 50% HP or Domain Expansion)
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: CONFIG.yuta.rikaRadius || 30,
    target: null,
    attackTimer: 0,       // Overall attack cooldown state
    rightArmTimer: 0,     // Right arm swing timer
    leftArmTimer: 0,      // Left arm swing timer
    lastArmUsed: 'left',  // Track alternating hand swings
    isDying: false,
    deathTimer: 0,
    disappearing: false,
    disappearTimer: 0,
    disappearDuration: 30,
    startX: 0,
    startY: 0,
    maxHp: CONFIG.yuta.rikaMaxHp || 500,
    hp: 0,
    isRika: true,
    owner: fighter,
    hasSummonedAt50Hp: false,
    hitStunTimer: 0,
    timeStopTimer: 0,
    activeTrembleSound: null,
    trembleStopTimer: 0,
    applyHitStun: function(duration) {
      if (duration > this.hitStunTimer) this.hitStunTimer = duration;
    },
    applyTimeStop: function(duration) {
      if (duration > this.timeStopTimer) this.timeStopTimer = duration;
    },
    applyKnockback: function(vx, vy) {
      if (typeof vx === 'number') this.vx = (this.vx || 0) + vx;
      if (typeof vy === 'number') this.vy = (this.vy || 0) + vy;
    },
    applyBurn: function() {},
    applyPoison: function() {},
    applyShock: function() {},
    takeDamage: function(amount, attacker, opts = {}) {
      if (this.disappearing || !this.active || this.hp <= 0) return false;
      this.hp -= amount;
      
      // Floating text
      if (typeof spawnFloatingText === 'function') {
        const text = opts.isCrit ? `CRIT! ${Math.floor(amount)}` : Math.floor(amount);
        const color = opts.isCrit ? '#ff0000' : '#ffffff';
        spawnFloatingText(this.x, this.y - this.r - 10, text, color);
      }
      return true;
    }
  };
}

export function updateRika(fighter, arena) {
  if (!fighter.rika) return;

  const rk = fighter.rika;

  // Handle groundTremble audio timer countdown
  if (rk.trembleStopTimer > 0) {
    rk.trembleStopTimer--;
    if (rk.trembleStopTimer <= 0) {
      if (rk.activeTrembleSound) {
        fadeOutSound(rk.activeTrembleSound, 350);
        rk.activeTrembleSound = null;
      }
      fadeOutSoundBySrc('groundTremble', 350);
    }
  }

  // 50% HP Emergency Summon Trigger: Automatically call Rika for help when Yuta reaches 50% HP or lower
  const hpRatio = fighter.hp / (fighter.maxHp || 200);
  const hpThreshold = CONFIG.yuta?.rikaSummonHpThreshold ?? 0.5;
  if (!rk.active && !rk.hasSummonedAt50Hp && hpRatio <= hpThreshold && !fighter.isDying && fighter.hp > 0) {
    rk.hasSummonedAt50Hp = true;
    const chargeDuration = CONFIG.yuta?.rikaSummonChargeDuration || 80;
    rk.cooldownTimer = chargeDuration;

    // Trigger "Come, Rika!" audio (comerika.mp3) and freeze Yuta's movement
    rk.playedComeRikaSound = true;
    fighter.rikaCallTimer = chargeDuration; // Freeze Yuta's movement and hold Katana pose
    fighter.vx = 0;
    fighter.vy = 0;
    if (typeof spawnFloatingText === 'function') spawnFloatingText(fighter.x, fighter.y - 35, 'COME, RIKA!', '#FF1493');
    if (typeof spawnImpactFlash === 'function') spawnImpactFlash(fighter.x, fighter.y, 45, 'rgba(255, 20, 147, 0.4)');
    if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(3, 8);

    const comeSound = getSkillSound(fighter._def?.id || 'yuta', 'come_rika');
    if (comeSound) playSound(comeSound.src, comeSound.volume, comeSound.speed, comeSound.offset);
    else playSound('Assets/Sound Effects/Skills/comerika.mp3', 2.5);
  }

  if (!rk.active && rk.cooldownTimer > 0) {
    rk.cooldownTimer--;

    if (rk.cooldownTimer <= 0) {
      rk.active = true;
      rk.timer = CONFIG.yuta.rikaDuration || 1000;
      rk.x = fighter.x;
      rk.y = fighter.y;
      rk.hp = rk.maxHp;
      rk.playedComeRikaSound = false;
      rk.playedAriseRoarSound = false;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      rk.spawnTimer = ariseMax; // Paused load/arise duration (180 frames = 3.0 seconds)
      rk.spawnScale = 0.05;

      if (typeof state !== 'undefined') {
        if (!state.illusions) state.illusions = [];
        if (!state.illusions.includes(rk)) {
          state.illusions.push(rk);
        }
      }
    }
  }

  // Handle Rika Manifestation Duration
  if (rk.active) {
    // Dynamic Size Expansion on Summon (grows from 0.05 with a dramatic pause moment midway through rise)
    if (rk.spawnTimer > 0) {
      rk.spawnTimer--;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = 1 - (rk.spawnTimer / ariseMax);

      // Dramatic Pause Moment:
      // 0.0 -> 0.35: Surge up out of ground
      // 0.35 -> 0.65: PAUSE MOMENT! Holds position as energy surges & roar echoes
      // 0.65 -> 1.0: Elastic burst forward into combat stance
      let effectiveProgress = progress;
      if (progress >= 0.35 && progress <= 0.65) {
        const t = (progress - 0.35) / 0.30;
        effectiveProgress = 0.35 + (t * 0.05); // Holds scale/position during dramatic pause
      } else if (progress > 0.65) {
        const t = (progress - 0.65) / 0.35;
        effectiveProgress = 0.40 + (t * 0.60);
      }

      const easeOutBack = 1 + 2.70158 * Math.pow(effectiveProgress - 1, 3) + 1.70158 * Math.pow(effectiveProgress - 1, 2);
      rk.spawnScale = Math.max(0.05, Math.min(1.12, easeOutBack));

      // Continuous screen rumble as she arises into physical reality
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeIntensity = 2 + progress * 4;
        triggerGlobalScreenShake(shakeIntensity, 4);
      }

      // Play Rika arise audio (rikaAppearance1.mp3 & groundTremble.mp3) as she arises into physical reality!
      if (!rk.playedAriseRoarSound) {
        rk.playedAriseRoarSound = true;
        const appearSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_appearance');
        playSound(appearSound?.src || 'Assets/Sound Effects/Skills/rikaAppearance1.mp3', 1.5);

        const trembleSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_ground_tremble') || getSkillEffectSound('yuta', 'groundtremble');
        rk.activeTrembleSound = playSound(trembleSound?.src || 'Assets/Sound Effects/SkillEffects/groundTremble.mp3', trembleSound?.volume ?? 1.8, trembleSound?.speed ?? 1.0);
      }

      if (rk.spawnTimer % 3 === 0) {
        spawnSparks(rk.x + (Math.random() - 0.5) * 40 * rk.spawnScale, rk.y + (Math.random() - 0.5) * 40 * rk.spawnScale, 3, 'rikaCurse');
      }

      // Periodically blast roaring shockwaves as she arises
      if (rk.spawnTimer % 12 === 0 && typeof spawnRikaRoarShockwave === 'function') {
        spawnRikaRoarShockwave(rk.x, rk.y, 100 + progress * 140);
      }

      // Heavy shockwave impact shake and triple shockwave explosion on exact frame of full emergence
      if (rk.spawnTimer === 1) {
        if (rk.activeTrembleSound) {
          fadeOutSound(rk.activeTrembleSound, 350);
          rk.activeTrembleSound = null;
        }
        fadeOutSoundBySrc('groundTremble', 350);
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(14, 20);
        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 120, 'rgba(255, 20, 147, 0.8)');
        if (typeof spawnRikaRoarShockwave === 'function') {
          spawnRikaRoarShockwave(rk.x, rk.y, 180);
          spawnRikaRoarShockwave(rk.x, rk.y, 250);
          spawnRikaRoarShockwave(rk.x, rk.y, 320);
        }

        // Spawn a burst of 30 hot pink cursed sparks
        if (typeof spawnSparks === 'function') {
          for (let i = 0; i < 30; i++) {
            spawnSparks(rk.x, rk.y, 1, 'rikaCurse');
          }
        }
        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(rk.x, rk.y - 45, 'FULL EMERGENCE!', '#FF1493');
        }

        // --- Emergence Blast Damage & Radial Knockback (#1) ---
        if (typeof state !== 'undefined' && state.fighters) {
          const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
          const emergenceRadius = CONFIG.yuta?.rikaEmergenceRadius || 250;
          const emergenceDamage = CONFIG.yuta?.rikaEmergenceDamage || 25;
          const emergenceKnockback = CONFIG.yuta?.rikaEmergenceKnockback || 8;
          const emergenceHitStun = CONFIG.yuta?.rikaEmergenceHitStun || 15;

          state.fighters.forEach((enemy, idx) => {
            if (enemy && enemy !== fighter && enemy.hp > 0) {
              const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
              if (isEnemy) {
                const dx = enemy.x - rk.x;
                const dy = enemy.y - rk.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist <= emergenceRadius) {
                  enemy.takeDamage(emergenceDamage, fighter, { isPhysical: true });
                  if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(emergenceHitStun);
                  enemy.vx += (dx / dist) * emergenceKnockback;
                  enemy.vy += (dy / dist) * emergenceKnockback;
                  if (typeof spawnFloatingText === 'function') spawnFloatingText(enemy.x, enemy.y - 30, 'EMERGENCE BLAST!', '#FF1493');
                }
              }
            }
          });
        }
      }
    } else if (!rk.disappearing && !rk.isDying) {
      rk.spawnScale = 1.0;
    }

    if (rk.isDying) {
      rk.deathTimer--;
      rk.vx = 0;
      rk.vy = 0;
      
      // Death animation visuals (continuous sparks leaking)
      if (rk.deathTimer % 4 === 0) {
        spawnSparks(rk.x + (Math.random() - 0.5) * 30, rk.y + (Math.random() - 0.5) * 30, 2, 'rikaCurse');
      }

      if (rk.deathTimer <= 0) {
        // --- Vengeful Death Dispersion Damage & Knockback (#8) ---
        if (typeof state !== 'undefined' && state.fighters) {
          const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
          const dispersionRadius = CONFIG.yuta?.rikaDeathExplosionRadius || 280;
          const dispersionDamage = CONFIG.yuta?.rikaDeathExplosionDamage || 35;
          const dispersionKnockback = CONFIG.yuta?.rikaDeathExplosionKnockback || 10;
          const dispersionHitStun = CONFIG.yuta?.rikaDeathExplosionHitStun || 20;

          state.fighters.forEach((enemy, idx) => {
            if (enemy && enemy !== fighter && enemy.hp > 0) {
              const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
              if (isEnemy) {
                const dx = enemy.x - rk.x;
                const dy = enemy.y - rk.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist <= dispersionRadius) {
                  enemy.takeDamage(dispersionDamage, fighter, { isPhysical: true, isExplosion: true });
                  if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(dispersionHitStun);
                  enemy.vx += (dx / dist) * dispersionKnockback;
                  enemy.vy += (dy / dist) * dispersionKnockback;
                  if (typeof spawnFloatingText === 'function') spawnFloatingText(enemy.x, enemy.y - 30, 'CURSED DISPERSION!', '#FF0055');
                }
              }
            }
          });
        }

        // Final explosive scatter
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(12, 20);
        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 50, 'dark');
        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 30, 'crimsonSniper');
        if (typeof spawnRikaRoarShockwave === 'function') spawnRikaRoarShockwave(rk.x, rk.y, 280);
        
        for (let i = 0; i < 40; i++) {
          spawnSparks(rk.x, rk.y, 1, 'rikaCurse');
          spawnSparks(rk.x, rk.y, 1, 'blood'); 
        }
        
        if (typeof spawnFloatingText === 'function') spawnFloatingText(rk.x, rk.y - 20, 'DISPELLED!', '#ff1a1a');

        if (rk.activeTrembleSound) {
          fadeOutSound(rk.activeTrembleSound, 300);
          rk.activeTrembleSound = null;
        }
        fadeOutSoundBySrc('groundTremble', 300);

        rk.active = false;
        rk.isDying = false;
        rk.disappearing = false;
        rk.cooldownTimer = CONFIG.yuta.rikaCooldown;
        rk.r = CONFIG.yuta.rikaRadius || 30;

        if (fighter.domainActive) {
          rk.killedInDomain = true;
        }
      }
      return; // Skip normal update logic while dying
    }

    if (rk.disappearing) {
      rk.disappearTimer--;
      
      const t = 1 - (rk.disappearTimer / rk.disappearDuration);
      rk.x = rk.startX + (fighter.x - rk.startX) * t;
      rk.y = rk.startY + (fighter.y - rk.startY) * t;
      
      const baseR = CONFIG.yuta.rikaRadius || 30;
      rk.r = baseR * (1 - t);
      rk.spawnScale = 1 - t;
      
      // Spawn particles along the way
      if (Math.random() < 0.4) {
        spawnSparks(rk.x, rk.y, 2, 'rikaCurse');
      }
      
      if (rk.disappearTimer <= 0) {
        spawnSparks(rk.x, rk.y, 12, 'rikaCurse');
        rk.active = false;
        rk.disappearing = false;
        rk.cooldownTimer = CONFIG.yuta.rikaCooldown;
        rk.r = baseR; // Reset radius for next summon
        rk.spawnScale = 0.05;
      }
    } else {
      rk.timer--;
      
      // Handle death by HP or timer expiration
      if ((rk.timer <= 0 && !fighter.domainActive) || rk.hp <= 0) {
        // Remove from global target arrays so AI instantly stops attacking her
        if (state.illusions) {
          const idx = state.illusions.indexOf(rk);
          if (idx >= 0) state.illusions.splice(idx, 1);
        }

        if (rk.hp <= 0) {
          // ENTER DYING STATE
          rk.isDying = true;
          rk.deathTimer = 90; // 1.5 seconds of dying animation before explosion
        } else {
          // GRACEFUL SHRINK (Timer Expiration)
          rk.disappearing = true;
          rk.disappearDuration = 30; // 30 frames
          rk.disappearTimer = 30;
          rk.startX = rk.x;
          rk.startY = rk.y;
        }
      }
    }
  }

  if (!fighter.domainActive && !fighter.isChannelingDomain) {
    rk.killedInDomain = false;
  }

  // If domain is active or being channeled, Rika is forced active unless she was killed during it
  if ((fighter.domainActive || fighter.isChannelingDomain) && !rk.killedInDomain) {
    if (!rk.active) {
      rk.active = true;
      rk.x = fighter.x;
      rk.y = fighter.y;
      rk.hp = rk.maxHp; // Reset HP upon manifestation
      rk.playedComeRikaSound = false;
      rk.playedAriseRoarSound = false;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      rk.spawnTimer = ariseMax;
      rk.spawnScale = 0.05;
      
      // Play Rika Appearance sound (rikaAppearance.mp3) when Rika manifests!
      const appearSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_appearance');
      if (appearSound) playSound(appearSound.src, appearSound.volume);

      // Add her to the global targeting pool so AI and projectiles lock onto her
      if (typeof state !== 'undefined') {
        if (!state.illusions) state.illusions = [];
        if (!state.illusions.includes(rk)) {
          state.illusions.push(rk);
        }
      }
    }
    rk.disappearing = false;
    const baseR = CONFIG.yuta.rikaRadius || 30;
    rk.r = baseR;
    rk.timer = 100; // Keep her timer up so she doesn't despawn immediately after domain
  }

  if (!rk.active) return;
  if (rk.isDying || rk.disappearing) return;

  // Freeze Rika in place for a moment while she is loading/arising (during spawnTimer)
  if (rk.spawnTimer > 0) {
    rk.vx = 0;
    rk.vy = 0;
    return; // Don't move or attack until she has fully arisen!
  }

  // Handle paralysis / time stop (Gojo's Domain Expansion / Unlimited Void)
  if (rk.timeStopTimer > 0) {
    rk.timeStopTimer--;
    rk.vx = 0;
    rk.vy = 0;
    return; // Completely frozen!
  }
  if (rk.hitStunTimer > 0) {
    rk.hitStunTimer--;
    rk.vx = 0;
    rk.vy = 0;
    return; // Stunned!
  }

  // Find target for Rika
  findRikaTarget(fighter, rk);

  // Move Rika — ball-like movement: always moving, bounces off walls
  const speed = fighter.baseSpeed * (CONFIG.yuta.rikaSpeedMultiplier || 1.3);

  // Ensure Rika always has velocity (initialize if spawning or stationary)
  const currentSpeed = Math.hypot(rk.vx, rk.vy);
  if (currentSpeed < 0.1) {
    // Give her an initial velocity toward her target or a random direction
    if (rk.target) {
      const dx = rk.target.x - rk.x;
      const dy = rk.target.y - rk.y;
      const d = Math.hypot(dx, dy) || 1;
      rk.vx = (dx / d) * speed;
      rk.vy = (dy / d) * speed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      rk.vx = Math.cos(angle) * speed;
      rk.vy = Math.sin(angle) * speed;
    }
  }

  // Steer toward target (gradual heading adjustment, not instant)
  if (rk.target) {
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const dist = Math.hypot(dx, dy);

    // Steer: blend current heading toward target direction
    const steerStrength = rk.target.isStealthed ? (CONFIG.toji?.stealthTurnRate || 0.035) * 0.5 : 0.08; // How aggressively she turns
    rk.vx += (dx / (dist || 1)) * speed * steerStrength;
    rk.vy += (dy / (dist || 1)) * speed * steerStrength;

    // Melee attack when in range (but don't stop!)
    if (dist <= rk.r + rk.target.r + 5 && rk.attackTimer <= 0) {
      rk.target.takeDamage(CONFIG.yuta.rikaDamage, fighter, { isPhysical: true });

      const pushAngle = Math.atan2(dy, dx);
      const knockbackForce = CONFIG.yuta?.rikaHitKnockback || 16;
      const recoilForce = CONFIG.yuta?.rikaHitRecoil || 6;
      const hitStunDuration = CONFIG.yuta?.rikaHitStun || 12;

      // 1. Target Physical Smash Bounce Impulse (blasts enemy away with heavy momentum)
      const smashVx = Math.cos(pushAngle) * knockbackForce;
      const smashVy = Math.sin(pushAngle) * knockbackForce;
      rk.target.vx = (rk.target.vx || 0) + smashVx;
      rk.target.vy = (rk.target.vy || 0) + smashVy;

      if (typeof rk.target.applyKnockback === 'function') {
        rk.target.applyKnockback(smashVx * 0.5, smashVy * 0.5);
      }
      if (typeof rk.target.applyHitStun === 'function') {
        rk.target.applyHitStun(hitStunDuration);
      }

      // 2. Rika Equal-and-Opposite Physical Recoil (Rika bounces back off target on impact)
      rk.vx = -Math.cos(pushAngle) * recoilForce;
      rk.vy = -Math.sin(pushAngle) * recoilForce;

      // 3. Heavy Impact Screen Shake, Flash & Sparks
      if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(8, 10);
      if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.target.x, rk.target.y, 50, 'rgba(255, 20, 147, 0.7)');
      if (typeof spawnSparks === 'function') spawnSparks(rk.target.x, rk.target.y, 8, 'rikaCurse');

      rk.attackTimer = CONFIG.yuta.rikaAttackRate || 40;

      // Play physical claw impact sound (backstab.mp3) and groundSmash.mp3 on Rika attack
      const attackSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_attack');
      const volume = CONFIG.yuta?.audio?.rikaAttackVolume ?? attackSound?.volume ?? 0.8;
      playSound(attackSound?.src || 'Assets/Sound Effects/Skills/backstab.mp3', volume);

      const smashSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_ground_smash') || getSkillEffectSound('yuta', 'groundsmash');
      playSound(smashSound?.src || 'Assets/Sound Effects/Attacks/groundSmash.mp3', smashSound?.volume ?? 1.2, smashSound?.speed ?? 1.0);

      // Play random demonic Rika attack noise (rikanoise1.mp3, rikanoise2.mp3, rikanoise3.mp3) only after previous roar audio completes!
      const isRoarActive = rk.activeRoarSound && typeof rk.activeRoarSound.isPlaying === 'function' && rk.activeRoarSound.isPlaying();
      if (!isRoarActive && (rk.noiseTimer || 0) <= 0) {
        const noiseList = getSkillSound(fighter._def?.id || 'yuta', 'rika_attack_noises') || [
          { src: 'Assets/Sound Effects/Attacks/rikanoise1.mp3', volume: 1.5 },
          { src: 'Assets/Sound Effects/Attacks/rikanoise2.mp3', volume: 1.5 },
          { src: 'Assets/Sound Effects/Attacks/rikanoise3.mp3', volume: 1.5 }
        ];
        if (Array.isArray(noiseList) && noiseList.length > 0) {
          const randomNoise = noiseList[Math.floor(Math.random() * noiseList.length)];
          if (randomNoise && randomNoise.src) {
            const vol = CONFIG.yuta?.audio?.rikaNoiseVolume ?? randomNoise.volume ?? 1.5;
            rk.activeRoarSound = playSound(randomNoise.src, vol);

            const trembleSound = getSkillSound(fighter._def?.id || 'yuta', 'rika_ground_tremble') || getSkillEffectSound('yuta', 'groundtremble');
            if (rk.activeTrembleSound) {
              stopSound(rk.activeTrembleSound);
            }
            rk.activeTrembleSound = playSound(trembleSound?.src || 'Assets/Sound Effects/SkillEffects/groundTremble.mp3', trembleSound?.volume ?? 1.2, trembleSound?.speed ?? 1.0);
            rk.trembleStopTimer = 35;

            rk.noiseTimer = 10;
            if (typeof spawnRikaRoarShockwave === 'function') {
              spawnRikaRoarShockwave(rk.x, rk.y, 160);
            }
          }
        }
      }

      // Alternate arms for fluid rapid dual-hand claw slashing!
      if (rk.lastArmUsed === 'right') {
        rk.leftArmTimer = 60;
        rk.lastArmUsed = 'left';
      } else {
        rk.rightArmTimer = 60;
        rk.lastArmUsed = 'right';
      }
    }
  } else {
    // No target — steer back toward Yuta
    const dx = fighter.x - rk.x;
    const dy = fighter.y - rk.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 60) {
      const steerStrength = 0.08;
      rk.vx += (dx / (dist || 1)) * speed * steerStrength;
      rk.vy += (dy / (dist || 1)) * speed * steerStrength;
    }
  }

  // Normalize to constant speed
  const spd = Math.hypot(rk.vx, rk.vy);
  if (spd > 0) {
    rk.vx = (rk.vx / spd) * speed;
    rk.vy = (rk.vy / spd) * speed;
  }

  // Apply velocity
  rk.x += rk.vx;
  rk.y += rk.vy;

  if (rk.attackTimer > 0) {
    rk.attackTimer--;
  }

  if (rk.noiseTimer > 0) {
    rk.noiseTimer--;
  }
  
  if (rk.rightArmTimer > 0) {
    rk.rightArmTimer--;
  }
  
  if (rk.leftArmTimer > 0) {
    rk.leftArmTimer--;
  }

  // Wall bounce — same as arena fighters / illusions
  let bounced = false;

  if (rk.x < arena.x + rk.r) {
    rk.x = arena.x + rk.r;
    rk.vx = Math.abs(rk.vx);
    bounced = true;
  } else if (rk.x > arena.x + arena.width - rk.r) {
    rk.x = arena.x + arena.width - rk.r;
    rk.vx = -Math.abs(rk.vx);
    bounced = true;
  }

  if (rk.y < arena.y + rk.r) {
    rk.y = arena.y + rk.r;
    rk.vy = Math.abs(rk.vy);
    bounced = true;
  } else if (rk.y > arena.y + arena.height - rk.r) {
    rk.y = arena.y + arena.height - rk.r;
    rk.vy = -Math.abs(rk.vy);
    bounced = true;
  }

  // On bounce — re-lock toward target (like illusions do)
  if (bounced && rk.target) {
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const d = Math.hypot(dx, dy) || 1;
    rk.vx = (dx / d) * speed;
    rk.vy = (dy / d) * speed;
  }
}

function findRikaTarget(fighter, rk) {
  let closestDist = Infinity;
  let closestTarget = null;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  for (let i = 0; i < state.fighters.length; i++) {
    const enemy = state.fighters[i];
    if (!enemy || enemy.hp <= 0 || enemy === fighter || enemy.invincibilityTimer > 0 || enemy.isStealthed) continue;
    
    const enemyTeam = state.getFighterTeam(i);
    if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

    const dist = Math.hypot(enemy.x - rk.x, enemy.y - rk.y);
    if (dist < closestDist && dist < 400) { // Rika aggro range
      closestDist = dist;
      closestTarget = enemy;
    }
  }
  
  rk.target = closestTarget;
}
