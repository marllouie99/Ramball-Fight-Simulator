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

import { CONFIG } from '../core/config.js';

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
    volume: 0.45,
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

  // ── Rubbick ────────────────────────────────
  // Arcane bolt
  18: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: -1,
  },

  // ── Default fallback ─────────────────────────
  // Used when a fighter has no custom sound entry.
  // ── John Wick ─────────────────────────────
  33: {
    src: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
    volume: 0.45,
    delay: 0,
  },
  default: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.5,
    delay: 0,
  },
  rubbick: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.6,
    delay: 0,
    pitchVariation: 0.1
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
    delay: -0.10,
    pitchVariation: 0.15
  },

  // ── Sukuna (ID 22) ───────────────────
  22: {
    get src() {
      return [
        CONFIG.sukuna?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3',
        CONFIG.sukuna?.sounds?.fleshSlice || 'Assets/Sound Effects/Skills/backstab.mp3'
      ];
    },
    get volume() {
      return CONFIG.sukuna?.soundVolumes?.swordSwing !== undefined ? CONFIG.sukuna.soundVolumes.swordSwing : 0.50;
    },
    get delay() {
      return CONFIG.sukuna?.soundDelays?.swordSwing || 0;
    }
  },

  // ── Yuta (ID 23) ─────────────────────
  23: {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Gojo (ID 21) ─────────────────────
  21: {
    get src() {
      return CONFIG.gojo?.sounds?.blueOrb || 'Assets/Sound Effects/Attacks/spaceshot.mp3';
    },
    get volume() {
      return CONFIG.gojo?.soundVolumes?.blueOrb !== undefined ? CONFIG.gojo.soundVolumes.blueOrb : 0.35;
    },
    get delay() {
      return CONFIG.gojo?.soundDelays?.blueOrb || 0;
    }
  },

  // ── Layla (ID 26) ────────────────────
  26: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.45,
    delay: 0,
  },

  // ── Genos (ID 28) ────────────────────
  28: {
    get src() {
      return CONFIG.genos?.basicBlastSound || 'Assets/Sound Effects/Attacks/genos-range-attack.mp3';
    },
    get volume() {
      return CONFIG.genos?.basicBlastVolume !== undefined ? CONFIG.genos.basicBlastVolume : 0.9;
    },
    delay: 0,
  },

  // ── Ichigo (ID 29) ───────────────────
  29: {
    get src() {
      return CONFIG.ichigo?.sounds?.getsugaSlash || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.ichigo?.soundVolumes?.getsugaSlash !== undefined ? CONFIG.ichigo.soundVolumes.getsugaSlash : 0.75;
    },
    delay: 0,
  },

  // ── Mahito (ID 30) ───────────────────
  30: {
    get src() {
      return CONFIG.mahito?.sounds?.punch || 'Assets/Sound Effects/Attacks/punch.mp3';
    },
    get volume() {
      return CONFIG.mahito?.soundVolumes?.punch !== undefined ? CONFIG.mahito.soundVolumes.punch : 1.0;
    },
    delay: 0,
  },

  // ── Nanami (ID 31) ───────────────────
  31: {
    get src() {
      return CONFIG.nanami?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.nanami?.soundVolumes?.swordSwing !== undefined ? CONFIG.nanami.soundVolumes.swordSwing : 0.75;
    },
    delay: 0,
  },

  // ── Nobara (ID 32) ───────────────────
  32: {
    get src() {
      return CONFIG.nobara?.sounds?.nailThrow || 'Assets/Sound Effects/Skills/hammer.mp3';
    },
    get volume() {
      return CONFIG.nobara?.soundVolumes?.nailThrow !== undefined ? CONFIG.nobara.soundVolumes.nailThrow : 0.7;
    },
    delay: 0,
  },

  // ── Carl "CJ" Johnson (ID 34) ─────────
  34: {
    get src() {
      return CONFIG.cj?.sounds?.punchHit || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
    },
    get volume() {
      return CONFIG.cj?.soundVolumes?.punchHit !== undefined ? CONFIG.cj.soundVolumes.punchHit : 0.8;
    },
    delay: 0,
  },

  // ── Uryu / Ishida (ID 36) ─────────────
  36: {
    get src() {
      return CONFIG.uryu?.sounds?.arrowShoot || 'Assets/Sound Effects/Attacks/laserpew.mp3';
    },
    get volume() {
      return CONFIG.uryu?.soundVolumes?.arrowShoot !== undefined ? CONFIG.uryu.soundVolumes.arrowShoot : 0.65;
    },
    delay: 0,
  },

  // ── Ulquiorra (ID 37) ─────────────────
  37: {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.65,
    delay: 0,
  },

  // ── Makima (ID 38) ────────────────────
  38: {
    src: 'Assets/Sound Effects/Attacks/desert-eagle-fire.mp3',
    volume: 0.75,
    delay: 0,
  },

  // ── Reze (ID 39) ──────────────────────
  39: {
    get src() {
      return CONFIG.reze?.sounds?.spark || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
    },
    get volume() {
      return CONFIG.reze?.soundVolumes?.spark !== undefined ? CONFIG.reze.soundVolumes.spark : 0.75;
    },
    delay: 0,
  },

  // ── Toji (ID 99) ──────────────────────
  99: {
    get src() {
      return CONFIG.toji?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.toji?.soundVolumes?.swordSwing !== undefined ? CONFIG.toji.soundVolumes.swordSwing : 0.8;
    },
    delay: 0,
  },

  // ── Circe / Grenadier (ID 4) ──────────
  4: {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: 0,
  },

  // ── Musashi (ID 17) ───────────────────
  17: {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },

  // ── Hydra (ID 20) ─────────────────────
  20: {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: 0,
  }
};

