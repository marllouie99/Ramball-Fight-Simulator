import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawTodoSkin, drawCursedRocks } from '../../graphics/fighters/todoSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { modUpdateMeleeCombat } from './todo/todoCombat.js';
import { modUpdateBoogieWoogie, modThrowCursedRock, modUpdateCursedRocks, modRepositionDisengage, modExecutePendingSwap, modCheckTeammateRescue, modCheckRockSwap, hasLiveTeammate, modTriggerTakadaUltimate, modStartTakadaChanneling, modActivateTakadaUltimate, applyBoogieDisorientation, applyBoogieEvadeBuff } from './todo/todoSkills.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

/**
 * Aoi Todo - The Boogie Woogie Brawler
 */
export class TodoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'todo';
    this.type = 'todo';
    this.combatAuraOpacity = 0.0; // Starts at 0, builds up dynamically during claps/attacks
    
    // Core Combat Variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.todo?.punchSpeed || 20;
    this.clapAnimTimer = 0;
    this.clapWindupTimer = 0;
    this.pendingSwapData = null;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Boogie Woogie Skill
    this.boogieWoogieCooldown = 0;
    this.boogieWoogieCooldownMax = CONFIG.todo?.clapCooldown || 120;
    this.justSwappedTimer = 0; // Window for Black Flash
    this.blackFlashGlowTimer = 0; // Visual lingering glow timer
    this.afterImages = []; // Zone trails afterimages array

    // Takada-chan Ultimate Variables
    this.isTakadaChanneling = false;
    this.takadaChannelTimer = 0;
    this.takadaUltTimer = 0;
    this.takadaUltCooldown = 0;
    this.takadaUltCooldownMax = CONFIG.todo?.ultCooldown || 1200;
    this.isTakadaUltActive = false;
    this.hasTriggeredTakadaHpUlt = false;
    this.pendingTakadaHpUlt = false;
    this.takadaSongStarted = false;
    this.takadaSongFadedOut = false;

    // Cursed Rocks
    this.cursedRocks = [];
    this.rockThrowCooldown = 0;
    this.rockThrowCooldownMax = CONFIG.todo?.rockCooldown || 180;
    this.rockCounterComboLeft = 0;
    this.rockCounterComboTarget = null;
    this.rockCounterComboTimer = 0;
    this.rockCounterCooldown = 0;
    this.disengageDelayTimer = 0;

    // Teammate Rescue Tracker
    this.recentTeammateDamage = 0;
    this.teammateDamageResetTimer = 0;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'boogie_woogie',
        name: 'Boogie Woogie',
        type: 'active',
        cooldownKey: 'swapCooldown',
        cooldownMaxKey: 'swapCooldownMax'
      },
      {
        id: 'rock_throw',
        name: 'Cursed Rock Infusion',
        type: 'active',
        cooldownKey: 'rockThrowCooldown',
        cooldownMaxKey: 'rockThrowCooldownMax'
      },
      {
        id: 'takada_ult',
        name: 'Idol Motivation',
        type: 'ultimate',
        cooldownKey: 'takadaUltCooldown',
        cooldownMaxKey: 'takadaUltCooldownMax',
        durationKey: 'takadaUltTimer',
        activeKey: 'isTakadaUltActive',
        channelingKey: 'isTakadaChanneling',
        channelTimerKey: 'takadaChannelTimer',
        onFrozenTick: (fighter, skill) => {
          if (fighter.isTakadaUltActive) {
            if (fighter.takadaUltTimer <= 120 && !fighter.takadaSongFadedOut) {
              fighter.takadaSongFadedOut = true;
              const fadeOutMs = CONFIG.todo?.takadaSongFadeOutMs ?? 2500;
              const loopKey = `todo_takada_bg_${fighter.id || 'todo'}`;
              if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopLoop === 'function') {
                audioSystem.stopLoop(loopKey, fadeOutMs);
              }
            }
          }
        },
        onExpire: (fighter) => {
          fighter.isTakadaUltActive = false;
          fighter.isTakadaBackgroundPlaying = false;
          fighter.takadaSongStarted = false;
          fighter.takadaSongFadedOut = false;
        }
      }
    ]);
  }

  isStationarySkillActive() {
    return Boolean(
      this.isTakadaChanneling ||
      (this.takadaChannelTimer > 0) ||
      (this.rockCounterComboLeft > 0) ||
      (this.comboHitsLeft > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  reset() {
    super.reset();
    this.afterImages = [];
    if (this.takadaSongStarted) {
      const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
      audioSystem.stopLoop(loopKey, 300);
    }
    this.isTakadaChanneling = false;
    this.isTakadaUltActive = false;
    this.isTakadaBackgroundPlaying = false;
    this.takadaSongStarted = false;
    this.takadaSongFadedOut = false;
    this.hasTriggeredTakadaHpUlt = false;
    this.takadaUltCooldown = 0;
    this.takadaChannelTimer = 0;
    this.takadaUltTimer = 0;
    this.pendingTakadaHpUlt = false;
  }

  updateCursedRocks(targets) {
    modUpdateCursedRocks.call(this, targets);
  }

  update(opponent, ownerIndex, arena) {
    // Provide targets array for AI logic by extracting them from state or fallback to opponent array
    let targets = [];
    if (Array.isArray(opponent)) {
       targets = opponent;
    } else if (opponent) {
       targets = [opponent];
    } else if (typeof state !== 'undefined' && state.fighters) {
       targets = state.fighters.filter(f => f && f !== this && !f.isDead && f.hp > 0);
    }

    // ALWAYS update active cursed rocks FIRST so rocks continue traveling regardless of freezes, time-stops, stuns, or channelings!
    this.updateCursedRocks(targets);

    // Prevent updating dead fighter (and ensure death audio handling is triggered once)
    if (this.isDead || this.hp <= 0) {
      if (this.isTakadaChanneling || this.isTakadaUltActive) {
        this.onDeath();
      }
      return;
    }

    // Takada-chan Ultimate Cooldown Exception: takadaUltCooldown MUST ALWAYS tick down every frame,
    // even if Todo is paralyzed, frozen, time-stopped, or hit by Getsuga Tensho / Beams / Stun!
    if (!this.isTakadaUltActive && !this.isTakadaChanneling && (this.takadaUltCooldown || 0) > 0) {
      const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;
      this.takadaUltCooldown = Math.max(0, this.takadaUltCooldown - decay);
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // TimeStop & Freeze Guards (Rule 1)
    const isFrozen = this._handleTimeStop();

    const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
    );

    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      if (typeof this._handleFrozenSkillCooldowns === 'function') {
        this._handleFrozenSkillCooldowns();
      }
      // If Todo is caught / frozen in Gojo's domain, continue ticking down his Takada Ultimate timer each frame!
      if (isGojoDomainActive && this.isTakadaUltActive) {
        this.takadaUltTimer = Math.max(0, (this.takadaUltTimer || 0) - 1);
        if (this.takadaUltTimer <= 120 && !this.takadaSongFadedOut) {
          this.takadaSongFadedOut = true;
          const fadeOutMs = CONFIG.todo?.takadaSongFadeOutMs ?? 2500;
          const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
          audioSystem.stopLoop(loopKey, fadeOutMs);
        }
        if (this.takadaUltTimer <= 0) {
          this.isTakadaUltActive = false;
          this.isTakadaBackgroundPlaying = false;
          this.takadaSongStarted = false;
          this.takadaSongFadedOut = false;
        }
      }

      const hpThreshold = CONFIG.todo?.hpThresholdUltTrigger ?? 0.50;
      const hpUltEnabled = CONFIG.todo?.enableHpThresholdUlt !== false;
      if (!this.isDemoFighter && hpUltEnabled && !this.hasTriggeredTakadaHpUlt && this.hp > 0 && (this.hp / (this.maxHp || 100)) <= hpThreshold) {
        this.pendingTakadaHpUlt = true; // Hold Takada-chan ultimate until stasis expires!
      }
      this.interruptAttacks();
      this.vx = 0;
      this.vy = 0;
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Smoothly transition Todo's Cursed Energy aura opacity
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const wantsAura = !isCountdown && ((this.clapAnimTimer > 0) || (this.clapWindupTimer > 0) || (this.rockCounterComboLeft > 0) || (this.punchAnimTimer > 0) || (this.justSwappedTimer > 0));
    if (isCountdown) {
      this.combatAuraOpacity = 0.0;
    } else if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.05); // Smooth fade-out
    }

    // Targets already extracted at top of update() for cursed rock updates

    // Decrease cooldowns (operating at 120% potential inside the Zone)
    const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;

    // 50% HP Auto-Trigger: Todo channels his Takada-chan Ultimate when HP drops <= hpThreshold (or after beam/purple stasis expires!)
    const hpThreshold = CONFIG.todo?.hpThresholdUltTrigger ?? 0.50;
    const hpUltEnabled = CONFIG.todo?.enableHpThresholdUlt !== false;
    const isHpLow = !this.isDemoFighter && hpUltEnabled && !this.hasTriggeredTakadaHpUlt && this.hp > 0 && (this.hp / (this.maxHp || 100)) <= hpThreshold;

    if ((isHpLow || this.pendingTakadaHpUlt) && !this.isTakadaChanneling && !this.isTakadaUltActive) {
      this.hasTriggeredTakadaHpUlt = true;
      this.pendingTakadaHpUlt = false;
      modStartTakadaChanneling.call(this);
    }

    // Process Takada-chan 3.0s Channeling phase
    if (this.isTakadaChanneling) {
      this.takadaChannelTimer--;
      this.vx = 0;
      this.vy = 0;

      // Cancel any active attack or swap animations
      this.interruptAttacks();

      // Start background song loop fade-in right as channeling starts!
      // Uses a continuous audio loop so music plays for the ENTIRE ultDuration (e.g. 1500 frames / 25 seconds)
      const isSongEnabled = CONFIG.todo?.enableTakadaBackgroundSong !== false;
      if (isSongEnabled && !this.takadaSongStarted && this.takadaChannelTimer <= 175) {
        this.takadaSongStarted = true;
        this.isTakadaBackgroundPlaying = true;
        const bgSong = CONFIG.todo?.takadaBackgroundSong || 'Assets/Sound Effects/Skills/todo-tadaka-background-song.mp3';
        const songVol = CONFIG.todo?.takadaBackgroundSongVolume ?? 2.2;
        const fadeInMs = CONFIG.todo?.takadaSongFadeInMs ?? 3500;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        audioSystem.playLoop(loopKey, bgSong, songVol, 1.0, fadeInMs);
      }

      if (this.takadaChannelTimer <= 0) {
        modActivateTakadaUltimate.call(this);
      }

      // Decrement basic status cooldowns
      if (this.boogieWoogieCooldown > 0) this.boogieWoogieCooldown = Math.max(0, this.boogieWoogieCooldown - decay);
      if (this.rockThrowCooldown > 0) this.rockThrowCooldown = Math.max(0, this.rockThrowCooldown - decay);
      if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);
      return; // MANDATORY: Stop further movement, attacks, swapping, or AI updates while channeling!
    }

    // Process Active Takada-chan Idol Ultimate mode
    if (this.isTakadaUltActive) {
      this.takadaUltTimer--;

      // If background song hasn't started yet, trigger looping fade-in
      const isSongEnabled = CONFIG.todo?.enableTakadaBackgroundSong !== false;
      if (isSongEnabled && !this.takadaSongStarted) {
        this.takadaSongStarted = true;
        this.isTakadaBackgroundPlaying = true;
        const bgSong = CONFIG.todo?.takadaBackgroundSong || 'Assets/Sound Effects/Skills/todo-tadaka-background-song.mp3';
        const songVol = CONFIG.todo?.takadaBackgroundSongVolume ?? 2.2;
        const fadeInMs = CONFIG.todo?.takadaSongFadeInMs ?? 3500;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        audioSystem.playLoop(loopKey, bgSong, songVol, 1.0, fadeInMs);
      }

      // Within the last 2 seconds of ultimate (120 frames remaining), smoothly fade out the background song!
      if (this.takadaUltTimer <= 120 && !this.takadaSongFadedOut) {
        this.takadaSongFadedOut = true;
        const fadeOutMs = CONFIG.todo?.takadaSongFadeOutMs ?? 2500;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        audioSystem.stopLoop(loopKey, fadeOutMs);
      }

      if (this.takadaUltTimer <= 0) {
        this.isTakadaUltActive = false;
        this.isTakadaBackgroundPlaying = false;
        this.takadaSongStarted = false;
        this.takadaSongFadedOut = false;
      }
    }

    if (this.boogieWoogieCooldown > 0) this.boogieWoogieCooldown = Math.max(0, this.boogieWoogieCooldown - decay);
    if (this.rockThrowCooldown > 0) this.rockThrowCooldown = Math.max(0, this.rockThrowCooldown - decay);
    if (this.rockCounterCooldown > 0) this.rockCounterCooldown = Math.max(0, this.rockCounterCooldown - decay);
    if (this.justSwappedTimer > 0) this.justSwappedTimer--;
    if (this.blackFlashGlowTimer > 0) this.blackFlashGlowTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.clapAnimTimer > 0) this.clapAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);

    // Process clap windup advance frames: when hands collide at end of windup, hold completed clap pose before swap!
    if (this.clapWindupTimer > 0) {
      this.clapWindupTimer--;
      if (this.clapWindupTimer <= 0 && this.pendingSwapData) {
        this.clapHoldTimer = 4; // Hold completed hands-connected clap pose for 4 frames
      }
    } else if (this.clapHoldTimer > 0) {
      this.clapHoldTimer--;
      if (this.clapHoldTimer <= 0 && this.pendingSwapData) {
        modExecutePendingSwap.call(this);
      }
    }

    // Boogie Woogie Tactical Swaps (Teammate Rescue, Cursed Rock Swaps & Solo Opponent Swaps):
    // Strictly prevent any swaps until the rock counter combo is 100% finished!
    if ((this.rockCounterComboLeft || 0) <= 0) {
      const swappedTeammate = modCheckTeammateRescue.call(this);
      if (!swappedTeammate) {
        const swappedRock = modCheckRockSwap.call(this);
        if (!swappedRock && !hasLiveTeammate(this) && this.cursedRocks.length === 0 && targets.length > 0) {
          const dist = Math.hypot(targets[0].x - this.x, targets[0].y - this.y);
          if (dist > 150 && (this.boogieWoogieCooldown || 0) <= 0) {
            modUpdateBoogieWoogie.call(this, targets);
          }
        }
      }
    }

    // Drive rock counter-attack combo punches (stay planted in place while punching)
    if (this.rockCounterComboLeft > 0) {
      const comboTarget = this.rockCounterComboTarget;

      // Stop combo ONLY if target is truly dead or invalid
      if (!comboTarget || comboTarget.isDead || comboTarget.hp <= 0) {
        this.rockCounterComboLeft = 0;
        this.rockCounterComboTarget = null;
        this.disengageDelayTimer = 0;
        this.resumeMovement();
      } else {
        // Track and stay glued within strike range so intermediate knockback never cancels the combo!
        const distToTarget = Math.hypot(comboTarget.x - this.x, comboTarget.y - this.y);
        const desiredDist = (this.r || 25) + (comboTarget.r || 25) + 20;
        if (distToTarget > desiredDist) {
          const moveSpeed = this.speed || 3.5;
          const moveAngle = Math.atan2(comboTarget.y - this.y, comboTarget.x - this.x);
          this.x += Math.cos(moveAngle) * Math.min(distToTarget - desiredDist, moveSpeed);
          this.y += Math.sin(moveAngle) * Math.min(distToTarget - desiredDist, moveSpeed);
        }
        this.vx = 0;
        this.vy = 0;
        this.rockCounterComboTimer--;
        if (this.rockCounterComboTimer <= 0) {
          this.aim(comboTarget);
          modUpdateMeleeCombat.call(this, comboTarget, true); // isCombo = true
          this.rockCounterComboLeft--;
          this.rockCounterComboTimer = this.rockCounterComboInterval;

          if (this.rockCounterComboLeft <= 0) {
            this.rockCounterComboTarget = null;
            this.disengageDelayTimer = 0;
            this.resumeMovement(comboTarget);
          }
        }
      }
    }

    // AI/Skill execution
    if (!this.playerControlled && targets.length > 0 && (this.rockCounterComboLeft || 0) <= 0) {
      let target = targets[0];
      if (target) {
        this.aim(target);
        
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        
        // AI Logic: Skills skipped in demo preview mode (only basic attacks!)
        if (!this.isDemoFighter) {
          // Todo throws cursed rocks at range to set up Boogie Woogie swaps (only when solo / teammate is dead)
          if (!hasLiveTeammate(this) && dist > 60 && this.rockThrowCooldown <= 0 && this.cursedRocks.length === 0) {
            modThrowCursedRock.call(this, target);
          }
        }

        // Melee Combat (Basic Attack Punch if naturally in range)
        const punchMaxRange = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
        if (dist <= punchMaxRange && (this.cooldownTimer || 0) <= 0 && (this.rockCounterComboLeft || 0) <= 0) {
          this.aim(target);
          modUpdateMeleeCombat.call(this, target, false);
        }
      }
    }
  }

  shoot() {
    if (!this.canPerformBasicAttack()) return false;
    // Basic Attack: Melee Punch (blocked while channeling ultimate!)
    if (this.isTakadaChanneling || (this.cooldownTimer || 0) > 0 || (this.rockCounterComboLeft || 0) > 0) return;

    let bestTarget = null;
    let closestDist = Infinity;
    
    const allTargets = [];
    if (state && state.fighters) {
       for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
          allTargets.push(f);
       }
    }
    if (state && state.illusions) {
       for (let ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
          allTargets.push(ill);
       }
    }

    // Find the closest valid target within punch range
    for (let target of allTargets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const punchMaxRange = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
      if (dist <= punchMaxRange && dist < closestDist) {
        closestDist = dist;
        bestTarget = target;
      }
    }

    // If an enemy is in range, aim and punch. Otherwise punch the air!
    if (bestTarget) {
      this.aim(bestTarget);
      modUpdateMeleeCombat.call(this, bestTarget, false);
    } else if (this.playerControlled) {
      // Allow player to punch the air manually if they click
      modUpdateMeleeCombat.call(this, null, false);
    }
  }

  triggerSecondarySkill() {
    if (this.isTakadaChanneling) return;
    if (hasLiveTeammate(this)) return; // Disabled when teammate is alive
    if (this.rockThrowCooldown <= 0) {
      modThrowCursedRock.call(this, null);
    }
  }

  triggerUltimate() {
    if (this.isTakadaChanneling) return false;
    return modTriggerTakadaUltimate.call(this);
  }

  interruptAttacks(forceCancelAll = false) {
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    const wasChannelingTakada = this.isTakadaChanneling;
    const currentTakadaTimer = this.takadaChannelTimer;
    const isFrozen = (typeof this.isFrozen === 'function') ? this.isFrozen() : Boolean(this.timeStopTimer > 0 || this.paralyzeTimer > 0);
    
    super.interruptAttacks(forceCancelAll);

    const shouldCancelTakada = forceCancelAll || (!isMatchEnded && (this.hp <= 0 || isFrozen || this.isTargetOfAmbush || this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0)));

    if (shouldCancelTakada) {
      this.punchAnimTimer = 0;
      this.isTakadaChanneling = false;
      this.takadaChannelTimer = 0;
    } else if (wasChannelingTakada) {
      this.isTakadaChanneling = true;
      this.takadaChannelTimer = currentTakadaTimer;
    }

    this.clapAnimTimer = 0;
    this.clapWindupTimer = 0;
    this.clapHoldTimer = 0;
    this.pendingSwapData = null;
  }

  onDeath() {
    super.onDeath();
    const isLastSurvivor = !hasLiveTeammate(this);

    // If Todo has living teammates when he dies (match continues), smoothly fade out the song.
    // BUT if Todo dies last (teammates already dead, triggering the round-end / champion screen),
    // let the music continue playing in the background as the champion / victory screen displays!
    if (this.isTakadaChanneling || this.isTakadaUltActive || this.takadaSongStarted) {
      if (!isLastSurvivor) {
        this.isTakadaChanneling = false;
        this.isTakadaUltActive = false;
        this.isTakadaBackgroundPlaying = false;
        this.takadaChannelTimer = 0;
        this.takadaUltTimer = 0;
        this.takadaSongStarted = false;
        this.takadaSongFadedOut = true;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        const fadeOutMs = CONFIG.todo?.takadaDeathSongFadeOutMs ?? 1200;
        audioSystem.stopLoop(loopKey, fadeOutMs);
      } else {
        // Todo died last: keep background music playing for champion / round-end reveal screen if song was active!
        this.isTakadaChanneling = false;
        this.isTakadaUltActive = false;
        this.isTakadaBackgroundPlaying = Boolean(this.takadaSongStarted && CONFIG.todo?.enableTakadaBackgroundSong !== false);
        this.takadaChannelTimer = 0;
        this.takadaUltTimer = 0;
      }
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    let reduction = CONFIG.todo?.baseDamageReduction ?? 0.20;

    // Enhanced damage reduction while in the Zone / Takada Ultimate (just swapped / Black Flash window active / Takada active)
    if (this.justSwappedTimer > 0 || this.blackFlashGlowTimer > 0 || this.isTakadaUltActive) {
      reduction = Math.max(reduction, CONFIG.todo?.zoneDamageReduction ?? 0.35);
    }

    // Armor reduction while channeling Takada Ultimate
    if (this.isTakadaChanneling) {
      reduction = Math.max(reduction, 0.50);
    }

    const finalAmount = amount * (1 - reduction);

    // Visual floating indicator when high armor reduction absorbs damage
    if (reduction >= 0.35 && amount > 5) {
      spawnFloatingText(this.x, this.y - (this.r || 25) - 8, `ARMOR -${Math.round(reduction * 100)}%`, '#00E5FF');
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  draw(ctx) {
    // If vanished (vanishTimer > 0), do not draw Todo's body or auras
    if (this.vanishTimer && this.vanishTimer > 0) {
      return;
    }

    // If dead (HP <= 0), still render any active in-flight cursed rocks before returning
    if (this.hp <= 0) {
      if (this.cursedRocks && this.cursedRocks.length > 0) {
        drawCursedRocks(ctx, this);
      }
      return;
    }
    
    // Draw exact JJK Cursed Energy Sakuga Flame Aura (matching Gojo and Sukuna)
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, 'blue');

    drawTodoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.isTakadaUltActive) {
      if (this.takadaUltTimer <= 120 && !this.takadaSongFadedOut) {
        this.takadaSongFadedOut = true;
        const fadeOutMs = CONFIG.todo?.takadaSongFadeOutMs ?? 2500;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopLoop === 'function') {
          audioSystem.stopLoop(loopKey, fadeOutMs);
        }
      }
      if (this.takadaUltTimer <= 0) {
        this.isTakadaUltActive = false;
        this.isTakadaBackgroundPlaying = false;
        this.takadaSongStarted = false;
        this.takadaSongFadedOut = false;
      }
    }
  }
}

