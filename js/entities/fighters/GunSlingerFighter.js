import { Fighter, isEntityOutsideArena } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawAlucardDualGuns, GUNSLINGER_WEAPON_GRAPHICS } from '../../graphics/weapons/gunSlingerWeaponGraphics.js';
import { drawAlucardSkin } from '../../graphics/fighters/gunSlingerSkin.js';
import { spatialGrid } from '../../systems/physics.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';

let _hellhoundFrames = null;
let _hellhoundFramesLoading = false;

/**
 * Lazy-loads and caches Alucard's Baskerville Hellhound animation frames (5-frame attack surge sequence).
 * @returns {HTMLImageElement[]|null}
 */
export function _getHellhoundFrames() {
  if (_hellhoundFrames && _hellhoundFrames.every(img => img && img.complete && img.naturalWidth > 0)) {
    return _hellhoundFrames;
  }
  if (!_hellhoundFramesLoading && typeof Image !== 'undefined') {
    _hellhoundFramesLoading = true;
    const paths = [
      'Assets/model/Alucard/Hellbound animation/Hellhound_frame1.png',
      'Assets/model/Alucard/Hellbound animation/Hellhound_frame2.png',
      'Assets/model/Alucard/Hellbound animation/Hellhound_frame3.png',
      'Assets/model/Alucard/Hellbound animation/Hellhound_frame4.png',
      'Assets/model/Alucard/Hellbound animation/Hellhound_frame5.png',
    ];
    _hellhoundFrames = paths.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }
  return _hellhoundFrames;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getHellhoundFrames();
}

/**
 * Alucard Fighter (The No-Life King — Hellsing Ultimate)
 * Dual-wields the .454 Casull (Sacred Silver) and 13mm Jackal (Explosive Mercury).
 * Alternates fire between both guns with unique ballistic profiles.
 * Passive: Vampiric Blood Siphon (Lifesteal) & Bloodlust Momentum scaling.
 * Active: Control Art Restriction Level 1 — Baskerville Shadow Release & Dual Execution Burst.
 *
 * Adheres strictly to:
 * - Rule 19: Upright Front-POV Orientation, faceless minimalist anime aesthetic
 * - Rule 20: Approved symmetrical lower-flank hand positioning & white gloves with Hellsing seal
 * - Rule 21: Mandatory in-game overhead HP & status timer drawing (super.draw calls FighterRenderer)
 * - Rule 23: Basic projectile suppression (overrides shoot())
 * - Rule 24: Universal body radius standard (r: 25)
 * - Rule 25: Non-freezing active visual effect and shadow decay before _handleTimeStop()
 * - Rule 26: Clean concentric shockwave standard (anti-cobweb, staggered wave discs)
 * - Rule 27: Lifesteal healthbar-only feedback (zero floating text in arena for lifesteal)
 */
