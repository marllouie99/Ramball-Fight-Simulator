// ─────────────────────────────────────────────
// SUKUNA BOSS ABILITIES
// Boss enhancements: Hexagonal Dismantle Flurry, Enhanced Fuga Firestorm
// ─────────────────────────────────────────────

import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';

export class SukunaBossAbilities {
  static triggerHexagonalDismantle(boss, config) {
    if (!boss || boss.hp <= 0) return;
    const count = config?.phase2BurstCount || 6;
    const speed = 28;
    const damage = Math.round((config?.slashDamage || 24) * 1.25);
    const color = config?.enrageAuraColor || '#7F1D1D';

    spawnImpactFlash(boss.x, boss.y, boss.r * 2.2, color);
    spawnSparks(boss.x, boss.y, 16, color, 8);

    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * step + (boss.gunAngle || 0);
      const spawnX = boss.x + Math.cos(angle) * (boss.r + 10);
      const spawnY = boss.y + Math.sin(angle) * (boss.r + 10);

      projectileSystem.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6,
        damage,
        color,
        owner: boss,
        type: 'slash',
        life: 70
      });
    }
  }

  static update(boss, dt, config) {
    if (!boss || !boss.isBoss || boss.hp <= 0) return;
    if (boss.bossState?.phase >= 2) {
      boss._hexDismantleTimer = (boss._hexDismantleTimer || 0) + 1;
      const interval = config?.phase2BurstInterval || 220;
      if (boss._hexDismantleTimer >= interval) {
        boss._hexDismantleTimer = 0;
        this.triggerHexagonalDismantle(boss, config);
      }
    }
  }
}
