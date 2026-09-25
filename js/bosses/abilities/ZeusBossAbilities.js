// ─────────────────────────────────────────────
// ZEUS BOSS ABILITIES
// Boss enhancements: 8-way Radial Lightning Burst, High-Velocity Chain Bolts, Enraged Storm
// ─────────────────────────────────────────────

import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { state } from '../../core/state.js';

export class ZeusBossAbilities {
  /**
   * Discharges an omnidirectional radial starburst of 8 thunderbolts during Phase 2
   */
  static triggerRadialLightningBurst(boss, config) {
    if (!boss || boss.hp <= 0 || !boss.arena) return;

    const count = config?.phase2BurstCount || 8;
    const speed = (config?.lightningSpeed || 30) * 0.85;
    const damage = Math.round((config?.lightningDamage || 20) * (config?.phase2DamageMultiplier || 1.35));
    const boltColor = config?.enrageAuraColor || '#A855F7';

    spawnSparks(boss.x, boss.y, 20, boltColor, 10);

    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * step + (boss.gunAngle || 0);
      const spawnX = boss.x + Math.cos(angle) * (boss.r + 14);
      const spawnY = boss.y + Math.sin(angle) * (boss.r + 14);

      projectileSystem.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 7,
        damage,
        color: boltColor,
        owner: boss,
        type: 'zeusLightning',
        life: 80,
        chainCount: 3,
        chainRange: 180,
        chainDamageMultiplier: 0.8
      });
    }
  }

  /**
   * Updates Zeus-specific boss cooldowns and Phase 2 triggers
   */
  static update(boss, dt, config) {
    if (!boss || !boss.isBoss || boss.hp <= 0) return;

    if (boss.bossState?.phase >= 2) {
      boss._radialBurstTimer = (boss._radialBurstTimer || 0) + 1;
      const interval = config?.phase2BurstInterval || 240;
      if (boss._radialBurstTimer >= interval) {
        boss._radialBurstTimer = 0;
        this.triggerRadialLightningBurst(boss, config);
      }
    }
  }
}
