// ─────────────────────────────────────────────
// MAHITO CHARACTER CONFIGURATION
// ─────────────────────────────────────────────

export const mahitoConfig = {
  // Base Stats
  hp: 230,
  damage: 16,
  moveSpeed: 6.8,
  punchRange: 65,
  punchSpeed: 16,
  basicPunchCooldown: 22,
  
  // Theme Colors
  themeColor: '#00A8CC',
  skinColor: '#E2E8F0',       // Sickly pale cursed spirit skin
  hairColor: '#7B9EAF',       // Grey-blue long hair
  hairDarkColor: '#537B8E',
  tunicColor: '#151922',      // Dark sleeveless tunic
  tunicTrimColor: '#2B3245',
  stitchColor: '#1F2937',     // Surgical suture stitches
  
  // Soul / Defense Mechanics
  soulDurabilityReduction: 0.25, // 25% passive damage reduction vs regular attacks
  
  // Transformation: Instant Spirit Body of Distorted Killing (ISBoDK)
  transformation: {
    duration: 600,            // 10 seconds active duration
    cooldown: 1200,           // 20 seconds cooldown
    defenseMultiplier: 0.50,  // Takes 50% less damage (high armor)
    damageMultiplier: 1.60,   // +60% attack power
    moveSpeedMultiplier: 0.70,// -30% movement speed penalty
    
    // Transformed Visual Palette
    carapaceColor: '#0E1322',
    carapaceHighlight: '#1E293B',
    bladeColor: '#00E5FF',
    bladeEdgeColor: '#E0F7FA',
    eyeGlowColor: '#00F0FF',
  },

  // Sound placeholders
  punchSound: 'Assets/Sound Effects/Attacks/punch.mp3',
  punchVolume: 2.0,
};
