// ─────────────────────────────────────────────
// Layla — Cosmic Marksman Config
// ─────────────────────────────────────────────
export const laylaConfig = {
    // Ascending Power Passive
    maxStacks: 10,
    damagePerStack: 1.5,
    rangePerStack: 15,
    stackResetTime: 300, // 5 seconds at 60fps

    // Basic Attack
    attackCooldown: 70,
    aimThreshold: 0.12,
    baseRange: 300,

    // Malefic Bomb (Skill 1)
    maleficBombCooldown: 180, // 3 seconds at 60fps
    bombDamage: 20,
    bombSpeed: 5,
    bombRange: 250,
    bombSlowDuration: 90, // 1.5 seconds at 60fps
    bombSlowMultiplier: 0.6, // 40% slow

    // Void Dash (Skill 2)
    voidDashCooldown: 120, // 2 seconds at 60fps
    dashDistance: 80,
    dashDuration: 15,
    dashTrailDuration: 60, // 1 second at 60fps
    dashTrailDamage: 8,

    // Destruction Barrage (Ultimate)
    ultimateCooldown: 600, // 10 seconds at 60fps
    ultimateDuration: 120, // 2 seconds at 60fps
    ultimateDamageMultiplier: 1.5,
    ultimateRangeBonus: 200,
    ultimateFireRateMultiplier: 3.0,
};
