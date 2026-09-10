import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawYujiSkin } from '../../graphics/fighters/yujiSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './yuji/yujiCombat.js';
import { modUpdateDivergentDash, modUpdateReverseCursedTechnique } from './yuji/yujiSkills.js';
import { spawnMeleeClashShockwave, spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnTeleportAfterimages } from './sukuna/sukunaCombat.js';

/**
 * Yuji Itadori — The Black Flash Brawler
 */
export class YujiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'yuji';
    this.type = 'yuji';

    // Visual aura
    this.combatAuraOpacity = 0.0;

    // Core combat variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.yuji?.punchSpeed || 25;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.slashHand = 0;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;

    // Skill 1: Divergent Fist Dash
    this.isDivergentDashing = false;
    this.divergentDashCooldown = 0;
    this.divergentDashTimer = 0;
    this.divergentDashTarget = null;

    // Black Flash buildup
    this.blackFlashCharge = 0;
    this.blackFlashThreshold = CONFIG.yuji?.blackFlashThreshold || 4;
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
    this.afterImages = []; // Zone trails afterimages array

    // Divergent Fist delayed shockwaves queue
    this.delayedShockwaves = [];

    // Soul Swap state
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.revertTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
    this.rapidSlashPhase = 'IDLE'; // 'IDLE' | 'START' | 'LANDED' | 'SLASH_RECOVERY'

    // Reverse Cursed Technique (RCT) Passive
    this.rctCooldown = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }

  reset() {
    super.reset();
    this.afterImages = [];
    this.isDivergentDashing = false;
    this.divergentDashCooldown = 0;
    this.divergentDashTimer = 0;
    this.divergentDashTarget = null;
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
    this.rapidSlashPhase = 'IDLE';
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts.isHeal || amount < 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    const incoming = Number(amount) || 0;
    const thresholdHp = this.maxHp * (CONFIG.yuji?.soulSwapHpThreshold || 0.30);
    // Auto-trigger Soul Swap if fatal or drops below threshold before having swapped
    if (!this.hasSoulSwapped && this.hp > 0) {
      if ((this.hp - incoming) <= thresholdHp) {
        // Prevent fatal one-shot death on the triggering hit so he can transform
        const safeDamage = Math.min(incoming, Math.max(0, this.hp - 1));
        const result = super.takeDamage(safeDamage, attacker, opts);
        if (this.hp <= 0) {
          this.hp = Math.max(1, Math.round(thresholdHp));
          this.dead = false;
          this.isDead = false;
        }
        this._triggerSoulSwapTransformation(attacker);
        return result;
      }
    }

    // While in active Soul Swap or takeover transition, take damage normally but maintain super armor while alive
    if (this.soulSwapActive || (this.soulSwapTransitionTimer && this.soulSwapTransitionTimer > 0)) {
      const result = super.takeDamage(incoming, attacker, opts);
      if (this.hp <= 0 || this.dead || this._hasDied) {
        this.dead = true;
        this.isDead = true;
        this.soulSwapActive = false;
        this.soulSwapTimer = 0;
        this.soulSwapTransitionTimer = 0;
        this.rapidSlashHitsLeft = 0;
        this.rapidSlashTimer = 0;
        this.rapidSlashPhase = 'IDLE';
        this.flurryTarget = null;
        return result;
      }
      // Clear all hit-stuns / hit-pauses / knockback stuns
      this.hitStunTimer = 0;
      this.knockbackStunTimer = 0;
      this.basicAttackHitPauseTimer = 0;
      return result;
    }

    return super.takeDamage(amount, attacker, opts);
  }

  _triggerSoulSwapTransformation(customTarget = null) {
    if (this.hasSoulSwapped || this.hp <= 0) return;
    this.hasSoulSwapped = true;
    this.soulSwapActive = true;
    this.soulSwapTimer = CONFIG.yuji?.soulSwapDuration || 800;
    this.soulSwapTransitionTimer = 30; // 0.5s takeover transformation freeze!
    this.hasDismantleCharge = true;

    // Clear any leftover punch animation from before transformation
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;

    // Target acquisition
    let target = customTarget && !customTarget.isDead && customTarget.hp > 0 && !this.isTeammate(customTarget) ? customTarget : null;
    if (!target) {
      const validTargets = this._getValidEnemyTargets();
      target = validTargets[0] || null;
    }

    this.flurryTarget = target;
    this.rapidSlashPhase = 'START';
    this.rapidSlashTimer = 0;
    this.rapidSlashHitsLeft = 999; // Continuous loop indicator

    spawnFloatingText(this.x, this.y - this.r - 28, "SUKUNA TAKES OVER!", "#CC0000");
    const transformSnd = CONFIG.yuji?.transformationSound || 'Assets/Sound Effects/Skills/yuji-transformation.mp3';
    const transformVol = CONFIG.yuji?.transformationVolume ?? 2.5;
    if (typeof audioSystem !== 'undefined') {
      if (typeof audioSystem.playFighterVoiceline === 'function') {
        audioSystem.playFighterVoiceline(this, transformSnd, transformVol, 1.0, 0, 0, {
          priority: 'domain',
          isProtected: true,
          durationMs: 3500
        });
      } else {
        audioSystem.playSFX(transformSnd, transformVol);
      }
    }
  }

  _triggerSoulSwapRevert() {
    this.rapidSlashHitsLeft = 0;
    this.rapidSlashTimer = 0;
    this.rapidSlashPhase = 'IDLE';
    this.flurryTarget = null;

    if (this.soulSwapActive) {
      // === STOP MOVE, REVERT TRANSFORMATION ANIMATION & PASSIVE RCT HEAL YUJI ===
      this.soulSwapActive = false;
      this.revertTransitionTimer = 45; // 0.75s revert transformation freeze!
      this.applyHitStun(60); // 60 frames stagger
      this.vx = 0;
      this.vy = 0;

      const healPercent = CONFIG.yuji?.rctHealPercent || 0.25;
      const healAmount = Math.round(this.maxHp * healPercent);
      if (typeof this.heal === 'function') {
        this.heal(healAmount, { color: '#00FF00' });
      } else {
        this.hp = Math.min(this.maxHp, this.hp + healAmount);
      }

      spawnFloatingText(this.x, this.y - this.r - 28, "PASSIVE RCT HEAL!", "#00FF00");
      spawnFloatingText(this.x, this.y - this.r - 48, `+${healAmount} HP`, "#00FF00");
      audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
      spawnImpactFlash(this.x, this.y, 45, 'rgba(0, 255, 120, 0.8)');
    }
  }

  _getValidEnemyTargets(opponent = null) {
    const enemies = [];
    if (opponent) {
      if (Array.isArray(opponent)) {
        for (const op of opponent) {
          if (op && !op.isDead && op.hp > 0 && !this.isTeammate(op)) enemies.push(op);
        }
      } else if (!opponent.isDead && opponent.hp > 0 && !this.isTeammate(opponent)) {
        enemies.push(opponent);
      }
    }

    if (typeof state !== 'undefined') {
      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isDead) continue;
          if (this.isTeammate(f)) continue;
          if (!enemies.includes(f)) enemies.push(f);
        }
      }
      if (state.illusions) {
        for (const ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0 || ill.isDead) continue;
          if (ill.owner && this.isTeammate(ill.owner)) continue;
          if (ill.ownerIndex !== undefined && typeof state.getFighterTeam === 'function' && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
          if (!enemies.includes(ill)) enemies.push(ill);
        }
      }
    }
    return enemies;
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;
      this.trailGenTimer = 0;
      this.rapidSlashHitsLeft = 0;
      return;
    }

    if (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.slashSwingTimer > 0) this.slashSwingTimer--;
      this.trailGenTimer = 0;
      this.rapidSlashHitsLeft = 0;
    }

    // Update existing afterimages (placed before freeze guard so they fade even if frozen!)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Auto-trigger Ultimate: Soul Swap — Sukuna Takes Over (Once per match, HP critically low)
    if (this.hp / this.maxHp <= (CONFIG.yuji?.soulSwapHpThreshold || 0.30) && !this.hasSoulSwapped) {
      this._triggerSoulSwapTransformation(opponent);
    }

    // Decay hit-flash visual if frozen/stasis early-exit so it doesn't stay stuck at max
    // while frozen. Super.update() / _tickCooldowns() handles normal active frames.
    if ((this.timeStopTimer > 0 || this.isTargetOfAmbush || this.isParalyzed) && this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
    }

    // While in Soul Swap, clear minor flinch/hitpause timers so Super Armor is preserved
    if (this.soulSwapActive || (this.soulSwapTransitionTimer && this.soulSwapTransitionTimer > 0)) {
      this.basicAttackHitPauseTimer = 0;
      this.hitStunTimer = 0;
      this.knockbackStunTimer = 0;
    }

    // TimeStop & Freeze Guards (Rule #1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    // Ultimate transformation takeover transition freeze
    if (this.soulSwapTransitionTimer > 0) {
      this.soulSwapTransitionTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - 1);
      
      // The exact frame takeover transformation pause finishes, start initial teleport!
      if (this.soulSwapTransitionTimer <= 0) {
        this.rapidSlashPhase = 'START';
        this.rapidSlashTimer = 0;
        this.punchAnimTimer = 0;
      }
      return;
    }

    // Revert transformation freeze (stop movement, show recovery aura pause)
    if (this.revertTransitionTimer > 0) {
      this.revertTransitionTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.revertTransitionTimer % 15 === 0) {
        spawnImpactFlash(this.x, this.y, 25, 'gojo');
      }
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      return;
    }

    // Sukuna Soul Takeover: Rapid Continuous 360° Cleave Slash Sequence
    // Continues until the entire Soul Swap duration expires!
    // Flow: Teleport -> Land & Aim (Landing Delay) -> Slash (Cleave) -> Recovery Pause -> Repeat
    if (this.soulSwapActive && this.soulSwapTimer > 0) {
      this.soulSwapTimer--;

      // Duration completed: Revert back to Yuji with stagger & passive RCT heal!
      if (this.soulSwapTimer <= 0) {
        this._triggerSoulSwapRevert();
        return;
      }

      // Freeze physical movement and keep punch animations cleared so only slash swings display
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;
      if (this.slashSwingTimer > 0) this.slashSwingTimer--;
      if ((this._slashSoundCooldown || 0) > 0) this._slashSoundCooldown--;

      // Update aura opacity during Soul Swap
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);

      let ft = this.flurryTarget;
      if (!ft || ft.isDead || ft.hp <= 0) {
        const validEnemies = this._getValidEnemyTargets(opponent);
        ft = validEnemies[0] || null;
        this.flurryTarget = ft;
      }
      if (!ft) {
        // No valid target remaining in arena, hold position aimed
        return;
      }

      // Default phase initialization if not set
      if (!this.rapidSlashPhase || this.rapidSlashPhase === 'IDLE') {
        this.rapidSlashPhase = 'START';
        this.rapidSlashTimer = 0;
      }

      // Decrement active phase timer
      if (this.rapidSlashTimer > 0) {
        this.rapidSlashTimer--;
        // While landed or during recovery, stay firmly aimed at target
        this.aim(ft);
        return;
      }

      // ── PHASE 1: TELEPORT & LAND BEFORE SLASHING ──
      if (this.rapidSlashPhase === 'START' || this.rapidSlashPhase === 'SLASH_RECOVERY') {
        const oldX = this.x;
        const oldY = this.y;

        // Teleport to a dynamic surrounding position around target (85–140px away)
        const teleportAngle = Math.random() * Math.PI * 2;
        const targetRadius = ft.r || 20;
        const teleportDist = targetRadius + this.r + 65 + Math.random() * 50;
        this.x = ft.x + Math.cos(teleportAngle) * teleportDist;
        this.y = ft.y + Math.sin(teleportAngle) * teleportDist;

        const arenaObj = arena || (typeof state !== 'undefined' ? state.arena : null);
        if (arenaObj) {
          this.x = Math.max(arenaObj.x + this.r + 10, Math.min(arenaObj.x + arenaObj.width - this.r - 10, this.x));
          this.y = Math.max(arenaObj.y + this.r + 10, Math.min(arenaObj.y + arenaObj.height - this.r - 10, this.y));
        }

        // Aim immediately at the target from the landed position
        this.aim(ft);

        // Spawn afterimages along the teleport path
        spawnTeleportAfterimages(this, oldX, oldY, this.x, this.y);
        spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
        spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.75);

        if (typeof ft.applyHitStun === 'function') ft.applyHitStun(8);

        // Landed at the spot! Wait for landing delay so player clearly sees Sukuna land before slashing
        this.rapidSlashPhase = 'LANDED';
        this.rapidSlashTimer = CONFIG.yuji?.soulSwapLandingDelay ?? 6; // 6 frames (~100ms)
        return;
      }

      // ── PHASE 2: UNLEASH SLASH (AFTER LANDING) ──
      if (this.rapidSlashPhase === 'LANDED') {
        const directAngle = Math.atan2(ft.y - this.y, ft.x - this.x);
        this.applyAim(ft, directAngle);

        const fi = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : (ownerIndex !== undefined ? ownerIndex : 0);
        const baseDamage = CONFIG.yuji?.punchDamage || 18;
        const slashDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 2.5);
        const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;

        // 1. Direct Cleave Hit (Instant damage calculation & registration with sparks & blood)
        applyDamageToTarget(ft, slashDamage, this, {
          isMelee: true,
          isSukunaSlash: true,
          isCleave: true,
          isSkill: true
        });

        // 2. Fire visible Sukuna Slash crescent through the target
        projectileSystem.fireProjectile(
          this,
          fi,
          0,
          false,
          slashSpeed,
          false,
          'sukunaSlash',
          this.x,
          this.y,
          directAngle
        );

        spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
        triggerGlobalScreenShake(6, 8);
        spawnSparks(ft.x, ft.y, 18, 'crimsonSniper', '#8B0000');
        spawnSparks(ft.x, ft.y, 8, 'slashRicochet');
        this.punchAnimTimer = 0;
        this.slashGlowTimer = 25;
        this.slashSwingTimer = 14;
        this.slashSwingMaxTimer = 14;
        this.slashHand = this.slashHand === 1 ? 0 : 1;

        const cleaveAngle = Math.atan2(ft.y - this.y, ft.x - this.x);
        ft.vx = (ft.vx || 0) + Math.cos(cleaveAngle) * 3.5;
        ft.vy = (ft.vy || 0) + Math.sin(cleaveAngle) * 3.5;

        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
        audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.7);
        spawnImpactFlash(this.x, this.y, 15, 'crimsonSniper');

        // Slash recovery pause before next teleport!
        this.rapidSlashPhase = 'SLASH_RECOVERY';
        this.rapidSlashTimer = CONFIG.yuji?.soulSwapSlashRecovery ?? 10; // 10 frames (~166ms)
        return;
      }
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Smoothly transition Yuji's Cursed Energy aura opacity
    const wantsAura = (this.punchAnimTimer > 0) || (this.blackFlashCharge > 0) || this.soulSwapActive || this.isChannelingRCT || (this.blackFlashTimer > 0);
    if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, this.combatAuraOpacity - 0.05);
    }

    // Cooldown management (operating at 120% potential inside the Zone)
    const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);
    if (this.divergentDashCooldown > 0) this.divergentDashCooldown = Math.max(0, this.divergentDashCooldown - decay);
    if (this.rctCooldown > 0) this.rctCooldown = Math.max(0, this.rctCooldown - decay);

    // Process delayed shockwaves (Divergent Fist passive)
    if (this.delayedShockwaves) {
      for (let i = this.delayedShockwaves.length - 1; i >= 0; i--) {
        const sw = this.delayedShockwaves[i];
        sw.delay--;
        if (sw.delay <= 0) {
          // Trigger delayed shockwave impact if target is still valid
          const target = sw.target;
          if (target && !target.isDead && target.hp > 0) {
            applyDamageToTarget(target, sw.damage, this, { isDivergentFist: true });
            
            // Spawn hot-pink clash shockwave ring (Yuta style)
            const shockRadius = CONFIG.yuji?.shockwaveRadius || 40;
            spawnMeleeClashShockwave(target.x, target.y, shockRadius, 'gojo');

            // Play secondary impact sound
            audioSystem.playSFX('attack_fleshhit', 0.6);
          }
          this.delayedShockwaves.splice(i, 1);
        }
      }
    }

    // Extract targets list
    let targets = [];
    if (Array.isArray(opponent)) {
      targets = opponent;
    } else if (opponent) {
      targets = [opponent];
    }

    // Passive RCT Technique handler
    modUpdateReverseCursedTechnique.call(this);

    // Execute Skill 1: Divergent Fist Dash update
    modUpdateDivergentDash.call(this, this.divergentDashTarget || targets[0]);

    if (this.isDivergentDashing || this.isChannelingRCT) {
      return; // Skip normal AI basic attacks/behavior during Divergent Dash or RCT
    }

    // AI logic: drive basic attacks in melee range
    if (!this.playerControlled && targets.length > 0) {
      const target = targets[0];
      if (target) {
        this.aim(target);

        // Ranged Dismantle check if in Soul Swap
        if (this.soulSwapActive && this.hasDismantleCharge) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= 350 && (this.cooldownTimer || 0) <= 0) {
            this.shoot();
            return;
          }
        }

        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.yuji?.punchRange || 50;
        const maxPunchReach = this.r + target.r + reach;

        // AI: Divergent Fist Dash gap closer check
        const dashMax = CONFIG.yuji?.divergentDashRange || 280;
        const dashMin = CONFIG.yuji?.divergentDashMinRange || 60;
        if (!this.soulSwapActive && (this.divergentDashCooldown || 0) <= 0 && dist >= dashMin && dist <= dashMax) {
          this.triggerDivergentDash(target);
          return;
        }

        if (dist <= maxPunchReach && (this.cooldownTimer || 0) <= 0) {
          this.aim(target);
          modUpdateMeleeCombat.call(this, target);
        }
      }
    }

    if (this.blackFlashTimer > 0 && Math.hypot(this.vx, this.vy) > 0.8) {
      if (!this.afterImages) this.afterImages = [];
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        r: this.r,
        angle: this.angle,
        color: this.color || '#D95C7E',
        timer: 16,
        maxTimer: 16
      }, 12);
    }
  }

  shoot() {
    if (!this.canPerformBasicAttack()) return false;
    // Block all attacks and manual input during Soul Swap ultimate sequence
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return false;

    // Player-controlled / manual basic punch attack
    if ((this.cooldownTimer || 0) > 0) return false;

    // Ultimate ranged attack: single Dismantle slash if in Soul Swap state
    if (this.soulSwapActive && this.hasDismantleCharge) {
      this.hasDismantleCharge = false; // Consume charge
      
      const baseDamage = CONFIG.yuji?.punchDamage || 18;
      const dismantleDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 2.5);
      const dismantleSpeed = CONFIG.sukuna?.slashSpeed || 40;
      const ownerIndex = state.fighters.indexOf(this);
      
      projectileSystem.fireProjectile(
        this,
        ownerIndex,
        dismantleDamage,
        false,
        dismantleSpeed,
        false,
        'ghostBlade'
      );

      spawnFloatingText(this.x, this.y - this.r - 28, 'DISMANTLE!', '#E0E8FF');
      
      this.punchAnimTimer = 0;
      this.slashGlowTimer = 25;
      this.slashSwingTimer = 14;
      this.slashSwingMaxTimer = 14;
      this.slashHand = this.slashHand === 1 ? 0 : 1;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
      audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.85);
      
      const isZone = (this.blackFlashTimer > 0);
      this.cooldownTimer = isZone
        ? (CONFIG.yuji?.blackFlashZonePunchCooldown || 30)
        : (CONFIG.yuji?.basicPunchCooldown || 35);
      return true;
    }

    let bestTarget = null;
    let closestDist = Infinity;

    const allTargets = [];
    if (state && state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
        if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
        allTargets.push(f);
      }
    }
    if (state && state.illusions) {
      for (let ill of state.illusions) {
        if (!ill || ill === this || ill.hp <= 0) continue;
        if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
        allTargets.push(ill);
      }
    }

    const reach = CONFIG.yuji?.punchRange || 50;
    for (const target of allTargets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const maxPunchReach = this.r + target.r + reach;
      if (dist <= maxPunchReach && dist < closestDist) {
        closestDist = dist;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      this.aim(bestTarget);
      modUpdateMeleeCombat.call(this, bestTarget);
      return true;
    } else if (this.playerControlled) {
      // Punch the air
      modUpdateMeleeCombat.call(this, null);
      return true;
    }
    return false;
  }

  triggerDivergentDash(customTarget = null) {
    if (this.isDead || this.hp <= 0 || (this.divergentDashCooldown || 0) > 0 || this.isDivergentDashing) return false;
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return false;

    let bestTarget = customTarget;
    if (!bestTarget || bestTarget.isDead || bestTarget.hp <= 0) {
      const allTargets = [];
      if (state && state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
          allTargets.push(f);
        }
      }
      if (state && state.illusions) {
        for (let ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
          allTargets.push(ill);
        }
      }
      const maxRange = CONFIG.yuji?.divergentDashRange || 280;
      let closestDist = Infinity;
      for (const t of allTargets) {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= maxRange && d < closestDist) {
          closestDist = d;
          bestTarget = t;
        }
      }
    }

    if (bestTarget) {
      this.isDivergentDashing = true;
      this.divergentDashTarget = bestTarget;
      this.divergentDashTimer = CONFIG.yuji?.divergentDashMaxDuration || 20;
      this.divergentDashCooldown = CONFIG.yuji?.divergentDashCooldown || 240;
      const snd = CONFIG.yuji?.divergentDashSound || 'Assets/Sound Effects/Skills/dash3.mp3';
      const vol = CONFIG.yuji?.divergentDashVolume ?? 0.85;
      audioSystem.playSFX(snd, vol);
      spawnImpactFlash(this.x, this.y, 20, 'gojo');
      spawnFloatingText(this.x, this.y - this.r - 28, 'DIVERGENT DASH!', '#D95C7E');
      return true;
    }
    return false;
  }

  triggerSecondarySkill() {
    return this.triggerDivergentDash();
  }

  triggerTertiarySkill() {
    // Reverse Cursed Technique is a passive heal on reverting from Soul Swap
  }

  interruptAttacks(forceCancelAll = false) {
    if (this.soulSwapActive && this.hp > 0 && !forceCancelAll) {
      // During active Soul Swap, protect the transformation and teleport-slash combo from being cancelled!
      this.isDivergentDashing = false;
      this.divergentDashTarget = null;
      this.divergentDashTimer = 0;
      this.delayedShockwaves = [];
      this.punchAnimTimer = 0;
      return;
    }

    super.interruptAttacks(forceCancelAll);
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    if (forceCancelAll || (!isMatchEnded && (this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush))) {
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;
    }
    this.isDivergentDashing = false;
    this.divergentDashTarget = null;
    this.divergentDashTimer = 0;
    this.delayedShockwaves = [];
    if (this.afterImages) this.afterImages.length = 0;
    if (this.punchEffects) this.punchEffects.length = 0;
    
    // Interrupt RCT channeling
    if (this.isChannelingRCT) {
      this.isChannelingRCT = false;
      spawnFloatingText(this.x, this.y - this.r - 20, 'SKILL INTERRUPTED!', '#FF0000');
    }
    
    // Clear Black Flash zone on hard interrupt
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    // Draw JJK Cursed Energy aura behind him: red during Soul Swap, green during RCT, blue otherwise
    const auraTheme = this.soulSwapActive ? 'red' : (this.isChannelingRCT ? 'rct' : 'blue');
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, auraTheme);

    drawYujiSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
