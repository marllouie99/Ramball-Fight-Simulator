import { Fighter } from './fighter.js';
import { CONFIG } from '../core/config.js';
import { spawnFloatingText, state } from '../core/state.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getSkillEffectSound } from '../soundEffects/skillEffectSounds.js';
import { drawDispenser, drawDispenserTetherBeam, drawDispenserHealingRing } from '../graphics/weapons/engineerWeaponGraphics.js';
import { spawnSparks } from '../graphics/particles/sparkEffect.js';
import { spawnMachineCorpse } from '../graphics/particles/deathShatterEffect.js';
import { drawMinionHealthBar } from '../graphics/statusEffects.js';

export class DispenserEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    const cfg = CONFIG.Engineer || {};
    const def = {
      id: 998,
      name: 'Dispenser',
      color: '#b8860b',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: cfg.dispenserRadius || 19,
      type: 'Dispenser',
      isDispenser: true,
      isMinion: true,
      isDeployable: true,
      hp: cfg.dispenserHp || 160,
      damage: 0,
      cooldown: 0,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.isDispenser = true;
    this.isMinion = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true; // Disable HP number overlay over body
    this.maxHp = cfg.dispenserHp || 160;
    this.hp = this.maxHp;
    this.healCooldownTimer = 0;
    this.hitFlashTimer = 0;
    this.healTimer = 0;
    this.healTickTimer = 0;
    this.smokeParticles = [];
    this.tetheredTargets = [];
    this._tetheredFighterSet = new Set();
    this.isBuilding = true;
    this.buildProgress = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.Engineer || {};
    this.isDispenser = true;
    this.isMinion = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true;
    this.maxHp = cfg.dispenserHp || 160;
    this.hp = this.maxHp;
    this.tetheredTargets = [];
    this._tetheredFighterSet = new Set();
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
  }

  applyKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.vx = 0;
    this.vy = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (this.isBuilding) return false;
    if (opts.isPoison) return false;

    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }

    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied && this.hp > 0) {
      this.hitFlashTimer = 10;
    }
    return applied;
  }

  applyPoison(attacker) {
    // Dispensers are machines
  }

  onDeath() {
    spawnMachineCorpse(this.x, this.y, 0);
    for (let i = 0; i < 4; i++) {
      spawnSparks(this.x, this.y, 8, 'gold');
    }
    const deathSound = getSkillEffectSound('turret', 'death');
    if (deathSound) audioSystem.playSFX(deathSound.src, deathSound.volume);
  }

  heal(amount) {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.healTimer = 20;
    spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(amount)} HP`, '#00FF88');
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;

    if (this.healCooldownTimer > 0) this.healCooldownTimer--;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.healTimer > 0) this.healTimer--;

    // Update smoke particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const p = this.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.35;
        p.life--;
        if (p.life <= 0) {
          this.smokeParticles.splice(i, 1);
        }
      }
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return;
    }

    // ── Absolute Immovable Anchor Lock ──
    // Dispenser is a fixed, heavy support cabinet anchored to the arena floor.
    // Zero out all velocities and lock coordinates unconditionally to prevent ANY push or displacement.
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX === undefined) {
      this._fixedX = this.x;
      this._fixedY = this.y;
    } else {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    // Keep within arena bounds
    if (arena) {
      if (this.x - this.r < arena.x) this.x = arena.x + this.r;
      if (this.x + this.r > arena.x + arena.width) this.x = arena.x + arena.width - this.r;
      if (this.y - this.r < arena.y) this.y = arena.y + this.r;
      if (this.y + this.r > arena.y + arena.height) this.y = arena.y + arena.height - this.r;
    }

    // Overheating smoke when HP <= 10%
    if (this.hp > 0 && this.hp <= this.maxHp * 0.1) {
      if (Math.random() < 0.6) {
        this.smokeParticles.push({
          x: this.x + (Math.random() - 0.5) * 18,
          y: this.y + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -1 - Math.random() * 1.5,
          life: 20 + Math.random() * 20,
          maxLife: 40,
          size: 4 + Math.random() * 5,
          isDark: true
        });
      }
      if (Math.random() < 0.3) {
        spawnSparks(this.x + (Math.random() - 0.5) * 16, this.y + (Math.random() - 0.5) * 16, 1, 'gold');
      }
    }

    if (this.isBuilding) return;

    // ── SUPPORT & TETHER BEAM SYSTEM ──
    const cfg = CONFIG.Engineer || {};
    const range = cfg.dispenserRange || 260;
    const rangeSq = range * range;
    this.tetheredTargets = [];
    const currentTetheredSet = new Set();
    let newlyEntered = false;

    if (state && state.fighters) {
      const myOwnerIndex = state.fighters.indexOf(this.owner);
      const ownerTeam = (state.mode === '2v2' || state.mode === '1v2 Stand Off') ? state.getFighterTeam(myOwnerIndex) : null;

      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0) continue;

        const isOwner = (f === this.owner);
        const isTeammate = (ownerTeam !== null && state.getFighterTeam(i) === ownerTeam);

        // Tether to Engineer and teammates (exclude enemy fighters and non-allied entities)
        if ((isOwner || isTeammate) && !f.isTurret && !f.isDispenser) {
          const dx = f.x - this.x;
          const dy = (f.y - (f.z || 0)) - this.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= rangeSq) {
            this.tetheredTargets.push(f);
            currentTetheredSet.add(f);
            if (!this._tetheredFighterSet.has(f)) {
              newlyEntered = true;
            }
          }
        }
      }
    }

    // Play sound effect ONCE whenever a fighter enters the radius
    if (newlyEntered) {
      const healSfx = cfg.sounds?.dispenserHeal || 'Assets/Sound Effects/Skills/engineer-sentryreloading.mp3';
      const healVol = cfg.soundVolumes?.dispenserHeal ?? 0.85;
      audioSystem.playSFX(healSfx, healVol);
    }
    this._tetheredFighterSet = currentTetheredSet;

    // Synergy with nearby Sentry Turret: Accelerate reload speed
    if (this.owner && this.owner.turretEntity && this.owner.turretEntity.hp > 0) {
      const turret = this.owner.turretEntity;
      const tDx = turret.x - this.x;
      const tDy = turret.y - this.y;
      if (tDx * tDx + tDy * tDy <= rangeSq) {
        if (turret.isReloading && turret.reloadTimer > 0) {
          // Dispenser provides rapid ammo feed — double reload speed
          turret.reloadTimer--;
        }
      }
    }

    // Periodic healing pulses to tethered targets (visual floating text & sparks only)
    const tickInterval = cfg.dispenserTickInterval || 30;
    this.healTickTimer = (this.healTickTimer || 0) + 1;

    if (this.healTickTimer >= tickInterval) {
      this.healTickTimer = 0;
      const healPerTick = cfg.dispenserHealPerTick || 2;

      for (const target of this.tetheredTargets) {
        if (target.hp < target.maxHp) {
          target.hp = Math.min(target.maxHp, target.hp + healPerTick);
          spawnFloatingText(target.x, (target.y - (target.z || 0)) - target.r - 8, `+${healPerTick}`, '#00FF88');
          spawnSparks(target.x, target.y - (target.z || 0), 3, 'green');
        }
      }
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    // 1. Draw Tactical Healing Ring Radius (Ground Aura & Boundary Ring)
    drawDispenserHealingRing(ctx, this);

    // 2. Draw animated tether beams to all connected targets
    if (!this.isBuilding && this.tetheredTargets && this.tetheredTargets.length > 0) {
      for (const target of this.tetheredTargets) {
        drawDispenserTetherBeam(ctx, this.x, this.y, target.x, target.y - (target.z || 0), false);
      }
    }

    // Synergy Ammo Tether to nearby Sentry Turret
    if (!this.isBuilding && this.owner && this.owner.turretEntity && this.owner.turretEntity.hp > 0) {
      const turret = this.owner.turretEntity;
      const range = CONFIG.Engineer?.dispenserRange || 260;
      const dist = Math.hypot(turret.x - this.x, turret.y - this.y);
      if (dist <= range) {
        drawDispenserTetherBeam(ctx, this.x, this.y, turret.x, turret.y, true);
      }
    }

    // 2. Draw Dispenser cabinet & components
    drawDispenser(ctx, this);

    // 3. Draw smoke particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      for (const p of this.smokeParticles) {
        const alpha = Math.max(0, p.life / p.maxLife) * 0.75;
        ctx.fillStyle = `rgba(40, 40, 40, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Heal/repair visual effect
    if (this.healTimer > 0) {
      const t = this.healTimer / 20;
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.beginPath();
      ctx.arc(0, 0, this.r * (2.4 - t * 1.2), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 140, ${t * 0.75})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 140, ${t * 0.25})`;
      ctx.fill();

      ctx.restore();
    }

    this.drawHealth(ctx);
  }

  drawHealth(ctx) {
    if (this.hp <= 0 || this.isBuilding) return;
    const floatY = (this.y - (this.z || 0)) - this.r - 20;
    drawMinionHealthBar(ctx, this.x, floatY, 38, 6, this.hp, this.maxHp);
  }
}
