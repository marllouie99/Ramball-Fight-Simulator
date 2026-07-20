// ─────────────────────────────────────────────
// BASIC ATTACK SOUND EFFECTS CONFIG
// ─────────────────────────────────────────────
// Configure sound effects for each fighter's basic attack.
// Each entry supports:
//   - src:      Path to the sound file (relative to project root)
//   - volume:   Playback volume (0.0 – 1.0)
//   - delay:    Frames to wait before playing the sound after the attack fires.
//               Use negative values to play the sound BEFORE the attack visually fires.
//               Use positive values to sync with projectile travel or impact.
//
// Example timing guide:
//   delay = -5  → sound plays 5 frames BEFORE the attack fires
//   delay = 0   → sound plays immediately when the attack fires
//   delay = 3   → sound plays 3 frames AFTER the attack fires
//   delay = 10  → sound plays 10 frames after (good for syncing with projectile travel)

export const BASIC_ATTACK_SOUNDS = {
  // ── Ranger (aimbot/Jazz) ──────────────────────────
  // Fires a homing projectile. Uses dubstep gun notes sequentially.
  2: {
    src: [
      'Assets/Sound Effects/Attacks/do.mp3',
      'Assets/Sound Effects/Attacks/ri.mp3',
      'Assets/Sound Effects/Attacks/mi.mp3',
      'Assets/Sound Effects/Attacks/fa.mp3',
      'Assets/Sound Effects/Attacks/so.mp3'
    ],
    volume: 0.8,
    delay: -2,
  },

  // ── Sharpshooter (was Sharpshooter) ──────────────────────────
  // Fires a fast, powerful shot when aim is aligned. Sound plays just before firing.
  1: {
    src: 'Assets/Sound Effects/Attacks/lasersniper1.mp3',
    volume: 1.1,
    delay: -3,
  },

  // ── Spike (melee) ───────────────────────────
  // Contact damage melee attack. Sound plays on impact.
  3: {
    src: 'Assets/Sound Effects/Attacks/Spikestab.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Gun Slinger ────────────────────────────
  // Dual revolver shots. Sound plays on each shot.
  13: {
    src: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    volume: 0.5,
    delay: -2,
  },
  // ── Solar Champion ────────────────────────────────
  // Continuous laser beam while firing. Sound loops during the beam.
  5: {
    src: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
    volume: 0.6,
    delay: 0,
  },

  // ── Flame Warden ─────────────────────────
  // Continuous flamethrower while firing. Sound loops during the spray.
  9: {
    src: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    volume: 0.4,
    delay: -3,
  },

  // ── Berserker ─────────────────────────────
  // Melee attack with heavy impact. Sound plays on swing.
  10: {
    src: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Cronos ─────────────────────────────────
  // Energy sword melee attack. Sound plays on swing.
  11: {
    src: 'Assets/Sound Effects/Attacks/energysword.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Knight ─────────────────────────────────
  // Sword swipe melee attack. Sound plays on swing.
  6: {
    src: 'Assets/Sound Effects/Attacks/energysword2.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Bomber ─────────────────────────────────
  // Explosive projectile attack. Sound plays on fire.
  12: {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Engineer ───────────────────────────────
  // Shotgun blast.
  15: {
    src: 'Assets/Sound Effects/Attacks/shootgunshot.mp3',
    volume: 1.1,
    delay: 0,
  },

  // ── Turret ─────────────────────────────────
  // Turret shot.
  999: {
    src: 'Assets/Sound Effects/Skills/turretshot.mp3',
    volume: 0.01,
    delay: 0,
  },

  // ── Ninja / Assassin ───────────────────────
  // Throws a shuriken
  8: {
    src: 'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Void Master ────────────────────────────
  // Fires space shots
  7: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: -2,
  },



  // ── Doppleganger ───────────────────────────
  14: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3', // Ethereal/phantom sword slash
    volume: 0.5,
    delay: 0,
  },

  // ── Ruby ─────────────────────────────────────
  // Scythe melee attack
  16: {
    src: 'Assets/Sound Effects/Attacks/syctheattack.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Trickster ────────────────────────────────
  // Arcane bolt
  18: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: -1,
  },

  // ── Default fallback ─────────────────────────
  // Used when a fighter has no custom sound entry.
  default: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.5,
    delay: 0,
  },
  trickster: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.6,
    delay: 0,
    pitchVariation: 0.1
  },

  // ── Musashi ──────────────────────────
  musashi: {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.6,
    delay: 0,
  },

  // ── Zeus ─────────────────────────────
  zeus: {
    src: 'Assets/Sound Effects/Attacks/thunderstike.mp3',
    volume: 0.65,
    delay: 0,
    pitchVariation: 0.15
  }
};

/**
 * Sound config lookup by fighter type (case-insensitive).
 * Add entries here keyed by fighter def.type (e.g. 'berserker', 'Engineer').
 * This is checked as a fallback when BASIC_ATTACK_SOUNDS[id] has no entry.
 */
export const BASIC_ATTACK_SOUNDS_BY_TYPE = {
  // Engineer � high-rate-of-fire automatic weapon
  'Engineer': {
    src: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    volume: 0.45,
    delay: -1,
  },
  // Gojo — Blue Orbs & Melee punches
  'gojo': {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: 0,
  },
  'gojo_melee': {
    src: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    volume: 0.8,
    delay: 0,
  },
  // Zeus — chain lightning attack
  'zeus': {
    src: 'Assets/Sound Effects/Attacks/thunderstike.mp3',
    volume: 0.65,
    delay: 0,
    pitchVariation: 0.15
  },};

/**
 * Get the sound config for a fighter.
 * Lookup order: numeric ID ? fighter type (case-insensitive) ? default.
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

  // 3. Fall back to default � warn in dev so it's easy to spot missing entries
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
  const paths = [];
  Object.values(BASIC_ATTACK_SOUNDS)
    .filter((s) => s !== BASIC_ATTACK_SOUNDS.default)
    .forEach((s) => {
      if (Array.isArray(s.src)) {
        paths.push(...s.src);
      } else {
        paths.push(s.src);
      }
    });
  return paths;
}

