import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawYujiSkin } from '../../graphics/fighters/yujiSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { drawDivineFlameArrowConstruct } from '../../graphics/draw.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './yuji/yujiCombat.js';
import { modUpdateDivergentDash, modUpdateReverseCursedTechnique } from './yuji/yujiSkills.js';
import { spawnMeleeClashShockwave, spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { playSound, playLoopingSound, stopLoopingSound, pauseLoopingSound, resumeLoopingSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
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
    this.slashGlowTimer = 0;
    this._slashSoundCooldown = 0;

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

    // Soul Swap state & Fuga finisher
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.revertTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
    this.rapidSlashPhase = 'IDLE'; // 'IDLE' | 'START' | 'LANDED' | 'SLASH_RECOVERY' | 'FUGA_CHANNEL' | 'FUGA_RECOVERY'
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameChargeMax = CONFIG.yuji?.soulSwapFugaChargeMax || 85;
    this.divineFlameRecoveryTimer = 0;
    this.divineFlameCastAngle = null;
    this.fugaSoundKey = null;

    // Reverse Cursed Technique (RCT) Passive
    this.rctCooldown = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;

    // Declarative Skill Registration
    const skills = [];
    if (this.isSkillEnabled(CONFIG.yuji?.enableDivergentDash, true)) {
      skills.push({
        id: 'divergent_fist',
        name: 'Divergent Fist',
        type: 'active',
        cooldownKey: 'divergentDashCooldown',
        cooldownMax: () => CONFIG.yuji?.divergentDashCooldown || 180
      });
    }
    if (this.isSkillEnabled(CONFIG.yuji?.enableRCT, true)) {
      skills.push({
        id: 'rct',
        name: 'Reverse Cursed Technique',
        type: 'active',
        cooldownKey: 'rctCooldown',
        cooldownMax: () => CONFIG.yuji?.rctCooldown || 800,
        channelingKey: 'isChannelingRCT'
      });
    }
    if (this.isSkillEnabled(CONFIG.yuji?.enableSoulSwap, true)) {
      skills.push({
        id: 'soul_swap',
        name: 'Sukuna Takeover',
        type: 'transformation',
        durationKey: 'soulSwapTimer',
        durationMax: () => CONFIG.yuji?.soulSwapDuration || 100,
        activeKey: 'soulSwapActive',
        channelTimerKey: 'soulSwapTransitionTimer',
        canTickDuration: (fighter) => fighter.rapidSlashPhase === 'COMPLETE',
        onExpire: (fighter) => {
          fighter._triggerSoulSwapRevert();
        }
      });
    }
    this.skillManager.registerSkills(skills);
  }

  reset() {
    super.reset();
    if (this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }
    this.afterImages = [];
    this.isDivergentDashing = false;
    this.divergentDashCooldown = 0;
    this.divergentDashTimer = 0;
    this.divergentDashTarget = null;
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.revertTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
    this.rapidSlashPhase = 'IDLE';
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameRecoveryTimer = 0;
    this.divineFlameCastAngle = null;
    this.slashGlowTimer = 0;
    this._slashSoundCooldown = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts.isHeal || amount < 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    // Passive DEF: Apply damage reduction before all other logic
    let reduction = CONFIG.yuji?.baseDamageReduction ?? 0.20;
    if (this.blackFlashTimer > 0) {
      reduction = Math.max(reduction, CONFIG.yuji?.blackFlashZoneDamageReduction ?? 0.20);
    }
    if (this.soulSwapActive) {
      reduction = Math.max(reduction, CONFIG.yuji?.soulSwapDamageReduction ?? 0.20);
    }

    const incoming = (Number(amount) || 0) * (1 - reduction);
    const thresholdHp = this.maxHp * (CONFIG.yuji?.soulSwapHpThreshold || 0.30);
    // Auto-trigger Soul Swap if fatal or drops below threshold before having swapped
    const isSoulSwapAllowed = this.isSkillEnabled(CONFIG.yuji?.enableSoulSwap, true);
    if (isSoulSwapAllowed && !this.hasSoulSwapped && this.hp > 0) {
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
        if (this.fugaSoundKey) {
          stopLoopingSound(this.fugaSoundKey);
          this.fugaSoundKey = null;
        }
        this.isChannelingDivineFlame = false;
        this.divineFlameChargeTimer = 0;
        this.divineFlameRecoveryTimer = 0;
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

    return super.takeDamage(incoming, attacker, opts);
  }

  _triggerSoulSwapTransformation(customTarget = null) {
    if (this.hasSoulSwapped || this.hp <= 0) return;
    this.hasSoulSwapped = true;
    this.soulSwapActive = true;
    this.soulSwapTimer = CONFIG.yuji?.soulSwapDuration || 100;
    this.soulSwapTransitionTimer = 30; // 0.5s takeover transformation freeze!
    this.hasDismantleCharge = false;
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameRecoveryTimer = 0;
    this.divineFlameCastAngle = null;

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
    this.rapidSlashHitsLeft = CONFIG.yuji?.soulSwapRapidSlashHits || 5; // Rapid slash combo strikes before Fuga!

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
    if (this.fugaSoundKey) {
      stopLoopingSound(this.fugaSoundKey);
      this.fugaSoundKey = null;
    }
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.divineFlameRecoveryTimer = 0;
    this.rapidSlashHitsLeft = 0;
    this.rapidSlashTimer = 0;
    this.rapidSlashPhase = 'IDLE';
    this.flurryTarget = null;

    if (this.soulSwapActive || this.revertTransitionTimer <= 0) {
      // === STOP MOVE, REVERT TRANSFORMATION ANIMATION & PASSIVE RCT HEAL YUJI ===
      this.soulSwapActive = false;
      this.soulSwapTimer = 0;
      this.soulSwapTransitionTimer = 0;
      this.revertTransitionTimer = 35; // 0.58s revert transformation freeze!
      this.hitStunTimer = 0; // Clear hit stun so movement and combat resume immediately after revert
      this.vx = 0;
      this.vy = 0;

      if (this.isSkillEnabled(CONFIG.yuji?.enableRCT, true)) {
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
  }

  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.dead || this.isDead || this._hasDied) return false;
    if (
      this.soulSwapActive ||
      (this.soulSwapTransitionTimer && this.soulSwapTransitionTimer > 0) ||
      (this.revertTransitionTimer && this.revertTransitionTimer > 0) ||
      (this.rapidSlashHitsLeft && this.rapidSlashHitsLeft > 0) ||
      this.isChannelingDivineFlame ||
      (this.divineFlameChargeTimer && this.divineFlameChargeTimer > 0) ||
      (this.divineFlameRecoveryTimer && this.divineFlameRecoveryTimer > 0) ||
      (this.rapidSlashPhase && this.rapidSlashPhase !== 'IDLE' && this.rapidSlashPhase !== 'COMPLETE')
    ) {
      return true;
    }
    return super.hasActiveFinishingAbility ? super.hasActiveFinishingAbility() : false;
  }

  isValidAimTarget(target) {
    if (!target || target === this) return false;
    const isReforming = Boolean(target.isRevivingFromContract || target.isShatterReviving);
    const isAlive = (target.hp > 0 && !target.isDead && !target._hasDied) || isReforming || (typeof target.isEffectivelyAlive === 'function' && target.isEffectivelyAlive());
    if (!isAlive) return false;
    if (target.vanishTimer > 0 || target.isSubmerged || target.isErupting) return false;

    // During Sukuna Soul Swap, god-tier Cursed Energy perception bypasses bush camouflage completely
    if (this.soulSwapActive || (this.soulSwapTransitionTimer && this.soulSwapTransitionTimer > 0) || (this.rapidSlashHitsLeft && this.rapidSlashHitsLeft > 0) || this.isChannelingDivineFlame || (this.divineFlameRecoveryTimer && this.divineFlameRecoveryTimer > 0)) {
      return true;
    }

    return super.isValidAimTarget(target);
  }

  _getValidEnemyTargets(opponent = null) {
    const enemies = [];
    if (opponent) {
      if (Array.isArray(opponent)) {
        for (const op of opponent) {
          const isOpReforming = Boolean(op && (op.isRevivingFromContract || op.isShatterReviving));
          if (op && (!op.isDead || isOpReforming) && (op.hp > 0 || isOpReforming) && !this.isTeammate(op)) enemies.push(op);
        }
      } else {
        const isOpReforming = Boolean(opponent && (opponent.isRevivingFromContract || opponent.isShatterReviving));
        if (opponent && (!opponent.isDead || isOpReforming) && (opponent.hp > 0 || isOpReforming) && !this.isTeammate(opponent)) {
          enemies.push(opponent);
        }
      }
    }

    if (typeof state !== 'undefined') {
      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          const isFReforming = Boolean(f && (f.isRevivingFromContract || f.isShatterReviving));
          if (!f || f === this) continue;
          if (!isFReforming && (f.hp <= 0 || f.isDead || f._hasDied)) continue;
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

  _findClosestEnemy() {
    const enemies = this._getValidEnemyTargets();
    if (enemies.length === 0) return null;
    let closest = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot((e.x || 0) - this.x, (e.y || 0) - this.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }
    return closest || enemies[0];
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
    if (this.isSkillEnabled(CONFIG.yuji?.enableSoulSwap, true) && this.hp / this.maxHp <= (CONFIG.yuji?.soulSwapHpThreshold || 0.30) && !this.hasSoulSwapped) {
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
      if (this.isChannelingDivineFlame && this.fugaSoundKey) {
        pauseLoopingSound(this.fugaSoundKey);
      }
      this.interruptAttacks();
      return;
    }

    // Resume Fuga charge audio if channeling after unfreezing
    if (this.isChannelingDivineFlame && this.fugaSoundKey) {
      resumeLoopingSound(this.fugaSoundKey);
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
        if (!this.rapidSlashHitsLeft || this.rapidSlashHitsLeft <= 0) {
          this.rapidSlashHitsLeft = CONFIG.yuji?.soulSwapRapidSlashHits || 5;
        }
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

    // Sukuna Soul Takeover: Rapid 360° Cleave Slash Sequence followed by Divine Flame (Fuga: Open) -> Free Dismantle Combat -> Revert
    // Flow: Teleport -> Land & Aim -> Slash (Cleave) -> Recovery -> Repeat (soulSwapRapidSlashHits times) -> Standoff Teleport -> Fuga Channel -> Fuga Release -> Recovery -> Free Combat Dismantles -> Revert
    if (this.soulSwapActive && this.soulSwapTimer > 0) {
      if (this.rapidSlashPhase === 'COMPLETE') {
        // Active playable/combat phase of Soul Swap: Sukuna moves freely and unleashes basic attack Dismantles
        if (!this.skillManager || !this.skillManager.hasSkill('soul_swap')) {
          this.soulSwapTimer--;
        }
        if (this.soulSwapTimer <= 0) {
          this._triggerSoulSwapRevert();
          return;
        }

        // Maintain Sukuna cursed energy aura
        this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
        // NOTE: slashSwingTimer is decremented universally after super.update() (line ~738)
        // Do NOT decrement here or animation plays at double speed!
        if (this.slashGlowTimer > 0) this.slashGlowTimer--;
        if ((this._slashSoundCooldown || 0) > 0) this._slashSoundCooldown--;

        // Do NOT freeze movement (vx, vy) and do NOT return early:
        // Execution falls through into super.update() for full physics, movement, and AI!
      } else {
        // Scripted opening sequence: Rapid Slashes & Fuga (Furnace: Open)
        // Freeze physical movement and keep punch animations cleared so only slash/fuga swings display
        this.vx = 0;
        this.vy = 0;
        this.punchAnimTimer = 0;
        if (this.slashSwingTimer > 0) this.slashSwingTimer--;
        if ((this._slashSoundCooldown || 0) > 0) this._slashSoundCooldown--;

        // Update aura opacity during Soul Swap
        this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);

        let ft = this.flurryTarget;
        if (!ft || ft.isDead || ft.hp <= 0 || ft._hasDied) {
          const validEnemies = this._getValidEnemyTargets(opponent);
          ft = this._findClosestEnemy() || validEnemies[0] || null;
          this.flurryTarget = ft;
        }

        // ── FUGA CHANNELING PHASE ──
        if (this.isChannelingDivineFlame) {
          this.divineFlameChargeTimer++;

          // Subtle arena tremor while channeling Fuga
          if (this.divineFlameChargeTimer % 6 === 0) {
            triggerGlobalScreenShake(2.5, 4);
          }

          // Play "Fuga" voice line exactly 45 frames before firing
          if (this.divineFlameChargeTimer === Math.max(1, this.divineFlameChargeMax - 45)) {
            const fireSound = getSkillSound('sukuna', 'fuga_fire');
            const fireSrc = fireSound?.src || CONFIG.sukuna?.sounds?.fugaFire || 'Assets/Sound Effects/Skills/fuga.mp3';
            const fireVol = fireSound?.volume ?? (CONFIG.sukuna?.soundVolumes?.fugaFire ?? 2.0);
            if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
              audioSystem.playSFX(fireSrc, fireVol);
            }
          }

          if (this.divineFlameChargeTimer < this.divineFlameChargeMax) {
            // Apply movement physics with 0 self-speed multiplier so external velocities move him and decay smoothly
            this.applyMovementPhysics(0);

            // Smooth auto-aim tracking while channeling Fuga (no sudden snap on firing)
            const fugaAimTarget = ft || (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : null) || opponent;
            if (fugaAimTarget && !this.isTargetOfAmbush && (this.timeStopTimer || 0) <= 0) {
              const targetZ = fugaAimTarget.z || 0;
              const myZ = this.z || 0;
              const targetAngle = Math.atan2((fugaAimTarget.y - targetZ) - (this.y - myZ), fugaAimTarget.x - this.x);
              if (this.canAim() && this.isValidAimTarget(fugaAimTarget)) {
                this.aim(fugaAimTarget);
              } else {
                this.gunAngle = targetAngle;
                this.angle = targetAngle;
                this.divineFlameCastAngle = targetAngle;
              }
            }
          } else {
            this.isChannelingDivineFlame = false;
            this.divineFlameChargeTimer = 0;

            if (this.fugaSoundKey) {
              stopLoopingSound(this.fugaSoundKey);
              this.fugaSoundKey = null;
            }

            const travelSound = getSkillSound('sukuna', 'fuga_travel');
            const fugaTravelSnd = travelSound?.src || CONFIG.sukuna?.sounds?.fugaTravel || 'Assets/Sound Effects/Skills/fugatravel.mp3';
            const fugaTravelVol = travelSound?.volume ?? (CONFIG.sukuna?.soundVolumes?.fugaTravel ?? 1.5);
            audioSystem.playSFX(fugaTravelSnd, fugaTravelVol);

            triggerGlobalScreenShake(28, 25);
            spawnFloatingText(this.x, this.y - this.r - 28, 'FUGA!', '#FF2200');
            spawnImpactFlash(this.x, this.y, 80, 'gold');

            // Fire Fuga strictly at current facing gunAngle reached during channeling (no snapping auto-aim upon firing)
            let releaseAngle = 0;
            if (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) {
              releaseAngle = this.gunAngle;
            } else if (this.divineFlameCastAngle !== undefined && this.divineFlameCastAngle !== null && !Number.isNaN(this.divineFlameCastAngle)) {
              releaseAngle = this.divineFlameCastAngle;
            }
            this.divineFlameCastAngle = releaseAngle;
            this.gunAngle = releaseAngle;
            this.angle = releaseAngle;

            const fi = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : (ownerIndex !== undefined ? ownerIndex : 0);
            const fugaDamage = CONFIG.yuji?.soulSwapFugaDamage || ((CONFIG.sukuna?.divineFlameDamage || 250) * 0.9);
            if (projectileSystem && projectileSystem.fireSukunaFurnace) {
              projectileSystem.fireSukunaFurnace(this, fi, fugaDamage);
            }

            this.divineFlameRecoveryTimer = CONFIG.yuji?.soulSwapFugaRecovery || 40;
            this.rapidSlashPhase = 'FUGA_RECOVERY';
          }
          return;
        }

        // ── FUGA RECOVERY PHASE ──
        if (this.divineFlameRecoveryTimer > 0) {
          this.divineFlameRecoveryTimer--;
          const lockedAngle = (this.divineFlameCastAngle !== undefined && this.divineFlameCastAngle !== null && !Number.isNaN(this.divineFlameCastAngle))
            ? this.divineFlameCastAngle
            : (this.gunAngle || 0);
          this.gunAngle = lockedAngle;
          this.angle = lockedAngle;

          if (this.divineFlameRecoveryTimer <= 0) {
            if (this.soulSwapTimer > 0) {
              this.rapidSlashPhase = 'COMPLETE';
              this.isChannelingDivineFlame = false;
              this.divineFlameCastAngle = null;
              this.flurryTarget = null;
              if (this.fugaSoundKey) {
                stopLoopingSound(this.fugaSoundKey);
                this.fugaSoundKey = null;
              }
            } else {
              this._triggerSoulSwapRevert();
            }
          }
          return;
        }

        // If in FUGA_CHANNEL phase but isChannelingDivineFlame was cancelled/interrupted (e.g. by Pure Love Beam)
        if (this.rapidSlashPhase === 'FUGA_CHANNEL' && !this.isChannelingDivineFlame) {
          this._triggerSoulSwapRevert();
          return;
        }

        // If duration completed before Fuga was triggered (fallback)
        if (this.soulSwapTimer <= 0) {
          this._triggerSoulSwapRevert();
          return;
        }

        if (!ft) {
          const fallbackEnemy = this._findClosestEnemy();
          if (fallbackEnemy) {
            ft = fallbackEnemy;
            this.flurryTarget = ft;
          } else {
            // No valid target remaining in arena during opening slashes, cleanly revert rather than freezing in place
            this._triggerSoulSwapRevert();
            return;
          }
        }

        // Default phase initialization if not set or corrupted
        const validPhases = ['START', 'LANDED', 'SLASH_RECOVERY', 'FUGA_CHANNEL', 'FUGA_RECOVERY', 'COMPLETE'];
        if (!this.rapidSlashPhase || this.rapidSlashPhase === 'IDLE' || !validPhases.includes(this.rapidSlashPhase)) {
          this.rapidSlashPhase = 'START';
          this.rapidSlashTimer = 0;
          if (!this.rapidSlashHitsLeft || this.rapidSlashHitsLeft <= 0) {
            this.rapidSlashHitsLeft = CONFIG.yuji?.soulSwapRapidSlashHits || 5;
          }
        }

        // Decrement active phase timer
        if (this.rapidSlashTimer > 0) {
          this.rapidSlashTimer--;
          // While landed or during recovery, snap firmly aimed at target
          const targetZ = ft.z || 0;
          const myZ = this.z || 0;
          const snapAngle = Math.atan2((ft.y - targetZ) - (this.y - myZ), ft.x - this.x);
          this.gunAngle = snapAngle;
          this.angle = snapAngle;
          return;
        }

      // ── PHASE 1: TELEPORT & LAND BEFORE SLASHING (OR TRANSITION TO FUGA) ──
      if (this.rapidSlashPhase === 'START' || this.rapidSlashPhase === 'SLASH_RECOVERY') {
        const oldX = this.x;
        const oldY = this.y;

        // If all rapid slash strikes completed -> UNLEASH FUGA (FURNACE: OPEN)!
        if ((this.rapidSlashHitsLeft || 0) <= 0) {
          const arenaObj = arena || (typeof state !== 'undefined' ? state.arena : null);
          const targetRadius = ft.r || 20;
          const standoffAngle = Math.atan2(this.y - ft.y, this.x - ft.x);
          const standoffDist = targetRadius + this.r + 140 + Math.random() * 30;
          this.x = ft.x + Math.cos(standoffAngle) * standoffDist;
          this.y = ft.y + Math.sin(standoffAngle) * standoffDist;

          if (arenaObj) {
            this.x = Math.max(arenaObj.x + this.r + 15, Math.min(arenaObj.x + arenaObj.width - this.r - 15, this.x));
            this.y = Math.max(arenaObj.y + this.r + 15, Math.min(arenaObj.y + arenaObj.height - this.r - 15, this.y));
          }

          const targetZ = ft.z || 0;
          const myZ = this.z || 0;
          const directAngle = Math.atan2((ft.y - targetZ) - (this.y - myZ), ft.x - this.x);
          this.divineFlameCastAngle = directAngle;
          this.gunAngle = directAngle;
          this.angle = directAngle;

          spawnTeleportAfterimages(this, oldX, oldY, this.x, this.y);
          spawnImpactFlash(oldX, oldY, 25, 'crimsonSniper');
          spawnImpactFlash(this.x, this.y, 30, 'crimsonSniper');
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);

          this.isChannelingDivineFlame = true;
          this.divineFlameChargeTimer = 0;
          this.divineFlameChargeMax = CONFIG.yuji?.soulSwapFugaChargeMax || 85;
          this.rapidSlashPhase = 'FUGA_CHANNEL';

          spawnFloatingText(this.x, this.y - this.r - 28, 'FURNACE (FUGA: OPEN)!', '#FF4500');

          const sound = getSkillSound('sukuna', 'divineFlame');
          const fugaSrc = sound?.src || CONFIG.sukuna?.sounds?.divineFlame || 'Assets/Sound Effects/Skills/fuga_charge.mp3';
          const fugaVol = sound?.volume ?? (CONFIG.sukuna?.soundVolumes?.divineFlame ?? 1.5);
          this.fugaSoundKey = 'fuga_charge_' + Math.random().toString(36).substr(2, 9);
          playLoopingSound(this.fugaSoundKey, fugaSrc, fugaVol);
          return;
        }

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

        // Snap auto-aim immediately and directly at the target from the newly landed position
        const targetZ = ft.z || 0;
        const myZ = this.z || 0;
        const snapAngle = Math.atan2((ft.y - targetZ) - (this.y - myZ), ft.x - this.x);
        this.gunAngle = snapAngle;
        this.angle = snapAngle;

        // Spawn afterimages along the teleport path
        spawnTeleportAfterimages(this, oldX, oldY, this.x, this.y);
        spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
        spawnImpactFlash(this.x, this.y, 25, 'crimsonSniper');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.75);

        if (typeof ft.applyHitStun === 'function') ft.applyHitStun(8);

        // Landed at the spot! Wait for landing delay so player clearly sees Sukuna land before slashing
        this.rapidSlashPhase = 'LANDED';
        this.rapidSlashTimer = CONFIG.yuji?.soulSwapLandingDelay ?? 8;
        return;
      }

      // ── PHASE 2: UNLEASH SLASH (AFTER LANDING) ──
      if (this.rapidSlashPhase === 'LANDED') {
        const targetZ = ft.z || 0;
        const myZ = this.z || 0;
        const directAngle = Math.atan2((ft.y - targetZ) - (this.y - myZ), ft.x - this.x);
        this.gunAngle = directAngle;
        this.angle = directAngle;

        const fi = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : (ownerIndex !== undefined ? ownerIndex : 0);
        const baseDamage = CONFIG.yuji?.punchDamage || 18;
        const slashDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 2.5);
        const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;

        // 1. Direct Cleave Hit (Instant damage calculation & registration with sparks & blood)
        applyDamageToTarget(ft, slashDamage, this, {
          isMelee: true,
          isSukunaSlash: true,
          isCleave: true,
          isSkill: true,
          isGuaranteedHit: true,
          bypassEvade: true
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

        this.rapidSlashHitsLeft--;

        // Slash recovery pause before next teleport!
        this.rapidSlashPhase = 'SLASH_RECOVERY';
        this.rapidSlashTimer = CONFIG.yuji?.soulSwapSlashRecovery ?? 10; // 10 frames (~166ms)
        this.gunAngle = directAngle;
        this.angle = directAngle;
        return;
      }
      return;
    }
  }

    super.update(opponent, ownerIndex, arena);

    // Smoothly transition Yuji's Cursed Energy aura opacity
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const wantsAura = !isCountdown && ((this.punchAnimTimer > 0) || (this.blackFlashCharge > 0) || this.soulSwapActive || this.isChannelingRCT || (this.blackFlashTimer > 0));
    if (isCountdown) {
      this.combatAuraOpacity = 0.0;
    } else if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.05);
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

    // AI logic: drive basic attacks in melee or ranged combat
    if (!this.playerControlled && targets.length > 0) {
      let closestTarget = null;
      let minDistance = Infinity;
      for (const t of targets) {
        if (!t || t.isDead || t.hp <= 0) continue;
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDistance) {
          minDistance = d;
          closestTarget = t;
        }
      }
      const target = closestTarget || targets[0];
      if (target) {
        this.aim(target);

        // Sukuna basic attack Dismantle during Soul Swap (free combat phase)
        if (this.soulSwapActive && this.rapidSlashPhase === 'COMPLETE') {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= 480 && (this.cooldownTimer || 0) <= 0) {
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
        if (this.isSkillEnabled(CONFIG.yuji?.enableDivergentDash, true) && !this.soulSwapActive && (this.divergentDashCooldown || 0) <= 0 && dist >= dashMin && dist <= dashMax) {
          this.triggerDivergentDash(target);
          return;
        }

        if (this.isSkillEnabled(CONFIG.yuji?.enableBasicPunch, true) && !this.soulSwapActive && dist <= maxPunchReach && (this.cooldownTimer || 0) <= 0) {
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
    if (!this.soulSwapActive && !this.isSkillEnabled(CONFIG.yuji?.enableBasicPunch, true)) return false;
    if (!this.canPerformBasicAttack()) return false;
    // Block all attacks and manual input during Soul Swap opening sequence, transition freezes, or revert freeze
    if (this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0 || (this.soulSwapActive && this.rapidSlashPhase !== 'COMPLETE')) return false;

    // Player-controlled / manual basic punch attack
    if ((this.cooldownTimer || 0) > 0) return false;

    // Basic Attack during Soul Swap: Dismantle Slash of Sukuna
    if (this.soulSwapActive && this.rapidSlashPhase === 'COMPLETE') {
      const baseDamage = CONFIG.sukuna?.slashDamage ?? ((CONFIG.yuji?.punchDamage || 6) * 2.5);
      const mult = CONFIG.yuji?.soulSwapDamageMultiplier || 1.5;
      const dismantleDamage = baseDamage * mult;
      const dismantleSpeed = CONFIG.sukuna?.slashSpeed || 40;
      const ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
      let aimAngle = (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : (this.angle || 0);

      projectileSystem.fireProjectile(
        this,
        ownerIndex,
        dismantleDamage,
        false,
        dismantleSpeed,
        false,
        'ghostBlade',
        undefined,
        undefined,
        aimAngle
      );

      spawnFloatingText(this.x, this.y - this.r - 20, 'DISMANTLE!', '#E0E8FF');
      this.punchAnimTimer = 0;
      this.slashGlowTimer = 22;
      this.slashSwingTimer = 14;
      this.slashSwingMaxTimer = 14;
      this.slashHand = (this.slashHand === 1 ? 0 : 1);
      if ((this._slashSoundCooldown || 0) <= 0) {
        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
        playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.7);
        this._slashSoundCooldown = 12;
      }
      this.cooldownTimer = CONFIG.yuji?.soulSwapDismantleCooldown ?? CONFIG.yuji?.soulSwapDismantleFireRate ?? CONFIG.sukuna?.slashCooldown ?? 24;
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
    if (!this.isSkillEnabled(CONFIG.yuji?.enableDivergentDash, true)) return false;
    if (this.isDead || this.hp <= 0 || (this.divergentDashCooldown || 0) > 0 || this.isDivergentDashing) return false;
    if (this.soulSwapActive || this.soulSwapTransitionTimer > 0 || this.revertTransitionTimer > 0 || (this.rapidSlashHitsLeft || 0) > 0) return false;

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

  get channelTurnRate() {
    if (this.isChannelingDivineFlame) {
      return CONFIG.sukuna?.divineFlameChannelTurnRate ?? 0.045;
    }
    return 0.045;
  }

  isStationarySkillActive() {
    return Boolean(
      this.isChannelingDivineFlame ||
      (this.divineFlameChargeTimer > 0) ||
      (this.divineFlameRecoveryTimer > 0) ||
      (this.rapidSlashHitsLeft > 0) ||
      (this.soulSwapActive && this.rapidSlashPhase !== 'COMPLETE') ||
      (this.soulSwapTransitionTimer > 0) ||
      (this.revertTransitionTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  canAim() {
    if ((this.divineFlameRecoveryTimer || 0) > 0) {
      return false;
    }
    return super.canAim();
  }

  aim(target) {
    if ((this.divineFlameRecoveryTimer || 0) > 0) {
      const lockedAngle = (this.divineFlameCastAngle !== undefined && this.divineFlameCastAngle !== null && !Number.isNaN(this.divineFlameCastAngle))
        ? this.divineFlameCastAngle
        : (this.gunAngle || 0);
      this.divineFlameCastAngle = lockedAngle;
      this.gunAngle = lockedAngle;
      this.angle = lockedAngle;
      return false;
    }

    const aimTarget = target || this.flurryTarget || (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : null);
    const res = super.aim(aimTarget);
    if (this.isChannelingDivineFlame) {
      this.divineFlameCastAngle = this.gunAngle;
      this.angle = this.gunAngle;
    }
    return res;
  }

  triggerSecondarySkill() {
    return this.triggerDivergentDash();
  }

  triggerTertiarySkill() {
    // Reverse Cursed Technique is a passive heal on reverting from Soul Swap
  }


  interruptAttacks(forceCancelAll = false) {
    const isAlive = (this.hp > 0 && !this.isDead && !this.dead && !this._hasDied);
    const inSoulSwap = Boolean((this.soulSwapActive || (this.soulSwapTransitionTimer && this.soulSwapTransitionTimer > 0)) && isAlive);
    const wasInFugaPhase = Boolean(this.isChannelingDivineFlame || this.rapidSlashPhase === 'FUGA_CHANNEL' || this.rapidSlashPhase === 'FUGA_RECOVERY');

    // Save Soul Swap combo state before super.interruptAttacks() resets general properties
    const savedHitsLeft = this.rapidSlashHitsLeft;
    const savedPhase = this.rapidSlashPhase;
    const savedTimer = this.rapidSlashTimer;
    const savedTransitionTimer = this.soulSwapTransitionTimer;
    const savedTarget = this.flurryTarget;

    super.interruptAttacks(forceCancelAll);

    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    const isHardInterrupted = forceCancelAll || (!isMatchEnded && (!isAlive || this.isFrozen || this.isTargetOfAmbush));

    if (inSoulSwap) {
      if (wasInFugaPhase) {
        // Fuga was cancelled mid-channel (e.g. by Pure Love Beam, Toji ambush, or death)
        if (this.fugaSoundKey) {
          stopLoopingSound(this.fugaSoundKey);
          this.fugaSoundKey = null;
        }
        this.isChannelingDivineFlame = false;
        this.divineFlameChargeTimer = 0;
        this.divineFlameRecoveryTimer = 0;
        // Cleanly exit Soul Swap and revert to base form instead of deadlocking!
        this._triggerSoulSwapRevert();
        return;
      }

      // Preserve Soul Swap takeover transition and combo progression
      if (savedTransitionTimer > 0) {
        this.soulSwapTransitionTimer = savedTransitionTimer;
      }
      if (savedPhase && savedPhase !== 'IDLE') {
        this.rapidSlashHitsLeft = (savedPhase === 'COMPLETE') ? 0 : ((savedHitsLeft !== undefined && savedHitsLeft !== null && savedHitsLeft > 0) ? savedHitsLeft : (this.rapidSlashHitsLeft || 5));
        this.rapidSlashPhase = savedPhase;
        this.rapidSlashTimer = savedTimer || 0;
        this.flurryTarget = savedTarget;
      }
      return;
    }

    if (isHardInterrupted) {
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;
      if (this.fugaSoundKey) {
        stopLoopingSound(this.fugaSoundKey);
        this.fugaSoundKey = null;
      }
      this.isChannelingDivineFlame = false;
      this.divineFlameChargeTimer = 0;
      this.divineFlameRecoveryTimer = 0;
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

    // Draw JJK Cursed Energy aura behind him: 'fuga' during Fuga, red during Soul Swap, green during RCT, blue otherwise
    const auraTheme = this.isChannelingDivineFlame ? 'fuga' : (this.soulSwapActive ? 'red' : (this.isChannelingRCT ? 'rct' : 'blue'));
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, auraTheme);

    drawYujiSkin(ctx, this);

    // Draw Fuga Volcanic Magma Flame Arrow Construct in Canvas 2D fallback mode (when WebGL layer is inactive)
    if (this.isChannelingDivineFlame && this.divineFlameChargeTimer > 0 && (!state.pixiApp || !state.pixiLayers?.projectiles)) {
      const progress = Math.min(1.0, this.divineFlameChargeTimer / Math.max(1, this.divineFlameChargeMax || 85));
      const time = Date.now() * 0.012;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Chiaroscuro front light vs shadow
      ctx.save();
      ctx.rotate(this.gunAngle);
      const shadowGrad = ctx.createLinearGradient(this.r * 1.4, 0, -this.r * 1.2, 0);
      shadowGrad.addColorStop(0, `rgba(255, 240, 170, ${0.6 * progress})`);
      shadowGrad.addColorStop(0.35, 'rgba(255, 100, 0, 0)');
      shadowGrad.addColorStop(0.65, `rgba(15, 5, 5, ${0.70 * progress})`);
      shadowGrad.addColorStop(1, `rgba(5, 2, 2, ${0.92 * progress})`);
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Volcanic flame arrow construct
      drawDivineFlameArrowConstruct(ctx, {
        x: 0,
        y: 0,
        angle: this.gunAngle,
        scale: 1.0,
        progress,
        isFlying: false,
        time
      });

      // Cursed Flame Origin Glow (Sukuna hands)
      ctx.save();
      ctx.rotate(this.gunAngle);
      const notchX = -32 * progress;
      ctx.beginPath();
      ctx.arc(notchX, 0, 18 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 50, 0, ${0.3 * progress})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(notchX, 0, 10 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 140, 20, ${0.7 * progress})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(notchX, 0, 5 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 220, ${0.95 * progress})`;
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.soulSwapActive && this.soulSwapTimer <= 0 && !this.isChannelingDivineFlame && (this.divineFlameRecoveryTimer || 0) <= 0) {
      this._triggerSoulSwapRevert();
    }
  }
}

