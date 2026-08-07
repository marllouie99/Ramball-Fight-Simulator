// ─────────────────────────────────────────────
// Aoi Todo — Boogie Woogie Brawler Config
// ─────────────────────────────────────────────
export const todoConfig = {
    // Basic Combat
    punchDamage: 15,              // Base damage per melee punch strike
    knockback: 6,                 // Moderate knockback impulse applied on hit
    punchSpeed: 22,               // Animation frames for a smooth punch
    punchRange: 60,               // Additional melee reach distance for reliable basic attacks
    basicPunchCooldown: 20,       // Cooldown in frames between basic punches while waiting for skill sequence (~0.33s)

    // Skill 1: Boogie Woogie (Clap Teleport)
    clapCooldown: 60,             // Cooldown in frames between manual Boogie Woogie claps (1.0 second at 60fps)
    blackFlashWindow: 45,         // Window in frames after swapping where next punch triggers Black Flash (0.75 seconds)
    disengageDistance: 180,       // Distance teleported away when clapping to take a breather after combo
    disengageDelayFrames: 18,     // Delay in frames after final punch before Todo claps away for breather (~0.3s pause)

    // Skill 2: Cursed Rock & Sequence Tuning
    maxRocks: 1,                  // Maximum active rocks allowed in arena at any time
    rockCooldown: 300,            // Base cooldown in frames between rock sequence attempts (5.0 seconds at 60fps)
    sequenceCooldown: 300,        // Cooldown in frames after completing a combo disengage before starting next sequence (5.0s)
    rockSpeed: 12,                // Velocity of hurled cursed rock
    rockDamage: 12,               // Impact damage if rock directly hits target
    rockLife: 240,                // Lifetime in frames that rock continues bouncing in arena (4.0 seconds)

    // Rock Proximity Counter-Attack Sequence
    rockProximityTriggerDist: 75, // Distance threshold between rock and enemy that triggers auto-clap teleport
    rockCounterComboHits: 7,      // Number of rapid punches delivered upon teleporting in
    rockCounterComboInterval: 10, // Frames between combo punches during the attack sequence
    slowDuration: 60,             // Duration in frames enemy is heavily slowed when Todo teleports to them (1.0 second)
    slowMultiplier: 0.25,         // Speed multiplier during slow (0.25 = 75% movement slow)
    hitStunFrames: 20,            // Hitstun frames applied to enemy on arrival

    // Audio Sound Effects Configuration (Configurable via Assets/Sound Effects folder)
    punchSound: 'Assets/Sound Effects/Attacks/punch.mp3', // Gojo's punch attack sound effect
    punchVolume: 2.8,
};
