// ─────────────────────────────────────────────
// John Wick Fighter Entity
// Tactical Gun-Fu & CQC Hybrid Fighter
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, triggerGlobalScreenShake, spawnFloatingText, isChampionScreenActive } from '../../core/state.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect, spawnFatalBloodSplash } from '../../graphics/particles/bloodEffect.js';
import { drawJohnWickSkin } from '../../graphics/fighters/johnWickSkin.js';
import { drawJohnWickPistol, drawJohnWickShotgun, drawJohnWickRifle, drawJohnWickPencil } from '../../graphics/weapons/johnWickWeaponGraphics.js';
import { spawnDroppedMagazine, spawnThrownGun, spawnSpentCasing } from '../../graphics/particles/johnWickDroppedMagazine.js';

export class JohnWickFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'john_wick';
    this.type = 'john_wick';

    // Primary Weapon & Gun-Fu stats from CONFIG.john_wick
    const cfg = CONFIG.john_wick || {};
    this.hp = cfg.hp || this.hp || 420;
    this.maxHp = this.hp;
    this.damage = cfg.bulletDamage || this.damage || 22;
    this.shootCooldownMax = cfg.fireCooldown || 20;
    this.shootCooldown = 0;
    this.speed = cfg.speed !== undefined ? cfg.speed : (cfg.moveSpeed !== undefined ? cfg.moveSpeed : (this.speed || 6.4));
    this.baseSpeed = this.speed;

    this.magazineBullets = cfg.magazineSize || 12;
    this.maxMagazine = cfg.magazineSize || 12;
    this.currentEquippedWeapon = 'pistol'; // 'pistol' | 'shotgun' | 'rifle'
    this.rollbackCount = 0;               // Counter for 3-rollback gun toss & switch
    this.weaponSwitchTimer = 0;
    this.weaponSwitchMaxTime = cfg.weaponSwitchDuration || 36;
    this._shotgunCrackSoundPlayed = false;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.focusGauge = 0;
    this.maxFocusGauge = cfg.maxFocus || 100;
    
    // Animation, Evade & CQC Assassination Combo timers
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.meleeCooldown = 0;
    this.isRolling = false;
    this.isRollingBack = false;
    this.rollTimer = 0;
    this.rollMaxTimer = 20;
    this.rollCooldown = 0;
    this.movementRollCooldown = 0;
    this.isEvadeAlwaysActive = cfg.evadeAlwaysActive !== undefined ? cfg.evadeAlwaysActive : true;
    this.evadeBuffTimer = 0;
    this.evadeChance = cfg.evadeChance !== undefined ? cfg.evadeChance : 1.0;
    this.hideGun = false;
    this.isPencilEquipped = false;
    this.pencilAttackTimer = 0;
    this.pencilMaxTime = 24;
    this.recoilOffset = 0;
    this.flashTimer = 0;
    this.casingTimer = 0;

    // 3-Phase Assassination Combo State Machine & Out-of-Ammo Delay
    this.cqcComboPhase = null; // 'FORWARD_ROLL' | 'PENCIL_STAB' | 'BACKWARD_ROLL' | 'STOP_RELOAD' | 'SWITCH_WEAPON'
    this.cqcComboTarget = null;
    this.outOfAmmoRollDelayTimer = 0;
    this.pendingAssassinationTarget = null;
    this._shotgunCrackSoundPlayed = false;
    this._rifleCrackSoundPlayed = false;

    // Demo attack cycle state
    this._demoAttackCycle = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.john_wick || {};
    this.currentEquippedWeapon = 'pistol';
    this.rollbackCount = 0;
    this.movementRollCooldown = 0;
    this.weaponSwitchTimer = 0;
    this.magazineBullets = cfg.magazineSize || 12;
    this.maxMagazine = cfg.magazineSize || 12;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shootCooldownMax = cfg.fireCooldown || 20;
    this.shootCooldown = 0;
    const baseSpeed = cfg.speed !== undefined ? cfg.speed : (cfg.moveSpeed !== undefined ? cfg.moveSpeed : 6.4);
    this.speed = baseSpeed;
    this.baseSpeed = baseSpeed;
    this.focusGauge = 0;
    this.punchAnimTimer = 0;
    this.meleeCooldown = 0;
    this.isRolling = false;
    this.isRollingBack = false;
    this.rollTimer = 0;
    this.rollMaxTimer = 20;
    this.rollCooldown = 0;
    this.evadeBuffTimer = 0;
    this.evadeChance = cfg.evadeChance ?? 1.0;
    this.hideGun = false;
    this.isPencilEquipped = false;
    this.pencilAttackTimer = 0;
    this.recoilOffset = 0;
    this.flashTimer = 0;
    this.casingTimer = 0;
    this.cqcComboPhase = null;
    this.cqcComboTarget = null;
    this.outOfAmmoRollDelayTimer = 0;
    this.pendingAssassinationTarget = null;
    this._shotgunCrackSoundPlayed = false;
    this._rifleCrackSoundPlayed = false;
    this._demoAttackCycle = 0;
  }

  /**
   * Teammate check helper (prevents friendly fire in team modes)
   */
  isTeammate(other) {
    if (!other || !state.fighters) return false;
    if (state.getFighterTeam) {
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      const otherTeam = state.getFighterTeam(state.fighters.indexOf(other));
      if (myTeam !== null && myTeam !== undefined && myTeam === otherTeam) return true;
    }
    return false;
  }

  /**
   * Demo attack loop for Weapon Menu & Character Select inspect previews
   */
  triggerDemoAttack() {
    this._demoAttackCycle = (this._demoAttackCycle + 1) % 8;
    const cfg = CONFIG.john_wick || {};
    if (this._demoAttackCycle === 0) {
      // Pistol Rapid Double-Tap
      this.currentEquippedWeapon = 'pistol';
      this.recoilOffset = cfg.recoilDistance ? cfg.recoilDistance * 0.75 : 6;
      this.flashTimer = cfg.flashDuration || 4;
      this.casingTimer = cfg.casingDuration || 12;
      this.punchAnimTimer = 10;
    } else if (this._demoAttackCycle === 1) {
      // Shotgun Heavy Blast with 12-gauge Shell Ejection & Recoil
      this.currentEquippedWeapon = 'shotgun';
      this.recoilOffset = cfg.shotgunRecoilDistance || 20.0;
      this.flashTimer = cfg.shotgunFlashDuration || 6;
      this.casingTimer = cfg.shotgunCasingDuration || 24;
    } else if (this._demoAttackCycle === 2) {
      // Forward 360° Spin Roll
      this.isRolling = true;
      this.isRollingBack = false;
      this.rollTimer = 20;
      this.rollMaxTimer = 20;
      this.evadeBuffTimer = 25;
      this.hideGun = true;
    } else if (this._demoAttackCycle === 3) {
      // Reverse-Grip Pencil Ambush Stab
      this.isRolling = false;
      this.hideGun = true;
      this.isPencilEquipped = true;
      this.pencilAttackTimer = 24;
      this.pencilMaxTime = 24;
    } else if (this._demoAttackCycle === 4) {
      // Backward 360° Spin Disengage Roll
      this.isPencilEquipped = false;
      this.hideGun = true;
      this.isRolling = true;
      this.isRollingBack = true;
      this.rollTimer = 20;
      this.rollMaxTimer = 20;
      this.evadeBuffTimer = 25;
    } else if (this._demoAttackCycle === 5) {
      // Gun Toss & Weapon Switch to Benelli M4
      this.isRolling = false;
      this.isRollingBack = false;
      this.hideGun = false;
      this.isPencilEquipped = false;
      this.switchWeapon('shotgun');
    } else if (this._demoAttackCycle === 6) {
      // Gun Toss & Weapon Switch to M4 Rifle
      this.isRolling = false;
      this.isRollingBack = false;
      this.hideGun = false;
      this.isPencilEquipped = false;
      this.switchWeapon('rifle');
    } else {
      // M4 Rifle Rapid Burst
      this.currentEquippedWeapon = 'rifle';
      this.recoilOffset = cfg.rifleRecoilDistance || 5.5;
      this.flashTimer = 4;
      this.casingTimer = 12;
    }
  }

  /**
   * Starts the 5-Phase Pencil Assassination & 360 Spin Roll Combo Sequence:
   * 1. Forward 360° Spin Dive-Roll towards the enemy with Evade Buff.
   * 2. Hide gun, equip pencil & execute lethal close-quarters assassination grab + stab.
   * 3. Backward 360° Spin Disengage Roll away from the enemy with Evade Buff.
   * 4. Stop all movement, drop spent physical magazine, and execute tactical speed reload.
   * 5. Ready weapon and resume rapid-fire shooting.
   */
  startAssassinationCombo(target) {
    if (!target || target.hp <= 0 || this.cqcComboPhase || this.hp <= 0) return;
    const cfg = CONFIG.john_wick || {};

    this.cqcComboPhase = 'FORWARD_ROLL';
    this.cqcComboTarget = target;
    this.isRolling = true;
    this.isRollingBack = false;
    this.rollTimer = cfg.cqcForwardRollDuration || 20;
    this.rollMaxTimer = cfg.cqcForwardRollDuration || 20;
    this.evadeBuffTimer = cfg.cqcForwardEvadeDuration || 26;
    this.hideGun = true;
    this.isPencilEquipped = false;
    this.pencilAttackTimer = 0;
    this.isReloading = false;
    this.flashTimer = 0;
    this.recoilOffset = 0;
    this.casingTimer = 0;

    // Calculate forward angle toward target
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const rollAngle = Math.atan2(dy, dx);
    this.gunAngle = rollAngle;
    this.angle = rollAngle;

    const rollSpeed = cfg.cqcForwardRollSpeed || 22;
    this.vx = Math.cos(rollAngle) * rollSpeed;
    this.vy = Math.sin(rollAngle) * rollSpeed;

    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 16, 'ASSASSINATION!', '#F59E0B');
    spawnSparks(this.x, this.y, 10, 'silverStreak', '#CBD5E1');
    const rollSfx = cfg.sounds?.rollForward || cfg.sounds?.combatRoll || 'Assets/Sound Effects/Skills/dash1.mp3';
    const rollVol = cfg.soundVolumes?.rollForward ?? (cfg.soundVolumes?.combatRoll ?? 0.85);
    audioSystem.playSFX(rollSfx, rollVol);
  }

  /**
   * Per-frame state machine update for the 5-Phase Assassination Combo
   */
  _updateAssassinationCombo(arena) {
    if (!this.cqcComboPhase) return;
    const cfg = CONFIG.john_wick || {};
    const target = this.cqcComboTarget;

    // Safety abort if match has ended
    if (typeof state !== 'undefined' && state.gameState !== 'playing') {
      if (this.cqcComboTarget) {
        this.cqcComboTarget.isTargetOfAmbush = false;
        this.cqcComboTarget.caughtInJohnWickCombo = false;
      }
      this.cqcComboPhase = null;
      this.isRolling = false;
      this.hideGun = false;
      this.isPencilEquipped = false;
      return;
    }

    const arenaObj = arena || state.arena || CONFIG.arena;
    const clampToArena = (ent) => {
      if (!arenaObj || !ent) return;
      const tr = ent.r || 20;
      ent.x = Math.max(arenaObj.x + tr, Math.min(arenaObj.x + arenaObj.width - tr, ent.x));
      ent.y = Math.max(arenaObj.y + tr, Math.min(arenaObj.y + arenaObj.height - tr, ent.y));
    };

    if (this.cqcComboPhase === 'FORWARD_ROLL') {
      this.rollTimer--;
      // Guide trajectory toward target during the roll (target is NOT interrupted during roll)
      if (target && target.hp > 0) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.aim(target);

        // ── GOJO LIMITLESS INFINITY BARRIER CHECK ──
        const isTargetGojoInfinity = (target.characterId === 'gojo' || target.type === 'gojo' || target._def?.id === 'gojo') &&
          (target.infinityCooldown <= 0 || target.domainActive || !target.isMeleeMode);
        const barrierDist = isTargetGojoInfinity ? (CONFIG.gojo?.infinityRadius ?? (target.r + 30)) : (target.r + 6);

        if (isTargetGojoInfinity && dist <= this.r + barrierDist) {
          // Rebound bounce off Gojo's Infinity barrier!
          target.isTargetOfAmbush = false;
          target.caughtInJohnWickCombo = false;

          const nx = dist > 0.001 ? (dx / dist) : Math.cos(this.gunAngle);
          const ny = dist > 0.001 ? (dy / dist) : Math.sin(this.gunAngle);
          const bounceForce = 18;

          this.vx = -nx * bounceForce;
          this.vy = -ny * bounceForce;
          this.cqcComboPhase = 'BACKWARD_ROLL';
          this.rollTimer = 22;
          this.rollMaxTimer = 22;
          this.isRolling = true;
          this.isRollingBack = true;
          this.hideGun = true;

          if (typeof target.triggerInfinityBlock === 'function') {
            target.triggerInfinityBlock(this.x + nx * this.r, this.y + ny * this.r, this);
          }

          spawnSparks(this.x + nx * this.r, this.y + ny * this.r, 14, 'cyan', '#00E5FF');
          spawnImpactFlash(this.x + nx * this.r, this.y + ny * this.r, 32, 'layla');
          const deflectSfx = cfg.sounds?.bulletDeflect || 'Assets/Sound Effects/Skills/parry.mp3';
          const deflectVol = cfg.soundVolumes?.bulletDeflect ?? 0.85;
          audioSystem.playSFX(deflectSfx, deflectVol);
          triggerGlobalScreenShake(2.5, 6);
          spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 14, 'INFINITY REBOUND!', '#00E5FF');
          return;
        }
        
        const contactDist = this.r + (target.r || 25) + 6;
        if (dist > contactDist) {
          const rollSpeed = Math.min(cfg.cqcForwardRollSpeed || 22, Math.max(8, dist - contactDist + 2));
          this.vx = (dx / dist) * rollSpeed;
          this.vy = (dy / dist) * rollSpeed;
        } else {
          // Reached close contact: smoothly brake
          this.vx *= 0.55;
          this.vy *= 0.55;
        }
        
        // FULL 360° SPIN COMPLETION: Transition directly to PENCIL_STAB (Skill 2: "With a F***ing Pencil")
        if (this.rollTimer <= 0) {
          this.cqcComboPhase = 'PENCIL_STAB';
          this.isRolling = false;
          this.vx = 0;
          this.vy = 0;
          this.hideGun = true;
          this.isPencilEquipped = true;
          this.punchAnimTimer = 0;
          const windupF = cfg.cqcPencilWindupFrames ?? 14;
          const thrustF = cfg.cqcPencilThrustFrames ?? 8;
          const pullbackF = cfg.cqcPencilPullbackFrames ?? 14;
          const pencilDur = cfg.cqcPencilStabDuration || (windupF + thrustF + pullbackF);
          this.pencilAttackTimer = pencilDur;
          this.pencilMaxTime = pencilDur;
          this._pencilDamageDealt = false;

          this.aim(target);
        }
      } else {
        this.cqcComboPhase = 'BACKWARD_ROLL';
        this.rollTimer = 0;
      }
    } else if (this.cqcComboPhase === 'PENCIL_STAB') {
      this.pencilAttackTimer--;
      this.vx = 0;
      this.vy = 0;
      const windupF = cfg.cqcPencilWindupFrames ?? 14;
      const thrustF = cfg.cqcPencilThrustFrames ?? 8;
      const pullbackF = cfg.cqcPencilPullbackFrames ?? 14;
      const pencilDur = this.pencilMaxTime || cfg.cqcPencilStabDuration || (windupF + thrustF + pullbackF);
      const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.pencilAttackTimer / pencilDur)));
      const thrustRatio = Math.min(0.95, (windupF + thrustF) / pencilDur);

      if (target && target.hp > 0) {
        this.aim(target);

        // Forward thrust connects at full linear extension (tip impact instant — EXACT MOMENT HE STABS!)
        if (progress >= thrustRatio && !this._pencilDamageDealt) {
          this._pencilDamageDealt = true;

          // CANCEL / INTERRUPT target attacks only when the stab lands!
          if (typeof target.interruptAttacks === 'function') {
            target.interruptAttacks();
          }
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(pullbackF + 10);
          } else {
            target.hitStunTimer = pullbackF + 10;
          }

          // Deal massive true damage & apply bleed + slow
          const pencilDmg = cfg.pencilDamage || 65;
          applyDamageToTarget(target, pencilDmg, this, { isMelee: true, isTrueDamage: true });

          if (target.hp > 0) {
            const bleedDur = cfg.pencilBleedDuration || 180;
            const bleedDmg = cfg.pencilBleedDamagePerTick || 4;
            const bleedInterval = cfg.pencilBleedIntervalFrames || 30;
            if (typeof target.applyBleed === 'function') {
              target.applyBleed(this, bleedDur, bleedDmg, bleedInterval);
            } else if (target.statusEffects && typeof target.statusEffects.applyBleed === 'function') {
              target.statusEffects.applyBleed(this, bleedDur, bleedDmg, bleedInterval);
            } else {
              target.bleedTimer = bleedDur;
              target.bleedDamagePerTick = bleedDmg;
              target.bleedIntervalFrames = bleedInterval;
              target.lastBleedAttacker = this;
            }

            if (typeof target.applySlow === 'function') {
              target.applySlow(cfg.pencilSlowDuration || 90, cfg.pencilSlowMultiplier || 0.60);
            } else {
              target.slowTimer = cfg.pencilSlowDuration || 90;
              target.slowMultiplier = cfg.pencilSlowMultiplier || 0.60;
            }
          }

          spawnFloatingText(target.x, (target.y - (target.z || 0)) - target.r - 14, 'WITH A F***ING PENCIL!', '#F59E0B');
          
          // Burst Blood Effect Particles & Heavy Arena Shake (High-velocity directional arterial spray)
          spawnBloodEffect(target, 28, this.gunAngle, { minSize: cfg.cqcPencilBloodMinSize || 3.8, maxSize: cfg.cqcPencilBloodMaxSize || 6.8, count: cfg.cqcPencilBloodCount || 14 });
          spawnSparks(target.x, target.y, 14, 'crimson', '#DC2626');
          spawnSparks(target.x, target.y, 10, '#F59E0B');
          const pencilSfx = cfg.sounds?.pencilStab || cfg.pencilStabSound || 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3';
          const pencilVol = cfg.soundVolumes?.pencilStab ?? cfg.pencilStabVolume ?? 1.0;
          audioSystem.playSFX(pencilSfx, pencilVol);

          const shakeInt = cfg.cqcPencilImpactShakeIntensity || 4.5;
          const shakeDur = cfg.cqcPencilImpactShakeDuration || 12;
          triggerGlobalScreenShake(shakeInt, shakeDur);

          // APPLY IMMEDIATE POWERFUL KNOCKBACK IMPULSE ON ENEMY!
          const facing = this.gunAngle || 0;
          const knockback = cfg.cqcPencilKnockback || 22;
          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(facing) * knockback, Math.sin(facing) * knockback);
          } else {
            target.vx = Math.cos(facing) * knockback;
            target.vy = Math.sin(facing) * knockback;
          }
          if (typeof target.applyHitStun === 'function') target.applyHitStun(pullbackF + 10);
          else target.hitStunTimer = pullbackF + 10;

          this.focusGauge = Math.min(this.maxFocusGauge, this.focusGauge + (cfg.focusGainPerPencilStab || 20));
        }
      }

      // Transition to BACKWARD_ROLL when stab finishes
      if (this.pencilAttackTimer <= 0) {
        if (target) {
          target.isTargetOfAmbush = false;
          target.caughtInJohnWickCombo = false;
        }
        this.cqcComboPhase = 'BACKWARD_ROLL';
        this.isRolling = true;
        this.isRollingBack = true;
        const bRollDur = cfg.cqcBackwardRollDuration || 22;
        this.rollTimer = bRollDur;
        this.rollMaxTimer = bRollDur;
        this.evadeBuffTimer = cfg.cqcBackwardEvadeDuration || 28;
        this.isPencilEquipped = false;
        this.hideGun = true;

        const facing = (target && target.hp > 0) ? Math.atan2(target.y - this.y, target.x - this.x) : (this.gunAngle || 0);
        const backAngle = facing + Math.PI;
        const rollSpeed = cfg.cqcBackwardRollSpeed || 18;
        this.vx = Math.cos(backAngle) * rollSpeed;
        this.vy = Math.sin(backAngle) * rollSpeed;

        const rollSfx = cfg.sounds?.combatRoll || 'Assets/Sound Effects/Skills/woosh.mp3';
        const rollVol = cfg.soundVolumes?.combatRoll ?? 0.8;
        audioSystem.playSFX(rollSfx, rollVol);
        const rollVoiceChance = cfg.soundChances?.rollbackVoice ?? (cfg.rollbackVoiceChance !== undefined ? cfg.rollbackVoiceChance : 0.50);
        if (Math.random() < rollVoiceChance) {
          const rollVoice = cfg.sounds?.rollbackVoice || cfg.rollbackVoiceSound || 'Assets/Sound Effects/Skills/Johnwick-rollback-voiceline.mp3';
          const rollVoiceVol = cfg.soundVolumes?.rollbackVoice ?? cfg.rollbackVoiceVolume ?? 1.0;
          audioSystem.playSFX(rollVoice, rollVoiceVol);
        }
      }
    } else if (this.cqcComboPhase === 'BACKWARD_ROLL') {
      this.rollTimer--;
      this.vx *= 0.95;
      this.vy *= 0.95;

      // Transition to STOP_RELOAD or SWITCH_WEAPON when disengage roll finishes
      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.isRollingBack = false;
        this.vx = 0;
        this.vy = 0;
        this.hideGun = false;
        this.isPencilEquipped = false;

        this.rollbackCount = (this.rollbackCount || 0) + 1;

        if (this.rollbackCount >= 3) {
          // ── ROLLBACK 3: TOSS EMPTY GUN & SWITCH WEAPON (3-WAY CYCLE)! ──
          this.rollbackCount = 0;
          this.cqcComboPhase = 'SWITCH_WEAPON';
          this.switchWeapon();
        } else {
          // ── ROLLBACK 1 & 2: TACTICAL SPEED RELOAD ──
          this.cqcComboPhase = 'STOP_RELOAD';

          this.isReloading = true;
          this._hasDroppedMag = false;
          this._hasSlappedNewMag = false;
          this._hasPlayedReloadSound = false;

          let rTime = cfg.reloadTime || 75;
          if (this.currentEquippedWeapon === 'shotgun') {
            rTime = cfg.shotgunReloadTime || 96;
            this.magazineBullets = 0; // Starts empty and loads shells 1-by-1
          } else if (this.currentEquippedWeapon === 'rifle') {
            rTime = cfg.rifleReloadTime || 85;
          }
          this.reloadTimer = rTime;
          this.reloadMaxTime = rTime;
          this.shootCooldown = rTime;

          const reloadLabel = (this.currentEquippedWeapon === 'shotgun') ? 'LOADING SHELLS...' : 'TACTICAL RELOAD';
          spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, reloadLabel, '#F59E0B');
        }
      }
    } else if (this.cqcComboPhase === 'SWITCH_WEAPON') {
      this.vx = 0;
      this.vy = 0;
      if (this.weaponSwitchTimer > 0) {
        this.weaponSwitchTimer--;
        this._processShotgunSwitchCrack(cfg);
      }
      if (this.weaponSwitchTimer <= 0) {
        this.cqcComboPhase = null;
        this.weaponSwitchTimer = 0;
        this.shootCooldown = 10;
      }
    } else if (this.cqcComboPhase === 'STOP_RELOAD') {
      this.vx = 0;
      this.vy = 0;
      if (this.isReloading && this.reloadTimer > 0) {
        this.reloadTimer--;
        this._processShotgunReload(cfg);
        this._processRifleReload(cfg);
        this._processPistolReload(cfg);
      }
      // Reload finishes and resumes ready stance to shoot
      if (!this.isReloading || this.reloadTimer <= 0) {
        this.cqcComboPhase = null;
        this.magazineBullets = this.maxMagazine || 12;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.shootCooldown = this.shootCooldownMax || 20;
        if (this.currentEquippedWeapon === 'shotgun') {
          const sgCrackSfx = cfg.sounds?.shotgunCrack || cfg.shotgunCrackSound || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3';
          const sgCrackVol = cfg.soundVolumes?.shotgunCrack ?? cfg.shotgunCrackVolume ?? 0.85;
          audioSystem.playSFX(sgCrackSfx, sgCrackVol); // Pump rack chamber
        }
      }
    }
  }

  /**
   * 3-Way Cyclical Weapon Switch: Pistol -> Shotgun -> M4 Rifle -> Pistol
   * Tosses empty weapon forward, equips new firearm, triggers weapon racking SFX and voiceline.
   */
  switchWeapon(targetWeapon = null) {
    const cfg = CONFIG.john_wick || {};

    // 1. Throw/Toss the current gun forward into the arena
    spawnThrownGun(this.x, this.y, this.gunAngle, this.currentEquippedWeapon || 'pistol', this.r);

    // 2. 3-Way Cyclical Weapon Switch: Pistol -> Shotgun -> Rifle -> Pistol
    let nextWeapon = targetWeapon;
    if (!nextWeapon) {
      if (this.currentEquippedWeapon === 'pistol') {
        nextWeapon = 'shotgun';
      } else if (this.currentEquippedWeapon === 'shotgun') {
        nextWeapon = 'rifle';
      } else {
        nextWeapon = 'pistol';
      }
    }
    this.currentEquippedWeapon = nextWeapon;

    // 3. Set weapon capacity, magazine & name
    let weaponName = 'TTI PIT VIPER!';
    if (nextWeapon === 'shotgun') {
      this.maxMagazine = cfg.shotgunMagazineSize || 6;
      this.magazineBullets = this.maxMagazine;
      this.shootCooldownMax = cfg.shotgunFireCooldown || 34;
      weaponName = 'BENELLI M4!';
      this._shotgunCrackSoundPlayed = false;
      this.isUltimateMode = false;
      this.isExcommunicado = false;
    } else if (nextWeapon === 'rifle') {
      const baseRifleMag = cfg.rifleMagazineSize || 30;
      const ammoMult = cfg.excommunicadoAmmoMultiplier || 1.50;
      this.maxMagazine = cfg.excommunicadoRifleMagazineSize || Math.round(baseRifleMag * ammoMult);
      this.magazineBullets = this.maxMagazine;
      this.shootCooldownMax = cfg.rifleFireCooldown || 7;
      weaponName = 'EXCOMMUNICADO (M4 RIFLE)!';
      this._rifleCrackSoundPlayed = false;
      this.isUltimateMode = true;
      this.isExcommunicado = true;
    } else {
      this.maxMagazine = cfg.magazineSize || 12;
      this.magazineBullets = this.maxMagazine;
      this.shootCooldownMax = cfg.fireCooldown || 20;
      weaponName = 'TTI PIT VIPER!';
      this.isUltimateMode = false;
      this.isExcommunicado = false;
    }

    // 4. Start Weapon Switch Animation & Racking
    const swDur = (nextWeapon === 'shotgun')
      ? (cfg.shotgunSwitchDuration || 44)
      : (nextWeapon === 'rifle')
        ? (cfg.rifleSwitchDuration || 44)
        : (cfg.weaponSwitchDuration || 36);
    this.weaponSwitchTimer = swDur;
    this.weaponSwitchMaxTime = swDur;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shootCooldown = swDur;

    // 5. Audio: mechanical racking click & pump + switch gun voiceline (chance-based)
    const switchSfx = cfg.sounds?.weaponSwitch || cfg.weaponSwitchSound || 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3';
    const switchVol = cfg.soundVolumes?.weaponSwitch ?? cfg.weaponSwitchVolume ?? 0.90;
    audioSystem.playSFX(switchSfx, switchVol);

    const switchVoiceChance = cfg.soundChances?.weaponSwitchVoice ?? (cfg.weaponSwitchVoiceChance !== undefined ? cfg.weaponSwitchVoiceChance : 0.55);
    if (Math.random() < switchVoiceChance) {
      const switchVoice = cfg.sounds?.weaponSwitchVoice || cfg.weaponSwitchVoiceSound || 'Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3';
      const switchVoiceVol = cfg.soundVolumes?.weaponSwitchVoice ?? cfg.weaponSwitchVoiceVolume ?? 1.0;
      audioSystem.playSFX(switchVoice, switchVoiceVol);
    }

    spawnSparks(this.x, this.y, 8, 'silverStreak', '#F59E0B');
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 14, weaponName, '#F59E0B');
  }

  /**
   * Triggers the authentic mechanical shotgun pump crack sound & chamber sparks during weapon equip
   */
  _processShotgunSwitchCrack(cfg) {
    if (this.currentEquippedWeapon !== 'shotgun' || this.weaponSwitchTimer <= 0) return;
    const swProg = 1.0 - (this.weaponSwitchTimer / (this.weaponSwitchMaxTime || 44));
    // At peak of the lift (~28-30% through), trigger the shotgun rack & crack SFX and chamber sparks!
    if (swProg >= 0.28 && !this._shotgunCrackSoundPlayed) {
      this._shotgunCrackSoundPlayed = true;
      const crackSfx = cfg.sounds?.shotgunCrack || cfg.shotgunCrackSound || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3';
      const crackVol = cfg.soundVolumes?.shotgunCrack ?? cfg.shotgunCrackVolume ?? 0.95;
      audioSystem.playSFX(crackSfx, crackVol);

      // Tactical chamber spark burst when cracked
      const angle = this.gunAngle || 0;
      const facingLeft = Math.abs(angle) > Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const perpX = -sinA;
      const perpY = cosA;
      const chX = this.x + cosA * (this.r + 12) + perpX * (facingLeft ? 4 : -4);
      const chY = this.y + sinA * (this.r + 12) + perpY * (facingLeft ? 4 : -4);
      spawnSparks(chX, chY, 8, 'silverStreak', '#F59E0B');
    }
  }

  /**
   * Triggers the authentic mechanical M4 charging handle rack / crack sound & chamber sparks during weapon equip
   */
  _processRifleSwitchCrack(cfg) {
    if (this.currentEquippedWeapon !== 'rifle' || this.weaponSwitchTimer <= 0) return;
    const swProg = 1.0 - (this.weaponSwitchTimer / (this.weaponSwitchMaxTime || 44));
    // At peak of the lift (~28-30% through), trigger the M4 charging handle rack & crack SFX and chamber sparks!
    if (swProg >= 0.28 && !this._rifleCrackSoundPlayed) {
      this._rifleCrackSoundPlayed = true;
      const crackSfx = cfg.sounds?.rifleCrack || cfg.rifleCrackSound || 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3';
      const crackVol = cfg.soundVolumes?.rifleCrack ?? cfg.rifleCrackVolume ?? 0.90;
      audioSystem.playSFX(crackSfx, crackVol);

      // Tactical chamber spark burst and mechanical vibration
      const angle = this.gunAngle || 0;
      const facingLeft = Math.abs(angle) > Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const perpX = -sinA;
      const perpY = cosA;
      const chX = this.x + cosA * (this.r + 10) + perpX * (facingLeft ? 3.5 : -3.5);
      const chY = this.y + sinA * (this.r + 10) + perpY * (facingLeft ? 3.5 : -3.5);
      spawnSparks(chX, chY, 8, 'gold', '#F59E0B');
      spawnSparks(chX, chY, 5, 'silverStreak', '#CBD5E1');
      triggerGlobalScreenShake(1.4, 3);
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 14, 'CHARGING HANDLE!', '#38BDF8');
    }
  }

  /**
   * Helper to find the nearest valid enemy candidate (fighter or illusion) within maxDist
   */
  _findCloseEnemyTarget(maxDist) {
    if (typeof state === 'undefined') return null;
    let closest = null;
    let closestDist = maxDist;

    if (state.fighters) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !this.isTeammate(f)) {
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d <= closestDist) {
            closest = f;
            closestDist = d;
          }
        }
      }
    }
    if (state.illusions) {
      const myIdx = state.fighters ? state.fighters.indexOf(this) : -1;
      for (const ill of state.illusions) {
        if (ill && ill.hp > 0 && ill.owner !== myIdx && !this.isTeammate(ill.owner)) {
          const d = Math.hypot(ill.x - this.x, ill.y - this.y);
          if (d <= closestDist) {
            closest = ill;
            closestDist = d;
          }
        }
      }
    }
    return closest;
  }

  /**
   * Executes a C.A.R. Gun-Fu martial arts melee strike in a frontal arc
   */
  _executeGunFuStrike(primaryTarget, facing, cfg) {
    const reach = cfg.meleePunchReach || 85;
    const arc = cfg.meleePunchArc || ((130 * Math.PI) / 180);

    const candidates = [];
    if (state.fighters) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !this.isTeammate(f)) candidates.push(f);
      }
    }
    if (state.illusions) {
      const myIdx = state.fighters ? state.fighters.indexOf(this) : -1;
      for (const ill of state.illusions) {
        if (ill && ill.hp > 0 && ill.owner !== myIdx && !this.isTeammate(ill.owner)) candidates.push(ill);
      }
    }

    let hitAny = false;
    for (const target of candidates) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + (target.r || 25)) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          // Gojo Limitless Infinity Barrier Check
          const isTargetGojoInfinity = (target.characterId === 'gojo' || target.type === 'gojo' || target._def?.id === 'gojo') &&
            (target.infinityCooldown <= 0 || target.domainActive || !target.isMeleeMode);

          if (isTargetGojoInfinity) {
            if (typeof target.triggerInfinityBlock === 'function') {
              target.triggerInfinityBlock(this.x, this.y, this);
            }
            this.vx = -Math.cos(facing) * 12;
            this.vy = -Math.sin(facing) * 12;
            spawnSparks(target.x, target.y, 12, 'cyan', '#00E5FF');
            spawnImpactFlash(target.x, target.y, 28, 'layla');
            const deflectSfx = cfg.sounds?.bulletDeflect || 'Assets/Sound Effects/Skills/parry.mp3';
            const deflectVol = cfg.soundVolumes?.bulletDeflect ?? 0.85;
            audioSystem.playSFX(deflectSfx, deflectVol);
            spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, 'BLOCKED!', '#00E5FF');
            continue;
          }

          // 1. Deal Melee CQC Damage
          const dmg = cfg.meleePunchDamage || 26;
          applyDamageToTarget(target, dmg, this, { isMelee: true, isBasicAttack: true });

          // 2. Physical Knockback Impulse & Attacker Lunge Step
          const pushForce = cfg.meleeKnockback || 15;
          target.vx = (target.vx || 0) + Math.cos(facing) * (pushForce * 0.45);
          target.vy = (target.vy || 0) + Math.sin(facing) * (pushForce * 0.45);
          target.x += Math.cos(facing) * (pushForce * 0.35);
          target.y += Math.sin(facing) * (pushForce * 0.35);

          // Forward punch lunge impulse on John Wick
          this.vx += Math.cos(facing) * 2.8;
          this.vy += Math.sin(facing) * 2.8;

          // Arena boundary clamp to prevent entities from being pushed through walls
          if (state.arena) {
            const minX = state.arena.x + (target.r || 20);
            const maxX = state.arena.x + state.arena.width - (target.r || 20);
            const minY = state.arena.y + (target.r || 20);
            const maxY = state.arena.y + state.arena.height - (target.r || 20);
            target.x = Math.max(minX, Math.min(maxX, target.x));
            target.y = Math.max(minY, Math.min(maxY, target.y));
          }

          // 3. Audio & Visual Impact
          spawnFloatingText(target.x, (target.y - (target.z || 0)) - target.r - 10, 'GUN-FU!', '#F59E0B');
          spawnSparks(target.x, target.y, 8, '#F59E0B');
          spawnBloodEffect(target, 8, facing, { minSize: cfg.meleeHitBloodMinSize || 2.5, maxSize: cfg.meleeHitBloodMaxSize || 4.8, count: cfg.meleeHitBloodCount || 3 });
          const hitSfx = cfg.sounds?.fleshHit || 'attack_fleshhit';
          const hitVol = cfg.soundVolumes?.fleshHit ?? 0.9;
          audioSystem.playSFX(hitSfx, hitVol);
          triggerGlobalScreenShake(2.0, 5);

          // 4. Focus Meter Gain on Melee Strike
          this.focusGauge = Math.min(this.maxFocusGauge, this.focusGauge + (cfg.focusGainPerMeleeHit || 12));

          hitAny = true;
        }
      }
    }

    if (hitAny || primaryTarget) {
      this.punchAnimTimer = 16;
      this.meleeCooldown = cfg.meleePunchCooldown || 22;
      this.isMeleeMode = true;
    }
  }

  /**
   * Primary / Secondary Weapon Shoot:
   * Fires TTI Pit Viper 9mm or Benelli M4 Tactical Shotgun depending on currentEquippedWeapon.
   * When magazine is expended, enters Assassination Melee Combo!
   */
  shoot(ownerIndex) {
    if (typeof state !== 'undefined' && state.gameState !== 'playing') return;
    if (this.isCaughtInBeam()) {
      this.interruptAttacks();
      return;
    }
    if ((this.paralyzeTimer && this.paralyzeTimer > 0) || this.isParalyzed) {
      return;
    }
    if (this.cqcComboPhase || this.isReloading || (this.weaponSwitchTimer && this.weaponSwitchTimer > 0) || this.isRolling) return;

    const cfg = CONFIG.john_wick || {};
    this.magazineBullets--;

    const angle = this.gunAngle || 0;
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    if (this.currentEquippedWeapon === 'shotgun') {
      // ── BENELLI M4 TACTICAL SHOTGUN BLAST (Multi-pellet buckshot cone) ──
      const defaultScale = 1.20;
      const localTipX = this.r * 0.85 + 48 * defaultScale;
      const localTipY = (facingLeft ? 1.5 : -1.5);
      const spawnX = this.x + cosA * localTipX + perpX * localTipY;
      const spawnY = this.y + sinA * localTipX + perpY * localTipY;

      if (projectileSystem) {
        const pelletCount = cfg.shotgunPelletCount || 6;
        const spreadArc = cfg.shotgunSpreadAngle || 0.42; // ~24°
        const baseSpeed = cfg.shotgunPelletSpeed || 23.0;
        const pelletDmg = cfg.shotgunPelletDamage || 12;

        for (let k = 0; k < pelletCount; k++) {
          const pelletAngle = angle + (Math.random() - 0.5) * spreadArc;
          const pelletSpeed = baseSpeed * (0.92 + Math.random() * 0.16);
          projectileSystem.fireProjectile(this, ownerIndex, pelletDmg, false, pelletSpeed, false, 'johnWickShotgunPellet', spawnX, spawnY, pelletAngle);
        }
      }

      const sgShotSfx = cfg.sounds?.shotgunShot || 'Assets/Sound Effects/Attacks/shootgunshot.mp3';
      const sgShotVol = cfg.soundVolumes?.shotgunShot ?? 0.95;
      audioSystem.playSFX(sgShotSfx, sgShotVol);

      const sgCrackSfx = cfg.sounds?.shotgunCrack || cfg.shotgunCrackSound || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3';
      const sgCrackVol = cfg.soundVolumes?.shotgunCrack ?? cfg.shotgunCrackVolume ?? 0.85;
      const sgCrackDelay = cfg.soundDelays?.shotgunCrack ?? 180;
      audioSystem.playSFX(sgCrackSfx, sgCrackVol, 1.0, 0, sgCrackDelay);
      triggerGlobalScreenShake(cfg.shotgunFireShakeIntensity || 3.8, cfg.shotgunFireShakeDuration || 8);
      spawnSpentCasing(this.x, this.y, angle, '12gauge', this.r);

      // Physical recoil impulse pushing John Wick backwards
      const backAngle = angle + Math.PI;
      const selfPush = cfg.shotgunSelfPushback || 5.2;
      this.vx += Math.cos(backAngle) * selfPush;
      this.vy += Math.sin(backAngle) * selfPush;

      this.recoilOffset = cfg.shotgunRecoilDistance || 20.0;
      this.flashTimer = cfg.shotgunFlashDuration || 6;
      this.casingTimer = cfg.shotgunCasingDuration || 24;
      this.shootCooldown = cfg.shotgunFireCooldown || 34;

      this.focusGauge = Math.min(this.maxFocusGauge, this.focusGauge + (cfg.focusGainPerBulletHit || 8) * 1.5);
    } else if (this.currentEquippedWeapon === 'rifle') {
      // ── M4A1 CARBINE / M4 RIFLE RAPID 5.56 FIRE ──
      const defaultScale = 1.18;
      const localTipX = this.r * 0.85 + 50 * defaultScale;
      const localTipY = (facingLeft ? 1.0 : -1.0);
      const spawnX = this.x + cosA * localTipX + perpX * localTipY;
      const spawnY = this.y + sinA * localTipX + perpY * localTipY;

      if (projectileSystem) {
        const speed = cfg.rifleBulletSpeed || 24.5;
        const damage = cfg.rifleBulletDamage || 14;
        projectileSystem.fireProjectile(this, ownerIndex, damage, false, speed, false, 'johnWickRifleBullet', spawnX, spawnY, angle);
      }

      // Spawn physical tumbling 5.56 NATO spent casing popping out of ejection port
      spawnSpentCasing(this.x, this.y, angle, '556', this.r);

      const rifleSfx = cfg.sounds?.rifleShot || cfg.rifleFireSound || 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3';
      const rifleVol = cfg.soundVolumes?.rifleShot ?? cfg.rifleFireVolume ?? 0.85;
      audioSystem.playSFX(rifleSfx, rifleVol);
      triggerGlobalScreenShake(cfg.rifleFireShakeIntensity || 1.4, cfg.rifleFireShakeDuration || 3);

      // Physical recoil impulse pushing John Wick slightly backwards
      const backAngle = angle + Math.PI;
      const selfPush = cfg.rifleSelfPushback || 1.2;
      this.vx += Math.cos(backAngle) * selfPush;
      this.vy += Math.sin(backAngle) * selfPush;

      this.recoilOffset = cfg.rifleRecoilDistance || 7.5;
      this.flashTimer = cfg.rifleFlashDuration || 4;
      this.casingTimer = cfg.rifleCasingDuration || 12;
      this.shootCooldown = cfg.rifleFireCooldown || 7;

      this.focusGauge = Math.min(this.maxFocusGauge, this.focusGauge + (cfg.focusGainPerBulletHit || 8) * 0.6);
    } else {
      // ── TTI PIT VIPER 9mm BULLET ──
      const defaultWeaponScale = 1.25;
      const localTipX = this.r * 0.85 + 28 * defaultWeaponScale;
      const localTipY = (facingLeft ? 3.5 : -3.5);
      const spawnX = this.x + cosA * localTipX + perpX * localTipY;
      const spawnY = this.y + sinA * localTipX + perpY * localTipY;

      if (projectileSystem) {
        const speed = cfg.bulletSpeed || 20.5;
        const damage = cfg.bulletDamage || this.damage || 22;
        projectileSystem.fireProjectile(this, ownerIndex, damage, false, speed, false, 'johnWickBullet', spawnX, spawnY, angle);
      }

      spawnSpentCasing(this.x, this.y, angle, '9mm', this.r);

      const sound = getBasicAttackSound(this._def?.id, this._def?.type);
      if (sound) {
        this._attackSoundTimer = sound.delay;
        this._attackSoundConfig = sound;
      }

      triggerGlobalScreenShake(cfg.bulletFireShakeIntensity || 1.2, cfg.bulletFireShakeDuration || 3);
      this.recoilOffset = cfg.recoilDistance || 8.0;
      this.flashTimer = cfg.flashDuration || 4;
      this.casingTimer = cfg.casingDuration || 12;
      this.shootCooldown = cfg.fireCooldown || 20;

      this.focusGauge = Math.min(this.maxFocusGauge, this.focusGauge + (cfg.focusGainPerBulletHit || 8));
    }

    // ── TRIGGER ASSASSINATION COMBO ON EMPTY MAGAZINE (WITH DELAY FRAMES) ──
    if (this.magazineBullets <= 0) {
      this.magazineBullets = 0;
      const targetEnemy = this._findCloseEnemyTarget(450) || (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0 && !this.isTeammate(f)) : null);
      if (targetEnemy) {
        this.pendingAssassinationTarget = targetEnemy;
        this.outOfAmmoRollDelayTimer = cfg.outOfAmmoRollDelayFrames || 18;
      } else {
        // Fallback reload if no enemy is alive
        this.isReloading = true;
        this._hasDroppedMag = false;
        this._hasSlappedNewMag = false;
        this._hasPlayedReloadSound = false;
        let rTime = cfg.reloadTime || 75;
        if (this.currentEquippedWeapon === 'shotgun') {
          rTime = cfg.shotgunReloadTime || 96;
          this.magazineBullets = 0;
        } else if (this.currentEquippedWeapon === 'rifle') {
          rTime = cfg.rifleReloadTime || 85;
        }
        this.reloadTimer = rTime;
        this.reloadMaxTime = rTime;
        this.shootCooldown = rTime;
      }
    }
  }

  /**
   * Close-Quarters Combat (CQC) Check:
   * Only triggers assassination combo if magazine is empty and out-of-ammo delay has passed!
   */
  _updateMeleeCombat() {
    if (this.cqcComboPhase || this.hp <= 0 || this.isReloading || this.outOfAmmoRollDelayTimer > 0) return;
    if (this.magazineBullets <= 0 && !this.pendingAssassinationTarget) {
      const closeTarget = this._findCloseEnemyTarget(120);
      if (closeTarget) {
        const cfg = CONFIG.john_wick || {};
        this.pendingAssassinationTarget = closeTarget;
        this.outOfAmmoRollDelayTimer = cfg.outOfAmmoRollDelayFrames || 18;
      }
    }
  }

  /**
   * Skill 1: Tactical Combat Roll & Evade Buff Activation
   * Grants active intangibility / evade buff where incoming attacks and projectiles pass harmlessly through
   */
  performCombatRoll(opponent) {
    if (this.isRolling || (this.hitStunTimer && this.hitStunTimer > 0) || (this.paralyzeTimer && this.paralyzeTimer > 0) || this.hp <= 0) return;
    const cfg = CONFIG.john_wick || {};
    this.isRolling = true;
    this.isRollingBack = false;
    this.rollTimer = cfg.rollDuration || 18;
    this.rollMaxTimer = cfg.rollDuration || 18;
    this.rollCooldown = cfg.rollCooldown || 240;
    this.evadeBuffTimer = cfg.evadeBuffDuration || 40;
    this.evadeChance = cfg.evadeChance ?? 1.0;

    // Roll Vector: Flank / weave perpendicular or along facing direction
    let rollAngle = this.gunAngle || 0;
    if (opponent) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const oppAngle = Math.atan2(dy, dx);
      // Tactical weave / dodge angle
      rollAngle = oppAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    }
    const rollSpeed = (cfg.rollDistance || 160) / (cfg.rollDuration || 18);
    this.vx = Math.cos(rollAngle) * rollSpeed;
    this.vy = Math.sin(rollAngle) * rollSpeed;

    // Tactical quick-draw reload on roll execution
    if (cfg.rollInstantReload) {
      this.magazineBullets = this.maxMagazine || cfg.magazineSize || 12;
      this.isReloading = false;
      this.reloadTimer = 0;
    }

    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 16, 'COMBAT ROLL!', '#F59E0B');
    spawnSparks(this.x, this.y, 8, 'silverStreak', '#CBD5E1');
    const rollSfx = cfg.sounds?.rollForward || cfg.sounds?.combatRoll || 'Assets/Sound Effects/Skills/dash1.mp3';
    const rollVol = cfg.soundVolumes?.rollForward ?? (cfg.soundVolumes?.combatRoll ?? 0.80);
    audioSystem.playSFX(rollSfx, rollVol);
  }

  /**
   * Tactical Evasive Roll: Intelligently triggered ONLY when an enemy gets near to John Wick (proximity trigger)
   * or when closing in for melee. Performs an evasive combat roll to create distance and reposition.
   * Eliminates random rolling while simply moving across empty space.
   */
  _checkTacticalEvadeRoll(opponent, arena) {
    if (this.isRolling || this.cqcComboPhase || this.hp <= 0) return;
    if ((this.hitStunTimer && this.hitStunTimer > 0) || (this.paralyzeTimer && this.paralyzeTimer > 0) || this.isTargetOfAmbush) return;
    if (typeof state === 'undefined' || state.gameState !== 'playing') return;

    if (this.movementRollCooldown > 0) {
      this.movementRollCooldown--;
      return;
    }

    const cfg = CONFIG.john_wick || {};
    const closeDistThreshold = cfg.rollEnemyCloseDistance || 110;

    // Query for nearby enemy threat (fighters or illusions)
    let threatTarget = null;
    let minThreatDist = Infinity;

    // Check primary opponent
    if (opponent && opponent.hp > 0 && !opponent.isDying) {
      const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (d <= closeDistThreshold) {
        threatTarget = opponent;
        minThreatDist = d;
      }
    }

    // Check all other enemy fighters
    if (!threatTarget && state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0 || f.isDying || f.isTurret) continue;
        if (typeof state.getFighterTeam === 'function') {
          const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
          const theirTeam = state.getFighterTeam(i);
          if (myTeam !== null && myTeam === theirTeam) continue;
        }
        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d <= closeDistThreshold && d < minThreatDist) {
          threatTarget = f;
          minThreatDist = d;
        }
      }
    }

    // Also check illusions if no fighter found
    if (!threatTarget && state.illusions) {
      for (let i = 0; i < state.illusions.length; i++) {
        const ill = state.illusions[i];
        if (!ill || ill.hp <= 0) continue;
        const d = Math.hypot(ill.x - this.x, ill.y - this.y);
        if (d <= closeDistThreshold && d < minThreatDist) {
          threatTarget = ill;
          minThreatDist = d;
        }
      }
    }

    // Only roll if an enemy actually got close!
    if (!threatTarget) return;

    // Execute Tactical Combat Roll to evade/reposition
    this.isRolling = true;
    this.isRollingBack = false;
    const rollDur = cfg.rollDuration || cfg.movementRollDuration || 18;
    this.rollTimer = rollDur;
    this.rollMaxTimer = rollDur;
    this.movementRollCooldown = cfg.rollCooldown || 180;
    this.evadeBuffTimer = cfg.rollEvadeDuration || 24;

    // Roll angle: Roll away from the close enemy, or lateral flank (weave 45-90 degrees) to escape
    const dx = this.x - threatTarget.x;
    const dy = this.y - threatTarget.y;
    const awayAngle = Math.atan2(dy, dx);
    const lateralWeave = (Math.random() < 0.5 ? 0.45 : -0.45);
    let rollAngle = awayAngle + lateralWeave;

    // Check arena wall collision anticipation so he rolls toward open space
    if (arena) {
      const futureX = this.x + Math.cos(rollAngle) * 80;
      const futureY = this.y + Math.sin(rollAngle) * 80;
      if (futureX < arena.x + 30 || futureX > arena.x + arena.width - 30 ||
          futureY < arena.y + 30 || futureY > arena.y + arena.height - 30) {
        // Steer toward center of arena
        const arenaCenterX = arena.x + arena.width / 2;
        const arenaCenterY = arena.y + arena.height / 2;
        rollAngle = Math.atan2(arenaCenterY - this.y, arenaCenterX - this.x);
      }
    }

    const rollSpeed = cfg.rollSpeed || cfg.movementRollSpeed || 20.0;
    this.vx = Math.cos(rollAngle) * rollSpeed;
    this.vy = Math.sin(rollAngle) * rollSpeed;

    // Audio & VFX
    const rollSfx = cfg.sounds?.rollForward || cfg.sounds?.combatRoll || 'Assets/Sound Effects/Skills/dash1.mp3';
    const rollVol = cfg.soundVolumes?.rollForward ?? (cfg.soundVolumes?.combatRoll ?? 0.85);
    audioSystem.playSFX(rollSfx, rollVol);

    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 14, 'EVASIVE ROLL!', '#F59E0B');
    spawnSparks(this.x, this.y, 8, 'silverStreak', '#CBD5E1');
  }

  /**
   * Passive 1: Ballistic Tailored Suit & Passive Evade Mechanic
   * - 40% Ranged Damage Resistance: Mitigates damage from enemy bullets, arrows, energy bolts, and ranged projectiles.
   * - Coat Deflection: Spawns Kevlar ricochet sparks, parry audio, and triggers carbon-weave shimmer overlay.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.hp <= 0) return false;

    const cfg = CONFIG.john_wick || {};
    const isExcommunicado = (this.currentEquippedWeapon === 'rifle');
    const isTrueDamage = Boolean(opts && (opts.isTrueDamage || opts.trueDamage || opts.isPureLoveBeam || opts.isPurpleDPS));

    // Check if damage is continuous beam, laser, domain slashes, burn, bleed, or tick damage
    const isTickOrBeamDamage = Boolean(
      isTrueDamage || (
        opts && (
          opts.isPureLoveBeam ||
          opts.isGenosBeam ||
          opts.isLaser ||
          opts.isLaserBeam ||
          opts.isBeam ||
          opts.isContinuous ||
          opts.isTickDamage ||
          opts.isTick ||
          opts.isBleed ||
          opts.fromBleed ||
          opts.isBleedTick ||
          opts.isBurn ||
          opts.fromBurn ||
          opts.isBurnTick ||
          opts.isPoison ||
          opts.fromPoison ||
          opts.isPurpleDPS ||
          opts.isDomainSlash ||
          opts.fromDomain ||
          opts.fromBlackHole ||
          opts.isAuraDamage
        )
      ) || (
        typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()
      ) || (
        this.caughtInGenosBeam || this.caughtInPureLoveBeam || this.caughtInLaserBeam || (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) || (this.purpleHitTimer && this.purpleHitTimer > 0)
      ) || (
        attacker && (attacker.isFiringUlt || attacker.isFiringPureLoveBeam || attacker.isFiringBeam || attacker.isChannelingPureLoveBeam || attacker.isLaserFiring)
      )
    );

    // ── 1. PASSIVE EVADE / INTANGIBILITY (Excommunicado Multiplier / Guaranteed Dodge) ──
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit));
    const isEvadeActive = Boolean(this.isEvadeAlwaysActive || isExcommunicado || (this.isRolling && this.rollTimer > 0) || (this.evadeBuffTimer && this.evadeBuffTimer > 0));
    if (isEvadeActive && !isTickOrBeamDamage && !isGuaranteedHit) {
      const baseEvade = this.evadeChance !== undefined ? this.evadeChance : (cfg.evadeChance ?? 1.0);
      const chance = isExcommunicado ? (cfg.excommunicadoEvadeChance ?? Math.min(1.0, baseEvade * (cfg.excommunicadoEvadeMultiplier || 1.50))) : baseEvade;
      if (Math.random() <= chance) {
        // Cooldown throttle on floating text / sparks so it doesn't spam layout
        const now = Date.now();
        if (!this._lastEvadeTextTime || now - this._lastEvadeTextTime > 120) {
          this._lastEvadeTextTime = now;
          spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, 'MISS!', '#E2E8F0');
          spawnSparks(this.x, this.y, 8, isExcommunicado ? 'gold' : 'silverStreak', isExcommunicado ? '#F59E0B' : '#CBD5E1');
          const evadeSfx = cfg.sounds?.evadeWoosh || 'Assets/Sound Effects/Skills/woosh.mp3';
          const evadeVol = cfg.soundVolumes?.evadeWoosh ?? 0.5;
          audioSystem.playSFX(evadeSfx, evadeVol);
        }
        return false; // Attack misses and deals no damage!
      }
    }

    let finalAmount = amount;

    // ── 2. PASSIVE 1: BALLISTIC TAILORED SUIT (Enhanced DEF Multiplier in Excommunicado) ──
    if (!isTrueDamage && !isGuaranteedHit && !opts?.bypassShield && cfg.ballisticSuitDamageReduction) {
      let defReduction = cfg.ballisticSuitDamageReduction;
      if (isExcommunicado) {
        defReduction = Math.min(0.85, defReduction * (cfg.excommunicadoDefMultiplier || 1.50));
      }
      finalAmount *= (1 - defReduction);
      this.suitShimmerTimer = cfg.ballisticSuitShimmerDuration || 14;

      if (cfg.ballisticSuitDeflectSparks !== false) {
        const now = Date.now();
        if (!this._lastSuitDeflectTime || now - this._lastSuitDeflectTime > 160) {
          this._lastSuitDeflectTime = now;
          spawnSparks(this.x, this.y - (this.z || 0), 6, 'gold', '#CBD5E1');
          spawnSparks(this.x, this.y - (this.z || 0), 4, 'silverStreak', '#E2E8F0');
          const deflectSfx = cfg.sounds?.bulletDeflect || 'Assets/Sound Effects/Skills/parry.mp3';
          const deflectVol = cfg.soundVolumes?.bulletDeflect ?? 0.35;
          audioSystem.playSFX(deflectSfx, deflectVol);
        }
      }
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  /**
   * Called by ProjectileSystem when one of John Wick's projectiles hits an enemy.
   * Triggers arena screen shake on hit with different intensities per weapon.
   */
  onDamageDealt(target, projectile, owner) {
    if (!projectile) return;
    const v = projectile.visual || '';

    if (v === 'johnWickShotgunPellet') {
      // Shotgun pellet hit — heavy thud impact
      triggerGlobalScreenShake(2.8, 6);
    } else if (v === 'johnWickRifleBullet') {
      // M4 Rifle hit — medium punch
      triggerGlobalScreenShake(1.8, 4);
    } else if (v === 'johnWickBullet') {
      // Pistol hit — crisp light snap
      triggerGlobalScreenShake(1.3, 3);
    }
  }

  _processShotgunReload(cfg) {
    if (this.currentEquippedWeapon !== 'shotgun' || !this.isReloading) return;
    const totalTime = this.reloadMaxTime || cfg.shotgunReloadTime || 96;
    const elapsed = totalTime - this.reloadTimer;
    const framesPerShell = cfg.shotgunFramesPerShell || 16;
    const maxMag = this.maxMagazine || 6;
    const targetShells = Math.min(maxMag, Math.floor(elapsed / framesPerShell));

    if (targetShells > this.magazineBullets && this.magazineBullets < maxMag) {
      this.magazineBullets = targetShells;
      const shellSfx = cfg.sounds?.shotgunShellReload || cfg.shotgunShellReloadSound || 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3';
      const shellVol = cfg.soundVolumes?.shotgunShellReload ?? cfg.shotgunShellReloadVolume ?? 0.85;
      audioSystem.playSFX(shellSfx, shellVol);
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, `SHELL ${this.magazineBullets}/${maxMag}`, '#F59E0B');
      spawnSparks(this.x, this.y, 4, 'silverStreak', '#F59E0B');
    }
  }

  _processRifleReload(cfg) {
    if (this.currentEquippedWeapon !== 'rifle' || !this.isReloading) return;
    const totalTime = this.reloadMaxTime || cfg.rifleReloadTime || 85;
    const progress = 1.0 - (this.reloadTimer / totalTime);

    if (!this._hasPlayedReloadSound) {
      this._hasPlayedReloadSound = true;
      const rReloadSfx = cfg.sounds?.rifleReload || cfg.rifleReloadSound || 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3';
      const rReloadVol = cfg.soundVolumes?.rifleReload ?? cfg.rifleReloadVolume ?? 0.90;
      audioSystem.playSFX(rReloadSfx, rReloadVol);
    }

    // Phase 2: Drop empty physical magazine as John Wick pulls it down out of magwell
    if (progress >= 0.28 && !this._hasDroppedMag) {
      this._hasDroppedMag = true;
      spawnDroppedMagazine(this.x, this.y, this.gunAngle, 'rifle', this.r);
    }

    // Phase 4: Fresh magazine inserted & bolt slap chambering
    if (progress >= 0.85 && !this._hasSlappedNewMag) {
      this._hasSlappedNewMag = true;
      spawnSparks(this.x, this.y, 4, 'silverStreak', '#CBD5E1');
    }
  }

  _processPistolReload(cfg) {
    if (this.currentEquippedWeapon !== 'pistol' || !this.isReloading) return;
    const totalTime = this.reloadMaxTime || cfg.reloadTime || 75;
    const progress = 1.0 - (this.reloadTimer / totalTime);

    // Play pistol reload audio in sync with magazine insertion & slide racking
    const reloadSoundProgress = cfg.pistolReloadSoundProgress ?? 0.18;
    if (progress >= reloadSoundProgress && !this._hasPlayedReloadSound) {
      this._hasPlayedReloadSound = true;
      const pReloadSfx = cfg.sounds?.pistolReload || cfg.pistolReloadSound || 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3';
      const pReloadVol = cfg.soundVolumes?.pistolReload ?? cfg.pistolReloadVolume ?? 0.90;
      const pReloadDelay = cfg.soundDelays?.pistolReload || 0;
      audioSystem.playSFX(pReloadSfx, pReloadVol, 1.0, 0, pReloadDelay);
    }

    if (progress >= 0.25 && !this._hasDroppedMag) {
      this._hasDroppedMag = true;
      spawnDroppedMagazine(this.x, this.y, this.gunAngle, 'pistol', this.r);
    }

    if (progress >= 0.82 && !this._hasSlappedNewMag) {
      this._hasSlappedNewMag = true;
    }
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1: Freeze Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Cooldown housekeeping
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (this.evadeBuffTimer > 0) this.evadeBuffTimer--;
    if (this.rollCooldown > 0) this.rollCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.pencilAttackTimer > 0) this.pencilAttackTimer--;
    if (this.recoilOffset > 0) this.recoilOffset = Math.max(0, this.recoilOffset - 0.8);
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.casingTimer > 0) this.casingTimer--;
    const cfg = CONFIG.john_wick || {};

    if (this.suitShimmerTimer > 0) this.suitShimmerTimer--;
    if (!this.cqcComboPhase && this.weaponSwitchTimer > 0) {
      this.weaponSwitchTimer--;
      this._processShotgunSwitchCrack(cfg);
      this._processRifleSwitchCrack(cfg);
    }

    // 2. Update Assassination Combo State Machine
    if (this.cqcComboPhase) {
      this._updateAssassinationCombo(arena);
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 2. Normal / Tactical Roll movement damping & physics
    if (this.isRolling) {
      this.rollTimer--;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;

      const arenaObj = arena || state.arena || CONFIG.arena;
      if (arenaObj) {
        const tr = this.r || 25;
        this.x = Math.max(arenaObj.x + tr, Math.min(arenaObj.x + arenaObj.width - tr, this.x));
        this.y = Math.max(arenaObj.y + tr, Math.min(arenaObj.y + arenaObj.height - tr, this.y));
      }

      if (!this.isRollingBack && state.fighters) {
        for (const f of state.fighters) {
          if (f && f !== this && f.hp > 0 && !this.isTeammate(f)) {
            const isGojoInfinity = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') &&
              (f.infinityCooldown <= 0 || f.domainActive || !f.isMeleeMode);
            if (isGojoInfinity) {
              const dx = f.x - this.x;
              const dy = f.y - this.y;
              const dist = Math.hypot(dx, dy);
              const barrierDist = CONFIG.gojo?.infinityRadius ?? (f.r + 30);
              if (dist <= this.r + barrierDist) {
                const nx = dist > 0.001 ? (dx / dist) : Math.cos(this.gunAngle);
                const ny = dist > 0.001 ? (dy / dist) : Math.sin(this.gunAngle);
                const bounceForce = 18;

                this.vx = -nx * bounceForce;
                this.vy = -ny * bounceForce;
                this.isRollingBack = true;
                this.rollTimer = 18;
                this.rollMaxTimer = 18;

                if (typeof f.triggerInfinityBlock === 'function') {
                  f.triggerInfinityBlock(this.x + nx * this.r, this.y + ny * this.r, this);
                }

                spawnSparks(this.x + nx * this.r, this.y + ny * this.r, 14, 'cyan', '#00E5FF');
                spawnImpactFlash(this.x + nx * this.r, this.y + ny * this.r, 32, 'layla');
                audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.85);
                triggerGlobalScreenShake(2.5, 6);
                spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 14, 'INFINITY REBOUND!', '#00E5FF');
                break;
              }
            }
          }
        }
      }

      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.isRollingBack = false;
        this.hideGun = false;
      }

      if (opponent && opponent.hp > 0) this.aim(opponent);
      this._updateMeleeCombat();
      return;
    }

    // Reload handling
    if (this.isReloading) {
      this.reloadTimer--;
      this._processShotgunReload(cfg);
      this._processRifleReload(cfg);
      this._processPistolReload(cfg);
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine || cfg.magazineSize || 12;
        if (this.currentEquippedWeapon === 'shotgun') {
          audioSystem.playSFX(cfg.shotgunCrackSound || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3', cfg.shotgunCrackVolume || 0.85); // Pump rack chamber
        }
      }
    }

    // 3. Out-Of-Ammo delay countdown before initiating forward roll assassination combo
    if (this.outOfAmmoRollDelayTimer > 0) {
      this.outOfAmmoRollDelayTimer--;
      if (this.outOfAmmoRollDelayTimer <= 0 && this.magazineBullets <= 0 && !this.cqcComboPhase && !this.isReloading && !this.isRolling) {
        const target = (this.pendingAssassinationTarget && this.pendingAssassinationTarget.hp > 0 && !this.pendingAssassinationTarget.isDying)
          ? this.pendingAssassinationTarget
          : (this._findCloseEnemyTarget(450) || (opponent && opponent.hp > 0 ? opponent : null));
        this.pendingAssassinationTarget = null;
        if (target) {
          this.startAssassinationCombo(target);
        } else {
          this.isReloading = true;
          this._hasDroppedMag = false;
          this._hasSlappedNewMag = false;
          this._hasPlayedReloadSound = false;
          let rTime = cfg.reloadTime || 75;
          if (this.currentEquippedWeapon === 'shotgun') {
            rTime = cfg.shotgunReloadTime || 96;
            this.magazineBullets = 0;
          } else if (this.currentEquippedWeapon === 'rifle') {
            rTime = cfg.rifleReloadTime || 85;
          }
          this.reloadTimer = rTime;
          this.reloadMaxTime = rTime;
          this.shootCooldown = rTime;
        }
      }
    } else if (this.magazineBullets <= 0 && !this.cqcComboPhase && !this.isReloading && !this.isRolling && typeof state !== 'undefined' && state.gameState === 'playing') {
      const targetEnemy = this._findCloseEnemyTarget(450) || (opponent && opponent.hp > 0 ? opponent : null) || (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0 && !this.isTeammate(f)) : null);
      if (targetEnemy) {
        this.pendingAssassinationTarget = targetEnemy;
        this.outOfAmmoRollDelayTimer = cfg.outOfAmmoRollDelayFrames || 18;
      }
    }

    this._updateMeleeCombat();

    // Update Dynamic Movement Speed & Ultimate Mode (Excommunicado Speed Multiplier on M4 Rifle)
    const isExcommunicado = (this.currentEquippedWeapon === 'rifle');
    this.isExcommunicado = isExcommunicado;
    this.isUltimateMode = isExcommunicado;
    const baseSpeed = cfg.speed !== undefined ? cfg.speed : (cfg.moveSpeed !== undefined ? cfg.moveSpeed : 6.4);
    this.speed = isExcommunicado ? (baseSpeed * (cfg.excommunicadoSpeedMultiplier || 1.40)) : baseSpeed;

    super.update(opponent, ownerIndex, arena);

    // 4. Check Tactical Evasive Roll (Triggered when enemy approaches close)
    this._checkTacticalEvadeRoll(opponent, arena);
  }

  drawGun(ctx) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    if (this._isWinnerReveal) return;
    if (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) return;
    if (this.isTargetOfAmbush) return;
    if (this.isRolling) return;
    const isPlaying = (typeof state !== 'undefined' && state.gameState === 'playing');
    if (isPlaying && this.hideGun && !this.isPencilEquipped && this.pencilAttackTimer <= 0) return;

    if (this.pencilAttackTimer > 0 || this.isPencilEquipped) {
      const cfg = CONFIG.john_wick || {};
      drawJohnWickPencil(ctx, this.x, this.y, this.gunAngle, this.r, {
        stabTimer: this.pencilAttackTimer,
        stabMaxTime: this.pencilMaxTime || cfg.cqcPencilStabDuration || 56
      });
    } else if (this.currentEquippedWeapon === 'shotgun') {
      const cfg = CONFIG.john_wick || {};
      drawJohnWickShotgun(ctx, this.x, this.y, this.gunAngle, this.r, {
        recoilOffset: this.recoilOffset,
        flashTimer: this.flashTimer,
        casingTimer: this.casingTimer,
        casingMaxFrames: cfg.shotgunCasingDuration || 24,
        isReloading: this.isReloading,
        reloadTimer: this.reloadTimer,
        reloadMaxTime: cfg.shotgunReloadTime || 96,
        isSwitching: Boolean(this.weaponSwitchTimer && this.weaponSwitchTimer > 0),
        switchTimer: this.weaponSwitchTimer,
        switchMaxTime: this.weaponSwitchMaxTime || cfg.shotgunSwitchDuration || 44
      });
    } else if (this.currentEquippedWeapon === 'rifle') {
      const cfg = CONFIG.john_wick || {};
      drawJohnWickRifle(ctx, this.x, this.y, this.gunAngle, this.r, {
        recoilOffset: this.recoilOffset,
        flashTimer: this.flashTimer,
        casingTimer: this.casingTimer,
        isReloading: this.isReloading,
        reloadTimer: this.reloadTimer,
        reloadMaxTime: cfg.rifleReloadTime || 85,
        isSwitching: Boolean(this.weaponSwitchTimer && this.weaponSwitchTimer > 0),
        switchTimer: this.weaponSwitchTimer,
        switchMaxTime: this.weaponSwitchMaxTime || cfg.rifleSwitchDuration || 44
      });
    } else {
      const cfg = CONFIG.john_wick || {};
      drawJohnWickPistol(ctx, this.x, this.y, this.gunAngle, this.r, {
        recoilOffset: this.recoilOffset,
        flashTimer: this.flashTimer,
        casingTimer: this.casingTimer,
        isReloading: this.isReloading,
        reloadTimer: this.reloadTimer,
        reloadMaxTime: cfg.reloadTime || 75,
        isSwitching: Boolean(this.weaponSwitchTimer && this.weaponSwitchTimer > 0),
        switchTimer: this.weaponSwitchTimer,
        switchMaxTime: this.weaponSwitchMaxTime || cfg.weaponSwitchDuration || 36
      });
    }
  }

  drawBody(ctx) {
    drawJohnWickSkin(ctx, this);
    this.drawHealth(ctx);
  }

  interruptAttacks() {
    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks();
    }
    if (this.cqcComboTarget) {
      this.cqcComboTarget.isTargetOfAmbush = false;
      this.cqcComboTarget.caughtInJohnWickCombo = false;
    }
  }

  draw(ctx, opponent) {
    // Top-level skin & fighter render
    drawJohnWickSkin(ctx, this);

    // Draw weapon on top unless in Skin-Only mode or on Champion / Winner screen
    const isChamp = this._isWinnerReveal || (typeof isChampionScreenActive === 'function' && isChampionScreenActive());
    if (!isChamp && (typeof state === 'undefined' || !state.showSkinOnly)) {
      this.drawGun(ctx);
    }

    // Body overlay HP number display
    this.drawHealth(ctx);
  }
}

