// ─────────────────────────────────────────────
// Mahoraga Adaptation Mapping Config
// Defines specific thresholds, rules, and immunities for
// Mahoraga's adaptation against specific fighters and attacks.
// ─────────────────────────────────────────────

export const mahoragaAdaptationConfig = {
  // ── GOJO SATORU ──
  gojo: {
    infinity: {
      requiredFreezes: 3, // Must be frozen by Limitless twice to adapt
      bypassesInfinity: true
    },
    red: { damageThresholdPct: 0.15, windowFrames: 400 },
    blue: { damageThresholdPct: 0.15, windowFrames: 400 },
    purple: { damageThresholdPct: 0.25, windowFrames: 600 }
  },

  // ── RYOMEN SUKUNA ──
  sukuna: {
    dismantle: { damageThresholdPct: 0.10, windowFrames: 300 },
    cleave: { damageThresholdPct: 0.15, windowFrames: 300 },
    divineFlame: { damageThresholdPct: 0.30, windowFrames: 600 } // Fire Arrow is extremely hard to adapt to
  },

  // ── TOJI FUSHIGURO ──
  toji: {
    isoh: { canAdapt: false }, // Inverted Spear of Heaven bypasses/cancels all adaptation!
    ssk: { damageThresholdPct: 0.15, windowFrames: 300 }, // Soul Split Katana
    flyhead: { damageThresholdPct: 0.05, windowFrames: 200 }
  },

  // ── YUTA OKKOTSU ──
  yuta: {
    rika: { damageThresholdPct: 0.10, windowFrames: 300 },
    loveBeam: { damageThresholdPct: 0.20, windowFrames: 400 },
    thinIceBreaker: { damageThresholdPct: 0.12, windowFrames: 300 }
  },

  // ── GENERIC FALLBACK ──
  default: {
    damageThresholdPct: 0.10, // Default 10% Max HP
    windowFrames: 300 // Default 5 seconds
  }
};
