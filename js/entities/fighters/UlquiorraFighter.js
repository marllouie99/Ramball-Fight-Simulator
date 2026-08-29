// ─────────────────────────────────────────────
// Ulquiorra Cifer — Cuatro Espada Fighter Entity
// Bleach: Arrancar / Hueco Mundo Arc
//
// Adhering strictly to:
// - Rule 1 (Freeze Guards & Time-Stop Early Exit)
// - Rule 3 (Aim Alignment on Teleport / Position Shifts)
// - Rule 5 & 6 (Target Freeze & Unified Illusion Queries)
// - Rule 7 (Frontal Arc Radius AOE for Melee Slashes)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 & 20 (Upright Faceless Skin & Hand Visibility)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawUlquiorraSkin, drawUlquiorraGhostSkin } from '../../graphics/fighters/ulquiorraSkin.js';
import { drawUlquiorraSlashArc } from '../../graphics/weapons/ulquiorraWeaponGraphics.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class UlquiorraFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ulquiorra';
    this.type = 'ulquiorra';
    this.color = '#00FF88'; // Emerald Green Reiatsu
    this.themeColor = '#00FF88';
    this.suppressSketchyOutline = true;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ulquiorra) ? CONFIG.ulquiorra : {};

    // ── Combat & Animation Timers ──
    this.swordCooldown = 0;
    this.swordCooldownMax = cfg.swordCooldown || 26;
    this.isSlashing = false;
    this.slashProgress = 0;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // ── Mid-Range Poke: Bala ──
    this.balaCooldown = 0;
    this.balaCooldownMax = cfg.balaCooldown || 150;
    this.isFiringBala = false;
    this.balaBurstRemaining = 0;
    this.balaBurstTimer = 0;

    // ── Skill 1: Sonído: Aceleración ──
    this.sonidoCooldown = 0;
    this.sonidoCooldownMax = cfg.sonidoCooldown || 300;
    this.isSonidoDashing = false;
    this.sonidoTimer = 0;
    this.sonidoMaxTimer = cfg.sonidoDashFrames || 5;
    this.sonidoCharges = 1;
    this.sonidoMaxCharges = 1;
    this.afterImages = [];

    // ── Skill 2: Cero & Cero Oscuras ──
    this.ceroCooldown = 0;
    this.ceroCooldownMax = cfg.ceroCooldown || 420;
    this.isChannelingCero = false;
    this.ceroChargeTimer = 0;
    this.ceroChargeMax = cfg.ceroChargeFrames || 22;
    this.isFiringCero = false;
    this.ceroFireTimer = 0;

    // ── Transformation States: Resurrección & Segunda Etapa ──
    this.stage1Active = false;
    this.stage1Used = false;
    this.segundaEtapaActive = false;
    this.segundaEtapaUsed = false;
    this.wingsActive = false;
    this.isChannelingLanza = false;
    this.lanzaChargeRatio = 0.0;

    // ── Passive 2: High-Speed Regeneration ──
    this.regenTimer = 0;
    this.regenInterval = cfg.regenInterval || 60;
    this.regenAmount = cfg.regenAmount || 6;

    this.combatAuraOpacity = 0.35;
  }

  _playSound(key, defaultSfx, defaultVol = 0.85) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (now - lastPlayed < 180) return;
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.ulquiorra?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.ulquiorra?.soundVolumes?.[key] ?? defaultVol;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfx, vol);
    }
  }

  takeDamage(amount, attacker = null, source = null) {
    // Passive 1: Hierro (15% Flat Damage Mitigation)
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ulquiorra) ? CONFIG.ulquiorra : {};
    const mitigation = cfg.hierroDamageReduction ?? 0.15;
    const actualDamage = Math.max(1, amount * (1.0 - mitigation));

    const result = super.takeDamage(actualDamage, attacker, source);

    // Passive 1: Faster Stun Recovery
    if (this.hitStunTimer > 0) {
      this.hitStunTimer = Math.max(0, Math.floor(this.hitStunTimer * 0.75));
    }

    return result;
  }

  update(opponent, ownerIndex, arenaObj) {
    // ── RULE 1: Freeze & Time-Stop Guard ──
    const isFrozen = (typeof this._handleTimeStop === 'function') ? this._handleTimeStop() : (this.timeStopTimer > 0);
    if (isFrozen || this.isTargetOfAmbush) {
      if (typeof this.interruptAttacks === 'function') this.interruptAttacks();
      return;
    }

    // ── Transformation Checks ──
    const maxHp = this.maxHp || 240;
    const hpRatio = this.hp / maxHp;

    // Stage 1: Murciélago (at <60% HP)
    if (!this.stage1Active && !this.stage1Used && hpRatio <= 0.60 && this.hp > 0) {
      this.stage1Active = true;
      this.stage1Used = true;
      this.wingsActive = true;
      this.sonidoMaxCharges = 2;
      this.sonidoCharges = 2;
      this.speed *= 1.35;
      this.moveSpeed *= 1.35;
      triggerGlobalScreenShake(6, 15);
      spawnFloatingText(this.x, this.y - 35, 'ENCLOSE, MURCIÉLAGO!', '#00FF88', 22);
    }

    // Stage 2: Segunda Etapa (at <30% HP)
    if (this.stage1Active && !this.segundaEtapaActive && !this.segundaEtapaUsed && hpRatio <= 0.30 && this.hp > 0) {
      this.segundaEtapaActive = true;
      this.segundaEtapaUsed = true;
      this.speed *= 1.15;
      this.moveSpeed *= 1.15;
      triggerGlobalScreenShake(10, 25);
      spawnFloatingText(this.x, this.y - 45, 'RESURRECCIÓN: SEGUNDA ETAPA!', '#00FF88', 26);
    }

    // ── Passive 2: High-Speed Regeneration ──
    if (this.hp > 0 && this.hp < maxHp) {
      this.regenTimer++;
      if (this.regenTimer >= this.regenInterval) {
        this.regenTimer = 0;
        this.hp = Math.min(maxHp, this.hp + this.regenAmount);
        spawnFloatingText(this.x, this.y - 20, `+${this.regenAmount}`, '#00FF88', 14);
      }
    }

    // ── Decrement Cooldowns ──
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.balaCooldown > 0) this.balaCooldown--;
    if (this.sonidoCooldown > 0) this.sonidoCooldown--;
    if (this.ceroCooldown > 0) this.ceroCooldown--;

    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      this.slashProgress = 1.0 - (this.slashSwingTimer / this.slashSwingMaxTimer);
      if (this.slashSwingTimer === 0) {
        this.isSlashing = false;
      }
    }

    // ── Update Afterimages ──
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].alpha -= 0.08;
        if (this.afterImages[i].alpha <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // ── Standard Combat & Melee ──
    super.update(opponent, ownerIndex, arenaObj);
    this._updateMeleeCombat(opponent);
  }

  _updateMeleeCombat(opponent) {
    if (!opponent || opponent.hp <= 0 || this.hp <= 0) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Frontal Arc Melee Slash (Rule 7)
    if (dist <= 75 && this.swordCooldown <= 0 && !this.isSlashing) {
      this.swordCooldown = this.swordCooldownMax;
      this.isSlashing = true;
      this.slashSwingTimer = this.slashSwingMaxTimer;
      this.slashProgress = 0;

      // Query all enemies & illusions within blade reach & arc (Rule 6 & 7)
      const allTargets = [];
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f && f !== this && f.hp > 0 && !f.isDead && !f.isInvulnerable) {
            allTargets.push(f);
          }
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (ill && ill.owner !== this && ill.hp > 0 && !ill.isDead) {
            allTargets.push(ill);
          }
        });
      }

      const facingAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      const reach = 78;
      const arc = (130 * Math.PI) / 180; // 130 degrees

      allTargets.forEach(target => {
        const tdx = target.x - this.x;
        const tdy = target.y - this.y;
        const tdist = Math.hypot(tdx, tdy);
        if (tdist <= reach) {
          const targetAngle = Math.atan2(tdy, tdx);
          let angleDiff = targetAngle - facingAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) <= arc / 2) {
            const isOscuras = this.stage1Active || this.segundaEtapaActive;
            const dmg = isOscuras ? 32 : 22;
            applyDamageToTarget(target, dmg, this, 'melee');

            // Knockback push
            const kx = Math.cos(targetAngle) * 8.5;
            const ky = Math.sin(targetAngle) * 8.5;
            target.knockbackVx = (target.knockbackVx || 0) + kx;
            target.knockbackVy = (target.knockbackVy || 0) + ky;

            spawnBloodEffect(target.x, target.y, 10);
            spawnSparks(target.x, target.y, 12, '#00FF88', '#FFFFFF');
          }
        }
      });
    }
  }

  draw(ctx, opponent) {
    // 1. Draw Sonído Ghost Afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      this.afterImages.forEach(img => {
        drawUlquiorraGhostSkin(ctx, img.x, img.y, img.angle, this.r, img.alpha, this.segundaEtapaActive);
      });
    }

    // 2. Draw Ulquiorra Skin & Upright Body Model
    drawUlquiorraSkin(ctx, this);

    // 3. Draw Slash Arc if swinging
    if (this.isSlashing && this.slashSwingTimer > 0) {
      const facingAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      drawUlquiorraSlashArc(ctx, this.x, this.y, facingAngle, this.r + 35, this.slashProgress, this.segundaEtapaActive || this.stage1Active);
    }

    // 4. Draw Health & Freeze Indicators
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
