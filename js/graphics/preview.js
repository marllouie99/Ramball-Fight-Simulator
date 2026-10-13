// ─────────────────────────────────────────────
// PREVIEW / DEMO SHARED HELPERS
// ─────────────────────────────────────────────
import { CONFIG } from '../core/config.js';
import { Fighter } from '../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../entities/factories/fighterFactory.js';
import { PreviewProjectileSystem } from './previewSystem.js';
import { state } from '../core/state.js';
import { audioSystem } from '../systems/audioSystem.js';

export let indexDetailState = null;
export let activePreviewState = null;
export const previewProjectileSystem = new PreviewProjectileSystem();

export function createPreviewFighter(def, x, y, options = {}) {
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const fighter = new FighterClass({
    ...def,
    startX: x,
    startY: y,
    startVx: 0,
    startVy: 0,
  });
  fighter.hideHpText = true;
  fighter.isDemoFighter = true;

  if (def.type === 'layla') {
    fighter._fireWeapon = function(ownerIndex, isUltimateShot = false) {
      const visualType = isUltimateShot ? 'layla_ultimate_bullet' : 'layla_basic_bullet';
      previewProjectileSystem.fireProjectile(
        this,
        ownerIndex,
        this.damage,
        false,
        this._def?.projectileSpeedMultiplier ? CONFIG.projectile.speed * this._def.projectileSpeedMultiplier : undefined
      );
      const projectiles = previewProjectileSystem.getProjectiles();
      const lastProj = projectiles[projectiles.length - 1];
      if (lastProj) {
        lastProj.visual = visualType;
        if (isUltimateShot) {
          lastProj.r = 15;
        }
      }
      
      const baseCooldown = CONFIG.layla.attackCooldown || 70;
      this.shootCooldown = this.isInUltimate ? Math.floor(baseCooldown / 3) : baseCooldown;
      this.gunRecoil = 1.0;
    };

    fighter._fireMaleficBomb = function(ownerIndex) {
      const bombSpeed = CONFIG.layla.bombSpeed || 5;
      const bombDamage = CONFIG.layla.bombDamage || 20;
      const bombRange = CONFIG.layla.bombRange || 250;
      
      previewProjectileSystem.fireProjectile(
        this,
        ownerIndex,
        bombDamage,
        false,
        bombSpeed
      );
      
      const projectiles = previewProjectileSystem.getProjectiles();
      const lastProj = projectiles[projectiles.length - 1];
      if (lastProj) {
        lastProj.visual = 'layla_bomb';
        lastProj.r = 12;
        lastProj.life = Math.ceil(bombRange / bombSpeed);
        lastProj.maxLife = lastProj.life;
      }
      
      this.maleficBombCooldown = CONFIG.layla.maleficBombCooldown || 180;
      this.gunRecoil = 2.0;
      this.bombFireAnimTimer = 22;
      this.bombFireKickbackTimer = 14;
      
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 15, 'MALEFIC BOMB!', '#00E5FF');
      }
    };
  }

  fighter.x = x;
  fighter.y = y;
  fighter.vx = options.vx ?? Math.cos(options.initialAngle ?? 0.6) * (fighter.speed || 1.5);
  fighter.vy = options.vy ?? Math.sin(options.initialAngle ?? 0.6) * (fighter.speed || 1.5);
  fighter.speed = fighter.baseSpeed || fighter.speed;
  fighter.shootCooldown = 0;
  fighter.gunAngle = options.gunAngle ?? 0;
  fighter.angle = options.angle ?? 0;
  fighter.shootCooldownMax = Math.max(18, Math.floor((def.cooldown || CONFIG.shoot.cooldown) / 3));
  fighter.meleeCooldown = 0;

  const isMelee = (def.category === 'Melee') || ['saitama', 'yuji', 'mahito', 'todo', 'toji', 'mahoraga', 'musashi', 'berserker', 'knight', 'melee'].includes(def.type) || fighter.isMeleeFighter;

  if (isMelee) {
    fighter.shoot = function() {};
  } else {
    fighter.shoot = function(ownerIndex) {
      previewProjectileSystem.fireProjectile(
        this,
        ownerIndex,
        this.damage,
        false,
        this._def?.projectileSpeedMultiplier ? CONFIG.projectile.speed * this._def.projectileSpeedMultiplier : undefined
      );
    };
  }

  fighter.shootGrenade = function(ownerIndex, opponent) {
    previewProjectileSystem.fireGrenade(this, ownerIndex, this.damage, opponent);
  };

  return fighter;
}

