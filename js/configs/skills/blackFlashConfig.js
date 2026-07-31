export const blackFlashConfig = {
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
