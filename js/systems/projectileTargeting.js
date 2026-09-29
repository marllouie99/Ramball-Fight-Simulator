export function collectProjectileCollisionCandidates(fighters, stateRef) {
  const candidates = [];

  if (fighters && fighters.length > 0) {
    for (let fighterIndex = 0; fighterIndex < fighters.length; fighterIndex++) {
      if (fighters[fighterIndex]) {
        candidates.push({ fighter: fighters[fighterIndex], fi: fighterIndex, isIllusion: false });
      }
    }
  }

  if (stateRef?.illusions && stateRef.illusions.length > 0) {
    for (const illusion of stateRef.illusions) {
      if (illusion) candidates.push({ fighter: illusion, fi: -1, isIllusion: true });
    }
  }

  return candidates;
}

export function isFugaProjectile(projectile) {
  return Boolean(
    projectile.isSukunaFurnace ||
    projectile.visual === 'sukunaFurnaceArrow' ||
    projectile.behaviorType === 'sukuna_furnace'
  );
}

export function shouldSkipProjectileTarget(projectile, fighter, fighterIndex, isIllusion, fighters, stateRef, isSameTeam) {
  if (!fighter || fighter.isAmbushing) return true;

  const isFuga = isFugaProjectile(projectile);
  if (!isFuga && ((fighter.vanishTimer && fighter.vanishTimer > 0) || (fighter.invincibilityTimer && fighter.invincibilityTimer > 0))) return true;

  if (projectile.ownerFighter && projectile.ownerFighter === fighter) return true;
  if (typeof projectile.owner === 'number' && fighterIndex !== -1 && projectile.owner === fighterIndex) return true;
  if (isIllusion && fighter.owner && projectile.ownerFighter && fighter.owner === projectile.ownerFighter) return true;

  if (fighterIndex !== -1 && isSameTeam(projectile.owner, fighterIndex)) return true;
  if (isIllusion && fighter.owner) {
    const illusionOwnerIndex = typeof fighter.ownerIndex === 'number'
      ? fighter.ownerIndex
      : (fighters ? fighters.indexOf(fighter.owner) : -1);
    if (illusionOwnerIndex !== -1 && isSameTeam(projectile.owner, illusionOwnerIndex)) return true;
  }

  const isPlantProjectile = projectile.isPlantProjectile || projectile.visual === 'peaBullet' || projectile.visual === 'snowPeaBullet' || projectile.visual === 'firePeaBullet';
  const isMindControlledPlantProjectile = Boolean(projectile.ownerFighter?.isChainedByMakima && projectile.ownerFighter?.isMindControlledByMakima);
  const isMindControlledPlantTarget = Boolean(fighter.isChainedByMakima && fighter.isMindControlledByMakima);
  if (isPlantProjectile && !isMindControlledPlantProjectile && !isMindControlledPlantTarget && (fighter.isPlant || fighter.isPlantMinion || fighter === projectile.ownerFighter?.owner || fighter.characterId === 'crazydave')) return true;

  if (fighter.isPlant || fighter.isPlantMinion) {
    if (!isMindControlledPlantProjectile && !isMindControlledPlantTarget && projectile.ownerFighter && (projectile.ownerFighter === fighter.owner || projectile.ownerFighter.owner === fighter.owner || projectile.ownerFighter.isPlant || projectile.ownerFighter.characterId === 'crazydave')) return true;
  }

  if (projectile.hitFighters && projectile.hitFighters.has(fighter)) return true;
  if (fighter.isSubmerged || fighter.isErupting) return true;
  if (fighter.isLawnmower || fighter.isUntargetable || fighter.untargetable || fighter.cannotBeTargeted || fighter.isTargetable === false) return true;

  return false;
}