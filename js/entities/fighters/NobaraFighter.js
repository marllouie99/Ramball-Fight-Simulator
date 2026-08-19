// ─────────────────────────────────────────────
// Nobara Kugisaki — Straw Doll Sorcerer Entity
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SPEED_MULTIPLIER } from '../../core/modeConfig.js';
import { drawNobaraSkin } from '../../graphics/fighters/nobaraSkin.js';
import { drawEmbeddedNailsOnTarget } from '../../graphics/weapons/nobaraWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBlackFlash } from '../../graphics/particles/blackFlashEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class NobaraFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'nobara';
    this.type = 'nobara';
    this.color = '#D94E68'; // Deep Rose Crimson

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nobara) ? CONFIG.nobara : {};

    // Combat & Animation States
    this.punchAnimTimer = 0;
    this.punchMaxTime = 18;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 18;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.floatingNailCount = 3;
    this.combatAuraOpacity = 0.25;

    // Passive 1: Unflinching Ecstasy (Kōyō no Shinshō)
    this.isEcstasyActive = false;
    this.ecstasyAnnounced = false;

    // Passive 2: Embedded Nails Tracking
    this.activeTerrainNails = [];

    // Skill 1: Hairpin (Kanzashi)
    this.hairpinCooldownMax = cfg.hairpinCooldown || 330;
    this.hairpinCooldown = this.hairpinCooldownMax;
    this.isDetonatingHairpin = false;
    this.hairpinTimer = 0;

    // Skill 2: Straw Doll Technique: Resonance (Tomonari)
    this.resonanceCooldownMax = cfg.resonanceCooldown || 600;
    this.resonanceCooldown = this.resonanceCooldownMax;
    this.isResonating = false;
    this.resonanceTimer = 0;
    this.resonanceMaxTimer = cfg.resonanceChannelFrames || 45;
    this.resonanceTarget = null;

    // Ultimate: Black Flash & Supreme Resonance (Kokusen: Dai Tomonari)
    this.ultimateCooldownMax = cfg.ultimateCooldown || 1920;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.isBlitzing = false;
    this.blitzTimer = 0;
    this.blitzMaxTimer = cfg.ultimateDashDuration || 14;
    this.blackFlashAuraTimer = 0;
    this.blitzTarget = null;
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nobara) ? CONFIG.nobara : {};
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.floatingNailCount = 3;
    this.isEcstasyActive = false;
    this.ecstasyAnnounced = false;
    this.activeTerrainNails = [];
    this.hairpinCooldown = this.hairpinCooldownMax;
    this.resonanceCooldown = this.resonanceCooldownMax;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.isDetonatingHairpin = false;
    this.isResonating = false;
    this.isBlitzing = false;
    this.blackFlashAuraTimer = 0;
  }

  interruptAttacks() {
    this.isDetonatingHairpin = false;
    this.isResonating = false;
    this.isBlitzing = false;
    this.slashSwingTimer = 0;
    this.punchAnimTimer = 0;
  }

  update() {
    // 1. Mandatory Rule 1 Freeze / Ambush Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // 2. Passive: Unflinching Ecstasy State Check (<50% HP)
    const hpRatio = this.hp / (this.maxHp || 400);
    if (hpRatio <= 0.50) {
      if (!this.isEcstasyActive) {
        this.isEcstasyActive = true;
        if (!this.ecstasyAnnounced) {
          this.ecstasyAnnounced = true;
          spawnFloatingText(this.x, this.y - 30, 'ECSTASY!', '#FF4765');
          triggerGlobalScreenShake(3.0, 8);
        }
      }
    } else {
      this.isEcstasyActive = false;
    }

    // 3. Update Animation & Attack Timers
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.blackFlashAuraTimer > 0) this.blackFlashAuraTimer--;

    // 4. Update Skill Cooldowns
    if (this.hairpinCooldown > 0) this.hairpinCooldown--;
    if (this.resonanceCooldown > 0) this.resonanceCooldown--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;

    // 5. Standard Fighter Movement & Physics
    super.update();

    // 6. Melee Combat Check (Frontal Arc — Rule 7)
    this._updateMeleeCombat();
  }

  _updateMeleeCombat() {
    if (this.slashSwingTimer > 0 || this.hp <= 0) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nobara) ? CONFIG.nobara : {};
    const reach = cfg.hammerRange || 65;
    const arc = cfg.hammerArc || ((120 * Math.PI) / 180);
    const facing = this.gunAngle || this.angle || 0;

    // Query both fighters and illusions (Rule 6)
    const candidates = [];
    if (state.fighters) {
      for (let f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !this.isTeammate(f)) candidates.push(f);
      }
    }
    if (state.illusions) {
      for (let ill of state.illusions) {
        if (ill && ill.hp > 0 && ill.owner !== state.fighters?.indexOf(this)) candidates.push(ill);
      }
    }

    for (let target of candidates) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + (target.r || 25)) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          // Execute Hammer Cleave
          this.slashSwingTimer = this.slashSwingMaxTimer;
          const dmg = cfg.hammerDamage || 24;
          applyDamageToTarget(target, dmg, this);

          // Embed 2 nails (Rule 6 compliant)
          target.embeddedNails = Math.min(5, (target.embeddedNails || 0) + (cfg.hammerNailsEmbedded || 2));
          target.embeddedNailsTimer = cfg.nailDurationFrames || 480;

          // Impact sparks & knockback
          spawnSparks(target.x, target.y, 8, '#D94E68');
          spawnBloodEffect(target.x, target.y, 6);
          triggerGlobalScreenShake(2.5, 6);

          const pushForce = cfg.hammerKnockback || 18;
          target.vx = (target.vx || 0) + Math.cos(facing) * (pushForce * 0.4);
          target.vy = (target.vy || 0) + Math.sin(facing) * (pushForce * 0.4);
          break;
        }
      }
    }
  }

  draw(ctx) {
    // 1. Draw Embedded Nails on Enemies
    if (state.fighters) {
      for (let f of state.fighters) {
        if (f && f !== this && f.embeddedNails && f.embeddedNails > 0) {
          drawEmbeddedNailsOnTarget(ctx, f);
        }
      }
    }
    if (state.illusions) {
      for (let ill of state.illusions) {
        if (ill && ill.embeddedNails && ill.embeddedNails > 0) {
          drawEmbeddedNailsOnTarget(ctx, ill);
        }
      }
    }

    // 2. Draw Nobara Body, Hair, Uniform & Hammer
    drawNobaraSkin(ctx, this);

    // 3. Draw Health & Freeze Indicators
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
