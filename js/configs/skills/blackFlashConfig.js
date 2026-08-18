export const blackFlashConfig = {
  // Audio configuration & volume tuning
  audio: {
    volume: 0.09,                   // Master Black Flash impact SFX volume (0.0 to 3.0+)
    electricVolume: 1.0,           // Secondary cursed lightning / crackle SFX volume
    src: 'Assets/Sound Effects/Skills/blackflash1.mp3',
    src2: 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3'
  },
  // Global Black Flash tuning configurations
  debuff: {
    slowDuration: 70,              // Duration of hit slow in frames (~1.17s)
    slowMultiplier: 0.45,          // Speed multiplier during slow (55% slow)
    healReductionDuration: 270,    // Duration of heal reduction in frames (~4.5s)
    healReductionMultiplier: 0.5,  // Healing received multiplier (50% reduction)
  },
  zone: {
    duration: 300,                 // Duration of the "Zone" state in frames (5.0s)
    speedMultiplier: 1.50,         // Movement speed multiplier inside "The Zone" (120% potential)
    cooldownDecayMultiplier: 1.20, // Skill cooldown recovery speed multiplier inside "The Zone"
  }
};
