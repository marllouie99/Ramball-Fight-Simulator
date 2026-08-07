import { YutaRenderer } from '../../graphics/fighters/yutaRenderer.js';
import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { initRika, updateRika } from './yuta/rikaLogic.js';
import { renderYutaDomainBackground } from './yuta/yutaDomainVisuals.js';
import { modExecuteKatanaMelee, modGetKatanaTipPositions } from './yuta/yutaKatana.js';
import { getNextCopiedTechnique, executeCopiedTechnique, executeThinIceBreaker } from './yuta/yutaCopyLogic.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { drawYutaKatana } from '../../graphics/ui/WeaponIndexScreen.js';

export class YutaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.type = 'yuta';
    this.meleeCooldownMax = CONFIG.yuta.meleeCooldown || 50;
    this.meleeCooldown = 0;
    this.swordTrail = [];
    this.trailGenTimer = 0;
    this.swordGlowAlpha = 0;

    // Domain Expansion
    this.domainCooldown = CONFIG.yuta.domainCooldown || 1500;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.yuta.domainChargeMax || 90;
    this.isChannelingDomain = false;
    this.hasActivatedDomainAt25Hp = false;
    this.domainUseCount = 0;

    this.techniqueCooldown = this.cooldown;
    this.copiedTechniqueIndex = 0;

    this.slashFadeTimer = 0;
    this.cursedEnergyAlpha = 0; // Smooth transition multiplier for Rika cursed energy aura
    this.rikaCallTimer = 0; // Freeze movement while calling Rika

    // Disable Fighter.js base shoot cooldown so we can handle it ourselves
    this.shootCooldownMax = 0;
    this.shootCooldown = 0;

    initRika(this);

    // RCT Revival & Healing
    this.hasUsedRCTRevival = false;
    this.rctRevivalTimer = 0;
    this.rctCooldown = 0;
    this.damageWindow = [];

    // Phantom Flurry
    this.parryCount = 0;
    this.parryStacks = 0;
    this.targetParriesForFlurry = this._getRandomParryThreshold();
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.afterImages = [];
    this.lastParryCounterType = null;
    this.posHistory = [];
    this.sakugaImpactTimer = 0;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = 0;
    this.sakugaImpactY = 0;
    this.sakugaImpactAngle = 0;
    this.sakugaImpactSeed = 0;
  }

  getParryChance() {
    const isGuarding = this.blockPoseTimer > 0;
    const baseChance = isGuarding ? (CONFIG.yuta.parryActiveChance ?? 0.90) : (CONFIG.yuta.parryPassiveChance ?? 0.90);
    const stackBonus = (this.parryStacks || 0) * (CONFIG.yuta?.parryChancePerStack ?? 0.05);
    return Math.min(0.98, baseChance + stackBonus);
  }

  _getRandomParryThreshold() {
    const min = CONFIG.yuta.flurryParryMin || 5;
    const max = CONFIG.yuta.flurryParryMax || 7;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  reset() {
    super.reset();
    this.hasUsedRCTRevival = false;
    this.rctRevivalTimer = 0;
    this.rctCooldown = 0;
    this.damageWindow = [];
    this.parryCount = 0;
    this.parryStacks = 0;
    this.targetParriesForFlurry = this._getRandomParryThreshold();
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.afterImages = [];
    this.lastParryCounterType = null;
    this.posHistory = [];
    this.sakugaImpactTimer = 0;
    this.rikaCallTimer = 0;
    this.hasActivatedDomainAt25Hp = false;
    this.domainUseCount = 0;
  }

  _spawnTeleportAfterimages(oldX, oldY, targetX, targetY, customAngle = null) {
    return; // Removed all afterimages on Yuta per user request
  }

  triggerDemoAttack() {
    this.executeKatanaMelee(0);
  }

  update(opponent, ownerIndex, arena, updateProjectiles = true) {
    // Run Rika's AI and logic immediately before any of Yuta's early returns (like TimeStop, Ambush, RCT)
    // so she doesn't accidentally get frozen when Yuta is disabled!
    updateRika(this, arena || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null));

    // Allow visual trail and slash effects to decay even while frozen
    if (this.swordTrail && this.swordTrail.length > 0) {
      fastCleanArray(this.swordTrail, (t) => {
        t.life -= 0.09;
        return t.life > 0;
      });
    }
    if (this.slashFadeTimer > 0) {
      this.slashFadeTimer--;
    }

    if (this.isChannelingDomain) {
      // Domain Channeling Hyper-Armor: Yuta is immune to timeStop, hitStun, & Gojo Infinity freeze while casting Authentic Mutual Love
      this.timeStopTimer = 0;
      this.isFrozenByInfinity = false;
      this.hitStunTimer = 0;
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      // Domain channeling & active domain have hyper-armor — do NOT cancel them via interruptAttacks().
      if (!this.isChannelingDomain && !this.domainActive) {
        this.interruptAttacks();
      }
      return;
    }

    if (this.mahoragaAdaptationFreezeTimer > 0) {
      this.mahoragaAdaptationFreezeTimer--;
      this.vx = 0;
      this.vy = 0;
      return; // Hold Yuta in stasis during Mahoraga's 3D Wheel Adaptation Game Pause!
    }

    // Freeze Yuta's movement for a moment while he calls for Rika (prevent during Domain Expansion)
    if (this.domainActive || this.isChannelingDomain) {
      this.rikaCallTimer = 0;
    }

    if (this.rikaCallTimer > 0 && !this.domainActive && !this.isChannelingDomain) {
      this.rikaCallTimer--;
      this.vx = 0;
      this.vy = 0;

      // Spawn cursed energy gathering sparks at the blade tip & palm while summoning Rika
      if (Math.random() < 0.6) {
        const tipPos = this._getKatanaTipPositions();
        spawnSparks(tipPos.outer.x, tipPos.outer.y, 2, 'silver', { color: 'rgba(255, 20, 147, 1)', blendMode: 0 });
      }
      if (this.rikaCallTimer % 5 === 0) {
        spawnImpactFlash(this.x, this.y, 35 + Math.random() * 15, 'rgba(255, 20, 147, 0.4)');
      }
      return; // Skip normal update & steering to freeze Yuta completely!
    }

    if (this.rctCooldown > 0) this.rctCooldown--;

    // If reviving/healing via RCT, handle RCT and skip normal logic
    if (this.rctRevivalTimer > 0) {
      this.rctRevivalTimer--;
      this.vx = 0;
      this.vy = 0;

      const targetHp = this.maxHp * (CONFIG.yuta.rctRevivalHealPercent || 0.15);
      const healAmount = targetHp / (CONFIG.yuta.rctRevivalDuration || 150);
      this.hp = Math.min(this.maxHp, this.hp + healAmount);

      if (this.rctRevivalTimer % 5 === 0) {
        spawnSparks(this.x, this.y, 3, '#88FF88', '#00FF00'); // Hex colors
        if (this.rctRevivalTimer % 30 === 0) {
          spawnFloatingText(this.x, this.y - 20, '+RCT', '#00FF00'); // Pop up healing text
        }
      }

      if (this.rctRevivalTimer === 0) {
        spawnFloatingText(this.x, this.y - 40, 'RCT COMPLETE', '#88FF88');
        triggerGlobalScreenShake(5, 10);
        spawnImpactFlash(this.x, this.y, 50, 'silver'); // Safe flash color
      }

      // Update pos manually since we skip super.update()
      this.x += this.vx;
      this.y += this.vy;

      // Bound to arena
      if (arena) {
        if (this.x < arena.x) this.x = arena.x;
        if (this.x > arena.x + arena.width) this.x = arena.x + arena.width;
        if (this.y < arena.y) this.y = arena.y;
        if (this.y > arena.y + arena.height) this.y = arena.y + arena.height;
      }
      return;
    }

    super.update(opponent, ownerIndex, arena, updateProjectiles);

    if (this.isChannelingDomain) {
      this.timeStopTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.hitStunTimer = 0;
    }

    // Fade afterimages every frame (when not time-stopped)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Track position history for delayed auto-aim during flurry
    if (!this.posHistory) this.posHistory = [];
    this.posHistory.push({ x: this.x, y: this.y });
    if (this.posHistory.length > 30) this.posHistory.shift();

    // Thin Ice Breaker Execution Logic
    if (this.thinIceBreakerPunchTimer > 0) {
      this.thinIceBreakerPunchTimer--;
    }

    if (this.isChannelingThinIceBreaker) {
      this.thinIceBreakerChargeTimer--;
      
      this.vx = 0;
      this.vy = 0;
      if (this.flurryTarget && !this.flurryTarget.isDead) {
        this.aim(this.flurryTarget);
      }
      
      // Visuals for charging
      if (this.thinIceBreakerChargeTimer % 2 === 0) {
        spawnImpactFlash(this.x, this.y, 45 + Math.random() * 25, 'rgba(0, 255, 255, 0.6)');
        spawnSparks(this.x + Math.cos(this.gunAngle) * 15, this.y + Math.sin(this.gunAngle) * 15, 8, '#00FFFF', '#FFFFFF');
      }

      if (this.thinIceBreakerChargeTimer <= 0) {
        this.isChannelingThinIceBreaker = false;
        this.thinIceBreakerPunchTimer = 22; // 22 frames for punch follow-through
        // Execute Thin Ice Breaker!
        const angle = this.flurryTarget ? Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x) : (this.gunAngle || 0);
        executeThinIceBreaker(this, angle);
      }
      return; // Freeze Yuta while he winds up
    }
    // Capture sword tip positions continuously after swinging to let the trail follow the sword tip
    if (this.trailGenTimer > 0) {
      this.trailGenTimer--;

      const pos = this._getKatanaTipPositions();

      let shouldAdd = true;
      if (this.swordTrail.length > 0) {
        const last = this.swordTrail[this.swordTrail.length - 1];
        const dist = Math.hypot(pos.outer.x - last.outer.x, pos.outer.y - last.outer.y);
        if (dist < 1.0) {
          shouldAdd = false; // Don't stack points if standing still
        }
      }

      if (shouldAdd) {
        pushTrailCap(this.swordTrail, {
          outer: pos.outer,
          inner: pos.inner,
          life: 1.0
        }, 30);
      }

      // Keep trail capped for performance and styling
      if (this.swordTrail.length > 16) {
        this.swordTrail.shift();
      }
    }

    // Phantom Flurry Execution Logic
    if (this.flurrySlashTimer > 0) this.flurrySlashTimer--;

    if (this.flurryHitsLeft > 0) {
      this.flurryGhost = this.posHistory[0] || { x: this.x, y: this.y };
      this.vx *= 0.1;
      this.vy *= 0.1;

      if (this.flurryTimer > 0) this.flurryTimer--;
      if (this.flurryTimer <= 0) {
        if (this.flurryHitsLeft <= 0) {
          this.flurryGhost = null;
          this.flurryTarget = null;
          return; // Flurry finished
        }

        this.flurryHitsLeft--;
        this.flurryTimer = CONFIG.yuta.flurryHitInterval || 6;

        // Query nearby valid enemy targets (fighters & illusions/minions) within 450px
        const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
        let possibleTargets = state.fighters.filter((f, idx) => {
          if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) return false;
          const enemyTeam = state.getFighterTeam(idx);
          if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) return false;
          return Math.hypot(f.x - this.x, f.y - this.y) < 450;
        });

        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (!ill || ill.hp <= 0 || ill.owner === this || ill.isRika) return;
            if (myTeam !== null && ill.owner && state.getFighterTeam(state.fighters.indexOf(ill.owner)) === myTeam) return;
            if (Math.hypot(ill.x - this.x, ill.y - this.y) < 450) {
              possibleTargets.push(ill);
            }
          });
        }

        if (possibleTargets.length > 0) {
          if (this.flurryTarget && this.flurryTarget.hp > 0 && Math.random() < 0.6 && possibleTargets.includes(this.flurryTarget)) {
            // Keep primary target
          } else {
            this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
          }
        }

        if (this.flurryTarget && !this.flurryTarget.isDead) {
          this.activeSlashType = (this.activeSlashType === undefined) ? 0 : (this.activeSlashType + 1) % 3;
          this.trailGenTimer = 40;
          this.flurrySlashTimer = 18; // 18-frame smooth swing animation (matches flurryTimer to hold pose)
          this.meleeCooldown = this.meleeCooldownMax; // trigger swing animation
          this.flurryTimer = 18; // 18-frame interval per teleport hit for clean readability

          const isRikaAlive = this.isRikaAliveInDomain();
          const dmgMult = isRikaAlive ? (CONFIG.yuta.domainRikaDamageMultiplier || 1.5) : 1.0;
          const flurryDmg = (CONFIG.yuta.flurryDamage || 8) * dmgMult;

          // Pass isSkill: true to bypass global basic attack hit-pause
          this.flurryTarget.takeDamage(flurryDmg, this, { isMelee: true, isSkill: true });

          spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#FF1493');
          triggerGlobalScreenShake(6, 6);
          spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 30, 'silver', { color: 'rgba(255, 20, 147, 1)', blendMode: 0 });

          const flurryAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          this.flurryTarget.vx += Math.cos(flurryAngle) * 2;
          this.flurryTarget.vy += Math.sin(flurryAngle) * 2;

          // Teleport around target
          const angle = Math.random() * Math.PI * 2;
          const rk = this.rika;
          if (rk && rk.cooldownTimer <= 0 && !rk.active) {
            rk.active = true;
            rk.timer = CONFIG.yuta.rikaDuration || 600;
            rk.x = this.x;
            rk.y = this.y;
            rk.hp = rk.maxHp; // Restore her HP
            
            const appearSound = getSkillSound(this._def?.id || 'yuta', 'rika_appearance');
            if (appearSound) {
              audioSystem.playSFX(appearSound.src, appearSound.volume);
              audioSystem.playSFX('skill_comerika', 1.0);
            }

            // Add her to the global targeting pool so AI and projectiles lock onto her
            if (typeof state !== 'undefined') {
              if (!state.illusions) state.illusions = [];
              if (!state.illusions.includes(rk)) {
                state.illusions.push(rk);
              }
            }
          }
          const dist = this.flurryTarget.r + this.r + 15;
          const oldX = this.x;
          const oldY = this.y;
          this.x = this.flurryTarget.x + Math.cos(angle) * dist;
          this.y = this.flurryTarget.y + Math.sin(angle) * dist;
          this.gunAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          this.swordTrail = []; // Reset trail so it doesn't streak across the screen

          this._spawnTeleportAfterimages(oldX, oldY, this.x, this.y, this.gunAngle);

          spawnImpactFlash(oldX, oldY, 15, 'silver');
          spawnImpactFlash(this.x, this.y, 20, 'silver');
          audioSystem.playSFX('skill_dash3', 0.7);

          // Play sword swing sound
          const swingSnd = getBasicAttackSound(this.id, this._def?.type);
          if (swingSnd) {
            audioSystem.playSFX(swingSnd.src, swingSnd.volume);
          } else {
            audioSystem.playSFX('attack_swordswing', 0.6);
          }

          // Removed target time-stop/freeze during flurry per user request

        } else {
          this.flurryHitsLeft = 0;
          this.flurryGhost = null;
          this.flurryTarget = null;
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      return;
    }

    // Smoothly fade Yuta's cursed energy in when Rika is active / domain is active / calling Rika, and out when done
    const isCountdown = (typeof state !== 'undefined' && state.gameState === 'countdown');
    // Suppress CE aura when frozen by Gojo's domain (time stop / hit stun)
    const isFrozenByDomain = (this.timeStopTimer > 0) || (this.hitStunTimer > 0);
    const targetAura = (!isFrozenByDomain && (this.isChannelingDomain || this.domainActive || (this.rikaCallTimer > 0) || (this.rika && this.rika.active) || isCountdown)) ? 1.0 : 0.0;
    if (this.cursedEnergyAlpha === undefined) this.cursedEnergyAlpha = 0;
    if (this.cursedEnergyAlpha < targetAura) {
      this.cursedEnergyAlpha = Math.min(targetAura, this.cursedEnergyAlpha + 0.04); // Fades in over ~25 frames
    } else if (this.cursedEnergyAlpha > targetAura) {
      this.cursedEnergyAlpha = Math.max(targetAura, this.cursedEnergyAlpha - 0.04); // Fades out
    }

    // Smoothly fade Rika herself in/out to prevent snappy appearances
    if (this.rikaAlpha === undefined) this.rikaAlpha = 0;
    const targetRika = (this.rika && this.rika.active && !this.rika.isDying) ? 1.0 : 0.0;
    if (this.rikaAlpha < targetRika) {
      this.rikaAlpha = Math.min(targetRika, this.rikaAlpha + 0.05); // Fades in over 20 frames
    } else if (this.rikaAlpha > targetRika) {
      this.rikaAlpha = Math.max(targetRika, this.rikaAlpha - 0.05); // Fades out over 20 frames
    }

    // Smoothly transition Yuta's sword glow alpha
    const maxCd_glow = this.meleeCooldownMax;
    const isSwinging_glow = (this.meleeCooldown > maxCd_glow - 15);
    const isBlocking_glow = (this.blockPoseTimer > 0);
    // Suppress weapon CE glow when frozen by Gojo's domain (reuses isFrozenByDomain from above)
    const targetGlow = (!isFrozenByDomain && (isSwinging_glow || isBlocking_glow)) ? 1.0 : (isFrozenByDomain ? 0.0 : (this.cursedEnergyAlpha || 0));

    if (this.swordGlowAlpha === undefined) this.swordGlowAlpha = 0;
    if (this.swordGlowAlpha < targetGlow) {
      this.swordGlowAlpha = Math.min(targetGlow, this.swordGlowAlpha + 0.15); // Fast rise for snappy activation
    } else if (this.swordGlowAlpha > targetGlow) {
      this.swordGlowAlpha = Math.max(targetGlow, this.swordGlowAlpha - 0.06); // Smooth decay over ~16 frames (no snapping)
    }

    // Passive RCT Healing
    if (this.hp > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + (CONFIG.yuta.regenRate || 0.05));

      // Visual feedback for passive healing (spawns 1-2 times per second)
      if (Math.random() < 0.03) {
        spawnFloatingText(this.x, this.y - 20, '+1', '#00FF00');
      }
    }

    if (this.meleeCooldown > 0) {
      const maxCd = this.meleeCooldownMax;
      this.meleeCooldown--;
      if (this.meleeCooldown === maxCd - 15) {
        this.slashFadeTimer = 15;
      }
    }

    if (this.techniqueCooldown > 0) this.techniqueCooldown--;
    if (this.domainCooldown > 0 && !this.domainActive) this.domainCooldown--;

    if (this.isChannelingDomain) {
      this.vx = 0;
      this.vy = 0;
      this.hitStunTimer = 0; // Domain Hyper-Armor: prevents domain channeling from being interrupted/frozen

      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }

      this.domainChargeTimer++;

      // Spawn some charge particles
      if (this.domainChargeTimer % 3 === 0) {
        spawnSparks(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, 3, 'silver', { color: 'rgba(255, 105, 180, 1)', blendMode: 0 });
      }
      if (this.domainChargeTimer % 15 === 0) {
        spawnImpactFlash(this.x, this.y, 45, 'rgba(255, 20, 147, 0.4)');
      }

      // Play domain_activate audio before deploying
      const deployAudioFrame = CONFIG.yuta.domainDeployAudioFrame ?? this.domainChargeMax;
      if (this.domainChargeTimer === deployAudioFrame && !this._playedDeployAudio) {
        this._playedDeployAudio = true;
        if (CONFIG.yuta?.domainDeploySound) {
          audioSystem.playSFX(
            CONFIG.yuta.domainDeploySound,
            CONFIG.yuta.domainDeployVolume ?? 3.5,
            1.0, 0,
            CONFIG.yuta.domainDeployDelay ?? 0
          );
        }
      }

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.activateDomain();
      }
      return; // Stop other logic while channeling
    }

    if (this.domainActive) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.domainCooldown = CONFIG.yuta.domainCooldown || 1500;
        spawnFloatingText(this.x, this.y - 40, 'DOMAIN ENDED', '#cccccc');
      } else {
        // Continuous ambient cursed energy vibration inside domain
        if (this.domainTimer % 25 === 0) {
          triggerGlobalScreenShake(4, 12);
        }

        // Domain buffs: Faster cooldowns
        if (this.techniqueCooldown > 0) {
          this.techniqueCooldown -= (1 / (1 - (CONFIG.yuta.domainCooldownReduction || 0.8))) - 1;
        }

        // Domain Reverse Cursed Technique (RCT): Continuous accelerated healing inside Authentic Mutual Love!
        if (this.hp > 0 && this.hp < this.maxHp) {
          const isRikaAlive = this.isRikaAliveInDomain();
          const regenMult = isRikaAlive ? (CONFIG.yuta.domainRikaRegenMultiplier || 2.0) : 1.0;
          const rctRate = (CONFIG.yuta.domainRctHealRate || 0.45) * regenMult;
          this.hp = Math.min(this.maxHp, this.hp + rctRate);

          if (Math.random() < 0.12) {
            if (Math.random() < 0.25) {
              spawnFloatingText(this.x, this.y - 25, isRikaAlive ? '+RCT 2x' : '+RCT', '#00FF00');
            }
          }
        }
      }
    }

    // Domain Trigger (Up to 2 activations per round): 1st at 25% HP, 2nd after domain cooldown when low HP/in battle
    const hpRatio = this.hp / (this.maxHp || 200);
    const domainHpThreshold = CONFIG.yuta?.domainHpThreshold ?? 0.25;
    const maxDomainUses = CONFIG.yuta?.domainMaxUses || 2;

    const canActivate = (!this.domainActive && !this.isChannelingDomain && (this.domainUseCount < maxDomainUses) && !this.isDying && this.hp > 0);
    const isFirstTrigger = (this.domainUseCount === 0 && hpRatio <= domainHpThreshold);
    const isSecondTrigger = (this.domainUseCount === 1 && (this.domainCooldown <= 0 || hpRatio <= domainHpThreshold));

    if (!this.isDemoFighter && canActivate && (isFirstTrigger || isSecondTrigger)) {
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      const hasEnemies = state.fighters.some((f, idx) => {
        if (!f || f.hp <= 0 || f === this) return false;
        const eTeam = state.getFighterTeam(idx);
        return myTeam === null || eTeam === null || myTeam !== eTeam;
      });

      if (hasEnemies) {
        this.domainUseCount++;
        this.hasActivatedDomainAt25Hp = true;
        this.isChannelingDomain = true;
        this.domainChargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this._playedDeployAudio = false;
        
        if (CONFIG.yuta?.domainChannelSound) {
          audioSystem.playSFX(
            CONFIG.yuta.domainChannelSound,
            CONFIG.yuta.domainChannelVolume ?? 3.5,
            1.0, 0,
            CONFIG.yuta.domainChannelDelay ?? 0
          );
        }
      }
    }

    // --- Hyper-armor Melee Override ---
    // Allow Yuta to swing his katana while in hitstun ONLY if not actively taking knockback,
    // so he doesn't get infinitely stun-locked by Gojo or Sukuna's rapid punches.
    const isKnockedBack = (this.knockbackStunTimer || 0) > 0;
    if (this.hitStunTimer > 0 && !isKnockedBack && !this.isChannelingDomain && this.hp > 0 && this.meleeCooldown <= 0) {
      let enemyInMelee = false;
      const range = CONFIG.yuta.meleeRange || 95;
      const arc = CONFIG.yuta.meleeArc || (Math.PI * 0.75);
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

      if (opponent && !isKnockedBack) {
        this.aim(opponent);
      }

      const allTargets = [
        ...(state.fighters || []),
        ...(state.illusions || [])
      ];

      for (let i = 0; i < allTargets.length; i++) {
        const enemy = allTargets[i];
        if (!enemy || enemy.hp <= 0 || enemy === this || enemy.invincibilityTimer > 0 || enemy.isStealthed || enemy.isRika || enemy.owner === this) continue;

        if (enemy.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(enemy.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const enemyTeam = state.getFighterTeam(state.fighters.indexOf(enemy));
          if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;
        }

        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= range + this.r + (enemy.r || 20)) {
          const enemyAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(enemyAngle - this.gunAngle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff <= arc / 2) {
            enemyInMelee = true;
            break;
          }
        }
      }

      if (enemyInMelee) {
        this.executeKatanaMelee(this.gunAngle);
      }
    }

    // --- Defensive Parry Anticipation ---
    // If Yuta is not actively swinging and isn't already holding a pose,
    // he detects incoming threats and raises his guard visually.
    if (this.hp > 0 && !this.isChannelingDomain && !this.domainActive) {
      const isSwinging = (this.meleeCooldown > this.meleeCooldownMax - 15);
      const isKnockedBackOrStunned = (this.knockbackStunTimer || 0) > 0 || (this.hitStunTimer || 0) > 0;
      if (!isSwinging && !isKnockedBackOrStunned && (this.blockPoseTimer === undefined || this.blockPoseTimer <= 0)) {
        let incomingThreat = false;
        let threatX = 0, threatY = 0;
        const myIndex = state.fighters.indexOf(this);
        const myTeam = state.getFighterTeam(myIndex);

        // 1. Check for incoming projectiles
        const projectiles = projectileSystem.getActiveProjectiles();
        for (let i = 0; i < projectiles.length; i++) {
          const proj = projectiles[i];
          if (proj.type === 'visual' || proj.ownerIndex === myIndex) continue;

          const projTeam = state.getFighterTeam(proj.ownerIndex);
          if (myTeam !== null && projTeam !== null && myTeam === projTeam) continue;

          const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
          const threatRad = CONFIG.yuta.parryThreatRadius || 180;
          if (dist > 15 && dist < threatRad) { // Avoid snapping to threats that are on top of him (fixes spin jitter)
            incomingThreat = true;
            threatX = proj.x;
            threatY = proj.y;
            break;
          }
        }

        // 2. Check for nearby enemies
        if (!incomingThreat) {
          for (let i = 0; i < state.fighters.length; i++) {
            const enemy = state.fighters[i];
            if (!enemy || enemy.hp <= 0 || enemy === this) continue;
            const enemyTeam = state.getFighterTeam(i);
            if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            const meleeThreatRad = CONFIG.yuta.parryMeleeThreatRadius || 120;
            if (dist > 15 && dist < meleeThreatRad) { // Avoid snapping to threats that are on top of him (fixes spin jitter)
              incomingThreat = true;
              threatX = enemy.x;
              threatY = enemy.y;
              break;
            }
          }
        }

        if (incomingThreat) {
          // Only snap gunAngle when NEWLY entering block pose (not on re-entries)
          const justEnteringBlockPose = (this.blockPoseTimer === undefined || this.blockPoseTimer <= 0);
          if (justEnteringBlockPose) {
            this.blockPoseTimer = CONFIG.yuta.parryAnticipationDuration || 45;
            // Snap gunAngle to face the threat only once per block pose window
            this.gunAngle = Math.atan2(threatY - this.y, threatX - this.x);
          }
        }
      }
    }

    // Phantom flurry trigger logic is now handled in takeDamage() when he parries
  }

  takeDamage(amount, attacker, opts = {}) {
    if (this.isTargetOfAmbush) {
      return super.takeDamage(amount, attacker, opts);
    }

    // 25% chance to block if not currently swinging his sword (85% if actively guarding)
    const maxCd = this.meleeCooldownMax;
    const isSwinging = (this.meleeCooldown > maxCd - 15);

    // Ignore unblockable damage types (including Gojo's purple orb)
    const unblockable = opts.isPoison || opts.isBurn || opts.isFlame || opts.fromBlackHole || opts.isRed || opts.isPurpleDPS || (opts.projectile && (opts.projectile.type === 'purple' || opts.projectile.isGojoPurple));

    const isGuarding = this.blockPoseTimer > 0;
    const blockChance = this.getParryChance();
    const isStunned = (this.timeStopTimer > 0) || (this.hitStunTimer > 0) || (this.electricStunTimer > 0) || (this.dubstepStunTimer > 0) || (this.crimsonElectrifiedTimer > 0) || (this.isInsideCronosSphere && this.isInsideCronosSphere());

    if (!this.domainActive && !isStunned && !isSwinging && !unblockable && this.hp > 0 && Math.random() < blockChance) {
      // Successfully blocked!
      
      const isAlreadyCountering = (this.flurryHitsLeft > 0) || this.isChannelingThinIceBreaker || (this.thinIceBreakerPunchTimer > 0) || (this.flurrySlashTimer > 0);
      if (isAlreadyCountering) {
        spawnSparks(this.x, this.y, 4, 'silver', 'rgba(255, 20, 147, 1)');
        return 0; // Passively block damage during active counter to prevent interruption
      }

      if (this.parryCount < this.targetParriesForFlurry) {
        this.parryCount++;
      }
      if (this.parryCount >= this.targetParriesForFlurry && attacker && !attacker.isDead && !this.isChannelingDomain) {
        this.parryCount = 0;
        this.targetParriesForFlurry = this._getRandomParryThreshold();
        
        // Grant +1 Parry Mastery Stack (+5% parry chance bonus)
        const maxParryStacks = CONFIG.yuta?.maxParryStacks ?? 5;
        if ((this.parryStacks || 0) < maxParryStacks) {
          this.parryStacks = (this.parryStacks || 0) + 1;
        }

        const dx = attacker.x - this.x;
        const dy = attacker.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const oldX = this.x;
        const oldY = this.y;

        this.flurryGhost = { x: oldX, y: oldY };
        this.x = attacker.x + (dx / dist) * (this.r + attacker.r + 5);
        this.y = attacker.y + (dy / dist) * (this.r + attacker.r + 5);
        if (attacker && !attacker.isDead) this.aim(attacker);
        this.swordTrail = []; // Reset trail so it doesn't streak across the screen

        this._spawnTeleportAfterimages(oldX, oldY, this.x, this.y);

        spawnImpactFlash(oldX, oldY, 25, 'silver');
        spawnImpactFlash(this.x, this.y, 30, 'silver');
        audioSystem.playSFX('skill_dash3', 0.8);
        triggerGlobalScreenShake(8, 10);

        // Determine counter type based on strict alternation
        const triggerFlurry = (this.lastParryCounterType !== 'flurry');

        if (triggerFlurry) {
          this.lastParryCounterType = 'flurry';
          this.blockPoseTimer = 0; // Clear block pose so he actually swings!
          this.flurryHitsLeft = CONFIG.yuta.flurryHits || 5;
          this.flurryTimer = 0;
          this.flurryTarget = attacker;
          const attackSound = getBasicAttackSound('musashi');
          if (attackSound) audioSystem.playSFX(attackSound.src, attackSound.volume);
          const flurryNoiseChance = CONFIG.yuta?.phantomFlurryNoiseChance ?? 0.35;
          if (CONFIG.yuta?.phantomFlurryNoiseSound && Math.random() < flurryNoiseChance) {
            audioSystem.playSFX(
              CONFIG.yuta.phantomFlurryNoiseSound,
              CONFIG.yuta.phantomFlurryNoiseVolume ?? 2.0,
              1.0, 0,
              CONFIG.yuta.phantomFlurryNoiseDelay ?? 0
            );
          }
        } else {
          this.lastParryCounterType = 'thin_ice';
          this.blockPoseTimer = 0; // Clear block pose for Thin Ice Breaker punch too!
          this.isChannelingThinIceBreaker = true;
          this.thinIceBreakerChargeTimer = 15;
          this.flurryTarget = attacker;
          audioSystem.playSFX('skill_dash5', 0.9); // Generic charge sound for now
        }

        return 0; // Return early, damage blocked, flurry/ice breaker started
      }

      if (attacker && !attacker.isDead) this.aim(attacker);
      this.blockPoseTimer = CONFIG.yuta.parryGuardDuration || 90; // Hold block pose
      // Dynamically switch stance position on every single parry so Yuta never holds a stiff pose
      const lastStance = this.parryStanceIndex || 0;
      this.parryStanceIndex = (lastStance + Math.floor(Math.random() * 3 + 1)) % 4;
      this.parryHitAnimTimer = 22; // Trigger crisp 22-frame strike deflection animation
      this.parryType = 'deflect';
      this.trailGenTimer = 35; // Generate katana tip trail during parry

      // Calculate blade orientation according to the newly selected stance position
      const stanceIdx = this.parryStanceIndex;
      let stanceAngleOffset = Math.PI / 2;
      if (stanceIdx === 0) stanceAngleOffset = -Math.PI * 0.42;
      else if (stanceIdx === 1) stanceAngleOffset = Math.PI * 0.68;
      else if (stanceIdx === 2) stanceAngleOffset = Math.PI / 2;
      else if (stanceIdx === 3) stanceAngleOffset = -Math.PI * 0.75;

      const bladeAngle = this.gunAngle + stanceAngleOffset;
      const baseDist = this.r - 12;
      const hiltX = this.x + Math.cos(this.gunAngle) * baseDist;
      const hiltY = this.y + Math.sin(this.gunAngle) * baseDist;

      // Spawn 14 sparks distributed along the active stance's blade position
      for (let i = 0; i < 14; i++) {
        const bladeOffset = 20 + Math.random() * 65;
        const sparkX = hiltX + Math.cos(bladeAngle) * bladeOffset;
        const sparkY = hiltY + Math.sin(bladeAngle) * bladeOffset;

        // Pass pink color for Yuta's cursed energy parry sparks with NORMAL blend mode
        spawnSparks(sparkX, sparkY, 1, 'silver', { color: 'rgba(255, 20, 147, 1)', blendMode: 0 });
      }

      // Spawn a main dark impact flash at the midpoint of Yuta's guard
      const flashX = hiltX + Math.cos(bladeAngle) * 50;
      const flashY = hiltY + Math.sin(bladeAngle) * 50;
      spawnImpactFlash(flashX, flashY, 55, 'dark');

      triggerGlobalScreenShake(4, 10); // Parry shake

      // Play block sound
      const parrySnd = getSkillSound(this.id, 'parry');
      if (parrySnd) {
        audioSystem.playSFX(parrySnd.src, parrySnd.volume);
      } else {
        audioSystem.playSFX('skill_parry', 0.65);
      }

      // Spawn floating block text
      spawnFloatingText(this.x, this.y - 30, 'BLOCKED!', '#E5E8E8');

      // We mitigated the damage! Return false to indicate no damage was taken.
      return false;
    }

    // Otherwise, take damage normally
    this.blockPoseTimer = 0; // Guard is broken/dropped on hit!

    // Check for fatal blow to trigger RCT Revival
    if (!this.hasUsedRCTRevival && this.invincibilityTimer <= 0 && amount > 0) {
      if (this.hp - amount <= 0 && this.hp > 0) {
        this.hasUsedRCTRevival = true;
        const duration = CONFIG.yuta.rctRevivalDuration || 150; // 2.5 seconds by default
        this.rctRevivalTimer = duration;
        this.invincibilityTimer = duration; // Protect while reviving
        this.hp = 1; // Survive at 1 HP

        spawnFloatingText(this.x, this.y - 40, 'RCT REVIVAL!', '#88FF88');
        triggerGlobalScreenShake(10, 15);

        // We absorbed the fatal blow
        return true;
      }
    }

    // Track 3-second damage window for non-fatal heavy damage RCT heal trigger
    if (amount > 0 && this.invincibilityTimer <= 0) {
      const now = Date.now();
      if (!this.damageWindow) this.damageWindow = [];
      this.damageWindow.push({ amount, time: now });

      // Keep only damage entries from the last 3000ms (3 seconds)
      this.damageWindow = this.damageWindow.filter(d => now - d.time <= 3000);

      const totalDamageIn3s = this.damageWindow.reduce((sum, d) => sum + d.amount, 0);
      const rctDamageThreshold = this.maxHp * 0.20; // 20% of max HP taken within 3 seconds

      if (totalDamageIn3s >= rctDamageThreshold && (this.rctCooldown || 0) <= 0 && this.rctRevivalTimer <= 0) {
        const duration = CONFIG.yuta.rctRevivalDuration || 150;
        this.rctRevivalTimer = duration;
        this.invincibilityTimer = duration;
        this.rctCooldown = 600; // 10 second cooldown between heavy damage RCT triggers
        this.damageWindow = [];

        spawnFloatingText(this.x, this.y - 40, 'RCT HEAL!', '#00FF66');
        triggerGlobalScreenShake(6, 10);
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  resolveWallBounce(arena, opponent) {
    let bounced = false;
    const restitution = CONFIG.collision.restitution || 0.8;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      if (typeof this.playWallBounceSound === 'function') this.playWallBounceSound();

      let target = opponent;
      if (!target || target.isDead || target.hp <= 0) {
        let nearest = null;
        let nearestDist = Infinity;
        const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
        for (const f of allEntities) {
          if (!f || f === this || f.hp <= 0) continue;
          if (f.team === this.team) continue;
          const dist = Math.hypot(f.x - this.x, f.y - this.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = f;
          }
        }
        target = nearest;
      }

      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed || 8;

      if (target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
        this.aim(target);
      } else {
        if (this.x - this.r <= arena.x || this.x + this.r >= arena.x + arena.width) {
          this.vx = -this.vx * restitution;
        }
        if (this.y - this.r <= arena.y || this.y + this.r >= arena.y + arena.height) {
          this.vy = -this.vy * restitution;
        }
      }
    }
  }

  activateDomain() {
    this.isChannelingDomain = false;
    this.domainActive = true;
    this.domainActivationTime = Date.now();
    this.domainTimer = CONFIG.yuta.domainDuration || 400;
    this.domainX = this.x;
    this.domainY = this.y;
    this.rikaCallTimer = 0; // Force clear any call freeze

    // Auto-summon Rika when domain activates
    if (this.rika) {
      const wasAlreadyActive = this.rika.active && !this.rika.isDying && !this.rika.disappearing;

      this.rika.killedInDomain = false;
      this.rika.isDying = false;
      this.rika.disappearing = false;
      this.rika.hp = this.rika.maxHp; // Restore HP to 100%
      this.rika.active = true;
      this.rika.cooldownTimer = 0;
      this.rikaCallTimer = 0;

      if (!wasAlreadyActive) {
        // Keep the appear animation when she appears to domain just remove the shockwave
        this.rika.x = this.x;
        this.rika.y = this.y;
        this.rika.spawnTimer = CONFIG.yuta?.rikaAriseDuration || 180;
        this.rika.spawnScale = 0.05;
        this.rika.playedComeRikaSound = false;
        this.rika.playedAriseRoarSound = false;
        this.rika.isDomainSpawn = true; // Flag for rikaLogic to suppress shockwaves
        this.rikaAlpha = 0; // Will fade in over 20 frames just like normal

        // Add her to illusions array if missing (so she renders correctly right away)
        if (typeof state !== 'undefined') {
          if (!state.illusions) state.illusions = [];
          if (!state.illusions.includes(this.rika)) state.illusions.push(this.rika);
        }

        // We'll let rikaLogic.js play the normal arise roar sounds so it perfectly matches a normal summon.
        // We only manually play Yuta's "Come, Rika!" line.
        if (CONFIG.yuta?.comeRikaSound) {
          audioSystem.playSFX(
            CONFIG.yuta.comeRikaSound,
            CONFIG.yuta.comeRikaVolume ?? 2.5,
            1.0, 0,
            CONFIG.yuta.comeRikaDelay ?? 0
          );
        }

      } else {
        // Skip animation if she's already active
        this.rika.spawnTimer = 0;
        this.rika.spawnScale = 1.0;
        this.rikaAlpha = 1.0;
        this.rika.isDomainSpawn = false;
      }
    }

    // triggerGlobalScreenShake(14, 50); // Heavy impact shake matching Gojo/Sukuna
    spawnFloatingText(this.x, this.y - 50, 'AUTHENTIC MUTUAL LOVE', '#ffb6c1');

    // Apply domain trap paralysis & tremor to trapped enemy fighters
    if (typeof state !== 'undefined' && state.fighters) {
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            if (f.domainImmunity || f.characterId === 'toji' || f.type === 'toji' || f._def?.id === 'toji') {
              return; // Toji (Zero Cursed Energy) is immune to Domain Expansions
            }
            if (typeof f.applyHitStun === 'function') f.applyHitStun(20);
            spawnFloatingText(f.x, f.y - 30, 'TRAPPED IN DOMAIN!', '#FF69B4');
            spawnSparks(f.x, f.y, 6, 'silver', 'rgba(255, 105, 180, 1)');
          }
        }
      });
    }
  }

  isRikaAliveInDomain() {
    return (this.domainActive && this.rika && this.rika.active && !this.rika.isDying && !this.rika.disappearing && this.rika.hp > 0);
  }

  shoot(ownerIndex) {
    if (this.isChannelingDomain) return;
    if (this.timeStopTimer > 0) return;
    if (this.hp <= 0) return;

    // Check if an enemy is in melee range
    let enemyInMelee = false;
    const range = CONFIG.yuta.meleeRange || 95;
    const arc = CONFIG.yuta.meleeArc || (Math.PI * 0.75);
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    for (let i = 0; i < allTargets.length; i++) {
      const enemy = allTargets[i];
      if (!enemy || enemy.hp <= 0 || enemy === this || enemy.invincibilityTimer > 0 || enemy.isRika || enemy.owner === this) continue;

      if (enemy.owner) {
        const ownerTeam = state.getFighterTeam(state.fighters.indexOf(enemy.owner));
        if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
      } else {
        const enemyTeam = state.getFighterTeam(state.fighters.indexOf(enemy));
        if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;
      }

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= range + this.r + (enemy.r || 20)) {
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - this.gunAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= arc / 2) {
          enemyInMelee = true;
          break;
        }
      }
    }

    if (enemyInMelee && this.meleeCooldown <= 0) {
      this.executeKatanaMelee(this.gunAngle);
      return;
    }

    // Ranged attack (Copied Technique)
    if (this.techniqueCooldown <= 0) {
      this.targetAngle = this.gunAngle;
      executeCopiedTechnique(this, this.gunAngle);
      this.techniqueCooldown = this.cooldown;

      // Cycle to next technique
      getNextCopiedTechnique(this);
    }
  }

  executeKatanaMelee(angle) {
    modExecuteKatanaMelee(this, angle);
  }

  _getKatanaTipPositions() {
    return modGetKatanaTipPositions(this);
  }


  interruptAttacks(forceCancelAll = false) {
    const wasChannelingDomain = this.isChannelingDomain;
    const currentDomainCharge = this.domainChargeTimer;
    super.interruptAttacks(forceCancelAll);
    if (wasChannelingDomain && !forceCancelAll) {
      this.isChannelingDomain = true;
      this.domainChargeTimer = currentDomainCharge;
    }
  }

  drawGun(ctx) {
    const isGamePlay = (typeof state !== 'undefined' && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));

    // Draw the chest strap here so it layers over the body but UNDER the HP text
    this._drawYutaSwordStrap(ctx);

    // Determine swing state
    // Determine swing state
    // Restrict meleeCooldown check to strictly <= maxCd because interruptAttacks(true) 
    // sets meleeCooldown to 270 (penalty cooldown), which would falsely trigger 
    // a 4-second backwards spinning katana animation!
    const editP = (typeof state !== 'undefined' && state.slashEditMode && state.slashEditParams) ? state.slashEditParams : null;
    const maxCd = this.meleeCooldownMax;
    const isFlurrySwinging = (this.flurrySlashTimer > 0);
    const isValidSwingRange = (this.meleeCooldown > maxCd - 15) && (this.meleeCooldown <= maxCd);
    let isSwinging = isFlurrySwinging || isValidSwingRange || !!editP;
    let progress = 1.0;
    let fade = (this.slashFadeTimer || 0) / 15;

    if (isFlurrySwinging) {
      const maxF = 14;
      progress = (maxF - this.flurrySlashTimer) / maxF;
      fade = 1.0;
    } else if (isSwinging) {
      progress = editP ? 0.5 : (maxCd - this.meleeCooldown) / 15;
      fade = 1.0;
    }

    // Generate static sword trail points when in editor mode
    if (editP) {
      this.swordTrail = [];
      const tipPos = this._getKatanaTipPositions();
      const numPts = 16;
      for (let i = 0; i < numPts; i++) {
        const t = i / (numPts - 1);
        const a = -0.45 * Math.PI + t * (0.90 * Math.PI);
        const r = 90 * editP.scale;
        const ox = tipPos.outer.x + Math.cos(a) * r + editP.offsetX;
        const oy = tipPos.outer.y + Math.sin(a) * r + editP.offsetY;
        const ix = tipPos.outer.x + Math.cos(a) * (r - 22 * editP.thickness) + editP.offsetX;
        const iy = tipPos.outer.y + Math.sin(a) * (r - 22 * editP.thickness) + editP.offsetY;
        pushTrailCap(this.swordTrail, { outer: { x: ox, y: oy }, inner: { x: ix, y: iy }, life: 1.0 }, 30);
      }
    }

    // --- DRAW DYNAMIC KATANA TIP TRAIL IN WORLD SPACE ---
    const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive
    );
    if (this.swordTrail && this.swordTrail.length > 1 && !isGojoDomainActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over'; // Standard blending for visibility on white arenas

      // Fades out smoothly only in the last 12 frames of the duration
      const trailAlpha = editP ? 1.0 : Math.min(1.0, (this.trailGenTimer || 0) / 12);
      ctx.globalAlpha = trailAlpha;

      const numSegments = this.swordTrail.length;

      // Helper function to draw a smoothed Bezier path through a list of points
      const smoothPath = (pts, selectFn) => {
        const p0 = selectFn(pts[0], 0);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length - 1; i++) {
          const pi = selectFn(pts[i], i);
          const pi1 = selectFn(pts[i + 1], i + 1);
          const xc = (pi.x + pi1.x) / 2;
          const yc = (pi.y + pi1.y) / 2;
          ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
        }
        const plast = selectFn(pts[pts.length - 1], pts.length - 1);
        ctx.lineTo(plast.x, plast.y);
      };

      // Allocation-free reverse path tracer to avoid cloning/reversing arrays
      const smoothPathReversed = (pts, selectFn) => {
        const lastIdx = pts.length - 1;
        const p0 = selectFn(pts[lastIdx], lastIdx);
        ctx.lineTo(p0.x, p0.y);
        for (let i = lastIdx - 1; i > 0; i--) {
          const pi = selectFn(pts[i], i);
          const pi1 = selectFn(pts[i - 1], i - 1);
          const xc = (pi.x + pi1.x) / 2;
          const yc = (pi.y + pi1.y) / 2;
          ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
        }
        const pFirst = selectFn(pts[0], 0);
        ctx.lineTo(pFirst.x, pFirst.y);
      };

      // Selectors for outer, inner, and core coordinates along the trail
      const getOuter = (p) => p.outer;
      const getInner = (p) => {
        const fadeRatio = p.life;
        return {
          x: p.outer.x + (p.inner.x - p.outer.x) * fadeRatio,
          y: p.outer.y + (p.inner.y - p.outer.y) * fadeRatio
        };
      };
      const getCoreInner = (p) => {
        const fadeRatio = p.life * 0.35; // Thinner white core
        return {
          x: p.outer.x + (p.inner.x - p.outer.x) * fadeRatio,
          y: p.outer.y + (p.inner.y - p.outer.y) * fadeRatio
        };
      };

      // 1. Soft back-glow (saturated pink for volumetric aura feel)
      ctx.strokeStyle = 'rgba(230, 0, 120, 0.25)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      ctx.stroke();

      // 2. Main pink crescent body fill (smooth, curved polygon) - Optimized: Allocation-free backward loop
      ctx.fillStyle = 'rgba(255, 20, 147, 0.45)'; // Vibrant deep hot pink
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      smoothPathReversed(this.swordTrail, getInner);
      ctx.closePath();
      ctx.fill();

      // 3. Searing white-pink core fill - Optimized: Allocation-free backward loop
      ctx.fillStyle = 'rgba(255, 220, 235, 0.85)';
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      smoothPathReversed(this.swordTrail, getCoreInner);
      ctx.closePath();
      ctx.fill();

      // 4. JJK calligraphy ink outlines
      if (isGamePlay) {
        // High-performance gameplay drawing path:
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer outline (single continuous path)
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        smoothPath(this.swordTrail, getOuter);
        ctx.stroke();

        // Inner outline (single continuous path)
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        smoothPath(this.swordTrail, getInner);
        ctx.stroke();
      } else {
        // Original detailed calligraphy outlines with varying pressure
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer calligraphy outline
        if (numSegments > 2) {
          for (let i = 1; i < numSegments - 1; i++) {
            const p = this.swordTrail[i];
            const prev = this.swordTrail[i - 1];
            const next = this.swordTrail[i + 1];

            const prevMidX = (prev.outer.x + p.outer.x) / 2;
            const prevMidY = (prev.outer.y + p.outer.y) / 2;
            const midX = (p.outer.x + next.outer.x) / 2;
            const midY = (p.outer.y + next.outer.y) / 2;

            const pressureNoise = Math.sin(Date.now() * 0.005 + i * 1.7) * 0.5 + 0.5;
            ctx.lineWidth = (0.7 + pressureNoise * 1.5) * p.life;

            ctx.beginPath();
            ctx.moveTo(prevMidX, prevMidY);
            ctx.quadraticCurveTo(p.outer.x, p.outer.y, midX, midY);
            ctx.stroke();
          }

          // Connect start segment
          const p0 = this.swordTrail[0];
          const p1 = this.swordTrail[1];
          const startMidX = (p0.outer.x + p1.outer.x) / 2;
          const startMidY = (p0.outer.y + p1.outer.y) / 2;
          ctx.lineWidth = 0.8 * p0.life;
          ctx.beginPath();
          ctx.moveTo(p0.outer.x, p0.outer.y);
          ctx.lineTo(startMidX, startMidY);
          ctx.stroke();

          // Connect end segment
          const pLast = this.swordTrail[numSegments - 1];
          const pPenult = this.swordTrail[numSegments - 2];
          const endMidX = (pLast.outer.x + pPenult.outer.x) / 2;
          const endMidY = (pLast.outer.y + pPenult.outer.y) / 2;
          ctx.lineWidth = 0.8 * pLast.life;
          ctx.beginPath();
          ctx.moveTo(endMidX, endMidY);
          ctx.lineTo(pLast.outer.x, pLast.outer.y);
          ctx.stroke();
        } else {
          // Fallback for short trails
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          smoothPath(this.swordTrail, getOuter);
          ctx.stroke();
        }

        // Inner calligraphy outline
        if (numSegments > 2) {
          for (let i = 1; i < numSegments - 1; i++) {
            const p = this.swordTrail[i];
            const prev = this.swordTrail[i - 1];
            const next = this.swordTrail[i + 1];

            const pInner = getInner(p);
            const prevInner = getInner(prev);
            const nextInner = getInner(next);

            const prevMidX = (prevInner.x + pInner.x) / 2;
            const prevMidY = (prevInner.y + pInner.y) / 2;
            const midX = (pInner.x + nextInner.x) / 2;
            const midY = (pInner.y + nextInner.y) / 2;

            const pressureNoise = Math.sin(Date.now() * 0.005 + i * 1.7 + Math.PI) * 0.5 + 0.5;
            ctx.lineWidth = (0.4 + pressureNoise * 1.0) * p.life;

            ctx.beginPath();
            ctx.moveTo(prevMidX, prevMidY);
            ctx.quadraticCurveTo(pInner.x, pInner.y, midX, midY);
            ctx.stroke();
          }

          // Connect start segment
          const p0 = getInner(this.swordTrail[0]);
          const p1 = getInner(this.swordTrail[1]);
          const startMidX = (p0.x + p1.x) / 2;
          const startMidY = (p0.y + p1.y) / 2;
          ctx.lineWidth = 0.5 * this.swordTrail[0].life;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(startMidX, startMidY);
          ctx.stroke();

          // Connect end segment
          const pLast = getInner(this.swordTrail[numSegments - 1]);
          const pPenult = getInner(this.swordTrail[numSegments - 2]);
          const endMidX = (pLast.x + pPenult.x) / 2;
          const endMidY = (pLast.y + pPenult.y) / 2;
          ctx.lineWidth = 0.5 * this.swordTrail[numSegments - 1].life;
          ctx.beginPath();
          ctx.moveTo(endMidX, endMidY);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
        } else {
          // Fallback for short trails
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          smoothPathReversed(this.swordTrail, getInner);
          ctx.stroke();
        }
      }

      // 5. Continuous interior ink speed lines (flowing along the trail center)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      smoothPath(this.swordTrail, (p) => {
        const fadeRatio = p.life;
        const innerPt = getInner(p);
        // Returns the midpoint between the outer and inner edge of the trail
        return {
          x: p.outer.x + (innerPt.x - p.outer.x) * 0.5,
          y: p.outer.y + (innerPt.y - p.outer.y) * 0.5
        };
      });
      ctx.stroke();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    let currentAngle = this.gunAngle;
    const comboIndex = this.activeSlashType || 0;

    if (isFlurrySwinging) {
      if (comboIndex === 0) {
        // 1. Horizontal Left-to-Right Slash
        currentAngle += (-Math.PI * 0.55) + (Math.PI * 1.1) * progress;
      } else if (comboIndex === 1) {
        // 2. Backhand Right-to-Left Slash
        currentAngle += (Math.PI * 0.55) - (Math.PI * 1.1) * progress;
      } else if (comboIndex === 2) {
        // 3. Overhead Vertical Downward Chop
        currentAngle += (-Math.PI * 0.85) + (Math.PI * 1.0) * progress;
      }
    } else if (isSwinging) {
      if (comboIndex === 0) {
        currentAngle += (-Math.PI / 4) + (Math.PI / 2) * progress;
      } else if (comboIndex === 1) {
        currentAngle += (Math.PI / 4) - (Math.PI / 2) * progress;
      } else if (comboIndex === 2) {
        currentAngle += (-Math.PI * 0.6) + (Math.PI * 1.2) * progress;
      }
    }

    ctx.rotate(currentAngle);
    if (Math.abs(currentAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }

    let parryPoseActive = (this.blockPoseTimer > 0 && !isSwinging);

    if (parryPoseActive) {
      this.blockPoseTimer--;
      if (this.parryHitAnimTimer > 0) this.parryHitAnimTimer--;

      const stanceIndex = (this.parryStanceIndex || 0) % 4;
      const hitTimer = this.parryHitAnimTimer || 0;
      
      // Calculate snap progress (0 -> 1 over first 6 frames of hit, then spring back over 16 frames)
      let strikeFactor = 0;
      if (hitTimer > 16) {
        // Fast snap out impact (22 -> 16)
        strikeFactor = (22 - hitTimer) / 6;
      } else {
        // Smooth spring return (16 -> 0)
        strikeFactor = hitTimer / 16;
      }

      // Base stance position and angle for each of the 4 positions
      let baseOffsetX = this.r - 12;
      let baseOffsetY = 0;
      let baseAngle = Math.PI / 2;
      let strikeAngleOffset = 0;

      if (stanceIndex === 0) {
        // Stance 0: High Slash Deflect (Upper diagonal riposte)
        baseOffsetX = this.r - 10;
        baseOffsetY = -10;
        baseAngle = -Math.PI * 0.42;
        strikeAngleOffset = Math.PI * 0.35 * strikeFactor;
      } else if (stanceIndex === 1) {
        // Stance 1: Low Sweep Deflect (Bottom diagonal parry)
        baseOffsetX = this.r - 8;
        baseOffsetY = 12;
        baseAngle = Math.PI * 0.68;
        strikeAngleOffset = -Math.PI * 0.38 * strikeFactor;
      } else if (stanceIndex === 2) {
        // Stance 2: Center Vertical Shield Guard
        baseOffsetX = this.r - 18;
        baseOffsetY = 0;
        baseAngle = Math.PI / 2;
        strikeAngleOffset = (Math.sin(strikeFactor * Math.PI) * 0.28);
      } else if (stanceIndex === 3) {
        // Stance 3: Backhand Reverse Deflect
        baseOffsetX = this.r - 14;
        baseOffsetY = -12;
        baseAngle = -Math.PI * 0.75;
        strikeAngleOffset = Math.PI * 0.45 * strikeFactor;
      }

      // Add dynamic impact vibration/recoil shift when hitTimer is active
      const vibrationX = hitTimer > 0 ? (Math.sin(hitTimer * 2.8) * 3.5 * (hitTimer / 22)) : 0;
      const vibrationY = hitTimer > 0 ? (Math.cos(hitTimer * 3.1) * 2.0 * (hitTimer / 22)) : 0;

      ctx.translate(baseOffsetX + vibrationX, baseOffsetY + vibrationY);
      ctx.rotate(baseAngle + strikeAngleOffset);
    } else if (this.rikaCallTimer > 0) {
      // Rika Summoning Channeling Pose: Raise Katana upward with ritual micro-vibration
      const humAngle = Math.sin(Date.now() * 0.08) * 0.08;
      const humShift = Math.cos(Date.now() * 0.1) * 2;
      ctx.translate(this.r - 8 + humShift, -4);
      ctx.rotate(-Math.PI * 0.35 + humAngle);
    } else {
      ctx.translate(this.r - 10, 0);
    }

    ctx.scale(1.2, 1.2);           // scale up the entire weapon by 20%

    // === Cursed Energy Katana Aura (Rendered BEHIND the blade) ===
    // Glows pink when swinging, when blocking, or when Rika/Domain is active
    let auraOpacity = this.swordGlowAlpha || 0;
    if (this._isWinnerReveal || (this.combatAuraOpacity && this.combatAuraOpacity > 0)) {
      auraOpacity = 1.0;
    }

    if (auraOpacity > 0.01) {
      ctx.save();

      const fillColor = `rgba(255, 105, 180, 0.7)`; // Fixed alpha so it doesn't double-multiply
      const coreColor = `rgba(255, 192, 203, 0.8)`;
      const strokeColor = `rgba(0, 0, 0, 0.75)`;

      if (isGamePlay) {
        // === Volumetric Katana Backlight (Optimized solid glow during gameplay) ===
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255, 20, 147, ${0.25 * auraOpacity})`;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(35, 1.5, 85, -4);
        ctx.lineWidth = 35;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';

        // Fast simplified outer aura shape
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(-15, -6 * auraOpacity);
        ctx.lineTo(35, -7 * auraOpacity);
        ctx.lineTo(85, -12 * auraOpacity);
        ctx.lineTo(85, 8 * auraOpacity);
        ctx.lineTo(35, 3 * auraOpacity);
        ctx.lineTo(-15, 2 * auraOpacity);
        ctx.closePath();
        ctx.fill();
        
        // Fast simplified inner core shape
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.moveTo(-12, -2 * auraOpacity);
        ctx.lineTo(35, -3 * auraOpacity);
        ctx.lineTo(80, -5 * auraOpacity);
        ctx.lineTo(80, 3 * auraOpacity);
        ctx.lineTo(35, 1 * auraOpacity);
        ctx.lineTo(-12, 1 * auraOpacity);
        ctx.closePath();
        ctx.fill();

        // Thin black border around the aura shape
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-15, -6 * auraOpacity);
        ctx.lineTo(35, -7 * auraOpacity);
        ctx.lineTo(85, -12 * auraOpacity);
        ctx.lineTo(85, 8 * auraOpacity);
        ctx.lineTo(35, 3 * auraOpacity);
        ctx.lineTo(-15, 2 * auraOpacity);
        ctx.closePath();
        ctx.stroke();
      } else {
        const frameRate = 30;
        // Infinite stepped frames (no modulus snapping)
        const frameIndex = Math.floor(Date.now() / (1000 / frameRate));
        const time = frameIndex * 120;
        // Add velocity/position influence so the flames react naturally as he moves
        const moveOffset = (this.x + this.y) * 0.015;

        // === Volumetric Katana Backlight (Replicating Champion Screen) ===
        ctx.globalCompositeOperation = 'screen';
        const katanaGlow = ctx.createLinearGradient(-15, 0, 85, 0);
        katanaGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 * auraOpacity})`);
        katanaGlow.addColorStop(0.6, `rgba(255, 105, 180, ${0.2 * auraOpacity})`);
        katanaGlow.addColorStop(1, 'rgba(255, 20, 147, 0)');

        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(35, 1.5, 85, -4); // Follows the blade curve
        ctx.lineWidth = 35;
        ctx.lineCap = 'round';
        ctx.strokeStyle = katanaGlow;
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';

        // Generate outer flame points (Viscous Liquid Fire Silhouette)
        let allPoints = [];

        // Top edge (left to right) - Localized flame tongues (flicker instead of slide)
        for (let x = -15; x <= 85; x += 5) {
          let cy = (x > 19) ? (x - 19) * -0.09 : 0;

          // Slow base shape evolution (how tongues grow/morph)
          let baseShape = Math.pow(Math.sin(x * 0.05 + time * 0.0008) * 0.5 + 0.5, 3.0) * 18;

          // Gentle, localized height flicker (smoothed frequency and amplitude)
          let flicker = Math.sin(time * 0.002 + x * 0.2 - moveOffset) * 0.15 + 0.85;

          let topWave = (baseShape * flicker + 3) * auraOpacity;
          allPoints.push({ x: x, y: cy - 4 - topWave });
        }

        // Bottom edge (right to left) - Localized flame tongues
        for (let x = 85; x >= -15; x -= 5) {
          let cy = (x > 19) ? (x - 19) * -0.09 : 0;

          let baseShape = Math.pow(Math.cos(x * 0.06 - time * 0.0006) * 0.5 + 0.5, 2.5) * 18;
          let flicker = Math.cos(time * 0.0025 - x * 0.25 + moveOffset) * 0.15 + 0.85;

          let botWave = (baseShape * flicker + 3) * auraOpacity;
          allPoints.push({ x: x, y: cy + 4 + botWave });
        }

        // Outer flame fill
        ctx.beginPath();
        let mx = (allPoints[allPoints.length - 1].x + allPoints[0].x) / 2;
        let my = (allPoints[allPoints.length - 1].y + allPoints[0].y) / 2;
        ctx.moveTo(mx, my);
        for (let i = 0; i < allPoints.length; i++) {
          let p = allPoints[i];
          let next = allPoints[(i + 1) % allPoints.length];
          let xc = (p.x + next.x) / 2;
          let yc = (p.y + next.y) / 2;
          ctx.quadraticCurveTo(p.x, p.y, xc, yc);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Inner glowing core (shrunk vertically towards the blade)
        ctx.beginPath();
        ctx.moveTo(mx, my * 0.4);
        for (let i = 0; i < allPoints.length; i++) {
          let p = allPoints[i];
          let next = allPoints[(i + 1) % allPoints.length];
          let xc = (p.x + next.x) / 2;
          let yc = (p.y + next.y) / 2;
          // Shrink the y-coordinates tightly around the blade
          ctx.quadraticCurveTo(p.x, p.y * 0.4, xc, yc * 0.4);
        }
        ctx.closePath();
        ctx.fillStyle = coreColor;
        ctx.fill();

        // Primary Ink brush stroke outline (varying thickness like calligraphy brush)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = auraOpacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let mxS = (allPoints[allPoints.length - 1].x + allPoints[0].x) / 2;
        let myS = (allPoints[allPoints.length - 1].y + allPoints[0].y) / 2;
        ctx.moveTo(mxS, myS);
        for (let i = 0; i < allPoints.length; i++) {
          const p = allPoints[i];
          const next = allPoints[(i + 1) % allPoints.length];
          ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.stroke();

        // Chaotic, broken JJK black ink brush cuts & hatches inside the katana aura
        ctx.shadowBlur = 0;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'butt';

        const insetScales = [0.65, 0.8, 0.92]; // Scaled closer to the blade center (inside the pink)
        for (let layer = 0; layer < insetScales.length; layer++) {
          const scale = insetScales[layer];
          const speedDir = (layer % 2 === 0 ? 1 : -1);
          const flowTime = time * 0.003 * speedDir;

          for (let i = 0; i < allPoints.length; i++) {
            // Slow wave (for long strokes) + fast wave (for short details) = variety of longevity
            const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
            const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
            const cutSeed = longWave + shortWave;
            if (cutSeed < 0.15) continue; // Higher threshold to reduce density and clutter

            const p = allPoints[i];
            const next = allPoints[(i + 1) % allPoints.length];

            // Find blade center line for both points to curve correctly
            let pCy = (p.x > 19) ? (p.x - 19) * -0.09 : 0;
            let nextCy = (next.x > 19) ? (next.x - 19) * -0.09 : 0;

            // Scale Y relative to the blade center line so cuts sit inside the pink aura
            let yStart = pCy + (p.y - pCy) * scale;
            let yEnd = nextCy + (next.y - nextCy) * scale;

            ctx.lineWidth = 0.4 + (cutSeed * 1.2);
            ctx.beginPath();
            ctx.moveTo(p.x, yStart);

            // Add a slight jaggedness to the cut
            const jagX = Math.cos(i * 43) * 1.5;
            const jagY = Math.sin(i * 43) * 1.5;

            ctx.lineTo(next.x + jagX, yEnd + jagY);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

      // 1. Kashira (Gold Pommel)
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(-18, -3, 3, 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-18, -3, 3, 6);

      // 2. Tsuka (Black Hilt underwrap)
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(-15, -2.5, 23, 5);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(-15, -2.5, 23, 5);

      // Menuki (Tiny gold ornaments inside the black tsuka gaps)
      ctx.fillStyle = '#DAA520';
      for (let dx = -13.25; dx <= 6; dx += 3.5) {
        ctx.fillRect(dx, -0.5, 1, 1);
      }

      // 3. Tsuka-ito (Red criss-cross wrap pattern)
      ctx.strokeStyle = '#D11A2A'; // Red wrap
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'butt';
      for (let dx = -15; dx <= 6; dx += 3.5) {
        ctx.beginPath();
        ctx.moveTo(dx, -2.5);
        ctx.lineTo(dx + 3.5, 2.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dx + 3.5, -2.5);
        ctx.lineTo(dx, 2.5);
        ctx.stroke();
      }

      // Fuchi (Dark Golden Hilt Collar)
      ctx.fillStyle = '#8B6508';
      ctx.fillRect(8, -2.5, 2, 5);
      ctx.strokeRect(8, -2.5, 2, 5);

      // Left Seppa (Spacer washer)
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(10, -4, 0.8, 8);

      // 4. Tsuba (Golden Rounded Rectangular Guard)
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.moveTo(10.8, -7);
      ctx.quadraticCurveTo(10.8, -8.5, 12.3, -8.5);
      ctx.lineTo(13.3, -8.5);
      ctx.quadraticCurveTo(14.8, -8.5, 14.8, -7);
      ctx.lineTo(14.8, 7);
      ctx.quadraticCurveTo(14.8, 8.5, 13.3, 8.5);
      ctx.lineTo(12.3, 8.5);
      ctx.quadraticCurveTo(10.8, 8.5, 10.8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Tsuba Details (two hitsu-ana holes / engravings in the guard)
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(12.3, -4.5, 1, 1.2);
      ctx.fillRect(12.3, 3.3, 1, 1.2);

      // Right Seppa (Spacer washer)
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(14.8, -4, 0.8, 8);

      // 5. Habaki (Golden Blade Collar)
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(15.6, -2, 3.4, 4);
      ctx.strokeRect(15.6, -2, 3.4, 4);

      // 6. Blade — Curved katana shape with authentic sori (gentle upward arc)
      ctx.beginPath();
      ctx.moveTo(19, -1.8);                             // Spine start
      ctx.quadraticCurveTo(49, -4.2, 81, -8.0);         // Spine curve all the way to the tip point
      ctx.quadraticCurveTo(78, -3.5, 75, -2.2);         // Crescent tip cutting edge sweep
      ctx.quadraticCurveTo(49, 1.2, 19, 2.2);           // Main cutting edge back to habaki
      ctx.closePath();
      ctx.fillStyle = '#E5E8E8';                        // Polished silver steel
      ctx.fill();
      if (auraOpacity > 0.05) {
        ctx.fillStyle = `rgba(255, 20, 147, ${auraOpacity * 0.4})`; // Hot pink cursed glow overlay
        ctx.fill();
      }

      // Second, overlay the dark spine (Shinogi-ji) ending at the Yokote line (tip division)
      ctx.beginPath();
      ctx.moveTo(19, -1.8);
      ctx.quadraticCurveTo(49, -4.0, 75, -6.8);         // Spine top boundary
      ctx.lineTo(75, -4.2);                             // Yokote dividing line
      ctx.quadraticCurveTo(49, -0.8, 19, 0.2);          // Shinogi boundary line
      ctx.closePath();
      ctx.fillStyle = '#2F3538';                        // Dark spine steel
      ctx.fill();
      if (auraOpacity > 0.05) {
        ctx.fillStyle = `rgba(255, 105, 180, ${auraOpacity * 0.35})`; // Pink spine glow tint
        ctx.fill();
      }

      // Hamon line (temper line) — complex wavy boundary line
      ctx.beginPath();
      ctx.moveTo(19, 0.2);
      for (let x = 19; x <= 75; x += 3.5) {
        const waveY = 0.2 - 4.4 * ((x - 19) / 56) + Math.sin(x * 0.75) * 0.45;
        ctx.lineTo(x, waveY);
      }
      ctx.strokeStyle = auraOpacity > 0.05 ? `rgba(255, 240, 245, ${0.65 + auraOpacity * 0.35})` : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Metallic Mune Highlight — bright shine along the back spine of the blade
      ctx.beginPath();
      ctx.moveTo(19, -1.8);
      ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Third, draw a clean black stroke outline over the entire outer blade boundary
      ctx.beginPath();
      ctx.moveTo(19, -1.8);
      ctx.quadraticCurveTo(49, -4.2, 81, -8.0);         // Spine curve to tip point
      ctx.quadraticCurveTo(78, -3.5, 75, -2.2);         // Crescent tip curve
      ctx.quadraticCurveTo(49, 1.2, 19, 2.2);           // Main cutting edge back to habaki
      ctx.closePath();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // 7. Hand holding the hilt (drawn over the hilt wrapper and aura)
      ctx.beginPath();
      ctx.arc(-2, 0.5, getHandSize(5, this), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#000';
      ctx.stroke();

    ctx.restore();

    // --- DRAW DYNAMIC SLASH TRAIL ---
    if (fade > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gunAngle); // Base angle to align the arc

      const arcRadius = this.r + 38; // Trail extends a bit past the blade
      let fullStartAngle, fullEndAngle;
      if (comboIndex === 0) {
        fullStartAngle = -Math.PI * 0.42;
        fullEndAngle = Math.PI * 0.42;
      } else if (comboIndex === 1) {
        fullStartAngle = Math.PI * 0.42;
        fullEndAngle = -Math.PI * 0.42;
      } else if (comboIndex === 2) {
        fullStartAngle = -Math.PI * 0.75;
        fullEndAngle = Math.PI * 0.75;
      }

      const currentEndAngle = fullStartAngle + (fullEndAngle - fullStartAngle) * progress;
      const isAnticlockwise = fullStartAngle > fullEndAngle;
      const glowAlpha = Math.pow(fade, 0.8);

      // Clip region
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const clipOffset = isAnticlockwise ? 0.1 : -0.1;
      ctx.arc(0, 0, arcRadius + 20, fullStartAngle + clipOffset, currentEndAngle, isAnticlockwise);
      ctx.closePath();
      ctx.clip();

      // Fading tail gradient using Yuta's hot pink theme
      const fullStartY = Math.sin(fullStartAngle) * arcRadius;
      const currentY = Math.sin(currentEndAngle) * arcRadius;

      const tailGrad = ctx.createLinearGradient(0, fullStartY, 0, currentY + (fullStartY === currentY ? 0.1 : 0));
      tailGrad.addColorStop(0, 'rgba(255, 20, 147, 0.0)'); // Transparent hot pink
      tailGrad.addColorStop(0.7, 'rgba(255, 105, 180, 0.85)'); // Hot pink body
      tailGrad.addColorStop(1, 'rgba(255, 240, 245, 0.95)'); // Searing white-pink head

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = glowAlpha;

      const numSegments = isGamePlay ? 10 : 30;
      const arcWidth = currentEndAngle - fullStartAngle;

      // =====================================================
      // --- SHARP CRESCENT SLASH (Anime-style, pointed tips)
      // =====================================================
      const maxThickness = 28; // Half-width of the crescent at its widest
      const outerOffset = 8; // Outer crescent is puffed outward from arcRadius
      const innerOffset = 6; // Inner crescent cuts inward from arcRadius

      // Helper: crescent thickness weight at normalised position
      const crescentWeight = (t) => Math.pow(Math.sin(t * Math.PI), 1.5);

      // ------ 1. Main pink crescent body ------
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      // Forward pass — outer edge
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      // Reverse pass — inner edge (creates closed crescent polygon)
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius - innerOffset - maxThickness * w;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      // ------ 2. Bright white-pink core edge (thin inner blade highlight) ------
      const coreGrad = ctx.createLinearGradient(
        Math.cos(fullStartAngle) * arcRadius, Math.sin(fullStartAngle) * arcRadius,
        Math.cos(fullStartAngle + arcWidth) * arcRadius, Math.sin(fullStartAngle + arcWidth) * arcRadius
      );
      coreGrad.addColorStop(0, 'rgba(255, 180, 220, 0.0)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      const coreMax = 7;
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w - 1;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w - 1 - coreMax * w;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      // ------ 3. Sharp outer glow stroke (crescent rim glow) ------
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(255, 100, 200, 0.65)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

      if (isGamePlay) {
        // ------ 4. Radial speed-line spikes near the leading tip (Grouped into 1 path/stroke!) ------
        ctx.strokeStyle = 'rgba(255, 200, 240, 0.85)';
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const spikeRatio = 0.62 + i * 0.09;
          if (spikeRatio > 1.0) continue;
          const spikeAngle = fullStartAngle + arcWidth * spikeRatio;
          if (isAnticlockwise ? (spikeAngle < currentEndAngle) : (spikeAngle > currentEndAngle)) continue;
          const w = crescentWeight(spikeRatio);
          const baseR = arcRadius + outerOffset + maxThickness * w;
          const spikeLen = 10 + Math.abs(Math.sin(spikeRatio * 32.1 + Date.now() * 0.01)) * 18;
          const spikeSeed = Math.sin(spikeRatio * 32.1 + Date.now() * 0.01);
          ctx.moveTo(Math.cos(spikeAngle) * baseR, Math.sin(spikeAngle) * baseR);
          ctx.lineTo(
            Math.cos(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen),
            Math.sin(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen)
          );
        }
        ctx.stroke();
      } else {
        // ------ 4. Ink calligraphy strokes (sparse, interior detail) ------
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineCap = 'butt';
        const inkRadii = [arcRadius - 4, arcRadius + outerOffset * 0.5];
        for (let layer = 0; layer < inkRadii.length; layer++) {
          const radius = inkRadii[layer];
          const segments = 10;
          for (let s = 0; s < segments; s++) {
            const ratio = s / segments;
            const angle = fullStartAngle + arcWidth * ratio;
            if (isAnticlockwise ? (angle < currentEndAngle) : (angle > currentEndAngle)) break;
            const inkSeed = Math.sin(ratio * 14.5 + Date.now() * 0.015 + layer * 23.3);
            if (inkSeed < 0.1) continue;
            const nextAngle = fullStartAngle + arcWidth * ((s + 1) / segments);
            const drawEndAngle = isAnticlockwise
              ? Math.max(nextAngle, currentEndAngle)
              : Math.min(nextAngle, currentEndAngle);
            ctx.lineWidth = 0.8 + (inkSeed + 1) * 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius + Math.sin(s * 19.7) * 2, angle, drawEndAngle, isAnticlockwise);
            ctx.stroke();
          }
        }

        // ------ 5. Radial speed-line spikes near the leading tip ------
        ctx.strokeStyle = 'rgba(255, 200, 240, 0.85)';
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const spikeRatio = 0.62 + i * 0.09;
          if (spikeRatio > 1.0) continue;
          const spikeAngle = fullStartAngle + arcWidth * spikeRatio;
          if (isAnticlockwise ? (spikeAngle < currentEndAngle) : (spikeAngle > currentEndAngle)) continue;
          const w = crescentWeight(spikeRatio);
          const baseR = arcRadius + outerOffset + maxThickness * w;
          const spikeLen = 10 + Math.abs(Math.sin(spikeRatio * 32.1 + Date.now() * 0.01)) * 18;
          const spikeSeed = Math.sin(spikeRatio * 32.1 + Date.now() * 0.01);
          ctx.lineWidth = 1.5 - i * 0.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(spikeAngle) * baseR, Math.sin(spikeAngle) * baseR);
          ctx.lineTo(
            Math.cos(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen),
            Math.sin(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen)
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
  drawDomainBackground(ctx, isClashSecondary = false) { 
    if (typeof state !== 'undefined' && state.pixiApp) return;
    YutaRenderer.drawDomainBackground(ctx, this, isClashSecondary); 
  }
  draw(ctx, opponent) { YutaRenderer.draw(ctx, this, opponent); }
  _drawDomainChannelAura(ctx) { YutaRenderer._drawDomainChannelAura(ctx, this); }
  _drawRika(ctx, opponent, renderState = null) { YutaRenderer._drawRika(ctx, this, opponent, renderState); }
  _drawTopDownArmAndClaw(ctx, shoulderX, shoulderY, handX, handY, isLeft, attackTimer, isGamePlay = false) { YutaRenderer._drawTopDownArmAndClaw(ctx, this, shoulderX, shoulderY, handX, handY, isLeft, attackTimer, isGamePlay); }
  _drawRikaCursedEnergyAura(ctx, opponent, renderState = null) { YutaRenderer._drawRikaCursedEnergyAura(ctx, this, opponent, renderState); }
  _renderYutaAuraFrameCanvas(frameIdx, isRCT) { return YutaRenderer._renderYutaAuraFrameCanvas(this, frameIdx, isRCT); }
  _drawYutaCursedEnergyAura(ctx) { YutaRenderer._drawYutaCursedEnergyAura(ctx, this); }
  _drawYutaSwordBag(ctx) { YutaRenderer._drawYutaSwordBag(ctx, this); }
  _drawYutaSwordStrap(ctx) { YutaRenderer._drawYutaSwordStrap(ctx, this); }
}
