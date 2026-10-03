// ─────────────────────────────────────────────
// Sans Fighter Class
// Undertale / Deltarune by Toby Fox
// Adhering to Rule 1.1 (Freeze & TimeStop Early Exits),
// Rule 1.2 (Centralized Physics), and Rule 1.4 (360° Aiming)
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { sansConfig } from '../../configs/characters/sansConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawSansSkin } from '../../graphics/fighters/sansSkin.js';
import { FighterRenderer } from '../../graphics/renderers/fighterRenderer.js';
import { drawGasterBlaster, drawGasterBeam, drawBoneProjectile, drawBoneStabTrap, drawBlueSoulIndicator, drawSlamImpact, drawSansSpeechBubble, drawHeartShatterEffect } from '../../graphics/weapons/sansWeaponGraphics.js';

export class SansFighter extends Fighter {
  constructor(def = {}) {
    super(def);
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    this.characterId = 'sans';
    this.type = 'sans';
    this.name = def.name || 'SANS';
    this.themeColor = cfg.themeColor || '#2c4de0ff';
    this.color = this.themeColor;
    this.secondaryColor = cfg.secondaryColor || '#FFE600';
    this.damageNumberColor = cfg.damageNumberColor || '#2c4de0ff';

    this.moveSpeed = (def.moveSpeed !== undefined) ? def.moveSpeed : (cfg.moveSpeed || cfg.speed || 5.2);
    this.baseSpeed = this.moveSpeed;
    this.speed = this.baseSpeed;
    this.dodgeStallTimer = 0;
    this.hp = (def.hp !== undefined) ? def.hp : (cfg.hp !== undefined ? cfg.hp : 1);
    this.maxHp = this.hp;

    // Undertale Speech Bubble System
    this.speechBubble = {
      text: '',
      fullText: '',
      charIndex: 0,
      timer: 0,
      maxTimer: 120,
      charTimer: 0,
      blipInterval: 3
    };
    this._speechCooldown = 0;
    this._hasSaidIntro = false;
    this._hasSaidWinQuote = false;
    this._hasSaidDeathQuote = false;

    // Passive 1: Dodge Stamina System (replaces healthbar in HUD)
    this.stamina = (cfg.dodgeStaminaMax !== undefined) ? cfg.dodgeStaminaMax : 100;
    this.maxStamina = (cfg.dodgeStaminaMax !== undefined) ? cfg.dodgeStaminaMax : 100;
    this.dodgeCooldown = 0;
    this.afterImages = [];

    // Passive 2: Karmic Retribution (KR) State
    this.karmaTargets = new Map(); // target -> { stacks, timer, tickTimer }

    // Skill 1: Gaster Blasters
    this.blasterCooldown = 0;
    this.gasterBlasters = [];

    // Skill 2: Bone Zone & Traps
    this.boneZoneCooldown = 0;
    this.boneProjectiles = [];
    this.boneTraps = [];

    // Skill 3: Bad Time & Blue Soul Gravity
    this.gravitySlamCooldown = 0;
    this.isBadTimeActive = false;
    this.badTimeTimer = 0;
    this.blueSoulActive = false;
    this.blueSoulVictim = null;
    this.gravitySlamTimer = 0;
    this.gravitySlamDuration = cfg.gravitySlamDuration || 80;
    this.gravitySlamDirX = 0;
    this.gravitySlamDirY = 0;
    this.slamImpacts = [];
    this.heartShatters = [];
    this._hasTriggeredOpponentShatter = false;
    // Basic Attack Cooldown & Animation
    this.basicAttackCooldown = 0;
    this.basicAttackAnimTimer = 0;
    this.basicAttackAnimMaxTimer = 16;
    this.shootCooldownMax = 0;
    this.shootCooldown = 999999;

    // Register HUD Skills
    this.skillManager.registerSkills([
      {
        id: 'gaster_blaster',
        name: 'Gaster Blaster',
        type: 'ranged',
        isSignature: true,
        signature: true,
        cooldownKey: 'blasterCooldown',
        cooldownMax: () => (CONFIG.sans?.blasterCooldown ?? sansConfig.blasterCooldown),
        color: this.themeColor,
        icon: '💀',
        onActivate: (fighter, opponent) => {
          fighter.castGasterBlasters(opponent);
        }
      },
      {
        id: 'bone_zone',
        name: 'Bone Zone',
        type: 'special',
        cooldownKey: 'boneZoneCooldown',
        cooldownMax: () => (CONFIG.sans?.boneZoneCooldown ?? sansConfig.boneZoneCooldown),
        color: this.themeColor,
        icon: '🦴',
        onActivate: (fighter, opponent) => {
          fighter.castBoneZone(opponent);
        }
      },
      {
        id: 'bad_time',
        name: 'Bad Time',
        type: 'ultimate',
        cooldownKey: 'gravitySlamCooldown',
        cooldownMax: () => (CONFIG.sans?.gravitySlamCooldown ?? sansConfig.gravitySlamCooldown),
        color: this.themeColor,
        icon: '💙',
        onActivate: (fighter, opponent) => {
          fighter.castBadTimeGravitySlam(opponent);
        }
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    // Sans maintains his canonical 1 HP ignoring arena mode fixed HP overrides
    this.maxHp = (cfg.hp !== undefined) ? cfg.hp : 1;
    this.hp = this.maxHp;
    this.stamina = (cfg.dodgeStaminaMax !== undefined) ? cfg.dodgeStaminaMax : 100;
    this.maxStamina = (cfg.dodgeStaminaMax !== undefined) ? cfg.dodgeStaminaMax : 100;

    this.dodgeCooldown = 0;
    this.blasterCooldown = 0;
    this.boneZoneCooldown = 0;
    this.gravitySlamCooldown = 0;
    this.isBadTimeActive = false;
    this.badTimeTimer = 0;
    this.blueSoulActive = false;
    this.blueSoulVictim = null;
    this.gravitySlamTimer = 0;
    this.basicAttackCooldown = 0;
    this.basicAttackAnimTimer = 0;
    this.basicAttackAnimMaxTimer = 16;
    this.shootCooldownMax = 0;
    this.shootCooldown = 999999;

    this.gasterBlasters = [];
    this.blasterCircleSequence = null;
    this.blasterPatternIndex = 0;
    this.lastBlasterPattern = -1;
    this.boneProjectiles = [];
    this.boneTraps = [];
    this.slamImpacts = [];
    this.heartShatters = [];
    this._hasTriggeredOpponentShatter = false;
    this.speechBubble = {
      text: '',
      fullText: '',
      charIndex: 0,
      timer: 0,
      maxTimer: 120,
      charTimer: 0,
      blipInterval: 3
    };
    this._speechCooldown = 0;
    this._hasSaidIntro = false;
    this._hasSaidWinQuote = false;
    this._hasSaidDeathQuote = false;
    if (this.afterImages) {
      this.afterImages.length = 0;
    } else {
      this.afterImages = [];
    }
    if (this.karmaTargets && typeof this.karmaTargets.clear === 'function') {
      this.karmaTargets.clear();
    } else {
      this.karmaTargets = new Map();
    }
    const def = this._def || {};
    const originalBaseSpeed = (def.moveSpeed !== undefined) ? def.moveSpeed : (cfg.moveSpeed !== undefined ? cfg.moveSpeed : (cfg.speed || 5.2));
    this.moveSpeed = originalBaseSpeed;
    this.baseSpeed = originalBaseSpeed;
    this.speed = originalBaseSpeed;
    this.dodgeStallTimer = 0;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  isStationarySkillActive() {
    return Boolean(
      this.gravitySlamTimer > 0 ||
      (this.dodgeStallTimer && this.dodgeStallTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  resumeMovement(target = null, speedMultiplier = 1.0, forcedAngle = null) {
    this.dodgeStallTimer = 0;
    super.resumeMovement(target, speedMultiplier, forcedAngle);
  }

  /**
   * Instantly snaps Sans's aim angle (gunAngle & angle) directly toward the attacker/opponent.
   * Invoked upon teleport dodging to ensure immediate, snappy target alignment without turn lag.
   * @param {Object} [attacker=null] - Attacker, projectile, or target entity
   */
  snapAimAtTarget(attacker = null) {
    const target = (attacker && !attacker.isSliceLine && attacker !== this && attacker.hp > 0 && typeof attacker.x === 'number')
      ? attacker
      : ((attacker && attacker.owner && attacker.owner !== this && attacker.owner.hp > 0 && typeof attacker.owner.x === 'number')
        ? attacker.owner
        : ((attacker && attacker.attacker && attacker.attacker !== this && attacker.attacker.hp > 0 && typeof attacker.attacker.x === 'number')
          ? attacker.attacker
          : (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null))));

    if (target && typeof target.x === 'number' && typeof target.y === 'number') {
      const targetY = (target.y !== undefined ? target.y : this.y) - (target.z || 0);
      const myY = this.y - (this.z || 0);
      const snapAngle = Math.atan2(targetY - myY, target.x - this.x);
      this.gunAngle = snapAngle;
      this.angle = snapAngle;
      if (typeof this.aim === 'function') {
        this.aim(target);
      }
    }
  }

  interruptAttacks() {
    super.interruptAttacks();
    // Gaster Blasters and sequential circle spawners are independent summoned entities and persist through CC
  }

  /**
   * Triggers an authentic Undertale speech bubble above Sans with lowercase Comic Sans text and voice blips.
   */
  speak(text, duration = 120, force = false) {
    if (!text) return;
    if (!force && this._speechCooldown > 0 && this.speechBubble && this.speechBubble.timer > 0) return;
    const lowerText = String(text).toLowerCase();
    this.speechBubble = {
      text: '',
      fullText: lowerText,
      charIndex: 0,
      timer: duration,
      maxTimer: duration,
      charTimer: 0,
      blipInterval: 3
    };
    this._speechCooldown = duration + 35;
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      const speakSound = (CONFIG.sans?.sounds?.sansSpeak || sansConfig.sounds?.sansSpeak) || 'Assets/Sound Effects/Sans/SansSpeak.ogg';
      audioSystem.playSFX(speakSound, 0.75);
    }
  }

  /**
   * Triggers the Undertale Red SOUL Heart Split and Shatter Defeat VFX at the target coordinates.
   */
  triggerHeartShatter(x, y) {
    if (!this.heartShatters) this.heartShatters = [];
    this.heartShatters.push({
      x: x,
      y: y,
      timer: 85,
      maxTimer: 85,
      splitGap: 0,
      shards: [],
      soundPlayedSplit: false,
      soundPlayedShatter: false
    });
  }

  /**
   * Updates all active Undertale Heart Split and Shatter sequences.
   */
  _updateHeartShatters() {
    if (!this.heartShatters || this.heartShatters.length === 0) return;
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    for (let i = this.heartShatters.length - 1; i >= 0; i--) {
      const fx = this.heartShatters[i];
      if (!fx) {
        this.heartShatters.splice(i, 1);
        continue;
      }
      fx.timer--;

      // Phase 2: Heart Split (frames 70-53)
      if (fx.timer <= 70 && fx.timer > 52) {
        if (!fx.soundPlayedSplit) {
          fx.soundPlayedSplit = true;
          const splitSound = (cfg.sounds?.heartSplit || sansConfig.sounds?.heartSplit) || 'Assets/Sound Effects/Sans/HeartSplit.ogg';
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            audioSystem.playSFX(splitSound, 0.95);
          }
        }
        fx.splitGap = (70 - fx.timer) * 0.45;
      }

      // Phase 3: Heart Shatter into Shards (frames 52-0)
      if (fx.timer <= 52) {
        if (!fx.soundPlayedShatter) {
          fx.soundPlayedShatter = true;
          const shatterSound = (cfg.sounds?.heartShatter || sansConfig.sounds?.heartShatter) || 'Assets/Sound Effects/Sans/HeartShatter.ogg';
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            audioSystem.playSFX(shatterSound, 1.0);
          }
          triggerGlobalScreenShake(6.0, 16);

          // Generate 8 physics shards
          fx.shards = [];
          const shardCount = 8;
          for (let s = 0; s < shardCount; s++) {
            const angle = (s / shardCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const speed = 3.5 + Math.random() * 3.5;
            fx.shards.push({
              x: 0,
              y: 0,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2.5, // Initial upward pop
              rot: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 0.35,
              size: 3 + Math.random() * 3,
              color: (s % 3 === 0) ? '#FFFFFF' : '#FF0000'
            });
          }
        }

        // Update shard physics
        if (fx.shards) {
          for (const shard of fx.shards) {
            shard.x += shard.vx;
            shard.y += shard.vy;
            shard.vy += 0.26; // Gravity
            shard.vx *= 0.98; // Air resistance
            shard.rot += shard.vRot;
          }
        }
      }

      if (fx.timer <= 0) {
        this.heartShatters.splice(i, 1);
      }
    }
  }

  /**
   * Updates typewriter reveal progress and speech blip SFX.
   */
  _updateSpeech() {
    if (this._speechCooldown > 0) this._speechCooldown--;
    if (!this.speechBubble || this.speechBubble.timer <= 0) return;
    this.speechBubble.timer--;
    if (this.speechBubble.charIndex < this.speechBubble.fullText.length) {
      this.speechBubble.charTimer++;
      if (this.speechBubble.charTimer >= this.speechBubble.blipInterval) {
        this.speechBubble.charTimer = 0;
        this.speechBubble.charIndex = Math.min(this.speechBubble.fullText.length, this.speechBubble.charIndex + 1);
        this.speechBubble.text = this.speechBubble.fullText.slice(0, this.speechBubble.charIndex);
        const char = this.speechBubble.fullText[this.speechBubble.charIndex - 1];
        if (char && char !== ' ' && this.speechBubble.charIndex % 2 === 0) {
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            const speakSound = (CONFIG.sans?.sounds?.sansSpeak || sansConfig.sounds?.sansSpeak) || 'Assets/Sound Effects/Sans/SansSpeak.ogg';
            audioSystem.playSFX(speakSound, 0.65);
          }
        }
      }
    }
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   * Sans attacks exclusively via thematic bone projectiles, Gaster Blasters, and gravity slams.
   */
  shoot(ownerIndex) {
    // Disabled! Sans does not fire generic bullet projectiles.
  }

  /**
   * Clears all lingering afterimages.
   */
  clearAllAfterimages() {
    if (this.afterImages) this.afterImages.length = 0;
  }

  /**
   * Passive 2: Teleport Dodge & Stamina against Sukuna's domain slash lines.
   * Allows Sans to teleport dodge through Malevolent Shrine spatial slash lines as long as he has stamina.
   * @param {Object} lineData - Slice line intersection details { angle, cx, cy, normalX, normalY, thickness, attacker }
   * @returns {boolean} True if successfully dodged, false otherwise.
   */
  dodgeSliceLine(lineData = {}) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    if (!cfg.enableTeleportDodge) return false;

    const isFrozen = this.isTimeStopped || this.isStunned || this.isParalyzed || this.isChainedByMakima;
    if (isFrozen || this.hp <= 0) return false;

    // Special Interaction: Stamina/mana cost is only 1 when Sukuna's domain is open
    const isSukunaDomainActive = (lineData && (lineData.isSukunaDomain || lineData.attacker?.characterId === 'sukuna' || lineData.attacker?.type === 'sukuna')) ||
      (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'sukuna' || f.type === 'sukuna') && f.domainActive));
    const staminaCost = isSukunaDomainActive ? (cfg.domainDodgeStaminaCost ?? 1) : ((cfg.dodgeStaminaCost !== undefined) ? cfg.dodgeStaminaCost : 10);
    if (this.stamina < staminaCost) {
      return false; // Out of stamina -> cannot dodge slice line!
    }

    if (this.dodgeCooldown > 0 && (cfg.dodgeCooldown > 0)) {
      return false; // On dodge cooldown -> cannot dodge slice line!
    }

    // Probability roll check (domain spatial cuts)
    const dodgeChance = (cfg.domainDodgeChance !== undefined) ? cfg.domainDodgeChance : ((cfg.dodgeChance !== undefined) ? cfg.dodgeChance : 1.0);
    if (dodgeChance < 1.0 && Math.random() >= dodgeChance) {
      return false; // Roll failed -> slice line connects!
    }

    // Deduct stamina and set dodge cooldown
    this.stamina -= staminaCost;
    this.dodgeCooldown = (cfg.dodgeCooldown !== undefined) ? cfg.dodgeCooldown : 0;

    const startX = this.x;
    const startY = this.y;
    const startAngle = this.gunAngle || this.angle || 0;

    // Calculate evasion sidestep perpendicular to the spatial cut line
    const arena = state.arena || { width: 500, height: 500, x: 50, y: 50 };
    const angle = lineData.angle || 0;
    const nx = lineData.normalX !== undefined ? lineData.normalX : -Math.sin(angle);
    const ny = lineData.normalY !== undefined ? lineData.normalY : Math.cos(angle);

    let sideSign = 1;
    if (typeof lineData.cx === 'number' && typeof lineData.cy === 'number') {
      const side = (this.x - lineData.cx) * nx + (this.y - lineData.cy) * ny;
      sideSign = side >= 0 ? 1 : -1;
    } else {
      sideSign = Math.random() < 0.5 ? 1 : -1;
    }

    const jumpDist = (cfg.dodgeDistance !== undefined) ? cfg.dodgeDistance : 85;
    let targetX = this.x + nx * sideSign * jumpDist;
    let targetY = this.y + ny * sideSign * jumpDist;

    const minX = arena.x + this.r + 20;
    const maxX = arena.x + arena.width - this.r - 20;
    const minY = arena.y + this.r + 20;
    const maxY = arena.y + arena.height - this.r - 20;

    if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
      targetX = this.x - nx * sideSign * jumpDist;
      targetY = this.y - ny * sideSign * jumpDist;
    }

    const finalX = Math.max(minX, Math.min(maxX, targetX));
    const finalY = Math.max(minY, Math.min(maxY, targetY));

    // Spawn configurable afterimages across the teleport displacement vector
    this._spawnDodgeAfterimages(startX, startY, finalX, finalY, startAngle, startAngle);

    this.x = finalX;
    this.y = finalY;
    this.vx = 0;
    this.vy = 0;
    this.dodgeStallTimer = (cfg.dodgeStallDuration !== undefined) ? cfg.dodgeStallDuration : 12;

    // Snap aim directly at attacker upon teleport arrival (Rule 1.3)
    this.snapAimAtTarget(lineData?.attacker);

    // Spawn floating "MISS" banner
    spawnFloatingText(this.x, this.y - this.r - 12, 'MISS', '#FFFFFF');

    // Teleport flash SFX
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      const flashSnd = (CONFIG.sans?.sounds?.flash || sansConfig.sounds?.flash) || 'Assets/Sound Effects/Sans/Flash.ogg';
      audioSystem.playSFX(flashSnd, 0.7);
    }

