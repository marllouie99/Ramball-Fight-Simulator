import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

export class GojoBlueBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const pullRadius = CONFIG.gojo?.blueRadius || 90;
    const ownerTeam = state.getFighterTeam ? state.getFighterTeam(p.owner) : null;
    for (let fi = 0; fi < fighters.length; fi++) {
      if (fi === p.owner) continue;
      const f = fighters[fi];
      if (!f || f.hp <= 0) continue;
      
      const isEnemy = ownerTeam === null || (state.getFighterTeam ? state.getFighterTeam(fi) !== ownerTeam : true);
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
          f.vx = f.vx * 0.4 + p.vx * dragSpeed;
          f.vy = f.vy * 0.4 + p.vy * dragSpeed;
        }
      }
    }
    return false; // Continue with standard movement & hit checks
  }
}
