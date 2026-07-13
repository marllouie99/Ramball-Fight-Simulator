// ─────────────────────────────────────────────
// SKILL EFFECT SOUND EFFECTS CONFIG
// ─────────────────────────────────────────────
// Configure sound effects triggered during specific fighter states
// that aren't basic attacks or full skill activations.
// (e.g., a reload animation, a parry, a charge-up)
//
// Each entry supports:
//   - src:    Path to the sound file (relative to project root)
//   - volume: Playback volume (0.0 – 1.0)
//   - speed:  Playback speed multiplier (e.g., 1.0 is normal, 1.2 is 20% faster)

export const SKILL_EFFECT_SOUNDS = {
  // ── Gun Slinger ─────────────────────────────
  // Pistol reload when the magazine runs out.
  gunslinger: {
    reload: {
      src: 'Assets/Sound Effects/SkillEffects/pistolreload.mp3',
      volume: 0.6,
      speed: 1.0,
    },
  },

  // ── Crimson Sniper ────────────────────────
  crimsonsniper: {
    reload: {
      src: 'Assets/Sound Effects/SkillEffects/energyreloading.mp3',
      volume: 0.8,
      speed: 1.2, // You can adjust this to make the reload sound faster/slower!
    },
  },

  // ── Alchemist / Grenadier ─────────────────
  // Plays when a fighter gets hit by poison AOE.
  alchemist: {
    poisonsizzle: {
      src: 'Assets/Sound Effects/SkillEffects/poisonsizzle.mp3',
      volume: 0.6,
    },
  },

  // ── Solar Champion ──────────────────────────
  solarchampion: {
    lasercharge: {
      src: 'Assets/Sound Effects/SkillEffects/lasercharge.mp3',
      volume: 0.6,
    },
  },
};

/**
 * Get the sound config for a fighter's specific skill effect.
 * @param {string} fighterName - Fighter name or type (e.g. 'Gun Slinger')
 * @param {string} effectName - Name of the effect (e.g. 'reload')
 * @returns {{ src: string, volume: number, speed?: number } | null}
 */
export function getSkillEffectSound(fighterName, effectName) {
  const lowerName = String(fighterName || '').toLowerCase().replace(/\s+/g, '');
  const lowerEffect = String(effectName || '').toLowerCase();

  const fighterConfig = SKILL_EFFECT_SOUNDS[lowerName];
  if (!fighterConfig) return null;

  return fighterConfig[lowerEffect] || null;
}

/**
 * Get all skill effect sound file paths for preloading.
 * @returns {string[]}
 */
export function getSkillEffectSoundPaths() {
  const paths = [];
  for (const fighter of Object.values(SKILL_EFFECT_SOUNDS)) {
    for (const effect of Object.values(fighter)) {
      if (effect && effect.src) {
        paths.push(effect.src);
      }
    }
  }
  return paths;
}
