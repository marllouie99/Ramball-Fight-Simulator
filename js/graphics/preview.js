// ─────────────────────────────────────────────
// PREVIEW / DEMO SHARED HELPERS
// ─────────────────────────────────────────────
import { CONFIG } from '../core/config.js';
import { Fighter } from '../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../entities/factories/fighterFactory.js';
import { PreviewProjectileSystem } from './previewSystem.js';
import { state } from '../core/state.js';

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
  const currentAnim = state.indexDemoAnim;
  if (currentAnim && currentAnim !== 'basic') {
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
      fighter.redEffectTimer = 45;
      fighter.redEffectMaxTimer = 45;
      fighter.redBuildupPhase = true;
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
    const isMelee = (def.category === 'Melee') || ['saitama', 'yuji', 'mahito', 'todo', 'toji', 'mahoraga', 'musashi', 'berserker', 'knight', 'melee'].includes(def.type) || fighter.isMeleeFighter;

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
