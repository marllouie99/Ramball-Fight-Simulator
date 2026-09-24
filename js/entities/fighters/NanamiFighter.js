// ─────────────────────────────────────────────
// Kento Nanami — 7:3 Ratio Sorcerer Entity
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SPEED_MULTIPLIER } from '../../core/modeConfig.js';
import { drawNanamiSkin } from '../../graphics/fighters/nanamiSkin.js';
import {
  drawNanamiCleaverSlashArc,
  drawRatioGridImpact,
  drawRatioTargetingCrosshair,
  drawOvertimeWatchBadge,
  drawNanamiCleaveShockwave
} from '../../graphics/weapons/nanamiWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBlackFlash } from '../../graphics/particles/blackFlashEffect.js';
import { spawnBloodEffect, spawnNanamiRatioBloodBurst } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';

/**
 * Computes minimum squared distance from point (px, py) to segment [A, B] and closest projected point.
 */
function _distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) {
    const dpx = px - ax;
    const dpy = py - ay;
    return { distSq: dpx * dpx + dpy * dpy, projX: ax, projY: ay };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return { distSq: ex * ex + ey * ey, projX, projY };
}

/**
 * Calculates world-space blade segment [inner, tip] and hand coordinates for Nanami's Blunt Cleaver at given strike progress.
 */
