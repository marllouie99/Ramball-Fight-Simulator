// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BASIC ATTACK SOUND EFFECTS CONFIG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Configure sound effects for each fighter's basic attack.
// Each entry supports:
//   - src:      Path to the sound file (relative to project root)
//   - volume:   Playback volume (0.0 â€“ 1.0)
//   - delay:    Frames to wait before playing the sound after the attack fires.
//               Use negative values to play the sound BEFORE the attack visually fires.
//               Use positive values to sync with projectile travel or impact.
//
// Example timing guide:
//   delay = -5  â†’ sound plays 5 frames BEFORE the attack fires
//   delay = 0   â†’ sound plays immediately when the attack fires
//   delay = 3   â†’ sound plays 3 frames AFTER the attack fires
//   delay = 10  â†’ sound plays 10 frames after (good for syncing with projectile travel)

export const BASIC_ATTACK_SOUNDS = {
  // â”€â”€ Ranger (aimbot) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Fires a homing projectile. Sound plays slightly before the shot.
  2: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.6,
    delay: -2,
  },

  // â”€â”€ Sharpshooter (was Sharpshooter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Fires a fast, powerful shot when aim is aligned. Sound plays just before firing.
  1: {
    src: 'Assets/Sound Effects/Attacks/lasersniper1.mp3',
    volume: 0.9,
    delay: -3,
  },

  // â”€â”€ Spike (melee) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Contact damage melee attack. Sound plays on impact.
  3: {
    src: 'Assets/Sound Effects/Attacks/Spikestab.mp3',
    volume: 0.7,
    delay: 0,
  },

  // â”€â”€ Gun Slinger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Dual revolver shots. Sound plays on each shot.
  13: {
    src: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    volume: 0.5,
    delay: -2,
  },
  // â”€â”€ Solar Champion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Continuous laser beam while firing. Sound loops during the beam.
  5: {
    src: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
    volume: 0.6,
    delay: 0,
  },

  // â”€â”€ Flame Warden â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Continuous flamethrower while firing. Sound loops during the spray.
  9: {
    src: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    volume: 0.4,
    delay: -3,
  },

  // â”€â”€ Berserker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Melee attack with heavy impact. Sound plays on swing.
  10: {
    src: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    volume: 0.7,
    delay: 0,
  },

  // â”€â”€ Cronos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Energy sword melee attack. Sound plays on swing.
  11: {
    src: 'Assets/Sound Effects/Attacks/energysword.mp3',
    volume: 0.7,
    delay: 0,
  },

  // â”€â”€ Knight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Sword swipe melee attack. Sound plays on swing.
  6: {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },

  // â”€â”€ Bomber â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Explosive projectile attack. Sound plays on fire.
  12: {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: -2,
  },

  // â”€â”€ Ninja / Assassin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Throws a shuriken
  8: {
    src: 'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
    volume: 0.6,
    delay: -2,
  },

  // â”€â”€ Void Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Fires space shots
  7: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: -2,
  },

  // â”€â”€ Default fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Used when a fighter has no custom sound entry.
  default: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.5,
    delay: 0,
  },
};

/**
 * Sound config lookup by fighter type (case-insensitive).
 * Add entries here keyed by fighter def.type (e.g. 'berserker', 'machinegun').
 * This is checked as a fallback when BASIC_ATTACK_SOUNDS[id] has no entry.
 */
export const BASIC_ATTACK_SOUNDS_BY_TYPE = {
  // Example:
  // 'berserker': { src: '...', volume: 0.7, delay: 0 },
  // 'machinegun': { src: '...', volume: 0.5, delay: -2 },
};

/**
 * Get the sound config for a fighter.
 * Lookup order: numeric ID → fighter type (case-insensitive) → default.
 * Logs a dev warning when falling back to default so missing entries are visible.
 *
 * @param {number} id   - Fighter ID (from def.id)
 * @param {string} [type] - Fighter type (from def.type), optional but recommended
 * @returns {{ src: string, volume: number, delay: number }}
 */
export function getBasicAttackSound(id, type) {
  // 1. Try numeric ID lookup
  if (id !== undefined && BASIC_ATTACK_SOUNDS[id] !== undefined) {
    return BASIC_ATTACK_SOUNDS[id];
  }

  // 2. Try fighter type lookup (case-insensitive)
  if (type !== undefined && type !== null) {
    const typeKey = String(type).toLowerCase();
    if (BASIC_ATTACK_SOUNDS_BY_TYPE[typeKey] !== undefined) {
      return BASIC_ATTACK_SOUNDS_BY_TYPE[typeKey];
    }
  }

  // 3. Fall back to default — warn in dev so it's easy to spot missing entries
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      `[SoundSystem] No basic-attack sound for fighter id=${id}, type="${type}". ` +
      `Using default. Add an entry to BASIC_ATTACK_SOUNDS (by id) or ` +
      `BASIC_ATTACK_SOUNDS_BY_TYPE (by type) in js/soundEffects/basicAttackSounds.js.`
    );
  }

  return BASIC_ATTACK_SOUNDS.default;
}

/**
 * Get all sound file paths for preloading.
 * @returns {string[]}
 */
export function getBasicAttackSoundPaths() {
  return Object.values(BASIC_ATTACK_SOUNDS)
    .filter((s) => s !== BASIC_ATTACK_SOUNDS.default)
    .map((s) => s.src);
}
