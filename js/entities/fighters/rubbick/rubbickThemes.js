import { state } from '../../../core/state.js';

export function isInsideEnemyGojoDomain(fighter) {
  if (!fighter || typeof state === 'undefined' || !state.fighters) return false;
  // If Rubbick himself is the one casting/maintaining his stolen domain, he is immune
  if (fighter.stolenDomainActive || (fighter.domainActive && fighter.stolenType === 'gojo_domain')) return false;

  const myIdx = state.fighters.indexOf(fighter);
  const myTeam = (myIdx >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : (fighter.team !== undefined ? fighter.team : null);

  return state.fighters.some((f, idx) => {
    if (!f || f === fighter || f.hp <= 0 || !f.domainActive) return false;
    const isGojo = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo');
    if (!isGojo) return false;
    if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(idx) === myTeam) return false;
    return true;
  });
}

export function isInsideRubbickStolenVoid(fighter) {
  if (!fighter || typeof state === 'undefined' || !state.fighters) return false;
  // Rubbick himself is the caster/owner, not an enemy trapped inside
  if (fighter.stolenDomainActive || (fighter.domainActive && fighter.stolenType === 'gojo_domain')) return false;

  const myIdx = state.fighters.indexOf(fighter);
  const myTeam = (myIdx >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : (fighter.team !== undefined ? fighter.team : null);

  return state.fighters.some((f, idx) => {
    if (!f || f === fighter || f.hp <= 0) return false;
    const isRubbick = (f.characterId === 'rubbick' || f.type === 'rubbick' || f._def?.id === 'rubbick' || f._def?.type === 'rubbick');
    if (!isRubbick) return false;
    const isDomainActive = f.stolenDomainActive || (f.domainActive && f.stolenType === 'gojo_domain');
    if (!isDomainActive) return false;
    if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(idx) === myTeam) return false;
    return true;
  });
}

export const RubbickRubyTheme = {
  glowShadow: 'rgba(0, 255, 100, 1)',
  aura: 'rgba(0, 10, 5, 0.85)',
  core: 'rgba(0, 255, 100, 0.9)',
  glowSrc1: '#00ff55',
  glowSrc2: '#14ff93',
  darkSrc1: '#001a0d',
  darkSrc2: '#004a1a',
  heatSoft1: '0, 255, 85',
  heatSoft2: '0, 200, 60',
  plasma1: 'rgba(20, 255, 100, 0.8)',
  plasma2: 'rgba(0, 200, 80, 0.4)',
  guard1: '0, 130, 10',
  guard2: '0, 40, 5',
  bladeSnout: '#44ef44',
  candy1: '#009933',
  candy2: '#00ff55',
  candy3: '#14ff93',
  candy4: '#00cc52',
  candy5: '#00802a',
  panel: 'rgba(29, 127, 29, 0.6)'
};

export const RubbickCronosTheme = {
  lodOuterGlow: 'rgba(0, 200, 80, 0.8)',
  lodInnerFill: 'rgba(0, 220, 100, 0.3)',
  vol1: 'rgba(0, 220, 120, 0.20)',
  vol2: 'rgba(0, 180, 100, 0.25)',
  vol3: 'rgba(0, 140, 80, 0.35)',
  vol4: 'rgba(0, 100, 60, 0.55)',
  hexFill: 'rgba(0, 210, 120, 0.15)',
  hexEdge: 'rgba(0, 230, 130, 0.85)',
  hexDot: 'rgba(0, 220, 120, 0.7)',
  pulseRing: 'rgba(0, 210, 110, 0.5)',
  crispEdge: 'rgba(0, 220, 120, 0.85)'
};

export const TricksterRubyTheme = RubbickRubyTheme;
export const TricksterCronosTheme = RubbickCronosTheme;

