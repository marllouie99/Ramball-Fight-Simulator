import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
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

    this.bankaiActive = false;
    this.bankaiTimer = 0;

    // Visuals
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 0;
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
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.bankaiShards = [];
    this.bankaiClothStreamers = [];
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
    this.bankaiActive = false;
    this.bankaiTimer = 0;
    this.bankaiUsed = false;
    this.bankaiFinalGetsugaTriggered = false;
    this.isFinalMassiveGetsuga = false;
    this.afterImages = [];
    this.slashSwingTimer = 0;
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

  applyHitStun(duration) {
    if (this.isChannelingBankai) {
      return; // Hyper-Armor: immune to hit stun during Bankai transformation
    }
    super.applyHitStun(duration);
    this.interruptAttacks(true);
  }

  applyElectricStun(duration) {
    if (this.isChannelingBankai) {
      return; // Hyper-Armor: immune to electric stun during Bankai transformation
    }
    super.applyElectricStun(duration);
    this.interruptAttacks(true);
  }

  applyParalysis(duration) {
    if (this.isChannelingBankai) {
      return; // Hyper-Armor: immune to paralysis during Bankai transformation
    }
    if (typeof super.applyParalysis === 'function') super.applyParalysis(duration);
    this.interruptAttacks(true);
  }

  _handleTimeStop() {
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.getsugaCooldown > 0) this.getsugaCooldown--;
    if (this.shunpoCooldown > 0) this.shunpoCooldown--;
    return super._handleTimeStop();
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
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.bankaiUsed || this.isChannelingBankai || this.bankaiActive) return;

    this.bankaiUsed = true;

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

    spawnFloatingText(this.x, this.y - this.r - 28, "BAN...", "#DC143C");
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
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

    spawnFloatingText(this.x, this.y - this.r - 28, "...KAI! TENSA ZANGETSU", "#FF1E00");
    audioSystem.playSFX('Assets/Sound Effects/Skills/domainexpansion.mp3', 1.0);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    audioSystem.playSFX('Assets/Sound Effects/SkillEffects/flare.mp3', 0.90);
    
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
        }
      }
    });
  }

  shoot(ownerIndex) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return false;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return false;
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
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }

  fireFinalMassiveGetsuga(target = null) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.isShunpoDashing) return;

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
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
    audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.90);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(4.5, 22);
    }
  }

  fireGetsuga(target = null, isCombo = false) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.isShunpoDashing) return;

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

    const chargeFrames = isBankai
      ? (CONFIG.ichigo?.bankaiGetsugaChargeFrames ?? Math.round((CONFIG.ichigo?.getsugaChargeFrames || 100) * 0.35))
      : (CONFIG.ichigo?.getsugaChargeFrames || 100);
    const slideFrames = isCombo ? 0 : (CONFIG.ichigo?.getsugaSlideFrames || 8);

    this.isChannelingGetsuga = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = slideFrames;

    const chargeText = isMask ? 'BLACK GETSUGA...' : (isBankai ? 'KUROI GETSUGA...' : 'GETSUGA...');
    const chargeColor = isMask ? '#FF1E00' : (isBankai ? '#DC143C' : '#00D5FF');

    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, chargeColor);
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 0.85);
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
    let shakeAmt = CONFIG.ichigo?.getsugaScreenShake || 3;

    if (isFinal) {
      form = 'final_bankai';
      text = '...FINAL KUROI GETSUGA!';
      textColor = '#DC143C';
      shakeAmt = CONFIG.ichigo?.bankaiFinalGetsugaScreenShake || 8;
    } else if (isMask) {
      form = 'hollow';
      text = '...BLACK GETSUGA!';
      textColor = '#FF1E00';
      shakeAmt = CONFIG.ichigo?.hollowGetsugaScreenShake || 4;
    } else if (isBankai) {
      form = 'bankai';
      text = '...KUROI GETSUGA!';
      textColor = '#00E5FF';
      shakeAmt = CONFIG.ichigo?.bankaiGetsugaScreenShake || 4;
    }

    const baseDmg = isFinal
      ? (CONFIG.ichigo?.bankaiFinalGetsugaDamage || 125)
      : (isMask ? (CONFIG.ichigo?.hollowGetsugaDamage || 50) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDamage || 48) : (CONFIG.ichigo?.getsugaDamage || 32)));
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
    this.getsugaCooldown = CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.getsugaCooldown || 450;

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
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    audioSystem.playSFX('Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
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
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return;
    if (!target || target.hp <= 0) return;
    const baseAngle = Math.atan2(this.y - target.y, this.x - target.x);
    
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const maxStrikes = isBankai 
      ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
      : (CONFIG.ichigo?.shunpoStrikes || 2);
    const cdMult = isBankai 
      ? (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? 0.50) 
      : 1.0;

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
    audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
  }

  performMeleeCleave(target) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingBankai || this.bankaiBurstTimer > 0 || this.isChannelingGetsuga || this.getsugaRecoveryTimer > 0 || this.isShunpoDashing || this.shunpoComboActive) return;
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    const damageMult = isMask
      ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)
      : (isBankai ? (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4) : 1.0);
    const baseDamage = CONFIG.ichigo?.swordDamage || 16;
    const finalDamage = baseDamage * damageMult;

    this.swordCooldown = CONFIG.ichigo?.swordCooldown || 30;
    const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
    this.slashSwingTimer = swingDur;
    this.slashSwingMaxTimer = swingDur;

    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

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
          
          const kbForce = CONFIG.ichigo?.knockback || 6;
          enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);
          
          spawnImpactFlash(enemy.x, enemy.y, isMask ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(enemy.x, enemy.y, CONFIG.ichigo?.swordShockwaveSize || 35, isMask ? 'sukuna' : 'gojo');
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

    // Rule #1: At the top of EVERY fighter update() method, freeze/time-stop guard checks
    const isFrozen = this._handleTimeStop() || 
      this.isFrozenByInfinity || 
      this.isTargetOfAmbush || 
      this.isParalyzed ||
      (this.timeStopTimer && this.timeStopTimer > 0) ||
      (this.statusEffects && this.statusEffects.timeStopTimer > 0) ||
      (this.electricStunTimer && this.electricStunTimer > 0) ||
      (this.paralyzeTimer && this.paralyzeTimer > 0);

    if (isFrozen) {
      this.interruptAttacks();
      return;
    }

    // Zero out movement velocity if performing Shunpo combo, static Getsuga charge, or static Bankai transformation (channeling or burst)
    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || this.isChannelingBankai || this.bankaiBurstTimer > 0) {
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

    super.update(opponent, ownerIndex, arena);

    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || this.isChannelingBankai || this.bankaiBurstTimer > 0) {
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

    // Update Zangetsu trailing cloth ribbon physics continuously every frame (even during Getsuga channeling & Shunpo)
    updateZangetsuRibbonPhysics(this);

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

    // Hollow Mask Passive Activation
    if (!this.hollowMaskUsed && !this.bankaiActive && this.hp / this.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold || 0.30)) {
      this.hollowMaskUsed = true;
      this.hollowMaskActive = true;
      this.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration || 600;
      this.hollowMaskFormationTimer = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
      this.hollowMaskFormationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
      spawnFloatingText(this.x, this.y - this.r - 28, "HOLLOW AWAKENING!", "#FF1E00");
      audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.95);
      audioSystem.playSFX('Assets/Sound Effects/SkillEffects/flare.mp3', 0.85);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3.5, 18);
      }
    }

    if (this.hollowMaskFormationTimer > 0) {
      this.hollowMaskFormationTimer--;
    }

    // Hollow Mask expiration
    if (this.hollowMaskActive) {
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

    // Bankai (Ultimate) Active Loop
    if (this.bankaiActive) {
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

      // Bankai supersonic black-crimson speed afterimages
      if (Math.random() < 0.45) {
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

      if (this.bankaiTimer <= 0) {
        this.bankaiActive = false;
        spawnFloatingText(this.x, this.y - this.r - 28, "BANKAI ENDED", "#FFFFFF");
        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
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
          const damageMult = isMask
            ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)
            : (isBankai ? (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4) : 1.0);
          const baseSlashDmg = CONFIG.ichigo?.shunpoStrike1Damage || 20;
          const maxSteps = this.shunpoMaxSteps || (isBankai ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) : (CONFIG.ichigo?.shunpoStrikes || 2));

          if (this.shunpoComboStep < maxSteps) {
            // ── Intermediate Flurry Strike (Step k of N) ──
            const s1Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike1Duration || 10) : (CONFIG.ichigo?.shunpoStrike1SlashDuration || 14);
            this.slashSwingTimer = s1Duration;
            this.slashSwingMaxTimer = s1Duration;
            audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

            // Rule #5: Freeze target during flurry combo
            if (typeof target.applyTimeStop === 'function') {
              target.applyTimeStop(CONFIG.ichigo?.shunpoStrike1FreezeDuration || 12);
            }

            // Deal intermediate strike damage
            applyDamageToTarget(target, baseSlashDmg * damageMult, this, { isSkill: true });
            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.75);

            // Set delay before triggering next Flash Step
            this.shunpoComboDelayTimer = isBankai 
              ? (CONFIG.ichigo?.bankaiShunpoComboDelayFrames || 5) 
              : (CONFIG.ichigo?.shunpoComboDelayFrames || 8);
          } else {
            // ── Final Finisher Strike (Step N of N) ──
            const s2Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike2Duration || 14) : (CONFIG.ichigo?.shunpoStrike2SlashDuration || 16);
            this.slashSwingTimer = s2Duration;
            this.slashSwingMaxTimer = s2Duration;
            audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);

            // Deal final finisher damage & knockback
            const strike2Mult = CONFIG.ichigo?.shunpoStrike2Multiplier || 1.35;
            const finisherDmg = baseSlashDmg * strike2Mult * damageMult;
            applyDamageToTarget(target, finisherDmg, this, { isSkill: true });
            target.applyHitStun(CONFIG.ichigo?.shunpoStunDuration || CONFIG.ichigo?.shunpoStrike2StunDuration || 20);

            const aimAngle = this.gunAngle || 0;
            const kbForce = CONFIG.ichigo?.shunpoStrike2Knockback || 7;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
            }

            spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
            spawnMeleeClashShockwave(target.x, target.y, CONFIG.ichigo?.shunpoShockwaveSize || 45, (isBankai || isMask) ? 'sukuna' : 'gojo');
            audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.9);
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(CONFIG.ichigo?.shunpoScreenShake || 3, 12);
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
      const maxSteps = this.shunpoMaxSteps || ((this.bankaiActive || this.skin === 'bankai') ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) : (CONFIG.ichigo?.shunpoStrikes || 2));
      
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
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.95);
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
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', isBankai ? 0.95 : 0.9);
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
    if (this.shunpoComboActive || this.isShunpoDashing || this.isChannelingGetsuga || this.isChannelingBankai || this.getsugaRecoveryTimer > 0) {
      return;
    }

    // AI Logic (autonomous decision making)
    if (!this.playerControlled) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // 1. Trigger Ultimate: Bankai Awakening (Strictly ONCE per match when HP drops <= ultimateThreshold)
        const ultThreshold = CONFIG.ichigo?.ultimateThreshold || 0.90;
        if (!this.bankaiUsed && !this.bankaiActive && !this.isChannelingBankai && (this.hp / this.maxHp <= ultThreshold)) {
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
