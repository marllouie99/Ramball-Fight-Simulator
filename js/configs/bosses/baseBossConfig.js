// ─────────────────────────────────────────────
// BASE BOSS CONFIGURATION
// Universal baseline parameters, multipliers, and phase thresholds
// ─────────────────────────────────────────────

export const baseBossConfig = {
  // ── Stat Multipliers ──
  defaultHp: 2000,
  hpMultiplier: 3.5,
  sizeMultiplier: 1.0,
  damageMultiplier: 1.25,
  speedMultiplier: 1.05,

  // ── Entrance Timing ──
  entranceDurationFrames: 110,       // ~1.83s entrance cutscene duration (at 60 FPS)
  entranceCameraZoom: 1.30,          // Camera zoom factor focused on Boss
};
