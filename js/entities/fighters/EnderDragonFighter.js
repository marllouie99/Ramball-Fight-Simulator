// ─────────────────────────────────────────────
// Ender Dragon — Ruler of The End Fighter Entity
// Authentic Void Flight Physics & Multi-Skill Combat State Machine
// ─────────────────────────────────────────────
import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { enderDragonConfig } from '../../configs/characters/enderDragonConfig.js';
import { drawEnderDragonSkin, drawDragonAcidPool } from '../../graphics/fighters/enderDragonSkin.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';

export const DRAGON_STATE = {
  HOVER: 'HOVER',
  FIREBALL_SPIT: 'FIREBALL_SPIT',
  SWOOP_WINDUP: 'SWOOP_WINDUP',
  SWOOP_DASH: 'SWOOP_DASH',
  SWOOP_RECOVERY: 'SWOOP_RECOVERY',
  CATACLYSM_CHANNEL: 'CATACLYSM_CHANNEL',
};

export class EnderDragonFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ender_dragon';
    this.type = 'ender_dragon';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ender_dragon)
      ? CONFIG.ender_dragon
      : enderDragonConfig;

    this.color = cfg.color || '#18181B';
    this.themeColor = cfg.themeColor || '#C026D3';
    this.damageNumberColor = cfg.themeColor || '#C026D3';

    // Circle Fighter Model: Hide generic firearms, enable draconic claws
    this.hideHands = false;
    this.hideGun = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.gunAngle = Math.PI / 2;
    this.angle = Math.PI / 2;

    // Void Flight Intangibility & Poise
    this.isGhostTerrain = true;
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToCC = true;

    // AI State Machine
    this.aiState = DRAGON_STATE.HOVER;
    this.stateTimer = 180;
    this.hoverOrbitTime = Math.random() * Math.PI * 2;
    this.hoverPhase = Math.random() * Math.PI * 2;

    // Skill Cooldowns
    this.fireballCooldown = Math.floor(Math.random() * 60);
    this.swoopCooldown = 120 + Math.floor(Math.random() * 90);
    this.cataclysmCooldown = 300 + Math.floor(Math.random() * 120);

    // Swoop mechanics
    this.isSwooping = false;
    this.committedAimAngle = 0;
    this.afterImages = [];
    this.hitOpponentThisSwoop = false;

    // Cataclysm mechanics
    this.isChannelingCataclysm = false;
    this.cataclysmProgress = 0;
    this.hasRoaredThisCataclysm = false;

    // Lingering Acid Pools
    this.acidPools = [];

    this._registerSkills();
  }

  // ── Unyielding Boss Poise: Zero Hit-Pause, Zero Flinch & Zero Knockback ──
  get knockbackVx() {
    return 0;
  }
  set knockbackVx(_) {}

  get knockbackVy() {
    return 0;
  }
  set knockbackVy(_) {}

  get basicAttackHitPauseTimer() {
    return 0;
  }
  set basicAttackHitPauseTimer(_) {}

  get knockbackStunTimer() {
    return 0;
  }
  set knockbackStunTimer(_) {}

  get hitStunTimer() {
    return 0;
  }
  set hitStunTimer(_) {}

  applyKnockback(vx, vy, stunFrames = 0, opts = {}) {
    const options = (typeof stunFrames === 'object' && stunFrames !== null)
      ? stunFrames
      : (typeof opts === 'object' && opts !== null ? opts : {});

    // Preserve pulling / dragging / suction beam mechanics (Gojo Purple/Blue, Escanor Cruel Sun, Yuta Pure Love Beam)
    const isPullOrDrag = Boolean(
      options.isPull ||
      options.isDrag ||
      options.isSuction ||
      options.isBlackHole ||
      options.isBeamDrag ||
      options.sourceSkill === 'Hollow Purple' ||
      options.sourceSkill === 'Lapse Blue' ||
      options.sourceSkill === 'Cruel Sun' ||
      options.sourceSkill === 'Pure Love Beam' ||
      options.sourceSkill === 'Getsuga Tensho'
    );

    if (isPullOrDrag) {
      this.vx += (vx || 0) * 0.40;
      this.vy += (vy || 0) * 0.40;
    }
  }

  _getConfig() {
    if (this.bossConfig) return this.bossConfig;
    if (typeof CONFIG !== 'undefined' && CONFIG.ender_dragon) return CONFIG.ender_dragon;
    return enderDragonConfig;
  }

  _playAudio(key, fallbackSrc, defaultVol = 0.85) {
    const cfg = this._getConfig();
    const src = (cfg.sounds && cfg.sounds[key]) || fallbackSrc;
    const vol = (cfg.soundVolumes && cfg.soundVolumes[key] !== undefined)
      ? cfg.soundVolumes[key]
      : defaultVol;
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(src, vol);
      }
    } catch (_) {}
  }

  _registerSkills() {
    const cfg = this._getConfig();
    this.skills = [
      {
        id: 'dragonsBreath',
        name: "Dragon's Breath",
        cooldown: cfg.fireballCooldown || 480,
        currentCooldown: this.fireballCooldown || 0,
        icon: '🟣',
        desc: "Spits an explosive void fireball that detonates into a lingering acid pool.",
      },
      {
        id: 'wingBuffet',
        name: 'Wing Buffet',
        cooldown: cfg.swoopCooldown || 540,
        currentCooldown: this.swoopCooldown || 0,
        icon: '🦇',
        desc: "Performs a high-velocity aerial swoop launching enemies with massive kinetic force.",
      },
      {
        id: 'voidCataclysm',
        name: 'Void Cataclysm',
        cooldown: cfg.cataclysmCooldown || 1100,
        currentCooldown: this.cataclysmCooldown || 0,
        icon: '🌌',
        isUltimate: true,
        desc: "Ascends to perch, emits an earth-shattering roar, and discharges a 360° void wave.",
      },
    ];
  }

  // ── Rule 1.4: Committed 360° Skill Aim Lock ──
  canAim() {
    if (this.isSwooping || this.isChannelingCataclysm || this.aiState === DRAGON_STATE.SWOOP_DASH) {
      return false;
    }
    return super.canAim ? super.canAim() : true;
  }

  aim(target) {
    if (!this.canAim()) return false;
    const opponent = target || (typeof this._collectAllEnemyTargets === 'function' ? this._collectAllEnemyTargets()[0] : null);
    if (!opponent || opponent.hp <= 0) return false;

    const targetZ = opponent.z || 0;
    const myZ = this.z || 0;
    const targetAngle = Math.atan2((opponent.y - targetZ) - (this.y - myZ), opponent.x - this.x);

    let normAngle = targetAngle;
    while (normAngle > Math.PI) normAngle -= Math.PI * 2;
    while (normAngle < -Math.PI) normAngle += Math.PI * 2;

    this.gunAngle = normAngle;
    this.angle = normAngle;
    if (typeof this.rightGunAngle !== 'undefined') this.rightGunAngle = normAngle;
    if (typeof this.leftGunAngle !== 'undefined') this.leftGunAngle = normAngle;
    return true;
  }

  onCountdown(opponent) {
    if (opponent) {
      this.aim(opponent);
    }
  }

  // ── Main Update Loop ──
  update(opponent, ownerIndex, arena) {
    // Rule 1.1: Freeze & TimeStop Early Guard
    const isFrozen = (typeof this._handleTimeStop === 'function') ? this._handleTimeStop() : false;
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = this._getConfig();

    // Tick cooldowns
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.swoopCooldown > 0) this.swoopCooldown--;
    if (this.cataclysmCooldown > 0) this.cataclysmCooldown--;

    if (this.skills && this.skills.length >= 3) {
      this.skills[0].currentCooldown = this.fireballCooldown;
      this.skills[1].currentCooldown = this.swoopCooldown;
      this.skills[2].currentCooldown = this.cataclysmCooldown;
    }

    // Update lingering acid pools
    this._updateAcidPools(opponent);

    // Update trailing afterimages
    this._updateAfterImages();

    // AI State Machine Execution
    switch (this.aiState) {
      case DRAGON_STATE.HOVER:
        this._updateHoverState(opponent, arena, cfg);
        break;
      case DRAGON_STATE.FIREBALL_SPIT:
        this._updateFireballState(opponent, cfg);
        break;
      case DRAGON_STATE.SWOOP_WINDUP:
        this._updateSwoopWindup(opponent, cfg);
        break;
      case DRAGON_STATE.SWOOP_DASH:
        this._updateSwoopDash(opponent, arena, cfg);
        break;
      case DRAGON_STATE.SWOOP_RECOVERY:
        this._updateSwoopRecovery(opponent, cfg);
        break;
      case DRAGON_STATE.CATACLYSM_CHANNEL:
        this._updateCataclysmChannel(opponent, arena, cfg);
        break;
      default:
        this.aiState = DRAGON_STATE.HOVER;
        break;
    }

    // Centralized Movement & Physics (Rule 1.2)
    this.x += this.vx;
    this.y += this.vy;

    // Friction & Leash
    this.vx *= (cfg.hoverFriction || 0.93);
    this.vy *= (cfg.hoverFriction || 0.93);

    this._enforceArenaLeash(arena, cfg);
  }

  // ── Hover & Circling State ──
  _updateHoverState(opponent, arena, cfg) {
    if (opponent && opponent.hp > 0) {
      this.hoverOrbitTime += 0.02;
      this.hoverPhase += (cfg.hoverOscillationFreq || 0.05);

      const targetDistY = cfg.hoverTargetDistanceY || 180;
      const wobble = Math.sin(this.hoverOrbitTime) * (cfg.hoverOrbitWobbleAmp || 40);
      const floatY = Math.sin(this.hoverPhase) * (cfg.hoverOscillationAmp || 7.0);

      const desiredX = opponent.x + wobble;
      const desiredY = opponent.y - targetDistY + floatY;

      const dx = desiredX - this.x;
      const dy = desiredY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        const accel = cfg.hoverAcceleration || 0.22;
        this.vx += (dx / dist) * accel;
        this.vy += (dy / dist) * accel;
      }

      this.aim(opponent);
    }

    // Wing flap sound periodically
    if (Math.random() < 0.015) {
      this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.50);
    }

    // Evaluate Skill Triggers
    if (this.cataclysmCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateCataclysm(opponent, cfg);
    } else if (this.swoopCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateSwoopWindup(opponent, cfg);
    } else if (this.fireballCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateFireball(opponent, cfg);
    }
  }

  // ── Skill 1: Dragon's Breath / Fireball ──
  _initiateFireball(opponent, cfg) {
    this.aiState = DRAGON_STATE.FIREBALL_SPIT;
    this.stateTimer = 18;
    this.committedAimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedAimAngle;
    this.angle = this.committedAimAngle;
  }

  _updateFireballState(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer === 8) {
      this._fireDragonBreath(cfg);
    }
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.HOVER;
      this.fireballCooldown = cfg.fireballCooldown || 480;
    }
  }

  _fireDragonBreath(cfg) {
    const angle = this.committedAimAngle;
    const speed = cfg.fireballSpeed || 9.0;
    const damage = cfg.fireballDamage || 28;
    const r = cfg.fireballRadius || 16;
    const sourceFighter = this;

    this._playAudio('fireball', 'Assets/Sound Effects/Skills/redblast.mp3', 0.85);

    // Spawn fireball projectile
    const proj = {
      x: this.x + Math.cos(angle) * (this.r + 10),
      y: this.y + Math.sin(angle) * (this.r + 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: r,
      damage: damage,
      owner: sourceFighter,
      color: '#C026D3',
      secondaryColor: '#E879F9',
      isEnderFireball: true,
      maxDistance: 600,
      traveled: 0,
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += speed;

        if (Math.random() < 0.4) {
          spawnSparks(this.x, this.y, '#D946EF', 2, 2.0);
        }

        // Check collision or max distance
        const targets = (typeof state !== 'undefined' && state.fighters) ? state.fighters : [];
        for (let f of targets) {
          if (f && f !== sourceFighter && f.hp > 0) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < (f.r || 20) + this.radius) {
              this.detonate();
              return true; // Destroy projectile
            }
          }
        }

        if (this.traveled >= this.maxDistance) {
          this.detonate();
          return true;
        }
        return false;
      },
      detonate() {
        sourceFighter._playAudio('fireballImpact', 'Assets/Sound Effects/Skills/purpledeploy.mp3', 0.90);
        triggerGlobalScreenShake(6, 15);
        spawnImpactFlash(this.x, this.y, cfg.fireballDetonationRadius || 70, '#F5D0FE');
        spawnSparks(this.x, this.y, '#C026D3', 18, 5.0);

        // Deploy lingering acid pool
        sourceFighter.acidPools.push({
          x: this.x,
          y: this.y,
          radius: cfg.acidPoolRadius || 70,
          duration: cfg.acidPoolDurationFrames || 180,
          maxDuration: cfg.acidPoolDurationFrames || 180,
          tickTimer: 0,
          tickInterval: cfg.acidTickInterval || 15,
          damagePerTick: cfg.acidDamagePerTick || 6,
          owner: sourceFighter,
        });
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#C026D3';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#E879F9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    };

    if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
      projectileSystem.addProjectile(proj);
    } else if (typeof state !== 'undefined' && state.projectiles) {
      state.projectiles.push(proj);
    }
  }

  // ── Skill 2: Wing Buffet / Kinetic Swoop ──
  _initiateSwoopWindup(opponent, cfg) {
    this.aiState = DRAGON_STATE.SWOOP_WINDUP;
    this.stateTimer = cfg.swoopWindupFrames || 14;
    this.committedAimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedAimAngle;
    this.angle = this.committedAimAngle;
    this.vx *= 0.3;
    this.vy *= 0.3;

    this._playAudio('swoop', 'Assets/Sound Effects/Skills/dash2.mp3', 0.90);
  }

  _updateSwoopWindup(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.SWOOP_DASH;
      this.stateTimer = cfg.swoopDurationFrames || 18;
      this.isSwooping = true;
      this.hitOpponentThisSwoop = false;

      const speed = cfg.swoopSpeed || 18.5;
      this.vx = Math.cos(this.committedAimAngle) * speed;
      this.vy = Math.sin(this.committedAimAngle) * speed;
    }
  }

  _updateSwoopDash(opponent, arena, cfg) {
    this.stateTimer--;

    // Trail afterimages
    if (this.stateTimer % 3 === 0) {
      this.afterImages.push({
        x: this.x,
        y: this.y,
        angle: this.committedAimAngle,
        alpha: 0.55,
      });
    }

    // Frontal Arc Collision Query (Rule 1.6)
    if (!this.hitOpponentThisSwoop) {
      const reach = cfg.swoopReach || 80;
      const arc = cfg.swoopArc || (120 * Math.PI / 180);
      const targets = this._collectAllEnemyTargets();

      for (let target of targets) {
        if (!target || target === this || target.hp <= 0) continue;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= reach + (target.r || 20)) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - this.committedAimAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) <= arc / 2) {
            this._applySwoopHit(target, cfg);
            this.hitOpponentThisSwoop = true;
            break;
          }
        }
      }
    }

    if (this.stateTimer <= 0) {
      this.isSwooping = false;
      this.aiState = DRAGON_STATE.SWOOP_RECOVERY;
      this.stateTimer = cfg.swoopTurnaroundFrames || 8;
      this.vx *= 0.25;
      this.vy *= 0.25;
    }
  }

  _applySwoopHit(target, cfg) {
    const damage = cfg.swoopDamage || 38;
    const knockback = cfg.swoopKnockback || 20.0;
    const angle = this.committedAimAngle;

    this._playAudio('swoopHit', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.95);
    triggerGlobalScreenShake(8, 20);
    spawnImpactFlash(target.x, target.y, 45, '#F5D0FE');
    spawnSparks(target.x, target.y, '#C026D3', 14, 6.0);

    applyDamageToTarget(target, damage, this);
    spawnFloatingText(target.x, target.y - 20, `-${damage}`, '#C026D3');

    // Rule 1.5: Freeze / hit-pause applied to target only
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(8);
    }

    if (typeof target.applyKnockback === 'function') {
      target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback, 14);
    }
  }

  _updateSwoopRecovery(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.HOVER;
      this.swoopCooldown = cfg.swoopCooldown || 540;
    }
  }

  // ── Skill 3 / Ultimate: Void Cataclysm & Perch ──
  _initiateCataclysm(opponent, cfg) {
    this.aiState = DRAGON_STATE.CATACLYSM_CHANNEL;
    this.stateTimer = cfg.cataclysmChannelFrames || 70;
    this.isChannelingCataclysm = true;
    this.cataclysmProgress = 0;
    this.hasRoaredThisCataclysm = false;
    this.vx = 0;
    this.vy = -0.5; // Slight dramatic hover ascension

    this._playAudio('lightning', 'Assets/Sound Effects/Skills/thunderstrike.mp3', 0.85);
  }

  _updateCataclysmChannel(opponent, arena, cfg) {
    this.stateTimer--;
    const totalFrames = cfg.cataclysmChannelFrames || 70;
    this.cataclysmProgress = 1.0 - (this.stateTimer / totalFrames);

    // Roar & shockwave at frame 40
    const roarFrame = cfg.cataclysmRoarFrame || 40;
    if (this.stateTimer === (totalFrames - roarFrame) && !this.hasRoaredThisCataclysm) {
      this.hasRoaredThisCataclysm = true;
      this._dischargeCataclysmBurst(cfg);
    }

    if (this.stateTimer <= 0) {
      this.isChannelingCataclysm = false;
      this.aiState = DRAGON_STATE.HOVER;
      this.cataclysmCooldown = cfg.cataclysmCooldown || 1100;
    }
  }

  _dischargeCataclysmBurst(cfg) {
    const shockwaveR = cfg.cataclysmShockwaveRadius || 220;
    const damage = cfg.cataclysmShockwaveDamage || 65;
    const knockback = cfg.cataclysmShockwaveKnockback || 22.0;

    this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 1.0);
    triggerGlobalScreenShake(cfg.cataclysmScreenShake || 12, 35);
    spawnImpactFlash(this.x, this.y, shockwaveR, '#F5D0FE');
    spawnSparks(this.x, this.y, '#C026D3', 30, 9.0);

    const targets = this._collectAllEnemyTargets();
    for (let target of targets) {
      if (!target || target === this || target.hp <= 0) continue;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= shockwaveR) {
        const angle = Math.atan2(dy, dx);
        applyDamageToTarget(target, damage, this);
        spawnFloatingText(target.x, target.y - 25, `-${damage}`, '#E879F9');

        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(12);
        }
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback, 18);
        }
      }
    }

    // Secondary homing void fireballs in spiral
    const count = cfg.cataclysmSecondaryFireballs || 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this._fireSecondaryFireball(angle, cfg);
    }
  }

  _fireSecondaryFireball(angle, cfg) {
    const speed = cfg.cataclysmSecondarySpeed || 7.5;
    const damage = cfg.cataclysmSecondaryDamage || 18;
    const sourceFighter = this;

    const proj = {
      x: this.x + Math.cos(angle) * (this.r + 5),
      y: this.y + Math.sin(angle) * (this.r + 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 12,
      damage: damage,
      owner: sourceFighter,
      maxDistance: 450,
      traveled: 0,
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += speed;

        const targets = (typeof state !== 'undefined' && state.fighters) ? state.fighters : [];
        for (let f of targets) {
          if (f && f !== sourceFighter && f.hp > 0) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < (f.r || 20) + this.radius) {
              applyDamageToTarget(f, this.damage, sourceFighter);
              spawnSparks(this.x, this.y, '#D946EF', 8, 3.5);
              return true;
            }
          }
        }
        return this.traveled >= this.maxDistance;
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#D946EF';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
      projectileSystem.addProjectile(proj);
    } else if (typeof state !== 'undefined' && state.projectiles) {
      state.projectiles.push(proj);
    }
  }

  // ── Acid Pools & Helpers ──
  _updateAcidPools(opponent) {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.duration--;
      pool.tickTimer++;

      if (pool.tickTimer >= pool.tickInterval) {
        pool.tickTimer = 0;
        const targets = this._collectAllEnemyTargets();

        for (let target of targets) {
          if (!target || target === this || target.hp <= 0) continue;
          const d = Math.hypot(target.x - pool.x, target.y - pool.y);
          if (d <= pool.radius) {
            applyDamageToTarget(target, pool.damagePerTick, this);
            spawnFloatingText(target.x, target.y - 10, `-${pool.damagePerTick}`, '#A21CAF');
            this._playAudio('acidTick', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.35);

            // Apply movement slow
            target.vx = (target.vx || 0) * 0.85;
            target.vy = (target.vy || 0) * 0.85;
          }
        }
      }

      if (pool.duration <= 0) {
        this.acidPools.splice(i, 1);
      }
    }
  }

  _updateAfterImages() {
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      this.afterImages[i].alpha -= 0.05;
      if (this.afterImages[i].alpha <= 0) {
        this.afterImages.splice(i, 1);
      }
    }
  }

  _collectAllEnemyTargets() {
    const targets = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.fighters)) {
        for (let f of state.fighters) {
          if (f && f !== this && f.hp > 0) targets.push(f);
        }
      }
      if (Array.isArray(state.illusions)) {
        for (let ill of state.illusions) {
          if (ill && ill !== this && ill.hp > 0) targets.push(ill);
        }
      }
    }
    return targets;
  }

  _enforceArenaLeash(arena, cfg) {
    if (!arena) return;
    const margin = cfg.softLeashRadius || 440;
    const ax = arena.x + arena.width / 2;
    const ay = arena.y + arena.height / 2;
    const dist = Math.hypot(this.x - ax, this.y - ay);

    if (dist > margin) {
      const pull = 0.35;
      const angle = Math.atan2(ay - this.y, ax - this.x);
      this.vx += Math.cos(angle) * pull;
      this.vy += Math.sin(angle) * pull;
    }
  }

  interruptAttacks() {
    this.isSwooping = false;
    this.isChannelingCataclysm = false;
    if (this.aiState !== DRAGON_STATE.HOVER) {
      this.aiState = DRAGON_STATE.HOVER;
    }
  }

  draw(ctx) {
    if (!ctx) return;

    // Draw acid pools beneath dragon
    for (let pool of this.acidPools) {
      drawDragonAcidPool(ctx, pool);
    }

    drawEnderDragonSkin(ctx, this);
  }
}