function _getNanamiCleaverWorldSegment(fighter, strikeP) {
  const r = fighter.r || 25;
  const clampedP = Math.max(0, Math.min(1.0, strikeP));

  let localCleaverAngle = 0;
  let easeChop = 0;
  if (clampedP < 0.12) {
    const t = clampedP / 0.12;
    const easeWindup = Math.sin(t * (Math.PI / 2));
    localCleaverAngle = -easeWindup * 1.05;
    easeChop = 0;
  } else if (clampedP < 0.60) {
    const t = (clampedP - 0.12) / 0.48;
    const easePower = t * t * (3 - 2 * t);
    localCleaverAngle = -1.05 + easePower * (1.10 - (-1.05));
    easeChop = Math.pow(Math.sin(clampedP * Math.PI), 1.25);
  } else {
    const recP = (clampedP - 0.60) / 0.40;
    const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    localCleaverAngle = 1.10 * easeRec;
    easeChop = Math.pow(Math.sin(clampedP * Math.PI), 1.25);
  }

  const lungeExtension = easeChop * (r * 0.95);
  const localHandX = r * 0.95 + lungeExtension;
  const localHandY = r * 0.25 + Math.sin(clampedP * Math.PI) * (r * 0.20);

  const aimAngle = (fighter.chopCastAngle !== undefined)
    ? fighter.chopCastAngle
    : ((fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(aimAngle) > Math.PI / 2;

  const effHandY = facingLeft ? -localHandY : localHandY;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const worldHandX = fighter.x + (cosA * localHandX - sinA * effHandY);
  const worldHandY = (fighter.y - (fighter.z || 0)) + (sinA * localHandX + cosA * effHandY);
  const worldCleaverAngle = facingLeft ? (aimAngle - localCleaverAngle) : (aimAngle + localCleaverAngle);

  const reach = (typeof fighter.currentCleaverReach === 'number')
    ? fighter.currentCleaverReach
    : ((typeof CONFIG !== 'undefined' && CONFIG.nanami?.cleaverRange) ? CONFIG.nanami.cleaverRange : 55);

  const innerDist = 8;
  const tipDist = reach + 10;

  return {
    innerX: worldHandX + Math.cos(worldCleaverAngle) * innerDist,
    innerY: worldHandY + Math.sin(worldCleaverAngle) * innerDist,
    tipX: worldHandX + Math.cos(worldCleaverAngle) * tipDist,
    tipY: worldHandY + Math.sin(worldCleaverAngle) * tipDist,
    worldHandX,
    worldHandY,
    worldCleaverAngle,
    localCleaverAngle,
    localHandX,
    localHandY
  };
}

/**
 * Tests direct geometric collision between target and Nanami's blunt cleaver swept across strike progress.
 */
function _testNanamiCleaverBladeHit(fighter, target, currentStrikeP, prevStrikeP) {
  if (!target || target.dead || target.isDead || target.hp <= 0) return null;

  const dx = target.x - fighter.x;
  const dy = target.y - (fighter.y - (fighter.z || 0));
  const dist = Math.hypot(dx, dy);
  const r = fighter.r || 25;
  const targetRadius = target.r || 25;
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
  const reach = (typeof fighter.currentCleaverReach === 'number') ? fighter.currentCleaverReach : (cfg.cleaverRange || 55);

  const arcLimit = (typeof cfg.chopFrontalArcLimit === 'number') ? cfg.chopFrontalArcLimit : ((cfg.cleaverArc || ((130 * Math.PI) / 180)) / 2 + 0.2);
  const bladeRadius = (typeof cfg.chopBladeRadius === 'number') ? cfg.chopBladeRadius : 20;

  // 1. Strict Frontal Arc Guard (Rule 1.6): Cleaver chop can only strike targets in front
  const aimAngle = (fighter.chopCastAngle !== undefined)
    ? fighter.chopCastAngle
    : ((fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0));
  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - aimAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (Math.abs(angleDiff) > arcLimit) return null;

  // 2. Maximum reach boundary guard
  if (dist > (r + reach + targetRadius + 15)) return null;

  // 3. Forward cutting progress bounds: blade is winding up when strikeP < 0.10
  const minP = Math.min(prevStrikeP, currentStrikeP);
  const maxP = Math.max(prevStrikeP, currentStrikeP);
  if (maxP < 0.10) return null;

  const startP = Math.max(0.10, minP);
  const endP = Math.max(0.10, maxP);
  const pDiff = endP - startP;
  const numSamples = (pDiff > 0.25) ? 7 : ((pDiff > 0.06) ? 5 : 3);
  const hitThresholdSq = Math.pow(targetRadius + bladeRadius, 2);

  for (let i = 0; i < numSamples; i++) {
    const t = (numSamples === 1) ? 1.0 : (i / (numSamples - 1));
    const sampleP = startP + t * (endP - startP);
    const blade = _getNanamiCleaverWorldSegment(fighter, sampleP);
    const res = _distToSegment(target.x, target.y, blade.innerX, blade.innerY, blade.tipX, blade.tipY);

    if (res.distSq <= hitThresholdSq) {
      return { sampleP, blade, contactX: res.projX, contactY: res.projY, angleToTarget, angleDiff };
    }
  }

  return null;
}

export class NanamiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'nanami';
    this.type = 'nanami';
    this.color = '#D4AF37';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};

    // Combat & Animation States
    this.punchAnimTimer = 0;
    this.punchMaxTime = 18;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = true; // One-handed cleaver stance
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 20;
    this.slashSwingImpactTimer = 8;
    this.chopWindupFrames = 2;
    this.chopStrikeFrames = 10;
    this.chopRecoveryFrames = 8;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.chopCastAngle = undefined;
    this._chopPreviousStrikeP = 0;
    this.ratioHitProgress = null;
    this.ratioHitCleaverAngle = null;
    this.ratioHitHandX = null;
    this.ratioHitHandY = null;
    this._chopTarget = null;
    this.ratioImpactEffects = [];
    this.shockwaveEffects = [];
    this.afterImages = [];
    this.collapseShockwaves = [];

    // Passive 1: Overtime (Jigai)
    this.isOvertimeActive = false;
    this.overtimeAnnounced = false;
    this.overtimeWatchTimer = 0;
    this.overtimeSpeechTimer = 0;
    this.overtimeGuaranteedCritTimer = 0;
    this.roundElapsedFrames = 0;
    this.combatAuraOpacity = 0.0;

    // Passive 2: Ratio Technique (7:3)
    this.ratioCritCharge = 0;
    this.ratioCritCooldownTimer = 0;
    this.ratioHitPauseTimer = 0;
    this.ratioHitPauseMax = 0;
    this.ratioHitPauseTarget = null;

    // Skill 1: Decisive Strike / Ratio Lunge
    this.lungeCooldownMax = cfg.lungeCooldown || 200;
    this.lungeCooldown = this.lungeCooldownMax;
    this.isLunging = false;
    this.lungeTimer = 0;

    // Skill 2: Collapse (Tōka)
    this.collapseCooldownMax = cfg.collapseCooldown || 600;
    this.collapseCooldown = this.collapseCooldownMax;
    this.isCollapsing = false;
    this.collapseTimer = 0;
    this.collapseMaxTimer = 0;

    // Ultimate: 4-Fold Black Flash Blitz (Kokusen Renpatsu)
    this.ultimateCooldownMax = cfg.ultimateCooldown || 2000;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.isBlitzing = false;
    this.blackFlashAuraTimer = 0;
    this.blitzStrikeIndex = 0;
    this.blitzMaxStrikes = 4;
    this.blitzTimer = 0;
    this.blitzInterval = 18;
    this.blitzPhase = 'dash';
    this.blitzPhaseTimer = 0;
    this.blitzDashStartX = 0;
    this.blitzDashStartY = 0;
    this.blitzDashTargetX = 0;
    this.blitzDashTargetY = 0;
    this.blitzDashDuration = 0;
    this.blitzTarget = null;
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
    const skills = [];
    if (this.isSkillEnabled(cfg.enableLunge, true)) {
      skills.push({
        id: 'lunge',
        name: 'RATIO LUNGE',
        type: 'mobility',
        cooldownKey: 'lungeCooldown',
        cooldownMax: cfg.lungeCooldown || 200,
        activeKey: 'isLunging'
      });
    }
    if (this.isSkillEnabled(cfg.enableCollapse, true)) {
      skills.push({
        id: 'collapse',
        name: 'COLLAPSE',
        type: 'offensive',
        cooldownKey: 'collapseCooldown',
        cooldownMax: cfg.collapseCooldown || 600,
        activeKey: 'isCollapsing'
      });
    }
    if (this.isSkillEnabled(cfg.enableBlackFlash, true)) {
      skills.push({
        id: 'ultimate',
        name: '4-FOLD BLACK FLASH BLITZ',
        type: 'ultimate',
        cooldownKey: 'ultimateCooldown',
        cooldownMax: cfg.ultimateCooldown || 2000,
        activeKey: 'isBlitzing'
      });
    }
    if (skills.length > 0) {
      this.skillManager.registerSkills(skills);
    }
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.slashSwingImpactTimer = 8;
    this.chopWindupFrames = 2;
    this.chopStrikeFrames = 10;
    this.chopRecoveryFrames = 8;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.chopCastAngle = undefined;
    this._chopPreviousStrikeP = 0;
    this.ratioHitProgress = null;
    this.ratioHitCleaverAngle = null;
    this.ratioHitHandX = null;
    this.ratioHitHandY = null;
    this._chopTarget = null;
    if (this.ratioImpactEffects) this.ratioImpactEffects.length = 0;
    if (this.shockwaveEffects) this.shockwaveEffects.length = 0;
    if (this.afterImages) this.afterImages.length = 0;
    if (this.collapseShockwaves) this.collapseShockwaves.length = 0;
    this.isOvertimeActive = false;
    this.overtimeAnnounced = false;
    this.overtimeWatchTimer = 0;
    this.overtimeSpeechTimer = 0;
    this.overtimeGuaranteedCritTimer = 0;
    this.roundElapsedFrames = 0;
    this.combatAuraOpacity = 0.0;
    this.ratioCritCharge = 0;
    this.ratioCritCooldownTimer = 0;
    this.ratioHitPauseTimer = 0;
    this.ratioHitPauseMax = 0;
    if (this.ratioHitPauseTarget) {
      this.ratioHitPauseTarget.suppressFreezeOverlay = false;
      this.ratioHitPauseTarget = null;
    }
    this.lungeCooldownMax = cfg.lungeCooldown || 200;
    this.lungeCooldown = this.lungeCooldownMax;
    this.isLunging = false;
    this.lungeTimer = 0;
    this.lungeMaxTimer = 0;
    this.lungeTarget = null;
    this.lungeHitEntities = null;
    this._lungePrimaryHitDone = false;
    this.collapseCooldownMax = cfg.collapseCooldown || 600;
    this.collapseCooldown = this.collapseCooldownMax;
    this.isCollapsing = false;
    this.collapseTimer = 0;
    this.collapseMaxTimer = 0;
    this.ultimateCooldownMax = cfg.ultimateCooldown || 2000;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.isBlitzing = false;
    this.blackFlashAuraTimer = 0;
    this.blitzStrikeIndex = 0;
    this.blitzTimer = 0;
    this.blitzPhase = 'dash';
    this.blitzPhaseTimer = 0;
    this.blitzDashStartX = 0;
    this.blitzDashStartY = 0;
    this.blitzDashTargetX = 0;
    this.blitzDashTargetY = 0;
    this.blitzDashDuration = 0;
    this.hitFlashTimer = 0;
    if (this.blitzTarget) {
      this.blitzTarget.suppressFreezeOverlay = false;
      this.blitzTarget = null;
    }
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    if (this.ratioHitPauseTarget) {
      this.ratioHitPauseTarget.suppressFreezeOverlay = false;
      this.ratioHitPauseTarget = null;
    }
    if (this.blitzTarget) {
      this.blitzTarget.suppressFreezeOverlay = false;
      this.blitzTarget = null;
    }
    this.isBlitzing = false;
    this.blitzPhase = 'dash';
    this.blitzPhaseTimer = 0;
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this._chopHitDelivered = true;
    this._chopHitConnected = false;
    this.chopCastAngle = undefined;
    this.ratioHitProgress = null;
    this.ratioHitCleaverAngle = null;
    this.ratioHitHandX = null;
    this.ratioHitHandY = null;
    this._chopTarget = null;
    this.ratioHitPauseTimer = 0;
    this.isLunging = false;
    this.lungeTimer = 0;
    this.lungeTarget = null;
    this.lungeHitEntities = null;
    this._lungePrimaryHitDone = false;
    this.isCollapsing = false;
    this.collapseTimer = 0;
    this.blackFlashAuraTimer = 0;
    this.blitzTimer = 0;
    this.isChannelingBlackFlash = false;
    this.blackFlashChannelTimer = 0;
    if (this.afterImages) this.afterImages.length = 0;
  }

  isPerformingSkill() {
    return Boolean(this.isLunging || this.isCollapsing || this.isBlitzing || (this.ratioHitPauseTimer || 0) > 0);
  }

  isChannelingSkill() {
    return Boolean(this.isChannelingBlackFlash || (this.overtimeSpeechTimer || 0) > 0);
  }

  /**
   * Basic Attack Validation:
   * Prevents initiating new basic attacks while already swinging or paused in 7:3 ratio impact stasis.
   */
  canPerformBasicAttack() {
    if ((this.ratioHitPauseTimer && this.ratioHitPauseTimer > 0) || (this.slashSwingTimer && this.slashSwingTimer > 0)) return false;
    return super.canPerformBasicAttack ? super.canPerformBasicAttack() : true;
  }

  /**
   * Holds round and match transitions active while Nanami completes his attack animation,
   * 7:3 Ratio hit-pause, and unpause knockback burst, preventing premature celebration cutoffs.
   */
  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.dead || this.isDead) return false;
    if ((this.slashSwingTimer && this.slashSwingTimer > 0) || (this.ratioHitPauseTimer && this.ratioHitPauseTimer > 0) || this.isBlitzing || this.isCollapsing || this.isLunging) {
      return true;
    }
    return super.hasActiveFinishingAbility ? super.hasActiveFinishingAbility() : false;
  }

  /**
   * Aim Validation Guard:
   * Smooth auto-aim tracking is permitted during windup/neutral, but locks strictly during cutting sweep and hit-pause (Rule 1.4).
   */
  canAim() {
    if (this.ratioHitPauseTimer && this.ratioHitPauseTimer > 0) return false;
    if (this.isLunging || this.isBlitzing || this.isCollapsing) return false;
    if (this.slashSwingTimer > 0 && !this.isWindupWeapon()) return false;
    return super.canAim ? super.canAim() : true;
  }

  isWindupWeapon() {
    if (this.slashSwingTimer <= 0) return false;
    const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (CONFIG.nanami?.chopStrikeFrames || 10);
    const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (CONFIG.nanami?.chopRecoveryFrames || 8);
    return this.slashSwingTimer > (strikeFrames + recFrames);
  }

  /**
   * Smooth Aim & Committed Cast Angle Alignment (Rule 1.4)
   */
  aim(opponent) {
    if (this.ratioHitPauseTimer > 0 || (this.slashSwingTimer > 0 && !this.isWindupWeapon())) {
      if (this.chopCastAngle !== undefined) {
        this.gunAngle = this.chopCastAngle;
        this.angle = this.chopCastAngle;
      }
      return false;
    }
    if (this.isLunging || this.isBlitzing || this.isCollapsing) return false;
    if (!opponent) return false;
    const aimed = super.aim(opponent);
    if (this.isWindupWeapon()) {
      this.chopCastAngle = this.gunAngle;
    }
    return aimed;
  }

  triggerDemoAttack() {
    const target = this._findClosestEnemy();
    if (target) {
      this.aim(target);
      this.lungeCooldown = 0;
      this.performDecisiveStrike(target, CONFIG.nanami || {});
    } else {
      this._startCleaverChop(null, CONFIG.nanami || {});
    }
  }

  /**
   * Disables default projectile shooting so Nanami never fires bullets.
   * Basic attacks are executed as melee cleaver chops via distance check and AI steering.
   */
  shoot(ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
    if (!this.isSkillEnabled(cfg.enableCleaver, true) || !this.canPerformBasicAttack() || (this.ratioHitPauseTimer && this.ratioHitPauseTimer > 0) || this.slashSwingTimer > 0) return false;
    const target = this._findClosestEnemy();
    if (target) {
      this.aim(target);
      const reach = (cfg.cleaverRange || 55) + (target.r || 25) + 15;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= reach && this.shootCooldown <= 0 && this.slashSwingTimer <= 0) {
        this.combatAuraOpacity = 1.0;
        this._startCleaverChop(target, cfg);
        return true;
      }
    }
    return false;
  }

  /**
   * Overrides drawGun to ensure default gun barrels are never rendered.
   */
  drawGun(ctx) {
    // Nanami wields his blunt cleaver, not a standard gun barrel.
  }

  _getAllValidEnemyTargets() {
    const targets = [];
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
    const myTeam = (typeof state !== 'undefined' && state.getFighterTeam) ? state.getFighterTeam(myIndex) : this.team;

    const allEntities = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) allEntities.push(...state.fighters);
      if (state.illusions) allEntities.push(...state.illusions);
    }

    for (const ent of allEntities) {
      if (!ent || ent === this) continue;
      const isEntReforming = Boolean(ent && (ent.isRevivingFromContract || ent.isShatterReviving));
      if (!isEntReforming && (ent.hp <= 0 || ent.isDead || ent.isInvulnerable)) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === this) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
      }
      targets.push(ent);
    }
    return targets;
  }

  _findClosestEnemy() {
    let closest = null;
    let minDist = Infinity;
    const targets = this._getAllValidEnemyTargets();

    for (const ent of targets) {
      const dist = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ent;
      }
    }

    return closest;
  }

  /**
   * Resolves arena boundary collisions.
   * Naturally reflects velocity off arena walls.
   */
  resolveWallBounce(arena, opponent) {
    if (!arena) return false;
    return super.resolveWallBounce(arena, opponent);
  }

  _updateVisualEffects() {
    // 1. Dash Afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // 2. Ratio Visual Impact Effects
    if (this.ratioImpactEffects && this.ratioImpactEffects.length > 0) {
      fastCleanArray(this.ratioImpactEffects, (eff) => {
        eff.timer--;
        return eff.timer > 0;
      });
    }

    // 3. Overtime Shockwaves
    if (this.shockwaveEffects && this.shockwaveEffects.length > 0) {
      fastCleanArray(this.shockwaveEffects, (sw) => {
        sw.timer--;
        return sw.timer > 0;
      });
    }

    // 4. Collapse Ground Shockwaves & Debris (Always decays to prevent stuck ground effects)
    if (this.collapseShockwaves && this.collapseShockwaves.length > 0) {
      fastCleanArray(this.collapseShockwaves, (sw) => {
        sw.timer--;
        if (sw.debris && sw.debris.length > 0) {
          for (let i = 0; i < sw.debris.length; i++) {
            const deb = sw.debris[i];
            deb.x += deb.vx;
            deb.y += deb.vy;
            deb.vx *= 0.93;
            deb.vy *= 0.93;
            deb.rotation += deb.rotSpeed;
          }
        }
        return sw.timer > 0;
      });
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.punchAnimTimer = 0;
      this.slashSwingTimer = 0;
      if (this.afterImages) this.afterImages.length = 0;
      if (this.collapseShockwaves) this.collapseShockwaves.length = 0;
      if (this.shockwaveEffects) this.shockwaveEffects.length = 0;
      if (this.ratioImpactEffects) this.ratioImpactEffects.length = 0;
      return;
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    if (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.slashSwingTimer > 0) this.slashSwingTimer--;
      this.hitFlashTimer = 0;
    }

    // Update existing visual effects & ground shockwaves (placed before freeze guard so they decay smoothly without freezing)
    this._updateVisualEffects();

    // ── Rule 1: MANDATORY Freeze / TimeStop Early Exit Guard ──
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Update combat aura opacity (strictly active only when attacking/channeling attacks)
    const isAttacking = Boolean(
      (this.slashSwingTimer > 0) ||
      (this.punchAnimTimer > 0) ||
      ((this.ratioHitPauseTimer || 0) > 0) ||
      this.isLunging ||
      this.isCollapsing ||
      this.isChannelingBlackFlash ||
      this.isBlitzing ||
      ((this.blackFlashAuraTimer || 0) > 0)
    );

    if (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      this.combatAuraOpacity = 0.0;
    } else if (this.isOvertimeActive) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.15);
    } else if (isAttacking) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.25);
    } else {
      this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.08);
    }

    // ── Cinematic 7:3 Ratio Critical Hit-Pause ──
    if (this.ratioHitPauseTimer > 0) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      const maxTimer = this.ratioHitPauseMax || cfg.ratioCritHitPauseFrames || 30;
      this._ratioPauseElapsedFrames = (this._ratioPauseElapsedFrames || 0) + 1;

      const spinDelay = (cfg.soundDelays?.ratioRulerSpin !== undefined) ? cfg.soundDelays.ratioRulerSpin : 0;
      const splashDelay = (cfg.soundDelays?.ratioBloodSplash !== undefined) ? cfg.soundDelays.ratioBloodSplash : Math.floor(maxTimer * 0.30);

      // 1. Ruler Spin Audio Trigger (with configurable delay)
      if (this._ratioPauseElapsedFrames >= spinDelay && !this._ratioRulerSpinPlayed) {
        this._ratioRulerSpinPlayed = true;
        if (cfg.sounds?.ratioRulerSpin) {
          audioSystem.playSFX(cfg.sounds.ratioRulerSpin, cfg.soundVolumes?.ratioRulerSpin !== undefined ? cfg.soundVolumes.ratioRulerSpin : 1.10);
        } else if (cfg.sounds?.ratioCrit) {
          audioSystem.playSFX(cfg.sounds.ratioCrit, cfg.soundVolumes?.ratioCrit !== undefined ? cfg.soundVolumes.ratioCrit : 1.20);
        }
      }

      // 2. Blood Splash Audio Trigger (with configurable delay)
      if (this._ratioPauseElapsedFrames >= splashDelay && !this._ratioBloodSplashPlayed) {
        this._ratioBloodSplashPlayed = true;
        if (cfg.sounds?.ratioBloodSplash) {
          audioSystem.playSFX(cfg.sounds.ratioBloodSplash, cfg.soundVolumes?.ratioBloodSplash !== undefined ? cfg.soundVolumes.ratioBloodSplash : 1.25);
        }
      }

      this.ratioHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // On pause completion (unpause moment): blast enemy backwards with physical knockback push & heavy unpause shake!
      if (this.ratioHitPauseTimer === 0) {
        const unpauseShake = cfg.ratioHitPauseUnpauseShake || 8.0;
        const unpauseShakeDur = cfg.ratioHitPauseUnpauseShakeDuration || 16;
        triggerGlobalScreenShake(unpauseShake, unpauseShakeDur);

        const unpauseSound = cfg.sounds?.unpauseHit || cfg.sounds?.ratioBloodSplash || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
        const unpauseVol = cfg.soundVolumes?.unpauseHit !== undefined ? cfg.soundVolumes.unpauseHit : 1.25;
        audioSystem.playSFX(unpauseSound, unpauseVol);

        if (this.ratioHitPauseTarget) {
          const target = this.ratioHitPauseTarget;
          target.suppressFreezeOverlay = false;
          if (typeof target.applyTimeStop === 'function') {
            target.timeStopTimer = 0;
          }

          // Apply physical knockback push along committed chop angle
          const knockbackAngle = (this.chopCastAngle !== undefined) ? this.chopCastAngle : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
          const isOvertime = this.isOvertimeActive;
          const baseKnockback = this.isLunging ? (cfg.ratioHitPauseLungeKnockback || cfg.lungeKnockback || 18) : (cfg.ratioHitPauseKnockback || cfg.cleaverKnockback || 16);
          const knockbackForce = baseKnockback * (isOvertime ? (cfg.overtimeDamageMultiplier || 1.25) : 1.0);

          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(knockbackAngle) * knockbackForce, Math.sin(knockbackAngle) * knockbackForce);
          } else {
            target.knockbackVx = Math.cos(knockbackAngle) * knockbackForce;
            target.knockbackVy = Math.sin(knockbackAngle) * knockbackForce;
            target.vx = target.knockbackVx;
            target.vy = target.knockbackVy;
          }

          // Apply hit-stun & slow on unpause
          const stunDur = cfg.ratioHitStunFrames || 30;
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(stunDur);
          } else {
            target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunDur);
          }

          const slowDur = cfg.ratioSlowDuration || 60;
          const slowMult = cfg.ratioSlowMultiplier || 0.60;
          if (typeof target.applySlow === 'function') {
            target.applySlow(slowDur, slowMult);
          } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
            target.statusEffects.applySlow(slowDur, slowMult);
          }

          // Spawn authentic blood burst particles blasting out on unpause
          const bloodAmount = cfg.ratioUnpauseBloodParticles !== undefined ? cfg.ratioUnpauseBloodParticles : 16;
          if (typeof spawnNanamiRatioBloodBurst === 'function' && bloodAmount > 0) {
            spawnNanamiRatioBloodBurst(target, bloodAmount, knockbackAngle);
          } else if (typeof spawnBloodEffect === 'function' && bloodAmount > 0) {
            spawnBloodEffect(target, bloodAmount, knockbackAngle);
          }

          spawnSparks(target.x, target.y, 14, '#FFD700', '#FFFFFF');
          this.ratioHitPauseTarget = null;
        }

        this.ratioHitProgress = null;
        this.ratioHitCleaverAngle = null;
        this.ratioHitHandX = null;
        this.ratioHitHandY = null;
      }
      this.combatAuraOpacity = 1.0; // Keep CE aura at full during ratio hit-pause
      return;
    }

    // ── Active Decisive Strike / Ratio Lunge Execution (180px in 16 frames) ──
    if (this.isLunging) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      this._updateDecisiveStrike(cfg, arena);
      this.applyMovementPhysics();
      this.resolveWallBounce(arena, opponent);
      this.combatAuraOpacity = 1.0; // Keep CE aura at full during lunge
      return;
    }

    // ── Active Collapse / Ground Shatter Slam Execution ──
    if (this.isCollapsing) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      this._updateCollapse(cfg, arena);
      this.applyMovementPhysics();
      this.resolveWallBounce(arena, opponent);
      this.combatAuraOpacity = 1.0; // Keep CE aura at full during collapse slam
      return;
    }

    // ── Active Black Flash Voiceline Channeling / Windup ──
    if (this.isChannelingBlackFlash) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      this.vx = 0;
      this.vy = 0;
      if (this.blitzTarget && !this.blitzTarget.isDead && this.blitzTarget.hp > 0) {
        this.aim(this.blitzTarget);
      }
      this.blackFlashChannelTimer--;

      // Subtle cursed lightning charging sparks while concentrating cursed energy
      if (this.blackFlashChannelTimer % 12 === 0) {
        spawnSparks(this.x, this.y, 4, '#FFD700', '#FFFFFF');
      }

      if (this.blackFlashChannelTimer <= 0) {
        this.isChannelingBlackFlash = false;
        this.isBlitzing = true;
        this.blitzStrikeIndex = 0;
        this.blitzTimer = 0;
        if (this.blitzTarget && !this.blitzTarget.isDead && this.blitzTarget.hp > 0) {
          this._blitzBaseAngle = Math.atan2(this.blitzTarget.y - this.y, this.blitzTarget.x - this.x);
          triggerGlobalScreenShake(cfg.ultimateScreenShake || 7.5, cfg.ultimateScreenShakeDuration || 22);
          this._startBlitzStrikeDash(this.blitzTarget, cfg);
        } else {
          this.isBlitzing = false;
        }
      }
      this.combatAuraOpacity = 1.0; // Keep CE aura at full during Black Flash channeling
      return;
    }

    // ── Active 4-Fold Black Flash Blitz Execution ──
    if (this.isBlitzing) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      this._updateBlitz(cfg, arena);
      this.applyMovementPhysics();
      this.resolveWallBounce(arena, opponent);
      this.combatAuraOpacity = 1.0; // Keep CE aura at full during blitz
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};

    // Tick down live Ultimate Black Flash spatial rift aura timer
    if (this.blackFlashAuraTimer > 0) this.blackFlashAuraTimer--;

    // 1. Overtime Passive Check (Timer threshold or HP <= 40%)
    this.roundElapsedFrames++;
    const overtimeThresholdFrames = (cfg.overtimeThresholdSeconds || 25) * 60;
    const hpRatio = this.hp / (this.maxHp || 195);
    const overtimeEnabled = this.isSkillEnabled(cfg.enableOvertime, true);

    if (overtimeEnabled && !this.isOvertimeActive && (this.roundElapsedFrames >= overtimeThresholdFrames || hpRatio <= (cfg.overtimeHpThreshold || 0.40))) {
      this.isOvertimeActive = true;
      this.overtimeWatchTimer = 45; // 0.75s floating watch badge

      // Stop any existing movement upon Overtime activation so he stands composed
      this.vx = 0;
      this.vy = 0;

      if (!this.overtimeAnnounced) {
        this.overtimeAnnounced = true;
        this.overtimeSpeechTimer = cfg.overtimeSpeechDuration !== undefined ? cfg.overtimeSpeechDuration : (cfg.overtimeSpeechWalkDuration || 105);
        spawnFloatingText(this.x, this.y - this.r - 12, 'OVERTIME: 120%', '#D4AF37');
        triggerGlobalScreenShake(4, 15);
        if (cfg.sounds?.overtimeVoiceline) {
          const voiceVol = cfg.soundVolumes?.overtimeVoiceline !== undefined ? cfg.soundVolumes.overtimeVoiceline : 3.5;
          if (typeof audioSystem.playFighterVoiceline === 'function') {
            audioSystem.playFighterVoiceline(this, cfg.sounds.overtimeVoiceline, voiceVol);
          } else {
            audioSystem.playSFX(cfg.sounds.overtimeVoiceline, voiceVol);
          }
        }
      }
    }

    // Dynamic Overtime Speed Scaling (uses this.baseSpeed from fighter definition, never hardcoded numbers)
    const modeMultiplier = (typeof state !== 'undefined' && state.mode && MODE_SPEED_MULTIPLIER[state.mode]) ? MODE_SPEED_MULTIPLIER[state.mode] : 1.0;
    const baseMoveSpeed = (typeof this.baseSpeed === 'number' && this.baseSpeed > 0) ? this.baseSpeed : (this._def?.moveSpeed ?? 5.5);
    const overtimeMult = this.isOvertimeActive ? (cfg.overtimeSpeedMultiplier ?? 1.20) : 1.0;
    this.speed = baseMoveSpeed * modeMultiplier * overtimeMult;

    if (this.overtimeWatchTimer > 0) this.overtimeWatchTimer--;
    if (this.overtimeGuaranteedCritTimer > 0) this.overtimeGuaranteedCritTimer--;
    if (this.ratioCritCooldownTimer > 0) this.ratioCritCooldownTimer--;

    // 3. Debuff and Cooldown Housekeeping
    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // Process Cleaver Swing Animation & Exact Continuous Swept Collision
    if (this.slashSwingTimer > 0) {
      const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (cfg.chopStrikeFrames || 10);
      const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (cfg.chopRecoveryFrames || 8);
      const windupFrames = (typeof this.chopWindupFrames === 'number') ? this.chopWindupFrames : (cfg.chopWindupFrames || 2);
      const totalFrames = windupFrames + strikeFrames + recFrames;

      const elapsed = totalFrames - this.slashSwingTimer;
      const strikeP = Math.max(0, Math.min(1.0, elapsed / Math.max(1, totalFrames)));

      // Forward lunge momentum step during active strike phase (before hit connects)
      if (!this._chopHitConnected && strikeP >= 0.10 && strikeP <= 0.60) {
        const stepSpeed = cfg.chopLungeSpeed || 3.2;
        const chopAngle = (this.chopCastAngle !== undefined) ? this.chopCastAngle : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
        const stepDecay = (1.0 - (strikeP - 0.10) / 0.50);
        this.vx += Math.cos(chopAngle) * (stepSpeed * stepDecay * 0.35);
        this.vy += Math.sin(chopAngle) * (stepSpeed * stepDecay * 0.35);
      }

      // Swept Blade Collision Detection across the frame's progress interval
      if (!this._chopHitConnected && strikeP >= 0.10 && strikeP <= 0.85) {
        this._executeCleaverChopHit(strikeP, this._chopPreviousStrikeP || 0, cfg);
      }
      this._chopPreviousStrikeP = strikeP;

      this.slashSwingTimer--;
      if (this.slashSwingTimer === 0) {
        this.chopCastAngle = undefined;
        this._chopHitConnected = false;
        this._chopHitDelivered = true;
        this.ratioHitProgress = null;
        this.ratioHitCleaverAngle = null;
        this.ratioHitHandX = null;
        this.ratioHitHandY = null;
      }
    }

    if (this.ratioCritCharge > 0) this.ratioCritCharge--;
    if (this.lungeCooldown > 0) this.lungeCooldown--;
    if (this.collapseCooldown > 0) this.collapseCooldown--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;

    // 4. Overtime Ambient Cursed Energy Sparks & Dynamic Movement Afterimages
    if (this.isOvertimeActive && (this.combatAuraOpacity || 0) > 0.1) {
      if (this.roundElapsedFrames % 5 === 0) {
        const offsetX = (Math.random() - 0.5) * (this.r || 25) * 1.6;
        const offsetY = (Math.random() - 0.5) * (this.r || 25) * 1.6;
        spawnSparks(this.x + offsetX, this.y + offsetY, '#FFD700', 1);
      }
      if ((this.roundElapsedFrames % 8 === 0) && Math.hypot(this.vx, this.vy) > 2.5) {
        if (!this.afterImages) this.afterImages = [];
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          r: this.r || 25,
          angle: this.angle || 0,
          gunAngle: this.gunAngle || 0,
          timer: 10,
          maxTimer: 10
        });
      }
    }

    // 5. Melee Combat AI / Input Steering
    this._updateNanamiCombat(opponent, arena, cfg);

    // 6. Physics and Arena Wall Collision
    this.applyMovementPhysics();
    this.resolveWallBounce(arena, opponent);
  }

  _updateNanamiCombat(opponent, arena, cfg) {
    const target = this._findClosestEnemy() || opponent;
    const isTargetReforming = Boolean(target && (target.isRevivingFromContract || target.isShatterReviving));
    if (!target || (!isTargetReforming && (target.isDead || target.hp <= 0))) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Aim toward the target
    this.aim(target);

    // If target is reforming (e.g. Makima reviving from contract), aim at her but do not attack invulnerable state
    if (isTargetReforming) {
      return;
    }

    // Overtime Speech Phase: Stand composed in place while delivering speech (no chasing)
    if (this.overtimeSpeechTimer > 0) {
      this.overtimeSpeechTimer--;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // 1. Skill 1: Decisive Strike / Ratio Lunge (Shichisan Issen)
    if (this.isSkillEnabled(cfg.enableLunge, true) && this.lungeCooldown <= 0 && !this.isLunging && !this.isCollapsing && !this.isBlitzing && this.slashSwingTimer <= 0 && this.punchAnimTimer <= 0 && (this.ratioHitPauseTimer || 0) <= 0 && this.canPerformBasicAttack()) {
      const minRange = cfg.lungeMinRange !== undefined ? cfg.lungeMinRange : 0;
      const maxRange = cfg.lungeMaxRange || 260;
      if (dist <= maxRange && dist >= minRange) {
        this.performDecisiveStrike(target, cfg);
        return;
      }
    }

    // 2. Skill 2: Collapse (Tōka / Falling Rubble Ground Shatter)
    if (this.isSkillEnabled(cfg.enableCollapse, true) && this.collapseCooldown <= 0 && !this.isCollapsing && !this.isLunging && !this.isBlitzing && this.slashSwingTimer <= 0 && this.punchAnimTimer <= 0 && (this.ratioHitPauseTimer || 0) <= 0 && this.canPerformBasicAttack()) {
      const minRange = cfg.collapseMinRange !== undefined ? cfg.collapseMinRange : 0;
      const maxRange = cfg.collapseMaxRange || 180;
      const edgeDist = Math.max(0, dist - (target.r || 25) - (this.r || 25));
      if (edgeDist <= maxRange && edgeDist >= minRange) {
        this.performCollapse(cfg, target);
        return;
      }
    }

    const reach = (cfg.cleaverRange || 55) + target.r + 15;

    // 3. Ultimate: 4-Fold Black Flash Blitz (Kokusen Renpatsu - Close Melee Range Only)
    if (this.isSkillEnabled(cfg.enableBlackFlash, true) && this.ultimateCooldown <= 0 && !this.isBlitzing && !this.isCollapsing && !this.isLunging && this.slashSwingTimer <= 0 && this.punchAnimTimer <= 0 && (this.ratioHitPauseTimer || 0) <= 0 && this.canPerformBasicAttack()) {
      if (dist <= reach) {
        this.performUltimate(target, cfg);
        return;
      }
    }

    // Basic Melee Range Check (Frontal Arc Reach - Rule 7)
    if (this.isSkillEnabled(cfg.enableCleaver, true) && dist <= reach && this.shootCooldown <= 0 && this.punchAnimTimer <= 0 && this.slashSwingTimer <= 0 && this.canPerformBasicAttack()) {
      this._startCleaverChop(target, cfg);
    }
  }

  performUltimate(target = null, cfg = (CONFIG.nanami || {})) {
    if (this.isDead || this.hp <= 0 || !this.isSkillEnabled(cfg.enableBlackFlash, true)) return;
    if (this.isBlitzing || this.isCollapsing || this.isLunging || (this.ratioHitPauseTimer || 0) > 0) return;

    const closestTarget = target || this._findClosestEnemy();
    if (!closestTarget || closestTarget.isDead || closestTarget.hp <= 0) return;

    const dist = Math.hypot(closestTarget.x - this.x, closestTarget.y - this.y);
    const maxRange = cfg.ultimateMaxRange || 260;

    if (dist > maxRange) return;

    this.ultimateCooldownMax = cfg.ultimateCooldown || 1800;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.blitzTarget = closestTarget;
    this.blitzMaxStrikes = cfg.ultimateMaxStrikes || 4;
    this.blitzInterval = cfg.ultimateStrikeInterval || 18;
    this.combatAuraOpacity = 1.0;

    // Start Voiceline Channeling / Windup (waits for voiceline + post-voiceline delay frames before striking)
    this.isChannelingBlackFlash = true;
    const voiceDur = cfg.ultimateVoicelineChannelDuration !== undefined ? cfg.ultimateVoicelineChannelDuration : 75;
    const postDelay = cfg.ultimatePostVoicelineDelay !== undefined ? cfg.ultimatePostVoicelineDelay : 15;
    this.blackFlashChannelTimer = voiceDur + postDelay;
    this.blackFlashAuraTimer = (cfg.ultimateAuraDuration || 90) + this.blackFlashChannelTimer;

    // Aim toward target and play Black Flash Voiceline
    this.aim(closestTarget);
    if (cfg.sounds?.blackFlashVoiceline) {
      const voiceVol = cfg.soundVolumes?.blackFlashVoiceline !== undefined ? cfg.soundVolumes.blackFlashVoiceline : 3.5;
      if (typeof audioSystem.playFighterVoiceline === 'function') {
        audioSystem.playFighterVoiceline(this, cfg.sounds.blackFlashVoiceline, voiceVol);
      } else {
        audioSystem.playSFX(cfg.sounds.blackFlashVoiceline, voiceVol);
      }
    }

    if (typeof spawnBlackFlash === 'function') {
      spawnBlackFlash(this.x, this.y);
    }
    spawnSparks(this.x, this.y, 16, '#FFD700', '#FFFFFF');
    spawnFloatingText(this.x, this.y - this.r - 16, 'BLACK FLASH...', '#D4AF37');
  }

  performBlitz(cfg = (CONFIG.nanami || {}), target = null) {
    return this.performUltimate(target, cfg);
  }



  _getBlitzStrikeTargetPos(target, strikeIndex, maxStrikes) {
    const baseAngle = (this._blitzBaseAngle !== undefined)
      ? this._blitzBaseAngle
      : Math.atan2(target.y - this.y, target.x - this.x);

    const offsetDist = (target.r || 25) + (this.r || 25) + 12;
    let strikeAngle = baseAngle;

    if (strikeIndex === 0) {
      // Strike 1 (Flank Slash): Dash to target's left flank (-90 deg)
      strikeAngle = baseAngle - Math.PI / 2;
      return {
        x: target.x + Math.cos(strikeAngle) * offsetDist,
        y: target.y + Math.sin(strikeAngle) * offsetDist,
        aimAngle: Math.atan2(target.y - (target.y + Math.sin(strikeAngle) * offsetDist), target.x - (target.x + Math.cos(strikeAngle) * offsetDist))
      };
    } else if (strikeIndex === 1) {
      // Strike 2 (Cross Slash): Dash across to target's right flank (+90 deg)
      strikeAngle = baseAngle + Math.PI / 2;
      return {
        x: target.x + Math.cos(strikeAngle) * offsetDist,
        y: target.y + Math.sin(strikeAngle) * offsetDist,
        aimAngle: Math.atan2(target.y - (target.y + Math.sin(strikeAngle) * offsetDist), target.x - (target.x + Math.cos(strikeAngle) * offsetDist))
      };
    } else if (strikeIndex === 2) {
      // Strike 3 (Overhead Cleave): Dash behind target (180 deg)
      strikeAngle = baseAngle + Math.PI;
      return {
        x: target.x + Math.cos(strikeAngle) * offsetDist,
        y: target.y + Math.sin(strikeAngle) * offsetDist,
        aimAngle: Math.atan2(target.y - (target.y + Math.sin(strikeAngle) * offsetDist), target.x - (target.x + Math.cos(strikeAngle) * offsetDist))
      };
    } else {
      // Strike 4 (Execution Finisher): Dash directly in front of target
      strikeAngle = baseAngle;
      return {
        x: target.x - Math.cos(baseAngle) * offsetDist,
        y: target.y - Math.sin(baseAngle) * offsetDist,
        aimAngle: baseAngle
      };
    }
  }

  _startBlitzStrikeDash(target, cfg = (CONFIG.nanami || {})) {
    if (!target || target.isDead || target.hp <= 0) return;

    this.blitzPhase = 'dash';
    const maxStrikes = cfg.ultimateMaxStrikes || 4;
    const dest = this._getBlitzStrikeTargetPos(target, this.blitzStrikeIndex, maxStrikes);

    this.blitzDashStartX = this.x;
    this.blitzDashStartY = this.y;
    this.blitzDashTargetX = dest.x;
    this.blitzDashTargetY = dest.y;

    const dx = dest.x - this.x;
    const dy = dest.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Dynamic dash frames based on distance (fast supersonic dash: ~5 to 7 frames)
    const dashDuration = Math.max(4, Math.min(8, Math.round(dist / 28)));
    this.blitzDashDuration = dashDuration;
    this.blitzPhaseTimer = dashDuration;

    const moveAngle = Math.atan2(dy, dx);
    const dashSpeed = dist / dashDuration;
    this.vx = Math.cos(moveAngle) * dashSpeed;
    this.vy = Math.sin(moveAngle) * dashSpeed;

    // Face the target
    this.gunAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.angle = this.gunAngle;

    // Play dash audio & spawn initial dash afterimage
    if (cfg.sounds?.lungeDash) {
      audioSystem.playSFX(cfg.sounds.lungeDash, 1.15);
    } else if (cfg.sounds?.ratioCrit) {
      audioSystem.playSFX(cfg.sounds.ratioCrit, 1.15);
    }

    if (!this.afterImages) this.afterImages = [];
    pushTrailCap(this.afterImages, {
      x: this.x,
      y: this.y,
      gunAngle: this.gunAngle,
      angle: this.angle,
      r: this.r,
      timer: 16,
      maxTimer: 16,
      color: '#D4AF37'
    }, 24);
  }

  _updateBlitz(cfg = (CONFIG.nanami || {}), arena) {
    if (!this.blitzTarget || this.blitzTarget.isDead || this.blitzTarget.hp <= 0) {
      this.blitzTarget = null;
      const newTarget = this._findClosestEnemy();
      if (newTarget) {
        this.blitzTarget = newTarget;
      } else {
        this.isBlitzing = false;
        this.vx = 0;
        this.vy = 0;
        return;
      }
    }

    const target = this.blitzTarget;

    // Stop target's self-steering velocity so they don't wander off during combo
    if (target && !target.domainActive) {
      const isKnockbackSliding = (Math.abs(target.knockbackVx || 0) > 0.2 || Math.abs(target.knockbackVy || 0) > 0.2);
      if (!isKnockbackSliding) {
        target.vx = 0;
        target.vy = 0;
      }
    }

    // Tick down swing animation timer
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
    }

    // Update Ratio Visual Impact Effects
    if (this.ratioImpactEffects && this.ratioImpactEffects.length > 0) {
      fastCleanArray(this.ratioImpactEffects, (eff) => {
        eff.timer--;
        return eff.timer > 0;
      });
    }

    if (this.blitzPhase === 'dash') {
      // ── DASHING TOWARD STRIKE FLANK ──
      this.blitzPhaseTimer--;
      const maxT = this.blitzDashDuration || 6;
      const elapsed = maxT - this.blitzPhaseTimer;
      const progress = Math.min(1.0, Math.max(0.0, elapsed / maxT));

      // Cubic ease-out dash progression
      const easeP = 1.0 - Math.pow(1.0 - progress, 3);
      this.x = this.blitzDashStartX + (this.blitzDashTargetX - this.blitzDashStartX) * easeP;
      this.y = this.blitzDashStartY + (this.blitzDashTargetY - this.blitzDashStartY) * easeP;

      // Continuously lock aim toward target while dashing
      this.gunAngle = Math.atan2(target.y - this.y, target.x - this.x);
      this.angle = this.gunAngle;

      // Trailing afterimages & golden/black cursed lightning sparks during supersonic dash
      if (!this.afterImages) this.afterImages = [];
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        gunAngle: this.gunAngle,
        angle: this.angle,
        r: this.r,
        timer: 14,
        maxTimer: 14,
        color: '#D4AF37'
      }, 24);

      if (this.blitzPhaseTimer % 2 === 0) {
        spawnSparks(this.x, this.y, 3, '#FFD700', '#111111');
      }

      // Check if dash arrived at flank/front position
      if (this.blitzPhaseTimer <= 0) {
        this.x = this.blitzDashTargetX;
        this.y = this.blitzDashTargetY;
        this.vx = 0;
        this.vy = 0;

        this.gunAngle = Math.atan2(target.y - this.y, target.x - this.x);
        this.angle = this.gunAngle;

        // Execute Strike Impact!
        this.blitzPhase = 'strike';
        const isFinal = (this.blitzStrikeIndex === (cfg.ultimateMaxStrikes || 4) - 1);
        const strikePauseDuration = isFinal ? 18 : 10;
        this.blitzPhaseTimer = strikePauseDuration;

        this._executeBlitzStrikeHit(target, cfg);
      }
    } else if (this.blitzPhase === 'strike') {
      // ── STRIKE IMPACT & SLASH RECOVERY ──
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = Math.atan2(target.y - this.y, target.x - this.x);
      this.angle = this.gunAngle;
      this.blitzPhaseTimer--;

      if (this.blitzPhaseTimer <= 0) {
        const maxStrikes = cfg.ultimateMaxStrikes || 4;
        if (this.blitzStrikeIndex < maxStrikes - 1) {
          this.blitzStrikeIndex++;
          this._startBlitzStrikeDash(target, cfg);
        } else {
          // Blitz finished!
          const lastTarget = this.blitzTarget;
          this.blitzTarget = null;
          this.isBlitzing = false;
          this.vx = 0;
          this.vy = 0;
          this.resumeMovement(lastTarget);
        }
      }
    }
  }

  _executeBlitzStrikeHit(target, cfg = (CONFIG.nanami || {})) {
    if (!target || target.isDead || target.hp <= 0) return;

    const maxStrikes = cfg.ultimateMaxStrikes || 4;
    const isFinal = (this.blitzStrikeIndex === maxStrikes - 1);

    // Trigger cleaver swing animation
    const maxTimer = isFinal ? 18 : 12;
    this.slashSwingTimer = maxTimer;
    this.slashSwingMaxTimer = maxTimer;
    this.slashSwingImpactTimer = Math.floor(maxTimer * 0.50);
    this._chopHitDelivered = true;

    // Spawn spatial Black Flash cursed lightning rift on target and Nanami's cleaver
    if (typeof spawnBlackFlash === 'function') {
      spawnBlackFlash(target.x, target.y);
      spawnBlackFlash(this.x, this.y);
    }
    spawnSparks(target.x, target.y, 16, '#FFD700', '#FFFFFF');

    // True Damage calculation: 14 + 14 + 14 + 34 = 76 total HP True Damage
    const baseDmg = isFinal ? (cfg.ultimateFinisherDamage || 34) : (cfg.ultimateStrikeDamage || 14);
    const finalDmg = this.isOvertimeActive ? (baseDmg * (cfg.overtimeDamageMultiplier || 1.20)) : baseDmg;
    const knockbackForce = isFinal ? (cfg.ultimateFinisherKnockback || 22) : (cfg.ultimateStrikeKnockback || 6);

    applyDamageToTarget(target, finalDmg, this, {
      isSkill: true,
      isMelee: true,
      isTrueDamage: true, // Always True Damage per specification!
      isRatioCrit: true,
      isNanamiPause: true,
      bypassShield: true,
      undodgeable: true,
      bypassEvade: true,
      knockback: knockbackForce,
      knockbackAngle: this.gunAngle
    });

    if (isFinal) {
      const stunDur = cfg.ultimateFinisherHitStun || 36;
      if (typeof target.applyHitStun === 'function') target.applyHitStun(stunDur);
      spawnFloatingText(target.x, target.y - target.r - 10, '4-FOLD BLACK FLASH!', '#D4AF37');
      triggerGlobalScreenShake(cfg.ultimateFinisherShake || 8.5, cfg.ultimateFinisherShakeDuration || 24);

      // Apply 4.0s Armor Fracture debuff (+20% bonus damage taken) to surviving enemy
      if (target && !target.isDead && target.hp > 0) {
        target.nanamiArmorFractureTimer = cfg.armorFractureDuration || 240;
        target.nanamiArmorFractureAmount = cfg.armorFractureBonusDamage || 0.20;
        spawnFloatingText(target.x, target.y - target.r - 26, 'ARMOR FRACTURE (4.0s)', '#FFD700');
      }

      if (!this.ratioImpactEffects) this.ratioImpactEffects = [];
      this.ratioImpactEffects.push({
        x: target.x,
        y: target.y - (target.z || 0),
        target: target,
        angle: this.gunAngle,
        timer: 30,
        maxTimer: 30
      });
    } else {
      const stunDur = cfg.ultimateTargetHitStun || 16;
      if (typeof target.applyHitStun === 'function') target.applyHitStun(stunDur);
      const strikeIndex = (this.blitzStrikeIndex !== undefined) ? this.blitzStrikeIndex : 0;
      const strikeLabel = `${strikeIndex + 1}-FOLD BLACK FLASH!`;
      spawnFloatingText(target.x, target.y - target.r - 6, strikeLabel, '#D4AF37');
      triggerGlobalScreenShake(4.0, 10);
    }

    if (cfg.sounds?.blackFlashImpact) {
      audioSystem.playSFX(cfg.sounds.blackFlashImpact, 1.2);
    }
  }

  performCollapse(cfg = (CONFIG.nanami || {}), target = null) {
    if (this.isDead || this.hp <= 0 || !this.isSkillEnabled(cfg.enableCollapse, true)) return;
    if (this.isCollapsing || this.isLunging || this.isBlitzing || (this.ratioHitPauseTimer || 0) > 0) return;

    const closestTarget = target || this._findClosestEnemy();
    if (!closestTarget || closestTarget.isDead || closestTarget.hp <= 0) return;

    const edgeDist = Math.max(0, Math.hypot(closestTarget.x - this.x, closestTarget.y - this.y) - (closestTarget.r || 25) - (this.r || 25));
    const maxRange = cfg.collapseMaxRange || 180;

    // MANDATORY RANGE GUARD: Only trigger Collapse if target is strictly within effective shockwave range!
    if (edgeDist > maxRange) return;

    this.collapseCooldown = cfg.collapseCooldown || 600;
    this.isCollapsing = true;
    this.combatAuraOpacity = 1.0;
    const dur = cfg.collapseWindupFrames || 14;
    this.collapseTimer = dur;
    this.collapseMaxTimer = dur;

    this.slashSwingTimer = dur;
    this.slashSwingMaxTimer = dur;
    this.hideBackHand = true;

    this.aim(closestTarget);

    // Play Collapse Voiceline (randomly selects from configured collapse voicelines)
    const collapseSounds = cfg.sounds?.collapseVoicelineSounds || (cfg.sounds?.collapseVoiceline ? [cfg.sounds.collapseVoiceline] : [
      'Assets/Sound Effects/Skills/nanami-collapse-voiceline.mp3',
      'Assets/Sound Effects/Skills/nanami-collapse-voiceline2.mp3'
    ]);
    if (collapseSounds && collapseSounds.length > 0) {
      const selectedCollapseVoice = collapseSounds[Math.floor(Math.random() * collapseSounds.length)];
      const voiceVol = cfg.soundVolumes?.collapseVoiceline !== undefined ? cfg.soundVolumes.collapseVoiceline : 3.5;
      if (typeof audioSystem.playFighterVoiceline === 'function') {
        audioSystem.playFighterVoiceline(this, selectedCollapseVoice, voiceVol);
      } else {
        audioSystem.playSFX(selectedCollapseVoice, voiceVol);
      }
    }
  }

  _updateCollapse(cfg, arena) {
    this.vx = 0;
    this.vy = 0;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.collapseTimer > 0) {
      this.collapseTimer--;
      if (this.collapseTimer === 0) {
        this.isCollapsing = false;
        this._detonateCollapse(cfg, arena);
      }
    }
  }

  _detonateCollapse(cfg, arena) {
    if (cfg.sounds?.collapseSlam) {
      audioSystem.playSFX(cfg.sounds.collapseSlam, cfg.soundVolumes?.collapseSlam !== undefined ? cfg.soundVolumes.collapseSlam : 1.3);
    }
    triggerGlobalScreenShake(cfg.collapseScreenShake || 6.0, cfg.collapseShakeDuration || 18);
    spawnFloatingText(this.x, this.y - this.r - 12, 'COLLAPSE!', '#D4AF37');
    spawnSparks(this.x, this.y, 14, '#FFD700', '#FFFFFF');

    if (!this.collapseShockwaves) this.collapseShockwaves = [];
    const maxR = cfg.collapseRadius || 200;
    const dur = cfg.collapseCraterDuration || 45;

    const cracks = [];
    const crackCount = 8;
    for (let i = 0; i < crackCount; i++) {
      const baseAngle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const segs = [];
      let curDist = 15;
      let curAng = baseAngle;
      const maxDist = maxR * (0.65 + Math.random() * 0.35);
      while (curDist < maxDist) {
        curDist += 18 + Math.random() * 14;
        curAng += (Math.random() - 0.5) * 0.5;
        segs.push({
          x: Math.cos(curAng) * curDist,
          y: Math.sin(curAng) * curDist
        });
      }
      cracks.push(segs);
    }

    const debris = [];
    const debrisCount = cfg.collapseDebrisCount || 16;
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 6.5;
      debris.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        shape: Math.floor(Math.random() * 3)
      });
    }

    this.collapseShockwaves.push({
      x: this.x,
      y: this.y,
      radius: maxR,
      timer: dur,
      maxTimer: dur,
      cracks,
      debris
    });

    // Damage, Illusions/Turret Destruction, and 40% Movement Speed Reduction (Rule 6 compliant)
    const candidates = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) candidates.push(...state.fighters);
      if (state.illusions) candidates.push(...state.illusions);
    }
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
    const myTeam = (typeof state !== 'undefined' && state.getFighterTeam) ? state.getFighterTeam(myIndex) : this.team;

    for (const ent of candidates) {
      if (!ent || ent === this || ent.isDead || ent.hp <= 0 || ent.isInvulnerable) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === this) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
      }

      const edx = ent.x - this.x;
      const edy = ent.y - this.y;
      const dist = Math.hypot(edx, edy) - (ent.r || 25);

      if (dist <= maxR) {
        // Gojo Limitless Infinity Guard (Rule 9)
        const isGojoInfinity = (typeof ent.hasActiveInfinity === 'function') && ent.hasActiveInfinity();
        if (isGojoInfinity) {
          spawnSparks(ent.x, ent.y, 8, '#00E5FF', '#FFFFFF');
          continue;
        }

        const angleFromCenter = Math.atan2(edy, edx);
        const isIllusion = Boolean(ent.isIllusion || ent.isTransfiguredHuman || ent.isEvasionMinion || (state.illusions && state.illusions.includes(ent)));
        const isDeployable = Boolean(ent.isTurret || ent.isDeployable || ent.isIceWall);

        if (isIllusion || isDeployable) {
          ent.hp = 0;
          applyDamageToTarget(ent, 9999, this, {
            isSkill: true,
            isMelee: false,
            knockback: cfg.collapseKnockback || 14,
            knockbackAngle: angleFromCenter
          });
          spawnSparks(ent.x, ent.y, 10, '#D4AF37', '#FFFFFF');
          continue;
        }

        const baseDmg = cfg.collapseDamage || 24;
        const finalDmg = this.isOvertimeActive ? (baseDmg * (cfg.overtimeDamageMultiplier || 1.20)) : baseDmg;
        applyDamageToTarget(ent, finalDmg, this, {
          isSkill: true,
          isMelee: false,
          knockback: cfg.collapseKnockback || 14,
          knockbackAngle: angleFromCenter
        });

        const slowDuration = cfg.collapseSlowDuration || 150;
        const slowMult = 1.0 - (cfg.collapseSlowAmount || 0.40); // 0.60
        if (typeof ent.applySlow === 'function') {
          ent.applySlow(slowDuration, slowMult);
        } else if (ent.statusEffects && typeof ent.statusEffects.applySlow === 'function') {
          ent.statusEffects.applySlow(slowDuration, slowMult);
        } else {
          ent.slowTimer = slowDuration;
          ent.slowMultiplier = slowMult;
        }

        spawnFloatingText(ent.x, ent.y - ent.r - 6, '40% SLOW', '#D4AF37');
        spawnSparks(ent.x, ent.y, 8, '#D4AF37', '#A38020');
      }
    }
  }

  performDecisiveStrike(target, cfg = (CONFIG.nanami || {})) {
    if (this.isDead || this.hp <= 0 || !this.isSkillEnabled(cfg.enableLunge, true)) return;
    if (this.isLunging || this.isCollapsing || this.isBlitzing || (this.ratioHitPauseTimer || 0) > 0) return;

    this.lungeCooldown = cfg.lungeCooldown || 420;
    this.isLunging = true;
    this.combatAuraOpacity = 1.0;
    const duration = cfg.lungeDuration || 16;
    this.lungeTimer = duration;
    this.lungeMaxTimer = duration;
    this.lungeTarget = target;
    this.lungeHitEntities = new Set();
    this._lungePrimaryHitDone = false;

    const dashDist = cfg.lungeDistance || 180;
    const targetX = target ? target.x : (this.x + Math.cos(this.gunAngle || 0) * dashDist);
    const targetY = target ? target.y : (this.y + Math.sin(this.gunAngle || 0) * dashDist);
    const aimAngle = Math.atan2(targetY - this.y, targetX - this.x);

    this.lungeAngle = aimAngle;
    this.gunAngle = aimAngle;
    this.angle = aimAngle;
    this.slashSwingTimer = duration;
    this.slashSwingMaxTimer = duration;
    this.hideBackHand = true;

    // Spawn initial dash afterimage
    if (!this.afterImages) this.afterImages = [];
    pushTrailCap(this.afterImages, {
      x: this.x,
      y: this.y,
      gunAngle: this.gunAngle,
      angle: this.lungeAngle,
      r: this.r,
      timer: 14,
      maxTimer: 14,
      color: this.color || '#D4AF37'
    }, 18);

    spawnFloatingText(this.x, this.y - this.r - 20, 'DECISIVE STRIKE!', '#D4AF37');
    triggerGlobalScreenShake(2.5, 10);

    if (cfg.sounds?.lungeDash) {
      audioSystem.playSFX(cfg.sounds.lungeDash, 1.1);
    }
  }

  _updateDecisiveStrike(cfg, arena) {
    this.lungeTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;

    const duration = cfg.lungeDuration || 16;
    const distance = cfg.lungeDistance || 180;
    const stepSpeed = cfg.lungeSpeed !== undefined ? cfg.lungeSpeed : (distance / duration);

    this.vx = Math.cos(this.lungeAngle) * stepSpeed;
    this.vy = Math.sin(this.lungeAngle) * stepSpeed;

    // Spawn smooth trailing afterimages during dash
    if (!this.afterImages) this.afterImages = [];
    pushTrailCap(this.afterImages, {
      x: this.x,
      y: this.y,
      gunAngle: this.gunAngle,
      angle: this.lungeAngle,
      r: this.r,
      timer: 14,
      maxTimer: 14,
      color: this.color || '#D4AF37'
    }, 18);

    // Check hit against enemy fighters and illusions along the path (Rule 6)
    const candidates = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) candidates.push(...state.fighters);
      if (state.illusions) candidates.push(...state.illusions);
    }
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
    const myTeam = (typeof state !== 'undefined' && state.getFighterTeam) ? state.getFighterTeam(myIndex) : this.team;

    const hitRadius = this.r + 32;

    for (const ent of candidates) {
      if (!ent || ent === this || ent.isDead || ent.hp <= 0 || ent.isInvulnerable) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === this) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
      }
      if (this.lungeHitEntities && this.lungeHitEntities.has(ent)) continue;

      const dist = Math.hypot(ent.x - this.x, ent.y - this.y) - (ent.r || 25);
      if (dist <= hitRadius) {
        this.lungeHitEntities.add(ent);

        // Gojo Limitless Infinity Guard
        const isGojoInfinity = (typeof ent.hasActiveInfinity === 'function') && ent.hasActiveInfinity();
        if (isGojoInfinity) {
          const barrierR = CONFIG.gojo?.infinityRadius ?? (ent.r + 30);
          const contactAngle = Math.atan2(this.y - ent.y, this.x - ent.x);
          const bx = ent.x + Math.cos(contactAngle) * barrierR;
          const by = ent.y + Math.sin(contactAngle) * barrierR;
          if (typeof ent.triggerInfinityBlock === 'function') {
            ent.triggerInfinityBlock(bx, by, this);
          }
          this.interruptAttacks();
          spawnSparks(bx, by, 10, '#00E5FF', '#FFFFFF');
          if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(2.5, 8);
          return;
        }

        const isPrimary = (ent === this.lungeTarget) || (!this._lungePrimaryHitDone);
        const initialHp = ent.hp;

        if (isPrimary) {
          this._lungePrimaryHitDone = true;

          // Primary Target: Guaranteed 7:3 Critical Damage (36 True Damage) & 0.5s hit-stun (30 frames)
          const critDamage = cfg.lungeCritDamage || 36;
          applyDamageToTarget(ent, critDamage, this, {
            isSkill: true,
            isMelee: true,
            isTrueDamage: true,
            isRatioCrit: true,
            isNanamiPause: true,
            skipInterrupt: true,
            bypassShield: true,
            undodgeable: true,
            bypassEvade: true,
            noBlood: true,
            suppressBlood: true,
            knockback: cfg.lungeKnockback || 16,
            knockbackAngle: this.lungeAngle
          });

          // Apply 0.5s hit-stun (30 frames)
          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(cfg.lungeStunDuration || 30);
          } else {
            ent.hitStunTimer = Math.max(ent.hitStunTimer || 0, cfg.lungeStunDuration || 30);
          }
          ent.vx = 0;
          ent.vy = 0;

          // Cinematic 7:3 Ratio Critical Impact
          const pauseFrames = cfg.ratioCritHitPauseFrames || 30;
          this.ratioHitPauseTimer = pauseFrames;
          this.ratioHitPauseMax = pauseFrames;
          this.ratioHitPauseTarget = ent;
          this._ratioPauseElapsedFrames = 0;
          this._ratioRulerSpinPlayed = false;
          this._ratioBloodSplashPlayed = false;
          if (typeof ent.applyTimeStop === 'function') {
            ent.applyTimeStop(pauseFrames);
            ent.suppressFreezeOverlay = true;
          }

          const blade = _getNanamiCleaverWorldSegment(this, 0.50);
          this.ratioHitProgress = 0.50;
          this.ratioHitCleaverAngle = blade.localCleaverAngle;
          this.ratioHitHandX = blade.localHandX;
          this.ratioHitHandY = blade.localHandY;

          if (!this.ratioImpactEffects) this.ratioImpactEffects = [];
          this.ratioImpactEffects.push({
            x: ent.x,
            y: ent.y - (ent.z || 0),
            target: ent,
            angle: this.lungeAngle,
            timer: Math.max(16, pauseFrames + 6),
            maxTimer: Math.max(16, pauseFrames + 6)
          });

          triggerGlobalScreenShake(7.5, 20);
          spawnSparks(ent.x, ent.y, 12, '#FFD700', '#FFFFFF');

          // Apply / refresh Armor Fracture debuff
          if (ent && !ent.isDead && ent.hp > 0) {
            ent.nanamiArmorFractureTimer = cfg.armorFractureDuration || 180;
            ent.nanamiArmorFractureAmount = cfg.armorFractureBonusDamage || 0.20;
          }

          // Overtime Synergy & Defeat Cooldown Reduction (-50%)
          const isDefeated = ent.hp <= 0 || ent.isDead || (initialHp > 0 && ent.hp <= 0);
          const refundMultiplier = cfg.lungeCooldownRefundMultiplier || 0.50;
          if (isDefeated || this.isOvertimeActive) {
            this.lungeCooldown = Math.round((cfg.lungeCooldown || 420) * refundMultiplier);
            if (isDefeated) {
              spawnFloatingText(this.x, this.y - this.r - 28, 'COOLDOWN REFUND! -50%', '#FFD700');
            }
          }
        } else {
          // Secondary targets & illusions in path: 14 Damage & 0.5s hit-stun
          const pathDmg = cfg.lungeDamage || 14;
          applyDamageToTarget(ent, pathDmg, this, {
            isMelee: true,
            isTrueDamage: false,
            knockback: cfg.lungePathKnockback || 10,
            knockbackAngle: this.lungeAngle
          });

          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(cfg.lungeStunDuration || 30);
          } else {
            ent.hitStunTimer = Math.max(ent.hitStunTimer || 0, cfg.lungeStunDuration || 30);
          }
          spawnSparks(ent.x, ent.y, 6, '#FFD700', '#F59E0B');

          const isDefeated = ent.hp <= 0 || ent.isDead || (initialHp > 0 && ent.hp <= 0);
          const refundMultiplier = cfg.lungeCooldownRefundMultiplier || 0.50;
          if (isDefeated || this.isOvertimeActive) {
            this.lungeCooldown = Math.min(this.lungeCooldown, Math.round((cfg.lungeCooldown || 420) * refundMultiplier));
          }
        }
      }
    }

    if (this.lungeTimer <= 0) {
      this.isLunging = false;
      this.lungeTarget = null;
      this.lungeHitEntities = null;
      this._lungePrimaryHitDone = false;
    }
  }

  _startCleaverChop(target, cfg) {
    if (!this.isSkillEnabled(cfg.enableCleaver, true)) return;
    this.combatAuraOpacity = 1.0;
    const isOvertime = this.isOvertimeActive;

    this.chopWindupFrames = (typeof cfg.chopWindupFrames === 'number') ? cfg.chopWindupFrames : 2;
    this.chopStrikeFrames = (typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 10;
    this.chopRecoveryFrames = (typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 8;
    const totalFrames = this.chopWindupFrames + this.chopStrikeFrames + this.chopRecoveryFrames;

    this.slashSwingTimer = totalFrames;
    this.slashSwingMaxTimer = totalFrames;
    this.slashSwingImpactTimer = this.chopWindupFrames + Math.floor(this.chopStrikeFrames * 0.50);
    this._chopHitDelivered = false;
    this._chopHitConnected = false;
    this._chopPreviousStrikeP = 0;
    this.ratioHitProgress = null;
    this.ratioHitCleaverAngle = null;
    this.ratioHitHandX = null;
    this.ratioHitHandY = null;
    this._chopTarget = target;
    this.isRightPunch = !this.isRightPunch;
    this.shootCooldown = isOvertime ? Math.round((cfg.cleaverCooldown || 55) * 0.80) : (cfg.cleaverCooldown || 55);

    // Snapshot committed chop cast angle (Rule 1.4)
    if (target && !target.isDead && target.hp > 0) {
      this.chopCastAngle = Math.atan2(target.y - (this.y - (this.z || 0)), target.x - this.x);
    } else {
      this.chopCastAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0);
    }
    this.gunAngle = this.chopCastAngle;
    this.angle = this.chopCastAngle;

    if (cfg.sounds?.cleaverSwing) {
      audioSystem.playSFX(cfg.sounds.cleaverSwing, cfg.soundVolumes?.cleaverSwing !== undefined ? cfg.soundVolumes.cleaverSwing : 0.95);
    }

    // Play Nanami Attack Grunt / Noise on basic chop with configurable chance & volume
    const noiseSounds = cfg.sounds?.attackNoiseSounds || [
      'Assets/Sound Effects/Attacks/nanami-attack-noise1.mp3',
      'Assets/Sound Effects/Attacks/nanami-attack-noise2.mp3',
      'Assets/Sound Effects/Attacks/nanami-attack-noise3.mp3'
    ];
    const noiseChance = (typeof cfg.soundChances?.attackNoise === 'number')
      ? cfg.soundChances.attackNoise
      : ((typeof cfg.attackNoiseChance === 'number') ? cfg.attackNoiseChance : 0.45);

    if (noiseSounds && noiseSounds.length > 0 && Math.random() < noiseChance) {
      const selectedNoise = noiseSounds[Math.floor(Math.random() * noiseSounds.length)];
      const noiseVol = cfg.soundVolumes?.attackNoise !== undefined ? cfg.soundVolumes.attackNoise : (cfg.attackNoiseVolume !== undefined ? cfg.attackNoiseVolume : 2.2);
      if (typeof audioSystem.playFighterVoiceline === 'function') {
        audioSystem.playFighterVoiceline(this, selectedNoise, noiseVol);
      } else {
        audioSystem.playSFX(selectedNoise, noiseVol);
      }
    }
  }

  _executeCleaverChopHit(currentStrikeP, prevStrikeP, cfg) {
    if (!this.isSkillEnabled(cfg.enableCleaver, true)) return;
    const isOvertime = this.isOvertimeActive;
    const candidates = this._getAllValidEnemyTargets();
    if (this._chopTarget && !candidates.includes(this._chopTarget)) {
      candidates.unshift(this._chopTarget);
    }

    for (let i = 0; i < candidates.length; i++) {
      const ent = candidates[i];
      if (!ent || ent === this || ent.isDead || ent.hp <= 0 || ent.isInvulnerable) continue;

      const hitInfo = _testNanamiCleaverBladeHit(this, ent, currentStrikeP, prevStrikeP);
      if (!hitInfo) continue;

      // Gojo Limitless Infinity Barrier Guard (Rule 1.7)
      const isGojoInfinity = (typeof ent.hasActiveInfinity === 'function') && ent.hasActiveInfinity();
      if (isGojoInfinity) {
        const barrierR = CONFIG.gojo?.infinityRadius ?? (ent.r + 30);
        const contactAngle = Math.atan2(this.y - ent.y, this.x - ent.x);
        const bx = ent.x + Math.cos(contactAngle) * barrierR;
        const by = ent.y + Math.sin(contactAngle) * barrierR;
        if (typeof ent.triggerInfinityBlock === 'function') {
          ent.triggerInfinityBlock(bx, by, this);
        }
        this.interruptAttacks();
        spawnSparks(bx, by, 10, '#00E5FF', '#FFFFFF');
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(2.5, 8);
        return;
      }

      // Snapshot Exact Collision Pose for Escanor-style Hit-Pause Render Freeze
      this._chopHitConnected = true;
      this.ratioHitProgress = hitInfo.sampleP;
      this.ratioHitCleaverAngle = hitInfo.blade.localCleaverAngle;
      this.ratioHitHandX = hitInfo.blade.localHandX;
      this.ratioHitHandY = hitInfo.blade.localHandY;

      // Evaluate 7:3 Ratio Technique Critical Hit
      const critResult = this._evaluateRatioCrit(ent, hitInfo.angleDiff, cfg);

      // Apply Hit Results, true damage, and hit-pause stasis
      this._applyRatioChopHitResult(ent, hitInfo, critResult, cfg);

      // Overtime Shockwave Dispersion on Secondary Targets in frontal arc
      if (isOvertime) {
        const aimAngle = (this.chopCastAngle !== undefined) ? this.chopCastAngle : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));
        if (!this.shockwaveEffects) this.shockwaveEffects = [];
        this.shockwaveEffects.push({
          x: hitInfo.contactX,
          y: hitInfo.contactY,
          angle: aimAngle,
          radius: 95,
          timer: 12,
          maxTimer: 12
        });

        for (let j = 0; j < candidates.length; j++) {
          const secondary = candidates[j];
          if (secondary === ent || !secondary || secondary.isDead || secondary.hp <= 0 || secondary.isInvulnerable) continue;
          const sDx = secondary.x - this.x;
          const sDy = secondary.y - this.y;
          const sDist = Math.hypot(sDx, sDy) - (secondary.r || 25);
          if (sDist <= 95) {
            let sAngle = Math.atan2(sDy, sDx);
            let sDiff = sAngle - aimAngle;
            while (sDiff < -Math.PI) sDiff += Math.PI * 2;
            while (sDiff > Math.PI) sDiff -= Math.PI * 2;
            if (Math.abs(sDiff) <= ((160 * Math.PI) / 180) / 2) {
              const splashDmg = (cfg.cleaverDamage || 7) * 0.50 * (cfg.overtimeDamageMultiplier || 1.20);
              applyDamageToTarget(secondary, splashDmg, this, {
                isMelee: true,
                isTrueDamage: false,
                knockback: 10,
                knockbackAngle: aimAngle
              });
              spawnSparks(secondary.x, secondary.y, 4, '#FFD700', '#F59E0B');
            }
          }
        }
      }

      break; // Primary chop collision handled
    }
  }

  _evaluateRatioCrit(target, angleOffset, cfg) {
    const isOvertime = this.isOvertimeActive;
    const halfArc = (typeof cfg.chopFrontalArcLimit === 'number') ? cfg.chopFrontalArcLimit : ((cfg.cleaverArc || ((130 * Math.PI) / 180)) / 2);
    const angleAlignment = Math.max(0, Math.min(1.0, 1.0 - (Math.abs(angleOffset) / Math.max(0.01, halfArc))));
    const maxAngleBonus = cfg.ratioSweetSpotMaxBonus !== undefined ? cfg.ratioSweetSpotMaxBonus : 0.15;
    const dynamicAngleBonus = angleAlignment * maxAngleBonus;

    const ratioEnabled = this.isSkillEnabled(cfg.enableRatioTechnique, true);
    let isRatioCrit = false;
    const isRatioOnCooldown = (this.ratioCritCooldownTimer || 0) > 0;

    if (ratioEnabled && !isRatioOnCooldown) {
      if (isOvertime) {
        if (this.overtimeGuaranteedCritTimer <= 0) {
          isRatioCrit = true;
          this.overtimeGuaranteedCritTimer = cfg.overtimeGuaranteedCritCooldown || 150;
          this.ratioCritCooldownTimer = cfg.overtimeCritInternalCooldown || 90;
        } else {
          const baseOvertimeCrit = cfg.overtimeBaseCritChance !== undefined ? cfg.overtimeBaseCritChance : 0.25;
          const totalOvertimeCrit = Math.min(1.0, baseOvertimeCrit + dynamicAngleBonus);
          isRatioCrit = Math.random() < totalOvertimeCrit;
          if (isRatioCrit) {
            this.ratioCritCooldownTimer = cfg.overtimeCritInternalCooldown || 90;
          }
        }
      } else {
        const baseStandardCrit = cfg.ratioBaseCritChance !== undefined ? cfg.ratioBaseCritChance : 0.15;
        const totalStandardCrit = Math.min(1.0, baseStandardCrit + dynamicAngleBonus);
        isRatioCrit = Math.random() < totalStandardCrit;
        if (isRatioCrit) {
          this.ratioCritCooldownTimer = cfg.ratioCritInternalCooldown || 120;
        }
      }
    }

    const precisionThreshold = cfg.ratioSweetSpotPrecisionThreshold !== undefined ? cfg.ratioSweetSpotPrecisionThreshold : 0.75;
    const isSweetSpotPrecision = isRatioCrit && (angleAlignment >= precisionThreshold);

    return { isRatioCrit, isSweetSpotPrecision, angleAlignment };
  }

  _applyRatioChopHitResult(target, hitInfo, critResult, cfg) {
    const isOvertime = this.isOvertimeActive;
    let baseDmg = cfg.cleaverDamage || 7;
    if (isOvertime) baseDmg *= (cfg.overtimeDamageMultiplier || 1.20);

    // Initial Contact SFX (crisp cutting sound on collision)
    const chopHitSound = cfg.sounds?.chopHit || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
    const chopHitVol = cfg.soundVolumes?.chopHit !== undefined ? cfg.soundVolumes.chopHit : 1.10;
    audioSystem.playSFX(chopHitSound, chopHitVol);

    // Initial Contact Sparks & Flash at contact coordinates
    spawnImpactFlash(hitInfo.contactX, hitInfo.contactY, '#D4AF37');
    spawnSparks(hitInfo.contactX, hitInfo.contactY, critResult.isRatioCrit ? 14 : 8, '#FFD700', '#FFFFFF');

    // Soul Geometry Piercing (vs Mahito)
    const isTargetMahito = target.characterId === 'mahito' || target.type === 'mahito' || target._def?.type === 'mahito';
    const chopAngle = (this.chopCastAngle !== undefined) ? this.chopCastAngle : ((this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0));

    if (critResult.isRatioCrit) {
      const critMult = isOvertime ? (cfg.overtimeRatioCritMultiplier || 1.80) : (cfg.ratioCritMultiplier || 2.0);
      const finalDmg = baseDmg * critMult;
      this.ratioCritCharge = 20;

      const pauseFrames = cfg.ratioCritHitPauseFrames || 30;
      this.ratioHitPauseTimer = pauseFrames;
      this.ratioHitPauseMax = pauseFrames;
      this.ratioHitPauseTarget = target;
      this._ratioPauseElapsedFrames = 0;
      this._ratioRulerSpinPlayed = false;
      this._ratioBloodSplashPlayed = false;

      // Freeze target in time during cinematic hit-pause stasis
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(pauseFrames);
        target.suppressFreezeOverlay = true;
      }
      target.vx = 0;
      target.vy = 0;

      // Push 7:3 Ratio Impact Grid Visual
      if (!this.ratioImpactEffects) this.ratioImpactEffects = [];
      this.ratioImpactEffects.push({
        x: target.x,
        y: target.y - (target.z || 0),
        target: target,
        angle: chopAngle,
        timer: Math.max(16, pauseFrames + 6),
        maxTimer: Math.max(16, pauseFrames + 6)
      });

      const initialShake = critResult.isSweetSpotPrecision ? (cfg.ratioHitShakePrecision || 8.0) : (cfg.ratioHitShake || 6.5);
      triggerGlobalScreenShake(initialShake, 18);

      if (critResult.isSweetSpotPrecision) {
        spawnFloatingText(target.x, target.y - target.r - 26, '7:3 SWEET SPOT!', '#FFD700');
      } else {
        spawnFloatingText(target.x, target.y - target.r - 18, '7:3 CRITICAL!', '#D4AF37');
      }

      // Apply Damage (True Damage on 7:3 Critical) — blood is suppressed here and burst upon unpause
      applyDamageToTarget(target, finalDmg, this, {
        isMelee: true,
        isTrueDamage: true,
        isRatioCrit: true,
        isNanamiPause: true,
        skipInterrupt: true,
        bypassShield: true,
        undodgeable: true,
        bypassEvade: true,
        noBlood: true,
        suppressBlood: true,
        knockback: 0, // Applied on unpause release
        knockbackAngle: chopAngle
      });

      // Inflict Armor Fracture Debuff for subsequent hits
      if (target && !target.isDead && target.hp > 0) {
        target.nanamiArmorFractureTimer = cfg.armorFractureDuration || 180;
        target.nanamiArmorFractureAmount = cfg.armorFractureBonusDamage || 0.20;
      }
    } else {
      // Non-critical chop hit
      const basicStun = cfg.basicHitStunFrames || 12;
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(basicStun);
      } else {
        target.hitStunTimer = Math.max(target.hitStunTimer || 0, basicStun);
      }

      triggerGlobalScreenShake(cfg.basicImpactShake || 2.5, 8);

      applyDamageToTarget(target, baseDmg, this, {
        isMelee: true,
        isTrueDamage: isTargetMahito,
        isRatioCrit: false,
        knockback: (cfg.cleaverKnockback || 14) * (isOvertime ? 1.2 : 1.0),
        knockbackAngle: chopAngle
      });
    }
  }

  takeDamage(finalAmount, attacker, opts) {
    let amount = finalAmount;
    // Overtime Damage Mitigation (15%)
    if (this.isOvertimeActive) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
      const reduction = cfg.overtimeDamageReduction || 0.15;
      amount *= (1.0 - reduction);
    }

    return super.takeDamage(amount, attacker, opts);
  }

  draw(ctx) {
    if (this.hp <= 0 && this.isDead) return;

    // 1. Draw Ratio Targeting Crosshair & 10-Point Measurement Grid on locked target
    const target = this._findClosestEnemy();
    if (target && !target.isDead && target.hp > 0) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= 220) {
        drawRatioTargetingCrosshair(ctx, this, target);
      }
    }

    // 2. Draw Golden 7:3 Crescent Slash Arc underneath fighter during active swings
    drawNanamiCleaverSlashArc(ctx, this);

    // 3. Draw Overtime Shockwave Dispersion Waves
    if (this.shockwaveEffects && this.shockwaveEffects.length > 0) {
      for (let i = 0; i < this.shockwaveEffects.length; i++) {
        const sw = this.shockwaveEffects[i];
        drawNanamiCleaveShockwave(ctx, sw.x, sw.y, sw.angle, sw.radius, sw.timer, sw.maxTimer);
      }
    }

    // 4. Draw 7:3 Ratio Impact Grid Bursts
    if (this.ratioImpactEffects && this.ratioImpactEffects.length > 0) {
      for (let i = 0; i < this.ratioImpactEffects.length; i++) {
        const eff = this.ratioImpactEffects[i];
        const posX = (eff.target && !eff.target.isDead) ? eff.target.x : eff.x;
        const posY = (eff.target && !eff.target.isDead) ? (eff.target.y - (eff.target.z || 0)) : eff.y;
        const targetR = (eff.target && eff.target.r) ? eff.target.r : 25;
        const effectScale = Math.max(0.85, (targetR / 25) * (eff.scale || 1.0));
        const gridAngle = (eff.angle !== undefined) ? (eff.angle + Math.PI / 2) : (Math.PI / 2);
        drawRatioGridImpact(ctx, posX, posY, gridAngle, effectScale, eff.timer, eff.maxTimer);
      }
    }

    // 5. Draw Floating Overtime Watch Badge
    drawOvertimeWatchBadge(ctx, this);

    // 6. Draw Nanami Body, Uniform & Cleaver
    drawNanamiSkin(ctx, this);

    // 7. Draw Health & Freeze Indicators
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}


