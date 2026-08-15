// ─────────────────────────────────────────────
// MAHITO FIGHTER — Cursed Spirit of Human Hatred
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawMahitoSkin } from '../../graphics/fighters/mahitoSkin.js';
import { spawnMeleeClashShockwave, spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class MahitoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'mahito';
    this.type = 'mahito';

    // Core combat state
    this.isMeleeFighter = true;
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.mahito?.punchSpeed || 16;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Transformation: Instant Spirit Body of Distorted Killing (ISBoDK)
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = 0;
    this.hasTransformed = false;

    // Soul Disfigurement Stacks
    this.soulStacks = new Map(); // target -> stack count
  }

  /**
   * Triggers Instant Spirit Body of Distorted Killing transformation.
   */
  activateDistortedKilling() {
    if (this.isTransformed) return;
    this.isTransformed = true;
    this.isDistortedKilling = true;
    this.transformDuration = CONFIG.mahito?.transformation?.duration || 600;

    spawnFloatingText(this.x, this.y - this.r - 28, "INSTANT SPIRIT BODY!", "#00E5FF");
    spawnImpactFlash(this.x, this.y, 60, 'rgba(0, 229, 255, 0.9)');
    triggerGlobalScreenShake(8);
    audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.5);
  }

  /**
   * Reverts Instant Spirit Body of Distorted Killing back to base form.
   */
  revertTransformation() {
    if (!this.isTransformed) return;
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;

    spawnFloatingText(this.x, this.y - this.r - 28, "FORM REVERTED", "#7B9EAF");
    spawnImpactFlash(this.x, this.y, 40, 'rgba(123, 158, 175, 0.7)');
  }

  /**
   * Custom damage mitigation handling (Passive: Soul Durability).
   */
  takeDamage(amount, source) {
    if (amount <= 0) return;

    let finalDamage = amount;

    // Check if source deals "Soul" damage (e.g. Toji with Split Soul Katana or Yuji)
    const isSoulDamage = source && (
      source.characterId === 'toji' || source.type === 'toji' ||
      source.characterId === 'yuji' || source.type === 'yuji' ||
      source.hasSoulStrikes
    );

    if (this.isTransformed) {
      // Transformed defense bonus
      const defenseMult = CONFIG.mahito?.transformation?.defenseMultiplier ?? 0.50;
      finalDamage *= defenseMult;
    } else if (!isSoulDamage) {
      // Base soul durability mitigation
      const reduction = CONFIG.mahito?.soulDurabilityReduction ?? 0.25;
      finalDamage *= (1 - reduction);
    }

    super.takeDamage(finalDamage, source);

    // Auto-trigger transformation when low HP in combat (under 35% HP) if available
    if (!this.hasTransformed && (this.hp / this.maxHp) <= 0.35 && !this.isTransformed) {
      this.hasTransformed = true;
      this.activateDistortedKilling();
    }
  }

  update(arena, targets, opponent) {
    // ── 1. RULE #1: Freeze / TimeStop Early Exit Guard ──
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    super.update(arena, targets, opponent);

    // Update punch animation timer
    if (this.punchAnimTimer > 0) {
      this.punchAnimTimer--;
    }

    // Update Transformation duration & cooldown
    if (this.isTransformed) {
      if (this.transformDuration > 0) {
        this.transformDuration--;
        if (this.transformDuration <= 0) {
          this.revertTransformation();
        }
      }
    } else if (this.transformCooldown > 0) {
      this.transformCooldown--;
    }

    // AI Drive Melee Combat
    if (!this.playerControlled && targets && targets.length > 0) {
      const target = targets[0];
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.mahito?.punchRange || 65;
        const maxReach = this.r + target.r + reach;

        if (dist <= maxReach && (this.cooldownTimer || 0) <= 0) {
          this.executeIdleTransfigurationStrike(target);
        }
      }
    }
  }

  /**
   * Executes Idle Transfiguration Punch / Blade Swing adhering to Rule #7 & #8 Frontal Arc standard.
   */
  executeIdleTransfigurationStrike(target) {
    this.punchAnimTimer = this.punchMaxTime;
    this.isRightPunch = !this.isRightPunch;
    this.cooldownTimer = CONFIG.mahito?.basicPunchCooldown || 22;

    const facingAngle = this.gunAngle || this.angle || 0;
    const reach = CONFIG.mahito?.punchRange || 65;
    const maxReach = this.r + reach + 20;
    const arcAngle = (130 * Math.PI) / 180; // 130° frontal arc

    let baseDamage = (CONFIG.mahito?.damage || 16);
    if (this.isTransformed) {
      const damageMult = CONFIG.mahito?.transformation?.damageMultiplier ?? 1.60;
      baseDamage *= damageMult;
    }

    // Query both fighters and illusions (Rule #6)
    const validTargets = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (f && f !== this && f.hp > 0 && f.team !== this.team) validTargets.push(f);
        }
      }
      if (state.illusions) {
        for (let i = 0; i < state.illusions.length; i++) {
          const ill = state.illusions[i];
          if (ill && ill.hp > 0 && ill.team !== this.team) validTargets.push(ill);
        }
      }
    }

    let hitAny = false;
    for (let i = 0; i < validTargets.length; i++) {
      const ent = validTargets[i];
      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= maxReach + ent.r) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - facingAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= arcAngle / 2) {
          hitAny = true;

          // Apply damage
          applyDamageToTarget(ent, baseDamage, this);

          // Physical knockback
          const kbForce = this.isTransformed ? 12 : 7;
          const kx = Math.cos(targetAngle) * kbForce;
          const ky = Math.sin(targetAngle) * kbForce;
          ent.vx = (ent.vx || 0) + kx;
          ent.vy = (ent.vy || 0) + ky;

          // Apply hit pause to target ONLY (Rule #5)
          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(6);
          }

          // Sparks & Impact effects
          const impactX = (this.x + ent.x) / 2;
          const impactY = (this.y + ent.y) / 2;
          spawnSparks(impactX, impactY, this.isTransformed ? '#00E5FF' : '#7B9EAF', 8);
          spawnMeleeClashShockwave(impactX, impactY, this.isTransformed ? 35 : 24, this.isTransformed ? '#00E5FF' : '#00A8CC');
        }
      }
    }

    if (hitAny) {
      triggerGlobalScreenShake(this.isTransformed ? 6 : 3);
      audioSystem.playSFX(CONFIG.mahito?.punchSound || 'Assets/Sound Effects/Attacks/punch.mp3', 1.8);
    }
  }

  shoot() {
    // Manual player shoot trigger
    if ((this.cooldownTimer || 0) > 0) return;
    this.executeIdleTransfigurationStrike();
  }

  draw(ctx) {
    if (this.hp <= 0) return;
    drawMahitoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
