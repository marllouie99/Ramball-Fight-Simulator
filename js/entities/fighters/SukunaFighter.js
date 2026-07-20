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
    this.domainCooldown = 1200; // Delay initial cast
    this.domainActive = false;
    this.domainTimer = 0;
    this.hasUsedDomain = false; // Ensures domain can only be cast once per round
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
    this.domainCooldown = 1200;
    this.domainActive = false;
    this.domainTimer = 0;
    this.hasUsedDomain = false;
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

    // Update slash hit visuals (Ghost blade slashes)
    if (this.slashHitVisuals && this.slashHitVisuals.length > 0) {
      for (let i = this.slashHitVisuals.length - 1; i >= 0; i--) {
        if (--this.slashHitVisuals[i].timer <= 0) {
          this.slashHitVisuals.splice(i, 1);
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
    if (inMeleeCombatMode) {
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
      if (this.divineFlameChargeTimer === Math.max(1, this.divineFlameChargeMax - 70)) {
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

    // Domain active state
    if (this.domainActive) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
      } else {
        this._applyDomainEffect(arena);
        this._doDomainRapidSlashes(opponent, arena, ownerIndex);
      }
      return; // Skip normal behavior while in Domain Expansion
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

    // Check for Domain Expansion (Ultimate) - only when not in flurry range & hasn't used domain yet
    if (this.domainCooldown <= 0 && !this.domainActive && !this.hasUsedDomain && opponent && this.flurryHitsLeft <= 0) {
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const flurryRange = CONFIG.sukuna.flurryRange || 150;
      // Only activate domain if opponent is outside flurry range
      if (distSq > flurryRange ** 2) {
        this._activateDomain(arena);
      }
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
    this.hasUsedDomain = true;
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

    if (this.rapidSlashTimer === undefined || this.rapidSlashTimer <= 0) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);

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
          this.gunAngle
        );
      }

      spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
      triggerGlobalScreenShake(6, 8);
      spawnSparks(opponent.x, opponent.y, 20, 'crimsonSniper', '#8B0000');
      this.slashGlowTimer = 25;

      const cleaveAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      opponent.vx += Math.cos(cleaveAngle) * 3;
      opponent.vy += Math.sin(cleaveAngle) * 3;

      if (!this.slashHitVisuals) this.slashHitVisuals = [];
      this.slashHitVisuals.push({
        x: opponent.x,
        y: opponent.y,
        angle: this.gunAngle,
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

      const oldX = this.x;
      const oldY = this.y;

      const teleportAngle = Math.random() * Math.PI * 2;
      const teleportDist = 120 + Math.random() * 150; // Increased teleport distance in Domain
      this.x = this.x + Math.cos(teleportAngle) * teleportDist;
      this.y = this.y + Math.sin(teleportAngle) * teleportDist;

      // Clamp to arena bounds
      this.x = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, this.x));
      this.y = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, this.y));

      if (!this.afterImages) this.afterImages = [];
      this.afterImages.push({ x: oldX, y: oldY, timer: 10 });

      spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
      spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');

      if (typeof this.applyTimeStop === 'function') this.applyTimeStop(4);

      this.rapidSlashTimer = CONFIG.sukuna.domainRapidSlashCooldown || 10;
    } else {
      this.rapidSlashTimer--;
    }

    this.vx = 0;
    this.vy = 0;
    this.applyMovementPhysics(0);
    this.resolveWallBounce(arena, opponent);

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

    // Apply damage every few frames to all enemies in the arena
    if (this.domainTimer % domainDamageInterval === 0) {
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
    if (this.rctVisualTimer > 0) {
      this._drawSukunaCursedEnergyAura(ctx, 'rct');
    } else if (this.isChannelingDivineFlame || this.divineFlameRecoveryTimer > 0) {
      this._drawSukunaCursedEnergyAura(ctx, 'fuga');
    } else if (this.combatAuraOpacity > 0) {
      this._drawSukunaCursedEnergyAura(ctx, 'red');
    }

    // Draw Malevolent Shrine Domain Expansion BEHIND Sukuna
    if (this.domainActive) {
      this._drawMalevolentShrine(ctx);
    }

    super.draw(ctx);

    // Render high-intensity cursed energy flash on Sukuna's hands when unleashing slashes
    this._drawHandCursedEnergy(ctx);

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
    } else {
      progress = Math.min(1, Math.max(0, this.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor((Date.now() / 1000) * frameRate) % 30;
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
      coreColor = `rgba(144, 238, 144, ${0.25 * progress})`;
      wispColor = '#00FF7F';
    } else if (isFuga) {
      mainColor = '#FF4500';
      fillColor = `rgba(255, 69, 0, ${0.35 * progress})`;
      coreColor = `rgba(255, 140, 0, ${0.4 * progress})`;
      wispColor = '#FFD700';
    }

    const strokeColor = '#000000';

    // Soft ambient glow
    ctx.shadowBlur = 22 * progress;
    ctx.shadowColor = mainColor;

    // Generate smooth flame contour points
    const numPoints = 24;
    const scaleFactor = overrideRadius !== null ? (overrideRadius / this.r) : 1.0;
    const baseRadius = (r + 10) * scaleFactor;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Gentle flowing waves (slow, smooth)
      const wave1 = Math.sin(time * 0.003 + i * 0.9) * 5 * scaleFactor;
      const wave2 = Math.cos(time * 0.0025 - i * 1.3) * 3 * scaleFactor;

      // Flames rise upward naturally (-Y) with soft bulge
      const isTop = Math.sin(angle) < -0.2;
      const upwardBulge = isTop ? ((8 + Math.sin(time * 0.004 + i * 0.7) * 4) * scaleFactor) : 0;

      const radius = baseRadius + wave1 + wave2 + upwardBulge;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
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

    // Soft rising flame wisps (smooth curves, bright red-orange)
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
    ctx.restore();
  }

  // Helper method to render the Malevolent Shrine structure
  _drawShrineBody(ctx) {
    // Shrine Ambient Backing Glow & Shadows
    const bgGlow = ctx.createRadialGradient(0, -20, 10, 0, -20, 90);
    bgGlow.addColorStop(0, 'rgba(255, 30, 0, 0.55)');
    bgGlow.addColorStop(0.5, 'rgba(120, 0, 0, 0.35)');
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(0, -20, 90, 0, Math.PI * 2);
    ctx.fill();

    // ── SKULLS SCATTERED AROUND THE BASE ──
    const skullPositions = [
      { x: -55, y: 12, s: 5 }, { x: -42, y: 16, s: 4 }, { x: -30, y: 14, s: 5.5 },
      { x: -18, y: 17, s: 4 }, { x: -8, y: 15, s: 5 }, { x: 8, y: 16, s: 4.5 },
      { x: 20, y: 14, s: 5 }, { x: 32, y: 17, s: 4 }, { x: 45, y: 13, s: 5.5 },
      { x: 57, y: 15, s: 4.5 }, { x: -65, y: 10, s: 3.5 }, { x: 65, y: 11, s: 3.5 },
      { x: -48, y: 20, s: 3 }, { x: 0, y: 19, s: 3.5 }, { x: 50, y: 20, s: 3 },
    ];
    skullPositions.forEach(sk => {
      ctx.fillStyle = '#C8BEB0';
      ctx.strokeStyle = '#1A1008';
      ctx.lineWidth = 1;
      // Skull cranium
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, sk.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Jaw
      ctx.beginPath();
      ctx.arc(sk.x, sk.y + sk.s * 0.6, sk.s * 0.7, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
      // Eye sockets
      ctx.fillStyle = '#1A0000';
      ctx.beginPath();
      ctx.arc(sk.x - sk.s * 0.3, sk.y - sk.s * 0.15, sk.s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sk.x + sk.s * 0.3, sk.y - sk.s * 0.15, sk.s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── SHRINE PILLARS (Dark Vermilion Pillars) ──
    ctx.fillStyle = '#4A080A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(-42, -38, 8, 55);
    ctx.strokeRect(-42, -38, 8, 55);
    ctx.fillRect(34, -38, 8, 55);
    ctx.strokeRect(34, -38, 8, 55);

    // ── OPEN MOUTH WITH TEETH (replacing the door) ──
    // Outer lip shape — upper lip arch
    ctx.fillStyle = '#3A0008';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-34, -5);
    ctx.quadraticCurveTo(-34, -35, 0, -38);
    ctx.quadraticCurveTo(34, -35, 34, -5);
    ctx.lineTo(34, 10);
    ctx.quadraticCurveTo(20, 18, 0, 20);
    ctx.quadraticCurveTo(-20, 18, -34, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deep red throat void inside the mouth
    const throatGlow = ctx.createRadialGradient(0, -8, 3, 0, -5, 28);
    throatGlow.addColorStop(0, 'rgba(255, 40, 10, 0.9)');
    throatGlow.addColorStop(0.4, 'rgba(180, 10, 0, 0.7)');
    throatGlow.addColorStop(1, 'rgba(10, 0, 0, 0.95)');
    ctx.fillStyle = throatGlow;
    ctx.beginPath();
    ctx.moveTo(-28, -3);
    ctx.quadraticCurveTo(-28, -28, 0, -32);
    ctx.quadraticCurveTo(28, -28, 28, -3);
    ctx.lineTo(28, 6);
    ctx.quadraticCurveTo(15, 12, 0, 14);
    ctx.quadraticCurveTo(-15, 12, -28, 6);
    ctx.closePath();
    ctx.fill();

    // Upper teeth (jagged fangs hanging down)
    ctx.fillStyle = '#E8DDD0';
    ctx.strokeStyle = '#2A1A08';
    ctx.lineWidth = 1;
    const upperTeeth = [
      { x: -24, w: 6, h: 10 }, { x: -16, w: 5, h: 13 }, { x: -9, w: 6, h: 9 },
      { x: -2, w: 5, h: 14 }, { x: 4, w: 6, h: 10 }, { x: 11, w: 5, h: 13 },
      { x: 18, w: 6, h: 9 }, { x: 24, w: 5, h: 11 },
    ];
    upperTeeth.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2, -28);
      ctx.lineTo(t.x, -28 + t.h);
      ctx.lineTo(t.x + t.w / 2, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Lower teeth (pointing upward from the bottom jaw)
    const lowerTeeth = [
      { x: -22, w: 5, h: 8 }, { x: -14, w: 6, h: 11 }, { x: -6, w: 5, h: 7 },
      { x: 2, w: 6, h: 12 }, { x: 10, w: 5, h: 8 }, { x: 17, w: 6, h: 10 },
      { x: 24, w: 5, h: 7 },
    ];
    lowerTeeth.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2, 10);
      ctx.lineTo(t.x, 10 - t.h);
      ctx.lineTo(t.x + t.w / 2, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // ── MAIN PAGODA ROOF (Lower tier) ──
    ctx.fillStyle = '#1A0406';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-60, -38);
    ctx.quadraticCurveTo(-28, -50, 0, -55);
    ctx.quadraticCurveTo(28, -50, 60, -38);
    ctx.lineTo(52, -46);
    ctx.quadraticCurveTo(22, -58, 0, -62);
    ctx.quadraticCurveTo(-22, -58, -52, -46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ── UPPER TIER ROOF GABLE ──
    ctx.fillStyle = '#120203';
    ctx.beginPath();
    ctx.moveTo(-38, -60);
    ctx.quadraticCurveTo(-18, -75, 0, -82);
    ctx.quadraticCurveTo(18, -75, 38, -60);
    ctx.lineTo(30, -68);
    ctx.quadraticCurveTo(14, -82, 0, -88);
    ctx.quadraticCurveTo(-14, -82, -30, -68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ── MASSIVE ANIME-ACCURATE BULL HORNS ON THE ROOF ──
    const drawBullHorn = (bx, by, cpX, cpY, tx, ty, baseW, color, highlight) => {
      const angle = Math.atan2(cpY - by, cpX - bx);
      const perp = angle + Math.PI / 2;
      const blx = bx + Math.cos(perp) * baseW;
      const bly = by + Math.sin(perp) * baseW;
      const brx = bx - Math.cos(perp) * baseW;
      const bry = by - Math.sin(perp) * baseW;

      ctx.fillStyle = color;
      ctx.strokeStyle = '#081014';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(blx, bly);
      ctx.quadraticCurveTo(cpX, cpY, tx, ty);
      ctx.quadraticCurveTo(cpX, cpY, brx, bry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ridge highlight along outer curve
      if (highlight) {
        ctx.strokeStyle = highlight;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cpX, cpY, tx, ty);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    };

    // ── LEFT SIDE HORNS (Curving Up & Inward) ──
    drawBullHorn(-55, -38, -90, -75, -35, -100, 7, '#2A5058', '#6AABB8');
    drawBullHorn(-42, -48, -70, -85, -22, -105, 6, '#3A6068', '#7ABBC8');
    drawBullHorn(-30, -58, -50, -95, -12, -108, 5, '#2A5058', '#5A9AA8');
    drawBullHorn(-18, -68, -32, -102, -5, -112, 4, '#3A6068', '#6AABB8');
    drawBullHorn(-8, -78, -16, -105, -2, -115, 3, '#4A7078', '#8ACBD8');

    // ── RIGHT SIDE HORNS (Mirrored, Curving Up & Inward) ──
    drawBullHorn(55, -38, 90, -75, 35, -100, 7, '#2A5058', '#6AABB8');
    drawBullHorn(42, -48, 70, -85, 22, -105, 6, '#3A6068', '#7ABBC8');
    drawBullHorn(30, -58, 50, -95, 12, -108, 5, '#2A5058', '#5A9AA8');
    drawBullHorn(18, -68, 32, -102, 5, -112, 4, '#3A6068', '#6AABB8');
    drawBullHorn(8, -78, 16, -105, 2, -115, 3, '#4A7078', '#8ACBD8');

    // ── CENTER OX/DEMON SKULL ON ROOF PEAK ──
    ctx.fillStyle = '#DCDCDC';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -75, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.arc(-3, -76, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -76, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DCDCDC';
    ctx.beginPath();
    ctx.moveTo(-5, -79);
    ctx.quadraticCurveTo(-14, -90, -20, -88);
    ctx.quadraticCurveTo(-12, -82, -3, -77);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -79);
    ctx.quadraticCurveTo(14, -90, 20, -88);
    ctx.quadraticCurveTo(12, -82, 3, -77);
    ctx.fill();
    ctx.stroke();

    // ── HANGING SKULLS at eave corners and along roof ──
    ctx.fillStyle = '#C8BEB0';
    ctx.strokeStyle = '#1A1008';
    ctx.lineWidth = 1;
    const hangingSkullPos = [
      { x: -55, y: -36, s: 4.5 }, { x: 55, y: -36, s: 4.5 },
      { x: -40, y: -48, s: 3.5 }, { x: 40, y: -48, s: 3.5 },
      { x: -25, y: -58, s: 3 }, { x: 25, y: -58, s: 3 },
    ];
    hangingSkullPos.forEach(sk => {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sk.x, sk.y - sk.s - 4);
      ctx.lineTo(sk.x, sk.y - sk.s);
      ctx.stroke();
      ctx.fillStyle = '#C8BEB0';
      ctx.strokeStyle = '#1A1008';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, sk.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1A0000';
      ctx.beginPath();
      ctx.arc(sk.x - sk.s * 0.3, sk.y - sk.s * 0.15, sk.s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sk.x + sk.s * 0.3, sk.y - sk.s * 0.15, sk.s * 0.25, 0, Math.PI * 2);
      ctx.fill();
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
