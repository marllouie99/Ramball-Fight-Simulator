import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound, stopLoopingSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawDivineFlameArrowConstruct } from '../../graphics/draw.js';

export class SukunaFighter extends Fighter {
  constructor(def) {
    super(def);

    // Bind basic attack cooldown to the specific Sukuna config
    this.shootCooldownMax = CONFIG.sukuna.slashCooldown || 100;

    // Reverse Cursed Technique (Passive)
    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;

    // Martial Arts combo counter for close distance basic attack
    this.martialArtsComboCount = 0;

    // Gojo-style Melee Combat Mode
    this.isMeleeMode = false;
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;
    this.meleeComboTarget = 0;
    this.meleePunchCooldown = 0;

    // Divine Flame / Furnace (Skill 2 - Active state)
    this.divineFlameCooldown = 500; // Delay initial cast
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameChargeMax = CONFIG.sukuna.divineFlameChargeMax || 90;
    this.divineFlameRecoveryTimer = 0;

    // Domain Expansion: Malevolent Shrine (Ultimate)
    this.domainCooldown = CONFIG.sukuna.domainCooldown ?? 1000; // Delay initial cast reads from CONFIG
    this.domainActive = false;
    this.isChannelingDomainExpansion = false;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.sukuna.domainChargeMax || 90; // 1.5 seconds channel
    this.domainUseCount = 0; // Allows domain to be cast up to 2 times per round
    this.domainTimeInsideMap = new Map(); // Tracks enemy frames inside domain for ramping damage

    // Bleed debuff tracking
    this.bleedStacks = new Map(); // Map fighter index -> stack count

    // Phantom Flurry + Cleave (Skill 1)
    this.flurryCooldown = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.rapidSlashHitsLeft = 0;
    this.rapidSlashTimer = 0;
    this.afterImages = []; // Red afterimages for teleport effect
    this.posHistory = []; // Position history for delayed auto-aim during flurry

    // Gojo-style Melee Combat Visuals (for Phantom Flurry)
    this.hitFlameWisps = []; // Residual stretched cursed energy flame wisps on hit
    this.combatAuraOpacity = 0; // Smooth fade-in & fade-out opacity for cursed energy aura
    this.sakugaImpactTimer = 0;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = 0;
    this.sakugaImpactY = 0;
    this.sakugaImpactAngle = 0;
    this.sakugaImpactSeed = 0;

    // Sound cooldown to prevent audio stacking
    this._slashSoundCooldown = 0;
  }

  reset() {
    super.reset();

    // Stop the Fuga charge audio if resetting
    if (this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }

    this.reverseCursedTechniqueCooldown = CONFIG.sukuna.reverseCursedTechniqueCooldown || 1200;
    this.reverseCursedTechniqueTriggered = false;
    this.martialArtsComboCount = 0;

    this.isMeleeMode = false;
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;
    this.meleeComboTarget = 0;
    this.meleePunchCooldown = 0;

    this.divineFlameCooldown = 500;
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameChargeMax = CONFIG.sukuna.divineFlameChargeMax || 90;
    this.divineFlameRecoveryTimer = 0;

    this.domainCooldown = CONFIG.sukuna.domainCooldown ?? 1000;
    this.isChannelingDomainExpansion = false;
    this.domainChargeTimer = 0;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainUseCount = 0;
    if (this.domainTimeInsideMap) {
      this.domainTimeInsideMap.clear();
    } else {
      this.domainTimeInsideMap = new Map();
    }
    if (this.bleedStacks) {
      this.bleedStacks.clear();
    } else {
      this.bleedStacks = new Map();
    }
    this.flurryCooldown = 0; // Skill 1 available at start of round
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.afterImages = [];
    this.posHistory = [];
    this.hitFlameWisps = [];
    this.combatAuraOpacity = 0;
    this.sakugaImpactTimer = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    const result = super.takeDamage(amount, attacker, opts);

    // Check for Reverse Cursed Technique trigger on fatal hit or low HP
    if (!opts.isHeal && this.reverseCursedTechniqueCooldown <= 0 && !this.isDead) {
      const threshold = CONFIG.sukuna.reverseCursedTechniqueHpThreshold || 0.30;
      const hpPercent = this.hp / this.maxHp;

      // Trigger if HP drops below threshold OR if this was a fatal hit
      if ((hpPercent <= threshold && hpPercent > 0) || (this.hp <= 0 && amount > 0)) {
        this._activateReverseCursedTechnique(attacker);
      }
    }

    return result;
  }

