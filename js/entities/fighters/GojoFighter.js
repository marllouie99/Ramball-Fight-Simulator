import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawGojoBody } from '../../graphics/fighters/gojoSkin.js';
import { drawGojoWeapon, drawGojoOrb } from '../../graphics/weapons/gojoWeaponGraphics.js';

export class GojoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;

    this.redCooldown = 0;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1000; // Delay initial cast
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;

    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 1000; // Initial cast delay reads from CONFIG
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 120;
    this.isChannelingDomainExpansion = false;
    this.domainUseCount = 0; // Allows domain to be cast up to 2 times per round

    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;  // Timer for healing aura visual effect
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;

    // Melee Mode (Hand-to-Hand Combat)
    this.isMeleeMode = false;
    this.meleePunchCooldown = 0;
    this.afterImages = []; // Blue afterimages for teleport effect
    this.forcedMeleeTimer = CONFIG.gojo.initialMeleeDuration || 1500;
    this.wasForcedMelee = this.forcedMeleeTimer > 0;
    this.meleeModeCooldown = 0;
    this.hitFlameWisps = []; // Residual stretched Cursed Energy flame wisps on hit
    this.combatAuraOpacity = 0; // Smooth fade-in & fade-out opacity for Cursed Energy aura
    this.purpleRecoveryTimer = 0; // 2.5s recovery stasis after firing Purple
    this.redEffectTimer = 0;
    this.redEffectMaxTimer = 18;
    this.infinityBlockTimer = 0;
    this.infinityBlockMaxTimer = 25;
  }

  reset() {
    super.reset();
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? this._def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;
    this.redCooldown = 0;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1000;
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;
    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 1000;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 120;
    this.isChannelingDomainExpansion = false;
    this.domainExpansionAudioDelay = 0;
    this.domainUseCount = 0;
    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
    // Melee Mode reset
    this.isMeleeMode = false;
    this.meleePunchCooldown = 0;
    this.hitFlameWisps = [];
    this.afterImages = [];
    this.forcedMeleeTimer = CONFIG.gojo.initialMeleeDuration || 1500;
    this.wasForcedMelee = this.forcedMeleeTimer > 0;
    this.meleeModeCooldown = 0;
    this.combatAuraOpacity = 0;
    this.purpleRecoveryTimer = 0;
    this.redEffectTimer = 0;
    this.infinityBlockTimer = 0;
  }

  getAttackProgress() {
    if (!this.shootCooldownMax) return 1;
    return 1 - (this.shootCooldown / this.shootCooldownMax);
  }

  getBodyPullback() {
    const progress = this.getAttackProgress();
    if (progress >= 0.5) {
      return -8 * Math.pow((progress - 0.5) / 0.5, 2);
    } else if (progress < 0.3) {
      const p = 1 - (progress / 0.3);
      return 10 * Math.pow(p, 3);
    }
    return 0;
  }

  getPurpleChargeProgress() {
    if (!this.isChannelingPurple) return 0;
    return Math.min(1, this.purpleChargeTimer / this.purpleChargeMax);
  }

  shoot(ownerIndex) {
    if (projectileSystem && projectileSystem.fireGojoBlue) {
      projectileSystem.fireGojoBlue(this, ownerIndex, this.damage);
    }

    const releaseDist = this.r + 20;
    const rx = this.x + Math.cos(this.gunAngle) * releaseDist;
    const ry = this.y + Math.sin(this.gunAngle) * releaseDist;
    spawnImpactFlash(rx, ry, 20, 'lightningTrail');

    const sound = getBasicAttackSound(null, 'gojo');
    this._attackSoundTimer = sound?.delay || 0;
    this._attackSoundConfig = sound;
  }

  triggerInfinityBlock(hitX, hitY) {
    if (this.infinityCooldown > 0) return false;
    this.infinityCooldown = CONFIG.gojo.infinityCooldown || 240;
    this.infinityActive = false;
    this.infinityBlockTimer = 25;
    this.infinityBlockMaxTimer = 25;
    this.infinityBlockX = hitX !== undefined ? hitX : this.x;
    this.infinityBlockY = hitY !== undefined ? hitY : this.y;

    spawnFloatingText(this.x, this.y - this.r - 20, 'INFINITY', '#E0FFFF');
    spawnImpactFlash(this.infinityBlockX, this.infinityBlockY, 40, 'lightningTrail');
    spawnSparks(this.infinityBlockX, this.infinityBlockY, 15, 'lightningTrail', '#E0FFFF');
    triggerGlobalScreenShake(3, 6);
    return true;
  }

  takeDamage(amount, attacker, opts = {}) {
    // Check Infinity Passive first
    if (this.infinityCooldown <= 0 && attacker && this.hp > 0 && !opts.isStorm) {
      this.triggerInfinityBlock(attacker.x || this.x, attacker.y || this.y);
      return false;
    }

    // Check RCT Death Save / Low HP trigger upon taking damage
    const result = super.takeDamage(amount, attacker, opts);
    if (!opts.isHeal && this.reverseCursedTechniqueCooldown <= 0 && !this.isDead) {
      const threshold = CONFIG.gojo.reverseCursedTechniqueHpThreshold || 0.25;
      if (this.hp / this.maxHp <= threshold && this.hp > 0) {
        const opponent = attacker || (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
        this._activateReverseCursedTechnique(opponent, CONFIG.arena);
      }
    }
    return result;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this._handleTimeStop()) return;

    // Update Sakuga impact frame & Red effect timers
    if (this.sakugaImpactTimer > 0) {
      this.sakugaImpactTimer--;
    }
    if (this.redEffectTimer > 0) {
      this.redEffectTimer--;
    }
    if (this.infinityBlockTimer > 0) {
      this.infinityBlockTimer--;
    }

    // Update punch effects & hit flame wisps so they animate even during hit pause
    if (this.punchEffects && this.punchEffects.length > 0) {
      for (let i = this.punchEffects.length - 1; i >= 0; i--) {
        this.punchEffects[i].timer--;
        if (this.punchEffects[i].timer <= 0) {
          this.punchEffects.splice(i, 1);
        }
      }
    }

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

    if (this.forcedMeleeTimer > 0) this.forcedMeleeTimer--;
    if (this.meleeModeCooldown > 0) this.meleeModeCooldown--;
    if (this.meleeClashCooldown > 0) this.meleeClashCooldown--;

    // Smooth fade IN & fade OUT for Cursed Energy combat aura
    if (this.combatAuraOpacity === undefined) this.combatAuraOpacity = 0;
    if (state.gameState === 'countdown') {
      // Keep aura at full opacity during countdown for dramatic effect
      this.combatAuraOpacity = 1.0;
    } else if (this.isChannelingPurple) {
      // Smoothly fade OUT body aura while mixing Red & Blue into Purple (focusing energy into the orbs)
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.05);
    } else if (this.isMeleeMode || this.forcedMeleeTimer > 0) {
      if (this.forcedMeleeTimer > 0 && this.forcedMeleeTimer < 45) {
        // Fade OUT in final 45 frames of forced combat mode
        this.combatAuraOpacity = Math.max(0, this.forcedMeleeTimer / 45);
      } else {
        // Fade IN smoothly (+0.06 per frame = ~16 frames full fade-in)
        this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.06);
      }
    } else {
      // Fade OUT smoothly (-0.035 per frame = ~30 frames full fade-out when exiting combat)
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.035);
    }

    if (this.infinityCooldown > 0) {
      this.infinityCooldown--;
      if (this.infinityCooldown <= 0) this.infinityActive = true;
    }
    if (this.redCooldown > 0) this.redCooldown--;
    if (this.purpleCooldown > 0) this.purpleCooldown--;
    if (this.domainCooldown > 0) this.domainCooldown--;
    if (this.reverseCursedTechniqueCooldown > 0) this.reverseCursedTechniqueCooldown--;
    if (this.healingAuraTimer > 0) this.healingAuraTimer--;

    // Check for Reverse Cursed Technique (Self heal at low HP)
    this._checkReverseCursedTechnique(opponent, arena);

    // Domain active state
    if (this.domainActive) {
      this.domainTimer--;
      // Play gojodomainexpansion.mp3 1.5s (90 frames) after domain deployment
      if (this.domainExpansionAudioDelay !== undefined && this.domainExpansionAudioDelay > 0) {
        this.domainExpansionAudioDelay--;
        if (this.domainExpansionAudioDelay === 0) {
          const expSound = getSkillSound(this._def?.id, 'domain_expansion');
          if (expSound) playSound(expSound.src, expSound.volume);
        }
      }
      if (this.domainTimer <= 0) {
        this.domainActive = false;
      } else {
        // Apply paralyze to all enemies on the map
        this._applyDomainEffect();
        // Force hand-to-hand combat during domain expansion!
        this.isMeleeMode = true;
        this.forcedMeleeTimer = Math.max(this.forcedMeleeTimer, 30);
        this.meleeModeCooldown = 0;
      }
    }

    // Check for Domain Expansion (Ultimate)
    if (this.domainCooldown <= 0 && !this.domainActive && !this.isChannelingDomainExpansion && this.domainUseCount < 2 && opponent && !opponent.isDead && this.forcedMeleeTimer <= 0) {
      this.isChannelingDomainExpansion = true;
      this.domainChargeTimer = 0;
      this._playedDeployAudio = false;
      triggerGlobalScreenShake(6, 120);
      const channelSound = getSkillSound(this._def?.id, 'domain_channel');
      if (channelSound) playSound(channelSound.src, channelSound.volume);
    }

    // Handle Domain Expansion Channeling
    if (this.isChannelingDomainExpansion) {
      this.domainChargeTimer++;
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Play gojodomaindeploy.mp3 in advance at domainDeployAudioFrame
      const deployAudioFrame = CONFIG.gojo.domainDeployAudioFrame ?? this.domainChargeMax;
      if (this.domainChargeTimer === deployAudioFrame && !this._playedDeployAudio) {
        this._playedDeployAudio = true;
        const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
        if (activateSound) playSound(activateSound.src, activateSound.volume);
      }

      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.isChannelingDomainExpansion = false;
        this._activateDomain(arena);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Check for Hollow Purple (Skill)
    // Don't cast if Sukuna is already channeling Fuga to prevent simultaneous freezes
    if (this.purpleCooldown <= 0 && !this.isChannelingPurple && opponent && this.forcedMeleeTimer <= 0 && !opponent.isChannelingDivineFlame) {
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const safeDistance = 300; // Different from Sukuna's 200 to prevent simultaneous casting
      if (distSq > safeDistance ** 2) {
        this.isChannelingPurple = true;
        this.purpleChargeTimer = 0;
        spawnFloatingText(this.x, this.y - this.r - 20, 'HOLLOW PURPLE', '#8A2BE2');

        const sound = getSkillSound(this._def?.id, 'purple_charge');
        if (sound) playSound(sound.src, sound.volume);
      }
    }

    // Handle Purple Channeling
    if (this.isChannelingPurple) {
      this.purpleChargeTimer++;

      // 1. Instantly stop all movement when starting Red + Blue mix
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Play flare sound exactly when the flare shows up (at 50% progress)
      const flareTriggerFrame = Math.floor(this.purpleChargeMax * 0.5);
      if (this.purpleChargeTimer === flareTriggerFrame) {
        playSound('Assets/Sound Effects/SkillEffects/flare.mp3', 2.0);
      }

      // 2. Levitation: Gojo rises smoothly in the air as Red and Blue mix
      const levitateProgress = Math.min(1.0, this.purpleChargeTimer / (this.purpleChargeMax * 0.4));
      const maxLevitationHeight = 35;
      this.z = Math.sin(levitateProgress * Math.PI * 0.5) * maxLevitationHeight;

      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - (this.y - this.z), opponent.x - this.x);
      }

      if (this.purpleChargeTimer >= this.purpleChargeMax) {
        this._firePurple(ownerIndex);
      }

      this.resolveWallBounce(arena);
      return; // Don't do basic attacks while channeling
    }

    // Handle Purple Post-Fire Descent (Gojo can move while descending back to the ground)
    if (this.purpleRecoveryTimer > 0) {
      this.purpleRecoveryTimer--;

      // Smooth sine descent from 35px down to 0px over the timer duration
      const descentProgress = this.purpleRecoveryTimer / 30; // 1.0 down to 0.0
      this.z = Math.sin(Math.min(1, descentProgress) * Math.PI * 0.5) * 35;
    }

    // Handle RCT Channeling (Reverse Cursed Technique - 2.5 seconds heal duration)
    if (this.isChannelingRCT) {
      this.rctChannelTimer--;

      // Gradually heal over the 150 frames (2.5 seconds)
      const healPercent = CONFIG.gojo.reverseCursedTechniqueHealPercent || 0.35;
      const totalHealAmount = this.maxHp * healPercent;
      const healPerFrame = totalHealAmount / 150;
      this.takeDamage(-healPerFrame, this, { isHeal: true });

      // Spawn continuous green healing particles while channeling RCT
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const dist = this.r * (0.4 + Math.random() * 0.8);
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 2, 'healing');
      }

      if (opponent && !opponent.isDead) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      if (this.rctChannelTimer <= 0) {
        this.isChannelingRCT = false;
      }
    }

    // Check for Red (Close-range repel)
    if (this.redCooldown <= 0 && opponent && !opponent.isDead && this.forcedMeleeTimer <= 0) {
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const triggerRange = CONFIG.gojo.redRange || 100;
      if (distSq <= triggerRange ** 2) {
        this._activateRed();
      }
    }

    // Delete enemy projectiles if Purple is active
    this._deleteEnemyProjectilesInPurple();

    // Check distance and switch between melee/ranged mode
    const closeRangeRadius = CONFIG.gojo.closeRangeRadius || 120;
    let distToOpponent = Infinity;
    if (opponent && !opponent.isDead) {
      distToOpponent = Math.hypot(this.x - opponent.x, this.y - opponent.y);
    }

    // Switch modes based on distance & cooldown (only when not in special states)
    if (!this.isTeleporting && !this.isChannelingPurple) {
      if (this.forcedMeleeTimer > 0) {
        this.wasForcedMelee = true;
        if (!this.isMeleeMode) {
          // In forced melee period - switch to melee mode
          this.isMeleeMode = true;
          this.meleeComboCount = 0;
        }
      } else if (this.forcedMeleeTimer === 0 && this.wasForcedMelee) {
        // Forced hand-to-hand combat mode just expired! Start cooldown and teleport away to ranged mode
        this.wasForcedMelee = false;
        this.isMeleeMode = false;
        this.meleeModeCooldown = CONFIG.gojo.meleeModeCooldown || 600; // Start hand combat cooldown
        if (opponent && !opponent.isDead) {
          this._teleportAwayFrom(opponent, arena);
        }
      } else if (this.meleeModeCooldown <= 0 && distToOpponent <= closeRangeRadius) {
        if (!this.isMeleeMode) {
          // Just entered melee range & melee cooldown is ready - re-trigger hand-to-hand combat!
          this.isMeleeMode = true;
          this.forcedMeleeTimer = CONFIG.gojo.initialMeleeDuration || 200;
          this.wasForcedMelee = true;
          this.meleeComboCount = 0;
        }
      } else {
        if (this.isMeleeMode) {
          // Just left melee range / forced melee expired - switch back to ranged mode and teleport away!
          this.isMeleeMode = false;
          this.meleeModeCooldown = CONFIG.gojo.meleeModeCooldown || 600;
          if (opponent && !opponent.isDead) {
            this._teleportAwayFrom(opponent, arena);
          }
        }
      }
    }

    // Smooth transition for blue orb / fists
    if (this.isMeleeMode) {
      this.orbTransition = Math.max(0, (this.orbTransition !== undefined ? this.orbTransition : 1) - 0.1);
    } else {
      this.orbTransition = Math.min(1, (this.orbTransition !== undefined ? this.orbTransition : 0) + 0.1);
    }

    // Handle Melee Mode (Hand-to-Hand Combat)
    if (this.isMeleeMode) {
      if (opponent && !opponent.isDead) {
        this._updateMeleeCombat(opponent, arena);
      }
    } else {
      // Ranged Mode - Basic attack with blue orbs
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

    // Update afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // Update punch effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      for (let i = this.punchEffects.length - 1; i >= 0; i--) {
        this.punchEffects[i].timer--;
        if (this.punchEffects[i].timer <= 0) {
          this.punchEffects.splice(i, 1);
        }
      }
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Handle melee combat - teleports, then 1 punch (65% chance) or 3 rapid punches (35% chance)
   */
  _updateMeleeCombat(opponent, arena) {
    const punchCooldown = CONFIG.gojo.meleePunchCooldown || 8;

    // Handle punch cooldown
    if (this.meleePunchCooldown > 0) {
      this.meleePunchCooldown--;

      // Slightly pull Gojo toward opponent to stick during rapid 3-hit combos
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
    if (this.meleeComboTarget === undefined) this.meleeComboTarget = Math.random() < 0.35 ? 3 : 1;

    // 1. Only Teleport when starting a new combo sequence (meleeComboCount === 0)
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

      spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
      spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
    } else {
      // For follow-up punches in a combo, ensure Gojo stays right next to the opponent
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

    // 2. Execute punch at current position
    this._meleePunch(opponent);
    this.meleeComboCount++;

    // Check for Sukuna clash shockwave (when both are in melee range)
    if (opponent && !opponent.isDead && opponent._def &&
      (opponent._def.id === 'sukuna' || opponent._def.name === 'SukunaFighter')) {
      if (!this.meleeClashCooldown) this.meleeClashCooldown = 0;
      if (this.meleeClashCooldown <= 0) {
        // Spawn shockwave at midpoint between fighters
        const midX = (this.x + opponent.x) / 2;
        const midY = (this.y + opponent.y) / 2;
        spawnMeleeClashShockwave(midX, midY, 100);
        triggerGlobalScreenShake(8, 10);
        this.meleeClashCooldown = 30; // ~0.5 second cooldown
      }
    }

    // Removed hit pause to prevent blue freeze ring on opponent

    // Set cooldown for next punch
    this.meleePunchCooldown = punchCooldown;

    // Reset combo counter when combo target is reached
    if (this.meleeComboCount >= this.meleeComboTarget) {
      this.meleeComboCount = 0;
      this.meleeComboTarget = Math.random() < 0.35 ? 3 : 1; // 35% chance for 3 rapid attacks, 65% chance for 1 attack
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Teleports Gojo away to range when transitioning out of melee mode
   */
  _teleportAwayFrom(opponent, arena) {
    if (!opponent) return;
    const oldX = this.x;
    const oldY = this.y;

    const angle = Math.atan2(this.y - opponent.y, this.x - opponent.x) + (Math.random() - 0.5);
    const dist = 300;
    let targetX = opponent.x + Math.cos(angle) * dist;
    let targetY = opponent.y + Math.sin(angle) * dist;

    targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
    targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));

    this.x = targetX;
    this.y = targetY;

    spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
    spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
  }

  /**
   * Execute a melee punch attack
   */
  _meleePunch(opponent) {
    const punchDamage = CONFIG.gojo.meleePunchDamage || 8;

    // Apply damage
    opponent.takeDamage(punchDamage, this, { isMelee: true });
    
    // Apply hit stun explicitly to interrupt their current action and prevent counter-attack during combo
    if (typeof opponent.applyHitStun === 'function') {
      opponent.applyHitStun(20);
    }

    // Visual feedback
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'PUNCH!', '#00BFFF');
    spawnImpactFlash(opponent.x, opponent.y, 20, 'lightningTrail');

    // Knockback the opponent (light on combo build-up, heavy on finisher)
    // NOTE: No knockback during Domain Expansion or its immediate aftermath combo
    if (!this.domainActive && !this.wasForcedMelee) {
      const isFinalHit = this.meleeComboCount >= (this.meleeComboTarget || 1);
      const knockbackForce = isFinalHit ? 6 : 1;
      const angle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      opponent.vx += Math.cos(angle) * knockbackForce;
      opponent.vy += Math.sin(angle) * knockbackForce;
    }

    // Trigger Sakuga Anime Impact Frame (randomized angle & seed for variety)
    this.sakugaImpactTimer = 6;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = opponent.x;
    this.sakugaImpactY = opponent.y;
    this.sakugaImpactAngle = Math.random() * Math.PI * 2;
    this.sakugaImpactSeed = Math.random();

    // Spawn residual small stretched Cursed Energy flame wisps at impact point
    if (!this.hitFlameWisps) this.hitFlameWisps = [];
    const impactAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    for (let k = 0; k < 5; k++) {
      const spreadAngle = impactAngle + (Math.random() - 0.5) * 1.4;
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
        color: '#00D4CC'
      });
    }

    // Screen shake for impact
    triggerGlobalScreenShake(6, 6);

    // Sound effect
    const sound = getBasicAttackSound(null, 'gojo_melee');
    if (sound) {
      this._attackSoundTimer = sound.delay || 0;
      this._attackSoundConfig = sound;
    }
  }

  _activateRed() {
    this.redCooldown = CONFIG.gojo.redCooldown || 300;
    this.redEffectTimer = 18;
    this.redEffectMaxTimer = 18;

    // Find target angle facing enemy
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    let targetF = null;
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy && (!targetF || Math.hypot(f.x - this.x, f.y - this.y) < Math.hypot(targetF.x - this.x, targetF.y - this.y))) {
          targetF = f;
        }
      }
    });
    this.redTargetAngle = targetF ? Math.atan2(targetF.y - this.y, targetF.x - this.x) : this.gunAngle;

    spawnFloatingText(this.x, this.y - this.r - 20, 'REVERSAL RED', '#FF1144');
    spawnImpactFlash(this.x, this.y, 60, 'crimsonSniper');
    spawnSparks(this.x, this.y, 30, 'crimsonSniper');
    triggerGlobalScreenShake(12, 10);

    const knockback = CONFIG.gojo.redKnockback || 25;

    // Repel all enemies in radius
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(this.x - f.x, this.y - f.y);
          if (dist < (CONFIG.gojo.redRange || 100) + 50) {
            const angle = Math.atan2(f.y - this.y, f.x - this.x);
            f.vx += Math.cos(angle) * knockback;
            f.vy += Math.sin(angle) * knockback;
            f.takeDamage(this.damage * 2, this, { isRed: true });
          }
        }
      }
    });
  }

  _firePurple(ownerIndex) {
    this.isChannelingPurple = false;
    this.purpleRecoveryTimer = 30; // Just 30 frames (0.5s) for smooth descent
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 600;
    this.z = 35; // Start descent from hovering altitude

    triggerGlobalScreenShake(CONFIG.gojo.purpleShakeIntensity, CONFIG.gojo.purpleShakeDuration);

    if (projectileSystem && projectileSystem.fireGojoPurple) {
      projectileSystem.fireGojoPurple(this, ownerIndex, CONFIG.gojo.purpleDamage || 10);
    }
  }

  _deleteEnemyProjectilesInPurple() {
    if (!projectileSystem || !projectileSystem.projectiles) return;
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

    for (let p of projectileSystem.projectiles) {
      if (p.isGojoPurple && (p.owner === state.fighters.indexOf(this) || state.getFighterTeam(p.owner) === myTeam)) {
        // Found my purple orb. Now find nearby enemy projectiles and destroy them
        for (let ep of projectileSystem.projectiles) {
          if (ep !== p && ep.owner !== p.owner) {
            const isEnemy = myTeam === null || state.getFighterTeam(ep.owner) !== myTeam;
            if (isEnemy && !ep.isVisual) {
              const dist = Math.hypot(p.x - ep.x, p.y - ep.y);
              if (dist < p.r + ep.r + 20) {
                // Destroy it
                ep.life = 0;
                spawnSparks(ep.x, ep.y, 3, 'lightningTrail', '#8A2BE2');
              }
            }
          }
        }
      }
    }
  }

  _activateDomain(arena) {
    this.domainActive = true;
    this.domainUseCount++;
    this.domainTimer = CONFIG.gojo.domainDuration || 300;
    this.domainCooldown = CONFIG.gojo.domainCooldown || 1200;
    this.domainExpansionAudioDelay = CONFIG.gojo.domainExpansionAudioDelay ?? 90; // Delay (in frames) after deployment before gojodomainexpansion.mp3 plays

    // Force Melee Mode (Hand-to-Hand Combat) for the domain duration
    this.isMeleeMode = true;
    this.forcedMeleeTimer = this.domainTimer;
    this.wasForcedMelee = true;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;

    spawnFloatingText(this.x, this.y - this.r - 20, 'UNLIMITED VOID', '#00E5FF');
    triggerGlobalScreenShake(12, 30);

    if (!this._playedDeployAudio) {
      this._playedDeployAudio = true;
      const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
      if (activateSound) playSound(activateSound.src, activateSound.volume);
    }
  }

  _applyDomainEffect() {
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          // Absolute paralysis / brain overload from Unlimited Void
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(15);
          }
          if (typeof f.applyTimeStop === 'function') {
            f.applyTimeStop(15);
          }
          f.vx = 0;
          f.vy = 0;

          // Information overload sparks around enemy head
          if (Math.random() < 0.35) {
            spawnSparks(f.x + (Math.random() - 0.5) * f.r, f.y - f.r * 0.5, 3, 'lightningTrail', '#00E5FF');
            spawnImpactFlash(f.x, f.y, 14, 'lightningTrail');
          }
        }
      }
    });
  }

  // PUBLIC: Draw Unlimited Void cosmic background BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx) {
    if (!this.domainActive) return;

    const time = Date.now();
    const cx = this.x;
    const cy = this.y;
    const canvas = state.canvas;
    if (!canvas) return;

    ctx.save();

    // ── 1. DEEP BLACK / INDIGO COSMIC VOID OVERLAY ──
    const voidGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.85);
    voidGrad.addColorStop(0, 'rgba(0, 20, 45, 0.92)');
    voidGrad.addColorStop(0.35, 'rgba(5, 10, 30, 0.95)');
    voidGrad.addColorStop(0.7, 'rgba(2, 4, 15, 0.97)');
    voidGrad.addColorStop(1, 'rgba(0, 0, 5, 0.98)');

    ctx.fillStyle = voidGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── 2. ATMOSPHERIC COSMIC DUST & STARFIELD PARTICLES (Clean Void) ──
    for (let p = 0; p < 12; p++) {
      const px = cx + (Math.sin(time * 0.0015 + p * 1.9) * 450);
      const py = cy + (Math.cos(time * 0.002 + p * 2.5) * 320);
      const starAlpha = 0.25 + Math.sin(time * 0.004 + p) * 0.2;
      ctx.fillStyle = `rgba(0, 229, 255, ${starAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (p % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 3. INFINITE KNOWLEDGE SINGULARITY RING AROUND GOJO ──
    const ringPulse = Math.sin(time * 0.004) * 6;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00E5FF';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 75 + ringPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 60 - ringPulse * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  _checkReverseCursedTechnique(opponent, arena) {
    if (this.isDead) return;
    if (this.reverseCursedTechniqueCooldown > 0) return;

    const threshold = CONFIG.gojo.reverseCursedTechniqueHpThreshold || 0.10;
    const hpPercent = this.hp / this.maxHp;

    // Trigger when HP drops to threshold or below
    if (hpPercent <= threshold && hpPercent > 0) {
      this._activateReverseCursedTechnique(opponent, arena);
    }
  }

  _activateReverseCursedTechnique(opponent, arena) {
    // Teleport away to a safe distance before performing RCT
    if (opponent && arena) {
      this._teleportAwayFrom(opponent, arena);
    }

    // Start 2.5 second RCT Channeling state
    this.isChannelingRCT = true;
    this.rctChannelTimer = 150; // 2.5 seconds at 60fps
    this.rctVisualMaxTimer = 150;
    this.rctVisualTimer = 150;

    // Set cooldown and aura timer
    this.reverseCursedTechniqueCooldown = CONFIG.gojo.reverseCursedTechniqueCooldown || 900;
    this.healingAuraTimer = 180;  // 3 seconds healing aura

    const healPercent = CONFIG.gojo.reverseCursedTechniqueHealPercent || 0.35;
    const totalHealAmount = this.maxHp * healPercent;

    // Visual effects - prominent green RCT heal indicator
    spawnFloatingText(this.x, this.y - this.r - 40, 'RCT', '#00FF66');
    spawnFloatingText(this.x, this.y - this.r - 20, '+' + Math.round(totalHealAmount), '#00FF00');

    // Dramatic screen shake
    triggerGlobalScreenShake(6, 25);

    // Central bright flash
    spawnImpactFlash(this.x, this.y, 80, 'lightningTrail');

    // Expanding ring of particles (healing energy wave)
    const ringParticleCount = 24;
    for (let i = 0; i < ringParticleCount; i++) {
      const angle = (Math.PI * 2 / ringParticleCount) * i;
      const dist = this.r + 10;
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 2, 'healing');
    }

    // Second expanding ring (slightly delayed, different color)
    setTimeout(() => {
      if (this.isDead) return;
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 / 16) * i;
        const dist = this.r + 30;
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 2, 'healing');
      }
    }, 100);

    // Third ring with white particles
    setTimeout(() => {
      if (this.isDead) return;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        const dist = this.r + 50;
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 3, 'healing');
      }
    }, 200);

    // Burst of particles from center
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const px = this.x + Math.cos(angle) * 20;
      const py = this.y + Math.sin(angle) * 20;
      spawnSparks(px, py, 1, 'healing');
    }

    // Play sound effect
    const sound = getSkillSound(this._def?.id, 'reverseCursedTechnique');
    if (sound) playSound(sound.src, sound.volume);
  }

  draw(ctx) {
    if (this.isDead) return;

    // Domain Expansion Channeling Visuals (Ground ring, Aura, and Header Text)
    if (this.isChannelingDomainExpansion) {
      const progress = Math.min(1.0, this.domainChargeTimer / Math.max(1, this.domainChargeMax));

      ctx.save();
      ctx.translate(this.x, this.y);

      // 1. Floating Text above Gojo's head
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = `rgba(0, 229, 255, ${progress})`; // Bright Cyan text fading in
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      const textY = -this.r - 55 - (Math.sin(Date.now() / 150) * 5); // Floating effect
      ctx.strokeText('UNLIMITED VOID', 0, textY);
      ctx.fillText('UNLIMITED VOID', 0, textY);

      // 2. Isometric Ground Summoning Ring
      ctx.scale(1, 0.4); // Isometric perspective
      const ringRadius = 160 * progress;

      // Outer glowing cyan ring
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00E5FF';
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(0, 229, 255, ${progress})`;
      ctx.stroke();

      // Inner rotating dashed indigo/purple ring
      ctx.rotate(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(138, 43, 226, ${progress * 1.2})`;
      ctx.stroke();

      ctx.restore();
    }

    // Draw Sakuga Anime Impact Frame (matches reference image style with unique angle/variation)
    if (this.sakugaImpactTimer > 0) {
      this._drawSakugaImpactFrame(
        ctx,
        this.sakugaImpactX,
        this.sakugaImpactY,
        this.sakugaImpactTimer,
        this.sakugaImpactMaxTimer,
        this.sakugaImpactAngle || 0,
        this.sakugaImpactSeed || 0
      );
    }

    // Render residual hit flame wisps (soft, flowy, curling JJK spirit flames)
    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      const time = Date.now();
      this.hitFlameWisps.forEach((wisp, idx) => {
        const progress = wisp.timer / wisp.maxTimer;
        ctx.save();
        ctx.translate(wisp.x, wisp.y);
        ctx.rotate(wisp.angle);
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;

        const len = wisp.length * (0.8 + (1 - progress) * 0.6);
        const width = wisp.width * progress;
        const wave = Math.sin(time * 0.015 + idx * 2.3) * 4;

        // Draw soft, S-curved fluid flame wisp
        ctx.beginPath();
        ctx.moveTo(0, 0); // Flame base
        ctx.quadraticCurveTo(len * 0.4, width * 1.8 + wave, len * 0.75, width * 0.6);
        ctx.quadraticCurveTo(len + wave * 0.5, 0, len * 0.75, -width * 0.6);
        ctx.quadraticCurveTo(len * 0.4, -width * 1.8 - wave, 0, 0);
        ctx.closePath();

        // Soft glowing cyan-teal spirit flame fill
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00F0C0';
        ctx.fillStyle = 'rgba(0, 212, 204, 0.75)';
        ctx.fill();

        // Inner bright white-mint core flame
        ctx.beginPath();
        ctx.moveTo(len * 0.1, 0);
        ctx.quadraticCurveTo(len * 0.4, width * 0.8 + wave * 0.5, len * 0.6, 0);
        ctx.quadraticCurveTo(len * 0.4, -width * 0.8 - wave * 0.5, len * 0.1, 0);
        ctx.fillStyle = 'rgba(220, 255, 245, 0.6)';
        ctx.fill();

        // Soft translucent dark ink accent edge (hand-drawn JJK wisp accent)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 30, 20, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw Gojo Punch Impact Effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      this.punchEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        const alpha = Math.sin((1 - prog) * Math.PI);

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 1. Outer Glowing Blue Shockwave Ring
        const ringRadius = (this.r + 5) * (0.8 + 1.2 * prog);
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. High-contrast Black Ink Outline (makes it visible on white/light backgrounds)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.94, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Piercing White Impact Star Core
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

        // 4. Directional Cyan Impact Sparks
        ctx.strokeStyle = '#00E5FF';
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

    // Draw Reversal Red Repulsion Effect
    if (this.redEffectTimer > 0) {
      this._drawReversalRedEffect(ctx);
    }

    // Draw fighter body FIRST (underneath the energy)
    drawGojoBody(ctx, this);

    this.drawGun(ctx);

    // Draw JJK Cursed Energy Flame Aura ON TOP of body (engulfing him)
    // Also show during countdown for dramatic effect
    if (this.isChannelingRCT || this.healingAuraTimer > 0) {
      this._drawJJKCursedEnergyAura(ctx, 'rct');
    } else if (this.combatAuraOpacity > 0 || state.gameState === 'countdown' || this._isWinnerReveal) {
      this._drawJJKCursedEnergyAura(ctx, 'blue');
    }

    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);

    if (this._isWinnerReveal) {
      const t = Date.now();
      const orbitRadius = this.r + 40; 
      
      const drawOrbitingOrb = (colorType, angleOffset) => {
        const angle = (t / 600) + angleOffset;
        const ox = this.x + Math.cos(angle) * orbitRadius;
        const oy = this.y + Math.sin(angle) * orbitRadius * 0.4 - 10;
        drawGojoOrb(ctx, ox, oy, 9, t, colorType, 0);
      };
      
      drawOrbitingOrb('red', 0);
      drawOrbitingOrb('blue', (Math.PI * 2) / 3);
      drawOrbitingOrb('purple', (Math.PI * 4) / 3);
    }
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }

  _drawHealingAura(ctx) {
    const progress = this.healingAuraTimer / 180; // Fade out as timer decreases
    const time = Date.now();

    // Use source-over to properly layer colors on white background
    // 'lighter' blending on white background makes colors invisible
    ctx.globalCompositeOperation = 'source-over';

    // === LAYER 1: THE DARK OUTER EDGE (Deep Blue Silhouette) ===
    // Deep blue creates contrast against white background
    const outerRadius = this.r * 1.8; // Reduced from 2.5
    const outerGradient = ctx.createRadialGradient(
      this.x, this.y, this.r * 0.5,
      this.x, this.y, outerRadius
    );
    outerGradient.addColorStop(0, `rgba(100, 180, 255, ${0.98 * progress})`); // Bright blue center
    outerGradient.addColorStop(0.3, `rgba(80, 160, 255, ${0.98 * progress})`); // Vivid blue
    outerGradient.addColorStop(0.5, `rgba(60, 140, 255, ${0.95 * progress})`); // Rich blue
    outerGradient.addColorStop(0.7, `rgba(40, 120, 255, ${0.85 * progress})`); // Deep blue
    outerGradient.addColorStop(1, 'rgba(20, 80, 200, 0)'); // Fade to blue

    ctx.beginPath();
    ctx.arc(this.x, this.y, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = outerGradient;
    ctx.fill();

    // === LAYER 2: SOFT SMUDGING (Rich Blue Gradient) ===
    // Creates the smoky, ethereal gradient effect
    const smokeRadius = this.r * 1.6; // Reduced from 2.2
    const smokeGradient = ctx.createRadialGradient(
      this.x, this.y, this.r * 0.3,
      this.x, this.y, smokeRadius
    );
    smokeGradient.addColorStop(0, `rgba(120, 200, 255, ${0.95 * progress})`); // Bright blue
    smokeGradient.addColorStop(0.3, `rgba(100, 180, 255, ${0.98 * progress})`); // Vivid blue
    smokeGradient.addColorStop(0.6, `rgba(80, 160, 255, ${0.9 * progress})`); // Rich blue
    smokeGradient.addColorStop(1, 'rgba(60, 140, 255, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, smokeRadius, 0, Math.PI * 2);
    ctx.fillStyle = smokeGradient;
    ctx.fill();

    // === LAYER 3: THE BRIGHT CORE (Vibrant Blue Hugging the Character) ===
    // Fire is brightest at its source - this layer hugs the character's body
    const coreRadius = this.r * 1.1; // Reduced from 1.5
    const coreGradient = ctx.createRadialGradient(
      this.x, this.y, this.r * 0.4,
      this.x, this.y, coreRadius
    );
    coreGradient.addColorStop(0, `rgba(150, 220, 255, ${1.0 * progress})`); // Bright cyan core
    coreGradient.addColorStop(0.3, `rgba(120, 200, 255, ${0.98 * progress})`); // Vivid blue
    coreGradient.addColorStop(0.6, `rgba(100, 180, 255, ${0.95 * progress})`); // Medium blue
    coreGradient.addColorStop(1, 'rgba(80, 160, 255, 0)'); // Fade to blue

    ctx.beginPath();
    ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    // === LAYER 4: THE HOT CENTER (Bright Emerald Green & Cyan Core) ===
    const whiteHotRadius = this.r * 0.9;
    const whiteHotGradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, whiteHotRadius
    );
    whiteHotGradient.addColorStop(0, `rgba(200, 255, 220, ${1.0 * progress})`); // Bright white-green center
    whiteHotGradient.addColorStop(0.3, `rgba(0, 255, 150, ${0.95 * progress})`); // Vibrant emerald green
    whiteHotGradient.addColorStop(0.6, `rgba(100, 220, 255, ${0.85 * progress})`); // Cyan transition
    whiteHotGradient.addColorStop(1, 'rgba(0, 200, 150, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, whiteHotRadius, 0, Math.PI * 2);
    ctx.fillStyle = whiteHotGradient;
    ctx.fill();

    // === LAYER 5: CAST DEEP SHADOWS (Dark Shadows on Back Side) ===
    // Creates dramatic contrast by placing dark shadows on parts facing away
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow gradient - darker on the opposite side of the energy source
    const shadowAngle = Math.atan2(-this.vy, -this.vx) || 0; // Shadow opposite to movement
    ctx.rotate(shadowAngle);

    const shadowGrad = ctx.createRadialGradient(0, 0, this.r * 0.8, 0, 0, this.r * 1.4); // Reduced from 2
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.5, `rgba(40, 120, 200, ${0.9 * progress})`); // Brighter blue shadow
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Draw shadow crescent on the back side
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 2, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.arc(0, 0, this.r * 0.8, Math.PI * 0.3, -Math.PI * 0.3, true);
    ctx.closePath();
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.restore();

    // === LAYER 6: SHARP OUTLINES (Fine Whipping Wind Lines) ===
    // Sharp, whipping wind lines showing the direction the energy is flowing
    ctx.save();
    ctx.translate(this.x, this.y);

    const windLineCount = 16;
    for (let i = 0; i < windLineCount; i++) {
      const baseAngle = (Math.PI * 2 / windLineCount) * i;
      const wobble = Math.sin(time * 0.008 + i * 0.5) * 0.1;
      const angle = baseAngle + wobble;

      const startDist = this.r * (0.6 + Math.sin(time * 0.01 + i) * 0.1); // Reduced from 0.9
      const length = this.r * (0.5 + Math.sin(time * 0.012 + i * 0.7) * 0.4); // Reduced from 0.8

      const x1 = Math.cos(angle) * startDist;
      const y1 = Math.sin(angle) * startDist;
      const x2 = Math.cos(angle) * (startDist + length);
      const y2 = Math.sin(angle) * (startDist + length);

      // Draw sharp wind line with gradient - bright blue for visibility
      const windGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      windGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      windGrad.addColorStop(0.5, `rgba(100, 180, 255, ${0.9 * progress})`);
      windGrad.addColorStop(1, 'rgba(80, 160, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = windGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Extra sharp tip at the end - bright cyan
      ctx.beginPath();
      ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();
    }
    ctx.restore();

    // === LAYER 7: FLAME TENDRILS (The Iconic Engulfed-in-Flames Effect) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const flameCount = 8;
    for (let i = 0; i < flameCount; i++) {
      const baseAngle = (Math.PI * 2 / flameCount) * i;
      const rotation = time * 0.003; // Slow rotation
      const angle = baseAngle + rotation;

      ctx.save();
      ctx.rotate(angle);

      // Flame tendril - animated wavy shape
      const flameLength = this.r * (1.0 + Math.sin(time * 0.01 + i) * 0.3); // Reduced from 1.4
      const flameWidth = this.r * 0.3; // Reduced from 0.4

      // Create flame gradient (bright blue for visibility)
      const flameGrad = ctx.createLinearGradient(this.r * 0.6, 0, this.r * 0.6 + flameLength, 0);
      flameGrad.addColorStop(0, `rgba(120, 200, 255, ${1.0 * progress})`); // Bright blue base
      flameGrad.addColorStop(0.3, `rgba(100, 180, 255, ${0.98 * progress})`); // Vivid blue
      flameGrad.addColorStop(0.6, `rgba(80, 160, 255, ${0.9 * progress})`); // Medium blue
      flameGrad.addColorStop(1, 'rgba(60, 140, 255, 0)'); // Fade to blue

      // Draw wavy flame shape
      ctx.beginPath();
      ctx.moveTo(this.r * 0.6, 0);

      const segments = 10;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = this.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset - width * 0.5);
      }

      for (let j = segments; j >= 0; j--) {
        const t = j / segments;
        const x = this.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset + width * 0.5);
      }

      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Inner bright core of flame (bright cyan hot streak)
      ctx.beginPath();
      ctx.moveTo(this.r * 0.7, 0);
      const innerLength = flameLength * 0.5;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = this.r * 0.7 + innerLength * t;
        const waveOffset = Math.sin(time * 0.02 + j * 0.6 + i) * flameWidth * 0.25 * (1 - t);
        ctx.lineTo(x, waveOffset);
      }
      ctx.strokeStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    // === LAYER 8: ROTATING ENERGY RINGS (Swirling Domain-like Effect) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const ringRotation = time * 0.004;
    ctx.rotate(ringRotation);

    const ringRadius = this.r * 1.2; // Reduced from 1.6

    // Draw elliptical rings at different angles
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 3);

      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.18 + r * 0.08), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 180, 255, ${(0.95 - r * 0.2) * progress})`;
      ctx.lineWidth = 3 - r * 0.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(80, 160, 255, 1)';
      ctx.stroke();

      ctx.restore();
    }

    // Counter-rotating inner rings (Green RCT Energy Swirls)
    ctx.rotate(-ringRotation * 2);
    const innerRingRadius = this.r * 0.8;

    for (let r = 0; r < 2; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 2 + Math.PI / 4);

      ctx.beginPath();
      ctx.ellipse(0, 0, innerRingRadius, innerRingRadius * 0.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${(0.95 - r * 0.15) * progress})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(0, 255, 136, 1)';
      ctx.stroke();

      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // === LAYER 9: FLOATING CURSED ENERGY PARTICLES ===
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1337.7331;
      const angle = (time * 0.002) + seed;
      const baseDist = this.r * (0.4 + (seed % 30) / 30); // Reduced from 0.6
      const wobble = Math.sin(time * 0.008 + seed) * 8; // Reduced from 12
      const dist = baseDist + wobble;

      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;

      const particleSize = 2 + (seed % 5);
      const alpha = 0.5 + Math.sin(time * 0.01 + seed) * 0.3;

      // Particle glow - bright blue for visibility
      const particleGrad = ctx.createRadialGradient(px, py, 0, px, py, particleSize * 4);
      particleGrad.addColorStop(0, `rgba(150, 220, 255, ${alpha * progress})`);
      particleGrad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha * 0.8 * progress})`);
      particleGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

      ctx.beginPath();
      ctx.arc(px, py, particleSize * 4, 0, Math.PI * 2);
      ctx.fillStyle = particleGrad;
      ctx.fill();

      // Bright core - bright cyan
      ctx.beginPath();
      ctx.arc(px, py, particleSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 240, 255, ${alpha * progress})`;
      ctx.fill();
    }

    // === LAYER 10: OUTER FLAME CROWN (Top Flames Rising Up) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const crownFlameCount = 12;
    for (let i = 0; i < crownFlameCount; i++) {
      const angle = (Math.PI * 2 / crownFlameCount) * i - Math.PI / 2; // Start from top
      const flameHeight = this.r * (0.4 + Math.sin(time * 0.012 + i * 0.7) * 0.25); // Reduced from 0.6

      ctx.save();
      ctx.rotate(angle);

      // Rising flame with bright blue gradient
      const crownGrad = ctx.createLinearGradient(0, -this.r, 0, -this.r - flameHeight);
      crownGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      crownGrad.addColorStop(0.4, `rgba(100, 180, 255, ${0.9 * progress})`);
      crownGrad.addColorStop(0.8, `rgba(80, 160, 255, ${0.7 * progress})`);
      crownGrad.addColorStop(1, 'rgba(60, 140, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(-7, -this.r);
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i) * 8, -this.r - flameHeight * 0.5,
        0, -this.r - flameHeight
      );
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i + 1) * 8, -this.r - flameHeight * 0.5,
        7, -this.r
      );
      ctx.closePath();
      ctx.fillStyle = crownGrad;
      ctx.fill();

      // Bright cyan hot tip
      ctx.beginPath();
      ctx.arc(0, -this.r - flameHeight, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Spawn occasional healing particles while aura is active
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.r * (0.5 + Math.random() * 0.5);
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 1, 'healing');
    }
  }

  drawGun(ctx) {
    drawGojoWeapon(ctx, this);
  }

  /**
   * Render JJK-authentic Cursed Energy Flame Aura engulfing the character.
   * Smooth, flowing flame silhouette with thick dark ink contour (not spiky).
   */
  _drawJJKCursedEnergyAura(ctx, colorTheme = 'rct') {
    // Calculate smooth fade-in & fade-out progress
    let progress = 1.0;
    if (colorTheme === 'rct') {
      progress = Math.min(1, (this.healingAuraTimer / 180) || (this.rctChannelTimer / 150) || 1);
    } else {
      progress = Math.min(1, Math.max(0, this.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor((Date.now() / 1000) * frameRate) % 30;
    const time = frameIndex * 120; // 30 distinct stepped frames

    ctx.save();
    ctx.translate(this.x, this.y - (this.z || 0));
    ctx.globalCompositeOperation = 'source-over';

    const r = this.r;

    const isRCT = colorTheme === 'rct';
    const mainColor = isRCT ? '#32CD32' : '#00D4CC';
    const fillColor = isRCT ? `rgba(50, 205, 50, ${0.25 * progress})` : `rgba(0, 212, 204, ${0.15 * progress})`;
    const coreColor = isRCT ? `rgba(144, 238, 144, ${0.25 * progress})` : `rgba(200, 255, 250, ${0.18 * progress})`;
    const strokeColor = '#000000'; // Pure pitch black JJK ink contour

    // Soft ambient glow
    ctx.shadowBlur = 20 * progress;
    ctx.shadowColor = mainColor;

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette - stretching Sakuga tongues)
    const numPoints = 28;
    const baseRadius = r + 15;
    const points = [];
    const moveOffset = (this.x + this.y) * 0.015;

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Upward direction bias (flames flow upward)
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25);
      const sideFactor = 1.0 - upFactor * 0.5;

      // Base shape evolution for stretching flame tongues
      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005 - moveOffset * 0.2) * 0.5 + 0.5, 3.0) * 25 * upFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004 + moveOffset * 0.15) * 0.5 + 0.5, 2.5) * 18 * upFactor;

      // Localized height flicker
      const tongueFlicker = Math.sin(time * 0.002 + i * 1.4) * 5 * upFactor;
      const sideWave = Math.sin(time * 0.0012 + i * 0.8) * 4 * sideFactor;

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
      const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5; // 0 to 1
      const baseThick = 1.2 + pressureNoise * 2.5; // ranges from 1.2px to 3.7px

      ctx.lineWidth = baseThick;
      ctx.beginPath();

      // Get previous midpoint as start
      const prev = points[(i - 1 + numPoints) % numPoints];
      const prevMidX = (prev.x + p.x) / 2;
      const prevMidY = (prev.y + p.y) / 2;

      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
      ctx.stroke();
    }

    // Inner bright core wash
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    ctx.globalAlpha = 0.9 * progress;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';

    // Draw 3 layers of thin, rough, broken/cut ink lines moving alongside the border
    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      for (let i = 0; i < numPoints; i++) {
        // Dynamic moving cuts & breaks traveling around the border over time
        const cutSeed = Math.sin(i * 17.3 + layer * 31.7 + flowTime * 2.5);
        if (cutSeed < -0.1) continue;

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        const prev = points[(i - 1 + numPoints) % numPoints];

        // Dynamic animated ink jitter for flowing hand-drawn anime texture
        const jitterX = Math.sin(i * 7.9 + layer * 5.3 + time * 0.005) * 1.8;
        const jitterY = Math.cos(i * 11.3 - layer * 3.7 + time * 0.004) * 1.8;

        const midX = (p.x * scale + next.x * scale) / 2 + jitterX;
        const midY = (p.y * scale + next.y * scale) / 2 + jitterY;
        const prevMidX = (prev.x * scale + p.x * scale) / 2 - jitterX * 0.5;
        const prevMidY = (prev.y * scale + p.y * scale) / 2 - jitterY * 0.5;

        // Thinner stroke width with pulsing pressure along the movement
        const pressureNoise = Math.sin(time * 0.005 + i * 2.3 + layer * 5.1) * 0.5 + 0.5;
        ctx.lineWidth = 0.6 + pressureNoise * 1.6;

        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p.x * scale + jitterX, p.y * scale + jitterY, midX, midY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Soft rising flame wisps (smooth curves, not sharp tendrils)
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 * progress;
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

  _drawSakugaImpactFrame(ctx, x, y, timer, maxTimer, angleOffset = 0, seed = 0) {
    const progress = 1 - (timer / maxTimer);
    const alpha = timer / maxTimer;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleOffset);
    ctx.scale(0.25, 0.25);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 1.5));

    // 1. Bright white center void
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 70 * (1 + progress * 0.3), 0, Math.PI * 2);
    ctx.fill();

    // 2. Ink clusters radiating outward (varied based on seed)
    const clusters = [
      { angle: -Math.PI * 0.75 + (seed * 0.3), dist: 55 + (seed * 15), scale: 1.2, lines: 7 },
      { angle: -Math.PI * 0.25 - (seed * 0.2), dist: 75 - (seed * 10), scale: 1.5, lines: 9 },
      { angle: 0.1 + (seed * 0.4), dist: 65 + (seed * 12), scale: 0.8, lines: 5 },
      { angle: Math.PI * 0.35 - (seed * 0.3), dist: 85 - (seed * 18), scale: 1.4, lines: 8 },
      { angle: Math.PI * 0.65 + (seed * 0.2), dist: 75 + (seed * 14), scale: 1.1, lines: 7 },
      { angle: Math.PI * 0.85 - (seed * 0.4), dist: 95 - (seed * 16), scale: 1.3, lines: 8 },
      { angle: -Math.PI * 0.9 + (seed * 0.25), dist: 85 + (seed * 10), scale: 1.0, lines: 6 },
    ];

    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#0a0a0a';

    clusters.forEach(c => {
      ctx.save();
      const cx = Math.cos(c.angle) * (c.dist + progress * 20);
      const cy = Math.sin(c.angle) * (c.dist + progress * 20);
      ctx.translate(cx, cy);
      ctx.rotate(c.angle + Math.PI / 2);

      // Cluster of parallel sharp ink brush spikes
      const numLines = c.lines;
      const width = 22 * c.scale;
      for (let i = 0; i < numLines; i++) {
        const lx = (i / (numLines - 1) - 0.5) * width;
        const length = (55 + Math.sin(i * 1.5) * 30) * c.scale;
        const thick = (2 + (i % 3) * 1.2) * c.scale;

        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, -length);
        ctx.stroke();
      }

      // Base ink blob connecting the cluster spikes
      ctx.beginPath();
      ctx.moveTo(-width * 0.5, 3);
      ctx.lineTo(width * 0.5, 3);
      ctx.lineTo(width * 0.3, -15 * c.scale);
      ctx.lineTo(-width * 0.3, -15 * c.scale);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // 3. Purple & Cyan inner line-art traces (matching subtle color in reference image)
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
      ctx.stroke();
    }

    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render authentic JJK Cursed Technique Reversal: Red (Aka) visual effect.
   * Uses the same JJK ink brush algorithm (varying pressure, dry-brush jitter, broken cuts) as Gojo's spiritual energy edges.
   */
  _drawReversalRedEffect(ctx) {
    const prog = 1 - (this.redEffectTimer / this.redEffectMaxTimer); // 0 to 1
    const alpha = Math.sin((1 - prog) * Math.PI);
    const angle = this.redTargetAngle || this.gunAngle || 0;
    const time = Date.now();

    ctx.save();
    ctx.translate(this.x, this.y - (this.z || 0));
    ctx.rotate(angle);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Fingertip origin point
    const fingerDist = this.r + 14;
    const maxRange = (CONFIG.gojo.redRange || 100) + 50;
    const beamLength = maxRange * (0.3 + prog * 0.9);
    const beamSpread = 35 * (0.5 + prog * 0.8);

    // 1. Directional Violent Repulsion Cone & Beam
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 30 * alpha;
    ctx.shadowColor = '#FF0033';

    // Crimson Repulsion Beam Cone
    const coneGrad = ctx.createLinearGradient(fingerDist, 0, fingerDist + beamLength, 0);
    coneGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');  // White-hot origin
    coneGrad.addColorStop(0.25, 'rgba(255, 0, 51, 0.9)');  // Intense Crimson Red
    coneGrad.addColorStop(0.7, 'rgba(200, 0, 40, 0.5)');   // Deep Blood Red
    coneGrad.addColorStop(1, 'rgba(150, 0, 20, 0)');

    ctx.beginPath();
    ctx.moveTo(fingerDist, 0);
    ctx.lineTo(fingerDist + beamLength, -beamSpread);
    ctx.quadraticCurveTo(fingerDist + beamLength * 1.1, 0, fingerDist + beamLength, beamSpread);
    ctx.closePath();
    ctx.fillStyle = coneGrad;
    ctx.fill();
    ctx.restore();

    // 2. SAME JJK INK BRUSH STROKES as Spiritual Energy Edges (varying pressure, broken cuts & dry-brush jitter)
    ctx.strokeStyle = '#000000'; // Pitch black JJK ink
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    const numArcs = 6;
    for (let k = 0; k < numArcs; k++) {
      const arcDist = fingerDist + 15 + k * (beamLength / numArcs) * (0.5 + prog * 0.6);
      const arcSpread = (22 + k * 16 * prog) * (Math.PI / 180);
      const numSegments = 16;

      // Draw broken dry-brush ink strokes along each repulsion arc
      for (let layer = 0; layer < 2; layer++) {
        const offsetR = arcDist * (1.0 + (layer === 0 ? 0 : -0.05));

        for (let i = 0; i < numSegments; i++) {
          const segAngle1 = -arcSpread + (arcSpread * 2 / numSegments) * i;
          const segAngle2 = -arcSpread + (arcSpread * 2 / numSegments) * (i + 1);

          // Cut & gap noise (broken short/tall dry-brush cuts)
          const cutSeed = Math.sin(i * 13.7 + k * 23.1 + layer * 41.5 + time * 0.01);
          if (cutSeed < -0.15) continue; // Gap/cut in ink stroke!

          // Pressure noise (varying brush thickness: 0.6px to 3.5px)
          const pressureNoise = Math.sin(i * 3.1 + k * 5.7 + time * 0.02) * 0.5 + 0.5;
          const strokeThick = 0.6 + pressureNoise * 2.8;

          // Micro jitter for rough dry-brush texture
          const jitterX = (Math.sin(i * 9.1 + k * 17.3) * 0.8);
          const jitterY = (Math.cos(i * 11.3 + k * 19.7) * 0.8);

          ctx.lineWidth = strokeThick;
          ctx.beginPath();
          ctx.arc(jitterX, jitterY, offsetR, segAngle1, segAngle2);
          ctx.stroke();
        }
      }
    }

    // 3. Expanding Crimson Repulsion Rings with Ink Edge
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#FF0033';
    ctx.strokeStyle = '#FF0033';
    ctx.lineWidth = 3.5 * (1 - prog * 0.5);

    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const ringR = (this.r + 15) + (rIdx * 35 + prog * 110);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Dense Crimson Fingertip Orb (Aka Core) with JJK Ink Brush Edge
    ctx.save();
    ctx.translate(fingerDist, 0);

    // Outer Crimson Glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FF0033';

    const orbR = 10 * (1.3 - prog * 0.4);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, orbR * 2.2);
    coreGrad.addColorStop(0, '#FFFFFF');                  // Hot white center
    coreGrad.addColorStop(0.3, 'rgba(255, 0, 51, 1.0)');  // Pure Crimson Aka Red
    coreGrad.addColorStop(0.75, 'rgba(150, 0, 30, 0.8)'); // Deep Blood Red
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, orbR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // JJK Ink Brush Contour around Fingertip Orb (using pressure noise & cut segments)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';
    const orbSegments = 12;
    for (let i = 0; i < orbSegments; i++) {
      const a1 = (Math.PI * 2 / orbSegments) * i;
      const a2 = (Math.PI * 2 / orbSegments) * (i + 1);

      const cutSeed = Math.sin(i * 19.3 + time * 0.01);
      if (cutSeed < -0.3) continue; // Broken ink cuts!

      const pressureNoise = Math.sin(i * 2.9 + time * 0.015) * 0.5 + 0.5;
      ctx.lineWidth = 0.8 + pressureNoise * 2.2;

      ctx.beginPath();
      ctx.arc(0, 0, orbR * 0.9, a1, a2);
      ctx.stroke();
    }

    ctx.restore();

    ctx.restore();
  }
}
