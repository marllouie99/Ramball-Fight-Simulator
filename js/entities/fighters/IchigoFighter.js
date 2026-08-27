import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics, updateTensaZangetsuChainPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks, spawnParrySparksEffect } from '../../graphics/particles/sparkEffect.js';
import { spawnHollowMaskShatter } from '../../graphics/particles/deathShatterEffect.js';
import { drawIchigoSlashArc } from '../../graphics/weapons/ichigoWeaponGraphics.js';

export class IchigoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ichigo';
    this.type = 'ichigo';
    this.color = '#FF5500'; // Orange theme color for text / highlights
    this.skin = def.skin || (typeof state !== 'undefined' ? (state.selectedIchigoSkin || 'shikai') : 'shikai');

    // Skill & combat states
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = 0;
    this.ultimateCooldown = 0;

    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
    this.hollowMaskFormationTimer = 0;
    this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
    this.hollowBurstTimer = 0;
    this.hollowBurstMax = CONFIG.ichigo?.hollowBurstFrames || 36;

    this.bankaiActive = false;
    this.bankaiTimer = 0;

    // Visuals & Defensive Parry States
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 0;
    this.parryStanceIndex = 0;
    this.blockPoseTimer = 0;
    this.parryHitAnimTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoStartX = 0;
    this.shunpoStartY = 0;
    this.shunpoTargetX = 0;
    this.shunpoTargetY = 0;

    // Shunpo 2-Strike Flurry Combo State
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this._shunpoBaseAngle = 0;

    // Getsuga Tensho Channeling & Slide State
    this.isChannelingGetsuga = false;
    this.isGetsugaSlash = false;
    this.getsugaChargeTimer = 0;
    this.getsugaChargeMax = CONFIG.ichigo?.getsugaChargeFrames || 50;
    this.getsugaSlideTimer = 0;
    this.getsugaRecoveryTimer = 0;
    this.getsugaTarget = null;
    this.shunpoMaxSteps = 2;

    // Bankai Transformation Channeling & Slide State
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiChargeMax = CONFIG.ichigo?.bankaiChargeFrames || 50;
    this.bankaiSlideTimer = 0;
    this.bankaiBurstTimer = 0;
    this.bankaiBurstMax = CONFIG.ichigo?.bankaiBurstFrames || 36;
    this.bankaiRibbonTimer = 0;
    this.bankaiRibbonMax = CONFIG.ichigo?.bankaiRibbonDuration || 280;
    this.bankaiUsed = false;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
  }

  _playSound(key, defaultSfx, defaultVol = 1.0) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (now - lastPlayed < 300) return; // Prevent duplicate rapid audio triggering
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.ichigo?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.ichigo?.soundVolumes?.[key] ?? defaultVol;
    const delay = CONFIG.ichigo?.soundDelays?.[key] ?? 0;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfx, vol, 1.0, 0, delay);
    }
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = 0;
    this.ultimateCooldown = 0;
    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
    this.hollowMaskFormationTimer = 0;
    this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
    this.hollowBurstTimer = 0;
    this.bankaiActive = false;
    this.bankaiTimer = 0;
    this.bankaiUsed = false;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this._winnerBankaiActive = undefined;
    this._winnerHollowMaskActive = undefined;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.parryStanceIndex = 0;
    this.blockPoseTimer = 0;
    this.parryHitAnimTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoMaxSteps = 2;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this.isChannelingGetsuga = false;
    this.isGetsugaSlash = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;
    this.getsugaRecoveryTimer = 0;
    this.getsugaTarget = null;
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
    this.bankaiBurstTimer = 0;
    this.bankaiRibbonTimer = 0;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
  }

  interruptAttacks(forceCancelAll = false) {
    if (this.isChannelingBankai && !forceCancelAll) {
      return; // Hyper-Armor: preserve Bankai transformation from standard attack interrupts
    }
    super.interruptAttacks(forceCancelAll);
    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this.isChannelingGetsuga = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;
    this.getsugaRecoveryTimer = 0;
    this.getsugaTarget = null;
    if (this.isChannelingBankai && forceCancelAll) {
      this.ultimateCooldown = Math.max(this.ultimateCooldown || 0, 180);
    }
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
    if (forceCancelAll) {
      this.bankaiBurstTimer = 0;
      this.bankaiShards = [];
      this.bankaiClothStreamers = [];
    }
  }

  applyKnockback(vx, vy) {
    // Hyper-Armor Immunity: Complete immunity to attack pushback / knockback during Bankai channeling
    if (this.isChannelingBankai) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    super.applyKnockback(vx, vy);
  }

  applyTimeStop(frames) {
    super.applyTimeStop(frames);
    if (!this.isChannelingBankai) {
      this.interruptAttacks(true);
    }
  }

  applyParalysis(duration, opts = {}) {
    if (this.isChannelingBankai && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to paralysis during Bankai transformation unless wall slammed
    }
    if (typeof super.applyParalysis === 'function') super.applyParalysis(duration);
    this.interruptAttacks(true);
  }

  applyHitStun(duration, opts = {}) {
    if (this.isChannelingBankai && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to hit stun during Bankai transformation unless wall slammed
    }
    super.applyHitStun(duration);
    this.interruptAttacks(true);
  }

  applyElectricStun(duration, opts = {}) {
    if (this.isChannelingBankai && !opts?.isWallSlam && !this.isGrabbedByMahoraga && !this.isParalyzedByMahoraga) {
      return; // Hyper-Armor: immune to electric stun during Bankai transformation unless wall slammed
    }
    super.applyElectricStun(duration);
    this.interruptAttacks(true);
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts.isWallSlam || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga) {
      this.interruptAttacks(true);
    }
    return super.takeDamage(amount, attacker, opts);
  }

  _handleTimeStop() {
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.getsugaCooldown > 0) this.getsugaCooldown--;
    if (this.shunpoCooldown > 0) this.shunpoCooldown--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    return super._handleTimeStop();
  }

  getParryChance() {
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let chance = CONFIG.ichigo?.parryChance ?? 0.15;
    if (isBankai && isMask) {
      chance = CONFIG.ichigo?.bankaiHollowParryChance ?? 0.35;
    } else if (isMask) {
      chance = CONFIG.ichigo?.hollowParryChance ?? 0.30;
    } else if (isBankai) {
      chance = CONFIG.ichigo?.bankaiParryChance ?? 0.25;
    }
    if (this.blockPoseTimer > 0) {
      chance += 0.15;
    }
    return Math.min(0.85, chance);
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts.isHeal || amount <= 0) {
      return super.takeDamage(amount, attacker, opts);
    }
    if (this.isDead || this.hp <= 0) {
      return super.takeDamage(amount, attacker, opts);
    }

    // 1. Zanjutsu Parry Check (Blade deflection on incoming attack)
    const isBusy = this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing || this.isFrozen || this.isParalyzed;
    if (!isBusy && !opts.bypassShield && Math.random() < this.getParryChance()) {
      // Successful Parry & Deflection!
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const lastStance = this.parryStanceIndex || 0;
      this.parryStanceIndex = (lastStance + 1 + Math.floor(Math.random() * 3)) % 4;
      this.blockPoseTimer = CONFIG.ichigo?.parryGuardDuration || 45;
      this.parryHitAnimTimer = CONFIG.ichigo?.parryHitAnimDuration || 18;

      if (attacker && !attacker.isDead && typeof this.aim === 'function') {
        this.aim(attacker);
      }

      // Spark calculation along angled parry blade
      const pStance = this.parryStanceIndex;
      let stanceOffset = -1.15;
      if (pStance === 1) stanceOffset = 1.30;
      else if (pStance === 2) stanceOffset = 1.57;
      else if (pStance === 3) stanceOffset = -0.78;

      const bladeAngle = (this.gunAngle || 0) + stanceOffset;
      const sparkX = this.x + Math.cos(bladeAngle) * 45;
      const sparkY = this.y + Math.sin(bladeAngle) * 45;

      if (typeof spawnParrySparksEffect === 'function') {
        spawnParrySparksEffect(sparkX, sparkY);
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(sparkX, sparkY, 12, isBankai ? '#DC143C' : '#00E5FF');
      }

      this._playSound('parry', 'Assets/Sound Effects/Skills/shieldblock2.mp3', 0.85);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3.5, 8);
      }

      // Deflection pushback on melee attacker
      if (attacker && attacker !== this && !attacker.isDead && typeof attacker.applyKnockback === 'function') {
        const pushAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
        const pushF = CONFIG.ichigo?.parryDeflectionPush || 7.0;
        attacker.applyKnockback(Math.cos(pushAngle) * pushF, Math.sin(pushAngle) * pushF);
      }

      spawnFloatingText(this.x, this.y - this.r - 20, "PARRY!", isBankai ? "#DC143C" : "#00E5FF");
      return 0; // Fully deflected / negated damage!
    }

    // 2. Hierro (Iron Skin) Damage Reduction
    let finalAmount = amount;
    if (this.hollowMaskActive) {
      const defRed = CONFIG.ichigo?.hollowDamageReduction ?? 0.20;
      finalAmount = Math.max(1, finalAmount * (1.0 - defRed));
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  _getClosestEnemy() {
    let closest = null;
    let minDist = Infinity;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);
    
    // Check fighters
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = f;
            }
          }
        }
      });
    }
    // Check illusions (Rule #6: Unified queries include illusions)
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          const isEnemy = myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(ill.x - this.x, ill.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = ill;
            }
          }
        }
      });
    }
    return closest;
  }

  aim(opponent) {
    if (this.isChannelingBankai) {
      const target = this._getClosestEnemy();
      if (target && target.hp > 0 && !target.isDead) super.aim(target);
      return;
    }
    if (this.isChannelingGetsuga && this.getsugaTarget && this.getsugaTarget.hp > 0 && !this.getsugaTarget.isDead) {
      super.aim(this.getsugaTarget);
      return;
    }
    if (this.shunpoComboActive && this.shunpoTarget && this.shunpoTarget.hp > 0 && !this.shunpoTarget.isDead) {
      super.aim(this.shunpoTarget);
      return;
    }
    super.aim(opponent);
  }

  activateBankai() {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (this.isChannelingBankai || this.bankaiActive || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0) return;

    // Strict validation: Ensure Bankai condition is genuinely met (HP <= 90% on 1st use, or HP lost >= 20% on subsequent use)
    const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.90;
    const reqDamage = (this.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
    const baseline = this.bankaiRechargeHpBaseline !== undefined ? this.bankaiRechargeHpBaseline : this.hp;
    const damageTaken = Math.max(0, baseline - this.hp);
    const isReady = !this.bankaiUsed ? (this.hp / this.maxHp <= ultThreshold) : (damageTaken >= reqDamage);
    if (!isReady) return;

    this.bankaiUsed = true;
    this.bankaiRechargeHpBaseline = undefined;
    this._maxBankaiPct = 0;
    this.ultimateCooldown = 0;

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    const chargeFrames = CONFIG.ichigo?.bankaiChargeFrames || 50;

    this.isChannelingBankai = true;
    this.bankaiChargeMax = chargeFrames;
    this.bankaiChargeTimer = chargeFrames;
    this.bankaiSlideTimer = 0; // Immediate complete stop (no sliding)

    const chargeText = this.hollowMaskActive ? "BAN... (HOLLOW)" : "BAN...";
    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, "#DC143C");
    this._playSound('bankaiCharge', 'Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
  }

  _releaseBankai() {
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;

    this.bankaiActive = true;
    this.bankaiTimer = CONFIG.ichigo?.bankaiDuration || 800;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.ultimateCooldown = 0;

    this.bankaiBurstMax = CONFIG.ichigo?.bankaiBurstFrames || 36;
    this.bankaiBurstTimer = this.bankaiBurstMax;
    this.bankaiRibbonMax = CONFIG.ichigo?.bankaiRibbonDuration || 280;
    this.bankaiRibbonTimer = this.bankaiRibbonMax;

    // Initialize 28 crystalline Reiatsu barrier diamond shards exploding outward
    this.bankaiShards = [];
    const shardCount = 28;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = 5.0 + Math.random() * 7.5;
      const size = 6.5 + Math.random() * 9.0;
      const rot = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.30;
      let color;
      if (i % 4 === 0) color = '#111111';        // Jet Black void shard
      else if (i % 4 === 1) color = '#DC143C';   // Crimson core
      else if (i % 4 === 2) color = '#FF1E00';   // Fiery red
      else color = '#FF4500';                   // Blazing vermilion edge

      this.bankaiShards.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        rot,
        rotSpeed,
        color,
        life: 1.0
      });
    }

    // Initialize 14 swirling torn Shihakusho black cloth streamers
    this.bankaiClothStreamers = [];
    const streamerCount = 14;
    for (let i = 0; i < streamerCount; i++) {
      const angle = (i / streamerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4.0 + Math.random() * 5.5;
      const length = 18 + Math.random() * 24;
      const width = 3.2 + Math.random() * 2.8;
      this.bankaiClothStreamers.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        length,
        width,
        life: 1.0
      });
    }

    const releaseText = this.hollowMaskActive ? "...KAI! TENSA ZANGETSU (BANKAI + HOLLOW)" : "...KAI! TENSA ZANGETSU";
    spawnFloatingText(this.x, this.y - this.r - 28, releaseText, "#FF1E00");
    this._playSound('bankaiReleaseDomain', 'Assets/Sound Effects/Skills/domainexpansion.mp3', 1.0);
    this._playSound('bankaiReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    this._playSound('bankaiReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.90);
    
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(CONFIG.ichigo?.bankaiScreenShake || 7, 28);
    }
    const shockwaveSize = CONFIG.ichigo?.bankaiAuraShockwaveSize || 95;
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize, 'sukuna');
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize * 0.8, 'gojo');
    spawnImpactFlash(this.x, this.y, 'sukuna');

    // ── Frontal Supersonic Reiatsu Wind Pressure Damage & Knockback Blast ──
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    this._bankaiBurstAngle = aimAngle; // Saved for frontal wind blast rendering
    const reach = CONFIG.ichigo?.bankaiWindReach || 240;
    const arc = ((CONFIG.ichigo?.bankaiWindArc || 140) * Math.PI) / 180;
    const windDmg = CONFIG.ichigo?.bankaiWindDamage || 35;
    const kbForce = CONFIG.ichigo?.bankaiWindKnockback || 14;
    const stunDuration = CONFIG.ichigo?.bankaiWindHitStun || 24;

    const myIndex = state.fighters ? state.fighters.indexOf(this) : -1;
    const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;

    const candidates = [];
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
            candidates.push(f);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
            candidates.push(ill);
          }
        }
      });
    }

    candidates.forEach((enemy) => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.r) {
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - aimAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          // Rule #5: Apply hit pause only to target
          if (typeof enemy.applyTimeStop === 'function') {
            enemy.applyTimeStop(CONFIG.ichigo?.bankaiWindFreezeDuration || 12);
          }
          if (typeof enemy.applyHitStun === 'function') {
            enemy.applyHitStun(stunDuration);
          }

          // Apply frontal wind blast damage and massive knockback push
          applyDamageToTarget(enemy, windDmg, this, { isSkill: true });

          if (typeof enemy.applyKnockback === 'function') {
            enemy.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
          }

          spawnImpactFlash(enemy.x, enemy.y, 'sukuna');
          spawnMeleeClashShockwave(enemy.x, enemy.y, 65, 'sukuna');
          spawnSparks(enemy.x, enemy.y, 8, '#DC143C');

          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(CONFIG.ichigo?.bankaiWindHitScreenShake ?? 6.0, CONFIG.ichigo?.bankaiWindHitShakeDuration ?? 12);
          }
        }
      }
    });
  }

  shoot(ownerIndex) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return false;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return false;
    const target = this._getClosestEnemy();
    if (target) {
      this.aim(target);
      const reach = (CONFIG.ichigo?.swordRange || 70) + target.r;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= reach && this.swordCooldown <= 0 && this.slashSwingTimer <= 0) {
        this.performMeleeCleave(target);
        return true;
      }
    }
    return false;
  }

  triggerDemoAttack() {
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;
    this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }

  fireFinalMassiveGetsuga(target = null) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing) return;

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;

    if (target && target.hp > 0 && !target.isDead) {
      this.getsugaTarget = target;
      this.aim(target);
    } else {
      this.getsugaTarget = this._getClosestEnemy();
      if (this.getsugaTarget) this.aim(this.getsugaTarget);
    }

    const chargeFrames = CONFIG.ichigo?.bankaiFinalGetsugaChargeFrames || 40;
    this.isChannelingGetsuga = true;
    this.isFinalMassiveGetsuga = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = 0;

    spawnFloatingText(this.x, this.y - this.r - 28, "FINAL KUROI GETSUGA...", "#DC143C");
    this._playSound('finalGetsugaCharge', 'Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
    this._playSound('finalGetsugaFuga', 'Assets/Sound Effects/Skills/fuga.mp3', 0.90);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(4.5, 22);
    }
  }

  fireGetsuga(target = null, isCombo = false) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isShunpoDashing) return;

    this.slashSwingTimer = 0;
    this.isGetsugaSlash = false;

    if (target && target.hp > 0 && !target.isDead) {
      this.getsugaTarget = target;
      this.aim(target);
    } else {
      this.getsugaTarget = this._getClosestEnemy();
      if (this.getsugaTarget) this.aim(this.getsugaTarget);
    }

    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;

    let baseChargeFrames = isBankai
      ? (CONFIG.ichigo?.bankaiGetsugaChargeFrames ?? Math.round((CONFIG.ichigo?.getsugaChargeFrames || 100) * 0.35))
      : (CONFIG.ichigo?.getsugaChargeFrames || 100);
    if (isMask) {
      const maskChargeMult = CONFIG.ichigo?.hollowGetsugaChargeMultiplier ?? 0.50;
      baseChargeFrames = Math.round(baseChargeFrames * maskChargeMult);
    }
    const chargeFrames = Math.max(12, baseChargeFrames);
    const slideFrames = isCombo ? 0 : (CONFIG.ichigo?.getsugaSlideFrames || 8);

    this.isChannelingGetsuga = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = slideFrames;

    const chargeText = (isBankai && isMask) ? 'BLACK KUROI GETSUGA...' : (isMask ? 'HOLLOW GETSUGA...' : (isBankai ? 'KUROI GETSUGA...' : 'GETSUGA...'));
    const chargeColor = (isBankai && isMask) ? '#FF1E00' : (isMask ? '#00E5FF' : (isBankai ? '#FF1E32' : '#00D5FF'));

    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, chargeColor);
    this._playSound('getsugaCharge', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.85);
  }

  _releaseGetsuga() {
    this.isChannelingGetsuga = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;

    const isFinal = Boolean(this.isFinalMassiveGetsuga);
    this.isFinalMassiveGetsuga = false;

    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;

    let form = 'shikai';
    let text = '...TENSHO!';
    let textColor = '#00D5FF';
    let shakeAmt = CONFIG.ichigo?.getsugaScreenShake || 3.5;

    if (isFinal) {
      form = 'final_bankai';
      text = '...FINAL KUROI GETSUGA!';
      textColor = '#DC143C';
      shakeAmt = CONFIG.ichigo?.bankaiFinalGetsugaScreenShake || 8.5;
    } else if (isBankai && isMask) {
      form = 'bankai_hollow';
      text = '...BLACK KUROI GETSUGA!';
      textColor = '#FF1E00';
      shakeAmt = CONFIG.ichigo?.bankaiHollowGetsugaScreenShake || 5.5;
    } else if (isMask) {
      form = 'hollow';
      text = '...HOLLOW GETSUGA!';
      textColor = '#00E5FF';
      shakeAmt = CONFIG.ichigo?.hollowGetsugaScreenShake || 5.0;
    } else if (isBankai) {
      form = 'bankai';
      text = '...KUROI GETSUGA!';
      textColor = '#FF1E32';
      shakeAmt = CONFIG.ichigo?.bankaiGetsugaScreenShake || 4.5;
    }

    const baseDmg = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaDamage || 125) * (isMask ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5) : 1.0)
      : (isBankai && isMask
        ? (CONFIG.ichigo?.bankaiHollowGetsugaDamage || Math.round((CONFIG.ichigo?.bankaiGetsugaDamage || 48) * (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)))
        : (isMask
          ? (CONFIG.ichigo?.hollowGetsugaDamage || 50)
          : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDamage || 48) : (CONFIG.ichigo?.getsugaDamage || 32))));
    const baseSpeed = CONFIG.ichigo?.getsugaTravelSpeed ?? CONFIG.ichigo?.getsugaSpeed ?? 11;
    const speed = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaSpeed || 24)
      : (isMask ? (CONFIG.ichigo?.hollowGetsugaSpeed || 22) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSpeed || 22) : baseSpeed));
    const ownerIndex = state.fighters.indexOf(this);

    if (projectileSystem && typeof projectileSystem.fireGetsugaTensho === 'function') {
      projectileSystem.fireGetsugaTensho(this, ownerIndex, baseDmg, speed, form);
    }

    this.isGetsugaSlash = true;
    const slashDur = CONFIG.ichigo?.getsugaSlashDuration || 24;
    this.slashSwingTimer = slashDur;
    this.slashSwingMaxTimer = slashDur;
    let cdMult = 1.0;
    if (isBankai) {
      cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiGetsugaCooldownMultiplier ?? 0.50);
    }
    if (isMask) {
      cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowGetsugaCooldownMultiplier ?? 0.75);
    }
    this.getsugaCooldown = Math.round((CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.getsugaCooldown || 450) * cdMult);

    // Set post-release breather / recovery frames before resuming movement or new attacks
    const recoveryFrames = isBankai 
      ? (CONFIG.ichigo?.bankaiGetsugaRecoveryFrames ?? CONFIG.ichigo?.getsugaRecoveryFrames ?? 24)
      : (CONFIG.ichigo?.getsugaRecoveryFrames ?? 24);
    this.getsugaRecoveryTimer = recoveryFrames;

    // Small kinetic recoil kick
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    const recoil = CONFIG.ichigo?.getsugaRecoil || 3.5;
    this.vx = -Math.cos(aimAngle) * recoil;
    this.vy = -Math.sin(aimAngle) * recoil;

    spawnFloatingText(this.x, this.y - this.r - 28, text, textColor);
    this._playSound('getsugaReleaseSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    this._playSound('getsugaReleaseFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(shakeAmt, 14);
    }

    this.getsugaTarget = null;
  }

  /** Clamps coordinates strictly inside the arena bounds to prevent flash stepping outside arena walls */
  _clampToArena(x, y, r = this.r) {
    const arenaObj = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (!arenaObj) return { x, y };

    const margin = r + 6;

    // Handle circular arena if present
    if (arenaObj.radius) {
      const dx = x - (arenaObj.x || 0);
      const dy = y - (arenaObj.y || 0);
      const dist = Math.hypot(dx, dy);
      const maxDist = arenaObj.radius - margin;
      if (dist > maxDist && dist > 0) {
        return {
          x: (arenaObj.x || 0) + (dx / dist) * maxDist,
          y: (arenaObj.y || 0) + (dy / dist) * maxDist
        };
      }
      return { x, y };
    }

    // Standard rectangular arena (x, y, width, height)
    const minX = (arenaObj.x || 0) + margin;
    const maxX = (arenaObj.x || 0) + (arenaObj.width || 800) - margin;
    const minY = (arenaObj.y || 0) + margin;
    const maxY = (arenaObj.y || 0) + (arenaObj.height || 600) - margin;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  performShunpoStrike(target) {
    this.performShunpoGetsugaCombo(target);
  }

  performShunpoGetsugaCombo(target) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return;
    if (!target || target.hp <= 0) return;
    const baseAngle = Math.atan2(this.y - target.y, this.x - target.x);
    
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let maxStrikes = isBankai 
      ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
      : (CONFIG.ichigo?.shunpoStrikes || 2);
    if (isMask) {
      const maskStrikeMult = CONFIG.ichigo?.hollowShunpoStrikesMultiplier || 1.5;
      maxStrikes = Math.round(maxStrikes * maskStrikeMult);
    }
    let cdMult = 1.0;
    if (isBankai) {
      cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? 0.50);
    }
    if (isMask) {
      cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowShunpoCooldownMultiplier ?? 0.75);
    }

    const cd = Math.round((CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.shunpoCooldown || 450) * cdMult);
    this.shunpoCooldown = cd;
    this.getsugaCooldown = cd;

    this.shunpoTarget = target;
    this.shunpoComboActive = true;
    this.shunpoComboStep = 1;
    this.shunpoMaxSteps = maxStrikes;
    this.isShunpoDisengaging = false;
    this.shunpoDisengageDelayTimer = 0;
    this._shunpoBaseAngle = baseAngle;

    const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

    // Flash step 1: Target flank angle 1 (+110° / +1.92 rad offset)
    const angle1 = baseAngle + 1.92;
    const startClamped = this._clampToArena(this.x, this.y);
    this.shunpoStartX = startClamped.x;
    this.shunpoStartY = startClamped.y;
    const rawTx = target.x + Math.cos(angle1) * offset;
    const rawTy = target.y + Math.sin(angle1) * offset;
    const targetClamped = this._clampToArena(rawTx, rawTy);

    this.shunpoTargetX = targetClamped.x;
    this.shunpoTargetY = targetClamped.y;

    this.isShunpoDashing = true;
    this.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

    spawnFloatingText(this.x, this.y - this.r - 20, isBankai ? 'TENSA SHUNPO!' : 'SHUNPO!', isBankai ? '#DC143C' : '#FFFFFF');
    this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);
  }

  performMeleeCleave(target) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || this.wallSlamPinnedX !== undefined || this.isWallSlammed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return;
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    let damageMult = 1.0;
    if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
    if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
    const baseDamage = CONFIG.ichigo?.swordDamage || 16;
    const finalDamage = baseDamage * damageMult;

    let baseCooldown = CONFIG.ichigo?.swordCooldown || 30;
    if (isMask) {
      const maskCdMult = CONFIG.ichigo?.hollowSwordCooldownMultiplier || 0.65;
      baseCooldown = Math.round(baseCooldown * maskCdMult);
    }
    this.swordCooldown = baseCooldown;
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;

    this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

    // Rule #7: Frontal Arc Radius AOE for Melee Weapon Users
    const arc = ((CONFIG.ichigo?.swordArc || 140) * Math.PI) / 180;
    const reach = CONFIG.ichigo?.swordRange || 70;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);

    // Check all valid targets (fighters & illusions)
    const candidates = [];
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
            candidates.push(f);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
            candidates.push(ill);
          }
        }
      });
    }

    candidates.forEach((enemy) => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.r) {
        // Calculate angle relative to aim direction
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - this.gunAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          // Rule #5: ALWAYS apply hit-pause/time-stop exclusively to the target, NEVER to the attacker
          if (typeof enemy.applyTimeStop === 'function') {
            enemy.applyTimeStop(CONFIG.ichigo?.swordFreezeDuration || 8);
          }

          // Deal damage and knockback
          applyDamageToTarget(enemy, finalDamage, this, { isMelee: true });

          // Hollow Mask Lifesteal (High-Speed Regeneration)
          if (isMask && finalDamage > 0) {
            const healPercent = CONFIG.ichigo?.hollowLifesteal ?? 0.15;
            const healAmount = Math.round(finalDamage * healPercent);
            if (healAmount > 0 && this.hp < this.maxHp) {
              this.hp = Math.min(this.maxHp, this.hp + healAmount);
              this._lastHealAmount = healAmount;
              this._healthBarHealTimer = 16;
              spawnFloatingText(this.x + (Math.random() - 0.5) * 16, this.y - this.r - 12, `+${healAmount}`, "#00FF66");
            }
          }
          
          const kbForce = CONFIG.ichigo?.knockback || 6;
          enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);
          
          spawnImpactFlash(enemy.x, enemy.y, isMask ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(enemy.x, enemy.y, CONFIG.ichigo?.swordShockwaveSize || 35, isMask ? 'sukuna' : 'gojo');

          if (typeof triggerGlobalScreenShake === 'function') {
            const shakeIntensity = isMask
              ? (CONFIG.ichigo?.hollowSwordHitScreenShake ?? 4.5)
              : (isBankai ? (CONFIG.ichigo?.bankaiSwordHitScreenShake ?? 4.0) : (CONFIG.ichigo?.swordHitScreenShake ?? 3.0));
            const shakeDuration = CONFIG.ichigo?.swordHitShakeDuration ?? 6;
            triggerGlobalScreenShake(shakeIntensity, shakeDuration);
          }
        }
      }
    });
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      return;
    }

    // Update afterimages (fades even if frozen)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.blockPoseTimer > 0) this.blockPoseTimer--;
    // Update Zangetsu ribbon & Bankai chain physics & anchor (keeps them seamlessly locked to pommel even when frozen)
    updateZangetsuRibbonPhysics(this);
    updateTensaZangetsuChainPhysics(this);

    // Rule #1: At the top of EVERY fighter update() method, freeze/time-stop guard checks
    const isWallSlammed = Boolean(
      this.isGrabbedByMahoraga ||
      this.isParalyzedByMahoraga ||
      this.isWallSlammed ||
      (this.paralyzeTimer && this.paralyzeTimer > 0)
    );

    const isFrozen = this._handleTimeStop() || 
      this.isFrozenByInfinity || 
      this.isTargetOfAmbush || 
      this.isParalyzed ||
      isWallSlammed ||
      (this.timeStopTimer && this.timeStopTimer > 0) ||
      (this.statusEffects && this.statusEffects.timeStopTimer > 0) ||
      (this.electricStunTimer && this.electricStunTimer > 0) ||
      (this.paralyzeTimer && this.paralyzeTimer > 0) ||
      (this.hitStunTimer && this.hitStunTimer > 0);

    if (isFrozen) {
      this.interruptAttacks(true);
      return;
    }

    // Zero out movement velocity if performing Shunpo combo, static Getsuga charge, Bankai transformation, or Hollow Mask transformation
    const isTransformingHollow = Boolean(this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0);
    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || this.isChannelingBankai || this.bankaiBurstTimer > 0 || isTransformingHollow) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    } else if (this.getsugaRecoveryTimer > 0) {
      // Smooth deceleration during post-Getsuga follow-through recovery breather
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    // Update active speed multipliers (combines Bankai and Hollow Mask form boosts)
    let speedMult = 1.0;
    if (this.bankaiActive) {
      speedMult *= (CONFIG.ichigo?.bankaiSpeedMultiplier || 1.5);
    }
    if (this.hollowMaskActive) {
      speedMult *= (CONFIG.ichigo?.hollowSpeedMultiplier || 1.4);
    }
    this.speedMultiplier = speedMult;

    super.update(opponent, ownerIndex, arena);

    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || this.isChannelingBankai || this.bankaiBurstTimer > 0 || isTransformingHollow) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    } else if (this.getsugaRecoveryTimer > 0) {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    // Frame-by-frame decay of supersonic speed afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (ai) => {
        ai.timer--;
        return ai.timer > 0;
      });
    }

    // Bankai Transformation Channeling (Complete Physical Immobility & Pushback/Knockback Immunity)
    if (this.isChannelingBankai) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.bankaiSlideTimer = 0;

      // Sparking crimson/black spiritual pressure motes
      if (Math.random() < 0.7) {
        spawnSparks(this.x, this.y, 2, Math.random() < 0.5 ? '#FF0000' : '#111111');
      }

      const enemy = this._getClosestEnemy();
      if (enemy && enemy.hp > 0 && !enemy.isDead) {
        this.aim(enemy);
      }

      this.bankaiChargeTimer--;
      if (this.bankaiChargeTimer <= 0) {
        this._releaseBankai();
      }
      return;
    }

    // Getsuga Tensho Channeling & Slide Physics
    if (this.isChannelingGetsuga) {
      if (this.getsugaSlideTimer > 0) {
        this.getsugaSlideTimer--;
        const damping = CONFIG.ichigo?.getsugaSlideDamping || 0.72;
        this.vx *= damping;
        this.vy *= damping;
        if (Math.random() < 0.6) {
          spawnSparks(this.x, this.y + this.r * 0.7, 2, '#FFFFFF');
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      if (this.getsugaTarget && this.getsugaTarget.hp > 0 && !this.getsugaTarget.isDead) {
        this.aim(this.getsugaTarget);
      }

      this.getsugaChargeTimer--;
      if (this.getsugaChargeTimer <= 0) {
        this._releaseGetsuga();
      }
      return;
    }

    // Bankai 3D Ribbon Lifecycle: immediately active on release and slowly decays
    if (this.bankaiRibbonTimer > 0) {
      this.bankaiRibbonTimer--;
    }

    // Bankai Post-Release Burst & Crystalline Shards / Cloth Streamers Update (Complete Immobility & Skill Lock during Burst)
    if (this.bankaiBurstTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.bankaiSlideTimer = 0;

      this.bankaiBurstTimer--;
      if (this.bankaiShards && this.bankaiShards.length > 0) {
        fastCleanArray(this.bankaiShards, (shard) => {
          shard.x += shard.vx;
          shard.y += shard.vy;
          shard.vx *= 0.93;
          shard.vy *= 0.93;
          shard.rot += shard.rotSpeed;
          shard.life = this.bankaiBurstTimer / this.bankaiBurstMax;
          return this.bankaiBurstTimer > 0;
        });
      }
      if (this.bankaiClothStreamers && this.bankaiClothStreamers.length > 0) {
        fastCleanArray(this.bankaiClothStreamers, (st) => {
          st.x += st.vx;
          st.y += st.vy;
          st.vx *= 0.92;
          st.vy *= 0.92;
          st.angle += 0.05;
          st.life = this.bankaiBurstTimer / this.bankaiBurstMax;
          return this.bankaiBurstTimer > 0;
        });
      }
      if (Math.random() < 0.50) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 2, this.y + (Math.random() - 0.5) * this.r * 2, 2, Math.random() < 0.5 ? '#FF1E00' : '#00E5FF');
      }

      // Lock fighter from moving / taking action / triggering skills until burst animation fully finishes
      return;
    }

    // Slash swing animation timer
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      if (this.slashSwingTimer <= 0) {
        this.isGetsugaSlash = false;
      }
    }

    // Hollow Mask Passive Activation (Activates under 30% HP in both Shikai and Bankai)
    if (!this.hollowMaskUsed && this.hp / this.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold || 0.30)) {
      this.interruptAttacks(); // Cancel any ongoing attack/dash to lock in place
      this.hollowMaskUsed = true;
      this.hollowMaskActive = true;
      this.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration || 600;
      this.hollowMaskFormationTimer = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
      this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
      this.hollowBurstTimer = CONFIG.ichigo?.hollowBurstFrames || 36;
      this.hollowBurstMax = CONFIG.ichigo?.hollowBurstFrames || 36;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const text = isBankai ? "BANKAI + HOLLOW AWAKENING!" : "HOLLOW AWAKENING!";
      spawnFloatingText(this.x, this.y - this.r - 28, text, "#FF1E00");
      this._playSound('hollowAwakenFlame', 'Assets/Sound Effects/Skills/fuga.mp3', 0.95);
      this._playSound('hollowAwakenFlare', 'Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(isBankai ? 4.5 : 3.5, 18);
      }
    }

    // Hollow Mask Formation & Sky Burst Immobility Lock (Freezes movement and actions until transformation visual finishes)
    if (this.hollowMaskFormationTimer > 0 || this.hollowBurstTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      if (this.hollowBurstTimer > 0) {
        this.hollowBurstTimer--;
      }
      if (this.hollowMaskFormationTimer > 0) {
        this.hollowMaskFormationTimer--;
      }

      // Micro-spark emission during mask formation
      if (Math.random() < 0.40) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 1.6, this.y - this.r * 0.3 + (Math.random() - 0.5) * this.r * 1.6, 2, Math.random() < 0.5 ? '#FFFFFF' : '#111111');
      }

      // Lock fighter from moving / taking action / triggering skills until the transformation visual is completely done
      return;
    }

    const isMatchEnded = Boolean(typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || state.gameState === 'champion'));

    // Hollow Mask expiration (frozen during victory/champion screens so pose never reverts)
    if (this.hollowMaskActive && !isMatchEnded) {
      this.hollowMaskTimer--;

      // Micro-spark emission during the final cracking phase
      if (this.hollowMaskTimer < 60 && Math.random() < 0.28) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r, this.y - this.r * 0.3 + (Math.random() - 0.5) * this.r, 1, Math.random() < 0.5 ? '#DC143C' : '#FFFFFF');
      }

      if (this.hollowMaskTimer <= 0) {
        this.hollowMaskActive = false;
        spawnHollowMaskShatter(this);
        spawnFloatingText(this.x, this.y - this.r - 28, "MASK SHATTERED!", "#FFFFFF");
        spawnSparks(this.x, this.y, 14, '#DC143C');
        spawnSparks(this.x, this.y, 8, '#111111');
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(3.5, 16);
        }
      }
    }

    // Bankai (Ultimate) Active Loop (frozen during victory/champion screens so pose never reverts)
    if (this.bankaiActive) {
      if (!isMatchEnded) {
        this.bankaiTimer--;

        // Bankai Finale: Unleash Massive Final Kuroi Getsuga Tensho before Bankai ends
        const finalTriggerThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 90;
        if (!this.bankaiFinalGetsugaTriggered && this.bankaiTimer <= finalTriggerThreshold && !this.isChannelingGetsuga) {
          this.bankaiFinalGetsugaTriggered = true;
          this.interruptAttacks();
          const enemy = this._getClosestEnemy();
          if (enemy && enemy.hp > 0 && !enemy.isDead) {
            this.aim(enemy);
          }
          this.fireFinalMassiveGetsuga(enemy);
        }

        if (this.bankaiTimer <= 0) {
          this.bankaiActive = false;
          this.bankaiUsed = true;
          this.bankaiRechargeHpBaseline = this.hp; // Snapshot HP baseline upon Bankai expiration
          this._maxBankaiPct = 0;
          this.ultimateCooldown = 0;
          spawnFloatingText(this.x, this.y - this.r - 28, "BANKAI ENDED", "#FFFFFF");
          this._playSound('bankaiEnded', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
        }
      }

      // Bankai supersonic black-crimson speed afterimages
      if (Math.random() < 0.45 && !isMatchEnded) {
        const arenaObj = arena || (typeof state !== 'undefined' ? state.arena : null);
        let aiX = this.x;
        let aiY = this.y;
        if (arenaObj && arenaObj.radius) {
          const dx = aiX - arenaObj.x;
          const dy = aiY - arenaObj.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = arenaObj.radius - this.r - 2;
          if (dist > maxDist && dist > 0) {
            aiX = arenaObj.x + (dx / dist) * maxDist;
            aiY = arenaObj.y + (dy / dist) * maxDist;
          }
        }

        pushTrailCap(this.afterImages, {
          x: aiX,
          y: aiY,
          r: this.r,
          angle: this.angle,
          color: (Math.random() < 0.5) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(220, 20, 20, 0.55)',
          strokeColor: 'rgba(220, 20, 20, 0.90)',
          isBankai: true,
          timer: 16,
          maxTimer: 16
        }, 14);
      }
    }

    // Shunpo Dashing Physics & Flurry Combos
    if (this.isShunpoDashing) {
      this.shunpoDashTimer--;
      
      const dashMax = this.isShunpoDisengaging 
        ? (CONFIG.ichigo?.comboDisengageDashFrames || 3) 
        : (CONFIG.ichigo?.shunpoDashDuration || 4);
      const p = 1 - (this.shunpoDashTimer / Math.max(1, dashMax));
      const curX = this.shunpoStartX + (this.shunpoTargetX - this.shunpoStartX) * p;
      const curY = this.shunpoStartY + (this.shunpoTargetY - this.shunpoStartY) * p;
      const clampedCur = this._clampToArena(curX, curY);
      this.x = clampedCur.x;
      this.y = clampedCur.y;
      this.vx = 0;
      this.vy = 0;

      // Spawn manga action speed lines / afterimages (Rule #16) behind him
      const isMask = this.hollowMaskActive;
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const aiClamped = this._clampToArena(this.x, this.y, this.r - 2);

      pushTrailCap(this.afterImages, {
        x: aiClamped.x,
        y: aiClamped.y,
        r: this.r,
        angle: this.angle,
        color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
        strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
        isBankai: (isBankai || isMask),
        timer: 16,
        maxTimer: 16
      }, 12);

      if (this.shunpoDashTimer <= 0) {
        this.isShunpoDashing = false;
        const finalClamped = this._clampToArena(this.shunpoTargetX, this.shunpoTargetY);
        this.x = finalClamped.x;
        this.y = finalClamped.y;
        
        const target = this.shunpoTarget;

        if (this.isShunpoDisengaging) {
          // ── Disengage Flash Step Completed: Seamlessly unleash Getsuga Tensho ──
          this.isShunpoDisengaging = false;
          this.shunpoComboActive = false;
          if (target && target.hp > 0 && !target.isDead) {
            this.aim(target);
            this.fireGetsuga(target, true);
          } else {
            this.shunpoTarget = null;
          }
          return;
        }

        if (target && target.hp > 0 && !target.isDead) {
          // Rule #3: Always update aim(target) immediately after teleport
          this.aim(target);

          const isBankai = this.bankaiActive || this.skin === 'bankai';
          const isMask = this.hollowMaskActive;
          let damageMult = 1.0;
          if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
          if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
          const baseSlashDmg = CONFIG.ichigo?.shunpoStrike1Damage || 20;
          let defaultStrikes = isBankai 
            ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
            : (CONFIG.ichigo?.shunpoStrikes || 2);
          if (isMask) {
            defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier || 1.5));
          }
          const maxSteps = this.shunpoMaxSteps || defaultStrikes;

          if (this.shunpoComboStep < maxSteps) {
            // ── Intermediate Flurry Strike (Step k of N) ──
            const s1Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike1Duration || 10) : (CONFIG.ichigo?.shunpoStrike1SlashDuration || 14);
            this.slashSwingTimer = s1Duration;
            this.slashSwingMaxTimer = s1Duration;
            this._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

            // Allow enemies (like Mahoraga) to react, rotate aim, and retaliate during the combo
            if (typeof target.applyHitStun === 'function') {
              target.applyHitStun(2);
            }

            // Deal intermediate strike damage
            applyDamageToTarget(target, baseSlashDmg * damageMult, this, { isSkill: true });
            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            this._playSound('shunpoStrikeHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.75);
            if (typeof triggerGlobalScreenShake === 'function') {
              const strikeShake = isBankai
                ? (CONFIG.ichigo?.bankaiShunpoStrike1ScreenShake ?? 3.5)
                : (CONFIG.ichigo?.shunpoStrike1ScreenShake ?? 2.5);
              const strikeDur = CONFIG.ichigo?.shunpoStrike1ShakeDuration ?? 6;
              triggerGlobalScreenShake(strikeShake, strikeDur);
            }

            // Set delay before triggering next Flash Step
            this.shunpoComboDelayTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiShunpoComboDelayFrames || 5) 
              : (CONFIG.ichigo?.shunpoComboDelayFrames || 8);
          } else {
            // ── Final Finisher Strike (Step N of N) ──
            const s2Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike2Duration || 14) : (CONFIG.ichigo?.shunpoStrike2SlashDuration || 16);
            this.slashSwingTimer = s2Duration;
            this.slashSwingMaxTimer = s2Duration;
            this._playSound('shunpoFinisherSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);

            // Deal final finisher damage & knockback
            const strike2Mult = CONFIG.ichigo?.shunpoStrike2Multiplier || 1.35;
            const finisherDmg = baseSlashDmg * strike2Mult * damageMult;
            applyDamageToTarget(target, finisherDmg, this, { isSkill: true });
            const finStun = isBankai ? (CONFIG.ichigo?.bankaiShunpoStunDuration || 8) : (CONFIG.ichigo?.shunpoStrike2StunDuration || 8);
            target.applyHitStun(finStun);

            const aimAngle = this.gunAngle || 0;
            const kbForce = CONFIG.ichigo?.shunpoStrike2Knockback || 7;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
            }

            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            spawnMeleeClashShockwave(target.x, target.y, CONFIG.ichigo?.shunpoShockwaveSize || 45, (isBankai || isMask) ? 'sukuna' : 'gojo');
            this._playSound('shunpoFinisherHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.9);
            if (typeof triggerGlobalScreenShake === 'function') {
              const finShake = isBankai
                ? (CONFIG.ichigo?.bankaiShunpoFinisherScreenShake ?? 5.5)
                : (isMask ? (CONFIG.ichigo?.hollowShunpoFinisherScreenShake ?? 5.0) : (CONFIG.ichigo?.shunpoScreenShake ?? 4.0));
              const finDur = CONFIG.ichigo?.shunpoFinisherShakeDuration ?? 10;
              triggerGlobalScreenShake(finShake, finDur);
            }

            // Immediately schedule the Disengage Back-Step Flash Step!
            this.shunpoDisengageDelayTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDelayFrames || 5) 
              : (CONFIG.ichigo?.comboDisengageDelayFrames || 7);
          }
        } else {
          this.shunpoComboActive = false;
          this.shunpoTarget = null;
        }
      }
      return;
    }

    // Advance Shunpo Flurry Combo or Trigger Disengage Back-Step
    if (this.shunpoComboActive && this.shunpoTarget) {
      const isBankai = this.bankaiActive || this.skin === 'bankai';
      const isMask = this.hollowMaskActive;
      let defaultStrikes = isBankai 
        ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
        : (CONFIG.ichigo?.shunpoStrikes || 2);
      if (isMask) {
        defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier || 1.5));
      }
      const maxSteps = this.shunpoMaxSteps || defaultStrikes;
      
      // Check Disengage Back-Step trigger
      if (this.shunpoComboStep >= maxSteps && this.shunpoDisengageDelayTimer > 0) {
        this.shunpoDisengageDelayTimer--;
        if (this.shunpoDisengageDelayTimer <= 0) {
          const target = this.shunpoTarget;
          if (target && target.hp > 0 && !target.isDead) {
            const isBankai = this.bankaiActive || this.skin === 'bankai';
            const backAngle = Math.atan2(this.y - target.y, this.x - target.x);
            const disengageDist = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDistance || CONFIG.ichigo?.comboDisengageDistance || 350) 
              : (CONFIG.ichigo?.comboDisengageDistance || 290);

            const startClamped = this._clampToArena(this.x, this.y);
            this.shunpoStartX = startClamped.x;
            this.shunpoStartY = startClamped.y;
            const rawTx = target.x + Math.cos(backAngle) * disengageDist;
            const rawTy = target.y + Math.sin(backAngle) * disengageDist;
            const targetClamped = this._clampToArena(rawTx, rawTy);

            this.shunpoTargetX = targetClamped.x;
            this.shunpoTargetY = targetClamped.y;
            this.isShunpoDashing = true;
            this.isShunpoDisengaging = true;
            this.shunpoDashTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiComboDisengageDashFrames || 3) 
              : (CONFIG.ichigo?.comboDisengageDashFrames || 3);

            spawnFloatingText(this.x, this.y - this.r - 20, isBankai ? 'TENSA STEP!' : 'FLASH STEP!', isBankai ? '#DC143C' : '#00D5FF');
            this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.95);
            return;
          } else {
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        }
      } else if (this.shunpoComboStep < maxSteps && this.shunpoComboDelayTimer > 0) {
        this.shunpoComboDelayTimer--;
        if (this.shunpoComboDelayTimer <= 0) {
          const target = this.shunpoTarget;
          if (target && target.hp > 0 && !target.isDead) {
            this.shunpoComboStep++;
            const isBankai = this.bankaiActive || this.skin === 'bankai';
            
            // Multi-angle supersonic flash steps around target:
            // Sector offsets for 6-step blitz: [+110°, -110°, +160°, -40°, +40°, 180°]
            const angleOffsets = [0, 1.92, -1.92, 2.80, -0.70, 0.70, 3.14];
            const baseAngle = this._shunpoBaseAngle !== undefined ? this._shunpoBaseAngle : Math.atan2(this.y - target.y, this.x - target.x);
            const stepAng = baseAngle + (angleOffsets[this.shunpoComboStep] !== undefined ? angleOffsets[this.shunpoComboStep] : (this.shunpoComboStep * 1.8));
            const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

            const startClamped = this._clampToArena(this.x, this.y);
            this.shunpoStartX = startClamped.x;
            this.shunpoStartY = startClamped.y;
            const rawTx = target.x + Math.cos(stepAng) * offset;
            const rawTy = target.y + Math.sin(stepAng) * offset;
            const targetClamped = this._clampToArena(rawTx, rawTy);

            this.shunpoTargetX = targetClamped.x;
            this.shunpoTargetY = targetClamped.y;

            this.isShunpoDashing = true;
            this.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

            const isFinalStep = this.shunpoComboStep === maxSteps;
            const labels = ['', 'FLANK SLASH!', 'CROSS STRIKE!', 'LIGHTNING FLASH!', 'SHADOW PIERCE!', 'TENSA BLITZ!', 'CROSS SLASH!'];
            const stepText = isFinalStep ? 'CROSS SLASH!' : (labels[this.shunpoComboStep] || 'FLASH STRIKE!');
            spawnFloatingText(this.x, this.y - this.r - 20, stepText, isBankai ? '#DC143C' : '#FFD700');
            this._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', isBankai ? 0.95 : 0.9);
            return;
          } else {
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        }
      }
    }

    // Post-Getsuga Breather Recovery Timer
    if (this.getsugaRecoveryTimer > 0) {
      this.getsugaRecoveryTimer--;
    }

    // Stop all external movement / AI decisions during active Shunpo combo, Getsuga channeling, or post-Getsuga recovery breather
    if (this.shunpoComboActive || this.isShunpoDashing || this.isChannelingGetsuga || this.isChannelingBankai || this.getsugaRecoveryTimer > 0 || this.isGrabbedByMahoraga || this.isParalyzedByMahoraga || this.wallSlamPinnedX !== undefined || this.isWallSlammed) {
      return;
    }

    // AI Logic (autonomous decision making)
    if (!this.playerControlled) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // 1. Trigger Ultimate: Bankai Awakening (Based strictly on HP lost!)
        const ultThreshold = CONFIG.ichigo?.ultimateThreshold ?? 0.90;
        const reqDamage = (this.maxHp || 240) * (CONFIG.ichigo?.bankaiRechargeHpRatio ?? 0.20);
        const baseline = this.bankaiRechargeHpBaseline !== undefined ? this.bankaiRechargeHpBaseline : this.hp;
        const damageTaken = Math.max(0, baseline - this.hp);

        const isFirstTrigger = (!this.bankaiUsed && (this.hp / this.maxHp <= ultThreshold));
        const isSubsequentTrigger = (this.bankaiUsed && (damageTaken >= reqDamage));

        const canBankai = !this.bankaiActive && !this.isChannelingBankai && (isFirstTrigger || isSubsequentTrigger);
        if (canBankai) {
          this.activateBankai();
        }

        // 2. Trigger Unified Skill Combo: Shunpo Getsuga Blitz (Flash Step Flurry -> Disengage Back-Step -> Getsuga Tensho)
        const isBankai = this.bankaiActive || this.skin === 'bankai';
        const comboMin = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMinDist ?? 0) : (CONFIG.ichigo?.comboTriggerMinDist ?? 0);
        const comboMax = isBankai ? (CONFIG.ichigo?.bankaiComboTriggerMaxDist || 400) : (CONFIG.ichigo?.comboTriggerMaxDist || 400);
        if (this.shunpoCooldown <= 0 && dist >= comboMin && dist <= comboMax) {
          this.performShunpoGetsugaCombo(target);
          this.aim(target); // Rule #3: aim immediately after teleport
          return;
        }

        // 3. Melee attacks (Tensa Zangetsu cleave)
        const reach = CONFIG.ichigo?.swordRange || 70;
        if (dist <= reach + target.r && this.swordCooldown <= 0) {
          this.performMeleeCleave(target);
        }
      }
    }
  }

  // Helper to calculate distance from point to segment
  _distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  drawBody(ctx) {
    // Handled in drawYujiSkin style inline or via ichigoSkin.js
    drawIchigoSkin(ctx, this);
  }

  drawGun(ctx) {
    // Override to prevent drawing the default gun barrel and hands
  }

  drawOutline(ctx) {
    // No-op: ichigoSkin already renders the crisp 3px body stroke aligned with body shift/tilt
  }

  draw(ctx) {
    // Render afterimages with smooth alpha decay and arena boundary clipping
    if (this.afterImages && this.afterImages.length > 0) {
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
      ctx.save();

      // Clip afterimage drawing strictly within arena boundaries so edges never poke through arena walls
      if (arena) {
        if (arena.radius) {
          ctx.beginPath();
          ctx.arc(arena.x, arena.y, arena.radius - 1, 0, Math.PI * 2);
          ctx.clip();
        } else if (arena.width && arena.height) {
          ctx.beginPath();
          ctx.rect(arena.x, arena.y, arena.width, arena.height);
          ctx.clip();
        }
      }

      for (let i = 0; i < this.afterImages.length; i++) {
        const ai = this.afterImages[i];
        if (!ai || ai.timer <= 0) continue;
        const life = Math.max(0, Math.min(1, ai.timer / (ai.maxTimer || 16)));
        if (life <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = life * 0.55;
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle || 0);

        // Afterimage body fill
        ctx.fillStyle = ai.color || 'rgba(12, 4, 10, 0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, ai.r, 0, Math.PI * 2);
        ctx.fill();

        // Bankai / Mask glowing crimson outer aura border
        if (ai.strokeColor || ai.isBankai) {
          ctx.strokeStyle = ai.strokeColor || 'rgba(220, 20, 20, 0.90)';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        ctx.restore();
      }
      ctx.restore();
    }

    // Render dynamic crescent blade slash arc
    drawIchigoSlashArc(ctx, this);

    super.draw(ctx);
  }
}