export class GunSlingerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.leftGunTimer = 0;
    this.muzzleFlashTimer = 0;
    this.rightMuzzleFlashTimer = 0;
    this.leftMuzzleFlashTimer = 0;
    this.skillTimer = 0;
    this.skillActive = false;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    this.currentGun = 'right'; // 'right' = .454 Casull, 'left' = 13mm Jackal
    this.rightGunAngle = 0;
    this.leftGunAngle = 0;

    // Tactical Magazine system (12 rounds = 6 Casull + 6 Jackal)
    this.magazineBullets = CONFIG.gunslinger?.magazineSize ?? 12;
    this.maxMagazine = CONFIG.gunslinger?.magazineSize ?? 12;
    this.reloadTimer = 0;
    this.isReloading = false;

    // Dynamic crit stats
    this.critChance = CONFIG.gunslinger?.critChance ?? 0.15;
    this.critMultiplier = CONFIG.gunslinger?.critMultiplier ?? 1.50;

    // Active visual effects & particles (Rule 25 compliant)
    this.smokeParticles = [];
    this.shadowTendrils = [];
    this.activeBaskervilleHounds = [];
    this.shockwaves = [];
    this.batParticles = [];
    this.shadowDecoys = [];

    // 3 Dedicated Vampire Combat Skills
    this.skill1Timer = 0; // Skill 1: Baskerville Feast
    this.skill2Timer = 0; // Skill 2: Shadow Phase
    this.skill3Timer = 0; // Skill 3: Illusion Counter
    this.isShadowPhasing = false;
    this.shadowPhaseTimer = 0;
    this.shadowPhaseDirX = 0;
    this.shadowPhaseDirY = 0;
    this.isCounterStance = false;
    this.counterStanceTimer = 0;

    // Recoil animation (separate for each gun)
    this.rightRecoilOffset = 0;
    this.rightRecoilTilt = 0;
    this.leftRecoilOffset = 0;
    this.leftRecoilTilt = 0;
    this.gunSpinTimer = 0;
    this.gunSpinDuration = 20;

    // Victory animation: Gun spin into crossed X pose
    this.hasWonMatch = false;
    this.victorySpinTimer = 0;
    this.victorySpinDuration = 50;
    this.victorySpinAngle = 0;
    this.isVictoryXPose = false;
    this.victoryXPoseProgress = 0;
    this.characterId = 'gunslinger';
    this.usesCustomHands = true;
    this.hasCustomHands = true;
    this.hideGuns = false;
    this.hideHands = false;
  }

  reset() {
    super.reset();
    this.leftGunTimer = 0;
    this.muzzleFlashTimer = 0;
    this.rightMuzzleFlashTimer = 0;
    this.leftMuzzleFlashTimer = 0;
    this.skillTimer = 0;
    this.skillActive = false;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    this.currentGun = 'right';
    this.rightGunAngle = 0;
    this.leftGunAngle = 0;
    this.magazineBullets = this.maxMagazine;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.critChance = CONFIG.gunslinger?.critChance ?? 0.15;
    this.critMultiplier = CONFIG.gunslinger?.critMultiplier ?? 1.50;
    this.smokeParticles = [];
    this.shadowTendrils = [];
    this.activeBaskervilleHounds = [];
    this.shockwaves = [];
    this.batParticles = [];
    this.shadowDecoys = [];
    this.skill1Timer = 0;
    this.skill2Timer = 0;
    this.skill3Timer = 0;
    this.isShadowPhasing = false;
    this.shadowPhaseTimer = 0;
    this.shadowPhaseDirX = 0;
    this.shadowPhaseDirY = 0;
    this.isCounterStance = false;
    this.counterStanceTimer = 0;
    this.rightRecoilOffset = 0;
    this.rightRecoilTilt = 0;
    this.leftRecoilOffset = 0;
    this.leftRecoilTilt = 0;
    this.gunSpinTimer = 0;
    this.hasWonMatch = false;
    this.victorySpinTimer = 0;
    this.victorySpinAngle = 0;
    this.isVictoryXPose = false;
    this.victoryXPoseProgress = 0;
    this.hideGuns = false;
    this.hideHands = false;
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Alucard uses dedicated alternating Casull & Jackal firearm attacks
  }

  _spawnMuzzleSmoke(muzzleX, muzzleY, gunAngle, isJackal = false) {
    if (!this.smokeParticles) this.smokeParticles = [];
    if (this.smokeParticles.length > 24) return;
    const speed = 0.6 + Math.random() * 0.6;
    this.smokeParticles.push({
      x: muzzleX + (Math.random() - 0.5) * 4,
      y: muzzleY + (Math.random() - 0.5) * 4,
      vx: Math.cos(gunAngle) * speed + (Math.random() - 0.5) * 0.4,
      vy: Math.sin(gunAngle) * speed - (0.4 + Math.random() * 0.3),
      life: 24,
      maxLife: 24,
      size: 3.2 + Math.random() * 2.2,
      color: isJackal ? '#DC2626' : '#E2E8F0',
    });
  }

  _spawnShadowAura() {
    if (!this.shadowTendrils) this.shadowTendrils = [];
    if (this.shadowTendrils.length > 18) return;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.r * (0.8 + Math.random() * 0.6);
      this.shadowTendrils.push({
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.8 - Math.random() * 1.2,
        size: 3.0 + Math.random() * 4.0,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        isEye: Math.random() < 0.35, // Glowing demonic eye
      });
    }
  }

  _spawnBatSwarm(count = 8) {
    if (!this.batParticles) this.batParticles = [];
    if (this.batParticles.length > 36) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.5;
      this.batParticles.push({
        x: this.x + (Math.random() - 0.5) * this.r,
        y: this.y + (Math.random() - 0.5) * this.r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3.5 + Math.random() * 2.5,
        life: 20 + Math.random() * 14,
        maxLife: 34,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 0.35 + Math.random() * 0.25,
        color: Math.random() < 0.3 ? '#DC2626' : '#0B0B10',
      });
    }
  }

  _spawnShadowDecoy(x, y, angle) {
    if (!this.shadowDecoys) this.shadowDecoys = [];
    if (this.shadowDecoys.length > 4) return;
    this.shadowDecoys.push({
      x: x,
      y: y,
      angle: angle,
      life: 24,
      maxLife: 24,
    });
  }

  _spawnBaskervilleHound(target) {
    if (!target) return;
    const targetX = target.x;
    const targetY = target.y;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);

    this.activeBaskervilleHounds.push({
      x: this.x,
      y: this.y,
      target: target,
      targetX: targetX,
      targetY: targetY,
      angle: angle,
      speed: CONFIG.gunslinger?.houndSpeed ?? 18.0,
      life: 45,
      maxLife: 45,
      hasHit: false,
      damage: CONFIG.gunslinger?.houndDamage ?? 22.0,
      animTick: 0,
      hitTicks: 0,
    });
  }

  _updateVisualEffects() {
    // 1. Update smoke particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      let i = this.smokeParticles.length;
      while (i--) {
        const p = this.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.vy -= 0.025;
        p.size += 0.05;
        p.life--;
        if (p.life <= 0) {
          this.smokeParticles[i] = this.smokeParticles[this.smokeParticles.length - 1];
          this.smokeParticles.pop();
        }
      }
    }

    // 2. Update shadow tendrils & demonic eyes
    if (this.shadowTendrils && this.shadowTendrils.length > 0) {
      let i = this.shadowTendrils.length;
      while (i--) {
        const t = this.shadowTendrils[i];
        t.x += t.vx;
        t.y += t.vy;
        t.life--;
        if (t.life <= 0) {
          this.shadowTendrils[i] = this.shadowTendrils[this.shadowTendrils.length - 1];
          this.shadowTendrils.pop();
        }
      }
    }

    // 3. Update bat swarm particles (Skill 2 & 3)
    if (this.batParticles && this.batParticles.length > 0) {
      let i = this.batParticles.length;
      while (i--) {
        const bat = this.batParticles[i];
        bat.x += bat.vx;
        bat.y += bat.vy;
        bat.vx *= 0.96;
        bat.vy *= 0.96;
        bat.wingPhase += bat.wingSpeed;
        bat.life--;
        if (bat.life <= 0) {
          this.batParticles[i] = this.batParticles[this.batParticles.length - 1];
          this.batParticles.pop();
        }
      }
    }

    // 4. Update shadow decoys (Skill 3 Illusion Counter)
    if (this.shadowDecoys && this.shadowDecoys.length > 0) {
      let i = this.shadowDecoys.length;
      while (i--) {
        const decoy = this.shadowDecoys[i];
        decoy.life--;
        if (decoy.life <= 0) {
          this.shadowDecoys[i] = this.shadowDecoys[this.shadowDecoys.length - 1];
          this.shadowDecoys.pop();
        }
      }
    }

    // 5. Update Baskerville Shadow Hounds (Skill 1: 5-frame Hellhound animation sequence)
    if (this.activeBaskervilleHounds && this.activeBaskervilleHounds.length > 0) {
      let i = this.activeBaskervilleHounds.length;
      while (i--) {
        const hound = this.activeBaskervilleHounds[i];
        hound.life--;
        hound.animTick = (hound.animTick || 0) + 1;

        if (hound.hasHit) {
          hound.hitTicks = (hound.hitTicks || 0) + 1;
        }

        // Track target position while surging
        if (hound.target && hound.target.hp > 0 && !hound.hasHit) {
          hound.targetX = hound.target.x;
          hound.targetY = hound.target.y;
          const targetAngle = Math.atan2(hound.targetY - hound.y, hound.targetX - hound.x);
          hound.angle = targetAngle;
        }

        if (!hound.hasHit) {
          hound.x += Math.cos(hound.angle) * hound.speed;
          hound.y += Math.sin(hound.angle) * hound.speed;

          // Spawn shifting shadow smoke trail behind surging hound
          if (Math.random() < 0.65) {
            this._spawnMuzzleSmoke(
              hound.x - Math.cos(hound.angle) * 24 + (Math.random() - 0.5) * 8,
              hound.y - Math.sin(hound.angle) * 24 + (Math.random() - 0.5) * 8,
              hound.angle + Math.PI,
              true
            );
          }
        }

        // Check impact with target
        if (hound.target && !hound.hasHit) {
          const dist = Math.hypot(hound.x - hound.targetX, hound.y - hound.targetY);
          if (dist <= (hound.target.r || 20) + 16 || hound.life <= 5) {
            hound.hasHit = true;
            hound.hitTicks = 1;

            // Deal hound bite damage
            if (typeof hound.target.takeDamage === 'function') {
              hound.target.takeDamage(hound.damage, this, { isSkill: true });
            }

            // Heavy anti-regeneration debuff: Grievous Wounds / Heal Block (3.0s)
            hound.target.grievousWoundsTimer = CONFIG.gunslinger?.grievousWoundsDuration ?? 180;
            hound.target.healBlockTimer = CONFIG.gunslinger?.grievousWoundsDuration ?? 180;

            // Aggressive Regeneration: Heals Alucard on damage dealt (Rule 27 compliant)
            const isLowHp = this.hp <= this.maxHp * 0.50;
            const lifestealPct = isLowHp
              ? (CONFIG.gunslinger?.lowHpLifestealPercent ?? 0.50)
              : (CONFIG.gunslinger?.lifestealPercent ?? 0.35);
            const healAmount = Math.max(1, Math.round(hound.damage * lifestealPct));
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            this._lastHealAmount = (this._lastHealAmount || 0) + healAmount;
            this._healthBarHealTimer = 16;

            // Directional blood splatter
            spawnBloodEffect(hound.target, 16, hound.angle, { minSize: 2.5, maxSize: 4.5, count: 5 });

            // Spawn clean concentric shockwave (Rule 26)
            this.shockwaves.push({
              x: hound.targetX,
              y: hound.targetY,
              maxRadius: 46,
              duration: 20,
              currentFrame: 0,
            });

            triggerGlobalScreenShake(5, 3);
          }
        }

        if (hound.life <= 0 || (hound.hasHit && hound.hitTicks >= 8)) {
          this.activeBaskervilleHounds[i] = this.activeBaskervilleHounds[this.activeBaskervilleHounds.length - 1];
          this.activeBaskervilleHounds.pop();
        }
      }
    }

    // 6. Update clean concentric shockwaves (Rule 26)
    if (this.shockwaves && this.shockwaves.length > 0) {
      let i = this.shockwaves.length;
      while (i--) {
        const sw = this.shockwaves[i];
        sw.currentFrame++;
        if (sw.currentFrame >= sw.duration) {
          this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
          this.shockwaves.pop();
        }
      }
    }
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
    if (forceCancelAll) {
      this.skillActive = false;
      this.skillBurstCount = 0;
      this.isShadowPhasing = false;
      this.isCounterStance = false;
    }
  }

  aim(opponent, secondaryOpponent = null) {
    if (!this.canAim() || !this.isValidAimTarget(opponent)) {
      return false;
    }

    super.aim(opponent);
    this.rightGunAngle = this.gunAngle;

    if (secondaryOpponent && this.isValidAimTarget(secondaryOpponent)) {
      const secTargetAngle = Math.atan2(secondaryOpponent.y - this.y, secondaryOpponent.x - this.x);
      let turnRate = 1.0;
      if (secondaryOpponent.isStealthed) {
        turnRate = CONFIG.toji?.stealthTurnRate || 0.035;
      }
      if (turnRate < 1.0) {
        let currentAngle = this.leftGunAngle !== undefined ? this.leftGunAngle : (this.angle || 0);
        let diff = secTargetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.leftGunAngle = currentAngle + diff * turnRate;
      } else {
        this.leftGunAngle = secTargetAngle;
      }
    } else {
      this.leftGunAngle = this.rightGunAngle;
    }
    return true;
  }

  getTargets() {
    const targets = [];
    const selfIndex = state.fighters.indexOf(this);
    const selfTeam = state.getFighterTeam(selfIndex);
    const nearbyFighters = spatialGrid.getNearby(this.x, this.y, 800);

    for (const other of nearbyFighters) {
      if (!other || other === this || other.hp <= 0) continue;
      if (other.invincibilityTimer > 0 || other.flashStepTimer > 0) continue;

      const otherIndex = state.fighters.indexOf(other);
      if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && selfTeam !== null && state.getFighterTeam(otherIndex) === selfTeam) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      targets.push({ fighter: other, dist: Math.hypot(dx, dy) });
    }

    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0 || illusion.owner === this) continue;
      const dx = illusion.x - this.x;
      const dy = illusion.y - this.y;
      targets.push({ fighter: illusion, dist: Math.hypot(dx, dy) });
    }

    targets.sort((a, b) => a.dist - b.dist);
    return targets.map((entry) => entry.fighter);
  }

  _startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = CONFIG.gunslinger?.reloadTime ?? 70;
    const reloadSound = getSkillEffectSound('gunslinger', 'reload');
    if (reloadSound) audioSystem.playSFX(reloadSound.src, reloadSound.volume);
  }

  _finishReload() {
    this.magazineBullets = this.maxMagazine;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.gunSpinTimer = 20;
    this.gunSpinDuration = 20;
    spawnFloatingText(this.x, this.y - this.r - 10, 'RELOADED', '#DC2626');
  }

  fireBullet(ownerIndex, damage, isSkill = false, target = null) {
    if (!projectileSystem) return;
    if (this.isReloading && !isSkill) return;
    if (!isSkill && this.magazineBullets <= 0) {
      this._startReload();
      return;
    }

    const speed = CONFIG.gunslinger?.bulletSpeed ?? 32.0;
    const isJackal = this.currentGun === 'left';
    const bulletDamage = isSkill
      ? (CONFIG.gunslinger?.skillDamage ?? 5.0)
      : (isJackal ? (CONFIG.gunslinger?.jackalDamage ?? 8.0) : damage);

    if (!isSkill) {
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
      if (this.magazineBullets === 0) {
        this._startReload();
      }
    } else {
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
    }

    const gunAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (isJackal ? this.leftGunAngle : this.rightGunAngle);

    // Front (right / Casull) gun at (+r * 0.90, 0); Rear (left / Jackal) gun at (-r * 0.45, 0)
    const scale = GUNSLINGER_WEAPON_GRAPHICS?.positioning?.scale || 0.68;
    const muzzleDist = (isJackal ? 48 : 42) * scale;
    const localGunX = isJackal ? (-this.r * 0.45) : (this.r * 0.90);
    const localGunY = 0;

    const localTotalX = localGunX + muzzleDist;
    const localTotalY = localGunY;

    const cosA = Math.cos(gunAngle);
    const sinA = Math.sin(gunAngle);
    const spawnX = this.x + cosA * localTotalX - sinA * localTotalY;
    const spawnY = this.y + sinA * localTotalX + cosA * localTotalY;

    const visualType = isJackal ? 'alucardJackalBullet' : 'alucardCasullBullet';
    const proj = projectileSystem.fireProjectile(this, ownerIndex, bulletDamage, false, speed, false, visualType, spawnX, spawnY, gunAngle);

    // Muzzle sparks & smoke
    spawnSparks(spawnX, spawnY, 6, isJackal ? 'flame' : 'flash');
    this._spawnMuzzleSmoke(spawnX, spawnY, gunAngle, isJackal);

    if (isJackal) {
      this.leftMuzzleFlashTimer = 7;
    } else {
      this.rightMuzzleFlashTimer = 7;
    }
    this.muzzleFlashTimer = 7;

    // Physical recoil screen shake
    triggerGlobalScreenShake(isSkill ? 5 : (isJackal ? 3.5 : 2.5), 3);

    // Attack sound
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    const isCrit = !isSkill && Math.random() < this.critChance;
    if (proj) {
      proj.isCrit = isCrit;
    }

    // Alternate guns
    if (this.currentGun === 'right') {
      this.currentGun = 'left';
      this.leftGunTimer = CONFIG.gunslinger?.leftGunDelay ?? 8;
    } else {
      this.currentGun = 'right';
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // 1. Complete invulnerability frames (i-frames) during Shadow Phase dash
    if (this.isShadowPhasing && this.shadowPhaseTimer > 0) {
      return false;
    }

    // 2. Skill 3: Illusion Counter (Mockery Stance)
    if (this.isCounterStance && this.counterStanceTimer > 0 && attacker && attacker !== this && !opts.isCounter && !opts.isGuaranteedHit) {
      return this._triggerIllusionCounter(attacker);
    }

    return super.takeDamage(amount, attacker, opts);
  }

  _triggerIllusionCounter(attacker) {
    this.isCounterStance = false;
    this.counterStanceTimer = 0;

    // Dissolve into shadow & spawn decoy at current position
    this._spawnShadowDecoy(this.x, this.y, this.rightGunAngle || this.angle || 0);
    this._spawnBatSwarm(16);

    // Teleport directly behind attacker
    const attackerAngle = (attacker.gunAngle !== undefined) ? attacker.gunAngle : (attacker.angle || 0);
    const behindDist = (attacker.r || 25) + this.r + 20;
    this.x = attacker.x - Math.cos(attackerAngle) * behindDist;
    this.y = attacker.y - Math.sin(attackerAngle) * behindDist;

    // Rule 1.3: Update aim immediately after teleport
    this.aim(attacker);

    // Cinematic hit-pause / time-stop on attacker (Rule 1.5)
    if (typeof attacker.applyTimeStop === 'function') {
      attacker.applyTimeStop(CONFIG.gunslinger?.counterTimeStop ?? 25);
    }

    // Point-blank counter damage
    const counterDmg = CONFIG.gunslinger?.counterDamage ?? 26.0;
    if (typeof attacker.takeDamage === 'function') {
      attacker.takeDamage(counterDmg, this, { isSkill: true, isCounter: true });
    }

    // Aggressive Regeneration lifesteal (Rule 27 compliant)
    const isLowHp = this.hp <= this.maxHp * 0.50;
    const lifestealPct = isLowHp
      ? (CONFIG.gunslinger?.lowHpLifestealPercent ?? 0.50)
      : (CONFIG.gunslinger?.lifestealPercent ?? 0.35);
    const healAmount = Math.max(1, Math.round(counterDmg * lifestealPct));
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    this._lastHealAmount = (this._lastHealAmount || 0) + healAmount;
    this._healthBarHealTimer = 16;

    // Heavy anti-regeneration shots debuff
    attacker.grievousWoundsTimer = CONFIG.gunslinger?.grievousWoundsDuration ?? 180;
    attacker.healBlockTimer = CONFIG.gunslinger?.grievousWoundsDuration ?? 180;

    // Sparks, blood, screen shake, shockwave (Rule 26)
    spawnSparks(this.x, this.y, 14, 'flame');
    spawnBloodEffect(attacker, 24, attackerAngle, { minSize: 3, maxSize: 5.5, count: 8 });
    this.shockwaves.push({
      x: attacker.x,
      y: attacker.y,
      maxRadius: 56,
      duration: 22,
      currentFrame: 0,
    });
    triggerGlobalScreenShake(8, 5);

    spawnFloatingText(this.x, this.y - this.r - 14, 'SHADOW EXECUTION!', '#DC2626');
    return false; // Nullify incoming hit damage!
  }

  castSkill1BaskervilleFeast(target) {
    if (this.skill1Timer > 0) return false;
    this.skill1Timer = CONFIG.gunslinger?.skill1Cooldown ?? 240;
    const effectiveTarget = target || this.getTargets()[0] || null;
    if (effectiveTarget) {
      this._spawnBaskervilleHound(effectiveTarget);
    }
    this._spawnShadowAura();
    spawnFloatingText(this.x, this.y - this.r - 12, 'BASKERVILLE FEAST!', '#DC2626');
    triggerGlobalScreenShake(5, 3);
    return true;
  }

  castSkill2ShadowPhase(target) {
    if (this.skill2Timer > 0 || this.isShadowPhasing) return false;
    this.skill2Timer = CONFIG.gunslinger?.skill2Cooldown ?? 320;
    this.isShadowPhasing = true;
    this.shadowPhaseTimer = CONFIG.gunslinger?.shadowPhaseDuration ?? 22;

    let angle = this.rightGunAngle || this.angle || 0;
    if (target) {
      angle = Math.atan2(target.y - this.y, target.x - this.x);
    }
    this.shadowPhaseDirX = Math.cos(angle);
    this.shadowPhaseDirY = Math.sin(angle);

    this._spawnBatSwarm(14);
    spawnFloatingText(this.x, this.y - this.r - 12, 'SHADOW PHASE!', '#B91C1C');
    return true;
  }

  castSkill3IllusionCounter() {
    if (this.skill3Timer > 0 || this.isCounterStance || this.isShadowPhasing) return false;
    this.skill3Timer = CONFIG.gunslinger?.skill3Cooldown ?? 420;
    this.isCounterStance = true;
    this.counterStanceTimer = CONFIG.gunslinger?.counterStanceDuration ?? 60;
    this.vx = 0;
    this.vy = 0;
    this._spawnShadowAura();
    spawnFloatingText(this.x, this.y - this.r - 12, 'MOCKERY...', '#EF4444');
    return true;
  }

  activateSkill(ownerIndex) {
    const targets = this.getTargets();
    const primaryTarget = targets[0] || (state.fighters && state.fighters.find(f => f && f !== this && f.hp > 0));

    // Cycle through ready skills: Skill 1 -> Skill 2 -> Skill 3
    if (this.skill1Timer <= 0) {
      return this.castSkill1BaskervilleFeast(primaryTarget);
    }
    if (this.skill2Timer <= 0 && !this.isShadowPhasing) {
      return this.castSkill2ShadowPhase(primaryTarget);
    }
    if (this.skill3Timer <= 0 && !this.isCounterStance) {
      return this.castSkill3IllusionCounter();
    }
    return false;
  }

  onDamageDealt(target, projectile, ownerIndex, amount) {
    super.onDamageDealt?.(target, projectile, ownerIndex, amount);

    // 1. Passive: Aggressive Regeneration (Rule 27 compliant healthbar-only feedback)
    // Converts 35% base (or 50% when HP <= 50% maxHp) of damage dealt into vampiric HP recovery
    const isLowHp = this.hp <= this.maxHp * 0.50;
    const lifestealPct = isLowHp
      ? (CONFIG.gunslinger?.lowHpLifestealPercent ?? 0.50)
      : (CONFIG.gunslinger?.lifestealPercent ?? 0.35);
    if (lifestealPct > 0) {
      const dmgAmount = (typeof amount === 'number' && amount > 0) ? amount : (projectile?.damage || this.damage);
      const healAmount = Math.max(1, Math.round(dmgAmount * lifestealPct));
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      this._lastHealAmount = (this._lastHealAmount || 0) + healAmount;
      this._healthBarHealTimer = 16;
      // Strictly Rule 27 compliant: Zero floating text in arena for continuous lifesteal!
    }

    // 2. Heavy Anti-Regeneration Shots: Grievous Wounds / Heal Block debuff (3.0s)
    if (target && target.hp > 0) {
      const gwDur = CONFIG.gunslinger?.grievousWoundsDuration ?? 180;
      target.grievousWoundsTimer = gwDur;
      target.healBlockTimer = gwDur;

      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (!target._lastGrievousAnnounceTime || now - target._lastGrievousAnnounceTime > 1500) {
        spawnFloatingText(target.x, target.y - (target.r || 25) - 18, 'GRIEVOUS WOUNDS!', '#DC2626');
        target._lastGrievousAnnounceTime = now;
      }
    }

    if (projectile && !projectile.isSkill) {
      // Kinetic knockback impulse
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const knockbackStrength = CONFIG.gunslinger?.basicAttackKnockback ?? 4.5;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback((dx / dist) * knockbackStrength, (dy / dist) * knockbackStrength);
      } else {
        target.knockbackVx = (target.knockbackVx || 0) + (dx / dist) * knockbackStrength;
        target.knockbackVy = (target.knockbackVy || 0) + (dy / dist) * knockbackStrength;
      }

      // Critical hit passive scaling
      if (projectile.isCrit) {
        const extraDamage = this.damage * (this.critMultiplier - 1);
        target.takeDamage(extraDamage, this, { isCrit: true });
        spawnFloatingText(target.x, target.y - target.r - 15, 'CRIT!', '#DC2626');

        const chanceInc = CONFIG.gunslinger?.critChanceIncrease ?? 0.04;
        const multInc = CONFIG.gunslinger?.critMultiplierIncrease ?? 0.10;
        const maxChance = CONFIG.gunslinger?.maxCritChance ?? 0.50;
        const maxMult = CONFIG.gunslinger?.maxCritMultiplier ?? 2.20;

        this.critChance = Math.min(maxChance, this.critChance + chanceInc);
        this.critMultiplier = Math.min(maxMult, this.critMultiplier + multInc);
      }
    }
  }

  /**
   * Checks whether Alucard has won the round or match.
   * @param {Fighter|null} opponent
   * @returns {boolean}
   */
  _checkVictoryStatus(opponent) {
    if (this._isStudioDummy) return false;
    if (this.dead || this.hp <= 0) return false;
    if (this._isWinnerReveal) return true;
    if (typeof state === 'undefined') return false;

    // Direct winner assignment in state
    if (state.matchWinner === this || state.roundWinner === this) {
      return true;
    }

    // Team-based win check (2v2, Tag Match, 1v2)
    if ((state.matchWinner || state.roundWinner) && state.getFighterTeam && typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
      const winner = state.matchWinner || state.roundWinner;
      const winnerIdx = state.fighters.indexOf(winner);
      const myIdx = state.fighters.indexOf(this);
      if (winnerIdx !== -1 && myIdx !== -1 && state.getFighterTeam(winnerIdx) === state.getFighterTeam(myIdx)) {
        return true;
      }
      return false;
    }

    // Explicit loss if another fighter won
    if (state.matchWinner && state.matchWinner !== this) {
      return false;
    }
    if (state.roundWinner && state.roundWinner !== this) {
      return false;
    }

    // Round / Match end state where opponents are down
    if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd') {
      if (Array.isArray(state.fighters) && state.getFighterTeam && typeof state.getFighterTeam === 'function') {
        const myIdx = state.fighters.indexOf(this);
        const myTeam = state.getFighterTeam(myIdx);
        const enemiesAlive = state.fighters.some((f, idx) => f && f !== this && f.hp > 0 && !f.dead && state.getFighterTeam(idx) !== myTeam);
        if (!enemiesAlive) return true;
      } else if (opponent && (opponent.dead || opponent.hp <= 0)) {
        return true;
      }
    }

    return false;
  }

  update(opponent, ownerIndex, arena) {
    // 0. Update visual effects & transient particle lifecycles before freeze guard (Rule 25)
    this._updateVisualEffects();

    // 1. Mandatory Rule 1 Freeze & TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // 2. Victory State: Gun Spin & Form X Pose Animation
    const isWinner = this._checkVictoryStatus(opponent);
    if (isWinner) {
      if (!this.hasWonMatch) {
        this.hasWonMatch = true;
        this.victorySpinTimer = this.victorySpinDuration;
        this.victorySpinAngle = 0;
        this.isVictoryXPose = false;
        this.victoryXPoseProgress = 0;
        this.hideGuns = false;
        this.hideHands = false;
        this.skillActive = false;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.gunAngle = 0;
        this.rightGunAngle = 0;
        this.leftGunAngle = 0;

        const reloadSound = getSkillEffectSound('gunslinger', 'reload');
        if (reloadSound && audioSystem && audioSystem.playSFX) {
          audioSystem.playSFX(reloadSound.src, (reloadSound.volume || 0.6) * 0.85, 1.25);
        }
      }

      if (this.victorySpinTimer > 0) {
        this.victorySpinTimer--;
        const spinPhaseDuration = 26; // First 24-26 frames are rapid twin spin flourish
        if (this.victorySpinTimer > this.victorySpinDuration - spinPhaseDuration) {
          const spinP = (this.victorySpinDuration - this.victorySpinTimer) / spinPhaseDuration;
          const ease = 1 - Math.pow(1 - spinP, 2.5);
          this.victorySpinAngle = ease * Math.PI * 2 * 2.5;
          this.victoryXPoseProgress = 0;
          this.isVictoryXPose = false;
        } else {
          // Smoothly cross guns into X pose over remaining frames
          this.victorySpinAngle = 0;
          const remaining = this.victorySpinDuration - spinPhaseDuration;
          const xProgress = 1 - (this.victorySpinTimer / remaining);
          this.victoryXPoseProgress = 1 - Math.pow(1 - xProgress, 3);
          this.isVictoryXPose = true;
        }

        // Subtle wisps of barrel smoke during initial spin
        if (this.victorySpinTimer > 35 && Math.random() < 0.4) {
          this._spawnMuzzleSmoke(this.x + this.r * 0.82, this.y + this.r * 0.38, 0, false);
          this._spawnMuzzleSmoke(this.x - this.r * 0.82, this.y + this.r * 0.38, Math.PI, true);
        }

        if (this.victorySpinTimer === 0) {
          this.victorySpinAngle = 0;
          this.isVictoryXPose = true;
          this.victoryXPoseProgress = 1.0;
          this.hideGuns = false;
          this.hideHands = false;
        }
      } else {
        this.victorySpinAngle = 0;
        this.isVictoryXPose = true;
        this.victoryXPoseProgress = 1.0;
        this.hideGuns = false;
        this.hideHands = false;
      }

      this.vx = 0;
      this.vy = 0;
      this.gunAngle = 0;
      this.rightGunAngle = 0;
      this.leftGunAngle = 0;
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // 3 Dedicated vampire combat skill cooldowns
    if (this.skill1Timer > 0) this.skill1Timer--;
    if (this.skill2Timer > 0) this.skill2Timer--;
    if (this.skill3Timer > 0) this.skill3Timer--;
    if (this.skillTimer > 0) this.skillTimer--;

    // Active Shadow Phase Handling (Skill 2)
    if (this.isShadowPhasing) {
      const phaseSpeed = CONFIG.gunslinger?.shadowPhaseSpeed ?? 18.0;
      this.vx = this.shadowPhaseDirX * phaseSpeed;
      this.vy = this.shadowPhaseDirY * phaseSpeed;
      this.x += this.vx;
      this.y += this.vy;
      this._spawnBatSwarm(2);
      this.shadowPhaseTimer--;
      if (this.shadowPhaseTimer <= 0) {
        this.isShadowPhasing = false;
        this.vx *= 0.3;
        this.vy *= 0.3;
        this._spawnBatSwarm(10);
        const targets = this.getTargets();
        const pt = targets[0] || opponent;
        if (pt) this.aim(pt);
      }
      this.resolveWallBounce(arena);
      return; // Phasing through opponents with complete i-frames
    }

    // Active Illusion Counter Mockery Stance Handling (Skill 3)
    if (this.isCounterStance) {
      this.vx = 0;
      this.vy = 0;
      this.counterStanceTimer--;
      this._spawnShadowAura();
      if (this.counterStanceTimer <= 0) {
        this.isCounterStance = false;
      }
      return; // Standing completely still in mockery stance
    }

    // Reload timer
    if (this.isReloading) {
      if (this.reloadTimer > 0) {
        this.reloadTimer--;
      }
      if (this.reloadTimer === 0) {
        this._finishReload();
      }
    }

    // Gun timers
    if (this.leftGunTimer > 0) this.leftGunTimer--;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer--;
    if (this.rightMuzzleFlashTimer > 0) this.rightMuzzleFlashTimer--;
    if (this.leftMuzzleFlashTimer > 0) this.leftMuzzleFlashTimer--;
    if (this.gunSpinTimer > 0) this.gunSpinTimer--;

    // Recoil decay
    const recoilConfig = GUNSLINGER_WEAPON_GRAPHICS?.recoil || { recoilDecay: 0.28, tiltDecay: 0.22 };
    if (this.rightRecoilOffset > 0) {
      this.rightRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.rightRecoilOffset < 0.1) this.rightRecoilOffset = 0;
    }
    if (this.rightRecoilTilt > 0) {
      this.rightRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.rightRecoilTilt < 0.001) this.rightRecoilTilt = 0;
    }
    if (this.leftRecoilOffset > 0) {
      this.leftRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.leftRecoilOffset < 0.1) this.leftRecoilOffset = 0;
    }
    if (this.leftRecoilTilt > 0) {
      this.leftRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.leftRecoilTilt < 0.001) this.leftRecoilTilt = 0;
    }

    const targets = this.getTargets();
    const primaryTarget = targets[0] || opponent;
    const secondaryTarget = targets[1] || null;
    this.aim(primaryTarget, secondaryTarget);

    // AI Vampire Skill Decision Matrix
    if (primaryTarget && !this.isReloading && !this.isShadowPhasing && !this.isCounterStance) {
      const dist = Math.hypot(primaryTarget.x - this.x, primaryTarget.y - this.y);

      // Priority 1: Skill 3 Illusion Counter when enemy is close and advancing
      if (this.skill3Timer <= 0 && dist < 170 && Math.random() < 0.025) {
        this.castSkill3IllusionCounter();
      }
      // Priority 2: Skill 2 Shadow Phase when cornered, close, or low HP to cross-up
      else if (this.skill2Timer <= 0 && (dist < 150 || this.hp < this.maxHp * 0.45) && Math.random() < 0.035) {
        this.castSkill2ShadowPhase(primaryTarget);
      }
      // Priority 3: Skill 1 Baskerville Feast surge
      else if (this.skill1Timer <= 0 && Math.random() < 0.03) {
        this.castSkill1BaskervilleFeast(primaryTarget);
      }
    }

    // Handle Active Skill (Baskerville Execution Volleys)
    if (this.skillActive) {
      this.skillBurstTimer++;
      this._spawnShadowAura();

      if (this.skillBurstTimer >= (CONFIG.gunslinger?.skillBurstInterval ?? 7)) {
        this.skillBurstTimer = 0;

        if (this.skillBurstCount < (CONFIG.gunslinger?.skillBurstCount ?? 6)) {
          // Synchronized dual fire from Casull and Jackal
          this.currentGun = 'right';
          this.fireBullet(ownerIndex, CONFIG.gunslinger?.skillDamage ?? 5.0, true);
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;

          this.currentGun = 'left';
          this.fireBullet(ownerIndex, CONFIG.gunslinger?.skillDamage ?? 5.0, true);
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.9;
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.85;

          this.skillBurstCount++;
        } else {
          this.skillActive = false;
          this.skillBurstCount = 0;
          this.currentGun = 'right';
          this._startReload();
        }
      }
    } else {
      // Normal attack — alternating Casull & Jackal fire
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (secondaryTarget && !this.isReloading && this.magazineBullets > 1) {
        const pInside = primaryTarget && !isEntityOutsideArena(primaryTarget, arena);
        const sInside = secondaryTarget && !isEntityOutsideArena(secondaryTarget, arena);
        if (pInside || sInside) {
          if (pInside) {
            this.currentGun = 'right';
            this.fireBullet(ownerIndex, this.damage, false, primaryTarget);
            this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
            this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          }
          if (sInside) {
            this.currentGun = 'left';
            this.fireBullet(ownerIndex, this.damage, false, secondaryTarget);
            this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.9;
            this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.85;
          }
          this.shootCooldown = CONFIG.gunslinger?.shotCooldown ?? 14;
        }
      } else if (this.leftGunTimer === 0 && !this.isReloading && this.magazineBullets > 0) {
        const mainTarget = primaryTarget || opponent;
        if (!mainTarget || !isEntityOutsideArena(mainTarget, arena)) {
          this.fireBullet(ownerIndex, this.damage);
          if (this.currentGun === 'right') {
            this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
            this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          } else {
            this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
            this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          }
        }
        this.shootCooldown = CONFIG.gunslinger?.shotCooldown ?? 14;
      }
    }

    // Movement & Centralized Physics (Rule 1.2)
    const speedMult = this.isReloading ? (CONFIG.gunslinger?.reloadSpeedPenalty ?? 0.80) : 1.0;
    this.applyMovementPhysics(speedMult);
    this.resolveWallBounce(arena);
  }

  drawSkin(ctx) {
    if (this.isShadowPhasing) {
      ctx.save();
      ctx.globalAlpha = 0.30;
      drawAlucardSkin(ctx, this);
      ctx.restore();
    } else {
      drawAlucardSkin(ctx, this);
    }
  }

  drawBody(ctx) {
    if (this.isShadowPhasing) {
      ctx.save();
      ctx.globalAlpha = 0.30;
      drawAlucardSkin(ctx, this);
      ctx.restore();
    } else {
      drawAlucardSkin(ctx, this);
    }
  }

  drawGun(ctx) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    if (this.hideGuns) return;
    if (this.isShadowPhasing) return; // Hide guns during shadow phase mist
    const isFiring = this.muzzleFlashTimer > 0;

    let gunSpinAngle = 0;
    if (this.victorySpinTimer > 0 && this.victorySpinAngle !== 0) {
      gunSpinAngle = this.victorySpinAngle || 0;
    } else if (this.gunSpinTimer > 0) {
      const t = this.gunSpinTimer / this.gunSpinDuration;
      gunSpinAngle = (t * t) * Math.PI * 2;
    }

    const isXPose = this.isVictoryXPose || this.hasWonMatch || Boolean(this._isWinnerReveal);
    const xProgress = this.victoryXPoseProgress !== undefined
      ? (this.victoryXPoseProgress || (isXPose ? 1.0 : 0))
      : (isXPose ? 1.0 : 0);

    drawAlucardDualGuns(
      this.x, this.y,
      this.rightGunAngle, this.leftGunAngle,
      this.r,
      isFiring && this.currentGun === 'right',
      this.rightMuzzleFlashTimer,
      isFiring && this.currentGun === 'left',
      this.leftMuzzleFlashTimer,
      this.rightRecoilOffset,
      this.rightRecoilTilt,
      this.leftRecoilOffset,
      this.leftRecoilTilt,
      gunSpinAngle,
      false, // hideHands: false (Alucard's pair of white combat gloves is rendered exclusively by his dual weapons)
      isXPose,
      xProgress
    );

    if (!this.hasWonMatch && !this.hideGuns) {
      this.drawMagazine(ctx);
    }
  }

  drawMagazine(ctx) {
    if (!CONFIG.gunslinger?.enableMagazine) return;
    const bullets = this.magazineBullets;
    const isFacingLeft = Math.abs(this.rightGunAngle) > Math.PI / 2;

    const magW = 16;
    const magH = 50;
    let magX = isFacingLeft ? (this.x + this.r + 14) : (this.x - this.r - magW - 14);
    const bendDir = isFacingLeft ? -1 : 1;
    const magY = this.y - magH / 2;
    const bend = 8 * bendDir;

    ctx.save();

    // 1. Dark Victorian Magazine Body
    ctx.fillStyle = '#181A20';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(magX + 2, magY + 6);
    ctx.lineTo(magX + magW, magY);
    ctx.quadraticCurveTo(magX + magW + bend, magY + magH / 2, magX + magW, magY + magH);
    ctx.lineTo(magX, magY + magH);
    ctx.quadraticCurveTo(magX + bend, magY + magH / 2, magX + 2, magY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Magazine Window
    const winX = magX + 6;
    const winW = magW - 8;
    const winY = magY + 5;
    const winH = magH - 10;
    const innerBend = bend * 0.8;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(winX, winY + 2);
    ctx.lineTo(winX + winW, winY);
    ctx.quadraticCurveTo(winX + winW + innerBend, winY + winH / 2, winX + winW, winY + winH);
    ctx.lineTo(winX, winY + winH);
    ctx.quadraticCurveTo(winX + innerBend, winY + winH / 2, winX, winY + 2);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(winX - 5, winY - 5, winW + 10, winH + 10);

    // 3. Bullets inside window (Alternating Casull silver & Jackal black/red)
    const bulletCount = Math.min(bullets, 12);
    const bH = 2.5;
    const bGap = 1.0;
    const bW = winW - 2;

    for (let i = 0; i < bulletCount; i++) {
      const by = winY + winH - (i + 1) * (bH + bGap) - 2;
      const t = (by - winY) / winH;
      const curveOffset = 2 * (1 - t) * t * innerBend;
      const bx = winX + 1 + curveOffset;

      const isJackalRound = (i % 2 === 1);
      ctx.fillStyle = isJackalRound ? '#1E293B' : '#E2E8F0';
      ctx.fillRect(bx, by, bW, bH);

      // Bullet tip
      ctx.fillStyle = isJackalRound ? '#DC2626' : '#FFFFFF';
      ctx.fillRect(bx + bW / 2 - 1, by - 2, 2, 2);
    }

    // 4. Reload overlay
    if (this.isReloading) {
      const reloadRatio = 1 - (this.reloadTimer / (CONFIG.gunslinger?.reloadTime ?? 70));
      const scanY = winY + winH - (winH * reloadRatio);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
      ctx.fillRect(winX - 10, scanY, winW + 20, winH);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(winX - 10, scanY - 1, winW + 20, 2);
    }

    ctx.restore();

    // Ammo count text
    ctx.fillStyle = bullets <= 4 ? '#EF4444' : '#E2E8F0';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${bullets}`, magX + magW / 2, magY + magH + 3);

    ctx.restore();
  }

  _drawVisualEffects(ctx) {
    const P = 2.0;

    // 1. Draw Smoke Particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.smokeParticles.length; i++) {
        const p = this.smokeParticles[i];
        const lifeRatio = p.life / p.maxLife;
        ctx.globalAlpha = lifeRatio * 0.7;
        const s = Math.max(1, Math.round(p.size / P));
        const px = Math.round(p.x / P) * P;
        const py = Math.round(p.y / P) * P;

        ctx.fillStyle = p.color || '#94A3B8';
        ctx.fillRect(px - s * P, py - s * P, s * 2 * P, s * 2 * P);
      }
      ctx.restore();
    }

    // 2. Draw Shadow Aura Tendrils & Red Eyes
    if (this.shadowTendrils && this.shadowTendrils.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.shadowTendrils.length; i++) {
        const t = this.shadowTendrils[i];
        const alpha = (t.life / t.maxLife) * 0.85;
        ctx.globalAlpha = alpha;
        const s = Math.max(1, Math.round(t.size / P));
        const px = Math.round(t.x / P) * P;
        const py = Math.round(t.y / P) * P;

        if (t.isEye) {
          // Demonic Eye (Crimson iris + yellow slit)
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(px - 2 * P, py - 1 * P, 4 * P, 2 * P);
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(px - 1 * P, py - 1 * P, 2 * P, 2 * P);
        } else {
          ctx.fillStyle = '#0F0B14';
          ctx.fillRect(px - s * P, py - s * P, s * 2 * P, s * 2 * P);
        }
      }
      ctx.restore();
    }

    // 3. Draw Bat Swarm Particles (Skill 2 Shadow Phase & Skill 3 Illusion Counter)
    if (this.batParticles && this.batParticles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.batParticles.length; i++) {
        const bat = this.batParticles[i];
        const alpha = bat.life / bat.maxLife;
        ctx.save();
        ctx.translate(bat.x, bat.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bat.color || '#0E0F14';
        const wingSpread = Math.sin(bat.wingPhase) * (bat.size * 0.85);
        ctx.beginPath();
        ctx.moveTo(-bat.size, -wingSpread);
        ctx.lineTo(0, 0);
        ctx.lineTo(bat.size, -wingSpread);
        ctx.lineTo(0, bat.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 4. Draw Shadow Decoys (Skill 3 Illusion Counter)
    if (this.shadowDecoys && this.shadowDecoys.length > 0) {
      ctx.save();
      for (let i = 0; i < this.shadowDecoys.length; i++) {
        const decoy = this.shadowDecoys[i];
        const alpha = (decoy.life / decoy.maxLife) * 0.70;
        ctx.save();
        ctx.translate(decoy.x, decoy.y);
        ctx.rotate(decoy.angle);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#0F0B14';
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 5. Draw Baskerville Shadow Hounds (Skill 1: 5-frame Hellhound animation sequence)
    if (this.activeBaskervilleHounds && this.activeBaskervilleHounds.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const houndFrames = _getHellhoundFrames();
      const hasLoadedFrames = (
        houndFrames &&
        houndFrames.length === 5 &&
        houndFrames.every(img => img && img.complete && img.naturalWidth > 0)
      );

      for (let i = 0; i < this.activeBaskervilleHounds.length; i++) {
        const hound = this.activeBaskervilleHounds[i];
        ctx.save();
        ctx.translate(hound.x, hound.y);
        ctx.rotate(hound.angle);

        const facingLeft = Math.abs(hound.angle) > Math.PI / 2;
        if (facingLeft) {
          ctx.scale(1, -1);
        }

        // Active animation frame (0 to 4 mapping to frames 1 to 5):
        // During surge: cycle frames 1-5 every 3 ticks
        // On impact bite: advance through frames 3, 4, 5 (wide jaws -> clamp -> crunch)
        let frameIdx = 0;
        if (hound.hasHit) {
          const hitProg = hound.hitTicks || 0;
          frameIdx = Math.min(4, 2 + Math.floor(hitProg / 2));
        } else {
          frameIdx = Math.floor((hound.animTick || 0) / 3) % 5;
        }

        if (hasLoadedFrames && houndFrames[frameIdx]) {
          const frameImg = houndFrames[frameIdx];
          const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.alucard_hound || state.skinCustomizations?.gunslinger_hound)) || {};
          const customScale = custom.scale ?? 1.0;
          const scale = 0.28 * customScale;
          const drawW = frameImg.naturalWidth * scale;
          const drawH = frameImg.naturalHeight * scale;

          // Shadow demonic aura disc underneath
          ctx.save();
          ctx.fillStyle = 'rgba(11, 11, 16, 0.45)';
          ctx.beginPath();
          ctx.ellipse(0, 0, drawW * 0.42, drawH * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Render Hellhound animation frame
          ctx.drawImage(frameImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        } else {
          // Procedural fallback (used when images are loading or in headless tests)
          ctx.fillStyle = '#0B0B10';
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(18, -4);
          ctx.lineTo(26, 0);
          ctx.lineTo(18, 4);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#EF4444';
          ctx.fillRect(6, -6, 4, 3);
          ctx.fillRect(12, -4, 4, 3);
          ctx.fillRect(8, 3, 4, 3);
        }

        ctx.restore();
      }
      ctx.restore();
    }

    // 6. Draw Clean Concentric Shockwaves (Rule 26)
    if (this.shockwaves && this.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < this.shockwaves.length; i++) {
        const sw = this.shockwaves[i];
        const progress = sw.currentFrame / sw.duration;
        const waveAlpha = Math.pow(1 - progress, 1.25);

        // Dipping fingers staggered wave discs
        const ringRadius = sw.maxRadius * Math.pow(progress, 0.75);

        // Translucent warm interior wash
        ctx.fillStyle = `rgba(185, 28, 28, ${0.20 * waveAlpha})`;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, ringRadius, 0, Math.PI * 2);
        ctx.fill();

        // Clean circular compression band (Anti-cobweb standard)
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 * waveAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary supersonic white core ring
        if (progress > 0.15) {
          const innerProg = (progress - 0.15) / 0.85;
          const innerRadius = sw.maxRadius * Math.pow(innerProg, 0.85) * 0.7;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - innerProg)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, innerRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  draw(ctx) {
    // 1. Draw Skill Indicator
    if (this.skillActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 2. Draw Mockery Counter Stance Aura
    if (this.isCounterStance) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 3. Draw visual effects (Hounds, bats, shadow decoys, shadow aura, shockwaves)
    this._drawVisualEffects(ctx);

    // 4. Delegate to base class rendering pipeline (Rule 21: renders drawBody, drawGun, drawHealth, drawFreezeTimer)
    super.draw(ctx);
  }
}

export const AlucardFighter = GunSlingerFighter;