export function createPreviewTarget(demoArea, options = {}) {
  return {
    x: options.x ?? demoArea.x + demoArea.width - 70,
    y: options.y ?? demoArea.y + demoArea.height / 3,
    vx: options.vx ?? -0.9,
    vy: options.vy ?? 0.6,
    r: options.r ?? 10,
    hp: 999,
    takeDamage() {},
    applyPoison() {},
    onDamageDealt() {},
    applyHitStun() {},
    applySlow() {},
    applyStun() {},
    applyKnockback() {},
    applyTimeStop() {},
    interruptAttacks() {},
  };
}

export function createPreviewState(def, demoArea, options = {}) {
  const fighter = createPreviewFighter(def, options.fighterX ?? demoArea.x + 60, options.fighterY ?? demoArea.y + demoArea.height / 2, options);
  const target = createPreviewTarget(demoArea, options.target);

  return {
    index: options.index ?? state.indexInspectIndex,
    fighter,
    target,
    frame: 0,
    demoArea,
  };
}

export function resetIndexDetailState(def, demoArea) {
  indexDetailState = createPreviewState(def, demoArea, { index: state.indexInspectIndex });
  previewProjectileSystem.clear();
  return indexDetailState;
}

export function updateIndexDetailDemo(def, demoArea) {
  if (!indexDetailState || indexDetailState.index !== state.indexInspectIndex) {
    resetIndexDetailState(def, demoArea);
  }

  const pstate = indexDetailState;
  const fighter = pstate.fighter;
  const target = pstate.target;
  const demoSpeed = (state.indexDemoSpeed !== undefined) ? state.indexDemoSpeed : 1.0;

  // Handle Special Ability Animation Demo Modes (Skills / Passives / Ultimates)
  const currentAnim = state.indexDemoAnim || (def.type === 'toji' ? 'toji_basic' : 'basic');
  if (currentAnim && (currentAnim !== 'basic' || def.type === 'toji')) {
    pstate.hideTarget = true;
    fighter.x = demoArea.x + demoArea.width / 2;
    fighter.y = demoArea.y + demoArea.height / 2;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.gunAngle = Math.PI / 2 + (state.indexDemoRotation || 0); // Facing downward/forward + demo rotation offset
    fighter.angle = fighter.gunAngle;

    if (currentAnim === 'mixing' && def.type === 'gojo') {
      fighter.isChannelingPurple = true;
      fighter.is200PercentChannel = true;
      const chargeMax = CONFIG.gojo?.purpleSecondCastChargeMax || 180;
      fighter.purpleChargeMax = chargeMax;
      if (typeof fighter.getPurpleChargeProgress !== 'function') {
        fighter.getPurpleChargeProgress = function() {
          return Math.min(1.0, (this.purpleChargeTimer || 0) / (this.purpleChargeMax || chargeMax));
        };
      }
      if (demoSpeed > 0) {
        fighter.purpleChargeTimer = ((fighter.purpleChargeTimer || 0) + 1) % chargeMax;
      }
      const lev = Math.sin(Math.min(1.0, (fighter.purpleChargeTimer || 0) / (180 * 0.4)) * Math.PI * 0.5);
      fighter.z = lev * 35;
    } else if (currentAnim === 'red' && def.type === 'gojo') {
      const redTotal = 125;
      if (demoSpeed > 0) {
        if (!fighter.redEffectMaxTimer || (fighter.redEffectTimer || 0) <= 0) {
          fighter.redEffectMaxTimer = redTotal;
          fighter.redEffectTimer = redTotal;
          fighter.redBuildupPhase = true;
          fighter._hasPlayedRedFlareSound = false;
        } else {
          fighter.redEffectTimer--;
        }
      }
    } else if (currentAnim === 'domain') {
      fighter.isChannelingDomainExpansion = true;
      fighter.domainChargeMax = 120;
      if (demoSpeed > 0) {
        fighter.domainChargeTimer = ((fighter.domainChargeTimer || 0) + 1) % 120;
      }
    } else if (currentAnim === 'fuga' && def.type === 'sukuna') {
      fighter.isChannelingDivineFlame = true;
      fighter.divineFlameChargeMax = 120;
      if (demoSpeed > 0) {
        fighter.divineFlameChargeTimer = ((fighter.divineFlameChargeTimer || 0) + 1) % 120;
      }
    } else if (currentAnim === 'stealth' && def.type === 'toji') {
      fighter.isStealthed = true;
      fighter.stealthTimer = 60;
    } else if (currentAnim === 'clap' && def.type === 'todo') {
      fighter.punchAnimTimer = 18;
      fighter.punchAnimHand = (pstate.frame % 30 < 15) ? 0 : 1;
    } else if (currentAnim === 'level8' && def.type === 'mahoraga') {
      fighter.isInfinityBlitz = true;
      fighter.adaptationStage = { melee: 8, ranged: 0, skill: 0 };
    } else if (currentAnim === 'incinerate' && def.type === 'genos') {
      fighter.isChargingUlt = true;
      fighter.ultTimer = 60;
    } else if (currentAnim === 'hollow' && def.type === 'ichigo') {
      fighter.hollowMaskActive = true;
      const formationMax = CONFIG.ichigo?.hollowMaskFormationFrames || 54;
      fighter.hollowMaskFormationMax = formationMax;
      if (demoSpeed > 0) {
        if (fighter.hollowMaskFormationTimer === undefined || fighter.hollowMaskFormationTimer <= 0) {
          fighter.hollowMaskFormationTimer = formationMax;
        } else {
          fighter.hollowMaskFormationTimer--;
          if (fighter.hollowMaskFormationTimer <= 0) {
            if ((pstate.frame % 90) === 0) {
              fighter.hollowMaskFormationTimer = formationMax;
            }
          }
        }
      }
    } else if (currentAnim === 'getsuga' && def.type === 'ichigo') {
      fighter.isChannelingGetsuga = true;
      const chargeMax = 60;
      fighter.getsugaChargeMax = chargeMax;
      if (demoSpeed > 0) {
        fighter.getsugaChargeTimer = ((fighter.getsugaChargeTimer || 0) + 1) % chargeMax;
      }
    } else if (currentAnim === 'bankai' && def.type === 'ichigo') {
      fighter.bankaiActive = true;
      fighter.skin = 'bankai';
      const chargeMax = 60;
      fighter.bankaiChargeMax = chargeMax;
      if (demoSpeed > 0) {
        fighter.bankaiChargeTimer = ((fighter.bankaiChargeTimer || 0) + 1) % chargeMax;
      }
    } else if (def.type === 'maki' && ['maki_hit1', 'maki_hit2', 'maki_hit3', 'maki_combo'].includes(currentAnim)) {
      pstate.hideTarget = false;
      fighter.x = demoArea.x + demoArea.width / 2 - 40;
      fighter.y = demoArea.y + demoArea.height / 2;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.gunAngle = 0;
      fighter.angle = 0;

      const baseX = fighter.x + 72;
      const baseY = fighter.y;
      if (target) {
        target.x += (baseX - target.x) * 0.15;
        target.y += (baseY - target.y) * 0.15;
        target.r = 25;
        target.isDead = false;
        target.hp = 1000;
      }

      if (demoSpeed > 0) {
        if (fighter.afterImages && fighter.afterImages.length > 0) {
          for (let i = fighter.afterImages.length - 1; i >= 0; i--) {
            fighter.afterImages[i].alpha -= 0.040;
            if (fighter.afterImages[i].alpha <= 0) fighter.afterImages.splice(i, 1);
          }
        }

        if (fighter.swordSwingTimer > 0) {
          const wasDelivered = fighter.swordHitDelivered;
          if (typeof fighter._updateSwordSwing === 'function') {
            fighter._updateSwordSwing(target, demoArea);
          } else {
            fighter.swordSwingTimer--;
          }
          if (target && !wasDelivered && fighter.swordHitDelivered) {
            const step = fighter.swordComboStep || 1;
            if (step === 1) {
              target.x += 16;
              target.y += 4;
              previewProjectileSystem.addImpact(target.x, target.y, '#DC2626', 0, 24);
            } else if (step === 2) {
              target.x += 14;
              target.y -= 16;
              previewProjectileSystem.addImpact(target.x, target.y, '#8B5CF6', 0, 26);
            } else if (step === 3) {
              target.x += 28;
              previewProjectileSystem.addImpact(target.x, target.y, '#F59E0B', 0, 36);
            }
          }
        } else {
          fighter.isSpinning = false;
          pstate.makiCycleTimer = (pstate.makiCycleTimer || 0) + 1;
          const recoveryWait = (currentAnim === 'maki_hit3')
            ? ((CONFIG.maki?.hit3RecoveryFrames || 12) + 12)
            : ((currentAnim === 'maki_hit2')
              ? ((CONFIG.maki?.hit2RecoveryFrames || 10) + 10)
              : ((CONFIG.maki?.hit1RecoveryFrames || 9) + 8));
          if (pstate.makiCycleTimer >= recoveryWait) {
            let step = 1;
            if (currentAnim === 'maki_hit1') step = 1;
            else if (currentAnim === 'maki_hit2') step = 2;
            else if (currentAnim === 'maki_hit3') step = 3;
            else if (currentAnim === 'maki_combo') {
              pstate.makiComboStep = (pstate.makiComboStep || 1);
              step = pstate.makiComboStep;
              pstate.makiComboStep = (pstate.makiComboStep % 3) + 1;
            }

            fighter.playBasicAttackPattern(step, target);
            pstate.makiCycleTimer = 0;
          }
        }
      }
      previewProjectileSystem.update(demoArea, fighter, target);
      pstate.frame += 1;
      return pstate;
    } else if (def.type === 'toji' && ['toji_basic', 'spear', 'basic'].includes(currentAnim)) {
      pstate.hideTarget = false;
      fighter.x = demoArea.x + demoArea.width / 2 - 40;
      fighter.y = demoArea.y + demoArea.height / 2;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.gunAngle = 0;
      fighter.angle = 0;
      fighter.isStealthed = false;
      fighter.isAmbushing = false;

      const baseX = (demoArea.x + demoArea.width / 2 - 40) + 65;
      const baseY = demoArea.y + demoArea.height / 2;
      if (target) {
        target.x += (baseX - target.x) * 0.15;
        target.y += (baseY - target.y) * 0.15;
        target.r = 25;
        target.isDead = false;
        target.hp = 1000;
      }

      if (demoSpeed > 0) {
        if (fighter.afterImages && fighter.afterImages.length > 0) {
          for (let i = fighter.afterImages.length - 1; i >= 0; i--) {
            fighter.afterImages[i].alpha -= 0.040;
            if (fighter.afterImages[i].alpha <= 0) fighter.afterImages.splice(i, 1);
          }
        }

        if (fighter.spearSwingTimer > 0) {
          const cfg = (typeof CONFIG !== 'undefined' && CONFIG.toji) ? CONFIG.toji : {};
          const liftF = (typeof cfg.hit1LiftFrames === 'number') ? cfg.hit1LiftFrames : 5;
          const holdF = (typeof cfg.hit1HoldFrames === 'number') ? cfg.hit1HoldFrames : 2;
          const strikeF = (typeof cfg.hit1StrikeFrames === 'number') ? cfg.hit1StrikeFrames : 6;
          const lockF = (typeof cfg.hit1ImpactLockFrames === 'number') ? cfg.hit1ImpactLockFrames : 6;
          const totalF = fighter.spearSwingMax || 28;
          const t2 = (liftF + holdF) / totalF;
          const t3 = (liftF + holdF + strikeF) / totalF;
          const t4 = (liftF + holdF + strikeF + lockF) / totalF;
          const progress = 1 - (fighter.spearSwingTimer / totalF);

          // Phase 3 lunging step momentum toward dummy target
          if (progress >= t2 && progress < t3) {
            const pStrike = (progress - t2) / Math.max(0.001, t3 - t2);
            fighter.x += Math.sin(pStrike * Math.PI) * 1.2;
            if (pStrike >= 0.50 && !pstate.tojiHitDelivered) {
              pstate.tojiHitDelivered = true;
              if (target) {
                target.x += 16;
                previewProjectileSystem.addImpact(target.x, target.y, '#A855F7', 0, 26);
                previewProjectileSystem.addImpact(target.x, target.y, '#EF4444', 0, 18);
              }
              fighter.deliverInvertedSpearImpact?.(target, 0, false);
            }
          } else if (progress >= t3 && progress < t4) {
            // Phase 4 Impact Lock on the dummy target
            if (!pstate.tojiHitDelivered) {
              pstate.tojiHitDelivered = true;
              if (target) {
                target.x += 16;
                previewProjectileSystem.addImpact(target.x, target.y, '#A855F7', 0, 26);
                previewProjectileSystem.addImpact(target.x, target.y, '#EF4444', 0, 18);
              }
              fighter.deliverInvertedSpearImpact?.(target, 0, false);
            }
          }

          fighter.spearSwingTimer--;
        } else {
          fighter.x = demoArea.x + demoArea.width / 2 - 40;
          pstate.tojiCycleTimer = (pstate.tojiCycleTimer || 0) + 1;
          const recoveryWait = (CONFIG.toji?.hit1RecoveryFrames || 9) + 12;
          if (pstate.tojiCycleTimer >= recoveryWait || !pstate.tojiInitialized) {
            pstate.tojiInitialized = true;
            pstate.tojiHitDelivered = false;
            fighter.playBasicAttackPattern(1, target);
            pstate.tojiCycleTimer = 0;
          }
        }
      }
      previewProjectileSystem.update(demoArea, fighter, target);
      pstate.frame += 1;
      return pstate;
    } else if (def.type === 'maki' && currentAnim === 'jet') {
      pstate.hideTarget = false;
      const baseX = demoArea.x + demoArea.width / 2 + 55;
      const baseY = demoArea.y + demoArea.height / 2;
      fighter.y = baseY;
      fighter.gunAngle = 0;
      fighter.angle = 0;

      if (!pstate.makiJetPhase) {
        pstate.makiJetPhase = 'windup';
        pstate.makiJetTimer = 0;
      }

      if (demoSpeed > 0) {
        pstate.makiJetTimer++;
        if (pstate.makiJetPhase === 'windup') {
          fighter.x = demoArea.x + demoArea.width / 2 - 50;
          target.x = baseX;
          target.y = baseY;
          target.isPinnedByMaki = false;
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'windup';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 24;
          if (pstate.makiJetTimer >= 24) {
            pstate.makiJetPhase = 'dash';
            pstate.makiJetTimer = 0;
            try { audioSystem.playSFX('attack_swordswing', 0.9); } catch (e) {}
          }
        } else if (pstate.makiJetPhase === 'dash') {
          const dashP = Math.min(1.0, pstate.makiJetTimer / 14);
          fighter.x = (demoArea.x + demoArea.width / 2 - 50) + dashP * 45;
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'dash';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 14;
          if (pstate.makiJetTimer >= 14) {
            pstate.makiJetPhase = 'stab';
            pstate.makiJetTimer = 0;
            target.isPinnedByMaki = true;
            fighter.dragonBoneTarget = target;
            try { audioSystem.playSFX('attack_groundsmash', 1.0); } catch (e) {}
            previewProjectileSystem.addImpact(target.x, target.y, '#F59E0B', 0, 26);
          }
        } else if (pstate.makiJetPhase === 'stab') {
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'stab';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 18;
          target.x = fighter.x + 28;
          target.y = fighter.y;
          target.isPinnedByMaki = true;
          if (pstate.makiJetTimer >= 18) {
            pstate.makiJetPhase = 'lift';
            pstate.makiJetTimer = 0;
          }
        } else if (pstate.makiJetPhase === 'lift') {
          const liftP = Math.min(1.0, pstate.makiJetTimer / 22);
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'lift';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 22;
          target.x = fighter.x + (1.0 - liftP) * 28;
          target.y = fighter.y - liftP * 40;
          target.isPinnedByMaki = true;
          if (pstate.makiJetTimer >= 22) {
            pstate.makiJetPhase = 'throw';
            pstate.makiJetTimer = 0;
            try { audioSystem.playSFX('attack_swordswing', 1.0); } catch (e) {}
          }
        } else if (pstate.makiJetPhase === 'throw') {
          const throwP = Math.min(1.0, pstate.makiJetTimer / 12);
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'throw';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 12;
          target.x = fighter.x + throwP * 55;
          target.y = fighter.y - 40 + throwP * 48;
          target.isPinnedByMaki = true;
          if (pstate.makiJetTimer >= 12) {
            pstate.makiJetPhase = 'groundPin';
            pstate.makiJetTimer = 0;
            try { audioSystem.playSFX('attack_groundsmash', 1.0); } catch (e) {}
            previewProjectileSystem.addImpact(target.x, target.y, '#DC2626', 0, 30);
          }
        } else if (pstate.makiJetPhase === 'groundPin') {
          fighter.dragonBoneActive = true;
          fighter.dragonBonePhase = 'groundPin';
          fighter.dragonBonePhaseTimer = pstate.makiJetTimer;
          fighter.dragonBonePhaseMax = 25;
          if (pstate.makiJetTimer >= 25) {
            pstate.makiJetPhase = 'windup';
            pstate.makiJetTimer = 0;
            target.isPinnedByMaki = false;
            fighter.dragonBoneActive = false;
          }
        }
      }
      previewProjectileSystem.update(demoArea, fighter, target);
      pstate.frame += 1;
      return pstate;
    } else if (def.type === 'maki' && currentAnim === 'riposte') {
      pstate.hideTarget = false;
      fighter.x = demoArea.x + demoArea.width / 2 - 25;
      fighter.y = demoArea.y + demoArea.height / 2;
      fighter.gunAngle = 0;
      fighter.angle = 0;
      target.x = fighter.x + 60;
      target.y = fighter.y;
      fighter.riposteActive = true;
      fighter.riposteTimer = 22;
      if (demoSpeed > 0 && (pstate.frame % 60) === 0) {
        previewProjectileSystem.addImpact(target.x, target.y, '#10B981', 0, 24);
        target.x += 10;
      }
      previewProjectileSystem.update(demoArea, fighter, target);
      pstate.frame += 1;
      return pstate;
    } else if (def.type === 'maki' && currentAnim === 'ult') {
      pstate.hideTarget = false;
      fighter.x = demoArea.x + demoArea.width / 2;
      fighter.y = demoArea.y + demoArea.height / 2;
      target.x = fighter.x + 70;
      target.y = fighter.y;
      fighter.ultimateActive = true;
      fighter.ultimateTimer = 180;
      if (demoSpeed > 0 && (pstate.frame % 10) === 0) {
        if (typeof fighter._spawnAfterimage === 'function') fighter._spawnAfterimage(3, 8);
        previewProjectileSystem.addImpact(target.x + (Math.random() - 0.5) * 30, target.y + (Math.random() - 0.5) * 30, '#8B5CF6', 0, 20);
      }
      previewProjectileSystem.update(demoArea, fighter, target);
      pstate.frame += 1;
      return pstate;
    }

    pstate.frame += 1;
    return pstate;
  } else {
    pstate.hideTarget = false;
    if (fighter.isChannelingPurple && currentAnim !== 'mixing') {
      fighter.isChannelingPurple = false;
      fighter.z = 0;
    }
    if (fighter.isChannelingDomainExpansion && currentAnim !== 'domain') {
      fighter.isChannelingDomainExpansion = false;
    }
    if (fighter.isChannelingDivineFlame && currentAnim !== 'fuga') {
      fighter.isChannelingDivineFlame = false;
    }
    if (fighter.isStealthed && currentAnim !== 'stealth') {
      fighter.isStealthed = false;
    }
    if (fighter.redEffectTimer && currentAnim !== 'red') {
      fighter.redEffectTimer = 0;
    }
    if (fighter.isInfinityBlitz && currentAnim !== 'level8') {
      fighter.isInfinityBlitz = false;
      fighter.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
    }
    if (fighter.hollowMaskActive && currentAnim !== 'hollow') {
      fighter.hollowMaskActive = false;
      fighter.hollowMaskFormationTimer = 0;
    }
    if (fighter.isChannelingGetsuga && currentAnim !== 'getsuga') {
      fighter.isChannelingGetsuga = false;
      fighter.getsugaChargeTimer = 0;
    }
    if (fighter.skin === 'bankai' && currentAnim !== 'bankai') {
      fighter.bankaiActive = false;
      fighter.skin = 'shikai';
      fighter.bankaiChargeTimer = 0;
    }
    if (fighter.dragonBoneActive && currentAnim !== 'jet') {
      fighter.dragonBoneActive = false;
      fighter.dragonBonePhase = null;
      fighter.dragonBoneTarget = null;
      if (target) target.isPinnedByMaki = false;
    }
    if (fighter.riposteActive && currentAnim !== 'riposte') {
      fighter.riposteActive = false;
      fighter.riposteTimer = 0;
    }
    if (fighter.ultimateActive && currentAnim !== 'ult') {
      fighter.ultimateActive = false;
      fighter.ultimateTimer = 0;
    }
  }

  // Stop / Pause (0x speed)
  if (demoSpeed === 0) {
    return pstate;
  }

  let steps = 1;
  if (demoSpeed === 0.5) {
    pstate.subFrame = (pstate.subFrame || 0) + 0.5;
    if (pstate.subFrame < 1) {
      return pstate; // Advance frame every 2 ticks for 0.5x speed
    }
    pstate.subFrame -= 1;
    steps = 1;
  } else if (demoSpeed === 2.0) {
    steps = 2; // Advance 2 ticks per frame for 2.0x speed
  }

  for (let s = 0; s < steps; s++) {
    const isMelee = (def.category === 'Melee') || ['saitama', 'yuji', 'mahito', 'todo', 'toji', 'mahoraga', 'musashi', 'berserker', 'knight', 'melee', 'maki'].includes(def.type) || fighter.isMeleeFighter;

    // Force fighter to remain perfectly stationary in the center of the demo viewport
    fighter.x = demoArea.x + demoArea.width / 2;
    fighter.y = demoArea.y + demoArea.height / 2;
    fighter.vx = 0;
    fighter.vy = 0;

    // Make the target dummy smoothly orbit/oscillate around the stationary fighter
    const targetDist = isMelee ? (fighter.r + target.r + 15) : 100;
    const orbitSpeed = 0.03;
    target.x = fighter.x + Math.cos(pstate.frame * orbitSpeed) * targetDist;
    // Add a figure-8 style bobbing to the orbit for dynamic tracking
    target.y = fighter.y + Math.sin(pstate.frame * orbitSpeed * 1.5) * (targetDist * 0.7);

    // Run fighter update (aiming, cooldowns, shooting)
    fighter.update(target, 0, demoArea);
    if (state.indexDemoRotation) {
      fighter.gunAngle = (fighter.gunAngle || 0) + state.indexDemoRotation;
      fighter.angle = fighter.gunAngle;
    }

    // Enforce stationary position again just in case update() altered it
    fighter.x = demoArea.x + demoArea.width / 2;
    fighter.y = demoArea.y + demoArea.height / 2;
    fighter.vx = 0;
    fighter.vy = 0;

    if (isMelee) {
      const dist = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      if (dist < fighter.r + target.r + 25 && (fighter.meleeCooldown || 0) <= 0) {
        fighter.meleeCooldown = fighter.shootCooldownMax || 25;
        if (typeof fighter.applySpeedBoost === 'function') {
          fighter.applySpeedBoost();
        }
        previewProjectileSystem.addImpact(
          fighter.x + Math.cos(fighter.gunAngle) * (fighter.r + 8),
          fighter.y + Math.sin(fighter.gunAngle) * (fighter.r + 8),
          def.color || '#ffffff',
          0,
          16
        );
      }
    }

    previewProjectileSystem.update(demoArea, fighter, target);
    pstate.frame += 1;
  }

  return pstate;
}
