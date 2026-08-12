import { YutaRenderer } from '../../graphics/fighters/yutaRenderer.js';
import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnParrySparksEffect } from '../../graphics/particles/sparkEffect.js';
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

    // Pure Love Beam
    this.hasUsedPureLoveBeam = false;
    this.isChannelingPureLoveBeam = false;
    this.isFiringPureLoveBeam = false;
    this.pureLoveBeamChargeTimer = 0;
    this.pureLoveBeamActiveTimer = 0;
    this.pureLoveBeamCooldownTimer = 0;

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
    if (this.isChannelingPureLoveBeam || this.isFiringPureLoveBeam || (this.pureLoveBeamBreatherTimer > 0)) return 0;
    const isGuarding = this.blockPoseTimer > 0;
    const baseChance = isGuarding ? (CONFIG.yuta.parryActiveChance ?? 0.90) : (CONFIG.yuta.parryPassiveChance ?? 0.90);
    const stackBonus = (this.parryStacks || 0) * (CONFIG.yuta?.parryChancePerStack ?? 0.05);
    return Math.min(0.98, baseChance + stackBonus);
  }

  aim(target) {
    if (this.isFiringPureLoveBeam) {
      return; // Disable aim rotation ONLY while actively FIRING the beam!
    }
    super.aim(target);
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
    this.hasUsedPureLoveBeam = false;
    this.isChannelingPureLoveBeam = false;
    this.isFiringPureLoveBeam = false;
    this.pureLoveBeamChargeTimer = 0;
    this.pureLoveBeamActiveTimer = 0;
    this.pureLoveBeamCooldownTimer = 0;
    this.pureLoveBeamBreatherTimer = 0;
    this.rikaEmergingForBeamTimer = 0;
    this.domain2HpBaseline = undefined;
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

    if (this.isChannelingDomain || this.isChannelingPureLoveBeam || (this.rikaCallTimer > 0) || (this.rikaEmergingForBeamTimer > 0)) {
      // Hyper-Armor: Yuta is immune to timeStop, hitStun, & Gojo Infinity freeze while channeling domain, calling Rika, or beam
      this.timeStopTimer = 0;
      this.isFrozenByInfinity = false;
      this.hitStunTimer = 0;
      this.knockbackStunTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      // Domain channeling, Pure Love Beam, Rika Emergence/Call, & active domain have hyper-armor — do NOT cancel them via interruptAttacks().
      if (!this.isChannelingDomain && !this.domainActive && !this.isChannelingPureLoveBeam && !this.isFiringPureLoveBeam && !this.rikaEmergingForBeamTimer && (this.rikaCallTimer <= 0) && !this.isChannelingThinIceBreaker) {
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
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.hitStunTimer = 0;
      this.knockbackStunTimer = 0;

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

    // Smoothly fade Rika herself in/out (Rika slowly fades out during final 30 frames of Pure Love Beam)
    if (this.rikaAlpha === undefined) this.rikaAlpha = 0;
    let targetRika = (this.rika && this.rika.active && !this.rika.isDying) ? 1.0 : 0.0;
    if (this.isFiringPureLoveBeam) {
      const fadeFrames = 30;
      if (this.pureLoveBeamActiveTimer < fadeFrames) {
        targetRika = Math.max(0, this.pureLoveBeamActiveTimer / fadeFrames);
      } else {
        targetRika = 1.0;
      }
    } else if (this.isChannelingPureLoveBeam) {
      targetRika = 1.0;
    }

    if (this.rikaAlpha < targetRika) {
      this.rikaAlpha = Math.min(targetRika, this.rikaAlpha + 0.05); // Fades in over 20 frames
    } else if (this.rikaAlpha > targetRika) {
      this.rikaAlpha = Math.max(targetRika, this.rikaAlpha - 0.04); // Fades out over 25 frames
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
    if (this.pureLoveBeamCooldownTimer > 0) this.pureLoveBeamCooldownTimer--;

    if (this.isChannelingPureLoveBeam) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.hitStunTimer = 0; // Pure Love Beam Hyper-Armor

      if (this.rika && this.rika.active && this.rika.hp > 0) {
        const totalFrames = (CONFIG.yuta?.pureLoveBeamChargeFrames || 90) + (CONFIG.yuta?.pureLoveBeamDuration || 60);
        const drainPerFrame = (this.rika.maxHp || 250) / totalFrames;
        this.rika.hp = Math.max(0, this.rika.hp - drainPerFrame);
      }

      if (opponent && !opponent.isDead) {
        this.aim(opponent); // Continuously track and aim at opponent while charging
      }

      this.pureLoveBeamChargeTimer++;

      // Massive energy gathering visuals
      if (this.pureLoveBeamChargeTimer % 2 === 0) {
        spawnSparks(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*100, 3, 'silver', { color: 'rgba(255, 105, 180, 1)', blendMode: 0 });
      }
      if (this.pureLoveBeamChargeTimer % 10 === 0) {
        spawnImpactFlash(this.x, this.y, 65, 'rgba(255, 20, 147, 0.5)');
        triggerGlobalScreenShake(5, 8);
      }

      // Voice Line
      if (this.pureLoveBeamChargeTimer === 1) {
        const chargeSound = getSkillSound(this._def?.id || 'yuta', 'pure_love_beam_charge');
        if (chargeSound) {
          audioSystem.playSFX(chargeSound.src, chargeSound.volume);
        } else if (CONFIG.yuta?.pureLoveBeamChargeSound) {
          audioSystem.playSFX(CONFIG.yuta.pureLoveBeamChargeSound, 3.0);
        } else {
          audioSystem.playSFX('skill_cursedspeech', 2.0); // Placeholder powerful sound
        }
      }

      const chargeMax = CONFIG.yuta.pureLoveBeamChargeFrames || 90;
      if (this.pureLoveBeamChargeTimer >= chargeMax) {
        this.activatePureLoveBeam();
      }
      return; // Stop other logic while channeling
    }

    if (this.isFiringPureLoveBeam && this.pureLoveBeamActiveTimer > 0) {
      this.pureLoveBeamActiveTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.hitStunTimer = 0; // Lock movement and hyper-armor until beam expires

      if (this.rika && this.rika.active && this.rika.hp > 0) {
        const totalFrames = (CONFIG.yuta?.pureLoveBeamChargeFrames || 90) + (CONFIG.yuta?.pureLoveBeamDuration || 60);
        const drainPerFrame = (this.rika.maxHp || 250) / totalFrames;
        this.rika.hp = Math.max(0, this.rika.hp - drainPerFrame);
      }
      if (this.pureLoveBeamActiveTimer <= 0) {
        this.isFiringPureLoveBeam = false;
        this.pureLoveBeamBreatherTimer = 60; // 1-second post-beam breather recovery pause!
        
        // Despawn Rika now that beam has expired and she has faded out
        if (this.rika) {
          this.rika.hp = 0;
          this.rika.isDying = true;
          this.rika.deathTimer = 1;
          this.rika.disappearing = true;
          this.rika.active = false;
          this.rika.isSacrificingForBeam = false;
          this.rika.cooldownTimer = 0;
          this.rika.hasSummonedAt50Hp = true;
        }
      }
      return; // Stop movement & attacks while firing beam
    }

    // Post-Pure Love Beam Breather Recovery (Yuta pauses to catch his breath)
    if (this.pureLoveBeamBreatherTimer > 0) {
      this.pureLoveBeamBreatherTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      
      // Exhaustion steam/breath puff visuals popping near Yuta
      if (this.pureLoveBeamBreatherTimer % 12 === 0) {
        const headX = this.x + Math.cos(this.gunAngle) * 12;
        const headY = this.y + Math.sin(this.gunAngle) * 12;
        spawnSparks(headX, headY, 2, 'rgba(255, 255, 255, 0.8)', { color: 'rgba(220, 220, 240, 0.5)' });
      }
      return; // Pause actions during post-beam breather recovery
    }

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
        this.domainCooldown = 0;
        this.domain2HpBaseline = this.hp; // Snapshot HP baseline when 1st domain ends
        spawnFloatingText(this.x, this.y - 40, 'DOMAIN ENDED', '#cccccc');

        // If Rika died during domain, snapshot Yuta's HP so taking damage outside domain starts recharging Rika!
        if (this.rika && (!this.rika.active || this.rika.isDying || this.rika.hp <= 0)) {
          this.rika.hasSummonedAt50Hp = true;
          this.rikaRechargeHpBaseline = this.hp;
        }
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

    // Domain Trigger (Up to 2 activations per round): Based strictly on taking HP damage!
    const hpRatio = this.hp / (this.maxHp || 200);
    const domainHpThreshold1 = CONFIG.yuta?.domainHpThreshold ?? 0.80;  // 1st Domain at 80% HP
    const maxDomainUses = CONFIG.yuta?.domainMaxUses || 2;

    // For 2nd Domain Expansion, Yuta MUST get hit and lose additional HP (20% max HP damage) AFTER 1st domain ends!
    const hpDamageNeededFor2ndDomain = (this.maxHp || 200) * (CONFIG.yuta?.domain2HpDamageRequired ?? 0.20);
    const hpLostSince1stDomain = this.domain2DamageTaken || 0;

    const canActivate = (!this.domainActive && !this.isChannelingDomain && (this.domainUseCount < maxDomainUses) && !this.isDying && this.hp > 0);
    const isFirstTrigger = (this.domainUseCount === 0 && hpRatio <= domainHpThreshold1);
    const isSecondTrigger = (this.domainUseCount === 1 && hpLostSince1stDomain >= hpDamageNeededFor2ndDomain);

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

    // Handle Pre-Beam Rika Emergence Phase (Rika appears in the arena first before Yuta channels the beam)
    if (this.rikaEmergingForBeamTimer > 0) {
      this.rikaEmergingForBeamTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      if (this.rika) {
        const prog = (25 - this.rikaEmergingForBeamTimer) / 25;
        this.rika.spawnScale = Math.min(1.0, 0.1 + prog * 0.9);
        this.rikaAlpha = Math.min(1.0, prog);

        // Glue Rika directly behind Yuta's back while she manifests
        const backAngle = this.gunAngle + Math.PI;
        const backDist = (this.r || 22) + 24;
        this.rika.x = this.x + Math.cos(backAngle) * backDist;
        this.rika.y = this.y + Math.sin(backAngle) * backDist;
        this.rika.angle = this.gunAngle;
        this.rika.vx = 0;
        this.rika.vy = 0;
      }
      return; // Hold Yuta in emergence pose until Rika is fully manifested!
    }

    // Pure Love Beam Trigger: Automatically triggers when HP <= 15%
    const pureLoveBeamThreshold = CONFIG.yuta.pureLoveBeamHpThreshold ?? 0.15;
    if (!this.isDemoFighter && (this.pureLoveBeamCooldownTimer || 0) <= 0 && !this.isChannelingPureLoveBeam && !this.isFiringPureLoveBeam && !this.isChannelingDomain && !this.domainActive && hpRatio <= pureLoveBeamThreshold) {
      const isRikaActive = (this.isRikaAliveInDomain() || (this.rika && this.rika.active && !this.rika.isDying && !this.rika.disappearing && this.rika.hp > 0));

      if (!isRikaActive) {
        return; // Pure Love Beam REQUIRES Rika to be active on the field! Cannot fire if Rika is dead.
      }

      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      const hasEnemies = state.fighters.some((f, idx) => {
        if (!f || f.hp <= 0 || f === this) return false;
        const eTeam = state.getFighterTeam(idx);
        return myTeam === null || eTeam === null || myTeam !== eTeam;
      });

      if (hasEnemies) {
        this.isChannelingPureLoveBeam = true;
        this.pureLoveBeamChargeTimer = 0;
        this.vx = 0;
        this.vy = 0;

          // Teleport away from enemy to a safe distance (320px) before performing Pure Love Beam
          let targetEnemy = opponent;
          if (!targetEnemy || targetEnemy.isDead) {
            const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
            targetEnemy = state.fighters.find((f, idx) => {
              if (!f || f.hp <= 0 || f === this) return false;
              const eTeam = state.getFighterTeam(idx);
              return myTeam === null || eTeam === null || myTeam !== eTeam;
            });
          }

          if (targetEnemy) {
            const oldX = this.x;
            const oldY = this.y;
            let awayAngle = Math.atan2(this.y - targetEnemy.y, this.x - targetEnemy.x);
            if (Math.hypot(this.x - targetEnemy.x, this.y - targetEnemy.y) < 1) {
              awayAngle = Math.random() * Math.PI * 2;
            }
            const retreatDist = 320;
            let destX = targetEnemy.x + Math.cos(awayAngle) * retreatDist;
            let destY = targetEnemy.y + Math.sin(awayAngle) * retreatDist;

            // Clamp destination inside arena boundaries
            if (arena) {
              const margin = (this.r || 22) + 25;
              destX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, destX));
              destY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, destY));
            }

            this.x = destX;
            this.y = destY;

            // Rule #3: ALWAYS update aim(target) immediately after position change so gunAngle aligns relative to target
            this.aim(targetEnemy);

            // Spawns teleport afterimages, pink flashes, and teleport SFX
            this._spawnTeleportAfterimages(oldX, oldY, destX, destY, this.gunAngle);
            spawnImpactFlash(oldX, oldY, 35, '#FF1493');
            spawnImpactFlash(destX, destY, 35, '#FF1493');
            audioSystem.playSFX('teleport', 1.2);
          }

          triggerGlobalScreenShake(10, 60); // Initial massive tremor
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
    if (this.hp > 0 && !this.isChannelingDomain && !this.domainActive && !this.isChannelingPureLoveBeam && !this.isFiringPureLoveBeam) {
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
      spawnParrySparksEffect(flashX, flashY);
      triggerGlobalScreenShake(4, 10); // Parry shake

      // Apply physical pushback / deflection bounce to attacker & Yuta
      if (attacker && attacker !== this && !attacker.isDead) {
        let dx = attacker.x - this.x;
        let dy = (attacker.y - (attacker.z || 0)) - (this.y - (this.z || 0));
        let dist = Math.hypot(dx, dy);
        if (dist < 0.1) {
          dx = Math.cos(this.gunAngle || 0);
          dy = Math.sin(this.gunAngle || 0);
          dist = 1.0;
        }
        const nx = dx / dist;
        const ny = dy / dist;

        // Push attacker backward from deflection impact
        attacker.vx = nx * 5.0;
        attacker.vy = ny * 5.0;

        // Yuta recoils slightly backward from heavy clash
        this.vx = -nx * 1.8;
        this.vy = -ny * 1.8;
      }

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

    const result = super.takeDamage(amount, attacker, opts);
    if (result && amount > 0) {
      if (this.domainUseCount === 1 && !this.domainActive) {
        this.domain2DamageTaken = (this.domain2DamageTaken || 0) + amount;
      }
    }
    return result;
  }

  resolveWallBounce(arena, opponent) {
    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;
    const restitution = CONFIG.collision.restitution || 0.8;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
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

      const isTargetGojoInfinity = target && (target.characterId === 'gojo' || target.type === 'gojo') && !target.isMeleeMode && ((target.infinityCooldown || 0) <= 0 || target.infinityActive);

      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed || 8;

      if (target && !isTargetGojoInfinity) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
        this.aim(target);
      } else {
        if (bouncedX) this.vx = -this.vx * restitution;
        if (bouncedY) this.vy = -this.vy * restitution;
      }
    }
  }

  activatePureLoveBeam() {
    this.isChannelingPureLoveBeam = false;
    this.isFiringPureLoveBeam = true;
    this.pureLoveBeamActiveTimer = CONFIG.yuta?.pureLoveBeamDuration || 180;
    this.pureLoveBeamCooldownTimer = CONFIG.yuta?.pureLoveBeamCooldown || 1200;

    if (CONFIG.yuta?.pureLoveBeamFireSound) {
      audioSystem.playSFX(CONFIG.yuta.pureLoveBeamFireSound, 3.5);
    } else {
      audioSystem.playSFX('skill_finalflash', 2.5); // Epic massive beam sound
    }

    // Keep Rika active during beam firing (she will fade out as the beam expires)
    if (this.rika) {
      this.rika.isSacrificingForBeam = true;
    }

    // Fire massive beam projectile originating in front of Yuta's hand
    const offsetDist = (this.r || 22) + 14;
    projectileSystem.projectiles.push({
      owner: state.fighters.indexOf(this),
      x: this.x + Math.cos(this.gunAngle) * offsetDist,
      y: this.y + Math.sin(this.gunAngle) * offsetDist,
      vx: Math.cos(this.gunAngle) * 20, // Used for logical bounding box extension, actual velocity can be faster or instant
      vy: Math.sin(this.gunAngle) * 20,
      angle: this.gunAngle,
      r: CONFIG.yuta.pureLoveBeamWidth || 170, // Beam thickness (Increased size)
      length: CONFIG.yuta.pureLoveBeamLength || 2500, // Screen spanning
      damage: CONFIG.yuta.pureLoveBeamDamagePerTick || 12, // per tick
      knockback: CONFIG.yuta.pureLoveBeamKnockback || 6,
      life: CONFIG.yuta.pureLoveBeamDuration || 60,
      maxLife: CONFIG.yuta.pureLoveBeamDuration || 60,
      visual: 'yuta_pure_love_beam',
      piercing: true,
      hitTargets: new Set() // Will track hit targets per tick or clear out to hit multiple times
    });

    // Massive screen shake and recoil
    triggerGlobalScreenShake(15, 60);
    this.vx = -Math.cos(this.gunAngle) * 8; // Heavy recoil pushback
    this.vy = -Math.sin(this.gunAngle) * 8;
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
      this.rika.deathTimer = 0;
      this.rika.disappearTimer = 0;
      this.rika.isSacrificingForBeam = false;
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


  applyKnockback(vx, vy) {
    // Hyper-Armor Immunity: Ignore physical pushback velocity during Rika summon channeling, beam casting, or domain expansion
    if ((this.rikaCallTimer || 0) > 0 || (this.rikaEmergingForBeamTimer || 0) > 0 || this.isChannelingDomain || this.isChannelingPureLoveBeam || this.isFiringPureLoveBeam) {
      return;
    }
    super.applyKnockback(vx, vy);
  }

  applyHitStun(duration) {
    // Hyper-Armor Immunity: Ignore hit stun during Rika summon channeling, beam casting, or domain expansion
    if ((this.rikaCallTimer || 0) > 0 || (this.rikaEmergingForBeamTimer || 0) > 0 || this.isChannelingDomain || this.isChannelingPureLoveBeam || this.isFiringPureLoveBeam) {
      return;
    }
    super.applyHitStun(duration);
  }

  interruptAttacks(forceCancelAll = false) {
    const wasChannelingDomain = this.isChannelingDomain;
    const currentDomainCharge = this.domainChargeTimer;

    const wasChannelingBeam = this.isChannelingPureLoveBeam;
    const currentBeamCharge = this.pureLoveBeamChargeTimer;

    const wasFiringBeam = this.isFiringPureLoveBeam;
    const currentBeamActive = this.pureLoveBeamActiveTimer;

    const wasEmergingRika = (this.rikaEmergingForBeamTimer > 0);
    const currentEmergingRika = this.rikaEmergingForBeamTimer;

    const wasRikaCalling = (this.rikaCallTimer > 0);
    const currentRikaCall = this.rikaCallTimer;

    const wasChannelingIce = this.isChannelingThinIceBreaker;
    const currentIceCharge = this.thinIceBreakerChargeTimer;

    super.interruptAttacks(forceCancelAll);

    if (forceCancelAll) {
      this.isChannelingDomain = false;
      this.domainChargeTimer = 0;
      this.isChannelingPureLoveBeam = false;
      this.pureLoveBeamChargeTimer = 0;
      this.isFiringPureLoveBeam = false;
      this.pureLoveBeamActiveTimer = 0;
      this.rikaEmergingForBeamTimer = 0;
      this.rikaCallTimer = 0;
      this.isChannelingThinIceBreaker = false;
      this.thinIceBreakerChargeTimer = 0;
      return;
    }

    // Hyper-Armor Protection: Preserve Yuta's channeling states against normal hitstun/slashes!
    // ONLY Toji ISOH ambush or explicit silence can break Yuta's ultimate hyper-armor.
    if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
      this.isChannelingDomain = false;
      this.domainChargeTimer = 0;
      this.isChannelingPureLoveBeam = false;
      this.pureLoveBeamChargeTimer = 0;
      this.isFiringPureLoveBeam = false;
      this.pureLoveBeamActiveTimer = 0;
      this.rikaEmergingForBeamTimer = 0;
      this.rikaCallTimer = 0;
      this.isChannelingThinIceBreaker = false;
      this.thinIceBreakerChargeTimer = 0;
      return;
    }

    if (wasChannelingDomain) {
      this.isChannelingDomain = true;
      this.domainChargeTimer = currentDomainCharge;
    }
    if (wasChannelingBeam) {
      this.isChannelingPureLoveBeam = true;
      this.pureLoveBeamChargeTimer = currentBeamCharge;
    }
    if (wasFiringBeam) {
      this.isFiringPureLoveBeam = true;
      this.pureLoveBeamActiveTimer = currentBeamActive;
    }
    if (wasEmergingRika) {
      this.rikaEmergingForBeamTimer = currentEmergingRika;
    }
    if (wasRikaCalling) {
      this.rikaCallTimer = currentRikaCall;
    }
    if (wasChannelingIce) {
      this.isChannelingThinIceBreaker = true;
      this.thinIceBreakerChargeTimer = currentIceCharge;
    }
  }

  _drawPureLoveBeamChargePose(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.gunAngle);
    
    const chargeFrames = CONFIG.yuta?.pureLoveBeamChargeFrames || 90;
    const progress = Math.max(0, Math.min(1, (this.pureLoveBeamChargeTimer || 0) / chargeFrames));
    const isFiring = this.isFiringPureLoveBeam;
    const pVal = isFiring ? 1.0 : progress;

    // Smooth fade out & shrink as the beam is about to expire
    let fadeAlpha = 1.0;
    if (isFiring && this.pureLoveBeamActiveTimer !== undefined) {
      const fadeFrames = 30; // Final 30 frames before beam expires
      if (this.pureLoveBeamActiveTimer < fadeFrames) {
        fadeAlpha = Math.max(0, this.pureLoveBeamActiveTimer / fadeFrames);
      }
    }
    
    // Hand circle position (extended forward)
    const handX = (this.r || 22) + 4 + pVal * 6;
    const handY = 10;
    
    // Hand circle
    ctx.fillStyle = this.color || '#EAE3F2';
    ctx.beginPath();
    ctx.arc(handX, handY, getHandSize ? getHandSize(6, this) : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Growing authentic JJK Brush Cursed Energy orb directly over the hand
    if ((pVal > 0 || isFiring) && fadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha *= fadeAlpha;

      const time = Date.now();

      // Stage 1: Inward Converging Particle Embers (Gathering from surrounding air to form the orb)
      const numEmbers = 28;
      for (let i = 0; i < numEmbers; i++) {
        const emberSeed = i * 13.37;
        const speedMultiplier = 0.004 + (i % 5) * 0.002;
        // Inward gathering velocity contracts towards hand center
        const cycleProgress = ((time * speedMultiplier + emberSeed) % 1.0);
        // During early channeling (pVal < 0.25), particles gather from wide radius (up to 110px)
        const gatherRadius = (pVal < 0.25) ? (110 - pVal * 200) : (40 + (1 - pVal) * 50);
        const dist = Math.max(0, (1 - cycleProgress) * Math.max(15, gatherRadius));
        const angle = cycleProgress * Math.PI * 6 + emberSeed;
        
        const ex = handX + Math.cos(angle) * dist;
        const ey = handY + Math.sin(angle) * dist;
        const emberR = 1.2 + (i % 3) * 0.8;

        // Draw inward flying particle ember dot & trailing streak
        ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : 'rgba(255, 105, 180, 0.9)';
        ctx.beginPath();
        ctx.arc(ex, ey, emberR, 0, Math.PI * 2);
        ctx.fill();

        const tailX = ex + Math.cos(angle) * (emberR * 3);
        const tailY = ey + Math.sin(angle) * (emberR * 3);
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.6)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      // Early Gathering Phase (pVal < 0.25): ONLY particles gather into a small spark core!
      // Solid orb body ignites ONLY after particles condense (pVal >= 0.25)!
      if (pVal < 0.25 && !isFiring) {
        // Draw small igniting spark core as particles converge
        const sparkR = pVal * 16;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(handX, handY, Math.max(1, sparkR), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // 20 FPS Quantized Frame Step (50ms interval) for electric snappy animation
      const frameStep20 = Math.floor(Date.now() / 50);
      const pseudoRand = (seed) => {
        const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      // Stage 2: Solid Orb Formation & Expansion (pVal >= 0.25 or isFiring)
      const orbScale = isFiring ? 1.0 : Math.max(0, (pVal - 0.25) / 0.75);
      const baseRadius = (4 + orbScale * 20) * (0.2 + 0.8 * fadeAlpha); // Grows smoothly and shrinks on fade-out
      const pulse = Math.sin(frameStep20 * 0.4) * 2 * fadeAlpha;
      const r = Math.max(1, baseRadius + pulse);

      // 1. Broad Magenta/Violet Ambient Glow Halo behind the orb & Yuta
      const haloGrad = ctx.createRadialGradient(handX, handY, 0, handX, handY, r * 4.5);
      haloGrad.addColorStop(0, 'rgba(255, 0, 200, 0.6)');
      haloGrad.addColorStop(0.35, 'rgba(180, 0, 220, 0.35)');
      haloGrad.addColorStop(0.7, 'rgba(100, 0, 160, 0.15)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(handX, handY, r * 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 1.5 Snappy Electric Lightning Arcs (Randomized non-repetitive 20 FPS electric crackles)
      const numLightning = 5;
      for (let i = 0; i < numLightning; i++) {
        const lAngle = (i / numLightning) * Math.PI * 2 + (pseudoRand(frameStep20 * 13 + i * 47) - 0.5) * 0.8;
        const maxLDist = r * (2.2 + pseudoRand(frameStep20 * 19 + i * 29) * 0.8);
        ctx.strokeStyle = (pseudoRand(frameStep20 * 7 + i * 3) > 0.4) ? '#FF007F' : '#FFFFFF';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        let lx = handX, ly = handY;
        ctx.moveTo(lx, ly);
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          const stepR = (maxLDist / steps) * s;
          const jag = (pseudoRand(frameStep20 * 31 + i * 17 + s * 101) - 0.5) * 16;
          lx = handX + Math.cos(lAngle) * stepR + Math.sin(lAngle) * jag;
          ly = handY + Math.sin(lAngle) * stepR + Math.cos(lAngle) * jag;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }

      // 2. Radiating Needle Light Rays (20 FPS Stepped)
      const numRays = 14;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < numRays; i++) {
        const rayAngle = (i / numRays) * Math.PI * 2 + (frameStep20 * 0.05);
        const rayLen = r * (1.6 + pseudoRand(frameStep20 * 11 + i * 13) * 0.8);
        const rx = handX + Math.cos(rayAngle) * rayLen;
        const ry = handY + Math.sin(rayAngle) * rayLen;
        
        ctx.strokeStyle = (i % 3 === 0) ? '#000000' : 'rgba(255, 60, 200, 0.85)';
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(rx, ry);
        ctx.stroke();
      }

      // 3. Generate randomized electric contour points for the orb body (Non-repetitive 20 FPS step noise)
      const numPoints = 20;
      const orbPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const a = (i / numPoints) * Math.PI * 2;
        const elecDistortion = (pseudoRand(frameStep20 * 53 + i * 137) - 0.5) * 5.0;
        const currentR = r + elecDistortion;
        orbPoints.push({
          x: handX + Math.cos(a) * currentR,
          y: handY + Math.sin(a) * currentR
        });
      }

      // 4. Fill main magenta body
      ctx.fillStyle = '#E6007A';
      ctx.beginPath();
      ctx.moveTo(orbPoints[0].x, orbPoints[0].y);
      for (let i = 0; i < numPoints; i++) {
        const p = orbPoints[i];
        const next = orbPoints[(i + 1) % numPoints];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.fill();

      // Outer pitch-black Calligraphy ink contour
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 5. Snappy Randomized Electric Calligraphy Ink Hatch Cuts (20 FPS stepped, non-repetitive)
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'square';
      const insetScales = [0.84, 0.93, 1.06];
      for (let layer = 0; layer < insetScales.length; layer++) {
        const scale = insetScales[layer];
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const cutSeed = pseudoRand(frameStep20 * 73 + layer * 31 + i * 19);
          if (cutSeed < 0.35) continue; // Random electric gaps

          const p = orbPoints[i];
          const next = orbPoints[(i + 1) % numPoints];
          
          const pScaleX = handX + (p.x - handX) * scale;
          const pScaleY = handY + (p.y - handY) * scale;
          const nextScaleX = handX + (next.x - handX) * scale;
          const nextScaleY = handY + (next.y - handY) * scale;

          const jagX = (pseudoRand(frameStep20 * 41 + i * 13 + layer * 7) - 0.5) * 6.0;
          const jagY = (pseudoRand(frameStep20 * 97 + i * 23 + layer * 11) - 0.5) * 6.0;
          ctx.moveTo(pScaleX, pScaleY);
          ctx.lineTo(nextScaleX + jagX, nextScaleY + jagY);
        }
        ctx.lineWidth = layer === 2 ? 2.0 : 1.4;
        ctx.stroke();
      }

      // 6. Inner Hot Magenta Core Fill
      ctx.fillStyle = '#FF20AA';
      ctx.beginPath();
      ctx.moveTo(handX + (orbPoints[0].x - handX) * 0.65, handY + (orbPoints[0].y - handY) * 0.65);
      for (let i = 0; i < numPoints; i++) {
        const p = orbPoints[i];
        const next = orbPoints[(i + 1) % numPoints];
        const px = handX + (p.x - handX) * 0.65;
        const py = handY + (p.y - handY) * 0.65;
        const nx = handX + (next.x - handX) * 0.65;
        const ny = handY + (next.y - handY) * 0.65;
        ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
      }
      ctx.closePath();
      ctx.fill();

      // 7. Clean White Circular Core
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = 'rgba(255, 204, 238, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(handX, handY, Math.max(3, r * 0.42), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
    
    ctx.restore();
  }

  drawGun(ctx) {
    if (this.isChannelingPureLoveBeam || this.isFiringPureLoveBeam) {
      this._drawPureLoveBeamChargePose(ctx);
      return;
    }

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
