/**
 * Special Interaction Configuration: Nameless Deity vs Saitama
 * Contains all dedicated tuning and parameters for the Deity vs Saitama interaction.
 */
export const deitySaitamaConfig = {
  // ── Master Toggle ──
  enabled: true,                            // Master toggle: Enable/disable the Deity vs Saitama special interaction

  // ── Nameless Deity Mechanics ──
  enableCenterRebounce: true,             // Enable Nameless Deity center arena rebounce on ultimate cast
  centerRebounceFrames: 18,               // Frames for Nameless Deity's glide to arena center on ultimate cast
  centerArrivalFlashRadius: 30,           // Radius of the impact burst on reaching center
  disableCameraZoomOut: true,             // Disable camera zoom out during ultimate channeling when facing Saitama

  // ── Saitama Mechanics ──
  enableStandoffRetreat: true,            // Enable Saitama's standoff retreat teleport vs Nameless Deity
  retreatStandoffDistance: 300,           // Distance (px) Saitama teleports AWAY from Deity when executing Serious Skill Counter
  retreatAfterimageSteps: 3,              // Number of afterimages spawned along the retreat displacement path
  retreatAfterimageDuration: 12,          // Frame lifetime for retreat afterimages
  beamSuperArmor: true,                   // Serious Skill Counter cannot be interrupted or cancelled by Nameless Destroyer beam
  enableBeamDodge: true,                  // Enable Saitama dodging out of the Nameless Destroyer super-beam
};
