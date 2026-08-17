import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawTodoSkin } from '../../graphics/fighters/todoSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './todo/todoCombat.js';
import { modUpdateBoogieWoogie, modThrowCursedRock, modUpdateCursedRocks, modRepositionDisengage, modExecutePendingSwap, modCheckTeammateRescue, hasLiveTeammate, modTriggerTakadaUltimate, modStartTakadaChanneling, modActivateTakadaUltimate, applyBoogieDisorientation, applyBoogieEvadeBuff } from './todo/todoSkills.js';
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
    this.boogieWoogieCooldownMax = CONFIG.todo?.clapCooldown || 60;
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
    this.rockThrowCooldownMax = CONFIG.todo?.rockCooldown || 300;
    this.rockCounterComboLeft = 0;
    this.rockCounterComboTarget = null;
    this.rockCounterComboTimer = 0;
    this.disengageDelayTimer = 0;

    // Teammate Rescue Tracker
    this.recentTeammateDamage = 0;
    this.teammateDamageResetTimer = 0;
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
    this.takadaSongStarted = false;
    this.takadaSongFadedOut = false;
    this.hasTriggeredTakadaHpUlt = false;
  }

  update(opponent, ownerIndex, arena) {
    // Prevent updating dead fighter (and ensure death audio handling is triggered once)
    if (this.isDead || this.hp <= 0) {
      if (this.isTakadaChanneling || this.isTakadaUltActive) {
        this.onDeath();
      }
      return;
    }

    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // TimeStop & Freeze Guards (Rule 1)
    const isFrozen = this._handleTimeStop();
    const isBeamOrPurpleTrapped = (
      this.caughtInPureLoveBeam ||
      (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) ||
      this.isCaughtInPurple ||
      (this.purpleHitTimer && this.purpleHitTimer > 0)
    );

    const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
    );

    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed || isBeamOrPurpleTrapped) {
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

    const hadVanish = (this.vanishTimer > 0);
    super.update(opponent, ownerIndex, arena);
    if (hadVanish && (!this.vanishTimer || this.vanishTimer <= 0)) {
      // Reappeared in the arena from Boogie Woogie swap: apply attack reaction delay to enemies and evasion buff to team!
      applyBoogieDisorientation(this);
      applyBoogieEvadeBuff(this);
    }

    // Smoothly transition Todo's Cursed Energy aura opacity
    const wantsAura = (this.clapAnimTimer > 0) || (this.clapWindupTimer > 0) || (this.rockCounterComboLeft > 0) || (this.punchAnimTimer > 0) || (this.justSwappedTimer > 0);
    if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, this.combatAuraOpacity - 0.05); // Smooth fade-out
    }

    // Provide targets array for AI logic by extracting them from state or fallback to opponent array if that's what opponent represents
    let targets = [];
    if (Array.isArray(opponent)) {
       targets = opponent;
    } else if (opponent) {
       targets = [opponent];
    }

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

      // Check if in 1v1 mode or Stand Off mode (background song is disabled in these modes)
      const is1v1OrStandOff = Boolean(
        typeof state !== 'undefined' && state.mode && (
          state.mode === '1v1' || 
          state.mode === 'Stand Off' || 
          state.mode === '1v2 Stand Off' ||
          state.mode === GAME_MODES.ONE_VS_ONE ||
          state.mode === GAME_MODES.STAND_OFF ||
          state.mode === GAME_MODES.STAND_OFF_1V2 ||
          (typeof state.mode === 'string' && (
            state.mode.toLowerCase() === '1v1' || 
            state.mode.toLowerCase().includes('stand off') || 
            state.mode.toLowerCase().includes('standoff')
          ))
        )
      );

      // Start background song loop fade-in right as channeling starts!
      // Uses a continuous audio loop so music plays for the ENTIRE ultDuration (e.g. 1500 frames / 25 seconds)
      if (!is1v1OrStandOff && !this.takadaSongStarted && this.takadaChannelTimer <= 175) {
        this.takadaSongStarted = true;
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

      const is1v1OrStandOff = Boolean(
        typeof state !== 'undefined' && state.mode && (
          state.mode === '1v1' || 
          state.mode === 'Stand Off' || 
          state.mode === '1v2 Stand Off' ||
          state.mode === GAME_MODES.ONE_VS_ONE ||
          state.mode === GAME_MODES.STAND_OFF ||
          state.mode === GAME_MODES.STAND_OFF_1V2 ||
          (typeof state.mode === 'string' && (
            state.mode.toLowerCase() === '1v1' || 
            state.mode.toLowerCase().includes('stand off') || 
            state.mode.toLowerCase().includes('standoff')
          ))
        )
      );

      // If background song hasn't started yet, trigger looping fade-in
      if (!is1v1OrStandOff && !this.takadaSongStarted) {
        this.takadaSongStarted = true;
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
        this.takadaSongStarted = false;
        this.takadaSongFadedOut = false;
      }
    }

    if (this.boogieWoogieCooldown > 0) this.boogieWoogieCooldown = Math.max(0, this.boogieWoogieCooldown - decay);
    if (this.rockThrowCooldown > 0) this.rockThrowCooldown = Math.max(0, this.rockThrowCooldown - decay);
    if (this.takadaUltCooldown > 0) this.takadaUltCooldown = Math.max(0, this.takadaUltCooldown - decay);
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

    // Update active cursed rocks (pass targets so proximity detection works)
    modUpdateCursedRocks.call(this, targets);

    // Pair Team Modes (1v2, 2v2): Check if teammate needs Boogie Woogie emergency rescue swap!
    modCheckTeammateRescue.call(this);

    // Drive rock counter-attack combo punches (stay planted in place while punching)
    if (this.rockCounterComboLeft > 0) {
      const comboTarget = this.rockCounterComboTarget;
      const maxReach = (this.r || 25) + (comboTarget?.r || 25) + (CONFIG.todo?.punchRange || 60) + 30;
      const distToTarget = comboTarget ? Math.hypot(comboTarget.x - this.x, comboTarget.y - this.y) : Infinity;

      // Stop combo immediately if target is dead, invalid, or no longer in melee range!
      if (!comboTarget || comboTarget.isDead || comboTarget.hp <= 0 || distToTarget > maxReach) {
        this.rockCounterComboLeft = 0;
        this.rockCounterComboTarget = null;
        this.disengageDelayTimer = 0;
      } else {
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
          }
        }
      }
    }

    // AI/Skill execution
    if (!this.playerControlled && targets.length > 0) {
      let target = targets[0];
      if (target) {
        this.aim(target);
        
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        
        // AI Logic: Skills skipped in demo preview mode (only basic attacks!)
        if (!this.isDemoFighter) {
          // When solo or teammate is dead: Todo throws rocks at range to set up clap combo
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
    if (this.rockThrowCooldown <= 0 && !hasLiveTeammate(this)) {
      modThrowCursedRock.call(this, null);
    }
  }

  triggerUltimate() {
    if (this.isTakadaChanneling) return false;
    return modTriggerTakadaUltimate.call(this);
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
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
        this.takadaChannelTimer = 0;
        this.takadaUltTimer = 0;
        this.takadaSongStarted = false;
        this.takadaSongFadedOut = true;
        const loopKey = `todo_takada_bg_${this.id || 'todo'}`;
        const fadeOutMs = CONFIG.todo?.takadaDeathSongFadeOutMs ?? 1200;
        audioSystem.stopLoop(loopKey, fadeOutMs);
      } else {
        // Todo died last: keep background music playing for champion / round-end reveal screen!
        this.isTakadaChanneling = false;
        this.isTakadaUltActive = false;
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
    // Only skip drawing if the fighter is dead (HP <= 0)
    if (this.hp <= 0) return;
    
    // Draw exact JJK Cursed Energy Sakuga Flame Aura (matching Gojo and Sukuna)
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, 'blue');

    drawTodoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