  shoot(ownerIndex) {
    if (!projectileSystem) return;

    // Find closest valid enemy target
    let closestEnemy = null;
    let minDist = Infinity;
    const myTeam = state.getFighterTeam(ownerIndex);

    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closestEnemy = f;
            }
          }
        }
      });
    }

    if (!closestEnemy) return; // No targets available (e.g., won the match)

    const slashDamage = CONFIG.sukuna.slashDamage ?? this.damage;
    const slashSpeed = CONFIG.sukuna.slashSpeed ?? (CONFIG.projectile.speed * 1.5);

    // Ranged Attack: Dismantle Slash
    projectileSystem.fireProjectile(
      this,
      ownerIndex,
      slashDamage,
      false,
      slashSpeed,
      false,
      'ghostBlade'
    );
    spawnFloatingText(this.x, this.y - this.r - 20, 'DISMANTLE!', '#E0E8FF');
    if (this._slashSoundCooldown <= 0) {
      playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
      playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.5);
      this._slashSoundCooldown = 15; // ~0.25 seconds at 60fps
    }

    // Spawn slash visual on target & hand cursed energy flash
    this.slashGlowTimer = 25;
    if (!this.slashHitVisuals) this.slashHitVisuals = [];
    this.slashHitVisuals.push({
      x: closestEnemy.x,
      y: closestEnemy.y,
      angle: this.gunAngle,
      timer: 12,
      maxTimer: 12,
      scale: 1.0 + Math.random() * 0.3
    });

    // Apply knockback to target
    const dismantleAngle = Math.atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
    closestEnemy.vx += Math.cos(dismantleAngle) * 3;
    closestEnemy.vy += Math.sin(dismantleAngle) * 3;

    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound?.delay ?? 0;
    this._attackSoundConfig = sound;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Decrement slash sound cooldown
    if (this._slashSoundCooldown > 0) this._slashSoundCooldown--;
    if (this.slashGlowTimer > 0) this.slashGlowTimer--;

    // Domain active state (Malevolent Shrine open-barrier domain slashes continue even if Sukuna is paralyzed by Unlimited Void)
    if (this.domainActive) {
      // Freeze domain duration timer while trapped in Gojo's Unlimited Void time stop so duration is not wasted!
      if (!this.timeStopTimer && !this.electricStunTimer && !this.crimsonElectrifiedTimer) {
        this.domainTimer--;
      }
      if (this.domainTimer <= 0) {
        this.domainActive = false;
      } else {
        this._applyDomainEffect(arena);
        // Sukuna himself only unleashes active rapid slashes when not paralyzed
        if (!this.timeStopTimer && !this.electricStunTimer && !this.crimsonElectrifiedTimer) {
          this._doDomainRapidSlashes(opponent, arena, ownerIndex);
        }
      }
    }

    // Update slash hit visuals (Ghost blade / domain slashes) so they animate even during time stop
    if (this.slashHitVisuals && this.slashHitVisuals.length > 0) {
      for (let i = this.slashHitVisuals.length - 1; i >= 0; i--) {
        if (--this.slashHitVisuals[i].timer <= 0) {
          this.slashHitVisuals.splice(i, 1);
        }
      }
    }

    if (this._handleTimeStop()) return;

    // Update Sakuga impact frame timer
    if (this.sakugaImpactTimer > 0) {
      this.sakugaImpactTimer--;
    }

    // Update hit flame wisps so they animate even during hit pause
    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      for (let i = this.hitFlameWisps.length - 1; i >= 0; i--) {
        const wisp = this.hitFlameWisps[i];
        wisp.x += wisp.vx;
        wisp.y += wisp.vy;
        wisp.vy -= 0.18; // Soft upward flame buoyancy
        wisp.angle += Math.sin(wisp.timer * 0.25 + i * 1.7) * 0.05; // Fluid curling sway
        wisp.vx *= 0.90;
        wisp.vy *= 0.90;
        wisp.timer--;
        if (wisp.timer <= 0) {
          this.hitFlameWisps.splice(i, 1);
        }
      }
    }

    // Update Skill 1 flurry slash visual arcs
    if (this.flurrySlashVisuals && this.flurrySlashVisuals.length > 0) {
      for (let i = this.flurrySlashVisuals.length - 1; i >= 0; i--) {
        if (--this.flurrySlashVisuals[i].timer <= 0) {
          this.flurrySlashVisuals.splice(i, 1);
        }
      }
    }

    // Update punch effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      for (let i = this.punchEffects.length - 1; i >= 0; i--) {
        if (--this.punchEffects[i].timer <= 0) {
          this.punchEffects.splice(i, 1);
        }
      }
    }

    // Melee mode state management (Gojo-style forced close combat)
    let distToOpponent = Infinity;
    if (opponent && !opponent.isDead) {
      distToOpponent = Math.hypot(this.x - opponent.x, this.y - opponent.y);
    }

    // Switch modes dynamically based on distance (only when not in special states)
    if (!this.isChannelingDivineFlame && !this.domainActive && this.flurryHitsLeft <= 0 && this.rapidSlashHitsLeft <= 0) {
      if (distToOpponent <= 140) {
        if (!this.isMeleeMode) {
          // Just entered melee range
          this.isMeleeMode = true;
          this.meleeComboCount = 0;
        }
      } else if (distToOpponent > 200 || this.meleeComboCount === 0) {
        if (this.isMeleeMode) {
          // Left melee range (with hysteresis to finish combos)
          this.isMeleeMode = false;
        }
      }
    }

    if (this.meleePunchCooldown > 0) this.meleePunchCooldown--;

    // Smooth fade IN & fade OUT for Cursed Energy aura in hand-to-hand combat mode & flurry
    let inMeleeCombatMode = false;
    if (this.flurryHitsLeft > 0 || this.isMeleeMode || this.domainActive) {
      inMeleeCombatMode = true;
    }

    if (this.combatAuraOpacity === undefined) this.combatAuraOpacity = 0;
    if (state.gameState === 'countdown') {
      // Keep aura at full opacity during countdown for dramatic effect
      this.combatAuraOpacity = 1.0;
    } else if (inMeleeCombatMode) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.08);
    } else {
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.04);
    }

    // Update cooldowns
    if (this.reverseCursedTechniqueCooldown > 0) this.reverseCursedTechniqueCooldown--;
    if (this.spiderwebCooldown > 0) this.spiderwebCooldown--;
    if (this.divineFlameCooldown > 0) this.divineFlameCooldown--;
    if (this.domainCooldown > 0) this.domainCooldown--;
    if (this.flurryCooldown > 0) this.flurryCooldown--;
    if (this.meleeClashCooldown > 0) this.meleeClashCooldown--;

    // Track position history for delayed auto-aim during flurry
    if (!this.posHistory) this.posHistory = [];
    this.posHistory.push({ x: this.x, y: this.y });
    if (this.posHistory.length > 30) this.posHistory.shift();

    // Handle Divine Flame Channeling
    if (this.isChannelingDivineFlame) {
      this.divineFlameChargeTimer++;

      // Play "Fuga" voice line exactly 45 frames (0.75s) before firing
      if (this.divineFlameChargeTimer === Math.max(1, this.divineFlameChargeMax - 100)) {
        const sound = getSkillSound(this._def?.id, 'fuga_fire');
        if (sound) playSound(sound.src, sound.volume);
      }

      // Stop all movement while channeling
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Track opponent while channeling
      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      if (this.divineFlameChargeTimer >= this.divineFlameChargeMax) {
        this._fireDivineFlame(ownerIndex);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Handle Domain Expansion Channeling
    if (this.isChannelingDomainExpansion) {
      this.domainChargeTimer++;

      // Stop all movement while channeling
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Track opponent while channeling
      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      // ====================================================================
      // AUDIO TIMING ADJUSTMENT FOR SHRINE.MP3
      // Change '30' to adjust how many frames before the domain opens that the audio plays.
      // 60 frames = 1 second. 
      // If you want it to play right as the channel starts, set it to: this.domainChargeTimer === 1
      // ====================================================================
      const audioTriggerFrame = Math.max(1, this.domainChargeMax - 50);
      if (this.domainChargeTimer === audioTriggerFrame) {
        const activateSound = getSkillSound(this._def.id, 'domain_activate');
        if (activateSound) playSound(activateSound.src, activateSound.volume);
      }

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.isChannelingDomainExpansion = false;
        this._activateDomain(arena);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Handle Divine Flame Post-Fire Recovery
    if (this.divineFlameRecoveryTimer > 0) {
      this.divineFlameRecoveryTimer--;
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Skip normal behavior while in Domain Expansion
    if (this.domainActive) {
      return;
    }

    // Check for Spiderweb (Skill 1 - Passive trigger)
    this._checkSpiderwebTrigger(arena);

    // Phantom Flurry Execution Logic
    if (this.flurryHitsLeft > 0) {
      this.flurryGhost = this.posHistory[0] || { x: this.x, y: this.y };
      this.vx *= 0.1;
      this.vy *= 0.1;

      if (this.flurryTimer > 0) this.flurryTimer--;
      if (this.flurryTimer <= 0) {
        this.flurryHitsLeft--;
        this.flurryTimer = CONFIG.sukuna.flurryHitInterval || 6;
        if (this.flurryHitsLeft <= 0) {
          this.flurryGhost = null;
          if (projectileSystem && this.flurryTarget && !this.flurryTarget.isDead) {
            const ownerIndex = state.fighters ? state.fighters.indexOf(this) : 0;

            // Teleport away before unleashing the final Cleave/Dismantle slash
            const oldX = this.x;
            const oldY = this.y;
            const escapeDist = 200; // Teleport a good distance away
            const escapeAngle = Math.random() * Math.PI * 2;
            this.x = this.flurryTarget.x + Math.cos(escapeAngle) * escapeDist;
            this.y = this.flurryTarget.y + Math.sin(escapeAngle) * escapeDist;

            // Make sure he aims perfectly back at the target
            this.gunAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);

            // Spawn some visual flare for the teleport
            if (!this.afterImages) this.afterImages = [];
            this.afterImages.push({ x: oldX, y: oldY, timer: 8 });
            spawnImpactFlash(oldX, oldY, 15, 'crimsonSniper');
            spawnImpactFlash(this.x, this.y, 20, 'crimsonSniper');

            // Transition to rapid slash state
            this.rapidSlashHitsLeft = 12; // Unleash 12 rapid ghost slashes
            this.rapidSlashTimer = 0;
          } else {
            this.flurryTarget = null;
          }
          return; // Flurry finished, do not process another melee strike
        }

        // Find all valid targets within range
        const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
        const possibleTargets = [];
        const flurryRange = CONFIG.sukuna.flurryRange || 150;

        state.fighters.forEach((f, idx) => {
          if (f && f !== this && f.hp > 0) {
            const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
            if (isEnemy) {
              const dist = Math.hypot(this.x - f.x, this.y - f.y);
              if (dist <= flurryRange) {
                possibleTargets.push(f);
              }
            }
          }
        });

        // Randomly pick a new target for every single hit to create an Omnislash effect
        if (possibleTargets.length > 0) {
          this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        }

        if (this.flurryTarget && !this.flurryTarget.isDead) {
          this.strikeAngle = Math.random() * Math.PI * 2;

          this.flurryTarget.takeDamage(CONFIG.sukuna.flurryDamage || 6, this, { isMelee: true });
          this.flurryTarget.applyHitStun(15);

          // Apply bleed on flurry hits
          this.applyBleed(this.flurryTarget, 1);

          spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#8B0000');
          triggerGlobalScreenShake(6, 6);
          spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 30, 'crimsonSniper', '#8B0000');

          // Apply knockback to target (light knockback for rapid flurry hits)
          const flurryAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          this.flurryTarget.vx += Math.cos(flurryAngle) * 2;
          this.flurryTarget.vy += Math.sin(flurryAngle) * 2;

          // Randomly teleport around target for visual flair
          const angle = Math.random() * Math.PI * 2;
          const dist = this.flurryTarget.r + this.r + 10;
          const oldX = this.x;
          const oldY = this.y;
          this.x = this.flurryTarget.x + Math.cos(angle) * dist;
          this.y = this.flurryTarget.y + Math.sin(angle) * dist;

          // Spawn afterimages along the teleport path
          if (!this.afterImages) this.afterImages = [];
          this.afterImages.push({ x: oldX, y: oldY, timer: 8 });

          spawnImpactFlash(oldX, oldY, 15, 'crimsonSniper');
          spawnImpactFlash(this.x, this.y, 20, 'crimsonSniper');

          // Dramatic hit pause on both fighters to emphasize the strike
          if (typeof this.applyTimeStop === 'function') this.applyTimeStop(6);
          if (typeof this.flurryTarget.applyTimeStop === 'function') this.flurryTarget.applyTimeStop(6);

          // Trigger Sakuga Anime Impact Frame (Gojo-style visual)
          this.sakugaImpactTimer = 6;
          this.sakugaImpactMaxTimer = 6;
          this.sakugaImpactX = this.flurryTarget.x;
          this.sakugaImpactY = this.flurryTarget.y;
          this.sakugaImpactAngle = Math.random() * Math.PI * 2;
          this.sakugaImpactSeed = Math.random();

          // Spawn Skill 1 slash visual arc on target
          if (!this.flurrySlashVisuals) this.flurrySlashVisuals = [];
          this.flurrySlashVisuals.push({
            x: this.flurryTarget.x,
            y: this.flurryTarget.y,
            angle: Math.random() * Math.PI * 2,
            timer: 14,
            maxTimer: 14,
            scale: 1.2 + Math.random() * 0.5
          });

          // Spawn residual small stretched cursed energy flame wisps at impact point (Gojo-style)
          if (!this.hitFlameWisps) this.hitFlameWisps = [];
          const impactAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          for (let k = 0; k < 5; k++) {
            const spreadAngle = impactAngle + (Math.random() - 0.5) * 1.4;
            const stretchSpeed = 5 + Math.random() * 7;
            this.hitFlameWisps.push({
              x: this.flurryTarget.x + (Math.random() - 0.5) * 12,
              y: this.flurryTarget.y + (Math.random() - 0.5) * 12,
              vx: Math.cos(spreadAngle) * stretchSpeed,
              vy: Math.sin(spreadAngle) * stretchSpeed,
              angle: spreadAngle,
              timer: 18,
              maxTimer: 18,
              length: 14 + Math.random() * 18,
              width: 1.5 + Math.random() * 1.5,
            });
          }
        } else {
          this.flurryHitsLeft = 0; // abort if target dies
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena, this.flurryTarget);

      // Update visual arrays so slashes still fade during flurry
      if (this.afterImages) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          if (--this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
        }
      }
      return; // Skip normal behavior while in flurry
    }

    // Check for rapid slash follow-up state (Flurry Finisher)
    // New behavior: Teleport -> 1 slash -> teleport -> 1 slash -> repeat, with movement allowed
    if (this.rapidSlashHitsLeft > 0) {
      this.rapidSlashTimer--;

      if (this.rapidSlashTimer <= 0) {
        if (projectileSystem && this.flurryTarget && !this.flurryTarget.isDead) {
          this.gunAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          const ownerIndex = state.fighters ? state.fighters.indexOf(this) : 0;

          const slashSpeed = CONFIG.sukuna.slashSpeed ?? (CONFIG.projectile.speed * 1.5);
          const slashDamage = CONFIG.sukuna.slashDamage ?? this.damage;

          // Fire one ghost blade slash at the target
          projectileSystem.fireProjectile(
            this,
            ownerIndex,
            slashDamage,
            false,
            slashSpeed,
            false,
            'ghostBlade',
            this.x,
            this.y,
            this.gunAngle
          );

          spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
          triggerGlobalScreenShake(6, 8);
          spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 20, 'crimsonSniper', '#8B0000');
          this.slashGlowTimer = 25;

          // Apply knockback to target
          const cleaveAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          this.flurryTarget.vx += Math.cos(cleaveAngle) * 3;
          this.flurryTarget.vy += Math.sin(cleaveAngle) * 3;

          // Spawn slash visual on target
          if (!this.slashHitVisuals) this.slashHitVisuals = [];
          this.slashHitVisuals.push({
            x: this.flurryTarget.x,
            y: this.flurryTarget.y,
            angle: this.gunAngle,
            timer: 12,
            maxTimer: 12,
            scale: 1.0 + Math.random() * 0.3
          });

          // Play swordswing sound on rapid slash hit
          if (this._slashSoundCooldown <= 0) {
            playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
            playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.5);
            this._slashSoundCooldown = 15; // ~0.25 seconds at 60fps
          }

          // Spawn impact flash at current position
          spawnImpactFlash(this.x, this.y, 15, 'crimsonSniper');

          // Decrement hits left BEFORE teleport so we know if this is the last slash
          this.rapidSlashHitsLeft--;

          // Teleport to a new position around current location (only if more slashes remain)
          if (this.rapidSlashHitsLeft > 0 && this.flurryTarget && !this.flurryTarget.isDead) {
            const oldX = this.x;
            const oldY = this.y;

            // Teleport to a small random position around current location
            const teleportAngle = Math.random() * Math.PI * 2;
            const teleportDist = 20 + Math.random() * 30; // 20-50 pixels away (small hop)
            this.x = this.x + Math.cos(teleportAngle) * teleportDist;
            this.y = this.y + Math.sin(teleportAngle) * teleportDist;

            // Clamp to arena bounds (assuming 1200x700 arena)
            this.x = Math.max(30, Math.min(1170, this.x));
            this.y = Math.max(30, Math.min(670, this.y));

            // Spawn afterimage at old position
            if (!this.afterImages) this.afterImages = [];
            this.afterImages.push({ x: oldX, y: oldY, timer: 10 });

            // Visual effects for teleport
            spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
            spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');

            // Apply hit pause for dramatic effect
            if (typeof this.applyTimeStop === 'function') this.applyTimeStop(4);

            // Set timer for next slash (using config for adjustable duration)
            this.rapidSlashTimer = CONFIG.sukuna.rapidSlashCooldown || 8;
          }
        } else {
          // Target is dead, end the rapid slash sequence
          this.rapidSlashHitsLeft = 0;
        }
      }

      // Stop all movement during rapid slash sequence
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Allow movement during rapid slash sequence (no dramatic slowdown)
      // this.applyMovementPhysics();
      this.resolveWallBounce(arena, this.flurryTarget);

      // Update afterimages
      if (this.afterImages) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          if (--this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
        }
      }

      // Update slash hit visuals
      if (this.slashHitVisuals) {
        for (let i = this.slashHitVisuals.length - 1; i >= 0; i--) {
          if (--this.slashHitVisuals[i].timer <= 0) this.slashHitVisuals.splice(i, 1);
        }
      }

      // Update slash visuals
      if (this.flurrySlashVisuals) {
        for (let i = this.flurrySlashVisuals.length - 1; i >= 0; i--) {
          if (--this.flurrySlashVisuals[i].timer <= 0) this.flurrySlashVisuals.splice(i, 1);
        }
      }

      return; // Skip normal behavior while rapid slashing
    }

    // Check for Phantom Flurry activation (priority over domain when close)
    if (this.flurryCooldown <= 0 && opponent && !opponent.isDead) {
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const flurryRange = CONFIG.sukuna.flurryRange || 150;
      if (distSq <= flurryRange ** 2) {
        this.flurryCooldown = CONFIG.sukuna.flurryCooldown || 300;
        this.flurryHitsLeft = CONFIG.sukuna.flurryHits || 5;
        this.flurryTimer = 0;
        this.flurryTarget = opponent;

        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        const oldX = this.x;
        const oldY = this.y;

        this.flurryGhost = { x: oldX, y: oldY };
        this.x = opponent.x + (dx / dist) * (this.r + opponent.r + 5);
        this.y = opponent.y + (dy / dist) * (this.r + opponent.r + 5);

        spawnImpactFlash(oldX, oldY, 25, 'crimsonSniper');
        spawnImpactFlash(this.x, this.y, 30, 'crimsonSniper');
        triggerGlobalScreenShake(8, 10);

        spawnFloatingText(this.x, this.y - 30, 'PHANTOM FLURRY!', '#8B0000');
        const attackSound = getBasicAttackSound('musashi');
        if (attackSound) playSound(attackSound.src, attackSound.volume);
      }
    }

    // Check for Divine Flame (Skill 2)
    // Don't cast if opponent is channeling an ultimate to prevent double-freezes
    if (this.divineFlameCooldown <= 0 && !this.isChannelingDivineFlame && opponent && this.flurryHitsLeft <= 0 && !opponent.isChannelingPurple) {
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const safeDistance = 200;
      if (distSq > safeDistance ** 2) {
        this.isChannelingDivineFlame = true;
        this.divineFlameChargeTimer = 0;
        spawnFloatingText(this.x, this.y - this.r - 20, 'FURNACE (FUGA)', '#FF4500');

        const sound = getSkillSound(this._def?.id, 'divineFlame');
        if (sound) {
          this.fugaSoundKey = 'fuga_charge_' + Math.random().toString(36).substr(2, 9);
          playLoopingSound(this.fugaSoundKey, sound.src, sound.volume);
        }
      }
    }

    // Check for Domain Expansion (Ultimate)
    if (this.domainCooldown <= 0 && !this.domainActive && !this.isChannelingDomainExpansion && this.domainUseCount < 2 && opponent && !opponent.isDead && this.flurryHitsLeft <= 0) {
      this.isChannelingDomainExpansion = true;
      this.domainChargeTimer = 0;
      triggerGlobalScreenShake(6, 90); // Tremble for the full 1.5 seconds
      const channelSound = getSkillSound(this._def.id, 'domain_channel');
      if (channelSound) playSound(channelSound.src, channelSound.volume);
    }

    // Handle Melee Combat Mode vs Ranged Mode
    if (this.isMeleeMode) {
      if (opponent && !opponent.isDead) {
        this._updateMeleeCombat(opponent, arena, ownerIndex);
      }
    } else {
      // Ranged Mode - Basic attack (Dismantle)
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.shoot(ownerIndex);
        this.shootCooldown = this.shootCooldownMax;
      }
    }

    this.applyMovementPhysics();

    if (opponent && !opponent.isDead) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else {
      this.aim(opponent);
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Handle melee combat - teleports, then rapid strikes
   */
  _updateMeleeCombat(opponent, arena, ownerIndex) {
    const punchCooldown = CONFIG.sukuna.meleePunchCooldown || 12;

    // Handle punch cooldown
    if (this.meleePunchCooldown > 0) {
      this.meleePunchCooldown--;

      // Slightly pull Sukuna toward opponent to stick during combos
      if (opponent && !opponent.isDead && this.meleeComboCount > 0) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.r + opponent.r + 5) {
          this.vx += (dx / dist) * 0.5;
          this.vy += (dy / dist) * 0.5;
        }
      }
      return;
    }

    if (!opponent || opponent.isDead) return;

    // Initialize combo state
    if (this.meleeComboCount === undefined) this.meleeComboCount = 0;
    if (this.meleeComboTarget === undefined) this.meleeComboTarget = Math.random() < 0.35 ? 4 : 3;

    // 1. Only Teleport when starting a new combo sequence
    if (this.meleeComboCount === 0) {
      const oldX = this.x;
      const oldY = this.y;

      const angleToOpponent = Math.random() * Math.PI * 2;
      const behindOffset = opponent.r + this.r + 8;
      let targetX = opponent.x - Math.cos(angleToOpponent) * behindOffset;
      let targetY = opponent.y - Math.sin(angleToOpponent) * behindOffset;

      // Clamp to arena bounds
      targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
      targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));

      this.x = targetX;
      this.y = targetY;

      spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
      spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');
    } else {
      // For follow-up punches in a combo, ensure Sukuna stays right next to the opponent
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const currentDist = Math.hypot(dx, dy);
      const idealDist = opponent.r + this.r + 8;

      if (currentDist > idealDist + 4) {
        const angle = Math.atan2(dy, dx);
        this.x = opponent.x - Math.cos(angle) * idealDist;
        this.y = opponent.y - Math.sin(angle) * idealDist;
      }
    }

    // 2. Execute Martial Arts hit at current position
    this.meleeComboCount++;
    this.martialArtsComboCount++;

    const slashDamage = CONFIG.sukuna.slashDamage ?? this.damage;
    const slashSpeed = CONFIG.sukuna.slashSpeed ?? (CONFIG.projectile.speed * 1.5);

    opponent.takeDamage(slashDamage, this, { isMelee: true });
    opponent.applyHitStun(12);
    spawnSparks(opponent.x, opponent.y, 25, 'crimsonSniper', '#8B0000');
    triggerGlobalScreenShake(5, 6);

    const martialArtsAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);

    // Trigger Sakuga Anime Impact Frame (red/black ink impact)
    this.sakugaImpactTimer = 6;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = opponent.x;
    this.sakugaImpactY = opponent.y;
    this.sakugaImpactAngle = Math.random() * Math.PI * 2;
    this.sakugaImpactSeed = Math.random();

    // Punch shockwave effect (matching Gojo's style, in crimson red)
    if (!this.punchEffects) this.punchEffects = [];
    this.punchEffects.push({
      x: opponent.x,
      y: opponent.y,
      angle: martialArtsAngle,
      timer: 12,
      maxTimer: 12
    });

    // Residual cursed energy flame wisps
    if (!this.hitFlameWisps) this.hitFlameWisps = [];
    for (let k = 0; k < 5; k++) {
      const spreadAngle = martialArtsAngle + (Math.random() - 0.5) * 1.4;
      const stretchSpeed = 5 + Math.random() * 7;
      this.hitFlameWisps.push({
        x: opponent.x + (Math.random() - 0.5) * 12,
        y: opponent.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(spreadAngle) * stretchSpeed,
        vy: Math.sin(spreadAngle) * stretchSpeed,
        angle: spreadAngle,
        timer: 18,
        maxTimer: 18,
        length: 14 + Math.random() * 18,
        width: 3.5 + Math.random() * 3.5,
        color: '#8B0000'
      });
    }

    // Check for Gojo clash shockwave
    if (opponent._def && (opponent._def.id === 'gojo' || opponent._def.name === 'GojoFighter')) {
      if (!this.meleeClashCooldown) this.meleeClashCooldown = 0;
      if (this.meleeClashCooldown <= 0) {
        const midX = (this.x + opponent.x) / 2;
        const midY = (this.y + opponent.y) / 2;
        spawnMeleeClashShockwave(midX, midY, 100);
        triggerGlobalScreenShake(8, 10);
        this.meleeClashCooldown = 30;
      }
    }

    // Apply knockback to target
    opponent.vx += Math.cos(martialArtsAngle) * 2;
    opponent.vy += Math.sin(martialArtsAngle) * 2;

    // Every hit is pure Cursed Martial Arts (no slashes)
    spawnFloatingText(this.x, this.y - this.r - 25, 'MARTIAL ARTS', '#8B0000');

    const attackSound = getBasicAttackSound('musashi');
    if (attackSound) playSound(attackSound.src, attackSound.volume * 0.7);

    // Hit pause on the opponent only (prevents the attacker from lagging)
    if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(5);

    // Set cooldown for next punch
    this.meleePunchCooldown = punchCooldown;

    // Reset combo counter when combo target is reached
    if (this.meleeComboCount >= this.meleeComboTarget) {
      this.meleeComboCount = 0;
      this.meleeComboTarget = Math.random() < 0.35 ? 4 : 3;
    }

    this.resolveWallBounce(arena);
  }

  _checkSpiderwebTrigger(arena) {
    if (this.spiderwebCooldown > 0) return;

    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    const spiderwebRange = CONFIG.sukuna.spiderwebRange || 100;
    const minEnemiesToTrigger = CONFIG.sukuna.spiderwebMinEnemies || 2;

    let nearbyEnemies = 0;
    let totalDist = 0;

    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(this.x - f.x, this.y - f.y);
          if (dist <= spiderwebRange) {
            nearbyEnemies++;
            totalDist += dist;
          }
        }
      }
    });

    this.surroundingEnemiesCount = nearbyEnemies;

    // Trigger spiderweb if surrounded by enough enemies
    if (nearbyEnemies >= minEnemiesToTrigger) {
      this._activateSpiderweb();
    }
  }

  _activateSpiderweb() {
    this.spiderwebCooldown = CONFIG.sukuna.spiderwebCooldown || 300;

    spawnFloatingText(this.x, this.y - this.r - 20, 'SPIDERWEB', '#8B0000');
    spawnImpactFlash(this.x, this.y, 50, 'crimsonSniper');
    triggerGlobalScreenShake(8, 12);

    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    const spiderwebRange = CONFIG.sukuna.spiderwebRange || 100;
    const spiderwebDamage = CONFIG.sukuna.spiderwebDamage || 15;
    const slowDuration = CONFIG.sukuna.spiderwebSlowDuration || 120;
    const slowMultiplier = CONFIG.sukuna.spiderwebSlowMultiplier || 0.3;

    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(this.x - f.x, this.y - f.y);
          if (dist <= spiderwebRange) {
            // Deal damage
            f.takeDamage(spiderwebDamage, this, { isSpiderweb: true });

            // Apply slow
            f.applySlow(slowDuration, slowMultiplier);

            // Visual effects
            spawnSparks(f.x, f.y, 8, 'crimsonSniper', '#8B0000');
          }
        }
      }
    });

    const sound = getSkillSound(this._def?.id, 'spiderweb');
    if (sound) playSound(sound.src, sound.volume);
  }

  _fireDivineFlame(ownerIndex) {
    this.isChannelingDivineFlame = false;

    // Stop the Fuga charge audio
    if (this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }

    // Play the Fuga travel/unleash audio
    const sound = getSkillSound(this._def?.id, 'fuga_travel');
    if (sound) playSound(sound.src, sound.volume);

    this.divineFlameRecoveryTimer = CONFIG.sukuna.divineFlameRecoveryTime || 60;
    this.divineFlameCooldown = CONFIG.sukuna.divineFlameCooldown || 500;

    triggerGlobalScreenShake(CONFIG.sukuna.divineFlameShakeIntensity || 10, CONFIG.sukuna.divineFlameShakeDuration || 15);

    if (projectileSystem && projectileSystem.fireSukunaDivineFlame) {
      projectileSystem.fireSukunaDivineFlame(this, ownerIndex, CONFIG.sukuna.divineFlameDamage || 25);
    }
  }

  _activateReverseCursedTechnique(attacker) {
    this.reverseCursedTechniqueCooldown = CONFIG.sukuna.reverseCursedTechniqueCooldown || 1200;

    const healPercent = CONFIG.sukuna.reverseCursedTechniqueHealPercent || 0.40;
    const healAmount = this.maxHp * healPercent;

    // If this was a fatal hit, revive with heal
    if (this.hp <= 0) {
      this.hp = healAmount;
      this.isDead = false;
    } else {
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
    }

    this.rctVisualMaxTimer = 150;
    this.rctVisualTimer = 150;

    spawnFloatingText(this.x, this.y - this.r - 40, 'REVERSE', '#00FF66');
    spawnFloatingText(this.x, this.y - this.r - 20, '+' + Math.round(healAmount), '#00FF00');
    spawnImpactFlash(this.x, this.y, 60, 'healing');
    triggerGlobalScreenShake(6, 20);

    // Healing particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.r + 15;
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 2, 'healing');
    }

    const sound = getSkillSound(this._def?.id, 'reverseCursedTechnique');
    if (sound) playSound(sound.src, sound.volume);
  }

  _activateDomain(arena) {
    this.domainActive = true;
    this.domainUseCount++;
    this.domainTimer = CONFIG.sukuna.domainDuration || 180;
    this.domainCooldown = CONFIG.sukuna.domainCooldown || 1500;

    // Position at top center of the arena
    if (arena) {
      this.domainX = arena.x + arena.width / 2;
      this.domainY = arena.y + arena.height * 0.25; // 25% from the top (moved down)
    } else {
      this.domainX = this.x;
      this.domainY = this.y;
    }

    // Prevent Fuga right after domain
    this.divineFlameCooldown = 600;

    spawnFloatingText(this.domainX, this.domainY + 50, 'MALEVOLENT SHRINE', '#8B0000');
    triggerGlobalScreenShake(10, 25);

    const sound = getSkillSound(this._def?.id, 'domain');
    if (sound) playSound(sound.src, sound.volume);
  }

  _doDomainRapidSlashes(opponent, arena, ownerIndex) {
    if (!opponent || opponent.isDead) return;

    const isFrozen = (this.timeStopTimer > 0) || (this.electricStunTimer > 0) || (this.crimsonElectrifiedTimer > 0);

    if (this.rapidSlashTimer === undefined || this.rapidSlashTimer <= 0) {
      const aimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      if (!isFrozen) {
        this.gunAngle = aimAngle;
      }

      const slashSpeed = CONFIG.sukuna.slashSpeed ?? (CONFIG.projectile.speed * 1.5);
      const slashDamage = CONFIG.sukuna.slashDamage ?? this.damage;

      if (projectileSystem) {
        projectileSystem.fireProjectile(
          this,
          ownerIndex,
          slashDamage,
          false,
          slashSpeed,
          false,
          'ghostBlade',
          this.x,
          this.y,
          aimAngle
        );
      }

      spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
      triggerGlobalScreenShake(6, 8);
      spawnSparks(opponent.x, opponent.y, 20, 'crimsonSniper', '#8B0000');
      this.slashGlowTimer = 25;

      const cleaveAngle = aimAngle;
      opponent.vx += Math.cos(cleaveAngle) * 3;
      opponent.vy += Math.sin(cleaveAngle) * 3;

      if (!this.slashHitVisuals) this.slashHitVisuals = [];
      this.slashHitVisuals.push({
        x: opponent.x,
        y: opponent.y,
        angle: aimAngle,
        timer: 12,
        maxTimer: 12,
        scale: 1.0 + Math.random() * 0.3
      });

      if (this._slashSoundCooldown <= 0) {
        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
        playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.5);
        this._slashSoundCooldown = 15;
      }

      spawnImpactFlash(this.x, this.y, 15, 'crimsonSniper');

      if (!isFrozen) {
        const oldX = this.x;
        const oldY = this.y;

        const teleportAngle = Math.random() * Math.PI * 2;
        const teleportDist = 120 + Math.random() * 150; // Increased teleport distance in Domain
        this.x = this.x + Math.cos(teleportAngle) * teleportDist;
        this.y = this.y + Math.sin(teleportAngle) * teleportDist;

        // Clamp to arena bounds
        if (arena) {
          this.x = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, this.x));
          this.y = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, this.y));
        }

        if (!this.afterImages) this.afterImages = [];
        this.afterImages.push({ x: oldX, y: oldY, timer: 10 });

        spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
        spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');

        if (typeof this.applyTimeStop === 'function') this.applyTimeStop(4);
      }

      this.rapidSlashTimer = CONFIG.sukuna.domainRapidSlashCooldown || 10;
    } else {
      this.rapidSlashTimer--;
    }

    if (!isFrozen) {
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);
      this.resolveWallBounce(arena, opponent);
    }

    // Update visuals
    if (this.afterImages) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        if (--this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
      }
    }
    if (this.slashHitVisuals) {
      for (let i = this.slashHitVisuals.length - 1; i >= 0; i--) {
        if (--this.slashHitVisuals[i].timer <= 0) this.slashHitVisuals.splice(i, 1);
      }
    }
  }

  _applyDomainEffect(arena) {
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    const domainDamage = CONFIG.sukuna.domainDamage || 4;
    const domainDamageInterval = CONFIG.sukuna.domainDamageInterval || 8;

    if (!this.domainTimeInsideMap) this.domainTimeInsideMap = new Map();
    this._domainFrame = (this._domainFrame || 0) + 1;

    // Apply damage every few frames to all enemies in the arena
    if (this._domainFrame % domainDamageInterval === 0) {
      let playedSwordSwing = false;
      if (this._slashSoundCooldown === undefined || this._slashSoundCooldown <= 0) {
        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.5);
        this._slashSoundCooldown = 15;
        playedSwordSwing = true;
      }

      // Random aesthetic slashes throughout the arena to visualize the domain's relentless attacks
      if (!this.slashHitVisuals) this.slashHitVisuals = [];

      // Spawn 1-2 random slashes at a time
      const slashesToSpawn = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < slashesToSpawn; i++) {
        let randX = Math.random() * 1200;
        let randY = Math.random() * 800;
        if (arena) {
          randX = arena.x + Math.random() * arena.width;
          randY = arena.y + Math.random() * arena.height;
        }

        this.slashHitVisuals.push({
          x: randX,
          y: randY,
          angle: Math.random() * Math.PI * 2,
          timer: 10 + Math.floor(Math.random() * 6),
          maxTimer: 15,
          scale: 0.5 + Math.random() * 1.5
        });
      }

      let hitEnemyThisTick = false;
      const ownerIdx = state.fighters.indexOf(this);
      const shrineX = this.domainX || this.x;
      const shrineY = this.domainY || this.y;

      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            hitEnemyThisTick = true;
            const timeInside = (this.domainTimeInsideMap.get(f) || 0) + domainDamageInterval;
            this.domainTimeInsideMap.set(f, timeInside);

            // Damage ramps up by 10% per second (60 frames) targets stay inside the death zone
            const rampMultiplier = 1 + (timeInside / 60) * 0.10;
            const finalDamage = domainDamage * rampMultiplier;

            f.takeDamage(finalDamage, this, { isDomain: true, bypassShield: true });
            f.applyHitStun(6);

            // Fire visible slash projectile from Malevolent Shrine toward enemy
            if (projectileSystem) {
              const angle = Math.atan2(f.y - shrineY, f.x - shrineX);
              const slashSpeed = (CONFIG.sukuna.slashSpeed || 15) * 1.3;
              projectileSystem.fireProjectile(
                this,
                ownerIdx,
                0, // Damage is dealt directly above
                false,
                slashSpeed,
                false,
                'ghostBlade',
                shrineX,
                shrineY,
                angle
              );
            }

            if (Math.random() < 0.6) {
              spawnSparks(f.x, f.y, 4, 'crimsonSniper', '#8B0000');
              spawnImpactFlash(f.x, f.y, 18, 'crimsonSniper');
            }
          }
        }
      });

      if (hitEnemyThisTick && playedSwordSwing) {
        playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.4);
      }
    }
  }

  applyBleed(target, stacks) {
    if (!this.bleedStacks.has(target)) {
      this.bleedStacks.set(target, 0);
    }
    const currentStacks = this.bleedStacks.get(target);
    const newStacks = Math.min(currentStacks + stacks, CONFIG.sukuna.maxBleedStacks || 5);
    this.bleedStacks.set(target, newStacks);

    // Apply bleed damage over time
    const bleedDamage = CONFIG.sukuna.bleedDamagePerStack || 2;
    const totalBleedDamage = newStacks * bleedDamage;

    if (totalBleedDamage > 0) {
      spawnFloatingText(target.x, target.y - target.r - 10, 'BLEED', '#FF0000');
    }
  }

  draw(ctx) {
    // Render Cursed Energy Aura BEHIND body and weapon constructs
    // Also show during countdown for dramatic effect
    if (this.rctVisualTimer > 0) {
      this._drawSukunaCursedEnergyAura(ctx, 'rct');
    } else if (this.isChannelingDivineFlame || this.divineFlameRecoveryTimer > 0) {
      this._drawSukunaCursedEnergyAura(ctx, 'fuga');
    } else if (this.isChannelingDomainExpansion) {
      this._drawSukunaCursedEnergyAura(ctx, 'domain');
    } else if (this.combatAuraOpacity > 0 || state.gameState === 'countdown' || this._isWinnerReveal) {
      this._drawSukunaCursedEnergyAura(ctx, 'red');
    }

    // Draw Malevolent Shrine Domain Expansion BEHIND Sukuna
    if (this.domainActive) {
      this._drawMalevolentShrine(ctx);
    }

    super.draw(ctx);

    // Render high-intensity cursed energy flash on Sukuna's hands when unleashing slashes
    // this._drawHandCursedEnergy(ctx);

    // Draw Sakuga Anime Impact Frame (red/black ink impact)
    if (this.sakugaImpactTimer > 0) {
      this._drawSakugaImpactFrame(ctx);
    }

    // Render residual hit flame wisps
    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      this._drawHitFlameWisps(ctx);
    }

    // Draw Punch Impact Effects (Gojo-style shockwave & star core in Crimson)
    if (this.punchEffects && this.punchEffects.length > 0) {
      this.punchEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        const alpha = Math.sin((1 - prog) * Math.PI);

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 1. Outer Crimson Shockwave Ring
        const ringRadius = (this.r + 5) * (0.8 + 1.2 * prog);
        ctx.shadowColor = '#FF1100';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#FF1100';
        ctx.lineWidth = 5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. High-contrast Black Ink Outline
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.94, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Piercing White/Gold Impact Star Core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const numRays = 8;
        const innerR = 6 * (1 - prog);
        const outerR = 30 * (0.5 + 0.8 * prog);
        for (let i = 0; i < numRays; i++) {
          const a = (Math.PI * 2 / numRays) * i;
          const ra = a + Math.PI / numRays;
          ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          ctx.lineTo(Math.cos(ra) * innerR, Math.sin(ra) * innerR);
        }
        ctx.closePath();
        ctx.fill();

        // 4. Directional Crimson Impact Sparks
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 2.5;
        for (let i = -2; i <= 2; i++) {
          const sa = i * 0.3;
          const sDist = ringRadius * 1.1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * (sDist * 0.5), Math.sin(sa) * (sDist * 0.5));
          ctx.lineTo(Math.cos(sa) * sDist, Math.sin(sa) * sDist);
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Draw afterimages during flurry
    if (this.afterImages && this.afterImages.length > 0) {
      ctx.save();
      this.afterImages.forEach(img => {
        const alpha = img.timer / 8;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = this._def?.color || '#8B0000';
        ctx.beginPath();
        ctx.arc(img.x, img.y, this.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Draw Skill 1 Slash visual arcs on flurry target (Crescent Blade Arcs)
    if (this.flurrySlashVisuals && this.flurrySlashVisuals.length > 0) {
      this.flurrySlashVisuals.forEach(slash => {
        const ratio = slash.timer / slash.maxTimer;
        ctx.save();
        ctx.translate(slash.x, slash.y);
        ctx.rotate(slash.angle);
        ctx.scale(slash.scale, slash.scale);

        const r = 26;
        // Crescent outer & inner returning arc geometry
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
        ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.50, -Math.PI * 0.50, true);
        ctx.closePath();

        // Heavy black ink outline
        ctx.fillStyle = `rgba(0, 0, 0, ${0.95 * ratio})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * ratio})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Crimson crescent inner blade
        ctx.save();
        ctx.scale(0.85, 0.85);
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.52, Math.PI * 0.52, false);
        ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.48, -Math.PI * 0.48, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 10, 10, ${0.95 * ratio})`;
        ctx.fill();
        ctx.restore();

        // White-hot razor crescent edge line
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * ratio})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
        ctx.stroke();

        ctx.restore();
      });
    }


    // Draw Slash Hit visuals on target (Ghost blade slash marks during rapid slash)
    if (this.slashHitVisuals && this.slashHitVisuals.length > 0) {
      this.slashHitVisuals.forEach(slash => {
        const ratio = slash.timer / slash.maxTimer;
        ctx.save();
        ctx.translate(slash.x, slash.y);
        ctx.rotate(slash.angle);
        ctx.scale(slash.scale, slash.scale);

        const r = 22;
        // Dark shadow for visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Ghostly glow
        ctx.shadowColor = 'rgba(180, 200, 255, 0.7)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Crescent slash shape
        ctx.globalAlpha = 0.85 * ratio;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5, false);
        ctx.arc(r * 0.45, 0, r * 0.8, Math.PI * 0.45, -Math.PI * 0.45, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(220, 235, 255, 1)';
        ctx.fill();

        // Bright edge
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ratio})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(200, 220, 255, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(r * 0.45, 0, r * 0.78, Math.PI * 0.43, -Math.PI * 0.43, true);
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw Furnace (Fuga / Open) — Volcanic magma cursed flame arrow construct
    if (this.isChannelingDivineFlame) {
      const progress = this.divineFlameChargeTimer / this.divineFlameChargeMax;
      const time = Date.now() * 0.012;

      ctx.save();
      ctx.translate(this.x, this.y);

      // ── 1. CHIAROSCURO: Blinding front-light vs deep back-shadow ──
      ctx.save();
      ctx.rotate(this.gunAngle);
      const shadowGrad = ctx.createLinearGradient(this.r * 1.4, 0, -this.r * 1.2, 0);
      shadowGrad.addColorStop(0, `rgba(255, 240, 170, ${0.6 * progress})`);
      shadowGrad.addColorStop(0.35, 'rgba(255, 100, 0, 0)');
      shadowGrad.addColorStop(0.65, `rgba(15, 5, 5, ${0.70 * progress})`);
      shadowGrad.addColorStop(1, `rgba(5, 2, 2, ${0.92 * progress})`);
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 2. VOLCANIC MAGMA FLAME ARROW CONSTRUCT (From reference image) ──
      drawDivineFlameArrowConstruct(ctx, {
        x: 0,
        y: 0,
        angle: this.gunAngle,
        scale: 1.0,
        progress,
        isFlying: false,
        time
      });

      // Cursed Flame Origin Glow (Sukuna's channeling hands)
      ctx.save();
      ctx.rotate(this.gunAngle);
      const notchX = -32 * progress;
      const originGrad = ctx.createRadialGradient(notchX, 0, 2, notchX, 0, 18 * progress);
      originGrad.addColorStop(0, `rgba(255, 255, 220, ${0.95 * progress})`);
      originGrad.addColorStop(0.4, `rgba(255, 140, 20, ${0.7 * progress})`);
      originGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
      ctx.fillStyle = originGrad;
      ctx.beginPath();
      ctx.arc(notchX, 0, 18 * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }



  }

  // Render high-contrast Cursed Energy flame & sparks on Sukuna's hand when unleashing slashes
  _drawHandCursedEnergy(ctx) {
    const isRangedSlashing = this.slashGlowTimer > 0;
    const isCleaveSlashing = this.rapidSlashHitsLeft > 0 || this.flurryHitsLeft > 0;

    if (!isRangedSlashing && !isCleaveSlashing) return;

    const handX = this.x + Math.cos(this.gunAngle) * (this.r + 8);
    const handY = (this.y - (this.z || 0)) + Math.sin(this.gunAngle) * (this.r + 8);

    // Render Sukuna's actual Cursed Energy Flame Aura scaled tightly to his hand!
    this._drawSukunaCursedEnergyAura(ctx, 'red', handX, handY, 4);
  }

  // Draw glowing cursed energy on Sukuna's hands when unleashing slashes
  drawGun(ctx) { }

  // Draw Sakuga Anime Impact Frame (ink-brush style impact burst)
  _drawSakugaImpactFrame(ctx) {
    const t = this.sakugaImpactTimer / this.sakugaImpactMaxTimer;
    const alpha = Math.max(0, t);
    const scale = 1.0 + (1.0 - t) * 0.5;

    ctx.save();
    ctx.translate(this.sakugaImpactX, this.sakugaImpactY);
    ctx.rotate(this.sakugaImpactAngle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const seed = this.sakugaImpactSeed;
    const numClusters = 5 + Math.floor(seed * 4);
    for (let c = 0; c < numClusters; c++) {
      const clusterAngle = (c / numClusters) * Math.PI * 2 + seed * 2.5;
      const clusterDist = 18 + (seed * 10) * (c % 3 === 0 ? 1.5 : 0.5);
      const cx = Math.cos(clusterAngle) * clusterDist;
      const cy = Math.sin(clusterAngle) * clusterDist;

      const numStrokes = 3 + Math.floor(seed * 3);
      for (let s = 0; s < numStrokes; s++) {
        const strokeAngle = clusterAngle + (s - 1) * 0.35 + seed * 1.2;
        const strokeLen = 14 + seed * 18 + (s === 0 ? 12 : 0);
        const strokeWidth = 1.5 + seed * 1.5;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const midX = cx + Math.cos(strokeAngle + 0.3) * strokeLen * 0.5;
        const midY = cy + Math.sin(strokeAngle + 0.3) * strokeLen * 0.5;
        const endX = cx + Math.cos(strokeAngle) * strokeLen;
        const endY = cy + Math.sin(strokeAngle) * strokeLen;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = strokeWidth * 0.45;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Draw hit flame wisps (stretched cursed energy wisps on melee hit)
  _drawHitFlameWisps(ctx) {
    for (let i = 0; i < this.hitFlameWisps.length; i++) {
      const wisp = this.hitFlameWisps[i];
      const lifeRatio = wisp.timer / wisp.maxTimer;

      ctx.save();
      ctx.translate(wisp.x, wisp.y);
      ctx.rotate(wisp.angle);
      ctx.globalAlpha = lifeRatio * 0.85;

      // Outer flame (dark crimson)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.3, -wisp.width * 0.5);
      ctx.lineTo(wisp.length, 0);
      ctx.lineTo(wisp.length * 0.3, wisp.width * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#8B0000';
      ctx.fill();

      // Inner flame (bright orange)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.25, -wisp.width * 0.25);
      ctx.lineTo(wisp.length * 0.75, 0);
      ctx.lineTo(wisp.length * 0.25, wisp.width * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#FF4500';
      ctx.fill();

      // Core flame (yellow-white)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.2, -wisp.width * 0.12);
      ctx.lineTo(wisp.length * 0.5, 0);
      ctx.lineTo(wisp.length * 0.2, wisp.width * 0.12);
      ctx.closePath();
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      ctx.restore();
    }
  }

  // Draw Sukuna's Cursed Energy Aura
  _drawSukunaCursedEnergyAura(ctx, colorTheme = 'red', overrideX = null, overrideY = null, overrideRadius = null) {
    // Calculate smooth fade-in & fade-out progress
    let progress = 1.0;
    if (overrideX !== null) {
      progress = Math.min(1.0, (this.slashGlowTimer / 25) || 1.0);
    } else if (colorTheme === 'rct') {
      progress = Math.min(1, (this.rctVisualTimer / 150) || 1);
    } else if (colorTheme === 'fuga') {
      if (this.divineFlameRecoveryTimer > 0) {
        // Smooth fade-out after firing Fuga
        const maxRecovery = CONFIG.sukuna.divineFlameRecoveryTime || 60;
        progress = Math.min(1.0, Math.max(0, this.divineFlameRecoveryTimer / maxRecovery));
      } else {
        // Fades in over the channeling duration
        const maxTime = this.divineFlameChargeMax || 150;
        progress = Math.min(1.0, Math.max(0, (this.divineFlameChargeTimer / maxTime) || 1));
      }
    } else if (colorTheme === 'domain') {
      const maxTime = this.domainChargeMax || 90;
      progress = Math.min(1.0, Math.max(0, (this.domainChargeTimer / maxTime) || 1));
    } else {
      progress = Math.min(1, Math.max(0, this.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    if (this.timeStopTimer > 0 && typeof this._timeStopFrozenTime !== 'number') {
      this._timeStopFrozenTime = Date.now();
    } else if (this.timeStopTimer <= 0) {
      delete this._timeStopFrozenTime;
    }
    const nowTime = (this.timeStopTimer > 0 && this._timeStopFrozenTime !== undefined) ? this._timeStopFrozenTime : Date.now();
    const frameIndex = Math.floor((nowTime / 1000) * frameRate) % 30;
    const time = frameIndex * 120;

    ctx.save();
    const posX = overrideX !== null ? overrideX : this.x;
    const posY = overrideY !== null ? overrideY : (this.y - (this.z || 0));
    ctx.translate(posX, posY);
    ctx.globalCompositeOperation = 'source-over';

    const r = overrideRadius !== null ? overrideRadius : this.r;

    const isRCT = colorTheme === 'rct';
    const isFuga = colorTheme === 'fuga';

    let mainColor = '#8B0000';
    let fillColor = `rgba(139, 0, 0, ${0.18 * progress})`;
    let coreColor = `rgba(80, 0, 0, ${0.22 * progress})`;
    let wispColor = '#FF2200';

    if (isRCT) {
      mainColor = '#32CD32';
      fillColor = `rgba(50, 205, 50, ${0.25 * progress})`;
      coreColor = `rgba(0, 100, 0, ${0.30 * progress})`;
      wispColor = '#00FF7F';
    } else if (isFuga) {
      mainColor = '#FF4500';
      fillColor = `rgba(255, 69, 0, ${0.20 * progress})`;
      coreColor = `rgba(200, 40, 0, ${0.25 * progress})`;
      wispColor = '#FFD700';
    } else if (colorTheme === 'domain') {
      mainColor = '#4B0082'; // Indigo/Dark Purple
      fillColor = `rgba(0, 0, 0, ${0.85 * progress})`; // Almost solid black
      coreColor = `rgba(139, 0, 0, ${0.90 * progress})`; // Solid blood red core
      wispColor = '#8B0000';

      // Draw persistent text over his head
      ctx.save();
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = `rgba(220, 20, 60, ${progress})`; // Crimson text fading in
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      const textY = -r - 50 - (Math.sin(Date.now() / 150) * 5); // Floating effect
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();

      // Draw graphic ring on the ground
      ctx.save();
      ctx.scale(1, 0.4); // Isometric perspective
      const ringRadius = 160 * progress; // Expands outwards

      // Outer blood ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(139, 0, 0, ${progress})`;
      ctx.stroke();

      // Inner rotating dashed indigo ring
      ctx.rotate(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(75, 0, 130, ${progress * 1.2})`;
      ctx.stroke();
      ctx.restore();
    }

    const strokeColor = '#000000';

    // Soft ambient glow
    ctx.shadowBlur = 22 * progress;
    ctx.shadowColor = mainColor;

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette - stretching Sakuga tongues)
    const numPoints = 28;
    const scaleFactor = overrideRadius !== null ? (overrideRadius / this.r) : 1.0;
    const baseRadius = (r + 15) * scaleFactor;
    const points = [];
    const moveOffset = (this.x + this.y) * 0.015;

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Upward direction bias (flames flow upward)
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25);
      const sideFactor = 1.0 - upFactor * 0.5;

      // Base shape evolution for stretching flame tongues
      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005 - moveOffset * 0.2) * 0.5 + 0.5, 3.0) * 25 * upFactor * scaleFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004 + moveOffset * 0.15) * 0.5 + 0.5, 2.5) * 18 * upFactor * scaleFactor;

      // Localized height flicker
      const tongueFlicker = Math.sin(time * 0.002 + i * 1.4) * 5 * upFactor * scaleFactor;
      const sideWave = Math.sin(time * 0.0012 + i * 0.8) * 4 * sideFactor * scaleFactor;

      const totalRadius = baseRadius + baseTongue1 + baseTongue2 + tongueFlicker + sideWave;
      points.push({
        x: Math.cos(angle) * totalRadius,
        y: Math.sin(angle) * totalRadius
      });
    }

    // Draw smooth closed curve through midpoints (no sharp corners)
    ctx.beginPath();
    let mx = (points[numPoints - 1].x + points[0].x) / 2;
    let my = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mx, my);

    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();

    // Fill with translucent cursed energy
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Ink brush stroke outline (varying thickness like calligraphy brush)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw outline as individual segments with varying width
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;

      // Brush pressure varies per segment (thick in some spots, thin in others)
      const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5;
      const baseThick = 1.2 + pressureNoise * 2.5;

      ctx.lineWidth = baseThick;
      ctx.beginPath();

      const prev = points[(i - 1 + numPoints) % numPoints];
      const prevMidX = (prev.x + p.x) / 2;
      const prevMidY = (prev.y + p.y) / 2;

      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
      ctx.stroke();
    }

    // Inner dark core wash
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    ctx.globalAlpha = 0.9 * progress;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';

    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      for (let i = 0; i < numPoints; i++) {
        const cutSeed = Math.sin(i * 17.3 + layer * 31.7 + flowTime * 2.5);
        if (cutSeed < -0.1) continue;

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        const prev = points[(i - 1 + numPoints) % numPoints];

        const jitterX = Math.sin(i * 7.9 + layer * 5.3 + time * 0.005) * 1.8;
        const jitterY = Math.cos(i * 11.3 - layer * 3.7 + time * 0.004) * 1.8;

        const midX = (p.x * scale + next.x * scale) / 2 + jitterX;
        const midY = (p.y * scale + next.y * scale) / 2 + jitterY;
        const prevMidX = (prev.x * scale + p.x * scale) / 2 - jitterX * 0.5;
        const prevMidY = (prev.y * scale + p.y * scale) / 2 - jitterY * 0.5;

        const pressureNoise = Math.sin(time * 0.005 + i * 2.3 + layer * 5.1) * 0.5 + 0.5;
        ctx.lineWidth = 0.6 + pressureNoise * 1.6;

        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p.x * scale + jitterX, p.y * scale + jitterY, midX, midY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Soft rising flame wisps (smooth curves, bright red-orange) (Removed to prevent wiggling lines)
    /*
    ctx.strokeStyle = wispColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65 * progress;
    for (let k = 0; k < 3; k++) {
      const baseAngle = -Math.PI * 0.5 + (k - 1) * 0.5;
      const sway = Math.sin(time * 0.003 + k * 2.1) * 0.2;
      const fa = baseAngle + sway;
      const len = r + 18 + Math.sin(time * 0.004 + k * 1.7) * 5;

      ctx.beginPath();
      ctx.moveTo(Math.cos(fa) * (r + 8), Math.sin(fa) * (r + 8));
      ctx.quadraticCurveTo(
        Math.cos(fa + sway * 0.5) * (len * 0.7),
        Math.sin(fa + sway * 0.5) * (len * 0.7),
        Math.cos(fa + sway) * len,
        Math.sin(fa + sway) * len
      );
      ctx.stroke();
    }
    */
    ctx.restore();
  }

  // Helper method to render detailed realistic human & demon skulls
  _drawRealisticSkull(ctx, sx, sy, scale = 1.0, isDemon = false) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);

    // Cranium bone gradient fill
    const craniumGlow = ctx.createRadialGradient(-1, -2, 1, 0, 0, 7);
    craniumGlow.addColorStop(0, '#F5EFE6');
    craniumGlow.addColorStop(0.7, '#D4C7B4');
    craniumGlow.addColorStop(1, '#8A7A68');

    ctx.fillStyle = craniumGlow;
    ctx.strokeStyle = '#1F140A';
    ctx.lineWidth = 1.1;

    // Anatomical Human Skull Outline (Cranium + Zygomatic Arches + Maxilla/Mandible)
    ctx.beginPath();
    ctx.moveTo(-4.5, -2.5);
    ctx.quadraticCurveTo(-6.5, -9, 0, -10); // Top cranium dome
    ctx.quadraticCurveTo(6.5, -9, 4.5, -2.5);
    ctx.lineTo(5.5, 1); // Right cheekbone
    ctx.lineTo(3.8, 2);
    ctx.lineTo(3.8, 6.5); // Right upper jaw
    ctx.lineTo(2.2, 8.5); // Right mandible base
    ctx.lineTo(-2.2, 8.5); // Left mandible base
    ctx.lineTo(-3.8, 6.5); // Left upper jaw
    ctx.lineTo(-3.8, 2);
    ctx.lineTo(-5.5, 1); // Left cheekbone
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark Hollow Anatomical Eye Sockets
    ctx.fillStyle = '#180002';
    // Left socket
    ctx.beginPath();
    ctx.moveTo(-1.8, -3.8);
    ctx.lineTo(-5, -3.2);
    ctx.lineTo(-4.2, -0.2);
    ctx.lineTo(-1.6, -1.2);
    ctx.closePath();
    ctx.fill();
    // Right socket
    ctx.beginPath();
    ctx.moveTo(1.8, -3.8);
    ctx.lineTo(5, -3.2);
    ctx.lineTo(4.2, -0.2);
    ctx.lineTo(1.6, -1.2);
    ctx.closePath();
    ctx.fill();

    // Inverted Heart / Triangular Nasal Cavity
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(-1.1, 2.5);
    ctx.lineTo(1.1, 2.5);
    ctx.closePath();
    ctx.fill();

    // Teeth division lines along maxilla & jaw
    ctx.strokeStyle = '#2B1A0C';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.8, 4.8); ctx.lineTo(2.8, 4.8);
    for (let tx = -2; tx <= 2; tx += 1) {
      ctx.moveTo(tx, 3.5); ctx.lineTo(tx, 6.5);
    }
    ctx.stroke();

    // Demon / Ox Horns attached to skull if specified
    if (isDemon) {
      ctx.fillStyle = '#221208';
      ctx.strokeStyle = '#050201';
      ctx.lineWidth = 1;

      // Left Demon Horn
      ctx.beginPath();
      ctx.moveTo(-4.5, -5.5);
      ctx.quadraticCurveTo(-10, -11, -8, -14);
      ctx.quadraticCurveTo(-5.5, -9, -2.5, -7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Demon Horn
      ctx.beginPath();
      ctx.moveTo(4.5, -5.5);
      ctx.quadraticCurveTo(10, -11, 8, -14);
      ctx.quadraticCurveTo(5.5, -9, 2.5, -7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Helper method to render the Malevolent Shrine structure
  _drawShrineBody(ctx) {
    if (!this._shrineCacheCanvas) {
      this._shrineCacheCanvas = document.createElement('canvas');
      this._shrineCacheCanvas.width = 360;
      this._shrineCacheCanvas.height = 420;
      const offCtx = this._shrineCacheCanvas.getContext('2d');
      offCtx.translate(180, 230);
      this._renderFullShrineToContext(offCtx);
    }

    ctx.drawImage(this._shrineCacheCanvas, -180, -230);
  }

  // Pre-rendered vector graphics for Malevolent Shrine (cached to offscreen canvas)
  _renderFullShrineToContext(ctx) {
    // Shrine Ambient Backing Glow & Shadows
    const bgGlow = ctx.createRadialGradient(0, -35, 15, 0, -35, 110);
    bgGlow.addColorStop(0, 'rgba(255, 30, 0, 0.65)');
    bgGlow.addColorStop(0.5, 'rgba(120, 0, 0, 0.4)');
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(0, -35, 110, 0, Math.PI * 2);
    ctx.fill();

    // ── SIDE PROFILE MOUTHS (Flanking the Shrine Behind Pillars) ──
    const drawSideMouth = (cx, cy, isLeft) => {
      ctx.save();
      ctx.translate(cx, cy);
      const scaleX = isLeft ? 1 : -1;
      ctx.scale(scaleX * 0.85, 0.85); // Slightly larger scale

      // Side Teeth (Square human teeth following the curve) — BIGGER
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;

      // Upper Side Teeth — bigger
      const upperTeeth = [
        { x: -8, y: -26, w: 6, h: 16, ang: 0.05 },
        { x: 0, y: -24, w: 6, h: 15, ang: 0.2 },
        { x: 8, y: -20, w: 6, h: 14, ang: 0.4 },
        { x: 16, y: -15, w: 5.5, h: 13, ang: 0.6 },
        { x: 23, y: -9, w: 5.5, h: 12, ang: 0.8 },
        { x: 29, y: -3, w: 5, h: 10, ang: 1.0 }
      ];
      upperTeeth.forEach(t => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.ang);
        ctx.fillStyle = '#F5EFE6';
        ctx.fillRect(-t.w / 2, 0, t.w, t.h);
        ctx.strokeRect(-t.w / 2, 0, t.w, t.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-t.w / 2 + 1, 1, t.w - 2, 3);
        ctx.restore();
      });

      // Lower Side Teeth — bigger
      const lowerTeeth = [
        { x: -8, y: 26, w: 6, h: 16, ang: -0.05 },
        { x: 0, y: 24, w: 6, h: 15, ang: -0.2 },
        { x: 8, y: 20, w: 6, h: 14, ang: -0.4 },
        { x: 16, y: 15, w: 5.5, h: 13, ang: -0.6 },
        { x: 23, y: 9, w: 5.5, h: 12, ang: -0.8 },
        { x: 29, y: 3, w: 5, h: 10, ang: -1.0 }
      ];
      lowerTeeth.forEach(t => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.ang);
        ctx.fillStyle = '#F5EFE6';
        ctx.fillRect(-t.w / 2, -t.h, t.w, t.h);
        ctx.strokeRect(-t.w / 2, -t.h, t.w, t.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-t.w / 2 + 1, -t.h + 1, t.w - 2, 3);
        ctx.restore();
      });

      ctx.restore();
    };

    // Draw Left & Right Side Mouths (Behind the Pillars)
    drawSideMouth(-58, -8, true);
    drawSideMouth(58, -8, false);

    // ── SHRINE VERMILION PILLARS & LINTEL ──
    ctx.fillStyle = '#5A0A0C';
    ctx.strokeStyle = '#1A0000';
    ctx.lineWidth = 2;
    // Left & Right Main Columns
    ctx.fillRect(-44, -40, 9, 58);
    ctx.strokeRect(-44, -40, 9, 58);
    ctx.fillRect(35, -40, 9, 58);
    ctx.strokeRect(35, -40, 9, 58);

    // Inner Vermilion Accents & Gold Capitals
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-45, -42, 11, 4);
    ctx.fillRect(34, -42, 11, 4);

    // Horizontal Lintel Beam above mouth
    ctx.fillStyle = '#3D0608';
    ctx.fillRect(-45, -42, 90, 8);
    ctx.strokeRect(-45, -42, 90, 8);
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(-43, -39, 86, 2);

    // ── OPEN MOUTH MAW WITH SQUARE HUMAN TEETH ──
    // Lip / Fleshy Border
    ctx.fillStyle = '#2D0204';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-35, -8);
    ctx.quadraticCurveTo(-35, -36, 0, -38);
    ctx.quadraticCurveTo(35, -36, 35, -8);
    ctx.lineTo(35, 12);
    ctx.quadraticCurveTo(20, 20, 0, 22);
    ctx.quadraticCurveTo(-20, 20, -35, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deep Red / Crimson Throat Cavity
    const throatGlow = ctx.createRadialGradient(0, -6, 4, 0, -4, 30);
    throatGlow.addColorStop(0, 'rgba(255, 30, 10, 0.95)');
    throatGlow.addColorStop(0.45, 'rgba(160, 8, 0, 0.85)');
    throatGlow.addColorStop(1, 'rgba(5, 0, 0, 0.98)');
    ctx.fillStyle = throatGlow;
    ctx.beginPath();
    ctx.moveTo(-30, -5);
    ctx.quadraticCurveTo(-30, -30, 0, -33);
    ctx.quadraticCurveTo(30, -30, 30, -5);
    ctx.lineTo(30, 8);
    ctx.quadraticCurveTo(16, 14, 0, 16);
    ctx.quadraticCurveTo(-16, 14, -30, 8);
    ctx.closePath();
    ctx.fill();

    // ── SQUARE / RECTANGULAR HUMAN TEETH ──
    // Upper Human Teeth (6 large teeth along upper jaw arch)
    const upperTeethSquare = [
      { x: -22, w: 8, h: 14 }, { x: -13, w: 8, h: 15 }, { x: -4, w: 8, h: 16 },
      { x: 4, w: 8, h: 16 }, { x: 13, w: 8, h: 15 }, { x: 22, w: 8, h: 14 }
    ];

    // Lower Human Teeth (6 large teeth along lower jaw arch)
    const lowerTeethSquare = [
      { x: -20, w: 8, h: 13 }, { x: -11, w: 8, h: 14 }, { x: -3, w: 8, h: 15 },
      { x: 5, w: 8, h: 15 }, { x: 13, w: 8, h: 14 }, { x: 21, w: 8, h: 13 }
    ];
    upperTeethSquare.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;
      const topY = -29;
      // Draw rounded rectangular tooth
      const cornerR = 1.2;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, topY);
      ctx.lineTo(t.x + t.w / 2 - cornerR, topY);
      ctx.quadraticCurveTo(t.x + t.w / 2, topY, t.x + t.w / 2, topY + cornerR);
      ctx.lineTo(t.x + t.w / 2, topY + t.h - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, topY + t.h, t.x + t.w / 2 - cornerR, topY + t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, topY + t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, topY + t.h, t.x - t.w / 2, topY + t.h - cornerR);
      ctx.lineTo(t.x - t.w / 2, topY + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, topY, t.x - t.w / 2 + cornerR, topY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tooth enamel gradient highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(t.x - t.w / 2 + 1, topY + 1, t.w - 2, 3);
    });



    lowerTeethSquare.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;
      const botY = 12;
      const cornerR = 1.2;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.lineTo(t.x + t.w / 2 - cornerR, botY - t.h);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY - t.h, t.x + t.w / 2, botY - t.h + cornerR);
      ctx.lineTo(t.x + t.w / 2, botY - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY, t.x + t.w / 2 - cornerR, botY);
      ctx.lineTo(t.x - t.w / 2 + cornerR, botY);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY, t.x - t.w / 2, botY - cornerR);
      ctx.lineTo(t.x - t.w / 2, botY - t.h + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY - t.h, t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(t.x - t.w / 2 + 1, botY - t.h + 1, t.w - 2, 3);
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── REDESIGNED ANIME-ACCURATE MALEVOLENT SHRINE ROOF ──
    // ══════════════════════════════════════════════════════════════════════

    // ── 1. UNDER-EAVE BRACKET CLUSTERS & WOODEN RAFTERS (Doukyou / Tokyou) ──
    ctx.fillStyle = '#2A0406';
    for (let rx = -68; rx <= 68; rx += 8) {
      ctx.fillRect(rx - 2, -48, 4, 10);
    }
    ctx.fillStyle = '#D4AF37'; // Golden bracket ends
    for (let rx = -64; rx <= 64; rx += 16) {
      ctx.fillRect(rx - 2.5, -43, 5, 3);
    }
    // Horizontal support beam under eaves
    ctx.fillStyle = '#3D0608';
    ctx.fillRect(-70, -48, 140, 4);
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.strokeRect(-70, -48, 140, 4);

    // ══════════════════════════════════════════════════════════════════════
    // ── 2. MAIN LOWER ROOF TIER — Wide Sweeping Concave Eaves ──
    // ══════════════════════════════════════════════════════════════════════
    // Heavy, imposing overhang with flared eave tips curving up at corners
    const lowerRoofGrad = ctx.createLinearGradient(0, -72, 0, -44);
    lowerRoofGrad.addColorStop(0, '#2A0204');
    lowerRoofGrad.addColorStop(0.4, '#4A0608');
    lowerRoofGrad.addColorStop(0.8, '#5A0A0C');
    lowerRoofGrad.addColorStop(1, '#3A0406');
    ctx.fillStyle = lowerRoofGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Bottom eave edge — wide sweeping concave curve (sags down in center, flares at tips)
    ctx.moveTo(-90, -52);                          // Far left eave tip (flared out)
    ctx.quadraticCurveTo(-70, -40, -40, -38);      // Left droop down
    ctx.quadraticCurveTo(0, -34, 40, -38);         // Center sag (concave belly)
    ctx.quadraticCurveTo(70, -40, 90, -52);        // Right flare up
    // Right upturned eave corner (dramatic curl upward)
    ctx.quadraticCurveTo(86, -60, 78, -58);
    // FLAT RIDGE running across the top
    ctx.lineTo(68, -68);
    ctx.lineTo(-68, -68);
    ctx.lineTo(-78, -58);
    // Left upturned eave corner
    ctx.quadraticCurveTo(-86, -60, -90, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Layered roof tile ridges for depth (horizontal lines on lower roof)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    for (let ridgeY = -66; ridgeY <= -42; ridgeY += 5) {
      const spread = 0.6 + (ridgeY + 68) / 26 * 0.4;
      ctx.beginPath();
      ctx.moveTo(-85 * spread, ridgeY);
      ctx.quadraticCurveTo(0, ridgeY + 4 * spread, 85 * spread, ridgeY);
      ctx.stroke();
    }

    // Vertical tile texture lines (fan out from ridge to eave)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let tx = -60; tx <= 60; tx += 7) {
      ctx.beginPath();
      const topX = tx * 0.82;
      const topY = -67;
      const botX = tx * 1.2;
      const eaveY = -38 + Math.abs(tx) * 0.18;
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, eaveY);
      ctx.stroke();
    }

    // Gold trim along bottom eave edge
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-90, -52);
    ctx.quadraticCurveTo(-70, -40, -40, -38);
    ctx.quadraticCurveTo(0, -34, 40, -38);
    ctx.quadraticCurveTo(70, -40, 90, -52);
    ctx.stroke();

    // Secondary gold trim along flat ridge top
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-68, -68);
    ctx.lineTo(68, -68);
    ctx.stroke();

    // ══════════════════════════════════════════════════════════════════════
    // ── 3. UPPER TIER GABLE ROOF (Chidori Hafu / Triangular Peak) ──
    // ══════════════════════════════════════════════════════════════════════
    const upperRoofGrad = ctx.createLinearGradient(0, -100, 0, -64);
    upperRoofGrad.addColorStop(0, '#1A0102');
    upperRoofGrad.addColorStop(0.5, '#380305');
    upperRoofGrad.addColorStop(1, '#4A0608');
    ctx.fillStyle = upperRoofGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Bottom edge of upper gable (sits on top of lower roof ridge)
    ctx.moveTo(-58, -66);
    // Outer gable eave edges sweeping up to the peak
    ctx.quadraticCurveTo(-30, -82, 0, -94);
    ctx.quadraticCurveTo(30, -82, 58, -66);
    // Upper ridge corners (slightly upturned)
    ctx.quadraticCurveTo(50, -74, 42, -72);
    // Inner gable boundary
    ctx.quadraticCurveTo(22, -88, 0, -100);
    ctx.quadraticCurveTo(-22, -88, -42, -72);
    ctx.quadraticCurveTo(-50, -74, -58, -66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertical tile texture on upper gable
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.8;
    for (let tx = -40; tx <= 40; tx += 6) {
      const ratio = Math.abs(tx) / 50;
      ctx.beginPath();
      ctx.moveTo(tx * 0.7, -68 - (1 - ratio) * 28);
      ctx.lineTo(tx, -66 - ratio * 4);
      ctx.stroke();
    }

    // Gold trim on upper gable outer eave edge
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-58, -66);
    ctx.quadraticCurveTo(-30, -82, 0, -94);
    ctx.quadraticCurveTo(30, -82, 58, -66);
    ctx.stroke();

    // ══════════════════════════════════════════════════════════════════════
    // ── 4. DISTINCTIVE BULL-LIKE HORNS AT CORNER RIDGES ──
    // ══════════════════════════════════════════════════════════════════════
    // Horns protrude from: 4 corners of lower roof eaves + 2 corners of upper gable ridge
    // They sweep dramatically outward and upward, mimicking an enraged bull

    const drawBullHorn = (bx, by, cp1x, cp1y, cp2x, cp2y, tipX, tipY, baseW, color, highlightColor) => {
      // Calculate perpendicular for base width
      const dx = cp1x - bx;
      const dy = cp1y - by;
      const angle = Math.atan2(dy, dx);
      const perp = angle + Math.PI / 2;
      const blx = bx + Math.cos(perp) * baseW;
      const bly = by + Math.sin(perp) * baseW;
      const brx = bx - Math.cos(perp) * baseW;
      const bry = by - Math.sin(perp) * baseW;

      // Horn body with bone gradient
      const hornGrad = ctx.createLinearGradient(bx, by, tipX, tipY);
      hornGrad.addColorStop(0, color);
      hornGrad.addColorStop(0.6, '#1A2C30');
      hornGrad.addColorStop(1, '#0A1418');
      ctx.fillStyle = hornGrad;
      ctx.strokeStyle = '#040A0C';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(blx, bly);
      // Outer curve — sweeping outward then back
      ctx.bezierCurveTo(cp1x - 2, cp1y - 2, cp2x, cp2y, tipX, tipY);
      // Inner curve — back to base
      ctx.bezierCurveTo(cp2x + 4, cp2y + 4, cp1x + 4, cp1y + 3, brx, bry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ridge highlight along outer curve (bony shine)
      if (highlightColor) {
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo((blx + brx) / 2, (bly + bry) / 2);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }


    };

    // ── LOWER LEFT EAVE CORNER HORN — sweeps far left and upward ──
    drawBullHorn(
      -86, -52,       // base at left eave corner
      -115, -60,      // cp1: sweeps outward
      -125, -85,      // cp2: curves up dramatically
      -110, -108,     // tip: fierce upward point
      8, '#1F3A40', '#6ABBC8'
    );

    // ── LOWER RIGHT EAVE CORNER HORN — mirrored ──
    drawBullHorn(
      86, -52,        // base at right eave corner
      115, -60,       // cp1: sweeps outward
      125, -85,       // cp2: curves up
      110, -108,      // tip: fierce upward point
      8, '#1F3A40', '#6ABBC8'
    );

    // ── UPPER LEFT RIDGE CORNER HORN — curving outward from gable corner ──
    drawBullHorn(
      -56, -66,       // base at upper left ridge corner
      -85, -72,       // cp1: outward sweep
      -95, -100,      // cp2: dramatic upward arc
      -78, -125,      // tip: high and fierce
      6, '#2F4A50', '#7ACBD0'
    );

    // ── UPPER RIGHT RIDGE CORNER HORN — mirrored ──
    drawBullHorn(
      56, -66,        // base at upper right ridge corner
      85, -72,        // cp1: outward sweep
      95, -100,       // cp2: dramatic upward arc
      78, -125,       // tip: high and fierce
      6, '#2F4A50', '#7ACBD0'
    );

    // ── TOP LEFT PEAK HORN — flanking the demon mask, sweeping up and outward ──
    drawBullHorn(
      -18, -92,       // base near top of gable peak (left of demon mask)
      -35, -100,      // cp1: sweeps outward
      -42, -112,      // cp2: shorter upward arc
      -28, -122,      // tip: shorter and closer in
      4, '#2A4450', '#8ADBE8'
    );

    // ── TOP RIGHT PEAK HORN — mirrored ──
    drawBullHorn(
      18, -92,        // base near top of gable peak (right of demon mask)
      35, -100,       // cp1: sweeps outward
      42, -112,       // cp2: shorter upward arc
      28, -122,       // tip: shorter and closer in
      4, '#2A4450', '#8ADBE8'
    );

    // ══════════════════════════════════════════════════════════════════════
    // ── 5. SMALLER SHARP HORN-LIKE PROTRUSIONS ALONG ROOF EDGES ──
    // ══════════════════════════════════════════════════════════════════════
    // Twisted, grotesque spikes integrated into the roof's edges and corners

    const drawSmallHorn = (sx, sy, tipDx, tipDy, w) => {
      ctx.fillStyle = '#1A2A2E';
      ctx.strokeStyle = '#060E10';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - w, sy);
      ctx.quadraticCurveTo(sx + tipDx * 0.5, sy + tipDy * 0.5, sx + tipDx, sy + tipDy);
      ctx.quadraticCurveTo(sx + tipDx * 0.5, sy + tipDy * 0.5, sx + w, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Spikes along the lower eave edge (left side)
    drawSmallHorn(-72, -46, -12, -22, 3);
    drawSmallHorn(-55, -40, -8, -18, 2.5);
    drawSmallHorn(-35, -37, -6, -16, 2);
    // Spikes along the lower eave edge (right side)
    drawSmallHorn(72, -46, 12, -22, 3);
    drawSmallHorn(55, -40, 8, -18, 2.5);
    drawSmallHorn(35, -37, 6, -16, 2);
    // Spikes along upper gable edges
    drawSmallHorn(-42, -72, -8, -14, 2);
    drawSmallHorn(-25, -80, -5, -12, 1.8);
    drawSmallHorn(42, -72, 8, -14, 2);
    drawSmallHorn(25, -80, 5, -12, 1.8);

    // ══════════════════════════════════════════════════════════════════════
    // ── 6. CLOSED-TEETH MOUTH AT CENTER GABLE PEAK ──
    // ══════════════════════════════════════════════════════════════════════
    // A row of closed teeth visible at the top center of the gable (like the reference)

    ctx.save();
    ctx.translate(0, -86);

    // Dark mouth slit behind the teeth
    ctx.fillStyle = '#0A0000';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.quadraticCurveTo(0, -6, 18, -2);
    ctx.quadraticCurveTo(0, 6, -18, -2);
    ctx.closePath();
    ctx.fill();

    // Upper closed teeth (hanging down)
    const gableUpperTeeth = [
      { x: -14, w: 5.5, h: 8 }, { x: -8, w: 5.5, h: 9 }, { x: -2.5, w: 5.5, h: 10 },
      { x: 3, w: 5.5, h: 10 }, { x: 8.5, w: 5.5, h: 9 }, { x: 14, w: 5.5, h: 8 }
    ];
    gableUpperTeeth.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 0.8;
      const cornerR = 1;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, -4);
      ctx.lineTo(t.x + t.w / 2 - cornerR, -4);
      ctx.quadraticCurveTo(t.x + t.w / 2, -4, t.x + t.w / 2, -4 + cornerR);
      ctx.lineTo(t.x + t.w / 2, -4 + t.h - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, -4 + t.h, t.x + t.w / 2 - cornerR, -4 + t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, -4 + t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, -4 + t.h, t.x - t.w / 2, -4 + t.h - cornerR);
      ctx.lineTo(t.x - t.w / 2, -4 + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, -4, t.x - t.w / 2 + cornerR, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(t.x - t.w / 2 + 1, -3, t.w - 2, 2);
    });

    // Lower closed teeth (pointing up, meeting the upper teeth)
    const gableLowerTeeth = [
      { x: -12, w: 5, h: 7 }, { x: -6, w: 5, h: 8 }, { x: 0, w: 5, h: 8.5 },
      { x: 6, w: 5, h: 8 }, { x: 12, w: 5, h: 7 }
    ];
    gableLowerTeeth.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 0.8;
      const cornerR = 1;
      const botY = 4;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, botY);
      ctx.lineTo(t.x + t.w / 2 - cornerR, botY);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY, t.x + t.w / 2, botY - cornerR);
      ctx.lineTo(t.x + t.w / 2, botY - t.h + cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY - t.h, t.x + t.w / 2 - cornerR, botY - t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY - t.h, t.x - t.w / 2, botY - t.h + cornerR);
      ctx.lineTo(t.x - t.w / 2, botY - cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY, t.x - t.w / 2 + cornerR, botY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(t.x - t.w / 2 + 1, botY - 3, t.w - 2, 2);
    });

    ctx.restore(); // End gable mouth transform

    // ── POINTY SHORT PILLAR AT ROOF PEAK ──
    // Dark pointed pillar/finial at the very top
    ctx.fillStyle = '#2A0406';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    // Pillar base (short rectangular shaft)
    ctx.fillRect(-4, -102, 8, 10);
    ctx.strokeRect(-4, -102, 8, 10);
    // Pointed tip
    ctx.beginPath();
    ctx.moveTo(0, -115);
    ctx.lineTo(-5, -102);
    ctx.lineTo(5, -102);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Gold accent ring at base of pillar
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-5, -93, 10, 3);
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-5, -93, 10, 3);

    // ══════════════════════════════════════════════════════════════════════
    // ── 7. ANIMALISTIC SKULLS AT ROOF EDGES AND CORNERS ──
    // ══════════════════════════════════════════════════════════════════════
    // Skulls integrated into the roof structure — hanging from eaves and at gable corners

    const hangingSkulls = [
      // Lower eave corners
      { x: -85, y: -48, s: 0.85 }, { x: 85, y: -48, s: 0.85 },
      // Along lower eave edge
      { x: -60, y: -40, s: 0.7 }, { x: 60, y: -40, s: 0.7 },
      { x: -30, y: -36, s: 0.65 }, { x: 30, y: -36, s: 0.65 },
      { x: 0, y: -34, s: 0.6 },
      // At upper gable corners
      { x: -52, y: -64, s: 0.75 }, { x: 52, y: -64, s: 0.75 },
      // Along upper gable edges
      { x: -30, y: -76, s: 0.65 }, { x: 30, y: -76, s: 0.65 },
    ];
    hangingSkulls.forEach((sk, i) => {
      // Hanging chain / sinew
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sk.x, sk.y - 5);
      ctx.lineTo(sk.x + Math.sin(sk.x * 0.1) * 2, sk.y + 2);
      ctx.stroke();
      this._drawRealisticSkull(ctx, sk.x, sk.y + 6, sk.s, i % 2 === 0);
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── 8. SKULL MOUND AT SHRINE BASE ──
    // ══════════════════════════════════════════════════════════════════════
    const baseSkulls = [
      // Layer 1: Back row
      { x: -65, y: 14, s: 0.6, d: true }, { x: 65, y: 14, s: 0.6, d: true },
      { x: -52, y: 16, s: 0.65 }, { x: 52, y: 16, s: 0.65 },
      // Layer 2: Middle Pile
      { x: -42, y: 18, s: 0.7 }, { x: -28, y: 17, s: 0.75, d: true },
      { x: -16, y: 19, s: 0.75 }, { x: -5, y: 18, s: 0.8 },
      { x: 5, y: 18, s: 0.8 }, { x: 16, y: 19, s: 0.75 },
      { x: 28, y: 17, s: 0.75, d: true }, { x: 42, y: 18, s: 0.7 },
      // Layer 3: Front Mound
      { x: -58, y: 21, s: 0.65 }, { x: -38, y: 22, s: 0.8 },
      { x: -22, y: 23, s: 0.85 }, { x: -9, y: 22, s: 0.8 },
      { x: 0, y: 24, s: 0.85, d: true }, { x: 9, y: 22, s: 0.8 },
      { x: 22, y: 23, s: 0.85 }, { x: 38, y: 22, s: 0.8 },
      { x: 58, y: 21, s: 0.65 }
    ];
    baseSkulls.forEach(sk => {
      this._drawRealisticSkull(ctx, sk.x, sk.y, sk.s, sk.d || false);
    });
  }

  // PUBLIC: Draw domain liquid water floor BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx) {
    if (!this.domainActive) return;

    const domainRadius = 2500;
    const time = Date.now();
    const sx = this.domainX !== undefined ? this.domainX : this.x;
    const sy = this.domainY !== undefined ? this.domainY : this.y;

    ctx.save();

    // ── 1. DARK LIQUID WATER FLOOR & SPECULAR SHEEN ──
    const liquidGrad = ctx.createLinearGradient(0, sy - 200, 0, sy + 600);
    liquidGrad.addColorStop(0, 'rgba(15, 2, 5, 0.88)');
    liquidGrad.addColorStop(0.3, 'rgba(40, 4, 10, 0.82)');
    liquidGrad.addColorStop(0.7, 'rgba(25, 3, 8, 0.86)');
    liquidGrad.addColorStop(1, 'rgba(10, 1, 3, 0.92)');

    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, domainRadius, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal liquid water wave sheen lines across the floor
    ctx.lineWidth = 1;
    for (let w = 0; w < 12; w++) {
      const wy = sy - 150 + w * 45 + Math.sin(time * 0.002 + w) * 8;
      const waveAlpha = 0.12 + Math.sin(time * 0.003 + w * 1.5) * 0.08;
      ctx.strokeStyle = `rgba(240, 80, 80, ${waveAlpha})`;
      ctx.beginPath();
      ctx.moveTo(sx - 1200, wy);
      ctx.quadraticCurveTo(sx, wy + Math.sin(time * 0.004 + w * 2) * 12, sx + 1200, wy);
      ctx.stroke();
    }

    // ── 2. WATER REFLECTION OF THE SHRINE STRUCTURE ──
    ctx.save();
    ctx.translate(sx, sy + 30);
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.32;
    this._drawShrineBody(ctx);
    ctx.fillStyle = 'rgba(20, 2, 6, 0.45)';
    ctx.fillRect(-150, -150, 300, 300);
    ctx.restore();

    // ── 3. FIGHTER WATER REFLECTIONS ──
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f.hp > 0) {
          ctx.save();
          ctx.translate(f.x, f.y + f.r * 1.6);
          ctx.scale(1, 0.3);
          ctx.fillStyle = 'rgba(255, 30, 30, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, f.r * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    ctx.restore();
  }

  // Draw Malevolent Shrine structure & embers (called during fighter draw, AFTER background)
  _drawMalevolentShrine(ctx) {
    const time = Date.now();
    const sx = this.domainX !== undefined ? this.domainX : this.x;
    const sy = this.domainY !== undefined ? this.domainY : this.y;

    ctx.save();

    // ── REAL SHRINE STRUCTURE (Above Water Level) ──
    ctx.save();
    ctx.translate(sx, sy - 35);
    this._drawShrineBody(ctx);
    ctx.restore();

    // Floating Blood/Spark Embers inside Domain
    for (let p = 0; p < 10; p++) {
      const px = sx + (Math.sin(time * 0.002 + p * 1.7) * 450);
      const py = sy + (Math.cos(time * 0.0025 + p * 2.3) * 300);
      ctx.fillStyle = '#FF2200';
      ctx.beginPath();
      ctx.arc(px, py, 1.8 + (p % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
