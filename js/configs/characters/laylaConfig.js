// ─────────────────────────────────────────────
// Layla — Cosmic Marksman Config
// ─────────────────────────────────────────────
export const laylaConfig = {
    // ── Base Attributes ──
    hp: 55,
    speed: 4.5,
    moveSpeed: 4.5,
    r: 25,
    radius: 25,
    color: '#00E5FF', // Blue Cosmic Theme
    themeColor: '#00E5FF',
    startX: 300,
    startY: 250,
    startVx: 1.1,
    startVy: 0.9,
    damage: 12,
    cooldown: 70,
    projectileSpeedMultiplier: 3.0,
    ability: 'Ascending Power',
    desc: 'Scaling marksman who gains damage and range with each hit. Uses Malefic Bomb, Void Dash, and Destruction Barrage ultimate.',

    // Ascending Power Passive
    maxStacks: 10,
    damagePerStack: 1.5,
    stackResetTime: 300, // 5 seconds at 60fps

    // Basic Attack
    attackCooldown: 70,
    aimThreshold: 0.12,
    baseRange: 300,

    // Malefic Bomb (Skill 1)
    maleficBombCooldown: 200, // 3 seconds at 60fps
    bombDamage: 20,
    bombSpeed: 12,
    bombRange: 250,
    bombSlowDuration: 90, // 1.5 seconds at 60fps
    bombSlowMultiplier: 0.4, // Speed multiplier (0.4 = 60% slow, values > 1.0 will speed up target)
    bombHitSpeedBoostDuration: 90, // 1.5s duration for Layla's speed boost on hit
    bombHitSpeedBoostMultiplier: 2.0, // 60% speed increase

    // Void Projectile (Skill 2)
    voidDashCooldown: 120, // Keep variable name for HUD/cooldown slot mapping, 2 seconds at 60fps
    voidProjectileDamage: 15,
    voidProjectileSpeed: 8,
    voidProjectileRange: 300,
    voidProjectileSlowDuration: 60, // 1 second
    voidProjectileSlowMultiplier: 0.7, // 30% slow
    voidMarkDuration: 180, // 3 seconds to detonate it
    voidMarkBonusDamage: 12, // Extra damage when detonating the mark
    voidMarkStunDuration: 15, // 0.25 second stun (15 frames)

    // Destruction Rush (Ultimate)
    ultimateCooldown: 600, // 10 seconds at 60fps
    ultimateLaserDamage: 80, // Massive burst damage
    ultimateLaserRange: 700, // Very long range
    ultimateLaserWidth: 60, // Wide beam
    ultimateLaserWindup: 45, // 0.75 second charge up
    ultimateLaserDuration: 20, // Beam lingers on screen for 1/3rd second
};
