// ─────────────────────────────────────────────
// Uryu Ishida Fighter Entity (The Last Quincy)
// Bleach: Thousand-Year Blood War
// Adhering to Rule 1 (Freeze Guards), Rule 3 (Aim Alignment),
// Rule 5 & 6 (Combat Freezes & Illusion Queries),
// Rule 7 (Frontal Arc Melee), and Rule 18 (HUD Consistency).
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawUryuSkin } from '../../graphics/fighters/uryuSkin.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';

export class UryuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'uryu';
    this.type = 'uryu';
    this.color = '#00E5FF'; // Quincy Cyan
    this.suppressSketchyOutline = true; // Use clean solid dark outline from skin renderer

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.uryu) ? CONFIG.uryu : {};

    // Basic Attack & Animation States
    this.shootAnimTimer = 0;
    this.shootMaxTimer = 18;
    this.shootCooldown = 15;
    this.shootCooldownMax = cfg.shootCooldown || 34;
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.smoothDrawProgress = 0;
    this.stringRecoilTimer = 0;
    this.stringRecoilMax = 6;

    // Melee Intercept: Seele Schneider
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 18;
    this.seeleCooldown = 0;
    this.seeleCooldownMax = cfg.seeleCooldown || 32;

    // Skill 1: Hirenkyaku (Glide Step) & Licht Regen
    this.hirenkyakuCooldown = 0;
    this.hirenkyakuCooldownMax = cfg.hirenkyakuCooldown || 360;
    this.isHirenkyakuDashing = false;
    this.hirenkyakuTimer = 0;
    this.hirenkyakuMaxTimer = cfg.hirenkyakuDashFrames || 5;
    this.afterImages = [];

    // Skill 2: Gintō Sprenger (Pentagram Trap)
    this.sprengerCooldown = 0;
    this.sprengerCooldownMax = cfg.sprengerCooldown || 480;
    this.isDeployingSprenger = false;
    this.sprengerTimer = 0;

    // Passive: Reishi Sklaverei Gauge
    this.reishiGauge = 0;
    this.reishiMaxGauge = 100;
    this.isPiercingLightActive = false;
    this.piercingLightTimer = 0;

    // Passive: Ransōtengai (Heavenly Wild Puppet Suit)
    this.ransotengaiActive = false;
    this.ransotengaiTimer = 0;
    this.ransotengaiUsed = false;

    // Ultimate: Vollständig & Schrift "A" The Antithesis
    this.ultimateCooldown = cfg.ultimateCooldown || 1200;
    this.vollstandigActive = false;
    this.vollstandigTimer = 0;
    this.antithesisUsed = false;

    this.combatAuraOpacity = 0.35;
    this.hideFrontHand = false;
    this.hideBackHand = false;
  }

  _playSound(key, defaultSfx, defaultVol = 0.85) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (now - lastPlayed < 180) return;
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.uryu?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.uryu?.soundVolumes?.[key] ?? defaultVol;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfx, vol);
    }
  }

  reset() {
    super.reset();
    this.shootAnimTimer = 0;
    this.shootCooldownTimer = 0;
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.slashSwingTimer = 0;
    this.seeleCooldown = 0;
    this.hirenkyakuCooldown = 0;
    this.isHirenkyakuDashing = false;
    this.hirenkyakuTimer = 0;
    this.afterImages = [];
    this.sprengerCooldown = 0;
    this.reishiGauge = 0;
    this.isPiercingLightActive = false;
    this.ransotengaiActive = false;
    this.ransotengaiUsed = false;
    this.vollstandigActive = false;
    this.antithesisUsed = false;
  }

  interruptAttacks() {
    this.isShooting = false;
    this.isDrawingBow = false;
    this.burstRemaining = 0;
    this.isDeployingSprenger = false;
    this.slashSwingTimer = 0;
  }

  _findNearestEnemy() {
    if (typeof state === 'undefined') return null;
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    let nearest = null;
    let minDist = Infinity;

    for (let i = 0; i < allTargets.length; i++) {
      const t = allTargets[i];
      if (!t || t === this || t.hp <= 0 || t.isDead || t.invulnerable) continue;
      // Exclude teammates
      if (typeof state.getFighterTeam === 'function') {
        const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
        const theirTeam = state.getFighterTeam(state.fighters.indexOf(t));
        if (myTeam !== null && myTeam === theirTeam) continue;
      }
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = t;
      }
    }
    return nearest;
  }

  update(arena, opponent, ownerIndex) {
    // 1. Mandatory Rule 1 Freeze & Ambush Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // Decay custom timers
    if (this.stringRecoilTimer > 0) this.stringRecoilTimer--;
    if (this.shootAnimTimer > 0) {
      this.shootAnimTimer--;
      if (this.shootAnimTimer <= 0 && this.burstRemaining <= 0) {
        this.isDrawingBow = false;
        this.isShooting = false;
      }
    }

    // Smooth Draw Progress Lerp for buttery archery animations
    let targetDraw = 0;
    if (this.burstRemaining > 0 || this.isDrawingBow || this.shootAnimTimer > 0) {
      targetDraw = 1.0;
    }
    this.smoothDrawProgress += (targetDraw - this.smoothDrawProgress) * 0.28;

    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.seeleCooldown > 0) this.seeleCooldown--;
    if (this.hirenkyakuCooldown > 0) this.hirenkyakuCooldown--;
    if (this.sprengerCooldown > 0) this.sprengerCooldown--;

    // Passive 2: Ransōtengai Check (<30% HP)
    if (!this.ransotengaiUsed && (this.hp / (this.maxHp || 230)) <= 0.30) {
      this.ransotengaiActive = true;
      this.ransotengaiTimer = 360; // 6 seconds
      this.ransotengaiUsed = true;
      spawnFloatingText(this.x, this.y - 30, 'RANSŌTENGAI!', '#00E5FF');
      this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/teleport.mp3', 1.0);
    }

    if (this.ransotengaiActive) {
      this.ransotengaiTimer--;
      if (this.ransotengaiTimer <= 0) {
        this.ransotengaiActive = false;
      }
    }

    // Update Afterimages for Hirenkyaku
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        const ai = this.afterImages[i];
        ai.timer--;
        if (ai.timer <= 0) this.afterImages.splice(i, 1);
      }
    }

    // Process Active Bow Burst Volley
    if (this.burstRemaining > 0) {
      this.burstTimer--;
      if (this.burstTimer <= 0) {
        const target = this._findNearestEnemy() || opponent;
        if (target) this.aim(target);
        this._fireHeiligPfeilArrow(target || opponent, ownerIndex);
        this.burstRemaining--;
        this.burstTimer = 5;
      }
    }

    super.update(arena, opponent, ownerIndex);
  }

  /**
   * Overrides base Fighter.shoot() method to trigger Uryu's basic attacks.
   */
  shoot(ownerIndex) {
    if (this.hp <= 0) return;
    const isParalyzed = (this.paralyzeTimer && this.paralyzeTimer > 0) || this.isParalyzed;
    if (isParalyzed || this.isCaughtInBeam() || this.isTargetOfAmbush) return;

    const target = this._findNearestEnemy();
    if (!target) return;

    this.aim(target);
    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // Close-quarters melee intercept vs ranged bow attack:
    if (dist <= 75 && this.seeleCooldown <= 0) {
      this._executeSeeleSchneider(target);
    } else if (this.burstRemaining <= 0) {
      this._initiateBowVolley(target, ownerIndex);
    }
  }

  _executeSeeleSchneider(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.seeleCooldown = this.seeleCooldownMax;
    this._playSound('seeleSlice', 'Assets/Sound Effects/Attacks/knife_slash.mp3', 0.85);

    // Frontal Arc Cone Multi-Target Melee (Rule 7)
    const reach = CONFIG.uryu?.seeleRange || 75;
    const arc = ((CONFIG.uryu?.seeleArc || 130) * Math.PI) / 180;
    const aimAngle = this.gunAngle || 0;

    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let i = 0; i < allTargets.length; i++) {
      const t = allTargets[i];
      if (!t || t === this || t.hp <= 0 || t.isDead || t.invulnerable) continue;
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= reach + (t.r || 25)) {
        const angleToTarget = Math.atan2(t.y - this.y, t.x - this.x);
        let diff = angleToTarget - aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          const dmg = CONFIG.uryu?.seeleDamage || 16;
          applyDamageToTarget(t, dmg, this);
          spawnImpactFlash(t.x, t.y, '#00E5FF');
          spawnSparks(t.x, t.y, '#FFFFFF', 6);

          // Push target away to restore archery spacing
          const pushForce = CONFIG.uryu?.seeleKnockback || 9.5;
          t.vx += Math.cos(angleToTarget) * pushForce;
          t.vy += Math.sin(angleToTarget) * pushForce;
        }
      }
    }
  }

  _initiateBowVolley(target, ownerIndex) {
    this.isShooting = true;
    this.isDrawingBow = true;
    this.shootAnimTimer = this.shootMaxTimer;
    this.burstRemaining = CONFIG.uryu?.burstCount || 3;
    this.burstTimer = 2; // Initial draw latency before first arrow
    this._curOwnerIndex = ownerIndex;
    this._playSound('bowDraw', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.65);
  }

  _fireHeiligPfeilArrow(target, ownerIndex) {
    const angle = this.gunAngle || 0;
    const spawnDist = this.r + 14;
    const startX = this.x + Math.cos(angle) * spawnDist;
    const startY = this.y + Math.sin(angle) * spawnDist;

    const arrowSpeed = CONFIG.uryu?.arrowSpeed || 24;
    const arrowDmg = CONFIG.uryu?.arrowDamage || 18;
    const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0)
      ? ownerIndex
      : (typeof this._curOwnerIndex === 'number' ? this._curOwnerIndex : (state.fighters ? state.fighters.indexOf(this) : 0));

    this._playSound('bowShoot', 'Assets/Sound Effects/Attacks/knife_slash.mp3', 0.8);
    this.stringRecoilTimer = this.stringRecoilMax;

    if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.fireProjectile === 'function') {
      const p = projectileSystem.fireProjectile(
        this,
        resolvedOwner,
        arrowDmg,
        false,
        arrowSpeed,
        false,
        'heiligPfeil',
        startX,
        startY,
        angle
      );
      if (p) {
        p.isHeiligPfeil = true;
        p.color = '#00E5FF';
        p.isPiercing = Boolean(this.isPiercingLightActive);
      }
    }

    // Spark burst at arrow tip
    spawnSparks(startX, startY, '#00E5FF', 3);
  }

  draw(ctx, opponent) {
    drawUryuSkin(ctx, this);
  }
}
