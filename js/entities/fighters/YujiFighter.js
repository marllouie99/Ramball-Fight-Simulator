import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawYujiSkin } from '../../graphics/fighters/yujiSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './yuji/yujiCombat.js';
import { modUpdateComboRush, modUpdateReverseCursedTechnique } from './yuji/yujiSkills.js';
import { spawnMeleeClashShockwave, spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnTeleportAfterimages } from './sukuna/sukunaCombat.js';

/**
 * Yuji Itadori — The Black Flash Brawler
 */
export class YujiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'yuji';
    this.type = 'yuji';

    // Visual aura
    this.combatAuraOpacity = 0.0;

    // Core combat variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.yuji?.punchSpeed || 16;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.slashHand = 0;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;

    // Black Flash buildup
    this.blackFlashCharge = 0;
    this.blackFlashThreshold = CONFIG.yuji?.blackFlashThreshold || 4;
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
    this.afterImages = []; // Zone trails afterimages array

    // Divergent Fist delayed shockwaves queue
    this.delayedShockwaves = [];

    // Skill 1: Divergent Fist Combo Rush
    this.comboRushCooldown = 0;
    this.isComboDashing = false;
    this.comboTarget = null;
    this.comboHitsLeft = 0;
    this.comboIntervalTimer = 0;

    // Soul Swap state
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.revertTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;

    // Skill 2: Reverse Cursed Technique (RCT)
    this.rctCooldown = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }

  reset() {
    super.reset();
    this.afterImages = [];
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;
      this.trailGenTimer = 0;
      this.rapidSlashHitsLeft = 0;
      return;
    }

    if (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.slashSwingTimer > 0) this.slashSwingTimer--;
      this.trailGenTimer = 0;
      this.rapidSlashHitsLeft = 0;
    }

    // Update existing afterimages (placed before freeze guard so they fade even if frozen!)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    const isFightingSukuna = state.fighters.some(f => f && !f.isDead && f !== this && (f.characterId === 'sukuna' || f.type === 'sukuna'));

    // Auto-trigger Ultimate: Soul Swap — Sukuna Takes Over (Once per match, HP critically low)
    if (this.hp / this.maxHp <= (CONFIG.yuji?.soulSwapHpThreshold || 0.30) && !this.hasSoulSwapped && !isFightingSukuna) {
      this.hasSoulSwapped = true;
      this.soulSwapActive = true;
      this.soulSwapTimer = CONFIG.yuji?.soulSwapDuration || 500;
      this.soulSwapTransitionTimer = 30; // 0.5s takeover transformation freeze!
      this.hasDismantleCharge = true;

      // Clear any leftover punch animation from before transformation so
      // the Sukuna slash swing animation displays immediately.
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;

      // Queue the 12 rapid slash-teleport sequence to start right after transformation freeze!
      const target = (typeof opponent !== 'undefined' && opponent) ? (Array.isArray(opponent) ? opponent[0] : opponent) : (state.fighters ? state.fighters.find(f => f && f !== this && !f.isDead && f.hp > 0) : null);
      if (target) {
        this.rapidSlashHitsLeft = CONFIG.yuji?.soulSwapRapidSlashHits || 12;
        this.rapidSlashTimer = 30; // Starts on frame 1 after takeover freeze
        this.flurryTarget = target;
      }

      spawnFloatingText(this.x, this.y - this.r - 28, "SUKUNA TAKES OVER!", "#CC0000");
      if (CONFIG.yuji?.transformationSound) {
        audioSystem.playSFX(
          CONFIG.yuji.transformationSound,
          CONFIG.yuji.transformationVolume ?? 2.0,
          1.0, 0,
          CONFIG.yuji.transformationDelay ?? 0
        );
      }
    }

    // Decay hit-flash visual BEFORE freeze guard so it doesn't stay stuck at max
    // while frozen (prevents permanent white overlay during Toji ambush hits).
    // We only tick hitFlashTimer here because super.update() handles the full
    // _tickCooldowns()/handlePoison()/handleBurn() and we don't want to double-call those.
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // TimeStop & Freeze Guards (Rule #1)
    const isBeamTrapped = this.caughtInPureLoveBeam || (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) || (this.pureLoveBeamRecoveryTimer && this.pureLoveBeamRecoveryTimer > 0) || (this.caughtInGenosBeamTimer && this.caughtInGenosBeamTimer > 0);
    if (isBeamTrapped && (this.rapidSlashHitsLeft || 0) > 0) {
      this.rapidSlashHitsLeft = 0;
      this.rapidSlashTimer = 0;
      this.flurryTarget = null;
      if (this.soulSwapActive) {
        this.soulSwapActive = false;
        this.revertTransitionTimer = 0;
      }
      spawnFloatingText(this.x, this.y - this.r - 28, "CANCELED BY BEAM!", "#FF0055");
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    // Ultimate transformation takeover transition freeze
    if (this.soulSwapTransitionTimer > 0) {
      this.soulSwapTransitionTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - 1);
      
      // The exact frame takeover transformation pause finishes, set timer to 1 to unleash slash 1 immediately!
      if (this.soulSwapTransitionTimer <= 0) {
        this.rapidSlashTimer = 1;
        // Ensure punch state is fully cleared before rapid slashes begin
        this.punchAnimTimer = 0;
        const rapidSlashVoice = CONFIG.sukuna?.sounds?.rapidSlashVoiceline || CONFIG.sukuna?.rapidSlashVoiceline || 'Assets/Sound Effects/Skills/Sukuna-rapidslash-voiceline.mp3';
        const voiceVol = CONFIG.sukuna?.soundVolumes?.rapidSlashVoiceline ?? (CONFIG.sukuna?.rapidSlashVoiceVolume ?? 3.0);
        if (typeof audioSystem !== 'undefined' && audioSystem.playFighterVoiceline) {
          audioSystem.playFighterVoiceline(this, rapidSlashVoice, voiceVol);
        }
      }
      return;
    }

    // Revert transformation freeze (stop movement, show recovery aura pause)
    if (this.revertTransitionTimer > 0) {
      this.revertTransitionTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.revertTransitionTimer % 15 === 0) {
        spawnImpactFlash(this.x, this.y, 25, 'gojo');
      }
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Manage Soul Swap duration & stagger on expiration
    if (this.soulSwapActive && this.soulSwapTimer > 0) {
      this.soulSwapTimer--;
      if (this.soulSwapTimer <= 0) {
        this.soulSwapActive = false;
        this.revertTransitionTimer = 45; // 0.75s revert transition freeze
        this.applyHitStun(60); // 60 frames (1s) stagger

        // Trigger Passive RCT Heal upon transformation expiration
        const healPercent = CONFIG.yuji?.rctHealPercent || 0.25;
        const healAmount = Math.round(this.maxHp * healPercent);
        if (typeof this.heal === 'function') {
          this.heal(healAmount, { color: '#00FF00' });
        } else {
          this.hp = Math.min(this.maxHp, this.hp + healAmount);
        }

        spawnFloatingText(this.x, this.y - this.r - 28, "PASSIVE RCT HEAL!", "#00FF00");
        spawnFloatingText(this.x, this.y - this.r - 48, `+${healAmount} HP`, "#00FF00");
        audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
        spawnImpactFlash(this.x, this.y, 45, 'rgba(0, 255, 120, 0.8)');
      }
    }

    // Smoothly transition Yuji's Cursed Energy aura opacity
    const wantsAura = (this.punchAnimTimer > 0) || (this.blackFlashCharge > 0) || this.soulSwapActive || (this.comboHitsLeft > 0) || this.isComboDashing || this.isChannelingRCT || (this.blackFlashTimer > 0);
    if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, this.combatAuraOpacity - 0.05);
    }

    // Cooldown management (operating at 120% potential inside the Zone)
    const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);
    if (this.comboRushCooldown > 0) this.comboRushCooldown = Math.max(0, this.comboRushCooldown - decay);
    if (this.rctCooldown > 0) this.rctCooldown = Math.max(0, this.rctCooldown - decay);

    // Process delayed shockwaves (Divergent Fist passive)
    if (this.delayedShockwaves) {
      for (let i = this.delayedShockwaves.length - 1; i >= 0; i--) {
        const sw = this.delayedShockwaves[i];
        sw.delay--;
        if (sw.delay <= 0) {
          // Trigger delayed shockwave impact if target is still valid
          const target = sw.target;
          if (target && !target.isDead && target.hp > 0) {
            applyDamageToTarget(target, sw.damage, this, { isDivergentFist: true });
            
            // Spawn hot-pink clash shockwave ring (Yuta style)
            const shockRadius = CONFIG.yuji?.shockwaveRadius || 40;
            spawnMeleeClashShockwave(target.x, target.y, shockRadius, 'gojo');

            // Play secondary impact sound
            audioSystem.playSFX('attack_fleshhit', 0.6);
          }
          this.delayedShockwaves.splice(i, 1);
        }
      }
    }

    // Extract targets list
    let targets = [];
    if (Array.isArray(opponent)) {
      targets = opponent;
    } else if (opponent) {
      targets = [opponent];
    }

    // Execute Skill 1 (Divergent Fist Combo Rush)
    modUpdateComboRush.call(this, targets[0]);

    // Skill 2 (Reverse Cursed Technique) is now a Passive that automatically heals Yuji upon reverting from Sukuna transformation.
    modUpdateReverseCursedTechnique.call(this);

    // Sukuna Soul Takeover: Rapid 360° Cleave Slash Finisher after Flurry Combo
    if ((this.rapidSlashHitsLeft || 0) > 0) {
      const isBeamTrapped = this.caughtInPureLoveBeam || (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) || (this.pureLoveBeamRecoveryTimer && this.pureLoveBeamRecoveryTimer > 0) || (this.caughtInGenosBeamTimer && this.caughtInGenosBeamTimer > 0);
      if (isBeamTrapped) {
        this.rapidSlashHitsLeft = 0;
        this.rapidSlashTimer = 0;
        this.flurryTarget = null;
        if (this.soulSwapActive) {
          this.soulSwapActive = false;
          this.revertTransitionTimer = 0;
        }
        spawnFloatingText(this.x, this.y - this.r - 28, "CANCELED BY BEAM!", "#FF0055");
        return;
      }

      // Freeze physical movement and cancel punch animations so only slash swings display
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;
      if ((this._slashSoundCooldown || 0) > 0) this._slashSoundCooldown--;
      this.rapidSlashTimer = (this.rapidSlashTimer || 0) - 1;
      if (this.rapidSlashTimer <= 0) {
        const ft = this.flurryTarget || targets[0];
        if (ft && !ft.isDead && ft.hp > 0) {
          const directAngle = Math.atan2(ft.y - this.y, ft.x - this.x);
          const slashAngle = directAngle + (Math.random() - 0.5) * 0.45;
          this.gunAngle = directAngle;

          const ownerIndex = state.fighters ? state.fighters.indexOf(this) : 0;
          const baseDamage = CONFIG.yuji?.punchDamage || 18;
          const slashDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
          const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;

          import('../../systems/projectileSystem.js').then(module => {
            if (module && module.projectileSystem) {
              module.projectileSystem.fireProjectile(
                this,
                ownerIndex,
                slashDamage,
                false,
                slashSpeed,
                false,
                'ghostBlade',
                this.x,
                this.y,
                slashAngle
              );
            }
          });

          spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
          triggerGlobalScreenShake(6, 8);
          spawnSparks(ft.x, ft.y, 20, 'crimsonSniper', '#8B0000');
          this.punchAnimTimer = 0;
          this.slashGlowTimer = 25;
          this.slashSwingTimer = 14;
          this.slashSwingMaxTimer = 14;
          this.slashHand = this.slashHand === 1 ? 0 : 1;

          const cleaveAngle = Math.atan2(ft.y - this.y, ft.x - this.x);
          ft.vx = (ft.vx || 0) + Math.cos(cleaveAngle) * 3;
          ft.vy = (ft.vy || 0) + Math.sin(cleaveAngle) * 3;

          audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
          audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.7);
          spawnImpactFlash(this.x, this.y, 15, 'crimsonSniper');

          this.rapidSlashHitsLeft--;

          if (this.rapidSlashHitsLeft > 0 && ft && !ft.isDead) {
            const oldX = this.x;
            const oldY = this.y;

            // Teleport to a dynamic surrounding position far enough from target (matching Sukuna spacing)
            const teleportAngle = Math.random() * Math.PI * 2;
            const targetRadius = ft.r || 20;
            const teleportDist = targetRadius + this.r + 110 + Math.random() * 90;
            this.x = ft.x + Math.cos(teleportAngle) * teleportDist;
            this.y = ft.y + Math.sin(teleportAngle) * teleportDist;

            if (state && state.arena) {
              this.x = Math.max(state.arena.x + 30, Math.min(state.arena.x + state.arena.width - 30, this.x));
              this.y = Math.max(state.arena.y + 30, Math.min(state.arena.y + state.arena.height - 30, this.y));
            }
            this.aim(ft);

            // Spawn afterimages along the teleport path
            spawnTeleportAfterimages(this, oldX, oldY, this.x, this.y);
            spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.7);

            if (typeof ft.applyHitStun === 'function') ft.applyHitStun(8);

            // Configured pacing timer between slash-teleport strikes
            this.rapidSlashTimer = CONFIG.yuji?.soulSwapRapidSlashCooldown ?? CONFIG.sukuna?.rapidSlashCooldown ?? 20;
          } else {
            this.rapidSlashHitsLeft = 0;
            if (this.soulSwapActive) {
              // === STOP MOVE, REVERT TRANSFORMATION ANIMATION & PASSIVE RCT HEAL YUJI ===
              this.soulSwapActive = false;
              this.revertTransitionTimer = 45; // 0.75s revert transformation freeze!
              this.vx = 0;
              this.vy = 0;

              const healPercent = CONFIG.yuji?.rctHealPercent || 0.25;
              const healAmount = Math.round(this.maxHp * healPercent);
              if (typeof this.heal === 'function') {
                this.heal(healAmount, { color: '#00FF00' });
              } else {
                this.hp = Math.min(this.maxHp, this.hp + healAmount);
              }

              spawnFloatingText(this.x, this.y - this.r - 28, "PASSIVE RCT HEAL!", "#00FF00");
              spawnFloatingText(this.x, this.y - this.r - 48, `+${healAmount} HP`, "#00FF00");
              audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
              spawnImpactFlash(this.x, this.y, 45, 'rgba(0, 255, 120, 0.8)');
            }
          }
        } else {
          this.rapidSlashHitsLeft = 0;
          if (this.soulSwapActive) {
            // === STOP MOVE, REVERT TRANSFORMATION ANIMATION & PASSIVE RCT HEAL YUJI ===
            this.soulSwapActive = false;
            this.revertTransitionTimer = 45; // 0.75s revert transformation freeze!
            this.vx = 0;
            this.vy = 0;

            const healPercent = CONFIG.yuji?.rctHealPercent || 0.25;
            const healAmount = Math.round(this.maxHp * healPercent);
            if (typeof this.heal === 'function') {
              this.heal(healAmount, { color: '#00FF00' });
            } else {
              this.hp = Math.min(this.maxHp, this.hp + healAmount);
            }

            spawnFloatingText(this.x, this.y - this.r - 28, "PASSIVE RCT HEAL!", "#00FF00");
            spawnFloatingText(this.x, this.y - this.r - 48, `+${healAmount} HP`, "#00FF00");
            audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
            spawnImpactFlash(this.x, this.y, 45, 'rgba(0, 255, 120, 0.8)');
          }
        }
      }
      return;
    }

    if (this.isComboDashing || (this.comboHitsLeft || 0) > 0 || this.isChannelingRCT) {
      return; // Skip normal AI basic attacks/behavior during combo rush or RCT
    }

    // AI logic: drive basic attacks in melee range
    if (!this.playerControlled && targets.length > 0) {
      const target = targets[0];
      if (target) {
        this.aim(target);

        // Ranged Dismantle check if in Soul Swap
        if (this.soulSwapActive && this.hasDismantleCharge) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= 350 && (this.cooldownTimer || 0) <= 0) {
            this.shoot();
            return;
          }
        }

        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.yuji?.punchRange || 65;
        const maxPunchReach = this.r + target.r + reach;

        if (dist <= maxPunchReach && (this.cooldownTimer || 0) <= 0) {
          this.aim(target);
          modUpdateMeleeCombat.call(this, target);
        }
      }
    }



    if (this.blackFlashTimer > 0) {
      if (!this.afterImages) this.afterImages = [];
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        r: this.r,
        angle: this.angle,
        color: this.color || '#D95C7E',
        timer: 16,
        maxTimer: 16
      }, 12);
    }
  }

  shoot() {
    if (!this.canPerformBasicAttack()) return false;
    // Block all attacks and manual input during Soul Swap ultimate sequence
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return;

    // Player-controlled / manual basic punch attack
    if ((this.cooldownTimer || 0) > 0) return;

    // Ultimate ranged attack: single Dismantle slash if in Soul Swap state
    if (this.soulSwapActive && this.hasDismantleCharge) {
      this.hasDismantleCharge = false; // Consume charge
      
      const baseDamage = CONFIG.yuji?.punchDamage || 18;
      const dismantleDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
      const dismantleSpeed = CONFIG.sukuna?.slashSpeed || 40;
      const ownerIndex = state.fighters.indexOf(this);
      
      import('../../systems/projectileSystem.js').then(module => {
        module.projectileSystem.fireProjectile(
          this,
          ownerIndex,
          dismantleDamage,
          false,
          dismantleSpeed,
          false,
          'ghostBlade'
        );
      });

      spawnFloatingText(this.x, this.y - this.r - 28, 'DISMANTLE!', '#E0E8FF');
      
      this.punchAnimTimer = 0;
      this.slashGlowTimer = 25;
      this.slashSwingTimer = 14;
      this.slashSwingMaxTimer = 14;
      this.slashHand = this.slashHand === 1 ? 0 : 1;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
      audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.85);
      
      const isZone = (this.blackFlashTimer > 0);
      this.cooldownTimer = isZone
        ? (CONFIG.yuji?.blackFlashZonePunchCooldown || 14)
        : (CONFIG.yuji?.basicPunchCooldown || 25);
      return;
    }

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

    const reach = CONFIG.yuji?.punchRange || 65;
    for (const target of allTargets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const maxPunchReach = this.r + target.r + reach;
      if (dist <= maxPunchReach && dist < closestDist) {
        closestDist = dist;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      this.aim(bestTarget);
      modUpdateMeleeCombat.call(this, bestTarget);
    } else if (this.playerControlled) {
      // Punch the air
      modUpdateMeleeCombat.call(this, null);
    }
  }

  triggerSecondarySkill() {
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return;
    if ((this.comboRushCooldown || 0) <= 0 && !this.isComboDashing && (this.comboHitsLeft || 0) <= 0) {
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
      const range = CONFIG.yuji?.comboDashRange || 200;
      for (const target of allTargets) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= range && dist < closestDist) {
          closestDist = dist;
          bestTarget = target;
        }
      }
      if (bestTarget) {
        this.isComboDashing = true;
        this.comboTarget = bestTarget;
        this.comboRushCooldown = CONFIG.yuji?.comboCooldown || 400;
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);
      }
    }
  }

  triggerTertiarySkill() {
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return;
    // Skill 2: Reverse Cursed Technique (RCT)
    // Only usable once per round typically, requires HP < 100%, and can't be used while doing other attacks
    if (this.rctCooldown <= 0 && this.hp < this.maxHp && !this.isComboDashing && (this.comboHitsLeft || 0) <= 0) {
      // AI check: prefer using it when HP is low, but player can trigger anytime HP < 100%
      const rctChannelTime = CONFIG.yuji?.rctChannelDuration || 45;
      this.isChannelingRCT = true;
      this.rctChannelTimer = rctChannelTime;
      this.rctCooldown = CONFIG.yuji?.rctCooldown || 900;
      
      // Floating text indication
      spawnFloatingText(this.x, this.y - this.r - 30, 'RCT', '#00FF00');
    }
  }

  interruptAttacks(forceCancelAll = false) {
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    if (forceCancelAll || (!isMatchEnded && (this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush))) {
      this.punchAnimTimer = 0;
    }
    this.delayedShockwaves = [];
    this.isComboDashing = false;
    this.comboTarget = null;
    this.comboHitsLeft = 0;
    
    // Interrupt RCT channeling
    if (this.isChannelingRCT) {
      this.isChannelingRCT = false;
      spawnFloatingText(this.x, this.y - this.r - 20, 'SKILL INTERRUPTED!', '#FF0000');
    }
    
    // Clear Black Flash zone on hard interrupt
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    // Draw JJK Cursed Energy aura behind him: red during Soul Swap, green during RCT, blue otherwise
    const auraTheme = this.soulSwapActive ? 'red' : (this.isChannelingRCT ? 'rct' : 'blue');
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, auraTheme);

    drawYujiSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
