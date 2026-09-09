import { CONFIG } from '../../../core/config.js';
import { modUpdateMeleeCombat } from './yujiCombat.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

/**
 * Handles Yuji Itadori's Skill 1: Divergent Fist Dash.
 * Rapidly dashes towards the target, leaving afterimages, then delivers a Divergent Fist strike on arrival.
 */
export function modUpdateDivergentDash(target) {
  if (!this.isDivergentDashing) return;

  if (!target || target.isDead || target.hp <= 0) {
    this.isDivergentDashing = false;
    this.divergentDashTarget = null;
    this.divergentDashTimer = 0;
    return;
  }

  // Aim towards target throughout the dash
  this.aim(target);

  const dx = target.x - this.x;
  const dy = target.y - this.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const dashSpeed = CONFIG.yuji?.divergentDashSpeed || 17.5;
  this.vx = Math.cos(angle) * dashSpeed;
  this.vy = Math.sin(angle) * dashSpeed;

  // Spawn dynamic afterimages
  if (!this.afterImages) this.afterImages = [];
  pushTrailCap(this.afterImages, {
    x: this.x,
    y: this.y,
    r: this.r,
    angle: this.gunAngle || this.angle || 0,
    color: this.color || '#D95C7E',
    timer: 14,
    maxTimer: 14
  }, 10);

  this.divergentDashTimer = (this.divergentDashTimer || 0) - 1;

  const targetRadius = target.r || 20;
  const arriveDist = this.r + targetRadius + 32;

  // On arrival or timeout, terminate dash and execute Divergent Fist attack
  if (dist <= arriveDist || this.divergentDashTimer <= 0) {
    this.isDivergentDashing = false;
    this.divergentDashTarget = null;
    this.divergentDashTimer = 0;

    // Small forward lunge burst to connect the punch
    this.vx = Math.cos(angle) * 3.5;
    this.vy = Math.sin(angle) * 3.5;

    // Visual impact burst
    spawnImpactFlash(this.x, this.y, 24, 'gojo');

    // Trigger melee punch immediately
    modUpdateMeleeCombat.call(this, target);
  }
}

/**
 * Handles Yuji Itadori's Reverse Cursed Technique (RCT) [Passive].
 * RCT is a passive technique that automatically heals Yuji upon reverting from Sukuna transformation.
 */
export function modUpdateReverseCursedTechnique() {
  // Legacy safety check: if active channeling is somehow requested, complete immediately
  if (this.isChannelingRCT) {
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }
}