    // Occasional voice blip on close dodge when low on HP
    if (this.hp < 50 && Math.random() < 0.25) {
      this.speak('whoops.', 80);
    }

    return true; // Successfully dodged!
  }

  /**
   * Spawns configurable dodge afterimages along the teleport displacement vector.
   */
  _spawnDodgeAfterimages(startX, startY, endX, endY, startAngle = 0, endAngle = 0) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    const count = cfg.dodgeAfterimageCount ?? cfg.dodgeAfterimages ?? 1;
    if (count <= 0) return;

    if (!this.afterImages) this.afterImages = [];
    const maxBuffer = cfg.dodgeMaxAfterimages ?? cfg.dodgeAfterimageMax ?? Math.max(16, count * 4);
    const duration = (cfg.dodgeAfterimageDuration !== undefined) ? cfg.dodgeAfterimageDuration : 20;
    const alpha = (cfg.dodgeAfterimageAlpha !== undefined) ? cfg.dodgeAfterimageAlpha : 0.40;

    for (let i = 0; i < count; i++) {
      while (this.afterImages.length >= maxBuffer) {
        this.afterImages.shift();
      }

      const t = count === 1 ? 0 : (i / count);
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      const pAngle = startAngle + (endAngle - startAngle) * t;

      this.afterImages.push({
        x: px,
        y: py,
        r: this.r,
        angle: pAngle,
        gunAngle: pAngle,
        timer: duration,
        maxTimer: duration,
        alpha: alpha
      });
    }
  }

  /**
   * Overrides takeDamage with Sans's signature Teleport Dodge & "MISS" mechanic.
   */
  takeDamage(amount, attacker, options = {}) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    // Check if dodge is valid: dodge enabled, stamina available, off cooldown (or zero cooldown), roll passed
    const isFrozen = this.isTimeStopped || this.isStunned || this.isParalyzed || this.isChainedByMakima;
    const isDomainSlash = Boolean(options.isSukunaDomainSliceLine || options.isDomainSlash);
    const dodgeChance = isDomainSlash ? ((cfg.domainDodgeChance !== undefined) ? cfg.domainDodgeChance : 1.0) : ((cfg.dodgeChance !== undefined) ? cfg.dodgeChance : 1.0);
    const rollsDodge = (dodgeChance >= 1.0 || Math.random() < dodgeChance);
    // Special Interaction: Stamina/mana cost is only 1 when Sukuna's domain is open
    const isSukunaDomainActive = isDomainSlash ||
      (attacker && (attacker.characterId === 'sukuna' || attacker.type === 'sukuna') && attacker.domainActive) ||
      (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'sukuna' || f.type === 'sukuna') && f.domainActive));
    const staminaCost = isSukunaDomainActive ? (cfg.domainDodgeStaminaCost ?? 1) : ((cfg.dodgeStaminaCost !== undefined) ? cfg.dodgeStaminaCost : 10);
    const hasStamina = (this.stamina >= staminaCost);
    const cooldownReady = (this.dodgeCooldown <= 0) || (cfg.dodgeCooldown === 0);
    const canDodge = cfg.enableTeleportDodge && !isFrozen && hasStamina && cooldownReady && rollsDodge;

    if (canDodge && (!options.bypassDodge || isDomainSlash)) {
      this.stamina -= staminaCost;
      this.dodgeCooldown = (cfg.dodgeCooldown !== undefined) ? cfg.dodgeCooldown : 0;

      const startX = this.x;
      const startY = this.y;
      const startAngle = this.gunAngle || this.angle || 0;

      // Teleport sideways / away
      const arena = state.arena || { width: 500, height: 500, x: 50, y: 50 };
      const centerX = arena.x + arena.width * 0.5;
      const centerY = arena.y + arena.height * 0.5;

      const randomAngle = Math.random() * Math.PI * 2;
      const jumpDist = (cfg.dodgeDistance !== undefined) ? cfg.dodgeDistance : 85;
      const newX = Math.max(arena.x + this.r + 20, Math.min(arena.x + arena.width - this.r - 20, this.x + Math.cos(randomAngle) * jumpDist));
      const newY = Math.max(arena.y + this.r + 20, Math.min(arena.y + arena.height - this.r - 20, this.y + Math.sin(randomAngle) * jumpDist));

      // Spawn configurable afterimages across the teleport displacement vector
      this._spawnDodgeAfterimages(startX, startY, newX, newY, startAngle, startAngle);

      this.x = newX;
      this.y = newY;
      this.vx = 0;
      this.vy = 0;
      this.dodgeStallTimer = (cfg.dodgeStallDuration !== undefined) ? cfg.dodgeStallDuration : 12;

      // Snap aim directly at attacker upon teleport arrival (Rule 1.3)
      this.snapAimAtTarget(attacker);

      // Floating "MISS" text
      spawnFloatingText(this.x, this.y - this.r - 12, 'MISS', '#FFFFFF');

      // Teleport flash SFX
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.flash) {
        audioSystem.playSFX(sansConfig.sounds.flash, 0.7);
      }

      // Occasional voice blip on close dodge when low on HP
      if (this.hp < 50 && Math.random() < 0.25) {
        this.speak('whoops.', 80);
      }

      return 0; // Dodged 100% of damage
    }

    // Stamina depleted or CC'd -> take regular damage
    const applied = super.takeDamage(amount, attacker, options);
    if (this.hp <= 0 && !this._hasSaidDeathQuote) {
      this._hasSaidDeathQuote = true;
      this.speak("welp. i'm going to grillby's.", 160, true);
    }
    return applied;
  }

  /**
   * Applies Karmic Retribution (KR) damage over time to a target entity.
   */
  applyKarma(target) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    if (!cfg.enableKarma || !target || target.hp <= 0) return;

    let kData = this.karmaTargets.get(target);
    if (!kData) {
      kData = { stacks: 1, timer: cfg.karmaDuration || 180, tickTimer: 0 };
      this.karmaTargets.set(target, kData);
    } else {
      kData.stacks = Math.min(cfg.karmaMaxStacks || 12, kData.stacks + 2);
      kData.timer = cfg.karmaDuration || 180;
    }
  }

  /**
   * Updates all active Karmic Retribution (KR) damage ticks.
   */
  _updateKarma() {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    const tickInterval = cfg.karmaTickInterval || 14;
    const tickDmg = cfg.karmaTickDamage || 1;

    for (const [target, kData] of this.karmaTargets.entries()) {
      if (!target || target.hp <= 0 || kData.timer <= 0) {
        this.karmaTargets.delete(target);
        continue;
      }

      kData.timer--;
      kData.tickTimer++;

      if (kData.tickTimer >= tickInterval) {
        kData.tickTimer = 0;
        const totalTick = Math.max(1, Math.min(3, Math.floor(kData.stacks * 0.25 * tickDmg)));
        if (target.takeDamage && target.hp > 1) {
          target.takeDamage(totalTick, this, { isKarma: true, bypassDodge: true });
          spawnFloatingText(target.x, target.y - target.r - 10, `-${totalTick}`, '#A855F7');
        }
      }
    }
  }

  /**
   * Basic Attack: Throws a standard Undertale white bone projectile towards target.
   */
  castBasicBone(opponent) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    if (!cfg.enableBasicBone) return;
    this.basicAttackCooldown = cfg.basicBoneCooldown || 26;
    this.basicAttackAnimTimer = 16;
    this.basicAttackAnimMaxTimer = 16;
    const angle = this.gunAngle || (opponent ? Math.atan2(opponent.y - this.y, opponent.x - this.x) : 0);
    this.boneProjectiles.push({
      x: this.x + Math.cos(angle) * (this.r + 12),
      y: this.y + Math.sin(angle) * (this.r + 12),
      vx: Math.cos(angle) * (cfg.basicBoneSpeed || 8.5),
      vy: Math.sin(angle) * (cfg.basicBoneSpeed || 8.5),
      angle: angle + Math.PI / 2,
      width: 8,
      height: 24,
      boneType: 'white',
      damage: cfg.basicBoneDamage || 8,
      life: 60
    });

    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.boneStab) {
      audioSystem.playSFX(sansConfig.sounds.boneStab, 0.65);
    }
  }

  /**
   * Skill 1: Casts one of 3 authentic Undertale Gaster Blaster patterns:
   * 1. Sequential Orbiting Carousel (10 accelerating circular chain blasters)
   * 2. 360° Simultaneous Radial Ring (8-10 blasters surrounding at once)
   * 3. Colossal Titan Gigablaster (Massive 2.6x titan blaster with 120px super laser)
   */
  castGasterBlasters(opponent) {
    if (!opponent) return;
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    this.gasterBlasterFiring = true;
    this.blasterCooldown = cfg.blasterCooldown || 320;

    // Self-HP drain on Skill 1 cast (Undertale exhaustion mechanic, drains down to minimum 1 HP)
    const hpCost = (cfg.blasterHpCost !== undefined) ? cfg.blasterHpCost : 20;
    if (hpCost > 0 && this.hp > 1) {
      const actualCost = Math.min(this.hp - 1, hpCost);
      this.hp -= actualCost;
      this.damageReceived = (this.damageReceived || 0) + actualCost;
      spawnFloatingText(this.x, this.y - this.r - 12, `-${actualCost} HP`, '#FF3B30');

      // Low HP exhaustion dialogue blip
      if (this.hp <= 40 && Math.random() < 0.40) {
        this.speak('phew...', 70);
      }
    }

    // SFX: Blaster intro charge
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.gasterBlaster) {
      audioSystem.playSFX(sansConfig.sounds.gasterBlaster, 0.85);
    }

    // Randomize pattern across all 3 authentic Undertale formations
    const availablePatterns = [0, 1, 2];
    const pool = availablePatterns.filter(p => p !== this.lastBlasterPattern);
    const pattern = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * 3);
    this.lastBlasterPattern = pattern;

    if (pattern === 0) {
      this._castCarouselPattern(opponent);
    } else if (pattern === 1) {
      this._castRadialRingPattern(opponent);
    } else {
      this._castGigablasterPattern(opponent);
    }
  }

  /**
   * Pattern 1: Sequential Orbiting Carousel (Arena perimeter circular orbit firing inward).
   */
  _castCarouselPattern(opponent) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    const totalCount = this.isBadTimeActive ? (cfg.blasterBadTimeChainCount ?? 10) : (cfg.blasterCircleChainCount ?? 10);
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 50, y: 50, width: 500, height: 500 });

    // Center around the arena middle (Undertale arena board center)
    const centerX = arena.x + arena.width * 0.5;
    const centerY = arena.y + arena.height * 0.5;
    const radius = cfg.blasterCircleRadius || (Math.min(arena.width, arena.height) * 0.44);
    const spinDir = (Math.random() < 0.5 ? 1 : -1);
    const orbitStep = (cfg.blasterOrbitSpeed || 0.628) * spinDir;
    const startAngle = Math.random() * Math.PI * 2;

    this.blasterCircleSequence = {
      active: true,
      centerX,
      centerY,
      radius,
      orbitStep,
      currentAngle: startAngle,
      remainingCount: totalCount,
      spawnInterval: cfg.blasterSpawnInterval || 4,
      spawnTimer: 0,
      totalSpawned: 0
    };

    // Spawn first blaster immediately
    this._spawnNextSequentialBlaster(opponent);
  }

  /**
   * Spawns the next Gaster Blaster along the advancing circular perimeter orbit.
   */
  _spawnNextSequentialBlaster(opponent) {
    if (!this.blasterCircleSequence || this.blasterCircleSequence.remainingCount <= 0) return;
    const seq = this.blasterCircleSequence;
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    const theta = seq.currentAngle;
    const bx = seq.centerX + Math.cos(theta) * seq.radius;
    const by = seq.centerY + Math.sin(theta) * seq.radius;
    const aimAngle = theta + Math.PI; // Aim directly inward through center

    const chargeTime = cfg.blasterCarouselChargeTime || cfg.blasterChargeTime || 16;
    const fireDur = cfg.blasterCarouselFireDuration || cfg.blasterFireDuration || 22;
    const damage = cfg.blasterCarouselDamage || cfg.blasterBeamDamage || 30;
    const beamHeight = cfg.blasterCarouselBeamHeight ?? cfg.blasterCarouselBeamWidth ?? cfg.blasterBeamHeight ?? cfg.blasterBeamWidth ?? 32;
    const reach = cfg.blasterLaserHeight ?? cfg.blasterLaserReach ?? 800;

    this.gasterBlasters.push({
      x: bx,
      y: by,
      centerX: seq.centerX,
      centerY: seq.centerY,
      angle: aimAngle,
      scale: 1.0,
      spawnScale: 0.2,
      chargeTimer: chargeTime,
      chargeMax: chargeTime,
      fireTimer: fireDur,
      fireMax: fireDur,
      damage: damage,
      beamHeight: beamHeight,
      beamWidth: beamHeight,
      reach: reach,
      length: reach,
      isCharging: true,
      isFiring: false,
      damageDealt: false
    });

    seq.totalSpawned++;
    seq.remainingCount--;
    seq.currentAngle += seq.orbitStep;
    seq.spawnTimer = seq.spawnInterval;

    // Slight acceleration curve as the sequence progresses (classic Undertale acceleration!)
    if (seq.totalSpawned % 5 === 0 && seq.spawnInterval > 2) {
      seq.spawnInterval = Math.max(2, seq.spawnInterval - 1);
    }
  }

  /**
   * Pattern 2: 360° Simultaneous Radial Ring (8-10 blasters surrounding entire arena).
   */
  _castRadialRingPattern(opponent) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    const count = this.isBadTimeActive ? 10 : (cfg.blasterRingCount || 8);
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 50, y: 50, width: 500, height: 500 });
    const centerX = arena.x + arena.width * 0.5;
    const centerY = arena.y + arena.height * 0.5;
    const radius = cfg.blasterRingRadius || (Math.min(arena.width, arena.height) * 0.45);
    const chargeTime = cfg.blasterRingChargeTime || 28;
    const fireDur = cfg.blasterRingFireDuration || 28;
    const damage = cfg.blasterRingDamage || 30;
    const beamHeight = cfg.blasterRingBeamHeight ?? cfg.blasterRingBeamWidth ?? cfg.blasterBeamHeight ?? cfg.blasterBeamWidth ?? 36;
    const reach = cfg.blasterLaserHeight ?? cfg.blasterLaserReach ?? 800;
    const startAngle = Math.random() * (Math.PI * 2 / count);

    for (let i = 0; i < count; i++) {
      const theta = startAngle + (i / count) * Math.PI * 2;
      const bx = centerX + Math.cos(theta) * radius;
      const by = centerY + Math.sin(theta) * radius;
      const aimAngle = theta + Math.PI;

      this.gasterBlasters.push({
        x: bx,
        y: by,
        centerX: centerX,
        centerY: centerY,
        angle: aimAngle,
        scale: 1.05,
        spawnScale: 0.2,
        chargeTimer: chargeTime,
        chargeMax: chargeTime,
        fireTimer: fireDur,
        fireMax: fireDur,
        damage: damage,
        beamHeight: beamHeight,
        beamWidth: beamHeight,
        reach: reach,
        length: reach,
        isCharging: true,
        isFiring: false,
        damageDealt: false
      });
    }
  }

  /**
   * Pattern 3: Colossal Titan Gigablaster (Massive 2.6x titan blaster unleashing a 120px super laser).
   */
  _castGigablasterPattern(opponent) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 50, y: 50, width: 500, height: 500 });
    const toOppX = opponent.x - this.x;
    const toOppY = opponent.y - this.y;
    const aimAngle = Math.atan2(toOppY, toOppX);

    // Position colossal titan skull hovering behind Sans near arena perimeter
    const spawnDist = 55;
    let bx = this.x - Math.cos(aimAngle) * spawnDist;
    let by = this.y - Math.sin(aimAngle) * spawnDist;

    // Clamp within arena perimeter bounds
    bx = Math.max(arena.x + 35, Math.min(arena.x + arena.width - 35, bx));
    by = Math.max(arena.y + 35, Math.min(arena.y + arena.height - 35, by));

    const scale = cfg.blasterGigaScale || 2.6;
    const chargeTime = cfg.blasterGigaChargeTime || 32;
    const fireDur = cfg.blasterGigaFireDuration || 36;
    const damage = cfg.blasterGigaDamage || 100;
    const beamHeight = cfg.blasterGigaBeamHeight ?? cfg.blasterGigaBeamWidth ?? 120;
    const reach = cfg.blasterGigaLaserHeight ?? cfg.blasterGigaReach ?? 1000;

    this.gasterBlasters.push({
      x: bx,
      y: by,
      centerX: this.x,
      centerY: this.y,
      angle: aimAngle,
      scale: scale,
      spawnScale: 0.15,
      chargeTimer: chargeTime,
      chargeMax: chargeTime,
      fireTimer: fireDur,
      fireMax: fireDur,
      damage: damage,
      beamHeight: beamHeight,
      beamWidth: beamHeight,
      reach: reach,
      length: reach,
      isCharging: true,
      isFiring: false,
      damageDealt: false
    });
  }

  /**
   * Updates active sequential circle queue, individual Gaster Blasters, lasers, and collisions.
   */
  _updateGasterBlasters(opponent) {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    // 1. Process active sequential circle spawner queue
    if (this.blasterCircleSequence && this.blasterCircleSequence.active) {
      const seq = this.blasterCircleSequence;
      seq.spawnTimer--;
      if (seq.spawnTimer <= 0 && seq.remainingCount > 0) {
        this._spawnNextSequentialBlaster(opponent);
      }
      if (seq.remainingCount <= 0) {
        seq.active = false;
      }
    }

    let anyFiring = false;

    // 2. Process all active Gaster Blasters
    for (let i = this.gasterBlasters.length - 1; i >= 0; i--) {
      const b = this.gasterBlasters[i];

      // Smooth spawn scale pop-in
      if (b.spawnScale < 1.0) {
        b.spawnScale = Math.min(1.0, b.spawnScale + 0.20);
      }

      // Phase 1: Rapid Charging
      if (b.isCharging) {
        b.chargeTimer--;
        b.chargeProgress = 1.0 - (b.chargeTimer / b.chargeMax);

        if (b.chargeTimer <= 0) {
          b.isCharging = false;
          b.isFiring = true;

          // SFX: Beam Fire
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.gasterBlast) {
            audioSystem.playSFX(sansConfig.sounds.gasterBlast, 0.75);
          }
          triggerGlobalScreenShake(3.5, 8);
        }
      }

      // Phase 2: Active Laser Beam Firing Inward
      if (b.isFiring) {
        anyFiring = true;
        b.fireTimer--;
        b.fireProgress = 1.0 - (b.fireTimer / b.fireMax);

        // Laser ray collision
        const reach = b.reach || b.length || cfg.blasterLaserHeight || cfg.blasterLaserReach || 800;
        const beamH = b.beamHeight || b.beamWidth || cfg.blasterBeamHeight || cfg.blasterBeamWidth || 32;
        const cosA = Math.cos(b.angle);
        const sinA = Math.sin(b.angle);

        // Check targets (fighters & illusions)
        const targets = [];
        if (state.fighters) targets.push(...state.fighters);
        if (state.illusions) targets.push(...state.illusions);

        for (const target of targets) {
          if (!target || target === this || (target.team && target.team === this.team) || target.hp <= 0) continue;

          // Ray-to-point distance check
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const projDist = dx * cosA + dy * sinA;

          if (projDist > 0 && projDist < reach) {
            const perpDist = Math.abs(-dx * sinA + dy * cosA);
            if (perpDist <= (beamH * 0.5 + target.r)) {
              // Apply continuous beam ticks / damage
              if (!b.damageDealt || (b.fireTimer % 6 === 0)) {
                b.damageDealt = true;
                const dmg = b.damage || cfg.blasterBeamDamage || 9;
                if (target.takeDamage) target.takeDamage(dmg, this);
                this.applyKarma(target);

                // Knockback
                if (target.applyKnockback && (cfg.blasterKnockback || 0) > 0) {
                  target.applyKnockback(cosA * cfg.blasterKnockback, sinA * cfg.blasterKnockback);
                }
              }
            }
          }
        }

        if (b.fireTimer <= 0) {
          this.gasterBlasters.splice(i, 1);
        }
      }
    }

    this.gasterBlasterFiring = anyFiring || Boolean(this.blasterCircleSequence && this.blasterCircleSequence.active);
  }

  /**
   * Skill 2: Casts Bone Zone (wave of bones + ground stab traps).
   */
  castBoneZone(opponent) {
    if (!opponent) return;
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
    this.boneZoneCooldown = cfg.boneZoneCooldown || 240;

    // SFX: Bone stab
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.boneStab) {
      audioSystem.playSFX(sansConfig.sounds.boneStab, 0.8);
    }

    const baseAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    const count = cfg.boneCount || 6;
    const spread = cfg.boneWaveSpread || 0.60;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + ((i - (count - 1) / 2) * (spread / count));
      const isBlue = (i % 2 === 1) && cfg.enableBlueBone;

      this.boneProjectiles.push({
        x: this.x + Math.cos(angle) * (this.r + 15),
        y: this.y + Math.sin(angle) * (this.r + 15),
        vx: Math.cos(angle) * (cfg.boneSpeed || 7.5),
        vy: Math.sin(angle) * (cfg.boneSpeed || 7.5),
        angle: angle + Math.PI / 2,
        width: 10,
        height: 32,
        boneType: isBlue ? 'blue' : 'white',
        damage: cfg.boneDamage || 5,
        life: 75
      });
    }

    // Ground bone stab trap under opponent with Warning sound telegraph
    if (cfg.enableGroundSpears) {
      this.boneTraps.push({
        x: opponent.x,
        y: opponent.y,
        width: 70,
        height: 70,
        warnTimer: cfg.groundSpearWarnFrames || 24,
        stabTimer: 18,
        isWarning: true,
        isRising: false,
        damage: cfg.groundSpearDamage || 16
      });
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
        const warnSound = (CONFIG.sans?.sounds?.warning || sansConfig.sounds?.warning) || 'Assets/Sound Effects/Sans/Warning.ogg';
        audioSystem.playSFX(warnSound, 0.85);
      }
    }
  }

  /**
   * Updates active bone projectiles and ground traps.
   */
  _updateBones() {
    // 1. Update Projectiles
    for (let i = this.boneProjectiles.length - 1; i >= 0; i--) {
      const bone = this.boneProjectiles[i];
      bone.x += bone.vx;
      bone.y += bone.vy;
      bone.life--;

      // Hit check against enemies
      const targets = [];
      if (state.fighters) targets.push(...state.fighters);
      if (state.illusions) targets.push(...state.illusions);

      for (const t of targets) {
        if (!t || t === this || (t.team && t.team === this.team) || t.hp <= 0) continue;
        const dist = Math.hypot(t.x - bone.x, t.y - bone.y);

        if (dist <= (t.r + 14)) {
          // Blue Bone Logic: Moving targets take full damage + freeze; stationary targets are unharmed
          const targetMoving = Math.hypot(t.vx || 0, t.vy || 0) > 0.4;
          if (bone.boneType === 'blue' && !targetMoving) {
            // Unharmed by blue bone if standing still
            continue;
          }

          if (t.takeDamage) t.takeDamage(bone.damage, this);
          this.applyKarma(t);

          if (bone.boneType === 'blue' && t.applyFreeze) {
            const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;
            t.applyFreeze(cfg.blueBoneFreezeDuration || 24, this, {
              isBlueBone: true,
              sfx: (CONFIG.sans?.sounds?.ding || sansConfig.sounds?.ding) || 'Assets/Sound Effects/Sans/Ding.ogg'
            });
          }

          bone.life = 0;
          break;
        }
      }

      if (bone.life <= 0) {
        this.boneProjectiles.splice(i, 1);
      }
    }

    // 2. Update Ground Traps
    for (let i = this.boneTraps.length - 1; i >= 0; i--) {
      const trap = this.boneTraps[i];
      if (trap.isWarning) {
        trap.warnTimer--;
        if (trap.warnTimer <= 0) {
          trap.isWarning = false;
          trap.isRising = true;
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.boneStab) {
            audioSystem.playSFX(sansConfig.sounds.boneStab, 0.85);
          }
        }
      } else if (trap.isRising) {
        trap.stabTimer--;
        trap.extensionProgress = Math.min(1.0, 1.0 - (trap.stabTimer / 18));

        // Damage check at peak
        if (trap.stabTimer === 9) {
          const targets = [];
          if (state.fighters) targets.push(...state.fighters);
          if (state.illusions) targets.push(...state.illusions);

          for (const t of targets) {
            if (!t || t === this || (t.team && t.team === this.team) || t.hp <= 0) continue;
            if (Math.abs(t.x - trap.x) <= trap.width * 0.5 + t.r && Math.abs(t.y - trap.y) <= trap.height * 0.5 + t.r) {
              if (t.takeDamage) t.takeDamage(trap.damage, this);
              this.applyKarma(t);
            }
          }
        }

        if (trap.stabTimer <= 0) {
          this.boneTraps.splice(i, 1);
        }
      }
    }
  }

  /**
   * Skill 3 / Ultimate: Blue Soul Gravity Slam ("Bad Time").
   */
  castBadTimeGravitySlam(opponent) {
    if (!opponent) return;
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    this.gravitySlamCooldown = cfg.gravitySlamCooldown || 580;
    this.isBadTimeActive = true;
    this.badTimeTimer = cfg.badTimeDuration || 360;
    this.blueSoulActive = true;
    this.blueSoulVictim = opponent;
    this.gravitySlamTimer = cfg.gravitySlamDuration || 80;
    this.gravitySlamDuration = cfg.gravitySlamDuration || 80;

    // Iconic Bad Time Speech Bubble
    this.speak("you're gonna have a bad time.", 150, true);

    // Pick a directional slam vector towards the nearest arena perimeter wall
    const arena = state.arena || { x: 50, y: 50, width: 500, height: 500 };
    const toOppX = opponent.x - this.x;
    const toOppY = opponent.y - this.y;
    const distToCenter = Math.hypot(toOppX, toOppY);

    if (distToCenter > 1) {
      this.gravitySlamDirX = toOppX / distToCenter;
      this.gravitySlamDirY = toOppY / distToCenter;
    } else {
      this.gravitySlamDirX = 0;
      this.gravitySlamDirY = 1.0;
    }

    // Ensure downward gravity bias for iconic Undertale floor slam
    if (Math.abs(this.gravitySlamDirY) < 0.3) {
      this.gravitySlamDirY = 0.85;
    }

    // Teleport Flash & Gravity Initiation SFX
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      if (sansConfig.sounds?.flash) audioSystem.playSFX(sansConfig.sounds.flash, 0.85);
      if (sansConfig.sounds?.slam) audioSystem.playSFX(sansConfig.sounds.slam, 0.95);
    }

    triggerGlobalScreenShake(10.0, 22);
    spawnFloatingText(this.x, this.y - this.r - 16, 'BAD TIME', '#00F5FF');

    if (opponent.takeDamage) {
      opponent.takeDamage(cfg.gravitySlamDamage || 22, this);
      this.applyKarma(opponent);
    }
  }

  /**
   * Updates Blue Soul telekinesis & arena wall slam physics.
   */
  _updateBlueSoul() {
    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    // 1. Update and decay active wall slam impact shockwaves
    if (this.slamImpacts && this.slamImpacts.length > 0) {
      for (let i = this.slamImpacts.length - 1; i >= 0; i--) {
        const imp = this.slamImpacts[i];
        if (!imp) {
          this.slamImpacts.splice(i, 1);
          continue;
        }
        imp.timer--;
        if (imp.timer <= 0) {
          this.slamImpacts.splice(i, 1);
        }
      }
    }

    // 2. Active Blue Soul Gravity Slam Execution
    if (this.gravitySlamTimer > 0 && this.blueSoulVictim && this.blueSoulVictim.hp > 0) {
      this.gravitySlamTimer--;
      const maxDuration = this.gravitySlamDuration || cfg.gravitySlamDuration || 80;
      const slamProg = 1.0 - (this.gravitySlamTimer / maxDuration);

      this.blueSoulVictim.blueSoulActive = true;
      this.blueSoulVictim.blueSoulTimer = this.gravitySlamTimer;

      const arena = state.arena || { x: 50, y: 50, width: 500, height: 500 };

      if (slamProg < 0.22) {
        // Phase 1: Levitation Stasis (Victim is lifted in air, zero velocity)
        this.blueSoulVictim.vx *= 0.15;
        this.blueSoulVictim.vy *= 0.15;
        this.blueSoulVictim.z = Math.min(22, (this.blueSoulVictim.z || 0) + 2.0);
      } else {
        // Phase 2: Violent Directional Gravitational Acceleration
        const force = cfg.gravityForce || 18;
        this.blueSoulVictim.vx += this.gravitySlamDirX * (force * 0.24);
        this.blueSoulVictim.vy += this.gravitySlamDirY * (force * 0.26);
        this.blueSoulVictim.z = Math.max(0, (this.blueSoulVictim.z || 0) - 1.5);

        // Check arena boundary collision
        const hitLeft = this.blueSoulVictim.x <= arena.x + this.blueSoulVictim.r + 8;
        const hitRight = this.blueSoulVictim.x >= arena.x + arena.width - this.blueSoulVictim.r - 8;
        const hitBottom = this.blueSoulVictim.y >= arena.y + arena.height - this.blueSoulVictim.r - 8;
        const hitTop = this.blueSoulVictim.y <= arena.y + this.blueSoulVictim.r + 8;
        const hitWall = hitLeft || hitRight || hitBottom || hitTop;

        if (hitWall && (this.gravitySlamTimer % 18 === 0 || slamProg > 0.65 && !this._hasImpactedWall)) {
          this._hasImpactedWall = true;

          // Compute impact coordinates & normal angle
          const impactX = hitLeft ? (arena.x + 4) : (hitRight ? (arena.x + arena.width - 4) : this.blueSoulVictim.x);
          const impactY = hitTop ? (arena.y + 4) : (hitBottom ? (arena.y + arena.height - 4) : this.blueSoulVictim.y);
          const normalAngle = hitLeft ? 0 : (hitRight ? Math.PI : (hitTop ? Math.PI * 0.5 : -Math.PI * 0.5));

          if (!this.slamImpacts) this.slamImpacts = [];
          this.slamImpacts.push({
            x: impactX,
            y: impactY,
            normalAngle: normalAngle,
            timer: 22,
            maxTimer: 22,
            radius: 8,
            maxRadius: 85
          });

          // Concussive Screen Shake & SFX
          triggerGlobalScreenShake(12.0, 24);
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function' && sansConfig.sounds?.slam) {
            audioSystem.playSFX(sansConfig.sounds.slam, 1.0);
          }

          // Floating "SLAM!" Text
          spawnFloatingText(impactX, impactY - 14, 'SLAM!', '#00F5FF');

          // Damage & KR Application
          if (this.blueSoulVictim.takeDamage) {
            this.blueSoulVictim.takeDamage(cfg.gravityWallImpactDamage || 8, this);
            this.applyKarma(this.blueSoulVictim);
          }

          // Dampen rebound to keep victim cleanly contained in arena
          if (hitLeft || hitRight) this.blueSoulVictim.vx *= -0.35;
          if (hitTop || hitBottom) this.blueSoulVictim.vy *= -0.35;
        }
      }
    } else {
      if (this.blueSoulVictim) {
        this.blueSoulVictim.blueSoulActive = false;
        this.blueSoulVictim.blueSoulTimer = 0;
      }
      this.blueSoulActive = false;
      this._hasImpactedWall = false;
    }
  }

  /**
   * Updates and decays active dodge afterimages over time.
   */
  _updateAfterImages() {
    if (!this.afterImages || this.afterImages.length === 0) return;
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      const ai = this.afterImages[i];
      if (!ai) {
        this.afterImages.splice(i, 1);
        continue;
      }
      ai.timer--;
      if (ai.timer <= 0) {
        this.afterImages.splice(i, 1);
      }
    }
  }

  /**
   * Main Fighter Update Loop
   */
  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Freeze & TimeStop Early Exit Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      // Gaster Blasters and active bone traps are independent arena entities and must not get stopped when Sans is CC'd
      this._updateGasterBlasters(opponent);
      this._updateBones();
      this._updateKarma();
      this._updateHeartShatters();
      return;
    }

    const cfg = (CONFIG && CONFIG.sans) ? CONFIG.sans : sansConfig;

    // 2. Stamina Regeneration & Cooldowns
    if (this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + (cfg.dodgeStaminaRegen || 0.20));
    }
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.basicAttackCooldown > 0) this.basicAttackCooldown--;
    if (this.basicAttackAnimTimer > 0) this.basicAttackAnimTimer--;

    // 3. Bad Time Mode Buff Timer
    if (this.isBadTimeActive) {
      this.badTimeTimer--;
      if (this.badTimeTimer <= 0) {
        this.isBadTimeActive = false;
      }
    }

    // 4. Update Subsystems
    this._updateAfterImages();
    this._updateKarma();
    this._updateGasterBlasters(opponent);
    this._updateBones();
    this._updateBlueSoul();
    this._updateSpeech();
    this._updateHeartShatters();

    // 5. Intro Speech Trigger on Match Start
    if (!this._hasSaidIntro && state && (state.gameState === 'playing' || state.gameState === 'countdown')) {
      this._hasSaidIntro = true;
      this.speak('ready?', 120);
    }

    // 6. Win Quote & Heart Shatter when opponent is defeated (Main fighters only, excluding minions/plants/turrets)
    const isMinionOrSummon = Boolean(
      !opponent ||
      opponent.isMinion ||
      opponent.isSummon ||
      opponent.isTurret ||
      opponent.isIllusion ||
      opponent.isPlant ||
      opponent.isPlantMinion ||
      opponent.isClone ||
      opponent.isServant ||
      opponent.isSubEntity ||
      opponent.isCompanion ||
      opponent.owner
    );

    if (opponent && opponent.hp <= 0 && !isMinionOrSummon && !this._hasTriggeredOpponentShatter) {
      this._hasTriggeredOpponentShatter = true;
      this.triggerHeartShatter(opponent.x, opponent.y);
      if (!this._hasSaidWinQuote) {
        this._hasSaidWinQuote = true;
        this.speak('take a break, pal.', 140);
      }
    }

    // 7. Combat AI Decision Loop
    if (opponent && opponent.hp > 0 && !this.isCastingSkill) {
      this.aim(opponent);
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);

      // AI Skill 3: Bad Time Gravity Slam
      if (this.gravitySlamCooldown <= 0 && dist < 320) {
        this.castBadTimeGravitySlam(opponent);
      }
      // AI Skill 1: Gaster Blaster
      else if (this.blasterCooldown <= 0 && dist < 420) {
        this.castGasterBlasters(opponent);
      }
      // AI Skill 2: Bone Zone
      else if (this.boneZoneCooldown <= 0 && dist < 360) {
        this.castBoneZone(opponent);
      }
      // Basic Bone Toss (if enabled)
      else if (cfg.enableBasicBone && this.basicAttackCooldown <= 0 && dist < (cfg.basicBoneReach || 420)) {
        this.castBasicBone(opponent);
      }
    }

    // 8. Centralized Movement & Physics Integration (Rule 1.2)
    // When dodging (dodgeStallTimer > 0): stop walking movement completely and snap aim to opponent
    // When NOT dodging: normal continuous movement walking and physics
    if (this.dodgeStallTimer > 0) {
      this.dodgeStallTimer--;
      this.vx = 0;
      this.vy = 0;
      if (opponent && opponent.hp > 0) {
        this.snapAimAtTarget(opponent);
      }
      this.resolveWallBounce(arena, opponent);
    } else {
      const speedMult = this.isBadTimeActive ? (cfg.badTimeSpeedMultiplier || 1.20) : 1.0;
      this.speed = this.baseSpeed * speedMult;
      super.update(opponent, ownerIndex, arena);
    }
  }

  /**
   * Main Fighter Draw Loop
   */
  draw(ctx) {
    // 1. Draw ground traps in world coordinates
    for (const trap of this.boneTraps) {
      drawBoneStabTrap(ctx, trap);
    }

    // 2. Draw active bone projectiles in world coordinates
    for (const bone of this.boneProjectiles) {
      drawBoneProjectile(ctx, bone);
    }

    // 3. Draw active Gaster Blasters & Beams in world coordinates
    for (const blaster of this.gasterBlasters) {
      if (blaster.isFiring) {
        drawGasterBeam(ctx, {
          startX: blaster.x,
          startY: blaster.y,
          angle: blaster.angle,
          length: blaster.reach || blaster.length || (CONFIG.sans?.blasterLaserHeight || CONFIG.sans?.blasterLaserReach || sansConfig.blasterLaserHeight || sansConfig.blasterLaserReach),
          height: blaster.beamHeight || blaster.beamWidth || (CONFIG.sans?.blasterBeamHeight || CONFIG.sans?.blasterBeamWidth || sansConfig.blasterBeamHeight || sansConfig.blasterBeamWidth),
          width: blaster.beamHeight || blaster.beamWidth || (CONFIG.sans?.blasterBeamHeight || CONFIG.sans?.blasterBeamWidth || sansConfig.blasterBeamHeight || sansConfig.blasterBeamWidth),
          alpha: Math.min(1.0, blaster.fireTimer / (blaster.fireMax * 0.2))
        });
      }
      drawGasterBlaster(ctx, blaster);
    }

    // 4. Draw active wall slam impact shockwaves in world coordinates
    if (this.slamImpacts && this.slamImpacts.length > 0) {
      for (const imp of this.slamImpacts) {
        drawSlamImpact(ctx, imp);
      }
    }

    // 5. Draw Blue Soul indicator, gravitational lightning tether & heart VFX on target
    if (this.blueSoulVictim && (this.blueSoulActive || this.gravitySlamTimer > 0)) {
      drawBlueSoulIndicator(ctx, this.blueSoulVictim, this);
    }

    // 6. Draw Sans character skin model
    drawSansSkin(ctx, this);

    // 7. Draw in-arena overhead health overlay number underneath body
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
    FighterRenderer.drawArmorFracture(ctx, this);

    // 8. Draw Sans Undertale speech bubble on top
    drawSansSpeechBubble(ctx, this);

    // 9. Draw active Undertale Heart Split and Shatter defeat effects
    if (this.heartShatters && this.heartShatters.length > 0) {
      for (const fx of this.heartShatters) {
        drawHeartShatterEffect(ctx, fx);
      }
    }
  }
}
