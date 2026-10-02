// ─────────────────────────────────────────────
// Draedon Fighter Entity (Terraria: Calamity Mod)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { draedonConfig } from '../../configs/characters/draedonConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawDraedonSkin } from '../../graphics/fighters/draedonSkin.js';
import {
  drawExoElectricDisintegratorWeapon,
  drawExoDisintegratorBeam,
  drawExoDisintegratorCharge
} from '../../graphics/weapons/draedonWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

function getDraedonSetting(config, key) {
  return config?.[key] ?? draedonConfig[key];
}

export class DraedonFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'draedon';
    this.type = 'draedon';
    this.name = 'Draedon';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    this.color = def?.color ?? getDraedonSetting(cfg, 'color');
    this.themeColor = def?.themeColor ?? getDraedonSetting(cfg, 'themeColor');
    this.secondaryColor = def?.secondaryColor ?? getDraedonSetting(cfg, 'secondaryColor');
    this.damageNumberColor = getDraedonSetting(cfg, 'color');

    this.hp = getDraedonSetting(cfg, 'hp');
    this.maxHp = getDraedonSetting(cfg, 'maxHp');
    this.speed = getDraedonSetting(cfg, 'speed');
    this.baseSpeed = getDraedonSetting(cfg, 'speed');
    this.r = getDraedonSetting(cfg, 'r') || 28;
    this.radius = this.r;

    // Combat Stats & Timers
    this.damage = getDraedonSetting(cfg, 'damage');
    this.cooldown = getDraedonSetting(cfg, 'cooldown');

    // Skill Cooldowns
    this.artilleryCooldown = 0;
    this.matrixCooldown = 0;
    this.matrixActiveTimer = 0;
    this.crossLaserCooldown = 0;

    // Ultimate: Exo Electric Disintegrator Beam States
    this.disintegratorCooldown = 0;
    this.disintegratorWindupTimer = 0;
    this.disintegratorFireTimer = 0;
    this.disintegratorRecoveryTimer = 0;
    this.disintegratorCastAngle = 0;
    this.disintegratorBeamWidth = getDraedonSetting(cfg, 'disintegratorBeamWidth');

    this._registerSkills();
  }

  canAim() {
    // Lock auto-aim tracking during active disintegrator beam channeling (Rule 1.4)
    if (this.disintegratorWindupTimer > 0 || this.disintegratorFireTimer > 0) {
      return false;
    }
    return super.canAim ? super.canAim() : true;
  }

  isStationarySkillActive() {
    return Boolean(
      (this.disintegratorWindupTimer && this.disintegratorWindupTimer > 0) ||
      (this.disintegratorFireTimer && this.disintegratorFireTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  aim(opponent) {
    if (this.disintegratorWindupTimer > 0 || this.disintegratorFireTimer > 0) {
      this.gunAngle = this.disintegratorCastAngle;
      this.angle = this.disintegratorCastAngle;
      return;
    }
    super.aim(opponent);
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    const skills = [];

    if (isSkillEnabled(cfg.enableAresArtillery, true)) {
      skills.push({
        id: 'artillery',
        name: 'Ares Artillery',
        type: 'special',
        cooldownKey: 'artilleryCooldown',
        cooldownMax: () => getDraedonSetting(cfg, 'artilleryCooldown'),
        color: getDraedonSetting(cfg, 'artilleryColor') || '#F59E0B',
        onActivate: (fighter, opponent) => {
          fighter.castAresArtillery(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableThanatosMatrix, true)) {
      skills.push({
        id: 'matrix',
        name: 'Thanatos Matrix',
        type: 'defense',
        cooldownKey: 'matrixCooldown',
        cooldownMax: () => getDraedonSetting(cfg, 'matrixCooldown'),
        color: getDraedonSetting(cfg, 'matrixColor') || '#10B981',
        onActivate: (fighter, opponent) => {
          fighter.castThanatosMatrix(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableArtemisApolloLasers, true)) {
      skills.push({
        id: 'crossLasers',
        name: 'Exo Cross-Lasers',
        type: 'special',
        cooldownKey: 'crossLaserCooldown',
        cooldownMax: () => getDraedonSetting(cfg, 'crossLaserCooldown'),
        color: getDraedonSetting(cfg, 'crossLaserColor') || '#EF4444',
        onActivate: (fighter, opponent) => {
          fighter.castArtemisApolloLasers(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableExoDisintegrator, true)) {
      skills.push({
        id: 'exoDisintegrator',
        name: 'Exo Disintegrator',
        type: 'ultimate',
        cooldownKey: 'disintegratorCooldown',
        cooldownMax: () => getDraedonSetting(cfg, 'disintegratorCooldown'),
        color: getDraedonSetting(cfg, 'disintegratorColor') || '#06B6D4',
        onActivate: (fighter, opponent) => {
          fighter.castExoDisintegrator(opponent);
        }
      });
    }

    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
  }

  reset() {
    super.reset();
    this.artilleryCooldown = 0;
    this.matrixCooldown = 0;
    this.matrixActiveTimer = 0;
    this.crossLaserCooldown = 0;
    this.disintegratorCooldown = 0;
    this.disintegratorWindupTimer = 0;
    this.disintegratorFireTimer = 0;
    this.disintegratorRecoveryTimer = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    // Thanatos Refractive Matrix damage mitigation
    if (this.matrixActiveTimer > 0) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
      const reduction = getDraedonSetting(cfg, 'matrixDamageReduction') || 0.35;
      amount *= (1.0 - reduction);
      spawnSparks(this.x, this.y, 4, '#10B981');
    }
    return super.takeDamage(amount, attacker, opts);
  }

  shoot(ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    if (!isSkillEnabled(cfg.enableExoPulse, true)) {
      return super.shoot(ownerIndex);
    }

    const count = getDraedonSetting(cfg, 'pulseCount') || 2;
    const offset = getDraedonSetting(cfg, 'pulseSpreadOffset') || 12;
    const speed = getDraedonSetting(cfg, 'pulseSpeed') || 12.0;
    const baseAngle = this.gunAngle || 0;
    const perpAngle = baseAngle + Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const side = (i === 0) ? -1 : 1;
      const spawnX = this.x + Math.cos(baseAngle) * (this.r + 14) + Math.cos(perpAngle) * (side * offset);
      const spawnY = this.y + Math.sin(baseAngle) * (this.r + 14) + Math.sin(perpAngle) * (side * offset);
      const vx = Math.cos(baseAngle) * speed;
      const vy = Math.sin(baseAngle) * speed;

      const proj = {
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        radius: 6,
        damage: getDraedonSetting(cfg, 'pulseDamage') || 12,
        color: '#06B6D4',
        owner: ownerIndex !== undefined ? ownerIndex : 0,
        ownerFighter: this,
        visual: 'exoPulse',
        life: 100,
        draw: (ctx) => {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      };

      if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
        projectileSystem.addProjectile(proj);
      } else if (state && Array.isArray(state.projectiles)) {
        state.projectiles.push(proj);
      }
    }

    spawnSparks(this.x + Math.cos(baseAngle) * this.r, this.y + Math.sin(baseAngle) * this.r, 6, '#06B6D4');
    return true;
  }

  castAresArtillery(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    this.artilleryCooldown = getDraedonSetting(cfg, 'artilleryCooldown');

    const rocketCount = getDraedonSetting(cfg, 'artilleryRocketCount') || 4;
    const speed = getDraedonSetting(cfg, 'artillerySpeed') || 7.5;
    const baseAngle = this.gunAngle || 0;

    for (let i = 0; i < rocketCount; i++) {
      const spread = (i - (rocketCount - 1) / 2) * 0.45;
      const angle = baseAngle + spread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const rocket = {
        x: this.x + Math.cos(angle) * (this.r + 15),
        y: this.y + Math.sin(angle) * (this.r + 15),
        vx,
        vy,
        radius: 7,
        damage: getDraedonSetting(cfg, 'artilleryDamagePerRocket') || 9,
        color: '#F59E0B',
        owner: this.fighterIndex ?? 0,
        ownerFighter: this,
        visual: 'aresRocket',
        life: 140,
        isHoming: true,
        homingStrength: getDraedonSetting(cfg, 'artilleryHomingStrength') || 0.08,
        draw: (ctx) => {
          ctx.save();
          ctx.fillStyle = '#F59E0B';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.rect(rocket.x - 4, rocket.y - 4, 8, 8);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      };

      if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
        projectileSystem.addProjectile(rocket);
      } else if (state && Array.isArray(state.projectiles)) {
        state.projectiles.push(rocket);
      }
    }

    spawnFloatingText(this.x, this.y - 25, 'Ares Artillery!', '#F59E0B');
    return true;
  }

  castThanatosMatrix(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    this.matrixCooldown = getDraedonSetting(cfg, 'matrixCooldown');
    this.matrixActiveTimer = getDraedonSetting(cfg, 'matrixDuration') || 120;

    // Omnidirectional electric discharge shockwave
    const rad = getDraedonSetting(cfg, 'matrixDischargeRadius') || 110;
    const dmg = getDraedonSetting(cfg, 'matrixDischargeDamage') || 30;

    if (state && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !f.dead && !this.isTeammate(f)) {
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d <= rad) {
            applyDamageToTarget(f, dmg, this);
            f.vx += ((f.x - this.x) / (d || 1)) * 8;
            f.vy += ((f.y - this.y) / (d || 1)) * 8;
            spawnSparks(f.x, f.y, 8, '#10B981');
          }
        }
      }
    }

    triggerGlobalScreenShake(3.5, 8);
    spawnFloatingText(this.x, this.y - 25, 'Thanatos Matrix!', '#10B981');
    return true;
  }

  castArtemisApolloLasers(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    this.crossLaserCooldown = getDraedonSetting(cfg, 'crossLaserCooldown');

    const range = getDraedonSetting(cfg, 'crossLaserRange') || 450;
    const dmg = getDraedonSetting(cfg, 'crossLaserDamage') || 36;
    const aimAngle = this.gunAngle || 0;

    if (state && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !f.dead && !this.isTeammate(f)) {
          const dx = f.x - this.x;
          const dy = f.y - this.y;
          const d = Math.hypot(dx, dy);
          if (d <= range) {
            applyDamageToTarget(f, dmg, this);
            spawnImpactFlash(f.x, f.y, '#EF4444');
            spawnSparks(f.x, f.y, 10, '#06B6D4');
          }
        }
      }
    }

    triggerGlobalScreenShake(4.0, 8);
    spawnFloatingText(this.x, this.y - 25, 'Exo Cross-Lasers!', '#EF4444');
    return true;
  }

  castExoDisintegrator(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;
    this.disintegratorCooldown = getDraedonSetting(cfg, 'disintegratorCooldown');

    // Snapshot committed 360° omnidirectional aim angle (Rule 1.4)
    let targetAngle = this.gunAngle || 0;
    if (opponent && opponent.x !== undefined && opponent.hp > 0) {
      targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
    this.disintegratorCastAngle = targetAngle;
    this.gunAngle = targetAngle;
    this.angle = targetAngle;

    this.disintegratorWindupTimer = getDraedonSetting(cfg, 'disintegratorWindupFrames') || 40;
    this.disintegratorFireTimer = 0;
    this.disintegratorRecoveryTimer = 0;

    spawnFloatingText(this.x, this.y - 25, 'EXO DISINTEGRATOR!', '#06B6D4');
    return true;
  }

  update(opponent, ownerIndex, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.draedon) ? CONFIG.draedon : draedonConfig;

    // 1. Freeze / Time-Stop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Cooldown decrements
    if (this.artilleryCooldown > 0) this.artilleryCooldown--;
    if (this.matrixCooldown > 0) this.matrixCooldown--;
    if (this.matrixActiveTimer > 0) this.matrixActiveTimer--;
    if (this.crossLaserCooldown > 0) this.crossLaserCooldown--;
    if (this.disintegratorCooldown > 0) this.disintegratorCooldown--;

    // Ultimate: Exo Electric Disintegrator Beam Pipeline
    if (this.disintegratorWindupTimer > 0) {
      this.disintegratorWindupTimer--;
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = this.disintegratorCastAngle;
      this.angle = this.disintegratorCastAngle;
      if (this.disintegratorWindupTimer === 0) {
        this.disintegratorFireTimer = getDraedonSetting(cfg, 'disintegratorFireFrames') || 95;
        triggerGlobalScreenShake(getDraedonSetting(cfg, 'disintegratorScreenShake') || 6.0, 20);
      }
    } else if (this.disintegratorFireTimer > 0) {
      this.disintegratorFireTimer--;
      this.gunAngle = this.disintegratorCastAngle;
      this.angle = this.disintegratorCastAngle;

      // Physical Recoil opposite to beam angle (Rule 1.4)
      const recoil = getDraedonSetting(cfg, 'disintegratorRecoilImpulse') || 2.0;
      this.vx = -Math.cos(this.disintegratorCastAngle) * recoil;
      this.vy = -Math.sin(this.disintegratorCastAngle) * recoil;

      // Continuous Beam Hit-Detection (Line-Segment Collision)
      const tickInterval = getDraedonSetting(cfg, 'disintegratorTickInterval') || 4;
      if (this.disintegratorFireTimer % tickInterval === 0) {
        const dmgPerTick = (getDraedonSetting(cfg, 'disintegratorTotalDamage') || 135) / ((getDraedonSetting(cfg, 'disintegratorFireFrames') || 95) / tickInterval);
        const beamHalfWidth = this.disintegratorBeamWidth || 42;
        const startX = this.x + Math.cos(this.disintegratorCastAngle) * (this.r + 18);
        const startY = this.y + Math.sin(this.disintegratorCastAngle) * (this.r + 18);
        const beamLen = 1200;

        if (state && Array.isArray(state.fighters)) {
          for (const f of state.fighters) {
            if (!f || f === this || f.hp <= 0 || f.dead || this.isTeammate(f)) continue;

            const dx = f.x - startX;
            const dy = f.y - startY;
            const projLen = dx * Math.cos(this.disintegratorCastAngle) + dy * Math.sin(this.disintegratorCastAngle);
            if (projLen >= 0 && projLen <= beamLen) {
              const perpDist = Math.abs(-dx * Math.sin(this.disintegratorCastAngle) + dy * Math.cos(this.disintegratorCastAngle));
              if (perpDist <= beamHalfWidth + (f.r || 20)) {
                applyDamageToTarget(f, dmgPerTick, this);
                const kb = getDraedonSetting(cfg, 'disintegratorKnockbackPerTick') || 1.5;
                f.vx += Math.cos(this.disintegratorCastAngle) * kb;
                f.vy += Math.sin(this.disintegratorCastAngle) * kb;
                spawnSparks(f.x, f.y, 4, '#06B6D4');
              }
            }
          }
        }
      }
    } else if (this.disintegratorRecoveryTimer > 0) {
      this.disintegratorRecoveryTimer--;
    }

    // AI Skill Decision Matrix
    if (opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (this.disintegratorCooldown <= 0 && isSkillEnabled(cfg.enableExoDisintegrator, true)) {
        this.castExoDisintegrator(opponent);
      } else if (dist < 120 && this.matrixCooldown <= 0 && isSkillEnabled(cfg.enableThanatosMatrix, true)) {
        this.castThanatosMatrix(opponent);
      } else if (dist > 160 && this.artilleryCooldown <= 0 && isSkillEnabled(cfg.enableAresArtillery, true)) {
        this.castAresArtillery(opponent);
      } else if (dist > 180 && this.crossLaserCooldown <= 0 && isSkillEnabled(cfg.enableArtemisApolloLasers, true)) {
        this.castArtemisApolloLasers(opponent);
      }
    }

    // Centralized Movement & Physics (Rule 1.2)
    super.update(opponent, ownerIndex, arena);
  }

  draw(ctx) {
    // 1. Draw Thanatos Energy Shield Matrix Aura
    if (this.matrixActiveTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Exo Disintegrator Charging Arcs or Super-Beam (Fallback for standalone tests)
    const isRenderGameActive = (typeof state !== 'undefined' && state.gameState && state.gameState !== 'test');
    if (!isRenderGameActive) {
      if (this.disintegratorWindupTimer > 0) {
        drawExoDisintegratorCharge(ctx, this, this.disintegratorCastAngle);
      } else if (this.disintegratorFireTimer > 0) {
        drawExoDisintegratorBeam(ctx, this, this.disintegratorCastAngle, (state && state.arena));
      }
    }

    // 3. Draw Body Skin & Weapon
    drawDraedonSkin(ctx, this);
    drawExoElectricDisintegratorWeapon(ctx, this);
    this.drawHealth(ctx);
  }

  /**
   * Renders the Exo Electric Disintegrator super-beam on the absolute top layer in renderSystem.js.
   */
  drawTopLayerBeams(ctx) {
    if (this.hp <= 0) return;
    if (this.disintegratorWindupTimer > 0) {
      drawExoDisintegratorCharge(ctx, this, this.disintegratorCastAngle);
    } else if (this.disintegratorFireTimer > 0) {
      drawExoDisintegratorBeam(ctx, this, this.disintegratorCastAngle, (state && state.arena));
    }
  }
}
