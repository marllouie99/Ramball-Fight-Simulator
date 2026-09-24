// ─────────────────────────────────────────────
// Zenitsu Agatsuma — Entity & Combat Engine
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee Swings)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #F59E0B)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { zenitsuConfig } from '../../configs/characters/zenitsuConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawZenitsuSkin, isZenitsuThunderclapBurst, _getThunderclapBurst } from '../../graphics/fighters/zenitsuSkin.js';
import { spawnSparks, spawnImpactFlash, spawnParrySparksEffect, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';

export class ZenitsuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'zenitsu';
    this.type = 'zenitsu';
    this.color = '#F59E0B'; // Lightning Gold
    this.themeColor = '#F59E0B';
    this.secondaryColor = '#FBBF24'; // Electric Amber

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 310) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.iaiComboCount = 0;
    this.inBattleTrance = false;
    this._intermediateDashSounds = [];

    // Skill 1: Thunderclap and Flash (Hekireki Issen)
    this.thunderclapCooldownMax = cfg.thunderclapCooldown || 228;
    this.thunderclapCooldown = 0; // Ready immediately on combat start
    this.thunderclapChannelDuration = cfg.thunderclapChannelDuration || 36;
    this.thunderclapChannelTimer = 0;
    this.isChannelingThunderclap = false;
    this.thunderclapTarget = null;
    this.skillCastAngle = 0;
    this.isThunderclapAimLocked = false;
    this.thunderclapLockedDistance = 260;
    this._lastThunderclapBurstId = null;
    this._channelVoiceIdx = 0;
    this._hasPlayedFirstFormVoice = false;
    this._hasPlayedThunderclapVoice = false;
    this._hasPlayedSixfoldVoice = false;
    this._thunderclapVoiceDelayTimer = 0;

    // Active Consecutive Lightning Dash Travel State (4 Consecutive Godspeed Dashes)
    this.isDashingThunderclap = false;
    this.thunderclapDashIndex = 0;
    this.thunderclapTotalDashes = cfg.thunderclapDashCount || 4;
    this.thunderclapDashStep = 0;
    this.thunderclapDashDuration = cfg.thunderclapDashDuration || 5;
    this.thunderclapDashPauseTimer = 0;
    this.thunderclapDashStartX = 0;
    this.thunderclapDashStartY = 0;
    this.thunderclapDashDestX = 0;
    this.thunderclapDashDestY = 0;
    this.thunderclapDashAngle = 0;
    this.thunderclapDashDist = 0;
    this.thunderclapDashTarget = null;
    this.thunderclapDashVFXList = [];

    // Skill 2: Thunderclap and Flash: Sixfold (Rokuren)
    this.rokurenCooldownMax = cfg.rokurenCooldown || 420;
    this.rokurenCooldown = this.rokurenCooldownMax;

    // Ultimate: Flaming Thunder God (Honoikazuchi no Kami)
    this.flamingGodCooldownMax = cfg.ultimateCooldown || 1440;
    this.flamingGodCooldown = this.flamingGodCooldownMax;

    // Declarative Skill Registration
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableThunderclap, true)) {
      skills.push({
        id: 'thunderclap_and_flash',
        name: 'Thunderclap and Flash',
        type: 'active',
        cooldownKey: 'thunderclapCooldown',
        cooldownMaxKey: 'thunderclapCooldownMax',
        channelingKey: 'isChannelingThunderclap',
        channelTimerKey: 'thunderclapChannelTimer'
      });
    }

    if (this.isSkillEnabled(cfg.enableRokuren, false)) {
      skills.push({
        id: 'thunderclap_sixfold',
        name: 'Sixfold (Rokuren)',
        type: 'active',
        cooldownKey: 'rokurenCooldown',
        cooldownMaxKey: 'rokurenCooldownMax'
      });
    }

    if (this.isSkillEnabled(cfg.enableFlamingThunderGod, false)) {
      skills.push({
        id: 'flaming_thunder_god',
        name: 'Flaming Thunder God',
        type: 'ultimate',
        cooldownKey: 'flamingGodCooldown',
        cooldownMaxKey: 'flamingGodCooldownMax'
      });
    }

    this.skillManager.registerSkills(skills);
  }

  takeDamage(amount, attacker, opts = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const rawDamage = typeof amount === 'number' ? amount : (amount?.damage || 0);
    const hpRatio = (this.hp - rawDamage) / (this.maxHp || 310);
    let finalAmount = amount;

    // Passive 1: Battle Trance (25% damage reduction below 35% HP)
    if (this.isSkillEnabled(cfg.enableBattleTrance, true) && hpRatio <= (cfg.tranceHpThreshold || 0.35)) {
      if (!this.inBattleTrance) {
        this.inBattleTrance = true;
        spawnFloatingText(this.x, this.y - 35, 'BATTLE TRANCE AWAKENED!', '#F59E0B');
        spawnImpactFlash(this.x, this.y, '#FBBF24', 30);
      }
      const dr = cfg.tranceDamageReduction || 0.25;
      finalAmount = typeof amount === 'number' ? amount * (1 - dr) : { ...amount, damage: rawDamage * (1 - dr) };
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  shoot(ownerIndex) {
    if (this.isChannelingThunderclap || this.thunderclapChannelTimer > 0 || this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return false;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    if (!this.isSkillEnabled(cfg.enableBasicAttack, true)) return false;
    const target = this.getNearestTarget();
    if (!target) return false;
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (dist <= (cfg.katanaReach || 78) + (target.r || 25) && this.slashSwingTimer <= 0) {
      this._executeThunderIaiCombo(target);
      return true;
    }
    return false;
  }

  canAim() {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) {
      return false;
    }
    if (this.isChannelingThunderclap) {
      const halfTime = Math.floor((this.thunderclapChannelDuration || 36) / 2);
      // Once locked into Frame 2 (Charge phase), disable auto-aim so he commits strictly to 1 direction
      if (this.isThunderclapAimLocked || this.thunderclapChannelTimer <= halfTime) {
        return false;
      }
    }
    return super.canAim ? super.canAim() : true;
  }

  get channelTurnRate() {
    return 0.065; // Smooth rotational auto-aim tracking during preparation phase
  }

  isChannelingSkill() {
    return Boolean(this.isChannelingThunderclap || this.thunderclapChannelTimer > 0);
  }

  isStationarySkillActive() {
    return Boolean(this.isChannelingThunderclap || this.thunderclapChannelTimer > 0 || this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0);
  }

  _updateDashVFX() {
    if (this.thunderclapDashVFX) {
      this.thunderclapDashVFX.timer++;
      if (this.thunderclapDashVFX.timer >= this.thunderclapDashVFX.maxTimer) {
        this.thunderclapDashVFX = null;
      }
    }
    if (Array.isArray(this.thunderclapDashVFXList)) {
      for (let i = this.thunderclapDashVFXList.length - 1; i >= 0; i--) {
        const vfx = this.thunderclapDashVFXList[i];
        if (vfx) {
          vfx.timer++;
          if (vfx.timer >= vfx.maxTimer) {
            this.thunderclapDashVFXList.splice(i, 1);
          }
        }
      }
    }
  }

  _handleTimeStop() {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) {
      // Dashing state: Unstoppable godspeed motion immune to all CC and movement-stopping effects
      this.timeStopTimer = 0;
      this.paralyzeTimer = 0;
      this.hitStunTimer = 0;
      this.slowTimer = 0;
      this.freezeTimer = 0;
      this.electricStunTimer = 0;
      this.isCaughtInTelekinesis = false;
      this.isWallSlammed = false;
      this.isWallPinned = false;
      this.isGrabbedByMahoraga = false;
      if (this.statusEffects) {
        this.statusEffects.timeStopTimer = 0;
        this.statusEffects.paralyzeTimer = 0;
        this.statusEffects.hitStunTimer = 0;
        this.statusEffects.slowTimer = 0;
      }
      return false;
    }
    return super._handleTimeStop();
  }

  applyHitStun(frames, opts = {}) {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return;
    super.applyHitStun(frames, opts);
  }

  applyParalyze(frames, opts = {}) {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return;
    super.applyParalyze(frames, opts);
  }

  applySlow(frames, mult, opts = {}) {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return;
    super.applySlow(frames, mult, opts);
  }

  applyTimeStop(duration, opts = {}) {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return;
    super.applyTimeStop(duration, opts);
  }

  applyKnockback(vx, vy, isMelee = false, isProjectile = false, attacker = null) {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return;
    super.applyKnockback(vx, vy, isMelee, isProjectile, attacker);
  }

  isCaughtInBeam() {
    if (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0) return false;
    return super.isCaughtInBeam ? super.isCaughtInBeam() : false;
  }

  _playIntermediateDashSound(src, volume = 1.0, speed = 1.0) {
    if (!src) return null;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      const handle = audioSystem.playSFX(src, volume, speed);
      if (handle) {
        if (!Array.isArray(this._intermediateDashSounds)) {
          this._intermediateDashSounds = [];
        }
        this._intermediateDashSounds.push(handle);
      }
      return handle;
    }
    return null;
  }

  _fadeOutIntermediateDashAudio(fadeMs = 100) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const fadeDuration = cfg?.dashAudioFadeOutMs !== undefined ? cfg.dashAudioFadeOutMs : fadeMs;

    if (Array.isArray(this._intermediateDashSounds)) {
      for (const handle of this._intermediateDashSounds) {
        if (handle) {
          fadeOutSound(handle, fadeDuration);
        }
      }
      this._intermediateDashSounds = [];
    }

    fadeOutSoundBySrc('Zenitsu-dash-noise', fadeDuration);
    fadeOutSoundBySrc('Zenitsu-Dash-SFX', fadeDuration);
  }

  _fadeOutAllDashAudio(fadeMs = 80) {
    this._fadeOutIntermediateDashAudio(fadeMs);
    fadeOutSoundBySrc('Zenitsu-dash2', fadeMs);
    fadeOutSoundBySrc('Zenitsu-Dash-SFX', fadeMs);
    fadeOutSoundBySrc('Zenitsu-dash-noise', fadeMs);
  }

  interruptAttacks(forceCancelAll = false) {
    if (!forceCancelAll && (this.isDashingThunderclap || this.thunderclapDashPauseTimer > 0)) {
      return; // Dashing state is unstoppable; transient hit interrupts do not break consecutive dashes
    }
    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks(forceCancelAll);
    }
    this.isChannelingThunderclap = false;
    this.isThunderclapAimLocked = false;
    this.thunderclapChannelTimer = 0;
    this.thunderclapTarget = null;
    this._lastThunderclapBurstId = null;
    this._hasPlayedFirstFormVoice = false;
    this._hasPlayedThunderclapVoice = false;
    this._hasPlayedSixfoldVoice = false;
    this._thunderclapVoiceDelayTimer = 0;
    this.isDashingThunderclap = false;
    this.thunderclapDashIndex = 0;
    this.thunderclapDashPauseTimer = 0;
    if (forceCancelAll) {
      this._fadeOutAllDashAudio(80);
      this.thunderclapDashVFX = null;
      this.thunderclapDashVFXList = [];
    }
  }

  update(opponent, ownerIndex, arena) {
    // 1. Rule 1 Freeze / TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || (this.isTargetOfAmbush && !this.isDashingThunderclap && this.thunderclapDashPauseTimer <= 0)) {
      this.interruptAttacks();
      return;
    }

    // Always tick dash VFX timer so air linger and disappearance fadeout never freeze during channeling
    this._updateDashVFX();

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const target = this.getNearestTarget(opponent);

    // Pause / Windup between consecutive dashes
    if (this.thunderclapDashPauseTimer > 0) {
      this.thunderclapDashPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      if (Math.random() < 0.6) {
        spawnSparks(this.x, this.y, 1, 'cyan', '#38BDF8');
      }
      if (this.thunderclapDashPauseTimer <= 0) {
        this.thunderclapDashIndex++;
        this._startThunderclapDashStep(this.thunderclapDashTarget, this.thunderclapDashIndex);
      }
      return;
    }

    // Active Consecutive Lightning Dash Travel (Hekireki Issen: Consecutive Godspeed Dashes)
    if (this.isDashingThunderclap) {
      this.thunderclapDashStep++;
      const travelT = Math.min(1.0, this.thunderclapDashStep / this.thunderclapDashDuration);
      const easeT = travelT * (2 - travelT); // Quadratic ease-out godspeed burst
      this.x = this.thunderclapDashStartX + (this.thunderclapDashDestX - this.thunderclapDashStartX) * easeT;
      this.y = this.thunderclapDashStartY + (this.thunderclapDashDestY - this.thunderclapDashStartY) * easeT;
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = this.thunderclapDashAngle;
      this.angle = this.thunderclapDashAngle;

      spawnSparks(this.x, this.y, 2, 'cyan', '#38BDF8');

      if (this.thunderclapDashStep >= this.thunderclapDashDuration) {
        this.x = this.thunderclapDashDestX;
        this.y = this.thunderclapDashDestY;

        // Current dash finished travel -> lock head anchor at destination
        if (this.thunderclapDashVFX) {
          this.thunderclapDashVFX.isCurrentDash = false;
        }

        const isFinisher = (this.thunderclapDashIndex >= this.thunderclapTotalDashes - 1);
        spawnSparks(this.x, this.y, isFinisher ? 14 : 6, 'cyan', '#38BDF8');
        spawnImpactFlash(this.x, this.y, '#38BDF8', isFinisher ? 25 : 12);
        this._finalizeThunderclapDashStep(
          this.thunderclapDashTarget,
          this.thunderclapDashStartX,
          this.thunderclapDashStartY,
          this.thunderclapDashDestX,
          this.thunderclapDashDestY,
          this.thunderclapDashAngle,
          this.thunderclapDashIndex,
          isFinisher
        );

        if (!isFinisher) {
          const pauseFrames = cfg.thunderclapDashPauseFrames !== undefined ? cfg.thunderclapDashPauseFrames : 2;
          if (pauseFrames > 0) {
            this.isDashingThunderclap = false;
            this.thunderclapDashPauseTimer = pauseFrames;
          } else {
            // Chain into next consecutive dash immediately!
            this.thunderclapDashIndex++;
            this._startThunderclapDashStep(this.thunderclapDashTarget, this.thunderclapDashIndex);
          }
        } else {
          // All consecutive dashes completed!
          this.isDashingThunderclap = false;
          this.thunderclapDashIndex = 0;
          this.thunderclapDashPauseTimer = 0;
          const dashSpeed = (this.speed || 6.4) * 1.5;
          this.vx = Math.cos(this.thunderclapDashAngle) * dashSpeed;
          this.vy = Math.sin(this.thunderclapDashAngle) * dashSpeed;
          this.thunderclapCooldown = this.thunderclapCooldownMax;
        }
      }
      return;
    }

    // Skill 1 Channeling Update (Frames 1-2 Stance & Charge Build-Up)
    if (this.isChannelingThunderclap && this.thunderclapChannelTimer > 0) {
      this.thunderclapChannelTimer--;
      this.vx = 0;
      this.vy = 0;

      const halfTime = Math.floor((this.thunderclapChannelDuration || 36) / 2);

      // Phase 1: Preparation (Timer > halfTime) -> Auto-Aim Enabled & Smoothly Tracking Opponent
      if (this.thunderclapChannelTimer > halfTime) {
        const aimTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
          ? this.thunderclapTarget
          : target;
        if (aimTarget) {
          this.aim(aimTarget);
        }
        this.skillCastAngle = this.gunAngle;
      } else {
        // Phase 2: Lock-in to 1 Direction (Timer <= halfTime) -> Commit strictly, NO direction change
        if (!this.isThunderclapAimLocked) {
          this.isThunderclapAimLocked = true;
          const lockedTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
            ? this.thunderclapTarget
            : target;
          if (lockedTarget) {
            const dist = Math.hypot(lockedTarget.x - this.x, lockedTarget.y - this.y);
            this.thunderclapLockedDistance = Math.min(480, Math.max(160, dist + (lockedTarget.r || 25) + 35));
          } else {
            this.thunderclapLockedDistance = 260;
          }

          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            const lockSfx = cfg.sounds?.lockIn || 'Assets/Sound Effects/Skills/parry.mp3';
            const lockVol = cfg.soundVolumes?.lockIn !== undefined ? cfg.soundVolumes.lockIn : 0.35;
            audioSystem.playSFX(lockSfx, lockVol);
          }
        }

        // Strictly clamp to committed lock angle: NO snapping, NO turning
        this.gunAngle = this.skillCastAngle;
        this.angle = this.skillCastAngle;
      }

      // Energy particles around feet/haori & electric noise audio on PNG flicker bursts
      const totalChannel = this.thunderclapChannelDuration || 100;
      const elapsedChannel = totalChannel - this.thunderclapChannelTimer;
      const burst = _getThunderclapBurst ? _getThunderclapBurst(totalChannel, elapsedChannel) : null;

      if (burst) {
        if (this._lastThunderclapBurstId !== burst.burstId) {
          this._lastThunderclapBurstId = burst.burstId;

          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            const noises = cfg.sounds?.electricNoises || [
              cfg.sounds?.electricNoise1 || 'Assets/Sound Effects/Skills/Zenitsu-electric-noise1.mp3',
              cfg.sounds?.electricNoise2 || 'Assets/Sound Effects/Skills/Zenitsu-electric-noise2.mp3',
              cfg.sounds?.electricNoise3 || 'Assets/Sound Effects/Skills/Zenitsu-electric-noise3.mp3'
            ];
            const soundIndex = Math.max(0, Math.min(noises.length - 1, (burst.burstId || 1) - 1));
            const electricSfx = noises[soundIndex] || cfg.sounds?.[`electricNoise${burst.burstId}`] || noises[0];
            const volKey = `electricNoise${burst.burstId}`;
            const electricVol = cfg.soundVolumes?.[volKey] ?? cfg.soundVolumes?.electricNoise ?? 0.70;
            audioSystem.playSFX(electricSfx, electricVol);
          }
        }

        spawnSparks(
          this.x + (Math.random() - 0.5) * (this.r || 25) * 1.2,
          this.y + (Math.random() - 0.5) * (this.r || 25) * 0.8,
          2,
          'cyan',
          '#38BDF8'
        );
      } else {
        this._lastThunderclapBurstId = null;
      }

      // Space delay countdown between First Form and Thunderclap & Flash
      if (this._thunderclapVoiceDelayTimer > 0) {
        this._thunderclapVoiceDelayTimer--;
        if (this._thunderclapVoiceDelayTimer <= 0 && !this._hasPlayedThunderclapVoice) {
          this._playThunderclapFlashVoice();
        }
      }

      // Voiceline sequence progression during channeling:
      // Part 2: "Thunderclap and Flash" chained after "First Form" finishes (fallback fires at ~44% elapsed + gap frames)
      const gapFrames = cfg.firstFormToThunderclapGapFrames !== undefined ? cfg.firstFormToThunderclapGapFrames : 18;
      const part2FallbackFrame = Math.round(totalChannel * 0.44) + gapFrames;
      if (!this._hasPlayedThunderclapVoice && this._thunderclapVoiceDelayTimer <= 0 && elapsedChannel >= part2FallbackFrame) {
        this._playThunderclapFlashVoice();
      }

      // Part 3: "Sixfold!" fires right when he is about to unleash the skill (final ~16 frames / ~0.26s before dash release)
      if (!this._hasPlayedSixfoldVoice && this.thunderclapChannelTimer <= Math.min(16, Math.max(4, Math.round(totalChannel * 0.14)))) {
        this._playSixfoldVoice();
      }

      // Channel complete -> explosive burst dash along committed 1 direction!
      if (this.thunderclapChannelTimer <= 0) {
        this.isChannelingThunderclap = false;
        this.isThunderclapAimLocked = false;
        this._lastThunderclapBurstId = null;
        const dashTarget = (this.thunderclapTarget && this.thunderclapTarget.hp > 0 && !this.thunderclapTarget.isDead)
          ? this.thunderclapTarget
          : target;
        this._executeThunderclapDash(dashTarget);
      }
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Decay swing timers
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // Skill Cooldowns (cooldowns do NOT tick down while actively channeling or dashing)
    if (!this.isChannelingThunderclap && !this.isDashingThunderclap && this.thunderclapCooldown > 0) {
      this.thunderclapCooldown--;
    }
    if (this.rokurenCooldown > 0) this.rokurenCooldown--;
    if (this.flamingGodCooldown > 0) this.flamingGodCooldown--;

    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // AI / Skill Priority (config-driven enable/disable)
    if (this.isSkillEnabled(cfg.enableFlamingThunderGod, false) && this.flamingGodCooldown <= 0 && dist < 220) {
      this._triggerFlamingThunderGod(target);
    } else if (this.isSkillEnabled(cfg.enableRokuren, false) && this.rokurenCooldown <= 0 && dist < 200) {
      this._triggerRokuren(target);
    } else if (this.isSkillEnabled(cfg.enableThunderclap, true) && this.thunderclapCooldown <= 0 && dist < 450) {
      this._triggerThunderclapAndFlash(target);
    } else if (dist < (cfg.katanaReach || 78) + (target.r || 25) && this.slashSwingTimer <= 0 && this.isSkillEnabled(cfg.enableBasicAttack, true)) {
      this._executeThunderIaiCombo(target);
    }
  }

  getNearestTarget(fallbackOpponent = null) {
    let nearest = null;
    let minDist = Infinity;
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = ent;
      }
    }
    if (nearest) return nearest;
    if (fallbackOpponent && fallbackOpponent !== this && fallbackOpponent.hp > 0 && !fallbackOpponent.isDead) {
      return fallbackOpponent;
    }
    return null;
  }

  _executeThunderIaiCombo(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.iaiComboCount = (this.iaiComboCount + 1) % 3;

    this.aim(target);
    const reach = 78;
    const arc = Math.PI * 0.778; // 140 degrees (Rule 7)
    const angle = this.gunAngle || 0;

    const damages = [18, 22, 28];
    let dmg = damages[this.iaiComboCount];
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    if (this.isSkillEnabled(cfg.enableBattleTrance, true) && this.inBattleTrance) {
      dmg = Math.round(dmg * 1.5);
    }

    let didHit = false;
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEntities) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.team === this.team) continue;
      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= reach + ent.r) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          applyDamageToTarget(ent, dmg, this);
          spawnSparks(ent.x, ent.y, 8, 'gold', '#F59E0B');
          spawnBloodEffect(ent.x, ent.y, ent.bloodColor || '#DC2626');
          didHit = true;
          if (this.iaiComboCount === 2) {
            ent.applyKnockback?.(Math.cos(angle) * 22, Math.sin(angle) * 22);
          }
        }
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      const swingSfx = cfg.sounds?.katanaSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
      const swingVol = cfg.soundVolumes?.katanaSwing !== undefined ? cfg.soundVolumes.katanaSwing : 0.75;
      audioSystem.playSFX(swingSfx, swingVol);

      if (didHit) {
        const hitSfx = cfg.sounds?.slashHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
        const hitVol = cfg.soundVolumes?.slashHit !== undefined ? cfg.soundVolumes.slashHit : 0.80;
        audioSystem.playSFX(hitSfx, hitVol);
      }
    }
  }

  _playFirstFormVoice() {
    if (this._hasPlayedFirstFormVoice) return;
    this._hasPlayedFirstFormVoice = true;
    if (typeof audioSystem === 'undefined' || !audioSystem.playSFX) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const sfx = cfg.sounds?.firstFormVoice || 'Assets/Sound Effects/Skills/Zenitsu-firstform-voiceline.mp3';
    const vol = cfg.soundVolumes?.firstFormVoice ?? cfg.soundVolumes?.channelVoice ?? 0.90;

    audioSystem.playSFX(sfx, vol, 1.0, 0, 0, () => {
      // Space between First Form and Thunderclap & Flash voicelines:
      if (this.isChannelingThunderclap && !this._hasPlayedThunderclapVoice && !this.isDead) {
        const gap = cfg.firstFormToThunderclapGapFrames !== undefined ? cfg.firstFormToThunderclapGapFrames : 18;
        if (gap > 0) {
          this._thunderclapVoiceDelayTimer = gap;
        } else {
          this._playThunderclapFlashVoice();
        }
      }
    });
  }

  _playThunderclapFlashVoice() {
    if (this._hasPlayedThunderclapVoice) return;
    this._hasPlayedThunderclapVoice = true;
    if (typeof audioSystem === 'undefined' || !audioSystem.playSFX) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const sfx = cfg.sounds?.thunderclapFlashVoice || 'Assets/Sound Effects/Skills/Zenitsu-thunderclap&flash-voiceline.mp3';
    const vol = cfg.soundVolumes?.thunderclapFlashVoice ?? cfg.soundVolumes?.channelVoice ?? 0.90;

    audioSystem.playSFX(sfx, vol);
  }

  _playSixfoldVoice() {
    if (this._hasPlayedSixfoldVoice) return;
    this._hasPlayedSixfoldVoice = true;
    if (typeof audioSystem === 'undefined' || !audioSystem.playSFX) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const sfx = cfg.sounds?.sixfoldVoice || 'Assets/Sound Effects/Skills/zenitsu-sixfold-voiceline.mp3';
    const vol = cfg.soundVolumes?.sixfoldVoice ?? cfg.soundVolumes?.channelVoice ?? 0.90;

    audioSystem.playSFX(sfx, vol);
  }

  _triggerThunderclapAndFlash(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    this.thunderclapCooldown = this.thunderclapCooldownMax;
    this.thunderclapChannelDuration = cfg.thunderclapChannelDuration || 36;
    this.thunderclapChannelTimer = this.thunderclapChannelDuration;
    this.isChannelingThunderclap = true;
    this.thunderclapTarget = target;
    this._lastThunderclapBurstId = null;
    this._hasPlayedFirstFormVoice = false;
    this._hasPlayedThunderclapVoice = false;
    this._hasPlayedSixfoldVoice = false;
    this._thunderclapVoiceDelayTimer = 0;

    // Smooth aim initialization without instant snapping
    if (this.gunAngle === undefined) {
      this.gunAngle = this.angle || 0;
    }
    this.skillCastAngle = this.gunAngle;
    this.vx = 0;
    this.vy = 0;

    if (target) {
      this.aim(target);
      this.skillCastAngle = this.gunAngle;
    }

    // Step 1: The moment he channels the skill, play First Form voiceline ("First Form...")
    this._playFirstFormVoice();

    // Frame 1: Stance initiation sound
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      const stanceSfx = cfg.sounds?.stance || 'Assets/Sound Effects/Skills/dash1.mp3';
      const stanceVol = cfg.soundVolumes?.stance !== undefined ? cfg.soundVolumes.stance : 0.30;
      audioSystem.playSFX(stanceSfx, stanceVol);
    }
  }

  _executeThunderclapDash(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    // Safety check: ensure "Sixfold!" voiceline has played before unleashing dashes
    if (!this._hasPlayedSixfoldVoice) {
      this._playSixfoldVoice();
    }

    this.thunderclapDashIndex = 0;
    this.thunderclapTotalDashes = cfg.thunderclapDashCount || 4;
    this.thunderclapDashTarget = target;
    this.thunderclapDashVFXList = [];
    this.thunderclapCooldown = this.thunderclapCooldownMax;

    this._startThunderclapDashStep(target, 0);
  }

  _getArenaWallIntersection(startX, startY, angle) {
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG?.arena || { x: 0, y: 0, width: 1000, height: 700 });
    const pad = (this.r || 25) + 8;
    const minX = (arena.x || 0) + pad;
    const maxX = (arena.x || 0) + (arena.width || 1000) - pad;
    const minY = (arena.y || 0) + pad;
    const maxY = (arena.y || 0) + (arena.height || 700) - pad;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    let tMin = Infinity;

    // Check vertical walls (X boundaries)
    if (cosA > 1e-5) {
      const t = (maxX - startX) / cosA;
      if (t > 8 && t < tMin) tMin = t;
    } else if (cosA < -1e-5) {
      const t = (minX - startX) / cosA;
      if (t > 8 && t < tMin) tMin = t;
    }

    // Check horizontal walls (Y boundaries)
    if (sinA > 1e-5) {
      const t = (maxY - startY) / sinA;
      if (t > 8 && t < tMin) tMin = t;
    } else if (sinA < -1e-5) {
      const t = (minY - startY) / sinA;
      if (t > 8 && t < tMin) tMin = t;
    }

    if (!Number.isFinite(tMin) || tMin <= 0) {
      tMin = 260; // Safe fallback
    }

    let destX = startX + cosA * tMin;
    let destY = startY + sinA * tMin;

    destX = Math.max(minX, Math.min(maxX, destX));
    destY = Math.max(minY, Math.min(maxY, destY));

    const dist = Math.hypot(destX - startX, destY - startY);
    return { destX, destY, dist };
  }

  _startThunderclapDashStep(target, index) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.thunderclapCooldown = this.thunderclapCooldownMax;
    this.thunderclapDashIndex = index;
    this.thunderclapDashTarget = target;

    const startX = this.x;
    const startY = this.y;
    let angle;

    if (index === 0) {
      // Dash 1: Follows committed locked charge angle all the way to the arena wall
      angle = this.skillCastAngle;
    } else {
      // Dashes 2, 3, 4: Rebound from wall, slicing through nearest target across to the next wall
      const curTarget = this.getNearestTarget(target);
      if (curTarget && curTarget.hp > 0 && !curTarget.isDead) {
        const dx = curTarget.x - startX;
        const dy = curTarget.y - startY;
        const baseAngle = Math.atan2(dy, dx);

        // Zig-zag cross angle offsets (finisher dash pierces dead center through target)
        const isFinisher = (index === this.thunderclapTotalDashes - 1);
        const offsets = [0, 0.28, -0.32, 0];
        const angleOffset = isFinisher ? 0 : (offsets[index] !== undefined ? offsets[index] : (index % 2 === 1 ? 0.28 : -0.28));
        angle = baseAngle + angleOffset;
      } else {
        const altOffsets = [0, 2.2, -2.2, 2.2, -2.2, 2.2];
        angle = (this.gunAngle || 0) + (altOffsets[index] || 2.2);
      }
    }

    // Compute direct wall intersection so dash travels all the way to the arena boundary wall
    const wallHit = this._getArenaWallIntersection(startX, startY, angle);
    const destX = wallHit.destX;
    const destY = wallHit.destY;
    const actualDashDist = wallHit.dist;

    this.gunAngle = angle;
    this.angle = angle;

    this.isDashingThunderclap = true;
    this.thunderclapDashStep = 0;
    this.thunderclapDashDuration = cfg.thunderclapDashDuration || 5;
    this.thunderclapDashStartX = startX;
    this.thunderclapDashStartY = startY;
    this.thunderclapDashDestX = destX;
    this.thunderclapDashDestY = destY;
    this.thunderclapDashAngle = angle;
    this.thunderclapDashDist = actualDashDist;

    // Create Lightning Dash VFX for this dash step (with extended air linger so all 4 trails stay visible)
    const travelDuration = this.thunderclapDashDuration;
    const lingerDuration = 22;
    const disappearDuration = 18;
    const vfx = {
      dashIndex: index,
      startX: startX,
      startY: startY,
      destX: destX,
      destY: destY,
      angle: angle,
      dist: actualDashDist,
      timer: 0,
      isCurrentDash: true,
      travelDuration: travelDuration,
      lingerDuration: lingerDuration,
      disappearDuration: disappearDuration,
      maxTimer: travelDuration + lingerDuration + disappearDuration
    };

    this.thunderclapDashVFX = vfx;
    if (!Array.isArray(this.thunderclapDashVFXList)) {
      this.thunderclapDashVFXList = [];
    }
    this.thunderclapDashVFXList.push(vfx);

    // Dash sound mix: Play iconic Zenitsu dash noise layered with dash whoosh/SFX in full
    const dashNoise = cfg.sounds?.dashNoise || 'Assets/Sound Effects/Skills/Zenitsu-dash-noise.mp3';
    const dashNoiseVol = cfg.soundVolumes?.dashNoise !== undefined ? cfg.soundVolumes.dashNoise : 0.85;
    this._playIntermediateDashSound(dashNoise, dashNoiseVol);

    const dashSFX = cfg.sounds?.dashSFX;
    if (dashSFX) {
      const dashSFXVol = cfg.soundVolumes?.dashSFX !== undefined ? cfg.soundVolumes.dashSFX : 0.60;
      this._playIntermediateDashSound(dashSFX, dashSFXVol);
    }

    const dashWhoosh = cfg.sounds?.dashWhoosh;
    if (dashWhoosh) {
      const whooshVol = cfg.soundVolumes?.dashWhoosh !== undefined ? cfg.soundVolumes.dashWhoosh : 0.35;
      this._playIntermediateDashSound(dashWhoosh, whooshVol);
    }
  }

  _finalizeThunderclapDashStep(target, startX, startY, destX, destY, angle, dashIndex, isFinisher) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;

    // Check collision / hit on any targets along or near the dash line
    const hitEntities = [];
    const allEnemies = [...(state.fighters || []), ...(state.illusions || [])];
    for (const ent of allEnemies) {
      if (ent === this || ent.isDead || ent.hp <= 0) continue;
      if (ent.ownerIndex !== undefined && this.ownerIndex !== undefined && ent.ownerIndex === this.ownerIndex) continue;

      const hitRadius = (this.r || 25) + (ent.r || 25) + 30;

      const segDx = destX - startX;
      const segDy = destY - startY;
      const segLenSq = segDx * segDx + segDy * segDy;
      let t = segLenSq > 0 ? ((ent.x - startX) * segDx + (ent.y - startY) * segDy) / segLenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const projX = startX + t * segDx;
      const projY = startY + t * segDy;
      const dProj = Math.hypot(ent.x - projX, ent.y - projY);

      if (dProj <= hitRadius || (target && ent === target)) {
        hitEntities.push(ent);
      }
    }

    if (hitEntities.length === 0 && target && target.hp > 0 && !target.isDead) {
      hitEntities.push(target);
    }

    const baseDmg = isFinisher ? (cfg.thunderclapFinisherDamage || 38) : (cfg.thunderclapDamage || 14);
    let dmg = (this.isSkillEnabled(cfg.enableBattleTrance, true) && this.inBattleTrance) ? Math.round(baseDmg * 1.5) : baseDmg;

    for (const hitEnt of hitEntities) {
      applyDamageToTarget(hitEnt, dmg, this);

      // Apply Stun / Paralyze debuff to stop enemy entity movement
      const stunDur = isFinisher
        ? (cfg.thunderclapFinisherStunFrames || cfg.thunderclapStunFrames || 50)
        : (cfg.thunderclapStunFrames || 50);

      // Completely halt enemy velocity so they freeze/stop movement in place
      hitEnt.vx = 0;
      hitEnt.vy = 0;

      if (typeof hitEnt.applyParalyze === 'function') {
        hitEnt.applyParalyze(stunDur, { isElectric: true });
      } else if (typeof hitEnt.applyHitStun === 'function') {
        hitEnt.applyHitStun(stunDur, { isElectric: true });
      } else {
        hitEnt.paralyzeTimer = Math.max(hitEnt.paralyzeTimer || 0, stunDur);
        hitEnt.hitStunTimer = Math.max(hitEnt.hitStunTimer || 0, stunDur);
      }

      // Ricochet Hit Effect: High-velocity welding needle sparks, star embers, clash ring, cyan lightning & blood
      spawnParrySparksEffect(hitEnt.x, hitEnt.y, isFinisher ? 32 : 18);
      spawnMeleeClashShockwave(hitEnt.x, hitEnt.y, isFinisher ? 70 : 42, 'gojo');
      spawnSparks(hitEnt.x, hitEnt.y, isFinisher ? 20 : 12, 'cyan', '#38BDF8');
      spawnImpactFlash(hitEnt.x, hitEnt.y, '#38BDF8', isFinisher ? 40 : 22);
      spawnBloodEffect(hitEnt.x, hitEnt.y, hitEnt.bloodColor || '#DC2626');

      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        const ricochetSfx = cfg.sounds?.parry || 'Assets/Sound Effects/Skills/parry.mp3';
        const ricochetVol = isFinisher
          ? (cfg.soundVolumes?.thunderStrike !== undefined ? cfg.soundVolumes.thunderStrike * 0.5 : 0.45)
          : (cfg.soundVolumes?.parry !== undefined ? cfg.soundVolumes.parry : 0.32);
        audioSystem.playSFX(ricochetSfx, ricochetVol);
      }

      if (isFinisher) {
        hitEnt.applyKnockback?.(Math.cos(angle) * 28, Math.sin(angle) * 28);
      }
    }

    if (isFinisher) {
      // Last dash impact audio: Plays Zenitsu-dash2.mp3 to completion without being cut off
      const finSfx = cfg.sounds?.thunderStrike || 'Assets/Sound Effects/Skills/Zenitsu-dash2.mp3';
      const finVol = cfg.soundVolumes?.thunderStrike !== undefined ? cfg.soundVolumes.thunderStrike : 0.90;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(finSfx, finVol);
      }
      triggerGlobalScreenShake(7, 16);
      spawnFloatingText(this.x, this.y - 32, '霹靂一閃・四連 HEKIREKI ISSEN!', '#38BDF8');
    } else {
      triggerGlobalScreenShake(2, 6);
    }
  }

  _finalizeThunderclapHit(target, startX, startY, destX, destY, angle) {
    this._finalizeThunderclapDashStep(target, startX, startY, destX, destY, angle, 0, true);
  }

  _triggerRokuren(target) {
    this.rokurenCooldown = this.rokurenCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer;

    applyDamageToTarget(target, 48, this);
    target.applyKnockback?.(Math.cos(this.gunAngle || 0) * 30, Math.sin(this.gunAngle || 0) * 30);
    spawnSparks(target.x, target.y, 18, 'gold', '#F59E0B');
    triggerGlobalScreenShake(6, 14);
    spawnFloatingText(this.x, this.y - 30, '霹靂一閃・六連 ROKUREN!', '#F59E0B');
  }

  _triggerFlamingThunderGod(target) {
    this.flamingGodCooldown = this.flamingGodCooldownMax;
    this.slashSwingTimer = this.slashSwingMaxTimer * 2;

    this.aim(target);
    const angle = this.gunAngle || 0;
    this.x = target.x - Math.cos(angle) * 45;
    this.y = target.y - Math.sin(angle) * 45;

    applyDamageToTarget(target, 85, this);
    target.applyKnockback?.(Math.cos(angle) * 48, Math.sin(angle) * 48);

    spawnSparks(target.x, target.y, 24, 'flame', '#FBBF24');
    spawnImpactFlash(target.x, target.y, '#EF4444', 45);
    triggerGlobalScreenShake(9, 20);
    spawnFloatingText(this.x, this.y - 40, '火雷神 FLAMING THUNDER GOD!', '#F59E0B');
  }

  draw(ctx) {
    drawZenitsuSkin(ctx, this);
  }
}
