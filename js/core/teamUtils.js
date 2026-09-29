import { GAME_MODES } from './modeConfig.js';

export function isTeamModeEnabled(mode) {
  return (
    mode === GAME_MODES.TWO_VS_TWO || mode === '2v2' ||
    mode === GAME_MODES.TACTICAL_2V2 || mode === 'Tactical 2v2' ||
    mode === 'Boss Battle' || mode === GAME_MODES.BOSS_BATTLE ||
    mode === GAME_MODES.STAND_OFF_1V2 || mode === '1v2 Stand Off' ||
    mode === '1v2' || mode === 'STAND_OFF_1V2' ||
    mode === GAME_MODES.TACTICAL_4V4 || mode === 'Tactical 4v4' ||
    mode === '4v4'
  );
}

export function areOnSameTeam(stateRef, ownerIndex, targetIndex) {
  if (ownerIndex === targetIndex && ownerIndex !== undefined && ownerIndex !== null && ownerIndex !== -1) return true;
  if (!stateRef || !stateRef.mode) return false;
  if (typeof ownerIndex !== 'number' || typeof targetIndex !== 'number' || ownerIndex < 0 || targetIndex < 0) return false;
  if (!isTeamModeEnabled(stateRef.mode)) return false;

  const ownerTeam = typeof stateRef.getFighterTeam === 'function' ? stateRef.getFighterTeam(ownerIndex) : null;
  const targetTeam = typeof stateRef.getFighterTeam === 'function' ? stateRef.getFighterTeam(targetIndex) : null;
  return ownerTeam !== null && targetTeam !== null && ownerTeam === targetTeam;
}