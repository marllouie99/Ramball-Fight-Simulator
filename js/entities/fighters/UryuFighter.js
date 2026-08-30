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
    this.shootCooldown = 15;
    this.shootCooldownMax = cfg.shootCooldown || 34;
    this.burstRemaining = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.drawPhase = 'IDLE'; // 'IDLE' | 'DRAWING' | 'RECOIL'
    this.arrowDrawTimer = 0;
    this.arrowDrawDuration = 11;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.recoilHoldTimer = 0;
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

    // Passive 1: Reishi Sklaverei Gauge
    this.reishiGauge = 0;
    this.reishiMaxGauge = cfg.reishiMaxGauge || 100;
    this.isPiercingLightActive = false;
    this.piercingLightTimer = 0;
    this.piercingLightMax = cfg.piercingLightDuration || 360;

    // Passive 2: Ransōtengai (Heavenly Wild Puppet Suit)
    this.ransotengaiActive = false;
    this.ransotengaiTimer = 0;
    this.ransotengaiMaxTimer = cfg.ransotengaiDuration || 360;
    this.ransotengaiCooldown = 0;
    this.ransotengaiCooldownMax = cfg.ransotengaiCooldown || 1200;

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
    this.shootCooldown = 15;
    this.burstRemaining = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.drawPhase = 'IDLE';
    this.arrowDrawTimer = 0;
    this.arrowDrawDuration = 11;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.recoilHoldTimer = 0;
    this.stringRecoilTimer = 0;
    this.slashSwingTimer = 0;
    this.seeleCooldown = 0;
    this.hirenkyakuCooldown = 0;
    this.isHirenkyakuDashing = false;
    this.hirenkyakuTimer = 0;
    this.afterImages = [];
    this.sprengerCooldown = 0;
    this.reishiGauge = 0;
    this.isPiercingLightActive = false;
    this.piercingLightTimer = 0;
    this.ransotengaiActive = false;
    this.ransotengaiTimer = 0;
    this.ransotengaiCooldown = 0;
    this.vollstandigActive = false;
    this.antithesisUsed = false;
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.isShooting = false;
    this.isDrawingBow = false;
    this.burstRemaining = 0;
    this.drawPhase = 'IDLE';
    this.arrowDrawTimer = 0;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.isDeployingSprenger = false;
    if (this.afterImages) this.afterImages.length = 0;
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    if (forceCancelAll || (!isMatchEnded && (this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush))) {
      this.slashSwingTimer = 0;
    }
  }

  /**
   * Demo attack trigger for character selection / weapon preview.
   */
  triggerDemoAttack() {
    this._initiateBowVolley(null, 0);
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

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1 Freeze & Ambush Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // Decay custom animation and attack timers
    if (this.stringRecoilTimer > 0) this.stringRecoilTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.seeleCooldown > 0) this.seeleCooldown--;
    if (this.hirenkyakuCooldown > 0) this.hirenkyakuCooldown--;
    if (this.sprengerCooldown > 0) this.sprengerCooldown--;

    // ── ACTIVE BOW SHOOTING & ARROW PULL-BACK CYCLE ──
    if (this.isShooting && this.burstRemaining > 0) {
      const target = this._findNearestEnemy() || opponent;
      if (target) this.aim(target);

      if (this.drawPhase === 'DRAWING') {
        this.isDrawingBow = true;
        this.arrowDrawTimer++;
        const t = Math.min(1.0, this.arrowDrawTimer / this.arrowDrawDuration);
        // Smooth cinematic pull-back easing (accelerating tension curve)
        this.arrowDrawProgress = Math.sin(t * Math.PI * 0.5);

        // Subtle Reishi gathering spark during draw
        if (Math.random() < 0.25 && typeof spawnSparks === 'function') {
          const angle = this.gunAngle || 0;
          const sx = this.x + Math.cos(angle) * (this.r + 10) + (Math.random() - 0.5) * 12;
          const sy = this.y + Math.sin(angle) * (this.r + 10) + (Math.random() - 0.5) * 12;
          spawnSparks(sx, sy, '#00E5FF', 1);
        }

        if (this.arrowDrawTimer >= this.arrowDrawDuration) {
          // Maximum tension reached: RELEASE ARROW!
          this._fireHeiligPfeilArrow(target || opponent, ownerIndex);
          this.burstRemaining--;
          this.drawPhase = 'RECOIL';
          this.recoilHoldTimer = 5;
          this.arrowDrawProgress = 0;
          this.stringRecoilTimer = this.stringRecoilMax;
        }
      } else if (this.drawPhase === 'RECOIL') {
        this.recoilHoldTimer--;
        this.arrowDrawProgress = 0;
        if (this.recoilHoldTimer <= 0) {
          if (this.burstRemaining > 0) {
            // Rapid-fire subsequent arrow draw in volley
            this.drawPhase = 'DRAWING';
            this.arrowDrawTimer = 0;
            const drawSpeedMult = this.isPiercingLightActive ? 0.70 : 1.0;
            this.arrowDrawDuration = Math.max(6, Math.round(10 * drawSpeedMult));
            this.arrowDrawProgress = 0;
            this._playSound('bowDraw', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.50);
          } else {
            // Volley finished
            this.drawPhase = 'IDLE';
            this.isShooting = false;
            this.isDrawingBow = false;
            this.shootCooldown = this.shootCooldownMax;
          }
        }
      }
    } else {
      this.arrowDrawProgress = 0;
      this.drawPhase = 'IDLE';
      this.isShooting = false;
      this.isDrawingBow = false;
    }

    // Direct, responsive Draw Progress tracking during draw phase
    if (this.isShooting && this.drawPhase === 'DRAWING') {
      this.smoothDrawProgress = this.arrowDrawProgress;
    } else {
      this.smoothDrawProgress += (0 - this.smoothDrawProgress) * 0.40;
    }

    // ── PASSIVE 2: RANSŌTENGAI (HEAVENLY WILD PUPPET SUIT) ──
    if (this.ransotengaiCooldown > 0) this.ransotengaiCooldown--;

    const hpRatio = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1.0;
    const isHeavyCC = (this.hitStunTimer > 15 || this.electricStunTimer > 15 || (this.paralyzeTimer && this.paralyzeTimer > 15));
    const shouldTriggerPuppet = !this.ransotengaiActive && this.ransotengaiCooldown <= 0 && (hpRatio <= (CONFIG.uryu?.ransotengaiHpThreshold || 0.30) || isHeavyCC);

    if (shouldTriggerPuppet) {
      this.ransotengaiActive = true;
      this.ransotengaiTimer = this.ransotengaiMaxTimer;
      this.ransotengaiCooldown = this.ransotengaiCooldownMax;
      // Instantly purge crowd control
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      if (this.paralyzeTimer) this.paralyzeTimer = 0;
      spawnFloatingText(this.x, this.y - 35, 'RANSŌTENGAI!', '#00E5FF');
      spawnImpactFlash(this.x, this.y, '#00E5FF');
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x, this.y, 10, 'cyan', '#00E5FF');
        spawnSparks(this.x, this.y, 6, 'silverStreak', '#FFFFFF');
      }
      this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/dash1.mp3', 1.0);
    }

    if (this.ransotengaiActive) {
      this.ransotengaiTimer--;
      if (this.ransotengaiTimer <= 0) {
        this.ransotengaiActive = false;
        this.speedMultiplier = 1.0;
      } else {
        // Ongoing puppet stasis: immunity to flinch & stuns
        this.hitStunTimer = 0;
        this.electricStunTimer = 0;
        if (this.paralyzeTimer) this.paralyzeTimer = 0;
        // Controlled +30% movement speed boost (safe, non-exponential)
        this.speedMultiplier = 1.30;
      }
    }

    // ── PASSIVE 1: REISHI ABSORPTION & SKLAVEREI GAUGE ──
    if (this.isPiercingLightActive) {
      this.piercingLightTimer--;
      if (this.piercingLightTimer <= 0) {
        this.isPiercingLightActive = false;
        this.reishiGauge = 0;
      }
      // Accelerated bow cooldowns during Piercing Light (-40% draw delay)
      if (this.shootCooldown > 0) {
        this.shootCooldown = Math.max(0, this.shootCooldown - 1);
      }
    } else {
      // 1. Natural ambient battlefield Reishi siphon
      this.reishiGauge = Math.min(100, this.reishiGauge + 0.10);

      // 2. Siphon Reishi from nearby enemy projectiles within 190px
      if (state && state.projectiles && state.projectiles.length > 0) {
        const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0) ? ownerIndex : (state.fighters ? state.fighters.indexOf(this) : -1);
        for (let i = 0; i < state.projectiles.length; i++) {
          const p = state.projectiles[i];
          if (!p || p.owner === resolvedOwner) continue;
          if (typeof state.getFighterTeam === 'function' && resolvedOwner >= 0) {
            const myTeam = state.getFighterTeam(resolvedOwner);
            const theirTeam = state.getFighterTeam(p.owner);
            if (myTeam !== null && myTeam === theirTeam) continue;
          }
          const dist = Math.hypot(p.x - this.x, p.y - this.y);
          if (dist <= 190) {
            const gain = CONFIG.uryu?.siphonProjectileGain || 0.85;
            this.reishiGauge = Math.min(100, this.reishiGauge + gain);
            if (Math.random() < 0.10 && typeof spawnSparks === 'function') {
              spawnSparks(p.x, p.y, 2, 'cyan', '#00E5FF');
            }
          }
        }
      }

      // 3. Siphon Reishi from active enemy domains (Malevolent Shrine, Unlimited Void, etc.)
      if (state && state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0) continue;
          if (f.domainActive || f.isDomainActive || f.domainRadius > 0) {
            const gain = CONFIG.uryu?.siphonDomainGain || 0.65;
            this.reishiGauge = Math.min(100, this.reishiGauge + gain);
          }
        }
      }

      // 4. Threshold trigger: 100% Reishi Gauge -> Piercing Light
      if (this.reishiGauge >= 100) {
        this.reishiGauge = 100;
        this.isPiercingLightActive = true;
        this.piercingLightTimer = this.piercingLightMax;
        spawnFloatingText(this.x, this.y - 32, 'PIERCING LIGHT!', '#00E5FF');
        spawnImpactFlash(this.x, this.y, '#00E5FF');
        if (typeof spawnSparks === 'function') {
          spawnSparks(this.x, this.y, 14, 'cyan', '#00E5FF');
          spawnSparks(this.x, this.y, 8, 'silverStreak', '#FFFFFF');
        }
        this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);
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

    super.update(opponent, ownerIndex, arena);
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
    } else if (this.burstRemaining <= 0 && !this.isShooting) {
      this._initiateBowVolley(target, ownerIndex);
    }
  }

  _executeSeeleSchneider(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.seeleCooldown = this.seeleCooldownMax;
    this._playSound('seeleSlice', 'Assets/Sound Effects/Attacks/energysword.mp3', 0.85);

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

          // Siphon Reishi on Seele Schneider parry hit
          if (!this.isPiercingLightActive) {
            const meleeGain = CONFIG.uryu?.siphonMeleeGain || 8.0;
            this.reishiGauge = Math.min(100, this.reishiGauge + meleeGain);
          }

          // Push target away to restore archery spacing (safe capped knockback)
          const pushForce = CONFIG.uryu?.seeleKnockback || 4.5;
          if (typeof t.applyKnockback === 'function') {
            t.applyKnockback(Math.cos(angleToTarget) * pushForce, Math.sin(angleToTarget) * pushForce);
          } else {
            t.vx = (t.vx || 0) + Math.cos(angleToTarget) * pushForce;
            t.vy = (t.vy || 0) + Math.sin(angleToTarget) * pushForce;
          }
        }
      }
    }
  }

  _initiateBowVolley(target, ownerIndex) {
    this.isShooting = true;
    this.isDrawingBow = true;
    this.burstRemaining = CONFIG.uryu?.burstCount || 3;
    this.drawPhase = 'DRAWING';
    this.arrowDrawTimer = 0;
    // First arrow has a deliberate, crisp 16-frame draw; Piercing Light accelerates by 30%
    const drawSpeedMult = this.isPiercingLightActive ? 0.70 : 1.0;
    this.arrowDrawDuration = Math.max(8, Math.round(16 * drawSpeedMult));
    this.arrowDrawProgress = 0;
    this._curOwnerIndex = ownerIndex;
    if (target) this.aim(target);
    this._playSound('bowDraw', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.65);
  }

  _fireHeiligPfeilArrow(target, ownerIndex) {
    const angle = this.gunAngle || 0;
    // Spawn projectile exactly in the center of the bow riser grip
    const spawnDist = this.r * 1.05 + 3.0;
    const startX = this.x + Math.cos(angle) * spawnDist;
    const startY = this.y + Math.sin(angle) * spawnDist;

    const speedMult = this.isPiercingLightActive ? (CONFIG.uryu?.piercingArrowSpeedMult || 1.35) : 1.0;
    const dmgMult = this.isPiercingLightActive ? (CONFIG.uryu?.piercingDamageMult || 1.25) : 1.0;
    const arrowSpeed = (CONFIG.uryu?.arrowSpeed || 24) * speedMult;
    const arrowDmg = (CONFIG.uryu?.arrowDamage || 18) * dmgMult;
    const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0)
      ? ownerIndex
      : (typeof this._curOwnerIndex === 'number' ? this._curOwnerIndex : (state.fighters ? state.fighters.indexOf(this) : 0));

    this._playSound('bowShoot', 'Assets/Sound Effects/Attacks/shurikenthrow.mp3', 0.8);
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
        p.maxPierces = this.isPiercingLightActive ? (CONFIG.uryu?.piercingMaxPierces || 4) : 1;
        p.ignoreArmor = this.isPiercingLightActive ? (CONFIG.uryu?.piercingIgnoreArmor || 0.30) : 0;
      }
    }

    // Spark burst at arrow tip
    spawnSparks(startX, startY, '#00E5FF', 3);
  }

  drawBody(ctx) {
    drawUryuSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawUryuSkin(ctx, this);
  }

  draw(ctx, opponent) {
    drawUryuSkin(ctx, this);
  }
}
