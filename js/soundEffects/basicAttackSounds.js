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
  // ── Ranger (aimbot) ──────────────────────────
  // Fires a homing projectile. Sound plays slightly before the shot.
  ranger: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Crimson Sniper ──────────────────────────
  // Fires a fast, powerful shot when aim is aligned. Sound plays just before firing.
  crimsonSniper: {
    src: 'Assets/Sound Effects/Attacks/lasersniper1.mp3',
    volume: 0.6,
    delay: -3,
  },

  // ── Spike (melee) ───────────────────────────
  // Contact damage melee attack. Sound plays on impact.
  spike: {
    src: 'Assets/Sound Effects/Attacks/Spikestab.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Gun Slinger ────────────────────────────
  // Dual revolver shots. Sound plays on each shot.
  gunSlinger: {
    src: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    volume: 0.5,
    delay: -2,
  },
  // ── Ivory ────────────────────────────────
  // Continuous laser beam while firing. Sound loops during the beam.
  solarChampion: {
    src: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
    volume: 0.6,
    delay: 0,
  },

  // ── Flame Warden ─────────────────────────
  // Continuous flamethrower while firing. Sound loops during the spray.
  flameWarden: {
    src: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    volume: 0.4,
    delay: -3,
  },

  // ── Berserker ─────────────────────────────
  // Melee attack with heavy impact. Sound plays on swing.
  berserker: {
    src: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Cronos ─────────────────────────────────
  // Energy sword melee attack. Sound plays on swing.
  cronos: {
    src: 'Assets/Sound Effects/Attacks/energysword.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Knight ─────────────────────────────────
  // Sword swipe melee attack. Sound plays on swing.
  knight: {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Bomber ─────────────────────────────────
  // Explosive projectile attack. Sound plays on fire.
  bomber: {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Ninja / Assassin ───────────────────────
  // Throws a shuriken
  ninja: {
    src: 'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Void Master ────────────────────────────
  // Fires space shots
  voidmaster: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: -2,
  },

  // ── Default fallback ─────────────────────────
  // Used when a fighter has no custom sound entry.
  default: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.5,
    delay: 0,
  },
};

/**
 * Get the sound config for a fighter by name or type.
 * Falls back to 'default' if no match is found.
 * @param {string} name - Fighter name (e.g. 'Ranger', 'Crimson Sniper')
 * @param {string} [type] - Optional fighter type
 * @returns {{ src: string, volume: number, delay: number }}
 */
export function getBasicAttackSound(name, type) {
  const lowerName = (name || '').toLowerCase().replace(/\s+/g, '');

  // Try exact name match (ignoring spaces and case)
  const nameKey = Object.keys(BASIC_ATTACK_SOUNDS).find(
    (key) => key !== 'default' && lowerName === key.toLowerCase()
  );
  if (nameKey) return BASIC_ATTACK_SOUNDS[nameKey];

  // Try type match
  if (type && BASIC_ATTACK_SOUNDS[type]) return BASIC_ATTACK_SOUNDS[type];

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