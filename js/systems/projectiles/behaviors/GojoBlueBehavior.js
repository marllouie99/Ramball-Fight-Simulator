import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

export class GojoBlueBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const pullRadius = p.pullRadius || CONFIG.gojo?.blueRadius || 50;
    const ownerFighter = fighters[p.owner];
    const ownerTeam = state.getFighterTeam ? state.getFighterTeam(p.owner) : null;

    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || []),
      ...(state.cjDriveBys || [])
    ];

    for (let i = 0; i < allTargets.length; i++) {
      const f = allTargets[i];
      if (!f || f.hp <= 0 || f.dead) continue;
      if (f === ownerFighter || (f.owner && f.owner === ownerFighter)) continue;

      let isEnemy = true;
      if (ownerTeam !== null) {
        const checkFighter = f.owner || f;
        const fi = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
        if (fi !== -1 && state.getFighterTeam) {
          isEnemy = state.getFighterTeam(fi) !== ownerTeam;
        }
      }

      if (isEnemy && !f.immuneToCC && !f.gojoBlueDragImmune) {
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pullRadius) {
          if (dist > 0) {
            const pullStrength = 3.5;
            const force = (pullRadius - dist) / pullRadius * pullStrength;
            f.x += (dx / dist) * force;
            f.y += (dy / dist) * force;
          }

          const dragSpeed = 0.55;
          f.vx = (f.vx || 0) * 0.4 + p.vx * dragSpeed;
          f.vy = (f.vy || 0) * 0.4 + p.vy * dragSpeed;
        }
      }
    }
    return false; // Continue with standard movement & hit checks
  }
}
