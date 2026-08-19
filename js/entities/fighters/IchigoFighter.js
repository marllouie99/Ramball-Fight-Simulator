import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
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
    this.getsugaTarget = null;

    // Bankai Transformation Channeling & Slide State
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiChargeMax = CONFIG.ichigo?.bankaiChargeFrames || 50;
    this.bankaiSlideTimer = 0;
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
    this.bankaiActive = false;
    this.bankaiTimer = 0;
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoComboActive = false;
    this.shunpoComboStep = 0;
    this.shunpoComboDelayTimer = 0;
    this.shunpoTarget = null;
    this.isChannelingGetsuga = false;
    this.isGetsugaSlash = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;
    this.getsugaTarget = null;
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
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
    this.getsugaTarget = null;
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;
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
    if (this.isChannelingBankai || this.bankaiActive) return;

    const chargeFrames = CONFIG.ichigo?.bankaiChargeFrames || 50;
    const slideFrames = CONFIG.ichigo?.bankaiSlideFrames || 10;

    this.isChannelingBankai = true;
    this.bankaiChargeMax = chargeFrames;
    this.bankaiChargeTimer = chargeFrames;
    this.bankaiSlideTimer = slideFrames;

    spawnFloatingText(this.x, this.y - this.r - 28, "BAN...", "#DC143C");
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
  }

  _releaseBankai() {
    this.isChannelingBankai = false;
    this.bankaiChargeTimer = 0;
    this.bankaiSlideTimer = 0;

    this.bankaiActive = true;
    this.bankaiTimer = CONFIG.ichigo?.bankaiDuration || 600;
    this.ultimateCooldown = 0;

    spawnFloatingText(this.x, this.y - this.r - 28, "...KAI!", "#FF1E00");
    audioSystem.playSFX('Assets/Sound Effects/Skills/domainexpansion.mp3', 1.0);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);
    
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(CONFIG.ichigo?.bankaiScreenShake || 6, 25);
    }
    const shockwaveSize = CONFIG.ichigo?.bankaiAuraShockwaveSize || 75;
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize, 'sukuna');
    spawnMeleeClashShockwave(this.x, this.y, shockwaveSize * 0.7, 'gojo');
    spawnImpactFlash(this.x, this.y, 'sukuna');
  }

  shoot(ownerIndex) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return false;
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
    this.slashSwingTimer = 22;
    this.slashSwingMaxTimer = 22;
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }

  fireGetsuga(target) {
    if (this.isDead || this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush || this.isParalyzed) return;
    if (this.isChannelingGetsuga || this.isShunpoDashing || this.shunpoComboActive) return;

    if (target) {
      this.aim(target);
      this.getsugaTarget = target;
    } else {
      this.getsugaTarget = this._getClosestEnemy();
      if (this.getsugaTarget) this.aim(this.getsugaTarget);
    }

    const chargeFrames = CONFIG.ichigo?.getsugaChargeFrames || 50;
    const slideFrames = CONFIG.ichigo?.getsugaSlideFrames || 8;

    this.isChannelingGetsuga = true;
    this.getsugaChargeMax = chargeFrames;
    this.getsugaChargeTimer = chargeFrames;
    this.getsugaSlideTimer = slideFrames;

    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;

    const chargeText = isMask ? 'BLACK GETSUGA...' : (isBankai ? 'KUROI GETSUGA...' : 'GETSUGA...');
    const chargeColor = isMask ? '#FF1E00' : (isBankai ? '#00E5FF' : '#00D5FF');

    spawnFloatingText(this.x, this.y - this.r - 28, chargeText, chargeColor);
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 0.85);
  }

  _releaseGetsuga() {
    this.isChannelingGetsuga = false;
    this.getsugaChargeTimer = 0;
    this.getsugaSlideTimer = 0;

    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;

    let form = 'shikai';
    let text = '...TENSHO!';
    let textColor = '#00D5FF';
    let shakeAmt = CONFIG.ichigo?.getsugaScreenShake || 3;

    if (isMask) {
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

    const baseDmg = isMask ? (CONFIG.ichigo?.hollowGetsugaDamage || 50) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaDamage || 45) : (CONFIG.ichigo?.getsugaDamage || 30));
    const baseSpeed = CONFIG.ichigo?.getsugaTravelSpeed ?? CONFIG.ichigo?.getsugaSpeed ?? 10;
    const speed = isMask ? (CONFIG.ichigo?.hollowGetsugaSpeed || 22) : (isBankai ? (CONFIG.ichigo?.bankaiGetsugaSpeed || 22) : baseSpeed);
    const ownerIndex = state.fighters.indexOf(this);

    if (projectileSystem && typeof projectileSystem.fireGetsugaTensho === 'function') {
      projectileSystem.fireGetsugaTensho(this, ownerIndex, baseDmg, speed, form);
    }

    this.isGetsugaSlash = true;
    this.slashSwingTimer = 24;
    this.slashSwingMaxTimer = 24;
    this.getsugaCooldown = CONFIG.ichigo?.getsugaCooldown || 360;

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

  performShunpoStrike(target) {
    if (!target || target.hp <= 0) return;
    const baseAngle = Math.atan2(this.y - target.y, this.x - target.x);
    
    this.shunpoTarget = target;
    this.shunpoComboActive = true;
    this.shunpoComboStep = 1;
    this.shunpoCooldown = CONFIG.ichigo?.shunpoCooldown || 240;
    this._shunpoBaseAngle = baseAngle;

    const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

    // Flash step 1: Target flank angle 1 (+110° / +1.92 rad offset)
    const angle1 = baseAngle + 1.92;
    this.shunpoStartX = this.x;
    this.shunpoStartY = this.y;
    this.shunpoTargetX = target.x + Math.cos(angle1) * offset;
    this.shunpoTargetY = target.y + Math.sin(angle1) * offset;

    this.isShunpoDashing = true;
    this.shunpoDashTimer = CONFIG.ichigo?.shunpoDashDuration || 4;

    spawnFloatingText(this.x, this.y - this.r - 20, 'SHUNPO!', '#FFFFFF');
    audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
  }

  performMeleeCleave(target) {
    const isBankai = this.bankaiActive || this.skin === 'bankai';
    const isMask = this.hollowMaskActive;
    const damageMult = isMask
      ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)
      : (isBankai ? (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4) : 1.0);
    const baseDamage = CONFIG.ichigo?.swordDamage || 16;
    const finalDamage = baseDamage * damageMult;

    this.swordCooldown = CONFIG.ichigo?.swordCooldown || 30;
    this.slashSwingTimer = 22;
    this.slashSwingMaxTimer = 22;

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
          spawnMeleeClashShockwave(enemy.x, enemy.y, 35, isMask ? 'sukuna' : 'gojo');
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

    // Zero out movement velocity if performing Shunpo combo, static Getsuga charge, or static Bankai charge
    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || (this.isChannelingBankai && this.bankaiSlideTimer <= 0)) {
      this.vx = 0;
      this.vy = 0;
    }

    super.update(opponent, ownerIndex, arena);

    if (this.isShunpoDashing || this.shunpoComboActive || (this.isChannelingGetsuga && this.getsugaSlideTimer <= 0) || (this.isChannelingBankai && this.bankaiSlideTimer <= 0)) {
      this.vx = 0;
      this.vy = 0;
    }

    // Bankai Transformation Channeling & Slide Physics (Complete Pushback & Knockback Immunity)
    if (this.isChannelingBankai) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      if (this.bankaiSlideTimer > 0) {
        this.bankaiSlideTimer--;
        const damping = CONFIG.ichigo?.bankaiSlideDamping || 0.70;
        this.vx *= damping;
        this.vy *= damping;
        if (Math.random() < 0.6) {
          spawnSparks(this.x, this.y + this.r * 0.7, 2, '#FF0000');
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }

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

    // Update Zangetsu trailing cloth ribbon physics
    updateZangetsuRibbonPhysics(this);

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
      spawnFloatingText(this.x, this.y - this.r - 28, "HOLLOW MASK!", "#FF1E00");
      audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3, 15);
      }
    }

    // Hollow Mask expiration
    if (this.hollowMaskActive) {
      this.hollowMaskTimer--;
      if (this.hollowMaskTimer <= 0) {
        this.hollowMaskActive = false;
        spawnFloatingText(this.x, this.y - this.r - 28, "MASK SHATTERED", "#FFFFFF");
        audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.7);
      }
    }

    // Bankai (Ultimate) Active Loop
    if (this.bankaiActive) {
      this.bankaiTimer--;

      // Bankai supersonic black/cyan lightning speed afterimages
      if (Math.random() < 0.40) {
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          r: this.r,
          angle: this.angle,
          color: 'rgba(0, 229, 255, 0.40)',
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
      
      const dashMax = CONFIG.ichigo?.shunpoDashDuration || 4;
      const p = 1 - (this.shunpoDashTimer / dashMax);
      const prevX = this.x;
      const prevY = this.y;
      this.x = this.shunpoStartX + (this.shunpoTargetX - this.shunpoStartX) * p;
      this.y = this.shunpoStartY + (this.shunpoTargetY - this.shunpoStartY) * p;
      this.vx = 0;
      this.vy = 0;

      // Spawn manga action speed lines / afterimages (Rule #16) behind him
      const isMask = this.hollowMaskActive;
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        r: this.r,
        angle: this.angle,
        color: isMask ? 'rgba(255, 30, 0, 0.55)' : 'rgba(0, 213, 255, 0.45)',
        timer: 16,
        maxTimer: 16
      }, 12);

      if (this.shunpoDashTimer <= 0) {
        this.isShunpoDashing = false;
        this.x = this.shunpoTargetX;
        this.y = this.shunpoTargetY;
        
        const target = this.shunpoTarget;
        if (target && target.hp > 0 && !target.isDead) {
          // Rule #3: Always update aim(target) immediately after teleport
          this.aim(target);

          const isBankai = this.bankaiActive || this.skin === 'bankai';
          const damageMult = isMask
            ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5)
            : (isBankai ? (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4) : 1.0);
          const baseSlashDmg = CONFIG.ichigo?.shunpoStrike1Damage || 22;

          if (this.shunpoComboStep === 1) {
            // ── Strike 1: Rapid Flank Slash Attack ──
            const s1Duration = CONFIG.ichigo?.shunpoStrike1SlashDuration || 14;
            this.slashSwingTimer = s1Duration;
            this.slashSwingMaxTimer = s1Duration;
            audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

            // Rule #5: Freeze target during flurry combo
            if (typeof target.applyTimeStop === 'function') {
              target.applyTimeStop(CONFIG.ichigo?.shunpoStrike1FreezeDuration || 12);
            }

            // Deal Strike 1 damage
            applyDamageToTarget(target, baseSlashDmg * damageMult, this, { isSkill: true });
            spawnImpactFlash(target.x, target.y, isMask ? 'sukuna' : 'gojo');
            audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.75);

            // Set delay before triggering Flash Step 2
            this.shunpoComboDelayTimer = CONFIG.ichigo?.shunpoComboDelayFrames || 10;
          } else if (this.shunpoComboStep === 2) {
            // ── Strike 2: Cross Flash Finisher Attack ──
            const s2Duration = CONFIG.ichigo?.shunpoStrike2SlashDuration || 18;
            this.slashSwingTimer = s2Duration;
            this.slashSwingMaxTimer = s2Duration;
            audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);

            // Deal Strike 2 finisher damage & knockback
            const strike2Mult = CONFIG.ichigo?.shunpoStrike2Multiplier || 1.35;
            const finisherDmg = baseSlashDmg * strike2Mult * damageMult;
            applyDamageToTarget(target, finisherDmg, this, { isSkill: true });
            target.applyHitStun(CONFIG.ichigo?.shunpoStunDuration || CONFIG.ichigo?.shunpoStrike2StunDuration || 22);

            const aimAngle = this.gunAngle || 0;
            const kbForce = (CONFIG.ichigo?.knockback || 6) + 3;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
            }

            spawnImpactFlash(target.x, target.y, isMask ? 'sukuna' : 'gojo');
            spawnMeleeClashShockwave(target.x, target.y, 45, isMask ? 'sukuna' : 'gojo');
            audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.9);
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(3, 12);
            }

            // Combo finished
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        } else {
          this.shunpoComboActive = false;
          this.shunpoTarget = null;
        }
      }
      return;
    }

    // Advance Shunpo Flurry Combo to Step 2
    if (this.shunpoComboActive && this.shunpoComboStep === 1) {
      if (this.shunpoComboDelayTimer > 0) {
        this.shunpoComboDelayTimer--;
        if (this.shunpoComboDelayTimer <= 0) {
          const target = this.shunpoTarget;
          if (target && target.hp > 0 && !target.isDead) {
            this.shunpoComboStep = 2;
            
            // Flash step 2: Target opposite flank angle 2 (-110° / -1.92 rad offset)
            const baseAngle = this._shunpoBaseAngle !== undefined ? this._shunpoBaseAngle : Math.atan2(this.y - target.y, this.x - target.x);
            const angle2 = baseAngle - 1.92;
            const offset2 = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

            this.shunpoStartX = this.x;
            this.shunpoStartY = this.y;
            this.shunpoTargetX = target.x + Math.cos(angle2) * offset2;
            this.shunpoTargetY = target.y + Math.sin(angle2) * offset2;

            this.isShunpoDashing = true;
            this.shunpoDashTimer = CONFIG.ichigo?.shunpoDashDuration || 4;

            spawnFloatingText(this.x, this.y - this.r - 20, 'CROSS SLASH!', '#FFD700');
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.9);
            return;
          } else {
            this.shunpoComboActive = false;
            this.shunpoTarget = null;
          }
        }
      }
    }

    // Stop all external movement / AI decisions during active Shunpo combo or Getsuga channeling
    if (this.shunpoComboActive || this.isShunpoDashing || this.isChannelingGetsuga || this.isChannelingBankai) {
      return;
    }

    // AI Logic (autonomous decision making)
    if (!this.playerControlled) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // 1. Trigger Ultimate: Bankai Awakening (ONLY based on ultimateThreshold)
        const ultThreshold = CONFIG.ichigo?.ultimateThreshold || 0.50;
        if (!this.bankaiActive && !this.isChannelingBankai && (this.hp / this.maxHp <= ultThreshold)) {
          this.activateBankai();
        }

        // 2. Trigger Shunpo (Skill 2)
        const shunpoMin = CONFIG.ichigo?.shunpoTriggerMinDist || 180;
        const shunpoMax = CONFIG.ichigo?.shunpoTriggerMaxDist || 350;
        if (this.shunpoCooldown <= 0 && dist > shunpoMin && dist < shunpoMax) {
          this.performShunpoStrike(target);
          this.aim(target); // Rule #3: aim immediately after teleport
          return;
        }

        // 3. Trigger Getsuga Tensho (Skill 1)
        const getsugaMin = CONFIG.ichigo?.getsugaTriggerMinDist || 120;
        const getsugaMax = CONFIG.ichigo?.getsugaTriggerMaxDist || 400;
        if (this.getsugaCooldown <= 0 && dist > getsugaMin && dist < getsugaMax && Math.random() < 0.6) {
          this.fireGetsuga(target);
          return;
        }

        // 4. Melee attacks (Tensa Zangetsu cleave)
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
    this.drawStatusOverlays(ctx, this.r);
  }

  drawGun(ctx) {
    // Override to prevent drawing the default gun barrel and hands
  }

  draw(ctx) {
    // Render afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      ctx.save();
      for (const ai of this.afterImages) {
        ctx.save();
        ctx.globalAlpha = ai.timer / ai.maxTimer * 0.4;
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle);
        ctx.fillStyle = ai.color;
        ctx.beginPath();
        ctx.arc(0, 0, ai.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // Render dynamic crescent blade slash arc
    drawIchigoSlashArc(ctx, this);

    super.draw(ctx);
  }
}
