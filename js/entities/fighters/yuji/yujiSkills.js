import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { modUpdateMeleeCombat } from './yujiCombat.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

/**
 * Checks whether Ryomen Sukuna is present as a combatant in the current match across all gamemodes
 * (1v1, 1v2, 2v2, Tag Match active & roster bench, FFA, Boss Battle, Tactical Modes, etc.).
 * When Sukuna is present in the battle, Yuji's Sukuna Takeover (Soul Swap) transformation is disabled.
 *
 * @param {object|null} excludeFighter - Fighter entity to exclude (e.g. Yuji himself).
 * @returns {boolean} True if Sukuna is present in the match.
 */
export function isSukunaPresentInMatch(excludeFighter = null) {
  if (typeof state === 'undefined') return false;

  // 1. Check live active combatants in arena
  if (Array.isArray(state.fighters)) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (!f || f === excludeFighter) continue;
      if (
        f.characterId === 'sukuna' ||
        f.type === 'sukuna' ||
        f._def?.id === 'sukuna' ||
        f._def?.type === 'sukuna' ||
        (typeof f._def?.name === 'string' && f._def.name.toLowerCase().includes('sukuna'))
      ) {
        return true;
      }
    }
  }

  // 2. Check Tag Match rosters (bench + upcoming fighters across both teams)
  if (state.tagMatch) {
    const defs = typeof getActiveFighterDefs === 'function'
      ? getActiveFighterDefs()
      : (typeof FIGHTER_DEFS !== 'undefined' ? FIGHTER_DEFS : []);

    const checkRoster = (roster) => {
      if (!Array.isArray(roster)) return false;
      return roster.some(idx => {
        const def = defs[idx];
        return def && (
          def.id === 'sukuna' ||
          def.type === 'sukuna' ||
          def.characterId === 'sukuna' ||
          (typeof def.name === 'string' && def.name.toLowerCase().includes('sukuna'))
        );
      });
    };

    if (checkRoster(state.tagMatch.team0Roster) || checkRoster(state.tagMatch.team1Roster)) {
      return true;
    }
  }

  // 3. Check standalone boss fighter reference if defined
  if (state.bossFighter && state.bossFighter !== excludeFighter) {
    const bf = state.bossFighter;
    if (
      bf.characterId === 'sukuna' ||
      bf.type === 'sukuna' ||
      bf._def?.id === 'sukuna' ||
      bf._def?.type === 'sukuna' ||
      (typeof bf._def?.name === 'string' && bf._def.name.toLowerCase().includes('sukuna'))
    ) {
      return true;
    }
  }

  return false;
}

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

