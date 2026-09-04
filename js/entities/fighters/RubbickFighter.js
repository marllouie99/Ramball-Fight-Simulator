import { fadeOutLoopingSound, stopLoopingSound, fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';
import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnTelekinesisDebris, spawnArcaneCrater, spawnArcaneSmoke, spawnArcaneShockwave, spawnArcaneFlash, spawnArcaneGlyphs, spawnSpellStealWisps } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { spawnBerserkerRageEffect } from '../../graphics/particles/berserkerRageEffect.js';
import { drawRubbickStaff, drawRubbickChargeEffect } from '../../graphics/weapons/rubbickWeaponGraphics.js';
import { updateStolenRubyHook, updateStolenCronosSphere, resolveStolenCronosWallBounce } from './rubbick/rubbickStealLogic.js';
import { getStolenMultiplier, STOLEN_SKILL_CONFIG } from './rubbick/stolenSkillConfig.js';
import { RubbickRubyTheme, RubbickCronosTheme } from './rubbick/rubbickThemes.js';
import { drawRubyScythe } from '../../graphics/weapons/rubyWeaponGraphics.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';

export class RubbickFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Initial hovering state for correct display before first update()
    this.z = 25;
    
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = (CONFIG.rubbick || CONFIG.trickster).spellStealCooldown;

    // Telekinesis state
    this.tkTarget = null;
    this.tkTimer = 0;
    this.tkOriginalScale = 1;

    // Spell Steal state
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenWindUpTimer = 0;
    this.rubbickRageTimer = 0;
    
    // Laser state
    this.beamCharge = 0;
    this.beamTimer = 0;
    this.beamHitState = new Map();
    
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    
    this.stormActive = false;
    this.stormTimer = 0;
    this.stormLastStrikeTimer = 0;
    
    // For specific stolen skills that need internal cooldowns
    this.stolenSkillCooldown = 0;
    
    // Pseudo-random helper to keep debris consistent across instantiations (for UI screens)
    const prng = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Permanent orbiting magical debris
    this.orbitingDebris = [];
    for (let i = 0; i < 6; i++) {
      this.orbitingDebris.push({
        baseAngle: (i / 6) * Math.PI * 2,
        dist: 50 + prng(i * 1.1) * 14, // 50px to 64px orbit radius (clears 25px body radius)
        speed: 0.015 + prng(i * 2.2) * 0.02,
        size: 5 + prng(i * 3.3) * 4,
        baseRotation: prng(i * 4.4) * Math.PI * 2,
        rotationSpeed: (prng(i * 5.5) - 0.5) * 0.04,
        color: `rgba(${40 + prng(i * 6.6) * 30}, ${220 + prng(i * 7.7) * 35}, ${120 + prng(i * 8.8) * 40}, 1)`,
        baseZPhase: prng(i * 9.9) * Math.PI * 2,
        zSpeed: 0.02 + prng(i * 10.1) * 0.03
      });
    }
  }

  reset() {
    super.reset();
    this.z = 25;
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = (CONFIG.rubbick || CONFIG.trickster).spellStealCooldown;
    this.tkTarget = null;
    this.tkTimer = 0;
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenSkillCooldown = 0;
    this.rubbickRageTimer = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    this.activePullActive = false;
    this.activePullPhase = -1;
    this.activePullPhaseTimer = 0;
    this.activePullAngle = 0;
    this.pullTargets = [];
    this.primaryHookTarget = null;
    
    this.stormActive = false;
    this.stormTimer = 0;
    this.stormLastStrikeTimer = 0;
    
    // Phase durations (frames)
    this.pullPhaseWindUp = 14;
    this.pullPhaseSwingOut = 10;
    this.pullPhaseHookGrab = 3;
    this.pullPhasePullDrag = 25;
    this.pullPhaseDisengage = 12;

    if (this.tkTarget) {
      this.tkTarget.isCaughtInTelekinesis = false;
      this.tkTarget.isParalyzed = false;
      this.tkTarget.z = 0;
      this.tkTarget = null;
    }
  }

  interruptAttacks() {
    super.interruptAttacks();
    this.stolenWindUpTimer = 0;
    this.activePullActive = false;
    this.activePullPhase = -1;
    this.pullTargets = [];
    this.beamCharge = 0;
    this.beamTimer = 0;
    this.stormActive = false;
    
    if (this.tkTarget) {
      this.tkTarget.isCaughtInTelekinesis = false;
      this.tkTarget.isParalyzed = false;
      this.tkTarget.z = 0;
      this.tkTarget = null;
      this.tkTimer = 0;
    }

    // Stop the laser sound immediately if it's playing
    if (this._isLaserSoundPlaying && this._laserSoundKey) {
      fadeOutLoopingSound(this._laserSoundKey, 100);
      this._isLaserSoundPlaying = false;
    }
  }

  /**
   * Silences and cuts off active skill/channeling audio on a target when caught in Telekinesis.
   */
  _silenceTargetAudio(target) {
    if (!target) return;

    // 1. Cut off character-specific channeling audio handles & looping sounds
    if (target._purpleChargeSoundHandle) {
      fadeOutSound(target._purpleChargeSoundHandle, 100);
      target._purpleChargeSoundHandle = null;
    }
    if (target._domainSoundHandle) {
      fadeOutSound(target._domainSoundHandle, 100);
      target._domainSoundHandle = null;
    }
    if (target.fugaSoundKey) {
      try { stopLoopingSound(target.fugaSoundKey); } catch (e) {}
      target.fugaSoundKey = null;
    }
    if (typeof target._stopBeamAudio === 'function') target._stopBeamAudio();
    if (typeof target._stopChannelAudio === 'function') target._stopChannelAudio();
    if (typeof target._stopAllSounds === 'function') target._stopAllSounds();

    // 2. Cut off active skill charge/channel audio sources across fighters
    fadeOutSoundBySrc('mixing', 100);
    fadeOutSoundBySrc('purplecharge', 100);
    fadeOutSoundBySrc('purpledeploy', 100);
    fadeOutSoundBySrc('redcharging', 100);
    fadeOutSoundBySrc('redchanneling', 100);
    fadeOutSoundBySrc('domain', 100);
    fadeOutSoundBySrc('fuga', 100);
    fadeOutSoundBySrc('divine_flame', 100);
    fadeOutSoundBySrc('stormstrike', 100);
    fadeOutSoundBySrc('charging', 100);
    fadeOutSoundBySrc('charge', 100);
    fadeOutSoundBySrc('laser', 100);
    fadeOutSoundBySrc('beam', 100);
  }

  getBeamLine() {
    // Rubbick staff tip is roughly r + 75 away
    const tipDist = this.r + 75;
    const startX = this.x + Math.cos(this.gunAngle) * tipDist;
    const startY = this.y + Math.sin(this.gunAngle) * tipDist;
    const beamLength = CONFIG.laser.beamLength;
    const endX = startX + Math.cos(this.gunAngle) * beamLength;
    const endY = startY + Math.sin(this.gunAngle) * beamLength;

    return { startX, startY, endX, endY };
  }

  getBeamHitFighters(fighters) {
    if (!fighters || fighters.length === 0) return [];

    const { startX, startY, endX, endY } = this.getBeamLine();
    const dx = endX - startX;
    const dy = endY - startY;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return [];

    const hitFighters = [];

    for (let fi = 0; fi < fighters.length; fi++) {
      const fighter = fighters[fi];
      if (!fighter || fighter === this || fighter.hp <= 0) continue;

      let t = ((fighter.x - startX) * dx + (fighter.y - startY) * dy) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = startX + t * dx;
      const projY = startY + t * dy;
      const distToCenter = Math.hypot(fighter.x - projX, fighter.y - projY);

      if (distToCenter <= fighter.r + 4) {
        hitFighters.push(fighter);
      }
    }

    return hitFighters;
  }

  takeDamage(amount, attacker, opts = {}) {
    const tookDamage = super.takeDamage(amount, attacker, opts);
    if (tookDamage && amount > 0) {
      if (this.stolenType === 'berserker') {
        const rageGain = amount * (CONFIG.berserker.rageFromDamageScale || 2);
        this.rage = Math.min(CONFIG.berserker.maxRage || 100, (this.rage || 0) + rageGain);
        
        if (this.rage >= (CONFIG.berserker.maxRage || 100) && !this.isInRage) {
          this.isInRage = true;
          this.rageTimer = CONFIG.berserker.rageDuration || 480;
          this.rage = 0;
        }
      }
    }
    return tookDamage;
  }

  applyBeamEffectsToTarget(target, ownerIndex) {
    if (!target || target === this) return;

    target.caughtInLaserBeamTimer = 10;

    let hitState = this.beamHitState.get(target);
    if (!hitState) {
      hitState = { initialHitDone: false, continuousDamageTimer: 0 };
      this.beamHitState.set(target, hitState);
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Use a damage multiplier for stolen skills if necessary, but rubbick usually borrows raw config for beam
    const dmgMulti = getStolenMultiplier('laser', 'damageMultiplier');

    if (!hitState.initialHitDone) {
      const applied = target.takeDamage(this.damage * dmgMulti, this, { isProjectile: true, isLaser: true });
      if (applied) {
        const slowChance = Number(CONFIG.laser.slowChance || 1);
        if (slowChance >= 1 || Math.random() <= slowChance) {
          // Default beam slow duration and multiplier if rubbick doesn't define it
          target.applySlow(CONFIG.laser.beamSlowDuration || 60, CONFIG.laser.beamSlowMultiplier || 0.4);
          spawnFloatingText(target.x, target.y - target.r - 5, 'SLOWED!', '#88ccff');
        }

        const startPush = Number(CONFIG.laser.initialKnockback) || 0;
        if (startPush !== 0) {
          target.vx += (dx / dist) * startPush;
          target.vy += (dy / dist) * startPush;
        }

        hitState.initialHitDone = true;
        spawnFloatingText(target.x, target.y - target.r - 5, 'BEAM HIT!', '#00ff00');

        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: this.damage * dmgMulti, isLaser: true }, ownerIndex);
        }
      }
      return;
    }

    hitState.continuousDamageTimer++;
    if (hitState.continuousDamageTimer >= CONFIG.laser.tickInterval) {
      const applied = target.takeDamage(CONFIG.laser.tickDamage * dmgMulti, this, { isProjectile: true, isLaser: true });
      if (applied) {
        const pushStrength = Number(CONFIG.laser.initialKnockback) || 0;
        if (pushStrength !== 0) {
          target.vx += (dx / dist) * pushStrength;
          target.vy += (dy / dist) * pushStrength;
        }

        spawnFloatingText(target.x, target.y - target.r - 5, 'ZZZAP!', '#aaffaa');
        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: CONFIG.laser.tickDamage * dmgMulti, isLaser: true }, ownerIndex);
        }
      }
      hitState.continuousDamageTimer = 0;
    }
  }

  _processStolenStorm(ownerIndex) {
    this.stormLastStrikeTimer++;
    const interval = Math.floor(60 / (CONFIG.zeus.stormStrikesPerSec || 3));
    
    if (this.stormLastStrikeTimer >= interval) {
      this.stormLastStrikeTimer = 0;
      
      if (state && state.fighters) {
        const myTeam = state.getFighterTeam(ownerIndex);

        state.fighters.forEach((f, idx) => {
          if (f && f !== this && f.hp > 0) {
            const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
            if (isEnemy) this._strikeEnemyWithStolenStorm(f);
          }
        });
        
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && ill.hp > 0 && ill.owner !== this) {
              const illOwnerTeam = state.getFighterTeam(state.fighters.indexOf(ill.owner));
              const isEnemy = myTeam === null || illOwnerTeam !== myTeam;
              if (isEnemy) this._strikeEnemyWithStolenStorm(ill);
            }
          });
        }
      }
    }
  }

  _strikeEnemyWithStolenStorm(target) {
    const dmgMulti = getStolenMultiplier('zeus', 'damageMultiplier');
    let damage = (CONFIG.zeus.stormStrikeDamage || 15) * dmgMulti;
    
    target.takeDamage(damage, this, { isStorm: true });
    
    if (target.applySlow) {
      target.applySlow(CONFIG.zeus.paralyzeDuration || 30, CONFIG.zeus.paralyzeSlowMultiplier || 0.5);
    }
    
    triggerGlobalScreenShake(CONFIG.zeus.stormStrikeShakeIntensity || 4, CONFIG.zeus.stormStrikeShakeFrames || 10);
    spawnImpactFlash(target.x, target.y, 50, 'ghostTrail');
    spawnSparks(target.x, target.y, 10, 'arcane');
    
    const stormSound = getSkillSound(99, 'storm');
    if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.6);

    const thunderSound = getSkillSound('zeus', 'thunderstrike');
    if (thunderSound) audioSystem.playSFX(thunderSound.src, (thunderSound.volume || 1.0) * 0.6);
    
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    state.zeusStormStrikes.push({
      x: target.x,
      y: target.y,
      life: 15,
      maxLife: 15,
      color: 'green'
    });
  }

  update(opponent, ownerIndex, arena) {
    // Visual hovering effect: dynamically adjust the Z coordinate
    // Float high enough (25+ pixels) so the shadow is clearly visible beneath the character's body!
    this.z = 25 + Math.sin(Date.now() / 200) * 6;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();
    
    const isTimeStopped = this._handleTimeStop();
    if (typeof this._updateStaffTrail === 'function') this._updateStaffTrail(isTimeStopped);
    if (isTimeStopped) return;
    // Clear Berserker Rage if the buff faded or changed
    if (this.stolenType !== 'berserker') {
      this.rage = 0;
      this.rageTimer = 0;
      this.rageFadeTimer = 0;
      this.isInRage = false;
      this.berserkerRageActivated = false;
    }

    // Handle stolen Berserker Rage
    if (this.stolenType === 'berserker' && this.isInRage) {
      this.rageTimer--;

      if (!this.berserkerRageActivated) {
        this.berserkerRageActivated = true;
        spawnFloatingText(this.x, this.y - this.r - 10, 'ARCANE RAGE!', '#00ff64');
        triggerGlobalScreenShake(12, 8);
        if (typeof spawnBerserkerRageEffect === 'function') {
          spawnBerserkerRageEffect(this, '#00ff64', '#00cc50');
        }
      }

      this.speed = this.baseSpeed * (CONFIG.berserker.rageMoveSpeedMultiplier || 2.0);
      
      // Spawn green afterimages (motion trails) while in rage
      if (this.rageTimer % 3 === 0) {
        if (!this.afterImages) this.afterImages = [];
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          gunAngle: this.gunAngle,
          timer: 15,
          color: '#00ff64'
        });
      }

      if (this.rageTimer <= 0) {
        this.isInRage = false;
        this.berserkerRageActivated = false;
        this.rageFadeTimer = 45;
        this.speed = this.baseSpeed;
        spawnFloatingText(this.x, this.y - this.r - 15, 'RAGE ENDED', '#aaa');
      }
    } else {
      if (this.rageFadeTimer > 0) this.rageFadeTimer--;
      this.berserkerRageActivated = false;
      this.speed = this.baseSpeed;
    }

    // Stolen Zeus Storm Logic
    if (this.stormActive) {
      this.stormTimer--;
      this._processStolenStorm(ownerIndex);
      if (this.stormTimer <= 0) {
        this.stormActive = false;
        spawnFloatingText(this.x, this.y - this.r - 10, 'STORM ENDED', '#aaa');
      }
    }

    // Stolen Laser Logic
    if (this.beamTimer > 0) {
      this.beamTimer--;
      
      // Continuous screen shake while firing
      triggerGlobalScreenShake(6, 5);

      // Beam angle remains strictly locked in the direction it was fired; no auto-aim while firing

      // Check all valid targets
      const allTargets = state.fighters.concat(state.illusions || []);
      const hitFighters = this.getBeamHitFighters(allTargets);
      for (const fighter of hitFighters) {
        this.applyBeamEffectsToTarget(fighter, ownerIndex);
      }

      // Drift slowly backward while firing
      const backwardSpeed = Number(CONFIG.laser.beamBackwardSpeed) || 0;
      const beamRecoilX = -Math.cos(this.gunAngle) * backwardSpeed;
      const beamRecoilY = -Math.sin(this.gunAngle) * backwardSpeed;
      const retention = Number(CONFIG.laser.beamDriftRetention) || 0.92;
      const blend = Number(CONFIG.laser.beamDriftBlend) || 0.08;

      this.vx = this.vx * retention + beamRecoilX * blend;
      this.vy = this.vy * retention + beamRecoilY * blend;

      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);
      return; // Skip normal update when firing laser
    }

    // Stop laser sound if beam ends
    if (this.beamTimer === 0 && this._isLaserSoundPlaying) {
      if (this._laserSoundKey) fadeOutLoopingSound(this._laserSoundKey, 100);
      this._isLaserSoundPlaying = false;
    }

    // Charge the laser
    if (this.stolenType === 'laser' && this.stolenSkillCooldown <= 0) {
      if (opponent) {
        if (this.beamCharge === 0) {
          this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          const chargeSound = getSkillEffectSound('solarchampion', 'lasercharge');
          if (chargeSound) audioSystem.playSFX(chargeSound.src, chargeSound.volume);
        }
        
        this.beamCharge = Math.min(this.beamCharge + 1, CONFIG.laser.windupDuration);

        if (this.beamCharge >= CONFIG.laser.windupDuration) {
          this.beamTimer = CONFIG.laser.beamDuration;
          this.stolenSkillCooldown = 300 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
          this.beamHitState.clear();
          this.beamCharge = 0;
          
          triggerGlobalScreenShake(15, 20);

          if (!this._laserSoundKey) {
            this._laserSoundKey = `ivory-laser-${ownerIndex}`;
          }
          if (!this._isLaserSoundPlaying) {
            const sound = getBasicAttackSound('laser', 'laser'); // Assuming LaserFighter uses this for its beam sound
            if (sound) audioSystem.playLoop(this._laserSoundKey, sound.src, sound.volume);
            this._isLaserSoundPlaying = true;
          }

          // Small backward knockback when beam starts
          const kickback = CONFIG.laser.beamStartKnockback || 0;
          this.vx += -Math.cos(this.gunAngle) * kickback;
          this.vy += -Math.sin(this.gunAngle) * kickback;
        }
      } else {
        this.beamCharge = Math.max(this.beamCharge - 1, 0);
      }
    } else {
       this.beamCharge = Math.max(this.beamCharge - 1, 0);
    }

    // Phantom Flurry Execution Logic
    if (this.flurryHitsLeft > 0) {
       this.vx *= 0.1;
       this.vy *= 0.1;
       
       if (this.flurryTimer > 0) this.flurryTimer--;
       if (this.flurryTimer <= 0) {
         if (this.flurryHitsLeft <= 0) {
           this.flurryGhost = null;
           this.flurryTarget = null;
           return;
         }

         this.flurryHitsLeft--;
         this.flurryTimer = 6;
         
         let possibleTargets = state.fighters.filter(f => f && f !== this && f.hp > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 450);
         if (state.illusions) {
           possibleTargets = possibleTargets.concat(state.illusions.filter(ill => ill && ill.hp > 0 && Math.hypot(ill.x - this.x, ill.y - this.y) < 450));
         }
         
         if (possibleTargets.length > 0) {
            this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
         }

         if (this.flurryTarget && !this.flurryTarget.isDead) {
            this.strikeAngle = Math.random() * Math.PI * 2;
            
            const flurryDmg = ((CONFIG.rubbick || CONFIG.trickster)?.flurryDamage || 10) * getStolenMultiplier('musashi', 'damageMultiplier');
            this.flurryTarget.takeDamage(flurryDmg, this, { isMelee: true });
            if (typeof this.flurryTarget.applyHitStun === 'function') this.flurryTarget.applyHitStun(15);
            
            spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#fff');
            
            triggerGlobalScreenShake(6, 6);
            spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 10, 'flash');

            const angle = Math.random() * Math.PI * 2;
            const dist = this.flurryTarget.r + this.r + 10;
            const oldX = this.x;
            const oldY = this.y;
            this.x = this.flurryTarget.x + Math.cos(angle) * dist;
            this.y = this.flurryTarget.y + Math.sin(angle) * dist;
            this.gunAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);

            if (!this.afterImages) this.afterImages = [];
            const teleportDist = Math.hypot(this.x - oldX, this.y - oldY);
            const numImages = Math.max(3, Math.floor(teleportDist / 12));
            for (let i = 0; i <= numImages; i++) {
              const t = i / numImages;
              pushTrailCap(this.afterImages, {
                x: oldX + (this.x - oldX) * t,
                y: oldY + (this.y - oldY) * t,
                timer: 15,
                r: this.r,
                gunAngle: this.gunAngle
              });
            }

            if (typeof this.flurryTarget.applyTimeStop === 'function') this.flurryTarget.applyTimeStop(8);
         } else {
            this.flurryHitsLeft = 0;
            this.flurryGhost = null;
            this.flurryTarget = null;
         }
       }
       
       this.x += this.vx;
       this.y += this.vy;
       this.resolveWallBounce(arena, this.flurryTarget);
       return;
    }

    if (this.stolenWindUpTimer > 0) {
      this.stolenWindUpTimer--;
      this.applyMovementPhysics(0);
      // Facing angle remains locked to the initial cast angle; no auto-aim while winding up
      
      if (this.stolenWindUpTimer === 0) {
        if (!this._hasFiredStolenSkillTrick) {
          this._hasFiredStolenSkillTrick = true;
          this.fireStolenSkill(opponent, ownerIndex);
          this.attackCooldown = (CONFIG.rubbick || CONFIG.trickster).attackCooldown;
        }
      }
      return;
    }

    let timeMultiplier = 1;
    if (this._isInsideOwnSphere && this._isInsideOwnSphere()) {
      timeMultiplier = CONFIG.cronos.sphereSpeedMultiplier || 5;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= timeMultiplier;
    if (this.attackSwingTimer > 0) this.attackSwingTimer -= timeMultiplier;
    if (this.telekinesisCooldown > 0) this.telekinesisCooldown--; // Keep ability cooldowns normal
    if (this.spellStealCooldown > 0) this.spellStealCooldown--;
    if (this.stolenSkillCooldown > 0) this.stolenSkillCooldown--;
    if (this.stolenTimer > 0) {
      this.stolenTimer--;
      if (this.stolenTimer === 0) {
        this.stolenType = null;
        spawnFloatingText(this.x, this.y - this.r - 20, 'SPELL FADED', '#2E8B57');
      }
    }

    // Telekinesis Logic
    if (this.tkTimer > 0 && this.tkTarget) {
      this.tkTimer--;

      // Stop moving while channeling
      this.vx = 0;
      this.vy = 0;
      
      // Smoothly rotate staff towards the drop location
      const targetAngle = Math.atan2(this.tkDropY - this.y, this.tkDropX - this.x);
      let diff = targetAngle - this.gunAngle;
      
      // Normalize angle difference for shortest path
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.gunAngle += diff * 0.15; // 0.15 gives a nice smooth snap
      
      // Spawn ascending glowing green neon particles from the drop location
      if (Math.random() < 0.6) {
        spawnSparks(
          this.tkDropX + (Math.random() - 0.5) * 60,
          this.tkDropY + (Math.random() - 0.5) * 60,
          1, 'arcaneAscendLine'
        );
      }
      
      // Immobilize and continuously apply paralyze debuff to the target throughout telekinesis
      this.tkTarget.vx = 0;
      this.tkTarget.vy = 0;
      this.tkTarget.timeStopTimer = 2; // Force them to be frozen
      this.tkTarget.isCaughtInTelekinesis = true;
      this.tkTarget.paralyzeTimer = Math.max(this.tkTarget.paralyzeTimer || 0, this.tkTimer + 2);
      if (this.tkTarget.statusEffects && typeof this.tkTarget.statusEffects.applyParalyze === 'function') {
        this.tkTarget.statusEffects.applyParalyze(this.tkTimer + 2);
      }
      if (typeof this.tkTarget.interruptAttacks === 'function') {
        this.tkTarget.interruptAttacks();
      }
      this._silenceTargetAudio(this.tkTarget);
      
      // Visual lift effect is handled in drawing if we could, but let's simulate it by adding an aura
      if (Math.random() < 0.2) {
        spawnSparks(this.tkTarget.x, this.tkTarget.y, 1, 'flash');
      }

      const tkTotalDuration = (CONFIG.rubbick || CONFIG.trickster).telekinesisDuration;
      const progress = 1 - (this.tkTimer / tkTotalDuration);
      
      // Calculate smooth movement progress (hover -> sweep -> hover -> slam)
      let moveProgress = 0;
      if (progress > 0.3 && progress <= 0.9) {
         // Smoothstep interpolation (3x^2 - 2x^3) for smooth acceleration and deceleration
         let t = (progress - 0.3) / 0.6;
         moveProgress = t * t * (3 - 2 * t);
      } else if (progress > 0.9) {
         moveProgress = 1;
      }

      const nextX = this.tkStartX + (this.tkDropX - this.tkStartX) * moveProgress;
      const nextY = this.tkStartY + (this.tkDropY - this.tkStartY) * moveProgress;
      
      const dx = this.tkTargetLastX !== undefined ? nextX - this.tkTargetLastX : 0;
      const dy = this.tkTargetLastY !== undefined ? nextY - this.tkTargetLastY : 0;

      this.tkTarget.x = nextX;
      this.tkTarget.y = nextY;
      
      this.tkTargetLastX = nextX;
      this.tkTargetLastY = nextY;

      // Drag debris along perfectly with the target
      if (dx !== 0 || dy !== 0) {
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.x += dx;
            spark.y += dy;
          }
        }
      }

      // Animate Z for floating effect
      const maxZ = 60;
      if (this.tkTimer > tkTotalDuration - 10) {
          // Going up
          this.tkTarget.z = ((tkTotalDuration - this.tkTimer) / 10) * maxZ;
      } else if (this.tkTimer < 10) {
          // Going down
          this.tkTarget.z = (this.tkTimer / 10) * maxZ;
      } else {
          // Floating / Bobbing
          this.tkTarget.z = maxZ + Math.sin(this.tkTimer * 0.1) * 5;
      }
      
      // Floating glowing magical particles
      if (this.tkTarget.z > 0 && Math.random() < 0.6) {
        spawnSparks(this.tkTarget.x + (Math.random() - 0.5) * 40, this.tkTarget.y - this.tkTarget.z + (Math.random() - 0.5) * 40, 2, 'arcane');
      }
      
      // Ascending magical glowing lines from the ground
      if (this.tkTarget.z > 0) {
        spawnSparks(
          this.tkTarget.x + (Math.random() - 0.5) * 80, 
          this.tkTarget.y + (Math.random() - 0.5) * 80, 
          2, 'arcaneAscendLine'
        );
      }

      if (this.tkTimer === 0) {
        this.tkTarget.z = 0; // Reset Z
        this.tkTarget.isCaughtInTelekinesis = false;
        this.tkTarget.isParalyzed = false;
        this.tkTarget.timeStopTimer = 0;
        
        // Spawn arcane crater impact graphic on the ground
        spawnArcaneCrater(this.tkTarget.x, this.tkTarget.y, 75);
        
        // Spawn an expanding dark green shockwave
        spawnArcaneShockwave(this.tkTarget.x, this.tkTarget.y);
        
        // Small dust burst instead of massive explosion
        for (let i = 0; i < 4; i++) {
          spawnArcaneSmoke(
            this.tkTarget.x + (Math.random() - 0.5) * 20,
            this.tkTarget.y + (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 4, 
            (Math.random() - 0.5) * 4, 
            'ground'
          );
        }
        
        // Scatter floating telekinesis debris on slam radially outwards
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.type = 'telekinesisDebrisScattered'; // Stop bobbing and draw below fighters
            
            // Bring them back down to ground level under the fighter's feet
            const radius = Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            spark.x = this.tkTarget.x + Math.cos(angle) * radius;
            spark.y = this.tkTarget.y + Math.sin(angle) * radius;

            const speed = 4 + Math.random() * 6; // Slower blast to keep them grouped closer
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.decay = 0.02 + Math.random() * 0.02; // Fade out slowly
            spark.friction = 0.82; // Stronger friction so they stop much sooner
          }
        }
        
        spawnFloatingText(this.tkTarget.x, this.tkTarget.y - 15, 'PARALYZED!', '#FFEE58');
        triggerGlobalScreenShake(8, 12); // Quick, controlled screen shake
        
        // Arcane magical landing effects
        spawnArcaneFlash(this.tkTarget.x, this.tkTarget.y);
        spawnArcaneGlyphs(this.tkTarget.x, this.tkTarget.y, 10);

        // AoE Stun and Paralyze to nearby enemies (including target)
        const allEnemies = state.fighters.filter(f => f && f.hp > 0 && f !== this);
        for (let enemy of allEnemies) {
          const dx = enemy.x - this.tkTarget.x;
          const dy = enemy.y - this.tkTarget.y;
          const rcfg = CONFIG.rubbick || CONFIG.trickster;
          if (dx * dx + dy * dy < rcfg.telekinesisStunRadius * rcfg.telekinesisStunRadius) {
            const stunDur = rcfg.telekinesisStunDuration || 60;
            enemy.electricStunTimer = stunDur;
            enemy.paralyzeTimer = Math.max(enemy.paralyzeTimer || 0, stunDur);
            if (enemy.statusEffects && typeof enemy.statusEffects.applyParalyze === 'function') {
              enemy.statusEffects.applyParalyze(stunDur);
            }
            if (typeof enemy.interruptAttacks === 'function') {
              enemy.interruptAttacks();
            }
            this._silenceTargetAudio(enemy);
            spawnFloatingText(enemy.x, enemy.y - enemy.r - 5, 'PARALYZED!', '#FFEE58');
          }
        }
        if (this.tkTarget) {
          if (this.tkTarget.isTurret) {
            this.tkTarget._fixedX = this.tkTarget.x;
            this.tkTarget._fixedY = this.tkTarget.y;
          }
        }

        this.tkTarget = null;
      }
    }

    if (opponent && !opponent.isDead && !this.tkTimer) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;

      this.gunAngle = Math.atan2(dy, dx);

      // Ultimate: Spell Steal
      const rubbickCfg = CONFIG.rubbick || CONFIG.trickster;
      if (this.spellStealCooldown <= 0 && !this.stolenType && distSq < rubbickCfg.spellStealRange * rubbickCfg.spellStealRange) {
        const isGojoOpponent = opponent && (opponent.characterId === 'gojo' || opponent.type === 'gojo' || opponent._def?.type === 'gojo' || opponent._def?.id === 'gojo');
        
        // If opponent is Gojo, Rubbick can ONLY steal Hollow Purple AFTER Gojo has fired his Purple first!
        if (isGojoOpponent) {
          const gojoHasFiredPurple = Boolean(
            opponent.hasFiredPurple ||
            opponent._hasFiredPurpleAtLeastOnce ||
            (opponent.purpleUseCount !== undefined && opponent.purpleUseCount > 0) ||
            (state.projectiles && state.projectiles.some(p => p && p.isGojoPurple && p.owner === state.fighters?.indexOf(opponent)))
          );

          if (gojoHasFiredPurple) {
            this.spellStealCooldown = rubbickCfg.spellStealCooldown;
            this.stolenType = 'gojo';
            this.stolenColor = opponent._def?.color || '#00FF64';
            this.stolenTimer = rubbickCfg.spellStealDuration;
            this.stolenSkillCooldown = 0;
            this._hasFiredStolenSkillTrick = false;

            spawnFloatingText(this.x, this.y - this.r - 20, 'STOLEN: HOLLOW PURPLE!', '#00FF00');
            spawnSpellStealWisps(this, opponent, '#00FF64', 15);
          }
        } else {
          this.spellStealCooldown = rubbickCfg.spellStealCooldown;
          this.stolenType = opponent._def.type;
          this.stolenColor = opponent._def.color;
          this.stolenTimer = rubbickCfg.spellStealDuration;
          this.stolenSkillCooldown = 0;
          this._hasFiredStolenSkillTrick = false;

          const stolenLabel = this.stolenType.toUpperCase();
          spawnFloatingText(this.x, this.y - this.r - 20, `STOLEN: ${stolenLabel}!`, '#00FF00');
          spawnSpellStealWisps(this, opponent, this.stolenColor || '#00FF64', 15);
        }
      }

      // Skill 1: Telekinesis
      if (this.telekinesisCooldown <= 0 && !this.stolenType && distSq < rubbickCfg.telekinesisRange * rubbickCfg.telekinesisRange && !opponent.immuneToCC) {
        this.telekinesisCooldown = rubbickCfg.telekinesisCooldown;
        this.tkTarget = opponent;
        this.tkTimer = rubbickCfg.telekinesisDuration;
        
        // Apply paralyze debuff and cut off target audio & attacks immediately
        const paralyzeDuration = this.tkTimer + 2;
        opponent.paralyzeTimer = Math.max(opponent.paralyzeTimer || 0, paralyzeDuration);
        opponent.isCaughtInTelekinesis = true;
        if (opponent.statusEffects && typeof opponent.statusEffects.applyParalyze === 'function') {
          opponent.statusEffects.applyParalyze(paralyzeDuration);
        }

        // Interrupt attacks (so visual slashes don't get stuck hovering in the air) and cut audio
        if (typeof opponent.interruptAttacks === 'function') {
           opponent.interruptAttacks();
        }
        this._silenceTargetAudio(opponent);
        
        // Pre-calculate drop location (Mage wants to keep distance)
        const minDistance = 150;
        const maxDistance = 220;
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        this.tkStartX = opponent.x;
        this.tkStartY = opponent.y;
        this.tkTargetLastX = undefined;
        this.tkTargetLastY = undefined;
        
        let dropX = this.x + Math.cos(angle) * distance;
        let dropY = this.y + Math.sin(angle) * distance;
        
        // Keep in arena
        dropX = Math.max(arena.x + opponent.r, Math.min(arena.x + arena.width - opponent.r, dropX));
        dropY = Math.max(arena.y + opponent.r, Math.min(arena.y + arena.height - opponent.r, dropY));
        
        this.tkDropX = dropX;
        this.tkDropY = dropY;

        spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'LIFTED!', '#8A2BE2');
        
        // Massive initial burst of rocks from the ground
        spawnTelekinesisDebris(opponent.x, opponent.y, 25);
      }

      // Check heavy stolen skills every frame
      let castedHeavy = false;
      if (this.stolenType && !this.tkTimer && this.stolenSkillCooldown <= 0) {
        if (['cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'musashi', 'normal', 'zeus', 'gojo'].includes(this.stolenType)) {
          // It's a Heavy Spell! (One-time cast that consumes the stolen buff)
          castedHeavy = true;
          this.executeStolenSkill(opponent, ownerIndex);
        }
      }

      // Basic Attack / Spammable Stolen Attack
      if (!castedHeavy && this.attackCooldown <= 0 && !this.tkTimer) {
        const rubbickCfg = CONFIG.rubbick || CONFIG.trickster;
        this.attackCooldown = rubbickCfg.attackCooldown;
        this.attackSwingTimer = 15; // 15 frames of staff swing animation
        
        let castedSpammable = false;
        if (this.stolenType && ['orange', 'darkslategray', 'gunslinger'].includes(this.stolenType)) {
          castedSpammable = this.executeStolenSkill(opponent, ownerIndex);
        }
        
        if (!castedSpammable) {
          // Normal Arcane Bolt
          let dmg = rubbickCfg.boltDamage;
          if (this.stolenType === 'cronos' && this._isInsideOwnSphere && this._isInsideOwnSphere()) {
             // Apply Sphere buffs to Arcane Bolt
             const cronosCfg = STOLEN_SKILL_CONFIG.skills.cronos;
             this.attackCooldown = cronosCfg.sphereStaffCooldown || 40;
             dmg = cronosCfg.sphereStaffDamage || 18;
             
             // Ensure swing animation finishes before the next attack
             this.attackSwingTimer = Math.min(15, cronosCfg.sphereStaffCooldown || 40);
             
             // Aim before swinging the visual effect
             if (opponent) {
                this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
             }
          } else if (this.stolenType === 'berserker') {
            // Apply Berserker Rage buffs to Arcane Bolt
            const rageAttackMultiplier = CONFIG.berserker.rageAttackSpeedMultiplier || 1.1;
            this.attackCooldown = (rubbickCfg.attackCooldown / rageAttackMultiplier) * getStolenMultiplier('berserker', 'cooldownMultiplier');
            dmg *= (CONFIG.berserker.rageDamageMultiplier || 1.8) * getStolenMultiplier('berserker', 'damageMultiplier');
            
            // Speed up the swing animation to match the faster attack speed
            const totalSpeedUp = rageAttackMultiplier / getStolenMultiplier('berserker', 'cooldownMultiplier');
            this.attackSwingTimer = Math.max(5, Math.floor(15 / totalSpeedUp));
            
            // Aim before swinging the visual effect
            if (opponent) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
            }
          }
          
          if (projectileSystem.fireArcaneBolt) {
             projectileSystem.fireArcaneBolt(this, ownerIndex, dmg, opponent);
          }
        }
      }
    }

    this.applyMovementPhysics();
    this.resolveWallBounce(arena, opponent);

    // Orbiting debris is updated dynamically in _drawDebrisLayer using performance.now()
    // Update Stolen Ruby Hook
    updateStolenRubyHook(this);
    if (this.sphereActive) {
      updateStolenCronosSphere(this);
    }

    if (this.afterImages) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
      }
    }
    if (this.slashEffects) {
      for (let i = this.slashEffects.length - 1; i >= 0; i--) {
        this.slashEffects[i].timer--;
        if (this.slashEffects[i].timer <= 0) this.slashEffects.splice(i, 1);
      }
    }
  }

  executeStolenSkill(opponent, ownerIndex) {
    let skillCast = false;
    // Map of copied active skills
    switch (this.stolenType) {
      case 'musashi':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= 250) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'cronos':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.cronos.sphereActivationDistance || 120)) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'ruby':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.ruby?.activePullRange || 200)) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'bomber':
      case 'grenadier':
      case 'normal':
      case 'zeus':
      case 'gojo':
        // These are heavy skills! We will enter the wind-up phase first!
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           }
           this.stolenWindUpTimer = this.stolenType === 'normal' 
             ? (CONFIG.sharpshooter?.executeWindupFrames || 30) 
             : (this.stolenType === 'gojo' ? 45 : 30); 
           skillCast = true;
           if (this.stolenType === 'gojo') {
             const chargeSound = getSkillSound('gojo', 'purple_charging') || { src: 'Assets/Sound Effects/Skills/mixing.mp3', volume: 1.8 };
             if (chargeSound) audioSystem.playSFX(chargeSound.src, chargeSound.volume || 1.0);
           }
        }
        break;
      case 'orange':
        // Flame warden flamethrower
        projectileSystem.fireFlameProjectile(this, ownerIndex, CONFIG.orange.flameDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), 0, undefined, undefined, undefined, '#00FFFF'); // cyan flames
        this.attackCooldown = 4 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier'); // rapid fire
        skillCast = true;
        break;
      case 'darkslategray':
        // Ninja shuriken
        projectileSystem.fireProjectile(this, ownerIndex, CONFIG.darkslategray.shurikenDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.darkslategray.shurikenSpeed, false, 'darkslategrayShuriken');
        this.attackCooldown = CONFIG.darkslategray.shurikenCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        skillCast = true;
        break;
      case 'gunslinger':
         // Rapid fire
         projectileSystem.fireProjectile(this, ownerIndex, CONFIG.gunslinger.bulletDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.gunslinger.bulletSpeed, false, 'gunslingerBullet');
         this.attackCooldown = CONFIG.gunslinger.shotCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         skillCast = true;
         break;

      default:
         break;
    }
    
    // Clear the stolen skill after casting ONLY if it's a spammable skill
    if (skillCast && !['musashi', 'cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'normal', 'zeus', 'gojo'].includes(this.stolenType)) {
      this.stolenType = null;
      this.stolenTimer = 0;
    }
    
    return skillCast;
  }

  fireStolenSkill(opponent, ownerIndex) {
    switch (this.stolenType) {
      case 'musashi':
         this.flurryHitsLeft = 5;
         this.flurryTimer = 0;
         this.flurryTarget = opponent;
         this.stolenSkillCooldown = CONFIG.musashi.flurryCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         
         const dx = opponent.x - this.x;
         const dy = opponent.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         const oldX = this.x;
         const oldY = this.y;
         
         this.x = opponent.x - (dx/dist) * (this.r + opponent.r + 5);
         this.y = opponent.y - (dy/dist) * (this.r + opponent.r + 5);
         
         if (!this.afterImages) this.afterImages = [];
         const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
         const numImages = Math.max(5, Math.floor(teleportDist / 12));
         for (let i = 0; i <= numImages; i++) {
           const t = i / numImages;
           pushTrailCap(this.afterImages, {
             x: oldX + (this.x - oldX) * t,
             y: oldY + (this.y - oldY) * t,
             gunAngle: this.gunAngle,
             timer: 20
           });
         }
         
         spawnFloatingText(this.x, this.y - 30, 'STOLEN FLURRY!', '#ff00ff');
         break;
      case 'bomber':
        projectileSystem.fireBomberGrenade(this, ownerIndex, CONFIG.bomber.grenadeDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent, false);
        this.stolenSkillCooldown = CONFIG.bomber.grenadeCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'cronos':
        this.sphereActive = true;
        this.sphereTheme = RubbickCronosTheme;
        this.sphereX = this.x;
        this.sphereY = this.y;
        this.sphereTimer = CONFIG.cronos.sphereDuration;
        this.stolenSkillCooldown = CONFIG.cronos.sphereCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        spawnFloatingText(this.x, this.y - this.r - 10, 'TIME SPHERE!', '#07cdfa');
        break;
      case 'zeus':
        this.stormActive = true;
        this.stormTimer = CONFIG.zeus.stormDuration * getStolenMultiplier('zeus', 'durationMultiplier') || CONFIG.zeus.stormDuration;
        this.stormLastStrikeTimer = 0;
        this.stolenSkillCooldown = CONFIG.zeus.stormCooldown * getStolenMultiplier('zeus', 'cooldownMultiplier');
        spawnFloatingText(this.x, this.y - this.r - 20, 'ARCANE STORM!', '#00ff64');
        triggerGlobalScreenShake(CONFIG.zeus.stormCastShakeIntensity || 8, CONFIG.zeus.stormCastShakeFrames || 20);
        const stormSound = getSkillSound(99, 'storm');
        if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.7);
        break;
      case 'grenadier':
        projectileSystem.fireGrenade(this, ownerIndex, (CONFIG.grenadier.poisonDamagePerTick || 10) * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent);
        this.stolenSkillCooldown = CONFIG.grenadier.throwCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'ruby':
         if (opponent) {
           this.stolenSkillCooldown = (CONFIG.ruby?.activePullCooldown || 240) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           this.activePullAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           this.gunAngle = this.activePullAngle;
           this.activePullActive = true;
           this.activePullPhase = 0; // WIND_UP
           this.activePullPhaseTimer = this.pullPhaseWindUp;
           this.pullTargets = [];
           this.primaryHookTarget = opponent;
           this.vx = 0;
           this.vy = 0;
         }
        break;
      case 'normal':
        if (opponent) {
           this.stolenSkillCooldown = (CONFIG.normal.shotCooldown || 70) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           
           // Fire from tip of staff along locked cast angle (no snap auto-aim)
           const customTipDist = this.r + 20;
           const customSpawnX = this.x + Math.cos(this.gunAngle) * customTipDist;
           const customSpawnY = this.y + Math.sin(this.gunAngle) * customTipDist;
           
           const finalDamage = this.damage * (CONFIG.sharpshooter?.enhancedDamageMultiplier || 2.5) * getStolenMultiplier(this.stolenType, 'damageMultiplier');
           const finalSpeed = CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1) * (CONFIG.sharpshooter?.enhancedSpeedMultiplier || 1.5);
           
           spawnFloatingText(this.x, this.y - this.r - 20, 'EXECUTE!', '#00ff00');
           triggerGlobalScreenShake(15, 10);
           
           projectileSystem.fireProjectile(this, ownerIndex, finalDamage, false, finalSpeed, false, 'rubbickSniperBullet_enhanced', customSpawnX, customSpawnY);
           
           let recoilForce = (CONFIG.sharpshooter?.enhancedRecoilForce || 30);
           this.vx -= Math.cos(this.gunAngle) * recoilForce;
           this.vy -= Math.sin(this.gunAngle) * recoilForce;
           
           const enhanceSound = getSkillSound(1, 'enhance'); // 1 is Sharpshooter ID
           if (enhanceSound) {
             audioSystem.playSFX(enhanceSound.src, enhanceSound.volume);
           }
        }
        break;
      case 'gojo':
        if (opponent) {
           this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        }
        const gojoDmgMult = getStolenMultiplier('gojo', 'damageMultiplier');
        const purpleDamage = (CONFIG.gojo?.purpleDamage || 70) * gojoDmgMult;
        const purpleDPS = (CONFIG.gojo?.purpleDPS || 150) * gojoDmgMult;
        this.stolenSkillCooldown = (CONFIG.gojo?.purpleCooldown || 1500) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        
        spawnFloatingText(this.x, this.y - this.r - 20, 'HOLLOW PURPLE!', '#00FF64');
        triggerGlobalScreenShake(CONFIG.gojo?.purpleShakeIntensity || 15, CONFIG.gojo?.purpleShakeDuration || 20);

        // Backward recoil impulse from releasing the immense green imaginary mass
        const recoilForce = 18;
        this.vx -= Math.cos(this.gunAngle) * recoilForce;
        this.vy -= Math.sin(this.gunAngle) * recoilForce;
        this.attackSwingTimer = 18; // Follow-through thrust/release animation

        if (projectileSystem && projectileSystem.fireGojoPurple) {
          projectileSystem.fireGojoPurple(this, ownerIndex, purpleDamage, purpleDPS, { isRubbick: true, isTrickster: true, colorTheme: 'green' });
        }
        
        const purpleSound = getSkillSound(21, 'purple_fire') || getSkillSound('gojo', 'hollowpurple') || { src: 'Assets/Sound Effects/Skills/hollowpurple.mp3', volume: 2.5 };
        if (purpleSound) audioSystem.playSFX(purpleSound.src, purpleSound.volume || 1.5);
        break;
    }
    
    // Clear the stolen skill after casting
    this.stolenType = null;
    this.stolenTimer = 0;
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius + 2; // +2 for floating point leniency at the boundary
  }

  drawGun(ctx) {
    if (this.activePullActive) {
      drawRubyScythe(ctx, this, RubbickRubyTheme);
    } else {
      drawRubbickStaff(ctx, this);
    }
  }

  _updateStaffTrail(isTimeStopped = false) {
    if (!this.staffTrail) this.staffTrail = [];
    if (!this.staffSmokeParticles) this.staffSmokeParticles = [];

    // Fade and clean up
    for (let p of this.staffTrail) p.life--;
    this.staffTrail = this.staffTrail.filter(p => p.life > 0);

    for (let p of this.staffSmokeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size += 0.5;
      p.angle += p.spin;
    }
    this.staffSmokeParticles = this.staffSmokeParticles.filter(p => p.life > 0);

    if (isTimeStopped || this.stolenType !== 'berserker') return;

    const isSwinging = this.attackSwingTimer > 0;
    const speed = Math.hypot(this.vx, this.vy);
    const isMoving = speed > 0.5;

    if (isSwinging || isMoving) {
       // Staff head position calculation
       const idleHover = 0; 
       const progress = isSwinging ? this.attackSwingTimer / 15 : 0;
       const swingAngle = Math.sin(progress * Math.PI) * -0.6;
       const thrustOffset = Math.sin(progress * Math.PI) * 12;

       const tx = this.r * 0.4 + thrustOffset;
       const ty = this.r * 0.85 + idleHover;
       const staffRot = Math.PI * 0.3 + swingAngle;

       const headLocalX = 0;
       const headLocalY = -50;

       const rotX = headLocalX * Math.cos(staffRot) - headLocalY * Math.sin(staffRot);
       const rotY = headLocalX * Math.sin(staffRot) + headLocalY * Math.cos(staffRot);

       const gunX = tx + rotX;
       const gunY = ty + rotY;

       const worldX = this.x + gunX * Math.cos(this.gunAngle) - gunY * Math.sin(this.gunAngle);
       const worldY = this.y + gunX * Math.sin(this.gunAngle) + gunY * Math.cos(this.gunAngle);

       let shouldPush = true;
       if (this.staffTrail.length > 0) {
           const last = this.staffTrail[this.staffTrail.length - 1];
           if (Math.hypot(worldX - last.x, worldY - last.y) < 1.0) shouldPush = false;
       }

       if (shouldPush) {
           this.staffTrail.push({
               x: worldX,
               y: worldY,
               life: 12,
               jitter: Math.random() * 4 - 2
           });

           const smokeCount = isSwinging ? 3 : 1;
           for (let i = 0; i < smokeCount; i++) {
               const staffAngle = this.gunAngle + staffRot;
               const shaftOffset = Math.random() * 35;
               const px = worldX - Math.cos(staffAngle) * shaftOffset;
               const py = worldY - Math.sin(staffAngle) * shaftOffset;

               this.staffSmokeParticles.push({
                  x: px + (Math.random() - 0.5) * 15,
                  y: py + (Math.random() - 0.5) * 15,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: (Math.random() - 0.5) * 1.5 - 0.5,
                  life: 15 + Math.random() * 10,
                  maxLife: 25,
                  size: 6 + Math.random() * 6,
                  stretch: 0.4 + Math.random() * 0.4,
                  angle: Math.random() * Math.PI * 2,
                  spin: (Math.random() - 0.5) * 0.1,
                  color: Math.random() > 0.6 ? '#000000' : (Math.random() > 0.4 ? '#004a20' : '#008840')
               });
           }
       }
    }
  }

  _drawStaffTrail(ctx) {
    if (this.stolenType !== 'berserker') return;

    if (this.staffSmokeParticles && this.staffSmokeParticles.length > 0) {
        for (const p of this.staffSmokeParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            const lifeRatio = p.life / p.maxLife;
            ctx.globalAlpha = lifeRatio * 0.7;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * p.stretch, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    if (!this.staffTrail || this.staffTrail.length < 2) return;
    
    ctx.save();
    
    const drawCrescentPolygon = (trail, r, g, b, baseThickness) => {
        const headLife = trail[trail.length - 1].life / 12;
        const globalAlpha = headLife > 0.2 ? 1.0 : (headLife / 0.2);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${globalAlpha})`;
        ctx.beginPath();
        
        const outer = [];
        const inner = [];
        
        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            const progress = p.life / 12; // 0 to 1
            
            let thickness = baseThickness * progress;
            if (i === trail.length - 1 || i === 0) {
                thickness = 0; 
            }
            
            thickness += (p.jitter * progress * 0.4);
            
            let prev = i > 0 ? trail[i - 1] : trail[0];
            let next = i < trail.length - 1 ? trail[i + 1] : trail[trail.length - 1];
            
            if (i === 0 && trail.length > 1) next = trail[1];
            if (i === trail.length - 1 && trail.length > 1) prev = trail[trail.length - 2];
            
            let dx = next.x - prev.x;
            let dy = next.y - prev.y;
            let len = Math.hypot(dx, dy) || 1;
            
            let nx = -dy / len;
            let ny = dx / len;
            
            outer.push({ x: p.x + nx * thickness, y: p.y + ny * thickness });
            inner.push({ x: p.x - nx * thickness, y: p.y - ny * thickness });
        }
        
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
        for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
        
        ctx.closePath();
        ctx.fill();
    };

    if (this.isInRage) {
      // Draw massive green anime-style trails when in rage
      drawCrescentPolygon(this.staffTrail, 0, 0, 0, 16);     // Black Aura
      drawCrescentPolygon(this.staffTrail, 0, 220, 100, 8);  // Green Aura
      drawCrescentPolygon(this.staffTrail, 255, 255, 255, 2);// White Core
    } else {
      // Draw a dark basic trail for normal non-rage swings
      drawCrescentPolygon(this.staffTrail, 0, 0, 0, 4);
      drawCrescentPolygon(this.staffTrail, 51, 51, 51, 2);
    }

    ctx.restore();
  }
  
  draw(ctx) {
    // Draw debris that is currently BEHIND Rubbick
    this._drawDebrisLayer(ctx, true);
    
    // Draw afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      this.afterImages.forEach(img => {
        const alpha = img.timer / 20.0;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.translate(img.x, img.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = img.color || this.color;
        ctx.fill();
        ctx.restore();
      });
    }

    super.draw(ctx);
    
    // Draw debris that is currently IN FRONT of Rubbick
    this._drawDebrisLayer(ctx, false);

    // Draw telekinesis visual
    if (this.tkTarget && this.tkTimer > 0) {
      ctx.save();
      const dx = this.tkTarget.x - this.x;
      const dy = this.tkTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      
      ctx.globalCompositeOperation = 'lighter';
      
      // Draw swirling magical ribbons
      const timeStr = Date.now() / 150;
      
      // Two overlapping animated sine waves
      for (let w = 0; w < 2; w++) {
        ctx.beginPath();
        for (let i = 0; i <= dist; i += 10) {
          const amplitude = Math.sin((i / dist) * Math.PI) * 12; // Thickest in the middle
          const offset = Math.sin(timeStr * (w === 0 ? 1 : -1.2) + i * 0.05) * amplitude;
          if (i === 0) ctx.moveTo(i, offset);
          else ctx.lineTo(i, offset);
        }
        ctx.lineTo(dist, 0); // Connect precisely to target
        
        ctx.strokeStyle = w === 0 ? 'rgba(50, 255, 120, 0.8)' : 'rgba(50, 220, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Simulated Glow
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();

        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Draw soft transparent green shadow indicator
      ctx.save();
      
      const radius = this.tkTarget.r * 1.5;
      const gradient = ctx.createRadialGradient(this.tkDropX, this.tkDropY, 0, this.tkDropX, this.tkDropY, radius);
      gradient.addColorStop(0, 'rgba(50, 255, 120, 0.4)');
      gradient.addColorStop(0.5, 'rgba(50, 255, 120, 0.2)');
      gradient.addColorStop(1, 'rgba(50, 255, 120, 0)');
      
      ctx.beginPath();
      ctx.arc(this.tkDropX, this.tkDropY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.restore();
      
      ctx.restore();
    }
    
    // If copied a skill, draw a faint aura of the copied class
    if (this.stolenType) {
       ctx.save();
       ctx.beginPath();
       ctx.arc(this.x, this.y, this.r + 8, 0, Math.PI * 2);
       ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + Math.sin(Date.now()/100)*0.2})`;
       ctx.lineWidth = 2;
       ctx.stroke();
       ctx.restore();
    }
    
    // Draw stolen Cronos pre-activation barrier
    if (this.stolenType === 'cronos' && typeof drawCronosPreActivateBarrier !== 'undefined') {
      const stolenSphereReady = !this.sphereActive && this.stolenSkillCooldown <= 0;
      const inPreWindow = this.stolenSkillCooldown > 0 && this.stolenSkillCooldown <= (CONFIG.cronos.spherePreActivateFrames || 30);
      
      if (stolenSphereReady || inPreWindow) {
        const now = Date.now();
        const progress = stolenSphereReady 
          ? 1  // full intensity when fully charged
          : 1 - this.stolenSkillCooldown / Math.max(1, (CONFIG.cronos.spherePreActivateFrames || 30));
          
        const barrierRadius = Math.max(this.r * 1.5, 55);
        
        drawCronosPreActivateBarrier({
          ctx,
          x: this.x,
          y: this.y,
          radius: barrierRadius,
          progress: progress,
          pulsePhase: now / 300,
          energyColor: this.stolenColor || '#00F3FF',
          shieldColor: 'rgba(0, 243, 255, 0.15)'
        });
      }
    }

    // Update and draw slash effects
    if (this.slashEffects && this.slashEffects.length > 0) {
      this.slashEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        
        // For Rubbick's stolen ability, all slashes are a magical arcane green
        let color = '#00FF64';
        
        ctx.globalAlpha = 1 - prog;
        
        if (effect.type.startsWith('slash')) {
          const size = effect.size * (0.6 + 0.6 * prog);
          const thick = (1 - Math.pow(prog, 1.5)) * (effect.type === 'slash_katana' ? 28 : 18);
          
          const drawCrescent = (radius, thickness, angleSpread) => {
             ctx.beginPath();
             const startX = radius * Math.cos(-angleSpread);
             const startY = radius * Math.sin(-angleSpread);
             const endX = radius * Math.cos(angleSpread);
             const endY = radius * Math.sin(angleSpread);
             
             ctx.moveTo(startX, startY);
             ctx.quadraticCurveTo(radius + thickness * 1.5, 0, endX, endY);
             ctx.quadraticCurveTo(radius - thickness * 0.5, 0, startX, startY);
             ctx.closePath();
          };

          // Simulated Glow
          ctx.fillStyle = color;
          ctx.save();
          ctx.globalAlpha = (1 - prog) * 0.25;
          drawCrescent(size * 1.15, thick * 1.5, 1.35);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = color;
          drawCrescent(size, thick, 1.3);
          ctx.fill();

          ctx.fillStyle = '#0a0a0a';
          drawCrescent(size * 0.98, thick * 0.75, 1.15);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          drawCrescent(size * 0.96, thick * 0.35, 1.0);
          ctx.fill();
        }
        
        ctx.restore();
      });
    }

    // Draw Stolen Laser Charge Effect
    if (this.beamCharge > 0) {
      drawRubbickChargeEffect(ctx, this.x, this.y, this.gunAngle, this.beamCharge, this.r);
    }

    // Draw teleport-in effect
    this._drawTeleportEffect(ctx);

    if (typeof this._drawStaffTrail === 'function') {
      this._drawStaffTrail(ctx);
    }
    
    this.drawRageBar(ctx);
  }

  drawBeamOverlay(ctx) {
    if (this.hp <= 0 || this.beamTimer <= 0) return;
    
    // Smooth fade in over the first 8 frames, and fade out over the last 8 frames
    const fadeOutMultiplier = Math.min(1, this.beamTimer / 8);
    const timeFired = (typeof CONFIG !== 'undefined' && CONFIG.laser ? CONFIG.laser.beamDuration : 100) - this.beamTimer;
    const fadeInMultiplier = Math.min(1, Math.max(0, timeFired) / 8);
    const fadeMultiplier = fadeOutMultiplier * fadeInMultiplier;
    
    let { startX, startY, endX, endY } = this.getBeamLine();
    const zOffset = this.z || 0;
    startY -= zOffset;
    endY -= zOffset;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const beamLen = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    const time = performance.now() / 150;
    const pulse1 = Math.sin(time) * 1.5;
    const pulse2 = Math.cos(time * 1.3) * 2;
    const pulse3 = Math.sin(time * 0.8) * 3;

    ctx.save();
    
    // Outer huge bloom (green)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 16 + pulse3 * 1.5) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Secondary wide glow (bright green)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(50, 255, 100, ${0.5 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 4 + pulse2) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Mid bright glow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(150, 255, 150, ${0.8 * fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) - 2 + pulse2) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner core (white)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
    ctx.lineWidth = ((CONFIG.laser.coreWidth || 4) + pulse1 + 1.5) * fadeMultiplier;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Energy nodes traveling down the beam
    const numNodes = 6;
    const speed = 1.0;
    ctx.fillStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
    
    for (let i = 0; i < numNodes; i++) {
      let offset = ((time * speed) + (i / numNodes)) % 1.0;
      let nx = startX + Math.cos(angle) * (beamLen * offset);
      let ny = startY + Math.sin(angle) * (beamLen * offset);
      let nodeRadius = (2 + Math.sin(offset * Math.PI) * 4) * fadeMultiplier;

      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Target hit glow
    for (const [target, hitState] of this.beamHitState.entries()) {
      if (!target || target.hp <= 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hitGlow = ctx.createRadialGradient(target.x, target.y, target.r * 0.2, target.x, target.y, target.r * 3);
      hitGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + Math.random() * 0.2) * fadeMultiplier})`);
      hitGlow.addColorStop(0.2, `rgba(50, 255, 100, ${(0.6 + Math.random() * 0.2) * fadeMultiplier})`);
      hitGlow.addColorStop(1, 'rgba(0, 255, 50, 0)');
      ctx.fillStyle = hitGlow;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Proximity illumination on ANY fighter near the beam
    if (state && state.fighters) {
      const l2 = dx * dx + dy * dy;
      if (l2 > 0) {
        for (const f of state.fighters) {
          if (!f || f.hp <= 0 || f === this) continue;
          let t = ((f.x - startX) * dx + (f.y - startY) * dy) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = startX + t * dx;
          const projY = startY + t * dy;
          const dist = Math.hypot(f.x - projX, f.y - projY);

          const maxLightDist = 150;
          if (dist < maxLightDist && !this.beamHitState.has(f)) {
            const intensity = 1 - (dist / maxLightDist);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const shineGlow = ctx.createRadialGradient(f.x, f.y, f.r * 0.5, f.x, f.y, f.r * 1.5);
            shineGlow.addColorStop(0, `rgba(50, 255, 100, ${intensity * 0.5 * fadeMultiplier})`);
            shineGlow.addColorStop(1, 'rgba(0, 255, 50, 0)');
            
            ctx.fillStyle = shineGlow;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }
  }

  _drawTeleportEffect(ctx) {
    if (this._teleportTimer <= 0) return;
    const progress = 1 - (this._teleportTimer / 20);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 30 * (1 - progress), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 100, ${1 - progress})`;
    ctx.lineWidth = 4 * progress;
    ctx.stroke();
    
    // Vertical rift
    ctx.beginPath();
    ctx.moveTo(0, -this.r * 1.5 - 20 * (1 - progress));
    ctx.lineTo(0, this.r * 1.5 + 20 * (1 - progress));
    ctx.strokeStyle = `rgba(200, 255, 200, ${1 - progress})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  resolveWallBounce(arena, opponent) {
    if (this.sphereActive) {
      resolveStolenCronosWallBounce(this, arena, opponent);
    } else if (this.stolenType === 'berserker' && opponent) {
      let bounced = false;
      if (this.x - this.r < arena.x) { this.x = arena.x + this.r; bounced = true; }
      else if (this.x + this.r > arena.x + arena.width) { this.x = arena.x + arena.width - this.r; bounced = true; }

      if (this.y - this.r < arena.y) { this.y = arena.y + this.r; bounced = true; }
      else if (this.y + this.r > arena.y + arena.height) { this.y = arena.y + arena.height - this.r; bounced = true; }

      if (bounced) {
        if (typeof this.playWallBounceSound === 'function') this.playWallBounceSound();
        const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

        // Snap toward a point *away* from opponent to tighten the fight
        const dx = this.x - opponent.x; 
        const dy = this.y - opponent.y;
        const dist = Math.hypot(dx, dy) || 1;
        const awayDist = CONFIG.berserker.rageRebounceAwayDistance ?? 0;
        
        const targetX = opponent.x - (dx / dist) * awayDist;
        const targetY = opponent.y - (dy / dist) * awayDist;

        const hx = targetX - this.x;
        const hy = targetY - this.y;
        const hDist = Math.hypot(hx, hy) || 1;

        this.vx = (hx / hDist) * currentSpeed;
        this.vy = (hy / hDist) * currentSpeed;
      }
    } else {
      super.resolveWallBounce(arena, opponent);
    }
  }

  _drawDebrisLayer(ctx, drawBehind) {
    if (!this.orbitingDebris || this.orbitingDebris.length === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    
    const time = performance.now() / 1000; // time in seconds

    for (let i = 0; i < this.orbitingDebris.length; i++) {
      const debris = this.orbitingDebris[i];
      const angle = debris.baseAngle + time * (debris.speed * 60);
      const rotation = debris.baseRotation + time * (debris.rotationSpeed * 60);
      const zPhase = debris.baseZPhase + time * (debris.zSpeed * 60);

      // Math.sin(angle) < 0 is top half of 3D orbit (behind body)
      const isBehind = Math.sin(angle) < 0;
      if (isBehind !== drawBehind) continue;
      
      const dist = debris.dist;
      const px = Math.cos(angle) * dist;
      // Orbit Y center is centered at floating torso height (-this.z), with 3D perspective tilt
      const py = -this.z + Math.sin(angle) * (dist * 0.38) + Math.sin(zPhase) * 5;
      
      // 3D Depth Scaling: Rocks behind are smaller (0.70), rocks in front are larger (1.06)
      const depthScale = 0.88 + Math.sin(angle) * 0.18;
      
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rotation);
      ctx.scale(depthScale, depthScale);
      
      const s = debris.size;
      
      // 1. Arcane Glow Aura (Green)
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = isBehind ? 'rgba(0, 255, 120, 0.12)' : 'rgba(0, 255, 120, 0.25)';
      ctx.fill();

      // 2. Base Dark Basalt Rock Polygon
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.5);
      ctx.lineTo(-s * 0.3, -s * 0.9);
      ctx.lineTo(s * 0.7, -s * 0.6);
      ctx.lineTo(s, s * 0.3);
      ctx.lineTo(s * 0.4, s * 0.8);
      ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.closePath();
      ctx.fillStyle = '#111813';
      ctx.fill();
      
      // 3. Glowing Arcane Facet Texture
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.3);
      ctx.lineTo(-s * 0.2, -s * 0.7);
      ctx.lineTo(s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.1, s * 0.2);
      ctx.lineTo(-s * 0.4, 0);
      ctx.closePath();
      ctx.fillStyle = debris.color;
      ctx.fill();
      
      // 4. Sharp Neon Green Edge Highlight
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isBehind ? 'rgba(0, 255, 130, 0.5)' : 'rgba(0, 255, 150, 0.9)';
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }
  drawRageBar(ctx) {
    if (this.stolenType !== 'berserker') return;
    if (this.rage <= 0 && this.rageTimer <= 0 && this.rageFadeTimer <= 0) return;

    ctx.save();
    
    // Draw directly below the fighter
    // The exact height matches where Berserker draws it (this.y + this.r + 20)
    ctx.translate(this.x, this.y + this.r + 20);

    const barWidth = 40;
    const barHeight = 6;
    
    // Base dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    let fillRatio = 0;
    let fillColor = '#00ff64'; // Arcane rage green
    let glowColor = '#00cc50';

    if (this.isInRage) {
      // Draining full bar during rage
      fillRatio = this.rageTimer / (CONFIG.berserker.rageDuration || 480);
      fillRatio = Math.max(0, Math.min(1, fillRatio));
    } else if (this.rageFadeTimer > 0) {
      // Fading out empty bar after rage
      fillRatio = 0;
      ctx.globalAlpha = this.rageFadeTimer / 45;
    } else {
      // Filling bar before rage
      fillRatio = this.rage / (CONFIG.berserker.maxRage || 100);
      fillRatio = Math.max(0, Math.min(1, fillRatio));
    }

    if (fillRatio > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(-barWidth / 2, 0, barWidth * fillRatio, barHeight);
    }

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, 0, barWidth, barHeight);

    ctx.restore();
  }

  /**
   * Domain expansion background rendering for Rubbick
   */
  drawDomainBackground(ctx, isClashSecondary = false) {
    if (!this.domainActive) return;
    const arena = CONFIG.arena;
    if (!arena) return;

    ctx.save();
    // Dark void domain canvas background
    ctx.fillStyle = '#050510';
    ctx.fillRect(-200, -200, state.canvas.width + 400, state.canvas.height + 400);

    // Deep arcane domain background fill
    ctx.fillStyle = 'rgba(10, 25, 20, 0.95)';
    ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.restore();
  }

  drawDomainForeground(ctx, isClashSecondary = false) {
    if (!this.domainActive) return;
  }
}

export const TricksterFighter = RubbickFighter;

