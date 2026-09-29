export function getSweptProjectileCollision(projectile, fighter, config, isFuga) {
  const isTactical = projectile.visual === 'tacticalBullet';
  const projRadius = isFuga
    ? Math.max(18, (projectile.r || 18) + 4)
    : (isTactical ? Math.max(9, (projectile.r || 5) + 3) : (projectile.r || (projectile.bulletRadius || 5)));
  const hitRadius = (fighter.r || 25) + projRadius;

  const segVx = projectile.vx || 0;
  const segVy = projectile.vy || 0;
  const prevX = projectile.x - segVx;
  const prevY = projectile.y - segVy;
  const segLenSq = segVx * segVx + segVy * segVy;

  const minX = Math.min(prevX, projectile.x) - hitRadius;
  const maxX = Math.max(prevX, projectile.x) + hitRadius;
  const minY = Math.min(prevY, projectile.y) - hitRadius;
  const maxY = Math.max(prevY, projectile.y) + hitRadius;
  if (fighter.x < minX || fighter.x > maxX || fighter.y < minY || fighter.y > maxY) return null;

  let distSq;
  let closestX = projectile.x;
  let closestY = projectile.y;
  if (segLenSq > 0.001) {
    const t = Math.max(0, Math.min(1, ((fighter.x - prevX) * segVx + (fighter.y - prevY) * segVy) / segLenSq));
    closestX = prevX + t * segVx;
    closestY = prevY + t * segVy;
    const cdx = fighter.x - closestX;
    const cdy = fighter.y - closestY;
    distSq = cdx * cdx + cdy * cdy;
  } else {
    const dx = fighter.x - projectile.x;
    const dy = fighter.y - projectile.y;
    distSq = dx * dx + dy * dy;
  }

  const hitRadiusSq = hitRadius * hitRadius;
  const proximityRadius = hitRadius + (config.darkslategray?.proximityTriggerRadius || 0);
  return {
    distSq,
    closestX,
    closestY,
    hitRadiusSq,
    proximityRadiusSq: proximityRadius * proximityRadius
  };
}