/**
 * Sound config lookup by fighter type (case-insensitive).
 * Add entries here keyed by fighter def.type (e.g. 'berserker', 'Engineer').
 * This is checked as a fallback when BASIC_ATTACK_SOUNDS[id] has no entry.
 */
export const BASIC_ATTACK_SOUNDS_BY_TYPE = {
  // Carl "CJ" Johnson — Street Boxing Brass Knuckles
  'cj': {
    get src() {
      return CONFIG.cj?.sounds?.punchHit || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
    },
    get volume() {
      return CONFIG.cj?.soundVolumes?.punchHit !== undefined ? CONFIG.cj.soundVolumes.punchHit : 0.8;
    },
    delay: 0,
  },
  'cj_punch': {
    get src() {
      return CONFIG.cj?.sounds?.punchHit || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
    },
    get volume() {
      return CONFIG.cj?.soundVolumes?.punchHit !== undefined ? CONFIG.cj.soundVolumes.punchHit : 0.8;
    },
    delay: 0,
  },
  // Engineer — high-rate-of-fire automatic weapon
  'Engineer': {
    src: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    volume: 0.35,
    delay: -1,
  },
  'engineer_melee': {
    src: 'Assets/Sound Effects/Skills/hammer.mp3',
    volume: 0.45,
    delay: 0,
  },
  // Turret — Turret shot
  'turret': {
    src: 'Assets/Sound Effects/Skills/turretshot.mp3',
    volume: 0.01,
    delay: 0,
  },
  // Rubbick / Trickster — Arcane Bolt
  'rubbick': {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.65,
    delay: 0,
    pitchVariation: 0.1
  },
  'trickster': {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.65,
    delay: 0,
    pitchVariation: 0.1
  },
  // Gojo — Blue Orbs & Melee punches
  'gojo': {
    get src() {
      return CONFIG.gojo?.sounds?.blueOrb || 'Assets/Sound Effects/Attacks/spaceshot.mp3';
    },
    get volume() {
      return CONFIG.gojo?.soundVolumes?.blueOrb !== undefined ? CONFIG.gojo.soundVolumes.blueOrb : 0.35;
    },
    get delay() {
      return CONFIG.gojo?.soundDelays?.blueOrb || 0;
    }
  },
  'gojo_melee': {
    get src() {
      return CONFIG.gojo?.sounds?.meleePunch || 'Assets/Sound Effects/Attacks/punch.mp3';
    },
    get volume() {
      return CONFIG.gojo?.soundVolumes?.meleePunch !== undefined ? CONFIG.gojo.soundVolumes.meleePunch : 0.90;
    },
    get delay() {
      return CONFIG.gojo?.soundDelays?.meleePunch || 0;
    }
  },
  // Saitama — Caped Baldy martial punches (matches Gojo punch attack audio)
  'saitama': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.8,
    delay: 0,
  },
  'saitama_punch': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.8,
    delay: 0,
  },
  // Zeus — chain lightning attack
  'zeus': {
    src: 'Assets/Sound Effects/Attacks/thunderstike.mp3',
    volume: 0.65,
    delay: 0,
    pitchVariation: 0.15
  },
  // Yuta — Katana Slash
  'yuta': {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },
  // Megumi — Cursed Sword Chop
  'megumi': {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.75,
    delay: 0,
  },
  // Sukuna — Dismantle slashes & Melee punches
  'sukuna': {
    get src() {
      return [
        CONFIG.sukuna?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3',
        CONFIG.sukuna?.sounds?.fleshSlice || 'Assets/Sound Effects/Skills/backstab.mp3'
      ];
    },
    get volume() {
      return CONFIG.sukuna?.soundVolumes?.swordSwing !== undefined ? CONFIG.sukuna.soundVolumes.swordSwing : 0.50;
    },
    get delay() {
      return CONFIG.sukuna?.soundDelays?.swordSwing || 0;
    }
  },
  'sukuna_melee': {
    get src() {
      return CONFIG.sukuna?.sounds?.punch || 'Assets/Sound Effects/Attacks/punch.mp3';
    },
    get volume() {
      return CONFIG.sukuna?.soundVolumes?.punch !== undefined ? CONFIG.sukuna.soundVolumes.punch : 1.40;
    },
    get delay() {
      return CONFIG.sukuna?.soundDelays?.punch || 0;
    }
  },
  // Mahoraga — Heavy martial punches & rapid strikes
  'mahoraga': {
    get src() {
      return CONFIG.mahoraga?.sounds?.punchSounds || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
    },
    get volume() {
      return CONFIG.mahoraga?.soundVolumes?.punch !== undefined ? CONFIG.mahoraga.soundVolumes.punch : 1.0;
    },
    delay: 0,
  },
  'mahoraga_punch': {
    get src() {
      return CONFIG.mahoraga?.sounds?.punchSounds || [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
    },
    get volume() {
      return CONFIG.mahoraga?.soundVolumes?.punch !== undefined ? CONFIG.mahoraga.soundVolumes.punch : 1.0;
    },
    delay: 0,
  },
  // Todo — Brawler melee punches (uses Gojo punch attack audio)
  'todo': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.8,
    delay: 0,
  },
  'todo_punch': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.8,
    delay: 0,
  },
  'yuji': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.5,
    delay: 0,
  },
  'yuji_punch': {
    src: 'Assets/Sound Effects/Attacks/punch.mp3',
    volume: 2.5,
    delay: 0,
  },
  
  // Layla - Cosmic Marksman
  'layla': {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.45,
    delay: 0,
  },

  // John Wick - Tactical Gun-Fu Marksman
  'john_wick': {
    src: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
    volume: 0.45,
    delay: 0,
  },
  'johnwick': {
    src: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
    volume: 0.45,
    delay: 0,
  },

  // Genos — Incineration Palm Fireball Blasts & Melee Punches
  'genos': {
    get src() {
      return CONFIG.genos?.basicBlastSound || 'Assets/Sound Effects/Attacks/genos-range-attack.mp3';
    },
    get volume() {
      return CONFIG.genos?.basicBlastVolume !== undefined ? CONFIG.genos.basicBlastVolume : 0.9;
    },
    delay: 0,
  },
  'genos_melee': {
    get src() {
      return CONFIG.genos?.meleePunchSound || 'Assets/Sound Effects/Attacks/punch.mp3';
    },
    get volume() {
      return CONFIG.genos?.meleePunchVolume !== undefined ? CONFIG.genos.meleePunchVolume : 1.0;
    },
    delay: 0,
  },

  // Toji — ISOH & Split Soul Katana Slashes
  'toji': {
    get src() {
      return CONFIG.toji?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.toji?.soundVolumes?.swordSwing !== undefined ? CONFIG.toji.soundVolumes.swordSwing : 0.8;
    },
    delay: 0,
  },

  // Ichigo — Getsuga Slashes
  'ichigo': {
    get src() {
      return CONFIG.ichigo?.sounds?.getsugaSlash || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.ichigo?.soundVolumes?.getsugaSlash !== undefined ? CONFIG.ichigo.soundVolumes.getsugaSlash : 0.75;
    },
    delay: 0,
  },

  // Mahito — Idle Transfiguration & Brawler Punches
  'mahito': {
    get src() {
      return CONFIG.mahito?.sounds?.punch || 'Assets/Sound Effects/Attacks/punch.mp3';
    },
    get volume() {
      return CONFIG.mahito?.soundVolumes?.punch !== undefined ? CONFIG.mahito.soundVolumes.punch : 1.0;
    },
    delay: 0,
  },

  // Nanami — 7:3 Ratio Technique Cleaver Swings
  'nanami': {
    get src() {
      return CONFIG.nanami?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    },
    get volume() {
      return CONFIG.nanami?.soundVolumes?.swordSwing !== undefined ? CONFIG.nanami.soundVolumes.swordSwing : 0.75;
    },
    delay: 0,
  },

  // Nobara — Straw Doll Technique Nails
  'nobara': {
    get src() {
      return CONFIG.nobara?.sounds?.nailThrow || 'Assets/Sound Effects/Skills/hammer.mp3';
    },
    get volume() {
      return CONFIG.nobara?.soundVolumes?.nailThrow !== undefined ? CONFIG.nobara.soundVolumes.nailThrow : 0.7;
    },
    delay: 0,
  },

  // Uryu / Ishida — Heilig Bogen Sacred Bow
  'uryu': {
    get src() {
      return CONFIG.uryu?.sounds?.arrowShoot || 'Assets/Sound Effects/Attacks/laserpew.mp3';
    },
    get volume() {
      return CONFIG.uryu?.soundVolumes?.arrowShoot !== undefined ? CONFIG.uryu.soundVolumes.arrowShoot : 0.65;
    },
    delay: 0,
  },
  'ishida': {
    get src() {
      return CONFIG.uryu?.sounds?.arrowShoot || 'Assets/Sound Effects/Attacks/laserpew.mp3';
    },
    get volume() {
      return CONFIG.uryu?.soundVolumes?.arrowShoot !== undefined ? CONFIG.uryu.soundVolumes.arrowShoot : 0.65;
    },
    delay: 0,
  },

  // Reze — Bomb Devil Explosive Spark Punches
  'reze': {
    get src() {
      return CONFIG.reze?.sounds?.spark || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
    },
    get volume() {
      return CONFIG.reze?.soundVolumes?.spark !== undefined ? CONFIG.reze.soundVolumes.spark : 0.75;
    },
    delay: 0,
  },

  // Makima - The Control Devil ("Bang!")
  'makima': {
    src: 'Assets/Sound Effects/Attacks/desert-eagle-fire.mp3',
    volume: 0.75,
    delay: 0,
  },

  // Ulquiorra - 4th Espada
  'ulquiorra': {
    src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
    volume: 0.65,
    delay: 0,
  },

  // Circe / Grenadier — Potion / Grenade Throw
  'circe': {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: 0,
  },
  'grenadier': {
    src: 'Assets/Sound Effects/Attacks/explosion.mp3',
    volume: 0.6,
    delay: 0,
  },

  // Musashi — Dual Katana Slash
  'musashi': {
    src: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: 0.7,
    delay: 0,
  },

  // Hydra — Toxic Spit
  'hydra': {
    src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    volume: 0.6,
    delay: 0,
  }
};

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
  if (id !== undefined && id !== null && BASIC_ATTACK_SOUNDS[id] !== undefined) {
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

/**
 * Get basic attack sound paths for a specific fighter for high-priority match preloading.
 * @param {number|string} id
 * @param {string} [type]
 * @returns {string[]}
 */
export function getFighterBasicAttackSoundPaths(id, type) {
  const cfg = getBasicAttackSound(id, type);
  if (!cfg || !cfg.src) return [];
  if (Array.isArray(cfg.src)) return cfg.src.slice();
  return [cfg.src];
}

