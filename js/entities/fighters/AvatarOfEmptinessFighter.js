// ─────────────────────────────────────────────
// Avatar of Emptiness Fighter Entity (Terraria: Wrath of the Gods)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { avatarOfEmptinessConfig } from '../../configs/characters/avatarOfEmptinessConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { playSound, playLoopingSound, stopLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawAvatarOfEmptinessSkin } from '../../graphics/fighters/avatarOfEmptinessSkin.js';
import {
  drawAvatarWeapon,
  drawUniversalAnnihilationCharge,
  drawUniversalAnnihilationBeam,
  drawCryonicZeroEffects,
  drawVisceralTorrentEffects,
  drawDarkPortalStrikes
} from '../../graphics/weapons/avatarOfEmptinessWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

function getAvatarSetting(config, key) {
  return config?.[key] ?? avatarOfEmptinessConfig[key];
}

export class AvatarOfEmptinessFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'avatarofemptiness';
    this.type = 'avatarofemptiness';
    this.name = 'Avatar of Emptiness';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    this.color = def?.color ?? getAvatarSetting(cfg, 'color');
    this.themeColor = def?.themeColor ?? getAvatarSetting(cfg, 'themeColor');
    this.secondaryColor = def?.secondaryColor ?? getAvatarSetting(cfg, 'secondaryColor');
    this.damageNumberColor = getAvatarSetting(cfg, 'color');

    this.hp = getAvatarSetting(cfg, 'hp');
    this.maxHp = getAvatarSetting(cfg, 'maxHp');
    this.speed = getAvatarSetting(cfg, 'speed');
    this.baseSpeed = getAvatarSetting(cfg, 'speed');
    this.r = getAvatarSetting(cfg, 'r') || 29;
    this.radius = this.r;
    this.usesCustomHands = true;
    this.hideHands = true;

    // Combat Stats & Timers
    this.damage = getAvatarSetting(cfg, 'damage');
    this.cooldown = getAvatarSetting(cfg, 'cooldown');

    // Skill Timers
    this.cryonicCooldown = 0;
    this.activeCryonicZones = [];

    this.visceralCooldown = 0;
    this.visceralActiveTimer = 0;
    this.visceralCastAngle = 0;

    this.portalCooldown = 0;
    this.activePortalStrikes = [];

    // Ultimate: Universal Annihilation
    this.annihilationCooldown = 0;
    this.annihilationWindupTimer = 0;
    this.annihilationWindupMax = getAvatarSetting(cfg, 'annihilationWindupFrames') || 50;
    this.annihilationFireTimer = 0;
    this.annihilationFireMax = getAvatarSetting(cfg, 'annihilationFireFrames') || 95;
    this.annihilationRecoveryTimer = 0;
    this.annihilationRecoveryMax = getAvatarSetting(cfg, 'annihilationRecoveryFrames') || 30;
    this.annihilationCastAngle = 0;
    this.annihilationDamageTick = getAvatarSetting(cfg, 'annihilationDamageTick') || 6;
    this.annihilationTickRate = getAvatarSetting(cfg, 'annihilationTickRate') || 4;
    this.annihilationBeamWidth = getAvatarSetting(cfg, 'annihilationBeamWidth') || 52;

    this.shootCooldown = 0;
  }

  // ─────────────────────────────────────────────
  // 360° Continuous Aiming Pipeline (Rule 1.4)
  // ─────────────────────────────────────────────
  canAim() {
    if (this.annihilationWindupTimer > 0 || this.annihilationFireTimer > 0 || this.annihilationRecoveryTimer > 0) {
      return false;
    }
    if (this.visceralActiveTimer > 0) {
      return false;
    }
    return super.canAim();
  }

  applyAim(opponent, targetAngle) {
    if (this.annihilationWindupTimer > 0 || this.annihilationFireTimer > 0 || this.annihilationRecoveryTimer > 0) {
      this.gunAngle = this.annihilationCastAngle;
      this.angle = this.annihilationCastAngle;
      return;
    }
    if (this.visceralActiveTimer > 0) {
      this.gunAngle = this.visceralCastAngle;
      this.angle = this.visceralCastAngle;
      return;
    }
    this.gunAngle = targetAngle;
    this.angle = targetAngle;
  }

  interruptAttacks() {
    if (typeof super.interruptAttacks === 'function') super.interruptAttacks();
    this.annihilationWindupTimer = 0;
    this.annihilationFireTimer = 0;
    this.annihilationRecoveryTimer = 0;
    this.visceralActiveTimer = 0;
    if (typeof stopLoopingSound === 'function') {
      stopLoopingSound('avatar_annihilation_loop');
    }
  }

  // ─────────────────────────────────────────────
  // Basic Attack: Antimatter Void Blasts
  // ─────────────────────────────────────────────
  shoot(opponent, targetAngle) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    if (!isSkillEnabled(cfg.enableVoidBlasts, true)) return;

    const blastCount = cfg.blastCount || 3;
    const spreadAngle = cfg.blastSpreadAngle || 0.35;
    const baseAngle = targetAngle ?? this.gunAngle ?? 0;
    const damage = cfg.blastDamage || 15;
    const speed = cfg.blastSpeed || 11.0;
    const homingStrength = cfg.blastHomingStrength || 0.065;

    for (let i = 0; i < blastCount; i++) {
      const angleOffset = blastCount === 1 ? 0 : (-spreadAngle / 2 + (i / (blastCount - 1)) * spreadAngle);
      const blastAngle = baseAngle + angleOffset;

      const p = {
        x: this.x + Math.cos(blastAngle) * (this.r * 1.2),
        y: this.y + Math.sin(blastAngle) * (this.r * 1.2),
        vx: Math.cos(blastAngle) * speed,
        vy: Math.sin(blastAngle) * speed,
        radius: cfg.blastRadius || 7,
        damage: damage,
        color: cfg.blastColor || '#9D4EDD',
        secondaryColor: '#00F5D4',
        owner: this,
        homing: true,
        homingStrength: homingStrength,
        target: opponent,
        life: cfg.blastLife || 140,
        isVoidBlast: true,
        update: function(arena, fighters) {
          this.life--;
          if (this.life <= 0) return false;

          // Smooth Homing
          if (this.target && this.target.hp > 0 && !this.target.dead) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const desiredAngle = Math.atan2(dy, dx);
            const curAngle = Math.atan2(this.vy, this.vx);
            let diff = desiredAngle - curAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const turn = Math.sign(diff) * Math.min(Math.abs(diff), this.homingStrength);
            const newAngle = curAngle + turn;
            const curSpd = Math.hypot(this.vx, this.vy);
            this.vx = Math.cos(newAngle) * curSpd;
            this.vy = Math.sin(newAngle) * curSpd;
          }

          this.x += this.vx;
          this.y += this.vy;
          return true;
        },
        draw: function(ctx) {
          ctx.save();
          ctx.fillStyle = '#06070B';
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cyan core highlight
          ctx.fillStyle = this.secondaryColor;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      if (typeof projectileSystem !== 'undefined' && projectileSystem.addCustomProjectile) {
        projectileSystem.addCustomProjectile(p);
      } else if (typeof state !== 'undefined' && Array.isArray(state.projectiles)) {
        state.projectiles.push(p);
      }
    }

    if (typeof playSound === 'function') {
      playSound('avatar_rift_shoot');
    }
    this.shootCooldown = this.cooldown || 34;
  }

  // ─────────────────────────────────────────────
  // Skill 1: Cryonic Absolute Zero (Frost Pulse)
  // ─────────────────────────────────────────────
  castCryonicZero(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    if (!isSkillEnabled(cfg.enableCryonicZero, true) || this.cryonicCooldown > 0) return;

    this.cryonicCooldown = cfg.cryonicCooldown || 360;
    const radius = cfg.cryonicRadius || 130;
    const damage = cfg.cryonicDamage || 30;

    // Erupt Cryonic Zone
    const columns = [];
    if (opponent && opponent.hp > 0) {
      for (let i = 0; i < 3; i++) {
        columns.push({
          x: opponent.x + (Math.random() - 0.5) * 60,
          y: opponent.y + (Math.random() - 0.5) * 60
        });
      }
    }

    this.activeCryonicZones.push({
      x: this.x,
      y: this.y,
      radius: radius,
      timer: cfg.cryonicDuration || 150,
      maxTimer: cfg.cryonicDuration || 150,
      columns: columns
    });

    // AOE Impact to surrounding enemies
    const targets = this.getValidTargets();
    for (const t of targets) {
      const dist = Math.hypot(t.x - this.x, t.y - this.y);
      if (dist <= radius) {
        applyDamageToTarget(t, damage, this);
        if (typeof t.applyHitStun === 'function') t.applyHitStun(20);
        if (t.vx !== undefined && t.vy !== undefined) {
          t.vx *= (1.0 - (cfg.cryonicChillSlowPct || 0.45));
          t.vy *= (1.0 - (cfg.cryonicChillSlowPct || 0.45));
        }
      }
    }

    if (typeof playSound === 'function') {
      playSound('avatar_frost_column_burst');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(4.5, 12);
    }
  }

  // ─────────────────────────────────────────────
  // Skill 2: Visceral Blood Torrent (Vortex Whirlpool)
  // ─────────────────────────────────────────────
  castVisceralTorrent(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    if (!isSkillEnabled(cfg.enableVisceralTorrent, true) || this.visceralCooldown > 0) return;

    const angle = opponent ? Math.atan2(opponent.y - this.y, opponent.x - this.x) : (this.gunAngle || 0);
    this.visceralCastAngle = angle;
    this.visceralActiveTimer = cfg.visceralDuration || 90;
    this.visceralCooldown = cfg.visceralCooldown || 390;

    const reach = cfg.visceralReach || 155;
    const arc = cfg.visceralArc || (Math.PI * 0.88);
    const damage = cfg.visceralDamage || 38;
    const knockback = cfg.visceralKnockback || 13.0;

    const targets = this.getValidTargets();
    for (const t of targets) {
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      const angleToTarget = Math.atan2(dy, dx);
      let angleDiff = angleToTarget - angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (dist <= reach && Math.abs(angleDiff) <= arc / 2) {
        applyDamageToTarget(t, damage, this);
        t.vx += Math.cos(angle) * knockback;
        t.vy += Math.sin(angle) * knockback;
        if (typeof t.applyHitStun === 'function') t.applyHitStun(16);
      }
    }

    if (typeof playSound === 'function') {
      playSound('avatar_reality_impact');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(5.5, 16);
    }
  }

  // ─────────────────────────────────────────────
  // Skill 3: Dark Dimension Portal Strikes
  // ─────────────────────────────────────────────
  castPortalStrikes(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    if (!isSkillEnabled(cfg.enablePortalStrikes, true) || this.portalCooldown > 0 || !opponent) return;

    this.portalCooldown = cfg.portalCooldown || 480;
    const strikeCount = cfg.portalStrikesCount || 4;
    const targetX = opponent.x;
    const targetY = opponent.y;

    for (let i = 0; i < strikeCount; i++) {
      const strikeAngle = (i * (Math.PI * 2 / strikeCount)) + (Math.random() - 0.5) * 0.4;
      const offsetDist = 55 + Math.random() * 20;

      this.activePortalStrikes.push({
        x: targetX + Math.cos(strikeAngle) * offsetDist,
        y: targetY + Math.sin(strikeAngle) * offsetDist,
        angle: strikeAngle + Math.PI,
        timer: 24,
        maxTimer: 24,
        delay: i * 12,
        damage: cfg.portalStrikeDamage || 12,
        hasStruck: false,
        target: opponent
      });
    }

    if (typeof playSound === 'function') {
      playSound('avatar_portal_hand_reach');
    }
  }

  // ─────────────────────────────────────────────
  // Ultimate: Universal Annihilation
  // ─────────────────────────────────────────────
  castUniversalAnnihilation(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;
    if (!isSkillEnabled(cfg.enableUniversalAnnihilation, true) || this.annihilationCooldown > 0) return;

    const angle = opponent ? Math.atan2(opponent.y - this.y, opponent.x - this.x) : (this.gunAngle || 0);
    this.annihilationCastAngle = angle;
    this.annihilationWindupTimer = this.annihilationWindupMax;
    this.annihilationFireTimer = 0;
    this.annihilationRecoveryTimer = 0;
    this.annihilationCooldown = cfg.annihilationCooldown || 880;

    if (typeof playSound === 'function') {
      playSound('avatar_annihilation_charge');
    }
  }

  getValidTargets() {
    const targets = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.fighters)) {
        for (const f of state.fighters) {
          if (f && f !== this && !this.isTeammate(f) && f.hp > 0 && !f.dead) {
            targets.push(f);
          }
        }
      }
      if (Array.isArray(state.illusions)) {
        for (const ill of state.illusions) {
          if (ill && ill.owner !== this && ill.hp > 0) {
            targets.push(ill);
          }
        }
      }
    }
    return targets;
  }

  update(opponent, ownerIndex, arena) {
    // Top-Level Freeze / TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.avatarofemptiness) ? CONFIG.avatarofemptiness : avatarOfEmptinessConfig;

    // Cooldown decrements
    if (this.cryonicCooldown > 0) this.cryonicCooldown--;
    if (this.visceralCooldown > 0) this.visceralCooldown--;
    if (this.visceralActiveTimer > 0) this.visceralActiveTimer--;
    if (this.portalCooldown > 0) this.portalCooldown--;
    if (this.annihilationCooldown > 0) this.annihilationCooldown--;

    // Update Cryonic Zones
    for (let i = this.activeCryonicZones.length - 1; i >= 0; i--) {
      const z = this.activeCryonicZones[i];
      z.timer--;
      if (z.timer <= 0) {
        this.activeCryonicZones.splice(i, 1);
      }
    }

    // Update Portal Strikes
    for (let i = this.activePortalStrikes.length - 1; i >= 0; i--) {
      const ps = this.activePortalStrikes[i];
      if (ps.delay > 0) {
        ps.delay--;
        continue;
      }
      ps.timer--;

      if (!ps.hasStruck && ps.timer <= 12) {
        ps.hasStruck = true;
        if (ps.target && ps.target.hp > 0 && !ps.target.dead) {
          applyDamageToTarget(ps.target, ps.damage, this);
          if (typeof ps.target.applyHitStun === 'function') ps.target.applyHitStun(12);
          if (typeof playSound === 'function') playSound('avatar_portal_pierce');
        }
      }

      if (ps.timer <= 0) {
        this.activePortalStrikes.splice(i, 1);
      }
    }

    // ─────────────────────────────────────────────
    // Universal Annihilation Channeling Loop
    // ─────────────────────────────────────────────
    if (this.annihilationWindupTimer > 0) {
      this.annihilationWindupTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.annihilationWindupTimer === 0) {
        this.annihilationFireTimer = this.annihilationFireMax;
        if (typeof playSound === 'function') playSound('avatar_annihilation_blast');
        if (typeof playLoopingSound === 'function') playLoopingSound('avatar_annihilation_loop');
      }
    } else if (this.annihilationFireTimer > 0) {
      this.annihilationFireTimer--;
      this.vx = -Math.cos(this.annihilationCastAngle) * (cfg.annihilationRecoil || 3.5);
      this.vy = -Math.sin(this.annihilationCastAngle) * (cfg.annihilationRecoil || 3.5);

      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(cfg.annihilationScreenShake || 7.0, 4);
      }

      // Continuous Beam Piercing Damage
      if (this.annihilationFireTimer % this.annihilationTickRate === 0) {
        const beamAngle = this.annihilationCastAngle;
        const beamLength = cfg.annihilationBeamLength || 1300;
        const halfWidth = (this.annihilationBeamWidth || 52) * 0.55;

        const targets = this.getValidTargets();
        for (const t of targets) {
          const dx = t.x - this.x;
          const dy = t.y - this.y;
          const projDist = dx * Math.cos(beamAngle) + dy * Math.sin(beamAngle);
          const perpDist = Math.abs(-dx * Math.sin(beamAngle) + dy * Math.cos(beamAngle));

          if (projDist > 0 && projDist <= beamLength && perpDist <= (halfWidth + t.radius)) {
            applyDamageToTarget(t, this.annihilationDamageTick, this);
            if (typeof t.applyHitStun === 'function') t.applyHitStun(8);
          }
        }
      }

      if (this.annihilationFireTimer === 0) {
        this.annihilationRecoveryTimer = this.annihilationRecoveryMax;
        if (typeof stopLoopingSound === 'function') stopLoopingSound('avatar_annihilation_loop');
        if (typeof playSound === 'function') playSound('avatar_reality_shatter');
      }
    } else if (this.annihilationRecoveryTimer > 0) {
      this.annihilationRecoveryTimer--;
      this.vx = 0;
      this.vy = 0;
    }

    // AI Combat Spacing & Decision Matrix
    const isChannelingAnnihilation = (this.annihilationWindupTimer > 0 || this.annihilationFireTimer > 0 || this.annihilationRecoveryTimer > 0);
    if (!isChannelingAnnihilation && opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);

      if (this.annihilationCooldown <= 0 && isSkillEnabled(cfg.enableUniversalAnnihilation, true)) {
        this.castUniversalAnnihilation(opponent);
      } else if (dist < 160 && this.visceralCooldown <= 0 && isSkillEnabled(cfg.enableVisceralTorrent, true)) {
        this.castVisceralTorrent(opponent);
      } else if (dist < 140 && this.cryonicCooldown <= 0 && isSkillEnabled(cfg.enableCryonicZero, true)) {
        this.castCryonicZero(opponent);
      } else if (dist > 160 && this.portalCooldown <= 0 && isSkillEnabled(cfg.enablePortalStrikes, true)) {
        this.castPortalStrikes(opponent);
      }
    }

    if (isChannelingAnnihilation) {
      this.shootCooldown = Math.max(this.shootCooldown || 0, 30);
      return;
    }

    // Centralized Movement & Physics (Rule 1.2)
    super.update(opponent, ownerIndex, arena);
  }

  draw(ctx) {
    // 1. Draw Active Cryonic Ground Zones & Portal Strikes in World Space
    drawCryonicZeroEffects(ctx, this.activeCryonicZones);
    drawDarkPortalStrikes(ctx, this.activePortalStrikes);

    // 2. Draw Body Skin & Weapon
    drawAvatarOfEmptinessSkin(ctx, this);
    drawAvatarWeapon(ctx, this);

    // 3. Draw Visceral Torrent Effects
    if (this.visceralActiveTimer > 0) {
      drawVisceralTorrentEffects(ctx, this);
    }

    // 4. Draw Universal Annihilation Beam (Fallback for standalone test runners)
    const isRenderGameActive = (typeof state !== 'undefined' && state.gameState && state.gameState !== 'test');
    if (!isRenderGameActive) {
      if (this.annihilationWindupTimer > 0) {
        drawUniversalAnnihilationCharge(ctx, this, this.annihilationCastAngle);
      } else if (this.annihilationFireTimer > 0) {
        drawUniversalAnnihilationBeam(ctx, this, this.annihilationCastAngle, (state && state.arena));
      }
    }

    this.drawHealth(ctx);
  }

  drawTopLayerBeams(ctx) {
    if (this.hp <= 0) return;
    if (this.annihilationWindupTimer > 0) {
      drawUniversalAnnihilationCharge(ctx, this, this.annihilationCastAngle);
    } else if (this.annihilationFireTimer > 0) {
      drawUniversalAnnihilationBeam(ctx, this, this.annihilationCastAngle, (state && state.arena));
    }
  }

  drawBody(ctx) {
    drawAvatarOfEmptinessSkin(ctx, this);
  }

  drawOutline(ctx) {}

  drawGun(ctx) {
    // Hand & weapon visuals handled in skin / weapon graphics
  }
}
