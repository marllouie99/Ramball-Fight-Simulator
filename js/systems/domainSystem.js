// ─────────────────────────────────────────────
// DOMAIN EXPANSION SYSTEM MANAGER
// ─────────────────────────────────────────────
import { spawnFloatingText } from '../core/state.js';
import { spawnSparks } from '../graphics/particles/sparkEffect.js';

/**
 * Checks if a fighter is immune to Domain Expansions (e.g. Toji Heavenly Restriction / Zero Cursed Energy).
 * @param {Object} fighter 
 * @returns {boolean}
 */
export function isDomainImmune(fighter) {
  if (!fighter) return false;
  return !!(
    fighter.domainImmunity ||
    fighter.characterId === 'toji' ||
    fighter.type === 'toji' ||
    fighter._def?.id === 'toji'
  );
}

/**
 * Checks if any Domain Expansion is currently active in the arena.
 * @param {Object} state 
 * @returns {boolean}
 */
export function isAnyDomainActive(state) {
  if (!state || !state.fighters) return false;
  return state.fighters.some(f => f && (f.domainActive || f.stolenDomainActive) && f.hp > 0);
}

/**
 * Returns an array of all fighters currently maintaining an active Domain Expansion.
 * @param {Object} state 
 * @returns {Array}
 */
export function getActiveDomains(state) {
  if (!state || !state.fighters) return [];
  return state.fighters.filter(f => f && (f.domainActive || f.stolenDomainActive) && f.hp > 0);
}

/**
 * Checks if multiple domains are currently active, resulting in a Domain Clash.
 * @param {Object} state 
 * @returns {boolean}
 */
export function isMultiDomainClash(state) {
  return getActiveDomains(state).length > 1;
}

/**
 * Checks if any fighter is actively channeling/casting a Domain Expansion.
 * @param {Object} state 
 * @returns {boolean}
 */
export function isAnyFighterChannelingDomain(state) {
  if (!state || !state.fighters) return false;
  return state.fighters.some(f => f && f.hp > 0 && (f.isChannelingDomain || f.isChannelingDomainExpansion || (f.characterId === 'rubbick' && f.stolenType === 'gojo_domain' && f.stolenWindUpTimer > 0)));
}

/**
 * Applies domain trap paralysis, text, and hit-stun to all trapped enemy fighters.
 * Automatically verifies Toji Heavenly Restriction immunity before applying CC.
 * @param {Object} owner - The fighter who deployed the domain
 * @param {Object} state - The game state
 * @param {number} [hitStunFrames=20] - Frames of hit-stun to apply
 * @param {string} [trapText='TRAPPED IN DOMAIN!'] - Text to display over trapped enemies
 * @param {string} [textColor='#FF69B4'] - Hex color of the text
 */
export function applyDomainTrapToEnemies(owner, state, hitStunFrames = 20, trapText = 'TRAPPED IN DOMAIN!', textColor = '#FF69B4') {
  if (!owner || !state || !state.fighters) return;

  const ownerIdx = state.fighters.indexOf(owner);
  const myTeam = state.getFighterTeam ? state.getFighterTeam(ownerIdx) : null;

  state.fighters.forEach((f, idx) => {
    if (f && f !== owner && f.hp > 0) {
      const isEnemy = myTeam === null || (state.getFighterTeam && state.getFighterTeam(idx) !== myTeam);
      if (isEnemy) {
        if (isDomainImmune(f)) {
          return; // Immune to domain expansion traps!
        }
        if (typeof f.applyHitStun === 'function') {
          f.applyHitStun(hitStunFrames);
        }
        if (trapText) {
          spawnFloatingText(f.x, f.y - 30, trapText, textColor);
        }
        spawnSparks(f.x, f.y, 6, 'silver', 'rgba(255, 105, 180, 1)');
      }
    }
  });
}
